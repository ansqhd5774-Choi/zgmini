# 4단계 R86 — R82 성장률 수집 완료 후 정량 입력 연결 및 선정 Gate

기준일: 2026-10-29 KST. 기존 `codex/investment-15-stage-m2-r25-20261025` 브랜치에서만 작업.

## 이번에 실제 구현·실행한 범위

- 사용자 Windows R82 결과 JSON에 기록된 최신 **21개(11섹터·10테마)** 조사기관별 CAGR을 새로 수집하지 않고 그대로 읽는다.
- 이전 R85 검산기를 이용하여 `COMPLETED`, 21개, 각 주제 서로 다른 공식 발행사 2개 이상, 21개 평균 재계산, 신선한 모델/GET 실행 기록을 검사한다.
- `m2/m2-live-feeds.mjs`의 **기존 공개 API GET·공탐 날짜 선택기**를 재사용한다. 대상은 `https://zgmini.kr/api/fear-greed`, `/api/sector-fear-greed`, `/api/theme-fear-greed` 세 곳이다. 기존 API 산식, 웹페이지, DB·Cloudflare·스케줄러는 수정하지 않는다.
- 개별 공탐의 원관측일과 확정·잠정을 유지한다. 성장률 집계일을 공탐 관측일로 대체하지 않는다.
- 전체 시장 `market_score`와 전체 시장 `market_fear_greed`를 **서로 독립된 필드**로 출력한다. `/api/fear-greed`는 시장 공탐일 뿐 별도 Stage01 시장 점수는 아니므로 전자는 미연결 `NULL`이다.
- 11개 섹터 F/전망 CAGR, 10개 테마 F/전망 CAGR을 독립 열로 출력한다. 기존 R67의 Stage03 승인 9개 테마와 우주·위성 연구 전용 1개를 구분한다.
- 4단계 R2의 `G1/G2/G/D/M` **가중치는 제안 상태이며 실측 시계열 표본도 부족하므로, 승인된 최종 M4·순위·선정 테마는 NULL**로 보존한다. 사용자가 승인하지 않은 점수, 합산식, 컷오프, 주관적 AI 강점/약점 평가를 구현하지 않는다.
- 실행은 읽기 전용이다. 거래·선정 승격은 `NO_TRADE` / `UNRANKED_REVIEW` / `next_stage_allowed=false`.

## 실제 원본 API + 사용자 R82 실행

입력: 사용자가 업로드한 `R72_OLLAMA_FORECAST_PIPELINE_RESULT(20261029-051446).json`.

실행 명령 (브랜치 루트 기준):

```bash
node research/investment-15-stage/stage04/stage04-r86-numeric-bridge.mjs \
  --r82 "R72_OLLAMA_FORECAST_PIPELINE_RESULT.json" \
  --json STAGE04_R86_NUMERIC.json \
  --md STAGE04_R86_NUMERIC.md
```

실제 공개 API 조회 결과는 다음과 같았다. **이 값은 2026-10-29 실행 당시의 관측값이지 고정 숫자가 아니다.**

| 항목 | 관측 상태 |
|---|---|
| R82 유효 성장률 평균 | 21/21, 출처 58 유효/5 미수집 |
| 전체 시장 공탐 F | 35.828571점, 2026-10-29 관측 |
| 섹터 공탐 F | 11/11, 2026-10-28 관측 |
| 테마 공탐 F | 10/10, 테마별 2026-10-26 또는 28일 관측 |
| 별도 전체 시장 점수 | 미연결 NULL |
| G1/G2/M4 및 확정 테마 | 자료/가중치 승인 대기 NULL |

공탐은 전체 시장과 날짜가 다르므로 동일 시점인 척하지 않는다. 테마 10개의 2026-10-29 최신 F가 확보됐다고 말하지 않는다.

## Windows PC CMD 실행법

기존 브랜치의 `research/investment-15-stage/stage04/STAGE04_R86_COMBINE_R82_AND_LIVE_F.cmd`를 사용한다.

1. 기존 PC R82 결과 JSON `R72_OLLAMA_FORECAST_PIPELINE_RESULT.json`을 CMD 파일 옆에 복사하거나, JSON 파일을 CMD로 끌어다 놓는다.
2. Node.js가 있는 PC에서 CMD 실행. 새 Ollama 호출·CAGR 재조사는 **하지 않는다**.
3. 같은 폴더에 `STAGE04_R86_NUMERIC_...json`과 `...md`가 저장되며 `SEND_R86_JSON` / `SEND_R86_MD` 출력 경로를 보관한다.
4. `R86_FINAL_M4_NOT_AUTOMATICALLY_ASSIGNED=TRUE`는 오작동이 아니라 기존 승인 Gate에 따른 정상 상태다.

## 다음 *실제* 개발 Gate

1. 기존 1단계의 **별도 시장 점수 출력** 위치·스키마를 확인해 이 브리지의 `market.market_score`에 붙인다. CNN 공탐을 시장 점수로 복사하는 것은 금지.
2. 같은 정의의 연차 산업 지표 실측 성장률·가속도·과거 백분위 자료가 확보되는지 검증한다. R82의 전망 CAGR을 G1/G2 실현 성장으로 자동 대체하지 않는다.
3. R2 60/40 및 70/30 제안 가중치와 최소 표본·결측·선정 개수는 사용자 **최종 승인 여부를 먼저 확인**한다. 무승인 M4 계산·발표 금지.
4. 승인된 공식과 실측값이 모두 유효할 때만 `M4`·기계적 순위를 산출하고, 사용자 최종 테마 확정 후 다음 단계에 전달한다.

회귀 검증은 `stage04/stage04-r86-numeric-bridge.test.mjs`로 재현한다. 유닛 테스트 통과와 실시간 연결 성공은 따로 보고한다.
