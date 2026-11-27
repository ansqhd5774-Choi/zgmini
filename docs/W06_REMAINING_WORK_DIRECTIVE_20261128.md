# ZGMINI W06 잔여 작업 실행 지시 — 2026-11-28

- 담당: 6/7 미국 CNN 공포·탐욕 지수
- 기능 저장소: `ansqhd5774-Choi/zgmini`
- 전용 브랜치: `codex/w06-cnn-1min-intraday-20261124`
- 운영 제어 저장소: `ansqhd5774-Choi/zgmini-pc-control`
- 중앙 원장: [#4082](https://github.com/ansqhd5774-Choi/zgmini-pc-control/issues/4082)
- 실행 정본: [W06 실행계획 R1](W06_CNN_1MIN_INTRADAY_EXECUTION_PLAN_R1_20261124.md), [잔여 실행계획 R2](W06_REMAINING_EXECUTION_PLAN_R2_20261127.md)
- 진행 증거: [W06 진행 원장](W06_CNN_1MIN_INTRADAY_PROGRESS_LEDGER_20261124.md) 최신 §20-79 이후 유효 기록

## 최종 목표와 기존 완료 보존

**CNN 실제 신규 `observedAt`·정밀 `score`를 동일 대상으로 PC 자연 수집 → SQLite → D1 → 공개 API → PC 1440px·모바일 390px 화면까지 추적·검증하고 종결한다.** 기존 완료를 재시작하지 않는다.

기존 근거: Writer B 설치 #3985, 활성 PT1M 및 자연 HTTP #3998·#4129, 공개 current·1D·1W 정합성, 실제 1D 연결선(원본 마커 없음), Production 390×844·1440×900 차트와 70초 자동 GET 2/2 PASS ([Actions #46033183704](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/46033183704)). 실제 신규 원본 도착 중 자동 점수 변화의 실측과 *동일 원본* 로컬 SQLite↔D1 정밀 감사는 별도 미완료다. **전체 신규 원본 종단 0/1** 유지.

## 직접 실행 순서

1. **최신 상태·승인 확인:** 이 브랜치 HEAD, R1/R2/원장의 마지막 유효 기록 및 공통 #4082, Public A 복구 관련 #4156·PR #4232와 후속 기록을 확인한다. 과거의 Public/private 충돌을 현재 미복구라고 자동 단정하지 않는다. source/설치/실행/배포 SHA 구분. 기존 승인 재사용.
2. **PC 읽기 경로:** 현재 설치 schema·허용목록·기존 Runner의 *공식* PC 읽기 전용 경로를 확인한다. 복구되어 있으면 중복 요청 없이 필요한 단회 고유 A Job으로 진행하고 정확한 Issue, Run, 실제 code, 실행 SHA, JSON/TXT를 회수한다. 실제 보안·권한 차단이면 우회·재시도 반복 없이 최초 실패 조건을 #4082에 연결하고 독립 작업을 계속한다.
3. **SQLite↔D1 정밀 감사:** 자연 수집으로 생긴 동일 `observedAt`·정밀 `score`, `checkedAt`을 구분해 SQLite 원본/관측 이력, 기존 공개 D1 projection·archive, `/api/fear-greed` 및 `/api/fear-greed/observations?period=1D`, `1W`를 대조한다. 실제 저장·게시 시각 및 sampled 여부를 제공 범위에서 기록한다. HTTP 200이나 행 개수만으로 PASS 금지.
4. **실제 Production 무새로고침 변화:** 이전 390·1440 실제 차트 선형 렌더·마커 0·60초 자동 GET 증거는 재사용한다. 새 원본이 자연 도착한 동일 페이지에서 별도 새로고침 없이 현재값 및 해당 1D 마지막 점이 일치해 변하는지 확인한다. `observedAt`만 새롭고 점수가 같다면 시각/이력 진전만 확인하고 값 변화는 꾸미지 않는다. CNN 원본 불변이면 `SOURCE_UNCHANGED`로 이 부분만 미완료.
5. **실패한 최소 경계만 복구:** SQLite 누락=수집/저장, D1 누락=게시/checkpoint, API 누락=reader/캐시/표본, 화면 불일치=UI 집계/응답 순서, PC Job 차단=공통 승인 실행 경계로 구분한다. 실패 입력과 관련 코드 조건을 특정하고 사용자 승인 범위의 최소 수정→관련 회귀→정규 통합/운영 적용→실측 재검증. 상관없는 작업은 기다리지 않는다.
6. **원장 기록·종결:** 증거 시각, 대상 키·score, SHA, Issue/Run, JSON/TXT, PC·모바일 readback, PASS/RUNNING/BLOCKED/STATE_UNKNOWN/DONE 및 잔여 조건을 **기존** W06 진행 원장과 #4082에 남긴다. 신규 실제 원본의 SQLite→D1→API 일치와 PC·모바일 자동 반영이 모두 입증될 때만 **종단 1/1 DONE** 판정한다.

## 보호 조건

- 60초는 best-effort Task 목표다. 매번 원본이 1분마다 변해야 하는 것은 아니다. `checkedAt`을 새 `observedAt`으로 만들지 않는다.
- 기존 CNN Task·Writer·Sidecar·공통 quota·Core 5분·다른 공급자 주기·SQLite 원자료·D1·API·UI 계약을 보존한다.
- 승인 없는 B 설치·새 예약·중복 PC A·무단 공급자 호출·DB 쓰기·새 D1 게시·Cloudflare 직배포·Public/Private 정책 수정·보안 검사/lease 우회·강제 원장 초기화 금지.
- 기존 정상 실증과 동일 조건의 재실행을 완료조건으로 만들지 않는다. 원본 미발표 또는 현재 PC 진단 한계는 대상별 미입증으로 남기며 독립 작업을 멈추지 않는다.

## 보고 형식

시작·종료 진행률(실제 입증된 항목 기준), 이번에 추가된 완료 증거 링크, 현재 최초 차단 조건, 남은 필수 작업, 최종 DONE/미완료를 간결하게 보고한다. 계획·PR·CI만으로 운영 종단 완료를 선언하지 않는다.
