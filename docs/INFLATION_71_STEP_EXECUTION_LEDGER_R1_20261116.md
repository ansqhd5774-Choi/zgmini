# W01 물가지표 — 71개 세부 실행 작업원장 R1 (2026-11-16)

> 사용자 확정 분모: 상위 8개(A1~A4, B1~B4) / 세부 71개. 이 파일은 기존 [26개 원자료 확보·공개 실행계획](INFLATION_26_SOURCE_AND_PUBLICATION_EXECUTION_PLAN_R1_20261110.md)의 **추적용 세분화**다. 산식/승인/수집 주기/DB/TTL/계약을 변경하지 않는다.

## 정본, 상태 구분 및 현재 결론

- 제어 저장소: `ansqhd5774-Choi/zgmini-pc-control`; W01 신규 A operation `inflation-event129-evidence-readonly` 소스 PR #1724 병합(Controller 실PC 미설치).
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

현재 상태 분류 현황(작업 완료 집계가 아님): PARTIAL 8, HISTORICAL 5, PENDING 42, SOURCE_ONLY 3, ANALYSIS 1, CURRENT_SOURCE_VERIFIED 5, HISTORICAL_SOURCE 2, HISTORICAL_OUTPUT 5.

## A1 — 운영 입력·소유권 증명 (9개)

- [ ] **A1-01** 현재 PC Controller 설치 SHA 및 허용된 진단 operation 확인 — PARTIAL | #1501 종료 시 Controller b2ff49dd… 실측, 신규 진단 operation 운영 설치는 미검증
- [ ] **A1-02** 실제 Core·Korea Task 등록·상태·실행 파일 확인 — HISTORICAL | 2026-11-13 #1330·#1331 시점 Task Running/Ready 관측, 동시 시점 동일성 미검증
- [ ] **A1-03** Task Engine과 VBS launcher 연결 확인 — HISTORICAL | #1326 고정 action의 중첩 VBS 경로 관측, live lock owner 미증명
- [ ] **A1-04** WMI 프로세스 계보 및 승인 Core script 검증 — PENDING | 새로운 실제 증거 없음
- [ ] **A1-05** Event129의 PID·실행 시각·프로세스 생성 시각 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **A1-06** 공유 local-cycle.lock 실제 소유자 확인 — PENDING | 새로운 실제 증거 없음
- [ ] **A1-07** 잠금 전후 해시·관측 경쟁 여부 확인 — PARTIAL | #1693 protectedStateUnchanged만 확인, 잠금 직접 전후 소유자 증명 미완료
- [ ] **A1-08** 최초 증명 실패 조건 특정 — SOURCE_ONLY | PR #1724 및 PR #1752 병합, source fixture 72/72 PASS; B 실제 최초 실패 불명
- [ ] **A1-09** 원격 진단 JSON/TXT 회수 및 보호 상태 확인 — PENDING | 새로운 실제 증거 없음

## A2 — 증명된 결함 최소 수정 (8개)

- [ ] **A2-01** A1에서 확보한 최초 실패 코드 분석 — PENDING | 새로운 실제 증거 없음
- [ ] **A2-02** 실제 검증 오류와 조회 시점 한계 구분 — ANALYSIS | A GetInstances gap과 B Event129 미증명은 별개; 동일 원인 미입증
- [ ] **A2-03** 잘못된 검증 조건이 입증된 경우 해당 조건만 최소 수정 — PENDING | 새로운 실제 증거 없음
- [ ] **A2-04** 기존 안전거부·허용 오차·잠금 보호 유지 — SOURCE_ONLY | 기존 B 증명 안전 조건 변경 금지; A fixture 별도 판정
- [ ] **A2-05** 관련 코드 회귀검사 — SOURCE_ONLY | PR #1724 fixture 67/67 및 PR #1752 fixture 72/72, 변경된 소스 단계에서 PASS; B 운영 경로 검증 미실행
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

- [ ] **B1-01** 현재 zgmini/main 기준 source 확인 — CURRENT_SOURCE_VERIFIED | zgmini/main 71ea0b66f67e1b099415ebd814be4b67730af08b 기준 관련 파일 조회
- [ ] **B1-02** run-local.mjs의 신규 7행 계산·게시 연결 확인 — CURRENT_SOURCE_VERIFIED | run-local.mjs:310~311 publishInflationCandidates7Auto() 연결 확인
- [ ] **B1-03** 기존 공통 Writer 연결 확인 — CURRENT_SOURCE_VERIFIED | auto-publication-r1.mjs:82~142 저장 preview→기존 Writer→readback 연결
- [ ] **B1-04** candidate-r52.ts API 라우트 확인 — CURRENT_SOURCE_VERIFIED | candidate-r52.ts:11,34 D1 공개 reader route 연결 확인
- [ ] **B1-05** 물가지표 상세 UI 컴포넌트 연결 확인 — CURRENT_SOURCE_VERIFIED | economic-detail-panel.tsx:286에서 inflation-candidate-7-inputs.tsx:40 호출 확인
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
