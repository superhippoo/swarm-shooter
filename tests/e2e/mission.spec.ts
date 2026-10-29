import { expect, test } from '@playwright/test';
import { GameDriver } from './game-driver';
import { completeCampaign } from './mission-runner';

for (const character of ['heavy', 'scout'] as const) {
  test(`${character} 캐릭터가 실제 입력으로 10단계 캠페인을 완료한다`, async ({ page }) => {
    test.setTimeout(1_900_000);
    const result = await completeCampaign(page, character, (currentPage) => new GameDriver(currentPage));

    if (character === 'heavy') {
      expect(result.stages[3].observedRanks, '4단계 엘리트 출현').toContain('elite');
      expect(result.stages[9].observedRanks, '10단계 Alpha 출현').toContain('alpha');

      const arc = result.stages[2].weaponEvidence.arc;
      expect(arc.shots, 'ARC-5 실제 발사').toBeGreaterThan(0);
      expect(arc.hitEvents, 'ARC-5 실제 피해').toBeGreaterThan(0);
      expect(arc.maxTargetsPerEvent, 'ARC-5 연쇄 피해').toBeGreaterThanOrEqual(2);

      const rail = result.stages[4].weaponEvidence.rail;
      expect(rail.shots, 'Rail Lance 실제 발사').toBeGreaterThan(0);
      expect(rail.hitEvents, 'Rail Lance 실제 피해').toBeGreaterThan(0);
      expect(rail.maxTargetsPerEvent, 'Rail Lance 관통 피해').toBeGreaterThanOrEqual(2);

      const flame = result.stages[6].weaponEvidence.flame;
      expect(flame.shots, 'Flame Projector 실제 발사').toBeGreaterThan(1);
      expect(flame.hitEvents, 'Flame Projector 실제 피해').toBeGreaterThan(0);

      const mines = result.stages[8].weaponEvidence.mines;
      expect(mines.shots, 'Mine Layer 실제 설치').toBeGreaterThan(0);
      expect(mines.mineBlasts, '지뢰 실제 폭발').toBeGreaterThan(0);
      expect(mines.hitEvents, '지뢰 폭발 피해').toBeGreaterThan(0);
    }
  });
}
