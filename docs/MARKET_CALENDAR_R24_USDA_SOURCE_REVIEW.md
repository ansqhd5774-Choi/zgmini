# ZGMINI 시장 캘린더 R24 — USDA WASDE 발표 일정

## 범위 및 상태 · 2026-10-28

- 유지 브랜치: `codex/zgmini-gpt-workspace-20261025` (**새 브랜치 없음**).
- R23 EIA 사용자 PC Core 설치 성공 SHA `8ff396217c9f84578b37c9d422381644c2b8f0e8` 보존. 정규 수집·공개 사이트 반영은 아직 미검증.
- R24는 공식 WASDE 발표 날짜 수집을 위한 **읽기 전용 원문 확인 + 스테이징 파서** 단계. Core·기존 소스·SQLite·게시기·스케줄러·GitHub main/배포 변경 없음.

## 공식 공급원

- 공식 URL: https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report
- USDA World Agricultural Outlook Board의 월간 *World Agricultural Supply and Demand Estimates* (WASDE) 발표 일정. 농산물·곡물·육류 수급 전망 발표이며 미국 시장·원자재 투자자 대상 일정이다.
- USDA 웹페이지에는 **2026년 12건 및 2027년 12건을 명시적으로 제시**하며 **미 동부 12:00** 발표를 기재한다. 2026-10-28 이후 발표는 2026년 2건 및 2027년 12건이다.
- 2026년 향후: **11월 10일, 12월 10일**. 2027년: **1/12, 2/10, 3/10, 4/9, 5/12, 6/11, 7/9, 8/12, 9/10, 10/8, 11/10, 12/10**.
- 공식 원문에서 명시된 연도·월·일만 이벤트로 변환한다. 임의 매월 계산, 관례적 평일 추정, 가상의 미래 날짜 생성 금지.
- `id=usda-wasde`, `source=usda`, 고정 sourceUrl, 발표일 5필드로 전송할 계획이다. 고유 event ID/날짜 중복 제거, 원문 저장 후 저장 자료에서 파싱하는 기존 PC 계약을 따른다.

## 구현 내용 및 다음 게이트

1. `scripts/pc-writer/market-calendar-r24-usda-source-export.mjs`와 전용 `.cmd`: USDA 공식 페이지 1회 GET, URL/redirect/용량/문서 서명 검증, 원문 Base64+SHA256을 결과 TXT로 출력. PC Core나 운영 정보 읽기·수정 금지. HTTP 오류/차단은 실패 기록만 남기며 재시도/우회 금지.
2. `staging/market-calendar/r24-usda/lib/usda-calendar.mjs`: 공식 2026·2027 텍스트를 기반으로 WASDE 12개월 완결성·실제 날짜를 검증하는 파서. 데이터가 누락되면 추정하지 않고 실패한다. **실제 공식 HTML 원문에 대한 적합성은 사용자 PC 수신 후 확인**.
3. 원문 수신 뒤 관측된 DOM·해시 검증 → R23 Core 위에 독립 USDA 원문 저장/재파싱을 포함하는 최소 스테이징 collector 구현 → 기존 공급원 회귀/이력 보존 → 승인 SHA 고정 PC 안전 설치 패키지 작성.
4. R24 설치 이후에만 정규 수집 결과를 별도 확인한다. 사이트 공개·운영 배포 완료를 미리 주장하지 않는다.

## 재사용 정책 및 안전

- USDA 공식 웹 자료의 사실관계(발표 예정일)를 출처와 함께 최소한의 일정 정보로 인용·정리한다. 공식 미국 정부 자료의 공개 접근을 확인했으나 타 기관 저작권 포함 자료·사진·보고서 전문은 수집하거나 재배포하지 않는다.
- 수집 전송은 출처 URL·관측 시각·원문 해시를 보존한다. 실패가 이전에 관측된 공식 일정 데이터를 지우지 않게 한다.
- 자동 스크래핑 정책이 달라지거나 요청 차단 시 건너뛰고 검토한다. 사용자 PC는 원문 확보 목적의 **단 한 번의 공식 페이지 요청**만 하며 과도한 반복 접근을 하지 않는다.

