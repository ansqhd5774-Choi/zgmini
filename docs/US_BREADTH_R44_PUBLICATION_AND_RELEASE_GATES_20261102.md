# US Breadth R44 — verified R2 D1 final and remaining release gates


## 2026-11-27 — 유료 MarketParquet 기반 기능 재개 (최신 판단)

- 사용자가 **Complete Archive + Keep Current** 구매를 확인했다. Gmail의 2026-11-20 두 활성화 회신과 최신 `main/docs/MARKETPARQUET_REMOVAL.md`의 `plan=full` 실PC 조회·공통 유료 원자료 저장 증거를 재사용한다. 이전 무료 샘플 공개 거절·11/16 사용 중단 기록은 **무료 상품에 한정된 역사 증거**이며 유료 이용권까지 부정하지 않는다. 새 API 키·메일 문의·유료 구매는 필요 없다.
- 기존 미국 **전체 주식** R2와 S&P500 기반 유료 경제지표 B1-R5는 다른 출력 계약이다. R2는 거래일별 `stock_daily` 전체 종목의 상승·보합·하락 **비율**만 공개하며 S&P500 수급·폭 4요인 점수를 R2라고 대체하지 않는다.
- 기존 전용 브랜치를 보존해 source-only 파일 `lib/market-breadth/us-marketparquet-paid-r2-adapter.mjs`, `tests/us-marketparquet-paid-r2-adapter.test.mjs` 추가. 유료 `plan=full` 영수증·같은 분할조정 기준·두 실제 거래일을 확인하고 기존 R2 `MISSING_AS_UNCHANGED` 계산기를 재사용한다. 결측 *전일 종목*은 보합 분류하지만 *전 거래일 파일 자체*가 없으면 차단한다. private 수량/원자료는 공개하지 않으며 계산 후보의 `publicationAllowed=false`를 유지한다.
- 격리 순수 함수 시험(실제 GitHub 소스, 거래일 확인 fixture) 5/5: 정상 상승/보합/하락, 무료 영수증 거부, 비연속일 거부, 중복 소스 거부, 무효 가격 거부. **실제 Node CI·실PC 수집·설치·D1·Production 통과 아님**.
- 2026-11-27 최신 `main`과 이 브랜치는 **71커밋 ahead / 1203커밋 behind**, `diverged`. 옛 브랜치 전체 병합·main 직접 덮어쓰기 금지. 현행 `main`에는 유료 공통 저장기 `marketparquet-paid-store.mjs`가 있고 미국 전체 R2 공개 Reader는 과거 제거 상태. 2026-11-26 UI PR #1695에 별도 복구된 표시 쉘이 있으며 운영 사이트에서 '연결 예정' 확인.
- **다음 필수 기능 단계:** 현재 `main`의 유료 `readPaidDaily/readPaidProjection` 검증 결과에 이 private R2 adapter를 **필요한 파일만 선별 통합** → 연속 실제 거래일로 최신/250회 이력 계산 및 로컬 SHA readback → 별도 유료 R2 key에 정확한 CAS/readback 게시 → GET percent-only/current+history → 기복구 UI 연결 및 PC/모바일 실측. 기존 무료 R1/IEX keys, 한국 지수, S&P500 B1-R5, 테마·섹터, 예약·원자료를 변경하지 않는다. 기능 완료 전 예약 자연 갱신 검증 금지.

## 2026-11-27 추가 구현 — 기존 유료 stock_daily 저장자료 R2 계산 경로

