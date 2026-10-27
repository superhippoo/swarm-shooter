# SWARM//ZERO 프로젝트 마스터 문서

이 문서는 다른 PC와 다른 세션에서 현재 프로젝트를 그대로 이어서 작업하기 위한 단일 출발점입니다. 먼저 이 문서를 읽고, 이어서 `project-status.json`, `README.md`, `git status`, `git log`를 확인하세요.

- 기준일: 2026-10-26
- 원격 저장소: https://github.com/superhippoo/swarm-shooter.git
- 기본 브랜치: `main`
- 원격 공개 상태: `PUBLIC`
- 현재 단계: **완결형 MVP와 실제 브라우저 검증 완료**

## 1. 만들고자 한 것

에일리언 슈터 1의 “탑다운 시점에서 몰려오는 몬스터를 강력한 무기로 처치하는 호쾌한 사격감”에서 영감을 받은 웹 게임을 만드는 것이 목표였습니다. 원작의 이름, 맵, 캐릭터, 그래픽, 사운드, 데이터는 복사하지 않고 독창적인 에셋과 시스템을 사용합니다.

가장 중요한 요구사항은 단순한 발사 기능이 아니라 자동 소총·산탄총·폭발 무기가 서로 다르고 시원하게 느껴지는 실제 전투 경험입니다. 또한 메인 에이전트와 역할별 서브에이전트의 작업 상태를 브라우저 대시보드에서 실제 값으로 확인할 수 있어야 합니다.

### 현재 범위에서 제외

온라인 멀티플레이어, 로그인, 결제, 외부 DB, 모바일 전용 앱·세로 방향 전투, 추가 맵, 캐릭터 육성, 상점은 제외합니다. 후속 확장은 사용자 승인 후 별도 작업으로 정의하며 모바일 가로 웹 컨트롤은 승인된 확장으로 추가했습니다.

## 2. 현재 완성 상태

다음이 모두 구현되고 실제 Chromium에서 검증됐습니다.

- 캐릭터 2종: `scout` / `heavy`
- 무기 3종: `rifle` / `shotgun` / `launcher`
- 적 3종: `swarmer` / `skitter` / `brute`
- 맵 1개와 침투 → 방어 → 탈출의 완결된 임무
- 생명력·탄약 보급, 전탄 소진 후 비상 소총 탄약
- 승리·사망·재시작·캐릭터 선택·일시정지·화면 진동 설정
- 총구 화염, 탄환 궤적, 피격 flash, 넉백, 입자, 폭발, 사망 흔적, 합성 사운드
- 독창적 SVG와 Web Audio
- 객체 풀, 공간 해시, 화면 밖 렌더링 제한
- `project-status.json` 기반 실시간 개발 대시보드
- 모바일 가로 컨트롤: 왼쪽 이동 스틱·자동 조준·사격·재장전·무기·일시정지 버튼
- 단위 테스트와 실제 키보드·마우스·터치 기반 브라우저 테스트

완료된 작업을 다시 구현할 필요는 없습니다. 다음 작업은 기존 코드와 테스트를 유지한 상태에서 추가하거나 수정해야 합니다.

## 3. 실제 게임 규칙

### 캐릭터

| ID | 이름 | HP | 이동 속도 | 재장전 배율 | 예비 탄약 배율 |
|---|---|---:|---:|---:|---:|
| `scout` | 윤하 | 400 | 245 | 0.85 | 1.00 |
| `heavy` | 브런 | 520 | 180 | 1.10 | 1.25 |

### 무기

| ID | 이름 | 역할 | 탄창 | 기본 예비 탄약 | 발사 방식 |
|---|---|---|---:|---:|---|
| `rifle` | RS-7 바늘 | 자동 연사·원거리 지속 화력 | 30 | 180 | 누르는 동안 자동 사격 |
| `shotgun` | SG-4 파편 | 근접 8펠릿·강한 반동 | 6 | 36 | 새 클릭마다 1회 |
| `launcher` | GL-2 공명 | 느린 발사체·반경 120px 폭발 | 3 | 16 | 새 클릭마다 1회 |

