# W06 대시보드 갱신 시점 통일 — R3 실제 실행 원장 2026-11-16

- 고정 실행계획: [R3](DASHBOARD_SCORE_UPDATE_UNIFICATION_EXECUTION_R3.md) — 고정 34개 + 실제 결함군당 4개
- 현재 개발 소스 참조: `zgmini main` `e2d12b79aa54480fdffefb011f0c3829780bee69` (2026-11-16 현재 조회한 시점의 HEAD; 설치 PC source SHA/Cloudflare Production과 동치 아님)
- 착수 당시 전용 브랜치: `codex/ui-improvements` `43f943679b555387593d918088860ba5b882dcb6`
- 인계받은 기존 근거: `DASHBOARD_SCORE_68_CONTENT_CONTRACT_INVENTORY_R1.md` (2026-11-10), `DASHBOARD_SCORE_RUNTIME_BASELINE_R1.md` (2026-11-10)
- 당회 작업 범위: **현재 개발 소스의 UI 소비 구조 및 R1 계약 재사용**, 기능별 실제 갱신 계약 분류 착수. 원자료/DB/D1/Controller/예약/산식 변경 없음.
- **진척 요약: 01–33 완료 (33/34 = 97.1% 고정 작업). D01–D27 소스 판정 27/27. 결함 원인군 N=2 확정으로 전체 42작업, 현재 추가 F1–F4 증거 5/8, 통합 38/42(90.5%).** 34/F3(둘째 군)/F4(각 군) 미완료. 이 소스 진행률은 Production 운영 완료율이 아니다.

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
| 04 | D01 · 미국 공포탐욕 · CNN | 신규 CNN 관측 `observedAt` vs 재조회 `checkedAt` 독립; valid observed feed와 신규 점수 history만 반영 | /api/fear-greed · observations | `app/fear-greed/usa/cnn-panel.tsx / app/api/fear-greed/route.ts` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 공급자 실제 관측 변경→PC 게시→API/UI 1건은 미확인. 방문자 API는 저장 결과만 읽음 |
| 05 | D02 · 한국 공포탐욕 · KRX | 7요인 READY 및 KRX 완료 거래일, 관측일 `observationDate`, 공개 score와 이력 구분 | /api/indicators/korea-funds | `app/korea-composite-view.tsx / app/korea-funds-store.ts` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 카드/차트는 저장한 거래일의 실제 점수; 신규 완료거래일 전은 EXPECTED_WAIT, PC 계산·D1 동시 사건 미확인 |
| 06 | D03 · 미국 등락 비율 · USA | MarketParquet 금지 결정으로 confirmed-r2/history API 503 RETIRED; 독립 기존 IEX 잠정만 유효 observationDate+slotEndUtc에 표시 | /api/market-breadth?market=usa&phase=provisional | `app/market-breadth-strip.tsx / app/api/market-breadth/route.ts / docs/MARKETPARQUET_REMOVAL.md` | DEFECT_DISPLAY_SOURCE_FIXED_UNDEPLOYED | main 화면이 폐기된 R2 이력을 현재 후보로 사용+확장 UI 노출; W06 브랜치 UI 소스 수정. Production/CI 및 권리 확인 전. 승인 없는 새 공급자/legacy SP500 대체 금지 |
| 07 | D04 · 한국 등락 · 공개 독립 ID 미확인 | 한국 카드 counts 입력 미연결; 0~100 점수 아님 | app/korea-composite-view.tsx → market-breadth-strip.tsx | `app/korea-composite-view.tsx / app/market-breadth-strip.tsx` | NOT_CONNECTED | **NOT_CONNECTED · 판정 완료 (수정은 별도 기능 연결 담당)** |
| 08 | D05 · 미국 종합점수 · overall | 경제12 전부 READY 및 저장 새 입력→승인된 다음 Core 계산/게시; raw score→UI 3.5× 민감도 변환 | /api/market-score current/observations | `app/dashboard-ui.tsx / scripts/pc-writer/market.mjs` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | API 60초 조회는 계산/게시 트리거 아님; 이전 25개 자체 원장은 LIVE 증거가 아님, 새 event 1건 미확인 |
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
| 19 | D16 · 금리 · rates | 현행 RATE_R3: EFFR 정책 축 20% + 2Y 국채 25% + 실질 10Y 30% + 10Y−3M 곡선 25%. NY Fed EFFR + 연준 H.15 영업일 입력; 정책 상하한은 표시 계약 | /api/market-score domains.rates · /economic-indicators/rates/ | `lib/market-score/rate-r3.mjs / lib/market-score/rate-r2-provider.mjs / worker/market-score-r1.mjs` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 유효 4축/최소 과거 자료와 영업일 freshness Gate 확인. 실제 입력→저장→계산→게시 사건 확인 전. 모델 R2→R3 혼동 금지 |
| 20 | D17 · 채권·신용 · credit | 현행 CREDIT_R2: HY CMDI 35%·IG CMDI 35%·NFCICREDIT 10%·국채 2Y/5Y/10Y/30Y 변동성 20%; 주간 CMDI/NFCI + 일별 금리 혼합 | /api/market-score domains.credit · /economic-indicators/credit/ | `lib/market-score/credit-r2.mjs / worker/market-score-r1.mjs / lib/market-score/domain-adapter-r1.mjs` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 4요인 모두 유효해야 READY, missing PARTIAL/null; soft-stale>14일 표시. 실제 새로운 유효 입력의 계산·공개 갱신 사건 미확인 |
| 21 | D18 · 경기 · growth | 현행 Growth R2 G16 24개 필수 feature 및 각 발표/초기 저장시각 유효성, 2개월 stale Gate; 저장 24/24 충족 시 전용 공개 domain | /api/market-score domains.growth · /economic-indicators/growth/ | `lib/market-score/growth-r2-worker-domain-r1.mjs / lib/market-score/growth-r2-contract.mjs / lib/market-score/domain-adapter-r1.mjs` | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 24개 미충족시 신규 G16 확정점 불가; 기존 진단 fallback 구분. 현재 PC/D1 원본의 24/24 충족 사건 미확인 |
| 22 | D19 소비 consumption | R5 5축 D/Y/L/H/B=30/25/15/20/10, 월간 13개 점수요인 + 정보용 2개 진단(가중 0), 10년 기준 비교, BEA/BLS·분기 가계지표 | /api/market-score domains.consumption | worker/consumption-r5-reader.mjs; lib/market-score/consumption-r5.mjs | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 마지막 저장 입력 ≤7일, 최신 관측 ≤120일, 전 점수 요인 완전성이 READY; 공개 신규 입력→재계산 사건 미확인 |
| 23 | D20 기업실적 earnings | E1-R4 4요인 현재값 유지 또는 E1-R5 13요인 모두 READY/noReweight일 때 R5 선택. SEC 분기 공표·별도 forward 입력 | /api/market-score domains.earnings | scripts/pc-writer/market.mjs; lib/market-score/earnings-e1-r5-production-domain.mjs; lib/market-score/earnings-e1-r5.mjs | SOURCE_REVIEWED_RUNTIME_UNKNOWN | R5 PARTIAL 시 R4 보존(구형/신형 분리); R5 활성 실데이터/sourceVersion 미확인 |
| 24 | D21 유동성 liquidity | ACTIVE D3 6요인 진단 점수를 경제 liquidity 공개 점수로 사용; 준비금/M2/TGA/ON RRP 4개 표시는 세부값, 채권변동성 등과 별개 | /api/market-score domains.liquidity | lib/market-score/liquidity-active-public-domain-r1.mjs; worker/market-score-r1.mjs | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 진단 READY면 active 상세 선택, 아니면 저장된 승인 상세 fallback; 현재 점수 vs 과거 재구성·실제 저장 추이 구별 |
| 25 | D22 자금흐름 fundFlows | SEC 등록펀드 순유입 40%·MoM 모멘텀 25%·인덱스/비인덱스 동반 20%·환매압력 15%, 최소 12관측 | /api/market-score domains.fundFlows | lib/diagnostic-layer/open-resolution-r53-components.mjs; worker/market-score-r1.mjs | SOURCE_REVIEWED_RUNTIME_UNKNOWN | SEC 실제 공식발표 관측일 기준 다음 계산; PARTIAL/모멘텀 이력 부족/출시시간 미확인 |
| 26 | D23 수급·시장폭 breadth | B1-R5 기존 D1 저장 R4 입력, 상승종목 30%·상승대금 20%·EMA5 30%·EMA20 20% 이후 최종 EMA3, 최소 커버리지 98%, 최근 ≤2 완료 거래일 | /api/market-score domains.breadth | lib/market-score/breadth-b1-r5-reader.mjs; lib/market-score/breadth-b1-r5-contract.mjs | SOURCE_REVIEWED_RIGHTS_RUNTIME_UNKNOWN | MarketParquet 제거 이후 저장 출처 권한·활성 새 입력 확인 필요; 재공급자 연결/과거 결과 최신 위장 금지 |
| 27 | D24 달러·환율 dollarFx | Broad Dollar DTWEXBGS 일별 수준30%·20일 모멘텀30%·60일 모멘텀20%·20일 변동성20%, 최소 252일 참조 | /api/market-score domains.dollarFx | lib/diagnostic-layer/open-resolution-r53-components.mjs; worker/market-score-r1.mjs | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 단일 입력원 거래일 기준; 0점 유효·이력 부족 PARTIAL. 현재 업데이트 사건 미확인 |
| 28 | D25 유가·원자재 commodities | K1-R2 독립 최신 WTI30%·Brent25%·구리25%·휘발유20%; 지표별 마지막 공표월 시차 ≤2개월, percentile 최소60 | /api/market-score domains.commodities | lib/market-score/public-domain-producers-r2.mjs; worker/market-score-r1.mjs | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 전 4요인 신선·완전할 때만 READY, 단일 월/주 발표시 허용 이월; 운영 신규 입력 사례 미확인 |
| 29 | D26 금리 심리 rate-sentiment | H.15 DGS2/DGS3MO/DGS10 공통 거래일, 756거래일 기준, 4축 가중50/20/20/10; 7달력일 초과 관측 STALE | /api/rate-sentiment | lib/market-score/rate-sentiment-r1-research.mjs; worker/rate-sentiment-public.mjs; app/api/rate-sentiment/route.ts | SOURCE_REVIEWED_RUNTIME_UNKNOWN | 연구용 점수와 CME FedWatch 확률 분리; 저장 공개 body READY/5개 주간점·관측일/저장시각 검증; PC 새 게시 미확인 |
| 30 | D27 이란 위험 진행 iran-progress | 비정기 검증된 사건/승인된 저장 결과 R5→R3→R2→R1→R13 읽기 fallback, 관측/검증/게시일 구별 | /api/iran-progress | worker/iran-progress-public.mjs; app/api/iran-progress/route.ts; lib/iran-progress/r13.mjs | SOURCE_REVIEWED_RUNTIME_UNKNOWN | R13 예약 승인 제거 상태. 신규 정규 예약 금지. 저장 R5 최신 확인 후 공개; 기존 검증 결과 일자 미확인 |

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
- **다음 필수 실행:** D03 소스 수정 PR #1174의 GitHub CI를 확인한 뒤 승인된 Git 연동으로 운영 반영하고, F4의 exact Deployment/API/UI readback을 진행한다. Production 공개 API 직접 조회는 현재 접근에서 UNKNOWN. 04–06·08의 구체적 미확인 입력은 기존 유효 증거가 있을 때 이어서 판정하되 **27개 전원 운영 사건 확인을 단일 전역 Gate로 만들지 않는다**.
- 실행 완료 집계: **33/34** (01–33), 34 미완료. **결함군 2개 × F1–F4 추가 8개; 5/8 완료, 3/8 미완료. 통합 38/42(90.5%).** GET 라우트군 7건 main CI/병합 성공, 실제 Production API/D1 readback 미확인. D03 화면 금지 공급자 제거 코드는 W06 브랜치·격리 PR #1174만 반영, main/Production 미완료.


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


