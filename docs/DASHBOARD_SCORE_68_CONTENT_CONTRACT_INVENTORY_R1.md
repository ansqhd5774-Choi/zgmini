# ZGMINI 68개 논리 콘텐츠 계약·공개 상태 전수 인벤토리 R1

- 조사 기준일: 2026-11-10 KST. 공개 웹 관측 약 05:41 KST.
- 작업 저장소/브랜치: ansqhd5774-Choi/zgmini / codex/ui-improvements.
- 개발 소스 기준: zgmini 최신 main의 해당 시점 코드. 현행 PC 승인 설치 SHA·Cloudflare 배포 SHA와 같음을 증명하지 않음.
- 상위 기준: docs/DASHBOARD_SCORE_DAILY_UPDATE_STANDARD_R1.md, docs/DASHBOARD_DAILY_SCORE_EXECUTION_PLAN_R1.md.
- 목적: **논리 콘텐츠 27+11+30=68개를 누락·중복 없이 식별**하고, 현재 공개 상태와 소스 계약을 정밀히 분리한다. 항목 식별 68/68과 1단계 완료 68/68은 다르다.
- 방법: GitHub main 소스·기존 계약 + 실제 공개 페이지·API 읽기 전용 확인. PC 원장·SQLite·D1 직접 readback·현행 설치 SHA 검증 미실시. 계약·운영 상태를 완성 또는 최신으로 추정하지 않는다.

## 1. 조사 대상과 분자/분모

| 구분 | 논리 항목 | 조사 ID 확인 | 별도 공개 기능 | 관측 공개 상태 |
|---|---:|---:|---|---|
| 대시보드 관련 | 27 | 27 | 홈 본문 25 + 금리심리·이란 보조 2 | 홈 25 중 유효 수치/비율 표시 24, 한국 등락 미연결 1; 보조 2의 실시간 READY는 추가 확인 필요 |
| 섹터 | 11 | 11 | 11개 섹터 모델/ETF | 11/11 점수 노출, 화면 기준일 2026-11-06; PC 원장·D1 직접 검증 별도 |
| 테마 | 30 | 30 | 카탈로그 등록 10 / 미등록 20 | 공개 테마 점수 0/30; API STORED_DATA_STALE |
| **총합** | **68** | **68** | 단일한 “68개 점수” 구조가 아님 | 날짜·최신성·실제 게시에 대한 후속 인과 검증 필요 |

주의: 미국·한국 등락은 0~100 단일 공포탐욕 점수가 아니라 상승·보합·하락 백분율이다. 금리심리·이란은 메인 대시보드 본문 25개 카드에 포함되지 않는다. 테마 30은 카탈로그의 분모이며 공개/운영 등록의 분모와 분리한다.

## 2. 대시보드 관련 27개 ID별 매핑

- 표의 “입력/시점”은 계산 계약 소스가 드러내는 주기·READY 조건을 축약한 것이며, **원자료 전체 시계열 수 / 실제 PC 설치판**과 동치가 아니다.
- “화면값”은 2026-11-10 KST 당시 브라우저가 실제 표시한 참고 관측값이다. 독립 D1 조회나 현재 시점 값의 보증이 아니다.
- 직접 API 확인: /api/market-score의 raw overall.score = 47.31583029213547 (asOfDate 2026-11-09), 화면 종합 40.6. 이는 승인된 화면 표시 변환 50+(raw−50)×3.5 → 40.605이므로 **서로 다른 표시 계약이지 불일치가 아니다**.

