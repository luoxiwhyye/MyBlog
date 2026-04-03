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
      const response = await categoryApi.getList();
      categories.value = response.data.list;
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
