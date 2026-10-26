# 시장 캘린더 R1 — 구현·데이터 연결 현황

- 작업 브랜치: `codex/zgmini-gpt-workspace-20261025` (신규 브랜치 생성 금지)
- 신규 페이지: `/market-calendar/`
- 기존 `/guides/cpi-pce-release/`는 CPI·PCE 해설·기존 SEO를 보호하기 위해 유지
- 현 단계: **브랜치 코드 반영·R2 수집 범위 확대**. Production 배포·Cloudflare Runtime 검증 전.

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
| PC 수집 결과 | 기존 `/api/release-calendar` **저장본 읽기 전용** | BLS·BEA 공식 ICS의 유효한 모든 발표 제목 및 Census 소매판매·연준 산업생산. BLS 고용·BEA PCE/GDP의 기존 ID를 보존 |
| 기존 공식 수동 확인 | `app/guides/release-snapshot.json` **재사용** | CPI·PCE·FOMC 일정 및 확인된 이전 CPI·PCE 값. `checkedAt` 명시 |
| 한국 일정 | 아직 연결하지 않음 | 검증된 자료가 없으면 빈 상태 |
| 기업 실적 | 아직 연결하지 않음 | 검증된 발표일 제공원이 없으면 빈 상태 |
| 시장 예상치 | 연결하지 않음 | 출처 없는 값은 ‘—’ 표시 |

중요: 기존 `/api/release-calendar`는 공식 **발표 날짜(미국 현지 기준)**만 제공한다. 발표 시각을 추정하지 않으며 날짜 전용 항목은 `D-n · 시각 미정` 등으로 표시한다. `at` 시간 정보가 별도로 확인된 이벤트만 한국시간(KST)으로 시·분 카운트다운한다. 지난 발표시각에 발표값이 없다면 `발표 시간 경과`로 표시하며 실제 발표 완료를 단정하지 않는다.

## R2 — 기존 공식 소스 범위 확장 (2026-10-27)

- **새 공급자·API 호출·DB 테이블·스케줄러·산식 추가 없음.** 기존에 PC가 이미 수집 중인 BLS·BEA ICS 텍스트만 더 넓게 해석한다.
- BLS의 CPI, PPI, JOLTS, 고용비용지수, 수출입물가, 실질임금, 생산성 등은 한국어 명칭으로 표기. 나머지 공식 경제 발표는 출처의 실제 영문 제목으로 표시. 메타 이벤트(`BLS.gov Economic News Release Schedule`)·취소 일정 제외.
- BEA의 GDP/PCE 이외 공식 발표도 포함하되 GDP 공개 단계(1·2·3차 추정)를 구분한다. 고용·GDP·PCE 등 기존 ID를 보존하고 다른 발표에는 충돌 없는 소스별 ID를 부여한다. 저장 event 객체 필드 5개(`id/date/title/source/sourceUrl`) 유지.
- 확인된 CPI·PCE 수치 저장본과 같은 날짜의 공식 일정은 중복 표시하지 않는다. 재확인되지 않은 발표 예상치·실적 숫자 생성 금지.
- 2026-10-26 공개 소스 원본에 신규 파서를 직접 적용한 READ-ONLY 표본: BLS **313건/51종**, BEA **168건/99종**. 기존 Production 저장본의 BLS 25건·BEA 71건 대비 새 파서의 인식량 증가. 이 수치는 운영 DB의 실제 반영 건수가 아님.
- `node --test tests/market-calendar-source-coverage-r2.test.mjs tests/market-calendar-ui-r1.test.mjs tests/release-calendar-collector-r1.test.mjs`: 3/3 PASS, `npm run typecheck`: PASS, `npm run build`: PASS (브랜치 로컬).
- 남은 제한: 한국은행 일정 재배포 조건·PC 수집 승인 검증 전이며, 기업 실적은 검증된 지속 가능한 출처가 없다. 외부 사이트의 확인되지 않은 실적 날짜를 기존 파일에서 복제하지 않는다.

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
