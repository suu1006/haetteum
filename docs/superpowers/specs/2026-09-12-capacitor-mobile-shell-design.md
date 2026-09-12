# Capacitor 모바일 셸 설계

## 목적

해뜸을 iOS/Android 앱으로도 배포하기 위해 `apps/mobile`에 Capacitor 기반
네이티브 셸을 추가한다. 앱은 자체 화면을 그리지 않고 운영 중인 웹
(`https://haetteum.kr`)을 WebView로 그대로 로드한다. 웹을 배포하면 앱도 즉시
최신 화면을 보여주므로, 앱 전용 배포 파이프라인 없이 기존 웹 배포에 앱을
얹는 구조다.

## 범위

이번 작업은 `apps/mobile` 신규 패키지와 그 안의 Capacitor 설정, 네이티브
프로젝트(`android/`, `ios/`), 셸 관련 플러그인 연결까지를 다룬다.
`apps/web`, `apps/api`의 기존 코드와 배포 파이프라인(`.github/workflows/deploy.yml`)은
변경하지 않는다.

Apple Developer Program / Google Play Console 계정이 아직 없으므로, 앱스토어·
플레이스토어 서명과 심사 제출은 이번 범위에서 제외한다. 로컬 빌드와 Android
에뮬레이터·iOS 시뮬레이터 실행 확인까지를 완료 기준으로 삼는다.

## 비목표

- Next.js를 정적 내보내기(`output: "export"`)로 전환하는 작업. 현재
  `apps/web`은 `output: "standalone"`으로 서버 컴포넌트 렌더링에 의존하므로,
  정적 빌드 내장 방식은 별도의 큰 리팩터링이 필요해 이번 범위에서 제외한다.
- 푸시 알림, 네이티브 카메라/사진 선택, 네이티브 위치 권한 연동. 1차 범위는
  "기본 셸"(스플래시, 상태바, 하드웨어 뒤로가기 처리)까지만 다루고, 위 기능은
  각각 별도 설계로 다룬다.
- 앱 아이콘/스플래시 디자인 리소스 제작. 우선 Capacitor 기본 플레이스홀더로
  시작하고, 실제 디자인 리소스는 준비되는 대로 교체한다.

## 아키텍처

```text
apps/mobile/
  capacitor.config.ts   # appId, appName, server.url, allowNavigation
  package.json          # @capacitor/core, cli, app, splash-screen, status-bar
  www/                   # cap이 요구하는 최소 webDir (실제 콘텐츠는 원격 URL이 담당)
  android/               # `npx cap add android`로 생성되는 Gradle 프로젝트
  ios/                    # `npx cap add ios`로 생성되는 Xcode 프로젝트
```

`apps/web`, `apps/api`는 코드 변경이 없다. `pnpm-workspace.yaml`의 `apps/*`
패턴에 이미 포함되므로 워크스페이스 등록도 별도 작업이 필요 없다.

## 구성 요소

- **`capacitor.config.ts`**
  - `appId: "kr.haetteum.app"`, `appName: "해뜸"`
  - `server.url`: 환경변수(`CAPACITOR_SERVER_URL`)로 분기. 기본값은
    운영 `https://haetteum.kr`, 로컬 확인 시 로컬 네트워크 IP나 스테이징
    URL로 override.
  - `server.allowNavigation`: 아래 "네비게이션/도메인 처리" 참고.
- **플러그인 (3종, 기본 셸 범위)**
  - `@capacitor/app`: 하드웨어 뒤로가기 버튼 처리
  - `@capacitor/splash-screen`: 앱 시작 스플래시
  - `@capacitor/status-bar`: 상태바 색상/스타일을 해뜸 브랜드 컬러에 맞춤
- **네이티브 프로젝트**: `android/`(Gradle, Android Studio로 열어 에뮬레이터
  실행), `ios/`(Xcode, 시뮬레이터 실행). 서명 설정은 개발자 계정이 없으므로
  디버그/개발용 기본값을 유지한다.

## 네비게이션 / 도메인 처리

코드 조사 결과 다음이 확인됐다.

- 카카오 로그인은 서버 리다이렉트 방식이다
  (`kauth.kakao.com` → API의 `KAKAO_REDIRECT_URI`).
- 카카오맵 SDK(`react-kakao-maps-sdk`)는 `dapi.kakao.com`에서 스크립트를
  로드한다.
- API는 `https://haetteum.kr/api/v1`로 웹과 동일 오리진이라 별도 허용이
  필요 없다.

Capacitor WebView는 기본적으로 최초 로드 오리진(`haetteum.kr`) 밖으로의
네비게이션을 차단하므로, `server.allowNavigation`에 카카오 도메인을 명시해야
로그인 흐름이 끊기지 않는다.

```ts
server: {
  url: process.env.CAPACITOR_SERVER_URL ?? "https://haetteum.kr",
  allowNavigation: [
    "*.kakao.com",
    "dapi.kakao.com",
    "k.kakaocdn.net",
  ],
}
```

## 에러 처리

WebView 로드 실패(오프라인, 서버 다운) 시 기본 브라우저 에러 화면이 그대로
노출되는 문제가 있다. 최소한의 대응으로 `@capacitor/app`의
`appUrlOpen`/네트워크 상태를 활용한 간단한 "재시도" 안내 화면을 추가한다.
이 화면은 별도 페이지가 아니라 네이티브 셸 쪽에 있는 최소 HTML/스크립트로
구현하며, 재시도 버튼을 누르면 `server.url`을 다시 로드한다.

## 테스트

- Android: Android Studio로 `apps/mobile/android`를 열어 에뮬레이터에서 실행.
  로그인(카카오 리다이렉트 왕복), 지도 렌더링, 하드웨어 뒤로가기, 스플래시
  노출을 확인한다.
- iOS: Xcode로 `apps/mobile/ios`를 열어 시뮬레이터에서 동일한 골든 패스를
  확인한다. 이 Mac에 Xcode가 설치돼 있는지는 구현 착수 시 확인한다.
- 두 플랫폼 모두 오프라인 상태에서 재시도 화면이 뜨는지 확인한다.

## 향후 작업 (이번 범위 밖)

- Apple Developer Program / Google Play Console 계정 발급 후 서명·스토어
  등록 설계
- 푸시 알림 연동 설계 (FCM/APNs + API 쪽 디바이스 토큰 저장)
- 네이티브 카메라/위치 권한 연동 설계
- 앱 아이콘/스플래시 디자인 리소스 제작 및 반영
