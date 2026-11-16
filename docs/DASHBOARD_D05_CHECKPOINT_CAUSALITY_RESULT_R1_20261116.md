# D05 현재 점수 저장시각과 후속 projection 입력 감지 — 소스 재현 R1

- 작성: 2026-11-16 KST
- 기준: `zgmini` 최신 `main` 소스의 `worker/projection-checkpoint-r52.mjs`, `scripts/pc-writer/run-local.mjs`, `worker/market-operational-store.mjs`; 작업 브랜치 `codex/ui-improvements`
- 상위 사용자 목적/실행계획: `docs/DASHBOARD_DAILY_SCORE_EXECUTION_PLAN_R2.md`
- 이번 변경: 진단 테스트 1파일과 관찰 결과 문서 1파일. **운영 변경·DB/D1 쓰기·Cloudflare 배포·PC 새 요청·산식 변경 없음**
- 상태: **SOURCE_REPRODUCED / PRODUCTION_EFFECT_UNKNOWN**. 수집→PC 계산→D1→공개 화면의 실제 장애가 입증됐다는 주장이 아니다.

## 1. 문제의 정확한 경계

`D05` 종합 시장점수는 `scripts/pc-writer/market.mjs:calculateMarket`가 로컬 저장된 입력을 읽어 계산하고 `scripts/pc-writer/run-local.mjs`에서 결과를 `marketOperationalStore(core).writeScore(body,now)`로 저장한다. `D05` 자체의 `calculateMarket`가 `readCoreCheckpoint`를 조회하여 실행 여부를 결정하는 구조는 아니다.

그러나 **D05의 `market_public_snapshots_v1.current.stored_at`이 위험지표 세부 projection들의 입력 감지 버전으로 재사용**된다.

- `worker/market-operational-store.mjs:writeScore`는 당일 날짜와 `current` key를 `ON CONFLICT ... DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at`로 쓴다.
- `worker/projection-checkpoint-r52.mjs:readCoreCheckpoint`는 `current.stored_at` **단일 SELECT**에서 `core:<stored_at>`을 생성한다. `market_input_batches_v1`의 해당 원지표 기록 또는 input signature는 직접 조회하지 않는다.
- `scripts/pc-writer/run-local.mjs`의 후속 projection 작업은 과거 `projection.sourceVersion/sourceStoredAt`과 이 버전을 비교하여 재계산을 결정한다. 일부 projection은 기존 별도 refresh Gate도 가지고 있다.
- `inflation`, `earningsRecession`은 추가 build suffix를 보유하고 `koreaFearGreed`는 별도 HISTORY checkpoint를 쓴다. 단순히 공통 timestamp를 삭제하거나 이 경로를 통일해서는 안 된다.

이것은 **D05 현재 점수 산출 실패로 단정할 수 없다**. 현재 확인한 위험은 D05 저장의 시계가 후속 위험지표 projection의 입력 변경을 대표하지 못할 수 있다는 점이다.

## 2. 격리 재현 (실제 운영·원자료 접근 없음)

테스트 `tests/dashboard-d05-checkpoint-causality-r1.test.mjs`는 현행 `readProjectionCheckpoint` 구현을 import하고 `DB_CORE.prepare(...).bind('current').first()`만 고정 가짜 응답으로 제공한다. fixture에 저장한 원자료 본문은 SHA-256으로 비교한다.

| 재현 | 입력 사건 | 실제 source checkpoint | 판정 |
|---|---|---|---|
| A | 원지표 body·서명 불변, 공개 `current.stored_at`만 +60초 | `core:<time>` 변경, 후속 projection 변경 감지 조건 참 | **의미상 신규 원자료 없이 갱신 트리거 가능** |
| B | 입력 body·서명 변경, 공개 `current.stored_at` 불변 | checkpoint 동일, 후속 projection 변경 감지 조건 거짓 | **입력 사건을 단독으로 감지하지 못함** |
| C | 인플레이션 build suffix·한국 Rev7 HIST 경로 | 서로 다른 기존 출력 유지 | **보존해야 할 호환 계약 확인** |

