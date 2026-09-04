import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 로컬 개발용 후기 사진 업로드(localhost:4000)를 위해 사설 IP 최적화 허용
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tong.visitkorea.or.kr",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        // TourAPI에 없는 장소의 대체 출처(공공누리/CC 라이선스 확인된 것만 사용)
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "",
        pathname: "/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "k.kakaocdn.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.kakaocdn.net",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/**",
      },
      {
        // 로컬 개발용 후기 사진 업로드 (apps/api 디스크 저장, 프로덕션 스토리지 마련 전까지 임시)
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
