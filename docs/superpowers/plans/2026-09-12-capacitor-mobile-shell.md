# Capacitor 모바일 셸 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/mobile`에 Capacitor 기반 iOS/Android 네이티브 셸을 추가해, 운영 중인
`https://haetteum.kr`을 WebView로 그대로 로드하는 앱을 로컬 에뮬레이터/시뮬레이터에서
실행 가능하게 만든다.

**Architecture:** 새 pnpm 워크스페이스 패키지 `apps/mobile`이 Capacitor 설정과
`android/`, `ios/` 네이티브 프로젝트를 갖는다. 앱 콘텐츠는 원격 URL을 그대로
로드하므로 자체 화면/라우팅이 없고, `apps/web`, `apps/api`는 코드 변경이 없다.
하드웨어 뒤로가기와 오프라인 재시도는 네이티브 코드(Android
`MainActivity.java`, iOS `MainViewController.swift`)에서 직접 처리한다 —
리모트 페이지에 Capacitor JS를 주입할 수 없어 플러그인의 JS 리스너 API를 쓸 수
없기 때문이다 (아래 "설계 노트" 참고).

**Tech Stack:** Capacitor 8 (`@capacitor/core`, `@capacitor/cli`,
`@capacitor/android`, `@capacitor/ios`, `@capacitor/splash-screen`), pnpm
workspace, Android Gradle, Xcode/SPM.

**Spec:** [docs/superpowers/specs/2026-09-12-capacitor-mobile-shell-design.md](../specs/2026-09-12-capacitor-mobile-shell-design.md)

## 설계 노트 (스펙과의 차이, 계획 수립 중 확정)

스펙은 "필수 플러그인 3종"으로 `@capacitor/app`, `@capacitor/splash-screen`,
`@capacitor/status-bar`를 언급했다. 계획을 구체화하며 다음을 확인했다:

- `@capacitor/app`의 `backButton` 리스너와 `@capacitor/status-bar`의
  `setStyle`/`setBackgroundColor`는 **원격 웹페이지의 JS 코드에서 호출**해야
  동작한다. 이 앱은 `apps/web` 코드를 수정하지 않고 `haetteum.kr`을 그대로
  로드하므로, 그 페이지에 Capacitor 플러그인 호출을 넣을 수 없다.
- 대신 하드웨어 뒤로가기는 Android `MainActivity`의 `onBackPressed()`를
  오버라이드해 WebView 히스토리를 직접 제어하고, 상태바 색상은 Android
  `styles.xml`과 iOS `Info.plist`의 네이티브 테마 설정으로 처리한다. 이 방식이
  더 안정적이고 플러그인 설치도 필요 없다.
- `@capacitor/splash-screen`만 실제로 설치한다 — 이 플러그인은
  `capacitor.config.ts` 설정만으로 앱 시작 시 자동으로 뜨고 WebView 로드 완료
  시 자동으로 사라지므로(`launchAutoHide`), JS 호출이 필요 없다.

스펙이 요구한 결과(뒤로가기 처리, 상태바 스타일 적용)는 그대로 달성되므로
스펙 변경 없이 이 노트로 구현 방식만 명확히 한다.

## Global Constraints

- Node.js 22 이상 (Capacitor 8 요구사항). 모노레포는 이미 Node 24.19.0 사용.
- iOS 빌드에는 Xcode 26.0 이상이 필요하다.
- Android 빌드에는 Android Studio Otter(2025.2.1) 이상과 JDK 17 이상이
  필요하다.
- `appId: "kr.haetteum.app"`, `appName: "해뜸"` — 모든 네이티브 설정에서
  동일하게 사용한다.
- `server.url` 기본값은 `https://haetteum.kr`. 환경변수
  `CAPACITOR_SERVER_URL`로 로컬 확인용 URL로 override 가능해야 한다.
- `server.allowNavigation`에 `*.kakao.com`, `dapi.kakao.com`,
  `k.kakaocdn.net`을 반드시 포함한다 (카카오 로그인/지도 SDK).
