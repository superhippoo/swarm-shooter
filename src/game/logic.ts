import type {
  CharacterDefinition,
  MissionPhase,
  WeaponDefinition,
  WeaponId,
} from '../shared/game-types';
import {
  COMBAT,
  MISSION,
  WEAPONS,
  WEAPON_ORDER,
  WORLD,
} from './config';

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

export type WeaponCollection = Record<WeaponId, WeaponRuntime>;

export interface MissionRuntime {
  phase: MissionPhase;
  elapsedMs: number;
  phaseStartDistance: number;
}

export interface MissionObjective {
  label: string;
  progress: number;
  target: number;
  worldX: number;
  worldY: number;
}

export interface EmergencyRuntime {
  emptyMs: number;
  lastGrantAt: number;
}

export interface EmergencyUpdate {
  state: EmergencyRuntime;
  grant: boolean;
}

export interface SupplyUpdate {
  weapons: WeaponCollection;
  health: number;
  used: boolean;
}

export function maxReserve(weapon: WeaponDefinition, character: CharacterDefinition): number {
  return Math.round(weapon.reserveAmmo * character.reserveAmmoMultiplier);
}

export function actualReloadMs(weapon: WeaponDefinition, character: CharacterDefinition): number {
  return Math.round(weapon.reloadMs * character.reloadMultiplier);
}

export function createWeaponRuntime(
  weapon: WeaponDefinition,
  character: CharacterDefinition,
): WeaponRuntime {
  return {
    magazine: weapon.magazineSize,
    reserve: maxReserve(weapon, character),
    reloading: false,
    reloadEndsAt: 0,
  };
}

export function createWeaponCollection(character: CharacterDefinition): WeaponCollection {
  return {
    rifle: createWeaponRuntime(WEAPONS.rifle, character),
    shotgun: createWeaponRuntime(WEAPONS.shotgun, character),
    launcher: createWeaponRuntime(WEAPONS.launcher, character),
  };
}

export function canFireWeapon(
  state: WeaponRuntime,
  weapon: WeaponDefinition,
  nowMs: number,
  nextShotAt: number,
  triggerHeld: boolean,
  triggerPressed: boolean,
  freeProjectileSlots: number,
): boolean {
  const trigger = weapon.automatic ? triggerHeld : triggerPressed;
  return trigger &&
    !state.reloading &&
    state.magazine > 0 &&
    nowMs >= nextShotAt &&
    freeProjectileSlots >= weapon.pellets;
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
  if (state.reloading || state.reserve <= 0 || state.magazine >= magazineSize) {
    return state;
  }
  return { ...state, reloading: true, reloadEndsAt: nowMs + Math.max(0, reloadMs) };
}

export function cancelReload(state: WeaponRuntime): WeaponRuntime {
  return state.reloading
    ? { ...state, reloading: false, reloadEndsAt: 0 }
    : state;
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
  if (!state.reloading) return 0;
  if (reloadMs <= 0) return 1;
  const elapsed = reloadMs - Math.max(0, state.reloadEndsAt - nowMs);
  return clamp01(elapsed / reloadMs);
}

export function totalAmmo(weapons: WeaponCollection): number {
  return WEAPON_ORDER.reduce(
    (total, id) => total + weapons[id].magazine + weapons[id].reserve,
    0,
  );
}

export function createEmergencyRuntime(): EmergencyRuntime {
  return { emptyMs: 0, lastGrantAt: -COMBAT.emergencyCooldownMs };
}

export function updateEmergency(
  state: EmergencyRuntime,
  ammunition: number,
  nowMs: number,
  deltaMs: number,
): EmergencyUpdate {
  if (ammunition > 0) {
    return { state: { ...state, emptyMs: 0 }, grant: false };
  }
  const emptyMs = state.emptyMs + Math.max(0, deltaMs);
  const ready = emptyMs >= COMBAT.emergencyDelayMs &&
    nowMs - state.lastGrantAt >= COMBAT.emergencyCooldownMs;
  return {
    state: ready
      ? { emptyMs: 0, lastGrantAt: nowMs }
      : { ...state, emptyMs },
    grant: ready,
  };
}

export function applySupply(
  weapons: WeaponCollection,
  health: number,
  character: CharacterDefinition,
): SupplyUpdate {
  const restored = { ...weapons };
  let used = health < character.maxHealth;
  for (const id of WEAPON_ORDER) {
    const maximum = maxReserve(WEAPONS[id], character);
    const amount = Math.ceil(maximum * 0.4);
    const reserve = Math.min(maximum, weapons[id].reserve + amount);
    restored[id] = { ...weapons[id], reserve };
    if (reserve !== weapons[id].reserve) used = true;
  }
  if (!used) return { weapons, health, used: false };
  return {
    weapons: restored,
    health: Math.min(character.maxHealth, health + COMBAT.supplyHealth),
    used: true,
  };
}

