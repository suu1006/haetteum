# 전국 주간 추천 운영 안내

구현 기준: 2026-09-12. 화면의 지역 선택과 무관한 전국 20곳 추천.

## 실행 흐름 (Asia/Seoul)

| 일정 | 실행 | 저장 결과 |
| --- | --- | --- |
| 토요일 06:00 | `prepare` | 전체 적격 장소에서 지역·유형별 후보를 정렬하고 최대 60곳의 이미지와 카드 준비 |
| 일요일 06:00 | `validate` | 원천 상세·운영 정보·이미지를 다시 조회하여 검증. 실패 후보 대신 예비 후보를 추가 검증 |
| 월요일 00:00 | `publish` | 최근 48시간 내 검증된 묶음에서 20곳 확정, 순서와 공개 상태를 하나의 DB 트랜잭션으로 저장 |
| 매일 08:00 | `repair` | 공개 이후 비노출된 장소를 검증된 예비 후보로 교체. 정상 카드의 순서 유지 |

후보 120곳까지 시도하여 최대 60곳을 준비한다. 검증 결과는 최소 25곳(공개 20 + 예비 5)이어야 하고, 최종 20곳은 최소 5개 지역·2개 유형을 포함해야 한다. 한 지역 최대 4곳, 한 유형 최대 10곳으로 제한한다. 숫자는 `weekly-selection.ts`, `weekly-recommendations.service.ts`에서 관리한다.

최근 4주에 공개된 장소는 제외한다. 장소 ID 중복과 동일 이름·약 100m 좌표 단위 중복을 제거한다. 주차와 장소 ID를 해시해 같은 후보 집합은 재시도해도 같은 선정 결과를 얻는다. 월요일 공개 후에는 다시 무작위 선정하지 않는다.

## 자동검증의 범위

- DB의 노출/지역 활성 상태, TourAPI 관광지 타입(12), 장소명·주소·국내 좌표·분류를 확인한다.
- `tourism-sync`가 저장한 상세 완료 버전과 원본 수정 시각이 일치하는 후보만 선정한다. 주간 추천에서는 TourAPI를 호출하지 않으며, 상세 미수집·이전 버전인 경우 수집 배치에서 먼저 보강한다. 썸네일 처리 실패만 제한적으로 재시도한다.
- 명확한 전체 휴업 문구 및 명시적인 연월일 운영 기간이 다음 주와 겹치지 않는 경우 제외한다.
- 운영 정보 미제공이나 해석할 수 없는 자연어는 `UNKNOWN`으로 기록한다. 정상 운영을 보장하는 것으로 처리하지 않는다. 자연어 휴업 공지 전체를 이해하는 LLM 검수는 포함하지 않는다.
- 실제 이미지 다운로드·디코딩·해상도·썸네일 변환·공개 URL GET/파일 해시/디코딩까지 검증한다.
- 상태, 검사 시각, 제외 사유, 카드 스냅샷을 `weekly_recommendation_candidates`에 보관한다.
- 사진의 의미상 장소 일치나 미적 크롭 품질까지 자동으로 보장하지 않는다.

분류는 TourAPI 신분류 중 확인된 자연(NA), 역사(HS), 문화(VE)를 자연/문화 두 유형으로 묶는다. 확인되지 않은 코드는 제외한다. 계절·실내외 선호 점수나 날씨 기반 추천은 현재 포함하지 않는다.

## 이미지 제공

현재 작업 중인 카드의 정사각형 비율에 맞춰 480×480 WebP를 배치에서 생성한다. Type1 출처만 가공하고, 원본은 `https://tong.visitkorea.or.kr`로 제한한다. 원천에 남아 있는 같은 공식 호스트의 HTTP 주소는 HTTPS로 승격한 뒤 동일한 검증을 수행한다. 요청·본문 8초 제한, 최대 8MiB, 입력 24MP, 최소 320×320 조건을 적용한다. 사용자 화면에는 한국관광공사 출처를 표시한다.

파일은 SHA-256 이름으로 영속 디렉터리에 원자적으로 기록하고, `/uploads/weekly` 경로에서 immutable 캐시 헤더로 제공한다. 웹은 이 주소의 준비된 WebP를 직접 표시하여 첫 화면 요청 시 이미지 최적화 작업을 하지 않는다. 첫 두 장만 eager/high, 나머지는 lazy다.

CDN은 코드에서 자동 생성하지 않는다. 설정 주소가 API 정적 파일 경로를 전달하도록 CDN/리버스 프록시를 연결할 수 있다. CDN이 이미지 바이트를 재가공하면 해시 검증에 실패한다. 여러 API 인스턴스는 같은 영속 볼륨을 사용해야 한다. 컨테이너 임시 파일시스템은 사용하지 않는다.

## 설정 및 첫 적용

API:

```dotenv
WEEKLY_RECOMMENDATIONS_ENABLED=true
WEEKLY_THUMBNAIL_PUBLIC_BASE_URL=https://media.example.com/uploads/weekly
WEEKLY_THUMBNAIL_DIR=/persistent/uploads/weekly
```

웹 (Next 빌드 시 필요):

```dotenv
NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL=https://media.example.com/uploads/weekly
```

TourAPI `END_POINT`, `SERVICE_KEY`와 기존 관광지 정기 동기화도 설정한다. API 배치 플래그 기본값은 false다.

