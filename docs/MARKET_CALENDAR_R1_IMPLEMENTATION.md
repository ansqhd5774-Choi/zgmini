# 시장 캘린더 R1 — 구현·데이터 연결 현황

- 작업 브랜치: `codex/zgmini-gpt-workspace-20261025` (신규 브랜치 생성 금지)
- 신규 페이지: `/market-calendar/`
- 기존 `/guides/cpi-pce-release/`는 CPI·PCE 해설·기존 SEO를 보호하기 위해 유지
- 현 단계: **브랜치 코드 반영**. Production 배포·Cloudflare Runtime 검증 전.

## 사용자 승인 UI 계약

1. 좌측 달력 제거, 상단 **가로 1줄 날짜 달력**.
2. ‘이번 선택 기간’ 박스 삭제.
3. ‘통합 발표 캘린더’ 문구 삭제.
4. ‘원하는 국가와 일정 유형을 선택하세요.’ 문구 삭제.
5. 검색 입력을 컨트롤의 가장 왼쪽으로 배치.
6. `주간 / 월간 / 오늘 / ‹ / ›` 컨트롤 통합.
7. 일정 표 가장 오른쪽에 **남은 시간** 표시.
8. H1 `시장 캘린더`, 보조 설명 `경제지표 · 기업 실적 발표 일정을 한눈에`.
9. 기존 `SiteHeader`를 그대로 사용하며 새로운 별도 사이트 헤더를 생성하지 않음.

## 기존 시스템 연결 및 제한

| 소스 | 연결 방식 | 현재 제공 범위 |
| --- | --- | --- |
| PC 수집 결과 | 기존 `/api/release-calendar` **저장본 읽기 전용** | BLS 고용, BEA PCE·GDP, Census 소매판매, 연준 산업생산 — 실제 수집된 항목만 |
| 기존 공식 수동 확인 | `app/guides/release-snapshot.json` **재사용** | CPI·PCE·FOMC 일정 및 확인된 이전 CPI·PCE 값. `checkedAt` 명시 |
| 한국 일정 | 아직 연결하지 않음 | 검증된 자료가 없으면 빈 상태 |
| 기업 실적 | 아직 연결하지 않음 | 검증된 발표일 제공원이 없으면 빈 상태 |
| 시장 예상치 | 연결하지 않음 | 출처 없는 값은 ‘—’ 표시 |

중요: 기존 `/api/release-calendar`는 공식 **발표 날짜**만 제공한다. 발표 시각을 추정하지 않으며 날짜 전용 항목은 `D-n · 시각 미정` 등으로 표시한다. `at` 시간 정보가 저장된 공식 확인 이벤트만 시·분 카운트다운한다. 지난 발표시각에 발표값이 없다면 `발표 시간 경과`로 표시하며 실제 발표 완료를 단정하지 않는다.

## SEO 사전 점검 (docs/SEO_SEARCH_APPEARANCE_REVIEW.md)

- 검색 의도: 투자자가 미국 경제지표와 향후 기업 실적 발표 일정을 날짜별로 조회. 현재 실제 제공 범위는 공식 미국 경제지표에 국한.
- 신규 URL: `/market-calendar/`, 검색용 title `시장 캘린더 | 경제지표·기업 실적 발표 일정 - ZGmini`.
- 새 설명은 실제 제공 가능한 공식 발표 일정·KST·기록된 발표값을 설명하고 미연결 항목을 명시.
- canonical은 신규 URL로 분리. 기존 CPI·PCE 기사 메타·검색용 키워드는 변경하지 않음.
- 내부 링크: `components/site-header.tsx` 기존 메뉴에 `시장 캘린더` 링크 1개 추가.
- GSC 실측: `NO_GSC_EVIDENCE`; 기존 미개설 URL이므로 변경 전 검색순위·CTR 개선을 주장하지 않음.
- 브랜치 코드 기준: 메타·H1·설명·일정 출처 정합성 점검. Production HTTP/검색 결과·모바일 실기기 검증은 **NOT_VERIFIED**.

## 검증·후속 게이트

1. `node --test tests/market-calendar-ui-r1.test.mjs` 소스 계약 회귀 검사.
2. 브랜치 빌드/React 하이드레이션/320~1920px 반응형 점검.
3. 기존 `/api/release-calendar`의 실제 JSON·source별 `READY`, `checkedAt`, stale 사례 확인.
4. 공식 날짜·발표시각의 KST 변환 및 일광절약시간 확인.
5. 실적·한국 지표는 라이선스와 수집·공개 권한 검증 및 사용자 별도 승인 후 연결.
6. Production 배포는 AGENTS.md Cloudflare 배포 Authority Gate 및 `main` source-drift 검증 후 별도 진행. 신규 DB·API·PC 스케줄러·산식·비용 변경 금지.
