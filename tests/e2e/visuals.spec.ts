import { expect, test } from '@playwright/test';
import { capturePage } from './artifacts';
import { GameDriver, snapshot, waitForEnemy, waitForScreen } from './game-driver';

test('캐릭터 보행과 세 기본 무기의 시각 상태가 실제 입력과 함께 바뀐다', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.operative-portrait')).toHaveCount(2);
  for (const portrait of await page.locator('.operative-portrait').all()) {
    await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
  await capturePage(page, 'art-menu.png');
  await page.locator('#select-scout').click();
  await waitForScreen(page, 'playing');
  const driver = new GameDriver(page);

  try {
    await page.keyboard.down('d');
    await expect.poll(async () => (await snapshot(page)).visual.pose).not.toBe('idle');
    await page.keyboard.up('d');
    await expect.poll(async () => (await snapshot(page)).visual.pose).toBe('idle');
    await waitForEnemy(page);

    for (const [key, weapon] of [['1', 'rifle'], ['2', 'shotgun'], ['3', 'launcher']] as const) {
      await page.keyboard.press(key);
      await expect.poll(async () => (await snapshot(page)).selectedWeapon).toBe(weapon);
      const before = await snapshot(page);
      expect(before.visual.weapon).toBe(weapon);
      expect(Math.hypot(
        before.visual.muzzle.x - before.player.x,
        before.visual.muzzle.y - before.player.y,
      )).toBeGreaterThan(20);
      await driver.aimAndFire();
      await expect.poll(async () => (await snapshot(page)).visual.shots).toBeGreaterThan(before.visual.shots);
      await driver.stop();
      await capturePage(page, `art-scout-${weapon}.png`);
    }
  } finally {
    await driver.stop();
  }
  expect(pageErrors).toEqual([]);
});
