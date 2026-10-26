# Stage04 R31 — 성장률 기간 오판정 수정 및 섹터·테마 전체 재조사 준비

작성 기준 2026-10-26. 범위 **연구용 / 수집·분석 실험만**, 투자 점수·순위·ETF 산식·운영 API·DB·스케줄러·매매·Cloudflare 배포 변경 없음.

## A. R30의 오판정 원인과 R31 최소 수정

- TBRC 바이오테크 서비스 보고서는 **2025→2026 CAGR 10.1%**, **2026→2030 CAGR 12.4%**를 각각 본문에 명시. 2026년 196.54십억 달러→2030년 314.12십억 달러 역산은 약 12.437%.
- 데이터센터 보고서는 **2025→2026 CAGR 8.2%**, **2026→2030 CAGR 9.2%**. 2026년 324.25십억 달러→2030년 460.61십억 달러 역산은 약 9.173%.
- 두 보고서의 전망 메타 속성표는 과거 성장률을 전망 기간 아래 중복 표시한다. R30은 이 현상을 별도 검증 없이 `SOURCE_CONFLICT`로 처리했다.
- R31은 **전망 본문 + 양 끝 전망 시장규모 + 과거 본문 + 과거 양 끝 규모 + 표기 기간**의 상호 검산이 모두 일치하는 경우에만 `RESOLVED_HISTORIC_RATE_MISLABEL`을 부여해 **본문 전망 CAGR**을 연구용으로 허용한다. 위 조건의 한 가지라도 다르면 `SOURCE_CONFLICT` 및 NULL 유지. 이전 R25–R30 동작은 신규 옵트인 기본값 `false`로 보존.

출처: [TBRC Biotechnology Services](https://www.thebusinessresearchcompany.com/report/Biotechnology-Services-Global-Market-Report), [TBRC Data Center](https://www.thebusinessresearchcompany.com/report/data-center-global-market-report).

## B. 전체 범위 조사 — R31 입력 기준

- 시작할 때 공개 `https://zgmini.kr/api/sector-fear-greed`와 `https://zgmini.kr/api/theme-fear-greed`를 **다시 조회**해 그때 게시된 섹터·테마를 확인한다. 정적 20개가 실제 서버의 전부라고 가정하지 않는다.
- 직전 승인 목록은 **섹터 11개 + 테마 9개 = 20개**. 신규 게시 테마가 있으면 그대로 집계하며 미등록 영문 키워드라면 **`NO_RESEARCH_MAPPING`/NULL**로 투명하게 표시한다.
- 항목당 공식 TBRC 보고서 검색 1회, 일치 공식 보고서 GET 최대 1회, 로컬 Ollama `gemma3:4b` 최대 1회, 20초 제한. 다른 출처 자동 전환·재시도 없음. 보고서 원문이나 사용자 PC 원본 응답은 Git에 저장하지 않는다.
- 현재 검색어는 시장 **연관 보고서 후보**이다. 광범위 GICS 섹터 또는 ETF 기반 테마의 매출·실제 산업 수요와 정확히 동일한 것이 아니다. 예: `바이오·신약` ↔ `biotechnology services`, `데이터센터·전력` ↔ `data center`. 따라서 전체 항목은 `RESEARCH_PROXY_NOT_*_GROWTH`로 보존하며 직접 테마 산업 성장률·G/D/M 점수에 자동 연결하지 않는다.
- 검색 일치 보고서가 없거나 헤더·규모·기간이 검증되지 않으면 `NULL`과 실패 코드를 보존한다. 성장률 0 처리·제외·미관측값 생성 금지.
- 이 방식은 현재 20개 정도의 일회성 **연구 테스트**다. 대규모 100~1,000개 테마의 운영 수집기로 사용하지 않는다. R20의 공통 배치 매체 선정 기준은 그대로 유효하다.

## C. 파일 및 검증 상태

- `stage04/forecast-source-audit-r29-readonly.mjs`: R31 옵트인 과거/전망 CAGR 교차검증.
- `stage04/keyword-growth-speed-r25-readonly.mjs`: R31에서만 대상 키워드 확장 및 재판정 사용. 구 R25~R30 기본 계약 유지.
- `stage04/stage04-all-universe-r31.mjs`: 공개 섹터·테마 목록 로딩, 주제/시장 보고서 검색어 연결, 미등록 주제 기록.
- `stage04/keyword-growth-all-r31-readonly.mjs`: 전체 주제 독립 실행·중간 진행 로그/결과 파일 기록.
- `stage04/STAGE04_ALL_SECTOR_THEME_R31_READONLY.cmd`: Windows 전용 실행.
- `stage04/keyword-growth-all-r31.test.mjs`: 기간 혼동 해소·진짜 출처 충돌 유지·11+9 전체 20개 1회 조사·신규 미등록 주제 누락 방지 검사.

검증: 로컬 `node --test research/investment-15-stage/stage04/*.test.mjs` → **23개 테스트 파일 PASS / 실패 0**. 이는 네트워크/Ollama **모의 테스트**이며 실제 20개 조사 결과를 뜻하지 않는다.

## D. Windows 재조사

1. R31 ZIP을 사용자 바탕화면의 전용 폴더에 압축 해제. 기존 운영 폴더, E: 데이터·원본 DB를 변경하지 않는다.
2. 기존 로컬 Ollama가 실행 중인지 확인하고 `STAGE04_ALL_SECTOR_THEME_R31_READONLY.cmd` 더블클릭.
3. CMD 창에서 항목별 진행 현황 확인. 같은 폴더에 `R31_ALL_SECTOR_THEME_GROWTH_RESULT.txt` 자동 생성.
4. 생성된 로그를 제출하면 실제 **섹터 수·테마 수·공식 보고서 제목/URL·성장률·전망 기간·누락/대리지표·출처 교정**을 검토한다. 실행 전에는 실측 완료라고 주장하지 않는다.

현재: **개발·모의 검증 완료 / 사용자 Windows 실측 대기 / GitHub branch 반영 별도 확인 필요 / 운영 배포 없음**.
