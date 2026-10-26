import { expect, test } from '@playwright/test';
import { GameDriver, snapshot, waitForScreen } from './game-driver';

test('fireAtCanvas 헬퍼가 반자동 무기를 실제 발사하게 한다', async ({ page }) => {
  await page.goto('/');
  await page.locator('#select-scout').click();
  await waitForScreen(page, 'playing');
  const driver = new GameDriver(page);
  await driver.selectWeapon('shotgun');
  expect(await driver.fireAtCanvas(640, 360)).toBe(true);
  expect((await snapshot(page)).weapons.find((weapon) => weapon.id === 'shotgun')!.magazine).toBe(5);
  await driver.stop();
});
