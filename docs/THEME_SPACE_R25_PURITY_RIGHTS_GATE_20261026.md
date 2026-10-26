# 우주·위성 R25 — ETF 순도별 구성 비교 · 권리 공개 게이트 (비공개)

- 작성·검증일: 2026-10-26 (한국). `ansqhd5774-Choi/zgmini` 전용 `codex/theme-fear-greed-integration-20261025`, Draft PR #714. **main/운영 9개 테마/D1/Cloudflare/스케줄러 변경 0**.
- 입력: **사용자 R21 실제 PC** ETF·SPY source SHA 검증 통과 기록과 R23 공식 발행사 AUM 소규모 증거. 실제 마지막 ETF 개별 점수 **2026-10-23**. 새로운 ETF 가격, 발행사 holdings CSV, API 가격봉 **수집 0**. 수집이 불가능했던 기존 5종은 반복하지 않고 현재 분석 제외.
- 사용자 2026-10-26 R24 승인: **유효 3종 이상 신규 ETF 테마의 AUM 비례 가중**, 2종의 기존 가중 계약은 유지. R25는 **구성 후보 및 권리 판단만**, 최종 편입과 공개 승인은 아님.

## 1. 기존 네 종의 테마 적합성

| ETF | 공식 펀드 목적 | 현재 판단 | 결과 |
| --- | --- | --- | --- |
| UFO | Procure Space ETF; 우주 기반 서비스·제품에 필수적인 기업을 대상으로 함 | 우주·위성 **핵심 후보** | 비교 대상 유지 |
| NASA | Tema Space Innovators ETF; 우주 경제 산업 및 상장/비상장 SpaceX SPV 노출 | 우주·위성 **핵심 후보**, 비상장 자산 평가·ETF 중복 주의 | 비교 대상 유지 |
| WARP | VanEck Space ETF; 우주 테마 신규 펀드, 공식 2026-10-23 AUM $37.40M | 우주·위성 **핵심 후보**, 2026년 신규 상장/짧은 실측이력 주의 | 비교 대상 유지 |
| ROKT | State Street Final Frontiers ETF; 공식 지수는 **outer space + deep sea** 및 드론 구성 | **혼합테마**: 우주·위성 전용이라는 표시 불가 | 포함·제외 **둘 다 비공개 비교**, 최종 선택 대기 |

ROKT의 심해·해양 노출은 실제 펀드 목적에 포함됨. 다만 `ROKT=비우주 100%` 또는 항공우주·방산 섹터가 `순수 우주 100%`라고 추정하지 않는다. R22에서 관측한 ROKT 유가스 장비 서비스 10.66%는 **당시 산업 분류**이지 전체 우주/심해 매출 비율이 아니다. UFO/NASA/WARP 역시 SpaceX·Rocket Lab 등 중복 및 일부 일반 산업/방산 비중이 있으므로, **발행사 테마 목적과 포트폴리오 순도 100%는 구별**한다.

## 2. 두 구성의 2026-10-23 비공개 정량 결과

모두 **R21의 동일 실측 ETF별 점수**(UFO 34.88492, NASA 48.90703, WARP 60.52650, ROKT 44.09211)를 재사용하며 R24 승인 3+ `AUM_i / Σ유효 AUM`을 사용한다. 재수집 없음.

| 구성 | UFO | NASA | WARP | ROKT | 점수 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 4종 혼합 우주·심해 | 29.1083% | 59.3000% | 2.3332% | 9.2585% | **44.65075** |
| 3종 우주 집중 가상안 | 32.0783% | 65.3505% | 2.5713% | 제외 | **44.70775** |

- 차이 **+0.05700점**: 가격·시장 심리 일간 변화가 아니라 **ROKT 편입 여부의 구성 변화 민감도**.
- 3종 AUM 합계 **$1,454,544,146.30**, 4종 **$1,602,954,146.30**. UFO/NASA/ROKT AUM 날짜 10/22, WARP 10/23 → **단일 날짜 확정 가중치가 아님**. 과거 252일 모든 날짜에 최신 AUM을 대입하지 않는다.
- 아직 **`purityExclusionApproved=false`**. 분석 코드가 ROKT를 운영에서 자동 제외하지 않음. 공식 목적상 우주 전용 UI에는 3종이 더 명확한 후보이지만, 편입 정책 최종 선택은 사용자 몫이다.
- 소스: `scripts/pc-writer/theme-space-satellite-r25-purity-alternatives.mjs`, 검증: `tests/theme-space-satellite-r25-purity-alternatives.test.mjs`. 실제 R21 source/spy/history SHA를 R23 검증 함수에서 재검증. 입력 티커가 없거나 구성 3종 미만이면 거부. providerCalls=0, collectionRetries=0, publicWrites=0.

## 3. 데이터 사용 권리 — 공급원과 발행사 사이트를 구분

