# 테마 추가 공통 작업·인수인계

## 목표

공통 CMD 대안 선택은 [CMD_EXECUTION_PLAYBOOK.md](CMD_EXECUTION_PLAYBOOK.md), 현재 도구의 일반챗용 1회 전환 패키지 지시문은 [THEME_CONFIG_CMD_PACKAGE_TASK.md](THEME_CONFIG_CMD_PACKAGE_TASK.md)를 따른다. 개별 브랜치를 모두 수정하는 방식 대신 이 중앙 원본을 참조한다.

기존 공급처와 승인 산식을 쓰는 새 테마마다 일반챗 → 개별 코드/ZIP → Codex 설치를 반복하지 않는다. 일반챗은 데이터 전용 설정을 준비하고, 설치된 PC 공통 도구가 검증·등록·수집·계산한다. 새로운 API·미승인 산식은 이 흐름으로 위장하지 않는다.

저장소: `ansqhd5774-Choi/zgmini`  
기존 전용 브랜치: `codex/theme-fear-greed-integration-20261025`  
최초 공통 도구 커밋: `8785c96e9a9b8bb606299b5e0d2bcfba80874434`

## 현재 상태와 증거

| 단계 | 상태 | 근거/제한 |
|---|---|---|
| 설정 검증·불변 등록 | 구현·PC 설치 완료 | `theme-config-registry.mjs` |
| 고정 공급처 수집·이어하기 | 구현·PC 설치 완료 | 기존 collector 재사용, 별도 registered 저장 공간 |
| 기존 R2/R3 계산 | 구현·PC 설치 완료 | 252점 R188 동등성 및 혼합 비중 fixture 검사 |
| 공통 예약 | 신규 1개 설치·등록 확인 | `ZGMINI-PC-Configured-Themes`, PC 현지 매일13:00, 숨김 실행 |
| 기존 작업 보호 | 검증 완료 | 기존 예약 6개 XML 해시 불변 |
| 현재 등록 목록 | 0개 | 샘플 테마 등록 없음, 숨김 실행 `NO_REGISTERED_THEMES`, Provider GET0 |
| 신규 실테마 수집·계산 | 미실행 | 실제 테마 미선정. fixture와 혼동 금지 |
| 다음 정규 실행 | 미관찰 | 등록 성공과 실행 관찰을 구분 |
| 공개 게시 준비 | 다음 단계 구현 | `theme-config-publication-preflight.mjs`, 로컬 replay·해시·승인 검사만 |
| 공통 D1 게시/readback | **코어 소스 구현·로컬 모의 D1 8검사 PASS / 실D1 미실행** | `theme-config-publication-d1.mjs`; 기존 public-feed 테이블·CAS·exact readback. 실제 PC 인증/게시 연결은 미완료 |
| 공개 Reader/API·UI | **동적 UI 연결 소스 구현 / main 반영·배포 미실행** | `worker/theme-configured-public.mjs`, `/api/theme-configured`, `ConfiguredThemeSection`; 기존 10개 Reader/UI·산식 불변 |

PC 설치본: `E:/ZGmini/data/pc-writer/theme-config-tool`  
설치 증거: `INSTALL_RESULT.json`  
실행 결과: `SCHEDULE_HISTORY.log`  
데이터 정의: `E:/ZGmini/data/theme-config/definitions/<id>.json`  
분리 원본·결과: `E:/ZGmini/data/themes/registered-<id>/`

## 일반챗에서 할 일

1. 저장소의 이 문서와 `examples/theme-registration.template.json`을 기준으로 요청을 파악한다.
2. ETF 두 개·SPY·기존 `ADAPTIVE_R2_PAIR_R3`를 사용하는 JSON만 작성한다. 선정 근거·권리 확인 여부는 사실대로 별도 설명한다.
3. 사용자에게 JSON을 `THEME_REGISTER.cmd`에 한 번 끌어 놓고 내용을 확인한 뒤 `REGISTER`를 한 번 입력하도록 안내한다. 정상 결과는 `REGISTERED_PRIVATE_ONLY`/`ALREADY_REGISTERED`이다.
4. 사용자에게 status/id/sha256 또는 오류 코드만 받는다. Secret·원자료·환경변수 전체를 요청하지 않는다.
5. 일반챗에서 PC를 읽지 못하는 것은 일반챗의 도구 제약이다. PC 장애나 설정 실패로 단정하거나 같은 접근 시도를 반복하지 않는다. 정상 등록 후 별도 테마별 CMD 설치·예약 경로 변경을 요구하지 않는다.
6. STOP이면 정확한 코드와 상태를 먼저 대조한다. 잠금·checkpoint 삭제, 무조건 재실행, 정상 점수의 날짜만 갱신하는 지시는 하지 않는다.

