import Phaser from 'phaser';
import './style.css';
import type { CharacterId, GameScreen, WeaponId } from './shared/game-types';
import { CHARACTERS, WEAPONS, WEAPON_ORDER } from './game/config';
import { SwarmScene, type HudData } from './game/SwarmScene';
import { TouchControls } from './game/touch-controls';
import { gameAssetUrl } from './game/textures';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('게임 루트를 찾을 수 없습니다.');

function characterCard(id: CharacterId): string {
  const character = CHARACTERS[id];
  const healthRatio = Math.round(character.maxHealth / 520 * 100);
  const speedRatio = Math.round(character.speed / 245 * 100);
  return `
    <button id="select-${id}" class="character-card ${id}" type="button" data-character="${id}" disabled>
      <span class="card-index">0${id === 'scout' ? '1' : '2'} // ${id.toUpperCase()}</span>
      <span class="card-heading">
        <strong>${character.name}</strong>
        <span class="operative-mark" aria-hidden="true">
          <span class="portrait-initial">${id === 'scout' ? 'S' : 'H'}</span>
          <img class="operative-portrait" src="${gameAssetUrl(`assets/portraits/${id}.svg`)}" alt="" draggable="false" />
        </span>
      </span>
      <span class="card-description">${character.description}</span>
      <span class="stat-row"><span>HP</span><b>${character.maxHealth}</b></span>
      <span class="stat-track"><i style="width:${healthRatio}%"></i></span>
      <span class="stat-row"><span>기동 속도</span><b>${character.speed}</b></span>
      <span class="stat-track"><i style="width:${speedRatio}%"></i></span>
      <span class="card-loadout"><span>기본 3종 + 해금 4종</span><span>10단계 작전</span></span>
      <span class="deploy-label">${character.name}(으)로 작전 시작 <span aria-hidden="true">→</span></span>
    </button>
  `;
}

const WEAPON_SHORT_NAMES: Record<WeaponId, string> = {
  rifle: 'RS-7', shotgun: 'SG-4', launcher: 'GL-2', arc: 'ARC-5', rail: 'RAIL', flame: 'FLAME', mines: 'MX-8',
};

function weaponSlot(id: WeaponId, index: number): string {
  return `<button id="weapon-${id}" class="weapon-slot" type="button" data-weapon="${id}" aria-pressed="false"><kbd>${index + 1}</kbd><span>${WEAPON_SHORT_NAMES[id]}</span><b id="weapon-${id}-ammo">--</b></button>`;
}

