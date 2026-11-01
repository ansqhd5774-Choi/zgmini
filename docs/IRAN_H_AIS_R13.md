# 이란 H 영역 AIS 대체 — 승인·구현·검증

2026-10-09 KST 사용자 승인: IMF 제외, H 전체15%·내부60:40 유지, 통항 부분을 항행 제한 R과7개 완결일 연속성 Q의 min으로 교체. 기존 공격 상한과 신규 대규모 해상 사건 보류를 유지한다.

## 활성 산식

`H = 0.6 * safety + 0.4 * min(R,Q)`에 기존 공격 상한을 적용한다.

R: STOPPED0, EMERGENCY_ESCORT_ONLY25, RESTRICTED_COMMERCIAL50, MAJOR_RESTRICTIONS_LIFTED75, NORMAL_CONFIRMED100. UKMTO·MARAD 공식 근거와 시간 정합성을 요구한다. 불명·상충은null.100은 제한 해제와 정상 운항 모두 확인해야 한다. 경보 만료만으로 해제 처리하지 않는다.

Q: 최근7개 완결 UTC일 중 실제 AIS 통항 관측값이 양수인 일수/7*100. 정상 통항량 회복률이 아니다. 일평균 통항 수와 AIS 비가시 한계를 별도 공개한다. 날짜별 수집 품질 확인 전 계산하지 않는다.

## IMF 제외 경로

이란 전용 수집기의 PortWatch endpoint·parser와28일 기준값 계산을 제거했다. 기존 금융·Korea 공급원은 변경하지 않았다. hormuz.now JSON은 자체 live/date/in/out/total과 provenance만 추출한다. IMF 필드·avg7·보정량·site status는 계산과 신규 저장에서 제외한다. legacy/mixed 및 partial일도 제외한다. 과거 로컬 감사 기록을 삭제하거나 새 산식에 재사용하지 않는다.

방법론은 `H_AIS_RESTRICTION_CONTINUITY_R1_3`, 결과 버전은 `IRAN_PROGRESS_R1_3_AIS`다. 기존 결과를 새 산식으로 오인하지 않도록 버전을 분리하고 공개 이력도 같은 방법론 버전만 사용한다. 과거 게시 이력은 재작성하지 않는다.

## 실제 조회 증거

- 관련 테스트61개 통과. Candidate Vite build 성공. Cloudflare 실제 배포·Production API 정상 증거는 아니다.

- hormuz.now `/api/daily.json`: HTTP200, 자체 live 완결일8개, 마지막 완결일2026-10-07. 현재2026-10-08은partial로 제외했다. 이 날짜는 UTC일 기준이다.
- MARAD 목록: HTTP200.2026-011 경보는 위험·운항 권고 자료이며 이것만으로 모든 상선의 항행 제한 상태 R을 확정하지 않았다.
- UKMTO 직접 recent-incidents: HTTP403. 재시도 루프나 우회 없음.
- 별도 SQLite에 필터링된 AIS 자료를 저장·재조회했다.7일 수집 coverage 및 upstream 이용 권리는 미확정이므로 qualityVerified/upstreamTermsVerified는false다. 실행 결과PENDING/null, 원격 게시 미실행.

## 이용 조건과 남은 실행

hormuz.now는 자체 집계의 CC BY4.0 상업 재이용을 명시한다. 원 AIS 제공자는 공개 설명에서 구체적으로 식별되지 않아 upstream 권리 확인은 완료하지 않았다. 제공자 문의는 사용자 방침대로 하지 않는다. 자체 집계 이용 안내와 upstream 권리 검증을 혼동하지 않는다.

원천별 검증된 사건·7일 날짜별 수집 품질·공식 항행 상태 입력 연결 후 READY 계산과 D1 게시·재조회, UI 연결 및 예약/배포 검증이 남아 있다. 본 변경은 UI 변경 없으며 예약·원격 게시·병합·배포를 실행하지 않았다.

공식 근거:
- https://hormuz.now/data
- https://hormuz.now/methodology
- https://www.maritime.dot.gov/msci-advisories
- https://www.maritime.dot.gov/msci/2026-011-persian-gulf-strait-hormuz-and-gulf-oman-iranian-attacks-commercial-vessels
