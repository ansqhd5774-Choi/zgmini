# ZGMINI 지표 원자료 연결 운영 기준 — SEC/BEA 검증 경험의 자산 버블 R10 적용

기준일: 2026-10-29(KST). 작업 브랜치: `codex/api-site-integration-r1-20261026`.

## 1. 변경하지 않는 세 가지 진실

1. GitHub 최신 `main`은 Production 소스, PC 승인 `config.source`는 로컬 수집·계산 실행 소스다. 서로 다르다고 PC 운영 체크아웃을 임의 업데이트하지 않는다.
2. 대시보드 **안전 점수**와 상세페이지 **원자료 관측값**은 서로 다르다. 백분위 정규화 점수를 원자료의 %처럼 표시하면 안 된다. 기존 산식·가중치·다른 D1 키를 변경하지 않는다.
3. 수집·계산, PC 저장, D1 게시/readback, Worker API, Cloudflare 빌드/배포, 실제 PC·모바일 UI는 각각 별개 Gate이다. 앞 단계를 PASS해도 뒤 단계 완료로 보고하지 않는다.

## 2. 기존 사례에서 확인된 안전한 순서

1. `main`, 소유 작업 브랜치, `AGENTS.md`, 현재 공개 API, 실제 화면을 각각 최신 상태로 조회한다. 목표 지표에 이미 어떤 원본과 체크포인트가 있는지 먼저 확인한다.
2. 원본의 제공기관·정확한 계열·관측 구간·단위·계절조정·연율·자료 개정 상태·이용 권한·식별 해시를 기록한다. 기존 유효 PC 저장 원본을 다시 수집하거나 덮어쓰지 않는다.
3. PC 쪽은 보존 원본 **읽기 전용** 계산과 승인 산식 대조부터 한다. 품질, 월말/분기말, 결측, 이전 분기 연속성, 총점/구성점수 일치 여부를 검산한다. 오류 시 원본과 점수를 보존하고 STOP한다.
4. 필요한 경우에만 별도 raw sidecar D1 키와 `GET/HEAD` read-only API를 준비한다. 기존 projection·점수 키는 덮어쓰지 않는다. 유효한 원자료가 확인된 한 키에만 조건부 게시를 허용한다.
5. 게시 응답이 불명확하면 같은 키의 D1 **재조회부터** 수행한다. `READBACK_VERIFIED` 또는 동일 저장본 `ALREADY_STORED`만 게시 성공으로 분류한다. 실패를 임의 재시도하지 않는다.
6. UI는 raw API가 `READY/FRESH`이고 원본 identity·기간·구성점수·종합점수가 기존 진단과 일치할 때에만 원자료로 표시한다. 대기·결측은 `—`, 기존 점수는 `진단 점수`라고 명확히 표시한다.
7. 원격 `main`이 앞서 나간 경우 최종 SHA와 대상 파일 SHA를 다시 비교한다. 전체 개발 브랜치 병합 금지. 필요한 파일만 선별 PR → CI → `main` 병합 → Cloudflare Git 자동배포를 사용한다. 수동 Wrangler/Sites 배포 금지.
8. Cloudflare **정확한 커밋/Build ID/Version ID**를 확인하고, 공개 API 숫자와 PC 원본·D1 readback·PC/모바일 상세페이지의 값·단위·날짜가 일치하는지 확인한다. 동작하는 사이트의 다른 지표에 가짜 장애를 만들지 않는다.

선행 증거: SEC E1-R4 백엔드 PR #863, UI 선별 PR #866. 이는 절차 성공 사례이지 **자산 버블 R10의 완료 증거는 아니다.**

## 3. 자산 버블 R10 최신 공개 상태 (읽기 전용 확인)