app.innerHTML = `
  <main id="game-shell" data-screen="menu">
    <div id="game-stage" aria-label="SWARM ZERO 게임 화면"></div>
    <div class="screen-texture" aria-hidden="true"></div>
    <section id="hud" class="hud" aria-label="게임 상태" hidden>
      <div class="hud-top">
        <div class="hud-brand"><span>SWARM//ZERO</span><small>검은 이슬 · 10단계 작전</small></div>
        <div class="objective-panel">
          <div class="objective-heading"><span id="mission-phase">STAGE 01 / 10</span><span id="mission-metric">0%</span></div>
          <strong id="mission-label">중계기 침투</strong>
          <div class="objective-track"><i id="mission-fill"></i></div>
        </div>
        <button id="pause-button" class="icon-button" type="button" aria-label="일시정지">Ⅱ <span>ESC</span></button>
      </div>
      <div id="combat-notice" class="combat-notice" role="status" hidden></div>
      <div class="hud-bottom">
        <div class="vitals-panel">
          <div class="panel-label"><span>OPERATIVE VITALS</span><b id="health-text">110 / 110</b></div>
          <div class="health-track"><i id="health-fill"></i></div>
          <small id="health-status">생명 신호 안정</small>
        </div>
        <div class="controls-hint">
          <span><kbd>WASD</kbd> 이동</span><span><kbd>1~7</kbd> 무기</span>
          <span><kbd>LMB</kbd> 사격</span><span><kbd>R</kbd> 재장전</span>
        </div>
        <div class="ammo-panel">
          <div class="panel-label"><span id="current-weapon-name">RS-7 // AUTO</span><span id="kill-count">0 KILLS</span></div>
          <div id="weapon-slots" class="weapon-slots" role="group" aria-label="무기 선택">${WEAPON_ORDER.map(weaponSlot).join('')}</div>
          <div id="touch-weapon-switch" class="touch-weapon-switch" role="group" aria-label="무기 순환">
            <button id="weapon-prev" type="button" aria-label="이전 무기">◀</button>
            <strong id="touch-current-weapon">RS-7</strong>
            <button id="weapon-next" type="button" aria-label="다음 무기">▶</button>
          </div>
          <div class="ammo-readout"><strong id="magazine-text">30</strong><span>/ <b id="reserve-text">180</b></span></div>
          <div id="reload-label" class="reload-label">R · 재장전</div>
          <div id="reload-track" class="reload-track" hidden><i id="reload-fill"></i></div>
        </div>
      </div>
    </section>

    <section id="touch-controls" class="touch-controls" aria-label="모바일 게임 조작" hidden>
      <div id="move-pad" class="move-pad" role="group" aria-label="이동 스틱">
        <span class="stick-label" aria-hidden="true">MOVE</span>
        <i id="move-knob" class="move-knob" aria-hidden="true"></i>
      </div>
      <button id="reload-button" class="touch-action-button" type="button" aria-label="재장전">
        <strong aria-hidden="true">↻</strong><span>재장전</span>
      </button>
      <button id="fire-button" class="fire-button" type="button" aria-label="사격">
        <strong>FIRE</strong><span>사격</span>
      </button>
    </section>

    <section id="orientation-screen" class="orientation-screen" role="dialog" aria-modal="true" aria-labelledby="orientation-title" hidden>
      <div class="orientation-panel">
        <span class="orientation-icon" aria-hidden="true">↻</span>
        <h2 id="orientation-title">가로로 회전하세요</h2>
        <p>모바일 전투는 가로 화면에 맞춰져 있습니다.<br />기기를 가로로 돌린 뒤 작전을 시작하세요.</p>
      </div>
    </section>

    <section id="stage-screen" class="overlay stage-screen" role="dialog" aria-modal="true" aria-labelledby="stage-title" hidden>
      <div id="stage-panel" class="stage-panel">
        <span id="stage-kicker" class="stage-kicker">STAGE 01 START</span>
        <h2 id="stage-title">Medbay: Black Dew</h2>
        <p id="stage-objective">중계기를 확보하세요.</p>
        <div id="stage-reward" class="stage-reward" hidden></div>
        <div id="stage-stats" class="stage-stats"></div>
        <button id="stage-continue-button" class="primary-button" type="button" hidden>NEXT STAGE</button>
      </div>
    </section>

    <section id="menu-screen" class="overlay menu-screen">
      <div class="menu-content">
        <div class="menu-kicker"><span></span> 검은 이슬 // BLACK DEW <span></span></div>
        <h1>SWARM<span>//</span>ZERO</h1>
        <p class="menu-subtitle">10개 스테이지를 돌파하고 새 무기를 해금해 호드를 소탕하세요.</p>
        <div class="mission-route" aria-label="작전 구성"><span><b>01~10</b> CAMPAIGN</span><i></i><span><b>7</b> WEAPONS</span><i></i><span><b>1</b> FINAL MISSION</span></div>
        <div class="character-grid">${characterCard('scout')}${characterCard('heavy')}</div>
        <p class="menu-controls desktop-menu-controls"><kbd>WASD</kbd> 이동 <span>·</span> 마우스 조준/사격 <span>·</span> <kbd>1~7</kbd> 또는 휠 무기 교체 <span>·</span> <kbd>R</kbd> 재장전 <span>·</span> <kbd>ESC</kbd> 일시정지</p>
        <p class="menu-controls touch-menu-controls">왼쪽 스틱 이동 <span>·</span> 가까운 적 자동 조준 <span>·</span> FIRE 사격 <span>·</span> ◀ ▶ 무기 순환</p>
        <small class="boot-status" id="boot-status">10단계 캠페인과 독창적 SVG 에셋 초기화 중…</small>
      </div>
    </section>

    <section id="pause-screen" class="overlay modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title" hidden>
      <div class="modal-panel">
        <span class="modal-kicker">TACTICAL LINK SUSPENDED</span>
        <h2 id="pause-title">작전 일시정지</h2>
        <p>전투, 웨이브, 재장전과 캠페인 시계가 멈췄습니다.</p>
        <label class="setting-row" for="shake-toggle"><span><b>화면 진동</b><small>발사와 폭발의 반동 효과</small></span><input id="shake-toggle" type="checkbox" checked /><i aria-hidden="true"></i></label>
        <button id="resume-button" class="primary-button" type="button">작전 재개 <kbd>ESC</kbd></button>
        <button id="pause-restart-button" class="secondary-button" type="button">현재 스테이지 재시작</button>
        <button id="pause-menu-button" class="text-button" type="button">캐릭터 선택으로 복귀</button>
      </div>
    </section>

    <section id="result-screen" class="overlay modal-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title" hidden>
      <div class="modal-panel result-panel">
        <span id="result-kicker" class="modal-kicker">OPERATIVE SIGNAL LOST</span>
        <h2 id="result-title">작전 실패</h2>
        <p id="result-description">스웜이 작전 구역을 장악했습니다.</p>
        <div class="result-stats"><span>처치</span><strong id="result-kills">0</strong><span>HOSTILES</span><span>시간</span><strong id="result-time">00:00</strong><span>ELAPSED</span></div>
        <button id="restart-button" class="primary-button" type="button">현재 스테이지 재시작 <span>↻</span></button>
        <button id="menu-button" class="text-button" type="button">다른 캐릭터 선택</button>
      </div>
    </section>
  </main>
`;

