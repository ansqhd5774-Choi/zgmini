# Earnings Companion 정보성 C / R3-D — 저장된 BLS 원본 read-only 검증기 구현

- 날짜: 2026-10-27 KST
- 저장소: `ansqhd5774-Choi/zgmini`
- 유일 승인 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026`
- 선행 계약: `docs/EARNINGS_COMPANION_R3D_STORED_DATA_CALCULATION_CONTRACT_20261027.md`
- 상태: **코드 구현·오프라인 테스트 PASS / PC 저장 원본 실제 R3-D 실행 결과 대기**
- 현 사용자 승인: 기존 BLS 3종의 read-only 수동 검증기 개발 및 1회 로컬 점검.

## 실행 파일

- `scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.cmd`
- `scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs`
- `scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.test.mjs` (개발 오프라인 fixture)

Windows CMD와 `.mjs`를 같은 폴더에 배치하고 CMD를 실행한다. Node가 설치되어 있어야 하며 기본 읽기 대상은 기존 PC DB `E:\ZGmini\data\pc-writer\storage\core.sqlite`이다. 별도 PC 경로를 정식으로 구성했다면 기존 `ZGMINI_PC_HOME` 환경변수를 따른다. 출력은 **CMD와 같은 폴더의** `EARNINGS_R3D_STORED_BLS_CALC_RESULT_<UTC>.txt` 한 개다. TXT만 공유한다.

## 보장 및 제한

1. BLS provider의 `WPSFD4`, `WPSFD41`, `PRS85006111` 3종 snapshot/chunk만 조회한다. `node:sqlite` DB open을 `readOnly:true`, `PRAGMA query_only=ON`으로 이중 제한한다.
2. `CONTRACT`, `READY_DIRECT_BLS`, 원본 조회시각, 응답 SHA256, snapshot identity SHA256, chunk payload SHA256, 원본 row count 및 관측기간을 검증한다.
3. 원본 월별 관측기간 중 빈 월 수를 세며, 정확한 12개월 전 데이터가 있을 때만 PPI YoY `100×(t/t-12−1)`를 계산한다. 분모 결측 또는 0 이하이면 `UNAVAILABLE`이다. 재화 PPI와 전체 PPI는 합산하지 않는다.
4. `PRS85006111`의 BLS 제공 전년 동분기 대비 변화율은 원 수치를 표시하고 **추가 변환하지 않는다**.
5. 3종이 동일한 조회시각과 응답 해시를 지닌 하나의 cohort인지 검증한다. 새로운 불완전 cohort가 있다면 이전의 완전 cohort를 보여주되 `PARTIAL` 경고한다. 완전 cohort 부재·해시 오류·출처 오류는 실패한다.
6. `REVISIONS=UNDETERMINED_NO_OFFICIAL_VINTAGE`는 저장된 snapshot 버전 개수를 공식 BLS 개정 횟수로 오인하지 않도록 한 표시다. BLS가 제공하지 않은 `releaseDate`, `availableAt`, 공식 vintage는 만들어 내지 않는다.
7. **추가 API 요청 0, PC DB/스키마/기존 FRED 자료/산식/스케줄러/D1/화면/배포 변경 0.** 프로젝트 상태·자동 갱신에 영향을 주지 않는다.

## 개발 검증

- 2026-10-27: 메모리 SQLite를 이용한 8개 오프라인 테스트 **8/8 PASS**.
- 테스트 범위: 정상 3종 SHA/cohort, 월간 결측과 유효 YoY 비교쌍, 최신 기준월 결측, payload SHA 변조, provenance 오류, 불완전 cohort, FRED namespace 격리, 테이블 누락.
- PC 저장 원본의 실제 `FIRST_PERIOD`/`LAST_PERIOD`/`GAPS`/변화율은 아직 직접 읽지 않았으므로 확정·가공 기재하지 않는다. 사용자 TXT 수신 후 판단한다.

## 다음 단계 경계

현재까지 승인된 것은 R3-D read-only 수동 검사 1회뿐이다. R4/R5 공개 read-model, DB 신규 저장/TTL, 스케줄러, 점수·표시·사이트 배포, main 병합은 별도 승인을 받는다.
