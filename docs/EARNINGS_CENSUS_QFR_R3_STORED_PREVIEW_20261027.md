# 실적 침체 — Census QFR 저장 원본 전용 R3 읽기·계산

- 작업일: 2026-10-27 KST
- 저장소: `ansqhd5774-Choi/zgmini`
- **유일한 작업 브랜치**: `codex/api-site-integration-r1-20261026`
- 범위: Census QFR `PC_SQLITE_APPEND=PASS` 이후 저장 원본만 이용해 **정보성 제조업 이익률 1행을 검산**한다. 기존 E1-R4 점수·D1·공개 API·UI·스케줄러·Production 변경 없음.

## R2 실제 PC 쓰기 완료의 근거

- 사용자 전달 원본 로그: `EARNINGS_CENSUS_QFR_R2_STORE_RESULT_20261027T145211Z.txt`.
- UTC `2026-10-27T14:52:11.549Z`, `MODE=MANUALLY_CONFIRMED_APPEND_ONLY`.
- `SOURCE_SHA256=232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654`(승인 시 고정 ZIP SHA와 동일).
- `CHUNKS_INSERTED=1`, `SNAPSHOTS_INSERTED=1`, `SQLITE_COMMITTED=YES`, `RAW_ZIP_ARCHIVED_IN_EXISTING_SQLITE=YES`, `RESULT=PASS_QFR_SQLITE_APPEND_READBACK`.
- 관측 `2026-Q2`, 제조업 세후이익률 `15.599418144173285%`. 기존 기록 0/0 → 새 1/1.
- **PC 원본 저장만 PASS**이며, 후속 로컬 계산·D1 게시·공개 GET·사이트 UI·자동 갱신은 별도 증거 전까지 `NOT_RUN`이다. 이 로그의 `D1_WRITES=0`, `SCORE_WRITES=0`을 보존한다.

## R3 구현 계약

- `scripts/pc-writer/EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs`는 `node:sqlite`의 `readOnly:true` + `PRAGMA query_only=ON`으로 기존 `E:\ZGmini\data\pc-writer\storage\core.sqlite`를 읽는다.
- **원본 ZIP HTTP 재다운로드 금지**. R2의 `checkQfrSchema`를 재사용해 전 버전 ZIP SHA·동일 payload SHA·CENSUS 네임스페이스의 스냅샷 참조 무결성을 확인한다.
- 모든 스냅샷의 원본 수신 시각·저장 시각·source URL·metadata·1개 독립 원천·`scoreInput=false`를 추가 검증한다. 임의로 `releaseDate`나 공식 PIT 빈티지를 채우지 않는다.
- 가장 최신 분기를 우선하고, 같은 분기끼리는 실제 `retrieved_at`이 더 최근인 불변 원문을 고른다. 동시간에 서로 다른 ZIP 2개가 있으면 선택하지 않고 오류 처리한다. 차후 개정은 덮어쓰지 않고 기존 버전을 모두 검증한다.
- 선택된 ZIP에서 저장된 원시 매출·세후이익을 **다시 나누어** `100 × 세후이익 / 매출`의 현재/직전 분기 이익률과 전분기 대비 `%p` 변화폭 계산. 저장된 파생 마진과 정확히 비교한다.
- 지표 ID는 작업용 `census_qfr_manufacturing_after_tax_margin_nsa`. **한 원천의 한 정보성 지표**이며 분기 변화폭은 해당 행의 부가 정보다. D1 공개 키·최종 Worker 스키마는 아직 승인/확정하지 않는다.
- `EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.cmd`는 필수 `.mjs` 3개가 같은 폴더에 있어야 실행하고 CMD 옆에 `EARNINGS_CENSUS_QFR_R3_STORED_RESULT_*.txt`를 출력한다. 누락 시 `*_SETUP_*.txt`로 즉시 진단한다. **기존 성공한 R2 쓰기 CMD를 다시 실행할 필요가 없다.**

## Gate와 다음 작업

1. synthetic 메모리 SQLite 테스트·ZIP 독립 실행 패키지 검사까지는 개발 단계에서 수행한다.
2. 실제 PC의 R3 읽기 전용 TXT에서 `RESULT=PASS_QFR_STORED_READONLY_PREVIEW`, `SOURCE_SHA256`, `OBSERVED_THROUGH`, `HISTORY_JSON`, `SOURCE_RETRIEVED_AT`을 확인한다. 재수집·재저장 없음.
3. R3 PC 결과 검증 후 QFR **전용 D1 키와 독립 checkpoint**를 제안, 기존 `detail:earnings-recession-indicators:v1`(BLS 5행) 및 서비스 별도 키를 침범하지 않는다. D1 쓰기·라우팅·공개배포는 별도 승인과 각각의 Gate가 필요하다.
4. 향후 QFR 데이터 갱신은 승인된 기존 PC 수집기 통합 여부 확인 후 단계적으로 진행하며, 이번 1회 저장만으로 **자동 정규 갱신 PASS를 선언하지 않는다**.

공식 통계 출처: https://www.census.gov/econ/qfr/ , 공식 2026-Q2 발표: https://www.census.gov/econ/qfr/mmws/current/index.html
