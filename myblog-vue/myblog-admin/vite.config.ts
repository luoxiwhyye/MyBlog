import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 监听所有网卡，允许同 WiFi 下手机通过 http://<电脑IP>:5173 访问
    host: '0.0.0.0',
    proxy: {
      // 开发环境 API 走 Vite 代理：手机访问时请求发往 Vite(5173) 再转发到本机后端，
      // 避免浏览器端把 localhost 解析到手机自身导致失败，同时规避跨域。
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@/assets/css/abstracts/variables" as *;
          @use "@/assets/css/abstracts/mixins" as *;
        `,
      },
    },
  },
})
