# 시장 캘린더 R11 — 승인된 순차 소스 전환

- 승인: 2026-10-27, 사용자 지시 `승인 하나쓱 차근차근 추가하면되`.
- 대상 작업 브랜치: `codex/zgmini-gpt-workspace-20261025`만 사용. 다른 작업 브랜치/`main` 자동 변경 금지.
- PC 승인 source의 역사적 R10 값: `ee41bb295200d248efc683841e0f1ba0bc4779ee`. 이후 운영 프로젝트에서 승인 source가 갱신되므로 해당 값을 현재 실행 SHA로 고정하지 않는다.
- 기준 parser blob: `f084e2a360b544257bb44a60b97875627c7ca371` (`lib/release-calendar.mjs`).
- 확대 최종 후보: 작업 브랜치 `lib/release-calendar.mjs` (BLS+BEA). **한꺼번에 운영 반영하지 않는다.**

## R11-1 — BLS만 우선 적용할 소스 후보

- 스테이징 파일: `staging/market-calendar/r11-bls/lib/release-calendar.mjs`.
- selective 통합 시 **승인 소스의 동일 경로** `lib/release-calendar.mjs`를 이 스테이징 내용으로 바꾸는 단일 파일 변경만 허용한다.
- `RELEASE_SOURCES` URL/형식 4개, Fed/Census 파서, BEA 기존 GDP/PCE 파서, 지표 mapping, 정책과 `recessionReleaseInfo`, JSON 이벤트의 5개 필드는 승인 source 그대로 유지한다.
- BLS의 정규 `Employment Situation` ID `employment` 유지. `Employment Situation of Veterans`의 구형 잘못된 `employment` 분류만 `bls-employment-situation-of-veterans`로 교정한다.
- BLS CPI·PPI·JOLTS 등 나머지 공식 일정의 ID는 제목 기반으로 결정하고, 일정 메타 이벤트·취소 일정은 제외한다.
- 소스별 `READY`·`checkedAt`, 6시간 collection attempt guard, 원본 저장, 실패 시 기존 이벤트 보존, 게시 가드는 변경하지 않는다.
- **현재 단계는 branch stage only:** 라이브 `lib/release-calendar.mjs`, PC 설정, 수집기, 스케줄러, 공개 API, Cloudflare, DB 미변경. 스테이징 파일을 PC의 실행 프로젝트에 직접 덮어쓰면 `publicationCompatibility()`에서 차단할 수 있으므로 금지.

## 단계별 운영 연결 Gate

1. 승인 source와 실제 publisher 실행 프로젝트를 일치시킨다. R10 XML 참조 프로젝트(`1364b01b`)는 보호 파일 61개 drift를 보였지만 다른 writer 원장은 `ee41bb29`에서 `VERIFIED`; XML 문자열 경로만으로 실제 실행 프로젝트를 바꾸지 않는다.
2. 새 승인 commit은 운영 source `ee41bb29` 또는 그 뒤에 **명시적으로 검증된 최신 PC source**를 부모로 삼아, `lib/release-calendar.mjs` 한 파일의 변경으로 구성한다. 변경 파일 1개와 다른 `lib`/`worker`/`scripts/pc-writer` 보호 파일 0개를 확인한다.
3. 해당 새 commit을 검증된 운영 PC checkout에서 정확하게 설치하고, 그 다음 `config.source`를 그 commit SHA로 일치시킨다. 어느 하나만 선행한 상태로 정규 publisher를 돌리지 않는다. 기존 ledger·SQLite·task·활성 수집 결과를 보존한다.
4. 연결 구현 완료는 승인 source에 파서 단일 파일을 설치하고 `config.source`와 정확한 HEAD를 일치시키며 기존 스키마·ID·소스별 회귀 검사를 완료한 시점에 보고한다. 정규 수집·D1/API 공개 readback은 별도 운영 관측으로 구분한다. 사용자가 제보한 실제 불일치나 구체적 보호 실패는 해당 단계에서 최소 수정한다.
5. R11-1 BLS 연결 설치·필수 코드 보호 검사를 마쳤다면 R11-2 BEA 단독 연결에 착수한다. R18 정규 수집·공개 readback 대기 자체는 BEA 구현 착수 차단 조건이 아니다. BEA의 `GDP by County` ID 교정은 R11-2에 해당한다. 한국 지표·실적 데이터는 이용권 미확인으로 편입하지 않는다.

