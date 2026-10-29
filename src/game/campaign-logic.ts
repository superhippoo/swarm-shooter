import type {
  CampaignSnapshot,
  CampaignWaveDefinition,
  EnemyRank,
  ObjectiveDefinition,
  Point,
  StageDefinition,
  WeaponId,
} from '../shared/game-types';
import { WEAPON_ORDER } from './config';
import {
  CAMPAIGN_STAGES,
  COLLECT_RADIUS,
  STAGE_INTRO_MS,
  waveEnemyTotal,
} from './campaign';

export interface WaveOwnership {
  waveId: string;
  objectiveId: string;
  rank: EnemyRank;
  required: boolean;
}

export interface WaveProgress {
  expected: number;
  spawned: number;
  killed: number;
}

export interface CampaignCheckpoint {
  stageIndex: number;
  unlockedWeapons: WeaponId[];
  campaignElapsedMs: number;
  campaignKills: number;
  bestMultiKill: number;
}

export interface CampaignRuntime {
  phase: CampaignSnapshot['phase'];
  stageIndex: number;
  objectiveIndex: number;
  introElapsedMs: number;
  stageElapsedMs: number;
  campaignElapsedMs: number;
  objectiveElapsedMs: number;
  defenseElapsedMs: number;
  collectIndex: number;
  phaseStartDistance: number;
  stageKills: number;
  campaignKills: number;
  bestMultiKill: number;
  unlockedWeapons: WeaponId[];
  waveProgress: Record<string, WaveProgress>;
  huntKills: Record<string, number>;
  checkpoint: CampaignCheckpoint;
}

export interface CampaignObjectiveView {
  label: string;
  progress: number;
  target: number;
  worldX: number;
  worldY: number;
}

export const ALPHA_SUMMON_THRESHOLDS = [0.75, 0.5, 0.25] as const;

export function currentStage(state: CampaignRuntime): StageDefinition {
  return CAMPAIGN_STAGES[state.stageIndex];
}

export function currentObjective(state: CampaignRuntime): ObjectiveDefinition {
  return currentStage(state).objectives[state.objectiveIndex];
}

export function createCampaign(): CampaignRuntime {
  return createStageRuntime(0, {
    campaignElapsedMs: 0,
    campaignKills: 0,
    bestMultiKill: 0,
    unlockedWeapons: [...WEAPON_ORDER],
  });
}

function createStageRuntime(
  stageIndex: number,
  totals: Omit<CampaignCheckpoint, 'stageIndex'>,
): CampaignRuntime {
  const stage = CAMPAIGN_STAGES[stageIndex];
  const unlockedWeapons = [...totals.unlockedWeapons];
  return {
    phase: 'intro',
    stageIndex,
    objectiveIndex: 0,
    introElapsedMs: 0,
    stageElapsedMs: 0,
    campaignElapsedMs: totals.campaignElapsedMs,
    objectiveElapsedMs: 0,
    defenseElapsedMs: 0,
    collectIndex: 0,
    phaseStartDistance: distanceToObjective(stage.objectives[0], stage.playerStart, 0),
    stageKills: 0,
    campaignKills: totals.campaignKills,
    bestMultiKill: totals.bestMultiKill,
    unlockedWeapons,
    waveProgress: {},
    huntKills: {},
    checkpoint: {
      stageIndex,
      unlockedWeapons: [...unlockedWeapons],
      campaignElapsedMs: totals.campaignElapsedMs,
      campaignKills: totals.campaignKills,
      bestMultiKill: totals.bestMultiKill,
    },
  };
}

export function retryCampaign(state: CampaignRuntime): CampaignRuntime {
  const checkpoint = state.checkpoint;
  return createStageRuntime(checkpoint.stageIndex, {
    campaignElapsedMs: checkpoint.campaignElapsedMs,
    campaignKills: checkpoint.campaignKills,
    bestMultiKill: checkpoint.bestMultiKill,
    unlockedWeapons: checkpoint.unlockedWeapons,
  });
}

