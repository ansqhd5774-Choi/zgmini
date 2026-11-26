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

## 현재 남은 3개 종단 단계

- [ ] 6/8: 목표 251거래일 도출·유료 `stock_daily` 결손일 bounded backfill·원본/projection SHA 전체 검증. `etf_daily` 전 기간 수집은 미국 R2 완료조건이 아니다.
- [ ] 7/8: Core `--publish` 저장 계산 250점, private 파일 SHA readback, D1 `us-breadth-paid-r2-v1` CAS/readback.
- [ ] 8/8: Production current/history GET과 PC·모바일 표시·수치·날짜 동일성.

## 다음 실제 실행

1. 기존 `paidDates`와 `previousMarketSession` 기준 정확한 251일 집합 확정.
2. 기존 `collectPaidCurrent()`가 현재 저장분 이후만 모으는 한계를 해결할 **stock_daily 선택형 bounded backfill**을 승인된 공통 구조로 연결. 코드 변경이 필요하면 최신 main에서 최소 수정·회귀시험·PR, 정규 승인 설치.
3. 운영 수집/결과/게시/화면 검증까지 순서대로 수행. 새 명령·임의 shell/SQL 다운로드·공급자 권리 확대 금지.

과거 #4036은 재요청하지 않는다. 현재 Controller/Writer 정상 증거를 재사용한다.
