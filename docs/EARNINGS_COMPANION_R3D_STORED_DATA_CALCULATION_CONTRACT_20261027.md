# ZGMINI 실적 침체 정보성 C — R3-D 저장 원본 기반 계산/검증 계약 (승인 제안)

- 기준일: 2026-10-27 KST
- Repo/유일 작업 브랜치: `ansqhd5774-Choi/zgmini` / `codex/earnings-api-site-integration-plan-r1-20261026`
- 현재 단계: **R3C_BLS_PC_STORE_VERIFIED / R3D_CALCULATION_NOT_YET_AUTHORIZED**
- 근거: `EARNINGS_R3C_BLS_STORE_ONCE_RESULT_20261026-170253Z.txt`
- 관련 기록: `docs/EARNINGS_COMPANION_R3C_BLS_MANUAL_STORE_IMPLEMENTATION_20261027.md`, `docs/EARNINGS_COMPANION_R3B_STORAGE_CONTRACT_PROPOSAL_20261027.md`
- 절대 불변: E1-R4 실적 침체 A의 4개 입력·점수·과거점수, 12대 기업 실적 B, E1-R5 Shadow, Growth 산식, 기존 FRED cache, PC SQLite schema, TTL, 자동 스케줄, D1/API/화면, main.

## 1. R3-C 확정된 실제 결과

| source | 원자료의 의미 | 관측 건수 | PC 저장 |
| --- | --- | ---: | --- |
| `BLS/WPSFD4` | 전체 최종수요 PPI **계절조정 월 지수** | 21 | snapshot 1 + chunk 1 |
| `BLS/WPSFD41` | 최종수요 **재화 PPI** 계절조정 월 지수 | 21 | snapshot 1 + chunk 1 |
| `BLS/PRS85006111` | 비농업 기업 단위노동비용 **전년 동분기 대비 변화율 %** | 6 | snapshot 1 + chunk 1 |

- 공식 BLS v2 API 통합 요청: **1회**, `DB_TRANSACTION_COMMITTED=YES`, `SERIES_READBACK_VERIFIED=3`.
- **이 로그로 확정할 수 없는 것:** 실제 최초/최종 관측월·분기, 누락 없는 연속성, 전년 동월 비교가능 개수, 값 정합성. 개수만으로 21개월/6분기 **연속**이라고 단정하지 않는다.
- FRED 경유 `PPIFIS`/`PRS85006111` 데이터는 정보성 C의 신규 BLS 직접 데이터와 섞지 않는다.

## 2. 다음 계산의 원칙: 추가 인터넷/API 0, 운영 DB 쓰기 0

1. PC의 기존 `api_history_snapshots_v1`·`api_history_chunks_v1`에서 **`provider='BLS'` 및 허용 `seriesID` 3종**만 read-only로 조회한다.
2. `history_mode=EARNINGS_COMPANION_R3C_BLS_DIRECT_V1`, `status=READY_DIRECT_BLS`, 계약 marker를 검증하고, content hash·snapshot/chunk 참조·row_count를 다시 대조한다.
3. 한 번의 API 응답에 묶인 세 지표는 `retrieved_at`과 `responseSha256`가 동일해야 같은 자료 cohort로 판정한다. 서로 다른 조회시점의 3개를 은밀히 합성하지 않는다.
4. snapshot이 여러 버전이면 가장 최신의 **유효하고 해시가 검증된 일관 cohort**를 사용한다. 과거 snapshot을 덮어쓰지 않는다. 같은 시각 상충/해시 불일치면 `UNAVAILABLE` 또는 `PARTIAL`.
5. rawValue 문자열과 value 숫자가 일치하는지 검증하고, 기간 중복·누락·주기·단위를 점검한다. 빈 기간을 0 또는 직전 값으로 채우지 않는다.
6. **관측기간**, **API 조회시각**, **공식 발표일**, **내부 content hash**는 별도 필드다. 공식 발표일과 BLS 공식 vintage가 원본에 없으면 `null`로 유지한다.

## 3. 산출 가능한 정보성 C — 위험 점수와 무관

