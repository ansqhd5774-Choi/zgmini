# ZGMINI 물가지표 — 26개 원자료 확보·공개 완료 실행계획 R1

- 작성: 2026-11-10 KST
- 작업 브랜치: `fix/economic12-inflation-legacy4-r35-20261021` (`ansqhd5774-Choi/zgmini`)
- 개발 정본: `zgmini` 최신 `main` (계획 작성 시 확인 SHA `643b7c7c4372ffad552443fc312c6cb1b944e2fc`)
- 운영 절차 정본: 비공개 `zgmini-pc-control` 최신 `main`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`, 공용 인계·자원 수명주기 계약
- 근거: 기존 [미등록 11개 검토](INFLATION_MISSING11_REGISTRATION_REVIEW_R2_20261108.md), 제어 PR #1205/#1211/#1212, 소비된 B #1177, 기존 PC A #830, 사용자 제공 물가지표 최종 인계
- **시작/계획 반영 종료 전체 기능 진행률: 42% → 42%.** 문서·소스 검증을 실제 수집·게시로 산입하지 않는다.


## 0. 2026-11-13 현행 작업 재개 기준 — #996 전역 차단 정정

> **진행률은 실제 물가지표 작업 42%, 원자료 23/26·공개 4/7로 유지한다.** 아래 §7·§8의 2026-11-10 당시 `#996 복구 완료 전 모든 물가지표 A/B 신규 작업 금지` 표기는 **현행 범위에 적용하지 않는 과거 대기 판정**이다. 2026-11-12 운영 PC 실제 R10 Writer B 설치·A readback 성공, 설치 Controller의 4개 기존 기능 A allowlist, 최신 제어 `main`/프로젝트 R6.0의 위험도별 구분에 따라 수정한다. 단, #996의 C급 유지보수 원본 잠금·공유 Controller 설치에 대한 NO-GO는 **그 자원만** 유효하며 허가 없는 우회·직접 수정은 금지한다.

