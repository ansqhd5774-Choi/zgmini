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

## R3 — 날짜 경계 보정 및 추가 출처 권한 조사 (2026-10-27)

### UI 날짜 보정 (브랜치 코드)
- 시각 미확정 미국 공식 일정의 `D-n` 계산 기준은 미국 동부시간(`America/New_York`)의 현재 날짜로 변경. 한국시간 자정 후 미국 현지 발표일을 하루 먼저 경과 처리하던 오차를 차단한다.
- ‘오늘’ 버튼·달력 강조는 기존 한국시간(`Asia/Seoul`)을 유지하되, 브라우저 장시간 실행 시 30초 타이머가 한국 날짜도 갱신한다.
- `2026-10-26T15:30Z` → KST `2026-10-27` / 미국 동부 `2026-10-26`. 7월·12월 시차도 독립 계산 검증.
- 발표시간 추정 없음. API/DB/스케줄러/산식/TTL 변경 없음. 브랜치 수정만으로 Production Runtime PASS를 주장하지 않는다.

### 공식 제공원·이용조건 조사 (READ-ONLY)

| 후보 | 실제 확인 | 이용조건 판정 | 처리 |
| --- | --- | --- | --- |
| 한국은행 월간 통계공표일정·금통위 일정 | 발표일·시각이 게시됨 | 한국은행 저작권보호방침: 제공대상 공공데이터 목록 밖 정보의 비링크 이용은 사전 협의·승인이 필요함. 일정의 목록 포함 여부 미확인 | `EXCLUDED`, 이용권 미확인으로 수집·재게시 제외 |
| 국가데이터처(구 통계청) | 공공데이터 제공목록·신청 경로 존재 | 개별 발표 일정의 이용권·기계판독형 공급 여부 미확인 | `EXCLUDED` |
| FinanceCalendar API | 무료 경제발표 일정, 상업적 이용 가능·표시 링크 요구; 실적 일정 제외 | 각 기록 원공급자 권리까지 준수할 것을 명시. 전체 파생·저장·재게시 권한이 자동 보증되지는 않음 | `EXCLUDED`, 원천별 공개권한 미확인 |
| EarningsCalendar.net | 실적 확정·예상 API 및 90일 upcoming 문서, API 키·초당 1회 제한 | 저장·파생·상업적 재게시 권한 불명 | `EXCLUDED` |
| Earnings Whispers | 실적 API | 재배포·재게시는 별도 라이선스 필요 | `EXCLUDED` |
| API Ninjas Earnings Calendar | 실적 API | 무료 플랜 상업적 이용 금지 | `EXCLUDED` |

근거 URL:
- https://www.bok.or.kr/portal/stats/statsPublictSchdul/listCldr.do?menuNo=200775
- https://www.bok.or.kr/portal/main/contents.do?menuNo=200228
- https://www.bok.or.kr/portal/singl/crncyPolicyDrcMtg/listYear.do?menuNo=200755&mtgSe=A
- https://kostat.go.kr/menu.es?mid=a10106020000
- https://www.financecalendar.com/api/reference/
- https://api.earningscalendar.net/documentation
- https://www.earningswhispers.com/data-api
- https://api-ninjas.com/api/earningscalendar

### R4 — 사용자 확정 공급원 제외 정책 (2026-10-27)
- 무료·상업적 이용·저장·파생·공개 재배포가 **명시적으로 확인되지 않은 공급원은 제외**한다. 권한이 없거나 불확실한 곳에 허가·제휴·라이선스를 요청하거나 확보하려 하지 않는다.
- 이 표의 `EXCLUDED` 6개 후보는 현재 시장 캘린더 신규 수집에 편입하지 않는다. 기존에 별도 승인·검증된 수집원을 이 판단만으로 중단하지 않는다.
- 향후에는 최초 공개된 약관·정책에 필요한 이용권이 명확히 적힌 **다른 무료 공급원만** 조사하고, 확인된 자료만 승인 절차 이후 PC 수집에 연결한다.
- 보류한 한국 일정·기업 실적을 추정값·예시값으로 채우지 않는다. 관련 권한 확인을 이유로 사용자나 제공기관에 추가 협조를 요구하지 않는다.

