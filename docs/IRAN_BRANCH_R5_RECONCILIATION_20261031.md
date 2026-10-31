# 이란 뉴스 작업 브랜치 회수 — 2026-10-31

## 기준과 금지 범위

- **지속 개발 원본:** `codex/outbreak-iran-news-retention-r1-20261026` (`f76abf42dd7faaf0305baffa802238d1a8fcc4ea`에서 시작).
- **임시 배포/우회 작업 출처:** `codex/iran-news-analysis-deploy-r1-20261029` (`571e2ad5caa644494fd604b95bc16d7b246fd3fe`를 대조).
- 두 브랜치는 공통 조상 이후 크게 갈라졌다. **전체 merge, 기존 파일 통째 교체, 임시 배포 브랜치에서 지속 개발, `main`/D1/PC/운영 배포** 모두 이 회수 범위 밖이다.
- 원본의 R41 출처 11종, R51 읽기 검증, R52 사전진단, R53 스키마 확장, R54 게시, R55 복구·기사 배제 관련 파일은 그대로 남긴다.

## 회수한 R5 작업

임시 브랜치에서 신규 진행한 `0771d20`, `542985c`, `6b3257e`, `37a7ee5`, `4d7a728`, `90b4776`, `00c7070`, `fdbfa86`, `571e2ad5` 작업을 추적했다.

- 영문 R41 기사 권한·증거 검증 및 원문에 존재하는 인용문 확인: `news-r41-english-score-evidence-r1.mjs`, `news-r41-source-rights-r1.mjs`, `news-r41-auto-interpret-r1.mjs`와 R26 증거 수집 의존성.
- 안전한 Tasnim 페이지 구조 진단과 단일 `div.story` 문단 추출: `tasnim-html-shape-r1.mjs`, `tasnim-english-body-r2.mjs`.
- R1~R5 단계별 그림자 검증: `english-score-preview-r1.mjs`~`r5.mjs`, `english-score-bound-quote-r3.mjs`, 대응 Windows CMD 6개.
- 독립적인 게시 뉴스 입력 계획·중복 보류: `score-news-input-r1.mjs`, `published-news-score-input-r1.mjs`, `published-event-r1.mjs` 및 필요한 의존성. **이 모듈을 원본의 운영 R5 계산기나 자동 작업에 연결하지 않았다.**
- 원본 `reference-flow-r3.mjs`의 **사망자 우선 공격 제목 인식 조건 한 곳**에만 소규모 변경. 기존 `MILITARY_ATTACK=-12`와 다른 규칙·가중치·출처 허용 목록은 그대로다.
- R1~R5, Tasnim, 게시 뉴스 관련 신규 테스트 11개와 R5 원클릭 배포 패키지 소스(`RUN_IRAN_ENGLISH_R5_ONE_CLICK.cmd`, `README_R5_ONE_CLICK.txt`, `tools/iran-r5-oneclick-setup.mjs`).

## 충돌 해결과 보류 근거

1. 원본의 `lib/iran-progress/news-metadata-r41.mjs`에는 이미 11개 출처가 있으므로 임시 브랜치의 구버전 메타데이터 파일로 교체하지 않았다.
2. 원본 `scripts/iran-progress/operate-r5.mjs`에는 `R5_SOURCE_COLLECTION_UNREADY`라는 필수 수집·신선도 검증이 존재한다. 임시 브랜치의 운영 연결을 그대로 복사하면 이 검증과 오래된 이력/중복 계약이 달라진다. **운영 점수 계산기·자동 수집기에는 신규 입력을 연결하지 않았다.**
3. 임시 브랜치의 기존 뉴스 분석 공개 UI·게시 모듈 등 다른 개발 흐름, 원본에서 삭제/교체된 파일은 이 R5 회수에 포함하지 않는다. 이들은 원본의 R51~R55 운영 코드를 덮어써서는 안 되는 독립 범위다.
4. 다른 계산기 구성을 가정했던 신규 테스트 3개는 기능을 삭제하거나 PASS를 위조하지 않고, 원본 승인 계약에 맞춰 **그림자 입력 보존, 중복 차단, 원본 운영 게이트 유지**를 검증하도록 수정했다.
5. Windows 원클릭 도구의 소스 코드는 보관하지만, 배포용 ZIP 구성·PC 설치 실행·로컬 Ollama 실제 결과는 별도 검증 대상이다. 코드 반영만으로 R5 자동 점수 연결을 완료했다고 판정하지 않는다.

## 검증 및 향후 작업

- 신규 R5 회귀 테스트: 이식한 11개 테스트 파일 PASS. 파일 본문은 출처 Git tree SHA와 직접 비교해 가져온 38개 파일 모두 일치함을 확인했으며, 변경된 테스트는 차이 검토 후 별도 검증했다.
- 원본 R51·R52·R53·R54·R41·뉴스 표시·기존 R5 게이트 회귀: 11개 파일 PASS.
- 전체 `tests/iran-*.test.mjs` 109개 파일 중 **105 PASS, 4 FAIL**. 실패 중 `iran-news-d1-once-r42`, `iran-news-upgrade-r35`, `iran-news-upgrade-r38`은 `f76abf4` 원본 **무변경 별도 작업본에서 동일하게 재현**(각각 기존 R42 기대값/공개 응답, R35/R38 패키지 해시 드리프트). 병합으로 생긴 실패로 판정하면 안 된다.
- 네 번째 `iran-r5-summary-direction.test.mjs`는 테스트 실행 환경의 `typescript` 패키지 부재(`ERR_MODULE_NOT_FOUND`)로 차단. 이 결과는 기능 자체의 PASS가 아니다.
- 운영 PC 기존 경로·SQLite·R3/R5 원장·30일/14일 뉴스 보존·Cloudflare D1·예약 작업·운영 사이트에는 이 회수로 쓰기 없음.
- 다음 단계인 **영문 검증 결과의 운영 R5 자동 연결**은 원본 R55 기준의 수집·중복·게시 게이트를 먼저 통합 설계하고 사용자 승인 후 별도로 수행한다.

이후 이란 뉴스 작업은 반드시 원래의 `codex/outbreak-iran-news-retention-r1-20261026`에서 이어간다. 배포용 브랜치는 배포에 필요한 파일만 선택하여 `main`에 반영하는 용도다.
