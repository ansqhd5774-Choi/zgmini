# R28 — 기업 실적 일정 공식 출처·권리 1차 조사 (2026-10-28)

## 작업 범위와 판정

- 대상: 기존 `/market-calendar/`의 기업 실적 발표 일정. 별도 실적 침체·기업 점수 산식과 구분한다.
- 현 단계: **RESEARCHING / NO_ELIGIBLE_REPUBLICATION_SOURCE / NO_COLLECTOR_CHANGE**.
- 원칙: 기업이 공식적으로 공지한 **미래 실적 발표일**과 **실적 설명회/콘퍼런스콜**을 구분한다. 주가 서비스의 알고리즘 추정 일자는 공식 확정 일정으로 승격하지 않는다.
- 운영 연결 요건: 소스별로 무료·자동 수집, 저장, 파생, 상업적 사용 및 공개 재배포를 **명시적으로 허용하는 권리 근거**가 있어야 한다. 단순히 공개 열람 가능하다는 사실만으로 통과하지 않는다. 본 조사에서는 운영 연결 가능 판정을 받은 소스가 없다.
- 기존 5필드(`id,date,title,source,sourceUrl`), R27 PC Core·SQLite·예약 작업·기존 API/UI와 타 콘텐츠를 변경하지 않는다.

## 공식 사실 확인 — 연결되지 않은 관측 예시

