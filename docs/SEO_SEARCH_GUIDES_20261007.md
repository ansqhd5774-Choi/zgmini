# 검색 질문 안내 페이지 적용

기준 소스: origin/main 441a2c476d1d79d279d593a3134bb0072ef0f671. 대시보드·공유 차트 CSS·산식·API·DB·수집 계약은 변경하지 않는다.

## 키워드와 우선순위

2026-10-07 Windsor Search Console 조회 범위 2026-09-07~10-06: 검색어별 반환 0행. 기존 일별 노출 합계 4회·클릭 0회(자료 제공 범위 10-04까지)는 매우 작은 표본이다. 실제 검색어와 검색량으로 우선순위를 확정할 수 없다. 아래는 제공 가능한 정보와 질문 대응을 기준으로 한 임시 우선순위다. 검색량·경쟁도 점수는 만들지 않았다.

| 순서 | 검색 질문 | 페이지 | 선정 근거 |
|---|---|---|---|
| 1 | 공포탐욕지수 매수 기준, 지금 주식 사도 될까 | /guides/fear-greed-buying/ | 기존 공탐 데이터와 연결 가능. 검색 결과에는 암호화폐 대상 가이드도 있어 주식 대상·지수 차이를 명시 |
| 2 | CPI 발표시간, CPI 예상치 대비 결과, PCE 발표시간 | /guides/cpi-pce-release/ | 공식 일정·발표 원문 확보. 기존 물가 페이지와 연결 |
| 3 | FOMC 일정, 미국 기준금리 발표시간 | /guides/fomc/ | 연준 달력·성명 확보. 물가·경기 상세와 연결 |

검색 결과 비교는 검색량 측정이나 객관적인 경쟁 난이도 점수가 아니다. 질문별 검색 수요는 Search Console 표본 축적 또는 승인된 검색량 자료 확보 후 다시 평가한다.

## 공식 자료와 게시 방식

- BLS: https://www.bls.gov/schedule/news_release/cpi.htm 및 https://www.bls.gov/news.release/archives/cpi_09112026.htm
- BEA: https://www.bea.gov/news/schedule 및 https://www.bea.gov/news/2026/personal-income-and-outlays-august-2026
- 연준: https://www.federalreserve.gov/newsevents/2026-october.htm 및 https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm
- 날짜·공식 발표값은 2026-10-07에 확인한 수동 스냅샷. 자동 수집·최신 보장 아님. 페이지에도 확인일과 갱신 한계를 명시한다.
- CPI/PCE 이전 값은 같은 공식 8월 발표 자료의 7월값. 전월 대비 단위와 근원/전체를 구분한다.
- 시장 예상치는 제공원·이용 조건 미확보로 미제공. 공식 발표값·직전값·점수로 대신 표시하지 않는다.
- 신규 3개 URL을 정적 HTML/RSC 생성 허용 목록에 추가하고 중첩 경로 저장을 지원한다. 신규 URL만 사이트맵에 추가한다.

## 남은 항목

NON_BLOCKING / DEFERRED: 검증된 예상치 제공원, 자동 공식 일정·발표값 갱신, 실제 검색량 기반 우선순위, 배포 후 검색어 성과 평가. 데이터 수집 인프라 변경은 이번 패치에 포함하지 않는다.

배포 후 첫 28일과 다음 28일의 새 페이지별 노출·클릭·검색어·순위·색인 상태를 비교한다. 첫 관측 시작일은 실제 배포 다음 날로 정한다. 반복 실행이나 알림 자동화는 생성하지 않았다. CTR은 클릭 합계/노출 합계로 계산하며 노출 0은 평가 불가로 구분한다. 표본이 없거나 작으면 제목 수정의 성공·실패를 단정하지 않는다.

## 이번 실행 검증

- 로컬 컴파일: `node node_modules/vite/bin/vite.js build --config vite.candidate-prerender-r7.config.ts` PASS.
- 로컬 compiled Workerd: `--compatibility-date 2026-05-22`로 실행. 설치된 로컬 바이너리의 지원 날짜 때문에 개발 검증 시에만 덮어썼으며 Production 호환성 설정은 변경하지 않았다.
- `ZGMINI_LOCAL_RENDER_URL=http://127.0.0.1:8798`을 지정해 `node --test tests/search-guide-render.test.mjs scripts/candidate-shell-r7.test.mjs` 실행: 5/5 PASS. 통합 검사는 로컬 renderer 주소를 지정한 경우에만 실행되며 일반 검사에서 미실행은 skip이다.
- 공식 일정과 수동 스냅샷의 이전·발표값을 BLS/BEA/연준 원문으로 확인.
- 로컬 compiled renderer로 기존 9개와 신규 3개, 총 12개 HTML/RSC shell 생성 및 중첩 디렉터리 저장 확인 PASS.
- IAB에서 3개 안내 페이지를 각각 1440px·390px 폭으로 검사: 문서 가로 넘침 없음. CPI/PCE 표는 모바일에서 자체 가로 스크롤 영역으로 제공한다.
- 대시보드 소스·차트·공유 CSS 변경 없음. `git diff --check` PASS.
- Hosted Build / Production 배포 / Production 새 페이지 Runtime: 이 구현 단계에서는 미실행. 검색 상승 효과는 미검증.
