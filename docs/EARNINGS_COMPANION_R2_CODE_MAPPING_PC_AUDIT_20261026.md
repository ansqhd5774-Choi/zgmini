# ZGMINI 실적 침체 분석 지표 — R2 코드 매핑·PC 중복 확인 (읽기 전용)

- 날짜: 2026-10-26 (KST)
- 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026` (기존 브랜치 유지)
- 대상: `/earnings-recession/`의 정보 제공용 확장형 지표(C)
- 상태: `R2_BEA_BLS_CENSUS_SERIES_MATCH_VERIFIED / PC_REUSE_PARTIAL / R3_NOT_APPROVED / NO_PUBLICATION`
- 상위 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`

## 1. 기존 실측을 재사용해 확정한 범위

1. 사용자 PC의 Fix1 로그에서 BEA, BLS, Census 총 5 API 요청이 HTTP 200이었다. 이것은 공개 지표 사용 승인이 아니라 HTTP 수신 성공이다.
2. Fix2 Census 3회 재검증: QFR `2026-02-01`, MTIS `2026-08-01`, M3 `2026-08-01`이 `time_slot_date`에서 검출됐다. 같은 엔드포인트를 무조건 다시 호출하지 않는다.
3. QFR는 *분기* 통계다. 2026년 공식 QFR 최신 발표는 **2분기**이다. API의 `2026-02-01`을 **2026년 2월** 관측이라고 사이트에 표시하지 않는다. 이번 후속 테스트에서 반환된 `time_slot_name`을 실측 로그로 확인한다.
4. Census 공식 MTIS 2026년 8월 전체 사업체 **재고/매출 비율은 1.33**이다. Fix2 샘플 `SM/MNFCTR`, `IM/RETAIL`은 전체 비율의 식별자로 사용하지 않는다.
5. M3 `IS/MTM/yes=1.48`은 2026년 8월 **제조업 재고/출하 비율** 공식 보도와 일치하나, MTIS 전체 사업체 재고/매출 비율 1.33과 다른 모집단·분모다.
6. Growth 수집기의 M3 `G010/G013/G015/G016` 입력과 BLS `WPSFD4`, SEC E1-R4 등의 저장 경로는 코드로 발견했다. M3 및 E1의 PC 관측기간·실행 메타는 후속 8절의 별도 읽기 전용 로그로 검증했다. BLS `WPSFD4`의 PC 실측값·원천 provenance는 **아직 검증되지 않았다**.

## 2. 추가 작업: 하나의 읽기 전용 CMD (API 최대 2회)

파일(둘 다 같은 폴더):

- `EARNINGS_R2_CODE_PC_AUDIT.cmd` — Windows CMD 실행 진입점.
- `EARNINGS_R2_CODE_PC_AUDIT.mjs` — Node 24+ 기본 라이브러리만 사용, **직접 저장/게시/계산하는 운영 코드를 import하지 않음**.

실행하면 CMD 파일과 같은 폴더에 `EARNINGS_R2_CODE_PC_AUDIT_RESULT_YYYYMMDD-HHMMSSZ.txt`가 생성된다. PC 운영 경로는 기존 `ZGMINI_PC_HOME` 설정 또는 기본 `E:\ZGmini\data\pc-writer`로 해석한다.

| 확인 | 도구/방법 | 비용·쓰기 | 의도 |
|---|---|---|---|
| PC config | `config.json`을 읽고 `source` SHA, PC 운영 상태만 제한 기록 | 0원 / 0쓰기 | 실제 운영 기준과 GitHub 브랜치 소스 차이 확인 |
| PC 최근 진단 | 기존 `local-collection-last-run.json` 등 4개 파일에서 상태·작업명·날짜만 추출 | 0원 / 0쓰기 | 운영 중 수집·게시 상태의 근거 수집 |
| PC 저장 중복 | `storage/core.sqlite`와 `history.sqlite`를 Node `DatabaseSync(...,{readOnly:true})`로 열고 허용 목록 테이블 유무·행 존재 여부만 확인 | 0원 / 0쓰기 | 신규 지표가 기존 Growth/Earnings 입력과 중복 저장되는지 판단할 준비 |
| QFR 코드 | 공식 Census `timeseries/eits/qfr`, `time=2026`, 승인된 기존 키를 사용해 GET 1회 | 무료 공공 API / DB 쓰기 없음 | 최신 슬롯명·`data_type_code`별 표본·산업 `category_code` 파악 |
| MTIS 코드 | 공식 Census `timeseries/eits/mtis`, `time=2026`, 승인된 기존 키를 사용해 GET 1회 | 무료 공공 API / DB 쓰기 없음 | 전체 비율 1.33에 대응하는 코드·카테고리 후보 확인 |

