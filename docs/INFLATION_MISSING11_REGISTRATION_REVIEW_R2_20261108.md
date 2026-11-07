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
- PC 로컬 Core와 원격 main의 원본 차이를 보존하려고 [제어 PR #789](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/789) 병합 후 읽기 전용 삽입 검사 [#790](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/790) 요청. 최초 두 앵커 #790은 STOP, 수정된 단일 앵커 [#792](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/792) A 프리뷰 PASS였으며 현재 실PC 설치는 아래 8절 최신 증거를 따른다.
- 신규 7개 실제 수집·로컬 재조회 → 산식·공개 계약 승인 범위 확인 → D1/API/UI 검증이 필수다. **예약 자동 갱신 검증은 모든 기능 완료 후 마지막 후속**으로 둔다.

## 8. 2026-11-08 실PC source 설치·활성화·원자료 첫 조회 (당시 기록; 9절 최신)

- 공통 Writer B의 인용문 lexer 오탐을 [PR #795](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/795)로 수정, 기존 포함 42/42 PASS. 오탐 STOP #794는 재실행하지 않음.
- 신규 7개 수집/연결 source 9파일은 B [#796](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/796) `WRITER_B_INSTALLED_VERIFIED`, JSON/TXT 2/2, PC LOCAL_OVERLAY source SHA `591d43d53f043cee531ef1e02bb59716c8356b36`, 승인 source `56b8ae8bec2a2d966e1da9ea7d6c284908468e89` 확인. GitHub source merge와 실PC 설치를 구분함.
- 두 개 후보 활성화 플래그만 기존 Provider B 경로 [PR #797](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/797)·[승인 #798](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/798)로 확장. B [#800](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/800) `PROVIDER_B_APPLIED_VERIFIED`/JSON·TXT 2/2, `ZGMINI_INFLATION_CANDIDATE_CORE_APPROVED=1`·`ZGMINI_INFLATION_CANDIDATE_BOOTSTRAP_APPROVED=1`만 확인; 기존 19개 지표 플래그는 불변.
- Core A [#801](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/801) PASS. 신규 A/light 조회 모듈 [#799](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/799)·테스트 경로 수정 [#802](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/802)·B 승인 [#803](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/803). 실제 Controller-only 3파일 설치 B [#804](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/804) `SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`, JSON/TXT 2/2, actual Controller `d476c42a8d44ce30e5497b283f22d25ec77e2324`, protectedStateUnchanged=true.
- 신규 첫 A 조회 [#806](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/806) PASS/JSON·TXT 2/2. `providerCalls=0,d1Writes=0,operationalWrites=0`; **데이터 유효 3/7**: #2 EIA 520건(관측 2026-11-02), #16 관세 수납액 139건(2026-09-30), #24 PPI 203건(2026-09-01). 다른 4건: #22·#23 CPI `INVALID`, #28 Census `MISSING`, #29 Fed G17 `INVALID`. 체크포인트에서 CPI·Census는 attempted=true/processed=false; source 원인 코드는 현재 A 응답에 없어 미확정.
- #29 G17은 원자료가 1972년까지 거슬러 올라가는 반면 A 조회기가 2000년 이후 날짜만 허용하는 **검증기 오탐**을 소스 교차 검토로 확정. 유효한 19xx 날짜와 잘못된 달력일 거부를 함께 검증한 7/7 테스트 및 [PR #807](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/807) 병합; 정확히 한 Controller 파일 B 승인 [PR #808](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/808) 병합, [#809](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/809) 실PC 설치 요청 제출(본 기록 당시 **결과 미확정**). PC 설치와 A 재조회 전에는 #29를 `PRESENT_VALID`라고 선언하지 않음.
- CPI #22·#23은 동일 BLS 파일의 PPI #24 정상 확인과 `processed=false`를 근거로 미저장 가능성이 높지만 공급자·쿼터·형식 중 최초 오류 미확정. Census #28은 해당 시점 수집 시도 후 파일이 없으며 전년·당해 연도 2개 응답 중 어느 단계가 실패했는지 구분되지 않음. **이미 존재하는 내부 안전 오류 코드를 후속 진단에서 읽는 최소 개선**을 검토하되, 무조건 재시도·예약 변경·키 노출로 우회하지 않음.
- **진행률 분리:** 원본 후보 검토 **11/11**, 비중복 독립 후보 10개 중 source/PC 설치·활성화 **7/10**; 실제 저장 유효 **3/7**(나머지 4건 원인 확인 중); 신규 공개 D1/API/UI **0/7**. #15·#17·#30 정의/권리 `DEFERRED`, #27은 기존 #26의 동일 원자료라 이중 등록 없음.
- **다음 필수 실행:** #809 JSON·TXT 2/2를 회수해 #29 단일 A 재조회로 유효성 재판정. CPI·Census 현재 실패 코드를 보존적으로 확보 → 해당 원인만 수정·실PC 원자료 저장 검증. 이후 기존 19+점수 무변경 조건에서 신규 공개 연구 보조 계약의 사용자 승인 범위를 확정한 뒤 D1/API/UI 게시. **예약 자동 갱신 검증은 모든 기능 작업 완료 후** 별도 후속 단계다.

## 9. 2026-11-08 추가 실PC 검증 및 Census 수정 설치 (최신)

- #29 Fed G17 A 조회의 19xx 연도 오탐 수정은 source [PR #807](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/807) 병합 후 첫 B #809·#810에서 **승인/허용파일 내용 해시 불일치로 설치 전 STOP**. 원격 파일의 정확한 종결 개행을 기준으로 재작성한 [승인 PR #811](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/811) 이후, [실PC B #812](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/812) **SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED**, 실제 Controller source `d89d9f94753cdf55b1a1ce02ea6215ab7206f3e6`, 원본 보호 유지, JSON/TXT 2/2 확인. 실패한 ID는 재실행하지 않음.
- [A #814](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/814) PASS, 해당 Controller SHA로 실행, 공급자 GET·운영 쓰기·D1 쓰기 모두 0. **유효 저장값 4/7**로 상향: #2 EIA 520개(2026-11-02), #16 Treasury 139개(2026-09-30), #24 BLS PPI 203개(2026-09-01), #29 Fed G17 657개(2026-09-01). #22·#23 CPI는 INVALID, #28 Census는 MISSING이며 이 3개 그룹 모두 기존 checkpoint `attempted=true,processed=false`. 최초 공급자 실패 코드는 현재 보존되지 않아 미확정.
- #28 Census 공식 metadata의 `time`은 `predicateOnly=true`; `time_slot_date`는 응답형 날짜 필드임을 확인. [source PR #1015](https://github.com/ansqhd5774-Choi/zgmini/pull/1015) 병합, 실제 응답 헤더 기반 테스트 **4/4 PASS**. 기존 MTM/TI·미국 전국·SA·연도 분리·quota·raw archive는 유지.
- #28 단일 파일 수정 전/후 SHA256을 고정한 [Writer B 승인 PR #817](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/817) 병합, [실PC B #818](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/818) **WRITER_B_INSTALLED_VERIFIED**, 로컬 소스 `122bec565153f3a120ce431daec7789869ee2923`, 변경 파일 정확히 1개, JSON/TXT 2/2, 별도 예약·DB·D1 변경 없음. **수정 소스 설치는 Census 원자료 저장 성공과 별개**이므로 아직 #28 MISSING 유지.
- #22·#23 CPI는 공식 API v2 요청 2개 시계열·2007~2026(20년)과 날짜·숫자 파서에서 확정적인 소스 오류가 발견되지 않음. 기존 PPI #24 저장 PASS와 CPI `processed=false`만으로 세부 실패 단계 판단 불가. 내부 실패 코드만 제한적으로 저장하는 **미병합 초안 [PR #1013](https://github.com/ansqhd5774-Choi/zgmini/pull/1013)** 테스트 10/10 PASS. 단, 비공개 checkpoint 필드 변경이므로 **명시 승인 전 병합·PC 설치 금지**.
- 기존 공개19 계약은 정확히 19행을 요구하고 4축 점수와 분리돼 있음. 신규 7개는 별도 연구용 D1 key/API/UI 계약을 정해 승인받아야 하며, 기존 19개 행이나 기존 점수·가중치를 변경하지 않음. #15·#17·#30은 정의·권리·산식 선택 이전 `DEFERRED`; #27은 #26 PCE와 동일 원천이므로 중복 수집하지 않음.
- **최신 진행률:** 원본 후보 검토 11/11 완료. 비중복 10개 중 등록·소스 설치·활성화 **7/10**, 첫 실PC 데이터 저장 **4/7**, 공개 D1/API/UI 신규 반영 **0/7**. 기타 3개는 의사결정 대기. 
- **다음 필수 실행:** 첫 유효 Core 수집 주기에서 #28 원자료 저장·재조회 증거 확인(기존 24시간 안전 간격 유지); #22·#23은 승인된 최소 실패 코드 진단과 해당 원인별 수정만 수행. 신규 공개 계약과 보류 3개 정의는 사용자 승인 범위 확정 후 구현. **예약 자동 갱신 검증은 실제 수집·저장·공개 반영을 모두 완료한 다음 후속 작업으로만 실행**.

## 10. 7개 신규 공개 연구자료 계약 제안 — 사용자 승인 전 비구현

**상태: DRAFT/APPROVAL_REQUIRED.** 소스 설치·사설 원자료 저장 승인과 신규 공개 API 계약 승인은 서로 다르다. 이 절은 선택지 기록이며 Worker/D1/API/UI 구현·병합·배포를 허가하지 않는다.

- 제안 저장: 기존 D1 `market_public_snapshots_v1`의 **별도** 키 `detail:inflation-causal-candidates-7:r1`. 기존 19개 키 `detail:inflation-causal-public-19:r1`·연구 경로 `/api/inflation-causal-inputs`·기존 4축 점수/market-score는 변경하지 않음.
- 제안 공개 GET/HEAD: `/api/inflation-candidate-inputs`. 방문자는 이미 게시한 D1 projection만 읽음(공급자 호출·PC 원자료 접근·계산 없음). `no-store`, noindex, 잘못된 method/query 거부.
- 제안 payload: `schemaVersion=inflation-causal-candidates-7-r1-v1`, `status=READY|PARTIAL`, `score=null`, `sourceVersion`, `sourceStoredAt`, `indicators` **정확히 7행**. 각 행: `id,series,unit,status,value,previousValue,observationDate,previousObservationDate,sourceStoredAt,availableAt,history`. 관측일/수집일/게시일 별도; null/0/missing/stale 구분. 수치는 유한수·원 단위 그대로(관세 순수납액 음수도 허용). history는 원자료에서 선택한 최신 최대 13개로 제한하며 장기 전체 원자료는 공개 안 함. 성공 시 D1 재조회 및 공개 API/UI 값까지 검증.
- **판단/점수**: 일곱 행 모두 초기 표시 `연구 원자료·미평가`. 기존 4축 점수에 가중치·상승/하락 방향 판정·추정 전가율을 추가하지 않음. 부족/오류가 있으면 `PARTIAL`·해당 행 `PENDING`; 기존 정상본을 덮거나 오래된 자료를 최신이라 표시하지 않음.
- 개발 기준은 신규 UI/기능 브랜치의 오래된 파일이 아닌 최신 `main`. 승인 시 이미 있는 공통 PC 게시 B lane과 Worker/D1 readback을 재사용, 새로운 전용 CMD/예약/Cloudflare Cron은 생성하지 않음.

| 원본 번호 | 제안 공개 명칭 | series 또는 공식 선택자 | 원 단위·주기 |
|---|---|---|---|
| #2 | 미국 일반 휘발유 가격 | EIA `EMM_EPMR_PTE_NUS_DPG` | USD/갤런 · 주간 |
| #16 | 미국 관세 순수납액 | Treasury MTS `Customs Duties` / line 405 | USD · 월간(법정 세율 아님) |
| #22 | 소비자물가 임대료 | BLS `CUSR0000SEHA` | 지수 · 월간(후행) |
| #23 | 소비자물가 자가주거비(OER) | BLS `CUSR0000SEHC01` | 지수 · 월간(후행) |
| #24 | 최종수요 생산자물가 | BLS `WPSFD4` | 지수 · 월간 |
| #28 | 미국 제조업 총재고 | Census M3 `MTM/TI`, SA, US | 백만 USD · 월간 |
| #29 | 미국 제조업 산업생산지수 | Fed G17 `GMF` | 지수 · 월간 |

**승인 질문:** 기존 19개·4축 점수 완전 보존, 별도 연구용 D1 키/API/UI, 원자료 요약 7행만 공개하는 위 계약을 승인할지. 승인 전에는 신규 D1/공개 API/UI 쓰기 0건으로 유지한다.


## 11. 2026-11-08 사설 실패 코드 실PC 적용·A 조회 및 신규 7개 공개 준비 (최신)

- CPI/Census 다음 정상 수집 실패 때에만 내부 체크포인트에 안전한 정규화 오류 코드 `attempted[group].failureCode`를 선택적으로 기록하는 [기능 PR #1013](https://github.com/ansqhd5774-Choi/zgmini/pull/1013) 병합. **main 반영 source `5d2c0758f57b9ee9c3c2b910b2dd84300af85583`**. 기존 24시간 cooldown·last-good·원자료 비공개 유지, 기능 테스트 10/10 PASS.
- 제어 저장소 단일 파일 B 승인 [PR #824](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/824) 및 [PC #826](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/826) 실제 결과 **`WRITER_B_INSTALLED_VERIFIED`**, JSON/TXT 2/2, PC 운영 source `551cc9b704d7b977a9c9fe6a82c737372bfc8018`. #28 Census 수정 source를 포함한 기존 운영 base를 보존하며 진단 파일 1개만 교체. 설치는 신규 데이터 수집 성공과 별개.
- 제어 A/light 모듈에 위 선택적 필드를 안전하게 노출하는 제어 [PR #825](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/825) 병합 `ece6573862a68badd02d169c09e486f0970468fd`, 테스트 9/9 PASS. B 승인 [PR #827](https://github.com/ansqhd5774-Choi/zgmini-pc-control/pull/827), [PC 설치 #828](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/828) 실제 **`SUCCEEDED/APPROVED_UPDATE_AND_DIAGNOSTIC_VERIFIED`**, actual Controller `ece6573862a68badd02d169c09e486f0970468fd`, 보호 상태 불변, JSON/TXT 2/2.
- 바로 이어 [A 조회 #830](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/830) 실제 **`PASS/INFLATION_CANDIDATES_RUNTIME_READONLY_EVIDENCE`**. 원격 결과 `results/42425514780-1-seat-4.json` 및 TXT 모두 직접 조회; Controller `ece657...`, 운영 source `551cc9...`, 원자료/운영/D1 쓰기 0, 공급자 호출 0, 보호 상태 전후 SHA 일치. **유효 4/7 그대로**: #2 EIA 520, #16 Treasury 139, #24 PPI 203, #29 G17 657. #22·#23 CPI `INVALID`, #28 Census `MISSING`. 기존 checkpoint에 아직 `failureCode:null`인 것은 **신규 수집 실패 원인 확정이 아님**. 마지막 Core 시도 `2026-11-07T22:40:02.928Z`; 24시간 안전 간격 전 강제 재시도 금지, 이후 정상 수집 결과로 원인별 수정 결정.
- 기존 기능 브랜치 `fix/economic12-inflation-legacy4-r35-20261021`에 **별도 연구용 신규 7행** catalog/read-only preview/공개 validator+reader/별도 D1 Writer/대상 테스트 등 정확히 신규 6파일을 작성. 최신 작성 SHA `30bc6c457fd714793f949f60ec2295072729e607`, 독립 테스트 **25/25 PASS**. 점수 `null`, 기존 19행·기존 4축 점수·D1 운영값 불변. **main 회수·실PC 신규 게시기 설치·D1 기록·신규 API route·UI·Production 검증은 모두 미완료**이며 source 작성만으로 게시 완료가 아님.
- 남은 게시 계약 이슈: 이전 `READY` 행이 신규 수집 시 `PENDING`이면 Writer가 last-good 보호를 위해 전체 게시를 거부하여 다른 행의 정상 갱신까지 막을 수 있음. 원출처·관측일·저장 시각의 진실성을 유지하는 보존 표현 계약 결정 전 무조건 fallback 금지.
- 최신 GitHub `main`(`fcfd4468dc24c5d38763c78a2a4732c76c0628ad`) 대비 기능 브랜치는 43커밋 앞/927 뒤, UI 전용 `codex/ui-improvements`는 261 앞/389 뒤. **분기 전체 병합·stale 파일 덮어쓰기 금지**. 사용자 지정 UI 브랜치에서 개별 변경을 작성해도 검증된 파일의 최신 main 선택적 회수·리뷰가 별도로 필요.
- **현 진행률:** 원래 미등록 11개 검토 **11/11**, 중복 제거된 독립 10개 중 source·PC 활성화 **7/10** (#15/#17/#30 보류), 실제 유효 원자료 저장 **4/7**, 신규 7개 공개 D1/API/UI **0/7**. 기존 #26/#27 PCE 동일 원자료의 이중 등록 없음.
- **다음 필수 행동:** 이미 설치한 진단을 다음 정상 Core 실행 checkpoint에서 조회하고 CPI/Census 최초 실패 코드만 근거로 최소 수정; 한편 7개 게시 계약의 last-good 보존 표현·브랜치 선택적 통합 경로 확정 후 PC 게시 B → D1 readback → GET → UI Production 검증을 진행한다. #15/#17/#30은 정의·권리 승인 전 등록하지 않는다. **예약 자동 갱신 검증은 모든 실제 게시 작업 완료 이후 추가 후속**으로만 둔다.
