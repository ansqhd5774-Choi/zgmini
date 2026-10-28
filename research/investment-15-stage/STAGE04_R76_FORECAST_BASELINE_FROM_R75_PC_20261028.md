# R76 — 시장규모 기준연도와 CAGR 전망기간 분리

기준일: 2026-10-28 KST  
고정 브랜치: `codex/investment-15-stage-m2-r25-20261025`

## R75 사용자 PC 실측

- Node v24.19, `RUN_STATE=COMPLETED`, 5/5 주제 완료, 평균 산출 0/5.
- `data center`: **Precedence PASS**(`PRIMARY_WHOLE_MARKET_SECTION`), 기존 R74 가짜 글로벌·미국 지역 CAGR 충돌 해결. 반면 **SkyQuest는 R74 PASS에서 R75 `SOURCE_CONFLICT`로 회귀**.
- SkyQuest의 `SOURCE_CONFLICT` 원인: `MULTIPLE_EXPLICIT_FORECAST_PERIODS_IN_SAME_CAGR_EXCERPT`. 공식 페이지에서 시장규모 기준연도 2025와 별도 표시된 CAGR 전망기간 2026–2033을 각각 CAGR 기간으로 읽었다.
- 다른 4개 주제는 기존 출처 접근 실패·실제 보고서 불일치·TBRC 출처 충돌이 유지됨. 출처가 확인되지 않은 CAGR은 계속 NULL.

## R76 실행 코드 수정

1. 동일 CAGR 문단에 `2026–2033`처럼 발행사가 **명시한 전망기간**이 있으면 해당 기간을 선택하고, `from USD ... in 2025 to USD ... by 2033`처럼 함께 표시된 **시장규모 기준연도쌍은 별도 CAGR 기간 충돌로 취급하지 않는다**.
2. 명시적인 기간이 전혀 없는 본문에서만 시장규모 양 끝 연도를 보조 근거로 사용한다. 서로 다른 *명시적* 기간이 두 개 이상이면 기존 `SOURCE_CONFLICT`/NULL 유지.
3. `Data Center Market Insights`처럼 `Insights`를 제목으로 쓰는 공식 전체시장 본문도 후보 선정 범위에 포함. `Regional Insights`와 세부시장 내용은 여전히 제외.
4. Ollama가 공식 전체시장 후보 중 하나를 선택하는 기존 과정, 독립 발행사 2개 이상 평균 조건, 기간이 다른 보고서의 경고, G/D/M 미적용은 변경하지 않는다.
5. `publisher_adapter_revision=R76_BASE_YEAR_FORECAST_PERIOD_DISAMBIGUATION`으로 버전 식별. CMD 출력 기본 파일명은 R72를 그대로 유지.

## 검증 범위

- 회귀: Ollama 발행사 어댑터 **20/20**, R70 평균 Gate **9/9**, R71 실행기 **3/3**, R72 안전 실행기 **3/3** = **35/35 PASS**. 전부 모의 로컬 테스트.
- 개발 호스트가 당일 직접 받은 SkyQuest 및 Precedence **공식 HTML 각각 1개**를 사용한 별도 오프라인 통합 재현: 각 글로벌 전체시장 원문에서 1개 성장률 후보만 선정되고 두 출처 평균 Gate가 통과함. 모델 응답 선택은 모의 함수이며 Windows 실제 결과를 대신하지 않는다.
- 사용자 PC R76 실측 전에는 평균 산출 성공을 주장하지 않는다. 전체 압축을 해제한 폴더에서 `STAGE04_OLLAMA_R72_RUN_AND_DIAGNOSE.cmd` 실행 후 기존 이름의 JSON/TXT를 제출한다.
- 특정 CAGR 수치를 실행 코드에 고정하지 않고, 이전 R63/R69 결과를 현재값으로 입력하지 않으며, 운영 사이트·거래·스케줄러·기존 테마 산식은 변경하지 않는다.
