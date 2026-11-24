# R54 Source Lease 통합 범위 및 실행 원장

- 기준일: 2026-11-25
- 저장소: `ansqhd5774-Choi/zgmini`
- 총괄 브랜치: `codex/w03-r54-integration-master-20261125`
- 기준 브랜치: `codex/theme-fear-greed-integration-20261025`
- 핵심 PR: #1580
- 역사적 소스 PR: #983; 원본 보호 브랜치: `codex/theme-r54-source-lease-20261105`
- 상태: **통합 소스 작성됨 / CI 및 운영 검증 미완료 / 배포 금지**

## 1. 실제 목적 — 파일 사용 중 동시 소스 변경 금지

동일 PC의 R54 프로그램 파일을 **실행하거나 교체하는 협력 프로세스** 사이에 동일한 원자적 디렉터리 잠금 경로 `E:/ZGmini/data/pc-writer/theme-nine-r54/R54_B_SOURCE_EXCLUSIVE.lock`을 사용하여 경쟁을 차단한다.

이는 파일에 접근하는 모든 임의 프로그램을 운영체제가 강제로 막는 범용 파일 잠금이 **아니다**. 동일 잠금 규약을 적용하지 않은 프로세스는 제어하지 못한다. 설치 대상 범위와 전체 실행 구간이 실제로 보호되는지 검증해야 한다.

## 2. 포함되는 작업

| 구분 | 정확한 대상 | 목적 |
|---|---|---|
| 공통 잠금 모듈 | `scripts/pc-writer/r54-source-lease.mjs` | NTFS 원자 mkdir, OWNER 일치 확인, 불명확 시 fail-closed |
| R54 실행 | `scripts/pc-writer/theme-nine-r54-public-connect.mjs` | 실행 전 잠금 획득, awaited 처리 완료 뒤 해제 |
| R78 교체 | `scripts/pc-writer/theme-ten-r78-repair-and-retry.mjs` | `applyPinnedFiles` 소스 교체 보호 |
| R80 교체 | `scripts/pc-writer/theme-ten-r80-rebase-once.mjs` | `pinnedInstall` 소스 교체 보호 |
| 회귀검증 | `tests/theme-r54-source-lease.test.mjs` | 경합, 원본 바이트 유지, 이상소유자, 종료, 경로 적용 |
| 독립 PC 제어 호환 | `zgmini-pc-control/tools/update.mjs` | 기존 B 설치기의 동일 경로·OWNER 스키마 호환성 확인, 별도 저장소를 본체 브랜치에 병합하지 않음 |

## 3. 명시적 제외

- `codex/theme-r54-confirmed-bootstrap-20261108`: 확정 데이터 초기화·게시 기능. Source Lease 범위가 아님
- `codex/theme-r54-biotech-reanchor-20261106`: 바이오테크 테마 데이터 기능. Source Lease 범위가 아님
- `employment-r54-*`, `codex/w04-r54-*`: W04 고용지표 또는 독립 기능. Source Lease 범위가 아님
- 새 D1/SQLite/Provider 수집·계산·게시 변경
- 임의 운영 Task disable, 임의 lease 삭제·회수, 구형 6파일 B 자동 재실행
- 구 PR 전체 병합으로 현 W03 코드 덮어쓰기

## 4. 작업 실적 및 검증 게이트

1. [완료] W03 현재 브랜치를 기준으로 별도 총괄 브랜치 생성.
2. [완료] 구형 원자 잠금 소스에서 유효한 **5개 파일**을 최신 W03 코드에 선택 통합. 구형 전체 브랜치 merge 아님.
3. [완료] 총괄 PR #1580에서 대상 W03 브랜치 대비 ahead 5 / behind 0, 5파일 변경, GitHub `mergeable=true` 확인.
4. [대기] 통합 소스의 Node 회귀시험 **실제 실행** 및 CI 성공 영수증 확보. 시험 코드 10개가 존재한다는 사실은 PASS가 아님.
5. [대기] PC 제어와 R54 Writer 간 동일 경로/OWNER 및 경쟁시험 검증, 현재 Windows Task의 실제 실행 명령/소스 계보 확인.
6. [대기] W03 소유 브랜치로 병합 승인, 운영 적용 및 후검증. 진행 전까지 #1580 Draft 유지.

## 5. PR 정리 원칙

- #1580: 실제 Source Lease 통합 PR로 유지.
- #1578: 과거 source lease 원본의 통합 경로 추적용; 코드가 #1580에 재구성되어 있으므로 중복 병합 금지.
- #1579: 동일한 R54라는 명칭만으로 잘못 만든 **별개 데이터 초기화 통합 PR**; 미병합 닫고 원본 기능 브랜치는 변경하지 않음.
- #983: 기존 보호 기능/승인 V3의 역사적 자료. 운영 검증 완료 전까지 완료·설치 성공으로 변경하지 않음.

**성공 기준:** 동일 보호 경로로 실제 실행/교체 경합이 직렬화되고, 경합 중에는 변경 바이트 0, 장애·재시도 후 정상 복구, 기존 다른 작업의 실행 동작 회귀 0. 확인 없이 완료 판정 금지.
