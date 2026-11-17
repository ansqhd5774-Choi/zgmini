# ZGMINI W05 실적 침체 — R1~R6 전체 82단계 진행 기록

- 기준일: **2026-11-16 KST**
- 저장소: `ansqhd5774-Choi/zgmini`
- 작업 브랜치: `codex/api-site-integration-r1-20261026`
- [82단계 작업계획서](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md)
- 기존 [14단계 종단계획](EARNINGS_RECESSION_14_STAGE_HISTORY_PUBLIC_CODE_REMEDIATION_R1_20261116.md)
- 과거 [실제 성공·실패·연동 노하우](EARNINGS_API_SITE_WORKING_KNOWHOW_R1_20261027.md)

## W05 진행 기록 계약 — 단일 인계 정본 (2026-11-16 확정)

**이 파일은 W05의 유일한 현행 진행·인계 기록 정본이다.** 별도 계획서, 실험 보고서, PR, 제어 저장소 중앙 #68 댓글은 관련 원본 증거이지만 이 파일의 최신 작업 상태를 대신하지 않는다. 어떤 대화·예약·다음 작업자가 시작하더라도 지정 전담 브랜치의 **최신 HEAD에 있는 이 파일**에서 마지막 완료 지점과 다음 실행을 이어받는다.

### A. 작업 시작 시 단 한 번 수행

1. 저장소 `ansqhd5774-Choi/zgmini`, 전담 브랜치 `codex/api-site-integration-r1-20261026` 최신 원격 HEAD, 이 진행 파일 및 [82단계 계획](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md)의 **해당 작업 ID**를 확인한다. 다른 병렬 소스 브랜치/PR은 효과·SHA를 구분한다. 본 대화에서 이미 확인한 상태는 source drift·모순 발생 때만 재확인한다.
2. 아래 **인계 스냅샷 → 82개 단계별 상태표 → 최신 작업 원장** 순으로 읽고 마지막 유효 PASS의 증거를 재사용한다. 이전 작업자의 실제 종료 후속 실행 **하나**를 정해, 승인된 업무부터 바로 수행한다. 지난 대화 전체 복원, 예전 작업 중복 진단, 모든 82항목의 추가 조사를 현재 작업의 선행조건으로 만들지 않는다.
3. 권한·설치·운영 효과는 [제어 저장소 최신 공통 정본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/AGENTS.md)과 관련 승인 manifest·실제 등록·Runtime이 우선한다. 이 기록은 **새로운 B 게시 승인/설치 명령이나 D1 쓰기 승인 자체가 아니다**.

### B. 진행 중과 사용자 보고 전 필수 처리

1. **의미 있는 작업 단위가 끝날 때마다**, 조사·설계·시뮬레이션·소스 수정·PR·CI·PC 수집/계산·D1 게시·API/UI·BLOCKED를 포함해 **이 동일 파일**의 (a) 해당 82개 ID 상태·증거, (b) 최신 작업 결과 원장, (c) 아래 인계 스냅샷의 마지막 유효 완료/다음 한 작업을 **같은 갱신에서** 반영한다. 각각의 코드 변경·CI 결과마다 불필요한 새 문서나 별도 이슈를 만들지 않는다.
2. **반드시 사용자 최종 보고 전에 GitHub 반영 커밋과 지정 브랜치 파일 내용 재조회까지 확인**한다. 파일만 생성·링크만 연결·#68 댓글만 작성·계획서만 변경한 것은 `진행 기록 반영 완료`가 아니다.
3. 기록 항목 최소치: **KST 관측시각**, 작업 ID, 실제 대상/입력, 수행 작업·변경파일, 저장소/브랜치/전후 HEAD·적용 SHA, PR/Issue/requestId/CI Run·TXT/JSON·D1/API/UI 원본 링크, LAST PASS/FIRST FAIL·실제 성공/실패/미실행, 소스·운영 영향과 승인 범위, 남은 정확한 조건, **바로 이어서 수행할 다음 한 작업과 담당·성공 조건**. 없는 값은 `NOT_VERIFIED`로 기재하고 추정하지 않는다.
4. **실행 결과의 상태와 문서 기록 상태는 분리한다.** 실행이 성공했지만 GitHub 파일 갱신이 실패했다면 `실행 성공 / 진행기록 미완료`라고 보고한다. 갱신이 실패했다고 실행 결과를 다시 수행·리셋·삭제하거나 안전 거부를 우회하지 않는다. 먼저 해당 파일의 최신 SHA를 재조회해 자신이 담당한 기록만 충돌 없이 반영한다.
5. `DONE`은 **작업 ID의 완료 기준**에 필요한 실제 증거가 존재할 때만 사용한다. `SOURCE_READY`/`SOURCE_CI_PASS`/부분 검증/ `RUNNING`/`BLOCKED`/`STATE_UNKNOWN`/`DEFERRED`는 각각 분리한다. CI PASS는 PC 설치·D1 원격 readback·Production 성공을 의미하지 않는다. 완료 증거가 불충분하면 완료율 분자를 임의로 늘리지 않는다.
6. 한 실행의 결과가 길면 전체 비민감 요약·정확한 원본 링크·핵심 해시만 남기고, 전체 로그·API 원자료·비밀키·설정·인증 URL은 이 파일에 복사하지 않는다. 유효한 예전 증거는 보존하되 반복 문구를 추가하지 않는다.

### C. 인계 스냅샷 (매 의미 있는 작업 종료 시 갱신)

| 필드 | 마지막 확인 상태 |
|---|---|
| 최종 목표 | 82단계 R1~R6로 적격 실적 침체 정보성 지표의 PC 원자료 저장→계산→승인 D1 게시→Production API/UI를 완성. 기존 E1-R4 점수/산식·기타 12대 기업실적은 보호 |
| 현재 관련 단계 | **첫 순차 미완료 R3-04(27/82), 연속 26/82 DONE**. WPSFD42 PC 저장·승인 범위 미검증으로 PARTIAL_SOURCE 유지. **독립 R3-06/07(29·30번째) 기존 Census QFR 실제 PC ZIP 저장·stored-only 계산 PASS 재사용으로 DONE** → 전체 개별 28/82, 순차 포인터는 R3-04 유지 |
| 마지막 검증 완료점 | **R3-03 연속 DONE (§36)**; R3-04 source CI 12/12 PASS이나 PC B 승인·WPSFD42 SQLite 저장 미확인 (§37). **독립 R3-06/07 DONE (§38~39):** 기존 2026-10-27 실제 PC QFR ZIP 원본 sha 232f7757…/snapshot sha 0cf9d0e4… readback 1/1 + 저장자료 계산 2026Q2 15.599418%/Q1 14.037082%/변화 1.562336%p PASS. 새 공급자 호출/DB/D1/배포 0 |
| 재사용할 기존 근거 | QFR 원자료 ZIP PC SQLite 저장·계산 기존 유효 증거; 앱 QFR 3-pin [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175)는 앱 main 병합, 운영 PC 설치·B 게시 별개. R1-09 소스 blob 근거는 §14 |
| 현재 최초 실제 미완료 조건 | **R3-04:** WPSFD42 전용 B 설치·수집/DB 효과 승인 및 실 PC 파일 SHA 미확인. 제어 main A 43개에 서비스 수집 op 없음. 기존 writer-updates BLS 관련 승인 2개는 고용 등 공유 소스 수정이며 allowProviderCalls=false, allowDbChanges=false, 서비스 신규 원본 append 효과 미포함. 우회 실행 금지. R3-05는 SOURCE_READY나 PC 저장자료 없음. 독립 QFR R3-06/07은 기존 실 PC PASS로 별도 완료 |
| 다음 필수 실행 하나 | **첫 미완료 R3-04(27/82):** 현 PC 서비스 수집기 source/설치 해시와 승인된 B 범위를 원담당 정규 PC Source Owner 경로로 확인. 승인 범위 성립하면 WPSFD42 수동 preflight(실제 BLS API 1회) 및 ZIP이 아닌 서비스 13개월 이상 SQLite source SHA/기간/원장 readback, 승인 없으면 HOLD. QFR R3-06/07은 재수집/재시험하지 않는다 |
| 현재 완료율 증거 | **총 개별 DONE 28/82(약 34.1%), 순차 연속 DONE 26/82(약 31.7%)**. 독립 QFR R3-06·R3-07 기존 실제 PC 검증 확정, R3-04/05 WPSFD42는 미완료. R4/D1/API/UI 후속 실증 아님 |
| 최종 갱신 식별 | 이 문서의 **최신 원격 브랜치 HEAD 및 Git blob SHA를 재조회**해 근거로 보고한다. 고정된 과거 SHA를 현행값으로 복사하지 않는다 |
| **순차 포인터·완료율** | **첫 미완료 R3-04 = 27/82**, 연속 26/82(31.7%). 원담당 독립 Census QFR R3-06/07을 기존 PC 유효 증거로 완료, **개별 DONE 28/82(34.1%)**. 계획 조건부 HOLD가 독립 업무를 막지 않는 예외 사용, 순서 허위 변경 없음 |
| R1-09 이번 실행 | 2026-11-17 08시 KST: B 경제지표 `/economic-indicators/earnings/`→`EconomicDetailPanel`→`/api/market-score` `domains[id=earnings]`와 A 8대 위험 4요소·C 보조 GET의 별도 계약 소스 검증. `DONE`, 완료 9/82. 경계 상세·blob §14; 운영 GET·D1 미검증. 다음 R1-10 |

### D. 다음 작업자 재개 순서 및 변경 충돌

- 다음 대화 담당자는 **위 스냅샷과 본 파일의 최신 원장만으로** 담당 작업을 선택하고, 상세 증거가 필요할 때만 링크된 원본 PR/Run/Issue를 조회한다. GitHub 댓글은 다른 대화의 자동 수신이 아니며, 진행 파일 갱신도 운영 PC 설치가 아니다.
- 다른 작업자가 동시에 진행했다면 원격 최신 Blob SHA를 재조회하고 **자신이 변경한 ID 행과 작업 원장만 선택적으로 병합**한다. 타 담당자의 기존 기록·실행 상태 삭제/덮어쓰기, 무승인 reset/rebase/force push 금지.
- 보고 시 최소 **작업계획 파일/진행 기록 파일/브랜치 HEAD/이번 반영 커밋/실제 검증/첫 미완료/다음 실행**을 표기한다. 기록이 안 됐으면 기록 성공을 주장하지 않는다.
- 이 계약은 **보고 누락 방지·업무 인계 품질 기준**이지 매 작업 전 82개 전수재검사, 신규 Controller, 예약 검증, 별도 승인·새 기능 Gate를 추가하는 근거가 아니다.

## 0-A. 고정 순번·실제 진행률 (2026-11-17 KST 바로잡음)

**82단계 실행계획의 순번을 고정한다.** 이전 `71/82` 보고는 R6-04(목록의 71번째) 관련 소스·권한을 *먼저 조사한 순번*이었고, R1~R6 선행 70개를 통과한 진행 단계가 아니다. 이를 완료율·현재 실행 위치로 사용하지 않는다.

| 판정 항목 | 실제 상태 |
|---|---|
| **순차 완료 확정** | **연속 26/82(31.7%)**, 비연속 독립 QFR 2개 포함 **개별 28/82(34.1%)** |
| **현재 순차 진행 단계** | **27/82 = R3-04**, R3-05 SOURCE_READY 미완료, R3-06/07 PC 과거 실증 재사용 DONE |
| **82개 중 개별 완료 확정** | **28개**, 연속 R1-01~R3-03 26개 + 독립 QFR R3-06, R3-07 2개 |
| **71번 R6-04** | **후행 소스 선행 작업·현재 운영 승인 미해결**, 순차 71단계에 도달한 것이 아님 |
| **72~82단계 11개 남았다는 이전 보고** | **철회 유지** — 개별 DONE 28개, 미완료 54개, 첫 순차 미완료 R3-04 |
| **다음 실제 수행 하나** | **R3-04 WPSFD42** 기존 승인 B 설치·실제 PC source/SQLite 재조회, 승인 없으면 효과 제한 HOLD. 완료된 QFR R3-06/07 재실행 금지 |

**순서 운용:** 다음 번호로 넘어가는 기준은 해당 단계의 **계획서 완료 조건 + 근거 링크**이며, 뒤 단계에서 미리 통과한 PR·CI는 계획 순번을 바꾸지 않는 선행 자산으로 유지한다. 사용자 승인 없이 순번이나 완료 기준을 수정하지 않는다. 조건부 HOLD·장기 DEFERRED는 계획서대로 처리하며 다른 독립 승인 작업의 수행을 중단하는 새로운 Gate가 아니다.


## 0. 82개 작업별 진행 상태 (실증·소스 분리)

 > **2026-11-17 KST 최신 판정.** R1-01~R2-10 20/82 DONE, 현재 순차 R2-11(21/82). 코드/CI/공식 문서는 현장 게시·운영 완료 증거 아님.

