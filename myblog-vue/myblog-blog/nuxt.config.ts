export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: {
    enabled: false,
  },
  experimental: {
    appManifest: false,
  },
  modules: ["@pinia/nuxt"],
  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],
  devServer: {
    port: 3001,
  },
  css: [
    "element-plus/dist/index.css",
    "highlight.js/styles/github.css",
    "~/assets/css/main.css",
  ],
  vite: {
    optimizeDeps: {
      include: ["dayjs"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "element-plus": ["element-plus"],
            "element-icons": ["@element-plus/icons-vue"],
            "highlight-js": ["highlight.js"],
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
    head: {
      htmlAttrs: {
        lang: "zh-CN",
      },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
});
