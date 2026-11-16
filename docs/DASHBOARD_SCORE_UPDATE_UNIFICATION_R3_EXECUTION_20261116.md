# W06 대시보드 갱신 시점 통일 — R3 실제 실행 원장 2026-11-16

- 고정 실행계획: [R3](DASHBOARD_SCORE_UPDATE_UNIFICATION_EXECUTION_R3.md) — 고정 34개 + 실제 결함군당 4개
- 현재 개발 소스 참조: `zgmini main` `e2d12b79aa54480fdffefb011f0c3829780bee69` (2026-11-16 현재 조회한 시점의 HEAD; 설치 PC source SHA/Cloudflare Production과 동치 아님)
- 착수 당시 전용 브랜치: `codex/ui-improvements` `43f943679b555387593d918088860ba5b882dcb6`
- 인계받은 기존 근거: `DASHBOARD_SCORE_68_CONTENT_CONTRACT_INVENTORY_R1.md` (2026-11-10), `DASHBOARD_SCORE_RUNTIME_BASELINE_R1.md` (2026-11-10)
- 당회 작업 범위: **현재 개발 소스의 UI 소비 구조 및 R1 계약 재사용**, 기능별 실제 갱신 계약 분류 착수. 원자료/DB/D1/Controller/예약/산식 변경 없음.
- **진척 요약: 01,02,03,07,09–18 판정 완료 (14/34 = 41.2% 고정 작업 기준). 기능별 판정 11/27. 나머지 16개는 미완료.** 추가 결함군 N은 미확정이므로 전체 R3 최종 %는 아직 산정하지 않는다. 이 기록은 브랜치 문서 반영이지 배포/운영 적용 증거가 아니다.

## 1. 공통 실행 01–03 — 완료 근거

**01 기존 자료 연결 및 source 범위 확인: PASS (기준선 확정).**
- D01–D27 연속 ID **27/27**, 기존 2026-11-10 API·Gate 매핑 재사용. 기존 S11/T30은 별도 업무이므로 집계 제외.
- GitHub 원격 `main`과 전용 브랜치 HEAD를 각각 조회해 고정 기록했다. 현재 소스의 `app/dashboard-ui.tsx`, `app/korea-composite-view.tsx`, `app/market-breadth-strip.tsx`, `app/korea-funds-store.ts`, `lib/market-score/live-refresh.mjs`, `components/use-stored-index.ts`, `scripts/pc-writer/run-local.mjs`를 필요한 부분만 확인했다.
- 2026-11-10 원본의 점수·시각은 **과거 기준선**이며 오늘의 최신 값·동일 PC 설치 SHA라고 가정하지 않는다. 전체 main 파일 변경 이력을 전수 대조했다고 주장하지 않는다.

**02 갱신 가능성 공통 판정 기준: PASS (분류 계약).**
- `INPUT_ELIGIBLE`: 공식 새 관측/정정이 저장되고 승인 산식 READY 충족 → **다음 승인 계산→저장→게시 성공 시** 현재 결과 갱신 가능. 입력 하나가 바뀐 즉시 화면의 60초 재조회만으로 점수가 계산되는 것은 아니다.
- `GATE_WAIT/EXPECTED_WAIT`: 완료 월·분기·거래일/전체 필수 지표/권리 Gate가 아직 미충족이면 현재점수 새 확정 게시를 대기한다. 정상 대기를 오류로 보지 않는다.
- `CARRY_FORWARD`: 아직 새 발표가 없는 입력은 해당 산식에서 승인한 마지막 유효값 이월. stale/missing/null과 값 0을 구분한다.
- `NOT_CONNECTED`: 해당 카드의 계산/게시/표시 입력 연결이 실제 없다. 이 판정은 별도 기능 공급/등록 작업의 상태이지 '계산일 대기' 오류가 아니다.
- `UNKNOWN`: 산식에 필요한 입력/계산·게시의 **특정 미확인 사건** 하나를 명시. 신규 PC 전체 원장·input SHA 일괄 조사로 확대하지 않는다.

