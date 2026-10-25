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
5. 2026-10-24 PC에 `0614f6851569615b3a4700f79b58d4c89a65b2f0` 불변 실행 코드 스테이징과 AI 원자료 manifest `SHA_VERIFIED`, AI Reader 읽기 전용 진단 `PUBLIC_READER_CANDIDATE_VERIFIED_NO_PUBLICATION` 및 점수 차이 0.0을 확인했다. 새 원자료 GET·D1 게시·AI 예약 작업 등록·다음 정규 실행은 아직 미실행이며 자동 갱신 완료로 보고하지 않는다.

2026-10-24 PC 예약 작업 실측(사용자가 `schtasks /query /xml`로 내보낸 기존 작업 2개의 설정 비교): 7개 ETF `ZGMINI-PC-GetMarketHistory-ETF`와 바이오 `ZGMINI-PC-Theme-Biotech`는 매일 현지 14:00, 동일 실행 주체, `PT12M` 제한, `IgnoreNew`, `StartWhenAvailable=true`, `RunOnlyIfNetworkAvailable=true`이며 작업 URI와 실행 명령/작업 디렉터리만 다르다. PC 스테이징 진단에서 AI 작업은 `NOT_REGISTERED`였다. XML 원본의 개인 사용자 SID는 저장소에 넣지 않는다.

- AI 전용 작업 등록 도구: `scripts/pc-writer/theme-ai-task-mirror-r1.mjs`. GitHub 승인 SHA로 고정된 **새 불변 릴리스**에서만 `--inspect`(읽기 전용) → `--apply`(새 작업 등록) 순서로 사용한다. 기존 7개 예약 작업의 Trigger/Principal/Settings를 XML 그대로 보존하고, 새 URI·AI 실행 명령·설명만 바꾼다. 기존 작업 변경 및 `/f` 덮어쓰기는 금지한다.
- `--apply`는 해당 릴리스의 source-manifest에 기재된 모든 파일 SHA가 일치하고 `E:/ZGmini/data/themes/ai-semiconductor/state/cycle-last.json`이 최근 36시간 내 `PUBLIC_VERIFIED`·`d1Writes=1`·`publicVerified=true`일 때만 허용한다. 따라서 먼저 AI 전용 `--once` 비공개 재수집·검산과 별도 `--publish` D1 읽기 검증을 끝내야 한다. 첫 수동 게시가 실패하거나 다음 정규 실행을 확인하지 못하면 자동 갱신 운영 완료로 표시하지 않는다.

2026-10-24 PC 실행 추가 실측: `900e1026c75d906e4689f4ed3df353cd4d09ec58` 불변 릴리스 스테이징 `STAGED_NEW_RELEASE`, AI 작업 `--inspect` 결과 `READY_TO_REGISTER_AFTER_PUBLIC_VERIFICATION`, 기존 작업 수정 0. 이어진 `--once`는 `CANDIDATE_VERIFIED_NOT_PUBLISHED`, 점수차 0, 관측일 2026-10-21이지만 **`providerCalls=0`**이므로 최신 원가격 API 호출 완료 증거가 아니다. 원인: 수집 종료일이 공개 기준 `observationDate` 및 잠정일에만 종속되어 날짜가 바뀌어도 같은 완료 체크포인트를 재사용하는 경로. 후속 수정은 **AI만** 해당 실행의 UTC 일자를 수집 요청 범위 상한에 포함하여 새로운 날짜에는 서로 다른 체크포인트 키를 만들며, 재실행 같은 날에는 중복 호출을 생략한다. 이는 가격 관측일·산식·산출 가격을 만드는 행위가 아니며, 실제 수신한 원자료만 manifest에 추가한다. 바이오·기존 7개·D1·예약 작업은 수정하지 않는다. 새 수정 승인 SHA로 PC 스테이징 후 실제 `providerCalls>0`와 원자료 SHA를 검사하기 전에는 AI `--publish`·예약 등록을 실행하지 않는다.

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

## 2026-10-24 데이터센터·전력 10번째 테마 — 9개 경로 불변

