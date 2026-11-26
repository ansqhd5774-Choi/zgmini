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


### 20-21. W06 자연 HTTP 성공과 원본 미변동·공개 체크 계약 분리 (2026-11-27 KST)

- 운영 A [#3940](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3940) / [Run #45850203201](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45850203201) 실제 JSON/TXT **2/2**: `ZGMINI-PC-CNN-Minute` enabled/Running, PT1M, 최종 복구 Claim·완료 marker `true`, 원본 owner lock 없음. 2026-11-26T15:36:01Z Task 실행, LastTaskResult `2147946720`(`0x800710E0`). 실행 결과 코드는 거부/미시작 종류지만, Task 동작 중·`IgnoreNew`와 동일 시각이라는 사정만으로 실제 거부의 근본 원인(중첩, 조건, 계정 등)을 확정하지 않음.
- 같은 PC 로컬 `fear-greed-http-checks`의 저장된 HTTP 결과 2일 19건, Task 활성화 후 17건; `VERIFIED/HTTP 200` 19건, 429·5xx·fetch 실패 0건. 마지막 검증 `2026-11-26T15:32:20.793Z`. 이는 단순 Task 이름·예약 등록이 아니라 실제 CNN HTTP 확인·SQLite input 확인 이력을 입증. 60초마다 모든 tick의 완전 성공을 증명하지 않음. A #3940 읽기 결과 완료로 CLOSED/completed.
- 별도 A [#3943](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3943) / Run 45850991363: **PASS/CNN_SQLITE_D1_API_1D_1W_MATCHED**. 현 시점 로컬/D1 공개 원본 1건, PC 확인 1건, 마지막 PC 공개 checkedAt `2026-11-26T11:45:35.868Z`. 양쪽 공개 API 1D·1W HTTP 200, 일치. 이것만으로 최신 CNN 원본 변동 전파를 실증했다고 판정하지 않음.
- 별도 운영 A [#3944](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3944) / Run 45851206811: 로컬 현재 CNN score `14.9967450271248`, 원본 observedAt `2026-11-26T01:59:59Z` 유지, 현재 local storedAt `2026-11-26T15:39:01.763Z`. 독립 HTTP 확인이 정상이어도 CNN 원본 관측시각/점수가 동일하면 새 **원본 관측점**을 만들지 않는 데이터 계약 적용.
- 실제 본체 메인 [PR #1644](https://github.com/ansqhd5774-Choi/zgmini/pull/1644)는 `merged=true`, merge SHA `cabbc1b75f96deb356fccd99b554ba8ec8ab7989`로 확인. 이 소스 병합은 별도 운영 PC source 설치·Cloudflare 배포/실화면 결과를 자동 증명하지 않음.
- 본체 `tools/cnn-verified-checks-r9/verified-checks-r9.mjs`는 기존 승인 계약상 **동일 점수·원본 observedAt 재확인 시 새 공개 체크 점을 건너뛰며, 변동 체크도 최소 15분 조건**을 유지한다. W06의 60초 HTTP 확인과 CNN 원본 관측·기존 R9 공개 체크 이력을 혼합하거나 동일값으로 가짜 분봉 생성 금지. 현재 D1/차트 신규점 미관측을 곧바로 게시 실패로 단정하지 않음.
- 정상 60초 실제 HTTP 간격의 누락·편차 원인을 가려내기 위한 **기존 A 조회만** 확장한 제어 [PR #3946](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3946), 브랜치 `codex/w06-cnn-http-cadence-evidence-20261127`: 저장된 요청 `requestedAt`으로 최근 간격 최소/중앙/최대 및 90초 초과 구간 수를 출력. 이 원장 반영 시 소스 PR 제출 상태이고 CI·병합·실PC 신규 결과는 아직 확정하지 않음. Task/공급자/SQLite/D1/타 지표 주기 쓰기 없음.

**남은 직접 작업:** 제어 PR #3946 정확 HEAD 시험/검증 후 병합·운영 A 단회 수집, 실제 60초 요청 간격/누락 판단 → 마지막 Task 거부 코드와 충돌/시간 조건을 가능한 기존 Runtime 증거로 구분, 근본 원인이 확인된 부분만 최소 수정·정규 적용. 실제 CNN 원본 점수 변동시 SQLite·D1·공개 1D/1W·홈페이지 1/5/10/30분 및 PC 1440px·모바일 390px 실화면 대조. **종단 운영 완료율 0/1 유지**.


### 20-22. 실제 W06 60초 HTTP 간격 정밀 측정과 잔여 실행 지연 범위 (2026-11-27 KST)

- 제어 [PR #3946](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3946): 기존 `w06-cnn-task-cadence-readonly`의 로컬 PC SQLite read-only 결과에서 실제 `requestedAt` 차이만 계산하는 최소 보강. 정확 HEAD `7b1a535bda149c31dba69252aea07b8ced69fddd`의 C996·Secret Scan·격리 프로세스 회귀시험 **3/3 SUCCESS**, `main` merge `1e6eabbc08acc2ed9e38d5fd42de073d59e705a9`; 신규 Task·기존 Task·공급자 호출·SQLite/D1 쓰기 0.
- 운영 PC A [Issue #3948](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3948) / [Run #45852269700](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45852269700), JSON/TXT 2/2 및 실제 관측 2026-11-26T15:46:13.378Z. Task `ZGMINI-PC-CNN-Minute` enabled=true, PT1M, `Ready`, 마지막 실행 15:46:01Z, LastTaskResult=0, 원본 owner lock 없음, 복구 완료 마커 일치. 단회 읽기 전용 요청을 성공 영수증 확인 후 CLOSED/completed.
- 로컬 실제 HTTP 확인 기록 최근 2일 **26건**, Task 활성화 이후 **24건**; 전부 `VERIFIED/HTTP 200`; 429/5xx/네트워크 실패 0. 마지막 확인 15:46:07.943Z. 활성 이후 **연속 실제 요청 간격 23개**: 최소 **60초**, 중앙 **93초**, 최대 **321초**, 90초 초과 **12개**. 최근 12구간 [106,83,97,65,133,321,80,60,122,118,63,63]초. 이 수치는 Scheduler trigger 간격이 아니라 저장된 CNN HTTP `requestedAt` 간격이다.
- 따라서 PT1M 설정과 실제 HTTP 수집은 **입증**, 하지만 매 60초 안정적인 HTTP 호출은 **미달**. 앞선 15:36Z PC A의 Task Running + LastTaskResult `0x800710E0`, 그리고 `IgnoreNew` 정책은 중첩/조건 거부 가능성과 양립하나, 자식 collector/publisher 실소요시간과 Scheduler 이벤트가 없으므로 정확 원인 단정·무조건 Task 변경 금지.
- CNN 원본 observedAt이 2026-11-26T01:59:59Z/약14.9967점 그대로인 상태에서 동일 값의 새 관측점을 생성하지 않는 규칙 유지. R9 기존 최소 15분 변경 체크 정책·원본/PC 확인 구분 유지; 1분 HTTP 성공을 1분 새 원본 변화나 공개 이력 게시 성공으로 표시하지 않음.

**다음 필수 단계:** 기존 운영 Runtime 증거에서 W06 collector/publisher 소요시간·Task 중첩/실행 거절 조건을 구분하는 최소 read-only 관측을 우선. 실제 병목이 증명되면 기존 승인 실행기/공유 경로에 한정해 최소 수정, 관련 회귀 및 승인된 B 정규 적용. CNN 원본 변동이 관측되면 SQLite 원본과 D1/API readback·1/5/10/30분 선형 차트·PC/모바일 실화면을 대조. 미관측 변동을 가짜 시계열로 채우지 않으며 **종단 운영 완료율 0/1 유지**.


### 20-23. W06 캐시 경계/Task 증거 → 최소 수집 소스 수정·실PC 승인 원본 CAS (2026-11-27 KST)

- 제어 원인 분리 [PR #3951](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3951), 정확 HEAD `786de73cf971a4c852f5aa1f6fcf65f7f46ca889` C996/Secret/격리 3/3 PASS, merge `2bc797caceea6df238e523a7307105281390029e`: 기존 A 프로브에 다음 명목 Task tick의 CNN current/attempt SQLite 저장시각 비교와 TaskScheduler Event322 읽기 추가. Task/DB/운영 설정 쓰기 0.
- 운영 A [#3955](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3955)/[Run 45854511940](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45854511940): `ZGMINI-PC-CNN-Minute` enabled/Ready PT1M, lastTaskResult 0, 직전 실행 2026-11-26T16:00:01Z, 다음 명목 tick 16:01:00Z. 동일 SQLite의 current 및 attempt는 16:00:22.627Z, 기준 tick에서 60초 eligibility 부족 **22.627초**, `predictedGate=CACHED`. **명목 발화 시점의 예측이며 실제 자식 수집 시작 순간의 CACHED 발생은 미확인**, 역사적 skip 확정으로 표시하지 않음. TaskScheduler Operational 채널은 `DISABLED`: Event322 거절 횟수 `null`, 0으로 표시 금지. 실제 HTTP 36건 모두 VERIFIED/200, 활성화 이후34건, 간격33개 중앙90초/최대321초/90초 초과16. 공유 `public-feeds` lease 점유도 별도의 미확인 skip 경로로 유지.
- 본체 실제 최소 수정 [PR #1701](https://github.com/ansqhd5774-Choi/zgmini/pull/1701): `worker/public-feed-refresh.mjs`만 W06 `cnnMinuteOnly`에서 공유 lease **이전** 기존 저장/시도시각 +60초까지 최대 25초 단회 대기하고 실제 clock 재검증. 429 `Retry-After`, Core/타 지표, 기존 저장·공개 계약 유지. 별도 회귀시험에서 대기·허용 범위·기존 캐시/쿨다운·lease 보존 확인. HEAD `5187ce2e1074ca1944f228901b5389f58d5c7bfc` Node CI/Secret Scan/CodeQL **3/3 PASS**, main merge `4a13569367ff0f1afc5138f971d86a8fa99c3329`. **소스 통합 완료/PC 운영 미적용**; 실제 간격 정상화 보장 아님.
- 재사용한 정확 승인 읽기 전용 PC A [#3960](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3960)/Run 45856284910: 운영 source HEAD=config.source=Writer checkpoint `393cee0da46515ff056543173fcd1253a858b3d7`, 이 셋 동일, 변경 파일 tracked-clean. `worker/public-feed-refresh.mjs` 실제 PC 원본 SHA-256 `193034cadb0dc49af3f6f435402fd23fe3e76ac085ffe270490363903bc4d052`; 기존 GitHub 승인후보 원문 SHA와 독립 일치. 새 후보 `4a13569...`의 해당 파일 SHA-256 `63923160a66a1cf958c9f2619d8535c2038772f1fc92f40c0025d16e33aecb4c`, 파일 길이 10041 bytes. 원본 `393cee...`은 PC 로컬 Writer B 합성 source로 GitHub 앱 저장소 조회시 NOT_FOUND, 이를 파일 손상으로 오판하지 않음. A 결과의 `runtimeSourceVerified=false`는 Core 실행 인스턴스 증명이 아니라 고정 checkout 확인임을 뜻함.
- 단일 파일 정규 B 승인 명세 준비: 제어 [PR #3965](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3965), 브랜치 `codex/w06-minute-bounded-onefile-install-20261127`, 정확 후보 `4a13569...`/원본 `393cee...` CAS, W06 기존 launcher SHA, Core Task XML SHA, 파일 1개 M 이외 보호. 명세 원문 SHA-256 `5381e98e1bba3cbf65b5fb4af117a63d60d9a4fe70242895011998a0c67858ca` (1515 bytes). 이 원장 시점 **CI/병합/실PC B 설치는 미확정**. Task·수집 데이터·D1 운영 변경은 0.

**다음 필수 단계:** 제어 #3965 정확 HEAD CI PASS/승인 명세 검증 → 기존 정규 Writer B 경로에서 source/config 원본 CAS, 공유 lease, Core 원본 Task/실행자격을 만족할 때만 단회 PC 설치 및 JSON/TXT 2/2 직접 readback. `CORE_ACTIVE_WINDOW_DEFERRED` 등 안전 STOP 시 원본 보존·동일 요청 재실행 금지. 적용 이후 자연 PT1M HTTP 요청 간격/Skipped tick 재실측, SQLite 원본 변화와 D1/API/1·5·10·30분 PC 1440px·모바일390px 차트 확인. 원본점수 미변동 시 신규 변동점은 미관측 유지. **운영 종단 완료율 0/1**.


### 20-24. W06 one-file B 실제 Core 경합 실패·원본 복원과 안전 재관측 PR (2026-11-27 KST)

- W06 기존 1분 캐시 경계 수정 [본체 #1701](https://github.com/ansqhd5774-Choi/zgmini/pull/1701)의 source-only 병합은 완료. 운영 실증 A #3960은 설치 원본 `393cee0da46515ff056543173fcd1253a858b3d7`와 config/checkpoint 일치·파일 CAS 확인. 정확 원본 승인 [제어 PR #3965](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3965), C996/Secret **2/2 PASS** → 제어 main merge `0389427654568ee1369f50d1f530b0a4976b34a4`.
- 단일 기존 허용 Writer B 단회 [Issue #3969](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3969), requestId `e25c0b36-2949-45f0-ab49-083afcd5980d`, [실제 운영 Run 45858466994](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45858466994). 승인 manifest 검사·후보 checkout PASS. 설치 자체는 **`WRITER_B_INSTALL_STOP_RESTORED / WRITER_B_CORE_PREPAUSE_RACE_DEFERRED`**. 원본 JSON/TXT 2/2, `recovery=ORIGINAL_VERIFIED`, `sourceSha=null`. 실제 소스 교체/출력 게시 **미완료**, 해당 requestId 재실행 금지.
- 실제 중단 지점: 공통 `writer-b/windows-guards.mjs::inhibitCoreStarts`가 두 번 자연 유휴를 확인한 직후의 최종 `coreReadyForMaintenance` CAS에서, 다른 정상 Core 시작/잠금과 충돌할 경우 **Task disable 전에** 해당 오류를 반환. 강제 Core 종료·Core lock 삭제·보호 검사 완화 금지. 이 오류만으로 어떤 Core PID/실행 단계가 충돌했는지 단정하지 않음.
- 공통 총괄 원장 제어 Issue #68에 정확 Run/코드/복구 결과 직접 보고 완료. 공통 B의 단회 트랜잭션 내부에 한해 원본 HEAD/config/Task/파일 재조회 성공 시 최대 1회 `POST_PREPARE` 기존 자연 유휴 관측 재시행(추가 90초 상한)하는 [제어 PR #3974](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3974), 전용 브랜치 `codex/w06-writer-b-prepause-race-safe-recheck-20261127` source/격리 회귀시험 작성. 이 원장 시점 PR CI/병합 및 운영 설치 **미확정**. 유지보수 reserved mode, Task/공급자/DB/D1 효과와 보호 조건은 변경하지 않음.
- 기능 운영 종단 상태 **0/1**. W06 Task/PT1M 활성화·직전 HTTP 200 성공과 소스 수정의 GitHub 병합은 이미 확정됐지만 새 W06 source 25초 경계 대기 기능은 PC에 미적용. 자연 60초 HTTP 안정화/원본 변동/저장→D1→API→UI는 미입증.

**다음 필수 작업:** 제어 PR #3974 정확 HEAD 기존 C996/Secret·관련 Writer B 회귀시험 회수 및 병합, 최신 PC 운영 preimage/동일 승인효과 다시 대조 후 새로운 고유 B 단회 설치. 기존 #3969 재실행 금지. 운영 B 설치 성공 시 실제 활성 source/config+원본 백업·rollback 영수증 → 자연 60초 GET 간격과 SQLite→D1/API/PC·모바일 차트 결과 검증.


### 20-25. W06 공통 B 360초 유지보수로 실제 CNN 한 파일 설치 성공 (2026-11-27 KST)

- 기존 실패 원인 분해와 소스 조치: [제어 PR #3974](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3974), HEAD `97622819e4fd3dc4b0c3bd2fdb513e8ac95847db`에서 C996 회귀시험 **140 PASS/0 FAIL**, 보안 검증 PASS; Secret Scan PASS, 제어 main merge `389856e90a92fdd66e9260adee774959fcf3a1c3`. `WRITER_B_CORE_PREPAUSE_RACE_DEFERRED`에 한해 원본 CAS 재입증 후 자연 유휴 관측 1회 추가, 원본/Task 상태 일부 변경 시 retry 금지. Core/Task 보호 완화나 임의 종료·잠금 삭제 없음.
- 정규 자연 유휴 B [#3979](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3979) / Run 45861747259: 기존 onefile 명세의 정상 사전검사 `WRITER_B_PREFLIGHT_STOP / WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`, `idleObservation 159 samples=159 active, 0 ready, 0 other`. sourceSha null, claim/백업/운영 변경 없이 중단. 기존 #3969와 별개 실제 조건; 동일 요청 재실행 금지.
- 이미 승인된 W06 `PAUSE_NEW_STARTS_DRAIN_360S_V1` 효과는 과거 [#3818](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3818)/Run 45802270334에서 실제 `WRITER_B_INSTALLED_VERIFIED` 성공 전례가 있음. Task 신규 시작만 잠시 억제하고 진행 중인 Core를 **강제 종료 없이 360초 상한 자연 drain**한 후 복구하는 정규 경로. 새로운 자원/Task/승인 효과가 아닌 기존 W06 승인 범위의 재사용.
- [제어 PR #3982](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3982): 기존 W06 onefile 승인 명세에 해당 `coreMaintenance` 필드만 추가한 원문 `approvals/writer-updates/w06-cnn-minute-bounded-eligibility-onefile-maint360-20261127.json`, SHA256 `50d06508fb28ffa49dc2ae53befa22a7bdc50fd164a895240e42cd8a40152e15` (1570 bytes), 파일 1개 `worker/public-feed-refresh.mjs` CAS·보호 Task SHA·launcher SHA·쓰기 효과 false 모두 불변. C996/Secret 2/2 PASS, 제어 main merge `1bf25af1c1b71c8c374abec8fbaefd5cd60ceddf`.
- 실제 운영 B [Issue #3985](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3985) / [Run #45863542119](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45863542119): **`WRITER_B_INSTALLED_VERIFIED/WRITER_B_INSTALL_VERIFIED`**, JSON/TXT **2/2 원본 readback**, Run completed/success. 정확 변경 `worker/public-feed-refresh.mjs` 1개; PC 기존 baseHead `393cee0da46515ff056543173fcd1253a858b3d7` → 새 설치 local overlay sourceSha `714d392ca079daa9fdb789f73762c407be3321a2`. GitHub 후보 원문 `4a13569367ff0f1afc5138f971d86a8fa99c3329`와 로컬 합성 설치 SHA는 다른 정상 식별자. `localOnly=true/LOCAL_OVERLAY`, 게시/Task·DB/D1 직접 변경 없음. 이전 #3969/#3979 재실행 금지.
- **설치 후 기능 실측 진행 중:** 운영 PC Task/PT1M·실제 HTTP 간격 [A #3987](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3987), SQLite↔D1↔공개 API 1D/1W [A #3988](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3988) 각 고유 단회 읽기 전용 요청 발행; 이 원장 시점 **최종 영수증 미회수**, 성공을 선표시하지 않음. 공급자 호출/운영 쓰기 없이 사후 증거 검증.
- **W06 종단 운영 완료율 0/1 유지**: 이제 1분 캐시 경계 보강 코드는 PC에 실제 설치 완료; 다음 자연 60초 HTTP 간격과 원본 observedAt 변화, 로컬 관측 저장→D1/API readback, 1/5/10/30분 PC 1440px·모바일390px 실제 차트는 독립적 검증이 필요. 동일 관측값 반복시 가짜 신규 원본/차트점 생성 금지.

**다음 필수 작업:** #3987/#3988 실제 Run·JSON/TXT를 회수해 신규 소스 이후 HTTP 60초 간격 및 저장↔공개 일치/불일치를 분리. 원본 변화가 있을 때 해당 시점의 D1/API/UI 마지막 점을 실제 비교하고, 화면 검증이 필요한 범위만 진행. 운영 설치는 이미 성공했으므로 다시 실행하지 않음.


### 20-26. W06 신규 PC source 설치 후 Task·HTTP·SQLite/D1/API·UI 실측 (2026-11-27 KST)

- **설치된 활성 원본 재확인**: [제어 B #3985](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3985)/Run #45863542119 JSON/TXT direct readback `WRITER_B_INSTALLED_VERIFIED`, PC local overlay `714d392ca079daa9fdb789f73762c407be3321a2`, changedPaths=`worker/public-feed-refresh.mjs` 1개, source CAS·정규 360초 Core drain/Task 복원 성공. 앱 GitHub 후보 `4a13569367ff0f1afc5138f971d86a8fa99c3329`와 구별.
- **실 PC Task·HTTP 최초 확인**: [A #3987](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3987)/Run #45864039931, `PASS/W06_TASK_CADENCE_COLLECTED`, JSON/TXT 2/2, 2026-11-26T17:02:17.109Z. CNN Task enabled/Ready, PT1M, lastTaskResult=0, lastRun=17:02:01Z. 저장된 HTTP 2일 **75건 전부 VERIFIED/2xx**, 429/5xx/fetch 실패 0, 최근 10분 **8건**. 활성화 이후 전체 요청 간격 72개 중앙값 **91.5초**, 최대 **321초**, 90초 초과 36개. 이 전체 통계는 설치 전 시간이 포함되어 **신규 코드 적용 이후 순수 간격 통계가 아님**. 최신 실제 HTTP 요청 `17:02:11.646Z`. 명목 다음 Task tick의 60초 gate `CACHED` 예측은 저장시각에서 11,340ms 부족한 한 시점의 가정이며 실제 collector skip 확증이 아님; W06 최대 25초 대기의 실제 효과를 실측할 필요.
- **새 설치 후 SQLite↔D1↔API**: 초기 [#3988](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3988)은 필수 `pc-job` 레이블 누락으로 생성·late-label Workflow 모두 skipped(PC 실행 0건), `not_planned` 종결하고 레이블 포함 새 고유 [A #3989](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3989)를 제출. [Run #45864401383](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45864401383) `PASS/CNN_SQLITE_D1_API_1D_1W_MATCHED`, JSON/TXT 2/2, PC activeSha `714d392...` 일치, `protectedStateUnchanged=true`, 공급자/DB/D1 쓰기 0. 로컬 당일 observed=1/verified public checks=1, observedAt `2026-11-26T01:59:59Z`, checkedAt `11:45:35.868Z`, score `14.9967450271248`; D1 해당 기록 1/1 일치, 공개 API 1D·1W HTTP200 observed/checks MATCHED. **원본 관측이 그대로라** 새 60초 원본 변경점·공개 체크 생성은 증명하지 않음.
- **사용 가능한 기존 웹 화면 검증 재사용**: 본체 [PR #1644](https://github.com/ansqhd5774-Choi/zgmini/pull/1644) HEAD `de0bbb24fca5fd33e011400b5ebfd835939c07a7`, [UI CI Run #45829067617](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45829067617) completed SUCCESS. `Verify W06 actual Production 1D and 6 periods at 390/1440 read-only`, CNN actual PC-check 1D 곡선/오래된 session 제외 at 390/1440, touch/hover 격리시험 각각 PASS. 이는 그 시점 기존 Production 화면 검증이며 새 PC source 설치 이후 마지막 차트점 자동 반영·실제 새 CNN 관측점 표시 검증으로 확대하지 않음.
- 종단 완료율 **0/1 유지**. 새 PC 소스 실제 설치·HTTP 저장 지속·정합성·기존 UI CI 범위는 증명했으나 *설치 후 연속 60초 요청 간격의 독립 창*과 실제 원본 변경의 저장→게시→UI 최신점은 미관측.

**다음 필수 작업:** 동일 승인된 W06 읽기 전용 Task/HTTP probe를 실제 추가 자연 주기가 지난 다음 1회 수행해 설치 이후 요청 간격만 구분한다(기존 전체 중앙값과 혼동 금지). 60초 미달 지속 시 실제 최근 요청 시각·Task state·Core shared lease 조건을 분리하여 확인한 실패 경로만 수정한다. 최신 CNN 원본 observedAt가 실제 변하면 SQLite↔D1↔API↔PC 1440/mobile 390 실제 차트 마지막점 재대조. 중복 Writer 설치/기존 A·B 요청 재실행 금지.


### 20-27. W06 설치 후 순수 HTTP 약 60초 간격 실측 검증 (2026-11-27 KST)

- 기존 인증된 설치 #3985 / Run 45863542119: `worker/public-feed-refresh.mjs` 1개만 PC release에 정규 B 설치, `WRITER_B_INSTALLED_VERIFIED`, 로컬 source `714d392ca079daa9fdb789f73762c407be3321a2`. 기존 운영 Task 활성/PT1M·최종 B 원본 CAS/Task 복구 검증 완료. B 중복 설치/실패했던 #3969 재실행 없음.
- 이전 A #3992 / Run 45864894875: 2026-11-26T17:08:10Z 당시 설치 후까지 섞인 전체 기간 요청 간격 중앙 85.5초였지만 마지막 12간격 [127,61,88,80,61,67,61,60,60,61,62,59]초로 개선 확인. 타임스탬프 분리 전 전체값은 새 코드 효과 판정에 부적합.
- 설치 후 기준점이 **실제 첫 사후 읽기 #3987의 2026-11-26T17:02:17.109Z**인 것을 명시해 SQLite 원본 `requestedAt` 이후만 계산하는 [제어 PR #3996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/3996), 브랜치 `codex/w06-post-install-http-gap-readonly-20261127`. 정확 HEAD `7a65f2567f47e5b40ba89d16159a48b7f6df3757` C996·Secret·Two-PC source CI **3/3 SUCCESS**, merge `ca509d9b8f71fe393549fb4fe1371f0b23442905`. 고정 SQLite 2일 bounded query-only 조회에 집계만 추가, 운영 Task/공급자/SQLite/D1/기존 소스 쓰기 0.
- 운영 단회 읽기 A [Issue #3998](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3998)/[Run #45865681482](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45865681482) **PASS/W06_TASK_CADENCE_COLLECTED**, JSON/TXT **2/2 원본 readback**, 2026-11-26T17:12:49.669Z, 실제 운영 runner zgmini-pc-02. CNN Task enabled=true/Ready, PT1M, lastTaskResult=0, lastRun=17:12:01Z.
- HTTP 최근 2일 **85건 모두 VERIFIED/200**, 429/5xx/fetch 실패 0. **설치 후 독립 구간** 요청 10건 모두 VERIFIED, `17:03:12.161Z`~`17:12:26.923Z`, 연속 실제 HTTP requestedAt 간격 9개 **[60,60,61,62,59,71,62,60,60]초**, **중앙값 60초·최대 71초·90초 초과 0건**. 따라서 자연 약 1분 간격 실제 수집은 이 창에서 **입증**, 임의 데이터 보간·누락된 tick 생성 없음. 9개 표본이라 장기 100% 무누락·정확한 고정 60초를 보장하지 않음.
- 명목 다음 tick 계산 `predictedGate=CACHED`/26,801ms 부족은 실제 자식 collection 시작 전의 한 시각만 예측하며 **과거 skip 확정이 아님**; 이미 해당 실측 구간에서 bounded wait가 있는 현재 소스의 실제 HTTP 간격 확인 완료. Scheduler Event322 channel disabled이므로 ignored Launch 개수는 **미관측 null**(0으로 오표시 금지).
- 독립 D1/API 기존 A #3989 / Run 45864401383: SQLite 당일 원본 observed=1, 공개 R9 check=1, D1/APIs 1D/1W MATCHED(HTTP200), 관측 sourceObservedAt `2026-11-26T01:59:59Z`, score `14.9967450271248` 그대로. 이 값은 **실제 CNN 신규 원본 변동/체크/1·5·10·30분 새 차트점 게시 입증이 아님**. 이전 웹 UI Production 390/1440 및 1D·6기간 PASS도 재사용하되 새 데이터 표시 증거로 확대 금지.
- #3998 A는 댓글에 원본 증거 기록 후 `closed/completed` 종결. 새로운 Task·유료 provider·반복 감시 예약 추가 없음. **W06 종단 운영 완료율 0/1 유지**(HTTP 60초 자연 창과 source 설치 단계는 검증 완료, 원본 신규 observedAt 변화 → SQLite 저장→D1 게시→API/UI 최종점 실제 검증 미완료).

**다음 필수 작업:** 승인된 기존 자동 수집에서 CNN sourceObservedAt가 실제 전진한 시점의 첫 유효 원본·로컬 SQLite archive/checks·D1 공개 1D/1W·API 및 홈페이지 1/5/10/30분 차트 PC 1440px/모바일 390px 최신점 독립 대조. source가 동일할 동안에는 새 관측/차트 점을 만들지 않고 원본 미변동 상태 유지. 이미 정상화한 60초 Task/정규 소스 설치를 반복 실행하지 않음.

### 20-28. 사용자 승인 W06 UI 단순화 — 1D 직접 1분봉 (2026-11-27 KST)

- 사용자가 현재 1D의 보조 메뉴 **'확인 이력 | 1분 | 5분 | 10분 | 30분'을 불필요하다고 명시**함. UI 변경의 정본 목적은 **1D 선택 즉시 CNN 실제 `observedAt` 기준 고정 1분 선형 차트**이며 보조 메뉴는 제거하는 것. 기존 1W·1M·3M·6M·1Y를 유지하며 PC의 `checkedAt` 성공 확인 기록은 데이터·D1/API에 그대로 보존하되 원본 관측점으로 위장하지 않음.
- 현재 본체 main과 원래 W06 브랜치가 크게 분기되어 있어 기존 변경을 덮어쓰지 않고 `main@225a0806ce611b370a9fe451cf6c18ab78599af6`에서 W06 UI 전용 `codex/w06-1d-direct-minute-ui-20261127` 브랜치 생성. [본체 PR #1707](https://github.com/ansqhd5774-Choi/zgmini/pull/1707) 변경 7파일: `cnn-panel.tsx` UI 1, 관련 회귀시험 5, 브라우저 CI 시험 순서 1. 기존 PC 수집/Task·SQLite·D1·Cloudflare 설정·다른 기간·산식 변경 0.
- 실제 코드: 1D의 `minuteMode`를 고정하고 `aggregateCnnIntraday(...minutes:1)` 사용, 확인 이력 및 1/5/10/30분 선택바 완전 제거, 원본 관측만 분봉 입력, 기존 원본 1분 결측 구간은 null gap 유지. 별도 유효 원본의 동등 표시값은 새 '점수 변동'으로 위조하지 않음.
- **코드 정밀·회귀**: Node CI, CodeQL, Secret Scan 최신 후보 PASS. 초기 Node CI가 구 `currentSessionPcDates` UI 계약을 주장한 3개 테스트에서 실패하여 사용자 변경으로 폐기된 UI 기대값만 실제 현행 1D 계약으로 수정한 뒤 신규 Node PASS. 실제 `cnn-intraday-buckets` 함수의 4관측 fixture는 가짜 원본점 0.
- **브라우저 독립 실증**: 전용 [UI Run #45869004372](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45869004372)에서 'Verify CNN actual PC-check 1D curve and stale-session exclusion at 390/1440'가 **success**. 이 검증은 390px 실제 터치·1440px 선형 그래프, 1D 1분 버킷·별도 메뉴 0, 정상 재조회·원본 추가·오래된 PC 체크 배제, 기존 1W 복귀를 테스트한 격리 mock UI이고 PC/D1 운영 직접 변경은 아님. 같은 Run의 W06 일반 터치 fixture·기존 Production 1D/6기간 read-only 단계도 각각 success.
- **본체 소스 통합 완료**: PR #1707 HEAD `8788478008b75eba2bf0f87efdc152dc971275bc`가 `main`에 **merge `ee6f3aaa400b6faec99134a90daa21c9dbe1ec90`**. 병합·CI를 Production 배포 적용과 구별한다.
- **배포 확인 진행**: GitHub에서 이 main SHA를 대상으로 Cloudflare Workers Build `zgmini-migration-candidate-r5`가 등록·진행 중임을 확인. Production API/HTML의 새 빌드·실제 hydration을 이 원장 시점 VERIFIED로 선표시하지 않음.
- **W06 운영 종단 0/1 유지**: 실제 CNN 신규 `sourceObservedAt` 변경에 따른 SQLite→D1→API→PC·모바일 최신 분봉 전파는 여전히 미검증. 미국 추수감사절 휴장/원본 미변동을 결함으로 추정하지 않으며 60초 HTTP 설치·실측 #3985/#3998을 재실행하지 않음.

**다음 필수 단계:** Cloudflare Git Integration이 해당 정확 main 배포 SHA로 Production 활성됐는지 읽기 확인, 공개 `/api/fear-greed/observations?period=1D`와 실제 390/1440 hydration의 1D 직접 1분 UI 대조. 새 원본이 실제 생성되면 SQLite·D1·API·화면의 원본 시각/값 전파만 추가 검증. 1·5·10·30분 보조 버튼 복구 금지, 수집/Task 재설치·무관 CI 실패 수정을 필수 조건으로 붙이지 않음.

- **배포·도메인 사후 readback (같은 2026-11-27 KST):** 병합 main SHA `ee6f3aaa400b6faec99134a90daa21c9dbe1ec90`에 대한 Cloudflare `Workers Builds: zgmini-migration-candidate-r5` check **completed/success** (2026-11-26T17:41:01Z); 본체 [Production SEO Health Run #45869574998](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45869574998)에서 해당 SHA Cloudflare 성공 대기 이후 실제 `https://zgmini.kr` 공개 페이지 및 정규 경로 조회 **2개 단계 PASS** (`Verify production SEO after Cloudflare deployment`, `Verify canonical edge redirects`). Cloudflare Git Integration build·Production URL 조회 PASS는 확보. 다만 해당 Production 페이지에서 **1D를 직접 클릭한 새 자산 hydration·1분 끝점 UI 검증**은 독립 미관측이고, 승인된 W06 진짜 observedAt 새 값의 종단 전파도 아직 미관측으로 유지. 원장 내 앞선 ‘배포 확인 진행’은 이 사후 증거로 해당 범위만 갱신한다.

### 20-29. 기간별 장중 시계열 표시 밀도 — 사용자 승인 및 본체 병합 (2026-11-27 KST)

- 사용자 제공 Investing.com 1D·1W·1M 화면을 기준으로 1W/1M의 데이터 개수가 달력 일수(7/30)에 제한되면 안 된다는 요구를 확인했다. 변경은 W06 CNN의 실제 저장 시계열 표시이며 기존 장중 원본·일봉과 선형 스타일을 그대로 재사용한다.
- **구현 기준:** 1D 1분(기존), 1W 30분, 1M 300분(5시간), 3M·6M·1Y NY 관측일당 마지막 실제 source point 1개 + 장중 source 없는 날짜의 기존 CNN 일별 이력. 시간 구간별 마지막 진짜 observedAt을 사용하고 반복 PC checkedAt 확인 이력은 차트에 혼입하지 않는다. 원본 결측/휴장에 가짜 점을 채우지 않는다.
- **소스 브랜치:** 본체 최신 `main@3f08615a5097db0ab3fca7d6e6bb84e434f27238`를 기반으로 `codex/w06-period-chart-density-20261127`을 분리해 사용자·다른 담당자 변경을 건드리지 않았다. 기존 W06 장기 브랜치는 본 진행 원장과 계획 정본으로 보존하고 충돌 원본을 대량 병합하지 않았다.
- **본체 통합:** [PR #1716](https://github.com/ansqhd5774-Choi/zgmini/pull/1716) / 병합 `7106f7f4d4553d0f625f966c1bc7744dfcb0ef91`. 변경 4파일: `app/fear-greed/usa/cnn-panel.tsx`, `lib/cnn-period-chart-r1.mjs`, `tests/cnn-period-chart-r1.test.mjs`, `tests/cnn-current-session-verified-checks-browser-r12.mjs`. 기존 API/DB/운영 Task/source 계산 및 CSS·차트 컴포넌트 변경 0.
- **검증:** 관측치 밀도, 30분/5시간/NY 일 구간 마지막 실제 원본값, 0점, 일별 fallback, 구간 결측 및 뉴욕→UTC 날짜 변경, PC 재확인 제외를 포함한 집계 시험 7건 PASS. PR HEAD `479bb0387e73ca5884ebefeaac543624648ef205` Node CI·Secret Scan·CodeQL SUCCESS. 브라우저 UI Run `45872719729`의 W06 전용 PC 1440px·모바일 390px 6기간 검증 SUCCESS. 전체 브라우저 파이프라인 완료와 Cloudflare Production 실제 배포는 별도 상태로 판단한다.
- **한계:** 실제 CNN 소스가 하루에 몇 회만 새로 발표되면 차트도 해당 횟수만 표현한다. 1M+ 기존 공개 API의 bounded sampling은 보존했으므로 샘플 밖 모든 개별 source를 5시간별 마지막 원본으로 검증한 것은 아니다. **W06 종단 운영 0/1 유지:** 실제 새 observedAt 원본→SQLite→D1→API→화면 반영 readback은 별도 필수 증거다.

**이어갈 작업:** 병합 SHA의 Cloudflare Git Integration 성공 및 Production API/PC·모바일 1W/1M 실제 시계열의 원본 시각·점수 검증, 신규 observedAt 종단 전파 확인. 미승인 주기·공급자·저장계약 변경과 가짜 데이터 생성은 하지 않는다.

### 20-30. 기간별 차트 변경 Cloudflare Production 빌드·페이지 검증 (2026-11-27 KST)

- 병합된 정확 본체 main SHA `7106f7f4d4553d0f625f966c1bc7744dfcb0ef91`의 Cloudflare Git Integration **Workers Builds: zgmini-migration-candidate-r5 completed/success**, build ID `44160f65-cf6b-4a3d-8ff0-c736d466e431` (2026-11-26T18:07:51Z). 정규 Git 연동 외 Wrangler·Sites 수동 배포 없음.
- 동일 SHA 본체 [Production SEO Health Run #45873177162](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45873177162) **completed/success**, 실 공개 도메인 `zgmini.kr` 페이지/정규 경로 조회 확인. 이는 정확 SHA Build+실 사이트 기본 응답 증거이며, 모바일·PC 실제 프로덕션 1W/1M 차트 hydration 값까지 직접 읽어 확인한 결과는 아님.
- 독립 순수함수 31일 시뮬레이션: 실제 sourceObservedAt 62개 입력 → 1W 30분 분봉 15개, 1M 5시간 분봉 62개, 원본 없는 신규 관측점 0개. 기간이 7/30개의 데이터점으로 제한되지 않음을 증명(실운영 CNN 원본 수량 증거가 아닌 고정 입력 시험).
- W06 신뢰할 수 있는 운영 완료 기준은 불변: 새로운 CNN observedAt이 공급처에서 실제 전진한 시각의 SQLite→D1→API→390/1440 최신 시계열 연동을 확인할 때까지 **종단 0/1**이다. 신규 공개 API 데이터의 직접 readback은 이번 웹 조회 환경에서 실패했으므로 검증 완료라고 표현하지 않는다. 기존 60초 수집 실측 정상은 변경하지 않는다.

### 20-31. CNN 기간별 선형 차트 실제 첫 점 왼쪽 정렬 — 2026-11-27 KST

- 사용자 1W·1M·3M 실제 화면에서 선 시작이 왼쪽으로부터 떨어지는 문제를 지적. **실패 조건:** `app/fear-greed/usa/cnn-panel.tsx`의 `buildChartTimeAxis`가 X축 시작을 실제 첫 데이터와 무관하게 `latest - selectedPeriod.days * 86400000`으로 고정. 예를 들어 첫 원본이 11월 20일이라도 1W 축은 11월 19일부터 시작해 공백 발생.
- **원인 수정:** 실제 관측점이 2개 이상일 때 `domain=[earliestActualTime,latestActualTime]`을 사용해 데이터로 선형 곡선을 그리는 첫 점을 왼쪽 그래프 경계에 고정. 중간 점의 실제 시간 간격은 정규 연속 X축으로 유지. 1개 데이터에서는 기존 기간 축을 사용해 가짜 선을 생성하지 않음. 기존 기간별 분봉 간격, 데이터/산식, 선형 스타일·색상·툴팁·기간 버튼 불변.
- **개발/병합:** 본체 최신 main 기준 전용 변경 브랜치 `codex/w06-cnn-chart-left-anchor-20261127`; [PR #1720](https://github.com/ansqhd5774-Choi/zgmini/pull/1720) 총 3파일(위 소스 1, 테스트 2) 정확 PR HEAD `5b04f67a37d330d0269fe51298ffd6f771d3baa1`, **main merge `7b29bd8dad6635cfa20ed26e11ad890b9f205c3d`**.
- **검증:** PR HEAD Node CI, CodeQL, Secret Scan PASS. 브라우저 Run #45874912582 W06 전용 390/1440px 6기간에서 실제 SVG 선 시작 X와 그래프 plot 왼쪽 경계 비교 PASS. 최초 브라우저 실패는 X축 tick 글자 DOM의 좌표가 없어 비교 기준이 null이 된 시험 코드의 오류이며, ReferenceLine 또는 실제 SVG clip rect 왼쪽 경계로 시험 코드를 수정해 동일 목적 검증 PASS. 오류 난 시험을 삭제·무시하지 않았음.
- **자동 배포 및 공개 접근:** main merge SHA `7b29bd8dad6635cfa20ed26e11ad890b9f205c3d`의 Cloudflare Git Integration `zgmini-migration-candidate-r5` **Build SUCCESS** (build `80cc7ac0-3c0e-4c44-99c4-e1391ae0359f`, 2026-11-26T18:23:35Z). [Production SEO Health Run #45875348677](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45875348677) **PASS**, 실제 `zgmini.kr` 정규 URL 및 리다이렉트 조회 성공. Mock된 API fixture PC·모바일 렌더 검증과 실제 Production 1W/1M 데이터 hydration 직접 증거를 구분하며 후자는 별도 미확인.
- W06 신규 CNN `observedAt`의 실제 SQLite→D1→API→UI 종단 진행률 **0/1 유지**. 이번 내용은 X축 배치 결함 수정이며 실제 수집·Writer·DB·D1·API·예약 작업을 반복 실행하거나 재설치하지 않음.

**다음 필수 단계:** 실운영 새 observedAt 전진이 확인될 때 실제 저장 점수·시각과 1W/1M/3M 화면 첫 점·마지막 점을 readback 대조. 신규 원본이 없으면 원장에 미검증으로 남기고 가짜 데이터로 채우지 않는다.

### 20-32. W06 잔여계획 R2-01 — 신규 자연 관측 기준점 실제 읽기 완료 (2026-11-27 KST)

- 계획 정본: [R2](W06_REMAINING_EXECUTION_PLAN_R2_20261127.md). R1의 수집·설치·UI 기완료 증거를 초기화하거나 기존 성공 A를 동일 requestId로 반복하지 않음.
- **신규 실제 A 읽기:** [제어 Issue #4047](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4047), 고유 requestId `pc-82ef17f0-3b02-4a80-ae76-6fd802ad1c4a`, 등록된 `cnn-public-d1-api-readback-readonly` A/light 사용. 실제 [Run #45876724451](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45876724451) `completed/success`, `PASS/CNN_SQLITE_D1_API_1D_1W_MATCHED`. 승인된 운영 PC가 `2026-11-26T18:32:33.088Z` 시작하여 `18:32:41.252Z` 완료. 응답 원본 `results/45876724451-1-seat-1.json/.txt` **2/2 GitHub main 원문 직접 readback**. 실제 제어 실행 SHA `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`, 요청 기능 main source SHA `10be1e52138d5a59b9464e9b04f39d5bdcdcfb32`. 별도 labeled 이벤트 Run #45876724865는 `completed/skipped`이며 완료 증거로 사용하지 않음.
- **SQLite/원본:** `date=2026-11-26`, `observedCount=1`, `checkedCount=1`, `lastObservedAt=2026-11-26T01:59:59.000Z`, `lastCheckedAt=2026-11-26T11:45:35.868Z`, 정밀 `score=14.9967450271248`. 이들은 수집 확인 시각과 공급처 관측시각이 다르므로 섞지 않는다.
- **D1/API:** D1 `MATCHED` observed/check 각 1건, `observedStoredAt=1795689353820`, `checkedStoredAt=1795693535868`. 공개 API 1D·1W 모두 HTTP 200 `MATCHED`, observed/checks 각 true. `sameDayMatched=true`, `publicPeriodsMatched=true`. `providerCalls=0`, `d1Writes=0`, `operationalWrites=0`, `protectedStateUnchanged=true`. 단순 상태 코드를 넘어 원본 정밀값·시각·D1/API 일치까지 확인.
- **이전 #3989 대비 실제 변화:** 지난 `2026-11-26T17:04:15Z` 영수증의 원본 `observedAt`·정밀 score·`checkedAt`와 #4047 값이 **동일**. 따라서 이번에 새 CNN 관측 또는 표시 점수 변화를 입증하지 못함. `SOURCE_UNCHANGED`이며, 휴장/공급처 발표 미변동과 저장 장애를 단정적으로 동일시하지 않는다. 별도 60초 HTTP 실측 [#3998](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3998) 성공은 기존 증거로 보존.
- **실제 공개 브라우저 추가 확인 (읽기 전용):** 동일 검증일에 열린 `https://zgmini.kr/fear-greed/usa/`의 실제 hydration 텍스트를 읽어 **카드 15.0점 / 관측일 2026-11-26 / 기간 버튼 1일·1주·1개월·3개월·6개월·1년**을 확인. 로컬 정밀 점수 `14.9967450271248`의 소수점 첫째 자리 표시와 일치한다. 이는 저장형 API 연결의 실화면 기준점 증거이며, `/api/fear-greed` JSON 원문 직접 조회·신규 원본의 무새로고침 실시간 갱신 증거로 확대하지 않음.
- **화면 재사용:** 기존 사용자 PC 실제 차트 왼쪽 정렬 확인과 본체 [PR #1720](https://github.com/ansqhd5774-Choi/zgmini/pull/1720) 390/1440 브라우저 fixture PASS를 보존. 본체 해당 변경 `main@7b29bd8dad6635cfa20ed26e11ad890b9f205c3d` 이후 현재 R2 기준 `main@10be1e52138d5a59b9464e9b04f39d5bdcdcfb32`까지 9개 신규 커밋의 파일 diff에는 W06 차트·관측 API 변경 **0건**. 운영 신규값의 실제 모바일/PC hydration 및 무새로고침 전파는 여전히 **미관측**.
- **R2 단계 판정:** `R2-01 SQLITE_D1_OBSERVATIONS_API_BASELINE_PASS` (실제 실행/JSON·TXT 결과회수; 별도 `/api/fear-greed` 현재 카드 GET·실제 Production 동적 렌더 readback은 미확인). `R2-02 SOURCE_UNCHANGED` (새 표시 점수 변동 미관측). `R2-03/04`는 **기존 기준시각 값의 SQLite↔D1↔API 연결 검증 PASS**, *신규 원본에 대한 종단 검증은 대기*. `R2-05`는 기존 UI 검증 재사용, 신규 변동 실제 Production 자동 표시 미확인. `R2-06` 직접 확인된 신규 결함 없음. **전체 운영 종단 완료율 0/1 유지.**
- **다음 필수 실행:** 기존 승인 자연 수집에서 **새 `observedAt`과 실제 표시 점수 변화가 입증됐을 때만**, 그 단일 원본의 SQLite→D1→API 1D/1W(필요 시 1M)→실제 1440px/390px·무새로고침 전파를 연결하여 첫 불일치 단계만 최소 수정. 동일한 원본/설치/진단 재실행 금지, 새 예약·가짜 점수 금지.

### 20-33. W06 R2-02 — 운영 원본 재확인과 Legacy Sidecar 분리 (2026-11-27 KST)

- **고유 A 단계 실제 실행:** [제어 Issue #4053](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4053) / [Run #45877652042](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45877652042) `completed/success`, 승인 `fear-greed-archive-status`, `PASS/FEAR_GREED_ARCHIVE_READONLY_DIAGNOSIS`. `results/45877652042-1-seat-4.json` 및 `.txt` GitHub main **2/2 원본 직접 readback**. 수집 공급처 호출·운영 쓰기·D1 쓰기 각 0건, `protectedStateUnchanged=true`. 시작 `2026-11-26T18:39:48.751Z`, 종료 `18:40:03.041Z`. 실행 제어 SHA `3c7d4cfefacf072fd35cb19706b352c64c5e4fd2`.
- **R2-02 관측 상태:** 로컬 current `status=verified`, `observedAt=2026-11-26T01:59:59.000Z`, 정밀 `score=14.9967450271248`. 이전 #4047의 실제 조회 시점 `18:32:41Z` 대비 **observedAt과 점수 동일**. 원본 이력의 당일 마지막점 1건, `checkedAt=2026-11-26T11:45:35.868Z`도 동일. Current 출력 `storedAt=1795717993841`은 역사적 #3944 `1795707541763`보다 증가했으나 **저장 시각 갱신을 CNN 신규 관측·점수 변화로 오인하지 않음**. 원본 신규 변화는 `SOURCE_UNCHANGED`이며 R2-03~05의 *새 관측* 종단 0/1을 유지.
- **서로 다른 계열 분리:** 60초 W06 Task는 본체 `scripts/pc-writer/local-cycle.mjs --cnn-minute --publish` → `collect-local.mjs --cnn-minute` → `run-local.mjs --cnn-minute --publish` → `cnn-observed-archive-publication-r1.mjs`의 `publishCnnMinute`(기존 저장된 observed archive + current D1 CAS/readback) 경로를 사용한다. 과거 Core 실행 뒤 별도로 동작하던 `archive-sidecar-r7/archive-run.mjs`는 동일 경로가 아니다. Legacy Sidecar 진단을 근거로 60초 PT1M 수집 실패 또는 D1 신규 전파 불능으로 단정하지 않는다.
- **별도 Sidecar 징후:** 읽기 진단의 `last-run.json`은 `OBSERVED_UNATTESTED` 원장, `reportedStatus=BLOCKED`, `reasonConcepts=[SOURCE,SHA]`, `matchingErrorSite=NOT_CHECKED`; 이는 **실제 최초 실패 코드와 운영 원인 미확인** 상태다. 한편 설치된 `archive-run.mjs`의 SHA256 `eb3c43bf8fba6ea4e51f3e84b77f9ec13000db9d9e38077ffd914950d7080b6b`는 제어 저장소 승인 manifest `approvals/sidecar-b/w06-cnn-r3-installed-writer-v2-20261126.json`의 after/approvedContent SHA와 `results/cnn-sidecar-b-a7e845b2-39d3-4e52-8500-71c818b37d9f.json`의 `SIDECAR_B_APPLIED_VERIFIED` 영수증의 SHA와 일치한다. 반면 기존 읽기 진단 `controller/fear-greed-archive-readonly.mjs`의 정적 예전 허용 SHA 집합에 `eb3c43...`이 없어 `scriptStatus=CHANGED`로 표시된다. 이것은 **무승인 파일 변경을 증명하지 않는 구형 판별 기준 차이**다. Source/SHA `BLOCKED`의 실제 발생 이유는 별도 증거 없이는 확정하지 않는다.
- **영향/처리 분류:** Sidecar 단서는 W06 현재의 60초 승인 Writer·PT1M 수집·D1 공개 경로와 다르며, #4047 SQLite↔D1↔API 1D/1W PASS 및 #3998 자연 HTTP 수집 PASS와 직접 충돌하지 않는다. 현재 R2 종단 필수 행동을 막는다는 근거가 없으므로 **별도 NON_BLOCKING / 미조사 원인**으로 분리. 신규 Sidecar 설치·무단 source SHA 변경·무조건 B 재승인·old Controller 허용목록 완화는 하지 않음.
- **다음 동작:** 기존 자연 PT1M 실행에서 `observedAt`과 표시 score가 실제 전진하면 R2-03 SQLite→R2-04 D1/API→R2-05 1440/390 자동 갱신의 동일 관측값 비교를 이어간다. 입력이 그대로면 본 조회의 동일 재시도/반복 Issue를 만들지 않는다.

**R2-02 상태:** `SOURCE_UNCHANGED` (실제 읽기 검증 완료), W06 종단 `0/1` 유지.

### 20-34. W06 실제 60초 cadence 확대 관측 — 간헐 장시간 갭 발견 (2026-11-27 KST)

- **새로운 시간 조건으로 1회 읽기:** [Issue #4056](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4056) / [Run #45878346822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45878346822). 기존 A `process-inventory-readonly`, probe `w06-cnn-task-cadence-readonly`; `results/pc-process-inventory-45878346822-1-operating.json/.txt` 2/2 직접 readback. 실제 시간 `2026-11-26T18:45:47Z`, `PASS/W06_TASK_CADENCE_COLLECTED`, `operationalWrites=0`, `providerCalls=0`, `d1Writes=0`, `automaticRetries=0`. 단순 조회 완료를 연속 PT1M 수집 성공으로 오인하지 않음.
- **Task 상태:** `ZGMINI-PC-CNN-Minute` enabled·Ready, 60초 반복, 마지막 Task result 0, 마지막 Task 실행 `2026-11-26T18:45:01Z`, 다음 예정 `18:46:00Z`. `ZGMINI-PC-Local-Core`는 같은 순간 Running/5분 반복/lastTaskResult `2147946720`였으나, 그 사실만으로 CNN 긴 간격의 원인을 Core 충돌이라고 단정하지 않음.
- **실제 HTTP 관측:** 고정 Writer B 설치 readback 시각 `2026-11-26T17:02:17.109Z` 이후 **77건 중 74건 VERIFIED**, 실제 76개 요청 간격 중앙값 **61초**, 최장 **421초**, **90초 초과 11개**. 최근 12개 요청 간격 `[61,66,62,60,60,61,364,60,61,61,60,61]`초. 2일 private HTTP 집계 **152건 중 149건 VERIFIED, 3건 FETCH_FAILED**, HTTP 429·5xx 0건; 최신 VERIFIED `2026-11-26T18:45:23.650Z`(원본 관측시각이 아닌 PC GET 확인 시각). 따라서 과거 #3998의 10/10 연속 60초 근접을 **장시간 안정의 증거로 확대하지 않고**, `CADENCE_GAPS_OBSERVED`를 별도 실제 현상으로 기록.
- **자료 정의로 문제 분리:** private HTTP 확인은 코드 `worker/public-feed-store.mjs`의 `kind='input', feed_key='fear-greed-http-checks'`에 로컬 저장되고, CNN 점수의 원본 관측은 별도 `kind='output',feed_key='fear-greed-observed'`에 저장된다. 공개 `fear-greed-verified-checks`는 또 다른 승인된 계열이다. 그러므로 private HTTP `checkedAt=18:45Z`가 실제 관측 `observedAt=01:59:59Z` 또는 공개 Sidecar `checkedAt=11:45Z`보다 늦다는 사실만으로 신규 CNN 점수·D1 누락으로 판정하지 않음. R2-02 실관측 신규 점수 **SOURCE_UNCHANGED**.
- **가설 분리 필요:** 3건의 `FETCH_FAILED` 뒤 기존 5분 cooldown에 의해 길어진 구간과 `VERIFIED` 뒤의 장시간 작업 경합·Task IgnoreNew·fetch 지연을 구분해야 한다. 현 A는 개별 gap의 직전 HTTP outcome을 출력하지 않아 **실제 최초 원인을 아직 입증하지 못함**. `nextMinuteGate=CACHED`는 단일 미래 예상값, `Task Event 322` 채널 비활성은 skip 0건 증명이 아님.
- **비파괴 최소 진단:** 제어 [PR #4062](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4062) 기존 W06 A 읽기 projection에 **90초 초과 간격 직전 실제 결과의 범주별 건수·직전 HTTP 소요시간·최근 12건의 무기밀 범주 데이터**만 추가. Source·운영 Writer/Task/DB/API/공급자·수집 주기/쿨다운은 변경하지 않으며, 기존 CI/승인 결과를 확인한 후 동일 read-only probe에서 추가 구분 근거를 확보한다.
- **분리된 완료 조건:** 원본의 신규 `observedAt`·표시 점수 변화→SQLite→D1→API→UI는 아직 **0/1**. 동시에 최근 긴 간격 현상은 기존 완료로 표시하지 않고 최초 실패 경계만 확인·최소 복구; 사용자 승인 범위 밖 정책을 임의 변경하지 않는다.

### 20-35. 사용자 운영 기준 정정 — PT1M best-effort, 원본 전파가 실제 목표 (2026-11-27 KST)

- **판단 정정:** 이전 20-34에서 수집 간격 90초 초과 11건을 별도 안정성 미달 문제로 격상하고 해당 간격을 필수 진단 대상으로 삼았던 것은 **W06 목표에 비해 과도한 완료조건**이었다. 사용자 확정 기준은 **'CNN에서 유효 원본을 수집했으면 저장·D1·API·화면에 반영'**이며, 60초 Task는 실행 **목표 주기**다. 정확한 60초 간격·90초 초과 0건·FETCH_FAILED 0건을 필수 준수율/SLA 또는 DONE Gate로 만들지 않는다.
- **기존 실제 자료 보존:** [Issue #4056](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4056) / [Run #45878346822](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45878346822)의 77건·74건 VERIFIED·3건 FETCH_FAILED·90초 초과 11구간·최장 421초 관측은 사실로 보존한다. 당시 Task enabled/Ready, PT1M, 마지막 Task 결과 0, 최신 정상 수집 있음. 따라서 시간 간격만으로 기능 장애/수집 중단/신규 원본 누락/게시 실패를 **입증할 수 없다**. 긴 구간은 직접 관련 실패가 나타나기 전까지 `NON_BLOCKING`으로 분리한다.
- **추가 작업 철회:** 간격 직전 HTTP outcome 통계 확장용 제어 [PR #4062](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/4062)는 사용자 최종 목적에 불필요한 검사 증가를 막기 위해 **병합하지 않고 closed** 처리했다. 관련 소스 변경은 제어 `main`이나 운영 PC에 적용하지 않았다. Task·기존 타임아웃/쿨다운·운영 데이터·API·화면도 변경하지 않는다.
- **R2 완료 대상 재정의:** 새 `observedAt`을 가진 진짜 CNN 원본이 기존 자연 수집으로 들어오면 동일 점수라도 SQLite→D1→API→실제 PC/모바일 최신 표시·차트 반영을 검사한다. 새 원본 점수가 동일하다면 기존 표시 점수는 그대로이되 신규 관측시각·이력이 정상 반영되어야 한다. `checkedAt`만 전진하면 원본 미변동으로, 신규 점수/점 생성 금지.
- **실패 판단:** 실제 신규 원본을 받은 뒤 SQLite 저장 실패, D1 게시 누락, 공개 API 구버전, UI 반영 오류 또는 Task 자체의 실질적 장기 중단이 입증될 때만 그 해당 경계를 수정한다. **단순 간격 불규칙 또는 일시 fetch 실패를 이유로 새로운 기준·Controller·예약/운영 변경을 추가하지 않는다.**
- **현재 W06 종단 0/1:** 최신 직접 확인된 원본 `observedAt=2026-11-26T01:59:59.000Z`, 정밀 `score=14.9967450271248`, 앞선 SQLite·D1·1D/1W API 일치 PASS. 아직 신규 CNN `observedAt` 전파의 실제 end-to-end 증거가 없으므로 R2-03~05 신규 원본 대상만 미완료. 독립적으로 완료한 UI/설치/수집 경로 검증은 보존한다.

### 20-36. 신규 CNN observedAt 동일 점수 전파 경로 회귀검증 (2026-11-27 KST)

- **직접 사용자 확정 완료계약 적용:** W06 60초는 수집 시도 목표 주기일 뿐 60초 절대 SLA/90초 이하 충족 Gate가 아니다. **CNN에서 새 `observedAt`이 실제로 검증된 경우** 원본 점수는 같더라도 저장·게시하고, 같은 원본시각 반복 확인만으로 새 관측점을 생성하지 않는다.
- **최신 본체 원본 직접 검토:** `worker/public-feed-refresh.mjs`의 `refreshPublicFeeds({cnnMinuteOnly:true})`가 `acceptsStoredUpdate` 검증 후 `appendVerifiedObservations` 저장을 먼저 실행하고 `writeOutput` 현재값을 갱신한다. `scripts/pc-writer/cnn-observed-archive-publication-r1.mjs`의 `publishCnnMinute`가 기존 로컬 archive·current를 D1로 쓰고 실제 readback을 검증한다. `app/api/fear-greed/observations/route.ts` 및 `app/api/fear-greed/route.ts`는 D1 저장 결과 GET으로 읽으며, `components/use-stored-index.ts` 및 W06 패널은 공개값을 화면 활성 시 주기적으로 확인한다. 운영 원본/공급처 재호출 없는 source 경로 확인.
- **최소 회귀 추가·병합:** 본체 [PR #1724](https://github.com/ansqhd5774-Choi/zgmini/pull/1724), 변경 파일 **기존 시험 1개** `tests/cnn-observed-archive-r1.test.mjs`만. `codex/w06-new-observation-same-score-20261127`에서 동일 점수 17.9·새 원본시각 `2026-10-31T20:00:00Z → 20:01:00Z`라는 **명시적 격리 fixture**로 실제 수집/저장 코드의 archive 2점 + current 전진, 다음 재확인 중복 관측 0건, 실제 D1 publisher 코드의 archive/current CAS·readback 및 반복 게시 current 쓰기 0건을 검증. 이 fixture 시간과 값은 **실제 CNN 운영 관측이 아니다**.
- **통합 증거:** PR HEAD `49a0f90e25abeec0b2b6f60f2ef697e6c18a8e03`에서 Node CI `check`, `analyze`, Secret Scan `scan`, CodeQL **전부 SUCCESS**. 병합 정확 SHA `55cd9e8cf26eb46992474b3072d8bf00c2e3bb5d`. 운영 수집기 코드·Task/쿨다운/DB/공개 API/UI/Cloudflare 설정은 **0파일 변경**, 별도 PC 설치·공급처 호출·D1 쓰기는 하지 않음.
- **현재 실제 운영 입증과 분리:** 기존 운영 A #4047 SQLite↔D1↔API 1D/1W `PASS`, 실제 표시 15.0점·2026-11-26 관측 근거 유지. 마지막 실측 CNN `observedAt=2026-11-26T01:59:59.000Z`, 점수 `14.9967450271248` 이후 **새 observedAt은 확인되지 않음**. 그래서 실제 신규 원본→SQLite→D1→API→PC·모바일 새로고침 없는 자동 반영은 **미관측 / 종단 0/1 유지**. 시험 통과·병합을 운영 1/1로 주장하지 않는다.
- **이어갈 작업:** 새 자연 `observedAt`이 실제 확인된 경우 기존 R2-03~R2-05의 동일 시각·정밀 점수·저장일·게시 readback·실화면 반영을 연결해 종결. 미발표 상태에는 이전 조회/진단 중복 요청, 별도 Gate/Controller/예약 생성, 합성 원본 데이터 추가 금지.

### 20-37. 동일 점수 신규 원본 경로 main 배포 적용 결과 (2026-11-27 KST)

- 이전 20-36의 실측·PR·회귀증거를 보존하고 **새 운영 데이터가 발생한 것으로 소급하지 않음**. 본체 `main@55cd9e8cf26eb46992474b3072d8bf00c2e3bb5d`는 [PR #1724](https://github.com/ansqhd5774-Choi/zgmini/pull/1724)의 기존 시험 1파일 추가 변경을 병합한 정확 SHA.
- 해당 SHA의 정규 Cloudflare Git Integration **Workers Builds: zgmini-migration-candidate-r5 completed/success**, Production Build `695cf4c1-06d9-4dfa-83d4-02ca3c9f9e34`, 완료 `2026-11-26T19:00:22Z`. 해당 SHA의 [Node CI #45880016171](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45880016171) SUCCESS 및 [Production SEO Health #45880016199](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45880016199) SUCCESS. SEO 검사는 실제 공개 경로 및 정규 리다이렉트 확인이며 실시간 W06 점수의 종단 증거로 사용하지 않음. 동일 SHA [Source Secret Scan #45880016144](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45880016144) SUCCESS. CodeQL은 조회 시 진행 중, PR HEAD에서 CodeQL PASS 기검증; 상태를 혼합하지 않음.
- **추가 비파괴 소스 대조:** `worker/public-feed-refresh.mjs`는 성공적으로 검증된 실제 CNN observedAt만 SQLite archive를 먼저 저장하고 current를 갱신함. `scripts/pc-writer/cnn-observed-archive-publication-r1.mjs`는 같은 로컬 archive/current를 D1에 게시하고 정확 readback을 검사. `app/api/fear-greed/route.ts`와 observations API는 D1 저장값만 읽고, `components/use-stored-index.ts`와 W06 패널은 화면 활성·포커스 시 저장형 API 결과를 갱신함. 코드 경로의 기존 증거 및 PR #1724 PASS를 재사용하고 추가 Task/수집/DB/게시 수정은 하지 않음.
- **공개 웹의 관측 한계:** 현재 일반 공개 웹 페이지의 SSR HTML은 초기 `확인 중` 상태를 포함하며 실제 hydrated API·차트 점수의 증거가 아님. 외부 텍스트 조회에서는 `/api/fear-greed`·`/api/fear-greed/observations?period=1D` JSON 원문을 가져오지 못함; 이를 HTTP 503나 운영 장애로 단정하지 않음. 기존 #4047의 정확 SQLite/D1/API 원본 일치와 실제 브라우저 15.0점 확인을 유효한 마지막 실측으로 보존.
- **실제 신규 관측 상태:** 마지막 PC 승인 조회 #4053의 `observedAt=2026-11-26T01:59:59.000Z`, `score=14.9967450271248`; 그 이후 새 원본 `observedAt`의 저장·D1 게시 영수증은 아직 회수되지 않아 **R2-03~05 신규 종단 0/1 유지**. 같은 입력·시각으로 #4047/#4053을 반복 실행하거나 60초 간격 자체를 장애 Gate로 복원하지 않는다.
- **다음 필수 실제 행동:** 기존 자연 수집에서 새 CNN observedAt이 입증된 시점의 **동일 원본 시각·정밀 점수**로 SQLite→D1→API→실제 PC·모바일 마지막 점 및 새로고침 없는 반영을 검증한다. 첫 실제 불일치가 발견된 경계만 최소 수정. 그 전에는 완료된 소스/설치 검증을 반복하지 않는다.

### 20-38. W06 R2-05 동일 점수 신규 관측시각 자동 화면 갱신 회귀검증 (2026-11-27 KST)

- **이전 완료 재사용:** PR #1724 실제 수집 → SQLite 원본 이력 → D1 archive/current 코드 회귀 PASS, 제어 #4047 기존 원본의 SQLite↔D1↔공개 API PASS, 차트 기간/왼쪽 정렬 사용자 확인과 390/1440 UI PASS를 보존. CNN 60초는 목표 시도 주기이고 엄격한 SLA가 아니라는 사용자 기준 유지.
- **독립 R2-05 화면 경로 보강:** 본체 기존 `tests/cnn-current-session-verified-checks-browser-r12.mjs` 한 파일만 변경한 [PR #1728](https://github.com/ansqhd5774-Choi/zgmini/pull/1728), 전용 개발 브랜치 `codex/w06-same-score-ui-refresh-20261127`. **의도적으로 격리된 fixture** `2026-10-30T13:22:00.000Z / score 26.4` 다음에 **진짜 관측시각 모형** `2026-10-30T13:23:00.000Z / score 26.4`를 기존 두 개 저장형 GET(`/api/fear-greed`, `/api/fear-greed/observations?period=1D`) 응답에 반영하여 페이지 reload 없이 1분 bucket 3→4, 실제 SVG 선 갱신 및 첫 점의 plot 왼쪽 정렬, 모바일 최신 source tooltip `09:23 ET / 26.4`를 검증. 원본 점수가 같아도 `observedAt`은 새 이력이 되고 PC checkedAt은 원본 분봉으로 혼합하지 않는 화면 계약이다.
- **실제 검증:** PR HEAD `5f452bf405d630553b00d6e8098e6670be21f06b`의 Node CI `check`, CodeQL `analyze`, Source Secret Scan `scan`, CodeQL canonical `CodeQL` **SUCCESS**. [W06 브라우저 Run #45880806014](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45880806014)의 **8번 단계** `Verify CNN actual PC-check 1D curve and stale-session exclusion at 390/1440` **SUCCESS**. 다른 기능 브라우저 단계의 전체 완료를 W06의 추가 Gate로 삼지 않음.
- **소스 통합:** [PR #1728](https://github.com/ansqhd5774-Choi/zgmini/pull/1728) 정규 `main` 병합 `7579dea082d0f7a671113e52e39cefc9be8c9a87`. 변경 **기존 browser test 1파일뿐**. 운영 기능 소스·Writer/Task/수집 주기·SQLite/D1 계약·API·차트 스타일/화면 문구·DNS/Cloudflare 설정 수정 0.
- **증거 범위:** `13:23Z / 26.4`는 **실제 운영 CNN 값이 아닌 격리 테스트 입력**이다. 이 CI 성공은 같은 값이라도 원본 시각이 새로워지면 현재 화면이 자동으로 받아들일 수 있는 코드 경로만 입증한다. 마지막으로 직접 확인된 실제 운영 CNN 원본은 여전히 `2026-11-26T01:59:59.000Z / 14.9967450271248` (#4053). 새로운 `observedAt`의 실제 SQLite→D1→API→실제 Production PC·모바일 전파 증거가 없으므로 **W06 운영 종단 0/1 유지**. 신규 원본을 강제 생성하거나 같은 조건의 PC 조회를 반복하지 않는다.
- **남은 필수 실행:** 기존 자연 수집에서 새 유효 CNN `observedAt`이 확인됐을 때 같은 원본 점수·관측 시각으로 승인 읽기 경로를 통해 SQLite → D1 → 공개 API → 실제 Production 390/1440 화면의 신규 점수·관측시각을 종단 대조. 처음 실제 실패가 생긴 단계만 수정. PR 병합 SHA의 Cloudflare Git Integration 빌드/Production API 응답 확인은 해당 정확 SHA 증거로 별도 판정하고, 코드 CI·mock은 운영 전파를 대신하지 않는다.
- **병합 후 실제 Build/Production 결과:** `main@7579dea082d0f7a671113e52e39cefc9be8c9a87`의 정규 Cloudflare Git Integration `Workers Builds: zgmini-migration-candidate-r5` **completed/success**, Build ID `d0eb01a0-ccc8-4bdc-83c2-3f70726e08b7`, 완료 `2026-11-26T19:08:51Z`. 동일 SHA [Production SEO Health Run #45881251826](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45881251826) **completed/success**, 실제 Production 기본 공개 경로·정규 리다이렉트 검사 확인. 같은 SHA Secret Scan SUCCESS. 이 증거는 코드 빌드/공개 접근의 증거이며 실제 신규 CNN 관측값 자동 갱신 실증은 아님. 메인 병합 이후 CodeQL·Node CI는 기록 당시 일부 진행 중(사전 PR HEAD PASS는 기확인), 확정 결론은 실제 종료 readback으로 판정한다.

### 20-39. W06 1M~1Y 공개 차트 원본 구간 마지막점 오류 수정 (2026-11-27 KST)

- **실패 조건 소스에서 구분·재현:** 기존 `/api/fear-greed/observations?period=1M/3M/6M/1Y`는 `sampleCnnObservedPoints(all)`을 먼저 적용했다. 원본 >1,200개이면 이 함수는 **원본 index 구간의 최저·최고값**을 골라 실제 표시단위(1M 5시간, 3M·6M·1Y 뉴욕 관측일)의 최종 시각이 누락될 수 있다. 이후 `buildCnnPeriodChart`가 재집계해도 버려진 원본은 복구할 수 없다. **실제 기존 함수를 그대로 실행한 재현용 4,000개/5시간 14구간에서 13개 구간의 마지막 실제 source observedAt이 달랐다.** 이는 재현 fixture이며 운영 DB에 해당 개수가 존재하거나 실제 13구간이 이미 틀렸다는 관측 증거가 아니다.
- **최소 수정:** 본체 [PR #1731](https://github.com/ansqhd5774-Choi/zgmini/pull/1731), `codex/w06-period-observation-bucket-last-20261127`에서 3파일 수정: `lib/cnn-observed-sampling-r1.mjs`에 display-only `projectCnnObservedPeriodPoints` 추가, `app/api/fear-greed/observations/route.ts`의 해당 기간 진짜 `points`에만 적용, `tests/r4-cnn-public-observed-route-36.test.mjs`에 실제 route 실행 회귀 2건 추가. **1M은 각각 5시간 구간의 마지막 실제 CNN observedAt**, **3M/6M/1Y는 America/New_York 날짜의 마지막 실제 CNN observedAt**으로 표시함. 1D·1W 원본 전체, `from/to` 지정 최대 7일 원본 조회, 기존 PC `checkedPoints` 샘플링 및 타 Composite API의 범용 `sampleCnnObservedPoints` 함수 동작은 변경하지 않음. 보간·가짜 값·날짜 생성 금지. 원본 SQLite/D1 저장 규약/내용·공급처 호출·Writer/Task·TTL·API 메타필드·차트 선/버튼·DNS·Cloudflare 설정 변경 없음.
- **시험:** 실제 TS GET 런타임을 격리 D1 read-only 2 SELECT로 실행하여 4,000개 원본의 5시간 마지막점 전체, NY 날짜·UTC 자정 교차 관측의 3M/6M/1Y 마지막점, 유효한 진짜 0점, custom 날짜 범위 raw 4점 보존을 PASS. 독립 JS 검증에서도 5시간 14/14 실제 구간 마지막점 일치·NY day 2/2 점수 [17,0] 확인. 빈 데이터·기존 1D/1W·원본 중복/충돌 503과 checkedAt 분리는 기존 회귀 그대로 유지.
- **CI 오류·최소 정정:** 1차 PR HEAD `6d0fca1423e20aeb2cbfb2bb5ef713c3a44a2309`의 전체 회귀시험은 통과했으나, 변경 파일 ESLint에 기존 TS D1 envelope `let entry:any` 2곳이 걸려 Node CI check FAIL. 그 2개 파싱 변수만 `unknown` 구조 타입으로 변경하여 필수 원본 검증·503 중단 경계는 유지. 최종 PR HEAD `f94de55e77259fe636cf327d55efc6ad85437aa2`의 **Node CI check, ESLint, CodeQL analyze/CodeQL, Source Secret Scan scan 모두 SUCCESS**.
- **병합 경계:** 다른 개발자가 본체 main에 무관한 UI 시험 2파일을 병합하여 잠시 PR mergeability 확인이 불명확했으나, 실제 최신 diff에 W06 대상과 겹치는 파일 0·GitHub `mergeable_state=clean` 확인 후 기존 PR 그대로 정규 병합. **main merge SHA `1bd000a5218cee551efa1c1935cebc40695bfc4e`**. 다른 작업 파일 덮어쓰기·rebase/force/clean/reset 없음.
- **정확 SHA 병합 후 배포 실증:** `main@1bd000a5218cee551efa1c1935cebc40695bfc4e`의 Cloudflare Git Integration **Workers Builds: zgmini-migration-candidate-r5 SUCCESS**, Build ID `03c79e26-930e-425d-9c85-820d790b53e0`, 완료 `2026-11-26T19:24:03Z`. 동일 SHA [Production SEO Health Run #45882976260](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45882976260) **SUCCESS**, 실제 SEO 공개 경로·정규 리다이렉트 시험 2/2 PASS. 동일 SHA Node CI `check`, CodeQL `analyze`, Source Secret Scan `scan` 모두 SUCCESS. 이것은 **코드·배포·기본 Production 경로**의 증거이고 신규 CNN live API 값·hydrated 차트 실제 변경의 증거는 아님.
- **운영 상태 분리:** PR 구현·CI·병합은 완료됐지만, 해당 SHA의 Cloudflare Production Git Integration·실제 공개 API에서 1M+ 구간값을 readback한 증거는 별도 확인 대상. 공개 웹/API 텍스트 직접 조회 불가, 연결된 Browser Use read-only도 `insufficient_credits`로 실행되지 않음; 유료 충전·새 도구 계약 추가 없이 기존 완료 영수증 보존. **원본 신규 관측값 observedAt의 SQLite→D1→API→실제 Production PC/모바일 자동 전파는 아직 0/1**. 마지막 운영 조회 #4053의 `observedAt=2026-11-26T01:59:59.000Z`·`score=14.9967450271248`를 새 관측값으로 둔갑시키지 않음.
- **다음 필수 실행:** 정확 병합 SHA Cloudflare build/Production 경로 결과를 확인하여 기존 원장 보강. 실제 자연 CNN 새 `observedAt` 확보 시 해당 원본·정밀 점수의 SQLite→D1→실제 공개 API→PC/모바일 화면 종단 검증. 60초 간격 준수 진단·이미 통과한 조회/Writer 설치 재시도 및 원본 생성 금지.

### 20-40. 실제 공개 브라우저 현재값 및 신규 저장형 readback 접수 (2026-11-27 KST)

- **기준 source·배포 재사용:** 본체 `main@1bd000a5218cee551efa1c1935cebc40695bfc4e`를 새로 조회하여 PR #1731의 기존 병합 SHA와 동일함을 확인. 기존 Cloudflare Git Integration 및 Production 기본 경로 PASS는 20-39의 유효 증거로 재사용; 새 빌드·설치·60초 간격 진단을 재실행하지 않음.
- **실제 브라우저 공개 화면:** 연결된 웹 브라우저의 `https://zgmini.kr/` 실제 렌더링 DOM 읽기에서 미국 CNN 현재 **15.0점, 관측일 2026-11-26** 확인. 마지막 기존 PC 원본 `observedAt=2026-11-26T01:59:59.000Z`, `score=14.9967450271248`의 소수 첫째 자리 표시와 일치함. 브라우저 화면의 표시값·날짜는 확인했지만 동일 원본의 최신성 또는 새로운 observedAt의 존재를 입증하지는 않음. PC 1440px·모바일 390px 신규 원본 자동 갱신 실증은 여전히 미확인.
- **직접 API 조회 한계:** 이번 읽기 환경에서 공개 `/api/fear-greed` 및 `/api/fear-greed/observations?period=1D,1W` JSON URL은 접근 불가. 운영 API 실패로 단정하지 않고 기존 공식 PC 읽기 경로를 채택함.
- **단회 신규 A 읽기 요청:** 제어 [Issue #4082](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4082)에 원자적 `pc-job` 라벨/본문을 함께 생성. 작업 `cnn-public-d1-api-readback-readonly`, source `main@1bd000a5218cee551efa1c1935cebc40695bfc4e`, requestId `pc-457a48ca-1337-4c5f-8c16-d7a7e5f46bc1`. [Run #45884083567](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45884083567)은 2026-11-27 KST 신규 요청 직후 **pending**(실행 작업 및 JSON/TXT 영수증 미확보)으로 확인. `pending`을 실제 PC 오류·PASS 또는 SOURCE_UNCHANGED로 판정하지 않으며, 같은 requestId/효과 중복 요청하지 않음.
- **결과:** 코드·운영 쓰기·DB/D1 원본 변경 없음. 신규 CNN 실제 관측값 SQLite→D1→API→PC·모바일 무새로고침 자동 반영 **운영 종단 0/1 유지**. 다음 행동은 **기존 #4082 / Run #45884083567의 완료·실행 SHA·JSON/TXT readback 회수**이며, 원본 `observedAt`이 실제 전진했다면 동일 정밀 점수로 SQLite/D1/API/UI를 대조하고, 미변동이면 기존 정상 이력 유지 후 조건부 종단만 미완료로 둠.

### 20-41. #4082 PC 읽기 요청의 워크플로 실행 전 대기 구간 분리 (2026-11-27 KST)

- **기존 요청 유지·중복 실행 금지:** 원본 [Issue #4082](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4082) / [Run #45884083567](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45884083567) (requestId `pc-457a48ca-1337-4c5f-8c16-d7a7e5f46bc1`) 재조회 결과 `status=pending`, `conclusion=null`, `run_attempt=1`; 원본 Issue OPEN·댓글 0. 해당 run의 GitHub Actions `jobs.total_count=0`, `pending_deployments=[]`, `approvals=[]` 확인. 그러므로 아직 Windows PC 작업 자체의 시작·실패·성공 및 Runner offline 여부를 단정할 수 없음.
- **구분 증거:** 동일 `ZGMINI PC Job` 워크플로의 다른 Run #45884082348은 `queued`, `approved-pc-job` Job 1건 역시 `queued`; 과거 Run #45881716545는 `completed/success`. 현재 #4082의 `pending` 상태는 W06 CNN provider·SQLite·D1 장애 증거가 아니며, GitHub 워크플로와 Windows 업무의 시작 전 경계를 분리함. GitHub 내부 스케줄링의 근본 원인은 미확인.
- **독립 공개 조회:** 공개 `https://zgmini.kr/fear-greed/usa/` HTML 경로 접근 확인, 미하이드레이션 초기 화면에는 점수가 `—`로 나타날 수 있으므로 실데이터 미게시로 취급하지 않음. 공개 JSON `/api/fear-greed` 및 `/api/fear-greed/observations?period=1D,1W`는 이번 웹 도구 접근 불가. 코드·수집·DB·배포 변경 없이, 본 원장 20-40의 실제 브라우저 15.0점·관측일 2026-11-26 증거를 보존함.
- **판정·다음 행동:** 기존 정상 설치 및 20-39 코드·Production 확인은 유지. 실제 신규 observedAt SQLite→D1→API→PC/모바일 종단은 **0/1 미검증**. 우선 #4082가 `in_progress/completed`로 전환된 경우 **동일 run/attempt**의 JSON/TXT와 source SHA를 직접 회수한다. 계속 `pending`이면 새 동일 효과 pc-job, 강제 수집, 60초 간격 진단 및 불필요한 설치·PR을 반복하지 않는다.

### 20-42. #4082 원격 결과 파일 부재 직접 확인 및 공개 API 조회 환경 구분 (2026-11-27 KST)

- **동일 고유 요청의 영수증 직접 대조:** [Issue #4082](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4082), [Run #45884083567](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45884083567) `attempt=1`에 대해 제어 저장소 `main`의 `results/45884083567-1-seat-{1..6}.json` 정확 6개 경로를 조회했으며 **6/6 모두 GitHub 404(파일 미존재)**. TXT/기타 결과 파일은 이번 조회 범위에 넣지 않음. 이 결과는 **해당 경로에서 JSON 미확보** 증거이지 W06 CNN 수집·게시 실패 판정이 아님.
- **런타임 경계:** #4082 `status=pending`, `conclusion=null`, GitHub Actions Job 0건, Issue OPEN·댓글 0. 동일 워크플로의 별도 Job 대기도 확인되어 현재는 GitHub 실행 전 대기 상태다. 다른 작업의 Runner 경합·실제 PC 고장·GitHub 내부 배정 실패 중 어느 원인인지 추가 입증 없음. 기존 #4082 요청을 재발행·재실행하지 않음.
- **독립 공개 경로 점검:** 웹 조회의 `/api/fear-greed`, `/api/fear-greed/observations?period=1D/1W` 접근 실패, 별도 격리된 컨테이너 HTTPS GET에서는 `zgmini.kr` DNS 해석 실패 확인. 이는 **도구의 네트워크 접근 한계**이므로 Production API 장애로 취급하지 않음. 기존 사용자 연결 브라우저 `https://zgmini.kr/`의 CNN 카드 **15.0점 / 2026-11-26** 표시값은 이전 원본 `14.9967450271248`의 반올림과 일치하나 정확한 최신 observedAt의 신규 전진 여부는 미확인.
- **정확 진행 판단:** W06 실제 신규 observedAt의 SQLite→D1→API→1440/390 무새로고침 갱신은 **0/1** 유지. 본체 `main@1bd000a5218cee551efa1c1935cebc40695bfc4e`와 기존 배포/CI/격리 UI 성공은 보존. 다음은 기존 Run #45884083567의 상태 전진 후 고유 결과 JSON/TXT 회수; 실제 새 원본이 있으면 R2-03~05 같은 시각·정밀값 대조, 없으면 `SOURCE_UNCHANGED` 부분 미완료로 유지한다.

### 20-43. 운영 PC Job 실행 대기 공통 조정 및 추수감사절 관측 해석 (2026-11-27 KST)

- **공통 요청에 증거 직접 연결:** 제어 저장소 기존 조정 Issue [#68 댓글 #7201873564](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-7201873564)에 W06 Issue [#4082](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4082) / [Run #45884083567](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45884083567) 상태를 기록. 이 Run은 `event=issues` 생성 자체는 확인되지만 `pending, conclusion=null, attempt=1, jobs=0`, Issue 댓글 0, 결과 JSON 6개 고정 좌석 경로 404. 이는 **기존 #4078 / 공통 인계 #4079의 워크플로 Run 미생성**과는 서로 다른 실패 경계다. 비교 대상으로 Run #45884082348의 Windows job `queued`, 운영 A #4080 / Run #45883221676의 Runner 배정 전 `queued`를 구분. Windows Runner 실제 상태/공유 B #4069 인과는 현재 미입증. 지원 댓글은 원담당 외 대화가 실제 수신·조치했다는 뜻이 아님.
- **독립 관측 기준:** 공식 NYSE 2026 휴장 달력에서 미국 현지 **2026-11-26(목) Thanksgiving Day 종일 휴장**, 2026-11-27(금) 13:00 ET 조기 폐장 확인(https://www.nyse.com/trade/hours-calendars). 공급처 CNN의 실제 발표 빈도와 이 달력을 동일시하지 않으며, 신규 `observedAt` 미확인 사실만으로 수집장애를 단정하지 않는다. 휴장일을 가짜 차트점으로 채우거나 새로운 일정/감시 예약을 만들지 않는다.
- **본 W06 검증 상태:** 기존 #4053 마지막 확인 CNN `observedAt=2026-11-26T01:59:59.000Z`, 정밀 `score=14.9967450271248`; 실제 브라우저 15.0점/2026-11-26와 합치. **새로운** CNN 원본의 SQLite→D1→API→1440/390 무새로고침 반영은 증거 없음, **운영 종단 0/1 유지**. 기존 PR #1731/배포/격리 회귀 결과 재사용, 원본·공급자·DB/D1·UI 및 수집 Task 변경 0.
- **다음 행동:** 원본 #4082 단회 Run/attempt가 실제 종료되면 결과 JSON/TXT와 실행 source SHA를 회수하여 `observedAt`의 정확한 전진을 판정한다. 새 원본이면 동일 정밀값 SQLite→D1→API→실제 화면 검증, 미변동이면 SOURCE_UNCHANGED 범위만 유지. 공통 Runner 스케줄링의 지원은 기존 #68 댓글로 추적하고 W06가 허가 없이 Controller/Runner 변경을 시작하지 않는다.

### 20-44. #4082 동일 Issue 이중 workflow 가능성과 실제 대기 경계 정정 (2026-11-27 KST)

- **새로운 구분 증거:** 제어 [#4082](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4082)는 2026-11-26T19:29:59Z 생성, GitHub Issue events에 `pc-job` labeled가 19:30:00Z 기록. 그 직후 동일 `ZGMINI PC Job` workflow·`pc-job` 표시 제목의 [Run #45884082348](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45884082348) (19:30:02Z, `queued`, `approved-pc-job` Job 1개 `queued`)와 [Run #45884083567](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45884083567) (19:30:03Z, `pending`, Job 0개)가 발생. 같은 Issue의 `opened` + `labeled` 두 이벤트에서 생성됐을 가능성이 높다. 단, GitHub workflow-run API 응답에는 개별 실행의 event action 및 Issue 번호가 없어 두 Run의 정확한 이벤트 귀속은 **미입증**. 이전 20-41/43절의 #45884082348을 독립 PC 요청으로 전제한 비교는 유보한다.
- **워크플로 실제 코드:** 실행 SHA `323f672335b799f830333230589042ea837733b8`의 `.github/workflows/pc-job.yml`에서 `on.issues.types: [opened, labeled]`, `concurrency.group: pc-request-${{ github.event.issue.number }}`, `cancel-in-progress: false` 확인. 동일 Issue에서 두 Run이 생성됐다면 후발 Run의 `pending`은 그룹 직렬화로 설명 가능. labeled 경로의 Job 자체는 `ZGMINI_PC_JOB_LATE_LABEL_ENABLED == 'true'` 조건이 있으므로 late-label 실행 가능 여부는 설정 미확인으로 별도 둔다. **첫 Run의 `queued` 원인과 Windows Runner 실제 상태는 이 분석만으로 규명되지 않는다.**
- **공통 큐 현황:** 조회 시 제어 저장소 Actions 목록에는 `queued` 총 15건, `pending` 총 2건으로 집계됐고, Run #45886695741 C996 `c996-source`·#45886695672 Secret `secret-scan`·#45886802996 CI intake `observe-source-completion`도 Job `queued`였다. 따라서 대기가 W06 CNN 기능 코드에만 한정된 현상이라는 설명은 지지되지 않지만 모든 Run이 하나의 근본 원인이라는 뜻은 아님. #4080 / Run #45883221676 역시 `queued`.
- **유효한 처리:** 원본 #4082 단회 요청만 유지. 신규 Issue·재실행·Runner 추가·Controller 조작·재설치 없음. #45884082348의 실제 첫 Job 및 #45884083567 상태를 **둘 다** 추적해 먼저 실행 결과가 나온 쪽의 JSON/TXT·requestId·source SHA를 회수한다. 마지막 운영 CNN `2026-11-26T01:59:59.000Z / 14.9967450271248` 이후 신규 `observedAt`이 확인되면 SQLite→D1→API→실제 PC/390px 화면의 새 저장형 점수·원본 시각을 비교한다. 새 원본이 없으면 종단 **0/1 미완료 유지**. 공통 Runner/Actions 대기는 기존 제어 #68에서 별도 추적한다.
