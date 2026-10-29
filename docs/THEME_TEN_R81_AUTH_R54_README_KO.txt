ZGMINI R81 — 기존 R54 인증 게이트 복구 및 공개 재검증

근거: THEME_NINE_R54_CYCLE_31692_31956.txt
  STOP_R54_PUBLIC_CONNECTION / PC_WRANGLER_REAUTH_REQUIRED
  R80 게시기 수정은 이미 정상 설치되었고, R54는 D1 접근 전 중단됨.

R54의 구형 R7 Wrangler 인증 탐색기 대신, 이미 바이오 R8에서
검증된 원래 7개 테마의 인증 경로만 재사용합니다. 새 API 키를 만들거나
토큰·개인정보를 화면/로그/파일에 출력하지 않습니다. 인증 경로가
실제로 동작하지 않으면 기존 R54 파일을 교체하지 않고 STOP합니다.

파일 변경 범위: 운영 PC의 theme-nine-r54-public-connect.mjs 1개.
  기존 예상 SHA 195332100e32473c59c4820d8961de2dd7cac978b7f87b782cfa968c737f6b77
  수정 파일 SHA e65bb10399acc5dc017f5241624a2fa29c82c34b42f4424dbfb3cf04a9c0e55b
  이미 설치된 R80 D1 파일 SHA 7a10fe41710dbc1a21c9f3e343c538cd96b6c5695b683f04dce48af85ede6e7e
  승인 기존 R8 인증 파일 SHA 9b1f952f720abe0d6e631ad8fac908cfd51b00575690e9abea8cd09f1a6a4bd3

실행 방법 (1회만):
1. 압축파일을 Windows PC 새 폴더에 풀어주세요.
2. 한국시간 10:55~14:35 보호 구간 외에서
   THEME_TEN_R81_AUTH_R54_ONCE.cmd 파일을 한 번 실행하세요.
3. 같은 폴더의 THEME_TEN_R81_AUTH_RESULT_*.txt 하나를 첨부하세요.

사전 SHA·R48 날짜·기존 10개·승인 동의·private lock·현재 API를 확인하고,
원래 7개 승인 인증이 유효하면 R54 파일만 백업 후 교체합니다.
그 후 기존 R54만 정확히 1번 호출하여 D1 및 공개 R37 API를 재검증합니다.
기존 R80 파일/산식/ETF/원자료/예약 작업/신규 테마 변경 0건.

STOP이더라도 다시 실행하지 마세요. 결과 파일 1개만 첨부하세요.
우주·위성과 데이터센터·전력의 10/27·28 원본 수집 누락 및 다음
정규 예약 실행은 별도로 검증해야 하며, 이 CMD만으로 완료가 아닙니다.
