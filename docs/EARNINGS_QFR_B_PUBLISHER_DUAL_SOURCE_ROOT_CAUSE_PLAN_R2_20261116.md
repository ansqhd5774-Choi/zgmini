# W05 QFR B 게시기 — 실PC 원인 재해석, 과거 이력 및 승인된 연결 복구 계획 R2

2026-11-16 KST · 대상 `codex/api-site-integration-r1-20261026` · **조사/실행계획만**. 이 문서는 운영 PC 설치·D1 게시·새 B 승인 자체가 아니다.

## 0. 결론: 5/6 ABSENT와 실제 게시 차단을 구분
- 2026-11-16 운영 PC read-only [#1709](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1709), [Run 43866041104](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/43866041104), [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/43866041104-1-seat-2.json) / TXT readback: 운영 `E:\ZGmini\projects\zgmini-earnings-history-pc-release` 체크아웃의 QFR 관련 6개 중 5개 ABSENT, `scripts/pc-writer/d1.mjs`만 PRESENT. 실제 checkpoint/config/sourceHead 3개 `7afe6b0bcaa74d622ada9190fdc9fcc7fd4d5f10`, 일치 true. protectedStateUnchanged true, providerCalls=0, D1 writes=0.
- **기존 '5개 없으므로 운영 Writer에 반드시 설치해야 한다'는 진단은 과도하다.** 기능 `main`의 `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs`는 자체 게시 Git checkout `STAGE`와 **별도** 승인 운영 root의 clean/SHA만 검증한다. 제어 Draft `tools/publication-executor.mjs`는 `$GITHUB_WORKSPACE/publisher`에서 QFR script 실행, `operationalRoot`는 clean SHA/config+credential/source 체크용이다. **운영 수집 checkout의 QFR 파일 부재 자체는 이 구조에서 정상일 수 있음.** 기존 체크아웃에 복사부터 하지 말 것.
- 제어 `main`에서 `.github/workflows/pc-publication-b.yml`은 404; B 제안 [#112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/112) Draft/open/unmerged, 이를 대상으로 하는 [#1698](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1698)도 Draft. 실PC 별도 B publisher checkout/manifest/설치·권한은 **UNVERIFIED**, 부재 확정 아님. 실제 QFR D1 write/readback 성공 증거 없음.

## 1. 과거 완료 증거와 미완료 범위
1. **2026-10-27** QFR 원본 ZIP 1스냅샷 PC SQLite append/readback: `PASS_QFR_SQLITE_APPEND_READBACK`, 저장 SHA `232f7757e654e787a9eab49792302feb3683e5280a66ff0cc9bd7f0cbc448654`. R3 저장형 읽기/검산 PASS: 2026-Q2 15.599418144173285%, 2026-Q1 14.03708175763798%, Δ+1.5623363865353053%p. [원담당 R3 기록](EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_20261027.md). 2026-11-16 최신 원본 재조회 증명과 동일시 금지.
2. **2026-10-28** 승인된 15개 QFR 파일을 앱 `main`에만 선별 반영: [commit `2f3f07`](https://github.com/ansqhd5774-Choi/zgmini/commit/2f3f07fcc2b9130e4789b31381cc789947a69ba7). PC 설치 또는 D1 쓰기 증거 아님.
3. **2026-11-02** QFR Reader/UI [PR #958](https://github.com/ansqhd5774-Choi/zgmini/pull/958) merged. 실제 D1 row·Production SHA/화면 값은 별개.
4. **2026-11-03 이후** 제어 [Draft PR #77](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/77)→[#112](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/112) 2키(BEA unit/QFR) 전용 B 승인·실행기·workflow proposed. `#112` 현행 Draft/unmerged; 이력의 fixture 16/16은 Windows 실게시 PASS 아님.
5. **2026-11-16** QFR source pin 경쟁조건 12 시나리오 계약 모의실험(정상+안전거부 12/12), 실제 실운영 성공 12건 아님. 앱 [Draft #1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175): D1 클라이언트 열기 **전** `sourceVersion`, raw ZIP SHA, sourceStoredAt 검증, 기존 CI [Run #43863499821](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/43863499821) success(4431 total, 4421 pass, 0 fail, 7 skip, 3 todo). 제어 [Draft #1698](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1698): B preflight에서 3핀 증거 수집→apply 환경 전달→apply 체크→검증된 zero-write drift와 STATE_UNKNOWN 구분. 제어 변경에 대한 **별도 CI 미확인**.

## 2. 공통 경로 실제 계약 대조
- 운영 `pc-job` A급은 mutating D1 publisher가 아님. [현행 control main](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/config/operations.json) allowlist에 QFR D1 apply 없음.
- 기존 제어 `writer-b/contract.mjs` 일반 파일 source overlay는 `allowD1Writes=false`를 명시한다. 기존 `.github/workflows/pc-writer-b-source-once.yml`은 B **파일 설치** 경로이고 D1 게시 승인으로 승격되지 않는다.
- 기존 `direct-writer-b/approval-contract.mjs`, `direct-writer-b/run.mjs`의 승인 효과는 registry PIN CAS, versioned bundle, configured themes 등 제한된 효과만 허용한다. QFR D1 단일키 게시를 무조건 실행할 수 있는 공통 B라고 가정 금지.
- 제안 `pc-publication-b.yml`은 별도 `$GITHUB_WORKSPACE/publisher`에 앱 main checkout, 제어 executor에 엄격한 manifest/checksum, 운영 승인 root 별도 SHA 검증을 설계했다. 아직 제어 main 경로에 없음. **이미 승인·설치된 등가 QFR 정확키 B 경로가 있는지는 관련 기존 영수증으로 확인할 항목**이고, 새 독립 runner/workflow가 무조건 필요하다는 결론도 아님.

## 3. 공개 전문가 소스 비교(실제 코드/기능)
1. [Cloudflare 공식 D1 Prepared Statements](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/d1/worker-api/prepared-statements.mdx): `prepare(...).bind(key).first()` + `run()`으로 정확키 조회·쓰기. ZGMINI QFR Writer는 이미 `INSERT ... ON CONFLICT ... WHERE sourceStoredAt` 이후 정확한 body/storedAt readback을 사용하므로 **교체하지 말고 보호 유지**.
2. [Cloudflare 공식 d1-starter-sessions-api](https://github.com/cloudflare/templates/blob/main/d1-starter-sessions-api-template/src/index.ts): write → SELECT readback, `withSession(bookmark)`로 순차 일관성. ZGMINI 원격 readback과 공개 Reader의 replica 불일치가 **실제로 나타날 때만** 세션 북마크/primary 경로를 검토; 신규 공통 필수 기능으로 먼저 추가 금지.
3. [actions/checkout 공식 README](https://github.com/actions/checkout/blob/main/README.md): `ref`로 commit SHA checkout, side-by-side `path`, `persist-credentials:false`; 기존 control Draft workflow의 독립 main publisher checkout과 비교. **반드시 승인 manifest publisherSha == 실제 checkout HEAD == origin/main, file digests**를 사전 확인. 자동 clean/reset으로 운영 작업자 변경 파괴 금지.

## 4. 근본 문제 분류(중요도)
| 문제 | 근거 | 판정 |
| --- | --- | --- |
| A. 기존 운영 checkout에서 QFR 파일 5 ABSENT | #1709 실PC 원격 readback | **증명됨**. 그러나 독립 publisher 설계에서는 **직접 원인이 아님** |
| B. 제어 `main`의 제안 B workflow 없음 | main file 404, #112 Draft | **해당 제안 실행경로 미구축 확정** |
| C. 다른 승인 QFR B 실행 경로/manifest | 운영 별도 B checkout·정확키 영수증 없음 | **미확인**, 없음으로 단정 금지 |
| D. QFR 사전검사 A→게시 B 원본 경주 | control B preflight+apply 재선택, 지난 모의 반례 | **소스 결함**; #1175/#1698에 수정안 작성, 미설치 |
| E. 현행 QFR D1 row/API/UI | 단일키 실제 쓰기/readback/배포 identity 없음 | **미검증**, 현재 API 503로 단정 금지 |
| F. 일반 Writer B overlay의 권한 | 기존 contract `allowD1Writes=false` | **해당 경로는 QFR D1 게시에 부적격** |

## 5. 최소 복구 실행순서 — 종료 조건이 있는 8단계
1. **B 실행 경로 확정 (Owner: W05+기존 B 소유자)**: 제어 `main`, 실제 installed B source/approval ledger/작업 registration을 1회 대조. QFR 단일키 게시 허용된 기존 공통 B가 있으면 그것을 재사용. 없다면 공통 B 승인/게시 adapter의 **정확 QFR 키 한정 최소 확장** 검토; #112 제안 workflow 전부 무조건 신규 설치하지 않는다. 등가 approved route의 실제 경로·source SHA·권한을 확보하거나 미지원 범위를 명시하면 종료.
2. **기능 publisher source 통합 (W05)**: 기존 CI PASS 앱 [#1175](https://github.com/ansqhd5774-Choi/zgmini/pull/1175) 중 QFR publisher+테스트의 최소 변경을 승인된 최신 앱 `main`에 선별 병합. 장기 `codex/api-site-integration` 전체 병합 금지. `sourceVersion/rawZipSha256/sourceStoredAt` 검사는 D1 클라이언트 **열기 전**에 일치/무쓰기 확정. exact source SHA 및 CI 증거 회수.
3. **B executor의 집중 검증/통합 (B 소유자)**: 기존 #112 기반 [#1698](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/1698) 분기 2파일 집중 Node 테스트 (`tests/publication-contract.test.mjs` + `tests/publication-executor.test.mjs`), 정상 A→A, A→B write 0, malformed TXT, already-stored, timeout/STATE_UNKNOWN, unique result, lease 포함. 테스트 후 기존 승인 경로에서 minimum source 통합. 다른 B 기능 정상 회귀 유지.
4. **게시 소스 격리·SHA 확인 (B 소유자)**: 승인된 PC 운영 checkout `config.source`는 그대로 유지. 별도 clean publisher checkout에 최신 승인 앱 main QFR 파일과 종속 파일이 있는지/`git HEAD=origin/main=manifest publisherSha`와 각 SHA256 대조. **운영 checkout 5파일을 복사해 채우는 행위는 기본 계획에 넣지 않음**.
5. **QFR 로컬 원본 사전검사 (W05/B 소유자)**: 기존 PC SQLite만 read-only, raw ZIP SHA/스냅샷 SHA/저장시각/관측분기·165일 freshness를 동일 source의 한 번의 preflight에서 확보. 신규 Census 공급자 호출·원자료 저장 재실행 없음. 소스가 바뀌면 새 고정 검증 후 판단.
6. **승인된 B 1키 게시 (B 소유자)**: 정확 snapshotKey=`detail:earnings-recession-indicators:census-qfr-mfg-margin:v1`, 승인 manifest·고유 Issue/requestId·maxD1Keys=1·retry=0. pin mismatch 시 D1 writes 0. 정상 시 `READBACK_VERIFIED` 또는 이전 동일 `ALREADY_STORED`를 body+storedAt+version 비교로 확인. 실패/불명확 시 같은 요청 자동 재실행 금지.
7. **Production 종단 확인 (W05)**: D1 단일행/readback → QFR API `/api/earnings-recession-census-qfr-margin` 동일 sourceVersion/시각/값 → 실제 Cloudflare Git Integration Production deployment/source SHA → `/earnings-recession/` PC·모바일 값/날짜/결측 확인. 200만으로 완료 금지.
8. **14단계 귀속·인계 (W05)**: 작업 #1(B 경로) 완료, #2(QFR D1 실게시), #3(QFR 공개 UI) 각기 독립 실제 증거 충족 후만 DONE 집계. 후속 BEA 단위이익/WPSFD42/제조업은 기존 독립 근거·승인 경로를 재사용하며 QFR 때문에 전체를 전역 차단하지 않음. 다음 자연 갱신은 종료 Gate가 아닌 후속 관측.

## 6. 이번 조사 완료점과 비실행
- **LAST PASS:** #1709 Windows 실제 A/read-only 6파일 검증 + 결과 원격 JSON/TXT 2/2; 앱 QFR main 소스와 B Draft 이중 체크아웃 의미 대조; 공식 Cloudflare/GitHub 오픈소스 원문 확인; 앱 #1175 CI PASS 재사용.
- **FIRST FAIL:** 이번 조사 중 실제 운영 오류 실행 없음.
- **FIRST BLOCKER:** 제안 B Workflow control main 미존재 + 현재 QFR 단일키 실제 승인/installed 게시 route 증거 부재. 별도 B 경로의 실존 자체는 UNVERIFIED.
- 작업 효과: PC 원본/Config/Core/Writer/D1/Cloudflare·Scheduler 변경 **0**. 사용자 PC 수동 입력 요구 없음. 연구 문서와 중앙 #68 인계만 수행.
- **다음 필수 실행 하나:** 기존 B 소유자가 QFR 단일키를 허용하는 **기등록 승인 게시 operation·설치 source/approval manifest·별도 publisher checkout**의 존재/허용 범위를 실제 등록/기존 원장으로 확인 → 확인된 경로에만 코드·CI·정확키 게시를 연결. 새 Workflow·예약·Runner를 임의 기본안으로 만들지 않는다.

