# 우주·위성 신규 ETF 후보 스크리닝 R4 — 비공개 선정 준비

- 조사일: 2026-10-25 (Asia/Seoul)
- 상태: `PUBLIC_CATALOG_METADATA_VERIFIED / PRIVATE_SELECTION_NOT_FINAL`
- 출발 main SHA: `81955865f589b068aabf4b581a8eefeac182c2b3`
- 적용 계약: [신규 테마 OR·R2 승인 기준](THEME_ETF_ADAPTIVE_OR_R2_20261025.md), [테마 운영 기준](THEME_DATA_OPERATIONS.md)
- 변경 범위: **이 조사 문서만**. 기존 9개 테마, 수집기, 계산기, D1, 예약 작업, 배포, 기존 점수·이력 변경 0.

## 1. 기존 9개 운영 방식에서 그대로 계승할 것

1. ETF 2종 + 동일 SPY 기준으로 가격을 선정한다. 개별 종목 가격을 테마 계산에 섞지 않는다.
2. 승인된 PC 경로에서 Provider 응답 → 로컬 원자료 불변 저장/manifest·SHA256 검증 → **저장된 가격만**으로 R188 또는 승인 R2 계산 → PC 결과 저장을 실행한다.
3. 신규 테마의 최종 ETF·권리·원가격이 검증된 뒤에만 독립 D1 key 게시/readback → `/api/theme-fear-greed` → PC/모바일 252거래일 표시 창 → 다음 정규 실행 검증으로 진행한다.
4. 기존 7개 R181/R179/R171 lane, AI·반도체, 바이오·신약의 등록·산식·D1 이력은 수정하지 않는다. 기존 9개를 OR 기준 도입 때문에 다시 선정하거나 계산하지 않는다.

## 2. GetMarketHistory 공개 카탈로그 실측

- 호출: `GET https://getmarkethistory.com/api/v1/symbols?source=stocks&timeframe=1m&prefix=<ETF>&limit=20` (무인증/무료 카탈로그 조회). 각 응답의 정확한 `symbol`을 확인했다.
- 주의: `stocks` 원본 저장 간격은 `1m`이므로 **종목 목록 API의 `timeframe=1h`는 전체 종목에서 `stocks has no "1h" timeframe (stored: 1m)` 404**를 돌려준다. 이는 ETF 부재를 뜻하지 않는다. 실제 무료 **가격봉** API `/api/v1/bars/stocks/<symbol>/1h`와 구분한다.
- `covered_from=2016-01-01`은 데이터셋 구성 범위일 수 있으므로 개별 ETF 상장일/628세션 증거로 쓰지 않는다. 첫 종목별 `first_timestamp`와 유효 15시 뉴욕 시간봉 및 공통 SPY 세션을 별도로 확인해야 한다.
- 아래 `rows`는 공급원 전체 **1분봉 레코드 수**이며 유효 거래일 N이나 252개 점수 개수가 아니다.

| 심볼 | 종목별 첫 공급원 timestamp (UTC) | 마지막 timestamp 날짜 | 카탈로그 1분봉 rows | 정확 심볼 등록 |
| --- | --- | --- | ---: | --- |
| UFO | 2019-04-11 | 2026-10-23 | 151,335 | YES |
| NASA | 2026-03-31 | 2026-10-23 | 79,266 | YES |
| ORBX | 2026-04-15 | 2026-10-23 | 9,327 | YES |
| WARP | 2026-05-07 | 2026-10-23 | 11,002 | YES |
| MARS | 2026-03-05 | 2026-10-23 | 17,473 | YES |
| ROKT | 2018-10-23 | 2026-10-23 | 21,313 | YES |
| ARKX | 2021-03-30 | 2026-10-23 | 269,945 | YES |
| SPY | 2016-01-01 (카탈로그 첫 기록) | 2026-10-23 | 184,927 | YES |

공급원 문서: https://getmarkethistory.com/docs/api/reference · https://getmarkethistory.com/docs/coverage · https://getmarkethistory.com/docs/limits

### 해석 금지 항목

- UFO가 2019년 시작했다고 **R188용 유효 공통 거래일 N≥628이라고 아직 선언하지 않는다**.
- NASA 등 신생 ETF가 40일을 넘겼다고 선언하지 않는다. 상장일 차이와 데이터 제공/실거래/결측을 구분한다.
- 특히 ROKT는 오래됐는데 총 1분봉 rows가 상대적으로 적다. `SYMBOL_LISTED`를 충분한 15:xx 뉴욕 시간봉 또는 628일 이력으로 오인하지 않는다.
- 현재 조회는 원본 가격봉 다운로드나 로컬 원자료 저장, private score 계산, PC 운영 검증이 아니다.

## 3. 발행사 공시의 선정 비교 (관측시각별로 구분)

