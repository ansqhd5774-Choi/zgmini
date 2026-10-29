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

## 10. R47 실제 D1 오류 → R48 원인 분리 (2026-10-29)

- 사용자 제출 `IRAN_NEWS_R47_D1_PREFLIGHT_RESULT.txt`: 고정 소스 9개 검증, fixture/Node 테스트 **4/4 PASS**, 실제 D1 preflight 진입 후 `R47_ORIGINAL_39_BASELINE_MISMATCH` 발생. `D1_WRITES=DISABLED`, `FINAL_STATUS=R47_PREFLIGHT_NOT_READY_NO_D1_WRITE`. 이는 D1 7개 초기 출처에 속한 행이 **정확히 39건**이 아니라는 판정이며, 39개 과거 기사 ID가 삭제되었다는 증거가 아니다.
- LAST PASS: R47 원격 D1 조회 진입 및 R1 identity check(후속 실패 위치가 원본 39개 소스 기준이므로). FIRST FAIL: 7개 초기 출처 행 수==39 및 7개 출처가 모두 존재한다는 결합 검사. 원인: **미확정**; 출처 행 추가·기존 39개 ID 누락·기존 출처 대체 등 구분 필요.
- R47 코드의 고정 39행 assertion을 임의로 제거하지 않고, 실제 DB를 보존한 채 조회 전용 R48 진단을 추가.
- `scripts/iran-progress/news-metadata-baseline-diagnose-r48.mjs`: 기존 승인 39건 manifest의 URL-SHA256 개별 ID와 D1 해당 ID를 직접 대조하며, 7개 초기 출처/신규 출처별 총 행 수, 초기 39개 보존·누락 건수, URL/source ID 변경 건수, 원본 제목·발표시각 정정 건수, R1 버전·저장시각·본문 SHA256만 출력. **기사 원문/URL 목록/인증키를 로그에 출력하지 않음. D1은 SELECT 세 종류만 실행.**
- `scripts/iran-progress/news-metadata-baseline-diagnose-r48.test.mjs`: 39건 그대로, 원본 39건 보존+신규/기존 출처 추가, 일부 누락, ID 출처 변경, 제목 정정의 모의 경로 5개. 동일 Node v22 소스와 원격 Git Blob 동일성 기준 **5/5 PASS**; 이는 모의 테스트로 실제 D1 검사 결과가 아님.
- `scripts/iran-progress/IRAN_NEWS_R48_BASELINE_READONLY_20261029.cmd`: 정확한 소스 SHA `f020b2f1ed0adc58fcfab97fb4f821820f2ae547`의 6개 파일을 Git Blob 해시 검증해 사용자 PC에서 테스트→원격 D1 SELECT를 실행. 기존 `E:\ZGmini\runtime\node.exe`와 기존 writer 설정·인증 사용. 로그 파일 `IRAN_NEWS_R48_BASELINE_READONLY_RESULT.txt`. 동일 로그가 이미 있으면 자동 재실행 금지.
- 운영 R41 / D1 쓰기, R1, 점수, 스케줄, GitHub main/배포 상태 **이번 작업에서 변경 안 함**. R48 PC 원격 실행 아직 **미실행**.
- NEXT: R48 결과에서 `original39Present`, `original39Missing`, `oldSourceRows`, `newSourceRows`, `sources[]`를 확인. 39개 원본 ID 전부 보존된 경우에만 기존 소스 count==39 Gate를 보존 검증으로 최소 수정 검토. 실제 누락 또는 identity drift가 있으면 게시 중단 및 해당 데이터 손실 원인을 별도 조사. 신규 R46 8건 쓰기·재조회와 main 최소 변경 자동 배포는 그 후에 수행.

## 11. R48 실제 D1 증거 및 R49 최소 수정 (2026-10-29 KST)

