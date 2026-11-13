# ZGMINI API–사이트 연결 R1 — Production 연결 점검 인계 (2026-11-14 KST)

## 목표·기준
- 원담당 브랜치: `codex/api-site-integration-r1-20261026`; 대상 저장소: `ansqhd5774-Choi/zgmini`.
- 사용자 범위: 승인된 PC 계산 결과 → D1 → Production API → 사이트 데이터 연결. 물가 26, 시장 Treasury 365일, 테마 10, 고용 29를 각각 검증. D05는 승인 공개계약만.
- 최신 원격 `main` 관측: `643b7c7c4372ffad552443fc312c6cb1b944e2fc`. 작업 브랜치와 `main`은 diverged (ahead 267/behind 554, 해당 비교 시점). **브랜치 전체 병합 금지**, 최소 파일 PR만.
- 공통 정본: 제어 저장소 `main`의 `AGENTS.md`·`docs/GENERAL_CHAT_START.md`·`docs/PC_AUTOMATION_STANDARD.md`; 운영 PC와 격리 Runner 구분, Remote Desktop Commander 사용 금지, 읽기·개발과 운영 쓰기 분리.

## 코드 계약 읽기 — 실제 값은 아직 검증 아님
| 기능 | 공개 경로 | D1 읽기 계약 | 상태·시각/검증 규칙 | 2026-11-14 판정 |
|---|---|---|---|---|
| 물가 기본 19 | `/api/inflation-causal-inputs` | `market_public_snapshots_v1`, `detail:inflation-causal-public-19:r1` | `sourceVersion`, `sourceStoredAt`(ms), 구성요소별 관측일·저장 시각; 19행 필수. 행에 PENDING/STALE 허용. 없으면 HTTP 200 PENDING, 불량이면 503 | Worker 라우팅 확인; D1·Production 수치 미확정 |
| 물가 후보 7 | `/api/inflation-candidate-inputs` | 동일 테이블, `detail:inflation-causal-candidates-7:r1` | 7행·`READY/PARTIAL`와 개별 `READY/STALE/PENDING`; 원본 관측일과 source time 확인. 없으면 HTTP 200 PENDING | 최신 `worker/candidate-r52.ts`에서 명시 라우팅 확인. 모듈의 'not wired' 주석은 오래된 설명이며 별도 실제 API 오류 근거 아님. 실제 게시 여부 미확정 |
| Treasury 발표 일정 365일 | `/api/release-calendar` | `public_feed_snapshots_v1` `kind=output,feed_key=release-calendar,snapshot_key=current` | `sources.treasury.status/checkedAt`, `events[].date/id/source`; 공급자 Treasury XML 파서와 달력 UI는 날짜·source를 검증. 저장 부재 시 HTTP 200 PENDING 빈 배열 | 읽기 경로 확인; **365일 실제 커버리지·관측 개수** 미확정 |
| 테마 10개 | `/api/theme-fear-greed` | 기본 `market_public_snapshots_v1` `public:theme-etf-only:r1`, 승인된 별도 공개 sidecar 결합 | base 7개 점수의 252회 이력·권리 검증, 후속 테마는 독립 승인 공개 자료만 추가. `sourceVersion`, `sourceStoredAt`, `publishedAt`, `observationDate` 구분; base 부재·무효·stale은 HTTP 503 | 기본 7 + 선택 sidecar 코드 확인; 실제 10개가 모두 게시되었다는 증거 없음 |
| 고용 29개 | `/api/employment-r6/observations` | `market_public_snapshots_v1`, `detail:employment-r6:one-year:v1` | 정확히 승인된 29개 ID·`sourceStoredAt`(ms)·`asOfDate`·`retrievedAt`·`stored_at` 검증. 행별 READY/STALE/UNAVAILABLE·PARTIAL 유지, 게시 후 8일 경과 시 503 | 읽기 경로/검증 계약 확인; 실제 D1·Production 29개 수치 미확정 |

