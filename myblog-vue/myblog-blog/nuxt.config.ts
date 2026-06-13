export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: {
    enabled: false,
  },
  experimental: {
    appManifest: false,
  },
  modules: ["@pinia/nuxt", "@nuxt/image", "@element-plus/nuxt"],
  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],
  devServer: {
    port: 3001,
  },
  css: ["~/assets/css/main.css"],
  vite: {
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
