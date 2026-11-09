# ZGMINI 68개 점수 실제 일별 이력 — 백엔드 실행 계획 R1

- 기준: `ansqhd5774-Choi/zgmini` `main` `a34762f2932667bb8111477653b92d5bb4b476c4`
- 전용 개발 브랜치: `codex/dashboard-score-daily-r1` (UI 변경 금지)
- 기존 사용자 확정 기준: `codex/ui-improvements/docs/DASHBOARD_SCORE_DAILY_UPDATE_STANDARD_R1.md`, `DASHBOARD_DAILY_SCORE_EXECUTION_PLAN_R1.md`, `DASHBOARD_SCORE_INPUT_LINEAGE_DESIGN_R1.md`
- 분모: 대시보드 27 + 업종 11 + 테마 30 = **68개 논리 점수**. 집단마다 승인된 산식·입력·주기를 유지한다.
- 종료 정의: 실제 원관측 → PC 원자료 저장/재조회 → 기존 승인 산식 계산 → 로컬 점수/일별 사건 저장 → D1 단일 key 재조회 → 공개 API/UI 동일 사건 일치. 개별 검증 PASS 분모를 68로 관리한다.

## 최소 실행 순서

| 순서 | 작업 | 종료 증거 | 현재 |
|---|---|---|---|
| 1 | 입력·게시 출처 대조 | 68개 score별 실제 원천, 관측/정정, 계산 version, 저장 위치, PC 승인 SHA, 공개 경로와 마지막 유효점 매핑 | 콘텐츠 식별 68/68, 상세 인과 검증 0/68 |
| 2 | 순수 입력 변경 판별 구현 | 저장·게시시간만 바뀐 재저장은 동일; 관측, revision, 유효성, 실효 날짜 경계, 계산법 변경은 차이; 검증되지 않은 게시 실패는 재시도 허용 | `lib/score-history/input-lineage-r1.mjs`, 9/9 단위 시험 PASS |
| 3 | 기존 source/Writer 연결을 소수 점수로 검증 | 대시보드·업종·테마 각 1개 후보의 원천 서명과 기존 운영 체크포인트 병행 추적; 기존 `sourceVersion`/`sourceStoredAt` 변경 없음; PC Runtime·운영 파일 승인 출처 먼저 확인 | 미실행 |
| 4 | 실제 일별 사건 기록·공개 확대 | 마지막 유효 점수 보존, 신규 정정 사건 분리, 없는 과거 점수 조작 금지, 공개 D1/API/UI 동시 검증. 개별 PASS 건수로 확대 | 0/68 |

## 필수 보호·중단 조건

- 현행 `market_public_snapshots_v1.current.stored_at`은 공개 결과 저장시각일 수 있다. 신규 원관측 증거로 간주하지 않는다.
- 새 도구의 `inputSignature`는 **비공개 개발용 후보**로, 운영 sourceVersion 또는 D1 schema 교체가 아니다. 실제 사용 전 score별 원천 body digest/관측일/공식 revision/READY·TTL/실효 시간대 계약을 정한다.
- 입력 서명이 같아도 이전 게시가 검증되지 않았거나 계산/게시 실패였다면 재시도해야 한다. 기존 valid result는 실패 중 보존한다.
- 신규 필드·DB table/key·retention·cutoff·현행 sourceVersion 의미·운영 수집주기·생산 source 변경은 영향과 호환성을 명시해 **별도 승인** 전 적용하지 않는다.
- Controller #917 복구와 동일 Writer 자원은 다른 담당자 작업이다. 승인되지 않은 PC job·설치·DB write·예약 생성·Cloudflare 배포 금지. 독립 개발/읽기 검증만 수행한다.
- 기존 합격 증거 재사용. 실제 관측 사건 하나의 전 구간 chain 증명 전에는 기능 완료 또는 68개 이력 완성을 주장하지 않는다.

## 다음 단일 필수 작업

68개 입력 출처표 중 현재 공개된 실제 source reader에 대해 `scoreId → 원자료/최종관측/정정 → 계산 version → 공개 key`의 입증 가능한 매핑을 먼저 확정한다. 다음에는 기존 PC 승인 source의 `projection-checkpoint-r52.mjs` 파일 해시/관련 런타임 정합성을 읽기 전용으로 확인하고, **일개 점수 파일**에서 shadow signature를 계산하는 소규모 연결 시험만 진행한다. 운영 변경이 요구되면 그 변경점만 승인받는다.

## 진행률 표기

- 시작·현재 실운영 종단 검증: **0/68 (0%)**. 코드 토대의 통과율 **9/9**는 별도 지표이며 68개 공개 완료율에 더하지 않는다.
- 브랜치 코드 개발은 테스트 통과와 원격 commit/read-back으로만 완료 처리한다. 실제 PC·D1·API/UI 검증은 별도 게이트다.
