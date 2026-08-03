/**
 * 国际化（i18n）工具 — 预备基础设施
 *
 * 当前默认语言为中文。后续若需国际化：
 *   1. 安装 @nuxtjs/i18n 模块
 *   2. 将 locales/ 中的文案迁移到模块的 messages
 *   3. 替换各处硬编码中文为 $t('key') 调用
 */

import { zh, en } from "~/locales";

type LocaleMessages = typeof zh;

const messages: Record<"zh" | "en", LocaleMessages> = { zh, en };

let currentLocale: "zh" | "en" = "zh";

export const useI18n = () => {
  const locale = ref<"zh" | "en">(currentLocale);

  const t = (
    key: string,
    interpolations?: Record<string, string | number>,
  ): string => {
    const keys = key.split(".");
    let result: unknown = messages[locale.value];
    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    let text = typeof result === "string" ? result : key;
    if (interpolations) {
      for (const [k, v] of Object.entries(interpolations)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };

  const setLocale = (lang: "zh" | "en") => {
    currentLocale = lang;
    locale.value = lang;
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    }
  };

  return { locale, t, setLocale };
};