초기 지원 범위: ETF2개, 40:20:40과 기존 날짜별 비중. ETF3개 이상·임의 비중·새 공급처는 별도 개발/승인 대상이다. 둘 다 단기인 미승인 조합은 후보를 보존하고 점수는 결측으로 둔다.

## 공통 운영 방법

- 등록 목록은 다음 기존 **공통 도구의 전용 예약**에 자동 포함된다. 기존 R73/R48/R47 작업을 바꾸지 않는다.
- 전 테마 예약 합계 UTC 날짜당4GET. 개별 테마 실패 격리·순환 실행·checkpoint 이어하기를 유지한다. 최초 장기 수집은 여러 날 걸릴 수 있다.
- 수동 갱신이 필요하면 `THEME_UPDATE.cmd`에서 ID와 `RUN`을 각각 한 번 입력한다. 수동 최대4GET은 별도다.
- 지원·준비·등록·실수집·계산·게시·다음 정규 실행을 각각 기록한다. 코드 테스트나 exit0을 실제 갱신 완료로 보고하지 않는다.
- 도구 개발과 PC 설치본 버전은 별도다. GitHub 새 커밋이 PC에 자동 설치됐다고 쓰지 않는다. 기존 설치본은 SHA가 고정된 버전 디렉터리를 사용한다.

## 다음 작업 — 설정 기반 공개 연결

순서:
1. **진행 중:** 등록 정의 해시, 최신 원본 SHA, 저장 계산 결과의 재현, 관측일/원본 수집 시각, 별도 운영자 공개 승인 대조. 로컬 사전검사는 원격D1 요청0/쓰기0이다.
2. **코어 소스 구현·운영 검증 대기:** 기존 D1 테이블·CAS를 재사용하는 공통 publisher와 exact readback을 작성했다. 기존키 교체 없이 `theme-configured:<id>` namespace를 사용하며, 모호한 제출 결과는 조회만 하고 재전송하지 않는다. 실PC 인증 어댑터 연결·실D1 게시·readback 증거는 아직 없다.
3. **독립 Reader/API 소스 구현·배포 검증 대기:** 공통 Reader는 승인된 개별 레코드만 별도 `/api/theme-configured`에서 읽는다. 기존 공개 10개 테마를 교체하지 않고, 미승인·빈·오래된 후보를 건너뛴다. 실D1 읽기와 사이트 배포는 미실행이다.
4. **소스 구현·배포 대기:** UI는 승인된 동적 테마 목록·실제 결측·점선/확정 경계를 기존 스타일로 표시한다. 고정 팔레트와 기존 산식을 바꾸지 않는다.
5. **대기:** 실제 선택한 신규 테마 한 개로 원본→계산→승인→D1→API/UI→다음 정규 실행 증거를 확보한다. 샘플 AAA/BBB로 성공을 꾸미지 않는다.

### 공개 승인과 설정의 분리

설정 JSON에 `publicationAuthorized`, 권리 승인, SQL, URL, command 등을 추가해도 등록기가 거부한다. 공개 승인 레코드는 별도의 운영자 검토 결과이며 등록·테스트로 자동 생성하지 않는다. 기존 테마에 적용된 익명 사용 위험 수용을 새로운 모든 테마의 권리 확인으로 자동 승계하지 않는다. 현재 사전검사 v1은 명시적으로 검토된 파생 공개 권리 모드만 지원한다. 이 검사는 승인 문서의 구조·해시·범위 대조이며 독립 법률 검증이 아니다.

