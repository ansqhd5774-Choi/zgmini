R34 IAEA 최신 성명 자동 후보 수집 보완 (2026-10-28)

대상: 기존 7개 출처 중 IAEA 뉴스 및 IAEA 사무총장 성명.
기존 dgstatements RSS는 2026-09-14까지만 반환하지만, IAEA 공식 홈페이지에는
2026-10-27 안보리 성명과 2026-10-23 유엔총회 성명이 이미 공개돼 있습니다.

R34는 공식 홈페이지에서 기사 URL을 추가로 발견합니다.
RSS 날짜, 홈페이지 제목만으로 승인하지 않고 R25가 제목/발행일/본문/이란 주제/
최근 30일 조건을 다시 검사한 뒤 승인되지 않은 비공개 후보 메타데이터로 저장합니다.

실행:
 1. ZIP 전체를 새 폴더에 압축 해제합니다.
 2. R32가 정상 설치된 기존 PC에서 IRAN_NEWS_R34_RECENT_IAEA_INSTALL.cmd를
    정규 6시간 작업 시각(00/06/12/18시 KST) 전후 25분 밖에서 한 번 실행합니다.
 3. 생성된 IRAN_NEWS_R34_INSTALL_AND_COLLECT_RESULT.txt만 공유합니다.
    예전 R33 HTML 2개를 저장할 필요가 없습니다.

기능:
 - 사용자 PC에서 확인된 R32 파서 중 R24 뉴스 탐색 모듈 한 개만 SHA 검증 후 교체.
 - 교체 이전 파일은 .before-iran-news-r34로 배타적 백업.
 - 10/27 원문 기사 GET 및 메타데이터 실측. 403이면 자동 수집 성공 아님.
 - 10/27 원문 실측 성공 시에만 한 번 비공개 후보 파일을 수집/read-back.
 - 기존 예약 작업을 실행하거나 변경하지 않습니다. D1, R3/R5 점수, UI, 번역,
   공개 뉴스 10건, 게시 승인/저작권 검토 상태를 변경하지 않습니다.
 - 설치/조회/저장 불확실 시 재실행하거나 백업을 삭제하지 않습니다.

사무총장 공식 기사:
 2026-10-27 https://www.iaea.org/newscenter/statements/director-general-statement-to-the-united-nations-security-council
 2026-10-23 https://www.iaea.org/newscenter/statements/director-general-statement-to-81st-session-of-the-un-general-assembly

IAEA 일반 뉴스는 공식 홈페이지 링크를 추가로 읽되 이란 적격 기사 부재를
성공으로 가장하지 않습니다. 7/7 및 공개 27건을 선언하지 않습니다.
