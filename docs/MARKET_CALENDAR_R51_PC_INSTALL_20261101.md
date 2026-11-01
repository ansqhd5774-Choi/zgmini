# R51 — 첫 번째 VBS 실행 체인의 Core 원점 추적

## R50 실측 결과

사용자가 제공한 `MARKET_CALENDAR_R50_PC_APPLY_RESULT.txt`:

- `decision: R50_NODE_ENTRY_OUTSIDE_REPO_SCRIPTS_STOP`
- `wrapperHashMatched: true`, `scheduledEntryName: archive-run.mjs`
- `entryUnderDataPcWriter: true`, `hasGitOperation: true`, `hasConfigReference: true`
- `sourceWrites: 0`, `changedFiles: []`, `backupCreated: false`, `dbWrites: 0`, `schedulerChanged: false`, `published: false`

R49의 외부 예약 wrapper에는 `Shell.Run` 두 개가 순차로 있다. 첫 번째는 `.vbs`를 실행하고 비정상 종료 시 바로 종료한다. 두 번째 `.mjs`는 `archive-run.mjs`이며 데이터 PC writer 내부의 보관 프로그램이다. 따라서 **두 번째 명령을 Core 소스 경로로 추적한 R50 제한을 수정**한다.

## R51 방식

1. 실제 예약 작업 XML의 wrapper를 읽고 R49에서 확인된 SHA-256 `f05deb73cbadf831d7d3a9875bfbd13356d4ab21803fe9b7944a3f2ae6a5499d`과 일치해야만 진행한다.
2. 첫 번째 `Shell.Run`만을 Core 후보로 삼고, 인용된 단 하나의 실제 VBS 파일을 읽는다. `wscript.exe`/`cscript.exe` 또는 직접 절대 `.vbs` 명령을 지원한다. VBS 중첩 호출은 최대 3단계이고 순환·다중 경로를 중단한다.
3. 기존 R38 원점 검증기, R48 VBS→CMD/Node 원점 검증기, 단일 직접 Node `scripts/pc-writer/*.mjs` 원점 검증기를 순서대로 적용한다. 검증된 경로가 없다면 PC 소스에 쓰지 않고 VBS의 변수·문자열을 익명화한 구문과 파일 해시만 출력한다. 실제 원본 경로, 명령과 PC 설정은 결과에 포함하지 않는다.
4. Core 원점이 하나로 확정되면 R46 보호 설치기를 변경 없이 호출한다. PC `config.source`↔Git HEAD 일치, 보호 소스 clean, 기존 수집 중단 잠금, 전용 배타 잠금, R45 SHA, 정확한 변경 4파일, 백업 및 사후 검증, 로컬 Git commit과 config source 업데이트를 그대로 적용한다. 잠금 획득 뒤에도 예약 실행 체인을 재검증한다.
5. 강제 수집·외부 데이터 API·DB·예약 작업·GitHub push·사이트 공개·`main` 병합은 하지 않는다.

합성 테스트: 첫 VBS 직접 실행, 이중 중첩, 상위 wrapper 변경, 미결정 경로의 익명화, quota-runner 잠금 및 R46 보호 전달 5개 통과. 기존 R46 백업·롤백 6개 통과.

**R51 코드 준비와 PC 실제 설치는 구분한다.** 실제 성공 판정은 `R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION`만이다. R43 전체 ★등급과 77.3%(102/132) 시뮬레이션을 공개 반영한 것으로 판단하지 않는다.

브랜치: `codex/zgmini-gpt-workspace-20261025`.
