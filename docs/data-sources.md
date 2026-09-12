# 화면별 데이터 원천 정리

확인일: 2026-09-12

현재 작업 디렉터리의 코드를 기준으로 정리했다. 범위는 홈/탐색 화면과 여기서 연결되는 장소 상세·코스 기능이다. 운영 DB의 실제 적재 내역이나 외부 제공자의 최신 응답을 조회한 문서는 아니다. 아래의 원천은 코드에 구현된 수집·조회 경로를 의미한다.

## 1. 화면 영역별 요약

| 화면 / 영역 | 사용하는 데이터 | 원천 | 앱으로 들어오는 경로 / 가공 |
| --- | --- | --- | --- |
| 추천 탭 — 지금 만날 수 있는 축제 | 축제명, 이미지, 일정, 주소, 진행 상태, 순번 | 한국관광공사 TourAPI → 자체 DB `Festival` | `GET /festivals/discovery`의 `ranking`. 일정 기준으로 서버에서 순번 부여 |
| 추천 탭 — 이번 주 가볼만한 곳 | 장소명, 대표 이미지, 주소 | 한국관광공사 TourAPI → 자체 DB `Place` | `GET /places/recommendations/weekly` → 토·일 배치에서 준비·검증하고 월요일 공개한 전국 최대 20곳 |
| 추천 탭 — 코스 추천 배너 | 배너 이미지 / 시작 장소 / 주변 경유지 | 정적 이미지 / 데이터랩 순위에 연결된 장소 / Kakao Local | 순위 목록에서 시작 장소를 무작위 선택한 뒤 장소별 코스 API 호출 |
| 인기 관광지 영역 (`places` 탭) | 순위, 관광지명, 분류, 비중 | 한국관광공사 관광 데이터랩 CSV → `PlaceRanking` | `GET /place-rankings?audience=…&limit=10`, 해당 세대의 최신 적재 기간 사용 |
| 핫플레이스 영역 (`places` 탭) | 순위, 장소명, 분류, 시도·시군구, 증가율 | 한국관광공사 관광 데이터랩 CSV → `HotPlaceRanking` | `GET /hot-place-rankings?audience=…&limit=10`, 해당 세대의 최신 적재 기간 사용 |
| 축제 탭 — 지역별 목록 | 축제명, 일정, 이미지, 주소, 분류 | TourAPI → `Festival` | `GET /festivals/discovery?region=…&page=1&pageSize=20`. 받은 목록을 프런트에서 시작일 순으로 정렬 |
| 추천 탭 — 검색 결과 | 장소명, 주소, 이미지 | TourAPI → `Place` | `GET /places?region=…&q=…&page=1&pageSize=20`. DB의 이름·주소 부분 문자열 검색 |
| 장소 상세 — 기본 정보 | 이름, 설명, 주소, 좌표, 연락처, 홈페이지, 운영 정보, 사진 | TourAPI → `Place`, 연결 이미지·상세정보 | `PlacesService.detail()`이 저장된 데이터를 조합 |
| 장소 상세 — 주변 장소 | 주변 관광지·문화시설, 음식점, 카페, 거리, 카카오 장소 링크 | Kakao Local | 저장된 중심 장소 좌표로 카테고리 검색 후 중복 제거·거리순 정렬 |

화면 노출 여부의 기준은 `discovery-model.ts`의 `selectDiscoveryView()`다. 홈의 테마여행과 인기영상 영역은 제거했다. 탐색 화면의 인기 릴스는 별도 기능으로 유지하며, `/reels/[videoId]`에서 사용하는 로컬 영상 데이터는 `reels.mock.ts`로 분리했다.

## 2. 이번 주 가볼만한 곳 — 항목별 상세

| 카드의 항목 | 프런트 필드 / 처리 | DB / 원천 필드 |
| --- | --- | --- |
| 장소 이름 | `place.title` | `Place.title` ← TourAPI `title` |
| 대표 이미지 | 준비된 자체 썸네일 URL을 허용된 저장소 경로에서 직접 표시 | TourAPI Type1 이미지 → 배치 검증·WebP 변환 → 영속 저장소 |
| 주소 | `place.address`, 없으면 `place.district`, 둘 다 없으면 안내 문구 | `Place.address1` + `Place.address2` ← TourAPI `addr1`, `addr2`. district는 연결된 행정구역 이름 |
| ‘이번 주 추천’ 문구 | 컴포넌트에 작성된 고정 문구 | 외부 데이터 필드 없음 |
| 클릭 시 상세 경로 | `/places/{place.id}?tab=introduction` | 자체 DB 장소 UUID. TourAPI의 `contentid`와 구분 |
| 2열 배치 / 정사각형 이미지 | `grid-cols-2`, `aspect-square`, `object-cover` | 현재 화면 비율에 맞춘 480×480 WebP. 첫 두 장 우선 로딩 |

