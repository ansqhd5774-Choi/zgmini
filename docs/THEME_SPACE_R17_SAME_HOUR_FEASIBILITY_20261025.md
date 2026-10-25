# 우주·위성 R16 실측 완료 → R17 시간대 동시봉 검증 (읽기 전용)

2026-10-25 / `ansqhd5774-Choi/zgmini` / Draft PR #714 / 브랜치 `codex/theme-fear-greed-integration-20261025`.

## R16 실제 Windows PC 결과

- 제출 파일: `SPACE_SATELLITE_R16_GAP_FORENSIC_RESULT.txt`.
- `PHASE=ALL_CODE_SHA256_VERIFIED`, `RESULT=PRIVATE_GAP_CAUSES_AUDITED_NO_SCORE_CHANGES`.
- ETF 9개 모두 원본 manifest SHA `1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b`, 공유 SPY SHA `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e` 동일.
- 최신 SPY NY15 기준 거래일 2026-10-23; 9개 중 기존 R2 현재 **6개 개별점수 유효**, **3개 결측**. 원본·점수·스케줄러·D1·공개자료 쓰기 0, GET 0.

| ETF | 유효 NY15/SPY 일수 | 최근 45 SPY 세션 NY15 결측 | 그중 다른 시간대 실제 봉이 존재 | 최근 21/61/125 세션 기준 | 최신 점수 |
| --- | ---: | ---: | ---: | --- | --- |
| UFO | 656 | 0 | 0 | 21/61/125 | 34.88492 |
| NASA | 144 | 0 | 0 | 21/61/125 | 48.90703 |
| WARP | 118 | 0 | 0 | 21/61/118 | 60.52650 |
| ORBX | 130 | 3 | **3** | 20/58/121 | **결측**, 9/02 최종 과거 점수 66.99047 |
| MARS | 162 | 0 | 0 | 21/61/125 | 47.76741 |
| ARKX | 706 | 0 | 0 | 21/61/125 | 31.69048 |
| ROKT | 446 | 1 | **1** | 21/60/124 | 44.09211 |
| DIPR | 28 | 41 | **26** | 1/7/28 | **결측**, 40일 미만 |
| WSPC | 15 | 38 | **21** | 4/10/15 | **결측**, 40일 미만 |

- ORBX NY15 누락: 2026-09-03, 09-14, 10-02. **ETF 가격 자체가 없는 날이라고 오판해서는 안 됨**. 최근 21/61/125일의 연속 구간 공백으로 기존 R2 trend/relativeStrength/volatility 현재 지표가 모두 비었음. 10/23 NY15 ETF 봉은 실제 존재.
- ROKT 9/02만 최근 45일의 NY15 누락. 기존 R2는 남은 실측 지표로 정상 점수를 산출하므로 **모든 지표 100% 일치/무결을 점수 요건으로 추가 금지**.
- DIPR/WSPC도 15시 봉 누락이 많지만 다른 시간대 봉의 존재만으로 **기존 승인 15시 동일 가격 프록시**를 바꿀 수 없음.
- UFO 초기 역사에 결측 50일, ROKT 과거에 결측 256일 존재. 최신 점수가 존재한다고 과거 전 기간 100% 연속으로 보고하지 않음.

## R17 — 실제 same-hour ETF/SPY 대체 가능성 **진단만**

1. R13 원본 SHA 재감사 + R16과 동일 manifest/공유 SPY SHA 검증. 불일치 시 `BLOCKED`.
2. 모든 9개 ETF와 SPY의 실제 비갭 시간봉을 NY 날짜/시간으로 정렬. R188 기존 15시/조기폐장 12시 선택 **변경 없음**.
3. 기존 NY15 결측일에 **ETF와 SPY 모두 실제 관측된 같은 시간**을 가진 날짜를 `14시→13시→12시→11시→10시` 순으로 조사(공식 조기폐장일에는 11/10시). 한쪽만 있을 때는 대체 가능일로 오인하지 않음.
4. 복구 가능/불가능 **날짜 수**와 최근 21/61/125 거래일 결측 현황을 보고. 이 계산은 **가상 관측 가능성일 뿐**, 기존 점수 산식 입력·실제 R2 점수·공개 252일 차트를 바꾸지 않음.
5. NY14와 NY15 모두 같은 날 존재하는 **실측 paired sample**에 한해 ETF 단독 가격 변화, ETF/SPY 상대가격 변화율의 절대값 중위/90분위/최대를 집계. 원시 종가·매매 내역·API 키는 출력하지 않음. **관측 비율 차이는 점수 오차와 동일하지 않으며**, 사용자 승인 없는 대체/가중치 조정 금지.
6. 모든 9개 후보를 확인하고 **ETF 조합 개수 상한을 두지 않음**. N<40은 기존 R2 점수 결측으로 유지; 가상 대체 가능 40일 이상도 승인된 실점수로 간주하지 않음.

## 사용자 PC CMD 작업

- `SPACE_SATELLITE_R17_HOUR_COVERAGE_DESKTOP_20261025.zip`의 8개 MJS + 1개 CMD를 **Desktop 같은 폴더**에 압축 해제.
- `theme-space-satellite-r17-hour-coverage.cmd` 실행.
- 같은 폴더에 생성되는 `SPACE_SATELLITE_R17_HOUR_COVERAGE_RESULT.txt`만 업로드.
- PC 경로 `E:\ZGmini\runtime\node.exe`, 원본 `E:\ZGmini\data`는 **읽기만** 한다. 로그는 Desktop CMD 옆에만 쓴다. 네트워크·원본가격·산식·DB·D1·스케줄러·Cloudflare/main/9개 운영 테마 변경 **0**.
- R17 결과를 확인한 다음에만 실제 가격모드 변경 가능성과 외부 공급원 자체 결측/권리 근거를 분리해 의사결정한다. 승인 전 PR #714 Draft 및 발행 권리 `false` 유지.

공식 참고: [GetMarketHistory API](https://getmarkethistory.com/docs/api/reference) `gap_policy=none`은 공급원 결측을 생성하지 않음. [NYSE 거래시간](https://www.nyse.com/trade/trading-information) 정규장은 뉴욕시각 09:30–16:00. 14시 프록시는 15시 프록시의 동일값이 아님.
