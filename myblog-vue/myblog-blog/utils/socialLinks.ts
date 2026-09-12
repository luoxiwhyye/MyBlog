/**
 * 社交链接（`social_links` 设置项）的解析与行为判定
 *
 * 数据结构：JSON 数组 `[{ name, url, icon?, action? }]`，存于 `setting` 表的文本字段，
 * **后端不做结构校验**（Express 与 Spring Boot 均无相关逻辑），因此字段扩展只需前后台
 * 各自读写，无需改接口。
 *
 * 与 `utils/socialIcons.ts` 的分工：
 *   - `socialIcons.ts` 负责「icon 语义 key → SVG path / 品牌色」
 *   - 本文件负责「条目解析」与「点击行为（跳转 / 复制）判定」
 *
 * 该逻辑原本在三处页面各写了一遍（home / index / about），故抽到此处统一。
 */

/** 点击行为：`link` 新标签页跳转（默认）；`copy` 复制 url 到剪贴板 */
export type SocialLinkAction = "link" | "copy";

export interface SocialLinkItem {
  name: string;
  url: string;
  /** 图标语义 key（见 `socialIcons.ts` 的 `SOCIAL_ICONS`）；可空 */
  icon?: string;
  /** 点击行为；缺省时按 `resolveSocialAction` 推导 */
  action?: SocialLinkAction;
}

/**
 * 解析 `social_links` 设置值。
 * 非法 JSON、非数组、或缺少 `name`/`url` 的条目一律丢弃（与后台的保存规则一致）。
 */
export const parseSocialLinks = (raw?: string | null): SocialLinkItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item && typeof item.name === "string" && item.name && item.url,
      )
      .map((item) => ({
        name: String(item.name),
        url: String(item.url),
        // 保留原始值，仅在存在且非空时带上，避免写出 `icon: undefined`
        ...(typeof item.icon === "string" && item.icon
          ? { icon: item.icon }
          : {}),
        ...(item.action === "copy" || item.action === "link"
          ? { action: item.action as SocialLinkAction }
          : {}),
      }));
  } catch {
    return [];
  }
};

/**
 * 判定条目的点击行为。
 *
 * 规则：**显式配置优先**；未配置时，「邮箱」这类链接默认复制 —— 邮箱地址用跳转并没有
 * 意义（多数浏览器会把它当相对路径而非 `mailto:`，点了就是 404），复制才是符合直觉的动作。
 * 其余平台默认跳转到主页。
 */
export const resolveSocialAction = (item: SocialLinkItem): SocialLinkAction => {
  if (item.action) return item.action;
  return item.icon === "email" ? "copy" : "link";
};