`--preflight <id>` / `--all` 결과가 `PREFLIGHT_PASS_NO_REMOTE_ACCESS`여도 D1 저장·API 연결·사이트 공개 성공이 아니다. 후보는 과거 원자료를 다시 수집하지 않고 현재 보존 자료에서 재현한다. 공개 승인이 없거나 계산 자료가 부족하면 해당 테마의 공개 단계만 대기하며 기존 운영은 계속한다.

## 2026-10-29 공개 연결 코드 인계 — 설정 기반 테마

- 기준 브랜치: `codex/theme-fear-greed-integration-20261025`; 이전 기준 커밋: `74a5beefb5c69379fdad32dd544bd74c06f90edf`. 브랜치 전체 main 병합 금지.
- **코드 준비:** `scripts/pc-writer/theme-config-publication-d1.mjs`는 기존 로컬 사전검사를 게시 시점에 재실행하는 `publishConfiguredThemeD1` 진입점을 제공한다. 기존 D1 query 어댑터를 주입하는 방식이며 인증정보·원본·공개 승인 문서를 생성하지 않는다. 준비 후보만 `theme-configured:<id>` 새 key로 CAS INSERT/UPDATE하고, exact readback을 확인한다. 결과가 모호하면 읽기만 수행하고 재전송하지 않는다.
- **공개 Reader/API 준비:** `worker/theme-configured-public.mjs`와 `app/api/theme-configured/route.ts`는 공개 레코드를 화이트리스트로 제한한다. 기존 `/api/theme-fear-greed`·공개 10개 테마·잠정치·R32·기존 키를 수정하지 않는다. 결측 점수는 null로 유지한다.
- **검증 범위:** 로컬 mock D1 게시 8/8, Reader 6/6 통과, 원격 소스 readback 일치. 실제 신규 등록 0개(기존 전달된 PC 증거 기준이며 이번 채팅에서 PC 직접 재조회하지 않음). 테스트 fixture는 운영 게시 증거가 아니다.
- **미완료:** PC 설치 및 인증 어댑터 연결, 실원본→계산→독립 운영자 권리 승인, D1 CAS write/readback, Cloudflare main selective recovery·배포, 기존 UI 목록 통합, 정규 실행 관찰. 이번 코드 커밋은 D1 요청0·쓰기0·배포0이다. 등록/승인 없을 때 미게시가 정상이며, 임의 권리 승인을 만들어 운영 게시하지 않는다.

## 실행·배포 경계

이번 도구 설치는 사이트 배포·R74 설치·R32 전환이 아니다. 앞으로 공통 기능을 변경할 때도 전용 브랜치 전체를 운영main에 병합하지 말고 실제 대상 diff와 별도 작업을 확인한다. 새로운 가지·임시 배포 경로·유료 서비스·테마별 독립 설치본을 기본 해결책으로 만들지 않는다. 공개 코드 반영은 기존 GitHub PR→main→Cloudflare Git 연동 경로를 따른다.

## 2026-10-29 공통 예약 자동 게시·공개 UI 소스 연결 (운영 전환 별도)

