# R45 PC 옵저버 단일파일 보호 해제 — 설치 전 인수인계

작업 저장소: `ansqhd5774-Choi/zgmini`  
작업 브랜치: `codex/zgmini-gpt-workspace-20261025`  
상태: **GitHub 개발·합성 테스트만. 실제 Windows PC 적용/중단 미실행.**

## 왜 필요한가

- 사용자는 FHS-R3 재무건전성 평가를 **연 1회 수동 수집·검증·게시**하기로 결정했다. 시장 중요도 R43 연구를 위해 R45 스냅샷을 정규 Core에 자동 보관하도록 확대한 작업은 더 이상 필수 운영 범위가 아니다.
- `bd787c3` 작업 브랜치에서는 이미 `collect-local.mjs`의 R45 옵저버 주입을 제거했다. 그러나 사용자 PC에는 **R53 + R56 FIX1**의 별도 로컬 Git 설치본이 남아 있을 수 있으며, GitHub 수정은 이를 자동 정지시키지 않는다.
- 사용자 PC R56 FIX1 성공 증거: `previousSource=1afc5c7bb28c9d87acf03d85fe20ae3c45013fd3`, `newSource=154c5ac25120ecf8292b630ca9b1e30edad1ed75`, `worktreeId=d0a4b3cb8b95`, 변경 파일은 MarketParquet provider 1개. 원래 R53 설치 당시 `collect-local.mjs` R45 옵저버가 별도로 설치되어 있었다.

## 구현

`scripts/pc-writer/market-calendar-r45-pc-detach.mjs`는 **대상 PC 소스 파일 한 개** (`scripts/pc-writer/collect-local.mjs`)만 선택적으로 변경하는 옵트인 도구다.

1. 기본 실행은 **읽기 전용 preflight**. 정확한 R51 Core Task 실행기 체인, 작업 트리 식별자, 승인된 `config.source`와 실제 HEAD, 보호 경로 clean, Node 24, 목표 파일 인코딩/내용을 확인한다. 잠금 생성·파일 수정·API 호출·수집·게시 없음.
2. 실제 해제는 명시적으로 `--apply`할 때만 가능하다. 사용자 R56 FIX1 이후 승인 HEAD `154c5ac...`와 구버전 `collect-local.mjs` Git blob `f940b9b...`가 **동시에 일치**하지 않으면 변경하지 않는다.
3. 확인된 이전 파일에서 정확히 세 블록만 제거한다: R45 sidecar import, `R45_MARKETPARQUET_SNAPSHOT_OBSERVER` 등록, `marketCalendarR45` 보고 필드. 결과 Git blob `40bd7edd...`와 다른 변경이 나오면 중단한다. B1/MarketParquet 제공자 로직과 기존 FHS 산식·등급은 보존한다.
4. `--apply`는 정규 Core 잠금이 **즉시 FREE**일 때만 원자적으로 잠금을 획득한다. 잠금이 BUSY/ORPHAN/UNKNOWN이면 **기다리지 않고 중단**한다. 잠금 삭제/강제 해제·Core 종료·예약 작업 조정 금지.
5. 잠금 아래 원본 파일과 config를 **개인 PC 전용 백업**, 정확한 1파일 로컬 Git 커밋, 새 `config.source` 재조회까지 통과하면 `R45_DETACH_INSTALLED_LOCAL_ONLY`다. Git push 없음. 이미 정확히 해제된 파일은 재실행 시 `R45_DETACH_ALREADY_OFF_NO_CHANGES`로 보고하고 다시 쓰지 않는다.
6. 소스·config·Task이 바뀌었거나 파일 내용이 예상과 다르면 STOP. 부분 커밋 이후 문제는 자동 reset하지 않고 `R45_DETACH_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP`으로 사람의 안전 복구를 요구한다.

## PC 적용 전/후 구분