**03 27개 UI/공개 경로 연결표: PASS (R1 계약 기반, 활성 판본 검증 별도).**
- 아래 표 27개 모두의 R1 승인 주기/공개 API/소비 화면 위치를 연결했다. D01·D02·D03·D04·D05는 최신 main 핵심 소비 파일을 추가 확인했다. D06–D27은 **R1 소스 계약을 재사용한 경로 인덱스**이지 실제 활성 판본/운영 게시 검증 PASS가 아니다.
- 최신 `app/dashboard-ui.tsx`는 경제 12개 `domains`, 위험 8개 `diagnostics8`+개별 상세 API, 종합 `overall` 점수를 표시한다. `components/use-stored-index.ts`의 GET은 게시 결과 읽기이고, `lib/market-score/live-refresh.mjs`는 **60초** 브라우저 조회용이다. `scripts/pc-writer/run-local.mjs`는 `calculateMarket` 후 `writeScore`를 호출하는 **별도의 로컬 계산/저장 경로**다.
- D05 raw overall score와 화면 3.5배 변환은 기존 승인값이며 결함 아님. D08은 `stagflationSafety`를 별도 상세 API에서 사용한다. D03/D04는 0–100 점수가 아니라 세 비율이고, D26/D27은 보조 콘텐츠다.
- **현재 소스가 맞다는 사실은 운영 PC 설치·D1 최신 갱신의 증명이 아니다.** 아래 나머지 26행의 운영 갱신 결과가 미확인인 이유다.

## 2. 실행 04–30 — D01~D27별 계약 및 판정

