# 우주·위성 R20 — R19 실제 구성효과 통과 후 발행사 ETF 중복/순도/AUM 실증 (비공개)

- 조사일: 2026-10-26. **실제 ETF 신규 가격 수집/가중식 변경/운영 반영 작업이 아닌 공개 발행사 공시의 읽기 전용 점검**.
- 개발 저장소: `ansqhd5774-Choi/zgmini`, 전용 브랜치 `codex/theme-fear-greed-integration-20261025`, Draft PR #714. 기존 9개 테마·main·D1·스케줄러·Cloudflare 변경 금지.
- 기초 실물 증거: 2026-10-26 사용자 R19 PC 결과, 원본 manifest SHA `1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b`, SPY manifest SHA `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e`. R19 251일 정확분해 / ETF 구성 교체 8건 / 구성효과 우세 0건. 실물 원본·실행 환경 재검증을 임의 반복하지 않음.
- **ETF 수량 상한 없음:** 9개 후보 UFO/NASA/WARP/ORBX/MARS/ARKX/ROKT/DIPR/WSPC 유지. 2026-10-23에 *실제로 점수가 산출된* 6개 UFO/NASA/WARP/MARS/ARKX/ROKT만 현재 비공개 R4-A 점수 42.38768에 참여. 나머지 3개를 영구 배제하지 않음.

## 1. 9개 발행사 직접 확인 — AUM은 관측일을 함께 보존

| ETF | 발행사 AUM 직접 확인 | ETF 순도/자료 상태 | 2026-10-23 비공개 점수 참여 |
| --- | --- | --- | --- |
| NASA | **$950.551499M**, 10/22 | 10/23 상위 SpaceX **27.98%**. 38보유, SpaceX SPV 거래원가 평가 관련 가치 산정 유의 | O |
| UFO | **$466.5926473M**, 10/22 | 10/23 상위 SpaceX **15.82%**. 66보유 | O |
| WARP | **$37.40M**, 10/23 | 10/22 보유 SpaceX **22.99%**, Rocket Lab 12.51%, 22보유 | O |
| ORBX | **$35.41M**, 10/23 | 10/23 보유 SpaceX **25.64%**, Rocket Lab 9.03%, ASTS 7.48%; 30일 스프레드 0.36% | X — 과거 49일만 기여, 현재 null |
| MARS | **미검증** — 당일 접근된 발행사 페이지 AUM/현재 비중 공란 | 발행사 9/30 상위 5개 **종목명만** 식별; 동일 10/23 가중비중 미확인 | O |
| ARKX | **미검증** — 공식 페이지 AUM/현재 holdings 수치 동적 공란 | 공식 목적은 **우주+방산 혁신**, 2025-11-23 방산 확대 | O |
| ROKT | **$148.41M**, 10/22 (R7 공식 확인값) | **우주+심해**; 10/22 하위업종 우주 전용 아닌 항공우주·방산 54.76%, 석유·가스 장비 10.66% | O |
| DIPR | **$1.31M**, 10/22 | 우주·위성통신 집중. PC 현재 NY15 공통 28일로 40일 미달, null | X — 감시 유지 |
| WSPC | **$1.19826M**, 10/23 (표기 단위 000 ×1000) | 30일 스프레드 0.58%, PC 현재 NY15 공통 15일로 40일 미달, null | X — 감시 유지 |

주의: AUM 기준일들이 서로 다르고 MARS/ARKX가 결측이므로 **전체 9종 AUM 합계·정규화 AUM 비중을 계산하지 않는다**. R7에서 조회일 미지정으로 기록한 MARS 약 $41.83M, ARKX 약 $700M는 10/26 최신 검증값이 아니다. `missing ≠ 0`.

## 2. 오늘 실제 참여 6종의 기업 중복 — 관측값 일부만 계산

R18/R19 실제 출력의 *미승인* `R4-A_RELATIVE_MATURITY_UNAPPROVED` 가중치: UFO **21.3228%**, NASA **12.0839%**, WARP **11.2953%**, MARS **12.6525%**, ARKX **21.3228%**, ROKT **21.3228%**. 네 자리 반올림 합계 100.0001%.

기업별 비중을 같은 시점·동일 회계 기준으로 전체 6종에서 확보한 것은 아님. 다음 표는 **UFO(10/23), NASA(10/23), WARP(10/22)만 확인**한 조건부 하한성 *기존 R4-A 가중치 적용 부분 기여*이다. 전체 6종 보유 위험 또는 정확한 동시점 ETF 중복 비율이 아니다.

| 공통 기업 | UFO 자체 비중 | NASA 자체 비중 | WARP 자체 비중 | 전체 6종 R4-A 점수의 알려진 3종 보유 노출분 |
| --- | ---: | ---: | ---: | ---: |
| SpaceX | 15.82% | 27.98% | 22.99% | **9.3511%p** |
| Rocket Lab | 4.28% | 9.35% | 12.51% | 3.4555%p |
| AST SpaceMobile | 3.35% | 5.50% | 4.99% | 1.9426%p |
| Viasat | 4.12% | 4.68% | 4.78% | 1.9839%p |

