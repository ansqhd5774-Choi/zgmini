# ZGMINI W04 고용 R6 — DOL 전국 4계열 장애 이력·공개 구현 비교·실행 복구계획
> 2026-11-16 KST · READ_ONLY_RESEARCH / PLAN_READY · 전담 `codex/employment-1y-reader-r1`  
> **주의:** 이 계획서와 CI 성공은 운영 PC 설치·공급자 수집·D1 게시·화면 완료 증거가 아니다.  
> 기능 운영 진행률은 2026-11-15 중앙 기준 **75%**, 65차의 별도 분모 87.5%와 혼합 금지.

## A. 변하지 않는 목표와 마지막 실증
- 최종: 공식 BLS/DOL 고용 29개 지표의 PC Collector → Core SQLite 원자료/이력/PIT → 승인 산식 계산·로컬 저장 → D1 정확키 공개·readback → `/api/employment-r6/observations` → `/economic-indicators/employment/` 29행·PC/모바일 동치. 승인 전 산식/DB/TTL/주기/배포 변경 금지.
- [운영 PC #1403/Run 43663990960](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1403#issuecomment-6887419784) 정확 JSON `results/43663990960-1-seat-4.json`: `stateClaims.fullTenYearRawCoverage=RAW_PRECONDITIONS_COMPLETE`, 실제 51지역×600주 완전, 577주/29,427개 기준 충족, `firstFailureWeek=null`. **이 원자료는 재수집하지 않는다.** Reader의 행수 증거는 PIT/29번째 점수 READY의 증거가 아님.
- 같은 원장 DOL National: 2026-11-09 09:50Z `ONE_YEAR SUCCESS` 4/4, 최근 Initial 2026-10-10; 11-09 22:21Z `BACKFILL PARTIAL` missing 4/4; 11-15 01:30Z `RELEASE PARTIAL/DOL_RELEASE_OBSERVATION_STALE`, missing 4/4, latest Initial null, 전체 수집 3060행은 ETA539 51×60만. 직접 확인되는 **FIRST FAIL 경계**는 **National POST 응답 → 파서 유효 4개 계열 생성 실패**. 11/15 실제 HTTP 상태/본문 종류는 원장에 없으므로 공급자 DB 장애라고 단정하지 않음.
- 2026-11-09 [B Provider #1040](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1040) 과거 설치 성공 `WRITER_B_INSTALLED_VERIFIED`, [B Collector #1063](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1063) `WRITER_B_RECOVERY_REQUIRED / WRITER_B_CORE_REENABLE_SOURCE_PAIR_STOP` 당시 실패. 후보 GitHub SHA 일치와 현재 Writer 실제 파일 SHA는 별도.
- [통합 Draft PR #1083](https://github.com/ansqhd5774-Choi/zgmini/pull/1083) HEAD `21b3930c091b37edbb152bb73920bdf46e1a9ebc`, 변경 9파일, [Node CI 43677601781](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43677601781) SUCCESS; **main·운영 미반영**, 테스트 재실행하지 말고 증거 재사용.
- 운영 공유 [Controller #1501](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1501) `UNKNOWN/BACKLOG_OR_RECOVERY_NOT_VERIFIED`, `FIRST_FAIL=RECONNECTED` — 중앙 Owner가 해당 공유 설치/lease를 조정할 때만 고려. 소스 작성·리뷰·격리 검증의 임의 차단 Gate로 삼지 않음.

## B. 실제 공개저장소 5종 정밀 비교 — 검색 결과가 아니라 파일 내용 확인
| 공개 저장소 · 검증한 정확 경로 | 실제 구현·근거 | W04에서 재사용할 원칙 | 복제하지 말 것 |
|---|---|---|---|
| [JerBouma/FinanceToolkit, DOL 모델](https://github.com/JerBouma/FinanceToolkit/blob/245c303efcca5c317c8dcc2fff00d393e1c9ba98/financetoolkit/economics/sources/dol_model.py#L20-L101) | 같은 `report.asp` `level=us/filetype=xml` POST, `Unable to connect` HTML을 **간헐적인 서버 DB 오류**로 인식, 기존 캐시 제공, `OUTAGE_ATTEMPTS=6`·3초 간격 재시도. `final_yr=currentYear+1` | HTTP 성공과 데이터 성공 구별, 유효 직전값 보존, 출처 재개 시 자연 회복 | 이 프로젝트의 **6회 재시도**를 ZGMINI 호출 한도·기승인 운영 주기 밖으로 복제 금지. `final_yr` 1년 차이도 원문 검증 전 임의 변경 금지 |
| [zsh-a/bcr TypeScript](https://github.com/zsh-a/bcr/blob/1cf643aa2ec4fce4d3ddee843bce821669197c1f/packages/market-data/src/cycle/fred.ts#L158-L176) ([수집기](https://github.com/zsh-a/bcr/blob/1cf643aa2ec4fce4d3ddee843bce821669197c1f/packages/market-data/src/cycle/fred.ts#L315-L351)) | XML `r539cyNational` 검증, `weekEnded` 유효 Saturday, 미래 빈 값 제외, 응답 크기/15초 timeout 제한. FRED→DOL→보조 미러 우회 경로 | root/date/중복/관측일/크기 fail-closed, 공급자별 상태 분리 | FRED-first 또는 DBnomics 자동 폴백의 출처·권한 계약을 ZGMINI에 무승인 복제 금지 |
| [valorumdata/cmdc-tools](https://github.com/valorumdata/cmdc-tools/blob/d9f964b580a6efa2446a45b30e5134ef1ae74f74/src/cmdc_tools/datasets/dol/unemploymentclaims.py#L42-L82) | DOL `POST` `states[]`, `ElementTree`로 XML 파싱, `rundate`를 vintage로 저장, 중복 기록은 `ON CONFLICT DO NOTHING` | 보고서 생성일·원자료 계보 및 중복 보호를 구분해 관리 | `rundate`가 곧 실제 출판시각/PIT availableAt이라는 가정 금지; 이 구현의 state 경로는 National 4계열의 직접 대체 아님 |
| [ciciiiyaoyf/la_housing_database](https://github.com/ciciiiyaoyf/la_housing_database/blob/2ec0329e64cbb5969a1f17f8ce085b48374b83a2/src/ingestion/macro_claims.py#L19-L61) | 공적 `ar539.csv` 구조 검증(필수 헤더·날짜·Saturday·반복주), `r539cyState` 구조 검증, raw capture·`Last-Modified` 기록 | 요청→응답→schema→원자료 해시·시각·개정 메타를 독립 검증 | CA 상태 CSV는 전국 `SA/SA4WK/IUR` 4계열 동등 대체가 아니며 공식 `r539cyNational`로 위장 금지 |
| [mortada/fredapi](https://github.com/mortada/fredapi/blob/d0a0ba3001ebbbceafdcbdd3eb23828f0537cdff/fredapi/fred.py#L180-L275) | `get_series_all_releases`, `get_series_as_of_date`, `realtime_start` 저장을 사용해 개정값/과거 최초 공표를 구분 | FRED fallback 도입 시 latest value와 당시 PIT vintage 명시 구분 | FRED 최신 시계열값을 과거 첫 공표값으로 사용 금지 |

추가 XML 구조 실물 증거: [2021년 DOL `r539cyNational` 저장 샘플](https://github.com/rockhopsoft/buckystats-website/blob/c65a2e4aa8aaf4bcf5ba4c03fabe9f2d4119b1cd/data/r539cy-usa-recent.xml#L1-L21)에는 `weekEnded`, `InitialClaims/SA,SA4WK`, `ContinuedClaims/SA`, `IUR/SA`가 존재. **2021년 표본은 2026년 현재 서버 POST 응답의 증거가 아님**.

### 외부 공식 문서
- [DOL 공식 주간 청구 양식](https://oui.doleta.gov/unemploy/claims.asp)은 `National/State` 및 XML 출력 선택을 제공. 2026-11-16 이전 조회에서 `Unable to connect / SQLSTATE=HY000 / Informix Invalid ASF assoc_id` 오류가 관측된 반면, 같은 날 후속 GET은 **정상 HTML 양식**을 반환. 따라서 **간헐 장애 가능성**을 우선 검토; 상시 장애·11/15 POST 동일 오류 확정 금지.
- [FRED 공식 observations](https://fred.stlouisfed.org/docs/api/fred/series_observations.html), [real-time periods](https://fred.stlouisfed.org/docs/api/fred/realtime_period.html), [vintage dates](https://fred.stlouisfed.org/docs/api/fred/series_vintagedates.html)에서 날짜별 개정 경로 확인. `ICSA/IC4WSA/CCSA/IURSA`는 DOL/ETA 출처 국가 4계열의 FRED 배포본이나 **별도 공급자 경유**.

## C. ZGMINI 실제 코드 대비 첫 오류와 잠재 결함
1. main `lib/market-score/employment-r6-provider.mjs`: HTTP200/비XML·0 valid national rows라도 `nationalSnapshot`을 만들어 반환. 저장기 `employment-r6-store.mjs`는 body hash의 `INSERT OR IGNORE`로 **과거 정상 snapshot을 직접 덮지 않지만** 새로운 오류 raw를 정상 원문과 동급으로 인식하는 위험. National XML 파서는 `<week>`, `weekEnded`, `SA`/SA4WK 등 고정 구성을 가정. 루트/실제 parser 첫 실패를 기록하지 않음.
2. main Collector: 초기 National 관측이 null이면 `DOL_RELEASE_OBSERVATION_STALE`를 Missing Series보다 먼저 출력하여 하위 서버/파서 실패를 가림. ONE_YEAR는 최신성 게이트가 달라 기존 SUCCESS가 최신 공표를 보증하지 않음.
3. #1083 후보: National 유효 **4계열 모두** 있을 때만 국가 신규 raw+관측값 동시 허용, 비XML/3of4/HTTP/네트워크 실패는 fail-closed, `nationalResponseEvidence`(HTTP·형식·본문 SHA·파싱수) 기록, 지역 ETA539 독립 보존, 계열별 최신 시각/PIT 분류, 600주. **이는 첫 원인 구분과 안전성 개선이며 공급자 DB 장애 자체를 고치는 코드는 아님**.
4. #1083의 **잔존 코드 결함 1건**: `employment-r6-collector.mjs`의 `noObservations ? "NO_OBSERVATIONS"`가 `fetched.partialFailureCode`보다 먼저 적용돼 National+ETA 동시 실패 시 최상위 `DOL_NATIONAL_HTTP_FAILED`가 가려짐(상세 `nationalResponseEvidence`에는 남음). 최소 우선순위 정정 + 동시실패 회귀 1건을 함께 진행, assertion 삭제·숨김 금지.
5. `final_yr`는 **ZGMINI `currentYear` / FinanceToolkit `currentYear+1` / bcr 해당 키 미사용**으로 구현 차이 존재. ONE_YEAR·RELEASE는 같은 national POST 필드를 구성. 임의로 연도를 수정하면 승인 데이터 계약 변경. **운영 원문/공식 form 요구값 확인 후에만 차이 적용 결정**.
6. 점수 `STATE_CLAIMS_BREADTH`는 National 4계열이 아닌 지역 `STATE_INITIAL_CLAIMS` 51×600주 **observationHistory/PIT**를 사용. `stateClaims.fullTenYearRawCoverage`는 원자료 current 행수 PASS일 뿐 `availableAt/retrievedAt`, 52주 비교, score READY 확인 아님.

## D. 실행계획과 각 단계의 실제 완료 조건

| 순서 | 책임·실행 | 이미 재사용할 증거 | 종료 증거 및 실패 시 STOP |
|---|---|---|---|
| **1. 독립 Source 최소 수정** | **W04 원담당** 전용 브랜치에서 #1083 Provider+Collector 및 관련 tests를 현재 main과 선별 비교 통합. 동시실패 최상위 `failureCode` 우선순위와 1회 회귀 추가. National XML 루트·숫자·주말날짜/미래 빈주·중복·최신 주를 제한된 입력에서 확인, 원래 데이터 계약/산식 변경하지 않음. | #1083 9파일·기존 CI `43677601781` PASS, 2021 공식 형식 XML fixture, 과거 600주 영수증. | 새 변경 파일만 동일 환경 테스트·CI PASS; 오류 HTML/503/3of4/dual failure에서 마지막 유효 보존·국가 raw 0·ETA 정상일 때 3060행 유지. 정상 4/4은 새로운 관측만 허용. `score:null` 임의 READY 금지. |
| **2. 현장 첫 실패 한 번 확인** | **중앙 승인 단일 Owner**, 이미 저장된 National ONE_YEAR 11/09 성공과 RELEASE 11/15 실패 snapshot의 `http_status,content_type,body_sha256,body format,parsedNationalSeriesCount` READ_ONLY 1회 비민감 결과 회수. 별도 Runner 강제·신규 미승인 pc-job 없음. | #1403 실제 PC 원장과 식별자. | `HTTP_NON2XX/HTTP200_NONXML/XML_SCHEMA_MISMATCH/NATIONAL_SERIES_INCOMPLETE/STALE` 중 최초 범주 확정. 옛 실패 snapshot이 없으면 `NOT_STORED`로 보고하고 무한 재시도·원문 공개하지 않음. **1·2는 독립적으로 병렬 가능**, 2를 1의 선행 Gate로 삼지 않음. |
| **3. 승인된 소스·운영 연결** | 중앙 단일 Owner가 현재 Writer fileSHA256/HEAD/config.source 및 Controller allowlist 확인. 새 소스는 기존 B manifest `afterSHA`를 재사용하지 않고 정확 대상·preimage·manifest/승인을 별도로 확정. 공유 #1501 보호와 lease 충돌이 있으면 그 실제 자원만 직렬화. | 기존 B #1040/#1063 원장(과거 완료·실패 상태 분리), #1083 CI. | 동일 파일 실제 설치 SHA 및 `runningSource===approvedSource`, Collector 설치·operation 허용·실행원장 확인. 실패 시 LAST PASS/FIRST FAIL, 임의 rollback/reconnect 금지. |
| **4. 공식 발표 주기 실제 수집→게시** | 기존 승인 Scheduler 1회 정규 실행에서 valid National 4/4, 별개 ETA539, SQLite history·PIT·로컬 계산, D1 exact readback, Production API/UI 비교. 공급자 200 오류면 부분 실패·마지막 유효 보존, 과거 데이터 최신 표시 금지. | 51지역×600주 재수집 완료 증거. | 각 National 계열별 `observationDate/sourceStoredAt`·동등 계열의 개정 증거, checksum, local ledger, D1 version/stored_at/hash, API 29행, PC/모바일. **정규 시각 이후 자연 갱신 관찰은 별도 후속이며 출시 임의 Gate 아님.** |
| **5. 장애 지속 시만 FRED 보조 경로** | 사용자 **별도 승인** 뒤 기존 `FRED_API_KEY`, quota 정책, FRED API 전송기 재사용. `ICSA,IC4WSA,CCSA,IURSA`의 주간 fixed profile·출처 `ETA via FRED`·단위·SA·관측일·vintage/ALFRED·수정본 PIT 승인 추가. 코드 새 Runner/스케줄러·유료 서비스 생성 없음. | FRED 기존 코드/키 위치 확인; 4계열 공식 메타. | 첫 원본과 동일한 단위·기간·개정일·공표일 합치기, authorized offline fixture tests; 운영 전 source/공급자/공개권리 승인. 기존 DOL raw로 출처 위장하거나 자동 전환하지 않음. |

**다음 실제 첫 실행:** W04 원담당의 **#1083에서 필요한 최소 코드 선별 통합 + 동시실패 우선순위 1건 수정·회귀**를 기존 브랜치에서 진행. 중앙 단일 Owner는 그와 독립적으로 승인된 읽기 전용 국가 raw 메타 1회 회수. 이미 입증된 51지역×600주·Reader 15/15·승인 해시 2/2 재시험 금지.

## E. 책임·BLOCKER 및 완료 판정
- **진짜 현재 실패:** National RELEASE 4계열 관측 유효 0; 당시 운영 HTTP/body 최초 실패 분류 UNKNOWN. PR #1083 원본 보호 패치는 SOURCE_READY지만 PC 설치 미완료.
- **별도 실패 위험:** #1501 공유 Controller 운영 복구 영수증 부재. 독립 Source 개발에는 NON_BLOCKING; 공유 설치 시 정확 scope에서만 BLOCKER 판단.
- **절대 금지:** DOL DB 서버 오류를 정상 XML로 위장, 데이터 0 보간, 4개 계열을 FRED 무승인 대체, 전체 #933 또는 #1083 자동 병합, 기존 PC 재백필·복구 파일 삭제, Runner/CMD/RDC/SQL/D1·Cloudflare 무단 변경.
- **완료의 의미:** 코드·CI PASS와 별도로 PC 실제 승인 source SHA → 유효 국가 4계열 원자료 저장/PIT → 로컬 산식·결과 → D1 재조회 → API/UI 동일 sourceVersion 관측 완료. 29번째 지표가 실제 근거 부족이면 READY 강제 없이 부분 상태로 정직하게 공개.

**진행률:** 이 조사/대안 계획서 작성 100%; 실제 고용 기능 최신 중앙 보고 75% 유지. 이 문서 자체는 새 공급자 요청/운영 설치/DB/D1/사이트 변경을 발생시키지 않음.
