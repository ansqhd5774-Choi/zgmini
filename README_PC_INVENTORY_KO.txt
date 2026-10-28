BEA 제조업 기업이익 기존 원본 확인 — 읽기 전용 검사

1. 이 폴더를 통째로 Windows PC에 복사합니다.
2. RUN_BEA_MFG_PC_INVENTORY_READONLY.cmd를 더블클릭합니다.
3. 바탕화면에 생성되는 BEA_MFG_PC_INVENTORY_*.txt를 채팅에 올립니다.

필요 조건:
- 승인된 운영 PC의 E:\ZGmini\data\pc-writer 경로 접근 가능
- E:\ZGmini\runtime\node.exe 존재
- 환경변수 ZGMINI_PC_HOME, ZGMINI_NODE_EXE가 이미 지정되어 있다면 해당 값을 우선 사용

검사 내용:
- PC의 raw/ 및 manual-input/ 안에 N400RC 또는 N400RC1Q027SBEA 원본 CSV/JSON 후보가 있는지 확인
- 저장소의 SQLite 파일 존재 여부만 검사. DB 내용과 Excel 내용은 읽지 않음
- 파일 미발견은 원본 부재를 증명하지 않음

안전:
- Census API, 인터넷, D1, GitHub, Cloudflare 접속 없음
- 원본 파일과 운영 설정 및 DB를 수정하지 않음
- 예약 작업, 수집기, 배포 변경 없음
- 바탕화면에 결과 보고 TXT만 새로 생성
- 이 파일은 수집·게시기가 아니라 기존 원본 확인용

GitHub 작업 브랜치:
codex/api-site-integration-r1-20261026

검사 코드 기준:
ce9fdaca953376286a807d0ba76181c350d66a78
