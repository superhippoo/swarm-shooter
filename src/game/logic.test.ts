import { describe, expect, it } from 'vitest';
import type { EnemyId, WeaponId } from '../shared/game-types';
import {
  CHARACTERS,
  COMBAT,
  LIMITS,
  MISSION,
  WEAPONS,
  WEAPON_ORDER,
  WORLD,
} from './config';
import {
  actualReloadMs,
  advanceMission,
  applySupply,
  canFireWeapon,
  cancelReload,
  consumeRound,
  createEmergencyRuntime,
  createMission,
  createWeaponCollection,
  createWeaponRuntime,
  distanceBetween,
  explosionDamage,
  getMissionObjective,
  isWithinRange,
  massScale,
  maxReserve,
  normalizeStickVector,
  reloadProgress,
  requestReload,
  selectAutoAimTarget,
  segmentCircleTime,
  segmentRectangleTime,
  settleReload,
  updateEmergency,
  type MissionRuntime,
} from './logic';
import { SpatialHash } from './spatial';

const scout = CHARACTERS.scout;
const heavy = CHARACTERS.heavy;
const initialAmmo = (id: WeaponId = 'rifle') => createWeaponRuntime(WEAPONS[id], scout);
const defenseMission = (elapsedMs = 0): MissionRuntime => ({
  phase: 'defend',
  elapsedMs,
  phaseStartDistance: 0,
});

describe('documented character and weapon definitions', () => {
  it('applies exact health, speed, reserve and reload values', () => {
    expect(scout).toMatchObject({ maxHealth: 400, speed: 245 });
    expect(heavy).toMatchObject({ maxHealth: 520, speed: 180 });
    expect(WEAPON_ORDER.map((id) => maxReserve(WEAPONS[id], scout))).toEqual([180, 36, 16]);
    expect(WEAPON_ORDER.map((id) => maxReserve(WEAPONS[id], heavy))).toEqual([225, 45, 20]);
    expect(WEAPON_ORDER.map((id) => actualReloadMs(WEAPONS[id], scout))).toEqual([1190, 1530, 1870]);
    expect(WEAPON_ORDER.map((id) => actualReloadMs(WEAPONS[id], heavy))).toEqual([1540, 1980, 2420]);
  });

  it('starts with all three full magazines and independent reserves', () => {
    const weapons = createWeaponCollection(heavy);
    expect(WEAPON_ORDER.map((id) => weapons[id].magazine)).toEqual([30, 6, 3]);
    expect(WEAPON_ORDER.map((id) => weapons[id].reserve)).toEqual([225, 45, 20]);
  });
});

describe('trigger and ammunition rules', () => {
  it('consumes one round per trigger, including an eight-pellet shotgun shot', () => {
    expect(consumeRound(initialAmmo('shotgun'))?.magazine).toBe(5);
    expect(consumeRound({ ...initialAmmo(), magazine: 0 })).toBeNull();
    expect(consumeRound({ ...initialAmmo(), reloading: true })).toBeNull();
  });

  it('allows held automatic fire but requires a new press for both semi-automatic weapons', () => {
    expect(canFireWeapon(initialAmmo(), WEAPONS.rifle, 1000, 0, true, false, 1)).toBe(true);
    expect(canFireWeapon(initialAmmo(), WEAPONS.rifle, 1000, 0, false, false, 1)).toBe(false);
    for (const id of ['shotgun', 'launcher'] as const) {
      expect(canFireWeapon(initialAmmo(id), WEAPONS[id], 1000, 0, true, false, 8)).toBe(false);
      expect(canFireWeapon(initialAmmo(id), WEAPONS[id], 1000, 0, true, true, 8)).toBe(true);
      expect(canFireWeapon(initialAmmo(id), WEAPONS[id], 100, 500, true, true, 8)).toBe(false);
    }
  });

  it('requires all eight free projectile slots before a shotgun trigger succeeds', () => {
    const state = initialAmmo('shotgun');
    expect(canFireWeapon(state, WEAPONS.shotgun, 1000, 0, true, true, 7)).toBe(false);
    expect(canFireWeapon(state, WEAPONS.shotgun, 1000, 0, true, true, 8)).toBe(true);
  });

  it.each(WEAPON_ORDER)('settles %s reload only at its deadline', (id) => {
    const definition = WEAPONS[id];
    const state = { ...initialAmmo(id), magazine: 0, reserve: 5 };
    const reloading = requestReload(state, definition.magazineSize, 100, 1000);
    expect(reloading.reloading).toBe(true);
    expect(reloadProgress(reloading, 600, 1000)).toBe(0.5);
    expect(settleReload(reloading, definition.magazineSize, 1099)).toBe(reloading);
    expect(settleReload(reloading, definition.magazineSize, 1100)).toEqual({
      magazine: Math.min(5, definition.magazineSize),
      reserve: Math.max(0, 5 - definition.magazineSize),
      reloading: false,
      reloadEndsAt: 0,
    });
  });

  it('cancels an unfinished reload without transferring ammunition', () => {
    const state = { ...initialAmmo('shotgun'), magazine: 1, reserve: 20 };
    const reloading = requestReload(state, 6, 100, 1530);
    const cancelled = cancelReload(reloading);
    expect(cancelled.reloading).toBe(false);
    expect(settleReload(cancelled, 6, 2000)).toBe(cancelled);
    expect(cancelled).toMatchObject({ magazine: 1, reserve: 20 });
  });
});

