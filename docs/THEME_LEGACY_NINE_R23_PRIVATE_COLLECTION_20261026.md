# 기존 9개 테마 R23 — 63개 승인 ETF 원가격 수집기 (비공개)

- 작업 브랜치: `codex/theme-fear-greed-integration-20261025` **한 곳만 사용**.
- 사용자 승인: 2026-10-26 “진행해라” (R22 단계 1의 신규 수집 도구 구현 승인).
- 상위 계약: `THEME_LEGACY_NINE_R22_SIX_STAGE_TOOL_ASSIGNMENT_20261026.md`.
- 상태: `CODE_PREPARED / MOCK_TEST_PASS / PC_REAL_GET_NOT_RUN / SHADOW_ONLY`.

## 구현 파일

- `scripts/pc-writer/THEME_NINE_R23_PILOT.cmd`: **단일 다운로드 파일**. GitHub 체크아웃 없이 Windows에서 실행 가능하도록 승인된 R23 수집기와 R20 후보 명단을 검증 가능한 SHA256 번들로 포함한다. 실행 결과는 CMD **같은 위치**의 `THEME_NINE_R23_PILOT_RESULT.txt`에 남긴다.
- `scripts/pc-writer/build-theme-nine-r23-pilot.mjs`: 원본 코드/명단 변경 시 단일 CMD를 재생성하고, 내장 자료를 역추출해 일치 여부를 검사한다.
- `scripts/pc-writer/theme-nine-r23-collect.mjs`: R20 확정 명단 직접 읽기. 중복된 편입 64개를 고유 ETF 63개로 통합하고, SPY 기준 종목을 별도로 포함한다. 티커 수를 임의로 고정하거나 다시 심사하지 않는다.
- `scripts/pc-writer/theme-nine-r23-collect.cmd`: 사용자 Windows CMD 진입점. 실행 결과 TXT는 CMD **동일 폴더**의 `THEME_NINE_R23_COLLECTION_RESULT.txt`에 생성한다.
- `tests/theme-nine-r23-collect.test.mjs`: 모의 API 응답으로 체크포인트 재개, 요청 상한, 원자료 SHA, 429 중단, 손상 원본 거부, 중복 원본 저장 거부, 잘못된 OHLCV 거부를 검증한다.

## 원가격 수집 계약

1. GetMarketHistory **무료 단일 티커 1h 경로** `GET /api/v1/bars/stocks/{TICKER}/1h`만 허용한다. 유료 `/query/`, 1d 요청, 다종목 일괄 요청, 결제는 없다.
2. 시간 범위는 명령어에서 **명시**한다. `start/end` 고정 창과 승인 후보 파일 SHA256을 체크포인트 ID에 넣어, 날짜/명단이 바뀐 체크포인트의 자동 재사용을 차단한다.
3. 한 번 실행의 API GET은 **최대 4회**. 각 페이지 `limit=5000`, `cursor`를 저장하고 다음 실행에서 이어받는다. 완성된 페이지는 같은 체크포인트에서 재다운로드하지 않는다. 429/오류/응답 무결성 실패 후 자동 재시도하지 않는다.
4. 원본문서 내용과 각 페이지 SHA256은 `E:/ZGmini/data/themes/legacy-nine-r23/raw/`에, manifest/checkpoint는 같은 테마 아래 저장한다. **기존 9개 운영 원장·바이오/AI 원자료·스케줄러는 수정하지 않는다.**
5. 저장 전 심볼·UTC 시각 순서·OHLCV 양수/범위·volume 유효성, 응답 크기를 검사한다. 결측/실제 무거래는 가짜 가격이나 0점으로 보충하지 않는다. 해당 원가격은 비조정 1시간봉이며 공식 일봉 종가로 명명하지 않는다.
6. `--inspect`는 데이터 파일을 쓰거나 네트워크에 연결하지 않는다. `--collect`를 **명시**한 경우에만 무료 GET 및 독립 원자료 저장을 실행한다.
7. 수집 성공은 **실제 PC 실행 로그와 manifest SHA readback**으로만 판정한다. GitHub 코드 존재나 모의 응답 테스트는 실가격 수집 성공이 아니다.

## PC 명령 (실행은 사용자 담당)

**권장: 파일 하나만 내려받아 실행.** `THEME_NINE_R23_PILOT.cmd`를 바탕화면 등 원하는 폴더에 놓고 더블클릭한다. 설치된 Node.js(`E:\ZGmini\runtime\node.exe` 우선, 없으면 PATH의 `node`)가 필요하다. 파일 자체에 시작일 `2023-01-01`, 종료일 `2026-10-26`, 최대 무료 GET 4회를 고정했다. 실행 후 같은 폴더의 `THEME_NINE_R23_PILOT_RESULT.txt`를 대화창에 제출한다. 재실행할 때 같은 파일을 사용하며, 기존 원본과 이어받기 체크포인트는 승인된 `E:\ZGmini\data\themes\legacy-nine-r23`에 유지된다. CMD 내부에서 임시로 꺼낸 코드/명단은 CMD와 같은 폴더에서만 생성·검증하고 정상 종료 시 제거한다. **실제 수집 성공은 사용자가 제출한 TXT로 확인한다.**

**대체 방법: 저장소 체크아웃 사용 시** 아래 CMD를 쓸 수 있다.

승인된 저장소 체크아웃의 루트에서 실행한다. `<시작일>`과 `<종료일>`은 동일하게 유지하며, 다음 호출 때도 날짜를 바꾸지 않는다.

```cmd
scripts\pc-writer\theme-nine-r23-collect.cmd --inspect 2023-01-01 2026-10-26
scripts\pc-writer\theme-nine-r23-collect.cmd --collect 2023-01-01 2026-10-26
```

동일한 `--collect` 명령을 새로 실행하면 최대 4개 GET씩 재개한다. `CHECKPOINT_READY_TO_RESUME`는 **진행 중**이며 완료 상태가 아니다. `STOP_*`가 나오면 TXT를 제출하고 기존 checkpoint·원본 파일을 삭제하거나 강제로 재시작하지 않는다. `PRIVATE_RAW_COLLECTION_COMPLETE`가 나오더라도 2단계 세션/가격 모드 감사 전에는 완전한 252일 산출 가능성이나 공개 승인을 뜻하지 않는다.

## 테스트와 후속 차단 조건

- 로컬 테스트: `node tests/theme-nine-r23-collect.test.mjs` (실제 네트워크 없음).
- 기존 검증된 PC 가격/manifest와 **중복 수집을 더 줄이기 위한 독립 원본 비교**는 원본 소재·SHA·가격 모드가 확인될 때만 한다. 다른 가격 형태를 자동 재활용하거나 검증 없이 수집 성공으로 표시하지 않는다.
- 2단계는 실제 NY 거래일(조기 폐장 포함)·SPY 정합성·가격 모드 확인. 계산과 R32 가중 합산은 3·5단계에서만 수행한다.
- 공식 AUM은 R22 4단계의 발행사 공개 웹 자료 조사이며 신규 유료 API를 추가하지 않는다.
- D1/Cloudflare/UI·작업 스케줄러·현재 공개 점수 변경 **0**. 본 수집기는 **비공개 실가격 확보만** 수행한다.

## 공급원 공식 문서

- API: https://getmarkethistory.com/docs/api/reference
- 무료 접근: https://getmarkethistory.com/docs/quickstart
- 무료 경로와 페이지 제한: https://getmarkethistory.com/docs/limits
- 원자료 비재배포·파생물 조건: https://getmarkethistory.com/docs/terms
