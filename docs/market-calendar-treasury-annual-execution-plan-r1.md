# 시장 캘린더 Treasury 연간 수집 — 마지막 단계 실행 계획 R1

## 최신 운영 검증 — 2026-11-10 KST (아래 2026-11-09 실행 계획보다 우선)

**실제 작업률: 95% → 95%.** 초기 83%·Writer B 복구 차단은 이 문서의 **과거 계획 기록**이며 현 시점 차단이 아니다. 완료한 개발·설치·수집·공개 단계를 재실행하지 않는다.

| 실제 단계 | 유효 증거 | 상태 |
|---|---|---|
| 공식 연간 365일 TA_WS 소스·저장/재조회·계산 코드 | 4개 실행 파일, 관련 45/45 회귀·CI 성공, 승인 source `40111539a3536d99b22c99551d30f1b170246682` | DONE |
| 운영 Writer 설치 | PC 제어 [#1132](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1132), Run 42690541955, `WRITER_B_INSTALLED_VERIFIED`, 운영 overlay source `70d2d1dbd8180255133bdd7fc925ae07bb8d6cc9` | DONE |
| 운영 수집/checkpoint | PC 허용 A [#1135](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1135), Run 42692713050, `calendarStatus=READY`, `providerRequests=24`, source 13개 중 Treasury 포함, `at=2026-11-09T20:23:10.889Z` | DONE |
| D1 실제 개별 저장 행 | 사용자 승인 후 운영 `zgmini-core-r42`에서 읽기 전용 SELECT **1회**: `output/release-calendar/current`, `stored_at=1794255759536` → `2026-11-09T20:22:39.536Z` | DONE |
| 공개 API/UI | `/api/release-calendar`: `status=READY`, `updatedAt=2026-11-09T20:22:39.536Z`(D1과 0 ms 일치), 전체 **2,288** · Treasury **894**; 실제 `/market-calendar/` 2025년 11월 Treasury **53** | DONE |
| PC private 입력 원본 메타데이터 직접 감사 | 현 승인 A `release-calendar-runtime-readonly`에는 `sqliteOpened=false`, `awardedCount`·본문 SHA 반환 없음 | DEFERRED / 별도 승인 경로 필요 |

**공개 365일 수치 직접 분해:** 2025-11-10~2026-11-09 Treasury **876** = 공고 **436** + 입찰 **440**. 이후 예정 18 = 공고 8 + 입찰 10. 894 전체에서 `id+date` 중복 **0**. 공식 TA_WS 낙찰 436건→과거 공고·입찰 872건과 수치가 합치하며 365일 내 입찰 추가 4건과 이후 예정 18건은 주간 XML 병합분으로 **추정**된다. 출처별 원본 row 감사를 대체한다고 주장하지 않는다.

**원문 저장·재조회 성공 판단의 근거:** 실제 설치된 `release-calendar.mjs`는 `privateStore.writeInput` → `readInput` → 원문 text, `storedAt`, 조회 기간, `awardedCount` 동등성 검증 → 파싱 행수 검증을 완료해야 `historyReady=true`가 되고, 주간 성공과 함께일 때만 `sources.treasury.status=READY`가 된다. 운영 공개 `READY` 및 동시각 수집·게시 증거가 이 경로와 부합한다. 그러나 **원본 건수·해시의 직접 PC 별도 조회 결과는 아직 없다.**

**다음 필수 한 행동:** 공통 Controller 담당자의 설치 작업에 개입하지 않고, 기존 공통 등록 경로로 `release-calendar-runtime-readonly`의 **고정된 TA_WS 입력 1개**에 대한 비민감 감사 메타데이터(`exists/storedAt/fromDate/toDate/awardedCount/parsedRowCount/textSha256`)만 읽도록 범위·승인·실제 설치 여부를 조정한다. 설치 확인 후 A급 **1회** 결과를 기존 `#1135`·D1·공개 894건과 대조해 종료 판단한다. 원문 text·키·DB 임의 SQL·신규 예약·Writer 재설치·Controller 수동 우회는 금지. 이 부가 감사를 별도 후속으로 승인 분리한다면 **기능 수집→게시→UI는 완료**, 감사만 DEFERRED로 기록한다.

**SHA 경계:** 아래 R1 계획의 과거 SHA·차단 문구를 현 운영 설치 상태로 읽지 않는다. 이번 문서 갱신은 개발 브랜치의 설명만 갱신하며 승인된 PC 설치 SHA, D1 및 공개 웹의 런타임을 변경하거나 재배포하지 않는다.

---

기준: 2026-11-09 UTC. 전용 개발 브랜치 `codex/market-calendar-treasury-cache-private-code-r1-20261109`, Draft PR #1051. 이 문서는 실행 순서와 종료 조건을 고정하며 승인 산식·계약·DB·예약을 변경하지 않는다.

## 목표·기준 진행률

- 목표: 매 수집 시점 기준 과거 **365일** Treasury 입찰·공고를 공식 자료에서 **PC 수집 → 원문 SQLite 저장 → 동일 원문 재조회 → 일정 정규화 → 기존 Writer/D1 → 기존 공개 API/UI**에 실제 표시한다.
- 운영 완료 기준: 기존 6단계 중 5단계 완료, **83%**. 소스·테스트가 완료되어도 PC 설치, 게시 원격 재조회 없이는 이를 올리지 않는다.
- 마지막 유효 완료: 주간 Treasury 공식 XML 수집·저장·표시 경로와 기존 공개 캘린더/Writer 구조는 유지. FiscalData-only 후보는 코드·회귀·CI까지 통과했으나 **1년 완전성 미달**로 Draft 유지.
- 실측 기준(2025-11-10~2026-11-09): FiscalData `auctions_query` 확정 입찰 **415건**, TreasuryDirect `TA_WS/securities/search`는 발행일 조회 상한을 +30일 보정하고 실제 입찰일 재필터링하여 **낙찰 확정 436건**. 예정 입찰 4건 제외, 두 소스 간 **21건 차이**. TA_WS 기준 입찰 436 + 공고 436 = **872개 역사 이벤트**. 이 수치는 **해당 관측 시점의 증거**이지 미래 수집의 고정 개수 조건이 아니다.

## 다음 실행: 필수 3단계

### 1. 공식 연간 원자료를 기존 Treasury Writer에 연결 — READY

- **담당:** 시장 캘린더 원담당. **입력:** `lib/treasury-auction-history-taws.mjs`의 공식 TA_WS 어댑터와 기존 `scripts/pc-writer/release-calendar.mjs`·`worker/market-operational-store.mjs`.
- 기존 주간 XML은 미래 일정의 공식 수집기로 유지한다. 연간 이력은 `TA_WS/securities/search`를 우선 **1회 GET**하여 낙찰 확정 행만 기존 Treasury 5필드 이벤트 계약으로 변환한다. `issueDate` 조회의 상한을 +30일 보정하되 **`competitiveAuctionCloseDate`로 실제 365일만 재필터링**한다.
- 원문 약 3MB는 기존 `publicFeedStore` 단건 입력 한도보다 크므로, **기존 `marketOperationalStore.writeInput`의 압축된 PC 전용 로컬 원자료**로 보관하고 `readInput`의 동일 원문·시각·조회 범위를 확인한 후에만 계산한다. D1·GitHub에 공급처 원문을 업로드하지 않는다. 신규 테이블·키·예약·외부비용을 만들지 않는다.
- TA_WS 실패 시 현재 유효한 주간·이전 날짜를 보존하고 FiscalData를 보조 수집할 수 있으나 **415건 보조 자료를 연간 완전 `READY`로 표시하지 않는다**. 기존 `PARTIAL`과 PC 전용 짧은 실패 코드로 실제 원인을 구분한다. 요청마다 공급처를 재호출하는 계산 경로 금지.
- **통과:** 2026-11-09 관측 스냅샷의 낙찰 436건→역사 이벤트 872건 및 주간 이벤트 병합, 예정/기간 외/중복 제외, 로컬 원문 저장·완전 재조회 일치, 실패 시 과거 값 보존. 정상 수집은 TA_WS 1 GET(별도 주간 GET 제외).

### 2. 영향 범위 회귀·GitHub 정본 확정 — READY

- **담당:** 시장 캘린더 원담당. **입력:** 1단계의 4개 실행 파일(기존 Writer 1개·Treasury 라이브러리 3개)과 관련 테스트. 현재 Draft PR #1051을 갱신한다.
- 성공·공급처 실패·부분 fallback·3MB 압축 저장·정확 재조회·캐시 첫 연간 수집·과거 유효 이벤트 보존을 모의 시험한다. 기존 주간 CUSIP/FiscalData 회귀와 관련 빌드·타입 검사를 수행한다.
- 최신 `main` 대비 실제 차이·신규 import 종속성·공유 Writer 충돌 파일만 확인한다. 다른 담당자의 변경을 보존하고 승인 없이 reset/rebase/stash/강제 push하지 않는다. 공개 점수·산식·중요도·D1 스키마·TTL·UI 배치·예약 변경 0건을 확인한다.
- **통과:** 영향 범위 테스트 전부 PASS, 해당 PR CI PASS, diff에 무관한 기능 수정 없음. Draft를 풀거나 main 반영/운영 설치를 완료했다는 판단은 별개다.

### 3. 정규 운영 설치 → 공개 데이터 실제 확인 — 현재 BLOCKED (Writer B 공유 복구)

- **담당:** 설치·수집·게시·검증은 시장 캘린더 원담당, **공유 Writer B 복구는 기존 중앙 담당 #1068**. 새 복구 담당/중복 설치 요청을 만들지 않는다.
- **입력:** 2단계에서 확정한 정확한 source SHA와 **4개 import 포함 적용 파일의 종속성 폐쇄 목록**, 승인 manifest·파일별 SHA256·실제 PC preimage·백업·단일 Writer lease. 이전 Treasury 설치 #1064를 반복 실행하지 않는다.
- #1068 공유 복구가 실제 결과로 해제되면 최신 운영 SHA/preimage를 대조하고 정규 B 설치를 **한 번** 진행한다. 설치한 PC에서 실제 연간 원문·checkpoint·정규화 결과를 재조회한다.
- 기존 Writer 경로로 D1 게시 후 **저장 값·sourceVersion·관측일·게시일**을 확인하고 기존 `/api/release-calendar` 및 시장 캘린더의 PC/모바일 화면에서 같은 이벤트를 재조회한다. HTTP 200 또는 외피 `READY`만으로 끝내지 않는다.
- **통과:** 설치 성공 결과/보호 백업, 로컬 연간 입력·결과, D1, 공개 API, UI의 동일 이벤트·날짜·상태 증거. 이때 운영 전체 **100%** 판정 가능.

## 제외할 작업·검증 구분

- 별도 Controller, 신규 CMD/스케줄러/DB/API/화면 개편, 기존 승인 산식/계약/TTL 변경, 공유 Writer B 반복 설치·잠금 우회는 **불필요·미승인**.
- 예약 자연 자동 갱신 검증은 **기능 완료 후** 독립 후속 작업; 이번 3단계 완료 조건에 넣지 않는다.
- 실패·지연 보고는 **최초 실패 코드 / 마지막 PASS / 실제 영향 / 담당 / 다음 한 행동**으로 제한. 코드 PR 성공은 PC 설치나 사이트 게시 성공이 아니다.

## 실제 성공 사례 재사용

- [FOMC 연간 일정 PR #1039](https://github.com/ansqhd5774-Choi/zgmini/pull/1039): 공식 원문 저장·재조회·일정화·이전 값 보존.
- [기존 Earnings API 수집기](https://github.com/ansqhd5774-Choi/zgmini/blob/main/lib/earnings-api-calendar.mjs): 수집 원문과 공개 projection 분리.
- [Consumption R5](https://github.com/ansqhd5774-Choi/zgmini/blob/main/scripts/pc-writer/consumption-r5.mjs): PC 운영 원문 저장→재조회→해시 확인.
- [시장 캘린더 공개 PR #823](https://github.com/ansqhd5774-Choi/zgmini/pull/823): 기존 `/api/release-calendar`·UI 재사용, 신규 예약/DB 불필요.
- [캘린더 PR #995](https://github.com/ansqhd5774-Choi/zgmini/pull/995): PC Writer→D1→API→UI의 별도 실증이 완료 판단 근거.

**재개 즉시 수행할 단 하나의 행동:** TA_WS 어댑터를 기존 Treasury Writer의 PC 압축 원문 저장·재조회 경로에 연결하고 정규화·부분 실패 시험을 통과시킨다.