| 감사ID | 논리 콘텐츠 · 코드 ID | 활성 구성/주기·중요 Gate | 공개 API / 소스 계약 | 당시 공개 관측 |
|---|---|---|---|---|
| D01 | 미국 공포탐욕 · CNN 관측점수 | CNN 관측발표 기준; PC checkedAt와 observedAt 구별 | /api/fear-greed, /api/fear-greed/observations · cnn-observed-archive-r1 | 31.9, 표시일 11-10 |
| D02 | 한국 공포탐욕 · ZGMINI_KR_FG_CNN_R7 | KRX 거래일; 7개 동일가중 요인; 과거는 RECONSTRUCTED_CURRENT_VINTAGE, PIT 검증 아님 | /api/indicators/korea-funds · kfg_rev7_* | 16.7, 기준일 11-06 |
| D03 | 미국 등락 · public:market-breadth-r1:usa | IEX 약15분 잠정/MarketParquet 거래일 확정 R2 별도; 확정 커버리지 확인 | /api/market-breadth, /api/market-breadth-r2-history | 10-30 확정: 상승26.4%·보합5.8%·하락67.8% |
| D04 | 한국 등락 · 공개 독립 ID 미확인 | 한국 카드 counts 입력 미연결; 0~100 점수 아님 | app/korea-composite-view.tsx → market-breadth-strip.tsx | **연결 예정 / 수치 없음** |
| D05 | 미국 종합 · CM-R1 overall | 경제 12/12 READY, 가중치 100%; 과거 CURRENT_VINTAGE_ONLY 일부 재구성; 화면변환 3.5 | /api/market-score · market_public_snapshots_v1:current | 원점수47.3158 / 화면40.6 |
| D06 | 인플레이션 위험 · inflationStability | 근원PCE·근원CPI·전체CPI·기대물가 4요인, 월간 중심 | /api/inflation-detail · 진단/별도 detail | 59 |
| D07 | 경기침체 위험 · recessionDefense | NFP·GDP·IP·실질PCE·Sahm·소매·가처분소득 7요인; 월·분기 혼합 | /api/recession-detail | 44 |
| D08 | 스태그플레이션 위험 · stagflationSafety | 별도 S21: 공통 13개월 확정/최신 잠정 구분; 기본 diagnostics8의 제3항 아님 | /api/stagflation-risk-detail · detail:stagflation-risk:s21 | 73 |
| D09 | 신용 위험 · creditRiskDefense | HY·IG·종합 CMDI·채권변동성 4요인; 시장/신용 혼합 | /api/credit-risk-detail | 72 |
| D10 | 실적 침체 · earningsRecessionDefense | EPS·마진·매출·확산 4요인; 완료분기/재구성 구분 | /api/earnings-recession-detail | 85 |
| D11 | 자산 버블 · assetBubbleSafety | 6요인 V/P/H/F/B/L; 30/20/15/10/15/10; 완료분기만 확정 | /api/asset-bubble-detail | 23, 표시분기 2026-Q2 |
| D12 | 부채 위험 · debtRiskSafety | BIS DSR·부채/GDP 등 5요인; 저빈도 혼합 | /api/debt-risk-detail | 72 |
| D13 | 공급 충격 · supplyShockSafety | GSCPI·WTI·휘발유·구리·IP·CPI괴리 6요인; 혼합 | /api/supply-shock-detail | 36 |
| D14 | 물가 · inflation | 과거 R2 축수/현행 입력 판본 혼재; 월간 중심, 기대물가 별도; 활성 원천 수 미확정 | /economic-indicators/inflation/ · /api/market-score domains | 54 |
| D15 | 고용 · employment | 4개 점수요인; BLS 월간 + DOL 주간; 29개 R6 상세지표와 구분 | /economic-indicators/employment/ · domains | 43 |
| D16 | 금리 · rates | 정책·2년·10년 실질·10Y–3M 4요인; 일별+정책 비정기 | /economic-indicators/rates/ · domains | 16 |
| D17 | 채권·신용 · credit | HY/IG CMDI·NFCI 신용·채권변동성 4요인; 주기 혼합 | /economic-indicators/credit/ · domains | 69 |
| D18 | 경기 · growth | G16 필수24요인; 월간 중심/혼합; 세부 발표일 대조 미완 | /economic-indicators/growth/ · domains | 59 |
| D19 | 소비 · consumption | 현행 R5 D/Y/L/H/B 5축; 옛 C1-R3 95→7축 아님; 월간 중심 | /economic-indicators/consumption/ · domains | 37 |
| D20 | 기업실적 · earnings | R4 4요인·R5 13요인 코드 병존; 현재 PC 활성버전 미확정; 분기 중심 | /economic-indicators/earnings/ · domains | 76 |
| D21 | 유동성 · liquidity | 준비금·M2·TGA·ON RRP 표시 입력 4종; 일·주·월 혼합 | /economic-indicators/liquidity/ · domains | 47 |
| D22 | 자금흐름 · fundFlows | 순유입·모멘텀·인덱스 동반·환매압력 4요인; 실제 공급자 공표주기 미확정 | /economic-indicators/fund-flows/ · domains | 38 |
| D23 | 수급·폭 · breadth | 상승수·상승대금·5일EMA·20일EMA 4요인; 거래일 기반, 별도 오버레이 주의 | /economic-indicators/breadth/ · domains | 52 |
| D24 | 달러·환율 · dollarFx | 달러지수 수준·20/60일 모멘텀·20일 변동성 4요인; 영업일 | /economic-indicators/dollar-fx/ · domains | 39 |
| D25 | 유가·원자재 · commodities | WTI·Brent·구리·미국 휘발유 4요인; 시장/주/월 혼합 | /economic-indicators/commodities/ · domains | 16 |
| D26 | 금리 심리 · public:rate-sentiment:v1 | DGS2·DGS3MO·DGS10, 일별 H.15 + 4요인 점수, 관측 7일 경과 STALE | /api/rate-sentiment · 별도 보조 콘텐츠 | 홈 본문 카드 아님; 공개값 실측 미확인 |
| D27 | 이란 위험 진행 · public:iran-progress:r13 | 뉴스/사건 비정기, observationAt/verified/calculated/published 구별; R13 기존 예약 승인 제거 | /api/iran-progress · 별도 보조 콘텐츠 | 홈 본문 카드 아님; 공개값 실측 미확인 |

