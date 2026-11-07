# ZGMINI 물가지표 — 미등록 11개 원본 후보 등록 검토 R2

- 기준일: 2026-11-08 KST
- 연구·작업 브랜치: `fix/economic12-inflation-legacy4-r35-20261021`
- 최신 운영 개발 기준: `ansqhd5774-Choi/zgmini` `main`
- 원본 후보 명부: [INFLATION_CAUSAL_31_FEASIBILITY_R1.md](INFLATION_CAUSAL_31_FEASIBILITY_R1.md)
- **범위:** 추가 원자료 후보 식별·등록 검토·기존 공통 수집기 재사용 계획. 이 문서는 새로운 산식·주기·DB·D1·운영 source를 승인하거나 변경하지 않는다.
- **예약 검증은 기능 수집→저장→계산/표시→공개 검증 종료 후에만 진행하는 후속 작업이다.**

## 1. 확정된 분모

- 원래 번호 1–31 중 #20 국제운송비는 대표성과 권리 문제로 후보 제외.
- #26 실질 PCE와 #27 실질 PCE 성장률은 동일 원자료. **별도 수집/가중치 중복 없음.**
- 기존 공개 연구 원자료 **19개**, 기존 legacy 4축과 구분.
- 이번 원래 번호상 미등록 **11개**. 원자료로 독립 추가 가능한 것은 **최대 10개**. 이 숫자는 배포 목표/승인이 아니다.
- 다른 PR의 '반복 입력 11개'(BLS8 + 가스1 + 전기1 + SCE1)는 이미 공개된 19개의 갱신 입력에 해당하며, 여기의 누락 후보 11개와 혼동하지 않는다.

## 2. 11개별 소스·중복·실행 판정

| 번호 | 원래 명칭 | 1차 공식 source | 최신 main에서 재사용 근거 | 판단 / 다음 단일 검증 |
|---|---|---|---|---|
| #2 | 휘발유 가격 | EIA 주간 U.S. Regular Gasoline (`EMM_EPMR_PTE_NUS_DPG`); 원본 FRED 별칭 `GASREGW` | `GASREGCOVM`은 현행 PIT/공급충격 입력에 존재하나 주간 일반 휘발유와 **동일 시계열이 아님** | EIA 직접 API v2의 정확한 facet/주간 관측 계약 검증; WTI 중복 표시. 새로운 FRED 보관 경로는 만들지 않음 |
| #15 | 품목·국가별 법정 관세율 | USITC HTS, Revision·Chapter 99 | 단일 수치 직결 경로 미확인 | 세율 기준 품목·국가·예외·법적 효력일 정의가 먼저. 승인 없이 국가 평균으로 축약하지 않음 |
| #16 | 실제 관세 수납액 | 재무부 MTS Table 4, Customs Duties | 기존 전용 수집기 미확인 | 공식 `mts_table_4` endpoint 및 반환 필드·월간 순/총수납·환급 단위 식별; 가격 전가율로 오인 금지 |
| #17 | 관세 대상 수입 노출 비중 | USITC DataWeb Customs Value | 기존 전용 합성 경로 미확인 | Login.gov + 6개월 유효 API key 필요; 수입액 분모 및 품목범위 정의·공개권 확인 선행 |
| #22 | CPI 임대료 | BLS `CUSR0000SEHA` | 기존 19에 없음; BLS 공통 수집기 재사용 가능 | 수집은 별도 보조 관측. **선행 원인 점수에는 넣지 않음** |
| #23 | CPI OER | BLS `CUSR0000SEHC01` | 기존 19에 없음; BLS 공통 수집기 재사용 가능 | 수집은 별도 보조 관측. CPI 중복 계산 및 선행성 혼동 금지 |
| #24 | 최종수요 PPI | BLS `PPIFIS` | `worker/inflation-pit-backfill.mjs`의 `INFLATION_PIT_SERIES`에 있음 | 새 Provider 호출보다 **기존 PC 저장본의 실제 존재·시점·권리**를 읽기 전용 확인하고 연결 |
| #27 | 실질 PCE 성장률 | BEA `T20306` | 19개 목록의 #26 실질 PCE와 원자료 공통 | **중복 통합 판정 완료. 추가 원자료 수집기 0개**; 성장률은 승인된 후처리 표시에만 사용 |
| #28 | 제조업 재고 | Census M3, 전체 제조업 `MTM` / 총재고 `TI` / 계절조정 | `growth-r2-forward-provider-r1.mjs` G016 매핑 구현됨 | 실제 Growth 저장본·API 키·월간 수정 기록 확인 후 **공통 저장원 재사용** |
| #29 | 제조업 생산 | Fed G.17 직접 text `ip_sa.txt`, `GMF` | `growth-r2-forward-provider-r1.mjs` G020 매핑 구현됨 | 실제 Growth 저장본 재사용; 연준의 2026-11-09 DDP 'Build Your Package' 제거 예정에 의존하지 않음 |
| #30 | 공급 부족 | Census M3 주문잔고/출하/재고 + Fed 가동률 | M3 `UO`, `VS`, `TI` 및 G.17 `GMF` 가동률 구현 일부 존재 | 단일 공식 관측 시계열이 아니라 **자체 파생지표 정의 필요**; 주문 증가를 공급부족으로 오판하지 않도록 수요 효과 통제·산식 승인 전 점수/공개 미등록 |

