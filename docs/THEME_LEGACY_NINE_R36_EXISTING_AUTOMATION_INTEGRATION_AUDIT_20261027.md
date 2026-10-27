# R36 기존 자동수집 재사용·63종 연결 구조 감사 (읽기 전용)

- 기준일: 2026-10-27.
- 단일 작업 브랜치: `codex/theme-fear-greed-integration-20261025`.
- 확인한 개발 main: `b8e1a495df88529e4c4bd193e23730acb2838c34`. 당시 본 브랜치는 main 대비 ahead 214 / behind 91; 전체 병합·운영 코드 덮어쓰기 금지.
- 상태: **GITHUB_CODE_AND_EXISTING_OPERATION_REGISTRY_AUDITED / PC_CURRENT_63_COVERAGE_UNKNOWN / R35_PAUSED / NO_PUBLICATION / NO_SCHEDULER_CHANGE**.
- 사용자 확인: 구버전 테마 공포·탐욕은 이미 매일 자동수집·계산·출력하며, 2026-10-26 값도 기존 작업과 별도 Codex 요청으로 사이트에 반영됐다. R35의 별도 공급자 최신일 2026-10-23은 기존 운영 갱신 실패를 의미하지 않는다.
- 본 단계는 신규 자동수집 체계 구축이 아니다. 중복 수집·별도 정규 스케줄러 생성은 추진하지 않는다.

## 1. 실제 코드를 통해 확인한 기존 경로

| 구분 | 코드/등록부 근거 | 판정 |
| --- | --- | --- |
| 기본 7개 수집 작업 | `config/theme-data-registry.json`: `ZGMINI-PC-GetMarketHistory-ETF`, `ZGMINI-PC-MarketParquet-ETF` | **기존 작업 재사용 우선** |
| 기본 7개 PC 수집기 | `E:/ZGmini/data/theme-market-history-r131/marketparquet-r167/r181-primary-cycle.mjs` | GitHub에 실 운영 원본 전체 미보관. 현 PC 등록 액션/실코드는 별도 읽기 전용 확인 필요 |
| 계산 | 같은 PC 운영 경로의 `r179-publish-core.mjs` | 기본 7개 구버전 기준; 63종 지원을 추정하면 안 됨 |
| 게시 | 같은 경로의 `r171-publish.mjs` | 기존 D1 rolling 경로 유지 |
| 공개 결과 | D1 `public_feed_snapshots_v1`, `theme-etf-only-rolling/current` | 기존 공개 key 보호 |
| 공개 검증 | `worker/theme-etf-rolling-public.mjs`, `worker/theme-etf-only-public.mjs` | 기존 7개·2 ETF/테마·기준 `SPY`, 고정 버전/가중치 검증 |
| 별도 AI/바이오 | `theme-ai-semiconductor-optional.mjs`, `theme-biotech-optional.mjs`, 바이오 R7/R8 연결 등 | 기본 7개와 **독립 상태**. 등록부의 일부 과거 상태와 실제 2026-10-26 운영은 재대조 전 동일시 금지 |

운영 코드의 현재 유효 원본은 **PC의 실제 작업 액션·실행 소스**다. GitHub main 문서만으로 작업명·프로세스·수집 범위를 확정하지 않는다. 기존 PC 저장소를 재구축하거나 새 자동수집 시스템으로 갈아타지 않는다.

## 2. 63종과 기본 7개 수집 범위의 확정 차이

- 승인 대상: `config/theme-nine-r20-approved-candidates.json`, 기존 **9테마 / 64 편입 위치 / 고유 ETF 63종**; 벤치마크 `SPY`는 별도.
- 공개 기본 7개 기존 페어: `worker/theme-etf-only-public.mjs`. 실제 7개×2 포지션은 중복 BOTZ 1개를 포함한 **고유 ETF 13종**.
- `lib/market-score/theme-etf-provisional-score.mjs`의 `R158_SYMBOLS`는 `SPY` + 기존 고유 ETF 13종 = **14개**로 고정되어 있다.
- 63종 로스터에서 기존 기본 7개 원래 대상과 일치하는 ETF: **13/63**. 기존 7개 수집 경로만으로 해당 목록에 포함되지 않은 **50종**까지 자동으로 처리된다고 볼 근거는 없다.
- 이 50종 중 `SMH/SOXX/IBB/XBI`는 AI·바이오 별도 경로 또는 저장 자료에 존재할 가능성이 있으나 **2026-10-26 PC 운영 경로별 실커버리지는 미확인**이다. 50종 전체가 새 API GET을 필요로 한다는 결론도 내리지 않는다.
- MarketParquet의 날짜별 Parquet 자료는 여러 종목을 포함할 수 있다(공급자 공개 문서). **실파일 내부 `symbol` 확인** 전에는 기존 보관 자료에 50종이 있다고도 없다고도 말할 수 없다.

## 3. 신규 산식 준비 상태·공개 호환성

