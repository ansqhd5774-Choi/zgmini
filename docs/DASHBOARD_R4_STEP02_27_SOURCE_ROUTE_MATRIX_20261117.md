# ZGMINI R4 #02 — D01–D27 계산·저장·API·차트 27행 매핑

- 판정일: 2026-11-17 KST
- 개발 기준: `ansqhd5774-Choi/zgmini` `main@1f451fbd979af6b9a0a1a2a4b2f79db60f3ae22f` (source만 조회)
- 작업·증거 브랜치: `codex/ui-improvements`
- 근거: `docs/DASHBOARD_SCORE_UPDATE_UNIFICATION_R3_EXECUTION_20261116.md`의 27개 기존 ID/주기/소유, 최신 main 활성 소스 검증 13종(아래), R4 75단계 계획 #02
- 범위: **소스 계약 27행 식별**. 원격 운영 PC/SQLite/D1 row·Cloudflare 실배포의 동시 전진을 검증한 결과가 아니다. D01 공급자 점수는 자체 계산 점수로 위장하지 않음.

## 27개 연결표

| ID | 콘텐츠·형식 | 계산·수집/Reader 소스 | 공개 저장 키 | GET·점수 필드 | 화면·차트 컴포넌트 | 판정 |
|---|---|---|---|---|---|---|
| D01 | 미국 공포탐욕 / 점수 | `worker/public-feed-store.mjs` (CNN 검증 출력 보존) | `public_feed_snapshots_v1` output `fear-greed/current`; 이력 `fear-greed-observed/YYYY-MM-DD` | `/api/fear-greed`; `/api/fear-greed/observations` | `app/fear-greed/usa/cnn-panel.tsx` → `app/market-fear-greed-chart.tsx` | 계약 연결 |
| D02 | 한국 공포탐욕 / 점수 | `worker/korea-rev7-engine.mjs` → `worker/korea-funds.mjs` | `kfg_rev7_snapshots` (`date`,`methodology_version`,`composite_json`) | `/api/indicators/korea-funds` (`worker/index.ts` 직접 분기) | `app/korea-composite-view.tsx` → `components/korea-composite-plot.tsx` | 계약 연결 |
| D03 | 미국 등락 / 비율형 | `lib/market-breadth/us-provisional-r1.mjs` (IEX 15분 관측 비율) | `market_public_snapshots_v1` / `public:market-breadth-provisional-r1:usa` | `/api/market-breadth?market=usa&phase=provisional` | `app/market-breadth-strip.tsx` (상승·보합·하락·미관측, 점수 차트 아님) | 조회 경로 연결 / 신규 운영 게시 미검증 |
| D04 | 한국 등락 / 비율형 | `app/korea-composite-view.tsx`의 `showBreadth=false` 기본 | 독립 계산·저장 키 **없음(미연결)** | 독립 공개 GET **없음** | `app/korea-composite-view.tsx` → `app/market-breadth-strip.tsx` (미연결 시 표시하지 않음) | NOT_CONNECTED (허위 점수·비율 금지) |
| D05 | 미국 종합 / 점수 | `worker/market-score-r1.mjs` → `scripts/pc-writer/market.mjs` | `market_public_snapshots_v1` / `current`; 이력 `composite-observed:YYYY-MM-DD` | `/api/market-score` `overall`; `/api/market-score/observations` | `app/dashboard-ui.tsx` → `components/dashboard-summary-chart` (raw→3.5배 표시) | 계약 연결 |
| D06 | 인플레이션 위험 / 점수 | `worker/projection-builders/inflation.mjs`; `lib/diagnostic-layer/inflation-r2-stored.mjs` | `market_public_snapshots_v1` / `detail:inflation:v1` | `/api/inflation-detail` | `app/dashboard-ui.tsx` 위험카드; `app/inflation/inflation-panel.tsx` → `app/market-fear-greed-chart.tsx` | 계약 연결 |
| D07 | 경기침체 위험 / 점수 | `worker/projection-builders/recession.ts` | `market_public_snapshots_v1` / `detail:recession:v1` | `/api/recession-detail` | `app/dashboard-ui.tsx`; `app/recession/recession-panel.tsx` → `app/market-fear-greed-chart.tsx` | 계약 연결 |
| D08 | 스태그플레이션 위험 / 점수 | `lib/diagnostic-layer/stagflation-s21.mjs` → `worker/stagflation-public.mjs` | `market_public_snapshots_v1` / `detail:stagflation-risk:s21` | `/api/stagflation-risk-detail` | `app/dashboard-ui.tsx`; `app/stagflation-risk/stagflation-panel.tsx` → `app/market-fear-greed-chart.tsx` | 확정 S21 / 잠정 별개 |
| D09 | 신용 위험 / 점수 | `worker/projection-builders/creditRisk.ts` | `market_public_snapshots_v1` / `detail:credit-risk:v1` | `/api/credit-risk-detail` | `app/dashboard-ui.tsx`; `app/credit-risk/credit-risk-panel.tsx` → `app/market-fear-greed-chart.tsx` | 계약 연결 |
| D10 | 실적 침체 위험 / 점수 | `worker/projection-builders/earningsRecession.ts` | `market_public_snapshots_v1` / `detail:earnings-recession:v1` | `/api/earnings-recession-detail` | `app/dashboard-ui.tsx`; `app/earnings-recession/earnings-risk-only-panel.tsx` → `app/market-fear-greed-chart.tsx` | 계약 연결 |
| D11 | 자산 버블 위험 / 점수 | `worker/projection-builders/assetBubble.ts` | `market_public_snapshots_v1` / `detail:asset-bubble:v1` | `/api/asset-bubble-detail` | `app/dashboard-ui.tsx`; `app/asset-bubble/asset-bubble-panel.tsx` → `app/market-fear-greed-chart.tsx` | R10 후보/활성 구분 |
| D12 | 부채 위험 / 점수 | `worker/projection-builders/debtRisk.ts` | `market_public_snapshots_v1` / `detail:debt-risk:v1` | `/api/debt-risk-detail` | `app/dashboard-ui.tsx`; `app/debt-risk/debt-risk-panel.tsx` → `app/market-fear-greed-chart.tsx` | 계약 연결 |
| D13 | 공급 충격 위험 / 점수 | `worker/projection-builders/supplyShock.ts` | `market_public_snapshots_v1` / `detail:supply-shock:v1` | `/api/supply-shock-detail` | `app/dashboard-ui.tsx`; `app/supply-shock/supply-shock-panel.tsx` → `app/market-fear-greed-chart.tsx` | 계약 연결 |
| D14 | 경제 물가 / 점수 | `lib/market-score/inflation-legacy-public-domain.mjs` | `market_public_snapshots_v1` / `current.domains.inflation` | `/api/market-score` `domains[inflation]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D15 | 경제 고용 / 점수 | `lib/market-score/employment-r54-candidate.mjs` | `market_public_snapshots_v1` / `current.domains.employment` | `/api/market-score` `domains[employment]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D16 | 경제 금리 / 점수 | `lib/market-score/rate-r3.mjs` | `market_public_snapshots_v1` / `current.domains.rates` | `/api/market-score` `domains[rates]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D17 | 경제 채권신용 / 점수 | `lib/market-score/credit-r2.mjs` | `market_public_snapshots_v1` / `current.domains.credit` | `/api/market-score` `domains[credit]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D18 | 경제 경기 / 점수 | `lib/market-score/growth-r2-worker-domain-r1.mjs` | `market_public_snapshots_v1` / `current.domains.growth` | `/api/market-score` `domains[growth]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D19 | 경제 소비 / 점수 | `lib/market-score/consumption-r5.mjs` | `market_public_snapshots_v1` / `current.domains.consumption` | `/api/market-score` `domains[consumption]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D20 | 경제 기업실적 / 점수 | `lib/market-score/earnings-e1-r5-production-domain.mjs` | `market_public_snapshots_v1` / `current.domains.earnings` | `/api/market-score` `domains[earnings]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | E1-R4/R5 별개 |
| D21 | 경제 유동성 / 점수 | `lib/market-score/liquidity-active-public-domain-r1.mjs` | `market_public_snapshots_v1` / `current.domains.liquidity` | `/api/market-score` `domains[liquidity]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D22 | 경제 자금흐름 / 점수 | `lib/diagnostic-layer/open-resolution-r53-components.mjs` | `market_public_snapshots_v1` / `current.domains.fundFlows` | `/api/market-score` `domains[fundFlows]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D23 | 경제 수급·시장폭 / 점수 | `lib/market-score/breadth-b1-r5-reader.mjs` | `market_public_snapshots_v1` / `current.domains.breadth` | `/api/market-score` `domains[breadth]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | D03 IEX 비율과 독립 |
| D24 | 경제 달러환율 / 점수 | `lib/diagnostic-layer/open-resolution-r53-components.mjs` | `market_public_snapshots_v1` / `current.domains.dollarFx` | `/api/market-score` `domains[dollarFx]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D25 | 경제 원자재 / 점수 | `lib/market-score/public-domain-producers-r2.mjs` | `market_public_snapshots_v1` / `current.domains.commodities` | `/api/market-score` `domains[commodities]` | `app/dashboard-ui.tsx` `CardTrend`; `app/economic-indicators/economic-detail-panel.tsx` | 계약 연결 |
| D26 | 금리 심리 / 보조·연구 | `lib/market-score/rate-sentiment-r1-research.mjs` → `scripts/pc-writer/rate-sentiment-publication.mjs` | `market_public_snapshots_v1` / `public:rate-sentiment:v1` | `/api/rate-sentiment` | `app/outbreak-events.tsx` (독립 SVG 금리 심리 차트; 홈 25카드 아님) | 연구용/비승격 |
| D27 | 삭제된 진행 보조 / RETIRED | **재실행 금지** (삭제 콘텐츠 소스 재활성화 금지) | **비활성 / 새 저장 키 없음** | **폐기 범위 / 조회 재활성화 금지** | **화면 노출·차트 복원 금지** | RETIRED/OUT_OF_SCOPE |

## 계약 예외 및 완료 범위

1. **D03**: 공개 15분 잠정 경로의 소스/GET/UI 존재만 확인. 현재 장외 HTTP503은 정상일 수 있고, IEX 신규 자료의 실제 운영 게시 담당 연결·D1 최신 행은 미검증. 폐기된 MarketParquet confirmed/history 재도입 금지.
2. **D04**: 한국 등락 비율은 독립 ID·공개 저장키·GET이 아직 미연결임을 명시해 ‘없는 연결’을 정확히 식별했다. 한국 Rev7 공포탐욕 D02와 동일 점수로 대체하거나 0을 표시하지 않음.
3. **D05, D14–D25**: 모두 `current` 공개 저장을 공유하지만 D05는 `overall`, 경제 12개는 각각 `domains[id]`. D05 `composite-observed` 1D는 실제 계산 시각, 일자별 trend와 동치라고 가정하지 않음. 위험 R2와 경제 물가 R7 혼합 금지.
4. **D08**: S21 확정 저장점수와 별도 잠정 점수 계약 분리. **D26**은 H.15 연구용 금리 심리이고 FedWatch 확률/경제 금리 D16이 아님.
5. **D27**: 사용자 요청으로 삭제·RETIRED/OUT_OF_SCOPE. 기존 역사적 API/source 코드가 남더라도 활성 매핑·실행·복원 대상으로 취급하지 않음.
6. 전수 판정: **27/27 ID 분류**(미연결 D04 1, 퇴역 D27 1, 나머지 소스 조회 경로 25). `main` 소스 점검 13/13 PASS. 중복·가짜 신규 ID 0. 실제 신규 입력→계산→D1→Production 전수 27/27 PASS라고 주장하지 않음.

## 대표 소스 재조회·계약 검사 (2026-11-17)

- `worker/market-public-projection-store.mjs@52cc6cdc91107e646c7ae63bcaab6b7c0047a228`: 위험 7개 정확 `detail:*` key 존재 PASS (S21은 별도 키).
- `worker/stagflation-public.mjs@a90ba7e7ff0e2e8acc8ce39e6c9f6c93f9f3d1c1`: S21 key PASS.
- `worker/korea-funds.mjs@4f284339f9fd87e4207642f12815bcd2a694d997` + `worker/index.ts@590b02152f9739bdfe18782c9835eae2ce0d8fc9`: KRX Rev7 저장 테이블/실제 API 직접 분기 PASS.
- `app/dashboard-ui.tsx@4d905c98ff4e8268b2437ae69c699f7961a97baf` + `app/economic-indicators/economic-detail-panel.tsx@9baead4b3e531fa7736eba6d1c9bcfd633d5661d`: 12-domain + 8-diagnostic IDs, GET, 카드/종합·상세 차트 연결 PASS.
- `app/korea-composite-view.tsx@4705fa8b0355e9cdae41b34096adf9ed60dd5e48` + `app/market-breadth-strip.tsx@ede282d5e875ad8b4f7ba4c65d92b8801aaf0fcc`: D04 미연결·D03 비율형 UI 계약 PASS.
- `lib/market-breadth/us-provisional-r1.mjs@5c46f67cdd941b297f6b68b425de26bfcb13808d`: D03 잠정 공개 키 PASS.
- `worker/rate-sentiment-public.mjs@e80f45751713755083550f716fcadbbe121a600f` + `app/outbreak-events.tsx@c11485348dc3308fd5f88a877d8916bf659d966d`: 금리 심리 키·보조 화면 PASS.
- `app/fear-greed/usa/cnn-panel.tsx@7f571277a3cd5e8b00de3de76ab6d4e7ff1c1fe3` + `app/api/fear-greed/route.ts@af6210e567e320f1306e9a68d713c70c1f3c4d2b`: CNN 현재/관측 아카이브 읽기 PASS.
- `worker/projection-builders.ts@d07c02ece72c83510792bb20191389489b3f4e98`: 8대 위험 계산기 모듈 import 경로 PASS. 경제12 개별 계산기 상기 행의 `main` 존재 확인 PASS.

## #02 완료 판정

- #02는 **연결표 확정**을 요구하는 분석 단계이므로 27개 현행 상태를 정확히 분류·연결한 소스 증거로 DONE 가능. 미연결/퇴역을 활성 API로 꾸미지 않는다.
- **운영 실증 아님**: 25개 활성 조회 경로의 새 입력 실제 처리, SQLite↔D1 저장시각·Cloudflare active Deployment 및 UI 마지막점은 별도 계획 단계에서 계속 검증.
- 변경 내용: 문서 1파일, 기능 소스·수집기·계산기·Writer·DB·D1·예약·Cloudflare 0건.
