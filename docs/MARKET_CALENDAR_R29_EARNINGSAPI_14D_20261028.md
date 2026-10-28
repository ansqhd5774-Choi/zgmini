# R29 — EarningsAPI.com 향후 14일 PC 수집 후보 (2026-10-28)

## 사용자 확정 작업 방향

- 무료 우선, **매일 미국 뉴욕 날짜 기준 오늘부터 14일(포함)**을 조회한다. 하루 최대 14회, 30일 기준 420회(31일 434회)로 계산한다.
- 현재 핵심 8개 미국 기업 우선 노출 원칙을 보존하되 원문 수집은 날짜별 미국 시장 전체를 받는다. 1회 기업 수의 제공원 하드 상한은 **미공개**이며 무제한이라고 가정하지 않는다.
- 기존 PC Core(6시간 실행) 안에 붙여도 같은 뉴욕 날짜에는 다시 API를 요청하지 않도록 원자료 저장소에 독립적인 일일 요청 마커를 남긴다. 새 스케줄러·Cloudflare Cron·DB 테이블은 만들지 않는다.
- R29 정규 수집기는 **아직 PC 미설치**. 키 등록과 14일 일회성 인증 조회를 확인했으며 공식 확정일로 임의 표시하지 않는다.

## 제공원과 권리 근거

