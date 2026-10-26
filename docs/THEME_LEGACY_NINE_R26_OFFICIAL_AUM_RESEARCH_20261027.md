# 기존 9개 테마 R26 — 발행사 공식 AUM 확인 (4단계, 부분 진행)

- 기준: 기존 R22 승인 6단계 중 4단계. 기존 ETF 63종 후보를 변경하지 않는다.
- 검색 시작: 2026-10-27 01:10 KST, 무료 공개 발행사 웹 페이지만 이용.
- 검증 상태: **3/63종 공식 수치 확보**. 4종 발행사 페이지를 찾았으나 AUM 직접 확인 대기. 나머지 56종 아직 확인 전. 5단계 합산 **실행 금지 상태**.
- 통화: USD. AUM은 공식 발행사 수치이며 날짜별 역사 자산값은 아니다. 공식 사이트 수치 반올림 여부를 기록한다.

## 1. 로봇·자동화 테마 — 발행사 자료

| ETF | AUM (USD) | 기준일 | 확인 결과 | 직접 출처 |
| --- | ---: | --- | --- | --- |
| BOTZ | 약 **3,100,000,000** | 2026-10-23 | `OFFICIAL_ROUNDED` (발행사 $3.10B 표시) | [Global X BOTZ](https://www.globalxetfs.com/funds/botz) |
| ROBT | **758,835,620** | 2026-10-21 | `OFFICIAL_EXACT` | [First Trust ROBT 공식 인쇄형 데이터](https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Print=Y&Ticker=ROBT) |
| RBTX | **9,596,069** | 2026-10-23 | `OFFICIAL_EXACT` | [BlackRock RBTX](https://www.blackrock.com/us/financial-professionals/products/354128/ishares-future-robotics-and-related-technologies-active-etf) |
| ROBO | — | — | `PENDING`: 발행사 사이트에서는 확인일·보유종목만 확인, AUM 값 부재 | [ROBO Global ETF](https://www.roboglobaletfs.com/robo) |
| ARKQ | — | — | `PENDING`: 공식 ETF 목록 검색에는 2026-09-30 $1,891M가 노출됐으나 상세 페이지가 동적 `--` 표시. 원자료 확인 전까지 확정값 미반영 | [ARK ETF 목록](https://www.ark-funds.com/our-etfs) |
| HUMN | — | — | `PENDING`: 발행사 펀드 페이지 `AUM` 항목이 빈칸으로 반환됨 | [Roundhill HUMN](https://www.roundhillinvestments.com/etf/humn/) |
| CBOT | — | — | `PENDING`: 발행사 펀드 페이지 확보, 공식 AUM 값은 아직 확인되지 않음 | [Corgi CBOT](https://corgiinvest.com/cbot) |

## 2. 운영 규칙

1. 데이터 수치가 외부 포털에 보이더라도 **발행사 자료로 확인되지 않으면 AUM을 채우지 않는다**.
2. 공식 2026-10-23 AUM과 2026-10-21 AUM을 동일 날짜 현재 수치로 위장하지 않는다. 각 수치의 실제 기준일을 유지한다.
3. 공식 표시가 `$3.10B`처럼 반올림된 값이면 `OFFICIAL_ROUNDED`를 별도로 표기한다. 아직 세부 정확금액을 복원하지 않는다.
4. 새 API/유료 경로/자체 추정 AUM/과거 날짜별 가상 AUM을 도입하지 않는다.
5. **4단계 전체 63종 공식 자료 조사 완료 전** 이 파일을 R32 합산용 완성 입력으로 사용하지 않는다. 추가 확인 없이 R26을 공개 자료로 게시하지 않는다.

## 3. 차기 작업

- 미확인 4종의 공식 자산값 확인 및 나머지 56종 공식 발행사 페이지 순차 조사.
- 발행사 공식 사실확인 날짜·USD 금액·원문 URL·검증 상태를 ETF별 축적.
- 4단계 전수 조사 후 5단계 R32 가중 계산기에 입력하고 252일 그림자 검증을 수행한다.
