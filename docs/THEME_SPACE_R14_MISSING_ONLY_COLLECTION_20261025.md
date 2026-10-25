# 우주·위성 테마 R14 — PC 기존 원본 보존 + 누락 구간만 수집

날짜: 2026-10-25 · 전용 작업 브랜치: `codex/theme-fear-greed-integration-20261025` · PR #714 Draft.

## 사용자 확정 원칙

- **ETF 개수를 2개 또는 특정 개수로 제한하지 않는다.** 섹터/테마에 적합하며 적법하고 실측 가능한 ETF를 모두 후보로 유지한다. R13 후보 9개 전부를 감시하며 수집 성공 여부·유효 거래일·권리 검증에 따라 점수 가능성을 판단한다.
- 이번 R14의 **6개는 고정 바스켓이 아니라 PC R13에서 원본 누락/기간 누락으로 판명된 복구 대상 건수**다.
- 이전 9개 운영 테마/10번째, 기존 R188/R2/R3/R4/R9 산식·가중치·DB·D1·스케줄러·DNS·Cloudflare는 변경하지 않는다.
- 원시 1h JSONL은 사용자의 **PC 사설 `E:\ZGmini\data` 내**에만 저장한다. GitHub에는 실행 코드·합성 테스트·지침만 올린다. 파생 점수 공개/재배포 권리 `rightsVerified=false`, 게시 승인 `publicationAuthorized=false` 유지.

## PC R13 실제 SHA 검증 근거

- 사용자 제출 로그: `SPACE_SATELLITE_R13_EXISTING_RAW_RESULT.txt`; R13 `PHASE=ALL_CODE_SHA256_VERIFIED`, `RESULT=PC_EXISTING_RAW_COVERAGE_AUDITED_NOT_SCORED`.
- 공간 manifest: `b4f628d734e61f239c83ebd77c32c3c73e7eaaaf7c09bf260351e730cb861b38`.
- 재사용할 공유 SPY manifest: `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e`, 뉴욕 15시 유효일 706.
- 기존 원본 보존: UFO 656일 / NASA 144일 / ROKT 446일; 모두 마지막 SPY와 동일한 2026-10-23 15시 NY 세션.
- ARKX 원본 494일·마지막 세션 2025-12-18: **오래된 원본은 유지**하며 다음 날부터만 수집.
- WARP/ORBX/MARS/DIPR/WSPC 기존 로컬 원본 0개. API 실측 R12에서 무료 1h 데이터 존재를 검증했으나 2026-10-25 현재 마지막 데이터 10/23, 48h 지연.

## 수집 대상 — 기존 데이터는 다시 받지 않는다

| ETF | 실제 R13 분류 | 무료 1h 요청 시작 | 요청 끝 | 처리 |
| --- | --- | --- | --- | --- |
| UFO | 로컬 원본·SHA 정상 | — | — | **GET 0, 보존** |
| NASA | 로컬 원본·SHA 정상 | — | — | **GET 0, 보존** |
| ROKT | 로컬 원본·SHA 정상 | — | — | **GET 0, 보존** |
| WARP | 로컬 원본 없음 | 2026-05-07 | 2026-10-23 | 신규 원본만 |
| ORBX | 로컬 원본 없음 | 2026-04-15 | 2026-10-23 | 신규 원본만 |
| MARS | 로컬 원본 없음 | 2026-03-05 | 2026-10-23 | 신규 원본만 |
| ARKX | 2025-12-18까지 기존 SHA 정상 | **2025-12-19** | 2026-10-23 | 원래 이력 보존·뒤에만 추가 |
| DIPR | 로컬 원본 없음 | 2026-05-06 | 2026-10-23 | 신규 원본 수집·점수는 보류 가능 |
| WSPC | 로컬 원본 없음 | 2026-07-09 | 2026-10-23 | 신규 원본 수집·점수는 보류 가능 |

R12 공급원 실측의 뉴욕 **15시 실거래 세션** 기준 DIPR은 28일, WSPC는 15일이다. 둘 다 수집 대상에서 배제하지 않고 원시 관측값을 보존한다. 승인된 최소 40일 점수 조건을 만족하지 못하면 **점수에 끼워 넣거나 0/과거값으로 대체하지 않는다**. 향후 실제 관측일이 늘면 재검증한다.

## 전용 PC 수집 원칙 및 절차

1. Desktop 한 폴더에 9개 패키지 파일(8개 `.mjs`, R14 `.cmd`)을 전부 압축 해제한다. Node 런타임 `E:\ZGmini\runtime\node.exe`, DB 아닌 사설 데이터 루트 `E:\ZGmini\data`를 확인한다.
2. `theme-space-satellite-r14-missing-only.cmd`를 **사용자가 직접** 실행한다. CMD가 모든 JS 파일 SHA256을 검증한 뒤에만 `--collect`를 시작한다.
3. 사전 R13 기존 파일 SHA 및 두 manifest를 비교하고, 동일 상태가 아닐 때는 **네트워크 요청 전 중단**한다. `state/collection.lock`에서 다른 수집기와 충돌하면 중단한다.
4. 무료 `GET /api/v1/bars/stocks/{ETF}/1h`, 각 회 최대 6 GET, 매 페이지 최대 5,000행/6MB. 실패/402/429/timeout/결과 누락/해시 불일치 시 즉시 중단, 재시도 **자동으로 금지**.
5. 신규 파일은 `raw/{ETF}_{SHA256}.jsonl`로 저장해 SHA 재검증 후 기존 `raw-manifest.json`의 **끝에만 추가**. 기존 원본은 읽기만 한다. 별도 R14 체크포인트로 이어 받기 가능; 진단 없이 실패 체크포인트를 삭제·초기화하지 않는다.
6. Desktop의 `SPACE_SATELLITE_R14_MISSING_ONLY_RESULT.txt`에 결과가 **추가 기록**된다. 사용자에게 이 로그만 요청한다. 로그에는 원본 시세·키를 기록하지 않는다.
7. PC 성공해도 즉시 공개/투자 판단으로 연결하지 않는다. 그다음은 R13 읽기 전용으로 9개 ETF + SPY NY15 세션 재실측, 신규 ETF 적격성·가중치 검증 후 권리·공개 게이트.

공급원: [GetMarketHistory 공식 API 레퍼런스](https://getmarkethistory.com/docs/api/reference), [무료 표본·호출 제한](https://getmarkethistory.com/docs/limits), [이용약관](https://getmarkethistory.com/docs/terms). **무료로 다운로드되는 것과 상업적 파생 점수 공개 권리는 별개**다.

## 완료 판정

- `R14_SOURCE_TEST_PASS`: 합성 테스트 및 런처 해시 일치 시에만.
- `R14_PC_COLLECTION_SUCCESS`: 사용자의 실제 결과 로그를 보고 검증한 뒤에만.
- `R14_PRIVATE_SCORE_VALIDATED`: 9개 후보의 원본 SHA/SPY 공통 유효일·각 산식 실제 점수 검산 후에만.
- `R14_PUBLICATION_AUTHORIZED`: 별도 권리 검증과 사용자 승인이 있기 전까지 **항상 false**.

현재 R14 단계는 **비공개 데이터 누락 복구 도구의 제작·검증**이며, 실제 사용자 PC 다운로드·점수 계산·main 병합·배포의 완료를 의미하지 않는다.