- 개발 브랜치는 기존 `codex/theme-fear-greed-integration-20261025`만 사용한다. 기존 공개 10개, R32 산식, 기존 6개 Windows 예약 XML 및 독립 R73→R48→R47 운영 경로는 변경하지 않는다.
- **PC 공통 예약 1개만 재사용:** `theme-config-tool.mjs --scheduled`는 기존 UTC일별 공급처 전체 4GET 제한으로 비공개 수집·저장·계산한 뒤 `theme-config-auto-publish.mjs`를 호출한다. 공개 단계 실패는 테마별로 격리해 `PUBLICATION_PARTIAL_REVIEW_REQUIRED`로 남긴다. 공개 단계 공급처 GET은 0, 승인 없는 경우 D1 접속·쓰기도 0이다. 공통 예약 시각은 **매일 13:00 현지** 그대로다. 6시간 반복 실행이나 추가 예약은 만들지 않는다.
- **별도 공개 승인:** `theme-config/public-approvals/<id>.json`이 실재하고 사전검사에서 정의 해시, 승인 범위·권리 검토 표시, 저장 원본 SHA, 점수 재현, 거래일 및 8일 신선도가 모두 통과한 테마만 `theme-configured:<id>` D1 키로 CAS 저장 및 exact readback을 시도한다. 자동 승인 생성, 빈 데이터의 성공 처리, 기존 공개 키 갱신은 없다. 이미 게시된 동일일 동일점수는 `UNCHANGED`로 쓰기 0회다.
- **원격 코드와 PC 설치본은 별개:** 설치기의 immutable 버전 bundle에 공개 preflight/D1 게시/기존 Cloudflare 인증 어댑터/신선도 모듈을 포함하도록 변경했다. 이전에 설치한 공통 도구는 source SHA가 고정되어 있어 GitHub 변경만으로 전환되지 않는다. `theme-config-upgrade.mjs --upgrade-scheduled`는 **Windows 로컬 Codex에서 사전 확인 후 한 번 실행하는 전환 경로**로, 기존 설치 `INSTALL_RESULT.json` manifest 및 설치 파일 SHA, 기존 `THEME_SCHEDULED.cmd` 본문, `THEME_SCHEDULED.vbs` 경로, 잠금 상태, 기존 작업 XML·13:00 시각을 검사한다. 새 버전을 별도 디렉터리에 둔 뒤 공통 예약 CMD 1개만 백업·교체하고 XML 전후 일치를 검증한다. 이전 bundle·등록 CMD·기존 작업은 보존한다. 예상 외 내용이나 잠금이 있으면 덮어쓰지 않고 STOP. PC 변경은 이 채팅에서 수행하지 않았다.
- **공개 UI 연결 코드:** 기존 `/theme-fear-greed/`의 10개 차트 뒤에 별도 `ConfiguredThemeSection`을 배치한다. `/api/theme-configured`가 승인된 `READY` 테마를 제공하는 경우에만 동적 목록과 252거래일 이하 실제 이력을 표시한다. `null`은 차트에서 빈 구간이며, R188 확정은 실선, R2 잠정은 점선으로 구분한다. 등록/승인 대상이 0개거나 Reader 오류 시 UI에 신규 테마가 나타나지 않는다. 테마별 코드·사이트 배포는 필요하지 않지만, **공통 Reader/UI의 첫 main 선택 병합 및 Cloudflare 배포는 한 번 필요**하다.
- **자동 추가의 전제:** 지원 범위는 기존 공급처의 ETF 2개 + SPY, `ADAPTIVE_R2_PAIR_R3`만이다. 이 범위 밖은 새 검토가 필요하다. 이후 지원 범위의 실테마는 사용자와 테마·ETF 구성을 확정하고, 등록 JSON과 별도 공개 승인 기록만 작성한다. 샘플 AAA/BBB와 임의 테마는 실제로 등록·게시하지 않는다.
- **검증 상태:** 자동 게시 6건, 예약 CMD 단일 전환 4건, 차트 결측·확정/잠정 2건의 로컬 단위검사는 PASS. 이는 Windows 설치, Cloudflare build, D1 실제 readback, 신규 테마의 정규 수집을 대체하지 않는다. 이 채팅에서 실제 PC 설치·테마 등록·D1 쓰기·사이트 배포는 모두 0이다. PC 첫 설치 후 `AUTO_PUBLISH_UPGRADE_RESULT.json`과 다음 정규 `SCHEDULE_HISTORY.log`로 전후 상태를 확인하고, main 선택 병합/Cloudflare 배포 후 승인된 테마의 공개 readback을 검증해야 운영 완료다.

## 2026-10-29 최신 main 선택 통합 리허설 — 운영 반영 아님

