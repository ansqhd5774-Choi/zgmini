# ZGMINI GPT 전용 작업 공간 — 현재 작업 상태

기록일: 2026-10-25 (KST)
저장소: `ansqhd5774-Choi/zgmini`
작업 브랜치: `codex/zgmini-gpt-workspace-20261025`
브랜치 생성 기준 main: `f9312d5069754dc82b4d5a93cc7712dbdac4b640`

> 이 문서는 대화창 교체 시 재개 기준이다. 시점이 변하는 SHA·배포·Runtime 상태는 다음 작업 시작 시 재조회한다. GitHub 최신 main이 개발 기준이며, 작업 브랜치의 오래된 코드를 그대로 운영에 병합하지 않는다.

## 현재 대화의 작업 목표

대시보드 하단의 `주식 투자자를 위한 시장 점검` SEO 안내를 원문·내부 링크를 유지하면서 한 개의 접이식 영역으로 구성한다.

### 사용자 확정 디자인

- 기본 상태: 제목 한 줄만 노출, 클릭 시 전체 펼침·접힘
- 질문·설명 4개: PC 2열 × 2행 카드, 모바일 1열
- 바로가기 8개: PC 4열 × 2행, 모바일 2열 × 4행
- 카드와 바로가기는 **동일한 접이식 영역** 내부에 배치
- 질문·답변 원문과 8개 내부 링크를 최초 HTML에서 보존
- 대시보드에만 적용. 다른 상세 페이지 디자인, 산식, API, DB, 스케줄러, DNS는 변경하지 않는다.

## 확인된 증거

