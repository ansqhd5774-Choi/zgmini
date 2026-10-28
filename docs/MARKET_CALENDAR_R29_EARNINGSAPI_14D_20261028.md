# R29 — EarningsAPI.com 향후 14일 PC 수집 후보 (2026-10-28)

## 사용자 확정 작업 방향

- 무료 우선, **매일 미국 뉴욕 날짜 기준 오늘부터 14일(포함)**을 조회한다. 하루 최대 14회, 30일 기준 420회(31일 434회)로 계산한다.
- 현재 핵심 8개 미국 기업 우선 노출 원칙을 보존하되 원문 수집은 날짜별 미국 시장 전체를 받는다. 1회 기업 수의 제공원 하드 상한은 **미공개**이며 무제한이라고 가정하지 않는다.
- 기존 PC Core(6시간 실행) 안에 붙여도 같은 뉴욕 날짜에는 다시 API를 요청하지 않도록 원자료 저장소에 독립적인 일일 요청 마커를 남긴다. 새 스케줄러·Cloudflare Cron·DB 테이블은 만들지 않는다.
- 실제 다운로드와 API 키는 **현재 OFF**. 허가가 확인되어도 예상일을 기업 공식 확정일로 바꿔 공개하지 않는다.

## 제공원과 권리 근거

| 항목 | 공식 근거 | 운영 판정 |
| --- | --- | --- |
| 날짜별 전체 기업, `pre`/`after`/`notSupplied` | [API 문서](https://www.earningsapi.com/docs/calendar-earnings) | 응답 포맷 문서 확인, 실제 응답 **키 없어 미검증** |
| 무료 60회/분·100회/일·1000회/월 | [무료 한도](https://www.earningsapi.com/docs/calendar-earnings) | 14회/일 설계 가능 |
| API로 자체 사이트에 표시 | [서비스 약관 §2](https://www.earningsapi.com/terms) | 사이트 표시 허용 문구 있음 |
| DB에 일자별 저장해 동기화 | [공식 DB·동기화 예제](https://www.earningsapi.com/docs/examples/calendar-backfill-sync) | 예시 설명 있음 |
| 원본 데이터 피드의 재게시 | [서비스 약관 §3](https://www.earningsapi.com/terms) | **명시 제한**. 기존 D1 공개 JSON이 재배포에 해당하는지 별도 권리 확인 필요 |
| 상업적 공개 + PC 저장 + 원본 재배포 허가 | 약관에 모든 항목을 한꺼번에 명시한 증거 없음 | `RIGHTS_NOT_VERIFIED`, 운영 활성화 불가 |
| 기업 공식 확정일 구분 | 표준 응답에 기업 공식 발표 확인 필드 없음 | `VENDOR_UNVERIFIED`, 예정 이벤트 공개 불가 |

공식 약관에는 사용자가 운영하는 웹사이트에 결과를 표시할 수 있다는 조항이 있으나 원본 피드 재게시 제한이 별도로 있다. **사이트 화면 표시 가능**과 **기존 공개 API/D1 JSON 재배포 가능**은 다른 권리다. 무료 계정에 대한 생산 환경·상업적 사용과 기존 PC DB/D1 구조를 명시 확인하기 전 `redistribution`을 true로 기록하지 않는다.

## 이번 구현 (GitHub 후보 코드)

- `staging/market-calendar/r28-earnings/lib/earnings-api-calendar.mjs`: 뉴욕 현지 날짜 및 DST·14일 범위, JSON 응답 검증, 날짜/종목/시장 전후 구분. `epsEstimate` 등 실적 예상 수치나 시각은 공개 자료로 승격하지 않는다.
- `staging/market-calendar/r28-earnings/scripts/pc-writer/release-calendar.mjs`: `earningsApiConfig?.enabled` 옵션의 수집 경로. 불충분한 권리/키는 **HTTP 요청 전에 거부**한다. 연결을 승인하면 원문 14일치가 `public_feed_snapshots_v1`의 `input`에 저장되고 readback된다. 기존 5필드 공개 이벤트로는 전달하지 않는다.
- `tests/market-calendar-r29-earningsapi.test.mjs` 및 기존 R28 테스트: DST, 14개 날짜 요청, 응답 포맷, 키 미보관, 일일 요청 마커, 429 실패 보존, 확정일 오인 방지 검증.
- 원문 입력의 `sourceUrl`은 키가 없는 `https://api.earningsapi.com/v1/calendar/earnings`만 기록한다. API 키를 로그/문서/DB/Git에 보관하지 않는다.

## 작동/차단 상태의 정확한 구분

1. **CODE_STAGED:** 테스트용 모의 응답만으로 동작 확인, 외부 API 호출 0회.
2. **RIGHTS_BLOCKED:** 상업적 공개 D1 JSON 재배포와 공식/예상 분류의 근거 미확보. `earningsApiConfig` 기본값 `null`.
3. **KEY_PENDING:** 공급원의 무료 API 키가 운영 PC 환경에 아직 제공되지 않음. 인증 없이 호출하지 않는다.
4. **PC_NOT_INSTALLED:** staging 코드를 운영 PC 파일로 복사하지 않음. 안전 설치기 없음.
5. **NOT_PUBLISHED:** GitHub `main`, Cloudflare 배포, D1 공개 이벤트 모두 미변경.

## 다음 필수 작업

- 공급원에 무료 계획의 **상업 사이트 표시/PC 캐싱/공개 JSON API(D1) 제공** 범위와 `confirmed` vs `estimated`의 분류 근거를 명확히 확인한다. 명시 허가가 없는 부분은 계속 차단한다.
- 사용자가 무료 계정 API 키를 발급받으면 PC의 보호된 환경 설정으로만 전달받는다. 테스트/문서/채팅/Git에 노출하지 않는다.
- 실제 인증 API 한 건으로 회사 수/날짜 구간/공식 확정 플래그를 실측한다. 이후 변경 파일의 이전 승인 SHA·백업·PC lock 검사 안전 설치 및 정규 수집·게시를 **별도 단계**로 진행한다.
- 사용자 역할: 공개 사이트 및 정규 예약 작업의 실시간 모니터링은 사용자 담당. 개발 담당이 별도 모니터링을 추가하지 않는다.