캐릭터별 실제 재장전 시간과 예비 탄약은 `docs/balance.md`와 `src/game/config.ts`를 기준으로 합니다. 수치를 바꾸면 관련 문서와 단위 테스트도 함께 갱신해야 합니다.

### 적

| ID | 이름 | HP | 속도 | 접촉 피해 | 특징 |
|---|---|---:|---:|---:|---|
| `swarmer` | 쇄도충 | 30 | 115 | 5 | 소형 직접 추적 |
| `skitter` | 잔상충 | 55 | 200 | 8 | 빠른 측면 편향 추적 |
| `brute` | 철갑충 | 330 | 70 | 16 | 저속 탱크·고접촉 피해 |

플레이어의 공통 피격 무적 시간은 1000ms입니다. 보급 상자는 HP 45와 세 무기 최대 예비 탄약의 40%를 회복합니다. 세 무기의 총탄약이 0인 상태가 1500ms 지속되면 `rifle.reserve += 24`가 적용되고 소총 선택과 재장전을 시도합니다. 비상 보급 쿨다운은 6000ms입니다.

### 임무 좌표와 상태

월드는 2400×1600px입니다.

1. `infiltrate`: 시작 `(240,1300)` → 중계기 `(1900,800)`에 90px 이내 도달
2. `defend`: 중계기 반경 300px 안에서 활성 방어 시간 25초 누적
3. `extract`: 북서 승강기 `(240,240)`에 90px 이내 도달
4. `complete`: 승리 화면과 시뮬레이션 정지

방어 구역을 벗어나면 방어 시간과 방어 스폰만 정지하고 기존 적과 전투는 계속됩니다. 사망하면 `dead`, 재시작하면 같은 캐릭터로 초기화되고 `runId`가 증가합니다.

### 조작

데스크톱:

- `WASD`: 이동
- 마우스: 조준
- 마우스 왼쪽 버튼: 사격
- `1`, `2`, `3` 또는 마우스 휠: 무기 교체
- `R`: 재장전
- `Esc`: 일시정지·재개
- 일시정지의 `#shake-toggle`: 화면 진동 켜기·끄기

모바일 가로 화면:

- 왼쪽 스틱: 이동
- 자동 조준: 화면에 보이는 활성 적 중 장애물에 가려지지 않은 가장 가까운 적 추적
- `FIRE`: 소총은 유지 시 연사, 산탄총·발사기는 새 탭마다 한 발
- `재장전`과 무기 버튼: 재장전·무기 교체
- `Ⅱ`: 일시정지·재개
- 세로 전환 시 전투 일시정지와 회전 안내, 가로 복귀 후 재개 버튼으로 계속 진행

## 4. 기술 스택과 구조

### 버전

- TypeScript 5.9.3
- Vite 8.3.5
- Phaser 3.90.0
- Vitest 4.1.12
- Playwright 1.64.1
- Node.js 20.19 이상 또는 22.12 이상 권장
- npm 11.6.2 권장(과거 npm 10.9.3의 Arborist 오류를 npm 11.6.2로 해결)

### 주요 파일

