import { expect, test } from '@playwright/test';
import { GameDriver, snapshot, waitForScreen } from './game-driver';

test('이동 드라이버가 목표 좌표에서 오버슈트하지 않고 정지한다', async ({ page }) => {
  await page.goto('/');
  await page.locator('#select-scout').click();
  await waitForScreen(page, 'playing');
  const driver = new GameDriver(page);
  for (let index = 0; index < 30; index += 1) {
    await driver.moveToward(650, 1300, 20);
    if (index % 5 === 0) console.log('MOVE_CHECK', index, (await snapshot(page)).player);
    await page.waitForTimeout(100);
  }
  await driver.stop();
  const state = await snapshot(page);
  console.log('MOVE_FINAL', state.player);
  expect(state.player.x).toBeGreaterThan(600);
  expect(state.player.x).toBeLessThan(720);
});
