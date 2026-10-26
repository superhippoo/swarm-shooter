import Phaser from 'phaser';
import './style.css';
import type { CharacterId, GameScreen } from './shared/game-types';
import { CHARACTERS } from './game/config';
import { SwarmScene, type HudData } from './game/SwarmScene';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) {
  throw new Error('게임 루트를 찾을 수 없습니다.');
}

function characterCard(id: CharacterId): string {
  const character = CHARACTERS[id];
  const healthRatio = Math.round((character.maxHealth / 170) * 100);
  const speedRatio = Math.round((character.speed / 275) * 100);
  return `
    <button id="select-${id}" class="character-card ${id}" type="button" data-character="${id}" disabled>
      <span class="card-index">0${id === 'scout' ? '1' : '2'} // OPERATIVE</span>
      <span class="card-heading">
        <strong>${character.name}</strong>
        <span class="operative-mark" aria-hidden="true">${id === 'scout' ? 'S' : 'H'}</span>
      </span>
      <span class="card-description">${character.description}</span>
      <span class="stat-row"><span>&#xCCB4;&#xB825; / HP</span><b>${character.maxHealth}</b></span>
      <span class="stat-track"><i style="width:${healthRatio}%"></i></span>
      <span class="stat-row"><span>기동 속도</span><b>${character.speed}</b></span>
      <span class="stat-track"><i style="width:${speedRatio}%"></i></span>
      <span class="card-loadout"><span>VX-7 RIFLE</span><span>예비 탄약 ${Math.round(120 * character.reserveAmmoMultiplier)}</span></span>
      <span class="deploy-label">${character.name}로 작전 시작 <span aria-hidden="true">→</span></span>
    </button>
  `;
}

app.innerHTML = `
  <main id="game-shell" data-screen="menu">
    <div id="game-stage" aria-label="SWARM ZERO 게임 화면"></div>
    <div class="screen-texture" aria-hidden="true"></div>

    <section id="hud" class="hud" aria-label="게임 상태" hidden>
      <div class="hud-top">
        <div class="hud-brand"><span>SWARM//ZERO</span><small>FACILITY 04 · LIVE</small></div>
        <div class="objective-panel">
          <div class="objective-heading"><span id="mission-phase">01 // INFILTRATE</span><span id="mission-metric">이동 필요</span></div>
          <strong id="mission-label">중앙 제어실로 침투</strong>
          <div class="objective-track"><i id="mission-fill"></i></div>
        </div>
        <button id="pause-button" class="icon-button" type="button" aria-label="일시정지">Ⅱ <span>ESC</span></button>
      </div>
      <div id="combat-notice" class="combat-notice" role="status" hidden></div>
      <div class="hud-bottom">
        <div class="vitals-panel">
          <div class="panel-label"><span>OPERATIVE VITALS</span><b id="health-text">100 / 100</b></div>
          <div class="health-track"><i id="health-fill"></i></div>
          <small>&#xCCB4;&#xB825; 신호 안정</small>
        </div>
        <div class="controls-hint">
          <span><kbd>WASD</kbd> 이동</span><span><kbd>MOUSE</kbd> 조준</span>
          <span><kbd>LMB</kbd> 자동 사격</span><span><kbd>R</kbd> 재장전</span>
        </div>
        <div class="ammo-panel">
          <div class="panel-label"><span>VX-7 // AUTO</span><span id="kill-count">0 KILLS</span></div>
          <div class="ammo-readout"><strong id="magazine-text">30</strong><span>/ <b id="reserve-text">120</b></span></div>
          <div id="reload-label" class="reload-label">R · 재장전</div>
          <div id="reload-track" class="reload-track" hidden><i id="reload-fill"></i></div>
        </div>
      </div>
    </section>

    <section id="menu-screen" class="overlay menu-screen">
      <div class="menu-content">
        <div class="menu-kicker"><span></span> ZERO HOUR PROTOCOL <span></span></div>
        <h1>SWARM<span>//</span>ZERO</h1>
        <p class="menu-subtitle">시설에 침투하고, 업로드를 방어하고, 살아서 탈출하세요.</p>
        <div class="mission-route" aria-label="작전 단계">
          <span><b>01</b> 침투</span><i></i><span><b>02</b> 방어</span><i></i><span><b>03</b> 탈출</span>
        </div>
        <div class="character-grid">
          ${characterCard('scout')}
          ${characterCard('heavy')}
        </div>
        <p class="menu-controls"><kbd>WASD</kbd> 이동 <span>·</span> 마우스 조준 <span>·</span> 왼쪽 버튼 사격 <span>·</span> <kbd>R</kbd> 재장전 <span>·</span> <kbd>ESC</kbd> 일시정지</p>
        <small class="boot-status" id="boot-status">전술 인터페이스 초기화 중…</small>
      </div>
    </section>

    <section id="pause-screen" class="overlay modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title" hidden>
      <div class="modal-panel">
        <span class="modal-kicker">TACTICAL LINK SUSPENDED</span>
        <h2 id="pause-title">작전 일시정지</h2>
        <p>전투와 임무 타이머가 멈췄습니다.</p>
        <button id="resume-button" class="primary-button" type="button">작전 재개 <kbd>ESC</kbd></button>
        <button id="pause-restart-button" class="secondary-button" type="button">같은 캐릭터로 재시작</button>
        <button id="pause-menu-button" class="text-button" type="button">캐릭터 선택으로 복귀</button>
      </div>
    </section>

    <section id="result-screen" class="overlay modal-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title" hidden>
      <div class="modal-panel result-panel">
        <span id="result-kicker" class="modal-kicker">OPERATIVE SIGNAL LOST</span>
        <h2 id="result-title">작전 실패</h2>
        <p id="result-description">스웜이 작전 구역을 장악했습니다.</p>
        <div class="result-stats"><span>처치</span><strong id="result-kills">0</strong><span>SWARMERS</span></div>
        <button id="restart-button" class="primary-button" type="button">즉시 재시작 <span>↻</span></button>
        <button id="menu-button" class="text-button" type="button">다른 캐릭터 선택</button>
      </div>
    </section>
  </main>
`;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`필수 UI 요소가 없습니다: ${id}`);
  }
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
let currentScreen: GameScreen = 'menu';
let latestKills = 0;