| 경로 | 역할 |
|---|---|
| `src/game/SwarmScene.ts` | 게임 장면, 전투, AI, 임무, 보급, 풀, 터치 이동·자동 조준, 진단 |
| `src/game/config.ts` | 캐릭터·무기·적·웨이브·보급·객체 상한 |
| `src/game/logic.ts` | 탄약·재장전·폭발·임무·충돌·스틱·자동 조준 순수 로직 |
| `src/game/logic.test.ts` | Vitest 24개 |
| `src/game/touch-controls.ts` | DOM 스틱·사격 버튼의 멀티터치 추적과 입력 해제 |
| `src/game/spatial.ts` | 128px 공간 해시 |
| `src/game/audio.ts` | Web Audio 합성음과 12 voice 관리 |
| `src/game/textures.ts` | SVG preload와 생성 텍스처 fallback |
| `src/main.ts` | 캐릭터 선택·HUD·입력·결과 UI·화면 방향 |
| `src/style.css` | 데스크톱·모바일 게임과 HUD 스타일 |
| `src/shared/game-types.ts` | 공통 ID·상태·진단 타입 |
| `dashboard.html`, `src/dashboard.*` | 개발 대시보드 |
| `server/project-status.ts` | Vite 개발·미리보기 상태 API 플러그인 |
| `scripts/validate-status.mjs` | 상태 파일 유효성 검증 |
| `project-status.json` | 실제 작업 상태의 단일 원천 |
| `tests/e2e/**` | 실제 키보드·마우스·터치·성능 테스트 |
| `docs/game-plan.md` | 임무·웨이브·보급·완료 기준 |
| `docs/balance.md` | 실제 수치와 사격 규칙 |
| `docs/art-direction.md` | 독창적 에셋과 UI 방향 |
| `docs/architecture.md` | 파일 소유권과 공통 계약 |
| `README.md` | 실행·조작·검증 방법 |

`window.swarmDiagnostics()`는 읽기 전용 상태 복사본을 반환합니다. 이동·피해·승리 등을 실행하는 치트나 디버그 변경 함수는 없습니다. 테스트는 이 상태를 읽고 실제 키보드·마우스·터치를 조작합니다.

## 5. 다른 PC에서 실행하기

```bash
git clone https://github.com/superhippoo/swarm-shooter.git
cd swarm-shooter
npm ci
npm run dev
```

접속 주소:

- 게임: http://127.0.0.1:5173/
- 개발 대시보드: http://127.0.0.1:5173/dashboard.html
- 상태 API: http://127.0.0.1:5173/api/status

프로덕션 확인:

```bash
npm run build
npm run preview
```

미리보기는 기본적으로 `http://127.0.0.1:4173/`입니다.

### 브라우저 테스트 준비

```bash
npm run browser:install
npm run verify
npm run test:e2e
```

Linux에서 Chromium 실행 라이브러리가 없다면 Playwright의 `install-deps` 안내가 필요할 수 있습니다. 시스템 설치가 가능하면 다음을 사용합니다.

```bash
npx playwright install-deps chromium
```

원본 작업 환경에는 관리자 권한 없이 푼 `artifacts/browser-libs`와 한글 글꼴 설정이 있었지만, `artifacts/`는 Git에 포함하지 않으므로 다른 PC에서는 시스템 의존성을 설치하거나 같은 형태의 로컬 라이브러리를 다시 준비해야 합니다. 실행기는 해당 파일들이 있을 때만 사용합니다.

다른 포트가 필요하면 `SWARM_DEV_PORT` 또는 `SWARM_BASE_URL`을 지정합니다.

## 6. 현재 검증 증거

최종 완료 시점에 다음을 실제로 실행하고 통과했습니다.

- `npm run verify`: 상태 검증, Vitest **21/21**, TypeScript, Vite 프로덕션 빌드 통과
- `npm run test:e2e`: 실제 Chromium 테스트 **13/13 통과**
- 두 캐릭터 모두 실제 입력으로 침투·25초 방어·탈출·승리·재시작
- 세 무기의 자동·반자동·산탄·폭발 피해와 재장전·진동 설정
- 실제 접촉 피해로 사망하고 같은 캐릭터로 재시작
- 세 무기 소진 후 약 1.1초 만에 소총 예비 탄약 24발과 자동 재장전 확인
- 독립 복사본에서 `npm ci`, 빌드, 브라우저 테스트 6건 통과
- 프로덕션 미리보기의 게임·대시보드·상태 API 접속과 page error 0
- `npm audit`: 취약점 0건
- 자연 웨이브 71기와 발사체·입자·적 풀 상한 유지

