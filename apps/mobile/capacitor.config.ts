import type { CapacitorConfig } from "@capacitor/cli";

const productionUrl = "https://haetteum.kr";

const config: CapacitorConfig = {
  appId: "kr.haetteum.app",
  appName: "해뜸",
  webDir: "www",
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? productionUrl,
    allowNavigation: ["*.kakao.com", "dapi.kakao.com", "k.kakaocdn.net"],
    // Shown automatically by the native WebView delegate (on iOS,
    // WebViewDelegationHandler; @capacitor/ios 8.5.2) when the initial/main
    // frame navigation to `url` above fails, e.g. no network connection.
    // Resolved relative to the bundled web assets (webDir), so this maps to
    // `offline.html` at the root of `www/` / the native `public/` folder.
    errorPath: "offline.html",
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
