# ZGMINI 투자 4단계 R33 — 4개 매체 순차 보완 조사 (연구 전용)

2026-10-26 | `STAGE04_ALL_SECTOR_THEME_R33_READONLY.cmd`

## 적용 범위

- 기존 ZGMINI 공개 API에서 섹터 11개와 테마 10개를 **실행 시 재조회**한다. 카테고리·ETF·점수는 변경하지 않는다.
- 1차 TBRC 직접 시장 제목 검사(R32) → 2차 Grand View Research → 3차 Mordor Intelligence → 4차 Fortune Business Insights.
- 1차 통과 시 종료. 실패 항목만 2차로 이동하며, 이후 단계도 동일하다. 이미 성공한 항목은 다른 출처를 검색하지 않는다.
- 매체별 **검색 요청 최대 1회 / 게시사 보고서 GET 최대 1회 / Ollama 분석 최대 1회 / 동일 매체 재시도 0회**.
- 2~4차 검색은 Bing RSS의 해당 게시사 사이트 범위로 1회 제한한다. 직접 게시사 URL만 허용하고, 제목에서 시장 주제가 **검색 대상과 직접 일치**해야 한다.
- 시장보고서 제목과 HTML H1이 해당 시장을 가리켜야 한다. 시계열 **예측 기간 2년 이상**이 CAGR 인근에 인쇄돼 있어야 한다. Ollama가 같은 숫자를 정확히 추출해야 PASS.
- 하위 시장만 대표 전체 시장으로 오인하지 않는다. 예: `Aerospace Cyber Security Market` ≠ `Cyber Security Market`; `Fintech Blockchain` ≠ `Fintech`.
- 매체별 하드 타임아웃 **5초**, 키워드당 최대 4회·이론상 20초. **목표 평균 1.5초 내외는 미실측**이며 Windows PC 결과에서 매체별 평균을 별도로 보고한다.
- 신뢰할 만한 전망 CAGR이 끝까지 없으면 `NULL`; 0점·탈락·가짜 성장률을 생성하지 않는다.

## 출력

같은 폴더의 `R33_ALL_SECTOR_THEME_GROWTH_RESULT.txt`에 **매 항목이 끝날 때마다** 누적 저장한다.

매체마다 다음 기록을 보존한다:

- 선택/실패 매체, 접근 URL, 단계별 검색·보고서·Ollama 횟수
- `SEARCH_MS`, `REPORT_MS`, `OLLAMA_MS`, `TOTAL_MS`
- 성장률, 메트릭 `FORECAST_CAGR`, 시작·종료 연도, 산업 범위, 실패 사유
- 네 매체 각각 실제 호출 횟수와 실행 평균시간

## 검증 상태 및 명확한 한계

- 구현물과 단위/모의 네트워크 테스트는 연구 전용. `node --test research/investment-15-stage/stage04/*.test.mjs` 테스트를 실행해 확인한다.
- **사용자 Windows+Ollama 환경 R33 실데이터 측정은 아직 진행하지 않았다.** 따라서 성공 개수·2~4차 평균속도를 완료 수치처럼 주장하지 않는다.
- 전망 시장 CAGR은 시장조사업체 추정치다. ETF 전체 섹터/테마의 실현 성장률이나 4단계 최종 `G/G1/G2/D/M` 점수가 아니다.
- 특히 11개 GICS 광역 섹터와 2개 산업 결합 테마는 개별 시장 전망만으로 전체 성장을 대표할 수 없다. `scope=RESEARCH_PROXY_*`를 보존한다.
- 뉴스·공식 보고서 데이터를 사이트에 재게시하는 이용권은 확인되지 않았으며, R33은 개인 조사·속도 측정으로만 사용한다.
- DB, 산식, Cloudflare, Cron, 투자주문, 다른 Stage에는 영향이 없다.

## 의존 파일

CMD와 다음 모듈이 **모두 같은 폴더**에 있어야 한다.

- `keyword-growth-all-r33-readonly.mjs`
- `keyword-growth-fallback-r33-readonly.mjs`
- `keyword-growth-speed-r25-readonly.mjs`
- `market-growth-ollama-r23-readonly.mjs`
- `forecast-source-audit-r29-readonly.mjs`
- `stage04-all-universe-r31.mjs`

실제 의존성은 R33 → R25/R33-fallback → R23/R29 및 R31-universe이며 기존 R31/R32는 수정하지 않는다.

## 수동 실행

압축을 Desktop 임의의 폴더에 푼 다음 `STAGE04_ALL_SECTOR_THEME_R33_READONLY.cmd`를 더블클릭한다. 작업은 조회·텍스트 저장뿐이다. 종료 후 동일 폴더의 `R33_ALL_SECTOR_THEME_GROWTH_RESULT.txt`를 공유한다.