| 항목 | 이미 확보한 증거 | R36 판정 |
| --- | --- | --- |
| R23 원가격 | 64/64(63 ETF+SPY), 원본 121개, R34 읽기 전용 SHA 121/121 PASS | 역사 자료 보존; 증분 정규 수집과 별개 |
| R25 개별 점수 | 실제 PC 63 ETF 중 최신 45개 유효·18개 결측 | 최신 18개 임의 계산/0점 치환 금지 |
| R26 공식 AUM | 63/63, 원래 발행사 기준일 보존 | 과거 252일 당시 AUM을 재구성했다고 주장 금지 |
| R32 가중 합산 | 실제 PC 9×252=2,268개 그림자 관측치 PASS | **PRIVATE_STAGE5_AND_STAGE6_SHADOW_ONLY** 승인. 바로 게시 불가 |
| R33 비교 | 기존 공개에 존재하는 8테마×252=2,016 동일 날짜 비교 완료. AI는 기존 공개 기준선 부재 | 결과 불일치 자체는 오류가 아님 |
| R35 별도 공급자 Delta | SPY 최신 2026-10-23, GET 1, 신규 저장 0, WAIT | **재시도/별도 자동화 중지**, 기존 10/26 수집과 혼동 금지 |

기존 public reader는 `THEME_ETF_ONLY_R144_252_PUBLIC_V1`, `ETF_ONLY_T40_R20_V40_PAIR50`, 7개 순서·페어·가중치·252점·rolling `coverage.etfs===13`·기존 seed hash 등을 엄격하게 검사한다. **새 9테마/63종 결과를 기존 `theme-etf-only-rolling`에 그대로 덮어쓰면 검증 실패 또는 기존 공개 계약 훼손 위험**이 있다. 새 모델의 공개는 별도 승인 후 **새 revision/key와 검증 reader + 구버전 fallback**으로 설계해야 한다. 여기서는 구현·배포하지 않는다.

## 4. 다음 작업의 최소 범위: 운영 재사용 가능성 표만 확인

1. PC **읽기 전용**으로 `ZGMINI-PC-GetMarketHistory-ETF`, `ZGMINI-PC-MarketParquet-ETF` 및 AI/바이오 별도 작업의 현재 작업 액션, 유효 소스 경로, 현재 처리 ETF 목록을 한 번에 파악한다. 과거 10/24 XML 실측은 재활용하고 달라진 항목만 확인한다. 민감한 계정·SID·환경변수·API key는 결과에 담지 않는다.
2. 승인 63종 ↔ 기존 PC 저장 manifest/MarketParquet 실제 `symbol` ↔ 기존 예약 작업 대상 ETF를 대조하여 **(a) 정규 자동수집 재사용, (b) 기존 저장 원자료만 재사용, (c) 현재 관측 부재** 세 부류로 나눈다. `R23` 정적 원본과 당일 갱신 자료를 혼동하지 않는다.
3. 기존 63종 수집 커버리지 확인 뒤에만 부족 종목을 **기존 운영 정규 사이클에 편입할 최소 변경안**을 작성한다. 새 작업·중복 GET·임의 API 구매/권한 확보는 선택하지 않는다.
4. 새 R25/R32 계산과 발행사 AUM 입력 업데이트의 정규 반복 가능성 및 기존 `SPY` 재사용을 확인한다. R32 현 승인 `publicationAuthorized=false` 계약은 **공개 승인을 받기 전 유지**한다.
5. 차후 공개 전환 승인이 주어지면 독립 새 결과 key의 실제 D1 CAS/readback, 공개 API/모바일, 다음 기존 정규 사이클과 실패 시 구버전 fallback을 검증한다. 이전 이력·점수·스케줄러·운영 경로는 수정 전 백업과 비교 없이 덮어쓰지 않는다.

### 완료 판정 범위

- **이번 R36 완료**: GitHub에 보관된 등록부와 계산/공개 reader의 계약·63 대 13 커버리지 차이·재사용 경로를 구조적으로 확인하고 추가 수집기 계획을 취소.
- **아직 미확인**: 실제 PC 작업 액션/실제 수집 파일 내 63종 커버리지, 운영 코드와 현 main의 동일성, 신규 산식 정규 계산·게시 실행, 신규 공개 revision/권리/운영 승인.
- **변경 수**: Provider GET 0, PC E: 원자료/DB 0, D1 0, 예약 작업 0, Cloudflare 0, 기존 공개 결과 0.
- R35는 별도 실행 중지 유지. 이 문서 자체를 정규 운영 자동화 설치 요청으로 해석하면 안 된다.

## 원천 근거

- [PC 수집·저장·계산 운영 계약](PC_WRITER_R2.md)
- [테마 운영 등록부](../config/theme-data-registry.json)
- [기존 테마 데이터 운영 지침](THEME_DATA_OPERATIONS.md)
- [R22 6단계](THEME_LEGACY_NINE_R22_SIX_STAGE_TOOL_ASSIGNMENT_20261026.md)
- [R33 6단계 실제 비교](THEME_LEGACY_NINE_R33_STAGE6_PRIVATE_AUDIT_20261027.md)
- [R35 비공개 Delta 대기](THEME_LEGACY_NINE_R35_DELTA_COLLECTION_20261027.md)
- [GetMarketHistory Reliability](https://getmarkethistory.com/docs/reliability/)
- [MarketParquet 데이터 구조 문서](https://marketparquet.com/documentation)