- 공급자 키는 `providers.env`에서 프로그램 메모리로만 읽고 **출력·저장하지 않음**. 요청 전체 URL 및 응답 원문도 로그에 저장하지 않는다.
- HTTP는 **최대 2회**, 각 20초 제한, 응답당 5MB 한도, 리다이렉트 불허. BEA/BLS/M3 재요청하지 않는다. GitHub 소스 수정·새 테이블 생성·예약작업 설치·D1/Cloudflare 호출 없음.
- API 실패·키 부재 시 상태만 기록. PC 데이터에 빈값·0을 채우거나 가공 관측일을 만들지 않는다.
- SQLite 검사 결과 `EXISTS/hasRows`는 최신 자료 확인이나 안전한 재사용을 자동으로 뜻하지 않는다. 개인정보/회사 원시행·테이블 데이터 값은 조회하지 않는다.

## 3. 결과 판정과 다음 단계

| Gate | 현재 상태 | 통과 조건 |
|---|---|---|
| QFR 실제 코드별 값·2026 Q2 슬롯 해석 | **PENDING_PC_LOG** | `time_slot_name`과 공식 발표·자료사전으로 코드/기간 대응 확정 |
| MTIS 전체 재고/매출 1.33 코드 | **PENDING_PC_LOG** | 후보 코드+카테고리+계절조정이 8월 공식 1.33과 대응, 공식 명칭 근거 포함 |
| 기존 PC Growth/E1 원자료 중복 | **PENDING_PC_LOG** | 운영 source SHA 및 실제 데이터 테이블/원장 증거, 필요한 경우 승인된 추가 읽기만 수행 |
| BEA/BLS 코드·단위·변환 | **R2 부분 통과** | 공식 시리즈 해설과 실측 레이블 교차검증 완료 |
| 원자료 저장·상업적 파생 공개권 | **HOLD** | 공급자별 최종 권리 확인 및 필요 고지 판정 |
| R3 원자료 파이프라인 실제 변경 | **NOT_STARTED** | 검증 후 별도 승인 및 설계 Gate |
| 새 공개 응답 키·UI·배포 | **NOT_APPROVED/NOT_STARTED** | 기존 계획 R4·R5·R6 Gate 순차 승인 |

### 공식 자료

- Census Economic Indicators EITS 가이드: https://www2.census.gov/data/api-documentation/EITS_API_User_Guide_Dec2020.pdf
- Census QFR 2분기 발표: https://www.census.gov/econ/qfr/mmws/current/index.html
- Census MTIS 8월 발표(전체 재고/매출 1.33): https://www.census.gov/mtis/current/index.html
- Census M3 8월 발표(제조업 재고/출하 1.48): https://www.census.gov/manufacturing/m3/current/index.html
- Census MTIS 변수 목록: https://api.census.gov/data/timeseries/eits/mtis/variables.html
- Census QFR 변수 목록: https://api.census.gov/data/timeseries/eits/qfr/variables.html
- Census API 이용조건: https://www.census.gov/data/developers/about/terms-of-service.html

**변경 범위: 이 진단 문서 + 독립 CMD/Node 읽기 전용 검사기만 브랜치에 추가. 운영 산식·기존 공개 점수·D1·PC DB·예약작업·메인 브랜치·사이트는 그대로 유지.**

## 4. 실제 Windows 로그 실측 결과 — 2026-10-26 UTC 14:09:09

사용자가 직접 실행한 `EARNINGS_R2_CODE_PC_AUDIT_RESULT_20261026-140909Z.txt`의 결과다.

| 검사 | 실제 결과 | 판정 |
|---|---|---|
| PC 운영 구성 | `source=36266beb3ab942979d9aca7dcdd8af16fb27825b`, `collectionTarget=pc`, `enabled=true` | **O** (이 SHA가 최신 main인지 별도 비교) |
| PC 수집 | UTC 14:00:13, `earnings`, `COMPLETE` | **O** (개별 새 지표 저장과 구분) |
| PC 게시 실행 | UTC 14:03:58, `VERIFIED` | **O** (기존 공개 계약, 새 C 지표 게시와 구분) |
| PC cycle | UTC 14:06:45, `COMPLETE` | **O** |
| `core.sqlite` | `OPENED_READ_ONLY`, Growth R2 3테이블·Earnings E1 4테이블·공개 snapshot 1테이블 모두 데이터 존재 | **O** (구체 관측일은 미확인) |
| `history.sqlite` | `OPENED_READ_ONLY` | **O** |
| Census QFR | HTTP 200, 2026년 9,568행, 최신 4,784행 | **O** |
| QFR 슬롯명 | `Q22026`, 원시 `time_slot_date=2026-02-01` | **O** (공식 2026 **2분기**로 표시) |
| QFR 코드 | `data_type_code` 92종, `category_code` 52종 | **O** (의미는 공식 데이터 사전으로 아래 확정) |
| Census MTIS | HTTP 200, 2026년 512행, 8월 최신 64행 | **O** |
| MTIS 분류 | `MNFCTR`, `RETAIL`, `TOTBUS`, `WHLSLR` | **O** |
| 8월 총 사업체 재고/매출 비율 | `data_type_code=IR`, `category_code=TOTBUS`, `seasonally_adj=yes`, `cell_value=1.33` | **O** (공식 보도와 일치) |
| API 총 호출 수 | **2회**, DB/D1 쓰기·스케줄러/산식 변경 없음 | **PASS_SCOPE** |

