# 운영 배포와 복구

## 구조

GitHub Actions Ubuntu 24.04 x64에서 Node 24.19.0/pnpm 10.33.0으로 테스트·빌드한다. EC2에서는 dependency 설치나 Next 빌드를 하지 않는다.

- `/home/ubuntu/haetteum-releases/<sha>`: 변경하지 않는 버전별 artifact
- `/home/ubuntu/haetteum-current`: 현재 release 링크
- `/home/ubuntu/haetteum-shared/api.env`, `web.env`: 비밀 설정을 포함한 서버 전용 환경파일
- `haetteum-shared/uploads`: 기존 업로드 경로 연결
- `haetteum-shared/backups`, `logs`, `verified`: 백업, 프로세스 로그, 후보 검증 기록
- `/home/ubuntu/haetteum-incoming`: checksum과 전송 archive

PM2의 haetteum-api/haetteum-web이 실제 release의 Node 진입점을 실행한다. nginx는 기존 4000/3000 upstream을 유지한다. 전환 과정에 짧은 재시작 시간이 있을 수 있다.

## 사전 조건

서버에 bash, Python 3, flock, curl, tar, sha256sum, PostgreSQL pg_dump/pg_restore, Node 24.19.0, PM2가 필요하다. 공개 빌드 변수 NEXT_PUBLIC_API_BASE_URL 및 NEXT_PUBLIC_KAKAO_JS_KEY는 GitHub repository variables로 설정한다. EC2_HOST와 EC2_SSH_KEY는 기존 secrets를 사용한다. DB와 SMTP 비밀값은 CI artifact에 넣지 않는다.

`SMTP_FROM`이 앱이 사용하는 키다. 기존 `MAIL_FROM`만 있다면 같은 값을 SMTP_FROM에도 설정한다. API는 `API_PORT`를 사용한다. 후보 실행은 `API_PORT=4001`, `PORT=3001`, `SCHEDULERS_ENABLED=false`로 구분한다.

## 정상 배포

1. 변경을 검토하고 빌드·단위 테스트·isolated runtime smoke를 통과시킨다.
2. 신규 migration을 SQL 수준에서 검토하고 이전 앱과의 호환성을 확인한다. 검토한 정확한 커밋 SHA를 repository variable `ROLLBACK_COMPATIBLE_SHA`에 기록한다. 이 값은 일괄 영구 승인이 아니며 매 배포 SHA에 귀속된다.
3. 검토한 SHA를 main에 반영한다. CI는 빌드 성공 후에만 전송·활성화를 실행한다. 최초 복구는 current 링크와 정상 rollback 후보를 먼저 마련한다.
4. 디스크 검사, artifact checksum, 안전한 압축 해제, DB 백업, migration, 후보 기동 검증을 통과한 후 PM2를 전환한다.
5. 홈·검색·최신 로그인 화면과 static assets를 브라우저에서 확인한다. 200 상태나 PM2 online만으로 완료라고 판단하지 않는다.

후보 기동 전에 적용한 additive migration은 전환 실패 시에도 남는다. 이 때문에 rollback 호환성 검토가 필요하며 자동 DB 역마이그레이션은 하지 않는다.

## 최초 복구

이전 `.next`는 빌드 실패로 손상되었으므로 rollback 원본으로 사용하지 않는다. 복구 브랜치의 CI는 배포 개선 전 커밋 d8e3f98 코드도 현재 pinned dependencies·standalone tooling으로 재빌드한다. 과거 커밋에는 누락된 ProfileModule과 오래된 테스트가 있어 그대로 실행할 수 없었다. 따라서 이 baseline은 과거 운영 바이너리가 아니라 최신 로그인 코드를 포함하여 CI와 후보 포트에서 검증하는 최초 복구 기준이다. 최초 복구 이후에는 실제 직전 정상 release를 rollback 대상으로 사용한다.

