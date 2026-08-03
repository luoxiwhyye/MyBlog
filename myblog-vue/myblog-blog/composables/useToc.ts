/**
 * 文章目录 (TOC) 自动生成 composable
 *
 * 对标 F-03：基于 markdown 内容提取标题层级，生成锚点导航。
 *
 * 用法：
 *   const { tocItems, generateToc, scrollToHeading } = useToc();
 *   // 在文章加载后：
 *   watch(article, (val) => { if (val?.content) generateToc(val.content); });
 */

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export const useToc = () => {
  const tocItems = ref<TocItem[]>([]);

  /**
   * 从 HTML/Markdown 内容中提取 h1-h3 标题，生成目录。
   * 支持已经渲染为 HTML 的文章内容。
   */
  const generateToc = (content: string) => {
    if (!content) {
      tocItems.value = [];
      return;
    }

    // 匹配 h1~h3 标签（已渲染的 HTML）
    const headingRegex = /<h([1-3])(?:\s[^>]*)?>(.+?)<\/h\1>/gi;
    const items: TocItem[] = [];
    const usedIds = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = Number(match[1]);
      const rawText = match[2].replace(/<[^>]+>/g, "").trim();
      if (!rawText) continue;

      // 生成唯一锚点 ID
      let id = rawText
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // 处理重名标题
      if (usedIds.has(id)) {
        let suffix = 2;
        while (usedIds.has(`${id}-${suffix}`)) suffix++;
        id = `${id}-${suffix}`;
      }
      usedIds.add(id);

      items.push({ id, text: rawText, level });
    }

    tocItems.value = items;
  };

  /**
   * 滚动到指定标题
   */
  const scrollToHeading = (id: string) => {
    if (!process.client) return;

    const target = document.getElementById(id);
    if (target) {
      const offset = 80; // 固定导航栏高度
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return {
    tocItems,
    generateToc,
    scrollToHeading,
  };
};
