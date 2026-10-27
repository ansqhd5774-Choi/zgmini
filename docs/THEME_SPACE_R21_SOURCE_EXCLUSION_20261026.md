# 우주·위성 R21 — 수집 불가 ETF 중단·제외, 가능한 데이터만 비공개 검산

- 2026-10-26 사용자 새 승인: **ETF 필수 자료 수집이 불가능하면 무한 조사·수집·재시도를 중단하고 해당 분석에서 제외**한다. 증거 없는 수치 대체·옛날 데이터를 오늘로 표시·영구 데이터 삭제는 하지 않는다.
- GitHub 전용 브랜치: `codex/theme-fear-greed-integration-20261025`, Draft PR #714. **main/공개/D1/스케줄러/기존 테마 변경 금지**.
- 현재 9 ETF 후보에는 **고정 수량 상한 없음**. 실제 R15/R18 PC 2026-10-23 원본·R2 현재 점수는 6개; ORBX/DIPR/WSPC는 보유 원자료가 있더라도 현재 점수 `null`이다. R14 수집 성공을 무효화하거나 재수집하지 않는다.

## 1. 데이터 매체·권한 실사

1. 우선 순위는 **공식 발행사 수치**다. NASA/UFO/WARP/ORBX/ROKT의 공식 페이지에서 날짜가 표시된 보유비중 숫자를 실제 읽었다. 기준일 10/22 또는 10/23을 각각 보존한다.
2. MARS와 ARKX의 공식 페이지에는 Holdings CSV/PDF 다운로드 **표시는 존재**하지만, 이번 무료 정적 웹 접근에서는 **현재 비중 숫자가 표시되지 않았다**. 따라서 **이번 R21 비공개 분석에서 제외**한다. **ETF 가격 자체가 없는 것, 공식 CSV가 영구 제공되지 않는다는 뜻은 아니다.** 같은 실패 경로 재시도는 0; 별도로 검증 가능한 공식 파일이 들어오기 전 이번 판정 유지.
3. 주식정보 공통 사이트 StockAnalysis에서 **9 ETF 모두의 보유종목 조회 페이지가 존재**함을 1회 확인했다. 그러나 [이용약관](https://stockanalysis.com/terms-of-use/)은 봇/스크립트/자동 브라우저 수집과 사이트 자료를 이용한 경쟁 DB·제품 구축을 제한한다. 따라서 ZGMINI의 자동 데이터 공급원으로 연결하거나 보유자료를 Git에 복제하지 않는다. 구독·유료 API 결제 없음.
4. MARS/ARKX의 일반 웹 조회 내용은 **비공식 참고 수준**이지 R21 공식 수집 성공이 아니다. 날짜/지분 구조가 다른 ETF 수치를 무조건 일치하라고 요구하지 않되, 누락한 공식 숫자를 0으로 두지도 않는다.

## 2. R21 당시 실측 가격과 발행사 보유비중의 교집합

| ETF | 실제 PC 10/23 R2 현재 점수 | 공식 보유숫자·관측일 | R21 이번 비공개 판정 | 재수집·재시도 |
| --- | ---: | --- | --- | --- |
| UFO | 34.88492 | 10/23 있음 | 포함 | 0 |
| NASA | 48.90703 | 10/23 있음 | 포함 | 0 |
| WARP | 60.52650 | 10/22 있음 | 포함(날짜 표시) | 0 |
| ROKT | 44.09211 | 10/22 있음(우주+심해) | 포함(순도 검토 별개) | 0 |
| MARS | 47.76741 | 최신 공식 숫자 현재 미조회 | **이번 분석에서 제외** | 0 |
| ARKX | 31.69048 | 최신 공식 숫자 현재 미조회(우주+방산) | **이번 분석에서 제외** | 0 |
| ORBX | null | 10/23 있음 | **현재 실제 R2 점수가 없어 제외** | 0 |
| DIPR | null | 점수 40일 미달 | **현재 실제 R2 점수가 없어 제외** | 0 |
| WSPC | null | 점수 40일 미달 | **현재 실제 R2 점수가 없어 제외** | 0 |

- **9종 원본 보존**. `exclude`는 R21의 현재 계산 후보 제외이며 ZIP/PC 저장원본 삭제, 과거 252일 R18 점수 재작성, 종목 영구 상장폐지 선언이 아니다.
- R4-A 원래 **6종 비공개** 점수 42.38768은 기존 R18 SHA에 고정해 보존한다. 4종으로 축소한 수치는 R21 실 PC SHA 검사 후 별도 **새 비공개 제안값**으로만 출력한다. 과거 R18 전체 252일을 현재 공식 자료 상태로 역산하지 않는다(사후 정보 편향 방지).
- 발행사 자료 날짜가 10/22·10/23으로 하루 다른 것만으로 전원 FAIL 시키지 않는다. 관측일 명시·현재/과거 결측 구분을 우선한다.

## 3. 안전 구현·실행

- `scripts/pc-writer/theme-space-satellite-r21-issuer-evidence.json`: 9종 공식 접근 증거의 **날짜 고정 연구 스냅샷**, 새 라이브 URL GET 규칙 아님. 발행사 URL만, 가격/보유량 원문/키 없음.
- `scripts/pc-writer/theme-space-satellite-r21-source-gate.mjs`: 기존 R18 실물 SHA와 252일 추적 digest가 같아야 실행. 현재 R2 점수 + 공식 수치 가용성을 교집합해 4개를 추출, R4-A **미승인** 가중 산식에 넣어 **최근 하루** 비공개만 검산. 미자료 ETF는 즉시 제외, fallback 0 / 단일 ETF 가짜 점수 없음.
- `scripts/pc-writer/theme-space-satellite-r21-source-gate.cmd`: **Windows CMD 전용**, 정확한 12개 소스/JSON SHA256 확인 후 PC 기존 원본을 읽기만 한다. **가격/issuer GET 0, 재시도 0, raw/DB/D1/scheduler/공개 쓰기 0**. CMD 파일 옆 `SPACE_SATELLITE_R21_SOURCE_GATE_RESULT.txt`.
- 사용자 PC 수동 실행 전에는 R21이 실 PC 결과라고 보고하지 않는다. Node fixture PASS와 사용자 PC 실물 결과를 분리한다.
- `weightsApproved=false`, `rightsVerified=false`, `finalBasketSelected=false`, `publicationAuthorized=false` 유지. 최종 ETF 수는 자료 허용성과 사용자 승인에 따라 결정; 임의 정수 상한 없음.

공식 확인 사이트: https://www.procureetfs.com/ufo/ · https://temaetfs.com/nasa · https://www.vaneck.com/us/en/investments/space-etf-warp/overview/ · https://www.globalxetfs.com/funds/orbx/ · https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-kensho-final-frontiers-etf-rokt · https://www.roundhillinvestments.com/etf/mars/ · https://www.ark-funds.com/funds/ARKX .

배경 기사: Reuters (2026-05-22) https://www.reuters.com/legal/transactional/space-etfs-booming-anticipation-spacex-ipo-2026-05-22/ . 보도는 실물 ETF 보유 수치 검증의 대체물이 아니다.