| 발행 기업 / 티커 | 관측된 이벤트 | 공식 날짜·시각 | 확인 출처 | 발표 전/후 구분 | 권리·연결 판정 |
| --- | --- | --- | --- | --- | --- |
| Microsoft / MSFT | FY2027 Q1 실적 발표 예정 | 2026-10-28; **시각 미제공** | [Microsoft Investor Relations](https://www.microsoft.com/en-us/investor/default) | 공식 미래 발표일 | 상업적 자동 수집·저장·공개 재배포의 명시 허용 근거 미확인. `RESEARCHING` |
| Apple / AAPL | FY2026 Q4 실적 설명 **콘퍼런스콜** | 2026-11-02 14:00 PT / 17:00 ET; KST 11-03 07:00 | [Apple Investor Relations](https://investor.apple.com/investor-relations/default.aspx) | 공식 미래 설명회, **실적 발표 시각이라고 단정하지 않음** | [Apple 웹사이트 이용약관](https://www.apple.com/legal/internet-services/terms/site.html)에 콘텐츠 복제·공개 재배포 제한. 별도 명시 권한 확인 전 `EXCLUDED_RIGHTS` |
| Amazon / AMZN | FY2026 Q3 실적 설명 **콘퍼런스콜** | 2026-10-29 14:00 PT / 17:00 ET; KST 10-30 06:00 | [Amazon 공식 보도자료](https://press.aboutamazon.com/2026/10/amazon-com-to-webcast-third-quarter-2026-financial-results-conference-call) | 공식 미래 설명회, **발표자료 배포 시각은 별도 미확인** | 공개 재배포·상업적 저장의 명시 권한 미확인. `RESEARCHING` |
| Meta / META | FY2026 Q3 결과 발표 | 2026-10-21 장 마감 후 | [Meta 사전 공지](https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-to-Announce-Third-Quarter-2026-Results/default.aspx) | **이미 지난 결과** | 미래 일정 후보가 아님. 과거 실적 공시와 미래 확정 예정일 구분 예시 |

- 위 행은 **권리 검토 중인 연구 관측값**이다. 캘린더 예정 데이터·PC 원본 수집 성공 건수·공개 DB 기록으로 간주하지 않는다.
- 미국 시간은 해당 현지 날짜의 IANA 시간대를 기준으로 전환했다. 정확한 시각이 확인되지 않은 MSFT 실적 발표에 시각을 부여하지 않는다.
- 개별 기업 IR 공지는 해당 기업의 일정만 증명하며, 다른 기업의 공개 재배포 권리를 대신 부여하지 않는다.

## 통합 제공원 재심사

| 후보 | 사실 확인 | 원천 권리/정확성 문제 | 판정 |
| --- | --- | --- | --- |
| [Nasdaq Market Activity](https://www.nasdaq.com/market-activity) / Earnings Calendar | Nasdaq는 일부 실적 일자가 과거 보고일을 이용한 **Zacks 알고리즘 추정**이라고 공지한다. | 공식 기업 확정일과 구분되지 않으면 프로젝트 정확성 계약 위반. 해당 실적 캘린더 데이터의 자유 상업적 재게시 허용 근거도 확보되지 않음. [Nasdaq Data Link 이용약관](https://data.nasdaq.com/terms)의 재배포 제한은 별도 서비스에 적용되므로 그 문구만으로 Nasdaq.com 법적 계약을 단정하지 않는다. | `EXCLUDED_ESTIMATED_AND_RIGHTS_UNVERIFIED` |
| [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | 기업 제출 이력, 수락·제출 날짜와 XBRL 실적 결과를 공개한다. | 과거 공시 날짜·결과를 **미래 기업 실적 발표 예정일**로 전용할 수 없다. [공식 접근 정책](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)의 요청 제한을 존중한다. | `NOT_A_FUTURE_EARNINGS_CALENDAR` |
| 종전 R4에서 제외된 EarningsCalendar.net, Earnings Whispers, API Ninjas | `docs/MARKET_CALENDAR_R1_IMPLEMENTATION.md`의 기존 제외 근거 유지. | 명시 재배포 권한이나 상업적 무료 사용 제한이 해소됐다는 새 증거 없음. | `EXCLUDED_RIGHTS` 유지 |

## R28 운영 연결 전 필요한 최소 계약

1. **권리 Evidence:** 소스별 원천 URL·약관 URL·확인 시각·무료 상업적 사용·저장·파생·재배포 허용 범위·수집 속도/robots를 문서로 증명한다. 불명확한 소스는 계속 미연결 상태로 둔다.
2. **이벤트 종류:** `earnings_release`(실적 발표), `earnings_call`(컨퍼런스콜), `filing_actual`(과거 공시 결과)을 내부적으로 구분한다. 사이트의 미래 실적 필터에는 승인된 예정 이벤트만 보낸다.
3. **식별 및 수정:** 회사 식별자(예: CIK)·종목코드·결산 분기·발표 확정 여부·공식 수정/연기/취소를 원자료에서 관리한다. 외부 공개 5필드는 승인된 최소 파서 변환 후 유지한다.
4. **시간:** 확인된 미국 동부/태평양 시간만 정확하게 `Asia/Seoul`로 변환한다. 장전/장후만 알려진 경우 `HH:mm`을 추정하지 않는다.
5. **보관/배포:** 기존 PC raw input → 검증된 저장본 → 승인된 release-calendar 게시 경로로만 연결한다. 기존 6시간 Core, DB 테이블, D1/Cloudflare 자동 배포, 기존 소스를 변경하거나 강제 수집하지 않는다.
6. **오류 경계:** 오래된 설명회·예상 날짜·미확인 권리·서로 다른 분기·잘못된 시간대·중복 기업 일정은 등록하지 않는다. 마지막 유효 일정의 출처와 확인일은 보존한다.

## 결과와 다음 단계

- **확정:** 공식 IR에서 발표일/실적 설명회 예정일이 실제로 공개된 사례를 확보했고, SEC 실적 공시 시각과 미래 일정 및 Nasdaq 추정 일자를 혼동하지 않는 기준을 확정했다.
- **미확정:** 사용·저장·상업적 공개 재배포를 명시 허가하는 무료 소스는 아직 없음. 따라서 파서·PC 설치·SQLite/웹 공개에는 **신규 실적 일정 0건**.
- **후속:** 공식 기업 IR RSS/ICS/API 또는 거래소·미국 정부의 명시적 재배포 허가를 가진 미래 실적 일정 소스를 탐색한다. 새로운 권리 근거가 확인된 소스에 한해 R28 단독 read-only 원문/파서/PC 연결로 승격한다.
- 기록 기준: `docs/MARKET_CALENDAR_PROJECT_SCOPE_AND_HANDOFF_20261027.md` 제5·7·8·9절. 외부 도구 이용·라이선스 문의·유료 서비스 계약은 임의 진행하지 않는다.

## 사용자 확정 작업 방향 — R28 기업 실적 일정은 수작업이 아닌 자동 연결 (2026-10-28)

### 목표

- **매일 사람이 발표일을 입력·갱신하지 않는다.** 공식 출처를 자동으로 다시 조회하고, 검증된 변경분을 PC SQLite와 기존 시장 캘린더에 연결한다.
- 기존 `/market-calendar/`의 `기업 실적` 필터를 사용한다. 별도의 실적 캘린더·점수 산식·재무 예측치를 만들지 않는다.
- 원천이 제공하지 않은 날짜·시각·실적 수치·시장 예상치를 임의 생성하지 않는다. 기업별 출처 미연결은 빈 상태로 유지한다.

### 공식 자동 수집 소스 우선순위

1. **공식 API / RSS / iCalendar(ICS) / 기계판독형 보도자료 피드:** 기업이 직접 게시했거나 명확한 재배포 권리를 가진 소스를 우선한다. 예정된 **실적 결과 발표** 여부를 확인한다.
2. **기업 IR 웹페이지:** 자동 접근·저장·상업적 재게시가 명시 허용되고 안정적 날짜 필드를 제공하는 경우에만 기업별 파서로 자동 수집한다. Apple처럼 자동 접근/콘텐츠 재배포가 제한된 출처는 허가 없이 우회하지 않는다.
3. **보조 식별/검증:** SEC 기업 CIK·티커 및 과거 공시로 기업 식별을 검산할 수 있으나, 과거 제출일은 미래 발표일에 사용하지 않는다. 나스닥/Zacks 추정일은 공식 기업 확정 일정으로 등록하지 않는다.
- 다수 기업을 최초 1회 소스 등록·권리 확인하는 개발 작업은 허용되지만, **발표 건별 일일 수기 등록은 운영 계약이 아니다.** 특정 기업만을 영구 제한 목록으로 정하지 않는다.

### 기존 자동 수집·게시 경로

`허가된 공식 일정 원문 자동 GET → PC raw input에 원본·출처·확인 시각 저장 → 승인 파서 검증 → 기존 release-calendar 저장본 병합 → PC SQLite → 기존 PC 게시 경로 → D1 공개 결과 → /market-calendar/ 기업 실적 필터`

- 기존 `ZGMINI-PC-Local-Core` 정규 수집 및 6시간 가드에 **소스별 최소 변경**으로 편입한다. 별도 Windows 예약 작업이나 Cloudflare Cron을 만들지 않는다.
- 소스 실패·일시 차단 시 마지막 유효 원본/일정을 보존하고 해당 출처의 오류·확인 시각을 분리 표시한다. 실패를 새로운 확정 일정이나 취소로 해석하지 않는다.
- 기업/CIK·티커·결산 분기·이벤트 종류(`earnings_release`/`earnings_call`)·공식 날짜·원천 시간대·확정/연기/취소·출처 갱신 시각은 내부 원본 검증에 이용한다. 기존 공개 이벤트 **5필드 계약** 변경은 별도 승인 없이는 하지 않는다.
- 일자 변경 시 동일 기업·동일 결산 분기의 정정으로 추적한다. 다른 기업, 다른 분기, 실적 발표와 설명회는 서로 중복 제거하지 않는다.
- 정확한 현지 시각을 공식 확인한 경우에만 `Asia/Seoul`로 변환해 KST 날짜와 남은 시간을 계산한다. 날짜만 있으면 미국 공식 날짜와 시각 미정을 유지한다.
- 투자자가 보는 `실제/예상/이전` 값은 일정과 독립적인 검증·권리 승인 전까지 공란이다.

### 구현·검증·보고 단계

1. 권리·제공 기간·실제 미래 일정·정정 방식이 문서로 검증된 **적격 소스**를 확정한다.
2. 해당 소스의 자동 수집·파서와 PC raw 저장 연결을 개발하고 기존 BLS/BEA/Fed/Census/EIA/USDA/CFTC/Treasury/TIC 회귀 테스트를 통과한다.
3. 회사 식별·분기·확정/추정 구분·DST·일자 정정·중복·결측·출처 실패 테스트를 추가한다.
4. 지정 작업 브랜치 `codex/zgmini-gpt-workspace-20261025`에 코드·근거·정확한 source SHA를 기록하고, 안전 PC 설치가 필요한 경우 완전한 Windows CMD/ZIP을 제공한다.
5. 사용자 승인 PC에 수집 기능을 연결한 뒤 **`CODE_READY` / `PC_INSTALLED` / `REGULAR_COLLECTION_OBSERVED` / `PUBLISHED`**를 실제 증거에 따라 구분해 보고한다. GitHub main/Cloudflare 배포는 요청·승인된 범위만 수행한다.

- **역할 경계:** 개발 담당은 수집 기능과 필요한 코드 회귀 검사를 완료하고 보고한다. 사용자가 공개 사이트와 정규 예약 동작을 직접 모니터링한다. 사용자가 요청하지 않은 상시 확인·예약 알림·강제 수집·반복 PC TXT 요구를 완료 조건으로 추가하지 않는다.
- **현재:** 자동화 방향은 확정했지만 적격 무료 재게시 소스·수집기 구현·PC 설치는 **미완료**다. 연구만으로 수집 성공을 주장하지 않는다.

## R28 자동 수집 1차 구현 — 권리 검증 전 비활성 후보 (2026-10-28)

- **구현 단계:** `STAGED_CODE_TESTED` / `NO_ELIGIBLE_LIVE_SOURCE` / `PC_NOT_INSTALLED` / `NOT_PUBLISHED`.
- `staging/market-calendar/r28-earnings/lib/earnings-calendar.mjs`: 기업 IR ICS 및 명시적 JSON 일정 파서. 회사 CIK/티커와 회계연도·분기로 안정 ID를 구성하고, 실적 발표와 설명회·취소·잠정 일정을 구분한다. 공개 출력은 정확히 `id,date,title,source,sourceUrl` 5개다.
- `staging/market-calendar/r28-earnings/scripts/pc-writer/release-calendar.mjs`: 기존 R27 수집기의 **별도 R28 설치 후보**. 동일 Core 6시간 가드·SQLite `public_feed_snapshots_v1` raw input 저장·출력·lease·기존 게시 경로를 재사용한다. 승인 기업별 원문과 출처를 저장한 다음 파서를 재실행하며, 일자 정정은 같은 이벤트 ID를 대체하고 실패 시 마지막 유효 일정을 보존·상태를 실패로 남긴다. 별도 예약/원격 크론/DB 테이블 변경 없음.
- `app/market-calendar/market-calendar-client.tsx`: 적격 저장본이 추후 연결될 때 기존 `기업 실적` 필터에 표시할 수 있도록 소스·ID 인식 지원을 추가했다. 시각 미확정은 그대로 표시하고 실제·예상·이전 숫자는 비워 둔다. 현재 데이터가 없는 상태는 그대로 유지한다.
- `tests/market-calendar-r28-earnings.test.mjs`: 권리 검증 실패 시 호출 차단, 공식 ICS/JSON, 회사/분기 ID, 잠정/취소, DST 현지 날짜, 변경·실패 보존, PC 저장 readback, UI 구분 검사를 포함한다.
- 실제 공급원 목록 `EARNINGS_SOURCES`는 **빈 배열**이다. 테스트용 `investor.example.com`은 가상의 검증 대상이며 실행 시 가져오지 않는다. 이용약관·상업적 저장·재배포 허용이 확인된 실제 공식 공급원이 생기기 전에는 등록하지 않는다. 따라서 현재 **실제 기업 실적 수집 0건**이며 PC 운영 설치도 하지 않는다.
- R27 설치 후보와 기존 경제지표 소스는 수정하지 않는다. R28 후보를 PC에 설치하려면 운영 승인 source SHA, 파일별 해시, 실행 중 lock, 기존 백업·config 보존을 검증하는 별도 안전 설치가 필요하다.

## 핵심 기업부터 확장 — R28 우선순위 대장 (2026-10-28)

- 1차는 미국의 NVDA·AAPL·MSFT·GOOGL/GOOG·AMZN·META·TSLA·AVGO 8개 기업이다. 이는 최초 개발 순서이며 운영 대상 전체의 상한이 아니다.
- [기업별 IR·권리 조사 상세](MARKET_CALENDAR_R28_CORE_ISSUER_PRIORITY_20261028.md) 및 `staging/market-calendar/r28-earnings/lib/priority-issuers.mjs`에 기록했다. 일정 날짜를 이 목록에서 직접 게시하지 않는다.
- 엔비디아의 공식 이벤트 RSS 제공은 확인했다. 그러나 공식 약관의 자동 수집·상업적 사용 제한을 해소하지 못했으므로 실제 수집 공급원으로 활성화하지 않는다. 애플 역시 상업적 재배포 금지 약관을 준수한다.
- 나머지 핵심 기업은 공식 IR 일정 경로와 사전 발표 예시를 확인했으나, 재배포 허용 근거가 미확보되어 `RESEARCHING`이다. **현시점 8개 중 실제 승인 0개·자동 공개 0건**이다.
