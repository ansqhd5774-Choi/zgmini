# R69 — 기존 9개 테마 R32 자동 갱신 복구·검증 실행 계획

- 날짜: 2026-10-29 KST. 진행 브랜치: `codex/theme-fear-greed-integration-20261025` **고정**.
- 근거: 운영 공개 API 재조회, GetMarketHistory 27·28일 SPY 원시 1h 직접 GET, 사용자 PC R61/R62 및 R50/R54 예약 작업 설정, GitHub `main`과 전용 브랜치 Reader 코드 대조.
- 목표: 우주·위성에서 확정한 **동일 R25/R32 산식**으로 기존 9개 테마를 자동 갱신하고, 공개 대상 8개의 안전한 게시와 기존 10개 이력을 유지한다. 163개 테마 전체 선정이나 산식 재설계는 이번 단계 아님.
- 최우선 원칙: **이미 정상인 공개 Reader를 불필요하게 재수정·재배포하지 않고**, 실제 새 거래일 공급 여부 및 PC 정규 자동 갱신 연결을 검증한다.

## A. 현재 증거 및 단계 변경 사유

| 날짜/근거 | 결과 | 운영 판정 |
| --- | --- | --- |
| 과거 R62 (10/29 02:54 KST) | D1 `theme-legacy-nine-r37` 레코드 존재, `eligibleInSameReader=true`이나 공개 `modelRevision=null` | 과거 공개 Reader 미반영 |
| **현재 운영 공개 API** (10/29 재조회) | `modelRevision=THEME_LEGACY_NINE_R37_PUBLIC_V1`; 공개 **10테마 모두 252개 이력**, 8개 R32 교체, 확정 기준일 **10/26**, 잠정 **10/26·10/27** | **R37 공개 반영 확인**, 과거 R62 장애를 현재 장애로 재사용 금지 |
| GetMarketHistory SPY 1h `start=2026-10-27&end=2026-10-28` (10/29 04:36 UTC) | HTTP 200, `x-row-count=16`, `x-data-through=2026-10-27T23:59:00Z` | **10/27 SPY 봉 도착**. 63개 ETF 전체 재검증 필요 |
| GetMarketHistory SPY 1h `start=2026-10-28&end=2026-10-29` (같은 시각) | HTTP 200, `x-row-count=0`; 최종 제공 시각 10/27 UTC | **10/28 SPY 봉 아직 없음**. 주된 원인은 공급자 최소 48시간 지연과 일치 |
| Windows 작업 R50/R54 설치 XML (사용자 제공 결과) | 11:30/13:30 InteractiveToken, `StartWhenAvailable` 없음, 배터리 시작/유지 차단 true | **자동 실행 신뢰성 위험**. 실제 29일 스케줄러 최근 성공/실패 결과는 아직 확보되지 않음 |
| Reader 소스·테스트 | `main`과 기존 dev의 `route.ts`, `theme-etf-only-public.mjs`, `theme-nine-r37-public.mjs` 일치; Reader/R54/R62 관련 7개 테스트 PASS | Reader 코드 변경 보류. Cloudflare 배포 ID 독립 확인은 별도 |

