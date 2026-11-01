ZGMINI 고용 R6 — 최근 3개월 우선 수집 R4 (독립 후보 DB)

기준 저장소: ansqhd5774-Choi/zgmini
고정 작업 브랜치: codex/employment-1y-reader-r1

목적
- 앞선 PC 점검에서 원천 데이터가 없던 고용 20개 지표(원천 18개 계열)의
  최근 자료를 무료 공공 API로 우선 확보한다.
- 이미 저장된 지역 확산 2개 지표 및 BED 6개 지표는 이번 단계에서 재수집하지 않는다.
- 기존 Core 5분 작업의 실행기, 잠금, 예약 작업 및 PC 승인 소스는 건드리지 않는다.

실행
1. ZIP 전체를 일반 작업 폴더에 압축 해제한다.
   E:\ZGmini\data\pc-writer\ 이하의 운영 데이터 폴더에 압축 해제하지 않는다.
2. scripts\pc-writer\employment-r6-recent-stage.cmd 를 한 번 실행한다.
3. 같은 폴더에 자동 생성되는 아래 두 결과 파일을 채팅에 첨부한다.
   EMPLOYMENT_R6_RECENT_STAGE_RESULT.txt
   EMPLOYMENT_R6_RECENT_STAGE_RESULT.json
4. 이전 실행에서 생성된 EMPLOYMENT_R6_CANDIDATE.sqlite 는 계속 재사용한다.
   별도 승인된 이전/복구 절차 없이 운영 core.sqlite와 합치지 않는다.

파일 역할
- employment-r6-recent-stage.cmd : 사용자가 실행할 단계별 CMD 진입점
- scripts\resolve-local-node.cmd : 기존 공통 Node 탐색기, 직접 실행할 필요 없음
- employment-r6-recent-stage.mjs : 공급자 수집 및 후보 DB 저장 프로그램
- EMPLOYMENT_R6_CANDIDATE.sqlite : 수집 원자료/관측 이력을 저장하는 후보 DB 한 개

보호 범위
- PC core.sqlite : 읽기 전용. 새로운 테이블 생성/스키마 변경/관측 데이터 쓰기 0.
- 수집은 CMD 옆에 있는 후보 DB에만 저장한다. 운영 E: 데이터 폴더에는 쓰지 않는다.
- D1/Cloudflare 게시, 산식·가중치 수정, 1년 차트 변경, 작업 예약 등록 0.
- 공공 BLS 3회와 미국 노동부 DOL 2회가 예정된 최대 일반 요청 수다.
  이미 같은 발표를 후보 DB에 성공적으로 수집한 경우 자동 건너뛰기를 허용한다.
- 같은 ZIP을 반복 실행하면 결과 TXT·JSON은 최신 실행 내용으로 갱신되고,
  후보 DB는 유지되어 매 실행마다 파일이 늘어나지 않는다.
- Windows Node 24 이상, 공공 데이터 공급자 접속이 필요하다.

결과의 의미
- CANDIDATE_SOURCE_ROWS_COLLECTED: 후보 DB에서 대상 원천 계열의 저장 확인.
  운영 PC 반영·10년 기준 산식 충족·점수 계산·1년 차트 출력 성공을 뜻하지 않는다.
- PARTIAL_CANDIDATE_ONLY: 일부 자료 또는 공급자 응답이 부족하다.
- SOURCE_FAILED / AUTOMATION_BLOCKED: 수집기 또는 사전 조건 실패.
- 사용자가 결과 파일을 올리면 공급자별 부족 계열을 확인하고 다음 단계를 정한다.

운영 PC DB에 직접 쓰거나 R6 전용 테이블을 생성하는 단계는 별도 승인과
실제 PC 승인 소스/작업 충돌 확인 후에만 진행한다.
