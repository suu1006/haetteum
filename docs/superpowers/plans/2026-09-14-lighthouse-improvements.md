# Lighthouse 개선 실행 계획

목표: 2026-09-14 배포 검사에서 확인한 초기 전송량, 임베드 CLS, 데이터 직렬 대기, 접근성 및 SEO 문제를 순서대로 개선한다.
기준: artifacts/lighthouse/2026-09-14/README.md와 사용자 승인. 기존 화면과 DB-only TourAPI 경계 유지. 이 작업은 현재 세션에서 순차 실행한다.

- [x] 1. 챗봇 이미지: 내장 PNG를 표시 크기에 맞는 WebP로 변환하고 홈·챗 사용처 교체. 크기/투명도/렌더 검증.
- [x] 2–3. 탐색 임베드: 먼저 회귀 테스트로 플레이어 상한과 활성 전환을 재현. 사용자가 미리보기 재생을 누른 타일 하나만 iframe을 생성하고 나머지는 썸네일 유지. 자동 한 개도 외부 CLS가 남아 명시적 재생으로 확정. CLS 및 외부 요청 재측정.
- [ ] 4. HTTP/2: 저장소 배포 구조 확인 후 운영자가 적용할 검증 가능한 nginx 설정·절차 작성. 실제 서버 접근/변경은 별도로 명시.
- [x] 5. CSS/폰트: 불필요한 개발용 소스의 Tailwind 스캔 제외, 기존 subset/swap 유지. 프로덕션 CSS 크기와 화면 검증.
- [x] 6. 데이터: 독립 요청 동시 시작 회귀 테스트 후 병렬화. 공개 데이터에 30초 revalidate 적용, 익명/개인 데이터는 캐시하지 않음.
- [x] 7. 접근성: 축제 선택 버튼의 보이는 텍스트와 접근 가능한 이름 일치. 기존 선택 동작 검증.
- [x] 8. 인증: 보호된 me/logout은 유지하고 선택적 session 조회 추가. 익명·만료·유효 세션·서버 오류 테스트 후 프런트 전환.
- [x] 9. 이미지/JS: AI 코스 대화상자 lazy import, 이미지 sizes 현실화. 관련 테스트/빌드 확인.
- [x] 10. SEO/계측: 공개 경로 sitemap/robots 및 페이지 canonical/OG. 민감정보를 제외한 자체 Web Vitals 수집과 Lighthouse 반복 실행 도구 추가.
- [x] 검증: 변경 범위 회귀 테스트, 전체 웹 테스트, API 인증 테스트, 린트·타입/빌드, 로컬 프로덕션 Lighthouse 비교. 배포 전후 수치 혼용 금지.

## 결과 및 운영 경계

HTTP/2 실제 적용은 운영 nginx 구성/접근 정보가 없어 미완료. docs/runbooks/web-performance.md에 버전별 반영·검증·복구 절차 작성. 앱은 배포하지 않았으며 API·웹 동시 배포 후 운영 Lighthouse 재측정 필요. 폰트는 기존 동적 subset/swap을 유지하고 CSS 스캔 범위를 실제 소스로 제한했다. 세션 응답은 Nest null-body 동작을 피하기 위해 response.json(null)을 명시적으로 사용한다. Web Vitals는 10% 자체 수집 코드와 PM2 stdout까지만 구현했고 집계 대시보드/운영 로그 연동은 별도이다.

상세 결과: ../../reports/2026-09-14-lighthouse-improvements.md