describe('explosion and knockback rules', () => {
  it('uses 100 percent center damage, 40 percent edge damage and no outside damage', () => {
    expect(explosionDamage(105, 0, 120)).toBe(105);
    expect(explosionDamage(105, 60, 120)).toBeCloseTo(73.5);
    expect(explosionDamage(105, 120, 120)).toBeCloseTo(42);
    expect(explosionDamage(105, 121, 120)).toBe(0);
    expect(explosionDamage(105, 119, 120, true)).toBe(105);
  });

  it('scales knockback by radius with the documented clamps', () => {
    expect(massScale(11)).toBe(1);
    expect(massScale(29)).toBeCloseTo(14 / 29);
    expect(massScale(100)).toBe(0.35);
  });

  it('finds segment hits without missing fast projectiles', () => {
    expect(segmentCircleTime(0, 0, 100, 0, 50, 0, 5)).toBeCloseTo(0.45);
    expect(segmentCircleTime(0, 20, 100, 20, 50, 0, 5)).toBeNull();
    expect(segmentRectangleTime(0, 0, 100, 0, 40, -5, 60, 5)).toBeCloseTo(0.4);
    expect(segmentRectangleTime(0, 20, 100, 20, 40, -5, 60, 5)).toBeNull();
  });
});

describe('supplies and emergency ammunition', () => {
  it('restores health and 40 percent of each reserve without filling magazines', () => {
    const empty = createWeaponCollection(scout);
    for (const id of WEAPON_ORDER) empty[id] = { ...empty[id], magazine: 0, reserve: 0 };
    const supplied = applySupply(empty, 95, scout);
    expect(supplied.used).toBe(true);
    expect(supplied.health).toBe(140);
    expect(WEAPON_ORDER.map((id) => supplied.weapons[id].reserve)).toEqual([72, 15, 7]);
    expect(WEAPON_ORDER.map((id) => supplied.weapons[id].magazine)).toEqual([0, 0, 0]);
  });

  it('does not consume a supply when every recoverable value is already full', () => {
    const full = createWeaponCollection(scout);
    const supplied = applySupply(full, scout.maxHealth, scout);
    expect(supplied.used).toBe(false);
    expect(supplied.weapons).toBe(full);
  });

  it('grants emergency rifle ammunition after 1500ms and enforces the 6000ms cooldown', () => {
    const initial = createEmergencyRuntime();
    expect(updateEmergency(initial, 0, 0, 1499).grant).toBe(false);
    const granted = updateEmergency(initial, 0, 0, 1500);
    expect(granted.grant).toBe(true);
    expect(updateEmergency(granted.state, 24, 10, 16).state.emptyMs).toBe(0);
    const waiting = updateEmergency(granted.state, 0, 1500, 1500);
    expect(waiting.grant).toBe(false);
    expect(updateEmergency(waiting.state, 0, 5999, 0).grant).toBe(false);
    expect(updateEmergency(waiting.state, 0, 6000, 0).grant).toBe(true);
  });
});

