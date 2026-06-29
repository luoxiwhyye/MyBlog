import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useSettingsStore } from '@/stores/settings'
import '@/assets/css/main.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

const settingsStore = useSettingsStore(pinia)
settingsStore.fetchSettings().catch((error) => {
  console.error('Failed to load admin settings:', error)
})

app.mount('#app')
