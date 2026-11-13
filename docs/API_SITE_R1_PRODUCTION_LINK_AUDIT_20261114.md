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


## 44차 — 실제 Production HTTP/JSON 관측 (2026-11-14 KST)

### 새 유효 증거
- 정본 `zgmini` main `643b7c7c4372ffad552443fc312c6cb1b944e2fc`; 본인 브랜치 `main` 대비 `ahead 269 / behind 554` (diverged), 전체 병합·rebase 금지.
- 5개 공개 주소 모두 기존 연결된 공개 읽기 서비스에서 **실제 URL 직접 조회**, 새 캐시 사용 없는 `maxAge:0` 요청의 응답 메타데이터 HTTP 코드와 JSON 본문 확인. 일반 검색 브라우저 `not accessible`은 실제 API 오류가 아니며 아래 조회가 이를 대체했다.
- 조회는 읽기 전용. PC/Provider/D1/Worker 쓰기 0, 유료 서비스 가입·자동 충전·직접 배포 없음.
- 아래 `VERIFIED`는 **공개 HTTP+JSON 관측에 한정**된다. 별도 D1 body hash/readback이 없는 항목은 종단 간 검증 결과 `UNVERIFIED`로 분류한다.

| Public endpoint | HTTP | 실제 공개 결과·값·시각 | 공개 HTTP/JSON | 독립 D1 | 전체 동치 |
| --- | --- | --- | --- | --- | --- |
| `/api/inflation-causal-inputs` | 200 | `READY`; 19/19 READY, numeric 19/19; `sourceVersion=INFL19_PRESENTATION_c12faa065da4ee689caa696b5ddc4a0e712bee632c9543a92edfcd79956a0f9b`; `sourceStoredAt=1794528018103` (2026-11-13T00:00:18.103Z). 실제 예: ID1 102.07 USD/배럴 (2026-10-01), ID3 3 USD/MMBtu (2026-11-11), ID4 9.64 센트/kWh (2026-08). 행별 원자료 관측일은 독립 | VERIFIED | UNVERIFIED | UNVERIFIED |
| `/api/inflation-candidate-inputs` | 200 | `PARTIAL`; 7행 중 READY 4(ID 2/16/24/29), PENDING 3(ID 22/23/28), 결측은 `null`이고 임의 0 아님. `sourceVersion=INFL7_PRESENTATION_c891b9b21dc39a33c88acd08692bbdc2d9278e32881ec4759b09ec42cbd10231`; `sourceStoredAt=1794091202928` (2026-11-07T22:40:02.928Z). 예: ID2 4.153(2026-11-02), ID16 5910402249.78(2026-09-30), ID24 159.78, ID29 99.4361 | VERIFIED | UNVERIFIED | UNVERIFIED |
| `/api/release-calendar` | 200 | 피드 `PARTIAL`, 총 2,358 events. Treasury `READY`, 전기간 이벤트 894건; 2025-11-14~2026-11-14 범위 872건, 199개 이벤트 날짜, 중복 ID+date 0건. `sources.treasury.checkedAt=2026-11-13T15:22:25.384Z`, 피드 `updatedAt` 동일. 피드 전체 `PARTIAL`은 `sources.fed_fomc=SOURCE_FAILED` 등 다른 공급원 상태와 구분. 이 API는 `sourceVersion/sourceStoredAt` 대신 `updatedAt/sources.*.checkedAt` 계약 | VERIFIED | UNVERIFIED | UNVERIFIED |
| `/api/theme-fear-greed` | 503 | `UNAVAILABLE / STORED_DATA_STALE`, `themes:[]`. 실제 게시본 freshness gate 불합격. 이 오류를 라우트 누락·D1 원자료 상실로 단정할 수 없음. 현 응답은 sourceVersion·sourceStoredAt·게시일 미제공; 마지막 유효 결과 보존은 D1 별도 검증 필요 | VERIFIED(503 상태) | UNVERIFIED | UNVERIFIED |
| `/api/employment-r6/observations` | 200 | 전체 `PARTIAL`, 지표 **29/29 제공**. raw READY 22/STALE 7, score READY 28/PARTIAL_HISTORY 1, chart READY 22/PARTIAL 5/UNAVAILABLE 2. `sourceStoredAt=1794491411289` (2026-11-12T13:50:11.289Z), `asOfDate=2026-11-13`, `methodologyVersion=EMP-R6-FORMULA-R2-CPS-2025-10`, `formulaHash=sha256:04486846cd6063452d1c764116d3a31209f074d23a8764bf5b6ec8467095210e`. `STATE_CLAIMS_BREADTH`: `STALE/PARTIAL_HISTORY`, 관측 2025-07-19. raw STALE 나머지는 BED 6개 | VERIFIED | UNVERIFIED | UNVERIFIED |

