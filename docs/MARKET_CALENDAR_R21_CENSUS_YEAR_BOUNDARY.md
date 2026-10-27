# ZGMINI 시장 캘린더 R21 — Census 연도 전환과 차년도 일정

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
| 기존 collector SHA256 | `4af1164793d95e7b0a97643d91e6d23749974d17c7048bac677f727376fc7afc` |
| R21 collector 후보 SHA256 | `2e7ac2a57a7ec2c41b2f9647d98d49c7bb22d904978a0d637e3d3619e01dedf0` |
| 변경 가능한 PC 소스 | `scripts/pc-writer/release-calendar.mjs` **한 개** |
| 로그 출력 | CMD 파일과 같은 위치 `MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY_RESULT.txt` |

설치기는 등록된 `ZGMINI-PC-Local-Core` 원본 경로, 실제 worktree, 원본 SHA/설정, 기존 파일·Git 상태를 재확인한다. 잠금을 새로 확보한 경우에만 백업·한 파일 커밋·기존 `config.source` 갱신을 수행한다. 기존 Core 잠금이 존재할 때 강제로 제거하거나 수집기를 종료하지 않는다. DB/스케줄러/게시/강제 수집/GitHub push/main 병합/프로덕션 배포는 수행하지 않는다.

## 회귀 검사와 완료 단계

- `tests/market-calendar-r21-census-year-stage.test.mjs`: 2026·2027 공식 페이지만 허용, 일반 목록 fallback, 연도 필터, BLS·BEA·Fed 출력 불변, 캐시·lease, 기존 공개 이력 보존.
- `tests/market-calendar-r21-census-year-apply.test.mjs`: 실제 Core를 모방한 임시 저장소에서 읽기 전용 게이트, 한 파일 적용, 커밋 부모/source/config/백업, 잠금 충돌과 source drift 중단 검사.
- `MARKET_CALENDAR_R21_CENSUS_YEAR_APPLY.cmd`: PC에서 정상 조건일 때 한 번 실행. 같은 위치 TXT 제출.
- R21 산출물 작성·테스트 PASS는 `CODE_READY`이며, PC 실제 `phase=INSTALLED`와 성공 `decision`이 확인되어야 PC 적용 완료다. 정규 실행과 공개 사이트 반영은 별도다.
- 기존 스케줄 주기를 기다리지 않고 다음 공식 경제·기업 실적 데이터 공급원 연구를 이어간다.
