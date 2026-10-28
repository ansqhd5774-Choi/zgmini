# ZGMINI 시장 캘린더 — 프로젝트 범위·역할·완료 기준 (2026-10-27)

> 2026-10-27 사용자 최신 지시를 정리한 프로젝트별 기준이다. 과거 R11/R18의 정규 수집 대기·실시간 공개 검증을 연결 작업 완료 또는 다음 소스 구현의 필수 선행조건으로 보지 않는다. 변경되지 않은 보안·데이터·배포 보호 게이트는 AGENTS.md를 따른다.

## 1. 무엇을 만드는가
- ZGMINI **시장 캘린더** `/market-calendar/`: 투자자가 **경제지표와 기업 실적 발표 일정, 주요 시장 이벤트**를 하나의 캘린더에서 조회하는 기능.
- BLS는 전체 프로젝트의 첫 번째 공식 데이터 출처 확장 단계일 뿐이다. **BLS만 연결했다고 시장 캘린더 전체 완료라고 보고하지 않는다.**
- 기존 연결원인 BLS·BEA·Fed·Census를 보존하고, 적법하게 사용할 수 있는 경제·실적·시장 일정 소스를 순차적으로 추가한다.
- 한국 일정·기업 실적은 출처의 무료 사용·저장·파생·공개 재배포 권한이 명확히 확인된 경우에만 연결한다. 미확인 자료를 추정으로 채우거나 임의로 라이선스 문의하지 않는다.
- UI는 이미 사용자 승인된 가로 1줄 날짜 선택, 왼쪽 검색, 통합 주/월·오늘·이전/다음 조작, 우측 남은 시간 및 기존 ZGMINI 디자인을 유지한다. 다른 페이지나 신규 별도 캘린더를 만들지 않는다.

## 2. 현재 단계의 역할
- **개발 담당(Assistant):** 적합한 소스 검토 → 기존 수집기/파서와 승인된 PC 저장·게시 경로에 최소 변경으로 연결 → 코드·계약·중복/날짜/기존 ID 회귀 검사 → 설치/연결 결과와 정확한 변경 파일·source SHA 보고 → 다음 소스 작업 진행.
- **사용자:** 실제 사이트에 접속해 데이터가 어떻게 표시되는지 실시간 모니터링하고 이상이 발견될 때 제보한다.
- 담당자는 **사용자가 요청하지 않은 정규 주기 대기, 상시 폴링, 실시간 공개 데이터 검증, 예약·알림 설정, 반복 CMD/TXT 수집**을 작업 완료 조건으로 만들지 않는다.
- 사용자 모니터링은 연결 구현 완료의 사후 관찰과 별개다. 오류 제보가 있으면 해당 오류를 별도 수정 작업으로 처리한다.

## 3. 구현과 완료 표현
- 진행 순서: **기존 정상 경로 보존 → BLS 확장 연결 → BEA 확장 연결 → 미연결 경제/실적 공식 공급원 확장 → 통합 UI 개선**. 출처 개수를 인위적으로 고정하지 않는다.
- 각 소스의 **연결 완료**는 (1) 해당 수집·파서 코드 또는 승인된 PC 소스 적용, (2) 기존 스키마·ID·계약 불변 확인, (3) 가능한 단위·회귀 검사, (4) 적용 지점과 SHA 확인으로 보고한다. 검증되지 않은 부분은 정직하게 따로 적는다.
- **연결 완료 / 실제 정규 수집 성공 / 공개 사이트 반영 / 프로젝트 전체 완료**는 서로 다른 상태다. 하나의 근거로 다른 상태를 PASS 처리하지 않는다.
- 라이브 수집이나 게시의 **강제 실행은 금지**한다. 기존 Core 스케줄·6시간 가드·원본·DB·게시 이력 및 GitHub main/Cloudflare 배포 권한을 임의 변경하지 않는다.
- **후속 소스 구현 시작**은 직전 소스의 신규 정규 수집·공개 readback을 기다리지 않는다. 단, 코드 설치 오류·기존 데이터 훼손·source drift처럼 **실제 다음 작업의 안전을 위협하는 구체적 실패**는 해당 최소 게이트에서 해결한다.
- GitHub 작업은 지정된 작업 브랜치 `codex/zgmini-gpt-workspace-20261025`에 기록한다. 다른 미승인 변경을 함께 병합하거나 `main`에 무단 반영하지 않는다.

## 4. 확인된 이력과 다음 작업
- **BLS:** 2026-10-27 사용자 PC R17에서 공식 BLS 발표 확장 파서 단일 파일을 승인 운영 PC source에 설치. 신규 source `e778f58d056e45c515fac95b4ed48295f6a3ed1a`. 다른 소스와 수집·게시 계약은 유지.
- **R18(읽기 전용 진단):** 설치·승인 source/게시 원장 일치를 확인. 최초 관측 때 6시간 캐시로 BLS 신규 재수집은 발생하지 않았으며, 당시 공개된 수량은 기존 BLS 25건. 따라서 **운영 반영된 신규 건수는 아직 주장하지 않는다**.
- **BEA R19 설치 완료(후속 PC 로그):** 2026-10-27T10:23:37.188Z, `BEA_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION`, 신규 PC source `e4b0624683f29c551df381777dea871d7e3dd266`. `lib/release-calendar.mjs` 1개 변경·백업 완료. 정규 수집/게시 실행과 공개 반영은 이 로그로 증명되지 않는다.
- **다음 개발 작업:** 기존 Fed·Census 발표의 누락 범위를 조사하고 Census R20 확대 후보를 소스 단위로 검증·설치한다. BEA의 다음 정규 수집까지 대기한다는 이유로 R20 개발을 멈추지 않는다.
- 프로젝트 전체 종료는 아직 아니다. 남은 공식 일정과 이용권을 확인한 실적 일정 연결을 계속한다.

관련 문서: `docs/MARKET_CALENDAR_R1_IMPLEMENTATION.md`, `docs/MARKET_CALENDAR_R11_INCREMENTAL_SOURCE_TRANSITION.md`.

## 5. 시장 캘린더 콘텐츠 개발 최종 방향 (2026-10-27 추가)

### 5-1. 사용자 관점의 완성 기준
- 한 페이지(/market-calendar/)에서 **경제지표 발표 · 기업별 실적 발표 · 주요 금융시장 이벤트**를 국가/기간/일정 유형/검색어로 함께 조회한다.
- 사용자는 발표 전에는 **무엇이 언제 예정되었는지와 남은 시간**, 발표 후에는 **공식 발표 결과 및 출처가 확보된 실제·예상·이전 수치**를 확인한다. 숫자 확보 여부와 일정 존재 여부는 독립적으로 관리한다.
- 출처 개수·콘텐츠 개수·국가 개수를 임의의 숫자로 고정하지 않는다. 신뢰성, 합법적인 무료 사용/저장/가공/공개 재배포, 지속적 수집 가능성, 기존 저장·게시 경로 적합성을 충족하는 대상을 계속 확장한다.
- 이미 승인된 상단 1줄 날짜 선택·좌측 검색·주/월 전환·오늘·전후 이동·우측 남은 시간·ZGMINI 디자인을 유지한다. 별도 캘린더나 다른 사이트를 신설하지 않는다.
- **확인된 구현 현황, 앞으로 조사할 후보, 사용권 미확인으로 제외할 대상**을 분리한다. 다음 표는 우선 조사 영역이지 고정된 전체 콘텐츠 개수나 신규 공급원 사용 승인이 아니다.

### 5-2. 콘텐츠 범주별 조사·구현 대장

