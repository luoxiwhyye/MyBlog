/**
 * 主题初始化（客户端）
 *
 * ⚠️ 必须挂在 `app:suspense:resolve`，**不能挂 `app:mounted`**：
 * Nuxt 的根组件包在 `<Suspense>` 里，`app:mounted` 会在**水合完成之前**触发
 * （实测：app:mounted 时 store 已是校正后的值，紧接着才报 hydration mismatch）。
 * 而 `app:suspense:resolve` 晚于水合，此时改 store 只是一次普通的响应式更新，
 * 不会与 SSR 输出冲突。
 *
 * 为什么需要「水合后再校正」：
 * 初始主题只认 cookie（保证服务端/客户端一致）；而「系统偏好」与「旧版
 * localStorage 偏好」只有客户端能读到，只能在水合后补上。
 * 详见 stores/theme.ts 的 hydrateFromStorage()。
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:suspense:resolve", () => {
    useThemeStore().hydrateFromStorage();
  });
});
