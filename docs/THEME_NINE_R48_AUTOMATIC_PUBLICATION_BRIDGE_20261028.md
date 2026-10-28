# 테마 공탐 기존 9개 R48 — PC 정기 실행·R47 결과/R37 공개 연결

- 기준일: 2026-10-28
- 전용 브랜치: `codex/theme-fear-greed-integration-20261025` (별도 브랜치 생성·이동 없음)
- 승인 계산: 10번째 우주·위성에서 재사용한 기존 적응형 R2/R25 + 다중 ETF R32. **수정 없음**.
- 승인 로스터: R20 ETF 고유 63개, 테마 내 편입 64자리. **수정 없음**.
- 현재 상태: **R48 변환/비공개 후보 저장/분리형 D1 CAS/작업등록 코드와 단위 검증 PASS**. 운영 PC 작업 등록, 실제 D1 쓰기, Cloudflare 공개 전환은 **아직 미실행**.

## 새 코드와 역할

| 파일 | 기능과 범위 |
| --- | --- |
| `scripts/pc-writer/theme-nine-r48-r47-bridge.mjs` | PC R47의 원본 ETF/NINE JSON *바이트*와 승인 로스터/AUM 원본 바이트 일치·원래 AUM 날짜·9×252일 전부 검증, R37 전용 **비공개 후보** 생성. 승인 플래그 6개 `false` 유지 |
| `scripts/pc-writer/theme-nine-r48-stage-current.mjs` | `E:\ZGmini\data\themes\legacy-nine-r47-private`의 최신 정상 파일 쌍을 확인하고 `legacy-nine-r48-private-candidate`에 새로운 JSON으로 SHA/멱등 저장. D1/게시 0 |
| `scripts/pc-writer/THEME_NINE_R48_PRIVATE_CYCLE.cmd` | R47 증분 수집→R25/R32 사설 결과→R48 비공개 후보 저장을 **한 번의 정상 실행**으로 연결. 각각 오류 시 즉시 중단하고 별도 로그에 실패 상태 기록. D1 쓰기·공개 전환 없음 |
| `scripts/pc-writer/theme-nine-r48-private-schedule.mjs` | **사용자가 PC에서 명시적으로 `--install` 실행할 경우에만** 기존 작업을 건드리지 않는 신규 단독 작업 `ZGMINI-PC-Theme-Nine-R47-Private`를 매일 한국시간 11:30, 로그인 사용자 세션에서 등록. 실행 작업은 `THEME_NINE_R48_PRIVATE_CYCLE.cmd`. `IgnoreNew` 중복 실행 차단, 기존 작업 발견 시 덮어쓰지 않고 STOP/보존. `--inspect`는 조회만 수행 |
| `scripts/pc-writer/theme-nine-r48-d1-publication.mjs` | 기존 Cloudflare D1 adapter와 실시간 공개 기준선을 전달받아 승인 자격을 검사한 뒤, `theme-legacy-nine-r37/current` **전용 키만** CAS 한 건 쓰기·정확한 readback. 기존 10개 원장·과거 이력·같은 날짜 점수 수정 거부 |
| `worker/theme-nine-r37-public.mjs` | 원래 R32 source contract 외에 **서로 다른 R47 private source contract**를 명시적으로 허용, 원래 baseline/증분 manifest SHA 추가 확인. 권리·가격정합·원본 재현 등 나머지 게이트는 약화하지 않음 |

기존 `R47` 수집 CMD는 현재까지 검증한 그대로 유지한다. 정기 실행 등록/검증이 끝나기 전 기존 정상 Core·Korea·Iran·ETF 작업 실행 행동을 변경하지 않는다.

## 실제 PC 연결 절차

1. PC에 현재 승인된 `THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd` 및 R48 새 `.cmd`·`.mjs` 3개가 같은 디렉터리에 있는지 확인한다. 1차 실PC 실행은 이미 완료되었으며, 매번 재증명하기 위해 원자료 전체를 다시 다운로드하지 않는다.
2. `node scripts/pc-writer/theme-nine-r48-private-schedule.mjs --inspect`로 KST/기존 작업 존재 여부를 조회한다.
3. 사용자가 정기 실행을 실제 승인하여 실행할 때 `node scripts/pc-writer/theme-nine-r48-private-schedule.mjs --install`을 **PC의 CMD**에서 한 번만 실행한다. 기존 작업과 동일한 이름이 있으면 자동 덮어쓰지 않는다. PC 관리자 권한/실행 환경 문제가 있으면 실패 내용을 그대로 보고한다.
4. 생성된 예약 작업은 R47 원자료/산식 실행이 정상 종료하면 R48 비공개 후보 저장까지 자동 진행한다. 수동 검증은 `node scripts/pc-writer/theme-nine-r48-stage-current.mjs --stage-private`로 별도 수행할 수 있다. 실제 D1 게시 프로그램에 이 후보를 **그대로 투입하면 실패**하게 설계되어 있다. 승인 플래그는 권리·원자료·가격정합·날짜 증거를 확보한 이후의 승인된 PC 운영 프로세스에서만 구성할 수 있다.
5. 별도 D1 실행기가 실제 공개 기준선, 게시 승인 증거와 기존 PC Cloudflare 인증을 연결해 R48 CAS 함수를 호출해야 한다. 그 이후 `D1 query/readback → R37 API 합성 → 10개 테마 순서/선택 8개 점수 확인 → Cloudflare exact deployment`를 순서대로 검증한다.

