# ZGMINI 68개 점수 실제 일별 이력 — 백엔드 실행 계획 R1

> **범위 정정 (2026-11-10 KST):** 사용자가 이 대화의 원래 목표를 **대시보드 점수 출력 기준 통일**로 재확인했다. 이 문서와 브랜치의 입력 감지·실제 일별 이력 구축은 **별도의 백엔드 개선 과제**이며, 원래 UI 출력 통일의 완료 조건·진행률 분모·필수 선행 Gate가 아니다. **현재 대화에서 이 브랜치의 후속 구현은 `DEFERRED_SEPARATE_SCOPE`**로 구분한다. 사용자/기능 담당자의 별도 진행 지시를 임의 취소하거나 기존 승인·코드·테스트를 폐기하는 뜻은 아니다. UI 출력 작업은 `codex/ui-improvements`에서 계속하며, 원인 분석 정본은 [`docs/DASHBOARD_SCORE_OUTPUT_SCOPE_DRIFT_R1.md`](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/ui-improvements/docs/DASHBOARD_SCORE_OUTPUT_SCOPE_DRIFT_R1.md) 참조. 아래 '다음 단일 필수 작업'은 이 **별도 백엔드 과제 재개 시에만** 적용된다.


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

Controller #917 담당자의 실제 운영 변경에 개입하지 않고, **D05의 원자료 배치·12개 영역 Reader가 이미 기록하는 checkpoint/원관측일/정정 근거**를 저장 위치별로 찾아 `composite-observed`의 기존 계산 사건 1개와 인과적으로 연결할 수 있는지 읽기 전용으로 확인한다. 기존 공개 이력 경로 재사용이 우선이며 신규 DB/예약/Writer 생성 금지. T02 데이터센터·전력은 개인 후보 계산까지 입증됐어도 권리 확인 및 공용 theme baseline 복구가 분리된 선행 의존성이라 직접 게시하지 않는다. D09 PC 실측은 기존 승인 Reader/실행 증거에 `projection-checkpoint-r52.mjs`의 설치 SHA와 해당 입력이 확인되는 즉시 이어서 진행한다. 현재 확인한 A급 설치 사전이미지 조회 고정 목록에는 이 파일이 없으므로, Controller 작업 중 새 manifest/PC-job을 요청하지 않는다. 운영 변경이 필요하면 실제 겹치는 부분만 별도 승인받는다. 나머지 점수의 입력/주기를 임의 통일하지 않는다.

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

## 2026-11-10 T02 데이터센터·전력 테마 입력·발행 계약 조사 (구현 보류)

- `config/theme-data-registry.json`에서 T02 `data-center-power`, ETF **DTCR/GRID**, 기준 **SPY**, 산식 `ETF_ONLY_T40_R20_V40_PAIR50`, 상태 `PRIVATE_PC_SCORE_AND_TASK_VERIFIED_PUBLICATION_PENDING`을 확인했다. 2026-10-25 기록은 private 점수 **12.32143**, 관측일 **2026-10-23**, `d1Writes=0`으로 **현재 공개 검증값이 아니다**.
- `scripts/pc-writer/theme-data-center-power-r1.mjs`는 `themes/data-center-power/raw-manifest.json`의 각 파일 SHA-256과 `DTCR/GRID/SPY` 시계열을 확인하고 공통 **628세션 이상**, 최종 **252점** 개인 계산 결과를 생성한다. 가격은 공식 종가가 아닌 `UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12` 방식이라 원자료 계약을 그대로 표시해야 한다.
- `worker/theme-data-center-power-r1.mjs::eligibleDcPower`는 **공통 공개 테마 기본 feed READY 및 최소 7개 테마**, 관측/게시 최신성, 독립 검증된 권리 또는 `licensingRiskAcceptedByPublisher=true`의 명시적 제한 승인, 원자료와 계산 결과 무결성, 과거 252점 정렬을 요구한다. 승인 없는 권리 수용값 생성·D1 측면 게시 금지.
- 실제 GET `https://zgmini.kr/api/theme-fear-greed`: 유효 JSON, `status=UNAVAILABLE`, `reason=STORED_DATA_STALE`, 공개 `themes=[]` **0/30**. 이는 T02 하나의 코드 오류나 현재 PC 수집 실패를 곧바로 입증하지 않는다. **현재 T02 공개 end-to-end BLOCKED**, 68개 전체를 이 문제로 대기시키지 않는다.
- 이 사유로 T02 shadow 스코어를 신규 운영 필드·게시 흐름에 연결하지 않는다. 먼저 승인된 D05 입력 계약에 대한 독립 개발을 계속하며, 테마 원담당의 기본 feed 복구와 별개로 진행한다.
- GitHub 최신 `main`이 **e77f1435894d12a8fd01425d0649b566e1cf856d**로 이동해 본 전용 브랜치는 **11 ahead / 4 behind** 상태다. 해당 4커밋 변경 파일은 `scripts/pc-writer/run-local.mjs`, `scripts/pc-writer/build-asset-r10-release.mjs`, 자산 릴리스 테스트이며 본 브랜치의 신규 7파일과 직접 경로 중복은 없다. 승인 없는 rebase/reset/merge는 하지 않는다.

## 2026-11-10 D05 미국 종합 CM-R1 실이력 재사용 및 인과 간극 점검

- 라이브 `GET https://zgmini.kr/api/market-score`: 유효 JSON, `status=SUCCESS`, `modelVersion=CM-R1`, `asOfDate=2026-11-09`, `overall.status=READY`, `score=47.31578798432822`, 12개 경제영역 **12/12 READY**. 현행 `overall.trend`는 **293점**이며 `dataQuality.historyMode=CURRENT_VINTAGE_ONLY`, `lookAheadSafe=false`; 이 추세를 당시 확정 기록으로 취급 금지.
- 별도 **기존 실제 계산 이력** `GET https://zgmini.kr/api/market-score/observations?period=1Y`: 유효 JSON, `status=READY`, `version=COMPOSITE_CALCULATED_SCORES_R1`, `availableDays=8`, `totalObservedPoints=30`, `sampled=false`, `timeMeaning=PC_CALCULATED_AT`. 최초 `2026-10-31T10:45:07.750Z`(46.88569913684497), 최종 `2026-11-09T20:42:51.176Z`(47.31578798432822). 현재 점수와 마지막 실제 계산점은 수치상 일치.
- 이미 구현된 경로: `scripts/pc-writer/market.mjs::calculateMarket`가 local 저장 입력/영역별 Reader로 12개 점수를 계산 → `run-local.mjs`가 current 저장 후 `appendCompositeObservedFromCurrent` 호출 → 기존 `market_public_snapshots_v1`의 `composite-observed:UTC-YYYY-MM-DD`에 `{version,date,points:[{calculatedAt,score,asOfDate,signature}]}` 기록 → `publishCompositeObservedArchive`가 D1 하루 key별 **최대 24일/run** 게시 및 동일 body/stored_at 재조회 → 공개 observations GET. **새 이력 DB나 새 작업을 만들지 않는다.**
- 현재 `signature`는 종합점수·asOfDate·12개 영역 id/status/score/asOfDate/methodologyVersion의 **FNV32 8자리**다. 실제 공급자 raw SHA/official revision/releaseAt/관측값 전체의 변화가 보장된 증거는 아니다. 날짜만 변해도 신규 서명 가능하며 동일 날짜 원자료 정정 시 계산 점수 불변이면 누락될 수 있다.
- 동일 signature면 새 계산 사건을 생략하며, 동일 날짜 **15분 미만** 변경도 skip, 일별 cap **100개**. 전일과 동일 점수의 새 UTC 날짜도 cross-day signature 중복 여부에 따라 생략될 수 있다. 이는 현재 **계산 사건 archive** 동작으로, 사용자 확정 기준의 매일 최종 KST 스냅샷/이월·정정 revision/supersedes와 동치가 아니다. 임의로 15분 제한·UTC DB 키·원본 이력을 변경하지 않는다.
- API에서 보이는 **8일/30점**은 당시 PC 계산 시각이 기록됐다는 공개 증거지만, 그 개별 점이 어떤 원공급자 관측·checkpoint→로컬 원자료→산식→D1에 연결되는지는 아직 실측 미완료. 현재 UI의 재구성 293점과 혼합 카운트·수치 비교 금지.
- `scripts/pc-writer/market.mjs::calculateMarket`는 `worker/candidate-market-operational-store.mjs::readStoredMarketInputs`를 통해 저장된 **7 batch**(`macro,credit,supply,fundFlows,bisDsr,bisTc,rates`)를 읽고, 추가로 저장된 earnings-risk 4요인·E1-R5·breadth Reader 결과를 결합한다. `readStoredMarketInputs`는 36h(일부 BIS 별도 TTL)의 유효성 검사 후 `series/external/providerSummary`를 병합하지만, 반환 본문에 **7개 배치의 원개별 stored_at·raw SHA·official revision을 모두 구별하는 보편적 메타데이터 계약은 없다**. 실제 필요한 관측 인과 추적은 이 **기존 저장 Reader의 선택 입력·체크포인트**에서 시작해야 한다. 기존 통합 결과의 저장시각만 해시하면 또 허위 갱신을 만든다.
- `worker/market-input-validation.mjs::readValidatedInput`는 7종 batch마다 `market_input_batches_v1`의 **최신 10개 후보**를 `stored_at DESC`로 조회한 뒤 처음으로 유효성 검증에 통과한 `body,storedAt`를 선택한다. 이 반환값에는 **원래 `batch_key`가 포함되지 않으며**, `readStoredMarketInputs`의 병합 후에는 개별 batch별 `storedAt`도 보존되지 않는다. `macro.seriesStoredAt`은 원시 시계열별 저장시각으로 존재할 수 있으나 전체 12영역 입력의 통합 출처 키를 대체하지 않는다. 따라서 **현 시점의 가장 최근 유효 입력과 10월 31일 계산 당시 입력이 같다고 가정할 수 없다**. 과거 사건과의 1:1 연계는 그 사건의 원본 batch·checkpoint 보존 여부를 먼저 확인해야 한다.
- 별도 `E1-R4` 위험요인은 `market_score_earnings_e1_r3_*`의 SEC 기반 기간별 사실과 성공 run을 읽고, `E1-R5`는 PC 로컬 SEC/BEA/BLS 입력 파일·CFO 역사 등에서 계산한다. E1-R5의 현재 `earningsR5InputFingerprint`는 파일 상대경로·크기·mtime 등을 포함하는 변경 감지 후보이지 공급자 원시 내용의 공식 revision 증명은 아니다. Breadth는 독립 저장 Reader 경로다. 그러므로 7 batch만 비교해서 **D05 전체 12영역의 원자료 인과 추적 완료라고 판정할 수 없다**.
- 기존 PC core-status #1128 `run-42689955371-1-seat-2`는 `local-cycle-last-run.json=COMPLETE`, `local-collection-last-run.json=COMPLETE`, `local-writer-last-run.json=VERIFIED` 확인. **SQLite 미개방(`sqliteOpened=false`)·D05의 local archive body/D1 동일 checksum 검증 없음**이므로 0/68 종단 PASS는 유지.
- D05의 완성에 필요한 최소 후속은 **기존 Reader가 제공하는 관측일·원자료 revision/checkpoint와 계산 사건의 실제 인과 연결**이다. 운영 산식·Writer·D1 계약 변경은 필요한 영향 범위가 확인되고 승인되기 전 실시하지 않는다. 이번 작업은 GitHub 개발 계획 문서만 수정; PC/DB/Writer/예약/Cloudflare 쓰기 **0건**.

## 진행률 표기

- 시작·현재 실운영 종단 검증: **0/68 (0%)**. 기초 9/9 + D09 12/12 + S01 13/13의 개발 시험 **34/34**는 별도 지표이며 68개 공개 완료율에 더하지 않는다.
- 브랜치 코드 개발은 테스트 통과와 원격 commit/read-back으로만 완료 처리한다. 실제 PC·D1·API/UI 검증은 별도 게이트다.

## 2026-11-10 D05 선택 배치 출처 shadow 검증 (비운영 개발)

