# Iran R4 V14 — UKMTO 번호별 14일 사건 검토표

**목적:** V11에서 PC에 공식 원문 10개 중 정확히 1개만 연결된 문제를 해결하기 전에, 전쟁 해상 사고를 사건번호 기준으로 정리한다. URL 정확히 연결 안 된 자료를 무단으로 R4 검증 사건으로 승격하지 않는다.

## 2026-10-05~10-18 UKMTO 공개 기록

UKMTO 공식 Recent Incidents 사이트가 검색 인덱스에서 **30~34개 카드**를 노출한 상태로 확인됐다. 다만 서버 페이지 직접 조회는 동적 UI 때문에 기록 0건으로 나타날 수도 있으므로, **공개 검색 인덱스의 카드 내용을 연구자료로 추린 것**이며 특정 시점의 전체 기록 완전성 보증이 아니다.

| 카드 날짜 | 사건번호 | 표기 상태 | 명시된 실제 사건일 | 비고 |
|---|---|---|---|---|
| 10/05 | 152 | Suspicious Activity | 10/05 | IRGC 선박 회항 지시, 피격 아님 |
| 10/05 | 156,157 | Attack | 각각 10/05 | 동일 선박 가능성 미해결 |
| 10/06 | 159 | Attack | 10/06 | 늦게 접수된 통보 |
| 10/07 | 158 | Attack | 10/07 | 카타르 북방 해역 |
| 10/09 | 160 | Attack | 미확정 | UAE 주변 |
| 10/09 | 161 | Advisory | 미확정 | 공격 아님 |
| 10/10 | 162 | Attack | 미확정 | 유조선 |
| 10/10 | 163 | Advisory | 미확정 | 공격 아님 |
| 10/11 | 164,165 | Attack/재분류 | 미확정 | 165는 기존 경계 이후 UAV 피격 재분류 |
| 10/12 | 166 | Attack | **10/11** | 보드 날짜와 실제 사건일 다름 |
| 10/12 | 167,168,169 | Attack | 미확정 | 모두 time-late, 12일 발생으로 확정 금지 |
| 10/13 | 170,171 | Attack | 미확정 | 170은 MPA 선박과 중복 가능 |
| 10/14 | 172,173 | Attack | 미확정 | MPA 10/14 선박과 중복 가능 |
| 10/16 | 174,175 | Attack | 미확정 | 다른 보고로 확인 전 중복 판정 금지 |
| 10/17 | 176 | Attack | 미확정 | 무장 소형선·LNG선 |
| 10/18 | 177 | Attack | **10/18** | Khor Fakkan 예인선 피격 |

- 총 **23개 카드**, 그 중 공격/공격 재분류 카드 **20개**, 비공격 **3개**.
- 정확한 실제 사건일이 독립적으로 명시된 공격 카드 **6개**뿐. 나머지 표시일은 원칙적으로 **카드 날짜**이지 사건일 검증 아님.
- 이전 28일(9월 7일부터) 참고 사례로 UKMTO #134~141을 추가하되 **관측 완전성 입증에는 사용 불가**.
- UKMTO #170 vs Singapore MPA *GFS PRIDE*, #172/#173 vs *GFS GISELLE*은 중복 확정 전 집계 금지.
- 카드에서 **공격자 불명**이면 IRN_USA/IRN_ISR/YEMEN_HOUTHI를 자동 할당하지 않는다.
- 전체 23개 카드를 **일별 23건의 독립 검증 공격으로 간주하지 않는다**.

### 공식 출처
- [UKMTO Recent Incidents](https://www.ukmto.org/recent-incidents)
- [Singapore MPA 10/14 report](https://www.mpa.gov.sg/media-centre/details/two-singapore-registered-vessels-struck-in-strait-of-hormuz)
- [US MARAD Hormuz risk advisory](https://www.maritime.dot.gov/msci/2026-011-persian-gulf-strait-hormuz-and-gulf-oman-iranian-attacks-commercial-vessels)

## 실행/안전
`lib/iran-progress/ukmto-incident-research-v14.mjs`는 상수 메타데이터 기반 순수 함수이며 네트워크 요청, PC SQLite 읽기·쓰기, Ollama/D1 게시를 수행하지 않는다. 이 함수는 `sourcePageLiveFullHistoryReadback=false`, `scoringEligible=false`, `independentR4EventCount=0`, `r4Score=null`, `fullPrior28DaysVerified=false`를 강제한다. 산식·가중치·운영 점수·스케줄 변경 없음.

## NEXT
PC 저장 영수증과 **정확한 UKMTO 사건번호/공식 제품 URL**을 연결해 존재 여부 확인. 9/07부터 28일 전체 범위별 검증이 없어 R4 실제 14일 점수 산출은 보류. 독립 검증이 끝난 사건만 해당 사건일에 저장하며 **출처 확인일 소급 금지**.
