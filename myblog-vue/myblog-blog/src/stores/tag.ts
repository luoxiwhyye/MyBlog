import { defineStore } from "pinia";
import { ref } from "vue";
import { tagApi } from "@/api";
import type { Tag } from "@/types";

export const useTagStore = defineStore("tag", () => {
  const tags = ref<Tag[]>([]);
  const loading = ref(false);

  const fetchTags = async () => {
    loading.value = true;
    try {
      const response = await tagApi.getList();
      tags.value = response.data.list;
    } finally {
      loading.value = false;
    }
  };

  return {
    tags,
    loading,
    fetchTags,
  };
});