| 작업 ID | 실행계획 작업 | 현재 증거 기반 상태 | 마지막 확인 증거·남은 조건 |
|---|---|---|---|
| R1-01 | 앱·제어 `main`, W05 브랜치 및 개발·운영·배포 SHA 구분 | `DONE` | **순차 1번 완료:** 2026-11-17 KST GitHub 재조회 앱 `main=af2f963659f15e016a64be1132d4cdec9af0d9c6`, 제어 `main=40a0767ec48829360a0b47a2b37e499d59944a05`, W05 전담 브랜치 확인 시 `e6694ddbd4d01826d8802be355bc671b4e53cd8c` (이번 문서 커밋 후 HEAD 전진). PC 승인 체크아웃은 기존 #1709 A 관측(2026-11-16 12:23:09 UTC) `7afe6b0bcaa74d622ada9190fdc9fcc7fd4d5f10`; **LIVE Core 실행 SHA는 미검증**. Cloudflare Production exact Deployment SHA는 `NOT_VERIFIED`. 개발·PC 저장소·공개 배포를 동일 성공으로 간주하지 않는 서로 다른 상태로 구분·기록함. Production 실제 검증은 R6-14 별도 미완료 |
| R1-02 | 실 PC 승인 `config.source`, 수집기·계산기·게시기·작업 등록·Runner 매핑 | `DONE` | **순차 2번 완료:** PC 승인 A [#1794](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1794)/Run 43902155135에서 `sourceHead=approvedConfigSource=checkpointSource=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`, 원격 TXT/JSON 2/2 확인. [#1796](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1796)/Run 43903516218에서 Core/Korea 등록 Task XML SHA, 실제 Core/Collection/Writer checkpoint 및 `pc-job` 실행 Runner(A급 seat 1/2)를 검증. 제어 `operations.json` A급 허용목록·`pc-job.yml` Windows Runner, B `pc-publication-b.yml` 미승인/별도 lane, Collector→Stored Calculator→Publisher/Worker 소스·현재 설치 미검증 구분은 **§7 상세표**. B effect·실제 Core 실행 SHA는 이번 R1-02 DONE 범위 밖으로 미실증 유지 |
| R1-03 | 운영 SQLite 원자료 테이블·checkpoint·append-only 이력 파악 | `DONE` | 기존 실제 PC QFR/BLS 저장 성공과 현재 SQLite 소스 계약을 §8에 연결. 공통 core.sqlite 두 테이블 `api_history_chunks_v1`·`api_history_snapshots_v1`, PK/provider 분리·내용 SHA·개정 append-only·ON CONFLICT DO NOTHING·BEGIN IMMEDIATE/COMMIT/ROLLBACK, read-only requery와 first_seen_at/retrieved_at/sourceStoredAt 차이 정리. QFR 1/1 실제 SQLite 저장·R3 계산 PASS, BLS 3/3 저장·R3D 계산 PASS. BEA 제조업 전용 CSV/JSON 원본은 보고 저장 PASS지만 독립 SHA readback 미확인. 신규 PC/D1 쓰기 0 |
| R1-04 | 기존 BLS 3개 원천과 공개 5개 정보성 행 계보 조사 | `DONE` | 기본 BLS WPSFD4/WPSFD41/PRS85006111 3원천의 실제 PC append 원본 21/21/6행·hash verified 3건과 저장자료 계산 5행(2+2+1)의 단위·원시/파생 정의를 §9에 연결. 과거 공개 `/api/earnings-recession-indicators` 2026-10-27 HTTP 200/5 READY 및 정확 D1 key `detail:earnings-recession-indicators:v1` 검증. 2026-11-17 최신 Production/자동 재수집은 별도 미검증. WPSFD42는 독립 추가 2행, 본 단계 범위 밖 |
| R1-05 | BEA 단위이익·제조업의 수집기, CSV/메타 및 실제 저장 여부 조사 | `DONE` | **인벤토리·검증 경계 조사 완료(§10), 신규 수집 완료 주장 아님.** BEA 단위이익 FRED 배포 `A463RD3Q052SBEA`는 앱 `main` 구형 게시기에서 직접 공급자 fetch 1건 호출 가능, 저장형 보완 PR #1183 미병합·운영 CSV/메타 archive 현물 `NOT_VERIFIED`; 별도 `raw/earnings-bea-unit-profit-r1/` source-only 캡처 helper만 W05에 존재. BEA 제조업 `N400RC1Q027SBEA`는 사용자 PC 제출 R5 결과 `APPEND_ONLY_SOURCE_STORED/sourceWrites=2`, `sourceVersion=ebaf93f7…` 및 `raw/earnings-recession/bea-manufacturing-profits-r5/` CSV/JSON 경로 확인, 실제 파일 2건 SHA readback은 후행 R3-11 `NOT_RUN`. dry-run/저장/실제 게시를 각각 구분 |
| R1-06 | Census QFR·M3·MTIS 기존 수집 코드·ZIP·저장 위치 조사 | `DONE` | **R1-06 조사 종료(2026-11-17):** QFR 공식 ZIP→PC SQLite 기존 저장·SHA 근거 PASS. M3 `MTM/TI`는 물가 전용 재고 Collector로 확인, C 신규주문·출하 저장 경로·SHA `NOT_VERIFIED`/조건부 `HOLD`. MTIS 전용 Collector·저장 경로·SHA `NOT_VERIFIED`/조건부 `HOLD`. 제어 `main` `config/operations.json` blob `0197f4814d9cc0ff051559b9848a2df9fd0d86b2`에서 M3/MTIS 전용 승인 operation 없음(범용 승인 가능성까지 부정하지 않음). 신규 수집 불필요: QFR; M3/MTIS는 적격성·권한 확정 전 재수집 금지. R2-06/07·R3-13/14에서 적격성/운영 저장 별도 판정. 조사 DONE은 저장·게시 DONE이 아님 |
| R1-07 | SEC CompanyFacts/XBRL 수집 코드·종목 매핑·저장 경로 조사 | `DONE` | **2026-11-17 R1-07 소스·저장경로 인벤토리 완료(§12)**: E1-R4 SEC XBRL `/api/xbrl/frames`+Wikipedia 종목/CIK 매핑→D1 `market_score_earnings_e1_r3_*` current/history/universe/runs; E1-R5 CompanyFacts ZIP→`manual-input/e1-r5/incoming/companyfacts/CIK##########.json` 연구용 경로 별도. E1-R5 연구 경로 productionActivation=false. 실제 PC CompanyFacts 파일·SHA·승인 운영 Collector 설치 `NOT_VERIFIED`, R2-10/11·R3-15 조건부 HOLD. 새 수집·D1 쓰기 0 |
| R1-08 | 기존 D1 키·Worker GET·Writer·게시 원장 조사 | `DONE` | 5개 C 정확키·Writer·Reader 및 공개 경로 소스 매핑; D1 실게시·stored_at·배포 SHA는 `UNVERIFIED`로 분리 (§13). 실제 게시·readback은 후행 R4/R6 |
| R1-09 | 기존 점수 A·기업실적 B·정보성 C API/UI 계약 분리 | `DONE` | **§14** 소스 조사 완료: A 위험 `/earnings-recession/`→4요소 `/api/earnings-recession-detail`와 C 보조 GET/별도 5키; B 12대 경제지표 중 `earnings` 도메인 `/economic-indicators/earnings/`→`EconomicDetailPanel`→`/api/market-score` `domains[id=earnings]`→`publicDomainScores.earnings`. A 4요소/가중치, B E1-R5 도메인 및 C 정보행 혼합·변경 금지. 운영 PC/D1/Production 동치 미검증이며 R4~R6 별도 |
| R1-10 | 지표별 수집 중복·마지막 유효 완료점·첫 미완료 항목을 통합 인벤토리화 | `DONE` | **§15** 원천별 indicator_id, provider→Collector→PC archive/SQLite→Reader/D1 키/GET, 최종 유효 관측 시각과 `NOT_VERIFIED` 범위 전수 표기. 4개 BLS 기본+1 노동비용/QFR 재수집 금지, WPSFD42/BEA/SEC·M3·MTIS 신규 적격성·실저장은 후행. 동일 원천 다중 파생행은 재수집 대상이 아님; A/B/C 별도 유지. 신규 수집/쓰기 0 |
| R2-01 | BEA 공식 NIPA 기업이익·단위이익 시계열 및 단위 확인 | `DONE` | **§16** BEA Interactive Table 1.15 line 7 `A463RD`/FRED `A463RD3Q052SBEA` (USD·quarterly SA) 및 Table 6.16D line 15 `N400RC`/FRED `N400RC1Q027SBEA` (십억 USD·quarterly SAAR) 공식/배포 자료 교차 확인. 2026-09-30 개정·Q2 2026 관측 버전 분리. 2026 연차개정 보존; FRED CSV 계약·권리 판단은 R2-02, 현장 원문 보관 R3 |
| R2-02 | FRED 배포 BEA 단위이익 CSV와 공식 BEA 원본의 정의·권리·개정 비교 | `DONE` | **§17** BEA NIPA 1.15 A463RD → FRED A463RD3Q052SBEA USD/SA/Q 공개 계보 확인. W05 그래프 CSV URL과 코드 요구 헤더/분기 기간 변환·SHA archive 구분. FRED 공식 API는 별도 키·ZIP CSV·realtime/vintage 계약. FRED series Public Domain: Citation Requested, 그러나 FRED Services archive·공개 범위 HOLD_RIGHTS_SCOPE; BEA 공식 자료 public domain. 실제 CSV 원본/BEA 바이트 대조 NOT_VERIFIED 및 PC/D1/Production 변경 0건 |
| R2-03 | BEA 제조업 기업이익 산업 분류·명목/실질·분기·YoY 기준 확인 | `DONE` | **§18** BEA NIPA Table 6.16D N400RC → FRED N400RC1Q027SBEA는 미국 국내 비금융 제조업의 IVA 기업이익, 명목 십억 달러 SAAR/분기. BEA는 CCAdj를 제조업 단위에 배분하지 않음. W05 source 4fcd41887151f8aefe16cb9d47ab5949bca8ed8d와 Reader 5afd165dbe6cdd31bf9e78f169ae263655d2a088는 5개 연속분기, 전년동기 양수, YoY=(Q/Q-4-1)*100, CURRENT_VINTAGE_NOT_PIT를 검사. 2026Q2=1053.304 vs 2025Q2=681.285 → 약 54.6055%; 기존 2026-10-28 PC 보고와 일치. 현장 독립 SHA·D1 게시 미검증, FRED 이용권 HOLD 별도 |
| R2-04 | Census QFR 공식 ZIP/API 경로와 제공 데이터 구조 확인 | `DONE` | **§19** Census 공식 datasets 목록의 QFR-mf.zip(2026-09-08, 2026Q2)과 code programCode=QFR→QFR-mf.csv/CATEGORIES/DATA TYPES/GEO LEVELS/TIME PERIODS/DATA 계약 대조. MFG/US/et_idx=0/is_adj=0, 매출 101·세후이익 115 백만달러 입력. 기존 PC 2026-10-27 ZIP SHA 232f7757.../1746726 bytes, R2 1chunk+1snapshot SQLite 저장·readback PASS 재사용. 공식 별도 revision id 없음(SHA version pin). 신규 수집·쓰기 없음; R2-05 정밀 계산 검사 후행 |
| R2-05 | QFR 세후이익/매출 분자·분모·산업 표본·비교 분기 정합성 검사 | `DONE` | **§20** Census QFR 공식 비계절조정 US/MFG/et_idx=0/is_adj=0, dt_code=101 Net Sales, 115 Income After Taxes (백만 달러)와 2025Q2~2026Q2 원본 5분기 수치 독립 산술 검증. 2026Q2 370082/2372409*100=15.599418144173285%, Q1 287262/2046451*100=14.03708175763798%, 변화 +1.5623363865353053%p. 기존 PC R3 stored-only 1snapshot SHA PASS, source HTTP/D1 writes 0; 공식 Census 2026Q2 2026-09-08 발표 비계절조정 통계와 일치. 이는 자체 파생마진이며 QFR 표본추정 통계, 신선/Production 및 D1 게시 미검증 |
| R2-06 | Census M3 신규주문·출하 공식 변수·단위·조정 정의 확인 | `DONE` | **§21** Census EITS /data/timeseries/eits/m3 공식 variables: category_code/data_type_code/seasonally_adj/cell_value/time_slot_date/time 및 US 필터; 역사적 Census NAICS M3 code MTM=Total Manufacturing, NO=New Orders, VS=Value of Shipments, TI=Total Inventories, U(미조정)/A(SA), 금액 USD million nominal/monthly. M3 공식 설명 신규주문 취소차감·출하 판매액, 비확률표본/반도체 신규주문 제외 주의. api examples 현재 API key 필수. 앱 main 물가 collector MTM/TI만, 실적 침체 MTM/NO·MTM/VS Collector/PC raw/SHAs NOT_VERIFIED→HOLD 조건부. 공식 변수 판정 DONE이지 수집/게시 DONE 아님 |
| R2-07 | Census MTIS 재고/매출 비율 변수·관측월·개정 내역 확인 | `DONE` | **§22** Census MTIS 공식 월간 총사업 재고/매출 비율은 월말 inventory / 당월 sales, 무차원(월간 판매 대비 재고보유 수준), SA/NSA 구분. 2026-10-15 발표(2026-08 SA 총사업 1.33 vs 2025-08 1.40) 확인. EITS /data/timeseries/eits/mtis variables/US/seasonally_adj/time, 공식 API key 필요. 2026-09 MTIS는 2026-11-17 10AM ET 공개 예정(현재 시점 미확정), 도매·소매 AIES 연차개정 영향. exact category_code/data_type_code의 API 실응답, C Collector, PC raw/SHA/게시 미검증으로 HOLD. 공식 정의·보류 근거 기록 DONE이지 운영 수집/게시 아님 |
| R2-08 | BLS 기본 3원천 `WPSFD4`, `WPSFD41`, `PRS85006111` 정의 확인 | `DONE` | **§23** BLS 공식 PPI WPSFD4 Final demand·WPSFD41 Final demand goods 계절조정 월간 지수와 PRS85006111 nonfarm business unit labor costs 분기 계절조정 전년동분기 YoY 정의 검증. 실제 PC 기존 3 snapshot/hash 및 21개월·6분기 R3D 검증 PASS 재사용. 두 PPI 원지수와 자체 t-12 YoY 4행+ULC raw YoY 1행=5행, 외부 BLS NSA 보도자료 YoY와 계절조정 파생값 직접 동치 주장 금지. 신규 API/PC/D1 쓰기 0 |
| R2-09 | BLS 서비스 PPI `WPSFD42` 정의·관측월·YoY 계산 검증 | `DONE` | **§24** BLS Final Demand Services SA monthly WPSFD42 공식·기존 2026-10-27 BLS HTTP 2026-09 157.666/2025-09 150.273, t-12 자체 YoY 4.919712789389985% 확인; BLS 9월 발표의 전월대비 0.8%와 구분. BLS service 1원천→RAW INDEX+DERIVED YoY 2행 별도 snapshot key `detail:earnings-recession-indicators:bls-wpsfd42:v1`, 기본 3원천 5행 key 불변. 코드·구원장 증거 조사 DONE이며 서비스 PC SQLite 저장·D1 본문 실제 readback NOT_VERIFIED |
| R2-10 | SEC CompanyFacts/XBRL 엔드포인트·User-Agent·쿼터 확인 | `DONE` | **§25** SEC data.sec.gov/api/xbrl/companyfacts/CIK##########.json·frames/us-gaap/tag/unit/CY...json 인증/키 없이 공개, www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip 매일 약 03 ET bulk. SEC Fair Access 총 10req/sec·업체+연락처 UA 공개 권고, data.sec.gov CORS 미지원. 실제 E1-R4 frames UA ZGMINI/1.0 (+https://zgmini.kr)에는 담당 이메일 누락, 공식 rate-limit 전역 준수 미검증 → 운영 UA/전체 쿼터 HOLD. 연구 E1-R5 bulk source 기본 dry-run·CIK universe 검증 확인, 실제 PC 다운로드·게시 효과 미실증. API/HTTP/권리/프로덕션 별도 |
| R2-11 | SEC 기업별 회계항목·회계기간·중복·표본 커버리지 검사 | `DONE` | **§26~§31** R2 공급자 연구/적격성 평가 결과 **`COVERAGE=HOLD`**. 기존 E1-R5 SEC CompanyFacts fiscal/tag/unit/filing/revision 계보 및 최근분기 Q3/과거 Q2 비교쌍 오인 방지 감사코드 정식 Node24 CI 9/9 PASS(선별 2-file Draft PR #1200/Run #43986522255). 2026Q2 실PC issuer 분모 500건(#1401)과 CompanyFacts 태그별 실제 수치/보존 ZIP SHA를 구분; 실제 분자 미확인=0% 아님. SEC UA/전체 throttle 미검증, live raw source/권한 미확인 → R3-15 조건부 HOLD, SEC 수집·D1·UI 활성화 금지. **조사·적격성 HOLD 판정만 DONE**; 실제 운영값·저장·게시 `NOT_VERIFIED` |
| R2-12 | 공급자별 발표일·관측일·수집일·수정본·계절조정·지연 구별 | `DONE` | **§32** BEA 2026Q3 corporate profits 11/25 ET 미발표, QFR 2026Q3 12/07 ET 미발표, Census M3 2026-09 11/03 ET Full 기발표, MTIS 2026-09 11/17 10ET 아직 미래(2026-11-17 09KST 기준), BLS PPI 월간 4개월까지 개정, ULC Q3 초보도 11/05·개정 12/08 ET, SEC CompanyFacts real-time vs nightly bulk ~03ET. 각 observationPeriod/releaseAt/retrievedAt/sourceStoredAt/updated-vintage SHA·SA·publishAt 분리, 제공되지 않은 releaseAt/vintage null·시차 구분 명시. 공식 자료+원 소스 코드 대조 완료; 새 운영 수집·D1 갱신은 없음 |
| R2-13 | 공급자별 재사용권·무료 한도·저장·파생·공개 허용/보류 판정 | `DONE` | **§33** LICENSE/API/HTTP/SERIES/COVERAGE 5축 판정: BEA direct public stats READY(등록 API key·100req/min 등 조건) / Census 통계 자료 파생·출처표시 READY, 무키 API ≤500/day/IP(QFR stored PC PASS, M3/MTIS 현행 collector HOLD) / BLS public domain+출처표시 READY, v1 25/day, registered v2 500/day(BLS base 3 raw PASS, WPSFD42 PC HOLD) / SEC public EDGAR 분석 가능하지만 UA 회사+연락처/전체 10req/sec/issuer coverage 미검증으로 실제 수집·공개 HOLD / FRED 재배포·archive·제3자 권리 Graph CSV HOLD, BEA official direct 전환만 조건부. provider HTTP 통신·원시파일 LIVE readback·D1 게시 별도 NOT_VERIFIED |
| R3-01 | 공통 원자료 저장 계약의 provider·series·period·vintage·SHA 확인 | `DONE` | **§34** BLS `api_history_chunks_v1`/`api_history_snapshots_v1` provider/dataset/series, observationDate, SA/NSA, chunk_sha256·snapshot_sha256, first_seen_at vs retrieved_at/as_of, official `vintageId=null` 3계열 기존 R3D 실PC 3SHA PASS. Census QFR 같은 2table `provider=CENSUS`,`dataset=QFR_MFG_US_NSA_AFTER_TAX_MARGIN`, original ZIP sha=232f7757…+payload hash+snapshot hash, `CURRENT_RETRIEVAL_NOT_PIT`, 기존 실제 PC append/readback PASS. BEA unit/mfg CSV·meta SHA/sourceVersion/sourceStoredAt 계약 source 확인(PC 전체 archive readback은 R3-08~11 HOLD); SEC/M3/MTIS 조건부 raw 미확인. 필드/시점 매핑 판정 DONE, 운영 전체 최신 저장·D1 성공 주장 없음 |
| R3-02 | SQLite append-only·개정본·중복·checkpoint 구조 재사용/최소 보완 | `DONE` | **§35** BLS/QFR 공통 `api_history_chunks_v1` 및 `api_history_snapshots_v1` (provider,dataset,sha) PK, 2table exact column/trigger guard, `BEGIN IMMEDIATE`→schema 재검사→`INSERT ON CONFLICT DO NOTHING`→해시/참조/provenance readback→COMMIT; 실패 ROLLBACK. 동일 QFR zip 0중복, 변경 ZIP 2번째 불변 snapshot, BLS namespaces 불변, 잘못된 schema·외국 Census 네임스페이스·부분 SQL 실패 안전 중단 source regressions. 과거 실PC BLS 3 snapshot/hash verified + QFR 1 chunk/1 snapshot committed PASS 재사용, 이번 DB 쓰기/실시간 PC schema 검사 없음 |
| R3-03 | 기존 BLS 3원천 저장·계산 PC 실측 증거 재사용 | `DONE` | **§36** R3-D 2026-10-26 18:20:33Z 실제 PC TXT `PASS_R3D_STORED_ONLY_CALCULATION`; WPSFD4/41 2025-01~2026-09 각21월/9쌍/0결측, PRS85006111 2025Q1~2026Q2 6분기/0결측, snapshot SHA 3/3·청크/코호트 fetchedAt+response hash PASS. 원시 저장자료로 계산 PPI own SA YoY 6.346301%/9.772194%, ULC raw YoY 1.4%, API/SQLite/D1 writes 0, score & scheduler unchanged. 기존 PC 증거/실제 R3-D 검증 reader source 대조·재사용, 공급자 추가 호출 0, 2026-11 최신 관측으로 위장하지 않음 |
| R3-04 | WPSFD42 승인 수동 수집 후 SQLite 원본·SHA·시각 재조회 | `PARTIAL_SOURCE` | **§37·§40** W05 수집기·WPSFD42 기존 수동 PREFLIGHT/APPLY CMD 2개+테스트 12건을 main 기준 별도 Draft PR #1203(정확히 4파일, head `15ca748e`)으로 분리. Node24 CI #43988919125 completed/success, base9+서비스3=12/12 로그 PASS, 빌드·타입·전체 회귀/PC 게시/Cloudflare 계약 PASS. 전담 source 파일 main에 없음(404), pc-control A allowlist 전용 WPSFD42 op 없음; 실제 운영 PC 설치/기승인 B source 경로·WPSFD42 저장·SHA/기간/원장 미확인. `dry-run`은 provider API 호출. **운영 효과 BLOCKED_OPERATING_APPROVAL/NOT_VERIFIED, R3-04 DONE 아님**, 신규 수집·DB·D1·Production 쓰기 0 |
| R3-05 | WPSFD42 저장자료로 서비스 PPI·YoY 정보성 2행 계산 | `SOURCE_READY` | WPSFD42 2행 계산 브랜치 구현 존재, 실제 운영 저장원본 입력 증거 미확정 |
| R3-06 | Census QFR 기존 ZIP 저장 경로·SHA·분기·원장 재조회 | `DONE` | **§38** 2026-10-27 승인 PC SQLite ZIP append 결과 PASS_QFR_SQLITE_APPEND_READBACK, chunk/snapshot 1/1, 원본 ZIP sha256=232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654, observedThrough=2026Q2. 2026-10-27 R3 read-only 실 PC STORED_SNAPSHOTS_VERIFIED=1 및 snapshotSha256=0cf9d0e4bced96b300810a448bf67be3b663252178f15853f103561d876ddeb3, retrievedAt=2026-10-27T14:52:13.108Z, sourceStoredAt=1793112733108. R2/R3 source/원격 승인 당시 보고 대조; 신규 공급자/PC 호출 없음, 현재 Q3 데이터·D1/웹 미검증 |
| R3-07 | 저장 QFR로 제조업 세후이익률 현재·직전·변화폭 계산 | `DONE` | **§39** 기존 운영 PC read-only R3 결과 PASS_QFR_STORED_READONLY_PREVIEW: 2026Q2 15.599418144173285%, 2026Q1 14.03708175763798%, 변화 +1.5623363865353053%p; 2025Q2~2026Q2 5연속 분기, 동일 QFR ZIP sha와 snapshot sha verified. 원료 afterTaxProfit/sales 직접 재계산 후 stored margin strict match, API/SQLite/D1/score/배포 쓰기 0. 2026-10 당시 실증 재사용, 현재 신규 Q3 수집/사이트 게시 아님 |
| R3-08 | BEA 단위이익의 기존 저장 원본 탐색, 필요 시 승인 1회 수집 | `SOURCE_READY` | BEA 저장 원본 capture helper 구현·CI PASS, 실제 PC 저장본 확인 안 됨 |
| R3-09 | BEA 단위이익 CSV·메타·SHA를 하나의 고정 버전에 결속 | `SOURCE_CI_PASS` | 앱 PR #1183 저장 CSV+meta SHA 보관 5/5 Node fixture PASS, 실PC 아카이브 검증 미완료 |
| R3-10 | BEA 단위이익 계산기에서 공급자 호출 분리 | `SOURCE_CI_PASS` | 앱 PR #1183 provider-fetch-free 게시/계산 준비 및 Node CI 성공, 운영 원본 미검증 |
| R3-11 | BEA 제조업 CSV·메타 archive의 SHA·행 수·기간 직접 PC 재조회 | `NOT_RUN` | BEA 제조업 현장 아카이브 CSV/meta 직접 SHA readback 미확보 |
| R3-12 | BEA 제조업 유효 저장 원본으로 분기·YoY 계산 및 이력 보존 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-13 | 적격 판정 시 기존 경로로 Census M3 원자료 저장·재조회 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-14 | 적격 판정 시 기존 경로로 Census MTIS 원자료 저장·재조회 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-15 | 적격 판정 시 SEC XBRL 원자료 저장·기간 정규화·중복 제거 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R3-16 | 저장자료 계산 결정성·SHA 계보·결측·0·개정·stale 검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R4-01 | C 전용 독립 D1 키·허용목록·공개 데이터 계약 확정 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R4-02 | 기존 승인 공통 B 경로 확인 및 QFR·BEA 단위이익 exact-key 연결 | `SOURCE_MAIN_CI_PASS` | 제어 B 게시 실행기·승인 검증·비활성 workflow 8파일 [PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762) main 병합 SHA 8c67a6c9e9e778278259593d0eb35b2b0e2a05ea. Node CI #43892670904 22/22 PASS·C996 PASS. QFR 10파일 SHA-256 source evidence 고정 app commit 0a786bd69c7dc815d296143021473d8f6bf7a118 (§6); 승인 manifest/별도 owner 승인·PC 실효과는 없음 |
| R4-03 | 제어 실행기 key·MODE·원본·D1 결과 검증 결함 수정 및 BEA 회귀 | `SOURCE_MAIN_CI_PASS` | 제어 B 계약·QFR source pin·readback·요청별 결과 처리 코드 main 소스 병합. Executor blob 1cc9088a3d025b6b8185d13c932f3538c81b2954, Windows Node CI 22/22 PASS. 운영 실행은 별도 |
| R4-04 | QFR preflight의 sourceVersion·ZIP SHA·sourceStoredAt을 apply까지 고정 | `SOURCE_MAIN_CI_PASS` | 앱 QFR 3-pin·per-request output [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) main 병합 SHA faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4, publisher blob f2b78e7d806ee9792e19a6a12636f547849026fd, Node CI #43892753705 4483 PASS/0 FAIL. D1은 미게시 |
| R4-05 | PC 저장 QFR 계산으로 경량 Snapshot 구축·스키마 검증 | `SOURCE_READY` | 기존 QFR one-shot Publisher와 Reader 소스 존재, 운영 적격 payload preflight 필요 |
| R4-06 | 승인 QFR 단일키 D1 게시·실제 body/version/stored_at readback | `BLOCKED_PUBLISH_SCOPE` | 제어 main에 게시 소스는 있으나 승인 manifest approvals/publications/<requestId>.json 부재, 별도 owner B 승인 Issue/PC 실제 효과·원격 D1 readback 없음. 실제 게시 NOT_RUN |
| R4-07 | BEA 단위이익 게시 중 공급자 재호출 제거·원본 SHA 고정 | `SOURCE_CI_PASS` | 앱 PR #1183 stored-only BEA Publisher source+Node CI #43884699372 PASS; 운영 raw/D1 없음 |
| R4-08 | 승인 BEA 단위이익 key D1 게시 및 실제 시각/버전 비교 | `NOT_RUN` | BEA 단위이익 실제 B D1 게시/readback 증거 없음 |
| R4-09 | WPSFD42 독립 Publisher·Worker·테스트를 current main 기준 선별 통합 | `SOURCE_BRANCH_ONLY` | W05 브랜치의 WPSFD42 독립 2행 Publisher/Worker 소스는 main 미반영. 기존 결과 TXT의 checkout 내 저장 문제를 요청별 `ZGMINI_EARNINGS_C_LOG_DIR`·기존 수동 HERE fallback으로 보완. 순수 helper blob ff5e616593ec… 및 테스트 1eebf1152d82… exact Git SHA 확인; 격리 Node22 지역 fixture **4/4 PASS**(WPS 게시기 전체 파일은 경로 부분만 재현하여 end-to-end CI 미확인). R4-09의 main 선별 통합과 실제 D1 2행 쓰기는 미완료 |
| R4-10 | WPSFD42 전용 D1 키에 2행 게시·기존 BLS 5행 key 보호 | `NOT_RUN` | WPS 서비스 전용 D1 2행 실게시·기존 5행 원장 불변 미실증 |
| R4-11 | BEA 제조업 별도 게시 키·승인 효과·archive SHA 결속 | `PUBLISH_SCOPE_UNVERIFIED` | BEA 제조업 전용 B 게시 effect/manifest 미확정 |
| R4-12 | BEA 제조업 독립 D1 게시 후 body/version/time readback | `NOT_RUN` | BEA 제조업 D1 단일키 실제 게시·재조회 미실증 |
| R4-13 | 적격 M3·MTIS 게시 필요 시 승인된 독립 키·Writer 최소 연결 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R4-14 | 적격 SEC 게시 필요 시 승인된 파생 key·Worker 계약 연결 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R4-15 | 공개 API를 D1 저장형 GET/HEAD로 구현·freshness/status 제공 | `PARTIAL_SOURCE` | 기본 BLS 5행 및 QFR/BEA Worker stored-only 구현은 존재, 전체 지표 운영 GET 증거 미완료 |
| R4-16 | 단조 checkpoint·멱등성·부분실패 UNKNOWN·중복 방지 및 원장 검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-01 | 기존 E1-R4 방어 점수·1년 차트·4요소 보존 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-02 | 정보성 C 영역을 기존 점수 A 및 기업실적 B와 명확히 구분 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-03 | 고정 배열 대신 API rows/registry 기반 지표 수 동적 표시 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-04 | 기본 BLS 3원천의 기존 공개 5행 보존 | `EXISTING_EVIDENCE` | BLS 기본 5개 정보행 공개 GET 과거 PASS 이력, 전체 UI 현재판 불변은 미확정 |
| R5-05 | WPSFD42 READY 시 신규 2행 합성 7행, 미제공 5행 유지 | `SOURCE_BRANCH_ONLY` | WPS 서비스 5+2 동적 7행 UI/Reader 일부 브랜치 준비, main 미반영 |
| R5-06 | Census QFR 제조업 세후이익률 현재·직전·변화폭 표시 | `SOURCE_MAIN_READY` | QFR API·UI PR #958 main 반영 이력, 실제 현재 D1 값 없어 종단 미완료 |
| R5-07 | BEA 단위이익 값·직전값·USD_PER_REAL_GVA_UNIT·분기 이력 표시 | `SOURCE_MAIN_READY` | BEA 단위이익 정보성 UI/GET 소스 준비, 운영 D1 값 미실증 |
| R5-08 | BEA 제조업 분기·YoY·출처와 정보성 성격 표시 | `SOURCE_MAIN_READY` | BEA 제조업 Worker/UI 준비 소스 존재, 운영 D1 값 미실증 |
| R5-09 | 적격 M3/MTIS 신규주문·출하·재고/매출 정보 확장 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-10 | 적격 SEC 기업 커버리지·기간·지표 정의 표시 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-11 | 현재/이전값·단위·관측/수집/게시 시각·stale·차트 정합성 보완 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R5-12 | 390·768·1440·1920px 반응형/접근성·오류 영향·출처 페이지 확인 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-01 | 변경된 수집·계산·게시·Worker·UI의 관련 Node 테스트 실행 | `TARGETED_CI_PASS` | 기존 QFR 제어 Node 22/22, QFR 앱 4,483 PASS·0 FAIL 및 BEA CI 성공 유지. 별도 WPSFD42 결과 디렉터리 helper+테스트 원문 Git blob 일치, 로컬 격리 Node22 fixture 4/4 PASS(전체 게시기·전체 앱 CI는 이번 소스 변경 후 미실행). PC/D1/Production 종단 검증 제외 |
| R6-02 | SHA 변경·중복·단위·기간·결측·개정본 회귀검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-03 | API 403/429/500·D1 timeout·결과 누락·잘못된 key/version 검증 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-04 | 승인 B 작업의 실제 Windows Runner·manifest·SHA·Issue/Run 확인 | `BLOCKED_PUBLISH_SCOPE` | PC #1794 실제 checkout HEAD=config SHA `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388` 확인, 원격 TXT/JSON 2/2, Core 등록 #1796 정상. 하지만 QFR 정확키 B 승인 manifest/별도 owner approval Issue/comment·활성 변수/실제 Windows B Run·D1 게시 결과는 없으므로 71번 후행 단계는 여전히 미완료 |
| R6-05 | QFR 실제 D1 body/version/sourceStoredAt/stored_at 검증 | `NOT_RUN` | QFR D1 실제 body/version/timestamp readback 없음 |
| R6-06 | QFR 공개 GET·PC·모바일 화면 값·출처·분기 확인 | `NOT_RUN` | QFR 실제 배포 SHA·현재 Production API/UI 값 일치 미확인 |
| R6-07 | BEA 단위이익 저장 원본·D1 중복·source SHA 검증 | `NOT_RUN` | BEA 저장 원본→D1 단일키 실게시/원문 비교 미완료 |
| R6-08 | BEA 단위이익 GET·5분기·단위·화면 확인 | `NOT_RUN` | BEA 운영 GET/5분기/UI 동치 미완료 |
| R6-09 | WPSFD42 D1 게시 및 기존 BLS 5행 checkpoint 보호 | `NOT_RUN` | WPS 2행 D1 실게시·base5 체크포인트 보호 미실증 |
| R6-10 | WPSFD42 정상 7행/결손 5행 API·UI 검증 | `NOT_RUN` | WPS 실제 Production 7행/5행 상태 검증 미실증 |
| R6-11 | BEA 제조업 archive SHA와 D1 게시 원문·기간·시각 확인 | `NOT_RUN` | BEA 제조업 현장 archive SHA→D1 실게시 미실증 |
| R6-12 | BEA 제조업 GET·YoY·분기 이력·UI 확인 | `NOT_RUN` | BEA 제조업 운영 API/UI 일치 미실증 |
| R6-13 | 기존 E1-R4 4요소·가중치·이력·TTL·별도 12대 도메인 회귀 | `EVIDENCE_NOT_MAPPED` | 개별 완료 증거 미대조. DONE/FAIL로 추정하지 않음 |
| R6-14 | 관련 PR·CI·main 통합→Cloudflare Git Integration→정확 배포 SHA→공개 확인 | `IN_PROGRESS_SOURCE` | 앱 QFR main SHA faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4, 제어 B main SHA 8c67a6c9e9e778278259593d0eb35b2b0e2a05ea 개발 통합, 관련 CI PASS. 실제 PC/D1/Cloudflare 정확 Deployment/API/UI 검증 미완료 |
| R6-15 | 다음 공식 발표 이후 자연 수집·checkpoint·D1·UI 실제 전진 관찰 | `DEFERRED` | 다음 실제 공식 발표 후 자연 갱신 확인; 현재 구현 STOP Gate 아님 |

**상태 집계(82개 정확히 1회씩):** `DONE` 5개 · `EVIDENCE_NOT_MAPPED` 35개 · `PARTIAL_SOURCE` 2개 · `SOURCE_REVIEWED` 1개 · `EXISTING_EVIDENCE` 6개 · `NOT_RUN` 13개 · `SOURCE_READY` 3개 · `SOURCE_CI_PASS` 3개 · `SOURCE_MAIN_CI_PASS` 3개 · `BLOCKED_PUBLISH_SCOPE` 2개 · `SOURCE_BRANCH_ONLY` 2개 · `PUBLISH_SCOPE_UNVERIFIED` 1개 · `SOURCE_MAIN_READY` 3개 · `TARGETED_CI_PASS` 1개 · `IN_PROGRESS_SOURCE` 1개 · `DEFERRED` 1개. 각각의 상태는 최종 운영 완료율이 아니다.

## 1. 현재 확정 가능한 진행 상태

| 기준 | 실제 상태 |
|---|---|
| 전체 계획 | **R1 10 + R2 13 + R3 16 + R4 16 + R5 12 + R6 15 = 총 82단계** |
| 82단계 실제 완료 수 | **5/82 확정 DONE (R1-01~R1-05)**, 현재 R1-06(6/82). 77개는 완료 기준 미확정으로 신규 수집 77회 의미하지 않음 |
| 기존 14단계 실제 종단 완료 | 마지막 확인 기준 **0/14** — 소스·테스트 PASS는 별도 |
| QFR 원자료·계산 | 2026-10-27 운영 PC의 기존 유효 저장·계산 성공 증거 재사용 |
| QFR B 게시기 코드 | 제어 [PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762) 8파일 main 소스 병합 8c67a6c9e9e778278259593d0eb35b2b0e2a05ea. 독립 B Workflow는 vars/manifest/owner 댓글 필요, 실제 승인·게시 없음 |
| QFR B 게시기 실제 Node CI | 최신 [Run #43892670904](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43892670904) **22/22 PASS, 0 FAIL**. 변경 전 [#43883643669](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43883643669) 21/21 PASS는 이력으로 유지 |
| QFR 원자료 3핀 | 앱 [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) main 병합 faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4; CI 4483 PASS/0 FAIL. 운영 D1 게시 전 |
| BEA 단위이익 저장형 게시기 | [앱 Draft PR #1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183)에서 소스 준비. 임시 원본 아카이브 단위시험 5/5 PASS |
| BEA 단위이익 앱 Node CI | [Run #43884699372](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43884699372) **성공**: 빌드/타입체크 PASS, 회귀 총 4471건 중 4461 PASS·0 FAIL·10 SKIP, 게시 복구 11/11, 후보 공개계약 69/69 |
| B 실제 QFR 단일키 승인·PC 설치 | **UNVERIFIED / NOT_RUN**. 기존 Writer B 파일 overlay 권한은 D1 쓰기 금지 |
| QFR D1 게시·정확키 원격 재조회 | **NOT_RUN**, 성공 영수증 미확보 |
| Production API/UI 최신 실데이터 일치 | **NOT_VERIFIED** |
| 운영 효과 | 이 기록 범위에서 PC 원자료/SQLite/D1/Cloudflare/예약 변경 **0건** |

**원칙:** 코드 완료, CI PASS, 운영 PC 설치, D1 쓰기·실측 재조회, Production UI는 서로 다른 상태다. 과거의 유효한 수집·계산을 반복하지 않으며 미확인 항목을 거짓 DONE 또는 실패 0/82로 표기하지 않는다.

## 2. 작업 ID별 검증된 최신 증거

| 작업 ID | 소스/시험 상태 | 남은 완료 조건 |
|---|---|---|
| R4-02 | **SOURCE_MAIN_CI_PASS** — 제어 8파일 main 병합 PR #1762, Node CI 22/22 PASS·C996 PASS | QFR B 정확키 manifest·별도 owner 승인·실제 PC/D1 실행 미완료 |
| R4-03 | **SOURCE_MAIN_CI_PASS** — 제어 계약·readback·요청별 로그 source main 병합 | B 실제 실행 승인·검증은 별도 |
| R4-04 | **SOURCE_MAIN_CI_PASS** — 앱 QFR 3-pin source main 병합 #1175, 4483 PASS | 실제 게시·D1/readback은 미실행 |
| R6-01 (제어 게시 관련) | **TARGETED_CI_PASS** — 제어 B Node 22/22, 앱 QFR 4,483 PASS·0 FAIL, 기존 BEA CI PASS | 다른 운영 범위 실증·PC/D1/Production은 별도 |
| R3-09~10 | **SOURCE_CI_PASS / PC SOURCE UNVERIFIED** — BEA CSV+메타 불변 저장 라이브러리·시험 PASS | 공식 공급자 원본/권리 확인, 승인된 PC Collector의 실제 저장·SHA 재조회 |
| R4-07 | **SOURCE_CI_PASS / D1 NOT_RUN** — BEA 저장형 게시기는 수집과 분리되고 공급자 재호출 없음 | 실제 BEA 저장 원본 확보, 승인 B 효과, 원격 게시·재조회 |
| R6-04 | **NOT_RUN** | 실제 승인 manifest·운영 설치·고유 Issue/Run/JSON/TXT |
| R4-06 및 R6-05~06 | **NOT_RUN** | 승인된 QFR 정확키 D1 게시, body/version/timestamp 재조회, Production GET/UI 확인 |
| 기타 R1~R6 항목 | **NOT_YET_MAPPED** | [82단계 계획서](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md)의 각 ID에 과거 유효 증거를 연결한 다음 DONE/READY/HOLD/DEFERRED 확정 |

## 3. 실제 첫 병목과 다음 실행

**FIRST UNFINISHED(현재 순서):** R1-01~03 DONE. 현재 R1-04의 BLS 저장 원본 3개→공개 정보성 5행 계보 및 공개 기본 키 검증이 남았다. 후행 R6-04 B 승인·게시 문제를 현재 순차 번호 71이라고 표시하지 않는다.

**다음 필수 실행:** R1-06(6/82) Census QFR/M3/MTIS 공식 수집코드·기존 ZIP/원본저장 지점 조사. QFR 재수집 금지, M3/MTIS 적격·승인되지 않은 공급자 호출 금지.

정규 예약의 다음 자연 발표 관찰(R6-15)은 **DEFERRED**이며 현재 기능 완성의 강제 완료 Gate가 아니다.

## 4. 다음 업데이트 기록 규칙

각 실행마다 `관측시각(KST) / 작업 ID / LAST PASS / FIRST FAIL / requestId·Issue·Run / 실행 PC·실제 source SHA / 저장·D1·UI 증거 / 새 상태 / 다음 필수 행동`을 누적한다. 이전 성공을 근거 없이 재실행하지 않고, Source/CI 준비 상태만으로 운영 DONE을 주장하지 않는다.

| 2026-11-17 01:06 KST · 예약 W05 | **R1-02 부분 매핑 진전**: 제어 최신 `main` 운영 정본과 기존 #1709 원장을 대조하여 운영 Runner 6개, A pc-job 실행 경로, B 승인 Writer 분리, 정기 Windows Task 15개(11/12 당시)의 범위를 구분. 신규 PC 작업/공급자 호출/D1 쓰기 0. | [운영 정본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/docs/PC_OPERATING_SYSTEMS_CANONICAL.md), [PC #1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709), Run 43866041104. GitHub 문서 증거만 추가, 운영 설치·활성 상태 신규 실증 아님 | R1-02 `PARTIAL_SOURCE` 유지; 다음 단일 실행: 기존 승인된 operation/Task 원장에서 earnings 각 collector·calculator·publisher별 Task명·Runner·실제 checkout SHA를 연결하고 빈 항목을 UNKNOWN으로 기록. 완료 1/82 유지 |

## 5. 최신 작업 결과 원장 — 후속 채팅 종료 전 반드시 기록

| 관측 기준(KST) | 작업/실제 결과 | 근거(실제 변경·검증) | 누락된 종료 조건 |
|---|---|---|---|
| 2026-11-16 23:14경 | R4-02 제어 B 게시 경로 소스 7파일 선별 통합 | [Draft PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762), 최신 main에서 별도 분기. 실제 운영 변경 0건 | 해당 B exact-key 승인 manifest/실PC 설치·D1 게시 |
| 2026-11-16 23:17경 | R4-03 게시 결과 검증 Node 집중시험 **21/21 PASS** | [Run #43883643669](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43883643669), Windows 격리 CI. 0 FAIL | 제어 main 선택적 통합·설치·운영 검증 |
| 2026-11-16 23:22경 | R3-09~10/R4-07 BEA 저장형 게시기·불변 archive Node CI **PASS** | [Draft PR #1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183), [Run #43884699372](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43884699372), 4471 total/4461 pass/10 skip/0 fail, 원본 archive 5/5 | BEA 공식 자료·권리·PC 실제 저장·D1 readback |
| 2026-11-16 23:35~23:36 | 82단계 독립 진행 파일 생성·계획서 링크 | 기존 커밋 [68913de6](https://github.com/ansqhd5774-Choi/zgmini/commit/68913de6a85cfdf7e74e0e0622c6d8b6f86aa859), [9caeb69b](https://github.com/ansqhd5774-Choi/zgmini/commit/9caeb69bb457ea5d0c08177ac1358401b04817f3) | **당시에는 82개 개별 상태 표와 실행순서별 원장이 없어 ‘진행 기록 완료’라고 말하면 안 됨** |
| 2026-11-16 최신 확인 | 사용자가 지적한 진행 기록 누락을 인정하고 82개 ID별 상태·마지막 작업 타임라인 보완 | **이 파일의 현재 변경 커밋을 GitHub에서 직접 재조회하여 최종 확정** | 미대조 항목의 실제 과거 증거 매핑 및 현재 우선 B 운영 effect 검증 |

| 2026-11-16 KST | W05 기록·인계 기준 확립: **82단계별 상태→작업 이력→인계 스냅샷을 항상 동일 파일에 갱신**하고 사용자 보고 전에 원격 재조회. 규칙 자체도 이 기록에 반영 | 진행 기록 [변경 커밋 `8255c6968da72e6a658ecc04f546a04649cd1188`](https://github.com/ansqhd5774-Choi/zgmini/commit/8255c6968da72e6a658ecc04f546a04649cd1188), 브랜치 [`AGENTS.md` `3b8b67c807e80e635f3dc636535a4509f3a01c07`](https://github.com/ansqhd5774-Choi/zgmini/commit/3b8b67c807e80e635f3dc636535a4509f3a01c07), 과거 인계 노하우 [`37d898d3b12f4c5d6ea3c0f1d993adb08a041834`](https://github.com/ansqhd5774-Choi/zgmini/commit/37d898d3b12f4c5d6ea3c0f1d993adb08a041834) | 기록 규칙 문서 반영 **DONE**, 기능 운영 QFR B exact-key 승인·설치·D1 게시·Production은 이전과 같이 별도 **미완료** |

| 2026-11-17 00:08 KST (2026-11-16 15:08 UTC) | **R4-02~04/R6-01**: QFR B 요청별 결과 TXT가 소스 checkout에 남던 문제를 수정. W05 게시기+테스트, 앱 #1175 및 제어 #1762 소스/테스트 연계 수정·실제 CI **PASS** | W05 `984e145cd33d30577229825959cef4540490c266` + `54117e382964e1860770156cc6d9ce809b6cfedd`; 앱 PR #1175 head `f4e158a87ea89a936e09160ff568ce79954e7de8`, [Run #43892753705](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43892753705) 4,483 PASS/0 FAIL; 제어 PR #1762 head `b679638d7f5c0eb7daff1b3bdafeaddf0fb2b7d7`, [Run #43892670904](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43892670904) 22/22 PASS. [운영 PC 기존 #1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709) 6파일 중 5파일 ABSENT, 승인 A 조회만 PASS | Source/CI **DONE** · 실제 QFR D1 B 승인/설치/게시 **NOT_RUN**. 다음 필수: R4-02/R6-04 정확키 B effect 승인·설치 근거 확보/정규 연결, 그 뒤 D1 단일키 원격 readback |

| 2026-11-17 KST · W05 후속 작업 | **R4-02/R6-04 승인·실제 설치 범위 확정 조사**: control 최신 main에는 `pc-publication-b.yml`·`approvals/publications`·QFR B 게시 Executor가 없고, 기존 QFR #1709은 A급 읽기 전용(운영 6파일 중 5파일 ABSENT). 승인 없는 D1 게시 요청 0건. 병렬로 **R4-09 WPSFD42 게시기 로그 경로 소스 수정**: W05 브랜치에 helper·테스트 신규, Publisher 변경 | 승인 검사: [control main](https://github.com/ansqhd5774-Choi/zgmini-pc-control/tree/main), [운영 A #1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709). WPS 소스 커밋: `b72589c8d538fb455691d23f8aa5833c3c96f7db`, `cc79b4bc80178de07ff76220afc778`, `401dd40057aef41e19a4d05422cb75938541a77d`; helper blob `ff5e616593ec946aca3c963b770f3fd9a778f0de`, test blob `1eebf1152d822c28efd08fae82e0747697d8dabf`, publisher blob `609008dabd0ba04c827ec8df1573dc34949f70da`; 격리 Node22 local fixture **4/4 PASS**, 두 Git blob SHA 동치. 이번 Node 검증의 publisher는 경로 코드만 재현한 부분 fixture여서 **W05 전체 CI PASS 주장 금지** | **첫 차단 R4-02/R6-04:** QFR 정확키 B 승인 manifest·독립 workflow/main 통합·운영 설치 SHA 부재. 다음 필수 실행: 정규 Owner의 정확키 B 승인 효과·main 선별 통합·설치 조건 결속 후 기존 저장 QFR 원본 단일키 게시·D1 재조회. 독립 WPS는 main 선별 통합/실수집/게시 후속, 신규 스케줄·운영 쓰기 0 |

| 2026-11-17 KST · W05 정확한 B 경로 소스 재판정 | **R4-02/R6-04 원인 정정:** 기존 운영 PC #1709에서 QFR 6파일 중 5파일 없음은 사실이나 독립 B 게시기 `validatePcSources`는 그 5파일의 운영 설치를 요구하지 않음. 승인된 운영 source/checkout 무결성과 별도 `main` publisher/정확키 B manifest가 핵심 조건임을 확인. 불필요한 운영 PC Writer 파일 설치를 강제 Gate에서 제외 | [제어 executor source](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/fix/w05-qfr-b-publication-selective-20261116/tools/publication-executor.mjs) · [앱 dual-source gate](https://github.com/ansqhd5774-Choi/zgmini/blob/main/scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs) · [PC A #1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709) · 제어 `main` 승인 dir/workflow 목록 | 소스 검증 확정. 다음 필수: 승인된 단일키 B source/`main`/manifest 통합·활성 조건 이행 후 QFR 기존 저장분 1키 실제 게시·D1 readback. 이번 PC·D1 운영 쓰기 0 |

| 2026-11-17 KST · W05 연속 실행 | **R4-04 앱 QFR 3-pin 게시기 소스 main 병합**: Draft #1175를 CI·변경 3파일·병합 가능 확인 후 ready 전환, exact head `f4e158a87ea89a936e09160ff568ce79954e7de8`으로 squash merge. `main` 게시기 blob 재조회 PASS. | [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175), 병합 `faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4`; 사전 Node [Run #43892753705](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43892753705) 4,483 PASS/0 FAIL. 개발 main source만 변경. | 앱 R4-04 **SOURCE_MAIN_CI_PASS**; PC 설치·실 D1·Prod 검증 미실행. 다음: 제어 PR #1762 실제 승인/disabled flag/manifest 점검 후 안전한 source-only main 통합 여부 결정 |

| 2026-11-17 KST · W05 소스 통합 완료 | **R4-02~04/R6-14:** 앱 QFR pin PR #1175를 main에 squash 병합 faa89cfbe8b2aeabcbd8b8e9747cc07620f9eff4, 제어 승인 검증 및 기본 gated B workflow PR #1762를 제어 main에 squash 병합 8c67a6c9e9e778278259593d0eb35b2b0e2a05ea. 사전 CI 앱 4483 PASS, 제어 22/22 PASS·C996 PASS | [앱 PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) / [제어 PR #1762](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1762). 앱 main Publisher blob f2b78e7d806ee9792e19a6a12636f547849026fd; 제어 main Executor blob 1cc9088a3d025b6b8185d13c932f3538c81b2954. Workflow gate vars.ZGMINI_B_PUBLICATION_APPLY_ENABLED 이며 스케줄 0, approvals/publications 디렉터리 부재. repo 변수 실값은 조회 불가 | **SOURCE_MAIN_CI_PASS / D1 NOT_RUN**. 실제 B급 승인 manifest/별도 owner Issue·PC 이중 source 증거가 다음 필수 조건; 운영 원자료·DB·D1 쓰기 0건 |

| 2026-11-17 KST · QFR 게시기 10파일 원본 고정 준비 | **R4-02/R6-04**: 제어 B contract가 요구하는 앱 `main` 10파일의 raw UTF-8 SHA-256을 고정 commit `0a786bd69c7dc815d296143021473d8f6bf7a118` 기준 수집·검산. 해시 알고리즘은 알려진 벡터 2개와 과거 PC #1709 승인 파일 원문 해시 교차검증 PASS | 동일 파일 §6 목록, 제어 허용 목록 `tools/publication-contract.mjs`, GitHub 앱 SHA `0a786bd69c7dc815d296143021473d8f6bf7a118`. 실물 PC 운영 checkout 최근 재조회는 하지 않음 | **SOURCE_HASH_EVIDENCE_READY / B APPROVAL_MISSING**, D1 writes 0. NEXT: 운영 `config.source` 실시간 값과 manifest/owner 승인·feature flag 확인; 정확키 승인 후 단회 게시·remote readback |

| 2026-11-17 KST · 사용자 순서 변경 지적에 따른 82단계 진행률 정정 | **R1-01 자료 구분 단계 완료**, 계획의 단계 순서 유지. 이전 `71/82 현재 작업`·`11단계 남음` 보고는 무효화. R6-04 후행 소스·승인 조사와 실제 현재 순차 단계 분리. 82단계 계획서에 순차 승인·진행률 기준 추가 | 앱 `main=af2f963659f15e016a64be1132d4cdec9af0d9c6`, 제어 `main=40a0767ec48829360a0b47a2b37e499d59944a05`, W05 관측 HEAD `e6694ddbd4d01826d8802be355bc671b4e53cd8c`; 운영 PC 과거 [#1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709) 체크아웃 `7afe6b0bcaa74d622ada9190fdc9fcc7fd4d5f10` (live runtime source NOT_VERIFIED), Production exact SHA NOT_VERIFIED. 계획 규칙 커밋 `89ce90046ee453cdc95bab16b8ed638b963ca3e1` | **연속 확정 완료 1/82, 현재 2/82 R1-02**. 다음: 기존 운영 source·등록 작업·Runner 매핑 누락만 채워 R1-02 완료 증거 작성. 후행 미승인 QFR D1 변경 0건 |

| 2026-11-17 KST · 82단계 순차 규칙 최종 정합성 확인 | **계획을 순차 기준으로 복구하고 완료율 과장 정정:** R1-01 GitHub 소스 구분 DONE, 선행 첫 미완료 R1-02(2/82). 71/82·잔여 11개 표현 철회. 원래 82 ID·순서를 바꾸지 않음 | [실행계획서](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md) 규칙 변경 `89ce90046ee453cdc95bab16b8ed638b963ca3e1`, 최종 현재 작업 정합성 `5c618a2c19fe11a163edc083e80728a2be83e236`; [진행기록](EARNINGS_RECESSION_R1_R6_82_STEP_PROGRESS_20261116.md) 최초 진도 수정 `378af33507d7050ae5e2be2ca37e4e71f5883397` 및 요약 정정 `fdfc5ccab03f98d9462633c2a5c28f4b87b4789c` | **LAST PASS:** R1-01 원본 SHA 구분 기록. **FIRST UNFINISHED:** R1-02 source/Runner mapping. **NEXT:** R1-02의 빠진 등록·실행 증거만 수집, 이미 끝낸 QFR 소스/CI 반복 금지. 이번 운영 PC/원자료/D1/Cloudflare 쓰기 0 |

| 2026-11-17 01:05 KST · **2/82 R1-02 완료** | 실 PC 공통 매핑 완료. #1790 A 소스 후보 inventory는 truncated였으므로 #1794 승인 scoped 조회로 운영 sourceHead/config/checkpoint 일치 `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388` 증명. #1796 core-status A에서 Core·Korea Task XML 해시와 수집/Writer checkpoint, Runner seat 1 실측 확인. A operations allowlist·Runner Workflow 및 QFR/BLS/BEA/SEC/WPS 소스 역할·미설치 상태를 §7에 매핑 | [#1794](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1794) [Run #43902155135](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43902155135), [#1796](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1796) [Run #43903516218](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43903516218), #1790 Run 43901801863 (inconclusive inventory). 각 결과 JSON/TXT 원격 2/2 및 protected unchanged, PC/D1/provider writes=0. 제어 `main` operations+pc-job/B workflow, 등록 Task hashes Core dd81987c…·Korea 1797e5de… | **R1-02 DONE**; **연속 완료 2/82 ≈2.4%, 현재 3/82 R1-03**. LAST PASS 소스/Task/Runner mapping; FIRST UNFINISHED SQLite 원본 계보. 후행 QFR B effect 미승인 상태 보존. NEXT R1-03 기존 원자료 테이블·checkpoint·재조회 증거 매핑 |

| 2026-11-17 KST · **R1-03 완료** | 기존 SQLite 원본 저장 표 2개, QFR/BLS provider별 원문 SHA·PK·append/개정·저장 시각·readback과 BEA 제조업 독립 archive의 미검증 한계까지 §8 인계 완료 | QFR [R2 저장](EARNINGS_CENSUS_QFR_RAW_SQLITE_R2_20261027.md) + [R3 계산](EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_20261027.md), BLS [R3C 저장](EARNINGS_COMPANION_R3C_BLS_MANUAL_STORE_IMPLEMENTATION_20261027.md) + [R3D 계산](EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md), BEA [제조업 archive](EARNINGS_BEA_MANUFACTURING_PROFITS_R1_READONLY_20261028.md), 관련 소스 SQL 검증. 신규 원자료/DB/D1 쓰기 0 | 연속 DONE 3/82(3.7%), 현재 4/82 R1-04. 다음 BLS 기본 3→공개 5행 계보 |

| 2026-11-17 KST · 순차 현행 기록 일원화 | 계획서에 고정된 이전 현재 단계 `R1-02(2/82)`가 다음 작업자에게 최신 단계처럼 보이던 문서 정합성 문제를 수정. 82개 세부 계획·완료 기준/번호는 변경하지 않고 **현행 완료율·현재 단계·다음 실행은 이 지정 진행 기록 `0-A`만 정본**으로 명시 | [82단계 실행계획서](EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md) 변경 커밋 `46b0fc7efe8c5c74d2d2914e1a6debacb952d586` | 진행 기록 현행 **3/82 DONE·4/82 R1-04**, 작업 ID 82개/완료 기준 불변, PC/D1/Cloudflare 변경 없음. 다음: R1-04 BLS 3→5 계보 검증 |

| 2026-11-17 KST · **순차 R1-04(4/82) 종료** | BLS 3원천 WPSFD4/WPSFD41/PRS85006111 → 원시 지수·파생 YoY·공식 단위노동비용 YoY 정보성 총 5개 행 연결. 저장 PC 3 snapshot hash readback과 2026-10-27 공개 GET 5/5 READY를 현재 Worker D1 키/GET 소스와 §9에서 대조 | [BLS 저장 R3C](EARNINGS_COMPANION_R3C_BLS_MANUAL_STORE_IMPLEMENTATION_20261027.md), [저장 계산 R3D](EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md), [과거 공개 GET 확인](EARNINGS_BLS_SERVICE_PPI_WPSFD42_INTEGRATION_R1_20261027.md), `worker/earnings-companion-c-r4.mjs` main source. 이번 공급자·운영 SQLite/D1 쓰기 0 | **R1-04 DONE, 순차 누적 4/82(약 4.9%), 현재 R1-05(5/82)**. 과거 GET을 현재 READY로 표현하지 않고 WPSFD42 2행 미게시 유지 |

| 2026-11-17 KST · **순차 R1-05(5/82) 조사 종료** | BEA unit `A463RD3Q052SBEA`와 제조업 `N400RC1Q027SBEA`의 별도 Collector·CSV/meta 불변 원본 경로와 실제 PC 저장/미검증 경계를 §10에 구분. **앱 main BEA unit 구형 Publisher에 직접 fetch 1건 가능**·저장형 소스 PR #1183 미병합 확인, 제조업 PC 2026-10-28 capture 2파일 보고만 실증, 독립 archive SHA readback은 미완료 | [BEA 제조업 실제 PC 이력](EARNINGS_BEA_MANUFACTURING_PROFITS_R1_READONLY_20261028.md), [단위이익 저장형 PR #1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183)와 W05 `EARNINGS_BEA_UNIT_STORED_RAW_R1.mjs`. 운영 PC/SQLite/D1/provider 신규 쓰기 0 | **R1-05 인벤토리 DONE, 연속 5/82(약 6.1%), 다음 R1-06(6/82)**. BEA unit PC 실제 archive 확인 R3-08, 제조업 파일 SHA R3-11, 저장형 Publisher B R4-07 후행 미완료 |

### 필수 기록 종료 규칙

1. 작업을 수행했다면 **보고 전에 이 진행 기록에 수행 ID·커밋/PR/Issue/Run·실제 PASS/FAIL·당시 상태·남은 필수 실행을 먼저 반영**한다. 로그 반영 불가능하면 `기록 미완료`로 보고한다.
2. 새 작업 결과는 바로 위 최신 작업 원장에 추가하고, 해당 **82개 ID 상태와 근거를 같은 커밋에서 갱신**한다. 기존 DONE·영수증을 삭제하거나 소스/CI를 운영 DONE으로 승격시키지 않는다.
3. 새 테스트·PR·선별 main 반영은 설치/게시 완료가 아니다. QFR 관련 먼저 해야 할 실행은 B 승인 exact-key effect/실설치 확인→기존 저장 원본 기반 QFR D1 1키 게시→독립 D1 readback→Production API/UI 확인이다.
4. 종료 보고에는 **W05 전담 브랜치의 실제 최신 HEAD와 이 파일 GitHub 재조회 여부**를 명시한다. 자동화나 다른 채팅이 문서 변경을 알아서 받아간다고 가정하지 않는다.

## 6. QFR 정확키 B 원본 의존성 해시 — 읽기 전용 증거

**성격:** 제어 `tools/publication-contract.mjs`의 `census-qfr-margin-once` 10파일 허용목록을 앱 `main`의 고정 SHA에서 재조회해 계산한 raw UTF-8 **SHA-256 자료**. **승인 manifest·게시 requestId·owner 승인 댓글을 생성한 것이 아니며, D1 쓰기 권한은 0이다.**

- 출처: `ansqhd5774-Choi/zgmini` / 고정 Git commit `0a786bd69c7dc815d296143021473d8f6bf7a118` (이 시점 `main`으로 확인). 향후 `main`이 이동하면 현재 HEAD로 다시 승인 고정해야 한다.
- 독립 해시 검증: SHA-256 자체 알려진 빈 문자열/`abc` 기준 통과; 제어 GitHub `approvals/writer-preimage/w05-qfr-publisher-6-readonly-20261116.json` 실제 바이트 해시 결과 `842a337a41f28eb08fd40d97154a7a0045ebf2142ba44e2c9a94754c8839d85c`가 PC #1709에서 사용한 승인 원문 해시와 일치.
- 정확 공개 키: `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1`; 승인 operation: `census-qfr-margin-once`; 저장 원본만 사용(`STORED_SQLITE_ONLY`), 허용 D1 key 최대 1개, 자동 재시도 0회.

| 승인 필요 게시기 파일(고정 앱 commit) | SHA-256 |
|---|---|
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R1_READONLY.mjs` | `5286287be8773dd8d2d4bdc943e7ee40131d88669c1ec981f4be68a34025879a` |
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs` | `9d3cd0296d41baa9d6deb12897b164fe13115eada4df17ed14196d89ed9273d0` |
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs` | `4119bba808819a71f58b6d76ccb3872b5151c7c80df666b483f4f871bc075933` |
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.mjs` | `59e4303e2135bfad20b9e51c6e48763be655fad5d2f00eb1e9d50b5cb0e3c002` |
| `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs` | `7b08d799dfce2c5ab720dd69791d727834c2c5c83ed365c39fd89cd3c7853005` |
| `scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs` | `db4c14f28c7eb196136e431cc51680542f8846e6b183e0aa7d5b3307b27fcb5b` |
| `scripts/pc-writer/d1.mjs` | `267fb175386fa007bd74b255d922fba9ee6fe71ffe953f94970beb8ba9d9ff87` |
| `scripts/pc-writer/d1-transient.mjs` | `f912c335675481f8646380feaebb6241ec0d877b78dbd6fa165e208fdc6d457e` |
| `scripts/pc-writer/d1-diagnostics.mjs` | `2e9ea54661c51d86798800e532edb10c6796694d3049844ef8b283b7ad6dfe5f` |
| `worker/earnings-companion-c-qfr-r1.mjs` | `a66b60a751b9ec9a0a6379027c2b4785c20a4c4a693be72a9398dbc0da32dbd7` |

**실행 전 남은 인증:** `publisherSha`는 위 Git SHA로 후보 고정만 가능하다. `operationalSha`는 별도 **현재 PC config.source/operational checkout clean HEAD 실측** 후 확정(마지막 확인 #1709의 `7afe6b0b...`를 현재라고 간주 금지). `requestId`·승인용 Issue/owner 정확 댓글·`approvals/publications/<requestId>.json`·활성 변수의 실제 값은 미확정. 부재 시 `AUTOMATION_BLOCKED`로 보존하고 미승인 게시를 시도하지 않는다.

## 7. R1-02 운영 Source·작업·Runner 매핑 (2026-11-17 01:05 KST)

**R1-02 완료 판정의 범위:** 실제 등록된 공통 A 작업·Task·Runner/승인 PC 체크아웃, W05 수집·저장·계산·게시 코드의 **소스 역할과 운영 미설치 여부**를 구분한다. 이 표는 원자료 수집 성공·모든 Publisher 설치·B 효과 승인·Core 실행 중 PID 증명 또는 Production 완료를 선언하지 않는다(각각 R3/R4/R6 후속 단계).

| 대상 | Source·운영 경로/책임 | 확인 근거와 실제 상태 |
|---|---|---|
| PC 승인 소스와 체크아웃 | `E:\ZGmini\projects\zgmini-earnings-history-pc-release`; PC `E:\ZGmini\data\pc-writer\config.json`의 `source` | [#1794](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1794) / Run 43902155135: `sourceHead=approvedConfigSource=checkpointSource=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`, `sourceIdentityConsistent=true`; 운영 Core PID의 실행 SHA는 별도 `NOT_VERIFIED` |
| Windows 실제 PC Core·Korea Task | `ZGMINI-PC-Local-Core` · `ZGMINI-PC-Local-Korea` | [#1796](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1796) / Run 43903516218: 작업 XML 해시 각각 `dd81987c7efa4b1e343af30329a580613bb920dec89c1aa7a436ef935f0bb028` · `1797e5def9fc92551132ca69f60bb5320bb346c687988be3e4ff3eb76ef5fdc1`. 이란 R13은 `APPROVED_RETIRED_ABSENT`, 복원 금지 |
| 공통 Core 저장·계산·Writer | 운영 저장 원장 `local-collection-last-run.json`, `local-cycle-last-run.json`, `local-writer-last-run.json` | #1796 관측 시각 UTC 2026-11-16 15:57:45 / 16:02:25 / 16:00:58 각각 `COMPLETE` / `COMPLETE` / `VERIFIED`. *Core 일반 원장*이며 개별 QFR/BEA/BLS 원본 저장·D1 게시는 별도 검증 필요 |
| 공통 A PC 작업·Runner | 제어 `config/operations.json` (`seats=6`, `mutationsEnabled=false`) → `.github/workflows/pc-job.yml` `[self-hosted,Windows,X64,zgmini-pc-control]` → 설치 Controller | 승인된 `pc-source-origin-readonly` #1790 seat 1, `writer-install-preimage-readonly` #1794 seat 2, `core-status` #1796 seat 1 모두 실제 Windows PASS. **6명 전원 유휴/Online은 필요 Gate 아님**, A는 D1 쓰기 금지 |
| B 독립 게시 lane | 제어 `.github/workflows/pc-publication-b.yml` → `tools/publication-preflight.mjs`·`publication-executor.mjs` → 앱 `main` 게시기 + 별도 운영 checkout | 제어 PR #1762 소스 `main` 병합·Node CI 22/22 PASS. `vars.ZGMINI_B_PUBLICATION_APPLY_ENABLED=='true'`·`approvals/publications/<requestId>.json` 및 owner 승인 Issue 댓글 필수. **현재 승인 manifest 부재/활성 변수 UNKNOWN/실제 B 실행 없음**, 공통 Core 정규 Task에 추가 등록하지 않음 |
| Census QFR | 공식 ZIP read `EARNINGS_CENSUS_QFR_R1_READONLY.mjs` → SQLite append `...R2_SQLITE_APPEND.mjs` → stored calc `...R3_STORED_PREVIEW_READONLY.mjs` → pinned D1 `...R4_D1_ONCE.mjs` → `worker/earnings-companion-c-qfr-r1.mjs` | 앱 `main` QFR 코드 준비, PR #1175 3-pin main 병합. 운영 checkout #1794 범위 6파일 중 QFR 게시 관련 5개 ABSENT/d1.mjs만 PRESENT, **main Publisher와 운영 checkout은 별도**; 실제 QFR D1 게시·설치 아님 |
| BLS 기본 3종/서비스 1종 | W05 `EARNINGS_R3C_BLS_STORE_ONCE.mjs`(Collector 개발), 앱 `main` `EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs`·`EARNINGS_R4_C_D1_DUAL_SOURCE_ONCE.mjs`(계산/게시), `worker/earnings-companion-c-r4.mjs`(Reader). WPSFD42 분리 Writer는 W05 브랜치에만 존재 | 수집기 `R3C`는 앱 `main` 미등록, 운영 자동 실행·Collector 설치 추정 금지; 기본 5행 기존 근거는 R1-04/R3-03에서 재사용. WPSFD42 새 2행 저장·실제 게시 R3-04/R6-09 미완료 |
| BEA 단위이익/제조업 | 앱 `main` 기존 `EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs`, W05 저장형 보강 `EARNINGS_BEA_UNIT_STORED_RAW_R1.mjs`·분리 PR #1183; 제조업 W05 `EARNINGS_BEA_MFG_PROFIT_R5_APPEND_ONLY_CAPTURE.mjs`, `...R6_D1_ONE_SHOT.mjs` 및 Worker | 저장 원본 실제 capture·적격성·Publisher 최신 `main` 배포는 각각 별도 미검증. BEA 단위이익 PR #1183은 소스/CI만 준비, main/PC/D1 완료 아님 |
| SEC/M3/MTIS 조건부 | SEC 기존 `lib/market-score/sec-earnings-e1-r4-provider.mjs` 및 E1/R5 전용 Reader; Census M3/MTIS는 W05 기준 **정확한 C 정보성 Collector/게시 실등록 증거 없음** | 승인 공급자·데이터/권리 조건을 선확인하는 R1-06/R1-07/R2 후속 후보. **코드가 있을 수 있다는 사실을 실제 등록 자동 수집으로 추정 금지**, 조건부 HOLD 가능 |

**실제 조회 결과 보존:** [#1790](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1790) Run 43901801863는 `candidateCount=0`, `inventoryTruncated=true`로 개별 checkout 연결 결론 불가. 이에 대한 scoped A [#1794](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1794) Run 43902155135가 `sourceHead=config.source=checkpointSource`를 검증했다. Core 조회 [#1796](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1796) Run 43903516218은 일반 checkpoint/등록 Task를 별도 확인했으며 당시 `lockPresent=true`는 임의 Core 중단·잠금 해제 사유가 아니다. 세 Run 모두 고유 requestId, 실제 Windows Actions PASS·원격 JSON/TXT 각각 2/2, `providerCalls=operationalWrites=d1Writes=0`·`protectedStateUnchanged=true`.

**다음 필수 실행:** **R1-03(3/82)** 보존된 PC 원자료·SQLite schema/checkpoint/append-only/readback 경로의 기존 실증 증거를 연결하고 실제 미대조 범위만 추가 확인한다. 뒤쪽 R6-04 QFR B manifest 승인 및 게시 미완료는 별도 유지.

## 8. R1-03 SQLite 원본·checkpoint·append-only 증거

| 분류 | 저장·보존/조회 방식 | 기존 실제 PC 검증 및 경계 |
|---|---|---|
| **QFR** | `E:\ZGmini\data\pc-writer\storage\core.sqlite`의 `api_history_chunks_v1` 및 `api_history_snapshots_v1`. PK는 각각 `provider,dataset,chunk_sha256` 및 `provider,dataset,snapshot_sha256`. 동일 SHA `ON CONFLICT ... DO NOTHING`, 개정 내용은 신규 SHA 행, `BEGIN IMMEDIATE`→COMMIT/ROLLBACK. R3는 `readOnly:true`, `PRAGMA query_only=ON` + 원문 ZIP/청크/snapshot/provenance 해시 검증 | [실 PC R2 저장](EARNINGS_CENSUS_QFR_RAW_SQLITE_R2_20261027.md): `CHUNKS_INSERTED=1`, `SNAPSHOTS_INSERTED=1`, `PASS_QFR_SQLITE_APPEND_READBACK`, ZIP SHA `232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654`. [PC R3 stored calc](EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_20261027.md) `STORED_SNAPSHOTS_VERIFIED=1`, `SOURCE_STORED_AT=1793112733108`, 저장 자료만 재검산 PASS |
| **BLS 기본 3종** | 동일 DB·2테이블의 `provider='BLS'` 별도 namespace, 응답 내용 SHA 기반 청크/스냅샷 3개 atomic append, 수정본은 신규 SHA, FRED 원장 불변. R3D read-only DB·해시·기간 검증 | [실 PC R3C](EARNINGS_COMPANION_R3C_BLS_MANUAL_STORE_IMPLEMENTATION_20261027.md): `PASS_R3C_MANUAL_BLS_PERSISTED`, 청크/스냅샷 3/3, `SERIES_READBACK_VERIFIED=3`, COMMIT YES. [R3D](EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md): `PASS_R3D_STORED_ONLY_CALCULATION` |
| **BEA 제조업** | `raw/earnings-recession/bea-manufacturing-profits-r5/<sourceVersion>.csv` + `.json` 별도 불변 원본. 기존 SQLite schema/원자료 불변. SQLite `market_input_batches_v1.body`의 `gzip:` 압축 가능성 고려 | [과거 PC inventory·보관](EARNINGS_BEA_MANUFACTURING_PROFITS_R1_READONLY_20261028.md): core/history 각 39/5테이블 제한 검사, `APPEND_ONLY_SOURCE_STORED` 파일 2개 저장 보고. **독립 원문 SHA readback 아직 미완료** |
| **다른 후보** | BEA unit 불변 CSV archive, WPSFD42 신규 BLS dataset, Census M3/MTIS·SEC 적격성/저장 여부는 후속 단계 별도 판정 | 코드 존재/시뮬레이션은 실제 PC 저장·D1 게시 증거가 아님 |

**시각 구분:** 원본 `first_seen_at`, snapshot `retrieved_at`, 파생 checkpoint `sourceStoredAt`, D1 게시 `stored_at` 및 공식 관측/발표일을 혼동하지 않는다. Core #1796 일반 Collection/Writer 체크포인트는 개별 QFR/BLS 신규 관측의 증명이 아니다. 이 R1-03은 **구조·경로·보존·기존 원장 판정 단계**이며, 원자료 재수집/재저장 실증을 반복하지 않는다.

## 9. R1-04 기본 BLS 3원천 → 정보성 5행 · D1/GET 계보 (2026-11-17 확인)

| 원본 시계열 | PC 저장 원본 기간·개수 (2026-10-27 근거) | 파생 정보성 행 |
|---|---|---|
| \`WPSFD4\` 최종수요 계절조정 PPI | 2025-01~2026-09 월간 21개월; 최신 당시 159.780 | \`bls_ppi_final_demand_yoy_sa\`(동일월 전년비 자체 파생 6.346301%), \`bls_ppi_final_demand_index\`(지수) |
| \`WPSFD41\` 최종수요 재화 PPI | 2025-01~2026-09 월간 21개월; 최신 당시 162.341 | \`bls_ppi_goods_yoy_sa\`(동일월 전년비 자체 파생 9.772194%), \`bls_ppi_goods_index\`(지수) |
| \`PRS85006111\` 비농업 단위노동비용 | 2025-Q1~2026-Q2 분기 6개; 최신 당시 +1.4% | \`bls_unit_labor_cost_yoy\`(공급자 원시 YoY 그대로 1행, 재변환 금지) |

**PC 실물 근거:** [BLS R3-C 1회 수동 저장](EARNINGS_COMPANION_R3C_BLS_MANUAL_STORE_IMPLEMENTATION_20261027.md)은 당시 \`CHUNKS_INSERTED=3/SNAPSHOTS_INSERTED=3/SERIES_READBACK_VERIFIED=3\`, \`DB_TRANSACTION_COMMITTED=YES\`. [R3-D 독립 저장자료 계산](EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md)은 \`SNAPSHOTS_HASH_VERIFIED=3\`, \`DATA_COHORT_CONSISTENT=YES\`, \`API_REQUESTS=0/SQLITE_WRITES=0/D1_WRITES=0\`였다. 공급자 공식 vintage/수정 횟수는 \`UNDETERMINED\`; 자체 산출된 계절조정 YoY와 BLS 비계절조정 공식 YoY를 동일 계열인 것처럼 주장하지 않는다.

**게시·API 계보:** [기본 C Worker \`main\`](https://github.com/ansqhd5774-Choi/zgmini/blob/main/worker/earnings-companion-c-r4.mjs)는 D1 \`market_public_snapshots_v1\` 중 \`snapshot_key='detail:earnings-recession-indicators:v1'\`만 GET/HEAD로 읽고, 경로는 \`/api/earnings-recession-indicators\`. [2026-10-27 기존 서비스 5행 GET 검증](EARNINGS_BLS_SERVICE_PPI_WPSFD42_INTEGRATION_R1_20261027.md)에서 **HTTP 200·5/5 READY**, 당시 \`sourceStoredAt=1793034173996\` 기록. 현재 GET·생산 배포 SHA·방문 화면은 이 단계에서 새로 실측하지 않았으므로 **현재도 READY라고 추정하지 않는다**. 별도 \`WPSFD42\` 서비스 키/2행은 후행 R2-09/R3-04/R4-09~10/R5-05에 남긴다.

**R1-04 판정:** 3개 공급 원본→5개 정보행의 산식/단위/공개 exact key/GET 근거를 연결해 \`DONE\`. 새로운 공급자 호출·PC DB/D1 쓰기 0. 다음 순차 R1-05(5/82): BEA 단위이익·제조업 raw CSV/메타 저장 여부.


## 10. R1-05 BEA 단위이익·제조업 저장·Collector 인벤토리 (2026-11-17)

**R1-05는 수집기·원본 위치·실제 관측 증거와 빈 곳을 구별하는 조사 단계다.** R3-08/R3-11에 명시된 PC 원본 실재·SHA 재조회 성공을 이 조사만으로 대체하지 않는다.

| 대상 | 공급자·원본/소스 계약 | PC 관측·현재 상태 |
|---|---|---|
| BEA **단위이익** | 원천 BEA NIPA unit profit, FRED CSV 배포 \`A463RD3Q052SBEA\`. W05 브랜치 \`EARNINGS_BEA_UNIT_STORED_RAW_R1.mjs\`의 \`captureBeaUnitSourceOnce\`는 **승인된 Collector가 호출할 때만** \`E:\ZGmini\data\pc-writer\raw\earnings-bea-unit-profit-r1\<sourceSha>.csv/.json\`에 원문/메타를 단회 생성·SHA 재조회. 호출 전에는 네트워크/쓰기 없음 | PC 실제 해당 원문 보관 증거 **NOT_VERIFIED**. 과거 [제조업 비교 문서](EARNINGS_BEA_MANUFACTURING_PROFITS_R1_READONLY_20261028.md)의 2026-10-28 공개 BEA unit API는 \`STORED_PROJECTION_PENDING\`. 이 오래된 상태를 오늘의 절대 미존재 증명으로 간주하지 않음 |
| BEA unit **구형 Publisher** | 앱 \`main\`의 \`scripts/pc-writer/EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs\`는 **직접 공급자 fetch 호출 가능**. W05 전담 브랜치는 \`readBeaUnitArchivedSource\`로만 읽는 분리판과 hash-safe archive helper 보유; [Draft PR #1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183) 소스/Node CI 완료 | **main 구형/전담 소스 새판/실 PC 설치**를 반드시 구분. 이번 R1-05가 새판을 운영 설치·D1 게시했다고 주장하지 않음. 후행 R3-08~10/R4-07에서 소스·PC 실제 archive 및 계산 중 providerCalls=0 검증 |
| BEA **제조업 기업이익** | BEA NIPA Table 6.16D \`N400RC\` / FRED CSV \`N400RC1Q027SBEA\`, 십억 USD SAAR·분기, 기존 점수 S6와 별도 원본. W05 \`EARNINGS_BEA_MFG_PROFIT_R5_APPEND_ONLY_CAPTURE.mjs\`는 \`--dry-run\`에서 \`DRY_RUN_NO_NETWORK/sourceWrites=0\`, \`--execute\`에서 \`raw/earnings-recession/bea-manufacturing-profits-r5/<sourceVersion>.csv/.json\`에 불변 저장 | [2026-10-28 실PC 사용자 제공 보고](EARNINGS_BEA_MANUFACTURING_PROFITS_R1_READONLY_20261028.md) \`APPEND_ONLY_SOURCE_STORED\`, \`sourceWrites=2/sqliteWrites=0/d1Writes=0\`, \`sourceVersion=ebaf93f7a1e526cabae22388ed96d280d94eb58fdd4ddf484325bf651c59bf9b\`. **실제 저장된 2파일을 별도 SHA readback 하지는 않았음**. R3-11의 실제 PC 불변 아카이브 reader 검증 필수 |

**출처 적격성 차이:** BEA 제조업 N400RC는 세후 마진이 아니라 IVA 보정 기업이익이다. BEA unit A463RD3Q052SBEA도 본 제조업 지표와 서로 다른 계열이며, 과거 기존 E1-R5 점수·S6·QFR·BLS 기본 5행에 합산하지 않는다. \`SOURCE_STORED\`·\`DRY_RUN\`·\`SOURCE_READBACK_NOT_RUN\`·\`D1_NOT_RUN\`은 각각 다른 판정이다.

**R1-05 조사 완료 판정:** 기존 BEA 2원천의 Collector·원본 후보·실제 PC 보고·미확인 범위를 구분해 **인벤토리 DONE**. Unit의 실제 PC 원본 수집·저장 및 제조업 archive SHA 재조회는 **후행 R3-08/R3-11 미완료**, 실제 D1/Production 미완료. 다음 순차 R1-06(6/82).


## 11. R1-06 부분 조사 — 2026-11-17 KST

- **QFR (기존 PASS 재사용):** `scripts/pc-writer/EARNINGS_CENSUS_QFR_R1_READONLY.mjs`의 공식 `https://www.census.gov/econ_getzippedfile/?programCode=QFR` ZIP·`QFR-mf.csv` 파서, `EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs`의 `api_history_chunks_v1`/`api_history_snapshots_v1` 원문 ZIP base64 및 SHA 보존 확인. 기존 운영 원장 ZIP SHA `232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654`, R2 저장·R3 저장자료 계산 PASS (§8). 신규 공급자 호출 0.
- **M3 (소스 구분):** 앱 `main`의 [`scripts/pc-writer/inflation-causal-candidate-census-m3.mjs`](https://github.com/ansqhd5774-Choi/zgmini/blob/main/scripts/pc-writer/inflation-causal-candidate-census-m3.mjs) Git blob `c5649283bbe071fdf153d4238b233b65c8aa39b4`는 공식 Census EITS `/data/timeseries/eits/m3`를 사용하지만 `MTM/TI` **제조업 총재고**를 `inflation-causal-candidates-r1/census-m3-manufacturing-inventories.json`에 보존하는 **물가 담당 후보**이다. 실적 침체용 신규주문·출하 코드/원자료 저장을 증명하지 않으며 다른 담당의 Collector를 임의 재사용/변경하지 않는다. W05 전용 브랜치 동일 경로는 NOT_FOUND, 앱 main의 별도 소스만 확인.
- **MTIS:** 이번 GitHub 저장소 코드 검색 `MTIS`는 0건. 이는 검색 인덱스 범위의 결과일 뿐 운영 PC·다른 저장소·별칭에 해당 Collector/원자료가 없다는 증명은 아니다. 승인된 실적 침체 전용 코드·저장 경로·SHA는 `NOT_VERIFIED`.
- **판정:** R1-06 `PARTIAL_SOURCE`, 연속 `5/82 DONE(6.1%)` 유지, 현재 `6/82`. PC/SQLite/D1/Production 신규 실행 0. LAST PASS=QFR 기존 ZIP/SQLite 저장 검증; FIRST UNFINISHED=M3 신규주문·출하 및 MTIS 전용 Collector/저장 계보 미확인.
- **다음 단일 실행:** 기존 제어/기능 저장소에서 M3 신규주문·출하 및 MTIS의 별칭·공식 데이터 계약·기등록 승인 Collector 경로를 좁게 조사해 각각 `FOUND/HOLD/NOT_VERIFIED`와 저장 위치·원본 SHA·재수집 필요 여부를 확정한다. 별도 승인 없는 신규 수집·게시 금지.

- **2026-11-17 03:03 KST 추가 별칭 교차검사:** 앱 `main`의 `lib/market-score/growth-r2-census-request.mjs` (blob `13cbc4634160e085aa6fef0895b5804c432e407e`)는 Census `/data/timeseries/eits/m3` 및 `/bfs`에 한정된 Growth 공통 **GET 래퍼**이며 실적 침체 C의 신규주문·출하 원본 저장기 증거가 아니다. `inflation-causal-candidate-core-bridge.mjs` (blob `e62c6930d56c24c1cbb77d48f4c838bcc5319a99`)는 `census` 그룹을 `collectCensusM3Inventories`에 연결하고 저장 파일을 `inflation-causal-candidates-r1/census-m3-manufacturing-inventories.json`으로 지정한다. 실제 `inflation-causal-candidate-census-m3.mjs` (blob `c5649283bbe071fdf153d4238b233b65c8aa39b4`)는 `MTM/TI`, `seasonally_adj=yes`로 재고만 수집하고 같은 물가 전용 디렉터리에 raw 연도별 응답을 보존하도록 구현되어 있다. **이는 구현 경로일 뿐 실제 운영 PC 파일 존재/SHA readback을 입증하지 않는다.** 기능·제어 저장소의 GitHub 기본 브랜치 코드 검색 `MTIS`는 결과 0건, 제조업 신규주문·출하 문구는 시장 발표 일정 분류와 물가 Core 브리지에만 연결되었고 C 전용 Collector는 미확인. 따라서 QFR=기존 저장 PASS, M3 재고=타 담당 소스 확인/C 신규주문·출하 저장 `NOT_VERIFIED`, MTIS=C Collector·저장 `NOT_VERIFIED`; R1-06 `PARTIAL_SOURCE` 유지. 승인된 공급자 호출·PC/D1 쓰기 0. 다음은 기존 승인 운영 인벤토리에서 M3/MTIS 별칭·원본 저장 경로 유무를 좁게 확인하거나 적격성 근거를 확보해 `HOLD`로 판정한다.


### 2026-11-17 R1-06 종료 판정 및 R1-07 인계

- 기존 R1-06 QFR ZIP/SQLite 저장 증거 재사용. M3 신규주문·출하와 MTIS는 **조건부 HOLD/NOT_VERIFIED**: 실제 C 전용 Collector, 운영 저장 위치 및 SHA 증거 미확보. `MTM/TI` 물가 재고 수집을 신규주문·출하로 오인하지 않음.
- 제어 `main` [`config/operations.json`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/config/operations.json) blob `0197f4814d9cc0ff051559b9848a2df9fd0d86b2`에서 `m3`, `mtis`, `qfr`, `earnings`, `census` 이름의 전용 operation 항목 미발견. 범용 A 경로 또는 실제 운영 PC 등록 부재까지 단정하지 않음. 기능·제어 기본 브랜치 검색 `MTIS` 및 `inventories-to-sales` 일치 파일 0개. 조건부 후보의 원문 SHA는 `NOT_VERIFIED`이며 승인 없는 재수집 0.
- **R1-06 조사 기준 DONE**: QFR 기존 PASS, M3·MTIS는 독립 후보 HOLD와 미확인 범위를 명시해 각 원천의 저장/재수집 필요성을 판정. 후속 적격성 R2-06/07 및 실제 PC 저장 R3-13/14는 미완료. **연속 완료 6/82(7.3%), 현재 R1-07(7/82)**.
- 이번 회차 신규 기능 코드·PC·D1·Production 실적 0. **다음 단일 작업 R1-07**: SEC CompanyFacts/XBRL 기존 수집 코드·종목 매핑·운영 저장 위치를 원본 증거와 대조해 `FOUND/HOLD/NOT_VERIFIED`로 판정.


## 12. R1-07 SEC CompanyFacts/XBRL 기존 경로 조사 — 2026-11-17 04:55 KST

- **E1-R4 기존 점수 경로(별도 보호):** `lib/market-score/sec-earnings-e1-r4-provider.mjs` (blob `03538cbbd84011b78a48d6d9a94f053034a8098d`)는 SEC `https://data.sec.gov/api/xbrl/frames`의 `us-gaap` 분기 frame와 Wikipedia S&P 500 구성종목의 CIK(10자리 zero-padding)를 연결한다. `collectEarningsE1R4ToStore`는 공급자 수집·D1 저장을 분리하고 `readEarningsE1R4StoredScore`는 저장 D1만 읽는다. 저장 스키마는 `lib/market-score/earnings-e1-r3-d1-store.mjs` (blob `e1d2e2598df26db07c704bd6740d4da394b4c76a`)의 `market_score_earnings_e1_r3_current_v1/history_v1/universe_v1/runs_v1/lock_v1`. **CompanyFacts 파일 수집과 동일 경로가 아니며 E1-R4 4요소 산식 변경 금지.**
- **E1-R5 연구용 CompanyFacts 후보:** `scripts/pc-writer/earnings-r5-official-refresh-r1.mjs` (blob `bbe9f5e5500e77b2263b3a13baf5fea87c44774b`)는 SEC 공식 `companyfacts.zip`을 입력으로 `storage/core.sqlite`의 기존 universe CIK를 read-only 조회하여 `manual-input/e1-r5/incoming/companyfacts/CIK##########.json`으로 선별 staging하는 코드. `researchOnly=true`, `productionActivation=false`, 기본 `DRY_RUN_NO_NETWORK`; `--execute`는 실제 다운로드/로컬 파일 변경 가능하므로 승인 없는 실행 금지. `scripts/pc-writer/earnings-r5-g4-pit-ledger-r1.mjs` (blob `282cc354b8f79eddf1f0c5939df120e84412dbd1`)는 같은 디렉터리의 CompanyFacts를 읽어 연구용 PIT 기록에 사용한다. `lib/market-score/earnings-e1-r5-input-contract.mjs` (blob `98dc56527c3522fcbc34317f0af1696f99d1e1a2`)는 CIK 및 SEC CompanyFacts 문서 검증 계약을 제공한다.
- **판정:** R1-07은 기존 구현·CIK 매핑·저장 경로와 연구/Production 구분을 조사하는 단계이므로 `DONE`. 그러나 CompanyFacts 실 PC ZIP/JSON 존재·SHA readback, 승인 Collector 설치·운영 source SHA 및 SEC C 정보성 지표 적격성은 `NOT_VERIFIED/HOLD`; R2-10/11, R3-15에 이관. GitHub 소스 발견만으로 자동 수집·D1 게시·운영 완료를 주장하지 않는다. **신규 기능 코드·PC 수집·D1/Production 0건.**
- **LAST PASS:** R1-07 소스·CIK·저장 경로 인벤토리. **FIRST UNFINISHED:** R1-08 D1 키·Reader·Writer 게시 계보. **NEXT:** 기존 C 정확키와 A/B 분리 및 저장·GET·게시 증거를 키별 매핑; 신규 D1 조회 권한 우회 금지.

### 2026-11-17 06:03 KST — R1-08 Worker GET·D1 정확키 소스 매핑 (부분 완료)

- **실제 확인한 W05 브랜치 파일:** `worker/earnings-companion-c-r4.mjs` (blob `d8df9f1c`), `worker/earnings-companion-c-qfr-r1.mjs` (`c9d8679e`), `worker/earnings-bea-unit-profit-r1.mjs` (`3cf1b317`), `worker/earnings-bea-manufacturing-profit-r1.mjs` (`5afd165d`), `worker/candidate-r52.ts` (`a3d78a30`). 소스 검색 결과가 아니라 **지정 브랜치 파일 본문**에서 export와 GET 분기를 확인.
- 기본 BLS: `detail:earnings-recession-indicators:v1` → `/api/earnings-recession-indicators` → `readEarningsCompanionResponse`; 서비스 PPI는 동일 Reader의 별도 `EARNINGS_C_SERVICE_SNAPSHOT_KEY`를 조회하는 합성 경로. 정확한 서비스 키 문자열 및 Writer/게시 영수증은 후속 확인 필요.
- QFR: `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1` → `/api/earnings-recession-census-qfr-margin` → `readQfrCompanionResponse`; 코드에 `READBACK_VERIFIED` 반환 분기 존재하나 **운영 D1 실행 증거 아님**.
- BEA 단위이익: `detail:earnings-bea-unit-profit:v1` → `/api/earnings-recession-bea-unit-profit` → `readBeaUnitResponse`.
- BEA 제조업: `detail:earnings-bea-manufacturing-profit:r1` → `/api/earnings-recession-bea-manufacturing-profit` → `readBeaMfgResponse`.
- `worker/candidate-r52.ts`에서 위 네 GET route의 Reader 분기 확인. **LAST PASS:** 지정 브랜치 정확키/GET 정적 계약 4군 매핑. **FIRST UNVERIFIED:** 서비스 PPI exact key·각 Writer 승인 manifest/실제 운영 D1 row·stored_at·Production 배포 SHA 및 현재 GET 응답. 소스 연결을 게시 완료로 계산하지 않음.
- 신규 운영 PC/D1/Production 실행 **0건**. R1-08은 `PARTIAL_SOURCE` 유지, 7/82(8.5%) 불변. **다음 한 작업:** 서비스 PPI 정확키 및 네 군 Writer 파일/승인 게시 영수증의 실제 키별 대응을 완료해 R1-08 완료 기준을 판정한다. 운영 권한 없는 SELECT/쓰기 수행 금지.


## 13. 2026-11-17 07:02 KST — R1-08 정보성 C D1/Writer/GET 인벤토리 종료

| C 정보성 지표 | D1 `market_public_snapshots_v1.snapshot_key` | 승인 후보 Writer 소스 | GET Reader/라우트 | 운영 판정 |
|---|---|---|---|---|
| BLS 기본 5행 | `detail:earnings-recession-indicators:v1` | `EARNINGS_R4_C_D1_DUAL_SOURCE_ONCE.mjs` | `readEarningsCompanionResponse` / `/api/earnings-recession-indicators` | 과거 2026-10-27 GET 200/5 READY 증거만; 현재 D1 row/stored_at/deployment `UNVERIFIED` |
| BLS 서비스 WPSFD42 2행 | `detail:earnings-recession-indicators:bls-wpsfd42:v1` | `EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs` | 동일 Reader의 서비스 별도 키 합성 / `/api/earnings-recession-indicators` | 전용 Writer는 `READ_ONLY_PREFLIGHT`/명시 apply 구분, 실제 게시 `UNVERIFIED` |
| Census QFR | `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1` | `EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs` | `readQfrCompanionResponse` / `/api/earnings-recession-census-qfr-margin` | 3핀 소스 검증과 운영 승인 별개; D1 `UNVERIFIED` |
| BEA 단위이익 | `detail:earnings-bea-unit-profit:v1` | `EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs` | `readBeaUnitResponse` / `/api/earnings-recession-bea-unit-profit` | 소스 분리판/기존 main/PC 설치 구분; D1 `UNVERIFIED` |
| BEA 제조업 | `detail:earnings-bea-manufacturing-profit:r1` | `EARNINGS_BEA_MFG_PROFIT_R6_D1_ONE_SHOT.mjs` | `readBeaMfgResponse` / `/api/earnings-recession-bea-manufacturing-profit` | 원문 archive SHA readback 및 D1 `UNVERIFIED` |

**R1-08 조사 완료 기준:** 5개 공개 정확키, 해당 Writer 소스, Reader 경로와 현재 미검증 게시/Production 상태를 **각각 분리 기록**했다. `READBACK_VERIFIED` 문자열은 코드 분기이며 실제 D1 인증 영수증이 아니다. 운영 승인 manifest·requestId·D1 저장 행·stored_at·실제 Production 배포 SHA·현행 HTTP/UI는 모두 `NOT_VERIFIED`; 승인 없는 D1 조회/게시 실행 0. 이는 **조사 DONE**이지 R4 게시 또는 R6 종단 DONE이 아니다. 기존 별도 5키 D1 인증 동치 0/5 UNVERIFIED는 유지한다.

**LAST PASS:** R1-08 지정 브랜치의 5개 Writer/Reader 정확키 계약 매핑. **FIRST UNFINISHED:** R1-09 A/B/C API/UI 계약 경계 정밀 조사. **다음 단일 실행:** R1-09에서 E1-R4 점수 4요소·기업실적 12대 도메인·정보성 C의 라우트/데이터/화면 소유권을 실제 코드에 대조하고 변경 금지 범위를 확정한다. 신규 소스 수정·PC/DB/D1/배포 실행 0.

| 2026-11-17 08시 KST · W05 | **R1-09 부분 진전:** `page.tsx`→`earnings-risk-only-panel.tsx`의 A 점수·C 정보성 API 조회를 소스상 분리 확인. A 4요소 계산 변경 없음. B 12대 기업실적 별도 UI/API 경계는 미완료, Production 미검증 | 전담 브랜치 `app/earnings-recession/page.tsx` blob `f24ff87cd35c25f98f5e85445ae60da6829a74df`, `app/earnings-recession/earnings-risk-only-panel.tsx` blob `05a4d7766cb1468af90ed60450129a956511cfd1`; 신규 기능 코드·PC·D1·배포 0 | 다음 R1-09: B 12대 기업실적 API/UI 소유 파일 및 분리 계약 확정, 이후 R1-10 |

## 14. 2026-11-17 R1-09 A/B/C 계약 분리 종료 — 소스 정밀 대조

**대상:** `ansqhd5774-Choi/zgmini`, `codex/api-site-integration-r1-20261026`, 조사 시작 브랜치 HEAD `f4aa2d3ab31ec920e2caf3e4272b81b9f25a82d6`. 아래 blob는 지정 브랜치의 직접 파일 readback 근거이며, 현재 PC 설치·Cloudflare Production SHA와 동일하다고 주장하지 않는다.

| 유형(보호 소유권) | UI 진입·컴포넌트 | GET/API·데이터 계약 | 소스 증거·변경 금지 |
|---|---|---|---|
| **A / 8대 위험 실적 침체 진단** | `/earnings-recession/` → `app/earnings-recession/page.tsx` (blob `f24ff87c...`) → `earnings-risk-only-panel.tsx` (blob `05a4d776...`) | `/api/earnings-recession-detail`, `diagnostics8.earningsRecessionDefense`; `epsGrowth`, `margin`, `revenueGrowth`, `earningsGrowthBreadth` 4요소 | `worker/market-score-r1.mjs` blob `5ecb3643d3c98991bedc1aa87dbfe3750e7a91ee`의 risk 분리 및 `lib/diagnostic-layer/model.mjs`. 기존 4요소·가중치·위험 차트·점수 변경/재가중 금지 |
| **B / 12대 경제지표 중 기업실적 도메인** | `/economic-indicators/earnings/` → `app/economic-indicators/earnings/page.tsx` blob `36daa31cc72e123fa8adbe30576bb8f2cfbf90c6` → `EconomicDetailPage` blob `fc910927d1fb3790962fdad574da0503c568ffc3` → `EconomicDetailPanel` blob `70fe1d114a2f19be6259e226bae7532972e71526` | `/api/market-score`의 `domains.find(id==='earnings')`; `lib/economic-detail-catalog.ts` `id='earnings'` (blob `6e465a5aedf98eabe2e3c173c1ae686c85e87d7e`); `worker/market-score-r1.mjs`의 `collected.external.publicDomainScores.earnings`를 `buildCmR1DomainResults`로 분리; `lib/market-score/domain-adapter-r1.mjs` blob `e63a7e9ad0046670689e7bc60dbe7427192d6b37` | 12대는 **경제지표 도메인 수**이지 12개 기업이 아님. E1-R5 최대 13개 구성 항목의 종합 기업실적 도메인을 A 4요소와 혼합 금지. 동일 `/api/market-score` payload 내부 `domains` 계약이며 독립 URL API가 아님 |
| **C / 실적 침체 정보성 지표** | A 페이지에서 `earnings-risk-only-panel.tsx`가 `useStoredIndex`로 보조 조회·표시 | `/api/earnings-recession-indicators`, `/api/earnings-recession-census-qfr-margin`, `/api/earnings-recession-bea-unit-profit` 및 별도 BEA 제조업 GET; D1 5개 정확키·Writer/Reader는 §13 | BLS/QFR/BEA 정보행은 A 진단 산식 또는 B 도메인 점수에 자동 합산하지 않음. D1 exact key, 저장시각, 결측·stale·권리, 원본/계산/게시 승인 분리 유지 |

**교차검사:** B `EconomicDetailPanel`은 `useStoredIndex('/api/market-score')` 뒤 `payload.domains.find(item=>item.id===id)`로 B `earnings`만 선택한다. A `EarningsRiskOnlyPanel`은 위험 GET과 정보성 GET을 분리해 호출한다. `worker/market-score-r1.mjs`는 `publicDomainScores.earnings`와 `earningsRiskEvidence` 기반 진단 4요소를 별도 변수로 만든다. `worker/projection-source-r52.mjs` blob `6f1800ab769acf9a9e3022cdb4663b23a574531b`도 E1-R5 `domains.earnings`와 `diagnostics8.earningsRecessionDefense`를 구분한다. 따라서 **R1-09 소스 계약 조사 DONE**; 신규 코드는 변경하지 않음.

**한계:** 운영 PC의 live 승인 소스·개별 D1 row, 실제 Publisher ledger, 현재 Production 배포 SHA·HTTP 응답·브라우저 UI 동일성은 이 소스 조사로 검증되지 않는다. C 5개 정확키 실게시 검증은 §13과 후행 R4~R6를 따른다. 실제 PC/SQLite/D1/Production 쓰기·공급자 호출 **0건**. **LAST PASS:** 지정 브랜치 A/B/C UI→API→데이터 계약 소스 구분. **FIRST UNFINISHED:** R1-10 지표별 통합 인벤토리(중복·source/collector/storage/latest/public/gap). **NEXT:** W05가 R1-01~09의 기존 증거를 행별로 통합하고 미확인 효과를 명시, 이후 R2-01 착수 판정.

## 15. 2026-11-17 R1-10 지표별 전체 수집·저장·공개 통합 인벤토리 — 조사 완료

**판정 범위:** §7~14의 기존 실제 PC 결과와 지정 브랜치의 직접 소스 읽기를 결합했다. `latest`는 **마지막으로 증명된 당시 관측 기간/원장**이지 2026-11-17의 신규 자료를 의미하지 않는다. `public`은 공개 키·GET *구현*과 실제 D1 게시·Production *효과*를 분리한다. 새 Provider 호출·운영 PC/SQLite/D1/Cloudflare 쓰기는 0건.

| indicator_id / 구분 | source → Collector | PC 원문/저장 위치 | latest 마지막 유효 증거 | public 소스 계약 | gap / 재수집 판정 |
|---|---|---|---|---|---|
| `bls_ppi_final_demand_yoy_sa` | BLS `WPSFD4` → `EARNINGS_R3C_BLS_STORE_ONCE.mjs` → R3D stored calc | `core.sqlite` `api_history_chunks_v1`/`api_history_snapshots_v1`, BLS namespace | 2026-10-27 실PC 저장·SHA 검증. 당시 관측 2026-09, 21개월 | 기본 C key `detail:earnings-recession-indicators:v1`, GET `/api/earnings-recession-indicators` | **기존 저장 PASS** 재수집 불필요. 공식 관측 최신값/현재 D1 재검증은 후행 |
| `bls_ppi_final_demand_index` | 동일 `WPSFD4` → 동일 Collector, 원본 index 직접 사용 | 동일 BLS 원본 snapshot 공유 | 동일 | 동일 C key/GET | **같은 수집 1회에서 파생 2행**. 중복 API 호출 금지 |
| `bls_ppi_goods_yoy_sa` | BLS `WPSFD41` → 동일 R3C → R3D | 동일 SQLite, 별도 series namespace | 2026-10-27 실PC 저장 PASS. 당시 2026-09·21개월 | 동일 C key/GET | 기존 저장 PASS, 새 YoY 위해 재호출 불필요 |
| `bls_ppi_goods_index` | 동일 `WPSFD41` 원본 index | 동일 저장 snapshot 공유 | 동일 | 동일 C key/GET | 위 계열과 원본 중복 수집 금지 |
| `bls_unit_labor_cost_yoy` | BLS `PRS85006111` → R3C→R3D | 동일 SQLite, 분기별 저장 | 2026-10-27 실PC PASS. 당시 최신 2026-Q2·6개 분기 | 동일 C key/GET | 공급자 제공 YoY 직접 사용, 임의 재계산 금지 |
| `bls_ppi_services_yoy_sa` | BLS `WPSFD42` → `EARNINGS_R3C_BLS_STORE_ONCE.mjs` 서비스 선택 → stored calc | 설계상 BLS 분리 dataset; 실제 PC 저장·SHA **NOT_VERIFIED** | `NOT_VERIFIED` | C 서비스 별도 key `detail:earnings-recession-indicators:bls-wpsfd42:v1`, 기본 GET에서 합성; Writer `EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs` | R3-04 승인 수동 수집·재조회 필요; 기본 C 키 덮어쓰기 금지 |
| `bls_ppi_services_index` | 동일 `WPSFD42`, 원본 index | 동일 후보 snapshot | `NOT_VERIFIED` | 동일 서비스 전용 key | 서비스 1개 공급 원천→2행. 기존 3계열과 혼동 금지 |
| `census_qfr_manufacturing_after_tax_margin_nsa` | Census QFR ZIP `programCode=QFR` → `EARNINGS_CENSUS_QFR_R1_READONLY.mjs` → R2 SQLite append → R3 stored calc | `core.sqlite` `api_history_chunks_v1`/`api_history_snapshots_v1`, 원본 ZIP base64/SHA | 당시 2026Q2 QFR ZIP SHA `232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654` 저장·계산 PASS | C 전용 key `detail:earnings-recession-indicators:census-qfr-mfg-margin:v1`, GET `/api/earnings-recession-census-qfr-margin` | 원본 재수집 불필요, **실제 단일키 D1 게시·readback 미실행** (R4-06 승인 범위) |
| `bea_nonfinancial_unit_profit` | BEA NIPA Table 1.15 `A463RD` / FRED `A463RD3Q052SBEA` → W05 `EARNINGS_BEA_UNIT_STORED_RAW_R1.mjs` 보관 후보 | `raw/earnings-bea-unit-profit-r1/<sourceSha>.csv/.json` 설계; 실제 PC 원본 **NOT_VERIFIED** | `NOT_VERIFIED` | C key `detail:earnings-bea-unit-profit:v1`, GET `/api/earnings-recession-bea-unit-profit` | 앱 main 구형 direct-fetch Publisher와 W05 저장형 소스 차이. R3-08~10 원문/분리 검증 후 R4 게시 |
| `bea_manufacturing_corporate_profits_yoy` | BEA NIPA Table 6.16D `N400RC` / FRED `N400RC1Q027SBEA` → `EARNINGS_BEA_MFG_PROFIT_R5_APPEND_ONLY_CAPTURE.mjs` | `raw/earnings-recession/bea-manufacturing-profits-r5/<sourceVersion>.csv/.json` | 2026-10-28 실PC `APPEND_ONLY_SOURCE_STORED` 2파일 보고, `sourceVersion=ebaf93f7...`; 독립 SHA 재조회 미실시 | C key `detail:earnings-bea-manufacturing-profit:r1`, GET `/api/earnings-recession-bea-manufacturing-profit` | R3-11 archive 2파일 SHA/행수/기간 재조회 필요. 실제 D1 미게시 |
| `CENSUS_M3_NEW_ORDERS_CANDIDATE` (정식 indicator_id 미확정) | Census EITS M3 신규주문, W05 C 전용 Collector **NOT_VERIFIED** | 물가 전용 `MTM/TI` 재고 JSON은 별개, 신규주문 저장 경로 미확인 | `NOT_VERIFIED` | C 전용 key/GET 없음 | R2-06 공식 계열·권리 적격성 **HOLD**; 재고 Collector를 신규주문으로 재명명·재사용 금지 |
| `CENSUS_M3_SHIPMENTS_CANDIDATE` (정식 indicator_id 미확정) | Census EITS M3 출하, W05 Collector **NOT_VERIFIED** | 신규 출하 전용 원문/체크포인트 없음 | `NOT_VERIFIED` | 전용 key/GET 없음 | R2-06 `HOLD`; 현재 적격성·실자료 확인 전 수집 금지 |
| `CENSUS_MTIS_RATIO_CANDIDATE` (정식 indicator_id 미확정) | Census MTIS 재고/매출 비율, W05 Collector **NOT_VERIFIED** | 보관 경로·원본 SHA 없음 | `NOT_VERIFIED` | 전용 key/GET 없음 | R2-07 `HOLD`, 정식 승인/권리 판정 전 무단 수집 금지 |
| `SEC_COMPANYFACTS_C_CANDIDATE` (정식 indicator_id 미확정) | SEC `companyfacts.zip` → 연구용 `earnings-r5-official-refresh-r1.mjs`, 기존 SEC frames/E1-R4와 분리 | 연구용 `manual-input/e1-r5/incoming/companyfacts/CIK##########.json`; 실제 운영 PC 파일·SHA 불명 | `NOT_VERIFIED` (연구용 dry-run 기본) | C 전용 D1 key/GET 미확인 | R2-10/11·R3-15 `HOLD`; 연구 staging을 승인 운영 Collector로 간주 금지 |
| **A 보호** `diagnostics8.earningsRecessionDefense` | SEC XBRL 기반 E1-R4 위험 4요소 산식 | E1-R4 별도 scored stored evidence/공개 projection | R1-07/R1-09 소스와 기존 점수 증거; **현행 실PC/Production SHA 별도** | `/api/earnings-recession-detail` → `/earnings-recession/` | C 행 합산·가중치 변경 금지 |
| **B 보호** `domains[id=earnings]` | E1-R5 기업실적 economic `publicDomainScores.earnings` | 공통 저장 경제 점수 snapshot, 실제 현재 row 미재조회 | 소스 계약 확인, 현행 운영 값 **NOT_VERIFIED** | `/api/market-score` → `/economic-indicators/earnings/` | A 4요소와 B 13개 구성요인·출처 혼합 금지 |

**중복·실행 판정:** BLS 3개 원천을 5개 파생 정보행으로 중복 계산하지 않으며 `WPSFD42`는 1원천/2행 독립 확장이다. QFR 저장·계산 PASS 재사용(수집 재시도 불필요); BEA unit 새 원본 보관 미검증/제조업 2파일 readback 미완료; M3 재고(물가) ≠ M3 신규주문·출하(실적 침체), E1-R4 SEC frames ≠ 연구용 E1-R5 CompanyFacts ZIP. C의 5개 게시 정확키는 R1-08 §13에서 이미 확인했고, 현재 **게시 본문·sourceStoredAt·stored_at·배포 SHA를 검증한 키는 0/5**; 소스 5키 존재와 운영 성공을 동일시하지 않는다.

**완료 판정:** R1-10의 `indicator_id/source/collector/storage/latest/public/gap` 항목을 유효 기존 원장과 소스·미확인으로 모두 명시. **R1-10 조사 DONE**, 순차 10/82(12.2%). **LAST PASS:** R1-01~10 계보/중복/보호·첫 누락 목록. **FIRST UNFINISHED:** R2-01 BEA 공식 NIPA 계열·단위·분기/개정의 공식 문서 대조. **NEXT (W05):** R2-01에서 공식 BEA NIPA Table/Line/Series 및 FRED CSV 배포의 동일/차이 조건을 확인해 적격성·단위를 기록. 추가 기능 코드/PC 수집/D1 게시/Cloudflare 배포는 하지 않음.

## 16. 2026-11-17 R2-01 BEA 공식 NIPA 두 계열·라인·시계열·단위 교차검증 — DONE

**대상·근거:** BEA 공식 [NIPA Interactive Table 목록](https://apps.bea.gov/iTable/?categories=survey&isuri=1&nipa_table_list=273&reqid=19&step=3), BEA [기업이익 설명·현재 발표](https://www.bea.gov/data/income-saving/corporate-profits), BEA [2026 Annual Update](https://www.bea.gov/AnnualUpdate), FRED가 BEA NIPA 원천 표를 그대로 표시하는 개별 [Table 1.15 분기표](https://fred.stlouisfed.org/release/tables?eid=17725&rid=53)와 [Table 6.16D 분기표](https://fred.stlouisfed.org/release/tables?eid=18673&rid=53) 및 해당 series 페이지. **공식 BEA 공급자 표 정의**와 **FRED 배포 transport/계약**은 서로 다른 계층이다.

| 범위 | BEA NIPA 원천 | 배포 series 및 원단위 | 2026-09-30 당시 최신 관측 예시 | 주의 계약 |
|---|---|---|---|---|
| 비금융 법인 **단위이익** | **Table 1.15, line 7**, `A463RD`: *Corporate profits with IVA and CCAdj (unit profits from current production)* | [`A463RD3Q052SBEA`](https://fred.stlouisfed.org/series/A463RD3Q052SBEA), **달러/실질 총부가가치 단위**, 분기·계절조정(SA) | 2026-Q2 **0.250 달러**; 직전 Q1 **0.231**, 전년 Q2 **0.216** (FRED 2026-09-30 갱신분) | 전체 비금융 국내법인 부가가치 1단위의 이익. 제조업에 한정되지 않고 수익률(%)·십억 달러·세후 제조업 마진이 아님 |
| 비금융 **제조업 기업이익** | **Table 6.16D, line 15**, `N400RC`: *Corporate profits with inventory valuation adjustment: Domestic industries: Nonfinancial: Manufacturing* | [`N400RC1Q027SBEA`](https://fred.stlouisfed.org/series/N400RC1Q027SBEA), **십억 USD**, 분기·계절조정 **연율 환산(SAAR)** | 2026-Q2 **1,053.304십억 달러**; Q1 **812.346**, 전년 Q2 **681.285** (2026-09-30 표) | IVA 조정 제조업 산업별 기업이익. Table 6.16D line 1 광역 IVA+CCAdj와 동일하지 않으며 제조업 세후 이익률/단위이익과 혼용 금지 |

**수정·개정 근거:** BEA의 2026년 National Economic Accounts Annual Update는 2026-09-30 NIPA 분기 및 월간 표에 개정 자료와 계절조정 개선을 반영한다. [ALFRED 단위이익 빈티지](https://alfred.stlouisfed.org/series?seid=A463RD3Q052SBEA)와 [ALFRED 제조업 빈티지](https://alfred.stlouisfed.org/series?seid=N400RC1Q027SBEA)는 공식 관측기간과 *실제 공개 개정 시점*을 분리하는 비교 통로. 과거 그래프의 2026-08-26 단위이익 Q2=0.260과 현재 2026-09-30 Q2=0.250은 동일 관측 분기의 개정 예시로, 과거 값을 최신 저장 원본으로 가장하지 않는다. FRED series에는 각각 2026-11-25 차기 발표 예정이 표시되지만 **미래 발표 자료를 이미 확보했다고 주장하지 않는다**.

**결과·한계:** Table/Line/Series/분기·단위·산업범위·수정시각 경계 확인으로 **R2-01 조사 DONE**. NIPA 산업별 IVA에 CCAdj를 일률적으로 덧붙이지 않으며, 원천 단위(USD 대 십억 USD SAAR)를 %나 동일 scale로 치환하지 않는다. BEA 공급자의 현재 표 내용은 **공개 출처**로 조사했을 뿐 운영 PC CSV/메타/SQLite를 새로 수집·재조회하지 않았고, FRED CSV 전송 데이터의 BEA 원본 동일성·저장/파생/재게시 권리는 별도 **R2-02** 검토에 남긴다. 앱 산식·수치·기존 게시 키/DB/TTL/Production 변경 없음.

**LAST PASS:** 공식 BEA 표 1.15/6.16D와 배포 series의 정의·라인·단위·개정 관측을 구별. **FIRST UNFINISHED:** R2-02 FRED CSV transport·BEA 빈티지 동치 및 재사용권·공개 적격성 판정. **NEXT:** W05가 BEA/FRED 계열·CSV 공식 문서·권리조항/개정 비교만 수행하고 후행 R3 source archive 및 R4 B 게시 승인은 별도 유지. 운영 쓰기/공급자 수집 0건.

## 17. R2-02 (2026-11-17 KST) FRED graph CSV/API·BEA 원천·개정·이용권리 — 조사 DONE, FRED archive/public HOLD

| 항목 | 근거 | 판정 |
|---|---|---|
| 원천 정의 | BEA NIPA Table 1.15 A463RD와 FRED series A463RD3Q052SBEA(미국 비금융 법인 단위이익, 달러, 분기 SA). 2026-09-30 FRED 갱신의 2026Q2=0.250 / Q1=0.231 / 2025Q2=0.216 | SOURCE_LINEAGE_CONFIRMED, 이는 BEA 파일과 FRED 다운로드 바이트 동치 증명이 아님 |
| 실제 W05 graph CSV 코드 | lib/market-score/earnings-bea-unit-profit-source-r1.mjs blob 7a5ce977b8c929b11e52c35a03f9e2fb17ace505: URL https://fred.stlouisfed.org/graph/fredgraph.csv?id=A463RD3Q052SBEA, parser 기대 헤더 observation_date,A463RD3Q052SBEA, 분기 시작일→종료일, 5개 이상 연속분기 확인 | GRAPH_CSV_IMPLEMENTED; 실제 응답 헤더·바이트는 이번에 다운로드/검증 안 했으므로 NOT_VERIFIED |
| 보관 Helper | scripts/pc-writer/EARNINGS_BEA_UNIT_STORED_RAW_R1.mjs blob 812266af97836edf9e06bae679e363e6546168fb: 승인 Collector가 호출해야만 fetch 후 CSV SHA-256, PC raw/earnings-bea-unit-profit-r1/<sourceSha>.csv/.json 불변 저장, metadata/sourceStoredAt 재조회 | 구현 존재; 현재 PC 아카이브 현물·원본 SHA NOT_VERIFIED, 신규 실행 없음 |
| FRED 공식 observations API | https://fred.stlouisfed.org/docs/api/fred/series_observations.html: API 키 필수, file_type=csv는 ZIP(CSV+README), realtime_start/end와 vintage_dates 지원. 그래프 CSV와 API의 URL, 응답형, 계약은 다름 | GRAPH_DOWNLOAD_IS_NOT_OBSERVATIONS_API |
| 수정치 | https://fred.stlouisfed.org/docs/api/fred/series_vintagedates.html 와 https://alfred.stlouisfed.org/series?seid=A463RD3Q052SBEA 는 발표/수정 날짜 비교 기준 제공 | FILE_SHA는 downloaded bytes version이며 공식 발표일/PIT vintage ID와 같지 않음; 실제 vintage별 값 대조 후행 |
| BEA 저작권 | https://www.bea.gov/help/faq/147: 별도 예외가 없는 BEA 웹 자료는 public domain이고 출처표기 권고 | BEA_OFFICIAL_PUBLIC_DOMAIN. 원천을 직접 얻는 경로의 별도 적격성 평가 가능, 기존 공급자 임의 교체는 하지 않음 |
| FRED Series 라벨 | https://fred.stlouisfed.org/series/A463RD3Q052SBEA: Public Domain: Citation Requested / 원출처 BEA | SERIES_LABEL_PERMITS_USE_SUBJECT_TO_FRED_TERMS; 원출처 BEA·중계 FRED 양쪽 출처표기 |
| FRED 서비스/공식 API 사용 약관 | https://fred.stlouisfed.org/legal/terms/ 및 https://fred.stlouisfed.org/legal/: 용도 제한, 서비스 대체/대량복제 제한, 공식 API의 저장·캐싱·아카이빙·제삼자 제공 제한 명시 | GRAPH_CSV_ARCHIVE_AND_PUBLICATION=HOLD_RIGHTS_SCOPE. 공식 API의 보관 제한을 graph CSV와 동일 조항인 것처럼 오인하지 않으나 일반 FRED Services 약관은 적용 |

**중요 판정:** FRED 시계열의 Public Domain 라벨은 graph CSV 기반 영구 PC 보관·D1 파생치 공개의 blanket 권한이 아니다. 반대로 FRED API의 특별 제한을 현재 graph CSV에 이미 위반한 사실로 단정할 수도 없다. 해당 FRED 경로의 ZGMINI 사용 범위를 법적/계약적 근거 없이 READY로 판정하지 않으며 R2-13 및 R3-08/R4-08의 출처 적격성·운영 사용을 HOLD로 유지한다. BEA 공식 배포 직접 소스는 대안 후보일 뿐 현재 승인 Collector 변경/새 제공자 사용 승인 아님.

**검증 수준:** R2-02의 목적은 FRED API/CSV 구분, 원천 series 정의, 보관·공개 사용권 적격/보류 판정이다. 이 범위의 공식 문서와 소스 조사를 완료해 R2-02 DONE. 실제 FRED graph.csv 현재 응답/BEA 원본 바이트·현장 CSV sourceStoredAt·SHA 및 현재 D1 게시 값은 NOT_VERIFIED이며 후행 단계로 분리. 공급자/운영 PC/SQLite/D1/Production 신규 요청·쓰기 0건, 앱 코드 변경 0건.

**LAST PASS:** FRED/BEA 계보·변환 코드·두 전송 방식·권리 사용 범위 판정. **FIRST UNFINISHED:** R2-03 제조업 N400RC의 명목 IVA/SAAR/YoY와 산업 범위. **NEXT:** W05가 BEA NIPA Table 6.16D 공식 정의와 기존 W05 제조업 Reader를 대조하고 결과를 동일 진행 기록에 반영한다.

## 18. R2-03 (2026-11-17 KST) BEA 제조업 기업이익 N400RC 산업·명목·분기·YoY 정밀 대조 — DONE

### 공식 개념·계열 검증
- **출처 계보:** BEA NIPA Table 6.16D, BEA Account Code N400RC → FRED [N400RC1Q027SBEA](https://fred.stlouisfed.org/series/N400RC1Q027SBEA). 이름은 미국 **Domestic industries: Nonfinancial: Manufacturing**의 Corporate profits with **inventory valuation adjustment (IVA)**. 국내 제조업만의 산업 이익이며 미국 모든 법인 또는 SEC 개별기업 EPS·BEA A463RD 단위이익·QFR 제조업 세후마진과 다르다.
- **측정·조정:** 원본은 **명목 Billions of U.S. Dollars / Quarterly / Seasonally Adjusted Annual Rate (SAAR)**. 물가조정 실질 제조업 이익·실제 3개월 현금흐름·세후영업마진 비율이 아니다. BEA [2026 Q2 설명](https://apps.bea.gov/scb/issues/2026/10-October/1026-charting-economy.htm)은 기업이익 산업별 IVA가 재고 가격변화 효과를 제거하며 세부 산업별 CCAdj는 추정되지 않고 금융/비금융 광역 합계 수준에서만 제공된다고 설명. 제조업 N400RC에 CCAdj 추가하지 않음.
- **2026-09-30 수정 버전:** FRED series 당시 2026Q2=1,053.304, 2026Q1=812.346, 2025Q2=681.285 (십억 USD SAAR). 동일 관측 분기의 개정 가능성이 있으므로 이는 당시 FRED current vintage 기준. 과거 보고 [EARNINGS_BEA_MANUFACTURING_PROFITS_R1_READONLY_20261028.md](EARNINGS_BEA_MANUFACTURING_PROFITS_R1_READONLY_20261028.md)의 live source parse/YoY=54.60548815840656%와 정의상 일치, 실제 PC R5 archive 두 파일의 독립 SHA readback은 여전히 수행 안 됨.
- **YoY 원본/변환:** W05 [순수 Reader](../lib/market-score/earnings-bea-manufacturing-profit-source-r1.mjs) Git blob 4fcd41887151f8aefe16cb9d47ab5949bca8ed8d 는 FRED graph CSV 기대 헤더 observation_date,N400RC1Q027SBEA, 분기 시작일→종료일 매핑, 5개 연속 분기, 음수/0 전년동기 기준값 거부, 계산 (current/yearAgo-1)*100. [D1 Reader](../worker/earnings-bea-manufacturing-profit-r1.mjs) Git blob 5afd165dbe6cdd31bf9e78f169ae263655d2a088는 QUARTERLY/SAAR/WITH_INVENTORY_VALUATION_ADJUSTMENT/PERCENT_YOY·전년동기 4분기 차이 및 readback hash version을 확인. 즉 **전년 동기 YoY**이지 QoQ 연율화 또는 실질성장률이 아님.
- **연결 보호:** 기존 E1-R5 경제지표 기업실적 S6는 별도 BEA 총이익, A 실적 침체 4요소 점수도 변경하지 않음. 제조업은 C 정보행 전용 key detail:earnings-bea-manufacturing-profit:r1로 미게시; 데이터가 있더라도 13개 점수 구성과 합산 금지.

### 판정 및 한계
R2-03에 요구한 산업범위·명목/실질·IVA와 CCAdj의 차이·SAAR/분기·원시 단위 대비 계산된 YoY 기준을 공식 BEA 설명·FRED series·소스 및 기존 PC 보고와 대조해 **조사 DONE**. 실제 PC의 2026-10-28 저장본 SHA·메타/원본 일치·현재 FRED CSV 응답과 D1 게시·GET 실효과는 본 작업의 검증 항목 아님(R3-11, R4-11~12), 모두 NOT_VERIFIED. R2-02에서 확인한 **FRED graph CSV 운영 아카이빙/공개 권리 HOLD_RIGHTS_SCOPE 유지**, 이 조사는 이용 허가가 아님. 외부 원자료 수집·Windows PC/SQLite/D1/Cloudflare 쓰기 0건, 소스 변경 0건.

**LAST PASS:** R2-03 N400RC 산업 정의·단위·YoY 계약 비교. **FIRST UNFINISHED:** R2-04 Census QFR 원문 ZIP/API·테이블/필드/버전 검증. **NEXT:** W05가 공식 Census QFR ZIP programCode=QFR, QFR-mf.csv 및 기 저장 ZIP SHA의 일치·스키마를 기존 증거로 판정; 이미 저장된 QFR 원본을 다시 수집하지 않음.

## 19. R2-04 (2026-11-17 KST) Census QFR 공식 ZIP·프로그램·테이블 스키마·버전/원장 조사 — DONE

### 공급자·ZIP 구조
- [Census 공식 Business & Industry Time Series](https://www.census.gov/econ_datasets/)는 Quarterly Financial Report **QFR-mf.zip**, 2026-09-08 게시, 당시 2026Q2 통계의 약 1705.80 KB 자료를 제공. [Census 역사 자료](https://www.census.gov/econ/qfr/hist_financial.html)에도 2026Q2 공표표가 있음. [QFR 소개](https://www.census.gov/econ/qfr/about.html)는 미국 기업의 분기 재무통계를 설명한다.
- W05 기존 공급자 경로는 [공식 ZIP 다운로드](https://www.census.gov/econ_getzippedfile/?programCode=QFR), 기존 parser scripts/pc-writer/EARNINGS_CENSUS_QFR_R1_READONLY.mjs Git blob 81172219972e71f505813180ca6ac036ae1dab71. 정식 REST API의 인증/JSON 응답과 동일하다고 가장하지 않으며, Census 공식 다중 파일 ZIP 배포라는 transport를 정확히 구분.
- ZIP 내 필수 QFR-mf.csv와 섹션: CATEGORIES (cat_idx,cat_code,cat_desc,cat_indent), DATA TYPES (dt_idx,dt_code,dt_desc,dt_unit), GEO LEVELS (geo_idx,geo_code,geo_desc), TIME PERIODS (per_idx,per_name), DATA (7열). ZIP 중앙 디렉터리·CRC32·압축 해제·파일명/미암호화·최대 크기/유일성·5분기 연속 검사를 parser가 수행한다. **공식 배포는 ZIP 원문**, 제조업 이익률은 합성 파생값.
- 선택: category MFG=All Manufacturing, geography US, et_idx=0, is_adj=0(비계절조정), 데이터 타입 101=매출과 115=세후이익 모두 MLN$의 단일 분기/산업/미국 전체. 후속 R2-05에서 동일 표본/분자·분모 정합성과 결측·0 판정을 독립 재검증한다.

### 실제 ZIP 버전과 기존 PC 원장
- 기존 실PC 2026-10-27 R2 읽기 전용 프리플라이트에서 **ZIP_BYTES=1746726**, SOURCE_SHA256 **232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654**, OBSERVED_THROUGH=2026-Q2, 결과 PASS 기록. [실제 검증 문서](EARNINGS_CENSUS_QFR_RAW_SQLITE_R2_20261027.md).
- 이어서 2026-10-27 실PC 승인 SQLite append에서 CHUNKS_INSERTED=1, SNAPSHOTS_INSERTED=1, SQLITE_COMMITTED=YES, PASS_QFR_SQLITE_APPEND_READBACK 확인. scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs blob 95059aae7122b8442deba14aefe528b9cdc55050은 원문 ZIP base64+sourceSha256+meta/5연속분기를 api_history_chunks_v1/api_history_snapshots_v1에 저장. 동일 ZIP은 ON CONFLICT DO NOTHING, 변경 ZIP은 SHA로 별도 버전 기록한다. 이 **SHA는 실제 다운로드 파일 content version**이며 공급자의 별도 공식 release/vintage 식별자가 아님.
- Census 공식 목록의 게시일·파일명/압축 크기는 기존 PC 아카이브 **구조/버전의 보조 대조 근거**이지 현재 온라인 ZIP 바이트와 운영 저장 ZIP의 실시간 SHA 동일성 검증은 아니다. 기존 유효 PASS 증거를 재사용, 새로운 ZIP HTTP 조회/원본 재수집/SQLite 기록 없음.
- R2-04 조사 DONE, 실제 원자료 저장 증거는 2026-10-27 실PC R2에 한정됨. D1 게시 R4-06 승인 미완료, 운영 방문자 GET/Production 현재값 미검증. R2-05 세후이익률 계산 표본·분기 정합성 검증과 R3 저장 자료 계산·게시를 분리한다.

**LAST PASS:** Census 공식 ZIP QFR-mf.zip, parser QFR-mf.csv 필드/계층/단위, 이전 PC ZIP 원문 SHA/append-only 원장 확인. **FIRST UNFINISHED:** R2-05 제조업 같은 표본의 세후이익 115·매출 101 분자·분모·비계절조정 및 5분기 검산. **NEXT:** W05가 기존 R3 stored-only 계산 PASS와 현재 Reader의 이익률 정의를 대조하며 신규 공급자 API 호출·SQLite/D1 쓰기 없이 근거 기록.

## 20. R2-05 (2026-11-17 KST) QFR 제조업 세후이익률 분자·분모·5분기 정합성 — DONE

- **대상:** 저장 원본 Census ZIP SHA `232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654`, PC 저장·검산 원장 [QFR R3](EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_20261027.md) (실PC UTC 2026-10-27 15:06:35, `RESULT=PASS_QFR_STORED_READONLY_PREVIEW`, snapshot `0cf9d0e4bced96b300810a448bf67be3b663252178f15853f103561d876ddeb3`, `STORED_SNAPSHOTS_VERIFIED=1`). 새 HTTP·재수집 없이 이전 PC 원본과 지정 브랜치 소스 계약을 대조.
- **동일 표본·단위 검증:** `scripts/pc-writer/EARNINGS_CENSUS_QFR_R1_READONLY.mjs` blob `81172219972e71f505813180ca6ac036ae1dab71`의 `CATEGORIES cat_code=MFG(All Manufacturing)`, `GEO LEVELS geo_code=US`, `DATA TYPES dt_code=101` Net Sales/Receipts/Operating Revenues와 `dt_code=115` Income (Loss) After Income Taxes, 각 `MLN$`, `et_idx=0`, `is_adj=0`(NSA) 조합. `per_idx`의 동일 분기끼리 양쪽 값을 매칭, 중복 계열·분기·결측·0 이하 매출 거절, 끝 5개 연속분기만 사용. `QFR-mf.csv`의 표본 집계와 개별 법인 실적을 혼동하지 않음.
- **공식 범위:** [Census QFR 소개](https://www.census.gov/econ/qfr/about.html)는 제조업 미국 국내 자산 **500만 달러 이상** 표본법인에 한정하고 산업 분류를 NAICS 제조업으로 정의. [2026Q2 발표](https://www.census.gov/econ/qfr/mmws/current/index.html)는 2026-09-08 공식 통계·계절조정/비계절조정 구분. 본 정보행의 원시 값은 **비계절조정**, 고정 2026Q2 빈티지/2026-10-27 저장 소스이며 모든 미국 제조업체를 직접 전수조사한 실적이 아님.

| 동일 원문 관측 분기 | 매출 101 (백만 USD) | 세후이익 115 (백만 USD) | 자체 산출 `100*profit/sales` |
|---|---:|---:|---:|
| 2025-Q2 | 2021570 | 225829 | 11.170971076935253% |
| 2025-Q3 | 2046770 | 250525 | 12.240017197828774% |
| 2025-Q4 | 2078865 | 236644 | 11.383326959663085% |
| 2026-Q1 | 2046451 | 287262 | 14.03708175763798% |
| 2026-Q2 | 2372409 | 370082 | 15.599418144173285% |

- **독립 JS 산술 검산:** 5개 매출 분모 모두 `>0`이고 유한. 2026Q2 `370082/2372409*100=15.599418144173285`, 전분기 `287262/2046451*100=14.03708175763798`, 차이는 `+1.5623363865353053 percentage points`. 기존 저장자료 전용 PC R3의 세 수치와 오차 `0`. Census 원본 매출/이익은 같은 단위여서 단위 변환 없이 비율만 계산; `15.5994%`는 Census가 원시 `dt_code` 한 칸에 제공한 지표가 아니라 두 원시값의 **독립 파생 정보행**.
- **확인된 한계:** Census QFR 공개 통계는 표본 추정치·개정/공표 지연을 포함한다. 현재 온라인 ZIP SHA를 새로 다운로드한 것이 아니며 2026Q2 이후 신규 발표 실측, 독립 현행 PC 데이터 확인, D1 body/stored_at·Production SHA/GET·UI는 미실행. R3 PC 기존 성공을 재활용했고, 추가 운영 효과 `providerCalls=0, sqliteWrites=0, d1Writes=0, deployments=0`.
- **완료 판정:** R2-05가 요구한 동일 산업·지역·분기·원시단위/보정·분자/분모·결측/양수·5분기/전분기 변화 검증 **DONE**. 기존 E1-R4 4요소와 12대 기업실적 B 산식 불변. **LAST PASS:** 2026Q2 NSA 제조업 QFR 자체 산출 15.599418% 저장자료 계산 0오차. **FIRST UNFINISHED:** R2-06 M3 신규주문·출하 공식 변수/권리 적격성. **NEXT:** W05가 Census EITS M3의 주문/출하 series/단위·계절조정 코드를 공식 자료로 판정, 물가 MTM/TI 재고와 구분하고 새로운 수집/게시 효과는 발생시키지 않는다.

## 21. R2-06 (2026-11-17 KST) Census M3 신규주문·출하 변수·단위·계절조정 적격성 — 조사 DONE, C 원본/운영 HOLD

**공식 공급자 구조:** [Census EITS M3 API 설명](https://api.census.gov/data/timeseries/eits/m3.html), [변수 스키마](https://api.census.gov/data/timeseries/eits/m3/variables.html), [호출 예시](https://api.census.gov/data/timeseries/eits/m3/examples.html), [M3 원천 범위](https://www.census.gov/manufacturing/m3/about_the_surveys/index.html)와 [제조업 정의](https://www.census.gov/manufacturing/m3/definitions/index.html) 교차 확인. 미국 제조업 월별 value of shipments, new orders (취소차감), inventories 등 **서로 다른 통계항목**으로 분리한다.

| 지표 후보(비공개 임시 ID) | 공식 범주/데이터 타입 | 빈도/단위·조정 | 현재 ZGMINI 구현·저장 판정 |
|---|---|---|---|
| `CENSUS_M3_NEW_ORDERS_CANDIDATE` | `category_code=MTM` Total Manufacturing / `data_type_code=NO` New Orders | 미국 전체 `for=us:*`; 월간 명목 금액 `MLN$`, `seasonally_adj=yes`의 계절조정 값 또는 별도 `no` (구분 필수) | **공식 변수 FOUND**, W05 C 전용 NO Collector/운영 PC source SHA/원본 저장 **NOT_VERIFIED**, 원자료 수집·공개는 `HOLD` |
| `CENSUS_M3_SHIPMENTS_CANDIDATE` | `MTM` Total Manufacturing / `VS` Value of Shipments | 동일 월간 명목 백만 USD. 출하 실적/판매액, 신규주문과 별도 개념 | **공식 변수 FOUND**, W05 C 전용 VS Collector/운영 PC 원문 **NOT_VERIFIED/HOLD** |
| **기존 물가 별도 업무** | `MTM/TI` Total Inventories | **월말 재고**, 생산 출하/신규주문이 아닌 stock | 앱 main `inflation-causal-candidate-census-m3.mjs` blob `c5649283bbe071fdf153d4238b233b65c8aa39b4`: `MTM/TI` 필터, `seasonally_adj=yes`, `inflation-causal-candidates-r1/census-m3-manufacturing-inventories.json`에만 기록하도록 구현. 실 PC 실저장도 이 조사로 단정하지 않음 |

**공식 코드 사전:** [Census M3 Historical Time Series Documentation](https://www.census.gov/manufacturing/m3/historical_data/naicshist.pdf) 1~2쪽의 식별자 `A/U`(계절조정/미조정), `MTM`(Total Manufacturing), `NO`(New Orders), `VS`(Value of Shipments), `TI`(Total Inventories). 금액 자료는 **현행 달러 백만(USD millions current market)**, `IS/US`는 예외적인 ratio. 이 역사 사전의 코드와 EITS API 변수 이름을 연결한 **후보 selector 계약**이며 2026 특정 월 `MTM/NO`·`MTM/VS` 실응답 값까지 새로 수신하거나 승인되지 않은 코드를 유효한 운영 원본으로 간주하지 않음.
**계열 특성·비교 주의:** 제조업 현장 경제활동의 명목 월간 지표이며 real GDP·물가조정 수치 아님. 신규주문은 취소 반영, 출하는 납품·판매액이므로 두 지표를 무분별하게 합산하거나 재고와 동일 단위의 성장점수로 치환하지 않음. 역사 사전은 신규주문 및 미이행 주문 추정에서 반도체 산업 제외를 별도 각주로 명시. 월간 `time`/선택적으로 `time_slot_date`, `error_data`를 함께 검증해야 하며 `seasonally_adj=yes`/no 혼합 금지. Advance(내구재 조기 추정)와 Full M3(전제조업) 발표 시각은 다르며, 공식 [M3 프로그램](https://www.census.gov/manufacturing/m3/index.html)은 2026년 잔여 기간에 M3 과거 자료와 계절조정 모델을 변경하지 않는다고 별도 공지함.

**API 운영 적격성:** 공식 현재 [EITS M3 examples](https://api.census.gov/data/timeseries/eits/m3/examples.html) 및 [Census 개발자 안내](https://www.census.gov/data/developers/data-sets/economic-indicators.html)는 API query에 **API key 필수**라고 안내. 2020년 작성 EITS 오래된 PDF의 500회/일 무키 예외는 현행 공식 안내와 충돌하므로 과거 예외를 현재 적용 승인으로 사용 금지. 앱 main Growth 공통 GET wrapper는 EITS endpoint만 허용한 네트워크 재사용 모듈로서 W05 Collector 등록·C 저장을 증명하지 않음.

**완료/보류 분리:** R2-06 완료 기준인 공식 변수 코드·단위·조정/주기 확보 및 근거에 따른 `HOLD` 기록 충족 → **조사 DONE**. 제조업 신규주문·출하의 현장 API 실제 응답, 합법·승인 credentials, 원자료 저장 및 GET/공개 게시 D1은 **NOT_VERIFIED/NOT_RUN**, 후행 R2-13·R3-13·R4-13 조건부. 기존 물가 수집기를 임의 개조·복제하지 않고 A/B/C 점수/공개값 및 원자료 불변. `providerCalls=0`, `sqliteWrites=0`, `d1Writes=0`, `deployments=0`.

**LAST PASS:** Census M3 공식 NO/VS/TI 정의와 API 필드/단위, 코드의 기존 MTM/TI와 후보 MTM/NO·MTM/VS 구분. **FIRST UNFINISHED:** R2-07 MTIS 재고/매출비율 원문·변수·월간 개정. **NEXT:** W05가 공식 MTIS API/산업·월간 재고-매출 ratio 정의와 release 수정사항을 확인하고, C 전용 Collector·원본 미확인은 HOLD로 판정한다.

## 22. R2-07 (2026-11-17 KST) Census MTIS 재고/매출 비율·월간 시계열·개정 — 조사 DONE, 정확 selector/운영 HOLD

| 항목 | 공식 증거/계약 | 판정 |
|---|---|---|
| 공급자 원본 | [Census MTIS](https://www.census.gov/mtis/index.html) (Manufacturing and Trade Inventories and Sales)는 **M3 제조업, Monthly Retail Trade, Monthly Wholesale Trade** 3개 원천을 결합. Total Business 집계는 제조업 단일 계열과 다름 | FOUND_OFFICIAL_SOURCE |
| 통계정의 | [MTIS 정의](https://www.census.gov/econ_file/mtis/definitions.html), [2026년 8월 발표](https://www.census.gov/mtis/current/index.html): **월말 재고(inventory stock) / 해당 월 판매·제조업 출하(monthly flow)**, 무차원 ratio(재고가 매출 몇 개월분인가), YoY % 또는 십억달러 금액 자체가 아님 | INVENTORY_SALES_RATIO_MONTHLY |
| 월간 예시 | 2026-10-15 공식 2026-08 계절조정 총사업 재고 2,818.8십억 USD, 매출 2,123.5십억 USD → 공표 재고/매출 비율 **1.33**, 2025-08 **1.40**. 원래 값과 반올림 분리; `seasonally_adj=yes`와 `no` 혼합 금지 | LAST_VERIFIED_PUBLIC_AUG_2026 (관측월 2026-08, 발표일 2026-10-15, 현행 PC 수집일과 다름) |
| 공식 API 변수 | [Census EITS MTIS API](https://api.census.gov/data/timeseries/eits/mtis.html), [MTIS 변수 목록](https://api.census.gov/data/timeseries/eits/mtis/variables.html), [API 예시](https://api.census.gov/data/timeseries/eits/mtis/examples.html): `category_code`, `data_type_code`, `seasonally_adj`, `cell_value`, `time_slot_date`/`time`, `error_data` 및 지리 필터. 공식 현행 예시는 key 필수 안내 | API_ENDPOINT_FIELDS_FOUND; **비율 전용 정확 category/data_type 코드·실제 응답은 NOT_VERIFIED**, 추정코드 삽입 금지 |
| 2026 수정치/발표일 | [MTIS 공식 개정 공지](https://www.census.gov/mtis/index.html): 2026-09-28 소매 판매·재고 개정, 2026-10-26 도매 연차개정(AIES 2023·2024) 반영. [공식 발표 일정](https://www.census.gov/mtis/release_schedule.html)은 **2026-09 관측분을 2026-11-17 10:00 ET 발표 예정**으로 표시; 본 연구는 그 발표를 이미 확인한 것으로 단정하지 않음 | REVISIONS_NOTED. 새 자료는 발표 후 2026-09 신규 관측·수정본 분리 필요 |
| 운영 저장·공개 | R1-06/10 기본 브랜치의 W05 C 전용 MTIS Collector, 승인 operation, PC 원본·SHA·D1 key/GET를 확인하지 못함. `M3/MTM/TI` 물가 전용 재고는 MTIS 총사업 비율과 다름 | **HOLD_EXACT_SERIES_AND_COLLECTOR_NOT_VERIFIED**, 후행 R2-13·R3-14·R4-13 |

**주의:** 제조업 재고 원본만 가져와 총사업 재고/매출 비율로 라벨링하지 않는다. 공식 `1.33`은 무차원 보고 비율이며 `1.33%`가 아니다. 2026-11-17 당일 발표 예정 자료를 미리 가져왔다고 주장하지 않으며, 공식 이후 발표값·개정 여부·관측월·공개/수집/게시일을 분리한다.

**R2-07 판정:** 공식 프로그램·월간 관측/비율 산식·과거 공개 예시/계절조정·개정 일정과 정확코드 미확인 범위를 구분하여 **조사 DONE**. 정확한 MTIS API code·실제 PC source/API 연결·원문 SHA는 `HOLD`; 이 조사로 C 정보성 게시가 준비됐다는 뜻 아님. `providerCalls=0`, `sqliteWrites=0`, `d1Writes=0`, `deployments=0`, 앱 코드 변경 0.

**LAST PASS:** MTIS 공식 월말 재고/월간 매출 ratio, 2026-08 공표 1.33, 2026 개정 및 EITS 변수 스키마; **FIRST UNFINISHED:** R2-08 기존 BLS 3계열 정밀 정의·5개 정보성 파생 검증. **NEXT:** W05가 WPSFD4/WPSFD41/PRS85006111 공식 BLS 정의와 기존 원본 저장·YoY 계산을 대조하고 기존 PC PASS 증거를 재사용한다.

## 23. R2-08 (2026-11-17 KST) BLS 기본 3원천→정보성 C 5행 정의·원자료 계산 계약 — DONE

**공식 근거:** BLS [FD-ID 계절조정 코드 WPSFD4/41](https://www.bls.gov/ppi/tables/final-demand-intermediate-demand-aggregation-index-seasonal-factors-2020-2024.htm), BLS [2026-10 PPI 공식 보도자료](https://www.bls.gov/news.release/archives/ppi_11132026.htm), BLS [비농업 단위노동비용 정의 및 추이](https://www.bls.gov/charts/productivity-and-costs/nonfarm-business-sector-labor-costs-percent-change.htm), BLS [Unit Labor Costs 공식 정의](https://www.bls.gov/opub/hom/opt/calculation.htm), FRED BLS 중계 [PRS85006111](https://fred.stlouisfed.org/series/PRS85006111)로 코드/정의/원단위만 대조 (본 W05 실제 수집 공급자는 BLS direct API이며 FRED 아님).

| 원천 series | 공식 의미·원시 단위 | 공개 정보성 C indicatorId 및 변환 | 관측/저장 마지막 증거 |
|---|---|---|---|
| WPSFD4 | Final Demand, seasonally adjusted PPI monthly INDEX | bls_ppi_final_demand_index (RAW/SOURCE_INDEX); bls_ppi_final_demand_yoy_sa (DERIVED/YOY_SA_T_MINUS_12), 정확히 12개월 이전 지수>0일 때 100*(current/base-1) | 2026-10-27 PC R3D: 2025-01~2026-09 21건, latest index=159.780, derived YoY +6.346301%; 당시 저장된 vintage |
| WPSFD41 | Final Demand Goods, seasonally adjusted PPI monthly INDEX | bls_ppi_goods_index (RAW/SOURCE_INDEX); bls_ppi_goods_yoy_sa (DERIVED/YOY_SA_T_MINUS_12), 동일 기간 같은 계열 | 2026-10-27 PC R3D: 2025-01~2026-09 21건, latest index=162.341, derived YoY +9.772194%; 당시 저장 vintage |
| PRS85006111 | Nonfarm Business Unit Labor Costs (All Workers), quarterly seasonally adjusted **Percent Change from Quarter One Year Ago** | bls_unit_labor_cost_yoy (RAW/SOURCE_YOY), 공급자가 이미 계산한 전년동분기 YoY 1.4%; 전분기 연율화·지수 YoY 중복 계산 금지 | 2026-10-27 PC R3D: 2025Q1~2026Q2 6건, 2026Q2 +1.4% (당시 값) |

**계보 소스:** scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs blob add5445108361b49c839fcb7eb4ffe2cc08e4ec4는 공식 BLS v2 API `https://api.bls.gov/publicAPI/v2/timeseries/data/` 3-series 직접 수집, M13/Q05 연간 평균 항목 제거, 원시 응답 sourceStoredAt/해시 append-only 보존. scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs blob 196f6262b34b4f6df21f284810629e29e95c6d22는 세 계열 raw value와 저장 SHA·cohort·연속기간/t-12 분모·결측 거부를 읽기 전용으로 검사. Worker earnings-companion-c-r4.mjs blob d8df9f1cbbed67c5a508da5bd9767fa85987149f는 RAW INDEX / DERIVED t-12 YoY / RAW SOURCE_YOY와 MONTHLY/QUARTERLY를 엄격 검증. UI 메타 app/earnings-recession/earnings-cost-indicator-list.mjs blob 4c1be1e0322606d7ca7b996e1b70904ed1f8a125와 5개 ID 일치.

**실 PC 기존 완료증거 재사용:** [EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md](EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md)의 사용자 PC TXT `EARNINGS_R3D_STORED_BLS_CALC_RESULT_20261026-182033Z.txt`, `RESULT=PASS_R3D_STORED_ONLY_CALCULATION`, `SNAPSHOTS_HASH_VERIFIED=3`, `DATA_COHORT_CONSISTENT=YES`, `API_REQUESTS=0`, `SQLITE_WRITES=0`, `D1_WRITES=0`. 9월 BLS 원 발표의 **비계절조정** 공식 YoY 6.3%/9.8%와 파생 SA 6.346301%/9.772194%는 개념이 다르므로 수치 근접만으로 동일 series 재현 증거가 되지 않음.

**시점 제한:** 2026년 11월 13일자 BLS 최신 10월 발표와 이전 PC 2026-09 저장 계열은 관측월·revision이 다르다. 과거 PASS를 현재 최신 수집/현재 D1 READY로 오인하지 않음. 이 단계는 source/저장값 계산 계약 대조 `DONE`, 정보성 C 5개 행의 실제 현행 D1 readback/Production 검증은 R4~R6 별도. 기존 점수 A와 경제 12도메인 B, PC source/DB/TTL·scheduler 모두 불변. 신규 API/PC SQLite/D1/배포 쓰기 0.

**LAST PASS:** R2-08 공급자 3종 단위·계산 기준과 5행 mapping. **FIRST UNFINISHED:** R2-09 WPSFD42 Final Demand Services 분리 원천/YoY·별도 D1 checkpoint 대조. **NEXT (W05):** R2-09 공식 BLS 서비스 지수 t-12 원본·2026-09 표본 및 소스 분리 구조를 소스/공식자료로 확인하고 운영 WPSFD42 수집·게시 상태를 별도 판정.

## 24. R2-09 (2026-11-17 KST) BLS 서비스 PPI WPSFD42 별도 원천·2행·독립 checkpoint — DONE

**공식 시계열:** BLS `WPSFD42` = Final demand services **계절조정 월간 생산자물가지수**, BLS [직접 series](https://data.bls.gov/timeseries/WPSFD42), BLS [2026-09 발표(2026-10-15)](https://www.bls.gov/news.release/archives/ppi_10152026.htm). BLS 공식 발표의 **서비스 PPI 전월 대비 +0.8%**는 동일 계열의 **전년 동월 대비 YoY**와 별개이고, 보도자료의 전체 최종수요 NSA YoY와도 같은 의미가 아님. 2026-11 현재 공개된 10월 최신 개정본(2026-11-13 보도)이 있으나 이하 값은 2026-10-27 연구/실수신 당시 snapshot.

| 구분 | 2026-10-27 기존 연구 HTTP 근거 | 변환·표시 계약 |
|---|---|---|
| 서비스 PPI 2026-09 (SA) | WPSFD42 index 157.666, BLS API에 preliminary 주석 | `bls_ppi_services_index`: `RAW/SOURCE_INDEX`, 단위 INDEX |
| 같은 series 2025-09 (SA) | WPSFD42 index 150.273 | 정확한 12개월 기준점, `>0` 조건·두 시점 존재 필수 |
| WPSFD42 자체 파생 YoY | `100*(157.666/150.273-1) = 4.919712789389985%` | `bls_ppi_services_yoy_sa`: `DERIVED/YOY_SA_T_MINUS_12`, 단위 PERCENT, 9월의 MoM +0.8%와 혼동 금지 |

**기존 소스 실제 대조:** [BLS 서비스 통합 이력](EARNINGS_BLS_SERVICE_PPI_WPSFD42_INTEGRATION_R1_20261027.md)에서 2026-10-27 BLS v1 무키 HTTP `REQUEST_SUCCEEDED`는 당시 **조회 성공**이고 실제 PC 운영 스냅샷 저장 성공이 아니다. 전담 브랜치 `EARNINGS_R3C_BLS_STORE_ONCE.mjs` blob add5445108361b49c839fcb7eb4ffe2cc08e4ec4는 기본 series WPSFD4/WPSFD41/PRS85006111와 서비스 WPSFD42를 분리한 `--services-only --dry-run`/명시 apply 구분. `EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs` blob 08aa9aaebdca21e1eeab7a403b41bc7d4c01e5c1는 검증된 WPSFD42 스냅샷이 실제 있을 때만 추가 2행 생성, 13개월 history/동일월 12개월 전 값 없으면 YoY=null. `worker/earnings-companion-c-r4.mjs` blob d8df9f1cbbed67c5a508da5bd9767fa85987149f는 서비스 1계열·2행/월간 SA/메서드·출처 검증.

**저장/게시 보호:** 기본 C 5행 `detail:earnings-recession-indicators:v1` 유지. 서비스 2행만 별도 `detail:earnings-recession-indicators:bls-wpsfd42:v1`. Worker GET `/api/earnings-recession-indicators`는 두 저장 본문을 각각 checkpoint/sourceVersion/sourceStoredAt 검증 후 서비스 유효 시 5+2 합성. 서비스 row 부재·위조·손상 시 기존 기본 5행 유지; 기본 저장키를 임의 7행으로 치환하지 않음. 서비스 GET 현재 PRODUCTION 7행, 별도 D1 row/stored_at·PC 원장 성공은 확인되지 않았으므로 **NOT_VERIFIED** (당시 통합 문서에는 WPSFD42 운영 저장 NOT_RUN).

**결론:** R2-09 공식 의미·관측월·t-12 YoY·지표별 공개키/체크포인트 구분 조사 DONE. 이 조사는 운영 PC 수집·D1 게시·API/UI 반영 성공을 의미하지 않음. 기존 저장 5행, E1-R4 위험 A, E1-R5 경제 B·점수/가중치 변경 없음. 신규 Provider calls/SQLite writes/D1 writes/deployment 모두 0.

**LAST PASS:** R2-09 BLS 서비스 의미·계산·C 분리 체크포인트 소스 정합성. **FIRST UNFINISHED:** R2-10 SEC CompanyFacts/XBRL endpoint·rate limit·User-Agent·권리·실수집 경로 조사. **NEXT W05:** 공식 SEC data API/zip·polite request 정책과 기존 원자료/staging 후보의 소유·적격성을 판정, 새 SEC 수집기를 임의 배포하지 않는다.

## 25. R2-10 (2026-11-17 KST) SEC CompanyFacts/Frames/Bulk·Fair Access·User-Agent — 조사 DONE, 운영 호출 요건 HOLD

### SEC 공식 서비스/출처 (과거 E1-R4와 후보 E1-R5 분리)

| 항목 | SEC 공식 문서·현재 계약 | 소스/운영 구분 |
|---|---|---|
| CompanyFacts REST | [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces): `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`, **CIK 정확히 10자리 zero padding**, 인증·API key 불필요. 회사 단위 us-gaap/ifrs-full 재무 태그의 facts 집합 | 실제 W05 정보성 C 후보용 자동 원문 수집 경로는 현장 승인/PC source SHA 및 저장 readback NOT_VERIFIED |
| Frames REST | 동일 SEC 문서: `https://data.sec.gov/api/xbrl/frames/us-gaap/{tag}/{unit}/{CY####Q# 또는 ...I}.json`는 해당 역월 프레임과 가까운 각 회사의 1개 최근 공시값을 집계. 회사 fiscal quarter와 불일치 가능 | E1-R4 `lib/market-score/sec-earnings-e1-r4-provider.mjs` blob 03538cbbd84011b78a48d6d9a94f053034a8098d는 **Frames**에 4동시 fetch. 위험 A 기존 계산 경로이며 별도 C CompanyFacts 후보와 대체/합산 금지 |
| Bulk | `https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip`는 CompanyFacts 및 Frames API data의 bulk ZIP, **통상 매일 약 03:00 ET 재작성**; 실시간 CompanyFacts REST와 갱신 시각이 다름 | `scripts/pc-writer/earnings-r5-official-refresh-r1.mjs` blob bbe9f5e5500e77b2263b3a13baf5fea87c44774b: archive 다운로드·sha/CIK matching 및 연구 `manual-input/e1-r5/incoming/companyfacts` staging 후보, **기본 DRY_RUN_NO_NETWORK/researchOnly=true/productionActivation=false**. 코드 존재와 실제 PC 운영 성공은 다름 |
| 제출 이력 | `https://data.sec.gov/submissions/CIK##########.json`는 개별 회사 공시 이력, CompanyFacts 수치 JSON과 다른 API | 두 API를 동일 raw dataset/관측일로 오인 금지 |

### Fair Access·권리·운영 격차

1. [SEC Developer/Privacy Policy](https://www.sec.gov/about/privacy-information), [웹마스터 FAQ](https://www.sec.gov/about/webmaster-frequently-asked-questions), [Accessing EDGAR Data](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)는 **전체 호출원을 합쳐 10 requests/sec 이하**(여러 머신/호스트·도구 합산), 필요한 만큼만 효율적으로 내려받고 요청을 정체 가능한 **회사/담당 연락처 User-Agent** 표기를 요청. BLS/FRED와는 별도의 SEC Fair Access 적용. 응답 429/403을 임의 우회·무한 재시도하지 않음.
2. `lib/market-score/sec-earnings-e1-r4-provider.mjs`의 현행 상수 `SEC_UA='ZGMINI/1.0 (+https://zgmini.kr)'`는 프로젝트명/사이트는 있으나 SEC 공식 예시의 **담당 이메일/연락처 식별자가 명시되지 않음**. UA 식별 요건의 실제 운용 수용 여부는 `HOLD_USER_AGENT_CONTACT`; 이미 제출된 합법 요청까지 위반했다고 판정하지 않음. 운영 비밀/이메일 주소를 문서·로그에 임의 공개하지 않음.
3. 같은 소스의 `mapLimit(specs,4)`는 **동시 요청 수** 제한이지 전체 경로의 **10req/sec rate limiter** 증명이 아님. R2-10에서는 이 수집기가 실제 운영 소스인지, 다른 SEC 작업과 합산 속도를 지켰는지 `NOT_VERIFIED`. 소스 교체·토큰 재입력 없이 운영 전체 SEC 공통 quota와 source owner 책임으로 후행 판정.
4. SEC 공공 API는 인증·키 없이 무료 열람 가능, 2021 SEC 공식 발표에서도 외부 개발자가 투자자 웹앱에 활용할 수 있다고 명시([SEC 발표](https://www.sec.gov/newsroom/press-releases/2021-159)). 그러나 제출자가 보유한 개별 공시/첨부자료 권리까지 무제한 복제·원문 재게시를 보장한다고 해석하지 않음. ZGMINI 승인 공개 D1은 기존 원칙대로 비민감 집계/파생/최소 checkpoint만, raw facts/대량 회사별 시계열은 PC 원본 보관.
5. `data.sec.gov`는 **브라우저 CORS 미지원**이며 방문자 GET로 직접 SEC 호출 금지. 로컬 승인 source 수집 → SQLite/원본 → 저장 계산 → 승인 결과만 D1 게시 → Worker/API/UI 읽기.

**R2-10 판정:** 공식 CompanyFacts/Frames/bulk 정확 URL·익명 접근·갱신 일정·User-Agent/10req/sec·수집/공개 경계와 소스 차이를 확정해 **조사 DONE**. SEC E1-R5 C 실PC 수집, header/combined rate 준수, raw archive SHA·컴퓨팅/게시 ledger, Production 동치는 후행 R2-11/13·R3-15·R4~R6에서 별도 확인. `HOLD_USER_AGENT_CONTACT`와 `HOLD_GLOBAL_SEC_RATE_LIMIT`은 승인 없는 SEC 운영 수집 확대를 막는 범위 한정 요건이고, BLS/QFR 독립 완료 작업을 차단하지 않음.

**LAST PASS:** SEC 공식 무료 JSON/bulk와 Fair Access/연락처 UA 기준 및 기존 E1-R4 Frames/E1-R5 연구 source 분리. **FIRST UNFINISHED:** R2-11 각 issuer CompanyFacts 회계 태그/period/중복·개정/coverage 정합성. **NEXT W05:** SEC 공식 facts 필드 `start/end/val/unit/fy/fp/form/accn/filed/frame` 및 사후수정/발행기간, 해당 CIK 표본 coverage를 기존 code·증거와 대조. 신규 대량 SEC 요청·PC/D1/배포 변경 없음.

## 26. R2-11 (2026-11-17 KST) SEC CompanyFacts 재무 항목·기간·중복/개정 규칙 소스 진단 — PARTIAL_SOURCE

**정책/정의:** [SEC EDGAR 공식 XBRL API 명세](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)는 companyfacts/CIK##########.json의 회사별 us-gaap 및 개별 fact, Frames의 calendar-aligned 집계가 **회계분기 종료일이 제각각인 발행사들을 근사 집계**한다고 명시. 둘을 같은 재무기간·동일 샘플이라고 간주하면 오류가 생긴다. 개별 fact에는 `start`·`end`·`val`·`filed`·`accn`·`fy`·`fp`·`form`·`frame` 같은 기간/공시 계보와 us-gaap 단위 USD·USD/shares가 있다. 제출 시각/제출 문서 단위와 실적 관측기간을 구별한다.

**기존 코드 대조:** `lib/market-score/earnings-e1-r5-input-contract.mjs` blob `98dc56527c3522fcbc34317f0af1696f99d1e1a2`의 출처 허용 forms [10-Q,10-K], EPS diluted tag `EarningsPerShareDiluted` (USD/shares 또는 USD-per-shares)와 revenue/operating income/net income/cashflow/capex USD. `lib/market-score/earnings-e1-r5-fiscal-inputs.mjs` blob `a9971a34920f9e265ffa4523cd3583206065dfc6`: `filed<=asOf`, `start/end` duration/관측분기, `tag|unit|start|end` 동일키 grouping, 수정일 latest-filed 우선·같은 시각 상충값 `LATEST_FILED_VALUE_CONFLICT`로 결측(임의 한 개 채택 금지). 동분기 길이/종료일과 전년 같은 분기 geometry 검증. 분기 실적 직접 공시 우선, FY-to-date 누적값만 있으면 **같은 tag/unit/start**의 직전 누적값 차감으로 단일분기 flow 추출; 임의 Q4 raw로 변환 금지. `fy/fp`는 `DIAGNOSTIC_ONLY`, 실제 `start/end`를 대체하지 않음. 금융회사 영업현금흐름/마진 등 미적합 항목은 별도 결측 처리.

**기존 소스 리뷰 결과:** `lib/market-score/sec-earnings-e1-r4-provider.mjs` blob `03538cbbd84011b78a48d6d9a94f053034a8098d`는 다른 E1-R4 **Frames** 4요소 경로; E1-R5 research용 `earnings-r5-official-refresh-r1.mjs`는 특정 CIK 집합의 `companyfacts.zip`을 선별 staging하지만 기본 dry-run. `earnings-r5-sec-cross-filing-audit.mjs` blob `768ce104a9674a80cedd16be440fe1f50c2e268a`는 guidance의 **동일 발행사/대상기간/metric/basis/unit** 비교 가능쌍과 coverage를 계산하되, 가이던스 커버리지는 CompanyFacts S1/S2 재무 태그 커버리지와 **다르므로 숫자 대체 불가**.

**현재 FIRST FAIL / 실제 범위:** 2026-11-17 현재 확인된 GitHub 브랜치에는 회사별 실 PC CompanyFacts JSON의 현재 목록/원본 SHA·issuer universe 분모·태그별 numerator·비교가능쌍을 뒷받침하는 Runtime TXT/JSON가 없음. 현재 제어 `zgmini-pc-control/main` `config/operations.json` blob `0197f4814d9cc0ff051559b9848a2df9fd0d86b2`에는 이 SEC CompanyFacts **정확한 표본 커버리지 A 작업**이 등록돼 있지 않음. 다른 operation에 명령을 주입하거나 승인되지 않은 원격 Shell, 새 수집·운영 DB 읽기를 실행하지 않음. **R2-11은 SOURCE SEMANTICS VERIFIED / RUNTIME_COVERAGE_NOT_VERIFIED, 따라서 PARTIAL_SOURCE; 완료율 20/82 유지.**

**다음 필수 실행(작업 담당 W05):** 기존 SEC E1-R5 연구 결과·PC 소유자가 남긴 안전한 coverage JSON/TXT가 이미 있는지 `issuerUniverseCount`, `sourceSha256`, 태그별 current/prior/comparable/missing·conflict 기준을 가진 실제 실행 receipt로 조사. 없다면 본 단계에 한정한 **공식 공통 read-only 경로/승인**에 맞는 최소 범위 수치 검증을 원담당이 구성하고, 기존 원본을 변경하지 않는 원격 readback 성공을 확인한다. 필요한 source/권한 미충족이면 R2-11 단계는 PARTIAL/BLOCKED로 유지하고 독립 업무만 진행; 무작정 DONE 처리하거나 다음 순번 완료율을 끌어올리지 않는다. 운영 API 요청 0, PC/SQLite/D1/Production 쓰기 0.

## 27. R2-11 (2026-11-17 KST) 기존 PC issuer 분모 회수·공통 선택 함수 기반 무효정보 방지 감사 — SOURCE_ONLY DONE, 전체 PARTIAL_SOURCE

### A. 기존 승인 Runtime 증거의 정확한 범위

- **PC 운영 A 실제 원본:** [zgmini-pc-control #1401](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1401#issuecomment-6885175399) / [GitHub Actions #43648101352](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43648101352) / [원격 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43648101352-1-seat-3.json), requestId `pc-68f33d6d-c6a1-4a15-8aa7-32e829723195`, operation `source-inventory-runtime-readonly`, 2026-11-14 UTC.
- 결과 **전체**는 `STATE_UNKNOWN/SOURCE_INVENTORY_PARTIAL_READONLY`(history.sqlite 검사 `WAL_SIDECARS_ABSENT_UNVERIFIED`), 그러나 **core.sqlite 하위 검사**는 `PASS/STORED_INVENTORY_READONLY`, `sqliteOpened=true`, `providerCalls=0`, `operationalWrites=0`, `d1Writes=0`. *전체가 PASS했다고 쓰지 않는다.*
- `core.earningsUniverse` : `latestPeriodEnd=2026-06-30`, `reportedSecurityCount=503`, `reportedIssuerCount=500`, `retrievedAt=2026-11-14T14:30:22.977Z`. 이 **500은 E1-R4 기존 실적 원장의 보고 발행사 모집단**이지 SEC E1-R5 CompanyFacts 회사별 유효 관측쌍의 검증 완료 500/500이 아니다. 증권 수 503을 issuer 분모로 잘못 사용하는 것도 금지. 오래된 분기의 모집단을 2026-11 신규 공시 커버리지로 표현하지 않는다.
- 제어 main `config/operations.json` blob `0197f4814d9cc0ff051559b9848a2df9fd0d86b2` 확인: `source-inventory-runtime-readonly`는 earnings **모집단 요약**만 허용, CompanyFacts 원본별 tags/sha/comparable ratio까지 반환하지 않음. 새 함수를 기존 A allowlist에 동적으로 삽입·다른 기능에 원격 shell 명령으로 우회할 수 없음. 기존 이슈를 중복 재실행하지 않음.

### B. 최소 개발 구현 (무승인 PC 실행·공통 Controller 변경 없음)

- 새 순수 감사 모듈: [scripts/pc-writer/earnings-r5-sec-facts-coverage-readonly.mjs](../scripts/pc-writer/earnings-r5-sec-facts-coverage-readonly.mjs) — GitHub commit [884cefbb](https://github.com/ansqhd5774-Choi/zgmini/commit/884cefbb616d1d1dff727bb2f535c719870a196e), blob `dedea37419170ece02e68d827f82808bb79665d0`. **직접 실행 진입점 없음, PC 파일 IO 없음, 공급자/네트워크/DB/게시 호출 없음.**
- 기존 승인 `E1_R5_SEC_CONTRACT.tags`의 **EPS/revenue/operatingIncome/netIncome/operatingCashFlow/capex** 항목과 `selectFiscalComparablePair` / `selectFiscalCurrentQuarter` / `validateSecCompanyFactsDocument`를 그대로 재사용한다(산식·기간 허용범위 신규 정의 없음).
- 지정된 신뢰된 PC Source Owner가 추후 이미 **저장된** `readSource(cik)`를 주입할 경우, 1~600건 unique 10-digit CIK, asOf, 32MB/파일 한도, 실제 bytes로부터 SHA256 산출·선택적 사전 고정 hash 비교, CIK 일치/JSON 검증, current/prior 비교가능 issuer 숫자·결측·중복/상충 집계, fraction 분모 보존. **raw 개인/회사자료·CIK/기업 개별값은 반환하지 않음.** 확인 불가능한 원문은 0건으로 대체하지 않고 누락·거부 건수로 분리.
- 컴퓨터에 파일을 읽고 값을 반환하는 CLI/CMD/새 작업 등록/인증 호출을 이번에 만들지 않는다. 원본 `companyfacts.zip` SHA와 공식 공급자 vintage 진위도 현재 helper 단독으로는 인증 불가(`sourceArchiveShaVerified=false`), 산출된 per-file 해시를 공급자 원본 확인이라고 표기하지 않는다.

### C. 격리 검증·첫 미완료

- 테스트 소스 [tests/earnings-r5-sec-facts-coverage-readonly.test.mjs](../tests/earnings-r5-sec-facts-coverage-readonly.test.mjs) commit [667ba9b](https://github.com/ansqhd5774-Choi/zgmini/commit/667ba9b953e98a792034dc950bc17a87c6242af3). 예상 검증 5건: ① 3개 모집단 2개 로컬 파일/1개 누락의 current vs comparable 숫자 ② 파일은 있지만 외부 SHA pin 없음 ③ SHA/JSON 오류 격리 ④ 같은 공시시각 상충 재무값 배제 ⑤ 중복/잘못된 CIK 중단.
- 이번 회차 **실제 GitHub의 세 원본 blob**(input-contract/fiscal-inputs/new coverage module)을 V8 sandbox에 컴파일하여 기존 SEC 선택 함수로 위 5개 시나리오를 검증 → **5/5 PASS**. 단 V8에서 Node `Buffer`/SHA256는 격리용 shim을 사용했으므로 **Node 정식 `node --test` 통합 실행·실 PC 파일 해시 판정이라고 보고하지 않는다**. 새 소스 2개를 실제 GitHub 브랜치에서 remote readback했다. 실행환경/SDK가 다르면 관련 회귀시험 정식 실행 필요.
- **LAST PASS:** W05 CompanyFacts source/provenance 범위 감사 코드 + 5/5 소스 수준 격리 테스트, 기존 PC Core 발행사 500 분모. **FIRST FAIL / BLOCKER (R2-11만):** 실제 저장된 CompanyFacts raw ZIP·per-file bytes/외부 pin·500 CIK 매핑을 읽을 **설치된 승인된 정확한 PC 동작 범위 없음**. 이를 `AUTOMATION_BLOCKED`로 분류하며 수집기 RUNTIME_FAILED/실제 raw 미존재라고 추정하지 않음. **DONE은 20/82 유지.**
- **다음 필수 실행 하나(원담당 W05 / 승인된 Source Owner):** 기 설치된 운영 원장·저장 raw/CIK 파일 위치와 기존 정규 유지보수 read-only 입력 허용 범위를 확인해, 500 issuer universe 대비 각 metric 현재·전년동기 쌍 수와 mismatch·소스 archive SHA를 기존 승인된 A 또는 B 안전 경로로 1회 조회한다. 기존 승인 범위가 없다면 **정확한 읽기 전용 범위만** 별도 승인되기 전까지 단계 한정 `AUTOMATION_BLOCKED`, 다른 후보 독립 실행은 보존. 다른 대화의 Controller 재설치·PC 전체 검사·정규 수집을 선행조건에 넣지 않는다.

## 28. R2-11 (2026-11-17 KST) SEC 최신 분기 비교쌍·결측 0 오인 실결함 2건 수정, 9/9 검증 — PARTIAL_SOURCE 유지

**기존 완료 근거:** §27의 운영 PC 원격 [#1401](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1401#issuecomment-6885175399)는 2026Q2 source Core SQLite의 `issuer_count=500`/`security_count=503`만 증명, CompanyFacts 개별 로컬 파일의 존재/유효시계열까지 증명하지 않음. 기존 E1-R4 A 수집·E1-R5 B 연구·C 후보 SEC CompanyFacts를 동일 소스로 혼용하지 않는다.

**LAST FAIL 1(실제 소스 함수를 사용해 재현):** `selectFiscalCurrentQuarter`가 2026-09-30의 신규 매출을 선택하고, 전년 2025Q3의 해당 개별값이 없을 때 `selectFiscalComparablePair`는 2026-06-30/2025-06-30의 *과거* 유효쌍을 반환할 수 있었다. 최초 감사 모듈은 두 결과가 같은 최신 분기인지 검사하지 않고 comparable issuer에 1을 가산. 이는 해당 발행사의 최신분기 커버리지를 부풀린다. **수정** [3f47d77](https://github.com/ansqhd5774-Choi/zgmini/commit/3f47d77ffd203695020fd4fd8e9b132fbd51c174): 최신 인정 사실과 pair.current의 `tag/unit/start/end` 모두 일치할 때만 comparable로 집계. 불일치 시 `olderPairExcludedIssuerCount`로 투명하게 분리, 기존 공식 fiscal 선택함수·점수산식 변경 0.

**LAST FAIL 2(결측 의미 오류):** 최초 감사 모듈은 CIK 파일 일부 또는 전체 미확인에서도 `currentCoverage=0` 같은 비율을 확정 숫자로 반환할 수 있었다. 이는 실제 관측된 유효 기업 0개와 파일을 열지 못한 상태를 혼동한다. **수정** [deb123f6](https://github.com/ansqhd5774-Choi/zgmini/commit/deb123f6bac22cc9e2a7c9e3a6dec0c0bdc683e6): 최소 한 개 파일 누락·거절이면 `sourceCoverageComplete=false` 및 `currentCoverage=null`, `comparableCoverage=null`로 반환. 확인된 출처별 관측 숫자는 `currentIssuerCount` 등과 `currentCoverageLowerBound`·`comparableCoverageLowerBound`로만 표시. 모든 모집단 파일이 유효하게 읽혀야 관측된 진짜 0% 가능. 외부 callback에서 *제공*된 SHA값과 실제 bytes 일치도 공식 SEC bulk ZIP SHA/vintage의 독립적 검증이라고 할 수 없으므로 `providedSha256Matched`로 정확히 표현, `sourceArchiveShaVerified=false` 보존. 모든 파일 결측 시 `aggregateContentSha256=null` 처리.

**수정 시험:** 테스트 파일 [5f77743](https://github.com/ansqhd5774-Choi/zgmini/commit/5f77743eface5abf361472f7c1c0621d5bb06fd8) 및 [d9b3344](https://github.com/ansqhd5774-Choi/zgmini/commit/d9b3344d09bb1bf7717f15da03adace81cc117f6)에서 작성된 실제 `tests/earnings-r5-sec-facts-coverage-readonly.test.mjs` 9개 케이스(분모 3중 2개 유효/1개 미확인, SHA 미검증, 해시·JSON 불일치, 동일시각 서로 다른 공시값, 중복 CIK/잘못된 날짜, 최신 Q3 불일치 Q2 과거쌍 배제, 최신분기 정상 비교쌍 유지, 전체 파일 확인된 실제 0, 전체 파일 없음→null). 원격 최신 파일 직접 fetch 후 소스 원형과 기존 `E1_R5_FISCAL_POLICY`·선택함수를 V8에서 평가하고 실제 **작성된 9개 테스트 본문 실행 9/9 PASS**, 버퍼/암호화는 범위 제한 JS shim(형식/비교 기능 검증용). 원본/테스트 소스 blob `f2cc246ba0252cfd598382cf33cf9168b2785235` / `e16b86ee2622a4f913d98cddb744b3508bb93384`; **Node `node --test` 정식 시험, 실제 PC raw SHA 확인, Runtime 적용 아님**.

**현행 보류/next:** 이 작업에 설치된 승인 PC A `config/operations.json`의 `source-inventory-runtime-readonly`는 모집단 요약까지만 허용한다. 신규 감사 source는 원담당 승인 source와 500 issuer 파일 bytes/`readSource`·기존 SEC ZIP SHA pin을 제공받지 못했으므로 진짜 파일별 numerator와 coverage 확정 불가. R2-11은 `PARTIAL_SOURCE / AUTOMATION_BLOCKED`(해당 실행만), **20/82(24.4%) 유지**, R2-12로 순차 포인터 임의 변경하지 않음. **다음 실제 필수:** 기존 승인된 Node/CI의 정식 테스트 9건을 통과시킨 뒤 PC Source Owner가 이미 저장한 SEC 원본만 읽는 정확한 기존 허가 범위/정규 A/B를 확인하여 안전 JSON/TXT 원격 readback; 미설치 작업을 원격 shell/임의 pc-job operation으로 우회하지 않는다. provider API 호출·운영 SQLite/D1/Production 쓰기 0.

## 29. R2-11 (2026-11-17 KST) 384-commit 브랜치 충돌 회피·2파일 선별 PR CI 재현 — NODE_CI_RUNNING, R2-11 PARTIAL_SOURCE

- **정합성:** 전담 소스 브랜치 `codex/api-site-integration-r1-20261026`는 `main`과 diverged(비교 당시 `ahead=384`, `behind=734`, 조회 표시 changed files 300개 상한). 직접 W05 전담 브랜치 전체 PR은 무관한 변경·다른 작업자의 소스를 포함하므로 실행하지 않음.
- **대안 실제 실행:** 최신 main `e9d212660dfa9955fd3370de5cd68e856f84d093`에서 `codex/w05-sec-r2-11-audit-ci-20261117` **새 선별 브랜치**, 2파일만 복제. (1) `scripts/pc-writer/earnings-r5-sec-facts-coverage-readonly.mjs` blob `f2cc246ba0252cfd598382cf33cf9168b2785235` (2) `tests/earnings-r5-sec-facts-coverage-readonly.test.mjs` blob `e16b86ee2622a4f913d98cddb744b3508bb93384`. 두 upstream fiscal dependency 파일은 main과 전담 branch의 동일 blob `98dc565... / a9971a...` 확인, 변경 0.
- **실제 원격 selective 검증:** [Draft PR #1200](https://github.com/ansqhd5774-Choi/zgmini/pull/1200), head `d79a1e67febbd747529e36fb015a3cba80abd002`, base main `e9d21266...`, `compare_commits(base exact,head): ahead=2, behind=0, files=2`. **Draft이며 병합·승인·운영 PC 반영·Cloudflare 배포 없음.** 기존 전담 브랜치와 진행 기록은 보존.
- **정식 Node CI 진행 증거:** [Node.js CI Run #43986522255](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43986522255), `pull_request` event, job `check` id `133715972812` GitHub Actions Ubuntu Node 24: `npm ci`, `npm run build`, public asset upload, `npm run typecheck` 순차 **SUCCESS**. `node --test tests/*.test.mjs`는 **IN_PROGRESS**(아직 pass/fail 확인 안 됨); 이어지는 PC publication regression도 미확정. 이전 V8 9/9은 Node CI 9/9 확인으로 승격하지 않음.
- **현재 단계만 미완료:** PC `source-inventory-runtime-readonly` 실결과 [Issue #1401](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1401)에서 **2026Q2 발행사 500** 분모는 이미 확보됨. 이 A operation의 schema는 원본 CompanyFacts 파일 SHA/태그별 분자를 반환하지 않음. 재요청은 새 증거를 만들지 못함. `AUTOMATION_BLOCKED`는 정확한 승인된 PC 원본 reader 경로만의 미충족이며 CI/다른 독립 기능의 Gate 아님.
- **FIRST UNFINISHED / NEXT:** 현 GitHub Run의 진짜 `regression tests` 완료 결과를 재조회·반영한다. 이후 신규 운용용 등록 없이 기존 승인된 PC Source Owner의 정규 A/B 또는 readback 가능 경로를 확인해야 실제 R2-11 `issuer valid/comparable coverage`를 DONE 판정할 수 있다. 운영 재수집/SQLite/D1/API/배포 0. `20/82 DONE (24.4%)` 유지.

## 30. R2-11 (2026-11-17 KST) 선택 2파일 PR Node24 정식 CI 결과 확인 — SOURCE_AND_NODE_TEST_DONE, 운영 R2-11 PARTIAL_SOURCE

**정식 검증 결과:** [Draft PR #1200](https://github.com/ansqhd5774-Choi/zgmini/pull/1200) two-file exact head `d79a1e67febbd747529e36fb015a3cba80abd002`, [GitHub Node.js CI Run #43986522255](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43986522255) **status=completed / conclusion=success**, job `check` ID `133715972812` completed/success (2026-11-17 00:20 UTC). `on: pull_request`로 Ubuntu GitHub runner Node **24**의 실 코드 빌드 + 회귀 테스트를 통과. 사용자의 Windows PC에서 실행되었다는 뜻은 아니다.

| 단계 | Actions 검증 결과 |
|---|---|
| `npm ci` + `npm run build` | **PASS** |
| Public CSS/JavaScript artifact 저장 | **PASS** |
| `npm run typecheck` | **PASS** |
| `node --test tests/*.test.mjs` 전체 regression | **PASS** |
| W05 SEC 신규 테스트 9건 | **9/9 PASS** — job log의 각 `✔` 독립 확인: 전체/부분 모집단, 제공 SHA vs 원본 provenance, SHA·JSON 실패, 상충, 잘못된 CIK·날짜, 오래된 Q2 페어 배제, 최신 Q3 정상 페어, 진짜 0%, 파일 미확인 null |
| PC publication recovery regressions | **PASS** (CI 격리 소스 검증이며 PC 운영 writer 실행 아님) |
| Cloudflare candidate read contracts | **PASS** (테스트 성공이며 D1/Production 갱신 아님) |

**소스 기록/운영 경계:** 본 CI는 브랜치 diff가 정확히 2파일인 새 **Draft PR**에서 수행, 병합·main 변경·운영 PC 파일 설치·실제 Provider/SQLite/D1/배포 쓰기 없음. R2-11 완료 기준의 **실제 로컬 E1-R5 CompanyFacts 500 CIK 원본 파일별 존재/원본 ZIP SHA·각 회계지표 current/prior valid issuer 수**는 아직 해당 PC의 승인된 readSource 경로/원격 TXT·JSON 증거가 없으므로 `AUTOMATION_BLOCKED` 범위 유지. 기존 Source Inventory A의 500분모만으로 500/500 SEC 값이 있다고 주장하지 않음. `source-audit` A도 GitHub commit/branch SHA만 검사할 뿐 로컬 CompanyFacts를 열지 않으므로 재요청 불필요.

**LAST PASS:** 소스 2파일·Node24 실제 CI 정식 9/9/전체 테스트 PASS·원격 Actions 상태/로그/HEAD 일치. **FIRST UNFINISHED:** 정규 승인된 저장 raw read-only adapter/PC 소유자 원본 및 archive vintage 확인. **NEXT:** PC/Source owner의 기존 B 유지보수 또는 승인된 A 경로 안에서 readSource, 500 CIK 원장·원문 ZIP SHA·관측기간·값 정합성 범위를 특정하고 안전 readback으로 실제 측정. 신규 operation 임의 등록/원격 쉘 우회 불가. R2-11 `PARTIAL_SOURCE`; 완료율 **20/82(24.4%)** 그대로 유지. 담당 W05, 독립 단계 업무는 공유 Controller 대기와 별도로 진행한다.

## 31. R2-11 (2026-11-17 KST) R2 적격성 판정 종료 — SEC_COVERAGE_HOLD, DONE(DECISION_ONLY)

**계획 기준 재대조:** `docs/EARNINGS_RECESSION_R1_R6_82_STEP_EXECUTION_PLAN_20261116.md`에서 R2는 "공급자 API·사용 권리·시계열 검증(13단계)", SEC R2-11의 완료 증거는 `fiscal period·단위·개정·기업별 비교 가능성 판정`이며, "한 후보 HOLD는 독립 후보의 진행을 막지 않는다." R3의 목적과 완료 기준은 운영 PC 실원문→SQLite 저장/checkpoint→재조회→저장 계산 검증이고 R3-15는 **적격 판정 시에만** SEC 저장·정규화·중복 제거. 즉 R2-11의 **실무 결론이 "HOLD, 현재 CompanyFacts 원천 후보 적용 부적격"**이면 판정을 닫고 다음 R2-12로 진행할 수 있다. 기존 진행 §26~§30의 실증 미완료 증거는 삭제하거나 변경하지 않으며 이번 §31이 후행 결론.

**공식 정의/소스 검증:** [SEC XBRL CompanyFacts API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)에서 issuer CIK 10자리, us-gaap fact per tag/unit `start,end,val,filed,accn,fy,fp,frame`을 사용하고 company fiscal quarter를 frame calendar quarter로 대체하지 않는다. 기존 `E1_R5_FISCAL_POLICY` 및 companyfacts 9 시나리오 **정식 Node 24 CI**(GitHub [Draft PR #1200](https://github.com/ansqhd5774-Choi/zgmini/pull/1200), [Run #43986522255](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43986522255), head `d79a1e67`) = full PASS. Q3 최신값 대비 Q2의 이전 비교쌍 오인, 결측 상태를 0%로 표기하는 오류 해결.

**실측 근거와 정확한 미검증:** 기존 승인 A [Issue #1401](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1401#issuecomment-6885175399) Core SQLite report `period_end=2026-06-30`, `reportedSecurityCount=503`, `reportedIssuerCount=500`, `retrievedAt=2026-11-14T14:30:22.977Z`는 **기존 E1-R3 universe 분모의 당시 관측**이며 E1-R5 SEC companyfacts 개별 파일 유효 태그 수·file SHA·archive vintage의 실측이 아니다. R2-11의 `COVERAGE_STATE=HOLD_NOT_VERIFIED`, 유효 comparables numerator **NULL**, fraction **NULL** (0 아님). SEC 요청 식별 UA와 전체 10req/sec 실제 운영 준수·승인 저장 owner도 HOLD. 새 standalone read-only 모듈만 GitHub에 존재; **실운영 활성화·PC 수집·D1 게시·api UI 전파 금지**. `RUNTIME_FAILED`가 아닌 `AUTOMATION_BLOCKED`는 PC 사실조회의 설치된 정확한 operation 미비에 국한.

**R3 조건부 인계:** R3-15 SEC XBRL 실제 저장은 공식 이용 정책/Source Owner 승인, CIK universe와 CompanyFacts 저장 raw SHA/vintage 및 최신/전년 동분기 유효 기업별 ratio 증거, 공개 대상 데이터 계약이 READY일 때만 수행. 아니면 `HOLD/NOT_APPLICABLE`와 이유를 적고 M3·MTIS 및 다른 독립 조건부 후보/확정된 BEA·QFR·BLS 진행을 막지 않음. R2-11 **DONE은 적격성 판정을 완료했다는 뜻이지 실제 PC/D1/API/UI "DONE"이 아니다**. 신규 작업/PC/SQLite/D1 쓰기 0.

**LAST PASS:** SEC CompanyFacts source·계약·소스 회귀시험/적격성 `HOLD` 확정. **FIRST UNFINISHED (순차):** R2-12 공급자 발표/관측/수집/vintage/delay 계약. **NEXT:** R2-12 출처 기반 날짜/재발표 시계열 비교.

## 34. R3-01 (2026-11-17 KST) 공통 원본 저장계약/시계열·수정·SHA 계보 실소스 검증 — DONE(CONTRACT_ONLY)

**목표/범위:** `provider/dataset/series`, 정확한 **관측기간**, 조회기준/공식빈티지 구분, 원본 **SHA-256/스냅샷 해시**, **최초 저장시각/조회시각**을 체인으로 매핑한다. 각 공급자를 같은 테이블/동일 구조에 임의 끼워맞추거나 모든 후보가 이미 운영 PC에 저장됐다고 추정하지 않는다.

| 공급자 | 실제 소스·계약 값 | 증거 범위/지속성 판정 |
|---|---|---|
| **BLS 3 기본/조건부 서비스** | [`EARNINGS_R3C_BLS_STORE_ONCE.mjs`](../scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs) blob `add5445108361b49c839fcb7eb4ffe2cc08e4ec4`: provider `BLS`; series `WPSFD4`,`WPSFD41`,`PRS85006111`(서비스 `WPSFD42` 별도), `api_history_chunks_v1` 의 `(provider,dataset,chunk_sha256,first_observation_date,last_observation_date,row_count,payload_json,first_seen_at)`; `api_history_snapshots_v1` 의 `(provider,dataset,snapshot_sha256,as_of,retrieved_at,status,history_mode,row_count,latest_observation_date,chunk_hashes_json,provenance_json)`. 독립 chunk hash와 snapshot hash, `as_of`(조회 날짜)와 관측 날짜 분리; BLS API `latest`는 revision ID 아님 → `vintageId:null` | [R3D PC 실제 검증](EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md)의 3 snapshot/hash PASS 재사용. 2026-10 저장본=2026-11 현재 최신 raw를 보장하는 증거 아님. 서비스 원본 별도 PC 미저장/HOLD |
| **Census QFR** | [`EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs`](../scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs) blob `95059aae7122b8442deba14aefe528b9cdc55050`: `provider='CENSUS'`, `dataset='QFR_MFG_US_NSA_AFTER_TAX_MARGIN'`; official ZIP **bytes SHA `232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654`** 별도 검증; ZIP base64·원자료 대상/기간·계산내역 포함 JSON chunk의 추가 sha, `snapshotHash=SHA(contract/provider/dataset/chunk)`, UTC `retrieved_at`, `history_mode='CURRENT_RETRIEVAL_NOT_PIT'`, officialVintageId null | [QFR R2 원시 저장 실 PC](EARNINGS_CENSUS_QFR_RAW_SQLITE_R2_20261027.md) 2026-10-27 14:52 UTC `CHUNKS_INSERTED=1`, `SNAPSHOTS_INSERTED=1`, `SQLITE_COMMITTED=YES`, `PASS_QFR_SQLITE_APPEND_READBACK`; 실행된 실제 PC readback은 이 원장 제출 증거 재사용, D1/현재 2026Q3 원본 미확인 |
| **BEA 단위이익** | [`EARNINGS_BEA_UNIT_STORED_RAW_R1.mjs`](../scripts/pc-writer/EARNINGS_BEA_UNIT_STORED_RAW_R1.mjs) blob `812266af97836edf9e06bae679e363e6546168fb`: 원본 CSV bytes SHA == 파일명 `<sha>.csv`; metadata JSON `sourceVersion=sha`, `sourceStoredAt` 숫자 UTC epoch millisecond, `sourceRetrievedAt` ISO UTC 정확 일치; reader 원자료 SHA·meta+unit/parsing 검증 후에만 payload | **source-only contract DONE**, 실제 운영 archive 파일 입증은 R3-08/09 유지; FRED Graph CSV 라이선스 HOLD 시 공식 BEA 원본 적격성 경로 구분 |
| **BEA 제조업 기업이익** | [`EARNINGS_BEA_MFG_PROFIT_R5_APPEND_ONLY_CAPTURE.mjs`](../scripts/pc-writer/EARNINGS_BEA_MFG_PROFIT_R5_APPEND_ONLY_CAPTURE.mjs) blob `1ab5c59f39f9e45ec3f20f1c208e2c7186289f00`: 원본 CSV SHA `sourceVersion`, 대응 `.csv/.json` metadata `seriesId,sourceUrl,sourceStoredAt,sourceRetrievedAt,latestPeriod,rowCount,unit='BILLIONS_USD_SAAR',historicalMode='CURRENT_VINTAGE_NOT_PIT'`. 새 버전은 종전 파일을 보존하는 append-only | **source-only metadata/sha contract DONE**, 과거 SOURCE/PC 운영 archive readback은 R3-11 완료 기준으로 미이관 |
| **SEC E1-R5 / M3 / MTIS** | 저장 준비/허용 source 미확인. SEC raw companyfacts.zip manifest + issuer CIK·unit/fiscal/filing 독립, M3·MTIS month/revision 각각 별도 provider dataset | R2-11/13 (SEC) 및 R2-06/07/13 (M3,MTIS) `HOLD`; **임의 provider/dataset/시점/SHA 생성 금지**, 실제 API/PC 원자료 업로드 성공이라고 표기 불가 |
| **E1-R4 기존 위험 A** | [`earnings-recession-stored-r4-pc-r1.mjs`](../lib/market-score/earnings-recession-stored-r4-pc-r1.mjs) blob `999ea7da2a62891fa514e184da4fe1d9c2b40db7`: `period_end`, `retrieved_at`, completed_at, `sourceStoredAt`, `historyMode='CURRENT_VINTAGE_NOT_PIT'` 구분 | 점수 A와 정보성 C의 원자료 날짜·sourceVersion / score revision을 혼합 금지, R1-09 분리 계약 재사용 |

**검증 및 주의:**
1. **출처/원문** `provider+dataset+originalSha256`, **저장 청크** `chunk_sha256`, **내용 버전** `snapshot_sha256/sourceVersion`, **관측일** `observationPeriod`, **조회/저장시각** `retrievedAt/firstSeenAt/sourceStoredAt`, **공개** `publishedAt`는 서로 별도. `first_seen_at`이 곧 공급자 공식 `releaseAt`이나 `vintageId`는 아님.
2. BLS와 QFR 공용 `api_history_` 테이블에 서로 다른 provider/dataset namespace로 충돌 방지; BEA CSV는 자체 raw archive+meta reader로 관리하며 같은 SQLite 2-table에 이미 적재됐다고 허위 보고하지 않음.
3. 동일 원본을 저장해서 계산할 때 공급자 재호출 금지. 새 ZIP/공식 CSV와 기존 저장본의 sourceVersion/sha가 다르면 별개 revision 후보로 보관하되 원본/메타 timestamp 불일치 거절. missing/null/0/재수집 실패를 같은 값으로 채우지 않음.
4. 실제 PC 원본은 기검증 BLS 3계열, Census QFR ZIP 저장 증거 재사용. 승인되지 않은 BEA archive 실측/SEC·M3·MTIS 신규 raw 검증은 이 단계 **NOT_VERIFIED/HOLD** 이며 R3-08~R3-15의 실제 조건부 작업을 취소·완료 처리하지 않는다.

**판정:** R3-01 **공통 원본 필드 계약과 시점·출처 계보 증거 대조 DONE**. 공급자 요청/SQLite/D1/Production 실제 쓰기 0, 기존 승인 산식/TTL 변경 0. **NEXT R3-02:** 이미 검증된 BLS/QFR SQLite 2-table의 append-only/수정본·rollback·readback 무결성을 소스·실PC 기존 증거로 재대조한다.

## 35. R3-02 (2026-11-17 KST) SQLite append-only·수정본/중복/rollback·source checkpoint — DONE(CONTRACT+PAST_PC)

**검증 대상:** 운영 E:\\ZGmini\\data\\pc-writer\\storage\\core.sqlite에 기존 사용되는 *두 개* 원본 테이블. 독립 BEA CSV raw archive와 SQLite의 기존 E1-R4 위험 저장 스키마는 변경·교체하지 않음.

- **BLS 저장기 소스:** [`EARNINGS_R3C_BLS_STORE_ONCE.mjs`](../scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs) blob `add54451...`, source `provider='BLS'`, dataset=seriesID(`WPSFD4`,`WPSFD41`,`PRS85006111`); 원본 chunks의 PK `(provider,dataset,chunk_sha256)`, snapshot PK `(provider,dataset,snapshot_sha256)`. 기존 두 테이블/필수 칼럼/트리거 유무 점검 후 **`BEGIN IMMEDIATE`→추가 전 schema 재검사→청크/snapshot `ON CONFLICT...DO NOTHING`→select readback·코호트 hash/provenance 검증→COMMIT; 오류 ROLLBACK**. 원자료 `first_seen_at`, source chunk→snapshot chain, 관측일, as_of/retrieved_at 원본 분리.
- **Census QFR 저장기 소스:** [`EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs`](../scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs) blob `95059aae...`의 동일 두 테이블, `provider='CENSUS'`, `dataset='QFR_MFG_US_NSA_AFTER_TAX_MARGIN'`. CSV에서 계산하기 전 **공식 ZIP 바이트 SHA** 검증, 별도 JSON 청크 SHA + 결정적 `snapshotSha256=HASH(contract/provider/dataset/chunk)`가 동일 공급원 최신 버전이고, 수집 timestamp가 snapshot ID에 들어가지 않는다. 같은 ZIP 재요청 시 insert 0, 원본 개정 시 새 SHA의 새 청크+새 스냅샷을 추가. `CURRENT_RETRIEVAL_NOT_PIT` 보호.
- **실제 코드 회귀시험 범위:** [`EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.test.mjs`](../scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.test.mjs) blob `de3f5c296878fed643a0dd5a556642d64b6e0f9c`: 원본 ZIP bytes와 SHA 일치, `same ZIP rerun idempotent and revision creates a new original + new snapshot`, 타 `CENSUS` namespace 침범 거부, 다른 `BLS` provider 불변, primary key/trigger 손상 거부, snapshot INSERT 실패 시 chunk 전부 롤백. 기존 고립 source 테스트를 완료 증거로 재사용하며 이번 대화에서 이를 새로운 PC 실제 테스트 결과로 둔갑시키지 않음.
- **이미 입증된 실제 PC 과거 결과:** [2026-10-27 Census QFR R2 승인 저장](EARNINGS_CENSUS_QFR_RAW_SQLITE_R2_20261027.md)의 `PASS_QFR_SQLITE_APPEND_READBACK`, `CHUNKS_INSERTED=1`, `SNAPSHOTS_INSERTED=1`, `SQLITE_COMMITTED=YES`, 원본 ZIP SHA `232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654` 전후 보존. [2026-10-27 BLS PC R3D](EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md) `SNAPSHOTS_HASH_VERIFIED=3`, `RAW_UNMODIFIED=YES`, `SQLITE_WRITES=0`의 기존 read-only 검증 재사용. 현재 운영 PC가 같은 SHA/source 상태로 실행 중이라는 증거까지 재추정하지 않음.
- **충돌/권한 보호:** 이미 존재하는 table/PK/trigger와 타 제공자 데이터 외형을 임의 바꾸지 않음. 수정 데이터는 원본의 새 SHA와 수집일/관측일이 같이 일치할 때만 새로운 버전으로 간주; 같은 시각 상충 SHA 선택은 reader 차원 안전 거부. 동일 SQLite 대상 공유 쓰기를 임의로 병렬 실행하지 않음. 기존 백업·원장 삭제/초기화/lock 해제 없음.

**R3-02 판정:** 기존 저장 계약/읽기 무결성·원장 재사용 확인 DONE. 운영 최근 시점에 새로운 실제 데이터를 수집했다는 결론이 아니라, **이미 검증된 BLS+QFR append-only 불변 저장 기제가 유지되는 설계·source 증거를 재사용**한 것이다. 신규 provider calls/operationalWrites/SQLite/D1/Cloudflare deploy=0. **NEXT R3-03:** BLS 3개 기존 PC 저장자료 계산 성공을 단위·YoY·해시 수준으로 마감.

## 36. R3-03 (2026-11-17 KST) 기 검증 운영 PC BLS 세 시계열 저장·계산 성공 증거 재사용 — DONE(PAST_PC_RUNTIME)

**원본 실제 PC readback 출처:** [`EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md`](EARNINGS_COMPANION_R3D_PC_RESULT_VERIFIED_20261027.md) blob `8f67bffb494fe26591e80065bdd57585324bb3d7`, 사용자 운영 PC 생성 TXT `EARNINGS_R3D_STORED_BLS_CALC_RESULT_20261026-182033Z.txt`. `RESULT=PASS_R3D_STORED_ONLY_CALCULATION`, `SNAPSHOTS_HASH_VERIFIED=3`, `DATA_COHORT_CONSISTENT=YES`, `NEWER_INCOMPLETE_COHORT=NO`, `RAW_UNMODIFIED=YES`. PC raw fetched timestamp `2026-10-26T17:02:53.996Z`, 검증기 run `2026-10-26T18:20:33.046Z`.

| series | validated stored period | rows/missing | method/observed raw & derived | valid 12-month pairs |
|---|---|---|---|---|
| BLS `WPSFD4` | 2025-01 .. 2026-09 SA monthly | 21 / 0 | 2026-09 SA index `159.780`, source stored index ratios derive **6.346301% YoY** | 9 |
| BLS `WPSFD41` | 2025-01 .. 2026-09 SA monthly | 21 / 0 | 2026-09 SA goods index `162.341`, own ratio **9.772194% YoY** | 9 |
| BLS `PRS85006111` | 2025Q1 .. 2026Q2 SA quarterly | 6 / 0 | BLS raw **+1.4% from same quarter year ago**, already YoY. No additional derived quarter/annual conversion | N/A |

**검산 코드 출처:** [`EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs`](../scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs) blob `196f6262b34b4f6df21f284810629e29e95c6d22`: 원본 `provider=BLS` 3 ID만 read-only SELECT, snapshot SHA computed from `contract/provider/dataset/chunk`, chunk JSON SHA computed from immutable bytes, 공식 vintage null·unit/SA/observationPeriod·row_count, duplicate/gaps, single `retrieved_at|responseSha256` cohort, t-12 month for PPI, original YoY for ULC. 두 series가 발표문 NSA YoY와 근접한 것을 동일 계열 직접 검증했다고 하지 않는다.

**정확한 완료 범위:** 2026-10 PC에 **이미 저장된 당시 original** 3개 source의 integrity/계산 read-only 실증 완료. 이 요청에서 PC/원자료/API 호출·재수집·재계산·D1 쓰기 수행한 사실 **없음**. BLS 2026-11 관측은 개정 또는 2026-10 발표로 바뀌었을 수 있으며 위 2026-09 지수를 "현재 최신"이라고 표시하지 않는다. `Revisions=UNDETERMINED_NO_OFFICIAL_VINTAGE` 유지. **2026-11 현행 Production D1/GET/UI 서비스 통합 및 WPSFD42 2행**은 별도 후행 게이트.

**NEXT:** R3-04는 **BLS WPSFD42 서비스 원본** (기본 3과 별도) 의 기존 승인된 수동 B PC 원본 저장/실제 SHA readback 필요. 이미 설치/승인된 Collector 경로부터 확인하고 신규 cron/Controller 무단 설치·권한 우회 금지; source/approval 미충족이면 그 단계만 BLOCKED로 기록하고 무한 실행하지 않는다.

## 37. R3-04 (2026-11-17 KST) WPSFD42 서비스 전용 수집 source/Node CI 검증 — PARTIAL_SOURCE, 운영 승인·PC 저장 미검증

**목표와 완료 조건:** 계획서 R3-04는 `WPSFD42` 서비스를 **기존 승인된 수동 PC 공급자 API 수집 → 기존 운영 SQLite 원문 저장 → 실제 `chunk_sha256`, `snapshot_sha256`, `retrieved_at`·원본 관측기간·source checkpoint 재조회**로 입증해야 DONE. 2026-10-27 BLS 공개 HTTP 조회의 당시 2026-09 지수 157.666/2025-09 지수 150.273은 실제 PC 저장 증거가 아니다. 3기본 BLS 원천의 기검증 PC 완료 R3-03도 WPSFD42 저장을 뜻하지 않는다.

**기존 소스 계약/권한 조사:**
- 원담당 작업 브랜치 `scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs`, blob `add5445108361b49c839fcb7eb4ffe2cc08e4ec4`: 기존 3 series BLS raw와 별도 `SERVICE_SERIES=['WPSFD42']`, `--services-only --dry-run`(원장/DB 쓰기 0, 그러나 **BLS v2 API 한 번 실제 네트워크 POST**), `--services-only --apply --confirm-service-sqlite-append`(실제 운영 DB append-only). 기존 테이블 생성·스키마 수정 금지; SQLite `BEGIN IMMEDIATE`/원문 SHA/재조회/롤백, 타 provider·기존 3-series 보호. 기존 `providers.env`/운영 허용 키를 소스가 조회하므로 키 무조건 재입력/로그 출력 요청 금지.
- 기존 수동 CMD `EARNINGS_BLS_SERVICE_R1_PREFLIGHT.cmd` (blob `7a765514e06592ad0271e6417cd13ff6b3698d4d`), `EARNINGS_BLS_SERVICE_R1_APPLY.cmd` (blob `417ffa241e7dc2083f4b89873324d284ee8719d3`). Apply CMD는 사람의 별도 `APPLY` 입력을 요구하며, 이것을 단순 이 대화의 "계속" 명령만으로 승인된 PC 설치·수집이라고 대체하지 않는다.
- **main/운영 경계:** 확인 당시 `zgmini/main`에 수집기 MJS와 이 두 CMD 모두 GitHub Contents 404 `NOT_FOUND`, 개발 브랜치 소스는 main이나 승인 PC 설치의 증거가 아님. `zgmini-pc-control/main` `config/operations.json` blob `0197f4814d9cc0ff051559b9848a2df9fd0d86b2`: 설치된 A 고정 허용목록에 WPSFD42·BLS 서비스 수집 operation 없음. **운영 PC 파일의 실제 설치 부존재까지 입증하는 것은 아니므로** 현장 설치 SHA/정규 승인 B manifest는 `NOT_VERIFIED`. 허용목록 아닌 operation으로 원격 명령을 요청하지 않음.

**실제 개발/시험 실행:**
1. 전담 브랜치가 현행 main과 크게 diverged 상태라 무관한 전체 수정을 PR로 내지 않고, 당시 최신 main `66c3857e112c97c56c0bbcc11794c85582fc7d88` 기준 독립 source 검증 브랜치 `codex/w05-bls-service-r3-04-ci-20261117` 생성.
2. [선별 Draft PR #1203](https://github.com/ansqhd5774-Choi/zgmini/pull/1203): 정확히 **4파일**만 포함 — 기존 BLS 수집 MJS, service PREFLIGHT/APPLY CMD 2개, 원본 9개 memory-SQLite regression을 `tests/earnings-r3c-bls-service-once.test.mjs`로 가져와 기존 모듈 import 수정. 기존 기본 3종 무변경, 추가 **서비스 전용 3개** 테스트(월간 SA index/vintage null, 기존 BLS 3종과 서비스 snapshot 격리+중복 저장 idempotent, 잘못된 series/동일 월 상충 거부). 선택 브랜치 최신 head `15ca748e6d75460823728629aead67423d6fffc5`, 비교한 시작 main SHA에 대해 `ahead=5,behind=0,files=4`. 이전 테스트 9건만 있던 CI Run #43988819633은 코드 추가로 자동 **CANCELLED**(실패 아님).
3. 최신 head [Actions Node.js CI Run #43988919125](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43988919125), **status=completed/conclusion=success**, job `133724286446` PASS. Node24 설치/빌드/타입, `node --test tests/*.test.mjs` 전체 회귀, PC publication recovery tests, Cloudflare candidate read contracts 순차 PASS. raw job log에서 서비스 신규 3 테스트의 `✔` 직접 조회했고 base 9+new 3 = **BLS 12/12 PASS**. 메모리 DB 시험 성공은 운영 PC 저장 성공이 아니며 본 PR은 Draft로 유지; main 병합, 운영 PC 적용, D1 배포 모두 0.
4. 실 운영 Source Owner 허가/설치·WPSFD42 raw SHA/readback은 이번 작업에서 실행하지 않음. 신규 provider calls 0, operational PC/SQLite/D1 writes 0, 예약·Controller·Production 변경 0.

**LAST PASS:** WPSFD42 서비스 수집기와 2개 수동 CMD의 소스+12 Node24 회귀, CI 전체 PASS. **FIRST UNFINISHED / STATUS:** `BLOCKED_OPERATING_APPROVAL` (정확한 B급 유지보수 승인·실제 source PC 설치·WPSFD42 수집 유효 범위 미검증), PC raw state `NOT_VERIFIED`, 즉 R3-04 `PARTIAL_SOURCE`, **DONE=26/82 (31.7%) 유지**. 추상적 Controller 재설치나 새로운 예약을 설치 Gate로 두지 않는다.

**다음 필수 실행 — W05 / 실제 PC Source Owner:** 기존 승인 정본의 B grade manifest/운영 PC source SHA/기설치 모듈 존재·원자료 경로를 먼저 확인한다. 승인된 동일 범위라면 **한 번만** 공식 WPSFD42 preflight(공급자 1회 API POST) 및 TXT/JSON 결과 회수, 이어 승인 범위·원본 보호·SQLite 자원 lock 확인 후 명시적 수동 append apply 1회, 기존 `api_history_chunks_v1`/`api_history_snapshots_v1` 의 `BLS/WPSFD42` SHA/period/retrievedAt/sourceVersion 실제 readback으로 종료. B 승인/설치가 확인되지 않으면 다른 도구/임의 pc-job으로 우회하지 않고 단계 한정 BLOCKED, 다음 R3-05 서비스 계산을 source-only 상태에서 실제 완료로 승격하지 않는다.

## 38. R3-06 (2026-11-17 KST) 독립 QFR 불변 원문 저장과 SHA PC 기존 증거 재사용 — DONE(PAST_PC)

**예외:** 첫 미완료 R3-04 WPSFD42 승인/저장은 계속 BLOCKED. QFR은 해당 수집기와 무관하며 계획의 조건부 HOLD 독립 작업 계속 원칙에 따라 기검증 PC 결과를 재사용했다. 순차 포인터는 R3-04로 유지한다.

- 기존 운영 PC R2 결과: docs/EARNINGS_CENSUS_QFR_RAW_SQLITE_R2_20261027.md (blob 064d47ca0b5ba54aa1909e153678aebf93fd296d), 2026-10-27T14:52:11Z, PASS_QFR_SQLITE_APPEND_READBACK, CHUNKS_INSERTED=1, SNAPSHOTS_INSERTED=1, SQLITE_COMMITTED=YES, 승인 ZIP sha256=232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654, observedThrough 2026Q2, provider=CENSUS/dataset=QFR_MFG_US_NSA_AFTER_TAX_MARGIN.
- 기존 운영 PC R3 저장 source readback: docs/EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_20261027.md (blob 420256cc0a965dd7cd609e2c08d05f723e3ae0c7), 2026-10-27T15:06:35Z, PASS_QFR_STORED_READONLY_PREVIEW, STORED_SNAPSHOTS_VERIFIED=1, 같은 original sha, snapshotSha256=0cf9d0e4bced96b300810a448bf67be3b663252178f15853f103561d876ddeb3, SOURCE_RETRIEVED_AT=2026-10-27T14:52:13.108Z, SOURCE_STORED_AT=1793112733108, observedThrough=2026Q2.
- reader 소스 scripts/pc-writer/EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs blob e52d26366daf57102983a4c4d55e2491e85d8e78: readOnly SQLite + query_only; 전체 ZIP/chunk/snapshot SHA·시점/provenance·동시각 상충 검사 후 period/retrieval 순으로 최신 불변본 선택. 제공자 호출 0. 기존 R2 메타/SQLite 원본 1/1 readback과 동일 source chain 검증 재사용.
- 결론: R3-06 DONE은 **2026-10-27 당시의 실제 PC 저장·SHA readback**. 2026Q3 원본·현재 최신 수정치, 정규 수집/대시보드/API/D1 배포 성공은 NOT_VERIFIED. 이번 신규 PC/공급자 호출/SQLite/D1 쓰기 0.

## 39. R3-07 (2026-11-17 KST) 독립 QFR 저장자료 기반 현재/직전/변화폭 실 PC 이전 PASS 재사용 — DONE(PAST_PC)

- 계산 계약: 같은 MFG/US/NSA/et_idx=0, 동일 raw Census ZIP의 분기별 after_tax_profit_millions_usd와 sales_millions_usd를 직접 사용해 100 * numerator / denominator, 전분기 차이는 %p. 다른 표본/공식 seasonally adjusted 값과 섞지 않는다.
- 실제 PC 저장자료 결과 TXT EARNINGS_CENSUS_QFR_R3_STORED_RESULT_20261027T150635Z.txt, RESULT=PASS_QFR_STORED_READONLY_PREVIEW: 2026Q2 15.599418144173285%, 2026Q1 14.03708175763798%, CHANGE_PERCENTAGE_POINTS=+1.5623363865353053, 2025Q2~2026Q2 5분기 이력. SOURCE_SHA256=232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654, SNAPSHOT_SHA256=0cf9d0e4bced96b300810a448bf67be3b663252178f15853f103561d876ddeb3.
- 기존 PC reader source buildStoredQfrPreview에서 저장된 원료를 **다시 계산**하여 저장된 파생 margin과 불일치하면 QFR_STORED_DERIVED_VALUE_MISMATCH로 fail closed. R3_STORED_PREVIEW_READONLY.test.mjs 과거 6 fixture cases 중 개정 원본 선택·변조·provider 혼선 방어를 구현. 2026-10 PC 유효 증거를 재사용하며 이번 새 CI/PC 테스트 수행으로 허위 보고하지 않는다.
- 결론: R3-07 DONE(PAST_PC). SOURCE_HTTP_REQUESTS/PC_SQLITE_WRITES/D1_WRITES/SCORE_WRITES/WEB_DEPLOYMENTS=0. 향후 2026Q3 신규 raw·신규 D1 게시/GET/모바일 UI는 별도 단계. 순차 포인터 R3-04 유지.

## 40. R3-04 (2026-11-17 KST) 기존 운영 소스/실제 B승인 scope 근거 구분 — BLOCKED_OPERATING_APPROVAL 지속

**기승인 확인:** 제어 저장소 최신 main (조회 시 12084617b63f89cd349ea3f9d37f2c5a5b4f39f6)의 config/operations.json blob 0197f4814d9cc0ff051559b9848a2df9fd0d86b2에는 총 43 고정 A operation이 있고, WPSFD42 BLS 서비스 신규 수집·SQLite append operation은 없다. 공통 A 권한으로 임의 collector 실행하거나 다른 수집 작업을 인수 재해석할 수 없다.

- 기존 승인 B 2종: approvals/writer-updates/bls-registered-v2-13-writer-b-20261109.json (blob dc3b7062c8e01925882e55c41dfa257f71f2bc14), approvals/writer-updates/employment-r6-bls-shared-8-writer-b-20261109.json (blob 4996adc97c71b739ecc931f37a0d855fd29dc07e)은 고용 등 특정 파일 overlay 승인이다. 두 manifest 모두 allowProviderCalls=false, allowDbChanges=false. 이 승인으로 WPSFD42 공급자 POST/SQLite 신규 1건 저장을 허가했다고 간주하지 않는다.
- 최근 W05 API 상태 작업 B 승인: approvals/writer-updates/api-health-monitored-sources-20261116.json (blob 67c6538722fa80d5a6e6e1bd9f753a6d561a95ab)은 api-connection-health.mjs 두 파일만 허용, allowProviderCalls=false/allowDbChanges=false. Issue #1608 Run #43836744161 WRITER_B_INSTALLED_VERIFIED는 API 상태 수집 경로 기능에 관한 것이며 WPSFD42 설치·수집 성공 근거가 아니다.

**기존 승인 A Runtime 소스 조회 재사용:** PC Issue #1604 / Run #43835718574 / results/43835718574-1-seat-4.json blob 8abb25d04dc911b404c8cc148f015ea2f1d5d53a, startedAt 2026-11-16T08:59:26.569Z. job status PASS/PC_SOURCE_READONLY_DIAGNOSIS, 그러나 실 Core sourceResolved=false, runtimeSourceVerified=false. historicalCheckoutCandidate에 대해서만 sourceRoot=projects/zgmini-earnings-history-pc-release, trackedDirty=false, head/configApprovedSha=f4ab6f4e6bdbebb8f6958be88b5c9e194df8329b, matchesWriterCheckpoint=true가 확인됨. 해당 GitHub tracked tree에서 WPSFD42 수집 MJS/PREFLIGHT/APPLY CMD의 3개 경로는 모두 404. **과거 체크아웃에 해당 경로가 git-tracked되지 않았다는 증거**이지 실제 현재 PC 파일 부재, untracked 파일 부재, 현재 Core Runtime 인증은 아님. 독립 Writer B #1608 결과에서 보고된 source b886a1234a8a728957ab8e73394c5ea12e1b9acc GitHub tree에도 3파일 404. 승인 source/current installed SHA와의 최종 비교는 실제 PC Source Owner의 정확한 scoped preimage readback이 필요.

**현재 정확한 차단 조건:** 기능 source-only Node24 CI #43988919125 BLS 서비스 12/12 PASS, 하지만 기 승인 운영 B 범위에서 WPSFD42 provider POST·PC existing 2-table append·readback 허용이 입증되지 않음. 현재 상태 R3-04 PARTIAL_SOURCE/BLOCKED_OPERATING_APPROVAL, WPSFD42 source snapshots NOT_VERIFIED. 일반 공용 Controller C/재설치나 전체 Runner 건강 상태를 Gate로 추가하지 않는다. R3-06/07 Census QFR의 과거 PC 검증 완료는 독립 재사용하고 순차 첫 미완료는 R3-04 유지.

**NEXT 단일 운영 실행:** 운영 담당자가 기존 PC 실제 설치/reader·승인 manifest와 정확한 three-file source preimage를 정규 읽기 전용 경로로 대조한다. WPSFD42의 신규 공급자/SQLite 효과가 이미 승인된 정규 B 계약 범위면 그 범위에서 단회 수동 service preflight→단회 apply→기존 원장 snapshot/chunk SHA/observed month/retrieved_at JSON/TXT 재조회. 새 범위면 정확한 최소 승인 없이 실행하지 않는다. 승인 전 PC API 수집/SQLite/D1/Production 쓰기 0. Draft PR #1203을 승인 설치 또는 게시로 자동 승격하지 않는다.