| 우선 영역 | 세부 수록 대상(예시, 확장 가능) | 확인된 기반과 현재 상태 | 이어서 수행할 구체적 작업 |
| --- | --- | --- | --- |
| 미국 물가·고용 | CPI, PPI, 고용보고서, JOLTS, 고용비용지수, 실질임금, 수출입물가, 생산성/단위노동비용 | 기존 BLS ICS 파서 R17 PC 단일 파일 설치. 최초 R18에서 신규 정규 수집 및 공개 확대 건수는 미확인 | 저장된 공식 일정의 전체 제목·기간·취소 여부·기존 ID를 유지하면서 수집 범위 회귀 관리 |
| 미국 성장·소득·기업이익 | GDP 1·2·3차, PCE, 개인소득·지출, 기업이익, 산업별/주별/지역별 GDP·소득, 무역·국제거래 | BEA R19 첫 시도 LOCAL_OPERATION_FAILED 후 두 번째 PC 적용 성공(source e4b06246). 운영 신규 수집 건수는 아직 미확인 | 신규 BEA 발표의 다음 정규 수집 관측은 별도 기록. 코드는 설치 완료로 분류 |
| 미국 생산·소비·사업활동 | 연준 산업생산, Census 소매판매, 출처에서 제공하는 다른 경제 발표(재고·주택·무역·사업활동 등) | 기존 Fed/Census 일정 일부 연결. 공식 Census 2026 목록에 주택·내구재·건설·재고·사업활동 등 추가 발표 확인. Census R20 실제 2026 공식 HTML로 174건(기존 retail 13건+신규 161건) 추출·회귀 검증, 적용기/테스트 준비 완료, PC 미설치 | R19 BEA 승인 PC source를 고정 기준으로 하는 R20 단일 파일 설치기를 준비 완료. 실제 사용자 PC 설치·config.source 전환은 미실행 |
| 중앙은행·금융시장 정책 | FOMC 회의·금리 결정·기자회견·의사록·경제전망 등 공식 일정, 조건을 통과한 다른 중앙은행 발표 | 기존 FOMC 확인 자료 일부 사용. 추가 발표·기타 중앙은행은 후보 단계 | 기관별 일정 출처와 실제 발표시각·권리·변경 공지를 확인해 소스별 편입 심사 |
| 기업 실적 | 기업명·종목코드·분기·확정/예정 발표일·장전/장후 또는 정확한 발표시각, 정정·취소 | **지속 가능한 승인 실적 일정 소스 미연결**. UI의 실적 선택지만 존재 | 기업 IR·공식 공시/거래소·무료 공개 공급원별로 사전 일정 제공 여부와 저장·파생·공개 재배포 권리를 먼저 판정. 승인된 공급원만 수집 연결 |
| 한국 경제·정책 | 한국은행 통계 발표·금통위, 국가데이터처 발표 일정, 적법하게 제공되는 기타 공식 일정 | 한국 일정 미연결. R3/R4에서 일부 후보의 공개 재배포 권리 미확인으로 제외 | 이미 제외한 미확인 공급원을 우회하거나 무단 복제하지 않고, 권리가 명확한 새로운 무료 소스만 검토 |
| 한국 기업 실적 | 기업 공시 및 기업이 확인한 실적 발표 예정일·시각·변경 내역 | 미연결·이용권 미확정 | 공시 실적 결과와 **미래 발표 예정일**의 구분 가능성부터 조사. 무료 공개 재배포 권한이 검증될 때만 연결 |
| 발표 수치·부가정보 | 실제값, 시장 예상치, 이전값, 단위, 대상 기간, 발표 시각, 공식 원문 | 일부 CPI/PCE 확인값만 기존 수동 저장본에 존재. 예측치 공급원 미연결 | 일정과 수치의 출처를 별도 관리. 권리가 확보된 수치만 기록하고 없는 값은 미제공 표시. 임의 예상값 산출 금지 |

- 범주와 항목은 **데이터 조사·연결 우선순위**이며 기존 승인 산식·스키마 변경 승인이 아니다.
- 기업 실적에서는 이미 발표된 공시의 제출 시각을 **미래 실적 발표 예정 시각**으로 대체하지 않는다. 증권사 추정 일정·확정 일정도 분리한다.
- 미국 BLS/BEA의 기존 승인 수집 경로와 기타 승인된 저장본은 신규 후보 심사 결과 때문에 임의 중단하지 않는다.

## 6. 실제 개발 진행 순서 — 콘텐츠 중심

1. **기존 정상 경로·승인 계약 고정:** 기존 네 공급원, 5개 이벤트 필드, source별 ID, PC 원본/SQLite·기존 게시, 6시간 가드, 예약 작업을 보존한다. 최초 공개 133건 및 R7/R8 가상 후보 518건은 2026-10-27 당시의 과거 근거로만 표시한다.
2. **R19 BEA 단독 연결 완료 이력 유지:** 초기 PC 실패 후 2026-10-27T10:23:37.188Z 후속 실행이 `INSTALLED`로 끝났고, 새 source `e4b0624683f29c551df381777dea871d7e3dd266`을 보고했다. 단일 파일·백업 성공이며 정규 수집·사이트 반영은 아직 별도 미관측으로 분류한다.
3. **기존 Fed/Census의 누락 공식 발표 항목 점검·Census R20 후보:** Census 공식 일정은 소매판매 외 주택·제조업·무역·건설·재고 등도 제공하며 기존 parser는 소매판매만 포함했다. R20 stage는 나머지 공식 행을 제목·발표대상 기간별 안정적 `census-` ID로 확장하고 기존 `retail` ID를 유지한다. 아직 PC 미설치이며 원본·스키마·정규 주기는 불변이다. Fed G.17의 정기·연례 수정 일정도 별도 검토한다.
4. **미연결 미국 공식 경제 발표 탐색·연결:** 기존 네 공급원에 없는 신규 경제 일정만 후보로 정리하고, 공급원별 권리·구조·기존 일정과의 중복/시차를 검증해 순차 연결한다. 출처·항목 수를 강제로 제한하지 않는다.
5. **기업 실적 발표 일정 연결:** 별도의 콘텐츠 트랙으로 공급원 후보별 실제 미래 실적 일정 제공 여부와 공개 권리를 조사한다. 계약을 통과한 소스가 나오면 기업 식별자·분기·상태·시간·정정을 포함한 **실적 일정 연결 계약**을 우선 제안하고 기존 PC 경로에 소스 단위로 구현한다. 현재 진행 중인 별도 실적 분석/침체 프로젝트의 산식·데이터 작업과 혼동하지 않는다.
6. **중앙은행/주요 시장 이벤트 확장:** 기존 FOMC 외 추가 정책 이벤트를 조사하고, 공식 날짜·시간과 수정 정보를 검증해 같은 캘린더에 통합한다. 공식 발표 일정이 아닌 단순 뉴스나 확인되지 않은 예측 이벤트를 일정으로 생성하지 않는다.
7. **한국 및 추가 국가의 경제/실적 일정 확대:** 국가별 동일한 권리·출처·날짜 기준을 적용한다. 권리가 불명확한 국가/항목은 공개 화면에 없는 상태로 남기되 전체 프로젝트의 다른 콘텐츠 개발을 멈추지 않는다.
8. **발표 결과·이전값·예상치 확장:** 각 항목별 승인된 수치 공급원이 존재할 때만 실제/예상/이전값을 연계한다. 수치 연결 작업을 일정 연결의 무조건적 선행조건으로 삼지 않는다.
9. **통합 콘텐츠 UI 검증:** 일정 유형·국가·주/월/일 선택·검색·정렬·중요도·원문 링크·KST·미확정 시각·남은 시간·모바일 가독성·빈 상태를 실제 표시 데이터와 맞춰 확인한다. 새로운 UI를 만들기 위해 데이터 수집 개발을 중단하지 않는다.

- 이 순서는 **현재 연결이 준비된 범주의 구현 우선순위**다. 기업 실적 소스 권리 조사처럼 다른 변경을 수반하지 않는 준비 연구는 BEA/기존 공식 소스 개발과 병행할 수 있으나, 각 PC 수집·게시 변경은 소스별로 분리한다.
- 앞선 소스의 다음 정규 주기·공개 readback을 기다린다는 이유만으로 후속 소스 조사·코드 개발을 멈추지 않는다. 단, 실제 운영 파일 훼손·source drift·락 충돌·설치 불일치 등 다음 변경의 안전을 침해하는 오류는 해당 Gate에서 해결한다.

## 7. 공급원 채택 기준과 기록 방식

**신규 소스는 다음 조건 모두를 만족해야 실제 수집/재게시 후보로 승격한다.**