- `https://zgmini.kr/api/asset-bubble-detail`: `READY`, 안전점수 **22.57324252737245**, 최신 완료 **2026-Q2**, 진단 분기 **2026-Q4**.
- 6개 원자료 행은 점수는 `READY`이나 `value:null`, `previousValue:null`, 출처 미게시. 현재 화면의 `—`는 원자료 0이 아니다.
- 현행 `scripts/pc-writer/build-asset-r10-release.mjs`는 승인 R10 점수 payload를 계산해 원자료 `value:null`, `unit:'점'`을 명시적으로 게시한다. 이 기존 코드를 임의 덮어쓰거나 점수 계산에 원자료를 재주입하지 않는다.
- 추가 4개(주택가격 밸류에이션, 마진대출·레버리지, IPO, 옵션 투기수요)는 `개발중`이다. 공개 수집 실패 건수로 계산하지 않는다.
- 근거는 PC SQLite의 `market_input_batches_v1` macro/SP500, PC 로컬 R10 `breadth-research`, `alpaca-pit-validation`, `alpaca-collected-audit`, 그리고 기존 `release-payload`이다.
- 게시 정책은 `USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES`, `rightsStatus: USER_ACCEPTED_UNVERIFIED`, `lookAheadSafe:false`이다. 독립 원자료 권리·PIT 가격조정 검증이 완료됐다고 표기하면 안 된다.

## 4. R10 raw 의미·단위 원장 (기존 승인 산식 불변)

| ID | 원자료 도출 | 표시 단위 | 검증해야 할 지점 |
| --- | --- | --- | --- |
| `valuationPressure` | (금융+비금융 상장주식 시가총액) ÷ 명목 GDP(단위 천 배 보정) | GDP 배수 | Z.1 USD 백만 / GDP USD 십억, 1997-Q1 이후 동기 정렬 |
| `priceAcceleration` | 100×[4 ln(Pt/Pt−3m) − ln(Pt/Pt−12m)] | 로그 성장률 차이 %p | 승인 저장 SP500 가격만, 월말 마지막 유효 관측 |
| `riskAssetShare` | 가계 위험자산 비중 − 전년 동기 비중 | %p | FRB Z.1 원계열은 금융자산 대비 주식 비중(%) |
| `speculativeFlows` | 100×max(0, 최근 4분기 거래 연율의 평균) ÷ 4분기 전 보유액 | 보유액 대비 % | FRB 거래 계열은 **연율**이므로 합계/4 필요 |
| `breadthDivergence` | 세 월말의 max(0, 12개월 수익률 순위 − 200MA 참여율 순위) 평균 | 백분위 순위 격차 p | 검증된 로컬 R10 breadth와 price quality, 미승인 B1 대체 금지 |
| `excessLiquidity` | M2 분기평균 YoY% − 명목 GDP YoY% | %p | M2 월별 계열을 달력 분기평균으로 맞춤 |

원자료 레퍼런스:
- FRB Z.1 금융·비금융 주식시장 가치 `BOGZ1LM793164115Q` / `BOGZ1LM103164115Q`.
- FRB 가계 주식 비중 `BOGZ1FL153064486Q`, 가계 주식 거래/보유 `BOGZ1FA153064475Q` / `BOGZ1FL153064475Q`.
- BEA 명목 GDP `GDP`, FRB M2 `M2SL`.
- 공식 시계열 메타데이터: `https://fred.stlouisfed.org/series/<ID>`.

## 5. 이번 단계와 다음 Gate

이번 단계는 `ASSET_R10_RAW_PREFLIGHT_R1.mjs`를 **PC 읽기 전용**으로 실행해 기존 점수와 6개 raw 값·단위·직전 분기를 대조하는 것이다. 이 검증은 공개 게시를 포함하지 않는다. 실 PC 결과가 `PASS_READONLY_ASSET_R10_RAW_PREFLIGHT`가 아니면 원자료용 D1 저장/새 API/UI 배포를 하지 않는다.

다음 Gate는 실 PC 검산 결과, 공개 R10 기존 6점수·총점과 재비교, 기존 저장 원본과 권리 상태 명시, 별도 D1 키의 정확한 readback, 최소 파일 PR, Cloudflare Git 자동배포, 실제 UI 확인 순서다.

