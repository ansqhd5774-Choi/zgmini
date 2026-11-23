# ZGMINI 저장소·담당 브랜치 기준

2026-11-23 사용자 지정. 프로젝트 전체의 담당 소속 정본이다.

| 담당 | 저장소 | 전용 브랜치 |
| --- | --- | --- |
| 프로세스 총괄 | `ansqhd5774-Choi/zgmini` (메인) | `codex/controller-ops-lessons-20261105` |
| 본체 이슈·PR 담당자 | `ansqhd5774-Choi/zgmini` (메인) | `codex/issues-lifecycle-manager-20261123` |
| PC 제어 이슈·PR 담당자 | `ansqhd5774-Choi/zgmini-pc-control` (보조) | `codex/issues-lifecycle-manager-20261118` |
| 자동화 담당자 | `ansqhd5774-Choi/zgmini-pc-control` (보조) | `codex/pc-automation-process-improvement-20261119` |

## 책임과 실제 변경 위치

- 프로젝트 전체의 우선순위·작업 분장·공통 정책·총괄 계획과 통합 진행 기록은 메인 저장소의 총괄 브랜치에서 관리한다. 기능 담당자의 기존 전용 브랜치와 유효한 완료 증거는 유지한다.
- 본체 이슈·PR 담당자는 `zgmini`의 열린 이슈·PR을, PC 제어 이슈·PR 담당자는 `zgmini-pc-control`의 열린 이슈·PR을 각각 우선 인수하고 해결·테스트·병합·승인된 운영 검증·종결까지 수행한다. 두 담당자는 동일 R2 실행 권한과 완료 증거 기준을 적용하며, 하나의 업무는 실제 담당자 한 명만 인수한다. 기존 담당자가 진행 중인 항목 및 교차 저장소 변경은 명시적인 원본 Issue/PR 인계 없이 중복 처리하지 않는다. 이슈 관리 도구와 격리 PC 실행·인계 구현은 보조 저장소에서 유지하며, 두 역할 모두 프로젝트 총괄 직책을 대신하지 않는다.
- 자동화 담당자는 Controller·Runner·유지보수기·요청 접수·상태 전달·결과 회수 등 공통 PC 실행 구현을 보조 저장소에서 개선한다. 프로젝트 본체 산식·입력 정책·API·UI를 자동화 개선이라는 이유로 보조 저장소에 새 정본으로 만들지 않는다.
- 서비스 기능 코드는 메인 저장소, PC 실행 연결·설치·복구 코드는 보조 저장소에 둔다. 하나의 업무가 양쪽에 걸치면 해당 파일은 각 저장소에서 변경하고 원본 Issue/PR·commit 링크로 연결한다. 총괄의 소속이 메인이라는 이유로 Controller 코드를 메인에 복제하지 않는다.
- 역할의 소속은 다른 저장소 접근 금지가 아니다. 총괄이 인수한 PC 공통 장애는 보조 저장소의 기존 승인 경로에서 직접 해결하거나 실제 담당을 조정할 수 있다. 기존 사용자 승인과 운영 보호 계약은 유지한다.

## 작업을 시작하고 이어가는 기준

현재 업무에 필요한 범위에서 실제 remote 저장소, 전용 브랜치와 변경 대상의 소속을 확인한다. 본체 담당자 R2 절차는 [본체 이슈·PR 지침](ISSUE_LIFECYCLE_MANAGEMENT_STANDARD_20261123.md), PC 제어 담당자 R2 절차는 [PC 제어 이슈·PR 지침](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/codex/issues-lifecycle-manager-20261118/docs/ISSUE_LIFECYCLE_MANAGEMENT_STANDARD_20261118.md)를 적용한다. GitHub URL은 `owner/repository + branch + path`까지 명시한다. 양 저장소의 `main`이나 같은 이름의 브랜치를 동일 소스로 취급하지 않는다.

총괄 권한의 세부 기준은 [총괄 권한 및 실행 책임](PROCESS_GENERAL_AUTHORITY_AND_EXECUTION_STANDARD_20261122.md), 시작점은 [WORK_HANDOFF](../WORK_HANDOFF.md)이다. 이 표는 업무 승인·계정 권한·운영 설치를 새로 부여하지 않으며, 새 승인 Gate·필수 진단·담당자 대기를 추가하지 않는다.

## 기존 기록 보존

보조 저장소의 `codex/controller-ops-lessons-20261105`는 기존 Controller 운영·총괄 기록의 역사 참조 브랜치로 보존한다. 새 프로젝트 총괄 지침·계획은 메인 저장소의 동명 브랜치에서 갱신한다. 과거 코드·승인·원장·결과를 삭제하거나 두 저장소의 Git 이력을 통째로 병합하지 않는다.

과거 계획의 날짜·진행률·설치 SHA는 당시 증거다. 이번 소속 정리는 기능 완료·운영 설치 상태·사용자 승인·현재 진행률을 변경하지 않는다.
