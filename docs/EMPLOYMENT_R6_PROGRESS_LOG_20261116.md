# ZGMINI W04 고용지표 R6 — 실행 진행 기록

- 기록 기준: **2026-11-16 KST**
- 저장소: `ansqhd5774-Choi/zgmini`
- 고용 전담 브랜치: `codex/employment-1y-reader-r1` (문서/이력 관리)
- 신규 실행계획: [EMPLOYMENT_R6_CURRENT_EXECUTION_PLAN_20261116.md](EMPLOYMENT_R6_CURRENT_EXECUTION_PLAN_20261116.md)
- 기존 상세 원안: [EMPLOYMENT_R6_DELIVERY_PLAN.md](EMPLOYMENT_R6_DELIVERY_PLAN.md)
- 운영 PC 제어 저장소: `ansqhd5774-Choi/zgmini-pc-control`
- 실행 기준: 앱의 **최신 `main`**, PC의 **실제 설치·승인 SHA**, 제어 `main`은 서로 다른 대상. 이 브랜치의 과거 source HEAD를 PC 운영 최신 SHA로 보고하지 않는다.

## 1. 단계별 원장 (실행 시간·출처 범위 구분)

| 시기·작업 | GitHub / 원장 | 실증 범위 | 최종 판정 |
|---|---|---|---|
| 2026-11-16 자동/수동 분리 | 앱 [PR #1176](https://github.com/ansqhd5774-Choi/zgmini/pull/1176), 제어 [PR #1721](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1721) | `ONE_YEAR` 자동 중복 정책 보존, 인증된 manual B에서만 당일 재수집 허용 | SOURCE/CI/MERGE DONE |
| 수동 1파일 PC 적용 | [#1729](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1729), [Run 43871926762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43871926762) | `WRITER_B_INSTALLED_VERIFIED`, 실제 로컬 SHA `5b43c3cc9da75143481f310bb45a76f919d5b040` (그 당시) | INSTALLED |
| 수동 #1736 잠금 충돌 | [#1736](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1736), [Run 43873275564](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43873275564) | `R6_B_CORE_LOCK_OCCUPIED`, 공급자 호출 전 `PREFLIGHT` 중단; 동일 requestId 재실행 0 | BLOCKED 당시 |
| DOL 부분 수집 | [#1740](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1740), [Run 43874476126](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43874476126) | ETA539 지역 5,712행, National 0, `DOL_NATIONAL_SOURCE_UNAVAILABLE`, 공식 호출 2 | PARTIAL 당시 |
| 전국 National 장애 최소 재시도 | 앱 [PR #1178](https://github.com/ansqhd5774-Choi/zgmini/pull/1178), PC [#1751](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1751), [Run 43878147827](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43878147827) | National 비정상 XML·일시적 5xx인 인증 manual 요청에서만 기존 DOL 호출 2회 범위 사용, 2파일 설치 `WRITER_B_INSTALLED_VERIFIED` | INSTALLED; PC 로컬 SHA `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388` |
| 최종 수동 수집 | [#1755](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1755), [Run 43879444100](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43879444100) | `R6_DOL_MANUAL_COLLECTED`, DOL 2회·BLS 0회, National 4/4·376행, ETA539 5,712행, SQLite `COLLECTOR_RECORDED`; JSON/TXT 2/2 | **SUCCESS / 원자료 수집 완료** |
| Core 게시 연결 | [#1758](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1758), [공개 API](https://zgmini.kr/api/employment-r6/observations) | 승인 Writer 원장 `VERIFIED`, 공개 `sourceStoredAt=1794837315655` (2026-11-16 22:55:15.655 KST); `asOfDate=2026-11-16` | **게시·API 연결 확인** |
| 최종 공개 지표 확인 | [공개 API](https://zgmini.kr/api/employment-r6/observations) | 원값 29/29, score 28/29, 최근 유효 score 22/29, chart READY 22/29, PARTIAL 5/29, UNAVAILABLE 2/29 | **PARTIAL / 1개 PIT 이력 문제** |
| Current/HISTORY 오프라인 안전 코드 | 앱 [PR #1186](https://github.com/ansqhd5774-Choi/zgmini/pull/1186), Node CI [Run 43886125560](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43886125560) | 누락/개정 충돌/원본 메타데이터/미래 시각 검증; 51개 지역 600주 회귀; 소스 `main` 병합 `f3ddab1f8506ff4ee49189a88c8e2391a040c626` | **SOURCE/CI/MERGE DONE**; PC History 변경 아님 |

## 2. 실제 남은 지표: STATE_CLAIMS_BREADTH

최신 공개 API 점검 기준:
- `observationDate = 2025-07-19`; 직전 `2025-07-12`; 공개값 `54.90196078431372%`.
- `scoreStatus = PARTIAL_HISTORY`; `score = null`; `rawStatus = STALE`; `chartStatus = UNAVAILABLE`; 차트 포인트 `0`.
- `firstSourceObservation = 2016-05-21`, `firstMissingReferenceDate = 2015-07-25`.
- 현재 UTC `sourceStoredAt=2026-11-16T13:55:15.655Z`가 이 지표의 원자료 관측일 최신성을 뜻하지는 않는다.
- National 전국 4계열은 별개이며 4/4 저장과 공개 수치·점수·차트를 확인했다.

**해석:** `STATE_INITIAL_CLAIMS` 51지역의 `Current` 완전한 주차와, 그 자료가 각 `asOf` 시점에 알려졌다고 입증된 `History/PIT` 주차는 다를 수 있다. 10년 52주 선행 참조를 요구하는 산식을 바꾸거나 불충분한 원자료로 과거 시점을 보정하지 않는다.

## 3. PIT 이력 근거·최근 장애 원장

| 실행 | 결과 / LAST PASS / FIRST FAIL | 판단 |
|---|---|---|
| 2026-11-07 실PC 후보 감사 [#782](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/782), [결과](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/42416928270-1-seat-5.json) | `PASS`; Current 7,695 / History revisions 5,680; Current keys missing History **2,880**, 후보 일치 2,625, 후보 겹침 개정 충돌 **2** | **과거 시점의 스냅샷**. 후보 전체 승격 금지. 오늘 결손 건수로 재사용 금지 |
| 2026-11-16 초기 진단 [#1764](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1764), [Run 43884550303](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43884550303) | `BLOCKED / R6_BUNDLE_NOT_APPROVED`; 마지막 `ALLOWLISTED_WORKER_STARTED`, 최초 `ALLOWLISTED_OPERATION`; 잘못 지정한 일반 `main` SHA | 진단 번들은 별도 승인 고정 SHA가 필요. SQLite 열림 0, 공급자/D1/운영 쓰기 0 |
| 2026-11-16 번들 교정 진단 [#1765](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1765), [Run 43884709247](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43884709247) | `BLOCKED / RESOURCE_WAIT_MEMORY`; 승인 bundle `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`; `sqliteOpened=false`, 공급자/D1/운영 쓰기 0 | 자원 안전 거부이며 실제 DB/계산 실패가 아님. 같은 ID 재실행 금지 |
| 2026-11-16 소스 회귀 [PR #1186](https://github.com/ansqhd5774-Choi/zgmini/pull/1186) | latest revision mismatch guard 추가 후 [CI](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43886125560) SUCCESS; `main` merge `f3ddab1...` | 소스 읽기 전용 검증 성공. 운영 History 미수정 |

## 4. 현재 진행률과 상태

| 축 | 2026-11-16 기준 | 판정 |
|---|---|---|
| 승인 원자료 수집·로컬 저장·계산·게시·API/UI 연결 | **5/5** 완료 | DONE (경로 단위) |
| 원자료 표시 | **29/29** | DONE |
| 계산 점수 | **28/29 = 96.6%** | PARTIAL |
| 최근 유효 계산 점수 | **22/29** | PARTIAL / 발표일·기간 별도 |
| 1년 차트 READY | **22/29** | PARTIAL |
| 남은 PIT 복구 10작업 | **2/10 = 20%** | PIT-03 메모리 조건 BLOCKED |

**실제 문제:** `STATE_CLAIMS_BREADTH` 의 10년 참조용 역사적 PIT 가용성이 최신 Current 원자료와 불일치. 최근 승인 A단회 조회가 PC 메모리 조건에서 거부되어 **현재 결손 행 개수는 미확정**.

## 5. 다음 필수 실행 / 범위 / STOP

1. **우선 실행 한 가지:** 새 requestId로 기존 등록 A급 `employment-r6-candidate-stage-readonly`를 승인된 immutable bundle SHA `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`에 고정해 메모리 조건 충족 시 최신 `Current/History` 누락·주차/수정 이력만 조회. 성공 원장 JSON/TXT 2/2 직접 회수.
2. 검증 가능한 51개 지역·공식 원본 hash/시간과 충돌·불명 메타를 구분한다. 후보 개정 충돌(과거 2건)을 자동 승격하지 않는다.
3. 실제 복구할 정당한 행이 있으면 **별도의 기존 공식 B 승인/전·후 해시/원본 보호/검증**에 한해 History 최소 수정, 저장 자료 재계산·기존 Writer D1 readback·공개 API/UI 재확인. `TRUE_PIT` 증거 없는 과거 데이터를 `TRUE_PIT`로 소급 태깅하지 않는다.
4. 자원 거부나 출처 불명·승인 부재는 해당 실행에만 `BLOCKED/STATE_UNKNOWN`; 기존 28개 정상이거나 다른 기능 개발의 중단 조건으로 확대하지 않는다. 기존 PC lock 삭제·우회 실행·무한 재요청·정규 수집·예약 확인을 계획에 넣지 않는다.

## 6. 기록 규칙

- 증거는 실제 Windows Runner/SQLite/공개 API → 승인된 결과 → 소스/CI 순으로 구분한다.
- `DONE/READY/RUNNING/STATE_UNKNOWN/BLOCKED/DEFERRED`를 정확하게 사용하며 결과 파일과 실제 실행 SHA를 혼동하지 않는다.
- 진행 로그의 다음 항목은 새로운 실제 유효 증거가 생긴 경우에만 추가하고, 이 문서만 수정해 운영 실행·게시가 완료됐다고 주장하지 않는다.


## 7. 세부 작업계획 재산정 — 2026-11-16

- 기존 `PIT-01`~`PIT-10`은 **10개 상위 범주**였으며, 이를 전체 세부 작업 10개로 보고한 것은 잘못된 계수다. 기존 상위 범주와 이미 완료된 작업의 범위를 보존하면서 [최신 작업계획서](EMPLOYMENT_R6_CURRENT_EXECUTION_PLAN_20261116.md#7-72개-세부-실행-항목--실제-작업-단위별-확장-2026-11-16)에 실행 입력·구체 행동·검증·산출물을 갖춘 **72개 세부 ID**를 기록했다.
- 범주별 세부 수: `PIT-01:7`, `PIT-02:7`, `PIT-03:8`, `PIT-04:8`, `PIT-05:8`, `PIT-06:8`, `PIT-07:8`, `PIT-08:6`, `PIT-09:6`, `PIT-10:6`. **합계 72개**.
- `PIT-01`과 `PIT-02`의 14개 하위 항목은 기존 수집·공개 원장과 소스·CI 완료 증거를 세부 증거에 연결한 것일 뿐 새 PC 작업을 수행했다는 의미가 아니다.
- **세부 계획 완료 14/72개(19.4%), 미완료 58/72개(80.6%)**. 운영 전달 경로 5/5 완료와 완전히 다른 분모다. `STATE_CLAIMS_BREADTH`는 여전히 점수 28/29개 중 유일한 미완료 지표다.
- **실제 차단:** A급 진단 #1764 `R6_BUNDLE_NOT_APPROVED` 후 정확 번들의 #1765 `RESOURCE_WAIT_MEMORY`로 아직 최신 PC SQLite 결손 수를 못 얻음. 해당 두 requestId 자동 재사용 금지.
- **다음 필수 실행:** `PIT-03-03` 메모리 안전조건 확인 → 충족 시 `PIT-03-04` 기존 승인된 읽기 전용 A 한 번으로 현재 Current/History 분포 회수. 성공 뒤에만 복구 가능 키·효과·승인 범위를 확정한다. 기존 DB·PIT 시각·공식 산식·D1은 현 단계에서 변경하지 않는다.
- **이번 추가 변경의 효과:** GitHub 계획서·진행 원장 문서 2파일만 변경. 새 PC 수집·계산·게시·DB 쓰기 0, 공개 지표 점수 상태 불변.


## 8. 마지막 작업 결과 기록 누락 정정 — 2026-11-16

**기록 누락 사실:** 72개 세부 작업계획과 진행 기록을 GitHub에 작성한 후, 후속 대화에서 이 두 파일의 `fetch_file` 재조회를 통해 숫자와 내용을 검증했다. 그러나 **그 마지막 검증 작업 자체의 결과를 당시 진행 원장에 새 항목으로 남기지 않은 채 `VERIFIED` 및 '완료'로 보고했다.** 따라서 당시 보고는 '기존 파일 내용 반영 확인' 범위에서는 맞지만 **'최근 작업 결과까지 진행 원장에 반영 완료'라는 의미에서는 잘못된 완료 판정**이었다. 이를 정정한다.

| 기록 항목 | 실제 확인된 사실 | 상태 |
|---|---|---|
| 마지막 작업 유형 | 전담 브랜치의 작업계획서·진행 기록 두 파일 실제 재조회 | DONE (검증 수행) |
| 검증 당시 브랜치 HEAD | `c4463e713a1f7acbb9878adbd2acc0a8e1af2c7f` | VERIFIED (당시 스냅샷) |
| 작업계획서 blob SHA | `7ec029537dea57231b1b88eecf08fe2085e3143d` | READBACK PASS |
| 진행 기록 blob SHA | `a4041950b2899b2a258867c221a1927192a296f2` | READBACK PASS |
| 72개 고유 세부 ID | 실제 계획 파일에서 72개 확인 | VERIFIED |
| 완료·잔여 수치 | 14개 DONE / 58개 TODO, 19.4% | VERIFIED (기능 진척 변화 없음) |
| 직전 보고의 누락 | 위 파일 재조회의 **결과·결론을 진행 기록에 추가하지 않음** | CORRECTED — 이 항목으로 보완 |
| 운영 실제 변경 | PC 수집·SQLite·D1·API 수정 0 | UNCHANGED |

### W04 작업 종료 후 기록 절차 — 모든 후속 수행에 적용

1. **실제 작업 먼저:** 승인된 원담당 업무의 다음 실행을 실시한다. 완료한 증거를 재실행해 진행률을 올리지 않는다.
2. **작업 원장 즉시 갱신:** 해당 작업 ID, 수행 행위, GitHub PR/commit 또는 PC Issue/Run/attempt, 실행 source SHA, LAST PASS/FIRST FAIL, 상태 `DONE/BLOCKED/STATE_UNKNOWN`, 새로 발견한 문제, 다음 실행을 **이 진행 기록**에 기록한다. 단순 조회·중단·실패도 그 결과를 사실대로 남긴다.
3. **원격 반영 검증:** GitHub 해당 브랜치의 파일·blob·HEAD를 실제 재조회해 **방금 추가한 작업 항목이 존재하는 것**까지 확인한다. 이전 항목이 저장돼 있었다는 사실만으로 새 기록의 반영 성공이라고 보고하지 않는다.
4. **그 뒤 완료 보고:** 사용자에게 기능 완료/기록 반영 상태를 분리해 보고한다. 원장 쓰기·재조회가 차단되면 `작업 결과 확보 / 진행 기록 미반영`으로 표시하며 기록 포함 100% 완료라고 보고하지 않는다.
5. **진행률 근거 보호:** 기록·검증 자체는 72개 PIT 구현 단계의 실제 완료 개수를 늘리지 않는다. 14/72개 유지, 58개 잔여. 29개 중 마지막 `STATE_CLAIMS_BREADTH` 점수 복구는 여전히 미완료다.

**현재 다음 필수 실행:** `PIT-03-03`의 정상 PC 메모리 조건을 확인한 다음, 기존 승인된 A급 분석 번들로 `PIT-03-04` 현재 Current/History 분포를 단회 확보한다. 기존 #1764/#1765 requestId 재사용 및 메모리 안전 거부 우회는 금지한다.


## 9. 기존 main 규칙·전담 지정 진행 기록 재대조 — 2026-11-16

- **요청:** 고용 전담 브랜치의 매 작업 후 지정 기록 의무와 GitHub `main` 공통 기준 존재 여부 확인.
- **공통 정본 재조회:** [제어 main / AGENTS.md](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/AGENTS.md)는 21행에서 완료 단계의 증거·다음 필수 실행 기록을 요구한다. [제어 main / PC_AUTOMATION_STANDARD.md](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/docs/PC_AUTOMATION_STANDARD.md)의 '단계 종료와 다음 실행'은 `DONE/READY/RUNNING/STATE_UNKNOWN/BLOCKED/DEFERRED`, 근거 링크·적용 범위·다음 실행 기록을 규정하며 '완료·보고·문서 유지'에서 이번 실행/검증/미해결/다음 행동을 구분하도록 한다. [앱 main / AGENTS.md](https://github.com/ansqhd5774-Choi/zgmini/blob/main/AGENTS.md)의 '1.1 작업 결과 보고'는 모든 개발·조사·점검·수정의 정확한 작업 브랜치·실제 커밋/검증/문제 보고를 상시 의무화한다.
- **전담 기록 파일:** [`docs/EMPLOYMENT_R6_PROGRESS_LOG_20261116.md`](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) 자체가 72개 세부 단계 진행·최종 상태 및 원장 반영을 지정한 W04 실제 경로이다. 전담 브랜치에 경로가 이미 정해져 있으므로 임의의 새 로그 파일이나 중복 지침을 만들지 않는다.
- **표현상 구분:** 공통 main에서 확인한 것은 **단계별 증거·결과 기록 및 문서 유지 의무**이고, 특정 고용 전용 파일명은 **전담 브랜치가 지정**한 것이다. 공통 main에 W04 파일명까지 문자 그대로 지정돼 있다고 주장하지 않는다.
- **실제 결함 및 책임:** 이전 보조 작업자는 기존 기준을 적용하지 않고 진행 기록 존재 확인만 수행한 다음 `VERIFIED`라고 보고하였다. 이는 새 규칙 부재가 아니라 **기존 기록 절차의 누락 및 완료 판정 오류**이다.
- **이번 검증 범위:** 원격 문서 확인과 해당 원장 기록. PC 수집·SQLite·D1·API·UI 변경 및 신규 공급자 호출 0건. 기능 진행률 **14/72** 유지, 마지막 `STATE_CLAIMS_BREADTH` 미완료 유지.
- **다음 필수 실행:** 기존 승인된 PIT A 분석 경로의 메모리 안전 조건 충족 확인 후 단회 최신 Current/History 결손을 조회한다(`PIT-03-03 → PIT-03-04`). 과거 요청 `#1764/#1765` 재사용 금지.
