# R48 — 현재 PC Core wrapper 인식 및 R45 저장기 안전 설치

## 사용자 PC 실측 증거 (2026-11-01)

R46 설치 결과는 `R46_CORE_ORIGIN_CHANGED_STOP`이고 `worktreeId:null`, `changedFiles:[]`, `backupCreated:false`였다. 이어 받은 R47 읽기 전용 진단 결과:

| 검사항목 | 관측 |
|---|---|
| 예약 작업 XML | 정상 읽힘, 실행 작업 1·인자 1 |
| 실행 방식 | WScript |
| 인용된 VBS wrapper | 1개, 파일 읽기 성공 |
| 기존 `run-local-core.vbs` 엄격 일치 | 0개 |
| R38 wrapper marker | 없음 |
| 기존 `origin = "..."` 항목 | 0개 |
| origin 스크립트·worktree ID | 미결정 |
| 파일·DB·예약 작업 변경 | 0 |

따라서 경로 자체의 변경보다는 **R46이 의존한 오래된 wrapper 포맷과 현재 운영 환경 사이의 불일치**가 확인됐다. 구형 marker/일치하는 절대 경로를 임의 복원하거나 E: 프로젝트 목록에서 임의 디렉터리를 골라 설치하지 않는다.

## R48 방식

1. 실제 `ZGMINI-PC-Local-Core` 예약 작업 XML에서 정확히 1개의 인용된 VBS wrapper만 확인하고, 그 파일만 64KB 상한으로 읽는다.
2. 기존 R38 wrapper라면 승인된 구형 원점 추적을 그대로 사용한다. 그 밖의 wrapper에서는 실제 shell 실행 형태와 전용 `scripts/pc-writer/{quota-runner,local-cycle,run-local,collect-local}.mjs` 절대 참조를 **중복 없이 한 개만** 찾는다. 직접 참조가 없으면 인용된 CMD 원점 파일을 한 단계만 추가 확인한다.
3. 실제 참조된 Node 실행 파일이 존재해야 하며, 임의 C:/E: fallback·광역 검색·유추된 프로젝트 경로를 사용하지 않는다. 경로 모호/소멸/동적 조립 등 원점 불확정은 원격·PC 원문 없이 코드상 중단한다.
4. 검증된 root가 확인된 뒤에는 기존 R46 설치기의 Core source/config HEAD 일치·Git 보호 경로 clean·R45 정확한 패치 anchor·sidecar SHA·백업·배타 잠금·로컬 4파일 커밋·config source 업데이트 조건을 **완화하지 않고** 재사용한다. 외부 quota-runner 잠금이 있으면 설치 전에 중단한다.
5. 설치 중 자동 수집·API 요청·게시·DB/스케줄 변경·GitHub push는 수행하지 않는다. R43 전체 ★등급과 77.3%(102/132) 시뮬레이션은 그대로 잠정 단계이다.

## 확인 방법

- `MARKET_CALENDAR_R48_PC_APPLY.cmd` 실행, 같은 폴더 `MARKET_CALENDAR_R48_PC_APPLY_RESULT.txt` 확인. 성공은 정확히 `R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION`일 때만이다.
- 다음 **기존** B1 정규 수집 뒤 `MARKET_CALENDAR_R48_PC_VERIFY.cmd`를 실행해 별도 TXT의 저장일·유효 종목 수·해시를 읽기 전용 검증한다.
- wrapper에 동적으로 조립되는 명령만 있으면 R48은 STOP·단계별 개수만 보고하며, 사용자 PC 파일이나 설정 원문을 GitHub에 복사하지 않는다.

## 코드와 테스트

- `scripts/pc-writer/market-calendar-r48-core-origin.mjs`: modern VBS / VBS→CMD / 기존 R38 인식
- `scripts/pc-writer/market-calendar-r48-pc-apply.mjs`: R46 보호 게이트 재사용
- `tests/market-calendar-r48-core-origin.test.mjs`: 최신 wrapper·간접 CMD·스크립트 소실·중복·원점 재확인·quota lock 검사
- `scripts/pc-writer/market-calendar-r46-pc-apply.mjs` 및 기존 R45 sidecar는 변경 없이 동봉
- Windows CMD 2개와 모든 Node helper 포함 `MARKET_CALENDAR_R48_PC_INSTALL_20261101.zip`

브랜치 `codex/zgmini-gpt-workspace-20261025` 유지. 실제 PC 실행 결과 전까지 **R48 CODE_READY, R45 PC_INSTALLED 미확인**. `main` 병합·Cloudflare 배포 없음.
