import { describe, expect, it } from 'vitest';
import { CHARACTERS, MISSION, RIFLE, WORLD } from './config';
import {
  advanceMission,
  consumeRound,
  createMission,
  createWeaponRuntime,
  distanceBetween,
  getMissionObjective,
  isWithinRange,
  reloadProgress,
  requestReload,
  settleReload,
} from './logic';

const initialAmmo = () => createWeaponRuntime(RIFLE, CHARACTERS.scout);

describe('rifle ammunition', () => {
  it('consumes one round per shot and refuses empty or reloading shots', () => {
    const fired = consumeRound(initialAmmo());
    expect(fired?.magazine).toBe(RIFLE.magazineSize - 1);
    expect(consumeRound({ ...initialAmmo(), magazine: 0 })).toBeNull();
    expect(consumeRound({ ...initialAmmo(), reloading: true })).toBeNull();
  });

  it('applies character reserve multipliers to actual ammunition', () => {
    expect(initialAmmo().reserve).toBe(120);
    expect(createWeaponRuntime(RIFLE, CHARACTERS.heavy).reserve).toBe(180);
  });

  it('reloads only after the reload deadline and transfers reserve rounds', () => {
    const state = {
      ...initialAmmo(),
      magazine: 4,
      reserve: 12,
    };
    const reloading = requestReload(state, RIFLE.magazineSize, 100, 1000);
    expect(reloading.reloading).toBe(true);
    expect(settleReload(reloading, RIFLE.magazineSize, 1099)).toBe(reloading);
    expect(reloadProgress(reloading, 600, 1000)).toBe(0.5);

    const loaded = settleReload(reloading, RIFLE.magazineSize, 1100);
    expect(loaded).toEqual({
      magazine: 16,
      reserve: 0,
      reloading: false,
      reloadEndsAt: 0,
    });
  });

  it('does not start a redundant or impossible reload', () => {
    const full = initialAmmo();
    expect(requestReload(full, RIFLE.magazineSize, 0, 100)).toBe(full);
    const emptyReserve = { ...full, magazine: 0, reserve: 0 };
    expect(requestReload(emptyReserve, RIFLE.magazineSize, 0, 100)).toBe(emptyReserve);
  });
});

describe('distance checks', () => {
  it('measures world distance and includes the exact range boundary', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(isWithinRange({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true);
    expect(isWithinRange({ x: 0, y: 0 }, { x: 3, y: 4 }, 4.9)).toBe(false);
    expect(isWithinRange({ x: 0, y: 0 }, { x: 0, y: 0 }, -1)).toBe(false);
  });
});

describe('mission state machine', () => {
  it('moves from infiltration to defense at the objective', () => {
    const mission = createMission();
    expect(advanceMission(mission, WORLD.start, 16)).toBe(mission);
    const defense = advanceMission(mission, WORLD.infiltration, 16);
    expect(defense.phase).toBe('defend');
    expect(getMissionObjective(defense).target).toBe(20);
  });

  it('requires the full defense duration before unlocking extraction', () => {
    const defense = { phase: 'defend', elapsedMs: 0 } as const;
    const stillDefending = advanceMission(
      defense,
      WORLD.infiltration,
      MISSION.defenseDurationMs - 1,
    );
    expect(stillDefending.phase).toBe('defend');
    const extracting = advanceMission(stillDefending, WORLD.infiltration, 1);
    expect(extracting.phase).toBe('extract');
    expect(getMissionObjective(extracting).worldX).toBe(WORLD.extraction.x);
  });

  it('completes only after reaching extraction and then remains complete', () => {
    const extracting = { phase: 'extract', elapsedMs: 0 } as const;
    expect(advanceMission(extracting, WORLD.infiltration, 16).phase).toBe('extract');
    const complete = advanceMission(extracting, WORLD.extraction, 16);
    expect(complete.phase).toBe('complete');
    expect(advanceMission(complete, WORLD.start, 1000)).toBe(complete);
  });
});
