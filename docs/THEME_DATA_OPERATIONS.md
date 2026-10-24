# 테마 데이터 운영·인수인계 기준

## 목적과 저장 원칙

새 테마가 채팅이나 개별 ZIP에만 남거나, 과거 점수만 게시된 채 자동 갱신에서 빠지는 사고를 방지한다. 이 문서는 기존 운영 경로를 이전하거나 등록 작업·DB·산식을 변경하는 명령이 아니다.

GitHub `config/theme-data-registry.json`이 테마별 연결 목록이다. 실행 코드는 GitHub에 보관한다. 대용량 원자료·개인 설정·인증정보는 Git에 보관하지 않는다. PC 데이터 루트는 현재 `E:\ZGmini\data`이며 다른 환경에서는 명시적으로 설정한다. E: 접근 실패 시 C:에 대체 저장소를 생성하지 않는다.

신규 테마 데이터 경로는 `<DATA_ROOT>/themes/<theme-id>/`를 사용한다. 기존 검증 경로는 유지하며 등록부에 `legacy`로 기록한다. `raw/`, `derived/`, `state/`, `evidence/`를 구분하고, 임시 폴더·Downloads·Desktop·채팅 첨부 폴더를 유일한 운영 저장소로 사용하지 않는다.

## 필수 등록 내용

- 영구 theme ID, 표시 이름, ETF/기준 자산, 산식 버전과 코드 위치
- 원자료 manifest 위치, 저장 스키마, 날짜/시간대/단위, 가격 조정 및 조기 폐장 처리
- 수집기·계산기·게시기 GitHub 경로와 실행 PC 경로, 승인 SHA
- Windows 작업 이름·실행 주기·인수·실행 계정 구분(비밀정보 제외), 마지막 실제 실행 결과
- D1 테이블·feed key·snapshot key 및 공개 API 경로
- 확정/잠정 조건, 마지막 실제 관측일, 데이터 지연과 결측 처리
- 무료 범위, 상업용 파생 결과 권리 근거 URL·확인일·제한. 미확정을 확인 완료로 바꾸지 않는다.
- 백업·복구 경로, 재실행/이어하기 방법, 잠금·원격 lease·중복 게시 방지

등록부의 `null`은 미확인이다. 파일명을 아는 것과 파일이 존재하며 읽을 수 있는 것은 다르다. 기존 항목은 소급하여 READY로 선언하지 않는다.

## 원자료 manifest v1

`raw-manifest.json`은 가격 대신 다음 메타데이터만 담는다. 실제 파일 쓰기·검증·rename 완료 후 원자적으로 갱신한다. 기존 파일을 덮어쓰기보다 해시가 포함된 불변 파일을 추가한다.

```json
{
  "version": 1,
  "themeId": "example-theme",
  "files": [{
    "path": "raw/ETF_2026-10-22_<hash>.json",
    "sha256": "<64 lowercase hex>",
    "source": "<official provider origin>",
    "collectedAt": "<ISO UTC>",
    "observationFrom": "2024-04-01",
    "observationThrough": "2026-10-22",
    "priceMode": "<approved exact mode>",
    "schemaVersion": "<raw schema version>"
  }]
}
```

`path`는 manifest 폴더 기준 상대 경로다. 절대 경로·`..`·외부 junction 탈출을 허용하지 않는다. 다른 테마에서 SPY를 공유하면 그 공유 원본을 별도 등록하고 승인된 어댑터로 참조한다. 원자료를 점수에서 역산하거나 단순 복사로 출처 증거를 생성하지 않는다.

## 구현·운영 완료 조건