| 번호 | 대상 | R1 입력 주기·승인 Gate (현재 설치 검증 아님) | 계약상 API/조회 | UI 소비 구조(개발 소스) | 결과 단계 | 현재 판정 |
|---|---|---|---|---|---|---|
| 04 | D01 · 미국 공포탐욕 · CNN 관측점수 | CNN 관측발표 기준; PC checkedAt와 observedAt 구별 | /api/fear-greed, /api/fear-greed/observations · cnn-observed-archive-r1 | `app/fear-greed/usa/cnn-panel.tsx` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 진행 중 · 공개값 재조회/PC 갱신 사건 미확인 |
| 05 | D02 · 한국 공포탐욕 · ZGMINI_KR_FG_CNN_R7 | KRX 거래일; 7개 동일가중 요인; 과거는 RECONSTRUCTED_CURRENT_VINTAGE, PIT 검증 아님 | /api/indicators/korea-funds · kfg_rev7_* | `app/korea-composite-view.tsx / app/korea-funds-store.ts` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 진행 중 · 완료 거래일 Gate의 실제 최신 게시 미확인 |
| 06 | D03 · 미국 등락 · public:market-breadth-r1:usa | IEX 약15분 잠정/MarketParquet 거래일 확정 R2 별도; 확정 커버리지 확인 | /api/market-breadth, /api/market-breadth-r2-history | `app/market-breadth-strip.tsx` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 진행 중 · 잠정/확정 API 현재 상태 확인 필요 |
| 07 | D04 · 한국 등락 · 공개 독립 ID 미확인 | 한국 카드 counts 입력 미연결; 0~100 점수 아님 | app/korea-composite-view.tsx → market-breadth-strip.tsx | `app/korea-composite-view.tsx / app/market-breadth-strip.tsx` | NOT_CONNECTED | **NOT_CONNECTED · 판정 완료 (수정은 별도 기능 연결 담당)** |
| 08 | D05 · 미국 종합 · CM-R1 overall | 경제 12/12 READY, 가중치 100%; 과거 CURRENT_VINTAGE_ONLY 일부 재구성; 화면변환 3.5 | /api/market-score · market_public_snapshots_v1:current | `app/dashboard-ui.tsx / scripts/pc-writer/run-local.mjs` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 진행 중 · 로컬 계산→현재 공개 버전과 신규 유효 입력의 동시 사건 미확인 |
| 09 | D06 · 인플레이션 위험 · inflationStability | 현행 R2: 저장 초기발표/PCE PC1 입력 16개·축 7개 전부 충족 시 READY (월·분기 혼합) | /api/inflation-detail · detail:inflation:v1 | `app/dashboard-ui.tsx / app/inflation/inflation-panel.tsx` | SOURCE_ROUTE_GAP_FIXED_PR_UNDEPLOYED | 개발 경로 누락 수정 PR #1165. 실제 API/D1 readback 미완료 |
| 10 | D07 · 경기침체 위험 · recessionDefense | NFP·GDP·IP·실질PCE·Sahm·소매·가처분소득 7요인; 월·분기 혼합 | /api/recession-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | SOURCE_ROUTE_GAP_FIXED_IN_PR_NOT_DEPLOYED | D07 경기침체: 7요인 저장 projection detail:recession:v1, GET 라우트 소스 누락 → PR #1165 수정, 운영 재조회 미확인 |
| 11 | D08 · 스태그플레이션 위험 · stagflationSafety | 별도 S21: 공통 13개월 확정/최신 잠정 구분; 기본 diagnostics8의 제3항 아님 | /api/stagflation-risk-detail · detail:stagflation-risk:s21 | `app/dashboard-ui.tsx (risk detail / stored projection)` | SOURCE_ROUTE_PRESENT_RUNTIME_UNKNOWN | S21 기존 전용 API 라우트 존재; 13개월 완성월 확정 Gate 보존. 운영 게시·응답 미확인 |
| 12 | D09 · 신용 위험 · creditRiskDefense | HY·IG·종합 CMDI·채권변동성 4요인; 시장/신용 혼합 | /api/credit-risk-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | SOURCE_ROUTE_GAP_FIXED_IN_PR_NOT_DEPLOYED | D09 신용위험: 4요인 저장 projection detail:credit-risk:v1, GET 라우트 소스 누락 → PR #1165 수정, 운영 재조회 미확인 |
| 13 | D10 · 실적 침체 · earningsRecessionDefense | EPS·마진·매출·확산 4요인; 완료분기/재구성 구분 | /api/earnings-recession-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | SOURCE_ROUTE_GAP_FIXED_IN_PR_NOT_DEPLOYED | D10 실적침체: 4요인 저장 projection detail:earnings-recession:v1, GET 라우트 소스 누락 → PR #1165 수정, 운영 재조회 미확인 |
| 14 | D11 · 자산 버블 · assetBubbleSafety | 6요인 V/P/H/F/B/L; 30/20/15/10/15/10; 완료분기만 확정 | /api/asset-bubble-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | SOURCE_ROUTE_GAP_FIXED_IN_PR_NOT_DEPLOYED | D11 자산버블: 완료분기·6요인 저장 projection detail:asset-bubble:v1, GET 라우트 소스 누락 → PR #1165 수정, 운영 재조회 미확인 |
| 15 | D12 · 부채 위험 · debtRiskSafety | BIS DSR·부채/GDP 등 5요인; 저빈도 혼합 | /api/debt-risk-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | SOURCE_ROUTE_GAP_FIXED_IN_PR_NOT_DEPLOYED | D12 부채: 저빈도·5요인 저장 projection detail:debt-risk:v1, GET 라우트 소스 누락 → PR #1165 수정, 운영 재조회 미확인 |
| 16 | D13 · 공급 충격 · supplyShockSafety | GSCPI·WTI·휘발유·구리·IP·CPI괴리 6요인; 혼합 | /api/supply-shock-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | SOURCE_ROUTE_GAP_FIXED_IN_PR_NOT_DEPLOYED | D13 공급충격: 혼합주기·6요인 저장 projection detail:supply-shock:v1, GET 라우트 소스 누락 → PR #1165 수정, 운영 재조회 미확인 |
| 17 | D14 · 물가 · inflation | 현행 CM-R1 4요인 35/25/15/25, 4요인 전부 READY·진단 집계점수 일치 Gate | /api/market-score domains.inflation · STORED_DIAGNOSTIC_R7 | `worker/market-score-r1.mjs / lib/market-score/inflation-legacy-public-domain.mjs / app/dashboard-ui.tsx` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 현행 코드 정상 분리. 실제 유효 입력 변경→Core 계산→게시 사건 1건은 운영 증거 미확인(UNKNOWN) |
| 18 | D15 · 고용 · employment | R54 저장 4요인: 실업률 30%·3M 비농업고용 30%·4W 주별 청구합계 20%·51개 이상 지역 개선율 20%; 월간 BLS + 주간 DOL 539, 부족 요인 시 PARTIAL/null | /api/market-score domains.employment · /economic-indicators/employment/ | `worker/market-score-r1.mjs / lib/market-score/employment-r54-candidate.mjs / app/dashboard-ui.tsx` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 실제 새 BLS/DOL 유효 입력 1건→R54 저장 계산·D1 current·API/UI 동일 시각의 사건 미확인, 기능 Owner W04 |
| 19 | D16 · 금리 · rates | 정책·2년·10년 실질·10Y–3M 4요인; 일별+정책 비정기 | /economic-indicators/rates/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 20 | D17 · 채권·신용 · credit | HY/IG CMDI·NFCI 신용·채권변동성 4요인; 주기 혼합 | /economic-indicators/credit/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 21 | D18 · 경기 · growth | G16 필수24요인; 월간 중심/혼합; 세부 발표일 대조 미완 | /economic-indicators/growth/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 22 | D19 · 소비 · consumption | 현행 R5 D/Y/L/H/B 5축; 옛 C1-R3 95→7축 아님; 월간 중심 | /economic-indicators/consumption/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 23 | D20 · 기업실적 · earnings | R4 4요인·R5 13요인 코드 병존; 현재 PC 활성버전 미확정; 분기 중심 | /economic-indicators/earnings/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 24 | D21 · 유동성 · liquidity | 준비금·M2·TGA·ON RRP 표시 입력 4종; 일·주·월 혼합 | /economic-indicators/liquidity/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 25 | D22 · 자금흐름 · fundFlows | 순유입·모멘텀·인덱스 동반·환매압력 4요인; 실제 공급자 공표주기 미확정 | /economic-indicators/fund-flows/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 26 | D23 · 수급·폭 · breadth | 상승수·상승대금·5일EMA·20일EMA 4요인; 거래일 기반, 별도 오버레이 주의 | /economic-indicators/breadth/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 27 | D24 · 달러·환율 · dollarFx | 달러지수 수준·20/60일 모멘텀·20일 변동성 4요인; 영업일 | /economic-indicators/dollar-fx/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 28 | D25 · 유가·원자재 · commodities | WTI·Brent·구리·미국 휘발유 4요인; 시장/주/월 혼합 | /economic-indicators/commodities/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 29 | D26 · 금리 심리 · public:rate-sentiment:v1 | DGS2·DGS3MO·DGS10, 일별 H.15 + 4요인 점수, 관측 7일 경과 STALE | /api/rate-sentiment · 별도 보조 콘텐츠 | `보조 콘텐츠 (원본 인벤토리 참조)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 30 | D27 · 이란 위험 진행 · public:iran-progress:r13 | 뉴스/사건 비정기, observationAt/verified/calculated/published 구별; R13 기존 예약 승인 제거 | /api/iran-progress · 별도 보조 콘텐츠 | `보조 콘텐츠 (원본 인벤토리 참조)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |

