# 10단계 캠페인 중간 인계 문서

작성 기준: 2026-10-29T13:27:01Z  
브랜치: `main`  
목적: 새 세션에서 현재 저장소의 **10단계 캠페인 중간 구현**을 정확히 이어서 완성하기 위한 실제 상태 기록

> **중요**  
> 이 문서가 포함된 커밋은 캠페인 완료 커밋이 아닙니다.  
> `src/game/SwarmScene.ts`의 캠페인·신규 무기 통합이 끝나지 않아 현재 `npx tsc --noEmit`가 실패합니다.  
> 캠페인 전용 브라우저 테스트와 전체 회귀도 실행되지 않았습니다.

## 1. 지금까지 사용자가 요청한 것

사용자는 기존 `SWARM//ZERO`를 다음 조건의 게임으로 확장하라고 요청했습니다.

- 스테이지를 10개로 늘린다.
- 단계가 진행될수록 적 수·구성·압박·난이도가 높아진다.
- 강력한 무기로 많은 적을 실제로 쓸어버리는 통쾌한 호드 슈터가 되어야 한다.
- 각 단계 시작과 종료에 `STAGE XX START`, `STAGE XX CLEAR`를 보여준다.
- 10단계를 모두 완료하면 최종 `MISSION COMPLETE`를 보여준다.
- 작전은 에일리언 슈터처럼 많은 적이 튀어나오고, 그것을 강력한 무기로 소탕해 스트레스를 해소하는 방향이다.
- 계획·개발·디자인·테스트를 각각 필요한 모델·에이전트로 구성하고 병렬 처리핼 수 있다.

승인된 상세 계획은 `docs/game-plan.md`에 있습니다.

## 2. 현재까지 완료된 것

### 기획과 계약

- 10단계 캠페인의 목표·웨이브·무기 해금·난이도·보급·검증 계획이 `docs/game-plan.md`에 기록됐습니다.
- `src/shared/game-types.ts`에 다음 공통 계약이 추가됐습니다.
  - 무기 ID: `rifle`, `shotgun`, `launcher`, `arc`, `rail`, `flame`, `mines`
  - 화면: `stageIntro`, `stageClear`
  - 적 랭크: `normal`, `elite`, `alpha`
  - 레이아웃: `medbay`, `reactor`, `hive`
  - 목표 타입: `reach`, `defend`, `collect`, `purge`, `hunt`, `extract`
  - `StageDefinition`, `ObjectiveDefinition`, `CampaignWaveDefinition`, `CampaignSnapshot`
- `GameSnapshot.campaign` 필드는 이미 필수 타입으로 추가됐습니다.
- `EnemySnapshot.rank`와 `WeaponDefinition.behavior`도 추가됐습니다.

### 캠페인 데이터와 순수 로직

다음 파일이 새로 추가됐습니다.

- `src/game/campaign.ts`
  - 10개 스테이지 정의
  - 세 레이아웃의 장애물과 색조 정의
  - 단계별 목표·웨이브·보급·해금 무기
  - 단계 적 수 합계 계산
- `src/game/campaign-logic.ts`
  - 단계 시작/진행/클리어/계속/재시작 상태 전이
  - 목표별 순서와 완료 판정
  - 웨이브 소유권과 필수 적 스폰·처치 추적
  - 해금, 체크포인트, 시계, Alpha HP 임계치
  - 난이도 배율과 캠페인 스냅샷
- `src/game/weapon-behaviors.ts`
  - ARC 연쇄 대상 선택
  - Rail 관통 궤적
  - Flame 원뿔 대상 질의
  - 지뢰 설치·상한·폭발 대상 계산
  - 시야·장애물 판정 보조
- 해당 Vitest 파일 3개
  - `src/game/campaign.test.ts`
  - `src/game/campaign-logic.test.ts`
  - `src/game/weapon-behaviors.test.ts`

`src/game/config.ts`에는 4개 신규 무기 정의, `CAMPAIGN_WEAPON_ORDER`, 지뢰·효과·목표물 풀 상한과 신규 텍스처 키가 추가됐습니다.

### UI

`src/main.ts`와 `src/style.css`에는 다음이 추가됐습니다.

- 단계 시작·클리어 오버레이: `#stage-screen`, `#stage-panel`, `#stage-kicker`, `#stage-title`, `#stage-objective`, `#stage-reward`, `#stage-stats`, `#stage-continue-button`
- 데스크톱 무기 버튼 7개와 `1~7` 단축키
- 모바일 무기 순환 버튼: `weapon-prev`, `weapon-next`, `touch-current-weapon`
- 최종 화면 문구: `MISSION COMPLETE`
- 캠페인 HUD의 잠금 무기 표시와 목표 진행률 계산 보정

다만 **UI와 공개 입력 API만 추가된 상태**이며 실제 `SwarmScene` 메서드와 데이터 연결은 완료되지 않았습니다.

### 아트와 시설

