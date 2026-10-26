# Stage04 R29 — 공식 성장률 보고서 내부 숫자 충돌 탐지 및 키워드별 속도 계측

작성일: 2026-10-26 (KST). **연구/읽기 전용**. 기존 테마·ETF 9개, 투자 산식, 운영 웹사이트, DB, 스케줄러, 주문 기능은 변경하지 않는다.

## 사용자 PC의 R28 실제 독립 검색·Ollama 측정

사용자 제출 `R28_KEYWORD_SEARCH_TIMINGS.txt`에 기록된 실측. 5개 키워드를 각각 **공식 사이트 검색 1회→개별 보고서 1회→로컬 Ollama 1회** 실행했고, 모델 구조화 결과는 당시 5/5 `PASS`였다. **R28의 PASS는 출처 본문의 숫자가 출처 자체 요약표와 정합한지 검사하지 않은 PASS**다.

| 키워드 | 공식 검색 ms | 원문 GET ms | Ollama ms | 총 ms | R28 모델 추출 % |
|---|---:|---:|---:|---:|---:|
| nuclear reactor | 6,240 | 564 | 10,446 | 17,480 | 5.5 |
| robotics and automation | 826 | 590 | 894 | 2,313 | 21.0 |
| artificial intelligence semiconductors | 463 | 344 | 699 | 1,507 | 24.8 |
| biotechnology services | 1,086 | 506 | 795 | 2,487 | 10.1 |
| data center | 770 | 455 | 871 | 2,099 | 8.2 |

- 5건 합산/평균: 총 25,886ms / **5,177ms**. 첫 키워드의 로컬 모델 준비시간 등 지연이 크므로 이를 통상 처리시간으로 단정하지 않는다.
- **첫 실행 제외 4개 평균:** 총 **2,102ms**, Ollama **815ms**. 동일 PC의 키워드별 순차 측정치이며 외부 일반 사용자의 보장 속도나 동시 처리량이 아니다.
- 실제 보고서 원문 및 키/개인 로그를 GitHub에 저장하지 않으며, 보고서의 예상 CAGR을 지난 1년의 관측 YoY로 혼용하지 않는다.

## 공식 TBRC 원문 2건에서 확인된 내부 충돌

| 전문매체 공식 키워드 보고서 | 본문 2026→2030 예상 CAGR | 보고서 속성 표의 표시 CAGR | 본문 2026→2030 규모 | 규모에서 재계산한 CAGR | R29 처리 |
|---|---:|---:|---|---:|---|
| Biotechnology Services | 12.4% | **10.1%** | 196.54→314.12 billion USD | 약 12.44% | `SOURCE_CONFLICT` |
| Data Center | 9.2% | **8.2%** | 324.25→460.61 billion USD | 약 9.17% | `SOURCE_CONFLICT` |

확인 URL:
- https://www.thebusinessresearchcompany.com/report/Biotechnology-Services-Global-Market-Report
- https://www.thebusinessresearchcompany.com/report/data-center-global-market-report

**주의:** 10.1%와 8.2%는 각각 해당 보고서의 **2025→2026 직전 기간** 성장률로도 등장한다. 그런데 아래 `Market Report Forecast Analysis` 표에서 2026→2030 전망 성장률인 것처럼 다시 표기된다. 해당 보고서의 같은 페이지 본문/표/규모 3곳이 서로 다르므로 출처 충돌로 판정한다. 본문 값이 규모 검산과 맞더라도 자동으로 '공식 승인 성장률'로 승격하지 않는다. 나머지 세 키워드는 사용자가 확인한 R28 수치와 공식 보고서의 해당 전망치가 일치하는 사례다.

## R29 읽기 전용 구현 원칙

