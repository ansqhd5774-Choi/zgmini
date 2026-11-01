# R53 — R45 PC 실제 설치 성공 기록 (2026-11-01)

## 승인된 근거

사용자가 직접 Windows PC에서 실행하고 첨부한 `MARKET_CALENDAR_R52_WAIT_APPLY_RESULT.txt`:

| 필드 | PC 실측 결과 |
|---|---|
| `decision` | `R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION` |
| `phase` | `INSTALLED` |
| `sourceChainVerified` | `true` |
| `originMode` | `R48_LEGACY_R38` |
| `worktreeId` | `d0a4b3cb8b95` |
| `previousSource` | `43e0ffa392a9e655bcb4ca7b151c26ad43567e14` |
| `newSource` | `1afc5c7bb28c9d87acf03d85fe20ae3c45013fd3` |
| `backupCreated` | `true` |
| `backupId` | `r46-20261101095339371-8364c2b0` |
| `lockChecks` / `installAttempts` | `7` / `1` |
| `waitedForNaturalUnlock` | `true` |
| 수집 추가/강제 수집 | `providerCallsAdded:0` / `forcedCollection:false` |
| DB·예약·게시·원격 Git 변경 | 모두 `false` 또는 `0` |

실제 PC Core 작업 폴더에 정확히 다음 네 파일만 변경되어 로컬 Git 커밋에 포함됐다.

1. `lib/market-score/breadth-b1-r6-marketparquet-provider.mjs`
2. `lib/market-score/breadth-b1-r3-collector.mjs`
3. `scripts/pc-writer/collect-local.mjs`
4. `scripts/pc-writer/market-calendar-r45-marketparquet-capture.mjs`

**판정: `R45_PC_INSTALLED_CONFIRMED`.** 이 상태는 이제 단순 코드 준비나 시뮬레이션이 아니다. 단, 이후 정규 B1 수집에 의해 R45 개인 보관 파일이 실제로 생성·검증되었는지까지 증명하지는 않는다.

## 다음 단계 — 기존 수집 이후 읽기 전용 확인

사용자 PC의 기존 정규 B1 주기 다음에 이미 전달한 `MARKET_CALENDAR_R52_PC_VERIFY.cmd`를 실행한다. 이는 API를 호출하거나 정규 작업을 강제로 시작하지 않으며, `market-calendar-r45-marketparquet/stock_daily_YYYY-MM-DD.json` 등 로컬 결과를 읽기만 한다.

검증 항목:

- `local-collection-last-run.json`의 `marketCalendarR45.status`를 읽어 저장 시도 결과를 구분한다.
- 개인 보관 파일의 최신 거래일·행 개수·해시 일치 여부를 확인한다.
- 정상 저장이 확인되지 않으면 무리하게 새 MarketParquet 요청을 하지 말고 저장 실패 원인을 분리 진단한다.

이후 R43/R4.1 ★★★ 선정은 다음 별도 단계다. 시가총액 API에 의존하지 않는 설계, 예외/중국 본사 기업 제외, 복수 주식 기업 통합, 77.3%(102/132) 일치율 시뮬레이션과 전체 약 5% 정원은 별도 검증 및 공개 승인까지 잠정 상태로 유지한다. **R45 설치 성공을 곧바로 R43 등급 공개 반영으로 오인하면 안 된다.**

작업 브랜치: `codex/zgmini-gpt-workspace-20261025`. `main` 병합·배포·공개 등급 갱신 없음.
