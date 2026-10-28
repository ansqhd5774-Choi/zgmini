BEA 제조업 기업이익: 압축 원본/기존 API 이력 중복 검사

1. 이 ZIP을 압축 해제합니다.
2. RUN_BEA_MFG_COMPRESSED_READONLY.cmd를 더블클릭합니다.
3. 바탕화면의 BEA_MFG_COMPRESSED_READONLY_*.txt를 채팅에 첨부합니다.

R3 SQLite 첫 20,000행 검색에서 일치 0건이었지만 행 제한에 걸렸습니다.
GitHub 운영 코드를 확인한 결과, core.sqlite의 market_input_batches_v1
본문은 gzip + base64로 압축될 수 있어서 단순 문자열 검색으로 누락됩니다.

이번 검사는 두 SQLite를 읽기 전용으로 열고, 기존 API 이력의
dataset 식별자와 최근 macro/BEA/earnings 입력의 압축 본문을 조회합니다.
원본 행·API 키·비밀번호 등은 보고하지 않습니다.
원본 수집·수정, SQL 쓰기, D1 쓰기, 배포를 하지 않습니다.

읽은 입력은 일부 최신 범위 표본입니다. 일치 0건이라도
다른 저장소나 과거 전체 원본까지 없다고 단정하지 않습니다.
