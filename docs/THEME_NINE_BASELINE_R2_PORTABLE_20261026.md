# 기존 9개 테마 — R1 실행 실패 및 R2 독립 PC 점검기

## R1 실제 제출 로그

- 사용자 PC 제출: `THEME_NINE_BASELINE_R1_RESULT.txt`, 5줄.
- `REPORT=THEME_NINE_BASELINE_R1_READ_ONLY`
- `ERROR=THEME_DATA_INVENTORY_SCRIPT_NOT_FOUND`
- **최초 실패 지점:** `theme-nine-baseline-r1.cmd`가 `%~dp0theme-data-inventory.mjs` 파일 존재를 검사하고 즉시 종료했다. PC에 배치된 `.cmd` 파일과 보조 `.mjs`의 **같은 폴더 배치**를 전제로 한 도구 사용성 결함이다.
- **원인 구분:** 스크립트 상대 위치 미충족은 확정. PC 실제 원자료의 부재나 스케줄러 장애는 **미검증**. 9개 테마 중 어떤 것도 데이터 결측으로 판정하지 않는다.
- **영향:** E: 데이터 파일 조회, manifest SHA, 4개 작업 조회 모두 시작 전에 멈춤. 공급자 GET·D1/파일·스케줄러 쓰기 없음.

## R2 수정 범위

`scripts/pc-writer/theme-nine-baseline-r2.cmd`는 **독립 CMD 한 파일**이다. Desktop에 단독 다운로드하여 실행해도 보조 `.mjs`, Git 체크아웃 또는 관리자 권한이 필요하지 않다. `%~dp0THEME_NINE_BASELINE_R2_RESULT.txt`에만 결과를 기록한다.

실행하는 **읽기 전용** 확인은 다음과 같다.

1. `E:\ZGmini\data` 및 승인된 하위 자료·기존 7개 운영 코드 파일·3개 후보 manifest의 존재, 크기, 수정일.
2. 저장 자료의 후보 디렉터리 5곳에서 파일명·크기·수정일만 조회. 각 디렉터리 **최신 12개**, 파일 수는 전체를 계산. 알려진 원본 부재 파일 `BIOTECH_PC_R3_LOCAL_PRICES.json`에 대한 반복 탐색은 하지 않는다.
3. `ai-semiconductor`, `biotech`, `data-center-power`의 기존 manifest 1차 메타데이터. **원파일 해시 검증이나 JSON 내용 기반 점수 계산이 아니다.**
4. Windows Task Scheduler 관련 기존 작업 4종 `schtasks /Query`. 이름·존재·상태의 실제 응답을 기록하되 추가/변경/삭제하지 않는다.

이 스크립트가 `STATUS=PC_METADATA_ONLY_NO_PUBLICATION`을 출력해도 **테마 원가격·출처 권리·원자료 SHA·원본 가격모드·실제 252일 재산출·D1 readback·정규 자동갱신** 완료를 뜻하지 않는다.

## 다음 게이트

`THEME_NINE_BASELINE_R2_RESULT.txt`를 받아 실제 PC에 존재하는 자료의 위치와 포맷을 기준으로, 9개에 필요한 **자동 실가격 수출/manifest 해시 검사**를 구현한다. 9개 원본 252일 비교 전에 가격 추정, 점수 복제, 공개 데이터 변경을 하지 않는다. 11번째 테마 착수는 사용자 승인된 9개 개편 완료 뒤로 유지한다.
