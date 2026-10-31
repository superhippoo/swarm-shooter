import { expect, type CDPSession, type Page } from '@playwright/test';
import type { GameSnapshot, WeaponId } from '../../src/shared/game-types';
import { unlockedWeaponOrder } from './campaign-driver-utils';
import { nearestEnemy, snapshot, type CombatDriver } from './game-driver';

type TouchPoint = { x: number; y: number; id: number };
type TouchEventType = 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel';

export class TouchGameDriver implements CombatDriver {
  readonly usesTouch = true;
  private session: CDPSession | null = null;
  private readonly points = new Map<number, TouchPoint>();
  private movePoint: TouchPoint | null = null;
  private firePoint: TouchPoint | null = null;
  private moveCenter = { x: 0, y: 0 };
  private moveRadius = 1;
  private desiredMove = { x: 0, y: 0 };
  private desiredFiring = false;

  constructor(private readonly page: Page) {}

  async setMoveInput(x: number, y: number): Promise<void> {
    const length = Math.hypot(x, y);
    this.desiredMove = length > 1 ? { x: x / length, y: y / length } : { x, y };
    await this.reconcile();
  }

  async setFireInput(firing: boolean): Promise<void> {
    this.desiredFiring = firing;
    await this.reconcile();
  }

  async cancel(): Promise<void> {
    this.desiredMove = { x: 0, y: 0 };
    this.desiredFiring = false;
    if (this.points.size > 0) {
      await this.dispatch('touchCancel');
      this.clearPoints();
    }
  }

  async stop(): Promise<void> {
    this.desiredMove = { x: 0, y: 0 };
    this.desiredFiring = false;
    await this.endAll();
  }

  async stopFiring(): Promise<void> {
    await this.setFireInput(false);
  }

  async selectWeapon(id: WeaponId): Promise<void> {
    let state = await snapshot(this.page);
    if (state.screen !== 'playing' || state.selectedWeapon === id) return;
    if (this.desiredFiring) await this.setFireInput(false);
    const order = unlockedWeaponOrder(state);
    if (!order.includes(id)) throw new Error(`아직 해금되지 않은 무기를 선택할 수 없습니다: ${id}`);

    for (let step = 0; step < order.length * 3; step += 1) {
      state = await snapshot(this.page);
      if (state.screen !== 'playing' || state.selectedWeapon === id) return;
      const currentIndex = Math.max(0, order.indexOf(state.selectedWeapon ?? 'rifle'));
      const targetIndex = order.indexOf(id);
      const forwardSteps = (targetIndex - currentIndex + order.length) % order.length;
      const backwardSteps = (currentIndex - targetIndex + order.length) % order.length;
      const selector = forwardSteps <= backwardSteps ? '#weapon-next' : '#weapon-prev';
      const expected = order[(currentIndex + (forwardSteps <= backwardSteps ? 1 : -1) + order.length) % order.length];
      await this.tapControl(selector);
      try {
        await expect.poll(async () => (await snapshot(this.page)).selectedWeapon, { timeout: 1500 }).toBe(expected);
      } catch {
      }
    }
    throw new Error(`이전/다음 무기 버튼으로 ${id}를 선택하지 못했습니다.`);
  }

  async reload(): Promise<void> {
    if ((await snapshot(this.page)).screen === 'playing') await this.tapControl('#reload-button');
  }

  async moveToward(x: number, y: number, deadZone = 36, observed?: GameSnapshot): Promise<void> {
    const state = observed ?? await snapshot(this.page);
    const dx = x - state.player.x;
    const dy = y - state.player.y;
    const horizontal = dx > deadZone ? 1 : dx < -deadZone ? -1 : 0;
    const vertical = dy > deadZone ? 1 : dy < -deadZone ? -1 : 0;
    await this.setMoveInput(horizontal, vertical);
  }

  async aimAndFire(_targetId?: number, observed?: GameSnapshot): Promise<boolean> {
    const state = observed ?? await snapshot(this.page);
    const target = state.enemies.find((enemy) => enemy.id === state.input.autoAimTargetId) ?? nearestEnemy(state);
    if (state.screen !== 'playing' || !target) {
      await this.setFireInput(false);
      return false;
    }
    if (state.selectedWeapon === 'rifle' || state.selectedWeapon === 'flame') {
      await this.setFireInput(true);
    } else {
      if (this.desiredFiring) await this.setFireInput(false);
      await this.tapControl('#fire-button');
    }
    return true;
  }

