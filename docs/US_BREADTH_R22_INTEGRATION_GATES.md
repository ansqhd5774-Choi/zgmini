# 미국 등락 지수 — R22 신규 전체시장 확정치/잠정치 독립 연결

기준: 2026-11-01. 저장소: `ansqhd5774-Choi/zgmini`, 작업 브랜치: `codex/us-breadth-public-r1-20261031`.

## 변경 및 보존 범위

1. **장중 잠정 IEX (~503종목)**: 기존 `scripts/pc-writer/local-cycle.mjs`에서 원자료 수집을 일반 Core 수집·게시보다 앞으로 이동. Core와 Korea 기존 예약 작업·주기·확정치 게시기·250일 기록은 수정하지 않는다. 15분 슬롯 중 관측되지 않은 종목은 미관측이며 보합 간주나 98% 게이트를 적용하지 않는다.
2. **신규 전체시장 확정 R2 (~6,500종목)**: 독립 `public:market-breadth-confirmed-r2:usa:current` 및 `...:daily:YYYY-MM-DD` 키만 사용하는 읽기/게시 후보. 기존 `public:market-breadth-r1:usa`(503종목) 및 `...:YYYY-MM-DD`(기존 250거래일), Alpaca 잠정치 키와 분리한다. 전체시장 R2의 가격 미확보 보합 간주/그 수 별도 기록은 R21 승인 규칙 그대로다.
3. `lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs`는 R20의 STAGING_ONLY 후보를 최종값으로 반환하지 않는다. `READY`·`PUBLIC_FINAL`·유효 출처/이력/승격 증빙 및 최신 완료 거래일만 허용한다. 공개 API `?market=usa&phase=confirmed-r2`는 **새로운 R2 최종 키만 조회**하며 D1에 값이 없으면 503. 기존 `?market=usa` 및 `?phase=confirmed` 경로는 건드리지 않는다.
4. `scripts/pc-writer/us-breadth-confirmed-final-r22.mjs`는 D1 스테이징의 저장 body와 **사전에 별도 승인한 staging SHA 및 양일 공급자 파일 SHA**가 일치할 때만 R2 final 승격 가능. `finalWriteEnabled=false` 기본, 실행기에 연결하지 않음. 명시 활성화해도 STAGING 읽기/완전한 원장·최신 거래일·기존 R2 동의 일자 무변경·두 키 readback Gate를 거친다. 실제 운영 D1 write 미실행.
5. `scripts/pc-writer/us-breadth-confirmed-year-inventory-r22.mjs`: 승인된 PC 운영 루트에서 신규 1년 R2 계산에 필요한 251거래일 파일만 **읽기 전용** 점검. 중복·경로 이탈·손상·로컬 SHA 불일치 검사. 자체 해시가 맞아도 독립 MarketParquet 원본 확인으로 가장하지 않으며 `providerAuthenticityVerified=false`를 유지한다.

## 병렬 검토에서 확인된 운영 Gate

- 기존 Core Windows 작업은 소스상 약 5분 간격에 `IgnoreNew`; `quota-runner`와 `local-cycle`은 장시간 동기 처리 및 별도 lock을 사용한다. **잠정치 수집을 앞당겨도 작업 전체가 15분 넘게 걸리면 15분 발행은 보장되지 않는다.** 실제 PC 예약 실행 기록·실행 소요시간이 필요하다.
- Core 소요시간이 15분 미만으로 검증되면 현재 우선순위 변경으로 추가 예약 작업 없이 운영 확인한다. 초과하면 독립 15분 fast lane 설계와 sidecar 동시 실행 lock이 필요하나 **현재 적용하지 않는다**. 다른 운영 수집/게시 경로 변경이나 임의 새 작업을 만들지 않는다.
- 1년 실데이터 차트는 251거래일 원본과 **독립 공급자 manifest**가 확인된 후 R21 프리뷰 계산 가능. 현재 임시 실측 자료는 5일(차트 4개 점)뿐이다.
- 새로운 R2 확정 API가 소스에 존재해도 D1 신규 `PUBLIC_FINAL` 레코드, Windows PC 운영 버전, Cloudflare main 배포가 미검증이면 사이트의 6,500종목 연결 완료가 아니다.
- UI는 `codex/ui-improvements` 전용 브랜치에서 잠정치 관측 수·시간·만료 처리와 확정치 R2 분리를 구현해야 한다. R1 503종목 과거 차트를 R2 약 6,500종목 차트인 것처럼 표시해서는 안 된다.

## 다음 실제 작업

1. 기존 PC 운영 source SHA, Core 실제 action·소요시간, MarketParquet 251일 원자료와 원장, 잠정 게시/readback을 읽기 전용 점검.
2. 신규 R2 실측 검증·독립 공급자 SHA 승인 → 신규 D1 R2 staging readback → 신규 R2 final 별도 키 게시 readback (기본 OFF를 명시적으로 해제할 Gate 확인 필요).
3. API·UI만 선택적으로 PR로 `main`에 반영해 Cloudflare Git integration 빌드·배포·공개 응답 검증. 기존 확정치/250일 이력 및 잠정치 데이터 계약을 한 번도 덮지 않는다.

**현 시점에는 PC 설치, D1 실제 게시, main 병합, Cloudflare 배포를 실행하지 않았다.**
