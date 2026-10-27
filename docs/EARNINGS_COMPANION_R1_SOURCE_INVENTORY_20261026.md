# 실적 침체 분석 지표 — R1 기존 수집·저장·공개 경로 인벤토리

- 작성일: 2026-10-26 (KST)
- 상태: **R1 GITHUB_CODE_INSPECTED / PC_RUNTIME_NOT_VERIFIED / API_HTTP_NOT_TESTED / PUBLICATION_NOT_EXECUTED**
- 대상: `https://zgmini.kr/earnings-recession/`의 **정보성 지표(C)**. 기존 E1-R4 점수 4요소(A), 12대 기업 실적 도메인(B)과 구분.
- 코드 기준: `ansqhd5774-Choi/zgmini` `main` SHA `972a5da9deae1a4a2f12b042f66e3bdfd72ef977`
- 작업 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026`
- 기준 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`
- 주의: GitHub **소스코드로 확인한 사실**만 기록한다. Windows PC의 실제 환경설정·SQLite 행·실행 로그, Cloudflare D1 실제 행·HTTP 공개 결과, 라이브 API 응답을 열람·검사하지 않았다.

## 1. 실행 경로: 코드 증거

| 단계 | 경로 | GitHub에서 확인한 내용 | 실측 상태 |
|---|---|---|---|
| PC 오케스트레이터 | `scripts/pc-writer/collect-local.mjs` | `runPublicFeeds`와 `runMarketOperationalRefresh` 호출, 한 번에 public feed 1개 또는 market job 1개, `local-collection-last-run.json` 상태 로그 | **코드 있음**; PC 실행 로그 미확인 |
| 작업 레지스트리 | `worker/market-collection-jobs.mjs` | `earnings`, `growth`, `inflation` 등이 등록됨 | **등록 확인**; 최근 실행 여부 미확인 |
| 실적 E1-R4 수집 | `worker/market-operational-refresh.mjs` `jobs.earnings` → `lib/market-score/sec-earnings-e1-r4-provider.mjs` | SEC XBRL frames + S&P500 모집단, 분기 성숙도와 D1 저장, 저장값으로 점수 평가 | **운영 작업 경로 코드 있음**; 실적 수집 성공·최신 관측일 미확인 |
| 실적 E1-R4 비공개 입력 저장 | `lib/market-score/earnings-e1-r3-d1-store.mjs` | `market_score_earnings_e1_r3_current_v1`, `_history_v1`, `_universe_v1`, `_runs_v1` 스키마와 읽기/쓰기 코드 | **스키마 코드 있음**; PC/D1 테이블 실물·행 미확인 |
| 경제성장 Growth R2 수집 | `worker/market-operational-refresh.mjs` `jobs.growth` → `growth-r2-worker-domain-r1.mjs` | Census M3/BFS, BLS CES, Federal Reserve G.17 수집 연결 | **운영 작업 경로 코드 있음**; 24/24 실제 READY 미확인 |
| Growth R2 저장 | `lib/market-score/growth-r2-d1-store-r1.mjs` | `growth_r2_feature_history_v1`, `growth_r2_feature_current_v1`, `growth_r2_provider_snapshots_v1` 코드 | **저장 모델 존재**; 실제 저장·원자료 재사용 가용성 미확인 |
| BLS PPI | `worker/public-feed-collectors.ts` → `worker/market-data-feed.ts` | 등록된 `market-data` feed에 BLS `WPSFD4` 값/YoY 출력 코드; `fetchBlsWithFallback` 경유 | **출력 경로 코드 있음**; 실제 수치·공급원별 권리 확인 필요 |
| BEA 다른 도메인 | `scripts/pc-writer/consumption-r5.mjs`, `worker/data-health.mjs`, `lib/market-score/breadth-r2-provider-client.mjs` | BEA 공식 `https://apps.bea.gov/api/data` 호출 코드. 주 용도는 소비/NIPA 진단·국제수지 등 | **BEA 연결 기능 확인**; 기업이익 정보 지표의 전용 API 경로는 미확인 |
| 기업 실적 E1-R5 Shadow | `lib/market-score/earnings-e1-r5-input-contract.mjs`, `scripts/pc-writer/earnings-r5-production-cycle-r1.mjs`, `docs/EARNINGS_E1_R5_FORWARD_READINESS_R3.md` | SEC CompanyFacts ZIP/FSDS, BEA `A051RC` XLSX, BLS `PRS85006111` 평문, 비용·현금흐름 연구 | **연구 코드·계약 확인**; Readiness 문서는 **Production 활성화 NO** |
| 기존 공개 점수 | `worker/market-public-projection-store.mjs`, `worker/projection-runtime-r52.mjs`, `app/earnings-recession/earnings-risk-only-panel.tsx` | `detail:earnings-recession:v1` 저장 Projection read-only, 화면은 E1-R4 4개 점수 요소 | **기존 계약 코드 있음**; 새 정보성 원시/파생 지표 공개 연결은 없음 |
| 별도 실적 잠정치 | `worker/earnings-risk-provisional-public.mjs` | `public:earnings-risk-provisional:r30` 전용 저장키와 엄격한 검증 읽기; 확정 R4와 구별 | **별도 코드 존재**; 실제 최신 공개 자료와 혼동 금지 |

