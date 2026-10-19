# Iran R3 V43 — 2차 분류 보정 최소 후보 (Draft / 미배포)

2026-10-19 PC V42 READ_ONLY 검증: baseline **36.3점 / 11신호**, 7개 기사 날짜별 재구성 기록과 영역별 점수 일치. L10 복합 liveblog 보도 1건 검토 보류 **shadow 38.7점 / 10신호**, 군사 4→16, 해상 20 유지. 이는 종전 확률이나 사건 진실 검증이 아닌 **기존 R3 계산식의 변경 영향 비교**다.

## 소스 최소 패치

- `lib/iran-progress/reference-flow-r3.mjs`: `CLASSIFIER_VERSION = IRAN_EVENT_RULES_R3_3`으로 상향하여 기존 불변 R3_2 결정·체크포인트를 덮어쓰지 않고 새 분류 실행을 분리.
- 기존 분류기의 1개 경로에만 **`COMPOUND_LIVEBLOG_REQUIRES_EVENT_REVIEW`** 추가: `Iran war live:`, `Israel war live:`, `Middle East live:` 등 기사 라이브 제목에서 세미콜론/구분 기호로 **별도 사건을 나열한 경우만** 자동 공격 점수 반영 보류.
- 단일 사건 제목, 기본 사건 규칙·단계 `delta`, 지역 판정, 30/25/20/15/10 가중치, 점수·체크포인트·공개 데이터 스키마·스케줄·TTL 유지.
- `L10`의 **Iran 문맥을 실제 선박 공격 주체로 취급**하는 오류를 막는 최소 변경. 기사 발생일, 공격 주체, 침몰 여부는 이 패치로 자동 확정하지 않음.
- `H01` 중복 보류는 보존하고 `L05` Tasnim 선박 침몰 보도와 UKMTO 별개 사고 경보는 검증 전 자동 병합/배제하지 않음.

## 현재 상태와 Production Gate

- PR은 **Draft 후보 코드**, 운영 main에 미병합, Cloudflare/D1/PC에 적용하지 않음.
- 기존 11개 발표일 기반 신호 재현 테스트는 L10만 제외하고 **38.7 후보/10건**. 기존 R3_2 저장 기사 하나를 분리된 R3_3 결정으로 다시 분류하는 in-memory 테스트 포함. 실제 PC의 새 코드 실행/게시 성공을 의미하지 않음.
- 실운영 적용 전: exact 작업 SHA, PC 저장 원장 비교, 기존 정상 게시·기록 보존, 기존 scheduled launcher 경로·수집 주기, 변경된 최소 코드 회귀 검사, 공식 Git Integration 배포, D1 readback, API/UI 검증 필요.
- 새로운 기준은 과거 공개 점수 `AS_PUBLISHED` 이력을 소급 수정하지 않으며, `0`/null/미관측을 바꿔치기하지 않는다.

**승인 없는 Production 배포 또는 정식 score overwrite 금지.** 1차 R3 36.3점은 그대로 유지.
