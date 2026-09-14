import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@base-ui/react", "@base-ui/react/*"], message: "Base UI는 components/ui에서 감싼 컴포넌트를 사용하세요." }],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "storybook-static/**",
    ".storybook/public/mockServiceWorker.js",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
