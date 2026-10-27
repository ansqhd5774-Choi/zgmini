# R13 — 신규 우주 ETF **9종 기존 PC 원본 점검** 준비 (2026-10-25)

- 단계: `SCRIPT_TEST_PASS / DESKTOP_CMD_READY / PC_EXECUTION_NOT_YET_EVIDENCED / NO_RECOLLECTION / NO_PUBLICATION`.
- 전용 저장소 브랜치 `codex/theme-fear-greed-integration-20261025` / Draft PR #714. 기존 운영 테마 9개, 승인 R188/R2/R3, D1, Scheduler, Cloudflare, main 변경 없음.
- 최신 사용자 지시: **2종 또는 3종으로 제한하지 않으며 수집 가능한 ETF가 모두 후보**. 본 스크립트도 9종 전부 점검하고 소스 함수는 추가 후보 수에 고정 상한 없음.

## R12 선행 실측에서 확인한 정량 차이

| 신규 ETF | 무료 공급원에서 임의 시간봉 있는 UTC일 | **기존 R2가 읽는 뉴욕 15:00 가격봉 실제 관측일** | 다음 조치 |
| --- | ---: | ---: | --- |
| WARP | 118 | **118** | PC 실봉 저장+SHA 및 SPY 공통 N 검사 |
| ORBX | 134 | **130** | PC 실봉 저장+SHA 및 SPY 공통 N 검사 |
| MARS | 162 | **162** | PC 실봉 저장+SHA 및 SPY 공통 N 검사 |
| DIPR | 92 | **28** | 후보 유지, 기존 R2 40일 미달로 현재 합성 제외 |
| WSPC | 49 | **15** | 후보 유지, 기존 R2 40일 미달로 현재 합성 제외 |

- 위 수는 **공급원 무료 GET 데이터의 2026-10-23 종료 구간**을 직접 확인한 값이며 PC 원본 SHA 검증이나 SPY 교집합을 거치지 않아 R2 점수 PASS가 아니다.
- DIPR/WSPC가 **데이터 수집 불가**인 것은 아니다. 무료로 수집은 가능하지만 기존 산식이 요구하는 시각에 실제 봉이 적다는 뜻이며 가짜 15시 봉/전일 가격 채워 넣기 금지.
- R12의 ARKX/ROKT 당일 무료 실봉 PASS 확인과 R5의 기존 PC manifest 항목 존재 기록을 연결하되, 실제 개인 PC 읽기 전 확인한 것이라고 거짓 주장하지 않는다.

## R13 읽기 전용 로컬 감사기

`scripts/pc-writer/theme-space-satellite-r13-local-universe-audit.mjs`:

1. 기존 `E:/ZGmini/data/themes/space-satellite/raw-manifest.json`을 읽고 **UFO, NASA, WARP, ORBX, MARS, ARKX, ROKT, DIPR, WSPC** 후보를 전부 탐색. 원본 없음은 `NO_LOCAL_RAW`로 명시하며 삭제하거나 수집을 재시도하지 않는다.
2. 기존 원가격 파일만 열어 manifest 항목과 **SHA256, 공급원, 원가격 모드, 티커, 시간 오름차순, 중복 가격 일치** 확인. 경로 탈출/파일 과대/오염 시 안전하게 BLOCKED. 원봉을 다른 위치로 복제하거나 로그에 기록하지 않는다.
3. 이전 승인 공유 SPY 저장소 `data-center-power`를 **기존 R1 읽기 전용 어댑터로 검증**. 승인 R2의 `selectRealHourlySessions` 원함수를 재사용하여 뉴욕 15시 정규화 후 날짜별 **ETF 자체 N / SPY 공통 N**을 전부 산출.
4. `N<40`, `40<=N<628`, `N>=628`은 **원자료 일수 분류**. 개별 RSI 등 세부지표를 포함한 R2 점수 PASS나 최종 ETF 편입 확정 아님. 마지막 관측일 불일치 별도 표기.
5. 최종 보고는 티커별 개수·날짜·검증 상태, 공유 SPY manifest SHA뿐이며 실제 가격/원봉/계정정보 미출력. **Provider GET 0 / Raw 저장 0 / D1 0 / 스케줄러 0 / 공개 0**.

### Windows CMD 검증 패키지

- 패키지: `SPACE_SATELLITE_R13_EXISTING_RAW_AUDIT_DESKTOP_20261025.zip`. 7개 `.mjs` 의존 파일 + `theme-space-satellite-r13-local-universe-audit.cmd` 총 8개.
- 실행 환경: Windows **CMD만**, ZIP을 **바탕화면에 별도 폴더로 압축 해제**한 뒤 `.cmd` 실행. Node는 기존 `E:\ZGmini\runtime\node.exe`, 읽기 대상은 기존 `E:\ZGmini\data`.
- CMD는 7개 소스의 **내용 SHA256을 실행 전에 고정 검산**하고 변조/누락시 STOP. 결과는 CMD가 있는 폴더에 `SPACE_SATELLITE_R13_EXISTING_RAW_RESULT.txt`로 저장. **E:에 로그 파일을 새로 만들지 않음.**
- 실행은 사용자의 별도 CMD 실측이 있어야만 완료. 패키지를 제작한 것만으로 `PC_PASS` 선언하지 않는다.
- `tests/theme-space-satellite-r13-local-universe-audit.test.mjs`, `tests/theme-space-satellite-r13-launcher.test.mjs`에서 기존/누락/위조/25종 후보 및 CMD 해시 정합성 검증. 로컬 테스트 통과는 실제 PC 성공 증거가 아니다.

## 다음 작업 순서

1. 사용자 CMD가 만든 R13 결과로 **ARKX/ROKT 원본 SHA 재검증 성공 여부**와 9종별 실측 공통 N을 확인.
2. 실제로 원자료가 빠진 ETF만 새로 bounded 무료 수집하도록 별도 수집 대상을 **결과에 따라** 준비. `UFO/NASA/ARKX/ROKT` 원본이 유효하면 재수집하지 않는다.
3. 실제 저장·SHA 재검증된 ETF를 개수 제한 없이 사용하되 `N>=40` 및 R2 구성값 완성을 먼저 요구. DIPR/WSPC는 유효 관측일이 40일 쌓이기 전까지 점수를 생성하지 않는다.
4. 기존 9개 운영 테마의 점수·차트·데이터 경로는 손대지 않는다. R4-A 상대 비중은 비공개 제안 상태로만 둔다. 기존 R9 2종 39.95701점은 새 바스켓 점수로 간주하지 않는다.
5. 자료 권리·라이선스/48시간 지연·공개 승인 후에만 신규 테마 배포 검토.