## 9. 19/D16 금리 점수 판정 — 2026-11-16

- 활성 계산은 worker/market-score-r1.mjs에서 buildRateR3. 금리 score 4축 가중: EFFR 기준 정책 0.20, 2년 국채 0.25, 실질 10년 0.30, 장단기 10Y-3M 곡선 0.25. Fed 정책 상·하한(DFEDTARL/U)은 카드 표시 계약이며 과거 RATE_R2 균등가중 산식을 현행으로 오인하지 않음.
- 소스 수집 계약: lib/market-score/rate-r2-provider.mjs에서 NY Fed EFFR와 Federal Reserve H.15에 정규 관측. 현재 계산 R3에는 추세 최소 이력 warmup과 거래일 기준 freshness 적용. 누락·hard-stale면 UNAVAILABLE/null, 0 유효값 보호, 결측 가중 재분배 없음. tests/rate-r2.test.mjs에서 active R3가 별도임을 확인하는 기존 회귀 케이스.
- 판정: SOURCE_REVIEWED_RUNTIME_UNKNOWN; 현재 저장/게시 API의 신규 금리 원관측 반영 사건 1건과 score/기준일이 필요. 정상 영업일·휴장 대기를 이유로 산식을 임의 완화하지 않음.


## 10. 20–21/D17–D18 채권·경기 계약 판정 — 2026-11-16

