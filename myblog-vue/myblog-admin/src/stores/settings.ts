import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setting } from '@/api'

interface SettingItem {
  value: string
  type: 'text' | 'image' | 'html' | 'boolean'
  description: string
}

const applySiteFavicon = (faviconUrl?: string) => {
  if (!faviconUrl || typeof document === 'undefined') {
    return
  }

  let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
  if (!faviconLink) {
    faviconLink = document.createElement('link')
    faviconLink.rel = 'icon'
    document.head.appendChild(faviconLink)
  }

  faviconLink.type = 'image/x-icon'
  faviconLink.href = faviconUrl
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Record<string, SettingItem>>({})
  const loading = ref(false)

  const fetchSettings = async () => {
    loading.value = true
    try {
      const response = await setting.getList()
      settings.value = response.data || {}
      applySiteFavicon(settings.value.site_favicon?.value)
    } finally {
      loading.value = false
    }
  }

  const getSetting = (key: string) => settings.value[key]?.value || ''

  // 返回“自定义配置”列表：即除去预设 schema 键后的全部 Key-Value 项
  const getCustomSettings = (presetKeys: string[] = []) => {
    const presetSet = new Set(presetKeys)
    return Object.entries(settings.value)
      .filter(([key]) => !presetSet.has(key))
      .map(([key, item]) => ({
        key,
        value: item.value,
        type: item.type,
        description: item.description,
      }))
  }

  return {
    settings,
    loading,
    fetchSettings,
    getSetting,
    getCustomSettings,
  }
})
