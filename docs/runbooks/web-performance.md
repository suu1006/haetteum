# 웹 성능 운영 점검

## HTTP/2 (운영 nginx 반영 필요)

웹은 standalone Next 서버 3000, API는 4000이며 TLS는 기존 nginx가 종료한다. 저장소에 운영 nginx 설정/인증서와 서버 접근 정보는 없다. 앱 next.config로 HTTP/2를 켤 수 없다.

1. 운영 호스트에서 `nginx -v`, `nginx -V`, `sudo nginx -T`로 버전, http_v2 모듈, haetteum.kr의 443 server 블록을 확인한다. 전체 설정 출력은 비공개로 다룬다.
2. 기존 파일을 백업하고 해당 TLS server 블록만 변경한다. 1.25.1 이상은 기존 `listen 443 ssl;` 아래 `http2 on;`을 추가한다. 이전 버전은 `listen 443 ssl http2;`를 사용한다. IPv6 listen이 있다면 함께 확인한다. 인증서, upstream, 업로드, API 프록시, 타임아웃은 유지한다.
3. `sudo nginx -t` 성공 후 `sudo systemctl reload nginx`를 실행한다. 실패하면 백업을 복원한다.
4. HTTP/2 지원 curl에서 `curl --http2 -I https://haetteum.kr`의 HTTP/2 응답과 Chrome Network Protocol 열의 h2를 확인한다. nginx 앞에 다른 TLS 프록시가 있다면 그 장비의 ALPN도 확인한다.
5. Lighthouse 홈/탐색 재측정. HTTP/3는 이번 변경의 필수 조건이 아니다.

## Web Vitals

프로덕션 탐색의 10%를 페이지 단위로 샘플링한다. `/web-vitals` POST는 2KiB 이하의 TTFB/FCP/LCP/INP/CLS, 점수/등급/metric id/정규화된 경로만 허용한다. 사용자·세션 식별자, 검색어, 원본 URL, PerformanceEntry는 전송/기록하지 않는다. 동적 경로의 ID는 `:id`로 치환한다. 기존 PM2 웹 stdout에서 `event:"web-vital"` JSON을 수집할 수 있다. 미리보기는 클릭 시에만 재생하며 화면 밖으로 나가면 해제한다. 로그에 쌓이기 전에는 실사용 성능 개선을 주장할 수 없다.

분석할 때 metric id별 마지막 값으로 중복 제거하고 경로/지표별 p75를 집계한다. 날짜는 수집 로그 타임스탬프를 사용한다. 충분한 표본이 쌓인 뒤 LCP ≤2.5초, CLS ≤0.1, INP ≤200ms 목표와 비교한다. Navigation 기반 지표이며 SPA 이동별 독립 측정은 아니다. 수집 로그 저장/집계 대시보드는 기존 운영 로그 시스템에 연결해야 한다. 서버 접근 로그의 보존 정책은 별도로 관리한다.

## 재현 가능한 Lighthouse 검사

`scripts/performance/lighthouse.sh https://haetteum.kr artifacts/lighthouse/after`는 홈 모바일 3회, 홈 데스크톱 1회, 탐색 모바일 3회를 순차 실행한다. 첫 실행 시 pinned Lighthouse 13.4.1을 npx가 설치한다. 변경 전후 같은 Chrome/하드웨어/네트워크 조건으로 비교한다. 프로덕션 빌드로 검사하고 개발 서버 결과는 운영 결과와 비교하지 않는다.

## 캐시 경계

축제·핫플레이스·주간 추천은 Next 서버에서 최대 30초의 revalidation 정책을 사용한다. 재검증 동안 이전 응답을 제공할 수 있다. 사용자 세션은 private/no-store이고 보호된 `/auth/me`·로그아웃의 인증은 유지한다. 신규 프런트는 `/auth/session`을 사용하므로 API와 함께 배포한다. 데이터 조회 중 TourAPI 수집을 실행하지 않는다.

HTTP/2 공식 참조: https://nginx.org/en/docs/http/ngx_http_v2_module.html

인증 HTTP 회귀 검사: `node scripts/performance/auth-smoke.mjs http://localhost:4100/api/v1`. 실제 JSON null 직렬화와 private/no-store, 보호 API의 401을 확인한다.

## 주간 추천이 모두 기본 이미지로 나오는 경우

`NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL`은 주간 추천 이미지의 허용 주소다.
API가 반환하는 `primaryImageUrl`의 origin과 저장 경로에 맞춰 빌드 시 설정한다.
로컬 API는 `http://localhost:4000/uploads/weekly`, 운영 API는
`https://haetteum.kr/uploads/weekly`를 사용한다.

`.env.production`에 API 주소만 설정하면 `.env`의 로컬 썸네일 설정이 함께 적용될 수 있다.
운영 API로 로컬 프로덕션 빌드를 확인할 때도 두 값을 같은 환경 기준으로 설정한다.
`NEXT_PUBLIC_*` 값은 브라우저 번들에 포함되므로 환경파일 변경 후 웹을 다시 빌드하고 재시작한다.
이미지 파일의 HTTP 200만으로는 충분하지 않다. 추천 영역을 스크롤하며 실제 `img`의 로딩과
기본 이미지 대체 여부를 확인한다. 해결을 위해 이미지 허용 주소 검사를 제거하지 않는다.

## 축제 상세 이미지 응답 지연 (2026-09-17)

`FestivalGallery`는 허용된 한국관광공사(`tong.visitkorea.or.kr`) 이미지를 HTTPS로
정규화해 직접 표시한다. 첫 사진은 eager/high, 이후 사진은 lazy를 유지한다.
그 밖의 허용된 이미지 제공자는 기존 최적화를 사용하며, 미승인 URL이나 로딩 실패는
중립 플레이스홀더로 표시한다. 목록 이미지의 최적화 설정은 변경하지 않았다.

동일 클라이언트에서 두 경로를 번갈아 각 3회 요청한 결과:

| 사진 | 기존 1200px WebP 경로 | 공식 원본 직접 경로 | 원본 크기 |
| --- | --- | --- | --- |
| 세미원 수련문화제 | 1.19–1.27초 | 0.11–0.14초 | 206,140 bytes |
| 경복궁 별빛야행 | 0.96–1.08초 | 0.07–0.09초 | 96,104 bytes |

위 값은 `curl`의 요청 시작부터 다운로드 완료까지이며 LCP/실제 표시 시각이 아니다.
기존 경로는 운영 `/_next/image`의 캐시가 준비된 상태로, WebP를 포함한 Accept 헤더를
사용했다. 이전 캐시 MISS 측정은 약 2.2–2.3초였다. 로컬 수정 페이지에서 공식 URL로
직접 요청하고 사진이 표시되는 것을 브라우저로 확인했다. 운영 반영 후 모바일 첫 방문과
재방문의 LCP를 별도로 확인해야 한다.

직접 전송은 리사이즈/포맷 변환을 생략하므로 원본 용량이 큰 사진이나 느린 회선에서
불리할 수 있다. 이 경우 원본 크기와 실측 시간을 함께 확인하고, 수집 배치 이후의 별도
이미지 처리 단계에서 크기를 제한한 썸네일을 준비한다. 상세 요청 경로에서 TourAPI를
호출하지 않는다. 배포 캐시 공유·CDN 설정은 이번 변경에 포함하지 않는다.