### D1 독립 readback 및 Production 배포 증거
- 5개 Public GET는 소스상 D1 저장 결과를 읽는 동작이나 **Public GET 성공만으로 별도 D1 원격 조회의 `stored_at`/본문 SHA-256 확인을 대신하지 않는다.**
- 현재 연결된 도구에는 위 5개 exact D1 key를 개별 readback하는 승인된 D1 연결이 없었음. 기존 PC A급 allowlist에는 특정 기능의 로컬 상태·원장 검사는 있으나 이 5개 D1 키의 공용 원격 독립 SELECT 명령은 확인되지 않음. 사용자 지침에 따라 임의 SQL/Controller operation/원격 shell을 생성하지 않음.
- 따라서 5개 D1 `stored_at`, D1 body hash, 5개 API 출력과 D1 payload의 1:1 동치: **UNVERIFIED**. 기존 과거 Windows 결과는 당시 로컬/게시 증거일 뿐 현재 live D1 readback 대체 불가.
- `main`에 대한 GitHub combined commit status는 `statuses:[]`; Cloudflare의 정확한 Production Deployment ID/SHA를 제시하는 증거가 아님. **Production 배포 SHA/Build/Version ID = 미확인**.
- API 코드를 변경할 확정된 `MISMATCH` 증거는 **0건**; 실제 Theme `STORED_DATA_STALE`는 데이터 공급/게시·freshness 단계의 FIRST FAIL (API 경로 자체 실패로 확정하지 않음). 위 달력 `fed_fomc SOURCE_FAILED`는 Treasury API 결함으로 오분류 금지.

### 실행 단계·전담 인계
- 이번 API 검증 **2/4(50%) → 3/4(75%)**: 최신 브랜치/기존 계약 2단계 재사용, 실제 Production 5개 HTTP/JSON 실측 단계 신규 완료. D1 독립 재조회/배포 SHA 동치 단계 미완료.
- LAST PASS: 공개 API 5개 응답 상태·JSON 데이터 개수/결측/버전/시각 실측. FIRST FAIL: Theme `503 STORED_DATA_STALE`, 별도 `fed_fomc SOURCE_FAILED`. FIRST UNVERIFIED: 독립 D1 body hash/stored_at 및 exact Production deploy SHA.
- 실제 수정: 이 검증 문서 **1개**. 서버/API/산식/TTL/schema/DB/UI 수정 0, 새 PR/CI/배포 없음.
- **API 담당 다음 필수 실행**: 기존 승인된 독립 D1 최소 읽기 근거가 제공되면 5개 공개 키의 `stored_at`·본문 해시·버전을 API payload와 대조. 현재 허용된 경로가 없다면 권한 문제를 `AUTOMATION_BLOCKED`로 유지하고 새로운 임의 D1 명령을 만들지 않는다.
- **테마 원담당 인계**: 2026-11-14 공개 `/api/theme-fear-greed` HTTP 503 `STORED_DATA_STALE`; 과거 R181 STOP/R179 `PUBLIC_API_ROLLING_MISMATCH`는 참고 시점 분리. 새 provider 재호출·임의 덮어쓰기 없이 기존 PC 게시/rolling 원장→sourceStoredAt→D1 readback 순서로 실제 stale 원인 확인.
- **시장 캘린더 원담당 인계**: Treasury는 READY, 365일 창 872행; 별도 `fed_fomc SOURCE_FAILED`로 피드 PARTIAL. source별 실패 복구는 기능 원담당. Treasury 담당의 365일 365개 **날짜별 점**이라는 의미로 수치 변환하지 않는다.
- **물가 원담당 인계**: 후보 7개 중 3 PENDING (22/23/28)는 생산·게시 완료 여부 재확인. 200/PARTIAL은 자동으로 API 결함 아님.
- **고용 원담당 인계**: `STATE_CLAIMS_BREADTH` 하나가 `STALE/PARTIAL_HISTORY`; 새 raw 관측 확보 및 승인된 정상 게시 필요 여부 확인. 29개 행 제공과 29개 점수 완비는 다르다.
- UIUX 담당: 이번 서버 실측에서 별도의 화면 렌더링 불일치는 확정하지 못함. UI 수정·같은 파일 동시 수정 없음. 별도 확인 시 위 endpoint·값·관측일을 표기하는 방식만 범위 내 전달.
- **총괄 복귀 보고**: Production API 5개는 실제 관측(200/200/200/503/200)했고 저장형 상태/결측을 분리. 전부 D1 동치 UNVERIFIED, API MISMATCH 확정 0, Production deploy SHA 불명. 근거 없는 코드 수정/배포 하지 않았으며 다음은 승인된 D1 exact-key readback과 테마 stale 데이터 게시 원인 독립 처리.