1. 최신 main 및 실제 PC 실행 SHA/작업 등록을 구분하여 확인한다.
2. 기존 저장자료와 라이선스 근거를 재사용한다. 부족분만 무료 한도 내 bounded/resume 수집한다. 먼저 원자료와 manifest를 저장한다.
3. 저장자료만으로 계산한다. 승인 산식·정규화·가격 모드를 유지한다. 과거 공개 점수와 겹치는 날짜를 검산하고 불일치는 중단 사유와 영향 범위를 기록한다.
4. 새 입력이 계약을 충족하면 잠정치를 분리 게시한다. 자료가 없는 날짜의 가격·점수 생성, 마지막 값의 날짜만 변경, stale 자료를 최신처럼 재게시하는 행위를 금지한다.
5. 수집기 등록만으로 완료하지 않는다. 계산·게시까지 정규 실행에서 호출되는지 확인한다. 한 테마의 실패가 다른 정상 테마를 막지 않아야 한다.
6. 실제 한 번의 수집·저장·계산·게시 및 D1 readback, 공개 API의 날짜·점수·phase, PC/모바일 차트를 검증한다. 다음 정규 실행 결과도 확인하여 일회성 수동 성공과 자동 갱신 성공을 구분한다.
7. 코드·테스트·문서·등록부를 함께 GitHub에 반영하고 정확한 SHA를 기록한다. 실행 PC 승인 SHA·배포 SHA·원자료 SHA를 혼동하지 않는다.

검사 명령: `node scripts/pc-writer/theme-data-inventory.mjs --data-root <DATA_ROOT>`.
이 명령은 로컬 경로·manifest 해시 검사만 수행한다. Provider/D1/스케줄러·공개 UI 성공을 증명하지 않는다. 기존 legacy 항목에 manifest가 없으면 `UNREGISTERED`로 보고하며 파일 존재를 추정하지 않는다.

## 2026-10-23 확인 상태

기본 7개 테마는 R181/R167 수집, R179 계산/게시, D1 rolling 결과 경로가 있으나 구형 실행 코드 일부가 PC 전용이다. GitHub 원본 회수와 manifest 등록은 별도 후속 항목이며 이미 확인된 기본 7개 운영을 막는 BLOCKER가 아니다. 등록부의 `followUps`로 관리하며 기존 운영은 유지한다.

AI·반도체의 R187 원자료와 R188 결과는 PC에서 확인했다. 기존 일반 채팅 R188 계산 소스를 Desktop 패키지에서 회수하여 `scripts/pc-writer/theme-optional-score-r188.mjs`에 순수 계산기와 과거 시간 선택기를 보존했다. 원본 SHA는 모듈과 등록부에 기록한다. 실제 R187 원자료로 R188 저장 이력 252개를 재계산하여 최대 차이 0을 확인했다. 과거 날짜 검산이며 최신 수집·게시 성공 증거는 아니다. 이 모듈의 조기 폐장 달력은 과거 검증 범위이므로 미래 운영 연결 시 달력 적용 범위를 검증해야 한다.

기본 14-symbol 수집기는 SMH/SOXX/IBB/XBI를 수집하지 않는다. 두 테마의 자동 갱신 연결은 여전히 미완료다. 이 점을 문서·등록부에 그대로 드러낸다.

바이오 D1 점수는 존재하지만 `BIOTECH_PC_R3_LOCAL_PRICES.json` 소재는 미확인이다. D1 점수·R4 코드로 원가격을 복원할 수 없다. 원본 확보 또는 동일 출처 재수집 및 과거 점수 검산 전에는 자동 갱신 완료가 아니다. 바이오의 기존 제한된 권리 검증 상태를 보존한다.

이번에 `theme-optional-collect.mjs`로 AI 3회·바이오 8회의 무료 GET을 실행하고, 원자료·manifest·이어하기 checkpoint를 `themes/ai-semiconductor/`와 `themes/biotech/`에 저장했다. 수집은 한 실행 최대 4회이며 실패 요청은 자동 재시도하지 않는다. 이 도구는 명시적 `--collect` 없이 네트워크를 호출하지 않고, 계산·게시·작업 등록을 하지 않는다. 정상 checkpoint의 이어하기는 동일한 theme/start/end를 사용한다. 실패 checkpoint는 원인 검토 없이 삭제·초기화하지 않는다.

