import { expect, type Page } from '@playwright/test';
import type { CharacterId, GameSnapshot, WeaponId } from '../../src/shared/game-types';
import { CAMPAIGN_STAGES as CAMPAIGN_STAGE_DEFINITIONS } from '../../src/game/campaign';
import { capturePage, writeJsonArtifact } from './artifacts';
import { CAMPAIGN_STAGES, expectedUnlockedWeapons } from './campaign-data';
import { clampWorldPoint, distance, hasAmmo, summarizeState, weaponState } from './campaign-driver-utils';
import { nearestEnemy, snapshot, waitForScreen, type CombatDriver } from './game-driver';

type Point = { x: number; y: number };
export type MissionDriverFactory = (page: Page) => CombatDriver;

export interface WeaponEvidence {
  shots: number;
  hitEvents: number;
  targetsHit: number;
  maxTargetsPerEvent: number;
  mineBlasts: number;
}

export interface StageReport {
  stageIndex: number;
  stageId: string;
  title: string;
  combatDurationMs: number;
  stageElapsedMs: number;
  stageKills: number;
  campaignKills: number;
  health: number;
  unlockedWeapons: WeaponId[];
  observedRanks: string[];
  maxEnemies: number;
  maxProjectiles: number;
  maxParticles: number;
  maxMines: number;
  weaponEvidence: Record<string, WeaponEvidence>;
}

export interface CampaignResult {
  character: CharacterId;
  inputMode: 'touch' | 'keyboard-mouse';
  durationMs: number;
  campaignElapsedMs: number;
  campaignKills: number;
  bestMultiKill: number;
  finalHealth: number;
  stages: StageReport[];
  pageErrors: string[];
}

export interface CampaignRunOptions {
  stageTimeLimitMs?: number;
  campaignTimeLimitMs?: number;
  shouldFire?: (state: GameSnapshot) => boolean;
  onCombatSnapshot?: (state: GameSnapshot) => void | Promise<void>;
}

function emptyEvidence(): WeaponEvidence {
  return { shots: 0, hitEvents: 0, targetsHit: 0, maxTargetsPerEvent: 0, mineBlasts: 0 };
}

function evidenceFor(evidence: Map<WeaponId, WeaponEvidence>, id: WeaponId): WeaponEvidence {
  let current = evidence.get(id);
  if (!current) {
    current = emptyEvidence();
    evidence.set(id, current);
  }
  return current;
}

function changedTargetCount(before: GameSnapshot, current: GameSnapshot): number {
  if (before.screen !== 'playing' || current.screen !== 'playing') return 0;
  const previous = new Map(before.enemies.map((enemy) => [enemy.id, enemy.health]));
  const changed = new Set<number>();
  for (const enemy of current.enemies) {
    const oldHealth = previous.get(enemy.id);
    if (oldHealth !== undefined && enemy.health < oldHealth) changed.add(enemy.id);
  }
  const currentIds = new Set(current.enemies.map((enemy) => enemy.id));
  const killDelta = Math.max(0, (current.campaign?.campaignKills ?? 0) - (before.campaign?.campaignKills ?? 0));
  if (killDelta > 0) {
    for (const enemy of before.enemies) {
      if (!currentIds.has(enemy.id)) changed.add(enemy.id);
    }
  }
  return changed.size;
}

function recordWeaponEvidence(
  before: GameSnapshot,
  current: GameSnapshot,
  evidence: Map<WeaponId, WeaponEvidence>,
): void {
  const targets = changedTargetCount(before, current);
  const mineCountBefore = before.campaign?.activeMines ?? 0;
  const mineCountAfter = current.campaign?.activeMines ?? 0;
  const mineBlast = mineCountAfter < mineCountBefore;
  const selected = current.visual.weapon ?? before.visual.weapon;
  if (selected) {
    const entry = evidenceFor(evidence, selected);
    const shotDelta = Math.max(0, current.visual.shots - before.visual.shots);
    entry.shots += shotDelta;
    const activeHit = shotDelta > 0 || (selected === 'flame' && current.input.firing) || (selected === 'mines' && mineBlast);
    if (activeHit && targets > 0) {
      entry.hitEvents += 1;
      entry.targetsHit += targets;
      entry.maxTargetsPerEvent = Math.max(entry.maxTargetsPerEvent, targets);
    }
  }
  if (mineBlast) {
    const mines = evidenceFor(evidence, 'mines');
    mines.mineBlasts += mineCountBefore - mineCountAfter;
    if (targets > 0 && selected !== 'mines') {
      mines.hitEvents += 1;
      mines.targetsHit += targets;
      mines.maxTargetsPerEvent = Math.max(mines.maxTargetsPerEvent, targets);
    }
  }
}

