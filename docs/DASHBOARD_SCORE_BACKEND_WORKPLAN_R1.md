# ZGMINI 68개 점수 실제 일별 이력 — 백엔드 실행 계획 R1

- 기준: `ansqhd5774-Choi/zgmini` `main` `a34762f2932667bb8111477653b92d5bb4b476c4`
- 전용 개발 브랜치: `codex/dashboard-score-daily-r1` (UI 변경 금지)
- 기존 사용자 확정 기준: `codex/ui-improvements/docs/DASHBOARD_SCORE_DAILY_UPDATE_STANDARD_R1.md`, `DASHBOARD_DAILY_SCORE_EXECUTION_PLAN_R1.md`, `DASHBOARD_SCORE_INPUT_LINEAGE_DESIGN_R1.md`
- 분모: 대시보드 27 + 업종 11 + 테마 30 = **68개 논리 점수**. 집단마다 승인된 산식·입력·주기를 유지한다.
- 종료 정의: 실제 원관측 → PC 원자료 저장/재조회 → 기존 승인 산식 계산 → 로컬 점수/일별 사건 저장 → D1 단일 key 재조회 → 공개 API/UI 동일 사건 일치. 개별 검증 PASS 분모를 68로 관리한다.

## 최소 실행 순서

| 순서 | 작업 | 종료 증거 | 현재 |
|---|---|---|---|
| 1 | 입력·게시 출처 대조 | 68개 score별 실제 원천, 관측/정정, 계산 version, 저장 위치, PC 승인 SHA, 공개 경로와 마지막 유효점 매핑 | 콘텐츠 식별 68/68, 상세 인과 검증 0/68 |
| 2 | 순수 입력 변경 판별 구현 | 저장·게시시간만 바뀐 재저장은 동일; 관측, revision, 유효성, 실효 날짜 경계, 계산법 변경은 차이; 검증되지 않은 게시 실패는 재시도 허용 | `lib/score-history/input-lineage-r1.mjs`, 9/9 단위 시험 PASS |
| 3 | 기존 source/Writer 연결을 소수 점수로 검증 | 대시보드·업종·테마 각 1개 후보의 원천 서명과 기존 운영 체크포인트 병행 추적; 기존 `sourceVersion`/`sourceStoredAt` 변경 없음; PC Runtime·운영 파일 승인 출처 먼저 확인 | D09 12/12 + S01 13/13 순수 입력 서명 시험 PASS; 공개 API D09·S01 읽기 확인; 실제 PC/Writer 연결 미실행 |
| 4 | 실제 일별 사건 기록·공개 확대 | 마지막 유효 점수 보존, 신규 정정 사건 분리, 없는 과거 점수 조작 금지, 공개 D1/API/UI 동시 검증. 개별 PASS 건수로 확대 | 0/68 |

## 필수 보호·중단 조건

- 현행 `market_public_snapshots_v1.current.stored_at`은 공개 결과 저장시각일 수 있다. 신규 원관측 증거로 간주하지 않는다.
- 새 도구의 `inputSignature`는 **비공개 개발용 후보**로, 운영 sourceVersion 또는 D1 schema 교체가 아니다. 실제 사용 전 score별 원천 body digest/관측일/공식 revision/READY·TTL/실효 시간대 계약을 정한다.
- 입력 서명이 같아도 이전 게시가 검증되지 않았거나 계산/게시 실패였다면 재시도해야 한다. 기존 valid result는 실패 중 보존한다.
- 신규 필드·DB table/key·retention·cutoff·현행 sourceVersion 의미·운영 수집주기·생산 source 변경은 영향과 호환성을 명시해 **별도 승인** 전 적용하지 않는다.
- Controller #917 복구와 동일 Writer 자원은 다른 담당자 작업이다. 승인되지 않은 PC job·설치·DB write·예약 생성·Cloudflare 배포 금지. 독립 개발/읽기 검증만 수행한다.
- 기존 합격 증거 재사용. 실제 관측 사건 하나의 전 구간 chain 증명 전에는 기능 완료 또는 68개 이력 완성을 주장하지 않는다.

## 다음 단일 필수 작업

