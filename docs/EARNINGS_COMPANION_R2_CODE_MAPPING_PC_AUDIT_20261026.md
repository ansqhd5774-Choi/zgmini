# ZGMINI 실적 침체 분석 지표 — R2 코드 매핑·PC 중복 확인 (읽기 전용)

- 날짜: 2026-10-26 (KST)
- 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026` (기존 브랜치 유지)
- 대상: `/earnings-recession/`의 정보 제공용 확장형 지표(C)
- 상태: `CMD_READY / WINDOWS_RESULT_PENDING / NO_PUBLICATION`
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
