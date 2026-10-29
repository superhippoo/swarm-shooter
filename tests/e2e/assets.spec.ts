import { expect, test } from '@playwright/test';
import { capturePage } from './artifacts';
import { waitForScreen } from './game-driver';

const assetPaths = [
  '/assets/ui/crosshair.svg',
  ...['scout', 'heavy'].flatMap((id) => [
    `/assets/characters/${id}.svg`,
    `/assets/portraits/${id}.svg`,
    ...['idle', 'a', 'b'].map((pose) => `/assets/characters/${id}-legs-${pose}.svg`),
  ]),
  ...['swarmer', 'skitter', 'brute'].flatMap((id) => [
    `/assets/enemies/${id}.svg`,
    `/assets/enemies/${id}-step.svg`,
  ]),
  ...['rifle', 'shotgun', 'launcher'].map((id) => `/assets/weapons/${id}.svg`),
  ...['floor', 'bed', 'console', 'wall', 'vent', 'pipe', 'elevator', 'relay', 'decal']
    .map((id) => `/assets/environment/${id}.svg`),
];

test('기존 독창적 SVG 에셋 29종을 HTTP로 제공한다', async ({ request }) => {
  expect(assetPaths).toHaveLength(29);
  for (const path of assetPaths) {
    const response = await request.get(path);
    expect(response.ok(), path).toBeTruthy();
    expect(response.headers()['content-type'], path).toContain('image/svg+xml');
    const body = await response.text();
    expect(body, path).toContain('<svg');
    expect(body, path).not.toMatch(/<script|<image|(?:href|src)\s*=\s*["'](?:https?:)?\/\//i);
  }
});

test('에셋 로드 실패 시에도 생성 텍스처로 실제 캠페인을 시작한다', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/assets/**', (route) => route.abort());
  await page.goto('/');
  await page.locator('#select-heavy').click();
  await waitForScreen(page, 'playing');
  await expect(page.locator('canvas')).toBeVisible();
  expect((await page.evaluate(() => window.swarmDiagnostics?.().campaign?.stageIndex))).toBe(0);
  await capturePage(page, 'art-fallback.png');
  expect(pageErrors).toEqual([]);
});
