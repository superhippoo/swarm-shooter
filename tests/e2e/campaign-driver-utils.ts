import type { GameSnapshot, WeaponId } from '../../src/shared/game-types';
import { WEAPON_ORDER } from './campaign-data';

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function weaponState(state: GameSnapshot, id: WeaponId | null) {
  return state.weapons.find((weapon) => weapon.id === id);
}

export function hasAmmo(state: GameSnapshot, id: WeaponId): boolean {
  const weapon = weaponState(state, id);
  return Boolean(weapon && weapon.magazine + weapon.reserve > 0);
}

export function clampWorldPoint(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.max(45, Math.min(2355, point.x)),
    y: Math.max(45, Math.min(1555, point.y)),
  };
}

export function unlockedWeaponOrder(state: GameSnapshot): WeaponId[] {
  const unlocked = state.campaign?.unlockedWeapons ?? [];
  return WEAPON_ORDER.filter((id) => unlocked.includes(id));
}

export function summarizeState(state: GameSnapshot) {
  return {
    screen: state.screen,
    runId: state.runId,
    tick: state.tick,
    player: state.player,
    input: state.input,
    selectedWeapon: state.selectedWeapon,
    weapons: state.weapons,
    mission: state.mission,
    campaign: state.campaign,
    supplies: state.supplies.map((supply) => ({ ...supply })),
    performance: state.performance,
    enemies: state.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      rank: enemy.rank ?? 'normal',
      x: Math.round(enemy.x),
      y: Math.round(enemy.y),
      health: Math.round(enemy.health),
    })),
  };
}
