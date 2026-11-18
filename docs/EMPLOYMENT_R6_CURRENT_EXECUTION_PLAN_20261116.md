# ZGMINI W04 고용지표 R6 — 최신 실행 계획 (2026-11-16)

> **2026-11-18 W04 PIT-04-08 R3 원자료 계보 Host17 등록 준비 완료(운영 미실행):** <!-- W04-R3-HOST17-MANIFEST-MAIN-VERIFIED-20261118 --> 기존 R2 `abd8f755...`→R3 `35163189...`는 진단기 1파일·회귀시험 1파일만 다르며, Host17 중 16개 원본 SHA 불변. R3 진단기 SHA256 `d91b2b5baf044fe5fd5c24dd0d8abb83cc093878f04ac4d0e0a0e5b596439c9a` 및 source manifest SHA256 `716e4e3b87929ee12e5ddd5813275b8f5156e0d3a343e4c2f0c9b2cfccee65a9` 검산. [제어 PR #2172](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2172) [C996 #44286152184](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44286152184) SUCCESS / main `5064bdb72cea3a5f717df4f136f9599bec929965` 병합·원격 17파일 readback. **이 manifest는 source inventory만이며 B 설치 승인 아님.** W04 다음은 Host `pc-source-bundle-register` 신규 정확 B scope/Host CAS·preimage 검증→승인 후 단일 Host B→실PC RAW 집계 A. Controller #2094 STAGED 복구는 별도 Controller B 경계, main8 W05 BEA 운영 효과 GO는 8키 Controller B 경계. 전체 **35/72(48.6%) 유지**, 실제 새 PC R3/B/8키 A/History INSERT/게시 0. [원장 §113](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

> **2026-11-18 W04 PIT-04-08 키별 보고 처리 최적화:** <!-- W04-PIT0408-40K-CORE-KEY-SORT-MAIN-OPT-20261118 --> 40,777개 Core 키를 전수 정렬한 뒤 priority-only 보고 키를 다시 정렬하는 중복 단계 제거. [PR #1363](https://github.com/ansqhd5774-Choi/zgmini/pull/1363), [Node CI #44278857287](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44278857287) SUCCESS, [main `b0eab570`](https://github.com/ansqhd5774-Choi/zgmini/commit/b0eab57081e7333e86628e19669a0ac004e48165) 병합·source readback. 40,777키 합성 fixture의 reason/date/region 결정순서, 충돌 1·누락 40,777·8키/다음 8키 페이지, 12KB·PIT 미인증 보호 PASS. [진행 원장 §111](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md). 이 성능 개선은 승인 산식·B/PIT 검증 기준 완화가 아니고 **실PC Controller/DB 설치나 실제 8키 A 완료 증거는 아님**. 35/72(48.6%) 유지.

> **2026-11-18 수집→검증→계산→인증→보고→게시 과도 기준 감사:** <!-- W04-SIX-LAYER-OPTIMIZATION-SOURCE-CI-20261118 --> 상세 수행 결과 [진행 원장 §110](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md). Core HISTORY 누락 2,880·후보 충돌 14·메타 미입증 255를 해소하기 위해 PIT/TRUE_PIT·원본 SHA·기존 B CAS·29/29 종합점수 기준을 임의 완화하지 않음. 수집기 정상 계열은 PARTIAL로 보존하고, 별도 1Y 개별값·차트·점수는 29개 중 결측값을 표시할 수 있음. **실제 계산 비효율 한 건 수정:** 주별 51지역 인덱스 중복 재구축 제거, [PR #1356](https://github.com/ansqhd5774-Choi/zgmini/pull/1356) [Node CI #44276752045](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44276752045) PASS / [main `3649cee3`](https://github.com/ansqhd5774-Choi/zgmini/commit/3649cee3444912b02919f8d5a6919309f9a202cd) 병합, 51지역×600주→545주·결측/실제0/주차누락·원본 hash 순서 fixture 4/4 PASS. 인증 probe는 헤더 존재 여부만 관찰, 실제 B/source 무결성 승인과 별개. 8건 페이지·12KB 상한으로 2,880키 전량 열람 요구 시 과도한 A 반복 우려가 있으나 우선 중요 키·집계 증거 재사용. 공개 8일 만료는 운영 정책이라 승인 없이 변경하지 않음. **W04 35/72 유지**, #2094 STAGED 복구/정규 8파일 W05 효과 승인 및 실제 PC 8키 조회는 미완료.

> **추가 좁힘 — W04 PIT-04-08의 우선 운영 후보 main8 (2026-11-18 KST):** <!-- W04-PIT0408-MAIN8-NARROWEST-MAIN-ANCESTOR-20261118 --> main 병합 이력의 정규 `PR #2134` merge SHA **`0e0a3c50ea9c072bc3074d03ca3eb1fd6bd0023c`**는 실제 설치 Controller `f7f1559...`의 후손이자 현재 원격 `main`의 조상입니다. `installed...target` 변경은 **Controller/config 정확 8파일**, W04 PIT-04-08·W01 source가 기존 main9과 **8/8 Git blob 동일**합니다. 이후 추가된 `controller/pc-source-origin-readonly.mjs`(ER1)는 설치 원본 바이트 그대로여서 **ER1 효과 승인을 이번 W04 단일 설치의 선행조건으로 요구하지 않을 수 있습니다**. 단 W05 BEA archive A 등록/dispatch는 8파일에도 포함되어 **W05 정확 운영 효과 GO와 #2094 STAGED 복구·independent maintainer V2 Windows 적용 영수증 없이는 B 설치 NO-GO**입니다. [8파일 비실행 검토](EMPLOYMENT_R6_PIT0408_CONTROLLER_MAIN8_NONEXECUTABLE_REVIEW_20261118.json), `allowFiles` fingerprint SHA256 `0a2a603fbe2bd17cc30fa25b489bdba2a8c12b4d4f419cad24600ca185f57e1b` Node/Python 독립 동일. 종전 main9 검토는 추가 ER1까지 포함하려는 경우의 **더 넓은 비승인 대안**으로 보존. 7파일 독립 commit은 `TARGET_NOT_ON_MAIN`으로 설치 불가. 35/72 유지, 실PC offset A·History INSERT 0.

> **PIT-04-08 정규 Controller B 사전 계약 검증 (2026-11-18 KST):** <!-- W04-PIT0408-MAIN-ANCESTRY-PREFLIGHT-20261118 --> 이전의 [7파일 소스 CI](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2156) 4/4 PASS는 계속 유효하나, 실제 유지보수기 `tools/update.mjs`의 `TARGET_NOT_ON_MAIN` 검증(`targetSha`가 원격 main 조상이 필수) 때문에 7파일 후보 `6eb398858f72bf18f16bc57df9773e13efa7d0e8`은 **정규 B 설치 목표로 사용 불가**. 테스트 전용 PR #2156은 CLOSE/UNMERGED (CI 증거 보존). 운영 설치본 후속이자 현재 main의 조상인 **9파일 목표 `85b3902dec26e8d9cd7fd3e48befea306eb792fe`**는 `installed...target` controller/config 9개·`target...current main` 변경 0·Git blob 9/9 검증 및 `allowFiles` 결정적 SHA256 `8bbcc13e9b80bee393e530b31e51c4ee94d07f6c14a0f82f6da95e4b71d01f34` 사전 계산 완료. [정확한 9파일 비실행 검토](EMPLOYMENT_R6_PIT0408_CONTROLLER_MAIN9_NONEXECUTABLE_REVIEW_20261118.json). 이 목표에는 W05 BEA·ER1 source-origin 효과가 포함되므로 **W01/W04/W05/ER1 운영 승인과 #2094 STAGED 안전복구 전 B manifest 승인·Issue·PC 설치 전부 NO-GO**. [구 7파일 검토](EMPLOYMENT_R6_PIT0408_CONTROLLER7_SOURCE_CANDIDATE_20261118.json)는 `TARGET_NOT_ON_MAIN` 상태를 명시하며 보존. 전체 35/72(48.6%), PIT-04-08 IN_PROGRESS, 키별 A 미실행·History INSERT 승인 0.

> **2026-11-18 최신 단계별 실행 현황(이전 날짜의 과거 기록에 우선):** 72개 세부 ID를 현재 표에서 직접 집계하면 **PIT-01 7/7, PIT-02 7/7, PIT-03 8/8, PIT-04 5/8, PIT-05 8/8, PIT-06~10 0/34 = 총 35/72 DONE(48.6%) / 37개 미완료**. PIT-04-05 raw 해시 귀속 및 04-07 분모 실제 값 확인은 IN_PROGRESS, 현재 핵심 PIT-04-08은 R2 Host B #2141·집계 A #2144 실PC PASS/개별 8키 A NOT_RUN. PIT-05-08은 **복구 실행 NO-GO 결정 DONE**이지 History INSERT·계산·게시 승인이나 실행 성공이 아님. `CURRENT` 40,777 / History 미존재 2,880 / 후보 내부 값·해시 일치 2,625 / 미입증 255 / 충돌 14. 자동 승격·TRUE_PIT 소급 금지. 최신 실행 원장 [§105](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) 이후 최소 적용범위 소스 검토는 [W04 7파일 비승인 후보](EMPLOYMENT_R6_PIT0408_CONTROLLER7_SOURCE_CANDIDATE_20261118.json)와 제어 브랜치 [`6eb398858f72`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/commit/6eb398858f72bf18f16bc57df9773e13efa7d0e8)를 참조. 기존 #2078 6파일의 **4개 파일은 변경 없이 재사용 가능한 동일 바이트**, W04 2개 SHA 교체+신규 `common.mjs` 1개를 포함하는 **정확 7파일** source-only 후보이며 #2094 보호 복구·V2 Windows 적용·정규 B 승인/설치까지 미완료. 이 후보를 승인 manifest나 실운영 Controller SHA로 사용 금지.
> 상태: ACTIVE / 운영 연결 완료, `STATE_CLAIMS_BREADTH` PIT 이력 복구 미완료  
> 저장소: `ansqhd5774-Choi/zgmini` · 담당 브랜치: `codex/employment-1y-reader-r1`  
> 개발 기준: **항상 최신 `main`**; 이 문서는 전담 브랜치의 추적 문서이며 현재 기능 코드/운영 source를 의미하지 않는다.  
> 기존 상세 원안: [EMPLOYMENT_R6_DELIVERY_PLAN.md](EMPLOYMENT_R6_DELIVERY_PLAN.md). 해당 문서의 2026-11-08 진행률·차단 설명은 **당시 증거**로 보존하고 최신 상태는 이 문서와 [진행 원장](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)을 우선한다.

> **W04 최신 실PC 완료점 — <!-- W04-PIT0405-A2027-B2023-CONFIRMED-20261117 -->** 기존 코드의 BLS 세부 공급자 ↔ raw `BLS` 대응 결함을 원담당 앱 [PR #1255](https://github.com/ansqhd5774-Choi/zgmini/pull/1255)에서 정확 contract 매핑으로 수정, 격리 [Node CI #44079829319](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44079829319) PASS. 정규 읽기 전용 Host bundle [PR #2014](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2014), 컨트롤러 version drift 차단 B [#2017](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2017) 및 승인 PR ref 결함 차단 B [#2021](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2021)은 원담당 수정·기존 요청 재실행 없음. 정확 B 승인 [PR #2022](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2022) → [Host B #2023](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2023) `SUCCEEDED/BUNDLE_REGISTERED` → [A #2027](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2027) 실측 `PASS` 완료. Current 40,777 중 verified `29,031`, missing `10,889`, unverified `857`; History 38,804 중 verified `29,016`, missing `8,873`, unverified `915`. 이전 A 대비 검증 완료 Current +1,886 / History +1,890. 여전히 인증 스냅샷 59/86, 후보 충돌 14·메타 미입증 255, `promotionApproved=false`, `HOLD_INCOMPLETE_SOURCE_LINEAGE`. **PIT-04-05 IN_PROGRESS·27/72 DONE(37.5%) 유지**. 다음 W04 직접 수행: 미연결 raw의 공급자/수집시기/인증원장 원인 구분 및 기존 승인 운영 source 적용 조건 확인, 임의 Controller/Writer/DB/D1/Task 변경 금지. 원장 §73 상세.

> **최신 W04 소스 수정·실PC 상태:** <!-- W04-PIT0405-PIT0407-MAIN-SOURCE-FIXES-20261117 --> 고용지표 원담당 직접 수정 [PIT-04-07 PR #1251](https://github.com/ansqhd5774-Choi/zgmini/pull/1251) 빈 ETA539 `c3`의 거짓 0 처리 방지(숫자 0 유지), [Node CI #44075341784](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44075341784) PASS/main `3c02848e20ad773735c60043a4dd846542d16a33`; [PIT-04-05 PR #1252](https://github.com/ansqhd5774-Choi/zgmini/pull/1252) R6 BED provenance를 실제 저장된 HTTP 응답 바이트 SHA256에 연결, per-record hash/R4 파서 불변, [Node CI #44076376957](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44076376957) PASS/main `c3f60a3ce2eb1015f91545cbe94745d23c8aef18`. 기존 Controller B [#1992](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1992) 설치 SUCCEEDED와 A [#1999](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1999) PASS는 보존하되, 앱 source 새 두 수정은 PC 운영 수집기에 **미설치·미검증**. 실제 스냅샷 86 중 인증 59, Current 13,632·History 11,627 missing, 51 unverified 및 후보 충돌 14/메타 미입증 255는 `HOLD`. **27/72(37.5%)** 유지, 원장 §71 참조. 다음 담당 업무는 기존 승인 PC source 적용·원자료 결손 이유 분류이며 새 Controller/B/총괄 의뢰를 임의 추가하지 않는다.

> **W04 직접 추가 검증:** <!-- W04-PIT0405-CONTRACT-11-FIELDS-PREVIEW-20261117 --> Raw snapshot Reader/Runner 정확 앱 source `39484f8b8194ca682c55bd500180459984d0cff9`와 Controller 변경 제안 source `451f53ae3831d369dfbcd4474b2c641736634a34`에서 비민감 계보 집계 11개 필드·상태 enum 3종 모두 일치(3/3 파일 포함). 기존 [Draft PR #1986](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1986)에 정규 `ZGMINI_PC_UPDATE_V1` 형식의 **승인 불가능한 제안 객체** 작성(`approval.grade=B_PENDING_EXACT_GO_NOT_VALID`), [CI Run 44062317815](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44062317815) PASS. 총괄 [SOURCE_SCOPE_GO/OPERATIONAL_B_HOLD #6944835314](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6944835314) 및 이후 공통 Runtime 불완전 복구 상태 유지. **추가 총괄 인계 없음**; 기존 복구·승인 2항목 외 W04 자체 명세/시험/기능 수행을 이관하지 않는다. **27/72(37.5%) 그대로**, 진행 원장 §67.

> **W04 담당 분리/인계 정정:** <!-- W04-PIT0405-OWNER-RECLASS-PR1986-20261117 --> W04가 설치 target/허용파일 fingerprint·preflight·정식 B manifest 작성·승인된 B/A 실행·원격 결과 수치 해석까지 직접 담당. W04 본인 [준비 초안 PR #1986](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1986)은 `DRAFT_ONLY_NOT_APPROVED_NOT_FOR_PC_MAINTENANCE_INTAKE`이고 설치 승인 아님. 프로세스 총괄 인계는 **기존 W03 #1979 공용 Controller 복구·보호/lease 정본 확인**, **신규 W04 after SHA256의 운영 B 효과 GO/NO-GO** 두 항목만 해당. [범위 정정 #6944873762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6944873762), 진행 원장 §66. 공통 복구·승인 조건 충족 후 W04가 정확 1파일 B→A 실측 진행; 이전 source PR·CI·Host B·A PASS 증거 재사용. **27/72 DONE(37.5%) 유지**, 자동 후보 승격 금지.

> **신규 W04 B 적용 진행 상황:** <!-- W04-PIT0405-B1992-REQUEST-PENDING-20261117 --> 공통 #1979 복구·유지보수기 재발 방지 운영 완료, 총괄 [정확 W04 1파일 `OPERATIONAL_B_GO` #6946188691](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6946188691) 확인. W04가 직접 승인 manifest [PR #1991](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1991) 작성·C996 PASS·main 병합, 승인 원본 SHA256 `84fa50137a1aa4a1ed8c352ffc7c2225e4e6c7881188dca475ad47b8f87ca9c6` 검증, [실PC B #1992](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1992) 고유 1회 접수. **현재 완료 증거 미회수**로 B 성공/새 원자료 계보 수치를 주장하지 않음. NEXT = #1992 원격 JSON/TXT 검증, 성공 시 W04 담당 기존 A `employment-r6-candidate-stage-readonly` 1회 실행해 11개 집계와 3상태 회수. 기존 27/72 DONE(37.5%) 유지, §68 진행 기록 참조.

> **새 실제 Runtime 완료점:** W04 본인 정규 B 승인 PR #1991·실PC #1992 설치 `SUCCEEDED`와 A #1999 `PASS`·결과 JSON/TXT 회수. 코드/보고 경로 차단은 해소됐으나 raw snapshot 인증 59/86, Current missing 13,632, History missing 11,627 + 미입증 51로 PIT-04-05 데이터 계보는 `HOLD_INCOMPLETE_SOURCE_LINEAGE`. 지금 기준 결손 0/READY로 승격 금지. **전체 27/72(37.5%) 유지**, 진행 원장 §70이 최신; 아래 과거 진단·BLOCKER 기록은 당시 시점 참고용입니다.

> **현재 필수 단계 — PIT-04-05 Controller 원격 계보 계수 검산 미완료:** <!-- W04-PIT0405-CONTROLLER-EXACT-GO-20261117 --> 원본 저장 raw snapshot/body SHA·수집 Run·CURRENT/HISTORY provenance를 내부 조회하는 정확 source [앱 PR #1243](https://github.com/ansqhd5774-Choi/zgmini/pull/1243) CI PASS, Host B [#1974](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1974) `BUNDLE_REGISTERED`, PC A [#1975](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1975) / Run 44056775046 `PASS`·운영 쓰기 0·기존 4버킷 일치. 단 실제 설치 Controller `PIT_FIELDS`가 신규 raw 계수 11개를 허용하지 않아 **원격 해시 귀속 결과 미입증**. Controller 최소 source [PR #1978](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1978) main `451f53ae3831d369dfbcd4474b2c641736634a34`/CI PASS, **PC Controller 적용은 미승인**. 공유 W03 Controller B [#1979](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1979)는 `UNKNOWN/BACKLOG_ORIGINAL_REQUEST_INVALID`, 보고 실제 SHA `5492726bb5b0505b7ff7db73a3c673dabdf724ce`, `workflowEnabled=false`로 복구 미확정. 해당 SHA→W04 source `451f53ae...`의 `controller/`·`config/` diff는 W04 Reader 정확 1파일로 축소(지금 설치 가능 승인 아님). [중앙 정확 B GO/복구 확인 요청 #6944689786](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6944689786) 등록. **전체 27/72 DONE(37.5%), 45개 미완료; PIT-04 5/8** 유지, Candidate 14상충·255메타 미입증 HOLD. 다음 하나: 신규 Controller 정확 B GO·충돌 없는 target 확정 후 원담당 B/A 실측·11계수 검산. 진행 기록 §64을 따른다.

> **직전 완료점 — PIT-04-04:** <!-- W04-PIT0404-20261117-PC-A-PASS-LATEST --> [A Issue #1960](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1960) / Run `44049555391` 실PC source `4b4c5fe35963cccbe1fcfa7d6803b6ec3cdc7a3b` asOf2026-11-17 PASS, 4버킷 40,777=37,897+0+0+2,880, 보호 SHA 일치, 운영쓰기·공급자/D1 호출 0. Host B #1958 완료, CI #1239 PASS. **현재 27/72 DONE(37.5%), 잔여 45**, PIT-04 5/8. 후보 14 상충·255 메타 미입증 자동 승격 HOLD. **다음 필수 PIT-04-05:** raw_snapshot/수집 Run과 관측 Current↔History의 원자료 해시 귀속 검증. 상세 증거는 진행 기록 §63을 따른다. 이전의 25/72·26/72 수치는 각 당시 기록으로 보존한다.

## 0. W04 실행·진행 기록·인계 필수 계약

> **적용 범위: 이 전담 브랜치의 모든 후속 작업자·대화·예약 실행.** 이미 존재하는 제어 저장소 `main`의 `AGENTS.md`·`docs/PC_AUTOMATION_STANDARD.md`('단계 종료와 다음 실행', '완료·보고·문서 유지') 및 앱 `main/AGENTS.md`의 작업 결과 보고 기준을 이 업무의 **정확한 파일 경로와 작업 순서로 구체화**한다. 새로운 공용 Gate·Controller·Runner·예약·검증 업무를 신설하는 것이 아니다.

**고정 파일 두 개(경로 변경·새 대체 원장 생성 금지)**

- **계획/단계 기준:** `docs/EMPLOYMENT_R6_CURRENT_EXECUTION_PLAN_20261116.md` — 72개 세부 ID, 선행조건, 각 단계의 완료 판정과 상태를 관리한다. 단계 구조나 실제 상태 변경 시 해당 행을 수정한다.
- **실행/인계 정본:** `docs/EMPLOYMENT_R6_PROGRESS_LOG_20261116.md` — 각 작업의 **실제 마지막 결과**를 시간순으로 누적한다. 다음 작업자는 이를 기준으로 마지막 유효 완료 지점과 남은 작업을 복원한다. 모든 작업 로그를 별도 .md/Issue 댓글에만 남기고 이 파일을 누락하는 것은 인계 완료가 아니다.

**매 작업의 필수 순서(소스 수정, 연구, A/B 실행, 진단 PASS/FAIL/WAIT, 게시, 점검, 문서 변경 모두 해당)**

1. **재개:** 저장소·전담 브랜치와 그 HEAD, 계획서 72개 세부 ID, **위 진행 기록의 마지막 유효 항목**을 먼저 확인한다. 이전 완료 증거를 재사용하고 마지막 미완료 필수 동작 하나를 정한다. 앱 최신 `main`·운영 승인/설치 source SHA·웹 배포 SHA는 각각 따로 둔다.
2. **실행과 결과 회수:** 실제 승인 범위의 작업을 수행해 PR/commit/CI 또는 PC 고유 Issue/requestId/Run/JSON/TXT, D1/API/UI 등 **해당 작업에 필요한 증거**를 회수한다. 작업 중단·안전 거부도 실제 결과로 구분한다.
3. **같은 작업 턴에서 진행 기록 반영:** 결과 확인 직후 **반드시 지정 진행 기록 .md에 누적**한다. 매 항목에 `작업 ID/대상 및 수행일·기준 SHA → 이번 실행·변경 파일 → 결과와 증거 링크 → LAST PASS/FIRST FAIL(해당 시) → 실제 오류·영향·승인/자원 조건 → 단계 상태/전체 세부 진행률 → 다음 한 작업 ID·입력·실행 경로·통과 조건`을 기록한다. 변경 없으면 `NO_CHANGE`, 안전 대기는 `BLOCKED/STATE_UNKNOWN`, 실제 완료는 `DONE`으로 적고 원인 미확정 값을 성공으로 보정하지 않는다. **원본 API/DB/민감정보 업로드 금지.**
4. **GitHub 반영 확인:** 기록 파일을 지정 브랜치에 commit 후, 원격 `fetch_file`로 **방금 기록한 고유 작업 ID와 결과**가 포함되는지 확인한다. 커밋 SHA와 기준 파일 blob을 확인한다. 기존 로그의 존재 여부만 확인하는 것으로 갈음할 수 없다. 계획상 단계 상태가 변했다면 계획서 상태와 기록의 수치도 대조한다.
5. **그 뒤 종료 보고:** 사용자에게 **실제 실행 결과**와 **진행 기록 반영 결과**를 구분해 보고한다. 기록 작성 또는 재조회가 실패하면 `작업 수행: 실제 결과대로 / 진행 기록: 미반영 또는 확인 불가 / 인계 완료: 아니오`로 보고한다. `VERIFIED`나 기록 포함 `DONE`을 주장하지 않는다. 이때 이미 완료한 PC/공급자 작업을 반복해 기록 누락을 메우지 않는다.

**인계 확인 기준:** 다른 작업자는 이전 대화 없이 지정된 두 파일만으로 `마지막 완료 세부 ID·실제 증거/해시·현재 STOP 사유·실제 다음 세부 ID·해제 조건`을 특정할 수 있어야 한다. 그 중 하나라도 기록에 빠지면 인계는 `INCOMPLETE`이다. 무관한 추가 진단·전체 재검사로 이를 대체하지 않는다.

**PIT-04-03 현재 source-only 개발 상태(2026-11-17):** Core Current↔History의 일치/상충/검증불가/누락 4버킷을 Reader·Runner 전담 브랜치에 구현하고, 승인된 기존 R6 번들 기준의 격리 [앱 Draft PR #1212](https://github.com/ansqhd5774-Choi/zgmini/pull/1212) (4파일) 및 main 기준 [Controller Draft PR #1867](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1867) (2파일)을 생성했다. 순수 소스 비교 모의 5키 PASS, 관련 SQLite/Node 타깃 CI·PC 운영 새 계수 **미검증**. PR/소스는 운영 승인·설치나 History 실제 검산이 아니므로 **25/72(34.7%) 불변**. 다음 필수: 타깃 회귀/CI → 정확 source/manifest와 설치 승인 범위 확인 → 승인된 기존 경로로 읽기 전용 A 실제 4버킷 회수. Candidate 14키 상충 및 승격 HOLD 유지.

**PIT-04-03 최신 2026-11-17:** 앱 [Draft PR #1212](https://github.com/ansqhd5774-Choi/zgmini/pull/1212) source `650d41fa83b7e5ed6fb2f0887aaeff0559fc1b60`(4파일)·제어 [Draft PR #1867](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1867)에서 안전 4버킷 출력 구현. 격리 Windows [CI #44003890594](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44003890594) 실제 Node/SQLite 28/28, Controller 9/9, DOL 47/47 PASS. 첫 CI의 WAL fixture `EBUSY`는 Writer 선종료 `try/finally`로 수정. 16파일 중 기존 승인 원본과 14개 동일·Reader/Runner 2개만 변경 SHA256을 [신규 source manifest 초안](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/fix/w04-pit04-03-readonly-core-history-counts-20261117/drafts/employment-r6/pit04-03-source-manifest-20261117.json)에 기록. 운영 PC B 설치와 Core Current↔History 최신 4버킷 실측은 아직 미수행이므로 **전체 25/72(34.7%) 유지**. 다음 필수는 공유 Controller/Host 승인·CAS·lease 검증→기존 유지보수 B 정규 등록/허용목록 적용→고유 A 1회 실제 계수 JSON/TXT 회수. 전체 증거는 [진행 기록 §38](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

**PIT-04-03 신규 실운영 완료점(2026-11-17):** 신규 Reader/Runner source `650d41fa83b7e5ed6fb2f0887aaeff0559fc1b60` Host 등록은 정규 [B Issue #1874](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1874) `SUCCEEDED/BUNDLE_REGISTERED/HOST_CAS_READBACK` + 원격 JSON/TXT 2/2로 완료, 본 B 요청 재실행 금지. 승인 [PR #1873](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1873) 병합 후 Controller 안전 count projection은 [PR #1875](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1875) 본 main `60cde094d83d302608e4ee2fc63b38b89c0dab87`에 소스 병합되었으나 **운영 Controller 설치는 별개**. 기존 설치 `384ffd09...`→main 대상의 Controller runtime 차이 2파일(W03 R32, W04 PIT), W04 단독 B는 `ALLOWFILE_DIFF_MISMATCH`; 공유 #68에서는 W03 자동 설치 금지 및 단일 owner GO/NO-GO 조정. [현재 조정 #68/6936646957](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6936646957) 제출. **종료 25/72(34.7%)**; 다음 필수는 공유 Owner가 W03 포함 승인된 실제 Controller B 순서 확정·사후 설치 검사→W04 기존 A 1회 실제 Core 4버킷 계수/JSON/TXT 회수, 이후에만 26단계 완료 판정. 운영 SQLite·D1·provider·Task 변경 금지, Candidate 14 상충 HOLD 유지. 상세 [진행 기록 §39](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

**PIT-04-03 공유 Controller B GO/NO-GO 최종 검토 추가(2026-11-17):** 기존 운영 Host 신규 R6 source B [#1874](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1874)는 `SUCCEEDED`로 **기완료**. 운영 Controller 마지막 설치 `384ffd09...`에서 W04 main 소스 병합 목표 `60cde094...`까지 Controller/config 실행 변경은 **W03 R32 + W04 R6 두 모듈**. 최신 `tools/maintenance-contract.mjs` 실제 `validateControllerOnlyInstallDelta` source 시뮬레이션에서 W04만 → `ALLOWFILE_DIFF_MISMATCH`, 정확 W03+W04 → `PASS`; source 계약만 검증했으며 W03 승인 GO는 아니다. 검토용 [Draft PR #1878](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1878) 1파일 `PROPOSED_NOT_APPROVED_NOT_EXECUTABLE`, [공유 단일 owner 결정 요청 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6936864877) 기록. **진척 25/72(34.7%) 유지**. 다음 필수는 *공유 Controller Owner의 W03 포함 범위 명시 GO/NO-GO 한 번* → 기존 B 정규 승인·설치·원격 결과/사후검사 → W04 A 1회 실제 최신 History 4계수 확인. GO 전 B Issue 자동 생성/이전 #1841 재실행 금지. 상세 [진행 기록 §40](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

**PIT-04-03 4버킷 정합성 보완·실운영 설치 대기(2026-11-17):** 별도 [PR #1882](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1882)에서 Controller의 4버킷 합계=`coreCurrentKeys` 및 history missing 상호 일치 검증 결함을 수정(2파일), 격리 Windows [#44009480320](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44009480320) Controller 11/11 PASS·C996 SUCCESS 후 main `fbe943a069c9b2366f8e295d2c63b7895c639ef2` 병합. 실제 Host R6 소스 B [#1874](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1874)는 기존 DONE 유지. 최신 누적 설치 검토 [Draft PR #1878](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1878)를 새 target·W04 모듈 SHA256 `e156d22989210b2599d9393a15f8206fecd325d14f3d72af04d658bd60ee9409`로 재핀. 현재 설치 `384ffd09...`→새 목표 Git 88파일 diff 중 Controller/runtime 정확 2파일(W03+W04), 실제 `validateControllerOnlyInstallDelta` source로 W04 단독 `ALLOWFILE_DIFF_MISMATCH`/2파일 PASS 검증. **공유 [#68/6937150103](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6937150103)의 W03 포함 단일 Owner GO/NO-GO 결정이 다음 필수 행동**, 승인/실제 Controller B install+core-status 사후 결과까지 나오면 W04 기존 A를 고유 1회 실행해 실PC 4버킷과 합계·asOf·원격 JSON/TXT 확인. Draft/CI/main 병합을 운영 설치·PIT-04-03 DONE으로 취급하지 않음. **현재 25/72 DONE(34.7%), PIT-04-03 IN_PROGRESS**. 상세 [진행 기록 §41](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

**최신 기준선(2026-11-17, PC #1949 검산):** **26/72 DONE(36.1%)**, 46개 미완료. PIT-04-03 Core Current↔History 4버킷 실제 읽기 전용 PASS(40,777=37,897 matching + 0 conflicting + 0 unverified + 2,880 missing), History missing 별도 집계 2,880과 일치, asOfDate=2026-11-17. 신규 [Issue #1949](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1949#issuecomment-6942471665) / [Run 44044471870](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44044471870), 원격 JSON/TXT 2/2 별도 검증. 이전 Core Controller B #1932 / Host B #1874 승인 완료 증거 재사용; DB/provider/D1 운영 쓰기 0. **다음 실제 미완료는 PIT-04-04**(availableAt/retrievedAt/recorded_at/first_seen_at as-of 적격성 실제 증거). Candidate Current 14 상충·Core History 2,880 결손(후보 정합 2,625/미입증 255), promotionApproved=false HOLD. 과거 TRUE_PIT 자동 승격·DB/D1 쓰기·신규 Controller GO 반복 금지.

## 1. 완료 목표와 운영 계약

- 공식 BLS/DOL 고용 29개 지표(기존 구분 BLS 24 / DOL·ETA 5): 공급자 API → 승인된 PC Core 수집 → 원자료·관측일·출처·PIT 이력 SQLite 보존 → **저장 자료로만** 승인 산식 계산 → 로컬 결과 → 승인된 D1 공개 → `/api/employment-r6/observations` → `/economic-indicators/employment/` 화면.
- 사용자 요청의 범위는 기능의 실제 종료다. 코딩/CI/문서만 완료로 보고하지 않으며, Core 최신 source SHA·DB/원장·D1 공개 시각·Production API/UI를 구분한다.
- 결측·시차·PIT 부족을 정직하게 `STALE/PARTIAL_HISTORY/UNAVAILABLE`로 남긴다. 자료가 입증되지 않으면 29/29 점수 READY를 강제하지 않는다. 차트 1년 READY와 산식에 필요한 10년 PIT 점수 READY는 서로 다른 기준이다.
- 승인 없는 산식·가중치·PIT 정의·DB/D1 스키마·TTL·수집 주기·예약·배포·DNS 변경 금지. 이미 저장된 공식 51지역×600주 원자료의 대량 재수집과 신규 공급자 전환을 기본 후속 작업에 넣지 않는다.

## 2. 이전 완료 지점 — 2026-11-16 KST (당시 증거 보존)

| 완료 분야 | 실제 완료 증거 | 판정 |
|---|---|---|
| 자동/수동 ONE_YEAR 정책 분리 | 앱 [PR #1176](https://github.com/ansqhd5774-Choi/zgmini/pull/1176) 및 제어 [PR #1721](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1721) merged; 운영 1파일 Writer B [#1729](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1729) verified | DONE |
| DOL National 일시 장애 대응 | 앱 [PR #1178](https://github.com/ansqhd5774-Choi/zgmini/pull/1178), PC 2파일 설치 [#1751](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1751) `WRITER_B_INSTALLED_VERIFIED` | DONE |
| 수동 원자료 확보 | [#1755](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1755): 실제 Windows `SUCCESS`, DOL 2회, National 4/4·376행, 지역 5,712행, SQLite readback | DONE |
| 승인 Core → 저장 자료 계산 → D1 → API | [Writer 원장 #1758](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1758), [공개 API](https://zgmini.kr/api/employment-r6/observations): `sourceStoredAt=2026-11-16T13:55:15.655Z`, 원자료 29/29 | DONE — 공개 연결 범위 |
| 개별 점수·차트 | API: 점수 28/29, 최근 유효 점수 22/29, 1Y READY 22/29, PARTIAL 5/29, UNAVAILABLE 2/29 | PARTIAL — 합법적 결측과 별개로 1개 이력 문제 |
| 마지막 미완료 지표 | `STATE_CLAIMS_BREADTH`: 2025-07-19 원값 54.90196078%, score `PARTIAL_HISTORY`, chart `UNAVAILABLE`, 첫 부족 참조일 2015-07-25 | OPEN |
| Source-only 이력 감사 | [PR #1186](https://github.com/ansqhd5774-Choi/zgmini/pull/1186) `main` merged `f3ddab1f8506ff4ee49189a88c8e2391a040c626`, Node CI PASS | DONE — 운영 DB 수정 아님 |

**상태 해석:** 서비스 전달 경로 5/5 완료 ≠ 개별 계산 상태 29/29 완료. 과거 실PC 진단 [#782](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/782)에서 2026-11-07 Current 7,695키 중 HISTORY 없는 2,880키 및 후보와 겹치는 개정 충돌 2건 확인. 이 숫자는 **오늘의 결손 건수 아님**.

## 3. 다음 필수 작업 — 실행 순서 / 실제 통과 기준

| 번호 | 작업 항목 | 실행 근거·수행 세부 | 통과 조건 | 현재 |
|---|---|---|---|---|
| W04-PIT-01 | 마지막 성공 증거 보존 | #1755 National+state 수집, #1758 공개 갱신, #1186 소스·CI 재사용. 이미 완료된 수집/설치/전체 CI를 새 실행으로 반복하지 않음 | 이전 성공 ID, SHA 및 증거 유효성 보존 | DONE |
| W04-PIT-02 | PIT 누락 판정 함수 구현 | `employment-r6-claims-pit-recovery.mjs`: 지역 51개 고정, 현재/이력·최신 개정·해시/출처/가용 시각 구분 | 읽기 전용·결측/충돌·메타 미확인 분리, 600주 fixture PASS | DONE — PR #1186 |
| W04-PIT-03 | 최신 운영 PIT 분포 회수 | 고정 번들 `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`; A/light #1786 및 A/heavy #1787 | sqliteOpened=true; Current 40,726, History revisions 38,753, missing 2,880, matching candidate 2,625, candidate overlaps conflicts 14; JSON/TXT 2/2, 공급자/DB/D1 쓰기 0 | DONE — Run 43898451571 |
| W04-PIT-04 | Core 원본 계보 분류 | [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) Current 600주×51 실제 증거 확보. 이후 region/week History 최신 revision, raw snapshot, sourceHash, retrieved_at, available_at 분리 | PIT-04-01/02/06 DONE, PIT-04-03/04/05/07/08 미완료; 실측 #1862 Core 37,897개 History 고유키·과거 개정 키 877, Candidate 상충 14 유지, TRUE_PIT 자동 승격 금지 | IN_PROGRESS — PIT-04-05/07/08 (R2 실PC 집계 PASS·8키 조회 미완료) |
| W04-PIT-05 | 복구 가능한 최소 범위 및 승인 확인 | 기존 공식 B 경로에 정확한 DB 대상·테이블·원본 보호·동일 자원 lease·manifest SHA·롤백 근거를 명시. `CURRENT`를 `TRUE_PIT`로 소급 승격하지 않음 | 승인된 정확 파일/키/효과와 실패 시 STOP 정의; 미승인 Core SQL 쓰기 0 | PIT-05 8/8 판정 DONE — 복구 실제 실행 NO-GO / INSERT 승인 0 |
| W04-PIT-06 | 격리 회귀·시뮬레이션 | 신규 유효 관측/중복/개정충돌/미래시각/History 누락/저장 원장/계산/차트 조건 | 수정 영향 테스트 PASS; 과거 2건 상충 행은 자동 승격 금지 | WAITING PIT-05 |
| W04-PIT-07 | PC 최소 이력 복구 | 승인된 기존 B 유지보수 경로 한 번, 기존 DB/잠금/작업 보호. PIT 출처 검증 없는 행은 제외 | 실제 `CURRENT`/`HISTORY` 비교 건수·원장 전진/보호 상태 재조회 | WAITING APPROVAL |
| W04-PIT-08 | 저장 자료 재계산 | 공식 산식 및 PIT 시점 변경 없이 Core SQLite 자료만 사용. 공급자 호출 0건 | `STATE_CLAIMS_BREADTH` 최신 관측/score/1Y history와 부족 이유를 정확히 확인 | WAITING PIT-07 |
| W04-PIT-09 | 기존 D1 Writer 게시 | 승인 Core source와 기존 게시기를 재사용, 본문/hash/stored_at/sourceStoredAt 분리 | D1 readback 일치; 실패·timeout 시 이중 게시 금지 | WAITING PIT-08 |
| W04-PIT-10 | Production API/UI 결론 | `GET /api/employment-r6/observations`, 29행·날짜·원값·점수·차트 구분 | 정상 데이터는 갱신, 불충분한 이력은 `PARTIAL_HISTORY`로 정직하게 표시; PC/모바일 UI 확인 | WAITING PIT-09 |

**안전 판단:** 600주 Current raw가 있다는 것만으로 10년간 당시 알려진 `TRUE_PIT` 이력이 있다는 뜻은 아니다. 공식 과거 자료의 수집시각을 과거로 소급하거나 결손 점수를 임의 산출하는 경로는 채택하지 않는다. 검증 가능한 원자료가 부족하면 해당 지표를 정직한 `PARTIAL_HISTORY`로 남기는 것이 승인 계약에 맞는 완료 판정일 수 있으며, 이 경우 계획의 복구 단계는 더 이상 강행하지 않는다.

## 4. 이전 실행·실제 미해결·당시 다음 작업 (2026-11-17 KST, 역사 기록)

- **신규 실PC 성공:** [#1786](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1786) / Run 43898278381 `R6_WAL_MEMORY_PREFLIGHT_READY` (free RAM 2275MiB, Core WAL 양쪽 sidecar 존재). 이어서 단회 [#1787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1787) / Run 43898451571 `EMPLOYMENT_R6_READONLY_STAGE_COMPLETED`, 실제 sqliteOpened, 결과 JSON/TXT 2/2 재조회. 이 결과로 PIT-03 8/8 완료. 이전 #1780 R13 inventory 차단은 해당 요청의 당시 결과로 보존하며 공통 조회 오류 원인 수정 완료라고 주장하지 않음.
- **실제 남은 문제:** Core Current 중 History 누락 키 2,880; 후보 matching·메타 일치 2,625; 후보 증빙 불충분 255; 후보 Current 충돌 14. 이 숫자만으로 10년 역사적 TRUE_PIT 가용성, 과거 주별 as-of, 복구 승인 범위를 결론 낼 수 없음. `STATE_CLAIMS_BREADTH` 최종 점수는 여전히 `PARTIAL_HISTORY`.
- **최신 실PC 성공:** 이전 [#1789](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1789) WAL sidecar 부재는 그 시점 한정. 신규 기존 A/light [#1798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1798) / Run 43904004344 **PASS**, Core -wal/-shm BOTH_PRESENT, RAM free 1799MiB (min 1536). 후속 기존 A [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) / Run 43904242672 **PASS/SQLite opened**, 최신 Current 2026-10-24, 600/600주×51지역 완전, 577주 원자료 선행조건 충족. JSON/TXT 2/2 원격 회수, 공급자/DB/D1 운영 쓰기 0. 2026-10-24 이후 수집 최신성/History-as-of는 별도 확인 필요.
- **다음 실행 하나:** PIT-04-04에서 이미 병합된 PR #1225 as-of 시각 guard(source-only PASS)와 실제 PC 저장자료의 availableAt/retrievedAt/recorded_at/first_seen_at를 대조한다. #1949의 PIT-04-03 결과 40,777=37,897+0+0+2,880 실측 및 asOf2026-11-17은 재사용하고 신규 4버킷 A는 반복하지 않는다. 2,625 후보 일치·14 후보 상충·255 PIT 메타 근거 불충분은 계속 HOLD; 실제 과거 접근 가능 시각의 검증 없이 TRUE_PIT로 자동 승격하거나 Core/DB/D1에 쓰지 않는다.

## 5. 진행률 산정

- **수집 → PC 원자료 저장 → 계산 → D1 공개 → API/UI 전달:** `5/5` 완료(해당 전달 경로에 한정).
- **29개별 점수:** `28/29` (96.6%), 최근 유효 `22/29`, 1Y 차트 READY `22/29` — 각각 다른 지표.
- **잔여 PIT 10개 상위 범주 / 72개 세부 작업:** `35/72` DONE(48.6%), `37/72` 미완료. PIT-01 7/7·02 7/7·03 8/8·04 5/8(01·02·03·04·06)·05 8/8 DONE, 06~10 0/34. 04-05/07/08 IN_PROGRESS. #2144 R2 실PC A는 집계 PASS지만 8키 실제 조회/TRUE_PIT는 미입증; PIT-05의 완료는 복구 NO-GO 판단까지이며 실제 History INSERT·계산·D1 쓰기는 0. 기존 공개 전달 경로 5/5와 분모를 합산하지 않는다.
- 이번 문서 작성/관리만으로 PIT 단계·운영 사이트 수치를 진척 처리하지 않는다.

## 6. 역할·공유 자원

W04 원담당이 기능 로직·실제 수동 검증·DB 이력·저장 자료 계산·게시를 담당한다. 동일 Core/DB/Controller에 겹치는 쓰기만 기존 중앙 자원 조정 및 보호 B로 직렬화한다. 다른 기능의 동시 독립 읽기/소스 개발은 중단시키지 않는다. 기존 `zgmini-pc-control/main`의 `AGENTS.md`, `docs/PC_AUTOMATION_STANDARD.md`, `docs/GENERAL_CHAT_START.md` 최신 계약이 실행 시 우선한다.


## 7. 72개 세부 실행 항목 — 실제 작업 단위별 확장 (2026-11-16)

> **2026-11-18 최신 완료 계수:** 위 72행 현 상태 직접 집계 **35/72 DONE(48.6%) / 37 미완료**: PIT-01 7, PIT-02 7, PIT-03 8, PIT-04 5(01/02/03/04/06), PIT-05 8, PIT-06~10 0. PIT-04-05/07/08 미완료. PIT-05의 8개는 판정/보호 범위만 완료했으며 실제 복구/INSERT GO는 아니고 0키 승인. 후보 충돌14/출처 미확인255/내부 메타 정합2625는 자동 PIT 인증 아님. 최근 #2144 Core 40,777/History 누락 2,880 집계와 `TRUE_PIT` 검증·개별 키 8건을 구분한다. 과거 #1949 26/72 당시 수치는 이후 이력에 보존.

| 상위 범주 | 세부 작업 수 | 완료 | 미완료 | 현재 상태 |
|---|---:|---:|---:|---|
| PIT-01 기존 운영 완료 증거 확정·재사용 | 7 | 7 | 0 | DONE |
| PIT-02 소스 계보 판정기·격리 회귀 완료 | 7 | 7 | 0 | DONE |
| PIT-03 현재 운영 PC의 실제 PIT 결손 확보 | 8 | 8 | 0 | DONE (PC #1786/#1787 읽기 전용 PASS) |
| PIT-04 지역별·주별 원자료와 PIT 정합성 분류 | 8 | 5 | 3 | IN_PROGRESS — PIT-04-05 raw snapshot/source hash lineage |
| PIT-05 복구 가능성 판정·최소 운영 승인 설계 | 8 | 8 | 0 | DONE — CURRENT_REPAIR_NO_GO, 실제 INSERT 승인 0 |
| PIT-06 선별 복구 코드·fixture 회귀·시뮬레이션 | 8 | 0 | 8 | DEFERRED (선행 근거 필요) |
| PIT-07 승인된 PC의 최소 History 복구·원장 | 8 | 0 | 8 | DEFERRED (선행 근거 필요) |
| PIT-08 저장 자료 기반 계산·로컬 결과 재검증 | 6 | 0 | 6 | DEFERRED (선행 근거 필요) |
| PIT-09 기존 D1 게시기와 읽기 결과 일치 | 6 | 0 | 6 | DEFERRED (선행 근거 필요) |
| PIT-10 Production API/UI 검증·종결 판정 | 6 | 0 | 6 | DEFERRED (선행 근거 필요) |
| **합계** | **72** | **35** | **37** | **48.6% · 세부 작업 기준** |

**완료 판정 원칙:** 모든 행에서 입력/실행과 합격 조건을 확인해야 한다. 시뮬레이션과 실제 PC 설치/SQLite 수정/D1 게시를 하나의 완료 증거로 합치지 않는다. 조건 불충족은 STOP/DEFERRED로 유지하며, 예약 자연 검증·임의 데이터 보간·신규 공급자 호출은 잔여 단계에 추가하지 않는다.

### PIT-01 — 기존 운영 완료 증거 확정·재사용 (7개, 모두 DONE)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-01-01 | 기존 승인된 수동/자동 ONE_YEAR 정책 분리 이력 고정 | 앱 PR #1176 · 제어 PR #1721 | 두 PR 병합·영향 범위 기록 | DONE |
| PIT-01-02 | 수동 ONE_YEAR 수집기 PC 설치 증거 확인 | PC #1729 / Run 43871926762 | 1파일 설치 VERIFIED와 당시 로컬 SHA 구분 | DONE |
| PIT-01-03 | DOL National 최소 재시도 코드·2파일 설치 증거 고정 | 앱 PR #1178 · PC #1751 | 2건 상한 유지·2파일 설치 VERIFIED | DONE |
| PIT-01-04 | 공식 원자료 수동 수집 결과 고정 | PC #1755 / Run 43879444100 | National 4계열/376행·지역 5712행·DOL 2회 | DONE |
| PIT-01-05 | PC SQLite 저장·원장 재조회 완료점 보존 | PC #1755 JSON/TXT·COLLECTOR_RECORDED | 원자료 재수집 요구 없이 저장 결과 범위 확정 | DONE |
| PIT-01-06 | Core 계산/게시 경로의 기존 완료 원장 고정 | PC #1758 · D1 Writer VERIFIED | 원자료 저장 성공과 게시 성공을 별도 증거로 기록 | DONE |
| PIT-01-07 | 공개 API 29개 지표 최신 상태와 마지막 결함 식별 | Production API sourceStoredAt 및 29지표 | 29/29 raw, 28/29 score, STATE_CLAIMS_BREADTH만 PIT 누락 | DONE |

### PIT-02 — 소스 계보 판정기·격리 회귀 완료 (7개, 모두 DONE)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-02-01 | Current/History 비교를 읽기 전용 함수로 분리 | 앱 PR #1186 | 운영 SQLite 쓰기 경로 없이 함수 생성 | DONE |
| PIT-02-02 | 51개 공식 지역·주별 관측 키 정의 | 기존 EMPLOYMENT_R4_CORE_STATES | 50개 주+DC만 인정, 관측 날짜 기준 중복 구분 | DONE |
| PIT-02-03 | 원본 공급자·계열·해시·메타 조건 검증 | STATE_INITIAL_CLAIMS / ETA539:C3 | 확인 불가능한 원본은 HOLD로 분리 | DONE |
| PIT-02-04 | 실제 as-of 시점·retrievedAt·availableAt 경계 분리 | 기존 PIT 자료 계약 | 미래 정보로 과거 상태를 소급 충족하지 않음 | DONE |
| PIT-02-05 | 최신 History 개정 충돌 차단 | 추가 latest-revision regression | 이전 일치 개정만으로 최신 충돌을 덮지 않음 | DONE |
| PIT-02-06 | 600주·51지역·결손·중복 회귀시험 완비 | tests/employment-r6-claims-pit-recovery.test.mjs | 정상/결손/불일치의 계산 입력 차이 재현 | DONE |
| PIT-02-07 | 관련 CI와 source main 병합 확정 | PR #1186 / CI 43886125560 | SUCCESS, merge f3ddab1f…; PC 이력 수정 주장 금지 | DONE |

### PIT-03 — 현재 운영 PC의 실제 PIT 결손 확보 (8개, 모두 DONE · #1786/#1787 실측)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-03-01 | 읽기 전용 분석에 사용할 고정 승인 번들 식별 | 등록 A `employment-r6-candidate-stage-readonly` | 분석 전용 SHA `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`, 운영 승인 SHA 별도·기존 #1765 확인 | DONE |
| PIT-03-02 | 기존 차단 요청의 원인과 소비된 ID 보존 | #1764 / #1765 및 신규 #1780 JSON·TXT | R6_BUNDLE_NOT_APPROVED / RESOURCE_WAIT_MEMORY / RETIRED_IRAN_INVENTORY_UNAVAILABLE 구분, 요청 ID 재사용 금지 | DONE |
| PIT-03-03 | 중량 A 진단의 현 메모리 admission 점검 | 기존 #1780 BLOCKED와 별도 A/light #1786 / Run 43898278381 | free 2,275MiB ≥ 1,536MiB, Core WAL+SHM·후보 ROLLBACK 모두 안전, 보호 해시 불변 | DONE |
| PIT-03-04 | 승인된 A operation을 새 고유 requestId로 단회 접수 | #1787 / Run 43898451571 · immutable bundle afdd8fab... | 새 requestId 단회·A/heavy 정상 실행, 우회 셸·DB 쓰기 0 | DONE |
| PIT-03-05 | 실제 Runner/Host·결과 JSON/TXT 2/2 회수 | #1787 seat 2·attempt 1 / Run 43898451571 | PASS; JSON blob b2f0150f...·TXT blob 38359a9f... 원격 2/2 재조회·실행 SHA 확인 | DONE |
| PIT-03-06 | SQLite 실제 열림 및 일관된 PIT 관측 범위 확인 | #1787 result.sqliteOpened=true, WAL preflight 및 memoryAdmission admitted | PC 실제 SQLite 조회 성공, 보호 before/after SHA 동일; 공급자·운영 DB/D1 쓰기 0 | DONE |
| PIT-03-07 | Current·History·후보 누락/충돌 총계 획득 | #1787 실제 Core+candidate PIT aggregate | Current 40,726, History 38,753, missing 2,880, matching/meta 2,625, unsupported 255, candidate conflicting 14; 11/07 과거 결과와 날짜 구별 | DONE |
| PIT-03-08 | 자료가 부족하면 승인된 기존 A의 최소 메타 조회 적합성 평가 | `controller/employment-r6-candidate-readonly.mjs`·`employment-r6-collection-evidence-readonly.mjs` | stage A는 PIT aggregate, evidence A는 Current/raw snapshot만 제공; 주차별 History-asOf 전체 검증 대체 불가·무근거 B 금지 | DONE |

### PIT-04 — 지역별·주별 원자료와 PIT 정합성 분류 (8개, 5 DONE · 3 미완료)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-04-01 | Current 관측일·지역별 최신 시각 정렬 | [#1798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1798) WAL·RAM PASS → [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) 실 SQLite Current 600×51, 2015-05-02~2026-10-24 | 최신 2026-10-24 주차 `51 rows/51 distinct/unknown=0`+최신 600주 검증으로 51지역 각각의 최대 **관측일** 2026-10-24, 600/600 완전주 논리 도출; per-region retrievedAt/PIT 시각은 후속 단계 | DONE |
| PIT-04-02 | History를 관측일·지역·최신 개정 단위로 정렬 | 기완료 Host B #1829·Controller B #1832, 공유 Controller 기존 정상 버전 복구 [#1841](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1841#issuecomment-6935608375), 실제 단회 History A [#1862](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1862#issuecomment-6935570412) / Run 43999648363, source `2b5255147b16d595196a8f006cf1d95c840a4926`, JSON/TXT 2/2 독립 조회 | asOfDate=2026-11-17, sqliteOpened=true, Core History 38,804 revision rows/37,897 asOf unique keys/과거 개정 877 keys·907 rows, 모호한 latest/동일시각 추가행 각 0; Candidate History 3,700 asOf keys/과거 개정 0, 모호성 0; 입장 메모리 1,692MiB≥1,536MiB·Core WAL sidecars preexisting, provider/운영DB/D1 writes 0, 보호 불변. 후보 상충 14/HOLD 및 Core History 2,880 missing은 다음 단계에서 별도 판정 | DONE — HISTORY_COUNTS_ASOF_VERIFIED / CANDIDATE_PROMOTION_HOLD |
| PIT-04-03 | Current와 최신 History의 값·sourceHash 정확 대조 | [Issue #1949](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1949#issuecomment-6942471665) / [Run 44044471870](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44044471870), 실제 Host R6 source `650d41fa83b7e5ed6fb2f0887aaeff0559fc1b60`, 이전 Controller B #1932/Host B #1874 승인 설치 증거 재사용. 원격 [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44044471870-1-seat-6.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44044471870-1-seat-6.txt) 2/2 회수 | PASS: asOf 2026-11-17, sqliteOpened=true; Core Current keys 40,777 = matching 37,897 + conflicting 0 + unverified 0 + missing 2,880, 별도 History missing 2,880과 동일. Candidate overlap conflicts 14, Core History 누락 2,880(후보 정합 2,625/미입증 255), promotionApproved=false HOLD. 공급자/DB/D1 운영 쓰기 0, 보호 불변. PIT-04-04의 과거 기록시각 검산/TRUE_PIT 적격성은 별도 | DONE — REAL_FOUR_BUCKET_ASOF_VERIFIED / CANDIDATE_HOLD |
| PIT-04-04 | availableAt·retrievedAt·recorded_at·first_seen_at의 as-of PIT 적격성 검산 | 기존 main PR #1225 guard + [통합 source PR #1237](https://github.com/ansqhd5774-Choi/zgmini/pull/1237) head `4b4c5fe3...`; CI 전용 [PR #1239](https://github.com/ansqhd5774-Choi/zgmini/pull/1239) unmerged, [Run 44047608578](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44047608578) PASS. 제어 [PR #1957](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1957) 승인 JSON 정확 2파일 병합, Host B [#1958](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1958) `BUNDLE_REGISTERED`. PC A [#1960](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1960) / [Run 44049555391](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44049555391) | 기준일 2026-11-17, 신규 guard 실제 approved SHA 정확 실행 PASS, 원격 JSON/TXT 2/2, Core Current 40,777 중 4분류 37,897/0/0/2,880 보존·검산. protected SHA before/after 같음, DB·D1·provider 0 변경. `recorded_at`·`first_seen_at`의 미래/NULL/invalid 배제 CI 검증; 모든 역사 시점 진정성 개별 입증 아님. 후보 14상충·255메타 불충분 `promotionApproved=false` HOLD 유지 | DONE — PC_ASOF_GUARD_PASS / CANDIDATE_HOLD |
| PIT-04-05 | 저장 raw snapshot 및 요청 원장에 원본 해시 귀속 확인 | [앱 PR #1243](https://github.com/ansqhd5774-Choi/zgmini/pull/1243) Reader/Runner+CI PASS, Host B [#1974](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1974) PASS, 신규 Controller allowlist [PR #1978](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1978) source CI PASS; 정확 정규 B approval [PR #1991](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1991), PC B [#1992](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1992) `SUCCEEDED`, 실제 설치 SHA `451f53ae...`; 새 A [#1999](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1999) / [Run 44073203105](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44073203105) PASS·JSON/TXT 2/2 회수 | <!-- W04-PIT0405-A1999-MEASURED-HOLD-20261117 --> raw metadata 86·인증 59·미인증 27. Current 40,777 = verified 27,145 + missingSnapshot 13,632 + conflicting 0 + unverified 0; History 38,804 = verified 27,126 + missing 11,627 + conflicting 0 + unverified 51. 보호 SHA before/after 동일, 운영/Provider/D1 쓰기 0. `rawLineageEvidenceStatus=HOLD_INCOMPLETE_SOURCE_LINEAGE`, 후보 충돌 14·메타 미입증 255, `promotionApproved=false`. [W04 앱 PR #1252](https://github.com/ansqhd5774-Choi/zgmini/pull/1252)로 R6 BED의 canonical JSON hash↔저장 raw HTTP body hash 불일치를 source-only 수정·CI PASS/main 병합. 해당 결함은 실제 미연결의 가능한 일부 원인이지만 전체 결손 근거는 미분류. 기존 원자료/관측 이력 소급 정정·운영 수집 source 설치 없음; W04가 source/runtime 대조하며 raw/DB/TTL/수집 주기 무승인 변경 금지 | IN_PROGRESS — BLS_HOST_B_AND_A_PASS / REMAINING_RAW_LINEAGE_HOLD (전체 35/72) |
| PIT-04-06 | 52주 참조 및 4주 계산에 필요한 주차 실측 | 실PC #1799 저장 Current 600/600주×51지역 완전, strict52 545주 / firstWindowBreak=null / 10y 577주 필요 | 55주 선행 참조(2015-05-02~2016-05-14), 첫 계산 가능 날짜 2016-05-21~최근 저장 관측일 2026-10-24의 545주 **날짜/지역 창 완전성** 확인; History as-of·분모 값 품질은 PIT-04-02/04/07 별도 | DONE |
| PIT-04-07 | 지역별 분모 0·null·missing 원칙 확인 | 기존 [#1799 A 실PC 600/600주·51지역](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) raw window COUNT PASS(전 행의 원문 값 검사 증거 아님), null/blank/boolean 소스 검증 PR #1219/#1222 main 병합, [W04 직접 파서 수정 PR #1251](https://github.com/ansqhd5774-Choi/zgmini/pull/1251) 및 [Node CI #44075341784](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44075341784) PASS, main `3c02848e20ad773735c60043a4dd846542d16a33`, [W04 PR #1296](https://github.com/ansqhd5774-Choi/zgmini/pull/1296)·[#1299](https://github.com/ansqhd5774-Choi/zgmini/pull/1299)·[#1303](https://github.com/ansqhd5774-Choi/zgmini/pull/1303), [Node CI #44237683267](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44237683267) SUCCESS(main `7b95f8fee83b031a14bf2e199b812d403e211c19`), [W04 R6 파서 PR #1305](https://github.com/ansqhd5774-Choi/zgmini/pull/1305) / [CI #44239103881](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44239103881) SUCCESS, main `88ecff9b09d69d65470acf9916e7d0f010ae980e` | ETA539 CSV `c3` blank→0 잘못된 강제 변환 직접 수정, 진짜 0 값 유지/한 지역 결측 주차 51개 완전성 금지 테스트 2건. 기존 PC 실측 600주·51지역/strict52 545주는 개수·참조 윈도우 관측일 뿐 과거 `c3` 원문이 빈 값이 아니었다는 증거 아님; R4·R6 BLS diffusion 연도 정규화/0·null·missing/비십진수·0~100 범위 회귀시험 통과, R6 월간·분기 Gregorian 경계 및 다른 BLS 수치 계약 보존. 승인된 PC source 적용·원문 일치/분모 값 검증 별개 | IN_PROGRESS — ETA539_BLS_SOURCE_GUARDS_CI_MERGED / PC_DATA_VALIDITY_PENDING |
| PIT-04-08 | 재현 가능한 키·충돌 키·출처 불명 키 분리표 확정 | PIT-04 앞 7개 결과 | 원자료 유효 주차·충돌 건수·복구 제외 키 증거화 | IN_PROGRESS — R2_HOST_B_AND_PC_A_AGG_PASS / CONTROLLER7_CI_PASS_B_TARGET_NOT_ON_MAIN / MAIN8_ANCESTRY_PASS_W05_OWNER_B_GO_HOLD / 2094_STAGED_RECOVERY_HOLD / PER_KEY_A_PENDING (§109) |

### PIT-05 — 복구 가능성 판정·최소 운영 승인 설계 (8개, 8 DONE · 0 미완료; 운영 복구 별도 NO-GO)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-05-01 | 과거 공식 자료와 당시 실제 PIT의 입증 가능 범위 구별 | R4/R6 PIT source 계약 + [실PC #2088](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2088)/[2026-11-18 A #2117](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2117), DOL 2026-11-12 공식 발표(11-07 관측) | 과거 provider-history/current-vintage는 당시 접근 가능한 시점의 진짜 TRUE_PIT로 승격 금지; forward는 실제 first-seen/retrievedAt·원본 SHA·PIT 적격성별 재검증 필요. National 최신 공개 2026-11-07 ≠ PC 저장 2026-10-17. Core 40,777/History 38,804 중 raw 미인증/누락과 candidate 14 충돌/255 메타 불충분은 자동 복구 제외. 복구 적격 키 확정/소급 승인 아님. [§94](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) | DONE — VINTAGE_VS_TRUE_PIT_CLASSIFIED / REPAIR_GO_NOT_GRANTED |
| PIT-05-02 | 복구 불가능한 구간을 정직한 PARTIAL로 남길 조건 확정 | 확정된 참조기간·발표 근거 | 10년 근거가 없으면 무리하게 점수 READY로 전환하지 않음 | DONE — PARTIAL_FAIL_CLOSED_CRITERIA_DEFINED / REPAIR_GO_NOT_GRANTED (§95) |
| PIT-05-03 | 후보 DB의 상충 개정 및 불확실 자료 제외 | [실PC #2088](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2088) 2026-11-18 as-of 실SQLite 조회, `scripts/pc-writer/employment-r6-pit-coverage.mjs` 원본키 단위 비교·기존 회귀시험 | Candidate Current 3,700 = Core 중복 일치 3,686 + Core 충돌 14 + 신규 0; **상충 14는 수정/편입 금지**, Core History 누락 2,880 중 내부 메타만 일치하는 후보 2,625는 raw/PIT 증명 전까지 **복구 미승인**, 나머지 255는 현재 근거 불충분으로 배제. 두 집단 합산/중복 수치 오판 금지. 전체 후보 `HOLD_CONFLICTING_REVISIONS`, `promotionApproved=false` / 실제 후보 승인 0; 개별 식별키 목록은 이 읽기 결과에 포함되지 않아 PIT-04-08에서 별도 검증. [원장 §96](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) | DONE — CONFLICTING_AND_UNVERIFIED_CANDIDATES_EXCLUDED_FROM_REPAIR / NO_CANDIDATE_PROMOTION |
| PIT-05-04 | 변경 목표 테이블·키·필드의 최소 집합 결정 | 실제 R4/R6 store 계약 `lib/market-score/employment-r4-shadow-store.mjs`, `employment-r6-contract.mjs` 및 #2088 4분류 | **잠정 미래 승인 대상은 Core SQLite `market_score_employment_r4_shadow_history_v1`의 현재 History에 누락된 정확한 키만 INSERT**, identity=(logical_series_id, geography_type, geography_code, observation_date), 원본과 동일한 provider/provider_series_id/value/source_hash 및 검증된 PIT·provenance 열만; `recorded_at`은 실제 복구 실행 시각으로 기록하며 과거로 소급 금지. `CURRENT` 40,777 및 기존 `HISTORY` 38,804, raw snapshot/run/lock/기타 지표/DB/D1/공개 데이터 변경 대상 아님. **현재 실제 허가된 INSERT 키 0, B 설치/DB 쓰기 없음**; PIT-04-05/07/08 원문·해시·개별 충돌 검증과 승인 뒤 PIT-07에서만 실제 실행 범위 확정. [원장 §96](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) | DONE — SINGLE_HISTORY_TABLE_INSERT_SCOPE_DEFINED / NO_RUNTIME_WRITE_AUTHORIZED |
| PIT-05-05 | 공통 B 유지보수기의 실제 지원 범위 확인 | 설치 controller `f7f1559...` 및 최신 `config/operations.json`, `tools/maintenance-contract.mjs`, 기존 `.github/workflows/pc-employment-r6-registered-data-once.yml`/`r6-registered-data-b/operation.mjs`, Writer source B | 기존 pc-job `mutationsEnabled=false` A만 등록, 공통 `controller-update` B는 **승인된 Controller 파일 버전 교체**, Writer source B는 **승인된 정확 파일 오버레이**, 기존 `employment-r6-registered-data-once` B는 **등록된 ONE_YEAR/BACKFILL 수집→SQLite 저장/공개 작업**만 지원. 이들 중 **임의 또는 선별 History 결손 INSERT는 현재 승인·등록된 operation 효과에 없음**. 기존 B로 SQL을 우회 실행하거나 신규 운영 요청하지 않음. 원본 키·raw/PIT·승인 효과 확정 전 복구 B 설계 보류; 이미 승인된 수집 B의 주기/효과도 임의 변경 금지. [§97](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) | DONE — EXISTING_B_CAPABILITY_CLASSIFIED / HISTORY_REPAIR_EFFECT_NOT_AUTHORIZED |
| PIT-05-06 | 신규 B 효력에 필요한 승인·manifest·원본 보호 확인 | [Controller #2094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2094), `approvals/controller-updates/ead5d2d585ff2ce2a6df5f9b6cf720f65d90b49b.json`, [#2114 실PC stage 증거](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2114), R6 Writer B `bls-registered-v2-13-writer-b-20261109.json` | 기존 Controller approval은 **정확 6파일 설치용**(installed `f7f1559...`→target `ead5d2d...`, #2078, versioned snapshot/old-sha rollback)이며 #2094 `BLOCKED/STAGED`·stage 잔여. 최신 main은 승인 target보다 56커밋 앞섰고 변경된 Controller 소스 `employment-r6-collection-evidence-readonly.mjs`는 재승인 범위/해시 확인 필요; 조용히 target 대체 금지. Writer B 13파일 overlay는 `allowDbChanges=false`; 독립 R6 수집 B의 sqliteWrites는 승인된 수집 효과만. **History 직접 INSERT 승인 manifest·복구 키셋·preimage DB/WAL 보호는 없음 → B 데이터 쓰기 STOP**. [원장 §98](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) | DONE — APPROVED_SCOPE_VERIFIED / HISTORY_INSERT_NOT_AUTHORIZED |
| PIT-05-07 | 동일 SQLite/Core 공유 쓰기 충돌·lease·백업 조건 정리 | [실PC #1798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1798) SQLite Core WAL 및 후보 ROLLBACK 읽기 전용, [#2114](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2114) 공유 Controller install lease 없음(**DB writer lock 증거와 별개**), 기존 `r6-registered-data-b/operation.mjs`의 Core `local-cycle.lock` create-only·owner 확인/5분 bounded wait | 목표 운영 Core `E:\ZGmini\data\pc-writer\storage\core.sqlite`(WAL 및 -wal/-shm), 공유 Writer lane `E:\ZGmini\data\pc-writer\local-cycle.lock`과 Task/Core 실행 소유권. 실제 복구 시점의 기존 DB/sidecar 일관 스냅샷·원본 owner/CAS·잠금/lease 입장·rollback 계획·동일 DB writer 단독 사용·저장 재조회가 선행되어야 함. #1798 당시 WAL sidecar 존재와 #2114 현재 Controller install lease 부재만으로 **복구 실행 때 Core 잠금이 비어 있거나 안전 백업이 있다는 결론 금지**. Active owner/unknown→WAIT/STOP, 다른 작업 lock 삭제 금지; 현재 DB 복구 작업/백업/lease 적용 없음. [원장 §98](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) | DONE — CORE_WAL_WRITER_LANE_CONDITIONS_DEFINED / REPAIR_PREIMAGE_NOT_VERIFIED |
| PIT-05-08 | 적법하고 의미 있는 복구 후보에 대한 GO/NO-GO 결정 | PIT-05-01~07 및 [실PC #2088](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2088)·[#2117](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2117), #2094/#2114 | **현재 복구 실행 NO-GO**: 후보 충돌 14, History 미충족 255, 후보 메타만 맞는 2,625도 raw SHA/PIT 미인증, raw snapshot 27 미인증, ETA539 `c3`/4주 분모 실제 값 검증 미완료, National stored 관측 2026-10-17 정체, 직접 History INSERT 승인·DB 보호/lease 없음. 현재 승인된 적용 키셋 0, SQLite/D1 쓰기 0. 복구 불가 판정은 영구 확정이 아니라 증거/권한 보강 시 해당 키만 재평가. Controller 공유 설치는 공통 독립 maintainer stage 정리 증거 후 기존 승인 범위 내 별도 실행; #2094 재실행 금지. PIT-04-05/07/08의 실제 원자료/키 실증은 계속. [원장 §98](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) | DONE — CURRENT_REPAIR_NO_GO / NO_OPERATIONAL_CHANGE |

### PIT-06 — 선별 복구 코드·fixture 회귀·시뮬레이션 (8개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-06-01 | 누락 History만 대상으로 하는 수정 설계 고정 | PIT-05 GO 키셋 | Current·기존 History·다른 지표 미변경 | TODO |
| PIT-06-02 | 51개 지역×완전 주차 재검증 fixture 작성 | 기존 공식 주차·지역 코드 | 50+DC 일부 누락 시 완전주 오판 0 | TODO |
| PIT-06-03 | 동일 키 재실행·중복 삽입 거부 검사 | 수정후 동일 스냅샷 시뮬레이션 | 기존 History를 불필요한 신규 revision으로 확대하지 않음 | TODO |
| PIT-06-04 | 서로 다른 최신 개정값 동시 존재 검사 | 상충 2건 동등 fixture | 충돌을 삭제/덮어써 PASS 처리하지 않음 | TODO |
| PIT-06-05 | 원자료 해시·출처/가용일 무결성 검증 | 상응 raw snapshot·PIT metadata | 불명/미래시각/비공식 행 삽입 0 | TODO |
| PIT-06-06 | 부분 실패·lease 거부·중단 상태 복구 시뮬레이션 | 기존 트랜잭션·결과 원장 계약 | 최종 PASS 없이 중간 쓰기를 성공으로 표시하지 않음 | TODO |
| PIT-06-07 | 기존 산식 변경 없는 계산·차트 입력 일치 검사 | selected History as-of fixture | 유효 구간만 계산, 근거 부족은 PARTIAL 유지 | TODO |
| PIT-06-08 | 변경 영향 테스트·CI 및 정확한 소스 범위 확정 | 완성된 최소 패치/PR/관련 tests | CI PASS; CI 성공=PC 적용 성공으로 간주하지 않음 | TODO |

### PIT-07 — 승인된 PC의 최소 History 복구·원장 (8개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-07-01 | 운영용 실제 source/config/DB 대상 SHA 재대조 | 최신 운영 PC 등록·설치 증거 | 개발 main과 실행 소스 및 DB 경로 구분 | TODO |
| PIT-07-02 | 실제 안전 실행 기회 및 Core 자원 보호 확인 | PC Core/SQLite lease·B admission | 공유 쓰기 충돌 시 절차 중단·기존 원장 보존 | TODO |
| PIT-07-03 | 필요 B 승인 manifest와 변경 키 집합 고정 | 사용자 승인 효력·PIT-05 GO 결과 | 정확 승인 범위 외 실행 불가 | TODO |
| PIT-07-04 | 승인된 유지보수기 1회 고유 요청 생성 | 기존 공식 B 절차·고유 requestId | 허용된 변경만 실행, 중복 요청 0 | TODO |
| PIT-07-05 | 수정 전 Core current/history/checkpoint 및 보존 상태 확인 | B preimage·원본 보호 | 복구 근거가 불충분하면 쓰기 전 STOP | TODO |
| PIT-07-06 | 누락된 정당한 이력만 단일 보호 쓰기로 반영 | B 작업 실행·검증된 키셋 | 기존 개정 무삭제·PIT 시각 소급 금지 | TODO |
| PIT-07-07 | 변경 후 History·raw·sourceHash·값 재조회 | B 런타임 JSON/TXT·readback | 승인 행 수·트랜잭션·원본 보호 검증 | TODO |
| PIT-07-08 | 최종 PASS/WAIT/FAIL과 LAST PASS/FIRST FAIL 기록 | 동일 요청 ID·실행 결과 | 실제 DB 성공과 source/CI 결과를 분리 | TODO |

### PIT-08 — 저장 자료 기반 계산·로컬 결과 재검증 (6개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-08-01 | 게시 대상 Core 저장 시점·sourceVersion 확정 | PIT-07 저장 원장과 기존 checkpoint | 관측일/저장일/계산일을 혼동하지 않음 | TODO |
| PIT-08-02 | 승인된 R6 산식으로만 재계산 수행 | SQLite 원자료·PIT History | 공급자 API 호출 0, 가중치·산식 변경 0 | TODO |
| PIT-08-03 | 52주 참조·4주 변화율 분모·지역 51개 검사 | History-asOf의 주차별 완전성 | 부족 자료는 임의 0/보간 금지 | TODO |
| PIT-08-04 | STATE_CLAIMS_BREADTH 실제 값·점수 상태 확인 | 저장 자료 계산 결과 | READY 또는 근거 있는 PARTIAL_HISTORY를 정확 판정 | TODO |
| PIT-08-05 | 1년 차트 포인트 수·날짜·마지막 점 검증 | 로컬 계산 출력·관측일 | 차트 날짜/단위·결측/축 일관성 | TODO |
| PIT-08-06 | 로컬 계산 결과·checksum·원장 재조회 | 기존 결과 저장 경로 | sourceStoredAt/관측일/계산시각 보존 및 최신화 증거 | TODO |

### PIT-09 — 기존 D1 게시기와 읽기 결과 일치 (6개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-09-01 | 기존 공개 key·승인 Publisher·권한 확인 | detail:employment-r6:one-year:v1 | 신규 경로/D1 schema/DNS 임의 생성 금지 | TODO |
| PIT-09-02 | 로컬 게시 후보가 검증된 결과인지 확인 | PIT-08 checksum·sourceVersion | PARTIAL과 READY를 과장하지 않은 본문 | TODO |
| PIT-09-03 | 승인된 동일 Writer 경로로 공개 반영 | 기존 PC 게시기 및 자원 보호 | 저장 자료만 게시, 임의 raw/키 업로드 금지 | TODO |
| PIT-09-04 | D1 body/hash/stored_at 정확 재조회 | 게시 ledger·D1 단일 key | 실제 변경 여부/UNCHANGED/실패 구분 | TODO |
| PIT-09-05 | D1 sourceStoredAt/observedAt/postedAt 날짜 검산 | 스냅샷 메타·원자료 hash | 오래된 내용을 새 관측 결과로 표시하지 않음 | TODO |
| PIT-09-06 | 실패·timeout 시 기존 게시 상태와 중복 게시 방지 | 원장·D1 마지막 유효 결과 | HTTP 200만으로 최신 게시 성공 주장 금지 | TODO |

### PIT-10 — Production API/UI 검증·종결 판정 (6개, 미실행)

| 세부 ID | 실제 실행·분석 작업 | 입력·근거 | 완료 판정 / 결과 | 상태 |
|---|---|---|---|---|
| PIT-10-01 | Production GET 29개 ID·sourceVersion·원자료 상태 조회 | /api/employment-r6/observations | D1 게시 결과와 29/29 행·시각 일치 | TODO |
| PIT-10-02 | DOL National 4계열 및 STATE_CLAIMS_BREADTH 세부 행 대조 | 각 원값/점수/관측일/sourceStoredAt | 기존 4계열 정상 유지·마지막 지표 상태 확인 | TODO |
| PIT-10-03 | 점수/부분점수/이력 부족 상태 재집계 | API score/scoreStatus | 완료 단언 대신 29/29의 진짜 계산 가능 여부 보고 | TODO |
| PIT-10-04 | 1년 차트 READY·PARTIAL·UNAVAILABLE 점수 구분 | API history/차트 포인트/최종일 | 점수와 차트가 각각 필요한 근거 충족 | TODO |
| PIT-10-05 | PC·모바일 화면의 단위·축·마지막 점 확인 | /economic-indicators/employment/ | 요청 범위 내 표시 정상, 임의 UI 재설계 없음 | TODO |
| PIT-10-06 | 종단 완료 조건 충족 시 종료·미충족 시 원인 기록 | PC B·SQLite·D1·GET/UI 증거 | 기능 DONE/자료 정당 PARTIAL 분리, 잔여 실제 문제만 보고 | TODO |

### 다음 하나의 필수 실행 — PIT-04-01

- **이미 완료한 작업 재사용:** [#1786](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1786) WAL·RAM PASS와 [#1787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1787) 51지역 후보/전체 Core PIT 집계 PASS, immutable 분석 번들 SHA, 두 결과 JSON/TXT를 재사용하고 재실행하지 않는다.
- **작업:** 최신 Current 지역·관측 주별 시간 범위를 기존 승인 원자료/안전 projection과 대조한다. 입력의 범위·표본 단위·as-of 시점이 일치하는지 먼저 확인하고, 필요한 경우만 승인된 최소 비민감 read-only 조회 개선안을 검증한다. 과거 후보 중 값·해시 일치 2,625와 충돌 14가 TRUE_PIT 승격 승인인 것은 아니다.
- **PASS 조건:** 51지역 완전 주차, 지역별 최대 관측일, Current/History 서로 다른 개정·PIT 가용 시점, 계산에 필요한 52주 선행 참조의 검증 자료. 현 stage는 aggregate까지만 보이므로 미노출 주차를 추측하지 않는다. **STOP:** 미승인 원자료 공개/SQL·DB 쓰기/보호 우회.


### 2026-11-17 단회 A/light #1780 실증 및 진행률 정정

- 요청 [#1780](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1780) / [Run 43893673097](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43893673097): `employment-r6-wal-memory-preflight`가 `PREVALIDATION/PROTECTED_STATE_SNAPSHOT`에서 `RETIRED_IRAN_INVENTORY_UNAVAILABLE`로 차단. 실제 CPU/RAM/WAL·SQLite 조회에 진입하지 않았으며 공급자·DB·D1 쓰기 0. 과거 #1765 메모리 부족 결과가 오늘에도 유효하다고 추정 금지.
- 원인 경계: 제어 `main/controller/operations.mjs::attestRetiredIranAbsence`의 inventory 실행 상태 또는 인용 CSV 파싱이 검증되지 않음. 제거 승인 R13 재생성·보호 검증 삭제 불가. 중앙 #68 [인계 기록](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6920425471)은 다른 담당자 실제 수신/복구 증거 아님.
- `PIT-03-01`, `PIT-03-02`, `PIT-03-08`은 기존/신규 정본 조회에 근거해 DONE. `PIT-03-03`은 BLOCKED; `PIT-03-04`~`07`은 미실행. **전체 17/72 DONE, 55/72 잔여**. 다음 실PC 요청은 보호 목록의 정상 상태·메모리 안전조건이 실제 충족된 뒤 실행.


### 2026-11-17 W04 격리된 PIT 유효숫자 감사 수정 — 개발 main 반영, 운영 적용 별도

- **독립 소스 개선 결과:** `scripts/pc-writer/employment-r6-pit-coverage.mjs`의 후보 Current/History matching 과정에서 SQLite `REAL NOT NULL` 열에 저장될 수 있는 빈 TEXT 관측값이 `Number('')===0`으로 정상 0과 오인될 가능성을 제거. 숫자 0은 정상 입력으로 유지. `tests/pc-writer-employment-r6-pit-coverage.test.mjs`에 빈 후보·Core 0/후보 공백 충돌 **2개 신규 fixture** 추가. Core/candidate 원본 SHA 불변 및 `HOLD_*` 상태를 보존한다.
- **전담 브랜치 작업:** `codex/employment-1y-reader-r1` source `1318133ba62450ced9a12825dd3b0fd459300945`, tests `fe6acf4d44db9b547e4eccf70cce34677a6b1c7b`.
- **선별 main 통합:** 역사적 전담 브랜치를 통째로 merge하지 않음. 오직 두 파일만 최신 main 기반 `fix/w04-r6-pit-readonly-empty-value-20261117`에서 [PR #1190](https://github.com/ansqhd5774-Choi/zgmini/pull/1190)으로 반영; [Node.js CI #43896607559](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43896607559) `SUCCESS`, `main` squash SHA `17ea61707eb0b48e6c01517d46188fb48e57c509`. 파일 두 개 외 수정 없음.
- **검증 범위:** 격리 Node 숫자 가드 12 assertion PASS, SQLite `REAL NOT NULL` blank TEXT 허용 실증, 전체 저장소 Node.js CI PASS, main 실제 두 파일 blob readback PASS.
- **상태 경계:** 이 수정은 기존 읽기 전용 PIT 감사의 **안전성 보강**이지 실제 PC R6 bundle/Controller 설치·PIT HISTORY 증분·점수/산식·D1/사이트 상태 변경이 아니다. `PIT-03-03`은 #1780의 `RETIRED_IRAN_INVENTORY_UNAVAILABLE`로 여전히 BLOCKED. `PIT-06` 전체 fixture·B 승인·운영 과정은 아직 미완료. **세부 진행률 17/72 유지(23.6%)**.
- **다음 필수 동작:** 기존 [제어 중앙 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6920425471)에 인계한 공통 보호 Task 조회 오류의 안전한 수정·운영 정상화 증거를 받아 `PIT-03-03` 메모리/WAL 상태를 확인, 이후 승인 A `PIT-03-04` 한 차례만 요청. 무의미한 #1780 재실행·R13 재등록·임의 SQL 사용 금지.


### 2026-11-17 최신 PIT-03 8/8 완료 — 실제 PC 신규 증거

- A/light [#1786](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1786) Run 43898278381 `PASS/R6_WAL_MEMORY_PREFLIGHT_READY`, free 2275MiB, Core WAL/sidecars·candidate ROLLBACK 정상.
- A/heavy [#1787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1787) Run 43898451571 `PASS/EMPLOYMENT_R6_READONLY_STAGE_COMPLETED`, `sqliteOpened=true`, 2/2 원격 artifact 재조회. `Current=40726`, `History revisions=38753`, `missing=2880`, `matching candidate=2625`, `unverified=255`, `conflicting candidate overlap=14`. 공급자/DB/D1 쓰기 0.
- 현재 상세 완료 **22/72 (30.6%)**, 미완료 **50/72**. `PIT-03-03~07` 5개 신규 완료; `PIT-04-01` 다음. 과거 #1780 R13 오류의 구조적 근본 원인 수정·메모리 영구 정상·PIT 정합성 복구·웹 점수 29/29는 주장하지 않는다. 전체 증거는 [진행 원장 §13](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 누적 보존.


### 2026-11-17 PIT-04-01 현재 A 데이터 근거 조회 안전거부 — 신규 진행 기록

- [#1789](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1789) Run 43899712917 `STATE_UNKNOWN/R6_EVIDENCE_WAL_SIDECARS_ABSENT`; 실제 Core SQLite 오픈 0, `stateClaims=null`, 공급자/DB/D1 쓰기 0; JSON/TXT 원격 재조회 2/2. Actions conclusion SUCCESS를 기능 PASS로 해석하지 않는다.
- 같은 인가된 A는 주차별 aggregate만 반출하고 **지역별 최대 관측일/History revision as-of가 없으므로**, sidecar가 있더라도 `PIT-04-01` 완전 판정은 추가 정규 읽기 안전 경로 없이는 불가. 기존 #1787 2,880 결손/14 후보 충돌은 보존하고 TRUE_PIT 승격 근거로 사용하지 않는다.
- `PIT-04-01` BLOCKED, 전체 **22/72 DONE / 50 미완료** 불변. 다음은 공통 검증 보호를 유지한 최소 비민감 저장 이력 조회 구현·fixture 적합성 확인. 상세 원본 [진행 기록 §14](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) 참조.


### 2026-11-17 W04 PIT-04-01 소스 개선 및 검증: 개발 완료·실PC 미설치

- 기존 제어 `main@40a0767ec48829360a0b47a2b37e499d59944a05`에서 고용 전담 기능의 2파일만 분리한 [Draft PR #1791](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1791), head `999c144c45c14667b32b42b8db324e0d1a7b7aca`. 기존 A를 교체하지 않고 `stateClaims.regionLatest`에 51 고정 공식 지역별 날짜 `CURRENT_ONLY_NOT_PIT` projection 준비. WAL 모두 부재/부분 부재를 fail-closed로 분류해 운영 DB 손상/복구로 오인하지 않음.
- Windows [W04 Node source CI 43901867724](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43901867724) 해당 21/21 및 기존 경로 47/47 PASS; [C996 43901867639](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43901867639) SUCCESS. 두 파일만 수정. 공통 #68 [인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6921555673) 등록. 이는 **SOURCE_READY/CI_PASS**이지 실제 설치나 PIT-04-01 운영 DONE 아님.
- **현재 기능 진행률 22/72 = 30.6%, 잔여 50 유지.** 단계 `PIT-04-01=BLOCKED/SOURCE_READY`, 원자료·History·DB·D1/점수 28/29 변화 없음. 다음 필수 실제 동작은 공통 owner의 기존 승인 정규 Controller 적용 경로와 검증된 최신 WAL-safe snapshot 조건을 분리 점검하여 최소 두 파일의 적용 필요성을 결정하는 것. source main SHA, 실제 설치 SHA, 승인 manifest, lease와 출처 적합성 확인 전 운영 설치/새 A 요청은 하지 않는다. 실제 regionLatest 51지역 결과가 반환되고 기존 단계별 저장 이력 근거가 맞을 때만 PIT-04-01 DONE으로 전환. 상세 실행 결과는 [진행 기록 §15](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### 2026-11-17 PIT-04-01 WAL sidecar 정상 종료·immutable 신선도 격리 시뮬레이션

- 임시 SQLite fixture에서 WAL/SHM (둘 다 존재) → 마지막 정상 연결 종료 뒤 둘 다 부재, SQLite header WAL [2,2] 유지가 재현됨. sidecar 부재는 DB 손상이나 안전한 데이터 스냅샷이라고 단정하지 않는다.
- 다른 임시 fixture에서는 활성 writer가 commit한 최신 1행을 일반 SELECT에서 읽었지만 `immutable=1` reader에서는 **0행**이 관측됨. 정확한 as-of 데이터가 중요한 고용 R6에 `immutable=1`을 임의 fallback으로 넣지 않는다.
- 결과는 [진행 기록 §16](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 보존. [Draft #1791](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1791)의 기존 fail-closed WAL 보호와 Current-only 51지역 날짜 출력 제안만 유지. 실제 PC `#1789` 원인 확정/Controller 운영 설치/52주·10년 PIT 복구는 미완료.
- 다음 필수 실행은 공통 owner의 정규 안전 snapshot·설치 범위 확인 후 실제 최신 source와 51개 지역 날짜 조회를 **한 번 새 A**로 증명하는 것. `PIT-04-01` **BLOCKED/SOURCE_READY**; 전체 **22/72 DONE(30.6%), 50/72 미완료** 불변.


### 2026-11-17 신규 실PC #1798/#1799 — Current 51지역 최신일 PASS, PIT-04-01 DONE

- 실제 A/light [#1798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1798) Run 43904004344 WAL 양쪽 존재·RAM 1799MiB/PASS. 실제 기존 A [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) Run 43904242672 `PASS/R6_DOL_BED_STORED_EVIDENCE_READONLY`, sqliteOpened=true, artifact JSON/TXT 2/2.
- 고정 51개 공식 지역의 최신 600 관측주를 DESC 조회한 실제 SQLite 집계 `complete51Weeks=600`, `incompleteWeeks=0`, 최신 `2026-10-24` 주차 51행·고유 51지역·미등록 0의 완전주. 이는 모든 공식 지역의 최대 **Current 관측일**이 2026-10-24임을 집합 논리로 입증한다. `fullTenYearRawCoverage=RAW_PRECONDITIONS_COMPLETE`는 577주×51지역 원자료 충족만 의미하고 과거 실제 `History` PIT 진실성은 미입증. 최신 저장 이후 발표 여부·2026-11 현재 최신성을 자동 승인하지 않는다.
- 이 실측이 기존 Draft #1791 `regionLatest` 출력의 추가 운영 설치 없이도 `PIT-04-01`의 목표를 충족하므로 **그 Draft를 본 단계 필수 조건에서 제외**한다. #1791은 아직 미병합/미설치, 공통 Controller 변경은 수행하지 않는다.
- **변경 상태: PIT-04-01 DONE, 전체 23/72(31.9%), 49개 미완료.** 다음 `PIT-04-02` 관측일×지역 최신 `History` revision 분리. 상세 원본 [진행 기록 §17](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md). 공급자/DB/D1/웹 운영 변경 0.


### 2026-11-17 후속 PIT-04-06 52주·4주 저장 Current 참조창 확인

- 독립 작업 `PIT-04-06`은 기존 승인 A [#1799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1799) Run 43904242672의 같은 읽기 전용 SQLite 결과로 완결: `sampledWeeks=600`, `complete51Weeks=600`, `strict52WeekCandidateCount=545`, `firstWindowBreak=null`, `latestWindowBreak=null`; 55주 선행 참조 후 2016-05-21~2026-10-24 날짜/지역 완전주. `fullTenYearRawCoverage=RAW_PRECONDITIONS_COMPLETE`는 필요 577주×51지역 저장 Current 전제만 가리킴.
- `PIT-04-06` **DONE**, `PIT-04` 2/8, 전체 **24/72 DONE(33.3%), 잔여 48**. PIT-04-02 History 최신 revision과 04-07 0/null/blank 값/분모는 이번 완료 범위 밖이다. 자세한 실행 증거·별도 source CI 실패 및 수정은 [진행 원장 §18](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 보존.
- 앱 격리 소스 검증: [Draft PR #1195](https://github.com/ansqhd5774-Choi/zgmini/pull/1195) 정확 2파일. 최초 [Node CI 43906302719](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43906302719) 공백값 오분류 2 FAIL을 기존 assertion 보존 최소 수정으로 해결. 최신 HEAD `48c5e61d7a5b28a6ee2d9f8a47f4742326cc2f9d`의 [Node CI 43906987544](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43906987544) **4523 tests / 4513 PASS / 0 FAIL / 7 SKIP / 3 TODO**, 04-02 신규 4/4 및 기존 공백 2건 PASS, Build/typecheck/11개 게시복구/69개 CF read 계약 PASS. **source CI=실PC History revision 검증/설치/운영 게시 완료 아님**. 구체적 시점별 변경은 [진행 기록 §19](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### 2026-11-17 PIT-04-02 기존 등록 A 3층 비민감 History 출력 연결

- **원인/재사용:** 기존 운영 PC [#1787](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1787)는 Core History 총 개정 38,753건을 집계했으나, 기존 앱 Reader·전담 Runner·Controller 고정 출력 허용목록에서 최신/과거 개정별·동시각 상충 `asOf` 숫자 분포가 미노출. 기존 A를 재실행해도 동일 출력이므로 재요청하지 않는다.
- **최소 소스 연결:** 앱 `codex/employment-1y-reader-r1`에서 `employment-r6-pit-coverage.mjs` + 감사 fixture를 [Draft #1195](https://github.com/ansqhd5774-Choi/zgmini/pull/1195) **실제 Node CI PASS 코드에서 선별 복원**, `employment-r6-runner-stage.mjs`의 허용 개정 count 10개 및 `HOLD_AMBIGUOUS_LATEST_REVISIONS`+fixture 2개 추가. 정확 앱 4파일. 공통 제어 최신 main 기반 [Draft PR #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804)는 기존 `controller/employment-r6-candidate-readonly.mjs`의 **10개 count-only + 검증된 `asOfDate`**를 반환하도록 보강; 제어 영향 소스 1개·테스트 1개·기존 W04 격리 CI 워크플로 1개(총 3파일). 신규 A, Controller/Runner·Scheduler·DB/D1·산식 변경 없음.
- **검증:** 앱 #1195 [Node CI 43906987544](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43906987544) `4523 tests / 4513 PASS / 0 FAIL / 7 SKIP / 3 TODO` (소스 감사 레이어). 제어 #1804 중간 HEAD `dca5b448` [Windows W04 CI 43978763417](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43978763417) `SUCCESS`, R6 기존 A 출력 fixture **7/7 PASS**. 제어 최신 HEAD `4c6fe39d50aa8d11ce451a1f5a29dbdd1be823d2` [W04 43979157453](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157453) / [C996 43979157561](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157561)은 최초 `QUEUED`(최종 결과 별도 추적); 앱 **Runner** 레이어 전담 브랜치 테스트는 source fixture 작성 완료이나 native CI 아직 없으므로 PASS로 표기하지 않는다.
- **기준선:** `PIT-04-01 DONE` + `PIT-04-06 DONE`, `PIT-04-02` **SOURCE_PIPELINE_READY/OPERATING_UNVERIFIED**. 전체 **24/72 DONE(33.3%), 미완료 48**. 공통 공유 Controller 현재 PC 설치 SHA는 기존 실측 `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`; 새 소스 PR/브랜치 커밋 및 운영 실제 SHA는 불일치. 기존 승인 R6 bundle `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`를 자동 교체할 수 없다. 
- **다음 필수 실행 하나:** 최종 CI와 두 저장소 SHA·정확한 영향 source 파일을 원격 재확인 후, 중앙 #68 Controller owner에게 **기존 A 1개·승인 R6 불변 source bundle 1개**의 실제 운영 누적 preimage/manifest·lease·승인 범위 차이를 보존한 최소 적용 조건을 명시한다. 승인된 B와 실PC source 검증 없이는 신규 A 실행·History 값/출처 승격·29/29 계산/게시 성공으로 바꾸지 않는다. 기록 [§20](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### 2026-11-17 W04 제어 PR #1804 최종 Windows CI PASS 후 정정

- **최신 제어 PR [#1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804) HEAD `4c6fe39d50aa8d11ce451a1f5a29dbdd1be823d2`**의 격리 Windows [W04 Run 43979157453](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157453)는 실제 checkout/Windows Node 22 및 단계별 결과 재조회 **완료/성공**: DOL fixture 47/47, 저장 evidence fixture 17/17, 기존 R6 A History count/asOf 안전 출력 8/8, 공유 resource 11/11 = **83/83 PASS·0 FAIL**. [C996 Run 43979157561](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157561)도 SUCCESS. 앞선 `QUEUED`는 당시 상태였고 결과 정본을 이 항목으로 정정한다.
- 앱 #1195 CI PASS(4523 tests/0 FAIL)와 제어 #1804 CI PASS는 각각 소스/테스트 증거이다. **전담 Runner 별도 Native CI / 실제 PC 새 source bundle 승인·설치·History 개정 수치 실측은 여전히 미완료**. `PIT-04-02=SOURCE_CI_VERIFIED/RUNTIME_PENDING`, 전체 **24/72 DONE(33.3%), 48/72 잔여** 유지.
- 공통 담당 [#68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6932576302)에는 정확히 변경된 기존 Controller A 1모듈, 앱 Runner/감사 2모듈, 기존 bundle/Controller 실설치 SHA 분리를 인계했다. 승인된 누적 source/manifest/preimage/lease 확인이 선행되어야 한다. next: 실제 B 범위·효과 확인 후 인가된 기존 A 새 고유 요청 1회, `asOf`·10개 History revision 분포+원격 JSON/TXT 2/2 확보. 자세한 증거는 [진행 기록 §21](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 보존.


### 2026-11-17 PIT-04-02 앱 전체 4파일 통합 CI 완료·실제 R6 신규 source 승인 범위 확인

- **검증 완료:** [앱 Draft PR #1195](https://github.com/ansqhd5774-Choi/zgmini/pull/1195) HEAD `dfa7d5e487e86a8887cb2766bc0ba9a1a114e048` — `employment-r6-pit-coverage.mjs`, `employment-r6-runner-stage.mjs` 및 각각의 테스트 정확 **4파일**. 최초 [Node CI #43980561859](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43980561859)는 신규 Runner 오입력 fixture 1건이 필수 공개 결과 body 누락으로 `RUNNER_R6_PUBLIC_DISPLAY_INVALID` 실패. 기존 guard/test assertion 보존 후 **fixture에 정상 격리 SQLite 공개 body 제공**으로만 수정. [후속 Node CI #43980978653](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43980978653)는 **4553 tests, 4543 PASS, 0 FAIL, 7 SKIP, 3 TODO**, Build/typecheck·PC 게시검사 11/11·Cloudflare 69/69 PASS. 기존 앱 개발 브랜치와 Runner 최신 테스트 blob 동일 원격 확인. PR은 Draft/미병합/미배포.
- **제어 A 결과 재사용:** [Control PR #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804) 기존 operation `employment-r6-candidate-stage-readonly` 출력 최소 10개/asOf 검증, 격리 [Windows CI #43979157453](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43979157453) 83/83 PASS. 새 A/Runner/예약을 만들지 않음. 제어 개발 main, PR HEAD, PC 설치 SHA 서로 다름.
- **실제 적용 차단의 구조:** 제어 `tools/stage-r6-host-registration.mjs`가 `R6_EXACT_SOURCE_SHA=afdd8fab1c03b321e4b8b0853bb236c0800a0a14` 및 승인 manifest `42afb8fe4f0ecdeb551256ec897bb99b1e850420dd0f5bc7b74ec03db2f46c81`만 허용하며 `approvals/host-r6/` 승인 JSON도 이 고정 SHA 1개뿐. `tools/apply-r6-host-overlay-b.mjs`는 같은 정확 SHA의 **최초 등록** 전제이므로 새로운 수정 Runner/History source bundle을 기존 B 승인으로 등록·교체할 수 없다. 기존 Controller #1745 `RECOVERY_REQUIRED` 원장을 임의 해제/재실행하지 않는다.
- **단계 유지:** `PIT-04-02=SOURCE_INTEGRATION_CI_PASS/SOURCE_APPROVAL_BLOCKED`, 전체 **24/72 DONE(33.3%), 48 미완료**. 다음 필수 효과는 [#68 인계 #6932786062](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6932786062)의 중앙 Owner가 **새 source SHA·승인 manifest/preimage·기존 승인효력/lease**를 검증하고 범위 밖 효과에 명시 승인을 확보한 후 정규 B로 실제 설치/원격 확인하는 것. 설치가 검증되기 전 새 A 반복 요청 불필요. 이후에만 기존 A 고유 1회로 10개 revision/by asOf 값을 회수하고 DONE 판정. 상세 실 CI·LAST PASS/FIRST FAIL/수정 커밋은 [진행 기록 §22](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### 2026-11-17 W04-PIT-04-02 — 19파일 고정 PC preimage 확인·2파일 승인 source 후보 고정

- **실제 설치 전 A 결과:** [pc-job #1812](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1812) / [Run 43982706453](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43982706453) `PASS/WRITER_FIXED_PREIMAGE_READONLY`, **고용 R6 파일 19/19 PRESENT**, Core 고정 checkout HEAD/config/checkpoint `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388` 일치, Controller `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`, R6 AutoCollection·OneYearAutoPublication 설정 `ENABLED`, 보호상태 SHA 전후 불변. JSON/TXT **2/2**. `runtimeSourceVerified=false/coreTaskSourceLinked=false`: **활성 Core 프로세스가 이 SHA로 동작·정상 수집·게시한다는 뜻이 아니다**. DB/D1/운영 쓰기 0.
- **승인 범위 축소:** 원래 16파일 source 승인 커밋 `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`과 현재 전담 브랜치 전체를 묶으면 R6 Scheduler 조기 발표일 소스도 달라지므로, 승인되지 않은 **Scheduler 변경 0**을 보장하도록 원래 커밋에서 별도 최소 `fix/w04-r6-pit-history-bundle-minimal-20261117` branch 생성. HEAD **`2b5255147b16d595196a8f006cf1d95c840a4926`**, compare **2 commits/2 source files only** (PIT-coverage와 Runner), 나머지 14 파일 기존 SHA 유지. 원본 승인 `R6_SOURCE_FILES` 16개만 사용하고 `config/operations.json`·DB·가중치·Scheduler·공급자 호출 변경 없음.
- **최소 검토 manifest 작성 및 SHA-256 재검증:** [`EMPLOYMENT_R6_PIT04_02_MINIMAL_SOURCE_MANIFEST_DRAFT_20261117.json`](EMPLOYMENT_R6_PIT04_02_MINIMAL_SOURCE_MANIFEST_DRAFT_20261117.json), source HEAD `2b525...`, branch `fix/w04-r6-pit-history-bundle-minimal-20261117`, 변경된 2파일의 SHA256 `7f590286b00bee52c4d355e10a44d8662ea94724b8ad6d29bcd9749e9035bec7`, `02e399b26cbc5f4333f3993bd16f1cff6bc41ae85d5e41b9896dcf849cedac66`. 정확 JSON+LF manifest SHA256 **`60e0c7b404368be3551f0f6d85819ac5895ae4f32bc43d694aa8d818db0f74f6`**. 기존 승인 manifest 해시 `42afb8fe4f0ecdeb551256ec897bb99b1e850420dd0f5bc7b74ec03db2f46c81`를 같은 계산기로 재현하여 확인. **승인 증명서가 아닌 SOURCE_DRAFT**.
- **현재 실제 차단·다음 최소 실행:** 신규 source SHA·branch의 B 정규 upgrade/병존 승인은 없음. 기존 `stage-r6-host-registration.mjs`/ `apply-r6-host-overlay-b.mjs`는 기존 source `afdd...`와 최초 등록을 고정하므로 **이 draft를 그대로 실행하면 안 됨**. 공통 Owner [#68 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6933077228)에서 이번 최소 2파일 조합의 **격리 Fixture·source/manifest/preimage/lease 정합성**과 별도 신규 승인 범위를 확정한 다음, 승인된 기존 정규 B 경로에서만 실제 설치. 이후 기존 A `employment-r6-candidate-stage-readonly` 신규 1회로 10개 History revision/asOf·JSON/TXT 2/2 확인 시 `PIT-04-02 DONE` 판단. [진행 기록 §23](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에서 실제 증거·LAST PASS/BLOCKER를 복원. **전체 24/72 DONE(33.3%), 잔여 48, 단계 순서 유지**.


### 2026-11-17 PIT-04-02 frozen 16파일 정확 CI PASS 및 B 승인 경계 확정

- [검증 전용 PR #1198](https://github.com/ansqhd5774-Choi/zgmini/pull/1198)는 현재 앱 main 기반 **test-only 1파일** 임시 검증 PR. 과거 승인 `afdd8fab1c03b321e4b8b0853bb236c0800a0a14`에서 두 파일만 변경한 고정 source `2b5255147b16d595196a8f006cf1d95c840a4926`와 [16파일 검토 manifest](EMPLOYMENT_R6_PIT04_02_MINIMAL_SOURCE_MANIFEST_DRAFT_20261117.json)(SHA256 `60e0c7b404368be3551f0f6d85819ac5895ae4f32bc43d694aa8d818db0f74f6`)를 임시 별도 git worktree에서 재구성. **16/16 SHA256 PASS, 원본 대비 변경 정확 2파일, Scheduler 원본 그대로**, 실제 Runner/PIT 최신 fixture 2세트를 격리 Node에서 실행한 test assertion까지 확인.
- FIRST FAIL: 최초 [Node CI #43984579700](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43984579700)에서 하위 Node test TAP 결과를 부모 test IPC가 흡수해 stdout이 빈 문자열이 된 **검증 test-only harness 1건** 실패. 기존 운영 guard/assertion을 삭제하지 않고 nested process의 test context를 분리, TAP 총건수·fail0·Runner 테스트명 검증을 강화. 후속 최종 [Node CI #43984972573](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43984972573) **completed/success**, **4547 tests / 4537 PASS / 0 FAIL / 7 SKIP / 3 TODO**, frozen 16파일 fixture 1/1 PASS, Build/Typecheck/PC publication 11/11/Cloudflare read 69/69 PASS. PR #1198은 로그 댓글 보존 후 **closed/unmerged**. main/운영 PC/DB/D1/웹 변경 0.
- 현 단계 진단: `PIT-04-02 SOURCE_COMPATIBILITY_CI_PASS / B_APPROVAL_REQUIRED`, 기존 72단계 중 **24/72 DONE(33.3%), 미완료 48** 유지. CI PASS는 이전 신규 R6 source SHA/manifest에 대한 B 운영 승인이나 설치·실제 History 개정 수치 검증의 대체가 아니다. 원본 구 source 초기 host 등록만 승인됐으므로 기존 B primitive 재사용으로 새로운 source를 설치하지 않는다.
- **다음 필수 실행 한 개:** 공유 단일 owner [#68 인계 #6933377798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6933377798)에서 현재 Controller/host SHA·#1745 유지보수 원장/lease, frozen source 정확 2개 변경의 승인·backup/preimage, 기존 A projection PR #1804의 최소 설치 범위를 확인하고 **새 버전 source 병존/보존형 upgrade B 승인 경로**를 확정한다. 실제 승인된 설치·원격 SHA readback 이후에만 기존 A `employment-r6-candidate-stage-readonly` 1회 고유 요청으로 History 10개 latest/prior/ambiguous/asOf 값을 받아 PIT-04-02 DONE 판정. 전체 실행 상세는 [진행 기록 §24](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### 2026-11-17 PIT-04-02 R6 Host CAS 실측 및 공통 Source Bundle B 승인지원 경로

- **변경된 공유 운영 상태 실제 확인:** 공용 #1745 intake recovery는 2026-11-17 00:07:57Z readback `INTAKE_RECOVERED_EXISTING_CONTROLLER_PRESERVED`, 11/11 PASS, Windows 76/76, 기존 설치 Controller `e3a495c97d6b40d6d4eea2ff4f586bef46216eb7`/실행 원장 불변, 관측 시점 install lease `held=false`. 기존 복구 대기 자체는 해소됨. 실제 새 B 적용 직전 동일 lease는 반드시 재검증.
- **추가 운영 A 성공:** [pc-job #1819](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1819) / [Run 43986010471](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43986010471) `PASS/R6_HOST_ALREADY_REGISTERED`; 원승인 source `afdd8fab1c03b321e4b8b0853bb236c0800a0a14` 실제 Host 등록, 설치 Controller `e3a495...`, Host SHA256 **`e6c8e30480cedddcf20f0b1bcdc5fd0063dda09860d48e313a04a660cc01128c`**. JSON/TXT 원격 2/2; protected unchanged, provider/operational/D1 writes 0. 기존 R6 최초 B 등록을 재시도할 이유 없음.
- **기존 공통 B 재사용 확정:** 실제 설치 maintainer source `33d66558f6ed1807f23257ef6a5af2eacd8e3969`에 `tools/source-bundle-register.mjs`/공통 `pc-source-bundle-register` 경로 존재. 승인 schema `ZGMINI_PC_SOURCE_BUNDLE_B_APPROVAL_V2`, 소스 manifest `ZGMINI_PC_SOURCE_BUNDLE_MANIFEST_V1`, scope `HOST_APPROVED_SOURCES_SINGLE_CAS_ONLY`; 다른 approvedSources 보존, 신규 R6 sourceKey 한 개만 추가, 기존 Controller/수집/DB/예약 불변. **신규 기능별 B installer/Controller 코드 필요 없음**. 별도 기존 A 출력 변경은 [Control Draft #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804)에 유지.
- **정확 승인 검토 초안 산출:** 기존 frozen `2b5255147b16d595196a8f006cf1d95c840a4926`의 16개 기존 고정 SHA를 보존하는 [공통 V1 검토 JSON](EMPLOYMENT_R6_PIT04_02_SOURCE_BUNDLE_V1_REVIEW_20261117.json), SHA256 `e01874cea6774deae2e4e8bef4691e9d3d67be2153af09c0f69f3cbf472f4c59`. 제어 [Draft PR #1822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1822), source `draft/w04-r6-pit04-source-bundle-b-20261117` HEAD `11e6abc4767546af28182c9030e38cc1bc64fe76`, `approvals/source-bundles/manifests/2b525...`+ `approvals/source-bundles/93bae0ec...` 정확 **2 JSON 파일만 추가**, PR open/draft/unmerged/mergeable clean. B `approvalDigest=93bae0ec850ddfdc1b6cf69d3b8a5b102184f62a62aa297e2fe07d2007bdc176`, 대상 기존 Controller 관측 `e3a495...`, exact requestId·backupDirectory·manifest SHA·원본 보존·PR ref 포함. [CI #43986902161](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43986902161) SUCCESS. **Draft를 승인이나 설치 완료로 해석 금지**.
- **남은 단계/다음 행동:** `PIT-04-02 SOURCE_B_APPROVAL_DRAFT_READY/PC_HISTORY_UNVERIFIED`, **24/72 DONE(33.3%), 48 잔여**. 공유 owner [#68 최신 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6933634080)는 신규 source-key B 효과에 대한 명시 승인, 승인 PR main 정본·유효 SHA/Host CAS·배타 lease, 기존 제어 A 출력 [Draft #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804)의 별도 공유 B 효과를 검토·확정한다. 승인 후 기존 공통 B만 사용해 새 bundle 1개 등록/백업/원격 readback → 제어 A 출력 모듈 정규 설치 → 기존 `employment-r6-candidate-stage-readonly` **1회 고유 요청**으로 History latest/prior/ambiguous/asOf 10개 JSON/TXT 2/2 회수, 그때만 PIT-04-02 DONE. 이번 턴 사용자 신규 B 명시 승인 없음, PR merge/B Issue/운영 write 0. 상세 [진행 기록 §25](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### 2026-11-17 PIT-04-02 공용 B #1821 설치 후 승인 기준 갱신 (계획·판정)

- **변경된 마지막 실PC Controller 설치 증거:** 제어 [#1821](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1821)의 공식 JSON/TXT 결과 `SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, `actualControllerSha=a21b928f0c058ff6e7daf8a33dcfb613c9adc4df`, `protectedStateUnchanged=true`, `workflowEnabled=true`. #1819 당시의 `e3a495...`는 역사적 Host CAS 관측이며 **향후 B 설치 기준으로 재사용하면 안 됨**. 이는 #1821 작업의 설치 결과이며 R6 신규 source/출력 적용을 뜻하지 않는다.
- **승인 검토 Draft 수정 완료:** [제어 PR #1822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1822)에서 오래된 `93bae0ec...json` 승인 제안 파일을 **Draft 브랜치에서만 제거**하고 새 `approvals/source-bundles/76e4383d5ce6e6127b59a7831e26dcb95cb84edbbcaf5083f98a367a13c020dc.json`(이 파일 원문 SHA-256을 파일명으로 사용)으로 대체. 승인 proposal의 `installedControllerSha=a21b928f...`로 재고정, 기존 16파일 source V1 manifest digest `e01874...`, 16개 해시·기존 승인 R6 `afdd8...` 및 신규 source `2b525...` 불변. 이 소스-only 변경은 사용자 승인·PR merge·PC 설치가 아니다.
- **순서/통과 조건 불변:** 공유 #68 단일 설치 owner가 (1) 정확 B 범위에 대한 유효 명시 승인, (2) 승인 효과의 PR/main 정본, (3) **실제 설치 직전** Controller SHA/Host CAS/lease·기존 #1821 설치와 다른 B의 충돌 유무를 확인한 뒤 기존 `pc-source-bundle-register` 정규 B에서 새 키 하나만 등록·원본 보존·backup/hash readback. 이어 기존 A 출력 [Draft #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804)의 별도 정규 공통 Controller 승인·적용 확인 후 기존 A `employment-r6-candidate-stage-readonly` 고유 1회로 History 10개 비민감 개정 통계와 asOf·JSON/TXT 2/2를 확인한다. approval preimage가 다시 바뀌면 미사용 proposal을 다시 갱신한다. 승인 없는 B 요청 금지.
- **정확 단계 상태:** `PIT-04-02 = SOURCE_B_DRAFT_REPINNED / B_APPROVAL_AND_RUNTIME_PENDING`, `24/72 DONE(33.3%)`, 잔여 48. 실제 History 미관측 10개를 0 또는 READY로 산정하지 않음. 진행 원장 [§26](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 최종 commit/evidence/미승인 결과를 대응 기록한다.

### 2026-11-17 사용자 승인 B 실운영 적용 시작 — PIT-04-02

- **사용자 직접 B 승인 확인**: `2b5255147b16d595196a8f006cf1d95c840a4926` 신규 승인 번들 16파일의 보존형 Host 키 추가와 기존 A History 10개 정수 필드/asOf 출력 변경에 한정. Core SQLite/원자료·산식·D1·Cron·Task 변경은 승인 범위 밖.
- **정확한 신규 source 등록 실증 DONE:** Source approval [PR #1822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1822) merged `943a89968987e60e1664eb53523036852d21d9be`. 실제 [#1829](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1829) `SUCCEEDED/BUNDLE_REGISTERED/HOST_CAS_READBACK`, 신규 key 1개를 보존형 공통 B로 등록. 독립 [#1830](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1830) `PASS/R6_HOST_ALREADY_REGISTERED`, 기존 `afdd8fab...` Host 승인 보존·Controller `a21b928f...`·protectedStateUnchanged true·Host SHA256 `3e028ccf...`, remote JSON/TXT 2/2. #1829 generic 결과의 보호/Workflow false 기본 외피는 별도 정상/장애 증거로 해석하지 않고 독립 #1830 실제 A로 한정.
- **History 출력 module 승인 및 Controller B 요청 접수:** 기존 제어 [PR #1804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1804) 정확 Controller 1파일+테스트 1파일 병합 `384ffd09e80ad769e31596483dfe73e9ee8b6c6a`, 새 Controller/config deployable 1파일. 공식 [단일파일 B manifest PR #1831](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1831) merged `a7205ce721d0e4374d131b9492f7fa11e086214d`, [C996 #43990283442](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43990283442) PASS. `controllerOnlyInstall=true`, old `a21...`→target `384...`, rollback old SHA, `core-status` postcheck. 동일 정규 Controller B [#1832](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1832) **1회 접수 / 아직 결과 미확정**. 중복 요청 금지.
- **계획 진척:** 여전히 `PIT-04-02 HOST_REGISTERED/CONTROLLER_B_PENDING`, `24/72 DONE(33.3%)`, 미완료 48. 다음 단일 실행은 #1832 terminal JSON/TXT/실제 installed SHA/post core-status 확정 후 기존 `employment-r6-candidate-stage-readonly`를 신규 source SHA로 단회 실행해 **History 10개와 asOf** 반환 여부 확인. 원자료 DB 보간·쓰기, 정규 수집을 후속 Gate로 추가하지 않음. 상세 [진행 기록 §29](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### 2026-11-17 W04 B 2계층 운영 적용 성공 및 WAL/RAM 이중 상태 확인

- **적용 두 건 완료:** 신규 16파일 frozen R6 `2b5255147b16d595196a8f006cf1d95c840a4926`의 보존형 Host B [#1829](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1829) `SUCCEEDED/BUNDLE_REGISTERED`, 독립 old-source Host 증거 [#1830](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1830) `PASS`; Controller History 10개 출력 module-only B [#1832](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1832) `SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, installed `384ffd09e80ad769e31596483dfe73e9ee8b6c6a`, protected/workflow PASS, 결과 JSON/TXT 2/2. 이전 `a21b928f...`에서 바뀐 실제 Controller 배포 파일은 1개.
- **실제 기능 A는 BLOCKED:** 정확 새 source+실제 새 Controller `employment-r6-candidate-stage-readonly` [#1836](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1836) / [Run 43991397177](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43991397177) `BLOCKED/WAL_SIDECAR_NOT_READY`·`sqliteOpened=false`; 메모리 admission 3240MiB PASS였으나 WAL 선행 guard STOP. 오염·실행 실패나 History 0개로 판정하지 않음.
- **읽기 전용 별도 WAL/메모리 진단:** 기존 [#1837](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1837) / [Run 43991594176](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43991594176) 결과 `BLOCKED/RESOURCE_WAIT_MEMORY`. 이 시점 Core SQLite WAL 헤더·`-wal/-shm` **BOTH_PRESENT / READY**, 후보 SQLite ROLLBACK `NOT_REQUIRED/READY`; 여유 RAM **666MiB**, 최소 **1536MiB** 불충족. 공급자/DB/D1·운영 쓰기 각 0, 보호 SHA 불변. WAL 부재는 이 시점에 관측되지 않았지만 다음 A의 sidecar 동시 존재는 별도 실측 필요. 상태 정상화 목적으로 SQL/open/파일 생성·삭제·프로세스 종료/예약 변경하지 않음.
- **계획 상태:** 정확 두 B 운영 효과 `DONE`, 기능 `PIT-04-02`은 `RUNTIME_RESOURCE_WAIT / HISTORY_DATA_UNVERIFIED`로 아직 `DONE` 아님. 전체 **24/72(33.3%) / 잔여 48** 유지. 다음 필수 실행 하나 = 기존 안전 A/light WAL·RAM 판단에서 **동시** 2조건이 적격일 때 기존 A/heavy `employment-r6-candidate-stage-readonly` 단회 신규 requestId로 실제 History 10개/asOf 회수; 적격 확인이 안 되면 B 재설치나 임의 WAL 재생성 없이 `BLOCKED` 유지. 상세 [진행 기록 §30](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### 2026-11-17 PIT-04-02 원본 #1839 GitHub A 취소·미회수

- **이미 완료한 두 B 효과 불변:** 신규 Host source `2b5255147b16d595196a8f006cf1d95c840a4926` 보존 등록 [#1829](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1829) SUCCESS, 기존 Controller 1모듈 History 10필드 출력 적용 [#1832](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1832) SUCCESS / 실제 Controller `384ffd09e80ad769e31596483dfe73e9ee8b6c6a`. PIT-04-02 History 10개 숫자/asOf는 여전히 미관측.
- **이번 원본 A terminal 상태:** 기승인 WAL·메모리 사전검사 [pc-job #1839](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1839) / [Actions #43992528433](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43992528433), job `133736468445`, Runner `zgmini-pc-02`, `started_at=2026-11-17T01:05:23Z`, `completed_at=2026-11-17T01:18:24Z`, `COMPLETED/CANCELLED`, attempts 1, steps `[]`, 결과 댓글 0. 원격 `results/43992528433-1-seat-{1..6}.json` 6/6 `NOT_FOUND`, job log 다운로드 `BlobNotFound`. **원본 WAL 상태·메모리·보호 결과 측정·보고를 검증할 수 없음**, 실행 실패 또는 실제 WAL 차단 코드로 추정 금지.
- **원인 경계:** 원본 `.github/workflows/pc-job.yml`의 작업별 concurrency `pc-request-${{ github.event.issue.number }}`, `cancel-in-progress: false`, `timeout-minutes:8`과 실행 시작~종료 약 13분을 확인. 취소 주체·원인·PC의 실제 Controller entry 진입 여부는 직접 증거가 없어 불명. 별도 공통 Runner 소유자가 기존 Run/Job·원장/seat/취소 인과관계를 좁게 판정해야 함. `#1839` 동일 요청 재실행·무조건 신규 pc-job 생성·Controller 재설치·WAL 파일 생성/삭제/DB open 금지.
- **다음 필수 행동:** 기존 #1839의 정확한 결과 누락/취소 원인을 공통 Runner 담당 범위에서 확인한 후, 운영 영향이 없는 정상 A 진입 경로가 다시 확인되면 신규 고유 read-only WAL·RAM 조건 1회 → PASS 동시 만족 시 History A/heavy 1회. 미확정 동안 `PIT-04-02=STATE_UNKNOWN/A_JOB_CANCELLED_NO_RESULT`; 전체 **24/72 DONE(33.3%), 미완료 48** 유지. 연계 [진행 기록 §33](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### 2026-11-17 PIT-04-02 공유 Controller #1841 전환·복구 간섭 증거

- **W04 현재 공유 자원 실측 근거:** 신규 Host B #1829와 History Controller A projection B #1832는 완료 증거 유지. 그러나 다른 기능 W03의 **공통 Controller B [#1841](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1841)** 요청은 `2026-11-17T01:07:15Z`에 생성돼 실제 결과 `UNKNOWN/BACKLOG_OR_RECOVERY_NOT_VERIFIED`, `LAST_PASS=RECOVERY_REQUIRED`, `FIRST_FAIL=SWITCHED`, reported actual Controller `384ffd09e80ad769e31596483dfe73e9ee8b6c6a`, 목표 `2f569c18e09a55e54e81052985a80f6a8765d680`, recovery SHA 미확정. 이 결과는 전체 Controller 재설치나 정상 복구 성공이 아님.
- **기존 A [#1839](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1839)** job 133736468445, Runner `zgmini-pc-02` 01:05:23Z~01:18:24Z 구간 `CANCELLED` 및 결과 미회수로, **#1841 공용 설치 요청과 01:07:15Z~01:18:24Z 겹침**. 현행 `tools/update.mjs` Controller B는 `pauseIntake`→`waitForDrain`→`stopOwnSupervisor`→`switchVersion`→`reconnect`로 6개 Runner/수신을 조정하므로 간섭 가능성 조사 필요. 취소 원인은 미확정이며 #1841의 영향이라고 단정 금지.
- **정확한 기존 Issue에 원인 대조 인계:** [#1841에 W04 교차 사건 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1841#issuecomment-6935181315) 1회 기록·원격 재조회. 공용 Controller 소유자의 #1841 원본 lease/ledger/복구 및 #1839 Runner 결과 생성·업로드/취소 인과 검증 전에는 W04의 **동일 Controller 사용 A의 신규 실행을 보류**. 무관한 소스·회귀 개발은 독립적으로 진행 가능.
- **현재 판정/다음 필수 행동:** `PIT-04-02 BLOCKED/SHARED_CONTROLLER_RECOVERY_UNVERIFIED + A_RUN_CANCELLED_NO_RESULT`. 전체 **24/72 DONE(33.3%)·잔여 48**. #1841 실제 공유 리소스 release/정상 Host 승인/source 재검증 후, 기존 승인 A/light WAL·RAM 적격 1회; Core WAL/-wal/-shm와 후보 DB·RAM 1536MiB 동시 PASS 시에만 History A/heavy `2b525...` 신규 1회. 기존 A/B requestId 재실행 금지; 무승인 복구·DB/sidecar 변경·신규 설치/예약 금지. 상세 [진행 기록 §34](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### 2026-11-17 W04 최신 운영 복구·PIT-04-02 완료 → PIT-04-03 착수

- **공용 장애 해결 실제 증거:** 유지보수 [#1841 최종 원본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1841#issuecomment-6935608375), 독립 [복구 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/controller-1841-recovery-20261117.json)/TXT 2/2. `ROLLED_BACK/INTERRUPTED_ROLLBACK_VERIFIED`; 실제 기존 Controller `384ffd09e80ad769e31596483dfe73e9ee8b6c6a` 유지·원장보존·원요청재실행 false·설치 잠금 보관; Workflow/Runner 사후 정상 보고. 새 목표 `2f569c18...` 적용 성공 아님. #1839는 `CANCELLED` 이력, 직접 취소 인과 미확정으로 유지.
- **PIT-04-02 실제 단회 완료:** [History A #1862](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1862) / [Run 43999648363](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43999648363) `completed/success`; [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43999648363-1-seat-2.json)/TXT 2/2 확인. `PASS/EMPLOYMENT_R6_READONLY_STAGE_COMPLETED`, asOf2026-11-17. Core History 37,897 고유키, 이전 개정 877키·907행, latest 모호성 0; Candidate History 3,700 고유키, 이전 개정 0. 새 source `2b5255147b16d595196a8f006cf1d95c840a4926`; RAM 입장 1,692MiB ≥1,536MiB, WAL 안전 guard 통과, 운영 DB/공급자/D1 쓰기 0·보호 전후 SHA 동일.
- **승격 미승인 및 PIT-04-03 차단 세부:** Core CurrentKeys40,777 중 History 누락 2,880. Candidate History로 값·해시 일치 2,625이며 PIT 메타 정합 후보 2,625, **잔여 255개는 정합 메타 부재**. Candidate CurrentKeys3,700 중 Core와 동일 키/값·해시 일치 3,686, 충돌 14, 신규 키 0. 충돌 14는 Core↔Candidate current의 버킷으로, 과거 개정 877과 동일하다고 추정 금지. `HOLD_CONFLICTING_REVISIONS`/`promotionApproved=false`, 비충돌 2,625도 개별 과거 TRUE_PIT 완전성을 뜻하지 않음.
- **단계 판정:** PIT-04-02은 원래 정한 **History asOf 최신/과거 revision 10개 count 실측** 통과로 `DONE`. 다음 PIT-04-03은 **전체 Core Current↔Core History asOf 교집합의 실제 값/sourceHash 대조 버킷**이 이 결과만으로 미증명이라 `TODO`; 14충돌 상세 분석과 255미확인 계보는 후속 관련 단계. 전체 **25/72(34.7%), 잔여 47**, PIT-04 3/8.
- **다음 필수 동작 하나:** #1862 계산 소스 `scripts/pc-writer/employment-r6-pit-coverage.mjs`와 관련 테스트에서 현재 이미 산출/비산출 버킷 확인 후, 승인·기등록 A 읽기 전용 집계로 04-03을 충족할 수 있는지 판정. 필요할 경우 3분류의 **비민감 개수만** 노출하는 source-only 소규모 보완과 격리 회귀부터 수행; 실제 Controller/Host 신규 설치·B효과·운영 DB 수정·Candidate 자동승격은 별도 정확 승인 전 수행 금지. 진행 기록 [§36](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md) 참조.

### 2026-11-17 W04 PIT-04-05 BED Writer B #2038 정규 승인 명세 병합 / 공유 조회 실패 분리

- **마지막 유효 기능 결과:** Host B #2023 `SUCCEEDED`, A #2027 `PASS`; source 계보는 Current 29,031/10,889/857 verified/missing/unverified, History 29,016/8,873/915, raw snapshot 59/86 certified, Candidate 상충 14·메타 미입증 255. PIT-04-05 `HOLD_INCOMPLETE_SOURCE_LINEAGE` 유지, 승격 승인 `false`.
- **W04 직접 수행한 적용 준비:** 앱 PR #1252의 BED 원문 body SHA 수정 1파일은 기존 운영 PC A #2011 파일 SHA와 PR 직전 소스가 바이트 동일함을 확인. 목표 app SHA `b94cd97208bc5ea19be4068a170e3c45b051639c5ee3d1ec2156c1ed18c587d6`. 정규 B 명세 제어 PR [#2038](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2038) C996 성공, main 병합 `c417f81cfebb283dbd7e107cdadb922175c239ac`, raw manifest SHA256 `a37bdccbb25a2e40d2af3637dd495c19836a1928545c26a75f397bd4b7af9acb`. 1파일 M/2 보호파일, source HEAD/config CAS, RunCount1, DB/D1/Task/Provider 변경 0. **운영 B 요청과 설치 미실행**.
- **신규 실제 공통 조회 차단:** [#2032](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2032) 읽기 전용 A `BLOCKED/RETIRED_IRAN_INVENTORY_UNAVAILABLE`; [#2036](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2036) 별도 Core A `BLOCKED/PROTECTED_TASK_XML_QUERY_FAILED` (Core Task). 둘 다 PREVALIDATION/쓰기 0, 원본 requestId 보존/재실행 금지. 공통 schtasks/Task 보호 조회 한정 [중앙 #68 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6948575710); 나머지 W04 기능은 원담당 수행.
- **다음 필수 순서:** (1) 공통 보호 조회 정상 실측 후 운영 HEAD/config·수집 파일 정확 preimage A 신규 고유 조회 (2) W04 원담당이 승인된 BED **1파일** 정규 B 설치를 CAS/원본 보호 조건에 맞게 1회 수행하고 JSON/TXT 2/2 + 실제 Runtime SHA 재조회 (3) ETA539 별도 파일 운영 SHA 확인 후 기존 승인 Writer B로 최소 적용 (4) 공급자·시점·미인증 Run 사유의 비민감 read-only 분류 및 PIT 재검증. 기존 원본 행 소급 수정/재수집·후보 승격/DB/D1 게시/예약 신규 설치 금지. 예약 자연 검증은 해당 기능 완료 이후 후속 단계. 단계 **27/72 DONE(37.5%), 잔여 45**. 상세 [진행 기록 §75](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### 2026-11-17 W04 PIT-04-05 원자료 인증 집계 소스/Host manifest 준비 완료 — 실PC B 미적용

- [앱 W04 PR #1266](https://github.com/ansqhd5774-Choi/zgmini/pull/1266) Reader·Runner와 두 테스트(4파일), app immutable SHA `0193056bdb47bcf6c911f17623b6c302c8199c4c`. 유효한 저장 raw SHA와 성공/부분 수집 Run 인증을 구분해 `invalidBody`·`validWithoutRun`·`certified` 및 승인 releaseGroup/월별 bounded count만 제공. 원문·해시·requestKey·정확 시각은 출력하지 않는다. [Main-targeted Node CI #44090336072](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44090336072) SUCCESS; 검증 전용 #1267은 병합 없이 종료.
- 기존 Controller A projection 확장 [제어 PR #2043](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2043), source/C996 CI PASS 후 main 병합 `6108ac78d0e40e41b9a9de8e797c6b17a2ae1bd7`. 프로그램상 허용된 고정 group·월 및 누락/보전/인증 건수만 안전하게 읽으며 다른 운영 효과는 없다.
- Host 후보 소스 16파일의 SHA256 전체 검산에서 기존 `8fffa9...` 대비 Reader·Runner 정확 2개만 변경, 나머지 14개 불변. [제어 PR #2050](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2050) source-only manifest `approvals/source-bundles/manifests/0193056bdb47bcf6c911f17623b6c302c8199c4c.json` raw SHA256 `1d625d316dbe9662f9885f0f5903ca2a7aa43a410e05a51027f037be29c03816`, C996 #44091507576 SUCCESS/main 병합 `b997b884a11a725e51188e2aa2bb0384ef228e34`. **이것은 Host B 승인·PC Controller 설치/원자료 계보 실증을 대체하지 않음.**
- 실제 공유 보호 조회 실패 [A #2032](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2032) `RETIRED_IRAN_INVENTORY_UNAVAILABLE` / [A #2036](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2036) `PROTECTED_TASK_XML_QUERY_FAILED`(Core Task), 둘 다 PREVALIDATION 및 운영 쓰기 0. 공통 Task 조회 한정 총괄 [#68/6948575710](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6948575710) 이미 인계. 새로운 공유 조회 정상 확인 전 Writer B·Host B·Controller B는 NO-GO; 독립적인 W04 소스 검증은 DONE.
- **다음 필수 실제 실행:** 공통 보호 조회 정상 관측 → W04 본인 운영 PC 고유 A로 HEAD/config/source preimage·기존 Host CAS 실측 → 기존 [BED 1파일 Writer B PR #2038](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2038) 정규 적용 조건 검증/단회 실행·2/2 → Host 새 source B exact manifest/승인 파일·보존형 CAS 등록 → Controller W04 한 파일 B → 기존 A급으로 86개 snapshot 중 27개 미인증의 Body/Run 실패·공급자/월별 실측. ETA539 별도 정확 원본 SHA와 최소 Writer B 후속, 과거 0/null/missing 소급 보정·무단 재수집·승격 금지. 예약 자연 검증은 전 기능 완료 후 후속 작업. 전체 **27/72 DONE(37.5%)**, 미완료 45. 상세 [원장 §76](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### W04 PIT-04-05 — 2026-11-18 운영 적용·재조회 최신 상태 (#2056~#2064)

- **W04 원담당 실제 실행 성과:** #2054 고정 checkout 원본 A PASS(HEAD/config `2070ff535...`, BED provider/collector/store SHA 기존 #2038 승인 범위와 일치); BED 1파일 정규 B [#2056](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2056) `WRITER_B_PREFLIGHT_STOP/WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED` (안전한 자연 유휴 시간 미확보, 소스 미적용); 경계 재확인 `core-status` [#2058](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2058) PASS, Core lock 존재/체크포인트 전진/Task 불변.
- **신규 R6 16파일 Host B 실PC 등록 DONE:** 최초 제출 [PR #2057](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2057)의 설명형 승인 경로 오류로 첫 [#2059](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2059) `APPROVAL_MANIFEST_READ_FAILED` 안전 중단(PC 효과 없음). 원담당 자체 수정 [PR #2062](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2062) exact digest file/C996 PASS/main → 신규 [#2063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2063) `SUCCEEDED/BUNDLE_REGISTERED`/HOST_CAS_READBACK, 정확 Host source `0193056bdb47bcf6c911f17623b6c302c8199c4c`. 결과 JSON/TXT 각각 2/2, 설치된 Controller `f7f1559...` 불변. Host B 성공은 Writer B/Controller B/SQLite/D1/게시 성공과 별개.
- **실제 새 PIT 계보 A 미완료:** 신규 [#2064](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2064) `employment-r6-candidate-stage-readonly`는 초기 메모리 1,872MiB/기준 1,536MiB admission PASS 후 작업 내부의 별도 `RESOURCE_WAIT_MEMORY`로 중단. `candidateExecuted=false,sqliteOpened=false,actualExecutionSha=null,providerCalls=d1Writes=operationalWrites=0`. 신규 raw 인증 실패 27개 공급자·월별 값은 미실측, 이전 A #2027 59/86 및 Current 29,031 verified/10,889 missing/857 unverified, History 29,016 verified/8,873 missing/915 unverified만 마지막 유효. 기존 요청 재실행·메모리 기준 완화 금지.
- **Controller 운영 경계:** 앱 R6 Reader/Runner와 정규 Host B 등록을 끝냈어도 Controller `controller/employment-r6-candidate-readonly.mjs` 신규 고정 그룹/월 출력용 PR #2043은 운영 PC 미설치. W01 신규 A407 PR #2061로 같은 공유 Controller의 다른 파일/operation도 main에 반영되어 있으므로, installed f7부터 정확 누적 변경 범위·W01 소유자·총괄 공유 Controller 보호 GO와 실제 B 이력을 별도 확인해야 함. W04의 1파일 기능 source 작성·정확한 diff/승인 manifest 준비·결과 판정은 W04 책임이며 총괄에 전가하지 않음.
- **다음 필수 행동 우선순위:** (1) 자연 유휴가 아닌 계속 활성 Core를 중지하지 않고, 승인된 공통 PC 메모리 개선/가용 안정 증거가 확보될 때에만 신규 고유 R6 A 재실행(이전 requestId 재사용 금지) 및 27개 원본의 body/run/provider/month 집계; (2) BED #2038 정확 B는 Core 자연 유휴 2회 및 lease/원본 재검증이 가능할 때 새로운 고유 승인 요청 1회로만 실시, 효과 확인; (3) 공유 Controller 출력 B의 설치 변경은 W01 A407과 통합 보호 검토 후 정확 승인·실행; (4) ETA539 운영 원본 SHA 확인 후 별도 승인 최소 B. 기능 수집→SQLite 이력→계산→승인 게시→API/UI를 목표로 계속하며 정상 예약 검증은 전체 기능 완료 후. 상세 [§81 진행 기록](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).
- **현재 종료:** 27/72 DONE(37.5%), 잔여 45, `PIT-04-05=IN_PROGRESS/HOLD_INCOMPLETE_SOURCE_LINEAGE`, `promotionApproved=false`. 사용자 승인 없는 운영 Core 중단, Task/XML/DB/SQLite/D1/provider 변경 및 복원·재실행 없음.

### W04 — 2026-11-18 최신 운영 실측: RAM 1,456MiB, DOL 전국 최신성 미달

<!-- W04-PLAN-A-LIGHT-RAM-AND-DOL-STORED-20261118 -->

- **실제 W04 A/light 2건 새로 완료:** [PC #2071](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2071) WAL/RAM 조회는 BLOCKED/RESOURCE_WAIT_MEMORY(PC free 1,456MiB, 승인 1,536MiB, Core WAL 양 sidecar 정상, 후보 ROLLBACK 정상, DB alias/파일 문제 미발견). [PC #2072](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2072) Core 저장 SQLite DOL/BED A/light는 PASS/READONLY, providerCalls·operationalWrites·d1Writes 0, JSON/TXT 각 2/2 확인.
- **새 저장자료 유효 결과:** DOL ETA539 51개 지역 주별 600/600 complete, 마지막 2026-10-31, 10년 원자료 선행조건 PASS(요구 577주·29,427행). DOL 전국 2026-11-18 RELEASE PARTIAL/DOL_RELEASE_OBSERVATION_STALE(HTTP200 XML 전국4/4 parsed, 최신 관측일 2026-10-17). DOL 공식 대시보드 최신 11/07 발표 대비 지연, 원인(원시 응답 시간차·캐시·파서) 아직 미확정. BED 2026-11-09 RELEASE SUCCESS(2026-10-28 계약상 최종 발표), BED HTTP provenance B #2056 아직 미설치. DOL/BED score/publication DONE 아님.
- **실행 우선순위:** (1) 승인된 다른 A 경로를 활용해 DOL National 저장 원문과 파서별 최신 주차 차이의 원인을 W04에서 검증. **공식 공개 웹의 신규 수치를 임의 저장하거나 공급자/URL·산식 변경하지 않음.** (2) 운영 PC RAM이 승인 최소 1,536MiB 이상으로 안정됐다는 실제 증거 후에만 새로운 고유 heavy A로 raw snapshot metadata 86 중 미인증 27건의 body/run/group/month 원인을 계측. 원 요청 #2064 재실행 금지. (3) Core 자연 유휴 확인 후 기존 승인 BED 정확 1파일 Writer B 신규 단회, 공유 Controller W01 A407+W04 1파일 누적 5파일 B는 정확 승인 범위·보호 GO 이후 진행. 장기 예약 정상 검증은 모든 기능 작업 종료 후.
- **진행률:** 27/72 DONE(37.5%) 그대로, 잔여 45. 원자료 10년 주별 완전성 통과는 계보/계산/게시의 완료를 뜻하지 않음. 실제 근거는 [진행 기록 §83](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### W04 — 2026-11-18 DOL National raw/run 대조 A/light 소스 반영 완료

<!-- W04-PLAN-NATIONAL-RAW-PARSER-PR2078-20261118 -->

- **소스 완료, 운영 미실행:** [PC 제어 PR #2078](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2078) 정확 2파일 W04 전용 모듈/테스트, W04 CI [#44224139250](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44224139250) SUCCESS, C996 CI [#44224139231](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44224139231) SUCCESS. 제어 `main` source-only squash merge `04823cd1decf79349551f91a9be1321aec462224`; PC 현재 설치 Controller와 동일하다는 증거 없음.
- **검증 기능:** 기존 A/light `employment-r6-collection-evidence-readonly`가 저장 수집 run의 원본 `bodySha256`에 일치하는 National XML 청크만 bounded readOnly/원문 SHA 재조회한 후, 실제 XML week/4개 계열별 관측주와 동일 run 파서 기록을 비교. 결과에 원문·수치·원본 해시 노출 없음. 새 공급자 호출·DB 쓰기/산식/임계값 변경 없음.
- **직접 다음 실행:** 운영 PC 공통 Controller B 설치가 실제 정확 승인된 통합 변경분/자원 보호/lease/전후 SHA를 충족하는지 확인한 뒤, 적용 성공 시 W04가 **새 고유 A/light**를 직접 실행하여 National raw 최신 4계열의 출처/파서 차이를 확정. 현재 #2072는 신규 raw 대조 결과가 없으며 과거 고유 요청 재사용 금지. Controller 운영 설치 GO는 공통 설치 권한 영역으로만 제한하고 W04 본연 Reader/원자료 조사와 Heavy A·BED 후속은 전가하지 않는다. `27/72`(37.5%), PIT-04-05 HOLD, raw 미인증 27과 승인 RAM 1,536 MiB 제한 유지. [§84 원장](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### W04 — 2026-11-18 정확 6파일 Controller CAS 승인 후보 고정 (비실행)

<!-- W04-PLAN-SHARED-6FILE-CAS-PR2083-20261118 -->

- **대상과 미해결 설치:** PC #2072에 보고된 설치 Controller `f7f1559bc0ef15bb9b375982d048369c474c490f` → 제어 source 고정 target `ead5d2d585ff2ce2a6df5f9b6cf720f65d90b49b`; 설치 영향 6파일 중 W04 2, W01 4. W04 단독 1파일 선언으로 최신 main을 적용할 수 없는 `ALLOWFILE_DIFF_MISMATCH` 사전 확인. Controller만 선택적 설치, workflow/result/원장 파일은 제외.
- **구현 증거:** [W04 Draft PR #2083](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2083), target 6파일 SHA256 fingerprint `5eac97ce0fc4bf290d152b948502da0dc09446342dbf22bafd09fb0564925608`, [C996 #44226535487](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44226535487) SUCCESS. **초안은 `B_PENDING`·PC 설치 승인/실행 아님.** 공유 영향 GO/NO-GO만 [중앙 #68/6967597730](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6967597730) 요청. W04 설치/실측 본 업무 타인 인계 없음.
- **2026-11-18 02:50Z Runtime 참고:** W01 [#2081](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2081#issuecomment-6967539319)로 설치 `f7f1559...` 동일·`core.lockPresent=true` 확인. Core checkpoint COMPLETE는 lock-free 증거가 아니므로 BED B의 현재 자연 유휴 GO로 전용 금지. W01도 [중앙 #68/6967630142](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6967630142)에서 5파일/6파일 누적 범위·단일 Owner 결정 요청을 별도 등록; 중복 변경/중복 설치 금지.
- **다음 필수 실행:** 승인된 공유 6파일 적용 순서 확인 → W04가 직접 실제 preimage·lease·정규 B 승인 manifest/사후 검증 → 설치 Controller와 source 일치하면 새 A/light 전국 저장 XML/run 최신일 대조. 공식 DOL 주차를 임의 저장하지 않음. 승인 없는 B 요청 0; 기존 BED #2056 Core 자연 유휴·heavy 1,536MiB 별도 게이트. **전체 27/72 DONE(37.5%), 잔여 45; PIT-04-05 IN_PROGRESS**. 상세 [§85 진행 기록](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### W04 — 2026-11-18 실PC 계보 A/heavy PASS와 PIT-04-07 입력 날짜·정수 보호 source-only 완료

<!-- W04-PLAN-A2088-ETA539-PR1296-20261118 -->

- **새 실제 W04 실행:** [PC #2088](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2088#issuecomment-6968107304), [Run #44230284284](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44230284284) 고유 read-only A/heavy 실PC **PASS**. Admission `1622MiB >=1536MiB`, SQLite opened, JSON/TXT 2/2, 승인된 Host `0193056b...`·Controller `f7f1559...` 일치, DB/D1/provider 실운영 부작용 0. 기존 #2064의 메모리 BLOCKED를 재실행하지 않고 원 담당의 새로운 한 번 요청으로 안전 통과. 기존 메모리 문제를 완화·설정 변경한 것은 아님.
- **결손 분류 유지:** Raw metadata 86 중 certified 59 / uncertified 27. Current 40,777 중 verified 29,031 / raw missing 10,889 / raw unverified 857; History 38,804 중 verified 29,016 / missing 8,873 / unverified 915. Candidate conflict 14, Core History missing 2,880/후보 정합 2,625·메타 불충분 255, 자동 승격 HOLD. 이전 실제 11 필드 집계와 동일; **현 Controller 고정 projection에는 provider/month 상세 계수 없음**. 새 통합 Controller B 승인·실제 설치 이전에 27개 원인을 확정했다고 주장하지 않는다.
- **PIT-04-07 독립 소스 수정:** [앱 PR #1296](https://github.com/ansqhd5774-Choi/zgmini/pull/1296) source/parser+test **2파일**, Node [CI #44230137404](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44230137404) SUCCESS, 앱 main merge `bc88e15b5cf3dd7370cd325c03446b4d59d79cef`. ETA539 `c2/rptdate` impossible Gregorian 날짜의 `Date.UTC` 보정 거부, `c3` blank·음수·소수·지수·16진·비안전정수 거부, 정상 원문 0·정수·천단위 콤마·윤년 허용. 신규 2건 회귀; 원본 데이터·운영 Writer/Controller 설치 변경 0. **실제 raw c3 유효 값 확인 전 PIT-04-07 IN_PROGRESS**, 결손 0으로 변환하거나 완전 주차를 가정하지 않는다.
- **다음 필수:** 기존 [공유 6파일 Draft #2083](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2083) 및 [중앙 #68 GO 요청 #6967597730](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6967597730)에서 정확 GO/순서 회신을 실제 확인한 후에만 정규 B 설치, 새 A/light National 저장 XML↔run의 날짜 판정 및 앱 세부 raw 인증 구분; 독립 W04 source/원자료 확인은 계속. BED Writer B는 Core 자연 유휴·원본 보호 조건에서만. 수집·계산·D1·API/UI 완료까지 진행하며 예약 검증 선행 제외.
- **진행률:** 27/72 DONE(37.5%), 잔여 45. [진행 원장 §86](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)의 실제 영수증을 최신 근거로 삼음.

### W04 — 2026-11-18 PIT-04-07 BLS 확산지수 null·0 경계 보호 및 회귀 CI 통합

<!-- W04-PIT0407-BLS-NULL-ZERO-PR1299-20261118 -->

- **독립 source 완료:** 앱 최신 main의 `lib/market-score/employment-r4-shadow-provider.mjs`가 BLS diffusion `Number(null)`·`Number("")`·공백을 `0`으로 변환하여 없는 관측을 정상 0으로 처리하는 결함 확인. W04 원담당 [PR #1299](https://github.com/ansqhd5774-Choi/zgmini/pull/1299)에서 R4 provider·기존 회귀시험 정확 2파일 수정: null/undefined/blank/whitespace를 결측으로 제외, 수치 `0`·문자열 `"0"` 보존, 최신 유효 관측주와 FORWARD/PIT 분류 유지, 계열 전부 결측이면 POST 성공에도 missing으로 판정해 해당 ID만 기존 단일 GET fallback. R6 기존 빈값 보호 계약과 동등.
- **검증·병합:** [Node.js CI #44233385700](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44233385700) **SUCCESS** (build·typecheck·regression·publication recovery·CF candidate 계약 통과). [#1299](https://github.com/ansqhd5774-Choi/zgmini/pull/1299) 앱 main squash merge `b8d3c665e32de4721e174cd23bd6c25d739cf1e9`. 신규 회귀 2건 + 기존 테스트; 공급자 실제 호출·운영 SQLite/Writer/Controller/Task/D1 및 원자료 변경 **0**. 소스 CI는 운영 원본의 유효성을 뜻하지 않음.
- **공유 Controller 설치:** [Draft #2083](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2083) 정확 6파일은 `B_PENDING`, [중앙 #68/6967597730](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6967597730) GO/NO-GO·단일 설치 순서 미회신. W01 공유 source는 임의 적용 금지. 마지막 W04 실PC A/heavy [#2088](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2088) PASS를 재사용하되 인증되지 않은 raw 27건·Candidate 충돌 14는 그대로 HOLD.
- **다음 필수 실행:** 정확 공유 6파일 GO 및 설치 순서 확정 시, W04 직접 installed Controller preimage/lease·보호/정규 `ZGMINI_PC_UPDATE_V1` B manifest·단회 B/JSON-TXT 회수 → 신규 National 저장 XML↔Run 주차 A/light 및 raw provider/month 비민감 계수 검증(PIT-04-05). 승인 미회신이면 설치만 HOLD하고 PIT-04-07 실제 ETA539 `c3` `null/0/missing` 검증을 가능한 읽기 전용 범위에서 추진. 기존 원본 소급 재작성·무단 재수집/자동 승격 금지; BED Writer B는 자연 유휴에서만 별도 판단. 예약 검증은 전체 기능 완료 후.
- **단계:** `PIT-04-05 IN_PROGRESS / PIT-04-07 IN_PROGRESS`, 전체 **27/72 DONE(37.5%), 잔여 45**. [원장 §87](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md)에 동일 증거 기록.

### W04 — 2026-11-18 공통 6파일 Controller B 실제 안전 차단 및 원장 복구 범위

<!-- W04-6FILE-B2094-STAGED-WORKFLOW-DISABLE-2096-PASS-20261118 -->

- **조건부 GO→정규 source 승인 완료:** [중앙 단일 설치 GO](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6968491524) 후 W04 [A #2091](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2091) f7 실제 설치/보호 PASS, 정규 [B manifest PR #2092](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2092) C996 [#44236047738](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44236047738) SUCCESS/main `2854a33f...`; 정확 6파일 f7→ead5, `APPROVED_B`, 승인 원문 SHA `2b887fbafd37855b2eccd21f3a6830ac032546938313b6f98e5b9e1e4b090b4a`. 중복 W01 5파일 B 금지.
- **실제 설치 실패:** [B Issue #2094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2094), 고유 1회 `BLOCKED/WORKFLOW_DISABLE_NOT_CONFIRMED` at `STAGED`, actual Controller `f7f1559...` 보존, B `protectedStateUnchanged=false`, Workflow enabled; 본 요청 재실행·강제 복구 금지. 별도 [사후 A #2096](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2096)/[Run #44236563194](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44236563194) PASS, 설치 f7/Task 보호 2/2 확인. 그러나 stage/backup/backlog/install lease 안전 정리 미실증.
- **공통 인계는 실제 공유 결함만:** [중앙 #68/6968954267](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6968954267), 기존 `tools/update.mjs::pauseIntake`의 workflow disable ACK, 원본 #2094 단계·lease/backup/backlog read-only inspect 및 정확 안전복구. W04 설치·A/원본 분류는 대행하지 않음. 복구 진단의 통과/도구 보장 전 다른 B 생성 금지.
- **다음 필수 실행:** #2094 원본 stage/backlog/install lease/Workflow 정상 복구 영수증 확인→W04 실제 Controller SHA/6파일 preimage·정규 approval/자원 보호 재확인→필요 시 새 requestId 정규 B·2/2 사후 검증→`employment-r6-collection-evidence-readonly` 고유 A/light로 National 4계열 저장 XML/run 날짜 및 27 raw 미인증 source/month 집계. PIT-04-07의 raw c3 null/0/missing 실검증 별도 독립 진행. BED B 자연 유휴, 후보 14충돌/255미입증 HOLD, DB/D1/Task/원자료 무변경.
- **단계/진행률:** `PIT-04-05 BLOCKED(공유 설치만)/PIT-04-07 IN_PROGRESS`, 전체 `27/72 DONE(37.5%), 45 잔여`; 원장 §88 기록.

### W04 — 2026-11-18 PIT-04-07 독립 BLS 확산지수 Gregorian 연도 및 값 경계 보호

<!-- W04-PIT0407-BLS-VALID-YEAR-RANGE-PR1303-20261118 -->

- **완료된 독립 작업:** 앱 [PR #1303](https://github.com/ansqhd5774-Choi/zgmini/pull/1303) 정확 2파일(`lib/market-score/employment-r4-shadow-provider.mjs`, `tests/market-score-employment-r4-shadow-collector.test.mjs`). R4 BLS 확산지수 `periodEnd`의 `Date.UTC(0..99)` 연도 1900대 보정/비정상 연도 예외 방지. 정확한 네 자리 YYYY 1900~2199·월 01~12만 허용. `DIFFUSION_INDEX_0_100`의 숫자 0과 정상 0~100 소수는 보존하며 `null`, 빈값, Boolean, 음수, 100 초과, 16진/지수/+부호·비십진 표기는 결측으로 제외. 잘못된 최신월도 PIT 최신 유효 관측으로 채택하지 않음.
- **CI/병합:** Node.js [#44237683267](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44237683267) **SUCCESS** (Build, typecheck, regressions, PC publication recovery, CF candidate read contracts); [앱 PR #1303](https://github.com/ansqhd5774-Choi/zgmini/pull/1303) main squash `7b95f8fee83b031a14bf2e199b812d403e211c19`. 신규 회귀 2건 + 이전 0·null 관련 테스트 유지. 외부 공급자 호출/PC 운영 DB·Writer·Controller·Task·D1·게시/원자료 소급 수정 **없음**. 실PC 600×51 주차 개수 확인은 보존하되 실제 모든 `c3` 유효 판정으로 승격하지 않음.
- **공유 설치 경계 그대로:** [Controller B #2094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2094) `STAGED/WORKFLOW_DISABLE_NOT_CONFIRMED`, 실제 설치 old f7, stage/backlog/lease 정리 미검증. 사후 read-only [#2096](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2096) PASS는 동일 old 보호 확인에 한정. [중앙 인계 #6968954267](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6968954267)에 공유 유지보수기 정확 조사 요청 완료, 최신 복구 완료 응답 없음. 동일 B 재실행/무단 복구 금지.
- **다음 필수 행동:** 기존 #2094 로컬 stage/backup/backlog/lease의 정확 공통 복구 인계·영수증 수신 → W04 본인 실제 설치 SHA/approved B manifest/보호 재검증·필요 시 새 고유 설치 → PIT-04-05 National 저장 XML/Run A-light, raw 27개 미인증 공급자·월별 원인 대조. 독립 PIT-04-07에는 실제 ETA539 저장 CSV 원문 `c3` null/0/missing 유효성 및 분모 확인이 남음. 예약 자연 검증은 최종 후속.
- **상태:** 27/72 DONE(37.5%), 잔여 45. PIT-04-05 공유 설치 BLOCKED, PIT-04-07 IN_PROGRESS/PC_DATA_VALIDITY_PENDING. 진행 원장 §89.

### W04 — 2026-11-18 PIT-04-07 R6 실제 수집 파서의 BLS 날짜·확산지수 경계 소스 결함 수정

<!-- W04-PIT0407-R6-BLS-YEAR-DIFFUSION-PR1305-20261118 -->

- **기존 완료 지점 재사용:** 앱 R4 PR #1299·#1303 CI/main PASS, 정규 공유 6파일 Controller B #2094 STAGED 차단과 사후 A #2096 old 버전 보호 PASS. [공통 총괄 회신 #6969176195](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6969176195): 공통 유지보수기 `tools/update.mjs` 상태 확인 최대 6회 조회의 [PR #2098](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2098) main 소스 CI PASS, **운영 유지보수기 설치와 원본 #2094 stage/lease 복구 미실행**. W04 단일 6파일 추가 B 재접수 금지.
- **이번 R6 독립 구현:** `lib/market-score/employment-r6-provider.mjs`는 BLS 월간·분기 `Date.UTC(Number(year))`로 `0099`→1999 보정·비정상 연도 예외의 가능성이 있었으며, `DIFFUSION_INDEX_0_100` 3개 계열(CES·state·metro) 입력 범위·비십진 표기를 검사하지 않았음. [PR #1305](https://github.com/ansqhd5774-Choi/zgmini/pull/1305) source+기존 회귀 테스트 **2파일**에서 1900~2199 4자리 연도·월/분기 적법성, 실제 0·100·소수 0.5 허용, null·빈값·음수·100 초과·16진/지수 표기 제외를 보장. 산업·주·도시 확산지수에만 제한 적용, 일반 급여·고용률·임금/ECI 등 다른 단위의 승인 수치 계약 불변. 신규 회귀 3건: 월·분기 invalid year→missing, 확산지수 정상/비정상 월 최신 PIT 구분, 일반 급여 그룹 숫자 보존.
- **소스 CI/병합 증거:** [Node CI #44239103881](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44239103881) completed SUCCESS: build/typecheck/regression/PC publication recovery/Cloudflare candidate read contracts 모두 PASS. 앱 PR #1305 main squash SHA `88ecff9b09d69d65470acf9916e7d0f010ae980e`; main 파서 파일 재조회 PASS. 실제 Provider 수집·PC Writer source B 설치·SQLite/D1/Task·운영 원자료·게시 변경 **0건**. 소스 CI를 운영 입력의 실증으로 승격하지 않음.
- **검증 잔여:** 기존 A `employment-r6-collection-evidence-readonly`의 600/600 완전주×51지역·strict52 545주는 **행/연속성/일부 zero prior window 집계**이며 각 ETA539 CSV 원본의 `c3` null/0/missing·분모 값 완전성 검증은 아님. PIT-04-07 `IN_PROGRESS / PC_DATA_VALIDITY_PENDING`. PIT-04-05 raw 미인증 27·후보 충돌 14/메타 부족 255 자동 승격 금지. 원본 B #2094 stage/backlog/install lease의 정규 읽기 전용 실증·복구 영수증을 먼저 수신하여 공유 Controller 적용을 재판정한 뒤, W04가 직접 National A/light와 미인증 원인 분류 수행.
- **전체 단계:** 27/72 DONE(37.5%), 잔여 45; 예약 자연 검증은 전체 기능 완료 뒤 별도 후속.

### W04 — 2026-11-18 PIT-04-07 최신 ETA539 무효 개정 재사용 차단 (source-only DONE)

<!-- W04-PLAN-PIT0407-ETA539-LATEST-REVISION-PR1306-20261118 -->

- **새 소스 완료:** [앱 PR #1306](https://github.com/ansqhd5774-Choi/zgmini/pull/1306) 정확 2파일. 기존 ETA539 c3의 blank/음수/소수/비십진 검증만으로는 같은 지역·주차의 **무효 최신 개정**이 먼저 버려지고 이전 유효값을 사용해 거짓 51지역 완전주로 계산되는 결함이 남아 있었음. 최신 보고 `rptdate` 선정 후 `c3` 유효성 검사로 수정. 정상 최신 0, 이전 무효 후 정상 수정값 보존; 동일 보고일 무효 행·최신 무효 7유형 회귀.
- **CI/main 근거:** [Node CI #44240475669](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44240475669) SUCCESS, source main squash merge `da642cc18457a767b71286a646402f99274f2ef4`. 앱 파서만 수정, 운영 PC Writer/DB/D1/수집/Controller/Task 무변경.
- **공통 최신 상태:** 원본 공유 Controller [#2094](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2094) STAGED BLOCKED. 공통 source-only [#2098](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2098) + STAGED artifact read-only [#2102](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2102) main 병합 및 CI PASS. 그러나 독립 운영 maintainer 설치, #2094 원장/stage/backup/backlog/lease 실측·복구 완료 증거 부재 ([중앙 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6969384221)). 기존 #2094 재접수나 stage 삭제/Workflow 수동 조작 금지.
- **다음 필수:** 공통 복구의 정확 운영 영수증 확인 후에만 W04가 직접 공유 6파일 Controller B 고유 재판정/승인 범위 CAS/설치 실측. 이후 National 저장 XML/Run 주차 A/light, 미인증 27개 원인별 원문·해시 분류. 독립 PIT-04-07의 실제 저장 `c3` 0/null/missing 및 분모 유효성 read-only 검증은 별도, 아직 완료 주장 금지. 후보 14상충/255 미입증 자동 승격 보류, 예약 자연 검증은 기능 완료 뒤.
- **정량 단계:** 시작/종료 `27/72 DONE (37.5%)`, 잔여 45. PIT-04-05 `HOLD_INCOMPLETE_SOURCE_LINEAGE` / PIT-04-07 `IN_PROGRESS / PC_DATA_VALIDITY_PENDING`. [진행 원장 §91](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).

### W04 — 2026-11-18 PIT-04-07 51지역·이전 4주 분모의 NULL/무효 입력 회귀 보강

<!-- W04-PLAN-PIT0407-NULL-PRIOR-WINDOW-PR2110-20261118 -->

- **완료된 W04 독립 소스:** [제어 PR #2110](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/2110) read-only `controller/employment-r6-collection-evidence-readonly.mjs` + test 정확 2파일. 기존 SQLite `SUM(c.value)`는 `NULL`을 무시하여 51개 행만 존재하면 일부 값의 NULL/음수/소수/문자열과 4주 분모 결손을 거짓 정상으로 볼 수 있었음. 주차별 `invalid_value_count`, 이전창 `invalid_prior_region_count`, 10년 원자료 오류 분류를 추가. 단일 정상 0을 거짓 결측으로 취급하지 않음.
- **소스/CI 증거:** [W04 CI #44241685260](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44241685260) + [C996 #44241685472](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44241685472) 2/2 SUCCESS; source main squash `928def9d4c666cc91cb3ff6757568e0b5b338fe0`. 운영 PC/Task/DB/D1/Writer/Provider/Workflow/실수집 변경 0.
- **설치 승인 분리:** #2094 기존 정확 6파일 B `STAGED/BLOCKED`, 설치 `f7f1559...` 유지. 공통 #2098/#2102 main source-only 완료이나 독립 maintainer 설치·원본 stage/backlog/lease 복구 증거 없음. 기존 승인 target `ead5d2d...`는 신규 PR #2110 이전 source이므로 변경된 read-only 진단을 자동 설치됐다고 주장하거나 고정 manifest 변경 불가. 복구 증거 수신 후 W04가 정확 target CAS/새 승인 범위·중복 W01 5파일 방지에 대한 재판정 책임.
- **필수 후속:** W04 소관 실제 원자료 ETA539 c3 0/null/missing 및 이전 4주 분모 유효성, National 저장 XML↔Run 주차 대조, 미인증 raw 27개 원인/후보 14충돌·255 미입증 HOLD 판정. 실제 A/light 결과 없이 PIT-04-07 완료로 승격하지 않음. 예약 자연 검증은 기능 완료 이후에만 실행.
- **단계:** 시작/종료 27/72 DONE(37.5%), 잔여 45. PIT-04-07 `IN_PROGRESS / PC_DATA_VALIDITY_PENDING`. [진행 원장 §92](EMPLOYMENT_R6_PROGRESS_LOG_20261116.md).


### W04 — 2026-11-18 PIT-05-02 복구 불가 구간 PARTIAL 판정 계약 확정

<!-- W04-PIT0502-PARTIAL-FAIL-CLOSED-20261118 -->

- **PIT-05-02 DONE (계약 판정만):** 10년 입력 주차 개수 충족과 실제 당시 vintage/원본값 적격성을 구분한다. 참조기간의 특정 관측주에 (1) 공식 발표/관측일·해당 당시 판본, (2) raw body SHA 및 수집 run/first_seen/recorded_at 계보, (3) 유효 숫자·분모 및 해당 지역/계열 완전성, (4) 상충 개정 해소 증거 중 필요한 항목이 부족하면 해당 구간은 `PARTIAL/UNVERIFIED`로 유지하고 `READY`, `TRUE_PIT`, 자동 복구/게시로 승격하지 않는다. 현재 판본의 과거 데이터는 `HISTORICAL_CURRENT_OR_REVISED`로만 취급한다.
- **실제 근거와 범위:** 운영 A #2088 raw 86 중 미인증 27, Current missing 10,889/unverified 857, History missing 8,873/unverified 915, 후보 충돌 14·메타 미입증 255. 운영 A #2117의 ETA539 600/600주 및 National 2026-10-17 stale은 개수/최신성 자료일 뿐 각 주 `c3`·4주 분모/원문 SHA·과거 vintage 인증이 아니다. 따라서 해당 미입증 구간은 명시적으로 PARTIAL/HOLD; **개별 10년 결손 날짜·복구 불가능 판본의 확정 목록을 새로 산출한 것은 아니다.**
- **판정 게이트:** 재조회로 채울 수 없는 역사 당시 판본/발표 증거는 `UNRECOVERABLE_AS_TRUE_PIT`로 별도 표기할 수 있으나 단순 현재 자료 부족만으로 영구 복구 불가능이라고 단정하지 않는다. 이후 원문과 날짜가 입증되면 해당 키만 재평가하고 기존 기록을 덮어쓰지 않는다. 자동 복구 GO/점수 READY 0.
- **공통 차단:** Controller B #2094의 STAGED 잔여와 운영 maintainer V2 미설치 여부는 원본 복구 영수증으로 재확인해야 한다. 이 계약 완료는 운영 설치/데이터 복구 완료가 아니다. W04는 PIT-05-03 후보 상충 개정·미입증 자료 제외를 다음 독립 단계로 수행한다.
- **진행률:** 28/72 → **29/72 DONE(40.3%)**, 잔여 43. PIT-04-05 `HOLD_INCOMPLETE_SOURCE_LINEAGE`, PIT-04-07 `PC_DATA_VALIDITY_PENDING`, `promotionApproved=false` 유지. 운영 PC/SQLite/D1/수집/Task/Workflow 변경 0.
