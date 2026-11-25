# ZGMINI OPEN 증거 3차 배치 — 2026-11-25

## 범위 및 독립 확인
- 기준: 기존 88건 감사 원장과 이전 OPEN delta 기록.
- 이번 직접 검사: PC 제어 Issue **14건** (#1227, #1226, #1217, #1213, #1200, #1196, #1174, #1152, #1071, #1064, #1032, #1021, #1017, #1008). 본문/현재 OPEN 상태 및 댓글 직접 조회.
- 원본 결과 파일 직접 확인: `results/42722462277-1-seat-5.json` (Git blob `b077d021...`), `results/42712917820-1-seat-1.json` (Git blob `19b18317...`), `results/42619247795-1-seat-6.json` (Git blob `9cbd4fd0...`). 원본 실행과 요청 ID 일치 검사.
- **검증 한계:** 나머지 11건은 Issue/댓글 증거검사만 수행. 연결된 모든 Actions job·실제 PC 파일/JSON/TXT 양쪽의 독립 검증이 끝났다는 의미 아님.

## 판정표
| Issue | 원본 결과 요약 | 현재 판정 | 종료 |
|---|---|---|---|
| #1227 | core-runtime-source A 접수 실증 없음; #1351 QUEUED 인계, 원본 결과 미발행 | INTAKE_NOT_OBSERVED, 후속 Runtime 증거 필요 | 보류 |
| #1226 | core-status, 댓글 0 / 원본 증거 없음 | NO_RESULT_EVIDENCE | 보류 |
| #1217 | core-runtime-source A 접수 실패; 후속 #1351 QUEUED지만 원본 증명 미완 | INTAKE_NOT_OBSERVED | 보류 |
| #1213 | core-runtime-source 댓글 0; 다른 요청의 skipped 이력만 참고 | ORIGINAL_RECEIPT_UNVERIFIED | 보류 |
| #1200 | 원본 JSON 직접 조회: `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE`, `runtimeSourceVerified=false` | SOURCE_NOT_PROVEN | 보류 |
| #1196 | 댓글 원본 Run 42721800118, 같은 `STATE_UNKNOWN/CORE_NO_ACTIVE_TASK_ENGINE` | SOURCE_NOT_PROVEN | 보류 |
| #1174 | 원본 JSON 직접 조회: `STATE_UNKNOWN/WRITER_PREIMAGE_CHECKOUT_NOT_CORROBORATED`, `sourceHead=null` | PREIMAGE_NOT_PROVEN | 보류 |
| #1152 | Writer B `WRITER_B_SETUP_STOP / WRITER_B_ENTRYPOINT_CONSUMER_MISSING_STOP` | INSTALL_STOP | 보류 |
| #1071 | 원본 JSON 직접 조회: `PASS/PC_SOURCE_READONLY_DIAGNOSIS`, `STATIC_LAUNCHER_TRACE_ONLY`, `runtimeSourceVerified=false` | LIMITED_A_PASS (운영 runtime 아님) | 보류 (고용 R6 계열 보호) |
| #1064 | Writer B 원본 `WRITER_B_SHARED_INSTALL_BUSY_NOOP_STOP`; 후속 #1087 잠금 복구, #1092 Core window deferred | INSTALL_NOT_PROVEN | 보류 (시장 캘린더 협업) |
| #1032 | BLS R6 B `PARTIAL/R6_B_PARTIAL_PUBLISH_VERIFIED` | PARTIAL | 보류 (W04 보호) |
| #1021 | BLS R6 B `BLOCKED/R6_B_CORE_LOCK_OCCUPIED` | BLOCKED | 보류 (W04 보호) |
| #1017 | BLS R6 B `BLOCKED/R6_B_INSTALLED_SOURCE_STOP` | BLOCKED | 보류 (W04 보호) |
| #1008 | BLS R6 B `BLOCKED/R6_B_CORE_LOCK_OCCUPIED` | BLOCKED | 보류 (W04 보호) |

## 주의할 경계
1. Actions `success`와 운영 응답 `STATE_UNKNOWN`은 별개다. 원본 JSON `status`와 `evidenceLevel`에 따른다.
2. 원본 조회가 성공해도 `STATIC_LAUNCHER_TRACE_ONLY`는 live Core 검증이 아니다.
3. 오래된 실패 요청의 후속 처리 성공을 자동으로 동일 원본의 성공으로 환산하지 않는다.
4. 이 14건은 본문상 W01/W03/W05 완료 잔여로 확증되지 않았다. W04/고용 R6/시장 캘린더 요청을 정리 명목으로 무단 닫지 않는다.
5. 이번 배치 신규 Issue/PR 생성, 승인·PC Job 재요청, 운영 파일 변경, 종결: 모두 **0건**.

## 다음 단계
- W01/W03/W05 귀속 확정 항목의 미검사 증거를 우선 점검.
- 나머지 44건 주장에는 직접검증 완료/단순 댓글 대조/보호의 구별을 유지. 현재 배치 14건을 모두 '44건 완전 독립검증'으로 계산하지 않는다.
- 본체/PC 제어 OPEN 수를 마지막에 다시 조회하고 원장의 cohort 대비 delta 갱신.
