# ZGMINI 양대 저장소 CI 표준화 실행계획 R1

기준일: 2026-11-25 (Asia/Seoul)
목적: 공개 GitHub 공식/활발히 유지되는 CI를 **검토하여 필요한 부분만 재사용**, 정상 CI를 보존하면서 누락된 검사를 실제 PR 검증으로 연결한다.
대상: ansqhd5774-Choi/zgmini (웹사이트), ansqhd5774-Choi/zgmini-pc-control (PC 제어)
작업 브랜치 (각 저장소 독립): `codex/ci-standardization-r1-20261125`.
원칙: 8종은 **검사 영역**이며 16개 독립 workflow를 뜻하지 않는다. GitHub 설정 파일·CI Run·실제 호출 명령의 증거를 분리한다. 현행 안전·권한·운영 승인 구조를 바꾸지 않는다.

## 1. 8개 영역 기준 및 분류

판정: IMPLEMENTED(실제 자동 검사 포함), PARTIAL(일부만), NOT_CONFIGURED(Workflow 미실행), UNVERIFIED(관련 설정/결과 조회 권한 없음), NOT_APPLICABLE(기술적 이유 확인).
- Lint / Type Check / Build / Unit / Integration / E2E / Security / Secret
- GitHub CodeQL, GitHub Secret Protection, Dependabot 알림 등의 **private-repo 기능 활성 상태는 별도 설정 조회가 없으면 UNVERIFIED**. 워크플로가 없다는 이유만으로 GitHub 서비스 미사용을 단정하지 않는다.
- 테스트 존재와 CI 자동 실행, 유닛/계약 테스트와 실제 API·DB/브라우저/운영 연동을 구분한다.

## 2. 재사용 후보와 배제 조건

1. GitHub `actions/starter-workflows/ci/node.js.yml` (기존 Node.js CI에만 참고/선택 통합): https://github.com/actions/starter-workflows/blob/main/ci/node.js.yml
2. GitHub `github/codeql-action` (코드 보안 분석): https://github.com/github/codeql-action — 비공개 저장소에서 GitHub Code Security 제공 권한/요금 확인 전 활성화 금지.
3. `actions/dependency-review-action`: https://github.com/actions/dependency-review-action — private repo 지원·필요 기능 확인 전 강제 Gate 금지.
4. `gitleaks/gitleaks` CLI: https://github.com/gitleaks/gitleaks — 라이선스·바이너리 배포·실행 지원 검증 후에만 검토. `gitleaks-action@v2`를 관성적으로 복사하지 않는다(2026-09 Node20 호환성 문제/라이선스 변경).
5. `actions/typescript-action`: https://github.com/actions/typescript-action — TypeScript 사용 저장소의 설정 참고 전용, 기존 `tsc` 검사와 중복 추가 금지.

원본 라이선스·권한·유지보수, node/windows 호환, SHA pin, 무료 지원 여부, 비밀값 출력 여부, 실행시간, 중복 검사를 비교하여 선정한다. 카피/붙여넣기 자체는 합격 근거가 아니다.

## 3. 다섯 단계 실행 계획 및 완료 기준

| 단계 | 범위 | 완료 판정 |
|---|---|---|
| 1 | 두 저장소 최신 main의 workflow/명령/실제 Run 전수 분류 | 각 영역별 증거·한계 기록 |
| 2 | 공식 공개 CI와 적합 구현 비교 | 분야별 채택/보류 근거·비용·안전 확정 |
| 3 | 기존 workflow에 최소 변경 또는 독립 격리 검사 추가 | 전용 브랜치에 재사용 소스 구현 |
| 4 | 정상/결함 fixture, 격리 CI, 기존 회귀 검사 | 관련 Run 통과, 기존 정상 검사 보호 |
| 5 | PR의 실제 검사 결과와 정규 main 병합·readback | merge SHA와 각 검사 동작 검증 |

중복 Workflow/Runner/예약 및 무관한 운영 설치·Cloudflare/D1 배포는 생성하지 않는다. PC 제어의 원자료/Writer/Controller/Runner/SQLite/D1/키/lease/보호 상태는 격리 CI에서 쓰지 않는다. 기존 완수 증거는 재사용한다. 무료·비과금 우선. 실패를 경고로 숨기거나 assertion을 삭제하지 않는다.

