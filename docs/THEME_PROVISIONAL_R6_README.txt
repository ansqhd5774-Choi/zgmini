ZGMINI 테마 잠정치 R6 / 기존 저장 데이터 가격 보정 방식 점검

1. ZIP 안의 CMD와 MJS 두 파일을 같은 폴더(권장: 바탕화면)에 압축 해제합니다.
2. THEME_PROVISIONAL_R6_PRICE_BRIDGE.cmd 를 더블클릭합니다.
3. 같은 폴더에 자동 생성된 THEME_PROVISIONAL_R6_PRICE_BRIDGE_RESULT.txt 를 이 대화에 첨부합니다.

기존 E:\ZGmini\data 와 설치된 Node, 기존 Parquet 모듈만 읽습니다.
2026-10-23 저장된 원본 시세의 SHA를 검사하고, 2026-10-26 실측 데이터와 비교합니다.
기존 R188/R32 산식, ETF 선정, 이전 252일 이력, 권한 상태는 변경하지 않습니다.
사이트 배포, D1 수정, 스케줄 변경, 자료 수집, 별도 프로그램 설치는 하지 않습니다.

핵심 결과 필드:
  POWER_NEXT_GATE : 데이터센터·전력 3개 가격 연결 가능 여부
  SPACE_NEXT_GATE : 우주·위성 가격 연결 후 산식 확인 진행 가능 여부
  SPACE_NO_2026_10_26_ETF_ROW : 26일 실측치가 없는 ETF (WARP 예상)
  R6_STATUS : R7 잠정 점수 계산 검토 가능 / 차단 여부

참고: READY 판정은 공개·자동발행 승인이나 잠정 점수 계산 완료를 의미하지 않습니다.
