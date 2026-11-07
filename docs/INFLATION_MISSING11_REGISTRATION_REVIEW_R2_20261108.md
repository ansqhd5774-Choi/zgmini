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
| #23 | CPI OER | BLS `CUSR0000SEHC01` | 기존 19에 없음; BLS 공통 수집기 재사용 가능 | **주거주지 OER** 원계열을 보조 관측. 전체 OER `CUSR0000SEHC`로 바꿔치기 금지, CPI 중복·선행성 혼동 금지 |
| #24 | 최종수요 PPI | BLS `WPSFD4` (최종수요 PPI) | Worker/D1에 PPI 관련 별도 경로가 있으나 **WPSFD4와 동일한 series ID임은 미확인**, PC 원자료로 재사용하지 않음 | 기보유 D1의 ID·시점은 승인된 좁은 읽기 경로로 확인하되, PC 원자료 저장을 별도로 구축·검증. D1을 PC 원자료 원본으로 역이용하지 않음 |
| #27 | 실질 PCE 성장률 | BEA `T20306` | 19개 목록의 #26 실질 PCE와 원자료 공통 | **중복 통합 판정 완료. 추가 원자료 수집기 0개**; 성장률은 승인된 후처리 표시에만 사용 |
| #28 | 제조업 재고 | Census M3, 전체 제조업 `MTM` / 총재고 `TI` / 계절조정 | `growth-r2-forward-provider-r1.mjs` G016 매핑 구현. 현재 Growth 저장기는 **D1**, PC 원자료 아님 | G016 parser/공식 식별자 재사용 가능성 검토, PC 원자료 수집·재조회 계약 별도 구현 필요 |
| #29 | 제조업 생산 | Fed G.17 직접 text `ip_sa.txt`, `GMF` | `growth-r2-forward-provider-r1.mjs` G020 매핑 구현. Growth 운영 저장은 **D1**, PC 원자료 미확인 | 공식 G.17 직접 텍스트 형식 재사용해 PC 원자료 먼저 저장. 2026-11-09 DDP 'Build Your Package' 제거 예정에 의존하지 않음 |
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
- Treasury MTS Table 4 직접 API의 **Customs Duties/405** 139개월과 순수납 일치는 별도 공식 실조회로 검증 완료: https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_4
- FRED의 신규 API 이용 조건은 별도로 확인해야 하므로 **이번 신규 수집 후보에 FRED 재보관 의존을 추가하지 않음**: https://fred.stlouisfed.org/news/2024/06/weve-updated-our-terms-of-use-action-requested

## 4. 다음 실행 — 최소 공통 경로

1. **Read-only 원자료 재사용 확인 (기존 검토 완료):** #24 WPSFD4, #28 G016, #29 G020, #2 월간 연관계열의 **기존 Worker/D1 등록과 PC 원자료 존재 여부를 구분**. 승인된 D1 최소 조회로 기존 기록의 ID·시점만 확인하고, 별도로 PC 저장/checkpoint가 실제 있는지 승인된 좁은 A급 경로에서 검사. 운영 자료를 전량 출력하지 않고 series id·건수·마지막 관측일·저장일·source SHA만 회수한다. 설치되지 않은 operation은 승인된 공통 최소 A 모듈만 정상 등록 후 사용. 예약 검증이 아님.
2. **소스 정의/단위 검증:** #2 EIA 직접 주간 데이터, #16 Treasury Table 4, #22/#23 BLS 두 시계열을 공통 수집기 구조에서 설계·fixture 테스트. API 키는 PC 기존 설정에서만 재사용; 공개 GitHub·결과에 출력 금지.
3. **정의/권리 미완료 3건 분리:** #15 관세율 품목·효력일, #17 관세 노출비중 분모와 DataWeb 접근, #30 수급부족 산식을 별도 합의. #22/#23은 후행 보조 목록으로 독립 표시.
4. **실제 수집·로컬 재조회 → 승인 범위 게시 계약 확장 → D1/API/UI 검증:** 현행 19/19와 기존 4점수는 보존하고, 별도 연구 관측의 상태·관측일·수집일·게시일을 표시. 데이터 없으면 PENDING, 마지막 정상 수치는 보존한다. 데이터 게시마다 Git 재배포를 요구하지 않음.
5. **전 단계 종료 후 후속:** 실제 등록·공개 완료 뒤에만 기존 PC 공통 예약 자동 갱신을 관찰/검증한다. 신규 독립 예약·기능별 CMD 없음.

## 5. 완료·미완료 구분

