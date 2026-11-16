# ZGMINI W04 고용 R6 — #1083 소스 기반 경계 시뮬레이션·추가 결함·작업성공률 민감도

2026-11-16 KST · 독립 격리 Node.js 22.16.0 · **기능 75%→75%** · 시뮬레이션 **완료 100%**

> **증거 등급:** 공개 GitHub 실제 [#1083 HEAD `21b3930c091b37edbb152bb73920bdf46e1a9ebc`](https://github.com/ansqhd5774-Choi/zgmini/pull/1083) Provider `lib/market-score/employment-r6-provider.mjs`의 `parseDolNationalClaimsXml`, `nationalComplete`, Collector `staleDolRelease/failureCode` **해당 함수 본문 및 분기를 직접 옮긴 별도 격리 실행 코드**. 전체 실제 GitHub 모듈/공식 공급자/운영 Windows 코드의 직접 실행이나 실통합 테스트 **아님**. 기존 Source CI [Run #43677601781](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43677601781) PASS 재사용, 재실행 0. 운영 DOL/FRED 호출·SQLite/D1·Cloudflare/승인·배포·Runner 변경 0.

## 1. 실제 실험 실적
- 이전 12가지 동작 모델: **12 시나리오/14 assertions PASS** 재실행. 이 수는 안전 요구 14/14 통과라는 뜻이 아니라 당시 코드 분기를 재현했다는 뜻.
- **신규 PR #1083 소스-본문 복제 함수 기반 경계 테스트 12개 모두 실제 예상 결과 재현(12/12 assertions).** 안전 동작 목표 대비 현행 5/12 통과, 7/12 기대와 다른 동작(중복 원인 2개 합쳐 **신규 위험 5유형 + 기존 오류 우선순위 1유형**).
- **보완 후보 정책 모델** 별도 12시나리오/12 assertions PASS; 안전 목표 대비 **12/12**. 이 수는 제안한 guard를 구현하는 *정책 모델*에 한정. **실제 PR 소스 수정·검사/운영 적용 전**이므로 100% 운영 성공률이라는 뜻이 아님.
- 격리 생성 파일은 같은 ChatGPT 대화 `/mnt/data/zgmini_w04_source_branch_edge_sim_20261116.mjs`, `zgmini_w04_edge_case_simulation_20261116.json`, `zgmini_w04_hardened_candidate_sim_20261116.mjs`, `zgmini_w04_guard_candidate_results_20261116.json`. 사용자에게 명시적인 sandbox 링크 제공. GitHub 본문만으로 로컬 첨부가 자동 이전 대화에 전달되는 것은 아님.

## 2. 새로 확인한 결함/위험 (원본 코드 직접 매칭)
| 구분 | 기존 코드 경계 조건, 격리 재현 결과 | 위험/권장 최소 대응 |
|---|---|---|
| **신규 ① National XML 루트 검증 누락** | `parseDolNationalClaimsXml`이 `<week>…</week>` 정규식만 사용, `nationalComplete`은 이력 전체에서 4 ID 존재만 확인. `<error>...<week>4 values</week></error>` 및 HTML 안에 유효-looking week 내포 시에도 **National snapshot 저장 허용/SUCCESS** | 운영 200 수신시 검증된 `r539cyNational` 문서 root·완전성 확인 후 파싱. 기존 unit test의 `<week>` fragment fixture는 실제 공식 문서 전체로 감싸야 할 가능성; 과거 회귀 assert 삭제 금지. 11/15 PC 당시 HTML에 이런 embedded week가 있었단 뜻은 아님 |
| **신규 ② 계열별 최신성 누락** | `staleDolRelease`은 `INITIAL_CLAIMS`의 최근 날짜만 확인. Initial 최신 11/07, Continued/IUR 09/05 (둘 다 과거 유효값)는 National 4/4 조건 만족, **RELEASE SUCCESS** | initial/4wk vs continued/IUR 정상 1주 시차는 유지하면서 각 계열별 보수적 발표일 최신성 검토. 7일·14일 가상 허용 한계는 **모델 제안치**이며 공식 발표 계약 검증·승인이 필요 |
| **신규 ③ 미래값 유효성** | `parseUsDate`는 연도 1900~2199 사이만 확인. 2099년 <week>에 실값이 있으면 현재 2026 release에서도 **SUCCESS** | `retrievedAt`/공식 발표일 뒤 실측 주차의 양수 값 허용 금지. 현재 fixture의 2026-12-31 기준 미래값(11/15 retrieval) 허용 테스트와 정책 충돌 가능: fixture/공식 미래 `SF`(예측 계수) vs 실제 관측값 구분 |
| **신규 ④ 음수 계열 유효값** | `numberText`는 유한숫자만 검증. claims -300/IUR -0.2도 National 4/4 존재하면 **SUCCESS** | 청구건수≥0, IUR 0~100(%), 미발표/빈값 null. 극값 상한은 산식/계약 변경이므로 무단 추가하지 않음 |
| **신규 ⑤ 중복 관측 키 충돌** | 동일 관측주+series에 상충한 숫자 2개 있더라도 `parseDolNationalClaimsXml`이 둘 다 반환, snapshot 저장 조건 통과 | National 내 `series|observationDate` 유일성/동일-상충 구분; 상충은 fail-closed, 기존 raw/history 임의 변경 금지 |
| **기존 ⑥ 동시 공급자 실패의 상위 오류 은닉** | National 503 + ETA539 실패 시 0 rows에 `failureCode=NO_OBSERVATIONS`가 National HTTP 코드보다 우선. 하위 `nationalResponseEvidence.requestFailureCode`에 정확 코드 존재 | 상위 failureCode는 원인 정규 코드 우선, 구별 가능하면 부가 detail에 State 오류도 보존. 원본 오류/키 노출 금지 |

**주의:** 이 중 ①~⑤는 **코드로 입증된 잠재적 데이터-계약 취약성**이지, 실제 PC 11/15 실패 원인 입증이 아님. 다수 임의 방어 규칙을 무분별하게 운영에 추가하지 않고 현지 계열·공식 발표 의미 검토 후 최소 코드로 수정해야 한다. 특히 정상 국가 XML은 초기 청구(11/07)와 계속 청구/IUR(10/31)의 서로 다른 관측일을 갖는 것이 정상이다. **그 정상 1주 시차는 보완 모델에서 SUCCESS 유지(12개 중 #11).**

## 3. 작업 성공률 추정 — **가정 기반 민감도, 실측 확률 아님**
- 현재 단계별 배포·공급자 성공/미성공 시계열에 통계적으로 신뢰할 만큼의 실제 표본이 없어 **객관적 성공확률 산출은 불가능**. 아래는 독립적인 5개 단계 성공확률을 *가정*하고 모두 단번에 성공할 확률을 단순 곱한 **설명용 계산**이다. 각 단계를 반복/재실행해 복구하는 누적 성공확률과 다르다.
- 단계 = `source_guard_implementation × approved_B_install × valid_DOL_National_response × PIT_29th_gate × D1_API_UI_equal_readback`.

| 가정 | Source | B설치 | 공식응답 valid | PIT 29번째 | 게시/UI | 단번에 종단 성공 |
|---|---:|---:|---:|---:|---:|---:|
| 보수 | 80% | 55% | 40% | 55% | 80% | **7.74%** |
| 기준 | 90% | 70% | 60% | 70% | 88% | **23.28%** |
| 낙관 | 97% | 85% | 80% | 85% | 95% | **53.26%** |

- 이 값들은 코드 통과율/현재 장애 통계로 보정된 수치가 **아니다**. 공급자·PC 장기 의존은 독립 가정을 위반할 수 있다. **실측 성공률이라고 표현 금지**, 사용자 의사결정에 확신 자료로 사용 금지. B 설치와 DOL 공급자 정상 응답이 **이미 확인된 조건**이라면 소스/PIT/게시 세 단계로 단순화한 조건부 기준 시나리오는 **55.44%**, 조건부 낙관 **78.33%**이다.
- 더 의미 있는 현실 판정은 위 5개 단계별 **실제 새로운 PASS 영수증 5개 확보 여부**다. 출발 상태는 source 기존 #1083 CI PASS지만 신규 guard 미구현, B 미설치, national 11/15 0/4, PIT 29번째 미검증, D1/API/UI 최신 동치 미확인. 전체 기능 최신 중앙 진행률 **75%→75%**.

## 4. 다음 실제 실행 순서 (승인 경계 유지)
1. **W04 전담 브랜치:** 새로 확인한 **기능상 데이터 무결성 ①, ②, ③, ④, ⑤**를 공식 DOL XML·발표 규칙으로 근거 정리하고, #1083 Provider/Collector/최소 테스트를 최신 main 대비 선별 통합. 시급 결함은 ① 문서 루트 검증과 ② 계열별 최신성, 기존 ⑥ 오류 우선순위. 불필요한 추가 Gate가 기존 정상 데이터를 막지 않는지 기존 fixture·정상 1주 시차 회귀로 확인.
2. **중앙 승인 단일 Owner (병렬):** 실PC에 **이미 저장된** 11/09 ONE_YEAR 성공·11/15 RELEASE 실패의 National raw snapshot 1회 읽기 전용 메타 조회로 `http_status/content_type/body_sha256/format/4계열 parsed` 식별. 과거 실패 raw 저장 자체가 없으면 `NOT_STORED` 판단, 반복 요청 금지.
3. 승인된 좁은 Source B exact preimage/after SHA 설치→정규 공식 주기 1회 신규 National 4/4→SQLite history·PIT 29번째와 기존 BED BACKFILL missing1 **별도** 판정→로컬 결과→D1 exact readback→API/UI 같은 버전 확인. 공유 Controller #1501 보호 상태와 실제 lease 충돌만 단일 Owner로 처리.
4. DOL 공식 응답이 다시 오류이면 마지막 유효 원본/점수 유지, 정확 `PARTIAL/STALE` 기록. 기존 FRED/ALFRED 보조 `ICSA/IC4WSA/CCSA/IURSA`는 공급자·PIT·출처 경로 명시 승인 이후에만 적용, 무승인 6회 재시도/스케줄러 변경/가짜 READY 금지.

**이번 산출물:** 격리 코드·JSON 4개, GitHub 기록 1건, 중앙 #68 인계 1건. 실제 원담당 기능 소스 로직/승인/운영 PC/원자료/DB/D1/배포 변경 0.