- [x] GitHub PR [#713](https://github.com/ansqhd5774-Choi/zgmini/pull/713)의 변경이 main 커밋 `f9312d5`에 반영됨
- [x] `components/investor-search-guide.tsx`에 `<details>` / `<summary>`, 4개 카드, 8개 바로가기 그리드 구현
- [x] `app/page.tsx`에서 대시보드에 `collapsible` 속성 적용
- [x] `tests/rendered-html.test.mjs`에 기본 HTML의 disclosure/링크 검사 소스 존재
- [x] 별도 작업 브랜치 생성, `docs/handoffs/ZGMINI_GPT_WORK_METHOD_HANDOFF_20261024.md` 원문 일치 확인

### 미검증 상태 (PASS 선언 금지)

- [x] Cloudflare Git Integration의 정확한 Production deployment SHA/상태
- [x] `https://zgmini.kr/` 실제 공개 화면에서 기본 접힘 및 두 번째 클릭 복귀
- [x] PC·모바일 화면의 카드/링크 열 수, 가독성, 가로 넘침
- [x] 공개 서버 HTML에 설명 4개와 내부 링크 8개가 보존됐는지 확인

## 2026-10-25 운영 검증 기록

- **배포 출처**: Cloudflare Workers `zgmini-migration-candidate-r5` / Production / 커스텀 도메인 `zgmini.kr`.
- **정확한 소스**: GitHub `main` 커밋 `f9312d5069754dc82b4d5a93cc7712dbdac4b640`, PR #713.
- **Cloudflare 최신 배포**: 버전 `5065c650`, 상태 `Ready`; [hosted build #31d6fd84](https://dash.cloudflare.com/6e9b57e718b247330a6efa42a9516e95/workers/services/view/zgmini-migration-candidate-r5/production/builds/31d6fd84-0f99-49ec-b5f7-98524b72d26d)에서 `main`과 위 커밋 확인.
- **공개 HTTP**: `https://zgmini.kr/` GET 200.
- **서버 원본 HTML**: `<details>` 기본 접힘, `<summary>` 1개, 질문 카드 `<article>` 4개, `<a>` 8개, 질문 원문 4개 존재 확인.
- **실제 브라우저 상호작용**: 첫 클릭 펼침, 다음 클릭 접힘, 다시 펼침 확인.
- **PC 1280px**: 카드 2열, 링크 4열, 링크 높이 36px, 전체 문서 가로 넘침 없음.
- **모바일 390px**: 카드 1열, 링크 2열, 카드/버튼 개별 가로 넘침 없음. 보이는 문서 너비 375px / viewport 390px.
- **변경**: 운영 코드·산식·DB·API·DNS·Scheduler 변경 0. 이번 실행은 읽기 전용 검증과 브랜치 문서 기록만 수행함.
- **결론**: 대시보드 SEO 안내 개선 요청 범위 **PRODUCTION_VERIFIED**. 이 작업을 이유로 재배포하지 않는다.

## 다음 실행

1. 대시보드 SEO 접이식 안내는 검증 완료. 추가 변경 지시가 없으면 재작업하지 않는다.
2. 다음 사용자 요청 시 신규 범위를 별도로 확정하고 최신 `main` 및 이 전용 브랜치 기록을 확인한다.
3. 새로운 작업마다 실행 증거와 완료/미완료/다음 실행 항목을 별도 섹션에 지속 갱신한다.

## 참고 문서와 범위 주의

- [2026-10-24 작업 방식 인수인계서](./ZGMINI_GPT_WORK_METHOD_HANDOFF_20261024.md)는 범용 운영 절차와 당시 경제지표 표 디자인을 포함하는 역사 자료다.
- 그 문서에 쓰인 경제지표 표 디자인은 현재 대시보드 SEO 안내와 **다른 작업**이다. 작업 대상을 임의 전환하지 않는다.
- 모든 변경은 승인 범위에 한정하며, `main` 병합·배포 성공과 소스 커밋 완료를 동일시하지 않는다.

## 2026-10-25 섹터 차트 최고점 기본 선택 (후속 작업)

- 사용자 요청: 대시보드 섹터 공탐 기본 ON을 최저점(통신 23)이 아닌 최고점(예: 에너지 78)으로 변경.
- 원인: `components/sector-sentiment-chart.tsx`에서 내림차순 정렬된 `legendSeries.at(-1)`로 가장 낮은 섹터를 자동 활성화했음.
- 수정: `legendSeries.at(0)`으로 최고점 유효 섹터를 최초 1회 ON. 사용자 수동 토글 우선, 데이터·산식/API 변경 없음.
- 전용 장기 작업 브랜치 `codex/zgmini-gpt-workspace-20261025`에서 소스 및 테스트 3개 파일을 수정하여 보존.
- 운영 배포용 최소 PR: [#715](https://github.com/ansqhd5774-Choi/zgmini/pull/715), 변경 3파일.
- GitHub Actions Node.js CI 두 번째 실행 `40185305796`: PASS(빌드·타입·회귀 테스트 포함). 첫 번째 CI는 기존 최저점 예상 테스트가 남아 FAIL, 테스트 교정 후 성공.
- PR #715 `main` 병합 SHA: `4c78ae1fbbd1c303a03c766a3619defed051b8f0`.
- Cloudflare Worker: `zgmini-migration-candidate-r5`; Git Integration `main`의 해당 SHA 빌드 `2a0f28ee-0dc1-487c-816e-9729e66c8e86` 확인.
- Cloudflare 빌드 `2a0f28ee-0dc1-487c-816e-9729e66c8e86`는 `Ready` 완료, 신규 Production 버전 `a0de8307`. 연결 `main`, 커밋 `4c78ae1fbbd1c303a03c766a3619defed051b8f0` 정확히 일치.
- 실제 `https://zgmini.kr/` 브라우저 검증: 11개 섹터 버튼 중 에너지 `78`만 `aria-pressed=true`; 의료 `69`, 소재 `69`, 통신 `23` 등 나머지 10개는 `false`. 최고점 최초 ON **PRODUCTION_VERIFIED**.
- 수동 토글 동작 보호는 CI에서 테스트 근거 확인. 실제 운영 화면에서 클릭 후 상태 유지는 별도 상호작용 검증하지 않았으므로 UI 수동 재검증 PASS는 선언하지 않는다.
- 전용 작업 브랜치는 보존하며 PR이 병합되어도 삭제하지 않는다.

## 2026-10-25 대시보드 섹터·테마 공탐 OFF 디자인 통일

- 사용자 요청: 섹터와 테마 범례의 OFF 상태 시각 차이를 제거. 선택 기준은 **기존 섹터 OFF 스타일**(더 선명하고 읽기 쉬움).
- 기존 운영 실측: 섹터 OFF는 투명 배경 / 이름·점수 불투명도 0.55 / 컬러 막대 0.9. 테마 OFF는 배경 rgb(16,43,59) / 이름·점수 0.38 / 컬러 막대 0.32.
- 수정: `components/sector-sentiment-chart.css`의 테마 OFF CSS를 섹터 OFF와 일치시키고 `tests/sector-dashboard-compact-legend-r1.test.mjs`에서 퇴행 방지 검사 추가. ON 색상·불투명도·점수·차트·선택 동작 변경 없음.
- 코드와 테스트는 영구 브랜치 `codex/zgmini-gpt-workspace-20261025`에 기록(소스 커밋 `6e07ba6`, 테스트 `85f3909`).
- 최소 변경 PR: [#716](https://github.com/ansqhd5774-Choi/zgmini/pull/716), CSS/테스트 2개 파일만 변경.
- GitHub CI 실행 `40186185527`: build / type check / regression / PC publication tests 모두 성공.
- PR #716 `main` squash 병합 SHA: `a4dc43b0089d9fc4c56a05468cec1290aa9e6f9c`.
- Cloudflare Worker `zgmini-migration-candidate-r5` Git Integration `main` 새 버전 `5ae64e1f`: **Ready**.
- 공개 `https://zgmini.kr/` Chrome 측정: 섹터·테마 OFF 버튼 모두 배경 `rgba(0,0,0,0)`, 버튼 불투명도 `1`, 이름·점수 `0.55`, 색상 막대 `0.9` 일치. ON도 두 차트 모두 배경 `rgb(16,43,59)`, 내부 불투명도 `1` 일치.
- 최고점 ON 유지: 섹터 에너지 `78`, 테마 클라우드·SaaS `65`가 각각 켜짐.
- 상태: **PRODUCTION_VERIFIED**. 해당 배포 건 재작업 필요 없음. 다음 새 대화에서는 최신 `main`과 이 기록을 우선 확인.

## 2026-10-25 대시보드 H1 검색어 과잉 표기 수정

- 사용자 지적: 공개 대시보드 섹션 제목 `공포·탐욕 (공탐)`은 검색어를 시각적 제목에 억지로 넣어 전문성이 떨어진다. 요청 범위는 자연스러운 SEO 키워드 추가였음.
- 원인: `app/country-fear-greed.tsx`의 `#global-title` 텍스트에 `(공탐)` 직접 병기.
- 수정: 사용자에게 보이는 H1은 `공포·탐욕`으로 복원, 다음 설명에 `공탐 지수` 한 번만 자연스럽게 사용. 기존 노란 게이지 아이콘·도움말 버튼 유지.
- 문구: `공포·탐욕 지수는 투자자의 시장 심리를 보여줍니다. ‘공탐 지수’라고도 부르며, 미국과 한국은 서로 다른 모델로 산출합니다.`
- 바뀐 파일 3개: `app/country-fear-greed.tsx`, `scripts/seo-production-health.mjs`, `tests/fear-greed-education-ui.test.mjs`. 데이터·산식·차트·API·레이아웃 변경 없음.
- 개발·이력 브랜치 `codex/zgmini-gpt-workspace-20261025`에 세 파일 기록; 작업 단독 배포용 PR [#717](https://github.com/ansqhd5774-Choi/zgmini/pull/717).
- Node.js CI `40186842602` PASS(build/타입/회귀/PC 관련 테스트). 관련 문자열 검증 5항목 PASS.
- `main` squash 병합 SHA: `5614c68f4042665aab27b46ee5b892b94b97f4e6`.
- Cloudflare Git Integration / Worker `zgmini-migration-candidate-r5` / `main`: 버전 `eed94c5b` **Ready**.
- 실제 공개 `https://zgmini.kr/` Chrome DOM 검증: H1 `공포·탐욕`, 아이콘 존재, 도움말 버튼 존재, 위 설명문 정확히 표시. **PRODUCTION_VERIFIED**.
- Cloudflare 확인 과정에서 별도 Wrangler 수동배포 문구가 일시적으로 보였지만, 이후 최상위 배포 행에서 #717이 `Build / main / Ready`인 것을 확인. 본 작업은 수동 배포·배포설정 변경 없음.
- 재개 시 이 완료 작업을 반복하지 말고, 최신 `main`과 현재 사용자 요청을 다시 확인.

## 2026-10-25 대시보드 차트 호버 툴팁 디자인 개선

- 사용자 지적: 섹터 차트에 한 항목만 표시돼도 호버 툴팁 너비가 320px로 고정돼 오른쪽이 크게 비고, 날짜·이름·점수 위계가 약함.
- 적용: `components/sector-sentiment-chart.css`에서 단일 선택 툴팁은 최소 160px의 내용 맞춤형 카드(테두리 반경 6px·작은 날짜·색상점·흰색 14px 점수), 두 항목 이상은 320px 2열로 표시. 차트 TSX·산식·데이터·API·선택 이벤트는 수정하지 않음.
- 퇴행 방지: `tests/sector-dashboard-compact-legend-r1.test.mjs`에서 CSS 단일/다중 분기 및 기존 TSX 경로 보존 검증 추가. 로컬 관련 테스트 8개 PASS.
- 영구 작업 브랜치 소스 커밋 `c8ec5c6370f0ab75a87ef427158e9d4a776ee647`, 테스트 커밋 `3de87f329e29db098f443f544edd51db61383a8b`.
- 최소 변경 PR [#718](https://github.com/ansqhd5774-Choi/zgmini/pull/718): CSS/테스트 2파일만. GitHub Actions Node.js CI `40188611960` SUCCESS. `main` squash SHA `41b04e41c57d3a0ac5a9c701fd9ae2017418a181`.
- Cloudflare Worker `zgmini-migration-candidate-r5` Git Integration / `main`: 새 Production 버전 `3ba1c28e` **Ready**.
- 공개 `https://zgmini.kr/` 실제 Chrome 마우스 hover: 에너지 1개 ON일 때 툴팁 `160px × 56.39px`, 날짜 `2026-08-31`, 색상점·에너지·점수 `77.2` 표시, 점수 CSS `14px`. 의료 버튼 추가 선택 시 에너지·의료 둘 모두 ON, 툴팁 항목 2개 / 너비 `320px` 표시됨.
- 기본값으로 에너지 78 최고점 ON 유지. 단일·다중 툴팁 브라우저 상호작용 **PRODUCTION_VERIFIED**.
- 주의: 이 작업 완료 후에도 다음 요청은 최신 `main`을 다시 확인하고 영구 작업 브랜치는 삭제하지 않는다.

## 2026-10-25 대시보드 차트 툴팁 14px + 최신 점수 끝점 배지

- 사용자 첨부 `image(20261025-113101).png` 피드백: 툴팁 날짜·항목명이 기존 점수(14px)보다 작음. 단일 선의 최고·최저점과 함께 최신 점수를 차트 오른쪽 끝에 표시하도록 요청.
- 수정: 툴팁 날짜·섹터명·테마명 모두 `14px`, 점수 `14px` 유지. 한 시리즈만 선택하고 **현재 차트의 최신 관측일에 실제 유효 점수가 있을 때만** 끝점의 색상 점과 점수 배지를 표시. 최근일 결측이면 숫자를 생성하거나 이전 날짜를 오늘처럼 보여주지 않음.
- 기존 최고·최저점은 단일 선택 상태에서 보존하고, 여러 시리즈 선택 시 최고·최저점과 현재 배지 모두 숨김. 데스크톱에서는 끝점 우측 여유 공간 확보, 모바일 오른쪽 Y축과 충돌하지 않도록 끝점 좌측에 배지 배치. 차트 높이 120px·카드 높이 232px 유지.
- 변경 3파일: `components/sector-sentiment-chart.tsx`, `components/sector-sentiment-chart.css`, `tests/sector-dashboard-compact-legend-r1.test.mjs`. 산식·데이터·Provider/API·DB·스케줄러·DNS·배포 방식 변경 없음.
- 장기 작업 브랜치 `codex/zgmini-gpt-workspace-20261025`: 소스 커밋 `17455d3310e6958ca4f7f98493130fc021f9fe29`, CSS `3dbbc94688c220e256e6488813f4985ae858ab15`, 테스트 `08641a703da55019de360aa8f120ad4baa4b112b`.
- 최소 변경 PR [#719](https://github.com/ansqhd5774-Choi/zgmini/pull/719), 변경 3파일. 회귀 테스트 9개 PASS, GitHub Actions Node.js CI `40189663635` 전체 PASS(build, type, regressions, PC tests).
- `main` squash 병합 SHA `6747e2b0c4cc880c1ba00653b188835e64538325`. Cloudflare Worker `zgmini-migration-candidate-r5` Git Integration / `main`, Production 버전 `66be1f25` **Ready**.
- 공개 `https://zgmini.kr/` 브라우저: PC 1280px에서 섹터 에너지만 ON, 최고/최저 라벨 2개, 현재 점수 배지 `78.1`(2026-10-23 관측) 표시. 테마 클라우드·SaaS만 ON, 현재 점수 `65.0`. 툴팁 날짜·섹터명·점수 CSS 모두 `14px` 실측, 단일 폭 160px.
- PC에서 의료 추가로 에너지+의료 2개 ON 시 섹터 현재 배지와 최고/최저점 모두 숨김 확인.
- 모바일 390px에서 섹터/테마 배지는 차트 안 우측 끝점 근처에 정상 표시, 오른쪽 Y축 숫자와 충돌 없음. 모바일 툴팁 160px, 날짜·이름·숫자 모두 14px, 화면 가로 넘침 없음. 검증 후 브라우저 임시 viewport 재설정 해제함.
- 이 범위 **PRODUCTION_VERIFIED**. 다음 요청에서 이미 적용된 범위를 반복 수정하지 말고 GitHub 최신 main과 이 상태를 재확인할 것.

## 2026-10-25 섹터·테마 공포·탐욕 점수 숫자 5단계 색상 적용

- 사용자 요청: 차트와 범례의 **점수 숫자만** 기존 공포·탐욕 5단계 색상으로 표현. 기존 글씨 크기·차트 선별 식별색·날짜·항목명·결측(—) 유지.
- 기존 기준 재사용: app/globals.css의 --zg-score-extreme-fear (#ef4444), --zg-score-fear (#f59e0b), --zg-score-neutral (#94a3b8), --zg-score-greed (#22c55e), --zg-score-extreme-greed (#10b981). 구간은 0–25 미만 / 25–45 미만 / 45–55 / 55 초과–75 / 75 초과–100. 산식 및 임계값 변경 없음.
- 적용: components/sector-sentiment-chart.tsx 섹터 11개·테마 9개 범례 숫자, PC/터치 호버 툴팁 숫자, 단일 선택 최신 점수 SVG 텍스트. data-score-band를 components/sector-sentiment-chart.css의 기존 토큰에 연결. 차트 선·시리즈 점은 기존 고유색 유지.
- 테스트: tests/sector-dashboard-compact-legend-r1.test.mjs에 점수 구간 경계와 표시 경로 회귀 추가. tests/theme-dashboard-r154.test.mjs의 JSX 속성 순서 고정 검사만 수정.
- 영구 작업 브랜치 codex/zgmini-gpt-workspace-20261025에 코드/테스트 4파일 보존(소스 마지막 커밋 b48bd00664a892a406ac28b33eea858d11813df1). 배포용 브랜치 codex/ui-score-band-numeric-text-20261025 유지.
- PR [#720](https://github.com/ansqhd5774-Choi/zgmini/pull/720) 변경 4파일. 최초 GitHub CI 40191004020는 기존 테마 JSX 속성 순서 정적 테스트 1건 실패, 해당 검사 보정 후 CI 40191180882 **SUCCESS** (빌드·타입·회귀·PC 출판 테스트).
- GitHub main squash SHA 807fce9f8f7e4c08bb4c9e589bf7a268dfacd3f7, 병합 직전 main SHA 6747e2b0c4cc880c1ba00653b188835e64538325, SOURCE_DRIFT NONE.
- Cloudflare Git Integration ansqhd5774-Choi/zgmini / main, Worker zgmini-migration-candidate-r5; 빌드 0751e6c0-31ba-4045-8a2b-6ab5e788ca85, 신규 Production 버전 5180457a **Ready**.
- 실제 공개 https://zgmini.kr/ Chrome 계산 CSS: 섹터 에너지 78/최신 점수 78.1은 extreme-greed rgb(16,185,129), 의료 69는 greed rgb(34,197,94), 금융 53은 neutral rgb(148,163,184), 기술 43은 fear rgb(245,158,11), 통신 23은 extreme-fear rgb(239,68,68). 테마 65/46/23도 각각 구간 일치.
- 호버 툴팁 69.1은 greed, 단일 폭 160px. 두 섹터 선택 시 툴팁 320px 및 밴드 색 적용, 최신 점수 끝점 배지 숨김.
- 모바일 390px: 섹터·테마 숫자 구간 색상 일치, 수평 오버플로 없음. viewport 임시 설정 원복.
- **PRODUCTION_VERIFIED** (이번 UI 범위). 데이터·산식·API·Provider·DB·스케줄러·DNS·배포 방식 변경 없음.

## 2026-10-25 전체 페이지 검색결과 제목·설명 품질 점검 상시 규칙

- 사용자 요청: 검색결과 화면에서 보이는 **페이지 제목 링크·설명문**도 향후 ZGMINI 페이지 작업마다 확인하여 적절하면 개선한다. 예시 화면의 **사과 소재는 ZGMINI 추가 대상이 아니다**.
- 영구 지침: `AGENTS.md` §12에 의무 게이트를 연결하고 `docs/SEO_SEARCH_APPEARANCE_REVIEW.md` 신설. 각 페이지의 검색 의도, 고유 `title` 및 `meta description`, 실제 본문 스니펫 후보, 모바일·인덱싱·canonical, GSC 노출·클릭·CTR·게재순위를 가능한 범위에서 검토한다.
- 화면 H1을 검색 키워드로 억지 증설하지 않는다(과거 `공포·탐욕 (공탐)` 사례 방지). Google이 검색 제목과 스니펫을 재작성할 수 있으므로 효과 보장·미측정 성공 보고 금지. 이미 적합하면 `NO_CHANGE`, 자료 부족은 `NOT_VERIFIED` 또는 `NO_GSC_EVIDENCE`.
- 저장 브랜치: `codex/zgmini-gpt-workspace-20261025` 보존. 지침 추가 커밋: SEO 기준 `8b0e1aaddb677057cd8de905205064d6aefbf36e`, AGENTS 연동 `c33e1438ea46792216e1ec246acefcab29726035`.
- **이번 단계는 브랜치 지침 저장만** 수행. 개별 URL의 title/meta/화면 코드 변경, PR 병합, main 반영, Cloudflare 공개 배포 및 검색실적 개선 검증을 수행하지 않았다.

## 2026-10-25 최신 점수 배지 선 가림 수정 R1

- 신고 이미지 `image(20261025-121825).png`: 섹터·테마 차트의 단일 선택 최신 점수 배지가 끝점 왼쪽의 실제 시계열 선을 덮는 문제(오른쪽 Y축 반응형).
- 근본 원인: `ChartCurrentPoint`에서 모바일 `axisRight`일 때 `x=cx-width-7`로 점수 사각형을 시계열 내부에 배치. PC 오른쪽 배지 경로는 `cx+7`이었음.
- 해결: 배지는 `x=cx+7`로 끝점 오른쪽에 고정. 모바일 오른쪽 Y축 + 최신 관측 점수 + 단일 선택일 때 축 너비 `92px`, tickMargin `62px`로 **시계열 끝점 → 배지 → Y축 눈금**을 분리. 그 외 상태의 기존 축 폭과 선택 동작 보존.
- `components/sector-sentiment-chart.tsx`, `tests/sector-dashboard-compact-legend-r1.test.mjs` 2파일만 변경. 최고·최저점/시리즈 색상/점수 5단계 색상/결측·잠정/높이 120px 보존. 데이터·산식·API·DB·스케줄러·DNS 변경 없음.
- 장기 작업 브랜치 `codex/zgmini-gpt-workspace-20261025` 코드 커밋 `59f606b919913afa7be6858af97e5104389d00b1`, 테스트 커밋 `93abb4527f7272c18cd75126f180943bdd1c3257`. 브랜치 보존.
- 최소 배포 브랜치 `codex/ui-current-score-gutter-20261025` (main 최신에서 분기)·[PR #721](https://github.com/ansqhd5774-Choi/zgmini/pull/721): 변경 2파일, SOURCE_DRIFT NONE. GitHub Actions Node.js CI `40193415170` **SUCCESS**. `main` squash SHA `16c4484a0b9b98024f0cda5b166bf283ef26a8db`.
- **공개 DOM 실측**: `https://zgmini.kr/` 변경 후 390px에서 섹터·테마 최신 배지 모두 끝점 오른쪽이며 오른쪽 축 텍스트와 분리. 섹터 배지 우측 296px, Y축 눈금 좌측 316px; 에너지 78.1점·클라우드·SaaS 65.0점 실제 관측일 2026-10-23. 500px 두 차트 분리 PASS, 1280px 최신 배지 PASS, 2개 선택 시 최신 점수 배지 숨김 PASS.
- SEO 상시 점검: 대시보드 공개 title/meta description/H1/canonical/index 상태 확인. 이 범위에서는 SEO 문구 변경 없음(`NO_CHANGE`).
- **PUBLIC_UI_VERIFIED**. GitHub 병합 및 공개 UI 실측으로 반영 확인. 다만 Cloudflare 관리 화면의 개별 Build/Deployment ID와 `Ready`는 이번 도구 환경에서 직접 조회하지 못했으므로 **NOT_VERIFIED**로 구분한다.


## 2026-10-25 차트 폭 복원·에너지/부동산 범례 잘림 수정 R2

- 사용자 확인: 우측 최신 점수 배지를 위한 46px 차트 축소는 차트를 해치고, 범례 11개 항목 가운데 ‘에너지’, ‘부동산’ 이름이 잘림. 기준: **차트 폭과 기존 글자 크기 보존**을 우선하며 끝점 점수 배지는 제거. 현재 점수는 기존 범례 수치에 유지.
- 코드: `components/sector-sentiment-chart.tsx`에서 최신값 중복 배지 `ChartCurrentPoint` 및 추가 plot/축 gutter 삭제. `LineChart` 오른쪽 여백 12px, `YAxis` 폭 32px·tickMargin 5로 복원. 단일 선택 최고·최저점, 기존 차트 값/산식·색상·기간·잠정·툴팁은 보존.
- 스타일: `components/sector-sentiment-chart.css`의 소형 범례 항목 간격 3px → 0px. 360.44px 카드 기준 각 이름 폭 약 +2.73px 확장, 기존 11px 이름 텍스트·14px 점수 텍스트와 색원형 유지. 가로 드래그·차트 높이 변경 없음.
- 검사: `tests/sector-dashboard-compact-legend-r1.test.mjs` 최신 점수 배지 삭제, 최고·최저 및 차트 폭 복원, 범례 전체 이름, 점수 구간 색상 검증 갱신.
- 작업 브랜치 `codex/zgmini-gpt-workspace-20261025` 보존; 소형 배포 브랜치 `codex/ui-chart-width-legend-20261025` → [PR #724](https://github.com/ansqhd5774-Choi/zgmini/pull/724) **MERGED**, `main` squash SHA `c19f1fa3b04b291d2e3fb8aa337be0279d9867ab`. GitHub Actions Node.js CI run `40195141781` **SUCCESS**(빌드·타입·회귀·PC publication).
- **PUBLIC_UI_VERIFIED (후속 검증)**: Cloudflare Worker `zgmini-migration-candidate-r5`의 Git 연동 자동 빌드 `#27d4dddc`는 실제 배포 과정에서 Assets upload session API 오류 `10013`으로 FAILED(코드 빌드·테스트는 성공). 같은 `main` SHA `c19f1fa3b04b291d2e3fb8aa337be0279d9867ab`의 후속 수동 재빌드 `#50ff24f3`가 `Ready`, 활성 배포 버전 `0c2210d4`, 트래픽 100%로 확인됨. 공개 `https://zgmini.kr/` PC 카드 폭 360.4375px에서 중복 최신 점수 배지 0개·에너지/부동산 `clientWidth 29 = scrollWidth 29`로 잘림 없음. 모바일 390px에서 카드 폭 355px, 중복 배지 0개, 범례 `clientWidth 25 = scrollWidth 25`, 가로 페이지 overflow 없음. 수정 코드는 공개 반영 PASS. **단, 최초 Git 자동배포 자체는 FAILED이며 이후 수동 재시도 성공**으로 구분; Cloudflare 설정·API/DB/산식 변경 없음.
