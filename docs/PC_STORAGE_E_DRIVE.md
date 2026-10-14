# E: 저장 운영 계약

2026-10-15 KST ZGmini 전체 이전 후 운영 경로다. 산식·공급자·TTL·DB 구조·배포·DNS 변경을 뜻하지 않는다. 아래 절대 경로는 현재 운영 PC의 배치 기록이며 다른 PC의 기본값으로 강제하지 않는다.

## 실제 저장 위치

| 대상 | 경로 |
| --- | --- |
| 프로젝트 | `E:\ZGmini\projects\` |
| 이전 프로젝트 | `E:\ZGmini\projects\legacy\` |
| 운영 데이터 | `E:\ZGmini\data\` |
| PC writer | `E:\ZGmini\data\pc-writer\` |
| 이란 수집 | `E:\ZGmini\data\iran-progress-r13\` |
| 전용 Node | `E:\ZGmini\runtime\node.exe` |
| 이전 검증 기록 | `E:\ZGmini\migration\completion.json` |

키·원자료·DB·개인 config·migration 원본 로그는 Git/배포에 포함하지 않는다. 현재 데이터 폴더의 접근 권한을 유지한다.

## 호환 경로와 설정

- 기존 C: 프로젝트 경로와 `%USERPROFILE%\.zgmini`는 E:를 가리키는 junction으로 유지된다. Git/worktree의 기존 C: 참조도 이를 통해 동작한다.
- C: 문자열만으로 미이전 판정하지 않는다. 실제 경로 해석 결과·파일 존재·등록 작업을 확인한다. 정상 junction을 삭제하거나 참조 경로를 일괄 치환하지 않는다.
- PC writer는 기존 `ZGMINI_PC_HOME` 설정 또는 사용자 홈의 `.zgmini/pc-writer`를 사용한다. 이란 건강 조회는 기존 `ZGMINI_IRAN_HOME` 설정 또는 호환 홈 경로를 사용한다.
- installer는 실행 중인 Node의 `process.execPath`와 자신의 프로젝트 경로를 launcher에 기록한다. 재설치가 필요한 경우 실제 E: Node와 승인 source를 먼저 확인한다.
- 경로 설정을 쓸 경우 수동 실행뿐 아니라 예약 작업의 실행 환경에도 동일하게 전달되는지 확인한다. 환경변수 변경만으로 기존 launcher가 갱신된다고 가정하지 않는다.
- 현재 `install-local.mjs`는 `local-cycle.mjs`를 등록한다. quota runner를 사용하는 운영 작업을 경로 변경만을 위해 재등록하지 않는다. `install.mjs`의 이전 writer도 활성화하지 않는다.

## 운영과 장애 확인

- PC·로그인 세션·인터넷·E: 연결이 필요하다. 일반 채팅·Codex 창·RDC Online은 운영 조건이 아니다.
- E: 접근 불가 시 드라이브 연결·문자·실제 대상부터 확인한다. C:에 동일 이름 폴더·빈 DB를 만들거나 다른 드라이브로 자동 대체하지 않는다.
- 등록 작업은 Core, Korea, Iran 3개를 확인한다. 등록·활성화와 실제 실행·게시 성공을 구분한다. 기존 Writer는 비활성 복구용이다.
- 개발 main, config의 승인 source, 실제 실행·배포 SHA를 구분한다. 경로 이전만으로 운영 코드를 최신 main으로 교체하지 않는다.
- `quota-runner-last-run.json`의 수집·게시 상태, 해당 실행 기록, publication ledger, 필요한 원격 read-back을 대조한다. 기존 유효 검증을 이유 없이 반복하거나 중복 게시하지 않는다.

## 이전 완료 기록과 복구

- 이전 완료 시 프로젝트 163개와 데이터 폴더 56개의 이전, 실제 경로·DB·실행·공개 결과 검증이 기록됐다. 이는 이후 모든 정규 실행의 성공을 보장하지 않는다.
- `이전완료.txt`만 보지 않고 `completion.json`의 `COMPLETE_VERIFIED`, 해당 실행 시각·진행 수·검증 결과와 대조한다. 오래된 supervisor 실패·대기 표시로 완료 작업을 다시 실행하지 않는다.
- C: 안전 백업 1개가 별도 보존됐다. 백업 정리는 실제 대상·복구 필요성·검증 근거를 확인하고 수행한다. DB/checkpoint 초기화 또는 migration 스크립트 무조건 재실행 금지.
- 복구는 원본·대상·junction·백업·활성 프로세스부터 확인한다. 같은 lane과 journal에 중복 실행기를 만들지 않는다.
- 재귀 삭제·이동 전 대상 절대 경로와 junction 여부를 확인하고 승인된 범위에 한정한다.

## 이번 저장소 변경의 범위

경로·운영 문서와 프로젝트 지침을 갱신한다. 실행 스크립트의 호환 기본 경로, 실제 PC config·예약 작업·DB·키·운영 승인 SHA·수집 주기·산식·UI는 변경하지 않는다. 실제 이전 완료 증거를 재사용하며 새 배포나 재게시 검증을 수행했다고 표현하지 않는다.
