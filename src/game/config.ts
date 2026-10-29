import type {
  CharacterDefinition,
  CharacterId,
  EnemyDefinition,
  EnemyId,
  MissionPhase,
  WeaponDefinition,
  WeaponId,
} from '../shared/game-types';

export const WORLD = {
  width: 2400,
  height: 1600,
  start: { x: 240, y: 1300 },
  infiltration: { x: 1900, y: 800 },
  extraction: { x: 240, y: 240 },
} as const;

export const MISSION = {
  interactionRadius: 90,
  extractionRadius: 90,
  defenseDurationMs: 25_000,
  defenseZoneRadius: 300,
} as const;

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  scout: {
    id: 'scout',
    name: '윤하',
    description: '빠른 재배치와 짧은 재장전으로 거리를 유지하는 척후병',
    maxHealth: 400,
    speed: 245,
    reloadMultiplier: 0.85,
    reserveAmmoMultiplier: 1,
  },
  heavy: {
    id: 'heavy',
    name: '브런',
    description: '느리지만 높은 생명력과 넉넉한 예비 탄약으로 전선을 유지하는 돌파병',
    maxHealth: 520,
    speed: 180,
    reloadMultiplier: 1.1,
    reserveAmmoMultiplier: 1.25,
  },
};

export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  rifle: {
    id: 'rifle',
    name: 'RS-7 바늘',
    magazineSize: 30,
    reserveAmmo: 180,
    fireIntervalMs: 110,
    reloadMs: 1400,
    damage: 24,
    projectileSpeed: 1150,
    range: 850,
    pellets: 1,
    spreadRadians: 0.035,
    knockback: 44,
    shake: 0.001,
    automatic: true,
  },
  shotgun: {
    id: 'shotgun',
    name: 'SG-4 파편',
    magazineSize: 6,
    reserveAmmo: 36,
    fireIntervalMs: 760,
    reloadMs: 1800,
    damage: 14,
    projectileSpeed: 950,
    range: 430,
    pellets: 8,
    spreadRadians: 0.24,
    knockback: 180,
    shake: 0.0038,
    automatic: false,
  },
  launcher: {
    id: 'launcher',
    name: 'GL-2 공명',
    magazineSize: 3,
    reserveAmmo: 16,
    fireIntervalMs: 950,
    reloadMs: 2200,
    damage: 105,
    projectileSpeed: 560,
    range: 820,
    pellets: 1,
    spreadRadians: 0,
    knockback: 260,
    shake: 0.006,
    automatic: false,
    explosionRadius: 120,
  },
  arc: {
    id: 'arc',
    name: 'ARC-5 체인',
    magazineSize: 12,
    reserveAmmo: 60,
    fireIntervalMs: 350,
    reloadMs: 1700,
    damage: 46,
    projectileSpeed: 0,
    range: 720,
    pellets: 1,
    spreadRadians: 0.5,
    knockback: 55,
    shake: 0.002,
    automatic: false,
    behavior: 'chain',
  },
  rail: {
    id: 'rail',
    name: 'Rail Lance',
    magazineSize: 4,
    reserveAmmo: 16,
    fireIntervalMs: 1050,
    reloadMs: 2300,
    damage: 180,
    projectileSpeed: 0,
    range: 1100,
    pellets: 1,
    spreadRadians: 0,
    knockback: 210,
    shake: 0.005,
    automatic: false,
    behavior: 'rail',
  },
  flame: {
    id: 'flame',
    name: 'Flame Projector',
    magazineSize: 80,
    reserveAmmo: 240,
    fireIntervalMs: 80,
    reloadMs: 2100,
    damage: 10,
    projectileSpeed: 0,
    range: 300,
    pellets: 1,
    spreadRadians: 0.75,
    knockback: 8,
    shake: 0.0006,
    automatic: true,
    behavior: 'cone',
  },
  mines: {
    id: 'mines',
    name: 'MX-8 Mine Layer',
    magazineSize: 4,
    reserveAmmo: 16,
    fireIntervalMs: 400,
    reloadMs: 2000,
    damage: 170,
    projectileSpeed: 0,
    range: 150,
    pellets: 1,
    spreadRadians: 0,
    knockback: 230,
    shake: 0.003,
    automatic: false,
    explosionRadius: 150,
    behavior: 'mine',
  },
};

