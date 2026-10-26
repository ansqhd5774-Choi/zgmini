# 실적 침체 정보성 C — R3-C BLS 직접 수집 1회 수동 저장기

- 기준일: 2026-10-27 KST
- Repo/고정 브랜치: `ansqhd5774-Choi/zgmini` / `codex/earnings-api-site-integration-plan-r1-20261026`
- 신규 계약: `EARNINGS_COMPANION_R3C_BLS_DIRECT_V1`
- 사용자 승인 범위: 기존 원장 2개의 BLS 별도 provider에 3개 원천을 **한 번 수동·추가만** 저장. 후속 스케줄·DB 스키마/TTL·D1·산식·사이트는 승인되지 않음.
- 기준 검사: `EARNINGS_R3C_STORAGE_PREFLIGHT_RESULT_20261026-163717Z.txt`; 구조 후보 확인, BLS 직접 원장 0건(해당 2개 테이블 한정).

## 파일 및 재현

| 파일 | 목적 |
| --- | --- |
| `scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.cmd` | 사용자 Windows CMD 1회 실행; 한 폴더 내 TXT 생성 |
| `scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs` | PC 기존 SQLite schema 확인 / BLS 단일 POST / 3개 전부 검증 / 원장 atomic append+read-back |
| `scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.test.mjs` | API/운영 PC DB 없는 오프라인 검증(9건) |

- 코드는 기존 수집기·승인된 Growth/물가/E1-R4·D1/Worker/스케줄러를 수정하지 않는다.
- 기존 PC `ZGMINI_PC_HOME` 또는 `E:\\ZGmini\\data\\pc-writer`의 `storage\\core.sqlite` **기존 파일**만 대상으로 한다. DB 파일이 없거나 schema/PK/type가 다르면 `ABORT`하고 어떤 테이블도 만들지 않는다.
- 기존 `providers.env` 또는 승인된 환경의 `BLS_API_KEY` 등을 **메모리로만 읽고** 키가 없으면 API 호출 전 종료한다.
- 무료 BLS v2 `WPSFD4`, `WPSFD41`, `PRS85006111`을 **2025~2026**으로 묶어 정확히 1회 POST하며 자동 재시도하지 않는다.
- PPI 월간은 `M01..M12`만, ULC 분기는 `Q01..Q04`만 저장한다. 비수치·중복 충돌·3종 누락은 쓰기 전에 실패한다. 발표일·공식 vintage 미제공 시 NULL; 출처/조회일/응답 SHA-256을 구분하여 기록한다.
- 원자료 `rawValue` **문자열**, 별도 `value` 수치, 주기/단위/계절조정/footnote 및 관측일을 저장한다. `PRS85006111`은 이미 YoY %이므로 재변환하지 않는다. API 응답의 순간 `latest` 플래그는 경제값 수정으로 오인하지 않아 content identity에서 제외했다.
- 기존 `api_history_chunks_v1` 및 `api_history_snapshots_v1`에만 `provider='BLS'`, 각 exact series ID로 추가한다. 기존 FRED 데이터를 읽거나 변경하지 않는다.
- 테이블 trigger, schema/PK 불일치, 기존 BLS namespace 충돌, 참조 누락 시 API 전에 `ABORT_NO_WRITE`. 네트워크 수신 직후 쓰기 직전에도 schema 및 BLS 원장을 다시 검사한다.
- 새 snapshot/chunk는 **내용 SHA-256** 기준으로 멱등 삽입한다. 같은 응답은 0행 신규 작성, 실제 수정값은 이전 hash와 별도 행. 3개 시리즈와 read-back을 **하나의 BEGIN IMMEDIATE/COMMIT 트랜잭션** 안에서 검증하며 실패 시 ROLLBACK.
- 작업 후 `EARNINGS_R3C_BLS_STORE_ONCE_RESULT_*.txt`를 CMD와 같은 폴더에 생성한다. 응답 원문·비밀키·인증 URL은 기록하지 않는다.
- **이 코드의 구현 및 오프라인 테스트 통과는 PC 실제 수집/저장 통과와 다르다.** 사용자 CMD 결과 TXT 제출 후 실측 검증한다.

## 테스트 Evidence (개발기, 네트워크 없이 실행)

