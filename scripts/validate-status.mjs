import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TASK_STATUSES = new Set(['pending', 'running', 'done', 'blocked', 'failed']);
const VERIFICATION_STATUSES = new Set(['pending', 'running', 'passed', 'failed', 'resolved', 'skipped']);
const FAILURE_STATUSES = new Set(['failed', 'resolved']);
const defaultStatusPath = fileURLToPath(new URL('../project-status.json', import.meta.url));
const statusPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : defaultStatusPath;
const displayPath = relative(process.cwd(), statusPath) || statusPath;
const errors = [];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function report(path, message) {
  errors.push(`${path}: ${message}`);
}

function requiredString(object, key, path) {
  const value = object[key];
  const fieldPath = `${path}.${key}`;
  if (typeof value !== 'string' || value.trim().length === 0) {
    report(fieldPath, '비어 있지 않은 문자열이어야 합니다.');
    return null;
  }
  return value;
}

function requiredObject(object, key, path) {
  const value = object[key];
  if (!isObject(value)) {
    report(`${path}.${key}`, '객체여야 합니다.');
    return {};
  }
  return value;
}

function requiredArray(object, key, path) {
  const value = object[key];
  if (!Array.isArray(value)) {
    report(`${path}.${key}`, '배열이어야 합니다.');
    return [];
  }
  return value;
}

function validateStringItems(values, path) {
  values.forEach((value, index) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      report(`${path}[${index}]`, '비어 있지 않은 문자열이어야 합니다.');
    }
  });
}

function validateDate(value, path) {
  if (typeof value === 'string' && value.trim().length > 0 && Number.isNaN(Date.parse(value))) {
    report(path, '해석 가능한 날짜·시각 문자열이어야 합니다.');
  }
}

function validateHttpUrl(value, path, allowRelative = false) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    report(path, '비어 있지 않은 URL 문자열이어야 합니다.');
    return;
  }

  try {
    const url = allowRelative ? new URL(value, 'http://localhost') : new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      report(path, 'HTTP(S) URL이어야 합니다.');
    }
  } catch {
    report(path, allowRelative ? '유효한 HTTP(S) 또는 로컬 상대 URL이어야 합니다.' : '유효한 절대 HTTP(S) URL이어야 합니다.');
  }
}

function validateGitRemote(value) {
  if (value === null) return;
  if (typeof value !== 'string' || value.trim().length === 0) {
    report('git.remote', '원격 저장소 URL 문자열 또는 null이어야 합니다.');
    return;
  }

  if (/^[\w.-]+@[\w.-]+:[^\s]+$/.test(value)) return;
  try {
    const url = new URL(value);
    if (!['http:', 'https:', 'ssh:', 'git:'].includes(url.protocol)) {
      report('git.remote', 'HTTP(S), SSH, Git URL 또는 SCP 형식이어야 합니다.');
    }
  } catch {
    report('git.remote', '유효한 저장소 URL이 아닙니다.');
  }
}

function validateRecords(records, path, allowedStatuses) {
  records.forEach((entry, index) => {
    const recordPath = `${path}[${index}]`;
    if (!isObject(entry)) {
      report(recordPath, '객체여야 합니다.');
      return;
    }

    requiredString(entry, 'name', recordPath);
    requiredString(entry, 'command', recordPath);
    requiredString(entry, 'runAt', recordPath);
    requiredString(entry, 'evidence', recordPath);
    validateDate(entry.runAt, `${recordPath}.runAt`);
    const status = requiredString(entry, 'status', recordPath);
    if (status && !allowedStatuses.has(status)) {
      report(`${recordPath}.status`, `허용되지 않은 상태입니다. 가능한 값: ${[...allowedStatuses].join(', ')}`);
    }
  });
}

function validateScreenshots(screenshots) {
  screenshots.forEach((entry, index) => {
    const path = `screenshots[${index}]`;
    if (typeof entry === 'string') {
      validateHttpUrl(entry, path, true);
      return;
    }
    if (!isObject(entry)) {
      report(path, 'URL 문자열 또는 스크린샷 객체여야 합니다.');
      return;
    }

    const candidate = entry.url ?? entry.src ?? entry.path;
    validateHttpUrl(candidate, `${path}.url`, true);
    for (const key of ['title', 'name', 'label', 'caption', 'description']) {
      if (key in entry && (typeof entry[key] !== 'string' || entry[key].trim().length === 0)) {
        report(`${path}.${key}`, '값이 있다면 비어 있지 않은 문자열이어야 합니다.');
      }
    }
  });
}

