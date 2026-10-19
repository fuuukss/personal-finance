import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: { provider: "v8", reporter: ["text", "html"], include: ["lib/**/*.ts"] }
  }
});
