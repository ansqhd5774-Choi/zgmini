# PC Core 5분 작업 충돌 대응 · 안전 적용 Runbook (2026-10-31)

> **적용 대상:** ZGMINI Windows PC의 `ZGMINI-PC-Local-Core` 5분 주기 작업과, 수동·보조 수집/계산/공개 점수 게시를 함께 진행하는 작업.  
> **목적:** Core의 정규 실행을 방해하지 않고, 소스·예약 작업·잠금·게시 결과를 분리 검증하여 불필요한 STOP/반복 점검/위험한 재설치를 방지한다.  
> **증거 범위:** 2026-10-31 R3~R7 사용자 PC 결과와 GitHub PR #907/#893/#702/#498. 개발 문서 또는 모의 테스트는 실제 PC 성공의 대체 증거가 아니다.

## 1. 원칙: Core 잠금과 작업별 잠금을 혼동하지 않는다

- 정규 Core 기본 주기는 **5분**이다. 실제 등록값, 활성 여부, 실행기, PID/잠금, 최근 실행은 각각 따로 확인한다. 5분은 **작업 시작 주기**이며 완료 소요시간이나 공급자 API 호출 주기가 아니다.
- `E:\ZGmini\data\pc-writer\local-cycle.lock`는 정규 Core의 동시 실행을 막는 잠금이다. **삭제·이름 변경·강제 해제·프로세스 종료·재실행으로 우회하지 않는다.** PID 존재만으로 진행 정상 판정 금지. `local-cycle-last-run.json`, `local-collection-last-run.json`, `local-writer-last-run.json`, `local-publication-ledger.json`, checkpoint/저장 시각 전진을 함께 확인한다.
- **일회성 독립 출력**은 다른 D1 key와 쓰기 범위, 독립 잠금을 사용할 수 있다. [R59.2 / PR #907](https://github.com/ansqhd5774-Choi/zgmini/pull/907)은 `annual-fhs-r3.manual.lock`으로 해결했으며 Core 잠금은 변경하지 않았다. 단, 독립 잠금은 **공유 PC SQLite·같은 D1 row/ledger의 동시 쓰기 안전을 자동 보장하지 않는다.** 쓰기 충돌·lease·저장 시각을 별도로 검증한다.
- **정기 자동 보조 출력**은 별도 5분 작업을 추가하는 대신 기존 승인 Writer의 후속 lane에 연결하는 방식을 우선 검토한다. [자산 R10 / PR #893](https://github.com/ansqhd5774-Choi/zgmini/pull/893)은 기존 `run-local.mjs --publish`에 점수 검증→보조 출력 게시→D1 readback을 추가했다. 기능 실패는 해당 lane에 한정하며 이전 유효 결과를 보존한다.
- 드라이브/경로 이전, 개발 `main` 진전, GitHub 병합만으로 PC 승인 소스나 예약 작업을 전환하지 않는다. 기존 `config.json` 승인 source와 **실제 실행 source**를 비교한다. [PR #498](https://github.com/ansqhd5774-Choi/zgmini/pull/498)은 개발 `origin/main` 차이 때문에 정상 승인 Writer를 막던 허위 차단을 바로잡았다.
- 작업 예약은 `ZGMINI-PC-Local-Core` 및 `ZGMINI-PC-Local-Korea`를 보존한다. 복구용 `ZGMINI-PC-Writer`를 임의 활성화하지 않는다. Cloudflare Cron=0, COLLECTION/COMPUTE TARGET=pc, 기존 산식·TTL·D1 구조·공급자 호출 정책을 유지한다.

## 2. 실제 PC에서 확인할 것 (읽기 전용 Gate)

1. **운영 source/설정**: 현재 `config.json`의 승인 SHA, 실제 체크아웃 경로/`git rev-parse HEAD`/`git status --porcelain`, 등록 작업의 실제 CMD/VBS/Node launcher를 확인한다. 개발 main과 다르다는 사실은 곧 오류가 아니다. 작업 파일·작업 등록·launcher 인용 경로를 하나씩 따라가고 경로를 추측하지 않는다.
2. **Windows 예약 작업**: GUI/COM 조회 실패 시 `schtasks /Query /TN "ZGMINI-PC-Local-Core" /FO CSV /V` 및 `schtasks /Query /TN "ZGMINI-PC-Local-Core" /XML`을 **읽기 전용**으로 사용한다. 출력 필드의 현지화, 빈 `Enabled` 값, XML 설정/트리거 활성, 등록 실행 명령을 분리한다. 필요한 경우 작업 스케줄러의 실제 활성 상태와 다음 실행을 조회한다. XML의 빈/누락 필드를 자동으로 `disabled`로 판단하지 않는다.
3. **잠금과 실행 중인 작업**: 잠금 PID, 생성/수정 시각, PID 존재·실제 실행 커맨드, 수집·게시 checkpoint 변화, Task last result를 함께 비교한다. 5분을 넘는 실행이더라도 checkpoint/저장 시각이 전진하면 `RUNNING`이고, 단지 관찰이 끝나면 `STATE_UNKNOWN`이다.
4. **기존 결과**: 최신 `COMPLETE` 수집 및 `VERIFIED` 게시의 실제 시각과 **같은 실행의 source SHA**를 확인한다. 등록/활성/최근 성공은 서로 다른 증거다. 성공 1회로 향후 자동 누적이 계속된다고 결론내리지 않는다.
5. **보안/경로**: 키·OAuth·전체 환경변수·원자료를 기록/전송하지 않는다. `E:\ZGmini\projects\`와 `E:\ZGmini\data\`는 서로 다른 역할이다. C: junction을 임의 변경하지 않는다. E:가 안 보이면 C:에 새 DB/저장소를 만들지 않는다.

### 최소 조회 예시 (CMD, 수정 없음)

```cmd
schtasks /Query /TN "ZGMINI-PC-Local-Core" /FO CSV /V
schtasks /Query /TN "ZGMINI-PC-Local-Core" /XML
git -C "E:\ZGmini\projects\zgmini-earnings-history-pc-release" rev-parse HEAD
git -C "E:\ZGmini\projects\zgmini-earnings-history-pc-release" status --porcelain
```

- 위 경로는 **2026-10-31 R3에서 확인된 배치 기록**이다. 다음 실행에서는 등록 작업·`config`를 먼저 확인하고 현재 경로를 다시 판정한다.
- 전체 Task XML이나 config의 비밀 필드는 채팅/Evidence에 무조건 붙이지 않는다. 필요한 상태/실행 경로/설정 일치 여부만 요약한다.

## 3. 문제별 판단과 최소 대응

| 현상/오류 | 의미 · 증거 Gate | 대응(기존 작업 변경 없이 시작) |
| --- | --- | --- |
| `SKIPPED_ACTIVE_CYCLE`, `LOCAL_CYCLE_RUNNING` | Core 잠금/실행 중과 충돌 가능 | 잠금 PID뿐 아니라 checkpoint 전진·최근 완료를 확인. 정규 Core 잠금 삭제/중지 금지. 독립 출력이면 **쓰기 범위 분리** 후 독립 잠금, 후속 자동 출력이면 기존 Writer에 연결 검토. |
| 잠금 파일 존재 + PID 있음 | 작업 중인지 프로세스만 남았는지 불명확 | 파일 수정시각, 실제 커맨드·진행 기록·DB 변경으로 분리; 지속 진전 없으면 `STATE_UNKNOWN`, 임의 삭제/강제 종료 금지. |
| `SOURCE_OR_CONFIG_DRIFT` | `config.source`/실행 SHA/dirty 검사 결과를 분리해야 함 | 실제 `git status --porcelain` 및 승인 source를 읽고 검사기가 잘못된 필드를 조회했는지 확인. 로그가 clean/일치인데 STOP이면 **검사기 버그 가능성**을 분리. 자동 `git pull` 금지. |
| `TASK_COM_QUERY_FAILED` | COM 조회 실패 ≠ 작업 중단/비활성 | CSV verbose 및 XML의 읽기 전용 대체 조회로 검증. 해당 PC의 현지화 필드/활성 상태/실행기 경로 확인 후만 전환 허용. |
| 등록된 실행기와 예상 경로 다름 | VBS/실적 디스패처 등 여러 단계 launcher 존재 | Task Action → launcher → 실제 스크립트 순으로 따라감. [테마 R6 / PR #702](https://github.com/ansqhd5774-Choi/zgmini/pull/702)처럼 경로 추측 대신 등록 XML 활용. |
| `SUBMITTING`, `D1_OUTCOME_UNKNOWN`, 게시 결과 불분명 | 쓰기 성공 여부 미확정 | 저장 D1/ledger/lease **먼저 재조회**. 동일 쓰기 무조건 반복 금지. [PR #759](https://github.com/ansqhd5774-Choi/zgmini/pull/759)의 읽기 복구 방식 참고. |
| 신규 archive 0일·0건 | 코드/운영 source 미적용 또는 첫 정상 실행 전 | 현재 게시/수집은 별도로 판정. 점수 실제 입력·저장·D1 게시 경로 확인 후 **보관 기능만** 적용. 과거 관측값 임의 생성 금지. |

## 4. 앞으로의 기본 실행 절차

1. **READ_ONLY:** 승인 SHA·clean 상태, 실제 Task Action/VBS/dispatcher 연결, 예약 주기·활성 여부, `local-cycle.lock` PID/진전, 최근 Core 수집·게시 및 D1 readback을 확인한다. 지금 목표를 막는 충돌만 BLOCKER로 기록한다.
2. **방식 선택:** 독립/일회성·별도 D1 key이면 **별도 작업 전용 잠금**과 충돌 검사. 정규 반복 기능이면 **기존 승인 Core/Writer 후속 단계**로 통합. 어느 쪽이든 Core 잠금을 강제 획득/삭제하지 않고, 동일 데이터베이스·원장 동시 쓰기는 보호한다.
3. **PRE-FLIGHT:** 대상 파일만 선별, 승인 source 기반 파일/의존성 검사, 실행기 원래 내용 및 Task XML을 백업하고 복구 방법을 검증한다. 작업 진입점 추측·테스트 실패를 운영 장애로 확대·전체 branch merge·불필요한 재설치 금지.
4. **APPLY (승인 범위만):** Core와 충돌하지 않는 시점 또는 검증된 후속-hook에서 적용. 스케줄·산식·수집 횟수·기존 소스/키/DB 스키마를 임의 변경하지 않는다. 수동 패키지는 한 번만 실행하며 결과 불명확 시 재실행을 막는다.
5. **VERIFY:** PC SQLite에 실제 관측 시각·점수 및 저장 시각 재조회 → 승인된 공개 점수만 D1 게시 → D1 동일 내용과 `stored_at` 재조회 → 공개 API/UI(해당 시) 순으로 검사한다. 이때 신규 보관 입력과 기존 공개 current의 날짜·상태를 혼동하지 않는다.
6. **NATURAL RUN:** *다음 정규 Core 실행*에서 archive 관측 건수/날짜·sourceStoredAt·D1 게시 시각이 전진하는지 확인한다. 공급자 관측값이 변하지 않거나 주기상 새 입력이 없으면 `UNCHANGED`와 실행 실패를 구분한다. 최초 게시 PASS만으로 '장기 자동 누적 PASS'라고 보고하지 않는다.
7. **REPORT:** `LAST PASS / FIRST FAIL / exact error / 영향 / 최소 수정 / 재검증`, `GITHUB main`·`PC 승인 source`·`PC 실행 source`·`D1/API`를 각각 기재한다. 코드·테스트·배포 성공과 실제 PC 운영 성공을 혼동하지 않는다.

## 5. 2026-10-31 실제 적용 이력 (고정된 역사 증거)

| 단계 | 실제 관측 결과 | 해석 |
| --- | --- | --- |
| R3 점검 | PC checkout `E:\ZGmini\projects\zgmini-earnings-history-pc-release`, 승인 `43e0ffa392a9e655bcb4ca7b151c26ad43567e14`, clean, Core Task launcher→실적 dispatcher, 두 archive 모두 0일 | 운영 source와 실행 경로/후속 수집 구분 |
| R4 | `STOP: SKIPPED_ACTIVE_CYCLE`, source/config/task/DB 변경 0 | 정규 Core 잠금 때문에 안전 중단 |
| R5 | lock PID 존재, 수집 `COMPLETE`·게시 `VERIFIED`; `SOURCE_OR_CONFIG_DRIFT` | 승인 SHA/설정/clean은 일치했으나 진단기의 잘못된 `clean` 필드 검사로 오판(후속 코드 검토). PID만으로 작업 진행은 확정할 수 없음 |
| R6 | `STOP: TASK_COM_QUERY_FAILED`; 소스/DB/작업/원격 쓰기 없음 | COM 상태 조회 경로 실패. PC 수집 장애 확정 아님 |
| **R7** | **`ACTIVATED_VERIFIED`**; Core 기존 주기 `PT5M`·활성 상태 조회 성공; archive **CNN 0→1일**, **Composite 0→1일** 로컬 저장; D1 `PUBLIC_SCORE_DAY_READBACK_VERIFIED`; 기존 승인 SHA 유지 | **최초 실제 저장·D1 재조회·Core 보조 실행기 연결 성공**. 작업 XML 백업. *다음 정규 실행의 추가 관측/연속 자동 누적은 이 보고서만으로 확인되지 않음* |

- R7 PC 결과 기준 시각: `2026-10-31T10:45:36.298Z` (KST 19:45:36). 실행기 연결과 기록이 성공한 **그 시점의** 사용자 수동 검증 결과다. 배포/실행의 영구 정상 보증이 아니다.
- R7은 기존 Core Task의 launcher를 **보조 wrapper로 연결**한 사례다. 이후 점검에서 이 변경을 '예약 작업 미변경'으로 보고하지 않는다. 임의 복구/재등록으로 R7 연결을 지우지 않으며, 원본 Task XML 백업과 실제 현재 Action을 대조한다.
- 원자료·키·실제 PC `config.json`·작업 XML/DB 복제본은 이 Git 문서에 첨부하지 않는다.

## 6. 재발 방지 기준 (다른 담당자도 따라야 함)

- **최초 진단부터** 독립 출력인지 정규 Writer 후속 출력인지 구분한다. 단지 Core 5분 잠금이 있다는 이유로 5분 간격의 빈 시간을 무한 대기하거나 Core 작업을 중지하지 않는다.
- R7의 시험·설치 방식을 모든 PC에 무조건 재적용하지 않는다. 이미 적용된 경우 **읽기 전용 확인 + 정규 실행 결과 검증**만 진행한다.
- Core/Korea/Iran 작업은 각기 다른 상태로 판단한다. 등록 XML의 빈 활성 필드를 `disabled`로 강제 해석하지 않는다.
- 신규 배포/개발 변경을 'PC에 적용 완료'로 기록하지 않는다. PC 승인 소스 `config.source`·실제 Task Action·실행 기록·D1 readback이 운영 근거다.
- **운영 설정·잠금·예약 작업·산식·TTL·DB 구조·배포 방식** 변경은 별도 명시 승인 및 영향 검토가 필요하다. 안전 장치는 실패하면 '변경 없음'을 보장하고, 부분 반영 가능성은 저장 상태를 먼저 재조회해야 한다.

## 관련 근거

- [PR #907 — R59.2 별도 수동 잠금](https://github.com/ansqhd5774-Choi/zgmini/pull/907)
- [PR #893 — R10 기존 PC Writer 보조 게시 lane](https://github.com/ansqhd5774-Choi/zgmini/pull/893)
- [PR #702 — Task XML 실제 실행기 경로 추적](https://github.com/ansqhd5774-Choi/zgmini/pull/702)
- [PR #498 — 운영 승인 source와 개발 main의 분리](https://github.com/ansqhd5774-Choi/zgmini/pull/498)
- [PR #759 — D1 불명확한 쓰기 상태 재조회](https://github.com/ansqhd5774-Choi/zgmini/pull/759)
- [PC 수집·저장·계산 운영 계약](PC_WRITER_R2.md) · [E: 경로 운영 계약](PC_STORAGE_E_DRIVE.md)
