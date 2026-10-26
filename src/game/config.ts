import type {
  CharacterDefinition,
  CharacterId,
  EnemyDefinition,
  WeaponDefinition,
} from '../shared/game-types';

export const WORLD = {
  width: 2400,
  height: 1600,
  start: { x: 240, y: 1300 },
  infiltration: { x: 1900, y: 800 },
  extraction: { x: 240, y: 240 },
} as const;

export const MISSION = {
  interactionRadius: 96,
  extractionRadius: 82,
  defenseDurationMs: 20_000,
} as const;

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  scout: {
    id: 'scout',
    name: 'SCOUT',
    description: '빠른 기동과 짧은 재장전 시간으로 교란에 특화된 척후병',
    maxHealth: 100,
    speed: 275,
    reloadMultiplier: 0.85,
    reserveAmmoMultiplier: 1,
  },
  heavy: {
    id: 'heavy',
    name: 'HEAVY',
    description: '높은 체구와 추가 탄약을 갖춘 대신 이동이 느린 돌파병',
    maxHealth: 170,
    speed: 190,
    reloadMultiplier: 1.15,
    reserveAmmoMultiplier: 1.5,
  },
};

export const RIFLE: WeaponDefinition = {
  id: 'rifle',
  name: 'VX-7 자동 소총',
  magazineSize: 30,
  reserveAmmo: 120,
  fireIntervalMs: 105,
  reloadMs: 1450,
  damage: 34,
  projectileSpeed: 980,
  range: 760,
  pellets: 1,
  spreadRadians: 0.018,
  knockback: 155,
  shake: 0.0014,
  automatic: true,
};

export const SWARMER: EnemyDefinition = {
  id: 'swarmer',
  name: '스워머',
  maxHealth: 60,
  speed: 92,
  contactDamage: 9,
  radius: 15,
  score: 100,
};

export const LIMITS = {
  enemies: 40,
  activeEnemies: 34,
  projectiles: 72,
  particles: 140,
  corpses: 24,
} as const;

export const COMBAT = {
  initialEnemies: 9,
  spawnIntervalMs: 1150,
  defendSpawnIntervalMs: 650,
  enemyContactCooldownMs: 850,
  playerInvulnerabilityMs: 260,
} as const;

export const TEXTURES = {
  characters: {
    scout: 'generated-character-scout',
    heavy: 'generated-character-heavy',
  },
  swarmer: 'generated-enemy-swarmer',
  rifleBullet: 'generated-projectile-rifle',
  bulletTrail: 'generated-projectile-trail',
  muzzle: 'generated-muzzle-flash',
  particle: 'generated-hit-particle',
  corpse: 'generated-death-trace',
  crosshair: 'generated-crosshair',
  collider: 'generated-collider',
} as const;

export interface ObstacleDefinition {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'bed' | 'wall' | 'console' | 'reactor';
}

export const OBSTACLES: ObstacleDefinition[] = [
  { x: 150, y: 1135, width: 150, height: 72, kind: 'bed' },
  { x: 410, y: 1135, width: 150, height: 72, kind: 'bed' },
  { x: 150, y: 1470, width: 150, height: 72, kind: 'bed' },
  { x: 410, y: 1470, width: 150, height: 72, kind: 'bed' },
  { x: 900, y: 1220, width: 290, height: 86, kind: 'console' },
  { x: 1110, y: 600, width: 460, height: 48, kind: 'wall' },
  { x: 1590, y: 410, width: 48, height: 350, kind: 'wall' },
  { x: 1900, y: 800, width: 76, height: 76, kind: 'reactor' },
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
