# 우주·위성 R17 PC 실측 → R18 9개 후보의 동적 비공개 조합 검산

2026-10-25 / Draft PR #714 / `codex/theme-fear-greed-integration-20261025`.

## 실제 R17 사용자 PC 검사 통과

- 첨부 `SPACE_SATELLITE_R17_HOUR_COVERAGE_RESULT.txt`: `PHASE=ALL_CODE_SHA256_VERIFIED`, `PRIVATE_SAME_HOUR_FEASIBILITY_ONLY_NO_SCORE_CHANGES`.
- SHA-verified 기존 동일 스냅샷: ETF manifest `1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b`, SPY `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e`. 최신 SPY NY15 날짜 2026-10-23.
- 총 **9개 ETF** 검사. 원본/공개/D1/스케줄러/DB/산식 저장 변경 0, Provider GET 0.

| ETF | 원래 NY15/SPY 유효일 | 실제 ETF+SPY 동일시간 봉 추가 관측 가능일 | 미해결일 | 최근 45일 결측→관측 가능 |
| --- | ---: | ---: | ---: | --- |
| UFO | 656 | 50 | 0 | 0→0 |
| NASA | 144 | 0 | 0 | 0→0 |
| WARP | 118 | 0 | 0 | 0→0 |
| ORBX | 130 | **4** | **0** | **3→3** |
| MARS | 162 | 0 | 0 | 0→0 |
| ARKX | 706 | 0 | 0 | 0→0 |
| ROKT | 446 | 178 | 82 | 1→1 |
| DIPR | 28 | 59 | 32 | 41→22 |
| WSPC | 15 | 26 | 35 | 38→15 |

- ORBX는 누락된 9/03, 9/14, 10/02의 뉴욕 14시 ETF/SPY 동시봉 실재. 원래 21/61/125 유효 세션이 20/58/121→**이론적으로** 21/61/125. 과거 전체 4일도 14시. **기존 15시 산식에 대체 적용은 하지 않음**.
- ORBX 같은 날 14시↔15시 ETF/SPY 상대가격 실측 차이 절대값: **118쌍**, 중위 **0.42356%**, 90분위 **1.36114%**, 최대 **2.36784%**. 14시/15시 동치 또는 점수 오차 0으로 단정 불가.
- ROKT는 178일 대체 가능하지만 82일 다른 시간대 ETF/SPY 동시봉마저 없고, *이미 기존 점수 정상*. 현재 점수 보존.
- DIPR의 최근 21일 최대 활용 가능 13/21, WSPC 13/21. 총 잠재 관측일 87/41이라도 기존 R2의 최신 점수 가능 확정이 아니다. WSPC의 14시↔15시 동시 ETF/SPY 비교 표본 **0**이므로 오차를 0이라고 보고 금지.
- UFO의 과거 50일 잠재 관측 가능은 최신 현재점수 교체 근거가 아님.

## R18 목적: 관측 가능한 모든 **기존 15시 기반** 점수의 날짜별 가변 조합

1. R15 PC 실측 9개 ETF의 기존 현시점 개별점수(현재 6개 유효)·원본 manifest/공유 SPY SHA를 **다시 검산**. 코드/원본이 변경됐으면 차단.
2. 추가 14시/다른 시간봉을 **일절 사용하지 않음**. 승인 기존 `selectRealHourlySessions`의 NY15/조기폐장 NY12만. `scoreAdaptiveTimeline`의 40/377/628 및 40:20:40 방식 그대로 호출.
3. 각 실제 SPY 거래일에 자기 ETF **동일일 정규 프록시가 존재**하고, 실제 개별점수·공통 실관측 N≥40·유효 R2 상태인 ETF **전부**를 포함. 숫자로 2·3·6개를 미리 제한하지 않음. 다른 ETF의 과거점수나 0을 채워 넣지 않음.
4. 같은 날 점수가 있는 ETF가 2개 이상이면, **미승인 R4-A 상대 관측성숙도 가중식**으로 비공개 Shadow 조합점수·종목별 백분율을 표시. 0개/1개면 결측. R4-A는 조합 효과 평가용이지 승인된 최종 배포 가중치가 아님.
5. 최근 252 SPY 거래일 **표시창**에서 실제 조합 가능한 날, 날짜별 가변 활성 종목 수의 분포, ETF별 실제 기여 일수, 최신 점수·비중을 **요약만** 출력. 원시 1h 가격, 개별 종목 가격, 대량 날짜별 가격 저장/업로드는 하지 않음.
6. 정밀 일치조건 남용 금지: R15 개별 현재 점수 비회귀는 확인하되, 모든 ETF가 모든 역사 날짜에 점수가 있어야 전체가 통과하는 AND 조건을 만들지 않음.

## Windows PC 실행 및 이후 승인 게이트

- R18 ZIP **10개 `.mjs` + 1개 `.cmd`**, Desktop의 같은 폴더에 압축 해제. CMD 옆에 `SPACE_SATELLITE_R18_VARIABLE_BASKET_RESULT.txt` 생성.
- `theme-space-satellite-r18-variable-basket-shadow.cmd`를 사용자가 Windows CMD로 실행. E: 원본은 읽기만, 추가 Provider 호출 0, 원본/이력 파일 저장 0.
- 사용자 제출 후 **실제 6개 점수 기반 다종 가중 조합을 정량 검토**, 겹침/구성 순도/AUM은 기존 R10 발행사 문서와 새 동일일 자료로 구분. R4-A 사용 승인·원본 파생 공개 권리 승인·최종 ETF 구성 승인 전 **공개/병합/Cloudflare 배포 금지**.
- 현재 9개 후보를 6개로 고정하거나 ORBX·DIPR·WSPC 영구 제외하지 않는다. 실제 결측이 해소되면 개수 상한 없이 다음 해당일에 편입 평가한다.

출처: [GetMarketHistory 1h 데이터 및 갭 정책](https://getmarkethistory.com/docs/api/reference), [NYSE 정규장](https://www.nyse.com/trade/trading-information), [GetMarketHistory 파생물 라이선스 조건](https://getmarkethistory.com/docs/terms).
