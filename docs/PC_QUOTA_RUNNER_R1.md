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
