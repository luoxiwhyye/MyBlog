import { defineStore } from "pinia";

/**
 * 主题（亮 / 暗）状态
 *
 * ## 为什么用 cookie 而不是 localStorage
 *
 * cookie 会随请求发送，**服务端也能读到**，因此 SSR 渲染出的初始状态与客户端
 * 一致；而 localStorage 在服务端不可见。
 *
 * 这一点很关键。原先用 localStorage 时，服务端只能恒为 light，该值会随 Nuxt
 * payload 下发并在**水合时覆盖**客户端读到的偏好，随后 watch 又把 light 写回
 * 存储——表现为「切成暗色、刷新即失效，选择还被静默抹除」。
 *
 * ## 只有「显式选择」才写入 cookie
 *
 * 用户在界面上切过主题才落 cookie；仅由系统偏好推导出的值不落盘。这样
 * 「跟随系统偏好」才真正成立（系统切到暗色时，未做过选择的访客会跟着变），
 * 代价是这类访客的 SSR 仍为 light，首屏会有一瞬过渡。
 *
 * ## 两处必须配合的地方
 *
 * 1. `useHead` 直出 `html.dark`：让偏好暗色的访客从 SSR 就是暗色，消除首屏闪白。
 * 2. `hydrateFromStorage()` 必须在水合**之后**调用（见 `plugins/theme.client.ts`）：
 *    水合会用 payload 覆盖 store，若在水合前读取偏好会被立刻盖回去。
 */

const STORAGE_KEY = "blog_theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 一年

export type ThemeMode = "light" | "dark";

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === "light" || value === "dark";

/** 系统偏好；服务端无法判断，回退 light */
const systemPreference = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

/** 旧版本把偏好写在 localStorage，读取用于一次性迁移 */
const readLegacyPreference = (): ThemeMode | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const useThemeStore = defineStore("theme", () => {
  const cookie = useCookie<ThemeMode | null>(STORAGE_KEY, {
    default: () => null,
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });

  /**
   * 初始主题：**只认 cookie**。
   *
   * 刻意不在这里读系统偏好或旧版 localStorage —— 那两者只有客户端能读，
   * 会导致「服务端渲染 light、客户端渲染 dark」的 hydration 不匹配
   * （表现为控制台报 ThemeToggle 的属性不一致）。
   * 它们统一放到水合之后的 `hydrateFromStorage()` 里校正。
   */
  const mode = ref<ThemeMode>(
    isThemeMode(cookie.value) ? cookie.value : "light",
  );

  const isDark = computed(() => mode.value === "dark");

  /** 写入 cookie —— 只应由「用户的显式选择」触发 */
  const persist = (value: ThemeMode) => {
    cookie.value = value;
  };

  const setMode = (value: ThemeMode) => {
    mode.value = value;
    persist(value);
  };

  const toggle = () => {
    setMode(mode.value === "dark" ? "light" : "dark");
  };

  /**
   * 水合之后校正主题。
   *
   * 水合会用 SSR payload 覆盖 store（服务端读不到 localStorage，因此回退 light），
   * 所以「旧版偏好」与「系统偏好」都必须在这里重新应用一次，否则会被一直盖成 light。
   */
  const hydrateFromStorage = () => {
    if (typeof window === "undefined") return;

    // 旧版 localStorage 偏好：采纳并迁移为 cookie（这是用户过去显式选过的）
    const legacy = readLegacyPreference();
    if (legacy) {
      setMode(legacy);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // 隐私模式等场景下忽略
      }
      return;
    }

    // 从未显式选择过 → 跟随系统（不写 cookie，保留「跟随系统」语义）
    if (!isThemeMode(cookie.value)) {
      mode.value = systemPreference();
    }
  };

  // 客户端同步 html.dark（SSR 由下方 useHead 直出，二者最终一致）
  watch(
    mode,
    (value) => {
      if (typeof document === "undefined") return;
      document.documentElement.classList.toggle("dark", value === "dark");
    },
    { immediate: true },
  );

  // SSR 直出 html.dark：避免偏好暗色的访客看到首屏闪白。
  // 取值来自 cookie，服务端与客户端一致，不会造成 hydration 不匹配。
  useHead({
    htmlAttrs: {
      class: computed(() => (isDark.value ? "dark" : undefined)),
    },
  });

  return {
    mode,
    isDark,
    toggle,
    setMode,
    hydrateFromStorage,
  };
});
