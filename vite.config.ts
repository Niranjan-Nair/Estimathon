import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH is set by the GitHub Actions workflow to "/<repo-name>/" so
// assets resolve correctly when served from https://<user>.github.io/<repo>/.
// Locally it defaults to "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "/",
});