- 20/D17: `lib/market-score/credit-r2.mjs`가 stored CMDI HY 35% + IG 35% + NFCI Credit 10% + 국채 네 만기 realized volatility 20% 산식을 사용, 4 요인 READY를 요구. 혼합 시계 주기, 260개 NFCI 최소 표본, 14일 초과 SOFT_STALE, missing PARTIAL/null, 허용 마지막 유효 입력 이월, old risk diagnostic(creditRiskDefense) 점수를 economic credit에 대입하지 않음. `tests/credit-r2.test.mjs`에서 활성 공통 공개 domain 우선 및 missing gate 확인.
- 21/D18: `lib/market-score/growth-r2-worker-domain-r1.mjs` + G16 registry 총 24/24 개 필수. 수집·저장된 완료 관측, 각 feature PIT 유효성과 두 발표 간격 stale Gate 충족 시 G16 점수 READY. 부족 시 새 G16 확정 점수 게시 불가; `domain-adapter-r1.mjs`에서 기존 진단 fallback이 표시될 수 있으므로 현행 growth source/version 분리 관찰 필요. 기존 R1 가중치·Gate·fallback 조건 무변경.
- 두 항목 모두 SOURCE_REVIEWED_RUNTIME_UNKNOWN: 실제 신규 관측→저장 checkpoint→계산과 게시버전→공개 응답을 동일 사건으로 맞추는 현재 운영 증거 미확보. 정상 발표/완성기간 기다림을 결함으로 오인하지 않음.


