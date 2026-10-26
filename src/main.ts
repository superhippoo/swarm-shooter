import Phaser from 'phaser';
import './style.css';
import type { CharacterId, GameScreen, WeaponId } from './shared/game-types';
import { CHARACTERS, WEAPONS, WEAPON_ORDER } from './game/config';
import { SwarmScene, type HudData } from './game/SwarmScene';

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
        <span class="operative-mark" aria-hidden="true">${id === 'scout' ? 'S' : 'H'}</span>
      </span>
      <span class="card-description">${character.description}</span>
      <span class="stat-row"><span>HP</span><b>${character.maxHealth}</b></span>
      <span class="stat-track"><i style="width:${healthRatio}%"></i></span>
      <span class="stat-row"><span>기동 속도</span><b>${character.speed}</b></span>
      <span class="stat-track"><i style="width:${speedRatio}%"></i></span>
      <span class="card-loadout"><span>RS-7 · SG-4 · GL-2</span><span>3종 무기 보유</span></span>
      <span class="deploy-label">${character.name}(으)로 작전 시작 <span aria-hidden="true">→</span></span>
    </button>
  `;
}

app.innerHTML = `
  <main id="game-shell" data-screen="menu">
    <div id="game-stage" aria-label="SWARM ZERO 게임 화면"></div>
    <div class="screen-texture" aria-hidden="true"></div>
    <section id="hud" class="hud" aria-label="게임 상태" hidden>
      <div class="hud-top">
        <div class="hud-brand"><span>SWARM//ZERO</span><small>검은 이슬 · 노을 정화소</small></div>
        <div class="objective-panel">
          <div class="objective-heading"><span id="mission-phase">01 // INFILTRATE</span><span id="mission-metric">0%</span></div>
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
          <span><kbd>WASD</kbd> 이동</span><span><kbd>1/2/3</kbd> 무기</span>
          <span><kbd>LMB</kbd> 사격</span><span><kbd>R</kbd> 재장전</span>
        </div>
        <div class="ammo-panel">
          <div class="panel-label"><span id="current-weapon-name">RS-7 // AUTO</span><span id="kill-count">0 KILLS</span></div>
          <div id="weapon-slots" class="weapon-slots" role="group" aria-label="무기 선택">
            <button id="weapon-rifle" class="weapon-slot selected" type="button" data-weapon="rifle" aria-pressed="true"><kbd>1</kbd><span>RS-7</span><b id="weapon-rifle-ammo">30 / 180</b></button>
            <button id="weapon-shotgun" class="weapon-slot" type="button" data-weapon="shotgun" aria-pressed="false"><kbd>2</kbd><span>SG-4</span><b id="weapon-shotgun-ammo">6 / 36</b></button>
            <button id="weapon-launcher" class="weapon-slot" type="button" data-weapon="launcher" aria-pressed="false"><kbd>3</kbd><span>GL-2</span><b id="weapon-launcher-ammo">3 / 16</b></button>
          </div>
          <div class="ammo-readout"><strong id="magazine-text">30</strong><span>/ <b id="reserve-text">180</b></span></div>
          <div id="reload-label" class="reload-label">R · 재장전</div>
          <div id="reload-track" class="reload-track" hidden><i id="reload-fill"></i></div>
        </div>
      </div>
    </section>

    <section id="menu-screen" class="overlay menu-screen">
      <div class="menu-content">
        <div class="menu-kicker"><span></span> 검은 이슬 // BLACK DEW <span></span></div>
        <h1>SWARM<span>//</span>ZERO</h1>
        <p class="menu-subtitle">노을 정화소의 중계기를 깨우고, 신호를 방어하고, 북서 승강기로 탈출하세요.</p>
        <div class="mission-route" aria-label="작전 단계"><span><b>01</b> 침투</span><i></i><span><b>02</b> 25초 방어</span><i></i><span><b>03</b> 탈출</span></div>
        <div class="character-grid">${characterCard('scout')}${characterCard('heavy')}</div>
        <p class="menu-controls"><kbd>WASD</kbd> 이동 <span>·</span> 마우스 조준/사격 <span>·</span> <kbd>1/2/3</kbd> 또는 휠 무기 교체 <span>·</span> <kbd>R</kbd> 재장전 <span>·</span> <kbd>ESC</kbd> 일시정지</p>
        <small class="boot-status" id="boot-status">전술 인터페이스와 SVG 에셋 초기화 중…</small>
      </div>
    </section>

    <section id="pause-screen" class="overlay modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title" hidden>
      <div class="modal-panel">
        <span class="modal-kicker">TACTICAL LINK SUSPENDED</span>
        <h2 id="pause-title">작전 일시정지</h2>
        <p>전투, 웨이브, 재장전과 임무 시계가 멈췄습니다.</p>
        <label class="setting-row" for="shake-toggle"><span><b>화면 진동</b><small>발사와 폭발의 반동 효과</small></span><input id="shake-toggle" type="checkbox" checked /><i aria-hidden="true"></i></label>
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
        <div class="result-stats"><span>처치</span><strong id="result-kills">0</strong><span>HOSTILES</span></div>
        <button id="restart-button" class="primary-button" type="button">즉시 재시작 <span>↻</span></button>
        <button id="menu-button" class="text-button" type="button">다른 캐릭터 선택</button>
      </div>
    </section>
  </main>