| 자료 | 확인 가능한 권리 | **판정** |
| --- | --- | --- |
| GetMarketHistory OHLCV bars | [공식 Terms §5](https://getmarkethistory.com/docs/terms) (2026-10-19 효력): 정상 계정 조건하 원가격 bulk를 재구성할 수 없는 **파생 지표·차트 배포 허용**; **원가격 자체 재배포 금지**. §4는 대량 재배포/공유 키/속도 우회/사이트 스크래핑도 금지 | **조건부**: API/계정 합법 수령, 파생 출력 비가역성 확인 필요; `rightsVerified=false` 유지 |
| ROKT 공개 AUM·holdings | [State Street 공식 ROKT](https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-kensho-final-frontiers-etf-rokt), 공개 자료에는 복제·전송에 대한 사전 서면 동의 제한 문구 | 조회 자체 가능 ≠ 자동 재배포·상업적 파생 제공 승인. **미확인** |
| NASA 공개 AUM·holdings | [Tema NASA](https://temaetfs.com/nasa), [Tema 웹사이트 약관](https://temaetfs.com/privacy-policy)은 사이트의 지식재산권 보호 명시 | 사이트의 게시가 **자유 재가공·재배포 허가**가 아님. **미확인** |
| WARP 공개 AUM·holdings | [VanEck WARP](https://www.vaneck.com/us/en/investments/space-etf-warp/), [VanEck 법적 고지](https://www.vaneck.com/us/en/legal/)는 웹 콘텐츠 저작권 명시 | 원본 다운로드·자동 상업 활용 권리 별도 확인 전 **미확인** |
| UFO 공개 AUM·holdings | [Procure UFO](https://www.procureetfs.com/ufo/), 공개 펀드 통계·보유목록 조회 가능 | 공개 열람과 자동 수집·상업 재배포 권리는 별개. **미확인** |

**중요:** GetMarketHistory의 **가격 데이터 파생 지표 허용**은 발행사 사이트의 AUM·holdings 자료에 대한 별도의 수집/상업 파생 권리까지 대신 부여하지 않는다. GitHub에 저장된 R23 작은 과거 AUM 감사 증거는 **내부 재현 자료**일 뿐 운영용 최신 자동 AUM 공급원 계약이 아니다. 발행사 페이지를 반복 크롤링하지 않는다.

## 4. R25 Gate 및 다음 단계

- **PASS:** 3종/4종 R24 상대 AUM 계산 차이 재현, R21 PC provenance 유지, ROKT 공식 혼합 목적 확인, 가격/issuer CSV 재수집 0, 기존 9종 운영 영향 0.
- **PENDING — 사용자 선택:** 우주·위성 **3종 집중안** 또는 **4종 혼합안 + 반드시 우주·심해 포함 명시**. 이미 수집 불가능한 5종은 재시도하지 않는다.
- **BLOCKED — 공개 데이터 권리:** 가격 파생 라이선스의 계정/무료 API 이용 조건 및 **지속 갱신 가능한 AUM 출처의 파생 공개·저장 권리** 확인되지 않음. 조건 충족 불가하면 해당 공급원/ETF를 제외하거나 권리 허용되는 공급원으로 바꿔야 한다. 유료 결제 금지.
- **BLOCKED — 252일 운영:** 실제 **과거 날짜별 AUM** 또는 승인된 시점별 갱신 정책 필요; 10월의 AUM을 전 기간에 소급하지 않는다. 결측 가격·ETF 점수·AUM을 만들거나 무한 재수집하지 않는다.
- **NOT AUTHORIZED:** `finalBasketSelected=false`, `rightsVerified=false`, `publicationAuthorized=false`; D1·Cloudflare·API·스케줄러·PC 원본 변경 금지. 현재 수치는 **공개 시장 최신 점수 아님**.

발행사 1차 출처는 위 표의 직접 링크, 시장 데이터 권리 해석은 GetMarketHistory 공식 약관에 한정한다. 위험 배경: Reuters 2026-05-22, https://www.reuters.com/legal/transactional/space-etfs-booming-anticipation-spacex-ipo-2026-05-22/ (ETF 보유중복 일반론; 특정 실측 비중의 근거 아님).

## 5. R26 후속 사용자 승인 — 현재 4종 유지, ETF 수 상한 없음

- 사용자 2026-10-26 명시 지시: **"4개로해 뭐10개로해도 상관없어"**. 이번 확인된 현재 구성은 **UFO/NASA/WARP/ROKT 4종으로 확정**한다. **ETF 4개를 상한으로 규정하지 않음**. 신규 ETF가 5~10개 이상이어도 테마 적합·실제 개별점수·공식 AUM·권리 요건을 충족하면 동일한 3종 이상 상대 AUM 함수로 다룰 수 있다.
- ROKT는 승인된 4종에 **포함**하므로 바로 전 R25의 가상 3종 비교는 **대체된 선택지가 아닌 참고자료**다. ROKT의 공식 `우주+심해` 혼합 성격을 공시·설명에서 숨기지 않는다.
- `scripts/pc-writer/theme-space-satellite-r26-approved-roster.json`에 **현재 승인 구성·제외된 5종 재수집 금지·상한 없음·혼합테마 설명**을 기록한다. `theme-space-satellite-r26-roster-audit.mjs`가 4종 실제 R21 provenance·현재 R23 AUM 비중과 점수를 재검산한다. 숫자 4는 **현재 증거의 수**일 뿐 계산기 최대 지원 ETF 수가 아님.
- 이로써 이 문서 4절의 **사용자 구성 선택 PENDING은 해결**되었다. 그러나 `rightsVerified=false`, `publicationAuthorized=false`, `historical252DayAumVerified=false`는 그대로다. **기존 테마/메인·D1·Cloudflare·스케줄러 자동 변경 금지**. R26 실측 비공개 점수 **44.65075**(마지막 가격일 2026-10-23), 실제 현재 공개값 아님.
