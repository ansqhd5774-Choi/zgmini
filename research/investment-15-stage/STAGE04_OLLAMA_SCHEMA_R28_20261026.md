# Stage04 R28 — Windows R27 로그 검증·Ollama JSON 스키마 재실험

기준: 2026-10-26. 연구 브랜치 속도 측정 한정, 투자 산식·운영 페이지·DB·스케줄러·ETF·주문 모두 불변.

## 사용자 PC 실제 R27 5개 키워드 결과

| 키워드 | 공식 검색 ms | 보고서 조회 ms | Ollama ms | 전체 ms | 실패 |
|---|---:|---:|---:|---:|---|
| nuclear reactor | 2763 | 368 | 1288 | 4574 | `OLLAMA_WRONG_GROWTH_TYPE` |
| robotics and automation | 842 | 440 | 1276 | 2601 | 동일 |
| artificial intelligence semiconductors | 460 | 346 | 1348 | 2156 | 동일 |
| biotechnology services | 1048 | 391 | 1048 | 2491 | 동일 |
| data center | 845 | 468 | 1039 | 2354 | 동일 |

검색 5/5 HTTP 200, 공식 주제 일치 첫 보고서 5/5, 보고서 GET 5/5, Ollama 생성 호출 5/5. 내용 검증 통과는 0/5.
이전 JSON-only 모드의 `metric`이 지정된 문자열 `FORECAST_CAGR`과 일치하지 않았고, R27은 원본 Ollama 응답을 남기지 않았으므로 실제 잘못된 문자열은 미확인.

## R28 수정 및 측정 범위

Ollama 공식 문서는 `/api/generate`의 `format`이 `"json"` 또는 JSON 스키마 객체를 받는다고 안내한다:
https://docs.ollama.com/api/generate 및 https://docs.ollama.com/capabilities/structured-outputs

1. 기존 5개 키워드, 공식 TBRC 1회 검색 + 1회 보고서 GET, 각 키워드별 독립 20초 전체 제한 유지.
2. 모델 `gemma3:4b`와 localhost `/api/generate` 1회 유지. 단순 `"json"` 대신 **객체 스키마**를 전달하여 `metric`은 `FORECAST_CAGR` 하나만 허용, 네 필드는 필수 지정.
3. 모델에 명확한 출처 원문만 주고 `temperature=0`, 예측 출력 토큰 상한 120. 출력 값이 원문 CAGR 퍼센트 및 양 끝 연도에 존재하는지 **기존 엄격한 검증을 유지**. 검증 실패 시 추정치를 임의로 수용하지 않음.
4. 오류가 나도 첫 360자 **모델 JSON 응답 샘플**, 실제 Ollama 소요 ms, 종료 원인, 토큰 수를 기록. 원문 페이지 저장 없음.
5. 추가 웹 검색·전문매체 변경·재시도·산식 변경·점수 적용·배포·주문 없음.

## 사용자 PC 실측

동봉된 네 파일(CMD, R28·R25·R23 모듈)을 같은 폴더에 두고 `STAGE04_KEYWORD_GROWTH_R28_READONLY.cmd`를 더블클릭. 기존처럼 마지막 텍스트 파일 `R28_KEYWORD_SEARCH_TIMINGS.txt`를 제출한다. Dev-host 모의 Ollama 테스트는 실제 PC 모델 정합성과 별개이다.

테스트 시나리오: 5개 공식 검색 각각 스키마 전달과 PASS, 잘못된 metric 응답 감사 및 거부, 원문에 없는 숫자 거부. 실제 Windows Ollama 실측 전 PASS로 단정하지 않는다.