**R1 핵심 판단:** 같은 공공기관 API를 *다른 용도로* 사용한 코드가 있어도 해당 실적 분석값이 즉시 재사용 가능하다는 의미는 아니다. 우선 기존 작업의 실제 저장 데이터와 시계열 정의를 확인한 뒤 재사용한다.

## 2. 정보성 지표 후보별 중복·갭 매핑

상태 정의: `CODE_REUSE_CANDIDATE`=유사 원천 수집/저장 코드 발견, `SHADOW_ONLY`=E1-R5 연구 자료만 존재, `NEW_SOURCE_TO_VALIDATE`=조사 범위에서 전용 코드 미발견, `DERIVED_NOT_BUILT`=정보성 파생 값 미구현. 모든 행에서 **실제 API 응답·최근 관측일·PC 저장 행·새 목록 공개는 NOT_TESTED**.

| indicator_id (임시, 산식 키 아님) | 원천 / 정보성 분석 지표 | 기존 collector / 소스 코드 | 기존 저장·공개 가능성 | 기존 관측일 | 분류 및 남은 문제 |
|---|---|---|---|---|---|
| BEA_PROFIT_YOY | BEA 전미 기업이익 증감률 | 소비 BEA API 클라이언트 있음; E1-R5 `A051RC` 파일 파서 있음 | 기업이익 API용 저장/공개 경로는 미확인 | UNKNOWN | **SHADOW_ONLY + 전용 공식 API 시리즈 매핑 필요** |
| BEA_AFTER_TAX_PROFIT_YOY | BEA 세후 기업이익 증감률 | 전용 collector 미발견 | 미확인 | UNKNOWN | **NEW_SOURCE_TO_VALIDATE** |
| BEA_INDUSTRY_PROFIT_YOY | BEA 산업별 기업이익 성장률 | 전용 산업별 시리즈 매핑 미발견 | 미확인 | UNKNOWN | **NEW_SOURCE_TO_VALIDATE** |
| BEA_INDUSTRY_LOSS_BREADTH | BEA 산업 중 기업이익 감소 비율 | 전용 원자료/파생 코드 미발견 | 미확인 | UNKNOWN | **DERIVED_NOT_BUILT** |
| QFR_SALES_YOY | Census QFR 산업별 매출 성장률 | `QFR` 전용 코드·호출 경로를 이번 확인 범위에서 찾지 못함 | 미확인 | UNKNOWN | **NEW_SOURCE_TO_VALIDATE** |
| QFR_NET_MARGIN | Census QFR 산업별 순이익률 | 전용 코드 미발견 | 미확인 | UNKNOWN | **NEW_SOURCE_TO_VALIDATE** |
| QFR_MARGIN_DETERIORATION | Census QFR 산업별 수익성 악화 비율 | 파생·기준 시점 코드 미발견 | 미확인 | UNKNOWN | **DERIVED_NOT_BUILT** |
| M3_NEW_ORDERS | Census M3 신규주문 | `growth-r2-forward-provider-r1.mjs` G010(전체), G011(내구재), G012(설비 관련) | Growth feature history/current 스키마 코드. 실적 C용 공개 API 없음 | UNKNOWN | **CODE_REUSE_CANDIDATE**; 월별 정의/범위 검증 |
| M3_SHIPMENTS | Census M3 제조업 출하 | 위 G013(전체), G014(설비 관련) | 위와 같음 | UNKNOWN | **CODE_REUSE_CANDIDATE** |
| M3_UNFILLED_ORDERS | Census M3 미이행주문 | 위 G015 | 위와 같음 | UNKNOWN | **CODE_REUSE_CANDIDATE** |
| M3_INVENTORIES | Census M3 제조업 재고 | 위 G016 | 위와 같음 | UNKNOWN | **CODE_REUSE_CANDIDATE**; MTIS 재고/매출 비율과 혼동 금지 |
| M3_SHIPMENTS_TO_INVENTORIES | M3 출하 대 재고 파생비율 | 위 G018(`DERIVED_SHIPMENTS_TO_INVENTORIES`), G017(주문/재고) | Growth feature 저장 경로 코드 | UNKNOWN | **CODE_REUSE_CANDIDATE**; 비율 방향·명칭 명확히 |
| MTIS_INVENTORY_SALES | Census MTIS 재고/매출 비율 | `MTIS` 전용 collector 미발견 | 미확인 | UNKNOWN | **NEW_SOURCE_TO_VALIDATE**; M3/G018로 대체 표시 금지 |
| BLS_PPI_YOY | BLS 생산자물가(PPI) YoY | `worker/market-data-feed.ts`의 BLS `WPSFD4` | `market-data` public feed 산출 경로 코드 있음; fallback 출처 혼합 가능 | UNKNOWN | **CODE_REUSE_CANDIDATE**; 실제 BLS 직접 원천·시계열 확인 |
| BLS_UNIT_LABOR_COST | BLS 단위노동비용 변화 | E1-R5 `PRS85006111` flat text 입력 계약·파서 | E1-R5 Shadow 파일에 의존; C용 자동 API/공개 없음 | UNKNOWN | **SHADOW_ONLY**; 실제 BLS API ID/단위 검증 |
| BLS_PRODUCTIVITY | BLS 노동생산성 증가율 | 전용 생산성 시리즈 수집/공개 코드 미발견 | 미확인 | UNKNOWN | **NEW_SOURCE_TO_VALIDATE** |
| BLS_PRODUCER_INPUT_PRICE | BLS 생산자 투입가격(산업별) | E1-R5 `BLS satellite input-to-industry XLSX` 파서 | 연구 파일 기반; API/공개 연결 없음 | UNKNOWN | **SHADOW_ONLY**; 실험통계 표시 필요 |
| SEC_EPS_GROWTH | SEC 기업 EPS 증감/분포 | `sec-earnings-e1-r4-provider.mjs` | E1-R4 비공개 저장 및 점수 요소 사용 코드 있음; 기업별 원시값 공개는 미확인 | UNKNOWN | **CODE_REUSE_CANDIDATE**; 현재 점수와 정보성 원자료 구분 |
| SEC_REVENUE_GROWTH | SEC 기업 매출 성장/분포 | 위 E1-R4 / E1-R5 companyfacts | 위와 같음 | UNKNOWN | **CODE_REUSE_CANDIDATE** |
| SEC_OPERATING_MARGIN | SEC 기업 영업이익률/분포 | 위 E1-R4 / E1-R5 companyfacts | 위와 같음 | UNKNOWN | **CODE_REUSE_CANDIDATE** |
| SEC_EARNINGS_BREADTH | SEC 기업 이익 악화 비중/폭 | E1-R4 `earningsGrowthBreadth` 점수 요소, 회사별 수치 활용 | 점수 요소는 기존 공개 모델에 있음; 독립 정보성 %는 미확인 | UNKNOWN | **DERIVED_NOT_BUILT**(C 기준) |
| SEC_CFO_FCF | SEC 영업현금흐름/잉여현금흐름 | E1-R5 `NetCashProvidedByUsedInOperatingActivities`, CapEx tags | Shadow 회사별 재무 입력 연구. 별도 확정 공개 없음 | UNKNOWN | **SHADOW_ONLY**; 분기/연간 정합성·커버리지 검증 |
| SEC_LOSS_MAKING_SHARE | SEC 적자 기업 비율 | E1-R5 `NetIncomeLoss` 입력 계약 | 별도 퍼센트 산출 및 C 공개 없음 | UNKNOWN | **DERIVED_NOT_BUILT** |

