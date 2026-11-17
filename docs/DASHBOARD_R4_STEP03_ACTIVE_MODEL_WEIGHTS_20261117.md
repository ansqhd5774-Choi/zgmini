# ZGMINI R4 #03 — D01–D27 활성 산식/요인 수/고정 가중치/READY 계약 감사

- 검사일: 2026-11-17 KST. 공식 R4 75단계 계획서 **#03** ("10개 지표는 예시, 실제 각 산식의 지표 수·가중치·필수요건은 활성 소스 기준"). 
- 기준 개발 `ansqhd5774-Choi/zgmini main@1f451fbd979af6b9a0a1a2a4b2f79db60f3ae22f`, 증거 브랜치 `codex/ui-improvements`. 실제 PC 운영 승인 source/Cloudflare Production SHA는 독립 확인 과제 #01/#75이며 본 파일이 그 검증을 대체하지 않는다.
- **작업 중 main drift 검증:** 최신 `main@2aa9cd28053c03be8fb34cbc87794e59f566cbde`와 출발 `1f451fbd...` GitHub compare: 정확 1커밋, `scripts/pc-writer/inflation-a401-baseline23-readonly.mjs`·`tests/inflation-a401-baseline23-readonly.test.mjs` 2개 신규 W01 읽기 전용 파일. 본 #03 계산기/가중치·UI/저장 계약 파일 수정 **0개**, 소스 가중치 21/21 기존 증거 재사용. 새 main SHA는 배포·실PC 승인 SHA가 아니다.
- #02 [27행 경로 확인](DASHBOARD_R4_STEP02_27_SOURCE_ROUTE_MATRIX_20261117.md) + #06 [READY/TTL/권리 게이트](DASHBOARD_R4_STEP06_INPUT_ACCEPTANCE_GATES_20261117.md) 증거를 재사용했고, 각 계산기 상수·함수의 명시 요인 수/가중치를 최신 main에서 별도로 읽었다.
- **검사 분리:** D01은 외부 CNN 발행값, D03/04는 상승/하락 비율 콘텐츠(점수 가중 합산 아님), D08 S21은 비선형 위험모형, D27은 삭제 콘텐츠. 10개 예시를 도메인 계산 수로 승격하지 않는다.
- **단위 주의:** 수치 weight 0.30은 30%, CM-R1/소비 축 상수는 30처럼 백분율로 쓰인다. 한 도메인의 0~100 점수와 전체 CM-R1의 12-domain 가중치를 혼합하지 않는다. D18 G16은 24개 차등 가중과 3축 구조, D19 소비는 13요인과 보조 2개(0점수), D20 경제 실적 R5는 13요인, D10 실적 침체 위험은 독립 4요인이다.

## 27개 활성 계산 계약 및 예외