export function continueCampaign(state: CampaignRuntime): CampaignRuntime {
  if (state.phase !== 'clear') return state;
  if (state.stageIndex === CAMPAIGN_STAGES.length - 1) {
    return { ...state, phase: 'complete' };
  }
  return createStageRuntime(state.stageIndex + 1, {
    campaignElapsedMs: state.campaignElapsedMs,
    campaignKills: state.campaignKills,
    bestMultiKill: state.bestMultiKill,
    unlockedWeapons: state.unlockedWeapons,
  });
}

export function advanceCampaign(
  state: CampaignRuntime,
  player: Point,
  deltaMs: number,
  paused = false,
): CampaignRuntime {
  if (paused || state.phase === 'clear' || state.phase === 'complete') return state;
  const delta = Math.max(0, deltaMs);
  if (state.phase === 'intro') {
    const introElapsedMs = state.introElapsedMs + delta;
    return introElapsedMs >= STAGE_INTRO_MS
      ? { ...state, phase: 'combat', introElapsedMs: STAGE_INTRO_MS }
      : { ...state, introElapsedMs };
  }

  let next: CampaignRuntime = {
    ...state,
    stageElapsedMs: state.stageElapsedMs + delta,
    campaignElapsedMs: state.campaignElapsedMs + delta,
    objectiveElapsedMs: state.objectiveElapsedMs + delta,
  };
  const objective = currentObjective(next);
  if (objective.kind === 'defend' && within(player, objective.point, objective.radius)) {
    next.defenseElapsedMs += delta;
  }
  if (objective.kind === 'collect') {
    const point = objective.points[next.collectIndex];
    if (point && within(player, point, COLLECT_RADIUS)) next.collectIndex += 1;
  }
  if (!objectiveComplete(next, objective, player)) return next;

  if (next.objectiveIndex === currentStage(next).objectives.length - 1) {
    const unlock = currentStage(next).unlock;
    const unlockedWeapons = unlock && !next.unlockedWeapons.includes(unlock)
      ? [...next.unlockedWeapons, unlock]
      : next.unlockedWeapons;
    return { ...next, phase: 'clear', unlockedWeapons };
  }

  const objectiveIndex = next.objectiveIndex + 1;
  const following = currentStage(next).objectives[objectiveIndex];
  return {
    ...next,
    objectiveIndex,
    objectiveElapsedMs: 0,
    defenseElapsedMs: 0,
    collectIndex: 0,
    phaseStartDistance: distanceToObjective(following, player, 0),
  };
}

function objectiveComplete(
  state: CampaignRuntime,
  objective: ObjectiveDefinition,
  player: Point,
): boolean {
  switch (objective.kind) {
    case 'reach':
    case 'extract':
      return within(player, objective.point, objective.radius);
    case 'defend':
      return state.defenseElapsedMs >= objective.durationMs;
    case 'collect':
      return state.collectIndex >= objective.points.length;
    case 'purge': {
      const required = wavesForPurge(currentStage(state), objective).filter((wave) => wave.required);
      const total = required.reduce((sum, wave) => sum + waveEnemyTotal(wave), 0);
      if (total <= 0) return true;
      let expected = 0;
      let spawned = 0;
      let killed = 0;
      for (const wave of required) {
        const progress = state.waveProgress[wave.id];
        expected += progress?.expected ?? 0;
        spawned += progress?.spawned ?? 0;
        killed += progress?.killed ?? 0;
      }
      return expected >= total && spawned >= total && killed >= total;
    }
    case 'hunt':
      return (state.huntKills[huntKey(objective.id, objective.rank)] ?? 0) >= objective.count;
  }
}

export function registerWaveQueued(
  state: CampaignRuntime,
  wave: CampaignWaveDefinition,
): CampaignRuntime {
  const previous = state.waveProgress[wave.id] ?? { expected: 0, spawned: 0, killed: 0 };
  return {
    ...state,
    waveProgress: {
      ...state.waveProgress,
      [wave.id]: { ...previous, expected: previous.expected + waveEnemyTotal(wave) },
    },
  };
}