1. 공식 기관·발행 기업 등 신뢰 가능한 발행 주체 또는 신뢰 가능한 재배포 근거가 식별된다.
2. 일정 데이터가 실제로 공개되고, 날짜·제목·출처·갱신/정정 여부를 반복 수집할 수 있다. 화면에만 예시값이 존재하는 것은 불충분하다.
3. **무료 이용뿐 아니라 저장·가공·상업적 사용·공개 재배포 허용**이 제공 문서·약관으로 명시되어 있다. 불명확하면 제외하며 추가 라이선스 문의·구매·유료 전환을 임의로 수행하지 않는다.
4. 기존 PC 수집→원본 저장→기존 parser/게시→공개 reader 구조에 최소 변경으로 통합 가능하며, 오래된 자료/실패·중복·시간대 변경을 구별할 수 있다.
5. 출처 URL과 약관/권리 근거 URL, 검토 시각, 이벤트 제공 기간·정정 방식, 구현/검사 결과를 기록할 수 있다.

- 소스 후보마다 **국가 / 분야 / 제공자 / 원천 URL / 권리 근거 / 제공 필드 / 수집 가능 여부 / 기준 시각대 / 과거·향후 범위 / 중복 기준 / 현재 상태 / 다음 조치**를 대장으로 관리한다.
- 프로젝트 관리용 진행 상태: RESEARCHING, EXCLUDED_RIGHTS, ELIGIBLE, CODE_READY, PC_INSTALLED, REGULAR_COLLECTION_OBSERVED, PUBLISHED, UI_VERIFIED. 이는 **문서용 단계**이며 기존 API·DB runtime 상태 계약을 대체하지 않는다.
- 신규 후보를 찾았다는 사실만으로 일정 수집에 편입하지 않는다. 이전 R3/R4의 EXCLUDED 후보는 권리 요건이 변했다는 명확한 근거 없이는 제외 상태를 유지한다.

## 8. 이벤트 데이터·표시 계약 — 기존 구조 보존

- 기존 공식 저장 이벤트 **id / date / title / source / sourceUrl 다섯 필드를 그대로 유지**한다. 국가·카테고리·종목·분기·시간·발표 수치 등의 확장은 콘텐츠별 별도 승인 계약과 회귀 검사 이후에만 한다.
- 모든 이벤트는 원문 제목·발표 대상 기간·수정 여부를 가능한 범위에서 기록하고, 동일 소스/ID/날짜의 중복 및 서로 다른 발표의 ID 충돌을 막는다. 기존 고용·GDP·PCE 등의 승인 ID를 불필요하게 재부여하지 않는다.
- 출처가 **날짜만 제공**하는 경우 정확한 시각/카운트다운을 추정하지 않는다. 시각이 확인된 경우 원천 시간대·서머타임을 고려해 KST로 변환한다. 예정일 경과와 실제 발표 완료는 다르다.
- 발표 전 미확정·예정/확정·연기/취소, 발표 후 결과 확인 상태를 근거에 맞춰 구분한다. 동일 날짜·이벤트 중복, 일정 변경, 오래된 확인일은 숨기지 않는다.
- 실제값/시장 예상치/이전값은 서로 다른 종류의 자료이며 개별 원천·관측 시각을 확인한 경우에만 표시한다. **결측은 결측으로 유지**하고 추정값·임의 fallback·가짜 시간·가짜 종목을 만들지 않는다.
- 현재 중요도 별 1~3개는 **ZGMINI의 일정 표시 분류**이며 수치 기반 시장 충격 예측이나 실적 전망으로 포장하지 않는다. 중요도 산정 규칙을 변경할 때는 별도 승인/테스트가 필요하다.

## 9. 콘텐츠별 완료 판정과 영구 인수인계

| 완료 단계 | 요구 근거 | 주장하면 안 되는 것 |
| --- | --- | --- |
| 조사 완료 | 공급원·이용권·일정 내용 및 제외 사유 기록 | API 연결 완료 |
| 코드 준비 | 소스별 parser/필요 최소 수집 코드 및 중복·시간·ID·기존 소스 회귀 테스트 | 운영 PC 설치 완료 |
| PC 연결 설치 | 승인 PC checkout·작업 파일·설정 source/HEAD·변경 파일·백업·source SHA 확인 | 첫 정규 수집 성공이나 공개 반영 |
| 정규 수집 관측 | 기존 실행 결과·원본 저장·중복·시각·source 상태 근거 | 공개 사이트 표시 완료 |
| 공개 반영 관측 | 승인된 기존 게시·API의 exact readback 및 관련 시각 확인 | 미수집 다른 범주의 완성 |
| 콘텐츠/프로젝트 완료 | 경제지표·기업 실적·주요 시장 이벤트 각각에서 적법하게 연결 가능한 내용이 실데이터로 제공되고, 운영 상태/미연결 사유가 명확하게 표시됨 | 수집 가능한 전체 공급원을 조사·연결했다고 증거 없이 선언 |

- 각 작업 보고서는 **저장소 / 전용 작업 브랜치 / 기준 source SHA / 결과 커밋 SHA / 수정 파일 / 콘텐츠 항목 / 계약 검사 / 연결 단계 / 새로 추가한 실제 관측 건수(없으면 미확인) / 다음 소스**를 포함한다.
- 작업 브랜치는 **codex/zgmini-gpt-workspace-20261025**만 사용한다. 새 임시 브랜치 생성, 다른 작업 브랜치 전체 merge, main 무단 병합·직접 배포 금지.
- 본 상위 계획은 R1·R11·R19의 세부 개발 기록보다 **콘텐츠 범위·순서·완료 용어의 기준**이다. 콘텐츠가 추가되면 신규 공급원·목표 범주·완료 상태를 여기서 업데이트하되 기존 히스토리와 미확정 판단을 삭제하지 않는다.
- 사용자 역할은 실제 사이트 모니터링/오류 제보이며, 개발 담당은 추가 가능한 콘텐츠를 조사하고 순차 연결한다. 불필요한 반복 CMD/TXT 요청이나 실시간 감시를 신규 소스 구현의 선행조건으로 만들지 않는다.

## 10. R19 설치 정정 및 R20 Census 확대 착수 이력 (2026-10-27)

- 사용자 PC 후속 결과 `MARKET_CALENDAR_R19_BEA_APPLY_RESULT(1).txt`: `decision=BEA_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION`, `phase=INSTALLED`, `backupCreated=true`, `changedFiles=[lib/release-calendar.mjs]`, `newSource=e4b0624683f29c551df381777dea871d7e3dd266`. 기존 R19 최초 실패 기록은 삭제하지 않는다. **신규 정규 수집·공개 게시 건수는 미확인**이다.
- Census 공식 2026 일정: https://www.census.gov/economic-indicators/calendar-listview-2026.html . 실제 항목에는 소매판매 외 주택착공·신규주택판매·내구재·건설지출·무역·재고·기업 설립 등이 포함된다. 기존 approved `RELEASE_SOURCES.census` 경로를 그대로 사용한다.
- 신규 Census 확대 스테이징: `staging/market-calendar/r20-census/lib/release-calendar.mjs`. 기존 R19 설치 파서를 복제한 후보 중 **Census parser만** 확장하고 기존 `retail` ID·5개 이벤트 필드·BLS/BEA/Fed 출력을 보존한다. 같은 날 같은 발표명이 여러 대상 기간을 가진 경우 기간을 ID·표시에 구분한다.
- 회귀 검사: `tests/market-calendar-r20-census-stage.test.mjs`; 기존 R19 테스트 2개 파일과 함께 로컬 fixture 테스트 통과. 이는 **실제 Census 페이지 HTML 읽기/운영 PC 설치/정규 게시 PASS가 아니다.**
- UI 지원: `app/market-calendar/market-calendar-client.tsx`의 공식 Feed 필터가 `census-` ID도 받아들이도록 최소 변경했다. 새로운 이벤트가 없는 현재 게시 데이터에 가상 행을 만들지 않는다.
- 확인된 Gate: 2026 Census 실제 HTML 직접 파싱 검증과 R19 소매판매 13건 완전 동일성 검증, R20 단일 파일 PC 적용기·보호 테스트 준비 완료. **사용자 PC R20 설치는 미실행**, 정규 수집/게시 관측도 별도 상태로 관리한다. BEA/Census 양쪽에 같은 국제무역 발표가 있으면 동일 이벤트인지 증명 없이 다른 소스를 억지로 합치지 않는다.