GetMarketHistory 공식 Coverage는 미국 주식·ETF 데이터가 **최소 48시간 지난 거래 세션**에 제공된다고 안내한다. 예시 시각 계산만으로 공급을 보장하지 말고 실제 `x-row-count`·원본 데이터 날짜를 확인한다. [공식 Coverage](https://getmarkethistory.com/docs/coverage).

## B. 5단계 실행 계획과 검증 기준

### 1단계 — 현재 공개 경로 재검증 (완료)

1. `https://zgmini.kr/api/theme-fear-greed/`를 캐시 우회 조회하고 `status`, `modelRevision`, `methodologyVersion`, `confirmedObservationDate`, `provisional.points[].date`를 기록했다.
2. **10개 테마의 역사 252개씩**·원래 공개 순서·데이터센터/우주 이력·AI 비공개 상태를 확인했다.
3. 기존 R37 공개 Reader가 이미 운영 중이므로 **긴급 Reader 수정·main 재배포는 하지 않는다**.

### 2단계 — Windows 예약 작업 실운영 증거 확보 (진행)

1. PC 11:30 개인 수집 작업 `ZGMINI-PC-Theme-Nine-R47-Private`, 13:30 게시 작업 `ZGMINI-PC-Theme-Nine-R54-Public` 각각 `schtasks /Query /V /FO LIST`, `/XML`로 **실제 Last Run Time, Last Result, Next Run Time, 실행 계정, Action 경로, StartWhenAvailable, Battery 옵션**을 확인한다.
2. 기존 작업 및 원자료에 영향 없는 **R69 읽기 전용 CMD 진단 파일**을 추가한다. 민감한 Windows 사용자 이름·자격 증명·Cloudflare 토큰·원시 가격 데이터를 공개 Git 로그에 올리지 않는다.
3. `THEME_NINE_R47_RECURRING_PRIVATE_UPDATE_*.txt`, `THEME_NINE_R48_PRIVATE_CYCLE_*.txt`, `THEME_NINE_R54_CYCLE_*.txt`의 최신 실제 실행 경과를 대조한다. **예약 존재만으로 실행 성공을 인정하지 않는다.**
4. 배터리 옵션과 `StartWhenAvailable` 부재는 자동 갱신 누락 가능성을 키우지만, 실제 미실행의 **확정 원인**으로 단정하기 전 2·3항의 PC 증거를 확인한다.

### 3단계 — 27일 실제 ETF 원본 수집과 비공개 후보 검증 (PC 확인 필요)

1. 27일 SPY 1h 16행은 확인됐다. 승인 63개 ETF의 실제 동일 날짜 관측, provider headers, SHA, 가격 모드, 원본 manifest를 기존 R47이 받아들일 수 있는지 확인한다.
2. PC 기존 `THEME_NINE_R48_PRIVATE_CYCLE.cmd`는 **R47 수집 → R25/R32 점수 → R48 후보 저장**만 수행한다. `WAIT_*` 상태와 `providerCalls`/`rawFilesStored`/`lastVerifiedSpyNYDay`를 정확히 읽고 원시 응답이 없는 날은 0이나 전일값으로 채우지 않는다.
3. 기존 R51 기본 `PUBLIC_LEGACY_AS_IS`: 최신 R32 확정 후보와 구버전 공개 잠정치 날짜를 분리한다. **27일 SPY 도착 = 27일 공개 확정 전환 완료**가 아니다. 원래 공개 API 확정 기준일과 R48 후보가 정렬돼야 한다.
4. R54 권리 동의·소스 재현·D1 CAS/readback·공개 API 읽기 성공이 모두 충족할 때만 새 관측일의 게시를 완료로 판단한다.

### 4단계 — 28일 데이터 지연 및 재시도 기준 (원천 데이터 대기)

1. 28일 SPY 현재 `x-row-count=0`이므로 GetMarketHistory R32 원시 입력은 **미제공**. 자동화 실패와 별개인 `SOURCE_PENDING`으로 진단한다.
2. 최소 48시간은 **자료가 반드시 도착하는 SLA가 아니다**. 공식 데이터를 실제 읽을 수 있을 때만 28일 거래일 반영을 허용한다.
3. MarketParquet `etf_daily`는 독립된 분할조정 일봉이다. 실제 28일 자료 존재 여부를 조사할 수 있지만 R32 무보정 1h 원가격에 무단 합산하거나 기존 정규 작업을 63종으로 수정하지 않는다.
4. 필요하다면 작업 스케줄의 후속 확인·재시도 시간을 **사용자에게 제안**한 뒤 기존 운영 작업의 변경 범위·중복 방지·지나간 실행 복구를 승인받아 적용한다. 현재 시간대를 임의로 교체하거나 중복 실행을 강제하지 않는다.

### 5단계 — 자동 운영 PASS·브랜치 저장·배포 판정

1. 사용자 PC의 예약 정규 실행 기록에서 R47 정상 완료와 R54 결과(실제 D1 readback·공개 검증)를 확인한다. `R48_EXIT=0`, `R54_EXIT=0`만으로 PASS 처리 금지.
2. 공개 API `modelRevision=THEME_LEGACY_NINE_R37_PUBLIC_V1`, 10개 테마, 252일, 잠정치와 데이터 날짜의 실제 일치를 재확인한다.
3. 코드 수정이 실제 필요해진 경우만 **기존 전용 브랜치** 최소 변경·테스트 → 승인된 파일 선별 `main` 반영 → Cloudflare Git 통합의 **정확한 main SHA/배포 성공** → 운영 Worker/D1/UI 확인 순서로 진행한다. 직접 Wrangler 운영 배포 금지.
4. 테스트 PASS, GitHub 저장 PASS, Cloudflare build PASS, PC 예약 실행 PASS, 실제 D1 readback PASS, 실제 공개 API PASS를 **별개 항목**으로 보고한다.

## C. 현재 작업 상태

| 작업 | 상태 |
| --- | --- |
| 원격 main·전용 브랜치 Reader 동일성 | PASS |
| 공개 10테마 R32 252일 조회 | PASS (기준일 10/26) |
| 27일 SPY 원가격 가용성 | PASS (16개 관측) |
| 27일 63 ETF 전체 수집·계산 | **PC 실제 R47 실행 확인 필요** |
| 28일 SPY 원가격 가용성 | **SOURCE_PENDING** (조회 0개) |
| 두 Windows 작업 실제 29일 정규 실행 | **PC 스케줄러 실행 결과 필요** |
| 예약 누락/배터리 옵션 운영 영향 | **진단 필요**, 미승인 예약 변경 없음 |
| 새 날짜 D1 readback·공개 일치 | **새 수집·정렬까지 대기** |

## D. 변경 금지 계약과 참고 문서

- 현재 R32 추세 40% / SPY 상대강도 20% / 변동성 40%, AUM 다중 ETF 승인 로스터(63 고유 ETF, 64 편입), PC E: 원본, 기존 10테마 공개 이력/잠정치, D1 원래 키 및 별도 테마 운영을 보존한다.
- 외부 출처는 GetMarketHistory (raw 1h, 현재 실제 활성), MarketParquet (split-adjusted EOD, R32 미연결) 2종으로 **역할을 혼동하지 않는다**.
- 승인 없이 새 브랜치·운영 DB 변경·공개 권리 플래그 허위 확정·계정 키 추출·직접 Wrangler 배포·유료 서비스 전환 금지.
- 연결 전체 정본: [`THEME_NINE_TWO_API_AUTO_REFRESH_FULL_HANDOFF_20261029.md`](THEME_NINE_TWO_API_AUTO_REFRESH_FULL_HANDOFF_20261029.md).
- GitHub 운영본은 `main`, 작업은 `codex/theme-fear-greed-integration-20261025`; Cloudflare Git 연동 자동 빌드와 실제 운영 배포는 [Workers Builds 공식 문서](https://developers.cloudflare.com/workers/ci-cd/builds/)대로 별도 검증한다.

> **현재의 정확한 다음 행동:** 스케줄러·R47/R54 최신 로그를 안전하게 수집하고, 이미 제공 중인 27일 ETF 실자료를 기존 비공개 체인으로 검증한다. 28일은 GetMarketHistory 원천에 없는 동안 ‘미수집’으로 표시한다.
