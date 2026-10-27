# 실적 침체 정보성 C — R4 1차 PC read-model 미리보기 구현

- 기준일: 2026-10-27 KST
- 저장소: `ansqhd5774-Choi/zgmini`
- 유일 작업 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026`
- 적용 범위: **PC SQLite read-only → 로컬 미리보기 JSON/TXT, 오프라인 테스트**
- 선행: `docs/EARNINGS_COMPANION_R4_INFORMATIONAL_READ_MODEL_DESIGN_20261027.md`, R3D PC 실측 `PASS_R3D_STORED_ONLY_CALCULATION`
- 상태: **PC 실행 결과 대기 / 공개 구현 미승인**

## 1. 실행물·의존성

1. `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.cmd`
2. `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs`
3. `scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs` — 기존 검증기, **변경하지 않음**
4. `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.test.mjs` — 저장소용 오프라인 검증 파일 (사용자 CMD 패키지에 필수 아님)

전달 ZIP의 CMD 1개와 MJS 2개를 같은 폴더에 풀고 CMD를 한 번 실행한다. 기존 `R3D` 검증기 MJS도 ZIP에 포함한다. Windows CMD 전용이며 Node `node:sqlite` 사용 가능 버전이 필요하다. PC 원본 DB 기본 경로는 `E:\ZGmini\data\pc-writer\storage\core.sqlite`, 기존 `ZGMINI_PC_HOME` 지정 시 해당 위치를 사용한다. `providers.env`/API 키는 열지 않는다.

생성물은 **실행 CMD와 같은 폴더**의 `EARNINGS_R4_C_READ_MODEL_PREVIEW_RESULT_<UTC>.json` 및 `.txt`다. 두 파일 모두 사용자 PC에서 생성 후 채팅에 첨부해 검증한다. 테스트는 실사용 DB를 복사하거나 변경하지 않으며 Node 내장 **메모리 SQLite**만 사용한다.

## 2. 계보와 계산

- `R3D.analyze()`가 기존 BLS `WPSFD4`, `WPSFD41`, `PRS85006111` 스냅샷의 해시·상호 일치 코호트·기간·원자료를 다시 검증한다.
- 해당 `snapshot_sha256`으로 정확히 연결되는 chunk의 `payload_json`을 해시 재검증하고 실제 `first_seen_at`을 읽는다. 주어진 DB의 raw 3개 집합을 서로 임의로 섞지 않는다.
- `sourceVersion = SHA256('earnings-companion-c-r4-v1' + '\n' + 알파벳순으로 정렬된 3개 'seriesId|snapshotSha256' 행을 '\n'으로 연결한 문자열)`; `generatedAt` 변동이 sourceVersion을 변경하지 않는다.
- `sourceStoredAt`은 검증된 세 원본 chunk의 **가장 오래된 `first_seen_at` UTC epoch milliseconds**다. 혼합 데이터에서 freshness를 낙관적으로 연장하지 않기 위한 보수적인 선택이다. 각 출처 `first_seen_at`은 TXT에 별도 기록한다.
- 저장 조회시점에 있는 자료로 재계산했기 때문에 `historicalMode=CURRENT_RETRIEVAL_NOT_PIT`이다. 시점별 과거 vintage가 아니다.
- 월간 지수 RAW 2개(최근 13월), 월간 SA 12개월 YoY DERIVED 2개(최근 13월 슬롯, 실제 가능한 점만 계산), 분기 ULC YoY RAW 1개(최근 5분기): 총 5개 **정보성 행**만 구성한다. 사용 가능한 계산쌍이 없으면 null이며 추정값을 넣지 않는다.
- 월간 YoY는 `100*(지수[t]/지수[t-12]-1)`. 분모 지수가 0 이하이면 null. 분기 ULC 값은 원본이 이미 YoY이므로 다른 변환을 금지한다.
- 과거 1년 미보유 슬롯을 null로 나타낸다. 최신 실측값이 사용 가능하면 row `READY`로 두고 역사 완성도 부족은 `historyCoverage.complete=false`로 구분한다.
- 최신 YoY 결측이나 새로운 불완전 cohort가 있으면 payload `PARTIAL`로 표시한다. 완전 코호트 부재, 행 또는 해시 변조는 실패하며 JSON을 만들지 않는다.
- `releaseDate`, `nextReleaseDate`는 증거가 없으므로 항상 `null`이다.
- `unavailableReason`은 **로컬 preview 전용 진단 확장 필드**다. 공개 API 최종 계약으로 확정된 필드는 아니다.

## 3. 검증과 불변

- 2026-10-27: 오프라인 8개 테스트 PASS (raw/derived 5행, 원본 해시, YoY 9점 vs 지수 13점, 5분기, 이전값·단위, 실제 0, 결측, sourceStoredAt, 불완전 코호트).
- 이번 구현은 새 BLS API 호출 **0회**, SQLite 읽기 전용(`readOnly:true`, `PRAGMA query_only=ON`), 원본·스키마 변경 0, D1 쓰기 0, E1/다른 점수 수정 0, 신규 Cloudflare endpoint/허용 키/Worker/TTL/scheduler/UI/배포/main 변경 0이다.
- RAW와 DERIVED가 같은 자료를 공유함을 명확히 한다. 다섯 행을 독립 정보 5종으로 합산하거나 0–100 점수로 환산하지 않는다.
- R4 1차 결과 PASS는 **PC 로컬 생성·무결성의 증거**이며 공개 endpoint가 READY임을 뜻하지 않는다.

## 4. 사용자 PC 결과 수령 후 작업 Gate

TXT+JSON의 `sourceVersion`, `sourceStoredAt`, 3개 원본 snapshot SHA, 5개 표시값, 기간·실측 역사·빈 슬롯·변화량·상태를 대조한다. 그 뒤 R4 2차는 신규 D1 후보 키·허용목록·GET reader·PC 게시 경로·주기별 freshness를 **별도 승인** 받아 진행한다. 사이트 R5·운영 R6도 각각 별도 승인 대상이다.