## 11. 22–30/D19–D27 신규 판정 — 2026-11-16

- **22/D19 소비 consumption:** R5 5축 D/Y/L/H/B=30/25/15/20/10, 월간 13개 점수요인 + 정보용 2개 진단(가중 0), 10년 기준 비교, BEA/BLS·분기 가계지표. Gate: 마지막 저장 입력 ≤7일, 최신 관측 ≤120일, 전 점수 요인 완전성이 READY; 공개 신규 입력→재계산 사건 미확인. API: `/api/market-score domains.consumption`; source: `worker/consumption-r5-reader.mjs; lib/market-score/consumption-r5.mjs`. **상태: SOURCE_REVIEWED_RUNTIME_UNKNOWN**.
- **23/D20 기업실적 earnings:** E1-R4 4요인 현재값 유지 또는 E1-R5 13요인 모두 READY/noReweight일 때 R5 선택. SEC 분기 공표·별도 forward 입력. Gate: R5 PARTIAL 시 R4 보존(구형/신형 분리); R5 활성 실데이터/sourceVersion 미확인. API: `/api/market-score domains.earnings`; source: `scripts/pc-writer/market.mjs; lib/market-score/earnings-e1-r5-production-domain.mjs; lib/market-score/earnings-e1-r5.mjs`. **상태: SOURCE_REVIEWED_RUNTIME_UNKNOWN**.
- **24/D21 유동성 liquidity:** ACTIVE D3 6요인 진단 점수를 경제 liquidity 공개 점수로 사용; 준비금/M2/TGA/ON RRP 4개 표시는 세부값, 채권변동성 등과 별개. Gate: 진단 READY면 active 상세 선택, 아니면 저장된 승인 상세 fallback; 현재 점수 vs 과거 재구성·실제 저장 추이 구별. API: `/api/market-score domains.liquidity`; source: `lib/market-score/liquidity-active-public-domain-r1.mjs; worker/market-score-r1.mjs`. **상태: SOURCE_REVIEWED_RUNTIME_UNKNOWN**.
- **25/D22 자금흐름 fundFlows:** SEC 등록펀드 순유입 40%·MoM 모멘텀 25%·인덱스/비인덱스 동반 20%·환매압력 15%, 최소 12관측. Gate: SEC 실제 공식발표 관측일 기준 다음 계산; PARTIAL/모멘텀 이력 부족/출시시간 미확인. API: `/api/market-score domains.fundFlows`; source: `lib/diagnostic-layer/open-resolution-r53-components.mjs; worker/market-score-r1.mjs`. **상태: SOURCE_REVIEWED_RUNTIME_UNKNOWN**.
- **26/D23 수급·시장폭 breadth:** B1-R5 기존 D1 저장 R4 입력, 상승종목 30%·상승대금 20%·EMA5 30%·EMA20 20% 이후 최종 EMA3, 최소 커버리지 98%, 최근 ≤2 완료 거래일. Gate: MarketParquet 제거 이후 저장 출처 권한·활성 새 입력 확인 필요; 재공급자 연결/과거 결과 최신 위장 금지. API: `/api/market-score domains.breadth`; source: `lib/market-score/breadth-b1-r5-reader.mjs; lib/market-score/breadth-b1-r5-contract.mjs`. **상태: SOURCE_REVIEWED_RIGHTS_RUNTIME_UNKNOWN**.
- **27/D24 달러·환율 dollarFx:** Broad Dollar DTWEXBGS 일별 수준30%·20일 모멘텀30%·60일 모멘텀20%·20일 변동성20%, 최소 252일 참조. Gate: 단일 입력원 거래일 기준; 0점 유효·이력 부족 PARTIAL. 현재 업데이트 사건 미확인. API: `/api/market-score domains.dollarFx`; source: `lib/diagnostic-layer/open-resolution-r53-components.mjs; worker/market-score-r1.mjs`. **상태: SOURCE_REVIEWED_RUNTIME_UNKNOWN**.
- **28/D25 유가·원자재 commodities:** K1-R2 독립 최신 WTI30%·Brent25%·구리25%·휘발유20%; 지표별 마지막 공표월 시차 ≤2개월, percentile 최소60. Gate: 전 4요인 신선·완전할 때만 READY, 단일 월/주 발표시 허용 이월; 운영 신규 입력 사례 미확인. API: `/api/market-score domains.commodities`; source: `lib/market-score/public-domain-producers-r2.mjs; worker/market-score-r1.mjs`. **상태: SOURCE_REVIEWED_RUNTIME_UNKNOWN**.
- **29/D26 금리 심리 rate-sentiment:** H.15 DGS2/DGS3MO/DGS10 공통 거래일, 756거래일 기준, 4축 가중50/20/20/10; 7달력일 초과 관측 STALE. Gate: 연구용 점수와 CME FedWatch 확률 분리; 저장 공개 body READY/5개 주간점·관측일/저장시각 검증; PC 새 게시 미확인. API: `/api/rate-sentiment`; source: `lib/market-score/rate-sentiment-r1-research.mjs; worker/rate-sentiment-public.mjs; app/api/rate-sentiment/route.ts`. **상태: SOURCE_REVIEWED_RUNTIME_UNKNOWN**.
- **30/D27 이란 위험 진행 iran-progress:** 비정기 검증된 사건/승인된 저장 결과 R5→R3→R2→R1→R13 읽기 fallback, 관측/검증/게시일 구별. Gate: R13 예약 승인 제거 상태. 신규 정규 예약 금지. 저장 R5 최신 확인 후 공개; 기존 검증 결과 일자 미확인. API: `/api/iran-progress`; source: `worker/iran-progress-public.mjs; app/api/iran-progress/route.ts; lib/iran-progress/r13.mjs`. **상태: SOURCE_REVIEWED_RUNTIME_UNKNOWN**.