| ID | 콘텐츠·모델 | 실제 요인 수·형식 | 승인 소스 가중치 | READY/결측·활성 Gate | 검증 파일 |
|---|---|---|---|---|---|
| D01 | CNN 미국 공포탐욕 | CNN 제공 총점/구성 요소, ZGMINI 자체 10요인 합산 없음 | 로컬 승인 재가중치 없음 (외부 발행 값) | 검증된 공급자 `observedAt`/저장 점수만 인정, checkedAt 별개 | `worker/public-feed-store.mjs`; `app/fear-greed/usa/cnn-panel.tsx` |
| D02 | KR Rev7 공포탐욕 | 7요인: momentum/strength/breadth/putCall/volatility/safeHaven/junkBond | 동일 1/7씩 (합100%) | 7/7 수치 유효·완료 KRX 거래일, WARMUP·7일 관측 지연 STALE 구별. researchOnly=true | `worker/korea-rev7-engine.mjs`; `worker/korea-funds.mjs` |
| D03 | 미국 장중 등락 IEX 잠정 | 상승/보합/하락 3분류 + 미관측 별도 1분류; 점수 산식 아님 | 등락 비율 분모는 기대 종목수; 점수 가중치 없음 | 정규장 15분 완료 슬롯, 30분 이내 관측; IEX 공개권 미확보 | `lib/market-breadth/us-provisional-r1.mjs` |
| D04 | 한국 등락 | 미연결: 계산 산식·요인·저장 키 없음 | 없음 | `showBreadth=false`; 다른 점수로 대체하지 않음 | `app/korea-composite-view.tsx` |
| D05 | CM-R1 미국 종합 | 12개 독립 도메인 (D14~D25) | 8/7/10/10/8/7/13/10/8/8/5/6 % =100 | 12/12 READY·coverageWeight=100. 하나라도 빠지면 overall PARTIAL/null, 재가중 0 | `lib/market-score/composite-model-r1.mjs` |
| D06 | 인플레이션 위험 R2 | 저장 입력 16종을 사용한 독립 최종 7개 축 | 최종 7축 균등 1/7 (원시 16개를 동일 가중으로 합산하는 방식 아님) | 7/7 유효, 초기발표 PIT 및 PC1 저장 계약. 축 결측이면 PARTIAL/null | `lib/diagnostic-layer/inflation-r2-stored.mjs`; `worker/projection-builders/inflation.mjs` |
| D07 | 경기침체 위험 R13 | 7요인 NFP/GDP/IP/실질PCE/실업/Sales/소득 | 25/15/15/15/10/10/10 % =100 | 7/7 유효, 완료 월·분기와 현재 vintage 구분, 누락 시 PARTIAL/null | `lib/diagnostic-layer/model.mjs:recessionDefense`; `lib/diagnostic-layer/recession-r13-components.mjs` |
| D08 | 스태그플레이션 S21 | 8개 입력 시계열 → 10개 신호 → 5개 파생 축 (비선형) | 정적인 5축 합산 비율 없음: 월별 J 위험을 (13J_t+J_(t-1)+J_(t-2))/15로 시차 평활 | 120개월 reference+연속 13개 완료월, S21 확인·게시 승인 검증, 잠정 별개 | `lib/diagnostic-layer/stagflation-s21.mjs`; `worker/stagflation-public.mjs` |
| D09 | 신용 위험 | 4요인 HY CMDI/IG CMDI/Total CMDI/채권변동성 | 35/35/10/20 % =100 (경제 신용 D17의 NFCI 축과 다름) | 4/4 + 공식 저장 projection, scoreMatch 회귀가 있으면 일치 확인 | `lib/diagnostic-layer/model.mjs:creditRiskDefense`; `worker/projection-builders/creditRisk.ts` |
| D10 | 실적 침체 위험 | 독립 E1-R4 평가 4요인 EPS/마진/매출/확산 | 35/25/20/20 % =100 (경제 실적 13요인 R5와 분리) | 4/4 READY + 분기·이력 점수 계보 일치; 누락 시 PARTIAL | `lib/diagnostic-layer/model.mjs:earningsRecessionDefense`; `worker/projection-builders/earningsRecession.ts` |
| D11 | 자산 버블 위험 | 6요인 가치·가격가속·위험자산 비중·투기흐름·폭괴리·초과유동성 | 35/25/15/10/10/5 % =100 | 6/6 유효/완료분기. R9 현재 vintage와 R10 후보 활성여부 분리 | `lib/diagnostic-layer/model.mjs:assetBubbleSafety`; `worker/projection-builders/assetBubble.ts` |
| D12 | 부채 위험 | 5요인 DSR/부채GDP/금리부담/신용스트레스/상환능력 | 35/25/15/15/10 % =100 | 5/5 READY, BIS 저빈도 관측의 유효 시점 분리; missing 시 PARTIAL | `lib/diagnostic-layer/model.mjs:debtRiskSafety`; `worker/projection-builders/debtRisk.ts` |
| D13 | 공급 충격 위험 | 6요인 GSCPI/유가/휘발유/구리/산업생산/헤드라인-근원 격차 | 40/20/10/10/10/10 % =100 | 6/6 READY, 월간 유효 자료만 현재 빈티지에 계산; missing 시 PARTIAL | `lib/diagnostic-layer/model.mjs:supplyShockSafety`; `lib/diagnostic-layer/supply-r9-components.mjs` |
| D14 | 경제 물가 (CM-R1 하위) | 4요인 corePCE/coreCPI/CPI/물가기대 | 35/25/15/25 % =100 | 4/4 READY + 진단 집계점수와 오차 <1e-6, 실패 시 PARTIAL | `lib/market-score/inflation-legacy-public-domain.mjs` |
| D15 | 경제 고용 R54 | 4요인 실업률/3M 급여/4W 청구/주별 청구 개선 | 30/30/20/20 % =100 | 4/4 유효 점수; 29개 R6 상세요인과 혼동 금지, 1개 missing=PARTIAL | `lib/market-score/employment-r54-candidate.mjs` |
| D16 | 경제 금리 RATE_R3 | 4축 정책(EFFR)/2Y/실질10Y/10Y−3M 스프레드 | 20/25/30/25 % =100 | 4/4 유효 과거 충분/5영업일 HARD_STALE 거부, 재가중 0 | `lib/market-score/rate-r3.mjs` |
| D17 | 경제 채권·신용 CREDIT_R2 | 4요인 HY CMDI/IG CMDI/NFCICREDIT/채권변동성 | 35/35/10/20 % =100 | 4/4 유효·NFCI 최소260 이력, missing=PARTIAL, 14일 초과 SOFT_STALE 메타 | `lib/market-score/credit-r2.mjs` |
| D18 | 경제 경기 G16 후보 | 24개 feature (생산·제조, 노동시장, 기업활동 3축) | 각 feature 차등 고정가중치 총합 100% (3축/가족 분배), 24개 동일가중 아님 | 24/24 적격 `availableAt` + feature별 최소3 유효이력 + 2개월 stale 제한, 하나라도 누락 NOT_READY | `lib/market-score/growth-r2-contract.mjs`; `lib/market-score/growth-r2-worker-domain-r1.mjs` |
| D19 | 경제 소비 R5 | 13개 점수요인·5축 D/Y/L/H/B, 정보용 2개 진단은 점수 제외 | 축 30/25/15/20/10 % =100; 각 축 안에서 별도 고정 세부 가중치 | 13/13 필수값, 10년 이력 reference/저장7일/관측120일; 2개 진단 가중0 | `lib/market-score/consumption-r5.mjs`; `worker/consumption-r5-reader.mjs` |
| D20 | 경제 기업실적 E1-R4/R5 | R4 이전 유효 점수 4요인 보존 / R5 후보 13요인 S1~S13 | R5 요소별 15/8/8/10/6/8/10/5/5/10/5/7/3%=100; 블록 55/20/15/10 | R5 13/13 READY+noReweight=true+missing=[]일 때만 R5 선택, 나머지 R4 last-good 유지 | `lib/market-score/earnings-e1-r5.mjs`; `lib/market-score/earnings-e1-r5-production-domain.mjs` |
| D21 | 경제 유동성 ACTIVE D3 | 6요인 fundingStress/bankReserves/TGA/ONRRP/M2/bondVol; UI 원자료 대표 4종은 부분집합 | 25/25/15/15/10/10 % =100 | 활성 진단 6/6 READY 점수, 1Y 역사 커버리지 별도. detailed READY 선택, 아니면 원래 승인 current 유지 | `lib/diagnostic-layer/model.mjs:liquidityCrisisDefense`; `lib/market-score/liquidity-active-public-domain-r1.mjs` |
| D22 | 경제 자금흐름 FUND_FLOW_R54 | 4요인 SEC 순유입/모멘텀/참여/환매 | 40/25/20/15 % =100 | 4/4 점수, 최소12개 유효 저장 관측, 결측 PARTIAL | `lib/diagnostic-layer/open-resolution-r53-components.mjs:buildFundFlowR54` |
| D23 | 경제 수급·시장폭 B1-R5 | 4요인 상승종목수 비율/상승대금/EMA5/EMA20, 이후 최종 EMA3 | 30/20/30/20 % =100 + 3일 EMA는 별도 평활화 | 4/4 적격+98% 커버리지+최근 ≤2완료거래일+저장 R4, 누락 PARTIAL; MarketParquet 무료 게시 불허 유지 | `lib/market-score/breadth-b1-r5-contract.mjs`; `lib/market-score/breadth-b1-r5-reader.mjs` |
| D24 | 경제 달러·환율 DOLLAR_FX_R54 | 4요인 Broad Dollar 수준/20일/60일 변동/20일 변동성 | 30/30/20/20 % =100 | 4/4·최소252개 관측, missing/WARMUP PARTIAL | `lib/diagnostic-layer/open-resolution-r53-components.mjs:buildDollarFxR54` |
| D25 | 경제 원자재 K1-R2 | 4요인 WTI/Brent/구리/미국 휘발유 | 30/25/25/20 % =100 | 4/4·최대 2개월 관측 이월·percentile >=60, stale/missing=PARTIAL | `lib/market-score/public-domain-producers-r2.mjs` |
| D26 | 금리 심리 H.15 연구 보조 | 3개 관측 DGS2/DGS3MO/DGS10 → 정책대용·2Y RSI·10Y RSI·안정성 4축 | 50/20/20/10 % =100 | 4/4·756 영업일 history·관측7일 freshness, 연구용(no FedWatch/prodApproved=false) | `lib/market-score/rate-sentiment-r1-research.mjs` |
| D27 | 퇴역 콘텐츠 | 삭제 사용자 결정·현재 R4 OUT_OF_SCOPE | 산식·가중치 감사 대상 아님 | R13 예약 복원·새 구현·게시 금지 | `docs/DASHBOARD_INPUT_EVENT_SCORE_TREND_EXECUTION_R4_20261116.md` #62 |

