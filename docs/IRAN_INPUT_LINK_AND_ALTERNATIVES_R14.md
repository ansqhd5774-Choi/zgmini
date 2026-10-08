# 검증 입력 연결 및 대안 검토 — 2026-10-09

## 실제 구현·운영 입력 연결

`verified-input-r14.mjs`는 값이나 VERIFIED 플래그를 외부 JSON에서 직접 받지 않는다. 기존 immutable source ledger의 `input-assertion:<sha256>` ID만 읽고, 버전/고정 규칙/승인 단계/허용 필드/시각/근거 bodyHash를 확인한다. 관계/핵/군사 coverage/해상 coverage/공식 제한 상태를 부분 연결하고 다른 입력은 보존한다. 근거가 없는 주장, 미래 시각, 오래된 덮어쓰기, 같은 관측 시각의 충돌, 중복 target, coverage 공백을 거부한다. 새 원격 DB 스키마는 없다.

전 항목을 검증한 뒤 단일 SQLite transaction으로 불변 input revision과 checkpoint/provenance를 저장한다. 동일 입력/근거 재입력은 UNCHANGED이며 read-back 후 기존 산식으로 현재 상태를 반환한다. 계산 결과를 저장하거나 게시하지 않는다. 운영 명령:

```
node scripts/iran-progress/verified-input-r14.mjs --assertions=<assertion-ID JSON 배열 파일>
```

파일은 최대 16 KiB/32건이다. source-specific 검토·파서가 먼저 trusted assertion을 만들어야 하며, 이 도구 자체는 사실을 검증하거나 출처 coverage를 만들어내지 않는다. 예약 작업에는 아직 자동 연결하지 않았다.

`qatar-observation-input-r14.mjs`는 이미 직접 HTTP 200으로 받아 저장·재조회한 카타르 외교부 10월 6일 관측 receipt만 검증한다. 정확한 URL/날짜/발췌/해시/관계/명시 사실을 대조해 역사적 MEDIATOR_CONTACT(20) 입력을 생성한다. 이 발표 하나로 전체 현재 상태를 검증할 수 없으므로 materialPending=true/currentStateVerified=false를 유지한다. 원래 날짜는 DAY 정밀도로 보존하며 계산 freshness에는 보수적인 원래 날짜 하한을 사용한다. 오늘의 검토 시각을 오늘의 상태 관측일로 바꾸지 않는다. 휴전/핵 사실은 생성하지 않는다.

실제 SQLite에 공식 관측 assertion을 저장하고 relations.IRN_USA를 연결·재조회했다. inputPresent=true가 됐으나 관계 상태 UNKNOWN, 종합 PENDING/null, D/C/M/H/N 미충족을 유지했다. 20점은 역사적 관측 입력이며 현재 공개 D 점수가 아니다. 사건 VERIFIED 0개, 중요 보류 2개는 유지한다. D1/main/Production/기존 수집 작업은 변경하지 않았다.

## 공급원 대안 검토 결과

| 후보 | 실제 확인 결과 | 채택 판정 |
| --- | --- | --- |
| hormuz.now 자체 live 집계 | 자체 집계 CC BY 4.0 상업 재이용 안내. IMF 파생 자료 별도. 과거 날짜별 품질/상위 원천 식별 부족 | 기존 필터링 수집 유지. 검증 완료 주장 불가 |
| ChartNav 자체 AIS 집계 | 페이지는 자체 네트워크/CSV/재이용 안내. 일반 약관은 자동 추출 및 무허가 상업 활용 제한 | 조건 충돌이 해결되지 않아 미채택. 문의하지 않는 조건 유지 |
| straitofhormuzs.com | 데이터 페이지가 illustrative sample을 명시하고 live는 IMF 자료라고 설명 | 실데이터 대안에서 제외 |
| TQR/hormuz-traffic/여러 GitHub 미러 | 제공자 방법론에서 IMF PortWatch 재사용 확인 | IMF 제외 계약에 따라 제외 |
| AISStream 직접 수집 | 무료 실시간 WebSocket, 계정/API key 필요, durable replay 미제공. 상업 재이용 조건·호르무즈 지역 coverage 미확정 | 장래 후보. 무료 실시간 접근만으로 과거7일 확보·권리·품질 해결 불가. 계정 생성/연결 미실행 |

근거:
- https://hormuz.now/data
- https://hormuz.now/methodology
- https://chartnav.ai/waterway/strait-of-hormuz
- https://chartnav.ai/terms.html
- https://www.straitofhormuzs.com/data
- https://tqrlab.com/en/tools/hormuz-tracker/
- https://hormuz-traffic.com/
- https://aisstream.io/documentation

현재 조사 범위에서 무료·문의 없음·IMF 없음·현 검증 계약 유지 조건을 모두 충족해 바로 교체 가능한 공급원은 확인하지 못했다. 검색 결과 제목의 free/reuse만 보고 채택하지 않는다. CSV web 렌더 도구의 Unsupported content-type은 제공자 런타임 실패 증거가 아니다.

## 실제 실행 가능한 선택지

1. **계약 유지:** 검증 입력 연결과 28일 사건 검토를 계속한다. AIS는 권한/품질 근거가 확보될 때만 연결한다. 완료 시점은 자료 근거에 의존하며 단순 대기 7일로 보장하지 않는다. 현재 구현은 이 경로다.
2. **공급원·관측 방식 교체:** 이용 조건과 해당 지역 coverage가 검증된 직접 AIS 원천을 지정하고 자체 수집/통항 판별/품질 기록을 운영한다. 최소 7개 완결일의 통항 입력이 필요하며 군사/해상 관측 28일 문제는 별도다. 새 계정·키·운영 자원·source identity 계약은 승인 대상이며 현재 설치하지 않았다.
3. **방법론 R1.5 검토:** 불확실한 사건의 귀속·강도와 결측 영역을 가능한 범위로 다뤄 가중합 하한/상한을 계산한다. 임의 재가중치나 중간값 단일 점수를 만들지 않고 5개 가중치는 유지한다. 현재 모든 영역이 미충족인 상태에서는 범위가 0~100까지 넓어져 유용성이 낮을 수 있다. 근거 영역 확보가 선행돼야 한다. 개별 사건 범위·상관성·coverage 공백·공식 상태 판정·표시 문구를 검산한 뒤 별도 승인 대상으로 제안한다. 코드/공개 산식은 미변경이다.

최소 완료 기준은 실데이터 점수 입력과 운영 검증이다. 추가 공급원 연구를 완료조건으로 무한 확대하지 않는다. 현재 단일 점수 게시를 실제 막는 항목만 검증된 사건/coverage/현재 관계·핵 입력/AIS 권리·일별 품질/공식 제한으로 한정한다.
