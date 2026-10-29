import type { WeaponId } from '../../src/shared/game-types';

export const BASE_WEAPONS = ['rifle', 'shotgun', 'launcher'] as const satisfies readonly WeaponId[];
export const WEAPON_ORDER = ['rifle', 'shotgun', 'launcher', 'arc', 'rail', 'flame', 'mines'] as const satisfies readonly WeaponId[];

export interface StageExpectation {
  title: string;
  reward?: { id: WeaponId; label: string };
  exerciseWeapon?: WeaponId;
  enemyRank?: 'elite' | 'alpha';
}

export const CAMPAIGN_STAGES: readonly StageExpectation[] = [
  { title: 'Medbay: Black Dew' },
  { title: 'Cryo Labs: Cold Signal', reward: { id: 'arc', label: 'ARC-5' } },
  { title: 'Relay Spine: Crossfire', exerciseWeapon: 'arc' },
  { title: 'Waste Works: Brood Hunt', reward: { id: 'rail', label: 'Rail Lance' }, enemyRank: 'elite' },
  { title: 'Reactor Deck: Redline', exerciseWeapon: 'rail' },
  { title: 'Quarantine: Seal the Vents', reward: { id: 'flame', label: 'Flame Projector' } },
  { title: 'Nest Galleries: Burnout', exerciseWeapon: 'flame' },
  { title: 'Gravity Lift: Last Bridge', reward: { id: 'mines', label: 'Mine Layer' } },
  { title: 'Surface Causeway: No Retreat', exerciseWeapon: 'mines' },
  { title: 'Hive Core: Zero Hour', enemyRank: 'alpha' },
];

export function expectedUnlockedWeapons(stageIndex: number): WeaponId[] {
  const unlocked: WeaponId[] = [...BASE_WEAPONS];
  for (let index = 0; index < stageIndex; index += 1) {
    const reward = CAMPAIGN_STAGES[index].reward;
    if (reward) unlocked.push(reward.id);
  }
  return unlocked;
}