`;

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
      ? '중계기 데이터를 확보하고 북서 승강기로 탈출했습니다.'
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
  byId<HTMLElement>('health-status').textContent = healthRatio <= 0.3 ? '위험 · 생명 신호 저하' : '생명 신호 안정';
  const selected = data.weapons.find((weapon) => weapon.id === data.selectedWeapon) ?? data.weapons[0];
  magazineText.textContent = String(selected.magazine).padStart(2, '0');
  reserveText.textContent = String(selected.reserve).padStart(3, '0');
  byId<HTMLElement>('current-weapon-name').textContent = `${WEAPONS[data.selectedWeapon].name} // ${WEAPONS[data.selectedWeapon].automatic ? 'AUTO' : 'SEMI'}`;
  for (const id of WEAPON_ORDER) {
    const weapon = data.weapons.find((candidate) => candidate.id === id)!;
    const button = byId<HTMLButtonElement>(`weapon-${id}`);
    button.classList.toggle('selected', id === data.selectedWeapon);
    button.classList.toggle('reloading', weapon.reloading);
    button.setAttribute('aria-pressed', String(id === data.selectedWeapon));
    byId<HTMLElement>(`weapon-${id}-ammo`).textContent = weapon.reloading
      ? '재장전'
      : `${weapon.magazine} / ${weapon.reserve}`;
  }
  reloadTrack.hidden = !selected.reloading;
  reloadFill.style.width = `${data.reloadRatio * 100}%`;
  reloadLabel.textContent = selected.reloading
    ? `재장전 중 · ${Math.round(data.reloadRatio * 100)}%`
    : selected.magazine === 0 && selected.reserve === 0
      ? '탄약 없음 · 비상 보급 대기'
      : selected.magazine === 0 ? 'R · 재장전 필요' : 'R · 재장전';
  const phaseLabels = { infiltrate: '01 // INFILTRATE', defend: '02 // DEFEND', extract: '03 // EXTRACT', complete: 'COMPLETE' } as const;
  missionPhase.textContent = phaseLabels[data.missionPhase];
  missionPhase.dataset.phase = data.missionPhase;
  missionLabel.textContent = data.missionLabel;
  missionMetric.textContent = `${Math.round(data.missionProgress * 100)}%`;
  missionFill.style.width = `${data.missionTarget > 0 ? data.missionProgress / data.missionTarget * 100 : 0}%`;
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
  backgroundColor: '#080d12',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true },
  scene,
});
const uiEvents = new AbortController();

for (const button of characterButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.character;
    if (id === 'scout' || id === 'heavy') scene.startRun(id);
  }, { signal: uiEvents.signal });
}
for (const button of weaponButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.weapon;
    if (id === 'rifle' || id === 'shotgun' || id === 'launcher') scene.selectWeapon(id);
  }, { signal: uiEvents.signal });
}
byId<HTMLButtonElement>('pause-button').addEventListener('click', () => scene.pauseRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('resume-button').addEventListener('click', () => scene.resumeRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('pause-restart-button').addEventListener('click', () => scene.restartRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('restart-button').addEventListener('click', () => scene.restartRun(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('pause-menu-button').addEventListener('click', () => scene.returnToMenu(), { signal: uiEvents.signal });
byId<HTMLButtonElement>('menu-button').addEventListener('click', () => scene.returnToMenu(), { signal: uiEvents.signal });
byId<HTMLInputElement>('shake-toggle').addEventListener('change', (event) => {
  scene.setShakeEnabled((event.currentTarget as HTMLInputElement).checked);
}, { signal: uiEvents.signal });

const controlledKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'Digit1', 'Digit2', 'Digit3', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
const weaponKeys: Record<string, WeaponId> = { Digit1: 'rifle', Digit2: 'shotgun', Digit3: 'launcher' };
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
const onPointerUp = (): void => scene.setFiring(false);
const onBlur = (): void => {
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
  uiEvents.abort();
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
