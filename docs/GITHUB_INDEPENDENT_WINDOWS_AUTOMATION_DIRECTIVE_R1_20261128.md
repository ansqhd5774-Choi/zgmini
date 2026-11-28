# GitHub 권한 및 독립 Windows 자동 실행 개선 R1
2026-11-28 · 총괄 실행 지시 및 진행 기록

## 목적과 범위
총괄 소속 zgmini / codex/controller-ops-lessons-20261105. 실제 제어 코드 변경은 zgmini-pc-control 최신 main 기반 전용 브랜치. 기존 AGENTS/PC_AUTOMATION_STANDARD 및 사용자 승인/보안 계약을 유지한다.
GitHub 요청 → 기존 Actions 검증 → 승인된 독립 Windows 유지보수기 → 실제 실행 → JSON/TXT/로그 → Runtime 검증 → 원장 정합화. 소스/CI/병합을 운영 완료로 간주하지 않는다.

## 실행 지시
1. 연결 계정/저장소 collaborator 권한, 실제 도구의 Contents/Actions/Workflow/Issues/PR/Checks 기능과 설정을 구분한다. 최소 권한만 사용하며 기존 pc-job Issue 트리거를 우선한다. 직접 dispatch 미지원은 권한 부족과 구별한다.
2. 기존 pc-maintenance 독립 수신기, Watchdog, manifest, 원자적 lease/CAS/백업/원복 및 결과 회수 재사용. A는 등록된 고정 조회만, B는 정확한 기존 승인 효과만, C는 기존 직접 인증을 유지한다. 공개 저장소의 일반 B polling 거부, 독립 Owner ancestry, 승인 취소 검증 및 민감정보 보호를 제거하지 않는다.
3. 실제 변경이 필요한 경우에만 최소 소스/Workflow를 작성하고 정상·미승인·취소·잘못된 SHA·중복·경합·복구·전달 실패·redaction 회귀시험과 정확 HEAD CI를 확인한다. 새 보안 효과나 C→B 전환은 별도 승인/설치된 신뢰 정책 없이 실행하지 않는다. 임의 shell/SQL, 환경변수 은폐, RDC, 새 예약/유료 서비스 금지.
4. #4069 최초 실증: 기존 s6-local-owner-readonly.mjs 독립 Windows 단회 실행 및 로컬 원장 대조 → controller-s6-4069-public-b-operator-once.mjs inspect → 보호 조건 PASS 시 정확 target 66b8a66c6112441576917e0ac9fbe4d39cbd5eea 단회 apply → 설치 해시, Controller/Watchdog, 공개 A 실제 실행 및 JSON/TXT/로그 readback. 원본 S6 재실행 금지. PR #4318/#4320/#4321/#4322의 유효 증거 재사용.
5. 최종 완료는 실제 Windows 읽기, 설치, 공개 A, 결과 회수 및 원장 정합화까지. 기존 C급 직접 실행 필요 시 이를 실제 제약으로 명시하며 승인 재요청과 혼동하지 않는다.

## 착수 증거 (2026-11-28)
- 인증된 GitHub 계정 ansqhd5774-Choi, 양 저장소 collaborator permission=admin 직접 확인. 이는 연결 도구 개별 API scope나 Windows Owner 인증을 증명하지 않는다.
- 연결 도구에는 Actions job/log 조회 및 재실행은 존재하나 신규 workflow_dispatch 작업은 현재 제공되지 않는다. 기존 pc-job 트리거는 정상 A 실행의 정규 대안.
- [#4326](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4326) / [Run 46090590261](https://github.com/ansqhd5774-Choi/zgmini-pc-control/actions/runs/46090590261): #4069 최신 댓글에 seat3 공개 A core-status PASS, actualExecutionSha=d3764580fdb08ecddd5f9b1064051eec30f90492, JSON/TXT 2/2라고 기록. 원본 결과는 별도 직접 대조 대상.
- [#4069 최신 원장](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4069#issuecomment-7231330159): 신규 target 미사용, 독립 Windows 조회/inspect/apply 미완료. Closed 상태를 운영 성공으로 간주하지 않는다.
- 현행 main maintenance-agent.mjs는 공개 일반 B 요청을 PUBLIC_B_EFFECT_SEPARATE_AUTH_REQUIRED로 거부한다. 고정 CI 후보 별도 정책이 존재하나 기존 Owner 직접 실행 권한을 자동 대체하지 않는다.
- 다음 필수 행동: #4326 원본 readback, 이미 설치된 독립 실행기의 실제 승인 범위 확인. 직접 Owner 경로가 필요한 경우 기존 계약으로 진행. 공개 B 자동화 확대는 영향·별도 승인이 필요한 경우에 한해 설계한다.

## 진행률 계약
권한/구조 확인 10%, 권한 정합화 10%, 독립 계약 설계 10%, 연결 20%, 회귀 10%, 실제 읽기 10%, 설치 15%, 사후검증 10%, 원장 5%. 각 단계는 해당 효과의 증거로만 집계. 이번 문서 반영은 실제 Windows 실행이 아니다. 운영 변경 0.

## 원본 증거 회수 결과
- #4326 Run 46090590261: public-approved-a SUCCESS (job 140810318884), public-readonly-intake SUCCESS, approved-pc-job SKIPPED. 실제 Actions 로그 직접 회수.
- [JSON](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/46090590261-1-seat-3.json) / [TXT](https://github.com/ansqhd5774-Choi/zgmini-pc-control/blob/main/results/46090590261-1-seat-3.txt) 원본 2/2 재조회 및 jobId/requestId/operation/seat/status/code/actualExecutionSha 일치. core-status PASS, seat 3, d3764580fdb08ecddd5f9b1064051eec30f90492. SUMMARY_ONLY/PUBLIC_REPOSITORY_REDACTED; 로컬 #4069 원장 자체를 읽었다는 증거 아님.
- 기존 public A 재사용 가능 확인. 신규 target 설치/Owner 직접 실행 미입증. 관리자 권한 추가 부여 불필요; GitHub 설정/운영 변경 0. 현재 단계는 권한 및 구조 확인 완료(10/100), 권한 정합화는 기존 admin 권한 확인과 별개로 도구별 쓰기/실행 범위 미완료. 다음 설계는 기존 독립 실행 계약을 유지하며 필요한 추가 권한 효과만 분리; 공개 B polling이나 C급 직접 인증 우회 금지.
