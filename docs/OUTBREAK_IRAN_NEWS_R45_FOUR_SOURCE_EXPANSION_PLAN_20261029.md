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

## 5. 2026-10-29 R45-B 병렬 개발 1차 결과

- **독립 수집 프로브 구현:** `scripts/iran-progress/news-four-source-probe-r45.mjs`. Reuters/AP/Arab News/Anadolu 네 공식 목록을 `Promise.all`로 병렬 조회하며, source 별 성공/실패를 격리한다. HTTPS 도메인·기사 경로·publisher date ISO 형식·본문 존재·최근 14개 KST 날짜·기존 승인 2단계 키워드(1차 OR, 2차 OR)를 확인한다.
- **회귀 테스트:** `tests/iran-news-four-source-r45.test.mjs` 4개 테스트. Node 22 동일 소스 코드 로컬 모의 시험 4/4 PASS; GitHub 원격 소스 blob `4b1d29a0ab37d97a777c273d6d0ee95d3912365d`가 시험본과 일치함. 이 증거는 **모의 fixture**이지 실 사이트 HTTP/PC 검증이 아니다.
- **PC 읽기 전용 실행기:** `scripts/iran-progress/IRAN_NEWS_R45_LIVE_READONLY_20261029.cmd`. 고정 GitHub SHA `dd33dc2310c700676af43917f57527d4692199ea`에서 위 프로브만 내려받고 기존 `E:\ZGmini\runtime\node.exe`로 실행. CMD 옆 `IRAN_NEWS_R45_LIVE_READONLY_RESULT.txt`에 시작부터 기록하고 기존 결과를 덮어쓰지 않는다. 실제 Windows 실행은 **미검증**.
- **운영 변경 없음:** 신규 4개 소스는 정규 R26 출처 레지스트리·R24/R25 운영 호출·R41 공개 API에 **아직 연결하지 않음**. R1 뉴스 키·R41 39행·현재 7개 공개 출처·R3/R5 점수·기존 6시간 작업·Cloudflare 배포 불변.
- **순서:** R45 PC HTTP 실측(출처별 목록·원문·발행일·본문) → 검증된 매체별 파서 추가 → R24/R25·R26 레지스트리 및 R41 신규 출처 유효성 검사와 기존 7개 READY 보존 회귀 → D1 신규 행 UPSERT/read-back → GitHub main 최소 변경 자동배포 및 API/UI 실제 확인. 실 PC 소스 응답 없이 11개 수집/공개 완료라고 보고하지 않는다.
- **GitHub 드리프트:** 계획 작성 이후 본 전용 브랜치와 main에는 다수의 상이한 커밋이 존재한다. 전용 브랜치 전체 병합 금지; 확정 범위에 한해 선택 반영한다.

## 6. R45 FIX1 실제 PC 실측과 R45-B/C/D 코드 진행 (2026-10-29)

