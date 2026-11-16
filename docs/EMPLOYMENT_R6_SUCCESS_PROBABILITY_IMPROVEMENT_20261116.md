# ZGMINI W04 고용 R6 — 성공 가능성 개선을 위한 소스·운영·게시 분리 실행계획

<!-- W04_20261116_PR1083_MERGE_FALSE_BLOCKER_CORRECTION -->
## 2026-11-16 W04 성공률 보완 재조사 — **PR #1083 직접 병합 장애 오판 정정**

**직접 3점 대조 실증:** PR #1083 HEAD `21b3930c091b37edbb152bb73920bdf46e1a9ebc`, PR base snapshot `643b7c7c4372ffad552443fc312c6cb1b944e2fc`, 최신 main `7bf75fd77123e012bffd3538d472ac5910e64dd3`. [PR #1083 GitHub REST metadata](https://api.github.com/repos/ansqhd5774-Choi/zgmini/pulls/1083)는 `mergeable=true`, `mergeable_state=clean`, `rebaseable=true`로 직접 조회됐다. 별도 `get_pr_info`가 `mergeable=false`를 반환하여 양 경로 간 메타가 불일치한다. **PR 변경파일 9개 전체를 base→main blob으로 실측한 결과 기존 4파일의 blob은 동일, PR이 추가하는 5파일은 base/main 양쪽에 모두 없음**. 또한 `main`이 PR base 이후 57 commits 전진한 변경 파일 99개에 #1083 변경 경로 9개 중 **겹침 0개**. 따라서 **실제 해당 9파일 병합 충돌이라고 단정했던 이전 장애 보고는 철회**한다. GitHub 리뷰/승인·보호 조건 및 실제 작성 소스 변경은 별개이고, PR이 Draft이므로 무승인 main 병합 금지.

| 구분 | 검증한 사실 | 실질적인 보완 |
|---|---|---|
| PR conflict | main vs PR base 9/9 해당 경로 불변, REST `clean` | 충돌 진단 무한 반복 중단. 기존 검증된 3 source+1 수정test+5 신규tests를 최소 영향만 통합. 설치 전 exact source commit 확인 |
| Source CI | PR #1083 CI 완료/성공이지만 `tests/w04-eta539-official-51state-once.test.mjs`는 `GITHUB_HEAD_REF=support/w04-eta539-live-51state-prework-20261115`에서만 실행되도록 조건화 | PR #1083의 CI 성공을 **실제 DOL GET 안정성 검증으로 오인 금지**. 이미 확인된 실PC 51×600주 증거 재사용 |
| 공식 DOL 공급자 | 2026-11-16 `https://oui.doleta.gov/unemploy/claims.asp` 웹 GET에서 `Unable to connect / SQLSTATE=HY000 / Informix Invalid ASF assoc_id` 실제 확인(웹 조회). **실PC 11/15 POST와 동일 원인 확정은 아님** | #1083 National 200 HTML/nonXML/부분 XML 보호 + 마지막 유효 snapshot 보존. 새 safe HTTP/format/hash 메타는 실제 운영 코드 적용 후 수집 원장에서만 회수. 무단 6회 재시도 금지 |
| PR 미완성 가드 | parser는 `<week>` fragment 수용/4계열 시계열 전체 존재 판단, 4계열별 최신성 분리 안 됨, Collector·Scheduler Initial-only, 동시실패 상위 원인 은닉 | **공식 문서 루트, 날짜, count/IUR 숫자, 상충중복, 계열별 정상 발표 시차**를 필요한 최소 provider/collector/scheduler 회귀에 추가. 과도한 인위적 date gate 금지 |
| 운영 PC | #1551 설정 2개 ENABLED/approved checkout 일치이지만 실행 중 Core source 미증명; #1403 51지역×600주 raw 완료 | 고용 파일 정확 범위의 현재 preimage/source SHA와 Core 실행 계보만 A read-only 증거 1회 회수. 신규 600주 backfill 금지 |
| PIT/게시 | 종합 score 29/29 READY는 개별지표 1Y 공개의 무조건적인 선행조건 아님. 기존 public 8일 TTL·same body UNCHANGED 보호 있음 | **29개 개별지표 부분 상태 게시와 종합점수 최종 승격을 분리**, 실데이터 원본 시각·D1 hash·Production API/UI 재조회. 무근거 time bump 금지 |
| 보조 FRED | 기존 FRED transport/키/쿼터 있지만 4 weekly IDs는 승인된 profiles 외 | DOL 장기 장애 시 사용자의 공급자/PIT/권리 명시 승인 뒤만 검토 |

**성공률 수치의 근거:** 9/9 blob 일치와 REST clean은 **이 변경 집합의 병합 충돌 위험이 낮다는 검증 증거**일 뿐 전체 설치·수집·계산·공개 성공확률이 아님. 이전 **39.12%**는 단계마다 미측정 가정확률(.95×.85×.60×.85×.95)로 만든 설명용 민감도다. **이번 조사로 실측 예상 성공률이 39%에서 다른 숫자로 상승했다고 주장하지 않는다.** 공급자 정상 응답률/운영 설치 success 표본 부족으로 종단 성공확률 측정 불가능.

**NEXT 1**: W04 원담당의 최신 main 기준 기존 #1083 필요 소스/관련 tests **수정범위만 반영**, Collector↔Scheduler 계열별 freshness·root/현장 실패 메타·dual-failure 최소 회귀/CI. 중앙 PC Owner는 독립 병렬로 정확 고용 파일 preimage·현재 sourceSHA/활성 Task 계보·기존 National 실패 원장 **안전한 메타만 읽기**. source/CI 완료≠실PC B 설치·D1게시 완료. **이번 작업은 계획 문서 변경만 했고 기능 코드/운영 자원 변경 0**.

---



<!-- W04_20261116_17CASE_RELIABILITY_MERGE_TTL_FIXTURE -->
### 2026-11-16 W04 업데이트 — 격리 17시나리오, 병합·TTL·테스트 호환성

