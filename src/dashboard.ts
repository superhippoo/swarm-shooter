import './dashboard.css';

type JsonObject = Record<string, unknown>;
type ConnectionState = 'loading' | 'online' | 'error';

const REFRESH_INTERVAL = 3000;
const REQUEST_TIMEOUT = 8000;
const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Required dashboard element is missing: ${id}`);
  }
  return element as T;
}

const elements = {
  connectionIndicator: byId('connection-indicator'),
  connectionLabel: byId('connection-label'),
  refreshButton: byId<HTMLButtonElement>('refresh-button'),
  refreshLabel: byId('refresh-label'),
  syncError: byId('sync-error'),
  syncErrorMessage: byId('sync-error-message'),
  projectName: byId('project-name'),
  projectGoal: byId('project-goal'),
  currentPhase: byId('current-phase'),
  currentTask: byId('current-task'),
  progressRing: byId('progress-ring'),
  progressPercent: byId('progress-percent'),
  progressCount: byId('progress-count'),
  lastSuccess: byId('last-success'),
  statusUpdated: byId('status-updated'),
  activeCount: byId('active-count'),
  telemetryBlockers: byId('telemetry-blockers'),
  taskCount: byId('task-count'),
  taskList: byId('task-list'),
  nextActionCount: byId('next-action-count'),
  nextActions: byId('next-actions'),
  verificationCount: byId('verification-count'),
  verificationList: byId('verification-list'),
  failureCount: byId('failure-count'),
  failureList: byId('failure-list'),
  knownIssueCount: byId('known-issue-count'),
  knownIssues: byId('known-issues'),
  blockerCount: byId('blocker-count'),
  blockerList: byId('blocker-list'),
  gitBranch: byId('git-branch'),
  gitCommit: byId('git-commit'),
  gitRemote: byId('git-remote'),
  gitRemoteSync: byId('git-remote-sync'),
  gameLink: byId<HTMLAnchorElement>('game-link'),
  gameUrl: byId('game-url'),
  dashboardLink: byId<HTMLAnchorElement>('dashboard-link'),
  dashboardUrl: byId('dashboard-url'),
  screenshotCount: byId('screenshot-count'),
  screenshotList: byId('screenshot-list'),
  changedFileCount: byId('changed-file-count'),
  changedFiles: byId('changed-files'),
  resumeNotes: byId('resume-notes'),
};

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function displayText(value: unknown, fallback = '정보 없음'): string {
  if (typeof value === 'string') return optionalText(value) ?? fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatDate(value: unknown, fallback = '기록 없음'): string {
  const raw = optionalText(value);
  if (!raw) return fallback;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : dateFormatter.format(date);
}

function statusName(value: unknown): string {
  return optionalText(value)?.toLowerCase() ?? 'unknown';
}

const STATUS_LABELS: Record<string, string> = {
  done: '완료',
  completed: '완료',
  running: '진행 중',
  'in-progress': '진행 중',
  in_progress: '진행 중',
  pending: '대기',
  blocked: '차단됨',
  passed: '성공',
  failed: '실패',
  resolved: '해결됨',
  skipped: '생략됨',
  unknown: '알 수 없음',
};

const STATUS_TONES: Record<string, string> = {
  done: 'success',
  completed: 'success',
  passed: 'success',
  resolved: 'resolved',
  running: 'active',
  'in-progress': 'active',
  in_progress: 'active',
  pending: 'pending',
  skipped: 'neutral',
  blocked: 'danger',
  failed: 'danger',
};

function createStatusBadge(value: unknown): HTMLSpanElement {
  const status = statusName(value);
  const tone = STATUS_TONES[status] ?? 'neutral';
  const badge = make('span', `status-badge status-badge--${tone}`, STATUS_LABELS[status] ?? displayText(value, '알 수 없음'));
  badge.dataset.status = status;
  return badge;
}

function emptyState(message: string): HTMLDivElement {
  const empty = make('div', 'empty-state');
  empty.append(make('span', 'empty-state__mark', '--'), make('p', '', message));
  return empty;
}

function renderTextList(target: HTMLElement, values: unknown[], emptyMessage: string): void {
  target.replaceChildren();
  if (values.length === 0) {
    target.append(make('li', 'empty-list-item', emptyMessage));
    return;
  }

  for (const value of values) {
    target.append(make('li', '', displayText(value, '세부 정보 없음')));
  }
}

function renderCodeList(target: HTMLElement, values: unknown[]): void {
  target.replaceChildren();
  if (values.length === 0) {
    target.append(make('li', 'empty-list-item', '기록된 변경 파일이 없습니다.'));
    return;
  }

  for (const value of values) {
    const item = make('li');
    item.append(make('span', 'file-list__marker', '>'), make('code', '', displayText(value, '파일 경로 없음')));
    target.append(item);
  }
}

function renderTasks(tasks: unknown[]): void {
  elements.taskList.replaceChildren();
  if (tasks.length === 0) {
    elements.taskList.append(emptyState('등록된 작업이 없습니다. 상태 파일에 tasks 배열을 추가하세요.'));
    return;
  }

  tasks.forEach((entry, index) => {
    const task = asObject(entry);
    const card = make('article', 'task-card');
    card.dataset.status = statusName(task.status);

    const header = make('div', 'task-card__header');
    header.append(
      make('span', 'task-card__id', displayText(task.id, `task-${index + 1}`)),
      createStatusBadge(task.status),
    );

    const title = make('h3', 'task-card__title', displayText(task.title, '제목 없는 작업'));
    const metadata = make('dl', 'task-card__meta');
    const fields: Array<[string, string]> = [
      ['OWNER', displayText(task.owner, '미지정')],
      ['ROLE', displayText(task.role, '미지정')],
      ['UPDATED', formatDate(task.updatedAt)],
    ];
    for (const [label, value] of fields) {
      const field = make('div');
      field.append(make('dt', '', label), make('dd', '', value));
      metadata.append(field);
    }

    const evidence = make('div', 'task-card__evidence');
    evidence.append(make('span', 'field-label', 'EVIDENCE'));
    const evidenceValues = asArray(task.evidence);
    if (evidenceValues.length === 0) {
      evidence.append(make('p', 'evidence-empty', '등록된 증빙 자료가 없습니다.'));
    } else {
      const list = make('ul', 'evidence-list');
      for (const value of evidenceValues) {
        list.append(make('li', '', displayText(value, '증빙 세부 정보 없음')));
      }
      evidence.append(list);
    }

    card.append(header, title, metadata, evidence);
    elements.taskList.append(card);
  });
}

function renderRecords(target: HTMLElement, records: unknown[], variant: 'verification' | 'failure'): void {
  target.replaceChildren();
  if (records.length === 0) {
    const message = variant === 'verification' ? '등록된 검증 결과가 없습니다.' : '기록된 실패와 해결 이력이 없습니다.';
    target.append(emptyState(message));
    return;
  }

  for (const entry of records) {
    const record = asObject(entry);
    const card = make('article', `record-card record-card--${variant}`);
    card.dataset.status = statusName(record.status);

    const header = make('div', 'record-card__header');
    header.append(
      make('h3', '', displayText(record.name, '이름 없는 기록')),
      createStatusBadge(record.status),
    );

    const command = make('code', 'record-card__command', displayText(record.command, '검증 명령 없음'));
    const runAt = make('p', 'record-card__time', `RUN AT / ${formatDate(record.runAt)}`);
    const evidence = make('p', 'record-card__evidence', displayText(record.evidence, '증빙 기록 없음'));
    card.append(header, command, runAt, evidence);
    target.append(card);
  }
}

function normalizedUrl(value: unknown): string | null {
  const candidate = optionalText(value);
  if (!candidate) return null;

  try {
    const url = new URL(candidate, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function renderResourceLink(anchor: HTMLAnchorElement, label: HTMLElement, value: unknown, fallback: string): void {
  const href = normalizedUrl(value) ?? normalizedUrl(fallback) ?? fallback;
  anchor.href = href;
  label.textContent = href;
}

function renderScreenshots(screenshots: unknown[]): void {
  elements.screenshotList.replaceChildren();
  if (screenshots.length === 0) {
    elements.screenshotList.append(emptyState('등록된 스크린샷이 없습니다. 캡처 후 screenshots 배열에 경로를 추가하세요.'));
    return;
  }

  screenshots.forEach((entry, index) => {
    const data = asObject(entry);
    const candidate = typeof entry === 'string' ? entry : data.url ?? data.src ?? data.path;
    const href = normalizedUrl(candidate);
    const card = make(href ? 'a' : 'div', 'screenshot-card');
    if (card instanceof HTMLAnchorElement && href) {
      card.href = href;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    }

    const top = make('div', 'screenshot-card__top');
    top.append(
      make('span', 'screenshot-card__index', String(index + 1).padStart(2, '0')),
      make('span', 'screenshot-card__action', href ? 'OPEN LINK ↗' : 'INVALID LINK'),
    );
    const label = make(
      'strong',
      'screenshot-card__title',
      displayText(data.title ?? data.name ?? data.label, `스크린샷 ${index + 1}`),
    );
    const url = make('code', 'screenshot-card__url', displayText(candidate, 'URL 없음'));
    card.append(top, label, url);
    const caption = optionalText(data.caption ?? data.description);
    if (caption) card.append(make('p', 'screenshot-card__caption', caption));
    elements.screenshotList.append(card);
  });
}

function renderStatus(status: JsonObject): void {
  const project = asObject(status.project);
  const tasks = asArray(status.tasks);
  const nextActions = asArray(status.nextActions);
  const verification = asArray(status.verification);
  const failures = asArray(status.failures);
  const knownIssues = asArray(status.knownIssues);
  const blockers = asArray(status.blockers);
  const screenshots = asArray(status.screenshots);
  const changedFiles = asArray(status.changedFiles);
  const servers = asObject(status.servers);
  const git = asObject(status.git);

  elements.projectName.textContent = displayText(project.name, 'SWARM//ZERO');
  elements.projectGoal.textContent = displayText(project.goal, '프로젝트 목표가 아직 등록되지 않았습니다.');
  elements.currentPhase.textContent = displayText(status.currentPhase, '현재 단계 정보 없음');
  elements.currentTask.textContent = displayText(status.currentTask, '현재 작업 정보 없음');
  elements.statusUpdated.textContent = formatDate(status.updatedAt, '상태 파일 갱신 시각 없음');

  const done = tasks.filter((entry) => statusName(asObject(entry).status) === 'done').length;
  const running = tasks.filter((entry) => {
    const statusValue = statusName(asObject(entry).status);
    return statusValue === 'running' || statusValue === 'in-progress' || statusValue === 'in_progress';
  }).length;
  const percentage = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  elements.progressPercent.textContent = `${percentage}%`;
  elements.progressCount.textContent = `${done} / ${tasks.length}`;
  elements.progressRing.style.setProperty('--progress-angle', `${percentage * 3.6}deg`);
  elements.progressRing.setAttribute('aria-valuenow', String(percentage));
  elements.progressRing.setAttribute('aria-valuetext', `전체 ${tasks.length}개 작업 중 ${done}개 완료`);
  elements.activeCount.textContent = String(running);
  elements.taskCount.textContent = `${tasks.length} TASKS`;

  renderTasks(tasks);

  elements.nextActionCount.textContent = `${nextActions.length}개`;
  renderTextList(elements.nextActions, nextActions, '다음 작업이 모두 정리됐습니다.');

  elements.verificationCount.textContent = `${verification.length}개`;
  renderRecords(elements.verificationList, verification, 'verification');

  elements.failureCount.textContent = `${failures.length}개`;
  renderRecords(elements.failureList, failures, 'failure');

  elements.knownIssueCount.textContent = String(knownIssues.length);
  elements.blockerCount.textContent = String(blockers.length);
  elements.telemetryBlockers.textContent = String(blockers.length);
  renderTextList(elements.knownIssues, knownIssues, '현재 알려진 문제가 없습니다.');
  renderTextList(elements.blockerList, blockers, '현재 차단된 작업이 없습니다.');

  elements.gitBranch.textContent = displayText(git.branch, '브랜치 정보 없음');
  elements.gitCommit.textContent = displayText(git.commit, '아직 커밋 없음');
  elements.gitRemote.textContent = displayText(git.remote, '원격 저장소 없음');
  elements.gitRemoteSync.textContent = displayText(git.remoteSync, '동기화 상태 없음');
  renderResourceLink(elements.gameLink, elements.gameUrl, servers.gameUrl, '/');
  renderResourceLink(elements.dashboardLink, elements.dashboardUrl, servers.dashboardUrl, '/dashboard.html');

  elements.screenshotCount.textContent = `${screenshots.length}개`;
  renderScreenshots(screenshots);

  elements.changedFileCount.textContent = `${changedFiles.length}개`;
  renderCodeList(elements.changedFiles, changedFiles);
  elements.resumeNotes.textContent = displayText(status.resumeNotes, '기록된 재개 메모가 없습니다.');
}

function setConnectionState(state: ConnectionState): void {
  elements.connectionIndicator.dataset.state = state;
  const labels: Record<ConnectionState, string> = {
    loading: '상태 동기화 중',
    online: '로컬 API 연결됨',
    error: 'API 연결 오류',
  };
  elements.connectionLabel.textContent = labels[state];
}

function updateLastSuccess(lastSuccessAt: Date | null): void {
  elements.lastSuccess.textContent = lastSuccessAt ? dateFormatter.format(lastSuccessAt) : '아직 성공 응답 없음';
}

function errorText(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return '요청 시간이 8초를 초과했습니다.';
  }
  return error instanceof Error ? error.message : String(error);
}

let lastStatus: JsonObject | null = null;
let lastSuccessAt: Date | null = null;
let isRefreshing = false;

async function refresh(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;
  setConnectionState('loading');
  elements.refreshButton.disabled = true;
  elements.refreshButton.classList.add('is-loading');
  elements.refreshLabel.textContent = '수신 중...';

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch('/api/status', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());

    const payload: unknown = await response.json();
    if (!isObject(payload)) throw new Error('상태 API 응답이 JSON 객체가 아닙니다.');

    renderStatus(payload);
    lastStatus = payload;
    lastSuccessAt = new Date();
    updateLastSuccess(lastSuccessAt);
    elements.syncError.hidden = true;
    elements.syncErrorMessage.textContent = '';
    setConnectionState('online');
  } catch (error) {
    const retainedMessage = lastStatus
      ? '마지막 정상 데이터를 화면에 유지합니다.'
      : '아직 정상 데이터가 없어 빈 상태로 표시합니다.';
    elements.syncErrorMessage.textContent = `${errorText(error)} · ${retainedMessage}`;
    elements.syncError.hidden = false;
    setConnectionState('error');
  } finally {
    window.clearTimeout(timeout);
    isRefreshing = false;
    elements.refreshButton.disabled = false;
    elements.refreshButton.classList.remove('is-loading');
    elements.refreshLabel.textContent = '지금 새로고침';
  }
}

renderStatus({});
updateLastSuccess(lastSuccessAt);
elements.refreshButton.addEventListener('click', () => void refresh());
void refresh();
window.setInterval(() => void refresh(), REFRESH_INTERVAL);
