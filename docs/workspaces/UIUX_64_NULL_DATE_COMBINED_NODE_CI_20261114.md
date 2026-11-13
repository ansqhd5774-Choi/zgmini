# ZGMINI UIUX — 64차 결측·날짜 통합 Node CI 실증

**기준:** 2026-11-14 KST · 담당 `UIUX 전문가-codex/ui-improvements-2`  
**원본 지시:** [공통 제어 #68 / 64차 #6866070807](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6866070807)  
**전체 화면 검증률:** **25% → 25%**. Production 직접 검증 성공으로 오인하지 않음.
**정본:** 기능 `main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`; 제어 main의 AGENTS.md / GENERAL_CHAT_START.md / PC_AUTOMATION_STANDARD.md 직접 확인.

## 1. 이번 실제 소스 작업

1. [Draft PR #1067](https://github.com/ansqhd5774-Choi/zgmini/pull/1067)의 수정 HEAD `68c31fbe53a07eef20063eda2cd76372a5b06671`를 확인·재사용. 중앙 리뷰 [#6865823263](https://github.com/ansqhd5774-Choi/zgmini/pull/1067#issuecomment-6865823263)의 `score:null,value:83` 누락 우선 문제를 기존 원담당이 수정한 최신 소스 blob `0437217921d60051e2616b0171f719ab026cb704` 확인. `const value=point?.score===null?null:(point?.score??point?.value)`로 score 명시 결측을 보존하면서 `value`만 존재하는 구형 값, 점수 0, trailing null 마지막 유효점도 보호. 새 테스트 blob `55b934b8412739ac30181537f07a9fbda982af52`에는 관련 회귀 2건 추가.
2. [Draft PR #1068](https://github.com/ansqhd5774-Choi/zgmini/pull/1068)에서 구 구현문 `chart.at(-1)` / `oneYear.map`에 고정됐던 테스트 2건이 **실제 날짜·null gap·마지막 유효점·raw `value`/0 계약과 UI 연결**을 검사하도록 보완된 것을 확인. 최종 테스트 blob `7c73d7b982d0f076ebd6ae1fb63dcd67e02c8b3e`.
3. #1068의 최신 **결합 HEAD `12f0bf05c306788e76a3974dfefcc499499e7fe1`**에는 #1067의 수정된 `economicOneYearChart`, #1068의 `isRealEconomicScoreDay`, 패널 배선, 두 회귀 파일 총 **정확히 5파일**이 함께 포함됨. 현재 전체 main 대신 **선택적 소스 diff**만 제시. #1067와 #1068을 각각 모두 main에 순차 merge하지 말고 **결합 #1068의 5파일 기준으로 통합 GO/NO-GO**를 판단하도록 PR 설명을 실제 범위에 맞춰 갱신하고 원격 재조회 PASS.
4. 위 최종 소스와 회귀 중 3개 파일을 **기존 UI 전용 브랜치 `codex/ui-improvements`에도 실파일 동치로 반영**함. helper `04372179...`, 기존 null 회귀 `55b934b...`, 날짜·결측 회귀 `7c73d7b...`. 새 owner 브랜치 HEAD `b59fa6b2befb9d079fd62fb3ad65212d13dfdef3` (보고 문서 커밋 전). 종전 owner branch의 기타 변경을 덮어쓰지 않음. 해당 브랜치의 패널은 원래부터 두 helper를 결합해 사용하므로 덮어쓰기 없음.

## 2. LAST PASS — 실제 합동 Node CI

| 항목 | 실측 결과 |
|---|---|
| #1067 수정본 Node CI | [Run #43516951055](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43516951055) **completed/success** |
| **#1068 결합 수정본 Node CI** | [Run #43517251887](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43517251887) **completed/success**, HEAD `12f0bf05...` |
| Build / Type check | **PASS / PASS** |
| Regression tests | **4,193 total / 4,184 PASS / 0 FAIL / 6 SKIP / 3 TODO** |
| PC publication recovery source tests | **11/11 PASS** |
| Cloudflare candidate read contract tests | **69/69 PASS** |
| 필수 기능 회귀 | `score:null,value:83` 보존, value-only 호환, 0값, 실제 Gregorian 날짜, gap 연속선 단절, `trailing null`의 마지막 유효점 **PASS** |

#1066/#1069 완료 CI 및 기존 브라우저 mock PNG 검사는 재실행하지 않음. 이번 CI는 GitHub의 **Node.js source tests**이지 실제 운영 PC 수집/저장/게시나 Cloudflare 배포의 성공 증거가 아님.

## 3. FIRST FAIL 및 미완료

**FIRST FAIL (소스 단계에서 수정):** [#1067 중앙 리뷰 #6865823263](https://github.com/ansqhd5774-Choi/zgmini/pull/1067#issuecomment-6865823263) 기존 `score:null,value:83`가 `value:83`로 대체되는 결손. 기존 #1068 테스트 2건이 구 구현 표현식을 강제하여 두 PR 결합 시 불일치하는 구조 종속 문제. 현재 최신 소스와 결합 CI에서는 두 문제 모두 수정·PASS.

**별도 미완료:** Draft PR #1068은 **OPEN / Draft / 미병합 / 미배포**. Production 4개 페이지 × PC 1440px·모바일 390px **8/8 UNVERIFIED**, 동시점 API 원문·Deployment SHA·실제 모바일 overflow/차트 끝점 등 미검증. 기존 승인 무료 라이브 브라우저 Host permission / SOCKS / DNS / 크레딧 제한은 재시도하지 않음. 이는 `AUTOMATION_BLOCKED(PRODUCTION_BROWSER_OR_PUBLIC_READ_ACCESS)` 범위만 제한.

**운영 영향:** 산식·가중치·DB/D1·데이터·TTL·PC/Controller/Writer·Runner·DNS·Cloudflare 배포 변경 **0건**. 5파일 source-only 변경.

## 4. 다음 필수 실행 하나

**담당: 승인된 소스 통합 Owner.** 결합 Draft [PR #1068](https://github.com/ansqhd5774-Choi/zgmini/pull/1068) HEAD `12f0bf05c306788e76a3974dfefcc499499e7fe1`의 5파일 + [Node CI #43517251887](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43517251887)을 기준으로 **정규 main 통합 GO/NO-GO 결정**. 이전 #1067 단독 PR의 중복 merge 여부를 확인할 것. PR/CI로 운영 설치나 Production 완료를 선언하지 않고, 승인된 배포와 무료 브라우저 접근 정상화 후 실제 8뷰+API 일치 검증은 별도 단계.


## 65차 — 정규 main 통합 판단을 실제 요청하고 HOLD 상태 보존

- 기준일 2026-11-14 KST, UIUX 전체 진행률 **25%→25%**. 최신 기능 main `643b7c7c4372ffad552443fc312c6cb1b944e2fc`, UI 브랜치 착수 HEAD `78e864ab7e7f6b80e9c039a72bf5ffea88aa61ef`, 제어 main `69e25a08a903dc8e52ef1093ec15837de4c20858`. 65차 공식 [#68 지시 #6866393700](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6866393700)의 **UIUX 항목**만 적용했다.
- [중앙 소스 리뷰 #6866344306](https://github.com/ansqhd5774-Choi/zgmini/pull/1068#issuecomment-6866344306)는 정확 HEAD `12f0bf05c306788e76a3974dfefcc499499e7fe1`, base main `643b7c7c4372ffad552443fc312c6cb1b944e2fc`, 5개 변경파일에 대해 `SOURCE_INTEGRATION_REVIEW_GO`를 선언하지만 `MAIN_MERGE_HOLD`와 `PRODUCTION_UNVERIFIED`를 명시적으로 유지한다. [Draft PR #1068](https://github.com/ansqhd5774-Choi/zgmini/pull/1068)는 **OPEN/Draft/미병합**이고 메인 변경이 없다. [#1067](https://github.com/ansqhd5774-Choi/zgmini/pull/1067)의 3개 파일은 #1068에 포함되므로 별도 병합 금지.
- **LAST PASS (재사용):** 해당 정확 HEAD의 [Node CI #43517251887](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43517251887) `completed/success`, Build/Type PASS, Regression **4,184/4,193 PASS, 0 FAIL, 6 SKIP, 3 TODO**; PC publication 11/11, Cloudflare readonly 69/69. source-only 중앙 리뷰 GO. 성공된 테스트·소스 검증 재실행 **0건**.
- **FIRST FAIL/남은 한정 실패:** [모의 Browser Run #43517251882](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43517251882)는 `tests/fear-greed-education-browser-r4.mjs:54`의 한국 교육 hidden selector `.zg-fg-korea .zg-fg-intro` 타임아웃으로 **FAIL**. [이전 #1067 브라우저 #43512979910](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43512979910)에도 같은 실패가 있어 중앙은 결합 UI 5파일의 회귀로 확정하지 않는다. FAIL을 PASS로 지우거나 동일 브라우저 실행 반복하지 않음. 실제 Production 4 URL × PC1440/모바일390 **8/8 UNVERIFIED**, 동시 공개 API JSON 5개·Cloudflare Deployment SHA는 미확인. 승인 무료 브라우저 Host permission/SOCKS/DNS/credit 차단도 이전 실패로 보존하고 재요청 0.
- **이번 실제 후속 실행:** 허용된 GitHub PR 댓글 경로로 정규 source 통합 Owner에게 [#1068 exact SHA GO/HOLD 결정 요청 #6866461139](https://github.com/ansqhd5774-Choi/zgmini/pull/1068#issuecomment-6866461139)을 **한 번만 등록**, 본문 완전 일치 원격 재조회 PASS. 명시된 요청은 중앙 SOURCE_GO와 독립된 `MAIN_MERGE_GO/HOLD` 결정이며, 댓글은 승인 또는 타 일반 대화 자동 수신의 증거가 아니다.
- **운영 변경:** 신규 기능 코드 변경·추가 테스트·CI 재실행·source merge·PR Draft 해제·Cloudflare/DB/D1/PC/Runner 실행 **0건**. 본 문서 인계 판정만 변경.
- **다음 필수 실행 정확히 하나:** **승인된 source 통합 Owner가 #1068 5개 파일/정확 HEAD에 대해 정규 main 병합 GO 또는 HOLD/NO-GO를 기록**. 권한 있는 GO 및 정상 통합·배포가 실제 확정될 때만 Production API/8뷰 검증으로 이동. 소스 GO·노드 CI 성공을 병합/배포 실증으로 승격하지 않는다.


## 5. 65차 승인·병합 단계 원격 후속 확인

**확인일:** 2026-11-14 KST · [65차 중앙 지시](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6866393700)와 [중앙 정확 HEAD source review](https://github.com/ansqhd5774-Choi/zgmini/pull/1068#issuecomment-6866344306)를 실제 읽고, 이전 성공 source/CI 테스트는 재실행하지 않았다.

| 판정 경계 | 실제 이번 조회 결과 |
| --- | --- |
| **SOURCE_INTEGRATION_REVIEW_GO** | 중앙 별도 리뷰 **완료**; 결합 HEAD `12f0bf05c306788e76a3974dfefcc499499e7fe1`, 정확 **5파일**. #1067의 null-score 수정도 포함되어 중복 병합 금지 |
| **NODE_CI_REUSED** | [Run #43517251887](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43517251887) `completed/success`, 4193 tests / 4184 pass / 0 fail / 6 skip / 3 todo; 기존 증거 재사용, **신규 테스트/Run 0** |
| **MAIN_MERGE_HOLD** | PR #1068 `Draft/Open`, `mergeable=true`, `merged=false`. base `643b7c7c4372ffad552443fc312c6cb1b944e2fc` 유지. GitHub formal approval review 0, requested reviewer 0; 중앙 source review GO와 **정규 소스 통합 Owner의 명시적인 main merge GO/HOLD 결정은 별개**. 이번 지시 기준 해당 최종 병합 결정 미확인 |
| **#1067 중복 보호** | [중앙 #1067 조정 댓글](https://github.com/ansqhd5774-Choi/zgmini/pull/1067#issuecomment-6866345061) 원문 확인. #1067 단독 merge·종료/리베이스/강제이동 0 |
| **MOCK_BROWSER_FAIL_REUSED** | [Run #43517251882](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43517251882) 기존 교육 UI hidden selector timeout; **통합 Node CI 성공이나 실제 Production PASS로 환산하지 않음** |
| **PRODUCTION_UNVERIFIED** | Production Deployment SHA·동시 API 원문·4뷰 × 1440/390 **0/8**. 이전 승인 무료 브라우저 접근 오류 재요청 0 |

**LAST PASS (65차의 새 범위):** 실제 Github 중앙 SOURCE_GO 기록, 최신 PR base/HEAD·Draft·mergeable·formal review/중복 PR 상태를 분리 확인. 원담당 완료 64차 CI는 재사용.

**FIRST FAIL (현재 필수 단계):** `MAIN_MERGE_HOLD` — 지정 정규 통합 Owner의 **병합 의사결정 기록 부재**; 코드 회귀 실패나 CI 재실행 사유가 아님. Production 접근 차단은 별도 `AUTOMATION_BLOCKED`.

**신규 코드/회귀/CI/원격 실행/배포:** **0**. 전용 브랜치의 기존 증거 문서 한 곳만 65차 판정 현황 갱신. **기능 전체 진행률 25% → 25%**.

**다음 필수 실행 하나:** 승인된 통합 Owner가 **#1068 하나**의 정확 HEAD `12f0bf05c306788e76a3974dfefcc499499e7fe1`, 5파일 및 기존 Node SUCCESS에 대한 **명시적인 정규 main merge GO/HOLD 결정을 기록**한다. GO일 때만 정규 병합과 Cloudflare Git Integration Deployment를 *별도 승인된 실행 경로*에서 진행하고 Production API/UI 증거를 판정한다. 이 원담당 대화는 해당 Owner 결정/배포를 대리 실행하지 않는다.
