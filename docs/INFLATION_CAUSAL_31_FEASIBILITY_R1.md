# ZGMINI 신규 물가 영향요인 지수 — 31개 후보 원자료·산식 설계 정리 R1

- 조사일: 2026-11-03 (Asia/Seoul)
- 대상 저장소: `ansqhd5774-Choi/zgmini`
- 기존 작업 브랜치: `fix/economic12-inflation-legacy4-r35-20261021`
- 성격: **연구·설계 명세. 실행기/산식/승인 변경 아님.** 신규 자료 호출, PC 수집·DB·D1 게시, 사이트 수정·배포를 승인한 문서가 아니다.
- 목표: 소비자물가 자체의 결과를 복제하지 않고 **물가 상승·하락에 영향을 주는 선행 원인과 전파 경로**를 포착한다. 구체적인 예측 대상, 정규화, 부호, 가중치, 결측 기준은 이후 시점 보존 검증과 사용자 확정이 필요하다.

## 1. 현행 지수와 분리

- 공개 4요인 물가지수(legacy): Core PCE 35%, Core CPI 25%, Headline CPI 15%, 기대물가 25%. 계산 코드 `lib/market-score/inflation-legacy-public-domain.mjs`.
- Inflation R2: 16개 계산 feature / 7개 축. 코드 `lib/diagnostic-layer/inflation-r2-stored.mjs`. 16개 계산 feature가 16개의 독립 원자료라는 뜻은 아니다.
- 새 31개는 **후보 명부**이며 현행 운영 반영·저장 완료·상업 게시 완료의 증거가 아니다. 기존 legacy/R2 및 이력을 그대로 보존한다.

## 2. 31개 공식 원천 후보 원장

등급 정의: A=공식 무료 원자료·자동 수집 경로 존재를 확인한 연구 후보, B=측정 개념·연결 방식·라이선스 조건 추가 검증 필요, C=명칭 범위를 충족하는 단일 원자료 없음/대체 신호 설계 필요. A는 PC Runtime PASS나 독립 가중 승인이 아니다.

