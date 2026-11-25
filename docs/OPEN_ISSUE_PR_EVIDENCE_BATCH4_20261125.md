# ZGMINI OPEN 증거 4차 배치 및 W01/W03/W05 귀속검사

기준: 2026-11-25, read-only GitHub direct calls. 기존 R1 88건 cohort와 이전 batch3 원장 승계.

## 이번 검증의 세 단계
1. W01/W03/W05 문자열이 포함된 OPEN 검색 결과와 실제 Issue/PR 성격을 분리.
2. 공통 인계 Issue #2237/#2353/#3073, ER1 #835의 본문 및 최신 댓글 재조회, 기능 업무와 공통 장애 추적 구분.
3. 원본 OPEN 12건 #1010 #946 #936 #976 #964 #783 #702 #996 #1295 #1231 #1351 #155 직접 fetch_issue 및 댓글 전체 열람; JSON 결과 두 건 직접 fetch_file.

## W01/W03/W05 직접 소속 결론
- W03 #2237: #2227 원본은 이미 CLOSED/not_planned, 대체 조회 #2241과 후속 설치/조회 #2259/#2262 성공이라는 기록 존재. 그러나 #2237은 공통 Runner 취소 원인 미입증(W05 #3077 유사 증상 포함), **OPEN 유지**.
- #68 중앙 공용 Controller 원장, #1743 능동진단 원장, #2426/#2427 진단 샤드: 검색에 Wxx가 나와도 특정 완료 프로젝트의 미종결 과제로 귀속하지 않음.
- #835: ER1/시장 캘린더 작업, W02/R44 댓글도 포함. W03 소유가 아니며 보호.
- 본체 #488: ETF Shadow 연구 Draft, W01/W03/W05 작업 귀속 미입증. 별도 승인 전 보존.
- **이번 검사에서 W01/W03/W05로 소속·목표 완료·기준 영수증이 모두 입증된 추가 OPEN 종결 후보: 0건.**

## 후속 12건 직접 원본 댓글 조사
| Issue | 직접 확인 내용 | 제한 판정 |
|---|---|---|
| #1010 | Run 42590585021 JSON 직접 검증: `PASS/CORE_READONLY_DIAGNOSIS`; `result.core.lockPresent=true` | 조회 PASS이나 **lock 자연 해제 목표 미충족**, 보호 |
| #946 | Run 42498194519 `PASS/PC_SOURCE_READONLY_DIAGNOSIS`; 댓글 자체 SUMMARY_ONLY | 원격 전체 inventory 검증 아님, R6 보호 |
| #936 | Run 42491316168 JSON 직접 검증: `PASS/WRITER_FIXED_PREIMAGE_READONLY`; `runtimeSourceVerified=false`, R6 auto config 두 키 모두 `ABSENT` | post-install config 목표 미충족, R6 보호 |
| #976 | Run 42562925788 `PASS/RELEASE_CALENDAR_SOURCE_INVENTORY_READONLY` | 공급자 GET 정책 증명 아님, 시장 캘린더 보호 |
| #964 | Run 42545733840 `PASS/RELEASE_CALENDAR_SOURCE_INVENTORY_READONLY` | 해당 조회 성공과 운영 R6 전체 완료 구분 |
| #783 | 공통 R6 A/B 계약 gap; 후속 R6 D1 게시 증거 존재하나 전체 사안에 복수 계약·가드 존재 | 소속 W04/R6 보호 |
| #702 | #699 Writer B 설치 `WRITER_B_INSTALLED_VERIFIED`; 원본 D+30 Core runtime 조회 `STATE_UNKNOWN` | 원 목적 미입증, 보호 |
| #996 | 독립 C 복구 `INTAKE_RECOVERED_ORIGINAL_INSTALL_ABORTED`; 원래 설치 성공은 아님 | history/운영 경계 보호 |
| #1295 | `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE` | runtime 미입증 |
| #1231 | `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE` | runtime 미입증 |
| #1351 | 신규 공통 접수 경로/진단 댓글 존재, 원본 core-runtime 확인 성립 미확정 | 보호 |
| #155 | ER1 12월 수집 연결; 새 수정 CI 통과, 실제 Controller 적용 여부 미확정 | ER1 보호 |

### 직접 읽은 원본 JSON Git blob
- `zgmini-pc-control/results/42590585021-1-seat-1.json` blob `88d573f09743ce330ea44d4c5c4b40bc0c64ebd9`: requestId `pc-98824886-0e84-40e8-9768-c6a8804b222a`, PASS, lockPresent=true.
- `zgmini-pc-control/results/42491316168-1-seat-5.json` blob `373e822ea64604b1e90c0b969947a5e3c70ab36d`: requestId `eb2c8f8e-77e4-493b-b5db-38ae275bdf41`, PASS, evidenceLevel `FIXED_CHECKOUT_NOT_LIVE_CORE_PROCESS`, two R6 config keys ABSENT.
- 이 두 원본 파일 확인 외 10건은 댓글/본문 대조이며 **완전 독립 실행 증거 검증 완료로 계산 금지**.

## 작업 효과와 다음 검사
- 이번 파일/이전 Wxx 귀속 파일: read-only 조사 결과 기록.
- 신규 PC Job/승인/Workflow 재실행/운영 PC·Controller·Writer·SQLite·D1 변경: 0.
- Issue/PR 종료: 0. 종결 승인 이전의 추측성 폐쇄 없음.
- 남은 원본 cohort 증거 44건을 기준으로 완전 검증/부분 검증/공통·W04·ER1 보호를 건별 구분하고, 실제 귀속된 완료 항목만 종결. 기존 보고 50%를 새 결과만으로 임의 상향 금지.
