# W01 물가지표 수집기 과도 조건 점검 — 2026-11-18

**범위/시작:** `ansqhd5774-Choi/zgmini` 최신 `main` 소스 조사(변경 없음), W01 33/71(46.5%). 사용자의 W03 사례 8개는 점검 기준일 뿐 W01의 운영 설정으로 간주하지 않는다. 아래 판정은 **source-level audit**이며 PC 설치 source SHA·Core flag·운영 스케줄 변경 증거가 아니다. 기존 PC 실측은 [#2060/Run #44212106863](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2060) 6/7 raw valid, #28 missing; 별도 Census 수동 B [#1818](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1818) 운영 첫 실패 `INFL_MANUAL_B_CORE_OWNER_EVENT129_UNVERIFIED_STOP` 유지.

## 정상 수집을 차단하는 조건 — 7건

| 코드·범위 | 실제 조건 | 판정 | 최소 개선 방향 / 보호 조건 |
|---|---|---|---|
| [`local-cycle.mjs`](../scripts/pc-writer/local-cycle.mjs) 38행, 7후보 51행 | 19개 정기 수집은 `lane==='core'&&collection.status===0`만 진입. 바로 뒤 7후보는 `lane==='core'`면 독립 진입 | **개선 필요 — HIGH.** 무관한 `collect-local` 비정상 종료가 이미 승인된 19개 원자료 수집을 전역 중단 | 19개도 7후보처럼 Core lane/자체 flag, calendar·quota·lock·checkpoint로 독립 실행. 기존 게시 `collectionPublicationPolicy`와 Core lock 불변. 승인된 수집 주기 이외로 재실행 확장 금지 |
| [`inflation-causal-candidate-core-bridge.mjs`](../scripts/pc-writer/inflation-causal-candidate-core-bridge.mjs) 103~107행 및 [`inflation-causal-recurring-r1.mjs`](../scripts/pc-writer/inflation-causal-recurring-r1.mjs) 46~70행 | 동일 발표 이벤트에서 시도 기록만 있으면 성공/429/네트워크 오류/데이터 미발표 구별 없이 24시간 재시도 차단. 19개 GAS는 같은 UTC 날짜 실패 시 하루 재시도 차단 | **과도 — HIGH**, 하지만 무작정 재시도/주기 완화 불가. 특히 현장 Census `CENSUS_M3_HEADERS_INVALID`는 재시도 문제가 아니라 실제 형식 오류 | `attempted` 기록·provider 예산은 유지하고 `failureCode`/성공 여부에 따라 정책을 분리. 일시적인 5xx/timeout은 *승인된 기존 실행주기 안에서* provider `retryAt`·quota와 bounded backoff 후 재허용, 429는 Retry-After/예산 존중, 형식 불일치는 원인 수정 전 HOLD. 시도마다 네트워크 중복 호출·Key 누출 금지 |
| [`inflation-causal-recurring-r1.mjs`](../scripts/pc-writer/inflation-causal-recurring-r1.mjs) 225~238행, [`inflation-causal-candidate-core-bridge.mjs`](../scripts/pc-writer/inflation-causal-candidate-core-bridge.mjs) 60~72행 | 19개 수집은 `calendar.sources[e.source].status==='READY'`인 발표 이벤트만 남김. 7후보에서도 CPI를 제외한 BLS PPI·Fed·Census는 source READY 조건 | **개선 필요 — MEDIUM.** 캘린더 갱신 장애가 *과거 이미 정식 검증된* 발표 이력을 무효화 가능 | 이벤트 ID·날짜·공식 URL·기존 검증 provenance가 저장되어 있으면 달력 최신 동기화 오류와 구분. 검증 전·변조된 달력과 미래 발표는 계속 차단. CPI에 이미 존재하는 독립 승인된 발표 이벤트 예외 계약 범위 확인 후 재사용 |
| [`inflation-causal-recurring-r1.mjs`](../scripts/pc-writer/inflation-causal-recurring-r1.mjs) 18~31행, [`inflation-causal-candidate-core-bridge.mjs`](../scripts/pc-writer/inflation-causal-candidate-core-bridge.mjs) 58~76행 | 공식 발표일의 `UTC 22:00` 이전에는 날짜가 확인돼도 신규 수집 금지 | **완화 검토 — MEDIUM.** 미리 확인된 실제 값이 공개된 시간보다 늦게 수집될 수 있음 | 공식 발표 시각 또는 승인된 provider 관측의 새 날짜/저장값을 근거로 허용. 날짜만 존재하면 기존 보수적 cutoff 유지. 발표 전 가상 값 생성 금지 |
| [`inflation-causal-candidate-core-bridge.mjs`](../scripts/pc-writer/inflation-causal-candidate-core-bridge.mjs) 85~102행 및 [`inflation-causal-candidate-core-bridge.test.mjs`](../scripts/pc-writer/inflation-causal-candidate-core-bridge.test.mjs) `Treasury auctions and EIA WPSR never trigger` | #2 EIA regular gasoline·#16 Treasury MTS customs 두 후보는 승인된 `bootstrap` 1회 후 공식 새 데이터 도착해도 같은 collector 경로가 재개되지 않음 | **기능 공백 — HIGH.** 현 상태는 지속 갱신 가능한 완성 기능이 아님. 최초 수집 권한과 정기 갱신 효과를 구별 | EIA 주간 *retail regular gasoline*·Treasury 월간 *MTS*의 정확 별도 공식 발표/새 관측일 트리거로 재활성화. EIA WPSR·Treasury CUSIP *무관한* 일정 재사용 금지. 신규 수집 주기 변경은 별도 운영 승인 범위 확인 후 실시 |
| [`inflation-causal-bls8.mjs`](../scripts/pc-writer/inflation-causal-bls8.mjs) 19~45행 | 기존 8개 PPI 시리즈 중 한 계열의 한 행 날짜·값·중복/결측이 잘못됐거나 행이 비면 즉시 `throw`로 8종 모두 저장 중단 | **과도 — HIGH** (정상 계열까지 묶음 실패). 신규 [`inflation-causal-candidate-bls3.mjs`](../scripts/pc-writer/inflation-causal-candidate-bls3.mjs) 41~87행은 무효 월·충돌 월만 격리하는 대조 구현 존재 | 개별 시리즈/월 검증·오류 격리, 정상 시리즈 업데이트 및 이전 정상본 보존. 시리즈 누락을 `READY`로 바꾸거나 변조·결측을 0으로 치환 금지. 데이터 계약·Writer 승인 범위에 맞춘 최소 수정+회귀 CI |
| [`inflation-causal-recurring-r1.mjs`](../scripts/pc-writer/inflation-causal-recurring-r1.mjs) 48~59행 | FRED gas 일별 gate에서 실패 시에도 `attempted.eventKey=today`만으로 당일 차단 | **조정 검토 — LOW/MEDIUM.** 하루 한 번 운영 주기/공급자 호출 승인일 수 있어 무조건 제거는 불가 | 승인된 일별 횟수·quota 내에서 *일시적* 실패만 상태 기반 제한 재시도 허용 검토, 이미 저장한 유효 월/일 관측은 반복 덮어쓰기 금지 |

## 유지할 보호 및 실제 미확정

- **유지:** [`quota-policy.mjs`](../scripts/pc-writer/quota-policy.mjs)와 [`quota-ledger.mjs`](../scripts/pc-writer/quota-ledger.mjs)의 공급자별 요청 예산·rate limit, [`inflation-causal-candidate-once.mjs`](../scripts/pc-writer/inflation-causal-candidate-once.mjs)에서 승인된 group별 실제 호출 상한(Census 2 GET, 기타 1 GET), BLS API 단회 20년 범위, API key 없는 요청 거부, payload identity/date/unit/중복 검증, symlink 제한, 원본 archive·SHA·atomic readback, Task/Core lock·feature flag, 이미 처리된 발표 checkpoint, 19+7 저장/계산/게시 분리. 공급자 호출 상한을 고정 재시도 지연과 혼동하지 말 것.
- **다른 담당자의 조건과 구분:** 조사된 W01 경로에는 `SPY` 연동, 뉴욕 날짜당 2회, 6시간 최소 대기, 4 API마다 60초 sleep, 전체 64종 완료 gate, 일률적 7일 조회 구간이 없음. W03의 문제를 W01에 그대로 전용하지 말 것.
- **Census #28 별도 FIRST FAIL:** [`inflation-causal-candidate-census-m3.mjs`](../scripts/pc-writer/inflation-causal-candidate-census-m3.mjs) header 필수 검사는 실제 PC checkpoint `CENSUS_M3_HEADERS_INVALID` 발생. [공식 M3 variables](https://api.census.gov/data/timeseries/eits/m3/variables.html): `time` required predicate-only / `time_slot_date` optional. [공식 example](https://api.census.gov/data/timeseries/eits/m3/examples.html) query는 `get=data_type_code,time_slot_id,seasonally_adj,category_code,cell_value,error_data`와 `for=us:*`, `time=YEAR`. 수집기는 추가 `get=time_slot_date`를 요청하고 결과에서 반드시 `time_slot_date` 또는 `time`이 반환돼야 한다고 함. **정확 어떤 header가 빠졌는지 운영 raw archive 첫 행 미관측**, 본 source만으로 과도한 조건의 단독 원인 확정/교체 불가. 우선 비민감 allowlisted read-only archive header 진단, 이후 1개 불일치 원인만 수정.
- **정상 경로 존재:** 물가 7후보 [`local-cycle.mjs`](../scripts/pc-writer/local-cycle.mjs)은 `collection.status` 실패에도 별도 실행하고, [`inflation-causal-candidate-once.mjs`](../scripts/pc-writer/inflation-causal-candidate-once.mjs)은 group별 실패를 분리. BLS 후보3 수집기는 월별 오류를 격리. 공개 7행은 [기존 A4-08 실물 보존 통합검증 PR #1271](https://github.com/ansqhd5774-Choi/zgmini/pull/1271)에서 6 READY/1 PENDING, 한 계열 결손 시 다른 정상 계열·last-good 독립 보존 검증.
- **소스↔운영 분리:** 운영 PC에 실제 설치된 Core/W01 optional modules의 source, 승인 feature flag/원장과 이 `main` 내용을 동일하다고 가정 금지. 현재 승인 원본 산식·데이터 계약·TTL·수집 주기와 충돌하는 효과는 정규 운영 범위 검증/승인 전 적용 금지.

## 우선 수행 순서 (W01 원담당)

1. 현재 승인 PC source·기능별 Core flag와 위 조건의 실제 활성/비활성 구분(조회 가능한 기존 운영 증거 우선).
2. **즉시 source-only 개선 후보:** 전역 collect-local exit gating 제거 설계(19 별도 gate), BLS8 월/시리즈 단위 격리 회귀, 실패 유형별 24시간 gate 분리. 단 **기능별 cadence/승인 효과 변경을 단순 refactor로 숨기지 않음**. 19/BLS8 보호와 계약이 통과한 경우에만 각각 최소 소스 PR·정규 승인.
3. #28의 실제 보관 응답 header 비민감 조회 → 단일 원인 교정 → 정상 원자료 저장/변경 검증; 수동 B #1818의 Core Task-owner/Event129 C급 차단은 독립적으로 보존·우회 불가.
4. EIA/Treasury recurring 트리거는 공식 해당 지표 release·신규 관측일 기반으로 계약 확정 후 승인된 갱신 주기만 적용. 다른 5개 저장 정상과 독립 처리.
5. W01 19+7 원자료→로컬 계산→Writer/D1→API·사이트 종단 검증. 예약 검증은 모든 기능 완료 이후 후속으로만 분리.

**결과:** 본 요청은 source 조건 감사만 실시. 신규 provider GET·PC 설치·Core/Task/SQLite·D1·공개 배포·운영 승인 변경 0. 상기 위험 항목 **실운영 발생 여부는 미확정**이며, 전체 진행률 **33/71 (46.5%) 유지**.


<!-- W01-20261118-FIVE-COLLECTOR-GATES-SOURCE-MERGED -->
## 구현 실적 — 2026-11-18 최신 main 3개 source PR, 5개 조건 수정

| 기존 감사 항목 | 실제 변경 | CI/병합 | 실PC 적용 |
|---|---|---|---|
| ① 전체 collect-local 실패 시 19개 수집 차단 | `local-cycle.mjs`의 `collection.status===0` 분기 제거. 기존 19개 자기 활성 플래그·Core lock·provider quota/발표일 독립 유지 | [#1284](https://github.com/ansqhd5774-Choi/zgmini/pull/1284) / [CI #44221922693](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44221922693) success / main `0892fc020525a2fc36be883f6e09688fe2059c2c` | 미적용·별도 승인 필요 |
| ② 성공·실패 구분 없는 고정 24h | `candidate-core-bridge.mjs` + `inflation-causal-recurring-r1.mjs`: 408/500/502/503/504 및 공급자 quota guard에 한해 1h 후 *기존 승인 Core tick에서* 재평가; 429·schema·값 오류·UNCHANGED·기존 기록은 24h 유지. 실제 호출은 quota ledger가 최종 제한 | [#1287](https://github.com/ansqhd5774-Choi/zgmini/pull/1287) / [CI #44222527085](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44222527085) success / main `76ad2e29fb6fb5b8d350039a7d2e9e30e535ac06` | 미적용 |
| ③ 달력 SOURCE_FAILED가 기존 검증 발표까지 무효화 | 소스별 과거 유효 `checkedAt`·이벤트의 정확한 공식 HTTPS origin을 함께 확인했을 때만 이전 발표 이벤트 유지. 미래일·위조 URL·이전 검증 없는 상태는 차단 | [#1290](https://github.com/ansqhd5774-Choi/zgmini/pull/1290) / [CI #44224229368](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44224229368) success / main `2f5e275f1aa43e3f0cab09572a58421f0f6dd98b` | 미적용 |
| ⑥ BLS8 1계열 오류 시 8종 전체 취소 | 최초 8종 필수 검증 그대로. 이미 검증된 정상본이 있을 때 오류·중복·결손 계열은 last-good, 정상 계열만 저장. `PARTIAL_SAVED_LAST_GOOD`는 전체 발표 checkpoint 처리 금지, 개별 `seriesSourceStoredAt`로 기존값을 최신값처럼 표현하지 않음. 19개 공개 Reader는 구형 문서도 호환 | [#1284](https://github.com/ansqhd5774-Choi/zgmini/pull/1284) + [#1290](https://github.com/ansqhd5774-Choi/zgmini/pull/1290), CI 2/2 success | 미적용 |
| ⑦ FRED gas 일시 오류도 같은 UTC day 전부 차단 | 명확한 일시적 HTTP/쿼터 실패만 1h 재평가, 이미 완료된 gas 일자는 여전히 차단. Core tick/쿼터/승인 빈도 불변 | [#1287](https://github.com/ansqhd5774-Choi/zgmini/pull/1287), CI success | 미적용 |

### 남은 확인 2범주 — 소스 미수정
- **④ UTC 22시 날짜만 있는 release gating:** 근거 있는 실제 발표시각/공식 공개증거가 없는 상태에서 날짜만 보고 22시 이전 새 원자료를 가정할 수 없어 소스 유지. 공식 시각·타임존과 검증된 발표 준비 신호가 계약에 포함될 때만 소스 재설계.
- **⑤ EIA #2/ Treasury #16 공식 정기 갱신:** 현 캘린더에 주간 retail gasoline/월간 MTS 그 자체를 나타내는 공식 이벤트가 없어, *무관한* EIA WPSR/Treasury CUSIP 이벤트를 대용으로 사용하지 않음. 승인된 추가 수집 주기·정확 릴리스 source 신설 여부를 확인한 뒤 별도 source/기능 절차 추진.

**실제 범위 확인:** GitHub PR 세 건 모두 `merged=true`/CI success 및 최신 main 6개 핵심 파일 blob 존재 직접 재조회. 이 증거는 **운영 PC 설치, Core 승인 플래그, 승인 source pin, 원자료 전진, D1/API/사이트 최신화 성공 아님**. 사용자 승인 없이 PC source/Task/Cron/DB/공급자/API/D1/Cloudflare를 변경하지 않았음. 정확 설치 source/승인 manifest/실제 PC SHA·lease/preimage 확인 후 W01 원담당이 B 적용·재수집/시각 검증 진행.

**W01 종료:** 기능 목표 33/71(46.5%) **변화 없음** (개발 결함 5범주 source 개선만 완료); Census #28 `MISSING`·`CENSUS_M3_HEADERS_INVALID` 실원인 헤더 보관본 조회 미완료, A4-07 19종 private SHA audit Controller ingress 미설치, D1/Production 최종 readback 미완료.
