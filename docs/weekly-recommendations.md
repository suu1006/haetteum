# 전국 주간 추천 운영 안내

구현 기준: 2026-09-14. 지역 선택과 무관하게 전국 최대 20곳을 제공한다.

## 장소 단위 공개

`DRAFT`/`FAILED`는 배치 묶음의 진행 상태다. 조회 API는 묶음 상태 때문에 정상 카드를 숨기지 않는다. `prepare`에서도 아래 검증을 모두 마친 장소를 `PASSED`로 원자적으로 저장하며, 해당 주가 되면 즉시 조회 가능하다. 과거 `PREPARED` 및 구버전 검증 기록은 그대로 노출하지 않고 다시 검증한다.

20곳·예비 5곳·지역/유형 다양성은 공개 필수 조건이 아니다. 한 곳만 통과해도 공개한다. 지역/유형을 고르게 선정하되 후보가 부족하면 비율 제한을 완화한다. 동일 장소 ID와 이름·좌표 기반 중복은 계속 제외한다. 최근 4주에 추천되지 않은 장소를 우선하되 후보가 부족하면 이전 추천 장소도 다시 검증해 사용한다.

이번 주 후보를 먼저, 이전 주의 유효한 후보를 그다음에 사용한다. 미래 주 후보는 노출하지 않는다. 검증 기록의 유효기간은 7일이다. API는 저장된 PostgreSQL 데이터만 조회하며 외부 수집/이미지 다운로드를 하지 않는다. DB 자체가 불통이면 오류를 반환한다. 비노출 상태를 확인할 수 없는 메모리 캐시를 무조건 제공하지 않는다.

## 필수 검증과 신뢰 범위

- TourAPI 관광지(12), 활성 지역, 노출 상태, 이름·주소·국내 좌표·지원 분류 확인.
- 상세 수집 완료 버전과 원본 수정 버전 일치 확인. 조회 시에도 현재 버전과 검증 당시 버전을 비교한다.
- 명확한 휴폐업 또는 해당 주와 겹치지 않는 명시적 운영 기간은 제외. 누락·해석 불가능한 운영 정보는 `UNKNOWN`이며 정상 운영을 보장하지 않는다.
- 해당 장소에 저장된 공식 이미지 중 Type1만 사용. 공식 HTTP 주소는 HTTPS로 승격한다.
- 다운로드·디코딩·최소 320×320·이용 조건을 검사하고 480×480 WebP로 저장한다. 실제 공개 URL의 바이트 해시와 디코딩까지 확인한다.
- 새 정책의 `checks.policyVersion=2`, 정보/이미지 통과 기록, 원본 버전, 검사 시각이 있어야 조회된다. 만료·비노출·원본 변경·운영 기간 종료·잘못된 카드 데이터는 즉시 제외한다.

이 검증은 원천 정보의 현실 정확성이나 사진의 의미상 장소 일치를 100% 보장하지 않는다. 사진의 의미와 실제 운영 상태를 보장하려면 별도 사람 확인이 필요하다. 유효 카드가 0곳이면 검증 기준을 낮추지 않는다.

## 배치와 복구

- 토요일 06:00 KST: 다음 주 `prepare`.
- 일요일 06:00 KST: 다음 주 `validate`.
- 월요일 00:00 KST: 현재 주 `publish` (완료된 부분 묶음도 공개).
- 매일 08:00 KST: `repair`로 현재 주 준비·재검증·공개. 최초 공개가 없어도 수행한다. 20곳 미만이면 `weekly_supply_low` 구조화 로그를 남긴다.

예외가 발생하면 보유한 배치 잠금 안에서 `FAILED/BATCH_FAILED` 기록을 시도한다. 이미 성공한 카드 기록은 다른 후보의 예외로 취소하지 않는다. DB 장애로 실패 상태 저장조차 불가능한 경우 로그가 근거이며, 다음 정기 배치에서 재시도한다.

```sh
pnpm --filter @haetteum/api weekly:run repair
```

최초 상세가 준비되지 않았으면 먼저 정해진 `tourism-sync` 배치에서 수집한다. 특정 기존 후보는 `tourism:enrich -- --content-id=...`, 전체 미완료 상세는 `tourism:sync -- --mode=enrich-pending`을 사용한다. 모두 공통 호출 예산과 잠금을 따른다. 주간 추천은 TourAPI를 호출하지 않는다. [TourAPI 호출 규칙](tourapi-calls.md)을 따른다.

