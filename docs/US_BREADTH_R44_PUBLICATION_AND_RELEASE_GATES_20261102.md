# US Breadth R44 — verified R2 D1 final and remaining release gates


## 2026-11-27 — 유료 MarketParquet 기반 기능 재개 (최신 판단)

- 사용자가 **Complete Archive + Keep Current** 구매를 확인했다. Gmail의 2026-11-20 두 활성화 회신과 최신 `main/docs/MARKETPARQUET_REMOVAL.md`의 `plan=full` 실PC 조회·공통 유료 원자료 저장 증거를 재사용한다. 이전 무료 샘플 공개 거절·11/16 사용 중단 기록은 **무료 상품에 한정된 역사 증거**이며 유료 이용권까지 부정하지 않는다. 새 API 키·메일 문의·유료 구매는 필요 없다.
- 기존 미국 **전체 주식** R2와 S&P500 기반 유료 경제지표 B1-R5는 다른 출력 계약이다. R2는 거래일별 `stock_daily` 전체 종목의 상승·보합·하락 **비율**만 공개하며 S&P500 수급·폭 4요인 점수를 R2라고 대체하지 않는다.
- 기존 전용 브랜치를 보존해 source-only 파일 `lib/market-breadth/us-marketparquet-paid-r2-adapter.mjs`, `tests/us-marketparquet-paid-r2-adapter.test.mjs` 추가. 유료 `plan=full` 영수증·같은 분할조정 기준·두 실제 거래일을 확인하고 기존 R2 `MISSING_AS_UNCHANGED` 계산기를 재사용한다. 결측 *전일 종목*은 보합 분류하지만 *전 거래일 파일 자체*가 없으면 차단한다. private 수량/원자료는 공개하지 않으며 계산 후보의 `publicationAllowed=false`를 유지한다.
- 격리 순수 함수 시험(실제 GitHub 소스, 거래일 확인 fixture) 5/5: 정상 상승/보합/하락, 무료 영수증 거부, 비연속일 거부, 중복 소스 거부, 무효 가격 거부. **실제 Node CI·실PC 수집·설치·D1·Production 통과 아님**.
- 2026-11-27 최신 `main`과 이 브랜치는 **71커밋 ahead / 1203커밋 behind**, `diverged`. 옛 브랜치 전체 병합·main 직접 덮어쓰기 금지. 현행 `main`에는 유료 공통 저장기 `marketparquet-paid-store.mjs`가 있고 미국 전체 R2 공개 Reader는 과거 제거 상태. 2026-11-26 UI PR #1695에 별도 복구된 표시 쉘이 있으며 운영 사이트에서 '연결 예정' 확인.
- **다음 필수 기능 단계:** 현재 `main`의 유료 `readPaidDaily/readPaidProjection` 검증 결과에 이 private R2 adapter를 **필요한 파일만 선별 통합** → 연속 실제 거래일로 최신/250회 이력 계산 및 로컬 SHA readback → 별도 유료 R2 key에 정확한 CAS/readback 게시 → GET percent-only/current+history → 기복구 UI 연결 및 PC/모바일 실측. 기존 무료 R1/IEX keys, 한국 지수, S&P500 B1-R5, 테마·섹터, 예약·원자료를 변경하지 않는다. 기능 완료 전 예약 자연 갱신 검증 금지.

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
