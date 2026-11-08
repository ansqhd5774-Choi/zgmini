# 고용 R6 + 물가7 공유 Writer 25파일 소스 후보 인계

## 범위와 승인 상태

- 개발 기준: `zgmini/main` `680390969d4ffa27247e73bcfe454292178f17d8` (ER1 PR #1021 포함).
- 소스 후보 브랜치: `codex/employment-r6-writer25-main-20261108`.
- 고용 R6 19개 + 물가7 7개 - 공유 `run-local.mjs` 1개 = **고유 파일 25개**.
- 물가 전용 신규 5개와 `independent-publication.mjs`는 최신 `main` 바이트를 그대로 사용하고, `run-local.mjs`에만 R6 opt-in 게시 hook을 좁게 추가했다.
- 아래는 **코드 검토용 후보**이며 `APPROVED_B` manifest, Windows 설치, 설정 활성화, 운영 게시 완료의 증거가 아니다.
- #68에서 정규 Writer B 단일 설치 담당과 최종 승인 범위가 확정되기 전에는 운영 설치 금지. 취소된 #874 및 19파일 manifest 재사용 금지.

## 목표 파일 SHA-256 (UTF-8 원본 바이트)

| 변경 | 대상 파일 | 후보 afterSha256 |
| --- | --- | --- |
| M | `lib/market-score/employment-r4-bed-provider.mjs` | `5508ca3e0512564a2bfae647aea72da6ff4a757755a1a8fc99dc5f0a1efd7ec0` |
| M | `lib/market-score/employment-r4-shadow-store.mjs` | `9e6f50ebc672c135eb04445ba9bad383fae161f7dbeece47793e385f3376874c` |
| M | `lib/market-score/employment-r6-collector.mjs` | `9e1c0168eb6f10e9d88f678ca8d8131b2ecd1e5ee0d9c741361fc6dfea99b10f` |
| M | `lib/market-score/employment-r6-contract.mjs` | `bb140adbf45bc445bcd84d16aa2893fda943d4b3f2b388927d9f8268ca1d7076` |
| M | `lib/market-score/employment-r6-feature-engine.mjs` | `8bf2f799c540fbaa23e14aafe99e1842c6865975170960b1fa3a61d5e95109d5` |
| M | `lib/market-score/employment-r6-observation-reader.mjs` | `81d9341a625d75bb96816657dbb26cc906a6afaaa49482d1c8cef8eb72291b88` |
| M | `lib/market-score/employment-r6-provider.mjs` | `01773f71649c346da59129f9b4bb6f3a742e02ee4f0f5404076927904bba7712` |
| M | `lib/market-score/employment-r6-scheduler.mjs` | `b128a2aed096cd7a87140152999317c0a28e14f9341ebd2aa3bdca169c94c3bf` |
| M | `lib/market-score/employment-r6-store.mjs` | `a6c2938bae56147ab4bf3fcb9ba3046355360a538e58f6d34de021ea1d586851` |
| M | `scripts/pc-writer/collect-local.mjs` | `9fd530866185d4499db35513207af0888a4f49165e766e5d75a133785ad7ce24` |
| M (공유) | `scripts/pc-writer/run-local.mjs` | `44fe384bfad99d27d8304e2f85ed094bf247dd36575f9c3a8d5de21b2f0a1754` |
| M (물가·ER1 공유) | `scripts/pc-writer/independent-publication.mjs` | `b93ba7e5e82c11eb8357e0a79398c313e08b21c27c88ef5412a887775677e611` |
| A | `lib/market-score/employment-r6-one-year-read-model.mjs` | `aa6a9f429f64802251b88a839f56154f43d73864f8d11df569ef56210fee69a4` |
| A | `lib/market-score/employment-r6-window.mjs` | `dc41a6780f05d28c31ee52b77b2f688df27216d109ae4c7dc1aa17a9da07decd` |
| A | `scripts/pc-writer/employment-r6-auto-collection.mjs` | `75cbf8fab32509b9b9b90f6ad6d9fd17187ede3836070fad8387ba331b09e6dd` |
| A | `scripts/pc-writer/employment-r6-auto-publication.mjs` | `5363c5aba19e3ef67d01307f46b3283ce2f38dd9d3673cc73331e980850c38ea` |
| A | `scripts/pc-writer/employment-r6-candidate-locator.mjs` | `e4b78dbd756743316beba0655a3fe89f45d7c93fb8036572bff5d5431d8e4a07` |
| A | `scripts/pc-writer/employment-r6-one-year-stage.mjs` | `1b12d0bfc00ae5bae4b3d91c0f3552abce5d93bf5c01337784fe464d2d30b741` |
| A | `scripts/pc-writer/employment-r6-pit-coverage.mjs` | `4b73aa44e1f104d10bfcc4ace3a07127f0d27b14cadf4c9b7f49b2c664d506e8` |
| A | `worker/employment-r6-public-display.mjs` | `e6d5829237ffff18007a84dd2aea1d156ee245ca0d722e8055881f38bf725951` |
| A (물가) | `lib/inflation-causal-candidates-public-7-catalog.mjs` | `14e810c504e9aa9ea81e538c83ff7d100a9abbac5e30a6d5684789b1a3161749` |
| A (물가) | `worker/inflation-causal-candidates-public-7-r1.mjs` | `a2b1f8e593cf5b4c88f5bff5bf107a36acd4a2354e6abb14614c29a07630de5e` |
| A (물가) | `worker/inflation-causal-candidates-public-7-writer-r1.mjs` | `562cc7dcb59c4c913fbe9722d0dd69b96b4acab916d8193165b753e01a71cccb` |
| A (물가) | `scripts/pc-writer/inflation-causal-candidates-public-7-preview-r1.mjs` | `f319c93dad34a131953746e470c50bc6921a9236d13eb74c790779f7b4560b7e` |
| A (물가) | `scripts/pc-writer/inflation-causal-candidates-public-7-auto-publication-r1.mjs` | `ad4460ab71403cfba01eb36926b08ba8ef94a951c8e11530536607d7d6f6d1f1` |

## 검증 범위와 실제 미완료 항목

- 코드 회귀: 고용 R6·물가7·ER1 통합 **127/127 PASS**, 공유 기능 유지 확인 3건 포함. `npm run typecheck` PASS. 25파일의 상대 import는 **개발 소스 트리 기준** 존재를 확인했다. 이것은 Windows Writer의 실제 상대 import 설치 상태 검증을 대신하지 않는다.
- 전체 `npm run build`는 빌드 서버 단계 중 실행 프로세스 **종료 코드 137**로 중단. 현재 환경 약 9.7GiB, swap 없음. 이를 기능 테스트 PASS나 실제 운영 build 성공으로 표현하지 않는다.
- 승인 A 원본: 고용 #873, 물가 #882 (원본 M 해시·A 부재). 동일 변경 원인이 없다면 재조회하지 않고 재사용한다. 다만 **실제 설치 직전** 공유 Writer 상태나 source/config가 변경된 경우 영향을 받는 CAS만 재확인한다.
- 시장 기업명 전용 3파일은 #871 설치 PASS 재사용; ER1 #883 로컬 PASS이나 개별 D1 게시 `NOT_RECORDED`다. 물가 7 후보는 유효 결과 4/7, 나머지 3개를 0이나 READY로 채우지 않는다.
- #68에서 설치 담당 1명 확정 → 기능별 교차 검토 → 최종 `APPROVED_B` 25파일 manifest와 고유 `candidateSourceSha`를 제어 저장소에 고정 → 정규 Writer B 단일 설치/Windows 파일 해시 25/25 및 원격 JSON/TXT 검증 → 필요한 경우 R6 두 설정만 별도 승인 B → 각 담당이 실제 SQLite/D1/API/UI 결과 검증.
- 자동 예약 갱신 검증은 위의 **모든 기능 단계 완료 이후**에만 후속 수행한다.
