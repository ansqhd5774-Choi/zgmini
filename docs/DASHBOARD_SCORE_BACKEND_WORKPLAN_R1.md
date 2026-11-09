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
| 3 | 기존 source/Writer 연결을 소수 점수로 검증 | 대시보드·업종·테마 각 1개 후보의 원천 서명과 기존 운영 체크포인트 병행 추적; 기존 `sourceVersion`/`sourceStoredAt` 변경 없음; PC Runtime·운영 파일 승인 출처 먼저 확인 | D09 사전 로드 입력 대상 shadow 어댑터·12/12 시뮬레이션 PASS; 실제 PC/Writer 연결 미실행 |
| 4 | 실제 일별 사건 기록·공개 확대 | 마지막 유효 점수 보존, 신규 정정 사건 분리, 없는 과거 점수 조작 금지, 공개 D1/API/UI 동시 검증. 개별 PASS 건수로 확대 | 0/68 |

## 필수 보호·중단 조건

- 현행 `market_public_snapshots_v1.current.stored_at`은 공개 결과 저장시각일 수 있다. 신규 원관측 증거로 간주하지 않는다.
- 새 도구의 `inputSignature`는 **비공개 개발용 후보**로, 운영 sourceVersion 또는 D1 schema 교체가 아니다. 실제 사용 전 score별 원천 body digest/관측일/공식 revision/READY·TTL/실효 시간대 계약을 정한다.
- 입력 서명이 같아도 이전 게시가 검증되지 않았거나 계산/게시 실패였다면 재시도해야 한다. 기존 valid result는 실패 중 보존한다.
- 신규 필드·DB table/key·retention·cutoff·현행 sourceVersion 의미·운영 수집주기·생산 source 변경은 영향과 호환성을 명시해 **별도 승인** 전 적용하지 않는다.
- Controller #917 복구와 동일 Writer 자원은 다른 담당자 작업이다. 승인되지 않은 PC job·설치·DB write·예약 생성·Cloudflare 배포 금지. 독립 개발/읽기 검증만 수행한다.
- 기존 합격 증거 재사용. 실제 관측 사건 하나의 전 구간 chain 증명 전에는 기능 완료 또는 68개 이력 완성을 주장하지 않는다.

## 다음 단일 필수 작업

기존 PC 승인 source의 `projection-checkpoint-r52.mjs` 파일 해시/관련 런타임 정합성을 읽기 전용으로 확인한다. 이후 **D09 신용위험 1개**에 대해 설치된 기존 Reader가 제공하는 실제 저장 입력으로 shadow signature를 계산하고, 현행 checkpoint 및 저장된 공개 결과와 비교한다. 운영 변경이 요구되면 그 변경점만 승인받는다. 나머지 67개는 동일 구조를 무작정 복제하지 않고 개별 공급원/주기/실제 계산 입력을 확인한다.

## D09 신용위험 — 최초 읽기 전용 후보 연결 증거

- 실제 빌더 `worker/projection-builders/creditRisk.ts`의 계산 입력: `inputs.external.cmdiRows`의 `observationDate,hy,ig,market`, `inputs.series.DGS2/DGS5/DGS10/DGS30`의 `observationDate,value`, 저장된 `diagnostics8.creditRiskDefense`의 `status,score` 및 `credit-43` NFCI 보조 표시 필드.
- 실제 로더 `worker/projection-source-r52.mjs`는 `creditRisk`에 `macro+credit` 입력을 선택하고, `anchorToLatestBatch=true`, 해당 매크로 슬라이스/기존 full-macro fallback을 이용한다. 기존 36시간 TTL·원본 재조회 보호를 그대로 이용한다.
- 현재 공개 projection 저장 key: `market_public_snapshots_v1`의 `detail:credit-risk:v1`. 공개 본문은 이미 저장된 결과이며 새 서명을 게시하는 구조가 아니다.
- 신규 `lib/score-history/credit-risk-input-lineage-r1.mjs`는 **위 로더가 이미 반환한 값을 함수 인수로 받는 비파괴 shadow 함수**다. 새 API/수집/DB 읽기/쓰기 없음. 오직 scorer가 사용하는 값을 선택·해시하며 출력은 비복원성 SHA-256 한 개와 상태 메타데이터다.
- 단위 시뮬레이션 12/12 통과: 실제 사용 데이터 정정·신규 관측·공개 점수/보조값 변경/TTL 결측/실제 as-of 경계는 감지; 무관한 PAYEMS/레포 및 확인·저장 시각만 변경하면 서명 유지. 기존 범용 9/9 포함 **전체 21/21** 통과.
- **명확한 미증명:** PC 운영의 실제 파일 SHA, 실제 원자료 body hash/공식 revision, 실제 D09 score·checkpoint과 shadow 서명 대조, Writer 연동, D1·API·UI 게시 0건. 과거 CURRENT_VINTAGE 이력을 당시 확정 이력으로 변조하지 않는다.

## 진행률 표기

- 시작·현재 실운영 종단 검증: **0/68 (0%)**. 코드 토대의 통과율 **9/9**는 별도 지표이며 68개 공개 완료율에 더하지 않는다.
- 브랜치 코드 개발은 테스트 통과와 원격 commit/read-back으로만 완료 처리한다. 실제 PC·D1·API/UI 검증은 별도 게이트다.
