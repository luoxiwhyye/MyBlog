import { defineStore } from "pinia";
import { ref } from "vue";
import { settingsApi } from "@/api";
import type { Settings } from "@/types";

const applySiteFavicon = (faviconUrl?: string) => {
  if (!faviconUrl || typeof document === "undefined") {
    return;
  }

  let faviconLink = document.querySelector("link[rel*='icon']");
  if (!faviconLink) {
    faviconLink = document.createElement("link");
    faviconLink.setAttribute("rel", "icon");
    document.head.appendChild(faviconLink);
  }

  faviconLink.setAttribute("type", "image/x-icon");
  faviconLink.setAttribute("href", faviconUrl);
};

export const useSettingsStore = defineStore("settings", () => {
  const settings = ref<Settings>({});
  const loading = ref(false);

  const fetchSettings = async () => {
    loading.value = true;
    try {
      const response = await settingsApi.getAll();
      settings.value = response.data;
      applySiteFavicon(settings.value.site_favicon?.value);
    } finally {
      loading.value = false;
    }
  };

  const getSetting = (key: string) => {
    return settings.value[key]?.value || "";
  };

  return {
    settings,
    loading,
    fetchSettings,
    getSetting,
  };
});
