# R74 — 9개 테마 원천 지연 후 동일 구간 재확인

작성일: 2026-10-29. 작업 브랜치: `codex/theme-fear-greed-integration-20261025`.

## 사실과 원인

- 실제 Windows R73 → R48 → R47의 2026-10-29 실행 로그: `existingPrivateCommandExit=0`인데 R47 수집은 `WAIT_WINDOW_ALREADY_CHECKED`, `providerCalls=0`, 완료 구간 `2026-10-26..2026-10-28`, 마지막 검증 SPY 거래일 `2026-10-27`, 목표 종료 NY 거래일 `2026-10-28`이었다. 기존 R47은 `prior.end>=cutoff`만 보고 재조회하지 않았다.
- 2026-10-29 09:14:36 UTC 무료 GetMarketHistory 1h SPY 직접 조회: HTTP 200, `X-Data-Through: 2026-10-27T23:59:00Z`, 반환 16행은 모두 2026-10-27, 2026-10-28 0행. **현재 원천 미제공**과 **재확인 차단 코드 결함**이 동시에 확인됐다.
- 공식 API 문서는 무료 `/api/v1/bars/{source}/{ticker}/1h` 경로 및 `start`/`end` 양 끝 포함을 명시한다. `end` 배제 버그로 진단하지 않는다. 공식 신뢰성 문서는 `stocks` 거래일을 최소 48시간 뒤 게시한다고 설명하며, 즉시 제공을 보장하지 않는다.

## 수정 범위 및 불변 조건

- `theme-nine-r47-recurring-private-refresh.mjs`: **조회 종료일** `end`와 **실제 검증 SPY 거래일** `spyDay`를 별도로 판단한다. `end=cutoff`인데 `spyDay<cutoff`이면 같은 종료일의 보완 구간 `start=spyDay,end=prior.end`를 허용한다. 기존 체인의 이전 state 파일은 수정하지 않는다. 보완 checkpoint는 새로운 `delta-{SHA}.json`로 부가되며 SPY 일자가 반드시 더 전진해야 완료 체인으로 인정된다.
- 데이터가 여전히 없으면 SPY GET 1회 후 `WAIT_SOURCE_NO_NEW_VERIFIED_SPY_SESSION`으로 종료하고, R35 원본·성공 checkpoint를 추가/덮어쓰기 하지 않는다. 날짜별 프로브 시도 기록은 성공 checkpoint와 완전히 별개인 `themes/legacy-nine-r47-probes/r47-source-probe-*.json`에 저장한다. 6시간 미만 재요청 금지, 같은 뉴욕 날짜에 최대 2회 재확인(기존 11:30 KST 1일 1회 예약은 변경 없음). 별도 재예약 생성 없음. `delta.lock`이 있으면 보완 조회를 시작하지 않는다.
- `theme-nine-r35-delta-collect.mjs`: 이전 완료 구간과 같은 `end`를 갖는 보완 체크포인트 허용. 기존 완료 체크포인트와 검증된 SPY overlap이 동일해야 한다. 데이터·산식·로스터는 원본 그대로 보존.
- `theme-nine-r47-recurring-private-update.mjs`: `collection.status` 및 `freshness.targetDayVerified`, `dataOutcome`으로 원천 지연/변경 없음/신규 비공개 결과 저장을 분리한다. 수집 변경이 없고 기존 ETF·9테마 비공개 결과 두 파일의 SHA, 출처 manifest SHA, 완료 구간, R32 계약이 모두 현재와 일치하면 R25/R32 중복 재계산을 생략한다. 기존 결과 파일·계산식·공개 UI 계약 불변.
- `theme-nine-r73-auto-http502-private-retry.mjs`: 이번 실행에서 **새로 생성된 유일한 R47 JSON**과 대응했을 때에만 `sourceEvidenceStatus`, `dataOutcome`, `lastVerifiedSpyNYDay`를 기록한다. `R73_PRIVATE_COMMAND_RETURNED_ZERO`는 **명령 종료**만 의미한다. 새 파일을 특정하지 못하면 `NOT_VERIFIED`로 남긴다. R73의 스케줄·502 복구 규칙은 불변.
- SHA 확인용 `THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd`를 변경된 R47/R35에서 다시 생성했다. 기존 PC에 설치된 R47 CMD와 자동으로 교체하지 않는다. 사용자 승인하에 기존 파일 백업 및 SHA 대조 후 설치해야 실제 PC에 적용된다.

## 검증 범위

- Node fixture: 최초 빈 소스/대기/후속 공급, 동일 종료일 보완 64종목(SPY+ETF63), 중복 방지, 재확인 간격·횟수 제한, 502/네트워크 실패/빈 응답의 기존 원본·성공 state 보존. 해당 테스트는 실제 공급자 호출이 **아님**.
- R35/R47/R48/R72/R73 및 R32 점수 관련 기존 회귀 테스트와 R47 CMD 16개 SHA 내장 소스 확인. 새 산식 구현 없음.
- 실제 GET은 조회 **1회**, SPY 단일 무료 sample API, D1 쓰기 0. 새 10/28 거래일 63 ETF 원본 수집·9개 테마 계산·D1 게시 **미실행**, 완료 주장이 아님.
- 설치된 Windows PC의 프로세스, `delta.lock`, 현재 운영 CMD SHA는 첨부된 과거 로그로만 부분 확인 가능하며 이 Linux 개발 실행 환경에서 직접 확인할 수 없다. 따라서 PC 실배포 및 운영 자동 복구는 `AUTOMATION_BLOCKED_PC_ACCESS`로 분리한다.

## 작업 순서 (승인 없는 배포 금지)

1. 현재 PC 예약 작업 및 `E:\ZGmini\data\themes\legacy-nine-r35-delta\state\delta.lock` 부재를 **읽기 전용** 확인하고, 실행 중이면 중단하지 않는다.
2. PC `E:\ZGmini\data\pc-writer\theme-nine-r48\THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd`의 현재 SHA와 R74 교체 후보를 확인한다. 기존 파일을 별도 안전 백업하고 오직 승인된 R47 CMD만 교체한다. R73 모듈 로그 개선은 별도 소스 SHA 검증 후 설치한다. 예약 작업·R48·R54·D1·UI 변경 금지.
3. 다음 기존 11:30 KST 실행 후 새 R47 JSON의 `sourceCollectionStatus`, `freshness`, `dataOutcome`, `providerCalls`를 읽는다. HTTP502 실제 운영 복구 성공은 **진짜 502 발생 및 자동 재시도 로그**가 확인될 때만 인정한다.
4. 소스 데이터가 제공되는 날 `R35` 원본 SHA/manifest, 새 보완 state, R47 63 ETF × 9 테마 × 252일 비공개 저장, R48 후보를 단계별 확인한다. 공개/D1 반영은 기존 권리·날짜 정렬·별도 승인 게이트를 통과해야 한다.

공식 출처: https://getmarkethistory.com/docs/api/reference , https://getmarkethistory.com/docs/reliability/
