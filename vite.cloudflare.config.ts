import vinext from "vinext";
import { defineConfig } from "vite";

// Independent migration build. Existing Sites configuration remains untouched.
export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    plugins: [vinext(), cloudflare({
      configPath: "wrangler.cloudflare.json",
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      inspectorPort: false,
      remoteBindings: false,
    })],
  };
});
