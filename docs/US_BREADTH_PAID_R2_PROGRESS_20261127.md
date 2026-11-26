# 미국 전체 등락지수 R2 진행 원장 — 2026-11-27

- 담당: 미국 전체 등락지수 R2
- 저장소: `ansqhd5774-Choi/zgmini`
- 기능 브랜치: `codex/us-breadth-public-r1-20261031` (기존 원담당 이력 보존; 운영 코드 정본은 최신 main)
- 계획: [US_BREADTH_PAID_R2_EXECUTION_PLAN_20261127.md](US_BREADTH_PAID_R2_EXECUTION_PLAN_20261127.md)
- 기준 관측: 2026-11-27 KST, Windows 실제 #4036 / #4040
- 종단 진행률: **5/8 = 62.5%**, 완료는 실제 운영 단계 기준. 잔여 3/8.

## 완료 및 근거

1. 코드/CI/PR: 본체 [#1702](https://github.com/ansqhd5774-Choi/zgmini/pull/1702) 병합 `225a0806ce611b370a9fe451cf6c18ab78599af6`.
2. 운영 Core Writer B: 제어 [#4008](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4008) 실PC 설치 SHA `c8ed53a3991212dd1778742cda8a86ac133e0796`.
3. Controller 승인·설치: PR #4028/#4031 병합; 원본 B [#4036](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4036) `SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, 실제 SHA `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`, `RECOVERY_SHA=NONE`, 보호 상태 불변.
4. 독립 Windows 사후 A: [#4040](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4040) / Run [45873869837](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45873869837), `PASS/CORE_READONLY_DIAGNOSIS`. 원본 `results/45873869837-1-seat-6.json`.

## 실제 원자료 상태와 제한

| 구분 | 실제 관측 |
|---|---|
| `stock_daily` 영수증 | 30일, 2025-11-19 ~ 2026-11-25 |
| `etf_daily` 영수증 | 29일, 2026-10-16 ~ 2026-11-25 |
| 최근 영수증 메타데이터 유효 | stock 30/30; ETF 29/29 |
| 원파일 SHA 재검증 | 현재 A는 `FILE_METADATA_ONLY`; 별도 완료 전 |
| 거래일 연속성 | 미검증 |
| R2 비공개 결과 | `DIRECTORY_UNAVAILABLE` |
| 250 비교점 | 미확인 |
| D1 `us-breadth-paid-r2-v1` | 실제 값 미회수 |
| 공개 API/UI 실값 | 미확인 |

**최소 221개 날짜가 모자라 보인다는 계산은 30개가 목표 251일에 모두 포함된다는 가정에 한정한 하한이며, 실제 결손 수는 정확한 목표 거래일과 intersection 검증 후 확정한다.**

## 2026-11-27 개발 추가 진행 (운영 완료 아님)

- 최신 main 기준 별도 최소 작업 브랜치 `codex/us-breadth-r2-paid-backfill-20261127` 생성. 원 담당 브랜치는 main 대비 과거 기능 이력 변경이 커 그대로 병합하지 않음.
- [소스 PR #1722](https://github.com/ansqhd5774-Choi/zgmini/pull/1722): 변경 7파일, 기존 공통 `collectPaidDaily`에 선택형 유료 `stock_daily` 수집을 추가하면서 기본 stock+ETF 동작 보존; 새 읽기 전용 `planStoredPaidUsR2Backfill`은 최신 완료일 기준 목표 날짜/결손 영수증을 계산. 기존 Core `--publish` 경로에만 추가하여 현재 stock+ETF 우선 수집 후 한 Core 실행당 총 40파일의 잔여 예산으로 과거 stock-only 누락분을 분할 수집. 기존 source pin 검사를 재사용하며 신규 Task/예약 없음.
- 관련 회귀시험: stock-only vs ETF 경계, invalid type 사전 차단, 목표 거래일 결손/잘못된 인덱스, provider/D1/파일 쓰기 0.
- 운영 소스 `c8ed53a...`는 변경되지 않았고, 이 PR만으로 공급자 수집·backfill·비공개 산출·D1/API 게시를 완료했다고 간주하지 않음. CI exact HEAD 확인 후 **실제 설치 CAS·승인 범위의 선택적 Writer B 적용**이 필요하며, 적용 후에만 기존 Core 자동 갱신으로 bounded backfill이 실행됨.

## 2026-11-27 PR #1722 병합 확인 및 PC 사전조회 준비

- [PR #1722](https://github.com/ansqhd5774-Choi/zgmini/pull/1722): 정확 HEAD `a2ee441ea7d2d696ffdc24105004f911ccfcd48f` Node CI / CodeQL / Secret Scan PASS, GitHub main merge `10be1e52138d5a59b9464e9b04f39d5bdcdcfb32`.
- 승인된 기존 Controller `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`에서 `writer-install-preimage-readonly` 범위형 A 조회 지원 확인. 4개 대상 Writer 파일 SHA/현재 source/config CAS를 확보하기 위한 제어 [PR #4046](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4046) 진행.
- **GitHub 병합과 원격 조회 범위 등록은 PC 신규 Writer B 설치·원자료 수집·계산·게시가 아니다.** 5/8 유지.
- 완료한 #4008 Writer B, #4036 Controller B는 중복 실행하지 않는다.

## 2026-11-27 선택적 Writer B 원본 CAS 및 승인 명세

- 제어 [PR #4046](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4046): C996/Secret Scan PASS, merge `aed6469b65940d59813daf290106c819cd2737ba`.
- A급 단회 [Issue #4049](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4049) / [Run 45877180462](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877180462): `PASS/WRITER_APPROVED_PREIMAGE_READONLY`, 실PC 4파일 `M/PRESENT/trackedDirty=false`; HEAD=config.source=checkpoint `c8ed53a3991212dd1778742cda8a86ac133e0796`, 보호 상태 불변. `runtimeSourceVerified=false`: PC 정적 Checkout + 사전조회 증거이며 실행 중 프로세스 연결 증명은 아님.
- 원본 SHA-256: `local-cycle.mjs=f69fb3cc1a6fdb85af34054f016b10dcbc7b1dcbf76e51c32b617121fe22d05d`, `marketparquet-paid-store.mjs=4ba0a487868a2a028f080c06bdde75f41ffef5c8018541a0a43e7bd15acdfc23`, `us-breadth-paid-r2-cycle.mjs=c350c8cf90bc989abef62c6764fa4c864d8fb64d72a8c3712ab06785ef1c1a88`, `us-breadth-paid-r2-stored.mjs=21209308df4d2704faa38481d3ee81e2a25ab255a0c9d8ec5049b460c357097e`.
- [B manifest PR #4051](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4051): 4파일만 M, candidate source `10be1e52138d5a59b9464e9b04f39d5bdcdcfb32`, 실제 before/after SHA 고정, Task XML/launcher CAS, 단회 360초 Core 신규 시작 억제·자연 종료, 설치 중 provider/DB/D1/Task 변경 0.
- 승인 원문: `approvals/writer-updates/us-breadth-paid-r2-backfill-fourfile-20261127.json`; 원문 SHA-256 `8a1cb2a8686ac7c6dba5c41ce8e9f5d5ec5eb3af67f47b5b9b75bb7cf081c97b`. **PR #4051 CI/병합/Owner B 설치 영수증 전에 실제 운영 설치 완료 주장 금지**.
- 기존 설치 #4008/#4036 중복 실행 금지; 원자료 251개 복구/계산/게시 미완료, 종단 5/8 유지.

## 2026-11-27 설치 #4055 의존성 사전검사 및 최소 분리 수정

- [PR #4051](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4051) 정확 HEAD `4fbc7488c87712f77256da4c49fa0d3ff7681041` C996 + Secret Scan PASS, merge `eb0250f550749445e571c07d1f59b4bfe71edee1`.
- 기존 Owner [Writer B #4055](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4055), request `77df231d-6619-46f0-8320-44ed546901c1`, [Run 45878033076](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45878033076): `WRITER_B_PREFLIGHT_STOP / WRITER_B_IMPORT_MISSING_DEPENDENCY_STOP`. JSON/TXT 2/2, 운영 source 변경 **없음**, `RECOVERY=NONE`, `NO_REEXECUTE`.
- 정확한 missing dependency 진단 2개: 최신 공유 `scripts/pc-writer/local-cycle.mjs` → `asset-r10-sp500-refresh.mjs` 및 `earnings-risk-provisional-r23-hook.mjs`, 모두 `NOT_FOUND` (기존 설치된 Core 이력과 최신 main 전체파일 차이). 이 파일들은 미국 R2 범위 밖이므로 임의 추가 설치하지 않는다.
- 수정 [PR #4057](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4057): **기존 PC Core 전체 교체를 피하고 2개 고유 anchor로만 insert-only R2 backfill**. 수정 지시 `approvals/writer-previews/us-breadth-paid-r2-archive-insert-20261127.json`. C996 PASS 확인, Secret Scan/병합은 별도 상태 확인 필요.
- 신규 A급 프리뷰 대상 `approvals/writer-previews/us-breadth-paid-r2-archive-insert-20261127.json` 원문 SHA-256 `75cc0294e4282e2e609d6497ef652d3e7a6151e6f0697c4b586b36fe8128462f`. [PR #4057](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4057) HEAD `c2e563f112b33a865fa750462b2ce02a59273141` 기준 C996 PASS, Secret Scan Runner 대기 (마지막 관측). 실제 PC after SHA는 아직 미확보.
- 새 A급 고정 `pc-writer-insert-preview`로 실제 PC after SHA를 확보하고, 새 정확 Writer B manifest+고유 Issue로 적용. #4055는 이미 소모되어 재실행 금지.
- 원자료 251거래일·private/D1/API/UI 종단 5/8(62.5%) 유지. `WRITER_B_PREFLIGHT_STOP`은 실제 Source 설치 실패이지 공급자 데이터 결손 원인과 혼동 금지.

## 2026-11-27 PC 삽입 A PASS 및 신규 B 재승인

- 제어 [PR #4057](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4057): 정확 HEAD `c2e563f112b33a865fa750462b2ce02a59273141`, C996/Secret Scan PASS, merge `e7c2d316be1d46f9ea8ab3c4893cec19e54a3ba6`. 기존 Core의 안정된 2개 anchor에만 R2 archive 코드를 삽입하는 방식. 무관한 `asset-r10-sp500-refresh` / `earnings-risk-provisional-r23-hook` 신규 설치 금지.
- Owner A급 [Issue #4064](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4064), [Run 45879559742](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45879559742): `PASS_READONLY/WRITER_B_INSERT_PREVIEW_VERIFIED`, JSON/TXT 2/2. PC 실제 before SHA `f69fb3cc1a6fdb85af34054f016b10dcbc7b1dcbf76e51c32b617121fe22d05d`, 삽입 2곳 after SHA `06ff928141a68378d3011106261cb5b38eaa6ef5791e7e0f9b77f5d041906844`. Task XML SHA `dd81987c7efa4b1e343af30329a580613bb920dec89c1aa7a436ef935f0bb028`, 실제 운영 쓰기 0.
- 동일 A 읽기 관측 `coreDrain: state=4, instances=0, relatedProcesses=2, cycleLockPresent=true, drainReadyIfDisabled=false`. 시점 스냅샷이며 오래된 lock 또는 소유자 장애 확정 아님. 정규 B 설치에서 실제 소유자·lease·Core 자연 종료 확인; 임의 lock 삭제/강제 종료 금지.
- 신규 4파일 B 승인 명세 [PR #4066](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4066), `approvals/writer-updates/us-breadth-paid-r2-backfill-insert-fourfile-20261127.json`: 기존 3파일 M 원본/목표 SHA 유지, `local-cycle.mjs`만 A검증 insert-only after SHA 적용. 승인 원문 SHA-256 `b1f3ea8c36d568f60498d89b3454916a0f5c5ea0b5e9e0fefa7e49cb54baf2e8`. 정확 HEAD `945d1d3113fd577506c285a3ba631cf1c2d2b4de` C996/Secret Scan PASS, merge `42436298d20d8828bf5dcd4900a8b14fff791849`.
- Owner 신규 정규 [Writer B #4068](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4068) / [Run 45880411492](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45880411492), request `e2f63c0a-89d4-433e-a589-28b5de070f63`: manifest 승인·후보 checkout PASS, 실제 Writer 트랜잭션 진입 (관측 시점 RUNNING). 실제 설치·백업·config/source/Task readback 결과 전에는 운영 변경 완료로 평가하지 않는다.
- 원래 B #4055는 preflight STOP·요청 소모이며 절대 재실행하지 않는다. 신규 B 성공 전 운영 source `c8ed53...` 불변, 원자료 251일·250 비교점·D1/API/UI는 여전히 미완료. **종단 5/8 유지.**

## 2026-11-27 Writer B #4068 Core 자연 종료 미충족

- [Issue #4068](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4068), [Run #45880411492](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45880411492) 결과 JSON/TXT 2/2: `WRITER_B_INSTALL_STOP_RESTORED/WRITER_B_CORE_NATURAL_DRAIN_TIMEOUT_STOP`, `RECOVERY=ORIGINAL_VERIFIED`, `RETRY=READ_ONLY_RECONCILE_NO_REEXECUTE`. 승인 manifest·candidate checkout 검증 완료 후 실제 Core 유휴창 미충족으로 B 중단. `SOURCE_SHA=NONE`: 새 Writer source 설치 완료 증거 없음.
- 기존 #4055의 import missing 조건과는 독립 원인. #4068은 원본 복구 확인·요청 소모이므로 재실행/lock 삭제/프로세스 강제 종료 금지.
- 마지막 A 프리뷰 [#4064](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4064)의 Core snapshot에서 `enabled=true,state=4,instances=0,relatedProcesses=2,cycleLockPresent=true,drainReadyIfDisabled=false`였음. Task 상태와 잠금 소유 연결은 아직 미확정이므로 stale lock이나 임의 외부 프로세스를 원인으로 단정 금지.
- 소유자 진단 [Issue #4073](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4073), [Run 45881462406](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45881462406): `PASS/CORE_RUNTIME_SOURCE_VERIFIED`, `runningTaskInstances=1`, `lockOwner=VERIFIED_ACTIVE_CORE/CORE_LOCK_TASK_LINKED_OWNER_VERIFIED`, 운영 source HEAD/config `c8ed53a3991212dd1778742cda8a86ac133e0796` 일치, 실제 Core 4파일 SHA readback 검증, 보호 상태 불변. **stale lock 아님; 실제 Task-linked Core가 잠금을 보유**. 소유자 임의 종료·lock 삭제 금지.
- 과거 #4040 A의 Core checkpoint `local-cycle-last-run` 2026-11-26T17:51:58Z, collection 17:55:43Z, writer 18:03:17Z. 이후 실행의 증거를 확인하기 위한 별도 A [Issue #4074](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4074) `core-status` 단회 요청; 결과 전에는 장기 batch의 진전 여부 미확정. Core 자연 유휴 또는 실제 원인 복구 전 신규 Writer B 재요청 금지.
- 계산·저장·D1/API/UI 성공 증거가 없으므로 종단 진행률 **5/8 (62.5%) 유지**.

## 2026-11-27 Core 원장 전진 입증 — 자연 유휴 후 재개

- 기존 Windows A급 [Issue #4074](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4074) / [Run 45881716545](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45881716545): `PASS/CORE_READONLY_DIAGNOSIS`, 보호 상태 불변, 공급자/DB/D1 호출 0.
- 비교 기준 #4040 → #4074: `local-cycle-last-run` 2026-11-26T17:51:58Z → **18:58:33Z COMPLETE**, `local-collection-last-run` 17:55:43Z → **19:01:22Z COMPLETE**, `local-writer-last-run` 18:03:17Z → **19:05:55Z VERIFIED**. 실제 저장 checkpoint가 전진하여 Core는 단순 stale/hung으로 단정할 수 없고, 정상적인 장기 작업과 후속 실행이 살아 있음.
- #4074 시점에도 `lockPresent=true`, 실제 Task Engine/WMI [#4073](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4073)에서는 `runningTaskInstances=1`, `lockOwner=VERIFIED_ACTIVE_CORE`; source/config `c8ed53a3991212dd1778742cda8a86ac133e0796`, Core Task XML SHA `dd81987c7efa4b1e343af30329a580613bb920dec89c1aa7a436ef935f0bb028` 불변.
- R2 원자료는 **stock 30일 / ETF 29일**, `privateOutput=DIRECTORY_UNAVAILABLE`, 251거래일 수집/250비교 계산/D1 게시 미완료. A 조회 메타데이터로 raw/projection SHA 및 일별 연속성 PASS 주장 금지.
- #4068 B는 `WRITER_B_CORE_NATURAL_DRAIN_TIMEOUT_STOP`, `ORIGINAL_VERIFIED`, `NO_REEXECUTE`; **자연 종료 전 동일 조건 요청 반복 금지**. 기존 Core Task/lock/lease를 변경하지 않음. 유효한 PC 자연 유휴 상태가 새로 관측됐을 때 원본 CAS/Task 핀 확인 후 이전 설치 실패와 구별되는 고유 신규 B 요청으로 정규 설치 계속. 별도 감시 Task·예약 생성 금지.
- 종단 진행률 **5/8 (62.5%)**, Source PR/CI/승인·복구 완료와 실제 R2 데이터 게시 완료 구분.

## 2026-11-27 B 재개 전 새 자연유휴 A 조회

- 마지막 실운영 검증: B [#4068](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4068) `WRITER_B_CORE_NATURAL_DRAIN_TIMEOUT_STOP`, `ORIGINAL_VERIFIED`; A [#4073](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4073) `VERIFIED_ACTIVE_CORE` task-owned lock; A [#4074](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4074)에서 2026-11-26T18:58/19:01/19:05Z checkpoint 전진. 이는 영구 교착·stale lock의 증거가 아니므로 해당 이유로 안전검사를 제거하지 않는다.
- 독립적인 실제 상태 변화 가능성을 확인하기 위해 기존 허용목록 `shared-resource-release-readonly` 한정 A [Issue #4078](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4078) 단회 발행. requestId `pc-usbreadthr2-resource-window-20261127-01`, source `7579dea082d0f7a671113e52e39cefc9be8c9a87`. 이 조회는 1.5초 간격 2회 Task/잠금/Task XML/config source 상태를 관측하며 PC operational writes 0.
- **2026-11-26T19:17Z 최신 관측:** #4078 OPEN, 아직 bot 댓글·JSON/TXT 없음. GitHub workflow 목록에는 #4078에서 생성된 `ZGMINI PC Job` 실행 ID도 식별되지 않음. 원인을 Runtime 실패로 단정하지 말고 `AUTOMATION_BLOCKED / RESULT_PENDING`으로 분리. 이 요청을 중복 발행하거나 허용목록/승인 Gate를 우회하지 않는다.
- 정규 B manifest `approvals/writer-updates/us-breadth-paid-r2-backfill-insert-fourfile-20261127.json`은 PR #4066로 main 병합 및 A #4064 before/after SHA 확인 상태. **새 자연 유휴 + 원본 CAS/Task 핀을 확인하기 전 새 B 발행 보류**. 향후 결과가 CANDIDATE_CLEAR라도 B 내부 독립 안전검사를 다시 통과해야 설치 인정.
- 종단 완료 증거는 아직 5/8(62.5%): raw 251 연속 거래일, private 250 포인트, D1 readback 및 API/UI 출력 미증명.

## 2026-11-27 #4078 PC Job 무실행 사건 인계

- 기존 읽기 전용 A [#4078](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4078), requestId `pc-usbreadthr2-resource-window-20261127-01`, `shared-resource-release-readonly`: 2026-11-26T19:14:52Z 작성·19:14:54Z `pc-job` 라벨 이벤트 확인. GitHub Actions의 다른 workflow는 이벤트를 받아 skipped 실행을 기록했으나 원 요청에 대한 `ZGMINI PC Job` 실행·댓글·JSON/TXT 없음(마지막 대조 19:20Z+). Windows 실행 실패가 아닌 **AUTOMATION_BLOCKED / ISSUE_EVENT_NO_PC_JOB_RUN**으로 구분한다.
- 지난 동일 Workflow [#4074](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4074) / [Run 45881716545](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45881716545) 성공과 현재 `.github/workflows/pc-job.yml`의 `issues:[opened,labeled]` 계약을 비교. 등록 이벤트 누락의 근본 원인은 아직 미확정. `ZGMINI_PC_JOB_LATE_LABEL_ENABLED` 실환경 변수 확인 없이는 라벨 재첨부 우회/수동 중복 실행 금지.
- 기존 공통 총괄 지원 계약으로 별도 [#4079](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4079) `ZGMINI_AGENT_HANDOFF_V1 / COMMON_RUNNER / PC_JOB_ISSUE_EVENT_NO_RUN` 등록. [원본 #4078 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4078#issuecomment-7201490741)에 LAST PASS #4074 / FIRST FAIL #4078, 원본 requestId와 필요한 정확한 실행·결과 복구 경로 연결. 접수 등록은 총괄 실제 인수/실행 완료 증명이 아니다.
- 기존 Core 실행·Task/잠금·Writer B 원본 복구 그대로 보존. #4078 고유 요청 중복 발행 금지, 안전 유휴·CAS 검증 전 Writer B 재설치 금지. 원자료 251거래일, private 250점, D1·API/UI 증거 미완료 → 종단 진행률 5/8(62.5%) 유지.
- 외부 공개 `zgmini.kr` API의 이번 실행 외부 직접 접근은 현재 도구 환경의 DNS 해석 실패로 **미검증**이다. 이를 운영 사이트 장애라고 단정하지 않는다.

## 2026-11-27 목표 251거래일 달력 역산

- 승인된 소스 `lib/market-score/breadth-b1-r3-calendar.mjs`의 `latestCompletedSession()`/시장 휴장 규칙 및 `previousMarketSession()` 역산을 독립 대조. 한국 2026-11-27 04:13, 뉴욕 2026-11-26 추수감사절 휴장 기준 **최근 완료 거래일 2026-11-25**. 목표 251세션 **2025-11-26 ~ 2026-11-25** (2025-11-27 추수감사절 제외, 2025-11-28 포함), 비교 차트 250포인트.
- Windows [#4074](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4074) `stock_daily.receiptDates=30`, `firstDate=2025-11-19`, `lastDate=2026-11-25` 확인. 2025-11-19는 목표집합 밖이므로 기존 30개가 모두 해당 집합에 포함될 수 없다. 목표 안에 존재 가능한 영수증은 최대 29개, **부족분 하한 251−29=222개**. 정확한 누락 날짜/수량은 PC `paidDates` 실제 30개 전체 날짜와 교집합·원파일 SHA 검증 후 확정. 완료/수집/게시로 표현 금지.
- 이 계산은 독립 오프라인 달력 검산이며 PC 실수집·기존 영수증의 날짜·SHA 전체 검증이 아니다. 운영 신규 작업 6/8 완료 판정은 보류.

## 2026-11-27 #4078 PC Job 접수 재확인 및 설치 source 계약 정정

- 2026-11-26T19:23Z 이후 최신 원본 조회에서 [#4078](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4078) `open`, 고유 requestId `pc-usbreadthr2-resource-window-20261127-01`, `ZGMINI PC Job` 실행 ID 및 JSON/TXT 없음. Issue `labeled` 이벤트가 남았다는 것과 실제 A 실행은 별개. 지난 동일 Workflow #4074 Run `45881716545` PASS를 재사용.
- [#4079](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4079) `HANDOFF_ROUTED` 및 `HANDOFF_SELECTOR_CANDIDATE_V1`, `AWAITING_AGENT_CONFIGURATION` / AI 자동 처리 `NOT_CONFIGURED` 확인. [2026-11-27 원인 구분 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4079#issuecomment-7201605526)에 접수 시점·변수 게이트·요청한 범위/정확 결과를 연결. 인계 등록이 실제 총괄 인수나 복구는 아님.
- `.github/workflows/pc-job.yml`의 `labeled` 이벤트는 `vars.ZGMINI_PC_JOB_LATE_LABEL_ENABLED == 'true'` 게이트 적용. 연결 브라우저의 과거 변수 화면에는 해당 변수가 보이지 않았으나 현재 설정·최초 `opened` 이벤트 payload의 라벨 포함 여부를 확정하지 못해 **접수 누락 원인 미입증**. 임의 label 재부착·gate 제거 금지.
- 로컬 오버레이 source pin 정정: `writer-b/windows-adapter.mjs`는 승인된 source 파일을 `baseHead` 위로 overlay한 **새 로컬 커밋**(`prepared.sha`)을 생성하고, 같은 커밋으로 source를 switch·config.source 적용·파일 after SHA 검증한다. 따라서 `scripts/pc-writer/us-breadth-paid-r2-cycle.mjs`의 `git diff --quiet HEAD` 조건과 삽입형 Core가 충돌한다는 미확인 가설은 **기각**. 설치 불가의 실제 확정 조건은 #4068 `WRITER_B_CORE_NATURAL_DRAIN_TIMEOUT_STOP`.
- 다른 [#4080](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4080)의 독립 process inventory Workflow Run `45883221676`은 관측 시점 queued. 독립 보고의 완료 전에는 Core 유휴를 주장하지 않음. 원래 #4078 재발행하지 않으며 다음 행동은 공통 접수 복구/자연 유휴 증거 → 현재 원본 CAS → 승인된 정확 Writer B → 저장 데이터·게시 실측.
- 종단 진행률 5/8(62.5%) 유지; 수집·계산·게시 미완료.

## 2026-11-27 #4078 workflow-run 누락 범위 확정

- #4074 PASS: GitHub Actions `created=2026-11-26T19:10:50Z..2026-11-26T19:11:25Z` 원본 조회 `total_count=52` (issues 47), `ZGMINI PC Job` **2개** (Run `45881716545` success, `45881717018` skipped).
- #4078 접수 누락: `created=2026-11-26T19:14:44Z..2026-11-26T19:15:05Z` 조회 `total_count=45`, 모두 `event=issues`, **`ZGMINI PC Job` 0개**. 당시 다른 GitHub workflow는 정상 run 생성 후 관련없는 jobs skipped. 좁은 조회 창 자체 전체 개수로 page-truncation 배제.
- 차이: job-level `if:` false만으로 #4078의 workflow-run 0건을 설명하지 못함. GitHub Actions workflow 생성/등록/이벤트 라우팅 이전 단계가 미입증인 실제 차이. GitHub Actions 특정 워크플로 버전·`opened` payload 라벨·actor·당시 repo var는 불명. 상태 `AUTOMATION_BLOCKED` 유지.
- 원본 [#4078](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4078#issuecomment-7201690228)에 대조 근거와 위험 조건을 직접 연결; 공통 [#4079](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4079#issuecomment-7201670813)에도 기록. #4078에 별도 진단자가 조건부 가설을 제시했으나 정확한 원인 입증 전 워크플로 조건·승인 변수·Core 보호장치 변경 금지. 중복 request/새 Writer B 없음.
- 연관 [#4080](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4080) 별도 PC inventory Run `45883221676` 마지막 관측 queued, JSON/TXT 아직 없음. 실제 Core 유휴 확인 전 설치 승인 범위 확대 금지. 종단 5/8(62.5%) 동일.

## 2026-11-27 CI Native A 대체 경로 적용범위 확인 (신규 운영 진전 아님)

- 제어 [PR #4050](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4050)은 merge `df779b037b5847574385104a9015c8eb33714edf`로 transport/영수증 모듈 소스만 병합. `native-dispatch.mjs`는 별도 설치·승인된 receiver policy, source CI 증거, 중복방지 영수증을 필수로 하고 dispatch 접수 자체를 PC 실행 성공으로 취급하지 않는다.
- 후속 제어 [PR #4081](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4081) 병합 소스 `ci-approval/native-a-execute.mjs`의 A 실제 실행 허용 operation은 `runner-smoke`와 `core-status`뿐이다. 현재 #4078 요청의 `shared-resource-release-readonly`는 그 경로로 실행 **불가**. 새 receiver workflow 또한 `ZGMINI_CI_NATIVE_A_ENABLED` 및 별도 실제 실행 `ZGMINI_CI_NATIVE_A_EXEC_ENABLED`와 로컬 설치 scope 검증이 필요하며 변수 활성/설치·실제 실행 완료는 미입증.
- 운영 [#4080](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4080) Run `45883221676` job `operating-process-snapshot` 재조회는 여전히 `queued`; Core 자연 유휴·원본 CAS 신규 증거가 아니다.
- 따라서 #4050/#4081을 #4078 해결로 간주하지 않는다. #4078 기존 requestId 보존, Run/JSON/TXT 0건, 공통 [#4079](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4079) 접수 복구 미해결. 기본 `issues.opened` workflow-run 누락의 정확한 원인·접수 복구와 실제 A 영수증 후에만 설치 준비; 기존 B #4068 재요청·Core 강제 종료·lock 삭제 금지. 종단 5/8(62.5%) 유지.

## 2026-11-27 360초 Writer B 실패 조건과 기존 장시간 정규 경로 분리

- 정규 Writer B [#4068](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4068)은 `PAUSE_NEW_STARTS_DRAIN_360S_V1` 원본 manifest로 실행됐고, 종료 상태는 `WRITER_B_CORE_NATURAL_DRAIN_TIMEOUT_STOP` / `ORIGINAL_VERIFIED`. 승인된 360초 자연 종료 창 안에 Task·자식·lock이 모두 quiet가 되지 않은 실패이며 원본은 복원됐다. 360초 초과 자체는 Core 고장·정체 증거가 아니다.
- 제어 최신 `writer-b/contract.mjs`와 `.github/workflows/pc-writer-b-source-once.yml` 확인: 이미 별도 `PAUSE_NEW_STARTS_DRAIN_1200S_V1` + 정확 `pc-writer-b-extended-drain-1200` 라벨 + 30분 Job 상한, `2400S_V1` + `pc-writer-b-extended-drain-2400` + 50분 Job 상한의 **독립적으로 승인돼야 하는** 경로가 구현돼 있다. 이 기능을 위해 새 실행기/예약/임의 종료 코드를 만들 필요는 없다.
- **실행 판단:** 기존 #4068 요청/360초 승인 manifest를 1200/2400초로 변조·재실행하지 않는다. 자연 유휴가 확인되지 않을 경우에만 360초 실패의 직접 대안으로 사용자 별도 명시 승인, 신규 정확한 manifest/원본 Task XML·4파일 CAS 및 해당 라벨을 갖춘 고유 B 요청을 검토한다. 승인/현재 PC 영수증 없이 이 확장을 실행 완료로 기록하지 않는다. 1200초 안 정상 종료 보장 없음.
- [#4078](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4078) workflow-run 0건과 [#4080](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4080) Run `45883221676` 운영 job `queued`는 여전히 서로 다른 접수/Runner 상태 문제다. 어느 것도 실제 Core 유휴 증거가 아니다. PC 실행·Writer B 설치·수집·게시 신규 완료 0, 종단 5/8(62.5%) 유지.

## 2026-11-27 공개 R2 API·UI 소스 독립 대조

- 최신 main `app/api/market-breadth/route.ts`의 `phase=confirmed-r2`와 `app/api/market-breadth-r2-history/route.ts`는 모두 `readPaidUsR2Feed`를 호출해 승인된 유료 D1 `us-breadth-paid-r2-v1`만 읽도록 연결돼 있음. 이전 무료/R1/IEX 데이터를 R2로 대체하지 않는다.
- `worker/us-breadth-paid-r2-public.mjs`는 D1 미게시·불완전/오염 record를 503으로 거부하고, history는 과거 날짜 그대로 보존하되 current는 `latestCompletedSession`보다 오래된 값을 표시하지 않는다. 이는 **소스 계약 관측**이고 실제 D1 값/Production 200 응답 확인이 아니다.
- `app/market-breadth-paid-r2-panel.tsx`는 두 API를 별도 GET으로 읽고 상승·보합·하락과 실거래일 선형 차트를 표시하며 `app/fear-greed/usa/cnn-panel.tsx` + `app/country-fear-greed.tsx`에서 홈페이지에 연결됨. 250포인트 정상 렌더링 실증은 아직 미완료.
- 공개 홈페이지 서버 응답(2026-11-27 KST 재조회)에는 `미국 등락 지수 / 연결 예정 / —` 초기 마크업만 관측. 클라이언트 hydration 후 실제 상태를 단정하지 않는다. 공개 current/history API 직접 읽기는 조회 환경에서 URL 접근/DNS 오류로 실패했으므로 HTTP status·D1 최신성 판단 **미확인**이며 사이트 운영 장애로 취급하지 않는다.
- 독립 소스 경로에 새 결함이 입증되지 않았으므로 UI 재개발/불필요한 웹 재배포는 보류. 남은 필수 실행은 #4078 접수 및 운영 Runner 가용 확인 → 기존 보호 조건에서 Writer B 설치 → 원자료 251일 → D1 readback → **실제** Production current/history·PC/모바일 숫자 검증. 종단 5/8 유지.

## 2026-11-27 S6 워크플로 중지 시간창과 #4078 무실행 연관성

- 신규 확인: 제어 최신 `tools/update.mjs::makeS6OnceOwnedOperatingPort`의 승인된 S6 유지보수 `pauseIntake`는 `pc-job.yml/disable` 호출 후 `disabled_manually` 상태 확인; `resumeIntake`는 `enable`+ `active` 검증. `tools/maintenance-apply.mjs`의 S6 조정기는 pause→drain→보호된 교체/전환→resume→backlog 회수 순서. `reconcileMaintenanceBacklog`는 paused window 안 원본 Owner Issues를 durable 원장·실제 실행 영수증으로 대조하므로, 중지 중 생긴 `issues.opened`가 자동 재전달된다고 가정하면 안 됨.
- 이벤트 시계열: #4074 PC Job 성공 2026-11-26T19:11Z → [#4069](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069) S6 ACK 19:12:02Z → #4078 opened 19:14:52Z 및 labeled 19:14:54Z이나 해당 workflow-run 0건 → #4082 19:29:59Z 별도 PC Job도 결과 없음. #4069 S6 결과는 19:42Z `UNKNOWN/S6_ONCE_OUTCOME_UNKNOWN`, `S6_ONCE_UPDATER_RESPONSE_UNKNOWN`으로 실제 단계/중지 상태 미확정.
- **원인 판정:** S6가 실제로 19:14Z에 `pc-job.yml`을 중지했을 가능성은 직접 코드 경로+시간축으로 지지되지만, 현행 Workflow state와 승인된 S6 journal `pausedAt/resumedAt` 및 마지막 phase가 확보되지 않아 인과 입증은 아직 안 됨. job-level late-label gate 단정은 종전처럼 기각. 시스템 전체 장애/소스 오류라고 임의 판정하거나 워크플로를 수동 활성화하지 않음.
- 실제 소유 기능 #4069 [코드/시각 교차검증 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069#issuecomment-7201950058), 공통 #4079 [연결 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4079#issuecomment-7201956126). 원본 requestId 중복발행 0; Writer B 추가 실행 0; Core·Controller 상태 변경 0. 필수 다음 단계: S6 독립 원장/워크플로 상태 안전 확인 → 해당 window에 #4078 포함 여부 확정 → 기존 승인된 backlog 수습 → R2 Core 유휴/CAS 검증 후 Writer B 설치·251일 backfill. 종단 5/8(62.5%) 유지.

## 2026-11-27 R2 250거래일 미완성 D1 게시 차단 — 소스 실제 통합

- **확인된 운영 전 소스 실패 조건:** 최신 `main`의 `scripts/pc-writer/us-breadth-paid-r2-cycle.mjs`는 `calculateStoredPaidUsBreadthR2`가 250개 미만의 연속 이력을 `prepared=true`로 반환하더라도 마지막 날짜가 최신이면 `savePrivatePaidUsBreadthR2` → D1 CAS까지 진행할 수 있었다. 승인 R2.1의 251원자료/250비교점 완성 후 게시 계약과 불일치하는 코드상 취약 조건이며, 실제 불완전 D1 게시가 발생했다는 주장은 아님.
- 원본 R2 전용 브랜치의 일부 PC source는 최신 `main`과 달라 전체 PR 병합 시 승인된 기존 Core 변경 역행 위험이 있었다. 따라서 main `1bd000a5218cee551efa1c1935cebc40695bfc4e`에서 제한적 수정 브랜치 `codex/us-breadth-r2-full-year-publication-20261127`을 분리하고 **정확 2파일**만 변경함.
- [본체 PR #1733](https://github.com/ansqhd5774-Choi/zgmini/pull/1733) HEAD `66fcf335937382099336ef08bcd3568248323cd4`에서 Node.js CI / CodeQL JavaScript TypeScript / Source Secret Scan **3/3 SUCCESS**, squash merge SHA **`d9e939afbafe3a64b5d2a8171bc2599d6c377f4a`**. `main` 코드 및 regression test readback 확인.
- **수정 계약:** 운영 `publish=true`에서 `maxPoints=250`, `fullYearHistory=true`, `comparedSessions=250`, `publicHistoryPreview.length=250`, `privateSourceReceipts.length=251`을 비공개 저장·D1 쓰기 **전에** 확인. 부족하면 `US_PAID_R2_FULL_YEAR_HISTORY_REQUIRED` + `operationalWrites=0`로 중지. 미리보기·수집기·산식·권리/DB/예약/Controller 변경 0.
- **중요한 완료 경계:** 소스 수정 및 main 병합은 완료. 새 source의 **운영 설치/실행·원자료 251일·250점 계산·private SHA·D1/API/UI 게시**는 미완료. 마지막 Writer B #4068 원본 복원, A #4078 workflow-run 미생성, S6 #4069 `UNKNOWN`, Process Inventory #4080 운영 job `queued` 유지. 새로운 B 설치 시 독립 원본 CAS 승인·lease·Core 자연 유휴를 다시 확인해야 함. 종단 진행률 5/8(62.5%) 유지.

## 2026-11-27 4파일 Writer B 기존 승인 후보와 최신 R2 전체 이력 게시 차단 소스 충돌

- Source-only 대조: 제어 저장소의 기존 승인 4파일 manifest `approvals/writer-updates/us-breadth-paid-r2-backfill-insert-fourfile-20261127.json` 후보 `candidateSourceSha=10be1e52138d5a59b9464e9b04f39d5bdcdcfb32`, R2 cycle 목표 해시 `e238cc56ae9c8f4068a033f3e549fef0daf29ed2617c29b5014ef3fd700c22cd`(실제 후보 원문 재계산 일치).
- `main` 병합 [#1733](https://github.com/ansqhd5774-Choi/zgmini/pull/1733) `d9e939afbafe3a64b5d2a8171bc2599d6c377f4a`는 `US_PAID_R2_FULL_YEAR_HISTORY_REQUIRED` 사전 게시 차단을 추가함. 동일 파일 최신 원문 SHA-256 **`6f194b20a13c21e1c458094069a3f709f4833ab5fd10fc522844581fae191ea1`**, 이전 승인 `afterSha256`과 상충. 나머지 승인 4파일 중 `marketparquet-paid-store.mjs`, `us-breadth-paid-r2-stored.mjs`의 후보 원문은 `10be`와 `d9e` 사이 동일, `local-cycle.mjs` 후보 원문도 기존 승인 `candidateSha256=365a29ccabb34cf42b4c2eee83b2c63e703d6cdf18e7eff836fc3515113e3998`로 동일(삽입 후 after 별도).
- **독립 장애:** 현재 GitHub의 `baseHead=c8ed53a3991212dd1778742cda8a86ac133e0796` commit 원문 조회는 422/404로 실패. 이는 운영 PC 이전 승인 `ORIGINAL_VERIFIED`의 반증이나 로컬 설치 불일치 증거가 아님. 옛 manifest의 Core preimage 재시뮬레이션은 이 조회 경로에서 불가능. 기존 #4068 360초 drain 거부 이후 운영 원본 CAS를 다시 확인해야 함.
- 안전한 후속: 기존 manifest의 해시/승인을 임의 변경하거나 소진 #4068 반복 금지. **최신 250거래일 차단을 포함한 정확한 source SHA + 4파일 목표 SHA + 당시 PC 원본 CAS, 기존 Task/lease/유효 승인 명세**를 정규 B 경로로 재핀하고 실제 Writer B 영수증·설치 SHA를 확인. #4068 [운영 설치 주의 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4068#issuecomment-7202187717) 반영함.
- S6 #4069 원본 상태 `UNKNOWN`, #4078 PC Job run 없음, #4080 운영 inventory job `queued`; 신규 B·공급자 수집·원자료/DB/D1 변경 **0**, R2 종단 진전 5/8(62.5%) 유지.

## 2026-11-27 목표 251거래일 달력 독립 교차검증

- 읽기 전용 소스 기준 고정 `latestCompletedSession=2026-11-25`의 `previousMarketSession` 역산 목표는 **2025-11-26~2026-11-25 251개 거래일**. 저장 비교점은 2025-11-28~2026-11-25 **250개**. 2025-11-27(추수감사절), 2026-11-26(추수감사절)은 시장 휴장; 2025-11-28과 2026-11-25는 거래일.
- 저장소 `lib/market-score/breadth-b1-r3-calendar.mjs`의 공식 미국 휴장 계산을 읽기 전용으로 별도 재구현해 실제 `exchange_calendars.XNYS` 세션과 251개 날짜 **1:1 동일, 날짜 집합 불일치 0개** 확인. 구간 내 월별 거래일 수: 2025-11=2, 2025-12=22, 2026-01=20, 02=19, 03=22, 04=21, 05=20, 06=21, 07=22, 08=21, 09=21, 10=22, 11=18, 합계 251. 이는 독립 오프라인 달력 검증이며 PC 운영 원자료의 연속성 검증을 대체하지 않는다.
- 기존 A [#4040](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4040) `results/45873869837-1-seat-6.json` 실제 영수증 재조회: `stockDaily.receiptDates=30`, 최초 2025-11-19, 마지막 2026-11-25, `selectedMetadataValid=30`, `sourceShaReadbackVerified=false`, `calendarContinuityVerified=false`; 개별 30개 날짜 리스트는 결과에 **없음**. 따라서 30개 모두 목표 구간 포함이라고 가정할 수 없고, 최소 하나(2025-11-19)는 범위 밖이라 목표 251개 중 **미보유 최소 222개**, 정확 결손 일자는 승인된 PC `paidDates` 결과 없이는 미확정.
- 완료된 작은 단계는 **목표 달력 구간 산정**뿐. 운영 251파일 raw/projection SHA 검증 및 bounded 수집이 필요한 6/8 전체 완료는 아님. 추가 공급자 호출·운영 쓰기·D1/API 변경 0, 종단 5/8(62.5%) 유지.

## 2026-11-27 공개 D1·API 250점 완성 계약 종단 보강

- 기존 [PR #1733](https://github.com/ansqhd5774-Choi/zgmini/pull/1733) `main d9e939afbafe3a64b5d2a8171bc2599d6c377f4a`는 Core R2 `publish=true` 입구에서 250점/251개 원자료 영수증을 요구한다. 추가로 실제 `worker/us-breadth-paid-r2-contract.mjs::validPaidUsR2Record`가 `1..249`점 `historyComplete=false`를 유효하게 인정하여 직접 D1 publisher primitive 및 public current/history GET에서 부분 FINAL을 인정할 수 있는 우회 경로를 소스에서 확인함(실제 잘못된 Production 데이터 게시 발생 증거 아님).
- 최신 main 기준 최소 변경 [PR #1734](https://github.com/ansqhd5774-Choi/zgmini/pull/1734), 작업 브랜치 `codex/us-breadth-r2-public-contract-250-20261127`, 정확 HEAD `38c29d6be7b733661952b784fb606a115061d49b`에서 **Node.js CI / CodeQL JavaScript TypeScript / Source Secret Scan 3/3 SUCCESS**. Merge SHA **`f7ea89305df8471ffb1827d974fc2e0c223d0b09`**, `main` readback 및 6개 파일 diff 확인.
- `validPaidUsR2Record` 공개 계약의 `points.length===250 && historyComplete===true`를 반드시 충족해야 한다. 동일 검증기를 사용하는 `buildPaidUsR2Final`, `publishPaidUsR2Final`, `readPaidUsR2Feed` 모두 미완성 부분 FINAL을 거부. 1/2/249 비교점 거부 및 250점 정상·stale current/history·CAS·민감 원문 비노출 시험은 실제 유료 원자료가 아닌 **합성 251-session 픽스처**에서 통과. 산식·수집기·DB·Task 변경 0. 운영 데이터 복구나 실제 공개 배포 증거 아님.
- **향후 B 설치 종속성:** 기존 제어 Writer B 승인 `approvals/writer-updates/us-breadth-paid-r2-backfill-insert-fourfile-20261127.json`은 `scripts/pc-writer` 정확 4파일만 포함, `protectedFiles=[]`; 반면 `worker/us-breadth-paid-r2-contract.mjs`는 기존 승인 후보 blob `84658b73a7968566af67fd109dd5218ebeac7565` → 현재 main blob `693e3fb88a4cc00670315ca4abb4cc15f7490b9f`으로 변경됨. #1733의 R2 cycle 파일 SHA 차이 외에 **PC checkout shared worker 의존성**도 설치 전 정확 원본 CAS와 당시 실행 source pin으로 검증할 것. **단, 이후 소스 재확인 결과 기존 worker도 250점 완성 레코드를 정상 수용하므로, 최신 worker 파일을 5번째 Writer B 변경 대상으로 추가할 필요는 없음**. R2 cycle 최신 250점 사전 차단을 포함하도록 기존 **정확 4파일** 수정 범위만 유지하고 새 source SHA/목표 해시·당시 PC CAS의 정규 승인 명세가 필요함. 과거 승인 manifest를 변조하거나 운영 PC가 새 worker를 설치했다고 간주하지 않음. 제어 [#4068 최초 종속성 기록](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4068#issuecomment-7202381178) 및 [최소 범위 정정](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4068#issuecomment-7202484661).
- 미완료: S6 #4069 원장 실제 판정, #4078 PC Job 정상 접수, #4080 운영 Runner 배정, 실제 Writer B/251 raw+SHA/250 저장+D1 CAS/API/UI. **종단 5/8(62.5%) 유지.**

## 2026-11-27 PC Job 접수 공백의 시간 상·하한 독립확인

- GitHub Actions REST `GET /actions/runs?event=issues&per_page=100&page=1..3`에서 총 300개 실제 Run의 `path=.github/workflows/pc-job.yml`만 필터. UTC 2026-11-26T19:11:07Z의 [PC Job 성공 45881716545](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45881716545) 및 skip 45881717018 이후, **19:20:40Z** [Run 45882940790](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45882940790)/45882941002(skip) 전까지 해당 PC Job workflow Run 없음. 원본 R2 [#4078](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4078) 생성 19:14:52Z 및 라벨 19:14:54Z는 바로 이 공백 안임.
- **19:20:40 이후 PC Job workflow Run 생성이 재개**됐음을 직접 확인(19:22:53Z Run 45883221639 skipped, 19:30:02Z Run 45884082348 queued, 19:30:03Z Run 45884083567 pending). 따라서 #4078은 Run 미생성 단계의 과거 누락이고, #4080 운영 Runner `queued`는 이후 **서로 다른 단계**의 신규 대기. 이 결과는 `issues.opened` 라벨 job.if만으로 #4078 누락을 설명할 수 없다는 기존 반증을 보강함.
- S6 [#4069](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069)의 `pauseIntake`가 19:11~19:20 사이 수행됐을 가능성은 높지만, 승인된 journal `pausedAt/resumedAt`이 없으므로 실제 원인 확정 금지. [#4078 신규 증거 기록](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4078#issuecomment-7202427892). 현재 원본 B 승인 재발행·R2 Collector 실행·PC 파일 수정 0.
- 다음 실행은 기존 S6 고유 journal 및 durable backlog readback 확보 후 #4078 원본 requestId를 정규 접수 복구하는 것. 이후 운영 Runner·Core 자연유휴·실제 source CAS 검증과 최신 5파일 종속성 명세 재검토, 251 raw/projection SHA 수집·250점 계산·D1/API/UI 실증 순서. **종단 5/8(62.5%) 유지**.

## 2026-11-27 최신 R2 게시 가드 포함 Writer B 미승인 4파일 후보 검증

- 제어 저장소 [PR #4090](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4090) exact HEAD `3a0fe0f8ccd952bf594e6a0e0c3727e6e94f6f43`, C996 R5 + Secret Scan **2/2 SUCCESS**, merge SHA **`7e797955ad76ce13c61d02d1e1bc8a226e2dfa39`**. 새 후보는 `approvals/writer-updates/us-breadth-paid-r2-post-250-guard-proposal-20261127.json`, 상태 **`PROPOSED_NOT_APPROVED`**: Writer B validator에서 반드시 거부됨. 기존 #4066 승인 원본의 `APPROVED_B` 상태·해시·승인 SHA는 변경하지 않음.
- 새 정확 후보 source `f7ea89305df8471ffb1827d974fc2e0c223d0b09`, R2 실행기 `scripts/pc-writer/us-breadth-paid-r2-cycle.mjs` 목표 SHA-256 **`6f194b20a13c21e1c458094069a3f709f4833ab5fd10fc522844581fae191ea1`**. 4파일 candidate 실제 원문 SHA-256 재계산 **4/4 정확 일치**. 기존 manifest에서 source SHA와 R2 실행기 after SHA만 다르고 A #4064 검증 Core 2삽입/원본 before·after, 4파일 경계, Task/VBS 고정, `PAUSE_NEW_STARTS_DRAIN_360S_V1`, 설치 중 기타 효과 0을 그대로 보존.
- **주의:** 이 source-only 후보는 새 B 승인도 실제 설치도 아님. 사용자가 승인한 효과의 정규 Owner 승인 연결·정확 manifest SHA, 실제 PC 원본 CAS/lease/유휴 및 S6 #4069 원장 복구가 필수. #4080 `operating-process-snapshot` queued와 #4078 원본 워크플로 누락 때문에 새 B 요청/PC 공급자 호출은 하지 않음. 설치 B #4068 `ORIGINAL_VERIFIED` 유지, 종단 **5/8(62.5%)**.

## 현재 남은 3개 종단 단계

- [ ] 6/8: 목표 251거래일 도출·유료 `stock_daily` 결손일 bounded backfill·원본/projection SHA 전체 검증. `etf_daily` 전 기간 수집은 미국 R2 완료조건이 아니다.
- [ ] 7/8: Core `--publish` 저장 계산 250점, private 파일 SHA readback, D1 `us-breadth-paid-r2-v1` CAS/readback.
- [ ] 8/8: Production current/history GET과 PC·모바일 표시·수치·날짜 동일성.

## 다음 실제 실행

1. 기존 `paidDates`와 `previousMarketSession` 기준 정확한 251일 집합 확정.
2. 기존 `collectPaidCurrent()`가 현재 저장분 이후만 모으는 한계를 해결할 **stock_daily 선택형 bounded backfill**을 승인된 공통 구조로 연결. 코드 변경이 필요하면 최신 main에서 최소 수정·회귀시험·PR, 정규 승인 설치.
3. 운영 수집/결과/게시/화면 검증까지 순서대로 수행. 새 명령·임의 shell/SQL 다운로드·공급자 권리 확대 금지.

과거 #4036은 재요청하지 않는다. 현재 Controller/Writer 정상 증거를 재사용한다.