for (const image of document.querySelectorAll<HTMLImageElement>('.operative-portrait')) {
  image.addEventListener('error', () => { image.hidden = true; }, { once: true });
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`필수 UI 요소가 없습니다: ${id}`);
  return element as T;
}

const shell = byId<HTMLElement>('game-shell');
const stage = byId<HTMLDivElement>('game-stage');
const hud = byId<HTMLElement>('hud');
const menuScreen = byId<HTMLElement>('menu-screen');
const pauseScreen = byId<HTMLElement>('pause-screen');
const resultScreen = byId<HTMLElement>('result-screen');
const healthText = byId<HTMLElement>('health-text');
const healthFill = byId<HTMLElement>('health-fill');
const magazineText = byId<HTMLElement>('magazine-text');
const reserveText = byId<HTMLElement>('reserve-text');
const reloadLabel = byId<HTMLElement>('reload-label');
const reloadTrack = byId<HTMLElement>('reload-track');
const reloadFill = byId<HTMLElement>('reload-fill');
const missionPhase = byId<HTMLElement>('mission-phase');
const missionMetric = byId<HTMLElement>('mission-metric');
const missionLabel = byId<HTMLElement>('mission-label');
const missionFill = byId<HTMLElement>('mission-fill');
const killCount = byId<HTMLElement>('kill-count');
const resultKills = byId<HTMLElement>('result-kills');
const combatNotice = byId<HTMLElement>('combat-notice');
const characterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-character]'));
const weaponButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-weapon]'));
const touchControlsLayer = byId<HTMLElement>('touch-controls');
const orientationScreen = byId<HTMLElement>('orientation-screen');
const touchQuery = window.matchMedia('(pointer: coarse)');
const portraitQuery = window.matchMedia('(orientation: portrait)');
const stageScreen = byId<HTMLElement>('stage-screen');
const stagePanel = byId<HTMLElement>('stage-panel');
const stageKicker = byId<HTMLElement>('stage-kicker');
const stageTitle = byId<HTMLElement>('stage-title');
const stageObjective = byId<HTMLElement>('stage-objective');
const stageReward = byId<HTMLElement>('stage-reward');
const stageStats = byId<HTMLElement>('stage-stats');
const stageContinueButton = byId<HTMLButtonElement>('stage-continue-button');
const resultTime = byId<HTMLElement>('result-time');
let currentScreen: GameScreen = 'menu';
let latestReward: WeaponId | null = null;

