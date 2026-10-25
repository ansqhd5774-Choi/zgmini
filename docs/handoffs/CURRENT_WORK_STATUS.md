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