**주의:** 3번 설치는 사용자 PC에서 실행해야 하며 이 채팅에서 등록된 것으로 취급하지 않는다. 예약 등록 후에는 R47→R48 비공개 후보 저장까지 자동 호출되지만, D1 쓰기/사이트 배포는 별개다. 이 셋을 한 번에 완료한 것으로 기록하지 않는다.

## 공개·권리·가격 Gate

- 공급원 GetMarketHistory의 2026-10-19 시행 약관 §5는 원시장봉의 대량 재배포를 금지하면서, 원봉을 대량 역복원할 수 없는 신호·지표·모델·차트 등 파생 저작물의 배포를 허용한다. 공식 원문: https://getmarkethistory.com/docs/terms/ . **이 조항만으로 사용자 계정 상태·개별 9테마 결과·하위 시장 원자료 계약까지 모두 자동 확인됐다고 판단하지 않는다.**
- R47 가격 모드는 계속 `RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE`; 공식 종가라고 표기하지 않는다. R26 AUM의 연구용 상태와 원래 관측 날짜는 보존한다.
- `upstreamCommercialRightsVerified`, `derivedLicenseVerified`, `sourcePriceReconciled`, `sourceManifestVerified`, `privateReplayVerified`, `publicationAuthorized`는 실제 승인 증거 없이 true로 임의 지정하지 않는다.
- R37 reader는 기존 공개 기준선과 **동일한 확인 거래일·phase**를 요구하고, 그 조건이 깨지면 기존 공개 10개를 그대로 제공한다. 구버전 7개/10개 이력은 덮어쓰지 않는다.
- 미공개 AI·반도체는 9개 연구 산출물에 포함되어 있어도 자동으로 11번째 공개 테마를 신설하지 않는다.
- PC 작업 등록, 실 D1 저장/조회, GitHub main 선택 반영, Cloudflare 빌드/배포, 실제 공개 화면 검증은 각각 별도 확인 대상이다.

## 이번 로컬 테스트

`node --test tests/theme-nine-r48-*.test.mjs tests/theme-nine-r37-public-reader.test.mjs tests/theme-nine-r47-recurring-private-refresh.test.mjs tests/theme-nine-r47-private-score.test.mjs tests/theme-nine-r47-recurring-bundle.test.mjs`

- **7 파일 PASS, 실패 0**.
- 사용자가 업로드한 R47 2026-10-26 실제 원본 ETF/NINE 파일을 사용한 R48 변환: **9테마, 2,268 점수, 모든 공개 승인 플래그 false**.
- 업로드 두 JSON을 원본 그대로 일시적인 test directory에 복사하여 `stageCurrentNineR48()` 실제 파일 SHA/출력 저장 시험: PASS. 테스트 임시 파일만 제거, 사용자 PC·D1 수정 없음.
- 과거 R37 fixture 의존 테스트 `tests/theme-nine-r37-bridge.test.mjs`는 로컬 `zgmini/upload/THEME_NINE_R32_PRIVATE_SHADOW_18279_2554.json` 부재로 이번 테스트 묶음에서 실행 불가. 이번 R48 새 코드 실패가 아니다.

## 다음 미완료 단계

1. **PC**: 설치된 실제 R47 CMD 위치를 확인하여 예약 등록·다음 정규 실행 증거 확보 (PC 직접 접근은 이 채팅에서 불가).
2. **D1**: 기존 공개 기준선의 현재 거래일과 R47 실제 거래일 비교, 가격 정합·개별 공급자/계정 권리·AUM 게시 승인/원가격 독립 재현 근거, `READY` 레코드의 별도 승인 프로세스 구성.
3. **Public**: 분리 D1 키 최초 게시와 CAS/readback, 현재 `main`의 R37 reader 선택 수정분만 선별 반영, Cloudflare Git 통합 기준 exact 배포/실운영 검증.

**소스 작성 및 로컬 검증을 실제 사이트 게시 완료로 보고하지 않는다.**
