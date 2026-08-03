// @element-plus/nuxt 模块已自动处理 SSR ID/ZIndex 注入键的 provide，
// 此处不再手动 provide，避免 "App already provides property" 警告。
// 图标组件请在各 .vue 文件中按需 import（如 import { Search } from "@element-plus/icons-vue"），
// 不再全局注册以免引发 293 个组件的启动开销。
import ElementPlus from "element-plus";
import "element-plus/theme-chalk/dark/css-vars.css";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(ElementPlus);
});
