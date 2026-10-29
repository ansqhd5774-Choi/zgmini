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