## 현재 확인된 근거

- R7/R8 PC 저장 입력에서 전체 BLS 확대 후보 **313건**, 기존 **25건**. BEA 168건은 **R11-2 후보**이며 R11-1 게시 수치가 아니다.
- R10 게시 원장은 `2026-10-27T06:31:17.688Z`, `VERIFIED`, source `ee41bb29`. 이것은 R11 새 parser의 운영 성공 증거가 아니다.
- 새 단계 테스트: `node tests/market-calendar-r11-bls-stage.test.mjs` (4 assertions), `node --test tests/market-calendar-*.test.mjs tests/release-calendar-collector-r1.test.mjs`, `npm run typecheck`.
- Production 적용·자동배포·PC 게시 성공은 별도 검증 전 **NOT_APPLIED**로 보고한다.

## R11-1 운영 대상 식별 — Windows CMD 1회

- `MARKET_CALENDAR_R11_PUBLISHER_LOCATOR.cmd`와 `scripts/pc-writer/market-calendar-r11-publisher-locator.mjs`, `staging/market-calendar/r11-bls/lib/release-calendar.mjs`를 같은 상대 디렉터리 구조로 두고 사용자 PC CMD에서 실행한다.
- Desktop 폴더에 `MARKET_CALENDAR_R11_PUBLISHER_LOCATOR_RESULT.txt` 한 건을 생성한다. 실제 PC 경로, 계정, 키, 등록 작업 XML 원문은 로그에 포함하지 않는다.
- R9/R10의 XML 참조 프로젝트를 다시 판정하지 않는다. **실시간** PC 설정의 source와 최근 `VERIFIED` 게시 writer/ledger source가 동일한지, E: 프로젝트 내 해당 HEAD를 가진 **정확히 한 개의 깨끗한 작업 트리**인지, 기존 parser blob과 R11-1 후보 파일 hash가 정확한지만 비교한다.
- `READY_FOR_EXACT_WORKTREE_SELECTION_NO_CHANGES_MADE`는 단일 source checkout을 찾았다는 뜻일 뿐 실제 프로세스 실행 디렉터리를 확정하거나 새 parser가 게시되었다는 뜻이 아니다. 어느 조건이든 모호하면 `*_STOP`이고 기존 운영 게시 상태를 변경하지 않는다.
- Git pull/fetch/checkout/commit/reset/merge, config/DB/작업 등록, 수집/계산/게시/배포는 **절대 수행하지 않는다**. 결과를 보고 그 다음 단일 파일 승인 커밋/PC 배치 단계로 넘어간다.

### R11 최초 결과와 R11B 수정

- 사용자 PC R11(`2026-10-27T07:52:11.539Z`)은 config/source, 최근 writer, ledger가 모두 `e95805a368a6d0c4461f6de9410df4b8e59ea011`이고 최근 writer는 `VERIFIED/PUBLISH`(`2026-10-27T07:50:11.363Z`)로 기록했다. 후보 파서 SHA256도 정확히 일치했다.
- 기존 R11 locator가 **과거** `ee41bb29`에 소스 SHA를 고정해 `APPROVED_SOURCE_DRIFT_STOP`을 반환했고, 검사한 Git 프로젝트 141개에서 일치 0건을 기록했다. 후자는 필터 자체가 `ee41bb29`로 잘못 고정됐기 때문이므로 실제 최신 source worktree가 0개라고 단정하지 않는다.
- GitHub 확인: `e95805a3`는 `ee41bb29`의 **직계 자식**이고 변경 파일 6개는 Census 요청·진단 관련 파일이며, `lib/release-calendar.mjs` blob은 기존 `f084e2a3` 그대로이다. 기존 게시 정상과 BLS 단독 확장 목표는 유지한다.
- R11B에서는 read-only locator가 PC 설정 source를 기준으로 **두 개의 VERIFIED 원장과 clean checkout HEAD의 동등성**을 확인하도록 수정했다. source SHA가 변했다고 자동으로 운영 승인을 갱신하지 않는다. 새 승인 커밋의 생성·PC 설치는 여전히 후속 단계다.

### R11B 실측과 R12 — 실행 진입점 직접 추적

