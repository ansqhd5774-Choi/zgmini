# 자산 버블 R10 — PC Writer 자동 갱신 운영 적용 R5

## 목적

이미 GitHub `main`에 병합된 R10 6개 원자료·1년 이력 자동 게시를 **실제 승인 PC Writer**에 선별 적용한다. 기존 산식·수집기·D1 구조·Cloudflare·스케줄러를 변경하지 않는다.

## 확인된 사실 (2026-10-29, 모든 시각 UTC)

- GitHub `main` R10 구현: `8a7634a5358cb19280725fe29a977ba4feb44be8`, PR #893.
- PC `config.source`: `a477ef304425145f559352af4291e437e3b08a2d`.
- 2026-10-29T09:45:07.561Z `local-writer-last-run.json`의 `source`도 `a477ef...`, `assetR10Sidecars`는 `NOT_RECORDED`.
- `ZGMINI-PC-Local-Core`로 등록된 VBS는 `E:\ZGmini\data\pc-writer\cutover-evidence\inflation-r37-2026-10-20T19-39-19-549Z\run-local-core.vbs`이며, `WorkingDirectory`는 `E:\ZGmini\projects\zgmini-inflation-r37-stage` (SHA `1364b01b...`). 이 경로는 승인 Writer SHA와 다르다.
- `quota-runner-last-run.json`은 2026-10-19T17:00:01.494Z 기록이다. 현재 등록 작업과 같은 실행 경로라고 단정하지 않는다.
- 과거 PC R1 진단의 운영 저장소 후보는 `E:\ZGmini\projects\zgmini-earnings-history-pc-release`였다. **현재 실제 운영 소스라고 재검증하기 전까지 변경하지 않는다.**
- 기존 `ZGMINI-PC-Writer`는 비활성 복구용이며 활성화하지 않는다.

## 로컬 Codex 실행 지시

1. 실제 Windows PC에서 이 저장소 `AGENTS.md`, `docs/PC_STORAGE_E_DRIVE.md`, `docs/PC_WRITER_R2.md`를 읽는다. 명령 실행은 CMD만 사용한다. RDC, PowerShell, WSL을 사용하지 않는다.
2. `E:\ZGmini\data\pc-writer\config.json`, 마지막 Writer/Core/cycle/ledger 기록, 현재 등록 작업을 **읽기 전용**으로 대조하여, `a477ef304425145f559352af4291e437e3b08a2d`를 실제 실행하는 Git checkout을 정확히 찾아낸다. 후보별 `git rev-parse HEAD`, `git status --porcelain`, `git cat-file -t <SHA>` 확인. 다른 SHA인 `zgmini-inflation-r37-stage`에 패치하지 않는다.
3. 승인 checkout을 식별할 수 없거나 tracked dirty, publisher 진행 중, ledger `SUBMITTING`, 운영 소스 충돌이면 **STOP**. 승인 없이 스케줄러 재등록·소스 전환·Git reset/stash/clean/pull/rebase 금지.
4. 실제 실행 `run-local.mjs`에 PR #893의 R10 sidecar 호출이 이미 있는지 확인한다. 있는 경우 중복 적용 금지. 없는 경우 기존 점수 D1 읽기·검증 직후에만 PR #893의 13줄 호출을 선별 회수한다. 새 모듈 `scripts/pc-writer/asset-r10-sidecar-auto-publication-r1.mjs`를 같은 `main`에서 회수한다. 원자료·이력 생성에 필요한 5개 의존 파일이 대상 승인 checkout에 있는지, 공개 키·계약·모듈 버전이 일치하는지 검증하고 다르면 임의 덮어쓰지 말고 STOP.
5. 적용 범위는 위 코드와 회귀 테스트로 제한한다. 산식·가중치·DB·TTL·수집 주기·스크립트 launcher·VBS·예약 작업·DNS·Cloudflare Cron을 변경하지 않는다. GitHub 작업 브랜치는 기존 `codex/api-site-integration-r1-20261026`를 사용하고 새 브랜치를 만들지 않는다. 운영 checkout 전체를 `main`으로 교체하지 않는다.
6. 선택된 변경의 문법·회귀 테스트, `publicationCompatibility` 계약, 현재 Writer 원자료 스냅샷 검증을 실행한다. 실패하면 신규 운영 소스를 승인하지 않는다.
7. 실제 적용을 위해 새 로컬 commit을 만들어야 한다면 지정 파일만 명시 stage, exact SHA 기록, config의 승인 소스 전환 전후 호환성을 확인한다. `config.source` 변경은 변경 파일·운영 SHA·복구 계획을 함께 검증한 **R10 기능 선별 적용 범위**로 한정하고, 원본 설정을 안전하게 보존한다. 상태 미확정이면 설정을 수정하지 않고 STOP.
8. 이미 등록된 정규 PC 실행을 기다려 `local-writer-last-run.json`의 정확한 `source`와 `assetR10Sidecars` 상태를 확인한다. 다른 작업을 강제 실행하거나 동일 lane을 중복 실행하지 않는다.
9. 신규/동일 데이터에 대해 R10 원자료·1년 이력 **각각 D1 재조회**로 `sourceVersion`, `sourceStoredAt`, 관측 분기, 6개 지표, 최근 완료 5분기, 결측 유지와 점수 보존을 검증한다. 무변경이면 `UNCHANGED_VERIFIED`로 기록한다. 다음 정상 주기에도 훅 실행 여부를 확인한다.

## 완료 기준 / 회신

- `SOURCE_ROOT`, `BEFORE_SHA`, `AFTER_SHA`, `TRACKED_DIRTY`, `HOOK_STATUS`, `TEST_STATUS`, `CONFIG_SOURCE`, `LAST_WRITER_STATUS`, `R10_SIDECAR_RAW`, `R10_SIDECAR_HISTORY`, `D1_READBACK`, `NEXT_CYCLE`을 키·API 응답 원문 없이 기록한다.
- GitHub 소스 반영, 실제 PC 설치, 원격 D1 readback, 자동 주기 증거를 별도 상태로 보고한다.
- 설치한 경우에만 `PC_AUTO_REFRESH_VERIFIED`를 선언한다. 다른 정상 작업을 재시작하거나 설치 도중 재등록하지 않는다.

## 근거

- [PR #893](https://github.com/ansqhd5774-Choi/zgmini/pull/893)
- [PC Writer 운영 계약](https://github.com/ansqhd5774-Choi/zgmini/blob/main/docs/PC_WRITER_R2.md)
- [PC 저장 경로 계약](https://github.com/ansqhd5774-Choi/zgmini/blob/main/docs/PC_STORAGE_E_DRIVE.md)
