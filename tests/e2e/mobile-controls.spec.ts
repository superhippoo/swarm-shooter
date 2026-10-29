import { expect, test, type Page } from '@playwright/test';
import type { CharacterId, GameSnapshot } from '../../src/shared/game-types';
import { capturePage } from './artifacts';
import { snapshot, waitForScreen } from './game-driver';
import { TouchGameDriver } from './touch-driver';

async function startMobileRun(page: Page, character: CharacterId): Promise<void> {
  await page.goto('/');
  await page.locator(`#select-${character}`).tap();
  await waitForScreen(page, 'playing');
}

async function waitForAutoAim(page: Page): Promise<void> {
  await expect.poll(async () => (await snapshot(page)).input.autoAimTargetId, { timeout: 15_000 }).not.toBeNull();
}

function enemyDamaged(before: GameSnapshot, current: GameSnapshot): boolean {
  const previousHealth = new Map(before.enemies.map((enemy) => [enemy.id, enemy.health]));
  return current.enemies.length < before.enemies.length || current.enemies.some((enemy) => {
    const previous = previousHealth.get(enemy.id);
    return previous !== undefined && enemy.health < previous;
  });
}

test('데스크톱에서는 터치 컨트롤과 자동 조준을 사용하지 않는다', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#touch-controls')).toBeHidden();
  await page.locator('#select-scout').click();
  await waitForScreen(page, 'playing');
  expect((await snapshot(page)).input).toMatchObject({ mode: 'desktop', autoAimTargetId: null });
  await expect(page.locator('#touch-controls')).toBeHidden();
});

