ZGMINI 시장 캘린더 R51 — Alpaca 누락 주가 소량 수집 (Windows CMD)

대상: E:\ZGmini\data\pc-writer
실행 Node: E:\ZGmini\runtime\node.exe
기존 운영 R10 파일 / SEC / SQLite / D1 / 사이트 / 예약 작업은 변경하지 않습니다.
이번 패키지는 약 2,394개 누락 티커의 1회 제한적 수집을 위한 도구입니다.
개발 코드와 패키지 준비 완료는 PC 수집 성공을 뜻하지 않습니다.

1. ZIP을 새 빈 폴더에 압축 해제합니다. 기존 E:\ZGmini 폴더에 덮어쓰지 마세요.
   이전 R51 패키지 폴더와 섞지 마세요. R51 신규 원본/계획은 PC 원래 저장소에 보존됩니다.
2. 같은 폴더의 MARKET_CALENDAR_R51_PREFLIGHT.cmd 를 정확히 1번 실행합니다.
   입력할 내용은 없습니다. 기존 E:\ZGmini\data\pc-writer\providers.env를 읽기만 합니다.
   정상 상태: STATUS=R51_PLAN_STAGED 또는 R51_EXISTING_PLAN_VALID
3. 생성된 MARKET_CALENDAR_R51_PREFLIGHT_RESULT_*.txt를 확인합니다.
   이 파일이 없다면 MARKET_CALENDAR_R51_PREFLIGHT_LAUNCH_RESULT.txt를 확인합니다.
   오류/STOP이면 다음 단계를 실행하지 말고 그 결과 TXT만 전달하세요.
4. PREFLIGHT 정상일 때 MARKET_CALENDAR_R51_COLLECT_ONCE.cmd 를 정확히 1번 실행합니다.
   최대 120개 티커, 최대 12번 Alpaca API 요청, 로컬 새 폴더에만 저장합니다.
   정상 상태: STATUS=R51_BATCH_STORED. 추가 실행은 결과 확인 뒤 안내에 따라 진행합니다.
5. MARKET_CALENDAR_R51_COLLECT_RESULT_*.txt만 대화에 첨부하세요.
   이 파일이 없다면 MARKET_CALENDAR_R51_COLLECT_LAUNCH_RESULT.txt를 첨부하세요.

R51 수정 R2: CMD가 Node로 전달하는 출력 경로의 말단 역슬래시 인용 문제를 방지했습니다.
Node 실행 전부터 실행 폴더에 *LAUNCH_RESULT.txt를 반드시 먼저 생성하고 오류를 기록합니다.
기존 PLAN이 이미 생성됐다면 PREFLIGHT 정상 상태가 R51_EXISTING_PLAN_VALID일 수 있습니다.

STOP: HTTP 429/403, 가격 응답 오류, 패키지 파일 누락, 계획 SHA 오류,
실행 락 존재, 기존 가격 파일 스캔 미완료, 기존 R51 파일 손상.
STOP 후 임의로 재실행/삭제/잠금 해제/설치/스케줄러 변경하지 마세요.
비밀키/개별 종목 가격/원자료 파일은 전송하지 마세요.
R51 결과가 성공해도 시가총액·중요도 별표·운영 자동 갱신은 아직 반영되지 않습니다.
