import { defineStore } from "pinia";
import { ref } from "vue";
import { categoryApi } from "@/api";
import type { Category } from "@/types";

export const useCategoryStore = defineStore("category", () => {
  const categories = ref<Category[]>([]);
  const loading = ref(false);

  const fetchCategories = async () => {
    loading.value = true;
    try {
      const pageSize = 100;
      let page = 1;
      let total = 0;
      const allCategories: Category[] = [];

      do {
        const response = await categoryApi.getList({ page, pageSize });
        const list = response.data.list || [];
        total = response.data.total || 0;
        allCategories.push(...list);
        page += 1;
      } while (allCategories.length < total);

      categories.value = allCategories;
    } finally {
      loading.value = false;
    }
  };

  return {
    categories,
    loading,
    fetchCategories,
  };
});
