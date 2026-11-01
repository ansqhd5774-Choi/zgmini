# R44 — 시가총액 기반 기업 실적 중요도: 구현·실행 게이트
Date: 2026-10-29. Status: SOURCE + FIXTURE TESTS ONLY / PC LIVE PENDING.

## 승인한 구간
- 200,000,000,000 USD 이상 = ★★★.
- 20,000,000,000 이상 200,000,000,000 미만 = ★★.
- 0 초과 20,000,000,000 미만 = ★.
- 결측, 미검증, 잘못된 단위, 시총 충돌 = null / 미확인; 결측을 ★로 만들지 않는다.
- 경제지표 기존 별점 변경 없음. 기업의 일별 순위나 9개 하드코딩 목록 사용 금지.

## 적용 계획
1. PC의 현재 \`storage/core.sqlite\`에 저장된 \`market-calendar:earnings-display-html\`을 READ-ONLY로 확인하고 14일 실적 일정과 고유 티커 수를 구분한다.
2. 저장 시총/승인된 무료 API의 접근 권한·전체 coverage·이용약관을 확인한다. 기존 키 위치부터 확인하고 값/민감 원문을 출력하지 않는다.
3. PC 전용 배치에서 최신 저장 원자료와 기업 단위 시총 USD를 검증하여 ★/★★/★★★/미확인 결과를 일괄 계산·저장한다.
4. 기존 HTML-only 출력 계약·필터/정렬/중복 통합에 맞추어 렌더러를 변경한다. 미확인 데이터는 별도 표시한다.
5. 승인된 D1 공개 output 키에 등급을 게시하고 readback → API → PC/모바일 UI 검증. 방문자 GET에서 수집/무거운 계산 금지.
6. 기존 정규 PC 작업에 편입하기 전에 실제 등록 경로·현재 source SHA·신규 API 호출 허용량·잠금/설정·TTL을 검증한다. 무승인 신규 스케줄러·Cron·DB 변경 금지.

## 실제 완료 범위
- \`lib/market-calendar-r44-marketcap.mjs\`: 순수 중요도 분류·저장 HTML 14일 목록 검증·고유 기업 계산·검증된 USD 시총 coverage 계산.
- \`scripts/pc-writer/market-calendar-r44-marketcap-readonly.mjs\`: PC 로컬 DB 읽기 전용·API 0회·DB/D1 쓰기 0회. 결과 파일에 총 건수·고유 종목 수·시총 저장 후보 테이블 명칭·설정된 키 이름만 기록.
- \`tests/market-calendar-r44-marketcap.test.mjs\`: 경계값, ABBV, 결측, 충돌, 14일 고유 종목 수와 read-only assertion.

## 아직 하지 않은 범위
- 실제 PC 연결 및 실행; 고유 종목 수, FMP/EarningsAPI 권한 확인, 전체 실기업별 시총 확보.
- 실제 API 수집·PC 자동수집기 연결·DB 게시·D1 write·main 자동배포.
- 기존 공개 별표는 변화 없음. 검증되지 않은 provider data로 운영에서 별표 교체하지 않는다.

## 게이트 증거
- 2026-10-29 소스 조사: 현재 HTML-only snapshot은 데이터와 표시값 분리. R33 당시 2609건은 일정 수(고유 기업 수가 아님).
- FMP 무료 Basic 250calls/day, bulk & batch는 제한이 있을 수 있고 redistribution/display 별도 계약: https://site.financialmodelingprep.com/pricing-plans
- EarningsAPI profile 당 1회, 무료 100calls/day 및 월 1000calls: https://www.earningsapi.com/docs/examples/profile-enrichment
- 무허가 API 호출 금지. 운영에 필요한 무료 provider의 실 권한/요청량이 확인될 때까지 다음 단계는 AUTOMATION_BLOCKED (PC data read only).

Next: PC에서 제공한 읽기 전용 결과 파일 재조회 후 실제 issuer-level coverage 수립.
