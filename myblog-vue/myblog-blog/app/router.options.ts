import type { RouterOptions } from "vue-router";

// 滚动恢复：前进/新导航回到页面顶部；返回/前进浏览器历史时恢复到保存的滚动位置。
// 移动端阅读体验：从文章详情页“返回”到列表页时保留原滚动位置，避免跳到顶部。
export default <RouterOptions>{
  scrollBehavior: (_to, _from, savedPosition) => {
    return savedPosition || { top: 0, left: 0 };
  },
};
