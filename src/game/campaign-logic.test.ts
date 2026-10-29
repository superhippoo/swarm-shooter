import { describe, expect, it } from 'vitest';
import type { EnemyRank } from '../shared/game-types';
import { CAMPAIGN_STAGES, STAGE_INTRO_MS, waveEnemyTotal } from './campaign';
import {
  advanceCampaign,
  alphaThresholdCrossings,
  campaignSnapshot,
  continueCampaign,
  createCampaign,
  currentObjective,
  currentStage,
  registerEnemyKill,
  registerEnemySpawn,
  registerMultiKill,
  registerWaveQueued,
  retryCampaign,
  stageDifficulty,
  wavesForPurge,
  type CampaignRuntime,
} from './campaign-logic';

function beginCombat(state: CampaignRuntime): CampaignRuntime {
  return advanceCampaign(state, currentStage(state).playerStart, STAGE_INTRO_MS);
}

function kill(state: CampaignRuntime, waveId: string, objectiveId: string, rank: EnemyRank = 'normal'): CampaignRuntime {
  const ownership = { waveId, objectiveId, rank, required: true };
  return registerEnemyKill(registerEnemySpawn(state, ownership), ownership);
}

function completeObjective(state: CampaignRuntime): CampaignRuntime {
  const stage = currentStage(state);
  const objective = currentObjective(state);
  switch (objective.kind) {
    case 'reach':
    case 'extract':
      return advanceCampaign(state, objective.point, 16);
    case 'defend':
      return advanceCampaign(state, objective.point, objective.durationMs);
    case 'collect': {
      let next = state;
      for (const point of objective.points) next = advanceCampaign(next, point, 16);
      return next;
    }
    case 'purge': {
      let next = state;
      for (const wave of wavesForPurge(stage, objective)) {
        next = registerWaveQueued(next, wave);
        for (let index = next.waveProgress[wave.id]?.killed ?? 0; index < waveEnemyTotal(wave); index += 1) {
          next = kill(next, wave.id, wave.objectiveId);
        }
      }
      return advanceCampaign(next, stage.playerStart, 16);
    }
    case 'hunt': {
      let next = state;
      for (let index = 0; index < objective.count; index += 1) {
        next = kill(next, `${objective.id}-test`, objective.id, objective.rank);
      }
      return advanceCampaign(next, stage.playerStart, 16);
    }
  }
}

function clearStage(state: CampaignRuntime): CampaignRuntime {
  let next = state;
  while (next.phase === 'combat') next = completeObjective(next);
  return next;
}

describe('campaign clocks and transitions', () => {
  it('freezes combat clocks during the 1.2 second intro and while paused', () => {
    const initial = createCampaign();
    const intro = advanceCampaign(initial, currentStage(initial).playerStart, 1199);
    expect(intro).toMatchObject({ phase: 'intro', stageElapsedMs: 0, campaignElapsedMs: 0 });
    const combat = advanceCampaign(intro, currentStage(intro).playerStart, 1);
    expect(combat.phase).toBe('combat');
    expect(advanceCampaign(combat, currentStage(combat).playerStart, 5000, true)).toBe(combat);
    const advanced = advanceCampaign(combat, currentStage(combat).playerStart, 500);
    expect(advanced).toMatchObject({ stageElapsedMs: 500, campaignElapsedMs: 500 });
  });

  it('runs all ten stages in order and requires continue after stage ten clear', () => {
    let state = beginCombat(createCampaign());
    const visited: string[] = [];
    for (let index = 0; index < CAMPAIGN_STAGES.length; index += 1) {
      visited.push(currentStage(state).id);
      state = clearStage(state);
      expect(state.phase).toBe('clear');
      expect(state.stageIndex).toBe(index);
      state = continueCampaign(state);
      if (index < CAMPAIGN_STAGES.length - 1) state = beginCombat(state);
    }
    expect(visited).toEqual(CAMPAIGN_STAGES.map((stage) => stage.id));
    expect(state.phase).toBe('complete');
    expect(state.stageIndex).toBe(9);
    expect(continueCampaign(state).phase).toBe('complete');
  });

  it('unlocks rewards only at their stage clear and keeps them on later stages', () => {
    let state = beginCombat(createCampaign());
    expect(state.unlockedWeapons).toEqual(['rifle', 'shotgun', 'launcher']);
    state = clearStage(state);
    expect(state.unlockedWeapons).not.toContain('arc');
    state = beginCombat(continueCampaign(state));
    expect(state.unlockedWeapons).not.toContain('arc');
    state = clearStage(state);
    expect(state.unlockedWeapons).toContain('arc');
    state = continueCampaign(state);
    expect(state.unlockedWeapons).toContain('arc');
    expect(state.checkpoint.unlockedWeapons).toContain('arc');
  });

  it('retries the current stage with entry unlocks and checkpoint statistics', () => {
    let state = beginCombat(createCampaign());
    for (let index = 0; index < 7; index += 1) state = kill(state, 's01-relay-w0', 's01-relay');
    state = registerMultiKill(state, 5);
    state = clearStage(state);
    state = beginCombat(continueCampaign(state));
    const entryTime = state.campaignElapsedMs;
    const entryKills = state.campaignKills;
    for (let index = 0; index < 4; index += 1) state = kill(state, 's02-cells-w0', 's02-cells');
    state = advanceCampaign(state, currentStage(state).playerStart, 4000);
    state = registerMultiKill(state, 9);
    const retried = retryCampaign(state);
    expect(retried).toMatchObject({
      phase: 'intro', stageIndex: 1, stageElapsedMs: 0, stageKills: 0,
      campaignElapsedMs: entryTime, campaignKills: entryKills, bestMultiKill: 5,
    });
    expect(retried.unlockedWeapons).toEqual(state.checkpoint.unlockedWeapons);
    expect(retried.unlockedWeapons).not.toContain('arc');
  });
});