## 11. R20 Census 실공식 HTML·설치기 추가 검증 (2026-10-27)

- Census 공식 2026 목록 `https://www.census.gov/economic-indicators/calendar-listview-2026.html`: HTTP 200, HTML 88,192자, HTML `<tr>` 179개. R19 기존 Census parser 결과 `retail` 13건, R20 후보 결과 174건(동일한 `retail` 13건 + 추가 161건), 같은 `id:date` 중복 0건. **실제 원격 HTML을 로컬 후보 파서에 직접 입력**했으며 운영 게시 건수는 아니다.
- R20 설치기/검사: `scripts/pc-writer/market-calendar-r20-census-apply.mjs`, `tests/market-calendar-r20-census-apply.test.mjs`, `MARKET_CALENDAR_R20_CENSUS_APPLY.cmd`. Windows CMD는 자체 폴더에 `MARKET_CALENDAR_R20_CENSUS_APPLY_RESULT.txt`를 생성한다.
- PC source 게이트: R19 설치 승인 SHA `e4b0624683f29c551df381777dea871d7e3dd266`, 기존 파서 SHA256 `9204ab733b45ad3f01a1b8a0754ce8a3f3e3d5feb4245cd01a081a5da838511f`, R20 후보 SHA256 `20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c`, Core worktree ID `d0a4b3cb8b95`. 상이하면 STOP.
- R20 fixture·기존 R19 회귀 테스트 `node --test` 4개 파일 PASS, TypeScript `npm run typecheck` PASS(로컬 코드 기준). **사용자 PC에 설치하거나 정규 수집·게시하지 않았다.**
- 새로운 발견: 기존 `calendar-listview-2027.html` URL은 2026-10-27 현재 HTTP 200이지만 일정 표 0건인 안내 페이지를 제공했다. 공식 `calendar-listview.html`에서는 2027 일정 164건 추출 가능. 기존 collector는 현재 연도만 조회하므로 2027년 전환 때 빈 페이지를 받는 문제가 발생할 수 있다. R20 설치에 임의 URL/수집 주기 변경을 섞지 않고 **차년도 URL·연도 경계 문제를 독립 후속 과제**로 기록한다.
- 자세한 구현·안전·차년도 URL 이력: `docs/MARKET_CALENDAR_R20_CENSUS_CONNECTION.md`. 다음 작업은 사용자 PC R20 단일 파일 설치 결과 확인, 그 이후 2027년 URL/연도 경계와 Fed 누락 항목 및 신규 경제·기업 실적 소스 조사다. 정규 6시간 수집 결과가 후속 조사 시작의 필수 선행조건은 아니다.

## 12. 사용자 PC 실행물 전달 규칙 — 영구 적용 (2026-10-27)

- **사용자가 PC에서 실행해야 하는 단계에는 실행 가능한 CMD 파일 또는 필요한 의존 파일을 모두 포함한 ZIP 파일을 실제 첨부·제공한다.** GitHub 파일 링크, 코드 블록, 경로 문자열, 명령어 설명만 전달한 것은 인수인계 완료가 아니다.
- 전달 형식 기본값은 **실행 CMD + 의존 스크립트/후보 파서 + 간단한 README를 포함한 ZIP**이다. 단일 CMD만으로 완전하게 동작할 때만 CMD 단독 전달이 가능하다. 상대 경로가 필요한 파일을 누락하지 않는다.
- ZIP 생성 후 파일 목록, 내부 상대 경로, 대상 소스 해시·후보 해시, Windows CMD 실행 경로, 결과 파일 생성 위치를 검증한다. 다운로드 가능한 **실제 파일 첨부 링크**를 사용자에게 제공한다.
- CMD와 TXT 결과 파일은 같은 폴더를 기본으로 하며, 추출 후 **CMD만 따로 이동·복사하지 말 것**을 README에 명시한다. 필요 없는 저장 경로 검색·반복 CMD 요청은 피한다.
- 산출물 관련 코드·사용법·재생성에 필요한 파일 및 인수인계 규칙은 지정 브랜치 `codex/zgmini-gpt-workspace-20261025`에 반영한다. ZIP 전달과 브랜치 커밋은 서로 다른 완료 상태로 보고한다.
- 사용자가 파일을 다운로드·실행했다는 근거 없이 PC 실행/설치 성공이라고 주장하지 않는다. ZIP을 제공할 수 없으면 정직하게 전달 미완료로 보고하고 경로 링크만으로 대체 완료 처리하지 않는다.
- 최초 적용 대상: R20 Census `MARKET_CALENDAR_R20_CENSUS_APPLY.cmd`, `README_R20_CENSUS_PC_INSTALL.txt`, `scripts/pc-writer/market-calendar-r20-census-apply.mjs`, 참조 R19 스크립트, R20 후보 파서, R20 기준서가 포함된 ZIP.

## 13. R20 PC 적용 완료 보고와 R21 연도 경계 후보 (2026-10-27)

- 사용자 CODEX 설치 완료 보고에 따르면 R20은 정규 Core 종료 후 정상 적용되어 PC source가 `e4b0624683f29c551df381777dea871d7e3dd266`에서 `97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b`로 전환되었다. 변경 파일은 `lib/release-calendar.mjs` 하나, 관련 검사 18건·설치된 파서 추가 검사 4건 통과, BLS·BEA 출력 보존. 이 증거는 **사용자 보고**이며 정규 수집·공개 반영 성공을 뜻하지 않는다. 본 섹션이 작성되기 전의 ‘R20 미설치’ 설명은 작성 당시의 이력이다.
- R21은 R20 파서·승인 PC Core/스케줄을 보존하고 Census 현재/차년도 URL 조회 및 연도별 공식 일반 목록 fallback만 보완한다. HTTP 200이어도 해당 연도 일정 0건이면 실패로 구분하고, 다른 연도 일정을 잘못된 연도에 편입하지 않는다.
- R21 후보 수집기: `staging/market-calendar/r21-census-year/scripts/pc-writer/release-calendar.mjs`, 설치기: `scripts/pc-writer/market-calendar-r21-year-apply.mjs`, 테스트 2종, 실행 CMD 및 README. 기존 PC collector 파일만 교체하는 별도 단일 파일 설치 계약.
- 2026/2027 전환·2028 오인 방지·Census 실패 시 기존 출력 보존·BLS/BEA/Fed 회귀·기존 lease/cache·원본 source 검증·백업·잠금 보호 테스트 **8건 로컬 PASS**. 실제 PC 설치는 **미실행**이며 `CODE_READY`로 표시한다.
- 후보 SHA256: `2e7ac2a57a7ec2c41b2f9647d98d49c7bb22d904978a0d637e3d3619e01dedf0`; R20 PC 기존 source `97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b`와 다른 경우 적용을 중단한다.
- PC 전달물: `MARKET_CALENDAR_R21_CENSUS_YEAR_PC_PACKAGE_20261027.zip` (CMD와 모든 필요 파일 포함). CMD 폴더 내 `MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_RESULT.txt` 생성. GitHub 브랜치 기록과 PC ZIP 실행은 별개의 단계다.
- 상세 기준은 `docs/MARKET_CALENDAR_R21_CENSUS_YEAR_BOUNDARY.md`. 설치 결과가 확인되면 Fed 정기·연례 개정 일정과 추가 경제·기업 실적 소스 확장으로 진행한다. 사용자 별도 요청이 없는 정규 수집·공개 UI 대기나 강제 실행은 하지 않는다.

## 14. R21 PC 실원본 복구 — 최초 설치 후보 보류 (2026-10-27)

