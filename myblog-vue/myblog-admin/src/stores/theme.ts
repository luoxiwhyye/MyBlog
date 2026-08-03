import { defineStore } from 'pinia'
import { ref } from 'vue'

const THEME_KEY = 'admin_theme'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  const apply = (dark: boolean) => {
    isDark.value = dark
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', dark)
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
    }
  }

  const toggle = () => {
    apply(!isDark.value)
  }

  const init = () => {
    if (typeof document === 'undefined') return
    const saved = localStorage.getItem(THEME_KEY)
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
    apply(saved ? saved === 'dark' : prefersDark)
  }

  return { isDark, toggle, init }
})
