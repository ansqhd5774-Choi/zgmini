ZGMINI 테마 공통 도구 — 자동 게시 모듈 1회 전환 (Windows CMD)

1. 이번 작업의 목적
- 기존 ZGMINI-PC-Configured-Themes 예약 작업은 그대로 둡니다.
- 기존 E:\ZGmini\data\pc-writer\theme-config-tool의 새 불변 버전을 준비하고
  THEME_SCHEDULED.cmd 한 개만 기존 검증된 전환기로 교체합니다.
- 원자료·체크포인트·기존 점수·공개 10개 테마·R32 산식·13:00 예약 시각은 바꾸지 않습니다.
- 테마 등록, 수집, D1 실제 게시, GitHub 반영, Cloudflare 배포는 실행하지 않습니다.

2. 준비 상태
- 이 ZIP은 검증된 GitHub 소스 커밋의 실행 파일을 담은 패키지입니다.
- 실제 Windows PC 전환은 아직 확인되지 않았습니다: WINDOWS_PACKAGE_RUNTIME_UNVERIFIED
- PC가 켜져 있고 E: 드라이브에 접근 가능해야 합니다.
- E:\ZGmini\runtime\node.exe와 기존 공통 도구 설치본이 있어야 합니다.
- ZIP은 새 빈 폴더에 완전히 압축 해제하세요. ZIP 안에서 CMD를 실행하지 마세요.
- 전달된 패키지 SHA-256을 ZIP 파일에 대해 대조하려면 CMD에서
  certutil -hashfile "다운로드한 ZIP의 전체 경로" SHA256
  을 이용할 수 있습니다. 실제 전달된 SHA와 일치하지 않으면 실행하지 마세요.
- package-manifest.json과 ZIP 내부 파일들의 SHA 일치는 파일 무결성만 확인합니다.
  출처 확인은 전달된 ZIP SHA 및 GitHub 고정 커밋과 별도로 대조해야 합니다.

3. 첫 실행 — 읽기 전용 PREFLIGHT (정확히 1회)
- 새 빈 폴더에 압축 해제한 후 RUN_PREFLIGHT.cmd를 더블클릭합니다.
- 입력은 없습니다. 결과 창을 확인한 뒤 아무 키나 눌러 닫습니다.
- 같은 폴더에 생성된 PACKAGE_RESULT.txt에서 PREFLIGHT_STATUS=PREFLIGHT_PASS를 확인합니다.
- 이 단계에서는 PC 운영 파일이나 예약 작업을 변경하지 않습니다.
- STOP 또는 예상하지 못한 내용이면 INSTALL을 실행하지 말고 결과 파일을 전달하세요.

4. 두 번째 실행 — INSTALL (PREFLIGHT PASS일 때만 정확히 1회)
- 운영 중인 테마 수집/계산 작업이 없는 안전한 시각에 RUN_INSTALL.cmd를 더블클릭합니다.
- 입력은 없습니다. 결과 창을 확인한 뒤 아무 키나 눌러 닫습니다.
- PACKAGE_RESULT.txt에 INSTALL_STATUS=CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED,
  TASK_XML_UNCHANGED=YES, BACKUP_PATH 및 NEW_CMD_SHA256이 있어야 합니다.
- 기존 AUTO_PUBLISH_UPGRADE_RESULT.json은 설치본 폴더에 생성됩니다.
- 예약은 계속 매일 PC 현지 13:00이며, 현재 실행이 새 테마를 수집/게시하지는 않습니다.

5. 즉시 중단(STOP) 조건
- SHA 불일치, Node/패키지 파일 누락, GitHub 소스 SHA 불일치
- 기존 설치 manifest 또는 CMD/VBS 변경, 예약 XML 불일치
- 예약 작업 실행/대기/비활성, 예약 잠금 또는 테마 수집 잠금
- 이전 업그레이드 결과 파일 존재, PREFLIGHT 이후 상태 변경, 권한/파일 접근 실패
- INSTALL에서 STOP/복원 상태 불명확/창이 예기치 않게 닫힘

6. 금지 행동
- RUN_PREFLIGHT.cmd 또는 RUN_INSTALL.cmd를 같은 압축 해제 폴더에서 두 번 실행 금지
- STOP 후 임의 재실행, 잠금·기존 로그·checkpoint·백업 삭제 금지
- 작업 스케줄러 수정, 프로세스 강제 종료, E: 원본/기존 도구 덮어쓰기 금지
- CMD 수정, 수동 D1 게시, GitHub/main 병합, 사이트 배포 금지
- 사용자 암호, API 토큰, .env 파일을 이 패키지에 복사하거나 채팅에 보내지 마세요.

7. 결과 회신
- 압축을 푼 폴더의 PACKAGE_RESULT.txt 한 개를 전달하세요.
- 실패했다면 같은 파일과 오류 화면의 상태 코드만 알려주세요.
- 전체 원자료/키/토큰, 기존 INSTALL_RESULT.json 전문은 보내지 마세요.
- 다음 정규 예약 실행 검증과 사이트 공개 연결은 별도 단계입니다.
