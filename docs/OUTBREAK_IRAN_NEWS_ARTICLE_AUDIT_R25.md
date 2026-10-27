# 이란 아웃브레이크 뉴스 수집 전담 — 출처별 원문·발행일 검사 R25

- 작업일: 2026-10-27 UTC
- 작업 이력: R24 후보 수집기를 기반으로 개발한 초기 임시 R25 작업을 2026-10-27에 R23·R24와 함께 전용 `codex/outbreak-iran-news-retention-r1-20261026` 브랜치로 선별 통합했다. 후속 변경도 해당 전용 브랜치에서만 진행하며 타 작업자 변경은 보존한다.
- 목표: 피드에 있는 후보 링크와 **원문 기사**의 접근성·출처·최초 발행일 증거·이란 관련성을 분리 검사한다. 무허가 기사를 공개하지 않는다.
- 작업 제외: 번역, 카드 디자인, 공개 API, D1, PC SQLite, Windows 작업 등록, R3 산식·원장, 새로운 비용 유발 서비스.

## 1. 검사 절차

1. 기존 R24의 7개 출처·10개 피드에서 URL을 추출한다. GOV.UK 키워드는 Iran/Saudi/Yemen/Houthi 4종이다. 현재는 **각 피드가 제공하는 첫 페이지·목록 범위**만 읽는다.
2. 후보를 출처별 순환 순서로 검사해 특정 매체가 처리 예산을 독점하지 않게 한다. 검사 기본 상한은 70건, 최대 병렬 4건이다.
3. 허용된 공식 호스트와 HTTPS만 읽고, HTTP 3xx는 임의 추적하지 않는다. UN RSS의 `/feed/view/en/story/` 공식 경로만 `/en/story/`로 정규화한다.
4. GOV.UK는 `https://www.gov.uk/api/content/<base_path>`의 `first_published_at`와 `details.body`를 검사한다. `public_updated_at`·Atom 수정일을 최초 발행일로 대체하지 않는다.
5. BBC·Tasnim·UN 등은 개별 원문의 `Article`/`NewsArticle`/`ReportageNewsArticle` JSON-LD나 `article:published_time` 등 **발행사 게시 메타데이터**를 읽는다. 시간대가 없는 날짜는 실제 최초 발행 시각으로 간주하지 않는다.
6. 제목에 관련 키워드가 등장한다는 이유만으로 본문을 통과시키지 않는다. 구조화된 `articleBody`, 기사 내부 본문 `<p>`, UN 전용 스토리 본문 블록의 **본문 텍스트만** 확인한다. HTML이나 본문 전문은 결과 JSON에 저장하지 않는다. 주제 판정은 기존 R1에서 승인된 **Iran / Saudi / Yemen / Houthi 중 하나 이상(OR)** 을 동일 함수로 검사한다.
7. 최초 발행일 기준 30일 이내이고, 제목·본문 및 4개 주제 중 하나 이상의 관련성이 확인된 건은 `ARTICLE_METADATA_REVIEWED`로 둔다. 이는 검토용이지 자동 게시 허가는 아니다.
8. 영상 링크는 `VIDEO_REQUIRES_SEPARATE_REVIEW`로 분리한다. HTML 영상 페이지를 정상 기사 본문으로 둔갑시키지 않는다.

## 2. 2026-10-27 실측 — 피드 후보 54건 전량 검사

- 수집 점검 시각: 2026-10-27 11:29:46 UTC 부근.
- 실행 방식: 공개 HTTPS에 대한 `curl` GET 응답을 R24/R25 검사기에 전달한 **읽기 전용 실측**. 이 실행 환경의 기본 Node `fetch`는 외부 연결에 실패했으므로 `--probe`의 직접 Node 네트워크 성공으로 주장하지 않는다.
- 피드 10개 읽기 성공, 출처 실패 0, 신규 발견 후보 54개.
- 후보 54개 전부 분류, 기사 URL 요청 50건, 영상 4건 별도 분류, 미검사 0, 기사 접근 실패 0.
- 초기 R25 검사기의 이란 직접 관련성 규칙으로 본문·발행사 발행일·30일 창을 충족한 것은 **22건**이었다. 아래 수치는 **4개 주제 OR 수정 이전의 역사적 측정치**로, 변경된 코드의 최신 결과를 나타내지 않는다. 모두 공개·재사용 권리는 미확인이고 `displayEligible=false`다.

| 출처 | 피드 후보 | 기사 요청 | 영상 분리 | 30일 내 원문 메타데이터 확인 |
| --- | ---: | ---: | ---: | ---: |
| Tasnim | 11 | 11 | 0 | 9 |
| GOV.UK | 19 | 19 | 0 | 5 |
| IAEA 뉴스 | 0 | 0 | 0 | 0 |
| IAEA 성명 | 4 | 4 | 0 | 0 |
| BBC 중동 | 6 | 4 | 2 | 3 |
| Al Jazeera | 3 | 1 | 2 | 0 |
| UN News | 11 | 11 | 0 | 5 |
| **합계** | **54** | **50** | **4** | **22** |

제외·대기 사유별 집계:

