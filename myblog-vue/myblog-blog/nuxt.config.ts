export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: {
    enabled: false,
  },
  experimental: {
    appManifest: false,
  },
  modules: ["@pinia/nuxt", "@element-plus/nuxt", "@vite-pwa/nuxt"],
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
  // S-05: 预渲染 / 缓存策略
  //
  // ⚠️ 这里曾经给 /home、/archive、/category、/tag、/about 配了 isr / swr，现已全部改为实时 SSR。
  //    原因：Nitro 的 ISR / SWR 缓存键是**完整请求 URL（含 host）**。当同一个站点能用多个
  //    域名访问时（如 blog.example.com、www.example.com、裸域并存 —— 备案与用户习惯都支持
  //    这种用法），每个 host 会各自缓存一份、各自决定何时过期，于是出现
  //    「某个域名显示的还是旧内容、另一个域名已经是新的」。
  //    2026-09-19 实际踩到：分类页在一个域名下只显示 2 个分类、另两个域名显示全部 5 个，
  //    因为那个 host 的缓存是「只有 2 个分类有已发布文章」时渲染的。
  //    多域名并存不该被缓存机制破坏一致性，故改为全站实时 SSR；个人博客流量下 SSR 开销可忽略。
  //    将来若流量上来确实需要缓存，请优先选「与 host 无关」的方案（外层 CDN 按路径缓存，
  //    或把多域名 301 收敛到一个），而不要直接恢复 isr / swr。
  routeRules: {
    // 欢迎落地页（/）: SSR 渲染（静态落地，不缓存）
    "/": { ssr: true },
    // 主博客（/home）
    "/home": { ssr: true },
    // 归档页
    "/archive": { ssr: true },
    // 分类页
    "/category": { ssr: true },
    "/category/**": { ssr: true },
    // 标签页
    "/tag": { ssr: true },
    "/tag/**": { ssr: true },
    // 关于页
    "/about": { ssr: true },
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