- 사용자 제공 R21 로그: `R20_COLLECTOR_CHANGED_STOP`, `changedFiles=[]`, `backupCreated=false`, `newSource=null`. PC R20 source `97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b`와 실제 설치 파서 `20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c`는 검증 통과.
- 작업자 오류: R21 기존 collector 검증용 `4af1164793d95e7b0a97643d91e6d23749974d17c7048bac677f727376fc7afc`는 GitHub 브랜치 템플릿의 해시였으며, 실제 PC collector 해시 `1b8c2760a4f815191282dd55969ce8170072d4f747c8468ddd6601dc50ee88d6`와 다르다. R20 변경 파일은 `lib/release-calendar.mjs` 하나이므로 R20 설치 오류라고 판단하면 안 된다. 최초 R21 테스트는 PC 원본 비대응이라는 결함이 있다.
- **R21 최초 설치 CMD/ZIP 사용 금지.** 기존 수집·실적·Census R20, DB, 스케줄러, 게시, GitHub main은 그대로 유지.
- `MARKET_CALENDAR_R21_PC_SOURCE_EXPORT.cmd`의 읽기 전용 결과: CMD와 같은 폴더의 `MARKET_CALENDAR_R21_PC_SOURCE_EXPORT_RESULT.txt` **한 파일**(실제 collector 원문을 base64로 포함). 진짜 등록 Core source/worktree/config/parser를 확인하고 collector를 복사할 뿐 실행 중인 Core는 건드리지 않는다. PC 원본은 공개 저장소에 업로드 금지.
- 단일 TXT에 포함된 실제 PC collector 원문과 tracked HEAD 일치 여부를 받아야 R21 연도 전환 기능을 원본 기반으로 재구현하고, 회귀 테스트 후 별도의 정확한 CMD/ZIP을 만들 수 있다. 해시만 우회 교체하거나 잘못된 R21 후보를 복사하지 않는다.
- 전용 브랜치 `codex/zgmini-gpt-workspace-20261025`만 사용. 새 브랜치·자동 배포·강제 수집·main 병합 없음.

## 15. R21 CRLF 정정 설치 패키지 — CODE_READY / PC 검증 대기 (2026-10-28)

- 업로드된 단일 결과 TXT의 base64 원문을 복원하여 SHA256 `1b8c2760a4f815191282dd55969ce8170072d4f747c8468ddd6601dc50ee88d6`를 직접 재검증. 실제 운영 파일은 Git HEAD 추적 파일과 일치(`collectorMatchesTrackedHead=true`), R20 승인 source `97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b`, R20 parser SHA `20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c` 확인.
- **정정된 근본 원인:** 실제 PC collector와 GitHub 작업 브랜치 `scripts/pc-writer/release-calendar.mjs`는 코드는 완전히 동일. 단지 PC가 `CRLF`, GitHub가 `LF`였기 때문에 원본 해시 `1b8c...`와 브랜치 해시 `4af1...`가 달랐다. R20 설치나 코드 충돌이 아님.
- 최신 R21 설치기 `scripts/pc-writer/market-calendar-r21-year-apply.mjs`는 실제 PC CRLF `1b8c...`와 정규화 LF `4af...`를 함께 검증한다. 기검증된 R21 LF 후보 `2e7ac2a57a7ec2c41b2f9647d98d49c7bb22d904978a0d637e3d3619e01dedf0`를 PC CRLF로 변환해 고정 SHA256 `8105a2922ff0d05d29b329dc22dcf66d0d5920ea0d1661337066cef877f45bc5`로 저장한다.
- **새 CMD:** `MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_CRLF.cmd`. **결과:** `MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_CRLF_RESULT.txt`, 반드시 CMD와 동일 폴더. 최초 R21 ZIP/CMD는 사용 금지.
- `tests/market-calendar-r21-census-year-apply.test.mjs`: CRLF 기준 실제 Core 시뮬레이션·적용·백업·잠금·drift 4 PASS. `tests/market-calendar-r21-census-year-stage.test.mjs`: 2026/2027 Census fallback/연도 경계, BLS/BEA/Fed 보존, 기저 이력·lease 4 PASS. CMD ASCII/CRLF, ZIP 무결성 PASS.
- 다음 단계는 사용자가 새 R21 CRLF ZIP을 PC에서 실행하여 `phase=INSTALLED`와 `decision=R21_CENSUS_YEAR_INSTALLED_NO_FORCED_COLLECTION` 로그를 제출하는 것. 여기까지는 코드·시뮬레이션 검증 완료이며 **실제 PC 설치 완료로 보고하지 않는다**.
- Core 정규 수집/DB/스케줄러/게시/GitHub main은 미변경. 전용 브랜치 `codex/zgmini-gpt-workspace-20261025` 고정.

## 16. R21 CRLF 사용자 PC 설치 결과 확인 (2026-10-28)

- 사용자 첨부 증거: `MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_CRLF_RESULT.txt`, 내부 실행 시각 `2026-10-27T15:14:07.735Z`(UTC).
- **실제 PC 설치 PASS:** `phase=INSTALLED`, `decision=R21_CENSUS_YEAR_INSTALLED_NO_FORCED_COLLECTION`, `changedFiles=["scripts/pc-writer/release-calendar.mjs"]`, `backupCreated=true`.
- **PC 승인 source 전환:** `previousSource=97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b` → `newSource=b5e860d09ac87087e158193613425b146fa9a1e5`. Core worktree `d0a4b3cb8b95` 유지.
- LF R21 후보 SHA256 `2e7ac2a57a7ec2c41b2f9647d98d49c7bb22d904978a0d637e3d3619e01dedf0`, 실제 PC CRLF 설치 SHA256 `8105a2922ff0d05d29b329dc22dcf66d0d5920ea0d1661337066cef877f45bc5`로 사전 예상값과 정확히 일치.
- **R20 파서 보존:** `installedParserSha256=20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c`. 기존 PC collector CRLF SHA256 `1b8c2760a4f815191282dd55969ce8170072d4f747c8468ddd6601dc50ee88d6`; LF 정규화 SHA `4af1164793d95e7b0a97643d91e6d23749974d17c7048bac677f727376fc7afc`.
- **미실행:** `gitPushed=false`, `publisherExecuted=false`, `forcedCollection=false`. 운영 데이터 정규 수집·SQLite 결과·공개 UI 반영은 해당 로그에서 미확인. 이들을 설치 PASS와 혼동하지 않는다.
- **다음 작업:** 직전 R21의 예약 수집·공개 반영을 강제로 실행하거나 대기하지 않고, 기존 Fed 일정 누락 범위 및 안전하게 저장·재배포 가능한 경제·실적 공식 소스 추가 연결을 진행한다. 사용자는 운영 사이트를 별도로 관찰하고 오류를 알려준다.
- 전용 브랜치 `codex/zgmini-gpt-workspace-20261025` 유지; 다른 브랜치 생성, main 병합, PC 운영 파일 임의 변경 없음.

## 17. R22 연준 공식 일정 확대 — 실원문 확보 단계 CODE_READY (2026-10-28)

