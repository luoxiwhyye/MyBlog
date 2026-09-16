import type { RouterOptions } from "vue-router";

// 滚动恢复：前进/新导航回到页面顶部；返回/前进浏览器历史时恢复到保存的滚动位置。
// 移动端阅读体验：从文章详情页“返回”到列表页时保留原滚动位置，避免跳到顶部。
export default <RouterOptions>{
  scrollBehavior: (to, _from, savedPosition) => {
    if (savedPosition) return savedPosition;

    // 片段（hash）必须单独处理，而且要「自己算偏移」：
    // 原生 `<a href="#x">` 会先让浏览器做一次锚点滚动，紧接着触发一次 vue-router 导航；
    // 若这里仍然返回 { top: 0 }，就会在几十毫秒后把页面拉回顶部 —— 表现为站内锚点
    // 「有时能跳、有时跳回顶部」（工具页的分类胶囊条曾因此完全失效）。
    if (to.hash) {
      if (typeof document === "undefined") return false;
      let id = to.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        // 非法百分号编码：按原样当作 id 使用
      }
      // 用 getElementById 而不是 querySelector：id 可能含 `:` `.` 等选择器特殊字符
      const el = document.getElementById(id);
      // 元素尚未渲染（异步组件 / 跨页导航）时保持原位，而不是跳到顶部
      if (!el) return false;
      // top 的语义是「元素顶部 - top」，所以把元素自己的 scroll-margin-top 传进去
      // 就等价于原生锚点行为 —— 避让距离仍然只由 CSS 决定（含响应式媒体查询）。
      return {
        el,
        top: parseFloat(getComputedStyle(el).scrollMarginTop) || 0,
      };
    }

    return { top: 0, left: 0 };
  },
};