- 최신 기능 main: 24b2f93ed391a7a1cd9af4f5c00d835d8c5f0213. 통합 PR #1083 HEAD 21b3930c091b37edbb152bb73920bdf46e1a9ebc: **Draft/9파일/mergeable=false**. 전용 PR #933도 **233파일/mergeable=false**. 기존 #1083 CI 성공과 현재 병합 가능성은 별개다. 현재 main 대비 충돌 파일 좁히기 후 필요한 소스만 선별 통합.
- 2026-11-16 Node 22 격리: 이전 GitHub 원본 파서·Collector 분기의 검증된 전사본과 현재 Scheduler/D1 판정식을 **17개 새 조건으로 재실행하여 기존 동작 17/17 재현**. 원본 저장소 전체 실행/실Windows 실행·DOL 호출 아님. 코드·결과 파일: /mnt/data/zgmini_w04_recovery_targeted_sim_20261116.mjs , /mnt/data/zgmini_w04_recovery_targeted_results_20261116.json. 17/17은 안전성 PASS가 아니고 예상 문제 동작 재현도 포함.
- 현 PR #1083의 기존 루트 XML 미검증, 각 National 계열 stale 판단 누락, 미래·음수·중복 수치 허용, National+ETA 모두 실패시 NO_OBSERVATIONS 원인 가림, Scheduler Initial-only RELEASE_ALREADY_STORED 재현. 이 합성 분기가 11월 15일 실PC 0/4을 발생시켰다는 증거는 아니다.
- **추가 문제 ① D1 공개 만료 연쇄:** one-year-stage publisher는 동일 body hash면 UNCHANGED이므로 stored_at이 갱신되지 않음. public-display reader는 저장시각이 8일을 넘으면 STORED_PUBLICATION_EXPIRED를 반환. 9일 지나 동일 본문 재게시 모형은 UNCHANGED + EXPIRED, 검증된 신규 sourceStoredAt/body는 VERIFIED+READY. 승인된 TTL·stale 계약을 바꾸거나 원시각을 인위적으로 갱신하지 말고 진짜 갱신 데이터 수집·게시를 완성할 것.
- **추가 문제 ② 테스트 입력 전환:** #1083 기존 test는 공식 National root 없는 week fragment를 유효하게 쓰고 retrieved 2026-11-15보다 미래인 2026-12-31 관측을 정상 파싱하도록 단언한다. 엄격한 root/future guard를 도입할 때 공식 XML fixture 및 기대값을 계약에 맞게 조정하고 정상 실측·발표 1주 lag 테스트는 보존해야 한다.
- **예상 성공률**(실측 아님, 단계 독립 1회 성공확률 가정): 보수 7.74%, 기준 39.12%(source .95×B .85×DOL .60×PIT .85×D1 .95), 낙관 53.26%. 현재 PR 자체는 mergeable=false이므로 **현재 상태 무수정 직접 병합은 차단**. 숫자는 충돌 해결과 승인 적용 뒤의 가상 성공률로만 사용. 운영 성공확률에 대한 통계적 추정 자료 없음.
- **NEXT:** W04 원담당이 현재 main 대비 #1083 Provider/Collector 및 Scheduler freshness 최소 통합·영향 회귀. 중앙 운영 단일 Owner는 승인 고용 파일 scope SHA/runtime linked와 이전 National POST 비민감 메타를 1회 읽기 전용 회수. 51지역×600주 재수집과 기존 CI 단순 반복 금지. 조사 기능 진행률 기존 중앙 기준 75%→75%, 운영 수정 0.
---

<!-- W04_R6_20261116_PINNED_PUBLIC_IMPLEMENTATION_TO_RUNTIME_ACTION_PLAN -->
## 2026-11-16 확정 실행안 — 공개 코드 5곳 직접 대조, LIVE 승인 Source와 코드 결함 분리

**현재 보전:** 기능 `zgmini/main@27c76e799f07d54b1a9cd2c41243fb12360c59a0`; 제어 `zgmini-pc-control/main@e79c2cea6d4a1b32e66cc914fd1b6a06c8211d16`. 전담 PR #933 **233파일 / mergeable=false / main 대비 behind 146, ahead 87**(문서 변경 포함). 통합 [PR #1083](https://github.com/ansqhd5774-Choi/zgmini/pull/1083) **9파일 / mergeable=true / Draft**, HEAD `21b3930c091b37edbb152bb73920bdf46e1a9ebc`, 과거 CI 성공; 실제 운영 미설치. **전담 PR 전체 병합·main reset/rebase 금지.**

