# ZGMINI W04 고용지표 R6 — 최신 실행 계획 (2026-11-16)

> 상태: ACTIVE / 운영 연결 완료, `STATE_CLAIMS_BREADTH` PIT 이력 복구 미완료  
> 저장소: `ansqhd5774-Choi/zgmini` · 담당 브랜치: `codex/employment-1y-reader-r1`  
> 개발 기준: **항상 최신 `main`**; 이 문서는 전담 브랜치의 추적 문서이며 현재 기능 코드/운영 source를 의미하지 않는다.  
> 기존 상세 원안: [EMPLOYMENT_R6_DELIVERY_PLAN.md](EMPLOYMENT_R6_DELIVERY_PLAN.md). 해당 문서의 2026-11-08 진행률·차단 설명은 **당시 증거**로 보존하고 최신 상태는 이 문서와 [진행 원장](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)을 우선한다.

## 0. W04 실행·진행 기록·인계 필수 계약

> **적용 범위: 이 전담 브랜치의 모든 후속 작업자·대화·예약 실행.** 이미 존재하는 제어 저장소 `main`의 `AGENTS.md`·`docs/PC_AUTOMATION_STANDARD.md`('단계 종료와 다음 실행', '완료·보고·문서 유지') 및 앱 `main/AGENTS.md`의 작업 결과 보고 기준을 이 업무의 **정확한 파일 경로와 작업 순서로 구체화**한다. 새로운 공용 Gate·Controller·Runner·예약·검증 업무를 신설하는 것이 아니다.

**고정 파일 두 개(경로 변경·새 대체 원장 생성 금지)**

- **계획/단계 기준:** `docs/EMPLOYMENT_R6_CURRENT_EXECUTION_PLAN_20261116.md` — 72개 세부 ID, 선행조건, 각 단계의 완료 판정과 상태를 관리한다. 단계 구조나 실제 상태 변경 시 해당 행을 수정한다.
- **실행/인계 정본:** `docs/EMPLOYMENT_R6_PROGRESS_LOG_20261116.md` — 각 작업의 **실제 마지막 결과**를 시간순으로 누적한다. 다음 작업자는 이를 기준으로 마지막 유효 완료 지점과 남은 작업을 복원한다. 모든 작업 로그를 별도 .md/Issue 댓글에만 남기고 이 파일을 누락하는 것은 인계 완료가 아니다.

**매 작업의 필수 순서(소스 수정, 연구, A/B 실행, 진단 PASS/FAIL/WAIT, 게시, 점검, 문서 변경 모두 해당)**

1. **재개:** 저장소·전담 브랜치와 그 HEAD, 계획서 72개 세부 ID, **위 진행 기록의 마지막 유효 항목**을 먼저 확인한다. 이전 완료 증거를 재사용하고 마지막 미완료 필수 동작 하나를 정한다. 앱 최신 `main`·운영 승인/설치 source SHA·웹 배포 SHA는 각각 따로 둔다.
2. **실행과 결과 회수:** 실제 승인 범위의 작업을 수행해 PR/commit/CI 또는 PC 고유 Issue/requestId/Run/JSON/TXT, D1/API/UI 등 **해당 작업에 필요한 증거**를 회수한다. 작업 중단·안전 거부도 실제 결과로 구분한다.
3. **같은 작업 턴에서 진행 기록 반영:** 결과 확인 직후 **반드시 지정 진행 기록 .md에 누적**한다. 매 항목에 `작업 ID/대상 및 수행일·기준 SHA → 이번 실행·변경 파일 → 결과와 증거 링크 → LAST PASS/FIRST FAIL(해당 시) → 실제 오류·영향·승인/자원 조건 → 단계 상태/전체 세부 진행률 → 다음 한 작업 ID·입력·실행 경로·통과 조건`을 기록한다. 변경 없으면 `NO_CHANGE`, 안전 대기는 `BLOCKED/STATE_UNKNOWN`, 실제 완료는 `DONE`으로 적고 원인 미확정 값을 성공으로 보정하지 않는다. **원본 API/DB/민감정보 업로드 금지.**
4. **GitHub 반영 확인:** 기록 파일을 지정 브랜치에 commit 후, 원격 `fetch_file`로 **방금 기록한 고유 작업 ID와 결과**가 포함되는지 확인한다. 커밋 SHA와 기준 파일 blob을 확인한다. 기존 로그의 존재 여부만 확인하는 것으로 갈음할 수 없다. 계획상 단계 상태가 변했다면 계획서 상태와 기록의 수치도 대조한다.
5. **그 뒤 종료 보고:** 사용자에게 **실제 실행 결과**와 **진행 기록 반영 결과**를 구분해 보고한다. 기록 작성 또는 재조회가 실패하면 `작업 수행: 실제 결과대로 / 진행 기록: 미반영 또는 확인 불가 / 인계 완료: 아니오`로 보고한다. `VERIFIED`나 기록 포함 `DONE`을 주장하지 않는다. 이때 이미 완료한 PC/공급자 작업을 반복해 기록 누락을 메우지 않는다.

**인계 확인 기준:** 다른 작업자는 이전 대화 없이 지정된 두 파일만으로 `마지막 완료 세부 ID·실제 증거/해시·현재 STOP 사유·실제 다음 세부 ID·해제 조건`을 특정할 수 있어야 한다. 그 중 하나라도 기록에 빠지면 인계는 `INCOMPLETE`이다. 무관한 추가 진단·전체 재검사로 이를 대체하지 않는다.

**현재 기준선(2026-11-17):** **24/72 DONE(33.3%)**, 48/72 미완료. PIT-03 8/8과 신규 승인 A [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799)의 저장 Current 600주×51지역 최신 관측일(PIT-04-01) 및 545개 엄격 52주·4주 날짜 참조창(PIT-04-06) 실측 완료. 두 작업은 **Current 원자료 범위**이며 과거 History TRUE_PIT, 분모 null·zero 품질·최근 발표 반영 완료가 아니다. 다음 필수 작업은 여전히 `PIT-04-02` History 최신·이전 개정 분리다.

## 1. 완료 목표와 운영 계약

- 공식 BLS/DOL 고용 29개 지표(기존 구분 BLS 24 / DOL·ETA 5): 공급자 API → 승인된 PC Core 수집 → 원자료·관측일·출처·PIT 이력 SQLite 보존 → **저장 자료로만** 승인 산식 계산 → 로컬 결과 → 승인된 D1 공개 → `/api/employment-r6/observations` → `/economic-indicators/employment/` 화면.
- 사용자 요청의 범위는 기능의 실제 종료다. 코딩/CI/문서만 완료로 보고하지 않으며, Core 최신 source SHA·DB/원장·D1 공개 시각·Production API/UI를 구분한다.
- 결측·시차·PIT 부족을 정직하게 `STALE/PARTIAL_HISTORY/UNAVAILABLE`로 남긴다. 자료가 입증되지 않으면 29/29 점수 READY를 강제하지 않는다. 차트 1년 READY와 산식에 필요한 10년 PIT 점수 READY는 서로 다른 기준이다.
- 승인 없는 산식·가중치·PIT 정의·DB/D1 스키마·TTL·수집 주기·예약·배포·DNS 변경 금지. 이미 저장된 공식 51지역×600주 원자료의 대량 재수집과 신규 공급자 전환을 기본 후속 작업에 넣지 않는다.

## 2. 최신 완료 지점 — 2026-11-16 KST