function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function renderStage(screen: GameScreen, data: HudData['campaign'], health: number, maxHealth: number): void {
  stageScreen.hidden = screen !== 'stageIntro' && screen !== 'stageClear';
  if (!data) return;
  const stageNumber = String(data.stageIndex + 1).padStart(2, '0');
  stagePanel.dataset.phase = screen;
  stageKicker.textContent = `STAGE ${stageNumber} ${screen === 'stageIntro' ? 'START' : 'CLEAR'}`;
  stageTitle.textContent = data.stageTitle;
  stageObjective.textContent = data.objectiveLabel;
  stageReward.hidden = screen !== 'stageClear' || latestReward === null;
  stageReward.textContent = latestReward ? `WEAPON UNLOCKED // ${WEAPONS[latestReward].name}` : '';
  stageStats.textContent = screen === 'stageIntro'
    ? `${data.stageCount}개 구역 · ${data.unlockedWeapons.length}개 무기 사용 가능`
    : `${formatTime(data.stageElapsedMs)} · ${data.stageKills} KILLS · HP ${health} / ${maxHealth}`;
  stageContinueButton.hidden = screen !== 'stageClear';
  stageContinueButton.textContent = data.stageIndex === data.stageCount - 1 ? 'MISSION COMPLETE' : 'NEXT STAGE';
}

function updateScreen(screen: GameScreen): void {
  currentScreen = screen;
  shell.dataset.screen = screen;
  menuScreen.hidden = screen !== 'menu';
  pauseScreen.hidden = screen !== 'paused';
  resultScreen.hidden = screen !== 'dead' && screen !== 'victory';
  hud.hidden = screen === 'menu';
  const snapshot = scene.getSnapshot();
  if (screen === 'dead' || screen === 'victory') {
    const victory = screen === 'victory';
    resultScreen.dataset.result = victory ? 'victory' : 'dead';
    byId<HTMLElement>('result-kicker').textContent = victory ? 'ALL SECTORS CLEARED' : 'OPERATIVE SIGNAL LOST';
    byId<HTMLElement>('result-title').textContent = victory ? 'MISSION COMPLETE' : '작전 실패';
    byId<HTMLElement>('result-description').textContent = victory
      ? '10개 스테이지를 모두 돌파하고 검은 이슬을 제거했습니다.'
      : '스웜이 작전 구역을 장악했습니다. 현재 스테이지부터 다시 시도하세요.';
    resultKills.textContent = String(snapshot.campaign?.campaignKills ?? 0);
    resultTime.textContent = formatTime(snapshot.campaign?.campaignElapsedMs ?? 0);
    byId<HTMLButtonElement>('restart-button').textContent = victory ? '새 캠페인 시작 ↻' : '현재 스테이지 재시작 ↻';
  }
  renderStage(screen, snapshot.campaign, snapshot.player.health, snapshot.player.maxHealth);
  syncTouchState();
}

function updateHud(data: HudData): void {
  latestReward = data.reward;
  healthText.textContent = `${data.health} / ${data.maxHealth}`;
  const healthRatio = data.maxHealth > 0 ? data.health / data.maxHealth : 0;
  healthFill.style.width = `${Math.max(0, healthRatio) * 100}%`;
  healthFill.classList.toggle('critical', healthRatio <= 0.3);
  byId<HTMLElement>('health-status').textContent = healthRatio <= 0.3 ? '위험 · 생명 신호 저하' : '생명 신호 안정';
  const selected = data.weapons.find((weapon) => weapon.id === data.selectedWeapon) ?? data.weapons[0];
  magazineText.textContent = String(selected.magazine).padStart(2, '0');
  reserveText.textContent = String(selected.reserve).padStart(3, '0');
  byId<HTMLElement>('current-weapon-name').textContent = `${WEAPONS[data.selectedWeapon].name} // ${WEAPONS[data.selectedWeapon].automatic ? 'AUTO' : 'SEMI'}`;
  byId<HTMLElement>('touch-current-weapon').textContent = WEAPON_SHORT_NAMES[data.selectedWeapon];
  for (const id of WEAPON_ORDER) {
    const weapon = data.weapons.find((candidate) => candidate.id === id);
    const unlocked = data.campaign.unlockedWeapons.includes(id);
    const button = byId<HTMLButtonElement>(`weapon-${id}`);
    button.disabled = !unlocked;
    button.dataset.locked = String(!unlocked);
    button.classList.toggle('selected', unlocked && id === data.selectedWeapon);
    button.classList.toggle('reloading', weapon?.reloading ?? false);
    button.setAttribute('aria-pressed', String(unlocked && id === data.selectedWeapon));
    byId<HTMLElement>(`weapon-${id}-ammo`).textContent = !unlocked
      ? 'LOCK'
      : !weapon ? '—' : weapon.reloading ? '재장전' : `${weapon.magazine} / ${weapon.reserve}`;
  }
  reloadTrack.hidden = !selected.reloading;
  reloadFill.style.width = `${data.reloadRatio * 100}%`;
  reloadLabel.textContent = selected.reloading
    ? `재장전 중 · ${Math.round(data.reloadRatio * 100)}%`
    : selected.magazine === 0 && selected.reserve === 0
      ? '탄약 없음 · 비상 보급 대기'
      : selected.magazine === 0 ? 'R · 재장전 필요' : 'R · 재장전';
  missionPhase.textContent = `STAGE ${String(data.campaign.stageIndex + 1).padStart(2, '0')} / ${data.campaign.stageCount}`;
  missionPhase.dataset.phase = data.campaign.phase;
  const objectiveRatio = data.campaign.objectiveTarget > 0
    ? Math.min(1, Math.max(0, data.campaign.objectiveProgress / data.campaign.objectiveTarget))
    : 1;
  missionLabel.textContent = data.missionLabel;
  missionMetric.textContent = `${Math.round(objectiveRatio * 100)}%`;
  missionFill.style.width = `${objectiveRatio * 100}%`;
  killCount.textContent = `${data.campaign.campaignKills} KILLS`;
  resultKills.textContent = String(data.campaign.campaignKills);
  resultTime.textContent = formatTime(data.campaign.campaignElapsedMs);
  combatNotice.textContent = data.notice;
  combatNotice.hidden = data.notice.length === 0;
  renderStage(currentScreen, data.campaign, data.health, data.maxHealth);
}

