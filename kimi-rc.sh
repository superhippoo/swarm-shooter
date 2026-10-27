#!/usr/bin/env bash
set -euo pipefail

KIMI_EXE="${KIMI_EXE:-/c/Users/super/.kimi-code/bin/kimi.exe}"

if [[ ! -x "$KIMI_EXE" ]]; then
  printf 'Kimi CLI를 찾을 수 없습니다: %s\n' "$KIMI_EXE" >&2
  printf 'KIMI_EXE 환경 변수로 실행 파일 경로를 지정할 수 있습니다.\n' >&2
  exit 1
fi

printf 'Kimi Remote Control을 시작합니다. 아래 로그의 code-rc.kimi.com URL을 복사하세요.\n'
printf '종료하려면 Ctrl+C를 누르세요.\n\n'
exec "$KIMI_EXE" web --rc --no-open --log-level info
