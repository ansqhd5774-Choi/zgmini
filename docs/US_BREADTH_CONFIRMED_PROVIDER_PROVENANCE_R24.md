# 미국 등락 지수 — R24 MarketParquet 원본 교차검증 (읽기 전용)

대상: `ansqhd5774-Choi/zgmini`, 기존 `codex/us-breadth-public-r1-20261031` 브랜치. 사용자 승인 잠정/확정 분리, 확정치 약 6,500종목, 전일 미확보 가격의 보합 간주, 기존 R1 및 250일 이력 보존 계약은 변경하지 않는다.

## 공식 공급자 계약 확인 (2026-11-01)

- [MarketParquet API 공식 문서](https://marketparquet.com/documentation)의 `GET /api/v1/manifest/stock_daily?start=YYYY-MM-DD&end=YYYY-MM-DD`는 파일별 `date`, `filename`, `file_size_bytes`, 유효기간 있는 서명 `download_url`을 반환한다. **SHA256·행수·complete=true는 제공하지 않는다.**
- [MarketParquet 무료 1년 안내](https://marketparquet.com/guides/free-historical-stock-data): 무료 계정/API 키로 최근 약 365일의 거래일별 주식 일봉에 접근할 수 있으나, 익명 다운로드는 최근 약 7일에 제한된다. 무료 API 키는 분당 60회 정책이다. 가입·비용 결제·권한 변경을 R24가 수행하지 않는다.
- R22 달력 기준 2026-11-01의 새로운 250포인트 차트에는 **2025-10-31부터 2026-10-30까지 251개 실제 거래일 파일**이 필요하다. 무료 롤링 기간 경계의 첫날이 빠질 수 있으므로 manifest 응답에서 일별 가용성을 검증해야 한다. 추정으로 251개 완전 보관을 선언하지 않는다.
- 공급자 파일이 사후 수정될 가능성은 있으므로, PC 사본과 이번에 새로 내려받은 공급자 원본이 실제로 불일치하면 **기존 파일을 덮지 않고 보류**한다.

## 구현 및 실행

새 보조 검사: `scripts/pc-writer/us-breadth-confirmed-provider-manifest-r24.mjs`.

### Windows CMD 실행 전 확인 (R26, 2026-11-01)

**결과 파일을 공유할 때:** `tools/us-market-breadth-r1/US_BREADTH_R26_NODE_DIAG.cmd`를 PC에서 실행한다. 현재 CMD 작업 폴더가 프로젝트가 아니어도, Node가 고장 났어도 실행 가능한 **Node 비의존 읽기 전용 진단**이다. 결과는 기본적으로 `다운로드` 폴더의 `US_BREADTH_R26_NODE_DIAG_...txt`에 저장되고 메모장으로 열린다. `다운로드` 경로가 없을 때만 `%TEMP%`에 저장한다. 그 `.txt`만 채팅에 첨부하면 된다. 배치 파일은 API 키·환경변수 전체·예약 작업 Action을 로그에 수집하지 않으며, Node 설치·PATH·예약 작업·D1·원본을 변경하지 않는다. 결과에는 시스템 경로·프로젝트 폴더명이 포함될 수 있으니 공유 전 확인한다.

아래는 모두 **읽기 전용**이다. 먼저 실제 PC의 예약 작업 `ZGMINI-PC-Local-Core` Action, 승인된 `config.source`, 프로젝트 경로가 일치하는지 확인한다. 역사적 `E:` 경로를 현재 설치·승인 SHA의 증거로 대신하지 않는다.

```cmd
schtasks /Query /TN "ZGMINI-PC-Local-Core" /V /FO LIST
where node.exe
dir "E:\ZGmini\runtime\node.exe"
"E:\ZGmini\runtime\node.exe" --version
dir /b /ad "E:\ZGmini\projects"
```

예약 작업 조회 결과는 해당 작업의 **실제 Action 경로를 확인하는 참고**다. `config.source`·해당 경로의 소스 커밋까지 대조하기 전에는 새 소스를 설치하거나 예약 작업을 다시 등록하지 않는다. 공유할 때는 명령에 비밀값이 섞이지 않았는지 확인한다.

`where node.exe`의 첫 결과가 `C:\nvm4w\nodejs\node.exe`이고 Windows가 `지원되지 않는 16비트 응용 프로그램`을 표시하더라도 **R24 코드나 MarketParquet 검증 실패는 아니다**. 이 단계에서는 Node 실행조차 시작되지 않은 것이다. 실행 파일이 손상됐는지·링크 대상이 잘못됐는지는 별도 확인이 필요하다. 운영 지침의 E: 전용 Node가 실제로 존재하고 `v24` 이상으로 실행되는 경우에만 다음 단계로 이동한다. E: Node 실행도 실패하면 여기서 중단한다. Node/nvm 재설치, PATH 변경, Core 예약 작업 변경은 이 진단 범위에 없다.

**현재 승인된 프로젝트 루트로 CMD에서 이동한 후**, 다음 파일 존재부터 확인한다. 예시 경로를 추정해 `cd`하지 않는다. 파일이 없으면 승인 source의 파일 반영 상태를 조사하며 운영 작업을 임의 교체하지 않는다.

```cmd
dir "scripts\pc-writer\us-breadth-confirmed-provider-manifest-r24.mjs"
"E:\ZGmini\runtime\node.exe" "scripts\pc-writer\us-breadth-confirmed-provider-manifest-r24.mjs" --inspect
```

- CMD 프롬프트가 `C:\Users\...>`라면 아직 프로젝트 루트가 아니다. 그 위치에서 `scripts\...` 상대경로를 실행하지 않는다.
- `--inspect`의 JSON 상태를 먼저 확인한다. **251일 로컬 원본과 기존 audit 기록이 완전한 경우에만** 별도 검토 후 `"E:\ZGmini\runtime\node.exe" "scripts\pc-writer\us-breadth-confirmed-provider-manifest-r24.mjs" --verify-provider`를 고려한다. 이를 통해 실제 공급자 원본 251회 검증 네트워크 요청이 발생할 수 있다.
- `--inspect`: 현 PC 운영 저장소의 R22 인벤토리를 읽기 전용 요약. 네트워크 요청·파일/DB/스케줄 변경 0.
- `--verify-provider`: 먼저 R22 승인 경로 아래 **251개의 중복 없는 Parquet + 기존 `.audit.json` SHA 일치**가 실제로 확인되어야 진행한다. 없다면 즉시 `LOCAL_YEAR_INVENTORY_INCOMPLETE`이고 공급자 호출 0.
- 기존 PC `providers.env`의 `MARKETPARQUET_API_KEY` 또는 실행 환경에 이미 설정된 같은 변수를 사용한다. 없으면 `PROVIDER_API_KEY_NOT_CONFIGURED`로 중단한다. 새 키 생성·로그 출력·자격증명 파일 수정은 하지 않는다.
- 251개 PC 파일이 모두 확인되면 인증된 MarketParquet HTTPS manifest 1회를 조회해 정확한 날짜·파일명·크기를 대조한다. 누락 날짜는 `PROVIDER_MANIFEST_MISSING_SESSION`과 최초 날짜/개수만 출력한다.
- 공급자 manifest의 HTTPS 서명 R2 다운로드 URL은 검증된 `*.r2.cloudflarestorage.com` 호스트만 허용한다. URL/서명은 메모리 내 요청에만 사용하고 로그·JSON·Git에 남기지 않는다. 각 공식 다운로드 본문은 PC 기존 파일의 SHA256·크기·Parquet 앞뒤 매직 바이트와 교차 검증한다. 리디렉션은 허용하지 않는다.
- **모든 날짜의 새 공급자 바이트가 기존 PC 파일과 일치한 경우만** 인메모리 `candidateManifestEntries`에 `complete:true` 및 로컬 SHA를 담는다. 이는 공급자가 SHA를 제공했다는 주장이 아니라 **실시간 공급자 원본 대조의 증거**다. 별도 운영 승인이 없으므로 `approvedR21ManifestEntries=null`을 유지하고 R21 프리뷰·D1 출시는 자동 실행하지 않는다.
- 사용자에게 출력되는 CLI 요약은 후보 파일 경로·종목별 가격·API 키·서명 URL을 제거한다. 기존 승인 경로의 로컬 파일과 감사 기록은 **읽기만** 하며, **기존 R1 키/250일 기록, 신규 R2 D1 키, Windows 예약 작업에는 접근하거나 변경하지 않는다.** D1 쓰기·원격 게시는 없다.

## 미검증 운영 Gate

1. PC의 승인 `config.source`와 실제 설치/실행 경로를 GitHub `main` Core runbook 기준으로 먼저 확인한다. 역사적 `E:` 경로를 현재 위치로 가정하지 않는다.
2. R24를 현재 PC의 승인된 소스에 선별 반영하고, **먼저 `--inspect`** 결과로 251개 원본 존재를 확인한다. 부족하면 기존 파일을 조작하지 않고 무료 계정 접근 범위 및 별도 수집·보관 절차부터 협의한다.
3. `--verify-provider`로 전체 다운로드를 실행하면 실제 provider read만 수행하고, 결과가 `PROVIDER_BYTES_MATCHED_ALL_DATES`인지 검토한다. 성공하더라도 R21 1년 차트 계산과 R2 staging/final 게시 승인은 별도 검증 단계다.
4. 잠정 Alpaca IEX의 503개/15분 및 신규 확정 MarketParquet의 약 6,500개/매일은 완전히 분리한다. 기존 250거래일 기록은 수정하지 않는다.

**현재 상태:** 코드/모의 네트워크 테스트와 Linux 로컬 검사만 완료. 실제 Windows PC의 251개 파일, 무료 계정 권한, 공식 signed-url 251회 대조, 1년 실측, D1/Cloudflare 적용은 **미실행·미검증**.