| 항목 | 공식 근거 | 운영 판정 |
| --- | --- | --- |
| 날짜별 전체 기업, `pre`/`after`/`notSupplied` | [API 문서](https://www.earningsapi.com/docs/calendar-earnings) | 응답 포맷 문서 확인, 실제 응답 PC 14일 조회 2,609건 검증 완료 |
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
3. **KEY_REGISTERED:** 사용자 PC API 키 등록 및 인증 14일 조회 성공. 키 값은 Git·문서·출력에 포함하지 않는다.
4. **PC_NOT_INSTALLED:** staging 코드를 운영 PC 파일로 복사하지 않음. 안전 설치기 없음.
5. **NOT_PUBLISHED:** GitHub `main`, Cloudflare 배포, D1 공개 이벤트 모두 미변경.

## 다음 필수 작업

- 공급원에 무료 계획의 **상업 사이트 표시/PC 캐싱/공개 JSON API(D1) 제공** 범위와 `confirmed` vs `estimated`의 분류 근거를 명확히 확인한다. 명시 허가가 없는 부분은 계속 차단한다.
- 사용자가 무료 계정 API 키를 발급받으면 PC의 보호된 환경 설정으로만 전달받는다. 테스트/문서/채팅/Git에 노출하지 않는다.
- 실제 인증 API 한 건으로 회사 수/날짜 구간/공식 확정 플래그를 실측한다. 이후 변경 파일의 이전 승인 SHA·백업·PC lock 검사 안전 설치 및 정규 수집·게시를 **별도 단계**로 진행한다.
- 사용자 역할: 공개 사이트 및 정규 예약 작업의 실시간 모니터링은 사용자 담당. 개발 담당이 별도 모니터링을 추가하지 않는다.

## R29 API 키 등록용 CMD 준비 (사용자 요청)

- `scripts/pc-writer/MARKET_CALENDAR_R29_EARNINGSAPI_KEY_REGISTER.cmd`와 함께 제공되는 `market-calendar-r29-key-register.mjs`를 한 폴더에서 실행한다.
- 승인된 Windows 런타임 `E:\ZGmini\runtime\node.exe`를 사용하며, 기존 `ZGMINI_PC_HOME` 또는 `E:\ZGmini\data\pc-writer` 아래 **기존** `providers.env`만 변경한다. 파일/디렉터리가 없으면 새로 만들지 않고 중단한다.
- 키는 콘솔에서 숨김 입력하며 명령행 인수·로그·결과·Git에 넣지 않는다. `EARNINGS_API_KEY` 한 항목만 바꾸고 다른 provider 값을 파싱 전후 비교한다.
- 실제 수정 전에 `providers.env.r29-*.bak`를 **동일 보안 폴더**에 보존한다. 기존 파일을 직접 갱신하여 Windows 파일 ACL을 유지한다. 이미 같은 키인 경우 재기록·백업하지 않는다.
- 이 CMD는 **키 등록만 수행**한다. R29 staged 수집기는 기본 비활성이며 PC 실제 설치, 정규 수집, 상업적 재배포 권한, 공식/예상 구분, D1 게시, Cloudflare 배포를 완료하지 않는다.

## 키 등록 후 실제 원문 구조 일회성 확인

- 사용자가 PC에 키를 등록했다고 보고한 뒤, `scripts/pc-writer/MARKET_CALENDAR_R29_EARNINGSAPI_SOURCE_TEST.cmd`와 동봉 `market-calendar-r29-earningsapi-source-test.mjs`를 작성했다.
- 14개 뉴욕 날짜를 읽기 전용 GET으로 조회하고 응답 날짜·배열·종목 형식과 핵심 기업 포함 개수를 확인한다. 무료 한도에서 **최대 14회** 사용하며 HTTP 401/403/429에 자동 재시도하지 않는다.
- 결과는 `MARKET_CALENDAR_R29_EARNINGSAPI_SOURCE_TEST_RESULT.txt`에 **날짜별 건수·상태·핵심 기업 티커만** 기록한다. 응답 원문·키·다른 provider 키를 기록하지 않고 PC DB·예약 작업·게시물을 변경하지 않는다.
- 2026-10-28 사용자 Windows PC에서 일회성 원문 검증 성공. 새 모니터링 작업이나 DB·예약·사이트 변경은 없었다.


## R29 실제 인증 원문 시험과 PC 내부 저장 연결 (2026-10-28)

- 사용자 PC 결과: `MARKET_CALENDAR_R29_EARNINGSAPI_SOURCE_TEST_RESULT.txt`.
- `RESULT=READ_ONLY_RECEIVED`; 미국 뉴욕 현지 날짜 `2026-10-28`~`2026-11-10`, 14일 중 14일 응답, 요청 14회, **2,609행**.
- 합계 교차검산: `pre=1,063`, `after=1,280`, `notSupplied=266`; 2,609행과 날짜별 합이 일치.
- 핵심 티커: 10/28 `GOOG`/`GOOGL`/`MSFT`, 10/29 `AMZN`, 11/02 `AAPL`. 공식 기업 확정 여부는 이 응답만으로 확인되지 않는다.
- `CONFIRMATION_FIELDS_OBSERVED=0`: 알려진 명시적 확정 필드를 시험 응답에서 관찰하지 못함. 업체의 날짜가 모두 미확정이라고 단정하는 뜻이 아니다.
- 설치 후보: `lib/earnings-api-calendar.mjs`, `scripts/pc-writer/earnings-api-local.mjs`, R27에서 승인된 `scripts/pc-writer/release-calendar.mjs`의 최소 변경. 기존 `collect-local.mjs`는 변경하지 않음.
- 기존 PC Core 예약 작업에서 기존 비밀 설정의 `EARNINGS_API_KEY`를 읽고 뉴욕 날짜당 최대 한 번만 14일을 수집한다. 기존 `public_feed_snapshots_v1`의 **input** 종류에만 원문/상태를 보관하며 D1에 동기화되는 **output** 종류를 만들지 않는다. 기존 DB 테이블·예약 스케줄러·게시 API는 변경하지 않는다.
- 제공원 공식 DB 동기화 예제([문서](https://www.earningsapi.com/docs/examples/calendar-backfill-sync))에 근거한 `pc_private` 범위로만 연결한다. 원본 공개 피드 재배포 권한은 주장하지 않으며 `VENDOR_UNVERIFIED`, `HELD_UNCONFIRMED` 상태를 유지한다([약관](https://www.earningsapi.com/terms)).
- `MARKET_CALENDAR_R29_PC_PRIVATE_APPLY.cmd` 설치기는 승인된 R27 파일 SHA·PC 작업 식별·config.source·기존 Core lock·보호 소스 청결을 확인한다. 정확히 3개 코드 파일만 반영하고 백업하며 강제 수집/게시/GitHub 푸시는 하지 않는다.
- 현재 판정: **API 실측 PASS / PC 내부 원자료 정규 연결 코드 테스트 PASS / 사용자 PC 실제 설치 대기 / 사이트 게시 미실행**. 정규 작업 및 사이트 실행 모니터링은 사용자 담당으로 별도 추가하지 않는다.


## R29 PC 첫 설치 결과와 안전한 V2 수정 (2026-10-28)

- 사용자 첫 설치 결과 `MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_RESULT.txt`: `decision=R29_CORE_COLLECTOR_BASE_CHANGED_STOP`, `changedFiles=[]`, `backupCreated=false`, `newSource=null`, `forcedCollection=false`, `publisherExecuted=false`. **PC 코드는 설치되지 않았고 기존 소스·DB·예약 작업은 변경되지 않았다.**
- 원인: 첫 설치기가 개발 브랜치의 `collect-local.mjs` SHA를 PC의 현행 버전이라고 가정했다. 실제 PC 파일은 그 버전과 달라 정상 중단했다. PC 파일을 추정해 덮어쓰지 않는다.
- 수정: `MARKET_CALENDAR_R29_PC_PRIVATE_APPLY_V2.cmd` 설치기는 **첫 설치기 대체**. 기존 Core 진입 파일을 건드리지 않고, 실측 확인된 R27 `release-calendar.mjs`(SHA256 CRLF `7ccf0183868fc2f19de5b5f07409383def161a78a1353dba6049299631f31708`)를 기준으로 private 수집 한 지점만 추가한다.
- V2 변경 정확히 3개: 신규 `lib/earnings-api-calendar.mjs`, 신규 `scripts/pc-writer/earnings-api-local.mjs`, R27 수집기 `scripts/pc-writer/release-calendar.mjs`. 기존 `collect-local.mjs` 유지.
- R27 소스 대비 삽입된 후크는 기존 `release-calendar` 갱신 여부와 독립적으로 실행되며, API 키가 없으면 요청하지 않는다. private 원문은 `kind=input`으로만 저장하고 `kind=output` 공개 데이터는 만들지 않는다.
- V2 안전장치: Core 작업 경로, R27 parser/collector SHA, PC config.source==HEAD, 보호 소스 변경 0, 백업+해시, Core lock 확인. 설치 중 강제 수집·게시·스케줄 변경·GitHub push 없음.
- 검증: R27/R28/R29 관련 테스트 9개 파일 통과, ZIP 파일 7개 무결성 확인. V2 실제 PC 실행은 아직 수행되지 않았으며 재실행/성공을 추정하지 않는다.
- 주의: 첫 설치 ZIP은 **재실행 금지**. V2 결과가 `R29_V2_PC_PRIVATE_INPUT_COLLECTOR_INSTALLED_NO_FORCED_COLLECTION`일 때만 PC 설치 성공으로 판정한다.