## 4. 진행 기록

- 2026-11-25: 사용자 지시로 두 저장소별 전용 브랜치를 최신 main에서 생성. 본 계획 저장 단계.
- 1단계: 일부 현행 workflow·CI Run 조사 완료; 나머지 검증 범위 계속 조사.
- 2단계: 후보 도출, 사전 선정 완료 아님.
- 3–5단계: 구현/CI 검증/병합 실적 별도 기록. 계획 저장을 실제 CI 적용으로 집계하지 않음.

## 5. 위험·완료 증거

동일 변경에서 임의 CI 전체 도입 금지. CI 성능은 변경 전후 Run duration·대기시간을 구분한다. 무관한 기존 실패는 독립 처리. 현재 작업이 변경하는 workflow만 관련 시험. 적용 여부는 각 workflow run과 본체 API/UI 또는 PC 격리 실제 경로 증거로 구분한다.

## 저장소별 실행 대상 — zgmini (웹사이트)

- 기준 main: `48034ae3481192a519e6c472aac40f9a7272451f`.
- 작업 브랜치: `codex/ci-standardization-r1-20261125`.
- 기존 `.github/workflows/node.js.yml`: `npm ci`, Build, `npm run typecheck`, `node --test` regression·게시 복구·Cloudflare 계약 검사. 최근 Run 45426802659 SUCCESS.
- 기존 `.github/workflows/community-chat-browser.yml`: Chromium/Playwright를 이용한 UI·Production 읽기 E2E(경로 선택 PR 트리거). `community-chat-candidate.yml`은 선택 빌드/회귀.
- `package.json`: `lint`/ESLint 실행 명령은 있으나 기본 Node.js CI 단계는 없음. 우선 Lint 사전 오류 확인 후 기존 workflow에 붙일지 결정.
- Unit IMPLEMENTED, Type IMPLEMENTED, Build IMPLEMENTED, Integration PARTIAL (실제 DB/서비스 호출과 Mock/계약 구분), E2E PARTIAL 또는 특정 UI 경로 IMPLEMENTED, Lint NOT_CONFIGURED in CI, Security/Secret workflow UNVERIFIED (GitHub repo security settings도 UNVERIFIED).
- 첫 수정 후보: 현행 기본 Node.js CI 내 Lint 단계, 다만 기존 린트 오류·빌드 정상성·CI 게이트 영향 확인 후 최소 변경.

### 2026-11-25 CI 실측 — 웹사이트 Lint 초기 기준
- 저장소 PUBLIC (GitHub metadata). GitHub native Secret Scanning은 별도 Workflow와 구분.
- Node.js CI Draft PR #1556, 첫 Run 45431525570 (d81aa4978e2b321f3412c5fdacbe22039923eda7): Build·Type Check 성공, ESLint 625건 (errors 239, warnings 386)으로 실패. 주요 오류 @typescript-eslint/no-explicit-any (175), @next/next/no-html-link-for-pages (25), @next/next/no-assign-module-variable (11). 기존 소스 전체 검사로 인한 신규 PR 차단 위험. 무단 rule 해제/무차별 fix/가짜 PASS 금지.
- Lint를 현행 regression·publication·Cloudflare 시험 이후로 이동. Draft PR에서 사전 오류 정밀 분류 후 단계적 enforcement 설계. 최초 실패는 해결 완료 아님.
- 공개 actions/starter-workflows/ci/node.js.yml을 확인했고 이미 기존 npm ci, Build, Test 경로를 재사용; 중복 workflow 불필요.


---

# 잔여 CI 8종 표준화 실행 지시 R2 (2026-11-25)

> R1 실행계획과 이미 병합·검증된 결과를 유지한다. 이 절은 **미완료 범위**에만 적용한다. 대상: `ansqhd5774-Choi/zgmini` + `ansqhd5774-Choi/zgmini-pc-control`. 각 저장소의 기존 `codex/ci-standardization-r1-20261125` 브랜치와 최신 main은 독립 상태로 보존한다. 이 브랜치의 과거 소스가 최신 main과 분기돼 있으므로 운영 또는 다른 담당자의 변경을 덮어쓰지 않는다. 코드 수정은 최신 main 기반 별도 범위 브랜치를 우선하고 정규 PR로 병합한다.

