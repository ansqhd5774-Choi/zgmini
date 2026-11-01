# 이란 주요 뉴스: 출처별 공개 검증 R2 (UI 브랜치 계약)

- 저장소: `ansqhd5774-Choi/zgmini`
- 작업 브랜치: `codex/ui-improvements` 전용. 다른 담당 뉴스 수집 브랜치 변경 없음.
- 목적: 기존 GOV.UK 공개 9건을 보존하며, 기사별 승인 완료 시 다른 출처도 R1 공개 데이터에 표시할 수 있게 하는 **소비자·수동 승인 입력 측** 확장.
- 실제 R26 비공개 후보 파일은 이 저장소에 없음. 이 구현은 수집된 27건의 권한 승격·D1 쓰기·점수 입력·운영 스케줄러 변경을 수행하지 않음.

## 권한 근거 (2026-10-28 확인)

| 공개 source | rightsSource | 이용 조건 | 추가 확인 |
| --- | --- | --- | --- |
| `GOV.UK` | `GOV_UK_OGL_V3` (기존) | https://www.gov.uk/help/terms-conditions | 개별 페이지의 제3자 예외 확인, 기존 OGL 표시 유지 |
| `Tasnim` | `TASNIM_CC_BY_4_0` | https://www.tasnimnews.ir/en , https://creativecommons.org/licenses/by/4.0/ | 기사 자체가 Tasnim 창작물인지 확인, 원문·라이선스·한국어 번역/요약 명시 |
| `IAEA` | `IAEA_WEBSITE_TERMS` | https://www.iaea.org/about/terms-of-use | IAEA 자체 자료인지 확인, 제3자 자료 제외·출처 표시 |
| `UN` | `UN_NEWS_NOTICE_REVIEWED` | https://www.un.org/en/about-us/copyright/ | 뉴스 자료 특례의 적용 여부와 통지 확인, 개별 뉴스 한국어 재사용 범위 검토 |
| `BBC` | `INDEPENDENT_FACTS_LINK_ONLY` | https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_31March2022english.pdf | BBC의 제목·본문·RSS 메타데이터 재게시가 아닌, 다른 출처로도 검증한 **독립 한국어 사실 요약**만 허용 |

BBC 관련 주의: 한국저작권위원회는 원문의 번역·축약이 복제 또는 2차적저작물 작성에 해당할 수 있으며 출처 표시만으로 면책되지 않는다고 안내한다: https://www.copyright.or.kr/customer-center/faq/list.do?categorycode1=02&counselfaqno=47564&pageIndex=3&portalcode=

## 추가 공개 입력 필드 (기사마다 필수)

기존 GOV.UK 승인 입력은 이전 형식 그대로 사용한다. 새로운 4개 출처의 `IRAN_NEWS_REVIEWED_INPUT_R1` 항목에는 다음 항목을 모두 포함한다.

1. 기존 `source`, `sourceUrl`, `publishedAt`, **실제 기사 기반 한국어** `title`·`summary`, 검토된 `impact`.
2. `rightsVerified:true`, `displayEligible:true`, `editorialSummaryReviewed:true`.
3. 출처별 **정확한** `rightsSource`, `rightsPolicyUrl`, `publicationMode`, ISO UTC 밀리초 `rightsReviewedAt`.
4. Tasnim·IAEA: `sourceOriginalContentVerified:true`, `adaptationNotice:'한국어 번역·요약'`, 기사 저작권자/저자에 맞는 `creatorCredit`.
5. UN: 위의 원저작물 확인·수정 표시·`creatorCredit` 외에 `newsReuseScopeReviewed:true`, 실제 통지가 확인된 `unNoticeConfirmedAt`(검토 완료 이전 또는 동일 시각).
6. BBC: `independentFactsReviewed:true`, `sourceTextReused:false`, BBC가 아닌 다른 원출처의 `corroboratingSourceUrl`. 원문 자동 번역 결과를 직접 재게시하지 않는다.

새 출처의 이름과 URL 호스트·경로는 명시한 유형만 허용한다. 입력된 권리 증명 플래그는 **독립 검토자가 생성한 승인 기록**이어야 하며, R26 비공개 수집 플래그를 기계적으로 `true`로 바꾸면 안 된다.

## 데이터 보존 및 게이트

1. `news-display-candidates-r26.json`은 기존처럼 30일 비공개 메타데이터, 권리 미검증·공개 부적격 상태를 유지한다.
2. 승인된 개별 항목만 기존 `IRAN_NEWS_REVIEWED_INPUT_R1` 형식으로 수동 작성·검증한다. `--dry-run`으로 입력 거절/접수 확인 후 필요 시 PC 운영 승인에 따라 `--apply`, `--publish` 순서로 진행한다.
3. D1 공개 키 `public:iran-progress:news:iran:r1`와 스냅샷 버전은 유지한다. 새 항목에만 출처별 검증 속성을 포함한다. 공개 리더는 이를 다시 검사하고 최근 KST 14일만 반환한다.
4. 새 항목의 카드에는 출처·원문 링크와 라이선스/사용 방식 안내를 표시한다. 기존 GOV.UK 카드는 변경하지 않는다.
5. 기사 수에 9건 제한이 없음을 27건 합성 테스트로 확인한다. **합성 테스트는 실제 27건 공개 승인이나 운영 API 결과가 아니다.**
6. 본 작업은 PC 게시 명령을 실행하지 않는다. 사용자 지정 브랜치에서의 코드 반영은 `main` 병합·Cloudflare 자동 배포와 별도이다.

## 실제 후보 공개 전 필수 입력

개별 27건의 `sourceUrl`, 원문 최초 게시일, 본문 중심성, 이용 조건 적용 범위, 제3자 자료 포함 여부, 중복 검토와 한국어 핵심 요약. UN의 통지 확인 기록, BBC 독립 사실 확인 근거도 필요하다. **권리 확인은 기사별로 하며, 단지 발행사 이름이나 URL을 표시한다고 완료되지 않는다.**