- 관련 소스: `worker/candidate-r52.ts`, `worker/inflation-causal-public-r1.mjs`, `worker/inflation-causal-candidates-public-7-r1.mjs`, `app/api/release-calendar/route.ts`, `lib/treasury-calendar.mjs`, `app/market-calendar/market-calendar-client.tsx`, `app/api/theme-fear-greed/route.ts`, `worker/theme-etf-only-public.mjs`, `app/api/employment-r6/observations/route.ts`, `worker/employment-r6-public-display.mjs`, `worker/candidate-2db-guard.mjs`.
- `candidate-2db-guard.mjs`는 `DB_CORE`를 읽기 전용 `DB` 별칭으로 노출하므로 API별 `env.DB`와 `env.DB_CORE` 차이만으로 서로 다른 D1 연결이라고 판정하지 않는다.
- D1 별도 네트워크 SELECT, 실제 `sourceVersion/sourceStoredAt/stored_at` 값, HTTP 응답 상태·본문, Production SHA 및 PC/모바일 실제 동적 렌더링은 이번 검증에서 획득되지 않았다. 공개 HTML 초기 상태의 `로딩`, `—` 또는 수동 달력 스냅샷은 JS 실행 뒤 API 결과의 증거가 아니다.
- 일반 웹 조회에서 위 JSON endpoint를 열었으나 도구가 `not accessible`을 반환했다. 이는 Production 503 또는 서비스 장애가 아닌 **조회 도구 접근 제한**이다. 연결된 Browser tab도 호스트 접근 권한 오류로 본문 조회 불가. 운영 장애로 보고하지 않는다.

## 현재 판정
- **LAST PASS**: 공통 지침·기존 브랜치 확인, 공개 라우터→D1 고정 키→Reader의 누락·지연·시각 계약 코드 대조. 확정적인 코드 라우팅 결함 **0건**.
- **FIRST UNVERIFIED**: Production JSON의 실제 값·버전·시각, D1 원격 키별 readback, 365일/10개/29개 실측 완전성. 코드 오류 `RUNTIME_FAILED` 증거 아님.
- **진행률**: 이번 검증 2/4(50%, 기준/소스 계약 완료, Production JSON·D1 동치 미완료). 과거 전체 API 통합 프로젝트 진행률은 검증된 총 단계 기준선 부재로 **미확정**; 별도 계산. 코드 변경/PR/CI/운영 배포 0건.
- **BLOCKER 범위**: 실제 Production 본문·D1 readback을 회수할 승인된 읽기 경로/도구 접근 미확보. 이력 미발표, 정상 PENDING/STALE은 독립 기능 미완료 또는 NON_BLOCKING으로 분류한다. 공통 Controller 복구는 이 읽기 전용 소스 검증의 전역 Gate가 아니다.
- **UIUX 인계**: 테마 30개 선택 UI/캘린더 수동 스냅샷 등은 API 게시 개수·API 결함의 직접 증거가 아니며 차트·레이아웃은 UIUX 담당 범위. 서버 코드 변경 없음.

## 다음 필수 실행 — R1 원담당
**승인된 읽기 전용 경로로 Production 위 5개 API의 실제 응답 `HTTP/status/count/sourceVersion/sourceStoredAt/observedAt/publishedAt` 및 동일 키 D1 `stored_at`·본문 해시를 회수**한다. 응답 200 외에 실제 유효·결측·stale을 행별 판정하고, 불일치가 *확정된 경우에만* 최소 수정→테스트→선별 PR→Cloudflare Git 자동 배포 SHA와 Production 재조회. D1 원자료 업로드·TTL·schema·Worker 직접 덮어쓰기 금지. D05는 승인 공개 스키마가 지정된 키만.

