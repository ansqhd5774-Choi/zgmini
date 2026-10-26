# 기존 9개 테마 ETF 운용사 IAPD 식별 교차검증 R16 (2026-10-26)

- 연구 브랜치: `research/theme-nine-r2-shadow-20261026`
- 원장: `config/theme-nine-r16-iapd-identity-crosswalk.json`
- 선행: R14 ETF 63종·64개 테마 위치, R15 운용사 3중 Gate
- **운영 반영 없음**: main/산식/PC writer/저장 이력/D1/사이트/스케줄러 불변

## 1. 이번에 실증한 범위

| 항목 | 결과 | 정확한 의미 |
| --- | ---: | --- |
| ETF 상품 공식 사이트 그룹 | 19 | 상품 출처 호스트 기준 |
| SEC IAPD 기업별 검색 결과 연결 | 19/19 | 법인명 또는 사용 상호 검색 일치. 펀드별 운용 책임 확정 아님 |
| 중복 제거한 법인 CRD 번호 | 18 | Range ETFs와 ROBO Global 후보 그룹에 동일한 CRD 151197 |
| 현재 등록 및 중대한 제재 기록 **완전 판독** | 0/18 | IAPD 페이지의 일부 동적 항목은 검색 결과만으로 확정 불가 |
| 운용사 A/B/C/D 최종 등급 | 0/18 | R15 별도 승인 전 점수/등급 임의 기입 금지 |
| 3중 Gate 신규 통과 ETF | 0/63 | 보유종목·가격/권리·AUM·운용사 전 항목 아직 미완 |

**중요**: 공식 IAPD 기업 검색 결과의 존재는 적격성 O가 아니다. 특히 SEC 등록 사실은 SEC가 운용사나 상품을 추천·보증한다는 뜻이 아니다. 등록상태, 현행 제재/공시, ETF별 법적 주체를 각각 재검증한다.

## 2. 공식 규제 등록부 대조표

| 상품 사이트 | 잠정 법적 투자자문사 | CRD | IAPD |
| --- | --- | ---: | --- |
| amplifyetfs.com | Amplify Investments LLC | 173781 | https://adviserinfo.sec.gov/firm/summary/173781 |
| corgiinvest.com | Corgi Strategies, LLC | 337985 | https://adviserinfo.sec.gov/firm/summary/337985 |
| etf.dws.com | DBX Advisors LLC | 154558 | https://adviserinfo.sec.gov/firm/summary/154558 |
| institutional.fidelity.com | Fidelity Management & Research Company LLC | 108281 | https://adviserinfo.sec.gov/firm/summary/108281 |
| kraneshares.com | Krane Funds Advisors, LLC | 157103 | https://adviserinfo.sec.gov/firm/summary/157103 |
| sprottetfs.com | Sprott Asset Management USA, Inc. | 139022 | https://adviserinfo.sec.gov/firm/summary/139022 |
| themesetfs.com | Tema ETFs LLC | 332224 | https://adviserinfo.sec.gov/firm/summary/332224 |
| www.alpsfunds.com | ALPS Advisors, Inc. | 134340 | https://adviserinfo.sec.gov/firm/summary/134340 |
| www.ark-funds.com | ARK Investment Management LLC | 169525 | https://adviserinfo.sec.gov/firm/summary/169525 |
| www.ftportfolios.com | First Trust Advisors L.P. | 107027 | https://adviserinfo.sec.gov/firm/summary/107027 |
| www.globalxetfs.com | Global X Management Company LLC | 146932 | https://adviserinfo.sec.gov/firm/summary/146932 |
| www.invesco.com | Invesco Capital Management LLC | 125601 | https://adviserinfo.sec.gov/firm/summary/125601 |
| www.ishares.com | BlackRock Fund Advisors | 105247 | https://adviserinfo.sec.gov/firm/summary/105247 |
| www.rangeetfs.com | Exchange Traded Concepts, LLC (잠정) | 151197 | https://adviserinfo.sec.gov/firm/summary/151197 |
| www.roboglobaletfs.com | Exchange Traded Concepts, LLC (잠정) | 151197 | https://adviserinfo.sec.gov/firm/summary/151197 |
| www.roundhillinvestments.com | Roundhill Financial Inc. (IAPD 사용상호 Roundhill Investments 포함) | 300799 | https://adviserinfo.sec.gov/firm/summary/300799 |
| www.ssga.com | SSgA Funds Management, Inc. | 111242 | https://adviserinfo.sec.gov/firm/summary/111242 |
| www.vaneck.com | Van Eck Associates Corporation | 105080 | https://adviserinfo.sec.gov/firm/summary/105080 |
| www.wisdomtree.com | WisdomTree Asset Management, Inc. | 139684 | https://adviserinfo.sec.gov/firm/summary/139684 |

표의 연결은 기업명/상호 및 SEC 자료에 기초한 잠정 식별이다. 동일 브랜드 상품에 다른 자문사·하위자문사가 있을 수 있으며 63개 ETF 모두 개별 투자설명서 확인이 필요하다.

## 3. 계속 확인할 절차

1. **18개 법인**: 각 IAPD 현행 Form ADV 및 등록 상태, 공개된 disciplinary disclosure, 규제 제한의 시점·해결 상태를 기록한다. 확인 불가 사항은 PENDING; 공백을 무제재로 해석 금지.
2. **63개 ETF**: 상품별 최신 투자설명서에서 신탁·스폰서·자문사·하위자문사를 대조하고 테마 소속을 분리 검증한다.
3. **63개 ETF**: 공식 전체 보유종목/비중/기준일 파일의 실제 접근 가능성 점검. 단순 상위 10개는 PASS 불가.
4. **PC 실측 별도**: 무료 상업 저장/가공 지표 공개 권리, 반복 ETF+SPY 가격 수집, 공식 날짜별 AUM, 실제 40일·252일을 검증한다.
5. R15의 100점 A/B/C/D **제안표는 별도 사용자 확정까지 평가 기준 초안**이다. 3중 AND 전부 PASS인 ETF만 비공개 비교 산식에 올리고, 기존 공개 점수 변경은 승인 후에만 한다.

## 4. 기준 출처

- SEC IAPD: https://adviserinfo.sec.gov/
- SEC, Form ADV/등록·징계 정보 안내: https://www.investor.gov/introduction-investing/investing-basics/glossary/investment-adviser-public-disclosure-iapd
- SEC, ETF Rule 6c-11: https://www.sec.gov/investment/exchange-traded-funds-small-entity-compliance-guide

R16은 R15를 대체하지 않으며 식별 단계만 추가한 연구 기록이다. ETF 편입 개수의 상하한이나 목표는 없다.
