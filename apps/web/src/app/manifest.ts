import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Haetteum",
    short_name: "Haetteum",
    description: "Haetteum web application",
    start_url: "/",
    display: "standalone",
    background_color: "#FCFCFD",
    theme_color: "#6F3DE5",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
