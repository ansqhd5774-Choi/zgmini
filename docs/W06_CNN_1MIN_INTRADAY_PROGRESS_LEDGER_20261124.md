# ZGMINI W06 진행 원장 — R1

기준일: 2026-11-24 KST
담당: W06 CNN 공포·탐욕 지수
저장소: `ansqhd5774-Choi/zgmini`
전용 브랜치: `codex/w06-cnn-1min-intraday-20261124`
실행 정본: [W06 실행계획 R1](W06_CNN_1MIN_INTRADAY_EXECUTION_PLAN_R1_20261124.md)
계획 반영 커밋: [f21b2a7f3b5454172589ddff9ef96c66f349f7c9](https://github.com/ansqhd5774-Choi/zgmini/commit/f21b2a7f3b5454172589ddff9ef96c66f349f7c9)
연계: [본체 #1521](https://github.com/ansqhd5774-Choi/zgmini/issues/1521) · [공통 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68)

## 1. 현행 판정

- 목표: CNN만 60초 기준 확인, 원본 보존, 표시값 변화 감지, 1·5·10·30분 선형 집계, 저장 전용 API 및 무새로고침 화면 반영.
- 2026-11-26 현재: **개발 소스 CI 4/4 PASS, 운영 설치 후보 통합·검증 진행 중**. 기존 #1521 복구 완료 증거 유지. 실제 PC의 8개 원본 해시 확보, 7개 byte-equivalent 복원, 1개 기존 원본 보존 삽입 Preview PASS. #3790 수집/게시 삽입 명세 CI 2/2 및 main 병합 완료, #3792/#3793 실PC PASS로 3개 entrypoint Preview 3/3 완료. 신규 60초 운영·Sidecar 복구·공개 종단은 미완료. 상세 최신 증거는 §14 참조.
- 계획서 및 원장 생성은 문서 작업으로만 집계한다. W06 운영 완료율은 미산정(실행 증거 부족), 기존 복구 완료 증거는 유지한다.
- #1521은 2026-11-24 최종 운영 검증 후 CLOSED. 기존 복구는 완료이며 신규 W06 고도화와 구분한다.
- 신규 60초 수집에는 현 소스의 15분 간격/5분 quota 및 5분 Core 실행 구조가 맞지 않는다. 실제 운영의 적용 값과 공급자 허용 범위는 미확정. 전체 업무 차단 아님; 독립 UI 구현 계속.

## 2. 단계별 진행표

| 단계 | 상태 | 이번 원장 기준 증거 / 미완료 조건 |
| --- | --- | --- |
| 1. 실제 경로 확정 | 진행 중 | #1521 CLOSED 및 종단 PASS 승계; #3766 운영 원본 8/8 SHA 및 #3786 실제 삽입 afterSHA 확보; Sidecar source/CAS, 실행 연결·공급자 허용 범위 미완료 |
| 2. CNN만 1분 확인 | 진행 중 | PC 전용 단회 CLI·60초 due/429 cooldown 개발 CI PASS. 실제 삽입 후보 #3786/#3792/#3793 3/3 PASS. quota 공유 원장/실행 계약 및 실제 호출 미검증 |
| 3. 원본 저장·변동 감지 | 진행 중 | 실제 HTTP 확인과 원본 observedAt 분리, 늦은 관측 archive 보존, 모의 저장 회귀 CI PASS; 운영 미검증 |
| 4. 1·5·10·30분 집계 | 진행 중 | 원본 기반 집계 및 네 구간 UI 개발 CI PASS(0f0bb62e), Production 확인 미완료 |
| 5. D1·API·자동 화면 갱신 | 진행 중 | 기존 D1/API 1D·1W PASS 승계; 60초 저장 조회·실패 보존·브라우저 CI PASS. CNN 전용 게시 경로 및 운영 D1/API/화면 미검증 |
| 6. 회귀시험·운영 적용 | 진행 중 | #1644 0f0bb62e CI 4/4 PASS, #3785/#3790 제어 main 병합, #3786/#3792/#3793 PASS 및 회수 완료; quota 및 의존성·정확 B/Sidecar 설치·배포 미완료 |
| 7. 실관측 종단 확인·종결 | 미착수 | 신규 실제 변동 전파 및 네 간격·PC/모바일·기존 여섯 기간 검증 필요 |

상태는 미착수 / 진행 중 / 완료 / 해당 범위 차단으로 관리한다. 단계 개수로 운영 완료율을 환산하지 않는다.

## 3. 기존 유효 증거와 한계

아래는 #1521 원본 댓글에서 확인한 기존 운영 영수증 참조다. 이번 원장 작성에서 운영 PC 재실행이나 원본 JSON의 독립 재판독은 하지 않았다. 증거의 해당 시점·범위만 승계한다.

| 구분 | 기존 증거 | 범위와 한계 |
| --- | --- | --- |
| Sidecar 설치 | [B #3300](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3300), [Run 45371791207](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45371791207) | 19:07~19:09 KST R3 설치 성공 보고; 1분 실행 증거 아님 |
| 로컬 검증 기록 | [A #3311](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3311), [A #3315](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3315) | checkedAt 19:20:32.434 및 19:45:39.084 KST, 기존 #1521 대체 조건 2/2. observedAt와 별개 |
| 신규 원본 관측 | [A #3315 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45379008934-1-seat-3.json) | observedAt 19:27:16 KST, score 16.5509157509158. 당시 original/checks 각 111건. 설치 후 새 원본 1건 |
| Controller 검증기 설치 | [B #3317](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3317) | SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED, 설치 SHA b3320e84c1011f5a0bf726c262eabf626d9b5e97 보고 |
| SQLite·D1·API | [A #3319](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3319), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45381417843-1-seat-2.json) | PASS/CNN_SQLITE_D1_API_1D_1W_MATCHED. 당시 UTC 당일 original 3, checks 3; 정확 두 D1 키 및 API 1D/1W 일치. 신규 1분 정책 증거 아님 |
| 현재값·이력 시차 | [A #3320](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3320) | 당시 current observedAt 19:47:16 KST, 15.818315018315; archive latest 19:27:16 KST. 20분 차이, 이후 해소 여부 미확인 |
| 실제 화면 | [#1521 최종 검증](https://github.com/ansqhd5774-Choi/zgmini/issues/1521#issuecomment-7132724425) | 2026-11-24 PC 1440px/390px 1D·1W 및 hover/touch PASS, Run 45398278809 attempt 2. 신규 W06 1분 확장 검증 아님 |

기존 복구의 로컬 2건 대체 기준 정정: [#1521 댓글](https://github.com/ansqhd5774-Choi/zgmini/issues/1521#issuecomment-7129679903). 설치 후 원본 2건을 #1521의 유일한 조건으로 새로 추가하지 않는다. W06의 실제 표시값 변동 전파는 별도 기능 목표다.

## 4. W06 완료 증거표 (갱신 대상)

| 대상 | 필수 증거 | 현행 |
| --- | --- | --- |
| CNN 요청 | 실제 checkedAt/HTTP 요청 간격, 실패로 건너뛴 주기, 공급자 정책, 다른 지표 주기 유지 | 미입증 |
| 원본 보존 | observedAt·원본 정밀도·정정/충돌·늦은 관측 SQLite readback | 기존 일부 증거; 신규 동작 미검증 |
| 변동점 | 동일 표시값 생략·상승/하락·복귀·원본 불변 | 미입증 |
| 네 분 간격 | 원본 기반 대표값·실제 시각·결측·미완료 구간·NY/DST | 집계 모듈/테스트 구현, UI·CI 미완료 |
| 게시·API | 로컬과 정확 D1 키, 기간/간격 값·시각·버전 readback | 기존 1D/1W PASS; 신규 기능 미입증 |
| 자동 반영 | 아카이브 주기 조회·경합 방지·공급자 직접 호출 없음·실화면 | 소스 구현 및 회귀 코드 추가, 실행 검증 미완료 |
| PC·모바일 | 1440/390px, 네 간격 선택, hover/touch, 마지막점과 값·시각 | 미입증 |
| 기존 기능 | 1D/1W/1M/3M/6M/1Y, 원본/일별 이력 및 타 지표 보존 | 신규 회귀 미검증 |

## 5. 변경·실행 원장

| 날짜 | 실행 | 결과 | 증거 |
| --- | --- | --- | --- |
| 2026-11-24 | 기존 전용 원격 브랜치 확인 | 완료 | GitHub branch search exact match |
| 2026-11-24 | R1 계획서 반영·원격 재조회 | 완료 | f21b2a7f3b5454172589ddff9ef96c66f349f7c9 |
| 2026-11-24 | #1521 상태·최신 댓글 조회, 진행 원장 생성 | 문서 작업 완료; 단계 1 진행 중 | 본 원장 및 위 증거 링크 |

2026-11-24 문서 작업 시 신규 기능 변경 없음. 2026-11-26 전용 브랜치에 최신 main 통합 및 UI 소스/회귀 코드 변경. main 기능 병합·운영 설치·예약·DB/D1 쓰기·배포 없음.
2026-11-26 #3741/#3742/#3766 및 #3786 A 결과 회수 완료. 후속 #3792 (90f59760-5dd7-4df4-95c5-af0139db34a2), #3793 (f4c41825-2985-4f8f-8ec3-b77e01947f24) 실제 결과 2/2 각각 회수·completed closed. #3795 (ca22b9ae-ff44-4a52-8cb8-b8484d87c401) PASS_READONLY, JSON/TXT 2/2 회수, completed closed. #3798 및 Controller 변경 후 #3800, 게시기 R2 #3804 실제 결과 각각 회수·completed closed. 현재 미회수 정규 B #3812 (81857ab9-a467-49a5-8453-42ff8a522f97). 동일 요청 중복 금지. §14 참조.

## 6. 다음 직접 실행

1. #3766 및 #3786/#3792/#3793의 유효한 원본·Preview 3/3 증거를 재사용한다. 실제 B 적용 전 변경된 source/base/승인 효과만 필요한 범위에서 확인한다.
2. 기존 quota-fetch 및 quota-policy를 보존하는 공통 quota 동시 실행 보호와 실제 운영 의존성(특히 설치된 CNN TS collector, shared adapter)을 확인한다. 기존 현대 quota-ledger의 일반 예약 lock/재조회 시험을 재사용하되 운영 원본과의 계약 차이를 무시하지 않는다.
3. 기존 B 정규 경로의 exact candidate/preimage/after SHA, runtimeDependencies, CAS/lease/backup을 확정한다. #3745의 Sidecar 고정 source 및 old preimage 조건을 별도로 해결한다. #3768 동일 실패 재시도 금지.
4. 승인 범위의 실제 운영 적용 후 60초 HTTP 확인·SQLite 원본·D1/API·PC/모바일 화면을 종단 검증한다. 기존 Core·다른 지표 보존 및 공급처 제한 준수 확인. 개발 CI나 Preview만으로 종결하지 않는다.

## 7. 원장 갱신 규칙

- 실제 상태 변화나 새 증거가 생긴 경우 해당 단계와 변경·실행 표를 갱신한다. 마지막 유효 성공, 최초 실패 조건, 정확한 대상 및 다음 행동을 기록한다.
- source SHA, 승인 source, 설치/실행 SHA, 배포 버전을 구분하고 해당 Issue/PR/Run/JSON/TXT 링크를 기록한다. 미확정은 미확정으로 보존한다.
- 차단은 직접 필수 행동과 근거에 한정한다. 독립 작업은 계속한다. 같은 실패 반복, 가짜 관측, 과거 증거 소급 생성 금지.
- 새 원장/예약/승인 Gate를 단계마다 만들지 않는다. 본 원장을 계속 사용하고 기존 정상 기록을 삭제하지 않는다.
- 최종 종결은 R1의 실제 관측·저장·게시·화면 완료 기준과 기존 #1521 범위를 각각 검증한 뒤 판단한다.

## 8. 2026-11-26 착수 결과 — 소스 경로 및 UI 독립 작업

- 전용 브랜치는 최신 main `7c243d87b8c04b408d30e3fe2e3e8dad9d3571aa` 대비 139커밋 뒤처졌고 전용 변경 2문서뿐이었다. 기존 두 문서 blob을 유지하고 non-force CAS로 [통합 커밋 3cbff0f4](https://github.com/ansqhd5774-Choi/zgmini/commit/3cbff0f4bd48b575b63fe2f3635f5843f68a9fc4) 반영. 정확 기준 main 대비 behind=0, 차이 2문서 확인. main/운영 배포 변경 없음.
- #1521 최종 댓글 및 실제 GitHub CLOSED 조회, 기존 #3311/#3319 원본 JSON 재판독으로 Sidecar/로컬/D1/API 증거 범위 확인. 기존 최종 UI Run 45398278809 attempt 2, Cloudflare Version 1408e511-3bfd-4be9-aac7-4527a327cf88 기록 승계. 현 시각의 Runtime으로 소급 확정하지 않음.

| 소스 조건 | 관측 사실 및 영향 |
| --- | --- |
| `worker/public-feed-store.mjs` L6 | CNN `intervalMs:15*60000`; `worker/public-feed-refresh.mjs`는 current/attempt 각각 interval 비교 후 실제 호출. 15분 제한의 코드 위치 확인. |
| `scripts/pc-writer/quota-policy.mjs` L24 | CNN `minIntervalMs:5*minute`, `perMinute:12`, `hard:false`, cache-policy. 실제 enforce/observe 운영 모드에 따라 다름. |
| `collect-local.mjs` / `quota-runner.mjs` | `runPublicFeeds({maxFeedsPerRun:1})`, Core 단회 수집·잠금 계약. 기존 5분 Core를 유지한다. 15분 설정만 변경해도 60초 실행이 보장되지 않음. |
| R3 Sidecar | 승인 #3300의 source 37795e97bc90d8c43fbd7bb3b2e382184e72ea48 및 원본 #3311에서 실제 연결/파일 해시 확인. `archive-run.mjs`는 current SQLite 조회→archive/verified checks→D1, providerCalls=0. 현 계약에서 CNN 요청을 직접 수행하지 않는다. |
| 검증 이력 | `tools/cnn-verified-checks-r9/verified-checks-r9.mjs` 15분/96점/동일 원본 생략 조건. 현 설치본과 같다고 단정하지 않음. 원본 관측 기록과 60초 실제 확인 기록, 표시점의 분리 필요. |
| 원본 이력 | `lib/cnn-observed-archive-r1.mjs` observedAt 단위 병합, 일별 최대 1500; public-feed-refresh의 관측 역행 거부가 archive 이전에 동작. 늦은 원본 보존·충돌 계약 추가 검증 필요. |
| 공개 경로 | API는 D1 저장된 원본/검사 키만 읽고 60초 cache; `useStoredIndex` 현재값 60초 재조회는 존재. `cnn-panel.tsx` 이력은 기간 변경 시 1회만 조회하고 실패 시 기존 이력 삭제하던 결함 확인. |

- 신규 [UI 소스 변경 5fbce0c7](https://github.com/ansqhd5774-Choi/zgmini/commit/5fbce0c70be4fdee7af53914b9c126e5c03faa4a): 기존 `startStoredRefresh` 재사용, 60초 GET/no-store, 기간 변경 abort, 실패 시 마지막 이력 유지·지연 표시. 기존 390/1440 browser fixture에 실패/다음 성공/자동 반영 검증 추가. 후속 동일 범위 수정으로 timeout도 지연 처리, cleanup은 오류 제외. 실제 CI는 아직 미확인. 공개 GET이 공급자 호출을 발생시키지 않음.
- 운영 #3300의 11/24 source pin `e4b768530335182f422ebd51d163a6f5b754361c`는 본체 GitHub 파일 ref 조회에서 404. 이는 과거 복구 실패가 아니라 운영 설치본 내용/최신 상태의 별도 미확인. 실제 1분 요청의 현행 허용 근거는 config의 공식 한도 미확인 기록에 비추어 추가 확인 필요. 기존 조회 `provider-activity-runtime-readonly`의 집계는 5분 미만 간격을 제외하므로 60초 실증으로 사용하지 않는다. 불필요한 PC 재실행·예약·추가 호출은 하지 않았다.

**다음 실행:** 기존 UI 회귀 CI exact HEAD 확인과 실패 수정, 동시에 현재 설치본/등록 Task의 실행 연결 및 실제 CNN 확인 기록을 기존 승인 조회/영수증으로 대조한다. 60초 실행 연결이 없으면 최소 변경 하나를 특정하고 공급자 호출 정책과 확인 기록/원본 보존을 함께 구현한다. 새 예약·서비스·다른 지표의 주기 변경은 임의 수행하지 않는다.

## 9. 2026-11-26 후속 실행 — 장중 이력 재정체 및 개발 진행

- 신규 PC A [#3741](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3741), [Run 45714445280](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45714445280), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45714445280-1-seat-6.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45714445280-1-seat-6.txt) 2/2, 07:35 KST PASS/FEAR_GREED_ARCHIVE_READONLY_DIAGNOSIS. PASS는 조회 성공이며 기능 정상 판정 아님. 실제 Controller 53fe24e22446d21a9fd4ee308d12b7cba7f37e25. 현재값 observedAt 2026-11-25T22:09:41Z score 15.2253164556962; original lastAt 2026-11-24T13:17:31Z, checks lastAt 2026-11-24T13:35:44.576Z. HISTORY_DIVERGENCE, Sidecar BLOCKED 및 SOURCE/SHA 범주. 글로벌 게시 VERIFIED는 CNN 정확 키의 정상 증거가 아님. #1521 당시 성공 이후 새로운 재발이며 과거 완료를 삭제하지 않음.
- 신규 PC A [#3742](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3742), [Run 45714656794](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45714656794), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45714656794-1-seat-6.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45714656794-1-seat-6.txt) 2/2, 07:36 KST PASS/CORE_READONLY_DIAGNOSIS. 실제 config.source=d8ac245003e7b8e006c2345382d5c639c6d5f18b, Core Task XML hash dd81987c7efa4b1e343af30329a580613bb920dec89c1aa7a436ef935f0bb028 유지. 두 A 모두 providerCalls/operationalWrites/d1Writes=0, 보호 전후 일치.
- #3741 실제 archive-run.mjs SHA-256 583297b451f168a32a2a5de4b0b04c9b14449aab9a041c954a420203cf04f188은 #3300 승인 manifest after와 일치. 해당 [승인 원본 소스](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/37795e97bc90d8c43fbd7bb3b2e382184e72ea48/sidecar-b/approved/archive-run.mjs) L11/L21/L25의 APPROVED=e4b768530335182f422ebd51d163a6f5b754361c는 현 config.source와 다름. 즉 현 고정 pin 조건에서 source/config 일치 통과 불가능. 실제 최초 throw가 SOURCE_SHA_CHANGED인지 CONFIG_APPROVAL_MISMATCH인지와 현재 고정 SRC HEAD는 미입증; 보호 검사 우회 금지. 현 config.source GitHub 본체 직접 조회 404는 운영 source가 없다는 증거 아님. 단순 동일 Sidecar 재설치 금지. 현재 승인 source에 연동되는 정규 적용/복구 경로 필요(공통 실행 연결 변경은 기존 총괄 경로로 조정). 60초 실행 cadence 실증은 별도 미완료.
- [PR #1644](https://github.com/ansqhd5774-Choi/zgmini/pull/1644) Draft, 이전 exact HEAD 7a8d761d11bf7fe73d2908e11d9a55159f98a04d: [Node #45713990992](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45713990992) Build/typecheck/architecture/Data CI/Regression/PC recovery PASS, ESLint FAIL(기존 cnn-panel.tsx 메인 이동 anchor의 next/no-html-link-for-pages). CodeQL #45713991100, Secret #45713990963 PASS. Browser #45713991044 회수 시 진행 중; 이전 HEAD 결과로 새 HEAD PASS 판정 금지.
- [소스 커밋 16f0e96b](https://github.com/ansqhd5774-Choi/zgmini/commit/16f0e96b64fcb1aa91ee11d407704623fc228d5f): CNN 기존 CTA를 next/link로 변경(레이아웃/목적지 동일), lib/cnn-intraday-buckets-r1.mjs 및 tests/cnn-intraday-buckets-r1.test.mjs 추가. 1/5/10/30분 원본 최종 관측값 집계, NY 세션/DST, 표시 소수점 1자리, 동일값 연속 구간 축약, 복귀값 보존, 결측 null break, 미완료 구간 표시용 정보. 기존 원본/일별 이력/PC check 변경 없음. 아직 UI 연결 안 됨. 테스트 5개 작성, 실행 PASS 미확정. 정확 소스 HEAD의 신규 CI Node 45714854157, Browser 45714854009, CodeQL 45714853953, Secret 45714853987 시작 확인. 아래 원장 기록만의 후속 커밋은 그 정확 HEAD와 구분.

다음 행동: 새 CI 결과 회수 및 실패 수정 → 실제 CNN 차트에 네 구간 집계와 provenance/결측 처리 연결(공유 스타일·기존 기간 보존) → Sidecar의 승인 source 연결 재발 원인을 정규 적용/복구 경로로 해소 → CNN 60초 실행 연결을 공급처/공통 quota 및 실제 운영 계약에 맞춰 구현. 기존 B 승인 대상이나 CAS를 새 변경에 재사용하지 않는다. 실제 변경은 승인 효과에 맞춘 새 정확 manifest 필요. 신규 예약·직접 운영 쓰기·main 병합 없음.

## 10. 2026-11-26 후속 — 분 간격 UI 및 CI 수정

- HEAD ee2b9bbc: Node Run 45715090624 Build/Type check/Regression PASS, Lint FAIL(React Compiler preserve-manual-memoization 2건: extrema52Week/fixedPeriodChanges의 payload 관측시각 의존성). 관측시각 scalar로 통일, 검사 우회 없음. 기존 Source Secret PASS, 나머지 이전 실행 결과는 최신 소스 판정으로 승계하지 않음.
- 4단계: 기존 1D 확인 이력은 기본 보기로 보존하고 1/5/10/30분 원본 관측 버튼을 추가. 명시 선택 시 PC 확인 시각을 분봉 원본으로 취급하지 않음. 원본 대표시각과 실제 관측시각/구간 마감·진행 중을 구분. 변동점은 최초 값 유지, 동일값 구간 마지막 실제 관측은 선 연결용 앵커로만 유지. 결측 null 및 고립된 실제 관측만 표시. 다른 기간/지표 동작은 유지. 390/1440 기존 browser fixture에 4개 선택·bucket 수 검증 추가. 신규 CI 및 실운영 검증 전.
- 1/2/3단계: #3741/#3742의 승인 source 불일치와 이력 정체는 미해결. 기존 승인 경로의 정확 manifest/운영 source 계약 확인 및 최소 복구 필요. 60초 공급자 호출과 원본 저장 Runtime 미입증. 운영 변경 없음.

## 11. 2026-11-26 — 공유 Sidecar 계약 및 늦은 원본 저장

- 기존 Sidecar B `contract.mjs`의 PREIMAGE=ce07af0b5e8d… 강제 일치 조건은 현재 실제 설치본 583297b451f…와 다름. 이전 R3 manifest는 old source e4b76853…와 정확 before/after에 한정되므로 재사용 불가. `operating-probe.mjs`는 설치 HEAD/config 및 task/wrapper/lease를 모두 검증한다. 보호 우회 없이 다음 정규 적용의 정확 preimage/현재 source/후속 승인 연계와 공통 설치 계약 수정이 필요. 기존 #3741/#3742 원본과 연결한 [공통 Writer 인계 #3745](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3745) 생성. 원본 요청/결과는 유지. 실제 총괄 수신·인수/수정/설치 미확인. W06 원담당의 기능 작업 계속.
- 실제 수집 경로 `collect-local.mjs`는 다른 Core 작업 또는 public-feed 한 건만 선택한다. `local-cycle.mjs`는 동기 단회 Core 실행; Sidecar 자체 providerCalls=0. 현재 구조에서 CNN 전용 60초 실행을 보장하지 못한다. 다른 지표의 스케줄을 변경하거나 새 예약을 생성하지 않았다.
- `public-feed-refresh.mjs`의 current 역행 검사가 archive 이전에 실행되어 늦게 받은 검증된 CNN 원본도 폐기하던 소스 결함 확인. 원본의 실제 observedAt이 current보다 이전일 때만 검증된 원본 headline을 기존 archive 병합 계약으로 저장하고 current를 유지하도록 수정. stale sidecar 재전파·확인시각 변조 없음. 무효 점수/저장 실패 시 기존 실패 처리. 신규 회귀 2개. 다른 공급자 정책 및 현재 CNN 15분 정책 유지. 소스 구현이며 PC Runtime 미적용.
- 이전 exact HEAD efbb1e79의 Secret/CodeQL PASS, Node/Browser는 조회 시 진행 중. 신규 HEAD의 CI로 별도 확인.

## 12. 2026-11-26 — CNN 전용 분 단위 실행 후보와 기존 회귀 수정

- 이전 HEAD b43552cb Node Run 45716620792 Regression FAIL: tests/public-feed-storage.test.mjs:20의 불완전 late body(history 없음)를 새 archive 분기가 COMPLETE 처리. 기존 assertFeedOutput을 late 분기에서 호출하도록 수정. 기존 실패 assertion 삭제/변경 없음. 유효한 late 원본만 archive에 진입.
- CNN quota 공통 ledger는 일반 provider에 대해 생성 시 전체 JSON을 읽고 다시 쓰는 구조로 별도 프로세스 동시 실행 시 lost update 위험이 있다. 독립 scheduler/새 프로세스 추가 금지. 기존 Core/Writer 보호를 유지하는 실제 연결 계약은 별도 필요. CNN quota 5분은 hard:false이므로 현재 코드에서 enforce mode도 hard 차단하지 않고 경고만 기록. 이를 공급처 승인/실제 1분 허용으로 오인하지 않음.
- 기존 refreshPublicFeeds에 PC compute target 전용 cnnMinuteOnly 단회 옵션 추가: 60초 due 조건, public-feeds 및 feed lease 재사용, CNN만 선택, 일반 Core 15분/타 지표 정책 불변. 내부 collector 429/Retry-After 전달 및 기존 attempt 행에 durable cooldown, 실패 후 마지막 정상값 유지. 기존 경로의 호출자에서 아직 활성화하지 않음. 모의 SQLite 2개 회귀 추가. 공급처 실제 호출/새 예약/운영 설치 없음. 정확한 운영 연결은 공통 Writer 인계 #3745와 분리하여 확정.
- #3745 OPEN, 댓글 없음(조회 시점); 실제 총괄 인수/복구 미확인. 60초 실제 요청 기록·checkedAt 저장·D1/화면 종단 미완료.

## 13. 2026-11-26 — 실제 HTTP 확인 기록 소스

- exact HEAD 946c32c4 Node 45717279187: 변경된 TS 두 파일의 기존 explicit any 4건 Lint 실패. FeedStore/DataEnv 타입으로 교체. 회귀 assertion 유지. Secret PASS.
- CNN 전용 tick에서 기존 collector의 실제 fetch 시작시각/HTTP 응답시각/상태 및 검증 결과를 기록하도록 callback 연결. HTTP 실패/transport 실패/검증 실패/정상 응답 구분. 동일 원본 반복 확인은 별도 checkedAt으로 보존하되 sourceObservedAt·원본 score 변경 없음. 기존 R9 PC_VERIFIED_STORED_AT의 공개 기록 의미 변경 없음. 기존 SQLite 테이블 kind=input, fear-greed-http-checks 날짜별 행과 readback 재사용, D1 게시 대상 아님. 모의 SQLite 반복 확인·실패·충돌 회귀 추가. Retry-After의 장기 서버 대기를 임의 24시간으로 단축하지 않도록 수정. 운영 PC 실제 확인 기록은 아직 미생성.
- #3745는 HANDOFF_ROUTED/AWAITING_AGENT_CONFIGURATION, automaticAiExecution NOT_CONFIGURED. 인계 실제 인수 아님. 기존 Core 5분/공통 quota 공유 쓰기 계약 때문에 단회 60초 소스 옵션만 있고 지속 실행 연결은 미확정. 운영 변경 없음.


## 14. 2026-11-26 — 운영 원본 복원·삽입 후보 및 실제 Preview

### 개발·제어 소스 증거

| 대상 | 상태 | 정확한 증거 |
| --- | --- | --- |
| 본체 기존 HEAD | 4/4 PASS | [0d5c94c0](https://github.com/ansqhd5774-Choi/zgmini/commit/0d5c94c0e7d348a5beb5599b3ed96757e2b7189e); TS 수집기 2개 복원, 런타임 후보 8 mjs |
| Core092 보존 | 개발 수정 및 CI 완료 | [f1407b78](https://github.com/ansqhd5774-Choi/zgmini/commit/f1407b7842b57cc5f79292c4fca268c0928ecd51); 승인 모듈 3/3 SHA 일치, 실행 식별자/출처 증명 연결; CI 4/4 |
| W01 보존 | 개발 수정 및 CI 완료 | [0f0bb62e](https://github.com/ansqhd5774-Choi/zgmini/commit/0f0bb62e4d4879369e061e9289ed1c79d91f0044); 저장 payload/변경 checkpoint 호환 경로 복원; [Node](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45729720637), [CodeQL](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45729720627), [Secret](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45729720651), [Browser](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45729720595) 모두 SUCCESS |
| Writer 원본 조회 scope | 제어 main 병합 | [#3763](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3763) 4565e14820d4d2f4ad39b85088efe5798d325e99 |
| 실제 cycle 삽입 명세 | 제어 main 병합 | [#3785](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3785) CI 2/2 PASS, e9ecfff820ac632f092be66639d765ae89578146 |
| 수집/게시 삽입 명세 | 제어 main 병합 | [#3790](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3790) [C996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45732002605)·[Secret](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45732002606) SUCCESS, 211d5e1d14a6f31c7a3d5cd7668fff494b8299a7 |

본체 개발 PR #1644는 계속 open. 위 개발 CI는 정확 소스 HEAD에만 해당하며 이 원장 문서 커밋의 새 HEAD CI나 운영 설치 증거로 대체하지 않는다.

### 실제 원본 및 삽입 후보

[PC A #3766](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3766), [Run 45727629197 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45727629197-1-seat-5.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45727629197-1-seat-5.txt): PASS/WRITER_APPROVED_PREIMAGE_READONLY. Controller 53fe24e22446d21a9fd4ee308d12b7cba7f37e25, 09:17 KST, PC config/checkout/checkpoint d8ac245003e7b8e006c2345382d5c639c6d5f18b. 보호 상태 동일, provider/DB/D1/운영 쓰기 0. runtimeSourceVerified=false/coreTaskSourceLinked=false; GitHub에서 합성 SHA 조회 불가를 PC 실패로 해석하지 않는다. #3766 completed closed, 재요청 금지.

| 파일 | PC before SHA-256 | 원본 복원 / 후보 |
| --- | --- | --- |
| scripts/pc-writer/cnn-observed-archive-publication-r1.mjs | 9c52d17e82483fc35c1280d53687342e9c08e727ca1712b0c1d8290d0acb3f11 | 기존 base byte 일치 |
| scripts/pc-writer/collect-local.mjs | 1648a62e26157868e9d4ed43ab9d36436068e08973ba56d495b7c1751e02c62e | 정확 11349 bytes, 승인 BLS 후보 58a8d800… + W02/wifi/SEC/Core092/Alpaca retirement 삽입 전후 모두 일치; projected after 6a750c854b18e419a5a44e6805c409a19efe9c6a9f8a416d76ea59ffa4dbdf43 |
| scripts/pc-writer/collection-publication-policy.mjs | b8089b00c443722d64c17a1cde27200e8a77303d8030eae8015b5a2e8662a5ff | 기존 base CRLF 일치 |
| scripts/pc-writer/local-cycle.mjs | 41912f24c2bdc13a9de52d2ee2b504fe90b733656a0d66827c617a5e2c6c0f4a | R17 합성 base 원본 전체 미복원, 실제 #3786 after 486536024cc0bf78f449594fbe31b762cf0578545502a17dbfce1bd12c73c484 |
| scripts/pc-writer/quota-ledger.mjs | 379f56dd94dc8df8ca6ef46331a4fd831495759bddcc9cee22b0159c65559efe | 0f3074ee… CRLF 정확 4769 bytes; 동시 실행 보호 호환성 미확정 |
| scripts/pc-writer/run-local.mjs | a96c0c7c3513fda6f9d51b35caee7d634e2a05c69ff3575d3b99c37072a60ec6 | 정확 32376 bytes, D05 55b83b83… + W02/wifi/taxonomy/composite/Core092/W01/W05 삽입 전후 모두 일치; projected after 431409ea5f544a023b55f80cd70072473f2e014f8b6d9e604c62105fb954de9a |
| worker/public-feed-refresh.mjs | a5f11713d5089b9a5984e056f65a01c739286532c40dff12462343d734b37b4f | 52df1846… CRLF 정확 일치 |
| worker/public-feed-store.mjs | b21f03057025bad7aed58c7bb1f69b2abba0f0b446c587869594eea732adfaa6 | 기존 base byte 일치 |

[실측 #3786 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3786-2e93ec19-4a8e-4bc5-b2d5-b983490d5be6.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3786-2e93ec19-4a8e-4bc5-b2d5-b983490d5be6.txt): PASS_READONLY/WRITER_B_INSERT_PREVIEW_VERIFIED, 실제 PC before/after 일치, Core taskXml dd81987c7efa4b1e343af30329a580613bb920dec89c1aa7a436ef935f0bb028, source/task/DB/D1/provider 쓰기 0. 해당 시점 Core instance 0, lock 없음; 현재 상태나 B 실행 시점의 보장 아님. A completed closed.

### 최신 실행 요청 및 결과 (회수 완료)

| 요청 | 명세 SHA-256 | 예상 after | 상태 |
| --- | --- | --- | --- |
| [#3792](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3792) 수집기, requestId 90f59760-5dd7-4df4-95c5-af0139db34a2 | a22bed33e02ed359a692cdf40ffc235d463b24f340f7ec639d655a6d4a0f1007 | 6a750c85… | PASS_READONLY, 실제 after 일치, JSON/TXT 2/2, closed |
| [#3793](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3793) 게시기, requestId f4c41825-2985-4f8f-8ec3-b77e01947f24 | cfa7e378d72539384797da2a202c7948ff40c56801cff4edd72673e83ce23887 | 431409ea… | PASS_READONLY, 실제 after 일치, JSON/TXT 2/2, closed |

공통 quota: 기존 운영 원본은 constructor 시점 JSON을 읽고 persist하므로 CNN과 다른 Core 동시 쓰기의 lost-update 가능성이 있다. 최신 개발 후보는 기존 공통 reservation lock 및 lock 안 재조회, 별도 Alpaca ledger, 테스트를 포함한다. 0f0bb62e Node CI PASS는 개발 시험 증거. 기존 승인 정책 provider-health-krx-host-20261116의 candidate abb2e080…에서 CNN 5분 soft warning, BLS/SEC hard limit, Alpaca 140/120/60 보호 정의 확인; 현재 운영 정확 정책 hash와 소비자 경로는 별도. 기존 BLS activation/fetchR6WithLease/SEC adapter를 삭제하거나 quota-fetch/policy를 일괄 교체하지 않는다. CNN-only CLI는 기존 createQuotaFetch를 사용하고 Core 기존 bytes 보존. quota-ledger 교체의 실제 의존성 및 부작용 검증 필요; 이번에 운영 원장/정책 변경 없음.

Sidecar: #3745 open, #3768 BLOCKED/PREIMAGE_STAGE_MANIFEST_SCOPE_STOP (Run 45728377259, JSON/TXT 2/2). #3762/#3765 main 병합이 설치 계약 갱신을 뜻하지 않음. 원본 R3 B 재실행 금지. 현재 필수 운영 복구 미완료; 독립 W06 개발/Preview 계속.

최신 정량 근거: 운영 preimage hash 8/8, 실제 원본 복원 7/8, 세 entrypoint 삽입 후보 3/3 산출, 실제 Preview 3/3 PASS, 미회수 0. 본체 개발 CI 4/4, 제어 명세 #3785/#3790 각각 2/2. 운영 완료율 미산정, 실제 신규 60초 요청·SQLite/D1/API/UI 종단 미검증. 운영 B/예약 변경/공급자 호출/DB/D1 쓰기/배포 실행 없음.

관련 진행 댓글: [#1644 원본·Core092](https://github.com/ansqhd5774-Choi/zgmini/pull/1644#issuecomment-7178782373), [W01·quota 원본](https://github.com/ansqhd5774-Choi/zgmini/pull/1644#issuecomment-7178903507), [수집기 원본](https://github.com/ansqhd5774-Choi/zgmini/pull/1644#issuecomment-7178992869), [게시기 원본](https://github.com/ansqhd5774-Choi/zgmini/pull/1644#issuecomment-7179098072), [실측 Preview 및 후속 후보](https://github.com/ansqhd5774-Choi/zgmini/pull/1644#issuecomment-7179227525).


### 14-1. 2026-11-26 실제 PC Preview 3/3 완료

- [#3792 수집기 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3792-90f59760-5dd7-4df4-95c5-af0139db34a2.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3792-90f59760-5dd7-4df4-95c5-af0139db34a2.txt) 직접 회수, PASS_READONLY. 실제 before 1648a62e… → after 6a750c854b18e419a5a44e6805c409a19efe9c6a9f8a416d76ea59ffa4dbdf43, offline 산출과 일치.
- [#3793 게시기 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3793-f4c41825-2985-4f8f-8ec3-b77e01947f24.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3793-f4c41825-2985-4f8f-8ec3-b77e01947f24.txt) 직접 회수, PASS_READONLY. 실제 before a96c0c7c… → after 431409ea5f544a023b55f80cd70072473f2e014f8b6d9e604c62105fb954de9a, offline 산출과 일치.
- 두 결과 baseHead d8ac245003e7b8e006c2345382d5c639c6d5f18b, task XML dd81987c7efa4b1e343af30329a580613bb920dec89c1aa7a436ef935f0bb028, 모든 source/task/DB/D1/provider writes/calls=0. 당시 Core state=4, relatedProcesses=1, cycleLockPresent=true, drainReadyIfDisabled=false. 이는 해당 관측 당시만의 상태; 정상 B의 신규 시작 차단 및 자연 drain 계약을 재사용하고 Core lock 삭제/강제 종료 금지.
- #3792/#3793 completed closed 확인. 이제 기존 운영 세 entrypoint의 exact 삽입 after SHA 3/3 실측 완료. quota 및 실제 의존성·Sidecar 운영 복구·B 설치는 미완료. 개발/Preview 성공은 60초 운영 성공이 아니다.


## 15. 2026-11-26 — 기존 quota 원장 동시 쓰기 보호 후보

- 본체 원장 HEAD 9dc16d5e62cd8bc2c32d5c8bec33dcf0682e2ec6의 CI 4/4 SUCCESS 직접 확인: [Node](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45733077479), [CodeQL](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45733077398), [Secret](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45733077346), [Browser](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45733077552). 문서 변경 이후 정확 HEAD이며 실제 설치 증거 아님.
- #3766의 실제 quota-ledger 4769 bytes(379f56dd94dc8df8ca6ef46331a4fd831495759bddcc9cee22b0159c65559efe)를 기존 GitHub 0f3074ee… CRLF로 정확 복원. constructor의 오래된 전체 JSON snapshot을 persist하는 기존 표준 beforeRequest/afterResponse가 동시 실행에서 lost update를 만들 수 있는 소스 조건 확인. 운영에서 실제 발생한 손실 건수는 미입증.
- [제어 PR #3794](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3794), 정확 HEAD 0766f580438336b20690f7dd97cbef89267e414a. 기존 개발 quota-ledger의 일반 reservation lock 및 소유자 검증·정규 회수 방식을 재사용하는 7개 삽입 명세. 표준 beforeRequest/afterResponse 양쪽에서 lock 획득 후 최신 JSON 재조회, summary도 최신 원장 읽기. 기존 persist/item 공개 인터페이스·일반 ledger schema·공급자 policy 보존. 별도 Alpaca ledger 전환/새 provider 제한/기존 Core lock 수정 없음. 공개 persist/item을 직접 호출하는 외부 소비자는 main 검색에서 확인되지 않았으나 실제 운영 소비자 전체 및 직접 persist 호출의 동시 안전성은 미입증.
- projected after SHA256 68ee9e869c8bac308731c3748a67c644f37700dd038bc841ec06584fd064b2a9, spec approvals/writer-previews/w06-cnn-minute-quota-compat-20261126.json. 기존 Writer 삽입 계약 사용. 격리 TEMP의 정확한 historical original fixture SHA 검증 및 다중 인스턴스/세 Node 프로세스 테스트 2개 추가. CI 회수 시 상태: C996 R5 Readonly Source Checks completed/success (#45793228574); ZGMINI PC Secret Scan in_progress (#45793228636). 실제 PC Preview/B 설치 전.
- #3745 후속 공통 진단 댓글 7180530119는 INSUFFICIENT_EVIDENCE, PC 변경 0으로 종료. 기존 실제 Sidecar preimage/source 불일치의 해결 증거가 아님. W06 독립 quota/Writer 작업 지속.
- 다음: #3794 exact CI 회수 및 시험 실패 수정 → 실제 quota 삽입 afterSHA 확인 → 운영 의존성/모듈 소비자와 최종 B manifest 확정 → Sidecar 정규 복구와 승인된 실제 설치 → 60초 HTTP/저장/D1/API/화면. 기존 entrypoint Preview 3/3 PASS 및 원본 8/8 해시 재사용. 이번 운영 쓰기/공급자 호출 0. 신규 A/B 실행 없음.


### 15-1. 격리 Windows CI 및 명세 main 병합

- C996 [Run 45793228574](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45793228574) 실제 job 139817249925 로그 직접 회수. SCOPED groups=writer extraTests=1, 기존 Writer 135/135 PASS 및 신규 exact legacy quota 테스트 2/2 PASS. 3 Node 프로세스 CNN 30/FRED 15 reservation 보존, BLS 등 기존 policy 변경 없음(시험은 FRED hard/CNN soft 동작 검증), 임시 원장 사용. zizmor 별도 5/5 PASS. 운영 손실 실측이나 실제 설치 증거 아님.
- Secret [Run 45793228636](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45793228636) SUCCESS. #3794 CI 2/2 PASS, squash main b86c4132398bbb1e6f81e6bde47cb936289735ff.
- 신규 1회 읽기 전용 [#3795](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3795), requestId ca22b9ae-ff44-4a52-8cb8-b8484d87c401, spec SHA256 890eb8f937f636756bac3217b3053dc271c18a9004f104a06ba3c66f2bd0cf6d. 예상 after 68ee9e869c8bac308731c3748a67c644f37700dd038bc841ec06584fd064b2a9. 실제 결과 미회수. 기존 세 entrypoint PASS 유지; 이 요청은 quota만 별도 대상이며 기존 요청 반복 아님.
- 다음 직접 실행: #3795 JSON/TXT 회수 → 최종 Writer 8개 파일/실제 의존성·동시 실행 보호 계약 확인 → 정확 B manifest 및 Sidecar 정규 복구 → 승인 범위 운영 적용/실제 60초 종단 검증. 운영 파일 설치·예약·DB/D1·공급자 호출 없음.


## 16. 2026-11-26 — quota 실제 Preview 및 설치 후보 결합

- [#3795 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3795-ca22b9ae-ff44-4a52-8cb8-b8484d87c401.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3795-ca22b9ae-ff44-4a52-8cb8-b8484d87c401.txt) 실제 회수: PASS_READONLY/WRITER_B_INSERT_PREVIEW_VERIFIED, 7개 삽입, before 379f56dd… → after 68ee9e869c8bac308731c3748a67c644f37700dd038bc841ec06584fd064b2a9, 사전 산출과 일치. config/checkout base d8ac2450…, Core XML dd81987c…, writes/calls 모두 0. 당시 relatedProcesses=1, cycleLockPresent=true, 자연 drain 미준비. A completed closed. 기존 #3786/#3792/#3793과 합쳐 실제 삽입 Preview 4/4 PASS.
- #3766의 실제 launcher inventory와 #3741의 Task 참조를 재사용. Core first hop E:\ZGmini\data\pc-writer\archive-sidecar-r7\run-original-then-archive.vbs SHA256 9d5bc3429cd74813207cfc393eb04eff11a78106096964b80bf7833440385b7c, 원래 Core launcher E:\ZGmini\data\pc-writer\cutover-evidence\inflation-r37-2026-10-20T19-39-19-549Z\run-local-core.vbs SHA256 bb3e11c0b5c8da07162b1c824e7b52e7a7c2f987c079f29713211a2413932b01, Sidecar archive-run.mjs 583297b4… 확인. 이 기록은 정적 launcher hash이며 현재 active runtime 연계 증거로 확대하지 않는다.
- 8개 변경 후보의 정확한 GitHub source bytes(0f0bb62e) 및 실측 삽입 결과를 아래에 구분. 나머지 4개 full replacement는 원본 복원 소스와 line-level 대조 완료: collection-publication-policy 기존 로직 변경 없음, archive publisher 기존 archive 유지 및 current/분 전용 게시 추가, store 기존 attempt 옵션 확장 및 HTTP 확인 저장 추가, refresh 기존 Core 계약 유지하면서 CNN 원본/단회/실패 cooldown 추가. 실제 installed dependency closure와 TS 호환성은 미입증.

| 경로 | GitHub candidate SHA-256 | 예상 설치 after SHA-256 | 방식 |
| --- | --- | --- | --- |
| scripts/pc-writer/cnn-observed-archive-publication-r1.mjs | e93914393007cc674bd890f3f7aef09a9d77796186c6ce9ff12d708f6e6ec1fb | 동일 | full |
| scripts/pc-writer/collect-local.mjs | e7ea297d9da916d825ae2c942e026c7271fe7277787502b88fafbed679840e59 | 6a750c854b18e419a5a44e6805c409a19efe9c6a9f8a416d76ea59ffa4dbdf43 | 실제 insert PASS |
| scripts/pc-writer/collection-publication-policy.mjs | 79f26277edfad02eebda0b9c8b65de7a13fefc2409b7239f9c73b6699f8fb1c1 | 동일 | full |
| scripts/pc-writer/local-cycle.mjs | 5edcd0fbae45d6a9907f0452758a05ab25175e95e42ea0690a4b192bfd55e55e | 486536024cc0bf78f449594fbe31b762cf0578545502a17dbfce1bd12c73c484 | 실제 insert PASS |
| scripts/pc-writer/quota-ledger.mjs | 6f44bbb26d91be0e7203f9ea6e4772b15fd95f9d2d31dfe3540206f48a416f97 | 68ee9e869c8bac308731c3748a67c644f37700dd038bc841ec06584fd064b2a9 | 실제 insert PASS |
| scripts/pc-writer/run-local.mjs | b3aebce50971aef333c8c80ddeaf798f47605fa6e2db775d10720e69d5b9ae5e | 431409ea5f544a023b55f80cd70072473f2e014f8b6d9e604c62105fb954de9a | 실제 insert PASS |
| worker/public-feed-refresh.mjs | 193034cadb0dc49af3f6f435402fd23fe3e76ac085ffe270490363903bc4d052 | 동일 | full |
| worker/public-feed-store.mjs | dcfbf7c9665636ef60c142b39767835670cb69635ebfccbf6d1f63c57de1d667 | 동일 | full |

- [#3797](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3797), HEAD 43928822dd64c681bc601d4486601892b23668ab. 기존 A scope의 고정 .mjs 경로 14개에 한해 실제 unchanged direct dependency hash 확보용 명세 추가. 변경 파일 8개와 이전 A 결과는 재사용, #3768 TS 실패 재시도나 새 권한/검사 경로 추가 없음. #3797 CI/병합 및 A 실제 결과는 미완료. TS는 별도 설치 계약 불일치 남음.
- 기존 installed Core의 CNN current 게시 루프는 stored_at 조건과 readback을 쓰지만 새 minute publisher와 동일 CAS 함수는 아님. 동시 게시의 정상/경합 조건 및 Sidecar archive 동시 쓰기 보호 검증 필요. R3 고정 APPROVED는 source/config/Writer receipt 모두 해당 SHA를 요구한다. 신규 Writer install SHA를 모르는 상태에서 R3 pin만 현재 d8ac2450…로 교체해도 다음 Writer 설치 후 다시 불일치할 수 있다. 승인 source lineage를 실제 새 설치 SHA에 연결하는 정규 후속 계약 필요.
- 다음 직접 작업: #3797 CI/병합 후 지정 A 1회 → 실제 dependency identities 및 API 호환성 대조, TS installed contract 별도 해결 → 정확 최종 B 및 Sidecar 복구 → 실제 60초 검증. 아직 B 승인/운영 설치/공급자 호출/DB/D1/예약/배포 변경 없음.

### 16-1. 직접 의존성 A 요청

- #3797 CI 2/2 SUCCESS ([Secret 45794831122](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45794831122), [C996 45794831136](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45794831136)); main merge 5475202f9824a1c65e326756586f32164e22df64.
- [#3798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3798) 기존 A급 writer-install-preimage-readonly 1회 발행. requestId pc-4f156bb6-948e-46a5-8ae9-d1c0479218cf, 고정 scope SHA256 f00dbe935ea497c8e0cb4afe94628338630e2b9089fbddcc3b6362a055a63ddb, source 0f0bb62e4d4879369e061e9289ed1c79d91f0044. 실제 결과 미회수. 동일 요청 재발행 금지. 신규 운영 변경 없음.


## 17. 2026-11-26 — 직접 의존성 실측·설치 대상 보완 및 Core CAS

- [#3798 실제 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45795171248-1-seat-2.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45795171248-1-seat-2.txt), PASS/WRITER_APPROVED_PREIMAGE_READONLY, 18:47:13 KST. Controller 실제 실행 182bb46f2838306ba40d8b4ec32bac40ab75b69a, config/checkout/checkpoint d8ac2450… 동일. 보호 상태 동일, operational/provider/D1/SQLite write/open 없음. 14경로 중 13 PRESENT, 1 ABSENT. 실제 기능 호환성 또는 현재 Core Runtime source 연결 PASS 아님. A 종결 완료.
- 실제 **lib/cnn-observed-history-r1.mjs ABSENT**. 현재 CNN refresh가 정적 import 하므로 이전 8개 파일만 적용하면 import 실패. 설치 후보에 A(신규 추가), beforeSha256=null, afterSha256=bb8e1692e4a49c28b747804f365c0576328d042ac9616df2a5a7e4c207be5e74 (0f0bb62e… exact GitHub bytes)로 포함. 9개 변경 대상이며 별도 기능/공급자 권한 확대 아님. 아직 B manifest/설치 미실행.

| 보호 의존성 (변경 금지) | 실제 PC SHA-256 | 확인된 소스 대응 |
| --- | --- | --- |
| lib/cnn-index.mjs | cde0a679768aee34a994f5f73b000875478c7c536afdcb38ab9e6e806a994c1d | 0f0bb62e CRLF |
| lib/cnn-observed-archive-r1.mjs | f9cb4c8da02e2175527c389a54563a6f45c6f2815f5af524c27b071a6059ec63 | 0f0bb62e raw |
| lib/market-score/live-refresh.mjs | ea4368c62e7cec7746393c2379802044c18cbc5ce3d590d1fac503e8f499c05e | 7437c01b9a656396ca8dfff5cc59b195caf042de CRLF; acceptsStoredUpdate 존재 |
| scripts/pc-writer/d1-diagnostics.mjs | eb5ffbcdb56805ca15affac876493217de52b21e0f90f99976bbcff8ddc13037 | 0f0bb62e CRLF |
| scripts/pc-writer/d1.mjs | 10beefecc524b569eba9abf826036fc8e069b4b6f0c3b3340a7bd6a5ab6353a5 | 0f0bb62e CRLF |
| scripts/pc-writer/local-db.mjs | 0f9fae1bd16d515f83bf187bc20c4aa1222d741bba9c7f3fe945d2a1cb39f38e | 0f0bb62e CRLF |
| scripts/pc-writer/local-env.mjs | 8b5a4f388ebbc94c37d6d50478344e4666140f1bee5d70c9315dfde1e584029c | 0f0bb62e CRLF |
| scripts/pc-writer/publication-guard.mjs | 75b2ef617becd7ef3ba3d4392d9a146edffb01fb5037f1c7fd30f36a06634fb3 | 0f0bb62e CRLF |
| scripts/pc-writer/quota-fetch.mjs | 5ff750e1abf607e4a207bed16c20394406ca2ba8fe4ca42e2c514a155c87818b | 58a8d800738384437d4acc24c9e12fb0fa804df8 raw; createQuotaFetch/fetchR6WithLease 유지 |
| scripts/pc-writer/quota-policy.mjs | 8559df2b2eb3fd228cbb9c825ca2bfddd01d07c30991771b64b6bc9f1aa89963 | abb2e0807e939c1c656f248245c424e54e6954de raw |
| worker/market-operational-store.mjs | 330b29c25dafb63e5b8fdd75ecf52e886480e7d44b40e2dc9d7d3643e952ef8b | W04 R54 승인 after와 일치, base c4af0ecf… + 2삽입. 전체 원본 아직 미복원 |
| worker/public-display-freshness.mjs | abdf00a5c1c5c7ae9e978dd27ceb1c4c572e15ac67c0378cc971204129714878 | 0f0bb62e CRLF |
| worker/public-feed-input-safety.mjs | 1d4dd5e1039a538d314a9f9b122aef89bfb2f4d21867582c32a6352ff1699fa8 | 0f0bb62e CRLF |
| worker/feed-collectors/fear-greed.ts | d0422e663218ba113fb5ec2ad0167236f58337f8d6d896f8e7028b9b983fbdcb | 0f0bb62e CRLF |
| worker/public-feed-collectors.ts | cd36fe7e754604d7df9404418e9d0dd480afd09a4d55ede937dd27dea6ca9373 | 0f0bb62e CRLF |

- #3768 기존 실패 이후 실제 Controller 변경(독립 #3774 설치 증거, #3798 실행 182bb46f…의 preimage-manifest-contract blob e32ad0bf…에서 두 TS allowlist 확인, 이전 53fe24e… blob 35cd662c…에는 없음). 환경 변화 근거로 기존 정확 TS scope에 대해 신규 requestId pc-74f427d4-9d50-4e0c-9bfb-2cfc7f66be8d, [#3800](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3800) 한 번 실행. [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45795567743-1-seat-1.json)/[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/45795567743-1-seat-1.txt) PASS, 보호 동일, 실제 실행 182bb46f…, 2/2 존재 및 exact CRLF 일치. TS 두 파일 교체 불필요, 보호 대상으로만 명세. #3800 completed closed. 기존 #3768 실패 소급 변경 없음.
- 의존성 16/16 상태 실측: 기존 15개(14개 정확 원본 대응, 1개 W04 승인 lineage hash 일치/전체 bytes 미복원), 추가 필요 1개. 실제 모듈 통합 실행은 별도.
- Core 일반 게시 루프도 분 전용 게시기와 같은 CNN current CAS를 사용해야 한다. 현대 개발 run-local은 이미 공유 publishCnnCurrent 호출을 포함하지만, 운영 R1 삽입 명세는 CNN CLI만 추가하여 legacy Core 경로를 유지했음. 이를 현재 설치 원본을 다시 정확 복원한 뒤 CNN 분기에 한해 공유 함수 호출로 정정. [PR #3803](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3803) HEAD 9cd69c518f0ae8792127bd30cb75ea8ae01d913f, 기존 #3793 첫 삽입 유지 + 기존 generic feed read 직전 CNN-only 분기 1개. 다른 feed/ER1/R44 보존. R2 projected after 92d98c3cbc115ddef3773e19c3cd200653d35c2f6d16caee495fe08e68d8a13f; old #3793 after 431409ea…는 R1 증거이며 R2 운영 후보로 사용 금지. CI ZGMINI PC Secret Scan in_progress (45796365915); C996 R5 Readonly Source Checks completed/success (45796362949). R2 실제 Preview 미발행.
- 다음: #3803 CI 및 R2 preview → W04 store 원본/공유 lease 호환 확인 → 9개 변경 파일 및 15개 보호 모듈과 실제 launcher hash를 정확 B manifest에 연결 → Sidecar 정규 복구와 60초 실증. 새 Sidecar pin/실제 설치 SHA 계약은 미해결. 운영 B/파일/DB/D1/예약/배포/공급자 변경 없음.


## 18. 2026-11-26 — Core CAS R2 실측 및 9파일 Writer B 통합 명세

- #3803 CI 2/2 SUCCESS ([C996 45796362949](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45796362949), [Secret 45796365915](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45796365915)); main 병합 e0d87fbd218f5dac19386e1c663633f6f9134006.
- [#3804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3804) 신규 R2 A Preview requestId c4e4be53-32d3-4eaf-9510-4a243a5f4d32, spec SHA256 d10e82a275a9dd33e1007d7e352af10610196b45a6062bcd60f765dbb8d5494d. [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3804-c4e4be53-32d3-4eaf-9510-4a243a5f4d32.json)/[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-insert-preview-3804-c4e4be53-32d3-4eaf-9510-4a243a5f4d32.txt) 직접 회수, PASS_READONLY. 실제 before a96c0c7c… → after 92d98c3cbc115ddef3773e19c3cd200653d35c2f6d16caee495fe08e68d8a13f; 2삽입, base d8ac2450…, XML dd81987c…, 모든 운영 쓰기/호출 0. 당시 Core relatedProcesses=1, lock present, drain 미준비. completed closed. 이 after만 R2 설치에 사용하고 R1 #3793 기록 보존.
- 마지막 보호 모듈 worker/market-operational-store.mjs: 기존 GitHub 53c838dd18cdd894df79fa9c72d2ad5266403387 CRLF → SHA c4af0ecfec524e1b6c93e7cfb1ec1187ee1346f76e7bc7d5cfd2a27a3038d074 일치. W04 R54 승인 명세의 2삽입 적용 → 7802 bytes, 실제 #3798 SHA 330b29c25dafb63e5b8fdd75ecf52e886480e7d44b40e2dc9d7d3643e952ef8b 완전 일치. claim/finish 기존 lease_id, 180000ms lease와 소유자 CAS 유지 확인. 보호 15/15 원본 대응 완료; 실제 통합 실행은 미검증.
- [#3806](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3806), HEAD 6abc20edb18ec6f7f03f157918faddfdb5e15f09. 정확 기존 범위 Writer B manifest approvals/writer-updates/w06-cnn-minute-ninefile-20261126.json 작성. 8 M(4 insert, 4 full) + 1 A(필수 미설치 history module), 보호 15, 실제 launcher/sidecar 소비자 3, Core XML 고정. candidate 0f0bb62e… (개발 4/4 PASS) 및 실제 base d8ac2450… 고정. 기존 자연 유휴 설치 계약만 사용, 별도 연장 drain/새 예약/공급자/DB/D1/Task definition/다른 source 변경 허용 없음. 실제 영수증과 명세 대조 회귀시험 추가. CI 상태 C996 R5 Readonly Source Checks queued (45798139698); ZGMINI PC Secret Scan queued (45798139707). 이 PR은 실제 설치 실행이 아님.
- Sidecar R3는 기존 preimage와 APPROVED 고정 source 불일치로 여전히 blocked. Writer B는 실제 설치 로컬 합성 SHA를 반환하므로 현재 d8ac2450… 또는 개발 0f0bb62e…를 다음 Sidecar 승인 source로 추정하지 않는다. 실제 B 설치 영수증과 기존 승인/보호 계약에 연결된 후속 Sidecar 명세 필요. 기존 R3 재발행 금지. #3745의 Controller/TS 해결 증거는 본 W06의 #3800 결과와 동일 범위로 재사용.
- 다음 직접 실행: #3806 CI/병합 및 승인 범위 정규 B → 실제 source/config/파일 설치 영수증 회수 → 실제 설치 SHA 기반 Sidecar 복구 → 승인된 60초 실행 연결 및 실제 HTTP/SQLite/D1/API/UI 검증. 운영 설치·예약/공급자/DB/D1/배포 변경 없음.


### 18-1. 통합 명세 C996 실제 시험 통과

- #3806 exact HEAD 6abc20edb18ec6f7f03f157918faddfdb5e15f09, [C996 Run 45798139698](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798139698), 실제 job 139834012371 로그: SCOPED groups=writer extraTests=1, 기존 Writer 135/135 PASS + W06 exact nine-file scope 시험 1/1 PASS; 별도 5/5 PASS. Secret Scan [45798139707](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45798139707)는 마지막 조회 QUEUED. 통합 명세 CI 1/2, 병합/설치 미실행.
- 기존 pc-writer-b-source-once.yml의 exact approval 검증 → candidate SHA checkout → generic source transaction 경로 확인. Workflow 활성 상태 전용 API는 현재 도구에서 조회 제한; 최근 실행 선례 및 기존 정규 경로는 보존. 동일 설치 manifest의 실제 B Issue는 미발행.
- 다음 직접 실행: Secret Scan 결과 확인 후 #3806 exact HEAD 병합 및 승인 명세 바이트 SHA 고정 → 신규 고유 Writer B request 1회 → JSON/TXT 영수증 회수. 실제 운영 SHA 없이 Sidecar pin 선변경 금지. 추가 운영 변경/공급자 호출/예약/DB/D1 없음.


## 19. 2026-11-26 — Sidecar R3 후속 계약 (소스 수정)

- #3806 통합 manifest exact HEAD 6abc20ed… C996 136/136 PASS 유지. Secret Scan 마지막 조회 queued / 미확정. 동일 대기 Run 재발행/우회 없음.
- [#3811](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3811), HEAD 061b6d8b1d04876450a816dbbf231ec090d96f18. 실제 설치 R3 AFTER 583297b451f168a32a2a5de4b0b04c9b14449aab9a041c954a420203cf04f188만 후속 V2의 고정 before로 인정. 기존 V1 고정 PREIMAGE와 기존 승인 형식은 그대로 유지. V2 후보의 단일 APPROVED SHA literal을 이전 e4b76853…로 역치환했을 때 **전체 실제 R3 바이트 SHA** 일치해야 함. manifest installedHead=configSource, exact pinned candidate SHA/bytes, 기존 task/wrapper/lease/backup/CAS/rollback 검증 유지. 잘못된 pin·다른 파일/바이트·V1 재실행·기존 권한 변경 거부 시험 2개 추가. 별도 승인 manifest/실제 후속 pin 후보는 Writer B 실제 설치 SHA 이후에만 확정. 신규 workflow/예약/권한 추가 없음.
- CI ZGMINI CNN Sidecar B Source Contract CI queued (45799496118); C996 R5 Readonly Source Checks queued (45799496164); ZGMINI PC Secret Scan in_progress (45799496004). 운영 #3745 복구 완료 아님.
- 다음: #3806 CI 2/2 성공 시 정규 B 1회 제출, 실제 설치 영수증 회수. #3811 CI/병합 후 실제 설치 source SHA로 R3 단일 literal 교체 후보 및 정확 V2 manifest 확정. 기존 Core와 Sidecar의 별도 60초 지속 실행 연결 및 공급자 허용 범위는 여전히 미완료. 운영 쓰기/DB/D1/예약/공급자 호출 없음.


### 19-1. Writer B/Sidecar V2 전체 CI 성공 및 정규 운영 설치 발행

- #3806 exact HEAD 6abc20edb18ec6f7f03f157918faddfdb5e15f09 CI 2/2 SUCCESS (C996 45798139698, Secret 45798139707), main squash 6d01c2e89693b7eb535ccf8ee96c299d7ba6a9af.
- #3811 exact HEAD 061b6d8b1d04876450a816dbbf231ec090d96f18 CI 3/3 SUCCESS (Secret 45799496004, Sidecar 45799496118, C996 45799496164). 실제 Sidecar isolated-source job 139838692321 로그 회수: 59/59 PASS, 0 fail, 0 skip, 신규 R3 V2 두 시험 PASS. main squash 8acf9284acfc897a0b3024c89d3b39dfd6142e61. 기존 V1 승인·실제 R3 설치 해시 보존.
- [#3812 정규 Writer B](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3812) 고유 requestId 81857ab9-a467-49a5-8453-42ff8a522f97, chatId 8c83c47c-8117-4b44-9bc8-d53f340197b3, manifest approvals/writer-updates/w06-cnn-minute-ninefile-20261126.json, SHA256 2641e42ff01e68512e4525dedbce12cfb5d2e90e7cd1cf8aa2753872edb0c01e (main과 merge commit 원문 동일). 기존 승인 9파일 scope/15 protected/3 consumer/실제 base d8ac2450…/candidate 0f0bb62e… 고정. 자연 유휴 경로만 적용; 별도 drain 확대·예약 변경·공급자 호출·DB/D1 변경 승인 없음. 신규 설치 Issue 단회 발행, 실제 receipt 미회수. 같은 요청 중복 금지.
- 다음: #3812의 실제 JSON/TXT (results/writer-b-source-install-81857ab9-a467-49a5-8453-42ff8a522f97.*), 설치 status/code, actual installed local SHA, config/Task/protected readback 회수. 실패 시 실제 firstFail에 따른 최소 수정/복구, 성공 시 실제 새 installed source SHA에 결합한 Sidecar V2 단일 literal 후보와 정확 manifest 작성·검증. 60초 실행 연결 및 실제 HTTP/SQLite/D1/API/UI 미완료. CI 및 발행은 설치 성공이 아님.

## 20. 2026-11-26 — Writer B 자연 유휴 차단 원인 및 표준 360초 해결

- [#3812](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3812) 정규 B 단회 Run [45800041748](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45800041748), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-source-install-81857ab9-a467-49a5-8453-42ff8a522f97.json)/[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-source-install-81857ab9-a467-49a5-8453-42ff8a522f97.txt) 2/2 수신. `WRITER_B_PREFLIGHT_STOP/WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`: 360000ms/147 samples, active 146, ready 1, unknown 0, 최대 연속 준비 1. sourceSha null, prepared commit 없음. **설치 성공 아님**. 설치 전 유휴 대기 실패; 원래 B 요청은 재요청 금지. #3812 상태 `closed/not_planned`, 증거 보존.
- 실제 원인 조건: 기존 9파일 명세는 `coreMaintenance` 옵션 미포함. 공통 `performWriterBInstall`은 이 경우 원본/후보 검증 후 `waitForCoreIdleWindow`를 실행하고, 연속 2회 준비가 나오기 전 claim/backup/Task 변경을 수행하지 않음. 관측 결과는 Core가 계속 실행 중이었음을 보이며 Core root cause (개별 장기 처리 작업)는 별도 미입증. 대기 실패를 손상·코드 오류로 오판하거나 같은 대기를 반복하지 않음.
- 정규 해결 [PR #3817](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3817), HEAD `bffaa7183b4fd2a71fcd05b48588f166590dad3c`, C996 [45801765538](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45801765538) SUCCESS (기존 Writer 135/135 + 신규 scope 1/1), Secret [45801765606](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45801765606) SUCCESS, main merge `dc975c4dd05e7e092db785e3457b0fc5d3944043`. 기존 명세를 byte-equivalent 복제하고 **오직** `coreMaintenance:"PAUSE_NEW_STARTS_DRAIN_360S_V1"` 추가. 기존 source/9파일/15 protected/3 consumer/Task SHA 및 5개 false effects 동일. 이 표준 유지보수는 새 예약을 만들지 않고 Core 신규 시작만 잠시 억제한 뒤 최대 360초 자연 종료(강제 종료/lock 삭제 금지), CAS·백업·Task 복구를 수행. 1200/2400초 확대 없음.
- [#3818](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3818) 신규 고유 B 요청 `2bf33e8b-5bd4-4e56-a9ce-3a0a763cda02`, 승인 파일 `approvals/writer-updates/w06-cnn-minute-ninefile-pause360-20261126.json`, 원문 SHA256 `d7b68d89d428126e919ceb0156f5a64666a792ea81898dff9deefbe259f795bf`를 main 및 merge commit에서 비교 고정, 정규 label 사용. 현재 결과 JSON/TXT 미회수. 동일 요청 반복 금지, 실제 PC source/config/Task 복구 확인 전 다음 B 발행 금지.
- 다음 행동: #3818 결과 영수증 2/2 직접 회수, 실제 status/code와 preparedLocalSha/provenance 및 원본 복구 여부 확인. 성공이면 실제 설치 SHA를 기반으로 Sidecar V2 단일 source pin 후보/승인·실제 실행. 실패이면 구체적 failure 조건·보호 상태 확인 후 최소 수정. 이후 기존 60초 실행 연결·공급자 허용 정책과 저장→게시→API/UI 종단 증거를 확보. 이번 GitHub 변경 자체는 PC 설치·D1/공급자 호출·60초 운영 증거 아님.

### 20-1. Writer B 운영 설치 성공 및 실제 Sidecar 소스 핀 후보

- [#3818](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3818) Run [45802270334](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802270334), 정규 JSON/TXT [결과쌍](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-source-install-2bf33e8b-5bd4-4e56-a9ce-3a0a763cda02.json)·[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-source-install-2bf33e8b-5bd4-4e56-a9ce-3a0a763cda02.txt) 직접 회수/대조: **WRITER_B_INSTALLED_VERIFIED / WRITER_B_INSTALL_VERIFIED**. 설치 대상 정확 9파일. 실제 source SHA `393cee0da46515ff056543173fcd1253a858b3d7` (PC 로컬 전용 overlay, GitHub commit 아님), base `d8ac245003e7b8e006c2345382d5c639c6d5f18b`, candidate `0f0bb62e4d4879369e061e9289ed1c79d91f0044`, 승인 manifest `d7b68d89d428126e919ceb0156f5a64666a792ea81898dff9deefbe259f795bf`, base tree `0196ec05fd0c15dbdc094443115ace0a4b375f85`, prepared tree `517718bc9f5d6935262b890b539360173f7d0e96`, provenance `afe5a29d042700cd53d5df40e82d48a8d76f1d126af4b02e9b676c1d50938cbf`. Task/source/config 사후 검증은 설치 영수증 범위에서 통과. Core·다른 지표 실제 자연 실행/저장/게시 완전성은 별도 미검증. 동일 B request 재발행 금지.
- 실제 설치 SHA로 정규 Sidecar V2 후보 생성: [#3822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3822), source HEAD `e8d226d9572d6de7bb24b9f62ac2bf6b30715607`. 원본 `sidecar-b/approved/archive-run.mjs` R3 SHA256 `583297b451f168a32a2a5de4b0b04c9b14449aab9a041c954a420203cf04f188`는 변경하지 않음. V2 별도 고정 후보 `sidecar-b/approved/archive-run-w06-v2.mjs` 11478 bytes, **APPROVED source literal 1곳만** `e4b768530335182f422ebd51d163a6f5b754361c` → 실제 설치 `393cee0da46515ff056543173fcd1253a858b3d7`; 목표 SHA256 `eb3c43bf8fba6ea4e51f3e84b77f9ec13000db9d9e38077ffd914950d7080b6b`. 이를 역치환하면 원본 R3 모든 바이트가 복원됨. 후보 경로는 검증된 V1/V2 스키마로만 선택되며 임의 경로/해시 공급 불가. 기존 V1 후보·승인/설치 계약 보존. 신규 시험 2개 추가, CI 실행 중. Sidecar V2 운영 적용은 아직 없음.
- 다음 단계: #3822 CI 3/3 검증 및 main 병합 → 실제 후보 커밋 고정한 신규 단회 Sidecar V2 승인 manifest 작성/시험/병합 → 정확 requestId의 정규 Sidecar B 실제 결과 영수증 수신. Sidecar 자연 유휴 240초 경로는 기존 계약이며 readiness 사전 보장 아님. 이후 CNN `--cnn-minute`의 실제 지속 60초 트리거와 공급자 허용·429 정책·SQLite/D1/API/UI 종단 검증. 운영 Writer 설치 성공을 60초 운영 완료로 해석하지 않음.

### 20-2. Sidecar V2 정규 승인 및 실제 설치 요청

- Sidecar 고정 후보 [#3822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3822) HEAD `e8d226d9572d6de7bb24b9f62ac2bf6b30715607`, isolated-source Run [45802823081](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802823081) 61/61 PASS, C996 [45802823090](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802823090) SUCCESS, Secret [45802823107](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802823107) SUCCESS. `main` 병합 `0aa4f5af3610a54306d2190f64a8108a658d77e3`. 실제 후보 SHA256 `eb3c43bf8fba6ea4e51f3e84b77f9ec13000db9d9e38077ffd914950d7080b6b`, 원본 R3 `583297b4…` 그대로 보존.
- Sidecar 승인 명세 [#3823](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3823) HEAD `27579e3b7963382b6a15f969c7516d23804e0530`, CI 3/3 SUCCESS, `main` 병합 `422746dc85718b4d05ad99e1c7607da47d0345df`. 승인 파일 `approvals/sidecar-b/w06-cnn-r3-installed-writer-v2-20261126.json` 원문 SHA256 `1351b5012857cff77f03147c1bf5dde3935f00e9ac6d3e640e13b00ce0639693`; approvedSourceSha는 별도 고정 후보 `e8d226d9572d6de7bb24b9f62ac2bf6b30715607`, PC installedHead=configSource `393cee0da46515ff056543173fcd1253a858b3d7`, Core Task XML `dd81987c…`, 원본 wrapper `9d5bc342…`. 모든 provider/DB/D1/Task 변경 효과 false.
- [#3825](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3825), 신규 고유 Sidecar B requestId `89db2120-3cb8-4fa5-b347-987c4d73c520`, request schema `ZGMINI_CNN_SIDECAR_ONEFILE_B_REQUEST_V1`, controlHead `0aa4f5af3610a54306d2190f64a8108a658d77e3`, manifest 위 SHA로 fixed approved once 워크플로 발행. 실제 PC 영수증은 마지막 확인 당시 **미회수**. 같은 요청 반복 금지. 240초 자연 유휴 관측은 기존 B 계약이며 자원 점유/원본 drift가 발생하면 별도 안전 STOP, 자동 재시도 금지.
- 다음 직접 실행: #3825 Run/JSON/TXT 직접 회수. 성공하면 Sidecar R3→V2 실제 target after SHA/기존 Task 복구 readback과 자연 Core 동작 검증, 실패 시 정확한 stop/resource condition으로 최소 수정. **설치 성공은 60초 수집 주기를 입증하지 않음**. 현재 후보 `--cnn-minute`는 명시적 CLI 분기이므로 기존 실행기에서 60초로 자연 호출하는 실제 PC trigger/허용정책 확인이 남음. 이후 원자료 SQLite·D1·API·홈페이지 PC/모바일 종단 확인. 이 원장에는 미검증 60초 운영 완료로 표시하지 않음.

### 20-3. Sidecar B 읽기 전용 유휴 관측 STOP

- Sidecar B [#3825](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3825), Run [45803898362](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45803898362), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/cnn-sidecar-b-89db2120-3cb8-4fa5-b347-987c4d73c520.json)·[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/cnn-sidecar-b-89db2120-3cb8-4fa5-b347-987c4d73c520.txt) 2/2 직접 회수: `SIDECAR_B_PREFLIGHT_OR_RUNTIME_STOP / SIDECAR_B_IDLE_WINDOW_OBSERVATION_STOP`, applied=false, changedFileCount=0, before/after readback UNKNOWN, backupVerified=false. 승인 원본 및 후보 checkout은 성공, **실제 소스 교체 이전의 자연 유휴/자원 관측이 중단**. 관측 오류를 Core active 원인으로 단정하거나 동일 B request 재실행 금지. Writer B #3818 성공·sourceSha `393cee0d…`는 유지.
- 기존 `sidecar-b/natural-idle-window.mjs`는 resource flags의 `coreQuiet/sidecarActive/controllerInstallBusy/sharedWriterLockPresent`가 모두 boolean PASS여야 진입하며 관측 exception/null은 `SIDECAR_B_IDLE_WINDOW_OBSERVATION_STOP`으로 fail closed. 오류 코드만으로 어느 field가 null인지 미확정. 기존 `tools/pc-process-inventory-readonly.mjs`에 **정확히 동일한 resource projector를 읽는** `cnn-sidecar-b-resource-readonly` A probe가 있어 새 Controller/스크립트 없이 재사용.
- [#3830](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3830) 운영 PC 읽기 전용 requestId `d71e90b2-caae-4251-8bd3-508f5e5cf111` 1회 발행. A 결과 미회수, 다른 업무 lock/Task/source/DB/D1/공급자 변경 0을 요구. 실제 field 상태 회수 후 원인 가설을 구분하고 필요한 최소 수정만 선택. 이전 #3296 PASS resource 결과는 당시(11월 24일) 관측이며 현재 source/config/OS 상태를 보장하지 않음.
- 독립 본체 #1644 HEAD `90312c7311b7892cc62430229666b25bfeea453b`: Source Secret, Node.js, CodeQL 3/4 SUCCESS, Browser UI 진행 중. 여전히 Draft; Production Git Integration 빌드/배포/실화면은 미수행. 실제 CNN 60초 지속 수집/SQLite/D1/API 종단 미검증. Sidecar 원본 `archive-run.mjs` 583297b4… 유지, V2 설치 성공 주장 금지.

### 20-4. Writer 운영 완료 재대조 · Sidecar 자원 진단과 후속 승인

- Writer B #3812 실제 Run 45800041748 `WRITER_B_PREFLIGHT_STOP/WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`: 147개 유휴 표본 중 146 ACTIVE, 1 READY, 연속 READY 최대 1. 이 B는 설치 전 정지했고 단회 요청 소진. 요청 재실행 금지.
- 해당 실패 조건에 기존 공통 `PAUSE_NEW_STARTS_DRAIN_360S_V1`를 정확히 추가한 #3817은 main 병합 및 CI PASS, 별도 신규 #3818 [Run 45802270334](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802270334), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-source-install-2bf33e8b-5bd4-4e56-a9ce-3a0a763cda02.json)/[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-source-install-2bf33e8b-5bd4-4e56-a9ce-3a0a763cda02.txt) 실제 2/2 일치. `WRITER_B_INSTALLED_VERIFIED/WRITER_B_INSTALL_VERIFIED`, 변경 파일 9개. 실제 로컬 overlay HEAD `393cee0da46515ff056543173fcd1253a858b3d7`, 후보 GitHub HEAD `0f0bb62e4d4879369e061e9289ed1c79d91f0044`, 이전 PC base `d8ac245003e7b8e006c2345382d5c639c6d5f18b`, manifest SHA256 `d7b68d89d428126e919ceb0156f5a64666a792ea81898dff9deefbe259f795bf`는 구분한다. 적용 완료는 운영 소스/설치 영수증 범위이고 60초 CNN 관측·SQLite/D1/API/UI 운영 완료는 아님. #3818 completed closed; 중복 신청 금지.
- Sidecar V2 실제 후속 pin 후보 #3822, 승인 #3823 완료 후 첫 단회 #3825 [Run 45803898362](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45803898362), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/cnn-sidecar-b-89db2120-3cb8-4fa5-b347-987c4d73c520.json)/[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/cnn-sidecar-b-89db2120-3cb8-4fa5-b347-987c4d73c520.txt) 2/2는 `SIDECAR_B_PREFLIGHT_OR_RUNTIME_STOP/SIDECAR_B_IDLE_WINDOW_OBSERVATION_STOP`, `applied=false`, 변경 파일 0. 후보/승인 사전 인증은 정상, 원인은 네 자원 flag 중 결측/예외 가능성이며 실측 시점 특정 flag는 미입증. Core 바쁨으로 단정하지 않는다. 동일 B 재실행 금지.
- 독립 A #3829는 Run 45804819340에서 checkout 단계 CANCELLED, 측정 결과 없음. 그 취소가 Sidecar 문제를 설명하는 증거는 아니다. 후속 [#3830](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3830) [Run 45804999599](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45804999599) [실제 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45804999599-1-operating.json)/[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45804999599-1-operating.txt) 2/2 검증: `PASS/CNN_B_RESOURCE_SNAPSHOT_COLLECTED`, 2026-11-26 19:54:01 KST 실측 `coreQuiet=true,sidecarActive=false,controllerInstallBusy=false,sharedWriterLockPresent=false`, 쓰기·provider·D1 모두 0. 이 표본은 다음 B 실행까지 자원 유휴가 유지됨을 보장하지 않는다.
- 독립 새 자원 증거에만 근거한 #3833 V2 승인 수정 main 병합, [#3836](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3836) 새 고유 requestId `4b28c137-b01e-4dd0-907c-6e9f7b99e04a`, 동일 목표 R3 before `583297b4…`/source `393cee0d…`/approved candidate `e8d226d…`이며 새 승인 파일 `approvals/sidecar-b/w06-cnn-r3-installed-writer-v2-ready-20261126.json`의 새 1회 요청 진행. 본 원장 기재 시점 실제 #3836 JSON/TXT 미회수; 중복 발행/재실행 금지.
- 60초 자동 자연 실행은 여전히 별도. 이전 A 프로세스 목록(2026-11-26 09:29 KST)은 Core Task와 다른 예약 목록만 식별하고 분 단위 CNN 전용 Task를 보이지 않았으나 현재 전체 Task trigger 정의/새 minute lane 연결 여부를 입증하지 않는다. `--cnn-minute` CLI 구현과 실제 연속 60초 공급자 HTTP 수집은 구분한다. 공급자 정책, 기존 Runner 경로 승인 및 D1 readback 확인 후 증거로 종결한다.

**다음 최소 필수 실행:** #3836 실제 결과를 조회해 Sidecar 성공 시 해당 후속 source/readback을 확인, 실패 시 다른 자원 상태 표본과의 차이를 확인한다. 이후 기존 실행 계약에서 실제 1분 트리거가 있는지 검증하고 승인된 경로로만 연결, 신규 자연 요청시각·원자료 저장·D1/API/UI를 확인한다.

### 20-5. #3836 실제 Sidecar STOP 및 결과쌍 전달 문제 분리

- [#3836](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3836) 실제 Run [45806461623](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45806461623), job 139862947466 원본 로그 확인: 2026-11-26T11:00:53Z 후보/승인 preflight PASS 후, 11:01:18Z 시작한 Sidecar 파일 설치 단계는 11:05:22Z `SIDECAR_B_PREFLIGHT_OR_RUNTIME_STOP / SIDECAR_B_PROBE_RESOURCE_STOP`으로 종료. 240초 자연 유휴 관측의 안전 STOP 또는 다른 자원 소유자 충돌 가능성만 확인되며 정확한 predicate는 영수증에 없음. `applied=false`, `changedFileCount=0`, `backupVerified=false`, preimage/after readback null. 원본 Sidecar와 성공한 Writer #3818 설치 상태를 자동 무효화하지 않는다.
- 같은 Run의 reporter는 **별도 실패**: [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/cnn-sidecar-b-4b28c137-b01e-4dd0-907c-6e9f7b99e04a.json) 원격 존재와 정확한 requestId/실패 코드를 확인했으나 같은 경로의 TXT는 404; 댓글 [#7190253928](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3836#issuecomment-7190253928)과 실행 로그 모두 `SIDECAR_B_STATE_UNKNOWN / SIDECAR_B_REPORT_READBACK_STOP`, 결과쌍 1/2. 이 결과를 `RESULT_PAIR_READBACK_VERIFIED`로 소급하지 않으며 기존 B를 재실행하거나 과거 TXT를 원본 영수증처럼 생성하지 않는다. #3836 completed closed는 **요청 소진**이지 Sidecar 설치 완료가 아니다.
- 운영 자원 분리: 이전 #3830 A는 10:54:01Z 순간 4 flag READY였을 뿐 11:01~11:05Z 성공 보장 아님. 기존 정확 A `cnn-sidecar-b-core-readonly` 신규 [#3839](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3839) requestId `09d5e0af-27e8-48ef-a8b1-58a2b28f957f`가 별도로 발행되어 Task state/instances/core process/unknown process/local cycle lock 비교 진행 중. 같은 A 중복 발행 금지. Sidecar 실측 후 중단 조건을 분리하고 정규 승인 범위의 최소 경로만 후속 적용한다.
- 별도 독립 실제 코드 결함: 기존 Sidecar reporter는 JSON/TXT를 GitHub Contents API로 순차 `PUT`하여 한 파일만 저장되는 상태를 허용했다. 기존 공통 `writer-config-b/result-pair-atomic.mjs`는 두 결과를 **한 커밋/단일 비강제 main CAS**로 작성하고 바이트 readback을 검증한다. 이를 재사용한 [제어 PR #3840](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3840), HEAD `9cce021e41f1c72f378584f9f7e38b88df68f636`: 변경 2파일 `sidecar-b/report.mjs` 및 `sidecar-b/report.test.mjs`. 격리 시험은 두 파일 동시 성공, branch CAS 실패 시 미기록, PATCH 응답 유실 readback, 경쟁 main fast-forward, 기존 영수증 overwrite 거부. 신규 실행기·B 재승인·Sidecar 원본·Task·Writer·공급자·SQLite/D1 변경 없음. CI 미확정; **현재 과거 #3836 결과쌍 실패의 소급 복구가 아님**.
- W06 기능 최종 미완료: 실제 60초 자연 트리거, CNN 원본 HTTP/SQLite 관측·D1/API·차트/모바일 운영 readback. `--cnn-minute`는 승인된 명시 CLI 분기이며 5분 Core의 동작만으로 분당 수집 완료라 할 수 없음. 실행기 연결의 정확한 Task/사용 권한·공급자 허용 정책 확인이 별도 필수.

**다음 직접 행동:** #3839 A 실제 JSON/TXT 회수 및 자원 원인 식별 → #3840 exact-head CI 회수·문제 수정·정규 병합 → Sidecar는 실제 원인/충돌이 구분된 경우에 한해 새 정확 B 승인과 정상 유휴/lease로 설치 → 기존 실행기의 CNN 60초 경로 확인 및 실제 종단 검증. 동일 B requestId 재실행 금지.

### 20-6. Sidecar 결과쌍 원자적 게시 수정 검증 및 통합

- 직접 발생 #3836의 `SIDECAR_B_REPORT_READBACK_STOP`은 별도의 **순차 JSON/TXT create-only PUT 부분 게시 결함**임. 이전 B 파일 변경 0 및 `SIDECAR_B_PROBE_RESOURCE_STOP`과 분리. 기존 보고서 생성 단계만 수정한 제어 [PR #3840](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3840) HEAD `9cce021e41f1c72f378584f9f7e38b88df68f636`, CI [Secret 45808001447](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45808001447) SUCCESS, [C996 45808001859](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45808001859) SUCCESS, [Sidecar B Source 45808001848](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45808001848) SUCCESS(격리 소스 69/69 PASS, 신규 5시험 PASS). `main` squash `d72cddae07a3c5921a8e373a3a93dfac846c73a8`; PR merged verified.
- reporter는 이제 기존 공통 `uploadResultPairAtomic`으로 **JSON/TXT 단일 Git commit, main non-force CAS, 각 바이트 재조회**를 수행함. 동시 main 변경 시 승인된 경계 내 결과 전용 재결합, 불명확한 PATCH 응답은 커밋 존재만 확인하며 **운영 B 업무는 절대 재실행하지 않음**. 외부 산출물 경로가 이미 존재하면 덮어쓰지 않음. 이 코드는 향후 독립적으로 승인된 PC B Run에만 적용; #3836의 없는 TXT를 원래 생성된 것으로 소급해서 채우지 않음. 원본 #3836은 `JSON 1/2`로 유지.
- 아직 열린 [#3839](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3839) 기존 A 읽기 전용 `cnn-sidecar-b-core-readonly` 결과 미수신. 독립 Core Task instances/process/lock 관측이 모인 뒤 #3836 원인 분리 및 Task/락 소유자 보호를 만족시키는 기존 승인 경로만 적용. 같은 고유 요청 중복 금지.
- 60초 자연 실행의 별도 조건: 기존 `local-cycle.mjs --cnn-minute --publish`는 **명시적 CLI 분기**로 실제 Writer B에 설치되었으나 5분 Core Task와 별개로 60초마다 이를 호출하는 기존 승인 실행 연결은 실측되지 않았음. 독립 예약 생성/공급자 무단 호출 없이 Task 트리거·기존 Runner 계약의 실제 등록·활성·마지막 실행을 확인한다. 이후 실제 HTTP 확인·SQLite 원본·D1/API·PC·모바일 점검한다.

**다음 직접 행동:** #3839 실제 A 결과 회수 → Sidecar 자원 실패의 현재 상태 분리 → 기존 승인 maintenance source 연결·실제 B 보호 보존 → 60초 실행 연결 실증. 결과쌍 업로더 수정 완료를 Sidecar 설치 성공으로 계산하지 않는다.

### 20-7. #3839 A timeout 원인 재현·수정 CI 및 중복 제거

- [#3839](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3839) 원래 A Request `09d5e0af-27e8-48ef-a8b1-58a2b28f957f`에 대응하는 GitHub Run [45807639185](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45807639185), job `139866964148` 로그 직접 회수. 실행 2026-11-26 11:07:16Z → 11:11:43Z, `operating-process-snapshot` CANCELLED. `actions/checkout` 저장소 fetch·sparse-checkout/branch checkout이 11:11:26Z까지 지속되었고 워크플로의 정확 `timeout-minutes: 4`에 걸려 취소. `Collect read-only runtime process snapshot` 단계는 SKIPPED, 실제 Core Task/프로세스/lock 수치는 한 건도 관측되지 않음. #3839를 Sidecar 자원 Ready/Busy 판정으로 사용하지 않는다.
- 해당 결함에 다른 담당자가 이미 동일 정확 범위 [PR #3843](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3843)을 작성. 기존 `pc-process-inventory-readonly.yml`의 **operating-only** A job 제한을 4→10분으로 수정, 다른 job/Runner/권한/업무 범위 불변. 정확 HEAD `832f359ced9fcd824bbd491f4e6e8afb4d9bfb80`의 CI 3/3 SUCCESS (Two-PC Process Inventory #45809048663, C996 #45809048597, Secret Scan #45809048649), main merge `cdbb5247913b97294fbb35de6dc043ec62e2626c`.
- 위 이미 병합된 PR을 최초 확인하기 전 같은 실패 조건에 독립 PR [#3845](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3845) 운영 job 4→8분을 작성했으나, **효과가 중복**인 것을 발견 즉시 병합하지 않고 CLOSED. #3843의 10분 계약을 정본으로 유지; 다른 작업 소스 되돌리지 않음.
- 변경된 10분 계약 및 새 환경을 기반으로 다른 담당자가 **새 고유 읽기 전용 A** [#3846](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3846), requestId `83f2d192-e257-4dc3-ae9c-62e81842c5d1`, 동일 `cnn-sidecar-b-core-readonly` probe 1회 발행. GitHub Run [45809374212](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45809374212) `in_progress` at read, source `cdbb5247…`. 기존 #3839를 재실행하지 않으며 #3846도 중복 발행하지 않음.
- 향후 A 결과의 실제 Core Task enabled/state/instances, Core process 및 unknown process, local-cycle lock, `coreQuiet`를 대조해 #3836의 240초 Sidecar 자원 STOP과 **당시 실측/현재 샘플 차이**를 구분. 필요한 경우 정확한 owner/lease/설치 전 안전 조건만 최소 변경. 60초 자연 실행, D1/API/PC·모바일은 여전히 미검증.

**다음 직접 행동:** #3846 실제 JSON/TXT 및 실행 로그 회수 → 원인 증거와 승인된 기존 Sidecar 계약을 대조 → 가능한 최소 후속 실행 후 60초 종단 검증. 단순 날짜·CI·이슈 CLOSED를 운영 완료 증거로 사용하지 않는다.

### 20-8. 실제 유휴 교대 확인 및 4분 관측창 최소 수정

- [#3846](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3846) A 한 번 Run [45809374212](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45809374212) [실제 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45809374212-1-operating.json)/[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45809374212-1-operating.txt) 2/2 verified: 2026-11-26T11:19:11.242Z, operating PC, `status=PASS`, `taskEnabled=true`, state=3, instances=0, relatedProcesses=0, unknownCoreProcessLines=0, localCycleLock=false, **coreQuiet=true**. 이전 #3839 checkout timeout은 새 A에서 해결됨. 이 관측은 Sidecar #3836의 과거 11:01~11:05Z 원인을 소급 입증하지 않는다.
- [#3847](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3847) 독립 실제 A Run [45809610562](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45809610562) [실제 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45809610562-1-operating.json)/[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45809610562-1-operating.txt) 2/2 verified: 2026-11-26T11:20:20.096Z, `status=PASS`, `coreQuiet=false`, `sidecarActive=true`, `controllerInstallBusy=false`, `sharedWriterLockPresent=false`, `currentPreflightReadyIgnoringLease=false`. **1분 9초 간격의 두 별도 시점에서 Core 유휴→Core/Sidecar 실행을 관측**. 수집 주기를 실제 5분 타이밍으로 확정하는 증거는 아니나 Task/Core 주기의 활성 구간이 있으며 유휴 구간도 존재함을 증명함.
- 이전 Sidecar B #3836은 exactly 240초 자연 유휴 관측 끝에 `SIDECAR_B_PROBE_RESOURCE_STOP` (0 files changed), 이후 #3846/3847은 짧게 존재하는 유휴 창을 다시 증명. `sidecar-b/natural-idle-window.mjs`는 Core 시작을 억제하지 않는 안전 읽기 방식이지만 기존 240초는 5분 Core 정상 주기보다 짧아 유휴 창을 **놓칠 수 있는 설계 조건**이었음. 과거 #3836의 직접 이유가 반드시 이 timeout이었다는 확정은 보류; 즉시 다른 owner를 발견한 STOP도 같은 code. 무조건 Task 멈춤/락 제거 또는 안전 검사 비활성화 금지.
- [제어 PR #3849](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3849), exact HEAD `e6e2c632bf6c953575cd43e05334fc13645a3e15`, 변경 2파일: 기존 Sidecar B **수동 유휴 관측창 240,000→420,000 ms(7분)**만 연장. 5,000ms 기존 poll, controller/shared writer owner 즉시 STOP, 불명/부분 관측 즉시 STOP, lease/CAS/Task/원본/승인/rollback 보호 및 기존 12분 workflow timeout 보존. 새 예약/수집기/권한/PC 쓰기 없음. 305초 후 유휴 첫 발생 및 정확 420초 timeout/잘못된 420001 거부 회귀 2개 추가. 정확 HEAD CI ZGMINI PC Secret Scan queued #45810144470; ZGMINI CNN Sidecar B Source Contract CI queued #45810144448; C996 R5 Readonly Source Checks queued #45810144492, 병합·운영 설치는 아직 없음.
- 지난 §20-7의 더 짧은 중복 PR #3845는 이미 main #3843 10분 A timeout 계약과 효과가 같아 **unmerged CLOSED**, main 표준을 덮어쓰지 않음. #3846/#3847 A와 #3849 Sidecar B 소스 수정은 서로 다른 검증·변경 단계로 분리.

**다음 직접 실행:** #3849 해당 HEAD CI 및 소스 회귀 통과 → 병합 → 정확 이전 R3 대상 해시·실제 Writer HEAD/config·Task/Wrapper·보호 resource를 근거로 신규 V2 manifest와 단회 B (과거 #3836 무재실행) → 실제 JSON/TXT/로컬 결과 회수. 성공 이후 기존 승인 실행 경로 60초 자연 수집·SQLite/D1/API/UI 검증. 사용자 범위 밖 Task/예약 변경 금지.

### 20-9. Sidecar 7분 안전 관측 소스 통합 및 기존 승인 후속 B 명세

- [#3849](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3849) exact HEAD `e6e2c632bf6c953575cd43e05334fc13645a3e15`: Sidecar isolated-source [Run 45810144448](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45810144448) **71/71 PASS**, 신규 305초 후 자연 유휴·420초 안전 STOP 시험 PASS. C996 [45810144492](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45810144492) SUCCESS, Secret [45810144470](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45810144470) SUCCESS; 3/3 PASS. main squash `cce11989c404b31bdbdc9b7450dadf349089da0b` 확인. 실제 PC B 파일 교체/Sidecar 복구 성공은 아님.
- [신규 정확 V2 승인 PR #3855](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3855), HEAD `c2310e0e808cfaa0814fc8ed473b704f275102ec`, 승인 파일 `approvals/sidecar-b/w06-cnn-r3-installed-writer-v2-sevenmin-20261126.json`, 신규 고유 requestId `a7e845b2-39d3-4e52-8500-71c818b37d9f`. 이전 실패 #3836 승인 명세에서 **requestId만 변경**하고 원본 R3 before 583297b4…, candidate after eb3c43…, approved candidate source e8d226d…, 실제 로컬 Writer 393cee0d…, Task dd81987c…, Wrapper 9d5bc…, runCount=1, provider/SQLite/D1/Task effect 금지 유지. 이전 B raw `applied=false` 0개 및 별도 실제 A #3846/#3847 바이트/상태와 결합한 승인 전용 회귀시험 추가. 동일 #3836 replay 불가, #3855 CI 2개 대기 중; 아직 병합/신규 B 요청 없음.
- 동시 독립 PR [#3850](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3850)은 이전 유휴 관측 중 Core/Sidecar 자원표본 계수를 안전 반환하는 진단 개선안으로, #3849와 `natural-idle-window.mjs` 중첩 수정. 기존 보고 검증의 `windowMs<=240000`은 420000으로 증가한 실제 창과 맞지 않음. #3850 댓글로 충돌 및 420000 허용/초과 거부 회귀 필요성을 통보; 다른 작업자 변경을 reset/rebase/강제 통합하지 않음. 현재 #3850은 별도 open 상태. 임의 Task 중지/허용범위 밖 maintenance 권한 추가 금지.
- 진행률은 범위별 확정: Writer 운영 파일 9/9 적용 유지; Sidecar 소스·격리시험 71/71+CI 완료, V2 **승인 명세 신규 PR 검증 중**, Sidecar 실제 설치 미완료; 60초 자연 수집/SQLite→D1/API/UI 미실증. 이 소스 변경 자체로 운영 완료율을 승격하지 않음.

**다음 행동:** #3855 exact CI 2/2 → 병합 후 exact manifest 원문 SHA256 고정 → 현재 자원 충돌 없는 정규 단회 B 요청(실제 CAS/lease/backup/readback) → B 결과 분리 → 승인된 60초 실행 연결·실데이터 공개 검증.

### 20-10. #3855 승인 명세 정확 HEAD 3/3 PASS·main 병합 및 신규 Sidecar B 1회 발행

- [제어 PR #3855](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3855) exact HEAD `c2310e0e808cfaa0814fc8ed473b704f275102ec`: Sidecar isolated-source [Run 45811129737](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45811129737) SUCCESS, C996 [45811129461](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45811129461) SUCCESS, Secret Scan [45811129496](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45811129496) SUCCESS; **3/3 exact HEAD CI PASS**. `main` squash merge `e481f867cc538da0e6f272dd207719d2bd5f36f0` 및 manifest blob `0861629efa27982370c968c9c81bd34d88bdeffb` readback 확인.
- 신규 승인 명세 `approvals/sidecar-b/w06-cnn-r3-installed-writer-v2-sevenmin-20261126.json`: raw SHA-256 **`f4ffaeaba492ae49be0dbcf9ef126c7bf14fc158960115f6315a17110ee3e1d9`** (이전 명세 원문 SHA-256 재현 후 requestId 한 항목만 치환하여 독립 확인). requestId `a7e845b2-39d3-4e52-8500-71c818b37d9f`, 이전 R3 대상 `583297b4…` → 후보 `eb3c43bf…`, 후보 소스 `e8d226d9…`, Writer source/config `393cee0d…`, Task·Wrapper 기존 해시, 효과 1파일·1회, Provider/DB/D1/Task 쓰기 불허. 과거 #3836 재실행 없음.
- [운영 PC 단회 Sidecar B Issue #3857](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3857) 정확 제목 `cnn-sidecar-onefile-b-install` / 기존 label `pc-writer-b-install` / 고유 요청 식별자 / `controlHead=e481f867…`로 단 한 번 발행. [운영 Run #45812105430](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45812105430)에서 출처 checkout·승인 preflight·고정 후보 checkout 단계 PASS, 실제 보호 자원 확인·one-file 트랜잭션 실행 중인 것을 확인. **이 기록 시점 실제 결과 JSON/TXT/파일 교체는 아직 미확정**. 완료 또는 실패는 Run·실제 결과쌍을 별도로 읽어 판정.
- 별개 #3850 자원 집계 진단 개선 PR은 main 충돌 상태의 독립 코드 작업이며 이 승인된 B의 exact source/원본 보호를 소급 변경하지 않음. 실제 60초 자연 수집·SQLite→D1/API→PC/모바일은 여전히 미실증; Sidecar B 소스 CI/병합/접수를 운영 종단 완료로 집계하지 않음.

**다음 직접 행동:** #3857 Run #45812105430 actual status/code, JSON/TXT 2/2·백업/파일 before-after readback 회수 → 성공시에만 기존 승인된 CNN 60초 실행 연결·관측·게시·화면 실증. 실패 시 동일 ID/요청 재실행 없이 실제 stop 근거 분리.

### 20-11. #3857 Sidecar B 실제 운영 1파일 설치·결과쌍·원본 지원 이슈 종결

- [신규 독립 B #3857](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3857) / [실제 운영 Run #45812105430](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45812105430): **completed/success**. 고정 승인 preflight, 후보 checkout, 실제 Windows one-file transaction, 원본 JSON/TXT create-only atomic reporter 단계 모두 SUCCESS.
- 현재 `main/results/cnn-sidecar-b-a7e845b2-39d3-4e52-8500-71c818b37d9f.json` / `.txt` **2/2 원격 직접 재조회**. 실제 영수증 `status=SIDECAR_B_APPLIED_VERIFIED`, `code=SIDECAR_B_EXACT_FILE_READBACK_PASS`, `applied=true`, `changedFileCount=1`, `backupVerified=true`, `controlSha=e481f867cc538da0e6f272dd207719d2bd5f36f0`, manifest SHA256 `f4ffaeaba492ae49be0dbcf9ef126c7bf14fc158960115f6315a17110ee3e1d9`, 정확 before `583297b451f168a32a2a5de4b0b04c9b14449aab9a041c954a420203cf04f188` → after `eb3c43bf8fba6ea4e51f3e84b77f9ec13000db9d9e38077ffd914950d7080b6b`. 신규 requestId 1회 실행, `retry=READ_ONLY_RECONCILE_NO_REPLAY`.
- 설치 영수증은 **파일 1개 교체와 그 byte readback/백업**을 확인한다. Task·Wrapper·Writer source `393cee0d…` 고정 계약 유지, B에는 공급자 호출·SQLite/D1 쓰기·Task 변경 허용 없음. 기존 실패한 #3825/#3836 절대 재실행하지 않음. 신규 B 원본 Issue #3857은 성공 결과 댓글 확인 후 **CLOSED/completed**.
- 원본 공통 지원 [#3745](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3745#issuecomment-7191123232)에 설치 실증과 60초 미완료를 명시적으로 회신하고, **Sidecar 승인 source 불일치라는 한정된 원래 차단 문제는 CLOSED/completed**. 전체 W06 기능 완료와 혼동하지 않음.
- **W06 아직 미완료:** 별도 승인된 60초 자연 호출의 실제 등록·활성·실행, CNN HTTP 확인·SQLite 원본·D1/API readback, PC 1440px·모바일 390px UI 및 네 분 단위의 실관측. 이 B 결과만으로 60초 실행 또는 자연 Sidecar 재실행 성공을 주장하지 않음. App 본체 PR #1644는 여전히 별도 Draft 개발/배포 범위.

**다음 직접 행동:** 현재 설치된 1분 W06 CLI lane을 호출할 기존 승인 실행 등록 경로(등록/활성/최근 실제 실행)를 확인하고, 필요한 정확한 Task/Runner 효과만 기존 계약·승인 범위에서 연결 → 자연 60초 CNN→SQLite→D1/API→PC·모바일 점검. 운영 읽기 A는 필요한 실측 때만 고유 요청으로 단회 수행.

### 20-12. Sidecar 성공 이후 실제 Task 등록 목록 대조 — 60초 호출 연결 미입증

- [운영 PC 읽기 전용 Issue #3862](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3862) / 실제 Run [#45813893596](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45813893596): 2026-11-26 11:49:19.740Z(20:49:19 KST) 실측 원본 [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45813893596-1-operating.json) 재조회. `PASS/PROCESS_INVENTORY_COLLECTED`, `snapshot.taskStatus=OK`, ZGMINI Task 목록 15개, `ZGMINI-PC-Local-Core=Running`. **CNN 1분 전용 이름의 ZGMINI Task는 목록에 없음**. 기존 #3862는 이미 요청·완료돼 추가 A 중복 발행 없음. A의 보고 범위는 Task 명칭/상태만이며 개별 trigger XML, last run, 다른 이름의 트리거 또는 서비스 호출 여부는 포함하지 않는다. 목록 부재만으로 전역 60초 실행 불가능을 단정하지 않는다.
- 본체 [Draft PR #1644](https://github.com/ansqhd5774-Choi/zgmini/pull/1644)의 `scripts/pc-writer/local-cycle.mjs`는 `--cnn-minute --publish`일 때 기존 `collect-local.mjs --cnn-minute` 다음 `run-local.mjs --cnn-minute --publish`를 **명시적 1회 호출**하는 코드다. 이는 OS/Runner의 60초 트리거 생성·등록·활성 증거가 아니다. 5분 Core를 1분 주기로 변경하지 않는다.
- 이미 설치 성공한 Sidecar #3857의 정확 1파일·원본 Task/Wrapper 무변경 readback은 그대로 유효. 이번 #3862 조회의 운영 데이터/공급자/D1 쓰기 0. CNN 60초 자연 HTTP `checkedAt` 반복 간격, SQLite observation, D1/API, PC·모바일 운영 차트는 여전히 **0/1 미검증**.

**다음 필수 실행:** 현재 등록된 기존 Task/Runner 중 **정확한 60초 주기·실제 CNN 전용 entry 호출을 지원하는 경로**가 있는지 세부 Task trigger/action/최근 실제 실행 readback을 통해 확인한다. 경로가 확인되면 해당 경로의 기존 승인·원본 CAS·lease·복구를 사용해 연결하고 자연 수집/저장/게시를 검증한다. 별도 Task 신규 등록·기존 Task 주기 변경 또는 공급자 정책 변경이 필요하면 **정확한 변경 효과 및 승인 범위를 우선 대조**하고 미승인 효과는 실행하지 않는다. 이전 #3857/#3836 요청 재실행 없음.


### 20-13. 기존 PC A를 재사용하는 W06 Task 트리거/액션/최근 실행 읽기 소스

- [#3862](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3862) 실측은 15개 Task의 이름/상태만 보고하므로 60초 OS 호출·실행 명령·최근 실제 실행 경로를 확인할 수 없다. 기록된 CNN HTTP 2xx 관측 `2026-11-26T11:45:36.551Z` 1회는 지속적인 60초 수집 증거가 아니다.
- 기존 운영 PC `pc-process-inventory-readonly` A의 고정 선택형 `probe` 계약과 동일 Workflow/Runner를 재사용하는 **W06 Task cadence 읽기 소스**를 독립 제어 브랜치 `codex/w06-cnn-task-cadence-probe-20261126`에 구현. [PR #3865](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3865), 최초 HEAD `c6b5f8a042c4bbbba01772e86bd2bccfa34d67fe`. 운영 PC 기존 Task 최대 48개의 Enabled/State, trigger repetition 초, 익명화된 액션 범주 및 CNN minute 인수 리터럴, LastRun/NextRun/LastResult를 요청 입력 경로 없이 확인하도록 했으며 원본 액션·XML·경로/비밀을 게시하지 않는다. 실패/미확인은 명시적으로 유지.
- PR 변경은 **읽기 소스/격리 시험만**이며 신규 Windows Task, Core 주기 변경, Controller·Writer B 설치, Provider/DB/D1 쓰기, 신규 PC 실행 요청 **0**. 단회 PC 실측을 아직 실행하지 않았으므로 60초 자연 실행은 여전히 미입증이다.

- **정확 HEAD 검증 갱신:** C996 #45815609483 실제 job 139894450733 `completed/success`, 변경 소스 회귀시험 140/140 PASS(신규 W06 4개 포함), 고정 Workflow 보안 감사 PASS. 별도 Process Readonly #45815609368 및 Secret Scan #45815609480은 마지막 조회 시 `queued`로 미완료. 이 1/3 성공을 최종 CI 또는 PC 운영 성공으로 해석하지 않는다.
- PR #3865의 CI 시작 Run: C996 [45815609483](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45815609483), 기존 프로세스 읽기 테스트 [45815609368](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45815609368), Secret Scan [45815609480](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45815609480). 원장 작성 시 **완료 CI 미확정**이며 PASS를 선반영하지 않는다.

**다음 직접 행동:** #3865 정확 HEAD 3개 CI 결과 회수·필요시 결함 수정 → 검증된 읽기 변경 통합 → 기존 사용자 승인 A 요청의 고유 ID 단회 발행 및 실제 PC JSON/TXT 2/2 수신 → Task 실행경로·승인 범위 대조. 실제 60초 트리거/액션 연결이 새 운영 효과를 요구하면 해당 범위를 별도 판단하며, 중복 #3862 요청이나 기존 #3857 B 재실행 금지. 연결 후에만 자연 HTTP/SQLite/D1/API/PC·모바일 실측. **W06 종단 완료 0/1 유지.**

### 20-14. W06 Task cadence 진단 CI 3/3 통과·main 병합·운영 PC A 실측 완료

- 제어 PR [#3865](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3865) 정확 HEAD `c6b5f8a042c4bbbba01772e86bd2bccfa34d67fe`: C996 [Run 45815609483](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45815609483) SUCCESS, 격리 프로세스 소스 시험 [Run 45815609368](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45815609368) SUCCESS, Secret Scan [Run 45815609480](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45815609480) SUCCESS. 정확 HEAD CI **3/3 완료** 및 `main` squash 병합 `b42d05c8251017e27eec75c01d947aaac8c802c1`; 이 단계는 읽기 도구 소스 통합이다.
- 기존 #3862는 반복하지 않고 별도 단회 운영 PC A [Issue #3868](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3868), requestId `38f81e40-e85a-4c08-9ee9-7f33cc3a47a1`, [Run #45816542351](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45816542351), 운영 Runner `zgmini-pc-06`에서 `completed/success`를 확인. 결과 [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45816542351-1-operating.json) 및 [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/pc-process-inventory-45816542351-1-operating.txt) 2/2 원격 readback: `PASS/W06_TASK_CADENCE_COLLECTED`; 관측 2026-11-26T12:07:11.152Z. #3868은 결과 증거 확인 후 CLOSED/completed.
- 실측: ZGMINI 예약 Task 총 15개, Task 정보 미확인 0, **60초 repetition 트리거 0개**, `local-cycle.mjs --cnn-minute` 직접 액션 후보 0개. `ZGMINI-PC-Local-Core`는 Enabled/Running, repetition 300초; `ZGMINI-PC-Writer`는 Disabled, repetition 300초. 간접 스크립트/별도 상주 프로세스의 내부 CNN 60초 루프 부재는 이 Task 정의 조회만으로 확정하지 않음. Task 최근 성공 코드만으로 실제 CNN HTTP/저장/게시 60초 검증 불가.
- 본체 W06 브랜치 `scripts/pc-writer/local-cycle.mjs`의 `--cnn-minute --publish` 경로는 `collect-local.mjs`와 `run-local.mjs`의 **명시적 일회 실행**이며 자체 반복/새 Task 등록은 없음. 등록 Task에서 직접 해당 entry를 호출하는 경로가 확인되지 않았으므로, **기존 Windows Task 기반 60초 연결은 미입증**. 정상 Sidecar V2 운영 설치 #3857의 완료 증거는 유지하고 재실행하지 않음.
- 이번 단계의 Windows Task/실행 주기/운영 source/Provider/SQLite/D1 변경 **0건**. 실행·영수증 확인은 단회 읽기 전용이며 W06 자연 60초 HTTP→SQLite→D1/API→PC/모바일 UI의 운영 종단 완료 **0/1 유지**.

**다음 필수 실행:** 기존 승인된 별도 60초 호출자(간접 스크립트/상주 서비스/Runner)가 실제 존재하는지 마지막 관련 Runtime/설정 증거로 대조한다. 없으면 필요한 신규 Task 등록·기존 Task 수정·운영 소스 설치 효과를 정확히 분리하여 현재 승인과 비교한다. 승인 없는 운영 Task·Core 주기 변경 또는 임의 공급자 호출은 하지 않는다. 승인된 효과만 기존 설치/호출 보호(CAS·lease·백업·원본 보존)로 연결한 후 자연 수집·SQLite·D1·API·UI 검증으로 진행한다.

### 20-15. 기존 5분 Core와 60초 W06 호출 구조 분리·Task 소스 후보 준비

- 제어 PC [#3868](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3868) 실제 JSON/TXT 2/2의 ZGMINI 15개 Task 중 PT1M repetition 0개, `--cnn-minute` 직접 실행 Task 0개. 기존 `ZGMINI-PC-Local-Core` 300초, `ZGMINI-PC-Writer` Disabled 300초. 기존 운영 A 완료 증거를 재사용하며 재실행하지 않음. 비-ZGMINI Task/상주 프로세스의 간접 자체 주기는 이 실측만으로 부재 확정할 수 없음.
- 운영 승인 설치된 [Sidecar B #3857](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3857)의 정확 후보 `sidecar-b/approved/archive-run-w06-v2.mjs`를 대조: 기존 수집 이후 SQLite 저장값·검증 체크를 후속 보관·D1 게시하는 1회 실행기이며 자체 분당 스케줄러·CNN HTTP 수집 없음. `local-cycle.mjs --cnn-minute --publish`는 명시적 1회 collection→publication이며 OS/Runner 자동 등록 없음. Core Task 기본 installer `scripts/pc-writer/install-local.mjs`는 `core=PT5M`, `korea=PT1H`만 등록하므로 60초 W06 실행 연결 미완료가 재확인됨.
- 공통 `quota-policy.mjs`의 CNN `minIntervalMs=300000`은 `hard:false`이며 `QuotaLedger`에서 소프트 경고로 분류해 HTTP를 차단하지 않음. **5분 값 자체를 운영 60초 실패 원인으로 단정하지 않음.** W06 전용 `refreshPublicFeeds({cnnMinuteOnly:true})`는 후보 `CNN_MINUTE_INTERVAL_MS=60000` 사용. 공급자 계약·공통 quota·타 지표 호출 정책을 이번 작업에서 변경하지 않음.
- 신규 운영 권한을 임의 추정하지 않고 W06 본체 브랜치에 순수 **Task 정의 후보** `scripts/pc-writer/w06-minute-task-candidate.mjs`와 관련 `tests/w06-minute-task-candidate.test.mjs`을 작성. 마지막 소스 HEAD `5326257fb379755a85ce1dd6ab9de4346d072cdd`, 본체 [Draft PR #1644](https://github.com/ansqhd5774-Choi/zgmini/pull/1644)에 포함. 기존 PC 경로와 승인된 일회 CLI를 사용해 `ZGMINI-PC-CNN-Minute`, `PT1M`, `IgnoreNew`, 1회 `local-cycle.mjs --cnn-minute --publish`의 고정 Task XML 및 VBS 래퍼 원문을 **메모리에서만 생성**. Task 등록·활성·실행·파일 생성·공급자·SQLite·D1 쓰기 및 Core/Writer 변경 없음. 작업 범위 외 임의 경로·계정 제어문자·null 입력을 거부함.
- 로컬 격리 Node.js 시험 `node --test` **3/3 PASS** 및 `node --check` PASS. 정확 마지막 HEAD GitHub Node.js CI/CodeQL/Secret/UI는 실행·결과를 따로 확인해야 함; 이 기록 시점 성공 선반영하지 않음. Source-only candidate는 실제 Windows Task를 생성하지 않으며 승인된 B Task 유지보수 계약·원본 부재 확인·정확 CAS·lease·복원·최종 readback 연결이 여전히 필요함.

**다음 필수 실행:** 최신 [PR #1644](https://github.com/ansqhd5774-Choi/zgmini/pull/1644) 변경 HEAD의 관련 CI와 코드 회귀 결과 회수. 기존 운영 Task/간접 호출 증거로 중복 실행 부재를 확인하면서 **새 60초 Task 생성·활성 효과가 기존 사용자 승인에 포함되는지** 정확히 대조. 기존 W06 Sidecar/Writer source-only 승인으로 새 Task 등록을 추론하지 않음. 신규 Task 효과가 미승인인 경우 운영 적용은 중단하되, 재사용 가능한 등록기·B 유지보수기의 인증/원본 CAS/rollback 연결을 소스 수준에서 완성한 후 필요한 정확 변경만 결정받음. 승인된 후 실제 60초 자연 CNN HTTP checkedAt → SQLite 원본·검증 체크 → D1 readback → API → PC/모바일 차트로 검증. **W06 종단 완료 0/1 유지.**

### 20-16. 60초 Task 후보 실행 보호·후속 효과 구분 및 공통 B 범위 확인

- 이전 본체 [Draft PR #1644](https://github.com/ansqhd5774-Choi/zgmini/pull/1644)의 HEAD `47c46825bb029d6df0d5761e196bc7d804fe8932`는 Node.js CI [45818681387](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45818681387) SUCCESS, CodeQL [45818681462](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45818681462) SUCCESS, Secret Scan [45818681492](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45818681492) SUCCESS. Browser UI는 해당 조회에서 in_progress로 성공을 확정하지 않음. 이후 변경 HEAD의 CI는 별도 판정.
- W06 `local-cycle.mjs --cnn-minute --publish`는 CNN collect 자식과 publish 자식을 순서대로 실행하며 각 `spawnSync`의 timeout이 300,000ms다. 따라서 초기 Task 후보 XML의 `ExecutionTimeLimit=PT5M`는 정상 2단계 실행 중 강제 종료 가능성이 있어 결함으로 판정. 단일 신규 Task 후보 `scripts/pc-writer/w06-minute-task-candidate.mjs`를 `PT30M`으로 수정, `PT1M` trigger 및 `MultipleInstancesPolicy=IgnoreNew` 유지. 회귀시험에 1분 주기/30분 실행 상한 및 중첩 방지 계약 명시. **이는 일정한 실제 HTTP 60초 성공 보장이 아니며, 장시간 실행 시 중첩을 막아 일부 tick은 건너뛸 수 있음.**
- 다른 중요한 범위 구분: Task XML/VBS 후보를 **생성만** 하는 함수는 운영 파일/Task/네트워크/DB/D1에 쓰기 0이다. 그러나 생성된 Task를 실제 **등록·활성화**하면 이후 매 tick CNN HTTP 요청, SQLite 관측 저장, D1 공개 projection 쓰기를 유발할 수 있다. `effectRequiresApproval='CREATE_ENABLE_ONE_TASK_CNN_HTTP_SQLITE_D1_WITH_EXACT_CAS_AND_ROLLBACK'` 및 `scheduledRuntimeEffects` 3항목을 명시하고 단위시험에 고정. 최종 해당 소스 테스트 HEAD `b59930202eefc7f598ea9839fe24a7a0425e46b7`. 원본 운영 경로 및 기존 Core·Korea·Writer Task를 변경하지 않음.
- 공통 제어 저장소 `writer-b/contract.mjs` + `writer-b/windows-adapter.mjs` + `writer-b/README.md` 검토: 현재 정규 Writer B는 소스 변경 때 Core 기존 Task의 **일시 중지·원본 복원**만 지원하며, `allowTaskDefinitionChanges=false`를 요구한다. Sidecar B 역시 `allowTaskChanges=false`다. Controller-only 유지보수기도 운영 Task 생성 권한이 없다. 과거 소스 교체 승인으로 신규 분당 Task 등록을 허용했다고 해석할 수 없음. 임의 per-feature 실행기, 새 예약 또는 승인 없는 실제 등록을 발행하지 않음.
- 실제 신규 Task 등록의 필요 조건은 고정 Task명 `ZGMINI-PC-CNN-Minute`, `PT1M`, `IgnoreNew`, `--cnn-minute --publish`의 정확한 실행기/파일 바이트 및 Task 부재 readback, 운영 source/config 승인 상태, Task·wrapper 백업/원본 CAS·공유 lease·1회 claim·복구 증거, **CNN 공급자 호출·SQLite/D1 쓰기 효과까지 포함한 승인 범위**. 이 범위가 미확정인 동안 운영 설치·자연 수집 0/1로 유지한다.

**다음 필수 실행:** 최종 소스 HEAD의 Node.js/CodeQL/Secret/UI CI 결과 회수 및 결함 시 최소 수정. 이어 새 Task 1건을 위한 운영 효과 승인과 기존 공통 등록/유지보수 경로의 지원 여부를 정확하게 대조; 이미 승인된 동일 효과가 있다면 재사용한다. 승인 범위 없는 Task 생성·기존 Core 5분 주기 변경 금지. 효과가 정규 승인되면 검증된 단회 B Task 생성·등록/활성화 readback → 자연 CNN HTTP `checkedAt` → SQLite 원본 → D1 API → PC·모바일 1/5/10/30분 차트 실증. **운영 종단 완료율 0/1.**

### 20-17. W06 설치 완료 증거 재사용·PT1M 신규 Task B 소스 계약 착수

- 기존 승인 [Writer B #3818](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3818) / [Run #45802270334](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45802270334) / 원격 JSON·TXT 2/2: `WRITER_B_INSTALLED_VERIFIED/WRITER_B_INSTALL_VERIFIED`, 9개 파일 overlay 실제 PC source `393cee0da46515ff056543173fcd1253a858b3d7`, `config.source` CAS·Core 복원 완료. 이전 #3812는 `CORE_ACTIVE_WINDOW_DEFERRED` 중단, #3818에서 승인된 정규 360초 drain 설치 성공. 동일 Writer 설치/이전 요청 재실행하지 않음. Sidecar V2 승인 [#3857](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3857) 성공 증거도 보존.
- A [#3868](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3868)의 15개 Task trigger/action/readback은 W06 PT1M 직접 예약 0, 기존 Core PT5M·Korea PT1H·Writer Disabled. 운영 Writer 기능 소스가 설치됐다는 사실은 자동 PT1M 실행이 등록됐다는 증거가 아님.
- 본체 W06 PR [#1644](https://github.com/ansqhd5774-Choi/zgmini/pull/1644) 변경 HEAD `2f3219dd5be6c8432ff76c5d04984c110195a378`: Node.js CI [45819711690](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45819711690), CodeQL [45819711721](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45819711721), Secret Scan [45819711776](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45819711776) SUCCESS, Browser UI는 최신 확인 시 진행 중. 이 CI는 운영 PT1M 증거가 아님.
- 현행 공통 Writer B/Sidecar B는 소스 설치·기존 Core Task 일시 중지/복구만 지원하고 **새 Task 1개 생성·활성화는 승인/지원 범위 밖**. 이를 기존 B 요청에 끼워넣거나 기존 Core PT5M 변경으로 우회하지 않음.
- 별도 제어 브랜치 `codex/w06-cnn-task-create-b-20261126`, [Draft PR #3872](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3872): `task-create-b/contract.mjs`, `transaction.mjs`, `trusted-approval.mjs`, `tests/task-create-b.test.mjs` 4파일. 소유자 opened Issue + 정확한 커밋 manifest 원본 해시 + 설치된 source/config 및 Core/Sidecar 보호 해시 + Task/Wrapper 부재를 검증하고, 단회 claim·공유 lease·보호 백업→Wrapper create-only→Task disabled 등록/readback→enable/readback 순서를 정의한 **소스 전용 B 코드 후보**. 활성화 결과 불명확 시 자동 재실행/삭제 대신 `RECOVERY_REQUIRED`를 반환. 계정·시작시각은 공개하지 않고 Task 템플릿 SHA만 승인하여 실행시간/개인정보를 고정값으로 노출하지 않음. 정상·사전검사·롤백·회복 미확정 및 committed manifest 경로에 대한 격리 Node 회귀 테스트 8건 소스 반영.
- 제어 PR #3872 마지막 소스 HEAD `b333b6c381a1235a13650b93e727f5e1f50ee03f`의 C996 [Run 45821780796](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45821780796), Secret Scan [Run 45821780917](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45821780917)은 조회 시 `queued`; PASS 선반영하지 않음. **아직 실Windows adapter, 기존 B 수신 Workflow 결합, 확정 승인 manifest/Task install Issue는 없음.** 제어·본체 코드 및 진행 원장 변경은 운영 source/Task/Provider/SQLite/D1에 아무 변경도 주지 않음.

**다음 필수 실행:** #3872 변경 HEAD C996/Secret CI 결과 확보·실패 시 코드 수정. 실제 Task 등록을 위한 신뢰된 Windows adapter와 기존 Writer B workflow 단회 접수 연결을 정확한 승인·원본 CAS·백업/복구 계약으로 완성. 승인 문서에서 **Task 1개 생성·활성화 + 향후 CNN HTTP, SQLite·D1 후속 쓰기**까지 현재 기능 승인 범위와 대조하고, 미승인 효과는 운영 실행 금지. 이 경로가 승인되면 실PC 1회 B install 영수증 → Task PT1M/실제 호출 확인 → CNN `checkedAt` 60초 기록/SQLite → D1/API → 1440·390 UI 검증. **W06 운영 종단 완료 0/1.**

### 20-18. W06 단일 PT1M Task B 공통 Writer 수신기 연결·격리 Windows CI

- 제어 저장소 독립 구현 브랜치 `codex/w06-cnn-task-create-b-20261126`, [Draft PR #3872](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3872): 고정 W06 Task 1건을 **기존** `.github/workflows/pc-writer-b-source-once.yml`의 Owner-opened Issue→Actions→운영 Runner 수신과 정확한 라벨로 연결. 기존 `zgmini-writer-source-b-one-at-a-time` concurrency·`r17-writer-b/r17-b-claim.mjs` 공유 설치 잠금/claim 재사용. 신규 Runner/Cron/타업무 Task/범용 임의 명령을 만들지 않음. 이번 변경은 아직 미병합/미설치 소스임.
- `task-create-b/trusted-approval.mjs` + `preflight.mjs`에서 실제 Issue 이벤트 제어 repo `GITHUB_SHA`에 커밋된 승인 JSON의 원본 해시·clean·정확한 owner/label 검증을 요구. Manifest의 B 효과 범위는 **Task 1건 생성·활성화, 이후 CNN HTTP/SQLite/D1 자동 반복**을 명시하며, `APPROVED_B` 없는 요청은 실패. `candidate.mjs`는 승인된 `zgmini` exact source SHA+파일 SHA로 W06 순수 XML/VBS 생성기를 로딩하며 실행계정·시작시각은 운영 PC에서 읽고 출력하지 않음.
- `windows-adapter.mjs`에서 설치 PC source/config `393cee0da46515ff056543173fcd1253a858b3d7` + clean, Task/Wrapper 부재, 기존 Core raw Task XML SHA, Sidecar 파일 SHA, Core/Korea/Writer Task 보존, VBS 파일 단회 생성→Task 비활성 등록→세부 실행 명령·인수·PT1M·IgnoreNew·PT30M·InteractiveToken·LeastPrivilege readback→Task 활성화를 엄격히 분리. 운영 Private 백업·CAS 및 실패 복구는 기존 공유 Writer 자원 구조로 수행.
- `transaction.mjs`는 Wrapper/Task **생성 호출 결과가 불명확하면 해당 파일이 자기 소유라고 추정하여 삭제하지 않고** `RECOVERY_REQUIRED`로 남김. Task 활성화 결과가 불명확한 경우에도 공급자/SQLite/D1 후속 효과 미확인으로 남기고 자동 재실행 금지. `report.mjs`는 독립 Task readback 후 민감 Task XML·UserId·명령행을 제외한 결과 JSON/TXT 2/2와 Issue 댓글만 create-only로 기록하도록 설계. 실제 운영 PC reporter 실행은 아직 없음.
- 격리 Windows CI는 신규 [`.github/workflows/w06-task-create-b-source-ci.yml`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/codex/w06-cnn-task-create-b-20261126/.github/workflows/w06-task-create-b-source-ci.yml)을 통해 기존 `zgmini-handoff-ci-isolated` Runner를 사용. **소스 HEAD `24bbcb98723b886a4826b35582c24791c655e65b`에서** [C996 #45823199388](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45823199388) SUCCESS, [Secret Scan #45823199421](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45823199421) SUCCESS, [격리 Windows W06 CI #45823199756](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45823199756) SUCCESS. 이후 생성 불명확 처리/least-privilege 강화로 소스 HEAD가 추가 진전했으므로 **최신 HEAD CI PASS는 별도 확인 전 미확정**. 완성 소스 CI/Task 설치·운영 종단 검증을 혼동하지 않음.
- 현재 제어 PR #3872 Draft/미병합. 정확 승인 B manifest `approvals/task-create-b/w06-cnn-minute-*.json`, 실제 운영 Issue·Run·JSON/TXT 없음. 본체 W06 설치 완료 Writer #3818 및 Sidecar #3857은 재설치하지 않고 유지. **신규 Task 생성·기존 Task 변경·공급자/SQLite/D1 쓰기=0건**.

**다음 필수 실행:** 제어 PR #3872 최종 변경 HEAD C996/Secret/격리 Windows CI 회수와 code/Workflow 검사, 실패하면 최소 수정; 검증된 공통 Writer B 수신 source를 정규 통합. 신규 Task 1건의 운영 생성·활성화와 CNN HTTP/SQLite/D1 후속 효과를 포함하는 정확 승인 범위 및 현행 preimage CAS·manifest 바이트 해시 확인 후에만 단회 B Issue로 실제 PC 실행. 적용 결과 readback 후 자연 60초 CNN 확인·SQLite 기록·D1·API·1440/390 UI 실증. **W06 운영 종단 완료율 0/1 유지.**

### 20-19. 단일 CNN PT1M Task B 정확 제안명세·실행 범위 보강

- 제어 브랜치 `codex/w06-cnn-task-create-b-20261126`, [Draft PR #3872](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3872)에 신규 Task 등록·후속 수집·게시 효과를 분리하는 B 수신기를 구현. 본체 W06 PR #1644 순수 Task XML/VBS 후보를 exact Git commit `b59930202eefc7f598ea9839fe24a7a0425e46b7` 및 실제 blob `b3e42b67815e077bd836eee9bf74c3d96207d192`로 대조한 뒤 raw SHA256 `4b9a22d064cb4b489d3fc07c6cc2cfa1595770bd7011862a5879a5a8ce7550c9` 고정. launcher SHA256 `f55c0267ca029dea0d7c10a91a4df63bc67ac0b5c93d64446bf859a5a7d5fe1b`, 비활성/활성 XML 정규화 템플릿 SHA256 각각 `afdc7ebf437091fa1d20770d2346f2174f1dcb6991c14670e5854c56cc6d1b69` / `d7d027664b426e5bd9c8c77da2532fedd25b81863320ac676965e2986d31e957`. 작업 계정과 시작 시각은 포함하지 않음.
- 기존 사용자 승인·운영 성공 영수증에서만 읽은 두 **과거 원본 CAS 값**: Core Task raw XML SHA256 `dd81987c7efa4b1e343af30329a580613bb920dec89c1aa7a436ef935f0bb028` (Writer B #3818과 Sidecar B #3857 서로 일치), Sidecar V2 목표 바이트 SHA256 `eb3c43bf8fba6ea4e51f3e84b77f9ec13000db9d9e38077ffd914950d7080b6b`. 이 값들은 해당 승인 시점의 확정 대상이며 **현재 PC 실시간 해시로 소급 간주하지 않음**. 실제 설치 전 현행 preimage가 같은지 native CAS로 검사해야 함.
- 제어 PR #3872의 `task-create-b/w06-cnn-minute-proposal.json`은 `status='PROPOSED_B'`, 정확한 후보·원본 보호 해시·CNN 전용 HTTP/SQLite/D1 효과를 포함한 **승인 전 소스 제안**이다. 승인 manifest 경로 `approvals/task-create-b/`에 등록된 승인 파일 없음, 고유 B Issue 발행 0. `PROPOSED_B`를 `APPROVED_B`로 잘못 허용하지 않는 회귀시험 추가. 본체의 기존 W06 PT1M 목표가 확정돼도 과거 Writer/Sidecar source-only 승인으로 새 OS Task 설치 권한을 소급 부여하지 않음.
- 신규 별도 GitHub 라벨을 만들지 않고 기존 실제 B 요청 #3818에서 입증된 `pc-writer-b-install` 라벨과 정확한 W06 Task Issue 제목을 재사용. 기존 공통 Writer B Workflow concurrency 및 R17 claim/lease 보존. Task 등록 후 한 TimeTrigger뿐 아니라 **한 Exec 동작만 허용**해 COM/기타 동작이 붙은 Task XML의 readback을 거부하는 회귀시험 추가. 불확실한 Task/Wrapper 생성 시 원본 삭제 금지, 기존 Core/Korea/Writer Task 백업과 신규 Wrapper/Task XML 후보의 exclusive 생성·fsync·원문 readback을 보강.
- 위 변경 이전 검증된 제어 source HEAD `24bbcb98723b886a4826b35582c24791c655e65b`: [C996 #45823199388](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45823199388) SUCCESS, [Secret #45823199421](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45823199421) SUCCESS, [격리 Windows W06 CI #45823199756](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45823199756) SUCCESS. 그 뒤 실제 버그 수정과 제안명세 추가로 변경 HEAD가 `1d189600f03e878f296344a2959c945a00706734`까지 이동했으므로 **최신 C996/Secret/격리 Windows/Controller source CI는 결과 완료 전 PASS 판정 금지**. 본체 이전 W06 CI 4종 SUCCESS도 이 별도 제어 PR의 최신 CI를 대신하지 않음.
- **실제 Windows Task 생성·활성 0, 운영 Writer/Sidecar 재설치 0, 공급자 호출·SQLite/D1 쓰기 0**. 소스 수정 자체는 W06 자연 HTTP 60초 `checkedAt`, SQLite 연속 관측, D1/API, PC/모바일 차트 운영 증거를 만들지 않음.

**다음 필수 실행:** 제어 [#3872](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3872) 마지막 HEAD의 CI와 코드 검증 결과 회수→안전한 소스 정규 통합. 이어 실제 사용자 승인 효과와 단회 B manifest의 `APPROVED_B` 근거 확보, **현재 PC** source/config/Core/Sidecar/Task 부재 CAS 재확인→정규 운영 1회 B Issue·JSON/TXT 사후 readback→실제 CNN 60초 자연 HTTP/SQLite/D1/API/390·1440 차트 실증. 승인 없는 설치/중복 원본 요청 금지. **운영 종단 완료율 0/1 유지.**

### 20-20. W06 exact CI 4/4 및 Task B 원장 생성 결과 미확인 분기 보강

- 본체 W06 전용 브랜치 `codex/w06-cnn-1min-intraday-20261124`의 **실제 코드 검증 HEAD `660d59b492acc9957930f24fd87ab3b705d148f0`**: [Node.js #45827389326](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45827389326), [CodeQL #45827389828](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45827389828), [Secret Scan #45827389506](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45827389506), [Browser UI #45827389390](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45827389390) 모두 SUCCESS. 처음 실패했던 `tests/w06-minute-task-candidate.test.mjs`의 Windows 경로 정규식 과잉 이스케이프는 코드/실패 로그의 `ERR_ASSERTION`을 구분한 뒤 리터럴 비교로 최소 수정해 이 HEAD에서 통과. 테스트가 통과했다는 사실은 실제 PC Task 실행을 증명하지 않음.
- 실제 Production **읽기 전용 Browser UI 영수증** #45827389390: 390/1440px 각각 1D·1W·1M·3M·6M·1Y 6기간은 차트 렌더링 오류·가로 overflow 없이 PASS, **1D 표시 데이터는 실제 기존 공개 이력 5개 점**. PC 자동 PT1M 새 관측 60초 연속 진행이나 D1 신규 writer 검증과 다름. 별도 격리 W06 터치 시험(390/1440)에서 최신 포인트 접근/tooltip·6기간 PASS.
- 앞서 확인한 실제 60초 Task 호출기의 데이터 저장 경로 결함은 `WScript.Shell.Environment("PROCESS")`에서 자식 프로세스 `ZGMINI_PC_HOME=E:\\ZGmini\\data\\pc-writer`만 고정해 해결. 제어 후보 manifest `task-create-b/w06-cnn-minute-proposal.json`의 정확 본체 source SHA `0bae713aa6df1f4c00037db908050c74ae3dd20c`, 후보 파일 SHA-256 `694474d9966ef0a06dd46bb5d5b684150c5d66b5fcf989501fc4f9aa1502a7e7`, launcher SHA-256 `73c8cf4381fd328182a9fad0a7cb5753cf9093e58524f0c9a04be4df7032d733`이 함께 연결돼 있음. `PROPOSED_B`는 운영 승인 아님.
- 제어 전용 브랜치 `codex/w06-cnn-task-create-b-20261126`, [Draft #3872](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3872)의 `task-create-b/transaction.mjs`: 기존 `r17-writer-b` 단회 원장 함수는 첫 디렉터리 생성 이후 journal/hooks 쓰기 실패 시 부분 잔여물을 보존한다. 기존 트랜잭션은 `claimOnce` 호출 자체가 실패하면 `PREFLIGHT_STOP`으로 보고하며 공유 설치 lock을 해제하는 분류 오류가 있었음. 실제 실패 조건을 분리하여 **claim 시도 중 실패는 `TASK_CREATE_B_CLAIM_OUTCOME_UNKNOWN` / `RECOVERY_REQUIRED`**, 원장·공유 lock 보존, 자동 재실행·삭제 금지로 수정. `tests/task-create-b.test.mjs`에서 `io.claimOnce` 중단 주입·동일 요청 자원 불변 시험 추가. 수정 커밋 `6b42f445b1e3164bac66b7aafc15c1dfa772a8c5` / `9f5b662dd2ef3bf6ffa2e66e689c8505705f3da6`.
- 제어 PR #3872 최신 시험 HEAD `9f5b662dd2ef3bf6ffa2e66e689c8505705f3da6`의 C996·Secret·격리 Windows·Controller 소스 CI는 마지막 조회 시 `queued/in_progress`, PASS를 미리 기록하지 않음. 한 GitHub Runner의 큐 대기를 Task 소스 불량이나 PC Runtime 실패로 판정하지 않음. 기존 Task B 미승인, Writer/Sidecar 기존 설치 성공 유지, 운영 Windows Task 변경 0, 공급자 호출/SQLite/D1 신규 쓰기 0.

**다음 필수 작업:** 제어 #3872 마지막 변경 HEAD CI 정식 회수 및 실제 실패 시 최소 수정 → 안전한 소스 통합. 이후 **신규 Windows PT1M Task 생성·활성화와 이후 CNN HTTP/SQLite/D1 반복 쓰기**를 명시적으로 포함한 유효한 사용자 운영 승인 manifest 및 현재 PC source/config·Core Task XML·Sidecar 원본·기존 Task 부재 CAS 확보 후 기존 Writer B 수신기에서 1회만 설치, JSON/TXT 2/2 독립 readback. 이후 실제 자연 60초 수집·저장·D1/API 및 390/1440 최신점 확인. **W06 종단 운영 완료율 0/1 유지**.


### 20-20. W06 PT1M 실PC Task 복구 완료 및 수집·게시 최신성 독립 구분 (2026-11-27 KST)

- 제어 승인 manifest [PR #3901](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3901): 정확 Task `ZGMINI-PC-CNN-Minute` 1개 생성/활성화 + 자연 CNN HTTP→SQLite→D1 효과 승인. 원본 B [Issue #3895](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3895)는 PT1M Task를 비활성 상태로 남기고 `TASK_CREATE_B_ROLLBACK_UNVERIFIED`로 중단. 재실행하지 않음.
- 운영 PC A [#3911](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3911) / Run 45840593168: Windows XML `RunLevel=OMITTED`, 실제 Scheduler Principal `LIMITED`. 관리자 권한 오류가 아닌 기본 XML 태그 생략에 따른 검증 차이. [수정 PR #3912](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3912) 병합, 권한 상향·우회 없음.
- 원본 소유권 CAS 복구 소스 [PR #3915](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3915) 4/4 CI PASS 병합. 복구 [#3918](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3918)는 최종 영수증 `RECOVERY_REQUIRED`로 끝났으나, 독립 PC A [#3920](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3920)에서 **Task enabled=true / PT1M / lastRunUtc=2026-11-26T15:04:01Z / LastResult=0** 확인. B 오류명을 Task 비활성이나 무실행으로 오판하지 않음.
- 복구 Claim/완료 마커 확인 [PR #3923](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3923) 3/3 PASS·병합, 운영 A [#3924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3924) / Run 45846364195: 유효 복구 Claim 존재·완료 마커 미존재·원본 Writer 소유 잠금 유지, Task enabled/Running/PT1M·lastRunUtc=2026-11-26T15:11:01Z. 활성화 재실행 불필요 확인.
- 최종 원본 소유 잠금 종료 전용 [PR #3929](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3929) exact HEAD 4/4 PASS, `main` merge `88c84fa77d12dbcb3253d4b1e95174b838d3b05f`. 단회 B [#3932](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3932) / Run 45848147541 **completed/success**, 원격 JSON/TXT 2/2 `TASK_FINALIZE_B_FINALIZED_VERIFIED/TASK_FINALIZE_B_EXACT_OWNER_RELEASE_PASS`, `installed=true`, `ownerLockReleased=true`, Task·다른 Task 변경 0, 공급자·SQLite·D1 직접 쓰기 0. 원본 #3895/#3918 및 성공 #3932는 실패 이력 보존·독립 성공 근거 연결 후 CLOSED/completed. Task 설치/활성/보호 종료는 완료, 기능 전체 완료와 다름.
- 신규 자연 데이터 확인은 분리: PC 허용 A [#3931](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3931) / Run 45847498418 **PASS/CNN_SQLITE_D1_API_1D_1W_MATCHED**, 2026-11-26 로컬 원본 1건·PC verified-check 1건, D1/공개 1D·1W 200 및 일치. 다만 마지막 PC checkedAt은 **2026-11-26T11:45:35.868Z**, Task 활성 15:04Z 이후의 새 PC verified-check/D1 체크포인트는 15:18Z 시점 **미관측**. 기존 데이터 정합성 PASS는 자연 60초 신규 수집 성공이 아님.
- 실제 CNN HTTP 시도와 게시 장애를 구분하도록 기존 A `w06-cnn-task-cadence-readonly`에서 로컬 SQLite `fear-greed-http-checks` 최근 2일을 **readOnly/query_only** 집계하는 제어 [PR #3937](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3937) 소스·격리시험을 작성. 이 원장 시점 PR CI/병합/운영 조회는 미완료; Task나 DB/D1 변경 없음.

**남은 필수 작업:** 제어 PR #3937 정확 HEAD CI → main 병합 → 기존 운영 PC 고유 A로 CNN HTTP 2xx/429/실패·15:04Z 이후 요청 수 및 PC 마지막 verified-check 확인. 실제 실패가 수집 호출/공급자/저장/게시 어디인지 분리하고 승인된 기존 수집기·게시기의 최소 수정/정규 적용 → 자연 60초 저장 이력 및 D1/API readback, PC 1440px·모바일 390px 1/5/10/30분 차트의 실제 마지막값 확인. **종단 운영 완료율 0/1 유지.**