export function registerEnemySpawn(
  state: CampaignRuntime,
  ownership: WaveOwnership,
): CampaignRuntime {
  const previous = state.waveProgress[ownership.waveId] ?? { expected: 0, spawned: 0, killed: 0 };
  return {
    ...state,
    waveProgress: {
      ...state.waveProgress,
      [ownership.waveId]: { ...previous, spawned: previous.spawned + 1 },
    },
  };
}

export function registerEnemyKill(
  state: CampaignRuntime,
  ownership: WaveOwnership,
): CampaignRuntime {
  const previous = state.waveProgress[ownership.waveId] ?? { expected: 0, spawned: 0, killed: 0 };
  const huntKills = { ...state.huntKills };
  if (ownership.required && (ownership.rank === 'elite' || ownership.rank === 'alpha')) {
    const key = huntKey(ownership.objectiveId, ownership.rank);
    huntKills[key] = (huntKills[key] ?? 0) + 1;
  }
  return {
    ...state,
    stageKills: state.stageKills + 1,
    campaignKills: state.campaignKills + 1,
    huntKills,
    waveProgress: {
      ...state.waveProgress,
      [ownership.waveId]: { ...previous, killed: previous.killed + 1 },
    },
  };
}

export function registerMultiKill(state: CampaignRuntime, count: number): CampaignRuntime {
  return count > state.bestMultiKill ? { ...state, bestMultiKill: count } : state;
}

export function wavesForPurge(
  stage: StageDefinition,
  objective: Extract<ObjectiveDefinition, { kind: 'purge' }>,
): CampaignWaveDefinition[] {
  return stage.waves.filter((wave) =>
    wave.id === objective.waveId || wave.id.startsWith(`${objective.waveId}-`));
}

export function waveIsActiveForObjective(
  stage: StageDefinition,
  objective: ObjectiveDefinition,
  wave: CampaignWaveDefinition,
): boolean {
  if (wave.objectiveId === objective.id) return true;
  return objective.kind === 'purge' && wavesForPurge(stage, objective).includes(wave);
}

export function campaignSnapshot(state: CampaignRuntime, activeMines = 0): CampaignSnapshot {
  const stage = currentStage(state);
  const objective = currentObjective(state);
  return {
    phase: state.phase,
    stageId: stage.id,
    stageIndex: state.stageIndex,
    stageCount: CAMPAIGN_STAGES.length,
    stageTitle: stage.title,
    objectiveId: objective.id,
    objectiveIndex: state.objectiveIndex,
    objectiveKind: objective.kind,
    objectiveLabel: objective.label,
    objectiveProgress: rawObjectiveProgress(state, objective),
    objectiveTarget: rawObjectiveTarget(state, objective),
    requiredRemaining: requiredRemaining(state, objective),
    unlockedWeapons: [...state.unlockedWeapons],
    stageElapsedMs: Math.floor(state.stageElapsedMs),
    campaignElapsedMs: Math.floor(state.campaignElapsedMs),
    stageKills: state.stageKills,
    campaignKills: state.campaignKills,
    bestMultiKill: state.bestMultiKill,
    activeMines,
  };
}

export function getCampaignObjective(
  state: CampaignRuntime,
  player: Point,
): CampaignObjectiveView {
  const objective = currentObjective(state);
  const point = objectivePoint(objective, state.collectIndex) ?? player;
  let progress = rawObjectiveProgress(state, objective);
  let target = rawObjectiveTarget(state, objective);
  let label = objective.label;
  if (objective.kind === 'reach' || objective.kind === 'extract') {
    progress = travelProgress(player, objective.point, state.phaseStartDistance);
    target = 1;
  } else if (objective.kind === 'defend') {
    const remaining = Math.max(0, Math.ceil((objective.durationMs - state.defenseElapsedMs) / 1000));
    label = within(player, objective.point, objective.radius)
      ? `${objective.label} · ${remaining}초`
      : '방어 구역 복귀 · 시간 정지';
  }
  return {
    label,
    progress: target > 0 ? Math.min(1, progress / target) : 1,
    target: 1,
    worldX: point.x,
    worldY: point.y,
  };
}

