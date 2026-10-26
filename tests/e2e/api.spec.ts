import { expect, test } from '@playwright/test';

test('상태 서비스의 health를 제공하고 상태 쓰기는 거부한다', async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).ok).toBe(true);

  const write = await request.post('/api/status', { data: {} });
  expect(write.status()).toBe(405);
  expect(write.headers()['allow']).toBe('GET');
});
