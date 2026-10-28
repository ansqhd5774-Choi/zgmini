# R28 기업 실적 자동 수집 — 미국 핵심 기업 1차 우선순위·출처 확인 (2026-10-28)

## 사용자 지시와 상태

- **1차 우선 범위:** 미국 핵심 기술·AI·클라우드·플랫폼 기업 8개(NVDA, AAPL, MSFT, GOOGL/GOOG, AMZN, META, TSLA, AVGO). 이는 최초 작업 순서이며 기업 전체 상한이나 영구 고정 목록이 아니다.
- 자동 수집 → PC SQLite 저장 → 기존 `/market-calendar/` 실적 필터 연결. **개별 실적 발표일을 수동 입력하지 않는다.**
- **판정: `PRIORITY_DEFINED / 0_ELIGIBLE_AUTOMATED_REPUBLICATION_SOURCES / NO_LIVE_COLLECTION`.** 연구 중인 공식 발표일·설명회 날짜는 캘린더 이벤트에 등록하지 않는다.
- 코드 대장: `staging/market-calendar/r28-earnings/lib/priority-issuers.mjs`. `EARNINGS_SOURCES`와 구별된 **연구용 데이터**이며 실제 수집 로직에서 import하지 않는다.

## 기업별 공식 IR 및 사용권 조사

