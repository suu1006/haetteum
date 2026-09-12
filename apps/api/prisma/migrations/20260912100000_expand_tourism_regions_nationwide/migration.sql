-- Ingestion covers all 17 provinces. Preserve existing IDs and the first five display orders.
-- provider_code is TourAPI's legal district lDongRegnCd (Gangwon 51, Jeonbuk 52),
-- not the legacy areaCode used by keyword search.
INSERT INTO "tourism_regions"
    ("id", "slug", "name", "provider_code", "display_order", "is_active", "created_at", "updated_at")
VALUES
    ('00000000-0000-4000-8000-000000000011', 'seoul', '서울', '11', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000041', 'gyeonggi', '경기', '41', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000051', 'gangwon', '강원', '51', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000026', 'busan', '부산', '26', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000050', 'jeju', '제주', '50', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000027', 'daegu', '대구', '27', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000028', 'incheon', '인천', '28', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000029', 'gwangju', '광주', '29', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000030', 'daejeon', '대전', '30', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000031', 'ulsan', '울산', '31', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000036', 'sejong', '세종', '36', 11, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000043', 'chungbuk', '충북', '43', 12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000044', 'chungnam', '충남', '44', 13, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000052', 'jeonbuk', '전북', '52', 14, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000046', 'jeonnam', '전남', '46', 15, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000047', 'gyeongbuk', '경북', '47', 16, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000048', 'gyeongnam', '경남', '48', 17, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("provider_code") DO UPDATE SET
    "slug" = EXCLUDED."slug",
    "name" = EXCLUDED."name",
    "display_order" = EXCLUDED."display_order",
    "is_active" = true,
    "updated_at" = CURRENT_TIMESTAMP;
