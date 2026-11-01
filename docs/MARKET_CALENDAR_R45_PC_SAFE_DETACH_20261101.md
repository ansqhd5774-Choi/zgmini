# R45 PC 옵저버 단일파일 보호 해제 — 설치 전 인수인계

작업 저장소: `ansqhd5774-Choi/zgmini`  
작업 브랜치: `codex/zgmini-gpt-workspace-20261025`  
상태: **GitHub 개발·합성 테스트만. 실제 Windows PC 적용/중단 미실행.**

## 왜 필요한가

- 사용자는 FHS-R3 재무건전성 평가를 **연 1회 수동 수집·검증·게시**하기로 결정했다. 시장 중요도 R43 연구를 위해 R45 스냅샷을 정규 Core에 자동 보관하도록 확대한 작업은 더 이상 필수 운영 범위가 아니다.
- `bd787c3` 작업 브랜치에서는 이미 `collect-local.mjs`의 R45 옵저버 주입을 제거했다. 그러나 사용자 PC에는 **R53 + R56 FIX1**의 별도 로컬 Git 설치본이 남아 있을 수 있으며, GitHub 수정은 이를 자동 정지시키지 않는다.
- 사용자 PC R56 FIX1 성공 증거: `previousSource=1afc5c7bb28c9d87acf03d85fe20ae3c45013fd3`, `newSource=154c5ac25120ecf8292b630ca9b1e30edad1ed75`, `worktreeId=d0a4b3cb8b95`, 변경 파일은 MarketParquet provider 1개. 원래 R53 설치 당시 `collect-local.mjs` R45 옵저버가 별도로 설치되어 있었다.

## 구현

`scripts/pc-writer/market-calendar-r45-pc-detach.mjs`는 **대상 PC 소스 파일 한 개** (`scripts/pc-writer/collect-local.mjs`)만 선택적으로 변경하는 옵트인 도구다.

1. 기본 실행은 **읽기 전용 preflight**. 정확한 R51 Core Task 실행기 체인, 작업 트리 식별자, 승인된 `config.source`와 실제 HEAD, 보호 경로 clean, Node 24, 목표 파일 인코딩/내용을 확인한다. 잠금 생성·파일 수정·API 호출·수집·게시 없음.
2. 실제 해제는 명시적으로 `--apply`할 때만 가능하다. 사용자 R56 FIX1 이후 승인 HEAD `154c5ac...`와 구버전 `collect-local.mjs` Git blob `f940b9b...`가 **동시에 일치**하지 않으면 변경하지 않는다.
3. 확인된 이전 파일에서 정확히 세 블록만 제거한다: R45 sidecar import, `R45_MARKETPARQUET_SNAPSHOT_OBSERVER` 등록, `marketCalendarR45` 보고 필드. 결과 Git blob `40bd7edd...`와 다른 변경이 나오면 중단한다. B1/MarketParquet 제공자 로직과 기존 FHS 산식·등급은 보존한다.
4. `--apply`는 정규 Core 잠금이 **즉시 FREE**일 때만 원자적으로 잠금을 획득한다. 잠금이 BUSY/ORPHAN/UNKNOWN이면 **기다리지 않고 중단**한다. 잠금 삭제/강제 해제·Core 종료·예약 작업 조정 금지.
5. 잠금 아래 원본 파일과 config를 **개인 PC 전용 백업**, 정확한 1파일 로컬 Git 커밋, 새 `config.source` 재조회까지 통과하면 `R45_DETACH_INSTALLED_LOCAL_ONLY`다. Git push 없음. 이미 정확히 해제된 파일은 재실행 시 `R45_DETACH_ALREADY_OFF_NO_CHANGES`로 보고하고 다시 쓰지 않는다.
6. 소스·config·Task이 바뀌었거나 파일 내용이 예상과 다르면 STOP. 부분 커밋 이후 문제는 자동 reset하지 않고 `R45_DETACH_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP`으로 사람의 안전 복구를 요구한다.

## PC 적용 전/후 구분

- 개발 검증: `node --test tests/market-calendar-r45-pc-detach.test.mjs`로 정확한 파일 변환, 드라이런 무변경, 변경된 HEAD 차단, Core 잠금 점유 시 무변경, 합성 적용·readback·재실행 무변경 확인.
- 실제 PC 사용자 적용: 현재 PC가 **승인 HEAD 그대로**이고 실제 Core가 실행 중이 아닐 때, 이미 등록된 실행기·설정 경로를 읽기 전용으로 먼저 대조하고 기존 Node/CMD 환경에서 위 스크립트를 호출한다. 프리플라이트 `R45_DETACH_PREFLIGHT_READY_NO_CHANGES` 없이 `--apply`를 실행하지 않는다.
- 실제 PC 적용 결과를 본 뒤만 `PC_R45_OBSERVER_DISABLED`라고 기록한다. 공급자 데이터를 강제 수집하여 확인할 필요는 없다. 기존 E: 저장본은 삭제하지 않고 보존한다.
- 백업은 실패 복구용 필수 사본으로 사용자의 E: 운영 폴더 안에 생성되며, **적용 성공 또는 실패 이후 무단 삭제하지 않는다**. 불필요한 TXT나 대량 진단 파일은 생성하지 않는다.
- `main`의 연간 FHS-R3, 공개 등급, D1, Cloudflare, API 호출, Core 5분 일정/런처, 다른 프로젝트 데이터는 변경 대상이 아니다.

## 안전 중단 기준

| 상황 | 결과 |
| --- | --- |
| PC HEAD가 R56 FIX1 성공 SHA와 다르거나 config.source가 다름 | STOP, 승인 소스 재확인 (새 PC 변경을 덮지 않음) |
| Core 잠금 BUSY/ORPHAN/UNKNOWN 또는 quota lock 있음 | STOP, 잠금 건드리지 않음 |
| 이전 R45 옵저버 파일 blob과 다름 | STOP, 기존 코드 보존 |
| 이미 해제된 정확한 파일 | ALREADY_OFF, 변경 없음 |
| 개발 GitHub 커밋만 존재 | `PC 적용 완료`가 **아님** |

**주의:** 본 개발 도구가 PC를 원격으로 수정하지 않는다. 승인된 E: 경로·실제 실행 명령이 현장 점검과 일치하지 않으면 패키지를 무리하게 재실행하지 않는다.
