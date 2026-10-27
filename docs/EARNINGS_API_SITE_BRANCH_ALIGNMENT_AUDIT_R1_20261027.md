# ZGMINI 실적 침체 참고지표 — 전용 브랜치 회수 및 계획 이탈 점검 R1

- 기준일: 2026-10-27 KST
- 저장소: `ansqhd5774-Choi/zgmini`
- **유일한 후속 개발 브랜치:** `codex/api-site-integration-r1-20261026`
- 역사적 작업계획·PC 증거 출처(추가 개발 금지): `codex/earnings-api-site-integration-plan-r1-20261026`
- 문서의 PASS는 각 단계에 명시한 근거 범위에만 해당한다. 브랜치 통합·코드 구현·PC 실측·D1 게시·실제 공개는 서로 다른 상태다.

## 1. 병합 및 선택적 회수 결과

1. `main`의 검증된 코드 상태를 전용 브랜치에 병합했다. 기존 전용 브랜치의 유일한 독자 커밋(`102ed15c`, 분석 지표 제목)은 이력으로 보존되고, 해당 제목은 `main`에도 이미 존재한다. 병합 커밋 `61b48dae4c95d185f2abf0da7469ce4768058148`.
2. 역사적 계획 브랜치의 관련 파일 46개를 **각 파일의 GitHub blob SHA**로 비교했다. 이 중 전용 브랜치에 없는 36개(계획·증거 문서 18, 조사 스크립트 6, PC 실행·검증 스크립트 12)를 비파괴적으로 회수했다. 회수 커밋 `b98adf937f624e13af8d685ffb2a16d94ed484a2`.
3. 나머지 9개 파일은 양쪽 blob SHA가 이미 같아 중복 변경하지 않았다.
4. `worker/candidate-r52.ts`는 내용이 다른 유일한 겹침 파일이다. **전용 브랜치의 최신 파일을 보존**했다. 전용본에는 BLS 공개 경로에 더해 `BEA_UNIT_ROUTE`가 있으나 역사적 계획 브랜치 버전에는 이 경로가 없다. 옛 파일로 덮어쓰면 기능 회귀가 발생한다.
5. 36개 회수 파일의 최종 blob SHA를 다시 대조해 **36/36 일치**를 확인했다. 이 검증은 GitHub 파일 무결성이며 Windows PC 실행이나 전체 빌드 PASS를 뜻하지 않는다.
6. 이전 임시 브랜치 3개는 해당 PR이 이미 `main`에 병합됐으나 **GitHub 삭제 권한/인증 제약으로 아직 삭제되지 않았다**. 전용 브랜치·다른 작업자 브랜치에 대한 삭제는 하지 않는다.

### 병합 이력 최종 마감(2026-10-27)

- 원래 계획 브랜치 `codex/earnings-api-site-integration-plan-r1-20261026`: 비파괴적 자료 회수 후 병합 커밋 `3c79cc420eea98d742c3fb738a7c85639bfa12d1`에서 부모 이력으로 연결했다. 이미 최신인 `worker/candidate-r52.ts`는 보존했다.
- 관련 임시 BEA 작업 브랜치 3개(`codex/earnings-bea-unit-profit-r1-20261027`, `codex/earnings-bea-unit-profit-cmd-diag-r2-20261027`, `codex/earnings-unit-portable-preflight-r3-20261027`): 공통 파일을 검사하고 현재 R3 preflight가 동일 SHA임을 확인한 뒤 병합 커밋 `9ac5056438d64aa0b6b8af7d9563a238a51b7220`으로 부모 이력을 연결했다.
- 병합 전후 **Git tree SHA `3950cf04ed68733bdae85160e1f57c2592a7efbe` 동일**. 이는 이력 정리 과정에 코드·문서 덮어쓰기 또는 파일 삭제가 없었다는 의미이며, 새 실행 검증을 의미하지 않는다.
- GitHub 비교 결과 네 과거 브랜치 모두 전용 브랜치에 대한 `behind_by=0`, `status=ahead`로 **커밋 이력까지 병합 확인**했다. 원본 브랜치는 사용자가 직접 삭제할 예정이므로 삭제하지 않았다.
- 추가 범위 점검에서 같은 프로젝트의 R4 C/BLS 및 BEA S6 관련 브랜치 5개를 확인했다. 이 중 `codex/earnings-r4-c-d1-dual-source-20261027`은 이미 병합 상태(`behind_by=0`)였으며, 나머지 4개는 **이력 연결 전 미병합 커밋**이 있었다.
- 추가 병합 커밋 `728ff6e05e156d18ab69f87d9803e59ad7819a66`에서 `codex/earnings-bea-s6-inline-20261027`, `codex/earnings-r4-c-public-reader-20261027`, `codex/earnings-r4c-inline-existing-table-20261027`, `feat/earnings-r4-c-companion-ui-20261027`을 부모 이력에 반영했다. 최종 트리 SHA는 병합 직전과 동일한 `aa63b04cc750550b485b68c7355c3d6180f12fb4`여서 현재 화면·Worker·실행 파일은 유지됐다.
- **최종 범위 9개 브랜치 전부** 전용 브랜치 대비 `behind_by=0`, `status=ahead`임을 GitHub Compare로 재확인했다. 이 검증 범위는 API/사이트 연결·R4 C·BEA S6이며, 별도 E1-R5 Shadow 및 과거 독립 과제 브랜치 전체를 일괄 병합한 것이 아니다.
- 사용자 지시에 따라 원본 브랜치 삭제는 실행하지 않았다. 단순한 이력 연결은 R1~R6 개발단계 최종 PASS·운영 배포 완료를 뜻하지 않는다.
- 이 문서 최종 갱신 자체는 위 병합 커밋 이후 전용 브랜치에 기록한다. 이후 작업 보고에서는 항상 실제 최신 HEAD를 기재한다.