export function stageDifficulty(stageIndex: number): {
  health: number;
  speed: number;
  contactDamage: number;
  spawnIntervalMs: number;
} {
  const bounded = Math.max(0, Math.min(CAMPAIGN_STAGES.length - 1, stageIndex));
  return {
    health: Math.round(Math.min(1.36, 1 + bounded * 0.04) * 100) / 100,
    speed: Math.round(Math.min(1.11, 1 + bounded * (0.11 / 9)) * 100) / 100,
    contactDamage: Math.round(Math.min(1.36, 1 + bounded * 0.04) * 100) / 100,
    spawnIntervalMs: 100 - bounded * (35 / 9),
  };
}

export function alphaThresholdCrossings(
  previousHealth: number,
  currentHealth: number,
  maxHealth: number,
): number[] {
  if (maxHealth <= 0) return [];
  const crossed: number[] = [];
  ALPHA_SUMMON_THRESHOLDS.forEach((ratio, index) => {
    const threshold = maxHealth * ratio;
    if (previousHealth > threshold && currentHealth <= threshold) crossed.push(index);
  });
  return crossed;
}

function rawObjectiveProgress(state: CampaignRuntime, objective: ObjectiveDefinition): number {
  switch (objective.kind) {
    case 'reach':
    case 'extract':
      return state.phase === 'clear' || state.phase === 'complete' ? 1 : 0;
    case 'defend':
      return Math.min(objective.durationMs, state.defenseElapsedMs);
    case 'collect':
      return Math.min(objective.points.length, state.collectIndex);
    case 'purge': {
      const waves = wavesForPurge(currentStage(state), objective);
      const killed = waves.reduce((sum, wave) => sum + (state.waveProgress[wave.id]?.killed ?? 0), 0);
      return Math.min(rawObjectiveTarget(state, objective), killed);
    }
    case 'hunt':
      return Math.min(objective.count, state.huntKills[huntKey(objective.id, objective.rank)] ?? 0);
  }
}

function rawObjectiveTarget(state: CampaignRuntime, objective: ObjectiveDefinition): number {
  switch (objective.kind) {
    case 'reach':
    case 'extract':
      return 1;
    case 'defend':
      return objective.durationMs;
    case 'collect':
      return objective.points.length;
    case 'purge':
      return wavesForPurge(currentStage(state), objective)
        .filter((wave) => wave.required)
        .reduce((sum, wave) => sum + waveEnemyTotal(wave), 0);
    case 'hunt':
      return objective.count;
  }
}

function requiredRemaining(state: CampaignRuntime, objective: ObjectiveDefinition): number {
  if (objective.kind === 'purge') {
    return Math.max(0, rawObjectiveTarget(state, objective) - rawObjectiveProgress(state, objective));
  }
  if (objective.kind === 'hunt') {
    return Math.max(0, objective.count - rawObjectiveProgress(state, objective));
  }
  return 0;
}

function huntKey(objectiveId: string, rank: 'elite' | 'alpha'): string {
  return `${objectiveId}:${rank}`;
}

function objectivePoint(objective: ObjectiveDefinition, collectIndex: number): Point | null {
  switch (objective.kind) {
    case 'reach':
    case 'defend':
    case 'extract':
      return objective.point;
    case 'collect':
      return objective.points[Math.min(collectIndex, objective.points.length - 1)] ?? null;
    case 'purge':
    case 'hunt':
      return null;
  }
}

function distanceToObjective(objective: ObjectiveDefinition, player: Point, collectIndex: number): number {
  const point = objectivePoint(objective, collectIndex);
  return point ? Math.hypot(player.x - point.x, player.y - point.y) : 0;
}

function travelProgress(player: Point, objective: Point, startDistance: number): number {
  if (startDistance <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - Math.hypot(player.x - objective.x, player.y - objective.y) / startDistance));
}

function within(a: Point, b: Point, radius: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= radius * radius;
}
