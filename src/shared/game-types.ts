export type CharacterId = 'scout' | 'heavy';
export type WeaponId = 'rifle' | 'shotgun' | 'launcher' | 'arc' | 'rail' | 'flame' | 'mines';
export type EnemyId = 'swarmer' | 'skitter' | 'brute';
export type EnemyRank = 'normal' | 'elite' | 'alpha';
export type GameScreen = 'menu' | 'stageIntro' | 'playing' | 'paused' | 'stageClear' | 'victory' | 'dead';
export type MissionPhase = 'infiltrate' | 'defend' | 'extract' | 'complete';
export type ObjectiveKind = 'reach' | 'defend' | 'collect' | 'purge' | 'hunt' | 'extract';
export type LayoutId = 'medbay' | 'reactor' | 'hive';

export interface Point {
  x: number;
  y: number;
}

interface ObjectiveBase {
  id: string;
  label: string;
}

export type ObjectiveDefinition =
  | (ObjectiveBase & { kind: 'reach'; point: Point; radius: number })
  | (ObjectiveBase & { kind: 'defend'; point: Point; radius: number; durationMs: number })
  | (ObjectiveBase & { kind: 'collect'; points: Point[] })
  | (ObjectiveBase & { kind: 'purge'; waveId: string })
  | (ObjectiveBase & { kind: 'hunt'; rank: 'elite' | 'alpha'; count: number })
  | (ObjectiveBase & { kind: 'extract'; point: Point; radius: number });

export interface CampaignWaveDefinition {
  id: string;
  objectiveId: string;
  atMs: number;
  counts: Record<EnemyId, number>;
  required: boolean;
  direction: 'forward' | 'rear' | 'both' | null;
  eliteCount?: number;
  alphaCount?: number;
}

export interface CampaignSupplyDefinition extends Point {
  atMs: number;
}

export interface StageDefinition {
  id: string;
  title: string;
  layoutId: LayoutId;
  playerStart: Point;
  maxAlive: number;
  objectives: ObjectiveDefinition[];
  waves: CampaignWaveDefinition[];
  supplies: CampaignSupplyDefinition[];
  unlock?: WeaponId;
}

export interface CampaignSnapshot {
  phase: 'intro' | 'combat' | 'clear' | 'complete';
  stageId: string;
  stageIndex: number;
  stageCount: number;
  stageTitle: string;
  objectiveId: string;
  objectiveIndex: number;
  objectiveKind: ObjectiveKind;
  objectiveLabel: string;
  objectiveProgress: number;
  objectiveTarget: number;
  requiredRemaining: number;
  unlockedWeapons: WeaponId[];
  stageElapsedMs: number;
  campaignElapsedMs: number;
  stageKills: number;
  campaignKills: number;
  bestMultiKill: number;
  activeMines: number;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  description: string;
  maxHealth: number;
  speed: number;
  reloadMultiplier: number;
  reserveAmmoMultiplier: number;
}

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  magazineSize: number;
  reserveAmmo: number;
  fireIntervalMs: number;
  reloadMs: number;
  damage: number;
  projectileSpeed: number;
  range: number;
  pellets: number;
  spreadRadians: number;
  knockback: number;
  shake: number;
  automatic: boolean;
  explosionRadius?: number;
  behavior?: 'chain' | 'rail' | 'cone' | 'mine';
}

export interface EnemyDefinition {
  id: EnemyId;
  name: string;
  maxHealth: number;
  speed: number;
  contactDamage: number;
  radius: number;
  score: number;
}

export interface WeaponSnapshot {
  id: WeaponId;
  magazine: number;
  reserve: number;
  reloading: boolean;
}

export interface EnemySnapshot {
  id: number;
  type: EnemyId;
  rank?: EnemyRank;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  health: number;
}

export interface SupplySnapshot {
  x: number;
  y: number;
  unlocked: boolean;
  active: boolean;
}

export interface GameSnapshot {
  screen: GameScreen;
  characterId: CharacterId | null;
  tick: number;
  runId: number;
  input: {
    mode: 'desktop' | 'touch';
    moveX: number;
    moveY: number;
    firing: boolean;
    autoAimTargetId: number | null;
  };
  player: {
    x: number;
    y: number;
    health: number;
    maxHealth: number;
  };
  selectedWeapon: WeaponId | null;
  visual: {
    pose: 'idle' | 'a' | 'b';
    weapon: WeaponId | null;
    shots: number;
    muzzle: { x: number; y: number };
  };
  weapons: WeaponSnapshot[];
  mission: {
    phase: MissionPhase | null;
    label: string;
    progress: number;
    target: number;
    worldX: number;
    worldY: number;
    screenX: number;
    screenY: number;
  };
  campaign: CampaignSnapshot | null;
  supplies: SupplySnapshot[];
  enemies: EnemySnapshot[];
  performance: {
    fps: number;
    activeEnemies: number;
    activeProjectiles: number;
    activeParticles: number;
  };
}

declare global {
  interface Window {
    swarmDiagnostics?: () => Readonly<GameSnapshot>;
  }
}