1. `pnpm --filter @haetteum/api db:deploy`로 추천 테이블과 전국 17개 시·도 마이그레이션을 적용한다.
2. 기존 증분 커서만으로 새 지역의 과거 장소를 채울 수 없으므로 최초 한 번 전국 초기 수집을 실행한다.
3. `pnpm --filter @haetteum/api tourism:sync --mode=full`을 사용한다. 실제 명령 옵션은 [수집 CLI](../apps/api/src/tourism/tourism-sync.command.ts) 참조.
4. 영속 저장 디렉터리와 공개 URL 접근을 확인하고 웹/API 환경변수를 반영한다.
5. API 서버를 먼저 실행하여 썸네일 공개 URL에 접근할 수 있는지 확인한다. 최초 공개가 없다면 `pnpm --filter @haetteum/api weekly:run bootstrap`으로 이번 주 후보 준비 → 재검증 → 공개를 실행한다. 이미 공개된 묶음이 있으면 변경하지 않는다. 최소 후보 수·지역/유형 다양성·이미지 검증 조건은 정기 배치와 동일하다.
6. 배치 플래그를 켜면 정해진 토요일·일요일·월요일 일정으로 다음 묶음을 처리한다. 검증 단계는 이전에 실패한 후보도 다시 시도한다. 최초 공개 전 API는 `week:null, items:[]`를 반환한다.

로컬 기본 공개 주소는 API와 웹 양쪽 모두 `http://localhost:4000/uploads/weekly`로 맞춘다. 환경변수 변경 후 API와 웹을 재시작하고, 운영에서는 웹을 다시 빌드한다. CLI 실행 중에도 공개 URL을 제공하는 API 서버가 살아 있어야 한다.

주간 추천 명령은 저장된 DB 상세 조회·DB 쓰기·이미지 파일 다운로드를 수행하며 TourAPI 엔드포인트를 호출하지 않는다. 이 구현 작업에서는 운영 DB에 마이그레이션·전국 동기화·배치 활성화를 수행하지 않았다. 별도 임시 DB에 마이그레이션을 검증했다.

## 수동 실행과 복구

```sh
pnpm --filter @haetteum/api weekly:run prepare
pnpm --filter @haetteum/api weekly:run validate
pnpm --filter @haetteum/api weekly:run publish
pnpm --filter @haetteum/api weekly:run repair
```

prepare/validate는 실행 시점 기준 다음 주 월요일의 묶음을 대상으로 한다. publish/repair는 현재 주를 대상으로 한다. CLI는 다른 스케줄러를 켜지 않고 실행한다. 이미 공개된 묶음의 prepare/validate/publish는 결과를 다시 뽑지 않는다.

준비/검증이 실패하면 이전 공개 묶음을 유지한다. 비공개 장소는 요청 시 즉시 숨기므로 교체 배치 전에는 20개보다 적을 수 있다. 예비 후보 부족 시 정상 카드까지 변경하지 않고 실패 로그를 남긴다.

`weekly_failed` 구조화 로그를 운영 모니터링의 알림 대상으로 등록한다. 현재 구현은 로그 출력이며 이메일·Slack 등 외부 알림 전송 연동은 포함하지 않는다. 묶음의 `error_code`와 후보별 `reason/checks`로 원인을 확인한다. 재검증을 시작하면 VERIFIED를 먼저 해제하여 중간 실패 결과의 공개를 차단한다.

DB 만료 임대와 쓰기 시 토큰 확인으로 여러 서버의 동시 실행 및 만료된 실행자의 쓰기를 방지한다. 공개 트랜잭션이 실패하면 이전 공개 묶음과 순서가 유지된다.

## API

`GET /api/v1/places/recommendations/weekly`

```json
{"week":"2026-09-14","items":[]}
```

실제 `items`는 최대 20개의 장소 카드 스냅샷이다. 지역 필터·프런트 해시·후보 500개 조회·목록 전체 개수 집계를 하지 않는다. API는 `Cache-Control: no-store`, 프런트 fetch도 `no-store`를 사용해 월요일 공개 결과를 오래된 주간 캐시로 가리지 않는다.

## 로컬 장애 확인 (2026-09-12)

브라우저에서 빈 목록을 확인했다. 공개 묶음이 없고, 다음 주 준비도 후보 부족으로 실패한 상태였다. 미지원 분류의 후보 포함과 공식 HTTP 사진 주소 거부를 수정했고, 로컬 배치 활성화 및 웹 썸네일 주소를 설정했다. 최초 이번 주 공개용 `bootstrap` 명령을 추가했다.

실제 재생성 중 `detailCommon2`가 HTTP 429 및 원천 코드 22(일일 서비스 요청제한 횟수 초과)를 반환했다. 원천 재검증을 생략하지 않으므로 아직 이번 주 20곳 공개는 완료되지 않았다. 이 기록은 DB 전환 이전의 장애다. 전환 후에는 `tourism:sync -- --mode=enrich-pending`으로 상세를 먼저 준비한 뒤 API 서버가 실행된 상태에서 `weekly:run bootstrap`을 실행한다. 현재 호출 정책은 [TourAPI 호출 규칙](tourapi-calls.md)을 따른다.
