# PC quota-aware runner R1

## 역할

`quota-runner.mjs`는 기존 PC 수집 계약을 대체하지 않는다. `local-cycle.mjs`를 호출하면서 공급자별 호출 간격·공개된 한도·오류 상태를 로컬 원장에 기록한다.

- API 수집·원자료 저장: PC 로컬 SQLite
- 계산: PC에 저장된 자료만 사용
- 공개 결과 게시: 기존 `run-local.mjs --publish` 계약
- Cloudflare Cron: 변경하지 않음
- 산식·TTL·DB 스키마·DNS: 변경하지 않음

## 실행

탐색기에서 저장소 루트의 `ZGMINI_QUOTA_RUNNER.cmd`를 더블클릭하면 메뉴가 열립니다. 명령 프롬프트에서는 다음처럼 실행합니다.

```cmd
ZGMINI_QUOTA_RUNNER.cmd plan
ZGMINI_QUOTA_RUNNER.cmd observe
ZGMINI_QUOTA_RUNNER.cmd enforce
ZGMINI_QUOTA_RUNNER.cmd publish
ZGMINI_QUOTA_RUNNER.cmd korea
ZGMINI_QUOTA_RUNNER.cmd korea-publish
```

기본 실행은 공급자 호출을 관찰하고 원장을 갱신한다.

```cmd
set ZGMINI_PC_HOME=%USERPROFILE%\.zgmini\pc-writer
node scripts\pc-writer\quota-runner.mjs
```

한국시장 lane:

```cmd
node scripts\pc-writer\quota-runner.mjs --korea
```

공개 결과 게시까지 수행할 때만 명시한다.

```cmd
node scripts\pc-writer\quota-runner.mjs --publish
```

공급자 한도가 확정된 정책만 차단 모드로 실행할 수 있다.

```cmd
node scripts\pc-writer\quota-runner.mjs --enforce-quota
```

`--enforce-quota`는 FRED, 등록 BLS, BEA, SEC, KRX, KOSIS의 확정 정책을 대상으로 한다. Census 키 보유량, EIA 권고치, MarketParquet 요금제, BOK/BIS/World Bank 등 근거가 불완전한 값은 경고만 남기고 자동 차단하지 않는다.

## 게시 전 안전 게이트

`--publish`는 수집 전에 다음 조건을 모두 확인한다.

- 로컬 `HEAD`가 `config.json`의 승인 source와 일치
- 로컬 `HEAD`가 `origin/main`과 일치
- 이전 게시 원장에 `SUBMITTING`이 남아 있지 않음

게시 조건이 맞지 않으면 게시만 건너뛰고 PC 수집·로컬 저장·계산은 계속 수행한다. `quota-runner-last-run.json`에는 `COLLECTION_COMPLETE_PUBLISH_BLOCKED`와 함께 원인을 기록한다. `SUBMITTING`이면 게시를 재실행하지 말고 먼저 D1 read-back으로 결과를 확인한다.

수집이 `--enforce-quota`에서 확정 한도에 걸리면 해당 cycle의 게시를 건너뛰고 `QUOTA_GUARDED`로 종료한다. 관찰 모드의 경고는 호출을 막지 않으며, `guarded`와 `warnings`를 구분해 원장에 남긴다.

원격 결과의 저장 시각과 projection 상태는 다음 읽기 전용 명령으로 확인할 수 있다.

```cmd
node scripts\\pc-writer\\read-publication-readback.mjs
```

등록된 `ZGMINI-PC-Local-Core`와 `ZGMINI-PC-Local-Korea` 작업은 저장소의 `quota-runner.mjs --publish`를 호출해야 한다. 예약 주기나 작업 이름은 바꾸지 않고, 기존 VBS의 실행 대상만 quota runner로 연결한다. 구형 `ZGMINI-PC-Writer` 작업은 비활성 상태를 유지한다.

## 원장

`%USERPROFILE%\.zgmini\pc-writer\quota-ledger.json`에 다음 메타데이터만 저장한다.

- 공급자 이름
- 호출 시각 개수와 최근 호출 시각
- 최근 성공 시각·HTTP 상태
- 오류 횟수와 quota 상태
- 차단 시 다음 허용 시각

요청 URL, query string, API key, 응답 원문은 저장하지 않는다.

`local-collection-last-run.json`에는 기존 호스트별 상태와 함께 공급자별 quota 요약이 추가된다. 원장 파일이 손상되면 카운터를 초기화하지 않고 `QUOTA_LEDGER_INVALID`로 중단한다.

## 상태 해석

- `AVAILABLE`: 호출 가능
- `QUOTA_WARNING`: 관찰 모드에서 한도·간격 경고
- `COOLDOWN`: 확정 정책 때문에 차단 대기
- `FAILED`: 공급자 응답 또는 네트워크 실패

관찰 모드가 기본값이므로 기존 수집을 중단하지 않는다. 한도 초과를 실제로 막아야 할 때만 `--enforce-quota`를 명시한다.
