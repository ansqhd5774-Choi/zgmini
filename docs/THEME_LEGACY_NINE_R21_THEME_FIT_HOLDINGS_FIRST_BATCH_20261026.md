# 기존 9개 테마 — R21 실제 구성종목 기반 테마 적합성 1차 검토

> 2026-10-26 / 브랜치 `research/theme-nine-r2-shadow-20261026` / 비공개 연구만 / **운영 반영·가격 수집 0**
>
> **사용자 지시로 R21 후속 심사 및 WR 편입 재검토 권고 철회 (2026-10-26).** 아래 보유 구성·중복 비율은 과거 조사 흔적일 뿐 승인 산식의 입력·감점·제외 기준이 아니고, 나머지 55개 재조사도 수행하지 않는다. 확정된 63개 ETF 후보/64 편입 위치는 변경하지 않는다. **향후 작업은 [R22 승인 6단계 도구 배정](THEME_LEGACY_NINE_R22_SIX_STAGE_TOOL_ASSIGNMENT_20261026.md)만 따른다.**

## 후보 확정 범위

- 사용자는 R19의 **9개 테마·ETF 고유 63종/편입 위치 64개**를 **3개 O/X 조건 통과 후보**로 확정했다. 후보 수량의 최소/최대/목표 없음.
- [R20 후보 승인 JSON](../config/theme-nine-r20-approved-candidates.json), [R19 ETF별 O/X 증거](../config/theme-nine-r19-three-gate-ox-verified.json)
- 후보 승인과 실제 신규 산식 채택은 별개. 보유 구성·테마 적합성·중복/편중·실제 40/252 세션·공식 AUM·비공개 점수 검산 후 추가 승인.

## 이번 단계에서 검토한 범위

- R14 `SCOPE_REVIEW` **9개 후보 위치**에 대해 공식 발행사 자료를 읽어 테마 범위가 넓은 부분을 표시하였다. 그중 **6개**는 날짜가 표시된 실제 포트폴리오 수치 확인, **3개**는 펀드 투자목적·과거 포트폴리오 범위를 확인했으며 최신 동일일 전체 holdings 비중은 미확인이다.
- R14의 나머지 `CORE_FIT_CANDIDATE` **55개 편입 위치**도 실제 보유 구성 정량 평가 대상이며, 이번 조사로 그 55개가 자동 최종 합격된 것은 아니다.

