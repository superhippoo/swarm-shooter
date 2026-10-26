import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import type { CharacterId, GameSnapshot, WeaponId } from '../../src/shared/game-types';
import { GameDriver, nearestEnemy, snapshot, waitForScreen } from './game-driver';

type Point = { x: number; y: number };

const infiltrationRoute: Point[] = [
  { x: 650, y: 1320 },
  { x: 1150, y: 1320 },
  { x: 1150, y: 1000 },
  { x: 1300, y: 900 },
  { x: 1680, y: 900 },
  { x: 1900, y: 800 },
];

const extractionRoute: Point[] = [
  { x: 1710, y: 650 },
  { x: 1750, y: 950 },
  { x: 1450, y: 950 },
  { x: 1050, y: 950 },
  { x: 1000, y: 500 },
  { x: 600, y: 500 },
  { x: 620, y: 390 },
  { x: 450, y: 450 },
  { x: 240, y: 240 },
];

const defenseOrbit: Point[] = [
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

function passedWaypoint(player: Point, origin: Point, target: Point): boolean {
  if (distance(player, target) < 110) return true;
  const directionX = target.x - origin.x;
  const directionY = target.y - origin.y;
  return (player.x - target.x) * directionX + (player.y - target.y) * directionY > 0;
}

function availableWeapon(state: GameSnapshot, id: WeaponId): boolean {
  const weapon = state.weapons.find((entry) => entry.id === id);
  return Boolean(weapon && weapon.magazine + weapon.reserve > 0);
}

async function completeMission(page: Page, character: CharacterId): Promise<void> {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await mkdir('artifacts', { recursive: true });
  await page.goto('/');
  await page.locator(`#select-${character}`).click();
  await waitForScreen(page, 'playing');
  const initial = await snapshot(page);
  const driver = new GameDriver(page);
  const startedAt = Date.now();
  let routeIndex = 0;
  let previousPhase = initial.mission.phase;
  let phaseStartedAt = startedAt;
  let phaseOrigin: Point = { x: initial.player.x, y: initial.player.y };
  let lastWeaponSwitchAt = 0;
  let maxEnemies = 0;
  let maxProjectiles = 0;
  let maxParticles = 0;
  let minFps = Number.POSITIVE_INFINITY;
  let lastObserved = initial;

  const nextRouteTarget = (state: GameSnapshot): Point => {
    const route = state.mission.phase === 'extract' ? extractionRoute : infiltrationRoute;
    while (routeIndex < route.length - 1) {
      const target = route[routeIndex];
      const origin = routeIndex === 0 ? phaseOrigin : route[routeIndex - 1];
      if (!passedWaypoint(state.player, origin, target)) break;
      phaseOrigin = target;
      routeIndex += 1;
    }
    return route[Math.min(routeIndex, route.length - 1)];
  };

  try {
    while (Date.now() - startedAt < 170_000) {
      const state = await snapshot(page);
      if (state.runId !== initial.runId) {
        throw new Error(`예상하지 못한 임무 초기화: ${initial.runId} → ${state.runId}, 이전=${lastObserved.screen}/${lastObserved.mission.phase}/HP ${lastObserved.player.health}/위치 ${lastObserved.player.x},${lastObserved.player.y}`);
      }
      lastObserved = state;
      if (state.screen === 'victory') {
        await driver.stop();
        await page.screenshot({ path: `artifacts/mission-${character}-victory.png`, fullPage: true });
        const result = {
          character,
          durationMs: Date.now() - startedAt,
          health: state.player.health,
          maxHealth: state.player.maxHealth,
          maxEnemies,
          maxProjectiles,
          maxParticles,
          minFps: Number.isFinite(minFps) ? minFps : null,
          pageErrors,
        };
        await writeFile(`artifacts/mission-${character}-result.json`, JSON.stringify(result, null, 2));
        console.log(`MISSION_RESULT ${JSON.stringify(result)}`);
        expect(state.mission.phase).toBe('complete');
        expect(pageErrors).toEqual([]);
        await page.locator('#restart-button').click();
        await waitForScreen(page, 'playing');
        expect((await snapshot(page)).runId).toBeGreaterThan(initial.runId);
        return;
      }
      if (state.screen === 'dead') {
        await page.screenshot({ path: `artifacts/mission-${character}-failed.png`, fullPage: true });
        throw new Error(`임무 실패: ${character}, phase=${state.mission.phase}, position=${state.player.x},${state.player.y}, enemies=${JSON.stringify(state.enemies)}, weapons=${JSON.stringify(state.weapons)}`);
      }
      if (state.screen !== 'playing') {
        await page.waitForTimeout(100);
        continue;
      }

      maxEnemies = Math.max(maxEnemies, state.performance.activeEnemies);
      maxProjectiles = Math.max(maxProjectiles, state.performance.activeProjectiles);
      maxParticles = Math.max(maxParticles, state.performance.activeParticles);
      if (state.performance.fps > 0) minFps = Math.min(minFps, state.performance.fps);
      if (state.mission.phase !== previousPhase) {
        previousPhase = state.mission.phase;
        phaseStartedAt = Date.now();
        phaseOrigin = { x: state.player.x, y: state.player.y };
        routeIndex = 0;
        await driver.stop();
        console.log(`MISSION_PHASE ${character} ${previousPhase}`);
      }

      const nearest = nearestEnemy(state);
      const nearestDistance = nearest ? distance(nearest, state.player) : Number.POSITIVE_INFINITY;
      const nearby = state.enemies.filter((enemy) => distance(enemy, state.player) < 220).length;
      let desiredWeapon: WeaponId = 'rifle';
      if (nearby >= 5 && nearestDistance < 190 && availableWeapon(state, 'launcher')) desiredWeapon = 'launcher';
      else if (nearestDistance < 170 && availableWeapon(state, 'shotgun')) desiredWeapon = 'shotgun';
      if (!availableWeapon(state, desiredWeapon)) {
        desiredWeapon = (['shotgun', 'launcher', 'rifle'] as const)
          .find((id) => availableWeapon(state, id)) ?? 'rifle';
      }
      const selected = state.weapons.find((weapon) => weapon.id === state.selectedWeapon);
      if (!selected?.reloading && state.selectedWeapon !== desiredWeapon && Date.now() - lastWeaponSwitchAt > 1200) {
        await driver.selectWeapon(desiredWeapon);
        lastWeaponSwitchAt = Date.now();
      }
      await driver.aimAndFire();

      if (nearest && (state.mission.phase === 'defend' || character === 'heavy') && nearestDistance < (state.mission.phase === 'defend' ? 140 : 80)) {
        const dx = state.player.x - nearest.x;
        const dy = state.player.y - nearest.y;
        const length = Math.hypot(dx, dy);
        const directionX = length > 1 ? dx / length : -1;
        const directionY = length > 1 ? dy / length : 0;
        let fleeX = state.player.x + directionX * 220;
        let fleeY = state.player.y + directionY * 220;
        if (state.mission.phase === 'defend') {
          if (distance(state.player, { x: 1900, y: 800 }) > 200) {
            fleeX = 1900;
            fleeY = 800;
          } else {
            const fromCenterX = fleeX - 1900;
            const fromCenterY = fleeY - 800;
            const fromCenter = Math.hypot(fromCenterX, fromCenterY);
            if (fromCenter > 170) {
              fleeX = 1900 + fromCenterX / fromCenter * 170;
              fleeY = 800 + fromCenterY / fromCenter * 170;
            }
          }
        } else {
          const nextTarget = nextRouteTarget(state);
          fleeX = nextTarget.x + directionX * 100;
          fleeY = nextTarget.y + directionY * 100;
        }
        await driver.moveToward(
          Math.max(50, Math.min(2350, fleeX)),
          Math.max(50, Math.min(1550, fleeY)),
          16,
        );
      } else if (state.mission.phase === 'defend') {
        const orbitIndex = Math.floor((Date.now() - phaseStartedAt) / 2200) % defenseOrbit.length;
        await driver.moveToward(defenseOrbit[orbitIndex].x, defenseOrbit[orbitIndex].y, 42);
      } else {
        const nextTarget = nextRouteTarget(state);
        await driver.moveToward(nextTarget.x, nextTarget.y, 40);
      }
      await page.waitForTimeout(80);
    }
    const last = await snapshot(page);
    await page.screenshot({ path: `artifacts/mission-${character}-timeout.png`, fullPage: true });
    throw new Error(`임무 시간 초과: ${character}, phase=${last.mission.phase}, position=${last.player.x},${last.player.y}, enemies=${last.enemies.length}`);
  } finally {
    await driver.stop();
  }
}

for (const character of ['heavy', 'scout'] as const) {
  test(`${character} 캐릭터가 실제 입력으로 침투·방어·탈출을 완료한다`, async ({ page }) => {
    test.setTimeout(180_000);
    await completeMission(page, character);
  });
}
