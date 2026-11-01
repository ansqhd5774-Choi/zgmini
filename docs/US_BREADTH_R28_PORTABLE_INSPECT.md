# 미국 등락 지수 R28 — 기존 Core 분리형 PC 원본 검사

대상: `ansqhd5774-Choi/zgmini` / `codex/us-breadth-public-r1-20261031`.

## 진단 증거와 목적

- R26 PC 결과에서 `E:\ZGmini\runtime\node.exe` `v24.19.0`/`x64` 정상. 기본 PATH의 `C:\nvm4w\nodejs\node.exe`는 실행 불가였으므로 이를 사용하지 않는다.
- R27 PC 결과에서 `E:\ZGmini\projects\*` 바로 아래 프로젝트에는 R24 파일이 발견되지 않았다. **PC 전체 미설치 또는 승인 Core 소스 장애로 확대 해석하지 않는다.**
- R28은 E: 기존 원본을 읽는 **독립적인 수동 검사 후보**이다. Core 승인 `config.source`, 작업 Action, VBS/dispatcher, launcher, PID, lock, 예약 작업을 읽거나 변경하지 않으며 새 설치·동기화·스케줄러를 생성하지 않는다.

## 압축 구성과 실행

`ZGMINI_US_BREADTH_R28_PORTABLE_INSPECT.zip`에는 R24 `--inspect`에 필요한 기존 모듈과 `hyparquet` v1.31.2의 런타임 JavaScript 및 `US_BREADTH_R28_PORTABLE_INSPECT.cmd`가 포함된다. 원래 저장소에서 확인된 SHA와 동일한 파일만 복사하며 새 산식·데이터·API를 만들지 않는다.

Windows에서 ZIP을 다운로드 폴더의 별도 임시 폴더에 완전히 **압축 해제**한 후 압축 최상위의 CMD를 실행한다. 압축 해제 없이 ZIP 내부 미리보기에서 CMD를 실행하면 상대경로 의존성이 누락될 수 있다.

- CMD는 `%~dp0` 기준으로 압축 안의 기존 R24 모듈을 찾고, 확인된 `E:\ZGmini\runtime\node.exe`로 **`--inspect`만** 실행한다.
- 이번 읽기 범위는 문서상 E: 운영 경로 `ZGMINI_DATA_ROOT=E:\ZGmini\data`, `ZGMINI_PC_HOME=E:\ZGmini\data\pc-writer`로 실행 프로세스에만 지정한다. E:에 코드·로그·임시 파일·DB를 쓰지 않는다.
- 결과는 `다운로드\US_BREADTH_R28_PORTABLE_INSPECT_...txt` (폴더가 없는 경우 `%TEMP%`)에 저장되고 메모장으로 열린다. JSON에는 원본 파일 경로·API 키·가격·서명 URL을 출력하지 않는다.
- 결과의 `localFound`/`localAuditShaMatched`는 **R22의 승인된 파일명 및 검색 경로 범위**에서만 집계된다. 0건은 전체 PC 저장 데이터 부재를 증명하지 않는다.
- `--verify-provider`/`--preview-only`/확정치 staging/final/D1 write/배포는 이 CMD가 실행하지 않는다. `providerCalls=0`, `localWrites=0`이어야 한다.
- ZIP은 런타임 의존성 검사 패키지일 뿐 운영 소스 승인이나 Core 설치를 뜻하지 않는다. R24 성공과 Core 실행 성공도 별도다.

## 다음 단계

1. R28 결과에서 `requestedDates`, `localFound`, `localAuditShaMatched`, `firstDate`, `lastDate`를 먼저 점검한다.
2. 실제 승인된 Core Action 및 `config.source`와 정규 수집 원본 경로를 구분하여 대조한다. 원본 위치가 승인된 R22 검색 범위와 다르면 기존 파일을 복사·이동하지 말고 경로 계약부터 확인한다.
3. 251일 전량 파일·감사 기록의 실제 SHA 검증이 확인될 때만 R24 공급자 교차검증 및 이후 R25 250포인트 미리보기를 별도 단계로 검토한다.

잠정 Alpaca IEX 약 503종목 15분, 신규 확정 MarketParquet 전체시장 약 6,500종목, 기존 R1 확정치와 250거래일 이력은 각각 분리·보존한다.
