# W01 물가지표 — 71개 세부 실행 작업원장 R1 (2026-11-16)

> 사용자 확정 분모: 상위 8개(A1~A4, B1~B4) / 세부 71개. 이 파일은 기존 [26개 원자료 확보·공개 실행계획](INFLATION_26_SOURCE_AND_PUBLICATION_EXECUTION_PLAN_R1_20261110.md)의 **추적용 세분화**다. 산식/승인/수집 주기/DB/TTL/계약을 변경하지 않는다.

## 최신 인계 스냅샷 — W01 2026-11-16 (문서 정합성 정비 후)

> **다음 작업자는 이 스냅샷부터 시작한다.** 진행 기록 파일 자체가 지정된 정본이고, 상위 계획은 [26개 원자료 확보·공개 실행계획](INFLATION_26_SOURCE_AND_PUBLICATION_EXECUTION_PLAN_R1_20261110.md)이다. 과거 이력의 오래된 설치 SHA·대기 문구가 이 스냅샷을 덮어쓰지 않는다.

| 필드 | 현재 유효한 인계 값 |
| --- | --- |
| 담당·저장소·브랜치 | W01 물가지표 / `ansqhd5774-Choi/zgmini` / `fix/economic12-inflation-legacy4-r35-20261021` |
| 작업·기록 정본 | 계획: `docs/INFLATION_26_SOURCE_AND_PUBLICATION_EXECUTION_PLAN_R1_20261110.md`; 기록: **이 파일** `docs/INFLATION_71_STEP_EXECUTION_LEDGER_R1_20261116.md` |
| 전체 목표 | 승인 공식 BLS/Census 원자료 저장·재조회로 26/26 확보 → 기존 저장 기반 계산 → 기존 Writer 게시 → D1/API/PC·모바일 UI 연구지표 7/7 확인. 기존 19개 및 4축 산식·PPI·last-good·운영 설정 보호 |
| 확정 단계 | **8/71 완료(11.3%), 63개 미완료**: A1-01, A1-07, A1-09, B1-01~B1-05만 [x]. 소스 개선 CI는 실제 W01 운영 완료로 가산하지 않음 |
| 마지막 실제 운영 수치 | #1334 당시 **23/26 원자료**, **4/7 연구자료 저장·공개**(당시 관측). 이후 26/26 또는 7/7 달성은 확인되지 않음; 실제 전체 기능 추정 진행 42%는 옛 기준이고 71단계와 별도 |
| 최신 제어 소스 (운영 미반영) | `ansqhd5774-Choi/zgmini-pc-control` [PR #1772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1772), merge SHA `f59e723aa43e59520d760f5da17a07f7f09a04b2`; [source CI #43885847244](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43885847244) 90/90 PASS, C996 #43885847344 PASS. 현재 control main HEAD는 다음 실제 작업 시 재조회 |
| 실제 설치 Controller | #1745 당시 `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7` 파일 전환, 유지보수 결과 `UNKNOWN/BACKLOG_OR_RECOVERY_NOT_VERIFIED`; 이후 최신 코드 설치 검증 없음 |
| 기존 PC 재사용 결과 | [#1747](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1747) core-status PASS / Run 43876398674. [#1748](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1748) Event129 A `STATE_UNKNOWN/INFL_E129_NOT_OBSERVED_WITHIN_LIMIT` / Run 43876539574, reader OK·Event 인식 0·lock same=true·protectedStateUnchanged=true |
| 정확한 미해결 조건 | Event129의 실제 빈 출력·형식 불일치 미구분(새 A 코드 운영 미설치); 기존 #1745 종료 상태 UNKNOWN; 현행 설치→최신 main 차이에 타 담당 파일 포함 가능; 정규 유지보수의 자동 postOperation과 해당 사용자 승인 범위 충돌 해결 필요 |
| 기존 요청 재실행 금지 | #1745 유지보수, #1747 core-status, #1748 Event129 A, 소비된 기존 B Run 43861853573. 원본 Issue/requestId와 JSON/TXT 재사용; 증거 없는 복구·잠금 삭제·수집 B 재실행 금지 |
| 이번 기록 정비의 효과 | **문서·인계 기준만 변경**. 새 PC 명령 0, 새 수집·계산·D1 게시 0, 설치·배포 0, 71개 완료 수 변동 0 |

**다음 필수 실행 하나 — A1/A2 운영 적용 준비:** 정확한 현재 설치 SHA 및 제어 `main`의 변경 파일 목록, #1745 복구·사후검사 결과와 정규 B급 승인 manifest/자동 `postOperation` 범위를 기존 증거에서 대조한다. W01 변경만 승인 범위에 맞게 적용할 수 있는지 판정하며 **다른 담당 파일·기존 원자료는 변경하지 않는다**. 통과 조건은 승인된 정확한 파일·해시·기존 보호 상태를 확인해 정규 적용 경로를 사용할 수 있다는 근거이다. 설치 작업은 실제 승인 범위에 포함될 때만 수행하고, 설치 후 실제 파일·실행 SHA를 재조회해 별도 단계로 기록한다. 이 단계에 한정된 승인 충돌·공유 설치 lease가 실제 막히면 `BLOCKED`로 남기되 독립 저장 기반 검증·소스 작업은 계속한다.

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

현재 71개 세부 체크 완료: **8/71 (11.3%)**. 완료된 항목은 A1 정규 등록·관측 시점의 잠금 비교·결과 회수 3개와 B1 소스 연결 5개. 실제 B Event129 소유권 증명과 수집·저장·게시 종단 완료는 별도 미완료 **63개**. 나머지 기존 HISTORICAL/PARTIAL/SOURCE_ONLY 등 분류는 체크 완료로 계산하지 않는다.

## A1 — 운영 입력·소유권 증명 (9개)

- [x] **A1-01** 현재 PC Controller 설치 SHA 및 허용된 진단 operation 확인 — DONE | 운영 #1747 core-status Run 43876398674와 #1748 W01 A Run 43876539574의 실제 Controller SHA e3a495c97d6b40d6d4eea2ff4f586bef46216eb7 일치; A operation 실제 allowlist dispatch 확인(개별 결과 STATE_UNKNOWN, 설치 terminal PASS와 구분)
- [ ] **A1-02** 실제 Core·Korea Task 등록·상태·실행 파일 확인 — HISTORICAL | 2026-11-13 #1330·#1331 시점 Task Running/Ready 관측, 동시 시점 동일성 미검증
- [ ] **A1-03** Task Engine과 VBS launcher 연결 확인 — HISTORICAL | #1326 고정 action의 중첩 VBS 경로 관측, live lock owner 미증명
- [ ] **A1-04** WMI 프로세스 계보 및 승인 Core script 검증 — PENDING | 새로운 실제 증거 없음
- [ ] **A1-05** Event129의 PID·실행 시각·프로세스 생성 시각 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **A1-06** 공유 local-cycle.lock 실제 소유자 확인 — PENDING | 새로운 실제 증거 없음
- [x] **A1-07** 잠금 전후 해시·관측 경쟁 여부 확인 — DONE | #1748 단회 시점 lock before/after PRESENT, same=true, protectedBefore/After SHA-256 동일 및 protectedStateUnchanged=true; 관측 시점 이후 Core 지속 운전이나 B owner 증명은 미포함
- [ ] **A1-08** 최초 증명 실패 조건 특정 — SOURCE_ONLY | PR #1724·#1752·#1760·#1772 소스 병합, 격리 Windows fixture 90/90 PASS; 기존 운영 #1748 reader OK/XML 0개 원인 미확정, B Run 43861853573 최초 실패 원인 불명
- [x] **A1-09** 원격 진단 JSON/TXT 회수 및 보호 상태 확인 — DONE | #1748 43876539574-1-seat-1 JSON/TXT 2/2 직접 재조회, 상태 STATE_UNKNOWN/INFL_E129_NOT_OBSERVED_WITHIN_LIMIT, operationalWrites/providerCalls/d1Writes=0, protectedStateUnchanged=true

## A2 — 증명된 결함 최소 수정 (8개)

- [ ] **A2-01** A1에서 확보한 최초 실패 코드 분석 — PENDING | 새로운 실제 증거 없음
- [ ] **A2-02** 실제 검증 오류와 조회 시점 한계 구분 — ANALYSIS | A GetInstances gap과 B Event129 미증명은 별개; 동일 원인 미입증
- [ ] **A2-03** 잘못된 검증 조건이 입증된 경우 해당 조건만 최소 수정 — PENDING | 새로운 실제 증거 없음
- [ ] **A2-04** 기존 안전거부·허용 오차·잠금 보호 유지 — SOURCE_ONLY | 기존 B 증명 안전 조건 변경 금지; A fixture 별도 판정
- [ ] **A2-05** 관련 코드 회귀검사 — SOURCE_ONLY | PR #1772 Windows source CI #43885847244 90/90 PASS, 원문 비노출 및 B 안전 증명 로직 불변; 운영 B 검사 미실행
- [ ] **A2-06** Windows 동일 경로 검증 — PENDING | 새로운 실제 증거 없음
- [ ] **A2-07** 수정 파일·source SHA 확정 — PENDING | 새로운 실제 증거 없음
- [ ] **A2-08** 필요한 정규 운영 적용 및 적용 파일 재조회 — PENDING | 새로운 실제 증거 없음

## A3 — 공식 BLS·Census 수동 단회 수집 (12개)

- [ ] **A3-01** 승인된 최신 운영 source·manifest 확인 — PARTIAL | W01 V2 APPROVED_B 단회 manifest 소스 존재·조회 완료. 소비된 B Run 43861853573의 Event129 증명 중단을 재실행하지 않음; 향후 source pin·실제 효과 추가 확인 필요
- [ ] **A3-02** 기존 Writer·Core 공유 자원 경합 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-03** 새 고유 Issue/requestId 등록 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-04** 승인된 공식 수동 B 정확히 1회 실행 — PENDING | 새로운 실제 증거 없음
- [ ] **A3-05** B 내부 Core 소유권 검증 — PENDING | 새로운 실제 증거 없음
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
- [ ] **B1-06** 기존 19개·4축 점수 불변 검사 — HISTORICAL_SOURCE | 기존 19행·4축 비변경 원칙; 현재 배포까지 새 검증 아님
- [ ] **B1-07** GitHub 개발 source와 실제 배포 source 구분 — PARTIAL | 개발 main과 당시 Production 응답 구분, exact Deployment SHA 미조회

## B2 — 유효 원자료 우선 부분 게시 (8개)

- [ ] **B2-01** 저장된 7개 입력 상태 조회 — HISTORICAL | 2026-11-13 PC #1334 유효 4/7 저장 확인
- [ ] **B2-02** 유효 4개 READY/STALE 판정 — HISTORICAL | 2026-11-10 공개 API READY 4행
- [ ] **B2-03** 누락 3개 PENDING/last-good STALE 판정 — HISTORICAL | 2026-11-10 PENDING 3행, zero 대체 없음
- [ ] **B2-04** score:null 연구자료 projection 생성 — HISTORICAL_SOURCE | score:null projection 정본
- [ ] **B2-05** 기존 Writer를 통한 D1 부분 게시 — HISTORICAL_OUTPUT | 2026-11-10 4/7 Production 공개 관측, Writer ledger 직접 검증 미완료
- [ ] **B2-06** D1 key·값·시각·원본 버전 직접 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **B2-07** Production API 7행 결과 대조 — HISTORICAL_OUTPUT | 원본 계획 §6 API 7행 출력, 최신 재조회 아님
- [ ] **B2-08** 홈페이지 4/7 부분 공개 확인 — HISTORICAL_OUTPUT | 원본 계획 §6 데스크톱 4/7 표, 모바일 미확인

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
