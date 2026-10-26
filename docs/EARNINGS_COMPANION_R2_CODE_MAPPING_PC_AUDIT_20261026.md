# ZGMINI 실적 침체 분석 지표 — R2 코드 매핑·PC 중복 확인 (읽기 전용)

- 날짜: 2026-10-26 (KST)
- 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026` (기존 브랜치 유지)
- 대상: `/earnings-recession/`의 정보 제공용 확장형 지표(C)
- 상태: `R2_QFR_MTIS_SERIES_IDENTIFIED / PC_FRESHNESS_PENDING / NO_PUBLICATION`
- 상위 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`

## 1. 기존 실측을 재사용해 확정한 범위

1. 사용자 PC의 Fix1 로그에서 BEA, BLS, Census 총 5 API 요청이 HTTP 200이었다. 이것은 공개 지표 사용 승인이 아니라 HTTP 수신 성공이다.
2. Fix2 Census 3회 재검증: QFR `2026-02-01`, MTIS `2026-08-01`, M3 `2026-08-01`이 `time_slot_date`에서 검출됐다. 같은 엔드포인트를 무조건 다시 호출하지 않는다.
3. QFR는 *분기* 통계다. 2026년 공식 QFR 최신 발표는 **2분기**이다. API의 `2026-02-01`을 **2026년 2월** 관측이라고 사이트에 표시하지 않는다. 이번 후속 테스트에서 반환된 `time_slot_name`을 실측 로그로 확인한다.
4. Census 공식 MTIS 2026년 8월 전체 사업체 **재고/매출 비율은 1.33**이다. Fix2 샘플 `SM/MNFCTR`, `IM/RETAIL`은 전체 비율의 식별자로 사용하지 않는다.
5. M3 `IS/MTM/yes=1.48`은 2026년 8월 **제조업 재고/출하 비율** 공식 보도와 일치하나, MTIS 전체 사업체 재고/매출 비율 1.33과 다른 모집단·분모다.
6. Growth 수집기의 M3 `G010/G013/G015/G016` 입력과 BLS `WPSFD4`, SEC E1-R4 등의 저장 경로는 코드로 발견했지만, PC 운영 SQLite의 현재 자료 존재/관측일은 아직 검증되지 않았다.

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
| 기존 PC 각 지표의 최신 관측일·중복값 | **PENDING** | 첫 검사에서 원장 값을 읽지 않도록 제한됨 |
| 라이선스·권리 최종 | **CONDITIONAL** | 공식 기관 고지 준수·제3자 자료 예외·상업 저장/파생 공개 범위 최종 검토 |
| R3 실제 저장/가공 및 R4–R6 사이트 작업 | **미실행** | 계획 순서대로 선행 Gate 통과·별도 승인 필요 |

**다음: 새 API 재호출 없이 운영 PC의 이미 존재하는 Growth/Earnings 테이블에서 정확한 최근 관측기간·지표 식별자·원천/가용성만 최소 읽기 전용 검증하고, PC 재사용/새 수집 필요 행을 구분한다.**
