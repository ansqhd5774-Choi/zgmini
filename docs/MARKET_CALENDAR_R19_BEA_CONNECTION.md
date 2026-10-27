# 시장 캘린더 R19 — 기존 PC Core에 BEA 공식 발표 일정 연결

## 목적과 범위
- 사용자 최신 지시(2026-10-27): **시장 캘린더 경제·실적·시장 일정의 공식 소스 연결을 계속한다.** 수집·게시 실시간 감시나 6시간 주기 실행 대기는 연결 작업 완료 조건이 아니다.
- R17에서 PC Core의 lib/release-calendar.mjs에 BLS 확장이 한 파일 변경으로 설치되었다. R19는 **BEA 확대만** 같은 파일에 순차 적용한다.
- 새 사이트·API·데이터베이스·별도 수집기·스케줄러를 만들지 않는다. 실적 연동은 별도 진행 중인 기존 실적 작업과 중복하지 않으며 미승인 공급자를 편입하지 않는다.

## 공식 데이터와 ID 유지
- BEA 공식 원천: https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics (기존 연결 URL), 안내: https://www.bea.gov/news/schedule
- 기존 GDP ID 'gdp', 개인소득·지출 ID 'pce' 유지.
- GDP by County/State 발표·무역·국제거래·기업이익·지역 지표 등 기타 BEA ICS 항목은 'bea-'로 시작하는 제목별 ID로 구분한다. 같은 날짜의 다른 발표가 덮어써지지 않는다.
- 제목·발표일·출처별 URL과 이벤트 5개 필드(id/date/title/source/sourceUrl) 유지. 취소된 일정 제외.
- PC 저장 원본 shadow R7/R8 과거 결과: BEA 기존 71건→후보 168건. 이는 당시 저장 원본에 대한 **가상 계산**으로 운영 게시 건수가 아니다.
- BLS(설치 SHA256 54c73721…), Fed, Census 파서와 RELEASE_SOURCES URL, 경기 지표 mapping, 수집 가드, 게시 원장은 변경하지 않는다.

## 브랜치 산출물
1. staging/market-calendar/r19-bea/lib/release-calendar.mjs — BLS 설치 파서에서 BEA classifier만 변경한 단계 파일. 운영 collector는 아직 이를 자동 import하지 않는다.
2. tests/market-calendar-r19-bea-stage.test.mjs — BEA 발표, GDP·PCE·county ID, 중복·취소·5개 필드·BLS/Fed/Census 동일성 회귀.
3. scripts/pc-writer/market-calendar-r19-bea-apply.mjs — 기존 등록 Core → R38 wrapper → origin VBS → 원래 Core Git checkout 계보 확인, 출처·해시·설정 점검, 로컬 단일 파일 커밋 및 config.source 정렬.
4. tests/market-calendar-r19-bea-apply.test.mjs — 단일 파일, 백업, config·ledger 보존, source·lock·해시 변경 안전 중단 fixture.
5. MARKET_CALENDAR_R19_BEA_APPLY.cmd — 사용자 PC 일회 적용용 Windows CMD. 결과 MARKET_CALENDAR_R19_BEA_APPLY_RESULT.txt 생성.

## 안전한 적용 조건
- 기존 PC source e778f58d056e45c515fac95b4ed48295f6a3ed1a (R17 BLS 설치), 파서 SHA256 54c737218a40fec6482b469f7962fe5e8cd7c040705d58072396cffcdcb74c08, Core 비식별 worktree ID d0a4b3cb8b95를 일치 확인한다.
- 다른 작업이 PC source/config/parser/실행 위치를 변경했으면 자동 승인·덮어쓰기 없이 STOP.
- Core lock 배타 획득 후 기존 parser와 config를 market-calendar-r19-backups 하위에 보존.
- 새 커밋은 승인 BLS source를 부모로 하여 lib/release-calendar.mjs 파일 한 개만 변경해야 한다. config.source만 새 HEAD로 정렬. DB·게시 원장·작업 스케줄러·원자료 보존.
- GitHub push/main merge/Cloudflare 배포, 강제 수집·게시·실시간 감시, 별도 페이지 생성 없음.
- 실패 시 게시본 보존. 커밋 전 파서 복원; 커밋 이후 실패 시 reset 없이 수동 복구 요청.

## 완료 기준과 다음 단계
- 브랜치 테스트 PASS는 **코드 준비 완료**, PC 설치나 운영 게시 성공이 아니다.
- CMD 결과 'BEA_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION'이면 **기존 PC 경로에 BEA 연결 설치 완료**. 이후 실제 사이트 확인은 사용자가 수행한다.
- 6시간 예약 수집을 기다리거나 실시간 readback을 수행해야 다음 소스 코드 개발을 시작하는 것은 아니다. 사용자가 실제 오류를 관측하면 그 오류를 최소 수정한다.

## R19 적용 결과 1차와 진단 개선
- 사용자 PC 결과(2026-10-27T10:15:45.895Z): 후보 BEA 해시와 기존 BLS 파서 해시, 기존 Core worktree ID가 일치했다. 결과는 BEA_INSTALL_ABORTED_OR_RESTORED_STOP / LOCAL_OPERATION_FAILED이며 백업 생성 전 중단, 새 Git source 없음, 수집·게시 실행 없음.
- 해당 1차 로그는 실제 오류 원인(기존 Core lock 충돌, 백업 파일 접근, 기타 파일 시스템 오류)을 구별하지 못한다. 특정 원인을 입증한 것처럼 보고하지 않는다.
- 후속 적용기의 출력에 실패 단계 phase와 파일 시스템 오류 분류 errorCode를 추가하고, 파서 백업이 완전하게 검증된 이후 실제 파서를 변경한 경우에만 자동 복원하도록 보완한다. 기존 lock 제거·우회나 예약 작업 변경은 허용하지 않는다.
- 동일 CMD를 수정된 묶음으로 1회 재시도하여 결과의 phase/errorCode로 국소 판정한다. 실시간 공개 데이터 검사·6시간 대기는 하지 않는다.

## R19 적용 결과 2차 — 기존 PC Core 설치 성공 (2026-10-27)
- 재실행 결과 파일: `MARKET_CALENDAR_R19_BEA_APPLY_RESULT(1).txt`. 결과 시각: 2026-10-27T10:23:37.188Z.
- 확정 판정: `BEA_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION`, 적용 phase: `INSTALLED`.
- 기존 PC Core에 생성된 새 source: `e4b0624683f29c551df381777dea871d7e3dd266`.
- 변경 경로: `lib/release-calendar.mjs` **한 파일**. parser 백업 생성 `true`.
- **1차 실패가 최종 상태라는 기존 서술은 2차 성공 결과에 따라 정정한다.** 1차 실패 로그 자체는 진단 이력으로 보존한다.
- 설치 완료는 BEA 확대 파서가 기존 PC Core에 들어갔다는 의미다. 강제 수집·게시를 실행하지 않았으므로 신규 BEA 일정의 정규 수집·운영 화면 노출 여부까지 증명한 것은 아니다.
- 후속 공식 일정 확대(R20 Census)는 위 새 source 계보를 기준으로 진행한다. source·hash·Core 작업 위치를 실측 검증하기 전 새 파서 덮어쓰기 금지.