- **원본 증거:** 사용자가 제출한 `IRAN_NEWS_R45_FIX1_RESULT.txt`, checkedAt `2026-10-29T04:57:08.970Z`, `SOURCE_COMMIT=50115a57bfde25f9f8681a0a28dde9b525f0d174`, `R45_GIT_BLOB_IDENTITY=PASS`, `FINAL_STATUS=READ_ONLY_PROBE_FINISHED`. 이 종료 상태는 읽기 전용 probe 실행 완료이며 4개 매체 모두 기사 검증 성공이라는 뜻은 아니다.
- Reuters: 공식 목록 `HTTP_401`, 0건. AP: 공식 목록 `HTTP_403`, 0건. 접근 제한 우회·중복 호출 금지.
- Arab News: 공식 목록 8건, 원문 본문·정확한 시간대 출판시각·2단계 키워드 검증 **4건 PASS**, 범위 제외 4건. `ARTICLE_METADATA_REVIEWED` 4건은 **미게시 검토 후보**, `rightsVerified=false`, `displayEligible=false`.
- Anadolu: 공식 목록 8건, 기사 JSON-LD 본문 확인 8건. 그러나 공식 최초 발행 **정확한 시간·시간대 미확인**으로 8건 `FIRST_PUBLICATION_UNVERIFIED`. 웹 원문은 게시 **날짜** 자체를 보여주지만 날짜-only를 임의 UTC 00:00으로 변경하지 않고 해당 신규 공개를 보류한다.
- **R45-B 소스:** `news-display-source-registry-r26.mjs`의 운영 기본 7개를 유지하고 `IRAN_DISPLAY_FEEDS_R45_OPTIONAL`로 Arab News를 분리. `news-display-multisource-audit-r24.mjs`에 출처 공식 링크 발견·URL 허용 목록 추가. `news-display-article-audit-r25.mjs`에서 출처별 본문·발행일·2단계 키워드 검증을 30일 창으로 재사용. 기존 `R26` 정기 기본 수집·R3/R5 점수·스케줄러 변경 없음.
- **R45-C 준비:** `lib/iran-progress/news-metadata-r41.mjs`에 승인 4개 매체 허용 호스트/표시명 등록. 기존 39행 재현용 `R41` staging은 고정 기존 7개 기준을 보존하고 새 기사와 혼동하지 않는다. **신규 4건의 실제 PC/D1 저장 및 UP﻿SERT/read-back 미실행**.
- **R45-D 소스:** `worker/iran-news-metadata-public-r41.mjs`에서 모든 출처가 오늘 기사 1건 이상 있어야 READY라는 조건 제거, `READY`=실제로 유효한 기사 1건 이상, `PENDING`=최근 14일 유효 기사 0건, `UNAVAILABLE`=실제 DB 읽기 오류. `sourceCount`는 실제 기사 출처 수, `configuredSourceCount`는 현재 승인 등록 11개. `app/outbreak-news-container-r1.tsx`의 하드코딩된 7개 비교 제거. **브랜치 소스 변경만, 사이트 미배포**.
- **회귀 테스트 소스:** 기존 `tests/iran-news-metadata-r41.test.mjs`에서 역사적 원본 7개 fixture 유지, 신규 `tests/iran-news-r45-optional-integration.test.mjs`와 `tests/iran-news-r45-api-coverage.test.mjs` 추가. 최신 전체 Node 테스트·CI/PR은 **미실행/미검증**, PASS라고 주장하지 않는다.
- **다음 게이트:** 확장 수집기를 기존 PC 후행 스케줄에 활성화하기 전 ① 선택적 Arab News R24/R25 통합 테스트 실실행, ② 4건 개별 기사 메타데이터 저장 규격 재확인, ③ 기존 7개 30일 캐시/39개 D1 원본 불변 검증, ④ 신규 R41 D1 증분 UPSERT/read-back, ⑤ main 최신 변경 대비 최소 파일 회수 및 Git Integration 배포/API/UI 검증. Anadolu는 먼저 발행시각의 **공식 출처 근거** 확보.
- **실행 상태:** R45-A PC source partial confirmed; R45-B source staged **NOT_INSTALLED**; R45-C/D branch source only **NOT_DEPLOYED**; R45-E **NOT_RUN**.

## 7. R45-C 증분 게시 코드 추가 (2026-10-29)

- `scripts/iran-progress/news-metadata-incremental-r45.mjs` 신규. R25 보고서의 `ARTICLE_METADATA_REVIEWED` 상태 중 **실제로 PC 검증된 Arab News만** 수용하며, URL SHA256 기사 ID·본문/키워드/발행일/checkedAt 유효성을 검증해 R41 행으로 변환한다. AP/Reuters/Anadolu는 현재 차단·정확한 출판시각 미검증으로 제외한다.
- 저장은 기존 `stageIranNewsMetadataR41`의 D1 멱등 UPSERT 및 배치 read-back을 사용한다. 공개 R1 키, 점수 DB, 스케줄을 접근하지 않는다. 보고서에 적격 신규 기사 0건이면 D1 동작 자체를 호출하지 않는다.
- `tests/iran-news-r45-incremental.test.mjs`에 정규 행 변환, 미검증 날짜·범위·중복 거부, 빈 기사 무쓰기, 기존 R41 D1 호출 인터페이스에 대한 모의 시험을 **추가했다. 실제 CI/Node 실행 증거는 아직 없음**.
- `main`과 전용 브랜치가 크게 분기돼 있으므로 승인된 최소 파일만 충돌 확인 후 회수할 것. 운영 승인 SHA·PC 적용 상태·Cloudflare 배포는 별도 점검 전 자동 변경 금지.
- 상태: **R45-C SOURCE_STAGED_NOT_RUN**. 기존 D1 39개/공개 35개 유지; 신규 기사 D1 저장 미실행. NEXT는 실제 동등 Node 통합 테스트 PASS 및 PC 승인 source preflight 확인 후 쓰기 시도 전 readback 기준선 확보.

## 8. R46 통합 테스트 및 실수집 확인 준비 (2026-10-29 KST)