## 3. 개별 실행 04–08에서 새로 확인한 범위

**04/D01 미국 공탐 — SOURCE_REVIEWED, 미완료.**
- CNN `observedAt`은 공급자 관측 기준시각이고 PC `checkedAt`은 방문·점검시각이다. 이 둘을 신규 점수 갱신 사건으로 혼동하지 않는다. 화면 소스는 별도 CNN 카드 및 보관 관측점 소비자.
- 기존 11/10 공개값과 당일 PC 주기만으로 11/16 **신규 관측→검증→게시 갱신**을 단정할 수 없다. 필요한 실증: 같은 실제 관측 변화에 대한 기존 승인 보관/게시 사건 또는 최신 공개 API 기준일.

**05/D02 한국 공탐 — SOURCE_REVIEWED, 미완료.**
- `app/korea-composite-view.tsx`는 `observationDate`를 카드·차트 기준일로 사용, `app/korea-funds-store.ts`는 게시된 `/api/indicators/korea-funds`만 조회한다. 7개 요인과 완료 KRX 거래일 Gate를 바꾸지 않는다.
- 완료 거래일이 신규 도래했다는 사실과 실제 점수 신규 게시를 구분한다. 필요한 실증: 해당 거래일에 기존 PC 계산 완료 및 공개 응답 `observationDate`·출력 일치.