Controller #917의 별도 복구 담당자와 자원을 충돌시키지 않으면서, 독립적으로 **T02 데이터센터·전력 등록 테마**의 실제 R1 계산 입력·공개 계약을 조사하고 shadow 후보를 좁힌다. D09 PC 실측은 기존 승인 Reader/실행 증거에 `projection-checkpoint-r52.mjs`의 설치 SHA와 해당 입력이 확인되는 즉시 이어서 진행한다. 현재 확인한 A급 설치 사전이미지 조회 고정 목록에는 이 파일이 없으므로, Controller 작업 중 새 manifest/PC-job을 요청하지 않는다. 운영 변경이 필요하면 실제 겹치는 부분만 별도 승인받는다. 나머지 점수의 입력/주기를 임의 통일하지 않는다.

## D09 신용위험 — 최초 읽기 전용 후보 연결 증거

- 실제 빌더 `worker/projection-builders/creditRisk.ts`의 계산 입력: `inputs.external.cmdiRows`의 `observationDate,hy,ig,market`, `inputs.series.DGS2/DGS5/DGS10/DGS30`의 `observationDate,value`, 저장된 `diagnostics8.creditRiskDefense`의 `status,score` 및 `credit-43` NFCI 보조 표시 필드.
- 실제 로더 `worker/projection-source-r52.mjs`는 `creditRisk`에 `macro+credit` 입력을 선택하고, `anchorToLatestBatch=true`, 해당 매크로 슬라이스/기존 full-macro fallback을 이용한다. 기존 36시간 TTL·원본 재조회 보호를 그대로 이용한다.
- 현재 공개 projection 저장 key: `market_public_snapshots_v1`의 `detail:credit-risk:v1`. 공개 본문은 이미 저장된 결과이며 새 서명을 게시하는 구조가 아니다.
- 신규 `lib/score-history/credit-risk-input-lineage-r1.mjs`는 **위 로더가 이미 반환한 값을 함수 인수로 받는 비파괴 shadow 함수**다. 새 API/수집/DB 읽기/쓰기 없음. 오직 scorer가 사용하는 값을 선택·해시하며 출력은 비복원성 SHA-256 한 개와 상태 메타데이터다.
- 단위 시뮬레이션 12/12 통과: 실제 사용 데이터 정정·신규 관측·공개 점수/보조값 변경/TTL 결측/실제 as-of 경계는 감지; 무관한 PAYEMS/레포 및 확인·저장 시각만 변경하면 서명 유지. 기존 범용 9/9 포함 **전체 21/21** 통과.
- **명확한 미증명:** PC 운영의 실제 파일 SHA, 실제 원자료 body hash/공식 revision, 실제 D09 score·checkpoint과 shadow 서명 대조, Writer 연동, D1·API·UI 게시 0건. 과거 CURRENT_VINTAGE 이력을 당시 확정 이력으로 변조하지 않는다.

## 2026-11-10 D09 공개 API 독립 조회 증거 (읽기 전용)

