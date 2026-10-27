# 기존 9개 테마 — PC R2 실측 증거 및 R3 원자료 검증 계약

## R2 제출 로그의 확정 사실

근거: 사용자가 실행한 `THEME_NINE_BASELINE_R2_RESULT.txt` (2026-10-26). 공개 런타임이나 GitHub 원본이 아닌 **PC 저장 데이터 파일 시스템 및 작업 조회** 범위다.

| 구분 | 실제 관측 | 증명하지 않는 것 |
| --- | --- | --- |
| Node | `v24.19.0` | 전체 PC 승인 SHA |
| 기존 7개 코드 | `r181-primary-cycle.mjs`, `r179-publish-core.mjs`, `r171-publish.mjs` 모두 존재 | 내용 SHA 및 실제 정상 실행 |
| `marketparquet-r167` | 대상 확장자 파일 46개, `R179_SOURCE_AUDIT.json`, `ZGMINI_R167_PRIVATE_SCORES.json`, 실행 기록 파일들 존재 | 공개 점수 일치/원가격 252일 보유 |
| `marketparquet-r165` | `etf_daily_*.parquet` 6개(10/16, 19, 20, 21, 22, 23 관측일 이름) | 파일 내부 티커·가격 검증, 252일 백필 |
| AI·반도체 | `raw-manifest.json` 9개 등록, `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE` | 9개 실파일 존재·SHA·정규 자동실행 |
| 바이오·신약 | `raw-manifest.json` 17개 등록, 동일 시간봉 가격 모드 | 17개 실파일 존재·SHA·기존 공개 점수와 동일 |
| 10번째 데이터센터·전력 | `raw-manifest.json` 13개 등록 | 본 9개 개편 산식 검증 범위에 포함하지 않음 |
| 후보 `raw/` 폴더 세 곳 | `*.json, *.parquet, *.csv, *.mjs` 필터의 직접 자식 파일 0개 | manifest의 실제 상대 경로가 없다는 뜻 아님. 파일 위치·확장자 미검증 |
| 작업 조회 | GetMarketHistory/MarketParquet/바이오 3종 성공(Exit 0), AI 전용 이름은 미발견(Exit 1) | 성공한 세 작업의 마지막 실행 정상 여부, AI의 다른 실행 경로 부재 |

**중요:** 파일 수정 시각은 실가격 관측 시각이나 계산 성공 시각이 아니다. `R179_SOURCE_AUDIT.json`의 내부 성공/실패 정보를 확인해야 한다. MarketParquet 폴더의 여섯 날짜만으로 7개 테마의 전체 과거 자료 유무를 결론짓지 않는다.

## R3 후속 점검기

`scripts/pc-writer/theme-nine-source-r3.cmd`는 사용자의 Desktop에 **한 파일**로 저장 후 단독 실행 가능한 CMD다. 로그는 같은 폴더의 `THEME_NINE_SOURCE_R3_RESULT.txt`에만 남긴다.

1. 기존 7개 `theme-market-history-r131`과 두 아카이브의 얕은 하위폴더 목록만 확인.
2. 최근 6종 운영 JSON의 최상위 키·필드 구조·안전한 상태 필드만 확인. 토큰/원가격/원본을 로그로 덤프하지 않음.
3. AI 및 바이오 manifest의 등록된 각 원파일 **실제 상대경로·SHA256을 스트리밍 검증**. 외부 경로·junction 탈출 금지, 총 해시 시도 최대 512MiB. 가격·원자료 바이트는 출력하지 않음.
4. 형식 추론용으로 JSON/CSV 계열의 첫 32KiB에서 **필드명만** 추출. Parquet 6개는 `PAR1` 헤더만 검사. 공급자/API/D1/Windows 작업을 조회·수정하지 않음.

각 단계의 `EXIT=0`은 프로브가 실행된 사실일 뿐 모든 원자료가 `SHA_VERIFIED`라는 의미가 아니다. 개별 `RAW=...;VERIFY=...`를 평가한다.

## 이후 순서

- R3 결과의 실제 manifest 경로, 포맷, PC R179 코드/아카이브 상태를 보고 **정확한 원가격 변환기**를 추가한다. 오래된 원본 R3 미발견 파일을 다시 찾지 않는다.
- 9개 × 252일 구산식/R188/신규 R2 후보를 동일 원자료·가격 모드로 비교한다. 628개 공통 관측값을 충족한 ETF는 R188=R2 일치 검증을 우선한다.
- AUM·ETF 순도·중복과 운영 안정성 비교를 끝내기 전에는 기존 공개키, 이력, DB, 스케줄러, Cloudflare, 11번째 테마를 변경하지 않는다.