## 프로세스 총괄 전달문 (요약)
- 시작→종료: 이번 API 연결 검증 0/4→2/4(50%); 기존 전체 프로젝트 전체율 미확정.
- 소스 계약: 물가 19+7, Treasury 달력, 테마 기본 7+검증 sidecar, 고용 29 경로 확인. HTTP 상태·개별값·시간 실측은 미확정.
- LAST PASS: source reader/route/D1 고정 키 계약 확인. FIRST FAIL: 없음(Production 값 회수는 AUTOMATION_BLOCKED/증거 부족, 서비스 실패 아님).
- 수정 파일: 이 인계 문서만. API/DB/TTL/UI/배포 수정 없음; PR/CI/배포 SHA 없음.
- 다음 작업/담당: API 원담당이 Production 정확한 값·날짜·버전과 D1 독립 readback을 확보, 실제 오류 시 좁은 선별 수정. 수집·게시 자체가 없는 항목은 기능 원담당에게 선행조건으로 구분해 인계.

## 기존 Windows A급 원본 결과 재사용 — 현재 Production 동치 아님
- **물가 19:** [실제 Windows #42411937510-1-seat-1](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/42411937510-1-seat-1.json), 2026-11-07 20:37 UTC, `PASS/INFL19_RUNTIME_READONLY_EVIDENCE`. 로컬 `stagingOnly=true`, `readyCount=19`; `sourceVersion=INFL19_PRESENTATION_c77a4931df8baa7ac73c564e640f9080d0b614fb05bfd6e3891f138c8d2fcda5`, `sourceStoredAt=1794062405484` ms. 구성별 실제 관측일은 2026-07-01~2026-11-03 범위. 본 요청 `providerCalls=0,d1Writes=0`; **D1 게시/Production 최신 19개 검증이 아님**.
- **Treasury 시장 일정:** [실제 Windows #43166235600-1-seat-3](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43166235600-1-seat-3.json), 2026-11-12 06:10 UTC, `PASS/RELEASE_CALENDAR_SOURCE_INVENTORY_READONLY`. 최근 캘린더 `calendarStatus=CACHED`, 해당 주기 `providerRequests=0/sourceCount=0`, `runtimeSourceVerified=false`. 공개 feed의 Treasury 365일/개수/체크시각까지 조회한 결과 **아님**.
- **테마:** [실제 Windows #43293983366-1-seat-4](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43293983366-1-seat-4.json), 2026-11-12 19:49 UTC, `PASS/L7_RUNTIME_READONLY_INVENTORY`, `operationalReadiness=NOT_ASSERTED`. 당시 로컬 `R181_PRIMARY_LAST_RUN.status=STOP` (2026-11-12 05:00 UTC), `R179_PUBLICATION_LAST_RUN.status=PUBLIC_API_ROLLING_MISMATCH` (2026-10-30); 실제 수집·게시 원담당 후속 조사 대상이며 **`/api/theme-fear-greed` 라우트 자체 오류 증거가 아님**. 테마 10개 Production 수치와 권리 조건의 충족 미확정.
- **고용:** [실제 Windows #43174901071-1-seat-3](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43174901071-1-seat-3.json), 2026-11-12 07:24 UTC, `PASS/WRITER_APPROVED_PREIMAGE_READONLY`. R6 opt-in 설정 두 항목 `ENABLED`, 그러나 고정 checkout `sourceIdentityConsistent=false`, `runtimeSourceVerified=false`, `coreTaskSourceLinked=false`이며 관측 대상 파일 다수 `NOT_OBSERVED`. **R6 최신 PC 계산·D1 게시·29개 공개 값 검증이 아님**.
- 위 기록은 과거 실행 시각에 한정된다. 현재 Production 배포 SHA, 개별 `stored_at`, D1 body hash 및 API payload/관측일과의 동치는 직접 확보 전 `STATE_UNKNOWN`을 유지한다. 이 문서 작성 시 별도 신규 PC 요청, 원자료·D1 쓰기, Worker 직접 배포는 **0건**.
