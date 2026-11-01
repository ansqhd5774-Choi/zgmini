# R54 — R45 설치 후 첫 읽기 전용 검증: 정규 B1 경로 미관측

## PC 실측

사용자가 첨부한 `MARKET_CALENDAR_R52_PC_VERIFY_RESULT.txt` (2026-11-01T10:01:36.320Z):

```json
{
  "status": "WAITING_EXISTING_B1_COLLECTION",
  "privateDayCount": 0,
  "recentDays": [],
  "lastCollectorStatus": "NOT_OBSERVED",
  "providerCalls": 0,
  "dbWrites": 0,
  "networkCalls": 0,
  "published": false,
  "filesystemMutations": 0
}
```

R52 PC 설치 성공 시각은 2026-11-01T09:53:38Z 부근이므로 확인은 설치 약 8분 후다. `R45_PC_INSTALLED_CONFIRMED` 판정은 그대로 유지한다.

## 코드에서 확인한 상태 의미

- `scripts/pc-writer/collect-local.mjs`는 실행 시작 시 `r45Capture.status = 'NOT_OBSERVED'`로 초기화한다.
- R45 observer는 `lib/market-score/breadth-b1-r6-marketparquet-provider.mjs`가 이미 가져온 현재·전 거래일 MarketParquet 파일을 처리하고, B1 종목 커버리지 조건을 만족할 때 호출된다.
- 그 이후 `captureR45MarketParquetPair()`가 PC 개인 디렉터리 `market-calendar-r45-marketparquet/`에 일별 파일을 보관한다.
- 따라서 `NOT_OBSERVED`는 **마지막 로컬 수집 실행 중 R45 observer가 호출되지 않았다**는 신호다. 증거 없이 `R45_CAPTURE_FAILED`, 신규 provider API 실패, 상장종목 실제 확보율 문제, 사용자 수동 실행 오류로 확대 해석하지 않는다.

## 후속 처리

기존 정규 B1 주기가 해당 경로를 실행한 뒤, 이미 전달된 `MARKET_CALENDAR_R52_PC_VERIFY.cmd`로 **다시 읽기 전용 점검**한다. 새로운 수집·강제 실행·API 호출·스케줄 변경·신규 설치 패키지는 하지 않는다.

구분할 다음 결과:

1. `R46_PRIVATE_TWO_OR_MORE_DAYS_VERIFIED` 또는 `R46_PRIVATE_ONE_DAY_ONLY`: 보관 파일 무결성 통과.
2. `R45_CAPTURE_FAILED_PRESERVE_B1`: R45 보관 실행은 시도됐으나 안전하게 실패했음. 그때만 원인 분리.
3. `NOT_OBSERVED` 지속: R45 observer를 호출하는 정규 B1 경로가 실제 실행됐는지 스케줄/작업 분기를 **읽기 전용으로** 확인한다.

시가총액 API 사용, R43 ★★★ 등급 공개 반영, PC 저장자료 외부 업로드는 보류 상태다. 77.3%(102/132) 시뮬레이션과 중국 본사 기업 제외 등 별도 예외 기준도 자동으로 변경하지 않았다.

브랜치: `codex/zgmini-gpt-workspace-20261025`.
