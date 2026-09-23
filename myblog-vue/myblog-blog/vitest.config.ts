import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // 与源码里的 `~/xxx` 写法对齐。
    // 少了它，经 `~` 引入依赖的模块（如 utils/markdown.ts）在测试里加载不了。
    alias: { "~": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    // 覆盖 utils 下全部单元测试（含工具箱实现与共享渲染/格式化工具）
    include: ["utils/**/*.test.ts"],
  },
});