### 위험 목록의 필수 이중 계약

- /api/market-score에 기본 계산·저장되는 diagnostics8의 3번째는 **liquidityCrisisDefense (유동성위기)**.
- 메인 화면에 노출되는 위험 8의 3번째는 **stagflationSafety (스태그플레이션)**. UI가 /api/stagflation-risk-detail에서 별도로 가져오는 점수다.
- 숨겨진/별도 유동성위기 진단은 /api/liquidity-crisis-detail 및 detail:liquidity-crisis:v1로 추적한다. D01–D27의 **메인 노출 8개를 유동성위기 포함 기본 8개로 대체 집계하지 않는다**.
- 위험진단 8의 점수를 바꾸더라도 CM-R1 12개 경제 영역 종합의 가중치가 바뀌지 않는 계약이다. 출처: lib/diagnostic-layer/diagnostic-assembly.mjs, app/dashboard-ui.tsx, tests/stagflation-composite-isolation.test.mjs.

## 3. 섹터 11개 별도 모델 — S01–S11

- 동일 모델 R3: 추세·시장폭·수요·상대강도·변동성 **5축**, 세부 14개 지표 (3/3/2/3/3); 축별 가중 4/4/3/3/3 (합17).
- 주요 입력: 섹터 ETF+SPY+PIT 구성종목, 미국 거래일의 일별 종가. 확정 거래일 약 252개, 참조 데이터 756개 계약. 잠정 PROVISIONAL/확정 CONFIRMED은 별도.
- 공통 계산/로컬: scripts/pc-writer/sector-fear-greed-r3-rolling-local.mjs, sector-fear-greed-r3-local-cycle.mjs; 로컬 core.sqlite.
- 공통 공개: feeds sector-fear-greed-r3 / sector-fear-greed-r3-provisional → D1 public_feed_snapshots_v1 → GET /api/sector-fear-greed → UI /sector-fear-greed/ (sector-detail-charts.tsx).
- 실제 브라우저 11/11 노출, 점수 기준 거래일 **2026-11-06**, 당시 점수는 아래. 8일 stale 계약과 신규 자료의 반영 여부는 별도 검증.
- 동일 확정 거래일의 수정값을 SAME_DATE_SCORE_DRIFT로 거부하는 보호 검사 존재. 정정 revision 설계 없이 assertion을 삭제하거나 중복 게시하면 안 됨.

