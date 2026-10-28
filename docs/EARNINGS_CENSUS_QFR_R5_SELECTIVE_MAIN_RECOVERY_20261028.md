# 실적 침체 Census QFR — 본선 선별 회수 사전검증 및 적용 결과 R5

- 기준일: 2026-10-28 KST
- 저장소: `ansqhd5774-Choi/zgmini`
- **유일 작업 브랜치:** `codex/api-site-integration-r1-20261026`
- 조사 시 브랜치 HEAD: `a745f781f88240964e5f0b912388282cbcd58bdf`
- 조사 시 `main` HEAD: `67c0621bb4ac02963cc847ec28af506885485b04`
- 최초 조사 상태: **선별 회수 대상 확정 / 당시 main 파일 쓰기·PR·병합·Cloudflare 배포·PC D1 쓰기 없음**. 최신 적용 상태는 아래 §6 참조.

## 1. 왜 브랜치 전체 병합을 하지 않는가

GitHub compare(`base=main`,`head=codex/api-site-integration-r1-20261026`)에서 작업 브랜치는 `ahead_by=161`, `behind_by=40`, `status=diverged`, `merge_base=aaf15da2d14085b883b9018f5f66479c43058f38`이었다. 따라서 전체 merge나 전체 브랜치 PR은 별도의 최신 main 40개 커밋과 무관한 수많은 파일을 포함할 수 있다. 사용자 지정 브랜치를 유지하면서 **15개 Census 관련 파일만 신규 복사하는 선택적 회수**가 적합하다.

기존 `AGENTS.md`는 `migration/analysis branch 전체 merge 금지`, `무단 main 병합·Production 배포 금지`를 명시한다. 사용자의 별도 명시 승인과 최신 SHA 확인 전에는 이 목록을 실제 main에 적용하지 않는다.

## 2. 정확한 회수 대상 — 원본 Git blob SHA

아래 14개 런타임·CMD·테스트 파일은 확인 시점 `main`에서 모두 `NOT_FOUND`였다. 동일 경로를 새로 추가하는 방식이므로 기존 main 파일 덮어쓰기가 아니다.

