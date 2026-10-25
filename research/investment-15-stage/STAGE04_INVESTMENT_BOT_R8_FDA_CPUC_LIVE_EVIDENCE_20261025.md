# AI 자동 투자 봇 — 04단계 공식 산업 원자료 자동 연결 R8

기준일: **2026-10-25 (KST)**  
브랜치: `codex/investment-15-stage-m2-r25-20261025`  
실행 상태: **기존 테마 F 9/9 + 4개 산업 공식 원자료 4/9**, `READ_ONLY / UNRANKED / NO_TRADE`.

## R7 → R8: 추가 연결 2개

| 산업(대용변수) | 공식 원자료 확인 방법 | 최신 관측 원값 | 성장률·가속도 | 한계 |
|---|---|---|---|---|
| 바이오·신약(FDA CDER) | 2025 FDA 원본 PDF 전체 SHA256 **매 실행 재검증**, 단일 2025 판본 내 2016~2025 도표 10건 기검수 | 2025 **46건**(2024=50, 2023=54) | YoY **-8.0000%**, 전년 YoY 대비 **-0.5926%p** | 2025 확정 보고서만 반영. **2026 실시간 갱신이 아니며** PDF가 바뀌면 오류·결측 처리. 미국 CDER 신규승인 건수는 전체 바이오 산업 규모가 아니다. |
| 자율주행(CPUC Waymo) | 공식 분기 페이지에서 최신 4분기 ZIP 링크 발견 → ZIP 중앙 디렉터리와 **AV_Month 월별 집계 CSV만 HTTP Range로 다운로드**, CRC 검사 후 합계 | 2026Q2 **4,220,075건**(2025Q2=2,234,912, 2026Q1=3,905,934, 2025Q1=1,818,206) | 전년동기 **+88.8251%**, 직전 분기 전년동기 성장률 대비 **-25.9984%p** | 캘리포니아 Waymo 운행 실적에 한정. 역사 성장률 비교 1개/가속도 과거 표본 0개. 2025부터 달력 분기 기준, 그 이전 자료와 무단 연결 금지. |

FDA 2025 PDF 공식 URL: <https://www.fda.gov/media/190705/download>  
동일 파일 SHA256: `28818ae67b755166d1e16886b2968d47941b0f27e88ae7548a4a52facac6a9dc`  
FDA 공표 자료에 등장한 10년 연도별 건수: **2016=22, 2017=46, 2018=59, 2019=48, 2020=53, 2021=50, 2022=37, 2023=54, 2024=50, 2025=46**. 동일 판본 도표만 사용. 차기 연도 승인 신원 변동은 코드 재검토 필요.

CPUC 공식 페이지: <https://www.cpuc.ca.gov/regulatory-services/licensing/transportation-licensing-and-analysis-branch/autonomous-vehicle-programs/quarterly-reporting>. 2025Q1, 2025Q2, 2026Q1, 2026Q2의 **Day/Trip/Incident CSV 접근 없음**. 압축 파일 전체 다운로드 없음. 네 ZIP 간 집계 CSV 파일명·날짜 표기·쉼표 숫자 형식 차이를 정규화하되 값·누락을 추정하지 않는다.

## R8 통합 검증

실행 명령(개발 측): `NODE_USE_ENV_PROXY=1 node research/investment-15-stage/stage04/investment-bot-gate-readonly.mjs`.

- 실제 HTTP 실행 종료 코드 `0`.
- `runType=INVESTMENT_BOT_STAGE04_INPUT_GATE_R8`, `status=LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED`, `inputContractValid=true`.
- 현재 F **9/9**, API 원문 `sourceStoredAt=2026-10-25T05:00:27.721Z`; 각 테마 F 관측일은 **2026-10-23**. 바이오 F=**22.63294, PROVISIONAL**. 2025 FDA 확정 관측과 F 2026-10-23을 **동시 관측값으로 간주하지 않는다**.
- 산업 공식 원문 자동 검증 **4/9**: 핀테크 FedNow, 클라우드 Eurostat, 바이오 FDA, 자율주행 CPUC.
- 불확실 5개: **로봇·자동화(IFR), 원전·SMR(IAEA), 방산(SIPRI), 사이버보안(ENISA), 데이터센터·전력(IEA)**는 원값·G·D·M 미확정(`null`). 통과 실패나 투자 부적격이 아니다.
- 모두 `approvedGrowthG=null`, `approvedDislocationD=null`, `approvedAttractivenessM=null`, `officialRank=null`, `automatedTradeEnabled=false`, `orderRequests=[]`.
- 단위 검사: 기존 F **5/5**, 기존 Gate/FedNow/Eurostat 확장 **12/12**, 신규 FDA/CPUC 원문·해시·CRC·범위 다운로드 **6/6**. 총 **23/23 PASS**.
- 개발 측 Node 실측 PASS이며 **사용자 Windows CMD 환경 실측 미확인**. 동의 없는 스케줄러 등록·자동 배포·데이터 영구 저장 없음.

## 실패 보존 설계

1. FDA URL 이동·PDF 내용 교체·해시 변경 → `FDA_CDER_SOURCE_VERSION_DRIFT` 등 오류; **정적인 46건을 검증된 2026 데이터로 재사용 금지**.
2. CPUC 링크 변경·권한 거절·ZIP 구조·CRC 오류·분기/월 누락 → 자료 `null`; 과거 스냅샷 자동 대체 없음.
3. 한 소스 실패 시 나머지 정상 F·산업 원값은 보존, 실패 산업만 미관측 처리. **부분 실패로 매매 실행 금지**.
4. 공식 성장률은 어디까지나 프록시 원값이다. **G1/G2·G·D·M 퍼센타일 하한 및 가중치 60/40·70/30 미승인**. 시점·지리적 범위·표본이 다른 산업의 공식 투자 순위 생성 불가.

## 다음 단계

1. 04단계 남은 5개 산업 공식 원문 동일 판본·표본/계약 정의·이용권 검토. 라이선스 애매한 원자료 재배포 없이 **독립 연구**만 유지.
2. CPUC 월별 공식 데이터 **과거 분기 추가**는 승인된 2025 이후 달력분기 안에서만 조사; 충분한 표본 없으면 백분위 계산 보류.
3. FDA 다음 연례 보고서가 공개되면 새 판본의 전체 10년 데이터를 새로 검수하고 해시 갱신하는 **명시적 버전 전환 절차** 마련.
4. 정량 G/D/M 임계·가중치 사용자의 명시 승인과 별개로, 15단계 봇 상태 오케스트레이터·증거 원장 및 사용자 수동 주문 게이트를 먼저 안정화.

관련 기록: `STAGE04_INVESTMENT_BOT_R7_LIVE_EVIDENCE_20261025.md`는 R7 당시의 2/9 실측으로 보존. R8이 R7 이력을 삭제하지 않는다.