- **휴대용 실행 패키지:** `MARKET_CALENDAR_R45_PC_DETACH_20261101.zip`은 R45 해제 도구, R51 Core 실행기 분석기와 그 의존 모듈, `MARKET_CALENDAR_R45_PC_DETACH.cmd`, 사용 안내를 포함한다. **기존 PC Git 작업 트리 밖의 새 폴더**에 압축을 푼다. 아무 인수 없이 CMD를 실행하면 읽기 전용 사전 점검이며, `R45_DETACH_PREFLIGHT_READY_NO_CHANGES`를 확인한 뒤 **같은 폴더**에서만 `MARKET_CALENDAR_R45_PC_DETACH.cmd --apply`를 실행할 수 있다. 두 실행의 결과는 패키지 폴더에 각각 한 개의 TXT로 보존하며, 덮어쓰지 않는다. 이 파일들을 PC 프로젝트 내부에 복사하거나 Core 실행기로 등록하지 않는다.
- 개발 검증: `node --test tests/market-calendar-r45-pc-detach.test.mjs`로 정확한 파일 변환, 드라이런 무변경, 변경된 HEAD 차단, Core 잠금 점유 시 무변경, 합성 적용·readback·재실행 무변경 확인.
- 실제 PC 사용자 적용: 현재 PC가 **승인 HEAD 그대로**이고 실제 Core가 실행 중이 아닐 때, 이미 등록된 실행기·설정 경로를 읽기 전용으로 먼저 대조하고 기존 Node/CMD 환경에서 위 스크립트를 호출한다. 프리플라이트 `R45_DETACH_PREFLIGHT_READY_NO_CHANGES` 없이 `--apply`를 실행하지 않는다.
- 실제 PC 적용 결과를 본 뒤만 `PC_R45_OBSERVER_DISABLED`라고 기록한다. 공급자 데이터를 강제 수집하여 확인할 필요는 없다. 기존 E: 저장본은 삭제하지 않고 보존한다.
- 백업은 실패 복구용 필수 사본으로 사용자의 E: 운영 폴더 안에 생성되며, **적용 성공 또는 실패 이후 무단 삭제하지 않는다**. 불필요한 TXT나 대량 진단 파일은 생성하지 않는다.
- `main`의 연간 FHS-R3, 공개 등급, D1, Cloudflare, API 호출, Core 5분 일정/런처, 다른 프로젝트 데이터는 변경 대상이 아니다.

## 안전 중단 기준

### 2026-11-01 FIX1 — 실제 사전 점검 안전 중단

- 사용자 PC가 제공한 `2026-11-01T13:02:10.635Z` 사전 점검에서 `R45_DETACH_CORE_LAUNCHER_CHANGED_STOP`이 확인되었다. `changedFiles=[]`, `backupCreated=false`, 추가 호출·수집·DB·작업·공개 변경 0이었다.
- 이 결과만으로 **실제 Core 실행기가 변경됐다고 확정할 수 없다**. 기존 R51 진단기의 고정된 바깥 VBS 해시·명령 형태 검사와 현재 Task 실행기를 구별할 근거가 아직 없다.
- FIX1은 승인을 완화하지 않고 기존 STOP을 유지하면서 `originStatus`, `originOuterHashMatched`, `originCoreVbsCount`, `originWorktreeId`, `configSourceMatchesApproved`만 비밀값 없이 기록한다. 이 상태가 확인되기 전까지 `--apply` 금지.
- 기존 PC 수집·임시 R43 자료 확인을 위해 별도 API 호출·정규 Core 강제 재실행·21일 대기는 필요하지 않다.

| 상황 | 결과 |
| --- | --- |
| PC HEAD가 R56 FIX1 성공 SHA와 다르거나 config.source가 다름 | STOP, 승인 소스 재확인 (새 PC 변경을 덮지 않음) |
| Core 잠금 BUSY/ORPHAN/UNKNOWN 또는 quota lock 있음 | STOP, 잠금 건드리지 않음 |
| 이전 R45 옵저버 파일 blob과 다름 | STOP, 기존 코드 보존 |
| 이미 해제된 정확한 파일 | ALREADY_OFF, 변경 없음 |
| 개발 GitHub 커밋만 존재 | `PC 적용 완료`가 **아님** |

