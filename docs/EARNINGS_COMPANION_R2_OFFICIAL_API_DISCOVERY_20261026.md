# 실적 침체 정보성 분석 — R2 공식 API 검색·정의 확인 (1차)

- 확인일: 2026-10-26 (KST)
- 기준: `main` `972a5da9deae1a4a2f12b042f66e3bdfd72ef977`
- 상태: **OFFICIAL_METADATA_VERIFIED / LIVE_DATA_NOT_FETCHED / PC_KEYS_NOT_READ / NO_PUBLICATION**
- R1 코드 인벤토리: `docs/EARNINGS_COMPANION_R1_SOURCE_INVENTORY_20261026.md`
- 의미: 공식 사이트의 공개 메타데이터·예시·사용권 설명만 검토. **실제 시계열 JSON 데이터 응답을 받은 것으로 표시하지 않는다.**

## 1. 공식 API 존재 여부 및 호출 계약

| 소스 | 공식 존재 | 이번 확인의 직접 증거 | API 인증·실제 수치 |
|---|---|---|---|
| Census **QFR** | **O** | `https://api.census.gov/data/timeseries/eits/qfr.html` 데이터셋, `/variables.html` 변수 13개, `/examples.html` 쿼리 예시 공개 | **공식 예시에서 모든 데이터 요청에 API 키 필요**. 실제 응답·연도별 범위 **미검증** |
| Census **MTIS** | **O** | `https://api.census.gov/data/timeseries/eits/mtis.html`, `/variables.html`, `/examples.html` | **공식 예시에서 모든 데이터 요청에 API 키 필요**. 실제 응답 **미검증** |
| Census **M3** | **O** | `https://api.census.gov/data/timeseries/eits/m3.html`, `/examples.html`; 기존 Growth G010/G013/G015/G016 수집 코드 매핑 | **API 키 필요**. 실제 PC 응답·저장 최신일 **미검증** |
| BEA **NIPA** | **O** | `https://apps.bea.gov/api/`와 `https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf`; NIPA `T11200` Table ID 53 공개 | 기존 `BEA_API_KEY` PC 구성 가능 코드 확인. 기업이익 행(`A051RC`)의 실제 GET 데이터 **미검증** |
| BLS **PPI** | **O** | `https://www.bls.gov/developers/api_signature_v2.htm`, PPI 공식 시계열 `WPSFD4` | v2 등록 방식 및 실제 JSON 값·날짜 **미검증** |
| BLS **ULC/생산성** | **공식 통계 O, API series 확정 보류** | `https://www.bls.gov/charts/productivity-and-costs/nonfarm-business-sector-labor-costs-percent-change.htm`는 비농업 단위노동비용 QoQ·YoY를 공개. E1-R5 코드가 `PRS85006111` 사용 | **이 ID가 공개 API의 의도한 변환/단위와 일치하는지 실측 전 HOLD** |
| SEC **EDGAR XBRL** | **O** | `https://www.sec.gov/about/developer-resources` 및 `https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data` | 기존 E1-R4 frames 수집 코드는 있으나 이번 R2 직접 HTTP 값 **미검증** |

## 2. 기술적으로 중요한 발견

1. **QFR·MTIS API는 존재한다.** 기존 GitHub 검색에서 전용 collector를 발견하지 못한 것과 API 부재는 별개다. 새 수집 후보로 남긴다.
2. Census QFR 및 MTIS `variables`는 `category_code`, `data_type_code`, `seasonally_adj`, `cell_value`, `time_slot_id`를 공통 노출한다. 이 표준 변수명만으로 특정 숫자가 **매출 / 순이익 / 순이익률 / 재고매출비율**인지 단정할 수 없다. 산업·항목별 코드표/실측 행 검증이 필요하다.
3. 2026-10-26 공식 Census `examples`는 **모든 데이터 쿼리에 API Key 필요**라고 명시한다. GitHub 코드의 `CENSUS_API_KEY` 존재 여부와 실제 Windows 환경에 키가 설정됐는지는 다르다.
4. 기존 `worker/market-data-feed.ts`의 `WPSFD4`는 BLS 기준 **Final demand goods(최종수요 재화)** 시리즈다. 이를 **전체 생산자물가(PPI 전부)** 또는 기업 원가 총합으로 이름 붙이면 의미가 달라지므로 금지한다.
5. BEA 공개 NIPA `T11200`는 공식 API 가이드에 기재돼 있고, BEA 대화형 표 `1.12`에는 **IVA/CCAdj 조정 기업이익**이 있다. 기존 E1-R5 `A051RC` Shadow XLSX 파서와 동일 개념인지 line/series metadata로 검증한 뒤 활용한다.
6. QFR(일부 법인 산업의 분기 재무통계), BEA(거시 기업이익), SEC(상장기업 재무)는 모집단/회계정의가 다르다. 특정 지표를 **서로 대체하거나 공통 평균을 내지 않는다.**
7. BLS `WPSFD4` 출력은 기존 public feed에서 공급원 fallback 경유 가능. 새 C 정보 지표에 쓸 때 **실제 원천 BLS/타사 FRED** provenance를 확인해야 한다.

