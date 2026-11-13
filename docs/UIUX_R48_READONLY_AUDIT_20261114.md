# ZGMINI UIUX 48차 — 소스 검증 및 Production 미검증 증거

- 기준: 2026-11-14 KST, UIUX 전담 `codex/ui-improvements-2`
- 원본 지시: [제어 #68 댓글 6863150401](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863150401)
- 시작/종료 **전체 화면 검증률 25% → 25%**. 이번에 완료한 **13/13은 GitHub source-only 정적 계약 검사**이며 새로운 Production 화면 8/8 PASS가 아니다.
- 현행 기능 `main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`; 검사 전 전용 UI 브랜치 HEAD `0969e4833c0c8d7495d138854e978a6c07a68c30`, `main` 대비 `ahead 310 / behind 468` — 전역 merge/rebase/강제 정리 금지.

## 1. 기존 공용 실증에서 재사용한 Production API 값 (이번 재조회 아님)

위 원장 #68에서 API 담당의 이전 독립 검증을 재사용: 원본 다섯 endpoint 중 4개 HTTP 200, 테마 1개 HTTP 503. 물가 점수 API 원문 `57.51884273397442`, 표시 계약 소수 첫째 자리 **57.5**. 물가 연구 19개 READY19, 신규 7개 READY4/PENDING3(#22/#23/#28); 달력 2,358건/Treasury 894건과 `fed_fomc=SOURCE_FAILED`, 테마 `STORED_DATA_STALE/themes=[]`, 고용 raw READY22/STALE7, score READY28/PARTIAL_HISTORY1. 이 데이터는 **2026-11-14 기준 #68 인용 당시 검증 결과**로, 이번 세션의 신규 동시 관측값이나 D1 row 재조회는 아님. D1 직접 비교와 exact 배포 SHA는 원장 기준 UNVERIFIED.

## 2. 이번에 실제 실행한 13개 독립 GitHub 정적 계약 검사

`mcp__GitHub__fetch_file(ref=main)`에서 7개 소스를 읽어 JavaScript Boolean assertions로 검사. 13/13 PASS. **Node 테스트 suite, Playwright, Production 페이지 렌더, 실제 현재 D1 또는 Cloudflare Deployment 검사는 수행하지 않음.**

| # | 검사 항목 | 결과 |
|---|---|---|
| 1 | `app/economic-indicators/employment/page.tsx` 정규 경로 `/economic-indicators/employment/` | PASS |
| 2 | `economic-detail-panel.tsx` 고용 R6 29개 고정 목록 렌더 계약 | PASS |
| 3 | 고용 `rawStatus=STALE` 관측값과 `scoreStatus=READY` 평가 분리 | PASS |
| 4 | `READY` 아닌 고용 도메인 점수는 `null`, 임의 0점 미표시 | PASS |
| 5 | `57.51884273397442.toFixed(1) == 57.5` 및 UI `score.toFixed(1)` | PASS |
| 6 | 테마 탐색기 primary API 오류/비READY 시 cached legacy score 억제 | PASS |
| 7 | 테마 차트 허용 목록은 `feed.status===READY` | PASS |
| 8 | 공용 저장 훅 503 `STALE/EXPIRED` 시 `setPayload(null)` | PASS |
| 9 | 테마 차트 primary 오류 시 base feed 폐기 | PASS |
| 10 | 별도 `/api/theme-configured`의 독립 READY 합성은 primary 503과 구별 | PASS |
| 11 | 캘린더 `source.status===READY` 및 48h `checkedAt` freshness 조건 | PASS |
| 12 | 캘린더 저장본 미확정/조회 실패/로딩 안내 문구 분리 | PASS |
| 13 | 캘린더 클라이언트 `/api/release-calendar` GET `cache:no-store` | PASS |

사용된 GitHub main 파일 blob SHA:

- `app/economic-indicators/employment/page.tsx`: `71fbe4b37ecc4445eb81650a9164a74db4d83db2`
- `app/economic-indicators/economic-detail-panel.tsx`: `ad83fdf5e223d4f0bb204b4c7fd1a41acd21d45a`
- `app/theme-fear-greed/theme-detail-charts.tsx`: `ce8889cb46cc5398e426ea872ee5b675ed10936b`
- `app/theme-fear-greed/theme-explorer.tsx`: `892aae2dc7235b3da3dc969eca475017fc646838`
- `components/use-stored-index.ts`: `1e9f630e785ccc8e38f449c685a0977586072d1e`
- `app/market-calendar/market-calendar-client.tsx`: `f95ffd7d78270578eeabc8ca5ffa028f3e670263`
- `lib/theme-configured-merge.mjs`: `bb9f96be3698436e24e62c15335af2fcd5d6c224`

## 3. 화면별 실측과 위험 분류

| 페이지 | PC 1440px | 모바일 390px | API 동시 대조 | 본 차수 UI 오류 |
|---|---|---|---|---|
| `/economic-indicators/inflation/` | UNVERIFIED | UNVERIFIED | 57.5 소스 반올림만 검증 | 확정 0 |
| `/market-calendar/` | UNVERIFIED | UNVERIFIED | FOMC 실패는 공급자 상태 | 확정 0 |
| `/theme-fear-greed/` | UNVERIFIED | UNVERIFIED | Primary 503 stale. 별도 configured-feed 가능성 분리 | 확정 0 |
| `/economic-indicators/employment/` | UNVERIFIED | UNVERIFIED | 고용 raw/score 분리 소스 계약 확인 | 확정 0 |

실제 viewport 8개, 가로 scrollWidth, 로딩·차트 축·마지막 점·관측/게시일·`sourceStoredAt`·stale 표기 **실측 증거 0/8**. 과거 `/employment/` 404는 잘못된 경로로 인한 응답이며 UI 결함으로 세지 않음.

공식 Production 접근 차단: 전용 Browser Use 가용 크레딧 부족(추가 결제/우회 금지), 연결된 브라우저의 페이지 권한/Host 제한, 이번 공개 웹 조회에서 API 접근 불가, 로컬 격리 환경 `zgmini.kr` DNS 해석 실패. 이는 Production 4페이지 자체 장애나 API 데이터 오류라는 증거가 아님.

`.github/workflows/community-chat-browser.yml`와 `tests/employment-r6-public-browser-r1.mjs`에는 1440/390px 브라우저 테스트·PNG 저장 경로가 **존재**하지만 `localhost:5173` + route.fulfill(Mock API) 기반으로 **실제 Production 캡처가 아니다**. 기존 CI/mock 증거로 라이브 화면 PASS를 대체하지 않음.

## 4. 결정·변경·재개

- **이번 확정 UI 버그: 0개.** 수정한 UI 소스: 없음, 신규 UI PR/CI: 없음, Production 배포: 없음. 공통 API/DB/Controller/Writer/예약 변경: 없음.
- 현행 main과 전용 UI 브랜치가 크게 분기했으므로 선택적 코드 변경이 발생해도 최신 main 기준 차이 검증 후에만 PR, 브랜치 전체 병합 금지.
- **다음 필수 작업 하나 (증거 실행 담당):** 추가 비용 없는 **기존 승인된** 라이브 브라우저 캡처 경로가 실제 사용 가능한 시점에 네 페이지를 1440px·390px에서 캡처하여 원본 PNG **8/8**과 같은 시각 네 페이지의 실제 API JSON(상태·점수·단위·관측일·게시일·`sourceStoredAt` 포함)을 회수·독립 검수한다. 현재 권한/연결 문제가 그대로면 해당 UI 실측만 `AUTOMATION_BLOCKED`, 종전 HTTP 200·API 검증은 보존. 유료 충전/보안 차단 우회/사용자 수동 CMD/RDC 사용 금지.
