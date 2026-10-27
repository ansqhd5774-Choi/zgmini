# 실적 침체 정보성 C — R4 2차 D1 저장·조회 코드 구현

- 2026-10-27 KST
- 저장소: `ansqhd5774-Choi/zgmini`
- 작업 브랜치: `codex/earnings-api-site-integration-plan-r1-20261026`
- 상태: **SOURCE_IMPLEMENTED / OFFLINE_TESTED / PC_DRY_RUN_NOT_RUN / D1_WRITE_NOT_RUN / WORKER_BUILD_NOT_RUN / PRODUCTION_NOT_DEPLOYED**
- 선행 근거: R4 PC 실측 JSON `EARNINGS_R4_C_READ_MODEL_PREVIEW_RESULT_20261027-061308Z.json` 5개 READY, sourceVersion `d7db335939bbdf07272f2467f8ad8239b01304727174ee606bc2db23324bb2af`.

## 1. 기존 운영과의 분리

| 항목 | R4 2차 코드 | 운영에 미친 영향 |
| --- | --- | --- |
| GET | `GET/HEAD /api/earnings-recession-indicators` | 별도 엔드포인트, 아직 미배포 |
| D1 snapshot | `detail:earnings-recession-indicators:v1` | 기존 `market_public_snapshots_v1` 테이블 재사용, **쓰기 미실행** |
| Writer | `worker/earnings-companion-c-r4.mjs` | PC 전용 수동 호출만 허용, 기존 스케줄러 연결 없음 |
| PC 수동 실행 | `scripts/pc-writer/EARNINGS_R4_C_D1_MANUAL.cmd` | 기본 dry-run, PC 원장 read-only 재검증 |
| 후보 Worker | `worker/candidate-r52.ts` | 정보성 C 라우트만 추가, 기존 점수 라우트 유지 |
| 기존 점수 키 | `detail:earnings-recession:v1` | 변경 없음 |
| 기존 공개 projection 9개 | `PUBLIC_PROJECTION_KEYS` | 변경 없음; 신규 키 추가 시 자동 점수 루프 오류 위험 방지 |
| 기존 D1 테이블/schema/TTL/Cron/Queue | 해당 없음 | 변경 없음 |

## 2. 신선도 정책 (독립적인 정보성 C 표시 가드)

**R4 PC 검증 단계에서 사용자 후속 진행 승인에 따라 적용할 보수적 기준이다.** 실제 Production의 신규 C API 노출은 여전히 별도 배포 Gate다. 공식 BLS 다음 발표일을 추정하거나 뉴스/외부 요청으로 대체하지 않는다.

| 주기 | 관측기간 **종료 다음 날 00:00Z** 기준 경과 한도 | 원본 API `retrievedAt` 기준 경과 한도 | 기본 처리 |
| --- | ---: | ---: | --- |
| 월간 PPI | 75일 | 75일 | 하나라도 만료 시 해당 행 `STALE` |
| 분기 ULC | 165일 | 165일 | 하나라도 만료 시 해당 행 `STALE` |

- 두 시계열이 같은 날짜에 발표된 것으로 간주하지 않는다. 원본 `observationPeriod`와 `retrievedAt`을 각각 검증한다.
- D1 게시 시각인 `stored_at`은 신선도 연장에 **전혀 사용하지 않는다**. 같은 `sourceVersion/sourceStoredAt` 재게시도 원본을 최신으로 만들지 못한다.
- 유효 READY 행이 하나 이상이면 GET 200(`READY` 또는 `PARTIAL`), 모두 만료·부재·무효이면 503(`STORED_PROJECTION_STALE/PENDING/INVALID`). 기존 8대 위험 점수에 영향 없음.
- `releaseDate`와 `nextReleaseDate`는 실측 공식 증거가 없어 `null`로 고정. 이 규칙은 BLS 발표 예정일 공식 매핑을 대체하지 않는다.
- 75/165일은 관측 신선도 관리용 **휴리스틱**이다. 공식 발표 주기·수정치·공표 지연일을 뜻하지 않는다. 이번 후속 승인으로 PC dry-run 검증에 사용하며, 실제 게시 및 배포 전 운영 영향은 별도로 확인한다.

