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
});
