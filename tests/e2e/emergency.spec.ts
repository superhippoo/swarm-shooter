import { writeJsonArtifact } from './artifacts';
import { expect, test } from '@playwright/test';
import type { WeaponId } from '../../src/shared/game-types';
import { GameDriver, snapshot, waitForScreen } from './game-driver';

type Point = { x: number; y: number };
const route: Point[] = [
  { x: 300, y: 1300 },
  { x: 650, y: 1300 },
  { x: 650, y: 1000 },
  { x: 300, y: 1000 },
];

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

test('세 무기를 실제 소진하면 비상 소총 탄약이 자동 지급된다', async ({ page }) => {
  test.setTimeout(440_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await page.locator('#select-scout').click();
  await waitForScreen(page, 'playing');
  const initial = await snapshot(page);
  const driver = new GameDriver(page);
  const startedAt = Date.now();
  let routeIndex = 0;
  let routeOrigin: Point = { x: initial.player.x, y: initial.player.y };
  let emptiedAt = 0;

  try {
    while (Date.now() - startedAt < 420_000 && emptiedAt === 0) {
      const state = await snapshot(page);
      if (state.runId !== initial.runId) throw new Error('비상 탄약 검증 중 예상하지 못한 재시작');
      if (state.screen === 'dead') throw new Error('비상 탄약 검증 중 사망');
      const totalAmmo = state.weapons.reduce((sum, weapon) => sum + weapon.magazine + weapon.reserve, 0);
      if (totalAmmo === 0) {
        emptiedAt = Date.now();
        await driver.stop();
        break;
      }
      const selected = state.weapons.find((weapon) => weapon.id === state.selectedWeapon)!;
      let desired: WeaponId = state.selectedWeapon ?? 'rifle';
      if (selected.magazine + selected.reserve === 0) {
        desired = (['shotgun', 'launcher', 'rifle'] as WeaponId[]).find((id) => {
          const weapon = state.weapons.find((candidate) => candidate.id === id)!;
          return weapon.magazine + weapon.reserve > 0;
        }) ?? 'rifle';
      }
      await driver.selectWeapon(desired);
      if (!await driver.aimAndFire()) await driver.fireAtCanvas(640, 360);

      const target = route[routeIndex % route.length];
      const directionX = target.x - routeOrigin.x;
      const directionY = target.y - routeOrigin.y;
      const passed = distance(state.player, target) < 100 ||
        (state.player.x - target.x) * directionX + (state.player.y - target.y) * directionY > 0;
      if (passed) {
        routeOrigin = target;
        routeIndex += 1;
      }
      const nextTarget = route[routeIndex % route.length];
      await driver.moveToward(nextTarget.x, nextTarget.y, 30);
      await page.waitForTimeout(70);
    }

    expect(emptiedAt).toBeGreaterThan(0);
    await expect.poll(async () => (await snapshot(page)).weapons.find((weapon) => weapon.id === 'rifle')!.reserve, { timeout: 6000 })
      .toBeGreaterThanOrEqual(24);
    const recovered = await snapshot(page);
    const result = {
      durationMs: emptiedAt - startedAt,
      recoveredMs: Date.now() - emptiedAt,
      selectedWeapon: recovered.selectedWeapon,
      rifle: recovered.weapons.find((weapon) => weapon.id === 'rifle'),
      pageErrors,
    };
    await writeJsonArtifact('emergency-ammo.json', result);
    console.log(`EMERGENCY_RESULT ${JSON.stringify(result)}`);
    expect(recovered.selectedWeapon).toBe('rifle');
    expect(pageErrors).toEqual([]);
  } finally {
    await driver.stop();
  }
});
