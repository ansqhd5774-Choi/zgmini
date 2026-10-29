# 4단계 R88 — 기존 결과 재사용 연결기 (새 수집 없음)

작업 브랜치: `codex/investment-15-stage-m2-r25-20261025` — 신규 브랜치 생성 금지.

## 목표·계약

- R86이 만든 21개 전망 평균 + 전체/섹터/테마 F의 저장된 결과 **그대로 읽기**.
- 이미 4단계에서 2026-10-25 실제 조회·검증한 R15 공식 산업관측 **9개 테마**와 R3에서 확인한 실제 성장 가속도 3개를 **기존 보고서에서 읽기**.
- 신규 공식 기관 재조회, Ollama 재조사, 사용자의 저장된 원장 수정, API/D1 쓰기 **0회**.
- IFR +11%와 IEA 약 +17%는 **반올림 공표 값**, Eurostat +7.42%p는 **2년 보급률 변화**, ENISA 9%는 **설문 예산비**, CPUC/FedNow/FDA는 **기관별 대리 지표의 실측 전년비**로 구분한다.
- R15 이후 미조회한 IAEA/SIPRI 값은 이전 R3의 잠정 표기에서 가져오지 않는다. 우주·위성은 연구 전용으로 Stage03 승인 대상 9개와 분리.
- 실측 `YoY %` 및 가속도 `%p`와 G1/G2 **자체 산업 정규화 점수는 다른 값**. R2 제안 가중치 미승인으로 G/D/M4, 순위, 최종 선정은 `NULL`. 프로그램이 자체 판단·점수 생성을 하지 않는다.

## 기존 파일만을 이용한 실행

브랜치 루트 기준:

```bash
node research/investment-15-stage/stage04/stage04-r88-existing-results-bridge.mjs \
  --r86 STAGE04_R86_LIVE_NUMERIC_RESULT_20261029.json \
  --json STAGE04_R88_JOIN.json --md STAGE04_R88_JOIN.md
```

`--archive-dir` 생략 시 저장소의 `research/investment-15-stage` 보고서 2개를 읽음.

- 실제 과거 R17 게이트 JSON이 사용자 PC에 저장되어 있으면: `--gate PREVIOUS_R17_GATE.json` 사용 (아카이브 대신 기존 구조화 결과 재사용). 원본을 다시 조회하지 않음.
- 별도 1단계 완결 시장 점수가 저장되어 있으면: `--stage01 SAVED_STAGE01_RESULT.json` 지정. `market_score`, `market_label`, `observation_date`, `point_status`, `source_version` 확인. `/api/fear-greed`를 시장 점수로 오인하면 거절.
- Windows는 `STAGE04_R88_REUSE_EXISTING.cmd` 실행. 기존 R86 JSON을 CMD에 끌어다 놓거나 같은 폴더의 저장 결과를 이용. `E:\ZGmini\runtime\node.exe` 우선, 없으면 설치된 Node 이용. 보고서·코드·R86 JSON을 동일 폴더에 두면 다른 준비 작업 불필요.
- 새 실행마다 결과 JSON·Markdown을 별도 이름으로 저장. Windows 본 PC 실행 성공은 사용자가 전달한 로그를 통해 추가 확인할 것.

## 검증 구별

1. 자동 테스트: 구조 오류/유실/변조/중복/시장 점수 혼동/무단 M4/무단 주문 실패 처리.
2. 실제 보존 데이터 통합: `STAGE04_R86_LIVE_NUMERIC_RESULT_20261029.json`과 원본 R15·R3 문서를 **읽어** 기대 결과 숫자를 실제로 생성하여 확인.
3. 사용자 Windows PC CMD 실행: **아직 실행 증거 없음**. 로컬 통합 실행과 동일하게 취급 금지.
4. 게시·자동매매: 수행하지 않음.

**다음 단계:** 미연결 1단계 독립 시장 점수의 실제 저장 결과 연결, Stage04 G/D/M4 산식 승인 후 기존 실측을 이용해 계산. 동일 공식 원천의 산업 실측 재수집은 이번 연결 작업에 포함하지 않음.