단지 **동일 숫자**라는 이유로 `IR/RETAIL/no=1.33`을 채택하지 않는다. 정확한 행은 `IR/TOTBUS/yes=1.33`이다.

## 5. Census 공식 다운로드 자료사전으로 지표 코드와 단위 확정

공식 Census **Business and Industry: Download Data Sets**에 안내된 다음 경로에서 공개 ZIP을 읽기 전용으로 내려받아 포함된 `README`와 CSV 메타데이터를 대조했다. **데이터 다운로드는 검증 환경 내부에서만 수행**했고 PC 원자료·D1·GitHub 저장소에 ZIP 본문을 저장하지 않았다.

- QFR: `https://www.census.gov/econ_getzippedfile/?programCode=QFR` → `QFR-mf.csv` `DATA TYPES` 섹션.
- MTIS: `https://www.census.gov/econ_getzippedfile/?programCode=MTIS` → `MTIS-mf.csv` `CATEGORIES`, `DATA TYPES` 섹션.
- 공식 제공 위치/갱신일: `https://www.census.gov/econ_datasets/` (QFR 2026-09-08, MTIS 2026-10-15).

### QFR 데이터 항목 — 실제 `data_type_code` 의미

| 코드 | 공식 의미 | 원단위 | 정보성 지표 활용 후보 |
|---|---|---|---|
| `101` | Net Sales, Receipts, and Operating Revenues | `MLN$` | 매출, 매출 증감률 |
| `104` | Income (Loss) from Operations | `MLN$` | 영업손익, 영업이익률 |
| `105` | Interest Expense | `MLN$` | 이자 비용 부담 |
| `111` | Income (Loss) Before Income Taxes | `MLN$` | 세전 손익 |
| `115` | Income (Loss) After Income Taxes | `MLN$` | 세후 손익, 순이익률 |
| `214` | Inventories | `MLN$` | 재고 수준(분기 재무 기준) |
| `223` | Total Assets | `MLN$` | 자산 규모 / 자산수익성 지표 후보 |
| `TCA` | Total Current Assets | `MLN$` | 유동자산 |
| `TCL` | Total Current Liabilities | `MLN$` | 유동부채 |
| `TL` | Total Liabilities | `MLN$` | 부채 부담 |

QFR의 92개 `data_type_code`는 **재무 원항목 46개 + 그 항목에 상응하는 `E_...` 표준오차/상대오차 46개**다. `E_115` 같은 불확실성 척도를 세후 이익의 또 다른 1개 원항목으로 집계하거나 산업에 중복 가산해서는 안 된다.

QFR는 52개 산업 코드가 계층을 이룬다(`MFG` 전체 제조업과 여러 제조업 하위 산업 등). 따라서 52개를 독립적 산업 수라고 간주해 **부진 산업 비중을 분모 52로 계산하면 중복**이 된다. 향후 파생 breadth는 상위/하위 산업 계층과 겹침 여부를 따로 검증해야 한다. `101`, `104`, `115`의 마진 산출은 **동일 산업·분기·조정 상태·단위**를 조인하여야 하며, 손실·음수·분모 0 등을 구분한다.

Windows QFR API 표본의 조정표시가 `no`임을 확인했다. Census 2026 Q2 보도 제목의 **계절조정(SA)** 값과 **미조정(NSA)** API 행을 숫자 일치 검사 없이 동일 자료라고 표현하지 않는다.

### MTIS 데이터 항목 — 실제 `data_type_code` 의미

| 코드 | 공식 의미 | 단위 |
|---|---|---|
| `SM` | Sales - Monthly | `MLN$` |
| `IM` | Inventories - Monthly | `MLN$` |
| `IR` | Inventories/Sales Ratio | `RATIO` |
| `MPCSM` | Sales - Monthly Percent Change | `PCT` |
| `MPCIM` | Inventories - Monthly Percent Change | `PCT` |

오차코드 `E_IR`은 **재고/매출 비율의 표준오차**이고 `IR` 값 자체가 아니다. `TOTBUS`는 자료사전상 **Total Business**, `yes`는 계절조정 자료이므로 `IR/TOTBUS/yes`가 원하는 정식 총계의 정확한 Selector다.

공식 `README`가 요구하는 사항: 원래 통계의 **표시 정밀도를 임의로 바꾸지 말 것**, **출처 U.S. Census Bureau와 원천 프로그램 QFR/MTIS의 명칭을 표시할 것**. API 자체의 비보증 고지는 별도로 보존한다. 상업적 저장/파생 공개 최종 Gate는 여전히 소스별로 판정해야 한다.

## 6. 갱신한 R2 게이트

