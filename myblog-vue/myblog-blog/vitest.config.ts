import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 覆盖 utils 下全部单元测试（含工具箱实现与共享渲染/格式化工具）
    include: ["utils/**/*.test.ts"],
  },
});
