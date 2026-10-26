# R23: 전문 성장률 매체 한 곳 → 짧은 숫자 문단 → 로컬 Ollama 소요 시간 측정

작성일: 2026-10-26. 범위: 04단계 **읽기 전용 성능 시험**. 서비스·산식·DB·스케줄러·거래/주문 변경 없음.

## 사용자 정정에 따라 축소한 실행 경로

1. 시장 성장 전망 수치가 요약된 **전문 매체 한 곳**을 지정한다: **Fortune Business Insights**.
2. 첫 시험 질의 주제는 `nuclear power`(원자력). 검증용 대표 시장 보고서 주소 1개를 사용한다: `https://www.fortunebusinessinsights.com/industry-reports/nuclear-power-market-100734`.
3. 자료 조회는 한 번만 한다. 해당 주소의 HTML 스트림에서 `CAGR`와 연도, 해당 시장명이 함께 등장하는 **최대 650글자의 일부 구절**을 얻는 즉시 본문 읽기를 중단한다. 전체 기사·전 세계 사이트·관련 페이지를 순회하거나 본문 전체를 Ollama에 주지 않는다.
4. Windows PC에서 이미 구동 중인 로컬 Ollama의 기존 일반 텍스트 모델을 사용하여 **이 구절에서 수치/성장률 유형/기간만** JSON으로 추출한다. 모델을 설치하거나 결제를 시작하지 않는다.
5. 게시 매체 조회 시간 `PUBLISHER_MS`, Ollama 모델 조회+추출 실제 시간 `OLLAMA_MS`, Ollama API 자체 처리 시간 `OLLAMA_REPORTED_MS`, 전체 `TOTAL_MS`를 분리하여 출력한다.

## 시간·실패 기준

- **한 시험 전체 20,000ms**: 한 타이머로 매체 HTTP/본문 처리·모델 목록 조회·Ollama 생성까지 제한한다.
- 매체 조회 1회·모델 생성 최대 1회. 시간 초과·자료 없음·HTTP 오류·모델 없음·JSON 불량은 실패 상태로 명시. 재시도·타 매체 자동 전환 없음.
- 페이지/모델에서 원문에 없는 수치·연도를 만들어도 거절한다. `FORECAST_CAGR`은 미래 예상 연평균 성장률이며 **실제 연간 성장률(YoY)이 아니다**. 따라서 이 결과를 곧바로 성장 점수 G에 넣을 수 없다.
- 원문·HTML·기업 기밀·개인 자격 증명은 파일/DB에 저장하지 않는다. 출력 로그에는 사이트 주소, 주제, 모델명, 소요 시간, 뽑힌 최소 정량 필드, 오류만 남긴다.
- 연구용 수동 1회 시험이다. 공급원 이용권·자동 재공개 권리는 아직 확인되지 않았으므로 운영 스케줄러/저장/공개에 연결하지 않는다.

## 사용자 Windows CMD 실행법

1. 이 개발 브랜치 `research/investment-15-stage/stage04/` 폴더의 아래 두 파일을 **같은 폴더에** 내려받는다.
   - `STAGE04_OLLAMA_GROWTH_R23_READONLY.cmd`
   - `market-growth-ollama-r23-readonly.mjs`
2. 평소처럼 PC의 Ollama가 켜진 상태에서 CMD 파일을 실행한다. 모델이 여러 개면 CMD에서 `STAGE04_OLLAMA_GROWTH_R23_READONLY.cmd "실제 모델명"` 형식으로 지정할 수 있다.
3. 동일 폴더에 생성되는 `R23_OLLAMA_GROWTH_RESULT.txt`의 `STATE`, `PUBLISHER_MS`, `OLLAMA_MS`, `OLLAMA_REPORTED_MS`, `TOTAL_MS`, `FAILURE`를 확인한다.

## 실제 검증 상태

- 개발 코드 모의 입력 테스트: **5/5 통과**(요약 범위, 잘못된 수치 거절, 1회 호출 및 시간 측정, HTTP 실패, 공통 시간 초과).
- 개발 실행 호스트에는 `ollama` 실행 파일이 없고 외부 HTTP 프록시도 연결되지 않아 **실제 사용자 PC의 Ollama 실행 시간 미측정**. 시뮬레이션 테스트 통과 시간을 실제 독해 속도로 보고하지 않는다.
- 최종 목표인 "검색 키워드만 넣어 전문 매체 결과를 바로 읽기"를 9개/100개 주제에 연결하기 전에 **이 한 주제에서 Ollama 시간부터 실측**한다. 현재 소스 선택은 R23 **속도 시험용 1개 대표 주소**이지 범용 주제 검색 구현/권리 승인 완료가 아니다.

출처: Fortune Business Insights Nuclear Power Market (2026-09-21 갱신); Ollama 공식 `/api/generate` 응답 메타데이터 정의.