| 게이트 | 상태 | 이유 |
|---|---|---|
| QFR 실제 분기 | **O** | `Q22026` 슬롯명 + 공식 2분기 발표 |
| QFR 매출/영업손익/세후손익 코드와 단위 | **O** | 공식 ZIP 사전 + API에 해당 코드 2026Q2 행 존재 |
| MTIS 총사업체 재고/매출 비율 | **O** | `IR/TOTBUS/yes=1.33` + 공식 원단위/분류 + 8월 발표 |
| QFR 전년 대비 성장·이익률의 시차/이상값·수정본 정책 | **PENDING** | 2025 동기값·공시 리비전·유효 분모 확인 전 |
| 기존 PC Growth/Earnings 테이블 | **O_EXISTS** | 실제 DB 테이블과 데이터 존재 |
| 기존 PC 각 지표의 최신 관측일·중복값 | **O_OBSERVATION_METADATA / VALUES_NOT_CHECKED** | 후속 8절: 일부 Growth/E1 실제 관측기간·메타 검증, 데이터 값·원시 payload는 미확인 |
| 라이선스·권리 최종 | **CONDITIONAL** | 공식 기관 고지 준수·제3자 자료 예외·상업 저장/파생 공개 범위 최종 검토 |
| R3 실제 저장/가공 및 R4–R6 사이트 작업 | **미실행** | 계획 순서대로 선행 Gate 통과·별도 승인 필요 |

**다음: 새 API 재호출 없이 운영 PC의 이미 존재하는 Growth/Earnings 테이블에서 정확한 최근 관측기간·지표 식별자·원천/가용성만 최소 읽기 전용 검증하고, PC 재사용/새 수집 필요 행을 구분한다.**

## 7. PC 데이터 최신성 확인기 준비 (별도 API 0회)

앞선 CMD는 보호를 위해 테이블 **존재·행 존재**만 확인했다. 이는 실제 관측기간이나 신규 수집 중복 여부를 입증하지 못한다. 이 마지막 R1/R2 미해결 지점에만 별도의 제한된 검사기를 준비했다.

- 파일: `research/earnings-companion/EARNINGS_R2_PC_FRESHNESS_READONLY.cmd` 및 `.mjs`.
- 사용자 Windows CMD 실행 후 CMD와 **동일 폴더**에 `EARNINGS_R2_PC_FRESHNESS_RESULT_YYYYMMDD-HHMMSSZ.txt`만 생성.
- **API 0회**, Census/BEA/BLS/SEC 전부 재요청 없음. 기존 PC `core.sqlite`만 SQLite의 `readOnly:true` 및 `PRAGMA query_only=ON`으로 열고 닫음.
- Growth 현재 원장에서 `candidate_id`, `observation_date`, 관측기간, 사용 원천, 단위, 수집 시각만 출력; `G010/G013/G015/G016/G018` 포함 현존 항목을 확인.
- M3 저장 Snapshot 원장의 **공급그룹/최종 수집 시각**만 출력. JSON 원문·요청 URL·키·수치 원자료는 읽거나 출력하지 않음.
- Earnings E1-R4 최근 실행의 결산기간·성공 여부·표본건수와 Universe의 모집단/발표일 메타데이터만 제한 조회. 기업명·CIK·기업 재무 수치는 조회하지 않음.
- QFR·MTIS 전용 테이블명 존재 여부만 별도 조회(이름이 없더라도 다른 범용 Snapshot에 없다는 뜻은 아님).
- 사용자가 PC 검사를 완료하면 이미 생성한 공식 시리즈 Selector와 결합해 **재사용 가능/새 수집 검토/보류**를 행별로 확정한다.

**현재 상태: CMD 코드·ZIP 기본검증 PASS, 실제 Windows PC 로그 수신·분석 완료(8절).** R3 저장·파생 구현이나 R4 공개키 변경은 별도 승인 전 실행하지 않는다.

## 8. Windows R2 PC 실제 최신성 로그 — 2026-10-26 14:30:41 UTC

사용자 제출: `EARNINGS_R2_PC_FRESHNESS_RESULT_20261026-143041Z.txt`.
기존 `core.sqlite`를 **읽기 전용**으로 검사한 결과다. 신규 API 0회, 운영 SQLite·D1·스케줄러·산식 변경 0회. 이번 원장은 **관측기간/원천/시점/집계 커버리지 메타데이터만** 포함하고, 원자료 숫자나 기업별 행·원본 JSON/URL은 확인하지 않았다.

