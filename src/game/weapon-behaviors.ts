import type { Point } from '../shared/game-types';
import { segmentCircleTime, segmentRectangleTime } from './logic';

export interface CombatTarget extends Point {
  id: number;
  radius: number;
}

export interface BallisticObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RailHit<T extends CombatTarget> {
  target: T;
  time: number;
  x: number;
  y: number;
}

export interface RailTrajectory<T extends CombatTarget> {
  hits: RailHit<T>[];
  end: Point;
}

export interface MineState extends Point {
  id: number;
  placedAt: number;
  armedAt: number;
}

export interface MinePlacement {
  mines: MineState[];
  detonated: MineState | null;
}

export interface MineUpdate {
  mines: MineState[];
  detonated: MineState[];
}

export interface TimedEffectState {
  active: boolean;
  remainingMs: number;
}

export function selectChainTargets<T extends CombatTarget>(
  origin: Point,
  primary: T,
  candidates: readonly T[],
  obstacles: readonly BallisticObstacle[],
  maxTargets = 5,
  jumpRange = 180,
): T[] {
  if (maxTargets <= 0 || hasLineOfSight(origin, primary, obstacles) === false) return [];
  const selected = [primary];
  const visited = new Set<number>([primary.id]);
  while (selected.length < maxTargets) {
    const previous = selected[selected.length - 1];
    let next: T | null = null;
    let nextDistance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      if (visited.has(candidate.id)) continue;
      const distance = Math.hypot(candidate.x - previous.x, candidate.y - previous.y);
      if (distance > jumpRange) continue;
      if (distance > nextDistance || (distance === nextDistance && next && candidate.id > next.id)) continue;
      if (!hasLineOfSight(previous, candidate, obstacles)) continue;
      next = candidate;
      nextDistance = distance;
    }
    if (!next) break;
    selected.push(next);
    visited.add(next.id);
  }
  return selected;
}

export function chainDamage(baseDamage: number, jumpIndex: number): number {
  return baseDamage * Math.pow(0.75, Math.max(0, jumpIndex));
}

export function railTrajectory<T extends CombatTarget>(
  origin: Point,
  angle: number,
  range: number,
  candidates: readonly T[],
  obstacles: readonly BallisticObstacle[],
  maxTargets = 8,
): RailTrajectory<T> {
  const length = Math.max(0, range);
  const fullEnd = {
    x: origin.x + Math.cos(angle) * length,
    y: origin.y + Math.sin(angle) * length,
  };
  let obstacleTime = 1;
  for (const obstacle of obstacles) {
    const time = obstacleIntersection(origin, fullEnd, obstacle);
    if (time !== null) obstacleTime = Math.min(obstacleTime, time);
  }
  const end = {
    x: origin.x + (fullEnd.x - origin.x) * obstacleTime,
    y: origin.y + (fullEnd.y - origin.y) * obstacleTime,
  };
  const hits: RailHit<T>[] = [];
  for (const target of candidates) {
    const time = segmentCircleTime(
      origin.x, origin.y, end.x, end.y,
      target.x, target.y, target.radius,
    );
    if (time === null) continue;
    hits.push({
      target,
      time,
      x: origin.x + (end.x - origin.x) * time,
      y: origin.y + (end.y - origin.y) * time,
    });
  }
  hits.sort((a, b) => a.time - b.time || a.target.id - b.target.id);
  return { hits: hits.slice(0, Math.max(0, maxTargets)), end };
}

export function coneTargets<T extends CombatTarget>(
  origin: Point,
  angle: number,
  range: number,
  arcRadians: number,
  candidates: readonly T[],
  obstacles: readonly BallisticObstacle[],
): T[] {
  const halfArc = Math.max(0, arcRadians) / 2;
  return candidates
    .filter((target) => {
      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const distance = Math.hypot(dx, dy);
      if (distance > range) return false;
      if (distance > 0.0001 && Math.abs(angleDifference(Math.atan2(dy, dx), angle)) > halfArc) return false;
      return hasLineOfSight(origin, target, obstacles);
    })
    .sort((a, b) => {
      const aDistance = Math.hypot(a.x - origin.x, a.y - origin.y);
      const bDistance = Math.hypot(b.x - origin.x, b.y - origin.y);
      return aDistance - bDistance || a.id - b.id;
    });
}

export function createMine(id: number, point: Point, nowMs: number): MineState {
  return { id, x: point.x, y: point.y, placedAt: nowMs, armedAt: nowMs + 400 };
}

export function placeMine(
  mines: readonly MineState[],
  mine: MineState,
  limit = 8,
): MinePlacement {
  const active = [...mines];
  let detonated: MineState | null = null;
  const boundedLimit = Math.max(1, limit);
  while (active.length >= boundedLimit) {
    let oldestIndex = 0;
    for (let index = 1; index < active.length; index += 1) {
      if (active[index].placedAt < active[oldestIndex].placedAt ||
        (active[index].placedAt === active[oldestIndex].placedAt && active[index].id < active[oldestIndex].id)) {
        oldestIndex = index;
      }
    }
    const [oldest] = active.splice(oldestIndex, 1);
    if (!detonated) detonated = oldest;
  }
  active.push(mine);
  return { mines: active, detonated };
}

export function updateMines<T extends CombatTarget>(
  mines: readonly MineState[],
  nowMs: number,
  targets: readonly T[],
  triggerRadius = 90,
): MineUpdate {
  const detonated: MineState[] = [];
  const remaining: MineState[] = [];
  for (const mine of mines) {
    const triggered = nowMs >= mine.armedAt && targets.some((target) =>
      Math.hypot(target.x - mine.x, target.y - mine.y) <= triggerRadius + target.radius);
    if (triggered) detonated.push(mine);
    else remaining.push(mine);
  }
  return { mines: remaining, detonated };
}

export function mineExplosionTargets<T extends CombatTarget>(
  mine: Point,
  candidates: readonly T[],
  radius = 150,
): T[] {
  return candidates.filter((target) =>
    Math.hypot(target.x - mine.x, target.y - mine.y) <= radius + target.radius);
}

export function updateTimedEffectPool<T extends TimedEffectState>(pool: T[], deltaMs: number): void {
  const delta = Math.max(0, deltaMs);
  for (const effect of pool) {
    if (!effect.active) continue;
    effect.remainingMs -= delta;
    if (effect.remainingMs <= 0) {
      effect.active = false;
      effect.remainingMs = 0;
    }
  }
}

export function hasLineOfSight(
  origin: Point,
  target: Point,
  obstacles: readonly BallisticObstacle[],
): boolean {
  return !obstacles.some((obstacle) => obstacleIntersection(origin, target, obstacle) !== null);
}

function obstacleIntersection(origin: Point, end: Point, obstacle: BallisticObstacle): number | null {
  return segmentRectangleTime(
    origin.x, origin.y, end.x, end.y,
    obstacle.x - obstacle.width / 2,
    obstacle.y - obstacle.height / 2,
    obstacle.x + obstacle.width / 2,
    obstacle.y + obstacle.height / 2,
  );
}

function angleDifference(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
