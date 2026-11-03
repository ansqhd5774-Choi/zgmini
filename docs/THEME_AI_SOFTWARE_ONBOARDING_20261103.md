# AI 소프트웨어 신규 테마 — R1 조사 및 V2 진입 검증 (2026-11-03)

## 목적과 상태

- 요청 범위: 팔란티어(PLTR)·사운드하운드(SOUN)와 같은 **응용 AI 소프트웨어** 투자심리 테마. 두 종목의 ETF 편입은 참고 근거이며 반드시 보유해야 한다는 강제 조건은 아니다.
- 테마 ID: `ai-software`, 표시명: `AI 소프트웨어`. **사용자는 2026-11-04 WISE·IGV·XSW·AIQ 4종 선정을 명시 승인**했다. 단, 이 문서는 여전히 실제 PC V2 등록 definition이나 게시 승인 파일이 아니다.
- 기존 `docs/THEME_PLATFORM_STANDARD.md`, `docs/THEME_ONBOARDING_PLAYBOOK.md`, 승인 R25/R32 및 `ZGMINI_THEME_CONFIG_V2` 재사용. 새 산식·수집기·예약·CMD·API·차트·D1 테이블 추가 없음.
- 2026-11-03 공개 화면 실측: `/theme-fear-greed/` 기준일 2026-10-28, 기존 공개 10개. `/api/theme-configured`는 `PENDING`, 빈 `themes`이며 R32 및 별도 잠정 지원을 명시. 이는 **공개 상태**이지 PC의 실제 V2 설치/등록 목록 증거는 아니다.
- 현재 단계: 4종 선정 및 기존 R19 3조건 검증 완료. 공식 dated AUM·선정 증거와 V2 정의 파일을 작업 브랜치에 준비·재조회함. **PC 파일 설치·실제 `--register`·원가격 수집·계산·D1·공개·정규 예약 갱신은 아직 수행 증거 없음.**

## 최종 선정 — 사용자 승인 2026-11-04

| 순위 | ETF | AI 소프트웨어 적합성 점수(100점) | 구분 | 운영 등록 확인 사항 |
| --- | --- | ---: | --- | --- |
| 1 | **WISE** | **74** | 생성형 AI 소프트웨어·서비스와 인프라 혼합 | `GetMarketHistory` exact ticker·운용사 C+·현재 공식 AUM 및 가격 이력 미확인 |
| 2 | **IGV** | **71** | 소프트웨어 순도가 높음, 범용 소프트웨어 지수 | exact ticker·운용사 C+·가격 이력 미확인 |
| 3 | **XSW** | **67** | 소프트웨어·서비스 중심 분산 | exact ticker·운용사 C+·가격 이력 미확인 |
| 4 | **AIQ** | **59** | AI 소프트웨어와 하드웨어 혼합 | 기존 R19 3조건 PASS 자료 재사용, 충분한 최신 가격·등록 증거 재확인 |

- 승인 근거: 이 대화 사용자의 「4종으로 확정하자」에 이어 2026-11-04 「선정 승인」. **ETF 구성 선정 승인이며, 외부 공급처 권리 검증·공개 게시 권한·실제 설치 성공을 의미하지 않는다.**
- 점수 기준(이전 비교): AI 소프트웨어 주제 부합도 35점, 실제 소프트웨어 산업 비중 30점, PLTR/SOUN 노출 20점, 하드웨어 혼입 최소화 10점, 자료 최신성 5점. 점수는 후보 비교용이며 R32 산식 가중치가 아니다.
- WISE의 공식 2026-06-30 AUM은 $33,584,626, XSW의 2026-11-02 AUM은 약 $491.53M으로 개인 ETF 일반 선호선 $1B 미만이다. **현재 테마 V2 3조건은 공식 holdings·GMH exact symbol·운용사 C+이므로 이를 새 테마 등록 Gate로 임의 추가하지 않는다.** 실제 dated issuer AUM은 R32 입력 증거로 보존하며 승인 범위를 확인한다.
- 사용자가 승인한 4종을 자동 교체·누락시키지 않는다. 각 3조건의 미검증 상태를 PASS로 위조하지 않는다. 확정치와 잠정치 검증은 별개이고 어느 한쪽 결측이 다른 쪽 정상 결과를 차단하지 않도록 기존 계약을 따른다.