※ 행 수는 후보 연구 목적으로만 나열한 것이다. 23개가 상한·하한·목표가 아니며, 사용권·자료 품질·실제 수신을 통과한 행만 향후 유동적으로 노출한다.

## 3. 저장·공개 재사용 시 주의점

1. **BEA**: `consumption-r5` API 테이블(`NIUnderlyingDetail/U20306`, `NIPA/T20600`)은 기업이익 `A051RC`의 동일 데이터가 아님. HTTP 라이브 수신 증거와 NIPA의 분기 기업이익 전용 selector가 별도로 필요하다.
2. **Census**: M3 G010/G013/G015/G016 등은 `growth-r2_feature...` 입력 후보 코드에 있다. `GROWTH_R2_METHOD` 자체에 `CANDIDATE` 명시가 있으므로 24/24 READY·실제 갱신·상세 게시를 확인하지 않고 운영 성공이라고 단정하지 않는다. QFR 및 MTIS는 코드 검색·선정 파일 조사에서 **미발견**일 뿐 저장소 전체 부재를 증명하지 않는다.
3. **BLS**: `market-data`는 `fetchBlsWithFallback`을 쓴다. 원천이 FRED로 바뀌었다면 새 정보성 공개에는 FRED 제3자 권리 제약을 재검토해야 한다. `PRS85006111` Shadow flat text와 `WPSFD4` 일반 PPI는 서로 대체할 수 없다.
4. **SEC**: E1-R4는 S&P500 모집단/Wikipedia 자료 결합, 지연된 calendar frames 및 저장 시점 정책이 있다. E1-R5 CompanyFacts는 별도 Shadow 연구다. SEC 전수 조회 부담·부분 기업 결측·기간 정합성 검증 없이 새 정보성 확정값으로 표시하지 않는다.
5. **PC/D1 저장**: `market_input_batches_v1`, `market_public_snapshots_v1` 및 도메인별 테이블은 **소스 코드에 존재하는 SQL**이다. Windows PC와 Cloudflare 실제 테이블이 생성되어 있고 최신 데이터가 채워져 있다는 뜻은 아니다.
6. 기존 `detail:earnings-recession:v1`, `public:earnings-risk-provisional:r30`, 4개 점수 요소는 동결한다. 정보성 C 데이터는 새 read-model 계약을 승인받은 뒤 별도 연결한다.
7. **저장량·정의·권리**: 공식 미국 기관 데이터 사용/공개 근거는 BEA, Census, BLS, SEC 자료에 한한다. 소스 URL·출처·관측일·발표일·개정 여부를 기록해야 하며, FRED/FactSet의 별도 권리를 공식기관 원천에 전가하지 않는다.

