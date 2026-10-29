import { expect, test } from '@playwright/test';
import { capturePage } from './artifacts';
import { GameDriver, snapshot, waitForEnemy, waitForScreen } from './game-driver';

test('이동·사격·재장전·일시정지·현재 단계 재시작이 실제 입력으로 동작한다', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await page.locator('#select-scout').click();
  await waitForScreen(page, 'playing');

  const initial = await snapshot(page);
  expect(initial.characterId).toBe('scout');
  expect(initial.player.health).toBe(initial.player.maxHealth);
  expect(initial.weapons[0]).toMatchObject({ id: 'rifle', magazine: 30 });

  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  expect((await snapshot(page)).player.x).toBeGreaterThan(initial.player.x + 20);

  const driver = new GameDriver(page);
  await waitForEnemy(page);
  await driver.aimAndFire();
  await expect.poll(async () => (await snapshot(page)).performance.activeProjectiles).toBeGreaterThan(0);
  await page.waitForTimeout(450);
  const fired = await snapshot(page);
  expect(fired.weapons[0].magazine).toBeLessThan(30);
  await capturePage(page, 'vertical-slice-combat.png');
  await driver.stop();

  await page.keyboard.press('r');
  await expect.poll(async () => (await snapshot(page)).weapons[0].reloading).toBe(true);
  await expect.poll(async () => (await snapshot(page)).weapons[0].reloading, { timeout: 5000 }).toBe(false);
  const reloaded = await snapshot(page);
  expect(reloaded.weapons[0].magazine).toBe(30);
  expect(reloaded.weapons[0].reserve).toBeLessThan(initial.weapons[0].reserve);

  await page.keyboard.press('Escape');
  await waitForScreen(page, 'paused');
  const paused = await snapshot(page);
  await page.waitForTimeout(350);
  const stillPaused = await snapshot(page);
  expect(stillPaused.tick).toBe(paused.tick);
  expect(stillPaused.campaign?.stageElapsedMs).toBe(paused.campaign?.stageElapsedMs);
  expect(stillPaused.campaign?.campaignElapsedMs).toBe(paused.campaign?.campaignElapsedMs);

  await page.keyboard.press('Escape');
  await waitForScreen(page, 'playing');
  await page.keyboard.press('Escape');
  await waitForScreen(page, 'paused');
  await page.locator('#pause-restart-button').click();
  await waitForScreen(page, 'stageIntro');
  const restarted = await snapshot(page);
  expect(restarted.runId).toBeGreaterThan(initial.runId);
  expect(restarted.player.health).toBe(restarted.player.maxHealth);
  expect(restarted.weapons[0].magazine).toBe(30);
  expect(restarted.campaign).toMatchObject({
    stageIndex: initial.campaign?.stageIndex,
    stageId: initial.campaign?.stageId,
    stageKills: 0,
    campaignKills: initial.campaign?.campaignKills,
    unlockedWeapons: initial.campaign?.unlockedWeapons,
  });
  await waitForScreen(page, 'playing');
  expect(pageErrors).toEqual([]);
});
