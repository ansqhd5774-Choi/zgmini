# R49 — 현재 Core wrapper 구문 구조 익명 진단

## 사용자 PC 증거

R46: `R46_CORE_ORIGIN_CHANGED_STOP`, `worktreeId:null`, 소스 변경 0.  
R47: 예약 작업 WScript 1개, VBS wrapper 읽기 성공, 구형 R38 marker 없음, `origin =` 항목 0.  
R48: `R48_ORIGIN_R48_ORIGIN_CHAIN_UNVERIFIED_STOP`, `wrapperScriptReferences:0`, `originFileCandidates:0`, `originScriptReferences:0`, `sourceWrites:0`, `changedFiles:[]`, `backupCreated:false`.

판정: 현재 Core wrapper가 Node/CMD 경로를 상수 문자열 한 개로 보관한다는 근거가 없다. 직접 참조 방식으로 임의 설치하거나 특정 E: 프로젝트를 추측하면 잘못된 checkout을 수정할 수 있다. 기존 경로 검사·Git/config 검증은 우회하지 않는다.

## R49 접근

- **설치가 아닌 읽기 전용 단일 진단**. 기존 `ZGMINI-PC-Local-Core` 예약 작업에서 인용된 VBS wrapper 파일 하나만 읽는다(64KB 한도).
- VBS의 각 문자열 내용·변수 이름·수치·경로는 출력 전 구문 토큰으로 변환한다. `Run`, `CreateObject`, `Chr`, `&` 같은 제어 구문과 `STRING_MJS/STRING_PATH/VAR1` 같은 토큰만 제공한다.
- Node script의 동적 결합 여부, 명령 실행 방식, 기존 source 조각 사용 여부 등은 불리언 정보로 기록한다. 원문 파일/설정/자격증명/PC 실제 경로·서명 원자료는 첨부·GitHub 저장하지 않는다.
- 변경 파일·DB·Git·스케줄·API·게시 0. ZIP 3파일: `MARKET_CALENDAR_R49_WRAPPER_SHAPE_READONLY.cmd`, `market-calendar-r49-wrapper-shape.mjs`, `README_MARKET_CALENDAR_R49_WRAPPER_SHAPE.txt`.
- 합성 비밀값·경로 비노출, VBS 선택, 실패 차단 테스트 3/3 통과. 실제 PC 결과는 사용자 실행 전 미확인.

작업 브랜치 `codex/zgmini-gpt-workspace-20261025` 유지. R45 PC 설치·R43 등급은 미변경. 다음 단계는 **R49에서 익명화된 제어 구문을 확인한 뒤 한 번에 호환 설치기를 설계**하는 것이다.
