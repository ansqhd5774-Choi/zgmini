# TypeScript 검사 복구

2026-10-15 기준 main의 별도 타입 검사 81개 진단을 복구했다.

- strict/noImplicitAny와 검사 범위를 유지한다. 기존 noEmit·bundler 구성에서 사용하는 .ts import를 allowImportingTsExtensions로 허용한다.
- JS 기본값/구조 분해에서 누락된 옵션·콜백·반환형은 실제 구현에 맞는 JSDoc으로 선언한다. 빈 배열, 이전 관측값, 상태 결과, Worker/Queue 메시지와 허용 ID를 타입으로 명시한다.
- 공개 reader의 D1 쓰기 권한과 projection의 읽기 전용 wrapper를 구분한다. 읽기 전용 환경은 실제 guard 반환형에서 타입을 도출한다.
- 기존 선택적 진단 binding과 Vite ImportMeta 타입을 선언한다. Secret 생성·값 설정·원격 환경변수 변경은 없다.
- `npm run typecheck`를 별도 CI 단계로 실행한다. 타입 검사 실패를 빌드/회귀 통과로 상쇄하지 않는다. 오류 허용 baseline·continue-on-error·일괄 any/무시 주석·검사 대상 제외를 사용하지 않는다.
- 산식·가중치·점수·TTL·날짜 선택·갱신·저장 계약·UI 디자인·의존성 버전은 변경하지 않는다.

검증은 전체 타입 검사, Vinext 빌드, 기존 회귀/게시 복구 검사로 나눈다. 타입 제거 후 실행 AST를 기준 main과 대조해 실행 로직이 동일한지 확인한다. 이 대조는 주석/타입·체크아웃 줄바꿈·불필요한 괄호를 정규화하며 연산자·문자열 값·실행 구조를 보존한다. 빌드/타입 성공을 별도 Production 검증으로 표현하지 않는다.

PC 게시기는 source 보호 검사를 유지한다. 변경이 타입 전용이어도 main과의 protected-file 차이가 다음 게시를 차단할 수 있으므로, 운영 source 전환이 필요한 경우 실행 동등성·작업 상태를 확인하고 기존 경로·DB·checkpoint·스케줄을 보존해 전환한다.