- **PC R48 실제 결과:** `IRAN_NEWS_R48_BASELINE_READONLY_RESULT.txt`, `SOURCE_FILES=6_VERIFIED`, fixture Node 테스트 `5/5 PASS`, `FINAL_STATUS=R48_REMOTE_DIAG_DONE_NO_D1_WRITE`.
- **운영 D1 기준선:** 총 **41행**, 기존 7개 출처 행 41, 신규 출처 행 0. 최초 R41 staging **39개 기사 ID 전부 재조회 보존**, ID/source URL 변경 0, 제목/발행일 정정 0, 누락 0. 기존 7개 출처에서 신규 기사 +2건이 생겼음. R1 보존본 버전 `IRAN_NEWS_DISPLAY_R1`; 실제 R48 `r1StoredAt=1793242899922`. 증거에 따르면 R47의 `R47_ORIGINAL_39_BASELINE_MISMATCH`는 원본 손실이 아니라 현재 기존 출처 41행을 과거 39행과 같다고 강제한 **검증 조건 오류**.
- **최소 코드 수정:** `scripts/iran-progress/news-metadata-preflight-r47.mjs`에서 초기 출처 합계 39행 강제 검증을 제거하고, **승인된 R41 원본 39개 manifest 기사 ID마다 D1 기사 ID·sourceId·sourceUrl이 존재·일치하는지** 확인한다. 원본 ID 누락 `R47_ORIGINAL_39_ARTICLES_MISSING`, URL/출처 변경 `R47_ORIGINAL_39_IDENTITY_CHANGED`는 여전히 중단. 원본 39개 SHA256 및 현재 초기 출처 추가 행 수, 기존 기사 제목·발행일 정정 수를 별도 기록. R1 identity·새 기사 충돌·R41 검증 조건은 유지.
- **회귀 테스트 보강:** `tests/iran-news-r47-preflight.test.mjs` 4개→6개 검증 항목. 누락 및 식별 변경 감지, 현재 초기 출처 **+2건을 보존하면서 통과**하는 fixture 추가. 수정 소스·테스트는 GitHub 원격 재조회와 SHA 확인 완료. **새 6개 테스트 실제 Node 실행 아직 미검증**.
- **R49 재검증 실행기:** `scripts/iran-progress/IRAN_NEWS_R49_MEMBERSHIP_READONLY_20261029.cmd` (고정 소스 commit `1c36f385d55d4fb97d380f33105b7e930ba6efe1`)가 11개 파일을 Git Blob SHA 검사 후 Node 테스트 및 기존 D1 read-only 사전검사를 실행한다. 기존 R46 원본 결과 `IRAN_NEWS_R45_R46_TEST_RESULT.txt`를 CMD와 같은 디렉터리에 둬야 한다. 결과는 `IRAN_NEWS_R49_MEMBERSHIP_PREFLIGHT_RESULT.txt`. 재실행·무조건 D1 게시 금지.
- **상태:** R48 Runtime **PASS: ARCHIVE_39_PRESERVED_WITH_ADDITIONS**. R49 SOURCE/TEST_STAGED, **PC_RUNTIME_NOT_RUN**. 신규 Arab News 8건 D1 쓰기 0, Cloudflare 배포 0, 스케줄·점수 변경 0. R49가 PASS여야 승인된 다음 단계 증분 게시/ledger/remote readback으로 이동한다.


## 12. R49 PC PASS 및 R50 Arab News 8건 일회성 D1 게시기 준비 (2026-10-29 KST)