- 신규 source-only `scripts/pc-writer/us-breadth-paid-r2-stored.mjs` — 커밋 `e14cc67d8b3a80abed221de54428e22222bef9cb`. 기존 `marketparquet-paid-store.mjs`의 `paidDates/readPaidDaily/readPaidProjection` 계약을 런타임 호출 시 재사용하며, 유료 원자료 **수집/DB/원자료 쓰기 없음**. 현재 브랜치는 유료 공통 저장기가 추가되기 이전 시점이므로 기본 저장기 모듈은 여기에는 아직 없으며, 최신 main에 **정확한 소스만 선별 통합한 후** 실제 디스크 경로를 사용해야 한다. 격리 시험에는 동일 인터페이스를 주입한다.
- 최대 실제 원자료 **251개 연속 거래일 → 250개 비교**만 후보. 날짜 인덱스 중복·역순·비연속 거래일·전체 선행 파일 누락·선택 날짜 부재는 실패 반환. 각각의 원본/정규화 SHA 재조회는 기존 유료 저장기 함수가 책임지고, 반환은 본일 비율 점·민감하지 않은 검증 메타와 비공개 원본 SHA로 분리한다. **공급자 최신 제공일은 이번 로컬 목록만으로 검증하지 않음**; `latestStoredDate`와 명시적으로 구분.
- 회귀시험 `tests/us-breadth-paid-r2-stored.test.mjs` — 커밋 `6fb0657fdff0aeeb41c057a1ee9556b97a423167`. 실제 GitHub 계산기/adapter/저장자료 모듈을 격리 V8에 불러온 fixture 실행 **7/7 통과**: 두 실제 연속 거래일의 비율 계산, 전체 거래일 결손, 무료 영수증, 저장 readback 실패, 요청 날짜 부재, 날짜 인덱스 역순, 비정상 비교 길이. 이는 **Node CI나 실제 운영 PC/원자료 검산 PASS가 아님**.
- 추가 250회 경계 시험: `tests/us-breadth-paid-r2-stored.test.mjs`에 `251`개 거래일 영수증 → `250`개 계산점, 공개 후보 승격 금지 및 외부 호출 0 검증 추가 (커밋 `37a2d56ebe6d9d31bd56bd0cc21c8c1c26ab3060`). 실제 Node CI 통과 여부는 미확인.
- **비공개 로컬 저장 구현:** `scripts/pc-writer/us-breadth-paid-r2-private-save.mjs` (커밋 `7110c8403b14adaed4dae7abf1ad9872bceced6b`, 수정 `fe5b88c447960ea9c1f65538595d82a3dd2b9bd5`)은 기존 승인 Writer가 `saveEnabled=true`로 호출할 때만 `marketparquet-paid/derived/us-breadth-r2/`에 SHA 이름의 **새 파일만** 생성하고 즉시 동일바이트 readback한다. 동일 재실행은 무쓰기, 충돌은 원본 보존, 쓰기 불명확은 `operationalWrites:null`로 보고. 출처/분할조정 모드와 실제 거래일·원본 SHA 쌍을 검사하며 개별 종가·전체 원본 행은 직렬화하지 않는다. **기존 Core에서 이 함수를 호출·설치한 것은 아니므로 실제 PC 파일 생성 증거는 없음**.
- 로컬 저장 회귀시험 파일 `tests/us-breadth-paid-r2-private-save.test.mjs` (커밋 `d6ef09af050a1174537e865b5af5e081ef396d59`, 수정 `af2bb05c84ee7d0bb6b936fa1b996effb6b304db`)에는 격리 TEMP의 초회 생성/재실행/충돌, 금지 입력 무쓰기, raw 가격의 직렬화 제외를 검사하는 Node 시험을 추가했다. **Node CI 실행 결과는 아직 미확인**.
- **남은 기능 실행:** 현재 main의 정확한 유료 원자료 저장 계약과 선택적 소스 통합 및 Node/CI 검증 → 승인된 Writer에서 로컬 자료 250회 계산·불변 파일 저장/재조회 → 공개 권리 범위를 지킨 R2 최종 파생값 D1 CAS/readback → percent-only API → 기존 UI 연결 및 Production 렌더링. 새 공급처·쿼터·예약·산식, 무료 샘플 게시, 과거 점수 임의 개정·가짜 이력 금지. **자연 예약 자동 갱신 검증은 기능 작업 완료 이후에만**.

Date: 2026-11-02 KST. Repository: `ansqhd5774-Choi/zgmini`.
Development branch: `codex/us-breadth-public-r1-20261031`.

## Actual operator evidence — no re-collection required

- R31 staged the **250 available** MarketParquet source days. The absent oldest
  2025-10-31 baseline does not block the collected history or current source pair.
- R37 operator result: `VERIFIED_PERCENT_HISTORY_FINAL`, D1 write/readback for
  `public:market-breadth-confirmed-r2:usa:history-percent:v1` covering percentage
  comparison points from 2025-11-04 to 2026-10-30. This key is immutable in
  subsequent R43/R44 steps.
- R43 operator result: `R43_VERIFIED_STAGING_ONLY`, process exit 0,
  `d1Writes=1`, `stageReadbackVerified=true`. The row was the independent
  `public:market-breadth-confirmed-r2:usa:staging` key in approved CORE D1.
  Actual D1 staging-body SHA256:
  `830491288e7a66ad42c488c039afdbb466439708f06aa7156c16c141bedcfccd`.
