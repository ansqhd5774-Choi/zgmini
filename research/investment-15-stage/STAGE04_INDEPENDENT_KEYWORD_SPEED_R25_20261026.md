# Stage04 R25 — 개별 키워드 시장 성장률 검색·Ollama 속도 시험

기준일: 2026-10-26 · 연구용 개발 브랜치. ZGMINI 운영 데이터·산식·주문 변경 없음.

## 사용자가 확정한 시험 방식

- 조사 매체: **The Business Research Company**. 시장 성장률 보고서를 주제별로 발행하는 전문 매체다.
- 검색 엔진: Bing 공개 RSS 검색 결과를 키워드별 1회 요청. `site:thebusinessresearchcompany.com/report/` 범위로 한정해 해당 매체 보고서 **단 한 개**를 선택한다. URL·제목 매칭이 맞지 않으면 즉시 실패한다.
- 독립 시험 키워드: `nuclear reactor`, `robotics and automation`, `artificial intelligence semiconductors`, `biotechnology services`, `data center`.
- **각 키워드마다** 검색 시작→성장률이 포함된 짧은 문장 추출→Ollama `gemma3:4b` 생성까지 각각 새 요청 및 시간 측정. 성장률 수치(CAGR)는 과거 YoY가 아니라 **보고서의 미래 예상 연평균성장률**로 표시한다.
- RSS 검색 결과 설명에 두 연도와 CAGR이 있으면 본문 페이지 요청은 **0회**. 부족하면 선택한 동일 매체 보고서 주소 **1회만** 요청하고 짧은 문장을 추출한다. 검색 결과를 넓게 순회하거나 실패한 출처로 재시도·자동 대체하지 않는다.
- 각 키워드 총 20초 제한(검색·선택 보고서 조회·로컬 Ollama). 초과/403/검색결과 없음/문장 없음/모델 실패 시 `FAILED`와 실패 사유를 기록하고 다음 키워드에 독립적으로 진행. 임의 데이터 보충·0점 치환 없음.
- 읽은 웹 페이지 전체, 원문 본문, 개인 데이터·API 키는 **저장하지 않는다**. 로그에는 URL, 단계별 소요 초, 검증된 숫자, 실패 사유만 기록한다.

## 구동과 출력

- 파일 3개를 같은 폴더에 해제: `STAGE04_KEYWORD_GROWTH_R25_READONLY.cmd`, `keyword-growth-speed-r25-readonly.mjs`, `market-growth-ollama-r23-readonly.mjs`.
- Windows 사용자 PC에서 Ollama 서버와 `gemma3:4b`가 가동 중인 상태로 CMD **더블클릭**. 모델 변경이 필요하면 명령줄 첫 번째 인자로 전달한다.
- 같은 CMD 폴더에 `R25_KEYWORD_SEARCH_TIMINGS.txt` 생성/순차 덮어쓰기. `SEARCH_MS`, `REPORT_MS`, `OLLAMA_MS`, `TOTAL_MS`와 `SEARCH_S`, `REPORT_S`, `OLLAMA_S`, `TOTAL_S`, `STATE`, `FAILURE`를 개별 키워드마다 기록한다. 모델이 답한 CAGR/전망기간은 실제 짧은 원문에 존재하는 값인지 검증한다.
- 사용자 제공 R24 PC 실측: **로컬 Ollama 2,227ms**, 전체 2,291ms, 예시만 사용. 이것은 **R25의 5개 실제 검색 속도가 아니다**.

## 검증 수준과 제약

- Node 로컬 모의 HTTPS 및 Ollama 응답 시험: R25 **7/7** 통과, 기존 R23/R24 검증 **8/8**, Stage04 전체 **17개 테스트 파일 모두 통과**. Windows PC의 실제 Bing RSS 접근성, 매체 HTTP 응답, 개별 5개 키워드의 실측 소요시간은 **사용자 CMD 결과 수신 전까지 미확인**이다.
- 매체 약관은 개인 이용과 저작권 보호를 명시한다(https://www.thebusinessresearchcompany.com/terms-and-conditions). 이번 연구용 단기 읽기 시험은 공개 재배포·상업 수집 권한 확보를 뜻하지 않는다. 상용 ZGMINI 투입·상업적 공개·원문 복제는 허용하지 않는다.
- RSS 검색은 공식 데이터 API 계약이 아니므로 검색 결과가 없거나 차단될 수 있다. 실패 시 다른 매체나 검색 엔진으로 몰래 우회하지 않는다.
- 본 연구는 실제 시장 성장률 비교·투자 판단이 아니다. G/D/M 산식과 기업 점수·순위·거래 연결은 전부 미승인이다.
