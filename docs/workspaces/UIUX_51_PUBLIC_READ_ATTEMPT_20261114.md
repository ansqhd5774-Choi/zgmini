# ZGMINI UIUX — 51차 Production 독립 읽기 실행 결과

**기준일:** 2026-11-14 KST  
**담당:** UIUX 전문가 `codex/ui-improvements-2`  
**기준 진행률 / 종료 진행률:** **25% → 25%**. 검증 목표는 네 실제 Production UI × PC 1440/모바일 390 = 8뷰, 같은 시각 공개 API JSON 대조.
**원본 지시:** [공통 인계 원장 #68 — 51차 댓글 6863655392](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863655392)

## 1. 기존 PASS를 보존하고 이번에 실제 시도한 실행

- 승인된 기존 48차 UIUX GitHub 브랜치 문서 `docs/UIUX_R48_READONLY_AUDIT_20261114.md`의 source-only contract 13/13 PASS 보존. `docs/workspaces/UIUX_48_BROWSER_EVIDENCE_AUDIT_20261114.md`의 Actions CI ZIP 무결성·57PNG/원본 부분검수·모의 데이터 1440/390 PASS는 재사용하며 재다운로드/재시험하지 않음.
- 기능 `main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`, 공통 제어 `main=69e25a08a903dc8e52ef1093ec15837de4c20858`, 51차 시작 당시 전용 UI 브랜치 HEAD `848b9cba049edf5a21ed5601436294b8b3db53b0` (main 대비 ahead 312 / behind 468). 전체 병합·rebase·PC/운영 변경 없음.
- **이번 추가 실제 실행:** 읽기 전용 무료 공개 WEB GET으로 아래 정확한 Production 화면 4URL과 API 4URL을 각각 한 번 요청. 유료 Browser Use 재호출, 다른 브라우저 보안 제한 우회, CLI 네트워크 리트라이를 수행하지 않음.

| 대상 | URL | 이번 public GET 결과 |
|---|---|---|
| 물가 화면 | `https://zgmini.kr/economic-indicators/inflation/` | `URL_NOT_ACCESSIBLE_VIA_TOOL` |
| 시장 캘린더 화면 | `https://zgmini.kr/market-calendar/` | `CACHE_MISS` |
| 테마 공포탐욕 화면 | `https://zgmini.kr/theme-fear-greed/` | `URL_NOT_ACCESSIBLE_VIA_TOOL` |
| 고용 화면 (올바른 URL) | `https://zgmini.kr/economic-indicators/employment/` | `CACHE_MISS` |
| 물가·고용 점수 | `https://zgmini.kr/api/market-score` | `URL_NOT_ACCESSIBLE_VIA_TOOL` |
| 달력 | `https://zgmini.kr/api/release-calendar` | `URL_NOT_ACCESSIBLE_VIA_TOOL` |
| 테마 | `https://zgmini.kr/api/theme-fear-greed` | `URL_NOT_ACCESSIBLE_VIA_TOOL` |
| 고용 R6 | `https://zgmini.kr/api/employment-r6/observations` | `URL_NOT_ACCESSIBLE_VIA_TOOL` |

`URL_NOT_ACCESSIBLE_VIA_TOOL` / `CACHE_MISS`는 **읽기 도구 실패**로, 서비스 HTTP 503/404·페이지 오류라는 근거가 아니다. 이번 직접 GET 중 유효 HTTP response/json/body **0/8**. 기존 직전 Production HTTP 200/JSON 재사용 증거를 삭제하지 않음.

## 2. 정확한 LAST PASS / FIRST FAIL

**LAST PASS** — 48차의 GitHub source-only 13/13 검사 및 모의 CI artifact ZIP 57 PNG 검수; 더 앞선 API 담당이 실제 확인한 공개 JSON: 시장/물가/고용 관련 4개 HTTP200와 테마 HTTP503, 물가 점수 반올림 57.5, 테마 `STORED_DATA_STALE`, 달력 `fed_fomc=SOURCE_FAILED`. 원본은 [51차 총괄 보고](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863655392) 및 48차 인계 참조. 이는 **이번 시각의 API 원문이 아님**.

**FIRST FAIL** — 이번 51차 무료 공개 WEB GET의 네 Production 페이지 및 네 JSON 읽기 **접근 단계(서비스 응답 받기 전)**. 실제 browser viewport/JS hydration 단계에 진입하지 못함. 정규 무료 브라우저의 이전 SOCKS/Host 권한 및 가용 크레딧 부족 증거 지속; 차단을 다른 browser host 우회로 해결하지 않음.

현재 막힌 단일 기능 범위 = **실제 Production 8뷰 증거 확보**. PC Runner/Controller와 독립적이며 #996 C급 복구를 전역 Gate로 만들지 않음.

## 3. 화면별 완료·미완료

| Production 화면 | PC 1440px | 모바일 390px | 축·마지막 점·overflow | 실제 API 동시값 |
|---|---|---|---|---|
| 물가 `/economic-indicators/inflation/` | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| 시장 `/market-calendar/` | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| 테마 `/theme-fear-greed/` | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| 고용 `/economic-indicators/employment/` | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |

- 신규 실제 Production PNG **0/8**, 같은 시각 API JSON **0/4**, 실측 가로 scrollWidth/축·마지막 점·로딩/관측일/게시일/`sourceStoredAt` 판정 **UNVERIFIED**.
- 현재 확인된 추가 **UI 코드 결함 0건**; 수정 파일(코드)/PR/CI/Production 배포 **0건**. 운영 PC·DB/D1·Cloudflare·Workflow 변경 **0건**. 잘못된 고용 `/employment/` 404는 UI 결함 아님.
- 완료율은 새 Production 화면 검증이 없으므로 **25%로 유지**.

## 4. 다음 필수 실행 정확히 하나

**기존 무료·승인된 라이브 브라우저 실행 권한과 네트워크가 정상인 실제 경로에서 Production 4URL × 1440px/390px 8개 원본 PNG와 동일 시각의 공개 JSON을 확보·독립 대조**한다. 특히 score/unit/observedAt/publishedAt/`sourceStoredAt`, null/STALE, 로딩, chart axis/last point와 document scrollWidth/clientWidth를 검증. 차단이 지속된다면 `AUTOMATION_BLOCKED(PRODUCTION_BROWSER_OR_PUBLIC_READ_ACCESS)`로 본 UI 실증만 분리하고 다른 독립 개발·API/PC 업무는 계속한다. 실제 UI mismatch가 확정될 때만 최신 `main` 기준 최소 파일 수정·회귀 및 선택적 PR을 수행. 새 예약/유료 충전/무단 배포/RDC/브라우저 보안 제한 우회 금지.
