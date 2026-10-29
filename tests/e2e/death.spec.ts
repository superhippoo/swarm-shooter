import { expect, test } from '@playwright/test';
import { capturePage } from './artifacts';
import { snapshot, waitForScreen } from './game-driver';

test('적의 실제 접촉 피해로 사망하면 현재 단계의 체크포인트에서 재시작한다', async ({ page }) => {
  test.setTimeout(240_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await page.locator('#select-scout').click();
  await waitForScreen(page, 'stageIntro');
  const checkpoint = await snapshot(page);
  await waitForScreen(page, 'playing');
  const initial = await snapshot(page);
  expect(initial.campaign?.stageIndex).toBe(0);

  await expect.poll(async () => (await snapshot(page)).screen, { timeout: 220_000 }).toBe('dead');
  const dead = await snapshot(page);
  expect(dead.player.health).toBe(0);
  expect(dead.runId).toBe(initial.runId);
  expect(dead.campaign?.stageId).toBe(initial.campaign?.stageId);
  expect(dead.campaign?.stageIndex).toBe(initial.campaign?.stageIndex);
  expect(dead.input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
  await capturePage(page, 'current-stage-death.png');

  await page.locator('#restart-button').click();
  await waitForScreen(page, 'stageIntro');
  const restarted = await snapshot(page);
  expect(restarted.runId).toBeGreaterThan(initial.runId);
  expect(restarted.characterId).toBe('scout');
  expect(restarted.player.health).toBe(restarted.player.maxHealth);
  expect(restarted.weapons).toEqual(checkpoint.weapons);
  expect(restarted.input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
  expect(restarted.campaign).toMatchObject({
    phase: 'intro',
    stageId: checkpoint.campaign?.stageId,
    stageIndex: checkpoint.campaign?.stageIndex,
    stageKills: 0,
    campaignKills: checkpoint.campaign?.campaignKills,
    stageElapsedMs: 0,
    campaignElapsedMs: checkpoint.campaign?.campaignElapsedMs,
    unlockedWeapons: checkpoint.campaign?.unlockedWeapons,
  });
  await waitForScreen(page, 'playing');
  expect(pageErrors).toEqual([]);
});