| 상태 | 건수 | 의미 |
| --- | ---: | --- |
| `ARTICLE_METADATA_REVIEWED` | 22 | 발행사 원문 메타데이터·본문·30일·관련성 충족. **공개권리 미확인** |
| `ARTICLE_OUT_OF_SCOPE` | 16 | 수정 전 이란 직접 관련성만 확인한 검사기의 제외 판정. **4개 주제 OR 재검사 필요** |
| `OUTSIDE_30_DAY_WINDOW` | 7 | 제목·본문 관련성·발행일을 읽었으나 보존 기간 밖 |
| `FIRST_PUBLICATION_UNVERIFIED` | 4 | 원문 최초 발행 시각을 안전하게 확인하지 못함 |
| `VIDEO_REQUIRES_SEPARATE_REVIEW` | 4 | 일반 기사와 별도 영상 처리 필요 |
| `ARTICLE_BODY_UNVERIFIED` | 1 | 게시일을 확인했지만 본문이 충분히 추출되지 않음 |
| 접근 실패 | 0 | 본 실측에서 최종 URL 요청 오류는 없음 |

이번 실행에 한해 기사 메타데이터 검토가 가능한 매체는 Tasnim·GOV.UK·BBC·UN News의 **4개**다. 이는 전 세계 기사 포괄성, 신문사별 재사용 계약, 실제 ZGMINI 사이트 반영, 최종 공개 가능 건수를 뜻하지 않는다.

## 3. 중요한 원인 및 보정

- BBC `ReportageNewsArticle` JSON-LD를 인정하자 본문·발행일을 확인할 수 있었다. `dateModified` 단독으로 최초 발행일을 대체하지 않는다.
- UN 피드의 공식 `/feed/view/en/story/...` 링크는 302가 발생했다. 원문 호스트 변경 없이 `/en/story/...` 정규화하여 HTTP 200을 확인했다. UN 본문은 짧은 `<article>` 소개와 별도 Drupal 스토리 본문 블록으로 나뉘어 있으므로 후자에서 문단을 읽는다.
- IAEA 일부 문서는 `<time datetime="YYYY-MM-DD">`처럼 날짜만 제공한다. 시간대·최초 발행 시각을 임의로 채우지 않는다.
- Tasnim은 피드 URL 슬러그를 원문 제목으로 쓰지 않는다. 기사별 JSON-LD를 확인한다.
- Al Jazeera·BBC의 영상 링크는 별도 수집 작업으로 분리한다.
- **원문 최초 발행 사실의 독립 검증은 수행하지 않았다.** `publisherDeclaredPublishedAt`은 언론사 자체 표기 증거이며 `originalPublicationIndependentlyVerified=false`로 표시한다.

## 4. 안전·권리·운영 상태

- 모든 항목은 `rightsVerified=false`, `displayEligible=false`. 타사 뉴스의 원문 제목·본문이 발견됐다는 이유로 한국어 번역·상업적 재게시를 승인하지 않는다.
- 응답에는 최초 발행일 증거, 원문 제목, 본문 길이·본문 증거 유형·범위 판정만 남기고 **기사 전문은 저장하지 않는다**.
- 2026-10-27 코드 변경은 **R24 URL 정규화 1건, R25 원문 검사기와 테스트, 이 문서**에 한정했다. R3 산식, 운영 스케줄러, D1, 번역·사이트 UI는 수정하지 않았다.
- `status=AUDIT_COMPLETE_REVIEW_REQUIRED`는 이번 피드 **54개 후보 검사 완료**만 뜻한다. 공급자가 제공하지 않은 기사와 과거 페이지·다른 뉴스 매체는 포함하지 않으므로 `totalCoverageProven=false`다.
- 해당 환경의 직접 `node ... --probe` 외부 통신은 실패한다. 원인이 PC에도 동일하다고 추정하지 않는다. Windows 실제 운영 연결은 **미실행**이다.

## 5. 실행 예

```cmd
node scripts\iran-progress\news-display-article-audit-r25.mjs --probe
```

- 별도 옵션 없이 기존 R24 피드를 읽고 최대 70개 후보의 원문 메타데이터를 검사한다. JSON 보고서를 표준 출력으로 제공한다.
- 모든 후보의 수집 메타데이터·이용권리가 자동으로 해결된다고 주장하지 않는다. 일부 출처 또는 기사 읽기 실패 시 종료 코드 2.
- 테스트: `node --test tests/iran-news-article-audit-r25.test.mjs tests/iran-news-multisource-audit-r24.test.mjs`.

## 6. 다음 단계 — 수행하지 않음

1. **수집 범위 확대:** GOV.UK 추가 페이지와 다른 매체의 공식 RSS/Atom/공개 목록을 발견 단위별로 더해 시간별 누락률을 측정한다. 오늘 확인한 54건은 전체 뉴스가 아니다.
2. **개별 권리 판정:** 표시용 제목·요약·인용·번역 권리 및 라이선스를 매체·콘텐츠 단위로 구분한다. BBC 상업용 RSS는 별도 허가·비용 가능성이 있다.
3. **PC 연결:** 원문 검증 메타데이터만 기존 승인된 PC 별도 자료 경로에 저장하고 재실행·부분실패 복구·읽기 검증을 수행한다. 사용자 PC 실행 SHA·로그를 확인한 뒤 논의한다.
4. **게시:** 별도 승인된 권리·표시 기준 충족 항목만 기존 사이트 경로로 올린다. 이 작업자 범위에서는 번역·UI·R3 점수 작업을 하지 않는다.

근거 문서:
- GOV.UK 공식 Content API `first_published_at`: https://content-api.publishing.service.gov.uk/reference.html
- Google 기사 게시일 구조화 데이터: https://developers.google.com/search/docs/appearance/structured-data/article
- BBC 사업 목적 RSS 이용 조건: https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_19September2022english.pdf
