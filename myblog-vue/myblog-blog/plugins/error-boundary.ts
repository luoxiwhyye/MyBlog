/**
 * 全局错误边界插件
 *
 * 统一捕获两类错误并上报（当前 console.error 打点，未来可接监控上报）：
 *   1. Vue 组件生命周期 / 渲染错误（app.config.errorHandler）
 *   2. 未捕获的运行时错误 / Promise 拒绝（window error / unhandledrejection）
 *
 * 必须全端注册（非 .client.ts）：插件主体只做注册，真正的 DOM 事件监听
 * 用 import.meta.client 守卫，SSR 端安全无副作用（避免 SSR 模板引用报错）。
 */

/** 统一上报入口：预留接第三方监控（Sentry / 自建埋点） */
const reportError = (title: string, detail: unknown) => {
  // eslint-disable-next-line no-console
  console.error(`[error-boundary] ${title}`, detail);
};

export default defineNuxtPlugin((nuxtApp) => {
  // Vue 应用级错误（组件创建 / 渲染 / 生命周期 / watcher 抛错）
  nuxtApp.vueApp.config.errorHandler = (err, _instance, info) => {
    reportError(`VueError: ${info}`, err);
  };

  nuxtApp.hook("vue:error", (err, _instance, info) => {
    reportError(`VueError(hook): ${info}`, err);
  });

  // 浏览器层：未捕获运行时错误与 Promise 拒绝（仅客户端）
  if (import.meta.client) {
    const onWindowError = (event: ErrorEvent) => {
      reportError("window:error", {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        col: event.colno,
      });
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError("window:unhandledrejection", event.reason);
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
  }
});