새 자료의 공통 관측일은 2026-10-21, 공통 세션은 각각 704개였다. AI는 10월 19일 기준 기존 공개 252점 전체와 최대 차이 0을 확인했다. 바이오는 같은 비교에서 최대 2.35318점 차이가 있었고 마지막 19일도 기존 16.35516과 재계산 16.40278로 달랐다. 바이오는 공개 이력·점수를 덮어쓰지 않고 검토 대기한다. 새 자료로 22일 값이 확보됐다고 표시하지 않는다. 두 테마 모두 정규 수집·계산·게시 자동 연결은 아직 미완료다.

재현 검사는 `node scripts/pc-writer/theme-optional-audit.mjs <ai-semiconductor|biotech> <저장한 기준 API JSON> <저장한 기존 D1 행 JSON>`으로 수행한다. D1 행 JSON의 `body` 문자열 또는 점수 문서 자체를 받는다. 저장 원자료 manifest/해시 검증 후 기존 공개 252점 전체와 비교하며, 결측인 잠정 날짜는 `missingProvisionalDates`에 남긴다. 결과 `PRIVATE_CANDIDATE_PARITY_VERIFIED`도 자동 게시나 권리 확인 완료를 뜻하지 않는다. 감사 도구에는 네트워크·D1 쓰기·스케줄러 변경 기능이 없다.

## 2026-10-23 신규 2개 독립 자동 실행 준비 (PC 미설치)

원인: 기존 7개 R181/R179/R171 작업은 14개 ETF만 처리한다. AI·반도체 SMH/SOXX 및 바이오·신약 IBB/XBI는 같은 GetMarketHistory를 사용하지만 그 정규 실행 목록에 없었다. 신규 공개 기능은 의도적으로 D1 **읽기 전용**으로 개발됐고, 이전 별도 수집기는 수동 GET만 수행했으므로 같은 Provider라는 이유만으로 자동 갱신되지는 않는다.

- 새 GitHub 실행 코드: `scripts/pc-writer/theme-optional-cycle.mjs` (원자료 수집 → manifest SHA 확인 → 승인 R188 252점 재계산 → 기존 D1 점수 전체 대조 → 승인된 경우에만 D1 조건부 게시 → 공개 API 확인).
- Windows 진입점: `scripts/pc-writer/theme-optional-cycle.cmd`. PC에 체크아웃된 코드와 승인된 `E:\ZGmini\runtime\node.exe`를 사용한다. 원자료와 최신 상태 증거는 각각 `E:\ZGmini\data\themes\<theme-id>\raw/`, `state/cycle-last.json`에 둔다. Desktop·ZIP은 운영 원본이 아니다.
- CLI 기본 실행은 공개 게시 없이 가격 GET 및 비공개 검산만 한다. `--publish`를 명시해야만 기존 D1 권리/가격 승인, 252점 일치, 관측일/잠정치 일치, 소스 해시, 비교 후 조건부 D1 update와 readback을 시도한다.
- AI는 기존 R187/GMH 승인 출처·상업/파생 공개 승인 플래그를 그대로 확인하며, 불일치·결측·원본 변경·기존 게시 이후 새로운 원자료가 없는 경우 D1을 덮어쓰지 않는다. 동일 점수를 다시 게시해 시각을 연장하지 않는다.
- 바이오는 별도 수집을 계속할 수 있지만 R3 원자료 미확인, 252점 불일치 및 권리 증빙 문제가 모두 해결되기 전 **게시 금지**. 이 제한을 없애기 위해 기존 값을 복사하거나 score/rights 플래그를 임의로 true로 설정하지 않는다.
- NYSE 공식 공지에 있는 2026~2028년 1시 조기폐장 날짜를 R188 12시 가격 선택 규칙에 추가했다. 2029년 이후 날짜는 캘린더 재검증 없이는 실행 차단한다. 산식 가중치·정규화·252점 구성은 불변.

