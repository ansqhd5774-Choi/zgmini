# AI 소프트웨어 신규 테마 — R1 조사 및 V2 진입 검증 (2026-11-03)

## 목적과 상태

- 요청 범위: 팔란티어(PLTR)·사운드하운드(SOUN)와 같은 **응용 AI 소프트웨어** 투자심리 테마. 두 종목의 ETF 편입은 참고 근거이며 반드시 보유해야 한다는 강제 조건은 아니다.
- 후보 ID: `ai-software`, 표시명: `AI 소프트웨어`. 최종 ETF 선정·공개 승인 전의 조사안이며 **등록 definition이 아니다**.
- 기존 `docs/THEME_PLATFORM_STANDARD.md`, `docs/THEME_ONBOARDING_PLAYBOOK.md`, 승인 R25/R32 및 `ZGMINI_THEME_CONFIG_V2` 재사용. 새 산식·수집기·예약·CMD·API·차트·D1 테이블 추가 없음.
- 2026-11-03 공개 화면 실측: `/theme-fear-greed/` 기준일 2026-10-28, 기존 공개 10개. `/api/theme-configured`는 `PENDING`, 빈 `themes`이며 R32 및 별도 잠정 지원을 명시. 이는 **공개 상태**이지 PC의 실제 V2 설치/등록 목록 증거는 아니다.
- 현재 단계: ETF 조사·AUM·기존 증거 회수 진행. 실제 V2 등록·PC 수집·계산·D1 쓰기·새 테마 공개·정규 예약 갱신을 수행하지 않았다.

## 공식 ETF 조사 — 수량 상한 없음

| ETF | AI 소프트웨어 테마 적합성 | 공식 보유 근거 | AUM 근거 및 기준일 | 필수 후속 |
| --- | --- | --- | --- | --- |
| IGV | 우선 조사. 소프트웨어 업종 중심; PLTR 9.02%, SOUN 0.06% (2026-10-30). AI 전용은 아님 | [iShares 전체 보유 CSV](https://www.ishares.com/us/products/239771/ishares-expanded-tech-software-sector-etf/latest-holdings.csv) | [iShares](https://www.ishares.com/us/products/239771/ishares-north-american-techsoftware-etf), USD 12,759,062,022, 2026-11-02 | 개별 GMH exact ticker·법적 adviser C+·충분한 동종 가격 이력 검증 |
| XSW | 우선 조사. Application Software 67.15%, Systems Software 21.80% (2026-11-02); AI 전용은 아님 | [State Street 전체 보유 XLSX](https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-xsw.xlsx) | [SSGA 목록](https://www.ssga.com/us/en/intermediary/fund-finder), 약 USD 491.53M, 2026-11-02 (반올림) | PLTR/SOUN 보유 직접 파싱, exact ticker·법적 adviser C+, 비반올림 공식 AUM 검증 |
| FAI | 조건부. AI 응용 소프트웨어+하드웨어 혼합; PLTR 4.42% (2026-10-30) | [First Trust 보유종목](https://www.ftportfolios.com/Retail/Etf/EtfHoldings.aspx?Ticker=FAI) | 미완료 | 테마 순도·3조건·공식 AUM 검증 |
| AIQ | 조건부. 공식 산업 SW/서비스 약 36%, 반도체 약 22.64%; PLTR 4.27% (2026-11-02) | [Global X 보유·산업구성](https://www.globalxetfs.com/funds/aiq) | [Global X](https://www.globalxetfs.com/explore), USD 9,547,163,886, 2026-11-02 | 하드웨어 혼합 범위 판단. R19 3조건 조사 증거 재사용 |
| WISE | 추가 확인. 역사 SEC 자료에서 PLTR 4.8%, SOUN 4.3% (2026-03-31) | [SEC 보유종목](https://www.sec.gov/Archives/edgar/data/1976322/000113322826008958/R2.htm) | 미완료 | 현재 전체 보유·정확 AUM·3조건 확인 |
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

1. 테마 범위·기존 증거 회수: **진행 중**, 외부 출처·R19/R20/R26 확보.
2. ETF 전체 후보 조사·3조건·AUM: **진행 중**, 공식 자료 확보·새 ETF 일부 조건 미검증.
3. 실제 적합 ETF 명단과 선정 승인: **대기**, AI 특화와 소프트웨어 순도의 차이를 판단해야 함.
4. V2 등록 명세 및 선정/AUM 증거 SHA 연결: **대기**, 3단계 종속.
5. 공통 입력 의존성·예산·기존 저장 원자료 계획: **기존 planner·collector 재사용**, 실제 새 theme plan 미실행.
6. 공통 확정 원가격 수집 및 체크포인트: **미실행**.
7. 기존 R25/R32 비공개 계산·동등성/가중치 검증: **미실행**.
8. 잠정 저장 원천·overlap 검증(별도 모드): **미실행**, 확정 정상값을 잠정 결측으로 막지 않음.
9. 승인 범위의 공통 게시→D1 CAS/exact readback: **미실행**.
10. 공개 Reader/API/UI 기존10개 불변 검증: **기존 baseline 확인**, 신규 공개 미실행.
11. 기존 공통 정규 예약 자동 포함 및 실제 다음 갱신: **미관찰**.

PC 제어 저장소 `config/operations.json`(2026-11-03 조회)의 A급 허용목록에는 신규 V2 등록/실수집/게시 operation이 없다. A급 `pc-job`에 임의 스크립트를 넣지 않는다. 선택 승인 이후에 기존 공통 설치·상시 승인 계약으로 실제 등록 진입점을 연결하고 공유 Controller 적용이 필요할 경우 #68 단일 담당과 직렬 조정한다. 무관한 공용 인프라 전체 재개발은 하지 않는다.
