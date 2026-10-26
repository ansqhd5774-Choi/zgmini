# ZGMINI 실적 침체 정보성 C — R3-C PC 원장 사전검사 판정 및 1회 저장 계약 제안

- 검토일: 2026-10-27 KST
- 저장소/고정 브랜치: `ansqhd5774-Choi/zgmini` / `codex/earnings-api-site-integration-plan-r1-20261026`
- 사용자 PC 제출 Evidence: `EARNINGS_R3C_STORAGE_PREFLIGHT_RESULT_20261026-163717Z.txt` (UTC 2026-10-26 16:37:17)
- 기준 main SHA: `41d96e979e514a937a813d273466a7ac547622a5`; 사전 조회 시 작업 브랜치는 main 대비 **ahead 39 / behind 7**, 자동 병합·rebase하지 않음.
- 최종 판정: **SCHEMA_REVIEW_READY / R3C_WRITE_NOT_AUTHORIZED / BLS_DIRECT_RAW_NOT_FOUND_IN_TARGET_TABLES**

## 1. PC 실제 증거 — 과잉해석 금지

| 검사 항목 | PC 실측 결과 | 판정 |
| --- | --- | --- |
| 검사 방식 | SQLite read-only, API 요청 0, payload 읽기 0 | PASS |
| `api_history_snapshots_v1` | 필수 메타 필드 존재 | STRUCTURE_CANDIDATE |
| `api_history_chunks_v1` | 필수 메타 필드 존재 | STRUCTURE_CANDIDATE |
| snapshots의 `FRED/PPIFIS` | 2 레코드, 합계 `row_count=303` | 기존 FRED 원장; 신규 C 입력으로 재사용 금지 |
| snapshots의 `FRED/PRS85006111` | 1 레코드, 합계 `row_count=41` | 기존 FRED 원장; 신규 C 입력으로 재사용 금지 |
| chunks의 `FRED/PPIFIS` | 2 레코드, 합계 `row_count=303` | 기존 FRED 청크 |
| chunks의 `FRED/PRS85006111` | 1 레코드, 합계 `row_count=41` | 기존 FRED 청크 |
| 두 테이블에서 BLS provider × 직접 원천 3종 | 0 그룹 | **이 두 테이블만 미보유 확인** |
| DB/D1/스케줄러/산식 변경 | 모두 0 | PASS |

주의: snapshots와 chunks의 `row_count`를 합산해 **총 688개 독립 관측**이라고 주장하지 않는다. 동일 자료의 요약/청크이며 중복·수정본 관계는 payload 미확인 상태다. 검사는 관련 테이블 이름 일부만 조사했으므로 **PC 전체에 BLS 저장 자료가 없다고 단정하지 않는다**.

## 2. 코드 경로 확인: 기존 schema와 기존 writer는 별개

- `worker/api-history-store.mjs`는 **물가 전용/FRED 전용 적재 함수** `persistInflationApiHistory`를 내보낸다. `datasetPlan()`가 `provider='FRED'`로 고정하며 허용 대상도 물가 시리즈 목록이다.
- 이 코드는 기존 **Cloudflare D1 바인딩용 코드**로 작성되어 있다. PC SQLite와 테이블 **이름/일부 열이 같더라도** Cloudflare Writer 함수를 PC에 그대로 가져다 실행하거나, D1 기록을 C용 PC 적재로 대체하지 않는다.
- `worker/inflation-history-reader.mjs`, `worker/inflation-pit-reader.mjs`, `worker/inflation-r2-reader.mjs`, `worker/projection-inflation-inputs.mjs`는 `provider='FRED'` 조건으로 기존 자료를 읽는다. 신규 `provider='BLS'` namespace는 SQL상 구분 가능하지만 **공유 테이블 운영 충돌 여부는 별도 PC writer guard로 검증**해야 한다.
- 현재 read-only 검사기는 두 테이블의 **일부 필수 열**만 검사했다. 실제 PC CREATE TABLE/제약/트리거/인덱스 전체가 위 Worker schema와 동일하다고 확정하지 않는다.

## 3. R3-C 최소 제안: 새 테이블을 우선 만들지 않음

**권장 A — PC에 이미 존재하는 `api_history_chunks_v1` + `api_history_snapshots_v1`에 BLS 전용 namespace를 append-only로 사용.**

