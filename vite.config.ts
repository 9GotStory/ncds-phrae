import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";

const baseEnv = process.env.VITE_BASE_PATH?.trim();
const [repoOwner, repoName] = process.env.GITHUB_REPOSITORY?.split("/") ?? [];
const defaultBase =
  repoName && repoOwner && repoName !== `${repoOwner}.github.io`
    ? `/${repoName}/`
    : "/";
const basePath =
  baseEnv && baseEnv !== "/"
    ? `${baseEnv.startsWith("/") ? baseEnv : `/${baseEnv}`}${baseEnv.endsWith("/") ? "" : "/"}`
    : defaultBase;

// https://vitejs.dev/config/
export default defineConfig({
  base: basePath,
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
