# ZGMINI OPEN delta 및 W01/W03/W05 독립검증 — 2026-11-25

## 범위 / 재조회
기준 원장 `OPEN_ISSUE_PR_FULL_AUDIT_20261125.md` 88건과 GitHub 검색 재조회를 비교. 이번 조회 시 **76건**(본체 Issue 1 + PR 6, PC Issue 68 + PR 1)으로 재확인. 동시 변경 가능성이 있으므로 최종 고정치로 간주하지 않는다. 기존 목록과의 **차집합 13건**, 유입 **신규 PC PR #3545 1건**을 원본 번호로 추출했다. 이전 재조회 78건과 차이가 있으므로 마지막 최종 재검색을 필수로 한다.

> 주의: 항목 차집합은 조회 시점 사이 변화이며, 조회자 자신의 종결 13건이라는 뜻이 아니다. 검색 시간차·동시 작업을 고려하여 상태 원장과 별도로 보관한다.

## 기존 원장에서 OPEN 제외된 13건, GitHub fetch_issue 직접 재확인
| 유형 | 번호 | 현재 상태 | state_reason | close_at (UTC) | 분류 |
|---|---|---|---|---|---|
| PC Issue | #3533 | closed | completed | 2026-11-25 10:32:15 | 공통 process inventory |
| PC Issue | #3528 | closed | completed | 2026-11-25 10:31:20 | W04 지원 읽기전용 |
| PC Issue | #3525 | closed | completed | 2026-11-25 10:32:40 | 공통 process inventory |
| PC Issue | #3524 | closed | not_planned | 2026-11-25 10:26:05 | W04 raw attestation |
| PC Issue | #3522 | closed | not_planned | 2026-11-25 10:28:36 | W04 raw attestation |
| PC Issue | #3520 | closed | completed | 2026-11-25 10:32:45 | 공통 process inventory |
| PC Issue | #1026 | closed | completed | 2026-11-25 10:06:36 | 고용 R6 |
| PC Issue | #1000 | closed | completed | 2026-11-25 10:09:52 | 고용 R6 preimage |
| PC Issue | #965 | closed | completed | 2026-11-25 10:34:56 | 고용 R6 preimage |
| PC Issue | #939 | closed | completed | 2026-11-25 10:08:37 | 고용 R6 Writer config |
| PC Issue | #860 | closed | not_planned | 2026-11-25 10:35:26 | 공통/R6 proof-only |
| PC PR | #3543 | closed | PR 별도 병합 확인 필요 | 2026-11-25 10:01:06 | W04 운영자 패키지 |
| PC PR | #3542 | closed | PR 별도 병합 확인 필요 | 2026-11-25 10:07:28 | ER1 |

**신규 #3545:** PC 제어 저장소의 CI A/B 승인 자동화 Draft PR. 기존 88건 cohort에 추가된 항목이며 원본 해결 건수와 무관하다.

## W03 장애 #2237: 원본-후속 독립검사
- 원래 W03 요청 #2227은 `closed/not_planned`. Run `44372235510`, Job `135041841316`, cancelled / steps=[] / log BlobNotFound를 기존 #2237 댓글 증거로 확인.
- 별도 대체 A #2241 성공, 후속 B #2259 및 #2262 사후 조회 성공이라는 원장 댓글 증거가 존재. 다만 원 취소의 root cause가 해결됐다는 뜻은 아님.
- 최신 #2237 댓글은 신규 W05 취소 후보 Run `45305945738`에도 원인분별용 실PC 조회 #3352에서 exactReferences=0, TIME_ONLY_UNATTRIBUTED임을 기록. 취소 주체·Worker phase 입증 부재.
- **판정: W03 원래 업무는 대체 완료, 공통 Runner 원인 조사 이슈 #2237은 별도 OPEN 유지 (ROOT_CAUSE_UNKNOWN).** 프로젝트 완료와 공통 장애 원인을 혼동하여 닫지 않는다.

## ETF Shadow Draft PR #488
- 기존 2026-11-19 댓글: research-only, SOURCE_NOT_IN_MAIN, 별도 CI-only #1425 성공이나 실제 R122 artifact/상업권/공개 배포 승인 미검증.
- W01/W03/W05 귀속은 아직 입증되지 않았다. 제목으로 프로젝트 종료 요청에 끼워 넣지 않는다.
- **판정: 연구 Draft OPEN 유지, 임의 병합/종결 불가.**

## 남은 작업
1. 전수검사 기준 88건에서 2차 원본 증거검증의 개별 행을 순차적으로 확정; 지난 50% 및 44건 미검증은 사용자 전달 진척이며 본 문서 작업으로 자동 완료 처리하지 않는다.
2. PR #3543/#3542 병합 여부는 PR 전문 조회로 명확히 증명; 단순 closed만으로 merged 주장 금지.
3. W01/W03/W05와 정확히 귀속된 OPEN 항목만 선별하여 독립 후속 성공을 대조한 후 종료 여부 결정.
4. W04/ER1 원본 요청 보호 및 동시 담당자 작업 보존.
5. 최종 OPEN 검색 후 변경 시각/추가·폐쇄·재오픈 내역을 다시 고정.

**이번 변경:** 문서 1개 생성. 이슈·PR 종결 0, PC/Controller/Writer/DB 변경 0.
