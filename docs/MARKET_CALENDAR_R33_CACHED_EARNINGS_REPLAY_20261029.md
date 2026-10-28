# R33: 기존 PC 실적 저장본 재사용과 화면 표시 출력 복원 (2026-10-29)

## 문제와 확정 증거

- R31 PC 설치 보고 `R31_SITE_HTML_DISPLAY_PC_INSTALLED_NO_FORCED_COLLECTION`, 새 PC source `4466f602abfe09bb9cc7530fd109ba1d80aeacbd`는 성공. 강제 수집·게시 실행 없음.
- 공개 사이트 `GET /api/earnings-calendar-display?start=2026-10-29&end=2026-11-11` 실측 HTTP 204·본문 0B, 즉 HTML 표시본이 현재 준비되지 않은 상태. **원인 하나로 확정하지 않는다.**
- 기존 `GET /api/release-calendar`는 HTTP 200·`READY`·1,302건. 따라서 기존 공식 일정 출력 전체가 중단된 것은 아니다.
- R31 `collectEarningsApiLocal`은 `!result.skipped && READY` 조건에서만 HTML 표시본을 쓰므로 이미 당일 수집을 완료한 경우 재사용 경로가 없었다.

## 수정

- `scripts/pc-writer/earnings-api-local.mjs`의 `replayCachedEarningsDisplay`는 저장된 R30 비공개 입력을 검증하고 HTML-only R31 출력을 재생성한다.
- R30 저장본이 없어도 **같은 뉴욕 날짜에 READY로 남은 14개 R29 원문 입력**이 모두 있으면 외부 요청 없이 R30 비공개 정규화본부터 복구한다.
- 원본 확인 시각이 미래 5분 이상 또는 48시간 이전이거나 현재 뉴욕 날짜와 기간이 겹치지 않으면 출력하지 않는다. 잘못된 날짜/회사/시각/모드도 거부한다.
- 이미 내용이 동일한 HTML 출력이 있으면 다시 쓰지 않는다. 이전 공식 `release-calendar` 응답과 기업 원문 API는 수정하지 않는다.
- 정규 PC 수집 주기에서 기존 일일 API 마커를 존중하며, `skipped`라도 비공개 저장본이 있으면 새 화면 출력이 가능하다. **추가 API 호출 없음**.

## Windows R33 안전 설치

- 정확한 기존 PC source `4466f602abfe09bb9cc7530fd109ba1d80aeacbd`와 worktree identity `d0a4b3cb8b95`, 기존 파일 SHA 검증 후 `scripts/pc-writer/earnings-api-local.mjs` **한 파일만** 백업·교체·로컬 커밋한다.
- 기존 `ZGMINI-PC-Local-Core` Ready 상태와 `local-cycle.lock` 부재 확인, 원자 잠금 획득 후 파일/config 재검사. 새 스케줄러·DB 테이블·Cloudflare 설정 변경 없음.
- 설치 후 잠금을 보유한 상태로 PC SQLite `core.sqlite`의 기존 저장본을 읽어 1회 **로컬 HTML 출력 복원**을 시도한다. HTTP/API 요청이나 원격 D1 게시를 실행하지 않는다.
- 최종 로컬 보고 `cacheReplay=READY_CACHED_DISPLAY` 또는 `DISPLAY_ALREADY_READY`와 `recordCount`가 나와야 로컬 표시본 준비로 판정한다. `CACHE_NOT_FOUND`, `CACHE_EXPIRED_OR_OUT_OF_WINDOW` 등의 경우 **코드 설치 성공과 데이터 준비 실패를 구분**한다.
- 로컬에 HTML 출력이 생기더라도 기존 정상 PC 게시 주기가 D1로 동기화하기 전까지 사이트 0건일 수 있다. 운영 예약 작업 실행 확인은 사용자 담당으로 두고 별도 감시를 추가하지 않는다.

## 권리와 검증

- EarningsAPI 약관상 자체 사이트 표시와 원본 독점 데이터 피드 재게시 제한을 구별한다. 공개 응답은 이스케이프된 HTML만 제공하고 비공개 원문 입력/키를 노출하지 않는다.
- 검증: 기존 R29/R30/R31/R32 수집·표시 회귀, R33 비공개 저장본/원문 복원·스키마 읽기쓰기·48시간 초과 차단·한 파일 안전 설치·잠금·20분 제한 대기, 타입 검사 및 빌드.
- GitHub 기존 작업 브랜치에 코드/문서/테스트. 사이트 코드 변경이 없으므로 `main` 재배포는 의도하지 않는다.
- R33 ZIP은 PC 설치를 위한 사용자 실행물. 최종 상태는 PC 결과 로그가 있어야 확정된다.
