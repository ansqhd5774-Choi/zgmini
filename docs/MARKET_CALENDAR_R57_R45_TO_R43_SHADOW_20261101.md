# Market Calendar R57 — R45 PC 저장본 → R43 ★★★ 오프라인 연결 (2026-11-01)

## 상태 및 변경 범위

- 상태: **작업 브랜치 코드·합성 회귀검사 준비**. PC 운영 설치, 21개 실거래일 확보, 기업별 산출, 공개 ★등급 변경은 **미실행/미검증**.
- 지정 작업 브랜치: `codex/zgmini-gpt-workspace-20261025`; GitHub `main` 병합·배포 없음.
- 파일: `scripts/pc-writer/market-calendar-r57-r45-offline-r43.mjs` 및 `tests/market-calendar-r57-r45-offline-r43.test.mjs`.
- 기존 R56 FIX1이 사용자 PC에 설치한 R45 수동 관측 경로를 **읽기 전용**으로 소비한다. Core 5분 주기, B1 수집·파서, DB, 게시 흐름, API 호출은 변경하지 않는다.
- R43의 승인 전 탐색용 앙상블 가중치(1차 77.3%, 102/132와 후속 비교)는 **변경하지 않는다**. 해당 이전 실험 수치는 500종목 참고 비교이고 실거래 R57 일치율을 의미하지 않는다.

## 입력 자료

1. PC 승인 저장 경로 내 `market-calendar-r45-marketparquet/stock_daily_YYYY-MM-DD.json` 21개: **최신 1일 + 그 이전 20개 서로 다른 관측일**. R45의 원본 SHA256, `PC_PRIVATE_ONLY`, `SPLIT_ADJUSTED`, `sourceContract`, `MARKETPARQUET_FREE_SAMPLE` 및 `redistribution:false`를 검사한다. 데이터가 부족하거나 훼손되면 BLOCKED.
2. PC 승인 저장 경로의 **검토 완료한 기업 목록** `local-market-calendar-r43-reviewed-issuers.json`. 운영상의 실제 전체 평가 모집단을 대표해야 하며, 단순 실적 이벤트 목록·B1 503종목 목록·임의 티커 500개를 대체물로 쓰지 않는다. 중국 본사 기업/OTC 등은 사람 또는 승인 근거로 선행 검토하여 `eligible:false`로 명시한다.

목록 검토 기준일은 최신 R45 관측일보다 미래일 수 없고 90일 넘게 오래되어서도 안 된다. 이는 자동으로 발행사 소재지와 이용권을 확인한다는 뜻이 아니다.

검토 기업 목록의 예상 구조(숫자/명단은 예시이며 승인 자료를 생성·확정한 것은 아님):

```json
{
  "version": 1,
  "method": "R57_REVIEWED_ISSUER_MEMBERSHIP_R1",
  "universeReviewed": true,
  "reviewedAsOf": "2026-10-31",
  "marketCapApiUsed": false,
  "permissionForDerivedScores": true,
  "expectedEligibleIssuers": 2634,
  "fundamentalsVerified": false,
  "members": [
    {"ticker":"GOOG","issuerId":"ALPHABET","eligible":true},
    {"ticker":"GOOGL","issuerId":"ALPHABET","eligible":true},
    {"ticker":"BABA","eligible":false}
  ]
}
```

이 예시의 `members` 배열은 불완전하므로 실제 사용 시 모집단 확보율 검사를 통과하지 않는다. `fundamentalsVerified:true`로 명시한 경우에 한해 승인 자료로 확인한 `dividendYield`, `eps`, `epsGrowthPct`를 개별 종목에 입력할 수 있다. 출처·이용권·기업 소재지 적격성은 파일에 boolean을 썼다는 이유만으로 자동 승인되지 않는다.

## 계산과 안전 제한

| R43 입력 | R57 산출 근거 |
| --- | --- |
| 가격, 거래량, 일일 거래대금 | R45 당일 `close`, `volume`, `close × volume` |
| 상대 거래량 | R45 직전 20관측일 **각 거래량의 실제 평균** 대비 당일 거래량 |
| 등락률 | 당일과 전일 종가의 실제 변화율 |
| 기업 동일성, 예외/제외 | 검토 완료된 기업 목록과 기존 R43 `r43IssuerKey` (GOOG/GOOGL, BRK-A/BRK.B 등) |
| 배당, EPS, EPS 성장 | 별도로 검증된 값이 없으면 **null 유지**. 중립 백분위수로만 처리하며 값을 추정하지 않는다. |

- 최신 자료 7일 이내, 21개 관측일이 최대 60일 이내, 기업 수 98% 이상, 가격·거래량 98% 이상, 상대 거래량 90% 이상을 기존 R43 안전 기준으로 확인한다. 부족하면 점수를 발표하지 않는다.
- `buildR57R43Shadow()`는 메모리에서만 `READY_SHADOW`와 rankings 또는 `BLOCKED`를 반환한다. 단독 CLI 실행 시 **요약만 표준출력** 한다. 전체 티커·원자료를 출력하지 않는다.
- 특히 **`local-market-calendar-r43-ranked.json`은 생성하지 않는다**. 기존 게시 reader가 이를 사용하므로, R57 후보를 그 경로에 기록하면 사용자 승인 전 공개 ★★★가 변경될 수 있다.
- 라이브 수집 호출 0, 신규 공급자 API 0, DB 쓰기 0, PC 파일 쓰기 0, 스케줄 변경 0, 강제 수집 0, main 배포 0.

## 남은 검증

1. 기존 Core 정규 실행에서 R45 실제로 **21개 일별 보관본**이 쌓이는지, 수동 재수집 없이 확인할 수 있을 때 확인한다. 첫 설치만으로 21일 확보를 추정하지 않는다.
2. 전체 적격 기업 목록과 기업별 중복/중국 본사/OTC/ADR 기준의 실제 승인 자료를 식별한다. 기존 503개 B1 목록이나 비승인 출처를 전체 모집단으로 바꾸지 않는다.
3. R57 **shadow 결과**를 이전 참조 상위 132개 명단과 비교하여 일치율·누락 기업·민감도를 보고한다. 77.3%(102/132)는 과거 500개 예비 실험이고 이 검증의 목표 보증치가 아니다.
4. 이용권·입력 범위·정규 결과가 승인된 이후에만 **별도 승인**으로 공개 반영을 설계한다. 무단 공개 등급 변경 금지.

검사: `node --test tests/market-calendar-r57-r45-offline-r43.test.mjs`.