| 검사 지점 | PC 실측 내용 | 정밀 판정 |
|---|---|---|
| Growth R2 현재 메타 | `candidate_id <= G070` 탐색 대상에서 현재행 **24개** | 실측. 전체 Growth 후보가 24개라는 뜻은 아님 |
| M3 제조업 주문·출하·재고 | `G010` 총 신규주문, `G013` 총 출하, `G015` 미이행주문, `G016` 전체 재고: 관측 `2026-08`, `Census_M3`, `MONTHLY`, `USD_BILLION_SA_NOMINAL`; 행 `retrieved_at=2026-10-15T12:15:05.739Z` | **기존 저장 후보 O**, 신규 원천 중복 수집 제한. 실제 수치/수정본 parity는 별도 검증 필요 |
| M3 재고 파생 | `G017` 신규주문/재고, `G018` 출하/재고: 관측 `2026-08`, `retrieved_at=2026-10-02T14:20:53.819Z` | **재검증 필요**: 상응 원자료 `G010/G013/G016`의 10/15 저장시각보다 오래됨. 값이 구판인지 여부는 미검증 |
| M3 기존 provider snapshot | `Census_M3:MDM/MTM/NXA=2026-10-08T12:45:03.460Z`, `MTU=2026-10-01T20:50:30.670Z` | source-group 시각만 확인. Growth 항목별 10/15과의 계보 일치 단정 금지 |
| E1-R4 최근 PC 성공 | `period_end=2026-06-30`; 10/25–10/26 최근 실행 4건 모두 `SUCCESS`, 최신 완료 `2026-10-26T14:00:13.148Z`, `provider_requests=10` | **기존 E1 실행/저장 O**. 이 로그는 새 정보성 C의 공개를 의미하지 않음 |
| E1 우주(universe) | 최신 기간 `2026-06-30`: `security_count=503`, `issuer_count=500`; 그 이전 `2026-03-31`, `2025-12-31` 기간도 존재 | 보안·발행사 단위 혼동 금지. SEC 500개 기업 표본과 Census QFR 산업별 모집단은 다름 |
| E1 항목별 개수 | 최신 성공 `eps_count=420`, `revenue_count=409`, `margin_count=319`, `current_rows=1153` | 500 발행사 대비 **단순 비율** EPS 84.0%, 매출 81.8%, 마진 63.8%. 고유 발행사 일대일 커버리지·상호 동일 표본은 이번 로그로 확인되지 않음 |
| QFR·MTIS 전용 스키마명 | `DEDICATED_QFR_MTIS_TABLE_NAMES=NOT_FOUND_NAME_ONLY` | **전용 테이블명 미발견**. 범용 snapshot/JSON에 없다는 증거는 아님 |
| 검사 범위 | `PC_TABLE_CONTENTS=ONLY_METADATA_NO_VALUES_NO_PROVENANCE_JSON_NO_RAW_PAYLOAD` | 값/중복 해시/lineage에 대한 실측 검증은 수행하지 않음 |

### 8-1. 재사용·추가 수집 검토 구분 (정보성 C만 대상)

| 지표군 | 현재 기존 자료·최신 관측 | 실행 방향 | 확인 전 금지할 주장 |
|---|---|---|---|
| **M3 제조업 주문·출하·재고** | `G010/G013/G015/G016`, **2026-08** | **REUSE_PATH_CONFIRMED**: 새 M3 전체 중복 수집기 생성 불필요. R3 승인 후 PC 원장 입력을 그대로 참조하는 방식을 설계 | 원장 관측일만으로 실제 수치·공표판(version) 동등성 주장 금지 |
| **M3 파생 재고 비율** | `G017/G018`, **2026-08**, 원자료보다 이른 `retrieved_at` | **CHECK_REVISION_PARITY**: 기존 산식 변경 없이 과거/신규 버전의 계보와 값/시각을 별도 비교 | 같아 보이는 월만으로 최신 원자료와 동기화됐다고 주장 금지 |
| **MTIS 전체 재고/매출 비율** | API `IR/TOTBUS/yes`, **2026-08**, 공식 1.33; 전용 DB 이름 미발견 | **COLLECTOR_REVIEW_NEEDED**: 현재 전용 테이블이 없어 기존 범용 원장 재사용 가능성 확인 후에만 R3 별도 수집 제안 | M3 재고/출하 `IS/MTM/yes` 1.48 대체 불가 |
| **QFR 매출·손익/마진** | API `2026Q2`, `101/104/115` 코드; 전용 DB 이름 미발견 | **COLLECTOR_REVIEW_NEEDED**: 52개 중첩 산업코드 계층, 분기별 비교 가능성, 비계절조정 자료 확인 후 단계적 수집 제안 | 52개 산업을 독립 표본으로 계산하거나 NSA=SA로 처리 불가 |
| **기존 E1-R4 기업 EPS·매출·마진** | PC `2026-06-30` / 500 발행사 / 항목 메타 일부 | **REUSE_PATH_CONFIRMED**: 기존 E1 점수·공개키는 불변. C는 승인 시 독립 정보성 가공/읽기 모델로만 사용 검토 | 500개 모두 모든 항목을 확보했다거나 2026Q3 데이터가 저장됐다고 주장 금지 |
| **BEA 기업이익, BLS PPI/ULC** | BEA `A051RC`, BLS `WPSFD4`, `WPSFD41`, `PRS85006111`: 후속 2회 API 실제 값·단위 공식 대조 완료(11절). PC 기존 SQLite 중복은 미검증 | **R2_SERIES_MATCH_PASS / PC_REUSE_UNKNOWN**: 새 원천 수집 필요 여부는 R3 설계 선검증 | 기존 `BLS_CES`를 단위노동비용/PPI라고 표기 금지 |
| **SEC 현금흐름·산업별 분포** | E1-R4 EPS/매출/마진 수집 메타만 확인 | **R2_EXTENSION_HOLD**: 해당 원시 XBRL 항목·기업수·재사용 범위 미검증 | E1 성공만으로 현금흐름·FCF 수집 성공으로 간주 불가 |

