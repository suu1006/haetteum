# Haetteum 관광 데이터 ERD

**상태:** Active
**마지막 검증:** 2026-08-25
**구현 기준:** `20260825170000_add_place_rankings`

이 문서는 Haetteum 관광 데이터베이스의 관계와 구현 상태를 빠르게 확인하기 위한
ERD 기준 문서다. 데이터베이스 변경 시 Prisma schema, migration과 이 문서를 같은
작업에서 갱신한다.

## 기준 파일

- [Prisma schema](../apps/api/prisma/schema.prisma)
- [첫 관광 데이터 migration](../apps/api/prisma/migrations/20260821000000_add_tourism_place_foundation/migration.sql)
- [테이블·컬럼 comment migration](../apps/api/prisma/migrations/20260822000000_add_tourism_database_comments/migration.sql)
- [시군구 지역 범위 unique migration](../apps/api/prisma/migrations/20260824135934_scope_tourism_district_provider_code/migration.sql)
- [축제 기본 정보 migration](../apps/api/prisma/migrations/20260825000000_add_festivals/migration.sql)
- [세대별 인기관광지 순위 migration](../apps/api/prisma/migrations/20260825170000_add_place_rankings/migration.sql)
- [관광지 데이터베이스 설계](superpowers/specs/2026-08-21-tourism-place-database-design.md)

## 상태 구분

| 상태 | 의미 |
|---|---|
| ✅ 구현됨 | Prisma model과 적용 가능한 migration이 존재한다. |
| 🧭 확장 예정 | 설계 방향만 있으며 아직 Prisma model이나 migration이 없다. |

## 1. 현재 구현 ERD

아래 여섯 entity가 현재 데이터베이스에 구현되어 있다.

| Entity | DB table | Table comment |
|---|---|---|
| `TourismRegion` | `tourism_regions` | Haetteum 서비스에서 노출하는 광역 관광 지역 |
| `TourismDistrict` | `tourism_districts` | TourAPI 법정동 시군구 코드와 광역 관광 지역의 관계 |
| `Place` | `places` | TourAPI에서 동기화한 관광지 기본 정보 |
| `TourismSyncRun` | `tourism_sync_runs` | 관광 데이터 전체 또는 증분 동기화 실행 이력 |
| `PlaceRanking` | `place_rankings` | 한국관광 데이터랩 공식 다운로드에서 적재한 기간·대상별 인기관광지 순위 |
| `Festival` | `festivals` | TourAPI에서 동기화한 축제 기본 정보 |