| 감사ID | 섹터 | 모델 ID | ETF | 11-06 화면 점수 |
|---|---|---|---|---:|
| S01 | 정보기술 | technology | XLK | 18.6 |
| S02 | 커뮤니케이션 | communication | XLC | 33.2 |
| S03 | 경기(임의)소비재 | discretionary | XLY | 71.0 |
| S04 | 산업재 | industrials | XLI | 25.7 |
| S05 | 금융 | financials | XLF | 52.7 |
| S06 | 유틸리티 | utilities | XLU | 66.1 |
| S07 | 헬스케어 | healthcare | XLV | 72.5 |
| S08 | 소재 | materials | XLB | 62.6 |
| S09 | 에너지 | energy | XLE | 25.9 |
| S10 | 필수소비재 | staples | XLP | 68.6 |
| S11 | 부동산 | realEstate | XLRE | 55.2 |

## 4. 테마 카탈로그 30개 — T01–T30

- UI 카탈로그 근거: components/market-explorer-catalog.ts의 4개 그룹 10+6+8+6 = 30.
- 운영 등록 근거: config/theme-data-registry.json의 **10개 등록, 20개 미등록**. 기록의 verifiedAt은 과거 확인시점이며 오늘의 PC 적용·공개 성공 증거가 아님.
- 테마 R1 모델은 등록 항목의 ETF 2종+SPY 일별 close 약252거래일, ETF_ONLY_T40_R20_V40_PAIR50; 공급자별 지연/권리 조건 존재.
- 기본 GET /api/theme-fear-greed는 D1 public:theme-etf-only:r1 및 feed theme-etf-only-rolling을 읽고, AI/바이오/데이터센터 sidecar를 연결할 수 있음. 방문자 호출 시 수집/계산하지 않음.
- **실제 공개 응답:** /api/theme-fear-greed → {"status":"UNAVAILABLE","reason":"STORED_DATA_STALE","themes":[]} (2026-11-10 약05:41 KST), 화면 /theme-fear-greed/에서 “테마 데이터 대기”. **공개 0/30**.
- 아래 “등록”은 운영 등록부에 ID가 있다는 뜻이며 READY·게시 성공 뜻이 아님. 미등록 항목에는 가상의 운영 ID나 ETF 쌍을 만들지 않음.

| 감사ID | 그룹 | 카탈로그 항목 | 등록 ID | 등록부 기록 | 현재 공개 |
|---|---|---|---|---|---|
| T01 | AI·디지털 | AI 반도체 | ai-semiconductor | 등록·legacy | 공개 점수 없음 |
| T02 | AI·디지털 | 데이터센터·전력 | data-center-power | 등록·PC 점수 확인 기록/게시 대기 | 공개 점수 없음 |
| T03 | AI·디지털 | 양자컴퓨팅 | 미등록 | 미등록 | 공개 점수 없음 |
| T04 | AI·디지털 | 사이버보안 | cybersecurity | 등록·legacy | 공개 점수 없음 |
| T05 | AI·디지털 | 블록체인·디지털자산 | 미등록 | 미등록 | 공개 점수 없음 |
| T06 | AI·디지털 | AR·VR | 미등록 | 미등록 | 공개 점수 없음 |
| T07 | AI·디지털 | 데이터센터 액체냉각 | 미등록 | 미등록 | 공개 점수 없음 |
| T08 | AI·디지털 | 실리콘 포토닉스 | 미등록 | 미등록 | 공개 점수 없음 |
| T09 | AI·디지털 | 핀테크 | fintech | 등록·legacy | 공개 점수 없음 |
| T10 | AI·디지털 | 클라우드·SaaS | cloud-saas | 등록·legacy | 공개 점수 없음 |
| T11 | 산업·모빌리티 | 로봇·자동화 | robotics | 등록·legacy | 공개 점수 없음 |
| T12 | 산업·모빌리티 | 우주·위성 | 미등록 | 미등록 | 공개 점수 없음 |
| T13 | 산업·모빌리티 | 자율주행 | autonomous-driving | 등록·legacy | 공개 점수 없음 |
| T14 | 산업·모빌리티 | 드론·UAM | 미등록 | 미등록 | 공개 점수 없음 |
| T15 | 산업·모빌리티 | 휴머노이드 | 미등록 | 미등록 | 공개 점수 없음 |
| T16 | 산업·모빌리티 | 방산 | defense | 등록·legacy | 공개 점수 없음 |
| T17 | 에너지·자원 | 원전·SMR | nuclear-smr | 등록·legacy | 공개 점수 없음 |
| T18 | 에너지·자원 | 전고체 배터리 | 미등록 | 미등록 | 공개 점수 없음 |
| T19 | 에너지·자원 | 수소 | 미등록 | 미등록 | 공개 점수 없음 |
| T20 | 에너지·자원 | 태양광 | 미등록 | 미등록 | 공개 점수 없음 |
| T21 | 에너지·자원 | 핵융합 | 미등록 | 미등록 | 공개 점수 없음 |
| T22 | 에너지·자원 | 탄소포집 | 미등록 | 미등록 | 공개 점수 없음 |
| T23 | 에너지·자원 | 희토류·핵심광물 | 미등록 | 미등록 | 공개 점수 없음 |
| T24 | 에너지·자원 | 자원 재활용 | 미등록 | 미등록 | 공개 점수 없음 |
| T25 | 헬스케어·소비 | 바이오·신약 | biotech | 등록·R7 검증 이력/PC 컷오버 대기 | 공개 점수 없음 |
| T26 | 헬스케어·소비 | 의료기기 | 미등록 | 미등록 | 공개 점수 없음 |
| T27 | 헬스케어·소비 | 디지털헬스 | 미등록 | 미등록 | 공개 점수 없음 |
| T28 | 헬스케어·소비 | AI 신약개발 | 미등록 | 미등록 | 공개 점수 없음 |
| T29 | 헬스케어·소비 | K-콘텐츠·드라마 | 미등록 | 미등록 | 공개 점수 없음 |
| T30 | 헬스케어·소비 | 게임·e스포츠 | 미등록 | 미등록 | 공개 점수 없음 |

