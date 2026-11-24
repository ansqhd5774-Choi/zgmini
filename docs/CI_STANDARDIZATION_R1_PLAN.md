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