```mermaid
erDiagram
    TourismRegion ||--o{ TourismDistrict : contains
    TourismRegion ||--o{ Place : groups
    TourismDistrict o|--o{ Place : locates
    Place o|--o{ PlaceRanking : resolves

    TourismRegion {
        uuid id PK "Haetteum 내부 관광 지역 식별자"
        string slug UK "웹과 API에서 사용하는 안정적인 영문 지역 식별자"
        string name "사용자에게 표시하는 지역명"
        string providerCode UK "TourAPI 법정동 시도 코드"
        int displayOrder "메인 화면 지역 필터 표시 순서"
        boolean isActive "서비스에서 지역을 노출할지 여부"
        datetime createdAt "내부 레코드 생성 시각"
        datetime updatedAt "내부 레코드 최종 수정 시각"
    }

    TourismDistrict {
        uuid id PK "Haetteum 내부 시군구 식별자"
        uuid regionId FK "소속 광역 관광 지역 식별자"
        string providerCode "TourAPI 법정동 시군구 코드; regionId와 복합 unique"
        string name "사용자에게 표시하는 시군구명"
        boolean isActive "서비스에서 시군구를 사용할지 여부"
        datetime createdAt "내부 레코드 생성 시각"
        datetime updatedAt "내부 레코드 최종 수정 시각"
    }

    Place {
        uuid id PK "Haetteum 내부 관광지 식별자"
        string source "관광지 원본 provider 식별자"
        string externalId "provider가 부여한 관광지 식별자"
        int contentTypeId "TourAPI 콘텐츠 타입 ID"
        uuid regionId FK "소속 광역 관광 지역 식별자"
        uuid districtId FK "소속 시군구 식별자이며 제공되지 않으면 NULL"
        string title "관광지명"
        string address1 "기본 주소; nullable"
        string address2 "상세 주소; nullable"
        string zipcode "우편번호; nullable"
        decimal longitude "WGS84 경도; nullable"
        decimal latitude "WGS84 위도; nullable"
        int mapLevel "TourAPI 지도 확대 레벨; nullable"
        string category1 "TourAPI 신분류 대분류 코드; nullable"
        string category2 "TourAPI 신분류 중분류 코드; nullable"
        string category3 "TourAPI 신분류 소분류 코드; nullable"
        string telephone "관광지 안내 전화번호; nullable"
        string homepage "관광지 홈페이지 주소; nullable"
        string overview "관광지 소개 설명; nullable"
        string primaryImageUrl "대표 원본 이미지 URL; nullable"
        string primaryThumbnailUrl "대표 썸네일 이미지 URL; nullable"
        string imageCopyrightType "대표 이미지 공공누리 저작권 유형; nullable"
        datetime providerCreatedAt "provider 콘텐츠 최초 등록 시각; nullable"
        datetime providerModifiedAt "provider 콘텐츠 최종 수정 시각"
        boolean isVisible "서비스에서 관광지를 노출할지 여부"
        datetime lastSyncedAt "내부 DB에 마지막으로 정상 반영한 시각"
        datetime createdAt "내부 레코드 생성 시각"
        datetime updatedAt "내부 레코드 최종 수정 시각"
    }

    TourismSyncRun {
        uuid id PK "동기화 실행 식별자"
        string provider "동기화 대상 관광 데이터 provider"
        string jobType "전체 또는 증분 등 동기화 작업 유형"
        string status "동기화 실행 상태"
        datetime requestedFrom "증분 동기화 요청에 사용한 시작 기준 시각; nullable"
        datetime startedAt "동기화 실행 시작 시각"
        datetime finishedAt "동기화 실행 종료 시각; nullable"
        int fetchedCount "외부 provider에서 조회한 항목 수"
        int insertedCount "새로 저장한 항목 수"
        int updatedCount "기존 값을 갱신한 항목 수"
        int deactivatedCount "비표출 상태로 전환한 항목 수"
        int failedCount "처리에 실패한 항목 수"
        string errorSummary "비밀정보를 제외한 오류 요약; nullable"
    }

    PlaceRanking {
        uuid id PK "Haetteum 내부 순위 레코드 식별자"
        string source "순위 원본 provider 식별자"
        string scope "전국 등 순위 집계 범위"
        string sourcePlaceId "데이터랩 관광지 식별자"
        string sourcePlaceName "데이터랩 관광지명"
        string sourceCategory "데이터랩 관광지 구분"
        string audience "전체 또는 세대별 집계 대상"
        date periodStart "순위 집계 시작일"
        date periodEnd "순위 집계 종료일"
        int rank "집계 범위 안의 원본 순위"
        decimal sharePercent "데이터랩 원본 비율의 퍼센트 값"
        uuid placeId FK "매칭된 Haetteum 관광지 식별자; nullable"
        string sourceFileName "감사 가능한 원본 CSV 파일명"
        datetime importedAt "순위 스냅샷 적재 시각"
        datetime createdAt "내부 레코드 생성 시각"
        datetime updatedAt "내부 레코드 최종 수정 시각"
    }

    Festival {
        uuid id PK "Haetteum 내부 축제 식별자"
        string source "축제 원본 provider 식별자"
        string externalId "provider가 부여한 축제 식별자"
        int contentTypeId "TourAPI 콘텐츠 타입 ID"
        string title "축제명"
        date eventStartDate "축제 시작일"
        date eventEndDate "축제 종료일"
        string providerRegionCode "TourAPI 법정동 시도 코드; nullable"
        string providerDistrictCode "TourAPI 법정동 시군구 코드; nullable"
        string address1 "기본 주소; nullable"
        string address2 "상세 주소; nullable"
        string zipcode "우편번호; nullable"
        decimal longitude "WGS84 경도; nullable"
        decimal latitude "WGS84 위도; nullable"
        int mapLevel "TourAPI 지도 확대 레벨; nullable"
        string category1 "TourAPI 신분류 대분류 코드; nullable"
        string category2 "TourAPI 신분류 중분류 코드; nullable"
        string category3 "TourAPI 신분류 소분류 코드; nullable"
        string telephone "축제 안내 전화번호; nullable"
        string primaryImageUrl "대표 원본 이미지 URL; nullable"
        string primaryThumbnailUrl "대표 썸네일 이미지 URL; nullable"
        string imageCopyrightType "대표 이미지 공공누리 저작권 유형; nullable"
        datetime providerCreatedAt "provider 콘텐츠 최초 등록 시각; nullable"
        datetime providerModifiedAt "provider 콘텐츠 최종 수정 시각"
        datetime lastSyncedAt "내부 DB에 마지막으로 정상 반영한 시각"
        datetime createdAt "내부 레코드 생성 시각"
        datetime updatedAt "내부 레코드 최종 수정 시각"
    }
```

