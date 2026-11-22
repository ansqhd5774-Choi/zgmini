# W01 물가지표 — 개편 5단계 진행 기록서

- 갱신 기준: 2026-11-21
- 저장소: `ansqhd5774-Choi/zgmini`
- 브랜치: `fix/economic12-inflation-legacy4-r35-20261021`
- **계획·완료 조건 정본:** [개편 작업계획서](INFLATION_5_STAGE_EXECUTION_PLAN_R1_20261121.md)
- **전체 이전 기록 보존:** [71단계 기존 원장](INFLATION_71_STEP_EXECUTION_LEDGER_R1_20261116.md) — 기존 기록을 삭제하거나 새로운 5단계 결과로 소급 바꾸지 않는다.

## 단계별 현재 상태

| 단계 | 상태 | 실제 완료/미완료 근거 |
| --- | --- | --- |
| 1. 운영 기준선 | **DONE** | 기존 [#2576](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2576) 원자료 25개 보존 검사 PASS 및 공개 API 기존 결과 확인. 26/26이나 게시 최신성 인증은 아님 |
| 2. Writer→D1→API | **IN_PROGRESS** | [#2577](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2577) 7후보 UNCHANGED_VERIFIED 있으나 D1 정확 키 `body/stored_at` 직접 readback 없음. 공개 물가7 6 READY/1 PENDING은 D1 동치 증거가 아님 |
| 3. Census #28 | **NOT_DONE** | 실제 보관 헤더·공식 원자료 복구/26/26 미확인. Controller A 등록 후보만 소스에 있음 |
| 4. R2 미래 날짜 | **NOT_DONE** | 이전 실측 `asOfDate=2026-11-21`인데 마지막 `trend.label=2026-11-30`; 소스 수정 PR #1340/#1344/#1352 완료 이력과 운영 미적용을 구분 |
| 5. 최종 종결 | **NOT_DONE** | 수집→저장→게시→UI 실제 동일 증거 미충족 |

**완료: 1/5단계. 2단계 진행 중.** 이 비율은 전체 작업량 20%를 뜻하지 않는다.

## 2026-11-21 — 최신 실제 작업 증거

- **Controller 운영:** [#2626](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2626#issuecomment-7059293030) 실제 `SUCCEEDED / APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, 설치 `565ddbd4ebfc46c88fb7dbaa810fd545656c6306`, 보호 불변·Workflow 활성. 이것은 W04 D1 읽기 변경의 성공이지 Census A 설치 성공은 아님.
- **Census 최신 source 후보:** 이전 #2624는 `b362…` 기준으로 후속 W04 변경 보존을 보장하지 못함. 신규 [Draft #2629](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2629), 설치 `565ddbd4…` 기준 후보 `f0e4771ebb2ff466fc687abe44fd7d1b846d5416`; 기존 48 operation 불변, 신규 Census A/light/60s 1개, 정확 3파일 diff. [3파일 해시·복구 검토](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2629#issuecomment-7059347464) 기록.
- **후보 해시:** `config/operations.json` `dcd36ac09efa4eb0fffe0331054a19314e1bc016bc3888611a94aa3fb1f252fb`; `controller/operations.mjs` `0ddead759b4a09e544b2d5de12c0cc79b2b11ea76a0e1920d9a71b9170f0a8cc`; `controller/inflation-census-m3-archived-headers-readonly.mjs` `b32d8250b7fc1fd76f3f8969ace3c695f136824ed02f2468d4ebf2f7c0268efa`.
- **미완료:** #2629 정확 대상 CI 성공·immutable B 승인 manifest·현시점 운영 CAS/lease·실제 설치·사후 Census A·공식 Census #28 복구; 물가7 D1 1키 직접 readback; R2 Writer 적용 및 실물 화면 검증. 이번 회차 W01의 추가 운영 PC/DB/D1/공급처·게시 쓰기 없음.

## 2026-11-21 — 2단계 D1 공식 클라이언트 경로 판별 및 Census 정적 무변경 확인

- **2단계 정규 D1 경로 확인:** 기존 제어소스 `controller/employment-r6-d1-readback-readonly.mjs`를 실제 조회하여, 승인된 PC Writer 소스 `scripts/pc-writer/d1.mjs`의 기존 `client(config,credential)`와 매개변수 SQL `SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?`로 D1 값을 직접 읽는 방식을 확인. 이는 기존 W04 고용 키 전용 A이며 **W01 물가 키의 실 D1 조회가 아님**. 본 대화의 연결 도구에는 인증된 D1 질의 실행 수단이 없어 현재 `detail:inflation-causal-candidates-7:r1` 직접 `body/stored_at`는 미확인. 공개 웹 GET·기존 로컬 Writer 영수증을 D1 관리자 저장값으로 승격하지 않음. 추가 게시/쓰기 0. **차단 범위는 2단계 정확 1키 D1 조회에만 한정**.
- **Census 선택 후보 정적 시험:** 설치 `565ddbd4…`와 [#2629 후보 `f0e4771…`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2629#issuecomment-7059504623)를 원본 UTF-8 텍스트로 직접 비교. 추가한 설정 1행 제거 시 기존 `config/operations.json` 원문 동일, import 1행/dispatch 1행 제거 시 기존 `controller/operations.mjs` 원문 동일. 기존 허용목록 48/48 불변·신규 하나로 49. 새 Census 모듈의 import는 `node:fs`, `node:path`, `node:crypto`만, provider fetch 및 파일 쓰기 API 없음. **정적 불변성 PASS이며 Windows CI·정규 설치·실제 아카이브 검증 아님**.
- **다음 실행:** 2단계는 이미 인증된 PC D1 클라이언트의 W01 정확 키 조회를 기존 승인·정규 운영 경로로 확보하여 현재 D1 `body/stored_at`과 공개 7행 비교. 독립 3단계는 #2629 정확 HEAD의 승인된 CI 및 Controller 3파일 B manifest/설치 CAS·lease 충족 시 설치→새 고유 헤더 A. R2의 기존 2파일 Writer 수정도 독립 추적. 단계 상태 **1 DONE / 2 IN_PROGRESS / 3~5 NOT_DONE** 유지.

## 2026-11-21 — #2636 단일 부모 설치 후보 확정·소스 CI 접수

- **근거 및 최소 교정:** #2629는 실제 설치 `565ddbd4ebfc46c88fb7dbaa810fd545656c6306` 대비 3 commits / 정확 3파일 diff. 이전 검증된 3개 파일 blob을 그대로 사용한 Git tree `623c843224ac418d5b5262bfb767609eb38b6782`에서 실제 설치 SHA를 **단일 부모**로 하는 신규 source commit `77dd931163531674550d6176b360fa80ed4d1e99` 생성. 실제 GitHub compare `ahead=1,behind=0`, 변경은 `config/operations.json` +1, `controller/operations.mjs` +2, 신규 reader +95 **정확 3파일**. 기존 W04 operation·파일 48개는 변형하지 않음.
- **단일 후보 GitHub 반영:** 새 검토용 [Draft PR #2636](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2636), source branch `codex/w01-census28-singlecommit-from-installed-565-20261121`; base는 실제 설치 `565ddbd4…` 고정 브랜치. 기존 #2629에 신규 PR로 대체 안내 댓글 남김(기존 3-commit 이력 보존·강제 push 없음). 3파일 SHA256은 기존 #2629 확인값과 **동일**. 이번 행동은 GitHub source 작성만 수행, 운영 설치/조회/DB·게시 변경 0.
- **소스 CI 접수 증거:** 새 PR target `77dd9311…`로 GitHub Actions 3건 확인 — Controller Maintenance Tests [run 44882261137](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44882261137), D05 Readonly Tests [run 44882261088](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44882261088), C996 R5 Checks [run 44882261100](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44882261100). 최초 확인 시 queued/in_progress 상태. **새로운 2차 GitHub Actions 조회에서 D05 #44882261088, C996 #44882261100, Controller Maintenance #44882261137 모두 completed/success (3/3)** 확인. 정확 HEAD `77dd9311…`의 소스 CI 검증 완료. 이는 **source-only 검증**이며 실제 B 승인·Controller 설치·PC 동작·D1 직접 조회 증거는 아님.
- **3단계 잔여:** 정확 target CI 결과→기존 승인 효과 범위 대조→정확 B manifest/현시점 installed SHA CAS·lease·보호·복구→독립 유지보수기로 설치→새 고유 Census A→공식 원자료 복구. #2636 Draft·B 미승인 상태에서는 운영 설치를 요청하지 않음. 개편 2단계 D1 정확 키 독립 미완료 유지.

## 2026-11-22 — #2636 3/3 CI 재확인·설치 승인 후보 패킷 완성

- **실제 CI:** 정확 후보 `77dd931163531674550d6176b360fa80ed4d1e99`의 GitHub Actions 3건 재조회에서 D05 #44882261088, C996 #44882261100, Controller Maintenance #44882261137 **전부 completed/success**. 개별 Workflow 소스 시험 결과이지 Windows 실PC 설치/아카이브 유효성 입증이 아님.
- **정확 B 검토 명세:** [PR #2636 검토 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2636#issuecomment-7071152472)에 마지막 실증 설치 `565ddbd4…`→단일 부모 target `77dd9311…`, 3파일 SHA-256, canonical allowFiles fingerprint `5f86383613686af9898c35b1809e6b5f49560a2769c17bf8ff6c03862b3a534f`, 기존 정규 설치 schema·CAS·lease·백업·복구·postcheck 요구를 명시. fingerprint는 승인 manifest 전체 해시가 아님. **APPROVED_B 파일/유효 승인·설치 요청은 생성하지 않음**. 기존 #2626 성공 시점의 설치 SHA를 지금까지 변하지 않은 실시간 설치본으로 단정하지 않음.
- **2단계 현재 제한:** PC 공식 Writer의 고정 쿼리 경로는 확인했지만 현재 연결된 D1 직접 조회 수단이나 기존 물가키용 실행 허용 operation은 확인되지 않아 D1 `detail:inflation-causal-candidates-7:r1` `body/stored_at` 실측은 계속 미완료. 공개 GET은 직접 D1 원장 대신 사용할 수 없음. 신규 무승인 SQL/임의 Runner 생성하지 않음.
- **단계 판정:** 1 DONE / 2 IN_PROGRESS / 3~5 NOT_DONE, 운영 설치·수집·D1·게시 쓰기 0. 다음은 2단계 정규 D1 정확키 readback과 병행해 #2636 승인 효과·실시간 설치 CAS를 확인한 뒤 정규 설치 후 Census A로 연결.

## 2026-11-22 — 물가7 D1 고정 읽기 조회기 소스 후보 작성 (SOURCE_ONLY)

- **원인 분리:** 마지막 실제 설치로 확인된 Controller `565ddbd4…`에 D1 승인 A 읽기는 `employment-r6-d1-readback-readonly`만 존재하며 물가7 정확 키 직접 SELECT 동작은 없음. 기존 #2577 Writer 원장은 `LOCAL_WRITER_LEDGER_ONLY_NOT_LIVE_D1`; 공개 GET으로 관리자 D1 저장값을 대체할 수 없음.
- **최소 재사용 구현:** 신규 [Draft PR #2647](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2647) 소스 후보. 변경 타깃 `fef90d5f64daf37b0084c82c9fd9edda7f1820e2`는 실제 설치 기준 `565ddbd4ebfc46c88fb7dbaa810fd545656c6306`의 직접 자식(`ahead=1/behind=0`). diff: `config/operations.json` +1 A/light/90s, `controller/operations.mjs` +1 import/+1 dispatch, 신규 `controller/inflation7-d1-readback-readonly.mjs` 123행, 소스 테스트 `controller/inflation7-d1-readback-readonly.test.mjs` 37행(설치 대상에서 제외). 기존 operation 48개와 W04 읽기 모듈은 건드리지 않음.
- **D1 쿼리 고정:** 기존 W04와 같은 설치 PC Writer `scripts/pc-writer/d1.mjs` 인증·Git checkout integrity 경로를 재사용, 매개변수화된 `SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?`의 정확 key `detail:inflation-causal-candidates-7:r1`만 읽도록 제한. 7개 ID·저장 projection 시각/버전·0/null/READY/PENDING 상태를 확인하고 공개 요약·body SHA256만 반환; 비밀 키·원문 raw 출력/수정 없음.
- **실제 상태:** GitHub source CI 3개 접수 확인(Controller Maintenance [#44964084806](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44964084806), C996 [#44964084803](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44964084803), D05 [#44964084813](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44964084813)); **검사 완료/PASS 미확인**, 새로운 source 테스트가 기존 workflow에서 실제 실행되었는지도 별도 확인 필요. #2647은 Draft·무승인·미설치이며 **D1 실측은 여전히 미완료**. 기존 Census #2636은 독립 source 후보로 유지하며 운영 설치를 반복·병렬 쓰기하지 않음.
- **다음 실행:** 정확 HEAD CI·테스트 결과 회수, 결함 시 소스만 최소 수정. 실제 운영 효과는 기존 Controller 승인 계약과 현시점 CAS/lease·백업을 충족하는 정규 통합 설치 후에만 사용. 물가7 D1 readback → 공개 7행 동치 검증이 완료되기 전에는 2단계 DONE 금지.

## 2026-11-22 — Census와 물가7 D1 A급 조회 단일 설치 후보 완성 (SOURCE_ONLY)

- **공유 CAS 충돌 예방:** 별도 [#2636](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2636)(Census)·[#2647](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2647)(물가 D1)은 같은 마지막 검증 설치 `565ddbd4…`에서 분기해 두 번 설치하면 두 번째 preimage CAS가 불일치할 수 있음. 기존 source PR/증거는 보존하고 실제 설치용으로는 **한 번의 B 효과**만 검토하도록 [Draft #2649](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2649) 통합 source 후보 생성. 두 component PR에는 별도 설치 요청 금지 댓글 연결.
- **실제 구성:** 통합 target `8309119a13992b1e608b51e4d68d230a832e250b`는 기존 설치 `565ddbd4ebfc46c88fb7dbaa810fd545656c6306`의 **단일 부모/단일 커밋**(`ahead=1 behind=0`). diff 정확 4 운영 파일: `config/operations.json` +2, `controller/operations.mjs` +4, 원본 Census header reader 95줄, 신규 물가7 D1 reader 123줄. + 소스 테스트 37줄은 설치에서 제외. 기존 48개 operation과 W04 employment D1 동작 불변, 신규 2개만 추가해 50개.
- **정확 파일 SHA256·회귀 근거:** [#2649 설치 검토 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2649#issuecomment-7071230576)에 4파일별 SHA-256와 `manifestFingerprint(allowFiles)=55eb2222ee575ea1a6b7c4df89229d8a531977a9b229df60c10c021288be579c` 기록. Node SHA-256 `abc` known vector로 해시 구현 검증, 각 실제 GitHub 파일 원문 해시 산출. component #2636 CI 3/3 SUCCESS, #2647 CI 3/3 SUCCESS. D1 순수 검증 함수의 격리 V8 테스트 3/3 PASS(해시 함수 스텁; Windows/D1 네트워크 아님). **통합 정확 HEAD #2649 C996 #44964319765 완료/success 확인, Controller #44964319849·D05 #44964319815는 대기 상태로 최종 3/3 PASS 미확인**이므로 component PASS를 통합 승인으로 전가하지 않음.
- **현재 실제 장애와 단계 상태:** #2649는 Draft/source-only; 이 시점 B 효과 승인·immutable 승인 manifest·실물 설치 CAS/lease·유지보수기 영수증 없음. 실제 인증된 물가7 D1 `body/stored_at`은 여전히 미확인, Census archive A와 공식 원자료 복구도 미실시. 운영 Provider/SQLite/D1/Controller 설치/공개 게시 변경 0. **단계 1 DONE / 2 IN_PROGRESS / 3~5 NOT_DONE**.
- **다음 실행:** #2649 exact CI 결과 회수 및 기능별 회귀 검증 → 승인 범위/정확 B 효과 확인 → 설치 시점 실제 Controller SHA CAS·lease·보호 원장 및 rollback 검증 → 기존 독립 유지보수기 단일 B 적용 → 고유 물가 D1 조회 A와 Census 보관 헤더 A 각각 결과 회수 → 실제 원자료/공개 API 비교. 기존 R2 Writer 미래 날짜 문제는 독립 승인 범위로 계속.

## 2026-11-22 — #2649 통합 HEAD CI 최종 3/3 확인 및 B 효과 범위 대조

- **정확 HEAD 확인:** [통합 PR #2649](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2649) HEAD `8309119a13992b1e608b51e4d68d230a832e250b`를 GitHub Actions commit 조회로 확인. [C996 #44964319765](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44964319765), [D05 #44964319815](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44964319815), [Controller Maintenance #44964319849](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44964319849) 모두 **completed/success, 3/3**. 과거 대기 표기는 이 확인으로 대체. source-only이며 운영 설치 증거는 아님.
- **승인 효과 대조:** `main`의 기존 승인 `approvals/controller-updates/565ddbd4ebfc46c88fb7dbaa810fd545656c6306.json`은 이전 설치 `38503532… → 565ddbd4…`의 W04 고용 D1 조회 **1파일** 승인만 명시. 통합 목표 `8309119a…`의 Census·물가 D1 4파일에 대한 승인으로 전용할 수 없음. `main`의 `approvals/controller-updates/8309119a13992b1e608b51e4d68d230a832e250b.json` 및 `approvals/controller-selective-targets/8309119a13992b1e608b51e4d68d230a832e250b.json`는 조회 당시 404. 이는 해당 두 경로가 없다는 사실이지 다른 모든 승인·실시간 PC 상태가 부재한다는 단정은 아님.
- **결과/제약:** [#2649 검토 패킷](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2649#issuecomment-7071230576)은 `SOURCE ONLY / PROPOSED, NOT APPROVED_B`로 명시. 현시점 실PC installed CAS·lease·동일효과 승인 및 실행 영수증은 미확인. 별도 순차 설치·임의 PC Issue/명령을 실행하지 않았으며 D1/Census live 조회·원자료 복구·게시 변경도 없음. 단계 **1 DONE / 2 IN_PROGRESS / 3~5 NOT_DONE** 유지.
- **다음 필수 실행:** 기존 다른 유효 승인까지 해당 4파일·2개 고정 읽기 효과에 적용 가능한지 확인하고, 정확 B 승인 및 현시점 CAS·lease·백업·복원 계약을 갖춘 후 독립 유지보수기로 통합 단회 설치. 이어 신규 고유 A 두 건의 결과 JSON/TXT를 회수하여 D1 및 Census 실제 상태 검증. 단계 4 R2 Writer는 독립 진행.

## 2026-11-22 — #2650 운영 Controller 실증 재사용 및 통합 설치 사전 판단

- **새 실제 PC 근거 재사용:** W04 기존 고유 A [#2650](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2650#issuecomment-7071263400)의 PC JSON/TXT 결과를 회수. `finishedAt=2026-11-22T00:01:46.536Z` (KST 09:01:46), `status=PASS`, `code=CORE_READONLY_DIAGNOSIS`, `actualExecutionSha=565ddbd4ebfc46c88fb7dbaa810fd545656c6306`, `protectedStateUnchanged=true`, `providerCalls=0`, `d1Writes=0`. 이는 그 실행 시점 기존 Controller 실제 SHA의 증거이며 **현시점 설치 lease·승인까지 입증하지 않음**. 동일 효과 조회 중복 요청하지 않음.
- **설치 diff 재검사:** GitHub compare `565ddbd4… → 8309119a…`는 `ahead=1 behind=0`, 변경 `config/operations.json`, `controller/operations.mjs`, 신규 Census/D1 조회 모듈 각 1개, 추가 테스트 1개로 **운영 대상 4파일+테스트 1파일**. 기존 승인 W04 `approvals/controller-updates/565ddbd4….json`/선택 pin은 이전 1파일 변경 전용. 기존 승인 Census API 및 Writer 파일 manifest는 해당 수집·Writer 효과만 승인하며 신규 4파일 Controller 설치 자체의 승인은 아님.
- **정확 상태:** 통합 source CI 3/3 success, 현재 #2649 Draft `SOURCE ONLY / PROPOSED, NOT APPROVED_B`. 현행 통합 4파일 설치를 포괄하는 유효한 사용자 승인·동결 manifest·실행 시점 lease는 **미확인**. 따라서 운영 설치 B 또는 미설치 A 조회는 생성하지 않음. 원자료·D1·공개 게시 변경 0. 단계 1 DONE, 2 IN_PROGRESS, 3~5 NOT_DONE.
- **다음:** 명시 승인 여부 최종 결정 후 정확 4파일 B manifest와 현재 PC CAS/lease·백업/롤백을 검증해 단일 독립 유지보수기 적용. 실제 설치·사후 조회 확인 후 2개 신규 고유 A 결과 회수.

## 2026-11-22 — 사용자 통합 B 설치 승인·롤백 고정 및 #2657 승인 소스 준비

- **사용자 명시 승인:** Census header A + inflation7 D1 A를 추가하는 [#2649](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2649) 정확 4운영파일의 단일 Controller B급 설치를 승인하고, 문제 시 즉시 복구 가능한 백업·롤백 동반 진행을 지시함. 범위 밖 Writer/DB/D1 쓰기·provider/scheduler 변경은 승인 대상 아님.
- **정규 승인 명세 소스 준비:** 제어소스 `main@7a887124c591c81f661cfc4e56a167a3003d5c8a` 기반 별도 [PR #2657](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2657)에 `approvals/controller-selective-targets/8309119a13992b1e608b51e4d68d230a832e250b.json`과 `approvals/controller-updates/8309119a13992b1e608b51e4d68d230a832e250b.json` 두 파일 작성. 대상 `8309119a…`, 이전 설치 `565ddbd4…`, 승인 PR `#2657`, 변경 4파일 SHA256, `manifestFingerprint=55eb2222ee575ea1a6b7c4df89229d8a531977a9b229df60c10c021288be579c`, `VERSIONED_SNAPSHOT`, `RESTORE_INSTALLED_SHA(565ddbd4…)`, `postOperation=core-status`, 선택 Source branch/SHA를 명시. SHA256 목록 canonical JSON 해시 재계산 일치.
- **아직 운영 적용 아님:** PR #2657 승인 파일 검사 C996 [run #44965753719](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44965753719)는 최초 조회 시 `queued`. main 수락, 승인 manifest raw byte hash 고정, 유지보수기 실제 installed CAS/lease, PC B 영수증 및 사후 A 결과는 **미완료**. PR 파일 준비/사용자 동의만으로 설치 성공이나 자동 롤백 완료를 주장하지 않음. 다른 Controller 설치가 먼저 발생해 CAS가 변경되면 기존 manifest 강행 금지.
- **다음 필수 실행:** #2657 검증 성공 및 main 정확 반영→현재 운영 CAS/lease와 기존 설치 충돌 검증→새 고유 정규 단일 B 요청→실제 설치·필요 시 원복·코어 사후검사 영수증 회수→각 고유 D1/Census A 실행→R2 독립 검증. 개편 단계 `1 DONE / 2 IN_PROGRESS / 3~5 NOT_DONE` 유지.

## 2026-11-22 — 승인 manifest 통합 후 실제 설치 CAS 변경 대응

- **사용자 명시 승인 범위 유지:** #2649 동일 4개 Controller 운영 파일(Census 보관 헤더 A + 물가7 D1 고정 A), 문제 시 버전 백업 후 롤백. Writer/DB/D1/Provider/Task 효과 없음.
- **첫 승인 반영 완료, 무설치:** [제어 PR #2657](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2657)은 C996 성공 후 정확 2개 승인 파일이 main merge `3280c45fb91c091478b74cfc7cca12241419b333`로 반영됨. 이는 구 설치 `565ddbd4…`→구 후보 `8309119a…`용 B 파일이며 **PC 설치 성공 아님**.
- **새 운영 증거가 구 CAS를 무효화:** 기존 다른 기능 [제어 Issue #2652](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2652#issuecomment-7071405074)는 `SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, `actualControllerSha=d260aea2513902a77425344629f91575e2d950ef`, `protectedStateUnchanged=true`, `workflowEnabled=true` 및 JSON/TXT 기록을 반환. `565ddbd4… → d260aea2…` diff는 `controller/core-runtime-source-readonly.mjs`, `controller/core-runtime-source-wmi.mjs` 2파일뿐이며, 구 W01 2개 operation은 없음. 이 실증 시점 이후 구 `8309119a…` manifest 설치는 preimage CAS가 일치하지 않으므로 **실행 요청하지 않음**. [구 PR #2657 안전 공지](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2657#issuecomment-7071488002) 남김.
- **기존 변경 보존 단일 부모 후보 재구성:** [새 source Draft #2659](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2659), `d260aea2513902a77425344629f91575e2d950ef`의 직접 자식 `6a4c1221c9a246f739a37f58f3e956aa3c61108d` (GitHub compare `ahead=1 behind=0`). 기존 W01 검증된 4개 운영 파일의 Git blob을 그대로 적용하고 소스 테스트 1개만 병행하며 `d260…`의 공통 Runtime 파일 2개를 변경하지 않음. source CI C996 #44966025628, D05 #44966025615, Controller Maintenance #44966025636 **3/3 SUCCESS**.
- **새 승인/복구 source:** [#2660](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2660)에서 원본 `d260…`→목표 `6a4c…`, 4파일 SHA256·allowFiles fingerprint `55eb2222ee575ea1a6b7c4df89229d8a531977a9b229df60c10c021288be579c`, `VERSIONED_SNAPSHOT`, `RESTORE_INSTALLED_SHA(d260…)`, `core-status`를 고정. 최초 확인 시 승인 소스 C996 #44966077309 **in_progress**. 아직 main 승인 파일 반영/실시간 CAS·lease/B 설치 영수증 미확인으로 **운영 설치 0**.
- **다음 필수 실행:** #2660 CI 성공→main 정확 승인 source 확인→PC 설치 시점 실제 installed CAS·lease 정규 안전 검사→고유 단일 B 유지보수기 요청→실제 설치/실패 시 원복 JSON/TXT 회수→D1/Census A 각각 단회 읽기. 단계 `1 DONE / 2 IN_PROGRESS / 3~5 NOT_DONE` 유지.

## 2026-11-22 — #2660 승인 반영·#2662 독립 유지보수기 설치 요청

- **정확 새 소스/승인 CI 완료:** `d260aea2513902a77425344629f91575e2d950ef`의 단일 자식 `6a4c1221c9a246f739a37f58f3e956aa3c61108d` [source PR #2659](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2659)에서 C996 #44966025628, D05 #44966025615, Controller #44966025636 3/3 `completed/success`. 새 [승인 PR #2660](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2660) C996 #44966077309 `completed/success`, merge SHA `8ee23a3e624ebbf4f47bf0040f372180d19ae332`. main의 정확 신규 target 2개 승인 파일 존재를 재조회.
- **정규 승인 검증:** `approvals/controller-updates/6a4c1221c9a246f739a37f58f3e956aa3c61108d.json` 원문 UTF-8 SHA256 `83ba43208377aff0029cf6a56076e7bbe9c76985cf6802a8d95c764247d4ea19`을 known-vector SHA-256로 직접 계산. allowFiles fingerprint `55eb2222ee575ea1a6b7c4df89229d8a531977a9b229df60c10c021288be579c`와 pin 일치 확인. manifest의 `installedSha=d260aea2…`, `VERSIONED_SNAPSHOT`, `RESTORE_INSTALLED_SHA(d260aea2…)`, `postOperation=core-status` 확인.
- **실제 B 요청 발행:** [독립 유지보수기 Issue #2662](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2662), `requestId=pc-update-68eee7fc-ae3f-4df8-b8ae-3b75b41caabb`, operation `controller-update`, pin `6a4c1221…` / manifest SHA256 `83ba4320…`, `pc-maintenance` label. 동일 효과 요청 추가 생성하지 않음. 최초 댓글 조회 시 결과 없음. **접수 성공은 설치/롤백 성공이 아니며** 현재 `RUNNING/STATE_UNKNOWN`의 정확한 단계는 유지보수기 JSON/TXT 회수 전까지 미확인.
- **필수 후속:** #2662 단일 원본의 유지보수기 댓글/결과 JSON/TXT 회수하여 `status/code/actualControllerSha/recoverySha/protectedStateUnchanged/workflowEnabled` 확인. 성공 시 정확 SHA 신규 A 2개 단회 조회, 실제 D1/헤더 결과 검증. 실패면 승인된 rollback 결과 및 현시점 설치 상태 검증. 운영 데이터 수정 0. 5단계 `1 DONE / 2 IN_PROGRESS / 3~5 NOT_DONE` 유지.

## 2026-11-22 — #2662 실제 사전검증 BLOCKED 원인 수정 및 정확 4파일 후보

- **실제 B 결과:** [원본 Issue #2662](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2662#issuecomment-7071511671) 유지보수기 댓글·[JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/maintenance-pc-update-68eee7fc-ae3f-4df8-b8ae-3b75b41caabb.json) 확인: `status=BLOCKED`, `code=SELECTIVE_NONSCOPED_DIFF`, `firstFail=RECEIVED`, `actualControllerSha=d260aea2513902a77425344629f91575e2d950ef`, `recoverySha=null`, `protectedStateUnchanged=null`, `workflowEnabled=true`. 사전검증 단계에서 중단됐으므로 설치·rollback 성공 주장은 하지 않음. **동일 requestId replay 금지**.
- **실패 코드의 직접 조건 확인:** 설치된 기존 `tools/update.mjs`는 `manifest.selectiveSource`가 있는 경우 `git diff --name-only installedSha...targetSha`의 **전체 변경 파일 배열**과 `allowFiles`의 4개 path 정확 일치를 요구해 `SELECTIVE_NONSCOPED_DIFF`를 발생시킴. 구 source `6a4c1221…`에는 배포 제외 테스트 `controller/inflation7-d1-readback-readonly.test.mjs` 1개가 추가돼 정확히 5개 변경으로 차단. 이는 실제 테스트/운영 파일 구분 계약 충돌이며 Provider/DB의 문제 아님.
- **원인 직접 수정:** 정규 승인 scope를 늘리거나 안전 검사를 삭제하지 않고, 같은 base `d260aea2…`로 **정확 4파일**만 변경한 새 단일 부모 source commit `d6a7c6bbaecc918f63afa3f6bd8b292bb6391439` 작성. [source Draft #2663](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2663), compare `ahead=1 behind=0`, 정확 `config/operations.json`, `controller/operations.mjs`, Census header 모듈, inflation7 D1 모듈 4파일만. 기존 Core092의 두 모듈 및 다른 운영 코드 보존. 테스트는 이전 #2659에서 CI 3/3 성공 근거 유지; 새 후보 자체 CI 완료 필요.
- **정확 신규 승인 source:** [PR #2664](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2664)에 target `d6a7c6bb…`/base `d260aea2…`, 동일 승인 4파일 SHA256, `VERSIONED_SNAPSHOT`, `RESTORE_INSTALLED_SHA(d260aea2…)` pin·manifest 추가. C996 CI는 최초 조회 당시 queued. 승인 source main 반영 전, 정확 target 자체 CI 및 현재 PC CAS·lease 검증 전에는 다음 B Issue 발행하지 않음.
- **현재 단계:** 1 DONE / 2 IN_PROGRESS / 3~5 NOT_DONE. D1/Census 실제 원장 readback·수집/게시 변경 없음.

## 2026-11-22 — 정확 4파일 승인 CI 완료 및 #2665 설치 요청

- **실제 사전검증 실패 수정:** 이전 [#2662](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2662#issuecomment-7071511671)는 `BLOCKED/SELECTIVE_NONSCOPED_DIFF`로 설치 이전 차단, 실제 구 Controller `d260aea2…`, rollback 없음. 테스트 파일이 포함된 Git diff 5파일과 정확 허용 4파일의 비교 조건 불일치를 기존 `tools/update.mjs`에서 직접 확인. 검사 삭제·우회 없이 새 source는 정확 4파일 diff로 교정.
- **새 통합 소스 확정:** [source PR #2663](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2663), 직접 부모 `d260aea2513902a77425344629f91575e2d950ef`, 목표 `d6a7c6bbaecc918f63afa3f6bd8b292bb6391439`; GitHub compare `ahead=1/behind=0`, 변경 정확 4개 Controller 파일(테스트 파일 diff 없음). C996 #44966386366, D05 #44966386321, Controller Maintenance #44966386365 **3/3 SUCCESS**.
- **새 B 승인 정본:** [approval PR #2664](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2664) C996 #44966431471 SUCCESS, main merge `5365d7fef2d2c37923a37d14ee1135a19547f9a4`. 새 2 승인 파일에서 동일 allowFiles fingerprint `55eb2222ee575ea1a6b7c4df89229d8a531977a9b229df60c10c021288be579c`와 `VERSIONED_SNAPSHOT/RESTORE_INSTALLED_SHA(d260aea2…)` 보존. 원문 승인 manifest SHA-256 `0d319423f6afd6b09064a7f186f849b901ac6e424aa6c76de8e3d514482f3104` 자체 계산/known vector 시험 통과.
- **새 단회 B 요청:** [Issue #2665](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2665), 고유 requestId `pc-update-8cb6f1b1-88e3-444d-bf44-af8ab4dd8fea`, 대상 `d6a7c6bb…`, 정확 manifest raw SHA256 pin, `pc-maintenance` label로 등록. 최초 댓글/결과 JSON readback 미확보: **설치 성공/롤백 성공을 주장할 수 없음**, 진행/미확인으로 유지. 같은 requestId로 재접수·기존 #2662 replay 금지.
- **다음:** 원본 #2665 상태·유지보수기 결과 JSON/TXT를 재조회해 `status/code/actualControllerSha/recoverySha/protectedStateUnchanged/workflowEnabled` 검증. 성공 시 Census 헤더와 물가7 D1의 고유 A 조회를 순차 발행하고 실제 값 검증; 실패/미상 시 설치/백업/lease 실제 상태 확인 후 규정 복구. 단계 1 DONE, 2 IN_PROGRESS, 3~5 NOT_DONE 유지.

## 2026-11-22 — #2665 소스 연결 mismatch 해결·#2669 3차 단회 설치 요청

- **두 번째 실제 B 결과/원인:** [#2665 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2665#issuecomment-7071577875) `BLOCKED / SELECTIVE_MAIN_SOURCE_HASH_MISMATCH`, `firstFail=RECEIVED`, `actualControllerSha=d260aea2513902a77425344629f91575e2d950ef`, `recoverySha=NONE`, `protectedStateUnchanged=UNVERIFIED`, workflow 활성. 설치/롤백 실행 증거 없음. 직접 코드 `tools/update.mjs`의 `selective.customPaths.includes(item.path)` 검사를 확인: 4개 W01 신규 파일은 `main` 기존 바이트와 일치하지 않으므로 customPath로 명시해야 하지만 이전 manifest는 빈 배열. 과거 #2665 B 요청 재실행 금지.
- **실제 실패 조건 최소 수정:** 새 직접 부모 d260 source commit `9c084bf032dee10c0172646619559f641c1e422a`, [source PR #2667](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2667). 기존 W01 운영 4파일 바이트 동일, 다른 코드 수정·테스트 파일 diff 없음. GitHub compare 정확 `ahead=1 behind=0`, 4파일만. C996 #44966879472, D05 #44966879471, Controller Maintenance #44966879480 모두 `completed/success`.
- **공식 선택 설치 customPaths·복원 고정:** [승인 PR #2668](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2668)에서 `allowFiles` 4경로를 `selectiveSource.customPaths`와 승인 pin `customPaths`에 정확 동일하게 반영. `validateControllerSelectivePin`의 정확 파일/기준/승인 ref/복원 조건 자체는 유지. C996 #44966933720 SUCCESS, control main merge `17aff99ed3b3b1ee0b9053a64bca3eead043fe05`. manifest 원문 SHA256 `701fdf5fe843ac840a614c603f5c7b8adef4edf46a1b167b3470ca88848e17c0`, allowFiles canonical fingerprint `55eb2222ee575ea1a6b7c4df89229d8a531977a9b229df60c10c021288be579c`, rollback `RESTORE_INSTALLED_SHA(d260aea2…)`.
- **새 고유 B 원본:** [Issue #2669](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2669), `requestId=pc-update-3652629d-dd06-4e5d-a7a7-1efeb056cf9d`, 목표 `9c084bf0…`, 정확 manifest hash pin 및 `pc-maintenance` 등록. 마지막 댓글 조회 시 결과 아직 없음, 대응 상태 `STATE_UNKNOWN / RESULT_PENDING` (정확 실제 단계는 미확인). 결과 파일 404는 실패 또는 설치 여부 판정 아님. 중복 요청 금지.
- **후속:** #2669 실제 유지보수기 결과 JSON/TXT의 status, code, actualControllerSha, recoverySha, protectedStateUnchanged, workflowEnabled 회수. PASS이면 신규 A 두건 고유 실행 후 D1/Census 저장 근거 대조. 실패 시 조건·실제 파일/backup/lease로 복구 판단. 전체 개편 단계 `1 DONE/2 IN_PROGRESS/3~5 NOT_DONE` 유지.

## 2026-11-22 — #2669 실제 Controller 설치 성공·롤백 불필요

- **실제 PC 설치 완료:** [제어 Issue #2669 결과 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2669#issuecomment-7071670003), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/maintenance-pc-update-3652629d-dd06-4e5d-a7a7-1efeb056cf9d.json), [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/maintenance-pc-update-3652629d-dd06-4e5d-a7a7-1efeb056cf9d.txt) 직접 회수. `requestId=pc-update-3652629d-dd06-4e5d-a7a7-1efeb056cf9d`; `STATUS=SUCCEEDED`; `CODE=APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`; `LAST_PASS=PASS`; `FIRST_FAIL=NONE`; `targetControllerSha=actualControllerSha=9c084bf032dee10c0172646619559f641c1e422a`; `PROTECTED_STATE_UNCHANGED=true`; `WORKFLOW_ENABLED=true`; `recoverySha=null`; `REPORT_UPLOAD=VERIFIED`. 사용자 승인 4파일 정규 설치 및 Controller 사후검사 **완료**, 롤백 수행 필요 없음.
- **오류 정정:** 이전 조회 때 #2669 댓글/결과가 아직 없어 `STATE_UNKNOWN`이라고 기록했으나 이후 완료 영수증 수신이 확인됨. 미수신은 당시 관측 상태였지, 설치 실패나 유지보수기 장애의 입증 원인이 아님. #2662 `SELECTIVE_NONSCOPED_DIFF`와 #2665 `SELECTIVE_MAIN_SOURCE_HASH_MISMATCH`는 별도 실패로 기록 유지.
- **아직 완료 아님:** 설치 완료는 물가 D1 실제 body/stored_at·Census 보관 헤더·원자료 복구·R2 Writer/Production UI 검증의 완료가 아님. 다음은 설치된 명령 `inflation7-d1-readback-readonly` 및 `inflation-census-m3-archive-headers-readonly`의 정확 operation 이름을 현재 config/dispatcher에서 재확인하고, 각각 고유 A급 정상 요청·JSON/TXT 결과 회수. 5단계 `1 DONE/2 IN_PROGRESS/3~5 NOT_DONE` 유지.

## 2026-11-22 — 설치 후 W01 D1·Census 실제 A급 읽기 요청

- **설치본 operation 확인:** 제어 `9c084bf032dee10c0172646619559f641c1e422a`의 `config/operations.json`과 `controller/operations.mjs` 직접 조회. 정확 2개 A/light 이름은 `inflation7-d1-readback-readonly`(90s), `inflation-census-m3-archive-headers-readonly`(60s). 두 모듈은 readonly이고 별도 provider/DB/D1 쓰기 없음.
- **중복 방지:** 과거 Census 요청 [#2619](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2619)→[#2620](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2620) 동일 requestId는 구 Controller의 `OPERATION_NOT_ALLOWED`로 종료 확인. 신규 명령은 현재 설치 후 처음 실행하는 고유 A급 작업으로 발행.
- **신규 고유 A 요청:** 고정 public source `ansqhd5774-Choi/zgmini main@2eb796da811d0e074ca0cabab8e2cad9502bff43` 기반 [D1 Issue #2671](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2671) `requestId=pc-ff69e9ef-a316-46c7-b0b3-268b198f628e`; [Census Issue #2672](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2672) `requestId=pc-28af9cac-95c4-47f0-92f1-3bd65089aec4`. 요청 생성 후 최초 결과 댓글 조회는 미수신. **설치 성공이 D1 데이터 조회 성공이라는 뜻은 아니며 결과 조회 전까지 미확인.**
- **검증 대상:** D1 키 `detail:inflation-causal-candidates-7:r1` 조회에서 `d1StoredAt,d1BodySha256,sourceVersion,ready,stale,indicators`와 status/code 검증. Census는 원본 2025·2026 보관 헤더 모양/원본 SHA/연도별 누락 확인. 각각 JSON/TXT와 실제 실행 SHA 9c084bf0…를 확인하고, 문제시 독립적으로 처리. 전체 개편 1 DONE / 2 IN_PROGRESS / 3~5 NOT_DONE.

## 다음 실행·종결 규칙

1. **현 단계 2:** 통합 #2649의 승인·실제 설치가 확인되면 고유 물가 D1 A를 단회 실행하여 기존 D1 정확 키의 `body/stored_at`과 공개 물가7의 상태·값·관측일·버전 읽기 검증. 실패한 실제 연결만 수정.
2. **독립 단계 3:** #2636 정확 후보 회귀·효과 승인/manifest 및 실제 installed CAS 확인 뒤 정규 B 적용; 실제 설치가 확인된 후 Census header A; 승인된 원자료 복구로 이어감.
3. **독립 단계 4:** 기존 R2 Writer 2파일 후보의 승인 여부/현재 실물 preimage 확인 후 정규 적용, 실제 로컬·D1·API·PC/모바일 날짜 동치 확인.
4. DONE은 기능의 실제 운영 결과·영수증을 확보한 경우에만 갱신. 기존 문서/PR/CI 성공을 설치나 게시 성공으로 승격하지 않는다.

## 기록 관리

새 완료 증거는 이 문서의 상태표와 날짜별 기록에만 추가하고, 완료 조건은 계획서에서만 변경한다. 기존 71단계 파일은 과거 보존 원장으로 유지한다.