- **R49 실제 PC 검증:** 사용자 제공 \`IRAN_NEWS_R49_MEMBERSHIP_PREFLIGHT_RESULT.txt\`, 고정 원격 source \`1c36f385d55d4fb97d380f33105b7e930ba6efe1\` 11개 검증, Node 테스트 **6/6 PASS**, 원격 D1 read-only 결과 \`PREFLIGHT_READY_FOR_APPROVED_PUBLISH\`. R41 기존 39 ID 보존, 기존 출처 신규 2건으로 현재 41행, 기존 기사 ID/URL·제목·발행일 변경 없음. Arab News 원문·발행일·현행 2단계 키워드 통과 8건, 중복 0건, 기사 읽기 실패 1건. 쓰기 없음.
- **R50 code:** \`scripts/iran-progress/news-metadata-publish-r50.mjs\` 단일 실행기. 기존 R46+R49 **원본 로그**의 승인 소스·검증 결과·기사 8건을 검산한다. R47의 원본 39개 기사별 ID/sourceURL 조회와 신규 ID 중복 검사를 실제 D1에서 다시 수행한다. 저장 전 R41 전체 행 및 R1 스냅샷 body SHA256/storedAt을 기록한다. 승인 기존 PC Writer의 D1 adapter와 R41의 monotone UPSERT/readback 기능으로 **검증된 Arab News 메타데이터 8행만 1회 삽입**한다. 저장 후 신규 8행을 개별 재조회하고, 종전 D1 41행의 ID/source/URL 존재와 R1 동일성을 검사한다. 자동 재실행 금지.
- **테스트:** \`tests/iran-news-r50-publish.test.mjs\`에 합성 R46/R49 fixture로 원본 검증, 손상된 로그 거부, 정상 41→49증분 저장, 신규 ID 중복, writer 오류 시 미재시도, R1 변조 감지, 최신 preflight 실패 시 무쓰기 **총 7개**. 로컬 Node v22와 fixture/stub의 해당 동일 writer·test 소스로 **7/7 PASS**; GitHub source/test Git Blob SHA 로컬 일치 확인. 테스트용 임시 D1 mock은 운영 D1 증거가 아님.
- **CMD:** \`scripts/iran-progress/IRAN_NEWS_R50_D1_PUBLISH_ONCE_20261029.cmd\`. 고정 SHA \`35af18a7f1033b54867890944e66edf18348bdd0\`에서 12개 파일의 각 Git Blob을 검증한 뒤 PC Node 7개 테스트를 실행한다. 테스트 통과 시 \`ZGMINI_IRAN_NEWS_R50_APPROVED=YES\`를 **해당 CMD 실행 범위**에만 설정하고 R50 one-off D1 publish 호출. 결과 \`IRAN_NEWS_R50_D1_PUBLISH_RESULT.txt\`를 CMD 옆에 기록, 기존 로그가 있으면 재실행 거부. 기존 \`IRAN_NEWS_R45_R46_TEST_RESULT.txt\`·\`IRAN_NEWS_R49_MEMBERSHIP_PREFLIGHT_RESULT.txt\` 두 원본을 CMD 옆에 두어야 함.
- **금지/영향:** R50은 신규 테이블/컬럼/TTL/산식/수집 스케줄을 생성하거나 변경하지 않고, R1 snapshot이나 원자료·점수 DB를 쓰지 않는다. Cloudflare 배포·사이트 공개는 전혀 실행하지 않는다. 8개 통과는 기존 R38 키워드 검증의 결과이며 뉴스 목적과의 개별 관련성 평가를 새로 추가하지 않는다.
- **R50 현재 상태:** 소스/테스트/CMD GitHub 브랜치 반영·해시 확인 완료, **실제 운영 PC R50 실행·D1 삽입·원격 post-write readback은 아직 미실행**. 49행은 예상 검산 수치일 뿐 실 DB 행 수로 주장하지 않는다. 결과 불명확 시 D1 재조회로 확인 후 재시도 여부를 결정한다.
- **다음:** 사용자가 한 번 R50 CMD 실행 후 결과 TXT 제출 → D1 8행 실제 저장/원본 보존 여부 확인 → 최신 main 대비 최소 파일만 검토·반영 → Cloudflare Git Integration exact deploy 및 API/UI 8건 표시 확인. 브랜치 전체 병합·직접 Wrangler Production Deploy 금지.

## 13. R50 최초 실행 사전 중단과 안전 재개 (2026-10-29)

- 사용자 제출 `IRAN_NEWS_R50_D1_PUBLISH_RESULT.txt`: 5행, `PINNED_SOURCE=35af18a7f1033b54867890944e66edf18348bdd0`, `FINAL_STATUS=R46_LOG_MISSING`. **소스 다운로드/모의 테스트/운영 D1 쓰기 전에 중단**. 반복 실행 금지 방침 유지.
- R46과 R49 원본 검증 TXT는 모두 앞선 사용자 업로드에 있으며 `NODE_TESTS=PASS` 및 `MEMBERSHIP_TESTS=PASS`, `R49_PREFLIGHT_READY`를 확인한 파일들이다. ZIP로 해당 원본과 최초 R50 실패 로그를 묶어 재제공함. 임의로 원본 로그 내용을 변경하지 않음.
- 새로운 `scripts/iran-progress/IRAN_NEWS_R50_RECOVERY_ONLY_AFTER_MISSING_R46_20261029.cmd`는 최초 R50 결과가 **정확한 pre-write R46_LOG_MISSING 원본 SHA256** (`2baeac299b5d4a9d49d8d75f9f9ad4fa4cb74702eb09f41abca9cbc2cc86fb4c`)일 때만 새 실행으로 진행한다. 새 결과 `IRAN_NEWS_R50_RECOVERY_PUBLISH_RESULT.txt`를 생성하므로 기존 결과 보존. 기존 R50 pinned source/12 file SHA1 검사/7개 모의 테스트/실제 저장 전 readback 및 unknown outcome STOP 유지.
- 재개 ZIP `IRAN_NEWS_R50_RECOVERY_COMPLETE_20261029.zip`: 위 전용 CMD, `IRAN_NEWS_R45_R46_TEST_RESULT.txt`, `IRAN_NEWS_R49_MEMBERSHIP_PREFLIGHT_RESULT.txt`, `IRAN_NEWS_R50_D1_PUBLISH_RESULT.txt` 네 파일을 루트에 저장. 압축 무결성 검증 및 GitHub CMD blob `b634b5d0c89bd7a1870cded52451c4a0c529d480` 일치 검증 완료.
- **상태:** 최초 R50 D1 쓰기 0 확인. 복구 CMD는 작성/검증되었으나 PC 실게시 및 D1 신규 8건 재조회는 아직 미실행. 사용자 PC에서 새 빈 폴더에 ZIP을 풀어 CMD 1회 실행하고 결과 TXT 제출. 이전 실패 결과 삭제/덮어쓰기 금지.


## 14. R50 실제 오류: 쓰기 결과 미확정 → R51 원격 D1 읽기 전용 재조회 (2026-10-29 KST)

- **사용자 PC R50 실제 로그:** `IRAN_NEWS_R50_RECOVERY_PUBLISH_RESULT.txt` 확인. 이전 사전 중단 로그 검증 `R50_PRIOR_SAFE_PREWRITE_STOP=VERIFIED`, 소스 12건 검증, Node 모의 테스트 `7/7 PASS`. `STEP_2=ONE_TIME_APPROVED_R41_D1_INCREMENTAL_PUBLISH` 이후 `STOP_NO_AUTO_RETRY`, `R50_WRITE_OR_READBACK_OUTCOME_UNKNOWN`, `R50_NODE_EXIT=1`, `FINAL_STATUS=R50_WRITE_OUTCOME_REQUIRES_D1_READBACK`.
- **정확한 판정:** 실제 D1 게시 요청 전/중/후 중 어디서 실패했는지 기존 R50 오류 로그만으로는 알 수 없다. **0건·일부·8건 전부 저장 가능성을 열어 둔 STATE_UNKNOWN**. R50 재실행·기존 writer 일괄 재게시·테이블/캐시 초기화 금지. source 및 임시 mock PASS는 Production 성공 증거 아님.
- **R51 읽기 전용 재조회기:** `scripts/iran-progress/news-metadata-readback-r51.mjs`. 원본 R46/R49 로그 및 실제 R50 STOP 로그를 검사, 현재 D1 R1 snapshot SHA256·storedAt을 이전 R48 확인값과 비교, 39개 archive 기사 ID/source/URL 멤버십, 최신 R41 전체 수, 신규 8개 기사 ID의 존재·출처/URL·제목·발행일·검증 플래그·checked_at을 실제 SELECT로 비교. 결과는 `R50_EIGHT_STORED_READBACK_VERIFIED`, `R50_ZERO_EXPECTED_STORED_NO_RETRY`, `R50_PARTIAL_STORED_NO_RETRY`, 원본 변경 또는 충돌로 구분. 어떤 결과에서도 재게시하지 않음.
- **테스트:** `tests/iran-news-r51-readback.test.mjs` 6개 실제 로컬 Node v22 테스트 **6/6 PASS**, 0/8·3/8·8/8, 이전 불명확 오류 로그 위변조, 신규 항목/원본 변경, R1 변경 감지 검증. 실제 DB readback 완료로 주장하지 않는다.
- **고정 PIN CMD:** `scripts/iran-progress/IRAN_NEWS_R51_READBACK_ONLY_20261029.cmd`. PIN `842f09210f4276de54acfb04e796795a8cbf93e4`; 소스 13개 Git Blob SHA 확인 후 R51 Node mock 테스트→승인 PC Writer 기존 계정으로 D1 SELECT 2종만 실행. R50 승인 환경변수 설정/UPSERT/배포 없음. 로그 `IRAN_NEWS_R51_READBACK_RESULT.txt`; 기존 결과 있으면 재실행 거부.
- **다운로드 보강:** `R51_READBACK.zip`에 R51 CMD 및 기존 R46, R49, R50 불명확 결과 TXT 3개를 원본 그대로 포함하여 별도 수동 파일 이동 불필요. ZIP CRC PASS, ZIP CMD와 GitHub blob 동일성 PASS, PIN의 13개 소스 Blob SHA **13/13 PASS**.
- **NEXT:** PC R51 단일 read-only 실행 결과 받아 실제 D1 저장 상태 판정. 8/8 보존 성공이면 게시 재실행 금지 및 최신 main 대비 최소 파일만 반영해 Cloudflare Git Integration/사이트 UI 확인. 0/8 또는 일부/충돌이면 FIRST FAIL 자료로 추적하고 운영 쓰기 실행 여부는 다시 평가. 백그라운드 자동 재시도 금지.


## 15. R51 운영 원격 재조회 결과 0/8, R52 단계별 읽기 전용 원인 진단 (2026-10-29)

- **실제 PC R51 증거:** `IRAN_NEWS_R51_READBACK_RESULT.txt`, Git pin `842f09210f4276de54acfb04e796795a8cbf93e4`, 소스 13/13 검증, fixture Node **6/6 PASS**, 실제 remote D1 `R50_ZERO_EXPECTED_STORED_NO_RETRY`. 총 **41행**, 초기 원본 39개 URL/ID **39/39 보존**, 누락 0, 변경 0, R50 기대 신규 **8개 중 실제 저장 0개**, Arab News 전체 0행, R1 기존 SHA/storedAt 일치. 결과 `R51_NODE_EXIT=2`는 D1 조회 실패가 아니라 **기대 8개가 저장되지 않은 상태**를 알리는 리뷰 종료.
- **R50 본 오류의 FIRST FAIL:** `STEP_2=ONE_TIME_APPROVED_R41_D1_INCREMENTAL_PUBLISH` 뒤 구체적 예외가 `R50_WRITE_OR_READBACK_OUTCOME_UNKNOWN` 하나로 마스킹됨. 현재 데이터는 0/8이지만 **문제의 최초 예외 발생 지점은 확정되지 않음**. 0개 저장을 인증 오류·쓰기 오류로 단정 금지. 승인 없는 반복 게시 금지.
- **R52:** `scripts/iran-progress/news-r50-failure-readonly-r52.mjs`와 `tests/iran-news-r52-prewrite.test.mjs` 추가. 실 원본 R46/R49/R50/R51 증거를 대조하고, R50의 신규 8개 R41 유효성, R47 preflight(39개 archive·R1·ID 검증), 현 D1 41행+중복 0, R1 SHA/storedAt, 기존 D1 adapter의 신규 ID SELECT 호환성을 **순서대로 재현**한다. 실패 시 안전한 `firstFail`/코드, 성공 시 `PREWRITE_CURRENTLY_PASS_R50_CAUSE_NOT_YET_PROVEN` 반환. 어떠한 D1 mutation API도 실행하지 않음.
- **R52 실행기:** `scripts/iran-progress/IRAN_NEWS_R52_READONLY_DIAG_20261029.cmd`. 고정 PIN `c35c8caf5c2d11f107f99c7f78cb987d7c43ab87`, 필수 원격 소스 15개 Git Blob 확인(연결 소스 정적 SHA 15/15 일치), Node 회귀 테스트 및 PC D1 SELECT 진단. 결과 파일 `IRAN_NEWS_R52_PREWRITE_DIAG_RESULT.txt` 신규 생성; 기존 로그 덮어쓰기·자동 재실행 금지. 사용자에게 제공한 `R52_DIAG.zip`에는 CMD + 원본 R46/R49/R50/R51 TXT 4개를 묶었으며 ZIP CRC, CMD Git Blob SHA 일치 확인됨.
- **검증 상태:** R52 소스/테스트 GitHub 반영 및 ZIP 검증 완료. R52 신규 5개 테스트는 **실제 PC에서 아직 미실행**, D1 R52 조회도 미실행. R51 0/8 실측만 PASS. D1 쓰기·main 병합·배포 미실행.
- **NEXT:** R52 실결과의 단계별 `firstFail` 확인 → 정확한 최초 실패 코드와 영향 범위만 최소 수정 → R51의 0/8 저장 상태 재확인 후 별도 승인된 신규 1회성 게시로 재개. 운영 source/계정/D1·R1 보존을 유지하고 실패 원인 없이는 R50 CMD 재실행 금지.

## 16. R53 — 11개 매체 D1 스키마 확장 승인 및 안전 실행 준비 (2026-10-29)

- **사용자 승인:** R41 기존 테이블의 허용 매체를 기존 7개에서 Reuters/AP/Arab News/Anadolu 포함 11개로 확장하는 A안을 승인함. 별도 브랜치를 만들지 않음. 원본 기사·R1·점수·정규 수집 주기·배포는 변경하지 않음.
- **확인된 코드 결함:** R41 최초 D1 생성 SQL `db/migrations/iran-news-r41/0001_article_metadata.sql`은 `source_id CHECK IN(기존 7개)`이고 R45/R50 신규 기사 `source_id=arabnews`를 사용함. 기존 모의 R50 테스트는 실제 7개 제한 스키마가 없어 놓쳤음. 동일 원본 SQL의 메모리 DB에서 Arab News INSERT 실패 및 0행을 재현했지만 **운영 D1 테이블의 실제 정의는 미조회**이므로 Root Cause 최종 확정은 R53 preflight 대기.
- **R53 코드:** `scripts/iran-progress/news-metadata-schema-expand-r53.mjs`은 현재 D1 `sqlite_master` 스키마/인덱스/뷰, R41 기존 행 전체, 최초 R41 manifest 39개 ID/source/URL/title/발행일, R1 body hash/storedAt을 **SELECT만**으로 검증한다. 예상 7개 스키마와 다르거나 예기치 않은 의존 객체가 있으면 mutation 전 중단. 11개로 이미 확장된 상태이면 검증만 하고 재쓰기하지 않음.
- **승인 범위 쓰기:** 정상 7개 스키마면 운영 PC `E:\\ZGmini\\data\\pc-writer\\schema-backups`에 기존 전행+R1 백업을 `wx`로 생성한 후 사전 재조회로 drift 방지. D1 **한 배치** 안에서 신규 11개 허용 테이블 생성→기존 전행 복사→기존 R41 테이블 교체→원래 인덱스 재생성. 마지막으로 모든 기존 ID/10개 필드와 R1 hash/storedAt 불변을 재조회. 실패·쓰기 결과 불명확 시 자동 재시도 금지, 원격 readback 먼저.
- **실제 스키마 테스트:** `tests/iran-news-r53-schema-expand.test.mjs`는 원본 `0001_article_metadata.sql`을 직접 사용하는 메모리 DB와 41개 기존 행 fixture로 검증. 원래 Arab News 거부, 7→11 전환 및 원본/R1 보존, 재실행 무쓰기, 트리거/원본 변경 가드, D1 배치 명령 순서 **6/6 PASS (로컬 Node 24, fixture)**. PC Node 22와 운영 D1 실행은 아직 미검증.
- **PC 단일 실행기:** `scripts/iran-progress/IRAN_NEWS_R53_SCHEMA_EXPAND_ONCE_20261029.cmd`은 고정 소스 SHA `26521032c1041ac51d61c4b9b7ed1b35514bf8e5`의 7개 파일을 Git Blob 검증한 뒤 Node 6개 테스트→D1 read-only preflight→승인 범위의 정확히 한 번의 구조 변경과 post-readback을 실행. 결과 `IRAN_NEWS_R53_SCHEMA_EXPAND_RESULT.txt`; 기존 파일이 있으면 재실행 차단. 원본 R46/R49/R50/R51 로그를 별도로 옮길 필요 없음.
- **상태:** SOURCE/LOCAL_FIXTURE_PASS, **PC_RUNTIME_PENDING**, **D1_SCHEMA_UNCHANGED**, 신규 Arab News **0/8** 상태 유지. R53 마이그레이션 성공은 뉴스 8건 게시·사이트 배포 성공이 아님.
- **NEXT:** 사용자의 R53 CMD 단일 실행 결과 TXT 확인. 운영 D1 스키마 11개·기존 41건/R1 보존 readback PASS인 경우에만 R51 0/8 재확인 후 기존 R50을 무조건 재실행하지 않고 승인된 후속 신규 기사 게시 경로를 설계한다. 기존 7개 소스/11개 API UI와 latest main 파일별 drift를 확인해 선택 반영·실제 공개 검증.

- **다운로드 패키지:** `scripts/iran-progress/IRAN_NEWS_R53_SCHEMA_EXPAND_ONCE_20261029.zip`은 위 고정 PIN CMD 1개만 포함하는 ZIP으로, 압축 테스트 PASS. 소스 7개는 CMD가 검증된 GitHub commit에서 직접 내려받는다. 이전 R46/R49/R50/R51 로그를 포함하지 않아도 된다.

## 17. R53 PC 운영 실행 결과와 R54 후속 경계 (2026-10-29)

- **실제 PC 로그:** 사용자가 제출한 `IRAN_NEWS_R53_SCHEMA_EXPAND_RESULT.txt`에서 `SOURCE_FILES=7_VERIFIED`, `R53_TESTS=PASS` (6/6), `FINAL_STATUS=R53_11_SOURCE_SCHEMA_VERIFIED` 확인. 구 R41 D1 실제 정의는 7개 `source_id` 허용(`SEVEN_SCHEMA_CONFIRMED`)이었으며 승인된 1회성 스키마 확장이 실행됨(`d1Written=true`).
- **D1 post-readback:** `ELEVEN_SOURCE_SCHEMA_VERIFIED`, 11개 source_id(`tasnim`, `govuk`, `guardian-iran`, `dw-world`, `bbc-middle-east`, `aljazeera`, `un-middle-east`, `reuters`, `ap`, `arabnews`, `anadolu`), `beforeRows=44`, `afterRows=44`, `archive39Verified=true`, `r1Preserved=true`. 즉 **기존 데이터 44건 보존과 스키마 확장까지 운영 검증 완료**. R51 과거 시점은 41건이었으며 이번 실행 전 44건으로 증가; 이 증가가 R53 쓰기 때문은 아님.
- **확정한 원인 범위:** 원본 7개 CHECK가 `arabnews`를 거부하는 실제 운영 제약이었음은 확정. 다만 R50에서 마스킹된 최초 예외의 정확한 위치 자체는 미확정이며 오류를 단정하지 않는다.
- **미완료:** R53은 기사 INSERT를 수행하지 않았으므로 Arab News 목표 8건에 대한 현재 membership, 게시 결과, API/UI 반영을 **아직 확인하지 않음**. 과거 R51의 0/8을 오늘의 0/8로 간주하지 않는다.
- **R54 필수 순서:** D1 현재 8개 ID membership와 기존 행/R1 read-only 재조회 → 현재 존재하는 신규 ID는 재작성 금지 → 아직 없는 승인 8건만 기존 R46 원본 증거를 재사용하는 bounded one-shot 게시(필요 시 명시적 재승인) → D1 전체 보존/8개 ID/중복 0 remote readback → 공개 API/UI 확인. R50 기존 CMD 무조건 재실행 금지. unknown write outcome에는 자동 재시도 금지. 신규 schema/산식·배포·스케줄러 변경 금지.

## 18. R54 — R53 완료 이후 신규 8건 제한적 D1 게시 준비 (2026-10-29)

- **현 운영 증거:** 사용자 R53 제출 로그에서 D1 7→11 허용 소스 전환, 게시 전후 **44→44건**, 원본 39건/R1 보존 PASS. 8건의 **현재 membership는 아직 미조회**. R51의 과거 0/8을 현 상태로 확정 금지.
- **구현:** `scripts/iran-progress/news-metadata-publish-r54.mjs` 신설. R53 실제 11개 CHECK·39건 보존·R1을 SELECT로 확인, R46 8건과 R49 증거를 원형 그대로 검증, 현 D1 정확한 8개 ID를 재조회. 전부 미저장이면 직전 재조회로 schema/rows/R1 drift 방지 후 **plain INSERT 8개를 하나의 D1 요청으로 실행**. ON CONFLICT UPDATE 없음. 이미 8/8 저장이면 무쓰기, 부분 저장·기존 동일 ID 내용 충돌·R1/원본 변경이면 무쓰기 STOP. INSERT 결과 불명확 시 자동 재시도 금지; remote readback 먼저.
- **동일 브랜치 테스트:** `tests/iran-news-r54-publish.test.mjs`, 메모리 실제 11-ID SQLite schema 기반 **8/8 PASS (Node 24 fixture)**. 44→52과 기존 44/R1 무변경, 8건 이미 존재하면 no-op, 1건만 있으면 차단, 구 7-ID schema 차단, R1 drift 차단, 동시 unique 충돌의 D1 배치 rollback 재현. 실제 PC Node/Cloudflare D1 미실행이므로 운영 PASS로 확대하지 않음.
- **PC 실행기:** `scripts/iran-progress/IRAN_NEWS_R54_EIGHT_PUBLISH_ONCE_20261029.cmd`와 `.zip`(CMD 1개, ZIP CRC PASS). 고정 소스 PIN `d4b9630dda46fd721a38358b0237afd4632b4765`, Git Blob 14개 검사 → 8개 테스트 → 현재 D1 11개 스키마 읽기 전용 확인 → 원본 R46/R49 로그로 8개 정확 ID 재조회 → 조건 충족 시 1회 D1 INSERT/readback. 이전 R50 CMD 실행 금지. 이전 R50 복구용 폴더의 `IRAN_NEWS_R45_R46_TEST_RESULT.txt`와 `IRAN_NEWS_R49_MEMBERSHIP_PREFLIGHT_RESULT.txt`를 **같은 폴더**에 두어야 하며 로그 내용은 Git에 올리지 않음.
- **중복 실행 방지:** `IRAN_NEWS_R54_EIGHT_PUBLISH_RESULT.txt`가 이미 있으면 CMD는 작업 전에 중단. 쓰기 이후 오류는 저장 여부가 불명확할 수 있으므로, 임의 재실행 없이 결과 제출 후 원격 readback으로 판단.
- **현 상태:** R54 SOURCE/LOCAL_TEST_PASS, GITHUB_BRANCH_REFLECTED, **PC_RUNTIME_PENDING**, **R54_D1_WRITE_NOT_EXECUTED**, API/UI/Production 검증 대기. 기존 main/Production 자동 변경 없음. R54 로컬 실행 후 D1 결과 및 사이트 실제 노출을 후속 검증한다.

## 19. R54 실제 PC 읽기 전용 결과 및 R55 자기완결 복구 ZIP (2026-10-29)

- **R54 실로그:** 사용자 제공 `IRAN_NEWS_R54_EIGHT_PUBLISH_RESULT.txt`; 고정 PIN `d4b9630dda46fd721a38358b0237afd4632b4765`, 소스 14/14 검증, Node SQLite 테스트 **8/8 PASS**, 실제 D1 `SCHEMA_VERIFIED_EIGHT_IDS_UNCHECKED`, `existingRows=44`, `arabNewsRows=0`, 최초 39건/R1 보존. `FINAL_STATUS=R46_EVIDENCE_MISSING_NO_WRITE`. **D1 쓰기 단계는 진입하지 않음.** Arab News 전체 0행이지만 정확한 8개 ID membership은 아직 R54에서 확인되지 않음.
- **실패 원인:** R54 ZIP은 CMD만 포함하여 필수 R46/R49 원본 TXT가 같은 폴더에 없어 안전 중단한 **실행 패키징·의존 파일 배치 문제**. 원본 11매체 D1 스키마·Node 테스트는 정상. 기존 R54 CMD 재실행 금지.
- **과거 검증 파일 회수:** 사용자가 과거 제출한 R46·R49 라이브러리 보존본을 동일한 파일명으로 회수. 기존 R47/R50 검증 파서에 넣어 **R46 8건, R49 기대 8건, checkedAt 일치, 기준 39건** 확인. 이 원본 로그를 공개 Git 저장소에는 올리지 않음.
- **R55:** `scripts/iran-progress/IRAN_NEWS_R55_RECOVERY_PUBLISH_ONCE_20261029.cmd`를 **같은 브랜치**에 추가. 이전 R54 pre-write 결과의 SHA256 및 R46/R49 두 증거 SHA256 3개를 개별 확인하고, R54 동일 PIN 소스 14개 Git Blob·테스트 8개·D1 11 ID read-only·실제 신규 8 ID membership 순으로 검증. 전부 미저장일 때만 기존 R54 구현의 단일 D1 INSERT 8건과 원격 readback으로 진행; 이미 전부 저장/부분 저장/불일치면 무쓰기 또는 STOP. 새 결과 `IRAN_NEWS_R55_RECOVERY_PUBLISH_RESULT.txt`로 분리하여 과거 실패 기록을 보존.
- **ZIP 배포:** `IRAN_NEWS_R55_RECOVERY_COMPLETE_20261029.zip`에 R55 CMD 및 R54 실패 로그, R46/R49 원본 TXT **4개 파일**을 포함하고 ZIP CRC 전체 PASS. ZIP은 원본 증거를 포함하므로 **GitHub에는 올리지 않고 사용자 파일 다운로드로 제공**. 새 빈 폴더에 압축을 푼 뒤 R55 CMD만 1회 실행.
- **현재 상태:** R55 소스/원본 증거 파서/패키지 검증 완료, **R55 PC_RUNTIME_PENDING**, **신규 8건 D1 게시 미실행**, API·UI 반영 대기. 실패하면 재실행 없이 결과를 먼저 원격 재조회해 판단.
