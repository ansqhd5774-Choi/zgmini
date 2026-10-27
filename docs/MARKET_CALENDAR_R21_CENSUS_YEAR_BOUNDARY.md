# ZGMINI 시장 캘린더 R21 — Census 연도 전환과 차년도 일정

## 2026-10-27 설치 중단 정정 — R21 최초 패키지 사용 금지

- **상태: R21 최초 패키지 WITHDRAWN / PC 미설치.** 기존 R20 운영 Core 유지. 이 문서 아래의 최초 후보와 설치 절차는 역사 기록이며 현시점 적용 지시가 아니다.
- 실제 R21 설치 로그 `MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_RESULT.txt`: `decision=R20_COLLECTOR_CHANGED_STOP`, `changedFiles=[]`, `backupCreated=false`, `newSource=null`.
- 잘못된 전제: 설치기에 넣은 기존 collector SHA256 `4af1164793d95e7b0a97643d91e6d23749974d17c7048bac677f727376fc7afc`는 **GitHub 브랜치의 `scripts/pc-writer/release-calendar.mjs`**에서 측정한 값이며 **승인 PC 원본의 검증값이 아니다**.
- PC 로그에서 측정된 실제 collector SHA256은 `1b8c2760a4f815191282dd55969ce8170072d4f747c8468ddd6601dc50ee88d6`. R20은 `lib/release-calendar.mjs`만 수정했으므로 위 불일치는 R20 설치 실패를 뜻하지 않는다.
- 최초 R21 테스트는 GitHub 템플릿을 PC 기존 collector처럼 사용하여 실제 PC 호환성을 검증하지 못했다. 해시만 `1b8c...`로 교체하거나 최초 후보로 원본을 덮어쓰지 않는다.
- **복구 1단계(개선):** `MARKET_CALENDAR_R21_PC_SOURCE_EXPORT.cmd`(읽기 전용)를 실행하여 등록된 Core의 실제 collector 원본과 해시·HEAD 일치 여부만 확보한다. 재실행용 최신 ZIP은 **`MARKET_CALENDAR_R21_PC_SOURCE_EXPORT_RESULT.txt` 한 파일**에 원본 소스(base64)와 해시를 함께 기록한다. 별도 `.mjs` 파일을 찾거나 GitHub에 원본을 업로드하지 않는다. 최초 버전은 `.mjs` 별도 파일을 생성했으나 사용자 PC에서 파일 전달에 실패하여 단일 TXT 방식으로 변경했다.
- **복구 2단계:** 그 실제 원본을 바탕으로 R21 연도 전환 코드만 재구현·회귀 검증하고 새 설치 후보·별도 CMD/ZIP을 만든다. 전용 브랜치 `codex/zgmini-gpt-workspace-20261025` 외 신규 브랜치 생성 금지. 기존 Core 수집·DB·스케줄러·게시·main 유지.

## 범위·근거

- 전용 브랜치: `codex/zgmini-gpt-workspace-20261025`만 사용하며 신규 브랜치를 만들지 않는다.
- 2026-10-27 사용자 CODEX 설치 보고: R20 PC Core source `97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b`, `lib/release-calendar.mjs`만 변경, R20 관련 검사 18건과 추가 4건 통과. 본 문서 작성자가 PC 직접 설치를 검증한 것은 아니다.
- R20 Census 실제 공식 HTML 174건, 기존 retail 13건과 차이 161건은 R20 기준서에 기록했다. R21은 이 점수나 2026년 파서를 바꾸지 않는다.
- `https://www.census.gov/economic-indicators/calendar-listview-2027.html`은 HTML 200이지만 발표 행이 0건인 안내 페이지로 관측되었다. 반면 `https://www.census.gov/economic-indicators/calendar-listview.html`에는 2027년 실제 공식 발표 행이 존재한다.
- 기존 PC 수집기는 매 주기 UTC 현재 연도 하나만 조회하므로 차년도 사전 일정과 2027년 전환을 놓칠 수 있다.

## R21 변경 파일과 계약

PC 적용 후보는 `staging/market-calendar/r21-census-year/scripts/pc-writer/release-calendar.mjs`이며 PC에서는 **`scripts/pc-writer/release-calendar.mjs` 한 파일만** 변경한다.