- 오늘 최신 main의 `docs/MARKETPARQUET_REMOVAL.md`로 공급자 이용 금지 확정. D23 저장 reader가 제공하는 sourceList가 MarketParquet 계열이면 별도 원담당 권리/수집 경계로 분리. W06은 새로운 라이선스·산식·공급자를 만들지 않는다.
- API 직접 readback: 이 환경의 공개 HTTP 조회가 `zgmini.kr`에 접근하지 못해 소스와 현재 실제 공개 상태의 동치 미확인. 이를 단일 전역 blocker로 두지 않음.


## 12. 04–06/08 최종 소스 판정 및 D03 권리 경계 — 2026-11-16

- 04/D01 CNN: `app/fear-greed/usa/cnn-panel.tsx`는 관측시각 observedAt와 점검 checkedAt 별도 이력/차트로 소비, `/api/fear-greed`은 저장 피드 read. 실제 신규 점수 사건은 원장 미확인(UNKNOWN). 단순 재조회 성공은 점수 갱신 아님.
- 05/D02 KRX: `app/korea-composite-view.tsx`는 observationDate·displayScore·실제 저장 history만 표시, 아직 완료되지 않은 거래일은 EXPECTED_WAIT. 오늘 PC 신규 정상 게시 실증 미확인(UNKNOWN). 한국 등락 D04는 여전히 NOT_CONNECTED 별도 소유.
- 06/D03 USA breadth: 2026-11-16 MarketParquet 사용 금지 main 소스 `docs/MARKETPARQUET_REMOVAL.md`. main `/api/market-breadth?market=usa&phase=confirmed-r2` 및 `/api/market-breadth-r2-history`는 즉시 503; 하지만 현행 main UI의 `app/market-breadth-strip.tsx`는 폐기된 R2 확정/current/history를 숫자 fallback 및 확장 패널로 계속 표시. 새 권리 결정과 충돌하는 **DEFECT_DISPLAY**로 분류. W06 브랜치 소스에서 MarketParquet 확정/current/history UI 사용과 GET을 제거하고 독립 잠정 데이터가 유효한 경우만 표시, 한국 counts/색상/41px 유지. 아직 CI/main/Production 반영 미확인. 과거 시장폭 원자료 삭제·새 데이터 공급자 제안 없음.
- 08/D05 USA composite: `/api/market-score` 저장 12개 READY score만 실제 점수, `app/dashboard-ui.tsx`의 기존 3.5배 표시 민감도는 유지. Core→D1→GET 실제 신규 데이터 변경 사건은 전용 별도 인과 원장에서도 미검증, 이번 작업에서 무한 반복 조사하지 않음.
- D01–D27 source/Gate/API/UI 계약 분류 27/27. 이 수치는 운영 성공 27건 의미가 아니며, R3 원래 최종 종료에는 결함 F1–F4 전부 및 배포/UI 증거가 필요함.