function updateScreen(screen: GameScreen): void {
  currentScreen = screen;
  shell.dataset.screen = screen;
  menuScreen.hidden = screen !== 'menu';
  pauseScreen.hidden = screen !== 'paused';
  resultScreen.hidden = screen !== 'dead' && screen !== 'victory';
  hud.hidden = screen === 'menu';
  if (screen === 'dead' || screen === 'victory') {
    const victory = screen === 'victory';
    resultScreen.dataset.result = victory ? 'victory' : 'dead';
    byId<HTMLElement>('result-kicker').textContent = victory ? 'EXTRACTION CONFIRMED' : 'OPERATIVE SIGNAL LOST';
    byId<HTMLElement>('result-title').textContent = victory ? '작전 완료' : '작전 실패';
    byId<HTMLElement>('result-description').textContent = victory
      ? '데이터를 확보하고 탈출했습니다. 시설의 스웜은 아직 활동 중입니다.'
      : '스웜이 작전 구역을 장악했습니다. 재배치하여 다시 시도하세요.';
    resultKills.textContent = String(latestKills);
  }
}

function updateHud(data: HudData): void {
  latestKills = data.kills;
  healthText.textContent = `${data.health} / ${data.maxHealth}`;
  const healthRatio = data.maxHealth > 0 ? data.health / data.maxHealth : 0;
  healthFill.style.width = `${Math.max(0, healthRatio) * 100}%`;
  healthFill.classList.toggle('critical', healthRatio <= 0.3);
  magazineText.textContent = String(data.magazine).padStart(2, '0');
  reserveText.textContent = String(data.reserve).padStart(3, '0');
  reloadTrack.hidden = !data.reloading;
  reloadFill.style.width = `${data.reloadRatio * 100}%`;
  reloadLabel.textContent = data.reloading
    ? `재장전 중 · ${Math.round(data.reloadRatio * 100)}%`
    : data.magazine === 0 && data.reserve === 0
      ? '탄약 소진'
      : data.magazine === 0
        ? 'R · 재장전 필요'
        : 'R · 재장전';
  const phaseLabels = {
    infiltrate: '01 // INFILTRATE',
    defend: '02 // DEFEND',
    extract: '03 // EXTRACT',
    complete: 'COMPLETE',
  } as const;
  missionPhase.textContent = phaseLabels[data.missionPhase];
  missionPhase.dataset.phase = data.missionPhase;
  missionLabel.textContent = data.missionLabel;
  missionMetric.textContent = data.missionPhase === 'defend'
    ? `${data.missionProgress.toFixed(1)} / ${data.missionTarget} SEC`
    : data.missionPhase === 'complete'
      ? '100%'
      : '목표 지점으로 이동';
  missionFill.style.width = `${data.missionTarget > 0 ? (data.missionProgress / data.missionTarget) * 100 : 0}%`;
  killCount.textContent = `${data.kills} KILLS`;
  resultKills.textContent = String(data.kills);
  combatNotice.textContent = data.notice;
  combatNotice.hidden = data.notice.length === 0;
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

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  width: 1280,
  height: 720,
  backgroundColor: '#070c10',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  audio: { noAudio: true },
  scene,
});
const uiEvents = new AbortController();