- R44 FIX1 operator result: **`R44_VERIFIED_CURRENT_AND_DAILY_FINAL`**,
  process exit 0, `d1Writes=2`, `readbackVerified=true`,
  `publicationAllowed=true` for `2026-10-30`. CORE D1 contains independent
  R2 keys `public:market-breadth-confirmed-r2:usa:current` and
  `public:market-breadth-confirmed-r2:usa:daily:2026-10-30`.
  The final was promoted only after exact staging and source SHA checks.
- Verified percentage output for that session: rising 26.4217645250538%,
  falling 67.78358438364587%, unchanged 5.794651091300338%.
  Only these percentages, not constituent totals, belong on public output.
- The R44 original operator attempt stopped at argument validation with
  `d1Writes=0`; FIX1 used the reviewed staging SHA without manual text entry.
- Existing R1 confirmed key, 250-session R1 history, R37 R2 percent history,
  IEX provisional keys, PC Core scheduler, lock/PID and E: source are unchanged
  by R43/R44. All above D1 assertions are from operator PC logs, **not** from
  direct Cloudflare console access from this workspace.

## Actual public HTTP and source state

Read-only checks on 2026-11-02 KST:

1. `GET https://zgmini.kr/api/market-breadth?market=usa&phase=confirmed-r2`
   returned HTTP 200 with the **old R1 body shape containing counts**, not the
   R2 percent-only contract. Production currently ignores this phase.
2. The same route with `phase=provisional` returned the same old R1 body shape.
3. `GET https://zgmini.kr/api/market-breadth-r2-history?market=usa`
   returned HTTP 404.
4. Latest main observed: `a198e3c5cd21a955454fe5e9641cd5d42246bcde`.
   It lacks R2 phase dispatch and the independent history route. On the
   development branch the separate R2 readers and route tests already exist;
   four targeted reader/route test files passed in the source workspace.

Do not call the D1 write a website deployment or report the old R1 response
as an R2 API success. No production deploy was performed with this evidence.

## Deployment-only branch must remain deployment-only

- Existing release PR: <https://github.com/ansqhd5774-Choi/zgmini/pull/943>
  (`release/us-breadth-history-r2-20261031` -> `main`) is **draft/unmerged**,
  containing only the history API and its two required library files.
- PR #943 last observed Node.js CI completed **failure** on 12 unrelated
  regression tests also failing on its main baseline. This is not proof of a
  successful required production gate. Do not silently merge it or add
  development files to that release-only branch.
- Source-only R2 `phase=confirmed-r2` and `phase=provisional` readers on the
  development branch have not yet been selectively released to main.
- UI layout/count removal and R2 1-year percentage chart work belong to the
  existing `codex/ui-improvements` branch, preserving main's current visual
  interaction work. Never merge that branch wholesale.

## Remaining ordered tasks

1. **API release gate:** confirm latest main/bindings/CI, select only audited
   R2 history and R2 current/provisional read-only endpoint dependencies,
   using approved deployment-only workflow and selective PR review. Keep R1
   legacy keys and routes available as historical data without relabelling.
2. **Automated freshness:** the R44 record is a one-time 2026-10-30 current.
   After the next US completed session, the R2 current reader correctly
   rejects the stale day. Verify the actual approved PC Core Task action/source
   (R39 reported multiple project candidates), then plan repeated full-market
   daily source acquisition and R2-only percent final publication with no
   task re-registration or old-key write. This remains **unverified**.
3. **IEX natural slots:** verify three consecutive real 15-minute NY slots,
   their approved PC producer, D1 readback, and API timestamp progression.
   Do not impose R2 98% or directional agreement on IEX provisional.
4. **UI release:** add clear provisional/confirmed labels and percent-only
   visible output and 1-year R2 percentage history. No R1 503-count fallback
   presented as a MarketParquet full-market R2 result.
5. **Production gate:** approved PR into main -> Cloudflare Git integration
   build/deployment -> exact API results -> D1/read-only consistency -> live
   desktop/mobile UI. Do not use Sites, direct Wrangler production deploy,
   Cloudflare Cron, or arbitrary Core changes.

Oldest missing baseline collection, repeat R42/R43/R44 preflight, and
R1-to-R2 direction matching are **not** prerequisites for the above work.
