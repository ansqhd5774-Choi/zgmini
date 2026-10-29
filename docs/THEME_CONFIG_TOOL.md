# 일반챗용 테마 설정 등록 도구

전체 작업 상태·일반챗/로컬 도구의 역할·다음 공개 연결 단계는 [공통 작업·인수인계](THEME_CONFIG_WORKFLOW.md)를 따른다. GitHub 코드와 PC 설치본 버전은 별도다.

## 지원 범위

일반챗이 JSON 한 개를 만들면 PC 공통 도구로 등록하고 GetMarketHistory 시간봉 수집·불변 원본 저장·기존 적응형 계산을 실행한다. 코드·예약 경로를 테마마다 수정하지 않는다. 외부 라이브러리·가입·새 AI API 비용 없음. Provider 사용량은 실행당 최대 4 GET이며 기존 제공처 조건이 적용된다.

**현재 PC 설치 이력이 확인된 버전은 비공개 등록·수집·계산 도구다.** GitHub의 공통 예약 자동 게시 소스는 별도로 개발되었으나, 로컬 PC에서 새 버전 설치·정규 실행 검증을 완료하기 전까지 D1 게시와 공개 UI 자동 추가가 운영 중이라고 단정하지 않는다. 공통 전용 예약 작업 `ZGMINI-PC-Configured-Themes`가 매일 PC 현지 13:00에 등록 목록을 처리한다. 기존 테마 작업은 변경하지 않는다. 등록 성공은 종목 존재·ETF 적격성·권리·공개 적격성 검증을 뜻하지 않는다. 기존 테마 경로와 R47/R74 설치는 변경하지 않는다.

지원 산식은 `ADAPTIVE_R2_PAIR_R3` 하나, ETF 두 개 + SPY다. 기존 R2 40:20:40, R3 날짜별 장단기 비중을 그대로 재사용한다. 두 단기 ETF 등 미승인 조합은 점수를 비운다. 임의 비중·3개 이상 ETF·새 공급처·새 산식은 자동 허용하지 않는다. 원본 부족은 HISTORY_PENDING으로 보존한다. ETF 시장 적합성·선정 증거는 별도로 확인해야 한다.

## 일반챗에 전달할 요청

> 첨부한 theme-registration.template.json과 동일한 키만 사용해 테마 설정 JSON을 만들어줘. id는 소문자 영문/숫자/하이픈, label은 표시 이름, etfs는 실제 검토한 서로 다른 ETF 두 개, benchmark는 SPY로 유지해. provider와 profile은 변경하지 마. startDate는 실제 수집 시작일을 YYYY-MM-DD로 적어줘. 임의 가중치, 실행 명령, URL, 경로, API 키를 추가하지 마. ETF 선정·권리 확인이 끝났다고 지어내지 마.

샘플 AAA/BBB는 예시이며 실제 수집 종목이 아니다. 샘플을 그대로 등록하지 않는다.

## PC에서 사용

1. 목적: 일반챗 설정을 비공개 등록한다. JSON을 준비한다.
2. `THEME_REGISTER.cmd` 위로 JSON 파일 **한 개**를 끌어 놓는다.
3. 표시 이름·두 ETF·산식을 확인한다. 일치하면 `REGISTER`를 **한 번** 입력한다.
4. 정상: `REGISTERED_PRIVATE_ONLY` 또는 동일 설정의 `ALREADY_REGISTERED`. 다음 공통 예약부터 비공개 수집 대상이다. 실행 창은 숨겨지며 `SCHEDULE_HISTORY.log`에 결과가 남는다. PC 로그인·인터넷·E: 연결이 필요하다.
5. STOP이면 수정·재실행 전에 오류 코드를 확인한다. 기존 파일·잠금·checkpoint는 삭제하지 않는다. 코드나 인증정보를 JSON에 넣지 않는다.
6. 결과의 status/id/sha256만 전달한다. Secret·원자료는 보내지 않는다.

수동 갱신은 `THEME_UPDATE.cmd`를 한 번 실행하고 등록 ID를 입력한 뒤 `RUN`을 한 번 입력한다. 최대 4 GET 후 `CHECKPOINT_READY_TO_RESUME`이면 같은 시작/종료 구간 checkpoint에서 이어진다. 실패나 STOP은 무작정 반복하지 않는다. 완료한 같은 UTC 날짜 구간은 재요청하지 않고 다음 UTC 날짜 실행에서 최근 6일 겹침 구간을 재확인한다. 종료일은 관측일이 아니다. 실제 마지막 관측일과 null 점수를 그대로 보고한다. 이 도구는 6시간 자동 갱신 또는 원격 수집 서비스를 설치하지 않는다.

예약 실행은 **모든 등록 테마 합계 UTC 날짜당 최대 4 GET**이다. 일일 한도는 요청 전 저장해 중복 실행·실패에도 보존한다. 테마별로 순서를 순환하므로 여러 테마의 최초 장기 수집에는 여러 날이 걸릴 수 있다. 수동 RUN은 별도로 명시한 최대 4 GET이다. 502·통신 timeout은 해당 테마에서 하루 대기 후 재확인하고, 알 수 없는 실패·429는 자동 재시도하지 않는다. 빈 응답은 이전 원본을 보존하고 미완료로 남긴다. 새 테마의 공개 연결은 기존 승인·원본/권리·D1 readback 및 Reader 지원 확인을 별도로 거쳐야 한다. 아직 일반챗 설정만으로 공개 차트까지 추가되는 기능은 아니다.

다른 테마는 별도 명령 실행으로 격리된다. 데이터는 `E:/ZGmini/data/theme-config/definitions`와 `themes/registered-<id>`에만 저장한다. 기존 ID/표시 이름 충돌을 거부하며 등록 정의는 불변이다. 구성 변경은 조용히 덮어쓰지 않는다.

## 개발 명령

`node scripts/pc-writer/theme-config-tool.mjs --validate <json>`

`--register <json>` / `--list` / `--plan <id>` / `--cycle <id>`

`ZGMINI_DATA_ROOT`로 데이터 루트를 명시할 수 있다. 루트 미존재 시 중단한다. 수집은 기존 고정 endpoint만 사용하며 JSON에서 코드를 실행하지 않는다. 등록 자체는 네트워크·D1·스케줄러 변경 0회다. 공통 게시 버전이 PC에 적용된 뒤에는 기존 `--scheduled` 실행에서 명시적 운영자 승인과 데이터 검증을 통과한 테마에 한해 별도 D1 CAS 게시·readback을 수행할 수 있다. 예약 작업 설정은 변경하지 않는다.

## 공통 게시 버전의 한 차례 운영 전환

지원 범위의 테마를 하나씩 추가할 때 반복 설치하지 않도록, 운영 PC에 기존 immutable bundle을 보존하면서 새 공통 버전을 한 번 설치하는 절차가 준비돼 있다. 로컬 Codex는 `theme-config-upgrade.mjs --upgrade-scheduled`의 소스·기존 설치 파일 SHA·예약 XML·잠금을 검토한 후 안전 조건에서만 실행한다. 기존 `THEME_REGISTER.cmd`와 13:00 공통 예약, 다른 예약 작업·원본·checkpoint는 변경하지 않는다. 설치 성공 후에도 실제 승인 테마의 D1 게시 및 Reader/UI 배포는 별도 실증 대상이다. **이번 GitHub 변경만으로 PC 설치나 Cloudflare 배포는 발생하지 않는다.**
