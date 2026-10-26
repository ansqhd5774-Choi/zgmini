# 실적 침체 보조지표 — R2 Windows API 실측 결과 (2026-10-26)

- 대상: ZGMINI `/earnings-recession/`의 **정보성 보조지표** 연결 전 읽기 전용 검증
- 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026`
- 증거: 사용자가 PC에서 실행한 `EARNINGS_R2_READONLY_PROBE_RESULT.txt` (UTC 2026-10-26T13:11:10.898Z)
- 실행 범위: 공식 API 요청 **5회** (BLS 2개 시리즈를 1회 POST로 묶음), PC provider 파일 발견, **DB·D1·스케줄러·기존 점수 산식 쓰기 없음**
- 상태: **LIVE_HTTP_CHECKED / SERIES_GATES_PARTIAL / NO_SITE_PUBLICATION**

## 실측 응답 (로그로 증명된 사실만)

| API / 후보 | HTTP | 응답 건수 | 최신 실제 관측일 | 판정 |
|---|---:|---:|---|---|
| Census QFR | 200 | 9,568행 | **UNKNOWN** (`time_slot_id=0`은 날짜가 아님) | HTTP_O / METRIC_CODE_PENDING |
| Census MTIS | 200 | 512행 | **UNKNOWN** (`time_slot_id=0`은 날짜가 아님) | HTTP_O / METRIC_CODE_PENDING |
| Census M3 | **400** | — | UNKNOWN | **HTTP_X / PROBE_QUERY_FIX_AND_RETRY** |
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
2. **M3 HTTP 400 원인 가설**: 검사기의 M3 요청에는 공식 API 예시에서 쓰는 `for=us:*`가 없었음. 기존 Growth 수집 코드도 `for=us:*`를 사용. **누락 수정 후 재시도 전에는 원인 확정 불가**. M3 코드 `MTM`은 공식 제조업 총계 계열로 문서화돼 있음.
3. **QFR·MTIS 매핑**: 응답 행의 `data_type_code/category_code/seasonally_adj`를 공식 코드표에 대조하여 매출·순이익·재고비율 개념을 정확히 판정. 9,568/512행 성공만으로 원하는 지표가 확보됐다고 인정하지 않음.
4. **검사기 Fix1**: 기존 CMD 및 JS 2파일의 **조회·로그만 수정**. 5요청 상한 그대로. 재실행 시 보안상 키·원문 응답 미출력, 로그는 CMD 옆에 TXT 생성.
5. **라이선스와 공개범위**: 국가통계 원본이라고 모든 행의 상업적 저장·파생·재공개를 자동 승인할 수는 없음. 각 확정 행의 공식 기관 조건 및 3자 자료 혼입 여부를 마지막으로 확인한 다음 사이트에 정보성으로만 편입.

## 릴리스 게이트

| 게이트 | 현재 |
|---|---|
| PC의 기존 키로 공식 API HTTP 확인 | **4/5요청 HTTP 200** |
| M3 실제 HTTP 성공 | **X — Fix1 재검사 필요** |
| QFR·MTIS 날짜와 지표 코드 일치 | **보류** |
| BEA 이익 시리즈 식별 | **O — A051RC / 41** |
| BLS WPSFD4 원래 의미 | **O — Final demand goods** |
| BLS ULC 기간·변환·단위 검증 | **보류** |
| SEC 추가 실측 | **미실시** |
| 무료·상업적 사용·저장·파생 공개 최종 범위 | **행별 확인 전 보류** |
| 기존 E1 점수 산식 변경 | **하지 않음** |
| 사이트 배포 | **하지 않음** |

공식 확인: [M3 API 예시](https://api.census.gov/data/timeseries/eits/m3/examples.html), [M3 변수](https://api.census.gov/data/timeseries/eits/m3/variables.html), [BLS API](https://www.bls.gov/developers/api_signature_v2.htm), [BEA API](https://apps.bea.gov/api/), [Census M3 코드](https://www.census.gov/manufacturing/m3/historical_data/naicshist.pdf).

**작업 범위: 연구·진단 문서만 브랜치에 추가. main 병합·프로덕션 배포 미실시.**
