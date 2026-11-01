# R52 — Core 잠금 자연 해제 대기 및 R45 조건부 설치

## 사용자 PC 실측

`MARKET_CALENDAR_R51_PC_APPLY_RESULT.txt`에서:

| 항목 | 값 |
|---|---|
| Core 원점 | `R48_LEGACY_R38` 확인 |
| 실제 Core worktree ID | `d0a4b3cb8b95` |
| 설치 전 PC HEAD | `43e0ffa392a9e655bcb4ca7b151c26ad43567e14` |
| 승인 변경 파일 | 정확히 4개 |
| 중단 단계 | `CORE_LOCK_ACQUIRE` |
| 중단 사유 | `R46_CORE_LOCK_BUSY_STOP` |
| 소스·DB·예약 작업·Git push·공개 변경 | 0 |

R51의 실제 Core VBS→Git 작업 폴더 추적과 R46 preflight가 통과한 것은 확인됐지만, **R45 PC 설치 성공은 아니다**.

## 정상적인 기존 잠금 동작

기존 `scripts/pc-writer/local-cycle.mjs`가 정상적으로 끝나면 `finally`에서 `local-cycle.lock`을 삭제한다. 다음 정규 주기가 시작했을 때 기존 잠금의 PID가 존재하지 않는 것으로 확인되면 `*.interrupted-*` 파일로 보존하고 새 잠금을 획득하는 로직이 이미 있다. 자동 수집을 새로 호출하거나 이 회복 로직을 임의 실행할 필요가 없다.

## R52 범위

1. `E:\ZGmini\data\pc-writer\local-cycle.lock`을 읽기 전용으로 확인하고, PID·시간 형태 및 `process.kill(pid,0)`으로 소유 프로세스 존재 여부만 검사한다. PID 원문은 결과에 출력하지 않는다.
2. 소유 프로세스가 살아 있으면 최대 3분 대기한다. 그 사이 잠금이 자연 해제되고 `quota-runner.lock`도 없으면 R51→R46 보호 설치기를 **그대로** 다시 실행한다.
3. PID가 사라진 고아 잠금은 보존하고 중단한다. 손상되거나 판정 불가능한 잠금도 보존하고 중단한다. R52는 `unlink`, `rename`, 예약 작업 실행, 강제 종료를 수행하지 않는다.
4. R51→R46의 Git HEAD↔PC config source, 소스 clean, exact patch, B1 잠금, 백업/롤백, 4파일 로컬 commit, config 갱신 보호는 그대로 유지한다.
5. 시가총액 API·강제 수집·DB·스케줄러·사이트 공개·GitHub push·`main` 병합 없음.

합성 테스트: 잠금 소유 프로세스 생존 확인·고아 잠금 보존·EEXIST 경쟁 재시도·대기 만료와 쓰기 방지 총 4개 통과. R51 원점 추적 5개와 R46 설치/복구 6개는 그대로 재사용.

성공 판정은 `R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION`일 때뿐이다. 그 외 결과는 소스가 변경되지 않은 상태이거나 R46에서 직접 보고한 별도 단계일 수 있으므로 결과 파일로 확인한다.

브랜치: `codex/zgmini-gpt-workspace-20261025`.