describe('sequential objectives and ownership', () => {
  it('collects coolant cells only in definition order', () => {
    let state = beginCombat(createCampaign());
    state = clearStage(state);
    state = beginCombat(continueCampaign(state));
    const objective = currentObjective(state);
    if (objective.kind !== 'collect') throw new Error('collect objective expected');
    state = advanceCampaign(state, objective.points[1], 16);
    expect(state.collectIndex).toBe(0);
    state = advanceCampaign(state, objective.points[0], 16);
    expect(state.collectIndex).toBe(1);
    state = advanceCampaign(state, objective.points[2], 16);
    expect(state.collectIndex).toBe(1);
  });

  it('does not complete purge before every owned required enemy spawned and died', () => {
    let state = beginCombat(createCampaign());
    state = clearStage(state);
    state = beginCombat(continueCampaign(state));
    state = clearStage(state);
    state = beginCombat(continueCampaign(state));
    state = completeObjective(state);
    state = completeObjective(state);
    const objective = currentObjective(state);
    if (objective.kind !== 'purge') throw new Error('purge objective expected');
    const wave = wavesForPurge(currentStage(state), objective)[0];
    state = registerWaveQueued(state, wave);
    for (let index = 0; index < waveEnemyTotal(wave); index += 1) {
      state = registerEnemyKill(state, { waveId: wave.id, objectiveId: wave.objectiveId, rank: 'normal', required: true });
    }
    const next = advanceCampaign(state, currentStage(state).playerStart, 16);
    expect(currentObjective(next).id).toBe(objective.id);
    expect(next.phase).toBe('combat');
  });

  it('counts elite and Alpha kills only for their owning objective', () => {
    let state = beginCombat(createCampaign());
    state = kill(state, 'foreign', 'foreign', 'elite');
    state = advanceCampaign(state, currentStage(state).playerStart, 16);
    expect(state.objectiveIndex).toBe(0);
    expect(campaignSnapshot(state).requiredRemaining).toBe(0);
    const ownership = { waveId: 's01-test', objectiveId: 's01-relay', rank: 'elite' as const, required: true };
    state = registerEnemyKill(state, ownership);
    expect(state.huntKills['s01-relay:elite']).toBe(1);
    expect(state.huntKills['s01-relay:alpha']).toBeUndefined();
  });
});

describe('difficulty and Alpha thresholds', () => {
  it('caps health, speed, contact and spawn scaling at stage ten', () => {
    expect(stageDifficulty(0)).toMatchObject({ health: 1, speed: 1, spawnIntervalMs: 100 });
    expect(stageDifficulty(9)).toMatchObject({ health: 1.36, speed: 1.11, contactDamage: 1, spawnIntervalMs: 65 });
  });

  it('reports each Alpha summon threshold once when damage crosses it', () => {
    expect(alphaThresholdCrossings(1800, 1350, 1800)).toEqual([0]);
    expect(alphaThresholdCrossings(1350, 900, 1800)).toEqual([1]);
    expect(alphaThresholdCrossings(900, 450, 1800)).toEqual([2]);
    expect(alphaThresholdCrossings(1800, 0, 1800)).toEqual([0, 1, 2]);
    expect(alphaThresholdCrossings(1300, 1200, 1800)).toEqual([]);
  });
});
