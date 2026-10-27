# ZGMINI 이란 뉴스 — R23 원문 수집·범위 감사 (2026-10-27)

## 목적과 작업 경계

- 오직 GOV.UK 영문 **기사 탐색·본문 제공 여부·원본 발행일·중복** 수집 상태를 검사한다.
- 한국어 번역, 문장 생성, 영향 분류, 기사 카드 디자인·버튼, 이란 점수 산식은 작업 대상이 아니다.
- 승인된 GOV.UK 1개 매체, Iran/Saudi/Yemen/Houthi OR 검색, 14일 공개, 30일 PC 보관, 기존 R13/R15 예약 작업을 그대로 유지한다.
- R23은 별도 읽기 전용 감사기이다. Windows 예약작업, PC 캐시, D1, Cloudflare, 공개 페이지를 수정하지 않는다.

## 발견된 수집 범위와 공식 근거

1. 현재 수집기 `news-display-discover-r1.mjs`는 키워드별 Atom URL을 **첫 페이지만** 읽는다. GOV.UK에서 2026-10-27 직접 요청한 `Iran` Atom 첫 페이지는 20개 항목이었다.
2. GOV.UK Atom에 `&page=2`를 붙이면 실제 다른 기사가 나타난다. 두 번째 페이지에서 관찰된 최신 `<updated>`는 다음과 같다. 이는 **원문 최초 발행일이 아니다**.

   | 키워드 | 2페이지 최신 수정일(영국 현지 표기) |
   | --- | --- |
   | Iran | 2026-09-22 |
   | Saudi | 2026-08-25 |
   | Yemen | 2026-04-14 |
   | Houthi | 2026-02-12 |

3. 당일 공개 뉴스 API `https://zgmini.kr/api/outbreak-news/iran`의 10개 기사 URL 모두를 GOV.UK 공식 Content API로 대조한 결과 **10/10 HTTP·JSON 조회 성공, 10/10 경로 일치, 10/10 영문 HTML 본문 존재**. 본문은 1,138~18,201자였다. 원문이 공급되지 않는 문제는 확인되지 않았다.
4. 현재 공개 API는 10개 중 9개 기사의 한글 `summary`에 일반적인 토픽 안내 문장만 기록한다. 이는 **본문 자체의 수집 불가가 아니라 실제 수집 내용과 공개 요약의 연결 부족**이다. R23은 번역·요약 게시를 담당하지 않는다.
5. 공식 API 설명: `https://content-api.publishing.service.gov.uk/`; GOV.UK 검색 API 페이지네이션: `https://docs.publishing.service.gov.uk/repos/search-api/using-the-search-api.html`.

## 감사기 사용법

```cmd
node scripts\iran-progress\news-display-source-audit-r23.mjs --feed-audit
node scripts\iran-progress\news-display-source-audit-r23.mjs --public-audit
```

- `--feed-audit`: 승인된 4개 Atom 피드를 최대 2페이지 읽어 1페이지에 없던 URL 수와 페이지 종료 이유를 기록한다. 30일 이전의 `<updated>`는 페이지 경계 확인용으로만 사용한다. 특정 기사 게시 가능 날짜로 쓰지 않는다.
- `--public-audit`: 현재 공개된 기사 URL 각각에 대해 공식 Content API `base_path`, `first_published_at`, 비철회 상태 및 실제 `details.body` 제공 여부를 읽기 전용으로 확인한다. 본문 전문을 로그에 저장하거나 공개하지 않는다.
- 감사가 부분 실패하거나 페이지 경계가 확인되지 않으면 정상 완료로 표시하지 않는다. `COVERAGE_BOUNDARY_OBSERVED`도 전체 GOV.UK 기사 수집을 완벽하게 증명하는 상태는 아니다.
- 웹 접근 실패 시 실패로 출력하며, 기존 뉴스 데이터를 지우거나 최신으로 덮어쓰지 않는다.

## 후속 작업 조건

- PC에서 R23 감사가 정상 동작하는지 별도 실행 로그로 확인한다.
- 2페이지 이후 30일 안의 갱신일이 관찰되면, 신규 URL의 **공식 최초 발행일**을 확인하고 기존 URL과 중복을 제거하는 탐색기 확장을 별도로 설계한다.
- 기존 운영 수집기의 페이지 범위나 게시기를 바로 변경하지 않는다. 권리·출처·운영 원장 검증과 작업 SHA 적용은 별도 승인 절차를 따른다.
