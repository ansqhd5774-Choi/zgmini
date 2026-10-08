# 이란 종전 진전도 R1.4 수집 자동화

기준 main: `8587ec8800075524e37e0fae80bc98e59c2379e5`. PR #181의 필요한 신규 모듈을 개별 회수했으며 연구 브랜치를 병합하지 않았다.

## 실행 계약

`node scripts/iran-progress/collect-r14.mjs --max=48`은 PC 수집만 수행한다. AIS 허용 필드, MARAD Alerts/Advisories, IAEA 피드, 원본 GDELT Events 후보를 저장하며 점수 계산·사건 VERIFIED 승격·D1 게시를 수행하지 않는다. UKMTO 403 경로와 GDELT DOC의 기존 제한 요청을 반복하지 않는다.

`node scripts/iran-progress/install.mjs --collection-only`는 실제 수집 결과와 SQLite checkpoint read-back이 확인된 경우에만 기존 이름 `ZGMINI-PC-Iran-Progress-R13`으로 수집 작업을 새로 등록한다. 기존 작업을 덮어쓰지 않는다. KST 00/06/12/18시, 중복 실행 IgnoreNew, 로그인 사용자, PC 깨우기 없음. Core/Korea 작업은 변경하지 않는다. 기본 READY 게시 설치 조건은 유지한다.

수집 슬롯은 성공 완료 후에만 완료 처리한다. 실패한 슬롯은 재개 가능하며 HTTP 429는 별도의 최소 6시간 cooldown을 유지한다. SQLite lease와 기존 cursor를 사용한다. GDELT 원본 ZIP은 checksum 확인 후 PC 전용 `gdelt-archives`에 저장하며 후보·메타데이터·cursor는 한 SQLite transaction으로 확정한다. DB 쓰기 실패 뒤에는 저장된 ZIP을 검증하여 재사용한다. 이전에 ZIP 없이 메타데이터만 저장한 구간은 재다운로드하지 않는다.

`node scripts/iran-progress/inspect-r14.mjs`는 SQLite와 작업 XML을 읽기 전용으로 확인한다. 원문·인증정보를 출력하지 않는다.

## 실제 확인과 남은 조건

- 최초 checkpoint 재조회: 이전 8구간 실행 성공, 백필 9개 저장 확인. 이어서 미완료 1구간을 실행한 후 bounded chunk로 전진했다.
- 실제 MARAD 목록 파싱: 과거 공지 후보 10개. 현재 활성 공지가 없다는 사실을 공격 0건으로 해석하지 않는다.
- 작업 스케줄러 수동 실행 1회: 48구간 전진, SQLite 저장 read-back, 프로세스 종료 결과 0 확인.
- 산식·가중치·원격 DB 스키마·UI·Cloudflare 배포·DNS 변경 없음.
- 28일 백필은 진행 중이다. 파일별 후보 저장은 완전한 사건 관측·독립적인 공격 확인을 의미하지 않는다.
- D/C/N의 공식 검증 입력, M/H의 완전한 관측 및 사건별 교차 검증, H의 AIS upstream 권리와 일별 품질은 아직 미충족이다. 실제 VERIFIED 사건과 READY 게시 결과를 만들었다고 보고하지 않는다.
- hormuz.now 자체 데이터의 CC BY 4.0 상업 이용 문구는 확인했지만 upstream AIS 권리 확인을 대신하지 않는다. IMF 및 간접 파생 필드는 계속 제외한다. 문의·유료 서비스·접근 우회는 수행하지 않는다.

공식 근거: https://hormuz.now/data , https://hormuz.now/methodology , https://gdeltproject.org/about.html , https://www.maritime.dot.gov/msci-alerts .

`node scripts/iran-progress/publish-status-r14.mjs --publish`는 저장된 입력이 PENDING일 때 상태만 게시하고 D1 read-back을 검증한다. READY 결과 점수 게이트를 우회하지 않는다. 2026-10-09 실제 게시 결과: PENDING/null, D/C/M/H/N 미충족, 상태 게시 VERIFIED. 실제 READY 점수의 게시가 아니다.

검증: 이란 관련 회귀 검사(수집·AIS·산식·검증·게시·뷰 계약). 로컬 테스트와 실제 PC 저장/스케줄 실행 증거는 구분한다. main 병합·Cloudflare 배포·Production READY 운영 검증은 미실행이다.
