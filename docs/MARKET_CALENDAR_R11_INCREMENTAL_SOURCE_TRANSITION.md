# 시장 캘린더 R11 — 승인된 순차 소스 전환

- 승인: 2026-10-27, 사용자 지시 `승인 하나쓱 차근차근 추가하면되`.
- 대상 작업 브랜치: `codex/zgmini-gpt-workspace-20261025`만 사용. 다른 작업 브랜치/`main` 자동 변경 금지.
- 기존 PC 승인 source (R10 실측): `ee41bb295200d248efc683841e0f1ba0bc4779ee`.
- 기준 parser blob: `f084e2a360b544257bb44a60b97875627c7ca371` (`lib/release-calendar.mjs`).
- 확대 최종 후보: 작업 브랜치 `lib/release-calendar.mjs` (BLS+BEA). **한꺼번에 운영 반영하지 않는다.**

## R11-1 — BLS만 우선 적용할 소스 후보

- 스테이징 파일: `staging/market-calendar/r11-bls/lib/release-calendar.mjs`.
- selective 통합 시 **승인 소스의 동일 경로** `lib/release-calendar.mjs`를 이 스테이징 내용으로 바꾸는 단일 파일 변경만 허용한다.
- `RELEASE_SOURCES` URL/형식 4개, Fed/Census 파서, BEA 기존 GDP/PCE 파서, 지표 mapping, 정책과 `recessionReleaseInfo`, JSON 이벤트의 5개 필드는 승인 source 그대로 유지한다.
- BLS의 정규 `Employment Situation` ID `employment` 유지. `Employment Situation of Veterans`의 구형 잘못된 `employment` 분류만 `bls-employment-situation-of-veterans`로 교정한다.
- BLS CPI·PPI·JOLTS 등 나머지 공식 일정의 ID는 제목 기반으로 결정하고, 일정 메타 이벤트·취소 일정은 제외한다.
- 소스별 `READY`·`checkedAt`, 6시간 collection attempt guard, 원본 저장, 실패 시 기존 이벤트 보존, 게시 가드는 변경하지 않는다.
- **현재 단계는 branch stage only:** 라이브 `lib/release-calendar.mjs`, PC 설정, 수집기, 스케줄러, 공개 API, Cloudflare, DB 미변경. 스테이징 파일을 PC의 실행 프로젝트에 직접 덮어쓰면 `publicationCompatibility()`에서 차단할 수 있으므로 금지.

## 단계별 운영 연결 Gate

1. 승인 source와 실제 publisher 실행 프로젝트를 일치시킨다. R10 XML 참조 프로젝트(`1364b01b`)는 보호 파일 61개 drift를 보였지만 다른 writer 원장은 `ee41bb29`에서 `VERIFIED`; XML 문자열 경로만으로 실제 실행 프로젝트를 바꾸지 않는다.
2. 새 승인 commit은 운영 source `ee41bb29` 또는 그 뒤에 **명시적으로 검증된 최신 PC source**를 부모로 삼아, `lib/release-calendar.mjs` 한 파일의 변경으로 구성한다. 변경 파일 1개와 다른 `lib`/`worker`/`scripts/pc-writer` 보호 파일 0개를 확인한다.
3. 해당 새 commit을 검증된 운영 PC checkout에서 정확하게 설치하고, 그 다음 `config.source`를 그 commit SHA로 일치시킨다. 어느 하나만 선행한 상태로 정규 publisher를 돌리지 않는다. 기존 ledger·SQLite·task·활성 수집 결과를 보존한다.
4. 정상 정규 수집 이후 저장 원본→파서 결과→게시 `VERIFIED`→D1/API readback을 순서대로 확인한다. BLS 확대·BEA/Fed/Census 불변과 이벤트 중복 0, 기존 133건의 날짜·제목 보존 여부 확인. 불일치 시 다른 단계로 진행하지 않고 기존 정상 게시본 보존.
5. R11-1 성공 뒤 R11-2 BEA만 별도로 진행한다. BEA의 `GDP by County` ID 교정은 R11-2에 해당한다. 한국 지표·실적 데이터는 이용권 미확인으로 편입하지 않는다.

## 현재 확인된 근거

- R7/R8 PC 저장 입력에서 전체 BLS 확대 후보 **313건**, 기존 **25건**. BEA 168건은 **R11-2 후보**이며 R11-1 게시 수치가 아니다.
- R10 게시 원장은 `2026-10-27T06:31:17.688Z`, `VERIFIED`, source `ee41bb29`. 이것은 R11 새 parser의 운영 성공 증거가 아니다.
- 새 단계 테스트: `node tests/market-calendar-r11-bls-stage.test.mjs` (4 assertions), `node --test tests/market-calendar-*.test.mjs tests/release-calendar-collector-r1.test.mjs`, `npm run typecheck`.
- Production 적용·자동배포·PC 게시 성공은 별도 검증 전 **NOT_APPLIED**로 보고한다.
