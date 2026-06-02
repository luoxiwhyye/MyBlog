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

  return {
    settings,
    loading,
    loaded,
    fetchSettings,
    ensureSettings,
    getSetting,
  };
});
