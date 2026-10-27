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
4. 정상 정규 수집 이후 저장 원본→파서 결과→게시 `VERIFIED`→D1/API readback을 순서대로 확인한다. BLS 확대·BEA/Fed/Census 불변과 이벤트 중복 0, 기존 133건의 날짜·제목 보존 여부 확인. 불일치 시 다른 단계로 진행하지 않고 기존 정상 게시본 보존.
5. R11-1 성공 뒤 R11-2 BEA만 별도로 진행한다. BEA의 `GDP by County` ID 교정은 R11-2에 해당한다. 한국 지표·실적 데이터는 이용권 미확인으로 편입하지 않는다.

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