- `lib/score-history/market-batch-provenance-r1.mjs`와 `tests/market-batch-provenance-r1.test.mjs`를 전용 개발 브랜치에 신규 기록. 실제 계산 Reader·DB·Writer·API 코드 변경은 없음.
- 기존 Reader가 **이미 선택해 반환한** `{body,storedAt}`와 호출자가 읽기 전용으로 전달한 후보 `{batch_key,body,stored_at}`를 비교해 정확히 1행만 일치하면 원배치 키·저장시각·비가역 저장본문 SHA-256만 반환한다. 불일치·중복 timestamp/본문·복호 실패는 `PROVENANCE_UNPROVEN/AMBIGUOUS`로 안전 거부한다.
- 기존 Reader가 후보 `batch_key`를 아직 넘기지 않으므로 이 함수만으로 **실제 PC 인과 증명이 된 것은 아니다**. 본문 SHA는 저장된 인코딩 바이트의 식별자로, 공급자 공식 revision·산식 입력 전체·일별 계산 이력 정합성의 증거가 아니다. D05는 7배치 외 SEC/E1-R5/Breadth 입력이 있으므로 전체 점수의 서명으로 직접 사용 금지.
- 로컬 회귀 검증: 신규 **8/8 PASS**, 기존 **34/34 PASS**, 합계 **42/42 PASS**. 원격 생성 후 두 신규 파일 blob SHA·본문 readback 일치. 신규 PC Issue·원자료 수집·SQLite/D1/Writer·예약·운영 배포 **0건**.
- **진행률:** 실제 원자료→계산→D1→API/UI 동일 사건 종단 검증 **0/68 (0%→0%)**. 백엔드는 원래 UI 출력 통일과 별도 범위이며 이번 코드가 UI 완료율에 가산되지 않는다.
- **다음 단일 필수 작업:** 기존 D05 원장에 남은 계산 사건 하나와 동일시점 원배치 키·본문 digest가 승인된 조회 경로에서 함께 확보되는지 확인한다. 부재 시 `INPUT_LINEAGE_UNPROVEN`으로 기록하고 기존 Reader 계약을 변경하기 전에 필요 입력·작업자·공용 소유 범위를 확정한다.

## 2026-11-10 D05 Reader 선택입력 출처 조회 shadow (운영 연결 전)

- 기존 개발용 대조기 `market-batch-provenance-r1.mjs`에 **읽기 전용 조회 어댑터** `lib/score-history/market-batch-provenance-read-r1.mjs`와 테스트를 추가. 실제 Reader가 **이미 선택한** `{body,storedAt}`를 호출자가 전달하면 기존 `market_input_batches_v1`의 최근 10개 후보를 `SELECT batch_key,body,stored_at ... WHERE batch_key LIKE ?`로 읽어 유일한 저장행인지 검사한다. **기존 Reader 자체·계산기·운영 쿼리·DB schema 수정 0건**.
- 같은 원자료 본문이지만 저장시각이 다른 경우, 선택행 소실, 동일시각 중복, 잘못된 prefix, SQLite 조회 오류에서는 출처를 임의 결정하거나 자동 재시도하지 않는다. gzip 등 디코딩은 기존 호출자가 제공한다. 원본 전체 데이터·키는 로그·D1로 복제하지 않는다.
- 로컬 신규 **8/8** 및 누적 **50/50** 테스트 PASS; 코드·테스트 원격 2파일 신규 반영 후 blob SHA·본문 readback 2/2 일치 확인. 원격 임의 운영 실증·PC 설치·D1 쓰기 아님.
- **미완료:** 현재 score 계산 경로에서 선택 입력을 어댑터에 전달하는 실제 shadow 연결, 계산 당시 7 batch 및 SEC/E1-R5/Breadth의 동시 증거, PC source 런타임, D1/API/UI 동일 계산 사건. 68개 종단 **0/68 (전체 0%)** 보존.
- **다음 단일 행동:** 실제 `readStoredMarketInputs`가 이미 선택한 batch들을 계산 결과와 함께 전달하는 **선택형 read-only evidence callback**을 전용 개발 브랜치에서 검토·시뮬레이션한다. 현재 반환 JSON·공개 계약을 바꾸지 않는 설계만 검증하고, 운영 변경 및 공유 Writer 소유권·승인이 필요한 단계는 분리한다.

## 2026-11-10 D05 계산 입력 비차단 shadow 관찰 (운영 미적용)

- `lib/score-history/market-input-observation-shadow-r1.mjs` 및 시험 신규 반영. 기존 `readStoredMarketInputs` 함수를 인자로 받아 Reader가 실제 호출한 `store.readInput(key)` 선택값을 감시하고, 그대로 Reader로 반환한다. 선택된 7개 batch마다 기존 비파괴 `readSelectedMarketBatchProvenance`를 호출해 출처 증거를 분리 생성한다.
- **검증 실패도 점수 계산 입력 자체는 바꾸지 않음.** 선택배치 부재 `MISSING`, 중복/읽지 않은 키/DB 미일치 `UNPROVEN`을 구분하고, 임의 SQL 실패 상세는 기록하지 않는다. 원래 Reader 자체 오류는 정상적으로 상위에 전달한다. **7배치 VERIFIED도 D05 SEC/E1-R5/Breadth의 완전 인과/게시 완료가 아님**을 `SHADOW_7_BATCHES_ONLY`로 고정.
- 신규 8/8 + 누적 **58/58** 단위 시뮬레이션 PASS; 신규 GitHub 2파일 blob SHA·본문 remote readback 2/2 확인. 기존 `worker/candidate-market-operational-store.mjs`, `scripts/pc-writer/market.mjs`, DB schema, Writer/PC task, D1, 운영 source는 수정하지 않음.
- **진행률:** 실제 PC 동일 원자료 checkpoint→계산→로컬 이력→D1→API/UI 성공 **0/68 (0%→0%)**. 운영/source 승인 및 다른 기능 진행률과 혼합하지 않음.
- **다음 단일 필수 실행:** 최신 승인된 실제 PC Reader/원장에 원자료 배치 key·digest를 같은 계산 사건으로 꺼낼 수 있는 A급 조회 계약이 존재하는지 확인한다. 기존 조회 결과에 부재하면 정확한 해당 파일/Reader의 경계와 승인 효과만 분리하고, source-only sim을 운영 PASS로 부풀리지 않는다.

## 2026-11-10 D05 실제 PC 증거 경로 판정 및 공통 인계

