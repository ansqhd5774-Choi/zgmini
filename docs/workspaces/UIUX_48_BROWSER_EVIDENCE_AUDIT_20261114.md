# ZGMINI UIUX — 48차 브라우저 증거 독립 검수
2026-11-14 KST · 담당: UIUX 전문가-codex/ui-improvements-2

## 범위와 이전 완료점
- 기능 저장소: `ansqhd5774-Choi/zgmini`; 기준 `main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`; 작업 브랜치 `codex/ui-improvements` (착수 시 `0969e4833c0c8d7495d138854e978a6c07a68c30`).
- GitHub 비교: 310 ahead / 468 behind. 브랜치 전체 병합·rebase·Production 배포 없음.
- 공통 후속 지시: [Controller 원장 #68 / 48차](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863150401). UIUX 25%를 마지막 유효 완료점으로 보존.
- 기존 공개 HTTP 관측(직전 UIUX 46차): `/inflation/`, `/market-calendar/`, `/theme-fear-greed/`, `/economic-indicators/employment/` 직접 GET 4/4 HTTP 200. 실제 Browser 렌더는 `ERR_SOCKS_CONNECTION_FAILED`로 8/8 UNVERIFIED. 이 문서 작업에서 새로운 라이브 Production 스크린샷 성공을 주장하지 않는다.
- 과거 API 읽기 증거(46차): `/api/inflation-detail` HTTP 200 READY score 57.51884273397442 → 57.5; `/api/theme-fear-greed` HTTP 503 UNAVAILABLE `STORED_DATA_STALE`, `themes=[]`; `/api/release-calendar` PARTIAL `fed_fomc=SOURCE_FAILED`; `/api/employment-r6/observations` PARTIAL 28/29 score, chart 22 READY/5 PARTIAL/2 UNAVAILABLE. 기존 시각의 근거이며 새 실시간 조회 PASS로 표현하지 않는다.

## 이번에 실제 실행한 독립 원본 감사
1. [기존 브라우저 CI Run #42622613765](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42622613765)의 Job `129178312813` 및 Artifact `13676699668`을 GitHub에서 직접 재조회하고 원본 ZIP을 회수했다. 이 CI는 `deploy/dashboard-sector-theme-layout-r1-20261109` / `fdcadc7053dd2fe434ea24e140a71c1b102b19fc` 환경의 **로컬 dev + intercepted/mock API** 테스트다. Production 배포·라이브 점수 검증이 아니다.
2. GitHub 등록 Artifact digest `sha256:3b661c4954a26b05d36d3ef95282645c652dfe9afdd78344649cd6bff1249486`와 다운로드 ZIP 파일의 직접 계산 SHA-256 **일치**. ZIP 전체 57 PNG, 압축 무결성 오류 0.
3. 아래 원본 8개를 압축에서 추출하여 열림·해상도·눈으로 확인했다. 모두 900px 높이의 **중간 스크롤 위치 viewport 캡처**이므로 전체 페이지 완전성 판정에 쓰지 않는다.
   
   | 범위 | 1440px (1440×900) SHA-256 | 390px (390×900) SHA-256 | 검수 |
   | --- | --- | --- | --- |
   | 물가 구성지표 `inflation-criterion-review/inflation-*.png` | `0637c365f6a8b138b9448c364ba4c116455a08aca15bf70047493e9e94718bf8` | `0b95cf919ff0e6de8bea76a9f964ecf4b6c45dc2df73c6810672e29e65297d8f` | 카드/표 전환 확인; 이미지 범위에서는 수치 문구의 강제 잘림 미관측 |
   | 고용 R6 `employment-r6-browser/preview-*.png` | `b4ef9045ecf01dfb6601d9f89b7e0c52d1a29d95e99874cfc347edc9c0fe7c1b` | `81b8a3f7c59388f2862e1fedd3e2897abc21191730c390c420f28bb418b33013` | 29개 구성 중 일부 카드의 모의 `—`/평가 없음 구분 확인; 이미지 범위 내 명백한 가로 잘림 미관측 |
   | 물가 사이드 내비게이션 `risk-detail-side-rails/inflation-*.png` | `c4af9a53e34d74a95b0ac7c16dc19771d1950a9506f8f348ac5e6e8db2ab7b14` | `f1b265dddd6c954296bd87d43cf07d931fe52f3d789d306a91f74183382c703c` | PNG 유효/크기 확인. Production 전체 DOM overflow 결론 아님 |
   | 첫 방문 모달 `about-intro-bootstrap/before-hydration-*.png` | `73f9e8f1388baa4196b96b955322af160598cb242bea731d0075cf0c657a9c13` | `e4bf0bed388339404b14ce94013447fdedc919b125ba3c8f8f076b067fed34ff` | PNG 유효/크기 확인. 실제 Production 오버레이 동작은 미검증 |
4. CI 로그의 물가 1440/390, 고용 1440/390 테스트 PASS를 원문에서 재확인. 전체 CI가 실패한 정확한 단계는 `tests/fear-greed-education-browser-r4.mjs:54`, 30초 `locator.waitFor` 타임아웃, `'.zg-fg-korea .zg-fg-intro'`가 `hidden` 상태. 이 실패를 이 4개 Production 화면 결함으로 확대하지 않는다.
5. 무료 독립 신규 Live Capture 수단: 컨테이너 Chromium/Playwright 자체는 있으나 컨테이너에서 `zgmini.kr` DNS `Could not resolve host`로 접속 불가. 이전 Browser Use는 ZGMINI 및 example.com 양쪽 `ERR_SOCKS_CONNECTION_FAILED`. 연결된 Chrome Browser 읽기 권한 오류도 별도 확인됨. 공개 Web GET 도구는 대상 URL cache miss/unavailable. 단일 경로의 네트워크 권한 문제를 UI 코드 오류로 취급하지 않는다. 반복 과금/유료 충전/추가 불허 도구 사용 없음.

## 48차 화면별 실제 판정
| 화면 | PC 1440 라이브 | 모바일 390 라이브 | 확보한 이번 증거 | UI 코드 수정 |
| --- | --- | --- | --- | --- |
| 물가 `/inflation/` | UNVERIFIED | UNVERIFIED | 기존 CI mock 1440/390 이미지·PASS; 직전 API 57.5 반올림 계약 | 없음 |
| 시장 캘린더 `/market-calendar/` | UNVERIFIED | UNVERIFIED | 이전 HTTP200/API PARTIAL; 이번 라이브 원본 없음 | 없음 |
| 테마 `/theme-fear-greed/` | UNVERIFIED | UNVERIFIED | 이전 HTTP200 + API 503/stale; 이번 라이브 원본 없음 | 없음 |
| 고용 `/economic-indicators/employment/` | UNVERIFIED | UNVERIFIED | 올바른 경로 이전 GET200; 기존 CI mock 1440/390 이미지·PASS | 없음 |

- **검수한 새 증거:** GitHub 원본 CI Artifact의 이미지 무결성/실측 해상도와 해당 실행 로그. **검증하지 못한 범위:** 실제 Production 렌더링의 `scrollWidth/clientWidth`, 차트 축 표시·끝점 위치, API와 라이브 표시값의 동일 시각 대조, sourceStoredAt/게시일.
- **기존 코드 결함 확정:** 0건. 테스트 fixture 화면만으로 디자인 변경·버그fix·PR·배포를 만들지 않는다.
- **실제 진행률:** 25% → 25%; 독립 CI 증거 검수는 신규 완료되었지만 Production 8/8 라이브 검증은 여전히 미완료.
- **운영 변경:** 0. Runner/Controller/PC/DB/D1/Worker/DNS/Production 변경 없음.

## 다음 필수 실행 하나
승인된 **무료** 라이브 브라우저 접근이 정상인 경로에서 4개 정확한 URL × 1440/390 8개 **실제 Production** 캡처를 확보하고, 동일 시각 5개 API JSON과 점수·단위·관측일·sourceStoredAt·게시일·stale/결측·차트 끝점·모바일 overflow를 각각 대조한다. SOCKS/접속 권한이 해소되지 않았으면 `AUTOMATION_BLOCKED`로만 남기고 무관련 운영 복구 대기는 하지 않는다.
