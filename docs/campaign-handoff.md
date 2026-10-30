# 10단계 캠페인 구현·검증 인계 문서

- 기준 시각: 2026-10-30T09:57Z
- 브랜치: `main`
- 기준 코드 커밋: `5a02174 test: stabilize campaign input and extraction paths`
- 목적: 다음 세션이 현재 구현을 다시 만들지 않고 남은 브라우저 회귀 3건을 끝까지 수정하도록 정확한 상태를 전달합니다.

> **완료 선언이 아닙니다.** 데스크톱 두 캐릭터와 모바일 heavy는 각각 10단계와 `MISSION COMPLETE`를 실제 입력으로 통과했지만, 전체 Chromium 회귀는 현재 **22/25 통과·3건 실패**입니다. 아래 실패 항목을 모두 해결하기 전까지 프로젝트 완료로 표기하지 마세요.

## 1. 현재까지 구현된 것

- 10개 스테이지의 목표·유한 웨이브·난이도·보급·체크포인트 데이터와 순수 로직
- `reach / defend / collect / purge / hunt / extract` 목표의 실제 장면 진행과 필수 스폰 소유권 추적
- `medbay / reactor / hive` 세 레이아웃과 단계별 장애물·색조·시작점
- `STAGE XX START`, `STAGE XX CLEAR`, `NEXT STAGE`, 최종 `MISSION COMPLETE`
- 사망 시 현재 스테이지 체크포인트 재시작, 단계 전환 시 `runId` 유지, 재시작 시 증가
- 기본 무기 3종과 해금 무기 4종
  - 2단계: ARC-5 연쇄 전격
  - 4단계: Rail Lance 관통 사격
  - 6단계: Flame Projector 원뿔 화염
  - 8단계: MX-8 지뢰 설치·폭발
- 데스크톱 `1~7`·휠, 모바일 이전·다음 무기 순환과 잠금 표시
- 모바일 자동 조준 추적과 hunt 대상 elite/alpha 우선 선택
- 탄약·재장전·보급 회복과 전탄 소진 시 비상 소총 탄약
- 적·발사체·입자·지뢰·효과 풀 상한과 읽기 전용 `window.swarmDiagnostics()`
- 실제 실패 완주를 반영한 조정
  - Rail 피해 240
  - 단계별 접촉 피해 배율 0.72~1.00
  - ARC 조준 대상 우선순위와 모바일 대상 추적

주요 구현 파일은 `src/game/SwarmScene.ts`, `campaign.ts`, `campaign-logic.ts`, `weapon-behaviors.ts`, `config.ts`, `src/main.ts`입니다. 기존 단일 임무 런타임 대신 캠페인 런타임이 장면의 단일 상태 원천입니다.

## 2. 실제로 통과한 검증

### 단위·빌드

다음은 실제 명령이 통과했습니다.

```sh
export PATH="/c/Users/super/tools/node22:$PATH"
npx vitest run
npx tsc --noEmit
npm run verify
npm run build:pages
```

- Vitest **56/56**
- TypeScript strict 검사 통과
- 상태 파일 검증과 Vite 프로덕션 빌드 통과
- `/swarm-shooter/` base Pages 빌드 통과
- 기존 대형 JS 청크 경고는 남아 있습니다.

### 개별 캠페인 완주

실제 키보드·마우스·터치로 다음이 모두 `MISSION COMPLETE`와 새 캠페인 재시작까지 통과했습니다.

- 데스크톱 heavy: 10단계, 1,276기 처치, HP 110
- 데스크톱 scout: 10단계, 1,305기 처치, HP 120
- 모바일 heavy: 10단계, 1,293기 처치, HP 166, bestMultiKill 43

신규 무기도 실제 발사·피해를 확인했습니다.

- ARC 연쇄, Rail 관통, Flame 원뿔, Mine 설치·폭발
- 4단계 elite와 10단계 Alpha 출현·처치
- 최대 적 72기, 입자 384, 지뢰 8 상한 확인

### 프로덕션·공개 URL

- `/swarm-shooter/` 게임·대시보드·API가 로컬 프로덕션 미리보기에서 HTTP 200
- 프로덕션과 공개 URL에서 실제 이동·사격·재장전·일시정지·재시작 2/2 통과
- 현재 공개 주소도 HTTP 200을 다시 확인했습니다.

공개 URL:
- 게임: https://pretty-disposal-beauty-commons.trycloudflare.com/swarm-shooter/
- 대시보드: https://pretty-disposal-beauty-commons.trycloudflare.com/swarm-shooter/dashboard.html
- 상태 API: https://pretty-disposal-beauty-commons.trycloudflare.com/api/status

로컬 URL:
- 게임: http://127.0.0.1:4173/swarm-shooter/
- 대시보드: http://127.0.0.1:4173/swarm-shooter/dashboard.html
- 상태 API: http://127.0.0.1:4173/api/status

Cloudflare quick tunnel 주소는 임시이며 터널 종료 시 무효가 됩니다.

### 전체 Chromium 회귀

`npm run test:e2e`를 실제로 끝까지 실행한 결과 **22/25 통과, 3건 실패**입니다. 데스크톱 heavy·scout는 이 전체 실행에서도 10단계를 통과했습니다.

## 3. 남은 실패 3건

1. `tests/e2e/mobile-controls.spec.ts`의 작은 가로 화면 검증에서 `#weapon-slots`를 읽지 못합니다.
2. `tests/e2e/mobile-mission.spec.ts`의 모바일 heavy가 10단계 `s10-guard`에서 사망합니다.
3. `tests/e2e/stress.spec.ts`도 10단계 `s10-guard`에서 사망합니다.