**06/D03 미국 등락 비율 — SOURCE_REVIEWED, 미완료.**
- `app/market-breadth-strip.tsx`는 미국 장중 잠정 `ALPACA_IEX_15MIN_SPLIT`, 확정 `MARKETPARQUET_STOCK_DAILY`를 별도 GET/phase로 소비한다. 마지막 확정 이력을 현재 장중 값처럼 표시하지 않도록 소스상 라벨이 분리돼 있다.
- 미완료: 실제 새 거래일·잠정 슬롯별 공식 자료가 게시되었는지 운영/현재 API 기준일 미확인. 필요: 특정 슬롯/거래일의 **기존 공개 API 현행 응답 1건**.

**07/D04 한국 등락 비율 — NOT_CONNECTED, 판정 완료.**
- `app/korea-composite-view.tsx`의 `<MarketBreadthStrip market="korea"/>` 호출에는 `counts` 인자가 없다. `app/market-breadth-strip.tsx`에서 한국 데이터는 `normalizedCounts(counts)`만 사용하며 자체 GET은 미국일 때만 수행한다.
- 따라서 한국 등락 비율 표시가 숫자 없는 **데이터 연결 예정**이 되는 소스상 이유를 특정. 계산 갱신 시점 통일과 별개인 데이터 입력 연결 미완료로 분류하고, 여기서 임의 공급 데이터/산식을 생성하지 않는다.
- **이 행만 R3 개별 27개 중 분류 종료**. 향후 한국 등락 신규 수집·입력 연결 자체는 해당 기능 원담당의 별도 승인 범위.

**08/D05 미국 종합 — SOURCE_REVIEWED, 미완료.**
- `scripts/pc-writer/run-local.mjs`는 저장된 입력의 `calculateMarket`와 `writeScore` 경로를 사용하며, 홈 `app/dashboard-ui.tsx`는 `/api/market-score`에서 `overall.status=READY`일 때 raw 점수에 승인된 **3.5배 표시 민감도**를 적용한다. 브라우저 60초 GET은 계산 트리거가 아니다.
- 이전 D05 계보 A 작업의 25건 원장은 `SELF_CONSISTENT_LOCAL_LEDGER_ONLY_NOT_LIVE_EXECUTION`, 현행 승인 source 일치 0건으로 **이번 갱신 조건 PASS 근거가 아니다**. 이 문제는 별도 인과 원장 과제로 보존한다.
- 미완료: 실제 신규 유효 입력이 12/12 READY에서 다음 Core 계산·게시로 전달된 사례 확인. 필요: 기존 Core/Writer 결과 또는 공개 점수의 **같은 실제 변경 사건 1건**. 원장 25건 추가 정밀조사 금지.

## 4. 다음 실제 실행 순서·작업량 보호

- **현재 증거상 확정된 갱신 시점 불일치(결함군 N): 아직 0건 확정이 아니라 '미확정'.** D04는 NOT_CONNECTED이며 새 수정 대상 결함군에 자동 합산하지 않는다.
- **다음 필수 실행:** 19/D16 금리 점수의 일별 금리와 비정기 연준 정책 입력 Gate를 판정하면서, Production 공개 API readback을 확보한다. 04–06·08의 구체적 미확인 입력은 기존 유효 증거가 있을 때 이어서 판정하되 **27개 전원 운영 사건 확인을 단일 전역 Gate로 만들지 않는다**.
- 실행 완료 집계: **14/34** (01,02,03,07,09–18), 04–06/08 및 19–34는 미완료. **구현: API 저장결과 읽기 라우트 7건·회귀 테스트 4건. main 병합 완료 / Cloudflare 후보 Worker build 성공 / Production 사이트 API readback 미확인.**