async function main() {
  let status;
  try {
    const source = await readFile(statusPath, 'utf8');
    status = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`상태 파일 검증 실패: ${displayPath}\n${message}`);
    process.exitCode = 1;
    return;
  }

  if (!isObject(status)) {
    console.error('상태 파일 검증 실패: 최상위 값은 JSON 객체여야 합니다.');
    process.exitCode = 1;
    return;
  }

  let schemaLabel = '없음 (초기 상태 허용)';
  if ('schemaVersion' in status) {
    if (!Number.isInteger(status.schemaVersion) || status.schemaVersion < 1) {
      report('schemaVersion', '1 이상의 정수여야 합니다.');
    } else {
      schemaLabel = `v${status.schemaVersion}`;
    }
  }

  const project = requiredObject(status, 'project', 'status');
  requiredString(project, 'name', 'project');
  requiredString(project, 'goal', 'project');
  requiredString(status, 'currentPhase', 'status');
  requiredString(status, 'currentTask', 'status');
  requiredString(status, 'updatedAt', 'status');
  requiredString(status, 'resumeNotes', 'status');
  validateDate(status.updatedAt, 'status.updatedAt');

  const tasks = requiredArray(status, 'tasks', 'status');
  let completedTasks = 0;
  tasks.forEach((entry, index) => {
    const path = `tasks[${index}]`;
    if (!isObject(entry)) {
      report(path, '객체여야 합니다.');
      return;
    }

    for (const key of ['id', 'owner', 'role', 'title', 'updatedAt']) {
      requiredString(entry, key, path);
    }
    validateDate(entry.updatedAt, `${path}.updatedAt`);
    const taskStatus = requiredString(entry, 'status', path);
    if (taskStatus && !TASK_STATUSES.has(taskStatus)) {
      report(`${path}.status`, `허용되지 않은 작업 상태입니다. 가능한 값: ${[...TASK_STATUSES].join(', ')}`);
    }
    if (taskStatus === 'done') completedTasks += 1;
    validateStringItems(requiredArray(entry, 'evidence', path), `${path}.evidence`);
  });

  if ('requests' in status) {
    const requests = requiredArray(status, 'requests', 'status');
    requests.forEach((entry, index) => {
      const path = `requests[${index}]`;
      if (!isObject(entry)) {
        report(path, '객체여야 합니다.');
        return;
      }
      for (const key of ['id', 'taskId', 'title', 'request', 'result', 'requestedAt']) {
        requiredString(entry, key, path);
      }
      validateDate(entry.requestedAt, `${path}.requestedAt`);
      const requestStatus = requiredString(entry, 'status', path);
      if (requestStatus && !TASK_STATUSES.has(requestStatus)) {
        report(`${path}.status`, '허용되지 않은 요청 상태입니다.');
      }
    });
  }

  const nextActions = requiredArray(status, 'nextActions', 'status');
  const verification = requiredArray(status, 'verification', 'status');
  const failures = requiredArray(status, 'failures', 'status');
  const knownIssues = requiredArray(status, 'knownIssues', 'status');
  const blockers = requiredArray(status, 'blockers', 'status');
  const changedFiles = requiredArray(status, 'changedFiles', 'status');
  const screenshots = requiredArray(status, 'screenshots', 'status');
  validateStringItems(nextActions, 'nextActions');
  validateStringItems(knownIssues, 'knownIssues');
  validateStringItems(blockers, 'blockers');
  validateStringItems(changedFiles, 'changedFiles');
  validateRecords(verification, 'verification', VERIFICATION_STATUSES);
  validateRecords(failures, 'failures', FAILURE_STATUSES);
  validateScreenshots(screenshots);

  const servers = requiredObject(status, 'servers', 'status');
  validateHttpUrl(servers.gameUrl, 'servers.gameUrl');
  validateHttpUrl(servers.dashboardUrl, 'servers.dashboardUrl');

  const git = requiredObject(status, 'git', 'status');
  requiredString(git, 'branch', 'git');
  requiredString(git, 'remoteSync', 'git');
  if (git.commit !== null) requiredString(git, 'commit', 'git');
  validateGitRemote(git.remote);

  if (errors.length > 0) {
    console.error(`상태 파일 검증 실패: ${displayPath} (${errors.length}건)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  const progress = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);
  console.log(`상태 파일 검증 통과: ${displayPath}`);
  console.log(`- 스키마: ${schemaLabel}`);
  console.log(`- 작업 진행률: ${progress}% (${completedTasks}/${tasks.length})`);
  console.log('- 필수 필드, 작업·검증 상태, URL 형식: 정상');
}

await main();
