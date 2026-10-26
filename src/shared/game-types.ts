export type CharacterId = 'scout' | 'heavy';
export type WeaponId = 'rifle' | 'shotgun' | 'launcher';
export type EnemyId = 'swarmer' | 'skitter' | 'brute';
export type GameScreen = 'menu' | 'playing' | 'paused' | 'victory' | 'dead';
export type MissionPhase = 'infiltrate' | 'defend' | 'extract' | 'complete';

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
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  health: number;
}

export interface GameSnapshot {
  screen: GameScreen;
  characterId: CharacterId | null;
  tick: number;
  runId: number;
  player: {
    x: number;
    y: number;
    health: number;
    maxHealth: number;
  };
  selectedWeapon: WeaponId | null;
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
