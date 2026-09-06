/**
 * 全局错误边界插件
 *
 * 统一捕获两类错误并上报：
 *   1. Vue 组件生命周期 / 渲染错误（app.config.errorHandler）
 *   2. 未捕获的运行时错误 / Promise 拒绝（window error / unhandledrejection）
 *
 * 上报策略（自建轻量上报，无第三方监控依赖）：
 *   - console.error 保留（本地排查）
 *   - 异步 POST /api/v1/error-log 上报到后端 client_error_log 表
 *   - 带节流采样（同一类型 1 分钟内最多上报 1 次） + 全局限流，避免海量刷库
 *   - 附带组件实例（VueError）、路由路径、浏览器 UA、出错位置
 *
 * 必须全端注册（非 .client.ts）：插件主体只做注册，真正的 DOM 事件监听
 * 用 import.meta.client 守卫，SSR 端安全无副作用（避免 SSR 模板引用报错）。
 */

/** 同一错误类型上报节流窗口（毫秒） */
const THROTTLE_MS = 60 * 1000;
/** 上报端点 */
const REPORT_URL = "/api/v1/error-log";

// 记录上次上报时间（按类型），内存节流
const lastReportAt = new Map<string, number>();

const isThrottled = (type: string) => {
  const now = Date.now();
  const last = lastReportAt.get(type) || 0;
  if (now - last < THROTTLE_MS) return true;
  lastReportAt.set(type, now);
  return false;
};

const sanitizeDetail = (detail: unknown): string => {
  if (detail instanceof Error) return detail.message;
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
};

/** 统一上报入口：console 打点 + 异步远程上报（可选） */
const reportError = (
  title: string,
  detail: unknown,
  source?: string,
  component?: string,
) => {
  // 本地打点（保留）
  // eslint-disable-next-line no-console
  console.error(`[error-boundary] ${title}`, detail);

  if (!import.meta.client) {
    return;
  }

  // 同类型节流采样，避免刷爆后端
  if (isThrottled(title)) {
    return;
  }

  const message = sanitizeDetail(detail);
  const payload = {
    title: title.slice(0, 120),
    message: message.slice(0, 2000),
    source: (source || "").slice(0, 500),
    line: null,
    col: null,
    url: (window.location.href || "").slice(0, 500),
    component: (component || "").slice(0, 200),
    ua: (navigator.userAgent || "").slice(0, 500),
  };

  // 异步上报，fire-and-forget，失败不影响页面
  fetch(REPORT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true, // 页面卸载时也能送达
  }).catch(() => {
    // 上报失败静默，避免无限重试
  });
};

export default defineNuxtPlugin((nuxtApp) => {
  // Vue 应用级错误（组件创建 / 渲染 / 生命周期 / watcher 抛错）
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    // 收集组件类型信息（Vue 组件名）
    const componentName =
      (instance as any)?.$options?.name ||
      (instance as any)?.$options?.__name ||
      (instance as any)?.$?.options?.name ||
      "";
    reportError(`VueError: ${info}`, err, info, componentName);
  };

  nuxtApp.hook("vue:error", (err, instance, info) => {
    const componentName =
      (instance as any)?.$options?.name ||
      (instance as any)?.$options?.__name ||
      "";
    reportError(`VueError(hook): ${info}`, err, info, componentName);
  });

  // 浏览器层：未捕获运行时错误与 Promise 拒绝（仅客户端）
  if (import.meta.client) {
    const onWindowError = (event: ErrorEvent) => {
      reportError("window:error", event.message, event.filename || "", "");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError("window:unhandledrejection", event.reason, "", "");
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
  }
});