| 테마 | ETF | 공식 관측일 | 확인된 구성·사업 노출 | 산식 판단 |
| --- | --- | --- | --- | --- |
| 로봇·자동화 | [ARKQ](https://www.ark-funds.com/funds/arkq) | 최신 비중 미확인 | 자율 기술·로봇 **결합 80% 이상** 투자정책. 에너지·운송·배터리·우주·로봇 등이 혼합됨 | **후보 유지**, 추가 분해 필요 |
| 클라우드·SaaS | [CLOD](https://themesetfs.com/etfs/clod) | 2025-12-31 | 클라우드 외 디지털 보안·전자상거래·데이터 인프라 포함. 2025-12 보고서 기반 | **후보 유지**, 추가 분해 필요 |
| 자율주행 | [BOTZ](https://www.globalxetfs.com/funds/botz) | 2026-10-02 | Fanuc 8.27%, Intuitive Surgical 8.16%, NVIDIA 8.08%. 자율주행 관련 Aurora Innovation 2.42%; 전체 자율주행 비중은 미확인 | **후보 유지**, 추가 분해 필요 |
| 자율주행 | [HAIL](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-kensho-smart-mobility-etf-hail) | 2026-10-20 | 자동차 부품 16.56%, 완성차 16.34%, 반도체 11.64%, SW 11.03%, 항공·방산 6.34%의 광범위 모빌리티 | **후보 유지**, 추가 분해 필요 |
| 자율주행 | [KARS](https://kraneshares.com/etf/kars/) | 2026-10-23 | 배터리·EV·자율주행 가치사슬 혼합. Samsung SDI 5.28%, Tesla 5.02%, BMW 4.58%, BYD 4.56% | **후보 유지**, 추가 분해 필요 |
| 원전·SMR | [URNM](https://sprottetfs.com/urnm-sprott-uranium-miners-etf/) | 2026-10-23 | 9/30 우라늄 관련 주식 80.43%, 실물 우라늄 19.57%; URNJ와 10/23 동일 보유기업 20개 | **후보 유지**, 추가 분해 필요 |
| 원전·SMR | [URNJ](https://sprottetfs.com/urnj-sprott-junior-uranium-miners-etf/) | 2026-10-23 | 9/30 우라늄 관련 주식 100%; URNM과 10/23 동일 보유기업 20개 | **후보 유지**, 추가 분해 필요 |
| 방산 | [WR](https://corgiinvest.com/wr) | 2026-10-21 | 에너지 **59.22%**, 산업재 20.85%, 기술 8.18%. ExxonMobil 9.06%, Chevron 6.66%, RTX 4.81% | **후보 유지**, 방산 편입 재검토 |
| 핀테크 | [ARKF](https://www.ark-funds.com/funds/arkf) | 최신 비중 미확인 | 2025-11-23부터 블록체인+핀테크 **결합 80% 이상** 전략. 핀테크 단독 보유 비중 미확인 | **후보 유지**, 추가 분해 필요 |

## 원전 두 ETF 중복의 재현 가능한 계산

- Sprott 공식 홈페이지 **동일 기준일 2026-10-23**의 URNM 전체 25종, URNJ 전체 41종을 비교. 현금 제외.
- 법인이 같은 종목은 거래소 표기가 달라도 같은 기업으로 정규화하였다. 예: NexGen Energy `NXE` vs `NXG AU`.
- 공통 기업 **20개**, 중복 비중 = `Σ_i min(URNM 기업 i 비중, URNJ 기업 i 비중) = 47.55%`. 이는 현금 제외 고유 기업 이름 기준 최소 중복이며 가격 수익률 상관계수가 아니다.

| 공통 기업 | URNM | URNJ | 겹침에 반영한 min |
| --- | ---: | ---: | ---: |
| NexGen Energy Ltd. | 13.25% | 14.36% | 13.25% |
| Denison Mines Corp. | 4.07% | 11.94% | 4.07% |
| Paladin Energy Ltd. | 3.68% | 10.85% | 3.68% |
| Energy Fuels Inc. | 3.33% | 9.51% | 3.33% |
| CGN Mining Co. Ltd. | 5.27% | 5.73% | 5.27% |
| IsoEnergy Ltd. | 2.32% | 5.23% | 2.32% |
| Bannerman Energy Ltd. | 2.75% | 4.74% | 2.75% |
| Boss Energy Ltd. | 2.28% | 4.36% | 2.28% |
| Ur-Energy Inc. | 2.04% | 3.76% | 2.04% |
| Atha Energy Corp. | 1.25% | 3.04% | 1.25% |

- [URNM 전체 보유](https://sprottetfs.com/urnm-sprott-uranium-miners-etf/) / [URNJ 전체 보유](https://sprottetfs.com/urnj-sprott-junior-uranium-miners-etf/)

## 해석 및 후속 검증

1. **WR**: 현 시점 업종 기준 에너지 59.22%이므로 방산 순수 심리에 섞으면 에너지 가격의 영향이 커질 수 있다. 이는 **방산 신규 산식 편입 재검토 권고**이며 사용자 확정 후보에서 임의 삭제한 것은 아니다.
2. **URNM/URNJ**: 원전 가치사슬의 핵연료·광업 노출 자체는 관련 있지만, 중복 47.55%와 SMR 직접 기술 비중을 별도로 본다. 중복만으로 일괄 탈락시키지 않는다.
3. **BOTZ/HAIL/KARS**: 로봇/AI·모빌리티·EV/배터리의 전체 구성 중 자율주행 **직접 사업 비중**을 파악하기 전까지 순수 자율주행 대표 ETF로 단정하지 않는다.
4. **ARKQ/CLOD/ARKF**: 공식 투자목적은 관련성을 지지하지만 2026-10 최신 전체 holdings의 사업별 분류 비중이 추가로 필요하다. 투자목적의 최소 80%는 각각 혼합 테마에 대한 것으로, 순수 로봇 또는 순수 핀테크 비중 80%가 아니다.
5. 같은 평가를 나머지 55개 편입 위치로 확대하고, 동일일 공식 구성종목 비교·동일 법인 alias 정규화·비중 중복을 확인한다. 실제 관측 40/252일 및 공식 AUM은 별도 단계로 진행.

## 검증·변경 영향

- 기존 세 조건의 63/63 O 판정과 R20 승인 명단 **불변**.
- R21의 숫자는 페이지에 표시된 명시적 기준일의 실제 운용사 수치이다. 시점이 다른 값을 하나의 날짜로 가정하지 않았고, 알 수 없는 테마 세부 비중은 만들지 않았다.
- 원가격(OHLCV) 공급원 수집·지표 재계산·R20 후보 변경·새 운영 산식·D1·main·예약 작업·공개 UI 수정 **0**.

세부 관측치·각 출처·중복 기업별 계산은 [R21 JSON](../config/theme-nine-r21-theme-fit-evidence-first-batch.json)을 참조한다.