### 8-2. 계획 게이트와 후속 순서

1. **R1 기존 경로 인벤토리:** M3 및 E1 저장 경로/관측 메타는 근거 확보. QFR/MTIS 범용 Snapshot 내 중복 여부, BEA/BLS/SEC 원시 시리즈는 아직 **부분 미확인**.
2. **R2 실제 API·시리즈:** QFR `2026Q2`, MTIS `2026-08 IR/TOTBUS/yes`, M3 `2026-08`의 관측기간·정의 일부 **PASS**. 공급자별 상업적 저장·파생 공개권/표시 고지, BEA/BLS 완전한 line/series/단위, QFR 2025Q2 비교·revision 계보, SEC 현금흐름 커버리지 등은 **행별 HOLD**. 전체 R2 무조건 PASS 아님.
3. **R3 PC 저장/가공:** 승인 전 **NOT_STARTED**. 먼저 `M3/E1 기존 원장 참조`와 `MTIS/QFR 신규 수집 필요성`을 구분해 최소 설계를 제안. 운영 SQLite·D1 테이블/스케줄러·E1 점수 무단 변경 없음.
4. **R4 신규 정보성 읽기 모델/키:** **NOT_APPROVED**. 기존 `/api/earnings-recession-detail` 계약에 임의 필드 합류 금지.
5. **R5 UI 및 R6 PR·Production:** **NOT_STARTED**. 기존 승인 없이 개발/공개하지 않음.

