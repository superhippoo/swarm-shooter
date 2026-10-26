import type {
  CharacterDefinition,
  MissionPhase,
  WeaponDefinition,
} from '../shared/game-types';
import { MISSION, WORLD } from './config';

export interface Point {
  x: number;
  y: number;
}

export interface WeaponRuntime {
  magazine: number;
  reserve: number;
  reloading: boolean;
  reloadEndsAt: number;
}

export interface MissionRuntime {
  phase: MissionPhase;
  elapsedMs: number;
}

export interface MissionObjective {
  label: string;
  progress: number;
  target: number;
  worldX: number;
  worldY: number;
}

export function createWeaponRuntime(
  weapon: WeaponDefinition,
  character: CharacterDefinition,
): WeaponRuntime {
  return {
    magazine: weapon.magazineSize,
    reserve: Math.round(weapon.reserveAmmo * character.reserveAmmoMultiplier),
    reloading: false,
    reloadEndsAt: 0,
  };
}

export function consumeRound(state: WeaponRuntime): WeaponRuntime | null {
  if (state.reloading || state.magazine <= 0) {
    return null;
  }
  return { ...state, magazine: state.magazine - 1 };
}

export function requestReload(
  state: WeaponRuntime,
  magazineSize: number,
  nowMs: number,
  reloadMs: number,
): WeaponRuntime {
  if (
    state.reloading ||
    state.reserve <= 0 ||
    state.magazine >= magazineSize
  ) {
    return state;
  }
  return { ...state, reloading: true, reloadEndsAt: nowMs + Math.max(0, reloadMs) };
}

export function settleReload(
  state: WeaponRuntime,
  magazineSize: number,
  nowMs: number,
): WeaponRuntime {
  if (!state.reloading || nowMs < state.reloadEndsAt) {
    return state;
  }
  const loaded = Math.min(magazineSize - state.magazine, state.reserve);
  return {
    magazine: state.magazine + loaded,
    reserve: state.reserve - loaded,
    reloading: false,
    reloadEndsAt: 0,
  };
}

export function reloadProgress(
  state: WeaponRuntime,
  nowMs: number,
  reloadMs: number,
): number {
  if (!state.reloading) {
    return 0;
  }
  if (reloadMs <= 0) {
    return 1;
  }
  const elapsed = reloadMs - Math.max(0, state.reloadEndsAt - nowMs);
  return Math.min(1, Math.max(0, elapsed / reloadMs));
}

export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isWithinRange(a: Point, b: Point, range: number): boolean {
  if (range < 0) {
    return false;
  }
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= range * range;
}

export function createMission(): MissionRuntime {
  return { phase: 'infiltrate', elapsedMs: 0 };
}

export function advanceMission(
  state: MissionRuntime,
  player: Point,
  deltaMs: number,
): MissionRuntime {
  switch (state.phase) {
    case 'infiltrate':
      return isWithinRange(player, WORLD.infiltration, MISSION.interactionRadius)
        ? { phase: 'defend', elapsedMs: 0 }
        : state;
    case 'defend': {
      const elapsedMs = state.elapsedMs + Math.max(0, deltaMs);
      return elapsedMs >= MISSION.defenseDurationMs
        ? { phase: 'extract', elapsedMs: 0 }
        : { ...state, elapsedMs };
    }
    case 'extract':
      return isWithinRange(player, WORLD.extraction, MISSION.extractionRadius)
        ? { phase: 'complete', elapsedMs: 0 }
        : state;
    case 'complete':
      return state;
  }
}

export function getMissionObjective(state: MissionRuntime): MissionObjective {
  switch (state.phase) {
    case 'infiltrate':
      return {
        label: '연구 시설 중앙 제어실로 침투',
        progress: 0,
        target: 1,
        worldX: WORLD.infiltration.x,
        worldY: WORLD.infiltration.y,
      };
    case 'defend':
      return {
        label: '제어실 업로드 방어',
        progress: Math.min(MISSION.defenseDurationMs / 1000, state.elapsedMs / 1000),
        target: MISSION.defenseDurationMs / 1000,
        worldX: WORLD.infiltration.x,
        worldY: WORLD.infiltration.y,
      };
    case 'extract':
      return {
        label: '북서쪽 탈출구로 이동',
        progress: 0,
        target: 1,
        worldX: WORLD.extraction.x,
        worldY: WORLD.extraction.y,
      };
    case 'complete':
      return {
        label: '작전 완료',
        progress: 1,
        target: 1,
        worldX: WORLD.extraction.x,
        worldY: WORLD.extraction.y,
      };
  }
}