다음 Gate: 기존 승인된 공식 미국 발표 일정의 브랜치 빌드·UI/Runtime 검증 → 필요한 경우 명시적으로 자유 재배포 가능한 신규 무료 공급원만 탐색. 브랜치 테스트 이후에도 main 병합·Cloudflare 배포·운영 검증은 각각 별도다.

### R5 — 저장본 상태와 분리 검증 (2026-10-27)
- 기존 `GET /api/release-calendar`의 공개 Production 응답을 **읽기 전용**으로 확인: envelope `READY`, `updatedAt=2026-10-26T16:25:17.444Z`, 133건(BLS 25·BEA 71·Fed 24·Census 13). `source:id:date` 중복 0건, 날짜 형식·출처 URL 오류 0건. 해당 값은 **현재 운영 저장본**으로, R2 확대 파서 481건이 운영에 반영되었다는 증거가 아님.
- PC/D1 운영에 접근하지 않는 독립 로컬 Vite 환경의 API는 `PENDING`(이벤트 0건). 이전에는 HTTP 200만 확인되면 `loadState='ready'`로 전환되어 공식 저장본 미확정 사실을 표시하지 못함. 캘린더에 `status !== READY` 알림을 추가하고 기존 수동 확인 자료를 `확인일 기준`으로 유지. 데이터·API·산식·스케줄러 계약은 변경하지 않음.
- 변경 후 지정 캘린더 테스트 3/3 PASS, TypeScript PASS, 전체 `vinext build` PASS. 임시 로컬 `/market-calendar/` HTTP 200 확인. 실제 브라우저는 격리된 개발 서버 `127.0.0.1:5173`에 연결 실패(`ERR_CONNECTION_REFUSED`)했으므로 화면·하이드레이션·모바일 시각 검증은 **NOT_VERIFIED**. 이를 Production 배포 검증으로 확대하지 않음.
- 이후 필수 작업: 승인된 운영 PC 수집기에서 R2 확대 파서의 실제 실행 SHA·결과 체크포인트를 확인하고, 저장본 게시 후 D1·GET 재조회 및 PC·모바일 UI 검증. 권한 미확인 한국 일정·실적 공급원은 제외하고 허가를 요청하지 않는다.

### R6 — PC 원본·운영 게시 계보 READ-ONLY 진단 준비 (2026-10-27)
- `scripts/pc-writer/MARKET_CALENDAR_R6_READONLY.cmd` + 같은 폴더의 `market-calendar-r6-readonly.mjs`를 제공한다. PC 사용자는 두 파일을 같은 Desktop 폴더에 두고 CMD를 **1회** 실행한 뒤 생성된 `MARKET_CALENDAR_R6_PC_READONLY_RESULT.txt`만 전달한다.
- 조회 범위: 실제 E: 전용 Node, 현재 운영 데이터 폴더의 `config.json` 중 비밀 아닌 승인 상태/SHA, `local-collection-last-run.json` 중 일정 수집 상태, `quota-runner-last-run.json`, `local-publication-ledger.json`, 기존 `storage/core.sqlite`의 공개 일정 output, Core 등록 작업이 가리키는 코드 파일의 R2 파서 존재 여부, 공개 `/api/release-calendar` 응답 요약.
- **읽기 전용**: SQLite `DatabaseSync(...,{readOnly:true})`로 `SELECT`만 사용하며 DB/스케줄러/원자료/키/설정/승인 source는 변경하지 않는다. Provider 원본 API 요청·재수집·재계산·게시·git pull·배포·관리자 권한 요청 없음. 보고서에 원자료·비밀값·로컬 사용자 경로·작업 인자 전문을 남기지 않는다. 네트워크는 ZGMINI 공개 저장본 GET 1회만 사용한다.
- 별도 fixture SQLite에서 조회 테스트: 파일 크기 불변, 동일 이벤트 지문 일치, 비밀값 비출력. `node --test`에 R6 2건 포함해 지정 테스트 파일 4/4 PASS. 단, 실제 PC 런타임·DB·등록 작업은 아직 미확인이다. 출력의 `expandedParserFile`은 파일 존재 증거이며 실제 수집 실행 PASS는 `collection` 및 저장 시각 검증 전까지 주장하지 않는다.
- 결과 해석: `parity.sameEvents=true`는 로컬과 공개 API 이벤트 목록 동등성만 의미한다. R2 코드가 운영에 반영되었다는 증거는 별도로 `task.headSha`·parser flag·수집 checkpoint에서 확인해야 한다. 불일치·결측 시 기존 유효 결과를 보존하고 임의 재실행하지 않는다.