## 목표/상태 판정

검사 영역 8종: Lint / Type Check / Build / Unit / Integration / E2E / Security / Secret. 독립 Workflow 8개를 목표로 하지 않는다. 판정은 `IMPLEMENTED`(필요 범위 실제 CI 통과), `PARTIAL`, `NOT_CONFIGURED`, `BLOCKED`, `UNVERIFIED`, `NOT_APPLICABLE`(기술적 불필요 근거). Workflow 존재·Mock 통과·CI 병합·운영 데이터/게시 성공을 구분한다. 진행률은 실제 증거가 확보된 범위로만 보고하며 가짜 100% 금지.

## P1-A — 본체 E2E 실제 실행 확인·복구

1. 최신 main `.github/workflows/community-chat-browser.yml`, Chromium/Playwright 시험 목록, 변경 경로 PR 필터를 확인한다.
2. GitHub Actions에서 최신/마지막 성공 Run, 최초 실패 Run, 실제 job/step/log를 회수한다. 트리거 미실행과 실행 실패를 분리한다.
3. 기존 PC/모바일 390/768/1440/1920, 차트 마지막 값·날짜·결측, 입력·탭/터치·라우팅, Mock API 및 Production 읽기 전용 시험을 재사용한다. 모든 화면의 E2E 성공으로 확대하지 않는다.
4. 실제 결함이 드러난 범위에만 최소 수정·원인 시험을 추가하고 기존 Playwright CI로 실행→PASS→병합→main readback한다. 브라우저 서비스 유료 결제, 운영 쓰기 금지.

## P1-B — 두 저장소 Integration 검증 연결 대조

- 본체: API→저장·조회, 저장 결과→계산/Projection, Projection→API→화면, 승인 공개 게시→D1/API readback.
- PC 제어: 등록 수집→원자료 저장→저장자료 계산→로컬 결과→승인 공개 게시→D1/API readback; Controller→Writer 실행/JSON·TXT 회수; 승인·CAS·lease·백업·복구.
- 각 경로의 대상 테스트·CI 트리거·실행 HEAD/Run을 연결하고 `PASS/PARTIAL/NOT_TESTED/NOT_APPLICABLE/BLOCKED`로 분류한다. 실제 빠진 경로만 기존 CI에 연결한다. 유효한 격리 통합 검사는 실운영 공급자·DB·게시 E2E와 혼동하지 않는다.

## P2-C — PC 제어 Type/Build 필요성 판정

- 실제 JS/MJS·TS 사용 현황, node --check, Oxlint, import closure, manifest/SHA/선택 설치 계약을 대조한다.
- 필요성이 입증되면 무료·기존 도구로만 최소 검사 추가. `tsc --checkJs`/JSDoc 또는 별도 Build는 실제 탐지 결함/효과와 기존 코드 영향 검증 없이 추가하지 않는다.
- 별도 배포용 빌드가 없거나 TS 검사의 대상이 없으면 `NOT_APPLICABLE` 근거를 기록한다. 검사 개수 맞추기용 새 패키지/빌드 금지.

## P2-D — PC E2E 증거 범위 분리

- 격리: 승인 접수/거부, Controller→Writer 호출 계약, 결과 생성, 실패·복구·중복 효과 차단, 게시 승인 무결성.
- 운영: 기존 승인·유효 실행을 기준으로 실제 수집·계산·SQLite/checkpoint·D1/API/UI의 동일 대상 SHA/시각/버전을 대조한다. 기존 유효 Runtime 증거 재사용. 신규 공급자 호출·SQLite/D1 쓰기·PC 설치·게시·Runner·예약은 별도 승인 없이 금지.
- 운영이 필수인데 권한/승인에 막힌 정확한 경로만 `BLOCKED` 처리하고 독립 검증 계속.

## P2-E — 보안/의존성 최종 대조