## 숫자·지표 수 소스 정적 회귀

- **21/21 PASS**: 각 수치 모델 상수 또는 `strictWeightedScore` 함수에서 **요인 개수와 총 가중치 합**을 추출해 검사. 항목: CM-R1 12, KR Rev7 7, 경제 물가4/고용4/금리4/신용4/경기24/소비5축/실적 R5 13/자금흐름4/달러4/수급4/원자재4, 진단 `inflationStability` 4·경기침체7·유동성 위기6·신용 위험4·실적침체4·자산버블6·부채5·공급충격6. **KR Rev7의 `7×(1/7)`은 floating rounding 허용오차 <1e-12**로 검증한다.
- 위 21개 중 `inflationStability` 4요인은 **경제 물가 D14**에 대응하고, **위험 인플레이션 D06**은 별도 R2 7축 평균이다. `liquidityCrisisDefense` 6요인의 소스 모델은 경제 유동성 D21과 연결되며, 위험 8대의 D08은 해당 모델 대신 별도 S21 위험을 사용한다.
- **별도 구조 검증:** D06 R2 축 7개(`INFLATION_R2_AXES`), D08 S21 원천 8종·파생 10신호·5축·13개 연속 완료월, D19 소비 세부 `definitions` 13행+정보용 2행, D20 R5 `E1_R5_SCORE_KEYS` 13개/승격 NoReweight, D21 진단 6개, D26 금리 연구 3원본/4축, D23 최종 EMA3.
- **외부/미연결/퇴역 예외 4종:** D01 CNN 공급자 발행값의 자체 가중치 없음, D03 상승/보합/하락/미관측은 비율(요인수=점수계산수 아님), D04 NOT_CONNECTED, D27 RETIRED. 해당 예외는 임의 계산함수로 채우지 않는다.