## 2. 최초 계획과 현재 구현의 단계별 비교

기준 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`.

| 단계 | 원래 종료 조건 | 확인한 진행 수준 | 차이 / 후속 Gate |
| --- | --- | --- | --- |
| R1 기존 소스 인벤토리 | PC 경로·운영 SHA·중복 원장·기존 API 인벤토리 | **증거 문서 회수** | 실행 당시 PC 증거와 현재 운영 SHA는 구분. 추가 중복 수집 금지 |
| R2 소스/권리/실데이터 확인 | BEA/BLS/Census/SEC의 개별 권한·시계열·실제 응답 확인 | **일부 확인, 후순위 소스 미완** | BLS 3종과 기존 BEA 우선, Census/SEC 자료 미확보를 전체 PASS로 표시 금지 |
| R3 PC 원자료 저장/계산 | 원문 저장, hash·vintage·lineage, 기존 점수 불변 | **BLS 3종 저장·계산 실측 PASS 근거 회수; BEA 단위이익은 dry-run만 PASS** | BLS 원자료 저장기는 회수했으므로 재수집 전 중복 검토. BEA D1 게시 전 원천 검증 필요 |
| R4 정보성 C D1 read-model | 승인 별도 키, PC 저장값에서 생성, D1 readback | **원천/reader/writer 소스 및 로컬 검증 근거 존재** | 원격 D1 최신 readback은 이번 점검에서 확인하지 않았음. PC read-only PASS를 게시 PASS로 확대 금지 |
| R5 사이트 UI | 점수 4개 불변 + C 정보성 목록 별도 영역, 동적 registry, 디자인 확인 | **BLS 5개와 BEA 참고지표를 기존 분석 테이블에 추가하는 방식으로 구현** | 당초 별도 영역·동적 registry 제안과 불일치. 5개 BLS 행은 3개 원천에서 파생돼 독립 증거 5개가 아님 |
| R6 전체 검증/운영 | PC→D1→GET→UI, 빌드/런타임 검증 분리, 별도 승인 후 main 반영 | **일부 소스·테스트·PR·웹 반영 선행** | 특히 BEA 단위이익은 `D1_WRITES=0`, `PASS_BEA_UNIT_PREFLIGHT_ONLY`이므로 운영 게시 완료 아님 |

### 이탈 수준을 숫자로 표현할 때의 경계

- **파일 관리 분산:** 대조한 46개 역사적 관련 파일 중 36개가 전용 브랜치에서 누락돼 있었음(36/46, **78.3%**). 현재 36개를 회수해 이 범위의 파일 결손 **0개**. **이는 기능 진척률이나 산식 정확도 점수가 아니다.**
- **단계별 이행:** 6단계 중 R1 증거 정리 및 R3의 BLS 일부 실측이 확인된다. R2 범위 전체·R4 원격 readback·R5 설계 일치·R6 최종 운영까지 6/6 PASS는 아니다. 미검증 항목을 임의의 완료 백분율로 환산하지 않는다.
- **설계 이탈:** (상) 전용 브랜치 외 이력 분산/선후행 Gate 역전, (중) 기존 테이블 혼합 및 registry 대신 고정 배열, (확인 필요) BEA 공급 경로의 원출처 우선 원칙 일치.

## 3. 데이터·UI 계약에서 특히 주의할 사항

1. **목적:** 경기 및 기업의 실적 침체 징후를 이해하는 정보성 참고지표를 검증된 만큼 계속 확장하는 것. 행 수 4·11·20 등 상한을 새로 만들지 않는다.
2. **불변:** E1-R4 실적 침체 점수의 네 계산 요소, 가중치·정규화·결측 처리·과거 이력, `/api/earnings-recession-detail`, E1-R5 Shadow 및 별도 12대 실적 영역을 혼합하거나 재계산하지 않는다.
3. **BLS:** `WPSFD4`, `WPSFD41`, `PRS85006111`의 실제 3개 원천이 정보성 5개 화면 행으로 파생된 구조다. 동일 시계열의 지수와 YoY를 중복 독립 증거로 세지 않는다.
4. **BEA:** 최근 단위이익 수집기의 근거는 BEA 원천이 아닌 FRED `fredgraph.csv`의 `A463RD3Q052SBEA` 배포 시계열이다. 최초 계획은 FRED **API**의 재이용·제3자 권리 불확실성을 들어 직접 공급원에서 제외하고 BEA 원천 공식 API 우선을 요구했다. CSV와 FRED API는 동일 경로가 아니므로 금지 위반이라고 단정하지 말고, BEA 값 정의·개정·라이선스·원본 직접수집 가능 여부를 별도 검증한다.
5. **화면:** 현재 BEA 단위이익의 정보성 행은 원래 4개 점수/기존 BLS 정보성 행과 같은 테이블 계열에 추가됐다. 이는 계획서의 C 정보성 별도 영역 설계와 다르다. 사용자 UI 승인 없이 대규모 구조 변경을 하지 않는다.
6. **관측/게시:** 2026-10-27 BEA 단위이익 PC preflight 제출 로그 `PASS_BEA_UNIT_PREFLIGHT_ONLY`는 현재값 0.250, 직전 0.231, D1 쓰기 0, PC SQLite 쓰기 0이다. D1 readback 및 HTTP READY의 증거가 아니다.

## 4. 복귀 순서와 금지 조치

1. 이후 모든 GitHub 작업은 `codex/api-site-integration-r1-20261026`에서만 수행한다. 작업 보고서에는 저장소, 해당 브랜치, 작업 전/후 SHA, 변경 파일, 미완료 Gate를 명시한다.
2. R1~R4의 기존 유효 PC 결과를 재사용하고, 소스 변경이나 별도 새 관측 없으면 BLS 수집기를 무조건 재실행하지 않는다.
3. 최신 운영 SHA/저장 key/Worker route와 분기별 freshness를 확인한 뒤, BLS 및 BEA readback 상태를 **각각** 확인한다. 공개 연결 전 실제 D1 읽기·쓰기 Evidence를 분리한다.
4. 새 행 편입 시 권리·실측·원장·D1·UI를 단계별로 검증하고, 동적 registry·정보성 영역/점수 영역 분리 여부는 사용자 디자인 승인으로 확정한다.
5. 다른 작업 브랜치 전체의 `main` 병합, 강제 리셋, 기존 이력 삭제, E: 운영 원장·D1·스케줄러 변경, 승인 없는 Production 재배포를 하지 않는다.
6. 임시 브랜치 삭제는 원본 커밋·대체 경로를 확인하고 GitHub 인증 가능한 권한 경로가 확보될 때 정확한 이름으로 수행한다. 삭제 자체를 병합 완료로 대체하거나 허위 완료 보고하지 않는다.

## 5. 근거

- 최초 6단계 계획: `docs/EARNINGS_RECESSION_COMPANION_API_SITE_INTEGRATION_PLAN_R1_20261026.md`
- PC BLS 저장 확인: `docs/EARNINGS_COMPANION_R3C_BLS_MANUAL_STORE_IMPLEMENTATION_20261027.md`
- PC 분석값 확인: `docs/EARNINGS_COMPANION_R4_PC_RESULT_VERIFIED_20261027.md`
- R4 D1 코드/승인 경계: `docs/EARNINGS_COMPANION_R4_D1_PUBLIC_READ_MODEL_PHASE2_20261027.md`
- 본 프로젝트 BEA 단위이익 제출 로그: `EARNINGS_BEA_UNIT_PROFIT_R1_RESULT_20261027-112425Z.txt`
- BEA 공개 자료권: https://www.bea.gov/help/faq/147
- FRED 이용조건: https://fred.stlouisfed.org/docs/api/terms_of_use.html

**현 상태:** GitHub 전용 브랜치에 원래 계획과 누락된 자료를 회수한 상태. 별도 PC 게시·D1 수정·사이트 배포는 이 회수 커밋에서 실행하지 않았다.