const scene = new SwarmScene({
  onReady: () => {
    characterButtons.forEach((button) => { button.disabled = false; });
    byId<HTMLElement>('boot-status').textContent = '전술 연결 완료 · 캐릭터를 선택하세요';
  },
  onScreen: updateScreen,
  onHud: updateHud,
});
const diagnostics: NonNullable<Window['swarmDiagnostics']> = () => scene.getSnapshot();
window.swarmDiagnostics = diagnostics;
const touchControls = new TouchControls({
  movePad: byId<HTMLElement>('move-pad'),
  moveKnob: byId<HTMLElement>('move-knob'),
  fireButton: byId<HTMLButtonElement>('fire-button'),
  onMove: (x, y) => scene.setMoveVector(x, y),
  onFire: (firing) => scene.setTouchFiring(firing),
});
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  width: 1280,
  height: 720,
  backgroundColor: '#080d12',
  scale: {
    mode: touchQuery.matches ? Phaser.Scale.RESIZE : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: { noAudio: true },
  scene,
});
const uiEvents = new AbortController();

function bindTouchAction(button: HTMLButtonElement, action: () => void): void {
  let suppressClick = false;
  button.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || button.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = true;
    action();
  }, { signal: uiEvents.signal });
  button.addEventListener('pointerup', () => {
    window.setTimeout(() => { suppressClick = false; }, 0);
  }, { signal: uiEvents.signal });
  button.addEventListener('pointercancel', () => { suppressClick = false; }, { signal: uiEvents.signal });
  button.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      suppressClick = false;
      return;
    }
    action();
  }, { signal: uiEvents.signal });
}

