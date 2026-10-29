# R45 — 실제 PC 4개 매체 수집 결과 및 FIX1 보완 (2026-10-29 KST)

## 실 PC 증거
사용자가 업로드한 `IRAN_NEWS_R45_LIVE_READONLY_RESULT.txt`는 2026-10-29 13:44 KST(2026-10-29T04:44:28.286Z) 실행 기록이다. `R45_SOURCE_SHA256=PASS`, `R45_NODE_EXIT=0`, `FINAL_STATUS=READ_ONLY_PROBE_FINISHED`다. 종료 코드 0은 조사기 자체 실행 완료이며 **4개 매체 수집 성공을 뜻하지 않는다**.

| 매체 | 실제 수집 상태 | 목록 발견 | 기사별 결과 |
| --- | --- | --- | --- |
| Reuters | `SOURCE_FAILED`, 목록 HTTP 401 | 0 | 0 |
| AP | `SOURCE_FAILED`, 목록 HTTP 403 | 0 | 0 |
| Arab News | 목록 `READ` | 8 | 8건 `ARTICLE_BODY_UNVERIFIED`, 본문 판독 실패 |
| Anadolu | 목록 `READ` | 8 | 8건 `FIRST_PUBLICATION_UNVERIFIED`, 발행시각 판독 실패 |

**공개 신규 기사 0건, D1·R1·PC 후보·점수·예약 작업 쓰기 0.** 이전 R41 D1 39행·최근 14일 35개 공개 기사는 이 실 PC 검증에서 변경하지 않았다.

## 공식 수집 경로 확인
- Reuters 공식 공개 RSS는 현재 이용 불가라는 제3자 RSS 운영자료를 확인했다. 직접 공식 목록 401을 우회하지 않는다. Google News RSS는 비공식 **발견 힌트**일 뿐 Reuters 원문·최초 발행일·재사용권의 증거가 아니다.
- AP 공식 RSS는 현재 정상 제공되지 않는다는 제3자 RSS 운영자료를 확인했다. AP 본문 403 우회 금지. AP Flipboard/Google News RSS는 기사 발견 보조 용도로만 구분한다.
- Arab News 공개 RSS 후보 `https://www.arabnews.com/rss.xml`는 제3자 수집 안내에서 확인했으나 **실 PC RSS HTTP/기사 전체 검증 미실행**.
- Anadolu 영어 RSS 후보 `https://www.aa.com.tr/en/rss/default?cat=live`의 실 PC HTTP/파싱은 미실행. 공식 Middle East 섹션은 이미 목록 8개를 정상 제공.

## FIX1 코드·검증
- `scripts/iran-progress/news-four-source-probe-r45.mjs`: Arab News·Anadolu의 **지정된 본문 영역**만 추출하도록 보강. 원문 JSON-LD articleBody/semantic article/출처별 editorial container로 제한하며 탐색 메뉴·전체 페이지 텍스트를 본문으로 대체하지 않음.
- 첫 페이지 8건 제한 때문에 해당 주제 기사 접근이 밀리지 않도록, 공식 목록에서 얻은 기사 URL을 1차 키워드 포함 슬러그부터 **순서만 우선화**. 2단계 게시 필터를 변경하지 않음.
- 발행일 판독에 meta 출판 속성 또는 timezone 포함 `<time datetime>`을 사용. 시간대 없는 단순 날짜는 임의 UTC로 채우지 않고 `FIRST_PUBLICATION_UNVERIFIED` 유지.
- 기사 상태 `articleStatuses` 수량 및 `bodyEvidence/dateEvidence` 표시로 파서 오류와 실제 기사 0건 분리.
- 로컬 Node v22의 원격 작업과 동등한 수정본 기반 테스트 7/7 PASS (기존 4 + 신규 3). Windows PC 실 수집 성공은 **미검증**.
- PC FIX1 런처 `scripts/iran-progress/IRAN_NEWS_R45_FIX1_READONLY_20261029.cmd`, 고정 소스 커밋 `50115a57bfde25f9f8681a0a28dde9b525f0d174`, 원격 Git Blob `5d8d032458cd8d7440b248054cfb5249bad0c1e8`. 다운로드 바이트 Git Blob SHA1을 PC Node로 검산, 쓰기 없이 읽기 전용 수집. 새로운 보고 파일 `IRAN_NEWS_R45_FIX1_RESULT.txt`. 재실행으로 기존 결과 덮어쓰기 금지.

## 현재 운영 판정과 NEXT
- R45-A: 4곳 관련 보도 존재와 2곳 목록 실측 완료, Reuters/AP 원문 수집 제한.
- R45-B: **FIX1 소스/모의 검증 완료**, 4곳 실제 원문 자동 수집 및 운영 편입은 아직 아님.
- R45-C/D/E: D1 신규 UPSERT, API/UI 11곳 표시, main 자동 배포 **미실행**.
- **NEXT:** FIX1 실제 PC read-only 1회 결과 → Arab News/Anadolu 원문/발행일 파서 실제 PASS 시 검증된 두 곳부터 R26/R41에 증분 편입. 불확실한 Reuters/AP는 독립 실패로 유지하고 다른 매체를 중단시키지 않는다.