- **DONE:** 원본 11개 명칭 복원, #27 중복 판정, 위 공식 source/기존 코드 교차 점검, 최소 경로 선정.
- **NOT DONE:** 신규 10개 원자료 실제 PC 등록·수집/저장·D1/API/UI 갱신, #15/#17/#30 정의·권리 승인, 예약 자연실행 검증(후속).
- **현재 작업 진행률:** 등록 검토 대상 11개 중 **1개 중복 정리 완료(1/11)**, 나머지 10개는 실제 등록 PASS가 아님. 연구 문서 작성만으로 진행률을 올리지 않는다.

## 6. 2026-11-08 소스 구현·검증 실적 (운영 설치와 구분)

- 구현 기준 repo: `ansqhd5774-Choi/zgmini`, 기존 기능 브랜치 `fix/economic12-inflation-legacy4-r35-20261021`.
- **신규 후보 7개에 대한 원자료 수집 5개·one-shot dispatcher 1개·Core bridge 1개 및 각 테스트(총 14개 파일)를 기능 브랜치에서 시작해 선별 PR로 main에 병합**. 기존 공개19 저장·4축 점수·Core 예약·D1/API/UI는 수정하지 않음.
- #22/#23 CPI와 #24 PPI는 `inflation-causal-candidate-bls3.mjs`가 발표 이벤트별 cpi/ppi 입력을 구분. #16은 `inflation-causal-candidate-treasury.mjs`, #29는 `inflation-causal-candidate-fed-g17.mjs`, #28은 `inflation-causal-candidate-census-m3.mjs`, #2는 `inflation-causal-candidate-eia-gasoline.mjs`.
- 모든 소스 위치: `scripts/pc-writer/`이며 같은 basename + `.test.mjs` 5개를 함께 추가. 신규 사설 경로 `inflation-causal-candidates-r1/`를 사용하며 이전 `inflation-causal-r1/` 및 게시19는 건드리지 않음.
- **로컬 `node --test inflation-causal-candidate-*.test.mjs` = 37/37 PASS.** 잘못된 series·월·국가·단위·수치·중복·필수 키·할당량 제어 부재를 차단하고, 이전 정상 저장본 보존·원자료 SHA·재조회·정정월 갱신을 검증.
- #16 재무부 MTS `line_code_nbr=405` / `classification_desc=Customs Duties` 공식 실조회: 2015-03~2026-09 **139/139개월** 전부 월말·해당 행·월 순수납(`gross-refund=net`) 정합, 금액의 음수 3건 보존. 센트 정수 기반 검증. `classification_id`는 가변이므로 고정키 사용 안 함.
- #2 EIA 공식 v2 경로 및 `EMM_EPMR_PTE_NUS_DPG` facet 확인. **실제 키 기반 API 응답은 아직 미확인**이므로 공급자 응답·단위 단회 확인 전 활성화 금지. 실패 시 마지막 정상 원자료 보존.
- #29 Growth G020의 `CHAIN_LINKED_PIT_INDEX` 가공값을 원본으로 재사용하지 않고 Fed `ip_sa.txt`의 `GMF` 직접 파싱. #28 Growth G016 매핑 `MTM/TI`만 재사용, D1 원자료를 PC 소스로 간주하지 않음.
- **실제 PC 등록·설치·실수집·checkpoint·공개 D1/API/UI 확인은 아직 0건**. 소스 구현을 운영 설치 성공으로 계산 금지.

### 다음 필수 실행 순서 (예약 검증 후순위)

1. 원담당이 새 후보를 기존 Core lock/공통 quotaFetch 아래 격리 경로로 호출하는 **기능 연결 코드·테스트**를 추가. 기존 인플레19 GROUPS/flag/checkpoint를 확장해 계약을 깨지 않고, 동일 신규 후보로 기능별 예약·CMD를 생성하지 않음.
2. #2 EIA 단회 실제 응답 확인, #16·#22·#23·#24·#28·#29의 승인된 PC 공급자 GET·로컬 저장·재조회. 신규 source/조회·활성화 효과는 승인된 공통 B/A 범위와 정확한 manifest로 등록. 기존 설치 성공을 가정하지 않음.
3. #15 관세율 법정 적용범위, #17 DataWeb 계정·권리·수입액 분모, #30 파생 산식은 승인 결정 전 별도 `DEFERRED`; #27은 기존 #26과 중복으로 별도 수집·가중치 없음.
4. 승인 범위의 연구 보조 관측 공개 계약·D1/API/UI 확인 후, **마지막 후속 작업으로만 예약 자동 갱신 검증**.

