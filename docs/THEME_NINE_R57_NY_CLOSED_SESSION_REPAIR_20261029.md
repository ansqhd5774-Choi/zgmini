# 기존 9개 테마 R57 — 뉴욕 마감일 자동 수집 연결 보수

## 원인 및 증거

- R56 PC 로그: 기존 R47 체크포인트의 마지막 확인 SPY 거래일은 `2026-10-26`이지만 검사 완료된 창의 종료일은 `2026-10-27`이었다. R47은 `WAIT_WINDOW_ALREADY_CHECKED`로 신규 제공처 요청을 하지 않았다.
- R48은 `2026-10-26`까지의 비공개 9개 테마 후보를 유지했다. R51은 `LATEST_PROVISIONAL`의 `2026-10-27`에 정렬된 R48 점수가 없다고 판단했다.
- R54 실PC 결과는 `WAIT_R48_ALIGNED_SNAPSHOTS`, `d1Writes=0`, `publicWrites=0`으로 끝났다. CMD 종료 코드 0은 **실제 D1 배포 성공이 아니다.**
- R47의 기존 cutoff는 뉴욕 현지 날짜의 전일로 고정되어, 한국 시간 오전 11:30 자동 작업이 뉴욕 정규장 마감 후에도 해당 거래일을 다음 주기까지 제외했다.

## 수정 범위

- `theme-nine-r47-recurring-private-refresh.mjs`의 cutoff만 수정: 뉴욕 현지 19:00 이후에는 **이미 마감된 해당 뉴욕 날짜**, 그 이전에는 전일을 cutoff로 지정한다. 정규장 마감(16:00 ET) 뒤 3시간 여유를 둔다.
- `THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd`를 동일 기존 패키지 생성기로 재생성한다. R47의 나머지 내부 모듈·ETF 63종·R32 산식·기존 D1 게시 경로는 불변이다.
- `THEME_NINE_R57_CLOSED_NY_FIX.cmd`는 승인된 **설치된 구버전 R47 전체 SHA**와 **신규 플래너 SHA**를 대조하고, R47 번들의 플래너 부분만 교체하며 기존 파일을 `.R57_BACKUP`으로 보존한다. 해시가 불일치하거나 델타 수집 잠금이 있으면 변경하지 않는다.
- 작업 스케줄러 등록·변경, 원가격/원자료/DB/D1 변경, 신규 ETF 선정, 잠정치 임의 생성은 없다.

## 정확한 SHA-256

- 이전 승인 R47 CMD: `2133e5d4e625762340e715ecd21e809f274713c030e904e3e3f314dc3b6a0729`
- 설치 후 R47 CMD: `5a2149556ab4ebc255ea54a14501d1511a906a2904252cad938f9de0b730a24c`
- 이전 플래너: `d856e435648656450a4f2c946dea0d88d6d2ff915f8952916763bc959a29bf98`
- 신규 플래너: `af94ee4cc9e03e69096351ad858e150190e38368aa0b9e1f84d303aec17251c6`

## 실행과 완료 판정

1. 사용자가 본인 PC에서 R57 CMD를 한 번 실행한다. 출력되는 `THEME_NINE_R57_CLOSED_NY_FIX_RESULT_*.txt` 확인. `RESULT=R57_R47_PLANNER_UPGRADED_SHA_VERIFIED` 또는 `R57_ALREADY_INSTALLED_SHA_VERIFIED`가 설치 판정이다.
2. 수집 및 게이트 조건이 맞으면 기존 정규 R48/R54 작업이 실제 데이터를 수집하고 R32 잠정치를 게시한다. 이미 확보된 `THEME_NINE_R55_PUBLISH_NOW.cmd`로 사용자가 그 주기를 수동 실행할 수도 있다.
3. **사이트/D1 배포 완료 판정은 별도:** R54 로그에서 `d1Writes>0`과 `publicWrites>0`, D1 readback 및 공개 API의 `modelRevision=R32`를 확인해야 한다. 정규 수집이 실데이터를 공급하지 않는다면 WAIT를 유지한다.
4. 다음 거래일 데이터 누락 여부 및 후속 모니터링은 사용자가 담당한다. 이전 공개 10개·이력은 보존한다.

## 자동 시험

`node --test tests/theme-nine-r57-closed-ny-repair.test.mjs tests/theme-nine-r47-recurring-private-refresh.test.mjs tests/theme-nine-r47-recurring-bundle.test.mjs tests/theme-nine-r48-private-schedule.test.mjs`

이 시험은 기존 R49 승인 번들에서의 원본 복구, R57 재구성 SHA 일치, 백업 및 재실행 안전성, 뉴욕 장 마감 전후 cutoff를 포함한다. 실제 PC 실행·D1 쓰기와 구별한다.
