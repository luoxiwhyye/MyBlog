<template>
  <aside class="sidebar">
    <div v-if="showSearch" class="sidebar-search">
      <el-input
        :model-value="search"
        placeholder="筛选工具"
        clearable
        @update:model-value="emit('update:search', $event)"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <div class="sidebar-groups">
      <section v-for="category in filteredCategories" :key="category.id" class="sidebar-group">
        <header>
          <el-icon>
            <component :is="category.icon" />
          </el-icon>
          <span>{{ category.name }}</span>
        </header>

        <NuxtLink
          v-for="tool in category.tools"
          :key="tool.id"
          :to="getToolPath(tool)"
          class="sidebar-link"
          :class="{ 'sidebar-link--active': currentToolId === tool.id }"
          @click="emit('select')"
        >
          <el-icon>
            <component :is="tool.icon" />
          </el-icon>
          <div>
            <strong>{{ tool.name }}</strong>
            <small>{{ tool.description }}</small>
          </div>
        </NuxtLink>
      </section>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { Search } from "@element-plus/icons-vue";
import { getToolPath } from "~/config/tools";
import type { ToolCategoryMeta } from "~/types/tool";

const props = withDefaults(
  defineProps<{
    categories: ToolCategoryMeta[];
    currentToolId?: string;
    search?: string;
    showSearch?: boolean;
  }>(),
  {
    currentToolId: "",
    search: "",
    showSearch: true,
  },
);
const { categories, currentToolId, search, showSearch } = toRefs(props);

const emit = defineEmits<{
  "update:search": [value: string];
  select: [];
}>();

const filteredCategories = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) {
    return categories.value;
  }

  return categories.value
    .map((category) => ({
      ...category,
      tools: category.tools.filter((tool) =>
        [tool.name, tool.description, ...tool.keywords]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      ),
    }))
    .filter((category) => category.tools.length);
});
</script>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-search {
  z-index: 1;
}

.sidebar-groups {
  display: grid;
  gap: 16px;
}

.sidebar-group {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  padding: 16px;
  backdrop-filter: blur(12px);
}

.sidebar-group header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.sidebar-link {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  text-decoration: none;
  color: var(--text-secondary);
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.sidebar-link + .sidebar-link {
  margin-top: 8px;
}

.sidebar-link:hover,
.sidebar-link--active {
  background: var(--bg-hover);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.sidebar-link div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-link small {
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