1. Census 현재 연도의 공식 `calendar-listview-{year}.html`을 먼저 조회한다.
2. HTTP 오류, 파싱 0건, 해당 연도 0건이면 공식 일반 목록 `calendar-listview.html`로 fallback한다. HTTP 200만으로 성공 판정하지 않는다.
3. 유효한 현재 연도를 확보한 다음 차년도에도 같은 선택 규칙을 적용한다. 차년도 미발표는 현재 연도 성공을 실패로 바꾸지 않는다.
4. 파싱된 행사 중 **조회 대상 연도**에 속하는 행만 인정하여 잘못된 연도의 일정을 미래 일정으로 오인하지 않는다.
5. `release-calendar:census` 기존 raw input key를 현재 연도에 유지하고, 차년도는 `release-calendar:census:YYYY`로 독립 보존한다.
6. R20 `retail` ID와 나머지 Census ID, 날짜, 출처, BLS·BEA·Fed 수집, 6시간 캐시, 기존 Core lease, 실패 시 공개 이력 보존 동작을 유지한다.
7. 신규 일정 숫자를 만들지 않고, 과거 자료를 임의로 현재 확정치로 바꾸지 않는다. 미래 연도 미발표는 자연스럽게 결측으로 둔다.

## PC 적용 게이트

| 대상 | 고정/검증값 |
| --- | --- |
| 승인 PC HEAD 및 `config.source` | `97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b` |
| PC Core worktree identity | `d0a4b3cb8b95` |
| R20 파서 SHA256 | `20d6c99cc7621e08c06598e51f4c9dc8a6f945952905351287b46d2c65a1551c` |
| 최초 패키지의 잘못된 collector SHA256 | `4af1164793d95e7b0a97643d91e6d23749974d17c7048bac677f727376fc7afc` (PC 기준 아님, 사용 금지) |
| PC 로그의 실제 collector SHA256 | `1b8c2760a4f815191282dd55969ce8170072d4f747c8468ddd6601dc50ee88d6` (파일 내용 및 HEAD 일치 여부 미검증) |
| 최초 R21 collector 후보 SHA256 | `2e7ac2a57a7ec2c41b2f9647d98d49c7bb22d904978a0d637e3d3619e01dedf0` (PC 적용 보류) |
| 변경 가능한 PC 소스 | `scripts/pc-writer/release-calendar.mjs` **한 개** |
| 로그 출력 | CMD 파일과 같은 위치 `MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_RESULT.txt` |

설치기는 등록된 `ZGMINI-PC-Local-Core` 원본 경로, 실제 worktree, 원본 SHA/설정, 기존 파일·Git 상태를 재확인한다. 잠금을 새로 확보한 경우에만 백업·한 파일 커밋·기존 `config.source` 갱신을 수행한다. 기존 Core 잠금이 존재할 때 강제로 제거하거나 수집기를 종료하지 않는다. DB/스케줄러/게시/강제 수집/GitHub push/main 병합/프로덕션 배포는 수행하지 않는다.

## 회귀 검사와 완료 단계

- `tests/market-calendar-r21-census-year-stage.test.mjs`: 2026·2027 공식 페이지만 허용, 일반 목록 fallback, 연도 필터, BLS·BEA·Fed 출력 불변, 캐시·lease, 기존 공개 이력 보존.
- `tests/market-calendar-r21-census-year-apply.test.mjs`: 실제 Core를 모방한 임시 저장소에서 읽기 전용 게이트, 한 파일 적용, 커밋 부모/source/config/백업, 잠금 충돌과 source drift 중단 검사.
- `MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY.cmd`: 최초 설치 파일이므로 **현재 실행 금지**. 실제 PC collector 확보 후 재작성된 설치 파일만 사용한다.
- `MARKET_CALENDAR_R21_PC_SOURCE_EXPORT.cmd`: 실제 PC collector 원본만 읽기 전용으로 추출. PC 설치·수집·게시 없음.
- R21 산출물 작성·테스트 PASS는 `CODE_READY`이며, PC 실제 `phase=INSTALLED`와 성공 `decision`이 확인되어야 PC 적용 완료다. 정규 실행과 공개 사이트 반영은 별도다.
- 기존 스케줄 주기를 기다리지 않고 다음 공식 경제·기업 실적 데이터 공급원 연구를 이어간다.
