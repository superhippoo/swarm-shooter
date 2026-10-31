import { expect, type Page } from '@playwright/test';
import type { EnemySnapshot, GameScreen, GameSnapshot, WeaponId } from '../../src/shared/game-types';
import { WEAPON_ORDER } from './campaign-data';

export async function snapshot(page: Page): Promise<GameSnapshot> {
  const state = await page.evaluate(() => window.swarmDiagnostics?.() as GameSnapshot | undefined);
  if (state) return state;
  await page.waitForFunction(() => typeof window.swarmDiagnostics === 'function');
  return page.evaluate(() => window.swarmDiagnostics!() as GameSnapshot);
}

export async function waitForScreen(page: Page, screen: GameScreen, timeout = 20_000): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).screen, { timeout }).toBe(screen);
}

export async function waitForEnemy(page: Page): Promise<void> {
  await expect.poll(async () => nearestEnemy(await snapshot(page)) !== null).toBe(true);
}

type CanvasMetrics = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  viewportWidth: number;
  viewportHeight: number;
  canvasWidth: number;
  canvasHeight: number;
};
const canvasMetrics = new WeakMap<Page, CanvasMetrics>();

async function canvasPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  let metrics = canvasMetrics.get(page);
  if (!metrics || metrics.viewportWidth !== viewport.width || metrics.viewportHeight !== viewport.height) {
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('게임 캔버스의 화면 좌표를 읽을 수 없습니다.');
    const size = await canvas.evaluate((element: HTMLCanvasElement) => ({
      width: element.width,
      height: element.height,
    }));
    metrics = {
      x: box.x,
      y: box.y,
      scaleX: box.width / size.width,
      scaleY: box.height / size.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      canvasWidth: size.width,
      canvasHeight: size.height,
    };
    canvasMetrics.set(page, metrics);
  }
  return { x: metrics.x + x * metrics.scaleX, y: metrics.y + y * metrics.scaleY };
}

function targetEnemy(state: GameSnapshot, targetId?: number): EnemySnapshot | null {
  if (targetId !== undefined) {
    const selected = state.enemies.find((enemy) => enemy.id === targetId && enemy.health > 0);
    if (selected) return selected;
  }
  return nearestEnemy(state);
}

export function nearestEnemy(state: GameSnapshot): EnemySnapshot | null {
  let nearest: EnemySnapshot | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) continue;
    if (enemy.screenX < 0 || enemy.screenX > 1280 || enemy.screenY < 0 || enemy.screenY > 720) continue;
    const enemyDistance = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
    if (enemyDistance < nearestDistance) {
      nearest = enemy;
      nearestDistance = enemyDistance;
    }
  }
  return nearest;
}

export interface CombatDriver {
  readonly usesTouch: boolean;
  stop(): Promise<void>;
  stopFiring(): Promise<void>;
  selectWeapon(id: WeaponId): Promise<void>;
  reload(): Promise<void>;
  moveToward(x: number, y: number, deadZone?: number, observed?: GameSnapshot): Promise<void>;
  aimAndFire(targetId?: number, observed?: GameSnapshot): Promise<boolean>;
}

const weaponKeys = Object.fromEntries(WEAPON_ORDER.map((id, index) => [id, String(index + 1)])) as Record<WeaponId, string>;

export class GameDriver implements CombatDriver {
  readonly usesTouch = false;
  private readonly heldKeys = new Set<string>();
  private firing = false;
  private lastMovementLogAt = 0;

  constructor(private readonly page: Page) {}

  async stop(): Promise<void> {
    for (const key of this.heldKeys) await this.page.keyboard.up(key);
    this.heldKeys.clear();
    await this.stopFiring();
  }

  async stopFiring(): Promise<void> {
    if (this.firing) await this.page.mouse.up();
    this.firing = false;
  }

