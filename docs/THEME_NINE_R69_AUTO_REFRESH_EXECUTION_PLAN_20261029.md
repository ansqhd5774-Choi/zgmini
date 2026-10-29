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
2. 기존 작업 및 원자료에 영향 없는 **R69 읽기 전용 CMD 진단 파일**을 추가했다: `scripts/pc-writer/THEME_NINE_R69_SCHEDULE_READONLY.cmd`와 같은 폴더의 `theme-nine-r69-schedule-readonly.mjs`. `node --test tests/theme-nine-r69-schedule-readonly.test.mjs` 통과. 민감한 Windows 사용자 이름·자격 증명·Cloudflare 토큰·원시 가격 데이터를 공개 Git 로그에 올리지 않는다. **Windows 실PC 첫 실행 검증은 아직 남았다.**
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
| R69 안전 진단 CMD·로직·테스트 작성 | **브랜치 저장 PASS**; 기존 Reader/R54 테스트 포함 8개 파일 PASS. Windows 실PC 실행 전 |
| 새 날짜 D1 readback·공개 일치 | **새 수집·정렬까지 대기** |

## D. 변경 금지 계약과 참고 문서

- 현재 R32 추세 40% / SPY 상대강도 20% / 변동성 40%, AUM 다중 ETF 승인 로스터(63 고유 ETF, 64 편입), PC E: 원본, 기존 10테마 공개 이력/잠정치, D1 원래 키 및 별도 테마 운영을 보존한다.
- 외부 출처는 GetMarketHistory (raw 1h, 현재 실제 활성), MarketParquet (split-adjusted EOD, R32 미연결) 2종으로 **역할을 혼동하지 않는다**.
- 승인 없이 새 브랜치·운영 DB 변경·공개 권리 플래그 허위 확정·계정 키 추출·직접 Wrangler 배포·유료 서비스 전환 금지.
- 연결 전체 정본: [`THEME_NINE_TWO_API_AUTO_REFRESH_FULL_HANDOFF_20261029.md`](THEME_NINE_TWO_API_AUTO_REFRESH_FULL_HANDOFF_20261029.md).
- GitHub 운영본은 `main`, 작업은 `codex/theme-fear-greed-integration-20261025`; Cloudflare Git 연동 자동 빌드와 실제 운영 배포는 [Workers Builds 공식 문서](https://developers.cloudflare.com/workers/ci-cd/builds/)대로 별도 검증한다.

> **현재의 정확한 다음 행동:** 스케줄러·R47/R54 최신 로그를 안전하게 수집하고, 이미 제공 중인 27일 ETF 실자료를 기존 비공개 체인으로 검증한다. 28일은 GetMarketHistory 원천에 없는 동안 ‘미수집’으로 표시한다.

## E. R69 실PC 결과 수신 및 R70 후속 진단 — 2026-10-29 13:45 KST

사용자가 제출한 `THEME_NINE_R69_SCHEDULE_READONLY_27909_8326.txt`를 읽었다. 이 파일은 PC 예약 작업과 로그를 **읽기만** 했으며 D1/공급자/예약 작업을 변경하지 않았다.

| 구분 | R69 증거 | 판정 |
| --- | --- | --- |
| PC 시간대 | `timezoneIsKorea=true` | PASS |
| 11:30 비공개 작업 | 실행 시각 `10/29 11:44:50`, 최종 결과 `null` | 시작 기록 존재; 완료·성공 미확정 |
| 비공개 R48 최근 로그 | `10/28 17:16:15Z` = **10/29 02:16:15 KST** | 최근 실행 시각보다 **약 9시간 29분 이전**, 원인 진단 필요 |
| 13:30 공개 작업 | 실행 시각 `10/29 13:30:01`, 최종 결과 `0` | Windows 실행 정상 종료 |
| 공개 R54 최근 로그 | `10/29 04:30:19Z` = `10/29 13:30:19 KST`, `PUBLIC_API_VERIFIED` | 공개 API 검증 성공; `d1Writes=0`이므로 **새 날짜 게시 증거 아님** |
| 두 작업 설정 | 작업명/시각/기본 실행 명령 일치; `InteractiveToken`; 배터리 제한 2종 true; `StartWhenAvailable=false` | 미실행·놓친 실행을 보충하지 못할 위험. 설정 자체가 오늘 누락의 확정 원인은 아님 |

**현재 주된 미해결 문제:** `11:44` 사적 수집 작업이 실제 어느 경로에서 어떤 파일을 만들었는지, 최신 R47 데이터 기준일이 27일로 확장됐는지 확인되지 않았다. 13:30 공개 작업의 정상 종료와 `PUBLIC_API_VERIFIED`만으로 자동 데이터 갱신 성공을 선언하지 않는다.

후속 **R70 읽기 전용** 도구를 준비했다.

- `scripts/pc-writer/THEME_NINE_R70_CYCLE_CORRELATION_READONLY.cmd`
- `scripts/pc-writer/theme-nine-r70-cycle-correlation-readonly.mjs`
- 기존 R69 코드 `scripts/pc-writer/theme-nine-r69-schedule-readonly.mjs`를 같은 폴더에 둔다.
- 정확한 등록 실행 파일의 **허용된 E: 경로 일치 여부**와 R47·R48·R54 각 최근 3개 로그의 생성 시각·안전한 상태 코드·원시 개수·최근 거래일을 비교한다. 원본 가격, 토큰, 사용자 계정명, 전체 절대 경로는 보고서에 노출하지 않는다.
- 운영 작업 수정·공급자 GET·D1 읽기/쓰기를 하지 않으며 CMD 실행 로그 이름은 `THEME_NINE_R70_CYCLE_READONLY_*.txt`이다.

**이후 게이트:** R70 로그에 실행 경로·시간 일치 실패가 확인되면 정확한 대상을 백업하는 설치 개선안을 별도 검토한다. 이미 동작하는 작업을 임의로 삭제·재생성하지 않는다. 그리고 27일 원시자료는 SPY 단독이 아닌 승인 63개 ETF 전체 수집·R32 집계·R54 날짜 정렬까지 통과해야 공개 확정일 상승으로 인정한다.

## F. R70 실PC 결과와 R71 기존 비공개 수집 복구 — 2026-10-29

사용자가 제출한 `THEME_NINE_R70_CYCLE_READONLY_29391_5670.txt`는 아래 사실을 확증한다.

1. **두 예약 작업의 Windows XML에 등록된 절대 실행 경로는 정확하다.** 작업이 등록되지 않았거나 잘못된 파일을 가리키는 문제는 아니다. 그러나 파일이 현재 실제 존재하는지, 실행 도중 무엇이 반환됐는지는 R70만으로 확정 불가.
2. **R47과 R48 최근 3개의 로그 모두 10/29 02:01~02:16 KST에 종료했고 10/26이 마지막 SPY 검증일이다.** 상태 `WAIT_WINDOW_ALREADY_CHECKED`, 공급자 호출 0, R48 후보는 기존 10/26 그대로다. Windows 10/29 11:44:50 실행 기록에는 대응하는 R47/R48 로그가 없음 (`minutesLogAfterRun=-569`, `lastResult=null`).
3. **R54 10/29 13:30 공개 예약 작업은 정상 실행됐다.** `PUBLIC_API_VERIFIED`, `sourceDate=2026-10-26`, `d1Writes=0`: 공개 Reader의 기존 데이터 검증 성공이며 새 거래일 게시가 아니다. 이전 10/29 02:46 KST 실행은 `D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH`, `d1Writes=1`, 나중에 공개 반영이 이루어졌으므로 과거 장애를 현재 장애라고 단정하지 않는다.
4. `theme-nine-r47-recurring-private-refresh.mjs`의 기존 예약 로직은 **완료된 조회 날짜의 재조회 금지** (`prior.end>=cutoff` → `WAIT_WINDOW_ALREADY_CHECKED`)다. 48시간 지연 동안 값이 없어도 조회 완료가 될 수 있으므로, 이후 열린 구간이 공급자 후행 자료를 받아야 한다. 일단 원시 가격과 기존 checkpoint/manifest는 변경하거나 삭제하지 않고 기존 R47을 정확히 한 번 실행해 결과를 본다.

**R71 재실행 도구** (PC에서 명시적 `RUN` 입력 후 한 번만 실행):

- `scripts/pc-writer/THEME_NINE_R71_PRIVATE_RECOVERY_ONCE.cmd`
- `scripts/pc-writer/theme-nine-r71-private-recovery-once.mjs`
- 종속: `scripts/pc-writer/theme-nine-r70-cycle-correlation-readonly.mjs`, `scripts/pc-writer/theme-nine-r69-schedule-readonly.mjs` (총 4파일 동일 폴더).
- 먼저 승인된 E: 경로의 R48 실행 파일, R47 반복 수집 CMD, R48 stage/bridge 2개가 존재하는지 확인한다. 11:10~12:15 및 13:15~13:45 KST에는 예약 작업과 겹칠 수 있어 실행 중단한다.
- 사용자 명시적 `RUN` 후 **이미 설치된 기존** `THEME_NINE_R48_PRIVATE_CYCLE.cmd`를 한 차례 실행한다. 기존 63 ETF source collection→R25/R32→R48 *비공개 후보*만 수행한다. 원래의 R48 로그 생성 여부, 종료 코드, 원시 API 호출수, 마지막 SPY 날짜, 최근 후보 날짜를 안전하게 정리한다.
- **예정대로 공급자 GET 및 PC E: 비공개 파일이 늘어날 수 있다.** 원래 작업의 유일한 목적이고, 이 CMD는 Windows 예약 작업·기존 public D1/Cloudflare Worker·`main`·R32 산식·보유 ETF 로스터는 수정하지 않는다. 전/후 원시 결과 전체는 외부로 출력하지 않는다.
- 결과 업로드: CMD와 같은 폴더에 생성되는 `THEME_NINE_R71_PRIVATE_RECOVERY_*.txt` **하나만** 업로드. 11:30/13:30에 의해 발생하는 별도 예약 로그와 혼동 금지.

**다음 게이트:** R71이 로컬 필수 파일 누락이면 정확한 파일 재설치 절차를 수립한다. R71 실행이 10/27 원시 63 ETF 및 R32 후보를 완성하면 R54 날짜 정렬·D1 CAS·실제 API 공개까지 연결한다. R71이 여전히 `WAIT_WINDOW_ALREADY_CHECKED`이면 소스 지연과 수집 날짜 창을 구분하여 기존 코드를 국소적으로 수정하고 테스트한 후 승인된 PC bundle 경로로 배포한다. 단순히 새 점수를 강제해 확정하지 않는다.