## 5. 09/D06 인플레이션 위험 신규 실행 증거 — 2026-11-16

- 현재 main 계산 계약: lib/diagnostic-layer/inflation-r2-stored.mjs = 저장 초기발표/PCE PC1 입력 16개 및 평가축 7개(1/7씩); 7개 축이 유효해야 READY. 경제12 물가의 구형 4요인과 별도.
- worker/inflation-r2-reader.mjs는 저장 이력만 읽고 공급자 호출 0회. 대시보드 및 상세 화면은 /api/inflation-detail의 저장 점수를 소비함.
- 소스 누락: main에 app/api/inflation-detail/route.ts가 없으나 worker/market-public-projection-store.mjs에 허용 공개 키 detail:inflation:v1와 공통 storedProjectionResponse가 있음. 운영 URL 상태는 직접 응답 미확보이므로 UNKNOWN.
- 최소 수정: W06 전용 브랜치에 GET 라우트·회귀 테스트 추가. 구 브랜치와 최신 main의 큰 분기(356 ahead, 586 behind) 때문에 2개 파일만 최신 main 기반 격리 브랜치로 이전하여 Draft PR #1165 생성: https://github.com/ansqhd5774-Choi/zgmini/pull/1165 (HEAD 30a6f6df308cb61609f5e98ec06e55916a6a3212).
- 격리 Node 22에서 동일한 저장 조회 함수·라우트·테스트를 복원해 3/3 PASS: 유효 0점, 조회 한 번·저장 JSON 원형 유지, stale 503. GitHub CI/Cloudflare/D1/API/UI 종단 결과는 미확정. 공급자·DB/TTL/산식/예약 변경 없음.
- 판정: 개발 소스의 ROUTE_GAP 확정(라우트 추가 완료). 운영 반영은 미완료. F1-F4 추가 결함군 반영 여부는 33번 원인 통합 판정에서 확정.


## 6. 10–16/D07–D13 위험 상세 경로 신규 실행 증거 — 2026-11-16

- 검증 기준: 2026-11-16 main 06f73bcf29a0af8fe2a7341b60ab6da8305a03e6. 8개 위험 중 스태그플레이션은 기존 S21 전용 상세 GET이 있으나, 나머지 7개 상세 GET 라우트(09번 인플레이션 포함)는 소스에 누락. 기존 market-public-projection-store.mjs는 7개 각각의 승인 공개 키를 이미 허용함.
- 10/D07: recessionDefense 기존 7요인·저장 projection detail:recession:v1. 11/D08: 완성월 13개월 S21, 기존 app/api/stagflation-risk-detail/route.ts 및 worker/stagflation-public.mjs 정상 연결(운영 현재값은 별도 확인). 12/D09: creditRiskDefense 기존 4요인. 13/D10: earningsRecessionDefense 기존 4요인. 14/D11: assetBubbleSafety 기존 6요인·완료분기 Gate. 15/D12: debtRiskSafety 기존 5요인. 16/D13: supplyShockSafety 기존 6요인.
- 10/12/13/14/15/16 소스 결함: UI 소비와 D1 키는 있으나 상세 GET 라우트가 누락. 해당 여섯 개를 09와 동일한 기존 저장 리더로 연결. 기존 수집기·계산기·DB/D1 키/TTL 변경 0건. 11은 소스 정상, 기존 계산 Gate 보존.
- 변경 리포지토리 브랜치: codex/ui-improvements. 무관한 다수 source divergence를 Production PR에 넣지 않으려고 최신 main 기반 격리 PR #1165에 읽기 라우트 7개 + 공통 JS 함수 타입 JSDoc + 회귀 테스트를 분리: https://github.com/ansqhd5774-Choi/zgmini/pull/1165.
- 격리 Node 22 동일 소스 테스트 4/4 PASS; 초기 범위(09) CI #43854024396 PASS. 7개 전체 확장 CI는 별도 확인 필요. 배포 SHA/D1 readback/API/UI 런타임은 확인 전이므로 실제 운영 성공으로 미집계.
- 개별 항목 분류는 소스 근거와 운영미확인 조건이 모두 명시된 상태로 완료 집계. 33번에서 동일 원인의 라우트 결함들을 한 군으로 합산할지 결정하며 중복 F1–F4 생성을 막는다.


