# ZGMINI Issue·PR 5차 원본 증거 — CI failure step 분리
기준일 2026-11-25 · 감사 전용 read-only 조회

## 조사범위
GitHub OPEN 직접 Issue/댓글: pc-control #3531, #3518, #3517 및 zgmini #1582.
각각 원본 GitHub Actions run jobs 조회, 실패 job에 대한 개별 steps API 조회.
**원본 log 상세 및 test assertion 문구는 이번 배치 미확인. root cause 확정 아님.**

| Issue | run | job id | 최초 관측된 실패 단계 | 별도 관측 |
|---|---:|---:|---|---|
| PC #3531 | 45581633856 | 139092854681 | `Regression test six operating runners without PC writes` step 62 failure | 이전 61개 step success, 이후 step 63~64 skipped |
| PC #3518 | 45575303651 | 139071665776 | `Run scoped maintenance and Controller runtime safety regressions` step 22 failure | 이후 tests skipped |
| PC #3518 (follow-up) | 45584587520 | 139102838011 | 동일 step 22 failure | 일부 후속 성공 주장 없음 |
| PC #3517 | 45574811728 | 139069993380 | `Run changed-source regressions only` step 5 failure | security steps skipped, 검사 미실행 |
| PC #3517 (later) | 45593678870 | 139134074345 | 동일 step 5 failure | 동일 step 반복 실패, SHA는 다름 |

추가 교차대조: #3531의 run 45581633856에서는 step 22 `Run scoped maintenance and Controller runtime safety regressions`가 SUCCESS, 반면 step 62가 FAILURE. 이는 #3518 원본 실패 단계가 *한 후속 소스에서 통과*했다는 제한된 증거이지, 기존 #3518 전체 history 또는 #3531의 root cause를 해결했다는 증거가 아니다.

## 본체 #1582
Issue 댓글에서 SEC limiter 출발시각 수정 PR #1610 merged `ca459ec3e0cf96e08ddced2c02e32e17099e965f`, 해당 main push Node CI run 45580917379 `success` 기록. R6 fixture 수정 PR #1605 CI success 기록도 존재. 이후 run 45581429123의 별도 실패 댓글이 이어진다. Miniflare flake 및 서로 다른 실패 계보는 미종결. 개별 원인별로 분리 판정하고 Issue #1582 OPEN 보존.

## 종료 판정
- #3531: 미종결. source-only Runner-6 검증의 test-level assert/log 원인 확인 전까지 OPEN.
- #3518: 미종결. 반복 실패 관측, 최신 동일 SHA/범위의 완료 증거 필요.
- #3517: 미종결. 반복 실패 및 downstream skipped이므로 scanner/security 검증 완료로 허위 계산 금지.
- #1582: 미종결. 해결된 SEC/R6 부분과 Miniflare·신규 실패 독립 구분.
- Issue/PR 신규 생성/종결 0, PC Job/Runner 실행 0, 운영 Controller/Writer/SQLite/D1 변경 0.

## 이후 우선 순위
1. 기존 #3517/#3518/#3531 원본 job log에서 정확한 failing test assertion·예외/원인 범위를 읽고, 다른 담당자의 이미 병합된 수정과 대조.
2. 동일 계보의 후속 정상 job/step을 SHA와 함께 확인한 뒤만 개별 CI Issue 종결.
3. 전체 OPEN 재조회와 정적 cohort 88건의 각 상태 reconciliation.