  async tapWhileHolding(selector: string): Promise<void> {
    const box = await this.page.locator(selector).boundingBox();
    if (!box) {
      if (await this.releaseIfInactive()) return;
      throw new Error(`터치 버튼 좌표를 읽을 수 없습니다: ${selector}`);
    }
    const point = {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      id: Math.max(0, ...this.points.keys()) + 1,
    };
    this.points.set(point.id, point);
    await this.dispatch('touchStart');
    await this.page.waitForTimeout(80);
    await this.session!.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [point] });
    this.points.delete(point.id);
  }

  private async tapControl(selector: string): Promise<void> {
    if (this.points.size > 0) await this.tapWhileHolding(selector);
    else await this.page.locator(selector).tap();
  }

  private async reconcile(): Promise<void> {
    const removingMove = this.movePoint !== null && Math.hypot(this.desiredMove.x, this.desiredMove.y) === 0;
    const removingFire = this.firePoint !== null && !this.desiredFiring;
    if (removingMove || removingFire) await this.endAll();
    if (this.movePoint) await this.updateMovePoint();
    if (!this.movePoint && Math.hypot(this.desiredMove.x, this.desiredMove.y) > 0) {
      await this.startMove();
    }
    if (!this.firePoint && this.desiredFiring) await this.startFire();
  }

  private async releaseIfInactive(): Promise<boolean> {
    const state = await snapshot(this.page);
    if (state.screen === 'playing') return false;
    this.desiredMove = { x: 0, y: 0 };
    this.desiredFiring = false;
    await this.endAll();
    return true;
  }

  private async startMove(): Promise<void> {
    const pad = await this.page.locator('#move-pad').boundingBox();
    const knob = await this.page.locator('#move-knob').boundingBox();
    if (!pad || !knob) {
      if (await this.releaseIfInactive()) return;
      throw new Error('이동 스틱 좌표를 읽을 수 없습니다.');
    }
    this.moveCenter = { x: pad.x + pad.width / 2, y: pad.y + pad.height / 2 };
    this.moveRadius = Math.max(1, (pad.width - knob.width) / 2);
    const point = {
      x: this.moveCenter.x + this.desiredMove.x * this.moveRadius,
      y: this.moveCenter.y + this.desiredMove.y * this.moveRadius,
      id: 1,
    };
    this.movePoint = point;
    this.points.set(point.id, point);
    await this.dispatch('touchStart');
  }

  private async updateMovePoint(): Promise<void> {
    if (!this.movePoint) return;
    const next = {
      ...this.movePoint,
      x: this.moveCenter.x + this.desiredMove.x * this.moveRadius,
      y: this.moveCenter.y + this.desiredMove.y * this.moveRadius,
    };
    if (Math.hypot(next.x - this.movePoint.x, next.y - this.movePoint.y) < 0.25) return;
    this.movePoint = next;
    this.points.set(next.id, next);
    await this.dispatch('touchMove');
  }

  private async startFire(): Promise<void> {
    const button = await this.page.locator('#fire-button').boundingBox();
    if (!button) {
      if (await this.releaseIfInactive()) return;
      throw new Error('사격 버튼 좌표를 읽을 수 없습니다.');
    }
    const point = { x: button.x + button.width / 2, y: button.y + button.height / 2, id: 2 };
    this.firePoint = point;
    this.points.set(point.id, point);
    await this.dispatch('touchStart');
  }

  private async endAll(): Promise<void> {
    if (this.points.size === 0) return;
    await this.dispatch('touchEnd');
    this.clearPoints();
  }

  private clearPoints(): void {
    this.points.clear();
    this.movePoint = null;
    this.firePoint = null;
  }

  private async dispatch(type: TouchEventType): Promise<void> {
    this.session ??= await this.page.context().newCDPSession(this.page);
    await this.session.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [...this.points.values()],
    });
  }
}
