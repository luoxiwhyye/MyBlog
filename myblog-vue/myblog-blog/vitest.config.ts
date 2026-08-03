import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["utils/tools/**/*.test.ts"],
  },
});
