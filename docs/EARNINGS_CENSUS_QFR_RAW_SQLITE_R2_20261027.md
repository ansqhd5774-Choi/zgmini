# 실적 침체 — Census QFR 원문 ZIP 불변 보존·PC SQLite 호환 R2

- 작업일: 2026-10-27 KST
- 저장소: `ansqhd5774-Choi/zgmini`
- **유일한 작업 브랜치**: `codex/api-site-integration-r1-20261026`. 개인 브랜치·main 병합 없음.
- 범위: 기존 실적 침체 점수 **E1-R4 및 웹 공개값 불변**. Census QFR 제조업 세후이익률 정보성 지표의 소스 보존 및 리비전 원장 연결 준비.

## 원본과 계산의 관계

기존 R1 [Census QFR 공식 ZIP 원자료 조사](EARNINGS_CENSUS_QFR_MANUFACTURING_MARGIN_R1_20261027.md)에서 `QFR-mf.csv` 원시 매출(`dt_code=101`)과 세후이익(`dt_code=115`)을 수집·검증한다. `MFG / US / et_idx=0 / is_adj=0`을 선택하고 **같은 분기의 백만 달러 원시값 두 개를 나누어** 자체 계산 `100 × 세후이익 / 매출`을 생성한다. 이는 Census가 직접 게시한 마진 값이 아니며 단일 공식 공급원에서 나온 파생값이다.

미국 Census 공식 페이지: https://www.census.gov/econ/qfr/

공식 ZIP: https://www.census.gov/econ_getzippedfile/?programCode=QFR

## 저장 계약

| 항목 | 계약 |
| --- | --- |
| 기존 PC DB | `E:\ZGmini\data\pc-writer\storage\core.sqlite` |
| 사용 테이블 | 기존 `api_history_chunks_v1` + `api_history_snapshots_v1` **2개만** |
| 출처·데이터셋 | `provider=CENSUS`, `dataset=QFR_MFG_US_NSA_AFTER_TAX_MARGIN` |
| 버전 계약 | `EARNINGS_CENSUS_QFR_MFG_RAW_ZIP_V1` |
| 청크 내용 | **원본 공식 ZIP 전체의 base64 + 원본 ZIP SHA-256 + 계산된 5분기 정보** (이 중 공식 자료는 ZIP이며 지표는 파생값) |
| 청크 해시 | JSON 내용 자체의 SHA-256. 독립 ZIP SHA도 저장해 원문 바이트를 다시 검증 |
| 스냅샷 키 | 계약·출처·데이터셋·청크 해시의 결정적 SHA-256, **수집 시각은 키에서 제외** |
| 개정 사항 | ZIP 바이트 변경 시 별도 청크·스냅샷 추가, 과거 행 수정·삭제·대체 금지 |
| 동일 ZIP 재실행 | `INSERT ... ON CONFLICT DO NOTHING`으로 중복 0건, 최초 기록 보존 |
| 보존된 관측일 | `2025-Q2`~`2026-Q2` 등 당시에 최신 5연속 분기; ZIP 원문 전체를 보존하므로 이전 분기도 복원 가능 |
| 빈티지 표시 | `CURRENT_RETRIEVAL_NOT_PIT`, 공식 빈티지 ID 없음. 기록 시점과 경제적 사용 가능 시점을 혼동하지 않음 |

테이블 생성·스키마 이관·기존 BLS/FRED/기타 제공자 삭제·수정은 금지. 동일 Census 네임스페이스에 타 계약이 이미 있거나 원본 ZIP 해시·참조 체인이 손상된 경우에는 기록하지 않는다. 기존 테이블 열, 타입, 기본키, 트리거 부재를 읽기 전용으로 확인한다. 실제 기록 모드에서는 **BEGIN IMMEDIATE → 검사 → 청크 INSERT → 스냅샷 INSERT → 재조회 검증 → COMMIT**이며 하나라도 실패하면 `ROLLBACK`한다.

### 실행 모드와 승인 경계

1. `EARNINGS_CENSUS_QFR_R2_STORAGE_PREFLIGHT.cmd`는 항상 **읽기 전용**이다. 기존 PC DB 호환성 검사 → 새 공식 ZIP 재수집·계산 → 검증 → 같은 디렉터리에 `EARNINGS_CENSUS_QFR_R2_STORE_RESULT_*.txt` 생성. 데이터베이스·D1·점수는 기록하지 않는다.
2. 내부 프로그램 `EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs --dry-run`도 동일한 읽기 전용 프리플라이트.
3. **별도 명시적 승인 후에만** `--apply --confirm-census-qfr-sqlite-append` 실행을 검토한다. 실행 시에도 PC의 **기존 원장 2개 테이블만** append-only 기록한다. 이 옵션이 구현됐다는 것이 PC 기록 실행·승인을 의미하지 않는다.
4. DB 저장이 끝나도 D1 신규 키/Worker/화면 노출은 별도 승인·배포·공개 검증 대상이다. 산식 가중치/점수에는 자동 편입하지 않는다.

## 검증 및 미완료 경계

- R1 기존 오프라인 공식 형식 synthetic 파서 5건: PASS.
- R2 신규 메모리 SQLite synthetic 6건: 원본 ZIP 바이트 동일·재현 SHA, 중복 저장 0건, 개정 별도 추가, 타 계약 오염 거절, 잘못된 스키마 차단, 두 번째 INSERT 실패 시 전체 롤백, BLS 레코드 불변 검증.
- 테스트 전부 **실제 PC DB 미접근 / 실 D1 미접근 / 실제 원본 ZIP 최신 재수집 미수행**. 이는 코드 계약 검증이며 PC 배포 또는 운영 성공으로 보고할 수 없다.
- R1 원본 조사에 기록된 2026-Q2 마진 15.59941814%는 검증 당시의 산출값이며 차후 개정치에 자동 고정하지 않는다.

## 다음 Gate

1. 전용 브랜치 파일을 PC 운영 위치에 설치(기존 작업자와 충돌 없도록 신규 파일만 배포).
2. 사용자 PC에서 읽기 전용 `EARNINGS_CENSUS_QFR_R2_STORAGE_PREFLIGHT.cmd` 실행 → **같은 위치** TXT를 확인. 실제 DB의 스키마/네임스페이스와 공식 ZIP 네트워크 수신을 별도 입증.
3. 프리플라이트 증빙 확인 후 **PC append-only 실행 승인**을 별도 받고, 승인된 명령의 원장 readback 및 기존 BLS 이력 보존 검증.
4. 신규 D1 키 설정·입력 이력/빈티지 게이트, 공개 GET, 사이트 정보성 라벨을 **각각 별도 검증**. 기존 실적 침체 위험 E1-R4 산식은 그대로 둔다.
