# 자산 버블 R10 최신 개별 관측치 — 목표·단계·진행률 정본

- 기준일: 2026-11-09 KST
- 기능 저장소: `ansqhd5774-Choi/zgmini`
- 작업 브랜치: `fix/asset-bubble-r10-latest-observations-20261103` (Draft PR #961)
- 공통 실행/승인 정본: `ansqhd5774-Choi/zgmini-pc-control` 최신 `main`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`.
- 범위: **기존 승인 산식/가중치/평가분기·기존 R10 결과를 보존하면서 구성 6개 지표의 검증된 최신 개별 관측치만 현재/이전/관측 추이에 반영.**
- 이 문서는 실행·승인·설치 완료 증거가 아니며, 다른 ChatGPT 대화에 자동 전달되는 메시지도 아니다.

## 1. 최종 통과 조건

1. 6개 지표 모두 검증된 `latestObservation` 값·이전값·실제 관측일/분기를 가진다. 발표 가능일·월말 완결성·시장폭 자료품질 등 기존 개별 검증을 통과해야 한다.
2. 종합점수 평가 분기는 현재 `2026-Q2`이며 점수 약 `22.6` 및 가중치·산식·scored/raw/history 기존 계약을 임의 변경하지 않는다. 최신 개별 관측치와 점수 평가 분기를 혼동하지 않는다.
3. PC 공급자 수집 → SQLite/로컬 원자료 저장·재조회 → 저장 자료 기반 계산 → 새로운 결과/checkpoint 로컬 저장 → 기존 게시기로 D1 반영 → 공개 API/UI 재조회가 동일 소스/날짜/값으로 연결된다.
4. 동일 sourceVersion/sourceStoredAt을 덮어쓰거나 날짜·결측치를 임의로 채우지 않는다. PC/모바일에서 현재·이전·날짜·차트 마지막 점을 확인한다.
5. 기능 개발·배포를 모두 완료한 **이후**에만 자연 예약 자동 갱신 검증을 후속으로 수행한다. 과거 Controller 복구, 무관한 전체 테스트, 타 기능의 대기 자체를 R10 기능 완료의 Gate로 추가하지 않는다.

## 2. 6단계 진행률 (동일 가중치, 시작 기준선)

| 단계 | 담당·업무 | 완료 증거/통과 기준 | 2026-11-09 |
|---|---|---|---|
| 1 | R10 담당: 기존 계약·원자료 6개 확인 | `/api/asset-bubble-raw` READY, scoreObservationQuarter=2026-Q2, score=22.57324…, factors=6, 산식 보존 | DONE |
| 2 | R10 담당: 최신 개별 관측치 후보 개발 | PR #961의 관련 테스트 48/48 PASS, 차이·범위 검토. **Draft로 운영 미반영** | DONE (후보 코드) |
| 3 | R10 담당: 현재 PC source 원본 확인·승인된 Writer 설치 | PC 현재 HEAD=config.source·2파일 before/after SHA·의존 파일·원본 보호·lease/CAS를 확인하고, 필요한 경우 공통 Writer B 1회 설치 및 실제 SHA·백업·JSON/TXT 재조회. 이미 목표 파일이면 설치 생략 | NOT_DONE |
| 4 | R10 담당: 새로운 6개 개별 관측치 생성·로컬 저장 | 신규 체크포인트와 로컬 결과·원장에 검증된 최신 관측치 6/6개 존재, 실제 관측일과 원본 일치 | NOT_DONE |
| 5 | R10 담당: 기존 게시기 → D1/API | 승인된 신규 source checkpoint 게시, D1 readback·`/api/asset-bubble-raw`·`/api/asset-bubble-history` 값/버전/시각 대조, 최신 6/6개 공개 | NOT_DONE |
| 6 | R10 담당: 사이트 PR 및 PC/모바일 | 사용자 승인 범위에서 PR #961을 최신 main과 검증·정규 Git Integration 배포, 화면 현재/이전/관측일/마지막 점 6개 일치, 종합점수 22.6 유지 | NOT_DONE |

**시작 전체 공정률 = DONE 2 / 6 = 33.3%.** 각 단계는 최종 통과 증거가 있어야 100%로 계산한다. 진행 중·일부 통과는 DONE으로 세지 않으며, 세부 진행은 별도 숫자로 보고한다. **목표 기능의 실제 최신 6개 공개율 = 0 / 6 = 0%** (2026-11-09 브라우저 관측). 운영 원자료가 11월 8일 갱신됐다는 사실만으로 `latestObservation` 게시 성공으로 보지 않는다.

## 3. 현재 필수 실행 하나와 최소 순서

**다음 실행 = 3단계의 범위형 PC 원본 확인.**

- 입력: R10 후보 `lib/diagnostic-layer/asset-bubble-r10-raw-evidence-r1.mjs`, `worker/asset-bubble-r10-raw-r1.mjs`, 현 PC 소스 HEAD/config.source 및 공통 Writer lease 상태.
- 기존 승인 경로: `writer-install-preimage-readonly`로 필요 파일만 조회. 기존 성공 #882를 재사용하고, 오래된 `a23c12cc…`를 현재 운영 HEAD로 간주하지 않는다.
- 통과 조건: 실제 경로·소스/파일 해시·dirty 여부·소비 모듈 의존성·기존 승인/백업 가능성 및 실제 공유 쓰기 충돌 범위 확정.
- 이후: 공통 `pc-writer-source-install`의 정확한 `APPROVED_B` manifest로 필요한 범위만 단회 설치 → 신규 로컬 관측치 6/6 → D1/API 게시 → PC/모바일 검증.
- 공유 Writer 25파일은 #68의 단일 담당(시장 캘린더)과 **동일 Writer HEAD/config.source 및 실제 lease만** 순서 조정한다. 독립 코드/조회는 병렬 계속. 전용 R10 B receiver 신규 개발, Controller 전체 재설치·전체 PID 추적을 자동 선행 조건으로 만들지 않는다.
- 게시 전에 PR #961이 Draft/미병합인지, 최신 main 대비 변경 파일, 관련 테스트, 배포 승인을 재확인한다. PR 병합·CI는 PC 설치나 Production 게시 증거가 아니다.

## 4. 모든 R10 작업 보고의 필수 형식

작업 시작과 종료마다 다음 5줄을 **실제 증거 기준으로** 남긴다.

1. **전체 진행률:** 시작 `X/6 = Y%` → 종료 `X/6 = Y%` (변동 0이면 0으로 명시).
2. **현재 단계:** 단계 번호·상태 `DONE/RUNNING/STATE_UNKNOWN/BLOCKED/DEFERRED`; 세부 진행은 별도로 보고.
3. **이번 수행·검증:** 변경 파일, GitHub 커밋 SHA, 실제 PC requestId/실행 SHA, 로컬·D1·API/UI 증거 중 해당 범위만.
4. **실제 문제:** 필수 실행을 막을 때만 BLOCKER; 정확한 LAST PASS/FIRST FAIL/오류 코드/영향/담당/최소 복구. 무관 문제는 NON_BLOCKING.
5. **다음 필수 행동 하나:** 담당·입력·완료 조건을 지정. 기존 요청이 실행 중/불명확하면 원장을 먼저 재조회하고 재접수하지 않는다.

작업 브랜치·main·실제 PC 설치 SHA·웹 배포 SHA를 구분한다. 작업 도중 산식·스케줄·DB·DNS·Source 자동 변경 금지. 작업/프로세스 관리 문서 수정은 기능 진척도에 가산하지 않는다.

## 5. 근거

- R10 개발 Draft: https://github.com/ansqhd5774-Choi/zgmini/pull/961
- 기존 별도 R10 B 초안(공통 수신기 재사용 시 불필요): https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/238
- 공통 범위형 A 성공: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/882
- 공통 Writer B 실PC 성공: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/871
- 공유 Writer 단일 설치 조정: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68
