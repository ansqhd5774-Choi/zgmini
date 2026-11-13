# ZGMINI UIUX — 58차 두 물가 UI의 점수·기준일 소스 실제 코드 조사

**실행일:** 2026-11-14 KST  
**원담당:** `UIUX 전문가-codex/ui-improvements-2`  
**58차 지시:** https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/68#issuecomment-6864999213  
**개발 저장소:** `ansqhd5774-Choi/zgmini` · 전용 브랜치 `codex/ui-improvements`  
**조사 시작점:** 기능 `main=643b7c7c4372ffad552443fc312c6cb1b944e2fc`; 전용 브랜치 `9218f032d84aace69d6a90a23376e9f609ec17a6` · 318 ahead/468 behind. 브랜치 병합/rebase/reset/운영 변경 없음.

## 1. 실행한 작업 — 최근 변경분만 조사

- 제어 저장소 최신 main `AGENTS.md`, `docs/GENERAL_CHAT_START.md`, `docs/PC_AUTOMATION_STANDARD.md` 관련 내용을 조회했다. 55차에서 고친 정확한 정규 URL을 재사용하고 이전 오류 접근/57 PNG/13 source 테스트를 반복하지 않았다.
- 전용 브랜치 최근 18개 커밋·대상 파일별 이력을 GitHub REST로 조회했다. 최근 커밋은 주로 `docs(uiux)`이며, 실제 두 화면 소스 변경은 더 이전 `app/economic-indicators/economic-detail-panel.tsx` 연구 패널 마운트와 `app/economic-indicators/inflation-candidate-7-inputs.tsx` 및 공유 mini-chart 계열에 한정됐다.
- GitHub `fetch_file`에서 **main과 전용 브랜치의 실제 파일**을 읽어 Blob SHA가 같은 파일(예: `app/inflation/inflation-panel.tsx`, 두 canonical page, `components/economic-terrain.tsx`, `components/use-stored-index.ts`)과 서로 다른 파일(경제 공통 패널, 후보7 테이블, mini-chart)을 분리해 조사했다.
- 원문 기반 읽기 전용 **15개 직접 JS 계약 assertion을 실제 실행**했고 모두 PASS. **Node/Playwright CI·Production HTTP/브라우저 호출 0**. 이 15개는 기존 '13 source tests'를 재실행한 결과가 아니라 **58차 지정 범위의 독립 스코프 확인**이다.

## 2. 정확한 점수·기준일 흐름 (실제 브랜치 소스 원문)

| 화면 | canonical / 파일 | 점수 원본 | 기준일 원본 |
| --- | --- | --- | --- |
| **12대 경제지표 물가** | `/economic-indicators/inflation/`, `app/economic-indicators/inflation/page.tsx` → `EconomicDetailPage id="inflation"` → 공통 `economic-detail-panel.tsx` | `useStoredIndex<Snapshot>("/api/market-score")`, `payload.domains.find(id===inflation)`, `domain.status==="READY"`면 `domain.score` | `domain.asOfDate` 유효하면 우선, 그다음 같은 market-score `payload.asOfDate`; **R2 API 사용하지 않음** |
| **별도 Inflation R2** | `/inflation/`, `app/inflation/page.tsx` → `InflationPanel` | `useStoredIndex<InflationPayload>('/api/inflation-detail')`, `payload.score` | 동일 R2 `payload.asOfDate` |
| **12대 경제지표 연구 입력 19개** | `inflation-research-inputs.tsx` | `/api/inflation-causal-inputs`, Snapshot의 `score:null`; 평가점수 산출 안 함 | 각 원자료 observationDate |
| **후보 7개** | `inflation-candidate-7-inputs.tsx` | `/api/inflation-candidate-inputs`, Snapshot의 `score:null`; 평가점수 산출 안 함 | 후보별 observationDate |