**주의:** 본 개발 도구가 PC를 원격으로 수정하지 않는다. 승인된 E: 경로·실제 실행 명령이 현장 점검과 일치하지 않으면 패키지를 무리하게 재실행하지 않는다.

## 2026-11-01 후속 — 현행 실행기 읽기 전용 점검 우선

- 두 번의 R45 해제 preflight는 `R45_DETACH_CORE_LAUNCHER_CHANGED_STOP`으로 안전 중단됐다. FIX1에서 `R51_OUTER_WRAPPER_CHANGED`, `originCoreVbsCount=0`, `configSourceMatchesApproved=false`가 확인됐으나 **현재 PC Core 장애·사용자 임의 변경·R45 연결 유무를 증명하지 않는다**.
- `main`의 `PC_CORE_5MIN_CONFLICT_RUNBOOK.md`는 R7에서 기존 Core Task의 보조 래퍼 연결이 성공했음을 기록한다. 이전 R51의 *고정 해시를 현재 승인 실행기라고 간주해 자동 해제하는 방식은 보류*한다.
- `scripts/pc-writer/market-calendar-r45-pc-live-inventory.mjs`와 `MARKET_CALENDAR_R45_PC_LIVE_INVENTORY.cmd`를 **실제 PC 작업 트리 밖에서** 한 번 실행한다. Task XML → 등록 외부 VBS → 첫 번째 Core VBS/Node 실행기를 읽기만 하며, 외부/중첩 VBS의 SHA256, 구 R50 해시의 역사적 일치 여부, 실제 Git HEAD/`config.source`, 보호 경로 clean, `collect-local.mjs` Git blob/R45 옵저버 상태를 비밀값·경로 없이 기록한다. 생성물은 패키지 폴더의 결과 TXT 한 개다.
- `INVENTORY_TRACED_REVIEW_REQUIRED`나 `OBSERVER_ALREADY_OFF_NO_PC_CHANGE`는 **진단 완료**일 뿐 설치 승인이나 Core 정상 실행 증명이 아니다. 현재 실행 체인과 승인 운영 소스·수집 보고서의 출처를 대조하고, R45가 이미 꺼져 있으면 **변경 없이 종료**한다.
- R45가 실제로 연결돼 있고 정확한 대상 소스도 확인된 경우에만 기존 Core 5분·R7 보조 래퍼·B1/MarketParquet·연간 수동 FHS를 유지하는 1파일 해제 변경을 별도로 준비한다. 이전 FIX1 패키지의 `--apply`를 현행 해시 불일치 상태에서 재시도하지 않는다.
- 이 단계에서는 `main`/PC Task/launcher/config/DB/D1/API·공개 등급을 변경하지 않는다. Windows 실제 재점검 결과는 아직 받지 않았으며 **PC 적용 완료로 표시하지 않는다**.

### 2026-11-01 실제 PC R1 점검 결과 및 FIX2

- 사용자 PC 결과 `MARKET_CALENDAR_R45_PC_LIVE_INVENTORY_RESULT.txt` (`2026-11-01T14:04:52.842Z`)는 `taskStatus=TASK_QUERY_OK`, `pt5mInTaskXml=true`, `coreLock=FREE`, `coreVbsCount=2`, `auxiliaryRunCount=1`, `knownArchiveRunSeen=true`를 확인했다.
- 런처 SHA256 `9d5bc3429cd74813207cfc393eb04eff11a78106096964b80bf7833440385b7c`, 현재 `config.source=76373239406eef471904807840e1c77b2653b7e4`이다. 구 R50 해시와 R56 승인 SHA가 다르다는 사실만으로 장애·무단 변경으로 단정하지 않는다.
- 내부 VBS에서 `CORE_RUN_SHAPE_UNVERIFIED`여서 실제 실행기·HEAD·collector blob·R45 옵저버 연결 여부는 `null` 또는 `UNKNOWN`이며, `INVENTORY_INCOMPLETE_REVIEW_REQUIRED`로 멈췄다. Task/설정/DB 변경 0을 확인했다.
- FIX2 점검은 VBScript의 괄호 없는 `Shell.Run "literal", 0, True` 구문을 추가 지원하고, 여전히 정적으로 확인할 수 없는 실행형은 단순 **익명화 구문 특징**(`coreChainShape`)만 기록한다. 어떠한 동적 변수 명령도 실행하거나 신뢰된 root로 추정하지 않는다.
- FIX2 보고 후 PC 승인 source 및 작업 트리 일치를 확인하기 전에는 기존 R45 해제 패키지의 `--apply` 금지, Core 5분·R7 보조 wrapper 유지.

