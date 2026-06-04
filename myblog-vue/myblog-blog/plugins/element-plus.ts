import ElementPlus, {
  ID_INJECTION_KEY,
  ZINDEX_INJECTION_KEY,
} from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(ElementPlus);

  // 提供 SSR 所需的 ID 注入，避免 hydration ID 不匹配警告
  nuxtApp.vueApp.provide(ID_INJECTION_KEY, {
    prefix: Math.floor(Math.random() * 10000),
    current: 0,
  });

  // 提供 SSR 所需的 z-index 注入
  nuxtApp.vueApp.provide(ZINDEX_INJECTION_KEY, { current: 0 });

  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    nuxtApp.vueApp.component(key, component);
  }
});