| 후보 | 발행사 기준 | 확인된 수치 | 선정상 의미 |
| --- | --- | --- | --- |
| UFO | 2019-04-11 출시, Procure | 2026-10-22 공시 30일 중앙 호가 스프레드 0.23% | 기존 장기 우주 전용축 우선 검증 |
| NASA | 2026-03-30 출시, Tema | 2026-10-22 AUM **$950,551,499**, 스프레드 **0.05%**, 38보유 | 신생 혁신 ETF 1순위 실측 후보 |
| ORBX | 2026-04-14 출시, Global X | 2026-10-21 AUM **$36.69M**, 스프레드 **0.36%**, 테마 관련 매출 ≥50% 스크리닝 | 순도 비교를 위한 대안 |
| WARP | 2026-05-06 출시, VanEck | 2026-10-23 순자산 **$37.40M**, 우주 전문 지수 | 순도 비교를 위한 대안 |
| MARS | 2026-03-05 거래 시작, Roundhill | 우주·기술 능동 운용, AUM/스프레드는 비교 가능 동일일 수치 미확보 | 추가 경쟁 후보, 임의 탈락 금지 |
| ROKT | 2018-10-22 출시, State Street | 우주와 심해 탐사 함께 포함 | 테마 순도와 원가격 N 확인 필요 |
| ARKX | 2021-03-30 출시, ARK | 2025년 우주·방산 혁신 ETF로 변경 | 기존 방산 테마와 중복 검토 필요 |

출처: https://temaetfs.com/nasa · https://www.procureetfs.com/ufo/ · https://www.procureetfs.com/ · https://www.globalxetfs.com/funds/orbx · https://www.vaneck.com/us/en/investments/space-etf-warp/overview · https://www.roundhillinvestments.com/etf/mars/ · https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-kensho-final-frontiers-etf-rokt · https://www.ark-funds.com/funds/ARKX
참고 기사: Reuters 2026-05-22, https://www.reuters.com/legal/transactional/space-etfs-booming-anticipation-spacex-ipo-2026-05-22/ (6개 신규 ETF 및 보유 종목 중복 경고).

## 4. 현재의 수치 기반 우선 검증 순서 (확정 편입 아님)

1. **UFO + NASA**: 기존 장기 우주 ETF + 2026 신생 우주 ETF 구조. 발행사 자료상 NASA 규모·호가 스프레드에서 나머지 신생 후보보다 유리. 두 ETF의 당일 유효 N, 시계열 결측·대표성·보유 중복을 먼저 확인한다.
2. **UFO + ORBX**, **UFO + WARP**: NASA 가격 coverage 불충분 또는 ETF 성격 차이가 있는 경우 비교. 수집 실패를 ETF 가격 부재로 과장하지 않는다.
3. **UFO + MARS**, **UFO + ROKT**, **UFO + ARKX**: 자료/순도/중복 사유를 정량 근거로 추가 검토. 임의 AND 컷 없이 기존 경로 **OR** 혁신 경로를 각각 판정한다.
4. 최종 pair는 **미승인/미확정**이며 비공개 가격 실측 이후 결정한다. 두 ETF 모두 단기인 조합의 가중치는 승인 전 사용하지 않는다.

## 5. 다음 실행 Gate

1. 승인된 PC `E:/ZGmini/data/themes/space-satellite/`에 과거 raw/manifest/checkpoint가 있는지 먼저 확인하고 존재하면 checksum 재조회하여 재사용한다. E: 접근 불가를 `없음`으로 단정하지 않는다.
2. 필요한 부족 종목만 기존 검증된 GetMarketHistory 1h 수집 계약/무료 제한 내에 **bounded·resume** 방식으로 저장한다. Provider 결과를 계산 중 직접 호출하지 않는다.
3. 실제 SHA-검증 가격에서 뉴욕 현지 15시 시간봉(조기 폐장 12시), `is_gap`, 중복 시각, SPY 공통 날짜 및 N을 구한다. `N<40`은 후보를 유지하고 점수는 결측.
4. 장기 N≥628이면 R188, 신생 N=40..376이면 R2를 적용한다. 상위 축 40:20:40 고정; 두 ETF 혼합은 승인 문서대로 신생 30% (N40)에서 50% (N377)까지 **각 관측일 N으로** 증가.
5. 실제 252거래일 표시 창에서 상장 전 결측을 생성/보간하지 않고, 적응형 377일 미만은 잠정 점선으로만 구분한다. rights 확인 이후에만 독립 D1 게시를 별도 Gate로 검토한다.
6. 기존 PR #709(`codex/space-satellite-r1`, SHA `65decc990c4e8545b721e7abb12449e015aa7f90`)의 계산기/테스트 중 필요한 것만 최신 main에 **selective recovery**한다. 해당 PR은 UFO/ROKT/ARKX만 하드코딩하고, 두 ETF 모두 단기인 대칭 가중치까지 구현하므로 이를 사용자 승인으로 간주하지 않고 전체 merge하지 않는다.

## 6. 권리·완료 판정

- GetMarketHistory 2026-10-19 Terms는 정상 계정 조건 아래 raw bar를 재구성할 수 없도록 만든 파생 지표·차트 배포를 허용하고, 원가격 bulk 재배포는 금지한다. https://getmarkethistory.com/docs/terms
- 위 문구는 사용자 계정/무료 수집 경로/현재 라이선스 범위의 실제 검증을 대신하지 않는다. provider catalog에 있다는 이유로 `derivedLicenseVerified=true`를 설정하지 않는다.
- 현재 Evidence 상태: `PUBLIC_SYMBOL_CATALOG_PASS / REAL_BAR_SESSION_COUNT_UNKNOWN / PRIVATE_SCORE_NOT_RUN / PAIR_NOT_SELECTED / PUBLICATION_NOT_AUTHORIZED`.
- **이번 GitHub 문서는 코드 설치·데이터 게시·Cloudflare 배포·자동 갱신 완료가 아니다.**
