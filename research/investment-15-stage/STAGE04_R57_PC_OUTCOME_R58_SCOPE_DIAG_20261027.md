# Stage04 R57 PC 기록 분석 및 R58 범위판단 분리 — 2026-10-27

## PC 실측값

R57 원본 3개 파일(`.txt`, `.json`, `_HISTORY.ndjson`)에 따르면
`status=FINISHED_RESEARCH_ONLY`, `gate=UTILITIES_SINGLE_SOURCE_INCOMPLETE_REVIEW`이다.

| 회차 | 총시간(ms) | 원문 검산 | Ollama 범위 | 최종 상태 |
|---|---:|---|---|---|
| 1 (예열) | 1818 | `NARRATIVE_VERIFIED_METADATA_CONFLICT` | `UNRELATED` | `MODEL_UNCONFIRMED` |
| 2 | 1003 | 동일 | `UNRELATED` | `MODEL_UNCONFIRMED` |
| 3 | 1094 | 동일 | `UNRELATED` | `MODEL_UNCONFIRMED` |
| 4 | 1308 | 동일 | `UNRELATED` | `MODEL_UNCONFIRMED` |

측정 중앙값 1094ms, 편차 19.6%. 원문 GET 및 Ollama 추론 모두 응답을 받았다.
소스 결과 4/4 일치:

- 현재 문서의 미래 본문 6.1%, 2026→2030 역산 6.103%.
- 2025→2026 역산 5.531%, 역사 본문 5.5%.
- 2026년 $7411.11 billion, 2030년 $9392.75 billion.
- 보고서 하단 메타데이터에는 같은 금액을 2035년 및 5.5%로 표기.
- 원문 메타데이터 불일치(`TABLE_2035_ENDPOINT_AND_HISTORIC_RATE_CONTRADICT_VERIFIED_2030_FORECAST`)를 정상 처리로 덮지 않았다.

원문: https://www.thebusinessresearchcompany.com/report/utilities-global-market-report

## 원인과 조치

R57 코드는 Ollama가 `DIRECT` 또는 `PROXY`가 아닌 경우
별도로 확인된 TBRC 본문 CAGR까지 `observed_cagr=null`로 표시했다.
이 때문에 **출처 수치 유효성**과 **Ollama의 범위 판정**이 혼합됐다.

R58은 두 채널을 분리하고, 모델의 `candidate_id`와 `scope`를 모두 노출한다.
분리된 수치를 GICS 섹터 확정값이나 평균 산식으로 자동 승격하지 않는다.
원문 모순도 그대로 유지한다.

현재 R58은 로컬 가상원문 테스트를 통과했지만 실제 PC 실행은 아직 없다.
후속 PC 결과가 와야 모델의 변경된 판단을 확인할 수 있다.
