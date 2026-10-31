import { expect, test } from '@playwright/test';
import { capturePage, writeJsonArtifact } from './artifacts';
import { GameDriver } from './game-driver';
import { completeCampaign } from './mission-runner';

test('후반 자연 웨이브 50기 이상에서 실제 사격 성능·풀 상한·단계 정리를 검증한다', async ({ page, browser }) => {
  test.setTimeout(3_700_000);
  const fpsSamples: number[] = [];
  let hordeCaptured = false;
  let denseStage = -1;

  const campaign = await completeCampaign(page, 'heavy', (currentPage) => new GameDriver(currentPage), {
    onCombatSnapshot: async (state) => {
      if (state.campaign!.stageIndex < 6 || state.performance.activeEnemies < 50) return;
      denseStage = state.campaign!.stageIndex;
      if (!hordeCaptured) {
        hordeCaptured = true;
        await capturePage(page, 'stress-dense-wave.png');
      }
      if (fpsSamples.length < 40 && state.performance.fps > 0) fpsSamples.push(state.performance.fps);
    },
  });

  const sorted = [...fpsSamples].sort((a, b) => a - b);
  const result = {
    environment: {
      browser: browser.version(),
      headless: true,
      platform: process.platform,
      node: process.version,
      note: '헤드리스 결과이며 실제 하드웨어 60fps 증거가 아닙니다.',
    },
    sampleCount: fpsSamples.length,
    averageFps: fpsSamples.length > 0 ? fpsSamples.reduce((sum, fps) => sum + fps, 0) / fpsSamples.length : null,
    medianFps: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null,
    minFps: sorted[0] ?? null,
    maxFps: sorted.at(-1) ?? null,
    denseStage: denseStage + 1,
    stages: campaign.stages.map((stage) => ({
      stage: stage.stageIndex + 1,
      maxEnemies: stage.maxEnemies,
      maxProjectiles: stage.maxProjectiles,
      maxParticles: stage.maxParticles,
      maxMines: stage.maxMines,
    })),
    fpsSamples,
    pageErrors: campaign.pageErrors,
  };
  await writeJsonArtifact('stress-result.json', result);
  console.log(`STRESS_RESULT ${JSON.stringify(result)}`);

  const lateStages = campaign.stages.slice(6);
  expect(Math.max(...lateStages.map((stage) => stage.maxEnemies))).toBeGreaterThanOrEqual(50);
  expect(Math.max(...campaign.stages.map((stage) => stage.maxProjectiles))).toBeGreaterThan(0);
  for (const stage of campaign.stages) {
    expect(stage.maxEnemies, `${stage.stageIndex + 1}단계 적 상한`).toBeLessThanOrEqual(72);
    expect(stage.maxProjectiles, `${stage.stageIndex + 1}단계 발사체 상한`).toBeLessThanOrEqual(192);
    expect(stage.maxParticles, `${stage.stageIndex + 1}단계 입자 상한`).toBeLessThanOrEqual(384);
    expect(stage.maxMines, `${stage.stageIndex + 1}단계 지뢰 상한`).toBeLessThanOrEqual(8);
  }
  expect(fpsSamples.length).toBeGreaterThanOrEqual(5);
  expect(campaign.pageErrors).toEqual([]);
});
