import { describe, it, expect } from "vitest";
import {
  SOCIAL_ICONS,
  SOCIAL_ICON_KEYS,
  FALLBACK_SOCIAL_ICON,
  resolveSocialIcon,
  socialIconColor,
} from "./socialIcons";

describe("socialIcons · 品牌色", () => {
  it("每个品牌都定义了亮色，且是合法十六进制", () => {
    for (const key of SOCIAL_ICON_KEYS) {
      const def = SOCIAL_ICONS[key];
      expect(def.color, `${key} 缺少 color`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("暗色变体（若定义）也是合法十六进制", () => {
    for (const key of SOCIAL_ICON_KEYS) {
      const def = SOCIAL_ICONS[key];
      if (def.colorDark) {
        expect(def.colorDark, `${key} colorDark 非法`).toMatch(
          /^#[0-9a-f]{6}$/i,
        );
      }
    }
  });

  it("浅色平台在暗色下必须换更亮的色（不应深浅同值）", () => {
    // 这些平台的品牌色偏暗，暗色模式必须换浅色，否则深底上看不见
    const mustBrighten = ["github", "x", "gitee", "douban", "email"] as const;
    for (const key of mustBrighten) {
      const def = SOCIAL_ICONS[key];
      expect(def.colorDark, `${key} 应有暗色变体`).toBeTruthy();
      expect(def.colorDark).not.toBe(def.color);
    }
  });

  it("每个品牌都必须有 label 与 path", () => {
    for (const key of SOCIAL_ICON_KEYS) {
      const def = SOCIAL_ICONS[key];
      expect(def.label, `${key} 缺少 label`).toBeTruthy();
      expect(def.path, `${key} 缺少 path`).toBeTruthy();
    }
  });

  it("兜底图标不带品牌色（应随 currentColor）", () => {
    expect(FALLBACK_SOCIAL_ICON.color).toBe("");
  });
});

describe("socialIcons · resolveSocialIcon", () => {
  it("已知 key 返回对应定义", () => {
    expect(resolveSocialIcon("github").label).toBe("GitHub");
    expect(resolveSocialIcon("bilibili").label).toBe("哔哩哔哩");
  });

  it("未知 / 空 key 回退通用图标", () => {
    expect(resolveSocialIcon("not-a-platform")).toBe(FALLBACK_SOCIAL_ICON);
    expect(resolveSocialIcon("")).toBe(FALLBACK_SOCIAL_ICON);
    expect(resolveSocialIcon(undefined)).toBe(FALLBACK_SOCIAL_ICON);
  });

  it("不因原型链上的属性误命中", () => {
    expect(resolveSocialIcon("toString")).toBe(FALLBACK_SOCIAL_ICON);
    expect(resolveSocialIcon("constructor")).toBe(FALLBACK_SOCIAL_ICON);
  });
});

describe("socialIcons · socialIconColor", () => {
  it("亮色返回 color", () => {
    expect(socialIconColor(SOCIAL_ICONS.github, false)).toBe(
      SOCIAL_ICONS.github.color,
    );
  });

  it("暗色优先返回 colorDark", () => {
    expect(socialIconColor(SOCIAL_ICONS.github, true)).toBe(
      SOCIAL_ICONS.github.colorDark,
    );
  });

  it("无暗色变体时回落亮色", () => {
    const def = { label: "X", path: "M0 0", color: "#123456" };
    expect(socialIconColor(def, true)).toBe("#123456");
  });

  it("无品牌色（兜底图标）返回空串", () => {
    expect(socialIconColor(FALLBACK_SOCIAL_ICON as never, false)).toBe("");
    expect(socialIconColor(FALLBACK_SOCIAL_ICON as never, true)).toBe("");
  });
});