## 5. 원자료→현재값→일별 이력의 공개 계보

| 영역 | 로컬/공통 Writer | D1 공개 키/형태 | 공개 API/화면 | 이력·기준 주의 |
|---|---|---|---|---|
| 경제12+CM-R1 | PC 원자료 SQLite, 저장 자료 계산, scripts/pc-writer/publish.mjs | market_public_snapshots_v1의 current + UTC 날짜 UPSERT | /api/market-score, 메인·경제 상세 | 원관측일·sourceVersion·calculatedAt·publishedAt 분리. UTC 동일일 UPSERT는 당시 확정 이력 불변 보존의 증거가 아님 |
| 노출 위험8 | 기본 diagnostics8 + detail 별도 projection | market_public_snapshots_v1 및 세부 detail 키 | 위험 상세 8개 | 기본 유동성/별도 스태그 교체 주의; 완료월·완료분기/잠정값 혼용 금지 |
| CNN 미국 공탐 | 관측 archive | 공개 관측 시각 저장 feed | /api/fear-greed, /observations | 관측일≠PC 확인시각 |
| 한국 공탐 | KRX 거래일 R7 | kfg_rev7_* | /api/indicators/korea-funds | 과거 RECONSTRUCTED_CURRENT_VINTAGE이며 당시 실제 확정 역사로 표시 금지 |
| 미국 등락 | provisional IEX / confirmed MarketParquet | public:market-breadth-r1:usa | /api/market-breadth, r2-history | 잠정/확정·S&P500 실제 구성 커버리지와 원거래일 분리 |
| 한국 등락 | UI counts 미연결 | 검증 가능한 게시 key 미확정 | 한국 메인 strip | 미연결이므로 score DONE 아님 |
| 금리 심리 | H.15 입력과 저장 점수 | public:rate-sentiment:v1 | /api/rate-sentiment | 공식 FedWatch 확률이 아니며 최신 관측일 점검 필요 |
| 이란 진행 | 비정기 사건 점수; R13 작업 승인 제거 | public:iran-progress:r13 | /api/iran-progress | 과거 R13 예약 임의 복원 금지, as-published 이력 |
| 섹터11 | sector-fear-greed-r3-local-cycle.mjs | public_feed_snapshots_v1의 confirmed/provisional | /api/sector-fear-greed, 섹터 화면 | 11/06 당시 표시, SAME_DATE_SCORE_DRIFT 무단 완화 금지 |
| 테마30 | 등록부10/미등록20, ETF R1 저장자료 계산 | public:theme-etf-only:r1, theme feed 및 일부 sidecar | /api/theme-fear-greed, 테마 화면 | 데이터 stale로 현재 0/30, 카탈로그 등록≠공개 성공 |

