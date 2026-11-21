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

## 다음 실행·종결 규칙

1. **현 단계 2:** 기존 D1 정확 키의 `body/stored_at`과 공개 물가7의 상태·값·관측일·버전 읽기 검증. 실패한 실제 연결만 수정.
2. **독립 단계 3:** #2629 정확 후보 회귀·효과 승인/manifest 및 실제 installed CAS 확인 뒤 정규 B 적용; 실제 설치가 확인된 후 Census header A; 승인된 원자료 복구로 이어감.
3. **독립 단계 4:** 기존 R2 Writer 2파일 후보의 승인 여부/현재 실물 preimage 확인 후 정규 적용, 실제 로컬·D1·API·PC/모바일 날짜 동치 확인.
4. DONE은 기능의 실제 운영 결과·영수증을 확보한 경우에만 갱신. 기존 문서/PR/CI 성공을 설치나 게시 성공으로 승격하지 않는다.

## 기록 관리

새 완료 증거는 이 문서의 상태표와 날짜별 기록에만 추가하고, 완료 조건은 계획서에서만 변경한다. 기존 71단계 파일은 과거 보존 원장으로 유지한다.