- R11B 사용자 PC 로그(`2026-10-27T07:59:54.849Z`)는 config/writer/ledger source가 모두 `e95805a3`로 같고 게시 `VERIFIED`, BLS 후보 SHA256 정확히 일치하지만 `E:\ZGmini\projects\`의 **직계** 141개 프로젝트 중 source HEAD 일치 0개였다. 이 결과만으로 실행 프로젝트가 없다고 단정할 수 없다. 직계 검색 방식은 하위 release 체크아웃·junction·런처 간접 참조를 추적하지 못한다.
- `scripts/pc-writer/install-local.mjs`의 실제 등록 계약은 Core 작업 XML → `run-local-core.vbs` → Node `scripts/pc-writer/local-cycle.mjs`이고, VBS 명령에는 **실제 실행 프로젝트 경로**가 포함된다. R9/R10의 Core 작업 XML `WorkingDirectory`만으로 실행 경로를 단정했던 한계를 회피한다.
- R12 `MARKET_CALENDAR_R12_LAUNCHER_SOURCE.cmd`는 기존 `E:\ZGmini\data\pc-writer\run-local-core.vbs`의 JS 실행 대상을 **읽기 전용**으로 찾고, 그 저장소 HEAD·기존 parser Git blob·보호 파일의 미수정 여부를 config/writer/ledger 승인 source 및 BLS 후보 지문과 맞춘다. 등록 작업 XML이 해당 VBS를 참조하는지도 확인한다.
- 출력에는 실제 PC 경로·VBS 인자 전문·토큰·원문을 포함하지 않고 비식별 지문과 검증 상태만 기록한다. 결과 파일 `MARKET_CALENDAR_R12_LAUNCHER_SOURCE_RESULT.txt`.
- R12도 **수집·게시·설치·git 변경·config/DB/작업 등록 변경 없음**. 실제 publisher checkout이 확인되기 전에는 승인 SHA를 변경하거나 소스를 덮어쓰지 않는다.

### R12 불일치 결과와 R13 — 연결된 worktree 원장 확인

- R12 PC 로그(`2026-10-27T08:11:25.651Z`)에서 승인 config/writer/ledger source는 `7ac573fc`, launcher가 파악한 실행 repo HEAD는 `3941d416`. 기존 parser blob과 BLS 후보 지문은 모두 정상이다. 결과 `LAUNCHER_CHECKOUT_SOURCE_MISMATCH_STOP`.
- GitHub ancestry: `3941d416`은 `7ac573fc`의 275개 커밋 이전 조상이다. 변경 파일 298개 가운데 보호 영역 104개가 달라, 보호 정책을 무시한 source 재지정이나 기존 스케줄러 덮어쓰기를 허용하지 않는다. `lib/release-calendar.mjs`는 두 커밋 간 변경되지 않았다.
- 실제 writer 원장의 `VERIFIED`는 당시 승인 source 게시 성공 근거지만 **예약 Core 런처가 그 작업 트리에서 출발했다는 증거는 아니다**. R12는 Core XML에서 VBS 파일명을 확인한 뒤 추정 데이터 루트의 VBS를 읽었으므로 두 절대 경로가 같은지도 확인하지 못했다.
- R13은 XML `Arguments`에서 **정확한 VBS 절대 경로**를 추출하고 그 파일의 런처를 확인한다. 또한 `E:\ZGmini\projects` 직계 Git repo에서 `git worktree list --porcelain`로 **연결된 하위 worktree 등록 목록**을 읽어 실제 승인 source HEAD의 존재·유일성·파서 무결성·보호 파일 청결을 확인한다. 위치는 비식별 ID만 출력한다.
- R13 결과는 `MARKET_CALENDAR_R13_RUNTIME_LINEAGE_RESULT.txt`; 읽기 전용이며 작업 등록·수집·게시·설치·Git 전환·config/DB 변경은 없다. 승인 checkout을 찾더라도 스케줄러 재설치는 별도 검증·승인 없이 진행하지 않는다.

### R13 실측과 R14 — 검사범위 정밀화

- R13 PC 로그(`2026-10-27T08:27:22.662Z`)에 승인 source `7ac573fc`, writer/ledger `VERIFIED`, 기존 parser 및 BLS 후보 해시 일치. **예약 작업 XML의 실제 VBS는 이전에 추정해 읽었던 데이터 루트 VBS와 다른 위치**다. 이 때문에 R12의 `3941d416`을 실제 Core 실행 HEAD로 단정할 수 없다.
- R13의 정확한 VBS는 읽었지만 `identifyLauncher`가 일반적인 이중 인용부호 + `local-cycle.mjs` 형식만 처리하여 실행 대상을 찾지 못했다. Git 등록 worktree 2,022개에서 승인 source와 일치하는 깨끗한 후보 최소 1개를 확인했으나 한도에서 목록이 잘려 유일성 판단은 보류.
- R14에서는 **예약 XML의 정확한 VBS 파일만** 읽고, Windows 절대 경로가 포함된 네 가지 승인된 Node 실행 엔트리포인트 형식을 정적 검사한다. VBS를 실행하거나 내용을 기록하지 않는다. 해당 파일의 구문 형태와 실행 파일명(허용 목록), 작업 트리 비식별 지문만 출력한다.
- Git 작업 트리는 `git rev-parse --git-common-dir`로 공통 저장소별 중복 등록을 제거하고, `git worktree list --porcelain`의 **HEAD 메타데이터를 먼저 필터링**하여 승인 source와 같은 경로에만 상세 검사를 수행한다. 하드코딩한 2,000개 상한을 25,000개로 올리되 초과 시 불완전 명시 후 중단한다.
- R14 `MARKET_CALENDAR_R14_TARGETED_RUNTIME_RESULT.txt`는 읽기 전용이다. 스케줄러·Git·승인 source·PC 설정·DB·수집·게시·배포를 변경하지 않는다. source 유일성, 실행 스크립트, 기존 파서 무결성이 확보되면 BLS 단일 파일 소스 전환을 별도 승인된 단계로 진행한다.

### R14 실측과 R15 — 정확한 예약 VBS 명령 구조 비식별 판독

- R14 PC 로그(`2026-10-27T08:37:03.794Z`)의 config/writer/ledger는 source `7ac573fc` 및 `VERIFIED/PUBLISH`에 일치. 중복 제거한 **19개 Git 등록 원장 내 317개 worktree 중 정확히 한 개**가 승인 HEAD `7ac573fc`에 일치하며 parser blob `f084e2a3`, 보호 파일 청결, BLS 후보 SHA256 `54c73721`가 모두 맞는다. 검사 결과는 잘리지 않았다.
- 실제 예약 Core 작업 XML에서 추출한 VBS는 984바이트이며 기존 데이터 루트 런처와 위치가 다르다. `node`·`.mjs` 토큰은 있지만 정적 추출 가능한 절대 경로 엔트리포인트는 0개. 일치한 worktree가 **실제 예약 실행 대상이라고는 아직 확인되지 않았다**. R14 결정은 `TASK_VBS_STATIC_ENTRYPOINT_AMBIGUOUS_OR_DYNAMIC_STOP`.
- R15는 R14에서 이미 확인된 worktree 전체를 재검색하지 않고, **실제 예약 작업의 정확한 VBS 한 파일**을 읽어 변수명·함수 호출·문자열 결합 순서의 구조를 확인한다. 인용된 모든 문자열 값, 경로, 환경변수, 이메일, 민감 키워드가 포함된 줄은 비식별 처리하며 원문이나 실제 경로를 출력하지 않는다.
- `MARKET_CALENDAR_R15_VBS_STRUCTURE.cmd` 실행 결과는 같은 폴더의 `MARKET_CALENDAR_R15_VBS_STRUCTURE_RESULT.txt`다. R15는 VBS 실행 없이 읽기 전용으로 동작하며 Git·PC 설정·DB·예약 작업·수집·게시·배포를 변경하지 않는다. 분석 후 **승인 source와 실제 실행 엔트리포인트 일치**를 확정하기 전에는 BLS 파일 설치·config source 전환을 하지 않는다.

### R15 실측과 R16 — R38 wrapper 원본 실행 경로 검증

- R15 실측(`2026-10-27T08:49:04.707Z`)은 `ZGMINI_R38_WRAPPER_V1` 래퍼 19개 코드 줄(20행 파일)을 확인했다. `origin`과 `dispatcher`는 각각 한 개의 문자열 리터럴로 할당되고, `sh.Run`은 먼저 dispatcher 시작 작업, 이어 **기존 origin Core 실행**, 두 작업이 성공하면 dispatcher 종료 작업을 호출한다. `executable`은 환경변수와 문자열 결합으로 구성된다.
- 즉 R14의 `staticEntrypointCount=0`은 예약 래퍼가 직접 `scripts/pc-writer/local-cycle.mjs` 경로를 갖지 않아서 발생할 수 있다. R12의 데이터 루트 VBS를 **현재 래퍼가 실제 origin으로 참조하는지**는 아직 미확정이며, 지난번 `3941d416` 단정은 계속 보류한다.
- R16 `MARKET_CALENDAR_R16_ORIGIN_LINEAGE.cmd`는 정확한 예약 VBS의 단일 `origin = "..."` 할당만 추출하고, 그 원본 파일이 있을 때 최대 64KiB를 읽어 Node 실행 파일 경로를 찾는다. 산출된 Git checkout HEAD·parser blob·청결 상태·비식별 경로 ID가 R14에서 확인한 승인 checkout `d0a4b3cb8b95`와 같은지 점검한다. **dispatcher는 파일 존재·형식만 확인**하고 실행하지 않는다.
- 결과는 `MARKET_CALENDAR_R16_ORIGIN_LINEAGE_RESULT.txt`이며, 모든 PC 절대 경로·키·VBS 원문은 기록하지 않는다. Git 전체 작업 트리 재검사, VBS/Node 실행, 설치·수집·게시·config/DB/작업 수정 모두 금지. 어떤 불일치든 BLS 운영 전환은 보류한다.

### R16 실측과 R17 — BLS 한 파일만 승인 PC source에 적용

- R16 PC 로그(`2026-10-27T08:58:01.752Z`)은 실제 R38 wrapper → 원본 VBS(294바이트) → `local-cycle.mjs` 실행을 확인했다. 원본 VBS는 R12에서 추정한 데이터 루트 VBS와 **다른 파일**이었다. 실제 Core checkout은 R14 승인 ID `d0a4b3cb8b95`, HEAD `7ac573fc`, 기존 파서 blob `f084e2a3`, 보호 파일 청결 상태가 모두 일치한다. 최근 writer 게시 원장 역시 `VERIFIED`.
- BLS 후보 `staging/market-calendar/r11-bls/lib/release-calendar.mjs` SHA256 `54c73721`를 승인 baseline 파서와 비교했으며 차이는 BLS의 제목별 분류·ID·sourceUrl 확대와 단계 주석뿐이다. 기존 BEA·Fed·Census, `RELEASE_SOURCES`, 저장/게시 계약은 불변. `node --test tests/market-calendar-r11-bls-stage.test.mjs` 테스트를 통과했다.
- R17 `MARKET_CALENDAR_R17_BLS_APPLY.cmd`는 **명시적으로 실행했을 때만** 적용한다. 실행 시점 R16 lineage·승인 HEAD `7ac573fc`·Git parser blob·후보 SHA256·설정 source·보호 파일 청결·Git 작성자 설정을 모두 재검증한다. 이미 Core lock이 있으면 건드리지 않고 중단한다.
- 통과 시 Core lock을 임시로 확보하고, 승인 데이터 루트의 `market-calendar-r17-backups` 하위에 **기존 파서와 config 원본을 모두 보존**한 뒤, 승인 PC checkout의 `lib/release-calendar.mjs` 단일 파일만 변경한다. 해당 파일만 포함하는 로컬 Git 커밋을 생성하고, 부모가 `7ac573fc`이며 차이 파일이 정확히 1개인지 확인한 뒤 `config.source`를 새 HEAD로 맞춘다. 설정 이외 DB·게시 원장·예약 작업·원자료는 변경하지 않는다.
- GitHub push 및 `main` 변경·Cloudflare 배포·강제 수집·즉시 게시 모두 없다. 적용 결과 파일은 `MARKET_CALENDAR_R17_BLS_APPLY_RESULT.txt`. `BLS_INSTALLED_WAIT_NEXT_REGULAR_VERIFIED_CYCLE`는 설치 성공 **전용** 상태이며 이후 정규 수집의 BLS 원본 저장·파서 계산·게시 `VERIFIED` 및 공개 readback을 별도로 검증해야 한다. 2026-10-27 당시의 구형 대기 게이트는 아래 최신 역할·범위 계약으로 대체한다. 실제 BLS 운영 결과 미관측은 BEA 코드 연결 착수의 차단 조건이 아니다.
- 커밋 전 실패는 원본 파서를 복구하고 종료한다. 커밋 이후 설정 변경 실패는 게시 차단 상태일 수 있으므로, 임의 `git reset` 없이 백업과 결과를 확인한 뒤 별도 복구 판정을 받는다.

### R17 설치 성공과 R18 — 실제 정규 수집·게시·공개 대조

- 사용자 R17 결과(`2026-10-27T09:14:11.140Z`)는 `BLS_INSTALLED_WAIT_NEXT_REGULAR_VERIFIED_CYCLE`: 실제 운영 source `7ac573fc`에서 BLS 파서 한 파일 커밋 `e778f58d056e45c515fac95b4ed48295f6a3ed1a`로 전환됐다. R17 백업 `r17-20261027091413755-d53cc8ff`가 존재하고, 게시·수집·Git 원격 푸시는 시행하지 않았다. **설치 PASS ≠ 수집·게시 PASS.**
- R18 `MARKET_CALENDAR_R18_VERIFIED_CYCLE.cmd`는 실행 중인 Core 작업 XML의 실제 원본 VBS와 정확한 worktree를 추적한다. 승인 HEAD·부모·단일 파일 diff·파서 SHA256·config.source를 확인하며, SQLite `readOnly:true`로 기존 BLS 원본 저장 시각/현재 출력/시도 시각을 읽는다.
- R17 백업 원본 파서와 새 파서를 **동일하게 저장된 BLS 입력**에 적용해 예전 발행일·제목 누락을 확인한다. BLS 저장 이벤트의 키·건수·중복, BEA/Fed/Census 건수, 새 source `VERIFIED` writer/ledger, 공개 `/api/release-calendar`의 이벤트 해시 일치를 구분하여 판정한다.
- 최초 정규 BLS 수집이 아직 없다면 `WAIT_FIRST_REGULAR_BLS_COLLECTION`; 수집 성공 후 게시 전이면 `WAIT_NEW_SOURCE_VERIFIED_PUBLICATION`; 공개 불일치면 `WAIT_REMOTE_EXACT_EVENT_READBACK`. `BLS_VERIFIED_PUBLIC_READBACK_PASS`는 공개 동작의 선택적 실측 판정이며 BEA 코드 연결 착수의 필수 조건이 아니다.
- R18은 기존 예약 시각·6시간 수집 가드·DB·Git·Cloudflare·D1·공개 데이터를 변경하지 않는다. 읽기 전용 결과 TXT를 받아 판정하며 수집·게시를 임의로 강제하지 않는다.

### R19 — 프로젝트 방향·역할 재확정 (2026-10-27 최신 지시)

- 최종 목표는 **시장 캘린더 전체(경제지표·기업 실적·주요 시장 일정)의 기존 페이지 연결**이다. BLS는 전체 데이터 소스 중 1개 단계에 불과하다. 신규 별도 페이지나 통합 목적을 벗어난 실시간 감시 기능을 만들지 않는다.
- 사용자: 실제 공개 페이지 실시간 모니터링. 개발 담당: 기존 PC 수집·파서·게시 경로에 승인된 소스들을 순차 연결하고 코드·계약 검사/정확한 설치 source를 보고한다.
- 사용자 요청이 없다면 **예약·알림·정규 수집 대기·상시 폴링·R18 반복 결과 요청**을 연결 작업의 완료 조건이나 후속 BEA 착수 조건으로 추가하지 않는다.
- **R17 BLS 연결 설치는 완료**(source `e778f58d056e45c515fac95b4ed48295f6a3ed1a`). R18 최초 로그는 기존 BLS 저장 입력과 6시간 가드의 캐시 상태를 나타내며 신규 BLS 공개 건수 실측은 아직 하지 않았다. 두 상태를 구분한다.
- 다음은 **R11-2 BEA 단독 확장 연결**. 설치 전에 최신 PC 승인 source·변경 파일/게시 계약 훼손 위험만 확인하고 기존 source·DB·작업 주기·게시 이력을 보존한다. 코드 설치 PASS와 공개 사이트 PASS는 각각 다른 근거를 요구한다.
- 전체 운영 방향과 완료 용어는 `docs/MARKET_CALENDAR_PROJECT_SCOPE_AND_HANDOFF_20261027.md`를 따른다.