function nearestWorldEnemy(state: GameSnapshot) {
  let selected: GameSnapshot['enemies'][number] | null = null;
  let selectedDistance = Number.POSITIVE_INFINITY;
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) continue;
    const enemyDistance = distance(state.player, enemy);
    if (enemyDistance < selectedDistance) {
      selected = enemy;
      selectedDistance = enemyDistance;
    }
  }
  return selected;
}

function targetForHunt(state: GameSnapshot) {
  const rank = CAMPAIGN_STAGES[state.campaign?.stageIndex ?? 0].enemyRank;
  if (!rank) return nearestWorldEnemy(state);
  return state.enemies.find((enemy) => enemy.rank === rank && enemy.health > 0) ?? nearestWorldEnemy(state);
}

function desiredWeapon(
  state: GameSnapshot,
  evidence: Map<WeaponId, WeaponEvidence>,
): WeaponId {
  const campaign = state.campaign!;
  const expected = CAMPAIGN_STAGES[campaign.stageIndex];
  const available = (id: WeaponId) => campaign.unlockedWeapons.includes(id) && hasAmmo(state, id);
  const nearest = nearestEnemy(state);
  const nearestDistance = nearest ? distance(nearest, state.player) : Number.POSITIVE_INFINITY;
  const nearby = state.enemies.filter((enemy) => distance(enemy, state.player) < 260).length;
  const exercise = expected.exerciseWeapon;
  if (exercise && available(exercise)) {
    const currentEvidence = evidenceFor(evidence, exercise);
    const needsMultiTarget = exercise === 'arc' || exercise === 'rail';
    const evidenceReady = currentEvidence.hitEvents > 0 && (!needsMultiTarget || currentEvidence.maxTargetsPerEvent >= 2) &&
      (exercise !== 'mines' || currentEvidence.mineBlasts > 0);
    const inRange = exercise !== 'flame' || nearestDistance < 310;
    if (!evidenceReady && inRange) return exercise;
  }

  if (campaign.objectiveKind === 'hunt') {
    if (available('rail')) return 'rail';
    if (available('launcher')) return 'launcher';
  }
  if (nearestDistance < 230 && nearby >= 2 && available('mines')) return 'mines';
  if (nearby >= 3 && available('rail')) return 'rail';
  if (nearestDistance < 230 && nearby >= 4 && available('launcher')) return 'launcher';
  if (nearby >= 2 && available('arc')) return 'arc';
  if (nearestDistance < 165 && available('shotgun')) return 'shotgun';
  for (const id of ['rifle', 'arc', 'rail', 'flame', 'launcher', 'shotgun', 'mines'] as const) {
    if (available(id)) return id;
  }
  return 'rifle';
}

interface NavigationState {
  key: string;
  sampleAt: number;
  samplePosition: Point;
  detourUntil: number;
  detourPoint: Point;
  detourSign: number;
  visitedSupplies: Set<number>;
}

function freshNavigation(state: GameSnapshot, now: number): NavigationState {
  return {
    key: '',
    sampleAt: now,
    samplePosition: { x: state.player.x, y: state.player.y },
    detourUntil: 0,
    detourPoint: { x: state.player.x, y: state.player.y },
    detourSign: 1,
    visitedSupplies: new Set<number>(),
  };
}

