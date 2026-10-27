import { test } from '@playwright/test';
import { completeMission } from './mission-runner';
import { TouchGameDriver } from './touch-driver';

test.describe('모바일 실제 터치 임무', () => {
  test.use({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });

  test('heavy 캐릭터가 터치만으로 침투·방어·탈출을 완료한다', async ({ page }) => {
    test.setTimeout(240_000);
    await completeMission(page, 'heavy', (currentPage) => new TouchGameDriver(currentPage));
  });
});
