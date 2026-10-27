import { test } from '@playwright/test';
import { GameDriver } from './game-driver';
import { completeMission } from './mission-runner';

for (const character of ['heavy', 'scout'] as const) {
  test(`${character} 캐릭터가 실제 입력으로 침투·방어·탈출을 완료한다`, async ({ page }) => {
    test.setTimeout(240_000);
    await completeMission(page, character, (currentPage) => new GameDriver(currentPage));
  });
}
