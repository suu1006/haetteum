-- Kakao returns profile image URLs over http even though the Kakao CDN also
-- serves them over https. https-only consumers (next/image remotePatterns,
-- isAllowedKakaoProfileImageUrl) reject the http form, so upgrade existing rows.
UPDATE "users"
SET "profile_image_url" = 'https://' || substring("profile_image_url" FROM 8),
    "updated_at" = now()
WHERE "profile_image_url" LIKE 'http://kakaocdn.net/%'
   OR "profile_image_url" LIKE 'http://%.kakaocdn.net/%';
