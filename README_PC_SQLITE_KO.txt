BEA 제조업 기업이익 (N400RC) - PC SQLite 원장 읽기 전용 검사

기존 CSV/JSON 1,498개씩의 두 차례 검사에서 같은 지표를 찾지 못했습니다.
그러나 storage/core.sqlite 와 storage/history.sqlite 에서는 아직 확인하지 않았습니다.

1. 이 압축파일을 PC에서 압축 해제합니다.
2. RUN_BEA_MFG_SQLITE_READONLY.cmd 파일을 더블클릭합니다.
3. 바탕화면에 생긴 BEA_MFG_SQLITE_READONLY_*.txt를 이 채팅에 첨부합니다.

제약:
- E:\ZGmini\data\pc-writer\storage\core.sqlite 및 history.sqlite 만 조회합니다.
- 테이블/열/행 텍스트의 N400RC 문자열을 한정 검색합니다.
- 최대 DB당 100개 테이블, 테이블당 20,000행, 테이블당 24개 문자 열입니다.
- 결과에 원본 행 데이터, API 키, 개인 정보는 담지 않습니다.
- DB 열기는 읽기 전용, SQL 쓰기·수집·D1 저장·배포는 하지 않습니다.
- Node 런타임의 node:sqlite 지원이 없으면 읽기 실패로 보고합니다.
- 검색 결과 없음은 XLSX 및 다른 저장 경로까지 부재를 입증하지 않습니다.
- 프로그램이 검사 결과를 기록하는 TXT 외의 원본 데이터는 수정하지 않습니다.