### 성능 측정과 미검증

최종 스트레스 측정은 headless Chromium 156, Linux, SwiftShader 소프트웨어 WebGL에서 이뤄졌습니다. 자연 웨이브 71기, 평균 **18.43fps**였습니다. 하드웨어 가속 브라우저의 60fps 여부는 확인하지 못했습니다. 실제 사용자 청감의 사격감과 사운드도 자동 검증으로 판정할 수 없으므로 사용자 플레이 피드백이 필요합니다.

프로덕션 게임 JS는 Phaser 포함 약 1.26MB로 Vite 청크 크기 경고가 있습니다. 기능 오류는 아니며 후속 코드 분리 후보입니다.

## 6-1. 모바일 후속 검증

2026-10-27에 다음을 실제로 실행하고 개별 통과했습니다.

- `npm run verify`: 상태 검증, Vitest **24/24**, TypeScript, Vite 프로덕션 빌드 통과
- `npm run test:e2e -- mobile-controls.spec.ts`: 데스크톱 입력 유지와 모바일 컨트롤 **6/6** 통과
- `npm run test:e2e -- mobile-mission.spec.ts`: heavy가 터치만으로 **134.324초·HP 371/520·102처치**로 승리하고 재시작
- `npm run test:e2e -- tests/e2e/mission.spec.ts`: 데스크톱 heavy **162.893초·HP 292/520**, scout **149.553초·HP 312/400** 완주
- `npm run test:e2e -- emergency.spec.ts`: 318.596초 만에 세 무기를 소진하고 1.462초 만에 소총 예비 탄약 24와 자동 재장전 확인
- 공개 Cloudflare 터널에서 모바일 캐릭터 선택, 126.32px 이동, 소총 30→27발 사격, 자동 조준과 page error 0 확인

전체 Chromium 20개 회귀 검증과 최종 상태 갱신은 `project-status.json`을 기준으로 합니다. 실제 모바일 하드웨어 FPS, Safari, 청감 사격감·사운드는 자동 검증하지 않았으므로 실기기 확인이 필요합니다.

## 7. Git 상태와 커밋 규칙

주요 커밋은 2026-10-26 전체 작성자·커미터를 `superhippoo`로 재작성하면서 해시가 변경됐습니다.

1. `7dcbf55` — `feat: add playable vertical slice and development dashboard`
2. `69d9e34` — `feat: complete swarm shooter MVP`
3. `f977d9b` — `docs: add cross-session project handoff guide`
4. `573a2f3` — `docs: record remote handoff sync`
5. `cbc3a3b` — `docs: point handoff status at current head`

이 문서 갱신 및 그 이후의 추가 커밋은 `HEAD`와 Git 로그로 확인하세요.

```bash
git status --short --branch
git log --oneline -5
git ls-remote origin
```

`project-status.json`은 실시간 대시보드의 상태 원천이므로 커밋 이후에도 수정될 수 있습니다. 이를 오래된 코드나 실패한 작업으로 되돌리지 말고, 현재 파일과 Git 이력을 함께 확인하세요.

검증되지 않은 작업을 `done`으로 기록하거나 주관적인 진행률을 만들지 마세요. 진행률은 실제 완료 작업 수/전체 작업 수로만 계산합니다. 완료 기록에는 명령·시각·실제 증거를 남깁니다.

## 8. 다른 세션에서 작업을 재개하는 순서

