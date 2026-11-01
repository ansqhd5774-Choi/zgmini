# R42 — 기존 PC Writer 인증으로 R41 뉴스 D1 저장 (수동 1회 실행 준비)

## 이전 운영 성공 경로의 재사용

- GitHub `main` → Cloudflare Workers Builds 자동배포는 R41 커밋
  `331af9bea7654a5212104259a94b54edd3b2f3d1`에서 성공했다.
- 기존 PC Writer는 `scripts/pc-writer/d1.mjs`에서 이미 설정된
  `~/.zgmini/pc-writer/config.json`의 account/core와 Wrangler OAuth 또는
  `CLOUDFLARE_API_TOKEN`을 사용한다. **새 토큰을 만들지 않는다.**
- 뉴스 R15 게시기는 `scripts/iran-progress/news-display-auto-run-r15.mjs`로
  기존 R1 단일 JSON 스냅샷을 게시한다. R42는 해당 R1 게시기를 호출하지 않는다.
- R41은 별도 `iran_news_article_metadata_r41` 테이블만 사용한다.

## 실행 준비 및 제한

1. GitHub 전용 개발 브랜치의 R42 파일을 운영 PC의 승인된 프로젝트
   `scripts/iran-progress/` 아래에 정확한 경로대로 둔다. GitHub 배포만으로
   PC의 프로젝트 파일은 자동 업데이트되지 않는다.
2. 기존 PC Writer 설정과 `E:\ZGmini\runtime\node.exe`가 운영 중이어야 한다.
   자격증명 또는 실행기를 새로 설치하지 않는다.
3. `IRAN_NEWS_R42_D1_ONE_SHOT.cmd`를 **한 번만** 실행한다.
   바탕화면의 `IRAN_NEWS_R42_D1_ONE_SHOT_RESULT.txt` 확인.
4. 실행은 먼저 `--preflight`로 R1 원본 키와 39개 매니페스트를 읽기 확인한다.
   `--apply-approved`가 R41 전용 CREATE TABLE/INDEX 및 39건 UPSERT를 수행한다.
5. 배치별 read-back, 39개 ID 보존, 14일 적격 수, 7개 출처,
   R1 body/stored_at 전후 동일성을 검사한다.
6. 공개 API `GET /api/outbreak-news/iran/r41`이 7개 출처 READY를 반환할 때만
   `D1_AND_PUBLIC_API_VERIFIED`이다. 아니라면 `D1_STORED_PUBLIC_API_PENDING`으로
   구분하며 **자동 재실행하지 않는다.**

## 보존 조건

- 기존 R1 스냅샷 key, R3/R5 점수, 원자료, Windows 예약, Queue/Cron,
  Cloudflare Git 연동, GitHub 배포 경로는 변경하지 않는다.
- R42는 D1 실저장 이전에는 완료가 아니다. 개발 환경 SQLite 통과를
  운영 D1 성공으로 표현하지 않는다.
- GitHub `main`에 올린 R41 코드와, 운영 PC에서 별도로 수행하는
  D1 쓰기는 서로 다른 Gate다. 본 문서는 **실제 PC 실행 완료 증거가 아니다**.
