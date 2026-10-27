import { expect, type CDPSession, type Page } from '@playwright/test';
import type { WeaponId } from '../../src/shared/game-types';
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

  async selectWeapon(id: WeaponId): Promise<void> {
    const state = await snapshot(this.page);
    if (state.screen !== 'playing' || state.selectedWeapon === id) return;
    await this.setFireInput(false);
    await this.page.locator(`#weapon-${id}`).tap();
    await expect.poll(async () => {
      const current = await snapshot(this.page);
      if (current.screen === 'dead') throw new Error('터치 무기 교체 중 플레이어가 사망했습니다.');
      return current.selectedWeapon;
    }, { timeout: 3000 }).toBe(id);
  }

  async moveToward(x: number, y: number, deadZone = 36): Promise<void> {
    const state = await snapshot(this.page);
    const dx = x - state.player.x;
    const dy = y - state.player.y;
    const horizontal = dx > deadZone ? 1 : dx < -deadZone ? -1 : 0;
    const vertical = dy > deadZone ? 1 : dy < -deadZone ? -1 : 0;
    await this.setMoveInput(horizontal, vertical);
  }

  async aimAndFire(): Promise<boolean> {
    const state = await snapshot(this.page);
    if (state.screen !== 'playing' || !nearestEnemy(state)) {
      await this.setFireInput(false);
      return false;
    }
    if (state.selectedWeapon === 'rifle') {
      await this.setFireInput(true);
    } else {
      if (this.desiredFiring) await this.setFireInput(false);
      await this.page.locator('#fire-button').tap();
    }
    return true;
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

  private async startMove(): Promise<void> {
    const pad = await this.page.locator('#move-pad').boundingBox();
    const knob = await this.page.locator('#move-knob').boundingBox();
    if (!pad || !knob) throw new Error('이동 스틱 좌표를 읽을 수 없습니다.');
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
    if (!button) throw new Error('사격 버튼 좌표를 읽을 수 없습니다.');
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
