# ZGMINI CI 8영역 표준 판정 R1

기준: 2026-11-25, 각 저장소 최신 main·기존 CI 및 실제 Actions 결과. 목적은 **검사 유형별 필요 범위·실행 조건·실제 PASS를 통일**하는 것. 이 문서는 운영 기능의 수집·게시·배포 완료 인증을 대체하지 않는다.

## 공통 판정 계약

- CI 8종은 **8개 검사 영역**이지 각 저장소에 8개 Workflow를 만들라는 뜻이 아니다.
- IMPLEMENTED: 해당 기술에 필요한 범위의 자동 PR CI가 연결되고 실제 Run/정확 HEAD의 관련 단계가 PASS. PARTIAL: 일부 계약·Mock·UI 경로 또는 실행 검증 누락. NOT_APPLICABLE: 실제 파일·배포 구조를 근거로 불필요. NOT_CONFIGURED: 필요한 자동 검사 없음. BLOCKED: 필요한 권한·환경 때문에 실행 불가. UNVERIFIED: 실증 조회 전.
- Lint는 변경 소스만 검사하면 그 범위로 명시. Unit과 Integration은 Mock/격리/실 D1·SQLite를 구분한다. E2E는 브라우저/격리 흐름/실제 운영 전체를 구분한다. Security와 Secret은 독립 취약점 탐지 영역이다.
- CI 성공과 운영 PC source SHA, SQLite·D1 저장, Production API/UI, 배포 버전을 혼동하지 않는다. 운영 종단 E2E의 동일 key/version/time/readback은 **기능별 인수 검증**으로 별도 유지하고, 이를 전 저장소의 CI 설치 선행조건으로 만들지 않는다.
- 정상 1·실패 1의 판별력 있는 fixture/회귀시험 또는 동등한 유효 실패 증거와 관련 CI가 있으면 된다. 장애 사례 축적, 반복 설치, 고정 수량의 새로운 CI를 완료조건으로 삼지 않는다.
- 모든 범위 변경은 latest main 기반 최소 수정 → 기존 CI와 관련 시험 → PR → 정확 HEAD 검증 → merge SHA/readback. 신규 유료 보안 서비스·운영 Runner·예약·DB/D1 쓰기·공급자 호출은 별도 승인 없이 금지.

## 완료 기준

표준 설정 완료 = 각 영역에 **IMPLEMENTED 또는 근거 있는 NOT_APPLICABLE** 판정, 해당 CI가 실제 PR에서 실행·PASS, 필수 source/테스트 경로 트리거 누락 없음. PARTIAL/UNVERIFIED/BLOCKED는 해당 영역만 미완료. 모든 운영 기능에 대해 단일 원자적 종단 추적을 보편 CI 설치 합격 조건으로 추가하지 않는다.

## zgmini 웹 본체 — 적용 현황

| 영역 | 적용 및 실행 계약 | 현 판정 |
|---|---|---|
| Lint | `.github/workflows/node.js.yml`의 `node scripts/lint-changed-ci.mjs`; 변경 소스 ESLint만 | IMPLEMENTED (변경 범위) |
| Type Check | 동일 CI `npm run typecheck` → `tsc --noEmit` | IMPLEMENTED |
| Build | 동일 CI `npm ci`, `npm run build`, CSS/JS 아티팩트 | IMPLEMENTED |
| Unit | 동일 CI `node --test tests/*.test.mjs` | IMPLEMENTED |
| Integration | 게시 복구·Cloudflare Projection 읽기 계약시험; 일부 모의 DB/서비스 | IMPLEMENTED (격리 계약); 실제 DB/게시 운영 경로는 별개 |
| E2E | `community-chat-browser.yml` Chromium/Playwright 18개 실제 브라우저 시험, 일부 Production 읽기 | IMPLEMENTED (지정 UI 경로); 전체 사이트·운영 데이터 계보는 별개 |
| Security | `codeql-source.yml` CodeQL JavaScript/TS + `node.js.yml` production `npm audit` | IMPLEMENTED (현 검사 범위) |
| Secret | `secret-scan.yml` Gitleaks, PR 관련 소스 | IMPLEMENTED |

**실행 근거:** 동일 main SHA `8410a857d2d8...` Node [#45448912690](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45448912690), CodeQL [#45448912575](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45448912575), Secret [#45448912664](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45448912664) SUCCESS. Playwright PR #1566 exact HEAD `60f1d07fe38e...`: Node [#45458737936](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45458737936), Secret [#45458737918](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45458737918), Browser [#45458738065](https://github.com/ansqhd5774-Choi/zgmini/actions/runs/45458738065) SUCCESS. PR #1566 merge `222a16f23f38...`: 18개 실행 스크립트의 PR 트리거 누락 0.

**한계:** ESLint 기존 전체 소스 경고는 변경 범위 검사 결과로 무효화하지 않는다. 일부 Integration의 Mock 통과는 Production D1 readback 증거가 아니며, 브라우저 지정 경로 통과가 모든 URL/관측기간 E2E를 보증하지 않는다. CodeQL/Secret도 모든 보안 결함을 배제한다는 보장이 아니다.
