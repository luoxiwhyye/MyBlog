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

  return {
    settings,
    loading,
    fetchSettings,
    getSetting,
  }
})