### 추천 대상을 고르는 방식

1. 전국 17개 시·도에서 수집한 관광지 전체가 후보 집합이다. 화면의 선택 지역에 종속되지 않는다.
2. 토요일 06시에 최근 4주 추천을 제외하고 지역·유형 균형을 고려하여 최대 60곳을 준비한다(최대 120곳 시도).
3. 일요일 06시에 원천 정보·운영 정보·이미지·중복을 자동검증하고 실패 후보를 교체한다.
4. 월요일 00시에 검증된 후보에서 20곳과 순서를 DB 트랜잭션으로 확정한다. 최소 5개 지역·2개 유형, 지역당 최대 4곳·유형당 최대 10곳을 적용한다.
5. 같은 주에는 결과를 유지하며, 비노출 장소는 즉시 숨기고 매일 08시 예비 후보로 교체를 시도한다. 준비 실패 시 이전 공개 묶음을 유지한다.
6. 프런트는 확정된 카드만 조회한다. 지역별 첫 100개 조회·프런트 해시·7일 fetch 캐시는 제거했다.

장소 정보의 원천은 TourAPI, 선정과 공개 기준은 앱 자체 배치다. 외부 인기 순위나 개인화 점수는 사용하지 않는다. 운영 정보가 불명확하면 UNKNOWN으로 기록하며 정상 운영을 보장하지 않는다.

근거: [주간 배치 서비스](../apps/api/src/weekly-recommendations/weekly-recommendations.service.ts), [균형 선정](../apps/api/src/weekly-recommendations/weekly-selection.ts), [프런트 조회](../apps/web/src/features/places/weekly-places.ts), [썸네일 처리](../apps/api/src/weekly-recommendations/weekly-thumbnail.service.ts). 일정·검증 제한·설정·복구 절차는 [주간 추천 운영 안내](weekly-recommendations.md) 참조.

## 3. 축제의 순번과 데이터 원천

축제 수집은 TourAPI `searchFestival2`를 사용한다. DB에 저장된 축제 데이터를 서비스 API가 조회하므로, 사용자의 화면 요청마다 TourAPI를 직접 호출하는 구조는 아니다.

상단 `ranking`은 전체 지역을 대상으로 다음 순서로 최대 5개를 구성한다.

- 진행 중인 축제: 종료일이 가까운 순서.
- 이어서 시작 예정 축제: 시작일이 가까운 순서.
- 같은 날짜에서는 외부 ID로 정렬하고, 최종 배열에 1부터 순번을 붙인다.

따라서 이 순번은 관람객 수·조회 수·인기도 통계 순위가 아니다. 지역 필터는 아래 `items` 목록에 적용되고 상단 `ranking`에는 적용되지 않는다. 진행 상태와 날짜 표시 문구도 저장된 일정에 기반해 앱이 계산·포맷한다.

근거: [축제 조회·정렬](../apps/api/src/festivals/festivals.service.ts), [프런트 API 변환](../apps/web/src/features/festivals/festival-discovery-api.ts), [TourAPI 호출](../apps/api/src/tourism/tour-api.client.ts), [축제 수집](../apps/api/src/tourism/festival-sync.service.ts).

## 4. 관광지 순위와 핫플레이스

두 순위 모두 코드상 원천 식별자는 `KTO_DATALAB`이며, CSV 가져오기 기능으로 DB에 적재한다. 화면 조회 시 데이터랩을 실시간 호출하지 않는다.

| 데이터 | 인기 관광지 | 핫플레이스 |
| --- | --- | --- |
| 이름 / 분류 | `sourcePlaceName`, `sourceCategory` | `sourcePlaceName`, `sourceCategory` |
| 순위 | CSV에서 적재한 `rank` | CSV에서 적재한 `rank` |
| 수치 | `sharePercent` | `growthPercent` |
| 기간 | 해당 세대의 가장 최근 `periodEnd`, `periodStart` | 해당 세대의 가장 최근 `periodEnd`, `periodStart` |
| 상세 이동용 장소 | 연결된 `placeId` | 연결된 `placeId` |
| 이미지 | 순위 DB 행의 `primaryImageUrl` 등 별도 보강 필드 | 순위 DB 행의 `primaryImageUrl` 등 별도 보강 필드 |

화면에서는 현재 상위 10개 항목 안에서 사진이 있는 장소를 먼저 표시하고, 각 그룹 안에서는 원본 순위 순서를 유지한다. 로딩 실패 사진은 제거하고 해당 항목을 사진 없는 그룹으로 이동한다. 배지의 순위·통계 수치는 데이터랩 원본을 유지하며 ‘사진 있는 장소 먼저 · 순위는 데이터랩 기준’으로 안내한다.