for (const button of characterButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.character;
    if (id === 'scout' || id === 'heavy') scene.startRun(id);
  }, { signal: uiEvents.signal });
}
for (const button of weaponButtons) {
  bindTouchAction(button, () => {
    const id = button.dataset.weapon;
    if (id && (WEAPON_ORDER as readonly string[]).includes(id)) scene.selectWeapon(id as WeaponId);
  });
}
bindTouchAction(byId<HTMLButtonElement>('weapon-prev'), () => scene.cycleWeapon(-1));
bindTouchAction(byId<HTMLButtonElement>('weapon-next'), () => scene.cycleWeapon(1));
bindTouchAction(stageContinueButton, () => scene.continueCampaign());
bindTouchAction(byId<HTMLButtonElement>('pause-button'), () => scene.pauseRun());
bindTouchAction(byId<HTMLButtonElement>('resume-button'), () => scene.resumeRun());
byId<HTMLButtonElement>('pause-restart-button').addEventListener('click', () => scene.restartRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('restart-button').addEventListener('click', () => scene.restartRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('pause-menu-button').addEventListener('click', () => scene.returnToMenu(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('menu-button').addEventListener('click', () => scene.returnToMenu(), { signal: uiEvents.signal });
byId<HTMLInputElement>('shake-toggle').addEventListener('change', (event) => {
  scene.setShakeEnabled((event.currentTarget as HTMLInputElement).checked);
}, { signal: uiEvents.signal });
bindTouchAction(byId<HTMLButtonElement>('reload-button'), () => scene.reloadWeapon());

function syncTouchState(): void {
  const touch = touchQuery.matches;
  const portrait = touch && portraitQuery.matches;
  const controlsEnabled = touch && currentScreen === 'playing' && !portrait;
  shell.dataset.input = touch ? 'touch' : 'desktop';
  touchControlsLayer.hidden = !controlsEnabled;
  orientationScreen.hidden = !portrait;
  touchControls.setEnabled(controlsEnabled);
  scene.setTouchControlsEnabled(touch);
  if (portrait && (currentScreen === 'playing' || currentScreen === 'stageIntro')) scene.pauseRun();
}

touchQuery.addEventListener('change', syncTouchState);
portraitQuery.addEventListener('change', syncTouchState);
syncTouchState();

const controlledKeys = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);
const weaponKeys: Record<string, WeaponId> = {
  Digit1: 'rifle', Digit2: 'shotgun', Digit3: 'launcher', Digit4: 'arc',
  Digit5: 'rail', Digit6: 'flame', Digit7: 'mines',
};
const onKeyDown = (event: KeyboardEvent): void => {
  if (event.code === 'Escape') {
    if (currentScreen === 'playing' || currentScreen === 'paused') {
      event.preventDefault();
      if (!event.repeat) {
        if (currentScreen === 'playing') scene.pauseRun();
        else scene.resumeRun();
      }
    }
    return;
  }
  if (currentScreen !== 'playing' || !controlledKeys.has(event.code)) return;
  event.preventDefault();
  const weapon = weaponKeys[event.code];
  if (weapon) {
    if (!event.repeat) scene.selectWeapon(weapon);
    return;
  }
  scene.setKey(event.code, true);
  if (event.code === 'KeyR' && !event.repeat) scene.reloadWeapon();
};
const onKeyUp = (event: KeyboardEvent): void => {
  if (controlledKeys.has(event.code) && currentScreen === 'playing') event.preventDefault();
  scene.setKey(event.code, false);
};
const onPointerUp = (event: PointerEvent): void => {
  if (event.pointerType === 'mouse') scene.setFiring(false);
};
const onBlur = (): void => {
  touchControls.reset();
  scene.setFiring(false);
  scene.pauseRun();
};
const onVisibility = (): void => { if (document.hidden) onBlur(); };
const preventContextMenu = (event: Event): void => event.preventDefault();
const onWheel = (event: WheelEvent): void => {
  event.preventDefault();
  if (currentScreen === 'playing' && event.deltaY !== 0) scene.cycleWeapon(event.deltaY);
};
window.addEventListener('keydown', onKeyDown, { passive: false });
window.addEventListener('keyup', onKeyUp, { passive: false });
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('blur', onBlur);
document.addEventListener('visibilitychange', onVisibility);
document.addEventListener('contextmenu', preventContextMenu);
stage.addEventListener('wheel', onWheel, { passive: false });

let destroyed = false;
let sawCanvas = false;
const observer = new MutationObserver(() => {
  if (stage.querySelector('canvas')) sawCanvas = true;
  else if (sawCanvas) destroy();
});
function destroy(): void {
  if (destroyed) return;
  destroyed = true;
  observer.disconnect();
  touchControls.dispose();
  uiEvents.abort();
  touchQuery.removeEventListener('change', syncTouchState);
  portraitQuery.removeEventListener('change', syncTouchState);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('blur', onBlur);
  window.removeEventListener('pagehide', destroy);
  document.removeEventListener('visibilitychange', onVisibility);
  document.removeEventListener('contextmenu', preventContextMenu);
  stage.removeEventListener('wheel', onWheel);
  if (window.swarmDiagnostics === diagnostics) delete window.swarmDiagnostics;
  game.destroy(true);
}
observer.observe(stage, { childList: true });
window.addEventListener('pagehide', destroy, { once: true });
if (import.meta.hot) import.meta.hot.dispose(destroy);