**판정 범주:** #27 원자료 중복 해소 1개 / #2·#16·#22·#23·#24·#28·#29 공식 소스·재사용 경로 추가 검증 7개 / #15·#17·#30 정의·권한 결정 선행 3개. '공식 source 존재'는 PC 수집·DB 저장·D1 공개 성공을 의미하지 않는다.

## 3. 권리·원본 검증 기록

- BLS 공식 공개 통계는 원칙적으로 공공영역이며 BLS 출처를 표시: https://www.bls.gov/opub/copyright-information.htm
- EIA 공식 API는 무료 등록키, 출처 표시/비후원 표기 및 제한 준수: https://www.eia.gov/opendata/terms-of-service.php
- EIA 미국 일반 휘발유 주간 원표: https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=W&n=PET&s=EMM_EPMR_PTE_NUS_DPG
- Treasury 공식 MTS: https://fiscal.treasury.gov/accounting/monthly-treasury-statement , https://fiscaldata.treasury.gov/api-documentation/
- USITC HTS(2026 Revision 22 및 이전 판본): https://www.usitc.gov/harmonized_tariff_information
- USITC DataWeb API·키 계약: https://dataweb.usitc.gov/api-key
- Census M3 API와 API 키 필요 공지: https://api.census.gov/data/timeseries/eits/m3/examples.html
- Fed G.17 제조업 직접 월간 파일과 형식/개정 공지: https://www.federalreserve.gov/releases/g17/download.htm , https://www.federalreserve.gov/releases/g17/Current/ipdisk/ip_sa.txt
- FRED의 신규 API 이용 조건은 별도로 확인해야 하므로 **이번 신규 수집 후보에 FRED 재보관 의존을 추가하지 않음**: https://fred.stlouisfed.org/news/2024/06/weve-updated-our-terms-of-use-action-requested

## 4. 다음 실행 — 최소 공통 경로

1. **Read-only 원자료 재사용 확인 (최우선):** #24 PPIFIS, #28 G016, #29 G020, #2 월간 연관계열이 실제 PC 저장/checkpoint에 있는지 기존 승인 A급 좁은 조회로 검사. 운영 자료를 전량 출력하지 않고 series id·건수·마지막 관측일·저장일·source SHA만 회수한다. 설치되지 않은 operation은 승인된 공통 최소 A 모듈만 정상 등록 후 사용. 예약 검증이 아님.
2. **소스 정의/단위 검증:** #2 EIA 직접 주간 데이터, #16 Treasury Table 4, #22/#23 BLS 두 시계열을 공통 수집기 구조에서 설계·fixture 테스트. API 키는 PC 기존 설정에서만 재사용; 공개 GitHub·결과에 출력 금지.
3. **정의/권리 미완료 3건 분리:** #15 관세율 품목·효력일, #17 관세 노출비중 분모와 DataWeb 접근, #30 수급부족 산식을 별도 합의. #22/#23은 후행 보조 목록으로 독립 표시.
4. **실제 수집·로컬 재조회 → 승인 범위 게시 계약 확장 → D1/API/UI 검증:** 현행 19/19와 기존 4점수는 보존하고, 별도 연구 관측의 상태·관측일·수집일·게시일을 표시. 데이터 없으면 PENDING, 마지막 정상 수치는 보존한다. 데이터 게시마다 Git 재배포를 요구하지 않음.
5. **전 단계 종료 후 후속:** 실제 등록·공개 완료 뒤에만 기존 PC 공통 예약 자동 갱신을 관찰/검증한다. 신규 독립 예약·기능별 CMD 없음.

## 5. 완료·미완료 구분

- **DONE:** 원본 11개 명칭 복원, #27 중복 판정, 위 공식 source/기존 코드 교차 점검, 최소 경로 선정.
- **NOT DONE:** 신규 10개 원자료 실제 PC 등록·수집/저장·D1/API/UI 갱신, #15/#17/#30 정의·권리 승인, 예약 자연실행 검증(후속).
- **현재 작업 진행률:** 등록 검토 대상 11개 중 **1개 중복 정리 완료(1/11)**, 나머지 10개는 실제 등록 PASS가 아님. 연구 문서 작성만으로 진행률을 올리지 않는다.
