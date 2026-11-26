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
