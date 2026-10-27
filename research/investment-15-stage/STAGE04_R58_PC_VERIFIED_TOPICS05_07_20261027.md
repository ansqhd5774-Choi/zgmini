# ZGMINI Stage04 — ⑤ 금융 · ⑥ 유틸리티 · ⑦ 헬스케어 조사 검증

검증일: 2026-10-27 · GitHub 브랜치: `codex/investment-15-stage-m2-r25-20261025`

## 총괄

- R56 PC 실험에서 세 주제의 실행이 실제로 중첩되었으며, 3개 주제 모두
  예열 후 실측 3회에서 결과 시그니처가 반복됐다.
- 최초 R56 조사 매체 관측은 ⑤ 3/3, ⑥ 2/3, ⑦ 3/3이었다.
- 빠졌던 ⑥ TBRC는 R57에서 원문 숫자 검증 성공, Ollama 범위 `UNRELATED`로 보류.
- **R58 PC 후속 실험에서는 ⑥ TBRC 원문 성장률 6.1%와 Ollama 선택 성장률 6.1%가
  예열 1회와 실측 3회 모두 일치하고**, 범위 분류 `DIRECT`, 후보 `C0`도
  네 차례 일치했다.
- 따라서 **R56 8건과 별도 R58 후속 1건을 합친 총 9개 출처의 수치 관측은 확보**되었다.
  이것은 **3개 주제·9개 보고서의 동시 3회 풀 커버리지 재실행**을 뜻하지 않는다.
- `sector_cagr=null` 유지. 서로 다른 시장 범위·전망 기간을 동등한 GICS 섹터
  전망치로 평균하거나 자동 승격한 결과가 아니다.

## R58 PC 핵심 지표

| 회차 | 구분 | 전체 ms | 원문 검증 | CAGR 원문 / Ollama | 모델 분류 | 상태 |
|---|---|---:|---|---|---|---|
| 1 | 예열 | 1637 | `NARRATIVE_VERIFIED_METADATA_CONFLICT` | 6.1 / 6.1 | `DIRECT` `C0` | `BROAD_SCOPE_REVIEW_REQUIRED` |
| 2 | 실측 | 842 | 동일 | 6.1 / 6.1 | `DIRECT` `C0` | 동일 |
| 3 | 실측 | 912 | 동일 | 6.1 / 6.1 | `DIRECT` `C0` | 동일 |
| 4 | 실측 | 994 | 동일 | 6.1 / 6.1 | `DIRECT` `C0` | 동일 |

측정 중앙값 912ms, 속도 편차 9.0%,
`gate=SOURCE_AND_MODEL_REPEATABLE_SCOPE_REVIEW`,
`source_repeatable=true`, `model_repeatable=true`.
대상은 **TBRC Utilities 공식 URL 1개뿐**이며 다른 8개 매체와
BRI·검색엔진·DB·프로덕션에는 접근하지 않았다.

## 반복 관측된 9개 보고서

| 주제 | 매체 | 보고서 시장 | 미래 CAGR | 전망 기간 | 관측 경로 |
|---|---|---|---:|---|---|
| ⑤ 금융 | TBRC | Financial Services 광범위 시장 | 7.3% | 2026–2030 | R56 |
| ⑤ 금융 | SkyQuest | Retail Banking | 6.7% | 2026–2033 | R56 |
| ⑤ 금융 | Precedence | Retail Banking | 6.0% | 2026–2035 | R56 |
| ⑥ 유틸리티 | TBRC | Utilities 광범위 시장 | 6.1% | 2026–2030 | R58 별도 검증 |
| ⑥ 유틸리티 | SkyQuest | Electricity T&D | 4.4% | 2026–2033 | R56 |
| ⑥ 유틸리티 | Precedence | Power T&D | 3.91% | 2026–2034 | R56 |
| ⑦ 헬스케어 | TBRC | Healthcare Services | 4.9% | 2026–2030 | R56 |
| ⑦ 헬스케어 | SkyQuest | Healthcare Services | 7.42% | 2026–2033 | R56 |
| ⑦ 헬스케어 | Precedence | Hospital Services | 5.84% | 2026–2035 | R56 |

## 잔여 검토: 수치와 시장 범위

R58 TBRC Utilities는 본문에 **2026년 $7,411.11bn → 2030년 $9,392.75bn,
CAGR 6.1%**를 표기하며, 계산상 6.103%이다.
과거 **2025년 $7,022.70bn → 2026년 $7,411.11bn**의 계산은 5.531%,
본문의 과거 CAGR 5.5%와 일치한다.

그러나 보고서 하단 표는 **2035년 $9,392.75bn, CAGR 5.5%**로 적어
미래 본문과 양립하지 않는다. R58 감사 상태
`NARRATIVE_VERIFIED_METADATA_CONFLICT`는 이러한 불일치가 **여전히
남아 있음을 명시적으로 보존**한다.

Ollama가 R58에서 4/4 `DIRECT`를 선택한 것은 모델의 분류 기록이다.
이는 보고서 정의와 GICS 유틸리티 섹터 정의가 검증됐다는 뜻이 아니다.
기존 `BROAD_UTILITIES_REVIEW` 상태와 `sector_cagr=null`을 유지한다.

## 공식 자료 링크

- TBRC Financial Services: https://www.thebusinessresearchcompany.com/report/financial-services-global-market-report
- SkyQuest Retail Banking: https://www.skyquestt.com/report/retail-banking-market
- Precedence Retail Banking: https://www.precedenceresearch.com/retail-banking-market
- TBRC Utilities: https://www.thebusinessresearchcompany.com/report/utilities-global-market-report
- SkyQuest Electricity T&D: https://www.skyquestt.com/report/electricity-transmission-and-distribution-market
- Precedence Power T&D: https://www.precedenceresearch.com/power-transmission-and-distribution-market
- TBRC Healthcare Services: https://www.thebusinessresearchcompany.com/report/healthcare-service-global-market-report
- SkyQuest Healthcare Services: https://www.skyquestt.com/report/healthcare-services-market
- Precedence Hospital Services: https://www.precedenceresearch.com/hospital-services-market

현재 완료된 작업은 **조사·검증 단계**이다. 평균 산식 확정, 원본 외부 보고서
수정, 유료 접근, 사이트 적용 또는 배포는 하지 않았다.