### R7 — R6 PC 실측 분석과 저장 원문 기반 확장 파서 SHADOW (2026-10-27)
- 사용자 PC의 R6 로그(`ranAt=2026-10-26T17:08:44.149Z`)를 확인했다. PC 승인 source `36266beb3ab942979d9aca7dcdd8af16fb27825b`, 수집 checkpoint `2026-10-26T17:00:53.535Z`의 캘린더 상태 `CACHED`/Provider 요청 0, 게시 ledger `VERIFIED`(같은 source). PC SQLite와 공개 API는 모두 `READY` 133건(BLS 25·BEA 71·Fed 24·Census 13)이며 이벤트 SHA-256이 일치한다. `CACHED`는 6시간 수집 시도 보호 규칙 내 재호출 생략이지 수집 실패 증거가 아니다.
- GitHub의 **실제 승인 source SHA**에서 `lib/release-calendar.mjs`를 재확인했다. 해당 파서는 ICS의 고용·PCE·GDP만 매핑하고, BLS의 CPI/PPI/JOLTS 등 다른 발표 및 BEA의 다른 경제 발표를 건너뛴다. 개발 브랜치에 구현한 확대 파서는 운영 PC에 **미반영** 상태다. 따라서 현재 133건은 정상 저장·게시 중인 기존 축소 커버리지이며, 저장·게시 오류로 판정하지 않는다.
- R6의 `task.state=REGISTERED_PROJECT_UNRESOLVED`는 작업 XML에서 개발 프로젝트 경로를 추출하지 못한 **진단기 범위 제한**이다. 등록 작업 자체의 부재나 writer OFFLINE 증거가 아니다. config 승인 source와 ledger source의 일치는 별도로 확인됐다.
- `MARKET_CALENDAR_R7_SHADOW.cmd` + `scripts/pc-writer/market-calendar-r7-raw-shadow.mjs` + `lib/release-calendar.mjs` 묶음을 준비했다. 기존 PC SQLite의 4개 공식 소스 raw input **저장본만** 읽고 승인 브랜치의 R2 확대 파서를 가상 적용한다. 원본/후보 건수·소스별 증가·중복·변경 지문을 비교한다. API 원천 호출·DB/설정/등록 작업 수정·재수집·계산·게시·소스 전환은 전혀 하지 않는다.
- fixture SQLite 테스트(저장 원문 4개 source, 정상/누락 케이스) 및 R6/기존 캘린더 테스트 5개 파일 모두 PASS. 실제 PC shadow 결과는 아직 미수신이므로 확대 후보 수를 PC 실측 PASS로 단정하지 않는다. **운영 source 변경은 별도 승인 SHA·영향 검토 없이 진행하지 않는다.**

