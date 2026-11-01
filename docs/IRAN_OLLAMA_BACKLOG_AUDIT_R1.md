# 이란 Ollama 후보 처리 회복·감사 — PR #399

**상태:** GitHub Shadow 후보 처리만 개편. PC 로컬 런타임 미실행, 운영 확정 아님.

기존 `continuous-news-r3` 공개값은 **Ollama 전체 기사 분석 결과가 아니다**. R3는 헤드라인 규칙 분류기 기반이다. `analyzed=50`, `accepted=4`와 Ollama `interpretSource` API 성공건수는 별개의 값이다.

## 50건 처리 방침
- 저장된 GDELT `discovery_candidates`를 최대 20건/한 실행으로 선별.
- 개별 모델 오류는 해당 후보를 `DISCOVERED`로 남겨놓고 다음 후보 계속 진행.
- 로컬 `checkpoints.ollama-candidate-batch-cursor-v1`의 `afterId`로 순환 공정성 확보. 동일 실행에서 중복처리 없음. 실패한 후보는 이후 순환에서 다시 시도하며 영구 폐기하지 않음.
- 결정이 먼저 DB에 저장되고 후보 상태 갱신 전에 실행이 끊긴 경우, 저장된 동일 모델 Digest/Prompt 버전의 결정만 재사용.
- `attempted/processed/failed/failedByReason/remaining`으로 처리량/실패 분리. 오류 원문·URL·모델 응답·비밀은 로그 출력 금지.
- Ollama는 **표제에 포함된 주장 후보**만 추출한다. 기사 전체 검증 아님. 이 결정은 단독으로 전쟁 사건, 종전 점수, 공식 기사 채택의 증거가 될 수 없음.
- 공급자 호출/스케줄러 주기/기존 DB 테이블/산식/Cloudflare 운영 키/공개 결과 변경 없음.
- `tests/iran-progress-candidate-batch.test.mjs`: 50건 20/20/10, 실패 1건이 49건을 막지 않음, 모델 OFF에서 큐 보존, 저장 후 크래시 재개.

**운영 전 조건:** 실제 PC 저장 큐 건수와 Ollama 모델 응답 분포를 읽기 전용으로 검산. 전체 원문이 없는 GDELT 발견 정보는 기사 상세 사실을 검증했다고 간주하지 않음.
