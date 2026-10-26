# Stage04 R30 — R29 PC 로그 검증 후 전망기간은 공식 보고서에서, CAGR만 Ollama에서 추출

기준일 2026-10-26 (KST). **읽기 전용 연구·키워드별 응답시간 시험**. ZGMINI 운영 서비스, 승인 9개 테마·ETF, 투자 산식·점수, DB, 스케줄러, 매매 및 배포에는 연결하지 않는다.

## 사용자가 제출한 R29 Windows 실제 로그

5개 키워드 각각 공식 The Business Research Company 검색 HTTP 200 1회, 보고서 GET 1회, 로컬 Ollama `gemma3:4b` 1회를 실행. 전 키워드 20초 제한을 지켰으나, **모델이 모두 `period_start=2030`, `period_end=2030`을 반환해 최종 5/5 `FAILED/OLLAMA_PERIOD_NOT_IN_SOURCE`**. 출처 본문/속성표의 3중 감사 자체는 성공했다.

| 키워드 | 검색 ms | 보고서 ms | Ollama ms | 총 ms | 모델 CAGR % | 출처 검사 |
|---|---:|---:|---:|---:|---:|---|
| nuclear reactor | 2,025 | 569 | 1,453 | 4,220 | 5.5 | `CONSISTENT` |
| robotics and automation | 548 | 419 | 685 | 1,654 | 21.0 | `CONSISTENT` |
| artificial intelligence semiconductors | 392 | 321 | 667 | 1,381 | 24.8 | `CONSISTENT` |
| biotechnology services | 873 | 397 | 722 | 1,993 | 12.4 | `SOURCE_CONFLICT` |
| data center | 649 | 364 | 663 | 1,698 | 9.2 | `SOURCE_CONFLICT` |

5건 합산 10,946ms, 평균 2,189ms. **첫 실행 제외 4건 총시간 평균 1,682ms**, Ollama 시간 평균 **684ms**. PC 네트워크/모델 설정과 첫 실행 준비 지연에 따라 달라질 수 있다. 원문 보고서 전체나 사용자 PC 원본 로그는 Git에 게시하지 않는다.

## 원인 확인

출처의 `Market Report Forecast Analysis`에는 `Market Size Value In 2026`와 `Revenue Forecast In 2030`가 명시되며 2026→2030 기간은 **모델 추측 없이** 원문에서 결정 가능하다. R29의 4개 필드(`growth_pct`,`metric`,`period_start`,`period_end`) 응답에서는 현 PC Ollama가 **성장률은 올바르게 읽고 연도만 2030/2030으로 잘못 채웠다**. 해당 모델이 잘못된 연도를 냈다고 2026을 임의 추정하는 대신, 독립적으로 이미 검증한 출처 속성표 연도만 사용하는 것이 합당하다.

공식 사이트에서 별도로 재확인한 예시:
- Biotechnology Services: 2026 `$196.54bn`→2030 `$314.12bn`, 본문 전망 CAGR **12.4%**, 메타 속성표 표기 CAGR **10.1%**. https://www.thebusinessresearchcompany.com/report/Biotechnology-Services-Global-Market-Report
- Data Center: 2026 `$324.25bn`→2030 `$460.61bn`, 본문 전망 CAGR **9.2%**, 속성표 **8.2%**. https://www.thebusinessresearchcompany.com/report/data-center-global-market-report

## R30의 엄격한 역할 분리

1. 같은 5개 키워드 독립 순차 실험. 각각 TBRC 공식 검색 최대 1회, 일치하는 공식 보고서 최대 1회, 로컬 Ollama 최대 1회. **재시도 0·출처 자동 교체 0**, 각각 20초 제한, 키워드별 시간/횟수/실패 사유 기록.
2. **출처 처리기**는 R29 그대로. 전망 본문 CAGR, 보고서 전망 속성표 CAGR, 2026/2030 원시장규모 수학 검산. 충돌이 있거나 보고서 필드가 누락되면 성장률을 운영 수치로 허용하지 않는다. 유효 전망 시작·종료연도는 출처 속성표의 실제 추출값만 사용한다. 연도를 코드에 고정하지 않는다.
3. **Ollama**는 JSON 스키마를 두 필드로 제한: `growth_pct` 숫자와 `metric=FORECAST_CAGR`. 예측 시작/종료연도를 묻지 않으며 사용하지 않는다. 전송하는 문장은 여전히 공식 보고서의 전망 구절과 실제 시작연도 규모 최대 650자. 로컬 모델에는 원문이 없는 예측값·미리 저장한 답을 보내지 않는다.
4. 모델 응답의 필드 개수·형태·숫자 범위·정확한 `FORECAST_CAGR`·원문에 명시된 전망 퍼센트 일치를 **실행코드에서 별도 재검증**. 모델이 원문에 없는 숫자/역사 YoY/임의 응답을 내면 실패 처리. 스키마만 믿고 승인하지 않는다.
5. 출처 3중 감사와 모델 값이 모두 합당하고 출처 일치 시 `PASS`, `PERIOD_SOURCE=PUBLISHER_FORECAST_ATTRIBUTES`로 표시. **공식 보고서 자체에서 충돌**하면 `SOURCE_CONFLICT`, `GROWTH_PCT=NULL`; `MODEL_CANDIDATE_PCT`와 공식 본문·표·규모 역산 CAGR은 감사용으로만 기록한다. 충돌이 있는 테마를 탈락시키거나 0점 부여하지 않는다.
6. `SOURCE_CONFLICT`만 2건 포함된 시험은 `EXIT_CODE=2`로 경고 종료할 수 있으며 이는 테스트 코드 실패가 아니다. 나머지 키워드는 계속 시험한다.

