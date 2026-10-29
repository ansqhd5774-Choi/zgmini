# R89 — 공식 산업 실측·YoY·성장 가속도 조사와 관련 산식·프로그램 제거

- 적용일: 2026-10-29 (KST)
- 사용자 명시 지시: **“공식 실측자료·YoY·성장 가속도 조사 및 관련 산식·프로그램·기준을 제거”**
- 저장소: `ansqhd5774-Choi/zgmini`
- 기존 작업 브랜치: `codex/investment-15-stage-m2-r25-20261025`
- 배포·DB·PC 작업 예약 변경: 없음. 4단계 및 이를 필요로 하던 5단계 연구 소스 계약만 변경.

## 1. 폐기되는 현행 작업

1. R8~R17의 IFR·IEA·ENISA·CPUC·FDA·Eurostat·FedNow 등의 산업 활동 공식 원자료를 최신 실측 성장률로 수집·재검산·비교하는 경로.
2. R18~R22의 공통 산업자료 API 후보, 통합 시계열 수집·기관 검증 게이트, R88의 기존 7/9·5/9·3/9 재사용 브리지 및 CMD.
3. 실현 성장 YoY, 성장 가속도, 성장 백분위 G1/G2/G, 공탐 차이 D 및 최종 투자매력 M/M4에 연결되는 수식·검증기·실행 프로그램.
4. R67의 전망 CAGR 백분위−F 간격 실험, R68/R69의 G/F/D 역사 대조·매력도 비교 실행기, Stage05의 R80 FDA 실측 성장/가속도 재계산과 M4 의존 S5 자동 점수 전달.
5. 위 자료·수식이 완료돼야 Stage04가 다음 단계로 진입할 수 있다는 과거 기준. 역사 문서의 관련 조항은 현재 효력 없음.

## 2. 보존되는 작업

- 11개 섹터·10개 테마, 21개 **미래 전망 CAGR** 및 기존 R82 로컬 Ollama 원문 추출·발행사별 검증·2개 이상 매체 평균.
- 시장 전체 공포·탐욕, 섹터 F, 테마 F 3개 공개 피드 및 기존 ETF·공탐 계산 산식. 별도 Stage01 시장 점수는 독립 유지.
- Stage03 승인된 9개 테마 및 열 번째 우주·위성 연구용 상태. 사용자 승인 없이 자동 편입하지 않음.
- R86 읽기 전용 CAGR/F 결합 결과. 구버전 산업 실측·G/D/M4 필드와 필요 조건은 출력하지 않음.
- Stage05 이후의 **사용자 승인된 테마를 기반으로 한 기술·기업 조사**. 승인이 없으면 후속 단계는 보류하고 매매는 `NO_TRADE`.
- 과거 R2·R3·R8~R22·R68/R69·R78~R80 보고서 수치와 원문은 감사용 역사 기록으로 유지. **재실행 프로그램이나 효력 있는 산식으로 사용하지 않음.**

## 3. 새 승인/연결 계약

```text
Stage04 inputs:
  separate Stage01 market score, market F, sector F, theme F
  11 sector publisher-defined FORECAST_CAGR means
  10 theme publisher-defined FORECAST_CAGR means
  Stage03 approved-roster status

Stage04 final_selection:
  state = UNRANKED_REVIEW
  -> explicit user selection, approval evidence and date
  -> FINAL_CONFIRMED with confirmed_theme_ids

Stage05:
  receive only user-confirmed Stage04 themes
  no realized-industry collector, YoY, acceleration, G/D/M4, S5 or auto ranking
  no approval -> BLOCKED
```

이행 범위는 **소스·테스트·기준 문서 변경**이다. GitHub 브랜치 반영을 Cloudflare 운영 반영, Windows PC 프로그램 제거, D1 레코드 삭제 또는 런타임 검증 완료로 오해하지 않는다.
