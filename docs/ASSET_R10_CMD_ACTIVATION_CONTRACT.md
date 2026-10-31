# ZGMINI 자산 버블 R10 — PC Writer CMD 선택 적용 기준 R6

기준일: 2026-10-29. 범위: **패키지 작성·오프라인 검사·PC에 설치할 수 있는 조건 정의**. PC 정규 실행과 D1 성공은 별도 단계이며 현 문서로 완료 처리하지 않는다.

## 1. 원본 및 승인 범위

- 저장소: `ansqhd5774-Choi/zgmini`
- 변경 브랜치: `codex/api-site-integration-r1-20261026`; 새 브랜치/기존 전체 병합 금지
- 중앙 CMD 기준: [CMD_EXECUTION_PLAYBOOK.md 고정 원본](https://github.com/ansqhd5774-Choi/zgmini/blob/b4a2345179277ff8f0834ac9d5fc1f73251b4d4a/docs/CMD_EXECUTION_PLAYBOOK.md) (현재 중앙 작업 브랜치 `codex/theme-fear-greed-integration-20261025`)
- 기존 인수인계: [R5 handoff](https://github.com/ansqhd5774-Choi/zgmini/blob/codex/api-site-integration-r1-20261026/docs/ASSET_R10_PC_WRITER_AUTO_ACTIVATION_R5_HANDOFF.md)
- R10 원본: [PR #893](https://github.com/ansqhd5774-Choi/zgmini/pull/893), 병합 소스 `8a7634a5358cb19280725fe29a977ba4feb44be8`
- 기록된 PC 운영 승인 source: `a477ef304425145f559352af4291e437e3b08a2d` — **실제 PC에서 다시 검증**
- 목표는 R10 6개 원자료·최근 완료 5분기 이력의 **기존 정규 Writer 게시 훅**이다. 산식·기존 점수·D1 스키마·키·TTL·입력 수집기·DB·스케줄러·VBS·Cloudflare·배포는 변경하지 않는다.

## 2. 선택한 방식

**독립 Git-less ZIP + 3단계 CMD + 허용 파일만 적용**을 택했다. 중앙 문서의 읽기 전용 진단, 정확한 SHA checkout 확인, 선택 적용, 사용자 실행 결과 회수 기준에 따른다.

이전 R2·R3·R4 진단은 실제 예약 작업의 VBS와 승인 Writer가 다른 경로를 가리킬 수 있음을 보여주었다. 따라서 폴더명·오래된 설정만으로 임의 적용하지 않는다. 실제 Git checkout의 고정 SHA, `config.source`, 마지막 Writer source 및 예약/VBS 정적 참조까지 대조한다. 이 대조가 모호하면 `STOP_ROUTE_UNCONFIRMED`로 설치를 중단한다. 중앙 문서를 작업별로 복사하지 않는다.

기존 Writer의 `run-local.mjs`, `publication-guard.mjs`, PR #893의 sidecar·raw/history 검증·기존 writer, `node:test`, `git`를 재사용한다. 새로운 수집기·게시 실행기·작업 등록기는 만들지 않는다.

## 3. 패키지 / 출처 고정

- 패키지 이름: `ASSET_R10_AUTO_CMD_R6_20261029.zip`
- ZIP SHA-256: `174daedfd105f41bc387c25e1c4bf3a34c1fe90ad503031fc99663a21b2b7839`
- manifest SHA-256: `65bc7905fe7f03afe4da2fc76a28bdd1f63e60f35b3aa3af7f49906b7867899b`
- 재현 가능한 manifest: `scripts/pc-writer/asset-r10-cmd-r6/package-manifest.json`
- 구현 파일: `scripts/pc-writer/asset-r10-cmd-r6/r10-ops.mjs`
- GitHub에 동일 소스 TXT/CMD·테스트·고정 PR #893 의존 파일 참조본을 기록한다. ZIP 안에는 `.git`이나 비밀키가 없다.
- 위 ZIP·manifest digest는 ZIP **외부**의 브랜치 명세와 대조한다. ZIP 내 manifest 자기 검증만으로 신뢰하지 않는다.

manifest는 고정 PR #893 commit, 파일별 상대경로·SHA-256·Git blob SHA, Node/Git 요구사항, 운영 source SHA, 3개 실제 진입점 및 역할을 담는다. PR #893의 정적 import를 재귀적으로 확인한 의존 파일 16개, `publication-guard.mjs`, 원본 Writer 비교 전용 파일, 회귀 테스트를 포장한다. **원본 run-local.mjs는 참고용이며 운영 checkout에 전체 덮어쓰지 않는다.**

## 4. 구버전 및 목표 소스 식별

PC에서 `E:\ZGmini\data\pc-writer\config.json`의 `source`, 마지막 실행 `local-writer-last-run.json`의 `source`와 상태, `ZGMINI-PC-Local-Core` 예약 명령·VBS·작업 폴더, `E:\ZGmini\projects\` 아래 실제 Git HEAD를 대조한다.

- 예상 출발 commit: `a477ef304425145f559352af4291e437e3b08a2d`
- 예상 구버전 `run-local.mjs` 파일 해시: **PC에서 `git show a477ef...:scripts/pc-writer/run-local.mjs`로 도출하는 SHA-256**. 이 commit은 현재 GitHub 원격에서 직접 제공되지 않으므로 예상 파일 SHA-256을 추정/기록하지 않는다.
- 예상 구버전 Git blob SHA: 동일한 PC Git 객체 `git rev-parse a477ef...:scripts/pc-writer/run-local.mjs`로 확인한다.
- 적용 후 파일 SHA-256: 검증된 구버전 텍스트 + 고정 hook-spec에 대해 계산한 실제 SHA. 적용 후 commit SHA: 지정 파일만 테스트/commit한 뒤 출력하는 `AFTER_SHA`.
- `publicationCompatibility` 기존 파일은 고정 원본 SHA와 **정확히 같아야 한다.** 다르면 적용하지 않는다.

이 전제는 Git 없는 ZIP 실행을 지원하면서도 실 PC checkout의 Git 무결성 검사를 보존한다. 별도 `.git`을 만들거나 해시·호환성 검사를 우회하지 않는다.

## 5. 필수 의존 및 변경 허용 범위

- 필수 기존 실행 환경: Windows CMD, Node 22.13 이상, Git, 확인된 운영 checkout, 승인 PC SQLite 및 R10 로컬 증거.
- 신규 `scripts/pc-writer/asset-r10-sidecar-auto-publication-r1.mjs` 및 그 정적 전이 import: `ASSET_R10_RAW_PREFLIGHT_R1.mjs`, `ASSET_R10_1Y_HISTORY_READONLY_R1.mjs`, `asset-r10-storage.mjs`, `worker/asset-bubble-r10-{raw,history}-r1.mjs`, `worker/market-public-projection-store.mjs`, `worker/public-display-freshness.mjs`와 `lib/diagnostic-layer/` 관련 8개 파일. 정확한 목록/해시는 manifest가 기준이다.
- 필요하다면 **누락된** 동일 SHA 의존 파일만 추가한다. 이미 존재하는 파일이 고정 SHA와 다르면 중단한다. 기존 `publication-guard.mjs`는 확인 전용이며 교체하지 않는다.
- 허용 변경: 검증된 운영 checkout의 `scripts/pc-writer/run-local.mjs`에 PR #893 훅을 정확히 한 번 삽입, 필요한 누락 의존 파일/회귀 테스트 추가, 위 허용 파일만 Git commit, 호환성 확인 시 `config.source` 값 1개 수정. 설치 중 다른 설정을 쓰지 않는다.
- 허용하지 않음: 최신 `main` 전체 설치, 다른 브랜치 전체 병합, 스케줄러/주기/VBS/잠금/원장/DB/원천자료/산식/D1/Cloudflare/DNS 변경, 별도 Writer 활성화, 강제 수집·게시·사이트 배포.

## 6. 진입점 및 STOP

| 단계 | CMD (실제 동작) | 성공 판정 |
|---|---|---|
| PREFLIGHT | `RUN_PREFLIGHT.cmd` → `node r10-ops.mjs preflight` | `STATUS=READY_FOR_INSTALL`만 설치 허용. PC 운영 파일 읽기 전용 |
| INSTALL | `RUN_INSTALL.cmd` → `node r10-ops.mjs install` | `PC_SOURCE_INSTALLED_AWAIT_NORMAL_CYCLE` — 설치 단계만 완료 |
| VERIFY | `RUN_VERIFY.cmd` → `node r10-ops.mjs verify` | 첫/다음 정규 주기의 기록 구분; 직접 D1 조회 완료 주장 금지 |

각 CMD는 패키지 폴더에 이름이 분리된 `ASSET_R10_CMD_{PREFLIGHT,INSTALL,VERIFY}_RESULT.txt`를 남긴다. 구성 전체·원천 API 응답·인증정보는 보고하지 않는다. CMD는 ASCII·CRLF·BOM 없음, `%~dp0` 경로 인용이며 외부 인수·입력을 요구하지 않는다.

**STOP 조건:** 승인 source/예약 경로 미확인, 복수 checkout, detached HEAD, tracked dirty, 다른 Node 프로세스 불명확, 잠금 파일, 게시 `SUBMITTING` 또는 불명확한 ledger, Writer 마지막 상태 실패, Node 버전 부족, Git 원본 객체/해시 불일치, 기존 의존 파일·publicationCompatibility 차이, 부분 훅 설치, 테스트 실패, 중간 파일 변경. `STOP` 시 자동 재실행·잠금 삭제·강제 Git 초기화 없음.

## 7. 백업·중복 적용·복원

- 설치 전 운영 `run-local.mjs`와 `config.json`을 `E:\ZGmini\data\pc-writer\r10-cmd-backups\` 밑에 저장하고 파일 SHA를 재조회한다. 설정 백업은 PC에만 남기고 ZIP/Git/리포트에 포함하지 않는다.
- 훅이 이미 있으면 `ALREADY_INSTALLED_SOURCE_NOT_REAPPROVED`로 재적용하지 않는다. 기존 의존 파일 해시 불일치는 중단한다.
- Git commit 이전 실패는 허용 파일만 복원하고 추가한 파일만 제거한 뒤 복원 결과를 검증한다. commit 이후 오류는 자동 reset/revert하지 않고 `STOP_POST_COMMIT_MANUAL_RECOVERY_REQUIRED`와 백업을 남긴다. 승인 소스 변경·운영 자동 실행이 중간에 발생하면 더 진행하지 않는다.
- 설치 성공 시 로컬 설치 영수증 `asset-r10-cmd-r6-install-receipt.json`으로 exact commit과 백업 위치를 기록한다(비밀값 제외).

## 8. 검증·완료 기준

**실제 수행한 오프라인 검사:** PR #893 sidecar 9개, R6 보호/helper 5개(합계 14개), 실제 PR 직전 Writer 코드와 훅을 넣은 고정 Writer의 바이트 일치, 중복·계약 차단, `config.source` 최소 변경, manifest 변조 차단, Git 없는 압축 해제본에서 같은 테스트, ZIP 압축 무결성 검사. 정적 `node --check`, `node:sqlite`를 포함한 import 확인(실제 Node 24). 이 결과는 Windows 실 PC 성공이 아니다.

**현장 PREFLIGHT:** PC 시각·시간대·정규 등록 명령·VBS·WorkingDirectory·config/마지막 Writer source·실행 checkout/브랜치/HEAD·tracked status·프로세스·잠금·ledger·필수 계약/훅 대조.

**INSTALL 완료:** `BEFORE_SHA`, `AFTER_SHA`, `CONFIG_SOURCE` 및 변경 파일 해시 일치, `HOOK_STATUS=INSTALLED`, `TEST_STATUS=PASS`, 백업과 source 전환 확인. 이 단계에서는 **R10 자동 갱신 완료가 아니다**.

**정규 첫 주기:** 실제 실행 source가 `AFTER_SHA`이고 `assetR10Sidecars.keys.raw`와 `.history`가 각각 `READBACK_VERIFIED`/`ALREADY_STORED`/`UNCHANGED_VERIFIED` 중 하나여야 한다. 6개 원자료 계보, 최근 완료 5분기(부분 결측 보존), `sourceVersion`·`sourceStoredAt`·관측 분기·기존 점수 보존을 별도로 점검한다. 두 D1 키 각각의 **실제 원격 재조회 증거**가 없으면 `D1_READBACK=...WRITER_REPORTED`로만 남긴다.

**다음 정상 주기:** 강제 실행 없이 서로 다른 `local-writer-last-run.at`를 두 차례 확인한다. 두 주기의 Writer 결과만으로 `NEXT_CYCLE=SECOND_NORMAL_CYCLE_WRITER_REPORTED`라 하고, 독립 D1 재조회·공개 UI 검증까지 완료했다는 뜻으로 확대하지 않는다.

## 9. 결과/미확인 필드

| 필드 | 현재 (패키지 제작 시점) |
|---|---|
| `BEFORE_SHA` | PC 재조회 전: 기록된 승인 source `a477ef...` |
| `AFTER_SHA / CONFIG_SOURCE` | PC 미설치, `NOT_APPLIED / NOT_VERIFIED` |
| `HOOK_STATUS` | PR #893 소스 구현, PC 실제 실행 여부 미확인 |
| `TEST_STATUS` | 오프라인 14개 통과, Windows 운영 미검증 |
| `R10_SIDECAR_RAW / R10_SIDECAR_HISTORY` | 정상 PC 실행 결과 대기 |
| `D1_READBACK / NEXT_CYCLE` | 별도 운영 증거 대기 |

문제가 발생하면 결과 TXT에서 `LAST PASS`, `FIRST FAIL`, 정확한 `ERROR_CODE`, 변형·복원 여부를 회수한 뒤 **최소 변경만** 재승인한다.

## 10. R6 PC PREFLIGHT 후속 확인 — 읽기 전용 상세 도구 R1

실제 PC에서 2026-10-29 생성한 `ASSET_R10_CMD_PREFLIGHT_RESULT.txt`를 확인했다. `STATUS=STOP`, 첫 중단 원인은 `STOP_SCHEDULER_NOT_CONFIRMED`였다. 승인 Writer HEAD, `config.source`, 마지막 Writer source는 모두 `a477ef304425145f559352af4291e437e3b08a2d`로 일치했고 ledger는 `VERIFIED`였다. 다만 작업 XML에서 활성화 태그가 검출되지 않아 `TASK_ENABLED=UNKNOWN`, 예약 실행 경로는 `wscript.exe` → `run-local-core.vbs`(작업 디렉터리 `E:\ZGmini\projects\zgmini-inflation-r37-stage`)여서 승인 checkout까지의 간접 연결은 미확정이다. `STOP_NODE_PROCESS_AMBIGUOUS`, `STOP_LOCK_PRESENT`도 기록되었다.

- 이 결과만으로 스케줄러가 실제 비활성인지, Node 프로세스가 Writer에 속하는지, 잠금이 유효한지 단정하지 않는다.
- 후속 ZIP: `ASSET_R10_R6_BLOCKER_DETAIL_R1_20261029.zip` / SHA-256 `9f2469172282633bd9f1f0f99173f4bb268a6f498c6d629bd3ed922f83a6c770`.
- manifest: `scripts/pc-writer/asset-r10-cmd-r6-detail/package-manifest.json` / SHA-256 `f1131a2b951272cf33382b46f1a6dca7c3631579637ff5a0b1bfdc1e6c1d9686`.
- 실행: 새 폴더에 압축 해제 → `RUN_R10_BLOCKER_DETAIL.cmd` 정확히 1회 → `ASSET_R10_BLOCKER_DETAIL_RESULT.txt` 반환. PC 상태는 읽기 전용이고 결과 TXT만 패키지 폴더에 기록한다.
- 검사: `schtasks` XML 및 조회 상태, 승인 SHA checkout의 Git tracked 상태, 허용된 VBS/CMD/JS의 정적 참조 및 파일 해시, 관련 실행 파일/PID, 잠금 파일 이름·경과 시간, ledger·마지막 Writer source. 동적 실행 경로는 추적되지 않을 수 있으며 이것이 설치 허가를 뜻하지 않는다.
- R1 도구 자체도 manifest의 파일별 해시를 검증한다. ZIP/manifest 자체 신뢰는 위 **외부 SHA-256**으로 확정한다. Node 문법, Linux 비-Windows 차단, ZIP CRC 검증은 수행했으나 **Windows 현장 동작은 미검증**이다.
- `STATUS=READONLY_DETAIL_COMPLETED`는 추가 정보 수집의 성공일 뿐이다. 기존 R6 INSTALL은 계속 금지하며 위험 상태의 프로세스·잠금·스케줄러를 수정하지 않는다. 상세 결과를 확인한 후 정확한 최소 후속 조치를 정한다.

## 11. PC 상세 R1 실제 결과와 후속 경로 식별 R2

2026-10-29 받은 `ASSET_R10_BLOCKER_DETAIL_RESULT.txt`의 `STATUS=READONLY_DETAIL_COMPLETED`, `MANIFEST_STATUS=HASH_VERIFIED`를 확인했다. 실제 승인 checkout은 정확히 1개이며 `HEAD=a477ef304425145f559352af4291e437e3b08a2d`, 브랜치는 `codex/pc-auth-boundary-20261027`, `TRACKED_DIRTY=NO`, **`HOOK=ABSENT`**이다.

- 예약 작업 `ZGMINI-PC-Local-Core`는 `wscript.exe` → `run-local-core.vbs`; 작업 디렉터리는 `E:\ZGmini\projects\zgmini-inflation-r37-stage`. task XML의 Enabled 명시가 없었고 CSV 상태 파싱은 `UNPARSED`였다. 이를 비활성 상태로 단정하지 않는다.
- 정적으로 발견한 6개 허용 스크립트는 `cutover-evidence`의 VBS와 `earnings-risk-provisional-r23`의 dispatch·publication·observation 보조 실행 파일이다. `ROUTE_LITERAL_MATCH=NO`이므로 승인 Writer까지의 직접 호출 경로는 **미확정**. 이 경로가 없다고 단정하지 않는다.
- Node/WScript 프로세스 14개, `local-cycle.lock` 1개(수정 후 경과 0분), ledger `VERIFIED`, 마지막 Writer 상태 `VERIFIED`. 잠금과 프로세스가 활성 예약 실행과 관련될 수 있으므로 건드리지 않는다.

상세 실행 경로를 더 정확히 식별하기 위해, 같은 승인 범위 내 읽기 전용 R2 도구를 별도로 제공한다.

- ZIP: `ASSET_R10_ROUTE_INVENTORY_R2_20261029.zip` SHA-256 `324ee5c4308d7e535f3f09b136562013c391c8c069cdc7287405481afeab1a21`.
- manifest: `scripts/pc-writer/asset-r10-route-inventory-r2/package-manifest.json` SHA-256 `d3db6e6eadab4c7acb0503ce7ef84ecb294cd11b9ed1d99f407367ac498c15a2`.
- 명령: 압축 해제 → `RUN_R10_ROUTE_INVENTORY.cmd` 정확히 1회 → `ASSET_R10_ROUTE_INVENTORY_RESULT.txt` 제출.
- 지원: 예약 작업 목록·실행 상태·최근 실행·실행 명령 지문, 관련 실행 경로 아래 허용 스크립트 SHA 및 정적 참조, 가능한 경우 WMIC PID·부모 PID·스크립트 파일명만 수집. 명령 인수의 원문 및 비밀값은 기록하지 않는다. WMIC 미설치·접근 실패 시 해당 구간만 `UNAVAILABLE`로 표시한다.
- 자체 무결성 검증, Node 구문, Linux에서의 안전한 `STOP_WINDOWS_ONLY`, ZIP 압축 무결성은 확인했다. Windows 실행 및 실제 경로 결론은 아직 검증되지 않았다.

**R2도 설치·수집·D1 쓰기 기능은 전혀 없다.** `STATUS=READONLY_INVENTORY_COMPLETED`는 진단 성공일 뿐 설치 가능 판정이 아니다. 실행 경로 확인, 관련 프로세스 소강 및 잠금 해제, 원본 계약·해시 검증 전까지 R6 INSTALL을 실행하지 않는다.

## 12. R2 실측 후속 — Korea 정적 참조와 Core 실제 게시 분기 구분

2026-10-29 PC에서 제출한 `ASSET_R10_ROUTE_INVENTORY_RESULT.txt`는 `READONLY_INVENTORY_COMPLETED`, manifest `HASH_VERIFIED`였다. 예약 작업 전체 409개 중 관련 항목 22개를 조사했다.

- 승인 checkout HEAD/config.source/last source 모두 `a477ef304425145f559352af4291e437e3b08a2d`이고 tracked dirty `NO`, R10 hook `NO`.
- `ZGMINI-PC-Local-Core`: `run-local-core.vbs`, 약 5분 주기, 승인 Writer를 가리키는 완전한 리터럴 경로는 발견되지 않았지만 Writer 관련 문자열은 있다. 호출 구조는 **미확정**.
- `ZGMINI-PC-Local-Korea`: `run-local-korea.vbs` → `scripts/pc-writer/local-cycle.mjs` → `run-local.mjs`라는 정적 참조가 확인된다. **그러나** 실제 `local-cycle.mjs` 코드에서 `progressivePublication({enabled: lane==='core' && publishAllowed, ...})`라 Korea 경로의 게시 함수는 호출되지 않는다. 따라서 이 정적 참조만으로 Korea 작업을 Writer 게시 경로라고 판단하지 않는다.
- 이전 별도 `ZGMINI-PC-Writer` 예약 작업은 XML `<Enabled>false</Enabled>`로 비활성. 임의로 활성화하지 않는다.
- `PROCESS_LINEAGE=UNAVAILABLE`(WMIC 없는 환경일 수 있음), `local-cycle.lock` 1개(수정 후 경과 3분). 프로세스 종료·잠금 삭제는 하지 않는다.

이에 정확한 최소 확인용 읽기 전용 R3를 준비했다.

- ZIP: `ASSET_R10_CORE_ROUTE_PROOF_R3_20261029.zip`, SHA-256 `b4cbda611770e2d720a6d3d3cba5e712b1cbc6ce9d8f4fe73abf73cb00f115a5`.
- manifest: `scripts/pc-writer/asset-r10-core-route-proof-r3/package-manifest.json`, SHA-256 `474fb8bce15bc0f372d3201754a73bf4b4261a9ffea7b7663ee52ff32cf802f5`.
- 사용자 실행: 압축 해제 → `RUN_R10_CORE_ROUTE_PROOF.cmd` 1회 → `ASSET_R10_CORE_ROUTE_PROOF_RESULT.txt` 반환.
- 탐색 대상: R2에서 해시로 확인한 Core/Korea VBS 두 파일의 변경 여부, 안전한 구조적 키워드(실제 본문 출력 금지), `local-cycle.mjs` 게시 분기, 마지막 Writer 시각, `local-cycle.lock`의 PID·존재 확인. 파일/프로세스를 변경하지 않는다.
- 코드/manifest/ZIP 정적 검사 및 Linux 비-Windows 차단은 수행; 실제 Windows 운용 결과는 아직 미검증. 구조상 문자열 탐지가 곧 실제 분기 실행 증거는 아니다.

현재 `BEFORE_SHA=a477ef...`, `AFTER_SHA=NOT_APPLIED`, `HOOK_STATUS=ABSENT`, 설치 승인 `NO`는 유지한다. R3 결과를 대조해 실제 Core 게시 호출 관계를 확인하고, 기존 설치기 `Local-Core` 경로 판정의 정확한 개선 범위만 결정한다. 과잉 차단을 해제하려고 잠금·프로세스·스케줄러 보호를 우회하지 않는다.

## 13. R3 실측 및 실제 Writer 호출 출처 식별 R4 (읽기 전용)

2026-10-29 사용자가 제출한 `ASSET_R10_CORE_ROUTE_PROOF_RESULT.txt`는 `READONLY_CORE_ROUTE_COMPLETED`, manifest `HASH_VERIFIED`였다. Windows에서 확인한 결과는 다음과 같다.

- 승인 Writer/config.source/마지막 Writer source 모두 `a477ef304425145f559352af4291e437e3b08a2d`, checkout `TRACKED_DIRTY=NO`, R10 훅 **미설치**.
- Local-Core 예약 VBS `run-local-core.vbs` SHA-256 `bb3e11c0...` 일치. 내부에 `local-cycle.mjs`, `run-local.mjs`, `--publish`, 승인 Writer checkout 문자열 모두 **없고**, R38 earnings dispatch를 참조한다. 따라서 기존 R6 설치기의 **Core → 승인 Writer 직접 연결 가정은 성립하지 않는다**.
- Local-Korea VBS `run-local-korea.vbs` SHA-256 `df558149...` 일치. `local-cycle.mjs`·`--publish`·`--korea`가 있지만 `local-cycle.mjs`의 `lane==='core'&&publishAllowed` 게시 조건으로 Korea lane은 게시하지 않는다. **정적 참조를 Writer 실행 증명으로 사용하지 않는다.**
- `local-cycle.lock` 존재, 경과 약 2분, PID `31912` 존재. 프로세스 **정체는 미검증**. `local-writer-last-run.at=2026-10-29T13:25:08.565Z`, 상태 `VERIFIED`. 실행 기록의 SHA 일치는 호출 경로의 증거가 아니다.

한 번에 필요한 범위를 좁혀 후속 **읽기 전용** R4 패키지를 만든다.

- ZIP: `ASSET_R10_WRITER_ORIGIN_READONLY_R4_20261029.zip`; SHA-256 `f73f88ec9f5275e17dae4d916061d3a0990831fb95a4717facbd307d01617f19`.
- manifest: `scripts/pc-writer/asset-r10-writer-origin-r4/package-manifest.json`; SHA-256 `b32d1ce698d79c7782e3b5ad44622ae659e215d3001c95122c6cdb7ef2834d5c`.
- 명령: 압축 해제 → `RUN_R10_WRITER_ORIGIN_READONLY.cmd` **1회** → `ASSET_R10_WRITER_ORIGIN_RESULT.txt` 제출. 입력 없음.
- 진단 범위: R2에서 고정한 Core VBS와 R38/R31/R33/R22/R21 모듈의 SHA·호출 키워드·후속 파일명만 확인; `Get-ScheduledTask` 상태, `Get-CimInstance` 프로세스 유형과 잠금 PID 일치/생성시각, 승인 checkout HEAD/dirty, config/last-run/ledger 비교. 원문 코드·프로세스 명령 전체·환경변수·인증정보는 출력하지 않는다. PowerShell 조회가 제한되면 `UNAVAILABLE`로 남긴다.
- 정적 검사는 실제 호출 보증이 아니므로 `WRITER_ROUTE=UNPROVEN`, `INSTALL_AUTHORIZATION=NO`가 기본이다. 잠금 존재, 게시 원장 SUBMITTING, 소스 차이, 파일 해시 차이 시 **설치 금지**. 기존 R6 INSTALL도 계속 금지한다.
- 오프라인 3개 구조 회귀 시험, Node 구문, manifest 자체 해시, Linux 비-Windows 중단, ZIP CRC 및 CMD CRLF 확인. **실제 Windows R4 실행과 PC 운영 적용은 미검증**.

운영 source 설치 여부는 실행 경로 검증과 안전한 소강 시점 확인 후 결정한다. 운영 중인 잠금을 삭제하거나 실행 PID를 중단시키지 않고, 기존 스케줄러/VBS를 재구성하지 않는다.

## 14. R4 실행기 Node 경로 오류 보정 — FIX1

R4 사용자 Windows 스크린샷에서 `C:\nvm4w\nodejs\node.exe`가 현재 Windows와 호환되지 않아 **진단 JS 자체가 실행되지 않은 것**이 확인되었다. 운영 R10이나 Writer의 장애로 분류하지 않는다. 원래 R3에서 정상 실행한 `E:\ZGmini\runtime\node.exe` 고정 경로를 R4 CMD에서도 재사용하도록 **런처 파일만** 수정한다.

- 새 ZIP: `ASSET_R10_WRITER_ORIGIN_READONLY_R4_FIX1_20261029.zip`, SHA-256 `abc64ef55d9fdac87608d66dd164b1c80ba10db9179c0c69193a67e3c184f878`.
- 새 manifest SHA-256: `9d915c400c1d794261ac72ec87422af9213f1207e0addf3de7677c13b2bf85c1`.
- CMD는 PATH의 `node.exe`를 더 이상 사용하지 않는다. 고정 Node가 없거나 `--version` 실행 실패 시 `ASSET_R10_WRITER_ORIGIN_LAUNCH_RESULT.txt`에 `STOP_PINNED_NODE_MISSING` 또는 `STOP_PINNED_NODE_INCOMPATIBLE`을 기록하고 중단한다. 임의 설치·런타임 교체·PATH 변경을 하지 않는다.
- 진단 helper와 대상 조회 범위, 승인 source, R10 구현·검증 계약은 R4와 동일하다. 기존 `R4` ZIP 대신 새 `R4_FIX1`을 **새 폴더에** 압축 해제하고 CMD 1회 실행한다.
- Linux fixture 테스트는 Node 고정 경로 CMD의 Windows 실행을 증명하지 않는다. 실 Windows에서 수정 런처의 성공 여부는 사용자 결과 TXT로 확인한다. INSTALL·D1·스케줄러·VBS 변경 없음.

## 15. R4 FIX1 실제 PC 실행 결과 — 안전 중단 유지

2026-10-29 사용자가 제출한 `ASSET_R10_WRITER_ORIGIN_RESULT.txt`에서 `STATUS=READONLY_WRITER_ORIGIN_COMPLETED`, `MANIFEST_STATUS=HASH_VERIFIED`, `INSTALL_AUTHORIZATION=NO`를 확인했다. 수정 런처는 실제 Windows에서 진단 helper를 정상 실행했다.

**기존 승인 Writer 확인**

- `APPROVED_CHECKOUT_HEAD`, `CONFIG_SOURCE`, `LAST_WRITER_SOURCE` 모두 `a477ef304425145f559352af4291e437e3b08a2d` 일치, tracked dirty `NO`, Writer 마지막 상태 `VERIFIED`.
- `LAST_WRITER_AT=2026-10-29T14:00:50.753Z`; R10 훅 `ABSENT`; ledger `VERIFIED`. 기존 Writer가 실행된 기록은 있으나 이 자료만으로 **어느 예약 실행기에서 호출했는지**는 확인되지 않는다.

**실행 경로 확인**

- `CORE_TASK_ENABLED=YES`, `CORE_TASK_STATE=Running`. Core VBS SHA 일치; `R38_AUTO_DISPATCH` 호출, 직접적인 `run-local.mjs` / `local-cycle.mjs` / 승인 checkout 경로 문자열 없음.
- R38은 R31 scoped publication과 R33 observe 모듈을 참조하고, R31은 `d1.mjs`만 파일명으로 언급한다. 해당 체인에서 검사한 6개 고정 파일 모두 승인 Writer 경로 / `run-local.mjs` / `local-cycle.mjs`의 **정적 참조를 갖지 않는다**. 동적 경로 생성 가능성까지 부정하는 뜻은 아니므로 `WRITER_ROUTE=UNPROVEN`, `ROUTE_ASSESSMENT=NO_WRITER_REFERENCE_IN_PINNED_DISPATCH_CHAIN`을 유지한다.
- 기존 `Local-Korea` 정적 참조는 `lane==='core'&&publishAllowed` 조건상 Writer 게시 실행 근거가 아니다. 비활성 별도 Writer 작업도 임의 활성화하지 않는다.

**운영 충돌 방지**

- `LOCK_STATUS=PRESENT`, 경과 177초, PID `16360`. Windows CIM 조사 성공: `node.exe`이며 명령줄에 승인 checkout 및 `local-cycle.mjs`가 포함된다. 단 PID 생성 시점과 lock 생성 시점의 상대 순서는 `UNVERIFIED`이므로 잠금의 소유권·수명 완전 확정으로 확대하지 않는다.
- 동시 관련 프로세스 13개, Writer 경로 포함 1개, `local-cycle.mjs` 1개. `INSTALL_STOP_REASONS=LOCK_PRESENT,WRITER_EXECUTION_ROUTE_UNPROVEN`.
- **결론: R6 INSTALL 실행 불가.** 승인 checkout에 코드를 삽입하거나 config.source를 전환하지 않았다. 예약 작업·프로세스·잠금·원장·D1은 변경하지 않았다.

다음 작업은 예약 구성 변경이나 임의 프로세스 종료가 아니라 **실제 정규 Writer 호출 출처의 런타임 증거** 확인이다. 정규 실행 로그 또는 PID의 부모-자식 실행 증거가 확보되고, 별도의 안전한 유휴 시점에서 lock/ledger/source를 다시 확인한 경우에만 선택 적용 여부를 재판정한다. `AFTER_SHA=NOT_APPLIED`, `HOOK_STATUS=ABSENT`, `R10_SIDECAR_RAW/HISTORY=NOT_OBSERVED`, `D1_READBACK/NEXT_CYCLE=NOT_VERIFIED`로 유지한다.

## 16. R5 실제 부모 실행 경로·게시 분기 판독 패키지 — 미설치

R4의 정적 연결 검사는 실제 `local-cycle.mjs`의 부모 실행 경로를 확정하지 못했다. 또한 현재 브랜치의 `local-cycle.mjs`에서 `run-local.mjs` 호출은 `lane==='core' && publishAllowed` 조건에 종속된다. 최근 마지막 Writer 성공 기록만으로 **정규 Core 작업이 Writer 게시를 매번 호출한다고 판단할 수 없다**.

이를 보완하기 위해 기존 검사 결과와 소스만을 재사용하는 읽기 전용 R5 패키지를 준비했다.

- ZIP: `ASSET_R10_LIVE_LINEAGE_READONLY_R5_20261030.zip`, SHA-256 `e262cd7b19d0a7e17057242730e8a896df5c33cc94bca547507ffa97c2b2d1b5`.
- manifest: `scripts/pc-writer/asset-r10-live-lineage-r5/package-manifest.json`, SHA-256 `0fa06adb4de32f39bf09a2d7857966bc371074ff884844b41b465db2b90dd726`.
- `RUN_R10_LINEAGE_READONLY.cmd` 1회 실행 → 같은 폴더의 `ASSET_R10_LINEAGE_RESULT.txt` 제출. 런처 실패 시 `ASSET_R10_LINEAGE_LAUNCH_RESULT.txt`만 제출.
- 조회 내용: `local-cycle.lock` PID와 살아 있는 `local-cycle.mjs`·`run-local.mjs`의 부모 PID·실행 역할·`--korea`/`--publish` 플래그, 부모 PID 재사용에 대한 생성시각 방어, 기존 Core/Korea/비활성 Writer 예약 상태, 최신 `local-cycle-last-run`의 lane·publishAllowed·publicationExit, 승인 source/ledger/R10 훅 존재 여부. **프로세스 명령줄 원문·비밀값은 결과에 기록하지 않는다.**
- 대상 프로세스를 중단/대기/실행하지 않고, scheduler/VBS/config/잠금/SQLite/D1/source를 변경하지 않는다. Windows 사용자 CMD는 기존 검증된 `E:\ZGmini\runtime\node.exe`를 직접 호출한다.
- 코드 단위 회귀검사 5건, package hash self-check, Linux 비-Windows STOP, ZIP CRC 검증 통과. **Windows 현장 실행은 아직 하지 않았다.**

R5는 `CORE_VBS_TO_PUBLISH_CYCLE_OBSERVED`를 포착하더라도 **설치 승인으로 승격하지 않는다**. 프로세스가 없거나 부모가 먼저 종료한 경우에는 실행 출처가 여전히 미확정일 수 있다. 정규 Writer 연결 증명과 유휴·잠금 안전 검증이 완료되지 않은 상태에서는 R6 `RUN_INSTALL.cmd`를 실행하지 않는다. 만약 Core의 실제 예약 경로가 승인 Writer 게시를 호출하지 않는 것으로 확정되면, 기존 제한을 벗어나는 예약/VBS/R38 경로 변경을 임의 수행하지 않고 사용자에게 최소 변경 범위 승인을 요청한다.

## 17. R5 현장 증명과 R7 선택 설치 게이트 개정

2026-10-30 KST 사용자가 전달한 `ASSET_R10_LINEAGE_RESULT.txt`의 `STATUS=READONLY_LINEAGE_COMPLETED`, manifest `HASH_VERIFIED`를 확인했다. **R4의 정적 경로 미확정과 달리 실제 Core → Writer 실행 경로가 런타임 PID 계보로 확인됐다.**

- 정규 Core VBS(`wscript`, PID 34080/35468) → 승인 Writer checkout의 `local-cycle.mjs --publish`(PID 24872) → `run-local.mjs --publish`(PID 32452). `CYCLE_0_ROUTE_ASSESSMENT`와 `WRITER_0_ROUTE_ASSESSMENT` 모두 `CORE_VBS_TO_PUBLISH_CYCLE_OBSERVED`.
- 최근 완료된 Core 주기: `2026-10-29T15:47:10.530Z`, `lane=core`, `publishRequested=YES`, `publishAllowed=YES`, `publicationExit=0`, `status=COMPLETE`. 별도 마지막 Writer 실행 `2026-10-29T15:50:08.249Z`, `status=VERIFIED`.
- 운영 source HEAD/config/마지막 Writer source가 승인 `a477ef...` 일치, tracked dirty `NO`, ledger `VERIFIED`, **R10 훅 `ABSENT`**.
- 검사 시점에는 Core task `Running`, Korea task `Ready`, 기존 Writer task `Disabled`; `local-cycle.lock` 존재 및 살아 있는 PID 일치. **따라서 R5는 경로 증거이지 설치 허가가 아니다.**

이 관찰을 바탕으로 정적 문자열이 없다는 이유로 계속 STOP하는 R6 설치기를 **별도 보존된 R7 설치기**로 최소 개정했다. 기존 R6 ZIP/코드를 덮어쓰거나 현장 승인 source를 변경하지 않았다.

- R7 ZIP: `ASSET_R10_AUTO_CMD_R7_FINAL_20261030.zip` SHA-256 `41dfcd6a4ac9e9c4528fe20e11f4ef5749332fb0ec3cfeb359f76482a375da0d`.
- manifest: `scripts/pc-writer/asset-r10-cmd-r7/package-manifest.json` SHA-256 `967969962757ffd62f36731f9c127028e8efbf6a66c073e6bc650473f1a08b39`.
- 실제 설치 전 Core 예약 `wscript.exe`와 고정 VBS 경로, `run-local-core.vbs` SHA-256 `bb3e11c0b5c8da07162b1c824e7b52e7a7c2f987c079f29713211a2413932b01` 재확인. R5의 과거 PID만으로 현재 유휴·실행 안전 판정을 대체하지 않는다.
- Core와 Korea 두 예약 작업 모두 `Ready`/Enabled, 승인 Writer 관련 프로세스가 없음, 모든 `.lock` 부재, ledger 안전, 다음 Core 시작까지 120초 이상 남았을 때만 `READY_FOR_INSTALL`. 신뢰할 수 없는 프로세스 명령줄은 STOP. 설치 중에도 재확인하고, Git commit 후 config.source 변경 직전에는 30초 안전 여유를 별도로 검사한다.
- PREFLIGHT는 Core 실행 중/잠금/다음 실행이 임박한 **전형적인 일시적 상태만** 최대 8분, 10초 간격으로 읽기 전용 재조회한다. 타임아웃은 STOP이며 설치 자동 실행은 하지 않는다. 소스 SHA/의존성/예약 파일 해시 불일치 등의 구조 오류는 기다리지 않고 중단한다.
- Windows CMD 3개 모두 기존 고정 Node `E:\ZGmini\runtime\node.exe`만 사용한다. PATH의 호환되지 않는 Node로 폴백하지 않는다.
- R7의 PC 백업·영수증은 R7 전용 파일명(`r7-...`, `asset-r10-cmd-r7-install-receipt.json`)으로 R6 결과와 분리된다. 설치 시에도 기존 승인 checkout `run-local.mjs` 한 곳의 훅과 누락된 동일 SHA 의존 파일만 선택 적용한다. 기존 예약/VBS/수집기/DB/D1/산식/Cloudflare는 변경하지 않는다.
- 오프라인 회귀시험: R7 설치기 8건 + PR #893 sidecar 9건 **총 17건 PASS**, Linux 실행 차단, ZIP 무결성, Git 없는 압축본 테스트. **Windows R7 실제 PREFLIGHT/INSTALL 및 정규 D1 readback은 아직 하지 않았다.**

PC 실행 지침: 새 빈 폴더에 R7 ZIP을 압축 해제 → `RUN_PREFLIGHT.cmd` 1회. `STATUS=READY_FOR_INSTALL`인 경우에만 `RUN_INSTALL.cmd` 1회; 아니면 결과 TXT를 제출하고 설치 중단. 설치 성공 시 `PC_SOURCE_INSTALLED_AWAIT_NORMAL_CYCLE`은 코드 설치일 뿐 자동 갱신 완료가 아니다. 다음 두 정규 주기에서 `RUN_VERIFY.cmd`와 각각의 R10 raw/history D1 readback을 분리하여 재확인한다.

## 18. R7 실제 PC 중단과 R8 Writer 줄바꿈 동등성 검증

2026-10-30 KST 제출된 `ASSET_R10_CMD_PREFLIGHT_RESULT(1).txt`는 `STATUS=STOP`, `ERROR_CODE=STOP_WRITER_BASELINE_SHA_MISMATCH`였다. 첫 실패는 **승인 Git 원본과 현재 Writer의 바이트 단위 비교**다. 다음 사실만 PC 증거로 확정한다.

- `BEFORE_SHA`, `CONFIG_SOURCE`, `LAST_WRITER_SOURCE`가 모두 `a477ef304425145f559352af4291e437e3b08a2d`와 일치하고 `TRACKED_DIRTY=NO`, ledger `VERIFIED`였다.
- `TASK_ROUTE=VERIFIED_R5_PINNED_RUNTIME_ROUTE`, Core/Korea 모두 `Ready`, 당시 다음 Core까지 254초 여유가 있었고 실제 Writer 관련 프로세스 판정은 `CLEAR`였다.
- 최초 검사에서 `LOCK_STATUS=STOP_LOCK_PRESENT`였지만 이후 안전 검사에서는 잠금 검사를 통과해 소스 검증에 도달했다. 이것은 잠금의 삭제·유효성 영구 해제를 뜻하지 않는다.
- `HOOK_STATUS=UNVERIFIED`, `AFTER_SHA=NOT_APPLIED`, 백업/설치/sidecar/D1/다음 주기 검증 모두 미실행이다.

**원인 가설:** Windows의 `core.autocrlf` 등에 의해 worktree의 `run-local.mjs`가 CRLF, `git show HEAD:...`가 LF인 경우, Git은 clean으로 판단하나 R7 바이트 SHA가 달라진다. 실제 PC 파일의 줄바꿈 유형은 아직 확인되지 않았으므로 이를 확정 원인이라고 기록하지 않는다.

**최소 보정:** 기존 R7을 보존하고 R8 패키지에서 해당 비교와 훅 삽입만 수정한다. 앞선 `git status --porcelain` clean과 HEAD/소스·실행 경로·예약·잠금·원장 검사를 모두 유지한다. Writer 현재 텍스트와 지정 Git 객체를 각각 엄격한 LF 텍스트로 정규화한 뒤 **내용 전체가 정확히 같을 때만** 통과한다. 단독 CR·LF/CRLF 혼합·내용·공백 차이는 `STOP`이며, 원본 checkout의 CRLF/LF 형식을 훅을 넣은 결과에도 보존한다. `publication-guard.mjs` 및 기존 의존 파일 해시 검증은 완화하지 않는다.

- 새 ZIP: `ASSET_R10_AUTO_CMD_R8_20261030.zip`, SHA-256 `5a2be9965117e0131fd5d8e04d7540cc5ceb62e73bc170dfbf9eedecf3829216`.
- manifest: `scripts/pc-writer/asset-r10-cmd-r8/package-manifest.json`, SHA-256 `8e737a42d02680785ca323f86a8e9be5eef7fc7b2adf3c31b1b0027f1953c230`.
- 실행 코드: `scripts/pc-writer/asset-r10-cmd-r8/r10-ops.mjs`. 기존 PR #893 payload와 R7 예약 보호 조건을 재사용한다.
- R8 테스트: 설치기 10건 + PR #893 sidecar 9건, 총 19건 PASS. ZIP CRC 검사 통과. Windows 실제 PREFLIGHT/INSTALL 결과는 아직 미확인이다.

**현재 실행 지침:** 새 빈 폴더에 R8 ZIP 압축 해제 → `RUN_PREFLIGHT.cmd` **1회** → `ASSET_R10_CMD_PREFLIGHT_RESULT.txt` 제출. `STATUS=READY_FOR_INSTALL`라도 먼저 이 실 PC 결과에서 `WRITER_WORKTREE_EOL`, `WRITER_GIT_BLOB_EOL`, `WRITER_BASELINE_EQUIVALENCE`, 의존성·잠금 상태를 확인할 때까지 **INSTALL 실행 보류**. 중단 시 기존 R7 INSTALL이나 강제 소스 변경으로 우회하지 않는다. 새 테마·산식·예약·원장·DB·D1·Cloudflare는 변경하지 않는다.

## 19. R8 ZIP 재구성·검증 (2026-10-31)

직전 GitHub R8 커밋 `a22fd92b4d727ec5d2b36b36d985f27294da9a8a`의 소스를 R7 검증 ZIP과 고정 R8 파일별 SHA-256을 대조해 독립 실행용 ZIP으로 재구성했다. GitHub의 R8 manifest는 변경하지 않았고, **동일한 27개 manifest 대상 파일 + manifest 1개**만 ZIP에 포함했다.

- 다운로드 파일: `ASSET_R10_AUTO_CMD_R8_VERIFIED_20261031.zip`
- **이번에 실제 생성·검증한 ZIP SHA-256:** `b45c770323001135e4237a392c3149d488edcc54df02af64adbd1605cfdfbd66`
- 기존 문서 18절의 `ASSET_R10_AUTO_CMD_R8_20261030.zip`과 SHA-256 `5a2be996...`는 **이전 패키징 기록**으로 유지한다. 새 ZIP의 검증에 사용하지 않는다. 두 ZIP의 압축 바이트가 동일하다고 주장하지 않는다.
- GitHub R8 manifest 원본 SHA-256: `8e737a42d02680785ca323f86a8e9be5eef7fc7b2adf3c31b1b0027f1953c230` (이번 ZIP 내 manifest와 일치)
- manifest 내 파일 27개 SHA-256 검증 **PASS**, ZIP CRC/압축 해제 바이트 일치 **PASS**, Node 22.16.0에서 압축 해제본 회귀시험 19건 **PASS**. 비-Windows 실행은 `STOP_WINDOWS_ONLY`로 안전 중단 확인.
- 실제 Windows 운영 PC에서 PREFLIGHT/INSTALL/두 정규 주기/D1 개별 재조회: **미실행·미검증**.

**현장 절차:** 새 빈 폴더에 `ASSET_R10_AUTO_CMD_R8_VERIFIED_20261031.zip` 압축 해제 → `RUN_PREFLIGHT.cmd` 정확히 한 번 실행 → `ASSET_R10_CMD_PREFLIGHT_RESULT.txt` 제출. 특히 `WRITER_BASELINE_EQUIVALENCE`, `WRITER_WORKTREE_EOL`, `WRITER_GIT_BLOB_EOL`, `DEPENDENCY_STATUS`, 잠금·프로세스·스케줄러 상태를 확인하기 전 `RUN_INSTALL.cmd` 실행 금지. 원본/내용 차이가 계속 감지되면 우회하지 않고 `STOP` 상태를 보존한다.

## 20. R8 PC 혼합 줄바꿈 STOP 및 R9 최소 보정 (2026-10-31)

2026-10-31 제출된 R8 PC `ASSET_R10_CMD_PREFLIGHT_RESULT(2).txt`는 `STATUS=STOP`, `ERROR_CODE=STOP_WRITER_MIXED_LINE_ENDINGS`. 승인 HEAD/config/last Writer 모두 `a477ef...`, tracked dirty `NO`, Core/Korea `Ready`, process `CLEAR`, lock `CLEAR`, ledger `VERIFIED`. `AFTER_SHA=NOT_APPLIED`, R10 설치·D1 확인은 미실시. 혼합 줄바꿈의 원본/checkout 중 어느 쪽에 존재하는지는 미확정이며 이 결과만으로 코드 동등성은 입증되지 않았다.

R9은 원본 안전 검사를 삭제하지 않고 `git show a477ef...:scripts/pc-writer/run-local.mjs`와 작업 파일의 모든 문자·공백·내용을 실제 비교한다. `CRLF`에서 `CR`만 제거한 정규화 결과가 100% 같고 tracked clean·승인 경로·scheduler·lock·ledger·의존성 조건이 모두 충족되어야 `READY_FOR_INSTALL`이다. 단독 CR은 STOP. 신규 R10 훅은 앵커 바로 앞에 삽입하며 **기존 파일의 모든 줄바꿈 바이트를 그대로 보존**한다. 출력에 양쪽 CRLF/LF 개수·EOL 종류를 기록한다.

- 패키지: `ASSET_R10_AUTO_CMD_R9_VERIFIED_20261031.zip` SHA-256 `f67a2fe21430cb29c5db549e690b659a747a85d0e0ee87062bd1bbe9d49b23e5`.
- manifest SHA-256 `bf9ab604b0c9cf86680f15e86b6395575655bb1a8b394c67f1c459358827c0ba`.
- ZIP 내 manifest 대상 파일 27개 + manifest 1개, 파일별 SHA 및 ZIP CRC 검사 PASS, 압축 해제본 Node 22.16.0 테스트 총 **21건 PASS**, 비-Windows `STOP_WINDOWS_ONLY` 확인.
- 소스는 같은 브랜치의 `scripts/pc-writer/asset-r10-cmd-r9/` (R8과 R7은 보존).
- **다음 PC 조치:** 새 폴더에 압축 해제 → `RUN_PREFLIGHT.cmd` 1회 → `ASSET_R10_CMD_PREFLIGHT_RESULT.txt` 제출. **실 PC R9 결과 확인 전 INSTALL 금지**. 완료/게시/D1 검증으로 표기 금지.

## 21. R9 운영 PREFLIGHT 중단 및 R10 게시 호환성 파일 EOL 검사 (2026-10-31)

R9 PC 결과 `ASSET_R10_CMD_PREFLIGHT_RESULT(3).txt`: `STATUS=STOP`, `ERROR_CODE=STOP_PUBLICATION_COMPATIBILITY_HASH_MISMATCH`. 승인 HEAD/config/source `a477ef304425145f559352af4291e437e3b08a2d`, `TRACKED_DIRTY=NO`, Writer 본문 `EXACT_CONTENT_WITH_ALLOWED_EOL` (worktree CRLF 244/LF 1, Git LF 245), `HOOK_STATUS=READY_TO_PATCH`, Core/Korea Ready, 프로세스·잠금 CLEAR, ledger VERIFIED. `AFTER_SHA=NOT_APPLIED`, 백업·테스트·D1 및 설치 미실행. Guard 바이트 SHA 불일치는 EOL 때문인지 **미확정**.

R10은 `publication-guard.mjs`를 절대 교체하지 않으며 고정 PR #893 Guard와 실제 파일의 UTF-8 텍스트 전체를 비교한다. byte-exact 우선, 불일치 시 CRLF의 CR만 제외한 **정확한 전체 텍스트 일치** 및 standalone CR/비정상 UTF-8 부재에만 한정해 통과시킨다. 이 기준은 이미 존재하는 동일 SHA 의존 파일에도 적용하며, 기존 tracked clean, 승인 source, Core/Korea 유휴, 잠금·프로세스·ledger·스케줄러 STOP 조건은 유지한다. 새로운 진단 필드: `PUBLICATION_GUARD_EQUIVALENCE`, `PUBLICATION_GUARD_EOL`, `DEPENDENCY_EOL_VARIANTS`. 코드·공백 차이는 `STOP_PUBLICATION_COMPATIBILITY_CONTENT_MISMATCH` 또는 `STOP_DEPENDENCY_CONTENT_MISMATCH`로 차단한다.

- R10 ZIP: `ASSET_R10_AUTO_CMD_R10_VERIFIED_20261031.zip`, SHA-256 `d8401a005b60fd149876efccbba24eb26ab82a9830e15717e81948aa4f2cd7d3`.
- Manifest SHA-256: `32f6e5ef8ba2350b45d13711c9ba0ff1b4ec93d4de4b911d42a5703c45f30833`.
- ZIP 28개 파일 바이트·manifest 27개 해시·압축 해제본 Node 22.16.0 회귀시험 23건 PASS; 비-Windows `STOP_WINDOWS_ONLY` 확인. **Windows R10 실측은 아직 없음**.
- 기존 `asset-r10-cmd-r9` 포함 모든 기존 패키지 보존. 코드/테스트/manifest는 `scripts/pc-writer/asset-r10-cmd-r10/`에 저장.
- 실행: 새 폴더 압축 해제 → `RUN_PREFLIGHT.cmd` 정확히 1회 → 결과 `ASSET_R10_CMD_PREFLIGHT_RESULT.txt` 회수. 현장 검증 이전 `RUN_INSTALL.cmd` 실행 금지. 배포/스케줄러/D1/PC Writer는 변경하지 않았다.

## 22. R10 Windows READY/LOCK 표시 불일치 및 R11 보호 (2026-10-31)

PC R10 `ASSET_R10_CMD_PREFLIGHT_RESULT(4).txt`는 `STATUS=READY_FOR_INSTALL`과 `LOCK_STATUS=STOP_LOCK_PRESENT`를 함께 보고했다. `HOOK_STATUS=READY_TO_PATCH`, `TRACKED_DIRTY=NO`, `PROCESS_STATUS=CLEAR`, `LEDGER_STATUS=VERIFIED`, `DEPENDENCY_STATUS=MATCHED_WITH_MISSING`, `MANIFEST_STATUS=HASH_VERIFIED`, `AFTER_SHA=NOT_APPLIED`. Writer와 Guard는 코드 전체 일치 + 허용된 EOL 차이로 검증됐고, 기존 의존성의 EOL variant 9건이 확인됐다. 잠금의 최초 발견 이후 `assertIdle`에서 해소됐을 수 있으나 실제 변화 시점·소유자는 별도 확증되지 않았다. 따라서 R10 결과만으로 INSTALL 실행을 권하지 않는다.

R11은 기존 R10 코드/산식/소스/DB/스케줄러를 유지하며, `assertIdle`가 실제로 읽은 잠금과 ledger 결과를 보고서에 다시 기록한다. 수 분 걸리는 파일/의존성 검사 뒤에도 **최종 유휴 상태 재조회 및 READY 결과 정합성 검사**를 통과해야 `READY_FOR_INSTALL`이다. `RUN_INSTALL.cmd`는 새 호출 시 기존 preflight + 설치 직전 추가 라이브 검사를 수행한다. 기존 잠금을 삭제하지 않으며 제어 작업을 끄거나 중단하지 않는다.

- 새 ZIP: `ASSET_R10_AUTO_CMD_R11_VERIFIED_20261031.zip`, SHA-256 `b3c065c0c2c8e9a85f67f782227defb163068f9322909ec50f2d69720ca4219c`.
- ZIP 28개 파일 바이트 대조 및 27개 manifest SHA-256 PASS. Manifest SHA-256: `fb51ea06206dd0900b7fe0aa5bf0d8ba70b52b0f5fea6d002ccdde01261a1000`.
- Node 22.16.0 압축 해제본 회귀시험 **25개 PASS**; 비-Windows `STOP_WINDOWS_ONLY` 검증 PASS. Windows R11 실측/설치/정규 주기/D1 readback **미검증**.
- 기존 R10 버전 보존. 작업 브랜치 새 경로 `scripts/pc-writer/asset-r10-cmd-r11/`.
- 다음 PC 실행: 새 폴더 압축 해제 후 `RUN_PREFLIGHT.cmd` 정확히 1회; 결과 확인 전 INSTALL 금지. STOP이면 잠금/프로세스를 수동 제거하지 않는다.

## 23. R11 one-shot 설치 중단 및 R12 단일 호출·CMD 기본 인터페이스 개선 (2026-10-31)

사용자 PC `ASSET_R10_CMD_INSTALL_RESULT(2).txt`는 `STATUS=STOP_INSTALL_FAILED`, `ERROR_CODE=STOP_CORE_NEXT_RUN_TOO_NEAR`, `CORE_NEXT_RUN_MARGIN_SEC=118` (기준 120초), `BEFORE_SHA=a477ef...`, `AFTER_SHA=NOT_APPLIED`, `BACKUP_STATUS=VERIFIED_LOCAL_ONLY`, `RESTORE_STATUS=PRECOMMIT_FILES_RESTORED`. Core/Korea Ready, lock/process CLEAR, ledger VERIFIED이며 R10 설치와 D1 원격 검증은 미실행. 이 결과는 기존 운영 장애가 아니라 설치 중 안전 게이트 중단이다.

R12는 기존 R11 one-shot의 중복 preflight 문제를 보완한다. R12 `RUN_INSTALL.cmd`는 단독으로 source/route/manifest/ledger 검사를 실행하고, Core 예약 작업까지 최소 **230초** 남은 유휴 상태를 **최대 8분** 찾는다. 조건을 못 찾으면 소스를 변경하지 않고 STOP; 예약 작업을 끄거나 lock을 제거하지 않는다. 검사 완료 후 한 번만 설치하며 소스 수정/테스트 후에도 기존 120초 보호를 유지하고 다시 재검사한다. **Windows 상태 조회에서 금지된 PowerShell 호출을 제거**, CMD에서 `cscript.exe`로 실행하는 허용된 기본 Windows `Schedule.Service` COM 및 `Win32_Process` WMI 읽기 전용 보조 스크립트로 대체했다. 출력에는 작업 상태와 대상 프로세스 활동 여부만 남긴다.

- 패키지: `ASSET_R10_AUTO_CMD_R12_VERIFIED_20261031.zip`.
- ZIP SHA-256: `fbc35b8a1da4e280fc8760572d3b7e52eff74b6ee6ed42c4de2e414d897dde33`.
- Manifest SHA-256: `91a3020b24dfad05b539d7ea505f43f3c64b8eeb2031aa8125acd3fe26fb8c3a`.
- 28개 manifest 대상 파일 + manifest 1개 ZIP 무결성 PASS, 기존 payload/CMD byte identity PASS, Node 오프라인 회귀시험 **28/28 PASS**, 비-Windows preflight/install `STOP_WINDOWS_ONLY` PASS.
- 기존 R11/one-shot 패키지는 변경하지 않았고, 브랜치 경로는 `scripts/pc-writer/asset-r10-cmd-r12/`. Windows COM/WMI 동작 및 실제 설치/정규 D1/두 주기: **미검증**.
- PC 다음 조치: 새 폴더 압축 해제 → `RUN_INSTALL.cmd` **1회만 실행** (별도 PRE-FLIGHT/one-shot CMD 선행 금지). 오류나 결과 불명확 시 재실행 금지, `ASSET_R10_CMD_INSTALL_RESULT.txt` 제출. 성공 후 `RUN_VERIFY.cmd` 및 별도 D1/API readback 필요.