### 현재 관계와 제약

| 관계·제약 | 현재 동작 |
|---|---|
| `TourismRegion 1:N TourismDistrict` | 지역을 삭제할 때 소속 시군구가 있으면 삭제를 거부한다. |
| `TourismDistrict (regionId, providerCode)` | TourAPI 시군구 코드는 시도 내부 코드이므로 지역과 함께 복합 unique로 식별한다. |
| `TourismRegion 1:N Place` | 지역을 삭제할 때 소속 관광지가 있으면 삭제를 거부한다. |
| `TourismDistrict 0..1:N Place` | 관광지는 시군구 없이 저장할 수 있다. 시군구가 삭제되면 `districtId`는 `null`이 된다. |
| `Place (source, externalId)` | 같은 provider 관광지의 중복 저장을 거부하는 복합 unique 제약이다. |
| `Place isVisible` | TourAPI 비표출은 물리 삭제가 아니라 `false`로 보존한다. |
| `TourismSyncRun` | 현재 다른 테이블을 참조하는 FK가 없는 독립 실행 이력이다. |
| `Place 0..1:N PlaceRanking` | 데이터랩 관광지명이 단일 `Place.title`과 정확히 일치할 때만 연결한다. 연결된 관광지가 삭제되면 `placeId`는 `null`이 된다. |
| `PlaceRanking` snapshot rank | `(source, scope, periodStart, periodEnd, audience, rank)` 복합 unique로 같은 스냅샷의 연령대별 순위 중복을 거부한다. |
| `PlaceRanking` snapshot source id | `(source, scope, periodStart, periodEnd, audience, sourcePlaceId)` 복합 unique로 같은 스냅샷의 연령대별 원본 관광지 중복을 거부한다. |
| `PlaceRanking` lookup index | `(source, scope, audience, periodEnd, rank)`로 최신 스냅샷 상위 순위 조회를 지원한다. |
| `Festival` | 현재 다른 테이블을 참조하는 FK가 없는 독립 축제 기본 정보다. |
| `Festival (source, externalId)` | 같은 provider 축제의 중복 저장을 거부하는 복합 unique 제약이다. |
| `Festival` lookup indexes | `(eventStartDate, eventEndDate)`, `(providerRegionCode, eventStartDate)`, `providerModifiedAt` 조회 index를 가진다. |

### 현재 기준 지역

