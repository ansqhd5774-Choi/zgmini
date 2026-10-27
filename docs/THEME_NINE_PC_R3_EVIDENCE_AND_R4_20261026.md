# 기존 9개 테마 — R3 원자료 SHA 실측 / R4 유효 거래일 검증

## R3 PC 실측 결과 (2026-10-26)

사용자가 제출한 `THEME_NINE_SOURCE_R3_RESULT.txt`의 확정 사실:

| 범위 | 결과 | 증거 한계 |
| --- | --- | --- |
| AI·반도체 manifest | 9개 전부 `SHA_VERIFIED` | 저장 JSONL 시간봉이므로 과거 628일 및 정규 갱신 증거 아님 |
| 바이오·신약 manifest | 17개 전부 `SHA_VERIFIED` | 기존 R158 vs R188 2.35318점 불일치 원인 해결 아님 |
| 총 SHA 검사 바이트 | 2,447,433 | 권리/배포/점수 검증과 별개 |
| JSONL 관측 스키마 | `close`, `is_gap`, `symbol`, `timestamp` | 뉴욕 15:xx/12:xx 선택, 날짜 합치기·결측 확인 전 |
| `marketparquet-r165` | 6개 `PAR1` 헤더 확인 | parquet 내부 14 ETF 유효 데이터는 미확인 |
| 기존 기본 7개 저장 루트 | `raw`, `derived`, `warmup`, `marketparquet-r165`, `marketparquet-r167` 하위폴더 실존 | 원가격 수량/기간·가격 모드 미확인 |
| R167 비공개 점수 | `PRIVATE_SHADOW_ONLY`, 5개 point, D1 쓰기 0 | 공개 데이터와 동일하다는 증거 아님 |
| R167 최근 실행 | `PRIVATE_SCORED_PENDING_LICENSE`, D1 쓰기 0 | 상업적 이용/파생 공개 권리 미확정 |
| R181 기본 수집 | `NO_NEW_COMPLETE_PRIMARY_DATE`, providerCalls 14, D1 쓰기 0 | 실제 실패로 추정 금지. 신규 완성일 없었다는 기록 |
| R179/R183 기존 공개 경로 | `PUBLIC_API_ROLLING_VERIFIED` | 새로운 9개 적응형 R2 점수 공개 검증 아님 |

**검증 결과:** 등록된 AI·바이오 원파일이 현재 존재하고 26개 모두 해시가 맞는다. 다만 해당 파일의 `observationFrom/Through` 및 1시간봉 구조 때문에 628 공통 관측일 충족 여부는 별도 검사해야 한다. 7개 구형 파이프라인이 D1 공개 이력과 연속 연결됐다는 사실과 **새로 설계한 적응형 R2의 역사적 일치**는 각각 검증한다.

## R4 새 단독 CMD

`scripts/pc-writer/theme-nine-legacy-coverage-r4.cmd` 하나만 Desktop에 저장하고 실행한다. 같은 폴더에 `THEME_NINE_LEGACY_R4_RESULT.txt` 출력. E: 저장자료/Cloudflare D1/스케줄러/공급자 호출 없음.

1. 옛 7개 원본 `theme-market-history-r131/raw,derived,warmup`을 깊이 3까지만 탐색하고 확장자별 파일 수 및 최신 24개 파일명·크기·mtime을 기록. 링크로 디렉터리 밖을 따라가지 않음.
2. 그 안의 `*.jsonl,*.ndjson` 실제 파일만 합계 최대 256MiB 순차 스트리밍하여 승인 ETF 14종(13개 고유 테마 ETF + SPY)의 바 유효성·`is_gap` 제외·뉴욕 장마감 전 15시 봉/조기 폐장 12시 봉 실제 관측일 수를 집계. 결측·중복 날짜를 채우거나 가격 자체를 로그에 남기지 않음.
3. 각 ETF와 SPY의 선택일 교집합을 계산해 628일 기준을 충족하는지 **자료 커버리지 확인**. 이는 R188 산식이나 252점 계산·기존 D1 점수 검산의 완료 판정이 아님.
4. 기존 AI R187 원본 등록 파일 하나의 명시된 경로 존재·SHA 및 작은 JSON 구조를 검사. 등록부에 기재된 파일만 조회하고 이미 미발견 종료한 바이오 R3 원가격 파일은 재탐색하지 않음.

## 다음 게이트

R4로 각 저장가격 파일의 형식과 유효 날짜 수를 확인한다. 충분한 실자료가 확보되면 9개 가격 수출본과 R188/R2 252일 Shadow 비교기를 연결한다. 628일 미달 ETF는 R2 동적 부문만 후보로 검산하고, 기존 7개 공개 점수/계산기/작업 이름/DB/브랜치 main은 변경하지 않는다. 11번째 테마는 별도 승인까지 보류한다.