| C indicatorId 제안 | Source | 원본 → 파생 | 결측/제한 |
| --- | --- | --- | --- |
| `bls_ppi_final_demand_index` | `WPSFD4` | 최신 관측월 원 지수 그대로, `RAW` | 원본/기간 불명확 시 `UNAVAILABLE` |
| `bls_ppi_final_demand_yoy_sa` | `WPSFD4` | `100 × (index[t] / index[t-12] − 1)` (%), `DERIVED` | 정확히 **12개월 전** 동일 계열 원본이 있고 분모>0일 때만 |
| `bls_ppi_goods_index` | `WPSFD41` | 재화 PPI 원 지수, `RAW` | 최종수요 전체 PPI와 합산 금지 |
| `bls_ppi_goods_yoy_sa` | `WPSFD41` | `100 × (index[t] / index[t-12] − 1)` (%), `DERIVED` | 같은 조정·동월·분모>0, 다른 시리즈 대체 금지 |
| `bls_unit_labor_cost_yoy` | `PRS85006111` | BLS가 제공한 **이미 YoY %** 숫자, `RAW` | 전분기 대비 연율로 재변환 금지 |

- PPI YoY는 **계절조정 지수에서 자체 계산한 YoY**라고 표시한다. BLS 보도자료의 비계절조정 전년 대비 변화율을 같은 수치여야 한다고 강제하지 않는다.
- 21개 월간 관측이면 이론적으로 최대 9쌍의 12개월 전 비교가 가능하다. **실측 연속성 검증 전에는 정확한 쌍 개수를 확정하지 않는다.**
- `PRS85006111`는 **6개 분기 원시 관측**을 그대로 별도 주기로 제시한다. 월간 PPI의 값과 한 점수 또는 하나의 차트에 기간 정규화 없이 섞지 않는다.
- 정규화된 유저 UI 숫자의 반올림 단계는 최종 표시 시점이며, raw 보존·중간 계산에는 반올림하지 않는다.
- BEA 기업이익, Census MTIS, QFR는 이 단계에서 직접 BLS 자료로 대체하거나 계산한 것처럼 표시하지 않는다.

## 4. R3-D 검증 산출물 — 먼저 read-only TXT, 이후 사용자 확인

제안 파일(아직 미구현):
`scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.cmd`,
`scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs`.

TXT 필드 계약:
- 원장: `DB_OPEN_READONLY`, `SQLITE_WRITES=0`, `API_REQUESTS=0`, `D1_WRITES=0`.
- source별: `PROVIDER`, `DATASET`, `CONTRACT`, `SNAPSHOT_SHA256_VALID`, `CHUNK_SHA256_VALID`, `ROWS`, `FIRST_PERIOD`, `LAST_PERIOD`, `GAPS`, `REVISIONS`, `RETRIEVED_AT`.
- PPI별: `YOY_VALID_PAIRS`, `LATEST_SA_INDEX`, `LATEST_YOY_DERIVED`, `YOY_INPUT_CURRENT_PERIOD`, `YOY_INPUT_BASE_PERIOD`. 분모·기준월 없으면 숫자 대신 `UNAVAILABLE`과 이유를 기록.
- ULC: `LATEST_QUARTER`, `LATEST_YOY_PERCENT_RAW`, `TRANSFORM_APPLIED=NO`.
- 공통: `DATA_COHORT_CONSISTENT`, `RAW_UNMODIFIED`, `EXISTING_SCORE_UNMODIFIED`, `RESULT`.
- 로그/콘솔에 API 키·full chunk raw·기존 FRED 캐시 내용을 출력하지 않는다. TXT를 **CMD 파일과 같은 폴더**에 저장한다.

## 5. 보류 및 승인 범위

- 현재 승인: R3-C BLS 직접 **1회 수집·PC append-only 저장/자체 read-back** 성공. 재호출 반복하지 않는다.
- **다음 사용자 승인 요청**: 기존 저장된 BLS 3종에 대해 **추가 API 0·운영 DB 쓰기 0의 R3-D read-only 검증기 및 파생 산출(정보성 C에만 사용) 개발/PC 수동 1회 실행**.
- 이 승인은 **신규 데이터베이스 테이블/TTL, 추가 수집/자동 스케줄, E1 위험 점수 변경, D1 신규 공개 키, 사이트 UI 및 main/Production 병합을 포함하지 않는다**.
- R3-D 검증 이후 C 지표별 공개용 read-model과 UI는 R4/R5 별도 계약 후 진행한다.

## 6. 공식 근거

- BLS API 원자료의 year/period/value 정의: https://www.bls.gov/developers/api_signature_v2.htm
- PPI 수정/계절조정/공식 발표: https://www.bls.gov/ppi/faqs/questions-and-answers.htm
- 출처·조회일 및 제3자 분석 표시: https://www.bls.gov/developers/termsOfService.htm
