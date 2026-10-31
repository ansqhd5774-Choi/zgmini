ZGMINI 미국 시장 등락종목 수 - 기존 21시 자동 작업 R8 개선

R8.1: Windows에서 따옴표로 감싼 폴더 경로 뒤의 역슬래시 인수
해석 문제를 수정했습니다. 실행기는 파일 자신의 위치를 기준으로 작업합니다.

확인된 사실: R7은 2026-10-30 S&P500 503종목 상승226/하락277을
PC에 수집하고 D1 readback VERIFIED를 받았습니다.

R8은 별도의 새 예약 작업을 만들지 않습니다.
기존 ZGMINI-PC-US-Breadth-R1의 21:00 예약 시간과 작업 XML을 유지하고
해당 작업에서 읽는 us-scheduled.mjs 파일 하나만 안전하게 교체합니다.
이전 R4 파일은 us-scheduled.r4-backup.mjs로 보존합니다.
수집기에서 SKIPPED_ALREADY_SUCCESS가 발생해도 최신 거래일이 없으면
기존 승인 수집 함수를 한 번 더 호출하고, 적격률 감사 후에만 게시합니다.

실행:
1. ZIP을 새 쓰기 가능한 폴더에 전부 압축 해제하세요.
2. PC 로컬 시간 20:45~21:15 및 자동/Core 수집기 실행 중에는 시작하지 마세요.
3. US_BREADTH_PC_R8_AUTO_UPGRADE.cmd를 한 번 실행하세요.
4. 같은 폴더의 US_BREADTH_PC_R8_AUTO_UPGRADE_RESULT.txt를 전달하세요.

RESULT=INSTALLED_OR_ALREADY_R8 / INSTALL=R8_FILE_SWITCH_VERIFIED이면
업그레이드 파일을 설치했다는 뜻이며 실제 다음 예약 실행은 아직 미검증입니다.
RESULT=BLOCKED_OR_PARTIAL이면 반복 실행/잠금 삭제/수동 파일 교체를 하지 마세요.
기존 Core/Korea/Iran 작업과 PC SQLite, D1, GitHub main, DNS는 변경하지 않습니다.