### 2026-11-01 FIX2 실제 결과 및 FIX3 회귀 수정

- 사용자 PC FIX2 결과(`2026-11-01T14:15:28.934Z`)에서는 `pt5mInTaskXml=true`, `coreLock=PID_EXISTS_NOT_PROVEN_ACTIVE`, 현재 config SHA 동일, 원격/PC 변경 0이다.
- FIX2 `CORE_RUN_SHAPE_UNVERIFIED`는 외부 VBS `depth=0`에서 발생했다. 앞선 R1이 같은 외부 VBS에서 두 `Run`을 검증하고 내부 VBS까지 추적했던 사실과 달라 **FIX2 파서 회귀**로 판단한다. 회귀 때문에 `knownArchiveRunSeen=false`가 나왔을 뿐 R7 보조 작업이 제거됐다는 증거가 아니다.
- FIX3는 기존 R50/R1의 괄호형 `Run` 정규식과 정확히 동등한 검사로 복원하고, FIX2에서 추가한 괄호 없는 `Run` 지원은 별도 엄격한 전행 일치로 유지한다. 소스/경로·Task XML·명령 원문은 보고서에 기록하지 않는다.
- FIX3에서도 동적 명령을 검증할 수 없다면 익명화된 `coreChainShape`만 기록하고 STOP. 그 결과를 PC source 승인이나 R45 변경 허가로 확대하지 않는다.

### 2026-11-01 FIX3 실제 결과 및 FIX4 정적 진단

- 사용자 PC FIX3 보고(`2026-11-01T14:23:17.738Z`)에서 외부 VBS는 **2개 `Run` 모두 검증**, R7 보조 archive 참조 확인, 내부 VBS 도달에 성공했다. 내부 VBS는 SHA256 `bb3e11c0b5c8da07162b1c824e7b52e7a7c2f987c079f29713211a2413932b01`, 20줄, `Run` 3개 모두 동적 명령, `Chr()`·문자열 결합 사용으로 파악됐다.
- 운영 `config.source=76373239406eef471904807840e1c77b2653b7e4`, Core 잠금 PID 존재(진행 정상 여부는 미입증), Task `PT5M`, PC/Task/DB 변경 0. 실제 실행기·HEAD·R45 옵저버 상태는 여전히 미확인이다.
- 메인 저장소는 해당 PC 전용 20줄 VBS 원문을 보유하지 않으므로 소스 추정 설치 금지. FIX4는 **코드를 실행하지 않는 제한된 정적 문자열 해석**(`Chr(인쇄 가능 문자)`, 문자열 리터럴·이미 정적으로 해석된 할당·`&`)으로 동적 `Run` 명령 후보를 분석한다. `Environ`, 함수 호출, 알 수 없는 변수 등이 끼면 미해석으로 남긴다.
- 추정 명령을 신뢰된 실제 실행 성공으로 승격하지 않으며, 성공 후보도 `CORE_CHAIN_STATICALLY_TRACED_REVIEW_REQUIRED` 상태로 표시한다. 분석 불가 시 변수명·인용 문자열·경로를 가린 `anonymousOutline`만 결과에 추가한다. **R45 해제 적용은 승인 운영 source 검증 후에만** 고려한다.

### 2026-11-01 FIX4 실제 결과 및 FIX5 보조 실행 순서 판별

