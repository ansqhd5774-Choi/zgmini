# ZGMINI W04 고용 R6 — 성공 가능성 개선을 위한 소스·운영·게시 분리 실행계획

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
