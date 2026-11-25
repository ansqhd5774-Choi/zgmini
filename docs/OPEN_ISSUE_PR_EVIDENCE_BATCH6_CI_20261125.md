# ZGMINI Issue·PR 6차 증거검증 — 후속 CI 범위 검증

기준일: 2026-11-25 KST. 담당 브랜치 `codex/issues-lifecycle-manager-20261123`.

## 조사 목표
본체/PC 제어 기존 CI 자동 이슈 #3517, #3518, #3531의 실제 동일 검사 성공을 확인하고 가능하면 종결. 동일 Workflow 성공을 동일 버그 수정 증거로 오인하지 않는다.

## 확인된 원본
- #3517 C996 Run 45574811728 / Job 139069993380: `tests/rollback-first-evidence.test.mjs` line 6에 literal `\\nimport`가 포함된 상태로 SyntaxError. 이어 Run 45593678870은 다른 PR (#3547)에서 변환 계약 테스트 실패.
- #3518 Maintenance Run 45575303651 / Job 139071665776: 동일 `tests/rollback-first-evidence.test.mjs`의 SyntaxError로 test 373 중 1 실패.
- #3531 Maintenance Run 45581633856 / Job 139092854681: `tests/maintenance-recovery.test.mjs`의 #3516 unapproved proposal SHA assert mismatch. expected `d9ad185a92bcc20f2f73bc33e3cf77694337ccd17f704627162921b8564baecb`, actual `5f66fcd2bac89bfce6b0b582909009b13a37f9b93fa1d56653fdb0162e8d06ca`.

## 현재 main 직접 확인
- `tests/rollback-first-evidence.test.mjs` blob `4cf3cae286bf1aae19d803415e9c9514c63b3acd`: 실제 정상 줄바꿈과 line7 import. 과거 SyntaxError 발생한 literal `\\n`는 현재 main에 없음.
- `tests/maintenance-recovery.test.mjs` blob `e3a68de78826e782cd77a62cfecc7799204d9376`: 과거 실패 test line 번호와 현재 파일 line 번호 차이 있음. 안전 승인 SHA의 올바른 identity 별도 확인 필요.

## 후속 CI 직접 조회
- #3547 후속 HEAD `50c377a7a92f61ea656cc1bf42c3e15a88c2089f`: PR workflow C996 Run **45594416465** `completed/success`, Secret Scan **45594416458** `completed/success` 직접 확인.
- C996 Run **45594416465** / Job **139136612417**: `Run changed-source regressions only` SUCCESS, 두 보안 단계 `Validate pinned workflow security scanner`, `Audit changed GitHub Actions workflow security` SUCCESS. Job 로그에서 `C996_UNGROUPED_TEST_START files=1`, `C996_UNGROUPED_TEST_PASS`, `# fail 0`.
- **경계:** 이 Run은 #3547 ER1 승인 manifest EOL 검사 수정에서 실행된 **변경 파일 1건** 대상. #3517의 원래 `rollback-first-evidence.test.mjs`를 정확히 다시 실행했다고 확인되지 않는다. 전체 C996가 green인 시점이 존재하지만 이를 #3517 해당 root cause 100% 복구로 계산하지 않는다.
- 앞선 #3547 SHA `39bf57d053c5d4c82ff0e1c5a6475be2ae643a17`의 Run **45593678870**은 C996 failure. 이후 동일 PR의 고친 HEAD에서 C996 PASS가 확인됐다는 **#3547 고유 실패의 해결 증거**이지 #3517 전체 누적 실패의 해결 증거가 아니다.

## 실질 판정
| Issue | 이후 증거 | 결정 |
|---|---|---|
| #3517 | 현재 main에 구문 정상, 후속 C996 성공 Run 존재하나 고정 원본 test가 실제 실행됐다는 증명 없음 | OPEN 유지, 다음에는 해당 파일이 실행된 정확한 성공 job 로그 확보 |
| #3518 | 같은 구문 소스 정상이나 scoped Maintenance 대상 전체 success 직접 확인 없음 | OPEN 유지 |
| #3531 | 실행 당시 #3516 SHA assertion mismatch; 최신 승인/원장 연계 미입증 | OPEN 유지 |
| #1582 | SEC limiter 일부 수정 완료, 다른 실패 계보 보존 | OPEN 유지 |

- 신규 Issue/PR·CI 재실행·운영 Windows·Controller·Writer·SQLite/D1 변경 0.
- 이번 회차 직접 종결 0. 기술적 진전: 후속 녹색 CI가 검증한 파일 범위까지 명확히 분리.

## 다음 단계
1. 과거 #3517/#3518 정확한 테스트 파일을 호출한 **후속** Actions job 로그 및 commit SHA를 찾아 CI 단계와 해당 test assert 둘 다 SUCCESS 확인.
2. #3531의 승인 manifest source SHA와 fixture test expectation 대조, 보안 경계 훼손하지 않는 기존 수정/CI 확인.
3. 조건 충족한 Issue만 완료/중복 여부에 맞춰 종결하고 두 저장소 최신 OPEN 목록을 재조회.
