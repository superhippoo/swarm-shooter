import { describe, expect, it } from 'vitest';
import type { EnemyId } from '../shared/game-types';
import { CAMPAIGN_STAGES, stageEnemyTotal, waveEnemyTotal } from './campaign';

const expectedTotals: Array<Record<EnemyId, number>> = [
  { swarmer: 48, skitter: 6, brute: 1 },
  { swarmer: 60, skitter: 10, brute: 1 },
  { swarmer: 64, skitter: 20, brute: 2 },
  { swarmer: 72, skitter: 18, brute: 11 },
  { swarmer: 100, skitter: 24, brute: 4 },
  { swarmer: 110, skitter: 30, brute: 6 },
  { swarmer: 130, skitter: 34, brute: 8 },
  { swarmer: 130, skitter: 44, brute: 10 },
  { swarmer: 150, skitter: 55, brute: 12 },
  { swarmer: 170, skitter: 65, brute: 17 },
];

describe('BLACK DEW stage definitions', () => {
  it('defines all ten ordered stages, layouts, caps, supplies and rewards', () => {
    expect(CAMPAIGN_STAGES).toHaveLength(10);
    expect(CAMPAIGN_STAGES.map((stage) => stage.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `stage-${String(index + 1).padStart(2, '0')}`),
    );
    expect(CAMPAIGN_STAGES.map((stage) => stage.maxAlive)).toEqual([32, 36, 40, 44, 48, 52, 56, 60, 64, 72]);
    expect(CAMPAIGN_STAGES.map((stage) => stage.unlock ?? null)).toEqual([
      null, 'arc', null, 'rail', null, 'flame', null, 'mines', null, null,
    ]);
    expect(new Set(CAMPAIGN_STAGES.map((stage) => stage.layoutId))).toEqual(new Set(['medbay', 'reactor', 'hive']));
    for (const stage of CAMPAIGN_STAGES) {
      expect(stage.supplies).toHaveLength(2);
      expect(stage.objectives.length).toBeGreaterThanOrEqual(2);
      expect(stage.waves.length).toBeGreaterThan(0);
      expect(stage.maxAlive).toBeLessThanOrEqual(72);
    }
  });

  it.each(CAMPAIGN_STAGES.map((stage, index) => [stage, index] as const))(
    '$id preserves exact finite enemy requests',
    (stage, index) => {
      expect(stageEnemyTotal(stage)).toEqual(expectedTotals[index]);
      for (const wave of stage.waves) {
        expect(wave.objectiveId.length).toBeGreaterThan(0);
        expect(wave.required).toBe(true);
        expect(waveEnemyTotal(wave)).toBeGreaterThanOrEqual(0);
      }
    },
  );

  it('uses sequential multi-point objectives and all six objective kinds', () => {
    expect(CAMPAIGN_STAGES[2].objectives.map((objective) => objective.kind)).toEqual(['defend', 'defend', 'purge']);
    expect(CAMPAIGN_STAGES[5].objectives.map((objective) => objective.kind)).toEqual(['defend', 'defend', 'defend', 'purge']);
    expect(CAMPAIGN_STAGES[6].objectives.map((objective) => objective.kind)).toEqual(['purge', 'purge', 'purge', 'purge']);
    expect(CAMPAIGN_STAGES[9].objectives.map((objective) => objective.kind)).toEqual(['defend', 'hunt', 'purge', 'extract']);
    expect(new Set(CAMPAIGN_STAGES.flatMap((stage) => stage.objectives.map((objective) => objective.kind)))).toEqual(
      new Set(['reach', 'defend', 'collect', 'purge', 'hunt', 'extract']),
    );
  });

  it('reserves exactly twelve swarmers and three skitters for Alpha threshold summons', () => {
    const reserve = CAMPAIGN_STAGES[9].waves.find((wave) => wave.id === 's10-hunt-reserve');
    expect(reserve).toMatchObject({ atMs: -1, counts: { swarmer: 12, skitter: 3, brute: 0 } });
    const alpha = CAMPAIGN_STAGES[9].waves.find((wave) => wave.id === 's10-hunt-alpha');
    expect(alpha?.alphaCount).toBe(1);
  });
});
