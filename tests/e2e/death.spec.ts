import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { snapshot, waitForScreen } from './game-driver';

test('적의 실제 접촉 피해로 사망하고 같은 캐릭터로 재시작한다', async ({ page }) => {
  test.setTimeout(180_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await mkdir('artifacts', { recursive: true });
  await page.goto('/');
  await page.locator('#select-scout').click();
  await waitForScreen(page, 'playing');
  const initial = await snapshot(page);
  await expect.poll(async () => (await snapshot(page)).screen, { timeout: 150_000 }).toBe('dead');
  const dead = await snapshot(page);
  expect(dead.player.health).toBe(0);
  await page.screenshot({ path: 'artifacts/mvp-death.png', fullPage: true });
  await page.locator('#restart-button').click();
  await waitForScreen(page, 'playing');
  const restarted = await snapshot(page);
  expect(restarted.runId).toBeGreaterThan(initial.runId);
  expect(restarted.characterId).toBe('scout');
  expect(restarted.player.health).toBe(restarted.player.maxHealth);
  expect(pageErrors).toEqual([]);
});