  async selectWeapon(id: WeaponId): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const state = await snapshot(this.page);
      if (state.screen !== 'playing' || state.selectedWeapon === id) return;
      if (this.firing) await this.page.mouse.up();
      this.firing = false;
      await this.page.keyboard.press(weaponKeys[id]);
      try {
        await expect.poll(async () => {
          const current = await snapshot(this.page);
          if (current.screen !== 'playing') return id;
          return current.selectedWeapon;
        }, { timeout: 3000 }).toBe(id);
        return;
      } catch {
      }
    }
    throw new Error(`실제 키보드 입력으로 ${id} 무기를 선택하지 못했습니다.`);
  }

  async reload(): Promise<void> {
    if ((await snapshot(this.page)).screen === 'playing') await this.page.keyboard.press('r');
  }

  async moveToward(x: number, y: number, deadZone = 36, observed?: GameSnapshot): Promise<void> {
    const state = observed ?? await snapshot(this.page);
    const desired = new Set<string>();
    const dx = x - state.player.x;
    const dy = y - state.player.y;
    if (dx > deadZone) desired.add('d');
    if (dx < -deadZone) desired.add('a');
    if (dy > deadZone) desired.add('s');
    if (dy < -deadZone) desired.add('w');

    for (const key of ['w', 'a', 's', 'd']) {
      if (desired.has(key) && !this.heldKeys.has(key)) {
        await this.page.keyboard.down(key);
        this.heldKeys.add(key);
      } else if (!desired.has(key) && this.heldKeys.has(key)) {
        await this.page.keyboard.up(key);
        this.heldKeys.delete(key);
      }
    }
    if (process.env.SWARM_DEBUG_DRIVER === '1' && Date.now() - this.lastMovementLogAt > 5000) {
      this.lastMovementLogAt = Date.now();
      console.log(`DRIVER_MOVE ${JSON.stringify({
        target: { x, y },
        player: state.player,
        campaign: state.campaign ? {
          stageIndex: state.campaign.stageIndex,
          objectiveIndex: state.campaign.objectiveIndex,
          objectiveKind: state.campaign.objectiveKind,
        } : null,
        desired: [...desired],
        held: [...this.heldKeys],
      })}`);
    }
  }

  async fireAtCanvas(x: number, y: number): Promise<boolean> {
    const state = await snapshot(this.page);
    if (state.screen !== 'playing') {
      if (this.firing) await this.page.mouse.up();
      this.firing = false;
      return false;
    }
    const point = await canvasPoint(this.page, x, y);
    await this.page.mouse.move(point.x, point.y);
    if (state.selectedWeapon === 'rifle' || state.selectedWeapon === 'flame') {
      if (!this.firing) {
        await this.page.mouse.down();
        this.firing = true;
      }
      return true;
    }
    if (this.firing) await this.page.mouse.up();
    this.firing = false;
    await this.page.mouse.click(point.x, point.y);
    return true;
  }

  async aimAndHold(): Promise<boolean> {
    const state = await snapshot(this.page);
    if (state.screen !== 'playing') {
      if (this.firing) await this.page.mouse.up();
      this.firing = false;
      return false;
    }
    const enemy = nearestEnemy(state);
    if (!enemy) {
      if (this.firing) await this.page.mouse.up();
      this.firing = false;
      return false;
    }
    const point = await canvasPoint(this.page, enemy.screenX, enemy.screenY);
    await this.page.mouse.move(point.x, point.y);
    if (!this.firing) {
      await this.page.mouse.down();
      this.firing = true;
    }
    return true;
  }

  async aimAndFire(targetId?: number, observed?: GameSnapshot): Promise<boolean> {
    const state = observed ?? await snapshot(this.page);
    if (state.screen !== 'playing') {
      if (this.firing) await this.page.mouse.up();
      this.firing = false;
      return false;
    }
    const enemy = targetEnemy(state, targetId);
    if (!enemy) {
      if (this.firing) await this.page.mouse.up();
      this.firing = false;
      return false;
    }
    const point = await canvasPoint(this.page, enemy.screenX, enemy.screenY);
    await this.page.mouse.move(point.x, point.y);
    if (state.selectedWeapon === 'rifle' || state.selectedWeapon === 'flame') {
      if (!state.input.firing) this.firing = false;
      if (!this.firing) {
        await this.page.mouse.down();
        this.firing = true;
      }
      return true;
    }
    if (this.firing) await this.page.mouse.up();
    this.firing = false;
    await this.page.mouse.click(point.x, point.y);
    return true;
  }
}
