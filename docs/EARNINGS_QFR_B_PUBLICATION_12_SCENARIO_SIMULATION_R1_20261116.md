# ZGMINI W05 — Census QFR 게시 경로 12시나리오 실행 시뮬레이션 및 조건부 성공률 (2026-11-16)

## 목적·범위
사용자 요청: "시뮬레이션 진행하고 추가 문제점이 있으면 보고하고 예상작업성공률 보고해라." 대상은 원래 W05 실적 침체 업무의 남은 14단계 중 **Census QFR 단일 키 실제 게시·readback과 API/화면 연결**이다. 현재 앱/제어 GitHub Source를 V8 격리 환경에서 평가했으며 **실제 PC Runner, DB/D1, 공급자 호출, 게시, 배포 0회**. QFR 165일 기준·E1-R4 승인 점수·TTL·D1 계약을 수정하지 않았다.

- 앱 `zgmini/main`: 조회 시 `f5fe56a48d651129bd811cc34d43665fba51c146`
- 원담당 브랜치 `codex/api-site-integration-r1-20261026`: 이 시뮬레이션 착수 전 `5cf8eef0440305952fb28da9f65c48ff2c984c81`
- 제어 `zgmini-pc-control/main`: 조회 시 `2afcbec5e3a047c4c8e188b9e90178935edce356`
- 제어 Draft 브랜치 `codex/bea-qfr-b-seven-file-integration-20261103`: `c5c00e6f663e20e24231aebadc7a7e6235972aad`
- 대상 소스 함수/블롭: [QFR Writer/Reader](https://github.com/ansqhd5774-Choi/zgmini/blob/main/worker/earnings-companion-c-qfr-r1.mjs) `c9d8679e546413e82c6c7fe6e49082c3668512c6`, [QFR 공개 fixture](https://github.com/ansqhd5774-Choi/zgmini/blob/main/worker/earnings-companion-c-qfr-r1.test.mjs) `40a73ecaf88a86556261ec6ccfbd8cbbbf65b7c1`, [control B 실행기](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/codex/bea-qfr-b-seven-file-integration-20261103/tools/publication-executor.mjs) `1bda64b24f59633e2eae98bc0b56260da04dff45`, [B exact contract](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/codex/bea-qfr-b-seven-file-integration-20261103/tools/publication-contract.mjs) `2fce231cf3d18cfd2d73a367ad2dc8eb61105c53`.
- **실험 방법**: 실제 GitHub `worker/earnings-companion-c-qfr-r1.mjs`의 export 함수를 함수 실행 환경에 로드, 기존 공식 GitHub 테스트의 2026Q2 payload fixture를 사용, D1 `prepare().bind().first()/run()`을 메모리 Map adapter로 대체. B의 실제 `parsePublisherLog`를 원본 텍스트에서 추출 실행. **Node test 전체 suite/Windows 환경은 아님**. 결과 12개 시나리오의 **기대 판정 12/12**. 여기서 PASS는 '정상은 허용·문제는 안전 거부 또는 결함 재현'이고 실운영 12건 성공이 아님.

## 12시나리오 재현 결과

| # | 실제 함수 기반 검증 | 관찰된 결과 | 판정 |
|---|---|---|---|
| 1 | 2026-11-16 08:00Z, 2026Q2, 2026-10-27 저장 원본의 `qfrCompanionFreshness` | `FRESH` (다음 분기 시작 2026-07-01→138일) | 예상대로 PASS |
| 2 | QFR 검증 함수에 기존 5분기 데이터 | 구조·sourceVersion·기간·이력 `READY` 인정 | PASS |
| 3 | 모의 D1 신규 단일키 writer → exact body/storedAt readback | `READBACK_VERIFIED`, 단일 키/쓰기 1회 | PASS |
| 4 | 동일 원본 재시도 | `ALREADY_STORED`, 쓰기 1회 유지 | PASS |
| 5 | 동일 storedAt, 변경 sourceVersion | `QFR_D1_CONFLICTING_VERSION` 안전 거부 | PASS |
| 6 | 새 checkpoint보다 오래된 원본 | `QFR_D1_SUPERSEDED` 안전 거부 | PASS |
| 7 | D1 쓰기 성공 응답이나 저장 body 변경 | `QFR_D1_READBACK_MISMATCH` 검출 | PASS |
| 8 | 165일 초과 원본 | `QFR_D1_SOURCE_STALE`, 쓰기 0회 | PASS |
| 9 | B preflight→apply 원본 고정 여부 | **QFR SHA pin 검사가 없음을 코드로 확인** | 신규 구조 결함 |
| 10 | 제어 최신 `main`에 B Workflow | `.github/workflows/pc-publication-b.yml` 404 | 기존 직접 차단 확인 |
| 11 | B Issue 승인 이벤트·라벨·변수 | `issues.opened`, `pc-publication`, `ZGMINI_B_PUBLICATION_APPLY_ENABLED=true` 모두 필요 | 기존 정확 계약 확인 |
| 12 | B 원본 결과 파서의 QFR 출처 비교 | apply 결과 자체는 읽지만 preflight 소스 SHA와 비교하는 함수 없음 | 신규 구조 결함 9의 별도 확인 |

### 추가 독립 반례 재현 — preflight A / apply B
- 모의 preflight 원장: `SOURCE_VERSION=aaaa... (64자리)`, `SOURCE_STORED_AT=T`, `RESULT=PASS_QFR_D1_PREFLIGHT_NO_REMOTE_ACCESS`.
- 모의 apply 원장: `SOURCE_VERSION=bbbb... (64자리)`, `SOURCE_STORED_AT=T+1000`, `D1_RESULT=READBACK_VERIFIED`, `RESULT=PASS_QFR_D1_EXACT_READBACK`.
- **실제 B `parsePublisherLog(apply,'census-qfr-margin-once')`는 `status=PASS` 반환**; 실행기가 preflight SHA를 저장하거나 apply에서 강제하지 않음. 조건부로 **사전검사에 없던 다른 저장 스냅샷을 게시하고 PASS 보고할 수 있는 원본-동일성 경쟁 조건**이 코드로 확인됨. 실 D1 실제 변경·침해 증거는 없다.

## 신규 P0 결함 1건: QFR 사전검사→게시 시 저장 원본 SHA 교체 가능

현재 제어 `tools/publication-executor.mjs`는 preflight를 `runFixedChild(script,['--dry-run'])` 수행하고 종료 코드만 확인한 다음, 시간 경계 후 별도 `runFixedChild(script,invocation.flags)`로 apply를 실행. QFR child `EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs`는 **각 실행 시마다 SQLite에서 '최신 스냅샷'을 다시 선택**한다. 이 사이 승인된 정규 수집기가 새로운 snapshot을 저장할 수 있다. `parsePublisherLog`는 apply 결과가 내부적으로 유효하다는 것만 확인하며 **preflight 원본과의 합치 여부는 확인하지 않음**. 기존 Writer의 `sourceStoredAt` CAS는 원본 선택 일치와 다른 보호(이력 역행 방지)이므로 이 문제를 해결하지 못한다.

### 가장 작은 수정, 정상 구조 보존
1. **제어 B 실행기**: QFR의 preflight *새 결과 파일*에서 `SOURCE_VERSION`/ `RAW_ZIP_SHA256`/`SOURCE_STORED_AT` 세 필드를 고정 수집하고 형식·고유성·관측시각 검증. 기존 BEA pin 처리는 그대로 유지.
2. **QFR publisher (앱 기능 repo)**: apply 시작 시 제어 B가 전달한 `ZGMINI_EARNINGS_QFR_SOURCE_VERSION`과 원본 `snapshotSha256`, `ZGMINI_EARNINGS_QFR_RAW_ZIP_SHA256`과 raw ZIP SHA, 최초 수집 시각을 **D1 .write 이전** 검사. 하나라도 변경되면 `QFR_PUBLISH_SOURCE_DRIFT`로 **D1 write 0**; 승인된 현재 원본이 변경됐다고 해서 무단 다른 ZIP을 선택하지 않음.
3. **제어 B apply**: 환경 SHA 핀은 manifest 승인 대상인 고정 스크립트/실행기가 생성한 preflight 원장만 사용; 사용자 Issue 자유형 env 명령/새 SQL/임의 파라미터 전달 금지. apply 자체에서도 pin 출력·결과 해시 일치 검사.
4. **격리 회귀**: 사전검사 A→게시 A PASS, 사전검사 A→수집기가 B 추가→게시 **write 0/DRIFT STOP**, SHA/시각 변조 거부, 동일 원본 재게시 no-write, 예전 원장 손상/STATE_UNKNOWN 처리. `ALREADY_STORED`일 때 D1 storedAt과 attemptedAt 혼동 금지.
5. **운영 적용**: 기존 수집기/원자료/가중치/TTL/예약/게시 키 변경 금지. 실제 운영 B 소유자가 설치/승인 source+manifest 존재 여부 먼저 확인 후, 기존 승인 공통 B 경로로 등록. 신규 범용 shell/CMD/임의 SQL 우회 금지.

**주의:** apply 완료 **후** sourceVersion 비교만 추가하면 다른 원본이 **이미 D1에 게시된 뒤**라 늦는다. 반드시 **QFR Publisher의 실제 D1 .write 앞**에서 pin을 검사한다. 원자료 정상 개정 반영은 다음 승인된 관측·검증 과정에서 새 원본을 다시 계산해 처리; 영구적인 발표 업데이트 차단 아님.

## 남은 기존 운영 차단/변수

1. **P0 원격 B 미설치:** 제어 main에 `pc-publication-b.yml`/B contract 미존재. 기존 별도 B installed exact scope는 직접 현장 증거 미확인. Draft PR #112는 아직 `open/draft/merged=false`. 현재 제안 Workflow를 그냥 호출할 경우 실행 경로 없음 — 안전한 게시 시도 성공은 **0%**.
2. **P0 B 승인·설치 SHA:** 단일 exact-key B actor approval issue/manifest/current publisher main/PC config.source/실설치 SHA 미확정. 소스·CI PASS와 다름.
3. **P1 QFR 저장 원본 신선도:** 2026-11-16 기준 `FRESH`라고 함수 모의 확인. PC 현행 retrievedAt/수정·새 저장 snapshot은 실제 READBACK 전 확인 필요. 기존 원자료 다시 호출 불필요.
4. **P1 배포 SHA/UI:** API/사이트의 정확 Production deployment SHAs 미확인. D1 게시만으로 페이지 UI 성공 아님.
5. **P1 BEA 단위이익:** 소스 `24aee636`/B pin `c5c00e6`는 branch 상태. 승인 수집기의 archive SHA와 CSV+JSON 메타 실운영 저장·설치 미확정. CSV와 메타 두 exclusive writes 중 장애 시 반쪽 archive 위험은 이미 R1.1에서 식별된 별도 기능 문제; 본 QFR 신규 결함과 합산하지 않음.

## 예상 작업 성공률 — 근거와 한계

**통계적 성공률 아님**. 유사 Windows 배포 표본이 없는 상태에서, 확인된 source PASS와 승인·설치·D1/배포의 미확정 조건에 **명시적인 주관적 조건부 성공 가정**을 부여한 *시나리오 추정*이다. 서로 독립이라고 가정한 간이 곱셈이며 현실의 장애 상관관계는 반영하지 못함. 실제 원장 확인에 따라 숫자는 바뀔 수 있음.

| 업무 범위/조건 | 가정 및 계산 | 예상 성공률 |
|---|---|---|
| **현행 control main 변경 없이 제안 B Workflow만으로 즉시 게시** | Workflow main 부재 (현재 API 404). 다른 승인 설치 경로가 실제 존재하는지 별개 미확정 | **해당 제안 경로 0%** |
| **선별 통합 + B 인가·설치 + QFR 사전/게시 SHA 고정 후 단일키 D1 게시** | 소스 통합·회귀 .92 × 승인·PC source/실설치 .90 × SQLite 원본 신선도 .96 × D1 exact-key 저장·readback .95 | **약 76%** |
| **위 수정 후 QFR D1→Production API/PC·모바일 전체** | 상기 .755 × Production SHA·API/UI 일치 .90 | **약 68%** |
| **14단계 네 지표군의 일괄 최초 시도 성공** | QFR 전체 .680 × BEA .80 × WPS .79 × 제조업 .82 × 공통 최종 회귀 .93 | **약 33%** |

모든 추정치는 **코드 수정·승인·설치가 실행된다는 전제의 계획 성공 확률**이며 현행 PC에서 이미 달성한 확률·보증이 아니다. 특히 14단계 전체 33%는 각 지표군을 중간 수정/재시도 없이 한꺼번에 최초 시도에서 종단 완료하는 보수적 추정이다; 단계별 수정·검증으로 늘릴 수 있고, 실제 설치를 알게 되면 다시 산출해야 한다. 12/12 PASS를 100% 운영 성공률로 바꾸면 안 된다.

## 현재 결론
- 이번 시뮬레이션 12/12 수행, 추가 실제 코드 구조 결함 **1종** 발견/반례 재현.
- **LAST PASS:** QFR 기존 2026Q2 payload 2026-11-16 신선도 FRESH; writer 단일키 readback/중복·역행·만료 안전 거부; 기존 B contract source identity 경로의 부재 재현.
- **FIRST BLOCKER:** 제어 `main`의 운영 B Workflow 소스 누락 및 승인·실PC 설치 미확인.
- **FIRST CHANGE:** QFR preflight의 원본 SHA 세 항목을 제어 B에서 고정 회수, 실제 Publisher가 **D1 .write 전** 동일성을 검증하는 최소 두 파일 수정과 관련 회귀. 기존 QFR/BEA score/SQLite/TTL 변경 없음.
- **다음 필수 실행:** 현재 기등록 승인 QFR B 실설치 증거가 없으면, **독립 개발 가능한 QFR SHA pin 소스 교정**부터 두 repo 최소 파일로 구현·targeted tests; 이후 중앙 단일 Owner의 기존 B 승인 경로로 선별 통합·PC 설치/단일키 D1 게시/readback. 실제 다음 발표 주기 관측은 현재 종단 구현의 강제 선행조건 아님.
