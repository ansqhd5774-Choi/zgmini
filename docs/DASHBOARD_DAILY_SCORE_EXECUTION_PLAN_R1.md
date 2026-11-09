# ZGMINI 대시보드 최신 지표 반영·일별 점수 이력 구축 실행계획 R1

- 작성: 2026-11-10 KST
- 저장소/브랜치: ansqhd5774-Choi/zgmini / codex/ui-improvements
- 상위 확정 기준: docs/DASHBOARD_SCORE_DAILY_UPDATE_STANDARD_R1.md
- 본 문서는 단계·검증·우선순위를 정하는 계획서다. GitHub 반영은 운영 구현·설치·게시 완료 증거가 아니다.

## 1. 최종 목표·대상

**혼합 발표주기(일·T+1·주·월·분기)의 새 유효 지표가 PC 원자료에 저장되면 기존 승인 경로의 다음 실행 기회에서 영향받는 점수를 재계산해 최신 카드에 반영하고, 동시에 날짜별 실제 계산 기록 및 최종 일별 스냅샷을 안전하게 보존한다.** 신규 입력이 없을 때는 산식상 허용된 마지막 유효값만 이월하고, 이월을 새 공식 관측/확정으로 표시하지 않는다.

- 전수 분모: 대시보드 27개 영역 + 섹터 11개 + 테마 카탈로그 30개 = **논리 대상 68개**. 대시보드 27의 잠정 분류는 미국/한국 공포탐욕 2, 미국/한국 등락 2, 종합 1, 위험 8, 경제 12, 금리심리 1, 이란 참고 1이다. 1단계에서 실제 메뉴·지표 ID 중복과 누락을 증명하여 확정한다.
- 최신 현재 점수, 당일 잠정값, 날짜별 실제 계산값, 일별 최종 스냅샷, 월/분기 공식 확정, 소급 재구성 점은 **서로 다른 개념**이다. 기존 READY/완성월/완성분기 등 산식 Gate는 변경하지 않는다.
- 테마 30개 중 현재 미게시 항목은 점수 갱신 표준만으로 운영 완료가 되지 않는다. **기능별 수집·권리·계산 완료 의존성을 별도 관리**하되 테마 전체 완성을 다른 영역 게시의 전역 선행조건으로 삼지 않는다.
- 60초 UI API 재조회는 데이터 발표·수집·계산·게시의 주기가 아니다. 시각별 실제 처리 지연은 운영 결과로 측정한다.

## 2. 우선 배포·적용 단위

- **군 A: 기존 공개 대시보드 27영역 우선.** 종합(12/12 READY), 고용(T+1·월간 혼합), 스태그플레이션(공통 월별 확정/별도 잠정), 자산버블(완성 분기)을 대표 계약으로 검증한 뒤 나머지 대상 확대.
- **군 B: 섹터 11개.** 동일 거래일 수정값의 SAME_DATE_SCORE_DRIFT 거부 사례를 데이터 정정·revision 계약 내에서 해결하고 기존 최종 거래일을 보존.
- **군 C: 테마 카탈로그 30개.** 실제 원자료·운영 등록·공개 권리가 확보된 항목부터 적용. 미게시/미수집은 BLOCKED 또는 DEFERRED로 별도 보고; 없는 점수를 임의 생성하지 않음.
- 독립 읽기·코드·화면 검증은 병렬 수행 가능. 동일 Writer/SQLite/D1 key 쓰기는 단일 소유·승인 lease를 지켜 직렬화한다.

## 3. 단계별 작업 분해 및 진행률 배점