test.describe('모바일 가상 컨트롤', () => {
  test.use({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  });

  test('두 손가락으로 이동하면서 자동 조준 사격을 한다', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await startMobileRun(page, 'heavy');
    const driver = new TouchGameDriver(page);
    try {
      const initial = await snapshot(page);
      expect(initial.input.mode).toBe('touch');
      await driver.setMoveInput(1, 0);
      await expect.poll(async () => (await snapshot(page)).player.x, { timeout: 5000 })
        .toBeGreaterThan(initial.player.x + 30);
      await waitForAutoAim(page);
      const beforeFire = await snapshot(page);
      expect(beforeFire.input.autoAimTargetId).not.toBeNull();
      await driver.setFireInput(true);
      await expect.poll(async () => enemyDamaged(beforeFire, await snapshot(page)), { timeout: 6000 }).toBe(true);
      const firing = await snapshot(page);
      expect(firing.weapons.find((weapon) => weapon.id === 'rifle')!.magazine).toBeLessThan(30);
      expect(firing.input.firing).toBe(true);
      expect(firing.input.moveX).toBeGreaterThan(0);
      await capturePage(page, 'mobile-controls-combat.png');
    } finally {
      await driver.stop();
    }
    expect((await snapshot(page)).input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
    expect(pageErrors).toEqual([]);
  });

  test('이동을 유지한 채 재장전과 다음 무기 변경을 한다', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await startMobileRun(page, 'heavy');
    const driver = new TouchGameDriver(page);
    try {
      await page.locator('#fire-button').tap();
      await expect.poll(async () => (await snapshot(page)).weapons[0].magazine).toBeLessThan(30);
      await driver.setMoveInput(1, 0);
      await expect.poll(async () => (await snapshot(page)).input.moveX).toBeGreaterThan(0);
      await driver.tapWhileHolding('#reload-button');
      await expect.poll(async () => (await snapshot(page)).weapons[0].reloading).toBe(true);
      expect((await snapshot(page)).input.moveX).toBeGreaterThan(0);
      await driver.selectWeapon('shotgun');
      await expect.poll(async () => (await snapshot(page)).selectedWeapon).toBe('shotgun');
      expect((await snapshot(page)).input.moveX).toBeGreaterThan(0);
      expect((await snapshot(page)).weapons[0].reloading).toBe(false);
    } finally {
      await driver.stop();
    }
    expect(pageErrors).toEqual([]);
  });

  test('이전·다음 무기 버튼이 해금된 무기를 양방향 순환한다', async ({ page }) => {
    await startMobileRun(page, 'scout');
    await expect(page.locator('#weapon-prev')).toBeVisible();
    await expect(page.locator('#weapon-next')).toBeVisible();
    await expect(page.locator('#weapon-rifle')).toBeHidden();
    expect((await snapshot(page)).selectedWeapon).toBe('rifle');

    await page.locator('#weapon-next').tap();
    await expect.poll(async () => (await snapshot(page)).selectedWeapon).toBe('shotgun');
    await page.locator('#weapon-next').tap();
    await expect.poll(async () => (await snapshot(page)).selectedWeapon).toBe('launcher');
    await page.locator('#weapon-next').tap();
    await expect.poll(async () => (await snapshot(page)).selectedWeapon).toBe('rifle');
    await page.locator('#weapon-prev').tap();
    await expect.poll(async () => (await snapshot(page)).selectedWeapon).toBe('launcher');
  });

  test('반자동 무기는 길게 눌러도 한 발이고 새 탭마다 발사한다', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await startMobileRun(page, 'heavy');
    const driver = new TouchGameDriver(page);
    try {
      await waitForAutoAim(page);
      for (const [id, magazine] of [['shotgun', 6], ['launcher', 3]] as const) {
        await driver.selectWeapon(id);
        await driver.setFireInput(true);
        await page.waitForTimeout(1100);
        expect((await snapshot(page)).weapons.find((weapon) => weapon.id === id)!.magazine).toBe(magazine - 1);
        await driver.setFireInput(false);
        await driver.setFireInput(true);
        await page.waitForTimeout(80);
        await driver.setFireInput(false);
        expect((await snapshot(page)).weapons.find((weapon) => weapon.id === id)!.magazine).toBe(magazine - 2);
      }
    } finally {
      await driver.stop();
    }
    expect(pageErrors).toEqual([]);
  });

  test('터치 재장전·일시정지·재개가 시계와 입력을 올바르게 처리한다', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await startMobileRun(page, 'heavy');
    const driver = new TouchGameDriver(page);
    try {
      await waitForAutoAim(page);
      await driver.setMoveInput(1, 0);
      await driver.setFireInput(true);
      await page.waitForTimeout(450);
      await driver.tapWhileHolding('#reload-button');
      await expect.poll(async () => (await snapshot(page)).weapons[0].reloading).toBe(true);
      await driver.tapWhileHolding('#pause-button');
      await waitForScreen(page, 'paused');
      const paused = await snapshot(page);
      expect(paused.input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
      await page.waitForTimeout(350);
      const current = await snapshot(page);
      expect(current.tick).toBe(paused.tick);
      expect(current.campaign?.stageElapsedMs).toBe(paused.campaign?.stageElapsedMs);
      expect(current.campaign?.campaignElapsedMs).toBe(paused.campaign?.campaignElapsedMs);
      await expect(page.locator('#touch-controls')).toBeHidden();
      await page.locator('#resume-button').tap();
      await waitForScreen(page, 'playing');
      expect((await snapshot(page)).input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
      await expect.poll(async () => (await snapshot(page)).weapons[0].reloading, { timeout: 5000 }).toBe(false);
      expect((await snapshot(page)).weapons[0].magazine).toBe(30);
    } finally {
      await driver.stop();
    }
    expect(pageErrors).toEqual([]);
  });

  test('터치 취소와 세로 전환이 입력을 해제하고 전투를 일시정지한다', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await startMobileRun(page, 'scout');
    const driver = new TouchGameDriver(page);
    try {
      await driver.setMoveInput(1, 0);
      await driver.setFireInput(true);
      await page.waitForTimeout(100);
      await driver.cancel();
      await expect.poll(async () => (await snapshot(page)).input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
      await driver.setMoveInput(-1, 0);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('#orientation-screen')).toBeVisible();
      await waitForScreen(page, 'paused');
      expect((await snapshot(page)).input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
      await capturePage(page, 'mobile-portrait-guide.png');
      await page.setViewportSize({ width: 844, height: 390 });
      await expect(page.locator('#orientation-screen')).toBeHidden();
      await page.locator('#resume-button').tap();
      await waitForScreen(page, 'playing');
      expect((await snapshot(page)).input).toMatchObject({ moveX: 0, moveY: 0, firing: false });
    } finally {
      await driver.stop();
    }
    expect(pageErrors).toEqual([]);
  });

  test('모바일 브라우저의 가로 화면 전체를 게임 캔버스가 채운다', async ({ page }) => {
    await startMobileRun(page, 'scout');
    for (const size of [{ width: 844, height: 390 }, { width: 780, height: 360 }, { width: 740, height: 360 }]) {
      await page.setViewportSize(size);
      await expect.poll(async () => {
        const box = await page.locator('canvas').boundingBox();
        return box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
      }).toEqual({ x: 0, y: 0, ...size });
      await capturePage(page, `mobile-fullscreen-${size.width}.png`);
    }
  });

  test('작은 가로 화면에서도 overflow와 컨트롤 겹침이 없다', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 740, height: 360 });
    await startMobileRun(page, 'scout');
    for (const size of [{ width: 740, height: 360 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(size);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
      const bounds = async (id: string) => {
        const box = await page.locator(`#${id}`).boundingBox();
        if (!box) throw new Error(`${id} 영역을 읽을 수 없습니다.`);
        return box;
      };
      const [move, fire, reload, weapons, pause, previous, next] = await Promise.all([
        bounds('move-pad'), bounds('fire-button'), bounds('reload-button'), bounds('weapon-slots'), bounds('pause-button'),
        bounds('weapon-prev'), bounds('weapon-next'),
      ]);
      const overlaps = (a: typeof move, b: typeof move) =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      expect(overlaps(move, weapons)).toBe(false);
      expect(overlaps(fire, weapons)).toBe(false);
      expect(overlaps(fire, reload)).toBe(false);
      expect(Math.min(fire.width, reload.width, pause.width, previous.width, next.width)).toBeGreaterThanOrEqual(48);
      await capturePage(page, `mobile-controls-${size.width}.png`);
    }
    expect(pageErrors).toEqual([]);
  });
});
