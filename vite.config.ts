import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";

const ensureBase = (input?: string) => {
  if (!input || input === "/") {
    return "/";
  }
  const normalized = input.startsWith("/") ? input : `/${input}`;
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
};

const resolveBasePath = () => {
  const envBase = process.env.VITE_BASE_PATH?.trim();
  if (envBase && envBase !== "/") {
    return ensureBase(envBase);
  }
  const [repoOwner, repoName] = process.env.GITHUB_REPOSITORY?.split("/") ?? [];
  if (repoOwner && repoName && repoName !== `${repoOwner}.github.io`) {
    return ensureBase(repoName);
  }
  return "/";
};

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  const base = isBuild ? resolveBasePath() : "/";

  return {
    base,
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
  };
});
