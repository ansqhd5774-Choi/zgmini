# 이란 공식 발표 표시 R1.5

점수 null과 공개 가능한 공식 사실의 부재를 구분한다. 기존 R1.3 산식·가중치·점수 freshness·공격 검증은 변경하지 않는다. 부분관측 범위 점수는 도입하지 않았다.

## 저장과 검증

기존 `market_public_snapshots_v1`에 `public:iran-progress:r15:facts` 키를 추가한다. 테이블/DB 스키마 변경 없음. PC SQLite의 연결된 불변 assertion과 원천 receipt를 hash로 대조한다. 최초 adapter는 기존 검증된 카타르 외교부 2026-10-06 중재 발표만 지원한다. 다른 기사·AI 후보는 자동 공개하지 않는다. 원문·인용·AIS 데이터는 게시하지 않는다.

`publish-facts-r15.mjs --preview`는 공개 body 미리보기, `--publish`는 기존 공식 D1 credential과 upsert/read-back 경로로 게시한다. 관측일·발표일·근거 검토일을 보존하고 게시일로 freshness를 갱신하지 않는다.

## API와 화면

기존 점수 API가 PENDING/STALE이어도 최근 14개 UTC 날짜 안의 유효 사실이 있으면 HTTP 200으로 제공한다. score=null, status=PENDING을 유지한다. 현재 교전 관계는 별도 검증된 점수 payload가 없으면 UNKNOWN이다. 사실 없음과 DB 읽기 실패는 구분하며 읽기 실패·손상은 503이다. 발표 기록을 공격 부재·현재 휴전·종전으로 해석하지 않는다.

카드는 당시 발표 요약·날짜를 표시하며 상세 화면은 공식 발표 타임라인을 우선한다. 숫자 차트는 기존 유효 점수가 있을 때만 표시한다. 유효 기존 종전 판정 overallEnded=true인 활성 카드는 숨기며 기록은 삭제하지 않는다. 장기 lifecycle 원장 고도화는 이 변경에 포함하지 않는다.

## 검증 범위

- 관련 계약 테스트: score null과 사실 동시 표시, 무결성 실패, 14일 만료, DB 장애, 위조 문구/미래 날짜/중복 차단.
- 기존 작업 브랜치 이란 회귀 147개 통과. 배포용 selective branch는 포함된 테스트를 별도 실행한다.
- 실제 SQLite 기반 공개 사실 1건 생성 및 D1 write/read-back VERIFIED.
- 로컬 실제 React 컴포넌트 PC 및 390px 모바일 렌더링 확인.
- Production 배포/실제 HTTP 확인은 별도 단계다.
