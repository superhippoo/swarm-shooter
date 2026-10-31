#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

export PATH="${NODE_HOME:-/c/Users/super/tools/node22}:$PATH"
PORT="${PORT:-4173}"
BASE_PATH="/swarm-shooter/"
CLOUDFLARED_EXE="${CLOUDFLARED_EXE:-$ROOT/artifacts/cloudflared/cloudflared.exe}"
LOCAL_ONLY="${LOCAL_ONLY:-0}"
if [[ "${1:-}" == "--local" ]]; then LOCAL_ONLY=1; fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf 'Node.js와 npm이 필요합니다. NODE_HOME으로 Node 22 경로를 지정하세요.\n' >&2
  exit 1
fi
if [[ ! -d "$ROOT/node_modules" ]]; then
  printf '의존성이 없습니다. 먼저 프로젝트에서 npm ci를 실행하세요.\n' >&2
  exit 1
fi
if [[ "$LOCAL_ONLY" != "1" && ! -f "$CLOUDFLARED_EXE" ]]; then
  printf 'cloudflared를 찾을 수 없습니다: %s\n' "$CLOUDFLARED_EXE" >&2
  printf 'CLOUDFLARED_EXE로 실행 파일 경로를 지정하거나 --local을 사용하세요.\n' >&2
  exit 1
fi
if [[ ! "$PORT" =~ ^[0-9]+$ ]]; then
  printf 'PORT는 숫자여야 합니다: %s\n' "$PORT" >&2
  exit 1
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  printf '최신 코드를 Pages 경로로 빌드합니다...\n'
  npm run build:pages
fi
if [[ ! -f "$ROOT/dist/index.html" ]]; then
  printf '빌드 결과가 없습니다: %s/dist/index.html\n' "$ROOT" >&2
  exit 1
fi

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/swarm-zero-public.XXXXXX")"
PREVIEW_LOG="$TEMP_DIR/preview.log"
TUNNEL_LOG="$TEMP_DIR/tunnel.log"
preview_pid=""
tunnel_pid=""
cleanup() {
  trap - EXIT
  if [[ -n "$tunnel_pid" ]]; then
    kill "$tunnel_pid" 2>/dev/null || true
    wait "$tunnel_pid" 2>/dev/null || true
  fi
  if [[ -n "$preview_pid" ]]; then
    kill "$preview_pid" 2>/dev/null || true
    wait "$preview_pid" 2>/dev/null || true
  fi
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

printf '로컬 미리보기를 시작합니다 (포트 %s)...\n' "$PORT"
MSYS_NO_PATHCONV=1 node node_modules/vite/bin/vite.js preview \
  --host 127.0.0.1 --port "$PORT" --strictPort --base="$BASE_PATH" \
  >"$PREVIEW_LOG" 2>&1 &
preview_pid=$!

ready=0
for ((attempt = 0; attempt < 60; attempt += 1)); do
  if ! kill -0 "$preview_pid" 2>/dev/null; then break; fi
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != "1" ]]; then
  printf '로컬 미리보기를 시작하지 못했습니다. 로그:\n' >&2
  cat "$PREVIEW_LOG" >&2
  exit 1
fi

printf '\n로컬 게임: http://127.0.0.1:%s%s\n' "$PORT" "$BASE_PATH"
printf '로컬 대시보드: http://127.0.0.1:%s%sdashboard.html\n' "$PORT" "$BASE_PATH"
printf '상태 API: http://127.0.0.1:%s/api/status\n' "$PORT"

if [[ "$LOCAL_ONLY" != "1" ]]; then
  printf '\nCloudflare 공개 터널을 시작합니다. URL을 기다리는 중...\n'
  "$CLOUDFLARED_EXE" tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate \
    >"$TUNNEL_LOG" 2>&1 &
  tunnel_pid=$!
  public_url=""
  for ((attempt = 0; attempt < 90; attempt += 1)); do
    if [[ -f "$TUNNEL_LOG" ]]; then
      while IFS= read -r line; do
        if [[ "$line" =~ (https://[A-Za-z0-9.-]+\.trycloudflare\.com) ]]; then
          public_url="${BASH_REMATCH[1]}"
          break
        fi
      done < "$TUNNEL_LOG"
    fi
    if [[ -n "$public_url" ]]; then break; fi
    if ! kill -0 "$tunnel_pid" 2>/dev/null; then break; fi
    sleep 1
  done
  if [[ -z "$public_url" ]]; then
    printf '공개 URL을 받지 못했습니다. 터널 로그:\n' >&2
    cat "$TUNNEL_LOG" >&2
    exit 1
  fi
  printf '\n공개 게임: %s%s\n' "$public_url" "$BASE_PATH"
  printf '공개 대시보드: %s%sdashboard.html\n' "$public_url" "$BASE_PATH"
  printf '공개 상태 API: %s/api/status\n' "$public_url"
fi

printf '\n브라우저에서 위 URL을 여세요. 종료하려면 Ctrl+C를 누르세요.\n'
while kill -0 "$preview_pid" 2>/dev/null; do
  if [[ -n "$tunnel_pid" ]] && ! kill -0 "$tunnel_pid" 2>/dev/null; then
    printf '공개 터널이 종료됐습니다. 터널 로그:\n' >&2
    cat "$TUNNEL_LOG" >&2
    exit 1
  fi
  sleep 2
done
printf '로컬 미리보기가 종료됐습니다. 로그:\n' >&2
cat "$PREVIEW_LOG" >&2
exit 1