- 최신 개발 `main=8a7634a5358cb19280725fe29a977ba4feb44be8`, 작업 브랜치 시작 HEAD `5058f04feef3e6f7f45ac680eabaed15a082f419`. 이 브랜치는 main과 크게 갈라져 있으므로 전체 병합/기계적 page.tsx 및 CSS 덮어쓰기는 금지한다.
- 별도 브랜치를 만들지 않고 최신 main의 격리된 detached worktree에서 **필수 공통 구성 파일만 선택적으로 적용**했다. 설정 등록/사적 수집·계산, 승인 preflight, D1 CAS 게시, 독립 Reader/API, 동적 UI, 공통 예약 전환기 및 해당 테스트를 포함한다. main에 없는 `scripts/pc-writer/theme-nine-r54-d1-client.mjs`를 게시 의존 파일로 포함해야 한다. 기존 `theme-optional-collect.mjs`에는 설정형 2-ETF collector를 위한 최소 확장만 적용하고, `app/theme-fear-greed/page.tsx`에는 import와 섹션 1개, CSS에는 설정형 테마 규칙만 추가하여 main의 기존 UI/SEO 및 10개 테마를 보존했다.
- 격리된 main 후보에서 **44/44 Node 테스트 PASS, `npm run typecheck` PASS, `npm run build` PASS**. 빌드 라우트 목록에 `/api/theme-configured`가 포함된다. 모두 **로컬 후보 증거**이며 GitHub main, Cloudflare Build/Production 또는 PC 운영 검증이 아니다.
- 실제 공개 GET 확인: `https://zgmini.kr/api/theme-fear-greed`는 HTTP 200, `status=READY`, 10개 테마; `https://zgmini.kr/api/theme-configured`는 HTTP 404. 따라서 신규 Reader는 현재 공개되지 않았다. 본 확인에서는 D1 읽기/쓰기, PC 설치, 테마 등록·승인 생성, Scheduler 변경, 배포를 수행하지 않았다.
- 남은 **일회성 연결**: (1) PC 현지에서 `theme-config-upgrade.mjs --upgrade-scheduled`의 manifest/SHA·잠금·예약 XML을 검증하고 13:00 공통 예약 CMD 하나만 안전하게 전환한 뒤 `AUTO_PUBLISH_UPGRADE_RESULT.json` 확인, (2) 최신 main 기준 위의 최소 파일만 PR 선택 반영하고 Cloudflare Git 연동 exact SHA 빌드/배포·공개 GET 검증, (3) 사용자와 검증용 실테마 및 ETF 2종을 확정한 후 비공개 등록·별도 권리/공개 승인·실제 저장 결과→D1 CAS/readback→UI·다음 정규 실행 검증. 등록/승인이 0개면 신규 차트가 숨겨지는 것이 정상이다.
- 현재 **운영 상태: `PC_UPGRADE_NOT_VERIFIED / CONFIGURED_PUBLIC_API_NOT_DEPLOYED / LIVE_THEME_NOT_SELECTED`**. 사용자 지시에 따라 새로운 브랜치를 만들지 않았고, 기존 main 전체 교체나 direct Wrangler 배포도 수행하지 않았다. 기존 10개 테마·R32·R73/R48/R47·기존 Scheduler/DB를 수정하지 않았다.

## 2026-10-29 후속 실PC 설치 증거와 최신 main 공개 Reader 준비

이 단락은 위의 과거 `PC_UPGRADE_NOT_VERIFIED` 상태 이후 사용자 제공 Windows 실행 결과와 최신 main 분리 검증이다. 기존 기록을 덮어쓰지 않는다.