## 48차 API 원담당 — 승인된 독립 D1 경로 실행 가능성 판정 (2026-11-14 KST)

**원장 원문:** [48차 총괄 #68 / comment 6863150401](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863150401). 본인 담당 항목 1번만 수행한다. 44차의 Production 5개 HTTP/JSON 원본 실측과 3/4(75%) 완료점 재사용.

### 실제 수행·검증
1. 현행 소스 기준: 기능 `main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`, 제어 `main=69e25a08a903dc8e52ef1093ec15837de4c20858`. 본 브랜치 `main` 대비 `ahead 270 / behind 554`, diverged. 전체 merge/rebase 없이 보존.
2. 제어 저장소 `config/operations.json` A급 등록 37개를 직접 읽고 `controller/writer-publication-evidence-readonly.mjs`의 정확한 SQL 조회 대상/결과 원장을 대조했다. 이 Reader는 **로컬 SQLite의 `market-calendar:earnings-er1-score-YYYY-MM-public` 및 기존 Writer의 ER1 D1 publication ledger**만 읽는다. 48차가 요구한 물가19/후보7/고용29/테마 primary/달력 release-calendar 5개 exact remote D1 key를 읽지 않는다.
3. 제어 저장소에서 `market_public_snapshots_v1`, `public_feed_snapshots_v1`, `D1_READBACK`, `perKeyReadback` 관련 기존 모듈을 탐색했다. 공개 프로그램 소스에는 관련 키를 소비하는 Reader/Publisher가 있지만, 현행 이 대화에서 승인된 **5개 exact-key 원격 D1 최소 SELECT/readback 인터페이스는 발견되지 않았다.** `source-inventory-runtime-readonly` 등은 정적/로컬 소스·원장 점검이어서 원격 D1 행 증거로 승격 불가.
4. 연결 플러그인/연결된 기능에서 Cloudflare D1 직접 조회 도구도 확인되지 않음(Cloudflare 자격증명·계정/DB ID 없음). 인접 DB(Postgres 등) 플러그인을 Cloudflare D1이라고 간주하거나 임의 SQL/new Controller operation/remote shell을 발급하지 않았다. **이는 HTTP/PC 실행에서 403 오류를 받았다는 뜻이 아니라, 승인된 정확한 readback action이 현재 등록되어 있지 않다는 뜻이다.**
5. Cloudflare exact Deployment ID/SHA를 주는 연결 도구/승인 증거도 발견되지 않았다. GitHub `main` SHA는 소스 기준이며 Cloudflare Production 배포 SHA로 승격하지 않는다.
6. 이전 Production 5개 실측(200/200/200/503/200)은 재사용한다. Theme `503/STORED_DATA_STALE`은 데이터 신선도 실패로 **CONFIRMED DATA UNAVAILABLE**, API Reader 바이트 불일치로는 미확정. Treasury `READY`이면서 전체 `PARTIAL`의 별도 `fed_fomc SOURCE_FAILED`, 고용 `STATE_CLAIMS_BREADTH STALE/PARTIAL_HISTORY`, 물가 후보 PENDING 22/23/28 역시 서비스 연결 버그로 승격하지 않는다.

### 5개 독립 D1 확인 대상/결과
| 공개 API | D1 table | key / filter | API HTTP+JSON | 독립 D1 `exists/stored_at/bodySha256/sourceVersion` | API↔D1 판정 |
|---|---|---|---|---|---|
| `/api/inflation-causal-inputs` | `market_public_snapshots_v1` | `snapshot_key=detail:inflation-causal-public-19:r1` | VERIFIED 200/READY19 | UNVERIFIED | UNVERIFIED |
| `/api/inflation-candidate-inputs` | `market_public_snapshots_v1` | `snapshot_key=detail:inflation-causal-candidates-7:r1` | VERIFIED 200/PARTIAL4+3 | UNVERIFIED | UNVERIFIED |
| `/api/release-calendar` | `public_feed_snapshots_v1` | `kind=output,feed_key=release-calendar,snapshot_key=current` | VERIFIED 200/PARTIAL, Treasury READY894 | UNVERIFIED | UNVERIFIED |
| `/api/theme-fear-greed` | `market_public_snapshots_v1` | `snapshot_key=public:theme-etf-only:r1` (승인된 sidecar 키는 별도 소유) | VERIFIED 503/STORED_DATA_STALE | UNVERIFIED | UNVERIFIED |
| `/api/employment-r6/observations` | `market_public_snapshots_v1` | `snapshot_key=detail:employment-r6:one-year:v1` | VERIFIED 200/PARTIAL, indicators29 | UNVERIFIED | UNVERIFIED |

**LAST PASS:** 48차 원장 정확 지시 확인 + 현재 allowlist/ER1 전용 A Reader 제한을 소스 내용으로 검증.  
**FIRST UNVERIFIED:** 5개 exact-key D1 `exists/stored_at/bodySha256/sourceVersion`; Cloudflare Production Deployment SHA.  
**FIRST FAIL (실제 공개 상태):** Theme `STORED_DATA_STALE` (API↔D1 원문 불일치 증거 아님).  
**상태:** `AUTOMATION_BLOCKED(NO_APPROVED_EXACT_KEY_D1_READBACK_ACCESS)` — **읽기 경로만**. API 코드 MISMATCH 0 확정; RUNTIME_FAILED/전체 기능 BLOCKED로 확대 금지.  
**이번 변경:** 이 증거 문서 1개만; 테스트·CI/새 PR/PC/D1/Worker/운영 쓰기 0. 전체 진행률 **75%→75%(3/4)**.

**다음 필수 행동 하나:** Cloudflare/D1 승인 소유자가 **기존 권한을 이용하는 정확히 해당 5개 키의 읽기 전용 응답 수단/결과**(존재·저장 시각·본문 SHA256·버전 및 Cloudflare Production exact deployment ID/SHA)만 확보해 원담당에게 반환한다. 사용자의 임의 SQL 실행이나 새로운 Controller op 도입이 아니라, 기존 정규 승인 읽기 경로의 확인/인계다. 확보하면 이 대화가 재개되어 API 실측 payload와 각 row를 정밀 비교하고, 확정 MISMATCH일 때만 최소 수정·테스트·선별 PR 진행.


## 51차 API–사이트 연결 — 원본 D1 증거 재사용/현재 데이터 동치 판정 (2026-11-14 KST)

**51차 지시**: [총괄 #68 댓글 6863655392](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863655392), API 담당 항목 6. 현행 기능 `main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`·제어 `main=69e25a08a903dc8e52ef1093ec15837de4c20858`, 브랜치 divergence 271 ahead/554 behind(51차 조사 시작 시점). 기존 완료점 75%=3/4 유지, 전체 merge/rebase·운영 변경 금지.

### 이번에 신규 확인한 **기존 승인 실행의 실제** 증거
- [D1 게시 #296 결과](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/296#issuecomment-6629178833): **그 시각** 정확한 D1 키 `detail:inflation-causal-public-19:r1`, `D1_READBACK_VERIFIED` / `INFL19_PUBLIC_PUBLISHED_READBACK`, 19개 READY, `sourceVersion=INFL19_PRESENTATION_3a974384f3772b194849f6632c04b01ef5c1086702a0ed610b552d02cb213cf9`, `sourceStoredAt=1793787605696` (원본 요청은 쓰기 1회였으나 **이번 요청에서 재실행하지 않음**).
- [PC↔Public diff #757 결과](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/757#issuecomment-6712341556): `PASS/INFLDIFF_CHANGED`, `METADATA_ONLY`; PC version `INFL19_PRESENTATION_9c416a72dfcf4594b32df3775d5168734ed9cf8dd5cffda14259c44c8fb7a61a`, API version `INFL19_PRESENTATION_c77a4931df8baa7ac73c564e640f9080d0b614fb05bfd6e3891f138c8d2fcda5`, changed ID `18`의 `sourceStoredAt`만 변경. **해당 PC/공개 버전의 데이터·시각 차이에 대한 비교**이지 현재 D1 값/Production 배포 검증 아님.
- [#736](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/736#issuecomment-6711645301), [#378](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/378#issuecomment-6642650288), [#314](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/314#issuecomment-6632193361)도 동일 one-shot 비교 이력. 결과는 `INFLDIFF_CHANGED`, **원본 완료/요청ID를 재사용·중복 실행하지 않음**.
- **이번 대상 최신 공개 19**는 앞선 44차에서 `sourceVersion=INFL19_PRESENTATION_c12faa065da4ee689caa696b5ddc4a0e712bee632c9543a92edfcd79956a0f9b`, `sourceStoredAt=1794528018103`. #296/#757과 버전이 모두 다름. 따라서 과거 PASS를 현행 D1 `stored_at/bodySha256`의 합격으로 승격할 수 없음.
- 기타 4개 공개 endpoint에 대해서도 **현행 버전이 일치하는 기존 승인 D1 readback 영수증**을 확인하지 못했다. 제어 A `writer-publication-evidence-readonly`는 ER1 로컬/게시 영수증 전용. 48차 allowlist/도구 계약은 재사용하고 중복 조사·요청 없음.

### 51차 현재 판정
| 정확한 공개 저장 키 | 기존 직접 D1 영수증 | 지금 API와 동일 버전/본문 | 상태 |
|---|---|---|---|
| `market_public_snapshots_v1 / detail:inflation-causal-public-19:r1` | **과거 #296 PASS** (오래된 sourceVersion) | **불일치하는 버전이라 현재 동치 인증 불가** | **UNVERIFIED** |
| `market_public_snapshots_v1 / detail:inflation-causal-candidates-7:r1` | 미확보 | 미검증 | **UNVERIFIED** |
| `public_feed_snapshots_v1 / output/release-calendar/current` | 미확보 | 미검증 | **UNVERIFIED** |
| `market_public_snapshots_v1 / public:theme-etf-only:r1` | 미확보 | HTTP 503 `STORED_DATA_STALE`·독립 row 미검증 | **UNVERIFIED** |
| `market_public_snapshots_v1 / detail:employment-r6:one-year:v1` | 미확보 | 미검증 | **UNVERIFIED** |

- **LAST PASS**: 원본 #296의 당시 exact-key D1 게시+readback, #757 등 시차별 PC↔공개 API 비교 결과를 정확한 원본 Issue에서 확인. 5개 Production HTTP/JSON 상태(44차)는 기존 검증 완료점 재사용. 구 버전과 44차 공개 버전의 불일치를 식별, 구 영수증의 잘못된 재사용 차단.
- **FIRST FAIL**: 현행 테마 API `503/STORED_DATA_STALE` (공개 데이터 freshness 실패, API Reader 원문 MISMATCH 확정 아님). `#757 INFLDIFF_CHANGED`는 과거 PC↔Public의 자연 시차이며 현행 API↔D1 실패로 오분류 금지.
- **FIRST UNVERIFIED**: 현행 5개 D1 row의 `exists/stored_at/bodySha256/sourceVersion`, 필드별 관측일·게시일의 API 1:1 동치, Cloudflare Production exact Deployment ID/SHA.
- **범위 한정 차단**: `AUTOMATION_BLOCKED(NO_APPROVED_EXACT_KEY_D1_READBACK_ACCESS)`. 기존 본 대화 연결과 Controller 작업으로 현행 5키의 *인증된 원격* D1 SELECT를 실행할 수 없음. 이는 임의 read SQL/op를 만들거나 원래 #296 쓰기 요청을 재실행하라는 허가가 아님.
- **진행률**: **75%→75%(3/4)**. API Reader MISMATCH 0건 확정; 소스/테스트/API·D1·Cloudflare 운영 쓰기 및 신규 Runner 요청 0. 기존 읽기 실행의 원본 증거 확보와 검증 판정만 새로 완료.
- **다음 필수 실행 하나(Cloudflare/D1 승인 소유자)**: **현재 시각의 기존 승인 exact-key 읽기 결과 5개**를 `key, exists, stored_at(ms), bodySha256, sourceVersion, observationDate, publishedAt`로 확보하고 정확한 Production Deployment ID/commit SHA를 **기존 정규 검증 결과 경로**로 인계. API 원담당은 각 receipt의 source/시간과 공개 5개 JSON을 비교한 뒤에만 `VERIFIED/MISMATCH`로 판정. source/DB/TTL/Worker 변경 금지.

## 53차 — 정확키 D1 저장 본문과 API 응답 변환의 실제 소스 대조 (2026-11-14 KST)

**53차 원본:** [#68 6863923778](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863923778). 51차 완료점 75%(3/4) 보존. 44차 API 실측·51차 #296/#757 원장은 재사용하며 재실행하지 않음. 대상 main: `643b7c7c4372ffad552443fc312c6cb1b944e2fc`, 제어 main: `69e25a08a903dc8e52ef1093ec15837de4c20858`.

### 새 검증 결과 — 공개 데이터 동치 판정의 안전한 비교 단위

| D1 정확키 / 테이블 | 현재 main Reader 동작 | 승인된 읽기 결과와 비교할 정확한 단위 |
| --- | --- | --- |
| `market_public_snapshots_v1/detail:inflation-causal-public-19:r1` | `worker/inflation-causal-public-r1.mjs`가 D1의 `{payload,projection}` 중 검증된 `payload`만 JSON으로 응답 | `bodySha256`은 **원본 D1 body 문자열**로 계산. `API JSON`은 `saved.payload`와 내용·버전·관측일 대조. `projection.builtAt===D1.stored_at`, projection의 `sourceVersion/sourceStoredAt===payload` 확인 |
| `market_public_snapshots_v1/detail:inflation-causal-candidates-7:r1` | `worker/inflation-causal-candidates-public-7-r1.mjs` 역시 `{payload,projection}` 저장, 검증 후 payload만 응답 | 상동. HTTP JSON 전체 SHA와 D1 body SHA가 **같아야 한다는 주장은 잘못** |
| `public_feed_snapshots_v1/output/release-calendar/current` | `app/api/release-calendar/route.ts`가 `publicFeedStore.readOutput('release-calendar')`의 `row.body`를 응답 | 정확히 `kind=output,feed_key=release-calendar,snapshot_key=current` 조회. 저장 본문과 JSON 내용 대조, 개별 `sources.*.checkedAt`·`updatedAt` 검증. 계약상 모든 피드에 `sourceVersion`이 필수는 아님 |
| `market_public_snapshots_v1/public:theme-etf-only:r1` | `worker/theme-etf-only-public.mjs`의 base seed는 그대로 반환되지 않을 수 있음. `readRollingPublic`은 별도 `public_feed_snapshots_v1/output/theme-etf-only-rolling/current`을 읽고 검증된 선택적 sidecar를 추가 가능 | 5개 키 중 base seed의 `exists/stored_at/bodySha256` 확인은 필요하지만 **그것 하나만으로 최종 7~10개 공개 응답 본문 동치 인증 불가**. base 및 실제 적용된 rolling/sidecar provenance를 구분. 503 `STORED_DATA_STALE`을 base 키 부재나 API 버그로 단정 금지 |
| `market_public_snapshots_v1/detail:employment-r6:one-year:v1` | `worker/employment-r6-public-display.mjs`는 저장 `body`를 검증 후 직접 응답하고 `x-data-snapshot-at`을 D1 `stored_at`으로 생성 | 저장 body와 API JSON 내용, `sourceStoredAt`·`asOfDate`·29행·`formulaHash/methodologyVersion`·8일 freshness 확인. **이 계약은 `sourceVersion` 필수 검증을 선언하지 않음** |

### 실제 저장·응답 측정과 분리할 증거

- 위 판정은 **GitHub main source 정적 검증**이다. 현재 인증된 D1 SELECT 결과, 5개 현재 `stored_at/bodySha256`, 생산 시점 API JSON과 정확한 Cloudflare Production Deployment ID/SHA는 **아직 회수되지 않음**. D1 동치 **0/5**, 확정 API Reader mismatch 0.
- 44차 공개 API 응답과 새로운 시각의 D1 row가 서로 다른 source/version이면 즉시 버그로 판정하지 않고 **관측 시각 및 정확한 게시 버전**부터 맞춘다. 원본 D1 body 자체·키·인증 토큰·원자료를 GitHub에 올리지 않음.
- 기존 `scripts/pc-writer/independent-publication.mjs`의 `er1MonthlyD1Readback`은 **ER1 월간 피드 한정**(`isER1MonthlyFeedKey` 필터)이므로 5개 대상에 대한 현행 승인 Reader로 재목적 사용 불가.
- 새 Cloudflare 접근권한/SQL/Controller operation/Runner 요청/one-shot Writer 재실행 없음. 코드·산식·D1·TTL·UI·배포 변경 없음. 이 문서만 기록.

**LAST PASS:** 5개 저장 경로의 실제 조회 키와 JSON 응답 변환/검증 source 대조 완료. 기존 44차 공개 실측 재사용.  
**FIRST FAIL (기존 관측):** 테마 HTTP 503/`STORED_DATA_STALE` (게시 freshness, Reader mismatch 아님).  
**FIRST UNVERIFIED:** 현재 5키 원격 D1 메타/본문 SHA·동일 시각 API payload·Cloudflare 정확한 Deployment ID/SHA.  
**상태/진행률:** `AUTOMATION_BLOCKED(NO_APPROVED_EXACT_KEY_D1_READBACK_ACCESS)` — 마지막 동치 검증 단계만; **75%→75%(3/4)**.  
**다음 필수 실행 하나 / 담당:** **이미 승인된 Cloudflare/D1 읽기 소유자**가 정확키 5개의 `key,exists,stored_at,bodySha256` 및 각 Reader 계약에 맞는 `sourceVersion` 또는 `formulaHash/methodologyVersion`, 관측/게시 시각과 Production Deployment ID/SHA를 **기존 안전한 읽기 결과 경로**로 반환. 이후 API 담당이 정상화한 구조와 공개 원문을 비교하며, theme rolling/sidecar 미검증은 별도 UNVERIFIED로 유지한다.

## 58차 — 5개 Production API 무료 공개 GET 접근 단회 실측 (2026-11-13T21:15:42.790Z)

**지시:** [제어 #68 6864999213](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6864999213) 담당 6번. 작업 전 제어 `main`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`와 기능 전용 브랜치 `ad9b6d0fac74042d67cff86ce11780e16ac1a8c3` 확인. 제어 main `69e25a08a903dc8e52ef1093ec15837de4c20858`, 기능 main `643b7c7c4372ffad552443fc312c6cb1b944e2fc`.

### 이번 실제 시도와 종료 원인

기존 무료 공개 웹 URL 읽기 도구로 아래 5개 Production GET URL을 **각 1회** 요청했다:

| 대상 | 원격 도구 결과 | 서비스 HTTP status | 현재 관측일/버전 |
| --- | --- | --- | --- |
| `https://zgmini.kr/api/inflation-causal-inputs` | `URL_NOT_ACCESSIBLE_VIA_TOOL` | NOT_OBSERVED | NOT_OBSERVED |
| `https://zgmini.kr/api/inflation-candidate-inputs` | `URL_NOT_ACCESSIBLE_VIA_TOOL` | NOT_OBSERVED | NOT_OBSERVED |
| `https://zgmini.kr/api/release-calendar` | `URL_NOT_ACCESSIBLE_VIA_TOOL` | NOT_OBSERVED | NOT_OBSERVED |
| `https://zgmini.kr/api/theme-fear-greed` | `URL_NOT_ACCESSIBLE_VIA_TOOL` | NOT_OBSERVED | NOT_OBSERVED |
| `https://zgmini.kr/api/employment-r6/observations` | `URL_NOT_ACCESSIBLE_VIA_TOOL` | NOT_OBSERVED | NOT_OBSERVED |

독립 실행 환경에서 공용 DNS의 `socket.getaddrinfo('zgmini.kr',443)`를 1회 확인했으나 `gaierror(-3): Temporary failure in name resolution`. 실제 GET 응답을 받기 전의 도구/환경 실패다. **Production의 404/503 또는 API 버그로 분류하지 않는다**. 대체 유료 Browser Use/종량제 플러그인, 권한 우회, 동일 URL 재시도 금지.

기능 main의 기존 Cloudflare 배포 정본은 `GitHub main → Cloudflare Git Integration → exact Deployment → Production`. 공개 소스 검색에서 **현재의 exact Deployment ID/실제 source SHA를 반환하는 검증 가능한 공개 경로를 확보하지 못함**. GitHub main SHA는 **배포 SHA의 대용이 아니다**. 정적 소스·과거 44차 실측을 현행 Runtime 데이터로 승격하지 않는다.

### 종료 판정

- **LAST PASS:** 지시/승인/전용 브랜치 확인과 5개 공개 URL 단회 시도 결과 기록, 과거 완료 53차 Reader 변환 계약 재사용.
- **FIRST FAIL (이번 실제 단계):** 공개 5 GET의 `URL_NOT_ACCESSIBLE_VIA_TOOL`, 독립 환경 DNS `EAI_AGAIN` / `gaierror -3`, **서비스 HTTP status 미수집**. 기존 Theme 503은 과거 실측에만 유효.
- **FIRST UNVERIFIED:** 현재 API 5응답/관측일/version, Production exact Deployment ID/SHA, 현재 D1 exact-key 5 `exists/stored_at/bodySha256`.
- **범위 제한 차단:** `AUTOMATION_BLOCKED(PUBLIC_API_READ_ACCESS)` 및 기존 `AUTOMATION_BLOCKED(NO_APPROVED_EXACT_KEY_D1_READBACK_ACCESS)`는 각각 독립이다. Production/API 장애 판정 아님. D1 0/5/UNVERIFIED.
- **변경:** 본 원장 1파일 이외 변경 없음. 신규 PC/Runner/SQL/D1/Writer/Cloudflare/배포/소스/회귀 재실행 0. **진행률 75%→75%(3/4)**.
- **다음 필수 행동 하나:** 기존 승인된 Cloudflare/Production **무료 읽기 권한 소유자**가 현 시각 API 5건의 HTTP/JSON 비민감 metadata와 정확한 Deployment ID/source SHA, 별도 정규 D1 5키 읽기 영수증을 기존 결과 경로로 반환하면 API 원담당이 53차 `{payload,projection}`·direct-body·seed/rolling 계약에 따라 직접 대조한다. 승인 경로 없이 새로운 임의 SQL/배포/read operation을 만들지 않는다.
