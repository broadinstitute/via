/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
      // Only one real test file exists today (App.test.tsx), so these floors are set just under
      // the current baseline -- enough to catch a regression, not a claim that this is good
      // coverage. Raise them as real unit tests get added.
      thresholds: {
        statements: 25,
        branches: 10,
        functions: 12,
        lines: 25,
      },
    },
  },
});