**자료 출처:** 사용자 Windows 읽기 전용 로그 `EARNINGS_R2_PC_FRESHNESS_RESULT_20261026-143041Z.txt`; U.S. Census Bureau [MTIS 2026년 8월](https://www.census.gov/mtis/current/index.html), [QFR 2026년 2분기](https://www.census.gov/econ/qfr/mmws/current/index.html), [M3](https://www.census.gov/manufacturing/m3/current/index.html).

**변경 영향:** 기존 GitHub 작업 브랜치의 검증 보고 문서만 수정. PC DB·새 API 호출·산식·스케줄러·D1·Production 게시 없음.


## 9. R2 추가 공식 교차검증 — PPI 시리즈명 충돌 및 상업 고지

**BLS WPSFD4 라벨 정정 필요 (실제 신규 지표 선택 전 HOLD):**

- BLS의 공식 FD-ID series ID 목록은 `WPUFD4 = Final demand (최종수요 전체)`, `WPUFD41 = Final demand goods (최종수요 재화)`로 구분한다. 해당 BLS 문서는 계절조정 시 `WPU`를 `WPS`로 대체한다고 직접 명시한다. 따라서 **`WPSFD4 = 계절조정 최종수요 전체`**, **`WPSFD41 = 계절조정 최종수요 재화`**로 읽는 것이 코드 규칙에 부합한다.
- 이전 R2 검색에서 발견한 BLS 과거 계절조정표에는 `WPSFD4`를 `Final demand goods`라고 적은 항목도 있었다. **공식 페이지 사이 라벨 충돌**이 있으므로 이 검증만으로 기존 공개/수집 `WPSFD4` 값을 재명명하거나 `WPSFD41`로 교체하지 않는다. 실제 공식 BLS API 응답의 `seriesID`, 관측값, 현행 series title 확인 전 C 지표의 정확한 제목은 **HOLD_LABEL_PARITY**.
- **이 보고서 3절·BEA/BLS 타 문서에서 `WPSFD4`가 재화 전체만 뜻한다는 기존 서술은 확정 근거로 사용하지 않는다.** 실제 지표명의 정합성은 운영 원자료와 대조해야 한다.
- BLS `PRS85006111`는 비농업 부문 전체 근로자 단위노동비용 시리즈 후보로 외부 FRED 재현 화면에서 명칭이 확인되지만, **원 공급원 BLS API 실제 시리즈 ID/단위·연율화 여부 확인 전** R2 HTTP·정식 가공 규칙 확정으로 표시하지 않는다.
- BEA `A051RC`는 IVA/CCAdj 조정 기업이익의 series code 후보이며, 실제 사용 후보 `T11200` 행별 적용기간·조정/단위 확인 전 정보성 C 게시 보류.

**Census 서비스 출처 고지:** 공식 API 약관은 서비스 내 Census API 이용 사실, Census가 상품을 후원·인증하지 않는다는 취지의 **눈에 잘 보이는 고지**를 요구한다. 향후 `/data-sources/`와 C 정보성 패널에 이 요건을 반영한 표시안을 제안하되, **새 UI·공개 필드 변경은 R4/R5 승인 후** 적용한다. 데이터셋별 저장/파생/상업 이용 최종 판정은 계속 조건부 보류한다.

1차 공식 근거:
- BLS FD-ID ID 목록: https://www.bls.gov/ppi/fd-id/ppi-final-demand-intermediate-demand-aggregation-indexes-by-title-and-series-id.htm
- BLS 계절조정 series 명칭표: https://www.bls.gov/web/ppi/ppi-fdidsf.htm
- 과거 계절조정표(충돌 사례): https://www.bls.gov/ppi/tables/final-demand-intermediate-demand-aggregation-index-seasonal-factors-2020-2024.htm
- BLS 노동생산성/단위노동비용: https://www.bls.gov/charts/productivity-and-costs/nonfarm-business-sector-labor-costs-percent-change.htm
- Census API ToS: https://www.census.gov/data/developers/about/terms-of-service.html

**변경 영향:** 공식 메타데이터 교차검증과 문서 기록만 수행. API 0회, PC DB/D1/운영 수집기·산식·사이트 수정 0회.


## 10. 후속 R2 BEA/BLS 값·단위 확인기 준비 (Windows PC 대기)

이전 BEA/BLS 응답의 `HTTP=200`만으로 정확한 `SeriesCode/LineNumber/Unit` 및 `BLS SeriesID/Period` 일치를 주장할 수 없으므로, **가장 작은 추가 호출**로 두 공급원의 실제 시리즈를 확인하는 읽기 전용 검사기를 준비했다.

- `research/earnings-companion/EARNINGS_R2_BEA_BLS_SERIES_VERIFY.cmd`
- `research/earnings-companion/EARNINGS_R2_BEA_BLS_SERIES_VERIFY.mjs`
- 배포 파일: `EARNINGS_R2_BEA_BLS_SERIES_VERIFY_20261026.zip` (CMD+MJS, 사용자 PC에서 같은 폴더에 압축 해제)
- 실행 로그: `EARNINGS_R2_BEA_BLS_RESULT_YYYYMMDD-HHMMSSZ.txt` — **CMD 파일과 같은 폴더**에만 생성.
- **최대 API 2회(재시도 없음)**: BEA NIPA `T11200` `2025,2026` 분기 GET 1회, BLS v2 `WPSFD4/WPSFD41/PRS85006111` 일괄 POST 1회. 둘 다 기존 승인 키를 `providers.env` 또는 환경에서 메모리로만 읽는다. 키가 없으면 해당 공급원 요청 **0회**.
- **각 요청 20초·응답 3MB 상한**, redirect 불허, 로그인/설치/유료 결제/클라우드 게시 없음. API 키/쿼리 URL/원본 응답 전문 로그 **기록 금지**. 출처 공식 기관 외 도메인 미사용.
- BEA는 `SeriesCode=A051RC` 행이 실측 존재하는지와 해당 분기·단위/원값 메타만 기록하고, 불일치 시 후보 line 이름만 제한 출력. BLS는 3개 ID의 최근 기간·공공 집계 원값만 제한 출력. **BLS API 응답은 이름(label)을 돌려주지 않을 수 있으므로 공식 ID 목록과 별개로 검증**한다. BLS 지수 수준을 연율 변화율로 임의 변환하지 않는다.
- Node 24+ 내장 기능만 사용; 코드 문법 검사, `--dry-run` 무호출 시험, ZIP 무결성 **PASS**.
- 실행 후 로그를 받아서 결과를 정확한 데이터 정의와 매핑하는 것이 **다음 R2 작업**이다. **새 DB/스케줄러/R3 구현이나 사이트 배포는 여전히 미승인**이다.



## 11. BEA·BLS 실제 호출 결과 — 사용자 Windows 로그 2026-10-26 14:52:13 UTC

대상 증빙: `EARNINGS_R2_BEA_BLS_RESULT_20261026-145213Z.txt`. **BEA HTTP 200, BLS HTTP 200/REQUEST_SUCCEEDED**, API 요청 합계 2회, DB/D1/산식/스케줄 변경 없음. 사용자 로그는 API 키나 요청 URL을 출력하지 않았다.

| 공식 시리즈 | PC 실제 원값 | 공식 발표 대조 | R2 판정 |
|---|---|---|---|
| BEA NIPA `T11200/A051RC`, `LineNumber=41`, `UNIT_MULT=6` | `2026Q2`, `4,709,453` (백만 USD, Current Dollars) | **4,709.453십억 USD**, BEA 공식 기업이익 **4,709.5십억 USD**와 반올림 일치. 계절조정 **연율(SAAR)** 시계열 | **PASS_VALUE_UNIT_PERIOD** |
| BLS `WPSFD4` | `2026M09`, 지수 **159.780** | BLS 2026년 9월 PPI 공식 표의 **최종수요 전체 FD4 = 159.780** 일치, 계절조정 | **PASS_VALUE_SCOPE_PERIOD** |
| BLS `WPSFD41` | `2026M09`, 지수 **162.341** | 같은 표의 **최종수요 재화 FD41 = 162.341** 일치, 계절조정 | **PASS_VALUE_SCOPE_PERIOD** |
| BLS `PRS85006111` | `2026Q02`, **1.4%** | BLS 생산성·비용 공식 보고의 **비농업 단위노동비용 전년 동기 대비 +1.4%** 일치 | **PASS_YOY_PERIOD_UNIT** |

### 반드시 지킬 중복·단위 구분

1. **BEA 동일 지표 중복 행:** 2025Q1–2026Q2는 6개 분기인데 `A051RC`는 **12행** 검색됐다. 공식 BEA Table 1.12에는 *같은 총기업이익*이 line **13과 41**에 중복 배치된다. 별도 두 이익 지표/기업 표본으로 더하지 않는다. 실제 PC 수집 규칙은 R3에서 정확한 `table/series/period`별 유일화 후 승인한다. 최신 로그의 `LineNumber=41`은 유일한 canonical line이라는 확정 근거가 아니다.
2. **BEA 원 단위:** `UNIT_MULT=6`이므로 `4,709,453`은 USD 자체가 아니라 백만 USD 단위다. 공식 시각화 **4,709.5십억 USD**의 산식/표현과 일치한다. **연율화된 계절조정 분기 값**이므로 분기 실제 총수익과 혼동 금지. 원시 정밀도는 저장 시 바꾸지 않는다.
3. **BLS PPI 명칭:** 현재 실측으로 이전 9절의 임시 `HOLD_LABEL_PARITY`를 **해소**했다. `WPSFD4 = 최종수요 전체`, `WPSFD41 = 최종수요 재화`. 오래된 별도 BLS 표의 제목만으로 이전 공개 산식/값을 교체하지 않는다. 공식 발표 수치와 Series ID 둘 다 대조 완료.
4. **BLS 단위노동비용:** API의 **1.4%는 전년 동기 대비(4분기 변동)**. 공식 보고의 **전기 대비 연율 +1.2%**와 다른 측정 기간이다. 이를 같은 숫자라고 처리하거나 자동 연율화하지 않는다.
5. **기존 PC 재사용:** 이번 BEA/BLS 테스트는 공식 API 값을 PC 검사 도구가 메모리에서 읽었으며 **SQLite에 저장했다는 증거가 아니다**. Growth 저장 `BLS_CES`와 BLS PPI/ULC는 다른 시리즈. 새 수집기를 만들기 전에 기존 Generic Snapshot 내 유무를 R3 사전 단계에서 조사한다.

### 권리·공개 게이트

- BEA 공식 원자료: 별도 제3자 권리 표시가 없다면 **퍼블릭 도메인 재사용** 원칙 확인. 출처 기재 권장.
- BLS 공식 원자료: 일반 **퍼블릭 도메인**(제3자 사진·그래픽·기관 로고 제외). API 사용자는 **접근일을 표시**하고, 다운로드 뒤 ZGMINI가 수행한 파생분석을 BLS가 보증하지 않는다는 **명확한 고지**를 해야 한다.
- Census QFR/MTIS/M3: API 이용은 가능하지만 **API 이용 사실과 비후원 고지, 수정/오표기 금지, 응답자 비식별** 등 별도 조건이 있어 기존 `CONDITIONAL` 유지. 자료 저장·파생·상업 이용 범위와 사이트의 실제 고지안을 R3·R4 검토 때 확인한다.
- 기존 E1-R4와 SEC 확장: **새 원시 기업별 현금흐름/FCF 수집 여부는 미검증**. E1 성공만으로 SEC 기업 지표 전체 준비 완료라고 주장하지 않는다.
- 위 4개 BEA/BLS 시리즈는 **R2 값·범위·단위 PASS**. 하지만 PC 기존 저장/수정치·공개 계약·UI/사이트 배포는 **별도 승인 전 HOLD**.

### 다음 단계 경계

**R2 값·정의 테스트를 반복하지 않는다.** 기존 보고서 8절의 M3/E1 재사용 항목을 유지하면서, 2026Q2 QFR 비교 가능성·권리/고지·현재 범용 PC 저장 중복을 기준으로 **R3 최소 수집·원자료/파생 설계**를 제안한다. **R3 PC 쓰기, 새 테이블, 스케줄 등록, 공개 키, D1, UI/Production은 미승인 상태**다.

### 공식 근거

- BEA 기업이익 2026Q2 4,709.5십억 USD: https://www.bea.gov/data/income-saving/corporate-profits
- BEA Table 1.12 line 13/41 및 SAAR: https://apps.bea.gov/iTable/?categories=survey&isuri=1&nipa_table_list=+53&reqid=19&step=3
- BEA 공공영역: https://www.bea.gov/help/faq/147
- BLS PPI 2026-09 FD4/FD41: https://www.bls.gov/news.release/ppi.t03.htm
- BLS 비농업 단위노동비용 2026Q2: https://www.bls.gov/news.release/prod2.nr0.htm
- BLS 공공영역: https://www.bls.gov/opub/copyright-information.htm
- BLS API 이용조건: https://www.bls.gov/developers/termsOfService.htm
- Census API 이용조건: https://www.census.gov/data/developers/about/terms-of-service.html