- 직전 PC R21은 사용자 로그로 설치 확인: 승인 source `b5e860d09ac87087e158193613425b146fa9a1e5`; 이후 기존 Core 수집/게시/DB/스케줄러를 수동 실행하지 않았다.
- 실제 공식 연준 월별 캘린더에는 G.17 외 FOMC 회의·의사록, 베이지북, G.19 소비자신용, H.4.1/H.6/H.8 등 다수 일정이 있다. 기존 코드 `RELEASE_SOURCES.fed`는 G.17만 파싱한다. `app/market-calendar/market-calendar-client.tsx`도 일반 `fed-` ID는 허용하지 않으므로 수집기·파서·UI를 함께 고려해야 한다.
- 연준 공식 웹사이트의 제3자 표시 없는 자료는 `https://www.federalreserve.gov/disclaimer.htm`에 따라 복제·배포 가능. 별도 권리 확인 없는 비공식 서비스·제3자 자료는 사용하지 않는다.
- 실제 월별 원본 HTML 직접 다운로드가 이 작업 환경에서는 `EAI_AGAIN`으로 막혔다. 임의 가정한 태그로 운영 파서를 설치하지 않고, **읽기 전용 R22 Fed 공식 HTML 추출 패키지**로 실제 원문 구조를 먼저 확보하도록 했다.
- 전달 ZIP: `MARKET_CALENDAR_R22_FED_SOURCE_EXPORT_BUNDLE_20261028.zip` (SHA256 `b5db51582924cf8a4b3b1c5cee39f08cd30e52d9f23e1e77fd43a23cae3e8785`), 실제 CMD `MARKET_CALENDAR_R22_FED_SOURCE_EXPORT.cmd`, 결과 단일 TXT `MARKET_CALENDAR_R22_FED_SOURCE_EXPORT_RESULT.txt`(같은 폴더). 달력 3개월 + 연준 통계공표 + FOMC 총 5개 공식 URL을 일회성 읽기 전용으로 요청해 각 성공 원문 SHA256/Base64를 동일 TXT에 담는다. 잠금·Core·DB·Git·작업 등록·게시·수집은 변경/실행하지 않는다.
- 파일: `scripts/pc-writer/market-calendar-r22-fed-source-export.mjs`, `tests/market-calendar-r22-fed-source-export.test.mjs`, `docs/MARKET_CALENDAR_R22_FED_COVERAGE.md`, CMD, README. 현지 fixture 4/4 PASS, 문법 PASS, CMD ASCII+CRLF, ZIP 내부 5개 파일 무결성 PASS. 브랜치 5개 파일 직접 게시 후 읽기 재검증 모두 일치.
- **완료 범위:** R22 원문 수집·파서 검증을 위한 코드와 전달물 준비 완료. **미완료:** 사용자의 PC 실제 공개 원문 GET 결과, Fed 확대 parser/collector/UI 구현과 PC 설치, 정규 수집, 게시/readback. 결과 TXT 확보 후 원문 기반으로 후속 개발을 진행한다. R21 운영을 중단하지 않는다.
- 전용 브랜치 `codex/zgmini-gpt-workspace-20261025` 유지, 새 브랜치 및 main 병합 없음.

## 18. R22 연준 공식 일정 확대 — 원문 검증·코드 반영·PC 설치 대기 (2026-10-28)

- 사용자 업로드 `MARKET_CALENDAR_R22_FED_SOURCE_EXPORT_RESULT.txt` 확인: 공식 연준 월간 2026-10/11/12, 연준 통계발표, FOMC 5개 원문 모두 HTTP 200. 공식 실 HTML `cal-nojs` 구조에 맞춘 추출이 월별 62/58/64행(총 184행)으로 성공했다. **이는 로컬 원문 파서 산출 건수이며 운영 DB·사이트 공개 건수가 아니다.**
- 신규 `fed_calendar` source: FOMC 의사록, 베이지북, 통계발표 일정을 공식 출처 URL과 미국 현지 일자 기준으로 수집. 달이 바뀌어 조회 범위에서 빠진 이전 달 공식 일정도 공개 이력에서 보존. 기존 G.17, FOMC 기준금리 결정, 기자회견은 중복 등록하지 않는다. G.20 잠정 발표일은 잠정 표시한다. 기존 Census R21·BLS·BEA·G17 경로를 보존한다.
- 작업한 코드: `staging/market-calendar/r22-fed-calendar/lib/release-calendar.mjs` 및 `staging/market-calendar/r22-fed-calendar/scripts/pc-writer/release-calendar.mjs`에 후보를 두고 `app/market-calendar/market-calendar-client.tsx`에서 연준 새 출처 이벤트 표시만 허용. 원격 브랜치에 이미 들어온 중요도/선택일 표시 기능은 덮어쓰지 않고 유지했다. 페이지 제목·경로·H1·메타·색인 정책·기존 공개 점수에 변경 없음.
- 로컬 검증: Fed 단계 회귀 테스트 7/7 PASS(이전 달 이력 보존 추가), 2파일 설치 안전성 테스트 4/4 PASS, `npm run typecheck` PASS, CMD ASCII CRLF, ZIP 무결성 PASS. 사용자 승인 PC HEAD `b5e860d09ac87087e158193613425b146fa9a1e5`, 고정 worktree ID `d0a4b3cb8b95`, 기존 파서·수집기 SHA를 검사한다.
- 사용자 전달물: 최종 `MARKET_CALENDAR_R22_FED_PC_INSTALL_V2_20261028.zip` (과거 일정 보존 수정 반영; 기존 V1 사용 금지). 압축 해제 후 `MARKET_CALENDAR_R22_FED_APPLY.cmd` 실행, 결과 `MARKET_CALENDAR_R22_FED_APPLY_RESULT.txt` 재업로드. installer는 승인된 두 파일만 백업/로컬 커밋하여 config.source 갱신; 수집·게시·DB·예약 작업·GitHub push·main 병합 없음. 기존 락·출처 변경시 STOP.
- **현재 미완료:** 실제 PC R22 적용 결과/사용자 운영 확인. `INSTALLED` 결과 TXT 수신 전에는 PC 적용 성공·정규 자동 수집·공개 사이트 반영 성공으로 표기 금지. 기존 R21 예약 수집 상태를 변경하거나 강제 가동하지 않는다.
- 전용 브랜치 `codex/zgmini-gpt-workspace-20261025`만 유지. 다른 작업자 브랜치·main으로 전환하거나 병합하지 않는다.

## 19. R22 공식 연준 월별 일정 — 사용자 PC 적용 성공 확인 (2026-10-28)

- 사용자 `MARKET_CALENDAR_R22_FED_APPLY_RESULT.txt` 실측 로그 검증: `mode=EXPLICIT_APPLY`, `decision=R22_FED_CALENDAR_INSTALLED_NO_FORCED_COLLECTION`, `phase=INSTALLED`.
- 기존 R21 PC source `b5e860d09ac87087e158193613425b146fa9a1e5` → **R22 새 PC 로컬 커밋 `a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e`**. 작업 코어 ID `d0a4b3cb8b95`, 정확히 두 파일 `lib/release-calendar.mjs`와 `scripts/pc-writer/release-calendar.mjs` 변경, 파서/수집기 원문 해시 일치.
- `backupCreated=true`, 백업 ID `r22-20261028020813808-b0e16243`. `gitPushed=false`, `publisherExecuted=false`, `forcedCollection=false`. 결과 로그의 10개 설치·안전 조건 전부 PASS.
- **상태 분리:** R22 소스 연결 및 PC 설치 **완료**. 이후 예약 수집의 신규 연준 일정 수량·실제 SQLite 공개 저장·웹 페이지 반영은 아직 미확인. 사용자의 사이트 모니터링을 기다리도록 개발을 멈추거나, 자체 강제 수집·게시·예약 변경을 하지 않는다.
- 다음 소스 단계는 기존 네 공급원 및 신규 연준 원문 이력을 그대로 보존하면서 미국 시장 주요 발표·기업 실적의 공식 일정 출처와 무료 공개 재사용 가능성을 검토한다. 권리가 불명확한 소스를 운영에 연결하지 않는다.
- 전용 작업 브랜치 `codex/zgmini-gpt-workspace-20261025`를 유지한다. 신규 브랜치 생성·main 병합·운영 배포 없음.

## 20. R23 EIA 공식 에너지 발표 일정 — 읽기 전용 원문 수집 준비 (2026-10-28)

- R22 사용자 PC 설치 성공 source `a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e` 보존. 기존 주기 수집·DB·게시/브랜치/main과 다른 안전 범위이다.
- EIA 공식 사이트의 공개 재사용 정책 및 자동 접근 보안 정책 확인: `https://www.eia.gov/about/copyrights_reuse.php`, `https://www.eia.gov/about/privacy_security_policy.php`. 과도한 자동 요청/우회 금지. 적절한 출처·발표일 표기 필요.
- 신규 조사 대상 공식 공개 페이지 6개: EIA 전체 발표, WPSR 기본·예외 발표 일정과 다음 발표, WNGSR 휴일 일정, STEO 일정·다음 발표. WPSR은 통상 수요일, WNGSR은 통상 목요일 동부시간 10:30이며 예외 일정이 별도로 존재한다. 임의 계산한 미래 요일 일정을 확정 일정으로 등록하지 않는다.
- R23 구현: `scripts/pc-writer/market-calendar-r23-eia-source-export.mjs`, `tests/market-calendar-r23-eia-source-export.test.mjs`, `MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT.cmd`, `README_R23_EIA_SOURCE_EXPORT.txt`, `docs/MARKET_CALENDAR_R23_EIA_SOURCE_REVIEW.md`. 고정 6개 URL, 1회 순차 GET(요청 간 1.2초), 원문 Base64/SHA256 및 실패 원인 단일 TXT. 로컬 테스트 **5/5 PASS**, Node 문법 PASS, CMD ASCII CRLF, ZIP 무결성 PASS.
- 전달물 `MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT_BUNDLE_20261028.zip` SHA256 `ffece9a00ea779ba5fece1f42e4b955dba54a3ed427fe603e6dc0493960c63f4`. 실행 결과 `MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT_RESULT.txt` 한 파일을 제출받아 원문 구조로만 파서 후보를 작성한다.
- **현재 단계는 READ_ONLY CODE_READY**: EIA source PC Core 적용·정규 수집·공개 사이트 연결·배포 모두 미실행. R22 운영을 조작하지 않는다. 전용 브랜치 `codex/zgmini-gpt-workspace-20261025` 유지.

