# 실적 침체 보조지표 — R2 Windows API 실측 결과 (2026-10-26)

- 대상: ZGMINI `/earnings-recession/`의 **정보성 보조지표** 연결 전 읽기 전용 검증
- 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026`
- 증거 1: 사용자가 PC에서 실행한 `EARNINGS_R2_READONLY_PROBE_RESULT.txt` (UTC 2026-10-26T13:11:10.898Z)
- 증거 2: 수정 재검사 `EARNINGS_R2_READONLY_PROBE_RESULT(1).txt` (UTC 2026-10-26T13:20:06.827Z). 총 API 요청 5회, **5회 모두 HTTP 200**. 최초 오류·응답은 기록상 보존.
- 실행 범위: 공식 API 요청 **5회** (BLS 2개 시리즈를 1회 POST로 묶음), PC provider 파일 발견, **DB·D1·스케줄러·기존 점수 산식 쓰기 없음**
- 상태: **LIVE_HTTP_CHECKED / SERIES_GATES_PARTIAL / NO_SITE_PUBLICATION**

## 실측 응답 (로그로 증명된 사실만)

| API / 후보 | HTTP | 응답 건수 | 최신 실제 관측일 | 판정 |
|---|---:|---:|---|---|
| Census QFR | 200 | 9,568행 | **UNKNOWN** (날짜 문자열은 수신, 검사기 공백 파싱 오류) | HTTP_O / DATE_FIX2_PENDING / METRIC_CODE_PENDING |
| Census MTIS | 200 | 512행 | **UNKNOWN** (날짜 문자열은 수신, 검사기 공백 파싱 오류) | HTTP_O / DATE_FIX2_PENDING / METRIC_CODE_PENDING |
| Census M3 | **200** (Fix1) | **128행** | **UNKNOWN** (날짜 문자열 수신, 파싱 보정 전) | **HTTP_O / CODE_IS_MTM_MATCH_O / DATE_FIX2_PENDING** |
| BEA NIPA T11200, `A051RC` | 200 | 전체 294행 / 해당 시리즈 12점 | **2026Q2** | HTTP_O / SERIES_MATCH_O / RIGHTS_SCOPE_REVIEW |
| BLS PPI `WPSFD4` | 200 | 21점 | **2026-M09** | HTTP_O / SERIES_MATCH_O / RIGHTS_SCOPE_REVIEW |
| BLS ULC `PRS85006111` | 200 | 6점 | **2026-Q02** | HTTP_O / TRANSFORM_AND_UNIT_PENDING |
| SEC XBRL | **미요청** | — | UNKNOWN | NO_HTTP_PROBE |

### BEA 실제로 받은 행

| 기간 | 원래 값(표시 형식 그대로) | 코드 / API 행 |
|---|---:|---|
| 2025Q3 | 4,052,447 | `A051RC / LineNumber 41` |
| 2025Q4 | 4,261,970 | `A051RC / 41` |
| 2026Q1 | 4,325,407 | `A051RC / 41` |
| 2026Q2 | 4,709,453 | `A051RC / 41` |

- API 설명: `Corporate profits with IVA and CCAdj`; 값의 **단위·계절조정·연환산 단위 표기 최종 확인 전** 대시보드 환산 금지.
- 중요 변경 발견: 사전 추정 `LineNumber 13`이 아니라 실측 데이터는 **`LineNumber 41`**. 이후 매칭은 `SeriesCode=A051RC` 중심으로 검증한다.
- BLS PPI `WPSFD4`는 **최종수요 재화(Final demand goods)** 지수이며 전체 PPI가 아니다.
- BLS ULC `PRS85006111` 출력 `2026-Q02=1.4`의 변환율·단위·조정값은 공식 series mapping 확인 전 이름 확정 금지.

## 원인·재검증

1. **Census 관측일 로그 오류**: 기존 검사기가 `time_slot_id`를 날짜라고 취급하여 `latestPeriod=0`을 썼음. `0`은 실제 발표일로 사용하면 안 됨. 수정 검사기는 `time_slot_date`와 `time_slot_name`을 요청하고 유효한 날짜만 최신일로 인정.
2. **M3 HTTP 400 해소**: 공식 API 예시의 `for=us:*`을 요청에 추가한 Fix1에서 **HTTP 200, 128행** 확인. 기존 Growth 코드도 같은 지리 필터 사용. 최초 실패는 누락 때문에 발생했을 가능성이 높지만 변경된 필드도 있어 단독 원인을 확정하지 않음. 샘플 `IS/MTM/yes=1.49`(2026-04-01), `FI/MTM/yes=325218` 수신. 공식 Census 코드표에서 `IS`는 재고/출하 비율, `MTM`은 총제조업. 샘플 숫자의 단위·빈티지는 후속 확인.
3. **QFR·MTIS 매핑**: 응답 행의 `data_type_code/category_code/seasonally_adj`를 공식 코드표에 대조하여 매출·순이익·재고비율 개념을 정확히 판정. 9,568/512행 성공만으로 원하는 지표가 확보됐다고 인정하지 않음.
4. **검사기 Fix1 결과 및 Fix2**: Fix1은 5회 전체 HTTP 200. 단, `time_slot_date`가 `2026-08-01 00:00:00.0`처럼 **날짜 뒤 공백**이 있는 형식이므로 ISO `T`만 허용했던 검사기는 `latestPeriod=UNKNOWN`을 기록했다. Fix2는 앞 10자리 실제 달력 날짜를 검증하여 저장하고, **Census 3요청만** 읽기 전용 재검사한다. TXT는 CMD 옆에 생성하며 키·원문 데이터 비출력.
5. **라이선스와 공개범위**: 국가통계 원본이라고 모든 행의 상업적 저장·파생·재공개를 자동 승인할 수는 없음. 각 확정 행의 공식 기관 조건 및 3자 자료 혼입 여부를 마지막으로 확인한 다음 사이트에 정보성으로만 편입.


## Fix2 Census 관측기간 재검사 — 추가 결과

- 사용자 PC 실행 UTC: **2026-10-26T13:37:09.127Z**
- 검사 버전: `EARNINGS_COMPANION_R2_PROBE_FIX2_20261026`, `--census-only`
- API GET **3회 전부 HTTP 200**, 저장·게시·기존 산식/DB/스케줄러 변경 없음.

| 데이터 | HTTP | 원 응답 건수 | `time_slot_date` 최댓값 | 공식 발표 교차검증 | 남은 Gate |
|---|---|---:|---|---|---|
| Census QFR | **200** | 9,568 | **2026-02-01** | Census 공식 최신 보고는 **2026 Q2**(9/8 발표). API의 `-02-01`은 '2월 결산'으로 표시 금지; 분기 슬롯 해석을 별도 확인 | QFR 항목·산업·quarter slot 매핑 |
| Census MTIS | **200** | 512 | **2026-08-01** | **2026년 8월** 자료 10/15 발표 | `IR` 비율 항목 정확한 API 행 매핑 |
| Census M3 | **200** | 128 | **2026-08-01** | **2026년 8월** 자료 10/2 발표 | 시계열별 단위·현재 PC 저장 중복 여부 |

- MTIS 8월 응답 샘플: `SM/MNFCTR/no=675497`, `SM/MNFCTR/yes=658622`, `IM/RETAIL/no=871833`. 이들은 **총 사업체 재고매출 비율** 자체를 의미하지 않음.
- M3 8월 응답 샘플: `IS/MTM/yes=1.48`, `FI/MTM/yes=330046`, `MI/MTM/yes=365990`. Census M3 10/2 정식 발표에 **제조업 재고·출하 비율 1.48** 표기되어 있어 수치 교차검증 **PASS**.
- MTIS 공식 10/15 발표의 **총 사업체 재고·매출 비율 1.33**과 위 샘플은 직접 동일 지표가 아니므로 서로 비교·대체·합산 금지. 총계 `IR` 행은 추가 정밀 확인할 때까지 HOLD.
- QFR API 날짜 원문의 2월은 실제 발표 월·회계월이라고 단정하지 않는다. Census 9/8 발표 및 리포트 목록은 2026 Q2임을 확인하므로 화면에는 **2026년 2월**이라는 허위 레이블을 생성하지 않는다.
- QFR 최신 데이터가 2026 Q2라고 공식 확인된 것과 **API의 선택 항목/코드 매핑 검증 완료는 다르다**. QFR 개별 지표는 계속 HOLD.
- 공식 근거: [Census QFR 2026 Q2 발표](https://www.census.gov/econ/qfr/mmws/current/index.html), [Census M3 8월 발표](https://www.census.gov/manufacturing/m3/current/index.html), [Census MTIS 8월 발표](https://www.census.gov/mtis/current/index.html), [Census Economic Indicators 분류](https://www.census.gov/about/policies/quality/standards/appendixe2.html).

**Fix2 결론: Census 3개 GET·기간 필드 수신 PASS. 데이터 공개 편입 여부는 시리즈 코드·사용권·기존 원자료 중복 확인 Gate를 통과한 행에 한정. 신규 PC 쓰기/D1/API/UI/배포 없음.**

## 공식 재이용 조건 재검증 (2026-10-26)

| 공급자 | 공식 원문 확인 | 상업적 정보성 공개의 운영 조건 | 상태 |
|---|---|---|---|
| BEA | 별도 예외 없는 BEA 자료는 퍼블릭 도메인이고 출처 표기 권고 | `Source: U.S. Bureau of Economic Analysis` 및 원본/자체 가공 구분 | 기관 직접 발표 수치 **사용권 후보 PASS**, 시리즈 단위·원장 계약은 별도 |
| BLS | 자체 공공자료 퍼블릭 도메인, 저작권 있는 사진/삽화와 로고는 제외 | API 접속·취득일 표기, **BLS가 다운로드 후 파생 분석의 품질을 보증하지 않음** 고지, 로고 미사용 | 원시 통계 **사용권 후보 PASS**, 코드·단위 게이트 별도 |
| Census | API를 이용한 표시·검색·분석 서비스 허용. 제3자 보증 사칭 및 개인/사업체 식별 결합·원문 왜곡 금지 | **`This product uses the Census Bureau Data API but is not endorsed or certified by the Census Bureau.`** 문구를 애플리케이션에 눈에 띄게 고지. 가공 수치를 Census 발표치라고 표기 금지 | 공개 집계 지표 **조건부 사용권 후보 PASS**. **저장·상업·파생·재배포 세부 허용 범위는 최종 계약 검토 전 HOLD** |

공식 조건: [BEA 저작권 FAQ](https://www.bea.gov/help/faq/147), [BLS copyright](https://www.bls.gov/opub/copyright-information.htm), [BLS API ToS](https://www.bls.gov/developers/termsOfService.htm), [Census API ToS](https://www.census.gov/data/developers/about/terms-of-service.html).

권리 O, HTTP O, 시리즈 매칭 O, PC 저장 O, 사이트 공개 O는 **서로 별도 Gate**. 이번 문서 갱신은 원시값 저장·외부 공개 허가를 확대하지 않는다.

## 릴리스 게이트

| 게이트 | 현재 |
|---|---|
| PC의 기존 키로 공식 API HTTP 확인 | **Fix1: 5/5요청 HTTP 200** |
| M3 실제 HTTP 성공 | **O — Fix1에서 200/128행** |
| QFR·MTIS·M3 관측 날짜 추출 | **O — Fix2에서 Census 3/3 필드·날짜 수신** |
| QFR 분기 식별·QFR/MTIS 세부 항목 매핑 | **보류 — 실제 코드/분기 해석 검증 필요** |
| BEA 이익 시리즈 식별 | **O — A051RC / 41** |
| BLS WPSFD4 원래 의미 | **O — Final demand goods** |
| BLS ULC 기간·변환·단위 검증 | **보류** |
| SEC 추가 실측 | **미실시** |
| 무료·상업적 사용·저장·파생 공개 최종 범위 | **행별 확인 전 보류** |
| 기존 E1 점수 산식 변경 | **하지 않음** |
| 사이트 배포 | **하지 않음** |

공식 확인: [M3 API 예시](https://api.census.gov/data/timeseries/eits/m3/examples.html), [M3 변수](https://api.census.gov/data/timeseries/eits/m3/variables.html), [BLS API](https://www.bls.gov/developers/api_signature_v2.htm), [BEA API](https://apps.bea.gov/api/), [Census M3 코드](https://www.census.gov/manufacturing/m3/historical_data/naicshist.pdf).

**작업 범위: 연구·진단 문서만 브랜치에 추가. main 병합·프로덕션 배포 미실시.**