## 13. 31 혼합 입력 주기 실함수 시뮬레이션 — 완료

- 실행: GitHub 최신 main에서 `lib/market-score/composite-model-r1.mjs`, `lib/market-score/consumption-r5.mjs` 원문을 읽어 V8 isolate에서 실제 함수(`buildCompositeMarketScore`, `calculateConsumptionR5`)를 원본 그대로 실행. 외부 API/PC/D1 호출·쓰기 0건.
- CM-R1 12개 domain `월간5/분기2/T+1 3/기타2` 정상 기본 50.000점. 분기2의 이전 유효점 그대로 유지하며 T+1 1축(breadth) 50→60 변경 시 50→50.8점 즉시 갱신, 이후 월간 소비 50→59.4667까지 추가 변경 시 51.4627점. 분기 earnings 신규 입력이 결측/PARTIAL이면 전체는 PARTIAL/null, 임의 재가중 없음. 0점은 READY 유효 처리.
- 실제 R5 저장 이력 fixture(2005–2026 월별+분기별)의 2026-10-30 월간 신규 공표 이벤트: 계산 전 2026-09-01 55.845833점 READY → 새 실제 이용 가능일 입력 후 2026-10-01 59.466667점 READY; 분기 가계 채무 지표 관측일은 둘 다 2026-07-01 유지. 완료월을 무조건 기다리지 않으며 마지막 허용 유효 분기 관측은 그대로 사용.
- **31 판정: SIMULATION_PASS**. 운영 실제 동일 사건의 D1 readback은 시험 대상이 아니며 별도 F4.