1. `nuclear reactor`, `robotics and automation`, `artificial intelligence semiconductors`, `biotechnology services`, `data center` 5개 키워드를 **독립 순차 반복**, 매번 공식 TBRC 검색 1회, 주제가 일치하는 해당 페이지 GET 최대 1회, 로컬 Ollama 최대 1회. 재시도·자동 출처 교체·키워드 임의 축소 0회.
2. 각 키워드 전체 **20초 제한**. 검색/보고서/Ollama/총 ms, HTTP 상태, 요청·모델 생성 횟수를 그대로 기록. 하나가 실패하거나 출처 숫자가 충돌해도 다른 키워드의 실험은 계속한다.
3. 보고서 본문에서 `What Is The … Market Growth Forecast?` 전망 구절과 `Market Report Forecast Analysis`의 **2026/2030 시장규모·표기 CAGR**을 추출한다. 실제 자료에 없는 연도·수치는 채우지 않는다.
4. 동일 기간 성장률 재계산: `100 × ((2030 규모 / 2026 규모)^(1 / (2030 − 2026)) − 1)`. 원문 반올림 차이를 고려해 **0.15%p** 이내면 일치, 그보다 크면 `SOURCE_CONFLICT`. 이 0.15%p는 연구 단계의 충돌 탐지 허용 오차이며 투자 점수용 가중치가 아니다.
5. Ollama `format`은 기존 R28 JSON 스키마를 유지. **전망 본문 + 출처 표에 실제 존재하는 시작연도 시장규모**만 최대 650자로 잘라 모델에 전달하며, 사전 저장 숫자나 정답을 주입하지 않는다. 모델의 추출 성장률과 전망 연도도 원문과 대조한다.
6. 출처 충돌이 확인되면 `STATE=SOURCE_CONFLICT`, `FAILURE=SOURCE_FORECAST_VALUES_DISAGREE`, `GROWTH_PCT=NULL`. 다만 연구 감사용 `MODEL_CANDIDATE_PCT`, `FORECAST_NARRATIVE_PCT`, `FORECAST_TABLE_PCT`, `FORECAST_MATH_PCT`는 각각 별도로 기록. **해당 테마 탈락·산업 0점 적용 금지**.
7. 보고서 필수 필드 누락·페이지 포맷 변경 시 `FAILED`/`SOURCE_AUDIT_INCOMPLETE`; 20초 초과는 `KEYWORD_DEADLINE_EXCEEDED`. 어떤 실패도 별도 과거 저장자료로 대체하지 않는다. 충돌만 발생해 5개 모두 측정 완료했다면 CMD 종료코드 **2**는 예상된 출처 충돌 경고이며 스크립트 중단이 아니다.

## 파일 및 검증 경계

| 파일 | 내용 |
|---|---|
| `stage04/forecast-source-audit-r29-readonly.mjs` | 공식 페이지 내부 CAGR·시장규모 교차검산. 원문 저장 안 함 |
| `stage04/keyword-growth-speed-r29-readonly.mjs` | 5개 키워드 독립 실행·순차 기록 |
| `stage04/keyword-growth-speed-r25-readonly.mjs` | 공통 계측 로직에 선택적 `auditForecast` 추가. 이전 실행기의 기본 동작 유지 |
| `stage04/STAGE04_KEYWORD_GROWTH_R29_READONLY.cmd` | 사용자 Windows 더블클릭. 로그 파일을 같은 폴더에 생성 |
| `stage04/forecast-source-audit-r29.test.mjs` | 3개 정합·2개 충돌, 결측/반증, 5개 Ollama 독립 계측 모의 검사 |

개발 측 **21개 Stage04 테스트 파일 모두 PASS**. 테스트의 공식 보고서 본문과 Ollama 응답은 모의 입력이며, 실제 R29 Windows/PC 성능·2026-10-26 당시 보고서의 파싱 성공을 증명하지 않는다. 현 환경에서 공식 보고서 직접 네트워크 GET은 실패했고, 별도의 공개 웹 검색으로 원문을 교차확인했다.

**사용자 다음 실행:** 동봉 ZIP을 바탕화면 등 한 폴더에 압축 해제 → `STAGE04_KEYWORD_GROWTH_R29_READONLY.cmd` 더블클릭 → 그 폴더의 **`R29_KEYWORD_SEARCH_TIMINGS.txt` 제출**. PC에 작동하는 기존 로컬 Ollama와 Node가 있어야 한다. 실제 측정 종료 전까지 R29 전체 `PASS`/`SOURCE_CONFLICT` 개수를 실측 결과로 단정하지 않는다.