| 단계 | 배점 | 세부 작업 | 완료·증거 조건 |
|---|---:|---|---|
| **1. 전수 계약·운영 기준선** | **15%** | 68개 ID별 화면 위치, 계산기, 구성 원지표 수와 발표주기, 유효성·공식 확정 Gate, 허용 이월, 현재/잠정/확정/재구성, 원자료·계산 local key, D1 key, API route/차트, 개발·PC 승인·배포 SHA 대조. | 대상별 계약표 **68행**(해당하지 않는 항목도 사유 포함), 실제 게시/미게시 수, PASS/PARTIAL/UNKNOWN/BLOCKED 분류, 기존 산식 변경 0건. |
| **2. 현재 실제 갱신 시점 측정** | **15%** | 기존 실행 ID와 source checkpoint로 observation/release/collect/store/calculate/publish/D1-readback/UI 시각을 연결. 일·월·분기 각각 대표 지표 추적. 소스상 기능과 실제 PC 운영 설치 구분. | 실제 latency 구간·FIRST FAIL·검증 불가 항목·Runtime SHA를 적은 기준선. 실행 증거가 없으면 UNKNOWN; 60초 화면 조회를 수집 실적으로 취급 금지. |
| **3. 날짜·상태·불변 이력 계약** | **15%** | US/KR 거래일·KST UI 표시일·휴장·DST·cut-off 및 당일 다회 계산을 정의. 최종 일별 snapshot을 실제 계산 사건과 구분. carry-forward, reconstructed, 공식 정정 revision/supersedes, 0/null/missing/stale 설계. | 시장별 날짜/마감·정정 정책 확정, 동일날짜 변경과 과거 원본 보존 테스트, 필수 메타데이터 계약. DB/TTL/API 변경 필요 시 범위를 정해 **별도 승인** 취득 전 운영 쓰기 금지. |
| **4. 기존 PC 재계산·게시 연결** | **25%** | local-cycle / progressive-publication / Writer 재사용. 신규 유효 checkpoint/sourceVersion 변경 시 영향 산식 계산→로컬 결과/실제 이력 보존→승인 D1 key 단위 게시/readback. 중복·역행·부분 실패 격리와 last valid 유지. | 월간 새 관측, 완성 분기 새 관측, T+1 변경이 승인 Gate대로 반영됨을 테스트. input signature→계산값→D1 버전/시각 일치, 신규 예약/Cron/별도 CMD 0건. |
| **5. 카드·차트 UI 정합** | **10%** | 최신/잠정·일별 최종·이월·소급 재구성 표시 분리. 카드와 마지막 점의 기준일·상태, 기간별 차트, 단위/결측, PC/모바일 회귀 검사. | 실제 API payload와 화면 값·날짜·마지막 점 일치; 기존 60초 조회·24h 화살표 의미 유지, 무관한 디자인 변경 0건. |
| **6. 혼합주기·실패 시뮬레이션** | **10%** | 월간 5·분기 2·T+1 3의 10입력 모델로 새 월간 발표, 미완성 분기, 하루 다회 변경, 무변경 이월, 공식 정정, 수집 중복/실패, KST/US 경계·DST, D1/Writer 실패를 테스트. | EXPECTED/ACTUAL/PASS 표; 기존 12/12 READY·완성월·완성분기 조건 유지, 과거 점 무음 덮어쓰기 0건. |
| **7. PC→D1→공개 종단 검증·인계** | **10%** | 승인된 기존 PC 운영 경로에서 실제 유효 신규 입력 1건 이상을 동일 checkpoint로 끝까지 추적. 군 A→B→C 개별 기록, PC 설치 SHA·로컬 결과·D1 readback·API/UI 값 대조. | 기능별 **실운영 PASS 증거**와 미완료 분모·담당·원인·최소 다음 행동. CI/문서/HTTP 200만으로 완료 판정 금지. |
| **총합** | **100%** | | |

### 단계 실행 관계

1 → 2로 운영 기준선을 고정하고 3의 날짜·이력 계약을 확정한다. 1·2의 읽기/측정 작업은 3의 미결 설계 승인을 기다리지 않고 진행한다. 4의 데이터 쓰기 또는 DB 계약 변경은 해당 승인 이후에만 실행한다. 5·6은 독립 기능 단위로 병행할 수 있다. 7은 해당 기능에서 1~6의 실제 검사 증거가 모인 경우에만 통과한다. **미완성 테마를 이유로 현재 게시 가능한 군 A/B를 대기시키지 않는다.**

## 4. 검증용 사건 시나리오