## 14. 32 완료월/완료분기/거래일/0/null/잠정 시뮬레이션 — 완료

- `lib/diagnostic-layer/stagflation-s21.mjs` 실함수: 8개 시계열/13개월 이력 fixture에서 2026-10 완성월 READY/78.048781점. 필수 PCEPI 신규월 누락은 PARTIAL/null, `OBSERVATION_MONTH_UNAVAILABLE`.
- `lib/diagnostic-layer/asset-bubble-r9-components.mjs` + `model.mjs` 실제 함수: 6요인 2026-Q2 READY/54점(0 요인도 유효), Q3 완성 READY/62.4점. Q3 시장폭 요인 누락 시 Q3 PARTIAL/null, Q2 당시 READY는 보존, Q3 확정 오표시 없음.
- `worker/korea-rev7-refresh.mjs` 실함수+메모리 store/fetch fixture: 2026-11-16 한국 20:22 KST `NO_TRADING_OBSERVATION`은 `WAITING_PUBLICATION`, 신규 저장 0·계산 false·기존 scoreDate 20261115 보존; 같은 요청일 공급자 SUCCESS 및 정상 계산 0점은 `COMPLETE`, 신규 1건 저장·scoreDate 20261116. 완성 거래일과 발표 지연 구분.
- `lib/market-score/earnings-e1-r5.mjs` + `earnings-e1-r5-production-domain.mjs` 실함수: 13요인 전부 0이면 READY/0, S13 결측은 PARTIAL/null, R5 자격 부족 시 기존 R4 score 유지. `rate-sentiment-freshness.mjs` 7일 허용·8일 지연 확인.
- `app/market-breadth-strip.tsx` 화면 source 신규 W06 수정: 금지 MarketParquet 확정/과거 그래프 fallback 제거, 기존 유효 IEX/SIP 잠정만 표시, 0/null 차트 위장 금지. 신규 source-level test 3종 수정했으나 **GitHub 전체 CI/Production UI 검증 미확인**, 시뮬레이션 PASS만 운영 배포로 보고하지 않음.
- **32 판정: SIMULATION_PASS**. 수정 이력·승인 구조 밖 원자료 변경 0건.


