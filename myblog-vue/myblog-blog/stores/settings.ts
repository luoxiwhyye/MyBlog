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
        settings.value = response.data;
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
    return settings.value[key]?.value || "";
  };

  // 后端返回的是完整 Key-Value 配置；预设 schema 之外的键即“自定义配置”。
  // 这里按需抽取为数组，配合 presetKeys 过滤出动态项。
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
