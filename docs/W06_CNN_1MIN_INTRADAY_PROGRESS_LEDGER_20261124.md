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
2026-11-26 #3741/#3742/#3766 및 #3786 A 결과 회수 완료. 후속 #3792 (90f59760-5dd7-4df4-95c5-af0139db34a2), #3793 (f4c41825-2985-4f8f-8ec3-b77e01947f24) 실제 결과 2/2 각각 회수·completed closed. #3795 (ca22b9ae-ff44-4a52-8cb8-b8484d87c401) PASS_READONLY, JSON/TXT 2/2 회수, completed closed. #3798 및 Controller 변경 후 #3800, 게시기 R2 #3804 실제 결과 각각 회수·completed closed. 현재 미회수 요청 없음. 동일 요청 중복 금지. §14 참조.

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