PC에서 새 작업 등록 전 아래 단계가 필요하다.

1. GitHub **검증된 main**을 PC 승인 SHA와 일치시킨 뒤 기존 7개의 예약 작업명·주기·승인 실행 경로를 **읽기 전용**으로 확인한다. 신규 두 작업의 제안명은 `ZGMINI-PC-Theme-AI-Semiconductor`, `ZGMINI-PC-Theme-Biotech`이다. 실제 주기, 계정, 승인 SHA는 PC 실측 전까지 등록부의 `null`을 유지한다.
2. 사용자 CMD에서 저장소의 `scripts\pc-writer\theme-optional-cycle.cmd ai-semiconductor` 및 `... biotech`를 **한 번만** 명시 실행한다. 최대 4회 무료 API GET/테마/실행이며 E: manifest/checkpoint를 원자적으로 갱신한다. `cycle-last.json` 결과와 PC 측 252점 검산을 확인한다.
3. AI는 `CANDIDATE_VERIFIED_NOT_PUBLISHED` 확인 및 권리 근거 재확인 이후에만 `theme-optional-cycle.cmd ai-semiconductor --publish`를 실행한다. D1 성공·readback·공개 API 반영을 각각 검사한다. HTTP 응답만으로 D1 성공을 추정하지 않는다.
4. PC에서만 별도 Windows 작업 2개를 등록한다. **기존 7개 작업은 수정하지 않는다.** 두 테마는 서로 다른 작업으로 등록해 바이오 실패가 AI 및 기존 7개 실행을 막지 않도록 한다. 작업 이름·주기·실행 경로·승인 SHA·첫 실행/다음 정규 실행 증거를 확인한 뒤 등록부의 `tasks`와 `runtime`을 갱신한다.
5. PC 코드 배치·수집·D1 게시·다음 정규 실행은 현재 환경에서 미실행이며 자동 갱신 완료로 보고하지 않는다.

관련 권리 조건: <https://getmarkethistory.com/docs/terms> (2026-10-19 시행). 문구상 파생물 사용은 계정 정상 유지 조건과 연결된다. 기존 바이오의 익명 무료 호출 사용 권리 해석은 미확정이다.

## 2026-10-23 바이오·신약 R1 읽기 전용 원인 분해·Shadow 전환 준비

**현재 상태: GitHub 코드와 합성 fixture 테스트만 완료. PC E: 실측·D1 readback·자동 실행·공개 전환은 미실행.** 전환 상태를 `PASS`로 표기하지 않는다.

