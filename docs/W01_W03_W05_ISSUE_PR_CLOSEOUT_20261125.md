# W01·W03·W05 완료 프로젝트 — Issue·PR 잔여 정리 원장

- 기준일: 2026-11-25 KST
- 담당: 본체 Issue·PR 수명주기 관리자
- 저장소: `ansqhd5774-Choi/zgmini`, `ansqhd5774-Choi/zgmini-pc-control`
- 기록 브랜치: `codex/issues-lifecycle-manager-20261123`
- 목적: **사용자가 완료를 확정한** W01·W03·W05 프로젝트의 *Issue·PR 정리*. 기능 개발, 운영 PC 설치, 미검증 기능 완료 선언은 범위 밖.
- 원본 run/requestId/승인 manifest/영수증은 보존하며, 기존 단회 요청은 재실행하지 않음.

## GitHub 직접 재확인한 신규 종결 원본 11건

| 프로젝트 | 저장소 | 항목 | 최종 상태 | 처리 이유 및 증거 |
| --- | --- | --- | --- | --- |
| W03 | zgmini | [PR #1580](https://github.com/ansqhd5774-Choi/zgmini/pull/1580) | CLOSED, **UNMERGED** | R54 Source Lease 독립 후보. 격리 CI 성공과 실PC 미설치 구별, 선택 통합 추진 중지. [정리 댓글](https://github.com/ansqhd5774-Choi/zgmini/pull/1580#issuecomment-7158238802) |
| W03 | zgmini-pc-control | [#846](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/846) | CLOSED/not_planned | 108파일 과거 단회 B exit13 / 최종 효과 UNKNOWN; 공통 수정 #889/Windows 격리 #892, 원본 B 성공 아님. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/846#issuecomment-7158322781) |
| W03 | zgmini-pc-control | [#838](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/838) | CLOSED/not_planned | 과거 Windows proof 취소·0 jobs, 구조 수정 PR #839. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/838#issuecomment-7158442241) |
| W03 | zgmini-pc-control | [#840](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/840) | CLOSED/not_planned | 과거 proof 차단/reporter exit13, 후속 수정 PR #842. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/840#issuecomment-7158444262) |
| W03 | zgmini-pc-control | [#843](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/843) | CLOSED/not_planned | CAS fixture 미정합, 후속 PR #844; 운영 CAS 결함 입증 아님. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/843#issuecomment-7158446019) |
| W03 | zgmini-pc-control | [#894](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/894) | CLOSED/not_planned | LOCAL_EXECUTOR_PASS이나 게시 PASS 미입증. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/894#issuecomment-7158458244) |
| W03 | zgmini-pc-control | [#1219](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1219) | CLOSED/not_planned | R181 단회 Core SHA 조회 결과 댓글 부재, 성공 미확인. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1219#issuecomment-7158460207) |
| W01 | zgmini-pc-control | [#1917](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1917) | CLOSED/not_planned | Event129 원본 STATE_UNKNOWN. 후속 W01 #2716/#2717/#2791 성공은 다른 범위. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1917#issuecomment-7158482375) |
| W01 | zgmini-pc-control | [#1797](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1797) | CLOSED/not_planned | Census CDN 단회 시험 실행/결과 미확인. 후속 W01 데이터 검증과 별개로 원본 요청 폐기. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1797#issuecomment-7158503175) |

| W01 | zgmini-pc-control | [#1329](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1329) | CLOSED/not_planned | 2026-11-13 Core 계보 단회 조회 `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE`; 원본 실행 성공 아님. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1329#issuecomment-7158751139) |
| W01 | zgmini-pc-control | [#1331](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1331) | CLOSED/not_planned | 2026-11-13 Core 활성 계보 단회 조회 `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE`; 원본 실행 성공 아님. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1331#issuecomment-7158753045) |

**집계:** 이번 수명주기 정리에서 실제 종료한 이력은 Issue 10 + PR 1 = **11건**. W05 관련 구형 요청은 조사 시점에 이미 CLOSED였으므로 이 숫자에 산입하지 않음. 증거 없이 폐쇄하거나 성공으로 소급한 항목 없음.

## 현재 OPEN 대상 교차검증

- 2026-11-25 후속 추적: 단순 `W01` 키워드 검색 외에도 원본 `pc-inflation-core-*-once` 요청 ID를 대조해 #1329/#1331 추가 종결. `STATE_UNKNOWN` 증거는 변경하지 않음.
- 2026-11-25 GitHub 재검색: 두 저장소 모두 `W01`, `W03`, `W05` 명칭 검색에 걸리는 **OPEN PR 0건**.
- 두 저장소의 OPEN Issue·PR 목록을 별도 조회한 결과, 프로젝트 이름/관련 작업 키워드와 직접 맞는 전용 잔여 항목은 발견하지 못했음. **이는 과거 전체 요청의 계보가 100% 조사됐다는 주장과 다름.**
- 별도 **공통 Runner 장애** [pc-control #2237](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2237)은 OPEN 유지: 원본 #2227 취소/steps=[] 및 유사 W05 취소의 root cause 미확정. W03 기능 미완료나 Project W03 재개 사유로 계산하지 않음.
- 공통 중앙 원장 #68, #1743, #2426, #2427 및 시장 캘린더 등 **타 프로젝트/공통 업무 항목은 종결 범위 밖**.
- 오래된 W01·W03·W05 기능 브랜치와 이미 닫힌 PR은 존재하며, 이들 브랜치가 남았다는 사실은 곧 OPEN Issue·PR은 아님.

## 잔여 점검 기준 및 업무 종료 판정

1. Issue·PR 정리 대상에 한정하면, **현재 식별 가능한 세 프로젝트 전용 OPEN 항목 0건**으로 판정.
2. 전체 과거 승인 명세·비표준 제목/본문·원본 request 계보의 누락까지 없다고 입증된 것은 아니므로 **완전무결한 전수감사 100% 완료 표시는 보류**.
3. 새로 직접 연결되는 잔여 Issue가 발견되면 증거 확인 후 개별 종결; 공통 재발 장애는 별도 담당 그대로 유지.
4. 이번 정리에서 신규 PC Job/B 설치/Task/Controller/Writer/SQLite/D1/Cloudflare 변경 **0건**. 저장소 기록은 이 문서만 신규 작성.

## 2026-11-25 추가 감사 — 일반 `pc-job` 원본 계보 교차대조

- 대상 `zgmini-pc-control` OPEN Issue **79건** (해당 시점 REST GitHub 검색 결과, 이 수치가 저장소의 불변 총량은 아님). 개별 JSON 명세의 `operation`, `requestId`, `chatId`, `sourceBranch`, `approvalManifestPath`를 분리하여 프로젝트 귀속 판단.
- 제목이 일반 `pc-job`인 항목도 **프로젝트 코드가 없다는 이유만으로 폐기하지 않음**. `main` source SHA, 공통 Core 조회, `STATE_UNKNOWN` 결과만으로 W01·W03·W05 소속을 식별할 수 없음.
- [#1217](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1217)은 R6 복구·원본 미접수 계보, [#1227](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1227)은 D05 별도 인계 계보이므로 완료 프로젝트 전용 종결 범위에서 명시 제외.
- [#1196](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1196), [#1200](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1200), [#1231](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1231), [#1598](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1598), [#1922](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1922), [#1997](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1997), [#2079](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2079) 등은 공통 `core-runtime-source-readonly` 과거 결과에 `STATE_UNKNOWN` 기록이 있지만 이 결과만으로 W01·W03·W05 전용이라고 단정하지 않음; 임의 종료 금지.
- W04 고용 `employment-r6-*`, ER1 시장 캘린더 `er1-*`, 공통 Controller/CI 원장도 명시 제외. 특히 현재 실제 설치/후검사 관련 W04 항목과 활성 공통 Runner 장애 [#2237](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2237)은 OPEN 유지.
- **이번 추가 감사에서 신규 안전 종결 근거 확정 0건**. 누적 확정 종결 **11건(Issue 10, PR 1)** 유지. 운영 PC/Controller/Task/Writer/SQLite/D1 수정 0건, 신규 B/PC Job 0건.
- 다음 행동 기준: 원담당 명세·고유 `requestId`가 W01·W03·W05로 실제 연결되고, 원본 실행 소비/대체/폐기의 명확한 근거가 있는 경우에만 별도 Issue 종결과 이 원장의 증거 링크 동기화. 범위 밖 OPEN 항목을 숫자 축소만을 목적으로 닫지 않음.

## 2026-11-25 추가 감사 2차 — 오래된 공통 요청 원인·소관 대조

- 현재 OPEN 79건의 `operation`/`requestId`/`chatId`/`sourceBranch`/승인 경로에서 W01·W03·W05 명시적 소속을 확인하지 못한 공통 `pc-job`을 별도 식별. `sourceSha`가 동일한 것은 공유 `main` 참조일 뿐 프로젝트 담당 소유 증명이 아님.
- [#702](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/702)는 [#699](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/699) **시장 캘린더 D+30** Writer B 이후 Core 소스 조회, 원본 `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE`; 2026-11-25 기존 조사 댓글에서 특정 시점의 Core 실행계보 미입증을 재확인함. **W01·W03·W05 전용이 아니므로 제외**.
- [#996](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/996)는 공통 Controller 업데이트/접수 복구. 2026-11-15 후속 댓글은 `INTAKE_RECOVERED_ORIGINAL_INSTALL_ABORTED`와 원본 lease 보관 성공을 기록하지만, Controller 원 설치 성공은 아님. **공통 운영 원본이므로 별도 소관 유지**.
- [#1969](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1969), [#2059](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2059): 공통 소스 bundle 등록에서 각각 `BUNDLE_B_APPROVAL_CONTRACT_INVALID`, `APPROVAL_MANIFEST_READ_FAILED`; W 프로젝트 소유 확인 전 종료 금지.
- [#1213](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1213), [#1226](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1226)은 일반 Core A 원본으로 결과 댓글 0건. R6·D05·기타 공유업무로부터 소관 분리할 증거 없어 보류.
- [#1196](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1196), [#1200](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1200), [#1231](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1231)은 `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE`; [#1598](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1598)은 `CORE_TASK_RUNNING_INSTANCE_UNOBSERVABLE`. 과거 결함 상태만으로 단회 원본을 **완료된 W01·W03·W05 요청**으로 잘못 귀속하지 않음.
- **추가 종료 0건 / 누적 11건 유지**. 다른 담당자 업무에 영향 주는 Issue 닫기·PC 실행·재승인/설치 없음. 이 단계는 과거 소속 미입증 항목의 **오종결 방지 검증**이며 전체 백로그 해소로 표현하지 않음.

## 2026-11-25 추가 감사 3차 — Writer 원본 소속 정밀 판별

- [PC #1174](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1174): 공통 Writer preimage 읽기. 원본 [Run 42712917820](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/42712917820) `STATE_UNKNOWN/WRITER_PREIMAGE_CHECKOUT_NOT_CORROBORATED`; 원본 승인 계보에는 R10/공통 Writer 검사와 별도 후속 #1175/#1182가 연결되어 있으며 원래 검사의 PASS 입증은 아님. 저장 경로에 오래된 inflation 백업이 포함돼도 그것만으로 W01 직접 소유로 분류하면 안 됨.
- [PC #2032](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2032): 승인 경로 `approvals/writer-preimage/bls-registered-v2-preimage-13-r1.json` 및 [Run 44086082448](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/44086082448) `BLOCKED/RETIRED_IRAN_INVENTORY_UNAVAILABLE`. BLS v2 계열의 별도 고용업무이므로 W01·W03·W05 정리 대상에서 제외.
- [PC #1213](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1213), [PC #1226](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1226): 원본 댓글 0건, 범용 Core 조회. 소속·실행 실증이 없어 별도 유지.
- 이번 범위 내 **새로 종결할 근거가 확정된 Issue·PR 0건**. 기존 실제 종결 **11건(Issue 10, PR 1)** 유지. 공유 원장·타 프로젝트의 열린 문제를 프로젝트 완료라는 이유로 닫지 않음.
- 원본 Request/승인 manifest와 해당 프로젝트 소유가 교차 입증되지 않는 나머지 범용 Core 이력은 현 단계에서 *귀속 미확정*으로 표시하고, Issue만 반복 종료하는 활동은 중단. 새 직접 관련 증거가 등장할 경우에만 이 원장에 연결하여 처리.

## 2026-11-25 추가 감사 4차 — 프로젝트 별칭 OPEN 재검색

- PC-control OPEN 검색: `infl19` 전용 0건, `infl7` 0건, `w05-five-key` 전용 0건, `three-sidecar` 전용 0건, `r54` 전용 0건. 결과에 나타난 #68/#2427 등은 공통 원장임.
- PC-control `census-m3`/`gmh` 검색에서 #835는 별도 시장 캘린더, #68 공통 중앙 원장. `r178`/`r181`/`theme-platform`에는 #996이 등장하지만 해당 원본의 역할은 **공통 Controller 운영 복구**이고 W03 전용 종결 항목이 아님. 다른 프로젝트가 본문/댓글에서 언급됐다는 이유만으로 닫지 않음.
- 본체 OPEN PR 별칭 검색: `w01`, `w03`, `w05`, `inflation-r2`, `theme-fear-greed`, `wpsfd42` 각 0건. 직접 프로젝트별 추가 종료 후보 없음.
- 검색 결과는 특정 시점의 식별 가능한 OPEN 목록에 대한 **음성 증거**이지 프로젝트의 미게시 기능/운영 장애까지 없다는 증거는 아님. 전체 계보 완전성 100% 주장 보류.
- **신규 Issue/PR 종결 0건; 누적 11건**. 다중 업무 병렬 실행 방해하지 않고 소속 미검증 항목을 보존함. 신규 PC/Writer/Controller/DB/D1 작업 0건.
