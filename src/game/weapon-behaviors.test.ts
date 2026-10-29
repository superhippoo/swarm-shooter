import { describe, expect, it } from 'vitest';
import {
  chainDamage,
  coneTargets,
  createMine,
  mineExplosionTargets,
  placeMine,
  railTrajectory,
  selectChainTargets,
  updateMines,
  updateTimedEffectPool,
  type CombatTarget,
} from './weapon-behaviors';

const target = (id: number, x: number, y: number, radius = 5): CombatTarget => ({ id, x, y, radius });

describe('ARC-5 chain rules', () => {
  it('chains to five unique nearest targets with 25 percent damage falloff per jump', () => {
    const primary = target(1, 100, 0);
    const candidates = [primary, target(2, 250, 0), target(3, 400, 0), target(4, 550, 0), target(5, 700, 0), target(6, 850, 0)];
    const hits = selectChainTargets({ x: 0, y: 0 }, primary, candidates, []);
    expect(hits.map((hit) => hit.id)).toEqual([1, 2, 3, 4, 5]);
    expect(hits.map((_, index) => chainDamage(46, index))).toEqual([46, 34.5, 25.875, 19.40625, 14.5546875]);
  });

  it('never revisits a target and stops a jump blocked by an obstacle', () => {
    const primary = target(1, 100, 0);
    const hits = selectChainTargets({ x: 0, y: 0 }, primary, [
      primary,
      target(2, 220, 0),
      target(3, 100, 100),
    ], [{ x: 175, y: 0, width: 20, height: 100 }]);
    expect(hits.map((hit) => hit.id)).toEqual([1, 3]);
    expect(new Set(hits.map((hit) => hit.id)).size).toBe(hits.length);
  });

  it('rejects a primary without line of sight', () => {
    const primary = target(1, 100, 0);
    expect(selectChainTargets({ x: 0, y: 0 }, primary, [primary], [
      { x: 50, y: 0, width: 20, height: 40 },
    ])).toEqual([]);
  });
});

describe('Rail Lance penetration', () => {
  it('hits in collision order, penetrates up to eight, and stops at the first obstacle', () => {
    const trajectory = railTrajectory({ x: 0, y: 0 }, 0, 1100, [
      target(3, 700, 0), target(1, 200, 0), target(2, 450, 0), target(4, 1050, 0),
    ], [{ x: 800, y: 0, width: 30, height: 100 }]);
    expect(trajectory.hits.map((hit) => hit.target.id)).toEqual([1, 2, 3]);
    expect(trajectory.end.x).toBe(785);
  });

  it('caps a clear trajectory at eight targets', () => {
    const targets = Array.from({ length: 10 }, (_, index) => target(index + 1, 100 + index * 80, 0));
    expect(railTrajectory({ x: 0, y: 0 }, 0, 1100, targets, []).hits).toHaveLength(8);
  });
});

describe('Flame Projector cone', () => {
  it('uses range, angle and per-target line of sight', () => {
    const hits = coneTargets({ x: 0, y: 0 }, 0, 300, 0.75, [
      target(1, 200, 0),
      target(2, 200, 200),
      target(3, 301, 0),
      target(4, 250, 0),
    ], [{ x: 225, y: 0, width: 20, height: 50 }]);
    expect(hits.map((hit) => hit.id)).toEqual([1]);
  });
});

describe('MX-8 mines', () => {
  it('arms after 400ms and only triggers within 90px after arming', () => {
    const mine = createMine(1, { x: 100, y: 100 }, 1000);
    expect(updateMines([mine], 1399, [target(1, 100, 100)]).detonated).toEqual([]);
    expect(updateMines([mine], 1400, [target(1, 300, 100)]).mines).toHaveLength(1);
    const triggered = updateMines([mine], 1400, [target(1, 180, 100)]);
    expect(triggered.detonated.map((item) => item.id)).toEqual([1]);
    expect(triggered.mines).toEqual([]);
  });

  it('detonates the oldest mine when placing a ninth and keeps the pool at eight', () => {
    const mines = Array.from({ length: 8 }, (_, index) => createMine(index + 1, { x: index * 20, y: 0 }, index * 100));
    const placement = placeMine(mines, createMine(9, { x: 999, y: 0 }, 5000));
    expect(placement.detonated?.id).toBe(1);
    expect(placement.mines).toHaveLength(8);
    expect(placement.mines.map((mine) => mine.id)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('applies the 150px explosion query without losing candidates at the boundary', () => {
    const hits = mineExplosionTargets({ x: 0, y: 0 }, [target(1, 150, 0, 0), target(2, 151, 0, 0)]);
    expect(hits.map((hit) => hit.id)).toEqual([1]);
  });
});

describe('timed visual pool cleanup', () => {
  it('expires chain, rail and flame effect slots without allocating replacements', () => {
    const pool = [
      { active: true, remainingMs: 50 },
      { active: true, remainingMs: 100 },
      { active: false, remainingMs: 0 },
    ];
    updateTimedEffectPool(pool, 60);
    expect(pool).toEqual([
      { active: false, remainingMs: 0 },
      { active: true, remainingMs: 40 },
      { active: false, remainingMs: 0 },
    ]);
  });
});
