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

공통 타입은 `src/shared/game-types.ts`에 있다. 프론트엔드는 읽기 전용 진단 함수 `window.swarmDiagnostics()`를 제공한다. 이 함수는 게임 상태 복사본만 반환하며 승리, 피해, 이동 등을 실행하는 치트 함수를 제공하지 않는다. 브라우저 테스트는 이 스냅샷을 읽고 실제 키보드·마우스 입력을 본다.

## 에셋 경로

- `/assets/characters/scout.svg`
- `/assets/characters/heavy.svg`
- `/assets/enemies/swarmer.svg`
- `/assets/enemies/skitter.svg`
- `/assets/enemies/brute.svg`
- `/assets/ui/crosshair.svg`

현재 게임은 여섯 개의 독창적 SVG를 preload하며, 로드 실패 시 Phaser 생성 텍스처를 사용한다. 사운드는 외부 저작물 없이 Web Audio로 합성한다.

## 범위

데스크톱 싱글 플레이어, 캐릭터 2종, 무기 3종, 적 3종, 3단계 임무 1개다. 온라인·로그인·결제와 같은 외부 서비스는 제외한다.
