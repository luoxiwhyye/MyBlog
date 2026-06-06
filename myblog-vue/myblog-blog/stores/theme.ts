import { defineStore } from "pinia";

const STORAGE_KEY = "blog_theme";

export type ThemeMode = "light" | "dark";

const applyTheme = (mode: ThemeMode) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", mode === "dark");
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>(getInitialTheme());

  const isDark = computed(() => mode.value === "dark");

  const toggle = () => {
    mode.value = mode.value === "dark" ? "light" : "dark";
  };

  const setMode = (value: ThemeMode) => {
    mode.value = value;
  };

  // 同步到 DOM 和 localStorage
  watch(
    mode,
    (value) => {
      applyTheme(value);
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // ignore
      }
    },
    { immediate: true },
  );

  return {
    mode,
    isDark,
    toggle,
    setMode,
  };
});
