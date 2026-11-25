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
- 2026-11-26 현재: **1단계 진행 중, 5단계 독립 UI 소스 구현 진행 중**. 기존 #1521 복구 완료와 최신 main 소스 경로는 확정; 현재 운영 실행 source/실제 요청 간격과 기존 1분 실행 연결 여부는 미확정.
- 계획서 및 원장 생성은 문서 작업으로만 집계한다. W06 운영 완료율은 미산정(실행 증거 부족), 기존 복구 완료 증거는 유지한다.
- #1521은 2026-11-24 최종 운영 검증 후 CLOSED. 기존 복구는 완료이며 신규 W06 고도화와 구분한다.
- 신규 60초 수집에는 현 소스의 15분 간격/5분 quota 및 5분 Core 실행 구조가 맞지 않는다. 실제 운영의 적용 값과 공급자 허용 범위는 미확정. 전체 업무 차단 아님; 독립 UI 구현 계속.

## 2. 단계별 진행표

| 단계 | 상태 | 이번 원장 기준 증거 / 미완료 조건 |
| --- | --- | --- |
| 1. 실제 경로 확정 | 진행 중 | #1521 CLOSED 및 종단 PASS 승계, 최신 main 소스 경로·15분/5분 제약 확인; 운영 설치본·실제 HTTP 요청 간격 및 기존 실행 연결 확인 필요 |
| 2. CNN만 1분 확인 | 미착수 | 60초 자연 HTTP 요청 간격 미입증; 다른 지표 주기 보존 필요 |
| 3. 원본 저장·변동 감지 | 미착수 | 기존 저장/검사 증거 재사용 가능; 신규 표시값 중복·복귀·정정 처리 미검증 |
| 4. 1·5·10·30분 집계 | 미착수 | 네 구간·결측·진행 구간·시간대·선형 차트 검증 필요 |
| 5. D1·API·자동 화면 갱신 | 진행 중 | 기존 D1/API 1D·1W PASS 승계; 관측 API 60초 재조회·실패 보존 소스 및 브라우저 회귀 추가, CI/운영 검증 미완료 |
| 6. 회귀시험·운영 적용 | 미착수 | 신규 UI 브라우저 회귀 코드 추가; 실제 CI·운영 설치·배포 미실시 |
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
| 네 분 간격 | 원본 기반 대표값·실제 시각·결측·미완료 구간·NY/DST | 미입증 |
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
진행 중 신규 PC requestId: 없음. 기존 타 담당자의 운영 요청을 중복 발행하지 않는다.

## 6. 다음 직접 실행

1. 최신 main 및 전용 브랜치의 관련 소스 차이와 CNN 수집기/피드 정책, collect-local/quota, Sidecar 실제 실행 계약을 확인한다. 기존 운영 영수증의 정확한 실행 SHA·설정·요청 간격을 필요한 범위에서 재사용한다.
2. CNN에 실제 적용되는 15분/5분 제한의 위치와 실행 주기를 구분하고 기존 승인 실행기가 CNN만 60초 확인 가능한지 판정한다. 불명확하면 기존 등록된 읽기 전용 경로로 최소 관측만 확보한다.
3. 1단계 경로 확정 결과를 기록하고, 승인 범위의 최소 변경으로 2단계에 이어간다. 원본 저장과 표시 필터는 분리하며 독립 API/UI 작업은 공통 운영 문제에 묶지 않는다.

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
