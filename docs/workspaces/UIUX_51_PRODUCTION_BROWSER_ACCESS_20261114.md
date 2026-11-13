# ZGMINI UIUX — 51차 Production 브라우저 접근 검증

- 관측일: 2026-11-14 KST, 51차 접수 후
- 원담당: UIUX 전문가-codex/ui-improvements-2
- 지시 원본: https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6863655392
- 대상 저장소/전용 브랜치: ansqhd5774-Choi/zgmini / `codex/ui-improvements`
- 51차 착수 main: `643b7c7c4372ffad552443fc312c6cb1b944e2fc`, 분기: 312 ahead / 468 behind; 전체 병합, rebase, 강제 reset 없음
- **기능 전체 화면 검증 진척: 25% → 25%**

## 직전 완료 지점 및 재사용 증거

- 48차 원본 CI Artifact `13676699668` 57 PNG 압축 무결성 PASS, 물가/고용 mock 1440/390 PNG 육안 검수, 관련 CI 개별 PASS: https://github.com/ansqhd5774-Choi/zgmini/actions/runs/42622613765
- 직전 결과·해시·원본 파일: [48차 독립 감사](UIUX_48_BROWSER_EVIDENCE_AUDIT_20261114.md). 동일 ZIP 다운로드·mock CI 재실행 안 함.
- 46차 공개 GET 4개 HTML 200, 다섯 공개 API JSON 응답 4×200/1×503; 당시 물가 57.51884273397442→57.5 반올림 일치, 테마 `STORED_DATA_STALE`. **과거 시각 자료**이며 51차 신규 API 수치로 주장하지 않음.

## 이번에 실행한 실제 접근 점검 (읽기 전용, 기존 도구만)

1. 정확한 Production 공식 URL 4개 `/inflation/`, `/market-calendar/`, `/theme-fear-greed/`, `/economic-indicators/employment/` 및 `/api/inflation-detail`, `/api/theme-fear-greed`를 공개 웹 읽기로 직접 열기 시도. 앞 세 페이지는 `Cache miss` 또는 도구상 접근 불가, 나머지 페이지와 API도 접근 불가. **HTTP 404/503/실제 서비스 장애를 확인한 게 아님**.
2. 기존 사용자가 열어둔 Chrome 탭 `183828853`, URL `https://zgmini.kr/`를 연결된 브라우저 list_tabs로 식별 후 get_tab_context 단회 시도. 정확한 오류: `Cannot access contents of the page. Extension manifest must request permission to access the respective host.` 브라우저 host 읽기 권한 없음. 임의 확장 권한 변경·로그인·PC 직접 조작 없음.
3. 직전 46차 Browser Use의 `ERR_SOCKS_CONNECTION_FAILED`, 48차 컨테이너 DNS `Could not resolve host`는 **과거 동일 유형의 실패 증거로만 재사용**. 이번 51차에 신규 유료 크레딧·유료 충전·추가 비인가 브라우저 실행/우회 없음.

## LAST PASS / FIRST FAIL

- **LAST PASS (검증 범위):** 48차 기존 CI ZIP 57 PNG 무결성/일부 mock 화면 독립 검수, 46차 Production API 과거 조회/물가 반올림 계약. **LIVE Production UI PASS는 아님**.
- **FIRST FAIL (51차 신규):** 공식 Production 경로 공개 웹 GET이 `Cache miss`/access denied로 본문 미획득; 이어서 연결된 Chrome ZGmini 탭이 `Extension manifest must request permission`으로 읽기 거부.
- **정확한 현재 판정:** `AUTOMATION_BLOCKED(PUBLIC_LIVE_BROWSER_ACCESS_UNAVAILABLE)`. 공개 서비스 자체의 HTTP 실패나 UI 소스 버그로 승격 금지.

## 화면별 미완료 상태

| Production 화면 | PC 1440px | 모바일 390px | 51차 새 라이브 캡처 | 같은 시각 API/표시값 비교 |
| --- | --- | --- | --- | --- |
| 물가 `/inflation/` | UNVERIFIED | UNVERIFIED | 0 | UNVERIFIED |
| 시장 `/market-calendar/` | UNVERIFIED | UNVERIFIED | 0 | UNVERIFIED |
| 테마 `/theme-fear-greed/` | UNVERIFIED | UNVERIFIED | 0 | UNVERIFIED |
| 고용 `/economic-indicators/employment/` | UNVERIFIED | UNVERIFIED | 0 | UNVERIFIED |

- 같은 시각 API 점수·단위·관측일·게시일·sourceStoredAt·stale/결측, 차트 축/마지막 점 및 가로 overflow 미검증.
- UI 결함 확정 0; **UI 소스 수정 0, 신규 PR/CI/Production 배포 0**. PC/Runner/Controller/DB/D1/Cloudflare 변경 0.

## 다음 필수 작업 하나

**승인된 무료 경로의 실제 Production 브라우저 접근 권한이 회복되는 즉시** 4개 공식 URL × 1440/390 8개의 라이브 PNG를 확보하고 동일 시각 5개 API 원문과 수치·날짜·stale·결측·차트 끝점·overflow를 대조한다. 그 전에는 `AUTOMATION_BLOCKED` 유지. 무관한 Controller/Runner 복구·반복 mock CI를 선행 조건으로 삼지 않는다.
