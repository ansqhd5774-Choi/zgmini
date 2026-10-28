# R58 — 27일 R32 원가격 대체 경로의 최소 실증

- 작업 전용 브랜치: `codex/theme-fear-greed-integration-20261025` (변경 금지).
- 현재 공개 확인(2026-10-29 KST): `modelRevision=null`, 확정일 2026-10-26, 잠정일 2026-10-27, 공개 10개 테마. **R32 D1 게시 미완료**.
- 기존 R47 활성 가격 제공처 GetMarketHistory는 2026-10-29 KST 재조회에도 SPY 1시간봉 `x-data-through=2026-10-26T23:59:00Z`, 27일 요청 `x-row-count=0`. 기존 자료를 삭제하거나 점수 0/전일값으로 채우지 않는다.

## 이유와 검사 경로

PC의 기존 `scripts/pc-writer/alpaca-incremental.mjs`는 `E:\ZGmini\data\pc-writer\providers.env`에 등록된 Alpaca 인증을 이미 사용한다. 그러나 이 경로는 **IEX split-adjusted 일봉**이며 R32의 **GMH raw unadjusted 1시간봉**과 계약이 다르다. 자동 교체 가능한 것으로 취급하지 않는다.

Alpaca 공식 [Historical bars API](https://docs.alpaca.markets/us/reference/stockbars)는 `timeframe=1Hour`, `adjustment=raw`, `feed=sip` 또는 `feed=iex`를 명시한다. [Market Data API 안내](https://docs.alpaca.markets/us/docs/about-market-data-api)에 따르면 무료 Basic의 IEX 범위와 전체 거래소 SIP 범위는 다르다. SIP 호출에 권한이 없으면 403 가능성이 있다. **유료 플랜 변경·구매·추가 인증 등록을 요청하거나 실행하지 않는다.**

R58은 오직 다음 세 가지 **읽기 전용 HTTPS GET(최대 3개)**으로 등록 경로의 기술적 가능성만 확인한다.

1. 공개 GMH SPY 10월 26일 원시 1시간봉 1GET — 비교 기준(사용자 PC 원본 불변).
2. 이미 등록된 Alpaca `feed=sip`, `adjustment=raw`, `1Hour`, SPY 10월 26·27일 1GET.
3. 동일 조건의 `feed=iex` 1GET — SIP 권한이 없을 때 이용 가능 여부만 확인.

각 날짜 뉴욕시간 15시 봉이 실제로 존재하는지, 26일 GMH와 Alpaca SPY 종가가 일치하는지만 TXT에 출력한다. **원시 가격, 인증키, API 응답 본문, 타 종목 데이터는 TXT에 기록하지 않는다.** SIP·IEX 어느 것도 원본 가격·시각·시장 커버리지의 63 ETF 전체 일치가 검증되지 않으면 R32 자동 계산 소스에 연결하지 않는다. SPY 1종 1일 일치만으로 가격모드 동등/운영 전환을 승인하지 않는다.

## 실PC R58 결과 — 2026-10-29 KST

사용자 제출 `THEME_NINE_R58_ALPACA_READONLY_RESULT_16615_3201.txt` (원시값·인증키 미포함): 검사 `READ_ONLY_PROBE_COMPLETE`, 총 `requests=3`, 기록·게시 0건.

| 1시간봉 소스 | 26일 뉴욕 15시 | 27일 뉴욕 15시 | 26일 SPY GetMarketHistory 원본 비교 |
| --- | --- | --- | --- |
| GetMarketHistory | `1`, 유효 | `0`, 미제공 | 기준 소스 |
| Alpaca SIP raw | HTTP `403` | HTTP `403` | 비교 불가 |
| Alpaca IEX raw | `1`, 유효 | `1`, 유효 | **종가 불일치(`false`)** |

**결정:** IEX의 27일 가격은 존재하나 기존 26일 기준과 다르므로, 검증 없이 R32 원본에 편입하거나 D1 점수 게시에 사용하지 않는다. SIP 403은 권한 실패이므로 우회하지 않는다. 따라서 R58은 `ALTERNATE_SPY_27_AVAILABLE_BUT_PRICE_PARITY_NOT_APPROVED / PUBLIC_R32_STILL_BLOCKED`이다. [Alpaca 공식 문서](https://docs.alpaca.markets/us/reference/stockbars)에 raw 및 피드 구분이 명시되어 있다. 공식 무료/유료 피드 정책도 서로 다르다.

## 실행

`THEME_NINE_R58_ALPACA_READONLY_WINDOWS.zip`에서 두 파일을 **같은 폴더**에 압축 해제한다.

- `THEME_NINE_R58_ALPACA_READONLY.cmd` 더블클릭.
- `theme-nine-r58-alpaca-readonly-probe.mjs`는 CMD에서만 호출.
- CMD 옆 `THEME_NINE_R58_ALPACA_READONLY_RESULT_*.txt` 파일을 사용자에게 요청한다.

CMD는 E:에서 Node 및 기존 `providers.env`를 읽는다. 키 부재 시 `STOP_ALPACA_REGISTERED_CREDENTIALS_UNAVAILABLE`와 `requests=0`으로 종료한다. 원본/계산/DB/D1/예약 작업/공개 API 쓰기 0건. **이 검사가 끝나도 사이트 배포 성공이 아니다.**

다음 결정은 실PC 결과에 따른다. (a) 27일 원본 소스의 정상 도착은 기존 R47→R48→R51→R54 경로를 그대로 즉시 실행하고 D1/공개 readback까지 검증. (b) 다른 출처에서 27일이 확보되면 63 ETF 커버리지·가격모드·권리·소스 검증 및 사용자의 소스 전환 승인 없이 원점수에 혼합하지 않는다. (c) 어느 곳도 27일 값이 없으면 `SOURCE_NOT_AVAILABLE`이라고 보고하며 게시 완료로 속이지 않는다.
