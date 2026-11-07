# 시장 캘린더 ER1 별점 자동 반영 — 잔여 작업 실행 계획서

- 작성일: 2026-11-08 (KST)
- 문서 보관 브랜치: `codex/zgmini-gpt-workspace-20261025`
- 실제 기능 소스 기준: `ansqhd5774-Choi/zgmini` 최신 `main` (계획 수립 당시 `ec9c9738bf3e07e15eeac06a02ab3e5bec9ef9d0`; 실행 직전 재확인)
- PC 자동화·승인 정본: `ansqhd5774-Choi/zgmini-pc-control` 최신 `main`의 `AGENTS.md`, `docs/PC_AUTOMATION_STANDARD.md`, `docs/GENERAL_CHAT_START.md`, 실제 등록·config·Runtime
- 상태: **개발 중 / 실제 운영 자동 게시 미완료** / 잠정 전체 진행률 **약 80%**
- 목표: 2026년 11월 1회 계산이 아니라, **11월 원자료 완전성 회복 + 12월 이후 신규 수집분이 기존 PC Core 흐름에서 자동 계산·로컬 저장·공개 게시·화면 반영**되도록 완료한다. 자연 예약 실행 확인은 모든 기능 완료 뒤의 후속 작업이다.

## 1. 승인된 계약과 재사용할 완료 증거

| 항목 | 확정 사실 / 경계 | 상태 |
| --- | --- | --- |
| 별점 | `★★★: score >= 97`; `★★: 85 <= score < 97`; `★: score < 85`; 계산 불가·결측은 `-` | 승인·기존 소스 반영 |
| 산식·관측시점 | 기존 승인 ER1 실제 EPS·매출 산식, 뉴욕 현지 날짜와 발표 전 관측 제한 유지; R43 상위 5%·외부 명부·임의 충족률 혼입 금지 | PR #1003·#1004 `main` 병합 |
| PC 원 설치 | 관련 7개 파일을 기존 Writer B 경로로 설치 | #735 `WRITER_B_INSTALLED_VERIFIED`; 당시 PC 합성 source SHA `24610129461d027524a018daeba9f8b0cf9ed02c` |
| 11월 30일 | 일별 저장 근거 30일: SQLite 16일 + 비공개 보관 파일 14일 | #737 A급 가용성 확인; 3,071건 공급자 기록. 공개 표시 3,186건과 모집단 구분 |
| #739 | 검사 시 Core 활성 작업 없음으로 `STATE_UNKNOWN / CORE_NO_ACTIVE_TASK_ENGINE` | 운영 실패 확정 아님, 운영 파일 변경 0건 |
| 공개 화면 실측 | 2026-11-01~30 API 표출 3,186건 중 ★★★ 39, ★★ 161, ★ 1,137, 결측 1,849; 등급 제공 자료의 기준일은 2026-11-06 | **기존 공개 상태만 확인**. 수정본 자동 갱신 성공의 증거가 아님 |

## 2. 새로 확인된 실제 결함

- 계산기 `scripts/pc-writer/market-calendar-er1-auto-output.mjs`가 월별 하루 입력을 `release-calendar:earnings-api:YYYY-MM-DD` SQLite 저장 건으로만 조회하면 2026년 11월의 기존 비공개 보관일 14일을 놓친다.
- 승인된 비공개 파일 위치는 PC 홈의 `er1-input/nov30-forward-days/YYYY-MM-DD.json`이다. 원자료를 D1, GitHub 또는 공개 API로 복제하지 않는다.
- 정상 처리 계약은 **SQLite를 우선 읽고, 2026-11에 한해서 SQLite 누락일만 해당 기존 보관 파일에서 보충**하는 것이다. 날짜·저장시각·파일 형식을 검사하고 누락·손상 시 이전 유효 결과를 보존한다. 향후 월은 정상 SQLite 입력 경로만 이용한다.
- 재수집·공급자 API 추가 호출·산식 변경·DB 구조 변경·별도 예약·기능별 CMD 생성은 필요하지 않다.

## 3. 실행 계획 — 다음 필수 작업 순서

### 단계 A. 수정 소스 확정과 GitHub 통합

1. `main` 최신 SHA와 작업 파일의 차이를 확인하고 기존 사용자 승인·정상 구현을 보존한다.
2. 두 파일만 통합한다: `scripts/pc-writer/market-calendar-er1-auto-output.mjs`, `tests/market-calendar-er1-auto-output.test.mjs`.
3. 테스트로 16+14 병합, 파일 누락·손상 시 기존 공개 결과 보존, 이후 월 SQLite 자동 처리, 저장 결과 재조회, 추가 공급자 호출 0회를 확인한다.
4. **현재 로컬 후보 소스에서는 관련 테스트 247/247 PASS, `node --check` 및 `git diff --check` PASS**. 이는 GitHub 반영이나 PC 운영 완료와 다르다.
5. 지정 문서 브랜치 `codex/zgmini-gpt-workspace-20261025`는 최신 `main`과 크게 분기하고 현재 새 계산기 모듈이 없다. **해당 브랜치 전체 병합/이력 재작성 금지**. 실제 코드 작업은 사용자가 최신 `main` 기반의 좁은 ER1 수정 브랜치를 승인하면 그 브랜치에서 정확히 두 파일만 PR로 반영한다. 승인 전 임의 브랜치 전환·코드 push 금지.
6. 성공 판정: 관련 회귀 PASS + 대상 커밋/PR `main` 반영 + 운영 설치 대상 파일의 정확한 SHA 확보.