- 본체: CodeQL, ESLint(변경 소스), Gitleaks, npm audit/lockfile 및 실제 Run·검사 범위.
- PC 제어: Oxlint, Gitleaks, Zizmor, 실행되는 JS 검사, 실제 manifest/lockfile. 무관한 npm audit 강제 금지.
- private CodeQL·Dependency Review 등 유료 기능은 권한/요금 확인 및 사용자 승인 없이는 활성화 금지. 기존 안전/보안 검사·SHA pin을 보존한다.

## 작업 및 완료 계약

관측→실패 조건→가설 구분 증거→최소 수정→실패 경로 회귀시험→필수 Actions PASS→정규 PR 병합→main readback. 다른 담당자의 브랜치·dirty 변경을 보존하고 무단 reset/rebase/force push/광역 add 금지. 격리 Windows `zgmini-handoff-ci-isolated`은 운영 PC가 아니며 Remote Desktop Commander 사용 금지.

최종 보고: 저장소별 8영역 판정표, 실제 신규 결함/수정, 각 Run ID·HEAD·테스트 결과, PR/병합 SHA와 최신 main, 구체적 미입증·BLOCKED, 다음 필수 행동. 전체 완료 = 필요한 영역 모두 `IMPLEMENTED` 또는 증거 기반 `NOT_APPLICABLE`; 나머지 상태는 미완료로 남긴다.

### R2 착수 체크포인트

- 기존 PC CI 개선 PR #3423, #3426, #3428, #3432, #3434는 병합 및 관련 CI 통과 증거 재사용. 문서 반영만으로 CI 적용/운영 완료를 주장하지 않는다.
- 착수 작업은 **P1-A 본체 브라우저 E2E의 실제 마지막 실행/결과 확인**. 확인한 유효 증거부터 기록하고 필요성이 증명되면 별도 최신 main 코드 수정으로 이어간다.


### R2 P1-A 실측 체크포인트 — 2026-11-25

