import type {
  CampaignSupplyDefinition,
  CampaignWaveDefinition,
  EnemyId,
  LayoutId,
  ObjectiveDefinition,
  Point,
  StageDefinition,
} from '../shared/game-types';
import { OBSTACLES, type ObstacleDefinition } from './config';

export const CAMPAIGN_NAME = 'BLACK DEW';
export const STAGE_INTRO_MS = 1200;
export const COLLECT_RADIUS = 54;

export interface CampaignLayout {
  id: LayoutId;
  name: string;
  tint: number;
  obstacles: ObstacleDefinition[];
}

const reactorObstacles: ObstacleDefinition[] = [
  { x: 480, y: 1240, width: 220, height: 70, kind: 'console' },
  { x: 850, y: 1050, width: 64, height: 300, kind: 'wall' },
  { x: 1210, y: 1250, width: 260, height: 72, kind: 'console' },
  { x: 1430, y: 820, width: 220, height: 60, kind: 'wall' },
  { x: 1810, y: 1110, width: 70, height: 280, kind: 'wall' },
  { x: 1980, y: 550, width: 240, height: 76, kind: 'console' },
  { x: 1060, y: 390, width: 250, height: 64, kind: 'console' },
  { x: 480, y: 480, width: 60, height: 230, kind: 'wall' },
];

const hiveObstacles: ObstacleDefinition[] = [
  { x: 390, y: 1190, width: 180, height: 82, kind: 'console' },
  { x: 720, y: 910, width: 80, height: 250, kind: 'wall' },
  { x: 1040, y: 1320, width: 250, height: 78, kind: 'console' },
  { x: 1290, y: 960, width: 210, height: 66, kind: 'wall' },
  { x: 1630, y: 1250, width: 86, height: 260, kind: 'wall' },
  { x: 1880, y: 850, width: 250, height: 80, kind: 'console' },
  { x: 1500, y: 440, width: 75, height: 240, kind: 'wall' },
  { x: 840, y: 390, width: 250, height: 72, kind: 'console' },
  { x: 310, y: 440, width: 160, height: 74, kind: 'console' },
];

export const CAMPAIGN_LAYOUTS: Record<LayoutId, CampaignLayout> = {
  medbay: { id: 'medbay', name: 'MEDBAY', tint: 0x39e6d0, obstacles: OBSTACLES },
  reactor: { id: 'reactor', name: 'REACTOR', tint: 0xf5b942, obstacles: reactorObstacles },
  hive: { id: 'hive', name: 'HIVE', tint: 0xff5d64, obstacles: hiveObstacles },
};

function counts(swarmer: number, skitter: number, brute: number): Record<EnemyId, number> {
  return { swarmer, skitter, brute };
}

function distribute(total: number, parts: number, index: number): number {
  return Math.floor(total / parts) + (index < total % parts ? 1 : 0);
}

function waves(
  objectiveId: string,
  total: Record<EnemyId, number>,
  waveCount: number,
  intervalMs: number,
  direction: CampaignWaveDefinition['direction'] = null,
  eliteCount = 0,
): CampaignWaveDefinition[] {
  return Array.from({ length: waveCount }, (_, index) => ({
    id: `${objectiveId}-w${index}`,
    objectiveId,
    atMs: index * intervalMs,
    counts: counts(
      distribute(total.swarmer, waveCount, index),
      distribute(total.skitter, waveCount, index),
      distribute(total.brute, waveCount, index),
    ),
    required: true,
    direction,
    eliteCount: distribute(eliteCount, waveCount, index),
  }));
}

function supply(x: number, y: number, atMs = 0): CampaignSupplyDefinition {
  return { x, y, atMs };
}

function reach(id: string, label: string, x: number, y: number, radius = 90): ObjectiveDefinition {
  return { id, kind: 'reach', label, point: { x, y }, radius };
}

function defend(
  id: string,
  label: string,
  x: number,
  y: number,
  durationMs: number,
  radius = 300,
): ObjectiveDefinition {
  return { id, kind: 'defend', label, point: { x, y }, radius, durationMs };
}

function collect(id: string, label: string, points: Point[]): ObjectiveDefinition {
  return { id, kind: 'collect', label, points };
}

function purge(id: string, label: string, waveId: string): ObjectiveDefinition {
  return { id, kind: 'purge', label, waveId };
}

function hunt(
  id: string,
  label: string,
  rank: 'elite' | 'alpha',
  count: number,
): ObjectiveDefinition {
  return { id, kind: 'hunt', label, rank, count };
}

function extract(id: string, label: string, x: number, y: number, radius = 90): ObjectiveDefinition {
  return { id, kind: 'extract', label, point: { x, y }, radius };
}

