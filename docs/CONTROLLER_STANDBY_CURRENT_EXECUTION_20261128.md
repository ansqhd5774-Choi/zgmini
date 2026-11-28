# 보조 Controller — 현재 실행 상태 및 인수 원장
기준일: 2026-11-28 KST
총괄: zgmini / codex/controller-ops-lessons-20261105
이 문서는 R3/R4의 과거 기록을 보존하면서 현재 다음 행동을 정정한다.

<!-- process-owner-us-breadth-marketparquet-exclusion-20261128 -->
## #4135 / 미국 전체 등락지수 R2 — MarketParquet 제외 조건과 실제 Windows 실행 계약 (2026-11-28 재대조)

- **브랜치/권한:** 실제 총괄 브랜치는 `zgmini/codex/controller-ops-lessons-20261105`이며, 표시 접미 `-105`는 현재 GitHub 브랜치로 확인되지 않는다. 연결 GitHub 계정의 `zgmini`/제어 저장소 권한은 admin·push이지만 운영 Windows Owner 인증·B급 설치 승인을 대신하지 않는다. 이 계획 갱신은 브랜치 문서에만 적용하며 운영 source/main/설치와 무관하다.
- **현행 R2 source가 MarketParquet 기반:** `zgmini/main`의 `scripts/pc-writer/local-cycle.mjs`는 `marketparquet-paid-store.mjs`를 직접 사용한다. `us-breadth-paid-r2-stored.mjs`는 `us-marketparquet-paid-r2-adapter.mjs`와 MarketParquet 달력 provider를 import하고, `worker/us-breadth-paid-r2-contract.mjs`는 `US_PAID_R2_SOURCE=MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY`와 `US_PAID_R2_UNIVERSE=US_MARKETPARQUET_ACTIVE_STOCKS`를 강제한다. 따라서 현 소스의 R2 자료 경로는 사용자 제외 조건을 충족하지 못하며, 기존 R2 경로를 MarketParquet 없는 검증된 대체 경로라고 주장하지 않는다. [R2 저장 계산](https://github.com/ansqhd5774-Choi/zgmini/blob/main/scripts/pc-writer/us-breadth-paid-r2-stored.mjs), [공개 계약](https://github.com/ansqhd5774-Choi/zgmini/blob/main/worker/us-breadth-paid-r2-contract.mjs).
- **기존 승인 불일치:** #4135의 `approvals/writer-updates/us-breadth-paid-r2-guarded-fourfile-natural-idle-20261127.json`은 `APPROVED_B`이지만, 정확 4파일·runCount 1에 `marketparquet-paid-store.mjs` 사용/추가를 포함한다. 현재 제외 지시와 효과가 상충하므로 승인 명세를 그대로 적용·재발행하지 않는다. 설치 source/승인 source, Git blob SHA와 실PC 바이트 SHA-256을 구분한다.
<!-- process-owner-us-breadth-no-mp-alternatives-20261128 -->
- **승인 이력의 정확한 구분:** [`docs/MARKETPARQUET_REMOVAL.md`](https://github.com/ansqhd5774-Choi/zgmini/blob/main/docs/MARKETPARQUET_REMOVAL.md)에는 2026-11-16 **무료 사용 제거** 이후 2026-11-20 **유료 Complete Archive·Keep Current 연결 승인**이 기록돼 있다. 유료 데이터에 대한 그 당시의 승인·실행 증거를 부정하지 않는다. 그러나 2026-11-28 **본 요청의 MarketParquet 제외 조건**을 11/20의 다른 효과 승인으로 덮어쓰지 않는다. #4135 명세는 유료 데이터 소스 기준으로 작성됐으므로 본 제외 범위에서 실행 가능한 승인이 아니다. 과거 유료 운영 이력이나 다른 기능까지 일괄 삭제·중단하지 않는다.
- **검토한 기존 비-MarketParquet 후보의 실제 계약:** `lib/market-breadth/us-public-r1.mjs`의 S&P500 확정 R1은 `source=SP500_STORED_MARKETPARQUET_FREE_SAMPLE`라 제외 조건을 충족하지 않는다. `lib/market-breadth/us-provisional-r1.mjs`의 Alpaca IEX는 `source=ALPACA_IEX_15MIN_SPLIT`, `phase=PROVISIONAL`, S&P500 490~520종 장중 자료에 한정되어 미국 **전체** 251 저장 거래일/250 비교일의 R2 확정 이력 대체가 아니다. GMH 테마 확정 경로 역시 미국 전체 R2의 정확 입력 계약·수집·251일 저장 증거가 없다. 현재 조회한 소스/승인에서 **비-MarketParquet 전체 미국 R2 대체 소스/계약은 검증되지 않음**. 범위 없는 저장값·가짜 비율·IEX 확장 투입 금지.
- **실행 판정:** 기존 [#1702](https://github.com/ansqhd5774-Choi/zgmini/pull/1702)·[#1734](https://github.com/ansqhd5774-Choi/zgmini/pull/1734)의 250점 출처/게시 계약은 유료 데이터용으로 기존 유효 범위에 유지. 본 제외 작업에서 R2 입력·산식·source/universe·공개 계약 또는 다른 테마 생산자를 임의 수정·교체하지 않는다. 정확한 비-MarketParquet 공급자·공개권·원자료 연속성·R2 유니버스에 대한 승인된 입력이 확보될 때만 후속 최소 소스 작업을 시작한다. 이는 소스 정합성 확보 전 단계에서의 **데이터 계약 차단**이며 전역 Windows/Controller 장애가 아니다.
<!-- end process-owner-us-breadth-no-mp-alternatives-20261128 -->
- **Windows 정규 경로 한계:** 현재 제어 저장소는 Public이다. `.github/workflows/pc-writer-b-source-once.yml`의 B 작업과 `.github/workflows/pc-process-inventory-readonly.yml` 운영 작업에는 `github.event.repository.private == true` 제약이 있다. Public A는 별도 경로로 실행됐지만 공개 결과는 `SUMMARY_ONLY/PUBLIC_RESULT_CODE_REDACTED`여서 동시각 Task·Process·Core lock·checkout probe 원시 SHA를 증명하지 못한다. 별도 기존 승인 독립 Windows Owner의 이 R2 효과 접근·실행 권한은 미입증으로 남긴다. Public/private Gate 또는 결과 공개 제한을 임의 제거하지 않는다.
- **원본 실행 보존:** [#4135](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4135#issuecomment-7230523766) / [Run 45901622751](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45901622751)은 `WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`, 167/167 ACTIVE, **설치 전 STOP**이다. 별도 #4134에서 시작 약 62초 전 Core Task Running 관측은 있으나 원본 167개 표본 각각의 원인을 입증하지 않는다. #4314/#4315 source 병합·103/103 hosted CI PASS는 운영 적용 증거가 아니다.
- **다음 필수 순서:** (1) 현행 MarketParquet 제외 범위에서 **검증된 R2 입력/저장 자료·데이터 정의 및 소유자 승인 효과**를 특정 → (2) 그 효과에 필요한 최소 소스·공개 계약·후보 바이트·manifest·회귀 CI를 정합화 → (3) 정규 인증 Windows Owner의 대상별 읽기/설치 권한·preimage CAS·자원 lease·백업/복구·실제 유휴 증거 확인 → (4) 그 범위에서만 단회 적용 → (5) 원본 requestId/Run·설치 SHA-256·JSON/TXT·저장/공개 결과 readback. (1)~(3) 미충족 상태에서 원본 B 재실행, 새 공급처/Task/DB/D1/보안 정책 변경, 임의 shell 우회를 금지한다. 독립 승인 업무는 계속한다.

<!-- end process-owner-us-breadth-marketparquet-exclusion-20261128 -->

<!-- process-owner-4312-source-ci-reconciliation-20261128 -->
## #4312 계보·CI 완료 및 후속 S6/Writer 증거 — 2026-11-28 KST

- **[Draft PR #4312](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4312)**: 제어 `main@704713392b5394c128104910293e027028b16011`의 Writer B probe 수정과 기존 A 결과 영수증을 보존하는 2-parent merge `ccb2d70dd4bb2c1f9b667ffddc162c44bf521443` 반영. S6 7파일·시험 보존, **behind 3→0, mergeable=true**. 소스 계보 통합을 운영 효과 승인으로 취급하지 않는다.
- 첫 정확 HEAD [Actions #46083735840](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46083735840) FAIL은 신규 CI paths 6줄이 기존 **불변 Workflow blob pin `a8f49337…`**과 충돌한 2건이었다. 실제 실패 조건을 수정해 Workflow를 원본 blob으로 복원한 `b5cef2045d43bf0b6c1ada887272c947b5e7f766`에서 [Actions #46083807424](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46083807424) **public-source-only SUCCESS**, 유지보수 통합 **110/110**, CI 승인·관측 **43/43 PASS**, Windows private-only SKIPPED. 정확 [PR 검증 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4312#issuecomment-7230334518). 승인 pin 완화·새 Runner/Workflow·운영 설치 없음.
- **[#4078](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4078#issuecomment-7230370441):** 원본 source SHA `7579dea082d0f7a671113e52e39cefc9be8c9a87`는 현 웹 `main`의 정상 선조(ahead 12/behind 0). 원본 소스 계보 자체는 차단 원인이 아니다. 별도 backlog-only POST 효과의 독립 승인·Windows Owner/lease·journal/backlog CAS 및 원본 요청 Run/JSON·TXT가 **없으므로 원본 재발행 금지**. 후속 #4313 A PASS는 역사적 누락 영수증이 아니다. #4312 DRAFT/HOLD / NO MERGE.
- **[#4069](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069):** 실제 Guardian 단회 복구와 운영 6 Runner 정상화는 확인된 별개 완료. 원본 S6 원장 `RECOVERY_REQUIRED`·`WATCHDOG_RELEASE_OUTCOME_UNVERIFIED`, `backlog4078=NOT_RECORDED`를 원래 승격 성공으로 바꾸지 않는다. 원본 S6 재실행 없음.
- **[#4135](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4135#issuecomment-7230370010):** 원본 B [#45901622751](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45901622751)에서 167/167 ACTIVE·설치 전 STOP 보존. 별도 A #45898383016(21:28:59Z)/#45899361744(21:37:49Z)에서 Core lock 존재·writer lock 없음이 각각 관측됐지만 원본 B 시작 21:57Z와 **동시각 아님**. 오탐 source 수정 PR #4314 병합과 운영 probe 적용·실제 B 실패 원인·설치 성공을 구분한다.

**다음 정확 행동:** #4078은 승인된 독립 Owner effect와 원본 CAS가 먼저 확인되는 경우에만 단회 POST→PC Job→동일 requestId 영수증 확인. 별도로 #4135의 같은 시각 Task/프로세스/lock/설치 probe 증거를 정규 읽기로 분리, #4069 역사적 원장 유지. 현재 정상 Controller `d3764580…` 설치 83/83·#4308/#4310 PASS는 재실행하지 않는다. 이번 변경은 **진행계획 문서·원장 갱신**일 뿐 신규 PC 운영 변경이 아니다.
<!-- end process-owner-4312-source-ci-reconciliation-20261128 -->


<!-- d376-operational-install-and-runner-audit-completed-20261128 -->
## 최신 후속 운영 결과 — 2026-11-28: #4302/#4304 범위 5/5 완료

**이 절이 아래 과거 0/5·checkout 조정 대기·#4300 설치 미반영 기록보다 우선한다.**

- 실제 PC의 공유 checkout 활성 관련 프로세스/Git 잠금/설치 lease 없음과 clean 상태를 쓰기 직전에 확인한 뒤 정상 fast-forward로 72852739… → source PR #4304 merge **0c60109f03b41fae4cd81a26d04733a02e23bb4e** 동기화. 강제 쓰기·잠금 해제·새 전역 Gate 없음. 실행 source 6개 원본 바이트 일치.
- 공식 독립 Explorer Owner inspect: 2026-11-27T22:35:28.627Z **PASS / PUBLIC_B_OPERATOR_PREFLIGHT_READY_ONLY**.
- 승인 #4302, 실행 source #4304의 정확 1파일 B 설치 **[#4307](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4307)** 완료. requestId=pc-update-9ff0e6ed-3b61-44b7-a3ec-b854be06853d. 2026-11-27T22:41:02.699Z **PASS / APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED**.
- 실제 설치 SHA **d3764580fdb08ecddd5f9b1064051eec30f90492**, 이전 cde1dd372210e4658ae348cb9e2577967cb11634. 설치 host inventory **83/83 파일 CAS 일치**, operations.mjs SHA256 **6c0441108c244d1d5dd58e7793b785a371169a9d96b69e606200d905e8f59966**.
- 실제 PC 사후검사 **[#4308](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4308#issuecomment-7229528707)** / Actions **46078055056**, seat 6, core-status **PASS**, actualExecutionSha=d3764580….
- **설치된 새 검사기의 실제 A 실행 [#4310](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4310#issuecomment-7229580896)** / Actions **46078431643**, seat 5, **PASS / OPERATING_AUDIT_READONLY_VERIFIED**, actualExecutionSha=d3764580…. watchdogReady/standbyPairReady/supervisorVerified/localPostcheckLedgerVerified/localRunnerSmokeLedgerVerified 모두 true. 보호 상태 불변, A 작업 쓰기/공급처/D1/SQLite 0. 이제 수정 source 단독 실행에만 의존하는 검증이 아니다.
- 신규 Listener 6개·GitHub 온라인 6개, Watchdog HEALTHY·보조 2/2 READY, Workflow active·활성 설치 lease 없음 확인. 기존 #4156/#4299/#4301 성공을 보존하고 재실행하지 않음.
- 제가 잘못된 설명형 제목으로 만든 최초 A 요청 #4309는 hosted 접수에서 거부돼 PC 실행 0건. NOT_PLANNED로 정리 후 고정 제목 pc-job/새 ID인 #4310으로 정상 1회 실행했다. 이를 Controller 장애로 기록하거나 허용 기준을 완화하지 않는다.
- [중앙 원장 실제 증거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7229602662).

**현재 다음 행동:** 일반 승인 업무를 계속한다. 이 후속 범위의 설치·자동 감사 미완료는 해소됐고 동일 Owner apply를 재실행하지 않는다. 결과 업로드에 따른 main HEAD 전진만으로 완료된 실행 source/CAS/Runtime 증거를 취소하거나 같은 동기화·설치를 반복하지 않는다. 실제 source가 변하는 다음 작업의 영향 범위만 새로 확인한다. Public 저장소 유지, 원자료/DB/D1/산식/예약/보안 권한의 변경 없음.

---

## PR #4300 신규 1파일 효과 승인/소스 main 통합 — 2026-11-28 KST

- 사용자는 #4302 신규 정확 1파일 B 효과 승인이 필요하다는 안내 직후 현 대화에서 **“작업해라”**라고 지시. 해당 변경 진행 지시를 [PR #4302 댓글 #7229078819](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4302#issuecomment-7229078819)에 범위별로 기록했다. 이는 독립 Windows/GitHub Owner의 인증이나 이미 수행한 운영 적용을 대신하지 않는다.
- B 효과 명세 [PR #4302](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4302) **MERGED**; 정확 approval merge `b7b7eb92802d0e974ee3ad9a2d2689e37ae41bb4`, 원 HEAD `75bec5d5d115eb150fa4dfd1347c1063c42b74f7`. 기존 `cde1dd372210e4658ae348cb9e2577967cb11634` → 선별 후보 `d3764580fdb08ecddd5f9b1064051eec30f90492`, `controller/operations.mjs` 정확 1파일 SHA-256 `6c0441108c244d1d5dd58e7793b785a371169a9d96b69e606200d905e8f59966`; 배포 산식·데이터·DB/D1·예약 변경 없음.
- 독립 Windows Owner 실행기·정확 B 보호 정책·Public A 3-SHA guard [PR #4304](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4304) **MERGED**; 정확 reviewed source merge `0c60109f03b41fae4cd81a26d04733a02e23bb4e`, 원 HEAD `748f34c79645805e4665bbff4a1018d20a2e88b1`. 실행기 `tools/controller-lineage-public-b-operator-once.mjs`에서 `SOURCE_PR=4304`, `APPROVAL_MERGE=b7b7eb92802d0e974ee3ad9a2d2689e37ae41bb4` 및 출처 CAS/host CAS/lease/단회 Claim, backup·rollback 계약으로 고정.
- [Actions #46074638935](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46074638935) (#4302 HEAD) 및 [Actions #46074932419](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46074932419) (#4304 HEAD) 모두 GitHub-hosted `public-source-only SUCCESS`; Windows `source-only SKIPPED`. main에서 `tools/controller-lineage-public-b-operator-once.mjs`, `tools/update.mjs`, 승인 manifest의 정확 SHA/readback 확인; source PR merge `0c601...`와 해당 시점 main 동일.
- **현재 실제 설치:** 여전히 기존 성공 Controller `cde1dd...`이며 `d376...`의 Windows 독립 Owner `inspect/apply`와 새 PC 사후 JSON/TXT는 **미실행/미회수**. 기존 #4299/#4301/#4156 실제 83/83·Standby 2/2·독립 감사 2/2 PASS 유지, 재실행하지 않는다.
- **다음 정확 필수 단계 (C급 독립 PC operator):** Windows `PC` 공식 Owner Explorer 세션에서 정규 checkout의 merged source/main bytes CAS를 확인하고 기존 단회 실행기 `tools/controller-lineage-public-b-operator-once.mjs inspect` 1회 수행. `PASS/PUBLIC_B_OPERATOR_PREFLIGHT_READY_ONLY`와 원본 host `cde1dd...`, 설치 lease free, 기존 Claim 부재 및 백업/복구 준비가 사실일 때만 동일 경로 `apply`를 1회 수행. 결과 불명/차단 시 새 Issue나 같은 apply 반복 금지; 기존 Claim/lease/원장 reconciliation. 성공 시 신규 requestId·issue·최종 영수증/신규 설치 SHA 및 `core-status` A postcheck의 고유 JSON/TXT readback으로 실제 적용 검증한다. ChatGPT GitHub 소스 병합만으로 독립 Windows 운영자 인증을 주장하지 않는다.

---

## PR #4300 후속 정확 HEAD CI 및 PR 충돌 해소 — 2026-11-28 KST

- B 제안 [PR #4302](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4302) Draft·미병합 그대로. `checks.status=PASS`는 검증된 후보의 **소스 테스트** 상태만 나타내며 사용자 B 효과 승인/운영 설치를 뜻하지 않는다. 정확 HEAD `75bec5d5d115eb150fa4dfd1347c1063c42b74f7`, [Actions #46074638935](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46074638935) `public-source-only SUCCESS`/Windows source-only `SKIPPED`. B manifest 원본은 status 변경으로 바뀌었으므로 과거 후보 원문 해시/승인 영수증을 신설하지 않는다.
- 독립 실행 경로 [PR #4304](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4304)는 PR #4302와의 중복 `tests/automation-status.test.mjs` 수정을 제거; 새 테스트는 기존 `tests/public-source-ci-guard.test.mjs` 진입점으로 계속 실행. 변경 6파일만 남음. 정확 HEAD `057a17c891eeb4e6528247a1d1062538303ae00f`, [Actions #46074565688](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46074565688) `public-source-only SUCCESS`/Windows source-only `SKIPPED`.
- 두 브랜치 최신 main 대비 각각 `ahead`, `behind=0`; 서로 다른 테스트 진입점 사용으로 승인 PR 선병합 시 단순 중복 충돌을 방지. **두 PR 모두 Draft·미병합**; 새 effect-specific 승인 기록·Windows CAS/lease/backup·설치/사후 영수증 없음. 별도 기록 없이 `PENDING_PR_4302_APPROVAL_MERGE`를 진짜 승인 SHA로 바꾸거나 B 요청 생성하지 않는다.
- **다음 실제 필수 작업:** PR #4302 정확 변경 효과에 대한 사용자 명시 승인 확인 후 해당 승인 범위에서 소스 병합 SHA를 확정한다. 그때 PR #4304의 승인 SHA 핀·최종 소스 CI·source 병합을 마치고 공식 독립 Windows Owner `inspect`/보호 적용/실제 postcheck 결과를 단회 회수한다. 기존 #4299/#4301/#4156은 완료 유지, 재실행 금지.

---

## PR #4300 후속 실행 경로 소스 검증 — 2026-11-28 KST (운영 미적용)

- 기존 #4156 운영 Controller `cde1dd372210e4658ae348cb9e2577967cb11634`·#4299/#4301 실제 PASS 및 독립 감사 2/2, inventory 83/83는 완료 증거로 보존. 원 요청/Claim/설치를 재실행하지 않음.
- 새 단일 파일 후보 `d3764580fdb08ecddd5f9b1064051eec30f90492`의 B 효과 Draft [PR #4302](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4302)에 승인 manifest/pin 및 음성 회귀시험을 추가. `checks.status=PROPOSED_NOT_APPROVED` 보존. 해당 정확 HEAD `377097bb88b5cad0ff36a0fcdbf1fc9efc64e935`의 GitHub-hosted [Actions #46074396580](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46074396580) **public-source-only SUCCESS**; Windows source-only는 정책 SKIPPED.
- 새 독립 Windows Owner 경로, `tools/update.mjs`의 3번째 *정확 1파일* 정책 후보, Public A 기존 SHA 2개 보존 + 신규 SHA 및 `controller/operations.mjs` SHA-256 정확 검증, 거부·lease 보존 회귀시험을 신규 Draft [PR #4304](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4304)로 제안. 해당 source HEAD `db1677c06dc46baf1c17a1b95ea7248056e9bc61`의 [Actions #46074296651](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46074296651) GitHub-hosted **public-source-only SUCCESS**; Windows source-only SKIPPED.
- **고의 fail-closed:** 새 Owner 정책의 승인 merge SHA는 `PENDING_PR_4302_APPROVAL_MERGE`, 실행 경로는 Source PR #4304 병합을 요구. 둘 다 Draft/미병합이며 PR #4302의 새 B 효과 승인 미입증. GitHub 소스 PASS를 운영 적용 또는 승인으로 주장하지 않는다.
- **다음 실행 의존성:** #4302 효과별 실제 승인·정확 manifest `PASS` 검증·소스 CI/병합 SHA 확보 → #4304 정확 승인 merge pin 수정·최종 CI/소스 병합 → 공식 독립 운영 Windows Owner의 현재 CAS/lease/백업/복구 inspect 및 승인된 고유 B 1회 → postcheck 실제 JSON/TXT·새 설치 SHA readback. 기존 #4156 감사 재실행 불필요. DB/D1·원자료·예약·기존 운영 Controller 변경 없음.

---

## PR #4300 후속 선별 설치 후보 — 2026-11-28 KST (소스 준비, Windows 미적용)

**기존 운영 복구 상태 보존:** #4299 Controller `cde1dd372210e4658ae348cb9e2577967cb11634` 실제 설치·사후 #4301 PASS, #4156 독립 2/2 PASS, host inventory 83/83 일치. 원 요청·Claim·보호 lease/설치 재실행하지 않는다.

- 원인: 설치된 `controller/operations.mjs`는 #4266/#4267 과거 원장의 당시 `actualExecutionSha`를 **현재** `host.controllerSourceSha`와 비교하여 정상 업그레이드 뒤 오판. [PR #4300](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4300) main `e5bfdf58b0876fa51b75fe3c694f420504a69885`에서 당시 `555f95708984580cd7d5a0fd05a80b718e867710`으로 고정한 수정과 해당 함수 비교 일치.
- 소스 후보: [전용 브랜치](https://github.com/ansqhd5774-Choi/zgmini-pc-control/tree/codex/controller-audit-4300-selective-20261128)·커밋 [`d3764580fdb08ecddd5f9b1064051eec30f90492`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/commit/d3764580fdb08ecddd5f9b1064051eec30f90492). sole parent `cde1dd...`; GitHub compare `ahead=1/behind=0`, `controller/operations.mjs` 단 1파일 +1/-1. 후보 파일 SHA-256 `6c0441108c244d1d5dd58e7793b785a371169a9d96b69e606200d905e8f59966`; 기존 설치 파일의 SHA-256 `0507663515206b97bb2cad72a2b3fb19032d5ab0f3c2bdd1305eaa6d225d5375`와 별도 대조. 단일 파일 manifest fingerprint `ded54e837f8dfac59bed4b8bb83258668a9e3693cb5dffe1d1c9e2e9ef0aa6b5`.
- [Draft PR #4302](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4302): 새 정확 1파일 효과의 selective pin과 B manifest 초안 작성. `checks.status=PROPOSED_NOT_APPROVED`; 승인·설치 가능 manifest가 아님. 이전 승인 #4283과 독립. 본문 PR 번호에 연결했고 다음 범위는 새 효과별 승인/정확 source 보호 구현이 필요하다.
- **현재 운영 적용 상태:** 새 후보 `d376...`은 **미설치**. 기존 설치 `cde1dd...` 계속 유지. #4300 main 소스 48/48 회귀 PASS와 이번 정확 함수 비교/선별 diff는 소스 증거일 뿐 새 Windows A handler PASS·운영 설치 증거가 아니다.
- **남은 필수 행동:** Draft #4302의 정확 변경 효과를 사용자 승인/소스 CI 계약으로 확정하고, 현 독립 operator·`tools/update.mjs`의 과거 #4283 한정 정책과 Public A 설치 SHA/파일 가드를 신규 1파일 효과에 맞게 정규 확장·검증. 승인 뒤 실제 Windows preimage CAS·lease·backup/rollback과 새로운 고유 B 실행 및 A 사후 JSON/TXT를 회수한다. 기존 #4299·#4301·#4156 결과는 재실행/재해석 금지. 승인 없는 추가 운영 변경 없음.

---

## 최신 실제 운영 증거 — 2026-11-28 06:53 KST (아래 과거 미완료 보고보다 우선)

**승인된 Controller 운영 설치와 추가 독립 감사 2건을 실제 PC에서 완료했다.** 소스 CI로 완료를 추정한 결과가 아니다.

- PB2: 공식 독립 Explorer Owner inspect **1/1 PASS**, 2026-11-27T21:44:04.844Z, PUBLIC_B_OPERATOR_PREFLIGHT_READY_ONLY.
- PB3: 승인 #4283/#4287 및 실행 source #4295를 사용한 **설치 #4299 1/1 PASS**. requestId=pc-update-3d816cf2-37c1-4bbc-a0dd-d62a4e0ad782. 실제 설치 SHA **cde1dd372210e4658ae348cb9e2577967cb11634** (이전 555f95708984580cd7d5a0fd05a80b718e867710).
- PB4: 2026-11-27T21:51:44.520Z 영수증 **APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED / PASS**. 공식 PC 사후 Job [#4301](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4301), [Actions 46072941694](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46072941694), seat 4, actualExecutionSha=cde1dd... PASS. protectedStateUnchanged/runnerSetVerified/postSourceVerified/workflowEnabled 모두 true. Claim FINAL_RESULT/PASS, 활성 설치 lease 없음.
- AUD1: 독립 Windows Owner에서 Watchdog HEALTHY, 보조 2/2 READY·실제 생존, 현재 Supervisor/host 동일 SHA 및 6개 좌석 확인 **PASS**.
- AUD2: 원래 #4266/#4267에 대응하는 로컬 postcheck/smoke 원장을 고정 요청·Job·당시 실행 source와 대조 **2건 모두 PASS**. 과거 실행 원문이나 nonce를 공개하지 않음.
- 설치 후 83개 host inventory 실제 파일 해시 **83/83 CAS 일치**, 2026-11-27T21:53:15.064Z, INDEPENDENT_OPERATOR_VERIFIED / OPERATING_AUDIT_READONLY_VERIFIED. 감사 자체 운영 쓰기/공급처/D1/SQLite 0.
- [실행·검증 최종 증거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4156#issuecomment-7228857254). 기존 복구 8/8 및 #4270 CNN 복구 성공 증거를 보존하며 같은 요청을 재실행하지 않는다.

**진단기 소스 discrepancy (운영 복구와 구분):** 새 설치 후보의 역사 원장 검사는 과거 실행 SHA를 현재 설치 SHA와 비교하여 업그레이드 뒤 오판하는 결함이 있었다. [PR #4300](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4300), main e5bfdf58b0876fa51b75fe3c694f420504a69885에서 과거 고정 요청은 당시 555f957 source로 검증하고 현재 Supervisor는 현재 host와 비교하도록 수정, 회귀 **48/48 PASS** 및 hosted source CI SUCCESS. 이번 AUD1/AUD2는 이 수정된 source를 공식 독립 Owner에서 별도 실행한 실제 PC 증거다. 설치본 cde1dd가 후속 #4300까지 포함한다고 주장하거나 설치된 새 A handler 자체의 PASS를 주장하지 않는다. #4300의 설치본 반영은 다음 정규 유지보수 개선으로 구분한다. 알려진 자동 검사 오판 때문에 이 실제 운영 완료 증거를 무효화하거나 전체 담당자의 업무를 다시 정지하지 않는다.

**현재 다음 행동:** 일반 승인 업무를 재개한다. #4299/단회 Owner apply는 재실행하지 않는다. 공통 복구 설치와 두 실제 감사는 완료이며, 과거 104차 보고의 Windows 0/5·AUD 0/2는 현재 상태가 아니다. 공개 저장소 유지, 원자료/DB/D1/산식/예약 및 보안 권한 변경 없음.

---

## 최신 실행 증거 — 2026-11-28 06:35 KST (기존 §0A보다 우선)

**실제 신규 진전: Public Controller B 승인 2파일에 대한 독립 Windows Owner 실행 경로의 소스 통합 완료.** 운영 설치나 #4156 감사 PASS는 아님.

- 기존 효과별 승인 [#4283](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4283) 재사용: 설치 기준 `555f95708984580cd7d5a0fd05a80b718e867710` → 대상 `cde1dd372210e4658ae348cb9e2577967cb11634`, `config/operations.json` + `controller/operations.mjs` **정확 2파일**. [#4287](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4287) old/new Public A SHA 보호 병합 증거 보존.
- 신규 [PR #4295](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4295) `main@72852739c0139c0ef2649c8dd9032dd2ab5a83ff` **MERGED**, 수정 5파일: 독립 `tools/controller-audit-public-b-operator-once.mjs` 추가, 기존 `tools/update.mjs`에 정확 #4283 효과만 추가 허용, 회귀시험 3개 파일. 구 #4260 4파일 승인·원본·Public receiver 차단·lease/backup/rollback 및 정확 출처 검증 보존. 신규 실행기는 Reviewed Source PR #4295 병합 원문과 main/local 바이트 CAS 대조 후에만 내부 모듈을 로드한다.
- 정확 최종 합동 HEAD `979561b1887255f34d4315ecacb7da1edb11d9d7`에서 [GitHub Actions #46071249777](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46071249777) GitHub-hosted `public-source-only` **SUCCESS**. 원본 부정 회귀·기존 4파일/새 2파일 scope·불명 결과 잠금 유지 PASS. Windows `source-only`는 정책상 SKIPPED. 리뷰 HEAD CI와 병합 후 운영 설치를 동일시하지 않음.
- CI 첫 시도에서는 W06 리뷰 PR #4293 변경에 대한 기존 기대값 #4290이 불일치. #4296의 독립 수정을 보존하고 새 회귀 import만 통합한 정상 병합 HEAD에서 CI SUCCESS. 반대 이력은 삭제하지 않음.
- **현재 단계**: PB1 승인/소스 완료, PB2 **독립 Owner 소스 구현·GitHub CI 완료 / 현장 Windows `inspect`·CAS/lease 미실행**, PB3 승인 B 단회 운영 설치 **0/1**, PB4 결과 영수증 **0/1**, AUD1/AUD2 추가 실측 **0/2**. 기존 Public A 복구 8/8 완료 유지; 기존 #4263/#4266/#4267 및 #4270 재실행 금지.
- **다음 1개 필수 실행**: 정확한 운영 PC의 공식 독립 Windows Owner 환경에서 기존 허용된 소스 동기화/출처 확인과 신규 `tools/controller-audit-public-b-operator-once.mjs inspect`만 수행하여 설치 기준, 승인, 7파일 출처, owner·lease·backup/rollback 가능성과 이미 사용된 claim 유무를 조회. `PASS/PUBLIC_B_OPERATOR_PREFLIGHT_READY_ONLY` 전에는 `apply` 금지. PASS 후에도 해당 동일 인증된 PC에서만 승인된 정확 1회 `apply`, 로컬·원격 원장 및 B postcheck를 회수한다. Public CI 자동 B 경로·일반 Issue 직접 발행이나 과거 4파일 정책의 SHA 교체로 우회하지 않음.
- Windows 현장 접근·사후 SHA·원장/Standby 동시 실측은 **여전히 미확인**. 이 현재 사실을 무관한 독립 기능 전체의 blocker로 확대하지 않음.

---

## 0A. 2026-11-28 후속 지시 — Public B 신규 2파일 효과 및 #4156 감사

**업무 구분:** 아래는 기존 Public A 정상 복구 8/8과 별개인 *신규 Public B Controller 2파일 적용*의 잔여 작업 지시다. 위 §0의 복구 완료, #4263·#4266·#4267 원본 성공을 다시 설치·재실행하지 않는다. 문서 작성과 GitHub 병합은 Windows 운영 설치/전환의 증거가 아니다.

**대상:** 총괄 `zgmini/codex/controller-ops-lessons-20261105`; 구현·승인 `zgmini-pc-control`의 PR [#4276](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4276), [#4283](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4283), [#4287](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4287), 중앙 [#68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68), 감사 [#4156](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4156).

**최근 인계 보고(이 문서 반영 시 별도 현재 Runtime 재실증 아님):** Public B 고정 source `4d3fe664a90f`가 당시 `main`의 조상으로 비교되어 기존 `diverged` 차단 해소. 고정 SHA를 바꾸거나 출처 검증을 우회하지 않는다. Controller 2파일 승인 기록은 존재한다고 보고됐으나 독립 Windows 설치 정책의 정확한 2파일 허용 효과, CAS·lease·백업·복구 및 이번 신규 설치의 실PC 영수증은 미확인이다. 최신 원본에 반대 증거가 있으면 이 보고보다 실측을 우선한다.

### 실행 순서 및 단계별 완료 근거

| 단계 | 필수 실행 | DONE 근거 |
|---|---|---|
| PB1 소스·승인 계약 | 현재 `main`·해당 PR/승인 원장과 정확한 신규 2파일 path·target SHA·raw SHA-256·허용 효과를 비교. 조상 검증은 새로운 상충 증거가 없으면 이전 증거 재사용 | 현재 소스/승인/정책 일치 및 파일별 대상 목록 |
| PB2 독립 Windows 정책 보호 | 기존 승인된 Windows 설치기에서 신규 2파일 효과의 허용목록, 현장 원본 CAS, owner/관련 lease, 백업/복구 계약을 정규 읽기 경로로 확인. 과거 4파일 정책의 SHA만 교체하지 않음 | 정확한 사전 상태와 적용 가능/보류 판정 |
| PB3 정규 단회 설치 | PB1~2 충족 시 기존 승인된 독립 유지보수기 경로로 정확한 신규 효과 **한 번만** 실행하고 사후 Controller/host manifest SHA 및 Supervisor·Watchdog·6 Runner 보호 확인 | 운영 실측 status/code, 설치·실행 SHA, JSON/TXT/백업·복구 영수증 |
| PB4 결과 회수 | requestId, Run/Job/seat, operation, status/code, actualExecutionSha, 사후 파일 해시와 원장 확인. 공개 축약 결과를 비공개 원문과 혼동 금지 | 실제 로컬/허용 공개 증거의 동일 요청 대조 |
| AUD1 [#4156](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4156) Standby | 기존 공식 Windows 읽기 경로로 `STATUS.json`의 `standbyRole`, `secondStandbyRole`, `standbyReadyCount`, `at`와 owner PID를 **동일 최신 관측**으로 확인 | 두 역할 READY·count 2의 원본 증거 또는 UNVERIFIED |
| AUD2 [#4156](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4156) 로컬 원장 | #4266/#4267 고유 requestId에 해당하는 영구 `ledger/<requestId>.json`의 report·jobId·operation·status·actualExecutionSha와 기존 공개 JSON/TXT 대조 | 원본 대조 또는 UNVERIFIED; 임시 RESULT 정리만으로 유실 단정 금지 |

**독립성:** PB1~4의 설치 차단을 AUD1~2 또는 다른 독립 승인 업무의 전역 BLOCKER로 확대하지 않는다. 현재 건강한 Supervisor/Runner/Watchdog을 일괄 중단하거나, 원래 #4156·#3947·#4069 요청, 기존 A·B 복구, 승인 C 인계를 반복하지 않는다. 임의 shell/SQL·lease 삭제·직접 Controller 자기 교체·인증 완화·운영 데이터 변경 금지. 공유 자원 충돌이 실제 확인된 단계만 HOLD한다.

**진행 원장 시작값(이번 지시 반영, 실행 성과 아님):** Public B 소스 계보 비교 **2/2 완료 보고**, 신규 Controller 2파일 운영 설치 **0/1 확인**, #4156 추가 읽기 감사 **0/2 확인**. 신규 설치와 감사는 각 원본 증거를 회수할 때만 DONE으로 바꾼다. 결과는 기존 [#68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68) 및 이 원장에 원본 링크·관측시각·정확 실행/설치 SHA·미완료 원인을 기록한다. 전체 HA 전원/호스트 장애 복구의 완료 보증으로 확장하지 않는다.

---

### 2026-11-28 최신 GitHub 직접 재검증 — PB1 완료 / Windows 보호 단계 미실증

- **PB1 원격 소스 확인 DONE:** #4276, #4283, #4287은 현재 모두 `merged=true`·`closed`. `compare(4d3fe664a90f...main)` 결과 `ahead_by=47, behind_by=0, status=ahead`로 기존 Public B checkout 고정 SHA의 main 조상 조건 충족. 원래 PR 본문의 Draft/미병합/diverged 문구는 당시 이력이며 지금의 운영 상태가 아니다.
- **정확한 신규 B 효과 승인 내용 대조:** #4283 승인 기록은 설치 원본 `555f95708984580cd7d5a0fd05a80b718e867710` → 목표 `cde1dd372210e4658ae348cb9e2577967cb11634`, 변경 `config/operations.json` SHA-256 `177cb15b40ca34fc415a091bf93f8f6ac6d607ce4d6f7f429a77d73c8abdcccf` 및 `controller/operations.mjs` SHA-256 `0507663515206b97bb2cad72a2b3fb19032d5ab0f3c2bdd1305eaa6d225d5375`로 승인 JSON 두 개와 일치. #4287은 기존 SHA 4파일 guard 유지 및 이 목표 SHA만 추가 2파일 해시로 허용하도록 병합됨.
- **PB2 현재 직접 차단:** `tools/controller-public-b-operator-once.mjs`는 주석·상수·원본 검증 모두 과거 #4260 `3c7d4cfe... → 555f957...` **4파일 단회 효과 전용**. 신규 #4283 2파일에 상수만 교체해 실행하지 않는다. `tools/maintenance-request.mjs`의 일반 Owner 제출은 Private 전제이고 Public receiver는 별도의 설치된 V2 단일 효과 정책/정확 CI 영수증을 요구한다. 소스 #4276 병합과 GitHub 승인 댓글만으로 Windows V2 설치 정책이 활성화됐음을 증명할 수 없다.
- **운영 실증 한계:** 이번 조회는 GitHub 원격 조회만 수행. Windows 현재 installed SHA/원본 CAS/owner·lease·백업·복구와 신규 B JSON/TXT **미회수**. #4156의 동시 두 Standby 프로세스 신원·생존 및 두 비공개 A ledger 전체 원본 **0/2 독립 확인**. 정확 신규 target 설치 요청의 검색 결과는 #68/#4156 원장뿐이며 *실제 설치 요청 부재의 완전 증명으로 확대하지 않는다*.
- **다음 필수:** 설치 계약이 갖춰진 기존 공식 독립 Windows V2 정책의 실제 존재/허용 범위를 안전한 읽기 전용 경로에서 확인 → 정확 2파일 효과의 current CAS·lease·백업/복구를 확인 → 유효한 정규 인가 경로에서만 단회 설치 및 영수증 회수. V2 정책 자체가 아직 없다면 기존 승인과 정확 효과에 부합하는 독립 정책 설치 경로부터 안전하게 구현·검증하며 사용자 승인을 새로 중복 요구하지 않는다. 설치를 기다리는 동안 독립적으로 가능한 #4156 기존 Windows read-only 감사 결과는 회수한다.
- **현재 단계 결과:** PB1 GitHub 소스/승인 비교 확인 완료, PB2 운영 Windows 독립 정책·CAS 확인 미완료, PB3 설치 0/1, AUD1/AUD2 0/2. 이번 검사에 운영 설치/신규 B·A Issue/워크플로 변수/DB/D1/Runner 변경 없음.

## 0. 2026-11-28 03:51 KST 복구 후 우선 판정 — 과거 4/8 기록 대체

**현재 우선 결론:** Public 저장소에서 일반 작업자 PC 업무 재개에 필요한 Controller 설치·실행 복구 **8/8(100%) 완료**. 아래 §1 및 §5~§6의 `3c7d4cfe…`, `POLL_WAIT`, `4/8(50%)`, B 미설치·A 미실행 문구는 **각 관측 시점의 복구 전 역사 기록**이며 최신 운영 상태/실행 지시가 아니다. S6 원본 `#3947/#4069`의 과거 불확실성 및 전원·호스트 장애까지 포함한 모든 HA 전환 보증은 이 완료 범위에 포함하지 않는다.

| 검증 대상 | 현재 증거 기반 판정 |
|---|---|
| B급 Controller 복구 | 독립 인증 Windows 운영자 원본 요청 [#4263](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4263#issuecomment-7225893906) `PASS/B4263_ORIGINAL_REQUEST_RECOVERED`. 실제 설치 Controller `555f95708984580cd7d5a0fd05a80b718e867710`. 원본 요청 중복 실행·신규 B 요청 없음. |
| Public 일반 A 실행 | [#4266 Run 46051863226](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46051863226) `core-status`, [#4267 Run 46052065337](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46052065337) `runner-smoke`: Windows `public-approved-a` 각각 SUCCESS, seat 6, 설치 SHA 일치. 기존 고유 원본 요청과 [공개 JSON/TXT 2쌍](https://github.com/ansqhd5774-Choi/zgmini-pc-control/tree/main/results) 필드 일치. 별도 재실행 불필요. |
| 복구 후 Runtime·수신기 | 운영 PC 읽기 전용 관측 `2026-11-27T18:51:09.042Z`(28일 03:51 KST): `runtimeState=HEALTHY`, Controller 파일 검증, Supervisor owner/heartbeat/6 children, Runner 6/6 online·idle, Workflow active, Watchdog HEALTHY, 설치 lease 미보유·backlog open 0. 유지보수기 신원·최신성 검증, `PUBLIC_SOURCE_ONLY/SOURCE_ONLY_VERIFIED` 정상 보호. [#4263 최종 관측](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4263#issuecomment-7225955420). |
| Standby **2개 최신 동시** READY | **재확인 미완료**. 이전 [#4156 원본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4156#issuecomment-7221305213)은 11월 27일 23:49:41 KST `standby1=READY, standby2=READY, standbyReadyCount=2`를 증명. 03:51 복구 후 관측에는 `standby=READY`만 명시되어 2개를 그 시각 동시에 검증했다고 주장할 수 없음. 이것은 이미 복구된 일반 A 업무의 전역 BLOCKER가 아님. |
| 로컬 비공개 전체 JSON/TXT | **독립 재열람 미확인**. 공개 `results/46051863226-1-seat-6.{json,txt}` 및 `results/46052065337-1-seat-6.{json,txt}`의 `PASS`·requestId·operation·SHA 일치는 GitHub에서 직접 재조회. 그러나 `SUMMARY_ONLY/PUBLIC_RESULT_CODE_REDACTED`이므로 Windows 로컬 비공개 원문 전체 확인의 대체가 아님. 운영 비공개 원문을 GitHub에 올리지 않는다. |
| 비신뢰 요청 차단 | Public B 자동적용 금지 및 소스/부정 회귀시험 증거는 유효. 추가 악성 요청 실주입은 수행하지 않았으며 이번 복구 종단 성공의 필수 재시험으로 확대하지 않는다. |

**다음 읽기 전용 확인:** 기존 공식 Windows 상태 계약으로 동일 관측시각의 Standby 2개 READY 원본을 확인하고, 허용된 기존 경로에서 로컬 전체 결과의 존재·내용을 독립 대조한다. 재조회가 불가능하면 해당 두 항목만 `UNVERIFIED`로 남긴다. 새 Controller 설치·B 재승인·Runner/Watchdog 재시작·Workflow 수동 변경·복구명령 재실행·장애 주입은 하지 않는다.

**조회 경로의 소스 확인(2026-11-28, 운영 변경 없음):** 제어 `main`의 `tools/automation-status.mjs`는 Watchdog 요약에 단수 `standbyRole`만 투영하므로 그 출력의 `READY`를 `2/2 READY`로 승격할 수 없다. 기존 `tools/runner-watchdog.mjs`는 운영 `E:/ZGmini/automation/pc-watchdog/STATUS.json`에 `standbyRole`, `secondStandbyRole`, `standbyReadyCount`, `at`를 기록한다. **동일한 최신 시각·소유 PID 검증과 역할 둘 다 READY/개수 2를 읽은 Windows 증거**가 필요하다. 웹/GitHub 소스 조회는 이 로컬 파일을 읽지 못한다.

로컬 전체 A 결과는 `E:/ZGmini/automation/pc-control/ledger/<requestId>.json`의 `report`가 보존 기준이다(`controller/engine.mjs`). `jobs/run-<runId>-1-seat-6/RESULT.json`·`RESULT.txt`는 공개 결과/댓글 검증 후 정상 임시 정리되는 구조이므로 해당 임시 파일 부재만으로 결과 소실을 추정하지 않는다(`controller/report-temp-retention.mjs`). `#4266`과 `#4267`의 서로 다른 고유 requestId에 대해 로컬 ledger의 원문 `jobId`/`operation`/`status`/`actualExecutionSha` 및 보호 결과를 **승인된 Windows 읽기 경로에서 직접 대조할 때만** 비공개 원문 확인으로 승격한다. GitHub의 축약 JSON/TXT 2쌍은 이미 대조 완료했으므로 다시 A Job을 발행하지 않는다. 이 대화에서 독립 Windows 호스트 로컬 파일 접근 경로는 확인되지 않았으며, 미확인 2건을 임의 PASS로 처리하지 않는다.

---

## 1. 현재 완료·미완료
- 현재 Supervisor PID 25256, Watchdog PID 43904, Controller source 3c7d4cfefacf072fd35cb19706b352c64c5e4fd2.
- 2026-11-27 23:36 KST 직접 사후검증 11/11: 정상 heartbeat/owner, Controller manifest 바이트, 살아 있는 6자식, Watchdog HEALTHY, 두 Standby READY, GitHub Runner 6/6 Online.
- Supervisor 25256의 실제 실행 인수는 controller/standby.mjs이며 부모는 Watchdog 43904. Standby의 실제 Supervisor 승격 경로가 사용되었음을 직접 확인했다.
- 이것은 기존 S6 단회 요청 #3947/#4069가 성공했다는 증거가 아니다. 정상 운용 중인 warm standby에서 장애가 발생하는 모든 경우나 PC 전원 장애 내성을 입증하지 않는다.
- #4230 runner-smoke의 46017319371 / 46017321376은 private-only Workflow 조건으로 SKIPPED. 실제 A 작업 결과는 아직 미검증이다.
- 유지보수기는 POLL_WAIT / GITHUB_PRIVATE_REPOSITORY_REQUIRED. 공개 저장소와 기존 보안 계약 불일치가 직접 실행 차단이다.
- 건강한 현재 Runner를 대상으로 고아-six 종료·Owner 인수를 실행하지 않는다. PR #4229 HOLD를 유지한다.

## 2. 자동 시작 설명 정정
기존 Guardian 27308/Watchdog 43904는 2026-11-27 23:32:46 KST에 이미 시작됐다.
현재 정상 Watchdog은 해당 프로세스다. 이후 Guardian 2개가 추가 시작됐지만 Watchdog 본체는 하나다.
수동 시작이 필수였다고 한 Codex의 조기 판단은 정정한다. 자동 시작 누락은 입증되지 않았다.
정상 Watchdog을 다시 시작하지 않는다. Guardian 중복 실행 개선은 별도 비차단 항목으로 관리한다.

## 3. 원래 S6 효과 원장
원본 pc-s6-63afb126-72dc-4ec5-a721-4819771fa9ee의 현장 journal:
- status/phase: RECOVERY_REQUIRED
- code: S6_PORT_PROMOTION_UNVERIFIED
- failedAt: WATCHDOG_RELEASE_OUTCOME_UNVERIFIED
- leaseReleaseAcknowledged=true, mutationAttempted=true
- 당시 backlog pause/resume 기록은 존재한다. 원본 결과·claim·journal을 덮어쓰지 않는다.
기존 요청을 재발행하거나 현재 정상 프로세스에 같은 STOP을 다시 실행하지 않는다.
과거 불확실한 효과와 현재 별도 자연 복구 결과는 분리 기록한다.

## 4. 공개 CI 분리 — 이번 실제 반영
- 공개 소스 저장소: https://github.com/ansqhd5774-Choi/zgmini-pc-control-source
- snapshot commit: 5b2db84694367711c766781a5e72f371909b9e57
- 원본 code source: zgmini-pc-control@3eab41671d7c3acc7d2321d0b7abc9cb84dc0e2d
- 공개 범위: 기존 common/standby/supervisor/watchdog 및 Windows 격리시험 5파일. SOURCE_REVISION.json에 바이트 SHA-256 고정.
- 운영 원자료·비밀정보·운영 원장·운영 Runner 등록·유지보수 수신기는 포함하지 않는다.
- GitHub-hosted windows-latest / Node 22, contents:read, checkout credentials 비보존. self-hosted/운영 PC 접속 없음.
- Run 46022582674 / Job 140585698092 SUCCESS: 실제 Windows 격리시험 13/13 PASS, 0 FAIL, 0 SKIP.
- 초기 workflow 단독 bootstrap commit 465abb87...의 Run 46022464847은 source snapshot 미등록 상태에서 실패했다. snapshot이 포함된 위 commit/성공 Run으로 구분한다.
- 이것은 보조 Controller 관련 공개 CI 분리이며 기존 모든 CI의 완전한 이관·무제한 무료 보장을 의미하지 않는다.
- 기존 운영 저장소에 GitHub-hosted job을 사용하는 Workflow 5개가 있어 비공개 전환 시 할당량 사용 범위가 남는다. self-hosted 운영 작업 자체와 구분한다.

## 5. 과거 다음 필수 행동 — Public 유지 및 실제 PC 재개(복구 전 당시 기록)
2026-11-28 사용자가 `zgmini-pc-control` Public 유지를 확정했으므로 과거 비공개 전환 후보는 **폐기**한다. 요금제 변경·가시성 변경을 실행 재개의 대안으로 되살리지 않는다.

확정된 직접 원인: 기존 `pc-job.yml` Private 전용 Job과 설치 Controller의 Private 검증 때문에 Public에서 A Job SKIPPED (#4230), 독립 유지보수기 Private 검증 때문에 `POLL_WAIT / GITHUB_PRIVATE_REPOSITORY_REQUIRED` (#4156). 기존 Supervisor/6 Listener/Watchdog/Standby2 정상 상태와 구분한다.

### 현재 완료된 GitHub 소스 작업
- 제어 저장소 [PR #4241](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4241) → main merge `feaf0a380890663d8881881bea63587576188c76`: 유지보수기 owner/repo 숫자 신원 검증 후 Public metadata-only poll, B 효과 `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED`. 기존 `pc-job.yml`·Controller 실행물 불변. 정확 HEAD CI [#46030250470](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46030250470) SUCCESS.
- 제어 저장소 [PR #4244](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4244) → main merge `b757143036bb98059080e4abfb64692b1a49c7f5`: C/독립 운영자 전용 handoff manifest `approvals/maintenance-handoffs/feaf0a380890663d8881881bea63587576188c76.json`, 설치 소스 `b08f3a482e9bb39523f47675ae06bc6e02e01d2d` → 목표 `feaf0a380890663d8881881bea63587576188c76`, 고정 9파일 raw SHA256 비교에서 기존 8개 동일, `tools/maintenance-agent.mjs` 1개만 변경. 정확 HEAD CI [#46030662722](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46030662722) SUCCESS. Controller B 설치 정책·워크플로/Runner 운영 효과 승인 확대 없음.
- [PR #4246](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4246) → 제어 main `f816c498d3aae937698835b29141b14f6ee65ed2`: Public owner-only Controller 신원 검증·출력 축약용 런타임 4파일을 기존 검토된 Draft 코드에서 선행 분리, 정확 HEAD `90591cde1aca0b06d1a57f61d49fb8e07fb5d60c` GitHub-hosted [CI #46032445044](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46032445044) SUCCESS. **`pc-job.yml`은 Private-only 그대로**이고 Public Windows A Job 활성화·운영 Controller 설치는 미완료. 유지보수기 실제 인계 PASS는 아래 별도 현장 증거로 분리한다. 중앙 원장 [#68/7223125920](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223125920).
- [PR #4247](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4247) → 제어 main `b92ca9f36ad53005e861a93c72b76bd5f5ab9cf7`: 현장 설치 기준 Controller `3c7d4cfe...`를 유일한 부모로 하는 **4파일 선택 통합 커밋 `20d5bbbf305531dca9bf5b74744df83daf37cf17`** 작성. 검토된 main `f816c498...`의 정확한 네 blob·SHA256을 유지하고 엔진·Supervisor·설정·Private-only Workflow 무변경. 제어 `drafts/controller-public-a-selective-candidate-20261128.json`은 `approved:false`이며 운영 설치 manifest 아님. [Run #46033331267](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46033331267) hosted source CI SUCCESS 및 선택 통합 신규 3시험 PASS. 제어 B 효과 승인·운영 적용은 미완료.
- [PR #4250](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4250) 제어 main `3bed26ecabde1ac9046e000b1b32d912fa1ab53b`: 인증된 Public A Job의 실행 실패도 이전 Private 방식과 같은 Run/Job/좌석/진입 실패 검증으로 분류, 무조건 재실행·가짜 PASS 없이 원래 실패 보존. [Source CI #46035036268](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46035036268) SUCCESS, 관련 회귀 23/23 PASS. 이전 실제 유지보수기 인계 소스 `feaf0a380890663d8881881bea63587576188c76`와 고정 9파일 비교에서 신규 대상은 `maintenance-contract.mjs`, `update.mjs` 2파일만 차이, 7파일 동일. 신규 C 인계 별도 승인·현장 검증 필요, 설치 증거 없음. 최신 원장 [#68/7223430357](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223430357).
- [PR #4251](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4251) → 제어 `main@2b07f3ee9080b9e2d97690e623126b93b57043c5`: 기존 C 인계 완료 소스 `feaf0a380890663d8881881bea63587576188c76` → 새 Public 사후검사 호환 소스 `3bed26ecabde1ac9046e000b1b32d912fa1ab53b`의 **2파일 7→7 단회 독립 인계 승인 명세**를 `approvals/maintenance-handoffs/3bed26ecabde1ac9046e000b1b32d912fa1ab53b.json`에 반영. `tools/maintenance-contract.mjs`, `tools/update.mjs` 외 7/9 소스 파일 해시 유지, `ciControllerBPolicy` 무변경, Public B 실행은 차단 유지. [Source CI #46035587770](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46035587770) SUCCESS, 유지보수기 회귀 57/57 PASS. 새 Windows 인계 PASS·지속 Poll은 **아직 미검증**. 중앙 원장 [#68/7223558628](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223558628).
- **유지보수기 인계 현장 완료**: [#68/7223128772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223128772) Windows operator PASS, target `feaf0a380890663d8881881bea63587576188c76`; 이후 지속 poll은 unverified. 과거 `POLL_WAIT/GITHUB_PRIVATE_REPOSITORY_REQUIRED`를 현재 그대로 재확정하지 않으며 현장 인계 PASS와 혼동하지 않는다.
- [PR #4248](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4248) main `07378a0a296b33e98d9fad286fedcd9e955400a8`: 동일한 정확 4파일 overlay `20d5bbbf...`의 전체 전이 import closure를 기존 설치기 검사 함수로 검증, [CI #46033877362](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46033877362) SUCCESS. 운영 PC 미설치.
- [PR #4249](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4249) main `067c42a35a74afd2065529463c6fbc2ba4972bfb`: **Public 설치 후 사후검사 불일치 원인** 수정. 기존 유지보수기 `tools/maintenance-contract.mjs`·`tools/update.mjs`는 과거 Private `approved-pc-job`만 인식했고 Public 응답은 출처필드를 투영에서 제거하므로 정상 Public A도 검증 불가였다. Public 고정 Job은 중복 활성 거부, 신규 외부 정보 전송 없이 기존 운영 PC **영구 ledger**의 정확 요청 digest/실Job·seat·원본 Source/Controller SHA로만 `postSourceVerified` 확인. 임시 pointer 자동 정리 후에도 계약 유지. Public summary만으로 PASS 불가. [Source CI #46034563905](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46034563905) SUCCESS, 관련 회귀 22/22 PASS. **이는 main 소스만의 수정이며 새 유지보수기 C 인계/실제 B 적용 증거 없음**.
- Public A 소스 후보 [Draft PR #4232](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4232)는 미병합. 이전 통합 HEAD `8583b22454c5d7a50f3d6592778212dd8858eb22`의 GitHub-hosted CI [#46029482365](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46029482365) 92/92 PASS는 운영 설치가 아니다. 다른 담당자가 수정한 뒤 최신 HEAD 재확인 필요.

### 11월 28일 실제 Windows C 인계 차단 — 목표 Git 객체 미확보
- 사용자 제공 CMD 원본: `--source-sha 3bed26ecabde1ac9046e000b1b32d912fa1ab53b` 실행 시 `fatal: Not a valid commit name ...` → `AUTOMATION_BLOCKED/HANDOFF_ENVIRONMENT_ERROR`. 고정 `handoff-maintenance.mjs`의 `git merge-base --is-ancestor target HEAD`에서 사전 차단. 실제 운영 파일 교체·새 Receiver 인계 완료 증거 **없음**.
- GitHub 원격에서는 해당 target commit 존재, `main@2b07f3ee9080b9e2d97690e623126b93b57043c5`의 선조(ahead 3, behind 0), 승인 manifest 그대로. **운영 PC 로컬 checkout의 Git commit 객체 미인식**이 확인된 실패 조건, 로컬 브랜치·fetch 이력 미관측. 해당 실패를 새 승인·B 효과·Controller 설치 차단 오류로 오판하지 않는다.
- 운영자용 정규 수정 순서: `git -C "E:\\ZGmini\\projects\\zgmini-pc-control" status --short --branch`의 main/dirty 보호 확인 → 같은 경로에서 `git ... pull --ff-only origin main`(충돌 또는 다른 브랜치면 STOP, reset/clean/stash 금지) → `git ... cat-file -t 3bed...` 결과 `commit` 및 `merge-base --is-ancestor` 성공 확인. **새 증거 없이 기존 실패 handoff 재실행하지 않음**. Git checkout 이력이 충족된 경우에만 승인된 동일 C 2파일 인계 재시험, 실제 PASS/Receiver WMI origin/lease/백업·복구 원본 회수. B effect 계속 HOLD. [Issue #68 근거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223625814).

### 실제 Windows C 2파일 인계 — 2026-11-28 PASS
- 사용자 제공 CMD 결과: `schema=ZGMINI_MAINTENANCE_HANDOFF_RESULT_V1`, `status=PASS`, `targetSha=3bed26ecabde1ac9046e000b1b32d912fa1ab53b`, `installedShaBefore=feaf0a380890663d8881881bea63587576188c76`, `code=STOPPED_RECEIVER_HANDOFF_AND_WINDOWS_ORIGIN_VERIFIED`, 신규 Receiver PID `36604`. 출력은 고정 7→7 C급 런타임 2파일의 **운영 인계 완료** 증거이며 백업 경로도 반환됐다. [중앙 원장 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223684178).
- 이전 목표 Git 객체 미인식 `HANDOFF_ENVIRONMENT_ERROR`는 fast-forward 동기화 후 정상 인계 완료로 해결됨. 동일 C 인계 재요청 금지.
- **남음:** 이후 `PUBLIC_SOURCE_ONLY` poll의 지속 수신 현재 관측, 별도 인증된 Public Controller B 운영 적용 경로/host CAS·rollback, 정확 4파일 target `20d5bbbf305531dca9bf5b74744df83daf37cf17` 설치, 설치 확인 후 Public A Workflow 활성화 및 새 owner `runner-smoke` 원본 결과. 이 C PASS만으로 B 효과 허용·Controller 설치 완료·A 실행 성공을 주장하지 않음. 진행률 기준 3/8 단계 유지.

### 실제 Public SOURCE_ONLY 수신 검증 및 오진 분류 수정 — 2026-11-28
- 실제 운영 PC `automation-status.mjs` readback (01:50:20 KST): 설치 유지보수기 `3bed26ecabde1ac9046e000b1b32d912fa1ab53b`, `maintenanceFilesVerified=true`, `receiverStatus=PUBLIC_SOURCE_ONLY`, 관측 약 50초 전, Receiver PID 일치, `diagnostics=[]`, `installLock.held=false`, `operationalWrites=0`. Controller `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2` 정상, Supervisor 소유자/자식6/heartbeat 검증, Runner 6개 온라인·유휴, Watchdog HEALTHY, Standby READY. **독립 C급 유지보수기 설치 및 Public metadata-only 수신은 운영 실측 완료**. [Issue #68 근거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223794770).
- `maintenanceState=UNVERIFIED`의 실제 소스 원인: 진단 함수는 receiver `LISTENING`만 HEALTHY로 인식했으나 Public은 보안상 `PUBLIC_SOURCE_ONLY`가 정상. [제어 PR #4252](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4252) merge `86edae7f8022cacdfb1a121484e3feda7bced227`, [CI #46037278715](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46037278715) 성공, `automation-status` 37/37 PASS. Public 상태를 `SOURCE_ONLY_VERIFIED`로 구분하지만 `automationState=PARTIAL_OR_UNVERIFIED` 및 Public B 제한은 그대로. 새 소스 GitHub 병합과 운영 설치는 구분하며, 실제 PC 검사당시의 출력은 그대로 보존.
- 다음 작업은 소스 진단 추가가 아니라 별도 인증이 필요한 **Controller 4파일 B 운영 적용/현장 CAS·백업·복구** 및 설치 후 `pc-job.yml` Public A 활성화 순서 확보, 신규 `runner-smoke` 정상 실행/JSON·TXT 대조. 기존 C PASS·UNKNOWN·상태 진단 재실행을 새로운 완료조건으로 만들지 않는다.

### Public A 설치 전 구버전 실행 위험 최소 수정 — 2026-11-28
- [제어 Draft PR #4253](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4253) source HEAD `91d2521592db813cde28c6f196c86ed79c6f1326`, base=`main`, **미병합**. Public owner A 워크플로 최초 단계에서 운영 설치 `host.json.controllerSourceSha=20d5bbbf305531dca9bf5b74744df83daf37cf17` + `controller/common,entry,preimage-manifest-stager,upload` 4파일 실제 원본 SHA256 및 symlink 없음 확인 후에만 stager/entry/always uploader를 허용한다. 구버전/변조/누락 시 기설치 Private Controller 실행·공개 원자료 송출 없음. 기존 Private Job 및 GitHub-hosted 관측은 동일. 이 가드는 B 효과 인증/운영 설치의 대체물이 아니다.
- [hosted Source CI #46039195091](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46039195091) 정확 HEAD Windows+Ubuntu **SUCCESS**, Windows 실제 임시 CMD 방식 누락 호스트 **exit 2, stdout/stderr 빈값** 시험 PASS. 기존 PR base Draft는 GitHub CI의 main-only 원본 검증에 차단됐으며, 보안 조건을 완화하지 않고 main 기준 새 **Draft**로 전환 후 시험함. Private self-hosted 운영 시험은 SKIP; 실제 PC 영향 없음. [Issue #68 증거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7224064921).
- **현장 여전히** 설치 Controller `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`, 유지보수기 `3bed26ec...` 수신 정상. Public B `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED`의 별도 인증과 4파일 CAS/lease/backup/rollback·Supervisor 보호·workflow cutover 순서 확인 전에는 PR #4253와 기존 #4232를 병합/운영 활성화하지 않음. 신규 `runner-smoke` 실제 결과는 아직 없음. 업무 종단 3/8단계 유지.

### 4-6 Public A Workflow `main` 통합 및 실제 Run — 2026-11-28
- **정규 통합 완료**: [PR #4254](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4254) exact 2파일 → 제어 `main@85be0582a57606434ffe2f02f7bddc662d3e3fa5`. 신규 `public-approved-a`는 고정 repo/owner Issue 신원과 최초 `host.json` 설치 SHA `20d5bbbf305531dca9bf5b74744df83daf37cf17`·4파일 SHA256를 확인한 후에만 고정 A entry/업로드 진행. 기존 Private PC Job 및 Public GitHub-hosted readonly Job는 원본 그대로 유지. [source CI #46040126376](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46040126376) SUCCESS; 이전 후보 [Windows·Ubuntu CI #46039195091](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46039195091)로 CMD 부정값/무출력 검증 재사용.
- **실제 owner Issue #4255** `pc-stage4-activation-4254-20261128-01`: [Run #46040328689](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46040328689)에서 `public-approved-a` 실제 **`zgmini-pc-06` 배정**. 현장 기존 Controller SHA 때문에 설치본 preflight FAILURE, stager/entry/uploader **전부 SKIPPED**, legacy Private job SKIPPED. 실제 승인 A worker 실행/출처 업로드는 **없음**. 한 번 생성한 원 요청 재실행 금지. labeled 중복 이벤트 Run #46040328231 모두 SKIPPED.
- **실제 이벤트로 발견·수정한 GitHub-hosted 문제**: #4255 Public readonly `PUBLIC_PC_JOB_ISSUE_IDENTITY_DENIED` (필수 아닌 상위 `event.number` 요구). [PR #4256](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4256) main `7d3a2513c2c516c2a864d8c9658ccf3b00094213`에서 필수 `event.issue.number` 검증과 계정·라벨 보호를 유지하면서 실제 GitHub 공식 Issues webhook 구조를 수용. [CI #46040608600](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46040608600) SUCCESS.
- **새 고유 검증 Issue #4257** `pc-stage4-readonly-confirm-4256-20261128-01`: [Run #46040782051](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46040782051)에서 hosted `public-readonly-intake` SUCCESS/`CANDIDATE_ONLY`/`PUBLIC_PC_JOB_READONLY_CANDIDATE`, `executionAuthorized=false`, `controllerBAuthorized=false`, `operationalWrites=0`. 같은 Run `public-approved-a` 실제 **`zgmini-pc-04` 배정**, 설치 구버전 preflight 실패, stager/entry/uploader 전부 SKIPPED. labeled 중복 Run #46040783918 전체 SKIPPED. 원래 소스 SHA·실행 결과를 절대로 PASS로 소급하지 않는다.
- **4-6 정확 판정**: Public 저장소 최신 main의 Workflow 통합·GitHub Events 접수·실제 Windows Runner routing·구버전/민감 실행 차단 및 hosted readonly 처리 **DONE**. 전체 8단계 중 4단계 소스/운영 Admission·Guard 완료 **4/8(50%)**. 이는 **7단계 A worker 실행 PASS가 아님**. 설치 Controller 아직 `3c7d4cfe...`, Public B 효과 `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED` 그대로. 원본 로컬 JSON/TXT 및 원격 안전 공개 결과는 새 Controller 실설치 이후의 작업.
- 원본 증거: [제어 Issue #68/7224280130](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7224280130). 과거 Draft #4232/#4253는 변경/보안 계약을 재검토하지 않고 중복 병합하지 않는다.

### 5단계 정확한 Public Controller 설치 계약 준비 — 2026-11-28
- **원래 설치 불가능한 사후검사 원인 수정:** 독립 설치기 `tools/update.mjs`는 고유 `PC Update <requestId> postcheck` 제목으로 Owner A postcheck를 생성하지만 Public `pc-job.yml`은 정확 `pc-job` 제목만 받던 구조였다. [PR #4258](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4258) main `9b12c27a341fe3f982e93a631497bdf23547d371`, [hosted CI #46042084726](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46042084726) PASS: 기존 `pc-UUID` 또는 `pc-update-UUID` 요청의 본문 `<id>-postcheck`, 정확 title+기존 허용 A 진단만 Owner Public Workflow/Controller에서 수용. 기존 Private·Public B 보호·결과 축약 무변경.
- **이전 4파일 선택 통합 `20d5bbbf...`는 이제 최종 후보에서 제외**: 새 사후검사 진입 확인 코드가 없어 설치 후 실제 postcheck를 통과할 수 없음. 기록은 보존하되 설치를 요청하지 않는다.
- **신규 정확 4파일 후보 `555f95708984580cd7d5a0fd05a80b718e867710` 생성**: 브랜치 `codex/public-a-controller-postcheck-selective-20261128`, 단일 부모는 실PC 마지막 관측 Controller `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`. diff는 `controller/common.mjs` (raw SHA256 `9e940a92c0f3ac332ba4d8a5d52b4bac0d647340bdb30863e2628b5b70d27083`), `entry.mjs` (`1874aa1b0b9c6ce109a15737a608a711b81aecb7e3bdcc475032be8b54c1dca7`), `preimage-manifest-stager.mjs` (`806950791803cfc9a1fb387dfdbc4b74757304c48df20e90a2d9b76d52c8cf10`), `upload.mjs` (`a0a6065c7f2fd8f816e6b0a9efd9e7aba14e990bd0336aadc6b0be74baaefe8e`)만. 동일 main 원본 blob/전이 import closure·기본 설정·engine·Supervisor 불변.
- [PR #4259](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4259) → main `197e06b13287fb2e4a869d1d3e764756ecf119b4`, [CI #46042593781](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46042593781) SUCCESS: Public A Workflow의 설치본 사전검사 SHA/4파일 해시를 새 후보로 고정했고 기존 구형 Controller 실행 차단은 그대로. 신규 `drafts/controller-public-a-postcheck-selective-candidate-20261128.json`에 `approved=false`/`publicBEffectAuthorized=false`/`operatingPreimageRawCasVerified=false`/미설치 명시. **source 검증 통과와 운영 설치 승인·실제 CAS 확인은 별개**.
- **실제 차단**: 독립 설치된 유지보수기 `3bed26ec...`는 Public에서 `PUBLIC_SOURCE_ONLY`만 수신, B Issue에 `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED`를 반환. 기존 Owner `tools/maintenance-request.mjs`도 Private 저장소 인증 조건이라 Public B 요청 제출 불가. 새 target에 대한 정규 `approvals/controller-selective-targets/<target>.json`, `approvals/controller-updates/<target>.json`는 main에 없고 별도 effect-specific 인증 승인·업로드 경로 및 최신 on-host 원본 CAS·lease 관측도 없다. **승인 없는 B 인가 manifest를 작성하거나 수신기 보안을 삭제하지 않음**.
- 기존 `tools/update.mjs`의 안전한 적용 순서는 별도 인증+원본 CAS·원장 → staging → Public Workflow pause → 6 Runner/업로드 drain+lease → snapshot/보호 readback → 독립 Supervisor owner 정확 stop/4파일 교체/6 Runner reconnect → Workflow resume/backlog 보존 → 기존 고유 postcheck 최초 1회 실행·원본/공개 결과 비교 → 필요 시 정규 rollback. 현장 실제 B 적용은 미실행, 건강한 6 Runner/Watchdog/Standby·DB/D1·UNKNOWN 보존. [Issue #68 실증/차단 근거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7224557021).
- **완료 판정**: 5단계 SHA/4파일 원본·소스 검증 및 사후검사 연결 후보는 완료, **B 별도 운영 승인·인증된 독립 Windows 적용 경로·직전 CAS 미확보로 5단계 미완료**, 전체 **4/8(50%)** 유지. 4-6 Public A 접수·조기 실행 차단은 실Run 완료, 그러나 목표 설치 후 A PASS 아님.

### 당시 다음 실제 필수 실행(복구 전 역사 기록, 재실행 지시 아님)
1. **유지보수기 독립 C급 handoff 이미 완료**: 사용자 제공 Windows 실행 원본에서 `status=PASS`, `code=STOPPED_RECEIVER_HANDOFF_AND_WINDOWS_ORIGIN_VERIFIED`, 교체 source `feaf0a380890663d8881881bea63587576188c76`. [Issue #68/7223128772](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223128772). 동일 인계 **재실행 금지**. 이는 인계 시점 Receiver origin 검증이지 이후 지속 `PUBLIC_SOURCE_ONLY` poll 검증은 아니다. 정상 Supervisor·Runner·Watchdog는 변경하지 않는다.
2. **Public Controller B 설치 효과 승인·인증 경로가 별도 필요**: 현 유지보수기 `3bed26ec...`는 `PUBLIC_SOURCE_ONLY`이며 `PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED`를 유지한다. 정상 Supervisor·Runner를 일괄 중단하지 않고 새 Controller 4파일 선택적 적용을 위한 host/file CAS·owner·lease·스냅샷·복구 조건 및 별도 인증된 적용 경로를 확보한다. **Public A Workflow는 위 4-6에서 이미 활성화됐으나** 운영 Controller가 구버전이면 설치본 검사에서 안전하게 차단된다. 따라서 B 설치 후 postcheck Issue 최초 이벤트에서 가드를 통과하는지 검증해야 하며, C 인계를 B 권한으로 재해석하지 않는다.
3. **이미 활성인** Public A Workflow가 실제 target Controller 설치 뒤 정상 `runner-smoke`를 수행하는지, 새 고유 Owner A 한 건에서 Run/Job/seat·Supervisor owner 검사·로컬 JSON/TXT·공개용 안전 projection 원격 readback을 대조한다. 기존 구버전 차단 시험 Issue #4255/#4257은 재실행하지 않는다.
4. 유지보수기 `PUBLIC_SOURCE_ONLY`는 B `LISTENING`과 구분하고, B effect는 별도 승인 전 HOLD한다. 기존 UNKNOWN #3947/#4069/#4156 미재실행, Supervisor·Runner6·Watchdog·Standby2·원장/SQLite/D1 변경 없음 확인 후 실제 재개 범위만 닫는다.

최신 중앙 원장 [#68/7223430357](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7223430357). 사용자에게 임의 CMD 반복이나 추가 장애 주입 시험을 요구하지 않는다.

## 6. 과거 완료 판정(복구 전 당시 기록)
당시: Supervisor/6 Runner/Watchdog/Standby2 운영 정상 관측 + 공개 Windows CI 격리시험 + **Public 유지보수기 독립 인계 실제 PASS(해당 시점 신규 Receiver 출처 검증)** + Public-safe Controller 소스 main 반영 + 정확한 4파일 선택 통합 후보·source-only 회귀시험 완료.
**당시 마지막 완료:** 유지보수기 `3bed26ec...` 독립 Windows C 인계 PASS 및 Public SOURCE_ONLY 실측, Stage 4-6 Public owner A Workflow `main` 병합·GitHub 실Run·Windows Runner 배정·구버전 차단·hosted 후보 정상 readback까지 확인. **최종 정상 A 업무 미복구:** Controller 4파일 `20d5bbbf...` 실제 B 설치 효과 인증/현장 CAS·백업·복구/실행, 설치 후 최초 owner A 정상 PASS, 로컬 원본 및 원격 안전 JSON/TXT 회수. Public B 효과 계속 HOLD. 4/8단계(50%)지만 종단 기능 복구가 아님.
문서·CI·main 병합만으로 실제 PC 자동 업무 재개 또는 전체 HA 완료를 선언하지 않는다.