1. `BIOTECH_PC_R3_LOCAL_PRICES.json` 검색은 기존 `BIOTECH_R3_SOURCE_LOCATE_RESULT.txt` 및 `BIOTECH_R3_SOURCE_LOCATE_R2_RESULT.txt`의 `NOT_FOUND`로 **종료**한다. 과거 R4 검증 결과에는 R3 원가격 SHA256 `a59777c3fe8e009fc76154bcf16e135d7564e61cd9dca4366003fd9ca16b6915`, 703공통일·2026-10-20 관측 및 **R158 정확 재계산** 결과가 있다. 이 리포트와 D1 숫자는 원가격 자체가 아니다. 반복 재탐색이나 임의 가격 역산을 금한다.
2. 최신 main 확인 후 신규 읽기 전용 `scripts/pc-writer/theme-biotech-forensic-r1.mjs`를 실행한다. SHA256 `eba8ca59e49471b215733101d8064056c34d9ac6b38e2401d47d633087cbce29` (GitHub 반영 시 변경 여부 재확인). 저장소의 `lib/market-score/theme-etf-provisional-score.mjs` SHA256 `91d833bb58188b52df069ae71668b98822fa8bd9551f5a05ae999d6007cac38b`를 R158 원본으로 고정한다. `scripts/pc-writer/theme-optional-score-r188.mjs`의 로컬 실제 SHA도 기록하고, 회수된 이전 R188 소스 SHA `8dca56dabe186bbc69641ce347bc5bcbc0d0a0e30e12f13dbda8ca9e2a4524f9`와 **별도 표기**한다.
3. `E:\ZGmini\data\themes\{ai-semiconductor,biotech}\raw-manifest.json`의 모든 raw 파일 해시를 파일 바이트로 검사한다. 등록부의 `privateAuditArtifact` 및 AI 기존 R187 원자료도 실파일/SHA256로 검사한다. E: 접근이 없으면 이전 `SHA_VERIFIED` 로그를 현 시점 실측으로 승격시키지 않는다. 확보된 704개 공통 세션은 재수집하지 않는다.
4. 새 원가격(IBB/XBI/SPY)에서 뉴욕 현지 날짜와 DST, 정규장 15:xx/조기 폐장 12:xx 마지막 시간봉, `is_gap===true` 제외, 기타 보간 플래그, 중복 timestamp/선택 시간, 종목별 결측·공통 거래일, 조정 여부, 628개 가격 및 252개 midrank 경계를 구분한다. R158과 R188은 **동일한 저장 가격 배열**로 직접 비교한다. 차이 67일은 일자별 가격→9개 개별 지표→백분위 동률/부동소수점→3축 점수→최종 점수 순서의 상세 로그로 남긴다. 구 R3의 3종목 가격이 없으면 **최초 원가격 차이는 미확정**이고, 새 가격과 과거 공개 점수의 첫 불일치 날짜만 확정할 수 있다.
5. 실제 PC 진단 로그는 CMD 파일과 **같은 Desktop 폴더의 TXT**에 저장한다. 원자료·D1·공개 이력·스케줄러·Provider를 변경하지 않는다. 스크립트가 계산한 Shadow 252일 이력은 별도 `BIOTECH_GMH_R1_<manifest+code hash>`로 **TXT 안에만** 기록하고, 기존 `theme-biotech-optional-r1` D1 key를 건드리지 않는다. Shadow 후보를 공개할 때는 신구 Revision·가격 조정 모드·권리·이력 차이를 승인받고 새 key/reader 경로를 별도 PR로 검증한다. 원본 재탐색 완료를 선행 조건으로 재설정하지 않는다.
6. 이미 PC에 저장한 MarketParquet 자료는 `E:\ZGmini\data\theme-market-history-r131\marketparquet-r167`의 **실제 원본 파일 내부 `symbol`** 기준으로 IBB/XBI/SPY를 먼저 조사한다. 파일명·기존 추출 목록에 없다고 해서 원본 부재라고 결론 내리지 않는다. Parquet의 단순 파일 목록만 확인되면 `CONTENT_UNINSPECTED`로 남긴다. 공식 문서상 MarketParquet 일봉/시간봉은 **분할 조정·배당 비조정**, GetMarketHistory 1시간봉은 **분할/배당 비조정**이므로 가격 모드가 다르다. 동일한 가격·날짜·거래소 폐장 선택 검산과 무료 사용자의 파생 공개 권리 확인 전 혼합 금지. <https://marketparquet.com/documentation>, <https://marketparquet.com/license>, <https://getmarkethistory.com/docs/terms>.
7. GetMarketHistory 48시간 지연은 **당일 잠정치 미제공**을 뜻할 뿐 최신 제공 관측일까지의 정규 자동 갱신 불가능을 뜻하지 않는다. 공식 `stats`와 매 실행의 마지막 관측일로 수집 상한을 정하고, 없는 날의 결측은 그대로 둔다. 신규 바이오 자동 전환 승인 시 관측일·권리·가격·산식이 맞는 확정치만 게시한다. 잠정치는 별도 권리/원자료/연결 검증 후 추가한다. <https://getmarkethistory.com/docs/reliability/>.
8. AI·반도체와 기본 7개는 독립 실행 유지. 이전 PC 리포트에서 기존 7개 작업은 `REGISTERED`, AI·바이오는 `NOT_REGISTERED`였다. 현재 설치 SHA·실행 주기는 PC `schtasks /query` 실측 없이는 `null` 유지. 공개 reader가 기본 7개의 잠정 날짜를 AI 후보의 잠정 날짜와 **같게 요구**하는 현행 게이트를 진단한다. 결측값 생성/게이트 완화·산식 변경으로 PASS 처리하지 않는다. AI 단독 정상 경로 보완은 별도 검증 및 승인된 범위에서 진행한다.
9. 완료 증명 순서: 저장 원자료와 SHA → 기존 R158/R188 동일 입력 계산 → Shadow/기존 이력 비교 → 권리·승인 Revision 확인 → 선택된 key 조건부 D1 게시 → D1 readback → `/api/theme-fear-greed` 및 PC/모바일 UI 관측일 비교 → **다음 정규 예약 실행**의 task 결과·run timestamp·관측일 확인. 수동 성공과 정규 자동 성공을 혼동하지 않는다.