export const WEAPON_ORDER = ['rifle', 'shotgun', 'launcher'] as const satisfies readonly WeaponId[];
export const CAMPAIGN_WEAPON_ORDER = [
  'rifle', 'shotgun', 'launcher', 'arc', 'rail', 'flame', 'mines',
] as const satisfies readonly WeaponId[];
export const RIFLE = WEAPONS.rifle;
export const SHOTGUN = WEAPONS.shotgun;
export const LAUNCHER = WEAPONS.launcher;

export const ENEMIES: Record<EnemyId, EnemyDefinition> = {
  swarmer: {
    id: 'swarmer',
    name: '쇄도충',
    maxHealth: 30,
    speed: 115,
    contactDamage: 5,
    radius: 13,
    score: 10,
  },
  skitter: {
    id: 'skitter',
    name: '잔상충',
    maxHealth: 55,
    speed: 200,
    contactDamage: 8,
    radius: 11,
    score: 25,
  },
  brute: {
    id: 'brute',
    name: '철갑충',
    maxHealth: 330,
    speed: 70,
    contactDamage: 16,
    radius: 29,
    score: 120,
  },
};

export const LIMITS = {
  enemies: 72,
  projectiles: 192,
  particles: 384,
  corpses: 40,
  supplies: 8,
  audioVoices: 12,
  spawnQueue: 256,
  mines: 8,
  beamEffects: 32,
  objectivePickups: 8,
} as const;

export const COMBAT = {
  enemyContactCooldownMs: 850,
  playerInvulnerabilityMs: 1000,
  spawnWarningMs: 300,
  spawnEmissionMs: 100,
  aiIntervalMs: 100,
  emergencyDelayMs: 1500,
  emergencyCooldownMs: 6000,
  emergencyRifleAmmo: 24,
  supplyPickupRadius: 44,
  supplyHealth: 45,
  spatialCellSize: 128,
} as const;

export type WavePhase = Exclude<MissionPhase, 'complete'>;

export interface WaveDefinition {
  id: string;
  phase: WavePhase;
  at: number;
  counts: Record<EnemyId, number>;
}

export const WAVES: WaveDefinition[] = [
  { id: 'I-0', phase: 'infiltrate', at: 0, counts: { swarmer: 8, skitter: 0, brute: 0 } },
  { id: 'I-1', phase: 'infiltrate', at: 700, counts: { swarmer: 10, skitter: 2, brute: 0 } },
  { id: 'I-2', phase: 'infiltrate', at: 1200, counts: { swarmer: 12, skitter: 3, brute: 0 } },
  { id: 'I-3', phase: 'infiltrate', at: 1650, counts: { swarmer: 12, skitter: 4, brute: 1 } },
  { id: 'D-0', phase: 'defend', at: 0, counts: { swarmer: 10, skitter: 2, brute: 0 } },
  { id: 'D-1', phase: 'defend', at: 4000, counts: { swarmer: 12, skitter: 3, brute: 0 } },
  { id: 'D-2', phase: 'defend', at: 8000, counts: { swarmer: 12, skitter: 4, brute: 1 } },
  { id: 'D-3', phase: 'defend', at: 13_000, counts: { swarmer: 14, skitter: 4, brute: 1 } },
  { id: 'D-4', phase: 'defend', at: 18_000, counts: { swarmer: 16, skitter: 5, brute: 1 } },
  { id: 'D-5', phase: 'defend', at: 22_000, counts: { swarmer: 12, skitter: 4, brute: 1 } },
  { id: 'X-0', phase: 'extract', at: 0, counts: { swarmer: 8, skitter: 4, brute: 1 } },
  { id: 'X-1', phase: 'extract', at: 6000, counts: { swarmer: 10, skitter: 2, brute: 0 } },
  { id: 'X-2', phase: 'extract', at: 12_000, counts: { swarmer: 10, skitter: 3, brute: 0 } },
  { id: 'X-3', phase: 'extract', at: 18_000, counts: { swarmer: 12, skitter: 3, brute: 1 } },
];