**공개 소스 파일 실제 확인 및 코드에 반영할 최소 원칙**
1. [JerBouma/FinanceToolkit DOL](https://github.com/JerBouma/FinanceToolkit/blob/245c303efcca5c317c8dcc2fff00d393e1c9ba98/financetoolkit/economics/sources/dol_model.py#L51-L101) 같은 `report.asp` 양식 `level=us,final_yr,strtdate,enddate,filetype=xml` 요청. `Unable to connect` HTML을 일시적 공급자 DB 오류로 판정, **마지막 유효 캐시 보존**. 저자 코드는 6회/3초 제한 재시도를 사용하지만 ZGMINI의 승인된 공급자 호출 계약 밖이므로 **횟수·주기 복제 금지**. 저자 `final_yr=currentYear+1`과 ZGMINI currentYear 차이는 이미 성공한 ZGMINI 11/09 원장 있으므로 **원인 증거 없음, 임의 변경 금지**.
2. [zsh-a/bcr TS](https://github.com/zsh-a/bcr/blob/1cf643aa2ec4fce4d3ddee843bce821669197c1f/packages/market-data/src/cycle/fred.ts#L158-L177): XML `r539cyNational` 문서 식별, `weekEnded` 토요일·실제값·미래 빈 관측 검증; [bounded response 15sec/3MB](https://github.com/zsh-a/bcr/blob/1cf643aa2ec4fce4d3ddee843bce821669197c1f/packages/market-data/src/cycle/fred.ts#L279-L292), 출처 FRED→DOL→mirror 순환도 구현. ZGMINI에는 **정상 XML/숫자·날짜/응답 크기 검증만 필요 범위 검토**, 무승인 공급자/미러 failover·timeout 교체 금지.
3. [valorumdata/cmdc-tools Python](https://github.com/valorumdata/cmdc-tools/blob/d9f964b580a6efa2446a45b30e5134ef1ae74f74/src/cmdc_tools/datasets/dol/unemploymentclaims.py#L45-L64): `requests.Session.post`, `ET.fromstring`, `rundate` 기록. `rundate`는 보고서 생성 일자이지 해당 수치 `availableAt` 자체가 아님. State-only 처리 경로는 전국 4계열 대체 아님.
4. [ciciiiyaoyf/la_housing_database](https://github.com/ciciiiyaoyf/la_housing_database/blob/2ec0329e64cbb5969a1f17f8ce085b48374b83a2/src/ingestion/macro_claims.py#L20-L88) `ar539.csv` 공식 State bulk CSV·`Last-Modified`·필수 스키마/날짜 검증. 이미 수집 완료된 51지역×600주에 재백필 요구하지 않음; **국가 SA/SA4WK/IUR 네 계열 대체 불가**.
5. [mortada/fredapi](https://github.com/mortada/fredapi/blob/c6c7cb3b95df12dbdc8aa11447eebc94305cebbe/fredapi/fred.py#L180-L275): `get_series_first_release` vs `get_series_as_of_date` vs `get_series_all_releases` 구별. 조건부 사용자 승인시 기존 공통 FRED transport/키/쿼터를 재사용, 주간 `ICSA/IC4WSA/CCSA/IURSA` 고정 프로필·ETA via FRED provenance·ALFRED vintage/PIT 정의 승인, 원본 DOL XML로 위장 금지.

**확정한 FIRST FAIL / 확인되지 않은 것**
- Windows [#1403](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1403#issuecomment-6887419784) **51지역×600주 current raw PASS**, National 11/09 ONE_YEAR 4/4 성공 → BACKFILL 0/4 → 11/15 RELEASE 0/4. 최초 실패 경계는 **전국 POST 응답 → 유효 4계열 생성**. 당시 status/body/content-type/first parse invalid **없음**; 공급자 비XML(DB 장애) vs XML 구조 vs network는 미확정.
- Windows [#1551](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1551#issuecomment-6908880978) R6 두 설정 `ENABLED/ENABLED`, 고정 checkout/승인 config/checkpoint SHA `f59e999082fd3b21893f0f74fc1913441ec80bba` 일치. 하지만 `runtimeSourceVerified=false`/`coreTaskSourceLinked=false`는 **historical checkout read-only 증거 등급**(실제 Runner/Core 중단 증거 아님). 기존 R6 대상 19개 파일 `NOT_OBSERVED`는 **SEC 등 다른 승인 scope만 조회해 놓은 범위 제외**; 미설치 증거가 아님. 고용 스코프 승인 manifest를 사용한 현재 설치파일 exact sha 조회가 필요.
- 11/08 후보 stage #782 PIT current key 7695 중 2880 no-history, candidate source overlap conflicting 2 (당시). 최신 29개 계산·Core data와 별도 증거. 원래 R6 완료는 정직한 29개 raw/score/chart 및 1Y 공개이며 **종합 precompute `readyGate` 29/29 READY를 전역 완료 조건으로 두지 않음**.
- 현재 web `https://zgmini.kr/economic-indicators/employment/` SSR 29행 기본 '—'/로딩만 확인. Production `/api/employment-r6/observations` 외부 조회는 이 도구에서 접근 불가, 직접 HTTP/D1 값 확인 없으므로 29개 전부 결손 단정 금지. 현재 main API route 소스 존재≠Production 실제 배포/GET 200. 공식 DOL `claims.asp` 웹 form은 현재 XML 제공 선택 UI를 노출하나 National POST 무결성 증거가 아님.

**실행 우선순위 및 정확한 완료 조건**
1. **W04 독립 코드 작업(필수 하나):** 최신 main을 보존한 독립 전용 worktree/브랜치에서 #1083의 `employment-r4-shadow-provider.mjs`, `employment-r6-provider.mjs`, `employment-r6-collector.mjs` 및 영향 최소 tests를 선별 통합. 이어 `employment-r6-scheduler.mjs`의 Initial-only `RELEASE_ALREADY_STORED` 판정과 Collector Initial-only STALE를 **4계열 각 해당 주간/공식 lag 기준**으로 같은 helper 계약에서 정정, 동시 National+ETA 오류 `NO_OBSERVATIONS` 우선순위 개선. 공식 root/실측 주간/비XML/partial/음수·미래 실값/중복 충돌 차단을 공식 fixture로 검사. **Initial 주차 11/07 vs Continued/IUR 10/31 정상 1주 시차 유지**, 2026년 실제 parser 형식 실증 없이 연도·산식/가중치·TTL 변경 금지. 기존 CI 성공 증거 재사용하되 **새 변경 영향 회귀만 재검증**.
2. **중앙 승인 단일 Owner와 독립 병렬:** 기존 `writer-install-preimage-readonly`에 *정확 고용 R6 19파일만* 고정 승인 scope/manifest를 붙여 current SHA + source/config/checkpoint + 실제 Task 계보 **각각 증거 등급을 구분**해 1회 회수. 별도 11/09 성공 vs 11/15 실패 National 저장 snapshot의 `status/content-type/format/bodySha/parsed4`만 비민감 read-only 1회; 실패 raw 미저장이면 `NOT_STORED` 처리하고 과거 회수 반복 중단.
3. **승인된 실제 B 설치:** 변경 영향 정확 file 단위 preimage/afterSha + 보호 manifest + approved source의 설치 및 안전한 operation 1회. 공유 #1501 Controller/lease는 실제 충돌한 동일 자원에만 직렬화. 새 예약/CMD/리모트 데스크톱 플러그인·미승인 SQL/D1·새 API 계정·백업 삭제 금지.
4. **실제 원자료→게시:** 승인된 기존 Core 발표 주기의 valid National4 수집 **또는** 오류 `PARTIAL`/기존 good raw 보존, 로컬 SQLite 29개 관측·PIT as-of 및 last missing/zero base 구분, 로컬 1Y display 29행·실제 status 계산/저장, D1 `detail:employment-r6:one-year:v1` body/hash/storedAt/sourceStoredAt exact readback, Production GET/API/UI 29행 동치 확인. 공개 GET 공급자 호출 금지, 오래된 결과 재타임스탬프·원자료 600주 재백필 금지.
5. **공급자 장애 지속 시만:** DOL 공식 정상화 기다리면서 승인된 Scheduler/circuit 유지하고, 별도 명시 공급자 변경 승인 후 기존 FRED 공통 transport를 제한적 보조 경로로 검토. 현재 FRED profiles에 4개 weekly ID는 없음.

**진행률:** 조사 범위 100%(GitHub/공식/공개 소스의 현재 확인 가능 영역), 실제 기능 기존 중앙 기준 약 75%→75%(객관적인 종단 완료율 아님). 지난 39.12%/52.16%는 실제 통계가 없는 임의 입력 성공확률 곱; 확률 근거로 사용하지 않음. **이번 변경은 문서 계획 1파일, 실제 기능 코드·운영/PC/DB/D1/웹 0건**.

---


<!-- W04_20261116_VERIFIED_FULL_ROOT_CAUSE_CORRECTION -->
## 2026-11-16 W04 — 실Windows 최신 영수증 포함 전수 원인 정정

> **원인 판정은 출처·증거 시각에 한정한다.** 이전 39.12%/52.16%는 자의적 단계 확률을 곱한 **가정값**으로 실제 예측 성공률로 사용할 수 없다. W04 75% 역시 이전 중앙 단계기준 보고이지 실운영 완성 비율 실측값이 아니다.

### 목표를 바로잡음
- [원래 기능 완료 계약](docs/EMPLOYMENT_R6_DELIVERY_PLAN.md)은 BLS24+DOL5 **29개 지표의 원값/관측일/출처/상태·1년 차트와 승인 점수의 공개**이다. 유효값 부재 시 `PARTIAL/STALE/UNAVAILABLE` 허용, 29/29 READY 강제 금지. `precomputeEmploymentR6ReadModel.readyGate`의 29/29+7 family+4 projections all READY는 **별도 종합점수 후보 승격 조건**. 이를 개별 공개의 전역 blocker로 적용하지 말 것.
- 현재 기능 `main@27c76e799f07d54b1a9cd2c41243fb12360c59a0`에는 `app/api/employment-r6/observations/route.ts` 및 D1 GET reader **소스가 존재**. Production 배포 SHA/실제 D1 body·stored_at·API JSON 미검증. 공개 SSR 29행 `—`는 브라우저 hydration/진짜 D1 결손을 입증하지 못한다.

### 운영 원본 — 마지막 실제 PASS와 FIRST FAIL 구별
1. [#1403/43663990960](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1403#issuecomment-6887419784) 2026-11-15 READ_ONLY `PASS`, PC SQLite 실제 open: DOL 지역 51개 지역×600주, 600 complete weeks, 577 weeks required, firstFailureWeek=null. **이것은 10년 current raw 수량 증거**이지 historical PIT/29점수 READY 아님. 전국 DOL `ONE_YEAR SUCCESS (2026-11-09 09:50Z)` 4/4, 마지막 IC 2026-10-10, 같은 날 BACKFILL 0/4, `RELEASE 2026-11-15 01:30Z PARTIAL` 0/4·총 3060 rows=지역51×60. 당시 National POST HTTP/content-type/body·파서 첫 실패 미관측. 현재 `DOL_RELEASE_OBSERVATION_STALE`은 result label이지 원인 확정값 아님.
2. [#782/42416928270](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/782#issuecomment-6713366675) 2026-11-08 연구후보 read-only stage: raw sourceFeatures 29/29, recentlyObserved 23, chart READY 21, scoredFeatures **2/29**, Core current keys 7695 중 history 없는 **2880**; 후보와 Core 중복값 개정 상충 2개 => 후보 자동 승격 금지. **이 자료는 11/08 스냅샷이며 현재 모든 29개 데이터 부족을 증명하지 않음**; #1403의 600주 보완이 모든 다른 PIT gap을 자동 해결하지 않음.
3. [#1402/43660583265](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1402#issuecomment-6886941535)와 더 최신 [#1551/43815040281](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1551#issuecomment-6908880978)의 실제 운영 `writer-install-preimage-readonly`: `employmentR6AutoCollection=ENABLED`, `employmentR6OneYearAutoPublication=ENABLED`, `sourceHead==approvedConfigSource==checkpointSource`(고정 checkout PASS). #1551의 `sourceHead=f59e999082fd3b21893f0f74fc1913441ec80bba`; 이전 #1402 `05d7ae49...`이므로 **운영 approved source는 이후 변경됨**. **`runtimeSourceVerified=false`, `coreTaskSourceLinked=false`는 실제 Task 고장 확인이 아님**: `controller/writer-install-preimage-readonly.mjs`에서 정적 Task `trace.sourceResolved` 실패 후 **HISTORICAL_CHECKOUT** 선택이면 `coreTaskSourceLinked=false`이고 `FIXED_CHECKOUT_NOT_LIVE_CORE_PROCESS` 증거 등급을 의도적으로 유지. 즉 실행 출처 미확정. 두 receipt의 `employmentR6` **19개 `NOT_OBSERVED`는 미설치 확정이 아닌, 다른 승인 manifest의 `scopedPreimage`만 조회한 범위 제한**이다. 기존 운영 PC 고용 19개 파일의 current SHA는 미실측.
4. Writer B [#1040](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1040) Provider 1파일 과거 `WRITER_B_INSTALLED_VERIFIED` vs [#1063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1063) Collector 1파일 `WRITER_B_RECOVERY_REQUIRED/SOURCE_PAIR_STOP`. #1040 설치 성공을 전체 19파일·고용 opt-in 실제 실행 검증으로 오인 금지. 2026-11-16 공유 Controller [#1501](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1501) `UNKNOWN/FIRST_FAIL=RECONNECTED` 별도 경합 가능, 그러나 [#1551] A급 실제 PASS로 전체 A 경로 중단 아님.

### 소스 고정 확인 및 본질적 후행 위험
- source: 최신 `zgmini/main@27c76e79...`; `codex/employment-1y-reader-r1@f3c4c62d...`, GitHub **behind 146/ahead 86, status diverged**, Draft PR #933 **233 changed files, mergeable=false**. 직접 전부 병합 금지, 최신 main에 필요한 R6 변경만 통합. 단일 통합 [#1083](https://github.com/ansqhd5774-Choi/zgmini/pull/1083) 9파일/HEAD `21b3930c...`, **behind 53/ahead 17, mergeable=true**, CI #43677601781 SUCCESS, Draft/운영 미반영.
- 현재 main Provider는 HTTP200 비XML/0 National observations도 raw snapshot 저장 경로로 넘길 수 있음. Store는 content-hash `INSERT OR IGNORE`로 직전 good snapshot을 직접 overwrite 하지는 않음. `#1083` 후보는 National 4/4 validation/fail-closed/ETA539 독립 정상 유지·safe evidence, HTTP503/transport fail 보완 완료(소스 CI). **DOL 공식 서버 자체 정상화를 보장하지 않음**.
- 현재 main Collector `staleDolRelease`는 initial-claims 하나만 점검, National 0/4 실제 실패를 최상위 `DOL_RELEASE_OBSERVATION_STALE`로 둔갑. Scheduler `RELEASE_ALREADY_STORED`도 initial-claims 한 개만 확인해 다른 3계열 stale 때 미래 release를 suppress할 수 있음. #1083에서도 동시 National+ETA 0row이면 `NO_OBSERVATIONS`이 안전 detailed code를 가리는 우선순위 위험. root/미래값/negative/상충 중복 guard는 **코드 잠재 결함**, 운영 11/15 직접 원인으로 단정 금지. 정확 공식 XML + 정상 1주 reporting lag 회귀 보존.
- 종합 `STATE_CLAIMS_BREADTH`: `employment-r6-feature-engine.mjs::stateClaimsBreadth`는 지역 51×연속주 + 52주 이전 4주 비교 + `pa!==0`; `observationHistory`의 as-of/retrievedAt 제한과 분리. `#1403` current raw count PASS로 최종 점수 READY 입증 불가. BED BACKFILL 1계열 `BDS0000000000000000110008RQ5` missing(11/09)이지만 BED RELEASE SUCCESS이며 R6 전역 blocker로 단정 금지.
- PC auto 수집/게시도 파일·runtime source exact approval, dirty diff, enabled flag 모두 요구함(`collect-local.mjs`, `run-local.mjs`). opt-in 활성은 **실제 런타임 6그룹 실행/게시 증거가 아님**. D1 Reader는 8일 publishedAt TTL을 적용해 오래된 결과를 거부, 이전 발표 결과를 다시 timestamp 조작해 갱신하는 해결책은 불가.

### 개선 순서 — 실제 한 번만
- **W04 원담당 개발(다른 자원과 병렬)**: 최신 main의 고용 3 소스·Scheduler와 #1083의 이미 성공한 변경만 최소 선별 통합, **National 4/4 fail-closed·XML 정상 구조·per-series freshness의 Collector↔Scheduler 일치·dual failure 코드 우선순위** 관련 회귀 집중 실행. 정상 주간 실업수당 공식 series lag 보존, #1083 원본 CI 반복/원자료 600주 재백필 금지.
- **중앙 단일 Owner**: 기존 승인 read-only A 방식으로 **정확 고용 R6 대상 파일만** `scopedPreimage` manifest에 담아 실제 source SHA와 Core Task static/runtime linkage를 구별 확인. 그리고 이미 저장된 ONE_YEAR 성공과 11/15 RELEASE 실패 National raw의 `httpStatus/contentType/format/bodySHA/parsedNational4` 최소 메타만 회수. 과거 실패 snapshot 미저장이면 `NOT_STORED`로 종결 후 신규 승인 Collector의 safe evidence로 최초 실패 분류. 작업 중 활성 Core/Controller lease 무단 손대지 않음.
- **Writer B 승인 적용 후 원담당**: 실제 설치 source SHA, 6group official release run + 저장 변화량, 29개 실제 data status/PIT 누락 요약, Core-only 승인 STAGE, 검증된 로컬 29개 public display 결과, D1 body/hash/stored_at readback, Cloudflare exact deployed SHA, Production API/UI 일치. **29/29 READY는 필수 조건이 아니며 결측은 정직하게 게시**.
- DOL HTTP200 오류가 지속되면 기존 정상 원본/score 보존, `STALE/PARTIAL` 공개. FRED/ALFRED 보조 `ICSA,IC4WSA,CCSA,IURSA`는 기존 key/쿼터 전송기 재사용 가능하지만 **승인된 주간 fixed profile/PIT/출처 계약 추가 전 자동 전환 금지**.

**종료 상태:** 원인 감사/문서 갱신 완료; W04 기능 실제 진행 상태·%는 마지막 중앙 단계기준 **75% 유지**로만 보고, 실측 종단 완료율 아님. 새 운영 호출·Runner/DB/D1·배포·승인 source 수정 0. LAST PASS: #1403 600×51, #1551 opt-in enabled + checkout consistent, #1083 CI. FIRST FAIL: 실제 11/15 National POST 최초 오류 분류, 고용 Writer current fileSHA/runtime checkout 및 최신 API/D1 readback 미관측.

---


<!-- W04_20261116_SUCCESS_IMPROVEMENT_SYNTHETIC_PIT_SCHEDULER_RECEIPT -->
## 추가 오프라인 직접 실행 증거 — 재수집보다 PIT·Scheduler·게시 병목 구분이 우선

2026-11-16 격리 Node.js 22.16.0에서 **원본 기능 main `employment-r6-feature-engine.mjs::stateClaimsBreadth`, `observation-reader.mjs::selectAsOfRevisions`의 PIT 자격조건, `scheduler.mjs::releasePlanForGroup`의 최신성 분기와 공개 API 8일 TTL**을 해당 GitHub 소스에서 전사한 독립 합성 모형으로 실행. 실제 저장소 전체 모듈 직접 실행/PC 실수집·DB는 아니며, 공적 공급자 GET/POST 요청 0.

| 합성 경계 조건 | 격리 검증 결과 | 실제 필수 조치 |
|---|---|---|
| `STATE_INITIAL_CLAIMS` 51×600주 / **30,600행** 전부 정상 | 55주 선행구간 이후 **545개 주간 파생값**, 약 **1.33초** (격리 컨테이너·단일 실행) | 성능 최적화 우선 아님. 실PC SQLite/Reader 선택이 산식 전단에서 무엇을 잃는지 확인 |
| 동일 30,600행, `scoreAsOf`가 해당 `retrievedAt` 이전 | PIT 선택 **0행** | 실제 결손이라면 연도 백필·0값 보간이 아니라 `availableAt/retrievedAt` provenance/기준시각부터 수정 판단 |
| current raw 30,600행은 완전, PIT observationHistory의 **최신 주 1개 지역 한 행만** 없는 합성 상황 | 최근 파생 일자가 **2026-10-24 → 2026-10-17**로 뒤로 이동 | raw count PASS를 score READY로 착각하지 말 것. Reader `selectedPITRows/firstMissingExpectedDate` 메타 1회 필요 |
| 52주 전 특정 지역의 4주 평균이 0 | 해당 주 파생값 산출 안 함(`pa===0` 공식 산식 보호) | 나누기 0을 임의 값으로 대체하면 승인 산식 변경. 결손의 종류만 기록 |
| 초기 신규 청구만 최신, 계속 청구/IUR 오래됨 | **현 Scheduler `RELEASE_ALREADY_STORED`** / 계열별-신선도 후보는 DUE | Collector의 4계열 상태와 Scheduler 동일 계약을 유지해야 false 성공·수집 억제 방지 |
| 신규/계속 청구 정상 1주차 | 계열별 후보가 `RELEASE_ALREADY_STORED`로 정상 판정 | 임의 uniform same-week 지연 기준은 부적격, 각 계열 공식 시차 확인 필요 |
| 공개 저장물이 9일 경과 | 8일 TTL 조건에서 응답 만료 | 데이터 갱신 없이 저장시간만 새로 적거나 TTL 늘리지 말 것 |

**운영 사이트 관측의 한계:** 현재 공개 `https://zgmini.kr/economic-indicators/employment/` 서버 HTML은 29행 모두 로딩 기본 대시 `—`·`R6 공개 저장값 확인 중`이며, **클라이언트 hydration/API 읽기 결과를 직접 확인하지 못했으므로 D1 29행 모두 비어 있다고 확정할 수 없다**. 이 경로는 이미 승인된 1년 공개 Writer의 실제 D1 exact readback와 API/UI 같은 원본 여부를 확인할 것.

**예상 작업 성공률의 취급:** 지난 23.28%·29.85%·39.12%·52.16%는 특정 단계의 근거 없는 숫자를 바꿔 곱한 민감도 값에 불과하고, 원자료·승인 B 설치·공급자·PIT·게시의 실제 이력에서 추정한 확률이 아니다. 이번 새 합성 시험으로 **실제 운영 성공률을 상향하지 않음**. 유용한 지표는 `National 4/4, Writer installed_sha, selected PIT rows, score firstMissingExpectedDate, D1/public sameHash`의 다섯 개 PASS 영수증.

**즉시 반영할 한 가지 작업 우선순위:** 이미 있는 통합 PR #1083을 현재 main 대비 최소 Provider/Collector/scheduler 변경과 회귀로 묶을 때 **계열별 최신성(Collector+Scheduler 일치)** 및 국가 원본 fail-closed를 동일 source change로 처리. PIT 과거 유효기간과 실제 29개 화면의 독립 게시 검증은 다른 작업자/공유 Writer 충돌 없이 병렬 진행. 51×600주 재백필·강제 재예약/승인 없는 자동 폴백은 실행하지 않는다.

---


**조사 기준** 2026-11-16 KST / 전용 `codex/employment-1y-reader-r1` / 공식 source 최신 main `0bc55c0d70306e660e054dee3095cd7aa2d9e0b8` / 제어 main `8cc5f1544e8b0d067c27fd8441193078bde4f341`. 현재 전용 브랜치 HEAD 조사 시작 `491e6185cc883325933c9899e60c437ed58be4ac`. **이번 작업은 READ_ONLY 조사·문서 작성만 수행**, Provider/Collector/Controller·운영 PC·SQLite·D1·배포·Scheduler 변경 0. 기능 중앙 마지막 유효 진행률 **75%→75%**.

## 0. 핵심 — 지난 '23.28%'를 예측치로 사용하지 말 것
- 지난 성공확률 `0.90×0.70×0.60×0.70×0.88=23.28%`는 실측되지 않은 다섯 독립 확률을 가정한 예시. 데이터가 없으므로 모델의 통계적 예측 신뢰도가 0에 가까움. **소스 90→95, 설치 70→85 등 숫자만 바꿔 성공했다고 말하는 행위 금지**.
- 성공 가능성 향상의 실제 지표는 단계별 LAST PASS/FIRST FAIL을 해소하고, 유효 기존 성공 증거를 재사용하며, 공개 가능 작업을 DB/공급자 대기와 분리하는 것. 단일 숫자보다 **증거 충족 단계 수와 조건별 복구 경로**를 추적.

## 1. 교차 검증한 완료·미완료 증거
- [실Windows #1403/Run 43663990960](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1403#issuecomment-6887419784): 지역 `STATE_INITIAL_CLAIMS` 51×600주 `RAW_PRECONDITIONS_COMPLETE`, 필요한 577주·29,427 row 충족, `firstFailureWeek=null`; **같은 작업 다시 수집/Reader 재실행 금지**. 전국 DOL `ONE_YEAR 2026-11-09 SUCCESS 4/4` vs `BACKFILL PARTIAL 0/4` vs `RELEASE 2026-11-15 PARTIAL 0/4`, 최신 observation null.
- [#1083 Draft](https://github.com/ansqhd5774-Choi/zgmini/pull/1083) source HEAD `21b3930c091b37edbb152bb73920bdf46e1a9ebc`, 기존 CI [43677601781](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43677601781) PASS; **미병합, PC 미설치**. 현재 main의 관련 **3개 source blob 모두 후보와 다름**: `r4-shadow-provider`, `r6-provider`, `r6-collector`. 9개 변경 파일은 **3 source + 1 기존 test 변경 + 5 신규 tests**. Source 최초 원인 코드 확인과 선별 통합이 필요, `git add .`/다른 작업자 변경 덮어쓰기/무조건 full PR 병합 금지.
- [Writer Provider B #1040](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1040): 당시 `WRITER_B_INSTALLED_VERIFIED`; [Collector B #1063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1063): `WRITER_B_RECOVERY_REQUIRED/SOURCE_PAIR_STOP`, 재실행 대신 해당 request 원장과 **현행 설치 SHA** 확인. [Controller #1501](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1501): `UNKNOWN/BACKLOG_OR_RECOVERY_NOT_VERIFIED`, 공유 PC 설치에만 영향을 미칠 수 있는 별도 이슈.
- 현재 `zgmini.kr` 고용 공개 HTML의 서버 기본 렌더는 29개 행 모두 대시를 표시하지만 hydration/API response가 확인되지 않아 **실제 D1 29행 불가 확정 증거가 아님**. 공개 API endpoint는 이 조사 도구에서 열리지 않았으며 실제 API·D1 exact readback은 필요한 단계.

## 2. 성공률 개선 6개 (가설/조치/증거)
| 우선 | 개선 과제 | 기존 확인 코드·문제 | 반드시 지킬 최소 행동 및 성공 증거 |
|---|---|---|---|
| P0 | **결과 공개 분리** | `worker/employment-r6-public-display.mjs`의 29개 row validator는 `PARTIAL_HISTORY`/null score 및 `STALE`를 허용하고 기존 `scripts/pc-writer/employment-r6-one-year-stage.mjs`는 검증된 본문만 D1에 저장·readback. 반면 `lib/market-score/employment-r6-precompute.mjs`의 `readyGate`는 29/29·7군·4projections 모두 READY여야 종합 score 승격. | **개별지표 1년차트 공개 ≠ 종합점수 READY**의 완료증거를 분리. 기존 승인 1Y publish 경로를 독립 진행, 있는 데이터만 raw/score 상태에 맞춰 공개. 종합 `readyGate` 삭제·조작 또는 29/29 강제 금지. `public-display.mjs` **8일 저장물 TTL**은 현재 계약; 새로운 정상 source 버전 없이 시간을 갱신하거나 TTL 변경 금지. |
| P0 | **#1083 최소 선별 소스 정정** | `fetchDolClaims` nonXML/0행 fail closed + ETA539 독립 수집은 구현/CI 통과. 그러나 기존 격리 12-case에서 문서 root 검증 누락, 미래 실값, 음수, 중복 키, 계열별 stale, 양쪽 실패 `NO_OBSERVATIONS` masking 등 6개 유형 재현. | 실제 source 내 **National `r539cyNational` root** (기존 `<week>` 조각 unit fixture를 제거하지 말고 필요 시 정상 전체 XML로 갱신), 4계열 유효성·미래/음수/중복 및 **계열별 실제 발표 week lag** 확인. Normal Initial(11/07) vs Continued/IUR(10/31) 필수 정상 case 보존. 실패 원인 상위 1개+하위 원인 메타. 기존 9파일 전체를 무분별 병합하지 말고 3 source/관련 tests의 현재 main diff 기준 적용, 관련 CI 한 번. |
| P1 | **Scheduler freshness 일관성** | `lib/market-score/employment-r6-scheduler.mjs::releasePlanForGroup`은 `RELEASE_ALREADY_STORED`에서 `latestInitialClaimsObservationDate` **한 계열만** 검사. Collector도 initial만 stale 여부 판정. | **공유된 계열별 freshness evidence**를 Collector와 Scheduler에서 일치시키고 다른 계열 stale인데 false `SUCCESS`/중복 시도 중지되는 문제 방지. 공식 발표 calendar·series lag 검증 없이 임의 7/14일 기준 새 Gate 금지. 기존 `CIRCUIT_OPEN`·`retryTtlMs` 재사용; 무승인 무한 6회 재시도/신규 스케줄 금지. |
| P1 | **실PC 설치 실패 조기 배제** | #1063 source pair STOP (당시 실제 request success 아님). 새 #1083은 과거 승인 manifest의 AFTER SHA와 다름. | 승인 설치 직전에만 **현재 actual Writer fileSHA/HEAD/config.source**, Controller A allowlist, 변경 manifest exact before/after hash 비교. 기존 승인 유지보수 경로 한 Owner/자원 lease 내 B 파일 적용·보호 전후 확인. 모든 기능의 컨트롤러 전체 재설치 요구 금지. |
| P1 | **마지막 score의 PIT 경계 분리** | `employment-r6-feature-engine.mjs::stateClaimsBreadth`는 51지역 current raw가 아니라 **`observationHistory` PIT 선별 + 4주/52주 비교 + `pa===0`**에 민감함. `employment-r6-observation-reader.mjs::selectAsOfRevisions`는 availableAt/retrievedAt <= asOf를 요구. | 이미 저장된 SQLite로 **`STATE_CLAIMS_BREADTH` 정확 firstMissingExpectedDate/selected PIT rows/zero denominators**를 최초 1회 읽기 전용 확인. 600주 지역 재백필 반복·누락 0보간 금지. BED BACKFILL의 개별 결손 `BDS0000000000000000110008RQ5`는 RELEASE SUCCESS와 구분해 추적. |
| P2 | **DOL 공적 장애에 대한 조건부 원자료 복구** | 동일 공식 DOL `report.asp`를 쓰는 [FinanceToolkit](https://github.com/JerBouma/FinanceToolkit/blob/245c303efcca5c317c8dcc2fff00d393e1c9ba98/financetoolkit/economics/sources/dol_model.py#L52-L100)도 HTTP 성공 시 오류 HTML `Unable to connect!`을 가정·캐시 보존, 제한 재시도 사용. 공식 DOL `claims.asp`은 이 대화 중 오류/정상 GET 둘 다 기록. | 기존 Release/Circuit TTL을 먼저 재사용. 원본 없을 때는 `UNKNOWN/NOT_STORED`, valid 새 XML 4/4이 나오면만 신규 저장. 공식 DOL 계속 장애라면 **별도 사용자 승인** 하에 기존 FRED transport/쿼터/key 위치로 주간 `ICSA/IC4WSA/CCSA/IURSA` 고정 profile·원출처 `ETA via FRED`·ALFRED vintage/PIT·단위·주간 시차 계약을 추가; 일단 무승인 신규 POST 호출·자동 fallback 금지. |

## 3. 실제 구현 순서 / STOP 조건
**즉시 병렬 진행 가능한 두 개:**
- W04 개발: #1083의 **3 source + 관련 tests를 main 대비 최소 부분만 선별 통합**, 위 P0 안전성 6유형 중 실제 공식 입력 계약에 부합하는 최소 guard 및 Scheduler/Collector 최신성 일치(동일 source scope) 수정. 기존 600주 CI 재실행 대신 **수정 영향 회귀**만. code SHA/CI와 기능 브랜치 HEAD 분리 기록.
- 중앙 운영 Owner: 기존 저장 snapshot(11/09 ONE_YEAR vs 11/15 RELEASE)에서 `http_status/content_type/bodySha/responseFormat/parsed4`를 한 번 READ_ONLY 확인. 과거 실패 raw가 안 남았으면 `NOT_STORED`로 종료하고 앞으로의 실패 원인 상세는 #1083 새로운 운영 관측으로 받는다. Controller B 안전 거부 우회 금지.

**승인된 적용 이후:**
- 실제 B 설치 SHA 검증 → DOL valid 4/4 또는 정직한 PARTIAL(원자료 마지막 유효 보존) → 독립 1Y display D1 readback → 실제 원자료 `observationHistory`로 종합 PIT 계산·저장·D1/api/UI 재검증. 공개 본문 hash·stored_at·sourceStoredAt, scoreAsOf, sourceVersion을 구분.
- 종합 score는 현재 승인 `readyGate`에 따라 READY 또는 근거 있는 PARTIAL로 유지. 공개 GET에서 새로운 수집·계산 금지. 라이브 홈페이지 SSR 기본 대시와 hydration 성공 여부를 섞어 결론 내지 않음.
- 다음 정규 release 자연 자동 갱신 관찰은 전체 기능 완료 이후 후속, 기능 완료 Gate로 임의 추가 금지.

## 4. '예상 성공률' 모델 설명 — 통계 예측과 엄격히 구별
이전 단계별 가정 `(source=.90,Binstall=.70,DOL=.60,PIT=.70,publish=.88)`는 실제 관측 추정치가 **아니므로 23.28%는 결코 통계 예측이 아님**. 설명용 독립 가정만 유지할 때:
- 소스 .95·설치 .85 (DOL .60/PIT .70/게시 .88 유지) → **29.85%**.
- 소스 .95·설치 .85·PIT .85·게시 .95 (DOL .60 유지) → **39.12%**.
- 위 조건에서 DOL .80이라고 가정만 바꿀 때 → **52.16%**.
이 숫자는 단계 확률을 임의로 높인 가정 비교지, **본 조사로 실제 프로젝트의 성공확률이 상승했다는 증거가 아니다**. DOL 오류가 공급자 DB일 경우 source 보완만으로 실응답 4/4 확률이 상승하지 않음. 현장 증거가 모일 때만 미래 예측을 재추정.

## 5. LAST PASS · FIRST FAIL · 다음 한 단계
- **LAST PASS:** PR #1083 source CI 과거 PASS, 51×600주 원자료 실제 Windows PASS, 실제 메인↔PR 9개 파일(3 source 차이/1 test 차이/5 new test) 직접 비교, 1Y public validator와 전체 score의 분리 확인, 8일 UI TTL과 기존 Scheduler Circuit 확인, DOL/FRED 공식 문서 확인.
- **FIRST FAIL:** 실제 최신 Writer installed source SHA 및 2026-11-15 National POST 원본/파서 하위 실패 미확정; 원래 #1083은 신규 안전 결함 6종 보완 미완료; 현재 `STATE_CLAIMS_BREADTH` selected PIT·D1/API 최신 공개값 미검증.
- **다음 실제 단일 기능 실행:** W04 전용 브랜치에 #1083 최소 Provider/Collector/관련 tests와 **root guard·계열별 freshness·동시실패 우선순위 및 필수 정상 입력 회귀** 구현. Source CI 이후 기존 승인 B로 실PC 설치와 수집·PIT·publish. 병렬 중앙 Read-only 원자료 메타는 별도.
- **조사 진행률:** 0%→100%; **기능 진행률** 중앙 유효 75%→75%, 운영 변경 0.
