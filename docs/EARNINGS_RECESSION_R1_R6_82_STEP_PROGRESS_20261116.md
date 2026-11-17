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
| 현재 관련 단계 | **R3-04(27/82), 미완료.** 최신 직접 PC A [#1980/Run 44058286894](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1980) `PASS`, 두 표본 Core/Writer lock 없음·source/Task XML 안정이나 `CANDIDATE_CLEAR_NOT_AUTHORIZED`/`releaseVerified=false`/`ownerReplanAuthorized=false`. [#1981](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1981) W05 승인 manifest 3파일 PC 사전상태 A 요청 접수, 결과 `NOT_VERIFIED` (이번 기록 시점 댓글 0). 승인 source-only 3파일 PR #1207/manifest와 독립 Draft #1231 분리 유지. 순차 **26/82(31.7%)**, 개별 **28/82(34.1%)**. |
| 마지막 검증 완료점 | **§73:** W05 자체 A `shared-resource-release-readonly` #1980/Run 44058286894 seat3 `PASS/SHARED_RESOURCE_READONLY_SNAPSHOT`, 2026-11-17T09:44:31.749Z 2표본 Core/Writer lock 부재, source SHA `2070ff...`/Task XML 안정, 운영 쓰기 0, JSON·TXT 각각 GitHub 원본 재조회. 독립 `writer-install-preimage-readonly` #1981 신규 고유 요청은 생성·라벨 확인, 실행 결과 아직 `NOT_VERIFIED`. 기존 #1919 claim 전 STOP과 승인 manifest 고정 유지. |
| 재사용할 기존 근거 | QFR 원자료 ZIP PC SQLite 저장·계산 기존 유효 증거; 앱 QFR 3-pin [PR #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175)는 앱 main 병합, 운영 PC 설치·B 게시 별개. R1-09 소스 blob 근거는 §14 |
| 현재 최초 실제 미완료 조건 | **Writer B 실제 설치 미완료:** W05 직접 #1980에서 lock 없음 후보 실측은 확보했으나 `releaseVerified=false`, `runtimeSourceVerified=false`, `approvalVerified=false`, `ownerReplanAuthorized=false`; 정규 B의 Task enabled/Ready·소유자·연속 idle·preimage·lease 조건 완결 불가. 별도 수집 B 효과 승인 및 WPSFD42 SQLite 실제 저장·SHA 재조회도 미완료. Core/HOLD 우회·소비 #1919 재실행 불가. |
| 다음 필수 실행 하나 | **W05가 직접 생성한 승인 3파일 preimage A 원본 #1981의 Run/JSON/TXT·실제 HEAD/파일 상태를 회수해 설치 사전조건에 결합한다.** 미접수라면 `AUTOMATION_BLOCKED/INTAKE_NOT_OBSERVED`로 원장에 기록하되 동일 요청 재실행하지 않는다. #1980의 `CANDIDATE_CLEAR`는 설치 권한 아님. 실제 모든 정규 idle/Task/owner/lease/manifest 승인 조건 충족 시에만 새 고유 단회 Writer B 설치; 이후 공급자 POST+SQLite append는 별도 승인 범위 확인 후 수행. |
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
| **다음 실제 수행 하나** | [#1885](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885)에서 source-only 3파일 정확 GO/NO-GO/정식 승인 여부 확인 후, 승인 시에만 기존 Writer B 1회 설치·PC JSON/TXT·SHA readback. 별도 source PR CI #44012092722 PASS는 설치 승인이 아니며 운영 설치 0건·개별 28/82 유지 |

**순서 운용:** 다음 번호로 넘어가는 기준은 해당 단계의 **계획서 완료 조건 + 근거 링크**이며, 뒤 단계에서 미리 통과한 PR·CI는 계획 순번을 바꾸지 않는 선행 자산으로 유지한다. 사용자 승인 없이 순번이나 완료 기준을 수정하지 않는다. 조건부 HOLD·장기 DEFERRED는 계획서대로 처리하며 다른 독립 승인 작업의 수행을 중단하는 새로운 Gate가 아니다.


## 0. 82개 작업별 진행 상태 (실증·소스 분리)

 > **2026-11-17 12:45 KST 최신 판정.** 연속 R1-01~R3-03 26/82 DONE, 독립 R3-06·R3-07 포함 개별 28/82 DONE; 첫 순차 미완료 R3-04(27/82). 코드/CI/공식 문서는 현장 게시·운영 완료 증거 아님.

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
| R3-04 | WPSFD42 승인 수동 수집 후 SQLite 원본·SHA·시각 재조회 | `APPROVED_B / PC_PREFLIGHT_CORE_BUSY_NO_INSTALL` | **최신 §45~49·§54(과거 원본 §37·§40·§42~44)**. 공용 #1841 복구 완료. [PC 읽기 전용 #1860](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1860#issuecomment-6935505298) PASS/Run 43999256156, 지정 운영 checkout의 수집기·Reader·Preview·게시기 4파일 모두 `ABSENT`; 현 `gitTracked=UNKNOWN`, `runtimeSourceVerified=false`, 공급자·SQLite·D1 쓰기 0. R3-04/05 정확 3파일 소스 후보는 Draft [PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207) 이전 source CI PASS, **새 R3C USER_TEMP 로깅 수정 후 CI #44005617374 PASS**, 후보 SHA256 갱신. [비실행 Writer B 소스 설치 제안](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json)은 `PROPOSED_NOT_APPROVED`; 실제 `APPROVED_B` manifest/PC 설치/원자료 저장 없음. 공유 source 보호/lease와 B source-only 승인 후 기존 정규 Writer B 내부 Git tree A/M 사전검증·설치→파일 SHA 재조회. 이후 별도 WPSFD42 provider POST+SQLite append B 승인/단회 수동 저장·checkpoint readback 필요. 서비스 D1 게시기는 별도 R4 단계. 기존 #1849/#1860·QFR 재실행 금지. [비실행 승인 검토 #1885](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885) 생성, Owner GO/NO-GO 미회신. R3-04 DONE 아님; **§56** #1885 GitHub owner assignee/검토 근거 1댓글, 승인·실 PC local Git tree A/M·Writer B 실행 미완료; R3-04 DONE 불가; **§57** 공유 Writer Owner 기술적 허용/권한 HOLD 실접수. `APPROVED_B` 미등록, 운영 PC 3파일 미설치, API/SQLite 원자료 수집 미완료; **§58** 기존 BLS snapshot lineage 오염된 동일원본 조회 성공 오판 수정 Node CI PASS; 정확 신규 후보 `2a9a38a...`/R3C SHA `87e811b...`로 비승인 제안·#1885 갱신, 승인 B/실PC 설치/수집은 계속 미완료; **§60** 승인 A 2건 새 운영 PC source/Writer lock·Task 상태 증거, #1885 승인요청 갱신. 현재 Core busy snapshot·Git index A 미확정/정규 `APPROVED_B` 부재로 기능 미완료; **§61** 3파일 전체 SHA256 직접 검산·PR 14경로/운영 3파일 분리·B 설치 계약/실PC A 결과 2건 전수 검토 후 #1885 정식 승인요청 댓글 등록. 새 PC 설치/수집 0, APPPROVED_B 대기; **§62** 승인 전 독립 기능 결함 R3D/R4 TXT·JSON 결과 파일의 checkout 오염을 후속 소스 Draft PR #1231에 격리 수정·path regression 추가, 기존 3파일 B 후보/승인 요청 unchanged; **§64** 정규 B #1919 종료 `WRITER_B_PREFLIGHT_STOP/WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`, RUN failure이나 claim 전 안전 STOP, remote JSON/TXT 2/2, 실제 설치 0·no reexecute; **§65** #1924 fresh A Core busy source+Task stable 2표본/원격 JSON+TXT 2/2, #1231 후속 TEMP 소스 기존 Node.js CI 5/5 PASS, CI-only PR #1233 미병합 종료; 설치 여전히 HOLD; **§64~66:** 정식 GO·APPROVED_B 승인 source는 준비되었으나 #1919 실제 PC B `WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED` claim 전 STOP/JSON+TXT 2/2, #1924 Core busy A PASS. 수집·SQLite 저장 없음, 새 단회 조건 전 재실행 금지; **§67** 총괄 원문·#68 WAIT 인계 W05 직접 인수/기존 #1919 ACK, Core safe WAIT 불변. 소스 후속 CI PASS는 실제 Writer overlay/SQLite capture 미완료와 구분 **§73 W05 직접 A:** [#1980](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1980)/Run 44058286894 `PASS`, 두 표본 lock 부재·Task/source 안정, 단 `releaseVerified=false/ownerReplanAuthorized=false`. [#1981](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1981) 정확 승인 manifest preimage A 신규 접수·원격 결과 미확인. PC source 설치/공급자/SQLite/D1 효과 0; R3-04 `BLOCKED_PARTIAL_EVIDENCE`, 완료 아님. |
| R3-05 | WPSFD42 저장자료로 서비스 PPI·YoY 정보성 2행 계산 | `SOURCE_CI_PASS` | **§42** 기존 EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs의 WPSFD42 2행(index RAW, 정확 t-12 SA YoY DERIVED)은 기본 5개 BLS 지표를 유지. 새 source 수정은 WPSFD42 보관 snapshot 최대 500개 전수 validateSnapshot SHA/chunk/provenance 검사, 동일시각 상충 버전 안전 중단, 실제 검사한 snapshot 개수 diagnostics 반영. 신규 3 테스트(동시각 상충, 과거 chunk 훼손, 과거 provenance 위조) Node24 CI #43993495209 PASS 및 전체 suite FAIL 0. 기존 owner 브랜치 commit a8534e0/8b01633/500535d, selective [Draft PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207) 10파일(no merge). 운영 WPSFD42 원자료/13개월 t-12 계산·local 결과/D1 미실측 → SOURCE_CI_PASS≠DONE; **§66:** WPSFD42 단독 저장자료로 2행 생성 시 과거 BLS base3 데이터 부재/손상에 종속하던 Reader 오류 수정. 서비스 전체 retained 개정 SHA/provenance 검증은 유지, 원래 base5/합성7 strict SHA guard 유지. 회귀 2건 추가, 소스 HEAD `dd5338a9ce99b06548849ab6465488886448eef0`, CI #44038458161 5/5 PASS, PC 저장/실계산 미실행이므로 SOURCE_CI_PASS 유지; **§67** 메모리 SQLite 저장 base3+WPSFD42 직접 읽기→독립 service sourceVersion/2행→mock D1/GET 통합 회귀. 첫 CI #44040314100 테스트 변수명 TDZ 실패 후 fixture만 고침, exact HEAD e9d3bcd4 Node CI #44040871239 5/5 PASS. 운영 저장자료 실측 없음, SOURCE_CI_PASS 유지 |
| R3-06 | Census QFR 기존 ZIP 저장 경로·SHA·분기·원장 재조회 | `DONE` | **§38** 2026-10-27 승인 PC SQLite ZIP append 결과 PASS_QFR_SQLITE_APPEND_READBACK, chunk/snapshot 1/1, 원본 ZIP sha256=232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654, observedThrough=2026Q2. 2026-10-27 R3 read-only 실 PC STORED_SNAPSHOTS_VERIFIED=1 및 snapshotSha256=0cf9d0e4bced96b300810a448bf67be3b663252178f15853f103561d876ddeb3, retrievedAt=2026-10-27T14:52:13.108Z, sourceStoredAt=1793112733108. R2/R3 source/원격 승인 당시 보고 대조; 신규 공급자/PC 호출 없음, 현재 Q3 데이터·D1/웹 미검증 |
| R3-07 | 저장 QFR로 제조업 세후이익률 현재·직전·변화폭 계산 | `DONE` | **§39** 기존 운영 PC read-only R3 결과 PASS_QFR_STORED_READONLY_PREVIEW: 2026Q2 15.599418144173285%, 2026Q1 14.03708175763798%, 변화 +1.5623363865353053%p; 2025Q2~2026Q2 5연속 분기, 동일 QFR ZIP sha와 snapshot sha verified. 원료 afterTaxProfit/sales 직접 재계산 후 stored margin strict match, API/SQLite/D1/score/배포 쓰기 0. 2026-10 당시 실증 재사용, 현재 신규 Q3 수집/사이트 게시 아님 |
| R3-08 | BEA 단위이익의 기존 저장 원본 탐색, 필요 시 승인 1회 수집 | `PARTIAL_SOURCE` | **§41** `captureBeaUnitSourceOnce`의 FRED unit-profit CSV immutable archive source owner helper와 offline reader는 구현·CI PASS. 실제 운영 PC BEA unit 원본/ZIP 아닌 CSV+JSON archive SHA/소유자 설치·승인 source readback 없음. 수집 후보 URL은 FRED 계열로 R2-13 원자료 사용권 HOLD 유지, 임의 provider API/DB 호출 금지. 새 symlink 경계/원본 보존 코드가 권리/설치 승인·실 수집을 대신하지 않음 |
| R3-09 | BEA 단위이익 CSV·메타·SHA를 하나의 고정 버전에 결속 | `SOURCE_CI_PASS` | **§41** origin `readBeaUnitArchivedSource`는 CSV SHA256과 JSON metadata sourceVersion/sourceStoredAt/sourceRetrievedAt/filename/length/series/sourceUrl 일치 검증, 신규 경로 containment (raw dir·archive dir·CSV/meta symlink 거부) 및 half-written archive 안전거부 추가. 전담 변경 3f1e935/fcc299b, 선별 Draft PR #1183 commits 698e159/f670898, **실제 Node24 CI #43991469836 BEA unit 8/8 + 전체 regression PASS**. 실제 운영 PC 원본 쌍 readback·보존 시각 미검증 → SOURCE_CI_PASS 유지, DONE 아님 |
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
| R4-09 | WPSFD42 독립 Publisher·Worker·테스트를 current main 기준 선별 통합 | `SOURCE_CI_PASS / MAIN_NOT_MERGED` | **§53·§55** 기본 5행+서비스 2행 별도 D1 key 및 GET 7행 모의 검증, 멱등·오염 서비스 fallback. §55 실제 기존 checkpoint의 builtAt/expectedSourceVersion 오염에도 `ALREADY_STORED`로 반환되던 경로 수정, 2조건 회귀 추가. PR #1207 head `ecd7b4ad699e68780c2fce8d21734124f4aaafdf`, [Node CI #44012092722](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44012092722) Build·Type·Regressions·Publication Recovery·Cloudflare Read contract 모두 PASS. PC/실D1/main/Production 미적용 → `DONE` 아님; **§66:** 기존 별도 WPSFD42 D1 publisher가 호출하는 `buildServiceSourcePreview`의 base3 전제 제거, 전용 key·2행 및 모의D1 contracts 그대로, 후속 PR #1231 Draft Node CI #44038458161 PASS, main/운영/실 D1 미반영; **§67** 실제 저장형 W05 test에서 기존 Worker D1 writer로 base/service key 분리 및 readback, GET 7행/GET write0 확인. Draft #1231 HEAD e9d3bcd4 Node CI #44040871239 5/5 PASS, main 미병합·실 D1 미게시 |
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

## 41. R3-08~10 (2026-11-17 KST) BEA unit raw archive 실제 결함 보완과 정식 CI 증거 — SOURCE_ONLY, 개별 DONE 28 유지

### 이번 실제 source 개선

- 기존 source `scripts/pc-writer/EARNINGS_BEA_UNIT_STORED_RAW_R1.mjs`에서 `beaUnitRawPaths`의 파일명 SHA 검사는 통과했지만, `readBeaUnitArchivedSource()`가 경로에 존재하는 `.csv`/`.json`을 `readFileSync`로 바로 읽어 심볼릭 링크의 외부 대상을 따라갈 수 있었고, `captureBeaUnitSourceOnce()`의 재사용 아카이브 디렉터리도 중간 `raw`/보관 디렉터리가 링크일 때 경로를 추적할 위험이 있었다. 기존 자체 승인 PC 루트 경계와 보호된 원시자료 보관 원칙에 맞지 않는 구체적 경로 결함이다.
- 기존 PR [#1183](https://github.com/ansqhd5774-Choi/zgmini/pull/1183) **Draft 상태 유지**, 기존 4파일 범위 변경 없이 원본 helper 1파일과 test 1파일만 수정. GitHub commits [698e159](https://github.com/ansqhd5774-Choi/zgmini/commit/698e1595ae0c90aebff97d2b606f7b9ec8e98208), [f670898](https://github.com/ansqhd5774-Choi/zgmini/commit/f67089895595d401c5b07687ee749c2adbdb6164). `checkArchivePath`는 기존 PC root canonical realpath를 기준으로 `raw` 및 archive 폴더가 정상 디렉터리인지 검사하고, 기존 경로가 symbolic link이거나 root 밖으로 벗어나면 `BEA_UNIT_STORED_PATH_UNSAFE` 거부. 기존 `.csv`/`.json` 파일도 `lstat`로 링크/비정상 파일을 거부. 신규 capture는 **CSV 최초 생성 전**만 필요한 디렉터리를 단계별 검사/생성해 링크를 통과하지 않게 하며 기존 exclusive `wx`/불완전 원본 fail-closed 보존, 무단 복원/덮어쓰기 금지.
- test file에 3건 추가: (1) archive 상위 `raw` symlink가 지정된 PC root 외부를 가리킬 때 캡처 전 즉시 거부·외부 파일 생성 0, (2) CSV 또는 meta 파일 자체 symlink 시 reader 거부·실제 target bytes 불변, (3) CSV만 남은 반쪽 archive를 다음 capture가 자동 치유·덮어쓰지 않음. 기존 5건 포함 총 **8개**. 테스트는 외부 공급자 대신 의도된 fake response와 독립 임시 디렉터리·Node 테스트 환경만 사용, 운영 E: 원본 접근/변경 없음.
- 정확한 소스/시험 두 파일은 전담 `codex/api-site-integration-r1-20261026`에도 동기화: commit [3f1e935](https://github.com/ansqhd5774-Choi/zgmini/commit/3f1e935f0ab766be513955b00c6381a7a798e2bc) + [fcc299b](https://github.com/ansqhd5774-Choi/zgmini/commit/fcc299bf39423a0673fd2ec815bfa5e628956c71). 최신 blob: source `0b3eb30bb35df30d4c5ecd68f40b9c3c26d68437`, test `845c656dd28b231c6cb312567e95ba8974f17aee` (PR와 전담 동일). 승인 main·PC 운영 소스는 변경하지 않음.

### 정식 소스 검증·운영 경계

- [Actions Run #43991469836](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43991469836), `pull_request` 2026-11-17 UTC, exact PR head `f67089895595d401c5b07687ee749c2adbdb6164`, Node24 `completed/success`, job `133732881624`, npm dependency/build/typecheck, regression tests, PC publication recovery tests, Cloudflare candidate read contracts 모두 PASS. Raw job log에서 BEA archived source **8/8 `✔`**(기존 5 + 신규 symlink/partial 3) 직접 확인, 전체 regression `pass 4601/fail 0`. 이는 GitHub Linux CI 소스/임시 fixture 증거이며 Windows PC 원문 readback가 아님. 매번 동일한 CI를 다시 실행하지 않는다.
- **R3-08 실제 미완료:** 기존 Source Owner 운영 PC에 `A463RD3Q052SBEA` unit raw archive가 존재하는지, 당시 SHA·sourceStoredAt/JSON metadata가 실제 확인됐는지 불명. 해당 standalone capture helper는 FRED Graph CSV URL을 사용하므로 앞서 R2-13에서 정한 raw 저장·재배포 사용권 `HOLD`를 해제할 근거가 없다. 새 공급자 재요청·설치·수동 CMD 실행·raw 저장은 이번에 하지 않았다.
- **R3-09 실제 미완료:** 코드는 CSV bytes/hash + JSON sourceVersion/series/sourceUrl/수집시각을 `readBeaUnitArchivedSource`로 결속·검증하지만 운영 저장 파일을 실제 열어 1개 고정 아카이브 SHA 확인한 증거 없음. **R3-10 실제 미완료:** `EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs`는 preflight/apply 모두 provider `fetch()` 없는 archive-only 계산/게시 준비가 돼 있어도 실제 PC archive readback·D1 게시 승인/검증은 없음. SOURCE_CI_PASS를 운영 DONE으로 승격하지 않는다.
- **다음 필수:** 첫 미완료 R3-04 WPSFD42 운영 승인/설치 source 범위 확인 후 승인된 1회 저장→원장 SHA readback. 독립 R3-08은 기존 PC에 이미 저장된 unit archive/승인 소스를 **허용된 읽기 전용**으로 먼저 조회하고, 원본이 없다면 기존 공식 BEA 직접 공개자료 사용 가능 여부와 FRED 권리 보류를 원담당 승인 범위에서 해결할 때만 공급자 호출을 승인한다. 원본·백업 삭제, DB/D1/Cloudflare 변경, 임의 운영 source/Scheduler 갱신 0.

**이번 판정:** last code PASS source integrity fix / Node CI 8/8, first operating FAIL unchanged (R3-04 approved B+WPSFD42 raw storage; R3-08 FRED rights+BEA raw), **연속 완료 26/82, 개별 완료 28/82** 유지. Stage DONE 수 늘리기 위한 문서/fixture-only 완료 처리 금지.

## 42. R3-04~R3-05 (2026-11-17 KST) 서비스 BLS 전수 빈티지 SHA·동시각 충돌 방어와 정식 Node CI — SOURCE_READY, PC_EFFECT_BLOCKED

**LAST PASS:** 기본 3원천 PC 2026-10 검증 R3-03과 Census QFR R3-06/07 과거 운영 PASS는 변함없이 재사용. R3-04 [Draft PR #1203](https://github.com/ansqhd5774-Choi/zgmini/pull/1203)의 기존 단독 서비스 collector Node24 12/12 PASS는 기증거. 이번에는 R3-05 읽기 전용 미검증 버전 스캔 결함을 고쳤다.

1. **실결함(코드 확인):** 기존 `buildPreview(db,{includeServices:true})`가 `SELECT ... ORDER BY retrieved_at DESC LIMIT 501`로 서비스 WPSFD42 보관 원장 여러 버전을 읽어오지만 `validateSnapshot(db,services[0])`만 호출했다. 이후 stored-only 계산은 최신 1개만 사용해 **이전 버전 chunk raw 또는 provenance가 손상돼도 중단하지 않고 계속 READY를 산출**할 수 있었다. 또한 가장 최근 `retrieved_at`이 같은데 `snapshot_sha256`이 다른 서로 다른 보관 버전도 임의 선두 1개를 선택하는 결함이 있었다. 기존 BLS 3개 기본 소스 `analyze`는 전체 스냅샷을 검증하지만 WPSFD42만 우회했다.
2. **최소 소스 보완:** `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs`에서 WPSFD42 bounded 500개 보존 스냅샷을 모두 기존 `validateSnapshot`으로 검증(`verifiedServices=services.map`)하고, 최신 동일 `retrieved_at`/서로 다른 SHA 이중 원장이면 `R4_SERVICE_REVISION_ORDER_AMBIGUOUS`를 반환한다. `diagnostics.serviceSnapshotVersions`와 검증 완료 실제 수로 `snapshotsChecked`를 교정. 기존 SHA/원장 삭제·수정 0, PPI 관측값/SA/월간 정확 t-12 산식·가중치/TTL·기존 5행/독립 D1 키 변경 0.
3. **반례 회귀 3건:** (a) 동일 2026-10-26T18:00Z에 current WPSFD42 값만 서로 다른 두 snapshot을 정상 append하면 선택 전 STOP; (b) 정상 더 최근 서비스 snapshot이 있어도 이전 snapshot chunk body SHA 불일치 시 STOP; (c) 정상 최신이 있어도 이전 snapshot provenance seriesID 조작 시 STOP. 실제 `EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.test.mjs`의 17개 전체 시나리오, 기존 기본 5행 불변/서비스 2행/정확 전년동월 비교/결측 null 포함.
4. **GitHub 실제 반영:** canonical 전담 branch `codex/api-site-integration-r1-20261026` commits [a8534e0](https://github.com/ansqhd5774-Choi/zgmini/commit/a8534e08be4542b2495c33ee7e1927ebd8bdc292) (reader), [8b01633](https://github.com/ansqhd5774-Choi/zgmini/commit/8b0163389f87947d3536c88149d83c55359dcc67) 및 [500535d](https://github.com/ansqhd5774-Choi/zgmini/commit/500535da1aea2fc83ada7b0c102d04b53b27f267) (tests). 최신 reader/test blobs `fe73da0ba12944941c885a6fdd0cf66c0ff8bc11` / `3cc2e2a472388bcf592b759660ae56a75ef1917d`.
5. **선별 실 CI:** [Draft PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207), branch `codex/w05-bls-service-r3-05-lineage-ci-20261117`, head `372c641ee2c8b6cb0c326e06b60b889bb38b05f0`, main 기반 정확 10개 관련 파일 (기존 #1203의 4 collector/CMD/test + 6 reader/worker/UI-only adapter/test). 원래 base를 #1203로 둔 stacked PR은 main 한정 CI가 트리거되지 않아 **main으로 base 변경**, 현재도 Draft/NO MERGE. 82단계 전체 owner branch 수백 commit 일괄 PR 아님. [Actions #43993495209](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43993495209), Node 24, `completed/success`, job `133739716379` build/typecheck/regression/PC publication recovery/Cloudflare read contracts 모두 PASS. Job raw log에서 신규 **3개** `✔` 항목 확인, Node 전체 regression `tests=4645, pass=4635, fail=0`(스킵 10건, PASS로 계산 금지). **CI에서 PC·공급자·D1 실운용 실행한 증거는 없음**.
6. **조정 원장(실제 인계 수신 아님):** [zgmini-pc-control #68 W05 정확 Source Owner/B manifest 조회 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6934633701), commentId `6934633701`, 운영 checkout 3파일 존재/해시, 설치·B grade 효과 실제 허가, 기존 원본 보호/lease 조건을 W05가 검증할 수 있도록 필요한 정보만 요청. 제어 A fixed allowlist 43개에는 서비스 BLS operation 없음; 기존 공용 BLS shared overlay는 providerCalls/DB changes 금지. 댓글 등록만으로 운영 B 승인·다른 일반챗 실제 접수·착수나 자동 실행이 일어났다고 주장하지 않는다.

**판정/남은 필수:** source/CI은 PASS, **R3-04 PARTIAL_SOURCE/BLOCKED_OPERATING_APPROVAL, R3-05 SOURCE_CI_PASS**, 첫 연속 미완료 R3-04, **연속 DONE 26/82(31.7%), 총 개별 DONE 28/82(34.1%)**. 운영 source 설치·승인 B 경로를 확인할 때까지 supplier POST·PC SQLite append·D1 공개 0. 승인된 기존 범위만 있으면 W05가 단회 수동 서비스 저장→정확 SHA/period/13개월 이상 t-12 원장 readback→로컬 계산→조건부 R3-04/05 DONE; 없는 범위는 BLOCKED만. 독립 완료 QFR을 재실행하지 않는다.

## 43. R3-04 (2026-11-17 KST) 기존 A 승인 4파일 실PC preimage 조회 요청 및 자동 기동 구간 미확정 — AUTOMATION_BLOCKED_INTAKE

**목표:** BLS WPSFD42 실제 PC 설치 경로를 새 Collector·CMD·Controller 없이 현재 설치된 고정 A `writer-install-preimage-readonly`(pc-control `config/operations.json` 43개에 등록)와 승인된 파일 목록만 사용해 1회 안전 조회하고 원격 TXT/JSON 회수. `PREIMAGE_SOURCE_ROOT=projects/zgmini-earnings-history-pc-release`; 기존 sourceRoot/HEAD/`config.source`/runtimeSourceVerified 구별한다.

**이번 실제 반영/조회:**
- 제어 저장소 `ansqhd5774-Choi/zgmini-pc-control`: 전담 branch `codex/w05-bls-service-preimage-a-20261117`, 하나의 고정 읽기 전용 manifest 경로 `approvals/writer-preimage/w05-bls-service-source-4-readonly-20261117.json`만 추가. [PR #1847](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1847), head `800b1d1472d5bbab41aa777e7716ef2fba78a15e`, C996 R5 Readonly Source Checks [Run #43995195752](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43995195752) COMPLETED/SUCCESS, squash 병합 main `05bd7704f677358fbc79ac2fca4866c4fd57e1aa` 실제 GitHub 재조회 완료. **Controller 엔진/정책/Runner/Task, 실제 운영 PC 파일은 변경하지 않음.**
- Manifest SHA256(raw 546 UTF-8 bytes): `22687b243d0afcd05fa784910e172f531d752d862c014fbd0c9419465ae71baf`, Git blob SHA1 `1f53838dca601dc72790f07e96c746f5fcde700e`. 대상 정확히 4개 `.mjs`: 수집 `scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs` (A), 기존 `EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs` (M), 기존 `EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs` (M), 서비스 D1 후보 `EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs` (A). `allowOtherPaths=false`, no supplied shell/SQL/provider actions. 서비스용 CMD는 고정 A `.mjs` 경로 계약에서 제외.
- **실제 PC 원격 요청 1회:** [pc-job Issue #1849](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1849), created `2026-11-17T01:25:38Z`, owner actor `ansqhd5774-Choi`, labels [`pc-job`], schema `ZGMINI_PC_JOB_V1`; requestId `pc-d0880e2e-7edd-420a-9641-1f16bf246388`, chatId `chat-153e86f6-39dd-45ba-9132-5a077195e6f0`, operation `writer-install-preimage-readonly`, source `ansqhd5774-Choi/zgmini` `main` SHA `be89aeb7fd4e6732d7e8e3dba4b2298b1f83982b` at Issue submission, fixed manifest path & raw SHA above. This request **does not authorize source replacement, provider API call, SQLite write or D1 deploy**.
- **관측된 FIRST UNFINISHED:** Issue created/pc-job label verified, but scoped #1849 bot result comment `0건`, corresponding `ZGMINI PC Job` workflow Run not observed in GitHub Issue-event run listing shortly after event; other unrelated workflows logged `skipped` records for same `issues opened` event, **not this PC Job's result**. Most recently observed `ZGMINI PC Job` workflow run elsewhere #43993091240 2026-11-17T01:07:19Z `skipped`, #43992169995 01:00:29Z `success`, neither #1849 nor proof of current trigger state. **Actual workflow inactive/permission/runner cause UNKNOWN**, no claim that PC A ran/failure. Do not change labels/re-open issue, bypass execution or issue duplicate while existing request ID is unresolved.
- **Status split:** GitHub scope PR/merge/Issue created **DONE**; A workflow execution/delivery `STATE_UNKNOWN / AUTOMATION_BLOCKED_INTAKE`, PC installed file hashes `NOT_VERIFIED`, WPSFD42 SQLite source raw `NOT_VERIFIED`, B-grade provider POST/SQLite append authorization `NOT_APPROVED_OR_NOT_VERIFIED`. Therefore R3-04 `PARTIAL_SOURCE`, R3-05 `SOURCE_CI_PASS`; **연속 DONE 26/82(31.7%), 개별 DONE 28/82(34.1%) 보존**.

**다음 필수 실행:** 실제 기존 `pc-job.yml` `issues.opened`/workflow enabled & event gate, host Runner dispatch/match를 **정확히 #1849에 한정**해 제어 원담당이 점검. Workflow 스케줄/Controller 전체 설치나 별도 A 작업/무한 재시도 생성 금지. 기존 요청 실행이 확인된다면 그 고유 Run/`results/*` 원격 JSON/TXT·원본 Issue bot receipt를 확인해 4개 파일/HEAD/config.source와 실물 SHA를 판정한다. 실제로 시작되지 않았다면 원인과 복구 승인 후 **새 고유 단회 A 요청의 필요성**만 판단(이미 소모된 requestId 재사용 금지). WPSFD42 실제 공급자 수집/SQLite 저장은 독립 B 효과 승인 확인 전 하지 않는다. 다른 R3 비종속 후보 업무/기완료 QFR 증거는 별도 진행.

## 44. R3-04 (2026-11-17 10:41:46 KST) #1849 Issue opened 이벤트/공통 #1841 복구 교차 확인 — AUTOMATION_BLOCKED_INTAKE 유지

**실행 대상/유효 시작점:** 개별 28/82(34.1%), 연속 26/82(31.7%), 첫 순차 미완료 27번째 R3-04. 이전 §43 승인 A 4파일 manifest PR #1847와 고유 Issue #1849(요청 ID `pc-d0880e2e-7edd-420a-9641-1f16bf246388`)를 재발행 없이 재사용. 원래 1회 검사 source root `projects/zgmini-earnings-history-pc-release`; 기존 소스/산식/자료 변경 없음.

### 근거·마지막 PASS/최초 미완료

1. **Issue 및 event 시각:** [원본 #1849](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1849) created 2026-11-17T01:25:38Z(10:25:38 KST), GitHub timeline `pc-job` label event **01:25:40Z**, 결과 bot comments 0건. 제어 고정 [`.github/workflows/pc-job.yml`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/.github/workflows/pc-job.yml) blob SHA `33fb720e970593d14d2832935ac51f29d52ec2b4`에는 `on.issues.types=[opened]`, Job `if: contains(issue.labels,'pc-job')`, `concurrency=pc-request-IssueNumber`가 존재한다. 라벨 늦게 등록된 opens의 job 조건 누락 가능성이 있으나 **해당 opened payload의 초기 라벨 유무는 현재 미관측**.
2. **Actions 교차조회:** GitHub REST `actions/runs?event=issues&per_page=100&page=1`에서 **2026-11-17T01:25:42Z** 동일 `pc-job` title로 기록된 다른 Workflow 실행 31건(`completed/skipped`)을 직접 확인. 한편 그 범위를 포함한 최신 100건 중 `ZGMINI PC Job` name 0건. 이전 PC Job #43993091240(01:07:19Z, skipped), #43992528433(01:03:08Z, cancelled)을 당일 #1849 결과로 오인하지 않는다. 현재 #1849 대응 정확 Run ID·실행 PC seat·TXT/JSON·실제 installed source SHA는 **NOT_VERIFIED**.
3. **공통 선행 효과:** [기존 공유 Controller B #1841](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1841#issuecomment-6934911469)의 실제 원격 JSON [results 원본](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/maintenance-pc-update-7acb05d3-2860-4d19-8e30-55fe78892b12.json) 재조회: `status=UNKNOWN`, `code=BACKLOG_OR_RECOVERY_NOT_VERIFIED`, `lastPass=RECOVERY_REQUIRED`, `firstFail=SWITCHED`, `actualControllerSha=384ffd09e80ad769e31596483dfe73e9ee8b6c6a`, `recoverySha=null`, `workflowEnabled=false`. **이는 유지보수기 실패 경로 보고값이며 GitHub의 당시/현재 Workflow state 독립 판정은 아니다.** #1841과 #1849의 인과·복구 가능 상태는 공유 Owner가 실제 ledger/lease/backlog/Workflow를 확인해야 한다.
4. **공통 사건 중복 방지:** 신규 중복 복구 Issue나 새 A Issue를 만들지 않고 [원본 #1841 W05 교차증거 댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1841#issuecomment-6935204028)과 [중앙 #68 인계](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6935207472)만 추가. 이는 기록/조정이며 타 ChatGPT 대화의 실제 접수·실행/복구 확정이 아니다.

**LAST PASS:** GitHub A manifest main/PR #1847 CI + #1849 Issue/label 이벤트 확정; 이전 Draft PR #1203/#1207 WPSFD42 소스 Node24 CI 기증거 재사용. **FIRST FAIL/UNFINISHED:** 정확 #1849 `ZGMINI PC Job` Run·PC entry·4파일 설치 SHA·TXT/JSON **없음/미관측**. 공용 #1841은 `UNKNOWN/RECOVERY_REQUIRED`이며 안전한 복구 증거 미회수. 이는 `AUTOMATION_BLOCKED_INTAKE`로 기록하고 `RUNTIME_FAILED`로 승격하지 않는다.

**현재 미충족 승인/효과:** WPSFD42 신규 provider POST·SQLite append는 기존 A operation 범위 밖이고 정확한 B 운영 효과 승인 미확인; 실행 0건, SQLite/D1/Production/Task 변경 0. R3-04는 `PARTIAL_SOURCE`, R3-05는 `SOURCE_CI_PASS` 유지, 개별 28/82/연속 26/82 **변경 없음**.

**다음 한 실행(담당/성공 조건):** 공유 Controller/프로세스 총괄 Owner가 기존 #1841의 설치 phase·ledger/owner/marker/lease·백업/보호 SHA·Supervisor/6 Runner·실제 Workflow 활성/접수 backlog 및 #1849 열린 이벤트/라벨 게이트를 **공식 비파괴 경로로 판정**하고 같은 원본 사건에 정확한 복구/재개 증거와 #1849 미실행 여부를 회신. 그다음 W05가 새 고유 A 검사 1회의 필요성을 평가하며, 설치 원본 SHA 수거 후 정확한 B 승인 범위 안에서만 수동 WPSFD42 수집/저장·SHA readback을 진행한다. 소모된 원래 requestId 재생, 라벨 재부착으로 우회, 전체 Controller 임의 설치·lease 강제 해제 금지.

**개발 범위:** 진행 기록 `docs/EARNINGS_RECESSION_R1_R6_82_STEP_PROGRESS_20261116.md` 1파일만 수정. 앱 전담 브랜치 적용 전 HEAD `cd8037f85fdb8ab60925e84d5760e365ee05f66c`, 제어 main 관측 HEAD `83beb545566ed1a2a9ecf61e7dc39cc263d89318`; 실제 PC 설치 Controller는 #1841 보고시 `384ffd...`로 확인됐을 뿐 현재 새 검증 SHA는 미확정.


## 45. R3-04 (2026-11-17 11:04 KST) #1849 정규 replay #1860 실제 PC preimage 회수 — READONLY_PASS / FOUR_FILES_ABSENT

**유효 시작점:** 순차 DONE 26/82(31.7%), 개별 DONE 28/82(34.1%), 첫 미완료 R3-04. 기존 §43~44의 #1849/manifest/요청 ID를 재사용했으며 중복 요청 없음.

- **공통 접수 복구:** 제어 #1841은 2026-11-17T01:56:05Z `ROLLED_BACK / INTERRUPTED_ROLLBACK_VERIFIED`, 기존 Controller SHA `384ffd09e80ad769e31596483dfe73e9ee8b6c6a` 유지, 보호 상태 불변·lease 보관·Workflow 활성으로 복구되었다는 원본 댓글/결과를 확인. 신규 Controller 설치 성공으로 오인하지 않는다. [#1841 결과](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1841#issuecomment-6935496556).
- **#1849 정규 replay 실제 완료:** 원본 #1849는 backlog 상태에서 정규 #1860으로 연결됨. [#1860 실행 결과](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1860#issuecomment-6935505298) `Run 43999256156`, `seat=4`, `status=PASS`, `code=WRITER_APPROVED_PREIMAGE_READONLY`, `exitCode=0`, `finishedAt=2026-11-17T01:56:28.060Z`, `requestId=pc-d0880e2e-7edd-420a-9641-1f16bf246388`. 실제 실행 Controller `384ffd09e80ad769e31596483dfe73e9ee8b6c6a`; `protectedStateUnchanged=true`, `providerCalls=0`, `operationalWrites=0`, `d1Writes=0`, `sqliteOpened=false`.
- **핵심 실측:** 지정 preimage manifest의 4개 대상 `scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs`, `EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs`, `EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs`, `EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs` 모두 **`exists=false / state=ABSENT / sha256=null`**. 이는 조회된 **운영 PC sourceRoot에 네 파일이 없다는 실측**이며 전체 PC 모든 checkout 부재나 SQLite 원본 부재를 뜻하지 않는다. 기존 소스 설치/승인 완료라고 주장할 수 없음.
- **LAST PASS:** 원본 #1849의 안전한 A preimage 조회는 실제 PC PASS, 결과 JSON/TXT가 #1860 댓글에 기록. **FIRST UNFINISHED:** 운영 지정 sourceRoot 4파일 ABSENT → 승인된 소스 설치 경로 및 B 효과(서비스 provider POST·SQLite append) 승인/실행·원본 SHA·13개월 t-12 readback 부재. R3-04는 `PARTIAL_SOURCE / INSTALL_NOT_READY`, R3-05는 `SOURCE_CI_PASS`; **연속 DONE 26/82, 개별 DONE 28/82 유지**.
- **다음 필수 실행:** #1860 preimage 결과를 설치 Owner의 승인된 Writer B 설치 계약과 대조해 **정확히 4개 파일의 승인 source/해시·기존 파일 보호·설치 operation/lease**를 결정한다. 설치가 허용될 때만 기존 정규 경로로 파일을 설치하고 A preimage/readback로 재확인한다. 그 뒤 별도 B 효과 승인이 확인될 때만 WPSFD42 단회 원자료 수집→SQLite SHA/period/checkpoint readback→저장자료 t-12 계산을 수행한다. #1849/#1860 재요청, 임의 shell/Controller 설치, 무승인 D1 게시·공급자 호출 금지.

**이번 회차 변경:** 본 진행 기록 1파일만 갱신. 신규 기능 코드·운영 쓰기·공급자 호출·D1 게시·Production 배포 0건.

## 46. R3-04 (2026-11-17 11:19:37 KST) 승인 소스·의존파일·정확 Writer B 설치 후보 분리 — SOURCE_PREPARED / INSTALL_APPROVAL_PENDING

**유효 PASS:** [#1841 복구 결과](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1841#issuecomment-6935496556)와 [#1860 PC 읽기 전용 결과](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1860#issuecomment-6935505298) 재사용. #1860 Run 43999256156, seat 4, PASS/WRITER_APPROVED_PREIMAGE_READONLY, 종료 2026-11-17T01:56:28.060Z. 지정된 SourceRoot (E:/ZGmini/projects/zgmini-earnings-history-pc-release)의 4파일 모두 ABSENT, 각 sha256=null. 당시 PC local-only HEAD/config.source 일치: 2070ff53549e2f9f2cea57d5af7e1d83f9fd7388, gitTracked=UNKNOWN, runtimeSourceVerified=false. 보호값 동일·공급자 호출/SQLite 열기/D1/운영 쓰기 0. 원본 #1849/#1860 중복 재실행 금지.

**후속 실제 정적 확인:** 기존 앱 [Draft PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207)의 exact head 372c641ee2c8b6cb0c326e06b60b889bb38b05f0 (main 대상, draft/unmerged)에서 실제 파일 3개 GitHub 원본 바이트 SHA256을 산출. Node24 [CI #43993495209](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43993495209) source-only PASS는 기증거로 재사용. SHA256 구현을 기존 A 4파일 manifest의 raw UTF-8 알려진 digest 22687b243d0afcd05fa784910e172f531d752d862c014fbd0c9419465ae71baf 및 abc 표준 벡터와 일치 검증했다.

| R 단계 | exact source path | candidate Git blob SHA1 | candidate bytes SHA256 |
|---|---|---|---|
| R3-04 수집 | scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs | add5445108361b49c839fcb7eb4ffe2cc08e4ec4 | 31eb8f2c0514644fe32f86aa9ef5ae9dde742cc3c4c9090cd919ef00410cb5f6 |
| R3-05 기존 저장자료 검사 | scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs | 196f6262b34b4f6df21f284810629e29e95c6d22 | b441a52551a015ab9522280ee7c3f620fc8efd967c8dd0e6e04865bb72c97b31 |
| R3-05 계산/2행 preview | scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs | fe73da0ba12944941c885a6fdd0cf66c0ff8bc11 | f3f6e41b3b61039580db7ab7f6bed3133eb305ffef35e4b4b7ea919e0220ea77 |

R3C와 R3D는 Node built-in 모듈만 정적 import하고, R4 preview의 유일한 상대 import는 위 R3D로 닫힌다. R3D 후보는 기존 main의 3시리즈 검사에 WPSFD42 허용과 validateSnapshot export를 추가한다. Preview 후보는 서비스 추가 2행·이전 원본 전체 SHA 검사·동시각 충돌 fail-closed를 포함. 현재 앱 main에서는 R3C 파일 자체가 아직 없고, R3D/preview는 서비스 확장이 없는 버전으로 존재한다. PC 실제 설치 루트에는 세 파일이 모두 ABSENT이므로 개발 main 존재와 운영 설치를 혼동하지 않는다.

**기존 4파일 manifest가 실행 가능한 4파일 설치 승인 명세가 아닌 이유:** 네 번째 EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs (전담 브랜치 blob 609008dabd0ba04c827ec8df1573dc34949f70da)는 Draft PR #1207 10파일 목록에 없고 개발 main에도 없다. 직접 import하는 earnings-publication-result-directory.mjs는 앱 main에 없으며, worker/earnings-companion-c-r4.mjs의 앱 main blob 4d04ea310e5e6468c84883a9e80a5ef7d704f758에는 게시기가 요구하는 EARNINGS_C_SERVICE_SNAPSHOT_KEY export가 없다. PR #1207/전담 branch worker blob d8df9f1cbbed67c5a508da5bd9767fa85987149f에는 있다. 다른 직접 의존 EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs 및 d1.mjs는 main에 존재한다. 위 helper/worker의 현재 PC 설치 여부는 아직 검사하지 않았으므로 PC 부재로 단정하지 않는다. **R3-04/05 3개 .mjs를 최소 source-only 후보로 유지하고, 서비스 D1 Publisher/helper/Worker는 R4 후행 승인·누적 diff로 분리.** 두 서비스 CMD는 기존 Writer B 계약의 .mjs-only 범위 밖, 별도 설치/예약 없음.

**Writer B 공식 계약과 사전 제안(승인 아님):** [기존 writer-b README](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/writer-b/README.md), [contract.mjs](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/writer-b/contract.mjs) 재사용. 후보 sourceRepository=ansqhd5774-Choi/zgmini, sourceBranch=codex/w05-bls-service-r3-05-lineage-ci-20261117, candidateSourceSha=372c641ee2c8b6cb0c326e06b60b889bb38b05f0. 당시 PC baseHead=baseConfigSourceSha=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388. 이 PC SHA는 [과거 Writer B 로컬 합성 설치 PASS](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-source-install-8ad6731f-c55e-409a-b92a-4aac4f165b58.txt)에서 LOCAL_OVERLAY/LOCAL_ONLY=true로 확인한 SHA이므로 GitHub 원격 commit 검색 422를 운영 변조로 판정하지 않는다. PC의 실제 local HEAD/git object/승인 config.source를 적용 전 재조회해야 한다.

세 파일 물리 ABSENT 기준 잠정 B change=A/beforeSha256=null, afterSha256은 위 표. 그러나 #1860은 gitTracked=UNKNOWN으로 반환했고 이전 A scope JSON은 R3D/preview에 expectedEffect=M 표기를 사용했다. 실제 PC 로컬 Git index/dirty 충돌이 미확정이므로 **M을 무단 A로 강제 확정하지 않는다.** 설치 B에서 영향 파일 protectedFiles, runtimeDependencies/taskXmlSha256/consumers를 정규 계약에 따라 영향 범위만 검증하고, all five effect flags(allowProviderCalls/allowDbChanges/allowD1Writes/allowTaskDefinitionChanges/allowOtherSourceChanges)는 모두 false, runCount=1. 현재 공유 lock/승인 변경으로 인해 baseSha drift 발생 시 실제 현재값으로 조정. 계약상의 approved status나 승인 해시를 **아직 만들지 않았다.**

**LAST PASS:** #1860 실제 안전 A PC readback, 후보 3개 Git 원본/정적 import/SHA256 및 이전 Node CI PASS. **FIRST UNFINISHED:** source-only Writer B 정확 승인 manifest·PC Git index 확인·후속 설치/검증 없음. 수집 B 효과 승인/SQLite 저장/13개월 YoY/checkpoint 미완료. 상태 R3-04 PARTIAL_SOURCE/INSTALL_NOT_READY, R3-05 SOURCE_CI_PASS. **개별 DONE 28/82(34.1%), 연속 DONE 26/82(31.7%) 불변.**

**다음 실제 1단계(담당 W05 + 기존 공유 Writer B Source Owner):** 3파일 후보와 현 PC local Git tracked/add·lease/보호 상태를 대조한 후 정확 B 설치 권한/manifest를 승인 범위에 맞게 확정. 승인 없는 Writer B Issue 생성/설치 금지. 승인 후 정상 B 단회 설치→원격 3파일 SHA/HEAD/config.source readback→별도 공급자+SQLite B 효과 승인시 WPSFD42 수동 1회→원문/checkpoint 저장 재조회 후 R3-04 완료 판정. 기존 QFR 재수집·#1849/#1860 재실행·D1/Production 변경 0.

**이번 회차 실제 변경:** 전담 브랜치 지정 진행 기록 이 1파일만 수정. 기능 source/PC source/SQLite/D1/Task/Production 운영 변경 없음. 이전 W05 HEAD 620508c768478b8edb294d3acd2c9c60dc6427ae.

## 47. R3-04 (2026-11-17 11:29:20 KST) 3파일 Writer B source-only 승인 *전* 정확 제안 JSON 작성·실제 설치 보호검사 검토 — PROPOSED_NOT_APPROVED

**시작점/완료율:** 82단계 개별 28 DONE(34.1%), 순차 26 DONE(31.7%), 첫 미완료 27번째 R3-04. #1841 완료 공유 복구, #1860 실제 PC 읽기 전용 PASS, #1207 Node24 SOURCE CI는 모두 유효 증거로 재사용, 같은 요청 재실행 0. §46의 3개 target SHA 외 새로운 기능 산식·소스 수정 없음.

**이번 GitHub 실제 산출물:** [정확한 신규 비실행 후보](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json)를 이 W05 원담당 브랜치에 1파일 추가, commit [6c1dafdf](https://github.com/ansqhd5774-Choi/zgmini/commit/6c1dafdfdcee4292a182962b9dece787dd03c99c). 업로드 뒤 같은 브랜치 원격 GET으로 파일 Git blob SHA `e48bd9109f42d7f744cbb18c1ad82dbc0bd324b5`, JSON 20개 최상위 필드·3개 대상/afterSHA와 불변 상태를 재조회. 내용은 기존 제어 저장소 [Writer B 정식 schema](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/writer-b/contract.mjs)의 필드 구조를 따르지만 **`status=PROPOSED_NOT_APPROVED`로 강제 실행불가**이며, 제어 저장소의 승인 전용 `approvals/writer-updates/`에 등록하지 않았다. 임의 승인권 행사가 아니라 검토용 자료다.

- 정확 소스: `sourceBranch=codex/w05-bls-service-r3-05-lineage-ci-20261117`의 Git ref가 `372c641ee2c8b6cb0c326e06b60b889bb38b05f0`로 원격 확인됨. 기존 Draft #1207/Node CI와 동일. 추가 파일 10개 중 승인 후보는 **R3C collector, R3D reader, R4 preview 세 파일만**. 각 `afterSha256`은 §46의 실제 bytes SHA로 고정. PUBLISHER/CMD/test/Worker는 이 오버레이에 넣지 않음.
- preimage(2026-11-17 #1860 기준): PC `sourceRoot=E:\ZGmini\projects\zgmini-earnings-history-pc-release`, `baseHead=baseConfigSourceSha=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388` (로컬 합성 SHA), 대상 물리 파일 `ABSENT`. 후보의 `change=A` 및 `beforeSha256=null`은 **잠정**. #1860 `gitTracked=UNKNOWN`이므로 Git 인덱스·preimage-HEAD·dirty를 별도 확정하기 전 B 승인으로 전환하지 않음. 기존 A scope JSON의 M 표시는 진짜 Git tracked M 증거가 아니라 과거 조사 목적의 기대 효과다.
- 운영 효과는 기존 source-only B 범위: `runCount=1`, `allowProviderCalls=false`, `allowDbChanges=false`, `allowD1Writes=false`, `allowTaskDefinitionChanges=false`, `allowOtherSourceChanges=false`. `protectedFiles=[]`, `runtimeDependencies={taskXmlSha256:null,consumers:[]}`는 **영향 없음이 최종 입증된 승인 값이 아니라 현재 제안의 미충족 사전확인 항목**이므로 실제 보호 소비자가 있으면 승인 전 범위/해시 교정 필요. 기존 공용 원장의 실제 Writer lane 경합 확인은 적용 직전 한 번에 처리.
- 실제 공통 [`writer-b/windows-adapter.mjs`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/writer-b/windows-adapter.mjs) 정독: `readPcPreimage`는 Git HEAD/branch/config/Task/dirty 및 A 파일 물리 부재를 확인하고, `prepareIsolatedCommit`에서는 로컬 base `git ls-tree` 결과에 대하여 `change='A'`이면 **`ls === ''`**, `M`이면 `100644 blob`을 강제, 불일치 시 `WRITER_B_GIT_MODE_PREIMAGE_STOP`으로 중단한다. 불일치 보호검사를 없애지 않고, 독립 제어 Controller 추가 설치 또는 소비된 #1860 A를 무의미하게 재실행하지 않는다. 이는 **기존 B 코드의 안전 장치 확인이지 #1860 당시 Git tree가 A였다는 실측은 아니다.**
- 외부 공급자 원자료·운영 PC 바이트/Task/SQLite/D1/Cloudflare·실제 승인 B manifest / 설치 Issue의 이번 변경·실행 **0건**. R4 게시기 추가 상대 import/helper/Worker D1 key 의존성은 여전히 §46 기준 후행.

**LAST PASS:** 로컬 Git 상태를 실제로 안다고 가정하지 않고 source-only 정확 3파일 제안물/제어 계약 제약과 A/M fail-closed 실행기 검사를 비교, 비실행 GitHub artifact 원격 저장 재조회 PASS. **FIRST UNFINISHED:** 승인권자가 검토한 실제 `APPROVED_B` manifest 원문·현재 PC index/HEAD/protected/lease 증거 및 정규 Source B 설치 결과 없음. 단순 Draft/CI를 설치 완료로 승격하지 않음.

**NEXT/담당/성공 조건:** W05 기능 담당이 기존 공동 Writer B Source Owner와 현재 PC 로컬 source HEAD 및 `ls-tree` A/M, 기존 승인 보호 소비자·충돌 유무를 **승인된 비파괴 자료 또는 정규 B의 안전 사전검증 범위**로 확정. 실제 승인 범위가 정해지면 proposal의 해시·상태·원본 보호를 반영한 정식 `APPROVED_B` manifest를 제어 저장소에 별도 고정하고 정확한 한 번의 B 설치, 원격 결과 JSON/TXT readback. 이후에도 WPSFD42 신규 provider POST·SQLite append는 **별도의 B 효과 승인** 없이는 수행하지 않는다.

**종료 단계 상태:** R3-04 `PARTIAL_SOURCE/INSTALL_NOT_READY`, R3-05 `SOURCE_CI_PASS`; 연속 DONE 26/82·개별 DONE 28/82 유지. W05 원담당 기존 브랜치의 **1개 proposal 파일과 이 진행기록 갱신만**, 실제 PC/공급자/DB/D1/DNS/Production/Task 무변경.

## 48. R3-04 (2026-11-17 11:41:19 KST) 중복 A 스냅샷 Gate 제거, 기존 Writer B fail-closed 설치 사전검증 확인 — B_APPROVAL_REQUIRED

**사용자 목표:** 승인된 WPSFD42 PC 수집→원자료 SQLite 저장/재조회→저장자료 서비스 2행 계산→후속 D1/API/UI. 이전 §47 non-executable 3파일 제안과 PC A #1860 결과는 재사용. **개별 DONE 28/82(34.1%)·순차 DONE 26/82(31.7%)** 변경 없음.

- **실제 A 검사기의 한계 확정:** 제어 main `controller/writer-install-preimage-readonly.mjs` 함수 `filesFor`는 scoped 경로마다 literal `gitTracked:'UNKNOWN'`을 먼저 넣고 이후에도 Git index/ls-tree 조회로 바꾸지 않는다. 따라서 #1860 `gitTracked=UNKNOWN`은 PC 오류·소스 설치 실패나 추적 불일치 실증이 아닌 **기존 A 출력 스키마의 고정 미측정**이다. #1860 동일 manifest 재요청해도 이 항목은 해결되지 않으므로 **새 A 스냅샷/별도 Controller 패치를 선행 필수 Gate에서 제거**.
- **실제 #1860 범위:** sourceRoot `E:\ZGmini\projects\zgmini-earnings-history-pc-release`, `HEAD=config.source=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`, `sourceIdentityConsistent=true`, 4파일 `state=ABSENT`, `runtimeSourceVerified=false`. source identity 일치는 조회 checkout의 상태에만 해당한다. 이전 [실측 #1860](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1860#issuecomment-6935505298)의 원본을 재사용, 현시각 재관측으로 과장하지 않음.
- **B 설치기 강제 검증 내재:** 기존 [`writer-b/windows-adapter.mjs`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/writer-b/windows-adapter.mjs)의 `readPcPreimage`는 설치 직전 현재 HEAD/branch/config/Task·dirty·A 파일 물리 부재/기존 M sha를 읽고, `prepareIsolatedCommit`은 `git ls-tree BASE_HEAD -- file`로 `change='A' : ls==''`, `change='M' : ls startsWith('100644 blob ')` 강제. 불일치면 `WRITER_B_GIT_MODE_PREIMAGE_STOP`으로 설치 전에 안전 중단. 제어 main [`writer-b/contract.mjs`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/writer-b/contract.mjs)은 3개 파일의 정확 승인 manifest/해시, effect false, Task 보호/소유권을 별도로 강제한다. Writer B PC 실행 결과는 **아직 없음**, 사전검사 소스의 구조 확인만 수행.
- **후보 source CI:** [앱 PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207) head `372c641ee2c8b6cb0c326e06b60b889bb38b05f0`, 기존 실제 Node24 CI #43993495209 PASS. 3개 목표 원본 SHA256은 §46과 [W05 비실행 제안 JSON](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json)의 3개 target. 원격 Git branch/W05 이력에만 자료가 있고 제어 `approvals/writer-updates` B 승인 파일에는 아직 없다. PR Draft/CI와 PC source 설치는 별개.
- **신규 중요한 구분:** 승인 없는 B 설치 실행을 차단하는 실제 조건은 현재 `PROPOSED_NOT_APPROVED`이며, **신규 미승인 Controller 기능·스냅샷 요청·전체 Runner idle 검사·Writer B 사전검사 변경은 불필요**. 승인권자가 exact 3파일 source-only 효과(Provider/SQLite/D1/Task 쓰기 false)를 승인하는 정식 원본, source Owner의 실제 공유 checkout 충돌/보호 영향 검토가 남았다. 같은 운영 checkout 변경이 동시에 걸리면 lease로만 직렬화, 기존 정상 기능 독립 실행은 중단하지 않는다.
- 정식 B 단계까지 **후보 `change='A'`는 안전 preflight 통과 조건부**. 불일치면 Writer B가 fail-closed하고, 그 정확 오류·원본 SHA에 따라 M 후보를 다시 검토할 수 있다. `status=APPROVED_B`나 사용자 승인이 없음에도 GitHub 파일 상태를 임의 변경·Issue 기동하지 않는다. APP/CTRL main HEAD 변화가 있더라도 PC local overlay HEAD를 GitHub HEAD로 착각하지 않는다.

**LAST PASS:** #1860 PC 4파일 조회, PR #1207 source CI, §47 3파일 비실행 명세, 기존 공통 B의 실제 preflight 강제검사 소스 확인. **FIRST UNFINISHED:** 정확한 B급 소스 운영 설치 승인 및 실제 설치 결과; WPSFD42 공급자 POST·SQLite append B 승인/원자료/13개월 계산은 후행. 소스-only B 승인은 **원자료 수집 승인과 별개**.

**NEXT 하나:** W05 담당은 이 제안에 적힌 정확 3파일 candidate SHA/after SHA/효과 false를 공유 source Owner와 한 번에 승인 정본으로 확정한 뒤 `pc-writer-source-install` 정규 단회 설치 요청, 결과 JSON/TXT 및 PC 실제 파일 hash·HEAD/config readback. **승인 없이는 설치 Issue 발행 금지**. 그 이후 별도 B급 provider/SQLite 효과 승인 및 WPSFD42 수집, R3-05 계산으로 진행. 완료율 28/82,26/82 유지.

**변경:** 이 W05 지정 진행 Markdown 1파일만; 운영 PC 소스, 공급자 호출, SQLite/D1/Task/배포 쓰기 0건.

## 49. R3-04 (2026-11-17 11:51:21 KST) 실제 수집기 결과 로그가 운영 SourceRoot를 더럽히는 결함 수정 — SOURCE_CI_PASS / PC_INSTALL_NOT_READY

**진행률:** 개별 28/82 DONE(34.1%), 순차 26/82 DONE(31.7%), 첫 미완료 R3-04 그대로. 이전 #1860 PC A 4파일 ABSENT, §47 비실행 B 제안, §48 기존 Writer B fail-closed 사전검사 증거 재사용. 신규 B 승인/운영 PC 실행은 없음.

**새로 확인하고 고친 구체적 결함:** [실제 PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207)의 `scripts/pc-writer/EARNINGS_R3C_BLS_STORE_ONCE.mjs`는 성공/실패에 관계없이 `HERE`(운영 source checkout의 `scripts/pc-writer/`) 아래 `EARNINGS_BLS_SERVICE_R1_RESULT_<stamp>.txt`를 `flag:'wx'`로 기록했다. 설치 직후 수동 실행은 Git 추적 밖 운영 소스에 일회성 결과 로그를 늘려, Writer B가 검증하는 worktree/dirty와 후속 배포 안정성에 불필요한 영향을 줄 수 있다. 실제 PC에서 파일이 생성된 것은 아니며 코드 경로의 사전 결함이다.

- 변경(정확 2파일, PR #1207의 기존 브랜치 `codex/w05-bls-service-r3-05-lineage-ci-20261117`): `import os from 'node:os'`, 결과 경로 `resultLogPath(stamp,{includeServices})`는 `os.tmpdir()` 아래 고정된 `EARNINGS_R3C_BLS_STORE_ONCE_RESULT_<stamp>.txt` 또는 `EARNINGS_BLS_SERVICE_R1_RESULT_<stamp>.txt`만 생성. UTC stamp 검증(`YYYYMMDD-HHMMSSZ`) 실패 시 안전 거부. `RESULT_LOG_LOCATION=USER_TEMP`를 비민감 진단 TXT 내부 기록. `HERE` 상수 및 source 폴더 쓰기 제거, 공급자 API/SQLite/원장/산식/시리즈/호출 횟수 변경 0.
- 추가 회귀: `tests/earnings-r3c-bls-service-once.test.mjs`에 두 로그 모드의 정확 `os.tmpdir()` 대상/파일명 및 잘못된 stamp 거부 assertion을 포함한 신규 Node test 1건. 테스트는 기존 source import만 수행하므로 provider/실 PC DB 접근하지 않음. 정적 source readback에서 `path.join(HERE)` 참조가 0건임을 확인.
- **변경 source 최종 HEAD:** `d0e2ae07fcf7ff658b65930284e5f4e6a0b80b2a`; 1번 수집기 blob `509b60b68e924916df4fda044f769837bfdf1995`, SHA256 `a2ed6e1b6b5b9295b4632ac978f058a032665b1041c24d73334c62c42719dca1`; 테스트 blob `2e41f1cecb012d29516c0d4a7b67b4842c6096f1`. SHA256 구현의 abc 표준 벡터 PASS. 기존 R3D/preview after SHA는 §46의 고정 값을 유지. old approved source `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`는 새 후보 HEAD와 혼용하지 않음.
- **B 제안 stale SHA 안전 수정 완료:** [`docs/EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json`](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json)의 `candidateSourceSha`와 R3C `afterSha256`를 최신 exact source에 반영, 기존 B 승인 아님을 강조하는 `status=PROPOSED_NOT_APPROVED` 및 5개 side-effect=false 보존. 갱신 commit [24f95723](https://github.com/ansqhd5774-Choi/zgmini/commit/24f957236110954a4b0bcdabfa2aa11da375e9e5), source branch/app docs branch 각각 별도 SHA.
- **현재 CI:** 신규 정확한 HEAD `d0e2ae07...`의 자동 [Node.js CI #44005617374](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44005617374) 실제 시작, `completed/success`: Build·Type·Regression tests·PC publication recovery·Cloudflare read contracts 모두 PASS. **이전 #43993495209는 이전 HEAD의 PASS**, 최신 `d0e2ae07...`는 #44005617374 완료 PASS. PC 설치 증거는 아님.

**LAST PASS:** W05 소스 branch 2파일 실제 GitHub 수정·blob 및 JS SHA256 조회, W05 docs branch의 비실행 제안 SHA 재핀, 새 exact HEAD Node CI #44005617374 `completed/success` PASS. **FIRST UNFINISHED:** 정확 source-only B 승인·운영 PC source 설치/원격 SHA, 신규 Node CI PASS는 완료. R3-04 실제 WPSFD42 수집/SQLite 원본은 이후 별도 B 효과 승인 없이는 실행하지 않는다.

**NEXT:** 새 Node CI #44005617374 PASS 증거 재사용, 이 최신 exact SHA로 Source Owner 승인 B manifest/기존 Writer B 설치를 진행. 소스 회귀검사 반복 불필요; 기존 정상 공통 Controller 재설치/새 진단기/A #1860 반복 금지. 운영 PC/DB/D1/Task/DNS/Cloudflare/공급자 변경 0.


## 50. R3-04 (2026-11-17 11:57 KST) 승인 원장 및 PR 최신 상태 대조 — APPROVAL_NOT_REGISTERED

**시작/종료 진행률:** 순차 DONE 26/82(31.7%), 개별 DONE 28/82(34.1%). 첫 미완료 R3-04. §49의 소스 수정 및 Node CI #44005617374 PASS 재사용; 신규 공급자 호출/운영 쓰기 없음.

- **승인 등록 실조회:** 제어 저장소 main `approvals/writer-updates/` GitHub Contents API를 직접 조회하여 현재 반환된 87개 manifest 파일명 전체를 검사. `earnings`, `wpsfd`, `r304` 이름의 W05 3파일 승인 manifest는 **0개**. BLS 관련 다른 승인 파일은 존재하나 이를 W05 설치 승인으로 대체하지 않음. 파일명 검색은 다른 디렉터리나 비표준 파일명 속 내부 승인까지 부정하는 전역 증거가 아님. 근거: https://github.com/ansqhd5774-Choi/zgmini-pc-control/tree/main/approvals/writer-updates
- **소스 PR 실조회:** https://github.com/ansqhd5774-Choi/zgmini/pull/1207 는 조회 시 `state=open`, `merged_at=null`, head `d0e2ae07fcf7ff658b65930284e5f4e6a0b80b2a`. §49 최신 Node CI PASS 원본과 동일 소스 HEAD. PR 오픈은 설치 승인이나 운영 배포가 아님.
- **LAST PASS:** PR 최신 소스 HEAD와 이전 PASS CI의 동일성, 제어 main 승인 폴더의 실제 파일명 목록 조회. **FIRST UNFINISHED:** W05 정확 3파일에 대한 승인된 source-only B manifest, 현재 운영 PC preimage/설치 readback, 이후 별도 WPSFD42 provider+SQLite B 효과 승인. R3-04 `PARTIAL_SOURCE/INSTALL_NOT_READY`, R3-05 `SOURCE_CI_PASS` 유지.
- **NEXT/담당/성공 조건:** 공유 Writer B Source Owner가 §49의 고정 source SHA 및 3파일 after SHA를 기존 정식 계약으로 승인하고 실제 보호 영향·lease를 확인 → 정규 `pc-writer-source-install` 단회 실행 → JSON/TXT와 PC 실제 3파일 SHA readback. 수집은 별도 B 효과 승인 뒤에만 수행. 승인 manifest를 임의 생성하거나 `PROPOSED_NOT_APPROVED`를 변경하지 않음.

**이번 변경:** 지정 진행 기록 1파일에 실제 조회 근거 추가. 운영 PC/SQLite/D1/Task/Production 변경 0.

## 51. R4-09 (2026-11-17 KST) 독립 WPSFD42 Publisher/helper/test 3파일 원본 PR 통합·Node CI PASS — SOURCE_PR_CI_PASS

**유효 진행 시작점:** 연속 DONE 26/82(31.7%), 개별 DONE 28/82(34.1%), 첫 미완료 R3-04. 기존 #1860 read-only 4파일 ABSENT·§49 R3C TEMP 로그 수정 PASS·§50 설치 승인 부재 증거는 재사용, 중복 확인/운영 요청 0.

**새 실제 GitHub 작업:** 기존 Draft [PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207)의 source branch `codex/w05-bls-service-r3-05-lineage-ci-20261117`에 전담 W05 브랜치의 원본을 선택 도입하고 안전 경로를 수정. 신규 head `f1cfeb91c18bf6324bb7b7d04ac253f64d0442b5`, PR changed files 10→13, 새 파일 정확 3개:

- `scripts/pc-writer/earnings-publication-result-directory.mjs`: 기존 B 요청 폴더 override를 유지하며 기본 TMP `os.tmpdir()`를 사용. source commit `458f55885cdf2b8db2e47a326bef2f37ecb37341`, 최종 blob `934c6ecc0fb555602c2757b5830291c4ed8df337`.
- `scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs`: 기존 W05 WPSFD42 서비스 전용 2행 Publisher를 별도 D1 snapshot key·기존 stored-only 계산기 및 승인 dual-source gate와 함께 통합. `--dry-run` D1 0쿼리, `--apply --confirm-earnings-c-service-d1-write`만 실제 D1 적용 코드 경로. 기능별 CMD 2개에 대한 Git 추적 강제조건을 제거하고, 게시기 1개 자신의 tracked 검사 유지. 임시 결과는 TEMP/정확 요청 폴더로, 로그에는 절대 경로 대신 파일명/위치 종류만 노출. 새 commit `271e84a4d8d7af4975f8cf103b94999c02bdcde8`, blob `1b5c7a40729f68f6e30cf001dc7d4848e03c30fc`.
- `tests/earnings-publication-result-directory.test.mjs`: TEMP 기본 위치, exact B request 폴더/잘못된 경로 거부, Publisher의 CMD 비의존·일회성 로그 절대 경로 비노출 등 회귀 테스트. commit `f1cfeb91c18bf6324bb7b7d04ac253f64d0442b5`, blob `2f84a31f65808962c7336bfbcfbe84b6b8295b96`.

**검증:** 최종 exact PR head `f1cfeb91c18bf6324bb7b7d04ac253f64d0442b5`의 [Node.js CI #44006959055](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44006959055) **completed/success**. 원래 Worker `EARNINGS_C_SERVICE_SNAPSHOT_KEY` blob `d8df9f1cbbed67c5a508da5bd9767fa85987149f` 및 R3D/Preview·D1 gates와 상대 모듈 의존 결속, 다른 기능 소스 보호. 이것은 **source CI**이지 운영 PC 설치/D1 실제 쓰기/Worker Production 배포가 아니다.

**별도 B 제안 원본 정합:** [비승인 Writer B 3파일 제안 JSON](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json)의 `candidateSourceSha`만 최신 PR head로 갱신(commit [658fd4c3](https://github.com/ansqhd5774-Choi/zgmini/commit/658fd4c3f70a1d8edb17cd775e63544d52ddaa5c)); R3C/R3D/Preview SHA256과 source-only 다섯 쓰기금지 플래그·`PROPOSED_NOT_APPROVED`는 유지. 새 R4 게시기/helper는 해당 3파일 PC 설치 후보에 포함시키지 않았다.

**LAST PASS:** PR source 3파일 신규 생성·원격 readback, 정확 HEAD Node CI completed/success, 기존 W05 3파일 source-only proposal 최신 HEAD 재핀. **FIRST UNFINISHED:** R3-04 정확 B source-only 승인 및 실제 PC source 설치/WPSFD42 원자료 저장; 별도로 R4-09 Draft PR main 선별 병합, 후속 승인 D1 게시·readback/API/UI 미진행.

**NEXT:** R3-04 W05 기능 원담당 + 공유 Writer B Source Owner가 이미 확보한 정확 3파일 SHA·보호/lease·승인 source 범위로 정규 B manifest를 확정한 뒤, 기존 Writer B 단회 설치/실제 PC readback. WPSFD42 provider/SQLite B 효과는 별도 승인 전 실행 금지. R4-09는 main 병합 시 Cloudflare Git Integration의 실제 Production 영향이 있으므로 별도 승인 전 Draft/unmerged 유지. 공급자·SQLite·D1·Task·DNS·배포 운영 쓰기 0.

## 52. R4-09 (2026-11-17 KST) D1 게시기 결과 폴더의 소스 내부·symlink 오염 경계 실수정 및 CI PASS — SOURCE_CI_PASS

**진도:** 순차 DONE 26/82(31.7%), 개별 DONE 28/82(34.1%), 첫 미완료 R3-04. 이전 §51 게시기/helper/test 소스 준비 및 CI #44006959055 PASS 증거는 재사용. 신규 운영 PC·공급자·SQLite·D1·Task·Production 실행 0.

**실제 결함 2건:** (1) `ZGMINI_EARNINGS_C_LOG_DIR`이 이미 존재하는 absolute directory라면 Publisher의 소스 root·하위 폴더·그 안을 가리키는 symlink/junction도 결과 TXT 대상으로 통과하여 source checkout을 오염시킬 수 있었다. (2) 잘못된 요청 폴더가 거부되어 실제 TEMP에 오류 기록을 쓴 경우에도 단순 환경변수 존재만으로 `LOG_LOCATION=B_REQUEST_DIR`이라고 잘못 표기할 수 있었다. 이는 운영 PC 발생 실증이 아닌 코드 안전 경계 결함 재현/개선이다.

**정확 수정 소스(기존 PR #1207 source branch `codex/w05-bls-service-r3-05-lineage-ci-20261117`):**
- `scripts/pc-writer/earnings-publication-result-directory.mjs` blob `43f3797ac2030d9f82e307ce1b72c79a11f17b89`: 실제 `realpath`와 `path.relative`로 source root/descendant/symlink alias 경로 출력 차단. 유효한 사용자 TEMP 및 source checkout 밖 기존 B request 폴더는 허용; 불명확한 source root는 fail-closed. 기능별 새 CMD/Task·DB 접근 없음.
- `scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_D1_ONCE.mjs` blob `6a3aa681e7e47ecca2b10cae23e888ada2fa333a`: 위 helper에 `excludedSourceRoot:stageRoot` 전달. 로그 위치를 env 존재 여부가 아니라 실제 기록될 `resultDirectory`와 `os.tmpdir()` 비교로 표기. 승인 D1 dual-source 검사, 서비스 별도 key, `--apply` 명시 승인 gate/기존 base 5행 보호는 그대로.
- `tests/earnings-publication-result-directory.test.mjs` blob `51a4ed0a995ae0618893470de8d4207c6013cebf`: source root/child, symlink·junction 우회, 정상 sibling B 결과 폴더 및 user TEMP fallback, 잘못된 source root 경계, Publisher 실제 위치 보고 정적 확인 추가. 공급자/운영 DB/D1 없음.

**검증 완료:** [PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207) 정확 HEAD `8428729d53571af63a6dbd58bd602c7f68061244`; [Node.js CI #44008513869](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44008513869) `completed/success` (GitHub 원격 재조회, 업데이트 `2026-11-17T03:14:48Z`). 해당 코드 3개 Git blob/readback 확인. 이전 CI #44006959055는 이전 HEAD만 검증한 것이라 새 HEAD 검증 근거로 중복 사용하지 않음.

**기능 승인 범위 유지:** W05 원담당 브랜치의 비실행 `docs/EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json`은 후보 source HEAD만 `8428729d...`로 최신화(commit [400b43a3](https://github.com/ansqhd5774-Choi/zgmini/commit/400b43a360f10b576758b2d76090f2533ca3ed30)). 설치 대상 R3C/R3D/Preview 3파일 및 정확 after SHA256·source-only 5개 effects=false·`PROPOSED_NOT_APPROVED`는 그대로. R4 Publisher/helper를 이 3파일 설치에 포함하지 않음.

**LAST PASS:** 코드 3파일 GitHub source 실제 변경, exact head CI PASS·진행기록 원격 반영. **FIRST UNFINISHED:** R3-04 source-only Writer B 승인+실 PC 설치, 별도 WPSFD42 supplier POST/SQLite B 효과 승인+원자료 읽기 검증, 후행 R4-09 main/Cloudflare 게시+정확 D1 key/API/UI 실증. 소스 PR Draft/CI만으로 운영 완료로 승격하지 않음.

**NEXT(우선 한 건):** 기존 공유 Writer B Source Owner는 현재 3파일 정확 source-only 설치 manifest와 공유 source 보호/lease만 승인 계약으로 확인하여 단회 설치→실 PC file SHA와 JSON/TXT를 readback. 승인되지 않은 source/DB/D1 쓰기는 하지 않으며 #1860 A 재실행·새 Controller 진단·기존 QFR 반복 불필요.

## 53. R4-09 (2026-11-17 12:29:00 KST) Worker 진짜 D1 서비스 5+2행 게시·GET 병합·독립 key 무결성 회귀 추가 — SOURCE_CI_PASS

**진행률:** 개별 DONE 28/82(34.1%), 순차 26/82(31.7%), 최초 미완료 R3-04. §52의 Publisher 경로 보호/CI PASS 및 기존 #1860 운영 PC 4파일 부재 A 결과 재사용. 실제 PC·공급자·SQLite·D1·Task·Production 변경은 이번 0건.

**실제 기능 검증 보완:** 지금까지 R4-09의 새 Publisher/helper는 소스/경로 CI를 통과했지만 **서비스 전용 Worker/D1 writer와 공개 GET 합성 경로 자체를 모의 DB로 함께 검증하는 5+2행 회귀가 없었다.** 이를 진짜 Worker 소스 import를 사용하는 `tests/earnings-c-service-d1-reader.test.mjs` 1파일로 추가, 3개 Node test 수행. 기존 승인 수집 계약/산식/가중치·TTL·공개 키 등 프로덕션 코드는 변경하지 않음.

- 검증 1: BLS base 5행 별도 `EARNINGS_C_SNAPSHOT_KEY` 저장 후 서비스 2행 `EARNINGS_C_SERVICE_SNAPSHOT_KEY` 별도 저장. GET 미게시 때 5행·`NOT_PUBLISHED`, 서비스 게시 후 7행·`READY` 및 합성 sourceVersion 64자. GET은 정확히 두 SELECT 키만 요청하며 모의 D1 WRITE가 0이고 원래 base 5행 body byte 그대로.
- 검증 2: 서비스 2행을 base5 키로 직접 쓰면 `EARNINGS_C_SERVICE_REQUIRES_SEPARATE_KEY` 거부. 반대로 base payload를 서비스 2행 전용 키로 쓰면 `EARNINGS_C_INVALID_SERVICE_PAYLOAD` 거부. 동일 서비스 2행 재게시 `ALREADY_STORED`에서 중복 D1 쓰기 0.
- 검증 3: 별도 서비스 D1 snapshot body의 현재값과 history 마지막 점이 상충하는 오염 증거를 저장해도 공개 GET은 `x-earnings-c-service: INVALID`로 표시하고 **기존 유효 5행은 그대로 200 유지**, 오염 2행은 노출하지 않음. 실제 D1 API가 아닌 메모리 모의 저장소만 사용.

**실제 GitHub 소스:** 신규 파일 `tests/earnings-c-service-d1-reader.test.mjs`, 최종 Git blob `ead6074ad06d4d1fff50e98838a29fdfc8188f26` (173 lines), 수정 최종 source commit [274f8a8e](https://github.com/ansqhd5774-Choi/zgmini/commit/274f8a8e925daf0456bd4dd1c6643faa27eb5d62), 기존 Draft [PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207) exact head `274f8a8e925daf0456bd4dd1c6643faa27eb5d62`. 처음 2+2 시험 대신 실제 기본 5행+WPSFD42 2행 시험으로 고정.

**전체 source 검증:** 새 exact head [Node CI #44009961071](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44009961071) **completed/success**; Build, Type check, Regression tests, PC publication recovery tests, Cloudflare candidate read contracts 모두 success. 중간 source commit `4560b7c2...`의 최초 CI #44009855457은 후속 test 수정으로 `cancelled`; 새 정확 HEAD 완료 CI만 PASS 근거.

**운영 source 비승인 후보 최신화:** [`docs/EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json`](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json) source HEAD만 `274f8a8e...`로 재핀(commit [720885e6](https://github.com/ansqhd5774-Choi/zgmini/commit/720885e635b51776bb67c4100a9145977b906c4e)). 여전히 `PROPOSED_NOT_APPROVED`, R3C/R3D/Preview 정확 3파일 + after SHA, five side effects=false, Publisher/helper는 승인 후보 밖, 원격 PC source 설치 B Issue 발행하지 않음.

**LAST PASS:** 실제 PR 1파일 기능 회귀 추가/원격 HEAD·blob 재조회/현재 Node24 GitHub CI PASS, 비승인 proposal 고정. **FIRST UNFINISHED:** R3-04 정확 source-only Writer B 설치 승인 및 PC 설치; 실제 WPSFD42 provider+SQLite B 효과 승인/PC 저장/checkpoint; R4-09 PR main 선별 적용 및 별도 D1 게시/API/UI 실증. CI는 운영 설치 증거가 아님.

**NEXT 필수 실행:** 공유 Writer B Source Owner는 정확 R3C/R3D/Preview 3파일의 current approved source/current PC preimage·공유 lease를 검토해 기존 B 승인 계약으로 source-only 설치를 확정하고 정규 단회 PC 설치/원격 결과 JSON/TXT/파일 SHA readback. 그 뒤 WPSFD42 API POST·SQLite append는 별도 B 효과 승인으로 수행. 다른 source 테스트 추가나 공통 Controller 전체 재검사를 필수 Gate로 삼지 않음.

## 54. R3-04 (2026-11-17 KST) 기존 Writer B 소스 설치 승인 검토 독립 Issue 등록 — REVIEW_REQUEST_OPEN / NOT_APPROVED

**시작·종료 진행률:** 개별 DONE 28/82(34.1%), 순차 DONE 26/82(31.7%). 최초 미완료 R3-04. 기존 #1860 PC A 4파일 부재, §49~53 R3C+7행 source CI PASS, 비승인 3파일 SHA 제안/기능 소스 완료 증거 재사용. 기능 설치/수집을 완료한 것이 아니므로 DONE 증가는 0.

**실제 신규 원격 조치:** [제어 저장소 비실행 승인검토 Issue #1885](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885) 신규 생성. 제목 `W05 R3-04 — WPSFD42 3파일 Writer B source-only 승인 검토 요청 [비실행]`. 요청 본문에 Source Owner가 바로 결정할 수 있는 정확 3파일 SHA, source candidate HEAD `274f8a8e925daf0456bd4dd1c6643faa27eb5d62`, 현재 #1860 PC base HEAD/config.source `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`, sourceRoot/configPath/Core Task, `A` 대상의 Git tree 사전검증, protected/lease/Task/consumer 사전조건, B source-only 5 effects=false, 별도 WPSFD42 provider+SQLite 효과 승인 경계를 모두 명기. 정규 Writer B 선례와 계약을 참조, 승인과 설치 결과를 정확 구분.

**안전 분류:** #1885는 **승인 검토**로서 `pc-writer-source-install` 제목 및 `pc-writer-b-install` 라벨/유효 `APPROVED_B` manifest/고유 설치 requestId를 만들지 않았음. 승인·설치 workflow를 자동 트리거하지 않고 원담당·Source Owner의 GO/NO-GO 결정을 요청하는 별도 Issue다. Issue 존재·GitHub 댓글은 사람이 승인했거나 타 ChatGPT 대화가 실제 전달/수신했다는 증거 아님(`OWNER_ACK_UNKNOWN`). 기존 #68 기록은 중앙 조정이지 PC lock/승인 대체 아님.

**기술적 NO-GO 판정 전제:** 당시 PC 읽기 검사 `gitTracked:UNKNOWN`은 고정 필드여서 `A` 파일의 Git index 부재를 확인한 것은 아니다. 설치 직전 기존 Writer B가 `git ls-tree` A/M, 실제 baseHead=config.source, 후보 source/target SHA, 영향 보호 파일/lease/Task·consumer, dirty file에 대해 fail-closed 검증해야 한다. 추가 전체 PC 스냅샷, 기능별 CMD/예약/Controller 재설치 금지. 정확한 B 승인/manifest 없이 검사기를 우회하지 않음.

**LAST PASS:** 현재 source PR #1207 정확 HEAD `274f8a8e925daf0456bd4dd1c6643faa27eb5d62` Node #44009961071 PASS, Source-only proposal `PROPOSED_NOT_APPROVED` SHA 일치, 최초 승인 목록 실조회에 W05 정확 3파일 승인 미등록. 지금 #1885 승인 검토 내용을 실제 control issue로 저장. **FIRST UNFINISHED:** 승인 Source Owner의 실제 GO/NO-GO·제어 `APPROVED_B` manifest 미확보, 운영 PC source 실제 설치와 원격 결과 0. Source-only 승인 이후 별도 WPSFD42 provider POST/SQLite append B 효과 승인도 미완료.

**NEXT 필수 실행 하나:** #1885의 책임 Owner가 정확 3파일의 기존 B급 승인 계약 내 GO/NO-GO를 확정. GO+정식 승인 manifest·원본 SHA 등록 시에만 원담당이 기존 정규 Writer B 고유 요청을 한 번 발행하고 `results/writer-b-source-install-<requestId>.json`·`.txt`/PC 실제 hash readback. NO-GO면 정확한 승인 부재/현행 base·Git tree·lease·consumer 증거로 최소 수정하고 별도 기능 개발/조회는 계속. 운영 source·공급자·SQLite·D1·Task·Production 변경 0.

## 55. R4-09 (2026-11-17 12:45 KST) 기존 서비스 D1 checkpoint 오염의 허위 ALREADY_STORED 방지 — SOURCE_CI_PASS

**진행률:** 순차 DONE 26/82(31.7%), 개별 DONE 28/82(34.1%) 불변. 첫 미완료 R3-04. [승인검토 #1885](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885) OPEN·댓글 0·assignee 0·label 0을 GitHub API로 확인했으며 Source Owner GO/NO-GO 및 정규 `APPROVED_B` manifest는 여전히 미확인. 승인·수신·PC 설치를 추정하지 않음.

**새로 확인한 소스 결함:** PR #1207의 `worker/earnings-companion-c-r4.mjs`에서 동일 sourceStoredAt·sourceVersion인 기존 D1 body를 볼 때 기존 payload만 검사해, projection의 `builtAt`가 실제 `stored_at`와 다르거나 `expectedSourceVersion`이 오염돼도 `ALREADY_STORED`를 반환할 수 있었다. 이는 실제 D1 발생 보고가 아니라 코드 기반 재현 가능한 안전성 결함. 소비자 GET는 같은 잘못된 서비스 체크포인트를 INVALID로 판단하므로, 게시 성공 표시와 공개 상태가 갈라질 수 있었음.

**정확한 수정·검증 (별도 source PR 브랜치 `codex/w05-bls-service-r3-05-lineage-ci-20261117`):**
- Worker `worker/earnings-companion-c-r4.mjs`: 기존 stored record의 envelope shape, payload, service-only id, projection 모든 필수 키, sourceVersion/sourceStoredAt/expected 값, `builtAt === stored_at`, 저장시각 범위 검증 후에만 멱등 성공을 반환. 오염값은 `EARNINGS_C_EXISTING_INVALID`로 안전 거부. 정상 동일 원본의 `ALREADY_STORED` 및 신규 저장/재조회 계약은 유지. commit [3fb3941a](https://github.com/ansqhd5774-Choi/zgmini/commit/3fb3941a5258ed0e4485082903a682da7739925e), blob `d8e81b601f3e99b90603bb3c9624fdcfb207cccc`.
- `tests/earnings-c-service-d1-reader.test.mjs`: 기존 checkpoint `builtAt` 또는 `expectedSourceVersion` 손상 2건에서 잘못된 `ALREADY_STORED`를 금지하고 추가 D1 `WRITE=0`을 확인. commit [ecd7b4ad](https://github.com/ansqhd5774-Choi/zgmini/commit/ecd7b4ad699e68780c2fce8d21734124f4aaafdf), blob `e848a4c02133eb27fed25c3d82ef16332228a139`.
- **정확 PR source HEAD** `ecd7b4ad699e68780c2fce8d21734124f4aaafdf`, [Node CI #44012092722](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44012092722) `completed/success` (2026-11-17 12:44:49 KST); Build, Type Check, Regression Tests, PC Publication Recovery, Cloudflare candidate read contracts 모두 PASS. [HEAD 비교](https://github.com/ansqhd5774-Choi/zgmini/compare/274f8a8e925daf0456bd4dd1c6643faa27eb5d62...ecd7b4ad699e68780c2fce8d21734124f4aaafdf)는 Worker+테스트 **2파일만** 수정. PR #1207은 Draft/미병합.
- [R3-04 비승인 proposal](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json)의 정확 `candidateSourceSha=274f8a8e...`와 [#1885 승인검토](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885)의 후보 SHA는 **기존 설치대상 R3C/R3D/Preview 3파일이 이번 diff에서 전혀 변경되지 않아 보존**. source HEAD가 새 PR SHA라고 이 비승인 설치 후보·manifest·요청을 자동 개정하거나 B 허가로 간주하지 않음. 실제 승인자는 고정된 원본 SHA와 현재 PC preimage·lease를 별도 검토해야 함.

**LAST PASS:** 승인 밖 독립 source 2파일 수정·GitHub blob 및 원격 exact HEAD CI 5단계 PASS; §54 승인검토 기존 상태 재확인. **FIRST UNFINISHED:** R3-04 Source Owner의 #1885 GO/NO-GO, 정규 `APPROVED_B`/PC 3파일 설치 readback; 별도 WPSFD42 provider POST+SQLite B 효과 승인/원본 저장·계산; R4-09 실제 main/D1/Production 미진행. **이번 운영 효과:** 공급자/PC/SQLite/D1/Task/DNS/Cloudflare/배포 0건.

**NEXT 필수 실행 하나 / 담당 / 성공 조건:** 공유 Source Owner의 #1885 정확 3파일 source-only B `GO/NO-GO` 결정을 원담당이 확인. GO와 제어 repo 정식 manifest 승인 원문 SHA가 실제 등록된 경우에만 고유 `pc-writer-source-install` 1회 요청 → PC 파일 SHA·원격 JSON/TXT 2/2 readback. NO-GO면 승인 담당자가 명시한 현재 PC base/index/lease/protected 영향만 보완. 임의 승인/실행/재요청 금지.

## 56. R3-04 (2026-11-17 12:53 KST) 승인검토 Owner 계정 지정·로컬 Git tree 검증 경계 확정 — REVIEW_ROUTED / NOT_APPROVED

**시작/종료 진행률:** 순차 DONE **26/82(31.7%)**, 개별 DONE **28/82(34.1%)** 그대로 유지. 첫 미완료 R3-04; §55의 PR #1207 exact Node CI PASS 재사용. 이번 운영 설치·provider/DB/D1/Task/Cloudflare/DNS 변경 **0건**.

**실제 새 원격 수행:**
- 제어 저장소 기존 [#1885](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885) `OPEN` 검토 이슈에 GitHub repository owner `ansqhd5774-Choi`를 **assignee 1명**으로 지정해 미지정 상태 해소; [근거 댓글 #6937717509](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6937717509)에 최신 원격 Source/CI, 이전 운영 base 조회 및 실제 결정 요청 연결. 확인시 #1885: OPEN, 댓글 1개, assignee 1명, 실행 라벨 0개. 이 지명은 승인권자나 별도 Source Owner의 실제 수신/GO/NO-GO를 인증하지 않으며 설치 권한을 부여하지 않는다.
- [Source 비교](https://github.com/ansqhd5774-Choi/zgmini/compare/274f8a8e925daf0456bd4dd1c6643faa27eb5d62...ecd7b4ad699e68780c2fce8d21734124f4aaafdf): #1885 고정 candidate commit `274f8a8e...` 이후 최신 PR #1207 HEAD `ecd7b4ad...`까지 **2개 커밋/수정 2파일만** `worker/earnings-companion-c-r4.mjs`, `tests/earnings-c-service-d1-reader.test.mjs`이고, 설치 목표 R3C/R3D/Preview 3개는 불변. §55 exact [CI #44012092722](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44012092722) `completed/success` 재사용; PR #1207 `draft/open/mergeable_state=clean` 확인. PC source 설치 후보 SHA를 성급하게 최신 전체 PR HEAD로 교체하지 않음.
- [W05 비승인 제안 JSON](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json) remote content 재조회: `PROPOSED_NOT_APPROVED`, source candidate `274f8a8e...`, 기존 3파일 `change:A`, afterSHA와 five write effects false 불변. 실제 미승인 제안을 제어 repo approved manifest로 옮기지 않음.
- 이전 PC [#1860](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1860#issuecomment-6935505298) 당시 checkout `HEAD=config.source=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`·3파일 디스크 `ABSENT` 증거를 재사용하되, `gitTracked=UNKNOWN`의 A/M 미측정 문제를 현재 확인된 것으로 승격하지 않음. 과거 PC local base SHA를 GitHub remote tree로 조회하면 API `422 Invalid object requested`이므로 **원격 Git tree로 이 PC local commit의 A/M을 확정할 수 없음**. 이는 현재 PC Runtime 실패가 아님. B installer의 실제 로컬 `git ls-tree` fail-closed preflight에서만 판정하며 추가 전역 A 스냅샷을 설치 Gate로 만들지 않음.

**LAST PASS:** #1885 운영 영향 없는 assignee/원본 review 댓글 원격 확인, 후보 SHA unchanged 3파일 source diff 확인, 기존 exact CI PASS 재사용. **FIRST UNFINISHED:** #1885 실제 승인권자 GO/NO-GO·제어 `APPROVED_B` manifest 및 설치 직전 PC current preimage/protected/lease·로컬 Git index, Writer B 단회 설치 JSON/TXT+3파일 SHA 증거 없음.

**NEXT 필수 실행 하나 / 담당 / 성공 조건:** #1885의 지정 GitHub 검토 계정·실제 공유 Source Owner가 3파일 정확 승인 범위 및 기존 Writer B 보호 요건을 검토하여 **GO/NO-GO를 원본 Issue에 명시**. 유효한 GO와 정식 `APPROVED_B` 승인 manifest 원문 SHA가 제어 저장소에 등록된 경우에만 W05 기능 담당이 기존 Writer B 고유 요청 **1회**, PC 로컬 preflight→실제 설치→원격 JSON/TXT 2/2 및 파일 SHA readback. NO-GO 시 명시 이유/정확 보호원본만 재정리. WPSFD42 공급자 POST/SQLite append는 설치와 별도 B 효과 승인 필요. 다른 무관한 기능 업무는 중단하지 않음.

## 57. R3-04 (2026-11-17 KST) Owner 승인 검토 실접수·WPSFD42 수동 preflight 효과/출력 정정 — SOURCE_CI_PASS / AUTHORIZATION_HOLD

**시작→종료 진행률:** 개별 DONE **28/82(34.1%)**, 순차 DONE **26/82(31.7%)** 불변. FIRST UNFINISHED=R3-04 source-only Writer B B급 정확 승인·PC 설치 및 WPSFD42 원자료 저장. 원본 증거 재사용; 무관 전체 PC snapshot 재조회 없음.

**공유 Source Owner의 실제 새 회신 확인:** [#1885 댓글 6938063151](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6938063151), [중앙 #68 댓글 6938147059](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6938147059). 요청 3개 `scripts/pc-writer/*.mjs`는 기존 Writer B 허용 경로와 합치나 **`TECHNICAL_SCOPE_ADMISSIBLE / AUTHORIZATION_HOLD`, B install NO_GO**. 정확 3파일 `APPROVED_B` manifest·현재 PC Git index `change:A`·current HEAD/config/lease/protected 영향 미검증. 과거 #1860 PC 당시 `ABSENT`는 새 설치 시점의 관측 아님. GitHub issue 댓글·assignee 자체를 사용자 승인 또는 PC 설치로 오인하지 않음.

**승인 밖 별도 실제 소스 결함 및 수정:** PR [#1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207)의 WPSFD42 수동 CMD들은 결과 TXT가 CMD 옆에 생성된다고 표시했지만 실제 source module `resultLogPath()`는 사용자 `os.tmpdir()`에 작성. preflight 모드 `--services-only --dry-run`은 R3C `fetchDirect()` BLS API **POST** 후 SQLite append만 생략하기 때문에 완전한 무효과 A 검사처럼 설명해서는 안 됨.
- `scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_APPLY.cmd`: TXT 위치 `%TEMP%` 및 소스 append의 D1/Production 비변경을 명확히 안내. [commit 2535c977](https://github.com/ansqhd5774-Choi/zgmini/commit/2535c9779b66558b999157b17f451c7a58bb8ff0), source blob `06d065616a6a7da65830cde7a8c57df86646f410`.
- `scripts/pc-writer/EARNINGS_BLS_SERVICE_R1_PREFLIGHT.cmd`: TXT 실제 `%TEMP%` 경로, dry-run 중 등록 BLS API POST가 발생하고 SQLite/D1 쓰기는 없음을 구별. [commit a96efed1](https://github.com/ansqhd5774-Choi/zgmini/commit/a96efed10665c30abd18f41ca9b2ad57e3884635), blob `06d0e728c00ba0990d59b70c4d5c4a5dfd59bc28`.
- `tests/earnings-r3c-bls-service-once.test.mjs`: 실제 두 CMD 안내에 TEMP/POST·쓰기효과가 맞는지 source assertion 추가. [commit 3e87c2f1](https://github.com/ansqhd5774-Choi/zgmini/commit/3e87c2f1641554919434f8d411537d59469b073b), blob `ae46480ec493674bf32bbb9ebabb3a165f7e344e`.
- 정확 source branch HEAD `3e87c2f1641554919434f8d411537d59469b073b` [Node.js CI #44017210227](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44017210227) **completed/success**; Build, Type Check, Regression Tests, PC Publication Recovery, Cloudflare candidate read contracts **5/5 success**. GitHub source readback 3/3와 [고정 후보 대비 compare](https://github.com/ansqhd5774-Choi/zgmini/compare/274f8a8e925daf0456bd4dd1c6643faa27eb5d62...3e87c2f1641554919434f8d411537d59469b073b) remote 확인.
- **설치 후보 보호:** #1885와 W05 비승인 제안 JSON의 `candidateSourceSha=274f8a8e925daf0456bd4dd1c6643faa27eb5d62`, 고정 설치 대상 **R3C/R3D/Preview 3개 .mjs의 bytes/after SHA256 그대로**. 이번 변경은 2 CMD·테스트 1개로, 추후 source-only B manifest 승인/PC 설치 후보로 임의 편입하지 않음.
- [#1885 후속 검토 댓글 6938359238](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6938359238)에 dry-run의 실제 POST 효과와 source 변경/승인 분리를 통지. 기존 소스만 수정했으며 provider POST/SQLite/D1/Runner/Task/Production 변경 0, 실제 실행 0.

**LAST PASS:** 실제 Owner 기술 검토 입수, PR source 3파일 수정 및 exact CI 5/5 PASS, 원본 설치 후보 3개 보존. **FIRST UNFINISHED:** 실제 권한자의 `APPROVED_B` manifest·현재 PC preflight/정규 Writer B 1회 설치 JSON/TXT readback, 별도 BLS POST+SQLite append B 효과 승인·원자료 저장/계산, D1/GET/UI 실증.

**NEXT 하나 / 담당:** 공유 Owner/승인권자가 #1885 정확 source-only 범위의 GO 승인 및 정규 manifest 원문 SHA 등록(또는 NO-GO 최소 수정 범위 회신); GO일 경우 W05 원담당은 기존 Writer B lease/actual HEAD·Git index·원본 보호 검증 후 단회 설치와 파일 SHA·JSON/TXT 2/2 readback. 다음 단계 원자료 BLS POST/SQLite append는 다른 효과 승인과 분리. 운영 변경/승인 효과 미추정.

## 58. R3-04 (2026-11-17 KST) BLS 동일 snapshot 멱등 SQLite readback 저장 계보 보호 — SOURCE_CI_PASS / B_APPROVAL_HOLD

**시작→종료 진행률:** 개별 DONE 28/82(34.1%), 순차 DONE 26/82(31.7%) 변동 없음. 최초 기능 미완료 R3-04는 PC 실제 WPSFD42 원자료 저장/체크포인트이며 본 수정만으로 DONE 처리하지 않음.

**실제 원인 확인:** 기존 R3C `insertPlans()`는 `ON CONFLICT DO NOTHING` 후 기존 동일 source chunk/snapshot을 다시 읽을 때 `payload_json`·row_count·chunk hash list와 `provenance.contract`만 대조. 동일 내용의 기존 `snapshot_sha256`이 있더라도 DB 저장 `status`·`retrieved_at`·`as_of`·`provenance.authority/retrievedAt` 등이 손상된 경우 `verified=1` 정상 반환이 가능. 하지만 후행 R3D `validateSnapshot()`은 동일 스냅샷을 거부할 수 있어 R3-04 저장 성공과 R3-05 계산 가능 상태 불일치. **실제 운영 SQLite 오염 관측이 아니라 소스상 재현 경로**임.

**수정 및 원격 검증:**
- [R3C commit 904068a0](https://github.com/ansqhd5774-Choi/zgmini/commit/904068a03723f228f2c8771c618cb8ab25247b49): transactional readback에 스냅샷 status/history_mode/as_of/retrieved_at/latest date, 기존 chunk first/last/first_seen 시각, 출처 metadata authority/seriesID/period/frequency/SA/unit/vintage/responseHash의 **자기 일관성 검증** 추가. 동일 hash가 이전 조회 시점에 저장된 정상 기존 snapshot이면 현재 새 요청 시각과 단순 비교하지 않고 그대로 멱등 성공 유지. 손상 snapshot은 `BLS_STORED_LINEAGE_MISMATCH_ROLLBACK` 안전 중단·BEGIN IMMEDIATE 거래 ROLLBACK. SQL schema/수집 대상/산식/기존 row 수정/공급자/예약 변경 없음.
- [회귀 test commit 2a9a38a4](https://github.com/ansqhd5774-Choi/zgmini/commit/2a9a38a452b5ba95a3e370c5b56445bb75fa05bb): WPSFD42 기존 동일 source snapshot의 **상태 손상, retrieved_at/as_of 변경, 출처 authority 변경 3건** 및 새 BLS 3개 삽입 시도 시 전체 롤백·기존 WPSFD42 1개 보존 확인. 외부 API/실제 PC/운영 DB/D1 무접근 mock SQLite.
- **정확 PR #1207 source HEAD `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb`**, R3C Git blob `9af935b853548df558f1b8b57929c500701470bd`, **new after SHA-256 `87e811b608ea7358c48aceebfe458e24e5887f2f31207481783abcad516a1af3`**. SHA256 계산은 이전 소스 바이트 재해시가 고정 이전 값 `a2ed6e1b6b5b9295b4632ac978f058a032665b1041c24d73334c62c42719dca1`와 일치함을 먼저 검증한 방식으로 수행. [원격 Node CI #44021987724](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44021987724) **completed/success**, Build·Type Check·Regression Tests·PC publication recovery·Cloudflare candidate read contracts 5/5 success. PR Draft/미병합; 운영 적용과 구분.
- [전담 비승인 후보 JSON](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json) **commit [cedc530a](https://github.com/ansqhd5774-Choi/zgmini/commit/cedc530aa6da0eb3418f83dd4aa451529a057dd1)**, blob `4aab3fbdbf02819ae650b478d9a668eb74f6c1e5`: `status=PROPOSED_NOT_APPROVED` 유지한 채 `candidateSourceSha=2a9a38a452b5ba95a3e370c5b56445bb75fa05bb`, R3C `afterSha256=87e811b608ea7358c48aceebfe458e24e5887f2f31207481783abcad516a1af3`로 고정. R3D `b441a52551a015ab9522280ee7c3f620fc8efd967c8dd0e6e04865bb72c97b31` 및 Preview `f3f6e41b3b61039580db7ab7f6bed3133eb305ffef35e4b4b7ea919e0220ea77` **그대로**.
- [승인 검토 #1885](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885) 원본 Issue 본문을 **위 최신 candidate/after SHA/CI로 실제 수정**했고 구 candidate `274f8a8e...`는 개정 역사로만 남김. 원본 [공통 Writer Owner 기술 경로 회신](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6938063151)은 구 후보에 대한 `TECHNICAL_SCOPE_ADMISSIBLE/AUTHORIZATION_HOLD`이며 신규 R3C 바이트 검토/실제 B 허가라고 주장하지 않음. 정규 `APPROVED_B` manifest 미등록, 설치 트리거/라벨/단회 요청 없음.

**LAST PASS:** 변경 R3C/test exact HEAD GitHub CI 5/5 PASS, before/after SHA 검증·비승인 proposal/비실행 Issue 갱신. **FIRST UNFINISHED:** Owner가 최신 source 후보로 정확 GO/NO-GO와 승인 manifest 등록, 실제 PC current Git tree A/index·lease/preimage/보호 consumer 사전검증 및 정규 Writer B 설치 JSON/TXT 2/2·PC 3파일 after SHA; 이후 별도 WPSFD42 BLS API POST/SQLite append B 승인 후 raw/checkpoint→R3-05 계산→서비스 D1/API/UI. 실제 PC/공급자/SQLite/D1/Task/배포 이번 변경 **0건**.

**NEXT 필수 행동 하나 / 담당:** 공통 Writer Owner·승인권자가 최신 #1885 source-only 3파일 범위·R3C `87e811b608ea7358c48aceebfe458e24e5887f2f31207481783abcad516a1af3` + R3D/Preview 불변 해시·현재 PC preimage/lease/Task 영향의 승인 여부를 명시해 제어 `APPROVED_B` manifest로 등록(또는 NO-GO 최소 수정 범위 회신). 원담당 W05는 유효 승인 시 기존 공통 B 단회 설치만 진행하고 운영 원자료 수집은 별도 B 효과 승인 후 수행.


## 59. R3-04 (2026-11-17 14:58 KST) 공유 Writer Owner 신규 후보 계약 재검토 수신 — CONDITIONALLY_ADMISSIBLE / APPROVAL_NOT_GRANTED

**시작→종료 진행률:** 순차 DONE **26/82(31.7%)**, 개별 DONE **28/82(34.1%)** 불변. 첫 미완료 R3-04. 이번에는 새 수집/설치/승인 없이 기존 증거와 신규 Owner 검토 회신을 대조함.

- [공통 Owner 회신 #1885 댓글 6939786360](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6939786360): 신규 source candidate `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb`의 **정확 3개 .mjs 파일**을 기존 Writer B 경로 계약상 조건부 수용 가능으로 재판정. 구 후보 대비 R3C 1개만 변경, R3D/Preview 불변. 다른 CMD 2개/테스트 2개/Worker 1개는 설치 allowFiles 범위 밖. 정확 CI #44021987724 PASS 증거 재사용.
- **판정은 `UPDATED_SOURCE_SCOPE_CONDITIONALLY_ADMISSIBLE / APPROVED_B_NOT_GRANTED / PC_INSTALL_NO_GO`**. `PROPOSED_NOT_APPROVED` JSON은 정규 승인 manifest가 아님. 현재 PC HEAD/config.source, local Git index의 `change:A`, lease, protected consumers, launcher/Task XML 의존성은 설치 전 preflight에서 검증해야 함. 과거 #1860의 3파일 ABSENT/HEAD 관측을 현행으로 승격하지 않음.
- 설치 3파일 after SHA-256: R3C `87e811b608ea7358c48aceebfe458e24e5887f2f31207481783abcad516a1af3`; R3D `b441a52551a015ab9522280ee7c3f620fc8efd967c8dd0e6e04865bb72c97b31`; Preview `f3f6e41b3b61039580db7ab7f6bed3133eb305ffef35e4b4b7ea919e0220ea77`. Source-only 범위에서 R3C `--dry-run`도 BLS POST가 가능하므로 실행 금지. Provider POST/SQLite append는 별도 B 효과 승인 필요.

**LAST PASS:** 신규 후보 3파일의 공통 계약 기술 적합성 재검토 회신 수신; 기존 exact source CI PASS 재사용. **FIRST UNFINISHED:** 승인권자 GO/NO-GO 및 정식 `APPROVED_B` manifest 원문 SHA, 현재 PC 로컬 preflight, Writer B 1회 설치 결과 JSON/TXT 2/2 및 파일 SHA, 별도 BLS POST/SQLite 저장 승인. **이번 운영 효과:** 0건.

**NEXT 하나 / 담당 / 성공 조건:** 공유 Writer Source Owner·실제 승인권자가 #1885의 신규 후보 3파일 해시와 현재 PC source/index/lease/Task/protected 영향에 대해 정확 GO/NO-GO 및 승인 manifest를 확정. 유효한 GO와 정식 manifest 등록 후에만 W05가 기존 Writer B 단회 설치 및 PC readback 수행. 승인 없이 트리거/수집/SQLite/D1 쓰기 금지.

## 60. R3-04 (2026-11-17 15:13 KST) W05 Owner 반환에 따른 실PC 승인 A 2건 실행·원격 JSON/TXT 회수 — PC_A_PASS / WRITER_B_APPROVAL_HOLD

**시작/종료:** 개별 DONE 28/82(34.1%), 순차 DONE 26/82(31.7%) 유지. `FIRST UNFINISHED=R3-04`는 실제 WPSFD42 공급자 원자료 SQLite 저장/검증이며 실PC read-only와 소스 CI로 DONE 승격하지 않음. 기존 #1860의 당시 3파일 디스크 `ABSENT` 근거는 재사용; 원본 A 재실행 0.

**프로세스 총괄 실제 반환:** [#1885/6940104268](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6940104268)과 [중앙 #68/6940072011](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6940072011)은 W05 원담당에게 승인된 A PC preimage/index·lease/보호 근거 준비와 정확 source-only B 효과 결정·정규 단회 설치 주관을 배정. 총괄의 기술 검토 `CONDITIONALLY_ADMISSIBLE`는 user 승인이나 PC 설치 권한 아님. 다른 기능 Controller 설치를 전역 Gate로 두지 않음.

**신규 실제 운영 PC A 2건:**
1. [Issue #1911](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1911#issuecomment-6940311592), [Actions Run 44029163006](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44029163006) `shared-resource-release-readonly`, 실PC Runner `zgmini-pc-01`, `completed/success` / 결과 `PASS/SHARED_RESOURCE_READONLY_SNAPSHOT`. [원격 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44029163006-1-seat-1.json) Git blob `842b49dfe90421e6e20d3894cfde1a979cc38794`, [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44029163006-1-seat-1.txt) `41e60897ee0bc4e292ed616b462fb66a2bc3dde0`. 원본 requestId `pc-87b4410f-9e5c-43bc-a921-7f10869c5d20`, `2026-11-17T06:10:08.295Z` 관측. 두 번의 시점 표본 source `config.source=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`·Task XML stable; `writerLockObserved=false`, `coreLockObserved=true`여서 `writer-source=OBSERVED_BUSY`; **`releaseVerified=false`**, lease/장기 작업 장애 의미 아님. 승인 source·Task 안정은 installer 권한/동시성 lease 대체 아님.
2. [Issue #1912](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1912#issuecomment-6940353740), [Run 44029403160](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44029403160) `pc-source-preflight`, 실PC `zgmini-pc-02`, `completed/success` / 결과 `PASS/PC_SOURCE_READONLY_DIAGNOSIS`. [원격 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44029403160-1-seat-2.json) Git blob `b3a42a48bea5d912ba15805998f1217cd100c943`, [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44029403160-1-seat-2.txt) `d95a937cc611624d62af0ecb71bd6aad557c52ae`. requestId `pc-b731ae5c-8aa3-4743-a8db-197b7c42d511`; `2026-11-17T06:12Z` checkout `projects/zgmini-earnings-history-pc-release` 고정 후보 `head=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`, `gitVerified=true`, `trackedDirty=false`, `configApprovedSha`와 마지막 Writer checkpoint `sourceHead` 일치/`status=VERIFIED`. 단 **`sourceResolved=false`**, `runtimeSourceVerified=false` — Task 정적 첫 hop만으로 실 Core 실행 checkout 증명 불가. 소스 인벤토리 178 .mjs+165 lib/worker 항목 등 **전체 원격 보고 `SUMMARY_ONLY`/343 entries omitted/`fullInventoryTransferVerified=false`**; 개별 A/M 인덱스 증거로 인용 금지.
3. 두 A 모두 실제 `controlSourceSha=384ffd09e80ad769e31596483dfe73e9ee8b6c6a`, `pcOperationalApprovedSha=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`, `protectedStateUnchanged=true`/before=after `591c8e7e...`, 운영 source/원자료/DB/D1/Provider/Task 쓰기 0. 해당 요청 고유 Run + 정확 결과 JSON/TXT **각 2/2 원격 fetch/readback** 증명, 재실행 금지.

**검증/한계 분리:** 기존 #1860 3파일 디스크 `ABSENT` 당시 관측 + #1912 현재 `trackedDirty=false`는 원격 PC Git `git ls-tree`의 **개별 대상 `A`/M 여부와 동일하지 않음**. `gitTracked=UNKNOWN` 지속. #1911은 Task XML 해시 `stable`만 반환, 실제 Task SHA256 raw 값/영향 consumer 부재/Writer B lease 만료·권한 승인 등 미인증. 두 A의 `PASS`를 `B_INSTALL_READY`로 승격하지 않음; Core lock 관측 시 `OBSERVED_BUSY`를 영구 차단으로 확대하거나 임의 lock 삭제하지 않음. 실제 적용 직전 기존 Writer B fail-closed `git ls-tree`/Task/lease/protected·자연 유휴 preflight에서 판정.

**다음 단계 실제 준비:** [승인 검토 원본 #1885에 이 두 A 실증 및 정식 B 효과 GO/NO-GO 추가 댓글 #6940381639](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6940381639). 신규 후보 source `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb`, R3C SHA256 `87e811b608ea7358c48aceebfe458e24e5887f2f31207481783abcad516a1af3`, R3D `b441a52551a015ab9522280ee7c3f620fc8efd967c8dd0e6e04865bb72c97b31`, Preview `f3f6e41b3b61039580db7ab7f6bed3133eb305ffef35e4b4b7ea919e0220ea77`. 비승인 제안 `PROPOSED_NOT_APPROVED` 그대로, 정확 승인 원문 SHA 없다. B 신청 label/설치/Provider `--dry-run` 포함 POST/SQLite/D1/Production 명시 효과 모두 0.

**LAST PASS:** 설치 전 필요한 범위의 실제 신규 A 2건+원격 TXT/JSON **4/4 PASS**; 현행 Git HEAD/config/checkpoint 일치 및 lock/Task 안정의 관측 범위 확인; 공통 #1885 정확 결정 요청 실기록. **FIRST UNFINISHED:** 신규 정확 Writer B source-only `APPROVED_B` manifest/GO + 대상 Git index A 및 protected·consumer/Task/lease final preflight → 단회 설치 JSON/TXT/3파일 after SHA, 별도 WPSFD42 API POST+SQLite append 승인/원본 저장. 현재 상태 `APPROVAL_HOLD`, 운영 수집/게시 기능 미완료.

**NEXT 하나 / 원담당:** 실제 승인권자가 #1885 신규 A 근거와 정확 3개 SHA·source-only 효과에 대한 **GO/NO-GO/원문 B manifest** 결정을 등록한다. 승인 시 W05 원담당은 기존 Writer B 단회 PC 설치로 실제 index/Task/lease/protected fail-closed·자연 Core 유휴·3파일 사후 SHA/원격 JSON·TXT 2/2를 확인한다. 소스 설치 이후 원자료 수집 B 효과는 별도, Core busy snapshot/다른 기능 설치는 불필요한 전역 차단으로 사용하지 않는다.

## 61. R3-04 (2026-11-17 15:26 KST) 정확 3파일 source-only Writer B 승인 효과 전수조사 및 정식 GO/NO-GO 댓글 등록 — APPROVAL_REQUEST_POSTED / B_NOT_GRANTED

**진행률:** 개별 28/82(34.1%), 순차 26/82(31.7%) 시작→종료 불변. R3-04 기능 미완료. 실제 설치·공급자/DB/Task 변경 0.

**실제 이번 조사 및 증거:** [승인 검토 #1885의 새 댓글 6940575319](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6940575319) GitHub 발행 후 원격 댓글 ID·GO/NO-GO 문구·해시·효과 범위 재조회. 후보 `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb` HEAD 불변·[CI #44021987724](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44021987724) completed/success 5/5 재사용. 후보 3개 .mjs **현재 GitHub 원문 byte SHA-256 계산 3/3 일치**, Git blob:
- R3C `87e811b608ea7358c48aceebfe458e24e5887f2f31207481783abcad516a1af3` / `9af935b853548df558f1b8b57929c500701470bd`.
- R3D `b441a52551a015ab9522280ee7c3f620fc8efd967c8dd0e6e04865bb72c97b31` / `196f6262b34b4f6df21f284810629e29e95c6d22`.
- Preview `f3f6e41b3b61039580db7ab7f6bed3133eb305ffef35e4b4b7ea919e0220ea77` / `fe73da0ba12944941c885a6fdd0cf66c0ff8bc11`.
- 상대 import 전수: R3C/R3D에 없음, Preview가 R3D를 직접 참조하며 이번 승인 3개 안에 존재. PR #1207의 변경 14경로 중 실제 B 허용 목록은 정확 이 3개 `change:A`이며 CMD 2개, publisher, Worker, tests, UI 등 11경로는 배포 제외. Git source HEAD와 운영 PC 승인 source HEAD/합성 PC local SHA를 구분.
- 공통 `writer-b/contract.mjs`, `windows-adapter.mjs`, `installer.mjs`, `git-stage.mjs`, `import-availability.mjs`, `core-idle-window.mjs`와 B Workflow 점검: approved manifest raw hash, event actor/단회 인증, 후보 SHA·after 3 SHA, `git ls-tree` A/M+untracked 충돌, before/protected/Task·consumer/lease, backup/provenance, Core 자연 idle 전환, rollback, PC 합성 HEAD/config.source, 결과 2/2를 기존 보호 기능으로 검증. **기능 B 승인은 별도이며 이 코드를 source CI PASS만으로 실PC 실행됐다고 주장하지 않음**.
- R3C 실제 `--services-only --dry-run`도 BLS API POST, `--apply`는 SQLite append. R3D 스크립트 직접 실행은 `HERE`에 TXT, Preview 직접 실행은 `HERE`에 TXT/JSON 출력하므로 E:\ 일시산출물 정책과 구분 필요. **이번 source-only Writer B 승인에는 3개 파일 실행 자체가 포함되지 않으며, 후속 기능 실행에서 TEMP 경로 정합 선행**. 이 출력 경로 결함은 source-only 설치 효과를 확대할 이유가 아니며 다음 기능 작업 시 수정·재검증한다.
- 승인 근거 [#1860](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1860#issuecomment-6935505298) 3파일 당시 disk `ABSENT`, [#1911](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1911#issuecomment-6940311592) 15:10 KST Core lock true/writer lock false/resource busy snapshot, [#1912](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1912#issuecomment-6940353740) 15:12 KST Git HEAD/config/checkpoint `2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`, trackedDirty=false, `sourceResolved=false`, `SUMMARY_ONLY` 343 항목 생략. 둘 다 PC A PASS, 원격 JSON/TXT **4/4**, Git index A/M·consumer/Task·lease release 승인 전제는 **미검증**.
- 제어 repo `approvals/writer-updates` 최신 목록 W05/WPSFD42 `APPROVED_B` 0; [비승인 proposal](EARNINGS_R304_WPSFD42_SOURCE_ONLY_B_PROPOSAL_20261117.json)은 `PROPOSED_NOT_APPROVED`. 기존 Owner #1885 `UPDATED_SOURCE_SCOPE_CONDITIONALLY_ADMISSIBLE / APPROVED_B_NOT_GRANTED / PC_INSTALL_NO_GO` 유지. 댓글은 실제 운영 권한을 대체하지 않음.

**승인 요청 효과 정확:** source 3개를 기존 Writer B로 1회 overlay, 필요 시 Core 자연 유휴 후 일시 Task pause/resume 및 로컬 synthetic Git HEAD/`config.source` 동기화. `allowProviderCalls/allowDbChanges/allowD1Writes/allowTaskDefinitionChanges/allowOtherSourceChanges=false`. BLS POST/SQLite append/계산·Preview 로컬 실행/D1/Cloudflare/Task 변경·수집주기는 승인 밖.

**LAST PASS:** source 3/3 SHA 계산+상대 의존성 1개 포함·공통 B 안전 경로 검토·실 PC A 두 건 4/4 결과쌍 재사용·정확 승인 요청 댓글 원격 수신 확인. **FIRST UNFINISHED:** 실제 권한자 GO/NO-GO, 정규 `APPROVED_B` manifest/원문 SHA·로컬 Git tree A/lease/consumer/Task 영향·유휴 순간 검증 및 한 번의 설치/결과 회수, 이후 별도 기능 효과 승인. 이 단계는 계획 검토가 아니라 **공식 승인 요청 전달 완료**이지 운영 설치 완료가 아님.

**NEXT 하나:** W05 Owner/정식 승인권자가 [#1885 댓글 6940575319](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6940575319)의 정확 source-only 범위 GO/NO-GO 및 `APPROVED_B` manifest를 회신. 승인되면 W05 원담당이 정규 `pc-writer-source-install` 1회, 사전 Git `A`/Task/consumer/lease/유휴/rollback CAS 통과 후 JSON/TXT 2/2·3파일 SHA와 source/config 보호 검증; 조건 불충족은 STOP/no retry.

## 62. R3-04 (2026-11-17 KST) 후속 원담당 기능 결함 수정: R3D·Preview 결과 파일 운영 checkout 오염 방지 — SOURCE_FIX_DRAFT / EXISTING_B_CANDIDATE_FROZEN

**시작→종료 진행률:** W05 개별 DONE **28/82(34.1%)**, 순차 DONE **26/82(31.7%)** 그대로. R3-04 기능 실제 수집→SQLite raw 저장 미완료. 기존 source-only B 정식 승인/PC 설치 미실행, 공급자·SQLite/D1/Cloudflare·운영 Task 변경 0건.

**총괄 완결 인계 재사용:** [원본 #1885/6940857555](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6940857555) latest 총괄 기술 판정은 정확 source candidate `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb` 3파일 `SOURCE_SCOPE_GO` 조건부이며 **`APPROVED_B` 효과 승인/설치 NO-GO**. [#1885 정식 승인요청 6940575319](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6940575319) 유지, 신규 #68 인계/중복 총괄 업무 요청 생성하지 않음.

**독립 실제 결함:** R3C는 이미 `os.tmpdir()`에 수동 TXT를 생성하지만, R3D 직접 실행 `main()`은 `path.join(HERE, 'EARNINGS_R3D...RESULT_*.txt')`로, R4 Preview 직접 실행 `main()`은 같은 `HERE`에 TXT+JSON을 생성. `HERE`는 운영 소스 checkout `scripts/pc-writer` 경로이므로 E: 지속성 데이터/임시 보고 분리 정책에 맞지 않고 Writer B 원본 checkout dirty/untracked 충돌을 유발할 수 있음. 이 문제는 실제 운영 실행 관측이 아니라 현행 소스에서 직접 확인한 출력 경로 결함임.

**수정:** 정확 후보 원본 `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb`에서 **별도 후속 브랜치** `codex/w05-temp-result-output-followup-20261117` 생성. 3커밋/3파일만 변경:
1. `scripts/pc-writer/EARNINGS_R3D_STORED_BLS_CALC_READONLY.mjs`: `os.tmpdir()` 기본값인 export `resultLogPath(stamp)`를 추가, timestamp `YYYYMMDD-HHMMSSZ` 허용 형식만 사용, 실제 CLI TXT 출력 위치를 `HERE`에서 사용자 TEMP로 변경. Git blob `53b36cafe8bf7839d19537aef3c72e736572e494`.
2. `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs`: export `resultPaths(stamp)`로 동일 stamp 검증 후 TXT/JSON 둘 다 사용자 TEMP 생성. Git blob `bce22ac1003f6f6a6f14532df8634dae13666047`.
3. `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.test.mjs`: 기존 CI 엔트리 `tests/earnings-r4-c-service-lineage.test.mjs`가 불러오는 테스트에 TEMP 기본/주입된 격리 TEMP·부적절한 stamp 거부 포함. Git blob `5a7f3fde29a5b85b7049a01cc81ea8c3034eb735`.

**원격 변경:** [Draft PR #1231](https://github.com/ansqhd5774-Choi/zgmini/pull/1231), **base가 승인 후보 branch**, head `7294088376b680d2a1673c20aaa7d4ae075a8419`. GitHub compare `ahead=3, behind=0, files=3` 확인. 기존 [Draft PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207) head는 정확 `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb` **보존**. W05 비승인 3파일 설치 proposal, #1885 고정 source candidate/afterSHA, 제어 B manifest 및 운영 source 전부 변경 없음. 후속 PR의 R3D·Preview 새 파일 해시는 기존 B 후보와 달라서 해당 승인 manifest에 **섞거나 자동 설치하지 않음**.

**검증 사실:** V8/GitHub 파일 내용 fetch에서 두 CLI 호출이 새 helper를 사용함·`HERE` 식별자가 남지 않음·노출 테스트 존재를 확인. 격리 Node v22.16 테스트는 위 정확 보조 함수 로직과 형식 입력을 별도 fixture로 재현한 **4/4 PASS**. 단 이는 실 GitHub 모듈/SQLite 전 과정 테스트가 **아님**. GitHub [PR #1231](https://github.com/ansqhd5774-Choi/zgmini/pull/1231)은 현재 `main`이 아닌 기존 source candidate branch를 base로 하므로 Node.js CI의 `pull_request: branches [main]`에 해당하지 않아 해당 커밋 CI Run **0건** 확인. CI 미실행을 성공이라고 표시하지 않고, 정규 통합/실제 후속 배포 전 기존 테스트와 Node CI 검증 필요.

**LAST PASS:** 신규 유효 기능 결함 하나를 별도 코드로 수정·3파일 변경 한정/원격 commit·Draft PR 재조회·격리 path smoke 4/4. 기존 W05 B 후보 및 승인 요청 SHA 불변.
**FIRST UNFINISHED:** R3-04 exact 3파일 B급 운영 효과의 정식 GO와 `APPROVED_B` manifest, 실제 단회 PC 설치(로컬 Git index/Task/lease/보호/CAS) 및 JSON/TXT 2/2, 이후 BLS WPSFD42 POST/SQLite append 별도 B 승인·실증. PR #1231 테스트는 독립 후속 source 작업이며 R3-04 완료 Gate로 추가하지 않음.

**NEXT 필수 행동 하나:** W05 원담당이 #1885 정식 승인 여부·정확 manifest를 확인, 정식 승인 이후에만 기존 공통 Writer B source-only 단회 설치→실PC 해시·JSON/TXT·Task 보호 확인. 프로세스 총괄 재인계 금지. 후속 PR #1231은 승인된 R3-04 고정 후보를 방해하지 않고 별도 CI/향후 source 개선 경로에 보존.



## 63. R3-04 (2026-11-17 15:58 KST) 정식 source-only B 승인 등록 및 설치 실행 접수 확인 — APPROVED_B / INSTALL_RUNNING

**시작→종료 진행률:** 순차 DONE 26/82(31.7%), 개별 DONE 28/82(34.1%) 유지. 첫 미완료 R3-04. 이번 회차는 기존 실행을 중복 접수하지 않고 최신 승인/실행을 원격 재조회.

- [공통 Owner 정확 효과 GO #1885/6941008513](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6941008513)에서 기존 후보 `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb`의 R3C/R3D/Preview 3파일 source-only 설치 1회 GO 확정. Provider POST, SQLite, D1, Task 정의 변경, 파일 직접 실행은 승인 제외.
- 제어 main 정규 [승인 manifest](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/writer-updates/w05-r304-wpsfd42-threefile-source-20261117.json) 실제 존재: `status=APPROVED_B`, Git blob `09d11ed051e0d5a76b7a3892836a50fc6eb9b52a`, after SHA256 3개는 기존 §61 고정 값과 일치. 이전 `PROPOSED_NOT_APPROVED`와 구별.
- 기존 단회 [설치 Issue #1919](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1919) OPEN, `pc-writer-b-install` 라벨, requestId `d851f33e-621c-4d20-baf9-eaa10ae29d1d`, manifest raw SHA256 `4397597f7424146c81218c0d3e1eaf12d25afa26a3b62f89bfde1074e8d95f16` 참조. 신규 중복 Issue 생성 금지.
- 기존 [Windows Writer B Run 44034883567](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44034883567) `ZGMINI Approved Writer B Source Overlay Once`: 2026-11-17 15:58 KST 재조회 기준 `in_progress`, 결론 없음. 설치 성공/실패·실제 PC afterSHA·원격 JSON/TXT 결과는 아직 미확인. 실행 중 중복 트리거/lock 삭제 금지.

**LAST PASS:** 정식 효과 GO와 제어 main `APPROVED_B` manifest 및 고유 설치 Issue/실행 중 Run 확인. **FIRST UNFINISHED:** 기존 Run 44034883567 종료 결과·JSON/TXT 2/2·PC 3파일 afterSHA 및 protected/source/Task/lease 검증. 별도 WPSFD42 BLS POST+SQLite append 기능 승인·원자료 저장은 여전히 미완료.

**NEXT:** 기존 Run 44034883567 완료를 확인한 후 해당 고유 Issue와 원격 JSON/TXT·PC 해시를 재조회해 설치 PASS/STOP을 판정한다. 성공 시 별도 기능 B 승인·수동 1회 수집으로 진행; 실패 시 정확 STOP 코드만 보고하고 무승인 재시도 금지.

## 64. R3-04 (2026-11-17 16:05 KST) source-only 정규 Writer B #1919 실제 종료·PC Core 자연 유휴 안전 STOP — PREFLIGHT_STOP / NO_INSTALL

**진행률(전→후):** 순차 DONE 26/82(31.7%) → 26/82(31.7%), 개별 DONE 28/82(34.1%) → 28/82(34.1%). 설치 단계 R3-04 미완료, 기능 원자료 수집/로컬 저장/D1/API/UI 완료 아님.

**재사용 출발점:** §63에서 [#1885/6941008513](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6941008513) 정확 3파일 1회 source-only 운영 효과 GO 및 [`APPROVED_B` manifest](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/writer-updates/w05-r304-wpsfd42-threefile-source-20261117.json) raw SHA256 `4397597f7424146c81218c0d3e1eaf12d25afa26a3b62f89bfde1074e8d95f16` 등록, [#1919 B 요청](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1919) 고유 `requestId=d851f33e-621c-4d20-baf9-eaa10ae29d1d`, Windows [Run 44034883567](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44034883567) `control event SHA=7f4af215950d7fd89aa3e386e05fa1ac565b2310`. 제어 repo 승인·원담당 단회 등록은 이미 완료했으므로 반복하지 않음.

**최종 종료 증거:**
- Workflow 실제 종료 `completed/failure`(2026-11-17 07:04:42 UTC 조회). 단계 `Pin reviewed control source`, `Approve exact manifest before candidate checkout`, `Checkout approved public candidate SHA only`, `Create-only sanitized result and originating Issue comment` 등 **성공**. 실제 효과 단계 `Run approved exact-file Writer B source transaction` **failure**.
- [원본 #1919 결과 댓글 6941238358](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1919#issuecomment-6941238358) `WRITER_B_PREFLIGHT_STOP (WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED)`, `RESULT_PAIR_READBACK_VERIFIED`, `RESULT_CREATED=2/2`, `RETRY=NO_REEXECUTE`.
- [원격 result JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-source-install-d851f33e-621c-4d20-baf9-eaa10ae29d1d.json) Git blob `f196df5116b8a3621e5f8c5e54aafb4b30115fc8`/ [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/writer-b-source-install-d851f33e-621c-4d20-baf9-eaa10ae29d1d.txt) blob `4d34c95454b0886b4c9d494ca278c787aed75cbb` **2/2 직접 원격 읽기 검증**. 본문 공통 `requestId`, `runId=44034883567`, `status=WRITER_B_PREFLIGHT_STOP`, `code=WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`. JSON `sourceSha:null`, `mode:null`, `provenanceSha256:null`, `retry=READ_ONLY_RECONCILE_NO_REEXECUTE`, TXT `SOURCE_SHA=NONE`. 이는 설치 결과가 없다는 뜻이지 승인 불일치를 뜻하지 않음.
- 정규 [`writer-b/installer.mjs`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/writer-b/installer.mjs)의 순서: 공유 Writer lock 확보 → 실제 PC preimage/후보 검사 → **`waitForCoreIdleWindow()`** → `claimRequest` → backup → isolated Git overlay → Task pause/source/config 변경. CORE_ACTIVE_WINDOW_DEFERRED는 첫 자연 유휴 단계에서 발생한 `!claimed` catch의 `WRITER_B_PREFLIGHT_STOP`이므로 **claim·Task·source/config·DB/D1/Provider 변경 이전 안전 중단**. source after SHA가 없으므로 물리 설치 PASS 불가. 실제 일시 lock 해제는 기존 finally 소유권 경로에서 처리; 수동 lock 삭제/강제 Task stop 필요 없음.

**LAST PASS:** 실제 source-only GO + APPROVED_B manifest 등록·원문 SHA 인증, 고유 #1919 요청/승인 검사/후보 checkout PASS, 후속 결과 JSON/TXT 원격 2/2와 정확 오류 코드 확인. **FIRST FAIL:** Core 자연 유휴 사전검사 `WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`. **영향:** 현재 source-only 설치 미완료, 이후 WPSFD42 BLS POST/SQLite append(별도 B 효과 승인) 및 D1/API/UI 미실행. **담당:** W05 원담당; 이번 안전 STOP은 공통 receiver 결함이나 프로세스 총괄 재검토 사유가 아님.

**NEXT 실제 행동 하나:** 소비된 #1919 requestId 재실행하지 않고, 필요할 때 승인 A 조회로 **현재 Core 자연 유휴·공유 Writer lane 상태**를 제한된 범위에서 확인하여 새 source B의 승인과 단회 신규 요청 조건을 재판정. 해당 명시 조건 전에는 새 B 요청이나 Core lock 삭제/작업 중단 불가. 독립 소스 후속 [Draft PR #1231](https://github.com/ansqhd5774-Choi/zgmini/pull/1231)은 B 승인 후보 SHA `2a9a38a4`를 바꾸지 않고 별도 CI 검증 대상으로 유지. 총괄에게 완료 기술 검토를 되돌리지 않음.

## 65. R3-04 (2026-11-17 KST) 단회 B 안전 STOP 후 공유 자원 A 상태 확인·W05 후속 소스 CI 5/5 — PC_CORE_BUSY / SOURCE_CI_PASS

**진행률:** 순차 DONE 26/82(31.7%) → 26/82(31.7%), 개별 DONE 28/82(34.1%) → 28/82(34.1%). 기능의 실제 source 설치/원자료 API POST/SQLite/D1/API/UI 단계 신규 PASS 없음.

**현재 운영 PC 확인 — 독립 신규 A 1건, 재요청 없음:**
- [고유 A #1924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1924) `shared-resource-release-readonly`, requestId `pc-1c4d97fa-1e92-45c4-afc5-9620d4789e13`. [실행 Run 44036992309](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44036992309), 운영 `zgmini-pc-02` 2026-11-17T07:13:35.213Z 관측, `PASS/SHARED_RESOURCE_READONLY_SNAPSHOT`, 2 표본.
- [원격 JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44036992309-1-seat-2.json) blob `e3f7fe6e95bf82c72a30093b3e4fe98b847946a2`, [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44036992309-1-seat-2.txt) blob `2cb7afad414e3e83b50b107a4197bf988e266040`, 둘 다 원격 실제 재조회 2/2; [원본 댓글 6941410310](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1924#issuecomment-6941410310).
- 현재 `observedConfigSourceSha=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`, `sourceStable=true`, `taskXmlStable=true`, `writerLockObserved=false`이지만 **`coreLockObserved=true`, `writer-source.state=OBSERVED_BUSY`, `releaseVerified=false`**. Runtime source/owner replan 승인 아님. 실제 작업 source/Task·보호 상태 hash before-after 동일, `providerCalls=0`, `d1Writes=0`, `sqliteOpened=false`, `operationalWrites=0`. 현 시점 단회 Writer B #1919의 Core 유휴 STOP 해소 증거 없음. 새 B 요청/force lock 제거/Controller 재설치하지 않음.

**후속 실제 소스 CI:**
- §62 기존 후속 [Draft PR #1231](https://github.com/ansqhd5774-Choi/zgmini/pull/1231)의 R3D TXT·R4 Preview TXT/JSON 결과 파일을 user TEMP에 생성하는 변경은 정확 source head `7294088376b680d2a1673c20aaa7d4ae075a8419`의 변경 2 `.mjs` + 1 test로 보존. 원래 [승인 Source PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207) head `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb`는 불변.
- 기존 Node CI는 `pull_request: branches [main]`이므로, **기능 검증만**을 위한 [Draft PR #1233](https://github.com/ansqhd5774-Choi/zgmini/pull/1233) `head=후속 소스`, `base=main`을 열어 [Node CI Run 44037002139](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44037002139) 실제 시작·완료 확인. Run `completed/success`, **Build PASS, Type check PASS, Regression tests PASS, PC publication recovery tests PASS, Cloudflare candidate read contracts PASS(5/5)**. 이 검사는 GitHub의 실제 소스·전체 테스트이며 §62 보조로직 별도 격리 테스트만의 PASS와 구별.
- 결과 검증 후 CI 전용 PR #1233은 **closed, merged=false**로 종료. 원본 Draft PR #1231은 **open, draft=true**, base 고정 source 브랜치, source head 불변. 사용자 승인 없는 main 병합/PC source 설치/Production 배포 0.

**LAST PASS:** 단회 B #1919 정확 PRECLAIM STOP 원장 유지, 새 공유 자원 A #1924 2/2 readback 및 Core lock 지속 관측, 후속 기능 source GitHub CI 전체 5/5 PASS, 검증용 임시 PR 정리.
**FIRST UNFINISHED:** 실제 Core 자연 유휴 및 기존 한정 승인 재실행 가능 범위 확인, 새 고유 B 단회 허용 조건 충족 후 정확 3파일 운영 설치·SHA·JSON/TXT 검증. 이후 BLS 공급자 POST·SQLite 원자료 append 별도 효과, stored-only 계산→공개 D1/API/UI까지 미완료.

**NEXT 한 가지:** 자연 Core 유휴·동일 Writer resource lane의 실제 해제 근거가 나타날 때까지 정상 Core를 중단하거나 #1919를 재실행하지 말고, 새 정규 source-only B 적용 조건이 유효해진 경우에만 W05 원담당이 다음 단회 실행 수행. 공통 총괄 기술 검토 반복/재인계 금지.

## 66. R3-05/R4-09 (2026-11-17 KST) 독립 WPSFD42 서비스 Reader의 기본 3원천 결합 오류 수정 및 전체 GitHub CI 통과 — SOURCE_FIX_CI_PASS / PC_INSTALL_DEFERRED

**진행률:** 개별 28/82(34.1%) → 28/82(34.1%), 순차 26/82(31.7%) → 26/82(31.7%). 계획 R3-05의 실제 저장자료 기반 계산/원자료 readback, R4-09 main 통합·실 D1 검증 아직 미완료. 기존 §64 W05 PC #1919 안전 STOP과 §65 읽기 A #1924 Core busy 증거 재사용, 추가 PC A/B 요청 없음.

**실제 발견한 결함:** 기존 `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs`의 `buildServiceSourcePreview(db)`는 서비스 WPSFD42 전용 2행을 반환하지만 내부에서 `buildPreview(db)` → `analyze(db)`(기본 BLS 3원천 complete cohort 필수)를 먼저 호출했다. 이로 인해 **WPSFD42 저장자료가 자체 SHA/provenance/기간·first_seen 검증을 통과해도 기본 3원천 스냅샷 하나가 없거나 손상되면 전용 서비스 계산 자체가 실패**. 전용 D1 키 `detail:earnings-recession-indicators:bls-wpsfd42:v1`과 기본 5행 key의 분리 원칙을 코드 레벨에서 지키지 못함. 이는 PC 실행 실패 실측이 아닌 기존 소스의 호출 순서를 통한 재현 가능한 로직 결함이다.

**구현 변경 — 기존 승인 후보와 분리한 같은 후속 3파일 PR #1231:**
1. Reader `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs`: 공통 `readVerifiedServiceSource(db)`로 WPSFD42 보관된 개정 snapshot **전수**의 BLS SHA/chunk/provenance/동일시각 개정 충돌·retrieval 시점·first_seen 등 fail-closed 보호를 유지. 전체 기본/선택 7행 `buildPreview`는 기존 `analyze(db)` 3원천 검사를 유지하되 선택적으로 서비스 helper 사용. 서비스 전용 `buildServiceSourcePreview`만 이 helper를 **직접 사용**하므로 base3가 없거나 손상돼도 자체 증거 유효한 WPSFD42 2행 index+정확 t-12 YoY를 독립 계산; 기존 `sourceVersion` 서비스 checkpoint 정체성/서비스 first_seen `sourceStoredAt`/표시 2행/Worker 계약 불변. 변경 blob `c70907a9ecc4b51d4e3715a0894ec50a42755e8d`, 커밋 `c46bd66df474378aacba2ac4d6bc531e70f94004`.
2. 테스트 `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.test.mjs`: (a) SQLite 메모리에 **WPSFD42만** 저장(기본 BLS 스냅샷 0), 기본 `buildPreview`는 정확 거부하지만 서비스 `buildServiceSourcePreview`는 2행 sourceStoredAt/sourceVersion·Worker payload 일치, base key 추가 쓰기 0; (b) WPSFD42 유효 상태에서 기본 WPSFD4 청크 훼손→기본 5행 preview hash 거부, 서비스 2행/diagnostics 원상 동일 확인. 기존 개정 손상·동일 retrieval시각 충돌·TEMP 경로 회귀 유지. 변경 blob `f3af23c6e2980b48c5d3afa4704843201fa0cf41`, 커밋 `dd5338a9ce99b06548849ab6465488886448eef0`.
3. 과거 §62의 R3D `os.tmpdir()` TXT 결과 보호 소스 blob `53b36cafe8bf7839d19537aef3c72e736572e494` 유지. 최종 후속 HEAD `dd5338a9ce99b06548849ab6465488886448eef0`, original frozen B candidate `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb` 대비 Git compare ahead=5, behind=0, **파일 3개만** 수정. 신규 수집 정책/산식/정규화/D1 Writer/API/UI/운영 source/Task 변경 0.

**실제 소스 CI:** 후속 [Draft review PR #1231](https://github.com/ansqhd5774-Choi/zgmini/pull/1231)의 base는 기존 승인 후보 branch로 고정. `pull_request:main` 기존 Node CI를 실제 태우기 위해 이미 사용했던 [CI 전용 PR #1233](https://github.com/ansqhd5774-Choi/zgmini/pull/1233)을 검증시에만 reopen(후속 HEAD 동일) → [Actions Run 44038458161](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44038458161) **completed/success**: Build PASS / Type check PASS / Regression tests PASS / PC publication recovery tests PASS / Cloudflare candidate read contracts PASS, 5/5. 검증 후 #1233은 `closed/merged=false`로 재종료. 원래 [Draft PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207) HEAD `2a9a38a4...` 미변경, 정규 B manifest의 정확 3파일 after SHA 미변경. GitHub CI를 실PC Writer B/공급자/SQLite/D1/Production 적용 성공으로 확대하지 않음.

**LAST PASS:** 부정확했던 서비스 계산의 결합 경로를 제거하고 기존 base/서비스 원자료 fail-closed 보호를 별도 보존, 신규 메모리 SQLite 회귀 2건 포함 전체 GitHub Node CI 5/5 PASS, CI-only PR 미병합 종료 및 실 PR #1231 Draft 유지.
**FIRST UNFINISHED:** R3-04 운영 PC에서 정상 Core 자연 유휴/정확 신규 B 단회 실행 가능 조건 미충족. source-only 원본 승인 3파일 운영 설치 아직 0, BLS WPSFD42 API POST·SQLite 원자료 0, 실제 saved-only 계산/독립 D1 key 게시/GET/UI 실측 0. 후속 source HEAD는 **기존 승인 B 후보에 포함하지 않으며** 승인 없이 대체 설치 금지.

**NEXT 필수 행동 하나 — W05 원담당:** 현재 Core 안전 STOP은 그대로 보존하고, 자연 Core 유휴·현재 PC preimage·새 유효한 단회 B 요청 권한이 확보될 때만 원래 승인된 정확 3파일 source-only 설치→실PC 해시·원격 JSON/TXT readback. 이후 WPSFD42 수집·저장 별도 허용 효과에 따라 실제 기능 실행. PR #1231은 source review/선별 병합 대상이며 현재 설치 3파일 승인 SHA와 혼합하지 않음. 공통 총괄 재인계/소비된 #1919 재실행/무승인 운영 변경 0.

## 67. R3-04/R3-05/R4-09 (2026-11-17 KST) 프로세스 총괄 인계 직접 인수·공유 Writer 대기 보존·저장자료→모의 D1→GET 7행 통합 회귀 — OWNER_ACK / SOURCE_CI_PASS / CORE_RESOURCE_WAIT

**진행률 시작→종료:** 개별 DONE 28/82(34.1%) → 28/82(34.1%), 순차 DONE 26/82(31.7%) → 26/82(31.7%). 실제 W05 단계 R3-04 원자료 수집·SQLite 저장/운영 source 설치, R3-05 실 PC 저장자료 계산, R4-09 main/D1 게시 완료 아닌 source-only 부분검증.

**인계 원문 전수 대조(동일 W05 원담당 소유):**
- [총괄 반환 #1885/6940104268](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6940104268): 총괄은 기존 Writer B 기술 범위/receiver 공통 결함만 담당, W05 원담당이 정확 3파일 승인·운영 실행·기능 검증 담당. [정확 범위 운영효과 GO #1885/6941008513](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6941008513)는 source-only 1회, BLS POST/SQLite/D1/Task 정의 변경 미포함. 정식 [APPROVED_B manifest](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/writer-updates/w05-r304-wpsfd42-threefile-source-20261117.json) SHA256 `4397597f7424146c81218c0d3e1eaf12d25afa26a3b62f89bfde1074e8d95f16` 기존 완결 증거 재사용.
- 단회 원본 [#1919](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1919) / [Run 44034883567](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44034883567) `WRITER_B_PREFLIGHT_STOP / WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`의 claim 전 `UNCLAIMED_UNTOUCHED`, JSON/TXT 2/2 기존 §64 재사용. 신설 [중앙 #68 봇 resource wait 6941290696](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6941290696) `waitId=resource-wait-b0e9203c6cb35a39cdb90b8e`, `WAITING_SHARED_RESOURCE`, ownerReceipt=UNKNOWN(기록 당시), releaseCondition=CORE_IDLE_WINDOW_VERIFIED, 자동 PC 재실행 0회, `OWNER_REPLAN_NEW_AUTHORIZED_REQUEST_ONLY` 원문 확인.
- [공통 shared-resource/lifecycle.mjs](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/shared-resource/lifecycle.mjs)·[`docs/SHARED_RESOURCE_LIFECYCLE_V1.md`](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/docs/SHARED_RESOURCE_LIFECYCLE_V1.md) 계약상 댓글/두 표본 A `PASS`만으로 writer lease release/ownerReplan 승인 불가. 기존 [#1924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1924) `writer-source=OBSERVED_BUSY`, core lock true, `releaseVerified=false`, 현재 B 신규 요청 조건 미충족. 총괄에 이전 기술 검토 재인계·#1919 원본 재실행·Core 강제 중단·lock 삭제 없음.
- **실제 W05 원담당 직접 인수 기록**을 [원본 #1919/6941888879](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1919#issuecomment-6941888879)에 1회 작성해 원격 GET 재조회(고유 marker `W05-OWNER-HANDOFF-ACK-20261117-R304`). 이 실제 현재 대화의 수신 확인은 중앙 봇이 과거 생성한 immutable `ownerReceipt=UNKNOWN` 본문을 자동 변경하는 것이 아니며, 신규 중앙 조정 업무/설치 Issue를 만들지 않음.

**실제 독립 W05 추가 구현과 검증:**
- 기존 후속 [Draft PR #1231](https://github.com/ansqhd5774-Choi/zgmini/pull/1231)에 1개 실제 코드기반 메모리 통합 테스트를 `scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.test.mjs`에 추가. 테스트는 R3C `normalizeSeries/buildPlans/insertPlans`를 사용해 메모리 SQLite BLS base3 + service `WPSFD42`를 저장하고, `buildPreview(includeServices:false)` 기본 5행과 `buildServiceSourcePreview` 독립 2행 생성, 기존 `earningsCompanionWriter`의 **서로 다른 D1 base/service key**에 모의 write/readback, 원본 base checkpoint body byte 동일, `readEarningsCompanionResponse` GET 7행/READY/GET write 0을 검증. 공급자/API/운영 PC/실 D1/웹 배포 호출 0.
- 초회 테스트 커밋 `208d1a180b5aaea9dbf22ed396bb270b85716a4d`에 대한 [Node CI #44040314100](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44040314100)는 Build/Type/PC publication recovery/Cloudflare read PASS, Regression tests에 테스트 변수 `response`가 fixture 함수 `response(...)` 이름과 블록 TDZ 충돌을 일으켜 **1건 실제 FAIL**. 해당 **실제 테스트** 4개 변수 참조만 `reply`로 최소 수정 (실제 Reader/Worker/산식 원본 불변), 수정 commit [`e9d3bcd424d62870a8d1c4de6e2eeec31e9a4306`](https://github.com/ansqhd5774-Choi/zgmini/commit/e9d3bcd424d62870a8d1c4de6e2eeec31e9a4306).
- 수정 후 실제 [Node CI #44040871239](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44040871239) `completed/success` 정확 HEAD `e9d3bcd424d62870a8d1c4de6e2eeec31e9a4306`, Build/Type/Regression/PC publication recovery/Cloudflare read **5/5 PASS**. 검증용 [PR #1233](https://github.com/ansqhd5774-Choi/zgmini/pull/1233)은 `closed/merged=false`; 실제 후속 PR #1231 Draft/open. 원래 정확 Writer B 승인 source [PR #1207](https://github.com/ansqhd5774-Choi/zgmini/pull/1207) head `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb` **변경 없음**, 비교 branch 소스 변경 파일은 Reader·R3D·test 총 3개로 한정. 신규 후속 source는 승인 manifest 3파일 afterSHA에 **포함하지 않고** 설치하지 않음.

**LAST PASS:** W05 실제 인계 인수 GitHub 원본 댓글 1회·readback, #68 정상 자원 대기 안전 상태 및 권한 경계 확인, 저장 SQLite → 독립 service D1 checkpoint → 저장형 GET 7행의 실제 source/모의 D1 통합 회귀 추가·첫 FAIL 정정·새 CI 5/5 PASS. **FIRST UNFINISHED:** Core 자연 유휴/소유권/승인된 신규 고유 Writer B 1회와 실제 PC 3파일 installed SHA/readback. source-only 설치 성공 0, 공급자 BLS POST·SQLite 저장·계산 실 PC·실 D1/API/UI 미완료.

**NEXT 하나:** 자연 Core 유휴와 writer-source lease/현재 PC source·원본 B 권한이 관련 정규 증거에서 확인될 때 W05 원담당이 **새 고유 승인 B 단회 요청**을 기존 공통 installer로 실행하여 PC SHA·JSON/TXT 2/2 검증; 기존 Issue #1919 재실행·총괄 재인계 금지. 설치까지 독립 Draft PR #1231 소스 검토는 병렬 가능하되, 최초 승인 source SHA 고정·무승인 BLS API/SQLite/D1/웹 배포 금지.


## 68. R3-04 (2026-11-17 KST) WPSFD42 서비스 단독 수집기 namespace 분리·회귀·GitHub Node CI 5/5 — SOURCE_FIX_CI_PASS / CORE_RESOURCE_WAIT

**시작→종료 진행률:** 개별 DONE **28/82(34.1%) → 28/82(34.1%)**, 순차 DONE **26/82(31.7%) → 26/82(31.7%)**. 첫 미완료 R3-04 실제 PC WPSFD42 원자료 수집/SQLite 저장과 설치 미완료. Source-only 후속 개발은 운영 완료 단계로 합산하지 않음.

**출발 증거 재사용:** §67 원담당 직접 수신 [#1919/6941888879](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1919#issuecomment-6941888879); 정식 source-only B 승인 manifest SHA256 `4397597f7424146c81218c0d3e1eaf12d25afa26a3b62f89bfde1074e8d95f16`의 설치 후보 `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb` 불변; 고유 #1919/Run 44034883567의 `WRITER_B_PREFLIGHT_STOP / WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED` 및 원격 JSON/TXT 2/2 재사용; 이후 #1924 승인 A는 2026-11-17 16:13 KST에 Core busy/`releaseVerified=false` 관측. Core 재진단·중복 B Issue·실행·총괄 재인계 0.

**새 결함 확인:** 기존 R3C `checkSchema(db,{includeServices:true})`가 `--services-only`에서도 기본 BLS WPSFD4/WPSFD41/PRS85006111 세 원천을 함께 검사함. 따라서 서비스 원본이 유효해도 무관한 기본 3원천 provenance 손상이 서비스 단독 수집 preflight 및 트랜잭션 append를 차단할 수 있었음. §66 Reader 계산 독립성 수정과 별개인 수집기 종속성 결함.

**수정 소스 및 회귀 — 기존 3파일 운영 승인 후보 불변:**
1. [후속 Draft PR #1231](https://github.com/ansqhd5774-Choi/zgmini/pull/1231)에서 R3C `checkSchema`에 `serviceOnly` 이름공간 선택 추가. `main()`의 `--services-only` 사전검사와 `insertPlans()`의 `WPSFD42` 단독 트랜잭션 검사는 WPSFD42만 대상으로 하며, 기본 BLS 3원천과 혼합 4원천 검사는 이전 그대로. 기존 데이터나 스키마 수정 없이 fail-closed 유지. [수정 commit `665c33c9`](https://github.com/ansqhd5774-Choi/zgmini/commit/665c33c922d582e2f44518cfc898e92256f3a5e5).
2. 동일 PR의 [추가 회귀 commit `75745725`](https://github.com/ansqhd5774-Choi/zgmini/commit/7574572502ebb7e82ce6cea03b7c9c56c8faa042): 메모리 SQLite에서 기본 WPSFD4 provenance 손상 → 기본/혼합 검사 거부 유지 → WPSFD42 독립 저장/해시 재조회 성공 → WPSFD42 자체 손상은 단독 검사/append 모두 거부, 기본 원본 손상 바이트 불변을 검증.
3. 정확 새 후속 HEAD `7574572502ebb7e82ce6cea03b7c9c56c8faa042`의 [GitHub Node.js CI #44042569374](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/44042569374) **completed/success, Build·Type check·Regression tests·PC publication recovery tests·Cloudflare read contracts 5/5 PASS**. 기존 검증용 PR #1233은 새 HEAD CI 후 `closed/merged=false`로 정리. 검토 PR #1231은 Draft/open, 기존 승인 Source 후보 PR #1207은 불변.

**검증 범위:** 이 성과는 실제 소스 2파일 수정(수집기·회귀시험) 및 새 CI뿐이다. 운영 PC source 설치 0, BLS API POST 0, 운영 SQLite/D1 쓰기 0, Task/Controller/Cloudflare Production 변경 0. 정규 source-only B 승인은 이 후속 HEAD를 포함하지 않으므로 승인 없이 새 바이트를 설치하지 않는다.

**LAST PASS:** WPSFD42 서비스 전용 수집·사전검사의 기본 3원천 불필요 종속성을 해소하고 기본/혼합 엄격 검사 보존, exact CI 5/5 PASS, 후속 Draft 격리 및 원래 3파일 승인 후보 고정. **FIRST UNFINISHED:** Core 자연 유휴/Writer resource 원격 해제 증명과 새로운 정규 단회 B 유효권한 후 기존 정확 3파일 설치·PC SHA/JSON/TXT, 이후 별도 승인된 WPSFD42 공급자 POST·SQLite 저장 및 실제 D1/API/UI 확인.

**NEXT 하나 / W05 원담당:** `writer-source`의 현행 자연 Core 유휴·소유권/lease/원본 PC source와 유효 단회 B 재승인 조건을 독립 증거로 확인할 수 있을 때만 **새 고유** Writer B source-only 실행으로 3파일 설치 및 원격 결과쌍/설치 SHA 확인. 소비된 #1919 재실행·기존 B 승인 후보에 #1231 후속 파일 혼합·Core 강제 중지·무승인 Provider/DB/D1 효과 금지. 기능 개발은 독립 병행 가능.


## 69. R3-04 (2026-11-17 KST) 반복 Core busy 원인에 대한 실제 checkpoint 전진 판별·공통 경합 진단 범위 인계 — CORE_ACTIVE_PROVEN / IDLE_WINDOW_UNVERIFIED

**진행률:** 순차 DONE **26/82(31.7%) → 26/82(31.7%)**, 개별 DONE **28/82(34.1%) → 28/82(34.1%)**, 첫 미완료 R3-04 유지. §68 source-only 후속 코드와 CI PASS 재사용, 신규 source 수정/PR/운영 B 요청/PC 변경 0.

**새 실증 근거(이미 다른 승인 후검이 남긴 PC 증거 재사용, 신규 A 없음):**
- 기존 [#1919](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1919) / [Run 44034883567](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44034883567) 최초 source-only B 요청: `WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`, claim 전 `UNCLAIMED_UNTOUCHED`, JSON/TXT 2/2. 소비한 요청을 재실행하지 않음.
- [#1924](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1924) 16:13 KST 두 표본 `OBSERVED_BUSY`, `coreLockObserved=true`, `writerLockObserved=false`, `releaseVerified=false`. 이 A는 현행 lease 해제 권한이 아님.
- 기존 별도 운영 PC postcheck [#1933/Run 44040540189](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1933) 16:40 KST: `core.lockPresent=true`, `local-cycle-last-run` COMPLETE/modifiedAt 2026-11-17T07:29:00.112Z, `local-collection-last-run` COMPLETE/modifiedAt 07:32:56.917Z, `local-writer-last-run` VERIFIED/modifiedAt 07:24:45.027Z.
- 더 늦은 postcheck [#1948/Run 44044295908](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1948) 17:09 KST: `core.lockPresent=true`, cycle COMPLETE/modifiedAt 08:02:15.445Z, collection SKIPPED/modifiedAt 08:05:41.385Z, writer VERIFIED/modifiedAt 07:58:53.424Z. 두 관측의 Core/Korea Task XML SHA 동일, 운영 Writer `approvedSourceSha=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`; 제어 Controller 실행 SHA `fbe943a0...`→`c9a7cc6a...` 변화는 Writer 소스 설치 변화가 아님.

**판정:** Core가 완전히 정지하고 checkpoint가 멈춘 상태는 **아니며** 자료 상태·수집 스케줄과 Writer 결과가 실제 전진함. 다만 표본들의 Core lock 존재가 서로 다른 정상 주기인지, 연속 고아 lock인지, Task/Scheduler/관련 프로세스가 자연 2-sample idle을 허용하는지는 알 수 없어 `IDLE_WINDOW_UNVERIFIED`; 고아 lock·장기 장애로 확정 금지. 기존 `writer-b/core-idle-window.mjs`는 `MAX_CORE_IDLE_WAIT_MS=6*60000`, 1500ms 간격 연속 2 idle 요구; `windows-guards.mjs`는 Task enabled+Ready(state=3), instances/relatedProcesses/unknownProcessLines=0, Core lock absent만 통과. #1919의 6분 bounded preclaim 실패는 정확 운영 제약이며, 보호 제거·임의 pause로 해결 금지.

**중앙의 기존 채널에 공통 범위만 진단 요청 실제 등록:** [#68/6942571602](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6942571602) — 기존 source-only B 기술 GO·승인 반복 요청이 아닌, 실제 Core Task와 lock 소유 관계, 자연 idle 가능성, 필요한 경우 승인된 공통 유지보수 구간/최소 수정 방안에 대한 공유 자원만 진단/회신 요청. 원격 댓글 재조회 확인; **프로세스 총괄의 다른 ChatGPT 대화 자동 수신/작업 완료/승인 새로 발생했다는 주장은 하지 않음**. 기능 source·Provider·SQLite/D1·GET/UI는 W05 원담당이 계속 담당.

**LAST PASS:** 새 승인 후검 2건의 Core/checkpoint 전진 및 Task XML 불변·Writer 운영 source 동일성을 실제 근거로 대조; 경합 원인에서 '진행 없는 Core' 추정 배제, 공유 원인 판단의 정확한 조사 범위 기존 #68 한 댓글로 등록·readback. **FIRST UNFINISHED:** 지금 시점의 Core 유휴 2표본/lock 소유자·Writer lane release 증명 부재, 신규 단회 B 실행 조건 미충족, WPSFD42 실제 source/SQLite 저장/D1/API/UI 완료 아님.

**NEXT:** 공용 임계 조건이 실제 증명될 때만 W05 담당이 기존 `APPROVED_B` 원본·현재 Writer source/preimage·lease를 확인한 새 고유 설치 요청 1회 및 3파일 PC afterSHA+JSON/TXT 2/2 검증. 공통 원인 확인 중에도 [Draft PR #1231](https://github.com/ansqhd5774-Choi/zgmini/pull/1231)의 독립 계산/수집 회귀를 보존하고 다음 기능 필요 작업을 지속; Core 종료·lock 삭제·#1919 재실행·미승인 BLS POST/SQLite/D1 효과 0.


## 70. R3-04 (2026-11-17 KST) 프로세스 총괄 대상 Core/Writer 설치 경합 전수조사·조건부 공통 유지보수 효과 승인 요청 — APPROVAL_REVIEW_REQUEST_POSTED / NO_OPERATIONAL_CHANGE

**진행률 시작→종료:** 개별 DONE **28/82(34.1%) → 28/82(34.1%)**, 순차 DONE **26/82(31.7%) → 26/82(31.7%)**. 실제 첫 미완료 R3-04는 그대로. 새 기능 source/Controller/Writer 설치, SQLite/Provider/D1, Task 변경 0.

**새 증거 중심의 조사 결과:**
- 승인된 source-only W05 3파일 GO [#1885/6941008513](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6941008513) 및 고정 manifest raw SHA256 `4397597f7424146c81218c0d3e1eaf12d25afa26a3b62f89bfde1074e8d95f16` 유지. 소모 #1919/Run 44034883567 `WRITER_B_PREFLIGHT_STOP/WRITER_B_CORE_ACTIVE_WINDOW_DEFERRED`, claim 이전 무변경·원격 JSON/TXT 2/2. 기존 source SHA `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb` 승인 후보를 #1231 신규 바이트로 바꾸지 않음.
- Core lock absent의 실제 과거 짧은 표본 [#1835/Run 43991323649](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1835) 2026-11-17 09:54 KST를 확인. 전체 결과는 `STATE_UNKNOWN`이며 계속 유휴/현재 해제 증거는 아님. 당시와 달리 이후 #1911·#1924 공유 자원 A에서 Core lock true/Writer lock false 관측 및 `releaseVerified=false`. #1933(16:40 KST) → #1948(17:09 KST) Core cycle/collection/Writer checkpoint mtime 전진, 두 시점 Core lock true/Task XML 안정, Writer 운영 source `2070ff...` 유지. 고아 lock이나 하루 전체 무해제 단정하지 않음.
- 소스상 Core 기본 5분은 **시작 주기**, `zgmini/main:scripts/pc-writer/local-cycle.mjs`은 Core/Korea 공통 local-cycle.lock을 사용하고 하위 Node 5/10/30분 timeout 경로를 가짐; 현재 운영 승인 source와 main 내용 동일을 가정하지 않음. 기존 공통 Writer B는 최초 6분 / 1.5초 / 연속 2회 자연 idle + Task `enabled=true, READY(3)`·모든 Core 관련 process/lock absent, 마지막 race 재검증을 요구. **Core Task를 먼저 별도로 disable한 뒤 기존 설치기를 호출하면 현재 idle guard에서 STOP**; 무단 유지보수 우회는 해법 아님. 제어 기존 [PR #650](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/650), [#708](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/708) 모두 merged인 안전 계약 재사용.
- 현재 유지보수 신규 구현 PR은 없음. 공유 Core 소유권 증거 생산자-소비자 계약의 관련 기존 [제어 Draft PR #1362](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1362)는 open/source-only이며 이번 새 운영 효과 승인이나 Writer B 설치 완료가 아님. W05 기능 소스 검토 PR #1207·#1231은 둘 다 Draft/open.

**실제 인계·승인요청 등록/재조회 성공:**
- **공통 원장:** [제어 #68](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68).
- **인계(원인 진단):** [#68/6942571602](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6942571602) — 공유 자원 소유/자연 유휴 원인 조사에만 총괄 지원, W05 기능 책임 유지.
- **별도 정확 효과 승인 결정 요청:** [#68/6942803479](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6942803479) — 기존 A 범위 read-only 원인 판정과, *정상 Core인데 6분 idle 확보 불가능*이 실증된 경우에만 검증된 새 start 억제/자연 drain/원본 복원 공통 B 효과에 대해 총괄이 `GO/HOLD/NO-GO`·대상/실제 권한/최소 PR·manifest를 결정하도록 구체화. 이 댓글 자체는 신규 B 승인 아님. `Core timeout`을 무턱대고 상향하거나 pre-idle Task disable 뒤 기존 Writer B에 전달하는 무효 방식 금지. Actions 12분 시간 상한, Core/Korea 동일 lock, 기존 owner/lease, 실행 중 Core 보호를 명시.
- 두 댓글은 실제 원격 재조회해 각각 고유 ID·본문 확인. **프로세스 총괄 별도 ChatGPT 대화의 자동 수신/실행 증거는 아님.**

**LAST PASS:** W05 운영 승인/단회 실패와 실PC 기존 A/사후 checkpoint, 공통 Core lock·Writer B 자연 유휴/Task guard 소스, 기존 검토 PR 상태를 대조해 새로운 공통 효과만 분리 요청·원격 기록. **FIRST UNFINISHED:** 현재 Core lock PID/Task instance 소유 증명, 충분한 idle-window 관측 및 현재 PC Writer lease release, 총괄의 정확한 유지보수 효과 GO/HOLD/NO-GO, W05 운영 3파일 실제 설치/원자료 저장·D1/API/UI 완료.

**NEXT 필수 행동:** 사용자 통해 실제 총괄 대화에 위 4개 링크 전달 후, 총괄이 기존 증거·읽기 A로 owner/idle을 검증하고 **정상 idle 존재 시** W05가 기존 승인으로 새 고유 B 1회 설치; **정상 idle 구조적 불가 확인 시** 총괄의 별도 정확 공통 source/승인/복원 경로 기술 검토·GO/HOLD를 받고 적용 범위 충족에만 실행. 운영 source/Task/DB 등 미승인 변경 0, 소비 #1919 재실행 0.


## 71. R3-04 (2026-11-17 KST) 프로세스 총괄 조건부 유지보수 승인 결정 실제 수신 — OWNER_EVIDENCE_UNKNOWN / NEW_EFFECT_HOLD

**진행률:** 개별 `28/82(34.1%) → 28/82(34.1%)`, 순차 `26/82(31.7%) → 26/82(31.7%)`, 첫 미완료 R3-04 불변. §70의 조건부 운영 효과 요청은 [공통 총괄 공식 결정 #68/6942953021](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6942953021)에서 `OWNER_EVIDENCE_UNKNOWN` 및 신규 유지보수 효과 `HOLD/NOT_APPROVED`로 회신. 이번 W05 대화에서 해당 댓글을 원문 직접 조회해 수신·판정 완료.

**실제 Windows 최신 증거:** 원본 [#1951](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1951#issuecomment-6942882251) / Run [44046727060](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44046727060), `inflation-core-lock-observation-readonly` seat02: A execution 210.018초, Core lock 26/26 표본 존재, `CORE_TASK_RUNNING_INSTANCE_UNOBSERVABLE` 26/26, `activeTaskSamples=0`, `linkedNodeSamples=0`, `ownerVerifiedSamples=0`; 보고서 상태 `STATE_UNKNOWN / INFL_CORE_LOCK_PRESENT_TASK_ENGINE_GAP`, workflow success가 owner PASS로 상태 승격시키지 않음. 결과 JSON+TXT 2/2 원격 확인은 총괄 및 W05 조회에서 재사용; `protectedStateUnchanged=true`, Task XML/Writer approved source 보존, provider/SQLite/D1/운영 writes 0. 이는 **210초 해당 구간 lock 관찰**이며 Writer B에 필요한 360초 최초 대기 내 연속 2표본 자연 idle 부재의 영구 증명, 소유 PID 검증, lease release 권한이 아님. 이전 #1835 lock absent와 #1933/#1948 checkpoint 전진 증거 보존.

**정확 승인 경계:** 기존 W05 source-only B 정확 3파일 GO [#1885/6941008513](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1885#issuecomment-6941008513) 및 control main manifest/고정 source `2a9a38a452b5ba95a3e370c5b56445bb75fa05bb`는 계속 유효. **신규 Core/Korea Task 시작 억제, disabled→Writer B guard 예외, 자연 drain/새 복원 프로세스, 소유자 불명 lock 해제는 승인되지 않음.** 기존 B #1919 1회 소비·재실행 금지, 신규 무조건 B 금지. `enabled=true/READY + no linked process + no Core lock` 두 차례 연속 검증 전 `NOT_READY`, `OWNER_EVIDENCE_UNKNOWN` 유지. 새로운 공통 B 변경의 최소 PR·정확 after SHA/manifest/Task XML/lease/rollback·workflow 상한은 원인 입증 뒤에만 총괄 검토. 기존 A 권한으로 조회 가능한 것은 총괄이 소유권/Task Engine 보안 컨텍스트 차이 증거로 처리하며, 신규 allowlist/Controller install/권한 확대가 필요하면 해당 범위 새 승인 전 STOP.

**원본 W05 실행 인수 영수증:** [제어 원본 #1919/6943030213](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1919#issuecomment-6943030213)에 이번 W05 담당 명의로 결정·실측·실행 경계·다음 책임을 댓글로 등록. 해당 댓글을 이 세션 GitHub API로 생성했으며 별도 총괄 대화의 자동 인수/운영 재개 증거로 오인하지 않음.

**FIRST UNFINISHED / NEXT:** 총괄의 현장 Task/Owner 가시성 원인 분리/실제 현재 자연 idle 및 공유 lease 입증이 있어야 기존 정상 Writer B를 W05가 **새 고유 승인 단회**로 실행 가능. W05 원담당은 소스 후속 Draft #1231 계산·원자료 분리/회귀를 계속하고 고정 승인 source Draft #1207의 3파일 SHA·manifest를 변경하지 않음. 실제 PC source 설치, BLS POST, SQLite append, D1/Cloudflare/API/UI 업데이트 증거는 현재 0. 신규 운영 source/Task/DB/Runner 변경 0.


## 72. R3-04 (2026-11-17 KST) Core 자연 lock 부재 신규 독립 실측 인수 — TRANSIENT_IDLE_OBSERVED / WRITER_GATE_UNVERIFIED

**진행률 시작→종료:** 순차 DONE **26/82(31.7%) → 26/82(31.7%)**, 개별 DONE **28/82(34.1%) → 28/82(34.1%)**. 첫 미완료 R3-04 유지. 기존 §71의 OWNER_EVIDENCE_UNKNOWN/신규 유지보수 효과 HOLD 변경 없음.

**새로 확인한 원격 원본:** [제어 #1919/6943273990](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1919#issuecomment-6943273990)에서 총괄이 W01 독립 승인 A [#1955/Run 44047789471](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1955#issuecomment-6942941522)의 JSON/TXT 2/2를 확인한 결과를 W05가 원문 재조회하여 인수. 2026-11-17T08:33:54.771Z 및 .772Z에 local-cycle.lock before/after ABSENT, 보호 상태 불변, 운영/공급자/D1 쓰기 0. W01 자체 Event129 판정은 STATE_UNKNOWN/INFL_E129_LOCK_NOT_VERIFIED이며 이를 W05 Writer PASS로 오인하지 않음.

**원인 가설 업데이트:** 앞선 #1951의 210초 26/26 lock PRESENT와 달리 다른 시점에서 lock ABSENT가 관측됨. 따라서 'Core lock이 항상 존재하므로 구조적으로 자연 idle 불가'라는 가설은 배제. 다만 두 부재 관측은 약 1ms 간격이며 Writer B의 1.5초 간격 연속 2회, Task enabled/Ready, instances/관련 프로세스/unknown 0, source/lease/preimage 일치, 360초 창을 증명하지 못함. 소유 PID/Task Engine 가시성도 아직 미확인. 새 유지보수 B 효과 승인 없이 Task/lock/guard 조작 금지.

**이번 실제 작업:** 원격 #68/#1919 최신 댓글 대조 및 지정 진행 기록만 업데이트. 기능 코드·신규 설치 요청·운영 PC/SQLite/D1/Cloudflare 변경·BLS 호출 0. 기존 승인 #1885/APPROVED_B 원본 source 2a9a38a452b5ba95a3e370c5b56445bb75fa05bb 및 #1231 후속 Draft 분리 유지.

**LAST PASS:** 최소 순간적인 자연 lock 부재 실증 확보로 무조건 Core 유지보수 변경 필요 가설 기각. **FIRST UNFINISHED:** 실제 Writer B 정규 gate 통과/새 고유 단회 설치 및 PC SHA/JSON/TXT, 이어서 별도 승인 수동 WPSFD42 원본 저장/계산/게시/API/UI. **NEXT:** 기존 공통 Owner의 현재 유효 idle/Task/lease/승인 원본 증거가 정규 Writer B 사전검사에서 충족될 때에만 새로운 고유 승인 B 단회 설치를 결정; 소비 #1919 재사용 및 무조건 반복 시도 금지. 병행 기능 소스는 #1231에서 계속 검토.


## 73. R3-04 (2026-11-17 18:44~18:46 KST) W05 직접 A급 자원 검증 및 정확 3파일 사전상태 조회 접수 — CANDIDATE_CLEAR_NOT_AUTHORIZED / PREIMAGE_RESULT_UNVERIFIED

**진행률:** 순차 완료 **26/82(31.7%) → 26/82(31.7%)**, 개별 완료 **28/82(34.1%) → 28/82(34.1%)**. 첫 미완료 R3-04 고정. 기존 82단계 계획 순번 및 완료 조건 불변.

**W05 원담당 직접 실행 1:** 현행 app `main` source SHA `1f451fbd979af6b9a0a1a2a4b2f79db60f3ae22f`를 검증하고 허용 A `shared-resource-release-readonly`를 새 고유 requestId `pc-4d87d598-4365-4e19-9ae6-0189b4a90171`로 [제어 #1980](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1980) 단회 요청. [Run 44058286894](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44058286894), seat3, `PASS/SHARED_RESOURCE_READONLY_SNAPSHOT`. [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44058286894-1-seat-3.json)·[TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/44058286894-1-seat-3.txt) **2/2 직접 원격 재조회**. 2026-11-17T09:44:31.749Z 두 표본 `coreLockObserved=false`, `writerLockObserved=false`, `sourceStable=true`, `taskXmlStable=true`, `config.source=2070ff53549e2f9f2cea57d5af7e1d83f9fd7388`, 보호 SHA 불변, 공급자/SQLite/D1/운영 쓰기 0. **단 `writer-source.state=CANDIDATE_CLEAR_NOT_AUTHORIZED`, `releaseVerified=false`, `runtimeSourceVerified=false`, `approvalVerified=false`, `ownerReplanAuthorized=false`**. 이 A는 정규 B 사전검사 통과·설치 재계획 권한이 아님.

**W05 원담당 직접 실행 2:** 제어 `main` 원본 [W05 정확 3파일 APPROVED_B manifest](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/approvals/writer-updates/w05-r304-wpsfd42-threefile-source-20261117.json)의 `candidateSourceSha=2a9a38a452b5ba95a3e370c5b56445bb75fa05bb`, `baseHead=2070ff...`, `allowProviderCalls=false`, `allowDbChanges=false`, `allowD1Writes=false`, 승인 3파일만 재확인. 기존 등록 A `writer-install-preimage-readonly`에 `preimageManifestPath`와 고정 manifest SHA256 `4397597f7424146c81218c0d3e1eaf12d25afa26a3b62f89bfde1074e8d95f16` 지정, 새 고유 `pc-1af3112e-95b6-4f21-a69b-10c0f585fa44`로 [제어 #1981](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1981) 생성·`pc-job` label 확인. 이 기록 시점 원본 Issue 댓글 0, Run/PC JSON/TXT **`NOT_VERIFIED`**, 실행 성공·실패 추정 금지. 동일 요청 재실행 0.

**LAST PASS:** #1980 실운영 공유 writer-source에서 이전 busy와 달리 **lock 2표본 부재 신규 PC 증거 확보**, 원격 결과 2/2와 원본 보호 확인; W05가 승인된 조회를 직접 수행, 공통 총괄 재인계 0.

**FIRST UNFINISHED:** #1981의 유효 PC preimage 회수와 현재 정규 Writer B Task/owner/lease/연속 idle/승인 source 비교; 유효 단회 설치 권한·실설치 SHA 미확보. #1980 A의 `releaseVerified=false`를 임의 통과시키지 않음. 이후 WPSFD42 공식 원자료 POST·SQLite append·checkpoint/원본 SHA 재조회는 별도 승인·실증 필요.

**NEXT 단 하나 — W05:** [#1981](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1981) 원본의 Actions/JSON/TXT를 확인해 `PASS/BLOCKED/STATE_UNKNOWN`으로 정확 판정한다. 결과가 없으면 중복 A를 만들지 않고 접수 미관측으로 분리. 모든 정규 조건 충족이 입증되기 전 B 설치·Core 강제 중지·lock 삭제·새 유지보수 효과·provider/DB/D1 쓰기 0. 운영 source/Task 불변.
