# ZGMINI 보조 Controller S6 잔여 실행계획 R4

- 작성일: 2026-11-27 KST
- 책임: 프로세스 총괄
- 계획 정본: `ansqhd5774-Choi/zgmini` / `codex/controller-ops-lessons-20261105`
- 구현·운영: `ansqhd5774-Choi/zgmini-pc-control` / 실제 변경 전용 브랜치
- 원안: [R3 실행계획](CONTROLLER_STANDBY_R3_EXECUTION_PLAN_20261126.md), [R2 연구](CONTROLLER_HA_RESEARCH_PLAN_R2_20261126.md)
- S6 원본 효과: [#3947](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3947), 별도 #4019. 기존 requestId 재실행 금지.
- 종료 목표: **실제 운영 장애 전환 → 신규 Active 1개 → 6 Runner 재연결 → 기존 원장 보존 → 새 승인 A 작업 PASS → 정상 복귀**, 실제 독립 영수증 1/1.
- 작성 시점 실제 S6 전환 실증: **0/1**. 계획·CI·운영 설치·실제 전환을 혼동하지 않는다.

## 1. 보존할 완료 증거와 기준 상태

| 항목 | 확인 증거 | 이 계획의 처리 |
|---|---|---|
| S1~S4 Standby/단일 Watchdog/Windows 격리 | R3 구현 및 Windows 격리 시험 이력 | 변경·상충 범위만 회귀시험 |
| S5 R5 1+2 구성 | #3916 `PASS/WATCHDOG_R5_ACTIVE_HEALTHY_TWO_STANDBY_IPC_READY` 당시 실측 | 과거 PASS 보존, 현재 상태는 별도 조회 |
| 유지보수 7→7 운영 인계 | #3914, #3917 및 #4035 정책-only 후속 원본 확인 | 안전한 동일 설치 체계 재사용 |
| 신규 Controller 정상 설치 | [#4036](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4036) `SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED` | 다른 기능의 승인된 새 source 보존 |
| 신규 Controller 후속 독립 A | [#4041](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4041): `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`, files verified; Runner #04 busy(해당 시각) | 시각 고정 증거, 현재 idle 증명 아님 |
| S6 사전검사 실패 | [#4042](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4042): `S6_A_WATCHDOG_HEARTBEAT_UNVERIFIED` | 시각·원인 분리, 안전기준 우회 금지 |
| R5 런타임 A 실패 | [#4043](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4043): `WATCHDOG_R5_STAGE_OR_CONTROLLER_SOURCE_UNVERIFIED` | 역사적 고정 source pin과 현행 Controller 차이 조사 |
| 기존 S6 B | [#3947](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3947) `UNKNOWN/S6_ONCE_OUTCOME_UNKNOWN`, [#4019](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4019) `BLOCKED/S6_RELATED_WORK_OR_LEASE_UNVERIFIED` | 기존 claim/journal 및 효과 결과를 먼저 구분 |

기준 시점 설치 원본 후보:
- Controller `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2` (#4036/#4041)
- 유지보수기 origin `5a85f803fd9cb280561395f88a3544ee8e7d4660` (#4041; 7파일 검증)
- 기존 W06 Controller `182bb46f2838306ba40d8b4ec32bac40ab75b69a`는 **현재 승인 B 대상 아님**.

실제 최신 설치·출처는 반드시 작업 직전 기존 read-only A 및 독립 설치 영수증으로 대조한다. git `main` HEAD는 설치 증명이 아니다.

## 2. S6-01 — 현행 Controller·R5/S6 소스 핀 정합성

**입력:** #4036 B manifest / 변경 2파일 SHA-256 / 사후 #4041 결과, `watchdog-b/standby-r5-contract.mjs`, `tools/pc-process-inventory-readonly.mjs`, 기존 S6 승인 파일·회귀시험.

1. 정상 설치된 새 Controller의 정확한 7+파일 roster와 변경 2파일, owner·보호상태 불변 여부를 대조한다.
2. R5 *설치용* 고정 승인 contract와 *조회용* 운영 probe를 구분한다. 과거 immutable B 승인이나 역사적 설치 SHA를 변경하지 않는다.
3. 읽기 전용 A의 역사적 Controller pin이 신규 정상 설치를 허위 실패로 판정하는 조건이 입증되면, 정확히 허용된 신규 설치 source와 파일별 digest를 **별도 검증된 roster**로 추가한다. 범용 SHA 허용·파일 수/무결성·PID·freshness 보호 완화 금지.
4. 로컬/CI에서 (a) 종전 승인 설치, (b) 신규 정상 설치, (c) 임의 SHA·파일 변조·누락, (d) stale 상태·중복 owner를 구분하는 회귀시험을 수행한다.
5. 해당 소스 변경은 제어 저장소 **전용 브랜치 → PR → CI → 통합**으로 처리하며, 운영 Controller/Watchdog 재설치와 구분한다.

**완료:** 현행 Controller의 읽기 전용 판정만 정상이며 안전상 결함을 가리지 않는다. 실제 A 재조회 PASS는 별도.

## 3. S6-02 — Watchdog heartbeat/Standby 실제 원인 검증

**입력:** #4042/#4043 정확 A JSON/TXT, `status.at`, Watchdog owner/heartbeat 실제 기준시각 및 PID, 원본 운영 R5 진단 함수.

1. `S6_A_WATCHDOG_HEARTBEAT_UNVERIFIED` 발생 단계와 `status.at` 대비 관측 시각 차이를 확인한다.
2. 실제 갱신 정지, 일시 race, 상태 읽기 지연, 버전 판정 차이 여부를 독립 증거로 구분한다.
3. 기존 정상 Watchdog/Guardian 실행을 무조건 중단·재시작하지 않는다.
4. 실제 소스 결함이면 최소 수정→관련 회귀 CI; 시각 경합이면 새 고유 A **필요할 때만 단회** 조회한다.
5. Watchdog HEALTHY, 올바른 owner/heartbeat, 두 Standby READY/독립 PID/IPC, 이전 Active fencing 조건 확인.

**완료:** 관련 안전 조건을 그대로 통과한 fresh A 결과. 미확인이면 S6 effect 보류.

## 4. S6-03 — 관련 업무·lease·6좌석 유휴 사전검사

1. 실시간 기존 A 조회로 `relatedLeaseCount=0`, `relatedLeasesAbsent=true`, 관련 in_progress/queued/waiting=0과 `pendingWorkCount=0` 검증.
2. 설치 lease 미점유, Workflow active, Controller intake/drain/Watchdog pause 정상 확인.
3. Runner `zgmini-pc-01`~`06` 모두 online 및 busy=false 관측. #4041의 #04 busy 과거값을 현재값으로 사용하지 않는다.
4. 동일 승인 실행의 독립 B `PRE_DRAIN` 경계에서 소유권/원장/CAS를 다시 검증한다.

**완료:** 정확한 효과 시점에 `S6_PRE_DRAIN_OBSERVED_NO_EFFECT` 조건 충족. 업무 강제종료로 idle을 만들지 않으며 무관 업무는 계속 허용.

## 5. S6-04 — 현재 운영 설치에 일치하는 신규 단회 B 계약

1. #3947의 `UNKNOWN` effect/claim/journal 및 #4019 `PRE_DRAIN BLOCKED`의 정확한 후속 상태를 개별 추적한다. 실행 사실이 미입증인 기존 claim은 재발행하지 않는다.
2. [정규 승인 schema](https://github.com/ansqhd5774-Choi/zgmini-pc-control/tree/main/approvals/controller-s6) `ZGMINI_PC_S6_ONCE_B_APPROVAL_V1`를 재사용한다.
3. 현행 Controller·maintainer·Watchdog source·protected sha·owner sha·PID·두 Standby PID와 원문 바이트 SHA, 정확한 scope 및 백업·복구 조건을 같은 시점으로 고정한다.
4. 기존 승인 효과를 재사용할 수 있는지 보안/운영 scope를 검토한다. 범위 밖 신규 효과는 별도 승인을 확인한다.
5. 새 고유 requestId의 **immutable manifest/승인 핀**, CI, main 통합 및 독립 유지보수기 실제 수신 조건을 검증한다. 고정 approval 필드 우회, 일반 Runner에서 B 우회 실행 금지.

**완료:** 유효한 새 B 원본과 그 정확한 원문·시점의 CAS/lease 충족. 명세만 작성하면 운영 완료 아님.

## 6. S6-05 — 정규 단회 B 운영 전환

실제 승인·유휴·독립 maintainer 조건이 모두 성립할 때 **1회**:

1. `PRE_DRAIN` 안전 판정 후 고유 요청 영속 claim 기록.
2. 기존 Controller intake pause → 관련 작업 drain, 기존 protected 원장 snapshot 확보.
3. 오직 승인된 구 Supervisor 소유 트리 중단; 여섯 구 Runner child 및 실제 Listener/Worker WMI 잔류 여부 확인.
4. 정규 lease 소유자만 해제, Watchdog 자동 승격 경로 복귀.
5. 새 Active가 과거 승인 Standby PID 중 하나임을 확인하고, owner nonce 갱신·과거 owner fencing·원장 보존 확인.
6. 중간 `UNKNOWN`에서는 신규 B 재발행 금지. 기존 claim/phase·프로세스·원장·보호상태 우선 재조회.

**완료:** 정확한 운영 S6 전환 증명. `POSTCHECK_PENDING`이나 단계별 코드만으로 최종 PASS 주장 금지.

## 7. S6-06 — Runner 업무 재개·복귀·최종 readback

1. 새 Active 유일성, 6 Runner online/정상 수신·실행, 이전 owner stale 차단 확인.
2. 기존 requestId/ledger/receipt 보존과 동일 효과 중복 실행 0 확인.
3. 승인된 A급 읽기 요청 **1개** 신규 requestId로 실행하여 `PASS`, JSON/TXT 2/2 및 운영 상태 연계 확인.
4. Watchdog/Workflow/maintainer/lease/protected source가 정상 복귀했는지 독립 A readback.
5. 실제 단계별 시각으로 detection/failover/first job PASS 시간 계산. 유효 표본이 없으면 RTO/p95/CPU/RAM은 `미측정`.
6. #3947 및 신규 B Issue/Run에 완료/UNKNOWN 분리 기록, 진행 원장 갱신.

**최종 완료 조건:** 실제 S6 1/1 + 유효 Active 1 + 6 Runner 정상 + 새 A 업무 PASS + 원장/보호 유지 + 정상 복귀 + 운영 JSON/TXT·Issue·Run 증거.

## 8. 진행·STOP 규칙

| 항목 | 2026-11-27 시작 상태 | 완료 증거 |
|---|---|---|
| S6-01 source pin 정합 | 진단 진행 전 | 정확 diff·roster·테스트·CI |
| S6-02 heartbeat/R5 | #4042/#4043 unknown | fresh operating A·원인 검증 |
| S6-03 related leases/idle | #4032 과거 PASS, #4041 #04 busy | 실행 직전 PRE_DRAIN |
| S6-04 신규 B manifest | 이전 SHA 고정·실효 없음 | 현재 CAS·별도 승인 source |
| S6-05 단회 승격 | **0/1** | supervisor stop/Watchdog promote 원본 영수증 |
| S6-06 원장·신규 업무·복귀 | **0/1** | 6/6, fresh A PASS, JSON/TXT 2/2 |

종료/보류: split-brain, Owner/PID/nonce/source/manifest 불명확, 동시 파일·설치/lease 작업, Runner busy, Worker 종료 미입증, 기존 claim 결과 UNKNOWN, 승인 scope 차이, 운영 데이터 보호 위반 시 **해당 S6 효과만 STOP**. 기존 정상 업무/Controller/Writer/SQLite/D1/Cloudflare/예약·기타 담당자 변경은 보호한다.

**실행 우선순위:** S6-01 → S6-02 → S6-03 → S6-04 → S6-05 → S6-06. 읽기·소스 검증은 충돌하지 않으면 병행, 공용 자원 쓰기 및 실제 B는 직렬화. 불필요한 새 서버/서비스/Runner/Cron/quorum/유료 서비스/두 번째 추가 Standby 도입은 완료조건이 아니다.

**현재 종단 완료율: S6 0/1.** 진행 원장과 최종 운영 readback 없이는 계획 완료를 프로젝트 운영 완료로 표현하지 않는다.

## 9. 2026-11-27 실제 작업 전진 — S6-01 소스 수정

- 총괄 계획 원격 반영 커밋: `881226625b4a34fc9f9baae238e1f82b662300b1`.
- 정확한 소스 결함 확인: `tools/pc-process-inventory-readonly.mjs`의 R5 read-only 판정은 과거 W06 Controller `182bb46f...`만 허용했다. #4036 승인된 현재 Controller `3c7d4cfe...`는 `controller/operations.mjs` 교체와 `controller/us-breadth-r2-private-readonly.mjs` 추가 때문에 #4043에서 `WATCHDOG_R5_STAGE_OR_CONTROLLER_SOURCE_UNVERIFIED`로 거부된다. 해당 오류는 **진단 pin 불일치의 근거**이며 Watchdog 실제 고장이나 S6 B authorization 여부의 직접 증거가 아니다.
- 정확한 작업 브랜치: `zgmini-pc-control/codex/controller-s6-r5-runtime-pin-20261127`; [PR #4045](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4045), 현재 확인 HEAD `7aad7fb501c86ac908023e856899d2fe7e084946`.
- 변경 파일 **2개**: `tools/pc-process-inventory-readonly.mjs`, `tests/pc-process-inventory-readonly.test.mjs`. #4036 승인 manifest의 2개 정확한 file SHA-256과 변경 후 source SHA만 추가 허용하며 기존 W06 roster, 모든 PID/READY/heartbeat·installed source/owner 검사는 유지한다. `__proto__` 등의 임의 source 문자열은 명시적 비교로 거부. 신규 정상/누락/변조/임의 source/오래된 heartbeat 회귀시험 작성.
- Watchdog R5 **역사적 B 계약** `watchdog-b/standby-r5-contract.mjs`, Controller 운영 설치 source, Watchdog 실파일, S6 B 승인 원문 및 기존 #3947/#4019 effect는 **변경·재실행하지 않았다**.
- **완료 증거 범위:** 소스/회귀시험 브랜치 커밋·PR 생성 완료. PR 최신 HEAD의 CI/병합, 운영 A #4043 원인 해소 readback, S6 #4042 heartbeat 원인, 신규 B 효과 및 실제 승격은 **아직 미완료**.
- **다음 필수:** PR #4045 정확 HEAD CI 회수 → 소스 결함이면 최소 정정 → 검증 통과 후 충돌 없는 통합 → 기존 Read-only A 신규 고유 요청(필요한 경우만)으로 현재 Watchdog 실행 상태 재확인 → S6-02 heartbeat 기준 시각 원인 분해. S6 0/1 유지.

### 2026-11-27 S6-01 exact-head 회귀 CI 및 S6-02 초기 원인 분리

- PR #4045 최신 HEAD `f697d7f5291ef5f30ff055b2f602fe19f41cdfdb`. 첫 CI에서 신규 fixture의 stale STATUS 시각을 Watchdog Owner 시작보다 **이전**으로 설정해 `WATCHDOG_R5_NATURAL_RESTART_PENDING`가 먼저 발생하는 **테스트 입력 오류**가 확인됐다. 제품 코드 오류나 런타임 실패가 아니었다. STATUS를 owner 생성 이후이면서 60초 초과 신선도 지연인 `2026-11-26T01:10:40Z`로 변경해 해당 순서 오류를 정정.
- [C996 exact-head Run #45876810983](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45876810983): `completed/success`. 신규 read-only 인식 + 변조/누락/임의 ID/오래된 STATUS 거부 시험이 포함된 동일 HEAD. 다른 두 CI는 그 시점 **미완료**, 3/3이나 병합을 주장하지 않는다.
- 승인 #4036의 정확히 2개 변경 SHA-256과 PR 수정 소스 pin을 교차 대조함: `controller/operations.mjs` `bac7412c...`, `controller/us-breadth-r2-private-readonly.mjs` `e5f1d876...`. 역사적 `watchdog-b/standby-r5-contract.mjs`는 `main`과 변경 브랜치에서 동일 blob.
- S6-02: 설치된 R5 Watchdog `45807c661ee7f5f11a20b5780e6fd31116b24f84`의 상태 쓰기는 `STATUS.json.at` 현재 시각, `tick` 주기는 **15초**. S6 A `projectS6ApprovalPreimageReadonly`은 heartbeat age **45초 미만**을 요구. #4042는 age가 45초 이상/미래/비정상 중 어디에 해당하는지 원시 시각을 기록하지 않았으므로 **원인 미입증**. #4043의 `statusFresh=false`는 Controller source mismatch 이후 기본값이어서 실제 오래된 heartbeat 증거로 사용 불가.
- **다음:** 나머지 2개 CI가 동일 HEAD에서 완료되면 PR 통합 여부 판단. 실PC A readback과 실제 S6 효과는 별도 승인·안전 조건이 충족될 때만 실행. 운영 S6 0/1.

## 10. 2026-11-27 S6-01 정확 HEAD CI 3/3 및 정규 main 통합

- 제어 저장소 [PR #4045](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4045) 정확 HEAD `f697d7f5291ef5f30ff055b2f602fe19f41cdfdb`의 C996 [Run 45876810983](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45876810983), Secret Scan [Run 45876810978](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45876810978), Process Inventory Source [Run 45876811111](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45876811111)이 **모두 completed/success (3/3)**.
- 그 사이 다른 작업으로 `main`이 전진했으나 두 변경 파일은 다른 변경과 겹치지 않음을 blob·diff로 확인했다. 정확 HEAD 지정 정규 **squash merge PASS**, merge SHA `b129b9bafda689222e70cb9dbe6650111b6754d4`. 새 `main`에서 R2 Controller source 및 정확 두 파일 digest 허용을 readback 완료.
- **완료 범위: S6-01 소스 진단 결함 수정·회귀 CI·main 통합**. 역사적 Watchdog B 승인 contract 파일 불변. Controller/Watchdog 현장 재설치 0, S6 효과·Supervisor 종료 0.
- 후속 실운영 read-only A [#4052](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4052), 새로운 고유 requestId `7b91ae42-6732-4f18-a9c0-2bd94e53ab71`, `controller-standby-r5-runtime-readonly`를 **1회** 생성. 원본 #4043 재실행 없음. 아직 실제 결과 원장·JSON/TXT readback 확인 전이므로 운영 R5 통과·S6-02 heartbeat 해결 주장 금지.
- **다음 필수:** #4052의 실제 Workflow Run 및 A `status/code`·JSON/TXT readback 회수 → Controller source pin PASS와 신선도/Standby 신원 판정 분리 → 필요하면 S6 승인 후보 고유 read-only A와 기존 관련 idle/lease 상태를 확인한다. 새로운 S6 B 승인·실효 전환은 별도 안전 preimage 이후 진행한다. S6 종단 0/1 유지.

## 11. 2026-11-27 S6-02 실제 Watchdog 상태 원인 분리 시작

- 현장 읽기 전용 A [#4052](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4052) / [Run #45877539338](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877539338) 결과 JSON/TXT 2/2 재조회: `2026-11-26T18:40:13.638Z` `STATE_UNKNOWN/WATCHDOG_R5_HEALTH_STATUS_UNVERIFIED`. `installedMatch=true`, `controllerTargetMatch=true`, `naturalRestartObserved=true`, `statusFresh=true`, `watchdogOwnerVerified=true`. 최초 Controller pin mismatch #4043은 **운영 읽기 전용 진단 기준에서 해소**되었음.
- #4052의 이후 `activeSupervisorVerified=false`, `standbyReadyCount=0`는 조기 반환 기본값으로, 실제 운영 Active/Standby 0개라는 증거가 아님. WATCHDOG_R5_HEALTH_STATUS_UNVERIFIED 시점의 소스 분기상 신선도는 TRUE이므로 `status.state !== 'HEALTHY'`가 관측된 범위의 직접 실패 조건. 실제 `status.state` 값은 결과 JSON에서 공개되지 않아 PAUSED/BLOCKED/STARTING 여부 미확인.
- 기존 READ_ONLY A 완료 자체는 정상 영수증으로 종결, #4052 `closed/completed` 처리. S6 효과 원본 #3947은 유지.
- 원인 구분용 최소 소스 변경: 제어 저장소 `codex/controller-s6-r5-health-state-20261127` [PR #4054](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4054), 작성 HEAD `490f458b077d364d57740521b2f407eb57225ce7`. R5 A의 이미 검증된 Watchdog owner/STATUS 신선도 이후에만 설치된 R5 Watchdog 코드에서 사용된 고정 상태 enum(`PAUSED`, `BLOCKED_LIVE_OR_UNKNOWN` 등)을 `watchdogHealthState`로 제한 반환. 알 수 없는/raw 값은 `UNRECOGNIZED`, stale은 `STALE_OR_UNVERIFIED`만 반환. 임의 PID·nonce·파일 경로·환경/비밀 미반환, Runner/Workflow/Controller/Watchdog 실제 쓰기 0.
- 역사적 Watchdog/S6 B 승인, 45초/60초 heartbeat, owner/fencing/IPC/READY 안전 검사 불변. 같은 코드에서 상태 원인을 추측하여 기동/강제종료하지 않음.
- **다음:** #4054 exact-head C996/Process Inventory/Secret 3/3 및 병합 검증 → 필요시 새 고유 R5 read-only A **1회**로 실제 상태 enum 판정 → 최초 실패 조건에 맞는 최소 수정 또는 현장 자연 복귀 readback. 종단 S6 0/1 보존.

## 12. 2026-11-27 S6-02 원인분류 PR #4054 CI 진행

- 제어 저장소 [PR #4054](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4054), exact HEAD `490f458b077d364d57740521b2f407eb57225ce7`, 변경 2파일만 포함. 허용된 Watchdog 상태 분류를 A 운영 결과에만 추가하고 owner 검증 이전·임의 raw state는 공개하지 않는다. R5/S6 B 승인, Watchdog/Runner/Controller 운영 source, heartbeat 기준 불변.
- [C996 R5 Readonly Source Checks Run #45877954112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877954112): **completed/success**. 동일 HEAD의 [Process Inventory Source Run #45877954098](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877954098) 및 [Secret Scan Run #45877954178](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877954178)은 **queued**. 3/3 미완료이므로 임의 병합/운영 A 재실행하지 않음.
- 기존 [#4052](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4052)는 실제 `STATE_UNKNOWN/WATCHDOG_R5_HEALTH_STATUS_UNVERIFIED`, JSON/TXT readback 2/2 후 **조회 목적 완료로 closed**. 원본 S6 #3947은 UNKNOWN 및 실제 failover 0/1로 유지.
- 다음 필요 행동: 남은 두 CI가 completed이면 exact-head 3/3 및 main 소스 검증·병합 → 새 고유 A로 실제 health-state 단회 재관측 → 확인된 상태의 실패 조건만 수정. 두 CI가 계속 queued이면 같은 검사를 재실행·별도 Runner 신설하지 않고 대기 사유 확인. #3947 원래 B requestId 반복 금지.

## 13. 2026-11-27 S6-02 실제 상태 분류 코드 3/3 PASS 및 통합

- [PR #4054](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4054), exact HEAD `490f458b077d364d57740521b2f407eb57225ce7`: [C996 #45877954112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877954112), [Process Source #45877954098](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877954098), [Secret Scan #45877954178](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877954178) **3/3 completed/success**.
- R5 read-only source·test 2파일만 변경해 exact HEAD 지정 정상 **squash merge SHA `8e5f4dbee080c9b25ff06c5050d3d136fefec6ff`**, main에 `watchdogHealthState` 고정 enum 존재 readback. 기존 B 계약/안전판정 임계치·운영 source 변경 0.
- 새로운 Owner read-only A [#4058](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4058) 고유 requestId `48aef0a2-73bd-48cd-916a-84f7ca124d22`, `controller-standby-r5-runtime-readonly`, **단 1회 접수**. 원본 #4052 재실행 0. 결과 JSON/TXT/Run은 별도로 회수 후 검증하며 아직 건강 상태 개선이나 S6 승격 성공으로 표시하지 않음.
- **다음:** #4058 운영 실제 고정 상태 enum readback → 허용 상태의 실제 실패 경계·영향 확인 → 필요할 때만 최소 수정/관측 → 관련 lease/Runner 6개 idle 및 B exact CAS 확인. 원본 #3947 `UNKNOWN`, S6 운영 효과 0/1 유지.

## 14. 2026-11-27 R5 실운영 정상화 확인 및 S6 승인 후보 재조회

- 새 운영 A [#4058](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4058), [Run #45878586418](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45878586418): `results/pc-process-inventory-45878586418-1-operating.json/.txt` **2/2 readback**, 관측 UTC `2026-11-26T18:47:03.685Z`, `PASS/WATCHDOG_R5_ACTIVE_HEALTHY_TWO_STANDBY_IPC_READY`, `watchdogHealthState=HEALTHY`. installedMatch/controllerTargetMatch/naturalRestartObserved/statusFresh/watchdogOwnerVerified/activeSupervisorVerified/두 Standby READY = true, `standbyReadyCount=2`, `operationalWrites=0`. #4058은 읽기 완료 `closed/completed`.
- 이 정상 신선도 관측은 이전 [#4052](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4052)의 `STATE_UNKNOWN/WATCHDOG_R5_HEALTH_STATUS_UNVERIFIED`와 **관측 시각이 다른 실제 상태**다. 이전 건강상태 비정상의 최초 원인은 미입증이며 자가 복귀 또는 상황 변화 가능성을 결과로 둔다. 재발 없음 보장 금지.
- #4058의 `failoverTested=false`, `promotionApproved=false`: **S6 실제 승격 0/1**은 여전히 미완료. 임의 B 승인/실행 금지.
- 서로 별개의 다음 A 고유 read-only 2건을 각 1회 접수: [#4059](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4059) `controller-s6-next-preimage-readonly` (승인 후보·CAS·source), [#4060](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4060) `controller-s6-predrain-inputs-readonly` (관련 대기/lease 입력). 각각 결과 미회수 상태에서는 PASS/승인 원본으로 간주하지 않는다. 기존 #3947 UNKNOWN/기존 B requestId 재실행 없음.
- **다음:** #4059/#4060 실제 Run·JSON/TXT 결과 회수 및 단일 시점 범위 검증. 모든 원본 시점/권한/Runner 6석 idle·독립 설치 maintainer 안전 CAS를 확인하고 **이전 #3947 단회 효과 결과 미입증과 구분**해야만 신규 정확 B 효과의 허용 여부를 판단할 수 있다. 동시 Active 및 정상 업무 안전을 최우선한다.

## 15. 2026-11-27 S6-03 사전검사 실측 및 S6-04 현행 CAS 승인 후보

- 운영 A [#4059](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4059) / [Run #45878730994](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45878730994), `results/pc-process-inventory-45878730994-1-operating.json/.txt` **2/2**, 관측 UTC `2026-11-26T18:49:07.437Z` `PASS/S6_APPROVAL_PREIMAGE_CANDIDATE_ONLY`. 승인 후보의 Controller `3c7d4cfe...`, 독립 maintainer `5a85f803...`, Watchdog R5 source·보호 snapshot·Supervisor owner·두 Standby 고유 identity를 정확 바이트로 수집. **A 결과의 `bAuthorization=false`, `independentOperatorAttested=false`, `sixIdleRunnersVerified=false`, `workflowActiveVerified=false`를 보존**. 원문 운영 세부값은 별도 승인 후보 GitHub 비공개 source에서만 취급.
- 운영 A [#4060](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4060) / [Run #45878791152](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45878791152), `results/pc-process-inventory-45878791152-1-operating.json/.txt` **2/2**, 관측 UTC `2026-11-26T18:49:23.807Z` `PASS/S6_PRE_DRAIN_INPUTS_OBSERVED_ONLY`. `relatedLeaseCount=0`, `pendingWorkCount=0`, `workflowCounts.in_progress/queued/waiting=0` (이 결과의 관련 범위만), `inputClearAtObservation=true`; **independentlyAttested=false, bAuthorization=false, replayAuthorized=false**. B 효과 시점에는 반드시 재검증. #4059/#4060 각 조회 목적 완료로 CLOSED.
- 기존 승인 [PR #4016](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4016)의 실제 S6 단회 효과는 변함없으나 구형 Controller `182bb46fe...`/maintainer `20a2939...`/owner CAS 핀으로는 현재 PC와 불일치. 원본 #3947 UNKNOWN과 두 번째 #4019 PRE_DRAIN BLOCKED는 **이력 보존·동일 requestId 재실행 금지**. 고정 ledger 위치 claim 부재 및 receiver UNKNOWN 포트 부재는 **과거 실제 효과 불실행의 완전한 증거는 아님**.
- 제어 저장소 전용 브랜치 `codex/controller-s6-current-b-cas-20261127` [Draft PR #4063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4063)에서 **두 파일만** 추가: 새 고유 requestId `pc-s6-63afb126-72dc-4ec5-a721-4819771fa9ee`의 exact CAS B manifest 원문 `approvals/controller-s6/1fceeba061f7f8731811220b27cac245bd91d44e87d68935cd8475117f094141.json` 및 `tests/s6-current-b-cas-approval.test.mjs`. 허용 효과는 `OLD_OWNED_SUPERVISOR_TREE_ONLY`→기존 Watchdog 자동 승격→Runner/ledger 안전 복귀, forced rollback/retry 없음. **승인 후보만 GitHub 브랜치에 있고 신규 B Issue 발행·운영 효과 0**.
- 정확 HEAD `6118be6e6eaeb4920d615f65b6c9fca337b21d8d`에서 [C996 #45879339784](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45879339784) **SUCCESS**. 독립 S6 시험 4/4 PASS: 기존 승인은 현재 source 불일치로 거부, 신규 정확 manifest 원문 SHA/actor/owner/보호/Standby source drift 거부. [Secret Scan #45879339651](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45879339651)은 기록 당시 **QUEUED/PENDING**. C996 결과를 전체 CI PASS/운영 승인으로 표현 금지.
- 다음 필수: Secret Scan 결과 회수 → Draft PR #4063 최종 보호·승인 범위/변경 2파일 검토 → 정규 ready·병합 여부 결정 → 실제 6 Runner 동시 idle, 독립 maintainer/lease·owner CAS/UNKNOWN 포트 상태를 B 실행 순간 독립 평가 → 불명확하면 새 B 접수 보류. 기존 S6 종단 완료율 **0/1** 유지.

## 16. 2026-11-27 S6 현행 단회 B 승인 manifest 정규 통합

- 신규 고유 S6 승인 후보 [PR #4063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4063) 최종 HEAD `6118be6e6eaeb4920d615f65b6c9fca337b21d8d`: [C996 #45879339784](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45879339784), [Secret Scan #45879339651](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45879339651) 모두 `completed/success`. S6 신규 4개 고정 승인/드리프트 거부 테스트 4/4 PASS. Draft에서 Ready 전환 후 정확 HEAD `squash merge` `d8e0b229129c7a05a965d50930abe43ccb782304`, 변경 2파일만 `main` 통합.
- 현재 B manifest 고정 원문 `approvals/controller-s6/1fceeba061f7f8731811220b27cac245bd91d44e87d68935cd8475117f094141.json`: 승인된 기존 S6 단회 효과와 동일, 새 고유 requestId, 현재 Controller `3c7d4cfe...`·유지보수기 `5a85f803...`·Owner/보호/Watchdog/Standby 고정; `main` readback 완료. 과거 #3947 UNKNOWN 및 #4019 PRE_DRAIN 차단 original 효과를 재발행하거나 승인 핀 덮어쓰지 않았다.
- **승인 파일 병합은 실제 B 실행이 아님.** 현재 #4067 새 고유 `process-inventory-readonly` 일반 운영 A 1건으로 6 dedicated Runner 동시 online/idle 및 운영 source·install lock·Workflow 상태를 실측 요청. 이 A 결과도 확인 당시 아직 미회수. 자연 업무 경합이면 그 실행 시점 B만 보류하며 정상 다른 업무 종료를 강제하지 않는다.
- 다음 필수: #4067 JSON/TXT 및 실제 시점 Runner 6석 상태 readback → 현행 B의 Watchdog/Owner/보호 CAS + 관련 업무/lease와 이전 UNKNOWN effect 원장 대조 → 안전한 독립 유지보수기 단회 B admission 여부 판단. 실제 전환 0/1, PRODUCTION 운영 효과 시행 0.

## 17. 2026-11-27 S6 현재 승인 B 단회 접수 및 6석 조회

- 새 정규 B 승인 manifest [PR #4063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4063) merge `d8e0b229129c7a05a965d50930abe43ccb782304`의 main source·원문 SHA256 `1fceeba061f7f8731811220b27cac245bd91d44e87d68935cd8475117f094141` 확인. 원효과 `OLD_OWNED_SUPERVISOR_TREE_ONLY`, 기존 Watchdog 승격, NO_AUTO_RETRY/FORCED_ROLLBACK, 보호/원장 보존.
- PC 읽기 전용 A [#4067](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4067) / [Run #45880105124](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45880105124), `results/pc-process-inventory-45880105124-1-operating.json/.txt` 2/2 readback: `2026-11-26T19:00:19.081Z`, `PASS/PROCESS_INVENTORY_COLLECTED`, Controller `3c7d4cfe...`, maintainer `5a85f803...`, `maintenanceFilesVerified=true`, `installLockHeld=false`, Workflow active, runtime/maintainer HEALTHY, 6/6 online. 5/6 idle, seat 05 busy=true; **이 조회 A 자체의 Runner 이름이 zgmini-pc-05**. 이전 #4041도 조회 진행 seat04만 busy였음. 따라서 A 관측 중 자기 점유 가능성을 분리, 독립 B 효과 시점의 동시 유휴를 임의 입증하지 않음. #4067은 조회 완료로 종결.
- 현재 고유 B [Issue #4069](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069) / `pc-s6-63afb126-72dc-4ec5-a721-4819771fa9ee` **1회 접수**. 정확 `pc-maintenance` label, `ZGMINI_PC_MAINTENANCE_REQUEST_V1`, `controller-s6-failover-once`, 새 Controller SHA, main 승인 manifest SHA. #3947 원본 UNKNOWN 및 #4019 구 B BLOCKED 재발행·requestId 재사용 0.
- PC 수신기는 신규 B `s6-once-status`의 운영 설치 원본/lease/CAS, 독립 유지보수기의 PRE_DRAIN 45초 신선도·관련 업무 0·6석 모두 online+idle·Watchdog healthy/standby 2·원 소유자/보호 일치를 **프로세스 종료와 claim 전에 재검증**, 불일치 시 BLOCKED. `POSTCHECK_PENDING`이어도 별도 A 신규 업무·JSON/TXT readback 이전 최종 PASS 아님.
- 이 문서 기록 시 #4069의 최종 영수증 미회수이므로 **실제 S6 0/1 유지**. 결과 회수 후 6석/원장·Watchdog 승격·RTO 및 새 업무 A 검증 여부를 단계별 분리해 정정할 것.

## 18. 2026-11-27 S6 수신기 건강/신규 B #4069 ACK 회수

- 현행 신규 B [#4069](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069)에는 접수 직후 ACK/JSON·TXT가 없어서 재발행하지 않고 근본 조건을 구분했다. 설치 유지보수기 `tools/maintenance-agent.mjs`는 약 60초 간격 `pollOnce`; `processS6OnceIssue`는 PRECLAIM 사전거부 시 결과를 `RECEIVER_STATUS.json.results`에만 기록할 수 있고 **ACK/원장/결과 업로드 없음**. 따라서 ACK 부재를 곧바로 receiver 중단/효과 미발생/실패로 단정하지 않았다.
- 독립 운영 A [#4072](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4072), [Run #45881370001](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45881370001), `results/pc-process-inventory-45881370001-1-operating.json/.txt` 2/2: 관측 UTC `2026-11-26T19:10:38.693Z`. `receiverStatus=LISTENING`, `maintenanceState=HEALTHY`(Receiver owner/3분 신선도/듣기 확인), `workflowState=active`, `installLockHeld=false`, Controller HEALTHY, 6 Runner 전원 online. Runner seat01 busy는 해당 A 실행좌석과 일치해 별도 업무의 상시 점유로 단정하지 않았다. A #4072는 결과 readback 후 closed/completed.
- ACK 불확실성 구분용 임시 진단 [PR #4076](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4076)을 전용 브랜치에 작성(기존 읽기 전용 A의 고정 #4069 수신 결과 출력, 민감정보/경로 비노출, 운영 효과 0). 그러나 **실제 ACK가 먼저 확인되어 필요성이 해소**, main 미병합/운영 미설치로 PR을 close. 새로운 진단을 불필요하게 완료 Gate로 두지 않는다.
- [#4069 수신 ACK](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069#issuecomment-7201304217): `OBSERVED_AT=2026-11-26T19:12:02.045Z`, `LAST_PASS=REQUEST_MANIFEST_AND_UNIQUE_CLAIM_VALIDATED`. 정확 요청Id/승인 manifest 및 claim 검증. **ACK는 실효 stop/승격/사후 업무 성공 증거가 아니고** 이번 기록 시각까지 최종 `results/maintenance-pc-s6-63afb126-72dc-4ec5-a721-4819771fa9ee.json/.txt`가 미발행 상태. 새 B 발행 또는 동일 요청 재시도 금지.
- 기존 정규 maintainer `waitForDrain` 최대 60*3초 반복, `waitForStoppedHeld` 최대 40*3초, `waitForPromotion` 최대 60*3초, 각 단계 원장 기록/보호 CAS 재검증. 장기 대기를 timeout 성공/실패로 임의 해석하지 않는다. S6 전환 실증 **0/1** 유지.
- **즉시 다음 필수:** #4069 실제 최종 Status/Code·JSON/TXT 및 원장 phase 회수; `POSTCHECK_PENDING`인 경우만 독립 A로 승격/여섯 Runner/새 업무/백로그 검증. `BLOCKED`면 정확 최초 사전실패, `UNKNOWN/RECOVERY_REQUIRED`면 effect claim·journal/readback 후 재시도 금지.

## 19. 2026-11-27 B #4069 장기 미회수 및 사후 읽기 전용 A #4080

- S6 정규 B [Issue #4069](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069) 수신기 실제 ACK [comment #7201304217](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069#issuecomment-7201304217) UTC `2026-11-26T19:12:02.045Z`, `LAST_PASS=REQUEST_MANIFEST_AND_UNIQUE_CLAIM_VALIDATED`. 원본 소스의 `processS6OnceIssue` ACK 전 호출 `s6-once-status`는 현재 Source/Owner/Watchdog/Standby CAS·6 Runner online idle·workflow active·install lock 및 관련 lease 부재를 검사하므로 접수 시점 사전승인·claim 조건 통과로 분류. **ACK는 Supervisor stop·Watchdog promotion이 아니다.**
- ACK 이후 UTC `2026-11-26T19:25:47Z` 재조회까지 해당 B Issue final result 댓글 0, `results/maintenance-pc-s6-63afb126-72dc-4ec5-a721-4819771fa9ee.json/.txt` 파일 미게시. 관찰 시간 경과만으로 Runtime 실패/실행 완료/중단 성공 판정 금지. B 내부 phase/checkpoint 원장 직접 readback이 없어 effect는 **STATE_UNKNOWN/미확인**, 실제 S6 운영 종단 0/1 유지. 동일 B requestId 재요청 금지.
- 신규 관련 현장 A [#4072](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4072) / Run #45881370001, `2026-11-26T19:10:38.693Z` JSON/TXT 2/2: 당시 Receiver `LISTENING`, `maintenanceState=HEALTHY`, Controller `HEALTHY`, Workflow active, install lock false, six Runner online. **이는 B ACK 이전 시각의 상태로 현재 상태/복구 증거가 아님**. A #4072 조회 목적 closed.
- 정확 #4069 원인코드가 ACK 이전에만 숨겨지는 문제 확인으로 임시 A 진단 [PR #4076](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4076)을 작성했으나 ACK가 실제 발생해 새 운영 기능·Gate 불필요: **PR closed/unmerged**, Watchdog/Controller/PC 배포 0.
- 장기 결과 미회수 안전 분리를 위해 기존 일반 읽기 전용 A [Issue #4080](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4080)를 고유 requestId `a34d70f7-522a-49c6-b63f-6d94c0ab6f01`로 **단 1회** 접수. 대상은 현재 Controller runtime, Workflow, 6 Runner, maintainer state/install lease. `2026-11-26T19:25:47Z`까지 이 A 영수증도 없음. A 결과 부재를 Runner offline의 확정 근거로 사용 금지.
- 새 B/강제 프로세스 종료/lease 해제/Watchdog·source 수정/작업 완료만 위한 Cron 신규 등록 없음. **다음 필수 행동**은 #4069 최종 결과 pair·원장 단계 우선 회수, #4080 정확 A pair 존재 시 각각 관측 시각/효과 범위 대조. `POSTCHECK_PENDING`이면 별도 승인 A로 Owner 승격·6 Runner 및 신규 업무 검증, `UNKNOWN/RECOVERY_REQUIRED`이면 원본 claim·phase·lock 현재 상태 확인 후 정규 복구 판단. 최종 운영 실증 0/1.