| 역할 | 경로 (`/` 기준) | 승인 브랜치 blob SHA |
| --- | --- | --- |
| QFR 공식 ZIP 파서 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R1_READONLY.mjs` | `81172219972e71f505813180ca6ac036ae1dab71` |
| ZIP 불변 원장 검증 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs` | `95059aae7122b8442deba14aefe528b9cdc55050` |
| 저장 원본 재계산 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs` | `e52d26366daf57102983a4c4d55e2491e85d8e78` |
| QFR R4 순수 투영 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.mjs` | `df8e0eb1e4190086731db1beae8ab0c2fc4a3ac2` |
| QFR D1 수동 게시 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs` | `4667e39aaa1989bee15703dd0990516c95dfb6cc` |
| QFR 전용 D1 검증·write/readback | `worker/earnings-companion-c-qfr-r1.mjs` | `c799387585511fbe1f2941dc4df3072ee7872c43` |
| D1 사전검증 Windows CMD | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_PREFLIGHT.cmd` | `0b54aa83793d89ddd7580a202aead39338b8ce79` |
| D1 저장 Windows CMD | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_APPLY.cmd` | `0fc0658ba29023317b2a7e1d7e4c06c0c5122d4e` |
| R1 테스트 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R1_READONLY.test.mjs` | `43f680b45a5bbdef209310b581e895fa702acfff` |
| R2 테스트 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.test.mjs` | `de3f5c296878fed643a0dd5a556642d64b6e0f9c` |
| R3 테스트 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.test.mjs` | `86f2254cd871f32e725f71fd192cc5ac3ab522e3` |
| R4 투영 테스트 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_READONLY.test.mjs` | `1b4f5a5d8c303fb13c8dae1cbe99d894dfb30b3b` |
| D1 게시기 연결 테스트 | `scripts/pc-writer/EARNINGS_CENSUS_QFR_R4_D1_ONCE.test.mjs` | `b3267b442470e3047e89e9a0a4be3d816df79801` |
| D1 Writer 테스트 | `worker/earnings-companion-c-qfr-r1.test.mjs` | `08f4b429f77e3971bdf14f6e17467d4158ae238a` |

운영 기준서 `docs/EARNINGS_CENSUS_QFR_R4_PROJECTION_DRAFT_20261028.md`도 `main`에는 아직 없으며, 선택적 회수 시 문서 1개만 함께 추가한다. 기준 브랜치 blob SHA: `bc75bf8d3fb126b066da32f018d62aeedfa91a54`.

## 3. 이미 main에 있으므로 무수정 재사용할 코드

| 경로 | main과 작업 브랜치 모두 동일한 blob SHA |
| --- | --- |
| `scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs` | `7c6a285b45775103461eae9a87443843b5b317b5` |
| `scripts/pc-writer/d1.mjs` | `24fec38e11c39f9e461df8f23d52c95942537b6e` |

기존 BLS companion Worker는 main과 전용 브랜치의 **내용이 다르므로 회수 대상에서 제외**한다. `worker/candidate-r52.ts`, 기존 E1-R4 위험 점수, 기존 BLS/BEA D1 키, Cloudflare 설정, Scheduler, UI는 회수하지 않는다. Census 전용 게시기는 위 기존 D1 모듈의 인터페이스를 재사용한다.

## 4. 실제 선택적 회수 전/후 필수 Gate

1. **추가 승인:** 사용자가 정확히 **위 15개 Census 전용 파일만 `main`에 반영**하도록 명시 승인할 것. 이 승인은 Cloudflare Production 배포·D1 write·DNS 변경을 포괄하지 않는다.
2. **드리프트 검사:** 최신 `main` 및 전용 브랜치 HEAD를 다시 가져온다. main에 위 15개 중 이미 새로 생긴 경로가 있거나 브랜치의 blob SHA가 변했다면 중단하고 범위를 재검토한다. 이번 조사 SHA는 향후 현재값을 보증하지 않는다.
3. **원자적 선별 회수:** 최신 `main` tree를 base로 삼고 위 정확한 경로/blob들만 추가한다. 다른 main 경로 수정/삭제 0건. 전체 브랜치 merge/PR 금지, 신규 개인 브랜치 생성 금지.
4. **코드 테스트:** R1/R2/R3/R4 투영/게시기/Worker QFR 테스트, 기존 BLS Worker 및 UI 회귀검사 PASS; main의 D1 source gate 의존 파일이 여전히 일치하는지 확인한다.
5. **출처 검증:** main HEAD의 예상 SHA와 Git/Cloudflare 소스는 구분하며, 실제 Production Build/Deploy 실행 가능성은 별도 Deployment Authority Gate를 적용한다. merge만으로 사이트 반영·배포 성공을 선언하지 않는다.
6. **PC 검증:** 승인된 clean main 게시 checkout 및 별도 clean PC 운영 checkout(`config.source`와 SHA 일치)이 준비돼야 `EARNINGS_CENSUS_QFR_R4_D1_PREFLIGHT.cmd`가 PASS 가능하다. 실제 D1 APPLY는 추가 명시 승인을 요구하며 저장 후 **정확한 D1 readback** 증거가 필요하다.

## 5. 현재 결론

- 이미 확보한 PC Census 원장 ZIP 보존 및 R3 실제 PC 검산 PASS는 유효하므로 재수집하지 않는다.
- QFR D1 게시 로직·CMD 및 로컬 QFR 33건(R1 5 + R2 8 + R3 6 + R4 5 + 게시기 3 + Worker 6) + 기존 BLS/화면 19건, 합계 52건의 회귀 테스트 코드가 작업 브랜치에 있다.
- **첫 운영 미검증 Gate는 `main`의 선택적 15파일 회수 및 clean main 게시 소스 준비**다. 이 보고서 작성만으로 해당 Gate를 통과한 것이 아니다.
- `MAIN_QFR_FILES=NOT_PRESENT`, `MAIN_SELECTIVE_RECOVERY=NOT_RUN`, `PC_D1_PREFLIGHT=NOT_RUN`, `D1_APPLY/READBACK=NOT_RUN`, `PUBLIC_GET=NOT_RUN`, `SITE_DEPLOY=NOT_RUN`.

## 6. 사용자 승인 이후 실제 main 선별 반영 결과 (2026-10-28)

- 사용자가 **정확한 Census QFR 15개 파일만 최신 `main`에 선별 반영**하도록 명시 승인했다. 위 §1~5의 스냅샷은 승인 전 조사 기록이며 현재 운영 판정은 이 절을 우선한다.
- 반영 직전 지정 작업 브랜치 원본 SHA **15/15 일치**, `main` 대상 경로 **15/15 미존재** 확인. 재사용 D1 모듈 2개는 양쪽 blob 동일.
- 부모 `main=67c0621bb4ac02963cc847ec28af506885485b04`, 부모 tree=`876a136f3a364307ef1f008ebff306f108d85507`에서 **승인된 blob SHA 15개만 추가**한 tree=`32fc55b3fbbf6bcba7d279634572a598ec568598`를 생성했다.
- 신규 `main` 커밋 **`2f3f07fcc2b9130e4789b31381cc789947a69ba7`**. 브랜치 ref는 `force=false` + 기존 부모 SHA 기대조건으로 갱신했고 `success=true`를 받았다.
- `compare(parent, main)`에서 **ahead 1, behind 0, 변경 15개 전부 ADDED**, 경로 집합 **15/15 정확 일치**, 기존 파일 수정·삭제 **0** 확인. 실제 `main` HEAD도 해당 커밋과 일치. 지정 작업 브랜치는 건드리지 않고 기존 이력 보존.
- GitHub Actions `Node.js CI`(run `40617816279`)가 신규 main 커밋으로 자동 시작되어 **Build 단계 PASS**를 확인했으나, 이후 **run 전체는 `CANCELLED`**로 종료됐다. Regression tests는 취소되고 후속 일부 검사는 SKIPPED였다. 따라서 **CI 전체 PASS를 주장하지 않는다**. `IndexNow notify` 작업은 별도 성공. Cloudflare exact deployment / 실제 API / UI / D1 readback은 각각 별도 검증이 필요하다.
- 후속 읽기 전용 조회에서 다른 작업자의 `main=e7592a6f6bab7ce4e37a3fb204006a79aedc96f3`가 확인됐다. `compare(2f3f07...,main)`은 `ahead=3,behind=0`, 신규 차이 8개는 공포탐욕 UI·테스트 파일에만 있어 **QFR 15파일 및 본선 커밋은 그대로 조상에 남아 있다**. 이 조회 이후 main HEAD는 다시 변경될 수 있다.
- 최신 main의 후속 `Node.js CI`(run `40617926778`)는 `Build=PASS`, `Type check=PASS`, `PC publication recovery tests=PASS`, `Cloudflare candidate read contracts=PASS`였지만 `Regression tests=FAIL`로 전체 실패했다. 3,334개 중 실패 1건은 **`tests/theme-nine-r39-parquet-coverage.test.mjs`**, 누락 파일은 `config/theme-nine-r20-approved-candidates.json`. 이번 QFR 선별 반영 **이전** main commit `67c0621...`의 CI(run `40530526870`)에서도 **같은 테스트·같은 경로 누락**으로 1건 실패했음을 실제 job log로 교차 확인했다. 따라서 이번 범위의 QFR 테스트 실패로 오인하지 않으며, 다른 테마 작업 파일을 무단 수정하지 않는다.
- 최종 구분: `MAIN_QFR_SELECTIVE_RECOVERY=PASS`, `SOURCE_CONTENT_15_15=PASS`, `CODE_LOCAL_TEST_52_52=PASS`(반영 전 동일 blob), `QFR_MAIN_COMMIT_CI=CANCELLED_AFTER_BUILD_PASS`, `LATEST_MAIN_CI=FAIL_PREEXISTING_THEME_NINE_MISSING_FILE`, `PC_D1_PREFLIGHT=NOT_RUN`, `D1_WRITE/READBACK=NOT_RUN`, `PUBLIC_GET=NOT_RUN`, `SITE_DEPLOY=NOT_VERIFIED`.