export function explosionDamage(
  baseDamage: number,
  distance: number,
  radius: number,
  directHit = false,
): number {
  if (directHit) return baseDamage;
  if (radius <= 0 || distance > radius) return 0;
  return baseDamage * (1 - 0.6 * clamp01(distance / radius));
}

export function massScale(enemyRadius: number): number {
  if (enemyRadius <= 0) return 1;
  return Math.min(1, Math.max(0.35, 14 / enemyRadius));
}

export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isWithinRange(a: Point, b: Point, range: number): boolean {
  if (range < 0) return false;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= range * range;
}

export function isDefenseZoneActive(player: Point): boolean {
  return isWithinRange(player, WORLD.infiltration, MISSION.defenseZoneRadius);
}

export function createMission(player: Point = WORLD.start): MissionRuntime {
  return {
    phase: 'infiltrate',
    elapsedMs: 0,
    phaseStartDistance: distanceBetween(player, WORLD.infiltration),
  };
}

export function advanceMission(
  state: MissionRuntime,
  player: Point,
  deltaMs: number,
): MissionRuntime {
  switch (state.phase) {
    case 'infiltrate':
      return isWithinRange(player, WORLD.infiltration, MISSION.interactionRadius)
        ? { phase: 'defend', elapsedMs: 0, phaseStartDistance: 0 }
        : state;
    case 'defend': {
      if (!isDefenseZoneActive(player)) return state;
      const elapsedMs = state.elapsedMs + Math.max(0, deltaMs);
      return elapsedMs >= MISSION.defenseDurationMs
        ? {
            phase: 'extract',
            elapsedMs: 0,
            phaseStartDistance: distanceBetween(player, WORLD.extraction),
          }
        : { ...state, elapsedMs };
    }
    case 'extract':
      return isWithinRange(player, WORLD.extraction, MISSION.extractionRadius)
        ? { phase: 'complete', elapsedMs: state.elapsedMs, phaseStartDistance: 0 }
        : { ...state, elapsedMs: state.elapsedMs + Math.max(0, deltaMs) };
    case 'complete':
      return state;
  }
}

export function getMissionObjective(state: MissionRuntime, player?: Point): MissionObjective {
  const observer = player ?? (state.phase === 'infiltrate' ? WORLD.start : WORLD.infiltration);
  switch (state.phase) {
    case 'infiltrate':
      return {
        label: '중계기 침투',
        progress: travelProgress(observer, WORLD.infiltration, state.phaseStartDistance),
        target: 1,
        worldX: WORLD.infiltration.x,
        worldY: WORLD.infiltration.y,
      };
    case 'defend': {
      const remaining = Math.max(0, Math.ceil((MISSION.defenseDurationMs - state.elapsedMs) / 1000));
      return {
        label: isDefenseZoneActive(observer)
          ? `신호 방어 · ${remaining}초`
          : '방어 구역 복귀 · 시간 정지',
        progress: clamp01(state.elapsedMs / MISSION.defenseDurationMs),
        target: 1,
        worldX: WORLD.infiltration.x,
        worldY: WORLD.infiltration.y,
      };
    }
    case 'extract':
      return {
        label: '북서 승강기 탈출',
        progress: travelProgress(observer, WORLD.extraction, state.phaseStartDistance),
        target: 1,
        worldX: WORLD.extraction.x,
        worldY: WORLD.extraction.y,
      };
    case 'complete':
      return {
        label: '임무 완료',
        progress: 1,
        target: 1,
        worldX: WORLD.extraction.x,
        worldY: WORLD.extraction.y,
      };
  }
}

export function segmentCircleTime(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  centerX: number,
  centerY: number,
  radius: number,
): number | null {
  const dx = endX - startX;
  const dy = endY - startY;
  const fx = startX - centerX;
  const fy = startY - centerY;
  if (fx * fx + fy * fy <= radius * radius) return 0;
  const a = dx * dx + dy * dy;
  if (a === 0) return null;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const time = (-b - Math.sqrt(discriminant)) / (2 * a);
  return time >= 0 && time <= 1 ? time : null;
}

export function segmentRectangleTime(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): number | null {
  const dx = endX - startX;
  const dy = endY - startY;
  let minimum = 0;
  let maximum = 1;
  for (const [start, delta, low, high] of [
    [startX, dx, left, right],
    [startY, dy, top, bottom],
  ]) {
    if (Math.abs(delta) < 0.000001) {
      if (start < low || start > high) return null;
      continue;
    }
    const first = (low - start) / delta;
    const second = (high - start) / delta;
    minimum = Math.max(minimum, Math.min(first, second));
    maximum = Math.min(maximum, Math.max(first, second));
    if (minimum > maximum) return null;
  }
  return minimum >= 0 && minimum <= 1 ? minimum : null;
}

function travelProgress(player: Point, objective: Point, startDistance: number): number {
  if (startDistance <= 0) return 0;
  return clamp01(1 - distanceBetween(player, objective) / startDistance);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
