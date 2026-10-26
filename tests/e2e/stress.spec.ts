import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { GameSnapshot, WeaponId } from '../../src/shared/game-types';
import { GameDriver, snapshot, waitForScreen } from './game-driver';

type Point = { x: number; y: number };

const route: Point[] = [
  { x: 650, y: 1320 },
  { x: 1150, y: 1320 },
  { x: 1150, y: 1000 },
  { x: 1300, y: 900 },
  { x: 1680, y: 900 },
  { x: 1900, y: 800 },
];

const orbit: Point[] = [
  { x: 1810, y: 900 },
  { x: 2070, y: 800 },
  { x: 1900, y: 970 },
  { x: 1730, y: 800 },
  { x: 1900, y: 630 },
  { x: 1990, y: 690 },
];

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function available(state: GameSnapshot, id: WeaponId): boolean {
  const weapon = state.weapons.find((entry) => entry.id === id);
  return Boolean(weapon && weapon.magazine + weapon.reserve > 0);
}

test('자연 웨이브 50기 이상에서 실제 사격 성능과 객체 상한을 측정한다', async ({ page, browser }) => {
  test.setTimeout(150_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await mkdir('artifacts', { recursive: true });
  await page.goto('/');
  await page.locator('#select-heavy').click();
  await waitForScreen(page, 'playing');
  const driver = new GameDriver(page);
  let routeIndex = 0;
  let routeOrigin: Point = { x: 240, y: 1300 };
  let maxEnemies = 0;
  let maxProjectiles = 0;
  let maxParticles = 0;
  let orbitIndex = 0;
  const fpsSamples: number[] = [];
  let measuringAt = 0;
  const startedAt = Date.now();

  try {
    while (Date.now() - startedAt < 140_000) {
      const state = await snapshot(page);
      if (state.screen === 'dead') throw new Error('스트레스 측정 중 사망');
      if (state.screen !== 'playing') break;
      maxEnemies = Math.max(maxEnemies, state.performance.activeEnemies);
      maxProjectiles = Math.max(maxProjectiles, state.performance.activeProjectiles);
      maxParticles = Math.max(maxParticles, state.performance.activeParticles);

      if (state.mission.phase === 'infiltrate') {
        const target = route[Math.min(routeIndex, route.length - 1)];
        const directionX = target.x - routeOrigin.x;
        const directionY = target.y - routeOrigin.y;
        const passed = distance(state.player, target) < 110 ||
          (state.player.x - target.x) * directionX + (state.player.y - target.y) * directionY > 0;
        if (passed && routeIndex < route.length - 1) {
          routeOrigin = target;
          routeIndex += 1;
        }
        const nearestDistance = Math.min(...state.enemies.map((enemy) => distance(enemy, state.player)), 9999);
        const nearby = state.enemies.filter((enemy) => distance(enemy, state.player) < 220).length;
        let weapon: WeaponId = 'rifle';
        if (nearby >= 5 && nearestDistance < 190 && available(state, 'launcher')) weapon = 'launcher';
        else if (nearestDistance < 170 && available(state, 'shotgun')) weapon = 'shotgun';
        if (!available(state, weapon)) {
          weapon = (['shotgun', 'launcher', 'rifle'] as const).find((id) => available(state, id)) ?? 'rifle';
        }
        await driver.selectWeapon(weapon);
        await driver.aimAndFire();
        const nextTarget = route[Math.min(routeIndex, route.length - 1)];
        await driver.moveToward(nextTarget.x, nextTarget.y, 35);
      } else {
        if (measuringAt === 0 && state.performance.activeEnemies >= 55) {
          measuringAt = Date.now();
          await page.screenshot({ path: 'artifacts/stress-horde.png', fullPage: true });
        }
        if (measuringAt > 0) {
          if (state.performance.fps > 0) fpsSamples.push(state.performance.fps);
          await driver.selectWeapon('rifle');
          await driver.aimAndFire();
        } else {
          await driver.stop();
        }
        const target = orbit[orbitIndex % orbit.length];
        if (distance(state.player, target) < 70) orbitIndex += 1;
        const nextTarget = orbit[orbitIndex % orbit.length];
        await driver.moveToward(nextTarget.x, nextTarget.y, 45);
      }

      if (measuringAt > 0 && Date.now() - measuringAt >= 8000) break;
      await page.waitForTimeout(200);
    }

    await driver.stop();
    const renderer = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { type: 'missing' };
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!gl) return { type: 'canvas2d' };
      const extension = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        type: canvas.getContext('webgl2') ? 'webgl2' : 'webgl',
        vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : 'masked',
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'masked',
      };
    });
    const sorted = [...fpsSamples].sort((a, b) => a - b);
    const result = {
      environment: {
        browser: browser.version(),
        headless: true,
        platform: process.platform,
        node: process.version,
        ...renderer,
      },
      sampleCount: fpsSamples.length,
      averageFps: fpsSamples.length > 0 ? fpsSamples.reduce((sum, fps) => sum + fps, 0) / fpsSamples.length : null,
      medianFps: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null,
      minFps: sorted[0] ?? null,
      maxFps: sorted.at(-1) ?? null,
      maxEnemies,
      maxProjectiles,
      maxParticles,
      fpsSamples,
      pageErrors,
    };
    await writeFile('artifacts/stress-result.json', JSON.stringify(result, null, 2));
    console.log(`STRESS_RESULT ${JSON.stringify(result)}`);
    expect(maxEnemies).toBeGreaterThanOrEqual(50);
    expect(maxProjectiles).toBeGreaterThan(0);
    expect(maxEnemies).toBeLessThanOrEqual(72);
    expect(maxProjectiles).toBeLessThanOrEqual(192);
    expect(maxParticles).toBeLessThanOrEqual(384);
    expect(fpsSamples.length).toBeGreaterThanOrEqual(5);
    expect(pageErrors).toEqual([]);
  } finally {
    await driver.stop();
  }
});
