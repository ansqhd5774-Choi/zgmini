# R52 — SEC 주식 수와 R51 가격 교집합 읽기 전용 검증

기준 브랜치: `codex/ui-improvements`, 시작 HEAD `0723bb8ce0370d7b1dd5b5136a5673470010ce85`.

## 검증 목적
- R51 전체 20개 배치 완료는 이미 확정되었으며 재수집하지 않는다.
- 기존 PC R51 `plan.json` SHA `4f6be1ba8f45007d25b7702b5eb6d5b3d193c60e7e13793876042a84e34c0138`와 `rows/batch-0000.json`~`batch-0019.json`을 읽어 행·중복·기준일·가격 유효성을 확인한다.
- R10 기존 주가, SEC ticker/CIK 매핑, SEC `companyfacts.zip`, PC 실적 티커 2,640개를 읽기 전용으로 대조해 실제 후보 교집합과 오래된 주식 수, 복수 티커 기업 위험을 집계한다.
- CompanyFacts는 주식 클래스 맥락이 불완전하므로 `issuer market cap verified = 0`, `gradeable = 0`을 유지한다. 주식분할·ADR/클래스·공개 표시 권한 검증 전 별표를 변경하지 않는다.

## 작업·검증 경계
- 이번 대화에서는 독립 ZIP+CMD 실행 파일을 별도 제작하고 Node 구문과 파일 SHA256/ZIP CRC 검사를 수행했다. PC의 실제 R52 실행·저장·D1·공개 UI는 미실행이다. ZIP을 GitHub에 업로드·반영했다고 주장하지 않는다.
- ZIP에는 `MARKET_CALENDAR_R52_READONLY.cmd`, `scripts/r52.mjs`, `README_KO.txt`, `SOURCE_MANIFEST.txt`, `SHA256SUMS.txt`가 있다.
- 실행: 새 폴더에 압축 해제 후 CMD 한 번, `MARKET_CALENDAR_R52_RESULT.txt` 한 개 확인. STOP 시 재시도하지 않는다.
- 보호: DB, SEC/R10/R51 원본, D1, 별표, scheduler, 배포, DNS. API 호출 0.
- R52 결과는 기존 R50의 수치와 일치해야 하며 비교 불일치 시 즉시 조사하고 공개 산식·별점 임의 변경을 금지한다.
