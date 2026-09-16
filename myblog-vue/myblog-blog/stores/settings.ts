import { defineStore } from "pinia";
import { ref } from "vue";
import { settingsApi } from "~/api";
import type { Settings } from "~/types";

export const useSettingsStore = defineStore("settings", () => {
  const settings = ref<Settings>({});
  const loading = ref(false);
  const loaded = ref(false);
  let pendingRequest: Promise<Settings> | null = null;

  const fetchSettings = async (force = false) => {
    if (!force && loaded.value) {
      return settings.value;
    }

    if (pendingRequest) {
      return pendingRequest;
    }

    loading.value = true;
    pendingRequest = settingsApi
      .getAll()
      .then((response) => {
        // 无效响应按空配置处理。
        const data = response?.data;
        if (!data || typeof data !== "object") {
          console.warn("[settings] 未取到配置对象，已按空配置处理", data);
          settings.value = {};
        } else {
          settings.value = data;
        }
        loaded.value = true;
        return settings.value;
      })
      .finally(() => {
        loading.value = false;
        pendingRequest = null;
      });

    return pendingRequest;
  };

  const ensureSettings = () => fetchSettings(false);

  const getSetting = (key: string) => {
    return settings.value?.[key]?.value || "";
  };

  // 提取不在预设键列表中的自定义配置。
  const getCustomSettings = (presetKeys: string[] = []) => {
    const presetSet = new Set(presetKeys);
    return Object.entries(settings.value)
      .filter(([key]) => !presetSet.has(key))
      .map(([key, item]) => ({
        key,
        value: item?.value || "",
        type: item?.type || "text",
        description: item?.description || "",
      }));
  };

  return {
    settings,
    loading,
    loaded,
    fetchSettings,
    ensureSettings,
    getSetting,
    getCustomSettings,
  };
});
