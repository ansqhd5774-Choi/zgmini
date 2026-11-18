# W04 PIT-04-08 Controller 누적 설치 9파일 — source-only 비교·승인 경계 (2026-11-18 KST)

## 기준과 판정

- 실제 운영 Controller 설치 SHA: `f7f1559bc0ef15bb9b375982d048369c474c490f` (PC R2 실행 #2144 readback 2026-11-18 17:13 KST)
- 종전 6파일 승인 대상 SHA: `ead5d2d585ff2ce2a6df5f9b6cf720f65d90b49b`, 승인 근거 control PR #2078, 기존 설치 요청 #2094 `BLOCKED/FIRST_FAIL=STAGED` — **재사용 실행 금지**
- 최신 `main` 비교용 관측 SHA: `85b3902dec26e8d9cd7fd3e48befea306eb792fe` (이 문서는 관측 SHA에서 계산한 **소스 인벤토리**이며 신규 Controller 목표 설치 승인·해시 선언이 아님)
- 운영 Controller의 현재 install lease/stage/artifact 복구 완료 증거: **없음**; #2114 원본 stageRoot/stagedHost PRESENT, recoveryVerified=false. source-only main 변경·Host B 등록 성공은 이를 해제하지 않음.
- 이 두 Git ref의 `config/` 및 `controller/` 디렉터리 전체 일반 파일의 Git blob SHA 비교 결과 **변경/추가 9개, 삭제 0개**. 아래 SHA-256은 정확 관측 소스의 UTF-8 바이트 기준으로 계산했으며 실제 Windows 운영 파일 SHA가 아님.

## 파일별 누적 diff·권한 구분

| 경로 | 기능 소유 | 운영 ref blob(12) | 관측 ref blob(12) | 관측 source SHA-256 | 승인 판단 |
|---|---|---|---|---|---|
| `config/operations.json` | W01+W04+W05 공통 | `90cf96a8a7e2` | `b7fc050148cb` | `a12fb8fdbf3c575f34bddb33334e59c73616aa3b53a195917a492ece56fb4632` | 기존 6파일 승인 후 재대조 필요 |
| `controller/common.mjs` | W04 PIT-04-08 | `46bac30d7f64` | `607e8dcfe21d` | `67d54cae62829e833a3ac547da621dbd1231ba4e40b7a54960a89610995b32e6` | 기존 승인 외 — 별도 범위 확인 |
| `controller/employment-r6-candidate-readonly.mjs` | W04 PIT-04 | `2f7513f137aa` | `947bed58051b` | `9a7411946b70c13837a68825aac4078a7c2044219bffe7cd3c4fda7a0a100b87` | 기존 6파일 승인 후 재대조 필요 |
| `controller/employment-r6-collection-evidence-readonly.mjs` | W04 PIT-04-05 | `828307e492bb` | `126a245272b0` | `12bd06c9f6ff6ea2b3aabe49a12fc3020550d917e6f3a611ad0c754b32df47cd` | 기존 6파일 승인 후 재대조 필요 |
| `controller/inflation-a401-private23-readonly.mjs` | W01 | `b566edb6c35a` | `ff6c041a8278` | `db62b0799731d48a9f04e0c8510c6fa273f70e2b07c2eda5411cc636743d27aa` | 기존 6파일 승인 후 재대조 필요 |
| `controller/inflation-a407-integrity-readonly.mjs` | W01 | `ABSENT` | `f50e4af8ed26` | `8d038527098d7527ee09575af11f53e81524476da85400eb46be5bf896bac88e` | 기존 6파일 승인 후 재대조 필요 |
| `controller/operations.mjs` | W01+W04+W05 공통 | `1069845e40e5` | `7ba551fd8bc3` | `51d785f781ed313b94a3fb234b09d892f6b144abdbcecafe15bf2f4a72575891` | 기존 6파일 승인 후 재대조 필요 |
| `controller/earnings-bea-mfg-archive-readonly.mjs` | W05 | `ABSENT` | `03cbc144f35a` | `0835fc60ebaa63ce0b0ead772a5dfa9d1834fa9bffb6f90e0d63cb24428495ad` | 기존 승인 외 — 별도 범위 확인 |
| `controller/pc-source-origin-readonly.mjs` | ER1 | `75522f10f27f` | `a9c9fff60da2` | `ec7477be8b4fdb9101b84a91f09f1d07846b727d376742af13f2905815b66500` | 기존 승인 외 — 별도 범위 확인 |

## 기존 6파일 승인 대비 관측 target 변경

- `config/operations.json`: **이전 승인된 파일 SHA와 현재 main SHA가 다름** — 승인 범위/출처 갱신 필요 (`1129de6324a0a80b9840b22626c0c2025f0e9e37158ca08990fb54ceb6a52176` → `a12fb8fdbf3c575f34bddb33334e59c73616aa3b53a195917a492ece56fb4632`)
- `controller/employment-r6-candidate-readonly.mjs`: **이전 승인된 파일 SHA와 현재 main SHA가 다름** — 승인 범위/출처 갱신 필요 (`8ba98ec0e90349a66783e64352a0046a560386035fa359595f29ceae14e5aac8` → `9a7411946b70c13837a68825aac4078a7c2044219bffe7cd3c4fda7a0a100b87`)
- `controller/employment-r6-collection-evidence-readonly.mjs`: **이전 승인된 파일 SHA와 현재 main SHA가 다름** — 승인 범위/출처 갱신 필요 (`377318c0d57e23d3763bbbad295280fb408ef16f43d0f4f08afca82c30121f8f` → `12bd06c9f6ff6ea2b3aabe49a12fc3020550d917e6f3a611ad0c754b32df47cd`)
- `controller/inflation-a401-private23-readonly.mjs`: 이전 6파일 승인 SHA와 동일 (`db62b0799731d48a9f04e0c8510c6fa273f70e2b07c2eda5411cc636743d27aa` → `db62b0799731d48a9f04e0c8510c6fa273f70e2b07c2eda5411cc636743d27aa`)
- `controller/inflation-a407-integrity-readonly.mjs`: 이전 6파일 승인 SHA와 동일 (`8d038527098d7527ee09575af11f53e81524476da85400eb46be5bf896bac88e` → `8d038527098d7527ee09575af11f53e81524476da85400eb46be5bf896bac88e`)
- `controller/operations.mjs`: **이전 승인된 파일 SHA와 현재 main SHA가 다름** — 승인 범위/출처 갱신 필요 (`208bbdb89b18a02860825c4aab46d310ae33b31f527be4d7f810629bd9219d14` → `51d785f781ed313b94a3fb234b09d892f6b144abdbcecafe15bf2f4a72575891`)

## 최소 GO / NO-GO

1. **W04 소유:** Controller `common.mjs`의 `pit04Offset`와 `employment-r6-candidate-readonly.mjs` 8키 sanitize는 PR #2134에서 main CI 22/22 PASS. R2 source `abd8f75537ece73644ec4de5df30964290d86815` 운영 Host B 등록 #2141 SUCCEEDED, R2 PC 집계 A #2144 PASS (Core CURRENT 40,777 / missing 2,880 / candidate consistent 2,625 / metadata unknown 255 / conflict 14). 하지만 새 Controller 설치 및 A 키별 조회 미실시.
2. **기존 6파일 승인:** W01 inflation A407와 W04 R6 collection/candidate 포함. 이전 `targetSha=ead5d2d585ff2ce2a6df5f9b6cf720f65d90b49b`의 승인 manifest를 현재 target `85b3902dec26e8d9cd7fd3e48befea306eb792fe`에 그대로 사용할 수 없음. 실제 설치 OLD/TARGET/OTHER·W01 범위를 다시 대조.
3. **다른 소유 변경:** W05 BEA archive read-only 모듈 1파일과 `config/operations.json`/`controller/operations.mjs` 공통 합집합; ER1 `pc-source-origin-readonly.mjs` 범위가 64→256 탐색으로 변경. 해당 변경의 *운영 적용 승인*을 W04의 기존 승인으로 가장하거나 설치하지 않는다.
4. **공통 장애:** 총괄이 #2094 안전복구 및 독립 maintainer V2 실제 PC 설치 영수증/GO를 제공하기 전 Controller B install **NO-GO**. 원본 #2094 requestId 재실행, stage/lease 삭제, Workflow 수동 토글, DB/D1/Task 변경 금지.
5. **다음 필수 실행:** W04가 원장 #68에서 단일 Controller 적용 담당 및 W01/W05/ER1 추가 scope 승인 여부를 **명확한 파일 단위**로 조정하고, 공유 복구/운영 source preimage 관측 후 exact 최소 누적 manifest+정규 새로운 B requestId를 구성한다. 다음은 실제 installed SHA/readback 확인, R2 `pit04Offset=0` A 8키 JSON/TXT 사전 판정. 키별 source/PIT 증명까지 35/72(48.6%) 유지.

**운영 효과 0:** 본 문서는 비밀·원본값·전체 경로를 게시하지 않으며 신규 B/PC 파일 변경을 요청하지 않는다.