export type SupplyAvailability = 'start' | 'defend' | 'defendHalf' | 'extract';

export interface SupplyDefinition {
  x: number;
  y: number;
  availability: SupplyAvailability;
}

export const SUPPLIES: SupplyDefinition[] = [
  { x: 1050, y: 1080, availability: 'start' },
  { x: 1810, y: 900, availability: 'defend' },
  { x: 1990, y: 690, availability: 'defendHalf' },
  { x: 1710, y: 650, availability: 'extract' },
  { x: 620, y: 390, availability: 'extract' },
];

export const TEXTURES = {
  characters: {
    scout: 'operative-scout',
    heavy: 'operative-heavy',
  },
  enemies: {
    swarmer: 'enemy-swarmer',
    skitter: 'enemy-skitter',
    brute: 'enemy-brute',
    elite: 'enemy-brute-elite',
    alpha: 'enemy-brute-alpha',
  },
  projectiles: {
    rifle: 'projectile-rifle',
    shotgun: 'projectile-shotgun',
    launcher: 'projectile-launcher',
    arc: 'effect-chain',
    rail: 'effect-rail',
    flame: 'effect-flame',
    mines: 'object-mine',
  },
  campaign: {
    chain: 'effect-chain',
    rail: 'effect-rail',
    flame: 'effect-flame',
    mine: 'object-mine',
    coolant: 'object-coolant',
    fuse: 'object-fuse',
  },
  bulletTrail: 'effect-projectile-trail',
  muzzle: 'effect-muzzle-flash',
  particle: 'effect-hit-particle',
  explosion: 'effect-explosion-ring',
  corpse: 'effect-death-trace',
  crosshair: 'ui-crosshair',
  collider: 'collision-marker',
  supply: 'object-supply',
  spawnWarning: 'effect-spawn-warning',
  objectiveArrow: 'ui-objective-arrow',
  environment: {
    floor: 'facility-floor',
    bed: 'facility-bed',
    console: 'facility-console',
    wall: 'facility-wall',
    vent: 'facility-vent',
    pipe: 'facility-pipe',
    elevator: 'facility-elevator',
    relay: 'facility-relay',
    decal: 'facility-decal',
  },
} as const;

export interface ObstacleDefinition {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'bed' | 'wall' | 'console';
}

export const OBSTACLES: ObstacleDefinition[] = [
  { x: 150, y: 1135, width: 150, height: 72, kind: 'bed' },
  { x: 410, y: 1135, width: 150, height: 72, kind: 'bed' },
  { x: 150, y: 1470, width: 150, height: 72, kind: 'bed' },
  { x: 410, y: 1470, width: 150, height: 72, kind: 'bed' },
  { x: 900, y: 1220, width: 290, height: 86, kind: 'console' },
  { x: 1300, y: 600, width: 200, height: 48, kind: 'wall' },
  { x: 1590, y: 410, width: 48, height: 350, kind: 'wall' },
  { x: 2070, y: 1140, width: 170, height: 76, kind: 'console' },
  { x: 660, y: 320, width: 250, height: 72, kind: 'console' },
];

export const SPAWN_POINTS = [
  { x: 650, y: 1300 },
  { x: 840, y: 950 },
  { x: 1280, y: 1390 },
  { x: 1580, y: 1080 },
  { x: 1930, y: 1330 },
  { x: 2190, y: 850 },
  { x: 1830, y: 580 },
  { x: 1320, y: 850 },
  { x: 820, y: 650 },
  { x: 420, y: 390 },
  { x: 2140, y: 250 },
  { x: 1120, y: 260 },
] as const;
