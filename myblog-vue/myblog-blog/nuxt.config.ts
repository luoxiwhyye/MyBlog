export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: {
    enabled: false,
  },
  experimental: {
    appManifest: false,
  },
  modules: [
    "@pinia/nuxt",
    "@nuxt/image",
    "@element-plus/nuxt",
    "@vite-pwa/nuxt",
  ],
  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],
  devServer: {
    port: 3001,
    // 监听所有网卡，允许同 WiFi 下手机通过 http://<电脑IP>:3001 访问
    host: process.env.NUXT_HOST || "0.0.0.0",
  },
  css: ["~/assets/css/main.scss"],
  // S-05: ISR 预渲染配置 — 低频变化页面使用 ISR 降低服务端压力
  routeRules: {
    // 欢迎落地页（/）: SSR 渲染（静态落地，不缓存）
    "/": { ssr: true },
    // 主博客（/home）: ISR 缓存 60 秒，过期后陈旧重验证
    "/home": { isr: 60 },
    // 归档页 ISR: 缓存 300 秒
    "/archive": { isr: 300 },
    // 分类页 ISR
    "/category": { isr: 300 },
    "/category/**": { isr: 300 },
    // 标签页 ISR
    "/tag": { isr: 300 },
    "/tag/**": { isr: 300 },
    // 关于页 SWR: 5 分钟缓存 + 10 分钟陈旧重验证
    "/about": { swr: 600 },
    // 搜索页不缓存
    "/search": { ssr: true },
    // 文章详情页 SSR（实时内容）
    "/article/**": { ssr: true },
    // 工具箱页纯客户端渲染（各页面 definePageMeta 中已设 ssr: false）
    "/tools/**": { ssr: false },
    // 上传文件代理 → 后端（手机/局域网访问时图片走本服务转发，避免指向访客自身）
    "/uploads/**": {
      proxy: `${(process.env.NUXT_API_BASE || "http://localhost:3000/api/v1").replace(/\/+$/, "").replace(/\/api\/v1$/, "")}/uploads/**`,
    },
    // Sitemap/RSS 走 Nitro handler，不缓存 Nuxt 侧
  },
  // S-06: PWA 配置
  pwa: {
    registerType: "autoUpdate",
    workbox: {
      globPatterns: ["**/*.{js,css,html,png,svg,ico,webp,woff2}"],
      runtimeCaching: [
        {
          // API 请求: Network First（优先网络，失败回退缓存）
          urlPattern: ({ url }: { url: URL }) =>
            url.pathname.startsWith("/api/"),
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            expiration: { maxEntries: 50, maxAgeSeconds: 300 },
          },
        },
        {
          // 图片: Cache First（优先缓存，后台更新）
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "image-cache",
            // 只缓存 200 响应，避免把 404（如缺失的 _thumb.webp）也缓存，
            // 否则 <img @error> 回退到原图的逻辑永远拿不到真实请求
            cacheableResponse: { statuses: [0, 200] },
            expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
          },
        },
        {
          // 外部字体/图标: Stale While Revalidate
          urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,
          handler: "StaleWhileRevalidate",
          options: { cacheName: "font-cache" },
        },
      ],
    },
    manifest: {
      name: "MyBlog",
      short_name: "MyBlog",
      description: "个人技术博客",
      theme_color: "#1a1a2e",
      background_color: "#ffffff",
      display: "standalone",
      orientation: "portrait-primary",
      icons: [
        { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
        { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      ],
    },
  },
  // ... rest unchanged
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            @use "~/assets/css/abstracts/variables" as *;
            @use "~/assets/css/abstracts/mixins" as *;
            @use "~/assets/css/abstracts/functions" as *;
          `,
        },
      },
    },
    optimizeDeps: {
      include: ["dayjs"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "tools-workers": ["~/utils/tools/processor.worker"],
          },
        },
      },
    },
  },
  runtimeConfig: {
    apiBase: process.env.NUXT_API_BASE || "http://localhost:3000/api/v1",
    public: {
      siteUrl: process.env.NUXT_SITE_URL || "http://localhost:3001",
    },
  },
  app: {
    // 页面 / 布局切换过渡（fade + blur，respect prefers-reduced-motion）
    pageTransition: { name: "page", mode: "out-in" },
    layoutTransition: { name: "layout", mode: "out-in" },
    head: {
      htmlAttrs: {
        lang: "zh-CN",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
      link: [
        // S-04: Core Web Vitals — 预连接关键外部源
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "anonymous",
        },
        { rel: "dns-prefetch", href: "//cravatar.cn" },
      ],
    },
  },
});
