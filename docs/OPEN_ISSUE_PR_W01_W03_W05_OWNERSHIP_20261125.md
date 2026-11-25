# W01·W03·W05 OPEN 귀속 및 종결판정 — 2026-11-25

## 목적
기능 프로젝트 종료와 공통 운영 인계/진단 원장의 종료를 구분. 기존 검증 파일 `OPEN_ISSUE_PR_FULL_AUDIT_20261125.md`, `OPEN_ISSUE_PR_DELTA_VERIFICATION_20261125.md`, `OPEN_ISSUE_PR_EVIDENCE_BATCH3_20261125.md` 승계.

## 직접 검색과 상태 검사
GitHub OPEN 검색: `zgmini-pc-control` `W01`, `W03`, `W05` 및 `zgmini`의 OPEN PR W01/W03/W05 검색. 검색은 제목과 본문 일치이므로 프로젝트의 정확한 소유권을 자동 입증하지 않음.

| 항목 | OPEN 현재 관측 | 귀속/종결 판정 |
|---|---|---|
| PC #2237 | OPEN, W03 원본 #2227 취소 사고 인계 | W03 원업무는 #2241 대체 A PASS·#2259 B·#2262 후검사 성공 기록. 그러나 #2237 자체는 W05 유사 취소까지 포함하는 공통 Runner root-cause investigation, `ROOT_CAUSE_UNKNOWN`, **보존** |
| PC #68 | OPEN 공용 Controller 중앙 대기열 | W01/W03/W05 검색 결과 출현은 댓글의 범위 공유 때문. 공통 운영 원장, **보존** |
| PC #1743 | OPEN 공통 능동진단 원장 | 기능별 완료 요청이 아닌 append-only 진단, **보존** |
| PC #2426, #2427 | OPEN 2026-11 능동 진단/Wide Scout | W05 문자열 연결은 공통 진단 기록, **보존** |
| PC #835 | OPEN 시장 캘린더 ER1/W02 긴급한 읽기 전용 증거 인계 | W03 댓글 문자열과 무관. 진행 중인 ER1 별도 보호, **보존** |
| zgmini PR #488 | OPEN ETF 연구용 Shadow Draft | W01/W03/W05 실제 소유권 입증되지 않고 운영 허가/상업권 검증 미완. **보존** |

## #2237 상세 증거 경계
- 원본 W03 #2227 / GitHub Actions Run 44372235510, Job 135041841316: cancelled, steps 0, log BlobNotFound. 원본은 이미 closed/not_planned.
- 별도 A #2241, B #2259, 검증 #2262 대체 성공 기록은 원 업무의 기능 완료 증거이며 원본 실패의 원인 해결 증거가 아님.
- 새 W05 인접 Run 45305945738 / Job 138149694819: cancelled, steps 0, log BlobNotFound. #3352 실PC 진단 댓글: `exactReferences=0`, `TIME_ONLY_UNATTRIBUTED`.
- 시작 `actor`와 `triggering_actor`는 취소 호출자가 아니다. 현 시점 main `cancel-in-progress:false`로 당시 Run의 workflow/취소 원인 확정 불가.
- 따라서 W03 종료 명목으로 #2237 폐쇄하면 독립적인 미해결 공통 취소 사고의 추적 근거 손실. 공통 Owner가 계속 조사해야 하는 문제로 기록한다.

## 종료·보호 원칙
- 이번 조사에서 W01/W03/W05 **직접 종료 가능한 잔여 OPEN Issue/PR 0건 입증**. 따라서 무증거 폐쇄 0건.
- W04·ER1·고용 R6 및 공통 Controller/Runner/보안 진단 원장은 기능 완료 건수에 합산하거나 강제 종료하지 않는다.
- ETF #488은 별도 연구 Draft, 활성 사용자 승인 없음. 무단 병합 금지.
- 새 설치·승인·PC Job·DB·D1·Task 변경 없음.

## 후속
1. 남은 미검증 OPEN 항목의 원본 JSON/TXT, Actions Run/Job, 후속 성공 링크, owner/프로젝트 귀속을 독립검증.
2. 정확 귀속/완료/증거가 모두 성립하는 개별 원본만 종결하며, 진행 중 운영 보호를 유지.
3. 동시 작업자 변경을 고려해 마지막 OPEN 개수 재조회.