## 7. 17/D14 경제 물가 활성 판본 및 게시 경과 — 2026-11-16

- D14는 worker/market-score-r1.mjs의 approvedPublicDomains.inflation:buildLegacyMarketInflationDomain(diagnostic,asOf)를 사용. lib/market-score/inflation-legacy-public-domain.mjs의 4요인(corePce 35%, coreCpi 25%, cpi 15%, inflationExpectations 25%) 점수와 diagnostic 집계가 정확히 일치해야 READY. 월·분기 모든 지표의 주기를 강제로 일치시키지 않음. 저장된 최신 유효 구성 점수로 현재값을 계산하며 무자료·집계 불일치 시 PARTIAL/null.
- 위험 D06은 lib/diagnostic-layer/inflation-r2-stored.mjs의 16개 입력·7개 축으로 독립. D14의 과거 R2 추이를 동일 4요인 공식 이력으로 위장하지 않음. tests/economic12-inflation-original4-r35.test.mjs에 정상·0점·결측·진단 불일치 회귀 근거 존재.
- D14 판정: SOURCE_CONTRACT_CONFIRMED / RUNTIME_UNKNOWN. 필요한 단일 운영 근거는 실제 4요인 유효 변경 1건의 계산 후 /api/market-score domains.inflation 출처판본·score·asOfDate 대응. 기존 정상 코드 무변경.
- PR #1165은 7개 공개 상세 GET 라우트·공통 타입 JSDoc·회귀 테스트 총 9파일을 최신 main 기반 별도 브랜치에서 생성해 전체 CI #43854770123 PASS. squash merge SHA 5bdaec2afd90a80cdc0a1d1e83f757cfe8b02974, main에 반영 확인. 이후 타 담당의 비충돌 main 2커밋 후 102b248a7c0cfa1506c0605092f667e47f5bd4ad Cloudflare 후보 Worker Git Integration build SUCCESS(버전 ID 1298b2df-7d27-484f-851d-1d5279137774). **zgmini.kr Production exact Deployment 및 API/D1/UI readback 미확인**: build PASS를 서비스 PASS로 보고하지 않음.


## 8. 18/D15 고용 점수 판정 — 2026-11-16

- 현재 `worker/market-score-r1.mjs`는 `lib/market-score/employment-r54-candidate.mjs`의 `loadEmploymentR54CandidateFromStored`를 사용. BLS UNRATE/PAYEMS + DOL ETA 539 주별 state claims 보관 데이터에서 실업률(30%), 비농업고용 3개월 모멘텀(30%), 실업수당 4주 평균(20%), 51개 이상 지역의 청구 개선 비율(20%)을 계산. R6 상세화면 29개 지표를 점수 필수요인으로 오인하지 않음.
- 4요인 값과 과거 최소 데이터 범위 모두 유효해야 READY. 결측/요인 불충분시 PARTIAL/score:null; 결측 가중치 재배분 없음. 시간 주기 자체를 통일하지 않음. `tests/market-score-employment-r54-wiring.test.mjs`에서 API domain 연동, PARTIAL 유효성, 상세 4개 안정 ID 확인.
- 현재 코드의 출력 계약 판정은 `SOURCE_REVIEWED_RUNTIME_UNKNOWN`, 신규 입력 시 재계산/게시 사건을 정확히 증명할 저장·D1 readback 1건이 부족. 현재 W04 고용 원담당이 수집/계산 수정 중이므로 W06이 공유 Collector·가중치·Writer를 임의 덮어쓰지 않음. 잘못된 기다림이라는 결함 확정은 아님.