1. 저장소의 `AGENTS.md`가 있으면 먼저 확인합니다.
2. 이 문서, `project-status.json`, `README.md`, `docs/`의 계획 문서를 읽습니다.
3. `git status --short --branch`, `git log --oneline -5`, `git ls-remote origin`으로 로컬과 원격 상태를 확인합니다.
4. 미커밋 변경이 있으면 덮어쓰거나 되돌리지 말고 내용을 먼저 확인합니다. 원격 업데이트가 필요하고 작업 트리가 깨끗하면 `git pull --ff-only`를 사용합니다.
5. 완료된 MVP를 다시 만들지 말고 남은 작업과 사용자가 새로 승인한 작업만 수행합니다.
6. 변경 전에는 관련 기존 테스트를 실행하고, 변경 후에는 `npm run verify`와 필요한 실제 브라우저 테스트를 통과합니다.
7. 작업 상태는 메인 에이전트만 `project-status.json`에 갱신하고, 대시보드와 재개 정보를 최신으로 유지합니다.
8. 메인 에이전트만 서브에이전트 생성·배정·재배치를 합니다. 서브에이전트는 추가 에이전트를 생성하지 않습니다.
9. 검증 없이 완료 보고를 하지 않으며, 커밋은 검증된 단계별로 생성합니다. 원격 push는 사용자의 명시적 승인이 있는 경우에만 합니다.

## 9. 다른 세션에 그대로 붙여넣을 명령 프롬프트

다음 프롬프트를 새 세션에 붙여넣고 마지막 줄의 작업을 바꾸면 됩니다.

```text
당신은 이 프로젝트의 총괄 메인 개발 에이전트입니다. 계획만 작성하지 말고 실제 구현·실행·검증까지 수행하세요.

현재 저장소는 /path/to/swarm-shooter 입니다. 먼저 다음을 읽고 현재 상태를 확인하세요.
- PROJECT_MASTER.md
- project-status.json
- README.md
- docs/game-plan.md, docs/balance.md, docs/art-direction.md, docs/architecture.md
- AGENTS.md가 있다면 해당 지침
- git status --short --branch
- git log --oneline -5
- git ls-remote origin

현재는 완결형 MVP와 전체 13개 Chromium 테스트가 완료된 상태입니다. 완료된 게임을 다시 만들거나 기존 변경을 덮어쓰지 마세요. 미커밋 변경은 먼저 확인하고 임의로 되돌리지 마세요.

작업 규칙:
- 기존 코드와 독창적 에셋·테스트를 유지하며 요청한 변경만 수행하세요.
- 메인 에이전트만 서브에이전트 생성·배정·재배치를 하고, 서브에이전트의 하위 에이전트 생성은 금지합니다.
- 병렬 작업 시 파일 소유권을 먼저 정하고 같은 파일을 동시에 수정하지 마세요.
- 메인만 project-status.json을 갱신하고 완료 증거가 있는 작업만 done으로 표시합니다.
- 변경 후 npm run verify와 관련 실제 브라우저 테스트를 통과하세요. import나 컴파일만으로 완료를 판정하지 마세요.
- 검증 실패는 숨기지 말고 수정 후 재검증하며, 미해결 항목은 명확히 보고하세요.
- 검증된 단계별로 커밋하고, push는 내가 명시적으로 승인한 경우에만 하세요.

이어서 수행할 작업:
[여기에 새로 승인된 작업을 작성]
```

### 작업 예시

```text
PROJECT_MASTER.md의 재개 지침을 따르고, “하드웨어 가속 Chromium의 50기 이상 전투 성능 측정과 Phaser 코드 분할”을 수행하세요. 완료된 MVP 기능과 두 캐릭터 완주를 유지하고, 성능 측정 환경과 전후 FPS·번들 크기를 실제로 비교하세요. 새 맵이나 온라인 기능은 추가하지 마세요.
```

## 10. 후속 작업 후보

현재 후보는 확정된 다음 단계가 아니라 사용자 승인이 필요한 선택지입니다.

- 하드웨어 가속 브라우저에서 실제 사격감·사운드·60fps 확인
- Phaser 코드 분리와 초기 로딩 개선
- 대규모 호드 프로파일링과 추가 최적화
- 새로 승인된 임무·무기·적·캐릭터 확장

새 세션에서는 이 후보를 자동으로 시작하지 말고, 사용자가 마지막 프롬프트에 명시한 작업만 시작하세요.
