# 사용자 업로드 이미지의 WebP/bytea 저장

사용자가 승인한 설계: 후기 및 프로필의 신규 업로드를 MIME 검사 → Sharp 실제 디코딩 → 크기 제한/방향 보정 → WebP 변환 → PostgreSQL bytea 저장으로 전환한다.

- 입력 5 MiB, 최대 40,000,000 픽셀, 정적 JPEG/PNG/WebP. 프로필 HEIC/HEIF도 헤더 해상도를 먼저 검사하고 변환한다.
- 후기 긴 변 2,048px, 프로필 긴 변 512px, 확대 없이 비율 유지, WebP 품질 80. EXIF 등 메타데이터를 제거한다.
- uploaded_images: UUID id, owner_id FK, purpose, data bytea, width, height, byte_size, created_at. users.profile_image_id와 review_images.uploaded_image_id가 참조한다. 기존 URL 컬럼은 호환성을 위해 유지한다.
- GET /api/v1/images/:id는 image/webp 바이너리를 반환한다. JSON/base64로 반환하지 않는다. URL은 설정된 공개 origin에서 생성한다.
- 후기 입력 URL은 현재 사용자의 REVIEW 이미지인지 확인한다. 기존 후기의 기존 URL은 수정 시 유지 가능하다. 프로필 저장과 회원 연결은 트랜잭션으로 처리한다.
- 신규 파일은 디스크에 기록하지 않는다. 기존 디스크 파일과 URL은 유지한다. 원본 자동 이관과 범용 파일 GC는 이번 범위 밖이다.
- 운영 DB에 마이그레이션을 직접 실행하지 않는다. 별도 테스트 DB/스키마에서 검증한다. TourAPI 수집 경계는 변경하지 않는다.
