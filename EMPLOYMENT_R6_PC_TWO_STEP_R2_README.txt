ZGMINI 고용 R6 - PC 1년 데이터 수집 및 연결 검증 R2

중요
- 압축을 기존 운영 프로젝트와 다른 별도 폴더에 풉니다. 운영 소스 덮어쓰기 금지.
- 기존 5분 Core 작업과 Korea 예약 작업은 그대로 유지합니다.
- 두 단계 모두 승인된 core.sqlite는 읽기 전용입니다.
- 이 독립 패키지에서는 PUBLISH 옵션을 실행하지 마세요.

1단계 - 빠진 BLS/DOL 원자료를 별도 수집 DB에 저장
Windows CMD에서 실행:
  scripts\pc-writer\employment-r6-recent-stage.cmd

CMD와 같은 폴더에 생성되는 결과:
  EMPLOYMENT_R6_RECENT_STAGE_RESULT.txt
  EMPLOYMENT_R6_RECENT_STAGE_RESULT.json
  EMPLOYMENT_R6_CANDIDATE.sqlite

2단계 - 기존 Core와 별도 DB를 함께 읽어 1년 차트를 검증
두 DB 모두 쓰지 않고 조회만 합니다. Windows CMD에서 실행:
  scripts\pc-writer\employment-r6-one-year-display.cmd STAGE

CMD와 같은 폴더에 생성되는 결과:
  EMPLOYMENT_R6_ONE_YEAR_<timestamp>.txt
  EMPLOYMENT_R6_ONE_YEAR_<timestamp>.json

1단계 및 2단계 결과 TXT/JSON만 전달해 주세요.
SQLite DB와 인증정보/비밀번호는 첨부하지 마세요.

2단계는 검증 전용이며 공개 게시가 아닙니다.
Cloudflare D1, 예약 작업, 운영 소스, 배포 설정을 변경하지 않습니다.
결측값을 만들어 채우지 않으며 1년 차트 확보가 10년 산식 점수 READY를
뜻하지는 않습니다.
