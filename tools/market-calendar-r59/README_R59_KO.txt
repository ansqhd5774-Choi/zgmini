ZGMINI R59 — 연 1회 수동 재무건전성 결과 게시 (준비 패키지)

중요: 사이트의 R59 독립 연간 등급 읽기 코드가 Production에 배포되고 검증된 이후에만 사용합니다.
이 패키지는 설치 또는 예약 작업을 등록하지 않습니다. 기존 R58.3 SEC 수집/계산을 재실행하지 않습니다.

1. 새 빈 폴더에 압축을 해제합니다.
2. R58.3 결과 파일이 있던 PC 폴더를 확인합니다. 원본 PRIVATE_SHADOW.json은 이동/삭제하지 않습니다.
3. MARKET_CALENDAR_R59_PUBLISH.cmd를 한 번 실행하고 R58.3 압축 해제 폴더의 경로를 입력합니다.
4. MARKET_CALENDAR_R59_PUBLISH_RESULT.txt 하나만 공유합니다. PRIVATE_SHADOW.json은 업로드하지 않습니다.
5. 실패 또는 D1 결과 불명확 시 STOP. 무조건 재실행하거나 기존 파일을 삭제하지 않습니다.

운영 보호: 기존 SEC ZIP/SQLite 및 경제지표/실적 일정/예약 작업 변경 없음.
게시 데이터: 검증된 형식의 ticker, score, grade, 기준일만 포함 (원재무수치 미포함).
출력: 기존 유효 연간 등급 유지. 자동 갱신은 없으며 내년에 별도 수동 실행합니다.

현재 GitHub 작업 브랜치가 main과 크게 갈라져 있으므로, R59 코드만 선택적으로 main 반영하고
Cloudflare Git Integration 배포 검증 후 게시할 수 있습니다.