| # | 영역 | 후보 원인/측정 | 공식 원천·시계열 식별 | 연구 판정 | 역할·유의점 |
|---:|---|---|---|:---:|---|
| 1 | 에너지 | WTI 국제유가 | EIA, FRED 별칭 `DCOILWTICO` | A | 원유 공급비용, 일간 |
| 2 | 에너지 | 휘발유 가격 | EIA, FRED 별칭 `GASREGW` | A | 유가와 전파·중복, 주간 |
| 3 | 에너지 | 천연가스 | EIA, FRED 별칭 `DHHNGSP` | A | 일간/월간 선택 |
| 4 | 에너지 | 산업용 전력비 | EIA v2 `electricity/retail-sales`, `price`, `sectorid=IND` | B | **가정용 RES 대신 산업용 IND를 비용 압력 후보로 우선**. 최종 소비자 요금과 구분, 월간 |
| 5 | 원자재 | 철강 | BLS PPI `WPU1017` | A | 월간 |
| 6 | 원자재 | 구리·황동 가공재 | BLS PPI `WPU102502` | A | 국제 구리 현물과 다른 상품, 월간 |
| 7 | 원자재 | 목재 | BLS PPI `WPU081` | A | 월간 |
| 8 | 원자재 | 산업화학 | BLS PPI `WPU061` | A | 월간 |
| 9 | 농축산 | 곡물 | BLS PPI `WPU012` | A | 월간 |
| 10 | 농축산 | 육류 | BLS PPI `WPU0221` | A | 가공 단계 선택; 농가 가축 `WPU013`과 구별 |
| 11 | 농축산 | 사료 | BLS PPI `WPU029` | A | 곡물·육류 전파 중복 확인 |
| 12 | 노동 | 평균시급 상승 | BLS CES `CES0500000003` | A | 임금 수준의 YoY 파생, 월간 |
| 13 | 노동 | 고용비용지수 ECI | BLS `CIS1010000000000I` | A | 분기, 임금 구성 효과 통제 |
| 14 | 노동 | 단위노동비용 | BLS `PRS85006111` | A | 분기, 생산성·임금 전파 중복 주의 |
| 15 | 관세 | 품목·국가별 법정 세율 | USITC HTS 8자리/Chapter 99 및 예외·시행일 | B | **관측일/법령 효력일 보존**; 법정 세율은 수납액과 다름 |
| 16 | 관세 | 실제 관세 수납 | Treasury MTS Table 4 `Customs Duties` | A | 월간 총수납/환급/순수납 금액 구분; 가격 전가율과 다름 |
| 17 | 관세 | 수입 노출 비중 | USITC DataWeb `Customs Value` 및 품목 수입액 | B | **정의가 필요한 파생변수**. 품목별 수입 의존/소비·원가 비중과 연결, 계정·키 필요 |
| 18 | 환율 | 광의 달러지수 | Fed H.10 `JRXWTFB_N.M` | A | 월간; 가격 영향 시차·부호 검증 |
| 19 | 수입 | 비연료 수입가격 | BLS `EIUIREXFUELS` | A | 월간, 관세 제외; 원자재·환율 중복 통제 |
| 20 | 물류 | 국제 운송비 | BLS 국제 항공운임 `EIUIV131` | C | **항공운임은 전체 해상·항공 운송비가 아님**; 대표값으로 사용 금지, 추가 무료 해상 대표성/권리 검토 |
| 21 | 공급망 | 글로벌 공급망압력 GSCPI | New York Fed GSCPI | B | 월간; 이미 해상 BDI/HARPEX·항공·PMI 포함. 20번과 중복 주의, 다운로드·권리 확인 |
| 22 | 주거 | CPI 임대료 | BLS `CUSR0000SEHA` | B | **선행 원인 아님**, 결과 검증/보조 정보로 분리 검토 |
| 23 | 주거 | 소유주등가임대료 OER | BLS `CUSR0000SEHC01` | B | **선행 원인 아님**, CPI 하위지표·주거 조사 시차 유의 |
| 24 | 생산비 | 최종수요 PPI | BLS `PPIFIS` | A | 중간수요·원재료와 다중계수 금지 |
| 25 | 생산비 | 중간수요 가공재 | BLS `WPUID61` | A | 최종수요보다 상류 단계, 월간 |
| 26 | 수요 | 실질 PCE | BEA NIPA `T20306` | A | 월간, 27번과 동일 원자료 |
| 27 | 수요 | 실질 PCE 증가율 | BEA `T20306` 파생 | A | **26번과 독립 신호로 이중 가중 금지** |
| 28 | 공급 | 제조업 재고 | Census M3 `category_code`, `data_type_code`, `seasonally_adj` | A | 월간, 실제 코드·자료 범위 검증 필요; 공식 예시는 API 키 필수 표시 |
| 29 | 공급 | 제조업 생산 | Federal Reserve G.17, FRED 별칭 `IPMAN` | A | 월간, 일부 기존 DDP 다운로드 방식 2026-11-09 주간 제거 예고 |
| 30 | 공급 | 공급 부족 | Census M3 주문잔고·재고/출하, Fed 가동률 조합 | C | **단일 공식 지표가 아님**. 주문 증가를 공급 부족으로 오인하지 않도록 수요 통제 필요 |
| 31 | 기대 | 1년 소비자 기대물가 | New York Fed SCE median year-ahead | B | 월간 파일 다운로드, 출처·지정 면책문구 필요; 기존 Cleveland 기대 인플레와 다름 |

**집계: A 22 / B 7 / C 2 / D 0, 총 31.** 이 분류는 공식 자료 후보 조사이며 운영 수집 성공을 뜻하지 않는다.

## 3. 원인 중심 설계 결정 및 남은 선택

1. **입력과 결과 분리:** 비용·관세·공급망·노동·수요 압력은 주지수 후보, CPI 임대료/OER와 기존 CPI·PCE 실적은 별도 후행 검증. 필요하면 주거 선행 수요/신규계약 가격의 **상업적 이용 가능** 자료를 추가 조사하되, 검증 전 유료·민간 자료 호출 금지.
2. **중복 차단:** PCE 수준/증가율, 유가/휘발유, 농산물/사료/가공육, 임금/ECI/단위노동비용, 원자재/중간 PPI/최종 PPI, 운송/GSCPI, 수입물가/환율/관세를 같은 충격의 복제 신호로 처리하지 않는다. 실제 통계적 중복도는 시점 보존 이력으로 검사한다.
3. **관세의 세 측정 분리:** USITC `Calculated Duties`는 **추정**이며 실제 지급 수납액으로 표기하지 않는다. 실제 납부 현금은 Treasury MTS `Customs Duties`에서 확인한다. 법정 세율은 품목·원산지·효력일·Chapter 99·예외 계약으로 별도 구성한다.
4. **물류 대체:** 무료·상업 이용 가능한 해상/항공 통합 운송 지표를 발견하기 전 `EIUIV131`을 '국제 물류 운임' 전체로 명명하지 않는다. GSCPI의 합성 성분 중복에 따라 보조 항목 또는 중복 조정 후보로 둔다.
5. **공급 부족 대체:** Census M3 주문잔고/출하 및 재고 비율과 G.17 가동률의 선행·후행 관계를 정의하고, 단순 잔고 확대를 공급 부족으로 해석하지 않는다.
6. **점수 방향·가중치 보류:** 예측 목표(예: 향후 핵심 CPI/PCE의 1~3개월 방향/압력)와 PIT 기준 과거 정확도·실제 권리를 확인한 후 정의한다. 31개 균등 가중·기존 R2 가중치 복제·임의 점수 산식 도입은 금지한다.