### 단계 B. 기존 승인 경로로 계산기 1파일만 PC 재설치

1. #735의 7파일 설치를 재사용한다. #735 당시 source SHA는 참고값이며 **설치 직전 실제 PC config·HEAD·대상 파일 preimage/hash**를 읽기 전용으로 확인한다.
2. Writer B 정규 source-install의 기존 승인 효과 안에서 계산기 1파일만 manifest에 명시한다. 파일 before/after SHA, base source, 보호·복구 조건과 실제 비밀정보 비노출을 유지한다.
3. 신규 고유 B 요청 1회 → 결과 JSON/TXT 회수 → 실제 설치 파일 SHA와 PC 합성 source/config SHA 확인. 동일 컨트롤러·DB 쓰기와 겹칠 때만 공유 lane 직렬화.
4. 성공 판정: `WRITER_B_INSTALLED_VERIFIED`, 정확한 1파일 설치 및 원본/다른 운영 파일 불변 증명. **PR·GitHub merge만으로 PC 설치 완료 판정 금지**.

### 단계 C. 기능의 실제 PC 계산·저장 검증

1. 기존 승인 Core 경로에서 신규 실행 한 번의 고유 request/ledger/checkpoint를 확인한다. #739의 순간적 비활성 상태를 새 실패나 불필요한 Core 재설치 요구로 취급하지 않는다.
2. 11월 30일이 SQLite 16일 + 보관 파일 14일로 반영되는지 확인한다. 원자료 결측과 점수 `0`을 혼동하지 않는다.
3. 계산 결과 저장→동일 키 read-back, sourceVersion/sourceStoredAt/관측일 및 공개 대상 projection 생성 상태를 확인한다. 성공 여부를 활성 작업 유무나 `READY` 외피만으로 판단하지 않는다.
4. 성공 판정: 정확한 저장·버전·일수·점수 분포 및 기존 유효 결과 보호, 공급자 API 재호출 0회.

### 단계 D. D1 게시와 API·화면 실측 완료

1. 승인된 게시기만 사용해 결과를 D1에 게시하고 D1 값·버전·게시시각을 **직접 재조회**한다. 비공개 원자료는 공개하지 않는다.
2. `/api/earnings-calendar-display?start=2026-11-01&end=2026-11-30`와 `/market-calendar/`을 확인한다. 3,186건은 기존 공개 스냅샷이므로 새 결과의 행 수가 같다고 무조건 요구하지 않는다.
3. 새 결과의 실제 기준일·별점/경계값·결측 상태·PC/모바일 표시 및 ★★★/★★/★ 필터가 공개 결과와 일치하는지 검증한다. 2026-11-06 기준 낡은 스냅샷을 새 결과로 오인하지 않는다.
4. 12월 이후의 월별 입력→계산→저장→게시 연결이 같은 경로로 지속되도록 검사한다. 수집이 실제로 되지 않은 미래 월을 가상 최신 데이터로 채우지 않는다.
5. 성공 판정: PC 계산→로컬 결과 재조회→D1 직접 재조회→API/UI 실제 일치. **기능 완성 판정 시점**.

### 단계 E. 최종 후속 작업 — 미래 자연 예약 실행 점검

1. **A~D 완료 후에만** 기존 Core/Korea 예약의 실제 정상 실행에서 다음 신규 데이터가 자동 반영되는지 확인한다.
2. 새 예약·기능별 CMD·중복 Controller·새 PC 설치를 만들지 않는다.
3. 이 단계는 기능 배포 완료의 임의 선행 Gate가 아니라 운영 연속성에 대한 별도 후속 검증이다.

## 4. 진행률·현재 장애·실행 구분

| 단계 | 현 상태 | 진행률 판정 |
| --- | --- | --- |
| 사용자 기준/기존 3,186건 분석/기초 자동 처리 구조 | 완료 증거 확보 | 완료 |
| #735 기존 7파일 PC 설치 / #737 원자료 확인 | 기존 증거 재사용 | 완료 |
| 14일 보관 파일 fallback 수정·관련 247개 테스트 | 로컬 후보 PASS, 아직 미반영 | **GitHub/운영 미완료** |
| 최신 main PR 통합 | 미실행 | 대기 |
| 한 파일 PC 재설치 | 미실행 | 대기 |
| Core 계산·로컬 read-back·D1·API/UI 갱신 | 미검증 | 대기 |
| 미래 자연 예약 실행 | 기능 완료 후 | DEFERRED |