신규 포렌식 상태는 `config/theme-data-registry.json`의 `forensicRecovery`에서 관리한다. `sourceSearch`만 종료하고, 가격 차이 원인/실제 스케줄/권리/Shadow 전환은 실증 전까지 미확정으로 유지한다.

## 일반 채팅 작업 지시문

> ZGMINI 테마 작업은 GitHub 최신 main의 AGENTS.md, docs/THEME_DATA_OPERATIONS.md, config/theme-data-registry.json을 먼저 확인하고 진행하라. 원자료 수집→PC 저장→계산→확정/잠정 게시→D1 readback→공개 API/UI→다음 정규 실행까지 연결하라. 실행 코드는 GitHub에, 원자료는 승인된 E: 데이터 경로에 저장하고 manifest에 실제 상대 경로·SHA256·출처·수집 시각·관측 기간·스키마·가격 모드를 기록하라. 수집기·계산기·게시기·작업 이름/주기·PC 승인 SHA·D1 key를 등록부에 갱신하라. 첨부 ZIP·Desktop·임시 폴더만 유일한 사본으로 두지 마라. 로컬 접근이 없으면 적용했다고 보고하지 말고 GitHub 코드와 정확한 설치/검증 명세를 준비하라. 무료·상업용 조건과 기존 산식·데이터·잠금·게시 보호를 유지하고, 새 테마의 실패가 기존 테마 갱신을 막지 않게 하라. 실제 검사 명령과 결과·미완료 항목을 남기고 테스트/배포 성공만으로 자동 운영 완료라고 보고하지 마라.


## 2026-10-24 바이오 확정치 R7 승인·운영 경로

