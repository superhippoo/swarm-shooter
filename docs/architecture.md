# 아키텍처와 작업 경계

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

## 입력 경계

- `src/main.ts`는 데스크톱 키보드·마우스와 모바일 UI를 게임 장면의 공개 입력 API에 연결한다. `(pointer: coarse)`일 때만 터치 모드와 자동 조준을 사용한다.
- `src/game/touch-controls.ts`는 DOM 이동 스틱과 사격 버튼의 `pointerId`를 독립 추적한다. 포인터 캡처, 해제, 취소, 비활성화에서 입력을 초기화한다.
- `src/game/SwarmScene.ts`는 터치 이동 벡터와 자동 조준을 처리한다. 화면에 보이는 활성 적 중 장애물에 가려지지 않은 가장 가까운 적을 선택하며 자동으로 발사하지는 않는다.
- `GameSnapshot.input`은 입력 모드·이동 벡터·사격 상태·자동 조준 대상 ID를 읽기 전용으로 제공한다.
- `tests/e2e/touch-driver.ts`는 CDP 터치와 탭으로 실제 컨트롤을 조작하고, `mission-runner.ts`는 데스크톱과 모바일 완주에 같은 임무 시나리오를 사용한다.

## 에셋 경로

- `/assets/characters/scout.svg`
- `/assets/characters/heavy.svg`
- `/assets/enemies/swarmer.svg`
- `/assets/enemies/skitter.svg`
- `/assets/enemies/brute.svg`
- `/assets/ui/crosshair.svg`

현재 게임은 여섯 개의 독창적 SVG를 preload하며, 로드 실패 시 Phaser 생성 텍스처를 사용한다. 사운드는 외부 저작물 없이 Web Audio로 합성한다.

## 범위

데스크톱과 모바일 가로 브라우저의 싱글 플레이어, 캐릭터 2종, 무기 3종, 적 3종, 3단계 임무 1개다. 온라인·로그인·결제와 같은 외부 서비스는 제외한다.
