# 우주·위성 R23 — 상대 AUM 비공개 시나리오, 실측 점수 보존

- 작성일 2026-10-26. 브랜치 `codex/theme-fear-greed-integration-20261025` / Draft PR #714 전용. **main·기존 9개 테마·PC 원본·D1·스케줄러·Cloudflare 변경 없음**.
- 사용자 최신 지시: **수집할 수 없는 ETF는 반복 조회·수집하지 않고 이번 분석에서 제외**. 이 단계는 기존 R21 성공 증거를 재사용하므로 **신규 ETF/issuer GET·PC 재실행·데이터 구매 0회**.
- 범위: [R22 보유종목/AUM 비교](THEME_SPACE_R22_FOUR_ETF_OVERLAP_AUM_20261026.md)를 새로운 **범용 N개 ETF 비공개 가중 계산기**로 검산한다. ETF 선발·운영 산식을 바꾸지 않는다.

## 1. 출처·계산 기준 분리

| 항목 | 실제 적용 근거 |
| --- | --- |
| 개별 ETF 점수 | 사용자 R15/R18/R21 실제 PC 원자료 검산의 **2026-10-23 R2 점수 4개**, 5자리 정확도 |
| 가격·SPY 이력 | 사용자 R21 실제 PC 확인 ETF manifest `1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b`; 공유 SPY manifest `76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e`; R18 이력 digest `94011b38f4d31cf21b74eac36b988a0a2565c34bf2b2e5522dc27106ac4d1216` |
| AUM | 발행사 직접 표시: NASA/UFO/ROKT 10/22, WARP 10/23. 동일 기준일 아님 |
| 기존 비교값 | R21 **미승인** 상대 성숙도 4종 가중·점수 **44.81142** |
| 가중 계산 | **ETF AUM / 해당 날짜·이번 비공개 유효 ETF AUM 총합**; 가격·개별점수·R2 계산기 수정 없음 |
| 후보 수 | 고정 2/4/9개 한도 **없음**. 100개 이상도 한 번의 순회로 계산 가능 |
| 결측·미수집 | ETF별 실제 현재 점수 또는 공식 AUM 없으면 *이번 민감도 분석에서만* 제외, 0·균등 비중 대체 없음, 재시도 없음 |
| 미래 AUM | 점수 날짜 이후 AUM으로 과거 점수를 만들어내는 **look-ahead bias 차단** |

**구현:** `scripts/pc-writer/theme-space-satellite-r23-aum-shadow.mjs`, 과거 증거 재현용 작은 비공개 입력 `theme-space-satellite-r23-dated-aum-evidence.json`, 합성 테스트 `tests/theme-space-satellite-r23-aum-shadow.test.mjs`. 코드는 `--audit`를 지정해야 읽기 전용 JSON 출력을 하며, 출처·티커·AUM을 함수 내부에 하드코딩하지 않는다. PC 원가격·키·전체 holdings·대량 기록을 Git에 저장하지 않는다.

## 2. AUM 가중 비교 결과 — 코드 실측

| ETF | 과거 공식 AUM (M USD) | R23 AUM 시나리오 | 기존 R21 R4-A 가중 |
| --- | ---: | ---: | ---: |
| UFO | 466.5926473 | **29.1083%** | 32.2951% |
| NASA | 950.551499 | **59.3000%** | 18.3021% |
| WARP | 37.40 | **2.3332%** | 17.1078% |
| ROKT | 148.41 | **9.2585%** | 32.2951% |

- 공식 AUM 입력 합계 **$1,602,954,146.30**.
- **새 비공개 AUM 가중 시나리오 44.65075** vs 원래 R21 미승인 R4-A **44.81142**, **-0.16067점**.
- `evidenceMixedDates=true`, `maximumEvidenceLagDays=1`. AUM 자료가 모두 같은 날짜에 확정되었다는 뜻이 아니다. 사용자의 실제 2026-10-23 종목 점수와 10/22·10/23 AUM을 혼합한 **과거 기준일 민감도 시뮬레이션**이다.
- **252일 차트 재계산 금지**: 10월 말 AUM을 과거 모든 차트 날짜에 일괄 대입하면 미래정보 누출이다. 날짜별 과거 AUM 증거와 사용자 가중 계약의 별도 승인 없이는 시행하지 않는다.

## 3. 승인·권리 현황

1. 사용자 확정 **신규 테마 OR + ETF 점수 R2** 및 **장기 1종/단기 1종 70:30→50:50**은 그대로 보존한다. 본 계산기는 그 혼합 규칙을 대체하지 않는다.
2. 현재 공식 R2 문서는 **두 ETF 모두 단기이거나, 3개 이상 ETF의 최종 가중은 미승인**이라고 명시한다. 따라서 상대 AUM 원칙을 다종 조합으로 어떻게 편성할지는 마지막으로 정량 결과를 보고 **사용자 확정이 필요**하다. R23은 계산 시나리오를 보여줄 뿐 운영 가중식 승인이 아니다.
3. ROKT의 공식 목적은 우주+심해이며, NASA와 WARP의 SpaceX 보유비중 중복 위험은 R22에 기록했다. ETF 순도·중복을 이유로 자동 탈락시키거나 누락 자료를 추정하지 않는다.
4. **`finalBasketSelected=false`, `weightsApproved=false`, `rightsVerified=false`, `publicationAuthorized=false`**. 별도 승인 전 D1·API·공개·Cron·기존 9개 테마 변경 금지.

## 4. 검증·다음 단계

- Node.js 합성 테스트: 실제 4종 **44.65075 일치**, 100개 후보 무상한, AUM/현재 점수 결측 시 제외, 단일 ETF 조합 가짜 점수 금지, 중복·유효하지 않은/미래 날짜·manifest SHA 변조 차단, 외부 호출/쓰기 0.
- 실 PC 원본 재검산은 **R21 PASS 근거 재사용**하며 재실행 요청하지 않는다. 2026-10-23 이후 새 데이터가 반영된 현재 시장값이라고 보고하지 않는다.
- **최종 사용자 선택 필요:** 3종 이상 신규 테마의 최종 가중치에서 AUM 비례를 기준으로 할지, 승인된 장기/단기 70:30→50:50과 어떤 우선순위로 조합할지. 또한 ROKT 혼합테마 포함·명시와 데이터 파생 공개 권리확인 필요.

출처(직접 발행사, 조회 당시 표기 기준일 별도): https://www.procureetfs.com/ufo/ · https://temaetfs.com/nasa · https://www.vaneck.com/us/en/investments/space-etf-warp/portfolio · https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-kensho-final-frontiers-etf-rokt .

ETF 구성의 중복 위험에 대한 배경 기사: Reuters, 2026-05-22, https://www.reuters.com/legal/transactional/space-etfs-booming-anticipation-spacex-ipo-2026-05-22/ . 기사 내용은 발행사 보유수치나 R23 검증의 대체 근거가 아니다.