### 진행률 명시

- 원본 후보 판별·원천 검토 **11/11 완료**.
- 비중복 독립 후보 10개 중 **7개 소스 구현·fixture 통과**, **3개 정의·권리 보류**. **소스 구현률 7/10**이며 실제 등록률과 다름.
- **실제 신규 PC 등록·원자료 저장·공개 완료: 검증된 0/10**. 이후 현장 Runtime 증거로만 상향.

## 7. 교차 코드 검토·실패 재현 반영

- 독립 코드 리뷰에서 **Census M3 `time_slot_id` 오해**를 실제 공식 문서와 대조해 발견. 이 필드는 내부 숫자 ID(공식 예시 `1329`)이고 관측월은 별도 `time` (`2012-01`). 수집 모듈과 테스트의 날짜 파싱을 `time` 기준으로 수정; 공식형 fixture로 재검증. https://www2.census.gov/data/api-documentation/EITS_API_User_Guide_Dec2020.pdf
- Treasury MTS `Customs Duties / line_code_nbr=405`는 실제 139개월 API 응답을 통해 독립 확인했고, 센트 단위 `gross - refund = net` 139/139 일치. 단순 인공 fixture 근거가 아님.
- **공통 quota 정합성 주의:** 현재 `main` `scripts/pc-writer/quota-policy.mjs`는 `api.fiscaldata.treasury.gov` 및 `www.federalreserve.gov`를 provider로 등록하지 않음. 기존 `quota-fetch.mjs`는 미등록 호스트를 quota 원장 없이 통과하므로, #16·#29 활성화 이전에 공식 호스트를 공통 quota 정책에 최소 등록·검증해야 함. 임의 수집 주기나 과도한 하드 임계치는 추가하지 않음. 현재는 수집 코드/테스트일 뿐 호출자가 미설치.
- 정확히 지정된 6개 source group으로 7 후보를 한 번씩 호출하도록 **기본 비활성 상태의 명시 범위 one-shot dispatcher** `scripts/pc-writer/inflation-causal-candidate-once.mjs` 및 fixture 테스트 추가. 새로운 Core 훅·예약·운영 플래그를 생성하지 않았고, 호출량은 그룹별 1회(단 Census M3 2회) 제한.
- 교차 리뷰 및 Core bridge 반영 후 `node --test inflation-causal-candidate-*.test.mjs` **37/37 PASS**. 이는 모의 응답+로컬 저장 단계, PC 실수집/공개 배포 PASS 아님.

**현재 실행 차단의 정확한 범위:** 승인/설치되지 않은 신규 후보 source 7개를 PC에서 실행할 수 없음. 그러나 이 상태는 기존 19개 자동 수집과 다른 기능의 정지를 뜻하지 않는다. 예약 자연 검증은 마지막 후속 단계로 유지한다.

- 공통 공식 호스트 등록 [PR #1007](https://github.com/ansqhd5774-Choi/zgmini/pull/1007), 신규 수집/dispatcher [PR #1008](https://github.com/ansqhd5774-Choi/zgmini/pull/1008), 오류코드 보호 [PR #1010](https://github.com/ansqhd5774-Choi/zgmini/pull/1010), 기본 OFF Core bridge [PR #1011](https://github.com/ansqhd5774-Choi/zgmini/pull/1011) **모두 main 병합 완료**. 소스 병합은 실제 PC 설치나 API 호출·D1 게시 완료가 아님.
- 실제 PC 조회 [#785](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/785)–[#788](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/788): `baseHead=config.source=9040e821…` (PC 로컬 전용), `local-cycle.mjs` 원본 SHA-256 `bf8842…`, `quota-policy.mjs` 원본 SHA-256 `c57b70…`, Core Task XML SHA `dd8198…`. #788의 Alpaca ledger 상태는 `ALPACA_LEDGER_ABSENT`, 별개 데이터 상태이며 수집 후보 설치 성공 아님.
- PC 로컬 Core와 원격 main의 원본 차이를 보존하려고 [제어 PR #789](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/789) 병합 후 읽기 전용 삽입 검사 [#790](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/790) 요청. **A 프리뷰 PASS/실제 B 설치는 아직 미확인.**
- 이후 필수: #790의 결과 JSON/TXT를 직접 재조회 → 실측 afterSha256와 보호 해시로 정규 Writer B manifest 단회 설치 → 활성화 범위 확인 및 실제 원자료 수집·재조회 → 기존 산식/권한에 맞는 계산·공개 계약 확인. 예약 검증은 마지막.