## R24 사용자 PC 공식 원문 실측 및 정규 수집 코드 준비 · 2026-10-28

- 사용자 `MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT_RESULT.txt`: `mode=READ_ONLY`, `status=RAW_HTML_CAPTURED_NOT_APPLIED`, `decision=USDA_HTML_CAPTURED_READONLY`, HTTP **200**, 원문 **160,688바이트**, SHA256 **`e558dcf956989ce9cea21065a44e13c3c487da640810ccb4baee7c6aa750338a`**. Base64 역변환·원문 바이트·SHA256 일치 검산 PASS. 기존 PC Core/DB/예약/게시/GitHub 변경 모두 false.
- 실제 USDA HTML을 스테이징 파서 `parseUsdaWasdeHtml`에 투입해 **2026년 12건 + 2027년 12건 = 24건** 확보. 2026-10-28 이후 14건. 이 수치는 **원문 파싱 결과**이며 PC 예약 수집/공개 사이트 반영 수치가 아니다.
- `staging/market-calendar/r24-usda/lib/release-calendar.mjs`는 R23 정확한 승인 파일에서 USDA 공급원만 추가한다. 기존 EIA/BLS/BEA/Fed/Census 등의 파서 동작은 유지.
- `staging/market-calendar/r24-usda/scripts/pc-writer/release-calendar.mjs`는 USDA 공식 페이지 1회 조회→기존 PC input key `release-calendar:usda`로 원문 저장→**저장 원문에서 재파싱**→기존 5필드 결과와 병합. 이전 연도 이력은 보존하며 출처 실패 시 이전 USDA 이벤트만 재사용하고 `SOURCE_FAILED` 처리. 원문이 불완전하면 임의 미래 발표일 생성 금지.
- 브랜치 `app/market-calendar/market-calendar-client.tsx`는 기존 화면·중요도/선택일 디자인을 변경하지 않고 `usda-wasde` ID와 `USDA/원자재` 표시만 추가. 사이트 title/meta/H1/경로·robots 변경 없음.
- 설치기 `scripts/pc-writer/market-calendar-r24-usda-apply.mjs`는 **사용자 실측 R23 PC source `8ff396217c9f84578b37c9d422381644c2b8f0e8`**와 Core ID `d0a4b3cb8b95`를 고정하고 정확히 3개 파일(기존 파서·기존 수집기·신규 USDA 모듈)만 백업/로컬 커밋한다. 기존 EIA 파일은 해시 검사만 하고 변경하지 않는다. 기존 잠금/dirty/source/config 변경 시 STOP, 강제 수집·게시·GitHub push·DB/스케줄 변경 없음.
- R23 PC 원본 승인 SHA256: 파서 `cf94658ade12f83326c5f9403e4303150f7f0b3d771ab25bf7d65bf8d9313de5`, EIA `6099a1fb912077b2627369b8428a600f613004b2facdb16b262a8ea5b3f65e90`, 수집기(CRLF) `b684ab2495b5f25fa604276694111be48df6861d8aaf5b86f75ee3593973a007`.
- 신규 R24 코드 SHA256: 파서 `a4a2acaeb2ca1a62a20adcc7034b755e5be248506f2ce39c4b3779885d2530e7`, USDA `24555a8084b4cb62398b617331498ffa548018bed7e9058f59a6ecff15d3d7ba`, 수집기 LF `4ac69613badf96eb798239c91eba42071ffe73e47cd8e9c116b4b27c70bd2990`, 설치 수집기 CRLF `a3c1c7f274f61414676f524b927bad0169ee39c206ac7a425ff3f544fdeccf17`.
- 테스트: 실제 PC 공식 HTML 파싱 **24건**, 신규 원문 파서/수집 도구 4건, 정규 수집 및 실패 이력 보존 3건, 설치 사전검증/정상 적용/잠금/변조 차단 4건, 이전 R23 회귀 별도 PASS. Windows CMD ASCII CRLF/ZIP 무결성 검사 및 패키지 SHA 별도 기록.
- 최종 로컬 회귀: R24 11/11 PASS, 이전 R23 collector 9/9 PASS 및 installer 4/4 PASS, `npm run typecheck` PASS. 이 검증은 로컬 코드 대상으로 실행했고 사용자 PC 수집 성공이나 Production 게이트를 의미하지 않는다.
- 최종 Windows 설치 묶음: `MARKET_CALENDAR_R24_USDA_PC_INSTALL_20261028.zip`, SHA256 **`90ec6480ede3cccdf4a611d360ad83e4d5d0c973c1006b54d41fb9f66f134639`**. CMD ASCII+CRLF 및 ZIP 전체 7파일 무결성 검사 PASS.