- 계산: `sum(해당 ETF의 R4-A 전체 바스켓 가중치 × 발행사별 회사 보유비중)`. **발행사 3종 가중치 합계 44.7020%**에 대해서만 기여를 계산. 다른 3종의 보유비중은 0으로 단정하지 않으며 총 노출로 보고하지 않는다.
- UFO와 NASA의 **동일 10/23 상위 10개 교집합에서 식별되는 4개 공통 회사**의 `sum(min(ETF1%,ETF2%))`는 **27.57%p 하한**. 양 ETF 전체 holdings 중복률도 아니고 다른 날짜 WARP와 정확히 대칭 비교한 값도 아니다.
- **MARS·ARKX·ROKT 합계 55.2981%의 기존 비공개 점수 가중치**에 대한 *동시점 회사별 전체 보유비중* 확인 미완료. 회사별 잔여노출을 0으로 두고 점수 또는 순도를 확정하면 안 된다.
- 특히 **ARKX+ROKT의 현재 비공개 합산 가중치 42.6456%**는 우주전용이 아닌 복합 테마 ETF에 할당되어 있다. 이것은 실제 방산/심해 기업 노출 42.6456%라는 뜻이 **아니며**, 최종 우주·위성 순도 검토가 필요한 이유다.
- NASA는 발행사 공식 설명상 SpaceX를 SPV로 보유하고 **최근 거래원가로 평가**, 일일 가격 갱신이 없을 수 있다. ETF 거래가격 움직임이 SpaceX 개별 기업의 가치 변화를 실시간 대변한다는 가정은 금물이다.

## 3. 파생 공개 권리와 미완료 게이트

GetMarketHistory 2026-10-19 효력 약관 §5는 합법적으로 받은 원시 bar에 대해 **내부 저장·분석 및 원본 전체 시계열 복원이 불가능한 파생 신호·지표·차트의 배포**를 명시적으로 허용한다. **원시 bar 자체의 대량 재배포/피드/덤프/API 제공은 상업·비상업 모두 금지.** 이는 *조건부 문구 확인*일 뿐 계정 상태/원본 취득 경로/실제 제3자 원자료 조건/발행사 holdings 사용 조건에 대한 최종 법적 승인 아니다.

- **R19 PC 구성변화 진단:** PASS (비공개 실측에만 해당)
- **공식 발행사 최소 보유 공시:** NASA/UFO/WARP/ORBX/ROKT 일부 PASS (서로 다른 관측일과 전체 holdings 미확인)
- **MARS·ARKX 당일 AUM/전체 holdings:** PENDING / 공식 공개 페이지 정적 응답에서 공란
- **당일 6종 전체 보유 중복·순도:** PARTIAL, 수치가 없다고 0 처리하지 않음
- **R4-A 가중치 승인 / 최종 후보수·포함 여부:** NOT_APPROVED / NOT_SELECTED
- **가격·공시 데이터 파생 공개 권리/실제 계정 준수:** `rightsVerified=false`
- **공개/운영 승인:** `publicationAuthorized=false`; main 병합, D1/DB, Cloudflare, 스케줄러, 기존 9개 테마 수정 0.

## 4. 다음 최소 변경 순서

1. 사용자 승인 없이 현재 6종으로 최종 조합을 확정하지 않는다. **9종 전부 후보로 유지**하고 현재 점수 6종 / 결측 감시 3종을 구분한다.
2. 발행사 공식 보유 내역을 **특정 관측일과 출처 URL/시간 함께** 읽어, MARS·ARKX·ROKT 포함 실제 현행 6종의 우주·위성/방산/심해 순도와 중복을 계산한다. 동시점 확보가 안 되는 ETF는 **unknown**, 전체 ETF 합계를 추측하지 않는다. 공시 숫자를 실시간 주가로 혼동하지 않는다.
3. NASA/WARP/ORBX처럼 SpaceX 노출 높은 3종과 UFO의 중복을 별도 체크하되 **고정 ETF 수 상한/절대적 종목 중복 탈락 규칙을 임의 신설하지 않는다**.
4. R4-A 가중치(장기/단기 상대 성숙도)와 사용자 승인 AUM 상대 가중 원칙의 관계를 수치로 나란히 제시하고 **공식 AUM 전종 증거 확보 전 최종 가중을 주장하지 않는다**.
5. 실제 공개 전에 파생 공개 권리·계정 조건/데이터출처 고지/가격 모드/최종 가중 승인 후 별도 non-regression, 저장/조회·배포 gate를 밟는다.

## 공식 출처 (조회 2026-10-26, 각 값의 표기 기준일은 본문 참고)

- NASA: https://temaetfs.com/nasa
- UFO: https://www.procureetfs.com/ufo/
- WARP: https://www.vaneck.com/us/en/investments/space-etf-warp/overview/
- ORBX: https://www.globalxetfs.com/funds/orbx/
- MARS: https://www.roundhillinvestments.com/etf/mars/
- ARKX: https://www.ark-funds.com/funds/ARKX
- ROKT: https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-kensho-final-frontiers-etf-rokt
- DIPR: https://corgiinvest.com/dipr
- WSPC: https://www.wisdomtree.com/us/products/megatrends/wspc
- GetMarketHistory 파생물 라이선스: https://getmarkethistory.com/docs/terms
- 배경 기사 (공시 수치 대체 근거 아님): Reuters 2026-05-22 `Space ETFs booming in anticipation of SpaceX IPO` https://www.reuters.com/legal/transactional/space-etfs-booming-anticipation-spacex-ipo-2026-05-22/