## 6. 미해결 사항 — 원인/분모를 정확히 구분

| 우선 | 발견된 문제/미확인 | 현재 증거 | 다음 최소 확인 |
|---|---|---|---|
| P0 | 한국 등락 카드 미연결 | 소스에서 counts 없이 렌더, 실웹 '연결 예정' | 기존 승인 소스·원장에 KR 등락 공개 계산/게시 경로가 실제 존재하는지 확인; 새 숫자 임의 생성 금지 |
| P0 | 테마 API 전체 stale | public API STORED_DATA_STALE, 등록10/미등록20 | 각 등록 항목의 유효 원자료/게시 source와 만료 이유를 구분; 20개 신규 구현은 별도 의존 업무 |
| P1 | 기본 위험8 vs UI 노출 위험8 불일치 | 기본 3번째 liquidityCrisisDefense, 화면 3번째 stagflationSafety | 각각의 계산/저장·관측일·화면 선택 근거 개별 증거 확보 |
| P1 | 미국 등락 확정 시각 지연 가능성 | 화면 확정 10-30, 브라우저 11-10 | confirmed/provisional checkpoint·마지막 정상 게시 원장 및 공식 거래일 비교 |
| P1 | 일별 당시 확정 이력의 불변성 미입증 | composite 현재-빈티지 재구성, UTC 날짜 UPSERT, KR FG reconstructed | 기존 archive 원문과 동일일 다회 기록/정정 revision 보존 범위를 대조 |
| P1 | 섹터 같은 날짜 소스 정정 처리 | SAME_DATE_SCORE_DRIFT 보호식 존재 | 원본 보호하면서 별도 승인된 revision/supersedes 설계 |
| P1 | 물가·소비·기업실적 과거 모델/현행 모델 병존 | 과거 docs/CONTENT_HELP_COUNTS.md와 최신 계산기 요인 수 불일치 | 현행 PC 승인 source SHA와 활성 계산기/원천 series 수 비교 |
| P1 | 원관측→저장→계산→D1→API/UI 지연 실제 측정 미완 | 현재 웹·source만 확인, PC/D1 원장 미조회 | 같은 checkpoint를 가진 A급 승인 read-only 결과/원장 조회 |
| P2 | 금리심리·이란 별도 보조 화면의 실측 | 독립 API path 소스 확인, 현재값 미수집 | 각 공개 GET의 현재 sourceVersion/observedAt/status 확인 |

## 7. 1단계 판정과 다음 실행

- **ID/카탈로그 전수 식별:** D 27/27 + S 11/11 + T 30/30 = **68/68 (100%)**. 각 항목에 고유 감사 식별자 부여.
- **운영 등록 분리:** 테마 10/30 등록, 20/30 미등록. 공개 테마 점수 0/30.
- **1단계 전체 PASS 판정:** **미완료**. 입력 시계열 실제 원천 개수/발표주기, 현행 PC 운영 source SHA, 로컬 키·checkpoint 및 D1 live readback의 68개 행별 증거 미확정. 15% 배점 전체를 이미 얻었다고 보고하지 않음.
- **실구현 전체 진행률:** 계획서의 7단계 가중 증거가 완비되기 전까지 **산정 보류**. 소스 항목 수/웹 숫자를 임의로 전체 완료율로 환산하지 않는다.
- **이번 변경:** 신규 문서만 추가; 산식/가중치/READY/DB/API/TTL/스케줄/운영 source/실웹 0건 변경.
- **다음 필수 실행 1건:** 현행 PC 승인·설치 SHA 및 기존 계산/Writer 원장의 **읽기 전용** 증거를 기존 A급 고정 operation 범위 내에서 조회, 경제·위험·섹터·테마 중 실제 게시된 항목의 sourceVersion/관측일/계산·게시시각을 동일한 기준으로 측정한다. 미설치 operation을 임의 실행하지 않는다. 실제 DB 계약 또는 정정 쓰기가 필요하면 범위 산정 후 승인 전에는 시행하지 않는다.

