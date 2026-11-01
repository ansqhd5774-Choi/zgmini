# R50 — 현재 Core wrapper의 실제 Node 실행 파일 추적과 R45 설치 보호

## PC에서 확인된 사실

- R49 원문 비공개 구문 진단은 5개의 실행문 중 두 차례의 `WScript.Shell.Run`을 확인했다. 첫 명령에는 `.vbs`, 두 번째 명령에는 `node.exe`와 `.mjs`가 포함된다.
- R49 wrapper SHA-256은 `f05deb73cbadf831d7d3a9875bfbd13356d4ab21803fe9b7944a3f2ae6a5499d`이다.
- `hasPcWriterPart:true`, `hasScriptsPart:false`이므로 **현재 예약 작업의 Node 명령에 `scripts` 경로가 직접 포함된 것으로 볼 수 없다.** R48의 직접 `scripts/pc-writer/...` 한정 추적은 이 상황을 처리하지 못했다.
- R49 실행은 소스·DB·스케줄러·외부 API 호출을 하지 않았다. R45의 PC 설치는 아직 확인되지 않았다.

## R50 동작

1. 실 예약 작업이 지정한 단 하나의 VBS wrapper를 읽고 R49 SHA-256과 정확히 비교한다. 해시가 달라지면 즉시 중단한다.
2. 실제 `Shell.Run` 문자열 중 두 번째 명령을 VBScript 문자 이스케이프 규칙대로 해석한다. **직접 Node 실행**과 **단 한 개의 절대 `.mjs` 경로**만 허용한다. 명령을 실행하지 않는다.
3. Node 실행 파일이 실 파일이고, 실경로가 `scripts/pc-writer/*.mjs` 아래임이 확정된 경우에만 Core Git 작업 폴더를 추론한다. 다른 경우에는 **설치하지 않고** 실행 파일의 이름·해시·코드 문법 개요 등 제한된 비공개 진단만 출력한다. 로컬 절대 경로, 명령 원문, 설정값은 출력하지 않는다.
4. 직접 Core Git 경로가 확인되면 기존 R46 설치기 경계(PC `config.source`↔Git HEAD, 보호 경로 clean, 기존 수집 잠금, 배타 잠금, R45 SHA·패치 anchor, 백업·검증, 정확히 4파일 로컬 커밋 및 config source 갱신)를 유지한다. 설치 전후 예약 작업의 실제 origin도 재검사한다.
5. 설치 명령은 외부 API·시장 데이터 수집·공개 등급·DB·예약 작업·원격 Git 저장소에 접근/변경하지 않는다.

## 실제 적용 판정

`MARKET_CALENDAR_R50_PC_APPLY_RESULT.txt`의 `decision`이 `R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION`이면 R45 캡처 코드가 PC 작업 폴더에 설치된 것이다. `R50_NODE_ENTRY_OUTSIDE_REPO_SCRIPTS_STOP`이면 읽기 전용 진단까지만 완료한 것이며, 다른 원점을 임의로 선택하면 안 된다.

설치 뒤에도 R43 공개 등급 산출은 **별도 검증/후속 조치**가 필요하다. 시뮬레이션 77.3%(102/132)는 운영 등급 반영을 의미하지 않는다.

브랜치: `codex/zgmini-gpt-workspace-20261025`. `main` 병합·배포 없음.
