# 기존 9개 테마 잠정치 점수 연결 — R51/R52 (2026-10-28)

## 목적 / 변경 불가

- 이 작업은 산업 성장률·CAGR·전망치 조사가 아니다. 기존 **테마 공포탐욕 지수**의 **잠정치 점수**를 확정치 뒤의 공개 날짜에 연결한다.
- 열 번째 우주·위성 테마에서 사용하던 R37/R2/R25/R32 점수 기준을 새로 만들거나 바꾸지 않는다.
- 기존 9개 테마 63종 고유 ETF/64포지션과 R47 수집 → R48 사적 후보 경로를 유지한다.
- 기존 일정 작업 `ZGMINI-PC-Theme-Nine-R47-Private` 및 공개 확정치·다른 테마·D1은 건드리지 않는다.

## 기존 경로와 누락된 연결

1. Windows R47 일일 수집은 SPY 거래일 기준 원시 1시간 가격에서 기존 방식으로 9개 테마 점수를 계산한다.
2. R48 단계는 그 결과의 **252거래일 확정 후보**만 SHA 검증 후 비공개 폴더에 기록했다.
3. 공개 `/api/theme-fear-greed`는 `phase=PROVISIONAL`이면 `confirmedObservationDate`와 `provisional.points[].date`를 이미 제공한다.
4. R51은 공개된 날짜 목록과 **동일 날짜의 R48 기계산 점수**를 짝지어 `provisional.points[].scores`로 보존한다. 별도 가격·새 산식·추정 점수는 사용하지 않는다.

## R51 검증 / 파일

- 확정 기준일과 공용 252일 날짜 배열이 완전히 일치해야 한다.
- 기준일 R48 후보 및 마지막 잠정일 R48 후보가 각각 SHA 검증된 원본이어야 한다.
- 그 사이 공개 잠정일은 최대 2일이며, 마지막 잠정일 R48의 252일 구간에 **모두 존재**해야 한다.
- 두 R48 후보의 기존 확정 날짜 겹침 점수가 1개라도 다르면 중단한다.
- ETF 순서, 고정 AUM 기준일, 원본 가격 모드, 수동 권리 승인 6개 플래그가 변하면 중단한다.
- 통과하면 `E:\ZGmini\data\themes\legacy-nine-r51-private-provisional\THEME_NINE_R51_PRIVATE_PROVISIONAL_*.json`에 **비공개** 9개 테마 후보를 저장한다.
- 다른 테마의 공개 잠정 점수는 기존 공개 R37 리더에서 그대로 보존한다.

## R52 설치 CMD

`scripts/pc-writer/THEME_NINE_R52_PROVISIONAL_CONNECT.cmd` 1개 파일을 Windows에서 실행한다.

- R49에 설치한 `E:\ZGmini\data\pc-writer\theme-nine-r48`의 전용 `theme-nine-r48-stage-current.mjs`만 SHA 비교한 뒤 이전 파일을 `.R49.BAK`으로 보존하고 교체한다.
- `theme-nine-r51-provisional-overlay.mjs`, `theme-nine-r51-stage-current.mjs`를 같은 디렉터리에 추가한다.
- 기존 R50 일정 작업이나 R47 채집기를 재설치·교체·실행하지 않는다. 설치 직후에는 R48의 기존 **사적 단계만 1회** 시도한다.
- 일일 R48 사적 단계가 실행될 때 R51 잠정 점수 연결도 자동으로 따라 실행된다.
- 설치 폴더/원본 SHA가 다르거나 백업 충돌 시 **중단**한다.
- 결과는 CMD 옆 `THEME_NINE_R52_PROVISIONAL_CONNECT_RESULT_*.txt`로 남긴다.

## 상태 판정

| 상태 | 의미 |
| --- | --- |
| `R51_PRIVATE_PROVISIONAL_STAGED_NOT_PUBLISHED` | 9개 잠정 점수 비공개 후보 생성 성공, **공개 아님** |
| `WAIT_PUBLIC_PROVISIONAL_DATES` | 공개 API에서 잠정 구간 날짜가 아직 제공되지 않음 |
| `WAIT_PUBLIC_FEED_UNAVAILABLE` | 공개 API 응답 불가/503. 기존 확정 수집은 유지 |
| `WAIT_R48_ALIGNED_SNAPSHOTS` | 공개 확정 기준일 또는 마지막 잠정 날짜와 정확히 맞는 R48 보관본 없음 |
| `STOP_R51_PROVISIONAL_INDEPENDENT` | R51 검증 실패/예외. R48 확정 수집은 계속됨 |

## 공개 연결의 범위

- R51 후보는 6개 권리·가격 검증 플래그를 `false`로 유지하며, DB에 업로드하지 않는다.
- 공개 리더 `worker/theme-nine-r37-public.mjs`는 이미 확정 이력+잠정 날짜 점수 결합을 지원하지만, 독립적인 정식 승인·저장 조건에 맞지 않으면 이 후보를 표시하지 않는다.
- 따라서 **CMD 설치/비공개 잠정 점수 생성 성공과 사이트 공개 배포 완료는 서로 다르다**. 사용자 PC 로그 및 승인된 공개 데이터 경로 확인 없이 공개 성공으로 보고하지 않는다.

## R53: 기존 27일 잠정치의 날짜를 재사용하도록 보완

- R52 PC 로그에서는 `confirmedDate=2026-10-26`, `latestDate=2026-10-27`, `missing=LATEST_PROVISIONAL`가 관측됐다. **공개 27일 잠정치가 없는 것이 아니라, 정확히 27일에 끝나는 R48 저장본이 없다는 뜻**이다.
- 기존 R51은 마지막 잠정일과 R48 최종 관측일의 날짜가 정확히 같아야만 통과시켰다. 그러나 **28일자 R48 확정 후보의 252일 점수 이력**에 27일 점수가 이미 계산되어 들어 있다면, 27일 전용 파일을 추가 수집할 이유가 없다.
- R53은 날짜가 일치하는 파일을 먼저 선택하되, 없으면 **마지막 잠정일 이후에 생성된 가장 이른 R48 후보**를 선택한다. 요청한 잠정 거래일이 R48 이력에 있어야 하고, 앞선 확정치와 겹치는 점수가 완전히 동일해야 한다. 어느 하나라도 틀리면 중단한다.
- 27일 값을 추정하거나, 공개 7개 테마의 옛 2-ETF 점수를 새 9개 테마 점수로 복제하는 일은 없다.
- `scripts/pc-writer/THEME_NINE_R53_PROVISIONAL_HISTORY_CONNECT.cmd`는 이미 설치된 R52 전용 폴더에서 R51 모듈 **두 개만** 사전 SHA 확인 및 `.R52.BAK` 보관 후 교체한다. 기존 R48 단계·R47 수집·예약 작업·기존 R52 실행 파일은 수정하지 않는다.
- 파일 설치 후 R48 사적 후보 생성 단계를 한 차례 재시도하되 가격 API 64건 재수집, D1 쓰기, 공개 반영은 실행하지 않는다. 로그 `THEME_NINE_R53_PROVISIONAL_HISTORY_CONNECT_RESULT_*.txt`의 `provisional.status`를 확인한다.
- R53은 향후 28일 데이터에 27일이 포함되는 경우에 대한 **사전 연결 보완**이다. 27일 점수가 들어 있는 R48 원본 자체가 아직 없으면 `WAIT_R48_ALIGNED_SNAPSHOTS`는 정상이며, 이후 정규 수집이 필요한 상태다.
