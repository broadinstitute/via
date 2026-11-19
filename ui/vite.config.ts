/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs, resolved against the <base href> that index.html sets, so the build works
  // both at a host root and under Leonardo's /proxy/google/v1/apps/... prefix (see utils/basePath.ts).
  base: "./",
  server: {
    proxy: {
      // Forwards API calls to the Spring Boot backend during local development.
      "/api": "http://localhost:8080",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 85,
        lines: 85,
      },
    },
  },
});
