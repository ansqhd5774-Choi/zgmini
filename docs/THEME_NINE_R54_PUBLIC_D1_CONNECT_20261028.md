# R54 — 기존 9개 테마 확정치·잠정치 공개 연결

작업일 2026-10-28, 전용 브랜치 `codex/theme-fear-greed-integration-20261025`.

## 목적과 변경하지 않은 항목

- 새 산식·산업 성장률·전망치 추가 작업이 **아니다**. 열 번째 테마에서 이미 구현된 공개 방식을 기존 9개 테마 R32 자동 점수에 연결한다.
- 63종 고유 ETF/64포지션, 개별 R25 점수, R32 테마별 집계, R47 1시간 무보정 원시값, R48 저장된 확정 후보, R51/R53 저장된 잠정 후보를 재사용한다.
- 원래 공개 7개 지표, 추가 데이터센터·전력과 우주·위성, 252거래일 날짜, 잠정치 1~2개 날짜, 다른 D1 키를 수정하지 않는다. 공개에 없던 AI·반도체 9번째 연구 테마를 임의로 신규 공개하지 않는다.
- 실제 2026-10-28 공개 API에는 `confirmedObservationDate=2026-10-26`이면서 잠정 날짜가 `[2026-10-26, 2026-10-27]`로 제공된다. **첫 잠정일이 확정일과 같을 수 있다는 기존 공개 계약**을 R51과 R37 검증에 맞췄다. 두 번째부터는 반드시 이전 날짜보다 뒤여야 하고, 날짜·점수는 공개 API 원본을 그대로 기준으로 삼는다.
- 기존 `ZGMINI-PC-Theme-Nine-R47-Private` 예약 작업과 R47/R48 파일은 유지한다.

## R54 코드 경로

1. `worker/theme-nine-r37-public.mjs`: 엄격한 공식 권리 검증 경로는 유지하고, **게시자가 익명 제공자의 이용약관상 미확인 위험을 명시적으로 수락한 파생 점수 전용 경로**를 추가했다. `accountGoodStandingVerified`, `upstreamCommercialRightsVerified`, `derivedLicenseVerified`, `anonymousScopeIndependentlyConfirmed`, `sourcePriceReconciled`는 실제 확인되지 않았으므로 모두 `false`다. `sourceManifestVerified`, `privateReplayVerified`, `derivedOnlyNoRaw`는 실제 검증을 통과한 경우에만 `true`다.
2. `scripts/pc-writer/theme-nine-r54-public-connect.mjs`: 현재 공개 API의 확정일과 잠정일을 조회한다. 기존 R47 비공개 ETF/NINE 파일을 바이트·SHA로 확인한 뒤 R48 후보를 복원하고, R51 잠정치 변환을 다시 실행해서 **전 날짜·점수 동일성**을 검사한다. 마지막 R47 원시 소스의 매니페스트 및 참조 페이지 해시도 검사한다. 날짜나 해시가 맞지 않으면 D1에 기록하지 않는다.
3. `theme-nine-r54-deployment-gate.mjs`: GitHub `main`의 R37 리더 원본 SHA가 PC 승인 원본과 일치하고, **정확히 같은 main 커밋**에 대해 Cloudflare 운영 Worker의 성공한 빌드가 확인되어야 한다. 전용 브랜치에만 존재하는 변경은 공개 권한이 아니다.
4. `theme-nine-r48-d1-publication.mjs`: 기존 R37 전용 키 `theme-legacy-nine-r37`에만 D1 비교 후 교환(CAS)을 수행하고 원문 재조회 일치를 검증한다. 예전 점수 이력 불변·동일 날짜 중복 불변 조건을 보존한다.
5. 공개 API를 한 번 더 읽어 공개 10개 테마의 순서, 확정 252일 이력, 잠정 날짜·점수를 검증한다. D1 저장은 확인됐으나 공개 캐시가 따라오지 않았으면 `D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH`로 구분한다.

## PC 실행 CMD

- `scripts/pc-writer/THEME_NINE_R54_PUBLIC_CONNECT.cmd`는 **단일 다운로드 파일**이며 15개 모듈/승인 설정을 SHA-256 검증 후 `E:\ZGmini\data\pc-writer\theme-nine-r54`에 따로 설치한다. 기존 파일이 같은 이름으로 존재하지만 해시가 다른 경우 임의 덮어쓰지 않고 중단한다.
- 먼저 GitHub main/Cloudflare 운영 배포 확인을 통과해야 한다. 미통과 시 설치된 파일은 보존하지만 신규 예약 작업과 D1에는 손대지 않는다.
- 열 번째 테마와 동일하게 익명 출처의 미확인 권리 위험을 안내한 후, PC 사용자가 `ACCEPT`를 입력해야만 1회 공개 연결을 시도한다.
- 기존 R47/R48 작업과 충돌하지 않는 독립 예약 작업 `ZGMINI-PC-Theme-Nine-R54-Public`을 한국시간 **매일 13:30**에 신규 등록한다. 이미 같은 이름의 작업이 있으면 명령 파일을 검증하고 보존한다. 다른 작업을 강제 종료·재설정하지 않는다.
- CMD 같은 디렉터리: `THEME_NINE_R54_PUBLIC_CONNECT_RESULT_*.txt`. 이후 독립 주기 로그: `E:\ZGmini\data\pc-writer\theme-nine-r54\logs\THEME_NINE_R54_CYCLE_*.txt`.
- 원시 API에 추가 GET을 보내지 않는다. R47 기존 수집이 더 늦게 완료되거나 27일 잠정 점수가 아직 로컬 R48에 없으면 `WAIT_R48_ALIGNED_SNAPSHOTS`로 정상 대기한다. 사용자가 다음 거래일 공개 화면을 직접 모니터링한다.

## 결과 해석 (확인 전 성공 표시 금지)

| 로그 상태 | 의미 |
| --- | --- |
| `PUBLIC_API_VERIFIED` | R37 D1 재조회 + 실제 공개 테마 확정/잠정 점수 일치 |
| `D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH` | D1 기록과 재조회 완료, 공개 API 반영은 추가 확인 필요 |
| `WAIT_R48_ALIGNED_SNAPSHOTS` | R47/R48 점수 원본에 현재 공개 잠정일이 아직 없음 |
| `WAIT_MAIN_PRODUCTION_SOURCE_DEPLOYMENT_NO_D1_NO_TASK` | 전용 브랜치 코드가 `main` 운영 빌드에 아직 배포되지 않음 |
| `STOP_R54_*` | 해시/계약/권한/배포/PC 인증/동시성 등 안전 조건 실패 |

**이 문서는 연결 코드와 실행 절차의 기준이지, Windows PC에서 실행되었거나 실제 공개 배포가 확인되었다는 증빙이 아니다.** 그 증거는 실행 TXT와 Cloudflare Git 빌드·D1·공개 API 재조회를 통해서만 확정한다.

자료 이용약관: https://getmarkethistory.com/docs/terms — 파생 결과물 재배포 허용 문구가 계정 정상 상태에 조건부로 명시되어 있으므로, 익명 API 사용에 대한 독립적인 권리 확인을 주장하지 않는다.
