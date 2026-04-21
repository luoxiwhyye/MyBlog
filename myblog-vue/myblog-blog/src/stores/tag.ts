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
      const pageSize = 100;
      let page = 1;
      let total = 0;
      const allTags: Tag[] = [];

      do {
        const response = await tagApi.getList({ page, pageSize });
        const list = response.data.list || [];
        total = response.data.total || 0;
        allTags.push(...list);
        page += 1;
      } while (allTags.length < total);

      tags.value = allTags;
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