**원담당이 즉시 실행할 다음 기능 단계 (승인 범위):**
1. 완료된 4/7 공개를 다시 게시하지 않고, **공식 BLS 2개 + Census 1개** 수집에 필요한 PC Task→VBS→Node→공유 `local-cycle.lock`의 *실제 소유·canonical 경로*만 원본 결과에서 정밀 확인한다. 소비된 [B #1177 / Run 42714127327](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1177)은 `INFL_MANUAL_B_CORE_OWNER_NOT_OBSERVED_STOP`, 공식 GET 0·원자료 쓰기 0. 동일 requestId 재실행은 금지.
2. **독립 A 수행과 신규 A 미설치를 구분:** 현재 마지막으로 검증된 운영 설치 Controller `badad9124157879d7a645b64f2768113d632355b`에는 `core-runtime-source-readonly`, `inflation-candidates-runtime-readonly`가 기존 A로 등록되어 있으나, 210초 연속 `inflation-core-lock-observation-readonly`는 최신 control `main`에만 있고 운영에는 **미등록**. 이 미설치 operation만 `AUTOMATION_BLOCKED`. 과거 Core 단발 A Issue 9건 중 **7건은 원본 bot 영수증이 있었으며, 그 7건 모두 `CORE_NO_ACTIVE_TASK_ENGINE`**이었다. 나머지 #1213/#1219는 bot 결과 영수증이 없어 실행 결과 미확인이다. 같은 순간 A 반복은 소유권 증거를 보장하지 않는다. 새 운영 A 등록은 해당 Controller 설치의 정규 Owner·기존 승인/lease·#996 C 범위와 실제 충돌 여부를 **그 설치 효과에만** 적용한다.
3. **정적 수집 경로 대조 완료:** `zgmini/main`의 `scripts/pc-writer/install-local.mjs`는 Core **5분 간격**, Korea **1시간 간격**, 모두 `local-cycle.mjs --publish`(Korea는 `--korea` 추가)로 launcher를 생성한다. `core-runtime-source-wmi.mjs`의 `--publish` allowlist 자체는 이 설치기 계약과 일치하므로 **그 인자를 근거 없이 삭제·완화하지 않는다**. 실제 Windows Task·launcher가 현행 파일과 다를 가능성은 실제 원본 readback으로만 판정. `local-cycle.mjs`는 Core/Korea 공유 `local-cycle.lock`을 사용하지만 Korea가 #1177 실패 원인이었다는 증거는 없음.
4. **공식 자료 확인은 PC 수집이 아님:** [BLS 공식 `cu.data.12.USHousing`](https://download.bls.gov/pub/time.series/cu/cu.data.12.USHousing)은 최신 파일이 약 2.7MB로 승인 8MB 한도 내이고 두 CPI 시계열이 존재. [Census 공식 M3 Total Inventories](https://www.census.gov/manufacturing/m3/historical/timeseries.html)의 링크는 승인된 `naicsinvp.xlsx` 경로와 일치한다. XLSX 내부 시트 `m3-outp-invp`/선택행 `AMTMTI`는 웹 검사로 **미검증**; 실제 승인 PC의 고정 파서가 다운로드 후 검증해야 한다. 파일이 보인다는 이유로 `26/26` 저장 완료를 주장하지 않는다.
5. **안전한 다음 실제 쓰기:** Task/Core 소유권의 인증된 증거·정확한 source/preimage/manifest·기존 Writer/Core 독점 잠금 조건이 모두 통과한 경우에만 기존 승인 범위의 **새 고유 단회 B**로 실제 GET→파싱→기존 PPI 원자료 보존·2개 JSON 저장/원격 결과쌍 재조회→저장 자료 기반 계산→D1/API/UI 7/7을 진행한다. 09:00 실행 시각·새 자동 예약·인위적 B 실패·#996 복구 완료를 별도 선행 Gate로 만들지 않는다. 소유권 증거가 없으면 *그 B 실행만* `BLOCKED`, 독립 공개 브라우저/연결 검증 및 기존 다른 기능 작업은 계속한다.

**원본 진단·정규 인계:** [#1177의 2026-11-13 후속 조사](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1177#issuecomment-6830069503), [공통 #68 원담당 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6829732572). 이 문서의 source-only 수정은 실제 원담당 일반챗 수신, Controller 설치, PC 수집·게시, C급 복구의 성공 증거가 아니다.

### 0.1 2026-11-13 02:07 KST 실제 PC A 조회 — 소유권 인증과 B 승인 원본 구분

**신규 실PC 완료 근거:** 제어 [#1325](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1325) / [Run #43266064260](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43266064260), 기존 설치 A `core-status` 단회 실행 `PASS/CORE_READONLY_DIAGNOSIS`. 고유 requestId `pc-inflation-core-status-nov13-coord-01`, 실PC Controller `badad9124157879d7a645b64f2768113d632355b`, 원격 [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43266064260-1-seat-5.json) + [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43266064260-1-seat-5.txt) **2/2 독립 재조회·동일 필드 일치**. `operationalWrites=0`, `providerCalls=0`, `d1Writes=0`, 보호 전후 SHA 동일. 2026-11-13 02:07 KST 관측에 `lockPresent=true`, Core cycle 02:02 KST `COMPLETE`, collection 02:07 `COMPLETE`, Writer 01:59 `VERIFIED`. 정규 Core/수집/Writer 최근 처리가 존재하므로 전체 운영 정지·#996 전역 차단 주장은 오판. **`core-status`는 lock.pid/Task EnginePID/실제 VBS 프로세스 조상을 증명하지 않는다**. `lockPresent=true`는 곧바로 소유권 PASS나 stale lock 삭제 허용이 아님.

**추가로 확인한 실질적 B 선행 불일치:** 기존 [승인 manifest](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/inflation-manual-b/official-static-two-source-20261110.json)는 `sourceSha=48d3478030590ca63aaab2435e88c896608c70d3`·`runCount=1`로 고정되어 있으나, 이번 운영 PC `core-status`가 보고한 `pcOperationalApprovedSha=05d7ae49e0a84cbeebd90ef4de6dd7284094bf97`. 동일 source SHA가 아니므로 기존 manifest와 이전 B #1177 requestId를 **새 요청에 그대로 재사용 금지**. 기존 B의 `verifyManualPreimage`는 `sourceHead===manifest.sourceSha`와 `configSource===manifest.sourceSha` 및 4개 코드 파일 SHA를 검사한다. 또한 이번 `core-status`는 PC `config.source`의 승인 SHA만 보고하므로 **PC 실제 Git HEAD·4개 설치 파일 바이트는 아직 미검증**. 이 값을 그대로 신규 manifest의 sourceSha로 채워 바로 B를 승인했다고 주장하지 않는다.

**2026-11-13 02:10 KST 실제 PC source 확인 추가:** [#1326](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1326)/[Run #43266592109](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43266592109) 기존 승인 A `pc-source-preflight` **PASS/PC_SOURCE_READONLY_DIAGNOSIS**, [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43266592109-1-seat-3.json)·[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43266592109-1-seat-3.txt) 결과쌍 직접 검증, 운영/공급자/D1 쓰기 0·보호 해시 동일. **역사적 checkout `projects/zgmini-earnings-history-pc-release`의 `git HEAD=05d7ae49e0a84cbeebd90ef4de6dd7284094bf97`, trackedDirty=false, configApprovedSha·최근 `local-writer-last-run` source 일치**, Writer/Module 파일 목록은 원격 `SUMMARY_ONLY`라 개별 4파일 SHA까지 인증되지는 않음. 실제 Core Task action은 `wscript.exe → archive-sidecar-r7/run-original-then-archive.vbs → .../run-local-core.vbs` 등 **복수 중첩 런처**이고 `sourceResolved=false`, `runtimeSourceVerified=false`. 따라서 checkout/Writer 일치는 입증되었으나 **실행 중 Node의 Task EnginePID 계보/잠금 owner 실증은 여전히 미완료**. 현재 수집·Writer가 살아 있다는 #1325 근거와 이 런처 조건은 구분하며 중첩 VBS를 임의 수정·삭제·재등록하거나 Core lock을 해제하지 않는다.

**다음 필수 실행 하나:** 독립 원담당은 이미 설치된 승인 A의 사전검증 범위 및 기존 Writer B 보호 원본을 재사용해 PC **source HEAD/config.source/4개 pin 파일 SHA/실제 Task→Node→lock owner**의 정합성을 정확히 확보한다. 필요한 A 진단이 현재 Controller 미등록이면 그 설치만 별도 Owner·기존 승인 경로로 검토하고 원자료 수집 외 독립 개발·검증은 지속. 모든 증거가 맞을 때만 새 명시 승인 manifest·고유 단회 B 수집으로 23/26→26/26을 목표로 진행한다. **새 B·Core lock 수정·Controller 설치는 이번 A 조회에서 수행하지 않았다**. 전체 물가 완료율 42%, 유효 저장 23/26, 공개 4/7 유지.

### 0.2 2026-11-13 02:16 KST 승인 manifest의 4개 파일 실PC 바이트 일치 검증

**새로 완료한 기능 준비 검증 (원자료 수집/게시 아님):** 기존 설치 Controller `badad9124157879d7a645b64f2768113d632355b`의 A/light `writer-install-preimage-readonly`와 **이미 승인된** 3파일 [`inflation-manual-official-r1.json`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/writer-preimage/inflation-manual-official-r1.json), 2파일 [`inflation-core-hook-2-20261109.json`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/writer-preimage/inflation-core-hook-2-20261109.json) scope를 재사용. 새 승인 manifest/Controller 설치/운영 파일 쓰기 없이 **서로 독립된 PC seat 2/4에서 2건 실행**:
- [#1327](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1327) / [Run 43267687874](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43267687874): `PASS/WRITER_APPROVED_PREIMAGE_READONLY`, 공식 파서 3파일 PRESENT/해시 실측
- [#1328](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1328) / [Run 43267690493](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43267690493): 동일 PASS, `local-cycle.mjs`과 Core-bridge 2파일 PRESENT/해시 실측
- 두 Run 모두 JSON/TXT 원격 재조회 2/2, `operationalWrites=0`, `providerCalls=0`, `d1Writes=0`, `protectedStateUnchanged=true`, `sourceIdentityConsistent=true`, checkout Git HEAD=config 승인 SHA=Writer checkpoint SHA `05d7ae49e0a84cbeebd90ef4de6dd7284094bf97`.
- [현재 고정 공식 수동 B 승인 manifest](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/inflation-manual-b/official-static-two-source-20261110.json)에 지정된 **4개 파일 SHA-256을 실PC 관측과 전수 비교 4/4 일치**:

| 고정 source 파일 | 실PC SHA-256 | 기존 B 승인 SHA와 일치 |
|---|---|---|
| `scripts/pc-writer/inflation-causal-candidate-manual-official-r1.mjs` | `53c01bbc129e1c4c5ff129d37fae8e0ff801c30bfe50a6ad0ab1227d394a5ed6` | YES |
| `scripts/pc-writer/inflation-causal-candidate-manual-official-store-r1.mjs` | `3ef346bd5e240cdcdbd741a0f62b665bba42bf33556e37a6efa359f07de834ec` | YES |
| `lib/diagnostic-layer/xlsx-lite.mjs` | `44d4c230a0620faea0d8bb2575e6f13c9ab7cfb5700aa11d752017db747f619a` | YES |
| `scripts/pc-writer/local-cycle.mjs` | `2e6200e5637fb99f339fdc74a64592f34c1272423a39366b8559c16ea1b13b5d` | YES |

**새로 해제한 불명확성:** “4개 파일 설치 해시를 원격에서 알 수 없음”은 **해결(4/4)**. 남은 실제 B 필수조건은 **① Core Task→Node→동일 E: 잠금 소유권의 실증** (`coreTaskSourceLinked=false`는 정적 source-only 상태, 실제 B preflight 과거 #1177도 미관측) 및 **② 새 PC Git HEAD `05d7ae49...`에 맞는 원래 승인 효과 범위 내의 신규 source-pinned B manifest/1회 승인**. 기존 manifest `sourceSha=48d347...`는 파일 4개가 같아도 **전체 source HEAD 해시가 달라 동일 파일이라는 이유로 무조건 재사용할 수 없음**. 그 이후에만 기존 고정 공식 BLS/Census 2 GET→3 저장→26/26→게시 검증으로 이동한다. 임의 Core Task/launcher 교체·잠금 삭제·기존 #1177 재실행 금지. 물가지표 전체 42%, PC 원자료 23/26, 공개 4/7 유지.

### 0.3 2026-11-13 02:30~02:38 KST — 동시성 증거로 Core 조회 시점 한계 분리

**실제 운영 PC 추가 읽기 전용 실행 (각 고유 Issue, 반복 재실행 없음):**

1. [#1329](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1329) / [Run 43270223267](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43270223267): 기존 설치 A `core-runtime-source-readonly`, 관측 2026-11-13 02:31 KST, `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE`, 보호 상태 불변·운영 쓰기 0, 결과 JSON/TXT 2/2 일치. **단발 시점 무관측**, Core 장애·잠금 owner 부재 확정 아님.
2. [#1330](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1330) / [Run 43271171353](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43271171353): **기존 독립** `pc-process-inventory-readonly`(Controller 설치 불필요), 2026-11-13 02:37 KST 운영 `PC`/Runner `zgmini-pc-01`에서 `ZGMINI-PC-Local-Core=Running`, `Korea=Ready`, `wscript.exe` 중첩→`node.exe`로 이어지는 일부 부모-자식 계보 관측. 선택 프로세스 55/55(목록 미절단). 민감한 command line·환경변수 미출력. **각 Node의 Core source/Task EnginePID/lock.pid 소유권은 이 고정 inventory가 반환하지 않아 미증명**. 과거 동일 workflow #1258에도 Running과 중첩 VBS/Node가 함께 관측된 이력 재사용.
3. [#1331](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1331) / [Run 43271527104](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43271527104): #1330 현장 Running 관측 **약 63초 뒤인 02:38 KST** 기존 A 단발 조회 실행, 다시 `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE`, 결과 JSON/TXT 2/2 직접 대조 PASS·보호 상태 불변·쓰기는 0. 이 63초의 시점 차이 때문에 “Task가 Running이어도 GetInstances가 반드시 0” 또는 “Node가 Task와 분리됨”이라고 단정하면 안 됨. 소유권 검증 실패의 FIRST FAIL은 `Task Engine anchor 미관측`이며, 정확한 VBS control flow/lock owner 진단이 이어져야 함.

**정확한 설치 영향과 대체 경로:** 기존 PC Controller `badad9124157879d7a645b64f2768113d632355b`→ 제어 `main` `850abbb2cd82886e535053cc38a6616d0440988d`의 GitHub compare는 **669커밋 차이**, API 변경 파일 배열은 최대 300개만 반환(전체 변경 목록이 아님). 신규 `inflation-core-lock-observation-readonly`는 2026-11-10 commit `b47f03b8...` 도입 후 `37b2c552...`에서 기존 A/heavy 240초·1536MiB 공통 프로필에 맞춤. **이 observer는 현재 PC에 미설치이며 관측 결과 자체도 `authorizesB:false`**. 최신 전체 main을 조용히 설치하거나 해당 module만 임의 Workflow/CMD로 우회하지 말 것. 필요한 것은 기존 공용 Controller 정규 업데이트 Owner·정확한 통합 diff/manifest·원본 보호/lease 확인뿐이며, #996 C NO-GO는 실제 공유 설치 충돌 영역에만 적용.

**원담당 다음 실제 행동 하나:** Task Engine과 VBS/Node/lock.pid의 **동일 시각 인증 연속 관측**을 기존 승인된 방법으로 확보한다. 단발 A 재시도·일반 프로세스 inventory 반복을 중단한다. 승인된 A/heavy 운영 설치를 계획한다면 전체 669커밋을 승인 없이 통합하지 말고 현재 설치 SHA→정확한 승인된 목표의 필요 파일·보호 원장/PR 계보·유지보수기 계약을 먼저 대조한다. 이후에만 현재 PC source `05d7ae49...`의 승인 manifest와 기존 범위·lease를 보존하는 새 1회 B를 적용한다. 원자료 23/26·공개 4/7·전체 42% 불변.

### 0.4 2026-11-13 승인 B가 자체 수행하는 Core 소유권 12분 관측 — 설치 선행 Gate 정정

**새로 확인한 운영 경로·소스 계약 (원본 [제어 main `inflation-manual-b/windows-adapter.mjs`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/inflation-manual-b/windows-adapter.mjs), [고정 Workflow](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/.github/workflows/pc-inflation-official-manual-b-once.yml), [승인 계약](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/inflation-manual-b/contract.mjs)):**
- 단회 B의 `observeLiveCoreLockOwner`는 이미 `12*60_000`ms 자연 Task 관측→Task 관련 Core 프로세스→`E:\\ZGmini\\data\\pc-writer\\local-cycle.lock`의 `pid/at`→고정 WMI `core-lock-owner-probe.js` Task 계보→읽기 전후 lock 바이트 동일성을 **실제 B 내부에서 fail-closed 검증**한다. 5분 Core 예약/중첩 VBS 조상 확인이 A의 단발 실패와 달리 같은 B 실행 안에서 이뤄진다. 검사 완료 후에도 승인된 기존 Writer/Core lock, 자연 idle, 저장 원본 보존 조건은 유지된다.
- 2026-11-10 추가된 **A/heavy 210초 observer의 Controller 설치는 이 공식 B 자체 검사의 실행 계약상 전제 조건이 아니다.** Observer는 별도 원인 진단 보조이며 `authorizesB:false`. #996 C 복구가 공유 Controller 설치를 잠가도 이 사실만으로 독립된 Writer B를 자동 차단하거나 Controller를 먼저 교체할 이유는 없다. 다만 실제 Writer source/lock/lease가 서로 겹칠 경우 해당 **실행 효과만** 보호한다.
- 공식 B Workflow는 기본 `ZGMINI_INFLATION_MANUAL_B_ENABLED == 'true'` opt-in이며, **reviewed B manifest/operator approval**을 요구한다. **2026-11-13 03:23 KST 격리 CI [Run #43279174086](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43279174086)의 실제 출력 `INFLATION_B_REPO_VARIABLE_ENABLED=false` 검증**: 해당 `vars` 비교가 false이므로 현 상태의 B Job은 **조건 불충족으로 건너뜀**. 변수 자체가 미설정인지 다른 문자열인지까지는 확인되지 않았다. 관련 [임시 읽기 전용 Draft #1335](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1335)는 격리 테스트 74/74 PASS 후 **미병합 폐쇄**; 운영 PC·GitHub 변수·승인 원본은 변경하지 않음. 현재 `APPROVED_B` source SHA도 과거 `48d347...`으로 고정되어 있으므로, 새 고유 B 요청을 발행하지 말고 두 조건을 실제 승인 경로로 함께 해소한다.
- [#1327/#1328](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1327)로 실PC 4개 source 파일 SHA 4/4가 과거 승인 B와 같고, [#1326](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1326) PC source checkout/config/Writer checkpoint `05d7ae49e0a84cbeebd90ef4de6dd7284094bf97` 정합성 확인. 단, 기존 공식 B 승인 `sourceSha=48d3478030590ca63aaab2435e88c896608c70d3` 불일치, 현 PC source SHA의 GitHub 원격 `zgmini` commit 조회 불가(로컬 운영 checkout origin은 미검증). 이것이 새 B **승인 재검토 대상**이다. 기존 #1177 requestId·승인 manifest 원본을 직접 재사용·overwrite하지 않는다.
- 이미 생성된 [SOURCE_ONLY 비승인 검토본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/codex/controller-ops-lessons-20261105/docs/proposals/inflation-official-manual-b-pc-05d7-review-20261113.json)은 `DRAFT_NOT_APPROVED` 상태/비실행 경로를 보존. 대상 URL·파일·파일해시·효과 범위 그대로의 새로운 승인 후보를 원담당이 기존 기준과 대조하고, **정확한 승인/Workflow opt-in/Writer lock 비경합이 검증될 때만 새 고유 Issue 단회 B 실행** → 실제 GET/로컬 저장/계산/공개 조회. 추가 진단기 설치·미완료 C 복구·정규 예약 검증을 B 전역 선행 Gate로 만들지 않는다.
- 원본 [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)은 2026-11-13 현재 C NO-GO 보호. 2026-11-10 [#68 운영 읽기 증거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6756862819)의 Controller `badad912...`, 유지보수기 `16064e29...`, install lease `held=true/RECOVERY_REQUIRED`는 역사적 범위에서만 재사용하며 현재 lease 해제 추정 금지. [공통 소스 PR #1333](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1333) main 병합 및 CI 74/74 PASS가 실Windows 유지보수기 교체/Controller 등록을 의미하지 않음.

**원담당의 단일 우선 실행:** **현재 B Job opt-in 조건 `false`가 실증됐으므로 신규 B Issue 생성 금지.** 먼저 운영 PC source `05d7ae49...`에 맞는 기존 동일효과·4파일 해시 고정의 **새 명시 승인 manifest**를 원담당·승인 Owner가 검토하고, 해당 source/provenance·Writer lock 경합을 확인한다. 승인 확인 후에만 정규 GitHub 권한자로 `ZGMINI_INFLATION_MANUAL_B_ENABLED == 'true'` opt-in을 허용할 수 있다. 그때 새 고유 B 1건에서 내장 12분 Task→Core Node→E: lock 소유권 확인과 공식 자료 수집/저장을 함께 실행한다. 임의 변수 토글·A 반복·#996 C 우회·과거 #1177 재발행 금지. 물가지표 42%, 23/26·4/7 유지.

### 0.5 2026-11-13 03:11 KST 물가 후보 7종 실PC 원자료 재조회 — CPI INVALID/Census MISSING

- **운영 PC A #1334 / Run #43277201713:** 고유 `pc-inflation-7-saved-readback-20261113-01`, 설치 Controller `badad912...`의 기존 `inflation-candidates-runtime-readonly` 실행 `PASS/INFLATION_CANDIDATES_RUNTIME_READONLY_EVIDENCE`. [Issue #1334](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1334), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43277201713-1-seat-2.json)·[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43277201713-1-seat-2.txt) 원격 2/2 독립 재조회·공통 필드 일치; `operationalWrites=providerCalls=d1Writes=0`, `protectedStateUnchanged=true`.
- **실제로 남은 3개:** CPI #22 `CUSR0000SEHA`, #23 `CUSR0000SEHC01`은 BLS 저장 파일 **PRESENT이지만 각 시계열 `INVALID`**. BLS 동일 파일의 기존 PPI #24 `WPSFD4`는 **PRESENT_VALID·203개월**이므로 전체 BLS 파일을 없애거나 CPI-only 덮어쓰기 금지. Census #28 `AMTMTI`는 파일 **MISSING**. 나머지 Fed #29 657건·Treasury #16 139건·EIA #2 520건은 PRESENT_VALID. 7개 중 4개 유효.
- **과거 진단 에러(현재 원인 단정 금지):** `cpi` checkpoint `BLS_CANDIDATE_VALUE_OR_DUPLICATE`, `census` checkpoint `CENSUS_M3_HEADERS_INVALID`, 마지막 시도 2026-11-08T22:45:02.525Z. 해당 코드는 기존 API collector가 실패한 원본 이력이며, 현재 독립 정적 BLS 파일·Census XLSX도 동일한 오류를 낸다는 뜻이 아님.
- **기존 수집기 계약 재검토:** `zgmini/main/scripts/pc-writer/inflation-causal-candidate-manual-official-r1.mjs`의 `planOfficialManualCandidateDocuments`는 invalid CPI 시리즈를 공식자료로 수리하고 유효한 PPI 이력·정정되지 않은 값은 보존; `...store-r1.mjs`는 기존 PPI preimage 필수, 쓰기 전 공식 BLS/Census 파싱, 원본 별도 아카이브·백업·readback을 요구. [기존 파서 테스트](https://github.com/ansqhd5774-Choi/zgmini/blob/main/scripts/pc-writer/inflation-causal-candidate-manual-official-r1.test.mjs) 및 [저장 테스트](https://github.com/ansqhd5774-Choi/zgmini/blob/main/scripts/pc-writer/inflation-causal-candidate-manual-official-store-r1.test.mjs)에는 corrupted CPI 복구·PPI 보존·Census XLSX fixture 검증이 존재. **이번에는 테스트를 재실행하거나 현재 Census 원본 XLSX를 실제 파싱하지 않았음**. static 원본의 현재 workbook 시트/행 구조는 승인 B의 preflight로 검증해야 하며 실패하면 신규 write 전 안전 중단.
- **원담당 다음 필수 실행(변경 없음):** 현 PC `05d7ae49...`에 대한 새 source-pinned **명시 승인** 및 Workflow opt-in 상태·Writer lane 충돌 여부를 먼저 확인하고, GO일 때만 한 번의 고유 B에서 Task-linked Core owner→정적 공급자 GET 2개→파싱·원본 보존·저장 재조회를 실행. #1177 고유 ID 재사용·미승인 manifest의 `APPROVED_B` 임의 승격·추가 Controller 설치·잠금 삭제 불가. 이번 A로 실제 원자료 분모 **23/26**, 신규 유효값 **4/7**, 전체 물가지표 진행률 **42% 유지** 확인.

### 0.6 2026-11-13 신규 B source-pin 승인 검토 PR — 승인·활성화·PC 실행 분리

**실행·계약 범위 검증 완료 (운영 효과 0):** 제어 저장소 [Draft PR #1336](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1336)에서 현재 PC source pin만 다시 묶은 `approvals/inflation-manual-b/official-static-two-source-pc-05d7-20261113.json`을 제안. 기존 승인 [PR #1131](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1131)의 원본 manifest를 보존하고 **정확히 두 필드**(`status: APPROVED_B→DRAFT_NOT_APPROVED`, `sourceSha: 48d3478030590ca63aaab2435e88c896608c70d3→05d7ae49e0a84cbeebd90ef4de6dd7284094bf97`)만 다름. 기존 PC A #1326 checkout HEAD/config/Writer 일치, #1327/#1328 승인 파일 해시 실PC 4/4 일치를 **원격 JSON 바이트 재조회로 확인**. URL 2개·기존 JSON 2대상·Core lease/단회 runCount·DB/D1/Task/source 쓰기 금지·크기 제한 전부 동일. 제어 `inflation-manual-b/contract.mjs`는 `status=APPROVED_B`만 수락하므로 제안 **비실행**. 이는 테스트를 정식 Windows B로 실행한 결과가 아니라 기존 결과 기반의 계약 대조임.

**Workflow 실측 분리:** [격리 CI #43279174086](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43279174086)는 현 시점 `INFLATION_B_REPO_VARIABLE_ENABLED=false`를 기록, 실PC Writer/DB/Controller 파일 변경 없음. 신규 승인 파일 작성/PR 병합만으로 Workflow가 자동 활성화되지 않는다.

**다음 필수 승인·실행:** 원담당/정규 승인 Owner가 #1336의 현재 source provenance·기존 동일효과 범위를 검토해 `DRAFT_NOT_APPROVED→APPROVED_B`와 승인 원본 Git blob·SHA256을 확정할 수 있을 때에만 명시 승인·병합을 진행한다. 이후 정규 GitHub 권한으로 정확한 일회성 B Workflow opt-in을 승인·활성화하고 **새 고유 B Issue 단 1회**로 B 내부 12분 Core Task-linked lock proof→공식 BLS/Census GET 2건→CPI repair/PPI 보존·Census XLSX 파싱→로컬 write/readback 수행. DB/D1 게시·계산은 저장 증거 후 기존 공개 파이프라인에서 별도 검증. 아직 진행률 **42%·원자료 23/26·공개 4/7 불변**.

## 1. 목표·분모·현재 상태

원본 후보 31개 = 기존 연구자료 19개 + 신규 수집 대상 7개 + 정의/권리 보류 3개(#15·#17·#30) + #26과 통합 1개(#27) + 제외 1개(#20). **기능의 현재 수집 목표는 중복 없는 26개(19+7)**이며, 보류 3개를 무단 추가하거나 26개 확보의 선행조건으로 삼지 않는다.

| 증거 단위 | 현재 실증 | 최종 목표/해석 |
| --- | ---: | --- |
| 원본 31개 판정 | 31/31 | 확정·보류·제외 구분 유지 |
| 신규 7개 PC source 설치·활성화 | 과거 7/7 | 현행 파일·승인 SHA는 실제 실행 시 좁게 확인 |
| PC 유효 원자료 | **23/26** | **26/26**; 누락 BLS 2 + Census 1 |
| 신규 7개 중 유효 사설 원자료 | **4/7** | **7/7**; 원자료 readback 필수 |
| 신규 7개 Production API·데스크톱 UI 값 공개 | **4/7 직접 확인** | **7/7 실제 값·날짜 검증** |
| 전체 프로젝트 추산 진행률 | **42%** | 현장 증거 확보에 따라 재산정 |

누락: BLS CPI 임대료 `CUSR0000SEHA`(#22), 자가주거비 OER `CUSR0000SEHC01`(#23), Census M3 제조업 총재고 `MTM/TI`(#28). 기존 4/7은 EIA 휘발유, Treasury 관세 순수납, BLS PPI `WPSFD4`, Fed G.17 제조업 생산이다. `INVALID`/`MISSING`을 0이나 추정값으로 대체하지 않는다.

`zgmini/main`에는 신규 7행 공개 validator/reader, 전용 writer, `run-local.mjs`의 `publishInflationCandidates7Auto` 연결, `worker/candidate-r52.ts` GET/HEAD 분기, 물가 상세 UI의 `InflationCandidate7Inputs` 연결이 **source 수준에서 이미 확인**되었다. 오래된 작업 문서의 'main 미회수·라우터/UI 미연결' 표현은 최신 source에 그대로 적용하지 않는다. 이 source 확인만으로는 **설치·Cloudflare Production·D1 실제 값을 입증하지 못한다**. 아래 6절의 별도 실제 공개 관측을 구분한다. 오래된 기능/UI 브랜치 전체 병합 금지.

## 2. 개정 공통 지침의 적용

1. 시작·재개 시 제어 저장소 최신 `main`의 지침 3개와 본 업무 관련 승인/변경 범위를 확인하되 **학습만 반복하거나 전체 Controller 진단을 전역 Gate로 삼지 않는다**.
2. 수리 가능한 **확정 Writer B 실패**만 격리 Windows `zgmini-handoff-ci-isolated`→`agent-handoff`→단일 중앙 ChatGPT→**원본 GitHub Issue** 회신으로 처리한다. 정상 `PASS`, `WAIT_RECORDED`, `STATE_UNKNOWN`을 가짜 수리 장애로 만들지 않는다. 인위적 실패·기존 B #1177 재실행 금지.
3. 원본 Issue 댓글은 이 일반챗의 자동 수신/재개, 운영 PC 설치 또는 원자료 변경의 증거가 아니다. 실제 대화 재개 시 해당 원본 결과를 확인해 기능 작업을 계속한다. 자연 발생 장애 전체 왕복은 **DEFERRED**, 물가지표 기능 완료의 Gate가 아니다.
4. 공유 Controller/Writer/Core source의 **실제 겹치는 쓰기만** 단일 owner·lease로 직렬화한다. 독립 source·read-only 준비와 신규 7행 게시 증거 분석은 계속한다. 공용 원장 #68은 PC 잠금 해제 근거가 아니다.

## 3. 필수 실행계획 — 두 개의 독립 작업 축

### A. 누락 공식 원자료 3개 복구 (실제 PC 실행 축)

| 순서 | 수행 | 정확한 통과 조건 | 실패·대기 처리 |
| --- | --- | --- | --- |
| A1. 현재 운영 입력 확인 | 기존 승인된 A/read-only 경로로 설치된 Controller A operation 존재, 실제 PC source/config/Task·Core/Korea 런타임 경로와 `E:\ZGmini\data\pc-writer\local-cycle.lock`의 **canonical 동일성**을 필요한 범위에서 검증. 예약 Task의 실제 런타임을 Runner 환경으로 추정하지 않음. | 원본 Issue/Run·JSON/TXT의 SHA·관측 시각·출처 및 실제 잠금 소유 근거 일치. 정적·순간 A 관측만으로 B 승인 선언 금지. | A 미설치 또는 소유 미관측이면 `UNVERIFIED`; 새 임의 shell, lock 삭제, Task 정지·경로 추정 금지. 이 축만 대기. |
| A2. 오류에 한정한 수정 | A1로 입증된 **잘못된 검증기 조건만** 최소 수정. 실제 Core/Korea 공유 lock, Writer mutex, CAS·해시·백업 및 fail-closed 보호 유지. | 같은 Windows 경로의 관련 회귀 PASS와 새 입력 manifest/source 검증. | 단지 시간이 지나도록 Core 소유자를 못 본 사실을 잠금 오설정 또는 Core 실패로 단정하지 않음. |
| A3. 공식 수동 단회 B | 기존 승인 `inflation-manual-b`의 고정 BLS flatfile과 Census 공식 원본 **두 GET**을 새 고유 Issue/requestId·현재 해시 manifest로 1회 실행. Core 자연 활동 관측 후 실제 유휴·잠금 안전 확보. | **BLS 2 + Census 1** parse/store 원본 보호·checkpoint/JSON 2파일 재조회·결과 TXT/JSON 2/2 및 실제 원본 Issue 성공 영수증. | **09:00·다음 날·자연 예약 수집 대기 없음**. 안전 중단 시 실제 code/lastPass/firstFail/쓰기를 기록. #1177이나 불명확 요청 재실행 0회. |
| A4. 완전성 검증 | 기존 23개를 보존하며 새 3개가 정확한 series/월/단위·관측일·수집일·source SHA·last-good와 함께 읽히는지 현장 확인. | **26/26 원자료 유효**, 신규 7/7 저장·재조회. PPI 등 기존 정상본 무변경. | 특정 공식 파일에 자료가 실제 없다면 `MISSING`으로 정직하게 보고하고 별도 보류/제외 결정을 사용자에게 요청; 임의 수치 채움 금지. |

`#996` Controller 업데이트는 **별도 원담당이 맡는 공유 설치/복구 자원**이다. #917 과거 완료를 #996 완료로 추론하지 않는다. #996의 C 증거 예외 승인이 존재하더라도 운영 설치·보호/Workflow 복구 PASS까지는 원본 증거가 필요하다. 이 문서의 작성자가 #996 lease·Workflow·backlog·잠금을 바꾸거나 B를 중복 요청하지 않는다. 독립 작업은 계속한다.

### B. 신규 7개 연구자료 공개 (A와 독립적으로 준비·진행)

| 순서 | 수행 | 정확한 통과 조건 | 분리 원칙 |
| --- | --- | --- | --- |
| B1. 정본 source 연결 검토 | 현행 `zgmini/main`의 `run-local.mjs` 7행 sidecar, 기존 공통 Writer 게시 경로, `candidate-r52.ts`, UI 컴포넌트·catalog 실제 연결과 배포 기준 SHA를 확인. 승인된 19행·4축 불변 회귀만 수행. | 현재 main source·테스트·승인된 게시 계약 일치. | 이미 연결된 코드를 불필요하게 재개발·전체 브랜치 병합하지 않음. |
| B2. 저장 기반 계산·정상행 우선 게시 | 실제 PC **저장 자료만** 읽어 7행 `score:null` projection 생성. 기존 유효 4개는 관측·갱신 상태에 맞춰 READY/STALE로 게시하고 누락 3개는 PENDING/기존 유효본이 있다면 원래 날짜를 유지한 STALE. 승인된 기존 Writer B 게시 lane 사용. | 전용 D1 key `detail:inflation-causal-candidates-7:r1`, 기존 19 key/4축 무변경, 공개 7행 전수 상태·값·원래 관측일·`sourceStoredAt` readback. | **26/26 확보 전에도 4/7 기존 유효값을 화면에 표시할 수 있도록** 독립 처리. 실패값 0 치환·마지막 유효 결과 덮어쓰기 금지. |
| B3. 3개 확보 뒤 완성 게시 | A4 성공 후 새 3개 저장 자료를 사용해 동일 기존 계산→Writer→D1 재게시. 공급자 GET을 계산 중 재호출하지 않음. | 7/7 READY 또는 공식 발표·stale 기준에 따른 정직한 상태, D1 값·버전·checkpoint·시각 정확 재조회. | Core scheduler/DB/TTL/가중치/배포 경로 무승인 변경 없음. |
| B4. Production 공개 판정 | GitHub 배포 repo/branch/SHA→Cloudflare Git Integration exact Deployment 확인, `/api/inflation-candidate-inputs` GET/HEAD, 물가 PC·모바일 화면 각 값/단위/날짜/결측/STALE 마지막 점 확인. | D1·API·UI 동일 7행, 관측일·수집일·게시일 구분, 19개·4축 회귀 유지. | HTTP 200·READY 외피만으로 완료 선언 금지. 데이터 게시마다 재배포·Git push 강요하지 않음. |

실행 병렬성: B1/정적 B4 검토는 A1~A3와 독립적으로 수행 가능. **실제 동일 Writer/DB/D1 공유 쓰기**는 owner·lease 승인 순서에 따라 직렬 실행한다. B2는 A4 전에 승인된 PARTIAL 공개 계약으로 실행 가능하며, B3는 A4 완료 후 진행한다.

## 4. 승인·보호·의사결정 경계

- 사용자가 승인한 공개 범위는 **연구자료 별도 7행** 및 기존 D1 key/GET/UI 표현뿐이다. 기존 19개 원자료, 4축 물가 점수, 가중치, DB/TTL, 수집 주기, 예약, DNS, 공개 path의 임의 변경 금지.
- #15 관세율, #17 관세 노출 비중, #30 자체 공급 부족 산식은 **DEFERRED**. 별도 정의·권리·산식 결정 전 공개 점수나 26개 수집 목표에 넣지 않는다. #27은 #26과 원본 중복.
- 공유 운영 설치·잠금·환경·source에 대한 새 범위의 효과만 추가 승인을 확인한다. 기존 동일 보호 목적의 상시 승인을 반복 요청하지 않는다. A급에 B급 쓰기 권한을 넣지 않는다.
- 승인된 BLS/Census 수동 수집에는 **시간대 09:00 Gate, 매일 자동 예약, 새 CMD, ChatGPT 일정**이 없다. 공식 호출량·기존 quota와 원본 파일 크기 제한은 유지한다.
- 원본 키·전량 원자료·환경변수·process 명령행·민감한 운영 경로를 GitHub Issue/댓글/공개 DB/채팅에 올리지 않는다. E: 지속 DB/원본은 보존하고 일회성 출력은 TEMP/승인된 결과 회수 경로 사용.
- 자동 장애 인계의 자연 E2E와 정규 예약 첫 자동 갱신 검증은 **모든 기능 수집·계산·저장·게시·화면 완료 이후 후속 관측**이다. 선행 Gate 아님.

## 5. 다음 실행 하나와 증거 갱신 규칙

**즉시 다음 실행:** 최신 `main`에 이미 존재하는 7행 `run-local`·Worker 라우트·UI 연결의 정본 SHA와 현재 실제 설치/Production 범위를 대조하여 **첫 승인된 기존 Writer 게시 실행에 필요한 정확한 manifest·source/lease 조건**을 고정한다. 이 확인은 읽기/정적 준비이며 #996 복구 담당의 공유 자원에 쓰지 않는다. 동시에 A1 잠금 경로 관측 operation의 현재 Windows 설치 가능 여부만 좁게 확인한다.

그다음 안전하게 실행 가능한 첫 실작업을 선택한다: 게시 B 경로가 준비되면 **기존 유효 4개 READY/STALE + 누락 3개 PENDING(과거 유효본 확인 시 STALE)**의 7행 첫 공개를 수행하고 D1/API/UI를 검증한다. 수동 공식 B의 Core 잠금 소유 증거가 충족되면 **새 단회 요청으로 3개 확보**를 수행한다. 두 축 중 하나가 실제 차단이면 다른 축을 계속한다. 새 정상 실행을 인위적 자동 장애 검증으로 바꾸지 않는다.

모든 단계별 결과는 `DONE / RUNNING / STATE_UNKNOWN / BLOCKED / DEFERRED`, 대상 source SHA, 원본 Issue/requestId/Run, 실제 PC 결과쌍, lastPass/firstFail, 저장·D1·API·UI readback을 분리해 후속 기록한다. 진행률은 **실제 완료한 단계만** 가산하며 문서 작성 후 **42% 유지**. 각 재개 시 이 계획과 마지막 실증 단계에서 다음 실행 하나를 선정한다.

## 6. 실행 개시 후 확인 — Production 4/7 공개 (2026-11-10 KST)

- **실제 조회:** `https://zgmini.kr/api/inflation-candidate-inputs`는 `schemaVersion=inflation-causal-candidates-7-r1-v1`, `status=PARTIAL`, `score=null`, `sourceVersion=INFL7_PRESENTATION_c891b9b21dc39a33c88acd08692bbdc2d9278e32881ec4759b09ec42cbd10231`, 정확히 **7행**을 반환했다. `READY` 4개는 #2 EIA(4.153 USD/갤런, 2026-11-02), #16 Treasury(5,910,402,249.78 USD, 2026-09-30), #24 BLS PPI(159.78, 2026-09-01), #29 Fed G17(99.4361, 2026-09-01). `PENDING` 3개 #22/#23/#28은 `value:null`, `history:[]`, 관측일 null로 유지한다.
- **실제 UI 관측:** `https://zgmini.kr/economic-indicators/inflation/` 데스크톱 화면에서 별도 '추가 물가 관련 연구 원자료 (7개)' 표가 표시됐다. 기존 유효 4개 값/관측일·차트, 미확보 3개 대시(—)/'원자료 게시 대기'가 API와 부합한다. 기존 19행 표와 기존 4축 물가 점수 **54.3**도 별도 표시됐다. 모바일 시각 결과는 미확인이다.
- **저장 계약 근거:** `zgmini/main`의 `readInflationCandidates7PublicResponse()`는 D1 `market_public_snapshots_v1`의 `detail:inflation-causal-candidates-7:r1` 행을 조회·본문과 `stored_at` 일치 검증 후 응답한다. 따라서 공개 API는 저장 D1 projection을 서비스하는 것으로 source와 실응답이 정합한다. 다만 **별도 관리자 D1 직접 재조회/실제 PC Writer ledger·설치 SHA/Cloudflare exact deployment** 증거는 이 관측만으로 확보하지 않았다.
- **조치:** 이미 성공한 첫 4/7 공개를 다시 게시하지 않는다. B2의 최초 부분 공개는 관측 범위에서 **DONE(Production API·데스크톱 UI 4/7)**으로 바꾸고, 남은 필수 작업을 A1~A4의 **3개 원자료 실제 수동 수집**, B3의 후속 7/7 갱신·저장 원장 검증, B4의 **모바일 및 정확한 배포/Publisher/D1 재조회**로 좁힌다. 전체 진행률은 기존 산정 근거가 부족하므로 임의 변경하지 않고 **42% 유지**한다.

## 7. 병렬 독립 검증 및 정확한 재개 지점 (2026-11-10 KST)

> **역사적 기록:** 이 절의 당시 ‘#996 C 복구 → 모든 물가 A/B 재개’ 순서는 현재 §0으로 대체한다. 당시 관측된 오류·미설치 사실은 보존하지만 전역 Gate로 사용하지 않는다.

이번 범위는 **승인된 정규 기능의 실제 26/26 수집과 7/7 공개**로 고정한다. 세 독립 담당은 (i) BLS/Census 공식 수동 입력과 파서, (ii) Controller A 진단 실행 가능 여부, (iii) PC 결과·D1/API/UI 공개 증거를 **읽기 전용으로 병렬 조사**했다. 이 조사는 운영 수집·게시 성공을 의미하지 않는다.

| 독립 작업 | 새로 확인한 결과 | 작업 판단 |
| --- | --- | --- |
| 공식 원본·파서 | 기존 PC #987 / Run `42574375718`의 마지막 관측 `2026-11-08T22:45:02.525Z`: CPI #22/#23 `BLS_CANDIDATE_VALUE_OR_DUPLICATE`, Census #28 `CENSUS_M3_HEADERS_INVALID`. 기존 API 경로 BLS 파서는 날짜 중복·비정상 value·음수 등에서 해당 코드를 낼 수 있어, 원본 payload 없는 상태에서 원인 분기를 단정할 수 없다. | 승인된 `inflation-manual-b`는 실패한 API 요청 경로 대신 공식 BLS `cu.data.12.USHousing` flatfile 1회와 Census `naicsinvp.xlsx` 1회를 고정 GET한다. 공식 파일 존재 확인만 완료; **실제 PC 다운로드·파싱·3개 저장은 미실행**. 해당 다른 API 파서를 추정으로 개조하지 않는다. |
| 코드 회귀 | 기존 수동 공식 경로의 관련 테스트 **29/29 PASS** 및 최신 공개 main 7행 검증·Writer·Core 연결 테스트 **27/27 PASS**. | 두 묶음은 검사 대상·실행 조건이 달라 단일 실행 56건으로 오인하지 않는다. Fixture PASS는 Windows 운영 source/원자료·D1 보장 아님. |
| 공통 PC 접수 상태 | 실제 Controller SHA `badad9124157879d7a645b64f2768113d632355b`에 `inflation-core-lock-observation-readonly` A operation 미설치. 제어 main에 등록 source 존재하나 #996 `INTAKE_PAUSED/RUNNER_SET_DRIFT`·`pc-job` Workflow `disabled_manually`·공유 설치 lock. [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)에서 18항목 중 16 true/2 unproven, C 증거 예외 동의만 존재. | **A1은 `AUTOMATION_BLOCKED`**, 실제 수집 실패 `RUNTIME_FAILED`가 아니다. #996의 중앙 담당 C 복구 PASS/원장·Workflow 재검증 전 물가 신규 A·B Issue 생성 금지. 이 기능 담당이 공유 lock을 직접 해제하거나 이전 #1177을 재사용하지 않는다. |
| 게시 독립 검증 | [#987](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/987) 원본의 `LOCAL_SNAPSHOT_AND_CHECKPOINT_ONLY` 및 `d1Writes=0` 확인. 실제 공개 API·데스크톱 UI 7행 중 READY 4/PENDING 3, 모바일 카드 DOM 7개·<=767px CSS 있음. | B2의 **이미 이루어진 4/7 부분 공개를 재실행하지 않는다**. D1 **직접 관리자 readback/Writer ledger**, Cloudflare exact Production Deployment SHA 및 390px 이하 **모바일 실화면**은 아직 독립 미검증. 기존 19·4축 보존. |

### 담당·입력·완료 판정이 명확한 다음 실행

1. **공용 Controller 단일 담당 (#996, 물가지표 담당 아님):** 현재 공유 복구 진행을 끝내고 `RECOVERY_COMPLETED`·설치 source SHA·Workflow 활성·설치 lock 상태를 원본 Issue/Windows JSON/TXT로 확인한다. *물가 작업의 다음 원격 실행을 허용하는 실제 외부 의존성*이며, 과거 #917 복구 PASS로 대체할 수 없다.
2. **물가지표 원담당 (A1):** #996 재검증 후 단일 기존 설치 승인 경로로 `inflation-core-lock-observation-readonly` operation의 현장 등록을 확인하고, **새 고유 A 요청 1회**로 Core/Korea 실제 실행 경로·Task/Node/E: 잠금 canonical owner를 JSON/TXT 회수한다. 승인 조건 없는 실행 또는 Source 병합만의 성공 선언 금지.
3. **물가지표 원담당 (A2~A4):** 보호 증거의 **첫 실패 코드가 특정되면 그 조건만 수정**; 기존 Writer lock/CAS 원본 보존. 통과하면 새 고유 승인 B 1회로 위 공식 BLS/Census 2개 GET을 **현재 시각에 수동 수행**하고 SQLite 원자료 3개 readback, 신규 7/7, 전체 26/26 확인. **09:00 예약/기다림 없음**. 실패 시 소비된 요청을 재시도하지 않는다.
4. **물가지표 원담당 (B3~B4):** 저장 자료만으로 기존 계산→Writer→D1 projection을 갱신한다. 실제 D1 값·`stored_at`·sourceVersion·checkpoint, API 7행, 데스크톱/390px 모바일 7행과 기존 19·4축을 동일 원본으로 대조한다. 정확한 Cloudflare 배포 SHA/실제 게시 원장은 **본 게시 범위에서만** 확인하며 A1~A4를 불필요하게 막지 않는다.
5. **후속 관측 (DEFERRED):** Writer B 자연 장애의 격리 인계 E2E 및 정규 예약 자동 갱신은 기능 수집·게시 완료 이후 따로 본다. 정상/안전 대기를 가짜 실패로 만들지 않는다.

**이번 점검 후 전체 기능 진행률: 42% → 42%.** 신규 코드 변경 0건, 새 PC 운영 요청 0건, 운영 데이터·공유 lease 변경 0건. 마지막 실제 원자료 23/26, 공개 값 4/7이므로 완료율을 높이지 않는다. 위 1번의 실제 복구 증거가 나오기 전에는 원담당의 A 실행은 대기하되, 독립 공개 검증·기능 source 작업은 계속 가능하다.

## 8. #996 실제 C 중단 이후 상태 분리 (2026-11-10 KST, 후속 재개)

> **역사적 기록:** 당시 실제 C 중단·안전 경계는 보존한다. 2026-11-13 현행 독립 물가지표 진행·특정 설치 제한은 §0으로 판정한다.

- **사용자가 전달한 총괄 대화 최신 결과:** #996 실제 C 복구가 시작됐다가 `STATE_UNKNOWN_PRESERVE_C_CLAIM_AND_ORIGINAL_LEASE`로 중단. 최초 실패 `C_GITHUB_BACKLOG_PLAN_ORIGINAL_BODY_INVALID`, 단계 `ORIGINAL_JOB_DISPOSITIONS`. Workflow 변경 시도 1회, backlog 종료 시도 1회, lease 보관 시도 0회. **시도 횟수는 실제 상태 변경 성공 여부의 증거가 아니다.** 이 결과는 현재 비공개 원본 #996 Issue의 완결된 Windows 사후 JSON/TXT 검증과 별도로 사용자 전달 관측으로 분류한다.
- **실제로 해야 할 일:** #996 단일 Controller 담당자가 기존 C claim/lease 및 GitHub Workflow·backlog/원본 Issue를 **읽기 전용으로** 회수하고 LAST PASS/FIRST FAIL·부작용·정확한 안전 복구 경로를 입증한다. 동일 CMD 재실행·다른 복구 도구 우회·물가 A/B 신규 요청 금지. 확정된 복구 및 설치 operation 가용 여부가 입증된 시점에만 위 7절의 물가 A1→A4를 재개한다.
- **독립 UI 재조회:** Production 물가 페이지의 현재 1363px 데스크톱에서 원자료 19개, 연구용 7개 중 4개 확보/3개 게시 대기, 기존 점수 54.3 확인. 390px 모바일 실제 렌더/오버플로우는 현 브라우저에서 DevTools 접근 제한으로 **미검증**; 반응형 소스/DOM 확인만으로 실화면 PASS를 선언하지 않는다. 모바일 확인과 D1 관리자 readback·배포 exact SHA는 B3/B4의 공개 검증으로 남겨두며, 현재 수동 수집의 전역 Gate로 삼지 않는다.
- 원자료 **23/26**, 공개값 **4/7**, 프로젝트 전체 **42% → 42% 유지**. 이번 재개에서 기능 원본/운영 데이터 변경·PC 요청·Writer/D1 재게시 0건.


<!-- inflation-20261114-official-independent-review -->
### 2026-11-14 KST 독립 공식자료·파서 계약 재점검 — 운영 변경 없음

- **시작/종료:** 물가 전체 42%→42%. [PC #1334](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1334) 유효 입력 23/26(미완료 CPI #22/#23, Census #28), 신규 공개 4/7의 기존 증거 재사용. 신규 수집·저장·계산·게시 실행 0.
- **BLS 공식 원문 재확인(독립 공개 읽기):** [cu.data.12.USHousing](https://download.bls.gov/pub/time.series/cu/cu.data.12.USHousing) 직접 조회. `CUSR0000SEHA` 2026-09 `450.429`, 2026-10 `451.337`; `CUSR0000SEHC01` 2026-09 `445.195`, 2026-10 `446.588`. 두 계열 2025-10은 `-/X`로 **결측**. 승인된 `parseOfficialBlsHousingFlatfile`은 공식 헤더·공백 분리·해당 ID·`-/X` 처리와 정합. 이는 해당 원문 행을 확인한 소스 계약 점검이며 PC에서 공식 원문 전량 다운로드·해시·저장 검증한 결과는 아니다.
- **Census 문서/실물 분리:** [공식 M3 Historical Time Series Documentation](https://www.census.gov/manufacturing/m3/historical_data/naicshist.pdf)은 계열 ID=A열, 연도=B열, 월별 1~12월=C..N열 형식을 설명해 `AMTMTI` selector 계약과 부합. 그러나 공식 `naicsinvp.xlsx`의 직접 다운로드는 현 독립 실행 환경에서 DNS/바이너리 MIME 문제로 실패했으므로 **실물 내부 시트명 `m3-outp-invp`·실제 행/셀·2026년 월별 값·원본 SHA-256은 검증하지 못함**. 기존 FRED 교차값을 공식 XLSX 파싱 성공으로 대체하지 않는다.
- **확인된 공통 XLSX 결함 재사용:** `zgmini/main`의 `xlsx-lite.mjs`는 `Relationship` XML 속성이 `Id` 다음 `Target` 순서여야 인식한다. 독립 [Draft PR #1061](https://github.com/ansqhd5774-Choi/zgmini/pull/1061)은 속성 순서 불문 파서 수정·Census fixture 회귀·표준 CI 연결을 이미 구현했으며 [CI #43285591364](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43285591364)는 성공으로 기록됨. **실물 Census XLSX에서 이 문제가 발생했다는 증거는 없으며, #1061은 운영 source에 미적용인 방어적 수정 후보**. 기존 4개 승인 파일 SHA를 바꾸는 작업은 별도 source/manifest 재검증 없이 실행 금지. 이번에 중복 코드 패치·병합은 하지 않음.
- **승인 B 검토:** [Draft PR #1336](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1336)의 manifest는 기존 [APPROVED_B 원본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/inflation-manual-b/official-static-two-source-20261110.json)과 비교해 `status=APPROVED_B→DRAFT_NOT_APPROVED`, `sourceSha=48d3478030590ca63aaab2435e88c896608c70d3→05d7ae49e0a84cbeebd90ef4de6dd7284094bf97` **두 필드만 다름**. 승인된 4개 파일 해시·공식 URL 2·쓰기 대상 2·최대 크기·40초 timeout·기존 Core 독점 lease·단회성·DB/D1/Task/source 쓰기 금지 동일. 기존 [#1177](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1177)는 사전검사 중단/GET0/쓰기0 소비됨. 마지막 Workflow opt-in 관측 `false`, 현 명시 승인 미확인. 새 B/변수 토글/원본 덮어쓰기 0.
- **다음 단일 필수 실행(물가 원담당/승인 Owner):** #1336의 현재 PC source·4파일 동일효과·승인 범위를 검토해 정규 B의 승인 GO/NO-GO를 명시 판정. GO가 되면 원본 Git blob/manifest SHA와 일회성 opt-in을 정규 경로에서 확정하고 신규 고유 B 요청 1회→내장 Core owner 관측→공식 BLS/Census 원자료 GET·사전 파싱→PPI #24 기존 203건 보호→로컬 저장·재조회→기존 계산·D1·API/UI 검증. NO-GO 또는 실물 XLSX 사전검사 실패 시 보존형 STOP, 재시도 없음. #996 C 복구·Controller 전체 설치·자연 예약 검증은 독립 원자료 검증의 선행 조건이 아님.


## 9. 2026-11-14 — #1336 실제 승인 검토·공식 자료 독립 검증·최소 재개 경로

### 9.1 최신 공통 정본과 예전 Gate 정정

제어 저장소 최신 `main`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`를 재조회. 2026-11-12 이후 기준은 `#996 NO-GO=SHARED_INSTALL_ONLY`이며, 기존 7절의 “#996 완전 복구 전 물가 신규 A/B 전면 금지”는 **현행 독립 Writer B 경로에 대한 전역 Gate가 아니다**. 신규 `inflation-core-lock-observation-readonly` A가 PC Controller에 미설치여도, 승인된 `inflation-manual-b/windows-adapter.mjs` 자체가 단회 B 내부에서 **최대 12분 Core Task→Node→E: local-cycle.lock owner를 fail-closed 관측**한다. B 승인·Workflow opt-in·실제 공유 Writer lock/lease 확인이 별도 필수 조건이며, 이 기록으로 B 승인을 대체하거나 #996 C를 변경하지 않는다. 운영 PC `PC`의 6 Runner와 격리 PC `DESKTOP-N62L0NG`의 독립 CI Runner 권한·Runtime을 구분한다. Remote Desktop Commander 사용 금지.

### 9.2 승인 검토 — 제어 Draft PR #1336

- [Draft PR #1336](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1336)은 **OPEN/DRAFT, `DRAFT_NOT_APPROVED`**. 기존 `approvals/inflation-manual-b/official-static-two-source-20261110.json` (`APPROVED_B`, source `48d3478030590ca63aaab2435e88c896608c70d3`)과 신규 `approvals/inflation-manual-b/official-static-two-source-pc-05d7-20261113.json` (source `05d7ae49e0a84cbeebd90ef4de6dd7284094bf97`)의 JSON 값 차이는 **`status`, `sourceSha` 정확히 2필드**.
- PC 실측 출처 [A #1326/Run #43266592109](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1326): local checkout/config/Writer checkpoint `05d7...` 같고 tracked clean. [A #1327/Run #43267687874](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1327)·[A #1328/Run #43267690493](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1328): 기존 4파일 SHA-256 4/4 일치 — manual parser `53c01bbc...`, store `3ef346bd...`, XLSX-lite `44d4c230...`, local-cycle `2e6200e5...` (전체 SHA는 manifest 정본 참조). Core 실제 running task source는 이 고정 checkout 실측으로 증명되지 않음.
- 공식 GET 두 개: BLS `https://download.bls.gov/pub/time.series/cu/cu.data.12.USHousing`, Census `https://www.census.gov/manufacturing/m3/prel/historical_data/histshts/naics/naicsinvp.xlsx`; 동일 저장 JSON 2건; BLS 8MB/Census 6MB; 40초; `runCount=1`; `EXCLUSIVE_EXISTING_LOCAL_CYCLE_LOCK`; DB/D1/Task/source/기타 쓰기 거부 계약 전부 불변.
- [기존 B #1177/Run #42714127327](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1177): `INFL_MANUAL_B_PREFLIGHT_STOP / INFL_MANUAL_B_CORE_OWNER_NOT_OBSERVED_STOP`; GET 0·운영 쓰기 0; **요청 소모, 재사용 금지**. [격리 CI #43279174086](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43279174086): 현재 `vars.ZGMINI_INFLATION_MANUAL_B_ENABLED == 'true'` 비교 false (미설정인지 다른 값인지는 미확정).
- **승인 미충족:** #1336 명시 B 승인 판정과 정규 Workflow opt-in만 정규 Owner가 처리. 임의 Draft→Approved 수정·변수 토글·새 B Issue 생성·실운영 파일 변경·잠금 해제 **0건**. 기존 #996 C NO-GO는 공유 설치 쓰기에만 적용하며, 이 독립 B 승인 흐름과 혼합하지 않는다.

### 9.3 공식 원본의 실제 값과 XLSX 미확인 범위

- BLS 공식 **text/plain 실제 원문** 2026-11-14 조회: `CUSR0000SEHA` 2026 M10 **451.337**, `CUSR0000SEHC01` 2026 M10 **446.588**. 두 시계열 2025 M10은 각각 `- X`로 공식 결측. 기존 `parseOfficialBlsHousingFlatfile`의 ID/월/결측 처리와 형식 일치. 이 공개 줄 검사는 전체 원본 byte digest·PC 단회 다운로드·저장 실증이 아니다.
- Census 원본 `naicsinvp.xlsx`를 공개 URL에서 XLSX MIME으로 확인했으나 실제 **바이너리 압축 XLSX의 시트·내부 행/셀·관계 속성 순서를 이 환경에서 확보하지 못함**. `CENSUS_M3_SHEET=m3-outp-invp`, `CENSUS_M3_SERIES=AMTMTI`, `A=series`, `B=year`, `C..N=Jan..Dec`는 코드·공식 시계열 정의와의 계약 검토이며 **실파일 검증 PASS 아님**. FRED(Census M3 출처)의 2026-09 `AMTMTI=976044`(USD million, SA), 2025-10 `947012`은 기존 테스트 예시와 일치하나 XLSX 읽기의 대체 증거가 아니다. 공식 XLSX 시트명/행 번호/월별 실제값/관계 XML 순서는 승인된 B에서 확보한 실물 bytes를 read-only 파싱한 결과로만 통과 처리한다.
- 소스 수준 **실제 재현된 호환성 결함:** `xlsx-lite.mjs`의 `Relationship Id=... Target=...` 고정 순서 정규식은 정상 XLSX의 Target-before-Id 순서를 놓침. [별도 Draft PR #1061](https://github.com/ansqhd5774-Choi/zgmini/pull/1061) 3파일 최소 수정·회귀 테스트가 이미 존재하며 [Node CI #43285591364](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43285591364) 성공(Build/Type/Regression/PC recovery/Cloudflare contracts). **공식 파일에서 바로 이 속성 순서가 발생했는지는 미확정**, 해당 PR을 중복 cherry-pick/운영 source 자동 교체하지 않음. PR #1061을 운영 적용하기로 승인한 경우에만 **신규 source/파일 해시를 재고정**하고 #1336 기존 4파일 동일효과 증거를 변경 영향 범위에서 다시 검증한다.

### 9.4 현행 실제 데이터·최소 다음 실행

- [PC A #1334/Run #43277201713](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1334): 유효 신규 자료 **4/7**, #22·#23 `INVALID`, #28 `MISSING`; 기존 PPI #24 `WPSFD4` **203건**, 마지막 관측 `2026-09-01`, `sourceStoredAt=2026-11-07T22:40:02.928Z`, 파일 SHA-256 `845cb9cad8fd24cdcafecc499fb71b28f4200e21f5b4aef5b64a3bc3fd0c16c5`. 모든 저장·checkpoint 원본 불변. 전체 원자료 **23/26**, 실제 공개값 **4/7**, 기능 진행률 **42% 유지**.
- **다음 필수 실행 한 가지 (권한 담당):** #1336의 실제 현재 source `05d7...`·기존 4파일/동일효과를 기준으로 **명시 B 승인/NO-GO 판정**을 정규 승인 경로에서 수행한다. 승인 시 승인 manifest bytes/SHA-256 및 단회 opt-in scope만 재확정하고, 원담당이 *새 고유 requestId로 정확히 1회* 내부 12분 Core owner 관측→BLS/Census 공식 GET 2→CPI 두 계열·Census 시계열 parse/store→PPI 203건·기존 checkpoint pre/post SHA·원자료 readback을 검증한다. Core owner 미관측/경합 시 안전 중단하며 자동 재요청하지 않는다.
- **수집 이후:** 저장값에서만 계산→로컬 결과/원장→승인 D1 게시→D1 관리자 직접 readback→API 7행→PC·모바일 UI 검증. **B의 두 JSON 저장은 DB/D1 게시 허가가 아니며 별도 기존 승인 Writer 게시 경로 필요**. 기존 19/4축·PPI·결측/날짜 계약 유지. 예약 자연 갱신 후속 관측은 최종 기능 완료의 Gate가 아니다.
