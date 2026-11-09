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