for (const button of characterButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.character;
    if (id === 'scout' || id === 'heavy') {
      scene.startRun(id);
    }
  }, { signal: uiEvents.signal });
}
byId<HTMLButtonElement>('pause-button').addEventListener('click', () => scene.pauseRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('resume-button').addEventListener('click', () => scene.resumeRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('pause-restart-button').addEventListener('click', () => scene.restartRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('restart-button').addEventListener('click', () => scene.restartRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('pause-menu-button').addEventListener('click', () => scene.returnToMenu(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('menu-button').addEventListener('click', () => scene.returnToMenu(), { signal: uiEvents.signal });

const controlledKeys = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
]);
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
  if (currentScreen !== 'playing' || !controlledKeys.has(event.code)) {
    return;
  }
  event.preventDefault();
  scene.setKey(event.code, true);
  if (event.code === 'KeyR' && !event.repeat) {
    scene.reloadWeapon();
  }
};
const onKeyUp = (event: KeyboardEvent): void => {
  if (controlledKeys.has(event.code) && currentScreen === 'playing') {
    event.preventDefault();
  }
  scene.setKey(event.code, false);
};
const onPointerUp = (): void => scene.setFiring(false);
const onBlur = (): void => {
  scene.setFiring(false);
  scene.pauseRun();
};
const onVisibility = (): void => {
  if (document.hidden) onBlur();
};
const preventContextMenu = (event: Event): void => event.preventDefault();
const preventWheel = (event: WheelEvent): void => event.preventDefault();
window.addEventListener('keydown', onKeyDown, { passive: false });
window.addEventListener('keyup', onKeyUp, { passive: false });
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('blur', onBlur);
document.addEventListener('visibilitychange', onVisibility);
document.addEventListener('contextmenu', preventContextMenu);
stage.addEventListener('wheel', preventWheel, { passive: false });

let destroyed = false;
let sawCanvas = false;
const observer = new MutationObserver(() => {
  if (stage.querySelector('canvas')) {
    sawCanvas = true;
  } else if (sawCanvas) {
    destroy();
  }
});

function destroy(): void {
  if (destroyed) return;
  destroyed = true;
  observer.disconnect();
  uiEvents.abort();
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('blur', onBlur);
  window.removeEventListener('pagehide', destroy);
  document.removeEventListener('visibilitychange', onVisibility);
  document.removeEventListener('contextmenu', preventContextMenu);
  stage.removeEventListener('wheel', preventWheel);
  if (window.swarmDiagnostics === diagnostics) {
    delete window.swarmDiagnostics;
  }
  game.destroy(true);
}

observer.observe(stage, { childList: true });
window.addEventListener('pagehide', destroy, { once: true });
if (import.meta.hot) {
  import.meta.hot.dispose(destroy);
}
