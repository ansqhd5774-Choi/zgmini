# R39 — 독립 서버 뉴스 수집 읽기 테스트 (2026-10-29)

## 목적 및 승인 범위

- 개발 브랜치: `codex/outbreak-iran-news-retention-r1-20261026`만 사용한다.
- 기존 PC 수집기·R3/R5 점수·Windows 예약 작업·Cloudflare Cron·Queue·D1 공개 스냅샷은 변경하지 않는다.
- 현재 운영 게시기는 단일 D1 스냅샷(`public:iran-progress:news:iran:r1`)을 통째로 갱신한다.
  새 서버 수집기에서 이 게시 경로를 직접 사용하지 않는다.
- 1차 키워드(이란·후티·사우디·예멘/예맨) 한 개 이상, 2차 키워드
  (전쟁·합의·휴전·협상·진전) 한 개 이상으로 관련성을 검사한다.
- 날짜·제목·원문 URL·본문 확인은 데이터 증거이며 관련성 필터가 아니다.

## 구현: 별도 읽기 전용 Worker 모듈

`worker/iran-news-server-shadow-r39.mjs`의 `probeIranNewsServerR39`는
기존 R24(출처별 후보 발견)와 R25(발행일·본문·R38 키워드 재검증)를 재사용한다.

- 활성 7개: Tasnim, GOV.UK, Guardian, DW, BBC, Al Jazeera, UN.
- 고정 HTTPS 출처 호스트만 요청하고 리다이렉트는 자동 추적하지 않는다.
- 40회 요청 상한, 최대 21개 기사, 동시 3개 이하 검증. 기본 14개 기사·동시 2개.
- 30일 이내 통과 후보 및 그중 최근 14일 후보를 출처별로 구분한다.
- 원문 본문·자격증명·전체 HTML은 반환하지 않는다. 수집 결과는 메타데이터만 보고한다.
- `handleIranNewsShadowR39`는 충분한 길이의 서버 비밀값이 없으면
  `/internal/iran-news-shadow-r39`를 호출해도 원문 fetch를 실행하지 않는다.
- `d1Written:false`, `publicSnapshotModified:false`,
  `pcRunnerModified:false`, `schedulerModified:false`, `scoreLedgerModified:false`.
- 현재 Workers 진입점·라우트·자동 예약·D1 스키마·배포 설정에 **연결하지 않았다**.

## 읽기 테스트의 한계 (정직한 상태 기록)

- R24 피드 발견은 1차 키워드가 제목·요약에 있는 URL을 우선 선택한다.
  본문에만 1차 키워드가 있는 기사 전체를 발견했다고 주장하지 않는다.
- 표본 최대 21개 기사로 7개 출처의 30일 전체 기사를 증명할 수 없다.
- Node 모의 응답 기반 테스트는 Cloudflare Worker 실제 네트워크 접근 증명이 아니다.
- 독립 Worker 배포·Cloudflare 빌드·서버 원문 접근·D1 게시·UI 확인은 아직 실행하지 않았다.
- `REVIEW_REQUIRED`도 공개 권리·사용자 게시 승인·본문 번역을 자동으로 의미하지 않는다.

## 운영 배포 전 필수 게이트

1. Worker 호환 빌드 및 7개 매체별 실제 Cloudflare 네트워크 fetch 증거.
2. 1차 키워드가 원문 본문에만 등장하는 기사 발견 누락을 피하는 범위 검증.
3. 별도 뉴스 전용 저장 공간, 원문 URL 기준 중복 방지, 유효기간 및 날짜 검증.
4. 공개용 데이터 검증 및 권리·사용자 결정 경로; 기존 R1 GOV.UK 단독 계약을
   그대로 7개 매체 공개 PASS로 처리하지 않는다.
5. 기존 공개 D1 행의 백업·충돌 방지·read-back, 새 공개 reader 호환 테스트.
6. 운영 `main`에 필요한 코드만 selective promotion 후 Cloudflare exact build,
   deployment, runtime, 7개 출처·실제 UI 검증.
7. 두 차례 정상 수집·게시를 증명하기 전에는 기존 PC 뉴스 운영을 제거하지 않는다.

## 검증

- `node --test tests/iran-news-server-shadow-r39.test.mjs`
- `node --test tests/iran-news-*.test.mjs`
- 모의 데이터에서 7개 출처 원문 메타데이터와 R38 두 단계 필터 모두 통과.
- 하나의 출처 실패 시 `PARTIAL_REVIEW_REQUIRED`; 인증 없는 요청에서는 fetch 0건.

## 2026-10-29 공개 피드 실제 조회 증거 (개발 실행 환경)

`node --use-env-proxy`로 **D1 쓰기 없이** 실제 7개 공식 피드를 조회했다.
재현 명령은 `probeIranNewsServerR39({maxArticles:21,concurrency:3})`.

| 출처 | 피드 | 검사 기사 | 14일 적격 | 검증 원문 예시 |
|---|---|---:|---:|---|
| Tasnim | READ | 4 | 1 | [2026-10-28 기사](https://www.tasnimnews.ir/en/news/2026/10/28/3734212/iran-s-foreign-ministry-urges-qatar-to-uphold-requirements-of-mediation) |
| GOV.UK | READ | 3 | 1 | [2026-10-27 성명](https://www.gov.uk/government/speeches/iran-must-allow-the-return-of-iaea-inspectors-to-all-nuclear-sites) |
| Guardian | READ | 3 | 2 | [2026-10-28 기사](https://www.theguardian.com/commentisfree/2026/oct/28/donald-trump-iran-midterms-politics-diplomacy) |
| DW | READ | 2 | 2 | [2026-10-28 기사](https://www.dw.com/en/is-iran-headed-to-war-or-peace-after-mecca-alliance-meeting/a-79788256) |
| BBC | READ | 3 | 3 | [2026-10-26 기사](https://www.bbc.co.uk/news/articles/c9p8g7e4k2xjo) |
| Al Jazeera | READ | 3 | 2 | [2026-10-28 기사](https://www.aljazeera.com/news/2026/10/28/are-gcc-countries-looking-for-a-regional-security-pact-with-iran) |
| UN News | READ | 3 | 2 | [2026-10-23 기사](https://news.un.org/en/story/2026/10/1168654) |

- 원문 확인 합계: **21건 검사, 13건 최근 14일 조건 통과**. 이 13건은
  기존 R25의 제목·원문 URL·발행일·본문·R38 2단계 키워드 검사를 통과했다.
- 소스 피드 실패: **0건**, 기사 요청 실패: **0건**.
- 수집 후보 총 **80건** 가운데 **59건은 아직 미검사**이다. 따라서
  전체 수집 누락이 없다는 뜻은 아니다. 상태는 `PARTIAL_REVIEW_REQUIRED`.
- 이는 개발 환경의 실제 네트워크 접근 증거이며 **Cloudflare Worker의 실제
  네트워크·배포·권리 검증·D1 저장·실제 페이지 표시는 여전히 미검증**이다.
- 같은 날 공개 API `https://zgmini.kr/api/outbreak-news/iran` 읽기 결과는
  `IRAN_NEWS_DISPLAY_R1`, 총 **7건, 전부 GOV.UK**. 운영 UI의 7매체 공개와
  이 읽기 전용 진단을 혼동하지 않는다.