| slug | 표시명 | TourAPI 법정동 시도 코드 |
|---|---|---|
| `seoul` | 서울 | `11` |
| `gyeonggi` | 경기 | `41` |
| `gangwon` | 강원 | `51` |
| `busan` | 부산 | `26` |
| `jeju` | 제주 | `50` |

### 실 동기화 현황

2026-08-24에 TourAPI 전체 동기화를 연속 두 번 실행하고 증분 동기화를 한 번
실행했다. 두 번째 전체 동기화의 신규 행은 0건이었고 관광지 UUID는
보존됐다. 같은 KST 날짜의 증분 동기화는 변경 0건으로 성공했다.

| 지역 | 시군구 | 표출 관광지 |
|---|---:|---:|
| 서울 | 25 | 781 |
| 경기 | 55 | 1,555 |
| 강원 | 18 | 1,351 |
| 부산 | 16 | 352 |
| 제주 | 2 | 563 |
| **합계** | **116** | **4,602** |

동기화 후 `(source, externalId)` 중복, 잘못된 지역 FK, 서로 다른 지역의
`Place`와 `TourismDistrict` 연결, `contentTypeId != 12`, 빈 제목은 모두 0건으로
확인했다.

2026-08-25에 한국관광 데이터랩 공식 CSV 다운로드로 전국
`2025-08-01`~`2026-07-31` 순위 스냅샷 180행을 적재했다. 기존 `Place`와 정확히
매칭된 행은 57건, 미매칭으로 보존된 행은 123건이며, audience는 6종이다.
평점·후기 수는 이 ERD의 현재 구현 엔티티에 포함되지 않는다.

## 2. 관광지 상세 확장 ERD

아래 entity와 관계는 `20260826150000_add_place_details` migration으로 현재 Prisma
schema와 PostgreSQL에 구현되어 있다.

| Entity | 예정 table | Table comment |
|---|---|---|
| `PlaceImage` | `place_images` | 관광지별 복수 이미지와 저작권 정보 |
| `PlaceDetailInfo` | `place_detail_infos` | TourAPI 관광지 반복 상세정보 |

```mermaid
erDiagram
    Place ||--o{ PlaceImage : has
    Place ||--o{ PlaceDetailInfo : has

    PlaceImage {
        uuid id PK "Haetteum 내부 관광지 이미지 식별자"
        uuid placeId FK "이미지가 속한 관광지 식별자"
        string externalSerial "provider 이미지 일련번호"
        string originalUrl "원본 이미지 URL"
        string thumbnailUrl "썸네일 이미지 URL; nullable"
        string copyrightType "이미지 공공누리 저작권 유형"
        string name "provider가 제공한 이미지명; nullable"
        int displayOrder "관광지 상세 화면 이미지 표시 순서"
    }

    PlaceDetailInfo {
        uuid id PK "Haetteum 내부 반복 상세정보 식별자"
        uuid placeId FK "상세정보가 속한 관광지 식별자"
        string serialNumber "provider 상세정보 일련번호"
        string name "상세정보 이름"
        string text "상세정보 본문"
        int displayOrder "상세 화면 표시 순서"
    }

```

### 구현 원칙

- `PlaceImage`와 `PlaceDetailInfo`는 한 관광지 단위 transaction으로 교체한다.
- 후기 평점과 후기 수는 관광지 원본 데이터가 아니므로 후기 도메인에서 별도로
  집계한다.

## 3. ERD 갱신 규칙

1. Prisma model이나 관계를 변경하면 같은 변경에서 현재 구현 ERD를 갱신한다.
2. migration을 추가하면 문서 상단의 구현 기준과 마지막 검증일을 갱신한다.
3. 구현되지 않은 entity는 현재 구현 ERD에 넣지 않는다.
4. relation의 `onDelete`, nullable 여부와 unique 제약을 반드시 문서에 반영한다.
5. `prisma validate`, migration drift 검사와 실제 DB 관계 테스트 후 문서 상태를
   최신으로 표시한다.