### R24 다음 사용자 PC 단계

ZIP 전체 압축 해제→`MARKET_CALENDAR_R24_USDA_APPLY.cmd` 단 1회 실행→`MARKET_CALENDAR_R24_USDA_APPLY_RESULT.txt` 전달. 설치 성공 결과가 오기 전에는 R24 PC Core 적용 완료·정기 수집·SQLite 반영·웹 공개를 주장하지 않는다. 기존 예약 실행/배포 관측은 사용자가 별도 확인한다.


## R24 사용자 PC 설치 안전 중단 및 원인확인 도구 · 2026-10-28

- 사용자 제출 `MARKET_CALENDAR_R24_USDA_APPLY_RESULT.txt`: `mode=EXPLICIT_APPLY`, `decision=PC_SOURCE_CHANGED_STOP`, `newSource=null`, `changedFiles=[]`, `backupCreated=false`, `forcedCollection=false`, `gitPushed=false`, `publisherExecuted=false`. **R24는 설치되지 않았으며 기존 Core 파일 변경 없음.**
- 설치 후보 4해시가 모두 기존 승인 R24 값에 일치하고 Core worktree ID도 `d0a4b3cb8b95`로 확인됐다. 사전검증 중 **현재 PC Git HEAD가 지정 R23 base `8ff396217c9f84578b37c9d422381644c2b8f0e8`과 달라** 설치기가 안전하게 멈춘 것이다. 결과 TXT에는 현재 HEAD 값 자체는 포함되지 않아 변경 주체/내용·config.source 상태를 아직 판정할 수 없다.
- R24 설치 ZIP을 재실행하지 않는다. 읽기 전용 조사 도구 `scripts/pc-writer/market-calendar-r24-source-drift-readonly.mjs`, `MARKET_CALENDAR_R24_SOURCE_DRIFT_READONLY.cmd`, README, 테스트 제공. 정규 PC 예약 작업에서 Core 경로를 식별하고 현재 Git HEAD, 승인 R23 조상 관계, 승인 파일 4종 SHA, config.source, 보호 파일 Git diff, lock 존재 여부만 기록한다. 경로·기밀 값 출력 금지, 파일/작업/DB/Git/lock 쓰기 0.
- 진단 테스트 **3/3 PASS**, `npm run typecheck` PASS, CMD ASCII+CRLF 및 ZIP 4파일 무결성 PASS. 전달 묶음 `MARKET_CALENDAR_R24_SOURCE_DRIFT_READONLY_20261028.zip` SHA256 `69611dfaeae502668db26d15f318abea2f1fb7a94e76dd2f5eb76f3c3fa0f6f6`.
- 결과 파일 `MARKET_CALENDAR_R24_SOURCE_DRIFT_RESULT.txt` 수신 후, 현재 PC 운영 소스가 기존 설치 파일과 달라진 사유를 확인한다. **승인 없는 reset/checkout/운영 소스 덮어쓰기 금지**. 기존 R24 수집기·UI 코드는 작업 브랜치에 보존, PC 설치·예약 수집·웹 공개는 미확인으로 유지.
