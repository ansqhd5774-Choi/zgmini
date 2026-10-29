# R81 — 01~04 확정 산식 결과의 Stage05 전달 경계

> **최신 R85 규칙 적용:** 구 R81/R84의 `G/D/M4/E/T/S5` 재계산 및 원자료 추가 요구는 현재 계약에서 제거됐다. Stage05는 이미 완료된 1~4단계의 **최종 결과**를 전달한다. [현행 R85 계약](README_STAGE05_DEDUPLICATED_RESULTS_R85_20261028.md)을 참고한다.

- 대상: 기존 전용 브랜치 `codex/investment-15-stage-m2-r25-20261025`만 사용.
- 범위: Stage05의 **읽기 전용 입력 연결 및 Ollama 조사 시작 Gate**. 01~04 산식·데이터·운영 프로그램을 수정하거나 원천을 재조사하지 않는다.
- 01~03의 역사적 F는 04단계 실측 M4가 아니다. R77의 미래 CAGR 11.285%도 M4나 S5로 대체하지 않는다.
- R78 연구용 S5 계산기/검증 로직은 그대로 사용한다. 프로그램은 기존 산식 계산과 자료 전달만 맡고, 최종 테마/기술 판단은 Ollama의 근거 기반 조사 대상으로 남긴다.

## 사용법

```text
node research/investment-15-stage/stage05/stage05-fusion-readonly.mjs --handoff-existing
node research/investment-15-stage/stage05/stage05-fusion-readonly.mjs --handoff-input verified-stage01-04-snapshot.json
```

- `--handoff-existing`: R17 보존 입력만 로드. 이미 연결된 9개 승인 테마·과거 F·산업 원천 범위를 보이되 최종 점수와 Ollama 요청은 만들지 않음.
- `--handoff-input`: 기존 01~04의 **원자료·구성값**을 연결한 JSON을 제공하면 Stage05 계산기가 G/D/M4/E/T/S5를 직접 산출한다(R84). **이미 계산된 최종 점수 파일을 요구하지 않는다.** 9개 후보가 모두 완결된 경우에만 Ollama 조사 입력 JSON을 반환. Ollama 실행·인터넷 검색은 수행하지 않음.
- JSON의 `ollamaInput=null`은 **조사 미시작 Gate**다. 종료 코드 `2`는 정상적인 입력 미완료이며 실행 실패가 아니다. 코드 `1`만 잘못된 입력/실행 오류를 뜻한다.

## 2026-10-28 개발 환경 결과

| 항목 | 결과 |
|---|---:|
| R67 승인 테마 | 9/9 |
| R17 보존 과거 공포·탐욕 | 9/9, 2026-10-23 관측 |
| 보존 산업 원천 흔적 | 7/9 |
| Stage04 실측 확정 M4 | 0/9 연결 |
| 현재 Stage05 최종 점수 | 0/9 |
| Ollama 조사 요청 | `null` (실행 안 함) |

출력: `status=BLOCKED_STAGE01_04_SCORES`, `exit=2`. 이는 과거 자료가 실패했다는 판정이나 사용자 Windows 운영 결과가 아니다. **최종 산식 점수 미연결**을 보여 주는 진단이다.

검증: 새 R81 단위 테스트 5개와 기존 R78~R80 시험을 회귀 실행. Stage03 승인 9개 변경 없음, 새 10번째 테마 삽입 차단, 과거 F/산업 프록시의 최종 점수 승격 차단, 부분 E 보존·S5 차단, Ollama 자동조사 미실행.

## 다음 Gate

기존 01~04의 **관측 원자료·구성값**(Stage02 ETF 가격 RS, Stage03 ETF 가격 추세, Stage04 검증된 실측 G1/G2/F)과 관측일이 동일 입력에 있어야 한다. `M4`·`E`·`T`·`S5` **완성값을 별도로 확보할 필요는 없다.** 해당 최종 점수는 Stage05 계산기가 산출한다(R84). 없는 원자료·날짜를 임의 생성하거나 R77/R63 전망 CAGR로 실측 G1/G2를 대체하지 않는다.
> **R89 계약 교체:** 이 문서의 산업 실측 M4/S5 필수 입력/전달식은 폐기. Stage04 `FINAL_CONFIRMED` 사용자 선정 증거만 다음 단계로 전달한다. [현행 R89](../STAGE04_R89_REMOVE_REALIZED_INDUSTRY_YOY_ACCEL_20261029.md).