| 사례 | 최신 점수 처리 | 일별 이력·확정 처리 |
|---|---|---|
| 1일: 월/분기 신규 발표 없고 T+1 자료만 저장 | 승인 산식상 가능한 경우 기존 유효 월/분기 입력 + 신규 T+1 입력으로 재계산. READY 불충족 시 새 확정점수 금지. | 실제 계산 사건·원관측일·이월 표시. 월간·분기 새 관측이라고 표시하지 않음. |
| 2일: 월간 지표 1건이 새로 저장 | 기존 승인 실행 경로에서 영향받는 점수를 가능한 빠르게 재계산·게시. 공통 완료 관측월 Gate 우선. | 같은 날 계산기록 추가, 그날 최종 스냅샷은 별도 사건으로 관리. |
| 10일: 분기 자료 일부만 발표 | 미완성 분기의 확정점수 생성 금지. 기존 완료 분기 유지 또는 승인된 별도 잠정 표시. | 분기 공식 확정일과 카드의 일별 기록일 혼동 금지. |
| 같은 날 유효 자료가 여러 번 변경 | 변경별 현재점수 갱신 가능; 같은 signature/중복이면 무변경. | 다회 계산기록·최종 일별 스냅샷 구분. |
| 이후 과거 원지표 공식 정정 | 승인된 정정 계산 결과로 최신값 변경 가능. | 기존 당시 실제 점수 보존, revision과 정정본 연결. |
| 공급자·Writer·D1 오류, 새 관측 없음 | last valid 유지·정확한 stale/partial/blocked 표시. | 실패를 완료나 새 공식 관측으로 위장 금지. |

**실시간 반영의 정확한 의미:** 신규 유효 입력의 로컬 저장 뒤 **이미 승인된 실행 경로의 다음 가능 단계에서** 계산·게시한다. 기존 실제 실행 간격과 운영 지연을 확인하기 전 수집 후 60초 이내 등 고정 SLA를 약속하지 않는다. 화면 GET은 계산/원천 수집을 수행하지 않는다. 일별 이력은 기존 실행에서 실제로 발생한 결과를 기반으로 한다.

## 5. 기존 자산과 현재 발견한 위험

- docs/PC_WRITER_R2.md: PC 원자료 SQLite→저장 데이터 계산→로컬 결과→D1 readback→공개 API/UI 계약.
- scripts/pc-writer/local-cycle.mjs 및 progressive-publication.mjs: 기존 수집 후 게시, checkpoint 변화 시 추가 게시 경로 **일부 존재**. 모든 68개 대상에 실제 적용·반영 지연이 증명된 것은 아님.
- lib/composite-observed-history-r1.mjs 및 scripts/pc-writer/composite-observed-archive-r1.mjs: 실제 계산 기록을 활용 가능하나 UTC 일자 key·동일일 갱신이 **KST 최종 일별 불변 기록과 같지 않음**.
- scripts/pc-writer/publish.mjs: UTC 날짜/current 키 UPSERT. 과거 확정 불변 이력과 별도 설계 필요.
- scripts/pc-writer/sector-fear-greed-r3-local-cycle.mjs: SAME_DATE_SCORE_DRIFT. 검증 assertion을 제거하지 않고 정정 정책과 함께 해결.
- docs/STAGFLATION_S21.md 및 STAGFLATION_LATEST_PUBLISHED_R1.md: 공통 월 확정 점수와 서로 다른 월 최신 잠정카드 구별, 잠정값 종합에 자동 합산 금지.
- docs/ASSET_R10_RELEASE_CONTRACT.md: 최신 **완료 분기**만 확정 점수; 미완성 보간 금지.
- docs/CNN_VERIFIED_CHECKS_R9.md: 공식 CNN 관측시각과 PC 재확인 시각 구별.
- docs/LIVE_SCORE_MOTION.md와 docs/SCORE_ARROW_24H.md: 각각 UI 60초 조회/화살표 24시간 표시이며 새 자료 발생이나 점수 확정 증거가 아님.
- PC 운영 절차 최신 정본: ansqhd5774-Choi/zgmini-pc-control main의 AGENTS.md, docs/GENERAL_CHAT_START.md, docs/PC_AUTOMATION_STANDARD.md. 개발 HEAD와 PC 승인 설치 SHA, 웹 배포 SHA는 별도 확인.

## 6. 권한·진척·실행 책임

- **변경 금지:** 승인 없는 산식·가중치·READY Gate·공급자 권한·TTL·원자료·DB 계약·운영 설정·웹 배포/rollback 변경. 신규 자동 수집 예약, 중복 PC Task/Cloudflare Cron, 방문자 GET의 계산 및 임의 원격 shell 실행 금지.
- **기능 원담당:** 지표별 입력·계산·로컬 원장·게시/검증. **공통 Writer/Controller 총괄:** 공유 충돌 등 해당 공통 장애만 해결. **대시보드 UI 담당:** 카드·차트와 공개 API 계약 검증. 공유 쓰기만 단일 담당/lease 적용.
- **진행률 계산:** 위 7단계 배점 합 100%를 기준으로 단계별 산출물의 실제 PASS 증거를 쌓고, 각 단계 내에서도 27/11/30 대상별 검증 분자·분모를 별도 보고. PARTIAL/DEFERRED/UNKNOWN을 PASS로 환산 금지. 문서/개발/PC/D1/API/UI 증거는 분리.
- **계획 작성 시점의 상태:** 기존 시스템에 부분 구현·일부 공개 기능이 있으므로 **전체 개선 프로젝트 실구현 진행률은 현재 산정 보류**. 1단계 전수 매핑으로 수치 기준선을 고정한다. 이 계획서의 브랜치 반영은 별도로 완료 판정한다.
- **운영 차단 판단:** 권한·관련 lease 충돌·정확한 실패만 BLOCKER. 공통 총괄의 무관한 검증이나 테마 전체 미완료는 준비된 독립 작업을 차단하지 않는다.