- **R45-C 코드:** `scripts/iran-progress/news-metadata-incremental-r45.mjs`. 검증된 Arab News만 R41 메타데이터로 변환하고 기존 단일 기사 ID/UPSERT/read-back을 사용. `tests/iran-news-r45-incremental.test.mjs` 추가. 다만 해당 테스트 자체는 아직 원격/PC 런타임에서 실행되지 않았음.
- **R46 현장 테스트 실행기:** `scripts/iran-progress/IRAN_NEWS_R46_TEST_AND_PROBE_READONLY_20261029.cmd`. 고정 소스 commit `485c9a08b37270b5cc35260829e81adda3e19bc7`에서 필요한 20개 파일을 임시 전용 디렉터리에 다운로드하고 각 Git Blob SHA1을 직접 검사한다. 기존 승인 `E:\ZGmini\runtime\node.exe`로 Node 테스트 파일 6개(R41 기존 데이터 보존, R45 파서/수집/공개/API/증분 D1 mock)를 실행한다. 전부 PASS면 **선택형 Arab News R24→R25 실원문 수집 read-only probe**를 수행하고 같은 위치에 `IRAN_NEWS_R45_R46_TEST_RESULT.txt`를 생성. 기존 파일이 있다면 재실행하지 않는다.
- **금지 동작:** 테스트 실행기는 운영 source checkout 설치·변경, 원자료/PC 캐시, D1 write, 공개 R1 키, 스케줄러, 점수·배포 변경을 수행하지 않는다. 메모리 DB 테스트의 일회성 fixture INSERT는 운영 D1 작업이 아니다.
- **현재 Gate:** Remote source/launcher committed and inspected; **R46 PC Node test execution PENDING**, `R45-C` real D1 write/read-back PENDING, site deployment PENDING. `git main`과 기존 작업 브랜치 차이가 커 전체 병합 금지, 검증 후 파일별 최신 main 적용.
- **후속 필수 액션:** PC의 R46 CMD 결과 파일을 확인하여 LAST PASS/FIRST FAIL을 확정. 자동 게시 전에 운영 PC 승인된 writer source SHA/config/checkpoint, 실제 D1 39행 기준선 재조회, R45 신규 기사 승인 범위를 확인하고 멱등 증분 게시. 기사 0건이나 일부 Source 실패가 기존 39행을 삭제하거나 기존 7개 UI를 감추지 않도록 검증한다.


## 9. R46 실제 PASS / R47 D1 읽기 전용 사전검사 준비 (2026-10-29)

- 사용자 PC 원본 증거 \`IRAN_NEWS_R45_R46_TEST_RESULT.txt\` 확인: 고정 소스 \`485c9a08b37270b5cc35260829e81adda3e19bc7\` 20개 Blob 일치, Node 통합 시험 **21 PASS / 0 FAIL**, Arab News 목록 22개, 원문·출판시각·현행 2단계 키워드 적격 8개, 범위 제외 13개, ARTICLE_FETCH_FAILED 1개. 종료 \`R46_TESTS_PASS_PROBE_RECORDED\`; 기존 DB·PC 후보·스케줄·공개 반영 쓰기 없음.
- 신규 적격 8개는 현행 R38 키워드 기준 통과를 의미한다. 별도 기사 품질 보증이 아니다. Netflix 연예·선거·일반 에너지 기사처럼 뉴스 목적과의 관련성이 낮아 보이는 제목도 포함된다. **승인 없는 2단계 산식/키워드 조건 변경 및 자동 제외 금지**. 원문 재검토 필요성 별도 기록.
- 신규 \`scripts/iran-progress/news-metadata-preflight-r47.mjs\`는 R46 원본 실행 로그·21 PASS·고정 소스·8건 적격 메타데이터·제약된 sourceId 검증 후 기존 R41 신규행 변환기를 사용한다. 운영 D1 **읽기 전용**으로 R1 스냅샷 버전·stored_at 및 기존 7출처 39행을 재조회해 기준선 SHA256을 산출한다. 8개 ID의 미저장/이미 저장/부분 저장/충돌을 구분하며 임의 재시도하지 않는다.
- 신규 \`tests/iran-news-r47-preflight.test.mjs\`에 임시 fixture 기반 R46 로그 검사, 원격 D1 READ 쿼리만 호출, 기존 39행 보존, 중복·기존 저장·충돌 판정의 회귀 시험 추가. 원격 Node 실제 테스트 실행은 **아직 미검증**. 수집 원본 R46 로그를 GitHub에 업로드하지 않음.
- 고정 SHA Windows CMD \`scripts/iran-progress/IRAN_NEWS_R47_D1_PREFLIGHT_READONLY_20261029.cmd\` 생성. 소스 \`9c5e3b2dbdfc7749bfa9510ee446b9d4cf47b2a5\`에서 9개 파일을 개별 Git Blob SHA1 검증하고 테스트 통과 시 PC writer 기존 설정/OAuth를 사용해 **D1 SELECT만** 실행. 동일 폴더에 기존 \`IRAN_NEWS_R45_R46_TEST_RESULT.txt\`가 있어야 한다. 결과 \`IRAN_NEWS_R47_D1_PREFLIGHT_RESULT.txt\`. 기존 결과 존재 시 재실행 거부.
- 최초 로그 기준 Python/Node 파일 파싱 검사에서 Arab News 8개를 검출했으나 **이는 실제 D1 read-back이 아니다**. R47 실행·실제 D1 저장·main 반영·Cloudflare 배포·운영 UI 확인은 아직 미완료.
- 다음 실행: R47 PC 읽기 전용 사전검사 1회 → 기존 39행/8개 신규 ID 상태 확인 → 결과가 PRELIGHT_READY로 확인될 경우에만 해당 승인 범위의 신규 기사 증분 저장 설계 및 원격 read-back → 최신 main과의 drift 점검 후 최소 파일 배포. 임의 재수집·기존 일회성 R42/R44 재실행 금지.
