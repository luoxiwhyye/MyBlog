import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import '@/assets/css/main.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
// 传入中文语言包：Element Plus 的内置文案（分页「共 N 条」、下拉「无匹配数据」、
// 日期选择器等）才会是中文，否则会保持英文默认值
app.use(ElementPlus, { locale: zhCn })

// 应用持久化的主题（亮/暗），须在挂载前设置 html.dark
useThemeStore(pinia).init()

const settingsStore = useSettingsStore(pinia)
settingsStore.fetchSettings().catch((error) => {
  console.error('Failed to load admin settings:', error)
})

app.mount('#app')
