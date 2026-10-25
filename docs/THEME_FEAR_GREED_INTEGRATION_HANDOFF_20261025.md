# 테마 공포·탐욕 통합 개발 브랜치 — 작업 원장 / 인수인계

- 작성일: 2026-10-25
- 저장소: `ansqhd5774-Choi/zgmini`
- 통합 브랜치: `codex/theme-fear-greed-integration-20261025`
- 생성 기준 최신 main SHA: `f9312d5069754dc82b4d5a93cc7712dbdac4b640`
- 상태: `SELECTIVE_PRIVATE_SOURCE_RECOVERED / FIXTURE_TEST_PASS / PC_SPY_EVIDENCE_PENDING / NOT_MERGED / NO_RUNTIME_CHANGE`
- 저장소 `delete_branch_on_merge=false` 확인(2026-10-25). 병합 완료 후에도 작업 브랜치를 **보존**한다.
- 본 문서는 읽기 전용 감사에 근거한 인수인계다. 설치·PC 데이터 변경·D1 게시·main 병합의 증거가 아니다.

## 목적과 작업 지속성

기존 9개 테마, 10번째 데이터센터·전력, 신규 우주·위성 후보를 동일한 **테마 공탐 작업 원장**에서 관리한다. 채팅이 바뀌어도 기준/완료 SHA/검증 증거/남은 작업을 추적한다. 운영 중인 기존 9개 테마의 계산·원자료·게시·스케줄러를 변경하지 않는다.

완료 흐름: `통합 브랜치에서 최소 변경 → 테스트·PC 독립 검증 → PR → main 병합 → 브랜치 보존 → 원장 갱신`.

## 2026-10-25 GitHub 읽기 전용 감사 결과

### main이 이미 포함한 승인 기준

1. `AGENTS.md`: 최신 main 우선, 마이그레이션/분석 브랜치 전체 병합 금지, 필요한 파일만 선택적으로 회수.
2. `config/theme-data-registry.json`: 기존 7개 legacy 파이프라인이 `SPY`를 기준 자산으로 등록. raw manifest 미등록 항목은 존재/재사용을 단정할 수 없다.
3. `lib/market-score/theme-etf-provisional-score.mjs`: 7개 테마의 R158 기준 종목 `['SPY','BOTZ','ROBO','SKYY','CLOU','DRIV','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG']` 및 기준가격 `SPY` 사용.
4. `docs/THEME_DATA_OPERATIONS.md`: 독립 manifest / 원본 SHA256 / 가격모드 / 관측일 / 권리검증. 다른 테마의 SPY를 공유하는 경우 **공유 원본을 별도 등록하고 승인된 어댑터로 참조**하도록 규정. 점수 역산/무근거 단순 복사 금지.
5. `docs/THEME_ETF_ADAPTIVE_OR_R2_20261025.md`: 사용자 승인 `WORK_RULE_APPROVED / GITHUB_POLICY_ONLY`. 신규 선정은 기존 경로 **OR** 신규 혁신 경로, 40/377/628일 경계, R188 축 T40/R20/V40, 장기/단기 70:30→50:50, 1년 252거래일 표시. 기존 9개는 재선정·재계산하지 않음.

### 관련 작업 브랜치 / 회수 분류

| 출처 브랜치 | 최신 main 대비 감사 시 | 회수 분류 |
| --- | --- | --- |
| `codex/theme-data-contract` | ahead 3 / behind 168 | 데이터 등록부·운영 문서는 main에 이미 존재하므로 동일 내용 중복 이식 금지; 변경점만 검토 |
| `codex/theme-fear-greed-r2-shadow-20261023` | ahead 24 / behind 191 | **미승인 실험**. AUM 비중 등 최신 10/25 승인 OR R2와 충돌할 수 있어 산식 전체 병합 금지; 무해한 진단 도구만 검토 |
| `codex/data-center-power-r1-20261024` | ahead 7 / behind 22 | 10번째 테마 private 검증·manifest·SPY 수집 방식의 작업 증거; 출시·스케줄러 변경 여부는 별도 gate |
| `codex/space-satellite-selection-r4-20261025` | ahead 23 / behind 2 | 우주·위성 40/377/628 적응형 후보 코드·R5 진단. 부분 회수 후보, R6 SPY 재수집은 보류 |