## 15. 33 실제 독립 결함군 통합 — 완료 (2026-11-16)

**집계 대상 27개 합계:** `DEFECT_SOURCE_ROUTE` **7개(D06/D07/D09/D10/D11/D12/D13)**, `DEFECT_DISPLAY_RETIRED_SOURCE` **1개(D03)**, `NOT_CONNECTED` **1개(D04 한국 등락 counts)**, `SOURCE_REVIEWED_RUNTIME_UNKNOWN` **18개** = 총 **27개**. 연결 미확인 18건을 성공 또는 실패로 가정하지 않음. D04는 갱신시점 결함이 아니라 기능 원담당 신규 연결 범위이므로 새 F군으로 만들지 않는다.

**확정 원인군 N=2, 총 34 + 4×2 = 42개 작업.** 기존 원인에 대한 기능별 중복 F군 금지.

| 원인군 | 영향 | 재현 F1 | 최소수정 F2 | 회귀 F3 | 운영 F4 |
|---|---|---|---|---|---|
| A · 기존 공개 projection 7개 detail GET 라우트 누락 | D06/D07/D09–D13 | PASS: 저장 D1 허용 키와 UI 소비 URL 존재·라우트 부재 | PASS: 기존 공용 storedProjectionResponse 7개 라우트 + TypeScript JSDoc 최소 연결, PR #1165 squash main `5bdaec2a…` | PASS: PR #1165 GitHub CI #43854770123 build/typecheck/regression | **UNKNOWN**: exact zgmini.kr Production SHA, D1 readback, 공개 7 API/UI 결과 미확인 |
| B · 퇴역 MarketParquet R2 값을 미국 등락 current/history로 계속 연결 | D03 | PASS: 금지 계약·confirmed-r2/history 503 대비 UI 과거값 fallback 및 R2 펼침 패널 재현 | PASS: `codex/ui-improvements`의 `app/market-breadth-strip.tsx` 수정 4268a679…; 기존 격리 브랜치 내 main 기반 최소 수정 | **9/9 source-level PASS, GitHub 전체 CI 아직 미완료**; 테스트 3종 수정, PR #1174 | **미완료**: PR main 병합·Cloudflare exact Production 배포·실제 미국/한국 카드 확인 필요 |

- B UI 소스는 기존 독립 IEX 현재 잠정만 사용하고, 아직 유효하지 않을 때 미국 미제공/—로 표시. 한국 counts/색상/높이 유지. 기존 전용 W06 브랜치에 있던 SIP 장전 잠정 코드는 보존하고, 최신 main 선택적 릴리스에는 미반영.
- PR #1174는 새 브랜치 생성/강제 push/rebase 없이 **이미 있던** `codex/ui-improvements-r3-inflation-route-20261116` 브랜치에 최신 main을 두 부모 merge commit `b4394a82445794abf80da0175ca6e8631c2213ac`으로 추가한 것. 이전 PR #1165의 9파일 blob이 main과 일치함을 직접 확인하고 main tree + 변경 4파일만 선택해 정상 fast-forward 하였으며, 실제 main 대비 diff 4파일만. Git 이력·타 작업 소스 보존.
- 해당 9개 회귀 단언을 원본 source 문자열에 대해 V8 isolate로 실행: **9/9 PASS**. GitHub 실제 Node CI 결과는 별도.
- **단계 33 결론:** 두 확정 root cause만 F1–F4 집계. F1/F2 A/B 각각 완료, F3 A PASS·B CI 미완료, F4 A/B 모두 운영 증거 미확인. 고정 34는 F4 후 최종 수치 정리에만 사용한다.
