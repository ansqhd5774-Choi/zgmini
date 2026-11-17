# ZGMINI R4 #06 — 27개 콘텐츠의 유효 신규 입력·READY·기간·권리 Gate

**목적:** R4 고정 #06 `READY·마지막 유효 관측·TTL·월/분기 완료·이용권·확정/잠정·Owner`를 최신 소스와 기존 승인 계약으로 판정하여 한 지표 갱신 시 허용/거부를 식별한다. 아래는 **판정 기준표이지 운영 PC/라이선스 승인증명이 아니다.**

- 조사일: 2026-11-17 KST
- 개발 기준: `ansqhd5774-Choi/zgmini`, `main@1f451fbd979af6b9a0a1a2a4b2f79db60f3ae22f`; 지정 브랜치 `codex/ui-improvements`.
- 선행 증거: [R4 #02 실제 경로 매핑](DASHBOARD_R4_STEP02_27_SOURCE_ROUTE_MATRIX_20261117.md), [R3 D01~D27 계약 판정](DASHBOARD_SCORE_UPDATE_UNIFICATION_R3_EXECUTION_20261116.md), 최신 main 각 판정 소스, [공급자 이용권 정본](../docs/API_SOURCE_RIGHTS_REGISTRY.md).
- 공통 규칙: `observedAt/observationDate`는 공급자 관측, `availableAt`은 이용 가능 일자, `sourceStoredAt`은 로컬 저장, `calculatedAt`은 계산, `stored_at`은 게시. 웹에서 GET만으로 계산하지 않는다. **자료가 저장돼도** 공식 기간·READY·신선도·권리 중 필요한 Gate를 충족하지 못하면 신규 확정 계산/게시를 거부한다.
- **8일 표시는 공개 D1 결과의 `stored_at` TTL (`worker/public-display-freshness.mjs:PUBLIC_DISPLAY_MAX_AGE_MS`), 개별 원재료 관측/수집 TTL과 다르다.** 항목별 원자료 TTL이 승인 소스에서 직접 확인되지 않으면 **UNKNOWN / 원담당 기존 승인 정책 유지**이지 8일을 전 입력에 강제하는 게 아니다.
- **공개 이용권:** `docs/API_SOURCE_RIGHTS_REGISTRY.md`는 특정 공급자·플랜·데이터·공개 형태만 판정한다. 내부 `rightsAllowed` 값이나 이미 표시 중인 점수는 법적 승인 증거가 아니다. 현행 정상 기능을 임의 삭제하지 않되, 권리 확인 없는 신규 공개·대체 공급자 연결/활성화 금지. 정본 변경은 각 Owner 승인만.

## 콘텐츠별 새 입력 허용 / 신규 확정 거부 Gate (27/27)

| ID | 콘텐츠·담당 | 적격 신규 입력/계산 허용 | READY/관측·수집·게시 유효요건 | 거부·보존·대기 조건 | 이용권·배포 경계 | 실제 메서드 근거 |
|---|---|---|---|---|---|---|
| D01 | CNN 미국 공포탐욕 · CNN/ W06 | CNN 검증 `observedAt`가 실제 신규 관측 또는 정정이고 점수가 유효한 경우 기존 public feed 저장·계산/표시 기회 | 확정 점수/체크시간 별도; 공개 feed `storedAt` 8일 미만 | checkedAt 변화·재조회만으로 관측점 생성 금지, provider 실패/오래된 feed는 503/last valid 보존 | 공급자별 게시권 자동 추정 금지 | `worker/public-feed-store.mjs`; `lib/cnn-observed-archive-r1.mjs` |
| D02 | KR Rev7 · 한국 원담당/W06 | KRX 완료 거래일 + Rev7 7개 산출 요인·저장 snapshot 확인 | `successfulTradingDates >= 1030`, 동일 방법론 점수 유효; 관측일 7일 초과 STALE; 브라우저 캐시 15분(오류 5초) | 미완료 거래일·누락 이력·WARMUP·STALE을 새 확정 READY로 표현 금지; 현재 researchOnly/productionEligible:false | KRX/ECOS 각 원천 범위 별도 판단, 연구 공개와 생산승인 구별 | `worker/korea-funds.mjs`; `worker/korea-rev7-engine.mjs` |
| D03 | 미국 등락 비율 · 수급 원담당/W06 | 기존 IEX 정규장 완료 15분 slot의 저장·검증된 비율만 표시 | slotEndUtc 30분 이내 + 같은 뉴욕 거래일; 분모에 미관측 포함; 잠정 PROVISIONAL | 장외/구관측/페이징 미완료를 확정 0%·완전 관측으로 표시 금지; 폐기된 confirmed R2 대체 금지 | **Alpaca Basic 무료 IEX 공개 파생권 확보 안 됨**; 기존 공개 현황과 신규 사용·승인 별개 | `lib/market-breadth/us-provisional-r1.mjs`; `app/api/market-breadth/route.ts`; `docs/API_SOURCE_RIGHTS_REGISTRY.md` |
| D04 | 한국 등락 비율 · 한국 원담당/W06 | 아직 독립 counts 수집·저장·공개 GET 없음: 실제 입력 갱신 대상 없음 | `showBreadth=false` 기본, READY/TTL/신규 비율 계약 N/A | 없는 비율을 0으로 채움·한국 공포탐욕 점수를 재사용·임의 신규 게시 금지 | 원천·새 공개권 판단도 연결 설계 전 별도 | `app/korea-composite-view.tsx` |
| D05 | 미국 종합 CM-R1 · CM-R1/Writer/W06 | 승인된 경제12 중 유효 1개 변경, 나머지 11개 최종 유효값 재사용; 다음 승인 계산 기회 | 경제12 모두 `READY`·coverage100·noReweight; 공개 current `storedAt` 8일 미만 | 11개 중 1개라도 필수 PARTIAL/UNAVAILABLE이면 종합 PARTIAL/null; GET시 계산/수집 금지 | 12개 원공급자 권리 종속; 공급자별 적격 상태로 판단 | `lib/market-score/composite-model-r1.mjs`; `worker/market-operational-store.mjs` |
| D06 | 인플레이션 위험 R2 · 물가 원담당/W06 | 유효 16 저장 입력·발표 `availableAt<=asOfDate`; 7축 산출 | 7축 전부 수치 유효 READY; projection `storedAt` 8일 미만 | 7축 6/7 등 결측이면 PARTIAL/null, 최신 재조회만으로 신규 점수 금지 | BEA/BLS/FRED 등 실제 원본 약관 계약 별도 | `lib/diagnostic-layer/inflation-r2-stored.mjs`; `worker/projection-builders/inflation.mjs` |
| D07 | 경기침체 위험 R13 · 위험 원담당/W06 | NFP/GDP/IP/실질 PCE/Sahm/소매/소득의 개별 유효 관측 업데이트를 저장 현재 빈티지로 재평가 | 기존 계산 `status=READY`이고 수치 유효; projection 게시 `storedAt` 8일 미만 | 일부 필수 결측·새로 확인되지 않은 월/분기를 READY로 둔갑 금지, PIT 실시간 예측 아님 | 미국 공공 통계 원천별 공개조건 별도 | `worker/projection-builders/recession.ts` |
| D08 | S21 스태그플레이션 확정 · 위험 원담당/W06 | 공통 완료월 13개 연속 유효값·검증된 sourceHash·승인 게시 | 13개월 READY, `publicationAuthorized=true`, `sourceStoredAt`와 게시 storedAt 8일 미만 | 미완료 월 확정 등록 금지; 잠정 S21 외 별도 R21 등과 합치지 않음 | 원본별 계약 별도, 미승인 provisional/confirmed 혼합 금지 | `lib/diagnostic-layer/stagflation-s21.mjs`; `worker/stagflation-public.mjs` |
| D09 | 신용 위험 4요인 · 신용 원담당/W06 | HY/IG/Total CMDI·국채변동성 저장된 적격 요인 중 새 관측 발생 | 승인 진단 READY 점수 유효, `scoreMatch` 재계산 일치할 때만 끝점 연결; projection storedAt 8일 미만 | 직전 결과 일치 불명/혼합 이력/결측을 가짜 확정 관측점으로 사용 금지 | NY Fed/FRB 등 원천별 권리 별도 | `worker/projection-builders/creditRisk.ts` |
| D10 | 실적 침체 4요인 · 실적 원담당/W06 | EPS/마진/매출/실적확산의 정식 완료분기·공표 저장 입력과 잠정 별개 | 진단 4요인 READY·분기말·source/score lineage, projection storedAt 8일 미만 | 아직 발표되지 않은 분기·재구성 이력을 당시 PIT로 보이게 금지 | SEC 공시·기업 데이터 원천 권리/공개 필드 계약 별도 | `worker/projection-builders/earningsRecession.ts` |
| D11 | 자산 버블 위험 · 자산 원담당/W06 | 6요인 평가의 승인 완료분기 입력 새 관측; R9/R10 실제 활성판 식별 | 활성 진단 READY·방법론 버전 일치, projection storedAt 8일 미만 | R10 후보 PARTIAL을 R9 확정과 섞거나 미완료 분기 신규 확정점 생성 금지 | 금융 시세 공급자 권리·후보 배포 승인 별도 | `worker/projection-builders/assetBubble.ts`; `app/asset-bubble/asset-bubble-panel.tsx` |
| D12 | 부채 위험 5요인 · 부채 원담당/W06 | BIS DSR·부채/GDP 등 5요인 각각 발표된 마지막 유효 입력 | 진단 5개 READY일 때만 현재 score; projection storedAt 8일 미만 | 분기 자료 미발표를 허위 0점·미확인 월별 새 점으로 채우지 않음 | BIS/FRED 원천별 공개 범위 별도 | `worker/projection-builders/debtRisk.ts` |
| D13 | 공급 충격 위험 · 공급 원담당/W06 | 공급·유가·물가 혼합 유효 입력의 관측/공식 완료기간 + 활성 산식 Gate | 활성 진단 READY·유효 요인 + projection storedAt 8일 미만 | 월 완결 조건을 만족하지 않는 잠정 값을 확정 점으로 병합 금지 | GSCPI 포함 외부 지표 공개 권한/공식 URL 별도 | `worker/projection-builders/supplyShock.ts` |
| D14 | 경제 물가 4요인 · W01/W06 | core PCE/core CPI/CPI/기대물가 각각 최신 유효 관측 1개 갱신 | 4/4 READY, 실제 가중합과 diagnostic 집계 오차 <1e-6 | 임의 6/7 인플레이션 위험 R2 대체·오차·missing 재가중 금지 | 경제 원천 공급자별 기존 권리 범위 유지 | `lib/market-score/inflation-legacy-public-domain.mjs` |
| D15 | 경제 고용 R54 · W04/W06 | BLS 월간/ DOL 주간 중 공식 신규 적격 1요인 (나머지 저장값 이월) | 4개 지표 READY, 실업률·급여 60기록·청구 26주 등 유효 reference 필요 | R6 상세 29개를 R54 점수 4개와 동일시 금지; 1요인 missing 시 PARTIAL/null | BLS/DOL 제공 권한 및 공개 최소값 정책 별도 | `lib/market-score/employment-r54-candidate.mjs` |
| D16 | 경제 금리 RATE_R3 · 금리 원담당/W06 | EFFR/2Y/실질10Y/10Y−3M 중 영업일 신규 관측 | 승인 점수 4축+최소 756 유효 과거, 입력 최근성 0~2 영업일 CURRENT | 3~5 영업일은 SOFT_STALE; 5 초과 HARD_STALE → UNAVAILABLE/null. 정책 이벤트 날까지 일간 갱신 대기 금지 | 연준·NYFed 등 원천 조건 별도 | `lib/market-score/rate-r3.mjs` |
| D17 | 경제 채권신용 CREDIT_R2 · 신용 원담당/W06 | HY/IG CMDI·NFCICREDIT·채권금리 변동성 주/일 유효 관측 독립 갱신 | 4요인 유효, NFCI 과거 최소260, 현재 값 0~100; 14일 초과는 SOFT_STALE 메타 | 4요인 중 누락이면 PARTIAL/null; SOFT_STALE 표시를 현행 HARD_STALE로 임의 격상하지 않음 | NY Fed/Chicago Fed/H.15 권리 개별 판단 | `lib/market-score/credit-r2.mjs` |
| D18 | 경제 경기 G16 · 경기 원담당/W06 | 24개 필수 feature 개별 적격 `availableAt` 입력 갱신 | 24/24 `pitEligible=true`, 2개월 이내 availableAt; 승인 source identity 재구성 | 23/24, STALE>2개월, `availableAt>asOf`이면 NOT_READY/null; 새 1개만으로 결측24/24 건너뛰기 불가 | BLS/BEA/Census/FRED 등 원천별 공개권 검토 | `lib/market-score/growth-r2-worker-domain-r1.mjs` |
| D19 | 경제 소비 R5 · 소비 원담당/W06 | 13개 공식 점수요인 5축의 개별 공표일이 적격일 때 갱신 | 5/5축 READY, 10년 참조자료; 원본 저장 7일 이내·최신 관측 120일 이내 | 만료·유효 5축 결측·구 7축 복원으로 READY 만들지 않음 | BEA/BLS 등 원천별 조건 별도 | `lib/market-score/consumption-r5.mjs`; `worker/consumption-r5-reader.mjs` |
| D20 | 경제 실적 E1-R4/R5 · 실적 원담당/W06 | E1-R5 새 공식 SEC 자료를 통해 13요인 full READY일 때만 후보 승격 | E1-R5 READY + noReweight=true + missing=0, 아니면 유효 E1-R4 last-good 유지 | E1-R5 후보 PARTIAL로 현재 R4 덮어쓰기·R5 13요인 중 누락 재가중 금지 | SEC 데이터 권리와 개별 외부 공급자 제한 별도 | `lib/market-score/earnings-e1-r5-production-domain.mjs` |
| D21 | 경제 유동성 ACTIVE D3 · 유동성 원담당/W06 | 준비금·M2·TGA·ON RRP 등 주/월 저장 입력의 개별 유효 갱신 | 활성 6요인 진단 READY 점수 유지; 1Y 이력 품질은 별도 `READY_1Y` | 1Y 자료 부족을 신규 점수로 보간 금지; 현재 ACTIVE 진단과 역사 재구성 혼합 금지 | 연준/재무부 공개조건 별도 | `lib/market-score/liquidity-active-public-domain-r1.mjs` |
| D22 | 경제 자금흐름 · 자금흐름 원담당/W06 | SEC 공식 공표 순유입·모멘텀 등 4요인의 관측일 신규 | 최소 12개 유효 관측, 4요인 점수 유효 | 공표 전 단순 로컬 저장시각만으로 새 점 생성 금지, 결측 재가중 금지 | SEC 등 원천 데이터 공개 권리 별도 | `lib/diagnostic-layer/open-resolution-r53-components.mjs` |
| D23 | 경제 수급·시장폭 B1-R5 · 수급 원담당/W06 | 신규 완료 거래일 4요인·EMA3 실값; 승인 저장 공급자 데이터 | 98% 커버리지 이상, 마지막 완료 거래일 2세션 이내, D1 stored R4 READY, 요인 유효 | 장외·불완전 입력·권리 미확인 신규 게시 금지, MarketParquet 제거 확정·가짜 소스 재도입 금지 | **MarketParquet 무료 공개 거절 확정**; 대체 데이터/GMH 권리는 실제 lineage별 별도 승인 검증 | `lib/market-score/breadth-b1-r5-contract.mjs`; `lib/market-score/breadth-b1-r5-reader.mjs`; `docs/API_SOURCE_RIGHTS_REGISTRY.md` |
| D24 | 경제 달러환율 · 달러 원담당/W06 | Broad Dollar 일간 영업일 신규 값 | 수준/20일/60일/20일변동성 4요인, >=252 참조 | 휴장일 가짜 계산일 생성·이력 부족 PARTIAL을 0점으로 대체 금지 | FRED/연준 원천 조건 별도 | `lib/diagnostic-layer/open-resolution-r53-components.mjs` |
| D25 | 경제 원자재 K1-R2 · 원자재 원담당/W06 | WTI/Brent/구리/휘발유 4개 공급자 각 공식 새 유효 월/주 가격 | 각 요인 최신 유효 월 관측 asOf 대비 2개월 이내, percentile 최소60, 4/4 READY | 3개월 이상 오래된 입력·누락 요인 재가중·무단 예측 보정 금지 | EIA/FRED/World Bank 각 원천 공개범위 별도 | `lib/market-score/public-domain-producers-r2.mjs` |
| D26 | 금리 심리 H.15 · 금리 원담당/W06 | H.15 2Y·3M·10Y 동일 유효 거래일, 756개 history | 관측 기준 7일 이내·유효 4축, 공개 저장 `storedAt` 8일 미만, `productionApproved=false` 연구용 | 7일 초과 STALE·관측/저장 불일치/보정 없는 FedWatch 확률 표기 금지 | 연준 H.15 연구·공개 점수 권리와 상업/확률 서비스 권리 구분 | `lib/market-score/rate-sentiment-r1-research.mjs`; `worker/rate-sentiment-public.mjs` |
| D27 | 삭제된 이란 진행 보조 · 담당 없음 | 새 입력·계산·게시 전부 OUT_OF_SCOPE | RETIRED; READY/TTL 검증 대상 아님 | 삭제 UI/원본/예약 복원 및 신규 게시 금지 | 퇴역 콘텐츠 신규 공급자 검토 불필요 | R4 계획 #62 사용자 삭제 정정 |

## 검증·제외 범위

- **27개 고유 ID 27/27**, 그중 26개 활성/미연결 Gate 판정, 1개 #62 D27 RETIRED. D04는 NOT_CONNECTED이며 서비스 구현으로 위장하지 않는다.
- **최신 main 정적 원문 검사:** D01~D13 13/13 PASS, D14~D26 13/13 PASS, 8일 공통 공개 TTL·D03 IEX 이용권 상태·D23 MarketParquet 거절 3/3 PASS = **29/29 소스 포함 검사 PASS**. 별도로 각 소스 읽어 조건을 위 표에 수기 비교. 실행/단위시험/PC 게시 신설 0.
- **엄격한 권리 예외:** Alpaca Basic IEX의 무료 공개 권한은 공급자 사람이 허가한 것이 아니고 AI 답변은 별도 계약 필요를 안내. MarketParquet 무료 공개는 확정 거절. D03/23을 새 권리 획득으로 표기 금지. GMH 공식 약관상의 조건부 비복원성 사용은 실제 GMH-only lineage가 입증된 출력에만 적용.
- **정확한 Owner:** W06은 현재 자료 계약/화면/API·검증표, 각 원담당은 기능별 계산/원자료/운영 Writer와 승인 범위 유지. 공통 Controller 구조 결함이 이번 #06에 검출된 바 없으므로 프로세스 총괄 인계 **0건**.
- **시계 혼동 방지:** 외부 공급자의 관측 주기와 PC 수집 주기·계산 실행·D1 storedAt·UI 60초 조회를 같은 갱신 사건으로 세지 않는다. OFFSESSION/STALE/NOT_READY/PARTIAL은 값 0으로 채우지 않고 마지막 유효 결과를 보호.
- **한계:** 정확한 현재 PC 승인 source/실행 SHA·개별 D1 row와 실제 신규 원자료 갱신은 이 계약 검사에서 직접 조회하지 않음. 일부 공급자의 현재 공개 파생권도 재확인 전 UNKNOWN으로 표시. #03 실제 가중치 전수 완료, #07 원본 row 판정, #09 checkpoint 변경감지, #74 D1 readback, #75 exact Production 배포의 별도 조건을 이 단계 DONE으로 합산하지 않음.

## 단계 완료 판단

R4 #06은 **승인 계약·소유 경계·허용/거부 판정표 확정**이 목표인 소스/설계 단계다. 새 운영 입력의 전수 성공이 아니라 최신 소스와 문서가 말하는 상태/기간/권리를 고유 콘텐츠별로 분리함으로써 DONE(계약 분석 범위)로 판정한다. 상태 자체가 `UNKNOWN/RETIRED/NOT_CONNECTED`인 항목도 허위 READY로 만들지 않았다. **수정: 문서만, 실운영·산식·DB·Writer·DNS·배포 변경 0건.**
