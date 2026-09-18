import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { THEME_COLOR_PRESETS } from "../themeColor";

// ============================================
// 后台预设表 → 前台预设 的对拍守卫
//
// 为什么需要它：`THEME_COLOR_PRESETS`（前台）与 `THEME_COLOR_PRESET_MAP`（后台
// Settings.vue）是**两份手写数据**，两者之间没有任何代码级引用（前台的 value 是
// accent 亮色 hex，后台的 value 是 slug），历史上已经漂移过一次（后台「当前/默认」
// 那套的 accent / category 还是旧值）。
//
// 这里直接读后台源文件解析出它的表，与前台预设逐字段对拍。
// 断言的依据：5 个维度的输入都是「选什么就是什么」——
//   accent / category / fav 本体取输入原值；
//   gradient 的输入 = 渐变起始色；deco 的输入 = 光晕主色（--deco-a 的颜色部分）。
// ============================================

const ADMIN_SETTINGS = new URL(
  "../../../myblog-admin/src/views/Settings.vue",
  import.meta.url,
);

interface AdminPreset {
  name: string;
  value: string;
  colors: Record<string, string>;
}

const readAdminPresetMap = (): AdminPreset[] => {
  const src = readFileSync(ADMIN_SETTINGS, "utf8");
  const start = src.indexOf("const THEME_COLOR_PRESET_MAP = [");
  expect(
    start,
    "后台 Settings.vue 里找不到 THEME_COLOR_PRESET_MAP",
  ).toBeGreaterThan(-1);
  const end = src.indexOf("\n]", start);
  const block = src.slice(start, end);

  const entries: AdminPreset[] = [];
  const entryRe =
    /name:\s*'([^']+)',\s*value:\s*'([^']+)',\s*colors:\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(block)) !== null) {
    const colors: Record<string, string> = {};
    const colorRe = /(site_theme_[a-z]+_(?:light|dark)):\s*'([^']+)'/g;
    let c: RegExpExecArray | null;
    while ((c = colorRe.exec(m[3])) !== null) colors[c[1]] = c[2];
    entries.push({ name: m[1], value: m[2], colors });
  }
  return entries;
};

/** `linear-gradient(135deg, #61c9e5, #c5eaf5)` → `#61c9e5`（取渐变起始色） */
const gradientStart = (value: string): string => {
  const hex = value.match(/#[0-9a-f]{6}/i);
  if (!hex) throw new Error(`无法从渐变里取起始色：${value}`);
  return hex[0].toLowerCase();
};

/** `rgba(97, 201, 229, 0.18)` → `#61c9e5`（取颜色部分，忽略透明度） */
const rgbaToHex = (value: string): string => {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) throw new Error(`无法从 rgba 里取颜色：${value}`);
  return `#${[m[1], m[2], m[3]]
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`;
};

const MODES = ["light", "dark"] as const;
const DIMS = ["accent", "category", "fav", "gradient", "deco"] as const;

const adminPresets = readAdminPresetMap();

describe("后台预设表与前台预设一致", () => {
  it("两边预设数量与 key 集合一致", () => {
    expect(adminPresets.map((p) => p.value)).toEqual(
      THEME_COLOR_PRESETS.map((p) => p.key),
    );
  });

  it("预设名称一致", () => {
    for (const preset of THEME_COLOR_PRESETS) {
      const admin = adminPresets.find((p) => p.value === preset.key);
      expect(admin, `后台缺少预设 ${preset.key}`).toBeTruthy();
      expect(admin!.name, `预设 ${preset.key} 的名称不一致`).toBe(preset.name);
    }
  });

  it("5 个维度 × 亮暗 × 5 套预设的输入色逐字节一致", () => {
    const mismatches: string[] = [];

    for (const preset of THEME_COLOR_PRESETS) {
      const admin = adminPresets.find((p) => p.value === preset.key);
      if (!admin) continue;

      for (const mode of MODES) {
        const want = mode === "light" ? preset.light : preset.dark;
        const expected: Record<(typeof DIMS)[number], string> = {
          accent: want.accent.toLowerCase(),
          category: want.category.toLowerCase(),
          fav: want.fav.toLowerCase(),
          gradient: gradientStart(want.gradientBrand),
          deco: rgbaToHex(want.decoA),
        };

        for (const dim of DIMS) {
          const key = `site_theme_${dim}_${mode}`;
          const got = (admin.colors[key] ?? "").toLowerCase();
          if (got !== expected[dim]) {
            mismatches.push(
              `${preset.key}/${key}: 后台=${got || "(缺)"} 前台=${expected[dim]}`,
            );
          }
        }
      }
    }

    expect(mismatches, `\n${mismatches.join("\n")}\n`).toEqual([]);
  });

  it("每套预设的亮/暗两模式都给了值（不能留空，否则套用后是半套外观）", () => {
    const missing: string[] = [];
    for (const admin of adminPresets) {
      for (const dim of DIMS) {
        for (const mode of MODES) {
          const key = `site_theme_${dim}_${mode}`;
          if (!admin.colors[key]) missing.push(`${admin.value}/${key}`);
        }
      }
    }
    expect(missing, `\n${missing.join("\n")}\n`).toEqual([]);
  });
});
