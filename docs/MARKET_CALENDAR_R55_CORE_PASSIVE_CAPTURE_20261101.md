# R55 — PC Core 5분 주기 보존 / R45 B1 독립 보관 조건 개선

작업 브랜치: `codex/zgmini-gpt-workspace-20261025`

## 먼저 확인된 사실

- GitHub `main`의 `docs/PC_CORE_5MIN_CONFLICT_RUNBOOK.md`에 Core 5분 잠금·실행기 충돌 대응 및 R4~R7 PC 적용 이력이 이미 정리돼 있다. 해당 원인 진단을 반복하거나 새 5분 작업을 추가하지 않는다.
- R53 실제 PC 설치 결과 `R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION`은 보존한다. 실제 PC 승인 source는 `1afc5c7bb28c9d87acf03d85fe20ae3c45013fd3`였다.
- R54의 `NOT_OBSERVED`는 **마지막 Core 수집 회차에서** B1의 R45 observer가 호출되지 않았다는 뜻이다. 이것만으로 Core가 고장 났다거나 그 이전 모든 회차에서 B1이 실행되지 않았다고 판정하지 않는다.

## 이번 코드 수정

기존 `fetchMarketParquetLatestPairs`는 이미 다운로드·파싱한 전체 MarketParquet 주식 행을 R45에 넘기면서, 별개 기준인 **B1 S&P500 티커 매칭 확보율 98%**까지 요구했다. 이 조건은 전체 종목을 보관하는 R45와 무관하므로 제거한다.

- 기존 B1의 `buildMarketParquetPairs`, `coverage`, `providerRequests:2`, 자체 fallback/점수 판단은 그대로 유지한다.
- R45 observer가 등록되어 있으면 **두 Parquet 파일을 이미 받아서 파싱한 시점**에만 호출한다. 새 HTTP·별도 Core 작업·Writer 재실행은 없다.
- R45 sidecar의 **일별 2,000종목 이상, 날짜·거래량·중복·해시·기존 파일 보존** 검증은 그대로 수행한다.
- R45 observer의 실패는 기존 `try/catch`에서 격리하여 B1 수집을 중단시키지 않는다.
- Core `local-cycle.lock`, 예약 작업, 실행기, PC DB, D1, 공개 등급, 시가총액 API는 변경하지 않는다.

## 검증과 적용 단계 구분

- **개발 코드 검증:** 3,000개의 전체 주식 행이 파싱되지만 S&P500의 매칭이 0%인 합성 입력에서, R45 observer 호출·B1 `coverage:0` 불변·추가 호출 0·R45 observer 실패 격리를 확인한다.
- **PC 적용:** 이번 브랜치 변경만으로 실제 PC source가 자동 변경되지는 않는다. 기존 PC 승인 source/실행기·Core 잠금 계약을 보존하는 **단일 파일 보호 적용** 후에야 PC 코드 반영으로 판정한다.
- **실제 데이터 관측:** 아직 새 전체 종목 일별 스냅샷이나 R43 132개 확정 등급의 운영 성공을 주장하지 않는다.

참조: [Core 5분 충돌 대응 runbook](https://github.com/ansqhd5774-Choi/zgmini/blob/main/docs/PC_CORE_5MIN_CONFLICT_RUNBOOK.md).
