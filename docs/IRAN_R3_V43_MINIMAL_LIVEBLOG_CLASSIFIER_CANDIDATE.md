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

## V45 Source Gate 정정 — Windows CRLF에 의한 false source drift

- PC read-only 진단: 활성 E: 런타임 HEAD `016c6c19ef0b764a280e416f0d579cfc925d839a`, detached, tracked dirty 0, 공식 repo remote 일치, 분류기 R3_2.
- V45 PC raw working-tree Git blob hash: `27f003e2b8e0bad72209c62b9706070e900ddf71`.
- GitHub에서 **정확한 활성 HEAD**의 원본 LF 분류기를 재조회: Git blob `f63b8d63c3383c6b7e33788345d68da378f61bd9`. 현재 main 원본 분류기와 완전 일치.
- 동일 원본을 LF→CRLF로만 변환해 Git Blob SHA-1을 독립 재계산하면 `27f003e2b8e0bad72209c62b9706070e900ddf71`로 **PC 측정값 40자리 완전 일치**. V45의 `SOURCE_DRIFT_REVIEW_REQUIRED`는 정규화 누락으로 인한 **diagnostic false positive**이며, 현재 운영 분류기의 실제 본문 드리프트 증거가 아니다.
- 활성 HEAD 대비 최신 main의 R3 핵심 8개 파일 비교: 7개 완전 동일(분류기, 계산기, R3 wrapper, 게시기, 검증기, 저장소, 기존 runner); 1개 `continuous-news-r3.mjs`는 main에 분류 기사 수/미분류 사유를 보고하는 **8줄 telemetry만 추가**. 점수/분류/수집 주기 변경은 아니다.
- 이전 HEAD라는 이유로 운영 소스를 최신 main으로 pull/overwrite하지 않는다. 새 V43 후보는 별도 Draft SHA `302393b7d1669b49cc2175931c45fc54c8bd5e77`로 여전히 미병합·미배포.
- 향후 source gate에서는 PC working-tree raw SHA와 GitHub LF blob SHA를 직접 비교하지 말고, line-ending 정규화 후 Git blob 또는 Git index blob과 비교할 것.

이 정정은 PC DB/D1/스케줄/공개 점수/배포를 변경하지 않는다.
