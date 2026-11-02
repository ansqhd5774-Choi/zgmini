# 이란 전쟁 뉴스 — 명백한 무관 기사 제외 R1 (2026-10-29)

## 승인 범위

기존 R38 2단계 긍정 키워드(이란/사우디/예멘/후티 + 전쟁/합의/휴전/협상/진전)를 변경하지 않는다.
그 관문을 통과하더라도 제목에 아래 두 개 이상의 주제 단서가 동시에 나타나면 제외한다.

| 제외 사유 | 제목 문맥 조합 | 확인 사례 |
| --- | --- | --- |
| `OFF_TOPIC_ENTERTAINMENT` | Netflix/방송·영화 등 + 배우·드라마·쇼 등 | 사우디 배우의 넷플릭스 공포 드라마 출연 |
| `OFF_TOPIC_HISTORICAL_SYRIA_TRIAL` | 시리아 + 법원·재판·형량 + 민병대·내전·전쟁범죄 | 시리아 내전 당시 친이란 민병대원 재판 |
| `OFF_TOPIC_PAST_POLITICAL_BUSINESS` | 이란 + 영국 정당 후원자·Farage·Reform + 과거 사업·재단 관계 | 영국 정치 후원자의 과거 이란 사업 관계 |

이란, 사우디, 예멘, 후티, 시리아, 친이란 민병대, 법원, 사업, `war crimes` 중 **한 단어만으로 제외하지 않는다.**
제목이 미사일 공격·공습·보복·휴전·협상·제재·핵 문제 등 현재 분쟁과 직접 연결되면 차단하지 않는다.
역사적 형사재판의 `war crimes`는 현재 전쟁 근거로 잘못 취급하지 않는다.

## 반영 위치

1. 공통 판정 `lib/iran-progress/news-offtopic-exclusions-r1.mjs`: 제목만으로 검사하는 순수 함수.
2. `scripts/iran-progress/news-display-article-audit-r25.mjs`: 기존 R38 검사를 유지하면서 명백한 무관 기사에 `ARTICLE_BLOCKED_OFF_TOPIC` 부여.
3. `scripts/iran-progress/news-four-source-probe-r45.mjs`: 추가 4개 매체의 원문 검토에 동일 적용.
4. `lib/iran-progress/news-metadata-r41.mjs`: 이미 D1에 저장된 무관 기사도 공개 목록에서 비노출; D1 레코드 삭제 없음.

반영 코드는 스코어·산식·수집 시계·PC 예약 작업·D1 스키마·원문 저장 정책을 변경하지 않는다.
실제 PC 설치·GitHub main 병합·Cloudflare 배포·공개 API readback은 각각 별도 검증 증거가 필요하다.

## 검증

- `node --test tests/iran-news-offtopic-exclusions-r1.test.mjs`
- 명백한 무관 기사 3건 제외와 이란-사우디 휴전·예멘 후티 공격·시리아 관련 신규 미사일 공격·정치 후원자 제재 기사 보존을 함께 테스트한다.
- 배포 후 공개 기사 목록 48건의 제목/원문 URL과 새 건수를 대조하고, 다음 정규 PC 수집 때 동일 규칙이 적용되는지 확인한다.

## R1.1 보강 — 기사 분야 기반 무관 보도 (2026-10-31)

- 기존 R38의 2단계 키워드, 보관기간, D1 스키마, 점수 산식은 그대로 둔다.
- 기존 R1 무관 기사 3종과 원문 이력·수집·저장 기록을 보존한다.
- **The Guardian** `/artanddesign/` 등 예술 기사 경로 + 제목의 artist/photography/exhibition/gallery/portrait/museum 계열을 동시에 확인하면 `OFF_TOPIC_ARTS_SECTION`으로 공개 제외한다.
- **Al Jazeera** `/sports/`, `/amp/sports/` 등 스포츠 경로 + 제목의 football/coach/captain/squad/football 관련 요소를 동시에 확인하면 `OFF_TOPIC_SPORTS_SECTION`으로 공개 제외한다.
- 제목에 명시적인 미사일/공습/드론/휴전/종전·이란 전쟁 관련 문맥이 있으면 제외하지 않는다. 이란 축구대표팀의 비자 거부·경기 취소 등 전쟁의 직접적 영향이 시사될 때도 보존한다.
- 일반 단어 `attack`(언쟁·비난)·`nuclear`(예술 주제) 단독으로 예술·스포츠 기사를 전쟁 기사로 오인하지 않도록, 이 2종에는 직접 전쟁 신호를 별도로 검사한다.
- 제목만으로 불명확한 경우 기존 판정이 유지된다. 기사 URL이 없는 호출은 기존과 동일하게 동작한다.
- 읽기 단계에서는 `row.sourceUrl`을 같이 넘겨 이미 게시된 무관 기사도 비노출한다. D1 원본은 삭제하거나 고치지 않는다.
- PC 원문 검토에서는 같은 판정기에 `sourceUrl`을 넘겨 다음 수집에도 적용한다.
- 실제 배포 결과는 GitHub PR, Cloudflare 자동 배포, 공개 R41 API 및 웹 화면에서 각각 확인한다. 확인 전 성공으로 표기하지 않는다.
