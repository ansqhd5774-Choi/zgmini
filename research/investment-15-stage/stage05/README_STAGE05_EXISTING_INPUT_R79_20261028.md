# R79 — 01~04 실제 보존 입력 연결·9개 테마 누락 검사

- 저장소 `ansqhd5774-Choi/zgmini`의 기존 브랜치 `codex/investment-15-stage-m2-r25-20261025` 전용.
- R78 E/T/S5 핵심 산식은 그대로. M2 기존 실행기, 01~04 운영 프로그램, 테마 자격, 기존 웹사이트·예약·DB·주문은 변경하지 않는다.
- 자료 재수집이나 신규 발행사 선정 대신 **이미 있는 R67 승인 9개 ID + R17 실측·F 역사 기록**을 실제 그대로 연결했다.

## 실행 코드

- `stage05-existing-evidence-bridge.mjs`: `STAGE03_THEME_IDS` (R67)과 `parseR17History` (R69) 재사용. 승인 9개·R17 관측일·F 값·잠정 상태·산업 프록시의 7/9/6/9를 일치시키고, S5 계산기의 `NULL` Gate까지 전달.
- `stage05-existing-evidence-bridge.test.mjs`: 실제 보존 R17 보고서를 대상으로 회귀 테스트(9개). 현재 F와 역사 F 분리, R25 다른 연구 목록의 신규 테마 혼입 차단, 중복 ID, 데이터 유실, 미래 날짜, R67 잠정값 선택.
- `stage05-fusion-readonly.mjs` 확장: `--audit-existing` 기존 보존 파일만 읽는 오프라인 진단. `--audit-existing-live`는 기존 M2 3개 공개 점수 API를 **각 1회** 조회하여 기존 R67 공식 `selectThemeF`를 같은 API 응답에 적용한다. 역사 F와 현재 F의 기간 혼용을 하지 않는다.
- `STAGE05_FUSION_READONLY.cmd`: 인자가 없을 때 `--audit-existing-live --output-dir "%~dp0"` 실행. 매회 고유 이름의 `STAGE05_R79_AUDIT_*.json` 파일을 **새로 생성**한다(`wx`, 기존 로그 덮어쓰기 없음). 파일에는 개인정보·원문 페이지·API 키 없이 관측일·출처·진단값만 저장. Exit `2`는 **정상 진단, 실점수 결측**이지 Windows 실행 장애가 아니다.

## 실제 보존 데이터 오프라인 실행 판정 (2026-10-28)

`node research/investment-15-stage/stage05/stage05-fusion-readonly.mjs --audit-existing`

| 검사 | 결과 |
|---|---|
| 승인 테마 ID | 9/9, R67 원본 고정 |
| R17 보존 F | 9/9, 실제 관측일 `2026-10-23`, 재조회 `2026-10-25` |
| R17 지정 산업 원천 확인 | 7/9 (역사적, 대리 지표 포함) |
| 증감 방향 확인 | 6/9 |
| 최신 운영 F | **0/9 조회 안 함** — 오프라인 판정에서 새 값인 척 하지 않음 |
| 02 섹터 ETF 가격 RS | 0/9, 현행 공개 API에는 공탐 이력만 확인됨 |
| 03 테마 ETF 1년 가격 Trend | 0/9, 현행 공개 API에는 공탐 이력만 확인됨 |
| 04 정규화 실측 M4 | 0/9, 역사 원천만으로는 G1/G2 부족 |
| R79 실제 S5 순위 | 0/9, 전부 `NULL`/BLOCKED |

- R25 연구 화면의 9개 참고 주제에는 `AI 반도체`가 있고 R67 승인 목록의 `데이터센터·전력`은 없다. **이는 참고 주제와 R2 승인 테마를 구분해야 한다는 코드·문서상 불일치이며, 실제 현재 API에 이 차이가 존재한다고 단정하지 않는다.** 프로그램은 현재 API 반환 주제의 이탈/누락을 따로 보여주고 자동 10번째 테마로 승인하지 않는다.
- R17 공포·탐욕의 낮은 F와 증가 산업 프록시 3건은 기존 연구 가설이지 새 순위가 아니다. 2026-10-23 F를 2026-10-28 값으로 취급하지 않는다.
- R77 미래 CAGR은 전혀 M4로 바뀌지 않는다. TBRC, SkyQuest, Precedence Research 3매체 확정 및 BRI 403 제외 규칙도 변경 없다.

## 개발 검증과 실측 한계

- R79 실제 보존 자료 조인 테스트 **9/9 PASS**, 기존 R78 핵심 산식 테스트 **11/11 PASS**, 총 **20/20 PASS** (Node v24, 개발 환경).
- 오프라인 CLI `--audit-existing` 실제 실행 성공, 프로그램의 예상 exit 2와 9/9·7/9·6/9 수치 확인. `--output-dir` CLI도 JSON 파일 생성 및 요약 출력 확인.
- 네트워크가 차단된 개발 환경이므로 Windows 사용자 PC의 `--audit-existing-live` 성공·현재 운영 F 9/9 수집은 **검증하지 않았다**. CMD를 사용자가 실제로 실행하면 고유 JSON 결과 파일을 남기게 하는 코드까지 구현했다.
- 최종 S5를 만들려면 02 가격기반 ETF RS, 03 가격기반 ETF Trend 및 04 정규화 실측 G/M4가 **기존 실제 공식 자료에 존재하는지** 확인해 입력 계약으로 연결해야 한다. 존재하지 않는 값을 점수나 가상 정상값으로 생성하지 않는다.

## 근거

- [R17 9개 F·산업활동 보존 근거](../STAGE04_INVESTMENT_BOT_R17_SENTIMENT_INDUSTRY_CONTRAST_20261025.md)
- [R69 실제 기존 자료 이력·출처 결합](../stage04-r69/STAGE04_R69_EXISTING_EVIDENCE_JOIN_20261027.md)
- [R78 융합 계산기 입력 계약](README_STAGE05_FUSION_R78_20261028.md)