## 신규 선정 4종의 실제 V2 증거 (2026-11-04)

| ETF | GMH 공식 `/api/v1/symbols?source=stocks&timeframe=1m&prefix=` 직접 조회 | 운용사 내부 등급 | 기존 3조건 |
| --- | --- | --- | --- |
| WISE | exact symbol, 분봉 카탈로그 11,960행, 첫 2023-12-08 | Themes Management Company LLC, SEC CRD323861, 93점·5년미만 상한으로 B | PASS |
| IGV | exact symbol, 902,008행, 첫 2016-01-04 | 기존 R19 B·80점 | PASS |
| XSW | exact symbol, 45,314행, 첫 2016-01-04 | 기존 R19 B·89점 | PASS |
| AIQ | exact symbol, 377,113행, 첫 2016-01-04 | 기존 R19 A·100점 | PASS |

- **증거 수준:** 웹디버그로 공급처 API 실제 JSON의 `symbols[].symbol===ticker`와 `rows>0` 확인. 분봉 카탈로그의 `rows`는 PC 저장 1시간봉/252거래일 수집 성공이나 가격 정합성 검사를 대신하지 않음. WISE 운용사 SEC 2026-03-05 Form ADV Item11 Yes 0개 확인: [공식 PDF](https://reports.adviserinfo.sec.gov/reports/ADV/323861/PDF/323861.pdf).
- **작업 브랜치에 준비·원격 동일 바이트 재조회:**
  - [선정 증거](../theme-evidence/ai-software-selection.json) `sha256=362d0766b7049970b8dc8eb13dba8579096efbe0f8fcb66b25477b0260a49aa0`
  - [날짜별 공식 AUM](../theme-evidence/ai-software-aum.json) `sha256=0eaf631b3c2d629bbf24650c81075b767619385f45431b146ce5d4e6f496f701`
  - [R32 V2 정의](../config/theme-ai-software-v2.json) 등록 정규화 바이트 계획 SHA `a09f5e65c4aa74d2bd79730d558c40df286651b6e2a41a1d5fb1a5c56d6c192d`, `startDate=2024-11-01` (188일 준비·252일 출력 초기 수집용 기술 범위; 현행 산식 불변).
- 저장소 파일은 PC 운영 데이터 폴더에 **미설치**. 실제 설치 시 `E:/ZGmini/data/theme-evidence/...` 에 동등 바이트를 설치·SHA 재조회하고 기존 `theme-config-tool.mjs --register`로 비공개 등록해야 함. 신규 테마 전용 CMD·Scheduler·계산기·API·D1 테이블·화면을 만들지 않음.
- **AUM 분포 참고:** 현행 공식 dated AUM 단순 정규화 예시 WISE 0.1471%, IGV 55.8840%, XSW 2.1529%, AIQ 41.8161%. 테마 적합성 점수는 R32 산식 입력이 아님. XSW AUM 공식 반올림치(0.01M 단위), WISE 2026-06-30 기준 값은 날짜를 보존한다. 실제 R32 계산 결과는 저장 원가격/기여자·가중치 조건 통과 전까지 추정하지 않음.
- 현재 공개 게시 파일 `theme-config/public-approvals/ai-software.json`은 만들지 않음. 공식 [GMH 2026-10-29 발효 약관](https://getmarkethistory.com/docs/terms)의 파생 데이터 조건, 계정 유효성, 실제 operator 공개 승인/definitionSHA를 등록·계산 후 확인해야 함. 선정을 게시권/공개권 증거로 대체 금지.
- `--scheduled`의 `prior.calls<=4` 검사는 실제 운영 `dailyProviderRequests>4`이고 재실행 경로에 닿을 때에만 `dailyBudget`와의 비교로 최소 수정. 무관하면 이번 작업에서 수정하지 않음.

## 실행 연계 — 현재 LAST PASS / FIRST FAIL (2026-11-04)

- **LAST PASS:** 선정·AUM/V2 JSON 3파일 GitHub 저장 및 원격 바이트 재조회, 새 4 ETF 공급처 exact `/symbols` 조회, 기존 V2 입력 shape 시뮬레이션 7/7 (실제 CLI/PC 검사와 구분).
- **FIRST NOT RUN (AUTOMATION_BLOCKED):** PC `E:/ZGmini/data/theme-evidence/` 증거 파일 배치 및 공용 `--register` 실행. 현재 채팅 실행 환경에 Windows E: 저장소 직접 파일 접근이 없고, 제어 저장소 `config/operations.json`은 `mutationsEnabled=false`; A급 `pc-job`에는 V2 등록·자료 배치·수집·D1 게시 명령이 없음. 미허용 operation이나 임의 shell로 우회하지 않음.
- **기존 설치 경로:** 개발 source의 `theme-config-install.mjs`는 공용 `THEME_REGISTER.cmd`, `THEME_UPDATE.cmd`, `THEME_LIST.cmd`, `THEME_SCHEDULED.cmd`를 생성한다. 이전 설치 기록은 존재하나 오늘 실PC 경로는 미조회. 새로운 테마별 CMD를 만들 필요 없음.
- **NEXT:** 기존 승인된 Windows 로컬 Codex/공용 운영 경로로 JSON 3개를 정확한 PC 지정 위치로 복사·SHA 검증→기존 `--register` 한 번→`--scheduled` budget/checkpoint 점검→실 저장 원가격 검증→확정·잠정 결과 독립 확인. 운영 게시 전에는 operator 공개 승인·GMH 파생 표시 권리·등록SHA·유효기간의 기존 preflight를 통과시킨 후 D1 CAS/readback·UI·자연예약을 순차 검증.
- **오늘 공개 Reader 재조회:** `/api/theme-configured` HTTP 응답 `PENDING`, `themes:[]`, R32 및 별도 잠정 지원 `true`. 공개 페이지 기존 10개, 기준일 2026-10-28. **작업 브랜치 증거 추가만으로 공개나 PC 자동 갱신이 이루어진 것은 아님.**
- 과거 Controller #123 설치/ #124 사후검사는 성공으로 재사용. 이번 신규 테마 등록을 위해 Controller 전체 재설치나 관련 없는 Core 진단을 반복하지 않음. `4회` 예산 문제는 실제 정책·재조회 경로 확인 시에만 최소 수정.

## 이전 공식 ETF 후보 조사 — 역사 근거 (수량 상한 없음)

| ETF | AI 소프트웨어 테마 적합성 | 공식 보유 근거 | AUM 근거 및 기준일 | 필수 후속 |
| --- | --- | --- | --- | --- |
| IGV | 우선 조사. 소프트웨어 업종 중심; PLTR 9.02%, SOUN 0.06% (2026-10-30). AI 전용은 아님 | [iShares 전체 보유 CSV](https://www.ishares.com/us/products/239771/ishares-expanded-tech-software-sector-etf/latest-holdings.csv) | [iShares](https://www.ishares.com/us/products/239771/ishares-north-american-techsoftware-etf), USD 12,759,062,022, 2026-11-02 | 개별 GMH exact ticker·법적 adviser C+·충분한 동종 가격 이력 검증 |
| XSW | 우선 조사. Application Software 67.15%, Systems Software 21.80% (2026-11-02); AI 전용은 아님 | [State Street 전체 보유 XLSX](https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-xsw.xlsx) | [SSGA 목록](https://www.ssga.com/us/en/intermediary/fund-finder), 약 USD 491.53M, 2026-11-02 (반올림) | PLTR/SOUN 보유 직접 파싱, exact ticker·법적 adviser C+, 비반올림 공식 AUM 검증 |
| FAI | 조건부. AI 응용 소프트웨어+하드웨어 혼합; PLTR 4.42% (2026-10-30) | [First Trust 보유종목](https://www.ftportfolios.com/Retail/Etf/EtfHoldings.aspx?Ticker=FAI) | 미완료 | 테마 순도·3조건·공식 AUM 검증 |
| AIQ | 조건부. 공식 산업 SW/서비스 약 36%, 반도체 약 22.64%; PLTR 4.27% (2026-11-02) | [Global X 보유·산업구성](https://www.globalxetfs.com/funds/aiq) | [Global X](https://www.globalxetfs.com/explore), USD 9,547,163,886, 2026-11-02 | 하드웨어 혼합 범위 판단. R19 3조건 조사 증거 재사용 |
| WISE | 우선 추가 조사. 2026-06-30 SEC 공식 전체 49.1% SW·기술서비스 / 36.6% HW·반도체, PLTR·SOUN 모두 편입; 현재 보유와 별개 | [SEC 2026-06-30 전체 투자내역](https://www.sec.gov/Archives/edgar/data/1976322/000089418926022854/generativeai.htm) | 동일 문서 USD 33,584,626, 2026-06-30 (현재 AUM 아님) | 최신 공식 전체 보유·GMH exact ticker·운용사 C+ 확인 |
| WCLD | 조건부. SaaS/클라우드 대표성이 높으나 AI 전용 아님 | [WisdomTree 보유 페이지](https://www.wisdomtree.com/us/products/megatrends/wcld) | 같은 공식 페이지 USD 313,183,050, 2026-11-02 | 전체 보유 원본·실제 AI 앱 적합성 확인, R19 3조건 조사 증거 재사용 |
| CHAT | 조건부. 생성형 AI 테마지만 SEC 2026-07-31 HW·반도체 63%, SW·서비스 16.7% | [Roundhill 상품](https://www.roundhillinvestments.com/etf/chat/) | [SEC 2026-07-31 순자산](https://www.sec.gov/Archives/edgar/data/1924868/000200032426004973/chat-soi_73126.htm), USD 1,757,212,662 | 현재 전체 보유·SW 순도 평가, R19 3조건 조사 증거 재사용; adviser/sub-adviser 구분 |
| IGPT | 적합성 낮음. 이름과 달리 SEC 2026-04-30 주요 편입 반도체 중심 | [SEC 연차보고](https://www.sec.gov/Archives/edgar/data/1209466/000119312526295502/R2.htm) | 동일 문서 USD 875,307,932, 2026-04-30 | 현재 보유·테마 순도 재평가 전 핵심 후보 아님 |
| WTAI | 조건부. NVDA·삼성·마이크론 등 범용 AI 노출 | [WisdomTree](https://www.wisdomtree.com/us/products/megatrends/wtai) | [WisdomTree 목록](https://www.wisdomtree.com/us/products/megatrends), USD 599,798,020, 2026-10-30 | 3조건·AI 소프트웨어 순도 검증 |
| LLMA | 보류 권고. 2026-09 상장, 약 1개월 이력; 중국 기업·비상장 기업 노출 | [Global X](https://www.globalxetfs.com/funds/llma) | [과거 R26 연구](../config/theme-nine-r26-official-aum-evidence.json) | 중국/비상장 노출 정책 판단, 충분한 가격 이력 여부; 테마명만으로 등록 금지 |
| LABZ | 보류. 공식 사이트 등록신고서 효력 미발생 안내 | [Roundhill](https://www.roundhillinvestments.com/etf/labz/) | 없음 | 실제 상품 출시·공식 보유·권리 확인 전 미편입 |

## 기존 검증의 정확한 재사용 범위

- [R19 3조건 실측](../config/theme-nine-r19-three-gate-ox-verified.json): **AIQ(A)·CHAT(A)·LLMA(A)·WCLD(B)**에 대해 2026-10-26 당시 운용사 전체 보유 공개, `GetMarketHistory /api/v1/symbols` exact ticker 조회, 기존 운영자 등급 C 이상 조사. 이 기록은 충분한 252일 raw 가격 확보나 이 테마의 최종 선택 승인이 아니다.
- [R20 후보 명부](../config/theme-nine-r20-approved-candidates.json): `approvalScope=RESEARCH_CANDIDATE_ROSTER_ONLY`, `themeFit=SEPARATE_NEXT_STAGE_NOT_ASSUMED`.
- [R26 AUM](../config/theme-nine-r26-official-aum-evidence.json): `RESEARCH_ONLY_NOT_APPROVED_FOR_LIVE_R32_WEIGHTS`. 기존 [R32 dated AUM 승인](../config/theme-nine-r32-dated-aum-approval.json)도 과거 비공개 shadow 범위이며 이 신규 테마의 공개 승인이 아니다.
- 다른 ETF는 개별 exact ticker·adviser·공식 dated AUM 근거를 확보해야 한다. ETF 조회와 충분한 원가격 이력을 같은 PASS로 처리하지 않는다.
- 등록기가 요구하는 `ZGMINI_THEME_SELECTION_EVIDENCE_V1.selectionApproved=true`와 AUM 승인 여부는 실제 테마 선정 승인 없이 생성하지 않는다. 임시 예시의 승인값을 실승인으로 위조하지 않는다.

## 다음 11단계 진행 상태

1. 테마 범위·기존 증거 회수: **완료(재사용)**, 외부 출처·R19/R20/R26 확보.
2. ETF 후보 조사·3조건·AUM: **4종 공식 holdings·GMH exact ticker·운용사 C+ 통과**, dated issuer AUM 4행 근거 작성·재조회. 실제 1시간봉 가격 확보는 별개.
3. 실제 적합 ETF 명단과 선정 승인: **사용자 승인 완료(2026-11-04)** — WISE, IGV, XSW, AIQ. 이 승인은 3조건·권리·공개 게시 증거를 대체하지 않음.
4. V2 등록 명세 및 선정/AUM 증거 SHA 연결: **GitHub 증거 2개/V2 정의 작성·SHA 재조회 완료**. 실제 PC 데이터 폴더 설치와 `--register` 성공은 미수행.
5. 공통 입력 의존성·예산·기존 저장 원자료 계획: **기존 planner·collector 재사용**, 실제 새 theme plan 미실행.
6. 공통 확정 원가격 수집 및 체크포인트: **미실행**.
7. 기존 R25/R32 비공개 계산·동등성/가중치 검증: **미실행**.
8. 잠정 저장 원천·overlap 검증(별도 모드): **미실행**, 확정 정상값을 잠정 결측으로 막지 않음.
9. 승인 범위의 공통 게시→D1 CAS/exact readback: **미실행**.
10. 공개 Reader/API/UI 기존10개 불변 검증: **기존 baseline 확인**, 신규 공개 미실행.
11. 기존 공통 정규 예약 자동 포함 및 실제 다음 갱신: **미관찰**.

PC 제어 저장소 `config/operations.json`(2026-11-03 조회)의 A급 허용목록에는 신규 V2 등록/실수집/게시 operation이 없다. A급 `pc-job`에 임의 스크립트를 넣지 않는다. 선택 승인 이후에 기존 공통 설치·상시 승인 계약으로 실제 등록 진입점을 연결하고 공유 Controller 적용이 필요할 경우 #68 단일 담당과 직렬 조정한다. 무관한 공용 인프라 전체 재개발은 하지 않는다.