## 7. 미결 결정과 다음 필수 작업

- **승인 필요:** 미국/한국 거래일 및 KST UI 날짜의 일별 확정 cut-off·휴장일 처리, 마감 이후 공식 정정 revision 계약, 기존 저장/D1 필드로 부족할 경우 **정확한 최소 변경 범위**. 미결 승인이 필요한 실제 쓰기만 보류하고 읽기·매핑·계측은 진행한다.
- **바로 다음 작업 1건:** 총 68개 콘텐츠의 **ID·산식 필수 입력의 개수와 발표주기·마지막 유효 원관측일·READY 조건·현재/일별/확정 상태·로컬 Writer key·D1 key·API/차트 경로·운영 승인 SHA**를 원문 증거와 연결하는 전수 매핑표 완성.
- **매회 보고:** 실제 분모/분자·전체 가중 진행률 → 새 PASS 증거 → LAST PASS/FIRST FAIL → 정확한 문제/담당 → 다음 단일 필수 행동. 예약 검증은 기능 완료의 임의 선행조건이 아니다.


## 8. 실행 실적 기록 — 2026-11-10 KST (제1차)

| 단계 | 계획 배점 | 이번 확인 | 완료 판정 |
|---|---:|---|---|
| 1. 전수 계약·운영 기준선 | 15% | 별도 전수 인벤토리 68행(D27/S11/T30) 원격 대조 PASS. 소스·공개 웹 계약 일부 매핑, 기존 PC 승인 원장 2건 readback 재사용. | **진행 중**. 활성 PC 개별 sourceVersion·원천 수·실제 시각 68/68 불충분. 배점 15%를 완료 처리하지 않음. |
| 2–7 | 85% | 이번 작업에서 신규 운영 쓰기/일별 확정 구현/시뮬레이션·게시 배포 없음. | 신규 PASS 없음 |

- 상세 산출물: docs/DASHBOARD_SCORE_68_CONTENT_CONTRACT_INVENTORY_R1.md (동일 브랜치, 조사 ID 68/68).
- 공개 관측 약 2026-11-10 05:41 KST: 홈 25개 논리 항목 중 숫자/비율 24, 한국 등락 미연결 1; 섹터 11/11 노출 기준 거래일 2026-11-06; 테마 0/30, API STORED_DATA_STALE.
- 핵심 차이: 기본 diagnostics8의 3번째 liquidityCrisisDefense vs 메인 UI 3번째 별도 stagflationSafety. 메인 raw 종합 47.3158과 화면 40.6은 의도된 3.5배 display 민감도 변환.
- 2026-11-10 05:03 KST A급 기존 #1127의 PC 승인 source SHA 4273137a85adcc90c863a27f703baa749b05cb64 확인, 실제 task engine runtime SHA는 CORE_NO_ACTIVE_TASK_ENGINE/STATE_UNKNOWN. 2026-11-09 00:07 KST 기존 #943의 **시장캘린더 ER1 key 한 건**의 로컬↔D1 해시 검증 PASS, 68개 전체 게시 증거가 아님.
- **숫자 관리:** 68/68은 ID 식별의 100%이지 1단계 전체 15% 또는 사업 구현 100%를 의미하지 않음. 전체 프로젝트 가중 진행률은 여전히 **산정 보류**(runtime·저장·게시 증거별 세분 검증 필요).
- **다음 필수 실행:** 이미 존재하는 기능별 Writer/PC 결과 원장과 공개 API 관측시각을 같은 sourceVersion/checkpoint로 대조해 영역별 마지막 유효 관측일·저장/계산/게시일 및 실제 지연을 기록한다. #1127의 STATE_UNKNOWN은 새로운 무조건 재요청 사유가 아님. 신규 자동 수집 예약/Cron 0개, 산식/DB/TTL/승인 source 변경 0건.


