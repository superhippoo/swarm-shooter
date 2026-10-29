import { expect, test } from '@playwright/test';
import { snapshot } from './game-driver';

test('게임이 초기 메뉴와 읽기 전용 진단 상태를 제공한다', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  const state = await snapshot(page);
  expect(state.screen).toBe('menu');
  expect(state.characterId).toBeNull();
  expect(state.mission.phase).toBeNull();
  expect(state.campaign).toBeNull();
  expect(pageErrors).toEqual([]);
});
