import { expect, test } from '@playwright/test';
import { capturePage } from './artifacts';
import { GameDriver, snapshot, waitForEnemy, waitForScreen } from './game-driver';

test('세 기본 무기가 실제 입력에서 자동·산탄·반자동 폭발 무기로 다르게 동작한다', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await page.locator('#select-heavy').click();
  await waitForScreen(page, 'playing');
  const initial = await snapshot(page);
  expect(initial.weapons.map((weapon) => weapon.id)).toEqual(['rifle', 'shotgun', 'launcher']);

  const driver = new GameDriver(page);
  await waitForEnemy(page);
  expect(await driver.aimAndHold()).toBe(true);
  await page.waitForTimeout(450);
  await driver.stop();
  expect((await snapshot(page)).weapons.find((weapon) => weapon.id === 'rifle')!.magazine).toBeLessThan(30);
  await page.waitForTimeout(900);

  await driver.selectWeapon('shotgun');
  const beforeShotgun = await snapshot(page);
  await waitForEnemy(page);
  expect(await driver.aimAndHold()).toBe(true);
  const shotgun = await snapshot(page);
  expect(shotgun.weapons.find((weapon) => weapon.id === 'shotgun')!.magazine).toBe(5);
  const shotgunWorked = shotgun.performance.activeProjectiles >= 2 ||
    shotgun.performance.activeParticles > 0 ||
    shotgun.enemies.length < beforeShotgun.enemies.length ||
    shotgun.enemies.some((enemy) => enemy.health < (beforeShotgun.enemies.find((before) => before.id === enemy.id)?.health ?? 0));
  expect(shotgunWorked).toBe(true);
  await page.waitForTimeout(1100);
  await driver.stop();
  expect((await snapshot(page)).weapons.find((weapon) => weapon.id === 'shotgun')!.magazine).toBe(5);

  await driver.selectWeapon('launcher');
  const beforeLauncher = await snapshot(page);
  await waitForEnemy(page);
  expect(await driver.aimAndHold()).toBe(true);
  const launcher = await snapshot(page);
  expect(launcher.weapons.find((weapon) => weapon.id === 'launcher')!.magazine).toBe(2);
  const launcherWorked = launcher.performance.activeProjectiles > 0 ||
    launcher.performance.activeParticles > 0 ||
    launcher.enemies.length < beforeLauncher.enemies.length ||
    launcher.enemies.some((enemy) => enemy.health < (beforeLauncher.enemies.find((before) => before.id === enemy.id)?.health ?? 0));
  expect(launcherWorked).toBe(true);
  await page.waitForTimeout(400);
  await capturePage(page, 'mvp-weapons.png');
  await page.waitForTimeout(900);
  await driver.stop();
  expect((await snapshot(page)).weapons.find((weapon) => weapon.id === 'launcher')!.magazine).toBe(2);

  await driver.selectWeapon('rifle');
  await page.keyboard.press('Escape');
  await waitForScreen(page, 'paused');
  await page.locator('#shake-toggle').uncheck();
  await expect(page.locator('#shake-toggle')).not.toBeChecked();
  await page.keyboard.press('Escape');
  await waitForScreen(page, 'playing');
  expect(pageErrors).toEqual([]);
});
