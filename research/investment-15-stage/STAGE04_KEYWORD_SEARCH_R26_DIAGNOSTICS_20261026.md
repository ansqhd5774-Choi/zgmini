# Stage04 R26 — R25 검색 미매칭 5건 진단 및 다음 실측

2026-10-26 · ZGMINI 연구 개발 브랜치. 운영 산식·DB·API·스케줄러·주문 변경 없음.

## 사용자 Windows R25 로그에서 확정한 사실

| 개별 검색어 | SEARCH_MS | TOTAL_MS | 상태 | Ollama 생성 |
|---|---:|---:|---|---:|
| nuclear reactor | 1,847 | 1,917 | SEARCH_NO_MATCHED_PUBLISHER_REPORT | 0 |
| robotics and automation | 234 | 356 | SEARCH_NO_MATCHED_PUBLISHER_REPORT | 0 |
| artificial intelligence semiconductors | 306 | 307 | SEARCH_NO_MATCHED_PUBLISHER_REPORT | 0 |
| biotechnology services | 168 | 168 | SEARCH_NO_MATCHED_PUBLISHER_REPORT | 0 |
| data center | 165 | 165 | SEARCH_NO_MATCHED_PUBLISHER_REPORT | 0 |
| **합계** | **2,720** | **2,913** | **5/5 미매칭** | **0** |

- Bing RSS 검색에 대한 요청은 각 1회 진행됐고 타임아웃이나 HTTP 403이 기록되지는 않았다.
- 검색 결과가 **정말 0건인지**, 결과가 있으나 **전문매체 링크/제목 매칭이 전부 탈락했는지**는 R25 로그로 확인할 수 없다. R25 코드가 RSS 원본·후보 개수를 기록하지 않았기 때문이다. 단순히 매체가 존재하지 않는다고 판정하면 안 된다.
- 실제 보고서는 외부 검색에서 별도로 발견된다. 예시: [nuclear power plant](https://www.thebusinessresearchcompany.com/report/nuclear-power-plant-global-market-report), [robot](https://www.thebusinessresearchcompany.com/report/robot-global-market-report). 이 사실만으로 사용자 PC Bing RSS 검색이 정상이라고 결론 내릴 수 없다.

## R26 수정 범위

1. Bing RSS **검색어의 과도한 제한만 완화**: `site:.../report/`, 따옴표, `2026 2030` 동시 강제를 제거. 각 주제별 `thebusinessresearchcompany <keyword> global market report` 한 요청. `and` 접속사는 제거하되 다른 토큰은 유지.
2. **매체 변경 없음**. RSS 후보에서 `https://thebusinessresearchcompany.com/report/...` 도메인/경로와 키워드 제목을 모두 확인한 **최초 1건만** 선택. 상세 보고서 본문 조회는 필요할 때만 1회. Ollama도 키워드당 최대 1회. 실패 시 다른 검색 엔진/매체/보고서 자동 대체 없음.
3. 개별 출력에 `SEARCH_HTTP_STATUS`, `RSS_ITEMS`, `PUBLISHER_INDEX_LINKS`, `TITLE_MATCHED_LINKS`, `INDEXED_SAMPLE`(선두 3건의 도메인·제목만) 추가. 이 값으로 **검색 0건 / 다른 도메인 / 키워드 제목 불일치**를 다음 한 번의 PC 실행에서 구분한다.
4. 각 키워드 20초 전체 제한 유지. `SEARCH_MS`, `REPORT_MS`, `OLLAMA_MS`, `TOTAL_MS`와 초 단위 변환, 실패값 NULL 유지. 원문·복수 검색 결과 본문/프로필/비밀번호 저장 금지.
5. 별도 `R26_KEYWORD_SEARCH_TIMINGS.txt`를 CMD 파일과 같은 위치에 생성하여 R25 로그를 보존한다.

## 검증 및 종료 조건

- R26 모의 테스트 **3/3**, 기존 R25 모의 테스트 **7/7**, Stage04 전체 **18개 테스트 파일 통과**. Windows PC 실검색과 Ollama 실측은 **R26 결과 수신 전까지 미확인**.
- Bing RSS 검색이 200이더라도 `RSS_ITEMS=0`이면 **색인/검색어 문제**, `RSS_ITEMS>0`, `PUBLISHER_INDEX_LINKS=0`이면 **공급원 링크 미출현/검색 결과 URL 형식 문제**, 매체 링크가 있는데 `TITLE_MATCHED_LINKS=0`이면 **주제 제목 선별 문제**로 분류한다.
- 모든 키워드가 여전히 실패해도 무차별 크롤링, 반복 재시도, 상업적 재사용권 미확인 자료의 ZGMINI 공개 연결은 진행하지 않는다. 다음 실측의 상세 진단값을 본 뒤 사용자에게 근거 중심 후속안을 보고한다.
