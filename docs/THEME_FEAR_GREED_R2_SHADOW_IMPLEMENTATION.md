# 테마 ETF 공포·탐욕 R2 — 실제 데이터 검증 전 Shadow 구현

기준: [풀버전 R2 기준서 — 별도 Draft PR #598](https://github.com/ansqhd5774-Choi/zgmini/pull/598). 코드에 적용한 정책은 **검증 대상의 후보안**이다. 기존 7개 테마 R144/158/178 운영·DB·Cloudflare·스케줄러와 독립.

## 1. 구현 범위

| 구성 | 파일 | 기능 |
| --- | --- | --- |
| 계산 | `lib/market-score/theme-etf-adaptive-r2-shadow.mjs` | 저장된 ETF/SPY 종가의 기존 T/R/V 40/20/40 재계산. 252 중간순위 유지, 단축 기간은 가변 표본 `n≤252` |
| 합성 | 동일 파일 | 같은 날짜 ETF 펀드 순자산 AUM 비례 가중치. `n≥63`는 **제안 최소 표본** |
| 평가 | 동일 파일 `evaluateEtfRankStabilityR2` | 63·126개 표본으로 **가상 단축 이력**을 만들어 같은 날짜 `n=252` 점수와 비교. MAE/최대오차/50점 기준 방향 역전 수 산출 |
| PC | `scripts/pc-writer/theme-r2-shadow-readonly.cmd` | 사용자가 **직접 제공한 JSON**을 읽고 같은 폴더에 `THEME_R2_SHADOW_RESULT.json` 한 개만 기록 |
| CLI | `scripts/pc-writer/theme-r2-shadow-readonly.mjs` | 데이터 스키마 검증, 보고서 출력. Provider·DB·스케줄러·API 호출 없음 |
| 테스트 | `tests/theme-etf-adaptive-r2-shadow.test.mjs` | 188/377/628개 이력, R158과 일치, 실제 결측 보존, AUM 누락 중단, 가변 표본 평가 |

## 2. 이전 산식과의 정합성

- 126개 ETF/SPY 종가부터 125거래일 상대강도 **원시값** 생성 가능.
- 188개 종가부터 `63개 원시 지표 표본`이 완성되어 R2 **실험용 단축 점수** 생성 가능.
- 377개 종가부터 마지막 날짜의 **252관측 완성형 점수** 생성 가능.
- 628개 종가부터 **252개 날짜 모두 성숙 점수**가 가능.
- 이 조건은 산출할 수 있는 데이터량이지 **ETF 후보 자격 커트라인이 아니다**.
- 성숙 시 최근 세 거래일의 R158과 동일 ETF/SPY 가격에 대해 1e-9 이내 수치 일치 테스트.
- 실제 비교는 `63,126,252` 표본의 동일 날짜 점수 오차를 **실제 ETF 데이터**로 시험할 때 완료한다. 합성 테스트는 구현 확인일 뿐 성능 검증 증거가 아니다.

## 3. PC 입력 파일 스키마

`--input`의 파일은 사용자가 **허가된 기존 PC 원자료에서 별도로 추출한 입력**이어야 한다. 2개 이상 ETF의 같은 날짜 종가와 SPY가 필요하다. 아래는 **구조 예시**이고 거래일 2개만으로 실제 점수는 산출되지 않는다.

```json
{
  "schema": "THEME_ETF_R2_LOCAL_PRICE_AUM_INPUT_V1",
  "theme": "양자컴퓨팅",
  "benchmark": "SPY",
  "dates": ["2026-10-20", "2026-10-21"],
  "spyCloses": [123, 124],
  "etfs": [
    {
      "ticker": "QTUM", "closes": [101, 102],
      "netAssets": [
        {"date": "2026-10-20", "netAssetsAsOf": "2026-10-20", "netAssetsUSD": 1000000000, "source": "TEST_INPUT_ONLY"},
        {"date": "2026-10-21", "netAssetsAsOf": "2026-10-21", "netAssetsUSD": 1010000000, "source": "TEST_INPUT_ONLY"}
      ]
    },
    {
      "ticker": "WQTM", "closes": [51, 52],
      "netAssets": [
        {"date": "2026-10-20", "netAssetsAsOf": "2026-10-20", "netAssetsUSD": 10000000, "source": "TEST_INPUT_ONLY"},
        {"date": "2026-10-21", "netAssetsAsOf": "2026-10-21", "netAssetsUSD": 10200000, "source": "TEST_INPUT_ONLY"}
      ]
    }
  ]
}
```

### PC 실행 (원자료가 준비된 경우에만)

1. 운영 소스나 SQLite를 수정하지 않고, 먼저 위 스키마로 정리한 **실제 저장자료**의 JSON 파일을 준비한다. 임의로 데이터를 생성하지 않는다.
2. `theme-r2-shadow-readonly.cmd`에 해당 JSON 파일을 드래그하거나, Windows **CMD**에서 `theme-r2-shadow-readonly.cmd "C:\경로\입력.json"` 형식으로 실행한다.
3. `.cmd`가 있는 **바로 그 폴더**에 `THEME_R2_SHADOW_RESULT.json`이 갱신된다. 원자료·E: 데이터 경로에는 로그를 만들지 않는다.
4. 보고서의 `PRIVATE_NUMERIC_SHADOW / PRIVATE_SHADOW_INCOMPLETE`, 유효일, 결측 사유, ETF별 63/126 표본 MAE를 확인한다.

**주의**: 이는 현재 PC 원장을 자동 변환하는 도구가 아니다. 원장 스키마 및 보관권리를 실측 검증하기 전에는 자동 추출 기능을 추가하지 않는다. `QUANTUM_R2_READONLY_RESULT.json`에서는 QTUM/WQTM 종가·날짜별 AUM을 발견하지 못했으나, 제한적 탐색이었으므로 모든 PC 파일 부재를 입증한 것은 아니다.

## 4. 공개 중단 Gate

- `publicationAuthorized=false`, `upstreamCommercialRightsVerified=false`, `derivedLicenseVerified=false`, `sourcePriceReconciled=false` 고정.
- `status=PRIVATE_NUMERIC_SHADOW`라 해도 **공개 승인 아님**. 이는 입력을 바탕으로 숫자 계산만 했다는 뜻.
- ETF가 1개라도 점수 또는 같은 관측일의 펀드 순자산이 없으면 그 날짜 합성값을 `null`로 유지. ETF 하나를 100% 재가중하거나 현재 AUM을 과거로 복제하지 않음.
- 현재 공개 API의 7×252숫자 계약은 그대로 유지. R2 부분 이력/버전/품질 계약으로 분리해 승인하기 전까지 연결하지 않음.
- 단축 표본 기준 `63`의 실측 안정성이 확인되지 않으면 해당 ETF를 배제하는 대신 **점수 자체를 연구상태로 보류**한다.

## 5. 다음 실제 데이터 검증의 필요 조건

1. SPY 및 최소 2개 ETF의 동기화된 일별 ETF 가격, 최소 `188개` 실제 관측(63표본 실험), `377개` 실제 관측(완성형 대조).
2. 모든 공개 후보 날짜의 **같은 날짜 ETF 자체 펀드 순자산**과 시점/라이선스 증거.
3. 가능한 여러 테마/ETF에서 `63·126·252` 표본의 MAE·극단 점수·순위 뒤집힘·중립 상하 반전/단계전환 빈도 검증.
4. 공개용 권리·기준선 적합성·회귀 테스트·별도 사용자 승인 전 Production 전환 금지.