| 기업 | 종목·CIK | 공식 일정/IR | 기계판독형 소스 | 현재 권리 판정 |
| --- | --- | --- | --- | --- |
| NVIDIA | NVDA · 1045810 | [이벤트](https://investor.nvidia.com/events-and-presentations/events-and-presentations/default.aspx) | [공식 이벤트 RSS](https://investor.nvidia.com/rss/Event.aspx?LanguageId=1), [RSS 안내](https://investor.nvidia.com/investor-resources/rss/default.aspx) | `EXCLUDED_RIGHTS` — [이용약관](https://www.nvidia.com/en-us/about-nvidia/terms-of-service/)은 자동 추출 및 상업적 사용을 제한한다. RSS가 존재해도 공개 재배포 권한은 증명되지 않는다. |
| Apple | AAPL · 320193 | [IR](https://investor.apple.com/investor-relations/default.aspx) | 승인된 자동 일정 피드 미확인 | `EXCLUDED_RIGHTS` — [사이트 약관](https://www.apple.com/legal/internet-services/terms/site.html)의 콘텐츠 상업적 복제·배포 제한. |
| Microsoft | MSFT · 789019 | [IR](https://www.microsoft.com/en-us/investor/default) | 승인된 기계판독형 일정 피드 미확인 | `RESEARCHING` — [저작물 이용 안내](https://www.microsoft.com/en-us/legal/intellectualproperty/copyright/permissions); 공개 재배포 허용 근거 미확인. |
| Alphabet | GOOGL/GOOG · 1652044 | [이벤트](https://abc.xyz/investor/events/default.aspx) | 자동 재배포 허가된 피드 미확인 | `RESEARCHING` — [공식 발표 공지](https://abc.xyz/investor/news/news-details/2026/Alphabet-Announces-Date-of-Third-Quarter-2026-Financial-Results-Conference-Call-2026-8tpGZsLS6v/default.aspx)는 확인되지만 재배포 허가 별개. |
| Amazon | AMZN · 1018724 | [이벤트](https://ir.aboutamazon.com/events/) | 자동 재배포 허가된 피드 미확인 | `RESEARCHING` — [공식 발표 공지](https://press.aboutamazon.com/2026/10/amazon-com-to-webcast-third-quarter-2026-financial-results-conference-call)는 확인되지만 재배포 허가 별개. |
| Meta | META · 1326801 | [이벤트](https://investor.atmeta.com/investor-events/) | 자동 재배포 허가된 피드 미확인 | `RESEARCHING` — 현재 이벤트 페이지는 차기 공식 예정일을 확인해 주지 않으며 상업적 재배포 권한도 미확인. |
| Tesla | TSLA · 1318605 | [IR](https://ir.tesla.com/) | 자동 재배포 허가된 피드 미확인 | `RESEARCHING` — [공식 2026 Q3 공지](https://ir.tesla.com/press-release/tesla-third-quarter-2026-production-deliveries-and-deployments)는 지난 발표이므로 미래 이벤트 아님. |
| Broadcom | AVGO · 1730168 | [이벤트](https://investors.broadcom.com/company-information/past-events) | 자동 재배포 허가된 피드 미확인 | `RESEARCHING` — [2026 Q3 공식 사전 공지](https://investors.broadcom.com/news-releases/news-release-details/broadcom-inc-announce-third-quarter-fiscal-year-2026-financial)는 과거 발표. |

## 2026-10-28 확인한 시간·이벤트 구분 참고(운영 데이터 아님)

- Microsoft 공식 IR: 2026-10-28 FY27 1분기 실적 예정일. 페이지에서 정확한 시각 미확인.
- Alphabet 공식 공지: 2026-10-28 13:30 **PT 실적 설명회**, 결과물 실제 게시 시각과 구분.
- Amazon 공식 공지: 2026-10-29 14:00 **PT 실적 설명회**, 결과 발표 시각이라고 단정하지 않음.
- Apple 공식 IR: 2026-11-02 14:00 **PT 실적 설명회**, 별도 결과 게시 시각 미확인.
- Meta/Tesla의 2026년 3분기 발표는 10월 28일 기준 이미 지난 이벤트이며, 다음 실적 발표일로 연장·추정하지 않는다.
- **이 목록은 출처 품질 검증 예시일 뿐** 현재 PC DB·D1·공개 캘린더 0건을 변경하지 않는다. 새 일자가 나오면 사람이 여기서 날짜를 갱신하는 방식으로 운영하지 않는다.

## 다음 구현 게이트

1. 공식 IR 사용약관에서 **정기 자동 GET, PC 보관, 상업적 이용, 원자료 날짜의 공개 재배포**를 모두 허용하는 근거를 출처별 확보한다. 접근 가능한 RSS·HTML이라는 이유만으로 승인하지 않는다.
2. 적격 공급원은 기업별 원본 구조(ICS/JSON/허용된 RSS 등)·날짜/분기·취소/정정·timezone 실제 예제로 검증한다. 출시 전에 실제 입력 재해독/파서 결과/이전 PC source SHA를 확인한다.
3. 권리 검증을 통과한 기업만 `EARNINGS_SOURCES`에 활성 등록하고, 기존 `ZGMINI-PC-Local-Core` 수집기·SQLite·게시 5필드 계약으로 연결한다.
4. 사용자 요청과 무관한 별도 예약·알림·감시 기능은 만들지 않는다. PC 설치·정규 수집 관측·사이트 게시를 각각 별도 증거로 보고한다.

## RSS 자동 연결 후보 코드 확장 (2026-10-28)

- `staging/market-calendar/r28-earnings/lib/earnings-calendar.mjs`에서 기존 ICS/JSON에 더해 **RSS 형식**을 처리하도록 확장했다. 예비 파서는 공식 피드 항목에 별도의 구조화된 `eventStartDate` / `event:startDate` / `eventDate`가 있는 경우에만 일자를 추출한다.
- 일반 RSS `<pubDate>`는 **공지 게시 날짜**일 수 있으므로 **실적 개최 날짜로 전환하지 않는다**. 실적 설명회/발표·회계연도·분기·확정/잠정/취소 상태·현지 시간대와 링크 도메인을 확인한다. 공개 출력 5필드는 유지한다.
- `staging/market-calendar/r28-earnings/scripts/pc-writer/release-calendar.mjs`는 적격 RSS 원문을 기존 6시간 PC Core 흐름의 SQLite 입력에 보존하고 파서를 재실행하도록 변경했다. 실제 공급원은 **여전히 0개**이며 테스트용 가상 RSS만 사용했다.
- NVIDIA RSS는 실제 공식 URL이 확인됐으나 **개별 항목의 구조화된 이벤트 날짜 필드 존재 여부를 검증하지 못했으며 약관상 운영 수집이 제외**되어 있다. 이번 파서의 NVIDIA 실데이터 적합성·재배포 적법성이 통과했다는 뜻이 아니다.

### 통합 상용 데이터 API 추가 판정

| 후보 | 공식 사용권 근거 | R28 조치 |
| --- | --- | --- |
| [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs/pricing?planType=commercial) | 데이터 표시 및 재배포에는 별도 Data Display and Licensing Agreement를 요구한다. | 무료 공개 재배포 공급원으로 승인하지 않음. `EXCLUDED_RIGHTS` |
| [Polygon Market Data](https://polygon.io/terms/market_data_terms.pdf) | 별도 서면 동의 또는 제3자 제공자 허용 범위 밖의 재배포·사업/상업적 사용을 제한한다. | `EXCLUDED_RIGHTS` |
| [Alpha Vantage 시장 데이터 정책](https://www.alphavantage.co/realtime_data_policy/) | 상업적 사용은 별도 연락·데이터 온보딩 안내. 이는 시장 데이터 정책으로 실적 일정 전체 권리를 단정할 수 없으나 무료 재배포 허용 근거는 아니다. | `RESEARCHING / NOT_APPROVED` |

유료 플랜 구매, 라이선스 문의, 우회 수집은 사용자 별도 승인 전 진행하지 않는다.

### 권리 판정 주의

금융시장의 공개 **사실**과 특정 사이트의 **콘텐츠/자동 수집 이용허가**는 법적으로 별개일 수 있다. 이 프로젝트는 더 엄격한 사용자 승인 계약에 따라 **사용·저장·상업적 재배포의 명시 허용**을 소스별 채택 조건으로 사용한다. 무허가 피드를 우회 수집하지 않는다.
