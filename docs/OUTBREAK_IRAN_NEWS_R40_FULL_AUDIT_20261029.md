# R40 — 남은 59건 포함 전체 80개 후보 실수집 검증

- 작업 브랜치: `codex/outbreak-iran-news-retention-r1-20261026` (신규 브랜치 없음)
- 공개 피드 조회 기준: 2026-10-28T15:56:48Z (한국시간 2026-10-29 00:56)
- 기사별 실제 결과: [`IRAN_NEWS_R40_FULL_AUDIT_20261029.json`](./IRAN_NEWS_R40_FULL_AUDIT_20261029.json)
- 검증 실행기: `node --use-env-proxy scripts/iran-progress/news-server-full-audit-r40.mjs --live-save-evidence`
- 증거 JSON이 이미 있으면 재실행 시 덮어쓰지 않고 중단한다.
  새로 조회하려면 `--live`로 표준 출력만 확인하거나 신규 증거 파일명을
  별도로 승인하여 보존한다.
- 실행 범위: 기존 R24 피드에서 발견된 **고정 후보 80건 전체**. 이전 R39 21건
  제한 때문에 미검사였던 59건을 빠짐없이 포함하되, 새 실행에서 후보 목록이
  바뀔 수 있으므로 기사별 원문 URL을 중복 제거해 고정하고 전수 검사한다.

## 실측 결과

| 출처 | 후보 전수 검사 | 30일 적격 | 14일 적격 | 원문 요청 실패 |
|---|---:|---:|---:|---:|
| 타스님 | 13 | 2 | 2 | 0 |
| GOV.UK | 20 | 1 | 1 | 0 |
| 가디언 | 18 | 16 | 14 | 0 |
| DW | 2 | 2 | 2 | 0 |
| BBC | 4 | 3 | 3 | 0 |
| 알자지라 | 13 | 11 | 11 | 0 |
| UN | 10 | 4 | 2 | 0 |
| **합계** | **80** | **39** | **35** | **0** |

- 후보 80건 중 **중복 검사 0건, 미검사 0건**.
- 판정 분포: `ARTICLE_METADATA_REVIEWED=39`, `ARTICLE_OUT_OF_SCOPE=32`,
  `OUTSIDE_30_DAY_WINDOW=8`, `VIDEO_REQUIRES_SEPARATE_REVIEW=1`.
- 본문을 실제 요청한 후보 79건 중 기사 요청 실패 **0건**.
  동영상 1건은 원문 기사 본문 검증 대상이 아니라 따로 분류했다.
- 7개 매체 모두 최근 14일 적격 기사 **최소 1건**이 있다.
- 본 검증의 `30일 적격`은 제목·출처 URL·발행일·본문 확인 및 사용자 지정
  1차/2차 키워드 검사 결과이다. 별도 주관적 관련성 필터를 추가하지 않는다.

## 실행 및 운영 격리

- 21·21·21·17건으로 나누고, 배치마다 외부 원문 요청 21건 이하로 제한한다.
- 외부 요청은 R39의 공식 HTTPS 호스트 허용 목록을 재사용한다.
- **이 반복 실행기는 개발 CLI 전용**이다. Cloudflare Workers 무료 플랜의
  단일 요청 서브리퀘스트 제한이 있으므로, 한 HTTP 요청 안에서 전체
  80건을 반복 조회하는 서버 진입점으로 연결하면 안 된다.
- 기사 전체 본문·원본 HTML·자격증명은 결과 JSON에 저장하지 않는다.
- `d1Written=false`, `publicSnapshotModified=false`, `pcRunnerModified=false`,
  `schedulerModified=false`, `scoreLedgerModified=false`, `queueModified=false`.
- R39와 동일하게 원 발행의 독립적 검증, 30일 전체 인터넷 뉴스 완전성,
  재게시 권리, 실제 Cloudflare 네트워크 연결, D1 저장, 공개 UI 표시는
  이 검사로 증명되지 않는다. 상태는 `CANDIDATES_INSPECTED_REVIEW_REQUIRED`.
- 실제 운영 API는 별도로 확인해야 한다. **개발 검증 80건을 공개 뉴스 80건이나
  D1 저장 80건으로 보고하지 않는다.**

## 검증

`node --test tests/iran-news-*.test.mjs` — 39개 테스트 통과.
`tests/iran-news-full-audit-r40.test.mjs`에서 80건·4배치, 중복 거부,
부분 한도, 요청 실패 기록, 허용되지 않은 호스트 차단을 검사한다.
