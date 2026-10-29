# R45-A — 신규 뉴스 매체 4곳 공개 자료 사전검사 (2026-10-29 KST)

## 판정 범위
R45 계획에서 승인한 Reuters, Associated Press(AP), Arab News, Anadolu Agency의 공개 기사 존재, 발행일 확인, 관련 키워드를 웹 공개 결과로 조사했다. **이는 PC Node 수집기 HTTP 응답·RSS 파싱·D1 저장 성공 시험이 아니다.** 출처를 운영 활성화하지 않았으며 기존 7개 출처·R41 39행·14일 공개 35건 기준선은 변경하지 않는다. 신규 브랜치 없음.

## 출처별 검증 표
| sourceId | 기사 원문·확인 자료 | 발행일 | 1차/2차 주제 예시 | 공개 웹 내용 확인 | 자동 수집기 확정 |
| --- | --- | --- | --- | --- | --- |
| reuters | https://www.reuters.com/world/asia-pacific/qatari-mediators-present-iran-with-new-deal-end-war-official-says-2026-10-28/ | 2026-10-28 (뉴스 검색 인덱스 기준) | Iran / negotiations, war | 뉴스 결과 존재; 직접 원문 GET은 캐시 오류 | **미검증** |
| ap | https://apnews.com/article/c7df622f1e87de6035173be8fb8c4add | 2026-10-29 (뉴스 검색 인덱스 기준) | Iran / war, ceasefire, diplomacy | 뉴스 결과 존재; 직접 원문 GET은 캐시 오류 | **미검증** |
| arabnews | https://www.arabnews.com/saudi-arabia/saudi-kuwaiti-foreign-ministers-discuss-houthi-attacks-de-escalation-efforts-in-riyadh-3008699 | 원문 2026-10-28 14:41; 수정 17:42 | Houthi/Saudi / de-escalation | 제목·원문 본문·발행일 확인 | **미검증** |
| anadolu | https://mobil.aa.com.tr/en/world/senior-turkish-saudi-pakistani-officials-to-visit-iran-for-security-talks/4100729 | 원문 2026-10-26 | Iran/Saudi / talks | 제목·원문 본문·발행일 확인 | **미검증** |

- Anadolu 공식 중동 목록: https://www.aa.com.tr/en/middle-east
- Anadolu 사이트가 연결하는 RSS: https://www.aa.com.tr/en/rss/default?cat=live ; 공개 웹 탐색에서 application/xml로 확인했으나 RSS 엔트리 파싱 및 기간 내 기사 발견은 아직 시험하지 않음.
- AP/Reuters의 뉴스 검색 인덱스 결과는 출처 기사 존재를 뒷받침하지만, HTTP 200·공식 최초 발행 시각·본문 파서의 성공 증거가 아니다.
- Arab News는 기사에 최초 게시 시각과 수정 시각이 함께 표기되어 최초 게시 시각을 채택해야 한다.
- 모든 수집 필터는 기존 사용자 승인 **1차 이란/후티/사우디/예멘 OR, 2차 전쟁/합의/휴전/협상/진전 OR**. 단, 영문 표현의 정확한 매칭·원문 재조회는 수집기 실측에서 검증하며 임의 감정·중요도 필터는 추가하지 않는다.

## R45-A 결과와 최소 다음 실행
- **확인 완료:** 4개 매체 관련 기사 사례 존재, Arab News·Anadolu 본문/날짜 읽기 가능(웹 인터페이스 관측).
- **미완료:** 4개 매체 공식 피드/목록에서 날짜 기준 자동 기사 탐색, PC와 동등한 Node HTTP 성공, 원문 파서의 발행일·본문 확인, 실제 14일 적격 건수, 사용 조건.
- **다음:** 전용 브랜치 소스의 R26/R40 수집 경로를 확인하고, read-only 네 매체 probe를 구현한다. 각 매체에서 후보 최소 1건의 공식 목록 발견 → 실제 원문 HTTP 및 date/body → 두 단계 키워드 → 최근 14일 검증 결과를 저장한다. 개별 SOURCE_FAILED는 나머지를 막지 않는다. 실패를 임의 우회하지 않는다.
- **운영 상태:** SOURCE_RESEARCH_PARTIAL, PC_RUNTIME_UNVERIFIED, D1_UNCHANGED, PRODUCTION_UNCHANGED.
