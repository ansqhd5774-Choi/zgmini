# R59 — R57/R58 PC 독립 실행 전달물 (2026-11-01)

## 목표

R56 FIX1으로 설치 완료 확인된 PC Core R45 비공개 저장본을 이용해 R43 ★★★ 후보와 사용자 검토 상위 132/100 참조 명단을 **기존 Core 외부에서 읽기 전용으로 평가**한다.

## 변경 파일

- `scripts/pc-writer/market-calendar-r59-r43-readonly-report.mjs`: R57 → R58 단일 진입점, 같은 R57 결과를 재사용해 중복 21일 파싱 방지, JSON 요약만 stdout 출력.
- `scripts/pc-writer/market-calendar-r58-r43-shadow-audit.mjs`: R59에서 검증된 R57 메모리 결과를 재사용하는 선택적 인수 추가.
- `MARKET_CALENDAR_R59_R43_READONLY.cmd`: 승인 `E:\ZGmini\runtime\node.exe`와 데이터 경로만 사용. Core 실행 또는 설치하지 않음.
- `README_MARKET_CALENDAR_R59_R43_READONLY.md`: 입력 준비 및 Windows 사용 설명.
- `tests/market-calendar-r59-r43-readonly-report.test.mjs`: 입력 부재와 21일+참조 목록 합성 입력에서의 전체 흐름 보호 테스트.

## ZIP 인수인계 범위

ZIP은 위 CMD·README와 의존 파일 `lib/market-calendar-r43-issuer-rank.mjs`, R57, R58, R59을 **저장소 상대 경로를 유지한 채** 포함해야 한다. PC 데이터와 실제 132/100 참조 명단, 영업/소스 기밀 자료는 포함하지 않는다.

- 전달 파일: `MARKET_CALENDAR_R59_R43_READONLY_PC.zip` (6개 파일, 13,392바이트).
- ZIP SHA256: `4832a03c3d0c2a2c80f854bddfcba7caa22ce36cf625a6ade38048e49bb323c7`.
- `unzip -t` 검사에서 6개 파일 전부 정상, CMD는 ASCII/CRLF/BOM 없음.
- ZIP 자체는 전달물이고, GitHub에 기록하는 원본은 개별 코드·CMD·README·테스트·이 문서다. ZIP 제공만으로 PC 실행·실데이터 PASS가 아니다.

실행 결과 TXT는 **압축 해제 폴더에만 한 개 기록**하고 같은 파일명으로 재실행 시 갱신한다. `E:\ZGmini\data\pc-writer`에 로그·진단·공개 등급 파일을 작성하지 않는다. 원본 R45 파일은 read only.

## 상태 구분

- `CODE_READY`: R59 코드·합성 테스트 및 지정 브랜치 반영 확인 시.
- `DELIVERY_READY`: ZIP 실제 생성과 내부 상대 경로/인코딩/해시 검증 시.
- `PC_EXECUTED`: 사용자가 PC에서 CMD를 실제 실행하고 결과를 제공했을 때만.
- `READY_AUDIT`: 21거래일 R45 파일, 승인 전체 기업 목록, 사용자 검토 132/100 참조가 유효해 실제 비교가 완료됐을 때만.
- `PUBLIC_ACTIVE`: 별도 승인·운영 설치·사이트 검증이 끝난 뒤에만. 이번 R59 대상 아님.

## 제약

- 2026-10-31에 알려진 77.3%(102/132)·81.1%(107/132)는 과거 500개 표본 참고 실험이다. R59 합성 테스트 통과를 실전 일치율 PASS라고 보고하지 않는다.
- 503개 B1 저장 이력을 약 2,634개 적격 전체 기업의 대용으로 사용하지 않는다. MarketParquet 확정치 전체 약 6,500개 수집 경로는 기존 승인 범위로 보존한다.
- 신규 API, 과거 데이터 재수집, PC Core 5분 스케줄 조정, 디버그 파일 대량 생성, 임의 예외 확장, 공개 등급 변경, `main` 반영, Cloudflare 배포 모두 금지.
