# W06 대시보드 갱신 시점 통일 — R3 실제 실행 원장 2026-11-16

- 고정 실행계획: [R3](DASHBOARD_SCORE_UPDATE_UNIFICATION_EXECUTION_R3.md) — 고정 34개 + 실제 결함군당 4개
- 현재 개발 소스 참조: `zgmini main` `e2d12b79aa54480fdffefb011f0c3829780bee69` (2026-11-16 현재 조회한 시점의 HEAD; 설치 PC source SHA/Cloudflare Production과 동치 아님)
- 착수 당시 전용 브랜치: `codex/ui-improvements` `43f943679b555387593d918088860ba5b882dcb6`
- 인계받은 기존 근거: `DASHBOARD_SCORE_68_CONTENT_CONTRACT_INVENTORY_R1.md` (2026-11-10), `DASHBOARD_SCORE_RUNTIME_BASELINE_R1.md` (2026-11-10)
- 당회 작업 범위: **현재 개발 소스의 UI 소비 구조 및 R1 계약 재사용**, 기능별 실제 갱신 계약 분류 착수. 원자료/DB/D1/Controller/예약/산식 변경 없음.
- **진척 요약: 01,02,03,07만 완료 (4/34 = 11.8% 고정 작업 기준). 기능별 실질 판정 1/27. 나머지 26개는 아직 완료 아님.** 추가 결함군 N은 미확정이므로 전체 R3 최종 %는 아직 산정하지 않는다. 이 기록은 브랜치 문서 반영이지 배포/운영 적용 증거가 아니다.

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
| 10 | D07 · 경기침체 위험 · recessionDefense | NFP·GDP·IP·실질PCE·Sahm·소매·가처분소득 7요인; 월·분기 혼합 | /api/recession-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 11 | D08 · 스태그플레이션 위험 · stagflationSafety | 별도 S21: 공통 13개월 확정/최신 잠정 구분; 기본 diagnostics8의 제3항 아님 | /api/stagflation-risk-detail · detail:stagflation-risk:s21 | `app/dashboard-ui.tsx (risk detail / stored projection)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 12 | D09 · 신용 위험 · creditRiskDefense | HY·IG·종합 CMDI·채권변동성 4요인; 시장/신용 혼합 | /api/credit-risk-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 13 | D10 · 실적 침체 · earningsRecessionDefense | EPS·마진·매출·확산 4요인; 완료분기/재구성 구분 | /api/earnings-recession-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 14 | D11 · 자산 버블 · assetBubbleSafety | 6요인 V/P/H/F/B/L; 30/20/15/10/15/10; 완료분기만 확정 | /api/asset-bubble-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 15 | D12 · 부채 위험 · debtRiskSafety | BIS DSR·부채/GDP 등 5요인; 저빈도 혼합 | /api/debt-risk-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 16 | D13 · 공급 충격 · supplyShockSafety | GSCPI·WTI·휘발유·구리·IP·CPI괴리 6요인; 혼합 | /api/supply-shock-detail | `app/dashboard-ui.tsx (risk detail / stored projection)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 17 | D14 · 물가 · inflation | 과거 R2 축수/현행 입력 판본 혼재; 월간 중심, 기대물가 별도; 활성 원천 수 미확정 | /economic-indicators/inflation/ · /api/market-score domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
| 18 | D15 · 고용 · employment | 4개 점수요인; BLS 월간 + DOL 주간; 29개 R6 상세지표와 구분 | /economic-indicators/employment/ · domains | `app/dashboard-ui.tsx (domains / economic details)` | R1_INVENTORY_REUSED_NOT_VERIFIED | R1 계약만 확보 · 활성 Gate/실제 게시 확인 대기 |
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
- **다음 필수 실행:** PR #1165 CI와 승인된 운영 반영·API 확인을 수행하고, 다음 독립 실행 10/D07 경기침체 7요인과 저장 경로를 판정한다. 04–06·08의 구체적 미확인 입력은 기존 유효 증거가 있을 때 이어서 판정하되 **27개 전원 운영 사건 확인을 단일 전역 Gate로 만들지 않는다**.
- 실행 완료 집계: **5/34** (01,02,03,07,09), 04–06/08은 부분 조사, 10–34는 미완료. **구현: API 읽기 라우트 1건·회귀 테스트 3건 / 운영 배포: 0건.**


## 5. 09/D06 인플레이션 위험 신규 실행 증거 — 2026-11-16

- 현재 main 계산 계약: lib/diagnostic-layer/inflation-r2-stored.mjs = 저장 초기발표/PCE PC1 입력 16개 및 평가축 7개(1/7씩); 7개 축이 유효해야 READY. 경제12 물가의 구형 4요인과 별도.
- worker/inflation-r2-reader.mjs는 저장 이력만 읽고 공급자 호출 0회. 대시보드 및 상세 화면은 /api/inflation-detail의 저장 점수를 소비함.
- 소스 누락: main에 app/api/inflation-detail/route.ts가 없으나 worker/market-public-projection-store.mjs에 허용 공개 키 detail:inflation:v1와 공통 storedProjectionResponse가 있음. 운영 URL 상태는 직접 응답 미확보이므로 UNKNOWN.
- 최소 수정: W06 전용 브랜치에 GET 라우트·회귀 테스트 추가. 구 브랜치와 최신 main의 큰 분기(356 ahead, 586 behind) 때문에 2개 파일만 최신 main 기반 격리 브랜치로 이전하여 Draft PR #1165 생성: https://github.com/ansqhd5774-Choi/zgmini/pull/1165 (HEAD 30a6f6df308cb61609f5e98ec06e55916a6a3212).
- 격리 Node 22에서 동일한 저장 조회 함수·라우트·테스트를 복원해 3/3 PASS: 유효 0점, 조회 한 번·저장 JSON 원형 유지, stale 503. GitHub CI/Cloudflare/D1/API/UI 종단 결과는 미확정. 공급자·DB/TTL/산식/예약 변경 없음.
- 판정: 개발 소스의 ROUTE_GAP 확정(라우트 추가 완료). 운영 반영은 미완료. F1-F4 추가 결함군 반영 여부는 33번 원인 통합 판정에서 확정.
