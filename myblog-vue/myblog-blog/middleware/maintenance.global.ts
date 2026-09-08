/**
 * 全站维护模式全局中间件
 *
 * 当 site_maintenance 设置为 'true' 时，将非维护页的所有路由重定向到
 * /maintenance。白名单：
 *   - /maintenance 本身（避免死循环）
 *   - URL 带 ?bypass=maintenance 参数（博主预览白名单）
 *
 * 在 SSR 与客户端都会执行；维护开关来自 settings store（已缓存）。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // 维护页自身与静态资源（/api、/uploads、/_nuxt 等以点/斜杠开头）不拦截
  if (to.path === "/maintenance" || to.path.startsWith(".")) return;

  // 白名单：?bypass=maintenance（博主预览用）
  if (to.query.bypass === "maintenance") return;

  const settingsStore = useSettingsStore();

  // 触发设置加载（带缓存，二次进入不会重复请求）
  await settingsStore.ensureSettings();

  if (settingsStore.getSetting("site_maintenance") === "true") {
    return navigateTo("/maintenance");
  }
});
