# Stage04 R34 — 1회 조회 기반 공식 색인 보완 실험 (2026-10-26)

## 실측 R33 인수

- 입력: `R33_ALL_SECTOR_THEME_GROWTH_RESULT.txt` (2026-10-26, 사용자 Windows CMD)
- 조사 대상 21개(섹터 11, 테마 10), 정상 추출 13개, 미해결 8개.
- TBRC 21회 평균 1,246ms. 2차 GVR 8회 평균 206ms, 3차 Mordor 8회 평균 167ms,
  4차 Fortune 8회 평균 179ms.
- 후속 3개 매체는 모두 `SEARCH_NO_DIRECT_MARKET_REPORT`로 종료:
  24회 검색, **보고서 GET 0회, Ollama 호출 0회**. 낮은 응답시간은 추출 성공이 아님.
- 미해결: 정보기술, 커뮤니케이션, 임의소비재, 유틸리티, 에너지,
  필수소비재, 핀테크, 사이버보안.
- TBRC에서 성공한 13개는 후속 조회하지 않는다.

## 원인과 실증

1. Bing RSS는 실제 확인한 `fintech market` 제한 검색에 해당 매체 보고서를 반환하지 않았다.
   실제 RSS 한 건에서 전혀 다른 도메인의 스포츠 결과까지 확인.
2. Fortune 공식 `https://www.fortunebusinessinsights.com/fintech-market-108641`에는
   2026~2034년 글로벌 FinTech **18.20% CAGR**이 게시되어 있다. 2~4차 실패는
   자료 부재와 검색기의 발견 실패를 구분해야 한다.
3. GVR 공식 `https://www.grandviewresearch.com/sitemap.xml`은
   `https://www.grandviewresearch.com/reports.xml`을 공개한다. 보고서 2.5MB 색인에서
   `/industry-analysis/cyber-security-market`를 직접 확인.
4. Mordor는 공식 `robots.txt`에서 `/static/sitemap.xml`을 공개하지만 하위 색인이
   여러 개라 단일 조회로 전체 주제를 찾아내는 수단으로 검증되지 않음.
5. Fortune 공개 `robots.txt`의 `/sitemap1.xml`은 확인 환경에서 홈페이지로 이동했고,
   `/search/*`는 robots에서 제외되어 자동조사 검색 경로로 채택하지 않는다.

## R34 제한 보존 및 변경점

- 1차 TBRC: R33 그대로, 1회 공식 검색, 보고서 최대 1회, Ollama 최대 1회.
- 2차 GVR: **21건 전체 중 첫 미해결에서 공식 `reports.xml` 한 번 조회 후 메모리 재사용**.
  전체 시장과 URL 주제명이 정확히 일치하는 보고서만 최대 1회 GET. 하위시장 배제.
- 3차 Mordor: 키워드로 결정되는 공식 `/<industry-reports>/<slug>-market` 주소
  1회 GET, 제목이 전체 시장에 직접 일치할 때만 1회 Ollama. 404면 즉시 다음 단계.
- 4차 Fortune: R33 RSS 경로는 임시 **진단용**으로 유지. 실제 자동화 검색에 필요한
  공식 색인/사용 허용 경로는 미확인; 이 단계의 성공률 개선은 주장하지 않는다.
- 공급처별 5초 제한, 같은 공급처 재검색/재시도 0회, 최종 누락 `NULL`.
- 단일 조사 결과 파일은 CMD 옆 `R34_ALL_SECTOR_THEME_GROWTH_RESULT.txt`.
- R34는 연구 전용. 프로덕션 `main`·배포·산식·DB·스케줄러·투자점수·주문 변경 없음.

## 합격 판정

- R34 코드/모의 테스트 통과와 별개로, Windows CMD 실측 결과를 확인하기 전까지
  R34 실제 추출 성공률/평균 시간은 `NOT_VERIFIED`.
- 성공 수치가 있어도 `FORECAST_CAGR`은 발행사의 해당 *시장 전망치*이며
  GICS 섹터 자체의 성장률 또는 ETF 테마의 실제 성장률과 동일시하지 않는다.
- 공식 보고서 직접 일치·기간·출처 검증 실패 시 수치를 추정하거나 생성하지 않는다.

## 확인한 매체 원문

- GVR: https://www.grandviewresearch.com/industry-analysis/cyber-security-market
- Fortune: https://www.fortunebusinessinsights.com/fintech-market-108641
- Mordor: https://www.mordorintelligence.com/industry-reports/cyber-security-market
