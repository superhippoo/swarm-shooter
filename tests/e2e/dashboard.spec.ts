import { expect, test } from '@playwright/test';

const requiredRequestIds = [
  'request-mobile-controls',
  'request-art-upgrade',
  'request-multitouch-actions',
  'request-mobile-fullscreen',
  'request-ten-stage-campaign',
];

test('대시보드가 기존 요청과 10단계 캠페인 요청을 포함한 실제 이력을 모두 표시한다', async ({ page, request }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const response = await request.get('/api/status');
  expect(response.ok()).toBeTruthy();
  const status = await response.json();
  expect(status.project.name).toBe('SWARM//ZERO');
  expect(status.tasks.length).toBeGreaterThan(0);
  expect(status.requests.map((entry: { id: string }) => entry.id)).toEqual(expect.arrayContaining(requiredRequestIds));
  expect(new Set(status.requests.map((entry: { id: string }) => entry.id)).size).toBe(status.requests.length);

  await page.goto('/dashboard.html');
  await expect(page).toHaveTitle(/SWARM\/\/ZERO/);
  await expect(page.locator('body')).toContainText(status.currentTask);
  for (const entry of status.requests) {
    const card = page.locator(`[data-request-id="${entry.id}"]`);
    await expect(card, entry.id).toHaveCount(1);
    await expect(card, entry.id).toBeVisible();
    await expect(card, entry.id).toContainText(entry.request);
    await expect(card, entry.id).toContainText(entry.result);
  }
  expect(pageErrors).toEqual([]);
});