## 3. R2 게이트별 현황

| 검증항목 | QFR | MTIS | M3 | BEA 기업이익 | BLS PPI | BLS ULC | SEC |
|---|---|---|---|---|---|---|---|
| 공식 API/메타 문서 존재 | **O** | **O** | **O** | **O** | **O** | **부분** | **O** |
| 공식기관 원자료 재이용 원칙 | 후보 O | 후보 O | 후보 O | 후보 O | 후보 O | 후보 O | 후보 O |
| 해당 지표 정확한 시리즈/정의 | **미검증** | **미검증** | **기존 코드 맵 확인·실측 전** | **T11200 확인·행 미검증** | **WPSFD4 정의 확인** | **미검증** | **기존 E1-R4 코드 맵** |
| 유효 API 인증키 실제 확인 | **미검증** | **미검증** | **미검증** | **미검증** | **미검증** | **미검증** | 해당 없음 |
| 실제 HTTP 데이터 수신 | **미실행** | **미실행** | **미실행** | **미실행** | **미실행** | **미실행** | **미실행** |
| 최신 실제 관측일 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| PC SQLite 기존 값 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| 사이트 정보성 C 공개 | **X(미구현)** | **X(미구현)** | **X(미구현)** | **X(미구현)** | **X(미구현)** | **X(미구현)** | **X(미구현)** |
| R2 최종 판정 | **HOLD_HTTP** | **HOLD_HTTP** | **HOLD_HTTP** | **HOLD_HTTP** | **HOLD_HTTP** | **HOLD_SERIES_AND_HTTP** | **HOLD_HTTP** |

공공기관별 재사용권은 데이터 원천 차원의 일반 원칙이다. 각 데이터셋별 제3자 저작물/추가 제약이 없는지와 무료·저장·파생·상업적 공개 가능 여부는 실제 사용할 항목에 대해 최종 검증한다.

## 4. 안전한 다음 실측

- 실제 Windows PC의 **기존 승인된 API Key 환경변수만 정상 로딩**하는지 확인하고, 키 값은 어떤 로그에도 출력하지 않는다.
- QFR·MTIS는 각각 `data_type_code`/산업 `category_code` 매핑을 확인한 뒤 제한된 1개 시계열/기간의 실제 API 데이터 응답만 테스트.
- BEA `T11200` corporate profits의 확실한 `LineNumber`·`SeriesCode`를 실측 검증.
- BLS `WPSFD4`, `PRS85006111` API 단위·조정·시차 확인.
- SEC는 기존 PC 읽기 전용 SQLite 로그/커버리지부터 확인; 대량 재수집 금지.
- Windows 실측이 필요한 경우 **CMD 전용 검사기**, **실행 CMD와 동일 폴더에 TXT 로그**, GET 제한·호출량/비용 상한·비밀값 마스킹으로 준비. 별도 수집기/스케줄러/DB 스키마 수정 없음.
- 결과는 `LICENSE_OX | API_EXISTS_OX | HTTP_OBSERVED_OX | SERIES_MATCH_OX | COVERAGE | RELEASE_LAG | LATEST_OBSERVATION | CURRENT_PC_ROW_OX | PUBLIC_ROW_OX | REASON`로 기록.

## 5. 공식 자료 및 권리 원문

- Census QFR: https://api.census.gov/data/timeseries/eits/qfr.html
- Census QFR 변수: https://api.census.gov/data/timeseries/eits/qfr/variables.html
- Census QFR 예시/API Key: https://api.census.gov/data/timeseries/eits/qfr/examples.html
- Census MTIS: https://api.census.gov/data/timeseries/eits/mtis.html
- Census MTIS 예시/API Key: https://api.census.gov/data/timeseries/eits/mtis/examples.html
- Census M3 예시/API Key: https://api.census.gov/data/timeseries/eits/m3/examples.html
- BEA API: https://apps.bea.gov/api/
- BEA NIPA API 가이드: https://apps.bea.gov/api/_pdf/bea_web_service_api_user_guide.pdf
- BEA 기업이익 Table 1.12: https://apps.bea.gov/iTable/?categories=survey&isuri=1&nipa_table_list=+53&reqid=19&step=3
- BLS API v2: https://www.bls.gov/developers/api_signature_v2.htm
- BLS PPI WPSFD4: https://www.bls.gov/ppi/tables/final-demand-intermediate-demand-aggregation-index-seasonal-factors-2020-2024.htm
- BLS ULC: https://www.bls.gov/charts/productivity-and-costs/nonfarm-business-sector-labor-costs-percent-change.htm
- SEC EDGAR: https://www.sec.gov/about/developer-resources
- BEA 권리: https://www.bea.gov/help/faq/147
- Census 조건: https://www.census.gov/data/developers/about/terms-of-service.html
- BLS 권리: https://www.bls.gov/opub/copyright-information.htm
- SEC 권리: https://www.sec.gov/about/webmaster-frequently-asked-questions

**실행 영향: 문서 파일만 추가. API GET·PC SQLite·D1·산식·스케줄·UI·Production 배포 미실행.**