순위 수치와 사진의 출처는 구분해야 한다. 사진은 수집 배치가 DB에 저장한 장소 이미지에서 채운다. 랭킹 적재·보강에서는 TourAPI 키워드 검색을 호출하지 않는다. 실제 개별 사진의 출처·표기는 저장된 URL과 `imageAttribution`, `imageAttributionUrl`, `imageCopyrightType`을 확인해야 한다. 현재 운영 데이터의 CSV 파일명·집계 기간·개별 이미지 출처는 이 문서에서 확인하지 않았다.

근거: [인기 관광지 조회](../apps/api/src/place-rankings/place-rankings.service.ts), [인기 관광지 CSV 적재](../apps/api/src/place-rankings/place-ranking-import.service.ts), [핫플레이스 조회](../apps/api/src/hot-place-rankings/hot-place-rankings.service.ts), [핫플레이스 CSV 적재](../apps/api/src/hot-place-rankings/hot-place-ranking-import.service.ts).

## 5. 사진과 정적 콘텐츠

주간 추천 카드는 검증·변환된 자체 썸네일만 사용한다. 인기 관광지·핫플레이스 순위와 검색 결과는 `resolvePlacePhotoSource()`를 사용하며 공통 대체 이미지를 넣지 않는다. 사진이 없거나 로딩에 실패해도 장소 정보는 유지한다. 검색 결과의 포함 여부와 순서는 사진 유무로 바꾸지 않는다. 이 URL 허용 검사는 사진 내용과 장소의 의미상 일치를 보증하는 검증은 아니다.

아래 내용은 그 외 `resolveOfficialImageSource()`를 거치는 카드에 해당한다. 해당 카드에서는 `tong.visitkorea.or.kr`와 `upload.wikimedia.org` 호스트를 허용한다. URL이 없거나 허용되지 않으면 앱의 `/images/explore/categories/popular-attraction.png`를 사용한다. 이미지 로딩 자체가 실패하면 `FestivalRemoteImage`가 아이콘과 배경으로 대체한다.

따라서 화면의 모든 이미지가 특정 장소의 실제 원본 사진이라고 단정할 수 없다. 기본 이미지와 실패 대체 표시가 존재한다. 이 규칙은 해당 유틸리티와 컴포넌트를 사용하는 이미지에 대한 설명이다.

코스 배너 이미지는 `/images/discovery/reference-main/ai-course-robot.png`라는 정적 파일이다. 배너를 눌렀을 때의 추천 결과는 정적 이미지와 별개로 관광지·핫플레이스 순위 후보 및 Kakao Local 기반 코스 생성에서 온다.

`mainDiscoveryMock`라는 이름의 객체가 기본 구조로 사용되지만, 실제 표시되는 축제 데이터는 `loadFestivalDiscovery()` 결과로 덮어쓴다. 주간 장소와 관광지·핫플레이스 순위도 별도 API에서 읽는다. 이 객체 이름만 보고 홈 전체가 목업이라고 판단하면 안 된다.

근거: [이미지 허용 및 대체 규칙](../apps/web/src/lib/official-image.ts), [이미지 로딩 실패 처리](../apps/web/src/components/travel/festival-remote-image.tsx), [홈 데이터 조합](../apps/web/src/features/discovery/discovery-content.tsx), [정적 데이터](../apps/web/src/features/discovery/main-discovery.mock.ts), [코스 추천 흐름](../apps/web/src/features/places/use-random-course-recommendation.ts), [Kakao 기반 코스 구성](../apps/api/src/places/place-course-builder.service.ts).

축제 상세도 배치가 `Festival.detailSnapshot`에 저장한 상세·이미지를 조회하며, 캐시 누락 시 외부 호출 없이 기본 정보만 제공한다. 호출 정책은 [TourAPI 호출 규칙](tourapi-calls.md)을 따른다.

## 6. 유지보수 시 확인할 위치

| 확인 목적 | 코드 |
| --- | --- |
| 어떤 탭에 어떤 영역이 나오는가 | [discovery-model.ts](../apps/web/src/features/discovery/discovery-model.ts), [main-discovery.tsx](../apps/web/src/components/patterns/main-discovery.tsx) |
| 홈의 API와 정적 데이터 조합 | [discovery-content.tsx](../apps/web/src/features/discovery/discovery-content.tsx) |
| 원천 API 필드 → DB 필드 | [tour-api.mapper.ts](../apps/api/src/tourism/tour-api.mapper.ts) |
| 장소 기본·상세·주변 데이터 | [places.service.ts](../apps/api/src/places/places.service.ts) |
| 장소 주간 후보 지역과 응답 형식 | [places.ts](../packages/contracts/src/places.ts) |

데이터 원천이나 선정 기준이 바뀌면 이 문서도 함께 갱신한다. 특히 ‘추천’, ‘순위’라는 UI 문구와 실제 계산 기준을 구분해서 관리한다.