- 사용자 PC FIX4 보고(`2026-11-01T14:31:43.077Z`)는 외부 VBS 두 `Run`을 복원하고 내부 VBS 20줄·`Run` 3개를 다시 확인했다. 내부에서 2개 명령을 상수 해석했고 1개는 환경 확장으로 미해석됐다. 현재 `launcherStatus=CORE_FIRST_RUN_UNRECOGNIZED`, HEAD 및 R45 옵저버는 여전히 `UNKNOWN`이다.
- 익명화된 코드 구조로 볼 때 **첫 번째 실행은 Node MJS 보조 작업, 두 번째 실행은 별도 VBS Core 후보, 세 번째 실행은 Node MJS 보조 작업 재호출** 순서로 해석된다. 이는 정적 구조 추론이며 실제 PC 실행 성공의 증거는 아니다. 기존 도구는 첫 `Run`만 Core라고 가정해 중단했다.
- FIX5에서는 첫 명령이 Node MJS 보조 실행이고 **두 번째 이후의 `Run` 중 단 하나에서만 리터럴 절대 `.vbs` 경로를 참조할 때**, 그 파일을 읽기 전용 후보로 따라간다. 다른 경로를 추정하지 않으며, 후보 사용 여부와 순번만 기록한다. 상태는 `CORE_CHAIN_CANDIDATE_TRACED_REVIEW_REQUIRED`로 표시하고 실제 승인·동작 검증과 구분한다.
- `config.source=76373239406eef471904807840e1c77b2653b7e4`는 GitHub 공개 저장소의 커밋 조회에서 확인되지 않았다(404). 운영 PC 로컬 커밋일 수 있으므로 메인과 다르다는 이유로 교체하지 않는다. PC HEAD와 `config.source`를 현장에서 대조하기 전에는 변경하지 않는다.
- 이 과정에서 사용자 PC Task, launcher, lock, 예약 주기, 원자료, R45 옵저버, 기존 FHS 등급은 미변경이다.

### 2026-11-01 FIX5 실제 결과 — PC R45 해제 사전 점검 준비

- 사용자 PC FIX5 결과(`2026-11-01T14:38:24.856Z`)는 3단 VBS 체인 및 `local-cycle.mjs`를 확인했다. 작업 트리 ID `d0a4b3cb8b95`, 실제 HEAD와 `config.source` **양쪽 모두** `76373239406eef471904807840e1c77b2653b7e4`, 보호 소스 tracked clean이다.
- 수집기 작업 파일의 raw Git-blob 방식 SHA1은 `b7fe36348e5faab717a15d056cf72d2f5f64359c`이고 `r45Observer=PRESENT_DIFFERENT_BLOB_REVIEW`다. `collectorMatchesHead=false`는 raw 작업 파일의 Git blob과 HEAD 오브젝트가 다름을 뜻하며, Git clean과 함께 기록됐다. CRLF 또는 Git text filter로 인한 정상 변환인지 실제 변경인지 아직 확정하지 않는다.
- 새 `market-calendar-r45-pc-current-detach.mjs` 기본 실행은 읽기 전용이며, **Git `hash-object --path`로 worktree 필터를 반영한 canonical SHA와 `HEAD:collect-local.mjs`를 직접 비교**한다. 두 값이 일치해야 R45 세 블록을 현재 코드에서 정확히 분리할 수 있는지 검사한다. 특정 예전 R56 collector blob을 강제하지 않고 현행 PC의 관측 raw blob/HEAD/실행기 해시를 모두 게이트로 묶는다.
- `--apply`는 별도의 `R45_CURRENT_PREFLIGHT_READY_NO_CHANGES`가 있어야만 가능하고, 수동 승인 후 PC Core 잠금이 즉시 FREE일 때 소유권 검증 잠금 아래 단일 파일 백업·정확한 R45 3블록 제거·1파일 로컬 Git commit·config.source readback을 수행하도록 준비했다. Core launcher·R7 후속 작업·주기·B1/MarketParquet·연 1회 수동 FHS와 기존 자료는 변경하지 않는다.
- **현재는 도구 작성과 개발 합성 검증만 완료**. PC 기본 preflight 결과도 아직 받지 않았으므로 사용자 PC 실제 R45 비활성화는 완료 상태가 아니다. 기존 R45 FIX1 `--apply`는 사용 금지다.