## 4. R1 Gate 결과

| Gate | 판정 | 이유 |
|---|---|---|
| BEA/BLS/Census/SEC 기존 collector 식별 | **PASS_CODE** | 구체적 경로 및 주요 ID 파악 |
| 수집 Job/저장 스키마 구조 파악 | **PASS_CODE** | `collect-local`, `market-operational-refresh`, 각 스토어 코드 확인 |
| 기존 PC 승인 config/실행 SHA/SQLite 실제 행 | **UNKNOWN** | 원격 GitHub 소스만 접근, PC 로컬 실측 없음 |
| 원천별 최신 관측일·원본 응답·시계열 적합성 | **NOT_TESTED** | API 호출·자료 다운로드 실행 안 함 |
| 실제 D1 공개 행/날짜 확인 | **NOT_TESTED** | D1 live readback 미실시 |
| 신규 지표 공개 가능 판정 | **HOLD** | 사용권은 공급자 단위 후보, 해당 데이터·정의·수신·저장 검증 전 |
| 기존 E1-R4 점수/DB/스케줄러 불변 | **PASS_SCOPE** | 이번 R1은 파일 조사 및 문서 추가만 |

**결론:** R1의 GitHub 코드 인벤토리는 확보했다. **운영 데이터의 실제 중복 여부는 아직 미확정**이다. R2에서 무료·상업적 재사용과 API별 정확한 응답/시계열을 독립적으로 점검하며, PC 실측/DB 확인은 승인된 CMD 절차로만 수행해야 한다.

## 5. R2 우선 검증순서(수집·변경 미실행)

1. **중복 후보 확인:** M3 G010/G013/G015/G016, BLS WPSFD4, SEC E1-R4 입력의 *실제 값/기간/공개 여부* 및 PC 로그/저장 스키마 read-only 확인.
2. **BEA 기업이익:** `A051RC`에 대응하는 분기 API dataset/table/line을 공식 메타 API로 확정한 뒤 조회. 다른 소비 BEA series 재사용 금지.
3. **Census QFR/MTIS:** 공식 endpoint/variables/key 필요 여부 및 실측 JSON을 확인. 실패는 해당 행만 HOLD.
4. **BLS 비용·생산성:** `PRS85006111` 및 생산성 시리즈의 API 이용 가능성·계절조정·단위·빈도·발표 지연 확인.
5. **SEC 현금흐름/분포:** E1-R5 Shadow 원천을 먼저 대조하고, 공개 모델/분기 결산 정합성과 API 부하를 별도 검증.

R2 각 행 필수 필드:
`LICENSE_OX | API_EXISTS_OX | HTTP_OBSERVED_OX | SERIES_MATCH_OX | COVERAGE | RELEASE_LAG | LATEST_OBSERVATION | CURRENT_PC_ROW_OX | PUBLIC_ROW_OX | REASON`.

## 6. 공식 사용권 근거 / 코드 참조

- BEA 공식 FAQ: https://www.bea.gov/help/faq/147
- Census Data API Terms: https://www.census.gov/data/developers/about/terms-of-service.html
- BLS Copyright: https://www.bls.gov/opub/copyright-information.htm
- SEC EDGAR 재사용: https://www.sec.gov/about/webmaster-frequently-asked-questions
- SEC 자동 접근: https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data
- 로컬 계약: `docs/PC_WRITER_R2.md`, `docs/EARNINGS_E1_R5_FORWARD_READINESS_R3.md`
