import { expect, test } from '@playwright/test';

test('대시보드가 실제 프로젝트 상태를 읽어 표시한다', async ({ page, request }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const response = await request.get('/api/status');
  expect(response.ok()).toBeTruthy();
  const status = await response.json();
  expect(status.project.name).toBe('SWARM//ZERO');
  expect(status.tasks.length).toBeGreaterThan(0);

  await page.goto('/dashboard.html');
  await expect(page).toHaveTitle(/SWARM\/\/ZERO/);
  await expect(page.locator('body')).toContainText(status.currentTask);
  expect(pageErrors).toEqual([]);
});