- 조합: DTCR/GRID, SPY 기준, 승인 `ETF_ONLY_T40_R20_V40_PAIR50` 그대로. ETF 외 개별 종목, 산식, R188 조기폐장 선택기, 기존 9개 데이터 원장·작업·D1 키는 변경하지 않는다.
- 기존 `theme-optional-collect.mjs`에 `data-center-power` 심볼 세 개만 추가하였다. `theme-data-center-power-r1.mjs --score`는 manifest 각 원가격 SHA를 다시 검증하고 `regularHour15Rows` 및 `scoreAll252`를 직접 재사용하여 252점의 **비공개** 후보만 만든다.
- 이번 실행 환경에서 공급원으로 실제 7페이지(각각 DTCR 2, GRID 2, SPY 3)를 새로 수신하여 원자료 일치 공통 거래일 704개, 2026-10-22 기준 252점, 마지막 점수 **14.75794**를 확인했다. 진단 입력 manifest SHA256은 `0a1d47909868419fd14277ef4e65a0eb64a4ce44e6e993bd5f843a2836170e16`이다. 이는 **실행 환경의 비공개 실측**이지 PC `E:` 설치·자동 갱신·D1 게시 증거가 아니다. 원자료를 Git에 넣거나 재배포하지 않는다.
- 첫 네트워크 오류는 이 실행 환경의 Node 프록시 연결에서 발생했다. 공급원 문서 GET 200으로 원인 확인 후 체크포인트 실패 이력을 보존하고 이어서 성공했다. 실패 이전에 저장된 응답/파일을 반복 다운로드하지 않았다.
- 공개 Reader `worker/theme-data-center-power-r1.mjs`는 새로운 독립 D1 key만 읽으며, **활성 계정·상업적 파생 공개 라이선스·원자료 해시·252점·기준일·신선도**가 모두 확인되지 않으면 기존 9개를 그대로 반환한다. 사용자 방문 시 가격 수집·계산·D1 쓰기는 없다.
- GetMarketHistory 약관(2026-10-19 시행, <https://getmarkethistory.com/docs/terms>)은 파생 결과 공개를 허용하나 **계정 정상 유지 조건**이 있다. 이번 `api/v1` 익명 무료 데이터 수신만으로 계정 정상 여부가 증명되지는 않는다. 권리 검증 플래그를 임의로 `true`로 설정하지 않는다.
- PC에서 같은 출처의 DTCR/GRID/SPY 원자료와 SHA가 확보되고, 라이선스 근거가 확인된 뒤 별도 PC 신규 key 전용 게시기·D1 CAS/readback·정규 Task를 승인 경로로 연결한다. 기존 9개 파이프라인을 수정해 우회하지 않는다. 아직 **공개·PC 자동 운영 완료가 아니다**.

## 2026-10-25 데이터센터·전력 R2 — 기존 선택 테마 PC 주기 경로 재사용

- 새 외부 GET 3회(DTCR, GRID, SPY 각각 1회)를 10월 25일에 실행했다. 3개 실제 원가격의 공통 마지막 관측일은 여전히 **10월 22일**이고 704개 공통 거래일, 252점, 14.75794는 변하지 않았다. 23일 점수는 공급원에 없으므로 생성하지 않는다. 새 manifest/후보 SHA는 이전 파일을 덮어쓰지 않고 추가했다.
- `scripts/pc-writer/theme-data-center-power-cycle-r2.mjs`는 기존 선택 테마 `collectOptional`과 R1 SHA 검증 계산기를 그대로 연결한다. `--once`는 저장 원자료 검산만, `--once --collect`는 실제 원자료가 존재하는 3개 ETF에 대해 4회 이하 bounded/resume GET을 수행한다. 실행 당일 날짜로 window가 움직이므로 R1 최초 백필의 고정 종료일에 갇히지 않는다.
- Windows `theme-data-center-power-cycle-r2.cmd` 실행 로그 `DATA_CENTER_POWER_R2_RESULT.txt`는 CMD와 **같은 폴더**에 저장한다. raw/checkpoint는 승인된 E: 데이터 경로를 따른다. 이 단계는 기존 9개/기존 태스크/D1 변경 0이며 **새 정규 태스크 등록·공개 게시 완료가 아니다**.
- 앞선 R1 최초 백필 CMD는 최초 원자료 설치 전용으로 유지한다. R2는 R1 raw manifest와 SHA 검증 데이터가 있어야 실행한다. 샘플 API의 무계정 GET만으로 공급원 유효 계정 및 파생물 공개 권리가 증명되지 않아 `--publish` 경로는 별도 승인·D1 CAS/readback 게시기 전까지 제공하지 않는다.

## 2026-10-25 데이터센터·전력 R3 — 기존 9번째 무계정 공개 방식 재사용

- 기존 바이오 9번째 운영 소스 `worker/theme-biotech-optional.mjs`, `worker/theme-biotech-continuation-r2.mjs`, `scripts/pc-writer/theme-biotech-public-record-r7.mjs`를 재확인했다. 바이오는 **무계정** `GET /api/v1/bars/stocks/{symbol}/1h`로 수집했으며 `OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED` 및 이전 게시자의 `licensingRiskAcceptedByPublisher=true`에 따른 제한적 공개 경로를 쓴다. 무계정 조회와 파생물 배포의 법적 권리를 동일시하지 않는다. <https://getmarkethistory.com/docs/quickstart>, <https://getmarkethistory.com/docs/terms>.
- 데이터센터·전력에도 이 **미확정 사실을 그대로 표시하는 별도 경로**를 마련했다. `accountGoodStandingVerified=false`, `upstreamCommercialRightsVerified=false`, `derivedLicenseVerified=false`, `anonymousScopeIndependentlyConfirmed=false`를 유지한다. 이 신규 테마의 게시자 위험 수용은 별도 명령 `--publish --accept-anonymous-license-risk`를 둘 다 주어야 하며 9번째 승인 상태를 자동 복사하지 않는다. 비공개 GET/검산은 별도 가입·권리 수용 없이 가능하다.
- 신규 `theme-data-center-power-publish-r3.mjs`: 기본 `--once`는 기존 R2 SHA 검산만, `--once --collect`는 무료 무계정 4 GET 이하·비공개 검산만 한다. 공개 명령 `--once --collect --publish --accept-anonymous-license-risk`를 명시하면, 기존 PC Cloudflare 인증 경로를 재사용해 새 D1 key `theme-data-center-power-r1`만 CAS/읽기 검증한다. 기존 9개 key·예약 작업 변경 0. `theme-data-center-power-r3.cmd` 로그는 실행 CMD와 같은 폴더 `DATA_CENTER_POWER_R3_RESULT.txt`.
- R3 검증 조건: 실제 252개 거래일·원가격 manifest SHA·후보 파일 SHA·소스 신선도·라이선스 미확인 상태의 명시·D1 CAS/readback·공개 API readback. 신규 정규 작업은 **미등록 제안 상태**이고 PC 승인 SHA 설치·실제 게시·다음 정규 PC 실행 전에는 공개·운영 완료가 아니다.
- 2026-10-25 공개 API 읽기 전용 실측: 기존 9개 표시, 기본 관측일 `2026-10-22`, 바이오만 `2026-10-21`. 새 DTCR/GRID 관측일도 `2026-10-22`이고 후보 252개 날짜 SHA256 `99240d830a2ab4e26512032f2d70ef6e7889fdbb0a474218079ac73327cdec99`가 공개 기존 7개 기준 시퀀스의 해시와 일치한다. R3 실제 로컬 비공개 재생 `PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED`, `score=14.75794`, `providerCalls=0`, `d1Writes=0`, `publicWrites=0`, `schedulerWrites=0`.
- 2026-10-25 R4 Windows PC 준비 CMD `scripts/pc-writer/theme-data-center-power-r4-bootstrap.cmd`: R3 실측 검증 릴리스 `2f0f1a2c1b31e20f9e943e90824885d586448d29`을 immutable SHA로 고정해 GitHub 스테이징 30개 파일 해시를 검증한다. 새 PC raw manifest가 없으면 기존 4 GET 상한 수집기를 2회 이어 실행해 R1 개인 PC 252일 계산 후 R3 비공개 검산을 한다. 이미 manifest가 있으면 R3 bounded 수집·검산만 실행한다. 사용자 CMD와 같은 위치에 `DATA_CENTER_POWER_R4_RESULT.txt` 및 임시 다운로드된 스테이징 도구를 두며 `%TEMP%`/E: 로그 생성 금지. **실행하더라도 D1 게시·신규 Task 등록은 0**, 사용자 PC 실행 결과는 아직 미수신.

### 2026-10-25 R4 실제 사용자 PC 결과 및 R5 기존 태스크 동일 조건 복제

- **실제 사용자 첨부** `DATA_CENTER_POWER_R4_RESULT.txt` 검증: `PINNED_SOURCE_SHA=2f0f1a2c1b31e20f9e943e90824885d586448d29`, `stageResult=ALREADY_STAGED_VERIFIED`, `originalSevenTask=REGISTERED`, `biotechTask=REGISTERED`, 기존 AI 작업은 `NOT_REGISTERED`. 기존 테마·예약 작업·D1 변경 `0`.
- PC `theme-data-center-power-publish-r3.mjs --once --collect`에서 추가 GET `3`회, 마지막 실제 관측일 `2026-10-23`, **점수 12.32143**, 생성 후보 SHA256 `4fe811c0c5480d3ccb67010ddcd356fb2d5ab0cdace5aadd8c63e5a927a7a4e8`, `PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED` 확인. 종전 격리 환경 10월 22일/14.75794 대신 **PC 실측 10월 23일/12.32143**을 이후 게이트의 기준으로 사용한다. 이 결과로 D1/공개 API/예약 실행 성공을 주장하지 않는다.
- `scripts/pc-writer/theme-data-center-power-task-r5.mjs`는 9번째 바이오 R7의 안전한 템플릿 복제 절차를 10번째 전용으로 적용한다. Windows `schtasks /query /tn \\ZGMINI-PC-GetMarketHistory-ETF /xml`에서 Trigger/Principal/Settings를 읽기만 하고 복제한다. 기존 7개 예약 작업을 바꾸지 않는다. 새 작업 이름 `ZGMINI-PC-Theme-Data-Center-Power`, 생성 명령은 **`/create`만 사용하고 `/f` 사용 금지**. 새 실행 CMD는 설치 CMD와 동일한 Desktop 폴더에 생성하고 `DATA_CENTER_POWER_R5_SCHEDULED_RESULT.txt`도 같은 폴더에 기록한다. E:의 고정 R3 소스로 **4 GET 이하 `--once --collect` 비공개 수집/검산만 수행**한다.
- 원클릭 `scripts/pc-writer/theme-data-center-power-r5-install.cmd`는 R5 태스크 도구가 포함된 GitHub 불변 SHA `0eb76747e6f35e8f410ffb7a0aa07942d2da5938`에서 PC 옆 파일로 내려받는다. PC R3 비공개 `--once` 검산부터 성공해야 `--apply`가 진행되며, 기존 7개 예약 태스크의 실제 Trigger/Principal/Settings를 복제한다. 사용자 Desktop CMD/로그와 생성 실행 CMD `DATA_CENTER_POWER_R5_SCHEDULED.cmd`를 **같은 위치**에 둔다. Desktop 실행 CMD를 다른 위치로 옮기면 새 예약 작업이 경로를 잃으므로 이동하지 않는다.
- R5 실제 PC `--inspect` / `--apply`, 새 예약 작업 `schtasks` readback과 다음 정규 실행은 아직 **미수행**. 기존 9개 변경 없음. 공개로 전환할 때는 먼저 GitHub main→Cloudflare exact production gate, 새 D1 key 조건부 게시/readback, 실제 공개 API/UI를 검증해야 하며 R5 Private만으로 공개 성공 처리하지 않는다.

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

## 2026-10-24 AI·반도체 확정치 지연 허용 검증 보완 (PC 미적용)

- 10월 24일 공개 API 실측: 기존 7개 테마는 2026-10-22 확정치와 10-23 잠정치가 있지만 AI·반도체는 10-19 확정치에서 멈췄다. 기존 PC 보관 자료의 마지막 공통 관측일은 10-21(2026-10-23 조사 결과)이며, **지금 PC의 실제 신규 수집 관측일은 미검증**이다.
- 원인 분리: 기존 7개 예약 작업은 SMH/SOXX를 수집하지 않는다. 독립 `theme-optional-cycle.mjs`의 가격 감사도 기존 7개 최신 확정일을 강제로 요구해, GMH 시간봉이 48시간 늦게 제공될 때 실제로 존재하는 AI 확정치를 거부했다. D1 Reader는 과거 날짜에 대한 별도 252개 이력 검증을 이미 지원한다.
- 수정: `theme-optional-audit.mjs`는 AI의 SMH/SOXX/SPY가 **모두 실제로 관측된 마지막 공통일 중 기존 7개 확정일 이하인 날**에만 저장 가격 산식을 적용한다. 더 늦은 날짜를 보간하거나 재사용하지 않는다. 바이오 감사의 기존 계약은 변경하지 않는다.
- 신규 후보는 D1에 이미 저장된 **승인된 7개 seed의 정확한 252일 이력**과 공개 rolling 날짜를 결합해 같은 날짜의 과거 기준을 재구성한다. 이전 D1 값과 252개 검산 차이 0, 가격 manifest SHA, 출처·권리·신선도, 최종 Reader 자격 조건을 그대로 통과해야 한다. 현재 날짜의 잠정치가 없는 경우 AI 과거 확정치에 복사하지 않는다.
- `--diagnose ai-semiconductor`는 기존 E: 원가격과 D1 SELECT만 사용하며 Provider GET, D1 UPDATE, 스케줄러 변경 및 운영 원자료 쓰기 0회다. 한 번의 `--once`는 기존대로 **공개 게시 없이** 수집·비공개 감사만 한다. `--publish`는 별도 승인/검증 뒤 실행한다.
- GitHub 코드 테스트만으로 점수나 자동 운영을 완료했다고 보고하지 않는다. PC 승인 소스 설치 → 실제 AI raw SHA와 252일 검산 → 권리 확인 → D1 CAS/readback → 공개 API/PC·모바일 표시 → 별도 Windows 정규 작업 설치 및 **다음 실행** 확인까지 `PENDING`이다. 기존 7개 및 바이오 작업·이력·DB key·가중치·Provider는 변경하지 않는다.
