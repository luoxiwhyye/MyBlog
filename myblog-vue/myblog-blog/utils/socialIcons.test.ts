import { describe, it, expect } from "vitest";
import {
  SOCIAL_ICONS,
  SOCIAL_ICON_KEYS,
  FALLBACK_SOCIAL_ICON,
  resolveSocialIcon,
  socialIconColor,
} from "./socialIcons";

describe("socialIcons · 品牌色", () => {
  /** 无品牌归属、刻意跟随 currentColor 的图标（邮箱不是品牌） */
  const NO_BRAND_COLOR = ["email"] as const;

  // 统一走 resolveSocialIcon 取定义：它返回 SocialIconDef 接口类型，
  // 避免直接索引各字面量类型（它们声明的字段并不一致）导致联合访问报错
  const defOf = (key: string) => resolveSocialIcon(key);

  it("除刻意不上色的图标外，每个品牌都定义了亮色且是合法十六进制", () => {
    for (const key of SOCIAL_ICON_KEYS) {
      const def = defOf(key);
      if (NO_BRAND_COLOR.includes(key as (typeof NO_BRAND_COLOR)[number])) {
        expect(def.color, `${key} 应无品牌色`).toBe("");
        continue;
      }
      expect(def.color, `${key} 缺少 color`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("暗色变体（若定义）也是合法十六进制", () => {
    for (const key of SOCIAL_ICON_KEYS) {
      const def = defOf(key);
      if (def.colorDark) {
        expect(def.colorDark, `${key} colorDark 非法`).toMatch(
          /^#[0-9a-f]{6}$/i,
        );
      }
    }
  });

  it("浅色平台在暗色下必须换更亮的色（不应深浅同值）", () => {
    // 这些平台的品牌色偏暗，暗色模式必须换浅色，否则深底上看不见
    const mustBrighten = ["github", "x", "gitee", "douban"] as const;
    for (const key of mustBrighten) {
      const def = defOf(key);
      expect(def.colorDark, `${key} 应有暗色变体`).toBeTruthy();
      expect(def.colorDark).not.toBe(def.color);
    }
  });

  it("无品牌色的图标在两种主题下都应返回空串（交由 currentColor）", () => {
    expect(socialIconColor(SOCIAL_ICONS.email, false)).toBe("");
    expect(socialIconColor(SOCIAL_ICONS.email, true)).toBe("");
  });

  it("每个品牌都必须有 label 与 path", () => {
    for (const key of SOCIAL_ICON_KEYS) {
      const def = defOf(key);
      expect(def.label, `${key} 缺少 label`).toBeTruthy();
      expect(def.path, `${key} 缺少 path`).toBeTruthy();
    }
  });

  it("兜底图标不带品牌色（应随 currentColor）", () => {
    expect(FALLBACK_SOCIAL_ICON.color).toBe("");
  });
});

describe("socialIcons · 填充规则", () => {
  it("「外框 + 内腔」的图标必须声明 evenodd，否则会被填成实心色块", () => {
    // 邮箱信封是唯一这类图标；其余品牌图标都是实心风格，不应声明
    expect(SOCIAL_ICONS.email.fillRule).toBe("evenodd");
  });

  it("其余图标不声明 fillRule（保持 SVG 默认的 nonzero）", () => {
    for (const key of SOCIAL_ICON_KEYS) {
      if (key === "email") continue;
      expect(resolveSocialIcon(key).fillRule, `${key} 不应声明 fillRule`).toBe(
        undefined,
      );
    }
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