- `apps/web`, `apps/api`의 기존 코드는 수정하지 않는다.
- 앱스토어/플레이스토어 서명·제출은 이번 범위 밖이다. 디버그 빌드로 로컬
  에뮬레이터/시뮬레이터에서 실행 확인하는 것이 완료 기준이다.
- 브랜드 색상: 배경 `#FCFCFD` (web `--background`/`--neutral-25`), 포인트
  컬러 `#6F3DE5` (web `--primary`/`--purple-600`). 상태바/스플래시/오프라인
  화면에서 이 값을 사용한다.

---

## Task 1: apps/mobile 패키지 스캐폴딩

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `@haetteum/mobile` pnpm 워크스페이스 패키지, `@capacitor/cli`를
  `pnpm --filter @haetteum/mobile exec cap ...`으로 실행 가능한 상태

- [ ] **Step 1: Node 버전 확인**

Run: `node -v`
Expected: `v22` 이상 (예: `v24.19.0`). 낮으면 이후 단계 전에 Node를 올려야
한다.

- [ ] **Step 2: package.json 작성**

`apps/mobile/package.json`:

```json
{
  "name": "@haetteum/mobile",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "cap": "cap"
  },
  "dependencies": {
    "@capacitor/android": "^8.0.0",
    "@capacitor/core": "^8.0.0",
    "@capacitor/ios": "^8.0.0",
    "@capacitor/splash-screen": "^8.0.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^8.0.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 3: tsconfig.json 작성**

`apps/mobile/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["capacitor.config.ts"]
}
```

- [ ] **Step 4: 의존성 설치**

Run (저장소 루트에서): `pnpm install`
Expected: `apps/mobile`가 워크스페이스 패키지로 인식되고 `@capacitor/*`
패키지가 설치된다. `pnpm-lock.yaml`이 갱신된다.

- [ ] **Step 5: Capacitor CLI 동작 확인**

Run: `pnpm --filter @haetteum/mobile exec cap --version`
Expected: `8.x.x` 형태의 버전 문자열 출력 (설치 실패 시 이전 단계 재확인).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/package.json apps/mobile/tsconfig.json pnpm-lock.yaml
git commit -m "feat(mobile): scaffold @haetteum/mobile capacitor package"
```

---

## Task 2: capacitor.config.ts + www 정적 자산 + 스플래시 설정

**Files:**
- Create: `apps/mobile/capacitor.config.ts`
- Create: `apps/mobile/www/index.html`
- Create: `apps/mobile/www/offline.html`

**Interfaces:**
- Consumes: Task 1의 `@haetteum/mobile` 패키지, `cap` CLI
- Produces: `appId`, `appName`, `server.url`, `server.allowNavigation` 값 —
  Task 3/6에서 `cap add`가 이 값을 읽어 네이티브 프로젝트를 생성한다.
  `www/offline.html`은 Task 4/7의 네이티브 코드가
  `file:///android_asset/public/offline.html` (Android),
  `Bundle.main` 내 `public/offline.html` (iOS) 경로로 로드한다.

- [ ] **Step 1: capacitor.config.ts 작성**

`apps/mobile/capacitor.config.ts`:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const productionUrl = "https://haetteum.kr";

const config: CapacitorConfig = {
  appId: "kr.haetteum.app",
  appName: "해뜸",
  webDir: "www",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? productionUrl,
    allowNavigation: ["*.kakao.com", "dapi.kakao.com", "k.kakaocdn.net"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#FCFCFD",
      showSpinner: false,
    },
  },
};

export default config;
```

- [ ] **Step 2: www/index.html 작성 (cap add가 요구하는 placeholder)**

`apps/mobile/www/index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>해뜸</title>
  </head>
  <body>
    <p>
      이 페이지는 런타임에 사용되지 않습니다. capacitor.config.ts의
      server.url이 항상 우선 로드됩니다.
    </p>
  </body>
</html>
```

- [ ] **Step 3: www/offline.html 작성 (오프라인 재시도 화면)**

`apps/mobile/www/offline.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>해뜸</title>
    <style>
      body {
        margin: 0;
        display: flex;
        min-height: 100vh;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        background: #fcfcfd;
        color: #1a1523;
        font-family: -apple-system, "Pretendard", sans-serif;
        text-align: center;
        padding: 24px;
      }
      button {
        padding: 12px 24px;
        border-radius: 8px;
        border: none;
        background: #6f3de5;
        color: #ffffff;
        font-size: 16px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <p>인터넷 연결을 확인할 수 없습니다.</p>
    <button onclick="location.href = 'https://haetteum.kr'">다시 시도</button>
  </body>
</html>
```

- [ ] **Step 4: 설정 파일 문법 확인**

Run: `pnpm --filter @haetteum/mobile exec tsc --noEmit`
Expected: 에러 없이 종료 (0).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/capacitor.config.ts apps/mobile/www
git commit -m "feat(mobile): add capacitor config, offline retry page, splash config"
```

---

## Task 3: Android 네이티브 프로젝트 생성

**Files:**
- Create: `apps/mobile/android/` (Capacitor CLI가 생성)

**Interfaces:**
- Consumes: Task 2의 `capacitor.config.ts`, `www/`
- Produces: `apps/mobile/android/app/src/main/java/kr/haetteum/app/MainActivity.java`,
  `apps/mobile/android/app/src/main/res/values/styles.xml` — Task 4에서 수정.

- [ ] **Step 1: Android 빌드 환경 확인**

Run: `java -version` 및 `echo $ANDROID_HOME`
Expected: JDK 17 이상, `ANDROID_HOME`이 Android SDK 경로를 가리킴. 둘 중
하나라도 없으면 Android Studio를 설치하고 SDK Manager에서 최신 Android
플랫폼과 Android Studio 내장 JDK를 사용하도록 설정한 뒤 진행한다.

- [ ] **Step 2: android 플랫폼 추가**

Run (저장소 루트에서): `pnpm --filter @haetteum/mobile exec cap add android`
Expected: `apps/mobile/android/` Gradle 프로젝트가 생성되고, 마지막에
`✔ add in ...`류의 성공 메시지가 출력된다.

- [ ] **Step 3: 동기화**

Run: `pnpm --filter @haetteum/mobile exec cap sync android`
Expected: `✔ Sync finished` 메시지. `www/index.html`, `www/offline.html`이
`android/app/src/main/assets/public/`에 복사된 것을 확인한다.

Run: `ls apps/mobile/android/app/src/main/assets/public/`
Expected: `index.html`, `offline.html` 출력.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/android
git commit -m "feat(mobile): add Android native project via capacitor"
```

---

## Task 4: Android 네이티브 커스터마이징 (뒤로가기, 오프라인, 상태바)

**Files:**
- Modify: `apps/mobile/android/app/src/main/java/kr/haetteum/app/MainActivity.java`
- Modify: `apps/mobile/android/app/src/main/res/values/styles.xml`

**Interfaces:**
- Consumes: Task 3에서 생성된 `MainActivity`, `styles.xml`,
  `assets/public/offline.html`
- Produces: 뒤로가기 시 WebView 히스토리 이동, 메인 프레임 로드 실패 시
  `offline.html` 표시, 라이트 상태바(`#FCFCFD` 배경 + 어두운 아이콘) — Task 5
  수동 확인의 대상.

- [ ] **Step 1: MainActivity.java 확인**

Run: `cat apps/mobile/android/app/src/main/java/kr/haetteum/app/MainActivity.java`
Expected: 기본 템플릿 형태 (대략 아래와 유사):

```java
package kr.haetteum.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {}
```

패키지명이 `kr.haetteum.app`이 아니거나 파일 위치가 다르면, 실제 생성된
경로/패키지명을 아래 Step에서 그대로 사용한다.

- [ ] **Step 2: MainActivity.java 수정 — 뒤로가기 + 오프라인 재시도**

`apps/mobile/android/app/src/main/java/kr/haetteum/app/MainActivity.java`를
아래 내용으로 교체:

```java
package kr.haetteum.app;

import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView webView = getBridge().getWebView();
    webView.setWebViewClient(
        new BridgeWebViewClient(getBridge()) {
          @Override
          public void onReceivedError(
              WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
              view.loadUrl("file:///android_asset/public/offline.html");
              return;
            }
            super.onReceivedError(view, request, error);
          }
        });
  }

  @Override
  public void onBackPressed() {
    WebView webView = getBridge().getWebView();
    if (webView.canGoBack()) {
      webView.goBack();
      return;
    }
    super.onBackPressed();
  }
}
```

`BridgeWebViewClient`를 상속해야 Capacitor JS 브릿지가 원격 페이지에서도
계속 동작한다. 일반 `WebViewClient`로 교체하면 안 된다.

- [ ] **Step 3: styles.xml에 상태바 색상 추가**

Run: `cat apps/mobile/android/app/src/main/res/values/styles.xml`로 `AppTheme`
스타일 블록(`<style name="AppTheme" ...> ... </style>`)을 찾는다. 그 블록
안에 다음 두 줄을 추가한다:

```xml
<item name="android:statusBarColor">#FCFCFD</item>
<item name="android:windowLightStatusBar">true</item>
```

- [ ] **Step 4: 빌드 확인**

Run: `pnpm --filter @haetteum/mobile exec cap run android --list`
Expected: 연결된 에뮬레이터/디바이스 목록이 출력된다 (없으면 Android Studio
Device Manager에서 에뮬레이터를 하나 생성한 뒤 다시 실행).

Run: `pnpm --filter @haetteum/mobile exec cap run android`
Expected: 대상 선택 후 Gradle 빌드가 `BUILD SUCCESSFUL`로 끝나고, 에뮬레이터에
앱이 설치되어 실행된다 (자동 실행되지 않으면 Android Studio에서
`apps/mobile/android`를 열어 Run 버튼으로 실행).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/android
git commit -m "feat(mobile): handle Android back button, offline retry, status bar"
```

---

## Task 5: Android 골든 패스 수동 확인

**Files:** 없음 (수동 확인, 코드 변경 없음)

**Interfaces:**
- Consumes: Task 4에서 에뮬레이터에 실행 중인 앱
- Produces: 없음 (완료 기준 체크리스트)

- [ ] **Step 1: 최초 로드 + 스플래시 확인**

앱 실행 시 잠시 스플래시가 보이고, `https://haetteum.kr` 홈 화면이 로드되는지
확인한다.

- [ ] **Step 2: 카카오 로그인 왕복 확인**

로그인 진입 → 카카오 계정 로그인 화면(`kauth.kakao.com`/`accounts.kakao.com`)
으로 이동 → 로그인 후 `haetteum.kr`로 정상 리다이렉트되는지 확인한다.
`allowNavigation`이 빠지면 이 단계에서 빈 화면/네비게이션 실패가 난다.

- [ ] **Step 3: 지도 렌더링 확인**

장소 상세나 코스 화면에서 카카오맵이 정상적으로 그려지는지 확인한다.

- [ ] **Step 4: 하드웨어 뒤로가기 확인**

화면을 2단계 이상 이동한 뒤 기기 뒤로가기 버튼을 눌러 이전 화면으로
돌아가는지, 최초 화면에서 한 번 더 누르면 앱이 종료되는지 확인한다.

- [ ] **Step 5: 오프라인 재시도 확인**

에뮬레이터에서 네트워크를 끈 상태(Extended Controls → Cellular/Wi-Fi off,
또는 `adb shell svc wifi disable && adb shell svc data disable`)로 앱을 새로
실행하거나 새로고침해 "인터넷 연결을 확인할 수 없습니다" 화면과 다시 시도
버튼이 보이는지 확인한다. 네트워크를 다시 켠 뒤 다시 시도 버튼을 눌러
정상적으로 복구되는지 확인한다.

이 5개 항목이 모두 통과하면 Android 쪽은 완료로 간주한다.

---

## Task 6: iOS 네이티브 프로젝트 생성

**Files:**
- Create: `apps/mobile/ios/` (Capacitor CLI가 생성)

**Interfaces:**
- Consumes: Task 2의 `capacitor.config.ts`, `www/`
- Produces: `apps/mobile/ios/App/App/AppDelegate.swift`,
  `apps/mobile/ios/App/App/Base.lproj/Main.storyboard`,
  `apps/mobile/ios/App/App/Info.plist` — Task 7에서 수정.

- [ ] **Step 1: iOS 빌드 환경 확인**

Run: `xcodebuild -version`
Expected: Xcode 26.0 이상. 이 Mac에 없거나 버전이 낮으면 App Store에서 Xcode를
업데이트한 뒤 진행한다.

- [ ] **Step 2: ios 플랫폼 추가**

Run: `pnpm --filter @haetteum/mobile exec cap add ios`
Expected: `apps/mobile/ios/` Xcode 프로젝트가 생성되고 성공 메시지가
출력된다. Capacitor 8은 기본으로 CocoaPods 대신 SPM을 사용하므로 별도
`pod install`은 필요 없다.

- [ ] **Step 3: 동기화**

Run: `pnpm --filter @haetteum/mobile exec cap sync ios`
Expected: `✔ Sync finished` 메시지.

Run: `find apps/mobile/ios -name "offline.html"`
Expected: `apps/mobile/ios/App/App/public/offline.html` 같은 경로가 출력된다
(정확한 경로는 이 Step의 출력으로 확인하고, Task 7에서 그 경로를 그대로
사용한다).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/ios
git commit -m "feat(mobile): add iOS native project via capacitor"
```

---

## Task 7: iOS 네이티브 커스터마이징 (오프라인, 스와이프 백, 상태바)

**Files:**
- Create: `apps/mobile/ios/App/App/MainViewController.swift`
- Modify: `apps/mobile/ios/App/App/Base.lproj/Main.storyboard`
- Modify: `apps/mobile/ios/App/App/Info.plist`

**Interfaces:**
- Consumes: Task 6에서 생성된 iOS 프로젝트, Task 6 Step 3에서 확인한
  `offline.html`의 실제 번들 경로
- Produces: 메인 프레임 로드 실패 시 `offline.html` 표시, 스와이프 뒤로가기
  제스처 활성화, 라이트 상태바 — Task 8 수동 확인의 대상.

Capacitor의 iOS 커스터마이징 방식은 버전마다 바뀔 수 있다. 아래 패턴은
`CAPBridgeViewController`를 서브클래싱하는 표준 방식이다. 실제 생성된
`Main.storyboard`/`AppDelegate.swift` 구조가 아래와 다르면
https://capacitorjs.com/docs/ios/custom-code 를 확인해 동일한 목표(로드
실패 감지 + 로컬 페이지 표시, 스와이프 백 제스처)를 이루도록 조정한다.

- [ ] **Step 1: MainViewController.swift 작성**

`apps/mobile/ios/App/App/MainViewController.swift`:

```swift
import Capacitor
import WebKit

class MainViewController: CAPBridgeViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    webView?.allowsBackForwardNavigationGestures = true
  }

  override func webView(
    _ webView: WKWebView,
    didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: Error
  ) {
    super.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
    loadOfflinePage()
  }

  override func webView(
    _ webView: WKWebView,
    didFail navigation: WKNavigation!,
    withError error: Error
  ) {
    super.webView(webView, didFail: navigation, withError: error)
    loadOfflinePage()
  }

  private func loadOfflinePage() {
    guard
      let webView = self.webView,
      let url = Bundle.main.url(forResource: "offline", withExtension: "html", subdirectory: "public")
    else { return }
    webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
  }
}
```

Task 6 Step 3에서 확인한 `offline.html`의 실제 번들 내 경로가
`public/offline.html`이 아니면, `subdirectory:` 값을 그 경로에 맞게 고친다.

- [ ] **Step 2: Main.storyboard의 커스텀 클래스 변경**

`apps/mobile/ios/App/App/Base.lproj/Main.storyboard`를 열어
`customClass="CAPBridgeViewController"`로 되어 있는 `viewController` 엘리먼트를
찾아 `customClass="MainViewController"`로 바꾼다.

텍스트 편집 대신 Xcode로 하려면: `apps/mobile/ios/App/App.xcodeproj`를 열고
Main.storyboard 선택 → View Controller 선택 → Identity Inspector(⌥⌘3) →
Custom Class를 `MainViewController`로 변경.

- [ ] **Step 3: Info.plist 상태바 설정**

`apps/mobile/ios/App/App/Info.plist`의 최상위 `<dict>` 안에 다음 두 키를
추가한다:

```xml
<key>UIViewControllerBasedStatusBarAppearance</key>
<false/>
<key>UIStatusBarStyle</key>
<string>UIStatusBarStyleDarkContent</string>
```

- [ ] **Step 4: 빌드 확인**

Run: `pnpm --filter @haetteum/mobile exec cap run ios --list`
Expected: 사용 가능한 시뮬레이터 목록이 출력된다.

Run: `pnpm --filter @haetteum/mobile exec cap run ios`
Expected: 시뮬레이터 선택 후 Xcode 빌드가 성공하고 시뮬레이터에 앱이 설치되어
실행된다 (CLI에서 실패하면 `apps/mobile/ios/App/App.xcodeproj`를 Xcode로 열어
▶ 버튼으로 실행).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/ios
git commit -m "feat(mobile): handle iOS offline retry, swipe-back, status bar"
```

---

## Task 8: iOS 골든 패스 수동 확인

**Files:** 없음 (수동 확인, 코드 변경 없음)

**Interfaces:**
- Consumes: Task 7에서 시뮬레이터에 실행 중인 앱
- Produces: 없음 (완료 기준 체크리스트)

- [ ] **Step 1: 최초 로드 + 스플래시 확인**

앱 실행 시 잠시 스플래시가 보이고, `https://haetteum.kr` 홈 화면이 로드되는지
확인한다.

- [ ] **Step 2: 카카오 로그인 왕복 확인**

로그인 진입 → `kauth.kakao.com`/`accounts.kakao.com`으로 이동 → 로그인 후
`haetteum.kr`로 정상 리다이렉트되는지 확인한다.

- [ ] **Step 3: 지도 렌더링 확인**

장소 상세/코스 화면에서 카카오맵이 정상적으로 그려지는지 확인한다.

- [ ] **Step 4: 스와이프 백 제스처 확인**

화면을 2단계 이상 이동한 뒤 화면 왼쪽 가장자리에서 오른쪽으로 스와이프해
이전 화면으로 돌아가는지 확인한다.

- [ ] **Step 5: 오프라인 재시도 확인**

시뮬레이터에서 네트워크를 끈 상태(Xcode 메뉴 Debug → Network → Network
Link Conditioner를 100% Loss로 설정하거나, 시뮬레이터 상단 상태바에서
비행기 모드 유사 설정이 없으므로 Mac 자체 Wi‑Fi를 끄고 확인)로 앱을 새로
실행하거나 새로고침해 오프라인 화면과 다시 시도 버튼이 보이는지 확인한다.
네트워크를 다시 켠 뒤 다시 시도 버튼으로 정상 복구되는지 확인한다.

이 5개 항목이 모두 통과하면 iOS 쪽도 완료로 간주하고, 이 계획의 완료 기준을
모두 만족한다.