- `scripts/generate-art.mjs`가 추가됐습니다.
- `public/assets/`에 기존 에셋과 신규 SVG가 생성됐습니다.
  - 캐릭터 하체 프레임
  - 적 보행 프레임
  - elite/alpha Brute
  - 무기 7종
  - 환경 구조물과 레이아웃 데칼
  - 연쇄·레일·화염·지뢰·냉각 셀·퓨즈 효과
- `src/game/facility.ts`, `src/game/operative-visual.ts`, `src/game/visual-config.ts`, `src/game/art-fallbacks.ts`가 추가됐습니다.
- `src/game/textures.ts`는 새 에셋 키와 fallback을 지원하도록 수정됐습니다.

단계 레이아웃을 실행 중 전환하고 텍스처를 안전히 정리하는 최종 통합은 아직 검증되지 않았습니다.

### 검증 파일

`tests/e2e/`에는 다음 캠페인 검증 보조와 새 시각 테스트 파일이 추가됐습니다.

- `tests/e2e/campaign-data.ts`
- `tests/e2e/campaign-driver-utils.ts`
- `tests/e2e/artifacts.ts`
- `tests/e2e/visuals.spec.ts`

기존 테스트 파일들도 10단계 계약에 맞춰 수정 중이나, 현재 기준 브라우저 전체 회귀는 통과하지 않았습니다.

## 3. 실제로 확인한 결과

### 통과

다음 명령을 실제로 실행했고 통과했습니다.

```sh
export PATH="/c/Users/super/tools/node22:$PATH"
npx vitest run src/game/campaign.test.ts src/game/campaign-logic.test.ts src/game/weapon-behaviors.test.ts
```

결과:

- 3개 테스트 파일 통과
- **32/32 단위 테스트 통과**

### 실패

다음 명령을 실제로 실행했고 실패했습니다.

```sh
export PATH="/c/Users/super/tools/node22:$PATH"
npx tsc --noEmit
```

현재 남는 주요 오류는 다음과 같습니다.

- `SwarmScene`의 `nextShotAt`이 3개 무기만 정의해 7개 무기를 요구하는 타입과 맞지 않음
- 기존 발사 함수가 `WeaponId` 전체를 받지 못하고 기존 3개 무기만 허용
- `SwarmScene.getSnapshot()`이 필수 `campaign` 스냅샷을 반환하지 않음
- `HudData`에 공통 계약으로 정해진 `campaign`, `reward`가 없음
- `SwarmScene.continueCampaign()` 공개 메서드가 없음

즉, **현재 코드는 컴파일되지 않는 중간 상태**입니다.

### 아직 실행하지 않은 것

- `npm run verify`
- 전체 Vitest
- 캠페인 브라우저 테스트
- 전체 `npm run test:e2e`
- `npm run build`
- `npm run build:pages`
- 프로덕션 미리보기
- 공개 URL 검증
- 실기기 모바일 FPS·Safari·사운드 확인

이 항목을 실행하지 않은 것은 실패를 숨기기 위함이 아니라, 장면 통합이 완료되지 않아 아직 실행 가능한 완성 상태가 아니기 때문입니다.

## 4. 특히 주의할 코드 상태

- `WEAPON_ORDER`는 현재 기본 무기 3개만 포함하고, `CAMPAIGN_WEAPON_ORDER`가 7개 전체를 포함합니다. UI와 무기 순환 코드가 어느 배열을 사용하는지 반드시 통일해야 합니다.
- `campaign-logic.ts`의 단계 목표·해금·재시작 로직은 순수 테스트 32개에서 검증됐지만, 실제 장면 스폰·피해·목표 표시와는 아직 연결되지 않았습니다.
- `main.ts`는 `HudData.campaign`를 항상 존재하는 값처럼 사용하므로, `HudData` 타입과 실제 emit 값을 일치시켜야 합니다.
- `stageIntro`와 `stageClear` 화면에서 입력·스폰·시계·지속 발사를 완전히 정지하는 장면 로직이 필요합니다.
- 사망 시 현재 스테이지 재시작, 단계 클리어 보상, 메뉴 복귀 시 캠페인 초기화는 UI 문구만 준비된 상태입니다.
- 새 SVG와 fallback은 파일 수준으로 추가됐지만, 브라우저에서 최종 로드·렌더링·전환 정리까지는 검증되지 않았습니다.

## 5. 새 세션에서 권장하는 작업 순서

