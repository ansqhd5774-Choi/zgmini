# 우주·위성 R16 — PC 원본의 실제 결측·산식 축 누락 원인 검사

2026-10-25 · Draft PR #714 · 브랜치 `codex/theme-fear-greed-integration-20261025`.

## R15 사용자 PC 실측 결과 — 완료 증거

- `SPACE_SATELLITE_R15_ALL_ETF_SCORE_RESULT.txt` 제출, `PHASE=ALL_CODE_SHA256_VERIFIED`, `PRIVATE_INDIVIDUAL_SCORES_ONLY_NOT_WEIGHTED_NOT_PUBLISHED`.
- 원본 manifest SHA: `1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b`; 공유 SPY SHA: `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e`.
- 기준 2026-10-23, **9개 전수 검사 / 6개 현재 개별 점수 / 3개 보류**. 공식 일간 종가가 아닌 동일 NY 15시의 무료 원시 1h 프록시.

| ETF | NY15 SPY 공통 관측 | 현재 비공개 점수 | 유효일/특이사항 |
| --- | ---: | ---: | --- |
| UFO | 656 | 34.88492 | R188-compatible / 252/252 점수 |
| NASA | 144 | 48.90703 | R2 임시 / 105/252 |
| WARP | 118 | 60.52650 | R2 임시 / 79/252 |
| ORBX | 130 | **결측** | ETF 마지막 10/23이나 점수 마지막 9/02의 66.99047, **과거 점수 현재 대입 금지** |
| MARS | 162 | 47.76741 | R2 임시 / 123/252 |
| ARKX | 706 | 31.69048 | R188-compatible / 252/252; R14로 과거 이력 뒤 이어 붙임 |
| ROKT | 446 | 44.09211 | R2 임시 / 133/252 |
| DIPR | 28 | **결측** | 마지막 10/08, 40일 미달, 실제 데이터 수집 성공과 점수 가능성 구분 |
| WSPC | 15 | **결측** | 마지막 10/16, 40일 미달 |

모든 9개 원본 SHA 통과, `providerCalls=0`, PC raw writes 0, D1/scheduler/public writes 0. `rightsVerified=false`, `finalBasketSelected=false`, `aggregateScore=null`, `aumWeightsVerified=false`.

## R16 절차

1. R13 SHA 전수 감사가 R15의 **동일** 원본 manifest, 공유 SPY SHA에 일치하는지 확인. 불일치 시 네트워크 없이 즉시 BLOCKED.
2. 대상 9개 및 향후 합법적 후보의 유효 NY15일 중 benchmark SPY 유효 거래일 대비 실제 결측을 센다. ETF 단순 총 거래일 수와 시점별 연속성을 혼동하지 않는다.
3. 점수 산식을 다시 실행하되 기존 `scoreAdaptiveTimeline`의 계산을 변경하지 않고, 마지막 스코어가 생성되지 않는 경우 마지막 21/61/125 SPY 세션 중 누락일 수, trend/relativeStrength/volatility 각 축에 남아 있는 유효 지표 이름과 표본 수를 보고한다.
4. 최근 45일 NY15 누락 중 **해당일의 다른 시간봉은 존재하는지** 조사하여 시간 선택 문제와 전체 거래 부재를 구분한다. 원본 가격 자체는 보고서에 기록하지 않는다.
5. ORBX의 마지막 점수 9/02→10/23 결측 이유와 DIPR/WSPC 유효 NY15 40일 미달/최근 공백 원인을 설명한다. **결측을 0/과거 점수/보간 데이터로 대체 금지**. API 자동 재수집도 금지.
6. 원인이 확인되면 신규 ETF 포함·미포함/관측 재개 여부는 사용자 승인 규칙과 실제 라이선스·AUM 및 구성지표 적합성을 참고하여 별도 단계에서 판단한다. 기존 9개 운영 테마 수정 금지.

## Windows CMD

- Desktop 새 폴더에 R16 ZIP 9개 파일(8개 MJS + CMD)을 해제한다.
- `theme-space-satellite-r16-gap-forensic.cmd` 실행 → `SPACE_SATELLITE_R16_GAP_FORENSIC_RESULT.txt`를 제출한다.
- `E:\ZGmini\runtime\node.exe`로 SHA8종 확인 후 `E:\ZGmini\data` **읽기만** 한다. 외부 GET 0, raw/public/D1/scheduler writes 0.
- 이것은 **진단 단계**이며 산식·가중치·이력 데이터·사용자 ETF 바스켓·main·Cloudflare를 수정하지 않는다.

참고: [GetMarketHistory 공식 API 레퍼런스](https://getmarkethistory.com/docs/api/reference)는 1h 원시 봉 데이터와 `gap_policy=none`(공급원 결측을 그대로 반환)을 설명한다. 실제 데이터 공백을 임의로 채워서는 안 된다.