- 전체 진행률 **약 80%는 기존 증거에 기반한 추정치**다. 남은 여러 필수 단계의 완료 비율을 의미하지 않으며 운영 갱신 완료를 주장하지 않는다.
- 현재 필수 차단 요소는 14일 보관 파일이 계산기에 미연결된 **운영 설치본의 기능 결함**이다. #739 `STATE_UNKNOWN` 자체는 차단 요소로 확정하지 않는다.
- 다음 **하나의 필수 실행**은 **수정 소스 두 파일의 최신 main 기준 PR 통합**이다. 실제 통합용 브랜치 전환은 사용자 승인 후 시행한다. 그 뒤 **기존 Writer B 단일 파일 설치 → Core 계산 → D1/API/UI 검증**을 순서대로 완료한다.

## 5. 수행·인계 경계

- 이 문서 작성은 계획 확보에 한정한다. 작성 자체로 PC 운영 파일·D1·스케줄러를 변경하지 않는다.
- 기능 담당이 코드·테스트·PC 설치·공개 검증을 직접 수행한다. 공통 Controller/Writer B 계약 자체의 별도 결함이 증명된 경우에만 프로세스 총괄에게 정확한 재현 증거와 최소 개선안을 인계한다.
- 실패가 나면 `LAST PASS / FIRST FAIL / 정확한 오류 / 영향 / 담당 / 최소 수정 / 재검증`으로 기록하고, 기존 승인된 완료 작업을 이유 없이 반복하지 않는다.

## 6. 실행 경과 갱신 — 2026-11-08 KST

- 기능 코드 PR [#1005](https://github.com/ansqhd5774-Choi/zgmini/pull/1005) **병합**: `main` `1be1734e9d8cf74375b3663ceee0033b928108a2`. 계산기/테스트 2파일만 변경, 247/247 관련 테스트 PASS.
- PC A급 [#742](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/742) **PASS**: 이전 설치 합성 source `24610129461d027524a018daeba9f8b0cf9ed02c`, checkout tracked-clean 및 Writer checkpoint 일치. 파일별 세부 목록은 요약 제한으로 원격 전송되지 않아 대상 원본 해시는 #735 설치 증거에서 재사용하고 정규 설치 시 CAS 재검증하도록 했다.
- 기존 Writer B 계산기 1파일 승인 manifest PR [#744](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/744) **병합**. Manifest `approvals/writer-updates/er1-nov-private-fallback-onefile-20261108.json`, SHA256 `fa5f926c3de5cff62b4d7314c521ed460af579cbe42a18baffa1d844156f1919`.
- PC B 단회 설치 [#745](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/745): **`WRITER_B_INSTALL_STOP_RESTORED / WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`**. 원격 결과 `results/writer-b-source-install-fdd1f29d-760b-4fc4-bde1-875e12dd22ae.json/.txt` 두 파일 회수, 동일 requestId 재실행 금지. 성공 source SHA 없음; 설치 완료로 판정하지 않는다.
- 후속 A [#748](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/748) **PASS / operationalWrites=0**: `core.lockPresent=true`, 승인 source SHA 여전히 `24610129461d027524a018daeba9f8b0cf9ed02c`, 최근 Core checkpoint COMPLETE/VERIFIED, 보호 상태 불변.
- 후속 A [#751](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/751) **PASS (19:51:49Z)**: 다시 `core.lockPresent=true`, writer checkpoint는 19:51:29Z `VERIFIED`로 전진, 승인 source SHA 변경 없음. #748(19:48Z)과 두 시점 모두 잠금이 지속되어 #745가 진단한 Core 활성 창 문제의 재현 근거를 보강한다. 이는 영구 lock 또는 scheduler 결함으로 확정한 증거는 아니다. 기존 유효 Core를 강제 정지하지 않으며, 실제 유휴 증거 전 새 B 요청을 생성하지 않는다.
- **현재 마지막 PASS:** GitHub 계산기 통합/manifest 승인, PC 읽기 전용 Core 현상 확인. **최초 FAIL:** 실제 PC Writer B 교체의 Core 활성 대기창. 재실행은 Core 유휴가 실측되고 중복 작업/공유 source 충돌이 해소된 뒤, 당시 base HEAD·원본 해시를 다시 대조해 새로운 고유 B 요청으로만 검토한다. 잠금 강제 삭제·Core 중지·승인 범위 확장 금지.
- **다음 필수 작업:** Core의 정상 유휴 확인 → 정확한 1파일 Writer B 설치 → 실제 Core 계산·local read-back → D1·API/UI 비교. 예약 자연 실행 검증은 마지막 후속 단계로 유지한다.
