# D1 실패 원인 기록

## 저장 위치와 시점

운영 PC writer 데이터 폴더의 `d1-request-failures.jsonl`에 각 실패 직후 한 줄을 추가한다. 정규 운영 경로는 `E:\ZGmini\data\pc-writer\d1-request-failures.jsonl`이다. 첫 실패 전 파일이 없는 것은 정상이다. 실행이 중간에 종료되거나 다음 실행이 성공해도 앞선 줄을 덮어쓰지 않는다. 기존 `publication-events.jsonl`에도 실행 종료 시 안전한 최근 20건과 실패 출력 항목이 남는다.

공통 client를 직접 쓰는 다른 도구는 안전한 상세를 `remote.stats.transportFailures`에 제공한다. 즉시 별도 파일 기록은 운영 `run-local.mjs`에 연결하며, 별도 테마 전용 transport까지 적용했다고 해석하지 않는다.

## 한 줄에 남기는 정보

| 필드 | 진단 용도 |
| --- | --- |
| runAt, source | 실패한 실행과 실제 승인 코드 버전 연결 |
| requestStartedAt, at, elapsedMs, requestSequence | 요청 시작·실패 시각, 지연, 실행 내 순서 |
| databaseRole, kind, phase | CORE/HISTORY, 읽기/쓰기, 인증/통신/HTTP/본문/결과 단계 |
| httpStatus, code | HTTP 상태 및 안전한 통신 오류 코드 |
| providerCodes, errorBody | Cloudflare 숫자 오류 코드, JSON/HTML·본문 오류 구분 |
| cfRay | 응답에 있을 때 Cloudflare 요청 추적 ID |
| authType, authExpiresAt, authExpiredAtFailure, authRefresh | 인증 종류·요청에 사용한 인증 만료 시각·실패 당시 만료 여부·갱신 결과 |
| statementId | SQL 원문·파라미터를 제외한 문장 해시. 해당 source의 실행 코드와 비교 |

API 토큰 유효기간은 로컬에서 추정하지 않는다. 정보가 없으면 null/UNKNOWN으로 기록한다. 응답에 요청 ID나 숫자 오류 코드가 없으면 만들어 넣지 않는다. OAuth가 실패 시각에 만료돼 있었다는 사실만으로 공급자의 거부 원인을 확정하지 않는다. 실패와 갱신·재조회 성공을 대조한다.

## 비밀값과 오류 본문

토큰·인증 헤더·개인 경로·이메일·SQL 원문/파라미터·원자료·오류 메시지/응답 원문은 저장하지 않는다. 실패 JSON은 최대16KiB만 읽고 숫자 코드만 허용한다. HTML·비정상 JSON·크기 초과는 상태만 기록한다. 로그 기록 자체가 실패하면 `diagnosticWriteFailures`를 늘려 마지막 실행 보고에 남긴다. 모든 환경·외부 장애의 원인을 반드시 확정할 수 있다는 보장은 아니다.

## 검증

403·요청 ID·숫자 코드·만료 경계·갱신 실패·HTTP200 내부 실패·HTML·깨진 JSON·크기 제한·로그 쓰기 실패·비밀값 제외·다음 성공 후 보존을 fixture로 검증한다. 운영 점수를 바꾸거나 실제 인증을 강제로 만료시켜 검증하지 않는다. 설치 후 정상 게시·D1 readback·정규 실행 증거는 fixture와 구분한다.
