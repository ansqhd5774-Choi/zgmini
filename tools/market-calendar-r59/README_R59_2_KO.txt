ZGMINI R59.2 — 2026-10-31, annual FHS-R3 manual publisher lock isolation fix

원인: R59.1은 Core 5분 정규 작업의 local-cycle.lock을 획득하려고 하다가 즉시 중단.
R59.1 R59_CORE_LOCK_BUSY_STOP 위치는 D1 원격 조회·쓰기 이전이므로 이번 실행 D1 쓰기 0건.
R59.2는 별도 일회성 annual-fhs-r3.manual.lock을 사용하며 기존 local-cycle.lock을 조회/해제/변경하지 않습니다.
프로그램은 기존 R58.3 개인 결과를 재계산하거나 API 수집하지 않습니다.

1. 이전 R59.1 결과 TXT, 기존 R58.3 PRIVATE_SHADOW 파일, PC Core lock은 모두 보존합니다.
2. 새로운 빈 폴더에 이 ZIP 전체를 해제합니다.
3. MARKET_CALENDAR_R59_2_PUBLISH.cmd를 한 번 실행합니다.
4. D1 읽기 -> 기존 저장본과 비교 -> 필요할 때 단일 연간 키만 저장 -> D1 재조회 확인.
5. MARKET_CALENDAR_R59_PUBLISH_RESULT.txt만 대화에 첨부. PRIVATE_SHADOW 파일은 업로드하지 마세요.
오류가 나면 재실행/파일 삭제 금지. 이전 데이터 및 기존 자동 작업은 건드리지 마세요.

LOCK 존재 시 R59_ANNUAL_PUBLISH_LOCK_BUSY_STOP, 원격 결과 불명확 시 재실행 금지.
산식 변경/자동 예약/배포/Cron/DB 구조 변경 없음.
