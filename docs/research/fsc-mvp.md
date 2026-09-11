# FSC 제한형 MVP

기준 002669f8a347b86adb4c4ae15d1568c35e71ca83에서 별도 worktree로 구현. 기존 site-v50의 로고·네이버·회원가입 숨김 변경을 포함하지 않는다. 기존 국가별 카드 뒤, SentimentSnapshot 앞에 작은 독립 섹션을 추가한다. 기존 한국 점수는 변경하지 않는다.

공개 API는 `/api/indicators/korea-funds` 하나다. worker/index.ts의 기존 route 등록 방식으로 연결한다. 연구 HTTP 응답을 다시 조회하지 않고 runFscScoped를 직접 재사용한다. 기존 연구 만료·query 거절 정책은 그대로 유지된다. 공개 기능에는 연구 만료일이 적용되지 않는다.

profileId=FSC_SCOPED_INDICATORS_V1, methodologyVersion=fsc-scoped-1-public-1. 수집은 신용/증시자금 operation 각 한 번의 pagination 실행만 한다. 기존 timeout·6페이지·6000행 제한을 재사용한다. BOK/KOSIS/CMA·grid 호출 없음. 내부 점수 handoff만 추가하고 기존 계산과 연구 출력은 보존했다.

각 지표 최근 유효 관측일 기준 12개월, 최대 366개 가공 점수를 허용 목록으로 내보낸다. 알려진 null을 유지한다. 카드값은 이 이력의 마지막 유효값과 동일하다. 마지막 입력이 무효하거나 관측일이 현재보다 7 달력일 넘게 오래되면 STALE로 표시한다. 이는 갱신 지연의 보수적 표시 정책이지 공식 공표 캘린더 검증이 아니다. 이전 유효 관측과 점수차를 제공하며 원시 금융금액은 내보내지 않는다.

15분 isolate 메모리 캐시와 in-flight Promise 병합 사용. 전역 단일 실행·전역 rate limit 보장은 아니다. query/POST는 수집 전 거절하며 버전·프로필 캐시 키가 연구 결과와 분리된다. 실패 결과도 15분 재사용해서 반복 방문이 즉시 재수집하지 않게 한다. 이전 실제 성공값이 있으면 지표별 STALE로 보존하고 관측·획득시각을 변경하지 않는다. 쿠키·인증 응답을 캐시에 저장하지 않는다. 출력은 64KiB 제한이며 초과 시 오류만 반환한다. 캐시는 메모리이므로 isolate 재시작 시 소실된다. 운영 비용·다중 isolate 부하는 아직 runtime 검증 대상이다.

UI는 설치된 Recharts를 재사용한다. 3개월 기본, 1개월/1년 전환은 클라이언트 필터링만 한다. 실제 날짜 축, 고정 0~100, linear line, connectNulls=false, 점수 애니메이션 없음. 반대매매는 경고색, 신용은 중립색이다. 금액 단위나 확률 %를 표시하지 않는다. 향후 공표시점·빈티지 검증을 true로 승격하지 않는다. 기존 commit에는 이벤트 helper가 없어 SDK나 이벤트 발송을 추가하지 않았다.

검증: 기존 300 + 신규 API 검사 15 = 315개. 경계·방향·null·0·미래값 검사는 기존 scoped fixture를 유지한다. 새 검사는 이력 제한, 점수 일치, 독립 실패, 동시 병합, 캐시, 노출, 만료 분리를 포함한다.

로컬 Chrome/Playwright로 360/390/768/1440 너비에서 문서 및 섹션 가로 overflow 없음, 모바일 1열/768 이상 2열, 0.0점, 네 상태, 기간 전환 추가 요청 없음, keyboard details, hover/tap tooltip visibility를 확인했다. PC와 모바일 PNG는 `.wrangler/mvp-*.png`, 구조 결과는 `.wrangler/browser-qa.json`에 남겼다. 모바일 최종 캡처는 sticky 기존 영역과 겹치지 않도록 높은 viewport를 사용했다. 테스트용 응답은 브라우저 interception에만 존재하고 production 코드에 포함하지 않는다.

검사 환경 발견: Miniflare가 Host를 변경하여 기존 HTML 테스트가 canonical redirect를 따라 운영 홈페이지를 볼 수 있었다. 테스트 wrapper 내부에서 Host를 복원하고 redirect=manual, 새 섹션 존재 assertion을 추가하여 정확한 로컬 빌드를 검증한다. 초기 QA에서 일반 운영 홈페이지로의 리다이렉트가 있었으나 연구·금융 API 호출은 없었다. 최종 QA는 로컬 응답만 전달하며 외부 요청을 차단했다. 운영 원자료 성공이나 RUNTIME_VERIFIED를 주장하지 않는다.

Build/Type/Syntax/Worker route compile/diff 검사와 노출 검사를 수행한다. 기존 UI 전체 재작성·Secret 변경·사이트 버전 생성·배포는 하지 않는다. 다음 단계는 승인된 MVP commit의 Sites 배포이며 최종 종합지수 공개가 아니다.
