import type { Preview } from "@storybook/nextjs-vite";
import { setupWorker } from "msw/browser";
import { mswLoader } from "msw-storybook-addon/csf3";

import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "../src/app/globals.css";

const preview: Preview = {
  tags: ["autodocs"],
  loaders: [mswLoader(async () => {
    const worker = setupWorker();
    await worker.start({
      quiet: true,
      onUnhandledRequest(request, print) {
        const url = new URL(request.url);
        // Local modules, fonts and images may pass through. Real API and
        // external requests must have an explicit story handler.
        if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) {
          print.error();
        }
      },
    });
    return worker;
  })],
  parameters: {
    layout: "padded",
    nextjs: { appDirectory: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "todo" },
    viewport: {
      options: {
        mobile: { name: "모바일 · 390px", styles: { width: "390px", height: "844px" }, type: "mobile" },
        tablet: { name: "태블릿 · 768px", styles: { width: "768px", height: "1024px" }, type: "tablet" },
        desktop: { name: "데스크톱 · 1280px", styles: { width: "1280px", height: "900px" }, type: "desktop" },
      },
    },
    options: { storySort: { order: ["Foundations", "UI", "Domain"] } },
  },
  initialGlobals: { viewport: { value: "mobile", isRotated: false } },
};

export default preview;