## 9. 실행 실적 기록 — 2026-11-10 KST (제2차)

- 실제 공개 웹 GET **11/11개 경로** 점검 + 홈페이지 읽기 전용 관측. 기존 PC pc-job **7건** 재조회·서로 다른 증거 수준 판정. 새 PC Issue·자동수집·예약·D1/SQLite 쓰기·배포 **0건**.
- 이번 상세 기준선: [docs/DASHBOARD_SCORE_RUNTIME_BASELINE_R1.md](DASHBOARD_SCORE_RUNTIME_BASELINE_R1.md). 원격 GitHub readback 문서 일치 확인. 이 문서는 배포 성공 증거가 아닌 일회성 관측이다.
- **단계 1(15% 배점): 진행 중.** 논리 식별/분류 **68/68**; 공급자 원관측→PC 저장→계산→D1 실읽기→UI로 이어지는 완전한 동일 checkpoint 증명 **0/68**. ID 식별만으로 단계 완료 처리하지 않는다.
- **단계 2(15% 배점): 진행 중.** 공개 GET 실측 **11/11**, 기존 PC 증거 **7건**의 효력·시점 분류. 동일 checkpoint를 연결한 입력별 지연의 완전한 실측 **0/68**. HTTP 200·최근 저장 시각만으로 신규 입력 반영 PASS 처리 금지.
- **단계 3–7(70% 배점):** 날짜/확정/정정 계약 미완료, 운영 구현·D1 게시·UI 이력·종단 시뮬레이션 신규 PASS **0건**. 전체 가중 실구현 진행률 **산정 보류**(기존 운영 기능의 실제 완료 증거를 무시하지 않되 근거 없는 숫자 배제).

### LAST PASS / FIRST FAIL / NON_BLOCKING 분리

1. **LAST PASS:** 기존 #1128에서 2026-11-10 05:07 KST Core local-cycle COMPLETE, 기존 #1136에서 05:32 KST checkout/config/checkpoint source SHA `70d2d1dbd8180255133bdd7fc925ae07bb8d6cc9` 동일; 공개 종합 API 12/12 도메인 READY. 이것이 해당 68개 원자료 전부의 신규 갱신 증명은 아니다.
2. **현재 데이터 미갱신:** 미국 등락 R2 공개 API `FULL_MARKET_STALE_OBSERVATION`, 테마 공개 `STORED_DATA_STALE`·**0/30**. 정상 운영 중인 무관한 지표까지 차단하지 않는다.
3. **원본 관측과 저장시각 차이:** 자산버블 새 저장 11/10 04:47 KST이나 확정 점수 관측분기 **2026-Q2**; 금리심리 새 저장 11/10 04:58 KST이나 원관측일 11/05; 섹터 11개 점수 기준 11/06. 각 저장시각만으로 새 공식 발표를 주장할 수 없다.
4. **확인한 공통 인과 결함(개발 source 단계):** `worker/projection-checkpoint-r52.mjs`의 `readCoreCheckpoint`가 `market_public_snapshots_v1.current.stored_at`으로 `core:<timestamp>` 버전을 구성한다. `scripts/pc-writer/run-local.mjs`가 새 원자료 없이 current를 재저장할 수 있어, **공개 스냅샷 저장 변화 ≠ 공급자 원자료 변화**. 실제 운영 source 동일 여부와 입력별 반복 결과는 별도 조회 전 **UNKNOWN**. 승인 산식·DB·READY·운영 source는 변경하지 않는다.
5. **분리된 공통 문제:** #917 Controller 복구/설치 lane의 `RECOVERY_REQUIRED`는 해당 lane의 확인 사항. 기존 #1128 PASS가 보여주는 독립 Core 정상실행을 전체 중단으로 잘못 분류하지 않는다. Writer asset #1067 `PREVIOUS_RELEASE_PRESERVED`는 신규 D1 공개 증거가 아니다.

### 이어서 수행할 단일 필수 작업

**새 입력이 없는데 재게시만 된 경우를 실제로 걸러낼 원본 checkpoint 위치·생성/갱신 경로를 main 코드와 기존 읽기 전용 원장에서 식별**한다. 이후 기존 Writer의 `sourceVersion`을 실제 입력 변경과 대조하는 최소 수정안을 만들고, DB/API 계약 변경이 필요하면 정확한 영향 범위를 사용자 승인에 올린다. 현재 점수 산식·발표주기·확정 Gate·이력·배포·자동 예약은 건드리지 않는다.