명령: `node scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.test.mjs`

| 검증 | 결과 |
| --- | --- |
| 3개 공식 ID·원본 수치·단위/vintage NULL | PASS |
| DB 존재/Schema/PK 미충족 → 무쓰기 | PASS |
| 초기 저장 3 snapshot/3 chunk + read-back | PASS |
| 동일 입력 재실행 → 신규 삽입 0건 | PASS |
| PPI 수정값 → 이전 기록 유지, 신규 snapshot/청크 각 1건 | PASS |
| 타 시스템 BLS namespace 충돌 차단 | PASS |
| 비수치/중복 기간 충돌 차단 | PASS |
| SQL 제약 충돌 시 전체 rollback, FRED 이전 기록 보존 | PASS |
| 기존 트리거 감지 시 추가 쓰기 차단 | PASS |

## 다음 Gate — 사용자의 CMD 실행 및 로그 판정

1. ZIP/브랜치의 두 실행 파일을 **한 폴더**에 놓고 `.cmd`만 한 번 실행한다. Node 22.13+ 필요.
2. 생성된 `EARNINGS_R3C_BLS_STORE_ONCE_RESULT_*.txt`를 제출한다.
3. 로그 `RESULT=PASS_R3C_MANUAL_BLS_PERSISTED`, `SERIES_READBACK_VERIFIED=3`, `DB_TRANSACTION_COMMITTED=YES`를 함께 확인한다. `PASS` 전에는 PC 저장 완료 주장 금지.
4. 실패 시 해당 `ERROR`만 분석하고 동일 원인 재호출 반복 금지. C 원자료 저장 정상 확인 후에도 R3-D 계산 및 R4~R6 공개는 별도 승인 Gate.

## 공식 자료

- BLS 다중 시리즈/키: https://www.bls.gov/developers/api_signature_v2.htm
- BLS 출처/조회일 표시: https://www.bls.gov/developers/termsOfService.htm
- PPI 발표·수정: https://www.bls.gov/ppi/faqs/questions-and-answers.htm


## R3-C 사용자 PC 실제 실행 Evidence (2026-10-27 KST, UTC 2026-10-26T17:02:53.267Z)

- 제출 로그: `EARNINGS_R3C_BLS_STORE_ONCE_RESULT_20261026-170253Z.txt`.
- 결과: **`PASS_R3C_MANUAL_BLS_PERSISTED`**.
- 호출: `API_REQUESTS=1`; 기존 PC schema guard: `PASS`.
- 최초 저장 전: `PREVIOUS_BLS_SNAPSHOTS=0`, `PREVIOUS_BLS_CHUNKS=0`.
- 수집 관측 수: `WPSFD4=21`, `WPSFD41=21`, `PRS85006111=6`. 월·분기별 **실제 날짜·연속성·PPI YoY 유효 쌍 수는 본 요약 로그에서 미확인**.
- 저장: `CHUNKS_INSERTED=3`, `SNAPSHOTS_INSERTED=3`, `SERIES_READBACK_VERIFIED=3`, `DB_TRANSACTION_COMMITTED=YES`, `NEW_BLS_ROWS_WRITTEN=YES`.
- 실행기 로그상 `TABLE_CREATED_OR_ALTERED=NO`, `FRED_RECORDS_MODIFIED=NO`, `D1_OR_SCORE_OR_SCHEDULER_CHANGED=NO`. 이는 저장기 동작·로그에서 확인한 범위이며, 독립 전체 DB 감사가 수행된 것은 아니다.
- **Gate 결론: R3-C BLS 직접 3종 1회 PC 수집·저장·내부 read-back 완료.** 추가 호출/같은 수집 CMD 반복 불필요.
- **아직 미검증:** 개별 월/분기 원자료 정확한 기간, YoY 계산 가능 쌍, 과거 수정본 반영 방식의 실제 2회 운영, BEA/MTIS 수집, R3-D 오프라인 계산, D1/공개 배포.
- R3-D의 추가 계산과 R4–R6의 공개 연결은 승인 전 실행하지 않는다. 계획: `docs/EARNINGS_COMPANION_R3D_STORED_DATA_CALCULATION_CONTRACT_20261027.md`.