- 본체 `.github/workflows/community-chat-browser.yml`의 `pull_request` 경로 필터 + 수동 `workflow_dispatch`를 확인. Chromium/Playwright/로컬 격리 fixture 및 일부 Production GET 읽기 경로가 혼재하며 **실운영 전 경로 E2E 증명과 구분**한다.
- GitHub Actions `Community Chat Browser UI (Mocked API)` 최신 관측 성공: [#45399088729](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45399088729) HEAD `2af8b9050bf64c6b3c6422c6639dc302e846f75d`, [#45399077303](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45399077303) HEAD `e27293bca2d59369c8876fbc6dc4decbb160a336`; 둘 다 `completed/success` (2026-11-24 UTC). 후자/전자 모두 CI job `ui` 실제 성공.
- #45399088729에서 18개 `Verify/Validate` 브라우저 검증 step 성공: W05/W06/W04/CNN 생산 API/UI **읽기**, 모바일 탭/터치, 웹 자산, 390/768/1440/1920 화면의 모의/격리 테스트 등을 확인. **본체 브라우저 E2E는 일부 필수 UI 경로 IMPLEMENTED, 시스템 전체 E2E는 PARTIAL**.
- 그보다 이른 [#45398118156](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45398118156) 실패 단계 `Verify CNN`은 관측됨. 이후 서로 다른 PR HEAD의 성공을 확인했으나 **해당 실패 HEAD의 수정/원인 및 현재 main 동일 동작까지 자동 입증하는 것은 아님**. 별도 실제 장애 증거가 없으면 동일 실패 재실행 금지.
- 이 조사 단계의 코드·운영·게시 변경 없음. 다음 작업 P1-B: 본체 및 PC 제어 Integration 경로별 기존 fixture/CI 연결과 실제 저장·API readback 증거 대조. 새 PR은 확인된 필수 누락이 있을 때만 생성한다.


### R2 P1-B Integration 1차 범위 확인 (2026-11-25)

- 본체 `node.js.yml`은 `tests/market-public-projection-store.test.mjs`, `tests/projection-writer-hotpath-r54.test.mjs` 등 Cloudflare/Projection 계약시험을 실제 Node.js CI에 포함. 소스 시험은 **모의 D1 `prepare/bind/first/run`**를 사용하므로 **Mock 계약 PASS**, 실 D1 write/readback이나 전 시스템 Integration PASS는 아님.
- PC 제어 `tests/employment-r6-controller-integration.test.mjs`는 임시 경로·합성 Runner/SQLite 파일로 Controller engine→Worker/Bundled source 실행을 검증; `tests/maintenance-route-integration.test.mjs`는 주입된 가짜 GitHub/updater로 승인 라우팅·중복 차단을 검증. 기존 C996 격리 CI에 두 시험 포함 (PR #3428). **검증 범위는 격리 Integration, 운영 PC 실행 아님**.
- W05 게시 `w05-publication-source-ci.yml`은 승인/게시 계약 시험을 수행 (PR #3434·Actions #45455117036 SUCCESS). 실제 D1 게시 완료와는 별개. 운영 수집→SQLite→계산→D1→Production API/UI의 단일 실측 연결은 기존 원장/승인 실행 증거를 별도로 대조해야 하며 현재 단계 `PARTIAL`.
- 이 1차 검토에서 새 코드 결함은 아직 입증되지 않았음. 기존 안전 검사/모의 시험을 제거하지 않고 다음으로 대상별 운영 원장·게시 readback의 기존 유효 증거를 찾아 범위를 한정한다. 운영 호출·쓰기 없음.


### R2 P1-B 운영 결과·계보 2차 대조 및 P2-C Type/Build 적합성 판정 (2026-11-25)

**Integration 운영 증거 (유효 실측과 한계 분리)**

- W04 운영 수집 B 원본 [#3404](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3404), Actions [#45441655199](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45441655199): 수집 작업 자체 `R6_B_SUCCESS/R6_DOL_MANUAL_COLLECTED`; 결과 JSON/TXT GitHub 업로드 `RESULT_PAIR_REF_CONFLICT_UNTOUCHED 0/2`로 실패. **동일 B 효과 재실행 금지, 보고 완료로 변경 금지**.
- 운영 독립 A 읽기 [#3408](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3408), [Run #45443484534](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45443484534): `PASS/R6_DOL_BED_STORED_EVIDENCE_READONLY`, 실제 SQLite readback, National 4 계열·State 51지역 600개 완전 주 기록; providerCalls/operationalWrites/d1Writes=0. **로컬 저장·조회 특정 범위 PASS**, 원 PDF SHA/PIT/D1 쓰기 검증이 아님.
- #3404의 2026-11-25 공식 ETA538 결과 대조 댓글: 공식 4개 국가 지표 (신규 203000/4주 평균 197750, 계속 1763000/피보험률 1.1%)가 공개 `/api/employment-r6/observations` 및 1440/390 하이드레이션 화면의 관측값과 일치했다는 독립 기록. 이는 **해당 공개 snapshot의 값 비교 증거**이며, 동일 B 요청에서 D1 게시까지 이어진 단일 거래 증거가 아니다.
- PDF SHA·National4 원문 개별 hash 연결 감사 [#3414](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3414)는 OPEN/미입증. #3414 마지막 댓글에 따르면 별도 원자적 접수 #3435 후에도 GitHub PC Job workflow Run 미등록; 주석 변경 PR #3433은 복구 효과 없음. 이는 **운영 자동화 진입 문제로, GitHub CI 회귀시험 실패와 구분**한다. 동일 Issue 재라벨·고유 A 반복 발행·운영 보호 우회 금지.
- 정규 자동 `RELEASE` Collector와 수동 ETA538 `ONE_YEAR` 경로는 다르므로 수동 성공을 후속 정규 자동 갱신의 성공으로 확장하지 않는다. 전체 수집→저장→계산→D1→API/UI 동일 주기 연결은 여전히 `PARTIAL/미입증`. 기능 소유자/공통 자동화 Owner의 기존 증거가 생길 때 그 정확한 효과만 재판정한다.

**PC 제어 Type/Build 기술적 적용성**

- 최신 main Git tree `recursive=1` 전수 응답 `truncated=false`, **4925개 파일**, JS/CJS/MJS 807개, `.test.mjs` 390개, `.ts/.tsx/.mts/.cts` **0개**, `package.json/package-lock.json/pnpm-lock.yaml/tsconfig.json` **0개**. 루트 및 Controller/Tools/Tests에서도 TS 없음.
- 따라서 현재 언어 구조에서 본체의 `tsc --noEmit`을 PC에 복사하는 **TypeScript-specific Type Check는 `NOT_APPLICABLE`**. 이는 JS의 정적 분석·계약 오류 전체가 없음을 뜻하지 않음. 현행 Oxlint의 변경 JS 정적 검사, 해당 범위 `node --check`, JSDoc/계약·회귀시험은 기존 안전 범위로 유지. 추가 `checkJs`는 구체적 미탐지 결함 증거 없이 도입하지 않는다.
- 루트 package manager/앱 빌드 명세가 없고 Controller/Writer는 승인된 개별 source·selective install, CAS·manifest hash·transitive import closure가 배포 계약. 웹 방식 `npm ci && npm run build` **PC 전체에 `NOT_APPLICABLE`**. 반면 **선택 소스 묶음 무결성·설치 closure는 기존 회귀/manifest 검사로 검증**되며 Runtime 실제 설치 성공과 구분한다.
- **영향:** R2 P2-C 판단 조사 완료; 새로운 build/tsconfig/패키지/Workflow/Runner 만들지 않음. Type/Build `NOT_APPLICABLE`의 범위는 웹 방식 검사에 한하며 소스 검증·운영 설치 무결성 의무를 없애지 않음.

**다음 필수 작업:** P2-D 기존 유효 PC E2E 실행·결과 원장과 Cloudflare/D1/API/UI의 동일 키·시각·버전 대조. P2-E 기존 CodeQL/Gitleaks/Oxlint/Zizmor/npm audit 실행 결과 및 라이선스/비용 정책 최신 evidence 정리. 소스 오류가 독립적으로 재현되면 최신 main 기점 분리 브랜치에서 최소 수정·CI·PR; 그 전에는 운영 변경·새 CI를 하지 않는다.


### R2 P2-E 기존 보안/의존성 실측 재확인 (2026-11-25)

- 본체 `main@8410a857d2d8cd47beae811152a676c6eee07a75`에서 **Node.js CI #45448912690 SUCCESS** (`npm ci`, Build, `tsc --noEmit`, 회귀시험, 변경 소스 ESLint, `npm audit --omit=dev --audit-level=high` 포함), **CodeQL #45448912575 SUCCESS**, **Secret Scan #45448912664 SUCCESS**. 일치 SHA 검증. ESLint는 변경 소스 범위, npm audit은 현행 임계/프로덕션 범위이지 무취약점 보장 아님.
- PC 제어 PR #3434 HEAD `57343f59832ac33a8327985586ab6c8150ddb98e` 기준 **C996 #45455116728 SUCCESS** (`node --test` + changed GitHub Actions에 대한 Zizmor), **Secret Scan #45455117121 SUCCESS** (Gitleaks history + changed JS Oxlint), **W05 Publication Source #45455117036 SUCCESS**. #3434는 main 병합 `b299f95940975cbaadde9ccb99d4588dabaf4526`, 다만 검사 HEAD와 병합 SHA의 구분을 유지.
- PC tree `truncated=false`, npm/lockfile 없음. PC에 본체 `npm audit` 재사용 불가. 유료 private CodeQL/Dependency Review 기능은 권한·요금/사용자 승인 없이 적용하지 않음. 기존 소스 CI 보안 검사로 검증되는 범위만 `IMPLEMENTED`, 전체 무취약·운영 설치 무결성으로 확대하지 않음.
- 이 단계에서 새 보안 미탐지 결함은 재현되지 않았으며 신규 도구·유료 서비스·Workflow·운영 변경 없음. P2-E 범위 현황 조사는 완료, 미입증은 GitHub private 유료 기능 활성 상태와 운영 전 구간 E2E 별도 증거.


### R2 P2-D 운영 E2E 결과쌍·배포 계보 대조 (2026-11-25)

**실제 운영 A 원본 JSON/TXT 계보 대조 — 기능별 효과를 분리**

1. W04 고용 29지표의 한 키는 PC readback [#3390](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3390) / [Run #45435347832](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/45435347832) / 저장 JSON `results/45435347832-1-seat-3.json` 에서 `status=PASS,code=R6_D1_LOCAL_MATCHED`. `key=detail:employment-r6:one-year:v1`, `d1BodyHash=localResultHash=4b5f4807a78a9ed4d1856988b3e8c074c5a25e82d360e81f95d947efb435d996`, `matchedToLocal=true`, `d1StoredAt=1795536461679`, `sourceStoredAt=1795536201789`, `asOfDate=2026-11-24`, `sourceFeatures=29`, `chartReadyFeatures=22`, `methodologyVersion=EMP-R6-FORMULA-R2-CPS-2025-10`, `formulaHash=sha256:04486846cd6063452d1c764116d3a31209f074d23a8764bf5b6ec8467095210e`. 실제 `providerCalls=0,d1Writes=0,operationalWrites=0`, 이 검사 자체 `sqliteOpened=false`. **W04 한 키의 PC 로컬 결과 ↔ D1 내용 일치 PASS**; 같은 단일 A에서 SQLite→계산→게시 전체를 실행한 증거가 아님.
2. [#3408](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3408) / Run #45443484534 / `results/45443484534-1-seat-2.json` 의 `status=PASS,code=R6_DOL_BED_STORED_EVIDENCE_READONLY,sqliteOpened=true`는 별도 실행의 실제 SQLite National4/State51 저장 자료 조회 PASS. 위 #3390과 별도 requestId/실행시각·대상 검사이므로 두 결과를 하나의 원자적 E2E 거래로 합치지 않는다.
3. #3404의 공식 DOL 4개 지표 ↔ `/api/employment-r6/observations` ↔ 1440px/390px 하이드레이션·차트 마지막 점 비교는 해당 공개 값 확인으로 재사용. 그러나 정확한 #3390 D1 본문 버전이 동일 시각 Production UI 응답과 같은 바이트임을 증명하는 독립 snapshot ID/readback은 현재 미확보. **W04 전체 E2E는 PARTIAL.**
4. W05 5키 [#3282](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3282) / Run #45365308133 / `results/45365308133-1-seat-3.json` 의 `keysChecked=5,structuralMatches=5`, 각 키 `STRUCTURAL_MATCH_NOT_RUNTIME_PROOF`. 최종 `STATE_UNKNOWN/W05_FIVE_KEY_STRUCTURAL_ONLY_DEPLOYMENT_UNVERIFIED`(ownerAuthorizationVerified/runtimeVerified 미확인). 이를 5키 실제 배포 E2E PASS로 간주하지 않는다.
5. Cloudflare 독립 A [#3306](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3306) / Run #45373166159 은 `PASS/CF_ACTIVE_DEPLOYMENT_READONLY_VERIFIED`, 도메인/활성 배포·Version 판독 성공이나 `sourceShaVerified=false`. 후속 [#3327](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/3327) / Run #45400413554는 새로운 실제 활성 Version을 관측하며 `expectedBuildVersionActive=false,sourceShaVerified=false`. 특정 시각 배포 식별 PASS와 요청 소스/전체 D1·UI Runtime 판정을 구분한다. 기존 유효 결과 재사용, 새 배포·조회 예약 금지.

**P2-D 결론:** 기존 승인 A 읽기만으로 (1) W04 한 키 로컬↔D1 해시 일치, (2) 별도 운영 SQLite National4/State51 저장 조회, (3) 공개 API/UI 일부 값 비교, (4) Cloudflare 활성 배포 확인까지 좁은 경로별 PASS. 하지만 전 구간 **동일 실행/스냅샷/버전의 수집→계산→D1→API→화면 계보는 미입증**이며, #3404 보고쌍 conflict·#3414 PDF 원본 감사·PC Job 진입 장애도 별도. 추가 A/B 호출·운영 변경 없이 기록하며 공통 자동화 담당의 정상 입구/기능 담당의 기존 원장 증거가 개선될 때만 해당 구간 재판정.