## 10. 실행 실적 기록 — 2026-11-10 KST (제3차, 입력 인과 설계)

- 최신 `main` 원문과 기존 `codex/ui-improvements`의 실제 blob SHA를 7개 관련 파일에서 개별 대조했다. 핵심 `run-local.mjs`, `progressive-publication.mjs` **2개는 서로 다름**; 기능 전용 UI 브랜치의 과거 Writer를 최신 운영 공통 코드 위에 덮어쓰면 위험하므로 코드 수정 0건으로 보존했다.
- 기존 `PROJECTION_INPUT_BATCHES`, 인플레이션 PIT/PC1, E1, 한국 공포탐욕 별도 history 원천을 추적해 **공개 저장시계 vs 입력 관측시계** 구별 설계 작성. 이미 확정된 섹터 provisional→confirmed 우선권 보호 사례(`docs/SECTOR_PROVISIONAL.md`, `tests/sector-provisional.test.mjs`)를 재사용 검토했다.
- 설계 산출물: [docs/DASHBOARD_SCORE_INPUT_LINEAGE_DESIGN_R1.md](DASHBOARD_SCORE_INPUT_LINEAGE_DESIGN_R1.md). 새 원자료 없음/동일일 새 입력/공식 정정/TTL/미완성 분기/다회 계산/날짜 경계/공개 실패의 최소 8개 테스트 계약 및 승인 Gate 정리. **설계 문서만** 원격 readback 검증; 기존 산식/DB/Writer/예약/Production 모두 불변.
- **진척:** 1단계 68/68 식별(운영 완전 인과증거 미완), 2단계 대표 API 11/11 관측·PC 7건 대조(인과 0/68), 3단계 **설계 초안 1/1·실제 승인/코드/운영 PASS 0/1**, 4–7단계 미완. 완료 확정 0/7 유지. 계획 가중 실구현율은 검증 근거 부족으로 산정 보류.
- **다음 1건:** 기능별 PC 승인/실행 source와 이 `main` 입력 경로가 실제 일치하는지 기존 승인 읽기 전용 증거에서 확인하고, **백엔드 변경 대상 브랜치** 및 새 DB/메타데이터·일별 cut-off 필요 여부를 특정한다. 이 증거 없이 UI 전용 브랜치에서 Writer/DB 계약을 변경하지 않는다. 예약 추가 0건.


## 11. 실행 실적 — 2026-11-10 KST (제4차, PC source 추적)

- 기존 #1136 고유 Windows A급 결과 원문 재조회 PASS. 05:32 KST 고정 checkout/config/checkpoint source `70d2d1dbd8180255133bdd7fc925ae07bb8d6cc9` 일치, **실제 Core 프로세스 source 확인 아님**(`runtimeSourceVerified=false`).
- 해당 로컬 HEAD를 `zgmini`와 `zgmini-pc-control` GitHub 커밋/ref로 읽기 전용 대조했으나 **두 저장소 모두 원격 commit 조회 불가(422/404)**. `SOURCE_REF_UNRESOLVED`를 **운영 source 인과확인 미완료**로 분리; PC 파일 손상/전역 장애로 오판하지 않음. 자세한 증거는 `docs/DASHBOARD_SCORE_INPUT_LINEAGE_DESIGN_R1.md` 6절.
- **완료 증거:** 68/68 ID, 11/11 대표 공개 GET, 7건 기존 PC 원장, 입력 감지 설계 초안 및 main/UI branch 공유 Writer 소스 SHA 차이 식별. **미완료:** 실제 PC source↔원격 코드 대조, 68개 종단 인과 PASS 0/68, 실제 코드·DB·D1·UI 적용 0건. 전체 7단계 완료 PASS 0/7 그대로.
- **다음 필수 행동 1건:** 기존 허용된 읽기 전용 수단으로 실제 PC `sourceRoot`의 이번 변경 관련 Writer/projection 파일 해시와 원격 추적 가능 소스 버전을 대조한다. 현재 허용목록으로 불가능하면 그 기능만 `AUTOMATION_BLOCKED`로 명시하고, 무관 기능 조사·실제 원담당 업무는 계속한다. 정확한 백엔드 대상 기존 브랜치·소비자 계약을 결정하기 전 운영 변경은 하지 않는다.