function retreatTarget(state: GameSnapshot): Point {
  let best = { x: state.player.x, y: state.player.y };
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < 16; index += 1) {
    const angle = (Math.PI * 2 * index) / 16;
    const candidate = clampWorldPoint({
      x: state.player.x + Math.cos(angle) * 320,
      y: state.player.y + Math.sin(angle) * 320,
    });
    let clearance = Number.POSITIVE_INFINITY;
    for (const enemy of state.enemies) {
      if (enemy.health > 0) clearance = Math.min(clearance, distance(candidate, enemy));
    }
    const centerPenalty = distance(candidate, { x: 1200, y: 800 }) * 0.04;
    const score = clearance - centerPenalty;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function movementTarget(
  state: GameSnapshot,
  nearest: ReturnType<typeof nearestEnemy>,
  navigation: NavigationState,
  now: number,
): Point {
  const campaign = state.campaign!;
  const collectionStep = campaign.objectiveKind === 'collect' ? campaign.objectiveProgress : 0;
  const key = `${campaign.stageIndex}:${campaign.objectiveIndex}:${campaign.objectiveId}:${collectionStep}`;
  if (navigation.key !== key) {
    navigation.key = key;
    navigation.sampleAt = now;
    navigation.samplePosition = { x: state.player.x, y: state.player.y };
    navigation.detourUntil = 0;
  }

  const objective = { x: state.mission.worldX, y: state.mission.worldY };
  const kind = campaign.objectiveKind;
  const stageSupplies = CAMPAIGN_STAGE_DEFINITIONS[campaign.stageIndex].supplies;
  stageSupplies.forEach((supply, index) => {
    if (distance(state.player, supply) < 52) navigation.visitedSupplies.add(index);
  });
  let supplyTarget: Point | null = null;
  if (state.player.health <= state.player.maxHealth * 0.65) {
    let nearestDistance = Number.POSITIVE_INFINITY;
    stageSupplies.forEach((supply, index) => {
      if (navigation.visitedSupplies.has(index) || campaign.stageElapsedMs < supply.atMs) return;
      const supplyDistance = distance(state.player, supply);
      if (supplyDistance < nearestDistance) {
        nearestDistance = supplyDistance;
        supplyTarget = supply;
      }
    });
  }
  if (supplyTarget && kind === 'extract' && distance(state.player, objective) <= 320) {
    supplyTarget = null;
  }
  let target: Point;
  if (supplyTarget) target = supplyTarget;
  else if (kind === 'defend') {
    const centerDistance = distance(state.player, objective);
    if (centerDistance > 145) target = objective;
    else {
      const angle = now / 1800;
      target = { x: objective.x + Math.cos(angle) * 115, y: objective.y + Math.sin(angle) * 115 };
    }
  } else if (kind === 'purge' || kind === 'hunt') {
    const nearestDistance = nearest ? distance(nearest, state.player) : Number.POSITIVE_INFINITY;
    if (nearest && nearestDistance < 240) {
      target = retreatTarget(state);
    } else if (nearest && nearestDistance > 480) target = { x: nearest.x, y: nearest.y };
    else {
      const anchor = state.mission.worldX > 0 && state.mission.worldY > 0 ? objective : state.player;
      const angle = now / 2100;
      target = { x: anchor.x + Math.cos(angle) * 125, y: anchor.y + Math.sin(angle) * 125 };
    }
  } else {
    target = objective;
  }
  target = clampWorldPoint(target);

  if (now < navigation.detourUntil) return navigation.detourPoint;
  if (now - navigation.sampleAt >= 1400) {
    const moved = distance(state.player, navigation.samplePosition);
    const remaining = distance(state.player, target);
    if (moved < 18 && remaining > 85) {
      const dx = target.x - state.player.x;
      const dy = target.y - state.player.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      navigation.detourSign *= -1;
      navigation.detourPoint = clampWorldPoint({
        x: state.player.x + (-dy / length) * 280 * navigation.detourSign + (dx / length) * 70,
        y: state.player.y + (dx / length) * 280 * navigation.detourSign + (dy / length) * 70,
      });
      navigation.detourUntil = now + 1500;
    }
    navigation.sampleAt = now;
    navigation.samplePosition = { x: state.player.x, y: state.player.y };
  }
  return now < navigation.detourUntil ? navigation.detourPoint : target;
}

function assertPoolCeilings(state: GameSnapshot): void {
  expect(state.performance.activeEnemies, '적 풀 상한').toBeLessThanOrEqual(72);
  expect(state.performance.activeProjectiles, '발사체 풀 상한').toBeLessThanOrEqual(192);
  expect(state.performance.activeParticles, '입자 풀 상한').toBeLessThanOrEqual(384);
  expect(state.campaign?.activeMines ?? 0, '지뢰 풀 상한').toBeLessThanOrEqual(8);
}

async function continueWithRealInput(page: Page, driver: CombatDriver): Promise<void> {
  const button = page.locator('#stage-continue-button');
  await expect(button).toBeVisible();
  if (driver.usesTouch) await button.tap();
  else await button.click();
}

function serializeEvidence(evidence: Map<WeaponId, WeaponEvidence>): Record<string, WeaponEvidence> {
  return Object.fromEntries([...evidence.entries()].map(([id, value]) => [id, { ...value }]));
}

export async function completeCampaign(
  page: Page,
  character: CharacterId,
  createDriver: MissionDriverFactory,
  options: CampaignRunOptions = {},
): Promise<CampaignResult> {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const driver = createDriver(page);
  const inputMode = driver.usesTouch ? 'touch' : 'keyboard-mouse';
  const stageTimeLimitMs = options.stageTimeLimitMs ?? 600_000;
  const campaignTimeLimitMs = options.campaignTimeLimitMs ?? 3_600_000;
  const startedAt = Date.now();
  const reports: StageReport[] = [];
  const recentHistory: unknown[] = [];
  let initialRunId = -1;
  let lastObserved: GameSnapshot | null = null;

  try {
    await page.goto('/');
    const characterButton = page.locator(`#select-${character}`);
    if (driver.usesTouch) await characterButton.tap();
    else await characterButton.click();
    await waitForScreen(page, 'stageIntro');
    initialRunId = (await snapshot(page)).runId;

    for (let stageIndex = 0; stageIndex < CAMPAIGN_STAGES.length; stageIndex += 1) {
      const expected = CAMPAIGN_STAGES[stageIndex];
      await waitForScreen(page, 'stageIntro');
      let state = await snapshot(page);
      expect(state.runId).toBe(initialRunId);
      expect(state.input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
      expect(state.campaign).toMatchObject({
        phase: 'intro',
        stageIndex,
        stageCount: CAMPAIGN_STAGES.length,
        stageTitle: expected.title,
        stageKills: 0,
        unlockedWeapons: expectedUnlockedWeapons(stageIndex),
        activeMines: 0,
      });
      await expect(page.locator('#stage-screen')).toBeVisible();
      await expect(page.locator('#stage-kicker')).toContainText(`STAGE ${String(stageIndex + 1).padStart(2, '0')} START`);
      await expect(page.locator('#stage-title')).toHaveText(expected.title);
      await expect(page.locator('#stage-objective')).not.toBeEmpty();
      await expect(page.locator('#stage-reward')).toBeVisible();
      if (stageIndex > 0) {
        expect(state.performance.activeEnemies, '새 단계 적 정리').toBe(0);
        expect(state.performance.activeProjectiles, '새 단계 발사체 정리').toBe(0);
      }
      const frozenIntroTime = state.campaign!.stageElapsedMs;
      await page.waitForTimeout(150);
      const introCheck = await snapshot(page);
      if (introCheck.campaign?.phase === 'intro') {
        expect(introCheck.campaign.stageElapsedMs).toBe(frozenIntroTime);
      } else {
        expect(introCheck.screen).toBe('playing');
      }
      await capturePage(page, `stage-${String(stageIndex + 1).padStart(2, '0')}-intro.png`);
      await waitForScreen(page, 'playing', 20_000);

      state = await snapshot(page);
      expect(state.runId).toBe(initialRunId);
      expect(state.input.mode).toBe(driver.usesTouch ? 'touch' : 'desktop');
      expect(state.input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
      expect(state.campaign?.phase).toBe('combat');
      expect(state.campaign?.unlockedWeapons).toEqual(expectedUnlockedWeapons(stageIndex));
      for (const id of expectedUnlockedWeapons(stageIndex)) {
        expect(hasAmmo(state, id), `${stageIndex + 1}단계 ${id} 탄약`).toBe(true);
      }
      if (expected.exerciseWeapon) {
        const weapon = expected.exerciseWeapon;
        if (driver.usesTouch) {
          await expect(page.locator('#weapon-prev')).toBeVisible();
          await expect(page.locator('#weapon-next')).toBeVisible();
        } else {
          await expect(page.locator(`#weapon-${weapon}`)).toBeVisible();
        }
      }

      const combatStartedAt = Date.now();
      const observedRanks = new Set<string>();
      const evidence = new Map<WeaponId, WeaponEvidence>();
      const navigation = freshNavigation(state, combatStartedAt);
      let previous = state;
      let previousObjective = state.campaign?.objectiveId;
      let maxEnemies = 0;
      let maxProjectiles = 0;
      let maxParticles = 0;
      let maxMines = 0;
      let lastStageElapsed = state.campaign?.stageElapsedMs ?? 0;
      let lastCampaignKills = state.campaign?.campaignKills ?? 0;
      let lastWeaponSwitchAt = combatStartedAt - 1000;

      while (state.screen === 'playing') {
        const now = Date.now();
        if (now - combatStartedAt > stageTimeLimitMs || now - startedAt > campaignTimeLimitMs) {
          throw new Error(`단계 시간 초과: ${stageIndex + 1}단계 ${expected.title}, objective=${state.campaign?.objectiveId}/${state.campaign?.objectiveKind}`);
        }
        lastObserved = state;
        recentHistory.push({ atMs: now - startedAt, ...summarizeState(state) });
        if (recentHistory.length > 35) recentHistory.shift();
        expect(state.runId, '단계 전환 없는 전투 runId').toBe(initialRunId);
        expect(state.campaign?.stageIndex).toBe(stageIndex);
        expect(state.campaign?.stageElapsedMs ?? 0).toBeGreaterThanOrEqual(lastStageElapsed);
        expect(state.campaign?.campaignKills ?? 0).toBeGreaterThanOrEqual(lastCampaignKills);
        lastStageElapsed = state.campaign?.stageElapsedMs ?? lastStageElapsed;
        lastCampaignKills = state.campaign?.campaignKills ?? lastCampaignKills;
        assertPoolCeilings(state);
        maxEnemies = Math.max(maxEnemies, state.performance.activeEnemies);
        maxProjectiles = Math.max(maxProjectiles, state.performance.activeProjectiles);
        maxParticles = Math.max(maxParticles, state.performance.activeParticles);
        maxMines = Math.max(maxMines, state.campaign?.activeMines ?? 0);
        for (const enemy of state.enemies) observedRanks.add(enemy.rank ?? 'normal');
        recordWeaponEvidence(previous, state, evidence);
        await options.onCombatSnapshot?.(state);
        previous = state;

        if (state.campaign?.objectiveId !== previousObjective) {
          previousObjective = state.campaign?.objectiveId;
          console.log(`CAMPAIGN_OBJECTIVE ${inputMode} ${character} stage=${stageIndex + 1} objective=${previousObjective}/${state.campaign?.objectiveKind}`);
          await writeJsonArtifact(`stage-${String(stageIndex + 1).padStart(2, '0')}-objective-${state.campaign?.objectiveIndex}.json`, summarizeState(state));
        }

        const nearest = state.campaign?.objectiveKind === 'hunt' ? targetForHunt(state) : nearestWorldEnemy(state);
        const nearestOnScreen = nearestEnemy(state);
        const aimTarget = nearest && nearest.screenX >= 0 && nearest.screenX <= 1280 &&
          nearest.screenY >= 0 && nearest.screenY <= 720 ? nearest : nearestOnScreen;
        const desired = desiredWeapon(state, evidence);
        const selected = weaponState(state, state.selectedWeapon);
        const needsSwitch = state.selectedWeapon !== desired && now - lastWeaponSwitchAt >= 1200 &&
          (!selected?.reloading || selected.magazine === 0);
        if (needsSwitch) {
          await driver.selectWeapon(desired);
          lastWeaponSwitchAt = Date.now();
        }
        const fired = (options.shouldFire?.(state) ?? true)
          ? await driver.aimAndFire(aimTarget?.id)
          : (await driver.stop(), false);
        if (!fired && selected && selected.reserve > 0 && selected.magazine <= 2 && !selected.reloading) {
          await driver.reload();
        }
        const target = movementTarget(state, nearest, navigation, now);
        await driver.moveToward(target.x, target.y, state.campaign?.objectiveKind === 'extract' ? 16 : 32);
        await page.waitForTimeout(75);
        state = await snapshot(page);
      }

      lastObserved = state;
      if (state.screen === 'dead') {
        throw new Error(`완주 중 사망: ${stageIndex + 1}단계 ${expected.title}, objective=${state.campaign?.objectiveId}, HP=0`);
      }
      expect(state.screen, `${stageIndex + 1}단계 클리어 화면`).toBe('stageClear');
      expect(state.input, '단계 전환 입력 해제').toMatchObject({ moveX: 0, moveY: 0, firing: false });
      await driver.stop();
      expect(state.runId).toBe(initialRunId);
      expect(state.campaign).toMatchObject({ phase: 'clear', stageIndex, stageTitle: expected.title });
      await expect(page.locator('#stage-screen')).toBeVisible();
      await expect(page.locator('#stage-kicker')).toContainText(`STAGE ${String(stageIndex + 1).padStart(2, '0')} CLEAR`);
      await expect(page.locator('#stage-title')).toHaveText(expected.title);
      await expect(page.locator('#stage-stats')).not.toBeEmpty();
      await expect(page.locator('#stage-continue-button')).toBeVisible();
      if (expected.reward) await expect(page.locator('#stage-reward')).toContainText(expected.reward.label);
      const clearElapsed = state.campaign?.stageElapsedMs;
      await page.waitForTimeout(150);
      expect((await snapshot(page)).campaign?.stageElapsedMs).toBe(clearElapsed);
      await capturePage(page, `stage-${String(stageIndex + 1).padStart(2, '0')}-clear.png`);

      reports.push({
        stageIndex,
        stageId: state.campaign!.stageId,
        title: state.campaign!.stageTitle,
        combatDurationMs: Date.now() - combatStartedAt,
        stageElapsedMs: state.campaign!.stageElapsedMs,
        stageKills: state.campaign!.stageKills,
        campaignKills: state.campaign!.campaignKills,
        health: state.player.health,
        unlockedWeapons: [...state.campaign!.unlockedWeapons],
        observedRanks: [...observedRanks],
        maxEnemies,
        maxProjectiles,
        maxParticles,
        maxMines,
        weaponEvidence: serializeEvidence(evidence),
      });
      console.log(`CAMPAIGN_STAGE_CLEAR ${inputMode} ${character} ${JSON.stringify(reports.at(-1))}`);
      await continueWithRealInput(page, driver);
      if (stageIndex < CAMPAIGN_STAGES.length - 1) await waitForScreen(page, 'stageIntro');
      else await waitForScreen(page, 'victory');
    }

    const final = await snapshot(page);
    lastObserved = final;
    expect(final.input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
    expect(final.campaign).toMatchObject({
      phase: 'complete',
      stageIndex: CAMPAIGN_STAGES.length - 1,
      stageCount: CAMPAIGN_STAGES.length,
    });
    await expect(page.locator('#result-title')).toHaveText('MISSION COMPLETE');
    await expect(page.locator('#result-time')).not.toBeEmpty();
    const resultKills = await page.locator('#result-kills').textContent();
    expect(Number(resultKills?.replace(/\D/g, ''))).toBe(final.campaign?.campaignKills);
    await capturePage(page, 'mission-complete.png');
    const result: CampaignResult = {
      character,
      inputMode,
      durationMs: Date.now() - startedAt,
      campaignElapsedMs: final.campaign?.campaignElapsedMs ?? 0,
      campaignKills: final.campaign?.campaignKills ?? 0,
      bestMultiKill: final.campaign?.bestMultiKill ?? 0,
      finalHealth: final.player.health,
      stages: reports,
      pageErrors,
    };
    await writeJsonArtifact('campaign-result.json', result);
    console.log(`CAMPAIGN_RESULT ${JSON.stringify(result)}`);
    expect(reports).toHaveLength(CAMPAIGN_STAGES.length);
    expect(pageErrors).toEqual([]);

    const restart = page.locator('#restart-button');
    if (driver.usesTouch) await restart.tap();
    else await restart.click();
    await waitForScreen(page, 'stageIntro');
    const restarted = await snapshot(page);
    expect(restarted.runId).toBeGreaterThan(initialRunId);
    expect(restarted.campaign).toMatchObject({ stageIndex: 0, stageKills: 0, campaignKills: 0, unlockedWeapons: ['rifle', 'shotgun', 'launcher'] });
    return result;
  } catch (error) {
    const failure = {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      character,
      inputMode,
      initialRunId,
      elapsedMs: Date.now() - startedAt,
      lastObserved: lastObserved ? summarizeState(lastObserved) : null,
      recentHistory,
      completedStages: reports,
      pageErrors,
    };
    await writeJsonArtifact('campaign-failure.json', failure).catch(() => undefined);
    await capturePage(page, 'campaign-failure.png').catch(() => undefined);
    throw error;
  } finally {
    await driver.stop();
  }
}

export const completeMission = completeCampaign;
