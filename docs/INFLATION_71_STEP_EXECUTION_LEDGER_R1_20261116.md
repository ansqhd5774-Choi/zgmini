# W01 물가지표 — 71개 세부 실행 작업원장 R1 (2026-11-16)

> 사용자 확정 분모: 상위 8개(A1~A4, B1~B4) / 세부 71개. 이 파일은 기존 [26개 원자료 확보·공개 실행계획](INFLATION_26_SOURCE_AND_PUBLICATION_EXECUTION_PLAN_R1_20261110.md)의 **추적용 세분화**다. 산식/승인/수집 주기/DB/TTL/계약을 변경하지 않는다.

## 최신 인계 스냅샷 — W01 2026-11-17 (Writer/D1 증거 접근과 A2 소스 안전 검증)

> **다음 작업자는 이 스냅샷부터 시작한다.** 진행 기록 파일 자체가 지정된 정본이고, 상위 계획은 [26개 원자료 확보·공개 실행계획](INFLATION_26_SOURCE_AND_PUBLICATION_EXECUTION_PLAN_R1_20261110.md)이다. 과거 이력의 오래된 설치 SHA·대기 문구가 이 스냅샷을 덮어쓰지 않는다.

| 필드 | 현재 유효한 인계 값 |
| --- | --- |
| 담당·저장소·브랜치 | W01 물가지표 / `ansqhd5774-Choi/zgmini` / `fix/economic12-inflation-legacy4-r35-20261021` |
| 작업·기록 정본 | 계획: `docs/INFLATION_26_SOURCE_AND_PUBLICATION_EXECUTION_PLAN_R1_20261110.md`; 기록: **이 파일** `docs/INFLATION_71_STEP_EXECUTION_LEDGER_R1_20261116.md` |
| 전체 목표 | 승인 공식 BLS/Census 원자료 저장·재조회로 26/26 확보 → 기존 저장 기반 계산 → 기존 Writer 게시 → D1/API/PC·모바일 UI 연구지표 7/7 확인. 기존 19개 및 4축 산식·PPI·last-good·운영 설정 보호 |
| 확정 단계 | **19/71 완료(26.8%), 52개 미완료**: A1-01·07·09(3), A2-01·02·04·05(4), B1-01~06(6), B2-01~04·07·08(6). 이번 추가 A2-04·05는 CI/소스 범위의 완료이며 실PC B owner 증명 완료가 아님. B2-05/06의 직접 런타임 증거는 연결된 도구에서 현재 미획득; 과거 4/7 성공 관측과 구분 |
| 마지막 실제 운영 수치 | #1334 당시 **23/26 원자료**, **4/7 연구자료 저장·공개**(당시 관측). 이후 26/26 또는 7/7 달성은 확인되지 않음; 실제 전체 기능 추정 진행 42%는 옛 기준이고 71단계와 별도 |
| 최신 제어 소스 (운영 미반영) | `ansqhd5774-Choi/zgmini-pc-control` [PR #1772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1772), merge SHA `f59e723aa43e59520d760f5da17a07f7f09a04b2`; [source CI #43885847244](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43885847244) 90/90 PASS, C996 #43885847344 PASS. 현재 control main HEAD는 다음 실제 작업 시 재조회 |
| 실제 설치 Controller | #1745 당시 `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7` 파일 전환, 유지보수 결과 `UNKNOWN/BACKLOG_OR_RECOVERY_NOT_VERIFIED`; 이후 최신 코드 설치 검증 없음 |
| 기존 PC 재사용 결과 | [#1747](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1747) core-status PASS / Run 43876398674. [#1748](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1748) Event129 A `STATE_UNKNOWN/INFL_E129_NOT_OBSERVED_WITHIN_LIMIT` / Run 43876539574, reader OK·Event 인식 0·lock same=true·protectedStateUnchanged=true |
| 정확한 미해결 조건 | **실PC Event Log 설정 조회에서 TaskScheduler/Operational enabled=false(2026-11-16 22:32 KST)** 확인. #1748 Event129 0개 및 WMI Task GetInstances EMPTY와 정합. 그러나 #1690 B 실행 당시 로그 설정은 소급 증명 불가. Event Log 활성화는 C급 사용자 직접 작업; #1745 maintenance UNKNOWN 및 최신 Controller 미설치 문제는 별도 미해결 |
| 기존 요청 재실행 금지 | #1745 유지보수, #1747 core-status, #1748 Event129 A, 소비된 기존 B Run 43861853573. 원본 Issue/requestId와 JSON/TXT 재사용; 증거 없는 복구·잠금 삭제·수집 B 재실행 금지 |
| 이번 작업의 실제 효과 | 기존 W01 PR #1772 변경 정확 2개 A 진단·fixture만, CI #43885847244 90/90 PASS. B 공식 보호 코드 `inflation-manual-b/windows-adapter.mjs` 현재 control main과 운영 설치 SHA e3a495c9에서 Git blob `739f77f7ec2e94b62af13cde377cee4f5bf0582a` 동일함을 재확인하여 A2-04·A2-05 소스 범위 완료 처리. B2 Writer 진단: 정상 Writer는 고정 `local-writer-last-run.json`에 `inflation7` 결과 기록하지만 현재 allowlisted A는 상세 반환 안 함; D1 관리자 조회 연결 없음. 새 A/B·공급자/D1/운영 쓰기 0건 |

**다음 필수 실행 하나 — 사용자 C급 시스템 설정:** 운영 PC에서 Windows **작업 스케줄러 → 오른쪽 ‘모든 작업 기록 사용’** 또는 **이벤트 뷰어 → 응용 프로그램 및 서비스 로그 → Microsoft → Windows → TaskScheduler → Operational → ‘로그 사용’**을 직접 선택해 TaskScheduler Operational 기록을 활성화한다. **Core/Korea Task·예약·파일·잠금·DB·Controller는 변경하지 않는다.** 이후 자연 Core 실행이 새 이벤트를 만들면 기존 설치 A의 새 고유 Issue를 승인 범위에서 1회 실행해 event record/Task·WMI/lock 동일 PID와 시각을 재조회한다(기존 #1748 재실행 금지). 이후 B 단회 GET·파싱·저장으로 이어간다. **Controller PR #1772 신규 적용은 독립 정규 승인·manifest 및 postOperation 문제가 해결될 때 별도 처리**하며, 이번 로그 비활성이라는 직접 원인을 보완하는 선행조건으로 무조건 삼지 않는다. 사용자가 C 작업을 하기 전에는 이 범위만 BLOCKED, 독립 B1/B2 저장/게시 readback 검토는 계속 가능.

**최근 기록 변경(이번 요청):** 기존 `main` 공통 기준을 W01 **계획서와 이 지정 원장에 명시적으로 연결**했다. 지침 누락 재발 방지를 위한 인계 규칙 정비로, 기능 코드/Controller/공급자/D1/예약에 변화는 없다. 계획서 갱신 커밋 `246542e552f5be1fe547b222e91a2c68af32a00c`; 이 원장의 최종 반영 커밋은 GitHub 기록에서 확인하며 커밋 후 실제 원문을 재조회한다.

## 직전 기능 작업 종료 기록 — 2026-11-16 (인계 보존)

- **대상·단계:** W01 A1-08 / A2-05 관련 Event129 빈 응답·XML 형식 식별 보강. 이 두 세부 항목은 **실제 최초 실패 규명·운영 검증 미완료**이므로 DONE 처리하지 않는다.
- **실제 수행:** 제어 저장소 `ansqhd5774-Choi/zgmini-pc-control`의 [PR #1772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1772)에서 Event129 stdout 0·빈 Events·prefix·불완전 XML·non-XML·BOM 없는 UTF16을 고정 비식별 enum으로 구별하도록 A급 진단과 fixture 8건 개선. 기존 B 수집기/승인 판단·보호 설정·공급자 호출 계약 불변.
- **소스 종료 증거:** PR #1772 **main 병합 완료**, squash SHA `f59e723aa43e59520d760f5da17a07f7f09a04b2`; [Windows 소스 CI #43885847244](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43885847244) **90/90 PASS, fail 0**; C996 R5 CI #43885847344 **success**.
- **운영 적용/상태:** 이번 변경의 PC 설치 **미실행**, 신규 Event129 A **미실행**, 수동 B/공급자 호출/DB/D1 쓰기 **0건**. 기존 설치 Controller `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7` (#1745)와 이번 코드 SHA는 서로 다르다. #1745의 원본 유지보수 종료는 `UNKNOWN/BACKLOG_OR_RECOVERY_NOT_VERIFIED`이며, #1747 core-status PASS 및 #1748 Event129 STATE_UNKNOWN은 별도의 이전 실측이다. **CI/병합을 실제 PC 기능 완료로 간주하지 않는다.**
- **진행률:** 확정 완료 **8/71(11.3%)**, 나머지 **63개 미완료**. 원자료 마지막 확인치 **23/26**, 신규 저장·공개 각각 **4/7**(과거 증거이며 이번 실행의 신규 갱신 아님).
- **현재 문제:** #1748에서 Event129 reader OK이나 파싱 0건의 실제 형태는 미확인. 현재 배포 대상 누적 차이에는 W01 외 다른 담당의 Controller 파일도 존재하므로 W01 승인으로 묶어 설치 불가. 정규 설치의 필수 postOperation과 이전 '설치 후 자동 진단 미실행' 제한도 승인 범위를 명확히 해야 한다.
- **다음 필수 행동:** #1745 기존 설치/후속 사후검사 증거 재사용 → 현재 설치 SHA 대비 W01 변경·타 담당 변경을 분리한 정규 유지보수 승인/manifest 확인 → 허용 범위에서 W01 모듈 실제 설치·설치 해시 readback → 별도 승인된 새 A 단회 결과로 Event129 원인 분리 → 수동 B 원자료 저장 및 7/7 게시. #1745/#1747/#1748 기존 ID 자동 재실행 금지.
- **기록 판정:** 여기서 완료된 것은 **이번 소스 개선·회귀검사·GitHub 병합 및 그 증거의 진행 기록 반영**뿐이다. W01 물가지표 전체 또는 A1·A2 단계 완료가 아니다.

## 지정 진행 기록 파일 — 작업 종료·재개 운영 기준

**유일한 최신 W01 인계 정본은 이 `.md` 파일이다.** 같은 내용을 다른 신규 기록 파일·Issue 댓글·채팅에만 남겨 인계가 누락되도록 하지 않는다. 위 스냅샷과 아래 71개 항목, 과거 증거를 함께 관리한다.

1. **업무 시작(최초 1회/관련 변경 시):** 현재 목표와 최근 스냅샷, 정확한 완료 단계·미완료 단계, 승인/안전 경계, 실제 마지막 결과와 다음 필수 실행 **하나**를 읽는다. 소스/환경이 바뀐 영향 파일만 재검증하고 기존 PASS·실행 결과는 재사용한다.
2. **종료할 때마다 이곳에 기록:** 코드·문서·조사·진단·부분 실패·실행 차단을 포함해 **이번 실행에서 무엇이 달라졌는지** 표시한다. 작성 위치는 (가) 맨 위 최신 인계 스냅샷, (나) 영향을 받은 71개 세부 단계의 상태와 증거, (다) 보존할 이전 작업 종료 기록의 순서다. 별도 문서만 갱신하거나 채팅에만 최종 보고하는 것은 인계 완료가 아니다.
3. **기록의 필수 내용:** 실행 시각/대상 담당·저장소·브랜치/단계 ID와 상태 변화/`source HEAD`·작업 commit·PR·CI/PC `actualExecutionSha`·요청 Issue·requestId·Run 및 JSON/TXT/로컬 저장·D1/API/UI 실측 범위/`LAST PASS`·`FIRST FAIL`·실제 문제와 승인/STOP·재시도 금지 ID/완료 수·남은 수/**다음 한 작업의 담당·대상·실행 경로·통과 조건**. 확보하지 못한 필드는 `미확인` 또는 `해당 없음`으로 기재하고 사실을 보충 생성하지 않는다.
4. **결과와 진행률 일치:** 71개 `[x]`는 실증 범위까지 충족된 완료 증거가 있을 때만 체크한다. `SOURCE_ONLY`, `PARTIAL`, `STATE_UNKNOWN`, `BLOCKED`를 운영 기능 완료로 승격하지 않는다. 설치·수집·저장·계산·게시·D1 조회·Production/UI는 서로 다른 증거다. 기존 결과, last-good, 사용자 승인, 다른 담당 파일은 보존한다.
5. **기록 반영을 확인한 후 보고:** 이 파일을 전담 브랜치에 커밋하고 **같은 브랜치의 원문을 다시 조회**해 최신 스냅샷·71행·체크 완료 수·다음 필수 실행과 PR·SHA 증거가 맞는지 확인한다. 최종 답변에는 실제 작업 결과와 **기록 반영 커밋**을 별개로 제시한다. 파일이 GitHub에 없거나 재조회 실패 시 기록 `미반영/확인 불가`라고 보고한다.
6. **다음 작업자가 재개:** 이 파일의 최신 스냅샷 → 영향을 받는 세부 단계 → 링크된 증거 순서로 이어서 실행한다. 채팅 전체/타 담당자의 댓글 수신에 의존하지 않고, 기존 Issue·Run을 무조건 다시 실행하지 않는다. 과거 이력은 삭제·덮어쓰기 없이 보존한다.

이 규칙은 **기존 GitHub 공통 작업 기록 규칙의 W01 적용 방식**이다. 추가 예약·Controller 재설치·실PC 진단·새 승인 Gate를 만들지 않고 독립 기능 작업을 진행한다.

## 정본, 상태 구분 및 현재 결론

- 제어 저장소: `ansqhd5774-Choi/zgmini-pc-control`; W01 A operation `inflation-event129-evidence-readonly`는 #1745의 실제 Controller `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`에 등록·실행 확인(#1748). 단, PR #1760/#1772의 **후속 진단 코드**는 운영 PC 미적용이며 #1745 유지보수 전체 상태는 UNKNOWN.
- 기존 수동 B Run `43861853573`은 `INFL_MANUAL_B_CORE_OWNER_EVENT129_UNVERIFIED_STOP`; 원인 미확정. A #1693 Run `43862593587`은 `STATE_UNKNOWN/INFL_CORE_LOCK_PRESENT_TASK_ENGINE_GAP`; 인과관계 미입증.
- Controller 유지보수 #1501은 **2026-11-16T13:20:20.947Z 회복 완료**(`INTAKE_RECOVERED_EXISTING_CONTROLLER_PRESERVED`), 기존 Controller `b2ff49dd14a09ebeba482e2ae9a84530e00f094f` 보존. 복구는 새 진단 설치 완료가 아니다.
- 신규 A 진단의 최초 실패 보존 수정 [PR #1752](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1752)은 `main`에 squash SHA `ca0e2bcc65bab96caffc185c641122656be50510`으로 병합되었다. 격리 Windows CI Run `43879295002`에서 관련 테스트 72/72 PASS(신규 5 포함). **이것은 실제 PC 설치·Event129 재진단 성공이 아님.**
- 실제 저장 현황의 마지막 유효 원본: 23/26, 신규 4/7, Production 4/7; **원본 문서에 기록된 42%는 2026-11-14 당시 추정치로 현행 71개 완료비율이 아니다.** 최근 실행으로 재증명하지 않음.
- `HISTORICAL*`는 이미 입증된 **당시 범위만 재사용**한 기록이며 현행 Runtime 전체 DONE으로 올리지 않는다. `PARTIAL`/`SOURCE_ONLY`/`ANALYSIS`/`SOURCE_IN_PROGRESS`는 현장 기능 완료가 아니다. `PENDING`은 미완료, `DONE`은 실제 완료·날짜·SHA·원격 readback이 있는 경우만 사용한다.
- 관련 작업을 완료하지 않고 checkboxes를 체크하지 않는다. 코드 CI 성공, PC 실제 설치, 원자료 저장, 게시·D1/API/UI는 구분하여 판정한다.

## 우선 실행 순서

1. A1: #1501 복구 완료 재사용. 승인된 유지보수 계약의 자동 사후 `core-status` 검사와 이전 사용자 제한을 충돌 없이 확인하고 **설치 증거가 있을 때만** W01 Controller operation을 적용. 공유 자원·Runner 권한·서명된 manifest·allowFiles 검사 필요. 안전거부 우회 금지.
2. A1: 설치 완료 전/후 같은 요청 자동 재실행 금지. 진단 실행은 범위·승인·단회 고유 ID를 확인한 뒤 최초 실패 조건/STATE_UNKNOWN을 회수.
3. A2: B 직접 증명과 VBS 증명의 실제 첫 실패 근거가 확보된 경우에만 그 결함을 최소 수정; 안전 규칙 유지.
4. A3→A4: 별도 승인·opt-in·source pin이 실제 일치할 때만 단회 공식 B 2개 파일 GET→3개 원자료 저장→26/26 검증. 단순 Code/manifest 병합으로 수집 성공 주장 금지.
5. B1/B2 독립 남은 증거→B3/B4: 기존 4/7 게시 재실행 금지. 저장 기반 계산→기존 Writer→D1 직접 readback→Production API·PC/모바일 7/7 검증. 19개·4축 보존.

## 집계 기준 (71개)

```text
A1  9 | 운영 입력·소유권 증명
A2  8 | 증명된 결함 최소 수정
A3 12 | 공식 BLS·Census 수동 단회 수집
A4  8 | 26개 원자료 완전성
B1  7 | 기존 공개 코드 연결
B2  8 | 유효 원자료 우선 부분 게시
B3  9 | 전체 7개 저장 기반 계산·게시
B4 10 | Production·화면 최종 검증
합계 71
```

현재 71개 세부 체크 완료: **19/71 (26.8%)**. A1 운영 실증 3개, A2 원인·안전/fixture 4개, B1 source/UI/회귀 6개, B2 역사 실제 공개 증거 6개. **남은 52개** 중 A2-06 운영 경로·A3 실제 B 수집, B2-05 Writer ledger/B2-06 D1 관리자 조회가 미완료. 코드 검사만으로 수집·게시 완료 주장 금지.

## A1 — 운영 입력·소유권 증명 (9개)

- [x] **A1-01** 현재 PC Controller 설치 SHA 및 허용된 진단 operation 확인 — DONE | 운영 #1747 core-status Run 43876398674와 #1748 W01 A Run 43876539574의 실제 Controller SHA e3a495c97d6b40d6d4eea2ff4f586bef46216eb7 일치; A operation 실제 allowlist dispatch 확인(개별 결과 STATE_UNKNOWN, 설치 terminal PASS와 구분)
- [ ] **A1-02** 실제 Core·Korea Task 등록·상태·실행 파일 확인 — HISTORICAL | 2026-11-13 #1330·#1331 시점 Task Running/Ready 관측, 동시 시점 동일성 미검증
- [ ] **A1-03** Task Engine과 VBS launcher 연결 확인 — HISTORICAL | #1326 고정 action의 중첩 VBS 경로 관측, live lock owner 미증명
- [ ] **A1-04** WMI 프로세스 계보 및 승인 Core script 검증 — PENDING | 새로운 실제 증거 없음
- [ ] **A1-05** Event129의 PID·실행 시각·프로세스 생성 시각 확인 — BLOCKED | 2026-11-16 22:32 KST 실PC 조회 TaskScheduler/Operational enabled=false. 이 상태에서 신규 Event129은 발생 보장 불가; 사용자 C급 기록 활성화와 자연 Core 실행 후 증거 필요. 기존 이벤트/Task/lock 강제 실행 금지
- [ ] **A1-06** 공유 local-cycle.lock 실제 소유자 확인 — PENDING | 새로운 실제 증거 없음
- [x] **A1-07** 잠금 전후 해시·관측 경쟁 여부 확인 — DONE | #1748 단회 시점 lock before/after PRESENT, same=true, protectedBefore/After SHA-256 동일 및 protectedStateUnchanged=true; 관측 시점 이후 Core 지속 운전이나 B owner 증명은 미포함
- [ ] **A1-08** 최초 증명 실패 조건 특정 — PARTIAL | #1748 당시 Event129 관측 0개와 2026-11-16 22:32 실PC Operational enabled=false의 직접 정합성 확인. B #1690/Run 43861853573 당시 설정에 대한 동시 시점 기록은 없어 역사적 원인 전체 소급 확정 금지; 추가 직접 owner PID/time 증거 미완료
- [x] **A1-09** 원격 진단 JSON/TXT 회수 및 보호 상태 확인 — DONE | #1748 43876539574-1-seat-1 JSON/TXT 2/2 직접 재조회, 상태 STATE_UNKNOWN/INFL_E129_NOT_OBSERVED_WITHIN_LIMIT, operationalWrites/providerCalls/d1Writes=0, protectedStateUnchanged=true

## A2 — 증명된 결함 최소 수정 (8개)

- [x] **A2-01** A1에서 확보한 최초 실패 코드 분석 — DONE | #1690 B `INFL_MANUAL_B_CORE_OWNER_EVENT129_UNVERIFIED_STOP`, #1748 A `INFL_E129_NOT_OBSERVED_WITHIN_LIMIT` 및 Task instance EMPTY/reader OK를 B windows-adapter.mjs의 EnginePID 직접 증명 또는 Event129 대체 경로와 대조. 22:32 KST PC Operational enabled=false가 해당 시점 대체 경로 증거 부재를 설명함. 역사적 B 실행 당시 설정 동일성은 미입증
- [x] **A2-02** 실제 검증 오류와 조회 시점 한계 구분 — DONE | WMI ownerFound/coreMatched=true와 GetInstances EMPTY는 실제 Core 미실행 증거가 아님. Event129 기록 비활성은 #1748 이후 2026-11-16T13:32:12Z의 정확한 상태로 관측됐으며 11:56Z B 실행으로 소급 단정 금지. B 검증 안전거부 유지하고 C 시스템 설정을 별개 제한 범위로 분리
- [ ] **A2-03** 잘못된 검증 조건이 입증된 경우 해당 조건만 최소 수정 — PENDING | 새로운 실제 증거 없음
- [x] **A2-04** 기존 안전거부·허용 오차·잠금 보호 유지 — DONE | 제어 #1772의 실제 변경 2파일은 `controller/inflation-event129-evidence-readonly.mjs` 및 `.test.mjs`뿐. 공식 B `inflation-manual-b/windows-adapter.mjs` blob `739f77f7ec2e94b62af13cde377cee4f5bf0582a`가 설치 제어 SHA e3a495c9와 2026-11-17 main에서 동일. linked/WMI/Event129/VBS·lock 보호 판정 완화 0; 실PC 수집 B 성공 여부는 별개 미검증
- [x] **A2-05** 관련 코드 회귀검사 — DONE | [제어 #1772 Windows Node CI #43885847244](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43885847244) completed/success, 90/90 PASS (source fixture; 운영 PC 아님), B 공식 원본 파일 불변 검증. A2-06 실제 Windows 동일 운영 경로 검증은 미완료 유지
- [ ] **A2-06** Windows 동일 경로 검증 — PENDING | 새로운 실제 증거 없음
- [ ] **A2-07** 수정 파일·source SHA 확정 — PENDING | 새로운 실제 증거 없음
- [ ] **A2-08** 필요한 정규 운영 적용 및 적용 파일 재조회 — PENDING | 새로운 실제 증거 없음

## A3 — 공식 BLS·Census 수동 단회 수집 (12개)

- [ ] **A3-01** 승인된 최신 운영 source·manifest 확인 — PARTIAL | W01 V2 APPROVED_B 단회 manifest 소스 존재·조회 완료. 소비된 B Run 43861853573의 Event129 증명 중단을 재실행하지 않음; 향후 source pin·실제 효과 추가 확인 필요
- [ ] **A3-02** 기존 Writer·Core 공유 자원 경합 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-03** 새 고유 Issue/requestId 등록 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-04** 승인된 공식 수동 B 정확히 1회 실행 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-05** B 내부 Core 소유권 검증 — BLOCKED | 기존 B V2는 Task-linked WMI 직접 증명 시 Event129 우회 가능하지만 #1748 Task instance EMPTY로 그 경로 미확인. Operational enabled=false 시 Event129 대체 경로 증명 불가; 해당 조건 해소 전에는 무증명 수동 수집 B 재요청 금지
- [ ] **A3-06** BLS 공식 flatfile 1회 다운로드 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-07** Census 공식 XLSX 1회 다운로드 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-08** CPI 임대료·OER 파싱 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-09** Census M3 제조업 총재고 파싱 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-10** 기존 PPI 원자료·checkpoint 보호 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-11** 원자료 로컬 저장·재조회 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-12** 실행 JSON/TXT 회수 및 원본 보호 검증 — PENDING | 새로운 실제 증거 없음

## A4 — 26개 원자료 완전성 (8개)

- [ ] **A4-01** 기존 23개 원자료 존재·유효성 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **A4-02** 신규 CPI 임대료 원자료 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **A4-03** 신규 CPI OER 원자료 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **A4-04** 신규 Census M3 총재고 원자료 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **A4-05** 관측월·단위·값·결측 검증 — PENDING | 새로운 실제 증거 없음
- [ ] **A4-06** 수집일·sourceStoredAt·source SHA 검증 — PENDING | 새로운 실제 증거 없음
- [ ] **A4-07** 원자료 SHA·checkpoint·재조회 검증 — PENDING | 새로운 실제 증거 없음
- [ ] **A4-08** 기존 정상본 및 마지막 유효 결과 보존 확인 — PENDING | 새로운 실제 증거 없음

## B1 — 기존 공개 코드 연결 (7개)

- [x] **B1-01** 현재 zgmini/main 기준 source 확인 — DONE | zgmini/main 73d1b7eeeef23dd69de90c047d8bfdab4c6cb1b2, 5개 관련 소스 blob 현재 main 1:1 불변 확인
- [x] **B1-02** run-local.mjs의 신규 7행 계산·게시 연결 확인 — DONE | run-local.mjs의 publishInflationCandidates7Auto 연결, Git blob 18a1bbb7f73e8523b5faf0f5c6d12f829e67be3d 확인
- [x] **B1-03** 기존 공통 Writer 연결 확인 — DONE | auto-publication-r1.mjs에서 저장 preview→기존 Writer→D1 readback 경로 확인, blob 2c71f345b36fcebe9f003e26aaf874a792550354
- [x] **B1-04** candidate-r52.ts API 라우트 확인 — DONE | candidate-r52.ts D1 공개 reader 라우트 연결 확인, blob d2af33c6afff090fbe8dbc39b418c12972aa39af
- [x] **B1-05** 물가지표 상세 UI 컴포넌트 연결 확인 — DONE | economic-detail-panel.tsx→inflation-candidate-7-inputs.tsx 연결 확인, blobs 2322e0ed8a4f2ded2c53a9be98e207d65fb9adab / 5e621cb7638b5cfa7201ef41b0170a24eeee3b54
- [x] **B1-06** 기존 19개·4축 점수 불변 검사 — DONE | 현재 zgmini/main f22bfb1df7ff70bf4997117fbc187844a52f5c5c의 4축 원본 산식·19개 독립 표 유지 회귀검사 PASS: Node.js CI Run 43888083156, 실패 0건. 테스트 tests/economic12-inflation-original4-r35.test.mjs의 4요소·일련 번호·가중치·결측/0 처리·1Y history 불변, 기존 19행 source UI 분리 테스트. 이는 source/CI 검증 및 2026-11-10 별도 Production 19행 관측에 한정; 금일 D1 최신값 동일성은 미검증
- [ ] **B1-07** GitHub 개발 source와 실제 배포 source 구분 — PARTIAL | 개발 main과 당시 Production 응답 구분, exact Deployment SHA 미조회

## B2 — 유효 원자료 우선 부분 게시 (8개)

- [x] **B2-01** 저장된 7개 입력 상태 조회 — DONE | [역사적 실PC 조회] 2026-11-13 #1334/Run 43277201713 7개 후보 중 4개 유효·#22/#23 INVALID·#28 MISSING. Production API 2026-11-10 7행과 별개 시점. 최신 PC 원자료 상태는 재확인되지 않음
- [x] **B2-02** 유효 4개 READY/STALE 판정 — DONE | [역사적 Production] 계획서 §6 2026-11-10 GET API status=PARTIAL·READY 4개(#2 EIA, #16 Treasury, #24 BLS PPI, #29 Fed G17) 실측. 개별 관측일·값·sourceVersion 기록; 현재 2026-11-17 live 동일성은 미검증
- [x] **B2-03** 누락 3개 PENDING/last-good STALE 판정 — DONE | [역사적 Production] 계획서 §6 2026-11-10 API #22·#23·#28 3행 PENDING/value:null/history:[]/관측일 null 확인. 숫자 0 위조·STALE 오표시 없음. 후속 last-good이 생긴 경우 STALE 보존은 별도 source 단위 회귀 테스트 PASS
- [x] **B2-04** score:null 연구자료 projection 생성 — DONE | [역사적 실제 공개+현행 코드] 계획서 §6 2026-11-10 API 7행 status=PARTIAL·score=null·schemaVersion=inflation-causal-candidates-7-r1-v1·sourceVersion INFL7_PRESENTATION_c891b9b21dc39a33c88acd08692bbdc2d9278e32881ec4759b09ec42cbd10231 반환. tests/inflation-causal-candidates-public-7-r1.test.mjs의 7행 생성·4 READY 3 PENDING score:null·결측 계약 회귀검사 보유. 현행 D1 직접 readback은 B2-06 미완료
- [ ] **B2-05** 기존 Writer를 통한 D1 부분 게시 — AUTOMATION_BLOCKED | 2026-11-10 4/7 API/UI 게시 성공 역사 증거는 있으나 Writer의 per-key 실제 원장 미획득. 현재 main `scripts/pc-writer/run-local.mjs`는 `report.inflation7`를 `E:\\ZGmini\\data\\pc-writer\\local-writer-last-run.json`에 기록하고 readback 결과 `READBACK_VERIFIED`/`ALREADY_STORED`·sourceVersion·sourceStoredAt를 포함. 기존 allowlisted `writer-publication-evidence-readonly`는 ER1 고정 키만, `core-status`는 Writer 상태만 보고해 이번 inflation7 영수증을 대체할 수 없음. 실제 PC 원장 조회 가능한 정규 권한 필요; 공급자·게시 재실행 금지
- [ ] **B2-06** D1 key·값·시각·원본 버전 직접 확인 — AUTOMATION_BLOCKED | 현재 연결된 도구에 Cloudflare D1 관리자 read-only DB/query 권한 없음; GitHub source의 D1 SQL 및 2026-11-10 과거 API 성공은 직접 D1 관리자 영수증 아님. 정규 읽기 전용 권한으로 `market_public_snapshots_v1`의 정확 key `detail:inflation-causal-candidates-7:r1` 1행만 SELECT `body,stored_at` → projection builtAt·sourceVersion/sourceStoredAt·7행·score:null 원문 계약 검증 필요. 원자료·전체 D1 덤프/임의 SQL·재게시 금지
- [x] **B2-07** Production API 7행 결과 대조 — DONE | [역사적 Production] 계획서 §6 2026-11-10 /api/inflation-candidate-inputs GET 7행·4 READY 3 PENDING·score:null 검증, sourceVersion 저장. 2026-11-17 재조회는 접근 실패이므로 현재 Production 정상/오류 단정 금지; 최종 현재 7/7은 B4 별도 미완료
- [x] **B2-08** 홈페이지 4/7 부분 공개 확인 — DONE | [역사적 Production UI] 계획서 §6 2026-11-10 /economic-indicators/inflation/ 데스크톱 연구 원자료 7행(4값+3 대시)·기존 19행·4축 54.3점 별도 표시 실측. 모바일 최종 검증은 B4-08 별도 미완료. 이번 페이지 SSR 로딩 문구는 hydration 이후 데이터 판정 근거가 아님

## B3 — 전체 7개 저장 기반 계산·게시 (9개)

- [ ] **B3-01** A4 신규 3개 저장 완료 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **B3-02** 저장 원자료 기반 계산 — PENDING | 새로운 실제 증거 없음
- [ ] **B3-03** 신규 7개 데이터 계약 검증 — PENDING | 새로운 실제 증거 없음
- [ ] **B3-04** 로컬 계산 결과 저장 — PENDING | 새로운 실제 증거 없음
- [ ] **B3-05** Writer 입력 생성 — PENDING | 새로운 실제 증거 없음
- [ ] **B3-06** 승인된 기존 게시 경로 실행 — PENDING | 새로운 실제 증거 없음
- [ ] **B3-07** D1 저장·sourceVersion·stored_at 직접 재조회 — PENDING | 새로운 실제 증거 없음
- [ ] **B3-08** 전체 7개 상태·값·날짜 일치 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **B3-09** 기존 19개·4축 산식과 결과 보존 — PENDING | 새로운 실제 증거 없음

## B4 — Production·화면 최종 검증 (10개)

- [ ] **B4-01** Cloudflare 연결 저장소·브랜치·배포 SHA 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **B4-02** Production API GET/HEAD 검증 — PARTIAL | 2026-11-10 API GET 공개 관측, HEAD 최신 미검증
- [ ] **B4-03** D1 값과 API 응답 일치 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **B4-04** 신규 7개 실제 수치·단위 검증 — PARTIAL | 역사적 4개 공개값 관측, 신규 3개 미저장
- [ ] **B4-05** 관측일·수집일·게시일 구분 확인 — PARTIAL | 역사적 API/화면 날짜 계약 확인, 최종 7개 미확인
- [ ] **B4-06** 결측·STALE·마지막 정상값 검증 — PARTIAL | 역사적 누락 3개 PENDING 표기, 최신 원장 비교 미완료
- [ ] **B4-07** 데스크톱 화면 데이터 확인 — HISTORICAL_OUTPUT | 2026-11-10 데스크톱 표 4/7 관측
- [ ] **B4-08** 모바일 화면·표·차트 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **B4-09** 기존 19개 원자료와 4축 점수 보존 확인 — HISTORICAL_OUTPUT | 2026-11-10 기존 19/4축 UI 존재, D1 비교 미완료
- [ ] **B4-10** 최종 실제 게시 증거 및 사용자 확인 준비 — PENDING | 새로운 실제 증거 없음


## 엄격한 STOP 및 경계

- 새 Controller 정규 설치는 `installedSha/targetSha/allowFiles SHA256/approval PR/backup/rollback/6 Runner/기존 postOperation` 계약을 유지한다. 이전 B급 승인 재사용 또는 진단 후 자동 실행 금지와 충돌하면 실제 설치 요청을 만들지 않는다.
- 실PC 실행 미승인 시 구분 가능한 소스 개발·fixture·GitHub 검증·공개 정보 조회만 계속한다. 임의 shell/Task/프로세스/lock/DB/D1 조작 금지.
- 공개 증거에 PID/전체 명령행/원문 Event XML/원자료/인증정보를 포함하지 않는다.
- 자연 예약 검증·외부 인계 장기 E2E는 본 71개 완료의 선행 조건이 아니다.

## 2026-11-16 최신 소스 설치 사전분리 (비실행)

- 기존 Controller SHA `b2ff49dd14a09ebeba482e2ae9a84530e00f094f` (#1501 복구 보존)→현재 제어 main 사이 **controller/config 총 11 blob 차이**: deployable 10파일 + fixture 1파일. 여기에는 W01 이외의 고용·시장 캘린더·테마·Provider activity 관련 변경이 섞여 있다. 단순 전체 main Controller 설치는 W01 최소 파일만 적용하는 것이 아니다.
- Controller 유지보수기 `tools/update.mjs`의 target은 `origin/main` 조상·installed SHA 후손이어야 하고 실제 diff를 정규 manifest에 정확히 선언해야 한다. **W01-only 승인으로 다른 담당 파일을 덮어쓰지 않는다.**
- 별도의 현재 유지보수기 결과 #1738에서 권한 있는 Runner Inventory API `HTTP_403_FORBIDDEN`을 확인했다. 이는 Runner Offline 증거가 아니며 정규 설치 입력 증거로 처리한다. 유지보수기는 기존 `postOperation`을 필수로 실행하므로 이전 사용자의 '설치 후 자동 진단 실행 금지'와 충돌하는 범위는 우회하거나 새 설치 요청으로 시험하지 않는다.
- A1이 막혀도 B1 현재 공개 source 연결 확인과 B2의 기존 게시 증거 정리는 독립 진행한다. 현재 Production API 7/7 값 또는 D1 직접 readback은 이번 source 조사만으로 입증되지 않았다.

## 2026-11-16 W01 A1 진단 개선 및 설치 경계 추가 (실증 구분)

- **소스·CI 완료:** [제어 PR #1760](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1760) squash `a1f1bbfa309bb2a1ad9a8322a5dc214a6e8c1c27`. [Windows 소스 CI #43883329062](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43883329062): **82/82 PASS, fail 0**. 기존 B는 수정하지 않았음.
- **진단 내용:** 원래 B의 잠금 나이 0~1시간·자기 PID 거부, WMI에 의해 현재 Core 직접 증명되면 Event129 불필요, Korea 공유 잠금 또는 Task 비실행은 단회 시점 UNKNOWN, 소유권 확인 불가 상태에서도 Event129 reader/인코딩/BOM/필드만 **1회 독립 관측**. B 증명 결과와 보조 XML 파싱은 구분, 수집·운영 쓰기 경로 없음.
- **실제 설치 최신 증거:** 별도 정규 [#1745](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1745)는 Controller `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`로 실파일 전환·6 Runner 재연결 및 10-file hash mismatch 0을 후속 댓글에 기록. 그러나 유지보수 원본 결과는 `UNKNOWN/BACKLOG_OR_RECOVERY_NOT_VERIFIED`, firstFail `RECONNECTED`, protectedStateUnchanged=false, workflowEnabled=false(원본 응답 당시 값). 후속 댓글의 workflow active 진술은 별도 시점. **전체 정규 설치 PASS / W01 진단 실PC PASS로 올리지 않음.** 원본 요청 재실행·복구 우회 없음.
- **최소 다음 배포 차이 (조회 당시 기준):** 설치 SHA `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7` → 제어 소스 `a1f1bbfa309bb2a1ad9a8322a5dc214a6e8c1c27` 사이 설치 대상 `controller/config` 파일 **1개만 변경**: `controller/inflation-event129-evidence-readonly.mjs` Git blob `626ce8d3296e425cd3a95375ebf868b2d9eaabca` → `ee6b1bcdc825811711c4dee62b0ed488c96f614c`, 신규 소스 SHA-256 `33a7588cf0a5a4b0f44db5baaa6620e09c051b290a50202dcd8cdd06d7535872`. 수정 fixture .test.mjs는 배포 대상 아님. **설치 manifest 승인·실행·해시 실PC 확인은 별도 미완료**.
- 기존 설치 계약은 정확한 B급 승인 manifest·source/manifest/diff·보호 상태·자동 사후 `postOperation`을 필수로 요구한다. 사용자의 **설치 후 자동 진단 불실행** 조건을 무시해 재설치하지 않는다. #1745의 정규 복구·사후검사 상태와 승인 범위가 확정될 때까지 그 공유 설치 작업만 STOP.
- **다음 필수 실행:** 중복 설치가 아니라 #1745 기존 결과·승인된 단일 복구 owner의 완료 기록이 있으면 재사용 → 신규 W01 한 파일 manifest/검증 후 정규 적용. 단회 Event129 읽기 A 및 수동 B 수집은 별도 승인까지 미실행. B1/B2의 기존 부분공개 및 정상 자료는 보존.

## 2026-11-16 #1747·#1748 실PC 관측 재사용 (중복 진단 0회)

- [#1747](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1747) 실PC A `core-status`, Run 43876398674: PASS/CORE_READONLY_DIAGNOSIS, `actualExecutionSha=e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`, protectedStateUnchanged=true, 원격 JSON/TXT 2/2 확인. **이는 유지보수 #1745의 RECONNECTED/RECOVERY_REQUIRED를 공식 terminal SUCCEEDED로 변환하지 않는다.**
- [#1748](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1748) 실PC A `inflation-event129-evidence-readonly`, Run 43876539574: `STATE_UNKNOWN/INFL_E129_NOT_OBSERVED_WITHIN_LIMIT`, reader OK, `UTF-8/BOM NONE`, 구형 파서 Event 총 0, Task 정의 OK, GetInstances EMPTY, WMI OK/ownerFound=true/coreMatched=true, 직접 B 증명 `INFL_MANUAL_B_EVENT129_INPUT_UNVERIFIED`, VBS 후보 0. 잠금 PRESENT→PRESENT same=true, protectedStateUnchanged=true, providerCalls/operationalWrites/d1Writes=0; JSON/TXT 재조회. **독립 WMI Core script 일치는 Event129나 Task 소유권 직접 증명이 아니며, 실제 Event129 기록 부재인지 구형 파서 미인식인지는 분리되지 않았다.**
- A1-01/A1-07/A1-09는 각각 정확한 증거 범위에서만 DONE 처리. A1-04/A1-05/A1-06/A1-08 및 B 원자료 수집은 여전히 미완료. 기존 Run·requestId 재실행 금지.

## 2026-11-16 Event129 empty-XML 분리 및 운영 설치 최소 범위 최신화

- 실PC #1748은 reader OK/UTF-8/BOM NONE, **구형 A에서 Event129 파싱 0건**. 이전 자료에는 stdout 바이트 길이·XML envelope 형태가 없어 원인(진짜 이벤트 없음 vs XML 루트 인식 실패)을 판별하지 못한다. Event129 원문을 새로 유출하지 않고, 읽기 전용 출력 enum/byte band/원래 B 인식 이벤트 수/보조 XML 인식 이벤트 수로 구분해야 한다.
- [제어 PR #1772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1772) main 병합 SHA `f59e723aa43e59520d760f5da17a07f7f09a04b2`. 격리 Windows [source CI #43885847244](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43885847244) **90/90 PASS, 실패 0**. 8개 신규 fixture: stdout 0 / 빈 Events / Event prefix / 불완전 XML / non-XML / BOM 없는 UTF16LE / event 0 / reader 실패. **구 B 순수 증명·수집기는 미수정**, 실제 PC 진단/수집 요청 0건.
- 설치 보류 시점의 **누적 Controller diff 3파일** (설치 실측 SHA `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7` → 이번 PR 병합 `f59e723aa43e59520d760f5da17a07f7f09a04b2`): W01 `controller/inflation-event129-evidence-readonly.mjs` old Git blob `626ce8d3296e425cd3a95375ebf868b2d9eaabca`→new `95fedad09bc9004d9a25711493d8b4c2c66be972`; **다른 작업의 두 파일** `controller/provider-activity-runtime-readonly.mjs` 및 `controller/http32-two-host-checkpoints-readonly.mjs`도 변경. 이전 1파일 diff 기록은 그 시점의 사실이지만 현행 적용 manifest 근거로 재사용 금지.
- W01 승인만으로 다른 두 파일을 합산·교체할 수 없다. 현재 실PC W01 신규 코드 설치 미확인, #1745 유지보수 `UNKNOWN/RECONNECTED` 원본 기록 보존, 이미 실행한 #1747/#1748 재실행 금지. 정규 유지보수 자동 `postOperation`과 사용자 제한은 우회하지 않는다.
- 완료 분모는 **8/71 (11.3%)** 유지. A1-08(최초 B 실패 근거)·A2-05(실운영 검증)가 완료된 것으로 간주하지 않는다. 허용되는 다음 실행은 정규 승인된 변경 범위/설치·사후검사 계약 확정이며, 이후 **별도로 허용된** A 단회 증명 결과에서 새 enum으로 실패 원인을 구분한다.

## 2026-11-16/17 — W01 Event129 실제 시스템 설정 원인 분석 및 인계

- **증거 확보:** 제어 저장소 `ansqhd5774-Choi/zgmini-pc-control` `main`의 [실PC TaskScheduler 로그 설정 결과](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/w01-task-log-config-readonly-20261116.json), blob `ed06708707e261673ef9df0269331ee41c903b45`, 결과 저장 commit `fe32538e4522e34a8df72ca5ff809edc7124ed7b`. 관측 `2026-11-16T13:32:12.427Z`: `log=Microsoft-Windows-TaskScheduler/Operational`, `enabled=false`, configurationReads=1, eventQueries=0, configurationWrites=0, providerCalls=0. 제어 [#68 기존 W01 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68)에서 실제 PC `wevtutil gl` 1회 읽기라고 명시; 이번 대화에서 PC 재조회는 **0건**.
- **정확한 원인/범위:** 이전 #1748 reader OK/UTF-8/BOM 없음/이벤트 총 0, GetInstances EMPTY, WMI Core command matched, lock unchanged. 기존 B `inflation-manual-b/windows-adapter.mjs`는 `linked===true`인 현재 Task EnginePID 직접 경로에서 Event129 없이 통과할 수 있지만, #1748 관측 때 Task-linked 조건 미확인; V2 Event129 대체 경로가 비활성 채널의 영향권. **이것은 당시 A 관측 부재의 직접 환경 원인이며, 2026-11-16T11:56Z의 과거 #1690 B 시점까지 소급 확정하지 않는다.** Core 수집기·BLS/Census 공급자 장애 판정도 아니다.
- **해결 방향:** Windows 관리자 Event Log/TaskScheduler 기록 사용은 사용자 **C급 직접 변경**. 소스 보호 검사·Assertion 삭제·로그 활성화 원격 우회·Core/Korea 강제 실행·잠금 정리 금지. 승인된 새 A는 기록 활성화와 자연 Core 이벤트 후 단회 요청만 허용. PR #1772 미설치가 당장 Event 생성의 원인은 아니므로 반복 Controller 재설치보다 실제 로그 기록 활성화가 우선.
- **이번 실행:** GitHub 원본 증거 readback·현재 B/Controller 소스 비교, [ZGMINI 공개 물가 페이지](https://zgmini.kr/economic-indicators/inflation/) 서버 HTML 읽기 시 19행/7행의 로딩 표식만 관측(클라이언트 수치 7/7, D1 actual readback 아님). 공급자 호출·PC 설치/진단/수집·운영 DB·D1 쓰기 **0건**. 이 파일의 두 분석 세부단계만 DONE 처리(8→10/71). 기능 수집/게시 진행률이 26/26·7/7로 바뀐 것은 아님.
- **NEXT 담당/통과:** 사용자: C급 TaskScheduler/Operational 로그 활성화 1회(시스템 설정 변경). 다음 W01 원담당: 기존 자동 Core 자연 이벤트 기록 확인 후 승인된 `inflation-event129-evidence-readonly` 신규 고유 A 1회, 실제 `readerShape`는 설치 SHA에 따라 분리 판정. 소유권/Task·VBS/lock PID/시간 적합 증명이 통과할 때만 공식 B 단회 수집; 불명확하면 관련 A/B만 BLOCKED. #1745/#1747/#1748/#1690 동일 ID 재실행 금지.

## 2026-11-17 — B1-06 및 B2 기존 완료 증거 재사용·현재 공개 검증 한계

- **실행 경로:** W01 `fix/economic12-inflation-legacy4-r35-20261021` 진행 원장과 원래 계획서 §6 대조. 현재 `zgmini/main=f22bfb1df7ff70bf4997117fbc187844a52f5c5c`의 `tests/economic12-inflation-original4-r35.test.mjs` 및 7행 후보 public/Writer 테스트 소스 조회.
- **실제 테스트 증거:** [Node.js CI #43888083156](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43888083156) head=f22bfb1d…, completed/success. Node 테스트 4488 중 **4478 PASS·0 FAIL·7 SKIP**(그 외 결과는 CI 표현 그대로 유지), PC recovery 11/11, Cloudflare contract 69/69. CI 원문에서 'the approved four diagnostic parts exactly reconstruct', 'market domain preserves four-factor', 'inflation research 19 replace the legacy four in table/mobile' 등 관련 테스트 PASS를 직접 확인.
- **재사용한 당시 운영 증거:** 계획서 §6 `2026-11-10` Production GET `/api/inflation-candidate-inputs`, 정확 7행·READY #2/#16/#24/#29 4개·PENDING #22/#23/#28 3개, `score:null`; 데스크톱 별도 표 4값·3개 미제공·기존 19행·4축 score 54.3 독립 표시. 계획서 §9.4 `2026-11-13` 운영 A #1334 당시 4/7 유효. **현재 Production 값을 새로 검증했다는 뜻이 아님.**
- **검증되지 않은 범위:** 2026-11-17 공개 API JSON 직접 조회는 web 도구에서 URL 접근 불가, 서버 응답 코드/실제 상태 미확인. 공개 HTML SSR은 hydration 전 '확인 중'으로 렌더되어 실제 7개 수치·D1 최신값의 증거가 아님. 관리자 D1 key/값/stored_at·실제 Writer ledger·현행 Cloudflare exact SHA·모바일 최종 화면 미확인. 기존 정상 데이터 재게시·추정값 채우기 없음.
- **71단계 진행 정정:** **B1-06과 B2-01/02/03/04/07/08 DONE**(7개 과거 완료 증거 회수), **10→17/71 (23.9%)**. B2-05와 B2-06은 직접 ledger/D1 증거가 없어 계속 미완료. 역사적 42% 추산치와 혼합하지 않음.
- **현재 문제와 NEXT:** Event Log TaskScheduler/Operational disabled 실PC 증거(2026-11-16 22:32 KST)와 수동 B 소유권 차단은 현재 C급 사용자 직접 활성화 단계에서만 BLOCKED. 독립 작업의 다음 실행은 기존 승인 경로로 **저장 D1 key `detail:inflation-causal-candidates-7:r1`의 관리자 원본 `body,stored_at,sourceVersion` 및 Writer ledger를 실제 readback하여 B2-05/06을 판단**하는 것. 해당 D1 권한·접속이 없으면 접근 불가로 남기고 새 DB/임의 SQL/게시 재실행 금지.
- **운영 영향:** 소스 산식·DB/TTL·수집 주기·Controller·DNS·Publisher·예약 변경 없음. 공급자 호출·PC 쓰기·D1 writes 0. 기존 요청·사용자 C급 작업을 우회하지 않음.



## 2026-11-17 — Writer/D1 읽기 증거 재조회 경로 점검 및 A2 안정성 검사 완료

- **대상:** B2-05·B2-06, 독립 A2-04·A2-05. 현재 기능 repo `main@572ff07903ddf67ba21faa98c8ffa5ceb3f8e9aa`, control `main@04f189e0a2290ff82380a56c35a07f3d63aaf587` 조회 시점; 브랜치 분리. 실제 Runtime 설치 SHA는 직전 실측 `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`, 이번에 다시 PC 조회한 결과가 아님.
- **정확한 A2 증거 재사용:** [제어 PR #1772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1772) 경로 2개, `controller/inflation-event129-evidence-readonly.mjs`·fixture만 변경. 공식 B 소유권 보호 `inflation-manual-b/windows-adapter.mjs`는 실제 설치 소스→현재 main blob 동일 `739f77f7ec2e94b62af13cde377cee4f5bf0582a`. [Windows source CI #43885847244](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43885847244) 90/90 PASS. A2-04/05는 **source/CΙ 범위** DONE. A2-06(실PC Windows 동일 경로)·A2-08(운영 설치)는 미완료.
- **B2-05 정확한 영수증 위치:** 기존 공통 Writer `scripts/pc-writer/run-local.mjs` 310~316행에 7행 Sidecar 게시가 있으며, 파일 끝에서 `local-writer-last-run.json`을 항상 저장한다. `report.inflation7`는 `publishInflationCandidates7Auto()`의 반환(정확 key, sourceVersion, sourceStoredAt, `READBACK_VERIFIED` 또는 `ALREADY_STORED`, d1Writes 포함)으로 들어간다. 반면 `local-publication-ledger.json`은 ER1 readbacks만 보존하므로 이 파일만 읽고 물가 7행 영수증이 없다고 결론 내리면 안 된다. 실제 운영 PC 파일·requestId/원장 readback은 이번 회차 **미실행/미획득**. 기존 A `writer-publication-evidence-readonly`는 ER1 스키마에만 한정돼 W01 세부 게시 증명이 아님.
- **B2-06 정확한 DB 계약:** `worker/inflation-causal-candidates-public-7-r1.mjs` GET는 D1 `market_public_snapshots_v1`의 `snapshot_key='detail:inflation-causal-candidates-7:r1'` 1행을 `body,stored_at` 조회하고 `saved.projection.status='READY'`, `builtAt=stored_at`, sourceVersion/sourceStoredAt 일치, 7행, score:null 검증한다. **공개 GET 성공=해당 시점 D1-backed 제공 증거이지만 D1 관리자 직접 SELECT와 Writer 실행 원장을 대신하지 않음.**
- **조회 경계:** 현재 web public API 두 호스트 `https://zgmini.kr/api/inflation-candidate-inputs`, `https://www.zgmini.kr/api/inflation-candidate-inputs`는 웹 도구에서 URL 접근 불가. 같은 시점 HTML SSR은 연구값 loading/placeholder만 보여 브라우저 hydration 이후 실제 데이터가 아님. Python 실행 환경 외부 DNS 접근 불가. 사용자 브라우저 읽기 연결은 해당 도메인 확장 접근 권한이 없어 거부됨. Cloudflare D1 admin 연동 도구/권한 확인되지 않으며 서비스 자체 장애는 **UNVERIFIED**.
- **현재 장애 분류:** B2-05/06의 실측 확보는 `AUTOMATION_BLOCKED/READBACK_PERMISSION_UNAVAILABLE` (실제 Writer RUNTIME_FAILED나 D1 장애 아님). 임의 PC 명령·D1 SQL·새 Controller 단독 등록·재게시·새 유료 서비스 요청 안 함. 독립 A2 완료 증거는 가산하되 D1/Writer 재검증 완료로 오인하지 않음.
- **NEXT 1 (독립 업무):** 기존 승인 범위의 Writer/Cloudflare D1 읽기 전용 담당을 통해 고정 7행 key와 로컬 Writer 마지막 원장 readback을 회수하고 `sourceVersion/sourceStoredAt/builtAt/stored_at`을 동시 비교. 승인된 기존 접근을 확보할 수 없는 동안 이 두 단계만 BLOCKED. 별도로 Event129 Windows 로그 활성화는 사용자 C급 직접 작업이고 수동 B 재실행은 금지. 신규 유효 원자료 3개 수집·7/7 게시 목표는 변함없음.
- **운영 효과 0:** 신규 PC A/B 요청·공급자 호출·PC DB/D1 쓰기·Controller 설치·예약·웹 배포·설정 변경 모두 0. 실제 완료는 source/fixture 기반 A2 2단계에 한정.
