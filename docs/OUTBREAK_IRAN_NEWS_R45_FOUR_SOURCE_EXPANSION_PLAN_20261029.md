# R45 — 이란 뉴스 4개 매체 추가 작업 계획 (2026-10-29)

## 1. 승인 범위와 현재 기준선

- **사용자 승인:** Reuters, AP, Arab News, Anadolu Agency 네 매체를 기존 공개 뉴스 출처에 추가한다. 현재 7개 출처를 제거하지 않으며, 목표 구성은 **7 + 4 = 11개**이다.
- **작업 브랜치 고정:** `codex/outbreak-iran-news-retention-r1-20261026`. 다른 브랜치를 생성하거나 변경하지 않는다. 작업 계획은 이 브랜치에 보존한다.
- **확인된 공개 기준선:** R41 별도 D1 메타데이터 테이블 39개 기사 기록, 당시 최근 14일 화면 35개, 기존 7개 출처. 이는 신규 4개 매체가 수집·게시되었다는 뜻이 아니다.
- 공개 필드는 **기사 ID, 매체명, 원문 제목, 최초 발행일, 원문 URL**만 허용한다. 전문·사진·생성 요약·영향점수는 추가하지 않는다.
- 뉴스의 내용 필터는 사용자 지시 두 단계만 사용한다. **1차:** 이란/후티/사우디/예멘(예맨 표기 포함), **2차:** 전쟁/합의/휴전/협상/진전. 각 단계에서 하나 이상을 만족하면 통과하며, 별도 감정·중요도·지역 해석 필터를 만들지 않는다.
- 신규 기사 수집은 **PC 뉴스 전용 경로**에서 실행한다. 기존 R3/R5 점수 수집, 6시간 예약작업, R1 공개 스냅샷 `public:iran-progress:news:iran:r1`, D1의 기존 메타데이터 39행을 변경·삭제하지 않는다.

## 2. 네 매체의 수집 경로 후보