1. 현재 커밋을 pull한 뒤 이 문서와 `docs/game-plan.md`, `project-status.json`을 읽습니다.
2. `npx tsc --noEmit`을 먼저 실행해 실제 오류를 확인합니다.
3. `SwarmScene`의 `HudData.campaign`, `HudData.reward`, `continueCampaign()`, `GameSnapshot.campaign` 계약부터 맞춥니다.
4. 기존 단일 임무 런타임과 새 캠페인 런타임의 책임을 하나로 정리합니다. 상태 원천이 두 개가 되지 않게 합니다.
5. 단계 시작·전투·클리어·계속·재시작 입력 흐름을 먼저 연결합니다.
6. reach/defend/collect/purge/hunt/extract 목표와 스폰 소유권을 장면에 연결합니다.
7. ARC·Rail·Flame·Mine의 실제 피해·목표 진행·탄약·재장전을 구현합니다.
8. 세 레이아웃의 장애물·장식·목표 좌표와 리소스 정리를 검증합니다.
9. 단계 1, 4, 7, 10부터 실제 데스크톱 입력으로 확인한 뒤, 모바일 터치 완주 테스트를 실행합니다.
10. 이후 전체 회귀, 프로덕션 빌드, `/swarm-shooter/` 미리보기, 공개 URL 테스트를 순서대로 실행합니다.
11. 검증이 끝난 뒤에만 `PROJECT_MASTER.md`, `README.md`, `docs/*.md`, `project-status.json`을 완료 상태로 갱신합니다.

## 6. 새 세션에 붙여넣을 프롬프트

다음 프롬프트를 새 세션에 그대로 사용하면 됩니다.

```text
당신은 이 프로젝트의 총괄 메인 개발 에이전트입니다. 저장소의 10단계 캠페인 중간 구현을 처음부터 다시 만들지 말고 이 문서를 기준으로 이어서 완성하세요.

현재 저장소는 d:/shooting 입니다. Windows Git Bash 환경이며 Node 명령 전에 다음을 실행하세요.
export PATH="/c/Users/super/tools/node22:$PATH"

먼저 반드시 읽으세요.
- docs/campaign-handoff.md
- docs/game-plan.md
- PROJECT_MASTER.md
- project-status.json
- README.md
- src/shared/game-types.ts
- src/game/campaign.ts
- src/game/campaign-logic.ts
- src/game/weapon-behaviors.ts
- src/game/SwarmScene.ts
- src/main.ts

현재 상태:
- 10단계 캠페인의 데이터·순수 로직·신규 무기 동작 테스트가 추가됐고 campaign 관련 Vitest는 32/32로 통과했습니다.
- 그러나 src/game/SwarmScene.ts 통합이 끝나지 않아 npx tsc --noEmit이 실패합니다.
- HudData.campaign/reward, SwarmScene.continueCampaign(), GameSnapshot.campaign, 신규 무기 발사 흐름이 아직 완성되지 않았습니다.
- npm run verify, 전체 E2E, 프로덕션 빌드, 공개 URL 검증은 아직 통과하지 못했습니다.
- 완료된 것으로 기록하지 말고 검증된 것만 done으로 표시하세요.

작업 규칙:
1. 기존 모바일 컨트롤, 자동 조준, 멀티터치, 캐릭터 2종, 기본 무기 3종, 기존 브라우저 테스트를 유지하세요.
2. 사용자가 승인한 10단계 캠페인 계획은 docs/game-plan.md를 따르세요.
3. 공통 상태 원천이 두 개가 되지 않게 기존 단일 임무 런타임과 캠페인 런타임을 정리하세요.
4. stageIntro/stageClear에서 입력·스폰·시계·지속 발사를 완전히 정지하고, 사망 시 현재 스테이지를 체크포인트부터 재시작하세요.
5. ARC 연쇄, Rail 관통, Flame 원뿔, Mine 폭발을 실제 피해·탄약·재장전·목표 진행과 연결하세요.
6. 테스트용 치트나 디버그 변경 함수를 추가하지 말고 window.swarmDiagnostics()는 읽기 전용으로 유지하세요.
7. 작업 후 npx vitest run, npx tsc --noEmit을 통과한 뒤 단계 1/4/7/10의 실제 입력 브라우저 테스트를 하세요.
8. 이후 npm run verify, npm run test:e2e, npm run build:pages, 프로덕션 미리보기를 순서대로 검증하세요.
9. 문서와 project-status.json은 실제 명령 결과와 증거가 있는 경우에만 갱신하세요.
10. Git commit은 검증된 단계별로 하고, push는 제가 다시 명시적으로 승인하면 하세요.

목표: 10개 스테이지가 실제 플레이되고, 4개 신규 무기가 해금과 함께 동작하며, STAGE START/CLEAR와 최종 MISSION COMPLETE까지 검증된 상태로 완성하는 것입니다.
```

## 7. 인계 시 알아야 할 전제

- 이전 MVP·모바일·아트 단계는 과거에 실제 검증된 이력이 있지만, 캠페인 코드를 합친 현재 트리 전체를 다시 검증하지 않았습니다.
- 과거 `23/23`, `24/24` 같은 회귀 결과를 현재 캠페인 코드에 그대로 적용해 완료로 쓰면 안 됩니다.
- 공개 Cloudflare 주소는 세션이 종료되었을 수 있으므로 새 세션에서 다시 개발 서버와 터널을 만들어 검증해야 합니다.
- 실기기 모바일 FPS, Safari, 사운드, 청감 사격감은 자동 테스트로 대체할 수 없습니다.