조건:
1. 새로운 PC 전용 writer를 기존 E1·물가 Writer와 **분리**한다. 최초 1회 수동 실행만 허용하며 PC 등록 작업이나 5분 스케줄은 호출하지 않는다.
2. 쓰기 **바로 전** PC SQLite `PRAGMA table_info`, PK/고유 인덱스, 필요한 열/타입, 각 대상 시리즈의 기존 provider/dataset key를 **읽기 전용으로 검사**한다. 규격 차이, 같은 BLS 식별자의 불명확한 레코드, source 충돌 또는 guard 실패 시 즉시 `ABORT_NO_WRITE`.
3. 허용 provider/dataset은 `BLS/WPSFD4`, `BLS/WPSFD41`, `BLS/PRS85006111` **3개만**. 기존 FRED 값은 읽기·쓰기·삭제하지 않는다.
4. 사용자가 이미 승인한 BLS v2 **1 POST/3 시리즈**를 1회 요청해 성공 상태·exact ID·중복 ID·year/period·수치·비정상 footnote를 검증한다. 셋 중 누락 시 **부분 정상 저장 금지**(atomic transaction 전 검증 완료).
5. 각 원시 관측을 정형 `payload_json` 청크로 저장하되 `seriesID, year, period, rawValue 문자열, 단위와 빈도/계절조정 고정 계약, 관측기간, footnotes, isLatest`를 유지한다. 인증키·원문 request body는 저장/로그하지 않는다.
6. `provenance_json`에는 `source=BLS_DIRECT_API, endpoint(키 없음), retrieval timestamp, series definition, response SHA-256, parser contract version, coverage periods`를 보존한다. BLS가 공식 vintage를 제공하지 않는 경우 `vintageId`는 NULL, **내부 content hash로 revision 구분**한다. 최초 발행일·수정 확정일을 조회시각으로 꾸며내지 않는다.
7. snapshot hash는 provider+dataset+시리즈 메타+관측 데이터+청크 해시의 **내용 기반 결정적 SHA-256**. 재수집 내용이 동일하면 `INSERT OR IGNORE`로 중복을 만들지 않고, 변경됐다면 **새 hash 행만 추가**하여 이전 관측 이력을 보존. 서로 다른 세 시리즈 간 hash/period를 혼합하지 않는다.
8. **하나의 PC 트랜잭션**으로 검증된 3개 시리즈의 snapshot+chunk를 적재한다. 검증·DB 오류 시 전체 rollback, 기존 자료 불변. 저장 후 별도의 read-back으로 행수/참조 chunk/해시/원본 값 일치 확인. 로그는 새로 추가된 메타·검증 요약만 CMD 옆 TXT로 출력.
9. 최초 수집은 2025~2026년 BLS 공식 API 제공 구간을 대상으로 하되, **저장 보존 16개월 정책/백필 확장은 변경하지 않음**. 1년 **매 시점의 YoY 전체 차트**는 24개월가량의 기초 관측이 필요할 수 있어 데이터 충족 전 보장하지 않는다.
10. BLS 자료는 공식 API 출처·조회일과 자체 YoY 계산 여부를 표시. PPI 최근 약 4개월의 수정과 장기 계절조정 개정은 동일 기간 신규 해시로 이력 유지. ULC의 `PRS85006111` 값 자체는 YoY %이므로 다시 YoY 계산하지 않는다.

**대안 B** — 실제 PC schema guard가 실패하거나 물가 기능과 명확한 격리가 불가능하다는 증거가 나올 경우에만 `earnings_companion_c_raw_v1` **신규 additive 테이블** 제안. 이 경우 스키마·키·TTL을 추가로 사용자 승인 받으며, 자동 생성하지 않는다.

## 4. 운영 영향 및 승인 게이트

| 변경 대상 | 제안 | 현 승인 |
| --- | --- | --- |
| 기존 `api_history_...v1`에 **BLS 3종 append-only 쓰기** | **A안** 선호, schema guard+트랜잭션 필수 | **사용자 승인 필요** |
| R3-C 전용 PC writer 코드 및 CMD | 승인 시 브랜치에 코드 작성, 결과 TXT는 CMD 옆 생성 | 승인 전 운영 실행 금지 |
| BLS 직접 API 3종 **단일 POST** | R3-B에서 방식 승인 | **방식 승인** (이번 저장 실행과 구분) |
| 기존 FRED 캐시/물가 writer | **변경 0** | 변경 금지 |
| 기존 Growth/E1 자료 | **읽기 전용** | 변경 금지 |
| DB 스키마 ALTER/DROP/새 테이블 | **0** (A안 성공 시 불필요) | 미승인 |
| TTL/과거 이력 자동 삭제/백필 확장 | **0** | 미승인 |
| 스케줄러/D1/공개 API/사이트/main | **0** | 미승인 |
| R3-D 계산/R4–R6 배포 | **0** | 별도 Gate |

**사용자 승인 요청 문구:** “A안: 기존 PC SQLite `api_history_chunks_v1`·`api_history_snapshots_v1`에 BLS 직접 3종을 기존 FRED와 분리된 provider로, 1회 수동 실행·add-only·atomic+read-back 조건으로 저장하는 작업을 승인하는가? 이 승인에는 신규 테이블/삭제/TTL/스케줄/D1/공개/기존 점수 변경을 포함하지 않는다.”

## 5. 근거 문서

- 1회 POST 다중 시리즈: https://www.bls.gov/developers/api_signature_v2.htm
- 조회일 및 가공표기: https://www.bls.gov/developers/termsOfService.htm
- PPI 수정: https://www.bls.gov/ppi/faqs/questions-and-answers.htm
- 기존 승인: `docs/EARNINGS_COMPANION_R3B_STORAGE_CONTRACT_PROPOSAL_20261027.md`
- 사전검사: `docs/EARNINGS_COMPANION_R3C_BLS_BATCH_PREFLIGHT_20261027.md`
