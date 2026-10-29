# 일반챗 전달용 — 테마 공통 도구의 1회성 CMD 전환 패키지

## 목표

기존 일반챗도 Windows PC에 직접 접근하지 않고, 사용자가 로컬에서 한 번 실행할 수 있는 검증된 ZIP+CMD 패키지로 공통 테마 도구 전환을 진행할 수 있게 하라. 코드 준비·실제 설치·원격 게시·배포를 구분한다.

## 대상

- 저장소: `ansqhd5774-Choi/zgmini`
- 기존 전용 브랜치: `codex/theme-fear-greed-integration-20261025`
- 검토 기준 구현 커밋: `f89dd261b40aba68d341d989cd55b84cbf3c1ebd`
- 공통 작업 방식: `docs/CMD_EXECUTION_PLAYBOOK.md`
- 테마 작업 인수인계: `docs/THEME_CONFIG_WORKFLOW.md`
- PC 공통 도구: `E:\ZGmini\data\pc-writer\theme-config-tool`
- 기존 전환 코드: `scripts/pc-writer/theme-config-upgrade.mjs`
- 기존 공통 작업: `ZGMINI-PC-Configured-Themes`

시작 시 최신 브랜치와 적용되는 AGENTS.md를 확인하라. 소스가 이후 변경됐다면 검토 기준과의 차이를 확인해 패키지의 정확한 실행 SHA를 고정하라. 기존 다른 작업은 보존하고 신규 브랜치를 만들지 마라.

## 이번 실행 범위

기존 공통 예약 CMD 한 개를 자동 게시 모듈이 포함된 새 불변 버전으로 안전하게 전환하는 패키지를 준비한다. 기존 `upgradeConfiguredSchedule()`을 재사용한다. 이번 요청만으로 D1 실제 게시·테마 등록·권리 승인 생성·main 직접 쓰기·사이트 배포까지 승인된 것으로 취급하지 않는다.

## 수행 절차

1. 현재 설치 명세와 원격 코드를 대조하고 전환 함수의 입력·보호 검사·복원 동작을 확인하라. 일반챗에서 PC를 읽지 못하면 사용자가 실행할 읽기 전용 PREFLIGHT와 최소 상태 보고 형식을 제공하라.
2. 고정 commit에서 필요한 파일만 패키징하라. 정적·동적 import와 config/worker 의존 파일을 모두 포함하고, 소스 전체나 개인정보·원자료·인증파일을 무분별하게 넣지 마라.
3. `git rev-parse HEAD` 의존성에 유의하라. Git 없는 ZIP에서 Git 메타데이터를 위조하거나 검사를 해제하지 마라. 전체 패키지 해시를 검증한 wrapper가 기존 exported `upgradeConfiguredSchedule({dataRoot,sourceSha})`를 호출하도록 구성하라. sourceSha 문자열은 검증된 고정 소스의 증거와 대조해야 한다.
4. CMD는 기존 `E:\ZGmini\runtime\node.exe`와 포함된 기존 전환기를 호출하는 얇은 launcher로 작성하라. 코드·명세·보호 검사를 우회하는 별도 설치기를 만들지 마라.
5. 읽기 전용 PREFLIGHT와 실제 INSTALL을 분리하라. 전환 함수 호출 자체를 PREFLIGHT로 실행하면 안 된다. PREFLIGHT는 설치 명세/파일 SHA/의존성/기존 CMD·VBS/작업 XML/관련 실행·잠금 상태만 확인하고 쓰기·수집·D1 요청을 하지 않는다.
6. 실제 전환은 기존 전환기가 수행하는 stage→백업→단일 CMD 교체→readback→XML 동치 확인→실패 시 복원을 사용한다. 예상 밖 차이·잠금·기존 시도 기록이 있으면 STOP하고 기록을 분석하라. 보호 파일을 삭제하거나 검사 조건을 낮추지 마라.
7. 실제 package를 `.git` 없는 폴더, 공백·한글 경로에서 시험하라. fixture 테스트와 실제 PC 전환 결과를 구분하라. Windows 실행을 검증할 수 없으면 `WINDOWS_PACKAGE_RUNTIME_UNVERIFIED`로 명시하고 사용자 1회 검증 경로로 넘겨라.
8. `AUTO_PUBLISH_UPGRADE_RESULT.json` 등 기존 전환 결과와 패키지 결과 TXT를 연결하라. 실패하면 정확한 단계·코드·실제 변경 여부·복원 결과·다음 최소 조치를 기록하라. 토큰·개인 원자료는 출력하지 마라.

## 패키지 제출

- ZIP: 고정 소스 SHA, 검증된 파일 SHA manifest, 필수 모듈
- `RUN_PREFLIGHT.cmd`: 읽기 전용
- `RUN_INSTALL.cmd`: 기존 전환기 호출, 결과 로그 저장
- `README_KO.txt`: 목적·준비 상태·파일 위치·실행 순서·입력·정확히 1회·정상 코드·STOP 조건·금지행동·돌려보낼 결과
- `PACKAGE_RESULT.txt`: 실제 실행 후 생성, `SOURCE_SHA`, 단계, 상태, 검증된 구/신 SHA, 기존 작업 XML 보존, 백업/복원, 미실행 작업 명시

기존 설치 폴더·등록 데이터·원본·점수·13:00 trigger·R73/R48/R47·기존 10개 테마·R32 산식을 보존하라. 샘플 또는 임의 실테마를 등록하지 마라. 사용자에게 비밀번호/API key를 대화로 보내도록 요구하지 마라.

## GitHub·배포는 별도

이 패키지는 PC 전환을 위한 것이다. 현재 브랜치가 main과 갈라졌다는 이유로 main에 직접 덮어쓰거나 브랜치 전체를 병합하지 마라. 최초 공통 API/UI 배포에는 기존 승인된 PR→main→Cloudflare Git 연동 경로와 별도 대상 diff 검증이 필요하다. 실행 가능한 선별 반영 경로가 없으면 필요한 최소 예외를 구체적으로 제시하라. CMD 파일 하나에 PC 전환과 main 반영·운영 배포를 몰래 묶지 마라.

## 완료 보고

작업 브랜치·정확한 소스 SHA, 패키지/manifest SHA, 재사용한 실행기, 테스트 환경과 결과, 실제 PC 적용 여부, 백업/복원 결과, D1·배포 미실행 여부, 남은 최소 조치만 보고하라. 패키지만 제작했다면 PC 설치 완료라고 보고하지 마라.