**중지 조건**: 원본/권리/단위 불명확, 2026-Q4 값을 2026-Q2에 채우려는 시도, 저장 소스가 기존 release보다 최신으로 바뀌어 체크포인트가 어긋난 경우, R10 총점·구성점수 불일치, PC 원본 변경 감지, 권한·비용 확대 요구.

## 6. R10 R2 후속 Gate — 기존 점수 유지, 원자료 sidecar만 추가

- 사용자 PC에서 R1 실측: `PASS_READONLY_ASSET_R10_RAW_PREFLIGHT`, `PREFLIGHT_EXIT_CODE=0`, `WRAPPER_RESULT=PASS_READONLY_NO_REMOTE_WRITES`, `pcSqliteWrites=0`, `d1Writes=0`, `scoreWrites=0`. 6개 구성점수와 총점 `22.57324252737245` 일치. 실행 화면 근거이며 D1 게시 증거가 아니다.
- 유일하게 새로 쓸 수 있는 D1 키: `market_public_snapshots_v1.snapshot_key='detail:asset-bubble-raw:r1'`. 기존 `detail:asset-bubble:v1` / `current` / 다른 지표 키와 계산 산식은 변경하지 않는다.
- sidecar `ASSET_R10_RAW_SCHEMA='asset-bubble-r10-raw-r1-v1'`는 6개 원값·직전 값·단위·출처·관측일, 공개 R10 원본 체크포인트와 구성점수·총점을 저장한다. `rightsStatus=USER_ACCEPTED_UNVERIFIED`, `historyMode=CURRENT_VINTAGE_NOT_PIT` 그대로 유지한다.
- 기존 점수 `/api/asset-bubble-detail`은 **D1 SELECT 1회** 계약을 유지하므로 수정하지 않는다. 원자료는 별도 `GET/HEAD /api/asset-bubble-raw`(별도의 SELECT 1회)로만 읽는다. UI는 `sourceVersion`, `sourceStoredAt`, `asOfDate`, `scoreObservationQuarter`, 총점과 **6개 각각의 점수**가 전부 일치할 때만 원값을 렌더링한다. 누락·오류·버전 불일치면 기존 점수 표시를 보존하고 원값은 `—` 처리한다.
- 한 번의 PC D1 게시 스크립트는 R1 읽기 전용 검산을 내부 재사용한 뒤, GitHub `main`의 clean publisher와 별도 승인된 PC operational source를 확인한다. 조건부 upsert 단 한 키만 허용하며 반환 코드가 불분명하면 다시 쓰지 않고 D1 재조회한다. `READBACK_VERIFIED` 또는 `ALREADY_STORED`를 구분한다.
- 구현·시뮬레이션 테스트 통과는 운영 `D1 readback`·`Cloudflare deployment`·`public API`·`PC/mobile actual UI`의 PASS가 아니다. 4개 개발 중 지표는 그대로 `개발중` 표시한다.
- 새로운 backend 파일: `worker/asset-bubble-r10-raw-r1.mjs`, `scripts/pc-writer/ASSET_R10_RAW_D1_ONE_SHOT_R2.mjs`, `scripts/pc-writer/ASSET_R10_RAW_D1_APPLY_R2.cmd`, `tests/asset-r10-raw-sidecar-r2.test.mjs`. `worker/candidate-r52.ts`에 원자료 전용 읽기 경로만 추가한다. 기존 `worker/projection-runtime-r52.mjs`·점수 projection은 변경하지 않는다.
- 위 CMD는 **새 코드와 필수 R1 검증 파일을 지정 SHA로 포함한 clean GitHub `main`이 먼저 배포된 뒤에만 사용 가능**하다. 변경 SHA가 어긋나면 STOP하며, UI 승인 전 시험용 D1 저장을 임의로 강행하지 않는다. 실제 게시 시 `ZGMINI_ASSET_R10_OPERATIONAL_ROOT`(또는 기존 `ZGMINI_EARNINGS_C_OPERATIONAL_ROOT`)가 승인 PC 운영 소스를 가리켜야 한다.
