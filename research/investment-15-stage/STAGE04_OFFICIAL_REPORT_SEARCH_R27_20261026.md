# Stage04 R27 — 전문매체 공식 키워드 검색 5건 독립 실측

기준: 2026-10-26 · 개발 브랜치의 읽기 전용 산업 성장률 조사 속도 실험. 운영 ZGMINI 연동 없음.

## R26 원인 확인

- 사용자의 Windows R26에서 Bing RSS 검색 **5/5 `SEARCH_NO_MATCHED_PUBLISHER_REPORT`**. 모두 HTTP 200·RSS 항목 10건이었지만, 첫 검색 결과는 ChatGPT/네이버/유튜브/넥슨/다음 등 전혀 다른 도메인. 전문매체 보고서 링크 **5개 전부 0건**. 검색 합계 1,034ms, 로컬 Ollama 생성 0회.
- Bing RSS 방식은 이 실험에서 **폐기**. 쿼리 추가 완화나 무차별 재시도 대신 해당 전문매체의 공식 검색 화면을 직접 확인함.

## 확인된 공식 검색 절차

- 전문 성장률 매체: [The Business Research Company](https://www.thebusinessresearchcompany.com/search).
- 매체 공개 검색 UI가 사용하는 GET 주소: `https://www.thebusinessresearchcompany.com/global-market-reports?search=<키워드>` (공개 검색 화면 JavaScript에서 링크 형식을 확인하고 실제 응답 재검증).
- 한 키워드당 해당 GET **1회** → 서버 렌더링된 보고서 카드 `<h4><a href="/report/...">`에서 해당 키워드 단어가 모두 맞는 **첫 링크 1개** → 같은 매체 보고서 GET **1회** → 최대 650자 CAGR 구절만 로컬 Ollama **1회** 전달. 20초 상한은 키워드 전체에 적용.
- 다른 검색엔진·매체 자동 대체, 동작 실패 시 반복 요청, 문서 본문 영구 저장, 미확인 데이터의 투자 점수 치환 없음.

## 5개 키워드 실제 웹 조회 확인

아래 숫자는 **개발 호스트의 공식 웹 검색/보고서 GET 실측**이며, Ollama는 **모의 JSON 응답**으로 처리·검증 흐름만 시험했다. 사용자 PC의 실 Ollama 시간은 **아직 미측정**.

| 키워드 | 공식 검색 | 보고서 GET | 합계(모의 모델 포함) | 전문매체 공표 예상 CAGR | 결과 |
|---|---:|---:|---:|---:|---|
| nuclear reactor | 446ms | 494ms | 945ms | 5.5% | PASS |
| robotics and automation | 439ms | 522ms | 964ms | 21.0% | PASS |
| artificial intelligence semiconductors | 476ms | 395ms | 873ms | 24.8% | PASS |
| biotechnology services | 718ms | 488ms | 1,207ms | 10.1% | PASS |
| data center | 489ms | 467ms | 959ms | 8.2% | PASS |

선택된 보고서 주소:

1. https://www.thebusinessresearchcompany.com/report/nuclear-reactor-global-market-report
2. https://www.thebusinessresearchcompany.com/report/robotics-and-automation-market-global-report
3. https://www.thebusinessresearchcompany.com/report/artificial-intelligence-ai-semiconductors-market-report
4. https://www.thebusinessresearchcompany.com/report/Biotechnology-Services-Global-Market-Report
5. https://www.thebusinessresearchcompany.com/report/data-center-global-market-report

이 CAGR은 **2026→2030 전망치**로, 특정 산업의 관측 연간 실적 YoY나 투자 수익률이 아니다. 매체의 예상 시장 정의 차이도 그대로 유지하며 5개 수치로 종합 G/D/M을 계산하지 않는다.

## Windows R27 독립 실측 방법

- `STAGE04_KEYWORD_GROWTH_R27_READONLY.cmd`, `keyword-growth-speed-r27-readonly.mjs`, `keyword-growth-speed-r25-readonly.mjs`, `market-growth-ollama-r23-readonly.mjs` **4개 파일을 같은 폴더**에 둔다.
- Windows에서 Ollama 서버·`gemma3:4b`가 켜져 있을 때 CMD 더블클릭. 결과는 같은 폴더 `R27_KEYWORD_SEARCH_TIMINGS.txt`에 키워드마다 갱신.
- 각 키워드의 `SEARCH_MS`, `REPORT_MS`, `OLLAMA_MS`, `TOTAL_MS`, 선택 URL, 원문 검증 예상 CAGR/기간, 실패 사유를 모두 기록한다. 사용자 PC 실측을 받기 전 모든 성능 수치를 PASS로 발표하지 않는다.
- 이 코드는 연구용 속도 시험이며, 매체의 웹 약관이 상업적 복제·재배포·파생 공개권을 보장하지 않는다. 공식 API/상용 배포 자료원이 확정된 것은 아니다.

## 검증

- 모의 HTTP 및 Ollama 5개 개별 통합 경로와 잘못된 주제 제외 테스트 R27 **3/3 통과**.
- Stage04 전체 **19개 테스트 파일 통과**(모의 테스트, 실 Ollama 속도 결과와 구분).
- 개발 호스트 실제 TBRC 검색 및 보고서 5/5 GET/성장률 추출 성공. **실제 Ollama 모델 성능은 Windows 실행 결과 필요**.