- 최신 `zgmini-pc-control` main `config/operations.json`과 `controller/operations.mjs`, `controller/source-inventory-runtime-readonly.mjs`, `controller/fear-greed-archive-readonly.mjs` 검토: 허용된 원자료 재고 A는 7계열별 배치 COUNT/MAX(stored_at)·요약만 반환하고, archive A는 `composite-observed` 계산 점수/시간·서명만 반환한다. **과거 계산 사건의 실제 선택 batch key/body SHA/checkpoint를 결합한 계약 없음**.
- 이미 실행된 [PC #1023](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1023) / Run `42595227055`는 `source-inventory-runtime-readonly`에 `BLOCKED / OPERATION_NOT_ALLOWED`, `LAST PASS=EVENT_RECEIVED`, `FIRST FAIL=EVENT_OR_REQUEST_VALIDATION`, PC 운영 변경 0이었다. **저장소 allowlist와 설치 Controller allowlist 불일치가 실제 관측된 것**이므로 같은 Issue 재요청·다른 이름으로 우회하지 않는다.
- **두 독립 간극**: (1) 현재 설치 A로 특정 D05 계산 출처 조회 불가(`EVIDENCE_ACCESS_GAP`), (2) 기존 archive `signature`는 점수/도메인 결과 기반 출력 FNV32라 2026-10-31 당시 원입력 인과 추적이 기록된 증거가 아님(`HISTORICAL_INPUT_LINEAGE_UNPROVEN`). 오늘 최신 7개 batch SHA 조회만으로 과거 사건을 복원 불가. 신규 Reader 증거 조회를 설치해도 **과거 입력 메타데이터가 원래 기록되지 않았다면 과거 출처 PROVEN 불가**.
- 새 [공통 요청 #1206](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1206)에 원장 재사용·과거 사건 1건 인과 기록 가부·미기록 시 미래 계산 사건에 선택된 7 batch 및 SEC/E1-R5/Breadth 입력 체크포인트를 일치시킬 최소 비민감 계약만 인계. 소유권은 공통 조회 Controller/운영 Reader와 D05 원담당 기능으로 분리, 복구 중인 공유 Controller 설치 lane을 임의 점유하지 않음.
- **진행률:** 시작·종료 실제 68개 공개 종단 완료 **0/68(0%→0%)**. 이번에는 개발/모의 테스트 재실행·PC 새 Issue·수집/DB·Writer·D1·운영 배포 **0건**. 공통 지원 이슈 #1206 발행 및 원문 근거 정리만 완료.
- **다음 필수 행동 하나:** D05 원담당은 독립적으로 기존 `market.mjs` 계산 시점의 배치·SEC/E1-R5/Breadth 증거를 **입력/결과 계약 변경 없이** 어떤 이벤트 ID에 연결할 수 있는지 코드 호출 경계 한 곳을 확정하고, 공통 담당에게는 #1206의 과거 원장 증거 가부 판정을 맡긴다. 승인 없는 운영 연결·일별 백필·새 Controller 설치·기능별 예약 생성 금지.

## 2026-11-10 D05 계산 호출 경계 opt-in 연결 — 개발 브랜치 한정

- 최신 main의 `scripts/pc-writer/market.mjs::calculateMarket`가 `readStoredMarketInputs`로 7개 선택값을 읽고, 동일 `run-local.mjs`의 `now`로 `current` 저장 후 `appendCompositeObservedFromCurrent(db,now)`를 호출하는 경계를 확인했다. archive의 `calculatedAt`과 입력 선택 시각을 **연결할 수 있는 후보 호출 지점**은 이 `collectInputs`이며 기존 과거 archive에 연결 증거가 기록돼 있었다는 뜻은 아니다.
- 기존 `market.mjs`에 선택형 `{onInputEvidence}` 네 번째 인자만 추가. 호출자가 제공한 경우에만 기존 `observeStoredMarketInputs` shadow를 사용하고, 점수 계산이 성공한 때 해당 `now` ISO·asOfDate·score 및 **7배치 부분 증거**를 callback으로 반환한다. 기본 호출 `calculateMarket(root,db,now)`는 이전 Reader를 그대로 1회 실행하며, 추가 출처 SELECT·점수 산식·산출물 JSON·Writer 저장/게시 방식 변화가 없다.
- shadow 증거 조회 실패·조회한 본문 불일치·callback 자체 예외는 계산 결과를 변경하지 않는다. 원래 Reader/점수 계약 오류는 그대로 실패하며 callback으로 거짓 PASS를 보고하지 않는다. `SHADOW_7_BATCHES_ONLY`이므로 독립 SEC/E1-R5/Breadth, 공식 source revision, D1 게시 성공, 과거 입력 연결을 증명하지 않는다.
- `tests/market-calculation-evidence-hook-r1.test.mjs` 신규 **5/5**: 기본 호출 읽기 7/추가 SELECT 0; opt-in 호출 읽기 7/증거 SELECT 7 및 같은 계산시각; batch 불일치 UNPROVEN+점수 보존; 보고 callback 오류 비차단; 원래 Reader 오류 전파. 실제 외부 의존성은 격리 fixture이며 **실PC Windows 통합 PASS가 아니다**.
- 기존 증거/입력 단위 시험 포함 로컬 **63/63 PASS**, `node --check` PASS. 신규 코드·시험 GitHub 정확 본문 readback **2/2 PASS**, 브랜치 개발만 수행. 공유 `run-local.mjs`, DB schema, Writer source/설치, Core Task, D1, 공개 API/UI는 **변경 0**.
- **전체 68개 실운영 종단:** **0/68 (0%→0%)**. 개발 관찰 callback이 실제 운영 저장 증거는 아니다.
- **다음 필수 행동:** 공통 #1206의 과거 연계 증거 가부를 기다리는 동안, D05 원담당은 `run-local.mjs`의 기존 계산 사건 `now`와 archive 성공 상태를 연결해 **검증 성공 사건에만 비민감 lineage를 보존**할 단일 저장/원장 계약을 승인 범위와 함께 준비한다. 실제 Writer 변경·B 설치·공개 게시 전환은 소유권/승인 확인 뒤에만 수행하며 7배치만으로 12영역 전체 READY 표기 금지.


## 2026-11-10 D05 계산 사건↔로컬 archive readback 대조 — 개발 한정

- 동일 계산 호출 `now`를 기준으로 `lib/score-history/composite-archive-lineage-link-r1.mjs` 신규 추가. 기존 `compositeSampleFromVerified`를 재사용해 `calculatedAt/asOfDate/score`와 **출력 FNV32 서명**을 산출하고, 로컬 `composite-observed:YYYY-MM-DD` 행을 **읽기 전용으로 재조회**해 정확히 같은 사건 1건인지 확인한다. `market_public_snapshots_v1`·`run-local.mjs`·기존 archive append 구현은 수정하지 않음.
- archive 결과가 `LOCAL_STORED`가 아니면 실패 종료. 특히 `UNCHANGED`는 신규 계산 이력 증거로 인정하지 않는다. 저장시각, 이벤트 시각, 점수/출력 서명, archive 버전/개수, 7개 선택 배치의 key·storedAt·SHA-256이 불완전하거나 다르면 `UNPROVEN`/안전 거부한다. SQLite/운영 원자료 쓰기·재시도·민감 본문 반환 없음.
- 성공 상태도 **`LINKED_SELECTED_7_BATCHES_ONLY` / `LOCAL_PC_ONLY`**로 고정. 7개 *선택값*의 로컬 기록만 대조한 개발용 함수이며, TTL 후 실제 반영 입력·SEC/E1-R5/Breadth·공식 revision·PC Runtime·D1/API/UI 게시의 증거는 아니다. 검증기는 기존 `run-local.mjs` 호출에 아직 연결되지 않았고 새 메타데이터를 영속 기록하지 않는다.
- 단위 시뮬레이션 신규 **12/12 PASS**, 기존 포함 누적 **75/75 PASS**; 신규 2파일 GitHub 원격 본문·blob readback **2/2 일치**. 운영 PC·Writer·DB·D1·API·UI 변경 **0건**.
- **실제 68개 종단 완료율: 0/68(0%→0%)**. 본 백엔드 개발은 사용자 원래 대시보드 출력 통일과 별도 범위이며 UI 작업 완료 조건으로 전환하지 않는다.
- **다음 필수 행동 하나:** D05 원담당은 계산→archive 성공 지점의 기존 승인 운영 ledger 중 *새 비민감 메타데이터를 저장할 수 있는 계약이 있는지* 정확한 소유권·필드 범위와 함께 확인한다. 없다면 승인 없는 Writer/DB 변경 없이 이 호출 연결·메타데이터 영속화는 보류한다. 이후 독립 SEC/E1-R5/Breadth 원입력 증거를 확보한 뒤 실제 사건 1건 검증으로 진행한다.


## 2026-11-10 D05 기존 Writer ledger 재사용 적합성 판정

- 최신 `main`의 `scripts/pc-writer/run-local.mjs`, `publish.mjs`, `publication-guard.mjs`, `composite-observed-archive-r1.mjs` **읽기 전용 조사** 결과, `local-market-ledger.json`은 원입력 기록이 아니라 공개 `current`의 `SUBMITTING→VERIFIED` 및 `bodyHash/storedAt` 충돌 보호용 **단일 상태 파일**이다. 여기에 7배치 SHA 이력을 추가하거나 덮어쓰기 금지.
- `local-publication-ledger.json`도 원격 게시 중 복구용 상태이고, `local-writer-last-run.json`은 실행마다 덮어쓰는 결과 보고서다. `publication-events.jsonl`은 append-only이나 현재 계약은 게시 실행 상태·오류의 기록용으로, 계산 입력 계보를 영속화하는 **승인된 불변 사건 원장으로 확인되지 않았다**. 기존 `composite-observed` SQLite/D1 key에는 점수·계산시각·출력 서명만 있다.
- **판정: 재사용 가능한 승인된 완전 입력 계보 ledger 미확인 (`PERSISTENCE_CONTRACT_GAP`)**. 신규 필드/전용 파일/DB 키·retention을 임의 신설하지 않고, 이번에는 PC/Writer/원장/D1 쓰기 **0건**. #1206 공통 입력 조회 근거와 별개로 D05 전용 **비민감 사건 메타데이터 영속 계약**의 소유자·범위·승인 여부를 먼저 확정해야 한다.
- **종단 완료율 유지: 0/68(0%→0%)**. 다음 실제 실행은 기존 승인 ledger 계약이 확인되거나 신규 영속 경로가 명시 승인된 후, 개발용 readback 함수를 **1개 실제 D05 계산 사건**에 최소 범위로 연결하는 것이다. 승인 이전에는 공용 Writer 설치·운영 수정 보류.


## 2026-11-10 D05 독립 입력·실제 공개 관측 재점검

- 최신 `main` 읽기 조사: D05 계산 핸들러는 7배치 외에 **독립 E1-R5 실적 생산 사이클, SEC 기반 E1-R4 위험진단, B1-R5 수급·폭 Reader, 별도 고용·물가·소비·성장 등 저장 Reader**를 사용한다. 7배치 `SHADOW_7_BATCHES_ONLY`는 12영역 전체 원입력 계보가 아니다. E1-R5 `inputFingerprint`는 파일 경로/크기/수정시각·기업집합 해시이며 파일 바이트 SHA/SEC accession 전체 결합 증거 아님. B1-R5의 최신 universe·가격/EMA 집계는 당시 선택 ID가 출력에 고정되지 않고 일부 저장행이 정정될 수 있어 과거 인과 복원 불가. [공통 #1206](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1206)은 여전히 open/댓글 0이며 과거 증거 판정 미회신.
- **2026-11-10 KST 실제 공개 읽기:** `GET https://zgmini.kr/api/market-score/observations?period=1Y` → `READY`, `COMPOSITE_CALCULATED_SCORES_R1`, `availableDays=9`, `totalObservedPoints=33`, 최신 `2026-11-10T00:55:52.080Z` / `asOfDate=2026-11-10` / score `47.01390256458039`. 공개 `/api/market-score`의 `SUCCESS`/`CM-R1`/`asOfDate=2026-11-10`/종합 점수 동일을 브라우저에서 관찰. **별도 D1 테이블 단일 행 readback·실PC 당시 SHA 대조는 미실시**, API 반환 성공만으로 전체 PC→D1 독립 검증 완료는 아님.
- 운영 중인 `appendCompositeObservedFromCurrent`→`publishCompositeObservedArchive`→읽기전용 관측 API가 **실제 신규 관측 9일·33점을 축적**하고 있음. 과거 날짜의 비관측 추세점은 이 `PC_CALCULATED_AT` 사건 33건과 혼합해 '그날 실제 계산'으로 주장하지 않는다. 신규 immutable 원입력 lineage/ledger 부재는 **이미 승인된 성공 계산점의 정상 보존·공개를 중단시키는 Gate가 아니다**. 개발용 lineage 보강만 별도 승인 범위로 분리한다.
- **진행률:** 68개 전체 1년 실원자료→저장→공개 같은 사건 종단 PASS `0/68(0%→0%)` 유지. D05의 공개 관측 축적은 별도 부분 달성 `9일/33건`으로 정량 보고한다. `main`/운영 PC·Writer·DB·D1·UI 변경 **0건**.
- **다음 단일 필수 행동:** 신규 기능·원장 추가보다 먼저 D05 공개 관측 33건의 **개별 D1 저장 행 `body/stored_at`와 API의 동일점 1건**을 승인된 read-only 조회로 대조할 수 있는지 확인한다. 가능하면 기존 성공 증거 재사용; A급 접근/권한이 막히면 정확한 불가 원인만 기록하고 독립 기능 작업은 계속한다. SEC/Breadth 선택 ID 추가 포착은 별도 기능 확장·승인 뒤로 분리한다.


## 2026-11-10 R6.1 개정 지침 대조 및 재개 실행계획

> **범위:** 이 계획은 D05 **별도 백엔드 일별 이력 과제**의 명시적 재개 시 적용한다. 원래 대시보드 점수 출력 통일은 codex/ui-improvements의 별도 담당 범위이며, 백엔드 과제를 UI 작업의 신규 Gate로 만들지 않는다. 이번 요청으로 승인된 것은 **전용 개발 브랜치의 계획 갱신**이며 운영 수정·PC 실행·공개 배포·main 병합이 아니다.

### 시작 기준

- D05 전용 브랜치: ansqhd5774-Choi/zgmini / codex/dashboard-score-daily-r1. 전용 계획서 한 파일만 갱신하며, 다른 담당자·배포 브랜치·Controller 파일은 변경하지 않는다.
- 매 작업 시작·재개 시 ansqhd5774-Choi/zgmini-pc-control 최신 main의 AGENTS.md, docs/GENERAL_CHAT_START.md, docs/PC_AUTOMATION_STANDARD.md의 관련 최신 변경만 확인한다. 지침 반복 학습은 신규 실적이나 정지 사유가 아니다.
- 승인된 정규 Writer B에서 **확정 수리 가능 실패** 발생 시에만 별도 격리 Windows Runner(zgmini-handoff-ci-isolated)가 원본 증거를 확인해 agent-handoff에 접수한다. 단일 중앙 ChatGPT가 처리하고 **원본 GitHub Issue**에 결과를 반환한다. 이는 다른 일반챗의 자동 수신·자동 재개 또는 PC 설치가 아니다. 성공·WAIT_RECORDED·미확정·안전 대기를 수리 사고로 바꾸지 않고 검증 전용 인위적 B를 만들지 않는다. 격리 intake 자연 실패의 전체 왕복 관측은 DEFERRED로서 독립 기능을 막지 않는다.
- 마지막 실측(2026-11-10 KST): 공개 D05 실제 관측 archive **9일/33개 PC 계산 사건**. 최종 계산 사건 2026-11-10T00:55:52.080Z, asOfDate 2026-11-10, score 47.01390256458039; 공개 현행 점수 동일. **독립 D1 한 행 body/stored_at와 원입력 전체 계보 미확인**. 완성된 진짜 1년치 동일 사건 검증은 **0/68(0%)**. 기존 개발 시험 75/75 PASS는 실제 PC/게시 PASS와 구분한다.
- 공통 지원 Issue #1206은 조회 가능 증거와 과거 계보 잔존 여부의 소유자 문의다. 기존 #1023의 OPERATION_NOT_ALLOWED 요청을 반복하지 않는다. 공통 회신 대기는 D05 정상 관측 축적의 차단 사유가 아니다.

### 세 단계 최소 실행 계획

| 단계·담당 | 실행 및 입력 | 완료 판정 | 실패·권한 경계 |
|---|---|---|---|
| **1. D05 원담당 / 읽기 전용 대조** | 승인된 D1 테이블 조회 수단에서 기존 composite-observed:YYYY-MM-DD의 **정확한 하루 한 행**을 읽고 공개 observations API의 **동일 calculatedAt·score·asOfDate** 및 D1 행의 body/stored_at을 대조한다. | 실제 D1 저장 내용과 API 사건 1건이 동일하며 관측일·계산일·게시일 차이를 기록. READY/HTTP 200만으로 PASS 금지. | 승인되지 않은 SQL·우회·새 설치·재게시 금지. 접근 불가 시 EVIDENCE_ACCESS_GAP으로 보류하고 기존 9일/33건 축적은 보존. |
| **2. D05 원담당 / 계산 사건 1건 인과 검증** | 기존 원자료 batch 7종뿐 아니라 SEC/E1-R5·Breadth·나머지 Reader/checkpoint가 **같은 실제 계산 사건**에 연결되는지 기존 승인 증거로 확인하고, 필요 범위만 공통 #1206 담당과 조정한다. | 원관측 → 로컬 원자료 재조회 → 승인 계산 → 로컬 archive → D1 → API/UI **하나의 사건** 증명. 7배치 shadow만으로 12영역 완료 주장 금지. | 과거 선택 입력 기록이 없으면 HISTORICAL_INPUT_LINEAGE_UNPROVEN. 과거를 최신 입력으로 복원·조작 금지. 새 불변 계보 필드/원장이 필요하면 소유권·영향·보존 범위와 별도 승인을 받은 후 정규 B 적용. |
| **3. 각 기능 원담당 / 68개 확대** | 검증된 방법만 재사용하며 대시보드 27·업종 11·테마 30의 **각기 다른 발표·정정·산식·주기**를 보존한다. 테마 공용 feed·권리 문제는 해당 원담당 별도 처리. | 점수별 **진짜 1년치 원관측/계산/저장/D1/API/UI**가 확인된 건수만 분자에 추가. 새로 누적되는 실제 관측일·계산 건수는 별도 관리. | 특정 데이터 수집 불가/권리·승인 문제는 그 점수만 BLOCKED/DEFERRED. 나머지는 계속. 자연 예약 자동 갱신 검증은 모든 필수 기능 완료 후 진행. |

### 실행 순서·변경 금지·증거

1. **명시적 D05 백엔드 재개 후**, 가장 먼저 승인된 읽기 수단으로 기존 **D1↔API 한 사건**을 검증한다. 이미 검증된 계산·공개 성공 증거를 재사용하며 유사한 새 예약·Controller 실증을 만들지 않는다.
2. 실제 1년 이력에 필수인 **동시점 원입력 계보**가 있는지 판정하고, 미보존 과거 사건을 허위 backfill하지 않는다. 새 Writer/DB/TTL/산식/게시 계약이 필요한 때에만 변경 효과와 담당·승인을 확정한다.
3. 한 사건이 검증되면 각 점수의 정상 수집→계산→저장→D1→API/UI를 넓힌다. 공유 쓰기만 lease·단일 담당자로 직렬화하고 독립 조회·개발은 진행한다.
4. LAST PASS/FIRST FAIL, 원본 requestId/운영 SHA, 실제 PC Runtime, archive/D1 body·stored_at, 공개 API/UI를 구분한다. STATE_UNKNOWN은 임의로 성공 또는 실패로 바꾸지 않는다.
5. 승인 없는 운영 source·산식·가중치·TTL·원자료·DB/D1·예약·DNS·Cloudflare·UI 수정은 하지 않는다. 원격 브랜치 문서 변경은 PC 실제 설치나 사이트 게시의 증거가 아니다.

**이번 지침·계획 반영 전후 68개 기능 종단 완료율: 0/68 → 0/68(0%→0%).** 9일/33건은 위 실측 시점의 별도 부분 성과다. 다음 **실제 기능 실행**은 독립 D1 한 행 대조이며, UI 원담당 업무의 선행 조건이 아니다.


## 2026-11-10 D05 R6.1 재개 실행 결과 — D1 단일 행↔공개 API

- **1단계 실제 승인된 읽기 전용 검증 PASS 1/1:** Cloudflare D1 계정 zgmini-core-r42의 기존 `market_public_snapshots_v1` 테이블을 Studio **행 탐색/페이지 이동만으로** 열었다. SQL 입력·실행, 운영 PC 호출·Writer·DB/D1 쓰기·Cloudflare 배포 **0건**. 단일 저장 key **`composite-observed:2026-10-31`** 행의 `body` JSON.parse 성공, `version=COMPOSITE_CALCULATED_SCORES_R1`, `date=2026-10-31`, `stored_at=1793443507750`, `points` 1개 확인.
- **독립 공개 API와 필드별 일치:** D1 `calculatedAt=2026-10-31T10:45:07.750Z`, `score=46.88569913684497`, `asOfDate=2026-10-31` ↔ `GET /api/market-score/observations?period=1Y`의 첫 `observedAt/score/asOfDate`와 완전히 일치. 날짜 버전도 일치. D1 `stored_at`은 해당 계산시각의 epoch milliseconds와 같지만 이를 실제 D1 게시 완료시각으로 대체 해석하지 않는다.
- **현재 공개 이력 증가:** API 응답 직접 JSON.parse `READY`, `availableDays=9`, `totalObservedPoints=34`, 마지막 `2026-11-10T12:00:13.385Z` / score `47.97618582151962` / asOfDate `2026-11-10`. 앞선 **9일/33건**은 당시 실제 관측값으로 보존하며 **이번 확인 9일/34건**으로 갱신. 브라우저 자동 번역으로 표시된 JSON 숫자 일부가 변형돼 일시 파싱 실패했지만 API 페이지 새로고침 직후 원문 JSON.parse 통과해 서버 오류가 아님을 구분했다.
- **증명된 범위:** `D1 저장 행 1건 ↔ 공개 API에서 같은 계산 사건`까지만 PASS. 해당 D1 `signature=null`이며 입력 SHA/revision/checkpoint, 로컬 저장 당시 Runtime source, 공급자 원관측→계산 및 전체 1년치 68개 이력은 **미증명**이다. 실제 종단 1Y 완료율 **0/68 (0%→0%)** 유지. 이 PASS가 과거 원입력 증거나 다른 점수의 완료율로 자동 전이되지 않는다.
- **2단계 현재 문제:** [공통 지원 #1206](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1206) 읽기 재조회 결과 **댓글 0**; 기존 #1023 설치 조회 거부와 archive의 historical input key 부재는 해결됐다는 증거가 없다. 과거 사건은 `HISTORICAL_INPUT_LINEAGE_UNPROVEN`으로 유지하고 최신 배치로 소급 추정하지 않는다. 공통 총괄의 원인 지원과 독립 관측 축적은 각자 계속하며 재차 인위적 Writer B/Controller 시험을 만들지 않는다.
- **다음 필수 실행 하나:** 공통 원담당이 승인된 기존 원장/Reader에서 **같은 계산 사건의 과거 원입력 선택 ID·revision·SEC/E1-R5·Breadth checkpoint**를 실제로 회수할 수 있는지 #1206에 범위 제한해 판정한다. **미보존이면** 향후 사건의 최소 비민감 metadata 영속 계약에 관한 소유권·승인 여부만 확정하고 과거 계보 복원이나 Writer/DB 필드 신설은 실시하지 않는다. 이 의존성 때문에 정상 D05 게시나 다른 콘텐츠 업무를 중지하지 않는다.


## 2026-11-10 D05 병렬 실측·KST 일별 시뮬레이션 및 미래 입력 계보 계약 점검

### 실제 공개 이력의 날짜 기준 검증 (읽기 전용)

- 동일 공개 `GET /api/market-score/observations?period=1Y`의 `COMPOSITE_CALCULATED_SCORES_R1` 계산 사건 **34건**을 각 `observedAt`(UTC)에서 `Asia/Seoul = UTC+09:00` 계산 날짜로 변환·그룹화했다. 공식 `asOfDate`나 D1의 기존 UTC day key는 변경하지 않았다.
- 공개 `availableDays=9`는 **UTC 계산 날짜 9일/34건**이다. 이를 KST 계산 날짜별로 집계하면 **8일/34건**이며, 각 KST 날짜의 마지막 실제 계산 사건만 고르는 **비파괴 시뮬레이션의 점수는 8개**다. 2026-10-31부터 2026-11-10까지 KST 일자 중 **11-01·11-02·11-06**은 실제 계산 사건이 없다. 이 날짜는 이전 점수로 채우거나 `DONE`으로 판정하지 않는다.
- 34건 중 **18건**은 공식 `asOfDate`와 **KST 계산일**이 다르다. `asOfDate`(자료·모델 기준일), `calculatedAt/observedAt`(실제 계산 시각), `stored_at`(저장 기록), UTC D1 key, KST 표시일을 서로 다른 의미로 보존해야 한다. KST 표시/계약 변경은 이번 검증에 포함되지 않는다.
- 8개 KST 마지막 사건 점수는 실제 아카이브에서 선택한 것이지만, 과거 같은 사건의 원입력 SHA·수정 이력·전체 산식 재현을 검증한 점수가 아니다. 본 시뮬레이션을 1년 실제 히스토리 복원 또는 운영 게시 성공으로 계상하지 않는다.

### 두 독립 조사 담당의 범위별 결론

1. **과거 계산 사건 출처:** 승인된 과거 PC A 읽기 결과 [#613](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/613)의 SQLite `composite-observed:2026-10-31` 저장 존재와 운영 완료는 확인했으나, 그때 실제 선택된 **7 batch의 원본 key/SHA 및 SEC/E1-R5/Breadth checkpoint**는 증거에 없었다. Archive 출력 FNV32 및 sidecar `UNATTESTED_LEDGER`만으로 12개 영역 원입력 계보를 소급 확정할 수 없다. 공통 [#1206](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1206) 당시 open/댓글 0으로 실증 회신 미확인. 과거 [#1023](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1023)의 A 실행은 `OPERATION_NOT_ALLOWED`, LAST PASS=`EVENT_RECEIVED`, FIRST FAIL=`EVENT_OR_REQUEST_VALIDATION`; 이 거부 요청을 재실행하거나 다른 operation으로 우회하지 않는다. 판정: `HISTORICAL_INPUT_LINEAGE_UNPROVEN`(정상 D05 축적에 대한 차단 아님).
2. **미래 계산 사건 입력 증거:** 개발 브랜치의 `market.mjs` 선택형 `onInputEvidence`와 `composite-archive-lineage-link-r1.mjs`는 **같은 계산시각·점수·출력 서명·archive 재조회·저장된 7개 선택 batch ID/시각/SHA**가 완전히 맞을 때만 `LINKED_SELECTED_7_BATCHES_ONLY`를 반환한다. 현행 `scripts/pc-writer/run-local.mjs`는 이 선택형 검증 연결을 호출하지 않는다. `UNCHANGED`는 신규 원장 사건이 아니며, 이미 있는 `local-market-ledger.json`·`local-publication-ledger.json`·`local-writer-last-run.json`·`publication-events.jsonl`은 새 불변 원입력 계보 원장으로 승인된 저장 계약이 아니다.
3. **독립 개발 시뮬레이션:** 원격 개발 브랜치의 기존 테스트를 로컬 Node로 재실행해 **75/75 PASS, 0 FAIL**. 그중 계산 callback **5/5**, 사건↔archive linker **12/12**다. 유효 연결·시각 불일치·중복/미저장 사건·SHA 부족/불일치를 격리 fixture로 검증했다. 이는 실제 Windows Writer/D1 종단 증거와 구별한다. 테스트 실행 과정에서 운영 PC·Writer·SQLite·D1·Cloudflare 쓰기 **0건**.
4. **브랜치 통합 주의:** 당시 `zgmini` `main` 대비 전용 개발 브랜치 **37 ahead / 8 behind**이며 `run-local.mjs`도 source SHA가 달랐다. 무단 merge/rebase/reset 및 다른 담당자 Writer 소스 덮어쓰기는 하지 않는다.

### 다음 실행 계획 — 의존성 한정

| 순서 | 수행 주체와 단일 행동 | 판정 증거 및 보호 |
|---|---|---|
| 1 | D05 담당·공통 #1206 소유자: 이미 승인된 read-only archive/입력 원장의 **같은 역사적 사건**에 7 batch 및 SEC/E1-R5/Breadth 선택 증거가 남았는지 좁은 범위로 확정 | 회수 시 원본 ID·SHA·시각과 승인 출처 교차검증. 없으면 `HISTORICAL_INPUT_LINEAGE_UNPROVEN`으로 종료하고 최신 값으로 채우지 않음. 정상 수집·공개는 계속. |
| 2 | D05 담당: **미래 사건만** 대상으로 선택형 callback→기존 로컬 점수 저장→`LOCAL_STORED` archive readback→7 batch 부분 계보 대조를 연결하는 최소 B 변경의 **영향과 담당**을 문서화 | 별도 승인 전에는 공유 `run-local.mjs` 변경·설치 없음. SEC/E1-R5/Breadth 증거와 공식 revision은 별도 검증 필요. |
| 3 | 승인권자·Writer 원담당: **PC 로컬 비민감 불변 사건 원장**의 필드·경로·보존 기간·파일 소유권·운영 source/설치 범위를 명시해 승인 여부 결정 | 승인된 정규 B에서만 적용. `UNCHANGED/UNPROVEN`은 안전 비증명, 정상 계산·게시 비차단. 원문·토큰·전체 원자료를 GitHub/D1에 기록 금지. |
| 4 | D05 담당: 승인된 실제 미래 사건 **1건**을 운영 PC Runtime·로컬 읽기·D1 key·공개 API/UI로 재조회한 뒤 점수별 68개로 점진 확대 | 출처와 게시까지 같은 사건으로 입증된 경우에만 해당 항목의 1년 종단 PASS 집계. 자연 장애 E2E/예약 자동 갱신은 후속 관측. |

**현재 종단 완료율: 0/68(0%→0%).** 별도 검증 지표는 D1 행↔API 사건 **1/1 PASS**, 개발 시뮬레이션 **75/75 PASS**, 공개 실제 계산 사건 **UTC 9일·KST 8일/34건**. 이 조사와 기록은 운영 기능 완료 주장이나 UI 브랜치 완료 Gate가 아니다.


## 2026-11-10 D05 이어서 작업 — 68개 재사용 가능성 조사·미래 계약 승인 분리

- 공통 [#1206](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1206) 독립 재조회: **open, 댓글 0**. #1023의 설치 미허용 요청은 재시도하지 않는다. 별도 Controller #996 C 복구의 `STATE_UNKNOWN`/원본 lease와 D05 읽기·개발은 분리하며 이 복구에 개입하지 않는다.
- 공개 [CNN 공포탐욕 실제 관측 1년 API](https://zgmini.kr/api/fear-greed/observations?period=1Y)를 연결 브라우저에서 **직접 JSON.parse PASS**: `status=READY`, `version=CNN_OBSERVED_ARCHIVE_R1`, 실제 보관 UTC 관측일 **5일**, 실제 사건 **108건**, `sampled=false`, 첫 `2026-10-30T23:59:48Z`, 마지막 `2026-11-06T23:59:54Z`. '1Y 조회 가능'을 실제 1Y 저장·공개 완료로 잘못 집계하지 않는다.
- 테마 R32의 과거 실제 가격 9개×252일=2,268 계산점·305 raw파일 SHA 및 일부 게시, 업종 R3의 11개×252일 저장가격 기반 rolling 계산은 기존 성과다. **과거 252일 각각 당시 계산/확정·선택 source SHA를 동시 보존한 원장은 아직 미입증**이므로 신규 1Y 완료 점수 0개. 기존 성공 점수/원본 파일을 삭제하거나 재계산해 덮어쓰지 않는다.
- `run-local.mjs`의 **`DRY_RUN`에서도** `writeScore` 및 `appendCompositeObservedFromCurrent`로 **PC 로컬 DB 쓰기가 발생 가능**함을 소스로 재확인. 인위적 실제 실행은 하지 않았고 독립 순수 fixture **75/75 PASS**를 재사용했다.
- 기존 D05 shadow는 SELECT 후 사후 역매칭이므로 **실제 선택 순간의 직접 증거가 아니며**, `readStoredMarketInputs` 36시간/BIS TTL·macro per-series 병합 이후 **선택 자체가 실효 사용을 보장하지 않는다**. SEC/E1-R5/Breadth도 별도 Reader다. 계약 설계에서 `SELECTED_7_BATCHES_ONLY`와 전체 PIT 계보를 분리한다.
- 새 별도 문서 [`D05_FUTURE_INPUT_LINEAGE_APPROVAL_SCOPE_R1.md`](D05_FUTURE_INPUT_LINEAGE_APPROVAL_SCOPE_R1.md)에 **미래 사건의 Reader 선택형 비민감 metadata·로컬 append-only 원장·고유 eventId/중복/부분쓰기 안전 처리·운영 승인 항목**을 명시했다. **설계안이지 적용 승인이 아니며**, 새 DB/D1 key·Writer·PC 설치·Cron/배포 변경은 0건.
- **다음 단일 결정:** 사용자/Writer 원담당이 *범위 A(선택 7배치 부분 계보)* 개발·로컬 원장 필드/보존/실제 경로·별도 정규 B 영향에 명시 승인할지 판단한다. 승인 전에는 개발 브랜치의 현행 검증 코드를 운영에 연결하지 않는다. 독립 공개 관측 축적과 다른 점수 기능은 계속한다. 범위 B(12영역 전체 실효 입력)는 별도 단계다.

**68개 1년 종단 완료율: 0/68(0%→0%)**. 신규 확인 성과: CNN 실제 관측 **5일/108건**, 승인 검토용 **미래 계보 계약 문서 1건**, 이전 D05 D1↔API 실제 사건 1/1 PASS 유지.

## 2026-11-10 D05 범위 A 개발 실행 — 선택 순간 메타데이터·불변 사건 후보

- **승인 경계:** 사용자의 후속 "계속해라"를 기존 제안의 **범위 A 전용 개발 브랜치 코드/fixture 착수 승인**으로 적용. 실제 PC Writer B 설치, 파일 기반 원장 생성·수정, 계산 실행, D1/Cloudflare 배포, 산식·TTL·데이터 계약 변경은 포함되지 않는다. 공통 Controller #996 `STATE_UNKNOWN` 복구·lease에는 개입하지 않는다.
- **Reader 선택 순간 관측:** `worker/market-input-validation.mjs`에 선택형 `onSelection`을 추가했다. observer가 없을 때 원래 `SELECT body,stored_at ... LIMIT 10`, 유효 후보 선택·반환을 변경하지 않는다. observer가 있을 때만 `batch_key`를 함께 SELECT하고 유효 행 선택 ID/시각을 반환 전에 관측한다. `worker/candidate-market-operational-store.mjs`는 기존 7개 Reader에 이를 선택적으로 전달한다. observer 실패도 정상 입력 선택을 차단하지 않는다.
- **증거와 계산 사건 연결:** 기존 비차단 `market-input-observation-shadow-r1.mjs`에서 선택 순간 원본 ID와 사후 동일 행 SHA-256/저장시각이 일치하는지 검증하여 `READER_DIRECT_ID` 또는 제한적 `POST_SELECTION_MATCH_ONLY`로 표시한다. 실제 `readInput(key)`와 다른 sourceKey로 callback한 교차 키 증거·모순·중복은 `UNPROVEN`. `composite-archive-lineage-link-r1.mjs`가 동일 `calculatedAt`, archive 저장시각, 출력 FNV 서명 및 저장 점수·`asOfDate`까지 확인한 뒤에만 **7배치 부분** 연결 후보를 제공한다.
- **쓰기 없는 원장 계약 개발:** 신규 `lib/score-history/d05-lineage-event-contract-r1.mjs`는 오직 `PREPARED_LOCAL_ONLY`의 비민감 JSONL *후보*를 만들고, 텍스트 기반 `APPEND_READY`, 동일 사건 `NOOP_SAME_EVENT`, 충돌·손상 시 `UNPROVEN`을 결정한다. 안정적 증거 digest는 `recordedAt`을 제외해 재수신해도 동일하다. **실제 append/File I/O·run-local 연결은 없음.** 공용 정규 B lease만으로 로컬 이벤트 append 경합이 방지된다고 가정하지 않는다.
- **검증:** Reader 직접 선택, 예외 비차단, 순서/원본 SQL 회귀, 7개 부분 사건, 교차 키 증거 거부, 중복·손상·충돌을 포함한 **관련 Node fixture 101/101 PASS(0 FAIL)**. 이전 shadow 기준 75/75보다 시험 범위가 확장된 것으로 **실제 Windows 운영 PASS가 아니다**. 변경은 기능 전용 브랜치에만 기록한다.
- **남은 단일 필수 개발 경계:** 기존 실제 D05 Writer의 **단일 소유자·동시 계산/배치 기록 직렬화·원자적 파일 append/부분쓰기 복구 가능성**과 승인된 로컬 경로·필드·보존기간을 확인한다. 그 증거와 별도 B 설치 범위 승인이 확보되기 전엔 파일 기록기·`run-local.mjs` 연결 및 실 PC 검증을 시작하지 않는다. 한편 정상 수집/게시·다른 기능은 이 분리 과제로 막지 않는다.

**완성률은 동일:** 실제 원자료→계산→로컬 저장→D1→API/UI로 1년 전부 검증한 항목 **0/68(0%→0%)**. 개발 fixture 통과 **101/101**, 공개 D05 D1↔API 한 사건 **1/1**, 공개 이력 UTC **9일·34건/KST 8일**, CNN 관측 **5일·108건**은 별도 사실이다.

## 2026-11-11 D05 Writer 직렬화·정규 B 범위 재판정

- **최신 공통 지침:** `zgmini-pc-control` `main` SHA `bba84e671c7caa626ebad189bcea14d1f66c5059`의 `AGENTS.md`·`GENERAL_CHAT_START.md`·`PC_AUTOMATION_STANDARD.md`를 확인. 공통 정본 5절의 이미 승인된 source 등록·A 조회·정규 B 유지보수는 재승인할 사안이 아니다. **새 D05 영속 로컬 원장 저장 효과**(필드·경로·보존·운영 owner)가 기존 업무 승인을 벗어나는 부분인지 별도 대조한다.
- **정규 Core 잠금 소스 확인:** `quota-runner.mjs` → `local-cycle.mjs`가 `local-cycle.lock`을 취득 → 같은 부모에서 `run-local.mjs --publish` 동기 실행 → 부모 종료 시 lock 정리. 해당 경로만은 직렬화된다. `run-local.mjs`에 자체 lock은 없고 `--publish` 없는 직접 실행도 DB에 저장할 수 있다. SQLite WAL/`BEGIN IMMEDIATE`는 새 JSONL의 중복·부분쓰기 보호 계약을 대체하지 않는다.
- **계산 연결의 현재 한계:** 기존 `run-local.mjs::calculateMarket(root,core,now)`는 개발용 선택형 `onInputEvidence`를 전달하지 않는다. `writeScore` 이후 `appendCompositeObservedFromCurrent`가 `LOCAL_STORED`로 확인한 계산 사건이 후보이며 `UNCHANGED/UNKNOWN`에는 원장 생성 없음. 저장 후보 판정 순수 함수 `d05-lineage-event-contract-r1.mjs`만 존재하고 실제 파일 I/O는 없다.
- **운영 근거 미확정:** 실 PC Task의 실제 Action/소스 `HEAD`·`config.source`·데이터 경로 및 직접 실행 호출자는 소스만으로 확정 불가. [공통 #1206](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1206) open/댓글 0, #1023의 설치 불허 A는 재요청하지 않음. #996 C `STATE_UNKNOWN`/원본 lease는 다른 담당 관리하므로 관여하지 않음. 공유 Core source 설치 자원이 실제 겹칠 때만 공용 단일 적용 담당과 직렬화.
- **소스 통합 주의:** GitHub 조사 당시 원격 기능 브랜치 `e05f6458043a0dc823ea0ad53cf061f7c2fa99dc`는 `main`보다 **41 ahead / 8 behind**. 기능 HEAD를 운영 source로 간주하거나 승인 없이 rebase/merge/Writer 파일 덮어쓰지 않는다.

**다음 필수 행동 1건:** 이미 지원되는 승인 A·등록 원본 증거에서 D05 실제 `run-local` 진입 wrapper/Task·sourceRoot/HEAD/config.source·Writer 소유/lock 범위를 정확히 확인한다. 없는 계약을 임의 shell로 우회하지 않고, 확인된 실행 경로만 대상으로 *공유 기록의 단일 소유·원자적 저장/부분쓰기 복원·필드/경로/보존 효과*를 확정한 최소 manifest와 관련 fixture를 준비한다. 정규 B 자체를 새 기능명만으로 재승인 요구하지 않되, 신규 저장 효과와 기존 공개/운영 승인 범위의 차이는 확인한다. 실제 PC·SQLite·JSONL·D1·UI 쓰기 **0건**.

**종단 진행률 0/68(0%→0%)**. 독립 코드 회귀 **101/101 PASS**와 위 소스 읽기 판단은 운영 원자료→계산→저장→공개 1년 PASS에 합산하지 않는다.

## 2026-11-11 D05 기존 A급 PC 증거 재사용 — Core 실제 진입 경계

- **반복 A 대신 원본 결과 재조회:** `core-runtime-source-readonly`는 공통 설치 허용목록의 A급이지만 기존 [#1196](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1196) `run-42721800118-1-seat-6`은 `STATE_UNKNOWN / CORE_NO_ACTIVE_TASK_ENGINE`, `runtimeSourceVerified=false`였다. `LAST PASS=ALLOWLISTED_WORKER_STARTED`, `FIRST FAIL=ALLOWLISTED_OPERATION`, `operationalWrites=0`. 이 조회는 **동작 중인 Core Task Engine 프로세스가 관측되어야** Runtime source를 입증한다. 해당 시각에 프로세스가 없었다는 사실을 예약 실패나 Core 고장으로 해석하거나 동일 A를 무조건 반복하지 않는다. 더 최근 [#1227](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1227)은 조회 시 댓글/결과 0건이므로 성공으로 집계하지 않는다.
- **실제 등록 Task Action은 개발 소스의 정상 경로와 다름:** 승인 A급 [#1188](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1188)·[#1197](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1197)의 `pc-source-preflight`는 `PASS / PC_SOURCE_READONLY_DIAGNOSIS`, `coreTaskAction.commandFile=wscript.exe`, `scriptFiles=[run-original-then-archive.vbs]`를 확인했다. `archive-sidecar-r7` 및 과거 cutover launcher 11개는 정적 추적됐으나 **`STATIC_LAUNCHER_TRACE_ONLY`**, `sourceResolved=false`, `sourceHead=null`, `runtimeSourceVerified=false`다. `quota-runner.mjs → local-cycle.mjs → run-local.mjs`의 기존 소스상 lock 흐름은 현재 Task Action의 최종 실행 연결 증명이 아니므로, D05 신규 JSONL 기록을 그 lock만 믿고 설치해서는 안 된다.
- **source SHA는 증거 종류와 시각을 분리:** #1188(2026-11-09 23:25Z)의 승인 config·고정 checkout·Writer checkpoint `48d3478030590ca63aaab2435e88c896608c70d3` 일치는 **당시 고정 checkout**의 증거다. #1197(23:37Z)의 `configApprovedSha`/고정 checkout `de81749f83c086f5cb0cad7ed1d5cc958de19280`와 `lastWriterEvidence.sourceHead=48d34780…` 차이는 서로 다른 시점의 보존 checkpoint를 비교한 결과다. 이를 즉시 오류·미승인 drift·실제 Core Runtime SHA로 단정하지 않는다. `sourceRoot`와 Runtime 실행 SHA는 여전히 미확정이다.
- **관련 범위 결정:** 기존 [#882](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/882) preimage·[#1128](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1128) Core 상태 PASS도 재사용한다. D05 선택 7배치의 실제 Reader 사용과 독립 SEC/E1-R5·Breadth 입력, 로컬 JSONL 저장 계약이 입증되기 전에는 계산 실효 계보 `UNPROVEN`, 68개 1년 전 구간 `0/68` 유지. 과거 [#1023](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1023)의 `OPERATION_NOT_ALLOWED`를 다른 미승인 operation으로 우회하지 않는다.
- **다음 단일 기능 행동:** Writer 원담당과 공유하는 기존 launcher/Task·checkpoint 원본의 **동일 시점** 결합 증거가 나오면 정확한 실제 Core owner/경로를 특정한다. 그때까지는 실제 PC에 신규 파일·lock·원장/Writer 수정 없이, 새 로컬 metadata 효과의 필드·실제 경로·보존 기간·동시 실행 진입점과 승인 범위의 차이만 제한적으로 확정한다. 등록 A의 소스 관찰은 정상 운영 프로세스가 실제 동작한 증거가 확보된 경우에만 중복 없이 재검토한다. #996 C 복구와 공유 쓰기는 다른 담당 소유를 유지한다.

**이번 실운영 종단 진척: 0/68(0%→0%).** 재사용한 A급 PASS 2건(#1188·#1197), A급 상태 미확정 1건(#1196)과 응답 대기 1건(#1227)은 개발·운영 성과로 섞지 않는다. PC/원본 DB/D1/Controller/배포 쓰기 0건.

## 2026-11-11 D05 미래 입력 사건 시간 인과 검증 보완

- **비운영 순수 계약의 실제 결함:** 기존 `buildD05LineageEvent`는 계산 `calculatedAt`보다 **나중에 저장된 7개 Reader 입력**과 계산보다 **먼저 기록된 `recordedAt`**도 `PREPARED_LOCAL_ONLY`로 수용할 수 있었다. 실제 계산 당시 존재하지 않았던 배치를 입력 증거로 인정할 위험이므로, 승인 산식·기존 Reader·DB를 변경하지 않고 별도 계약의 시간 순서만 수정했다.
- **최소 수정:** `sources[].storedAt <= archiveStoredAt(=calculatedAt)`와 `recordedAt >= calculatedAt`을 검증한다. 위반 시 각각 `UNPROVEN / SELECTED_INPUT_AFTER_CALCULATION`, `UNPROVEN / RECORD_TIME_BEFORE_CALCULATION`로 닫는다. 정확히 같은 시각은 유효하다. 이전 7개 부분 증거 `effectiveUseVerified=false`·`completeD05InputLineage=false` 및 `PREPARED_LOCAL_ONLY` 비운영 상태를 유지한다.
- **검증:** 미래 입력 1ms·역전 기록 1ms·동일 시각 경계값 2개 회귀 추가. Reader 직접 선택·시장 계산 callback·사후 SHA 대조·archive link·JSONL 충돌/중복/손상 등 관련 **63/63 Node fixture PASS(0 FAIL)**. 실제 원장 파일 append·PC B 설치·Writer/SQLite/D1/Cloudflare 쓰기 **0건**. 코어 기존 런처는 #1197의 static source trace만 있으며 Runtime SHA 확정 이전에 기록기를 연결하지 않는다.
- **다음 필수 행동:** Writer 원담당이 실제 Task 엔진 동작 시 확보한 고유 실행 SHA·원본 런처와 동일 사건 로컬 checkpoint의 결합 증거를 재사용한다. 그 후 신규 JSONL 저장 효과의 경로·보존·소유권·실제 공용 lock/원자적 append 범위를 기존 승인 계약과 대조하고, 승인된 정규 B manifest에 최소 변경을 한정한다. #996 C 복구와 과거 계보 소급 생성은 하지 않는다.

**68개 1년 실제 종단 검증: 0/68 (0%→0%).** 이 시간 인과 결함 수정은 개발 계약의 안전성 개선이지 운영 계산·저장·게시 완료가 아니다.

## 2026-11-11 D05 공개 사건 35건 재조회·현행 main R10 보호와 B 최소 변경 경계

- **공개 실제값 재조회:** `GET https://zgmini.kr/api/market-score/observations?period=1Y`를 읽기 전용 브라우저에서 JSON.parse하여 `status=READY`, `version=COMPOSITE_CALCULATED_SCORES_R1`, `sampled=false`, `availableDays=9`, `totalObservedPoints=35` 및 실제 `points.length=35`를 확인했다. 기존 34건에서 **실제 사건 1건 증가**. 첫 사건은 `2026-10-31T10:45:07.750Z`/`46.88569913684497`, 마지막은 `2026-11-10T14:05:08.203Z`/`47.97627971230363`/`asOfDate=2026-11-10`이다. UTC 계산 날짜 **9일**, KST 계산 날짜 **8일**이며, 1년 전 기간 충족이나 68개 항목 전체 검증을 의미하지 않는다.
- **실제 Writer 소스 비호환 확인:** 검토 기준 `zgmini main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`, D05 전용 기능 브랜치 `420a4ccbebc0a7b2fd59792b534809d2d356554a`. `scripts/pc-writer/run-local.mjs`는 양쪽 blob이 다르다. 현재 **main**의 Asset R10 `--run-r10-release`, receipt `status/gate`, projection 결과 재조회 및 `assetBubble` 기존 결과 보호를 기능 브랜치의 오래된 전체 파일로 덮으면 회귀한다. **운영 B manifest는 최신 main을 기준으로 D05 콜백·계보 저장 연결의 최소 hunk만 선별 이식**하고 이 R10 보호를 회귀 검사로 보존해야 한다. 무단 main 병합/rebase/운영 덮어쓰기 없음.
- **최소 영향 파일:** `run-local.mjs`, `market.mjs`, `candidate-market-operational-store.mjs`, `market-input-validation.mjs` 호출·선택 관측과 필요한 D05 순수 계보 유틸 및 *별도 승인 후* JSONL 저장 어댑터만 검토한다. 기존 `local-cycle.mjs`는 비교 시 변경 필요 없음. 실제 Core Task Action이 `wscript.exe → run-original-then-archive.vbs`인 정적 사실은 유지되나 마지막 실행 경로·Runtime SHA·공유 lock 통과는 아직 미확정이므로 `local-cycle.lock`만으로 JSONL 동시쓰기를 보증하지 않는다.
- **PC 증거/승인 경계:** 기존 [#1227](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1227)·[#1219](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1219)·[#1217](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1217)·[#1213](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1213) 재조회 시 새 실행 결과/댓글 0; [#1206](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1206) 회신도 0. 중복 A 요청 또는 거부된 #1023 우회는 하지 않는다. 기존 일반 B 유지보수 승인과 별개로 **신규 비민감 JSONL 영속 파일의 실제 위치·필드·보존·쓰기 소유자**는 범위 결정 전이며 PC 연결/설치 승인으로 추정하지 않는다. #996 C급 복구와 원본 lease는 다른 총괄 담당 소유를 유지한다.
- **개발 전용 실제 작업 완료:** `d05-lineage-event-append-r1.mjs`에 **호출자 지정 절대 JSONL 경로 + 외부 Writer 독점 lease 확인 + `.lock` 협조 잠금 + 기존 원장 무결성 검증 + append/fsync + 같은 inode 재조회**를 갖춘 별도 파일 어댑터를 추가했다. 중복 동일 사건은 `NOOP_SAME_EVENT`, 충돌·손상·부분 행·남은 lock·lease 소실은 `UNPROVEN`으로 안전 거부한다. 고정 PC 경로, 자동 stale-lock 제거, 자동 재시도 및 Writer 호출 연결은 없다. 협조하지 않는 외부 writer까지 단독으로 배제하지 못하므로 운영 lock 전수 증거가 여전히 필요하다. 신규 격리 fixture 8건을 포함한 해당 계약·시장 입력·archive 회귀 **52/52 PASS(0 FAIL)**. 테스트 파일은 scratch 임시 폴더에만 생성·정리했다.
- **다음 실제 기능 단계:** 새 어댑터를 운영에 호출하지 않은 채, 본선용 변경은 최신 main의 R10 보호를 보존하는 최소 diff/manifest로 준비한다. 실제 Task/Writer owner·locking 및 신규 영속 효과 승인 후에만 정규 B 적용, 동일 계산 사건의 로컬 저장→계보 재조회→D1→공개 API/UI 검증을 수행한다. 정상 D05 수집·다른 콘텐츠 작업은 공통 #996과 별개로 진행 가능하다.

**1년 원자료→계산→저장→공개까지 완성한 점수: 0/68(0%→0%).** 관측 사건은 **34→35건**, 공개 계산 관측일은 UTC **9일**·KST **8일**이며, 개발 source 검증과 운영 게시 성과를 서로 혼동하지 않는다. 이 범위 조사에서 PC/DB/D1/Cloudflare 운영 쓰기 **0건**.

## 2026-11-11 D05 JSONL 독립 검토 후 안전 보완·현행 Writer 최소 이식 위치

- **발견 결함 2건 수정:** 개발용 JSONL adapter가 기존 파일의 64MiB 상한만 검사하면 신규 행 append 직후 크기 초과를 성공 처리하고 다음 사건에서 영구 거부할 수 있었다. 기록 직전 `기존 바이트+신규 라인 바이트 <= 64MiB`를 검증하며 초과는 `UNPROVEN / LINEAGE_LEDGER_CAPACITY_EXCEEDED`로 반환하도록 수정했다. 또한 Windows의 64비트 파일 ID를 Number로 비교하면 정밀도 손실 가능성이 있어 기존 ledger·readback·lock `stat/lstat({bigint:true})`로 일치 판정을 통일했다.
- **관련 회귀:** 기존 계약·Reader shadow·archive linker·신규 adapter의 파일·동시성 fixture **53/53 PASS(0 FAIL)**. 신규 용량 경계 검사 1건 추가. Linux 격리 실행만 확인했으며 실제 Windows `O_NOFOLLOW` 지원/실행 lock·NTFS 동작·PC 설치는 아직 미검증. 비협조 Writer와 crash stale lock은 자동 수정하거나 강제 회수하지 않는다.
- **최신 main 병합 경계 재확인:** 실제 main `643b7c7c4372ffad552443fc312c6cb1b944e2fc`의 `run-local.mjs` Asset R10 `--run-r10-release`/receipt gate/결과 재조회 및 `assetBubble` 전용 기존 결과 보호를 반드시 보존. D05 증거 수집에는 `calculateMarket(root,core,now,{onInputEvidence})`의 callback이 필요하며 `body`가 `attemptOutput` 내부 지역변수라 별도 성공 변수로 보존해야 한다. 로컬 `writeScore` 및 아카이브 `LOCAL_STORED` 성공 뒤에만 `linkMarketInputEvidenceToStoredArchive`를 호출해 `buildD05LineageEvent` 후보를 생성하는 최소 hunk가 적절하다. `UNCHANGED`, 실패 또는 원본 SHA/독점 lease 미확정 시 JSONL 쓰기 금지. 민감 batch metadata는 공개 report/D1에 넣지 않음. 이 연결은 **계획만 검증했으며 `run-local` 실제 변경·연결은 하지 않았다.**
- **다음 필수 실행:** Writer 원담당의 동일 시점 Core Action/Runtime source·단일 owner/lease 및 비민감 JSONL 실제 경로·보존·쓰기 효과 승인 범위를 확정한 뒤 최신 main 기반 최소 B manifest·R10 회귀 테스트를 준비한다. 승인이 없으면 D05 개발 단위 fixture·공개 관측 추적은 유지하지만 PC에 새 영속 기록기를 설치하거나 기존 소스를 통째로 교체하지 않는다. #996 C급 상태 복구는 별도 담당 소유다.

**진행률: 실운영 1Y 68개 종단 0/68(0%→0%), 개발 격리 검증 53/53 PASS.** PC·SQLite·D1·Cloudflare 쓰기 0건.

## 2026-11-11 D05 최신 main R10 보호 이식·저장 사건 준비 함수 개발

- **운영 소스 적용 아닌 개발 브랜치 호환 보완:** 기능 브랜치의 `scripts/pc-writer/run-local.mjs`에서 최신 `zgmini main=643b7c7c4372ffad552443fc312c6cb1b944e2fc` R10의 두 보호 hunk만 이식했다. `build-asset-r10-release.mjs --run-r10-release`의 마지막 JSON receipt `LOCAL_RELEASE_READY/PASS`, 로컬 `readAssetR10Projection(base).status==='READY'` 대조 후에만 계산 성공 처리하며 이전 결과 보존 분기는 `assetBubble`에 한정한다. 수정 뒤 **`run-local.mjs` 전체 26,919문자 소스가 해당 main 파일과 완전히 일치**함을 원격 파일 원문/로컬 source 비교로 검증했다. `run-local.mjs`는 실제 PC에 설치하지 않았고 운영 소스·산식·D1/배포에는 적용하지 않았다. 기능 브랜치는 여전히 다른 main 변경과 전체 병합된 상태가 아니므로 이 파일의 동일성을 B 설치 승인이나 최신 main 전체 호환 증거로 확대하지 않는다.
- **순수 준비 함수 별도 개발:** 신규 `lib/score-history/d05-lineage-after-archive-r1.mjs`는 동일 사건의 계산시각/점수·7개 선택 입력·로컬 archive 저장/재조회가 전부 확인된 후에만 `buildD05LineageEvent`의 `PREPARED_LOCAL_ONLY` 후보를 돌려준다. `UNCHANGED`·저장 실패·입력 불일치·archive timestamp 불일치·source SHA 미확정·역전 recordedAt은 `UNPROVEN`으로 반환. `run-local.mjs`의 계산·쓰기 경로에 호출 연결하지 않았고 신규 JSONL 실제 append·공개 report/D1 추가 **0건**.
- **단위 시뮬레이션:** 신규 `tests/d05-lineage-after-archive-r1.test.mjs` 4건으로 정상 후보·변경 없음·손상 계보·부적합 source SHA/시간을 검증했다. Asset R10·입력 callback·archive linker·JSONL 격리 fixture 통합 실행 **83/83 PASS(0 FAIL)**, Writer source `node --check` PASS. 테스트의 모의 DB 및 Linux 임시 JSONL은 실제 Windows 운영·R10 실실행·장기 1년 저장의 증거가 아니다. `run-local.mjs`는 DRY_RUN도 SQLite에 쓰기 때문에 직접 실행 금지 유지.
- **남은 단일 필수 행동:** 실제 Writer Task→원본 launcher→lock/lease 경로의 **동일 사건 Runtime 증거**와 신규 JSONL 영속 경로·필드·보존·단일 쓰기 소유자의 승인 범위가 확정되면, **최신 main 기반 최소 B manifest**에 계산 callback→기존 점수 저장→archive `LOCAL_STORED`→비공개 후보→독점 Writer 기록기 순으로 연결한다. R10 보호를 계속 보존하고 `UNCHANGED`·실패·불명확한 원본 SHA는 기록하지 않으며, 공개 API/UI에서 1년 전체 68개를 개별 입증한다. #996 C 복구는 별도 담당 소유로 유지한다.

**실제 1년 종단 완료 0/68(0%→0%), 개발 회귀 83/83 PASS.** PC·운영 DB/D1·Cloudflare 쓰기 0건.

## 2026-11-11 D05 실제 PC 근거 재조회·10파일 잠정 overlay 범위 확정

- 제어 정본 `main=bba84e671c7caa626ebad189bcea14d1f66c5059` 유지. #1188/#1197는 Task `wscript.exe → run-original-then-archive.vbs`의 정적 추적 PASS일 뿐 Node Runtime source SHA·Writer 전체 lock 경로는 **미증명**. #1196 `CORE_NO_ACTIVE_TASK_ENGINE`은 관측 순간 무프로세스 상태이고 Core 실패 확정이 아니다. #1213/#1217/#1219/#1227 및 과거 #1206 모두 조회 시 새 결과 회신 0건. 중복 A나 #1023의 미허용 조회를 재요청하지 않았다.
- 최신 `zgmini main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`와 기능 브랜치 `43bdd4b367542d73129d70e4026e4ba9a1c239e4`를 기능 관련 11개 파일로 직접 비교: `run-local.mjs` **동일 1개**, Reader/Market **수정 3개**, 입력 계보 lib **신규 7개**. 이는 설치용으로 승인된 10파일 overlay가 아니다. 실제 Writer hook을 연결하면 최소 파일이 달라지며, Runtime before SHA·정규 B manifest·보존/백업은 별도 증거가 필요하다.
- [미래 계보 승인 범위 문서](D05_FUTURE_INPUT_LINEAGE_APPROVAL_SCOPE_R1.md)의 과거 '파일 어댑터 구현 금지' 문구를 **개발용 독립 fixture 완료/운영 연결 미승인**으로 정합화했다. 현재 필요한 사용자 결정은 **미래 7배치 부분 계보의 PC 로컬 비민감 JSONL 영속 기록 효과**, 그 경로·보존기간·단일 소유권에 한정한다. 기존 정규 B 유지보수 승인 자체를 재요청하지 않는다. 승인 전엔 개발과 공개 자료 읽기만 계속한다.

**실제 D05 1년 종단 완료율 0/68(0%→0%).** 신규 운영 효과·PC 설치·D1/Cloudflare 쓰기 0건. 다음 필수 행동은 위 신규 영속 저장 범위 결정 후 실제 Writer source/lease와 승인 manifest를 정확히 결합하는 것이다.

## 2026-11-11 68개 목표 재정렬 — 섹터 R3 날짜별 원장 실증을 다음 실행으로

- **분모는 서로 다른 점수 68개:** 대시보드 D01~D27 **27개**, 업종 S01~S11 **11개**, 테마 T01~T30 **30개**. 공개 `CM-R1` observations의 35건은 **종합점수 한 종류의 계산 사건**이며 35/68개를 완료했다는 뜻이 아니다. 대시보드 D09 신용위험의 51개 점은 `lookAheadSafe=false`인 현행 입력 재구성 추세이고, 테마 T02 공개는 `UNAVAILABLE`이다. **각 점수의 1년 전 구간을 당시 저장한 실제 입력·계산·게시로 입증한 항목은 0/68**이다.
- **공개 R3 실제 관측:** 읽기 전용 브라우저 `GET https://zgmini.kr/api/sector-fear-greed` → `SECTOR-FEAR-GREED-R3-PUBLIC-V1`, `READY`, `observationDate=2026-11-09`, `updatedAt=2026-11-10T00:20:19.790Z`, 11개 업종과 252거래일 `history`. 이 252점은 재계산된 rolling series로서, 각 날짜에 실제 확정·저장했던 252개 PIT 스냅샷이 아니다.
- **기존 영속 경로 존재:** `scripts/pc-writer/local-cycle.mjs` Core가 기존 `sector-fear-greed-r3-local-cycle.mjs --write-local`을 실행한다. `worker/public-feed-store.mjs`의 `writeOutput`은 `public_feed_snapshots_v1`의 `kind='output'`, `feed_key='sector-fear-greed-r3'`에 **실행 UTC 날짜 `YYYY-MM-DD` 키와 `current` 키**를 함께 저장하도록 설계돼 있다. 반면 `scripts/pc-writer/run-local.mjs` 309~345행의 D1 일반 feed 게시와 `worker/sector-fear-greed-r3-public.mjs`는 **`current`만** 사용한다. 따라서 날짜 키가 실PC에 실제 몇 건 남았는지와 각 시점의 원본 입력·수정 계보는 아직 확인되지 않았다. 저장 코드만으로 PC 원장 누적 성공을 가정하지 않는다.
- **다음 필수 실행 하나(기능 담당):** 운영에 이미 승인·설치된 **정확한 A급 읽기 수단**이 있다면 PC Core SQLite `public_feed_snapshots_v1`의 `kind='output' AND feed_key='sector-fear-greed-r3' AND snapshot_key='YYYY-MM-DD'` 실존 날짜 키의 **개수/최초·최종 날짜/`stored_at`/본문 해시**와 같은 시점 로컬 입력 원본 SHA·수집시각을 비민감 요약으로 회수한다. **해당 원장의 마지막 날짜 점수·관측일을 D1 `current`와 공개 API의 11개 업종 값에 대조**한다. 본문·원자료 전체/키는 Issue에 올리지 않는다. `snapshot_key`는 실행 UTC 날짜이므로 `body.observationDate`와 같은 날이라고 추정하지 않고 양쪽을 각각 표시한다.
- **기존 A 기능 확인 결과:** 2026-11-11 제어 저장소 `main=bba84e671c7caa626ebad189bcea14d1f66c5059`의 `config/operations.json`에는 `core-runtime-source-readonly`, `fear-greed-archive-status`, `writer-publication-evidence-readonly` 등 고정 A는 있지만 **업종 R3 날짜별 Core SQLite 원장을 직접 조회하는 승인·설치된 A operation은 확인되지 않는다**. 기존 ER1 전용 공개 원장 조회를 임의 섹터 SQL로 확장하거나 과거 거부 #1023을 우회하지 않는다. 기존 operation이 정확히 이 데이터를 반환하는지 확정되지 않으면 **`SECTOR_R3_DATE_LEDGER_ACCESS_GAP`**으로 S01의 그 검증만 보류하고, 공통 도구 원담당에게 범위 한정 읽기 계약 지원을 인계한다. 공개 R3와 독립 점수 업무는 계속한다.
- **읽기 전용 주의:** `sector-fear-greed-r3-local-cycle.mjs`의 `CHECK_ONLY` 경로도 계산 중간 JSON 파일을 쓸 수 있으므로 진단 용도로 실행하지 않는다. 최초 실제 날짜별 입력-점수 사건을 증명한 뒤에만 기존 날짜 행의 D1 게시·readback/API/UI 계약에 필요한 최소 변경을 기존 승인 범위와 대조한다. 아직 날짜별 D1 게시, 68개 일괄 배포, 새 예약·DB·산식 변경을 수행하지 않는다. 미래 7배치 JSONL 계보는 **D05 부분 증거를 위한 별도 개발**이지 68개 전체의 공통 선행 조건이 아니다.
- **기존 독립 개발 증거:** 미래 7배치 로컬 저장 후보와 append를 합친 순수 `recordD05LineageFromStoredArchive` 모듈을 모의 DB·임시 경로로 추가하고, `LOCAL_STORED` 단회 저장/동일 사건 NOOP·UNCHANGED 무쓰기·source SHA/Writer lease 거부·다른 digest 충돌 보존 **신규 4/4 PASS**, 관련 계보·Asset R10 게이트 집중 회귀 **76/76 PASS** 확인. 실제 Core `run-local.mjs` 연결·PC JSONL 생성·운영 설치는 하지 않았다. 범위 A의 유지보수 검증은 68개 실운영 진행률에 가산하지 않는다.

**1년 진짜 종단 완료율: 0/68 → 0/68(0%).** 이번 단계는 공개 업종 11개×252점 존재와 기존 날짜별 로컬 저장 설계까지 **확인**, 각 날짜의 실제 PC 원장·입력 SHA 및 해당 날짜 D1 게시까지는 **미확인**이다. 다음 실행 담당은 S01/R3 원담당과 기존 A operation 지원 담당이며, 원본 조회가 가능해졌을 때 **실제 날짜 키 1건의 PC→D1→API 일치**부터 확인한다.

- **공통 지원 인계 등록:** [제어 저장소 Issue #1228](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1228)에 S01~S11 날짜별 원장 **고정·비민감 A 읽기 계약의 기존 지원 여부 및 최소 지원 요청**을 등록했다. `pc-job` 라벨·직접 실행 요청·운영 효과는 없으며, 이 Issue 자체가 다른 일반챗으로 자동 전달되거나 실제 PC 검증을 수행한 결과는 아니다. S01 실증만 지원 확인 대기, 타 기능 독립 작업은 계속한다.

## 2026-11-11 S01 날짜별 동일 사건 검증기 준비 — A 결과 대기 중 독립 개발

- **기존 A 재사용 범위 직접 대조:** 제어 저장소의 `controller/fear-greed-archive-readonly.mjs`는 `fear-greed`·`fear-greed-observed`·`fear-greed-verified-checks`와 종합점수 `composite-observed`만 고정 조회한다. `writer-publication-evidence-readonly.mjs`는 ER1 캘린더 `current`만, `source-inventory-runtime-readonly.mjs`는 공개 feed의 `current` 종류 **개수만** 조회한다. 업종 R3 날짜별 로컬 행 조회는 세 기능의 설치된 허용 범위 밖이며 [#1228](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1228) 응답 0건을 확인했다. 다른 operation에 임의 SQL을 넣는 우회는 금지한다.
- **기존 공개 계약에서 중요한 차이:** 업종 `sector-fear-greed-r3-local-cycle.mjs`는 관측일이 이전 `current`와 같으면 `UNCHANGED`로 저장하지 않고, 다를 때만 `writeOutput` 날짜형 `snapshot_key`를 기록한다. 따라서 `YYYY-MM-DD` 키는 **해당 점수를 PC에 저장한 UTC 날짜**이고 `body.observationDate`는 **미국 시장의 실제 관측일**이다. `worker/sector-fear-greed-r3-public.mjs`는 다른 잠정 feed가 유효하면 응답 `phase=PROVISIONAL`에서 최신 11개 score와 history 마지막 점을 바꾸므로 잠정 응답을 기존 확정 스냅샷과 동일 사건으로 비교하면 안 된다.
- **새 비운영 순수 검증기:** `lib/score-history/sector-r3-dated-readback-r1.mjs`에 `sectorR3DisplayDigest`(public derived 11개 score·관측일·방법론·source 버전의 안정적 SHA256)와 `compareSectorR3DatedReadbacks`를 추가했다. 향후 승인된 A 요약 `PC 날짜 행` ↔ 승인된 `D1 current` 요약의 **본문 SHA256/저장 시각/관측일** ↔ 공개 API 확정 관측 11개 **점수 digest**를 엄격히 대조한다. 잘못된 UTC 키/미래 관측/손상 해시/점수 불일치/잠정 상태는 `UNPROVEN`으로 닫는다. 성공 상태도 **`SAME_EVENT_DISPLAY_READBACK_PASS`, `oneYearPitVerified=false`**로 제한해 1개 사건이 1년 증거로 둔갑하지 않도록 했다.
- **격리 검증:** 신규 fixture 5/5 PASS, D05 입력·archive·어댑터·R10 release 집중 회귀를 합쳐 **81/81 PASS**, 실제 운영 PC·SQLite·D1/API 쓰기 0건. 이 검증기는 실제 저장 데이터 조회기가 아니고, 새 A 등록·Writer 설치·D1 날짜별 게시를 실행하거나 승인하지 않는다.

**실제 68개 1년 종단 진행률 0/68(0%→0%).** 다음 필수 행동은 #1228에 대한 기존 A 범위 판정 또는 지원된 고정 읽기 계약의 첫 유효 PC 결과를 회수하는 것이다. 그 결과 날짜별 원장과 같은 시각의 D1·확정 API를 이 검증기에 넣어 **단일 실제 사건을 우선 입증**하며, 1년 252회 PIT 원장/입력 미확보 부분은 별도로 유지한다. 무관한 대시보드·테마 작업은 계속한다.

## 2026-11-11 독립 이력 경로 재점검 — D1 날짜 행과 테마 실행 증거

- **실제 공개 계산 이력 전진:** `GET https://zgmini.kr/api/market-score/observations?period=1Y`에서 `READY`, `COMPOSITE_CALCULATED_SCORES_R1`, UTC **9일·36건**을 직접 확인. 최근 실제 사건은 `2026-11-10T17:37:34.025Z`, `asOfDate=2026-11-10`, `score=47.97904040009388`. 이전 35건에서 1건 추가됐지만 이는 종합 점수 계산 사건이지 68개 점수 전체의 PIT 증거가 아니다.
- **업종:** 고정 A 지원 요청 [#1228](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1228)은 open·회신 0. PC 날짜별 원본/입력 SHA를 임의 SQL·CMD나 다른 operation으로 우회 조회하지 않는다.
- **독립 대시보드 기회:** `worker/market-operational-store.mjs::writeScore`와 `scripts/pc-writer/publish.mjs::marketPlan`은 `market_public_snapshots_v1`의 `YYYY-MM-DD` 날짜 행과 `current`에 **12개 도메인/종합점수** 본문을 저장·게시하도록 구현돼 있다. 같은 날짜 재계산은 `ON CONFLICT DO UPDATE`로 덮어쓰므로 **불변 PIT 원장 아님**. 공개 `1Y` API는 종합점수만 반환한다. 기존 D1 Studio `zgmini-core-r42` 행 탐색으로 `2026-11-10` 날짜 행의 `body`/`stored_at`을 조회해 동일 시점의 `current`와 대조하는 것이 후속 실제 읽기 작업이다. 공개 `/api/market-score`는 V11/V9 breadth overlay가 가능하므로 raw 12개 도메인과 무조건 1:1 동일값이라고 주장하지 않고 해당 version을 분리한다. 이번 브라우저에서는 Cloudflare 로그인 필요로 **실제 D1 날짜 행 신규 검증 0건**.
- **테마:** 현재 `config/theme-data-registry.json` 명시 등록은 10개이며 T01~T30의 전체 ID·원천·게시 경로 매핑은 아직 증명되지 않았다. 기존 승인된 `theme-l7-runtime-readonly` 결과 `results/42597414102-1-seat-3.json`에는 R181 `STOP`, R179 `PUBLIC_API_ROLLING_MISMATCH`, R183 `PUBLISHER_CHILD_FAILED_REVIEW`가 보존돼 있다. 지난 실패가 현재도 지속된다고 단정하지 않으며 테마 원담당이 FIRST FAIL을 조사한다. Rolling 252점은 당시 확정된 252회 게시 증거가 아니다.
- **다음 필수 실제 행동:** 인증된 기존 D1 Studio에서 `2026-11-10` 날짜 1행 `body`·`stored_at` 읽기 → 같은 시점의 `current` 및 공개 API의 비교 가능한 필드만 대조한다(읽기 전용, SQL/쓰기 없이). 브라우저 인증 제한이면 이 D1 조회만 `D1_STUDIO_AUTH_REQUIRED`로 분리하고 업종 #1228/테마 원담당 작업을 계속한다. 원입력 SHA/revision 및 1년 당시 확정 기록은 여전히 별도 미증명이다.

**전체 1년 실제 종단 완료 0/68(0%→0%).** 신규 공개 계산 1건 관측과 기존 저장 경로 확인 외 PC·Writer·D1·Cloudflare 운영 쓰기·신규 예약/배포 0건.

## 2026-11-11 D05 날짜별 D1 본문 대조기 — 운영 읽기 전용 준비

- `lib/score-history/market-dated-d1-readback-r1.mjs`는 나중에 정상 접근 가능한 기존 D1 Studio가 **이미 반환한** 날짜 행·`current` 행·공개 `GET /api/market-score` 본문을 입력으로만 받는다. D1·PC·API를 자체 호출/쓰기하지 않는다. 날짜키는 UTC `stored_at`에서 도출하며 `body.asOfDate`와 혼동하지 않고, 같은 시각이라도 날짜 행/현재 본문이 다르면 거부한다.
- D1 12개 영역 및 종합점수와 공개 API를 비교하되, 현재 공개 `app/api/market-score/route.ts`에서 V11/V9 수급·폭 **단일 영역만 overlay**할 수 있음을 구분한다. 12개 일치면 `D1_DATE_CURRENT_PUBLIC_MATCH`; 승인된 V11/V9 수급·폭만 다르면 `D1_DATE_CURRENT_11_DOMAINS_MATCH` 및 `sameEventDisplayVerified=false`; 그 외 점수·영역·시각 차이는 `UNPROVEN`으로 안전 거부한다. 어느 경로도 `oneYearPitVerified=true`를 만들지 않는다.
- 순수 fixture 5건과 관련 D05·업종·Asset R10 회귀 총 **111/111 PASS**, 실제 D1 날짜 행 입력·운영 연결·원본 SHA 대조·배포 **0건**. 실제 D1 Studio Cloudflare Google 로그인에서 `Unable to sign in`을 반환했으므로 로그인 방식을 무한 재시도하지 않고 `D1_STUDIO_AUTH_REQUIRED`로 별도 둔다.

**1년 원천→PC→계산→D1→API/UI 종단 0/68(0%→0%).** 다음 필수 일은 기존 계정의 승인된 D1 행 조회 가능시 `2026-11-10` 날짜 행 1개와 같은 사건의 `current`를 읽고 위 검증기를 **실제 값으로** 실행하는 것이다. #1228 업종 PC 날짜 행 접근 문제와 테마 원담당 작업은 독립적으로 유지한다.

## 2026-11-11 68개 분모 정밀 대조 — 화면 항목과 실제 점수 계약 분리

**기존 `27+11+30=68`은 UI/기능 기획 항목 수이며 모두 동일한 형식의 PIT 점수 68개로 실증됐다는 뜻이 아니다.** 사용자의 목표 숫자를 임의로 변경하지 않고 미확정 영역을 보존한다.

- **대시보드 27 = 점수형 카드 25 + 비율형 등락 패널 2:** `app/dashboard-ui.tsx`에 경제 도메인 **12**(`inflation,employment,rates,credit,growth,consumption,earnings,liquidity,fundFlows,breadth,dollarFx,commodities`), 위험 점수 **8**(`inflationStability,recessionDefense,stagflationSafety,creditRiskDefense,earningsRecessionDefense,assetBubbleSafety,debtRiskSafety,supplyShockSafety`), 미국/한국 공탐 **2**, 종합 **1**, 금리심리 **1**, 이란참고 **1**의 점수형 출력이 존재한다. 미국/한국 등락 **2**는 0~100 단일 점수가 아니라 상승·보합·하락 **세 비율**이며, 한국 패널은 현재 `counts` 미전달로 연결 예정. `domains.breadth` 점수형과 등락 비율형은 별개다. 미국 등락 249~250 거래일 자료는 점수 1년 PIT가 아니라 해당 비율 이력으로 별도 검증할 대상이다. 한국 공탐은 `RECONSTRUCTED_CURRENT_VINTAGE`, `pointInTimeVerified=false` 표시로 과거 PIT 증거 사용 불가.
- **업종 11:** 실제 R3의 11개 점수 구조는 존재하나 252개 재계산 추세는 개별 당일 확정 이력 252건이 아니다. 날짜별 PC 원장 확인 요청 #1228 보존.
- **테마 UI 표시명 30:** `components/market-explorer-catalog.ts`에서 AI·디지털 **10**, 산업·모빌리티 **6**, 에너지·자원 **8**, 헬스케어·소비 **6**의 정확한 후보 UI 수 확인. 반면 `config/theme-data-registry.json`이 명시하는 계산 등록 ID는 **10**이며 이름 정확 일치 **9**, `AI 반도체`/`AI·반도체` 표기 차이 **1**. UI 후보 **20개는 현재 등록부에 없음**. 그중 `우주·위성`은 다른 구버전 공개 코드/문서에 존재하므로 미등록=미운영 단정 금지. 임의 신규 테마 산식·상한·등록 생성도 금지. 공식 T01~T30 ID↔원천↔PC/D1/API 매핑은 아직 완성되지 않았다.

| 집계 기준 | 확인 | 1년 실제 종단 확인 |
|---|---:|---:|
| 대시보드 UI 27: 점수형 25 + 비율형 2 | 화면 구조 확인, 정본 PIT ID 매핑 일부 미완 | 0 |
| 업종 점수 11 | 소스·공개 R3 11개 확인 | 0 |
| 테마 UI 후보 30: 현재 명시 registry 10, 미등록 20 | UI 30 확인, 전체 실행 등록 미확인 | 0 |
| 합계 기획 항목 68 | **68개 모두 실제 PIT 점수인지 미확정** | **0/68(잠정 기준)** |

**다음 최소 실행:** 27·11·30 로스터의 **ID→계산기→PC 저장 키→D1 키→API** 대응을 실제 등록/Runtime 증거로 확정한다. 특히 테마 UI 20개 미등록과 등락 비율형 2개를 사용자 승인 없이 0~100 새 점수로 변환하거나 분모에서 삭제하지 않는다. 기존 승인된 D05·업종 실증은 독립 진행 가능하다. 실제 운영 쓰기/배포·예약 0건.

### 테마 30개 공개 읽기 경로 정밀 추적 — 2026-11-11

소스만 읽어 확인한 **표시명 기준 공개 읽기 경로 11개**는 정규 7개(로봇·자동화, 클라우드·SaaS, 자율주행, 원전·SMR, 방산, 핀테크, 사이버보안)와 개별 verified reader 4개(AI 반도체, 바이오·신약, 데이터센터·전력, 우주·위성)다. 정규 7개는 `worker/theme-etf-only-public.mjs`의 `THEME_ETF_ONLY_PAIRS`, 개별 4개는 `worker/theme-ai-semiconductor-optional.mjs`·`theme-biotech-optional.mjs`·`theme-data-center-power-r1.mjs`·`theme-space-satellite-r1.mjs`의 조건부 D1 read/merge를 통해 `/api/theme-fear-greed`로 연결된다. **11개가 현재 D1에 READY로 올라와 있다는 뜻은 아니다.** `theme-nine-r37-public.mjs`의 9개는 독립 신규 테마 9개가 아니라 이미 존재하는 테마 점수의 조건부 산식 대체이며, AI·반도체와 UI의 AI 반도체 표기 차이는 별도 대응이 필요하다.

**개별 공개 읽기 경로 미확인 19개**: 양자컴퓨팅, 블록체인·디지털자산, AR·VR, 데이터센터 액체냉각, 실리콘 포토닉스, 드론·UAM, 휴머노이드, 전고체 배터리, 수소, 태양광, 핵융합, 탄소포집, 희토류·핵심광물, 자원 재활용, 의료기기, 디지털헬스, AI 신약개발, K-콘텐츠·드라마, 게임·e스포츠. `/api/theme-configured`는 `public_feed_snapshots_v1`의 `theme-configured:%` 동적 항목을 읽을 수 있으므로, 이 19개가 실제 저장·운영되지 않는다고 단정하지 않는다. 또한 `theme-explorer.tsx`가 직접 요청하는 것은 `/api/theme-fear-greed`여서 동적 configured 전용 API의 READY 데이터가 곧바로 탐색기 30개에 표시된다고도 단정하지 않는다.

**판정:** 30 UI 명칭 확정, 11개 이름 대응 reader 소스 확인, 19개 개별 경로 미확인, 동적 추가 런타임 미검증, 30개 당일 확정점수의 1Y PIT 보관 실증 **0건**. 다음 확인은 기존 A급 승인 조회로 실제 D1 현재 feed 키/PC 저장 키를 읽어 11개 READY와 19개 동적 등록 여부를 대조하는 것이다. 새로운 계산식·복제 게시기·예약을 만들지 않는다.