로컬 재현 결과: **3/3 PASS** (Node 22 / 격리 source 사본 + 기존 reader와 동일한 본문, guard import만 가벼운 스텁). 원격 브랜치 테스트는 저장소 원본 모듈을 직접 import하므로, 같은 경로의 정규 CI 결과는 별도 판정한다. 이 테스트는 **현재 문제 동작을 확인하는 진단 테스트**이며, 오류가 해결됐다는 green regression이 아니다.

재현 B의 상황은 `current` 스냅샷이 아직 재계산되지 않은 경계를 모사하며, 기존 정상 Core 전체 cycle에서 반드시 점수 누락이 일어난다는 주장은 아니다. 새 원지표의 수집이 PC 실행을 이미 촉발하고 D05를 재계산했다면 후속 projection 버전도 바뀔 수 있다.

## 3. 수정해야 할 최소 계약 — 제안 (운영 미적용)

1. 기존 종합 계산 입력 `market_input_batches_v1` 및 projection별 `PROJECTION_INPUT_BATCHES`에 대해 **실제 사용한 원관측/버전/signature**를 기준으로 한다. `current.stored_at`은 게시/계산 사건 시각이지 신규 공급자 자료의 증명이 아니다.
2. 이미 예외인 인플레이션 PIT·PC1, 실적 E1, 자산 버블 R10, 한국 Rev7 HISTORY 등은 별도 input provenance를 유지한다.
3. **신규 원자료 변화가 없어도** TTL 만료·공식 정정·거래일 경계·공통 관측월 완결 변화·계산기 build version 변경은 합법적 재평가 원인일 수 있다. 'SHA 동일이면 전부 건너뜀'은 금지한다.
4. `sourceStoredAt` 단조 증가·기존 D1 readback·조건별 stale/validUntil·완료월/분기·기존 `sourceVersion` 소비자를 깨지 않는 계약이 확인되어야 한다. 변경이 DB/D1/API/TTL/sourceVersion 의미 변경을 요구한다면 정확한 필드와 기존 이력 보호를 제시하고 **사용자 승인 후 운영 적용**한다.
5. 소유자: 기존 Core/Writer·위험 projection 담당. W06은 UI에서 동일 API payload의 현재값/관측일/상태/차트 마지막 점 표시 검증을 맡는다.

## 4. 실제 다음 작업

- **Owner가 먼저 확인할 하나:** 현재 설치된 PC Writer와 `projection-checkpoint-r52.mjs`의 승인된 해시/작동 판본, 기존 원장에서 D05 `current.stored_at` 갱신 시 원지표 input signature가 동일했던 사건이 실제 있는지 확인. source만으로 운영 손상을 주장하지 않는다.
- 실증에서 오게시/불필요한 재계산이 확인되면 **소유 기능별 최소 변경**을 개발 브랜치에서 구현하고 관련 regression을 추가한다. 기존 승인 경로의 운영 설치와 D1/API/UI는 Owner가 인과적으로 검증한다.
- W06 자체 다음 화면 작업: D05 raw→표시 3.5배 변환은 유지, 현재 점수와 저장된 이력의 관측·계산·게시 날짜가 서로 다른 경우를 **잘못 동일시하지 않는지** 검토한다.
- R2 분모: D05 사안은 `DESIGN_RISK / SOURCE_REPRODUCED`이며, **실운영 DEFECT·적용 완료/27개 PASS로 계산하지 않는다**.

## 5. 증거 분리

- LAST PASS: 현재 source에서 위험 projection은 `market_public_snapshots_v1.current.stored_at`을 sourceVersion의 시계로 사용함; 격리 3/3 재현.
- FIRST FAIL: 아직 운영 장애가 입증되지 않았으므로 `RUNTIME_FAILED` 아님.
- PRODUCTION/PC: 새 증거 없음, 실제 효과 **UNKNOWN**.
- 변경 파일: 본 문서 및 테스트만. `main` 병합·Cloudflare·운영 Writer는 미수행.
