ZGMINI R10 PC Core 실행 경로 보완 진단 R3

목적: R2의 STOP_TASK_LAUNCHER_MISMATCH가 경로 이전/junction/실제 예약 작업 경로 차이로 발생한 것인지 확인합니다.

실행:
1. 압축을 새 폴더에 풉니다.
2. ASSET_R10_AUTO_PC_LAUNCHER_READONLY_R3.cmd 한 번 실행합니다.
3. 생성된 ASSET_R10_AUTO_PC_LAUNCHER_R3_RESULT_*.txt를 채팅에 첨부합니다.

읽기 전용: PC 설정, 원자료, D1, Git, 예약 작업, 게시 과정, 키를 변경하지 않습니다.
실행 중 다른 작업을 중단하거나 Core task를 재등록하지 마세요.
최종 상태가 STOP_*이어도 자동 복구/반복 실행하지 마세요.
주의: 실행 경로는 C: junction이면 [USER]로 사용자 이름을 감추어 기록합니다.

R2의 mismatch만으로 예약 작업을 재설치하거나 소스 SHA를 수정하지 않습니다.