## 4. 출처·라이선스·자동화 계약

- BLS v1은 무등록 한도, v2는 등록 키·호출량 한도. 원자료 공식 식별자와 계절조정 여부를 검산한다: https://www.bls.gov/developers/home.htm , https://www.bls.gov/developers/api_faqs.htm
- EIA 공개 v2 API는 **무료 키**가 필요하며 출처 표시·호출 제한을 지킨다: https://www.eia.gov/opendata/ , https://www.eia.gov/opendata/terms-of-service.php
- BEA는 등록 API 키가 필요하며 원칙적으로 공공영역 통계다: https://apps.bea.gov/API/swagger/index.htm , https://www.bea.gov/help/faq/145
- Census M3 공식 API 예시는 **모든 자료 요청에 API 키 필요**라고 명시한다(2026-11-03 관측). `category_code`·`data_type_code` 실제 enum 확인이 선행되어야 한다: https://api.census.gov/data/timeseries/eits/m3/examples.html , https://api.census.gov/data/timeseries/eits/m3/variables.html
- USITC HTS는 공개 판본·개정 이력, DataWeb API는 Login.gov 계정·API 키(6개월 유효) 필요. 사용 가능한 원천/API 계약과 합성 실효관세 산식은 구분: https://hts.usitc.gov/ , https://www.usitc.gov/applications/dataweb/faqs , https://dataweb.usitc.gov/api-key
- 재무부 실제 관세 수납: https://fiscaldata.treasury.gov/datasets/monthly-treasury-statement/receipts-of-the-u-s-government (MTS Table 4); 순수납액은 환급에 영향받음.
- 연준 G.17 다운로드 변경 공지: https://www.federalreserve.gov/releases/g17/download.htm
- 뉴욕 연은 GSCPI에는 민간 운송·PMI 입력이 있으므로 **원지수 공개/파생 사용 조건과 입력 원자료 재배포 권리**를 구분: https://www.newyorkfed.org/research/policy/gscpi
- 뉴욕 연은 SCE는 공개 데이터의 royalty-free 파생·재배포를 허용하나 지정 출처·면책문구를 요구: https://www.newyorkfed.org/microeconomics/confirm_download.html?v=2

## 5. 구현·실PC 점검 전 보호와 통과 기준

- 코드 소스 브랜치와 `main`, PC 승인 설치 source, 실제 Runtime SHA를 구분한다. 옛 브랜치 전체를 `main`에 병합하지 않는다.
- 31개 후보 원자료가 PC에 이미 저장됐다는 증거는 없다. 현재 실행 허용목록에 31개 DB inventory 전용 작업도 없다. 사용자가 상시 승인한 공통 최소 모듈 절차가 실제 필요하면 #68 공용 대기열과 보호 manifest를 통해 A/read-only 인벤토리부터 등록·설치·검산한다.
- 새 공급자 API 호출·사이트 게시·배포는 해당 업무 승인 범위와 별도 대조한다. 인증키·원자료를 GitHub/D1/로그에 남기지 않는다. Core·SQLite·수집 주기·다른 프로젝트를 수정하지 않는다.
- 시점 보존 검증: 관측일/발표일/PC 저장일/게시일 구분, PIT 이력으로 미래정보 누출 방지, 주/월/분기 혼합 입력 시 발표 시각 이후에만 사용, revision 처리, 결측·stale·0 구분.
- 모의 실패 검사(연구용, 운영 PASS 아님): 공급자 지연, key 미확보, HTS 시행일 불일치, GSCPI 중복, 재사용 조건 미충족, 정상값 케이스. 최소 출력은 sourceId/observationDate/availableAt/sourceStoredAt/dataStatus/중복 검토 경고.
- 종료 기준: 각 후보의 정확한 API·측정 단위·권리·관측일·최근 저장 증거, 결측·중복 처리 규칙, 과거 검증, 승인된 가중치가 갖춰진 뒤에만 신규 산식 운영 반영 검토. 현재는 설계 R1에 한정.