- 사용자 승인 범위: **기존 7개 테마의 수집·계산·게시·스케줄러·D1·공개 이력은 불변**. 바이오 IBB/XBI/SPY만 기존 PC 수집→원자료·해시 저장→저장 가격 계산→D1 게시→원격 재조회 구조에 연결한다. 바이오 전용 점수 이력은 기존 겹치는 공개 날짜를 그대로 보존하고 새 관측일만 이어 붙인다.
- 수집은 기존 GitHub `theme-optional-collect.mjs`의 무료 GMH 시간봉을 재사용, 4 GET/1회 상한 및 기존 manifest/checkpoint 보존. 가격 모드는 현재 승인된 시간봉 15:xx/조기 폐장 12:xx 미조정 proxy 유지. MarketParquet 가격은 모드 및 원본 종목 행 미검증이므로 억지 병합하지 않는다. 공식 [신뢰성 안내](https://getmarkethistory.com/docs/reliability/)의 48시간 이후 관측 규칙을 지킨다.
- 개인 PC에는 GitHub와 동일한 해시로 검증된 바이오 R7 코드만 `E:\\ZGmini\\data\\themes\\biotech\\source-r7`에 복사한다. 두 ETF 정규 작업은 읽기 전용으로 확인; `ZGMINI-PC-GetMarketHistory-ETF`의 Task Scheduler Trigger/Settings/Principal을 복제해 **새** `ZGMINI-PC-Theme-Biotech`만 등록한다. 새 작업의 명령은 `--once --collect --publish`. 기존 작업은 열람 외 동작 없음. 정규 작업 실제 주기·사용자는 PC에서 복제 전 실측하며 임의 시각을 하드코딩하지 않는다.
- D1은 기존 `public_feed_snapshots_v1`에 바이오 전용 `theme-biotech-optional-r2/current` 결과를 조건부 삽입/갱신, readback 검증한다. 종전 `theme-biotech-optional-r1`은 무변경 fallback. `worker/theme-etf-only-public.mjs`의 공통 7개 Reader는 건드리지 않고 바이오 후처리만 추가한다. 웹 GET은 저장 결과를 읽기만 한다.
- 2026-10-24 R6 PC PASS: 기존 겹치는 250점 보존 + 확정 2026-10-20/21 점수 신규 추가, 252점. Shadow 67일 차이(최대 2.35318)는 원가격 불명 사유를 기록하고 기존 공개 이력은 유지한다. R7 UI·D1·정규 실행은 PC 설치/게시 및 다음 스케줄 증거 확보 **전까지 완료 아님**.
- 바이오 잠정치는 당일 검증된 합법적 원가격이 없어 아직 게시하지 않는다. 기존 7개의 잠정치도 수정하지 않는다.

## 2026-10-24 바이오 R8 잠정치 별도 연결 (PC 적용 대기)
- 기존 7개와 동일하게 이미 수집·저장 중인 `marketparquet-r165` 원본 Parquet 및 `marketparquet-r167` 감사 파일을 **읽기만** 한다. 바이오용 새 Provider 수집이나 새로운 예약 시각을 만들지 않는다. 실제 Parquet 내 IBB/XBI/SPY 행이 세 종목 모두 검증된 날짜만 점수를 계산한다.
- 기존 바이오 R7의 GetMarketHistory 확정 수집·252개 공개 이력·`theme-biotech-optional-r2` key와 7개 원래 작업/공개 key는 변경하지 않는다. R8 산식은 기존 승인 ETF R158/R188을 재사용하되 검증된 MarketParquet 일봉을 추가 관측일로만 사용한다. 두 소스의 기준일 가격 차이가 5%를 넘으면 중단하고 빈 날짜·점수를 생성하지 않는다.
- R8 잠정치는 `theme-biotech-provisional-r1` 전용 D1 key에 CAS+readback으로 저장한 뒤 Worker의 `theme-biotech-provisional-r1.mjs`가 검증하여 바이오 날짜/점수만 기존 `provisional.points`에 합친다. 기존 7개의 날짜·점수·경로는 불변이다.
- PC one-time 설치는 기존 검증된 `source-r7`를 SHA 재확인해 `source-r8`로 **복사**하고, 첫 R8 실자료 계산/게시 성공 후 **바이오 예약 작업의 명령만** R8로 바꾼다. 원래 트리거·Principal·Settings는 XML 동치 검증 후 유지한다. 원래 작업의 XML은 Desktop CMD 위치에 복구용으로 보존한다. 원래 7개 Task는 수정하지 않는다.
- 이 GitHub 배포만으로는 새 바이오 잠정치가 이미 게시됐거나 PC Task가 전환됐다는 증거가 아니다. PC `BIOTECH_R8_CONNECT_LOG.txt`, R8 D1 readback, 공개 API의 바이오 점선 1~2점 확인 전에는 `PENDING`으로 기록한다.