## 이미지 제공 및 환경 설정

API 서버가 실행 중이어야 이미지 공개 URL 검사가 성공한다. SHA-256 파일명, 영속 저장소, immutable 캐시를 사용한다. 여러 API 인스턴스는 같은 영속 볼륨을 공유해야 한다.

```dotenv
WEEKLY_RECOMMENDATIONS_ENABLED=true
WEEKLY_THUMBNAIL_PUBLIC_BASE_URL=http://localhost:4000/uploads/weekly
WEEKLY_THUMBNAIL_DIR=/persistent/uploads/weekly
NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL=http://localhost:4000/uploads/weekly
```

마지막 변수는 웹 빌드 설정이며 실제 공개 이미지 주소와 일치시킨다. 운영에서는 공개 HTTPS URL을 사용한다.

`GET /api/v1/places/recommendations/weekly`는 `{week, items}`를 반환한다. `week`는 첫 번째 유효 후보의 주차이며 이전 주 보충 카드가 섞일 수 있다. `Cache-Control: no-store`와 웹 `fetch`의 `no-store`를 유지한다.

## 2026-09-14 로컬 복구 확인

기존 `PREPARED` 후보 16곳을 공식 `tourism:enrich` CLI로 상세 수집한 뒤 `weekly:run repair`를 실행했다. 실제 API에서 16곳을 반환하고 홈 HTML에서 16곳의 제목 및 주간 추천 목록 렌더링을 확인했다. 이미지 16개 모두 공개 URL HTTP 성공, SHA-256 파일명 일치, 480×480 디코딩을 확인했다.

검증: 주간 추천 단위/HTTP 테스트 68개, 별도 임시 PostgreSQL 통합 테스트 5개, API 빌드, 변경 범위 ESLint 및 타입 검사 통과. 임시 테스트 DB는 종료 후 삭제했다. 실제 사진의 의미상 일치나 현장 운영 상태를 사람이 확인한 결과는 아니다.

## 2026-09-15 운영 복구

운영 API가 `{ "week": null, "items": [] }`를 반환했다. 운영 DB의 추천 묶음과 후보는 모두 0건이었으며, `WEEKLY_RECOMMENDATIONS_ENABLED`와 이미지 공개 URL/저장 경로 설정이 없었다. 기존 TourAPI 관광지 4,597건 중 상세 수집 기록이 있는 장소는 209건이었다.

- 서버 전용 `api.env`에 주간 추천 활성화, `https://haetteum.kr/uploads/weekly`, 기존 영속 uploads 아래의 weekly 저장 경로를 설정하고 API를 재시작했다.
- nginx에 `/uploads/weekly/` → API 4000 포트의 동일 경로를 추가했다. 수정 전 동일 이미지가 내부 200/공개 404였고, 설정 검사 후 reload했다. 기존 nginx 설정은 서버에 백업했다.
- 배포된 `weekly-recommendations.command.js repair`를 실행했다. 추가 TourAPI 수집 없이 저장된 상세로 검증했다.
- 운영 API에서 2026-09-14 주차 20곳과 이미지 20개 모두 HTTP 200 및 WebP 응답을 확인했다. 운영 홈 HTML에서도 추천 카드 렌더링을 확인했다.

재배포 시 서버 전용 환경파일과 영속 uploads 경로를 보존하고, nginx의 주간 이미지 경로를 유지한다. API health뿐 아니라 주간 추천 건수와 공개 이미지 응답도 확인한다.

### 웹 이미지 누락 후속 복구

직접 이미지 URL의 200 응답만으로 화면 표시까지 검증할 수 없었다. 웹의 `NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL`도 누락되어 `resolveWeeklyThumbnail`이 null을 반환했다. 배포 버전은 서버 컴포넌트에서 이 환경변수를 실행 시 읽으므로 서버 전용 `web.env`에 공개 주소를 추가하고 웹을 재시작했다. 브라우저에서 실제 이미지 요소의 480px 디코딩과 카드 사진 표시를 확인했다.

현재 소스는 클라이언트 컴포넌트에서도 해당 값을 사용하므로 다음 빌드부터 반드시 값을 주입하도록 배포 workflow에도 공개 주소를 추가했다. `NEXT_PUBLIC_` 값은 빌드 시 포함되므로 이후 버전은 실행 환경변수만 변경해서 해결할 수 있다고 가정하지 않는다.
