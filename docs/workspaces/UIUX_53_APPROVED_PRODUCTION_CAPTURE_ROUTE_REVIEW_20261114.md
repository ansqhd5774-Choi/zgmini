# ZGMINI UIUX 53차 — 승인된 Production 캡처 경로 확인 결과

- 기준일: 2026-11-14 KST
- 담당: `UIUX 전문가-codex/ui-improvements-2`
- 53차 원본 지시: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863923778
- 작업 저장소/브랜치: `ansqhd5774-Choi/zgmini` / `codex/ui-improvements`
- 확인 당시 기능 main `643b7c7c4372ffad552443fc312c6cb1b944e2fc`, 담당 브랜치 HEAD `dedaed486882ba48fff91cadbbba8bd2c8f6fa5f`, divergent `314 ahead / 468 behind`.
- **전체 UI 검증 진행률: 25% → 25%.**

## 53차에 신규 수행한 다음 단계: 기존 허용 증거 경로의 Production 가능성 분리

53차 지시에서 기존 Chrome host permission·공개 GET·SOCKS/DNS 오류를 반복하지 않도록 명시했다. 따라서 **같은 사이트 접근/모의 CI 재실행·57 PNG 재감사는 하지 않았다**. 기존 연결된 GitHub 앱으로 Production 라이브 캡처를 제공할 수 있는 미사용 워크플로 원본 존재 여부만 조회했다.

1. GitHub 기능 저장소 `.github/workflows/` 현행 main 목록에서 `community-chat-browser.yml`과 `seo-production-health.yml`을 식별하고, 파일 원문을 직접 읽었다.
2. `community-chat-browser.yml`: workflow 이름 자체가 **Community Chat Browser UI (Mocked API)**. `127.0.0.1:5173`의 로컬 dev UI 준비·`playwright` 실행·`artifacts/*` PNG 업로드. 요청한 실제 `https://zgmini.kr/` Production 4경로/8캡처 검증과 다른 별도 계약. 기존 CI Artifact #13676699668 재실행·재다운로드는 수행하지 않음.
3. `seo-production-health.yml`: `scripts/seo-production-health.mjs`, `scripts/seo-canonical-edge-health.mjs`로 **SEO Production Health**만 검증. PC1440/모바일390 Playwright 캡처 또는 API와 화면 수치 대조가 없음.
4. 저장소 기본 브랜치 내 `production browser`, `production screenshot`, `page.goto('https://zgmini.kr` 검색에서도 네 화면·두 폭의 실 Production PNG 증거를 확인하지 못했다. 이 검색은 모든 역사적 Artifact 부재의 증명이 아니며 범위는 기본 브랜치/조회 결과에 한정한다.
5. 51차에 기록한 Chrome host permission denied/공개 GET access denied, 46차 Browser Use SOCKS, 48차 독립 컨테이너 DNS 실패를 **기존 실패 증거 그대로 재사용**했다. 기존 무료·승인 Live Browser가 회복됐다는 새 증거를 확보하지 못했으므로 동일 실패 호출·유료 수단·접근 우회 없음.

## LAST PASS / FIRST FAIL / 상태

- **LAST PASS:** 48차 기존 로컬 mock CI Artifact 57 PNG 무결성 및 물가/고용 PC1440/모바일390 테스트 PASS; 46차 시점 4 HTML GET과 5 공개 API 응답 수신. 51차 결과 문서/원장 원격 검증 PASS. 이력이며 이번에 다시 실행하지 않음.
- **FIRST FAIL (현재 필수 실행의 진입 조건):** 승인된 무료 Live Browser의 정상 접근 증거 없음. 51차 첫 실제 실패는 Chrome `Extension manifest must request permission to access the respective host` 및 공개 GET 본문 접근 불가. 53차 조회에서 확인한 GitHub 워크플로 2개는 Production 실화면 캡처 대체 불가.
- **판정:** `AUTOMATION_BLOCKED(PRODUCTION_BROWSER_OR_PUBLIC_READ_ACCESS)`. 사이트 HTTP 상태·API 신규 수치·UI 결함은 53차에 재측정하지 않았음.
- **실제 화면:** 물가/시장캘린더/테마/고용 × 1440/390 각각 `UNVERIFIED` (8/8).
- **신규 실제 UI 수치 대조 / 캡처:** 0/8. **코드 수정·테스트 재실행·신규 PR·CI·Production 배포·D1·PC·Runner/Controller 변경 0**. 53차 문서는 허용 경로가 없음을 검증한 read-only evidence만 저장한다.

## 다음 필수 실행 하나

기존 승인된 **무료 Live Browser 접근이 정상화됐다는 확인 가능한 증거가 나타난 경우에만**, 공식 URL `/inflation/`, `/market-calendar/`, `/theme-fear-greed/`, `/economic-indicators/employment/`를 1440/390에서 실제 PNG8개로 캡처하고 같은 시각 API 5개 응답의 점수·단위·관측일/게시일·`sourceStoredAt`·stale·차트 축/마지막 점·overflow와 대조한다. 접근 정상화 전 새 mock 테스트·기존 권한 오류 반복·미확정 UI 수정은 금지한다.
