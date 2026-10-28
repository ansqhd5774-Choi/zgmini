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
