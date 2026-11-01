# Market Calendar R58 — R43 ★★★ 132/100 참조 명단 대조 (2026-11-01)

## 목적과 상태

R43의 77.3%(102/132개)와 후속 균형형 81.1%(107/132개)는 **2026-10-31 사용자 제공 500종목 단일 참조 표본**을 대상으로 한 과거 시뮬레이션 값이다. 2,634개 PC 운영 실데이터에서 새로 검증한 성능이 아니다.

R58은 기존 R57이 **메모리에서만** 산출한 전체 적격 기업 후보와 사용자 검토 참조 132/100을 대조한다. 임의로 대형 기업을 ★★★로 올리는 기능이 아니라, 산식이 빠뜨린 기업의 원인을 식별하는 후속 분석 장치다.

- 개발 소스: `scripts/pc-writer/market-calendar-r58-r43-shadow-audit.mjs`.
- 합성 검증: `tests/market-calendar-r58-r43-shadow-audit.test.mjs`.
- 브랜치: `codex/zgmini-gpt-workspace-20261025`.
- **실제 PC 설치·참조 명단 파일 작성·실데이터 비교·공개 ★★★ 변경은 수행하지 않았다.**
- 기존 Core 5분 주기, MarketParquet 제공자 호출, PC 저장/SQLite, HTML 게시, GitHub `main`, Cloudflare 배포 모두 변경하지 않는다.

## 검토 참조 명단 입력

실제 사용 시 PC 승인 저장 경로의 `local-market-calendar-r58-user-reference.json` 파일을 읽는다. **다음 구조는 형식 예시이며 132개 목록이나 적격성 승인이 완료됐다는 뜻이 아니다.**

```json
{
  "version": 1,
  "method": "R58_USER_REVIEWED_TOP132_TOP100_R1",
  "userProvided": true,
  "eligibilityReviewed": true,
  "permissionForLocalComparison": true,
  "referenceDate": "2026-10-31",
  "top132": ["AAPL", "NVDA", "MSFT"],
  "top100": ["AAPL", "NVDA", "MSFT"]
}
```

- 실제 `top132`에 **검토된 서로 다른 기업 132개**, `top100`에 그중 정확히 100개가 있어야 한다. 같은 발행사의 복수 주식 종류는 별도 기업으로 이중 계산하지 않는다.
- 중국 본사·OTC 등 제외 여부와 미국 상장 해외기업 허용 범위가 사용자 승인 규칙과 일치하는 참조 자료만 넣는다.
- 전체 500종목 원자료나 시가총액 수치의 복사·재배포는 요구하지 않는다. 참조 목록의 실제 신원과 권리 확인 없이 플래그를 `true`로 지정해서는 안 된다.
- 기준일이 R57 거래일보다 미래면 차단한다. 과거 참조일과 R57 거래일이 다르면 `sameDate:false`를 명시한다. **과거 참조 명단 일치율은 시점이 일치하는 예측 정확도가 아니다.**

## 결과 해석

| 보고 필드 | 해석 |
| --- | --- |
| `matches`, `agreementPct` | 참조 상위 132개 중 R43 ★★★에 포함된 기업 수 및 132개 대비 비율 |
| `top100InModelTop132` | 참조 상위 100개 중 R43 ★★★에 포함된 기업 수 |
| `top100InModelTop100` | 참조 상위 100개 중 R43 순위 상위 100개에도 속한 기업 수 |
| `belowCutoff` | 모집단에는 있으나 R43 ★★★ 정원 밖으로 밀린 참조 기업 수 |
| `sourceGaps` | 검토된 전체 후보 모집단에서 찾을 수 없는 참조 기업 수 |
| `modelOnly` | 참조 상위 132개에는 없으나 R43 ★★★인 기업 및 그 순위 |
| `watchlist` | M7, LLY, CAT, ARM, ANET, SHOP, DE, BRK 등 핵심 기업의 **실제 모델 순위만** 진단. 보장 예외 아님. |
| `optionalFieldCoverage` | R57에서 검증된 배당·EPS·성장률 입력 확보율. 결측 필드가 많은 경우 기존 500종목 탐색 산식과 실전 점수의 차이 요인이 될 수 있음. |

소재지·발행사 중복 확인에 사용할 `issuerId`가 자료별로 다를 수 있으므로 R43 최종 결과의 티커 집합과 참조 티커를 교차 대조한다. 출처별 기업 ID가 다르다는 이유만으로 같은 기업을 누락 처리하지 않는다. 모순된 명시 ID는 차단한다.

## 실행·보호 계약

1. R57의 21일 R45 snapshot 무결성·사용권·전체 발행사 적격성·R43 확보율을 먼저 통과해야 한다.
2. `node scripts/pc-writer/market-calendar-r58-r43-shadow-audit.mjs`는 **기본적으로 읽기 전용**이며 표준출력으로 JSON 결과를 보여줄 뿐 파일을 만들지 않는다.
3. 사용자 제공 상위 132/100 전체 명단이 없으면 `R58_USER_REFERENCE_MISSING`, R57 입력이 부족하면 `R58_R57_SHADOW_NOT_READY`로 종료한다. 파일이나 기업을 가상으로 생성하지 않는다.
4. 최종 공개 등급 파일 `local-market-calendar-r43-ranked.json` 쓰기 없음. 수집 API/DB/스케줄러/게시 변경 없음. 로그 파일, 새 원자료, 디버그 산출물을 PC E:에 쌓지 않는다.

검사: `node --test tests/market-calendar-r57-r45-offline-r43.test.mjs tests/market-calendar-r58-r43-shadow-audit.test.mjs`.

실제 적격 132/100 참조 명단과 R45 21거래일이 준비된 뒤에는 **실제 일치율, 점수상 탈락, 모집단 누락, 보조 재무 항목 결측을 분리**해 보고할 수 있다. 이 단계에서 R43 가중치는 바꾸지 않는다.
