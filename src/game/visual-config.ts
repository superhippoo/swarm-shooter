import type { CharacterId, EnemyId, WeaponId } from '../shared/game-types';

export const OPERATIVE_VISUALS = {
  scout: { size: 62, frameMs: 135, muzzleOffset: 0 },
  heavy: { size: 76, frameMs: 165, muzzleOffset: 3 },
} as const satisfies Record<CharacterId, { size: number; frameMs: number; muzzleOffset: number }>;

export const WEAPON_VISUALS = {
  rifle: { texture: 'weapon-rifle', width: 60, height: 30, centerX: 16, muzzle: 39, recoil: 2.2 },
  shotgun: { texture: 'weapon-shotgun', width: 64, height: 32, centerX: 16, muzzle: 41, recoil: 5 },
  launcher: { texture: 'weapon-launcher', width: 68, height: 34, centerX: 17, muzzle: 46, recoil: 6 },
  arc: { texture: 'weapon-arc', width: 66, height: 33, centerX: 16, muzzle: 45, recoil: 3.2 },
  rail: { texture: 'weapon-rail', width: 76, height: 38, centerX: 18, muzzle: 54, recoil: 7.5 },
  flame: { texture: 'weapon-flame', width: 68, height: 34, centerX: 17, muzzle: 46, recoil: 1.1 },
  mines: { texture: 'weapon-mines', width: 60, height: 30, centerX: 15, muzzle: 37, recoil: 4.2 },
} as const satisfies Record<WeaponId, {
  texture: string;
  width: number;
  height: number;
  centerX: number;
  muzzle: number;
  recoil: number;
}>;

export const CAMPAIGN_TEXTURES = {
  enemies: {
    elite: 'enemy-brute-elite',
    eliteStep: 'enemy-brute-elite-step',
    alpha: 'enemy-brute-alpha',
    alphaStep: 'enemy-brute-alpha-step',
  },
  effects: {
    chain: 'effect-chain',
    rail: 'effect-rail',
    flame: 'effect-flame',
    mine: 'object-mine',
    coolant: 'object-coolant-cell',
    fuse: 'object-fuse',
  },
  decals: {
    medbay: 'facility-decal-medbay',
    reactor: 'facility-decal-reactor',
    hive: 'facility-decal-hive',
  },
} as const;

export const ENEMY_ANIMATION: Record<EnemyId, { size: number; frameMs: number }> = {
  swarmer: { size: 44, frameMs: 145 },
  skitter: { size: 52, frameMs: 100 },
  brute: { size: 86, frameMs: 235 },
};

export function enemyStepTexture(id: EnemyId): string {
  return `enemy-${id}-step`;
}
