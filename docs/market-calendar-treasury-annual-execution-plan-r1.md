# 시장 캘린더 Treasury 최근 365일 — R6.1 최종 실행 계획

> 최종 정본: 2026-11-10 KST. 대상 저장소 `ansqhd5774-Choi/zgmini`, 개발 브랜치 `codex/market-calendar-treasury-cache-private-code-r1-20261109`, [Draft PR #1051](https://github.com/ansqhd5774-Choi/zgmini/pull/1051). 이 계획은 현재 미완료 범위만 갱신하며 산식·API 계약·DB·TTL·예약·배포를 변경하지 않는다.

## 1. 최종 목표·현재 완료 지점·진행률

**최종 목표:** 공식 TreasuryDirect TA_WS에서 최근 365일 낙찰·공고 이력을 PC에 수집 → 비공개 SQLite 원문 저장·재조회 → 저장된 자료로 일정 계산 → 기존 Writer/D1 게시 → 공개 API/UI 표시. 마지막 5점은 별도 PC 원문 입력의 비민감 메타데이터를 실제 A급으로 읽어 원본 완전성 근거를 독립 확인한다. 이 마지막 감사는 이미 완료된 수집·게시·화면 작동을 소급 무효화하지 않는다.

**프로젝트 전체 진행률: 시작 95/100점(95%) → 이 계획 갱신 후 95/100점(95%).** 완료된 5개 운영 단계를 다시 수행하거나 신규 성과로 중복 산입하지 않는다.

| 구분 | 배점 | 완료 | 완료 기준 및 고정 증거 |
|---|---:|---:|---|
| 공식 365일 원문 수집·저장/재조회·계산 코드 | 20 | 20 | 승인 feature source `40111539a3536d99b22c99551d30f1b170246682`, 관련 회귀·CI 45/45 PASS |
| 실제 운영 Writer 설치 | 15 | 15 | [PC #1132](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1132), Run `42690541955`, `WRITER_B_INSTALLED_VERIFIED`, Writer overlay `70d2d1dbd8180255133bdd7fc925ae07bb8d6cc9` |
| PC 정규 수집·로컬 checkpoint | 25 | 25 | [A #1135](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1135), Run `42692713050`, `calendarStatus=READY`, 공급자 요청 24, Treasury 포함 13개 원천, checkpoint `2026-11-09T20:23:10.889Z` |
| 실제 D1 저장·시각 재조회 | 20 | 20 | 사용자 승인 운영 D1 `zgmini-core-r42` 읽기 전용 SELECT 1회: `public_feed_snapshots_v1`의 `output/release-calendar/current`, `stored_at=1794255759536` |
| Production API·캘린더 UI 검증 | 15 | 15 | [API](https://zgmini.kr/api/release-calendar) `READY`, `updatedAt=2026-11-09T20:22:39.536Z`(D1과 0ms 일치), 전체 2,288 · Treasury 894; [UI](https://zgmini.kr/market-calendar/) 2025년 11월 Treasury 53 |
| PC 비공개 TA_WS 입력 메타 독립 A 조회 | 5 | 0 | **운영 설치된 A**로 최신 보관 원본의 건수·기간·지문을 읽고 결과 JSON/TXT를 검증하기 전까지 미완료 |

**관측 범위 대조:** 2025-11-10~2026-11-09 공개 Treasury 876 = 공고 436 + 입찰 440; 이후 예정 18 = 공고 8 + 입찰 10; 총 894, `id+date` 중복 0. 공식 TA_WS 낙찰 436건과 공개 과거 입찰 440건의 차이 4건은 기존 주간 원천 병합의 가능성이며, 직접 원문 감사 없이 확정된 원인이라고 표현하지 않는다. 과거 FiscalData 낙찰 415건은 365일 대체 완료 기준이 아니다. 낙찰 436은 해당 관측일의 기준값이지 모든 미래 실행의 고정 개수 조건이 아니다.

## 2. R6.1 최신 계약과 영향 범위

- 시작·재개 시 제어 저장소 `ansqhd5774-Choi/zgmini-pc-control` 최신 `main`의 `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md`에서 **현재 작업과 관련된 변경**을 확인한다. 별도 중앙 인계는 `docs/AGENT_HANDOFF_CENTRAL_ORCHESTRATOR_V1.md`, 공유 설치는 `docs/CONTROLLER_APPLY_QUEUE.md`를 따른다.
- 승인된 Writer B의 **인증된 실제 수리 가능 실패**만 격리 Windows Runner `zgmini-handoff-ci-isolated` → `agent-handoff` Incident → 단일 중앙 ChatGPT → **원본 Issue 결과 반환**으로 처리한다. `PASS`·`WAIT_RECORDED`·정상 자원 대기·미확정은 자동 수리 대상이 아니다. 인위 실패와 원래 단회 요청 재실행 금지.
- 원본 Issue 회신은 다른 일반챗의 자동 수신·실제 PC 운영 적용이 아니다. 시장 캘린더 원담당이 **실제 대화 재개 시** 해당 원본 Issue 결과를 확인하고 이 계획의 다음 실행을 맡는다. 신규 수신 ACK Gate·인위적 자연 E2E 실증은 만들지 않는다.
- 코드 main 반영·PC 승인 source·실제 설치 SHA·D1 저장 시각·API/UI 관측 시각은 개별 상태다. 격리 Runner CI 성공이나 Controller #917 복구를 새 A 실제 설치로 오인하지 않는다.
- 독립 기능 검증·조회는 계속하고 공유 Controller/동일 운영 파일 쓰기만 [단일 적용 원장 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68)에서 자원별 한 명이 조정한다.

## 3. 남은 필수 단계와 정확한 실행 순서

| 순서 | 담당 | 입력·필수 실행 | 통과 증거 / 진행률 영향 |
|---|---|---|---|
| **1. #996 공유 설치 복구** | 기존 [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996) 지정 단일 프로세스 담당. **시장 캘린더는 중복 복구/설치 요청 금지.** | #917 `RECOVERY_COMPLETED`는 보존. 별도 #996 원본 PC의 `INTAKE_PAUSED`·`RUNNER_SET_DRIFT`·설치 잠금·수동 비활성 Workflow를 원본 owner/ledger/marker로 확인하고, 정규 C급 명시 승인·보호 복구·독립 사후 확인. [#68 최신 조정 기록](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6757156699)과 원본 증거를 사용한다. | 공유 설치 자원의 실제 해제 `PASS` 및 소유자 명확화. **시장 캘린더의 기존 95점 유지**(외부 설치 선행 조건). |
| **2. 승인 누적 Controller 적용** | #68의 **기존 단일 Controller 적용 담당**; 시장 캘린더 담당은 #1191 소스·테스트·예상 출력 인계 | #996 해제 후 실제 설치 Controller `badad9124157879d7a645b64f2768113d632355b`에서 정확한 현재 파일 해시·allowlist 확인. [공통 PR #1191](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1191)(`main` 병합 `2cdd237f90368fc7b8a39fc53b5746df6557c073`, 2파일·14/14 PASS)과 이미 대기 중인 물가 [#1211](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1211)·[#1212](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1212) 등 **실제 승인된** 변경만 파일별 누적 diff·manifest·SHA·백업으로 조정. 정규 B **단회** 적용 후 설치 SHA·A 등록·Runner·보호 재조회. 최신 `main` 500여 커밋을 무조건 통째로 설치하지 않는다. | 설치된 `config/operations.json`에 `source-inventory-runtime-readonly`가 A로 등록되고 해당 실행 파일의 실제 바이트가 승인 source와 일치. `#1191`의 GitHub 병합만으로 PASS 금지. 시장 캘린더 **95점 유지**(최종 A 실행 선행 조건). |
| **3. TA_WS 개인 입력 감사 A 1회** | **시장 캘린더 원담당** | 2단계 실제 설치 완료 확인 후, 기존 `pc-job`의 고유 Issue/requestId로 허용 A `source-inventory-runtime-readonly` 1회. 기존 PC SQLite `market_input_batches_v1`의 최근 `release-calendar:treasury:taws:YYYY-MM-DD` 1건만 요약 반환; 결과 JSON/TXT·Run·seat를 재조회. 신규 shell·수동 SQL·공급처 GET·Writer B·게시·예약 없음. | `core.sqliteOpened=true`, `core.treasuryTawsInput.status=OBSERVED`, `eligibleCountMatchesStored=true`, 저장 날짜/365일 조회 범위 일치, `rawRowCount`·`storedAwardedCount`·`eligibleAwardedRows`·`textBytes`·64자리 `textSha256` 확인. 해당 원본의 수집 시점이 2026-11-09이면 낙찰 436과 대조하되 공개 Treasury 전체 894와 **직접 동일시 금지**. 데이터·source·관측 시각 정합성까지 확인한 뒤 **+5점 → 100점**. |

### 공유 설치를 위한 최소 의존성 사전 점검 — 소스 기준

**실제 PC 승인 manifest 아님.** 설치된 Controller `badad9124157879d7a645b64f2768113d632355b`와 제어 `main`의 라우팅·허용목록을 파일 단위로 비교한 **적용 담당자용 후보 범위**다.

| 파일 | 설치 `badad912…` Git blob | `main` Git blob | 소스 차이 |
|---|---|---|---|
| `config/operations.json` | `d22d18bd9b252cbaa5e6b8e082377a872630b2b3` | `f01c171939cca3745f8198002e8d3f0e877a6fb5` | A 5개 신규 등록, 기존 31개 유지·변경 0 |
| `controller/operations.mjs` | `f6ef5a4dccf9b1b09f50db6edfa61004e6503b44` | `4a2c498f63e2399c66bde6c81b5e4fdf2e23facf` | 신규 import 5줄 + dispatch 6줄, 기존 라인 삭제 0 |
| `controller/source-inventory-runtime-readonly.mjs` | 없음 | `db9e9c8347277287cc6ef10bad310be125314d52` | Treasury 고정 입력 최신 1건 메타 감사(이 기능 담당), 소스 SHA-256 `d319459497f5afb6fc00d31402960d917670b82a13c724dcb9e57266bf6f78a1` |

**중요:** main `controller/operations.mjs`를 통째로 설치할 때는 원담당 A 이외에 새 import된 `inflation-core-lock-observation-readonly.mjs`, `writer-b-1063-recovery-readonly.mjs`, `shared-resource-release-readonly.mjs`, `employment-r6-collection-evidence-readonly.mjs`도 함께 필요하다. 따라서 **후보 파일 7개 = config 1 + 라우터 1 + 신규 모듈 5**다. 새 모듈의 상대 import는 기존 Controller에 있던 `core-runtime-source-readonly.mjs` 1개를 재사용하고 나머지는 Node 내장 모듈이다. 적용 담당자가 현행 설치 SHA/해시 및 다른 변경의 승인을 대조해 **최종 누적 파일 목록·바이트·SHA-256·사전 보호·lease**를 확정한다. 테스트 파일은 운영 설치 파일로 계산하지 않는다. 누락된 import만을 개별 덮어써서 기존 5개 A 기능의 라우팅을 잃지 않는다.

2026-11-10 #996 원본에는 사용자 `PHASE_SCOPED_EVIDENCE_EXCEPTION` C 동의 댓글이 등록됐으나, [복구 Draft #1222](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1222) 최신 R2의 실제 운영 효과는 **0**으로 보고됐다. 동의/소스·ZIP 검증과 #996 실제 해제 PASS는 별도이며, 이 계획은 그 C 작업을 직접 실행하지 않는다.

**현재 차단 범위:** [#68 실측](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6756862819)상 2026-11-10 10:36 KST의 #996 `RECOVERY_REQUIRED` (`FIRST_FAIL=INTAKE_PAUSED`, `installLock.held=true`, `workflowState=disabled_manually`, `blockScope=SHARED_INSTALL_ONLY`). 최신 사후 변경 증거가 생기면 **원본 결과로만 갱신**한다. **공유 Controller 설치만 BLOCKED**이며, 시장 캘린더 기존 수집/게시/방문자 조회 및 독립 개발은 차단되지 않는다. #917 복구 완료는 그대로 인정한다.

## 4. 종료 판정·실패 분기·후속 관측

1. A 조회에서 `NOT_STORED`, `WAL_SIDECARS_ABSENT_UNVERIFIED`, `STATE_UNKNOWN` 또는 메타 불일치가 나오면 **100% 금지**. 기존 유효 공개 결과는 보존하고 최초 실패 코드·원본 Issue·영향 범위만 확인한다. WAL sidecar 부재만으로 DB 손상/데이터 유실을 단정하지 않는다. 같은 A를 무조건 재요청하지 않는다.
2. 감사 출력의 `scope=ELIGIBLE_RESULT_COUNT_NOT_FULL_PARSER_REVALIDATION`는 **원문 전체 파서 독립 재실행을 뜻하지 않는다**. 지문은 그 원문의 동일성 식별 값이며 사전 기준 SHA와 비교하지 않았다면 '외부 SHA 일치'라고 주장하지 않는다. 원문 내용·CUSIP·키·공급자 전체 응답은 반환·게시 금지.
3. 명세·승인·설치·A 실제 결과·D1/API/UI의 **서로 다른 증거**를 대조하고 6단계 100/100점 여부를 최종 보고한다. 월별/분기별 신선도는 공식 발표·신규 자료 기준으로 확인하며 HTTP 200/READY만으로 미래 갱신을 확정하지 않는다.
4. PC 예약 자연 자동 반영 및 신설 격리 장애 인계의 **자연 발생 수리 실패 E2E**는 본 기능 종료 후 `DEFERRED` 후속 관측. 기존 Writer B 단회 실행을 고의 재실행하거나 테스트용 실패를 만들지 않는다.
5. 현재 남은 **다음 하나의 행동**: #996 단일 담당의 실제 해제 결과가 #68/원본 Issue에 들어왔는지 확인한 후, 공용 Controller 단일 적용 담당의 누적 승인 manifest·설치 시점을 조정한다. 현재 담당인 시장 캘린더는 이미 제출한 [#68 조정 기록](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6756069355)을 재사용하고 다른 담당의 공유 PC 작업을 가로채지 않는다.

## 5. 이전 완료 증거·계획 보존

- 2026-11-09 당시 FiscalData `auctions_query` 415 vs 공식 TreasuryDirect TA_WS 낙찰 436(차이 21), 날짜 상한 +30일 보정 후 `competitiveAuctionCloseDate` 실제 365일 재필터링. 연간 원문 압축 PC 전용 `marketOperationalStore.writeInput/readInput` 계약, 주간 XML의 미래 입찰·공고 병합과 부분 실패 시 마지막 유효값 보존은 이미 구현·검증됨.
- 최초 개발 R1의 83%/Writer B 공유 복구 차단/“TA_WS 어댑터 연결”은 **과거 실행 단계**이며 현재 실행 지시가 아니다. 현재 운영 검증 95%와 #996 공유 설치 차단이 우선한다.
- 참고: [FOMC 연간 일정 PR #1039](https://github.com/ansqhd5774-Choi/zgmini/pull/1039), [시장 캘린더 공개 PR #823](https://github.com/ansqhd5774-Choi/zgmini/pull/823), [캘린더 PR #995](https://github.com/ansqhd5774-Choi/zgmini/pull/995), [최종 비공개 감사 공통 PR #1191](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1191). 기존 성공 증거는 재사용하며 재수집·재게시·Controller 임의 설치로 중복 성과를 만들지 않는다.

## 6. 최신 공개 재관측 — 2026-11-10 22:25 KST (읽기 전용)

- 공개 [API](https://zgmini.kr/api/release-calendar) `READY`; `updatedAt=2026-11-10T08:35:05.649Z`. 전체 **2,288**, Treasury **894**(공고 444/입찰 450), `id+date` 중복 **0**. 2025-11-10~2026-11-10 양끝 포함 Treasury **880**(공고 439/입찰 441), 2026-11-10 이후 예정 **14**.
- [2026년 11월 시장 캘린더 데스크톱 UI](https://zgmini.kr/market-calendar/) Treasury **37건** = 같은 달 공개 API **37건**. 2025년 11월 API Treasury **53건**도 과거 관측과 일치.
- 이전 2026-11-09 공개 총 2,288/Treasury 894는 유지, `updatedAt`은 2026-11-09T20:22:39.536Z → 2026-11-10T08:35:05.649Z로 전진. 최근 365일 기간 자체가 하루 이동해 과거 Treasury 876→880으로 바뀌었으므로 **2026-11-09 원본 낙찰 436을 11월 10일 최신 보관 원본의 고정 기대 건수로 사용하지 않는다**.
- **증거 범위 구분:** 이 관측은 공개 API·데스크톱 UI에 한정. 11월 10일 D1 행을 독립 SELECT하지 않았으며, 모바일 전용 화면도 미검증. 전날의 승인 D1 SELECT 1회 일치 증거를 오늘 새 게시분에 그대로 소급 적용하지 않는다. PC 비공개 TA_WS 메타 조회는 미완료 5점. 공급자 호출·PC/DB/배포 쓰기 0건. 프로젝트 **95/100 유지**.