## 3. D1 게시 안전 계약

1. PC SQLite `query_only=ON`, R3D hash·cohort 검증을 **재수행**해서 payload 생성; 임의 JSON 파일을 게시 입력으로 읽지 않는다.
2. `schemaVersion`, BLS 출처와 세 시계열, RAW/DERIVED, 0/null, 연속 관측기간, 결측점, 예상 history 13/5, cohort, `sourceVersion` SHA와 `sourceStoredAt`을 검증한다.
3. D1 SQL은 `market_public_snapshots_v1`에서 **정확히 신규 키 1개**만 upsert. 저장 이전 `sourceStoredAt`이 새 입력보다 오래된 경우에만 덮어쓴다.
4. 동일 `sourceStoredAt`+동일 `sourceVersion`+동일 데이터는 `ALREADY_STORED`; 동일 시각 다른 SHA 또는 동일 SHA 다른 데이터는 중단. 이전 시각 입력과 동시 race에서 밀린 경우 중단.
5. 쓰기 성공만으로 완료 처리하지 않고 **D1 readback JSON 본문·저장시각 완전 일치**를 확인한다. 네트워크 결과 불명확시 재시도/결과 추정하지 않는다.
6. 공개 GET은 별도 저장된 payload만 읽으며, checkpoint·D1 저장시각·월/분기 신선도를 검증한다. API GET에서 BLS 호출, PC 조회, 점수 계산, D1 write 없음.
7. public payload에는 BLS 원시 응답·토큰·인증정보가 포함되지 않도록 허용 키 검증. 저장 이력은 PIT가 아님(`CURRENT_RETRIEVAL_NOT_PIT`).

## 4. 수동 PC 검증 실행 가이드 (실제 사용자 PC에서는 아직 미실행)

먼저 승인된 PC 저장소 소스가 이 버전을 포함하고 있는지 확인해야 한다. 현 단계에서 임의로 운영 source를 교체하지 않는다.

기본 실행: `EARNINGS_R4_C_D1_MANUAL.cmd` → **DRY_RUN**; PC의 세 BLS 시계열을 읽어 5개 행 검증, D1 요청/쓰기 0. 결과는 Windows Desktop의 `EARNINGS_R4_C_D1_MANUAL_RESULT_<UTC>.txt`.

`--apply --confirm-earnings-c-d1-write`는 **향후 별도 D1 게시 승인** 이후에만 사용한다. 이 모드도 `main` 브랜치, `config.source == git HEAD`, 승인된 PC 수집 mode, 클린 코드 상태를 모두 요구한다. 이번 작업에서 호출하지 않았다.

## 5. 검증과 다음 Gate

| 검증 | 상태 |
| --- | --- |
| 사용자 PC R4 미리보기 5행 새 계약 검증 | PASS (로컬 오프라인 검증) |
| C reader/writer 격리·월간/분기 stale·0/null·hash·readback 단위검증 | PASS (Node 단위 테스트) |
| 기존 점수 projection 9개 파일 무변경 | PASS (변경 목록 확인) |
| Windows 실제 CMD DRY_RUN | NOT_RUN |
| Cloudflare 원격 D1 저장/readback | NOT_RUN |
| 후보 Worker 빌드/통합 확인 | NOT_RUN |
| 운영 `main` 병합·Git 연동 배포·공개 API | NOT_RUN |
| `/earnings-recession/` 화면 연결 | R5 별도 디자인 승인 대상 |

**후속 조치:** 별도 실행 패키지 `EARNINGS_R4_C_PC_PREFLIGHT_READONLY_20261027.zip`으로 기존 PC source를 변경하지 않는 Windows read-only CMD 결과를 수집한다. 결과를 검증한 후 신규 D1 키 1개만 실제 게시·readback할지 다시 판단한다. 배포·UI·main 병합은 각각 별도 Gate다.