const s04HuntWaves = waves('s04-hunt', counts(72, 18, 8), 6, 3200, 'both', 3);
const s10AlphaReserve: CampaignWaveDefinition = {
  id: 's10-hunt-reserve',
  objectiveId: 's10-hunt',
  atMs: -1,
  counts: counts(12, 3, 0),
  required: true,
  direction: 'both',
};
const s10Alpha: CampaignWaveDefinition = {
  id: 's10-hunt-alpha',
  objectiveId: 's10-hunt',
  atMs: 0,
  counts: counts(0, 0, 0),
  required: true,
  direction: 'forward',
  alphaCount: 1,
};

export const CAMPAIGN_STAGES: StageDefinition[] = [
  {
    id: 'stage-01',
    title: 'Medbay: Black Dew',
    layoutId: 'medbay',
    playerStart: { x: 240, y: 1300 },
    maxAlive: 32,
    objectives: [
      reach('s01-relay', '중계기 도달', 1900, 800),
      defend('s01-defense', '중계기 방어 · 20초', 1900, 800, 20_000),
      extract('s01-extract', '승강기 탈출', 240, 240),
    ],
    waves: [
      ...waves('s01-relay', counts(16, 2, 0), 2, 5000),
      ...waves('s01-defense', counts(28, 4, 1), 5, 4500),
      ...waves('s01-extract', counts(4, 0, 0), 1, 0, 'forward'),
    ],
    supplies: [supply(1050, 1080), supply(620, 390, 12_000)],
  },
  {
    id: 'stage-02',
    title: 'Cryo Labs: Cold Signal',
    layoutId: 'medbay',
    playerStart: { x: 310, y: 1380 },
    maxAlive: 36,
    unlock: 'arc',
    objectives: [
      collect('s02-cells', '냉각 셀 회수', [
        { x: 720, y: 1290 }, { x: 1370, y: 1050 }, { x: 1930, y: 620 },
      ]),
      reach('s02-relay', '중계기 도달', 1990, 330),
    ],
    waves: [
      ...waves('s02-cells', counts(30, 5, 0), 4, 5200),
      ...waves('s02-relay', counts(30, 5, 1), 4, 4600, 'both'),
    ],
    supplies: [supply(860, 1120), supply(1760, 760, 14_000)],
  },
  {
    id: 'stage-03',
    title: 'Relay Spine: Crossfire',
    layoutId: 'reactor',
    playerStart: { x: 260, y: 1320 },
    maxAlive: 40,
    objectives: [
      defend('s03-west', '서쪽 중계기 방어 · 20초', 690, 1190, 20_000, 270),
      defend('s03-east', '동쪽 중계기 방어 · 20초', 2010, 780, 20_000, 270),
      purge('s03-purge', '남은 교차 화력 제거', 's03-purge'),
    ],
    waves: [
      ...waves('s03-west', counts(24, 8, 1), 4, 5000, 'forward'),
      ...waves('s03-east', counts(24, 8, 0), 4, 5000, 'rear'),
      ...waves('s03-purge', counts(16, 4, 1), 2, 6500, 'both'),
    ],
    supplies: [supply(620, 1380), supply(2050, 960, 22_000)],
  },
  {
    id: 'stage-04',
    title: 'Waste Works: Brood Hunt',
    layoutId: 'reactor',
    playerStart: { x: 220, y: 800 },
    maxAlive: 44,
    unlock: 'rail',
    objectives: [
      hunt('s04-hunt', '표시된 엘리트 Brute 처치', 'elite', 3),
      purge('s04-escorts', '엘리트 호위대 전멸', 's04-hunt'),
    ],
    waves: s04HuntWaves,
    supplies: [supply(560, 760), supply(1730, 1030, 18_000)],
  },
  {
    id: 'stage-05',
    title: 'Reactor Deck: Redline',
    layoutId: 'reactor',
    playerStart: { x: 350, y: 1340 },
    maxAlive: 48,
    objectives: [
      defend('s05-reactor', '원자로 방어 · 45초', 1290, 730, 45_000, 310),
      extract('s05-extract', '전후방 교대 습격 돌파 후 탈출', 2170, 260),
    ],
    waves: [
      ...waves('s05-reactor', counts(80, 20, 4), 7, 6500, 'both'),
      ...waves('s05-extract', counts(20, 4, 0), 3, 5500, 'both'),
    ],
    supplies: [supply(1090, 790), supply(1880, 480, 32_000)],
  },
  {
    id: 'stage-06',
    title: 'Quarantine: Seal the Vents',
    layoutId: 'hive',
    playerStart: { x: 240, y: 1370 },
    maxAlive: 52,
    unlock: 'flame',
    objectives: [
      defend('s06-vent-a', '환기구 A 봉쇄 · 15초', 560, 1120, 15_000, 250),
      defend('s06-vent-b', '환기구 B 봉쇄 · 15초', 1260, 680, 15_000, 250),
      defend('s06-vent-c', '환기구 C 봉쇄 · 15초', 1990, 1050, 15_000, 250),
      purge('s06-purge', '마지막 격리 웨이브 제거', 's06-purge'),
    ],
    waves: [
      ...waves('s06-vent-a', counts(30, 8, 2), 3, 4800, 'forward'),
      ...waves('s06-vent-b', counts(30, 8, 2), 3, 4800, 'rear'),
      ...waves('s06-vent-c', counts(30, 8, 2), 3, 4800, 'both'),
      ...waves('s06-purge', counts(20, 6, 0), 2, 4500, 'both'),
    ],
    supplies: [supply(520, 1390), supply(1840, 1110, 30_000)],
  },
  {
    id: 'stage-07',
    title: 'Nest Galleries: Burnout',
    layoutId: 'hive',
    playerStart: { x: 250, y: 800 },
    maxAlive: 56,
    objectives: [
      purge('s07-purge-a', '소탕 웨이브 1/4', 's07-purge-a'),
      purge('s07-purge-b', '소탕 웨이브 2/4', 's07-purge-b'),
      purge('s07-purge-c', '소탕 웨이브 3/4', 's07-purge-c'),
      purge('s07-purge-d', '소탕 웨이브 4/4', 's07-purge-d'),
    ],
    waves: [
      ...waves('s07-purge-a', counts(34, 9, 2), 3, 4000, 'forward'),
      ...waves('s07-purge-b', counts(34, 9, 2), 3, 3800, 'rear'),
      ...waves('s07-purge-c', counts(32, 8, 2), 3, 3600, 'both'),
      ...waves('s07-purge-d', counts(30, 8, 2), 3, 3400, 'both'),
    ],
    supplies: [supply(570, 760), supply(1730, 890, 28_000)],
  },
  {
    id: 'stage-08',
    title: 'Gravity Lift: Last Bridge',
    layoutId: 'reactor',
    playerStart: { x: 280, y: 1340 },
    maxAlive: 60,
    unlock: 'mines',
    objectives: [
      collect('s08-fuses', '승강기 퓨즈 회수', [{ x: 900, y: 650 }, { x: 1870, y: 1280 }]),
      defend('s08-lift', '승강기 방어 · 30초', 2060, 420, 30_000, 280),
      extract('s08-extract', '승강기 탈출', 2180, 250),
    ],
    waves: [
      ...waves('s08-fuses', counts(50, 16, 4), 5, 4800, 'both'),
      ...waves('s08-lift', counts(60, 20, 4), 5, 5700, 'both'),
      ...waves('s08-extract', counts(20, 8, 2), 3, 4300, 'forward'),
    ],
    supplies: [supply(790, 1120), supply(1940, 630, 24_000)],
  },
  {
    id: 'stage-09',
    title: 'Surface Causeway: No Retreat',
    layoutId: 'hive',
    playerStart: { x: 180, y: 1430 },
    maxAlive: 64,
    objectives: [
      reach('s09-point-a', '돌파 지점 1/3', 650, 1150),
      reach('s09-point-b', '돌파 지점 2/3', 1350, 690),
      reach('s09-point-c', '돌파 지점 3/3', 2020, 1080),
      purge('s09-purge', '승강기 접근로 소탕', 's09-purge'),
    ],
    waves: [
      ...waves('s09-point-a', counts(30, 11, 2), 3, 4800, 'forward'),
      ...waves('s09-point-b', counts(30, 11, 2), 3, 4500, 'rear'),
      ...waves('s09-point-c', counts(30, 11, 2), 3, 4200, 'both'),
      ...waves('s09-purge', counts(60, 22, 6), 5, 4500, 'both'),
    ],
    supplies: [supply(570, 1320), supply(1880, 960, 30_000)],
  },
  {
    id: 'stage-10',
    title: 'Hive Core: Zero Hour',
    layoutId: 'hive',
    playerStart: { x: 240, y: 1320 },
    maxAlive: 72,
    objectives: [
      defend('s10-uplink', '업링크 방어 · 45초', 1210, 760, 45_000, 310),
      hunt('s10-hunt', 'Alpha Brute 처치', 'alpha', 1),
      purge('s10-guard', 'Alpha 경비대 소탕', 's10-guard'),
      extract('s10-extract', '최종 탈출', 220, 220),
    ],
    waves: [
      ...waves('s10-uplink', counts(100, 40, 10), 7, 6200, 'both'),
      s10Alpha,
      s10AlphaReserve,
      ...waves('s10-guard', counts(58, 22, 6), 5, 3900, 'both'),
      ...waves('s10-extract', counts(0, 0, 0), 1, 0),
    ],
    supplies: [supply(990, 980), supply(540, 420, 45_000)],
  },
];

export function stageEnemyTotal(stage: StageDefinition): Record<EnemyId, number> {
  const total = counts(0, 0, 0);
  for (const wave of stage.waves) {
    total.swarmer += wave.counts.swarmer;
    total.skitter += wave.counts.skitter;
    total.brute += wave.counts.brute + (wave.eliteCount ?? 0) + (wave.alphaCount ?? 0);
  }
  return total;
}

export function waveEnemyTotal(wave: CampaignWaveDefinition): number {
  return wave.counts.swarmer + wave.counts.skitter + wave.counts.brute +
    (wave.eliteCount ?? 0) + (wave.alphaCount ?? 0);
}