현재 실패 원인을 완료로 간주하지 말고 다음을 확인하세요.

- 작은 가로 화면에서도 무기 순환 UI가 보이는지와 의도된 데스크톱 전용 슬롯 숨김 여부
- 10단계 경비대 소탕 중 실제 HP·적 위치·남은 필수 스폰·보급·무기 탄약
- 모바일과 스트레스 모두 같은 `s10-guard`에서 발생하므로 후반 접촉 피해와 후퇴 경로의 반복 안정성

## 4. 다음 작업 순서

1. 실패한 세 테스트만 먼저 실행해 원인을 확인합니다.

   ```sh
   export PATH="/c/Users/super/tools/node22:$PATH"
   npm run test:e2e -- tests/e2e/mobile-controls.spec.ts
   npm run test:e2e -- tests/e2e/mobile-mission.spec.ts
   npm run test:e2e -- tests/e2e/stress.spec.ts
   ```

2. 실제 입력으로 원인을 수정하고 같은 테스트가 반복 통과하는지 확인합니다. 치트나 디버그 변경 함수는 추가하지 마세요.
3. `npx vitest run`, `npx tsc --noEmit`, `npm run verify`를 다시 통과시킵니다.
4. 전체 `npm run test:e2e`가 25/25인지 확인합니다.
5. 마지막으로 `npm run build:pages`와 `/swarm-shooter/` 미리보기·공개 URL을 재검증합니다.
6. 실제 결과가 있는 항목만 `project-status.json`, README, `PROJECT_MASTER.md`에 반영하고 커밋합니다.

## 5. 유지해야 할 제약

- 기존 모바일 컨트롤·멀티터치·자동 조준·캐릭터 2종·기본 무기 3종과 기존 브라우저 테스트를 유지하세요.
- 승인된 10단계 계획은 `docs/game-plan.md`를 따르세요.
- `stageIntro/stageClear`의 입력·스폰·시계·지속 발사 정지와 체크포인트 재시작을 유지하세요.
- 필수 스폰은 큐가 차도 버리지 않고 실제 생성·처치까지 추적하세요.
- 테스트용 치트와 상태 변경 진단 함수는 추가하지 말고 `swarmDiagnostics`는 읽기 전용으로 유지하세요.
- 실제 모바일 하드웨어 FPS, Safari, 청감 사운드·사격감은 자동 검증하지 않았으므로 실기기 확인이 별도로 필요합니다.

## 6. 새 세션에 그대로 붙여넣을 프롬프트

```text
당신은 이 프로젝트의 총괄 메인 개발 에이전트입니다. 10단계 캠페인을 다시 만들지 말고 현재 구현과 검증 상태를 이어받아 남은 브라우저 회귀를 완료하세요.

저장소는 d:/shooting입니다. Windows Git Bash이며 Node 명령 전에 다음을 실행하세요.
export PATH="/c/Users/super/tools/node22:$PATH"

먼저 다음을 읽으세요.
- docs/campaign-handoff.md
- PROJECT_MASTER.md
- project-status.json
- README.md
- docs/game-plan.md
- docs/architecture.md
- src/shared/game-types.ts
- src/game/SwarmScene.ts
- src/game/campaign.ts
- src/game/campaign-logic.ts
- src/game/weapon-behaviors.ts
- tests/e2e/mission-runner.ts
- tests/e2e/mobile-controls.spec.ts
- tests/e2e/mobile-mission.spec.ts
- tests/e2e/stress.spec.ts

현재 상태:
- 10단계 캠페인과 4개 해금 무기, STAGE START/CLEAR, 최종 MISSION COMPLETE, 체크포인트 재시작이 구현됐습니다.
- Vitest 56/56, TypeScript, verify, Pages 빌드가 통과했습니다.
- 데스크톱 heavy/scout와 모바일 heavy는 개별 10단계 완주와 MISSION COMPLETE를 통과했습니다.
- 그러나 전체 E2E는 22/25이며 아직 3건이 실패합니다.

남은 실패:
1. mobile-controls의 작은 가로 화면에서 #weapon-slots를 읽지 못함
2. 모바일 heavy가 10단계 s10-guard에서 사망
3. stress 테스트도 10단계 s10-guard에서 사망

작업 규칙:
1. 기존 캠페인·컨트롤·무기·자동 조준과 실제 입력 테스트를 유지하세요.
2. 실패한 세 테스트부터 원인을 확인하고 실제 입력으로 수정 후 반복 통과시키세요.
3. 치트·디버그 상태 변경 함수는 추가하지 말고 window.swarmDiagnostics()는 읽기 전용으로 유지하세요.
4. npx vitest run, npx tsc --noEmit, npm run verify를 다시 통과시키세요.
5. 전체 npm run test:e2e가 25/25인지 확인한 뒤 npm run build:pages와 프로덕션·공개 URL을 재검증하세요.
6. 검증된 결과만 project-status.json과 문서에 반영하고 커밋하세요. push는 제가 명시적으로 승인하면 실행하세요.

현재 공개 게임은 https://pretty-disposal-beauty-commons.trycloudflare.com/swarm-shooter/ 입니다. 임시 주소라 죽어 있으면 새 터널을 여세요.
```

## 7. 후속 메모

- 현재까지 코드 커밋은 `0546943`, `0d7a279`, `5a02174`입니다.
- 이 인계 문서와 상태 갱신 커밋은 그 다음 커밋에서 확인하세요.
- 원격 `main`이 최신 인계 커밋까지 푸시된 상태인지 `git log --oneline -5`와 `git ls-remote origin`으로 확인하세요.
