import { test } from '@playwright/test';
import { completeCampaign } from './mission-runner';
import { TouchGameDriver } from './touch-driver';

test.describe('모바일 실제 터치 캠페인', () => {
  test.use({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });

  test('heavy 캐릭터가 터치만으로 10단계 캠페인을 완료한다', async ({ page }) => {
    test.setTimeout(1_900_000);
    await completeCampaign(page, 'heavy', (currentPage) => new TouchGameDriver(currentPage));
  });
});