## 8. 주요 확인 소스

- app/dashboard-ui.tsx; app/korea-composite-view.tsx; app/market-breadth-strip.tsx; lib/economic-detail-catalog.ts; components/market-explorer-catalog.ts.
- lib/market-score/composite-model-r1.mjs; lib/market-score/composite-display-sensitivity-r1.mjs; lib/diagnostic-layer/diagnostic-assembly.mjs; tests/stagflation-composite-isolation.test.mjs.
- scripts/pc-writer/publish.mjs; worker/market-operational-store.mjs; app/api/market-score/route.ts.
- lib/market-score/sector-fear-greed-r3-public.mjs; scripts/pc-writer/sector-fear-greed-r3-local-cycle.mjs.
- config/theme-data-registry.json; app/api/theme-fear-greed/route.ts; app/theme-fear-greed/theme-explorer.tsx.
- PC 정본: ansqhd5774-Choi/zgmini-pc-control main의 AGENTS.md, docs/GENERAL_CHAT_START.md, docs/PC_AUTOMATION_STANDARD.md. 과거 성공 사례는 관측 시점/범위 내 재사용; 현재 PC·Cloudflare SHA는 추정하지 않는다.


## 9. 재사용한 PC 실증 원장 — 현재/과거 증거의 범위

이번 조회는 **새 pc-job를 생성하지 않고** 기존 고유 요청의 원격 결과 JSON을 직접 재검증했다.

| 원본 요청/관측(KST) | 확인된 사실 | 판단 범위 | 미증명 |
|---|---|---|---|
| zgmini-pc-control #1127, 2026-11-10 05:03 | A급 core-runtime-source-readonly, Run 42689236967, status STATE_UNKNOWN, code CORE_NO_ACTIVE_TASK_ENGINE. 당시 승인 config source SHA 4273137a85adcc90c863a27f703baa749b05cb64, 요청 개발 SHA b23550194cba6be5c311e000b097ed425edcb3d0, Controller 실행 SHA badad9124157879d7a645b64f2768113d632355b. lastPass ALLOWLISTED_WORKER_STARTED, firstFail ALLOWLISTED_OPERATION. | 읽기 전용 요청이 수행됐고 **그 순간 활성 task engine 프로세스가 확인되지 않음**. 운영 쓰기0. | Core가 항상 꺼져 있다/수집 실패/DB 손상이라는 의미가 아님. runtimeSourceVerified=false, **실제 실행 중인 Core source SHA는 아직 UNKNOWN**. |
| zgmini-pc-control #943, 2026-11-09 00:07 | A급 writer-publication-evidence-readonly, Run 42493168212, PASS ER1_WRITER_METADATA_READONLY. Writer source 165ca9ebbacf1782f7535aa6a8a3e9cfea80df44, 로컬 출력 해시=해당 D1 key 해시, perKeyReadback VERIFIED, matchedToLocal=true. | **시장캘린더 ER1 2026-11 공개 key 하나에 대한** 11/08 실제 Writer 게시 시점 readback 재사용. | 68개 점수 전체의 갱신 증거 아님. productionVerified=false, publicApiUiVerified=false. |

- 원본 JSON: zgmini-pc-control/main/results/42689236967-1-seat-1.json 및 results/42493168212-1-seat-1.json (GitHub blob fetch 일치).
- 공통 조정 #68의 2026-11-10 상태 기준, Controller #917 RECOVERY_REQUIRED는 Controller 전환·동일 lease 설치 범위에 영향. 독립 A/Reader·개별 소스 조사 전체에 전역 BLOCKER로 확장하지 않는다.
- 개발 소스 main, PC 승인 config SHA, 실제 실행 프로세스 SHA, Writer source SHA, Cloudflare 배포 SHA는 **서로 다른 식별자**다. 위 두 사례의 SHA를 68개 점수의 현행 운영 버전으로 치환하지 않는다.
- 단계1 잔여: 다음에 독립적 기존 기능 담당의 공개 sourceVersion과 저장 checkpoint·실제 관측일을 source 범위별로 대조한다. #1127 무조건 재발행 금지. 활성 task engine 부재 시 조회 불확정 결과를 보존하고 다른 독립 검증을 진행한다.
