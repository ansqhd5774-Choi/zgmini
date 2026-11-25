# W01·W03·W05 완료 프로젝트 — Issue·PR 잔여 정리 원장

- 기준일: 2026-11-25 KST
- 담당: 본체 Issue·PR 수명주기 관리자
- 저장소: `ansqhd5774-Choi/zgmini`, `ansqhd5774-Choi/zgmini-pc-control`
- 기록 브랜치: `codex/issues-lifecycle-manager-20261123`
- 목적: **사용자가 완료를 확정한** W01·W03·W05 프로젝트의 *Issue·PR 정리*. 기능 개발, 운영 PC 설치, 미검증 기능 완료 선언은 범위 밖.
- 원본 run/requestId/승인 manifest/영수증은 보존하며, 기존 단회 요청은 재실행하지 않음.

## GitHub 직접 재확인한 신규 종결 원본 11건

| 프로젝트 | 저장소 | 항목 | 최종 상태 | 처리 이유 및 증거 |
| --- | --- | --- | --- | --- |
| W03 | zgmini | [PR #1580](https://github.com/ansqhd5774-Choi/zgmini/pull/1580) | CLOSED, **UNMERGED** | R54 Source Lease 독립 후보. 격리 CI 성공과 실PC 미설치 구별, 선택 통합 추진 중지. [정리 댓글](https://github.com/ansqhd5774-Choi/zgmini/pull/1580#issuecomment-7158238802) |
| W03 | zgmini-pc-control | [#846](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/846) | CLOSED/not_planned | 108파일 과거 단회 B exit13 / 최종 효과 UNKNOWN; 공통 수정 #889/Windows 격리 #892, 원본 B 성공 아님. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/846#issuecomment-7158322781) |
| W03 | zgmini-pc-control | [#838](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/838) | CLOSED/not_planned | 과거 Windows proof 취소·0 jobs, 구조 수정 PR #839. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/838#issuecomment-7158442241) |
| W03 | zgmini-pc-control | [#840](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/840) | CLOSED/not_planned | 과거 proof 차단/reporter exit13, 후속 수정 PR #842. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/840#issuecomment-7158444262) |
| W03 | zgmini-pc-control | [#843](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/843) | CLOSED/not_planned | CAS fixture 미정합, 후속 PR #844; 운영 CAS 결함 입증 아님. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/843#issuecomment-7158446019) |
| W03 | zgmini-pc-control | [#894](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/894) | CLOSED/not_planned | LOCAL_EXECUTOR_PASS이나 게시 PASS 미입증. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/894#issuecomment-7158458244) |
| W03 | zgmini-pc-control | [#1219](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1219) | CLOSED/not_planned | R181 단회 Core SHA 조회 결과 댓글 부재, 성공 미확인. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1219#issuecomment-7158460207) |
| W01 | zgmini-pc-control | [#1917](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1917) | CLOSED/not_planned | Event129 원본 STATE_UNKNOWN. 후속 W01 #2716/#2717/#2791 성공은 다른 범위. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1917#issuecomment-7158482375) |
| W01 | zgmini-pc-control | [#1797](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1797) | CLOSED/not_planned | Census CDN 단회 시험 실행/결과 미확인. 후속 W01 데이터 검증과 별개로 원본 요청 폐기. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1797#issuecomment-7158503175) |

| W01 | zgmini-pc-control | [#1329](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1329) | CLOSED/not_planned | 2026-11-13 Core 계보 단회 조회 `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE`; 원본 실행 성공 아님. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1329#issuecomment-7158751139) |
| W01 | zgmini-pc-control | [#1331](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1331) | CLOSED/not_planned | 2026-11-13 Core 활성 계보 단회 조회 `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE`; 원본 실행 성공 아님. [댓글](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/1331#issuecomment-7158753045) |

**집계:** 이번 수명주기 정리에서 실제 종료한 이력은 Issue 10 + PR 1 = **11건**. W05 관련 구형 요청은 조사 시점에 이미 CLOSED였으므로 이 숫자에 산입하지 않음. 증거 없이 폐쇄하거나 성공으로 소급한 항목 없음.

## 현재 OPEN 대상 교차검증

- 2026-11-25 후속 추적: 단순 `W01` 키워드 검색 외에도 원본 `pc-inflation-core-*-once` 요청 ID를 대조해 #1329/#1331 추가 종결. `STATE_UNKNOWN` 증거는 변경하지 않음.
- 2026-11-25 GitHub 재검색: 두 저장소 모두 `W01`, `W03`, `W05` 명칭 검색에 걸리는 **OPEN PR 0건**.
- 두 저장소의 OPEN Issue·PR 목록을 별도 조회한 결과, 프로젝트 이름/관련 작업 키워드와 직접 맞는 전용 잔여 항목은 발견하지 못했음. **이는 과거 전체 요청의 계보가 100% 조사됐다는 주장과 다름.**
- 별도 **공통 Runner 장애** [pc-control #2237](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/2237)은 OPEN 유지: 원본 #2227 취소/steps=[] 및 유사 W05 취소의 root cause 미확정. W03 기능 미완료나 Project W03 재개 사유로 계산하지 않음.
- 공통 중앙 원장 #68, #1743, #2426, #2427 및 시장 캘린더 등 **타 프로젝트/공통 업무 항목은 종결 범위 밖**.
- 오래된 W01·W03·W05 기능 브랜치와 이미 닫힌 PR은 존재하며, 이들 브랜치가 남았다는 사실은 곧 OPEN Issue·PR은 아님.

## 잔여 점검 기준 및 업무 종료 판정

1. Issue·PR 정리 대상에 한정하면, **현재 식별 가능한 세 프로젝트 전용 OPEN 항목 0건**으로 판정.
2. 전체 과거 승인 명세·비표준 제목/본문·원본 request 계보의 누락까지 없다고 입증된 것은 아니므로 **완전무결한 전수감사 100% 완료 표시는 보류**.
3. 새로 직접 연결되는 잔여 Issue가 발견되면 증거 확인 후 개별 종결; 공통 재발 장애는 별도 담당 그대로 유지.
4. 이번 정리에서 신규 PC Job/B 설치/Task/Controller/Writer/SQLite/D1/Cloudflare 변경 **0건**. 저장소 기록은 이 문서만 신규 작성.