- 검증 경로: `https://zgmini.kr/api/credit-risk-detail`; 외부 HTTP 직접 GET에서 **200**, `application/json`, 수신 **9,163 bytes**, `JSON.parse` **PASS**. 브라우저 표시 텍스트만 일부 인용부호가 변형되어 파싱되지 않았으나 직접 HTTP 본문 검증으로 서버 JSON 실패가 **아님**을 구분했다.
- 응답: `status=READY`, `score=72.21387249113027`, `scoreMatch=true`, `asOfDate=2026-11-09`, `methodologyVersion=CREDIT_RISK_DIAGNOSTIC_R1`.
- 계산 입력에 나타나는 최신 관측일: HY/IG/Total CMDI 모두 **2026-10-23**, 채권 변동성 **2026-11-05**. 관측일과 API 기준일을 혼동하지 않는다.
- 추세 **51점**, 첫 번째 **2025-11-14**, 마지막 **2026-11-09** 점수 **72.21387249113027**. `historyMode=CURRENT_VINTAGE_DERIVED_1Y`, `lookAheadSafe=false`이므로 **이 51점을 당시 확정 원자료 기반의 일별 실제 이력 51건으로 집계하지 않는다.**
- 공개 응답에는 `sourceVersion`/`sourceStoredAt`이 없다. 이는 해당 endpoint의 현재 표시 계약 관측일 뿐 D1 원본 부재나 Writer 결함의 증거가 아니다.
- 공통 PC 읽기 전용 결과 `results/42693903840-1-seat-1.json`(#1136)에서는 22개 설치 전용 파일 근거를 확인했으나 D09 `worker/projection-checkpoint-r52.mjs`와 실제 D09 입력 SHA는 포함되지 않았다. `runtimeSourceVerified=false`이므로 checkout SHA를 실행 중 원천으로 간주하지 않는다.
- **확정 상태:** D09 공개 API 계약 조회 **1/1 PASS** / 원관측→PC→계산→Writer→D1→공개 전 구간 **0/68 PASS**. API 확인은 실운영 종단 완료율에 가산하지 않는다. 새로운 예약, PC 변경, D1/배포 변경 **0건**.

## 2026-11-10 S01 정보기술 섹터 독립 개발·공개 조회 증거

- `scripts/pc-writer/sector-fear-greed-r3-local-cycle.mjs`의 실제 공개 입력은 `buildSectorFearGreedR3RollingLocalSource(...)` 출력이며, 전체 11개 섹터와 해당 252개 `fiveRaw`가 동일 날짜로 정렬돼야 `buildSectorFearGreedR3Public()`가 승인된 R3 점수를 게시한다. 개발 shadow에서 로컬 파일을 다시 로드하거나 공급자를 호출하지 않는다.
- 신규 `lib/score-history/sector-r3-input-lineage-r1.mjs`: **S01–S11 공용으로 호출 가능한 순수 후보 함수**. sector별 252일 중간 계산 입력 `date/score` 및 전원 공개 READY/정렬 gate만 서명한다. `generatedAt`, `updatedAt`, 출력 저장시각은 제외한다. **원공급자 OHLCV/PIT 전체 원자료 해시나 공식 revision을 증명하는 함수가 아니다.**
- 신규 `tests/sector-r3-input-lineage-r1.test.mjs`: **13/13 PASS**. S01 정정/거래일·타 섹터 정렬 이상/결측/모델 gate 변화와 무관한 S02 점수 변화·저장시각을 구분했다. 동일 확정 거래일 점수 정정은 변화 탐지만 하고, 원래 운영 코드의 `SECTOR_FEAR_GREED_R3_SAME_DATE_SCORE_DRIFT` 검사/승인 기준을 변경하지 않았다.
- 실제 직접 GET `https://zgmini.kr/api/sector-fear-greed` 응답: 유효 JSON, `status=READY`, `phase=CONFIRMED`, `observationDate=confirmedObservationDate=2026-11-06`, `methodologyVersion=SECTOR-FEAR-GREED-R3-FIVE-AXIS-COMPLETE`, `sourceVersion=SECTOR-FEAR-GREED-R3-ROLLING-252-V1`, `referenceObservations=756`; **11개** sector 모두 존재, S01 `technology=18.6035`.
- 공개 `history`는 **252개** 점, 첫 날짜 2025-11-06/마지막 2026-11-06이며 마지막 S01 값 18.6035; `sourceGeneratedAt=2026-11-07T00:02:27.703Z`, `updatedAt=2026-11-07T00:02:40.895Z`. 이는 **한 번 재계산·게시된 252일 추세**이지 모든 날짜에 각각 확정 게시됐다는 증거가 아니다.
- 테스트 총합: 공통 서명 **9/9**, D09 **12/12**, S01 **13/13**, 합 **34/34 PASS**. 소스 기반 shadow 후보 연결 **D09+S01 두 종류**(2/68 논리 항목만 특정, S01 모듈을 나머지 S02–S11 설치 완료로 계산하지 않음); 공개 계약 GET 2개 PASS; 종단 검증·신규 일별 게시 여전히 **0/68**. 운영 PC 변경·스케줄·Writer·D1·Cloudflare 쓰기 **0건**.

## 진행률 표기

- 시작·현재 실운영 종단 검증: **0/68 (0%)**. 기초 9/9 + D09 12/12 + S01 13/13의 개발 시험 **34/34**는 별도 지표이며 68개 공개 완료율에 더하지 않는다.
- 브랜치 코드 개발은 테스트 통과와 원격 commit/read-back으로만 완료 처리한다. 실제 PC·D1·API/UI 검증은 별도 게이트다.