## 21. R23 공식 EIA 원문 확보·스테이징 파서 · 2026-10-28

- 사용자 PC `MARKET_CALENDAR_R23_EIA_SOURCE_EXPORT_RESULT.txt`는 공식 EIA 공개 HTML 6/6 원문 확보 및 SHA256 검증 완료. 운영 Core/SQLite/예약 수집/배포 변경 없음.
- WPSR 휴일 예외 2026-11-12 12:00 ET, WNGSR 휴일 예외 2026-11-13 10:30 ET 및 2026-11-25 12:00 ET, STEO 공식 발표 표의 2026·2027년 24개월 날짜를 원문에서 식별했다. 2026-10-28 이후 STEO 14건. `staging/market-calendar/r23-eia/lib/eia-calendar.mjs`는 이를 명시 날짜만 5필드 이벤트로 파싱하며 정기 요일로 확정 일자를 생성하지 않는다. 실제 원문 검산은 WPSR 1건/WNGSR 2건/STEO 14건 및 STEO 다음 발표 2026-11-10 1건; 스테이징 테스트 PASS.
- 중요 구조 발견: WPSR 메인 HTML의 다음 발표일은 비어 있고 `./includes/wpsr-calendar.json`에서 JS로 채운다. 이 정확한 공식 공개 JSON 1회만 PC에서 읽기 위한 `MARKET_CALENDAR_R23_EIA_WPSR_JSON_EXPORT.cmd` 및 동봉 JS·테스트·README 작성. 기존 6개 HTML 재요청이나 Core 점검 요구는 하지 않는다.
- **현재 정확한 상태:** 브랜치에 R23 파서 스테이징·추가 원문 확보 도구 반영, PC Core R23 설치와 실제 정기 수집·웹 공개 반영은 미완료. 사용자 WPSR JSON 1회 결과를 받으면 JSON 구조 검증→R22 원본 경로에 EIA 소스 최소 편입→회귀·승인 PC 소스 고정 설치 패키지 준비 순서로 진행한다. R22 PC Core 승인 SHA `a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e` 보존. 기존 지정 브랜치만 사용한다.

## 22. R23 EIA 정규 수집 후보·PC 안전 설치 준비 (2026-10-28)

- 공식 WPSR 공개 JSON 사용자 PC 캡처 `MARKET_CALENDAR_R23_EIA_WPSR_JSON_RESULT.txt`: HTTP 200, SHA256 `b6293ef1109b2cfeb667b0cb5c6d585c5c6f1dfbaa38b953aed6c4e1a539d7b7` 검증. 110개 행에서 비정규 추가 게시 5개를 구분해 정기 일정 105건, 2026-10-28 이후 63건을 확인했다. WPSR 예외 2026-11-12의 12:00 ET는 별도 공식 일정표와 일치한다. STEO 2026·2027 표와 WNGSR 휴일 예외 HTML 6/6 이전 확인 증거도 재사용한다.
- R23 `staging/market-calendar/r23-eia/` 후보: 기존 R22 `lib/release-calendar.mjs`, `scripts/pc-writer/release-calendar.mjs` 그대로 기반으로 독립 `eia` 소스만 추가, 신규 `lib/eia-calendar.mjs` 파서 제공. WPSR JSON·WNGSR 예외표·STEO 발표표 공식 원문을 기존 PC raw input에 저장한 뒤 저장 원문으로 파싱한다. 개별 실패 시 공식 예외/다음 발표만 fallback, 이전 공식 이력은 보존. 임의 정기 날짜 생성·DB 변경·스케줄 변경 없음.
- 표시 경로: 지정 브랜치 `app/market-calendar/market-calendar-client.tsx`만 최소 보완하여 `eia-wpsr`, `eia-wngsr`, `eia-steo`를 에너지/EIA로 표시할 수 있다. 이미 승인된 캘린더 UI 중요도·선택일 기능을 유지한다. Cloudflare/main/Production 배포는 실행하지 않았다.
- PC 설치 도구: `scripts/pc-writer/market-calendar-r23-eia-apply.mjs` + `MARKET_CALENDAR_R23_EIA_APPLY.cmd` + README. 승인된 설치 PC R22 source `a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e` 및 Core ID `d0a4b3cb8b95`, 파일 해시·dirty·lock·config.source를 검사하고, 신규 EIA 모듈 포함 정확히 3파일만 백업 후 로컬 커밋한다. 6시간 가드와 정규 실행을 강제하지 않는다. 출처 변조/소스 변경 시 STOP.
- 다운로드 파일 `MARKET_CALENDAR_R23_EIA_PC_INSTALL_20261028.zip` SHA256 `31056df32b0f1bb54cec6f5b2116ad851f224bc55e479d2ae629920d4741ed08`. Node 신규 수집·파서·로컬 Git 설치 테스트, R22 기존 회귀 테스트 PASS, CMD ASCII CRLF와 ZIP 무결성 PASS.
- **현재 상태:** R23 후보/화면 브랜치 반영 + PC 실행 패키지 준비 완료. **R23 PC 설치 미확인**, 따라서 정규 수집 및 사이트 공개 반영 완료 아님. 사용자 ZIP 압축 해제→`MARKET_CALENDAR_R23_EIA_APPLY.cmd` 한 번 실행→`MARKET_CALENDAR_R23_EIA_APPLY_RESULT.txt` 전달. 기존 승인 브랜치만 유지, 신규 브랜치·main 병합·운영 배포 없음.


## 23. R23 EIA PC 설치 완료 — 사용자 실측 결과 (2026-10-28)

- 사용자 제출 `MARKET_CALENDAR_R23_EIA_APPLY_RESULT.txt`의 상태를 직접 확인했다. `mode=EXPLICIT_APPLY`, `phase=INSTALLED`, `decision=R23_EIA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION`.
- **실제 PC Core source 전환:** R22 `a50ac307d8d0849ca2800b3c4df4cd6daaba3b1e` → R23 `8ff396217c9f84578b37c9d422381644c2b8f0e8` (worktree ID `d0a4b3cb8b95`).
- 변경 파일 **3개만**: `lib/eia-calendar.mjs`, `lib/release-calendar.mjs`, `scripts/pc-writer/release-calendar.mjs`. `backupCreated=true`, 백업 ID `r23-20261028051900439-9be75d4f`.
- 승인 설치 해시 검사 PASS. 설치된 파서 `ede3d4e1a95eb0f9bde1a1ad3f42812cf090a9821a2e7af517638fb928d6704b`, 수집기 `2ecac6ac7c16c6a06ca81b67feb32f4342f1b2b89163b5531f0f6bb90d622388`.
- `gitPushed=false`, `publisherExecuted=false`, `forcedCollection=false`: PC 소스 설치만 완료했고 GitHub push/운영 게시/예약 작업/강제 수집은 실행하지 않았다.
- **구분할 단계:** EIA 파서 및 정규 Core 통합 설치 **완료**. PC의 향후 예약 수집 성공, SQLite 이벤트 반영 및 웹 공개 출력은 **미확인**이므로 자동 수집·공개 완료로 보고하지 않는다. 기존 이력 삭제/재계산/수집 강제 실행 금지.
- 새 공급원 R24 조사는 공식 날짜가 명시된 미국 농무부 WASDE(농산물 수급전망) 월간 발표 일정부터 시작한다. 공식 2026·2027 날짜 공지: `https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report`. 확정 날짜만 수집하고 무근거 월간 반복 생성 금지. EIA 및 기존 발표원 소스는 보존한다.
- 계속 작업 대상 브랜치는 **`codex/zgmini-gpt-workspace-20261025` 하나만**이다. 신규 브랜치/`main` 병합/운영 배포 없음.


