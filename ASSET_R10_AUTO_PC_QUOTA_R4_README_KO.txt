R10 Core 실제 quota runner 경로 최종 점검 (읽기 전용)

R3는 Core 작업이 local-cycle.mjs를 직접 호출한다고 가정했지만,
기존 운영 계약상 quota-runner.mjs가 local-cycle.mjs를 감싸 실행할 수 있습니다.

1. 새 폴더에 ZIP을 압축 해제합니다.
2. ASSET_R10_AUTO_PC_QUOTA_ROUTE_READONLY_R4.cmd를 한 번 실행합니다.
3. ASSET_R10_AUTO_PC_QUOTA_R4_RESULT_*.txt를 첨부합니다.

등록 VBS를 실행하거나 수정하지 않습니다.
PC 설정/작업/원자료/원격 D1/키/운영 Source를 변경하지 않습니다.
VBS 본문 또는 API 키를 출력하지 않고 호출 파일 위치와 실행 기록만 검사합니다.
재등록, installer 실행, config.source 변경, Core 강제 재실행은 금지합니다.