검증한 baseline archive를 먼저 stage하고 후보 포트에서 검사한다. 이후 최신 archive 활성화에 baseline SHA를 명시한다. 데이터는 기존 DB·uploads를 사용한다.

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.19.0
export NODE_BIN=$(command -v node)
export BACKUP_REQUIRED_BYTES=134217728
# SHA와 archive 경로는 다운로드한 release.json 및 checksum에서 확인한다.
bash scripts/deploy/activate-release.sh "$BASELINE_ARCHIVE" "$BASELINE_SHA" --stage-only
bash scripts/deploy/activate-release.sh "$BASELINE_ARCHIVE" "$BASELINE_SHA" --verify-only
export ROLLBACK_SHA="$BASELINE_SHA"
export MIGRATIONS_BACKWARD_COMPATIBLE=true
bash scripts/deploy/activate-release.sh "$RELEASE_ARCHIVE" "$RELEASE_SHA"
```

BACKUP_REQUIRED_BYTES는 현재 약 14MB DB에 잡은 128MiB reserve다. DB가 커지면 실제 크기에 맞게 늘린다. archive 전송 공간, unpacked release, 기존 rollback release, 백업 외에도 512MiB headroom을 요구한다. 부족할 때 현재/rollback release 또는 DB를 삭제하지 않는다.

## 수동 rollback

검증 기록이 있는 SHA만 지정한다. DB 상태는 되돌리지 않으므로 해당 migration과 호환되는 버전이어야 한다.

```bash
export NODE_BIN=$(command -v node)
bash /home/ubuntu/haetteum-current/scripts/deploy/rollback-release.sh "$PREVIOUS_SHA"
```

rollback 후에도 `/api/v1/health`, `/`, `/explore`, `/login` 및 기존 탭 이동을 확인한다.

## 장애 확인

- GitHub Actions 실패 단계와 로그 확인
- 현재 링크와 release.json의 SHA 확인
- PM2 jlist에서 name/status/cwd/script만 추출해 확인(환경변수 전체 출력 금지)
- shared 로그, `free -m`, `df -h`, 커널 OOM 기록 확인
- `/auth/me`의 비로그인 401은 정상일 수 있음
- API 환경파일, 백업 파일, SSH private key를 첨부하거나 공개하지 않음

## 보존

배포 성공(운영 smoke test와 PM2 save 완료) 후 자동 정리한다.

- 릴리스는 현재 버전과 직전 정상 버전을 보존한다. `ROLLBACK_SHA`로 별도 버전을 지정했다면 직전 운영 버전도 추가 보호한다. 재시도 시에는 `haetteum-shared/previous-release` 기록으로 이전 버전을 보존한다.
- 배포가 생성한 `YYYYMMDDTHHMMSSZ-<40자리 SHA>.dump` 백업은 최근 3개를 보존한다. 수동 백업 파일은 대상에서 제외한다. 새 백업의 pg_dump와 pg_restore 검증이 끝나면 migration 전에 정리하여 이후 배포가 실패해도 개수를 제한한다. 미완성 백업은 `.partial`에 저장하고 실패 시 삭제한다. 강제 종료(SIGKILL)로 남은 `.partial`이나 변경 적용 전 실패 백업은 별도로 점검한다.
- 성공한 배포의 archive와 checksum은 삭제한다. 다음 CI 전송 전에는 incoming에서 48시간 넘은 `release-<40자리 SHA>.tar.gz`와 checksum을 정리한다. 시간 기준 정리는 배포 시 실행되며 별도 예약 작업은 아니다.
- 실패한 시도에서 새로 만든 릴리스는 운영에서 사용하지 않고 복구 실패도 없을 때 삭제한다. 기존 릴리스나 복구 상태가 불확실한 파일은 보존한다.
- 릴리스 정리는 배포 lock 아래에서 수행하고, 40자리 SHA 디렉터리만 대상으로 삼는다. 심볼릭 링크와 수동 디렉터리, uploads와 환경파일은 삭제하지 않는다.

CI는 기존 activator로 배포한 뒤 새로 검증된 릴리스의 정리 스크립트도 실행하므로 이 변경을 포함한 첫 성공 배포부터 적용된다. 공간 부족으로 첫 배포가 실패하면 자동 정리 단계까지 도달하지 못하므로 기존 파일을 점검하거나 디스크를 확장해야 한다. pnpm 캐시 정리만으로 충분한 공간이 확보된다고 가정하지 않는다. 이 정책은 릴리스/전송 파일/배포 DB 백업에 대한 것이며 애플리케이션 로그와 uploads에는 별도 용량 관리가 필요하다.