| 완료 분야 | 실제 완료 증거 | 판정 |
|---|---|---|
| 자동/수동 ONE_YEAR 정책 분리 | 앱 [PR #1176](https://github.com/ansqhd5774-Choi/zgmini/pull/1176) 및 제어 [PR #1721](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1721) merged; 운영 1파일 Writer B [#1729](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1729) verified | DONE |
| DOL National 일시 장애 대응 | 앱 [PR #1178](https://github.com/ansqhd5774-Choi/zgmini/pull/1178), PC 2파일 설치 [#1751](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1751) `WRITER_B_INSTALLED_VERIFIED` | DONE |
| 수동 원자료 확보 | [#1755](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1755): 실제 Windows `SUCCESS`, DOL 2회, National 4/4·376행, 지역 5,712행, SQLite readback | DONE |
| 승인 Core → 저장 자료 계산 → D1 → API | [Writer 원장 #1758](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1758), [공개 API](https://zgmini.kr/api/employment-r6/observations): `sourceStoredAt=2026-11-16T13:55:15.655Z`, 원자료 29/29 | DONE — 공개 연결 범위 |
| 개별 점수·차트 | API: 점수 28/29, 최근 유효 점수 22/29, 1Y READY 22/29, PARTIAL 5/29, UNAVAILABLE 2/29 | PARTIAL — 합법적 결측과 별개로 1개 이력 문제 |
| 마지막 미완료 지표 | `STATE_CLAIMS_BREADTH`: 2025-07-19 원값 54.90196078%, score `PARTIAL_HISTORY`, chart `UNAVAILABLE`, 첫 부족 참조일 2015-07-25 | OPEN |
| Source-only 이력 감사 | [PR #1186](https://github.com/ansqhd5774-Choi/zgmini/pull/1186) `main` merged `f3ddab1f8506ff4ee49189a88c8e2391a040c626`, Node CI PASS | DONE — 운영 DB 수정 아님 |

**상태 해석:** 서비스 전달 경로 5/5 완료 ≠ 개별 계산 상태 29/29 완료. 과거 실PC 진단 [#782](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/782)에서 2026-11-07 Current 7,695키 중 HISTORY 없는 2,880키 및 후보와 겹치는 개정 충돌 2건 확인. 이 숫자는 **오늘의 결손 건수 아님**.

## 3. 다음 필수 작업 — 실행 순서 / 실제 통과 기준

| 번호 | 작업 항목 | 실행 근거·수행 세부 | 통과 조건 | 현재 |
|---|---|---|---|---|
| W04-PIT-01 | 마지막 성공 증거 보존 | #1755 National+state 수집, #1758 공개 갱신, #1186 소스·CI 재사용. 이미 완료된 수집/설치/전체 CI를 새 실행으로 반복하지 않음 | 이전 성공 ID, SHA 및 증거 유효성 보존 | DONE |
| W04-PIT-02 | PIT 누락 판정 함수 구현 | `employment-r6-claims-pit-recovery.mjs`: 지역 51개 고정, 현재/이력·최신 개정·해시/출처/가용 시각 구분 | 읽기 전용·결측/충돌·메타 미확인 분리, 600주 fixture PASS | DONE — PR #1186 |
| W04-PIT-03 | 최신 운영 PIT 분포 회수 | 고정 번들 `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`; A/light #1786 및 A/heavy #1787 | sqliteOpened=true; Current 40,726, History revisions 38,753, missing 2,880, matching candidate 2,625, candidate overlaps conflicts 14; JSON/TXT 2/2, 공급자/DB/D1 쓰기 0 | DONE — Run 43898451571 |
| W04-PIT-04 | Core 원본 계보 분류 | [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) Current 600주×51 실제 증거 확보. 이후 region/week History 최신 revision, raw snapshot, sourceHash, retrieved_at, available_at 분리 | PIT-04-01 완료·PIT-04-02~08 미완료; 후보 상충 14 별도 보류, TRUE_PIT 승격 금지 | IN_PROGRESS — PIT-04-02 |
| W04-PIT-05 | 복구 가능한 최소 범위 및 승인 확인 | 기존 공식 B 경로에 정확한 DB 대상·테이블·원본 보호·동일 자원 lease·manifest SHA·롤백 근거를 명시. `CURRENT`를 `TRUE_PIT`로 소급 승격하지 않음 | 승인된 정확 파일/키/효과와 실패 시 STOP 정의; 미승인 Core SQL 쓰기 0 | WAITING PIT-04 |
| W04-PIT-06 | 격리 회귀·시뮬레이션 | 신규 유효 관측/중복/개정충돌/미래시각/History 누락/저장 원장/계산/차트 조건 | 수정 영향 테스트 PASS; 과거 2건 상충 행은 자동 승격 금지 | WAITING PIT-05 |
| W04-PIT-07 | PC 최소 이력 복구 | 승인된 기존 B 유지보수 경로 한 번, 기존 DB/잠금/작업 보호. PIT 출처 검증 없는 행은 제외 | 실제 `CURRENT`/`HISTORY` 비교 건수·원장 전진/보호 상태 재조회 | WAITING APPROVAL |
| W04-PIT-08 | 저장 자료 재계산 | 공식 산식 및 PIT 시점 변경 없이 Core SQLite 자료만 사용. 공급자 호출 0건 | `STATE_CLAIMS_BREADTH` 최신 관측/score/1Y history와 부족 이유를 정확히 확인 | WAITING PIT-07 |
| W04-PIT-09 | 기존 D1 Writer 게시 | 승인 Core source와 기존 게시기를 재사용, 본문/hash/stored_at/sourceStoredAt 분리 | D1 readback 일치; 실패·timeout 시 이중 게시 금지 | WAITING PIT-08 |
| W04-PIT-10 | Production API/UI 결론 | `GET /api/employment-r6/observations`, 29행·날짜·원값·점수·차트 구분 | 정상 데이터는 갱신, 불충분한 이력은 `PARTIAL_HISTORY`로 정직하게 표시; PC/모바일 UI 확인 | WAITING PIT-09 |

**안전 판단:** 600주 Current raw가 있다는 것만으로 10년간 당시 알려진 `TRUE_PIT` 이력이 있다는 뜻은 아니다. 공식 과거 자료의 수집시각을 과거로 소급하거나 결손 점수를 임의 산출하는 경로는 채택하지 않는다. 검증 가능한 원자료가 부족하면 해당 지표를 정직한 `PARTIAL_HISTORY`로 남기는 것이 승인 계약에 맞는 완료 판정일 수 있으며, 이 경우 계획의 복구 단계는 더 이상 강행하지 않는다.

## 4. 최신 실행·실제 미해결·다음 필수 작업 (2026-11-17 KST)

- **신규 실PC 성공:** [#1786](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1786) / Run 43898278381 `R6_WAL_MEMORY_PREFLIGHT_READY` (free RAM 2275MiB, Core WAL 양쪽 sidecar 존재). 이어서 단회 [#1787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1787) / Run 43898451571 `EMPLOYMENT_R6_READONLY_STAGE_COMPLETED`, 실제 sqliteOpened, 결과 JSON/TXT 2/2 재조회. 이 결과로 PIT-03 8/8 완료. 이전 #1780 R13 inventory 차단은 해당 요청의 당시 결과로 보존하며 공통 조회 오류 원인 수정 완료라고 주장하지 않음.
- **실제 남은 문제:** Core Current 중 History 누락 키 2,880; 후보 matching·메타 일치 2,625; 후보 증빙 불충분 255; 후보 Current 충돌 14. 이 숫자만으로 10년 역사적 TRUE_PIT 가용성, 과거 주별 as-of, 복구 승인 범위를 결론 낼 수 없음. `STATE_CLAIMS_BREADTH` 최종 점수는 여전히 `PARTIAL_HISTORY`.
- **최신 실PC 성공:** 이전 [#1789](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1789) WAL sidecar 부재는 그 시점 한정. 신규 기존 A/light [#1798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1798) / Run 43904004344 **PASS**, Core -wal/-shm BOTH_PRESENT, RAM free 1799MiB (min 1536). 후속 기존 A [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) / Run 43904242672 **PASS/SQLite opened**, 최신 Current 2026-10-24, 600/600주×51지역 완전, 577주 원자료 선행조건 충족. JSON/TXT 2/2 원격 회수, 공급자/DB/D1 운영 쓰기 0. 2026-10-24 이후 수집 최신성/History-as-of는 별도 확인 필요.
- **다음 실행 하나:** `PIT-04-02`에서 기존 저장 History의 관측키별 최신 개정과 이전 개정 분리·출처 메타 검증. Current 600×51 완전성으로 `History` 10년 TRUE_PIT나 후보 2,625 자동 승격을 주장하지 않는다. [Draft 제어 PR #1791](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1791)은 이번 PIT-04-01 완료를 위해 **추가 설치할 필요가 없음**. 운영 동작·사이드카·원자료/스케줄 변경 금지.

## 5. 진행률 산정

- **수집 → PC 원자료 저장 → 계산 → D1 공개 → API/UI 전달:** `5/5` 완료(해당 전달 경로에 한정).
- **29개별 점수:** `28/29` (96.6%), 최근 유효 `22/29`, 1Y 차트 READY `22/29` — 각각 다른 지표.
- **잔여 PIT 10개 상위 범주 / 72개 세부 작업:** `24/72` DONE(33.3%), `48/72` 미완료. `PIT-03` 8/8, `PIT-04` 2/8 완료(01·06). `PIT-04-02`와 분모 null 검사는 실제 History/값 증거로 별도 진행한다. 기존 전달 경로 5/5와 분모를 합산하지 않는다.
- 이번 문서 작성/관리만으로 PIT 단계·운영 사이트 수치를 진척 처리하지 않는다.

## 6. 역할·공유 자원

W04 원담당이 기능 로직·실제 수동 검증·DB 이력·저장 자료 계산·게시를 담당한다. 동일 Core/DB/Controller에 겹치는 쓰기만 기존 중앙 자원 조정 및 보호 B로 직렬화한다. 다른 기능의 동시 독립 읽기/소스 개발은 중단시키지 않는다. 기존 `zgmini-pc-control/main`의 `AGENTS.md`, `docs/PC_AUTOMATION_STANDARD.md`, `docs/GENERAL_CHAT_START.md` 최신 계약이 실행 시 우선한다.


## 7. 72개 세부 실행 항목 — 실제 작업 단위별 확장 (2026-11-16)

> **계수 정정 및 최신 상태:** PIT-01~10은 상위 10개, 총 72개 세부 작업이 실제 분모. PIT-01 7 + PIT-02 7 + PIT-03 8 + PIT-04-01/06 2 = **24/72 DONE, 48개 미완료(33.3%)**. #1799 Current 관측일 51지역·545개 52주/4주 참조창의 실제 원자료 시간 범위만 인정한다. DB History 복구/PIT-as-of·개별 값/분모 숫자 유효성·29번째 점수/게시 성공은 미완료다.

| 상위 범주 | 세부 작업 수 | 완료 | 미완료 | 현재 상태 |
|---|---:|---:|---:|---|
| PIT-01 기존 운영 완료 증거 확정·재사용 | 7 | 7 | 0 | DONE |
| PIT-02 소스 계보 판정기·격리 회귀 완료 | 7 | 7 | 0 | DONE |
| PIT-03 현재 운영 PC의 실제 PIT 결손 확보 | 8 | 8 | 0 | DONE (PC #1786/#1787 읽기 전용 PASS) |
| PIT-04 지역별·주별 원자료와 PIT 정합성 분류 | 8 | 2 | 6 | IN_PROGRESS — PIT-04-02 History revision |
| PIT-05 복구 가능성 판정·최소 운영 승인 설계 | 8 | 0 | 8 | DEFERRED (선행 근거 필요) |
| PIT-06 선별 복구 코드·fixture 회귀·시뮬레이션 | 8 | 0 | 8 | DEFERRED (선행 근거 필요) |
| PIT-07 승인된 PC의 최소 History 복구·원장 | 8 | 0 | 8 | DEFERRED (선행 근거 필요) |
| PIT-08 저장 자료 기반 계산·로컬 결과 재검증 | 6 | 0 | 6 | DEFERRED (선행 근거 필요) |
| PIT-09 기존 D1 게시기와 읽기 결과 일치 | 6 | 0 | 6 | DEFERRED (선행 근거 필요) |
| PIT-10 Production API/UI 검증·종결 판정 | 6 | 0 | 6 | DEFERRED (선행 근거 필요) |
| **합계** | **72** | **24** | **48** | **33.3% · 세부 작업 기준** |

**완료 판정 원칙:** 모든 행에서 입력/실행과 합격 조건을 확인해야 한다. 시뮬레이션과 실제 PC 설치/SQLite 수정/D1 게시를 하나의 완료 증거로 합치지 않는다. 조건 불충족은 STOP/DEFERRED로 유지하며, 예약 자연 검증·임의 데이터 보간·신규 공급자 호출은 잔여 단계에 추가하지 않는다.

### PIT-01 — 기존 운영 완료 증거 확정·재사용 (7개, 모두 DONE)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-01-01 | 기존 승인된 수동/자동 ONE_YEAR 정책 분리 이력 고정 | 앱 PR #1176 · 제어 PR #1721 | 두 PR 병합·영향 범위 기록 | DONE |
| PIT-01-02 | 수동 ONE_YEAR 수집기 PC 설치 증거 확인 | PC #1729 / Run 43871926762 | 1파일 설치 VERIFIED와 당시 로컬 SHA 구분 | DONE |
| PIT-01-03 | DOL National 최소 재시도 코드·2파일 설치 증거 고정 | 앱 PR #1178 · PC #1751 | 2건 상한 유지·2파일 설치 VERIFIED | DONE |
| PIT-01-04 | 공식 원자료 수동 수집 결과 고정 | PC #1755 / Run 43879444100 | National 4계열/376행·지역 5712행·DOL 2회 | DONE |
| PIT-01-05 | PC SQLite 저장·원장 재조회 완료점 보존 | PC #1755 JSON/TXT·COLLECTOR_RECORDED | 원자료 재수집 요구 없이 저장 결과 범위 확정 | DONE |
| PIT-01-06 | Core 계산/게시 경로의 기존 완료 원장 고정 | PC #1758 · D1 Writer VERIFIED | 원자료 저장 성공과 게시 성공을 별도 증거로 기록 | DONE |
| PIT-01-07 | 공개 API 29개 지표 최신 상태와 마지막 결함 식별 | Production API sourceStoredAt 및 29지표 | 29/29 raw, 28/29 score, STATE_CLAIMS_BREADTH만 PIT 누락 | DONE |

### PIT-02 — 소스 계보 판정기·격리 회귀 완료 (7개, 모두 DONE)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-02-01 | Current/History 비교를 읽기 전용 함수로 분리 | 앱 PR #1186 | 운영 SQLite 쓰기 경로 없이 함수 생성 | DONE |
| PIT-02-02 | 51개 공식 지역·주별 관측 키 정의 | 기존 EMPLOYMENT_R4_CORE_STATES | 50개 주+DC만 인정, 관측 날짜 기준 중복 구분 | DONE |
| PIT-02-03 | 원본 공급자·계열·해시·메타 조건 검증 | STATE_INITIAL_CLAIMS / ETA539:C3 | 확인 불가능한 원본은 HOLD로 분리 | DONE |
| PIT-02-04 | 실제 as-of 시점·retrievedAt·availableAt 경계 분리 | 기존 PIT 자료 계약 | 미래 정보로 과거 상태를 소급 충족하지 않음 | DONE |
| PIT-02-05 | 최신 History 개정 충돌 차단 | 추가 latest-revision regression | 이전 일치 개정만으로 최신 충돌을 덮지 않음 | DONE |
| PIT-02-06 | 600주·51지역·결손·중복 회귀시험 완비 | tests/employment-r6-claims-pit-recovery.test.mjs | 정상/결손/불일치의 계산 입력 차이 재현 | DONE |
| PIT-02-07 | 관련 CI와 source main 병합 확정 | PR #1186 / CI 43886125560 | SUCCESS, merge f3ddab1f…; PC 이력 수정 주장 금지 | DONE |

### PIT-03 — 현재 운영 PC의 실제 PIT 결손 확보 (8개, 모두 DONE · #1786/#1787 실측)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-03-01 | 읽기 전용 분석에 사용할 고정 승인 번들 식별 | 등록 A `employment-r6-candidate-stage-readonly` | 분석 전용 SHA `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`, 운영 승인 SHA 별도·기존 #1765 확인 | DONE |
| PIT-03-02 | 기존 차단 요청의 원인과 소비된 ID 보존 | #1764 / #1765 및 신규 #1780 JSON·TXT | R6_BUNDLE_NOT_APPROVED / RESOURCE_WAIT_MEMORY / RETIRED_IRAN_INVENTORY_UNAVAILABLE 구분, 요청 ID 재사용 금지 | DONE |
| PIT-03-03 | 중량 A 진단의 현 메모리 admission 점검 | 기존 #1780 BLOCKED와 별도 A/light #1786 / Run 43898278381 | free 2,275MiB ≥ 1,536MiB, Core WAL+SHM·후보 ROLLBACK 모두 안전, 보호 해시 불변 | DONE |
| PIT-03-04 | 승인된 A operation을 새 고유 requestId로 단회 접수 | #1787 / Run 43898451571 · immutable bundle afdd8fab... | 새 requestId 단회·A/heavy 정상 실행, 우회 셸·DB 쓰기 0 | DONE |
| PIT-03-05 | 실제 Runner/Host·결과 JSON/TXT 2/2 회수 | #1787 seat 2·attempt 1 / Run 43898451571 | PASS; JSON blob b2f0150f...·TXT blob 38359a9f... 원격 2/2 재조회·실행 SHA 확인 | DONE |
| PIT-03-06 | SQLite 실제 열림 및 일관된 PIT 관측 범위 확인 | #1787 result.sqliteOpened=true, WAL preflight 및 memoryAdmission admitted | PC 실제 SQLite 조회 성공, 보호 before/after SHA 동일; 공급자·운영 DB/D1 쓰기 0 | DONE |
| PIT-03-07 | Current·History·후보 누락/충돌 총계 획득 | #1787 실제 Core+candidate PIT aggregate | Current 40,726, History 38,753, missing 2,880, matching/meta 2,625, unsupported 255, candidate conflicting 14; 11/07 과거 결과와 날짜 구별 | DONE |
| PIT-03-08 | 자료가 부족하면 승인된 기존 A의 최소 메타 조회 적합성 평가 | `controller/employment-r6-candidate-readonly.mjs`·`employment-r6-collection-evidence-readonly.mjs` | stage A는 PIT aggregate, evidence A는 Current/raw snapshot만 제공; 주차별 History-asOf 전체 검증 대체 불가·무근거 B 금지 | DONE |

### PIT-04 — 지역별·주별 원자료와 PIT 정합성 분류 (8개, 2 DONE · 6 미완료)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-04-01 | Current 관측일·지역별 최신 시각 정렬 | [#1798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1798) WAL·RAM PASS → [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) 실 SQLite Current 600×51, 2015-05-02~2026-10-24 | 최신 2026-10-24 주차 `51 rows/51 distinct/unknown=0`+최신 600주 검증으로 51지역 각각의 최대 **관측일** 2026-10-24, 600/600 완전주 논리 도출; per-region retrievedAt/PIT 시각은 후속 단계 | DONE |
| PIT-04-02 | History를 관측일·지역·최신 개정 단위로 정렬 | 기존 #1787 History 수량, 앱 [PR #1195](https://github.com/ansqhd5774-Choi/zgmini/pull/1195) 4553/0 FAIL, 제어 A [PR #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804) Windows 83/83, PC [#1812](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1812) R6 checkout 19/19 PASS, PC [#1819](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1819) **구 R6 Host 등록 PASS**·원본 SHA 확보, #1745 복구 11/11 PASS, frozen 16파일 [CI #43984972573](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43984972573) 4547/0 FAIL, [공통 B 검토용 제어 Draft PR #1822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1822) 승인 manifest 정확 2파일 준비 | 기존 설치된 **generic `pc-source-bundle-register`**를 이용한 신규 source 1개 추가만 필요(구 R6 14파일/Scheduler 유지). 신규 source B 승인·실제 등록과 제어 A 출력 모듈 누적 B 설치는 **둘 다 별도 미완료**. 실PC 10개 History count/asOf JSON/TXT 2/2 전 DONE 금지 | SOURCE_B_APPROVAL_DRAFT_READY — PC_HISTORY_UNVERIFIED |
| PIT-04-03 | Current와 최신 History의 값·sourceHash 정확 대조 | 관측키·원본 해시 | 정확 일치/누락/상충을 독립 버킷으로 분리 | TODO |
| PIT-04-04 | availableAt·retrievedAt·기록 시각의 PIT 적격성 검산 | 공식 관측 시각·DB 메타 | 미래 가용 데이터를 과거 TRUE_PIT로 승인하지 않음 | TODO |
| PIT-04-05 | 저장 raw snapshot 및 요청 원장에 원본 해시 귀속 확인 | 원자료 raw_snapshot·수집 Run | 동일 응답 출처와 기록시각 확인·불명 출처 HOLD | TODO |
| PIT-04-06 | 52주 참조 및 4주 계산에 필요한 주차 실측 | 실PC #1799 저장 Current 600/600주×51지역 완전, strict52 545주 / firstWindowBreak=null / 10y 577주 필요 | 55주 선행 참조(2015-05-02~2016-05-14), 첫 계산 가능 날짜 2016-05-21~최근 저장 관측일 2026-10-24의 545주 **날짜/지역 창 완전성** 확인; History as-of·분모 값 품질은 PIT-04-02/04/07 별도 | DONE |
| PIT-04-07 | 지역별 분모 0·null·missing 원칙 확인 | 실제 관측 수·데이터 계약 | 0을 임의 보간하거나 결측으로 둔갑시키지 않음 | TODO |
| PIT-04-08 | 재현 가능한 키·충돌 키·출처 불명 키 분리표 확정 | PIT-04 앞 7개 결과 | 원자료 유효 주차·충돌 건수·복구 제외 키 증거화 | TODO |

### PIT-05 — 복구 가능성 판정·최소 운영 승인 설계 (8개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-05-01 | 과거 공식 자료와 당시 실제 PIT의 입증 가능 범위 구별 | PIT-04 정합성 표 | 사후 수집 자료는 진짜 과거 게시·인지 시각으로 위장 금지 | TODO |
| PIT-05-02 | 복구 불가능한 구간을 정직한 PARTIAL로 남길 조건 확정 | 확정된 참조기간·발표 근거 | 10년 근거가 없으면 무리하게 점수 READY로 전환하지 않음 | TODO |
| PIT-05-03 | 후보 DB의 상충 개정 및 불확실 자료 제외 | 기존 과거 충돌 2건 + 현 실측 | 정확 원본 일치 입증 없는 후보 자동 편입 0 | TODO |
| PIT-05-04 | 변경 목표 테이블·키·필드의 최소 집합 결정 | 공식 Core Current/History·원자료 | 승인 범위 밖 다른 테이블·DB·지표 무변경 | TODO |
| PIT-05-05 | 공통 B 유지보수기의 실제 지원 범위 확인 | 등록 operation·승인 범위·필수 효과 | 일반 임의 SQL·shell 없이 필요한 경우에만 공식 B 검토 | TODO |
| PIT-05-06 | 신규 B 효력에 필요한 승인·manifest·원본 보호 확인 | 정확 소스 SHA·파일/DB 보호·해시 | 미승인 DB 변경은 STOP; 승인 없는 실제 쓰기 0 | TODO |
| PIT-05-07 | 동일 SQLite/Core 공유 쓰기 충돌·lease·백업 조건 정리 | 운영 DB owner·실제 작업 등록 | Core 실행 중 충돌하면 WAIT, 임의 lock 삭제·복원 금지 | TODO |
| PIT-05-08 | 적법하고 의미 있는 복구 후보에 대한 GO/NO-GO 결정 | PIT-05 앞 7개 근거 | GO: 원본+PIT+승인 충족 / NO-GO: 부족 이유 기록 | TODO |

### PIT-06 — 선별 복구 코드·fixture 회귀·시뮬레이션 (8개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-06-01 | 누락 History만 대상으로 하는 수정 설계 고정 | PIT-05 GO 키셋 | Current·기존 History·다른 지표 미변경 | TODO |
| PIT-06-02 | 51개 지역×완전 주차 재검증 fixture 작성 | 기존 공식 주차·지역 코드 | 50+DC 일부 누락 시 완전주 오판 0 | TODO |
| PIT-06-03 | 동일 키 재실행·중복 삽입 거부 검사 | 수정후 동일 스냅샷 시뮬레이션 | 기존 History를 불필요한 신규 revision으로 확대하지 않음 | TODO |
| PIT-06-04 | 서로 다른 최신 개정값 동시 존재 검사 | 상충 2건 동등 fixture | 충돌을 삭제/덮어써 PASS 처리하지 않음 | TODO |
| PIT-06-05 | 원자료 해시·출처/가용일 무결성 검증 | 상응 raw snapshot·PIT metadata | 불명/미래시각/비공식 행 삽입 0 | TODO |
| PIT-06-06 | 부분 실패·lease 거부·중단 상태 복구 시뮬레이션 | 기존 트랜잭션·결과 원장 계약 | 최종 PASS 없이 중간 쓰기를 성공으로 표시하지 않음 | TODO |
| PIT-06-07 | 기존 산식 변경 없는 계산·차트 입력 일치 검사 | selected History as-of fixture | 유효 구간만 계산, 근거 부족은 PARTIAL 유지 | TODO |
| PIT-06-08 | 변경 영향 테스트·CI 및 정확한 소스 범위 확정 | 완성된 최소 패치/PR/관련 tests | CI PASS; CI 성공=PC 적용 성공으로 간주하지 않음 | TODO |

### PIT-07 — 승인된 PC의 최소 History 복구·원장 (8개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-07-01 | 운영용 실제 source/config/DB 대상 SHA 재대조 | 최신 운영 PC 등록·설치 증거 | 개발 main과 실행 소스 및 DB 경로 구분 | TODO |
| PIT-07-02 | 실제 안전 실행 기회 및 Core 자원 보호 확인 | PC Core/SQLite lease·B admission | 공유 쓰기 충돌 시 절차 중단·기존 원장 보존 | TODO |
| PIT-07-03 | 필요 B 승인 manifest와 변경 키 집합 고정 | 사용자 승인 효력·PIT-05 GO 결과 | 정확 승인 범위 외 실행 불가 | TODO |
| PIT-07-04 | 승인된 유지보수기 1회 고유 요청 생성 | 기존 공식 B 절차·고유 requestId | 허용된 변경만 실행, 중복 요청 0 | TODO |
| PIT-07-05 | 수정 전 Core current/history/checkpoint 및 보존 상태 확인 | B preimage·원본 보호 | 복구 근거가 불충분하면 쓰기 전 STOP | TODO |
| PIT-07-06 | 누락된 정당한 이력만 단일 보호 쓰기로 반영 | B 작업 실행·검증된 키셋 | 기존 개정 무삭제·PIT 시각 소급 금지 | TODO |
| PIT-07-07 | 변경 후 History·raw·sourceHash·값 재조회 | B 런타임 JSON/TXT·readback | 승인 행 수·트랜잭션·원본 보호 검증 | TODO |
| PIT-07-08 | 최종 PASS/WAIT/FAIL과 LAST PASS/FIRST FAIL 기록 | 동일 요청 ID·실행 결과 | 실제 DB 성공과 source/CI 결과를 분리 | TODO |

### PIT-08 — 저장 자료 기반 계산·로컬 결과 재검증 (6개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-08-01 | 게시 대상 Core 저장 시점·sourceVersion 확정 | PIT-07 저장 원장과 기존 checkpoint | 관측일/저장일/계산일을 혼동하지 않음 | TODO |
| PIT-08-02 | 승인된 R6 산식으로만 재계산 수행 | SQLite 원자료·PIT History | 공급자 API 호출 0, 가중치·산식 변경 0 | TODO |
| PIT-08-03 | 52주 참조·4주 변화율 분모·지역 51개 검사 | History-asOf의 주차별 완전성 | 부족 자료는 임의 0/보간 금지 | TODO |
| PIT-08-04 | STATE_CLAIMS_BREADTH 실제 값·점수 상태 확인 | 저장 자료 계산 결과 | READY 또는 근거 있는 PARTIAL_HISTORY를 정확 판정 | TODO |
| PIT-08-05 | 1년 차트 포인트 수·날짜·마지막 점 검증 | 로컬 계산 출력·관측일 | 차트 날짜/단위·결측/축 일관성 | TODO |
| PIT-08-06 | 로컬 계산 결과·checksum·원장 재조회 | 기존 결과 저장 경로 | sourceStoredAt/관측일/계산시각 보존 및 최신화 증거 | TODO |

### PIT-09 — 기존 D1 게시기와 읽기 결과 일치 (6개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-09-01 | 기존 공개 key·승인 Publisher·권한 확인 | detail:employment-r6:one-year:v1 | 신규 경로/D1 schema/DNS 임의 생성 금지 | TODO |
| PIT-09-02 | 로컬 게시 후보가 검증된 결과인지 확인 | PIT-08 checksum·sourceVersion | PARTIAL과 READY를 과장하지 않은 본문 | TODO |
| PIT-09-03 | 승인된 동일 Writer 경로로 공개 반영 | 기존 PC 게시기 및 자원 보호 | 저장 자료만 게시, 임의 raw/키 업로드 금지 | TODO |
| PIT-09-04 | D1 body/hash/stored_at 정확 재조회 | 게시 ledger·D1 단일 key | 실제 변경 여부/UNCHANGED/실패 구분 | TODO |
| PIT-09-05 | D1 sourceStoredAt/observedAt/postedAt 날짜 검산 | 스냅샷 메타·원자료 hash | 오래된 내용을 새 관측 결과로 표시하지 않음 | TODO |
| PIT-09-06 | 실패·timeout 시 기존 게시 상태와 중복 게시 방지 | 원장·D1 마지막 유효 결과 | HTTP 200만으로 최신 게시 성공 주장 금지 | TODO |

### PIT-10 — Production API/UI 검증·종결 판정 (6개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-10-01 | Production GET 29개 ID·sourceVersion·원자료 상태 조회 | /api/employment-r6/observations | D1 게시 결과와 29/29 행·시각 일치 | TODO |
| PIT-10-02 | DOL National 4계열 및 STATE_CLAIMS_BREADTH 세부 행 대조 | 각 원값/점수/관측일/sourceStoredAt | 기존 4계열 정상 유지·마지막 지표 상태 확인 | TODO |
| PIT-10-03 | 점수/부분점수/이력 부족 상태 재집계 | API score/scoreStatus | 완료 단언 대신 29/29의 진짜 계산 가능 여부 보고 | TODO |
| PIT-10-04 | 1년 차트 READY·PARTIAL·UNAVAILABLE 점수 구분 | API history/차트 포인트/최종일 | 점수와 차트가 각각 필요한 근거 충족 | TODO |
| PIT-10-05 | PC·모바일 화면의 단위·축·마지막 점 확인 | /economic-indicators/employment/ | 요청 범위 내 표시 정상, 임의 UI 재설계 없음 | TODO |
| PIT-10-06 | 종단 완료 조건 충족 시 종료·미충족 시 원인 기록 | PC B·SQLite·D1·GET/UI 증거 | 기능 DONE/자료 정당 PARTIAL 분리, 잔여 실제 문제만 보고 | TODO |

### 다음 하나의 필수 실행 — PIT-04-01

- **이미 완료한 작업 재사용:** [#1786](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1786) WAL·RAM PASS와 [#1787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1787) 51지역 후보/전체 Core PIT 집계 PASS, immutable 분석 번들 SHA, 두 결과 JSON/TXT를 재사용하고 재실행하지 않는다.
- **작업:** 최신 Current 지역·관측 주별 시간 범위를 기존 승인 원자료/안전 projection과 대조한다. 입력의 범위·표본 단위·as-of 시점이 일치하는지 먼저 확인하고, 필요한 경우만 승인된 최소 비민감 read-only 조회 개선안을 검증한다. 과거 후보 중 값·해시 일치 2,625와 충돌 14가 TRUE_PIT 승격 승인인 것은 아니다.
- **PASS 조건:** 51지역 완전 주차, 지역별 최대 관측일, Current/History 서로 다른 개정·PIT 가용 시점, 계산에 필요한 52주 선행 참조의 검증 자료. 현 stage는 aggregate까지만 보이므로 미노출 주차를 추측하지 않는다. **STOP:** 미승인 원자료 공개/SQL·DB 쓰기/보호 우회.


### 2026-11-17 단회 A/light #1780 실증 및 진행률 정정

- 요청 [#1780](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1780) / [Run 43893673097](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43893673097): `employment-r6-wal-memory-preflight`가 `PREVALIDATION/PROTECTED_STATE_SNAPSHOT`에서 `RETIRED_IRAN_INVENTORY_UNAVAILABLE`로 차단. 실제 CPU/RAM/WAL·SQLite 조회에 진입하지 않았으며 공급자·DB·D1 쓰기 0. 과거 #1765 메모리 부족 결과가 오늘에도 유효하다고 추정 금지.
- 원인 경계: 제어 `main/controller/operations.mjs::attestRetiredIranAbsence`의 inventory 실행 상태 또는 인용 CSV 파싱이 검증되지 않음. 제거 승인 R13 재생성·보호 검증 삭제 불가. 중앙 #68 [인계 기록](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6920425471)은 다른 담당자 실제 수신/복구 증거 아님.
- `PIT-03-01`, `PIT-03-02`, `PIT-03-08`은 기존/신규 정본 조회에 근거해 DONE. `PIT-03-03`은 BLOCKED; `PIT-03-04`~`07`은 미실행. **전체 17/72 DONE, 55/72 잔여**. 다음 실PC 요청은 보호 목록의 정상 상태·메모리 안전조건이 실제 충족된 뒤 실행.


### 2026-11-17 W04 격리된 PIT 유효숫자 감사 수정 — 개발 main 반영, 운영 적용 별도

- **독립 소스 개선 결과:** `scripts/pc-writer/employment-r6-pit-coverage.mjs`의 후보 Current/History matching 과정에서 SQLite `REAL NOT NULL` 열에 저장될 수 있는 빈 TEXT 관측값이 `Number('')===0`으로 정상 0과 오인될 가능성을 제거. 숫자 0은 정상 입력으로 유지. `tests/pc-writer-employment-r6-pit-coverage.test.mjs`에 빈 후보·Core 0/후보 공백 충돌 **2개 신규 fixture** 추가. Core/candidate 원본 SHA 불변 및 `HOLD_*` 상태를 보존한다.
- **전담 브랜치 작업:** `codex/employment-1y-reader-r1` source `1318133ba62450ced9a12825dd3b0fd459300945`, tests `fe6acf4d44db9b547e4eccf70cce34677a6b1c7b`.
- **선별 main 통합:** 역사적 전담 브랜치를 통째로 merge하지 않음. 오직 두 파일만 최신 main 기반 `fix/w04-r6-pit-readonly-empty-value-20261117`에서 [PR #1190](https://github.com/ansqhd5774-Choi/zgmini/pull/1190)으로 반영; [Node.js CI #43896607559](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43896607559) `SUCCESS`, `main` squash SHA `17ea61707eb0b48e6c01517d46188fb48e57c509`. 파일 두 개 외 수정 없음.
- **검증 범위:** 격리 Node 숫자 가드 12 assertion PASS, SQLite `REAL NOT NULL` blank TEXT 허용 실증, 전체 저장소 Node.js CI PASS, main 실제 두 파일 blob readback PASS.
- **상태 경계:** 이 수정은 기존 읽기 전용 PIT 감사의 **안전성 보강**이지 실제 PC R6 bundle/Controller 설치·PIT HISTORY 증분·점수/산식·D1/사이트 상태 변경이 아니다. `PIT-03-03`은 #1780의 `RETIRED_IRAN_INVENTORY_UNAVAILABLE`로 여전히 BLOCKED. `PIT-06` 전체 fixture·B 승인·운영 과정은 아직 미완료. **세부 진행률 17/72 유지(23.6%)**.
- **다음 필수 동작:** 기존 [제어 중앙 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6920425471)에 인계한 공통 보호 Task 조회 오류의 안전한 수정·운영 정상화 증거를 받아 `PIT-03-03` 메모리/WAL 상태를 확인, 이후 승인 A `PIT-03-04` 한 차례만 요청. 무의미한 #1780 재실행·R13 재등록·임의 SQL 사용 금지.


### 2026-11-17 최신 PIT-03 8/8 완료 — 실제 PC 신규 증거

- A/light [#1786](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1786) Run 43898278381 `PASS/R6_WAL_MEMORY_PREFLIGHT_READY`, free 2275MiB, Core WAL/sidecars·candidate ROLLBACK 정상.
- A/heavy [#1787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1787) Run 43898451571 `PASS/EMPLOYMENT_R6_READONLY_STAGE_COMPLETED`, `sqliteOpened=true`, 2/2 원격 artifact 재조회. `Current=40726`, `History revisions=38753`, `missing=2880`, `matching candidate=2625`, `unverified=255`, `conflicting candidate overlap=14`. 공급자/DB/D1 쓰기 0.
- 현재 상세 완료 **22/72 (30.6%)**, 미완료 **50/72**. `PIT-03-03~07` 5개 신규 완료; `PIT-04-01` 다음. 과거 #1780 R13 오류의 구조적 근본 원인 수정·메모리 영구 정상·PIT 정합성 복구·웹 점수 29/29는 주장하지 않는다. 전체 증거는 [진행 원장 §13](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 누적 보존.


### 2026-11-17 PIT-04-01 현재 A 데이터 근거 조회 안전거부 — 신규 진행 기록

- [#1789](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1789) Run 43899712917 `STATE_UNKNOWN/R6_EVIDENCE_WAL_SIDECARS_ABSENT`; 실제 Core SQLite 오픈 0, `stateClaims=null`, 공급자/DB/D1 쓰기 0; JSON/TXT 원격 재조회 2/2. Actions conclusion SUCCESS를 기능 PASS로 해석하지 않는다.
- 같은 인가된 A는 주차별 aggregate만 반출하고 **지역별 최대 관측일/History revision as-of가 없으므로**, sidecar가 있더라도 `PIT-04-01` 완전 판정은 추가 정규 읽기 안전 경로 없이는 불가. 기존 #1787 2,880 결손/14 후보 충돌은 보존하고 TRUE_PIT 승격 근거로 사용하지 않는다.
- `PIT-04-01` BLOCKED, 전체 **22/72 DONE / 50 미완료** 불변. 다음은 공통 검증 보호를 유지한 최소 비민감 저장 이력 조회 구현·fixture 적합성 확인. 상세 원본 [진행 기록 §14](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) 참조.


### 2026-11-17 W04 PIT-04-01 소스 개선 및 검증: 개발 완료·실PC 미설치

- 기존 제어 `main@40a0767ec48829360a0b47a2b37e499d59944a05`에서 고용 전담 기능의 2파일만 분리한 [Draft PR #1791](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1791), head `999c144c45c14667b32b42b8db324e0d1a7b7aca`. 기존 A를 교체하지 않고 `stateClaims.regionLatest`에 51 고정 공식 지역별 날짜 `CURRENT_ONLY_NOT_PIT` projection 준비. WAL 모두 부재/부분 부재를 fail-closed로 분류해 운영 DB 손상/복구로 오인하지 않음.
- Windows [W04 Node source CI 43901867724](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43901867724) 해당 21/21 및 기존 경로 47/47 PASS; [C996 43901867639](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43901867639) SUCCESS. 두 파일만 수정. 공통 #68 [인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6921555673) 등록. 이는 **SOURCE_READY/CI_PASS**이지 실제 설치나 PIT-04-01 운영 DONE 아님.
- **현재 기능 진행률 22/72 = 30.6%, 잔여 50 유지.** 단계 `PIT-04-01=BLOCKED/SOURCE_READY`, 원자료·History·DB·D1/점수 28/29 변화 없음. 다음 필수 실제 동작은 공통 owner의 기존 승인 정규 Controller 적용 경로와 검증된 최신 WAL-safe snapshot 조건을 분리 점검하여 최소 두 파일의 적용 필요성을 결정하는 것. source main SHA, 실제 설치 SHA, 승인 manifest, lease와 출처 적합성 확인 전 운영 설치/새 A 요청은 하지 않는다. 실제 regionLatest 51지역 결과가 반환되고 기존 단계별 저장 이력 근거가 맞을 때만 PIT-04-01 DONE으로 전환. 상세 실행 결과는 [진행 기록 §15](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### 2026-11-17 PIT-04-01 WAL sidecar 정상 종료·immutable 신선도 격리 시뮬레이션

- 임시 SQLite fixture에서 WAL/SHM (둘 다 존재) → 마지막 정상 연결 종료 뒤 둘 다 부재, SQLite header WAL [2,2] 유지가 재현됨. sidecar 부재는 DB 손상이나 안전한 데이터 스냅샷이라고 단정하지 않는다.
- 다른 임시 fixture에서는 활성 writer가 commit한 최신 1행을 일반 SELECT에서 읽었지만 `immutable=1` reader에서는 **0행**이 관측됨. 정확한 as-of 데이터가 중요한 고용 R6에 `immutable=1`을 임의 fallback으로 넣지 않는다.
- 결과는 [진행 기록 §16](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 보존. [Draft #1791](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1791)의 기존 fail-closed WAL 보호와 Current-only 51지역 날짜 출력 제안만 유지. 실제 PC `#1789` 원인 확정/Controller 운영 설치/52주·10년 PIT 복구는 미완료.
- 다음 필수 실행은 공통 owner의 정규 안전 snapshot·설치 범위 확인 후 실제 최신 source와 51개 지역 날짜 조회를 **한 번 새 A**로 증명하는 것. `PIT-04-01` **BLOCKED/SOURCE_READY**; 전체 **22/72 DONE(30.6%), 50/72 미완료** 불변.


### 2026-11-17 신규 실PC #1798/#1799 — Current 51지역 최신일 PASS, PIT-04-01 DONE

- 실제 A/light [#1798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1798) Run 43904004344 WAL 양쪽 존재·RAM 1799MiB/PASS. 실제 기존 A [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) Run 43904242672 `PASS/R6_DOL_BED_STORED_EVIDENCE_READONLY`, sqliteOpened=true, artifact JSON/TXT 2/2.
- 고정 51개 공식 지역의 최신 600 관측주를 DESC 조회한 실제 SQLite 집계 `complete51Weeks=600`, `incompleteWeeks=0`, 최신 `2026-10-24` 주차 51행·고유 51지역·미등록 0의 완전주. 이는 모든 공식 지역의 최대 **Current 관측일**이 2026-10-24임을 집합 논리로 입증한다. `fullTenYearRawCoverage=RAW_PRECONDITIONS_COMPLETE`는 577주×51지역 원자료 충족만 의미하고 과거 실제 `History` PIT 진실성은 미입증. 최신 저장 이후 발표 여부·2026-11 현재 최신성을 자동 승인하지 않는다.
- 이 실측이 기존 Draft #1791 `regionLatest` 출력의 추가 운영 설치 없이도 `PIT-04-01`의 목표를 충족하므로 **그 Draft를 본 단계 필수 조건에서 제외**한다. #1791은 아직 미병합/미설치, 공통 Controller 변경은 수행하지 않는다.
- **변경 상태: PIT-04-01 DONE, 전체 23/72(31.9%), 49개 미완료.** 다음 `PIT-04-02` 관측일×지역 최신 `History` revision 분리. 상세 원본 [진행 기록 §17](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md). 공급자/DB/D1/웹 운영 변경 0.


### 2026-11-17 후속 PIT-04-06 52주·4주 저장 Current 참조창 확인

- 독립 작업 `PIT-04-06`은 기존 승인 A [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) Run 43904242672의 같은 읽기 전용 SQLite 결과로 완결: `sampledWeeks=600`, `complete51Weeks=600`, `strict52WeekCandidateCount=545`, `firstWindowBreak=null`, `latestWindowBreak=null`; 55주 선행 참조 후 2016-05-21~2026-10-24 날짜/지역 완전주. `fullTenYearRawCoverage=RAW_PRECONDITIONS_COMPLETE`는 필요 577주×51지역 저장 Current 전제만 가리킴.
- `PIT-04-06` **DONE**, `PIT-04` 2/8, 전체 **24/72 DONE(33.3%), 잔여 48**. PIT-04-02 History 최신 revision과 04-07 0/null/blank 값/분모는 이번 완료 범위 밖이다. 자세한 실행 증거·별도 source CI 실패 및 수정은 [진행 원장 §18](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 보존.
- 앱 격리 소스 검증: [Draft PR #1195](https://github.com/ansqhd5774-Choi/zgmini/pull/1195) 정확 2파일. 최초 [Node CI 43906302719](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43906302719) 공백값 오분류 2 FAIL을 기존 assertion 보존 최소 수정으로 해결. 최신 HEAD `48c5e61d7a5b28a6ee2d9f8a47f4742326cc2f9d`의 [Node CI 43906987544](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43906987544) **4523 tests / 4513 PASS / 0 FAIL / 7 SKIP / 3 TODO**, 04-02 신규 4/4 및 기존 공백 2건 PASS, Build/typecheck/11개 게시복구/69개 CF read 계약 PASS. **source CI=실PC History revision 검증/설치/운영 게시 완료 아님**. 구체적 시점별 변경은 [진행 기록 §19](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### 2026-11-17 PIT-04-02 기존 등록 A 3층 비민감 History 출력 연결

- **원인/재사용:** 기존 운영 PC [#1787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1787)는 Core History 총 개정 38,753건을 집계했으나, 기존 앱 Reader·전담 Runner·Controller 고정 출력 허용목록에서 최신/과거 개정별·동시각 상충 `asOf` 숫자 분포가 미노출. 기존 A를 재실행해도 동일 출력이므로 재요청하지 않는다.
- **최소 소스 연결:** 앱 `codex/employment-1y-reader-r1`에서 `employment-r6-pit-coverage.mjs` + 감사 fixture를 [Draft #1195](https://github.com/ansqhd5774-Choi/zgmini/pull/1195) **실제 Node CI PASS 코드에서 선별 복원**, `employment-r6-runner-stage.mjs`의 허용 개정 count 10개 및 `HOLD_AMBIGUOUS_LATEST_REVISIONS`+fixture 2개 추가. 정확 앱 4파일. 공통 제어 최신 main 기반 [Draft PR #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804)는 기존 `controller/employment-r6-candidate-readonly.mjs`의 **10개 count-only + 검증된 `asOfDate`**를 반환하도록 보강; 제어 영향 소스 1개·테스트 1개·기존 W04 격리 CI 워크플로 1개(총 3파일). 신규 A, Controller/Runner·Scheduler·DB/D1·산식 변경 없음.
- **검증:** 앱 #1195 [Node CI 43906987544](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43906987544) `4523 tests / 4513 PASS / 0 FAIL / 7 SKIP / 3 TODO` (소스 감사 레이어). 제어 #1804 중간 HEAD `dca5b448` [Windows W04 CI 43978763417](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43978763417) `SUCCESS`, R6 기존 A 출력 fixture **7/7 PASS**. 제어 최신 HEAD `4c6fe39d50aa8d11ce451a1f5a29dbdd1be823d2` [W04 43979157453](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157453) / [C996 43979157561](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157561)은 최초 `QUEUED`(최종 결과 별도 추적); 앱 **Runner** 레이어 전담 브랜치 테스트는 source fixture 작성 완료이나 native CI 아직 없으므로 PASS로 표기하지 않는다.
- **기준선:** `PIT-04-01 DONE` + `PIT-04-06 DONE`, `PIT-04-02` **SOURCE_PIPELINE_READY/OPERATING_UNVERIFIED**. 전체 **24/72 DONE(33.3%), 미완료 48**. 공통 공유 Controller 현재 PC 설치 SHA는 기존 실측 `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`; 새 소스 PR/브랜치 커밋 및 운영 실제 SHA는 불일치. 기존 승인 R6 bundle `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`를 자동 교체할 수 없다. 
- **다음 필수 실행 하나:** 최종 CI와 두 저장소 SHA·정확한 영향 source 파일을 원격 재확인 후, 중앙 #68 Controller owner에게 **기존 A 1개·승인 R6 불변 source bundle 1개**의 실제 운영 누적 preimage/manifest·lease·승인 범위 차이를 보존한 최소 적용 조건을 명시한다. 승인된 B와 실PC source 검증 없이는 신규 A 실행·History 값/출처 승격·29/29 계산/게시 성공으로 바꾸지 않는다. 기록 [§20](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### 2026-11-17 W04 제어 PR #1804 최종 Windows CI PASS 후 정정

- **최신 제어 PR [#1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804) HEAD `4c6fe39d50aa8d11ce451a1f5a29dbdd1be823d2`**의 격리 Windows [W04 Run 43979157453](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157453)는 실제 checkout/Windows Node 22 및 단계별 결과 재조회 **완료/성공**: DOL fixture 47/47, 저장 evidence fixture 17/17, 기존 R6 A History count/asOf 안전 출력 8/8, 공유 resource 11/11 = **83/83 PASS·0 FAIL**. [C996 Run 43979157561](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157561)도 SUCCESS. 앞선 `QUEUED`는 당시 상태였고 결과 정본을 이 항목으로 정정한다.
- 앱 #1195 CI PASS(4523 tests/0 FAIL)와 제어 #1804 CI PASS는 각각 소스/테스트 증거이다. **전담 Runner 별도 Native CI / 실제 PC 새 source bundle 승인·설치·History 개정 수치 실측은 여전히 미완료**. `PIT-04-02=SOURCE_CI_VERIFIED/RUNTIME_PENDING`, 전체 **24/72 DONE(33.3%), 48/72 잔여** 유지.
- 공통 담당 [#68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6932576302)에는 정확히 변경된 기존 Controller A 1모듈, 앱 Runner/감사 2모듈, 기존 bundle/Controller 실설치 SHA 분리를 인계했다. 승인된 누적 source/manifest/preimage/lease 확인이 선행되어야 한다. next: 실제 B 범위·효과 확인 후 인가된 기존 A 새 고유 요청 1회, `asOf`·10개 History revision 분포+원격 JSON/TXT 2/2 확보. 자세한 증거는 [진행 기록 §21](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 보존.


### 2026-11-17 PIT-04-02 앱 전체 4파일 통합 CI 완료·실제 R6 신규 source 승인 범위 확인

- **검증 완료:** [앱 Draft PR #1195](https://github.com/ansqhd5774-Choi/zgmini/pull/1195) HEAD `dfa7d5e487e86a8887cb2766bc0ba9a1a114e048` — `employment-r6-pit-coverage.mjs`, `employment-r6-runner-stage.mjs` 및 각각의 테스트 정확 **4파일**. 최초 [Node CI #43980561859](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43980561859)는 신규 Runner 오입력 fixture 1건이 필수 공개 결과 body 누락으로 `RUNNER_R6_PUBLIC_DISPLAY_INVALID` 실패. 기존 guard/test assertion 보존 후 **fixture에 정상 격리 SQLite 공개 body 제공**으로만 수정. [후속 Node CI #43980978653](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43980978653)는 **4553 tests, 4543 PASS, 0 FAIL, 7 SKIP, 3 TODO**, Build/typecheck·PC 게시검사 11/11·Cloudflare 69/69 PASS. 기존 앱 개발 브랜치와 Runner 최신 테스트 blob 동일 원격 확인. PR은 Draft/미병합/미배포.
- **제어 A 결과 재사용:** [Control PR #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804) 기존 operation `employment-r6-candidate-stage-readonly` 출력 최소 10개/asOf 검증, 격리 [Windows CI #43979157453](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157453) 83/83 PASS. 새 A/Runner/예약을 만들지 않음. 제어 개발 main, PR HEAD, PC 설치 SHA 서로 다름.
- **실제 적용 차단의 구조:** 제어 `tools/stage-r6-host-registration.mjs`가 `R6_EXACT_SOURCE_SHA=afdd8fab1c03b321e4b8b0853bb236c0800a0a14` 및 승인 manifest `42afb8fe4f0ecdeb551256ec897bb99b1e850420dd0f5bc7b74ec03db2f46c81`만 허용하며 `approvals/host-r6/` 승인 JSON도 이 고정 SHA 1개뿐. `tools/apply-r6-host-overlay-b.mjs`는 같은 정확 SHA의 **최초 등록** 전제이므로 새로운 수정 Runner/History source bundle을 기존 B 승인으로 등록·교체할 수 없다. 기존 Controller #1745 `RECOVERY_REQUIRED` 원장을 임의 해제/재실행하지 않는다.
- **단계 유지:** `PIT-04-02=SOURCE_INTEGRATION_CI_PASS/SOURCE_APPROVAL_BLOCKED`, 전체 **24/72 DONE(33.3%), 48 미완료**. 다음 필수 효과는 [#68 인계 #6932786062](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6932786062)의 중앙 Owner가 **새 source SHA·승인 manifest/preimage·기존 승인효력/lease**를 검증하고 범위 밖 효과에 명시 승인을 확보한 후 정규 B로 실제 설치/원격 확인하는 것. 설치가 검증되기 전 새 A 반복 요청 불필요. 이후에만 기존 A 고유 1회로 10개 revision/by asOf 값을 회수하고 DONE 판정. 상세 실 CI·LAST PASS/FIRST FAIL/수정 커밋은 [진행 기록 §22](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### 2026-11-17 W04-PIT-04-02 — 19파일 고정 PC preimage 확인·2파일 승인 source 후보 고정

- **실제 설치 전 A 결과:** [pc-job #1812](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1812) / [Run 43982706453](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43982706453) `PASS/WRITER_FIXED_PREIMAGE_READONLY`, **고용 R6 파일 19/19 PRESENT**, Core 고정 checkout HEAD/config/checkpoint `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388` 일치, Controller `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`, R6 AutoCollection·OneYearAutoPublication 설정 `ENABLED`, 보호상태 SHA 전후 불변. JSON/TXT **2/2**. `runtimeSourceVerified=false/coreTaskSourceLinked=false`: **활성 Core 프로세스가 이 SHA로 동작·정상 수집·게시한다는 뜻이 아니다**. DB/D1/운영 쓰기 0.
- **승인 범위 축소:** 원래 16파일 source 승인 커밋 `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`과 현재 전담 브랜치 전체를 묶으면 R6 Scheduler 조기 발표일 소스도 달라지므로, 승인되지 않은 **Scheduler 변경 0**을 보장하도록 원래 커밋에서 별도 최소 `fix/w04-r6-pit-history-bundle-minimal-20261117` branch 생성. HEAD **`2b5255147b16d595196a8f006cf1d95c840a4926`**, compare **2 commits/2 source files only** (PIT-coverage와 Runner), 나머지 14 파일 기존 SHA 유지. 원본 승인 `R6_SOURCE_FILES` 16개만 사용하고 `config/operations.json`·DB·가중치·Scheduler·공급자 호출 변경 없음.
- **최소 검토 manifest 작성 및 SHA-256 재검증:** [`EMPLOYMENT_R6_PIT04_02_MINIMAL_SOURCE_MANIFEST_DRAFT_20261117.json`](EMPLOYMENT_R6_PIT04_02_MINIMAL_SOURCE_MANIFEST_DRAFT_20261117.json), source HEAD `2b525...`, branch `fix/w04-r6-pit-history-bundle-minimal-20261117`, 변경된 2파일의 SHA256 `7f590286b00bee52c4d355e10a44d8662ea94724b8ad6d29bcd9749e9035bec7`, `02e399b26cbc5f4333f3993bd16f1cff6bc41ae85d5e41b9896dcf849cedac66`. 정확 JSON+LF manifest SHA256 **`60e0c7b404368be3551f0f6d85819ac5895ae4f32bc43d694aa8d818db0f74f6`**. 기존 승인 manifest 해시 `42afb8fe4f0ecdeb551256ec897bb99b1e850420dd0f5bc7b74ec03db2f46c81`를 같은 계산기로 재현하여 확인. **승인 증명서가 아닌 SOURCE_DRAFT**.
- **현재 실제 차단·다음 최소 실행:** 신규 source SHA·branch의 B 정규 upgrade/병존 승인은 없음. 기존 `stage-r6-host-registration.mjs`/ `apply-r6-host-overlay-b.mjs`는 기존 source `afdd...`와 최초 등록을 고정하므로 **이 draft를 그대로 실행하면 안 됨**. 공통 Owner [#68 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6933077228)에서 이번 최소 2파일 조합의 **격리 Fixture·source/manifest/preimage/lease 정합성**과 별도 신규 승인 범위를 확정한 다음, 승인된 기존 정규 B 경로에서만 실제 설치. 이후 기존 A `employment-r6-candidate-stage-readonly` 신규 1회로 10개 History revision/asOf·JSON/TXT 2/2 확인 시 `PIT-04-02 DONE` 판단. [진행 기록 §23](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에서 실제 증거·LAST PASS/BLOCKER를 복원. **전체 24/72 DONE(33.3%), 잔여 48, 단계 순서 유지**.


### 2026-11-17 PIT-04-02 frozen 16파일 정확 CI PASS 및 B 승인 경계 확정

- [검증 전용 PR #1198](https://github.com/ansqhd5774-Choi/zgmini/pull/1198)는 현재 앱 main 기반 **test-only 1파일** 임시 검증 PR. 과거 승인 `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`에서 두 파일만 변경한 고정 source `2b5255147b16d595196a8f006cf1d95c840a4926`와 [16파일 검토 manifest](EMPLOYMENT_R6_PIT04_02_MINIMAL_SOURCE_MANIFEST_DRAFT_20261117.json)(SHA256 `60e0c7b404368be3551f0f6d85819ac5895ae4f32bc43d694aa8d818db0f74f6`)를 임시 별도 git worktree에서 재구성. **16/16 SHA256 PASS, 원본 대비 변경 정확 2파일, Scheduler 원본 그대로**, 실제 Runner/PIT 최신 fixture 2세트를 격리 Node에서 실행한 test assertion까지 확인.
- FIRST FAIL: 최초 [Node CI #43984579700](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43984579700)에서 하위 Node test TAP 결과를 부모 test IPC가 흡수해 stdout이 빈 문자열이 된 **검증 test-only harness 1건** 실패. 기존 운영 guard/assertion을 삭제하지 않고 nested process의 test context를 분리, TAP 총건수·fail0·Runner 테스트명 검증을 강화. 후속 최종 [Node CI #43984972573](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43984972573) **completed/success**, **4547 tests / 4537 PASS / 0 FAIL / 7 SKIP / 3 TODO**, frozen 16파일 fixture 1/1 PASS, Build/Typecheck/PC publication 11/11/Cloudflare read 69/69 PASS. PR #1198은 로그 댓글 보존 후 **closed/unmerged**. main/운영 PC/DB/D1/웹 변경 0.
- 현 단계 진단: `PIT-04-02 SOURCE_COMPATIBILITY_CI_PASS / B_APPROVAL_REQUIRED`, 기존 72단계 중 **24/72 DONE(33.3%), 미완료 48** 유지. CI PASS는 이전 신규 R6 source SHA/manifest에 대한 B 운영 승인이나 설치·실제 History 개정 수치 검증의 대체가 아니다. 원본 구 source 초기 host 등록만 승인됐으므로 기존 B primitive 재사용으로 새로운 source를 설치하지 않는다.
- **다음 필수 실행 한 개:** 공유 단일 owner [#68 인계 #6933377798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6933377798)에서 현재 Controller/host SHA·#1745 유지보수 원장/lease, frozen source 정확 2개 변경의 승인·backup/preimage, 기존 A projection PR #1804의 최소 설치 범위를 확인하고 **새 버전 source 병존/보존형 upgrade B 승인 경로**를 확정한다. 실제 승인된 설치·원격 SHA readback 이후에만 기존 A `employment-r6-candidate-stage-readonly` 1회 고유 요청으로 History 10개 latest/prior/ambiguous/asOf 값을 받아 PIT-04-02 DONE 판정. 전체 실행 상세는 [진행 기록 §24](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### 2026-11-17 PIT-04-02 R6 Host CAS 실측 및 공통 Source Bundle B 승인지원 경로

- **변경된 공유 운영 상태 실제 확인:** 공용 #1745 intake recovery는 2026-11-17 00:07:57Z readback `INTAKE_RECOVERED_EXISTING_CONTROLLER_PRESERVED`, 11/11 PASS, Windows 76/76, 기존 설치 Controller `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`/실행 원장 불변, 관측 시점 install lease `held=false`. 기존 복구 대기 자체는 해소됨. 실제 새 B 적용 직전 동일 lease는 반드시 재검증.
- **추가 운영 A 성공:** [pc-job #1819](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1819) / [Run 43986010471](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43986010471) `PASS/R6_HOST_ALREADY_REGISTERED`; 원승인 source `afdd8fab1c03b321e4b8b0853bb236c0800a0a14` 실제 Host 등록, 설치 Controller `e3a495...`, Host SHA256 **`e6c8e30480cedddcf20f0b1bcdc5fd0063dda09860d48e313a04a660cc01128c`**. JSON/TXT 원격 2/2; protected unchanged, provider/operational/D1 writes 0. 기존 R6 최초 B 등록을 재시도할 이유 없음.
- **기존 공통 B 재사용 확정:** 실제 설치 maintainer source `33d66558f6ed1807f23257ef6a5af2eacd8e3969`에 `tools/source-bundle-register.mjs`/공통 `pc-source-bundle-register` 경로 존재. 승인 schema `ZGMINI_PC_SOURCE_BUNDLE_B_APPROVAL_V2`, 소스 manifest `ZGMINI_PC_SOURCE_BUNDLE_MANIFEST_V1`, scope `HOST_APPROVED_SOURCES_SINGLE_CAS_ONLY`; 다른 approvedSources 보존, 신규 R6 sourceKey 한 개만 추가, 기존 Controller/수집/DB/예약 불변. **신규 기능별 B installer/Controller 코드 필요 없음**. 별도 기존 A 출력 변경은 [Control Draft #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804)에 유지.
- **정확 승인 검토 초안 산출:** 기존 frozen `2b5255147b16d595196a8f006cf1d95c840a4926`의 16개 기존 고정 SHA를 보존하는 [공통 V1 검토 JSON](EMPLOYMENT_R6_PIT04_02_SOURCE_BUNDLE_V1_REVIEW_20261117.json), SHA256 `e01874cea6774deae2e4e8bef4691e9d3d67be2153af09c0f69f3cbf472f4c59`. 제어 [Draft PR #1822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1822), source `draft/w04-r6-pit04-source-bundle-b-20261117` HEAD `11e6abc4767546af28182c9030e38cc1bc64fe76`, `approvals/source-bundles/manifests/2b525...`+ `approvals/source-bundles/93bae0ec...` 정확 **2 JSON 파일만 추가**, PR open/draft/unmerged/mergeable clean. B `approvalDigest=93bae0ec850ddfdc1b6cf69d3b8a5b102184f62a62aa297e2fe07d2007bdc176`, 대상 기존 Controller 관측 `e3a495...`, exact requestId·backupDirectory·manifest SHA·원본 보존·PR ref 포함. [CI #43986902161](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43986902161) SUCCESS. **Draft를 승인이나 설치 완료로 해석 금지**.
- **남은 단계/다음 행동:** `PIT-04-02 SOURCE_B_APPROVAL_DRAFT_READY/PC_HISTORY_UNVERIFIED`, **24/72 DONE(33.3%), 48 잔여**. 공유 owner [#68 최신 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6933634080)는 신규 source-key B 효과에 대한 명시 승인, 승인 PR main 정본·유효 SHA/Host CAS·배타 lease, 기존 제어 A 출력 [Draft #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804)의 별도 공유 B 효과를 검토·확정한다. 승인 후 기존 공통 B만 사용해 새 bundle 1개 등록/백업/원격 readback → 제어 A 출력 모듈 정규 설치 → 기존 `employment-r6-candidate-stage-readonly` **1회 고유 요청**으로 History latest/prior/ambiguous/asOf 10개 JSON/TXT 2/2 회수, 그때만 PIT-04-02 DONE. 이번 턴 사용자 신규 B 명시 승인 없음, PR merge/B Issue/운영 write 0. 상세 [진행 기록 §25](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### 2026-11-17 PIT-04-02 공용 B #1821 설치 후 승인 기준 갱신 (계획·판정)

- **변경된 마지막 실PC Controller 설치 증거:** 제어 [#1821](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1821)의 공식 JSON/TXT 결과 `SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, `actualControllerSha=a21b928f0c058ff6e7daf8a33dcfb613c9adc4df`, `protectedStateUnchanged=true`, `workflowEnabled=true`. #1819 당시의 `e3a495...`는 역사적 Host CAS 관측이며 **향후 B 설치 기준으로 재사용하면 안 됨**. 이는 #1821 작업의 설치 결과이며 R6 신규 source/출력 적용을 뜻하지 않는다.
- **승인 검토 Draft 수정 완료:** [제어 PR #1822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1822)에서 오래된 `93bae0ec...json` 승인 제안 파일을 **Draft 브랜치에서만 제거**하고 새 `approvals/source-bundles/76e4383d5ce6e6127b59a7831e26dcb95cb84edbbcaf5083f98a367a13c020dc.json`(이 파일 원문 SHA-256을 파일명으로 사용)으로 대체. 승인 proposal의 `installedControllerSha=a21b928f...`로 재고정, 기존 16파일 source V1 manifest digest `e01874...`, 16개 해시·기존 승인 R6 `afdd8...` 및 신규 source `2b525...` 불변. 이 소스-only 변경은 사용자 승인·PR merge·PC 설치가 아니다.
- **순서/통과 조건 불변:** 공유 #68 단일 설치 owner가 (1) 정확 B 범위에 대한 유효 명시 승인, (2) 승인 효과의 PR/main 정본, (3) **실제 설치 직전** Controller SHA/Host CAS/lease·기존 #1821 설치와 다른 B의 충돌 유무를 확인한 뒤 기존 `pc-source-bundle-register` 정규 B에서 새 키 하나만 등록·원본 보존·backup/hash readback. 이어 기존 A 출력 [Draft #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804)의 별도 정규 공통 Controller 승인·적용 확인 후 기존 A `employment-r6-candidate-stage-readonly` 고유 1회로 History 10개 비민감 개정 통계와 asOf·JSON/TXT 2/2를 확인한다. approval preimage가 다시 바뀌면 미사용 proposal을 다시 갱신한다. 승인 없는 B 요청 금지.
- **정확 단계 상태:** `PIT-04-02 = SOURCE_B_DRAFT_REPINNED / B_APPROVAL_AND_RUNTIME_PENDING`, `24/72 DONE(33.3%)`, 잔여 48. 실제 History 미관측 10개를 0 또는 READY로 산정하지 않음. 진행 원장 [§26](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 최종 commit/evidence/미승인 결과를 대응 기록한다.