공식 스키마 사용 지침: https://docs.ollama.com/capabilities/structured-outputs

## 코드/검증 및 다음 실측

- `stage04/keyword-growth-speed-r25-readonly.mjs`: 기존 실행기와 호환되는 신규 **선택적** `rateOnlyFromSource` 옵션. R25~R29 기본값은 `false`로 불변. R30에서만 공식 출처기간 고정 + Ollama 전망 CAGR 2개 필드 검증.
- `stage04/keyword-growth-speed-r30-readonly.mjs`, `stage04/STAGE04_KEYWORD_GROWTH_R30_READONLY.cmd`: 5개 키워드 순차 계측 및 동일 폴더의 `R30_KEYWORD_SEARCH_TIMINGS.txt` 생성.
- `stage04/keyword-growth-speed-r30.test.mjs`: 3개 정합 PASS+2개 출처 충돌을 모의하는 5건 독립 모의 HTTP/모델 테스트, 잘못된 성장률 거부, 과거 모드 보존 확인.
- **Stage04 전체 22개 테스트 파일 PASS**. 이는 모의 검증이며 실제 Windows R30 실행 결과는 아니다.

Windows 사용자는 R30 ZIP의 5개 파일을 **동일 폴더**에 풀고 `STAGE04_KEYWORD_GROWTH_R30_READONLY.cmd`를 더블클릭한다. 마지막 생성된 `R30_KEYWORD_SEARCH_TIMINGS.txt`를 제출하면 **실제** 검색/본문/모델 소요시간과 3개 PASS·2개 충돌 여부를 검산할 수 있다.

## 추가: 사용자 Windows R30 실측 확인 (2026-10-26)

사용자가 CMD로 실행한 `R30_KEYWORD_SEARCH_TIMINGS.txt`를 검토했다. 원본 로그는 사용자 보관 자료이며, 공개 GitHub에는 다음 **최소 시간·판정 요약**만 기록한다.

| 키워드 | 검색 ms | 본문 GET ms | Ollama ms | 전체 ms | 상태 | CAGR 적용값 |
|---|---:|---:|---:|---:|---|---:|
| nuclear reactor | 402 | 488 | 1,048 | 1,946 | `PASS` | 5.5% |
| robotics and automation | 332 | 545 | 572 | 1,451 | `PASS` | 21.0% |
| artificial intelligence semiconductors | 362 | 606 | 502 | 1,473 | `PASS` | 24.8% |
| biotechnology services | 510 | 585 | 1,570 | 2,667 | `SOURCE_CONFLICT` | NULL |
| data center | 380 | 590 | 467 | 1,441 | `SOURCE_CONFLICT` | NULL |

- **공식 매체 검색 5/5 HTTP 200, 본문 GET 5/5, Ollama 응답 5/5.** 이전 R29 모델 기간 오류 **0건**. R30의 공식 자료 기간 `2026→2030` 표시 3개 정상, 충돌 2개의 공식 기간은 감사 필드로만 보존.
- R30 실행 결과 **3 `PASS` + 2 `SOURCE_CONFLICT`**, 실패/데드라인 0건. 출처 충돌 2개는 `GROWTH_PCT=NULL`, `FAILURE=SOURCE_FORECAST_VALUES_DISAGREE`인 의도된 보류 판정이다.
- 총 소요 합계 **8,978ms**, 5개 평균 **1,796ms**. 첫 실행 제외 4개 총 소요 평균 **1,758ms**, Ollama만 평균 **778ms**. 성능은 PC/네트워크에 따라 바뀐다.
- 바이오 서비스 전망 본문/시장규모 산술 **12.4/12.437%**와 표 **10.1%**, 데이터센터 본문/시장규모 산술 **9.2/9.173%**와 표 **8.2%**가 여전히 불일치. 테마 및 성장률 미보유를 0점/실패로 해석하지 않는다.
- **실측 완료 사항은 공식 문서 조회·처리 지연·Ollama 전망률 추출·출처 내부 충돌 판정뿐**이다. 전문매체의 전망 CAGR이 실제 관측 산업 YoY/수익성/G/D/M/투자순위가 된 것은 아니다. 사용권/라이선스의 상업적 파생 공개 승인도 확인하지 않았으므로 서비스 투입은 계속 금지한다.

차기 변경은 사용자 정책 판단 후: `SOURCE_CONFLICT` 2건을 계속 NULL 유지할지, 같은 보고서의 시장규모 역산과 전망 본문이 일치하는 경우에 한해 별도 `RESOLVED_BY_MATH` 등급을 두고 연구용 임시치로만 사용할지 **승인 전 결정하지 않는다**.