- `components/market-explorer-catalog.ts`: `inflationStability`의 `href:'/inflation/'`는 R2 위험 카탈로그, `inflation`의 `href:'/economic-indicators/inflation/'`는 12대 경제지표 카탈로그로 구분돼 있음.
- 공통 `useStoredIndex(url)`는 각 컴포넌트 내부 `useState` + 입력 `url` 기반 `fetch(url)` 및 `useEffect([url,enabled])`를 사용. 별도 두 점수의 응답을 공유하는 모듈 전역 캐시는 이 훅에 없음.
- 공유 `InflationMiniChart`와 `MarketScoreOrb`는 점수를 직접 취득하는 API Reader가 아님. 공통 CSS·차트 코드를 공유한다고 점수 출처가 같다는 뜻이 아님.
- `app/inflation/page.tsx`는 두 산식이 다르며 서로 다른 점수도 정상이라고 명시. 기존 46차 공개 API로 확인된 **57.5188427→57.5점은 R2에만 해당**하며 12대 경제지표 물가 점수로 복사하지 않는다.

## 3. 직접 실행한 15가지 소스 계약 assertion 결과

| 검사 묶음 | 개수 | 결과 |
| --- | ---: | --- |
| 12대 물가 canonical/도메인 ID/market-score 사용·R2 미호출 | 4 | 4 PASS |
| 12대 물가 domain score / market-score 기준일 우선순위 / R2 컴포넌트 미장착 / 카탈로그 링크 | 4 | 4 PASS |
| R2 canonical/컴포넌트/`inflation-detail`/기준일/R2의 `market-score` 미호출 | 5 | 5 PASS |
| 연구 19/후보 7의 독립 `score:null` Reader | 2 | 2 PASS |
| **합계** | **15** | **15/15 PASS** |

※ 실행 방식은 현재 GitHub 원문에 대한 읽기 전용 JS string/structural assertions이며 CI Node test/런타임 DOM/Production HTTP 실증으로 확장 주장하지 않는다.

## 4. LAST PASS / FIRST FAIL / 변경 범위

- **LAST PASS (이번 범위):** 전용 브랜치 기준 두 물가 컴포넌트의 점수·기준일, 독립 데이터 Reader, 카탈로그 링크 **15/15 PASS**. `main`과 branch 원문 교차 대조 완료.
- **FIRST FAIL (이번 코드 검사): 없음.** 점수 출처가 섞이는 재현 가능한 코드 결함 **0건**. 따라서 UI 소스 수정·회귀 PR·새 CI 실행 0.
- **이전 FIRST FAIL (다른 단계):** 51차 Production Chrome host permission denial 및 SOCKS/DNS/read access 제한. 58차 재요청 0.
- **Production 4뷰 × PC1440/M390:** 기존 **8/8 UNVERIFIED**, 동시 API 비교 0. 라이브 검증 단계에만 `AUTOMATION_BLOCKED(PRODUCTION_BROWSER_OR_PUBLIC_READ_ACCESS)` 유지.
- **변경:** 이 소스 조사 기록 1개만 해당 브랜치에 저장. UI 계산·디자인·API·D1·Cloudflare/Worker·PC/Runner/Controller/기능 산식·DB/TTL/배포 실제 변경 **0**. 이력 브랜치 468 behind 상태는 대상 결함 PASS 또는 Production 적용 근거 아님.
- **진척:** **25% → 25%** (소스 누락 위험 검사는 완료, 사용자가 요청한 실화면 종단 검증 미완료).

## 5. 다음 필수 실행 하나

**이미 승인된 무료 Live Browser 접근이 실제 정상화된 증거가 확보된 경우** 4개 실제 목표 URL **`/economic-indicators/inflation/`**, `/economic-indicators/employment/`, `/market-calendar/`, `/theme-fear-greed/`를 1440/390에서 PNG 8개로 캡처하고 같은 시각 API 원문의 점수·날짜·sourceStoredAt·stale·null·차트 축/끝점·overflow와 대조한다. 이전과 동일한 권한 실패를 반복 호출하거나 새 유료·PC 우회 수단을 사용하지 않는다.
