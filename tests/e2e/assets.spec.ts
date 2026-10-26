import { expect, test } from '@playwright/test';

const assetPaths = [
  '/assets/characters/scout.svg',
  '/assets/characters/heavy.svg',
  '/assets/enemies/swarmer.svg',
  '/assets/enemies/skitter.svg',
  '/assets/enemies/brute.svg',
  '/assets/ui/crosshair.svg',
];

test('독창적 SVG 에셋 6종을 HTTP로 제공한다', async ({ request }) => {
  for (const path of assetPaths) {
    const response = await request.get(path);
    expect(response.ok(), path).toBeTruthy();
    expect(response.headers()['content-type'], path).toContain('image/svg+xml');
    const body = await response.text();
    expect(body, path).toContain('<svg');
    expect(body, path).not.toContain('<script');
  }
});