참고 PR: [#692](https://github.com/ansqhd5774-Choi/zgmini/pull/692) 데이터센터·전력 / [#711](https://github.com/ansqhd5774-Choi/zgmini/pull/711) 우주·위성.

### SPY 재수집 판단 오류

우주 R5가 기록한 `SPY=0`은 `E:/ZGmini/data/themes/space-satellite/raw-manifest.json`이라는 **우주 테마 한정 위치**의 값이다. PC 전체나 기존 9/10번째 테마의 SPY 원본이 없다는 증거가 아니다. R6의 NASA+SPY 신규 수집기는 **실행 중지 유지**한다.

10번째 데이터센터·전력 R4 PC 비공개 검증은 `DTCR/GRID/SPY` 원자료로 관측일 2026-10-23, 점수 12.32143을 산출한 기록이 있으나, **PC 실제 파일의 현재 존재·SHA·가격모드·권리**는 따로 확인해야 한다. 기존 원본을 동일 조건으로 참조할 수 있으면 새로운 SPY GET을 하지 않는다. 증거가 부족하면 `UNVERIFIED`로 남긴다.

## 실제 코드 통합 결과 (2026-10-25)

- `main` 직접 확인: `scripts/pc-writer/theme-data-center-power-r1.mjs` 및 `tests/theme-data-center-power-r1.test.mjs`는 이미 **동일 원본 SHA로 존재**. 중복 이식 대신 현재 `main` 소스를 계승한다. 기존 등록부·collector·reader의 최신 main 코드도 우선한다.
- 우주 브랜치 #711의 검증된 **비공개 신규 테마 계산 모듈** 3개와 테스트 2개를 파일별로 선택 이식했다.
  - `scripts/pc-writer/theme-optional-adaptive-r2.mjs`
  - `scripts/pc-writer/theme-optional-pair-weight-r3.mjs`
  - `scripts/pc-writer/theme-space-satellite-adaptive-r2.mjs`
  - `tests/theme-optional-adaptive-r2.test.mjs`, `tests/theme-optional-pair-weight-r3.test.mjs`
- 추가 구현: `scripts/pc-writer/theme-shared-spy-readonly-r1.mjs`. 기존 **데이터센터·전력 또는 AI/바이오**의 저장된 SPY manifest와 raw 파일을 SHA256·출처·가격 모드·시간 정렬·실제 bar 검증 후 **비공개 분석에서만** 참조한다. 가격 복사·신규 ETF GET·D1·스케줄러 쓰기 없음. source manifest/원본은 절대 수정하지 않는다.
- 우주 비공개 검산기는 인수 `sharedSpyThemeId:'data-center-power'`를 **명시했을 때만** SPY를 참조한다. 우주 폴더 자체 SPY와 중복되면 실패하며, 합성 700거래일의 원래 독립 SPY 점수/전체 이력과 0차이 검증. 기존 기본 인수 동작은 유지. 공유 SPY 조합의 `sourceVersion`은 두 manifest provenance가 포함된 별도 해시이며 권리·공개 승인 false.
- 새로운 테스트 `tests/theme-shared-spy-readonly-r1.test.mjs`과 기존 R2 테스트 확장. 로컬 Node v24에서 `node --test tests/theme-optional-adaptive-r2.test.mjs tests/theme-optional-pair-weight-r3.test.mjs tests/theme-shared-spy-readonly-r1.test.mjs` **3개 테스트 파일 PASS**. 이것은 **합성 fixture 결과**이며 실제 사용자 PC SPY 유효성/권리/운영 PASS가 아니다.
- 다음 **사용자 CMD 요청**: 브랜치 `scripts/pc-writer/theme-shared-spy-r1-audit.cmd`를 Desktop에 저장해 실행. 기존 `E:\\ZGmini\\data\\themes\\data-center-power\\raw-manifest.json`에서 SPY만 검사한다. Node 실행 환경이 없거나 경로가 다르면 `BLOCKED` 보고, 경로를 추정하거나 원본을 재수집하지 않는다. 결과는 **동일 Desktop 폴더**의 `THEME_SPY_SHARED_R1_RESULT.txt`에 기록. CMD는 GitHub 고정 커밋 `614168b14b547977d335ce90097535a0932d80fc`의 검사 코드만 SHA256 `663d3414fc49231b93f7f42071d8b2e9d219e11f8e50385d63066790e2db6f1d` 검증 후 실행.
- **미완료:** 사용자 PC 실데이터 readback, NASА 가격/권리 검사, 우주 최종 선정, 공개 feed/D1, 기존 9개 runtime 비회귀 검사, CI 및 main 병합. 현재 PR [#714](https://github.com/ansqhd5774-Choi/zgmini/pull/714)은 Draft.

## 통합 실행 작업 순서 (미완료)

- [x] 기존 테마·10번째·우주 및 Shadow 브랜치 범위를 GitHub에서 비교
- [x] 최신 main 승인 기준/등록부/운영 문서 조사
- [x] 전용 통합 브랜치를 최신 main에서 생성
- [x] 통합 작업 원장에 근거 및 미완료 게이트 보존
- [x] 승인된 R2 비공개 계산기와 우주 후보 계산기·테스트 선택 이식
- [x] SPY 원본 공유 read-only 어댑터·테스트·Desktop CMD 제작 (fixture PASS, PC 미실행)
- [ ] 기존 7개 legacy, 8번째 AI, 9번째 바이오, 10번째 데이터센터의 SPY 원본 경로 및 재사용 증빙 표 작성 (우선 데이터센터 PC CMD read-only 검사 필요)
- [x] 기존 manifest SHA를 검사하는 공통 SPY read-only **비공개** 참조 어댑터 설계 및 fixture 테스트 (기존 데이터 변경 0); 운영 등록/승인은 미완료
- [ ] 우주 후보 NASA/기타 ETF 가격 확보 **전** 원본 reuse/rights 검증, NASA만 필요한지 결정
- [ ] 10/25 승인 OR R2와 비교하여 우주 브랜치의 필요한 구현만 선택적으로 이식하고 경계 테스트
- [ ] 기존 9개 결과와 PC 원본·D1·스케줄러 영향 0 검증; 신규 테마 실제 PC 결과 검증
- [ ] 최종 GitHub PR + CI/사용자 승인 gate 통과 후 **main 병합**
- [ ] 병합된 exact SHA 기록 및 **통합 브랜치 보존** 확인, 이후 새 작업을 같은 원장에 이어서 기록

## 절대 금지

- 이전 개발/분석 브랜치 **전체 일괄 병합**, 임의 산식/가중치/공급원/DB/스케줄러 변경.
- 미관측 데이터를 0이나 과거 점수로 채우거나 지연 자료를 오늘 관측으로 둔갑시키기.
- 원본 SHA·가격 모드 검증 전 SPY 재수집을 정당화하거나 재사용 성공으로 단정하기.
- PC 원본, 키, 개인정보를 GitHub에 올리기.
- 통합 브랜치의 검사 성공을 main 병합·Cloudflare 생산 배포 완료로 보고하기.

## 다음 대화 시작점

1. 이 브랜치의 **최신** 원장과 main SHA를 읽고 drift 확인.
2. 위 체크리스트 중 첫 미완료 단계부터 진행.
3. 각 단계에서 승인/실행/검증/실패를 나누어 갱신. 이전 성공 증거를 불필요하게 반복하지 않는다.
4. 사용자에게 CMD 실행이 필요한 경우에만 Windows CMD 파일 또는 정확한 명령과 저장 위치를 안내. 기존 데이터·운영 작업은 임의 초기화 금지.
