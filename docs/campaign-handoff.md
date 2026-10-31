# 10단계 캠페인 구현·검증 인계 문서

- 기준 시각: 2026-10-31T12:55Z
- 브랜치: `main`
- 최종 커밋: `git log -1 --oneline`으로 확인
- 상태: 요청한 캠페인·모바일 화면·실행 스크립트와 전체 브라우저 회귀 검증 완료

## 1. 완료한 구현과 수정

- 10개 스테이지, 6종 목표, 유한 웨이브, 4개 해금 무기, 체크포인트 재시작과 `MISSION COMPLETE`
- 데스크톱 1280×720 `Scale.FIT`, 터치 브라우저 `Scale.RESIZE`
- 늦게 `(pointer: coarse)`가 바뀌는 경우와 `visualViewport` 크기 변경에도 캔버스·침머라가 브라우저 가로 화면을 채우도록 보정
- 작은 가로 화면에서는 데스크톱 무기 슬롯 대신 실제 터치 무기 순환 컨트롤을 검증
- `start-public.sh`, `start-public.cmd`로 Pages 빌드·프로덕션 미리보기·Cloudflare quick tunnel 실행
- 읽기 전용 `GameSnapshot.supplies`에 보급 위치·해금·활성 상태를 추가하고, 테스트 운전자가 실제 남은 보급만 추적
- 실제 입력 운전자의 장애물 경로, 조준 시야, 근접 무기 선택, 보급 접근 오차와 재장전 완료를 보정
- 자동 무기는 게임의 실제 사격 상태를 읽어 해제됐으면 마우스 눌림을 다시 입력하도록 동기화
- stress는 인위적인 사격 보류 없이 자연 전투 중 50기 이상·FPS·풀 상한을 검증

프로덕션 전투 수치·난이도를 이번 회귀 수정에서 낮추지 않았습니다. 치트와 상태 변경 디버그 함수는 없으며 `window.swarmDiagnostics()`는 읽기 전용 복사본만 반환합니다.

## 2. 최종 검증 결과

Windows Git Bash, Node.js 22.12.0에서 다음을 순서대로 실행했습니다.

```sh
export PATH="/c/Users/super/tools/node22:$PATH"
npx vitest run
npx tsc --noEmit
npm run verify
npm run test:e2e
npm run build:pages
```

- Vitest **56/56**
- TypeScript strict 검사 통과
- 상태 파일 검증과 Vite 프로덕션 빌드 통과
- 전체 Chromium E2E **25/25 통과(2.1시간)**
- `/swarm-shooter/` Pages 빌드 통과
- 기존 대형 JS 청크 경고는 남아 있습니다.

전체 실행의 캠페인 증거:

- 데스크톱 heavy: 10단계, **1,339기**, HP **137/520**
- 데스크톱 scout: 10단계, **1,370기**, HP **49/400**
- 모바일 heavy: 실제 터치 10단계, **1,360기**, HP **51/520**, bestMultiKill **48**
- stress heavy: 10단계, **1,352기**, HP **151/520**
- 최대 적 **72기**, 발사체·입자·지뢰 풀 상한 유지
- 캠페인 완주 기록의 page error **0건**

결과 파일은 `artifacts/e2e/2026-10-31T10-40-18-850Z-11104-528da384/` 아래 각 테스트의 `campaign-result.json`, `stress-result.json`에 있습니다. `artifacts/`는 Git에 포함하지 않습니다.

### stress 측정 환경

- headless Chromium 156, Windows, Node.js 22.12.0
- 10단계 최대 적 **72기**, FPS 표본 **40개**
- 평균 **10.94fps**, 중앙값 **11fps**, 최소 **10.3fps**, 최대 **11.8fps**
- 이 수치는 소프트웨어 렌더링 환경의 결과이며 실제 하드웨어 60fps 증거가 아닙니다.

## 3. 프로덕션과 공개 URL

같은 Pages 빌드에 대해 게임·대시보드·상태 API HTTP 200과 실제 입력 **4/4**를 각각 확인했습니다.

- 데스크톱 이동·사격·재장전·일시정지·현재 단계 재시작
- 모바일 두 손가락 이동·자동 조준 사격
- 이동 유지 중 재장전·무기 순환
- 초기 fine pointer에서 늦은 coarse 전환을 포함한 900×420 전체 화면

공개 URL:

- 게임: https://powerful-challenging-establishment-observations.trycloudflare.com/swarm-shooter/
- 대시보드: https://powerful-challenging-establishment-observations.trycloudflare.com/swarm-shooter/dashboard.html
- 상태 API: https://powerful-challenging-establishment-observations.trycloudflare.com/api/status

검증용 공개 미리보기는 `http://127.0.0.1:4182/swarm-shooter/`입니다. Cloudflare quick tunnel 주소는 임시이며 터널 종료 후 무효가 됩니다.

직접 다시 공개하려면:

```sh
# PowerShell
.\start-public.cmd

# Git Bash
./start-public.sh
```

로컬만 실행하려면 `--local`, 기존 빌드를 재사용하려면 `SKIP_BUILD=1`을 사용합니다.

## 4. 남은 검증 범위와 후속 작업

요청한 회귀 3건은 모두 해결됐고 미완료 E2E는 없습니다. 다음은 별도 실기기·후속 작업입니다.

- 실제 S26 Ultra 하드웨어의 FPS·발열·주소 표시줄 변화와 Safari는 자동 검증하지 않았습니다. 900×420 Chromium 시나리오와 공개 URL만 확인했습니다.
- 청감 사운드와 사격감은 사용자 플레이 피드백이 필요합니다.
- 하드웨어 가속 60fps와 Phaser 코드 분할은 별도 승인 작업입니다.
- 원격 push는 사용자가 명시적으로 승인할 때까지 실행하지 않습니다.

새 세션에서는 `PROJECT_MASTER.md`, `project-status.json`, `git status`, `git log`를 먼저 확인하고 완료된 캠페인을 다시 만들지 마세요.
