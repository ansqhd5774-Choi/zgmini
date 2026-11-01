# R46 — R45 전체 주식 행 PC 비공개 저장 설치 패키지

- 대상 개발 브랜치: `codex/zgmini-gpt-workspace-20261025` **그대로 유지**
- 설치 입력 기준 R45 커밋: `34c520c7e2e65f5f8d856521f9ce3e45c8eb9aff`
- 2026-11-01 확인 `main` SHA: `d8275ed1092daaffbefc4b69f2d3eccd34ff6f5a` (병합/배포 금지)
- 상태: **설치 패키지 제작 및 합성 PC Git 회귀 검증 단계**. 사용자 PC 적용·실 B1 실행·R43 공개 등급 변경은 별도 증거 전까지 미확인.

## 진행 목표

기존 B1 수집이 이미 내려받아 파싱한 MarketParquet 전체 주식 종가·거래량을 PC 내부 날짜별 JSON으로 보관하는 R45 변경을 **실제 PC 운영 소스를 보존하면서** 설치한다. 추가 MarketParquet 요청, 과거 20일 소급, 공급자 변경, API 비용 증가, SQLite/D1·스케줄·게시·UI 변경은 없다.

## PC 안전 설치 방식

1. 기존 `ZGMINI-PC-Local-Core` 예약 작업 XML → 승인 VBScript wrapper → Core 실행기 → 현재 Git checkout 경로를 읽기 전용으로 추적한다.
2. Core worktree ID, Git HEAD와 PC `config.json`의 `source`, `enabled`, `collectionTarget`, 보호된 Git 파일의 수정 상태, Node 24+, ZIP 안 R45 sidecar SHA를 확인한다.
3. MarketParquet 파서·수집기·PC collector의 **R45 수정 지점만 정확히 찾아 패치**한다. 본문 전체 파일을 브랜치 최신판으로 덮어쓰지 않으며, 안전한 삽입 지점이 없으면 `R46_ANCHOR_CHANGED_STOP_*`로 중단한다.
4. 정상 Core 수집 작업과 충돌하지 않도록 기존 `local-cycle.lock`을 **배타적으로 새로 획득**한다. 기존 잠금이 있으면 삭제하지 않고 중단한다. 잠금 후 PC source/config/대상 파일을 한 번 더 확인한다.
5. 원본 3파일과 `config.json`을 PC 전용 `market-calendar-r46-backups`에 백업하고 SHA를 확인한 뒤, R45 sidecar 신규 파일을 포함한 **정확히 4개 파일만** 수정한다.
6. Git 로컬 커밋의 부모·4개 변경 경로를 확인하고 기존 `config.json`의 `source`만 새 로컬 커밋 SHA로 전환한다. 다른 설정/운영 파일·작업 등록·GitHub 원격은 그대로 둔다.
7. 커밋 전 실패는 백업으로 범위 한정 복구를 시도한다. 커밋 후 설정 기록이 실패한 경우 무리하게 Git reset/강제 복구하지 않고 `R46_PARTIAL_COMMIT_MANUAL_RECOVERY_STOP`으로 정지한다.

## 전달물

`MARKET_CALENDAR_R46_R45_PC_INSTALL_20261101.zip` 내 같은 폴더에:

- `MARKET_CALENDAR_R46_PC_APPLY.cmd`: 운영 소스의 사전 점검과 허용된 4파일 설치. 결과 `MARKET_CALENDAR_R46_PC_APPLY_RESULT.txt`.
- `MARKET_CALENDAR_R46_PC_VERIFY.cmd`: **다음 기존 B1 정규 실행 뒤** PC 비공개 저장 파일의 날짜·종목 수·SHA를 읽기 전용 검증. 결과 `MARKET_CALENDAR_R46_PC_VERIFY_RESULT.txt`.
- `market-calendar-r46-pc-apply.mjs`: 설치·락·백업·로컬 Git source 전환.
- `market-calendar-r46-pc-patch.mjs`: 승인 R45 수정 부분의 일치 삽입.
- `market-calendar-r46-pc-verify.mjs`: 공개/외부 전송 없이 비공개 파일 무결성 확인.
- `market-calendar-r45-marketparquet-capture.mjs`: 지정 브랜치에 이미 승인된 R45 sidecar.
- `README_MARKET_CALENDAR_R46_PC_INSTALL.txt`: PC 실행 방법.

CMD는 ASCII·CRLF·BOM 없음. 두 CMD·모든 `.mjs` 파일은 ZIP 해제 후 같은 위치에 둔다. 결과 파일을 덮어쓰지 않는다. 프로젝트 내부 기존 source/config/DB·수집값을 ZIP에 포함하지 않는다.

## 확인 기준

| 단계 | PASS 근거 | 범위 |
|---|---|---|
| 패치 동등성 | R45 이전 소스 → 승인 R45 소스 바이트 일치 | 코드 검증 |
| 설치 회귀 | 별도 임시 PC Git 저장소에서 4파일 로컬 커밋·부모 SHA·설정 연계 확인 | 합성 PC |
| 차단 회귀 | dirty source, 점유 Core lock, 수정 중 상태 불일치 시 중단·복구 | 합성 PC |
| PC 설치 | 사용자 PC `APPLY_RESULT.txt`의 `R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION` | **실제 설치 검증 전 미확인** |
| 실데이터 | `VERIFY_RESULT.txt`에서 최소 2일 원본 무결성·종목 수 확인 | **정규 B1 관측 전 미확인** |
| 최종 R43 ★★★ | 20일 수급·실적·기업 단위·적격 모집단 추가 확인 | **이번 단계 범위 밖** |

R44의 기존 503개 B1 종목이 2,634개 전체 평가 모집단이라는 뜻은 아니다. R45 파일이 2일치 확보되더라도 77.3%(102/132) 예비 산식의 실전 일치율이나 상위 약 5% 등급을 확정하지 않는다. 기존 R3 공개 등급을 유지한다.
