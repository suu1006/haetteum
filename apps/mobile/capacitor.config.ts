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