## 책임·검증 한계

- **이번 작업 W06 자체 수행:** 최신 main 파일 대조, 순서/중복 ID 검사, 개별 계산기 요인 및 가중치 수치 검증, 27행 표 작성, GitHub remote readback.
- **Calculator/Writer 원담당 변경 0:** 기존 승인 산식·숫자·가중치·PC 원본·운영 source를 고치거나 배포하지 않는다. 다른 담당자에게 본 조사/검증을 떠넘기지 않는다.
- **프로세스 총괄 인계 0:** 공통 Controller 조회기/공통 B급 설치기/승인 보호의 실제 결함을 발견하지 않았음. 모델별/화면별 조사·회귀·문서 작성은 W06 자체 처리이며 총괄에게 넘길 사유 아님.
- **FIRST UNVERIFIED:** PC 운영 승인 SHA와 모델 파일의 실제 동치, 모든 공급자 실제 유효 원천 입력/운영 27종 종단 실행, #74 D1 본문/stored_at readback, #75 exact Production Deployment SHA. #03은 **소스 계약 정리 단계의 DONE**으로만 판정하며 실운영 완료로 확대 해석하지 않는다.
- **변경 영향:** 문서 1개 신설·지정 진행 원장 갱신 예정. Collector/Calculator/Writer·DB/D1·Controller/Queue·Cloudflare·DNS·수집/출력 주기 변경 없음.
