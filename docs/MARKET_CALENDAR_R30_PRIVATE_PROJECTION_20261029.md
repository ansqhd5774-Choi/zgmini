# R30 — 전체 기업 실적 원문을 PC 비공개 캘린더 이벤트로 변환

## 범위와 근거 (2026-10-29)

- R29 PC 설치 성공 로그: `R29_V3_PC_PRIVATE_INPUT_COLLECTOR_INSTALLED_NO_FORCED_COLLECTION`, PC 커밋 `fc1543c500b3a79aecdb7e7066cd95979ecc92bb`.
- 별도 읽기 전용 API 실측: 뉴욕 날짜 기준 향후 14일, API 요청 14회, 기업 실적 행 2,609건. 해당 실측 결과는 **실제 PC SQLite 저장 증거가 아니며**, R29 설치 로그도 강제 수집을 실행하지 않았다.
- API는 `date=YYYY-MM-DD` 한 번에 그 날짜의 **전체 기업**을 `pre`, `after`, `notSupplied` 세 분류로 돌려준다. 핵심 8개 기업을 별도 API로 조회하지 않는다.
- 공식 문서: https://www.earningsapi.com/docs/calendar-earnings
- 공식 서비스 약관: https://www.earningsapi.com/terms — 자체 웹사이트 표시 허용 조항은 존재하지만 제공원 데이터 피드의 재배포는 제한한다. D1 공개 JSON을 자동 승인하지 않는다.

## 구현

1. `lib/earnings-api-private-projection.mjs`는 기존 R29의 `release-calendar:earnings-api:YYYY-MM-DD` PC SQLite `kind=input` 저장본 14개만 읽는다. **네트워크/API 호출 0회.**
2. 출처 상태가 `READY`, 뉴욕 현지 현재 날짜, 14개 연속 날짜, 저장 원문 전체 건수 일치일 때만 `READY_PRIVATE` 결과를 생성한다. 하나라도 누락·불일치하면 해당 projection을 게시하지 않는다.
3. 결과에는 일자·종목·기업명·장전/장후/미정·출처·`VENDOR_UNVERIFIED`만 포함한다. EPS/매출액·임의 시각·기업 확정 여부는 승격하지 않는다. `GOOG`와 `GOOGL`은 서로 다른 티커지만 동일 핵심 기업 우선군이다.
4. 식별자는 현재 **14일 전체 스냅샷** 범위 안에서 `earnings-vendor-<ticker>-<date>`이다. 제공원이 일자를 정정하면 다음 스냅샷이 전체 대체되어 이전 날짜 이벤트가 제거된다.
5. `scripts/pc-writer/earnings-api-local.mjs`는 R29의 하루 1회 정상 수집이 성공한 경우에만 `release-calendar:earnings-api:private-events`를 같은 PC SQLite `kind=input`에 저장하고 read-back 한다. 실패하면 기존 정상 원문은 보존한다.
6. 공개 `kind=output`, D1, `/api/release-calendar`, 사이트 UI, Windows 예약 작업, DB 스키마, API 호출 횟수는 변경하지 않는다. 권한 플래그 `publicDisplay:false`, `redistribution:false` 유지.

## 검증과 적용 단계 구분

- 신규 R30 순수 변환 및 PC 연동 테스트와 R29 회귀 검사로 파싱/권리/건수/정정/쿼터를 검증한다.
- R30 GitHub 작업 브랜치 코드 완성, PC 안전 설치, 정규 PC 저장, 공개 사이트 반영을 각기 다른 상태로 기록한다.
- Windows Core 잠금 `local-cycle.lock`은 삭제하거나 강제 해제하지 않는다. 실제 PC 승인 source SHA와 백업을 확인하는 설치 프로그램에서만 두 파일을 변경할 수 있다.
- 사이트 예약 실행 정상 여부 실시간 확인은 사용자 담당. 신규 감시·스케줄러·알림을 만들지 않는다.

## 다음 공개 게이트

원문 제공원에서 자체 사이트에 표시할 권리와 공개 D1 JSON 재배포 권리는 별개다. 제공원 약관상 화면 렌더링은 가능하더라도 **기존 공개 API가 금지된 원본 데이터 피드 재게시에 해당하지 않는다는 근거**를 확보하기 전에는 이 PC 비공개 결과를 공개 `output`으로 승격하지 않는다.