### R8 — R7 실측: 기존 일정 보존 차이 추적 (2026-10-27)
- R7 사용자 PC 실측(`2026-10-26T18:14:23.790Z`): 모든 4개 저장 원본 `PARSED`, 기존 공개 저장본 133건(BLS 25, BEA 71, Fed 24, Census 13) 대비 확대 파서 후보 **518건**(BLS 313, BEA 168, Fed 24, Census 13). 중복 키 **0건**, 신규 키 **388건**, 기존에만 존재하는 키 **3건**, 순증가 **385건**. 해당 후보는 `CANDIDATE_NOT_PUBLISHED`이며 운영 반영이 아니다.
- 기존에만 있던 **3건의 원인**은 R7 요약 로그만으로 확정할 수 없다. R8 `MARKET_CALENDAR_R8_PRESERVATION.cmd`는 동일한 저장 DB를 **읽기 전용**으로 열고 구식/확장 이벤트의 `source:id:date` 차이 3건을 제목·날짜 기준으로 분류한다. 동일 날짜+제목인데 ID만 달라졌는지, 일정 날짜가 바뀌었는지, 새 저장 원본에서 일치 항목이 없는지 구분해 보여준다. 후보의 연도별 분포와 다음 90일 추가 건수도 집계한다.
- R8 실행에는 `MARKET_CALENDAR_R8_PRESERVATION.cmd`, `scripts/pc-writer/market-calendar-r8-preservation-audit.mjs`, `lib/release-calendar.mjs` 세 파일을 동일한 폴더 계층으로 배치한다. 결과는 `MARKET_CALENDAR_R8_PRESERVATION_RESULT.txt` 한 건이며, 원문 ICS·비밀값·PC 경로를 출력하지 않는다. PC 원자료/API/DB/설정/작업 등록/승인 source/게시본은 **일절 수정하지 않는다**.
- 기존 키 3건의 탈락 사유를 확인하고 보존 위험 여부를 분류하기 전에는 운영 PC 파서·설정·스케줄러를 변경하거나 게시하지 않는다. 별도 source SHA 적용 검증 및 로컬 저장→게시→D1/API/UI 재조회 Gate가 남아 있다.

### R8 PC 결과 판정 — 데이터 누락 없음·식별자 의미 교정 (2026-10-27)
- 실제 PC R8 로그(`ranAt=2026-10-26T18:25:30.107Z`)의 4개 저장 원본 전부 `PARSED`, `FULL_AUDIT`, 원본·후보 중복 각각 0건을 확인했다. 후보 518건의 날짜 범위는 `2025-01-03~2027-12-22`이며 2025년 204건, 2026년 255건, 2027년 59건이다. KST 2026-10-27부터 90일 기간에는 기존 14건, 후보 46건, 새 식별 33건(BLS 25/BEA 8)이다. 이 숫자는 PC 저장 원본의 **읽기 전용 가상 결과**이며 운영 적용 결과가 아니다.
- `notPreservedCount=3` 모두 기존 `source:title:date`와 동일한 후보를 발견한 `SAME_DATE_TITLE_ID_CHANGED`다. 원본 일정의 날짜·제목 손실은 **0건**이다. 구형 `employment`가 잘못 가리키던 **Employment Situation of Veterans**(2025-03-20, 2026-04-28)는 `bls-employment-situation-of-veterans`로, 구형 `gdp`가 잘못 가리키던 **GDP by County and Personal Income by County, 2025**(2026-12-02)는 `bea-gdp-by-county-and-personal-income-by-county-2025`로 변경되었다. 기존 ID로 되돌리면 일반 고용·GDP 지표와 의미가 섞이므로 **리키를 의도된 교정으로 수용**한다.
- R2 확장 파서의 교정 ID·날짜·제목을 실측 3건 그대로 회귀 테스트에 고정한다. 저장 event 5개 필드, 네 출처, 수집·게시 주기, DB/설정/TTL/산식은 변경하지 않는다.
- **다음 적용 Gate:** 실제 PC 운영 프로젝트·승인 source SHA의 drift를 확인하고, 본 확대 파서 최소 변경을 기존 승인 GitHub/main→PC 배치 절차에 따라 반영한 뒤, PC 저장 결과→기존 게시→D1/API/UI를 순서대로 확인한다. 다른 브랜치 통째 병합, PC 승인 SHA의 무단 교체, 운영 DB 직접 변경, 강제 재수집/게시, 직접 Cloudflare 배포는 금지한다.

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
5. 실적·한국 지표는 필요한 이용권이 명시된 무료 공급원만 후보로 검토하고, 해당 공급원 연결은 사용자 승인 후 진행한다. 권한 미확인 공급원에 허가 요청 금지.
6. Production 배포는 AGENTS.md Cloudflare 배포 Authority Gate 및 `main` source-drift 검증 후 별도 진행. 신규 DB·API·PC 스케줄러·산식·비용 변경 금지.
