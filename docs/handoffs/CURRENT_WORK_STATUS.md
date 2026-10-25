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

- [ ] Cloudflare Git Integration의 정확한 Production deployment SHA/상태
- [ ] `https://zgmini.kr/` 실제 공개 화면에서 기본 접힘 및 두 번째 클릭 복귀
- [ ] PC·모바일 화면의 카드/링크 열 수, 가독성, 가로 넘침
- [ ] 공개 서버 HTML에 설명 4개와 내부 링크 8개가 보존됐는지 확인

## 다음 실행

1. 최신 main·전용 브랜치 HEAD와 Production 배포 상태 재확인
2. 공개 페이지 PC·모바일에서 접기/펼치기·원문·링크 실증
3. 이상이 있을 때만 최소 수정 → 전용 브랜치 기록 → 범위 제한 PR → 자동배포 → 공개 재검증
4. 테스트·배포·Runtime 증거가 확보될 때마다 이 파일의 체크박스와 SHA를 갱신

## 참고 문서와 범위 주의

- [2026-10-24 작업 방식 인수인계서](./ZGMINI_GPT_WORK_METHOD_HANDOFF_20261024.md)는 범용 운영 절차와 당시 경제지표 표 디자인을 포함하는 역사 자료다.
- 그 문서에 쓰인 경제지표 표 디자인은 현재 대시보드 SEO 안내와 **다른 작업**이다. 작업 대상을 임의 전환하지 않는다.
- 모든 변경은 승인 범위에 한정하며, `main` 병합·배포 성공과 소스 커밋 완료를 동일시하지 않는다.
