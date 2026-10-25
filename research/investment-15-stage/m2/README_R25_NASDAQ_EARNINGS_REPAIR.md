# ZGMINI 투자 분석 M2 R25 — SERV 실적 원문 403 오류 수정

## 사용자 Windows 실측에 근거한 수정

- R24의 `M2_LATEST_STATUS(20261025-063647).txt` 실제 실행 결과: 시장·섹터·테마 `READY / PASS`, 제품 원문 `4/4`, PDYN 실적 `PASS`, **SERV 실적만 `EARNINGS_HTTP_403`**, 원본 PDF `15/15 PASS`, 원본 계산기 `PASS`, 전체 평가 `0/60`.
- SERV가 발행한 2026년 2분기 실적 보도자료가 **Nasdaq 거래소 게시 플랫폼에도 별도로 발행**된 것을 확인했습니다. R25는 허용 대상 주소를 이 공개 게시물 하나로 교체했습니다.
- 변경한 주소를 우리 측 공개 HTTP에서 직접 조회한 결과 `200`, 제목·2026-06-30 분기말·2026년 2분기 회사 전체 매출 **320만 달러** 문구 확인 `PASS`.
- Nasdaq 페이지의 HTML이 쉼표 앞 공백을 추가하는 차이를 일반화하여 검증했습니다. **날짜·매출 문구의 일치 조건은 완화하지 않았습니다.**
- 원문은 어디까지나 발행사가 배포한 회사 전체 실적이며 **외부 감사 검증이나 휴머노이드 매출 근거가 아닙니다**.

## Windows CMD 실행

1. R25 ZIP을 **바탕화면 새 폴더에 전체 압축 해제**합니다.
2. `M2_RUN_READONLY.cmd`를 **더블클릭**합니다. 기존 Business Quant 개인 키 재등록 필요 없음.
3. `M2_LATEST_STATUS.txt`가 같은 폴더에 생성되면 파일을 보내주세요. 보고서 `M2_LATEST_REPORT.html`은 자동으로 열립니다.

## 확인할 로그

```
REPORT=INVESTMENT_M2_R25_NASDAQ_EARNINGS_REPAIR
STAGE7_ALLOWED_EARNINGS_STATUS=PARTIAL
STAGE7_ALLOWED_EARNINGS_OBSERVED=2/4
STAGE7_ALLOWED_EARNINGS_COMPANY=NASDAQ:SERV | STATUS=ISSUER_SELF_REPORTED_EARNINGS_OBSERVED | COMPANY_REVENUE_USD_MILLION=3.2
STAGE7_ALLOWED_EARNINGS_COMPANY=NASDAQ:PDYN | STATUS=ISSUER_SELF_REPORTED_EARNINGS_OBSERVED | COMPANY_REVENUE_USD_MILLION=5.8
STAGE8_PDF_COVERAGE=15/15
STAGE8_ORIGINAL_CALCULATOR_INTEGRITY=PASS
STAGE8_CALCULATED=0/60
```

위는 **예상 결과**입니다. 실제 Windows에서 새 주소까지 HTTP 403이 나타나면 이를 성공으로 보고하지 않으며 재시도나 차단 우회 없이 멈춥니다. RR·VHUB는 허용된 분기 실적 원문 미확보 상태로 유지합니다.

## 변경하지 않은 항목

- 금지된 미국 감독기관의 웹사이트·공시·API·중계본·저장본 **전면 사용 금지** 유지.
- PDF 원본 15개, 원본 R22 평가 계산기, 모든 점수·가중치·시장 데이터 계산 방식 무수정.
- 7단계의 새 보도자료 수치는 8단계 점수 계산에 넣지 않습니다. 미평가를 0점으로 계산하지 않습니다.
- 주문, GitHub, Cloudflare, 사이트 DB, 공급원, 운영 스케줄러, DNS, 공개 배포 모두 미변경.
- 무료 열람 가능한 공개 보도자료만 대상, 기존 차단 주소에 대한 자동 재시도나 우회 접속 없음.

## 검사 상태

- 데이터 원문 직접 조회: 회사 공표 PDYN·Nasdaq에 별도 게시된 SERV 각 HTTP 200, 검증기 본문 검사 PASS.
- 관련 오프라인 회귀 검사를 통과했지만, **사용자 Windows 새 주소 실측은 이 ZIP 실행 후 확인**해야 합니다.
