import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./test/env.setup.ts", "./test/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/**/*.types.ts", "src/**/README.md"],
    },
  },
});