- **실PC 공통 예약 CMD 설치 완료:** 사용자 제공 `PACKAGE_RESULT(2).txt`에 `PREFLIGHT_PASS` 및 `INSTALL_STATUS=CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED`. 설치 패키지 고정 소스 SHA `3e94327573dc492c882ee3fa8c8d7435b480f139`, 새 불변 버전 `d7ee6a050a8533c8`, 새 CMD SHA-256 `49a4761d085c4dc67d22a1396921724f21ae0ebbac20c65896bd94d586f649c5`. 기존 CMD 백업 readback, 예약 XML 불변, 실제 설치 중 Provider/D1 호출 0, 복원 불필요. 이는 **설치·CMD 전환 증거**이며 13:00 정규 실행이나 실제 새 테마의 D1 게시 증거가 아니다.
- **사용자 지시로 정규 예약 실행 검증은 보류:** 신규 실테마 등록 0개 상태이며 무승인 샘플/공개 승인 생성 금지. 이후 정규 로그 확인은 설치 다시 실행이나 Scheduler 재등록 없이 읽기 전용으로 수행한다.
- **최신 공개 개발 기준:** `main=b3b2528cdb67852776d86291bc80dc21fc4013ce`, 원 작업 브랜치 개발 소스 SHA `3e94327573dc492c882ee3fa8c8d7435b480f139`에서 별도 detached 최신-main 후보에 **공개 영역 8개 경로만** 선택 적용. 새 `/api/theme-configured` Route·Reader, 동적 UI, 점수 이력 변환과 테스트를 추가하고 기존 `page.tsx`에는 import/섹션만, `theme-detail.css`에는 설정형 테마 클래스만 추가. 기존 10개 Reader·차트 계산·R32·PC 예약을 수정하지 않는다.
- **후보 검증:** Reader/차트 Node 8/8 PASS, TypeScript `npm run typecheck` PASS, `npm run build` PASS. 빌드 라우트에 `/api/theme-configured` 존재. 사용자 PC Runtime·Cloudflare hosted build·Production 검증은 별도다.
- **실제 공개 응답:** `https://zgmini.kr/api/theme-fear-greed`는 `READY`, 10개 테마, `modelRevision=null`; `https://zgmini.kr/api/theme-configured`는 HTTP 404. 소스 후보만 준비했으며 실제 `main` 병합·Cloudflare 배포·D1 쓰기 0건이다.
- **다음 공개 연결 게이트:** 본 전용 브랜치는 main과 크게 갈라져 있으므로 전체 PR 병합 금지. 최신 main 선택 반영을 위한 별도 좁은 PR head가 필요한 경우 사용자의 **신규 브랜치 생성 금지 예외**를 먼저 받아야 한다. 예외 승인 전까지 기존 브랜치/운영 환경을 보존하며 배포하지 않는다. 첫 공통 Reader/UI 배포 후에도 승인된 실테마와 실제 D1 readback 없이 신규 차트 공개 성공을 선언하지 않는다.

## 2026-10-29 사용자 승인 1회성 공개 Reader/UI 통합 PR — 작업 기준 복귀

- 사용자가 **이번 목적에 한해 신규 브랜치 1회 생성**을 승인했다. 전용 브랜치 `codex/theme-configured-public-ui-integration-20261029`는 공개 Reader/API/UI의 8개 파일 선택 통합 목적에만 사용하며, 다른 개발 작업을 추가하지 않는다.
- 기준 main `b3b2528cdb67852776d86291bc80dc21fc4013ce`에서 정확히 1커밋 `8aa473c72394e0729edf0df6e2407cd30d2eba3a`만 추가했다. 원격 tree `5a71a58c3accea54923e68daa3708551f5407ca1`이 격리 로컬 검증 후보 tree와 일치한다. GitHub 비교/readback에 표시된 파일은 정확히 8개(신규 6, 기존 변경 2), 299행 추가·삭제 0이며 R32와 기존 10개 테마는 변경하지 않았다.
- **초안 PR #894:** https://github.com/ansqhd5774-Choi/zgmini/pull/894 — `main` 대상으로 생성했으나 **미병합·미배포**. 최초 로컬 Node 테스트 8/8, typecheck, build PASS와 별개로 Cloudflare 실제 배포 및 신규 테마 D1 검증은 미실시다. 13:00 관찰은 사용자 지시대로 보류한다.
- PR 초안을 제출하는 것으로 이번 통합 브랜치의 한정 목적을 마쳤다. **후속 개발·인수인계 작업 기준은 기존 `codex/theme-fear-greed-integration-20261025`로 복귀한다.** PR 승인·병합 및 Git 연동 배포는 별도 승인 없이 실행하지 않는다.
- **PR #894 CI 게이트:** GitHub Actions의 `check` 작업은 Build·Type check 통과 후 기존 이란 뉴스 R41/R42 회귀검사에서 `R41_QUALIFIED_COUNT_OR_SOURCE_MISMATCH` / `R42_STAGING_MANIFEST_INVALID`로 실패했다. 이 테스트·스크립트·증거 파일은 본 8개 경로 변경에 포함되지 않았고, 로컬 동일 소스에서도 R41 오류를 재현했다. unrelated 회귀/증거 계약을 통합 목적 브랜치에서 고치거나 CI를 우회하지 않는다. `ui` 작업 결과는 추후 별도 readback이 필요하다. 따라서 PR은 **초안·CI 미통과·미병합·미배포**로 유지한다.