## 24. R24 USDA WASDE 명시 발표일 — 1회 읽기 전용 원문 확보 도구 준비 (2026-10-28)

- R23 실제 사용자 PC 설치 성공(`8ff396217c9f84578b37c9d422381644c2b8f0e8`)을 전제로, **R24 신규 시장 캘린더 일정 공급원**은 미국 농무부 USDA World Agricultural Supply and Demand Estimates(WASDE)의 공식 발표 일자로 선정했다.
- USDA 공식 `https://www.usda.gov/about-usda/general-information/staff-offices/office-chief-economist/commodity-markets/wasde-report`: 2026·2027년 연간 날짜 각각 12건, 미 동부 12:00 ET를 명시. 2026-10-28 이후 14건(2026년 2건+2027년 12건). 날짜를 임의 반복 생성하지 않는다.
- R24 작업 문서 `docs/MARKET_CALENDAR_R24_USDA_SOURCE_REVIEW.md`; 스테이징 파서 `staging/market-calendar/r24-usda/lib/usda-calendar.mjs`; 읽기 전용 원문 조회기 `scripts/pc-writer/market-calendar-r24-usda-source-export.mjs`; 전용 CMD, README, 테스트를 **동일 지정 브랜치**에 반영했다.
- 신규 파서/읽기 도구 테스트 4/4 PASS 및 이전 R23 EIA 파서 회귀 6/6 PASS. Windows `.cmd` ASCII CRLF, ZIP 무결성 PASS. 전달 묶음 `MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT_20261028.zip`, SHA256 `b0ab1a51764e68eecae7145da48c4f4202b2d392dc03bbcead70c2a1af100abe`.
- **R24 진행 경계:** USDA 공식 페이지 실측 HTML은 아직 PC에서 받지 않았다. 사용자가 ZIP을 전체 압축 해제해 `MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT.cmd` 1회 실행하고 `MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT_RESULT.txt`를 제출하면 HTML 해시/DOM 확인 후 기존 R23 Core에 최소 USDA 수집 모듈을 편입한다. 브라우저 웹 검색으로 공식 2026/27 날짜를 확인했지만 직접 HTTP HTML 조회가 개발 환경에서 503이어서 실제 원문 적합성을 확증하기 전 운영 설치를 하지 않는다.
- R24는 **READ_ONLY_SOURCE_EXPORT_READY**이지 PC 설치/수집/게시/웹 공개 완료가 아니다. 기존 PC 수집·SQLite·예약작업·GitHub main·Cloudflare 배포 변경 없음. 신규 브랜치 생성 없음.


## 25. R24 USDA 공식 원문 실측 및 PC 연결 설치 준비 (2026-10-28)

- 사용자 PC 원문 결과 `MARKET_CALENDAR_R24_USDA_SOURCE_EXPORT_RESULT.txt`: HTTP 200, 160,688바이트, SHA256 `e558dcf956989ce9cea21065a44e13c3c487da640810ccb4baee7c6aa750338a` 자체 검증 PASS. `mode=READ_ONLY`, 기존 Core/SQLite/예약·게시 작업 변경 없음.
- 실제 공식 HTML 파서 결과 **2026년 12 + 2027년 12 = 24건**, 2026-10-28 이후 14건. 날짜 추정·가상 반복 없음. USDA 원문을 기존 PC input 저장소 `release-calendar:usda`에 먼저 저장한 다음 저장 원문을 다시 파싱하는 R24 collector 개발.
- 기존 사용자 승인 PC R23 source `8ff396217c9f84578b37c9d422381644c2b8f0e8`, Core ID `d0a4b3cb8b95`, 파일 SHA 3종을 고정한 **R24 안전 설치 도구** 개발. 기존 EIA 모듈은 보존·무결성 검사만 수행. 정확히 3파일(신규 USDA 모듈·기존 일정 파서·수집기) 변경, 원본/PC config 백업과 로컬 Git 커밋. 소스 변경/dirty/잠금 충돌이면 STOP.
- 지정 브랜치 `app/market-calendar/market-calendar-client.tsx`에서는 `usda-wasde` 이벤트 및 USDA/원자재 라벨만 추가했다. 기존 디자인·중요도·선택일·페이지 SEO 메타 변경 없음. `main` 병합·운영 배포 미실행.
- 테스트: 신규 R24 11/11 PASS, 기존 R23 collector 9/9 및 installer 4/4 PASS, `npm run typecheck` PASS. 사용자 PC 실제 공식 원문 파싱 24건 별도 PASS.
- 전달 파일 `MARKET_CALENDAR_R24_USDA_PC_INSTALL_20261028.zip`, SHA256 `90ec6480ede3cccdf4a611d360ad83e4d5d0c973c1006b54d41fb9f66f134639`. CMD ASCII CRLF 및 ZIP 7파일 무결성 PASS.
- **다음 단계:** 사용자 PC에서 ZIP 전체 압축 해제 후 `MARKET_CALENDAR_R24_USDA_APPLY.cmd` 1회 실행, `MARKET_CALENDAR_R24_USDA_APPLY_RESULT.txt` 전달. R24는 아직 설치 미확인, 예약 수집·SQLite 반영·웹 공개 미확인. 설치 성공 및 정규 수집 증거를 구분한다. 기존 브랜치만 사용, 신규 브랜치 생성·`main` 병합·Cloudflare 배포 없음.


## 26. R24 USDA 설치 중단 — PC source drift 읽기 전용 확인 필요 (2026-10-28)

- 사용자 `MARKET_CALENDAR_R24_USDA_APPLY_RESULT.txt` 직접 검증: `decision=PC_SOURCE_CHANGED_STOP`. R24 후보 4파일 해시·Core worktree ID는 기대값과 일치하지만 **현재 PC Git HEAD가 승인 R23 source `8ff396217c9f84578b37c9d422381644c2b8f0e8`와 다르다.** 실제 HEAD·변경 내역은 해당 설치 로그에 없으므로 원인을 추정하지 않는다.
- `changedFiles=[]`, `backupCreated=false`, `newSource=null`, `forcedCollection=false`, `publisherExecuted=false`, `gitPushed=false`. **R24 PC 설치 0**, 기존 운영 파일에 이번 설치로 인한 수정 없음. 사용자에게 기존 R24 CMD 재실행을 요청하지 않는다.
- 동일 기존 브랜치에 별도 읽기 전용 진단 CMD 추가: `MARKET_CALENDAR_R24_SOURCE_DRIFT_READONLY.cmd` + `scripts/pc-writer/market-calendar-r24-source-drift-readonly.mjs` + README + 테스트. 현재 HEAD/config.source/관련 파일 SHA/dirty/lock/승인 R23 조상 관계를 노출 가능한 값만 조회하며 PC 파일·Git/DB/예약·게시를 변경하지 않는다.
- 새 사용자 전달 ZIP `MARKET_CALENDAR_R24_SOURCE_DRIFT_READONLY_20261028.zip` SHA256 `69611dfaeae502668db26d15f318abea2f1fb7a94e76dd2f5eb76f3c3fa0f6f6`, 진단 테스트 3/3, CMD ASCII CRLF, ZIP 4/4 PASS. 결과 `MARKET_CALENDAR_R24_SOURCE_DRIFT_RESULT.txt`를 받기 전엔 설치기 재고정/원본 덮어쓰기/강제 실행 금지.
- 기존 R24 코어 후보·USDA 공식 날짜 24건 실측·브랜치 UI 변경은 보존한다. **R24 PC 설치/예약 수집/SQLite/공개 사이트 검증은 미완료**. 신규 브랜치 없음, `main` 병합/Cloudflare 배포 없음.
