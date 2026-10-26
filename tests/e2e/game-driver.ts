import { expect, type Page } from '@playwright/test';
import type { EnemySnapshot, GameScreen, GameSnapshot } from '../../src/shared/game-types';

export async function snapshot(page: Page): Promise<GameSnapshot> {
  await page.waitForFunction(() => typeof window.swarmDiagnostics === 'function');
  return page.evaluate(() => window.swarmDiagnostics!() as GameSnapshot);
}

export async function waitForScreen(page: Page, screen: GameScreen): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).screen).toBe(screen);
}

async function canvasPoint(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('게임 캔버스의 화면 좌표를 읽을 수 없습니다.');
  const size = await canvas.evaluate((element: HTMLCanvasElement) => ({
    width: element.width,
    height: element.height,
  }));
  return {
    x: box.x + (x / size.width) * box.width,
    y: box.y + (y / size.height) * box.height,
  };
}

function nearestEnemy(state: GameSnapshot): EnemySnapshot | null {
  let nearest: EnemySnapshot | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) continue;
    const distance = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
    if (distance < nearestDistance) {
      nearest = enemy;
      nearestDistance = distance;
    }
  }
  return nearest;
}

export class GameDriver {
  private readonly heldKeys = new Set<string>();
  private firing = false;

  constructor(private readonly page: Page) {}

  async stop(): Promise<void> {
    for (const key of this.heldKeys) await this.page.keyboard.up(key);
    this.heldKeys.clear();
    if (this.firing) await this.page.mouse.up();
    this.firing = false;
  }

  async moveToward(x: number, y: number, deadZone = 36): Promise<void> {
    const state = await snapshot(this.page);
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
  }

  async aimAndFire(): Promise<boolean> {
    const state = await snapshot(this.page);
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
}
