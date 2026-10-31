# 아키텍처와 작업 경계

> **현재 상태**: 10단계 캠페인과 모바일 전체 화면이 통합됐고, TypeScript·Vitest·프로덕션 빌드와 전체 Chromium 회귀 **25/25**를 통과했습니다. 최신 증거와 미검증 범위는 `docs/campaign-handoff.md`를 기준으로 합니다.

## 실행

- 게임: `/`
- 개발 대시보드: `/dashboard.html`
- 상태 API: `/api/status`
- 상태의 단일 원천: 루트 `project-status.json`
- 메인 에이전트만 상태 파일을 수정한다.

## 소유권

- 기획 에이전트: `docs/game-plan.md`, `docs/balance.md`
- 디자인 에이전트: `docs/art-direction.md`, `public/assets/**`
- 프론트엔드 에이전트: `index.html`, `src/main.ts`, `src/style.css`, `src/game/**`
- 백엔드 에이전트: `dashboard.html`, `src/dashboard.ts`, `src/dashboard.css`, `server/**`, `scripts/**`
- 메인: 나머지 파일, 공통 계약, 통합, 테스트와 검증

서브에이전트는 다른 에이전트를 생성하지 않는다. 배정된 파일만 수정하고 `package.json`, lockfile, `project-status.json`, Git 커밋은 메인이 담당한다.

## 게임 계약

공통 타입은 `src/shared/game-types.ts`에 있다. 프론트엔드는 읽기 전용 진단 함수 `window.swarmDiagnostics()`를 제공한다. 이 함수는 게임 상태 복사본만 반환하며 승리, 피해, 이동 등을 실행하는 치트 함수를 제공하지 않는다. 브라우저 테스트는 이 스냅샷을 읽고 실제 키보드·마우스·터치 입력을 본다.

## 캠페인 경계

- `src/game/SwarmScene.ts`가 실행 중 캠페인 상태의 단일 원천이다. 기존 단일 임무 상태를 병행하지 않는다.
- `src/game/campaign.ts`는 10개 스테이지의 목표·유한 웨이브·보급·해금과 레이아웃 데이터를 정의한다.
- `src/game/campaign-logic.ts`는 목표 진행, 필수 스폰 추적, 단계 전이와 체크포인트의 순수 로직을 담당한다.
- `src/game/weapon-behaviors.ts`는 ARC 연쇄·Rail 관통·Flame 원뿔·Mine 폭발의 대상 계산을 담당하며 장면에서 실제 피해·탄약·목표 진행으로 연결한다.
- `HudData.campaign/reward`, `continueCampaign()`, `GameSnapshot.campaign/supplies`로 단계 UI와 읽기 전용 진단을 연결한다. 보급 진단은 위치·해금·활성 상태 복사본이다. `stageIntro/stageClear`에서는 입력·스폰·시계·지속 발사가 정지한다.

## 입력 경계

- `src/main.ts`는 데스크톱 키보드·마우스와 모바일 UI를 게임 장면의 공개 입력 API에 연결한다. `(pointer: coarse)`일 때만 터치 모드와 자동 조준을 사용한다.
- 데스크톱은 1280×720 `Scale.FIT`, 모바일은 `Scale.RESIZE`를 사용한다. 모바일 캔버스는 브라우저 전체 크기로 조정되고 Phaser 침머라의 viewport도 같은 크기로 갱신돼 고정 비율의 빈 여백을 만들지 않는다.
- `src/game/touch-controls.ts`는 DOM 이동 스틱과 사격 버튼의 `pointerId`를 독립 추적한다. 포인터 캡처, 해제, 취소, 비활성화에서 입력을 초기화한다.
- `src/main.ts`의 `bindTouchAction`은 무기·재장전·일시정지 버튼을 터치 `pointerdown`에서 즉시 실행하고 후속 합성 `click`의 중복 실행을 막는다. 마우스와 키보드의 `click`은 유지하며, 이동 터치가 유지된 두 번째 터치도 처리한다.
- `src/game/SwarmScene.ts`는 터치 이동 벡터와 자동 조준을 처리한다. 화면에 보이는 활성 적 중 장애물에 가려지지 않은 가장 가까운 적을 선택하며 자동으로 발사하지는 않는다.
- `GameSnapshot.input`은 입력 모드·이동 벡터·사격 상태·자동 조준 대상 ID를 읽기 전용으로 제공한다.
- `tests/e2e/touch-driver.ts`는 CDP 터치와 탭으로 실제 컨트롤을 조작하고, `mission-runner.ts`는 데스크톱과 모바일 완주에 같은 임무 시나리오·장애물 경로·보급 진단을 사용한다. 재장전 완료와 실제 사격 상태를 확인하며 상태 변경 치트는 사용하지 않는다.

## 렌더링 경계

- `src/game/SwarmScene.ts`는 기존 물리 좌표·조준·전투·객체 풀의 단일 원천이다.
- `src/game/facility.ts`는 타일 바닥, 정적 구역 레이어, 환경 에셋과 외곽 벽을 여섯 개의 800px RenderTexture 청크로 굽는다. 캠페인의 `medbay / reactor / hive` 레이아웃과 장애물을 단계에 맞게 표시한다.
- `src/game/operative-visual.ts`는 기존 `player` 위치를 따라 하체·상체·무기를 조합한다. 하체는 이동 방향, 상체와 무기는 조준 방향을 사용하며 총구 기준점에서 탄환과 화염을 출발시킨다.
- `src/game/visual-config.ts`는 캐릭터 크기·프레임 간격과 무기 크기·총구 위치·반동을 정의한다.
- `GameSnapshot.visual`은 현재 보행 pose, 시각 무기, 발사 이벤트 수와 총구 좌표만 제공하는 읽기 전용 검증 계약이다.

## 에셋 경로

- `/assets/characters/{scout,heavy}.svg`: 상체·팔 장갑
- `/assets/characters/{id}-legs-{idle,a,b}.svg`: 캐릭터별 하체 프레임
- `/assets/enemies/{swarmer,skitter,brute}.svg`와 `*-step.svg`: 적별 보행 프레임
- `/assets/weapons/{rifle,shotgun,launcher,arc,rail,flame,mines}.svg`: 일곱 무기의 독립 외형
- `/assets/enemies/brute-{elite,alpha}{,-step}.svg`: elite·Alpha 보행
- `/assets/effects/{chain,rail,flame,mine,coolant,fuse}.svg`: 무기·목표 효과
- `/assets/environment/{floor,bed,console,wall,vent,pipe,elevator,relay,decal}.svg`: 시설 바닥·구조물·장식
- `/assets/environment/decal-{medbay,reactor,hive}.svg`: 캠페인 레이아웃 식별
- `/assets/portraits/{scout,heavy}.svg`: 선택 메뉴 초상화
- `/assets/ui/crosshair.svg`: 조준선

현재 게임은 44개 SVG를 preload하고 두 초상화를 HTML에서 제공한다. `src/game/textures.ts`가 Vite `BASE_URL`을 적용하고, 로드 실패 시 `textures.ts`와 `art-fallbacks.ts`의 생성 텍스처로 대체한다. `scripts/generate-art.mjs`는 조준선을 제외한 45개 SVG의 제작 원본이며 `npm run art:generate`로 재생성한다. 사운드는 외부 저작물 없이 Web Audio로 합성한다.

## 범위

데스크톱과 모바일 가로 브라우저의 싱글 플레이어, 캐릭터 2종, 무기 7종, 적 3종과 elite·Alpha, 10단계 캠페인이다. 온라인·로그인·결제와 같은 외부 서비스는 제외한다.
