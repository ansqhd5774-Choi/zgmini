# Ollama 근거 분석 연결 R1.4 — 2026-10-09

실행 전 실제 SQLite에서 모델 digest를 포함한 분석 decision은 0개였다. Ollama 서버와 모델 목록 조회는 HTTP 200이었다. PC 예약 launcher는 collect-r14.mjs만 실행하며 기사 분석 자동화가 활성화된 상태는 아니었다. 기존 run.mjs의 --ai 경로는 IAEA RSS 일부와 발견 기사 제목만 처리하며, GDELT 구조화 행에는 원문 제목이 없어 분석을 보류한다.

analyze-receipts-r14.mjs는 기존 불변 source ledger의 원문 발췌와 해시를 검증하여 최대 3건씩 모델에 전달한다. 원문 없는 기사나 임의 생성 텍스트는 사용하지 않는다. 모델 이름이 중복되면 digest identity가 모호하므로 실행을 거부한다. 결과는 모델·digest·프롬프트 버전·추론 설정·출처·원문 해시와 함께 불변 decisions에 저장하고 재조회한다. 동일 identity는 재사용한다. 원문에 없는 인용·schema 오류는 저장하지 않는다. 분석 결과는 CANDIDATE_ONLY/PENDING이며 사건 검증·점수 입력·관측 범위·공개 게시를 변경하지 않는다.

실제 qwen3:4b 실행에서 초기 기본 설정으로 유효 결과를 저장하지 못했다. 추론 비활성화 진단 요청은 정상 JSON을 반환했지만 기사 요청은 schema 검증에 실패했다. think:false와 명시적 JSON schema를 함께 사용한 후 일본 외무성·미국 재무부·UKMTO 156-26의 기존 원문 발췌 3건에서 각각 후보 1건을 생성하고 실제 저장·재조회를 확인했다. 오류를 피하기 위해 사실 검증 조건을 낮추지 않았다. format schema와 think 설정은 Ollama 공식 generate API 문서를 확인했다: https://docs.ollama.com/api/generate

이는 EXCERPT_ONLY 분석이며 전체 기사 분석 또는 모델 가중치 재학습 완료가 아니다. 프롬프트·schema의 실행 계약을 개선한 단계다. 검토자의 확정·정정 근거를 이용한 사례 평가와 전체 원문 수집/이용 조건 확인, 예약 수집 후 bounded 기사 분석 연결은 후속 작업이다. 현재 수집 예약은 그대로 유지했다. 모델을 실행했다고 자체 VERIFIED나 READY를 생성하지 않는다.

실행 예시:

```text
node scripts/iran-progress/analyze-receipts-r14.mjs --model=qwen3:4b --source=<기존 source receipt id>
```

DB schema·산식·가중치·UI·D1·배포 변경 없음. 새 계정·모델 다운로드·유료 API 이용 없음.