describe('distance and mission state machine', () => {
  it('measures distance and includes exact range boundaries', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(isWithinRange({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true);
    expect(isWithinRange({ x: 0, y: 0 }, { x: 3, y: 4 }, 4.9)).toBe(false);
  });

  it('enters defense within 90px and reports normalized travel progress', () => {
    const mission = createMission();
    expect(getMissionObjective(mission, WORLD.start)).toMatchObject({ progress: 0, target: 1 });
    expect(advanceMission(mission, WORLD.start, 16)).toBe(mission);
    const near = { x: WORLD.infiltration.x - 90, y: WORLD.infiltration.y };
    const defense = advanceMission(mission, near, 16);
    expect(defense.phase).toBe('defend');
    expect(getMissionObjective(defense, near)).toMatchObject({ progress: 0, target: 1 });
  });

  it('freezes only active defense time outside the 300px zone and resumes from the same value', () => {
    const mission = defenseMission(4000);
    const outside = { x: 1000, y: 800 };
    expect(advanceMission(mission, outside, 5000)).toBe(mission);
    expect(getMissionObjective(mission, outside).label).toBe('방어 구역 복귀 · 시간 정지');
    const boundary = { x: WORLD.infiltration.x + 300, y: WORLD.infiltration.y };
    const resumed = advanceMission(mission, boundary, 1000);
    expect(resumed.elapsedMs).toBe(5000);
    expect(getMissionObjective(resumed, boundary)).toMatchObject({
      label: '신호 방어 · 20초',
      progress: 0.2,
      target: 1,
    });
  });

  it('requires 25000 active defense milliseconds before extraction', () => {
    const inside = WORLD.infiltration;
    const defending = advanceMission(defenseMission(), inside, MISSION.defenseDurationMs - 1);
    expect(defending.phase).toBe('defend');
    const extracting = advanceMission(defending, inside, 1);
    expect(extracting.phase).toBe('extract');
    expect(getMissionObjective(extracting, inside).worldX).toBe(WORLD.extraction.x);
  });

  it('completes within 90px of extraction and preserves complete progress', () => {
    const extracting: MissionRuntime = {
      phase: 'extract',
      elapsedMs: 1000,
      phaseStartDistance: distanceBetween(WORLD.infiltration, WORLD.extraction),
    };
    const near = { x: WORLD.extraction.x + 90, y: WORLD.extraction.y };
    const complete = advanceMission(extracting, near, 16);
    expect(complete.phase).toBe('complete');
    expect(getMissionObjective(complete, near)).toMatchObject({ progress: 1, target: 1 });
    expect(advanceMission(complete, WORLD.start, 1000)).toBe(complete);
  });
});

describe('bounded combat candidates', () => {
  it('keeps documented pool budgets and returns only nearby spatial-hash candidates', () => {
    expect(LIMITS).toMatchObject({ enemies: 72, projectiles: 192, particles: 384, corpses: 40, audioVoices: 12 });
    const hash = new SpatialHash<EnemyId>(COMBAT.spatialCellSize);
    hash.insert('swarmer', 10, 10);
    hash.insert('skitter', 500, 500);
    hash.insert('brute', 1200, 1200);
    expect(hash.query(0, 0, 127, 127, [])).toEqual(['swarmer']);
    expect(hash.query(128, 128, 1279, 1279, [])).toEqual(['skitter', 'brute']);
  });
});

describe('touch movement and automatic aim', () => {
  it('applies a dead zone and clamps diagonal stick vectors', () => {
    expect(normalizeStickVector(0, 0, 50)).toEqual({ x: 0, y: 0 });
    expect(normalizeStickVector(4, 0, 50)).toEqual({ x: 0, y: 0 });
    expect(normalizeStickVector(100, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(normalizeStickVector(50, 0, 50).x).toBeCloseTo(1);
    const diagonal = normalizeStickVector(100, 100, 50);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1);
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2);
    expect(diagonal.y).toBeCloseTo(Math.SQRT1_2);
  });

  it('preserves proportional speed outside the dead zone', () => {
    const vector = normalizeStickVector(25, 0, 50, 0.2);
    expect(vector.x).toBeCloseTo(0.375);
    expect(vector.y).toBe(0);
  });

  it('selects the nearest clear target and breaks distance ties by id', () => {
    expect(selectAutoAimTarget({ x: 0, y: 0 }, [
      { id: 9, x: 0, y: 40 },
      { id: 4, x: 40, y: 0 },
    ], [])?.id).toBe(4);
    expect(selectAutoAimTarget({ x: 0, y: 0 }, [
      { id: 1, x: 50, y: 0 },
      { id: 2, x: 90, y: 90 },
      { id: 3, x: 100, y: 0 },
    ], [{ x: 50, y: 0, width: 20, height: 40 }])?.id).toBe(2);
    expect(selectAutoAimTarget({ x: 0, y: 0 }, [], [])).toBeNull();
  });
});