| 신규 sourceId (계획) | 매체 | 2026-10-27 전후 원문 예시 | 검증할 공개 탐색 경로 |
|---|---|---|---|
| `reuters` | Reuters | [사우디의 후티 미사일·드론 요격](https://www.reuters.com/world/middle-east/saudi-led-coalition-says-it-intercepted-houthi-missiles-drones-attacking-kingdom-2026-10-27/) | 공식 기사/섹션 목록 또는 이용 가능한 공개 피드 탐색. 자동화 가능한 RSS 존재를 아직 단정하지 않음 |
| `ap` | Associated Press | [이란의 미국과의 협상 재개 가능성](https://apnews.com/article/45161652890bf4f3d570347b8aae6b22) | AP 공식 기사/중동 섹션, 공개 구조화 메타데이터 탐색 |
| `arabnews` | Arab News | [사우디 국방장관의 테헤란 회담](https://www.arabnews.com/saudi-arabia/makkah-pact-countries-push-for-peace-in-tehran-as-saudi-defense-minister-meets-pezeshkian-for-talks-3008284) | Arab News 공식 Saudi Arabia/Middle East 섹션 또는 실제 응답하는 피드 탐색 |
| `anadolu` | Anadolu Agency | [중동 뉴스 섹션](https://www.aa.com.tr/en/middle-east) | Anadolu 공식 Middle East 목록/실제 공개 피드 탐색 |

위 URL은 **기사 존재 및 조사 대상**의 증거다. 피드 안정성·HTTP 접근·원문 날짜 파싱·수집 속도·자동 실행 가능성의 검증 결과가 아니다. 차단·403·429·로그인 장벽을 우회하지 않는다. 일부 매체가 자동화 불가능하면 출처별 `SOURCE_FAILED/UNAVAILABLE`로 기록하고 나머지는 계속 수집한다.

## 3. 구현 순서와 완료 게이트

### R45-A — 4개 출처 읽기 전용 사전 확인

1. 각 공식 도메인의 탐색 URL, HTTP 응답, 기사 링크, 원문 제목, 최초 발행일과 본문에서 두 단계 키워드가 발견되는지를 **실제 최근 14일 표본**으로 확인한다.
2. 1개 매체의 실패를 전체 수집 실패로 취급하지 않는다. 매체별 `feedRead`, `candidates`, `articleVerified`, `eligible14Day`, `errors`를 구분해 기록한다.
3. 페이지 목록의 수정 시각·검색엔진 등록일을 최초 발행일로 대체하지 않는다. 원문 날짜를 검증하지 못한 기사는 보류한다.
4. 공식 피드가 없으면 별도 공개 섹션 목록의 기사 링크만 발견 후보로 사용하고, 기사 상세 URL에서 출판일·내용을 독립 검증한다. 우회 크롤러·유료 API 추가 금지.

**게이트:** 4개 매체의 접근·파서·기간·날짜 검증 표를 제출한다. 성공 여부가 입증되기 전 운영 목록에 활성화하지 않는다.

### R45-B — 기존 뉴스 전용 수집기로 통합

1. `scripts/iran-progress/news-display-source-registry-r26.mjs`: 신규 매체의 **검증된** 원본 탐색 URL만 활성 레지스트리에 추가한다.
2. `scripts/iran-progress/news-display-multisource-audit-r24.mjs`: 새 `sourceId` 도메인 허용 목록·링크 추출·피드 종류·최대 7개 출처라는 오래된 상한을 실제 11개 구성에 맞게 바꾼다. 예전 7개도 계속 통과시킨다.
3. `scripts/iran-progress/news-display-article-audit-r25.mjs`: 기존 기사별 제목·본문·발행일 검증을 재사용하고, 매체별 HTML 구조 차이만 최소로 보완한다. 사용자의 R38 **두 단계 키워드 검사**를 유지한다.
4. `scripts/iran-progress/news-server-full-audit-r40.mjs` 및 `news-display-collection-r26.mjs`: 목록 상한·고정 7개 검사·기사 점검 배치 한도를 수정하고 검증된 출처만 개별 순회한다. 과거 R40의 80건/39건을 새 수집 증거처럼 재사용하지 않는다.
5. 기존 PC 후행 수집의 성공/부분실패/전체실패 기록 및 30일 후보 보존을 유지한다. **새 Windows 작업·Cloudflare Cron·새 D1 게시기 신설 금지.**

**게이트:** 기존 7개 + 실제 이용 가능한 신규 매체에서 수집한 후보의 URL·날짜·키워드·중복·본문 접근에 대한 회귀 테스트를 통과한다.

### R45-C — 별도 R41 D1 메타데이터에만 증분 저장

1. `lib/iran-progress/news-metadata-r41.mjs`에 신규 4개 `sourceId`/표시명/정확한 공식 호스트를 등록한다. 기존 기사 URL로 만든 SHA-256 ID는 변경하지 않는다.
2. `scripts/iran-progress/news-metadata-stage-r41.mjs`의 **과거 39건 생성 전용 R40 고정 조건**과 정규 신규 수집을 분리한다. R42/R44 39건 전용 **1회성 재게시 CMD를 일상 갱신 수단으로 재사용하지 않는다**.
3. D1 `iran_news_article_metadata_r41` 테이블의 기존 기사별 멱등 UPSERT·배치 read-back을 재사용한다. 한 URL의 재수집은 최신 확인 시각만 갱신할 수 있으며, 수집 실패·후보 0건 때문에 기존 39행이나 다른 출처 행을 삭제하지 않는다.
4. 기존 R1 전체 JSON 스냅샷 키를 건드리지 않는다. 정규 수집과 게시기의 동시 동작도 기사별 단일 키 UPSERT로 충돌을 방지한다.

**게이트:** D1 쓰기 전후 기존 39행의 ID·제목·URL·발행일 불변, 신규 N행 추가, 동일 N행 재실행 중복 0, 부분 실패 시 전일 기사 보존, 각 배치 read-back 통과.

### R45-D — 공개 API/UI의 7개 고정 전제 제거

1. `worker/iran-news-metadata-public-r41.mjs`는 현재 **7개 출처 모두 최근 14일 기사 1건 이상** 있어야 `READY`다. 신규 출처를 단순 등록하면 평시 기사 0건인 출처 때문에 `PARTIAL`이 되어 화면이 R1로 되돌아갈 수 있다.
2. `app/outbreak-news-container-r1.tsx`의 R41 선택 조건과 API 계약을 함께 검토한다. **매체별 신규 기사 0건은 정상 0건**으로 처리하고, 실제 수집 오류/메타데이터 판독 오류를 별도 상태로 표현한다. 11개 출처에 모두 최신 기사가 있어야 표시되는 강제 조건을 두지 않는다.
3. 최근 14일 노출, 최근 30일 PC 후보 보관, 기존 10건 기본 표시 + 더보기, 오래된 기사 만료, UTC→KST 날짜 변환은 유지한다.
4. 신규 4개 매체 중 일부만 정상 수집돼도 기존 **35건이 사라지지 않는지** 확인한다. 기사 수·매체 수는 실제 API 항목의 distinct `source`로 계산하고 11개를 무조건 표시하지 않는다.

**게이트:** API `READY/PARTIAL/PENDING/UNAVAILABLE`, 기존 35건 보존, 새 매체 일부 성공·일부 실패, 14일 만료, UI 펼치기, R1 장애시 대체 화면을 실테스트한다.

### R45-E — 운영 반영과 검증

1. 개발·테스트 완료 후 **전용 브랜치에 커밋**한다. 기존 `main`의 최신 SHA/드리프트를 다시 조회해 충돌 없는 최소 코드만 선별 반영한다. 전용 브랜치 전체 병합이나 다른 브랜치 생성은 하지 않는다.
2. 사이트 코드가 변경될 때는 사용자 승인 배포 경로 **GitHub `main` → 기존 Cloudflare Git 통합 자동 빌드·배포**만 사용한다. Cloudflare 대시보드 수동 조작·direct Wrangler 배포 금지.
3. PC 수집 소스는 실제 승인된 운영 SHA/경로를 확인한 뒤 기존 CMD 방식으로 최소 설치하고, 정규 6시간 후행 회차 2회에서 읽기·후보 저장·메타데이터 게시를 구분해 검증한다.
4. Cloudflare D1 실제 read-back, `/api/outbreak-news/iran/r41`의 매체별 기사 수·날짜, `https://zgmini.kr/outbreak/?event=iran`의 목록 및 더보기를 검증한다. Build 성공만으로 운영 완료라 보고하지 않는다.

## 4. 변경 금지 및 다음 행동

- **변경 금지:** R3/R5 점수·원장·분류 가감점, R1 기존 스냅샷, 기타 뉴스/테마, Cloudflare Cron/Queue/DNS, 인증 키, 스케줄 간격.
- **우선순위:** `R45-A` 실측 → `R45-B` 수집기 → `R45-C` 증분 저장 → `R45-D` 안전한 화면 → `R45-E` 자동배포 검증.
- **이 문서의 상태:** 작업 계획 브랜치 반영 단계. 신규 4개 매체의 자동 수집·39건 이외 D1 신규 저장·11개 매체 사이트 공개 **아직 미실행**.
