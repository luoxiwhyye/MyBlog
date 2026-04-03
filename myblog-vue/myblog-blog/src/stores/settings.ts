import { defineStore } from "pinia";
import { ref } from "vue";
import { settingsApi } from "@/api";
import type { Settings } from "@/types";

export const useSettingsStore = defineStore("settings", () => {
  const settings = ref<Settings>({});
  const loading = ref(false);

  const fetchSettings = async () => {
    loading.value = true;
    try {
      const response = await settingsApi.getAll();
      settings.value = response.data;
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
