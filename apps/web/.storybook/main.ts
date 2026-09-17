import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "msw-storybook-addon"],
  framework: "@storybook/nextjs-vite",
  // Share application images with component stories.
  staticDirs: [
    { from: "../public/images", to: "/images" },
    { from: "./public", to: "/" },
  ],
  core: { disableTelemetry: true },
  async viteFinal(config) {
    config.plugins = [...(config.plugins ?? []), {
      name: "storybook-pretendard-import",
      enforce: "pre",
      transform(code, id) {
        // Let Vite resolve font URLs from the font package, before Tailwind
        // inlines globals.css and loses the font stylesheet's directory.
        if (id.split("?")[0].endsWith("/src/app/globals.css")) {
          return code.replace('@import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";', "");
        }
      },
    }];
    return config;
  },
};

export default config;
