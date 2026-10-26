# Stage04 01/21 — R47 단발 Ollama 스키마 진단 계획

- 날짜: 2026-10-27 KST
- repository: `ansqhd5774-Choi/zgmini`
- branch: `codex/investment-15-stage-m2-r25-20261025` (고정)
- 선행 문서: `STAGE04_R45_SEQUENTIAL_21_TOPIC_SEARCH_SPEED_PLAN_20261027.md`, `STAGE04_R46_TOPIC01_R45_EVIDENCE_CORRECTION_PLAN_20261027.md`

## R46 실측 증거

1. 사용자 TXT: 4회 전체 정상 종료, 측정 6,584ms 중앙값/13.1% 편차. 원문·검색 성공 속도라고 볼 수 없음.
2. TBRC R29 내부 산술 검증 4/4 `CONSISTENT`; Ollama 4/4 `OLLAMA_SCHEMA_INVALID`. R45의 과거/전망 CAGR 혼동은 데이터 후보 분리로 차단됐으나 **Ollama 응답 검증 원인이 아직 불명**.
3. BRI 기존 공식 URL과 카탈로그 403; SkyQuest는 프록시; Precedence 직접 보고서 부재; Google HTTP 429로 이어지는 Bing 경로를 중단한 분기 문제 발견.

## R47 1회 실행 규칙

- **TBRC 공식 원문 GET 1회 + 사용자 PC Ollama 모델 호출 1회**. 이전 R46의 동일 스키마·모델·온도·인덱스 선택 계약을 그대로 재현.
- 공식 HTML에서 R29 전망 문장만 추출; 과거 저장 R35 성장률 재사용 금지. 출처 감사 충돌 시 모델 호출 중단.
- 반환 JSON 원문(최대 450자), 파싱 상태, 필드명·자료형, 정수 인덱스 여부/후보 범위, scope 허용 여부, 모델 소요시간을 TXT로 보존.
- 단일 진단 결과로 21개 전체를 통과 처리하지 않는다. 무근거 자동 교정·모델 교체·반복 재시도 금지.

## 진단 이후 처리 순서

1. 결과에 따라 **키 추가/자료형/인덱스/JSON 생성/모델 응답 길이** 중 실제 확인된 원인만 최소 수정.
2. R46의 Google 429 예외에서 Bing까지 중단하는 `break` 처리도 수정하며, Bing/공식 카탈로그 후보를 개별 검증한다. 검색 제한을 우회하지 않는다.
3. 새 반복 본 측정: 주제 01 한 개만 예열 1회·측정 3회; 정상 성공시간과 차단/빈검색 진단시간 별도 집계.
4. 01의 출처 범위·접근권·Ollama 반복 결과가 승인될 때까지 02와 21개 일괄 작업 금지.

## 변경 금지

새 브랜치·PR·main·Cloudflare 배포·산식·DB·저장 API·주문·스케줄러·유료/종량제 API·HTTP 403/429 접근 우회 금지. 기존 R46 파일·원본 PC 로그 보존.
