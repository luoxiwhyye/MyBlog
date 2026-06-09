<template>
  <div class="tool-layout">
    <section class="hero-card">
      <div>
        <p class="hero-eyebrow">{{ categoryName }} · 编程工具箱</p>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>

      <div class="hero-actions">
        <el-button class="desktop-hidden" @click="drawerVisible = true">
          打开工具列表
        </el-button>
        <el-button type="primary" plain @click="commandVisible = true">
          快速切换
        </el-button>
      </div>
    </section>

    <div class="layout-grid">
      <div class="desktop-sidebar">
        <ToolSidebar
          :categories="categories"
          :current-tool-id="currentToolId"
          :search="search"
          @update:search="search = $event"
        />
      </div>

      <div class="content-stack">
        <slot />
      </div>
    </div>

    <el-drawer v-model="drawerVisible" title="工具导航" direction="ltr" size="85%">
      <ToolSidebar
        :categories="categories"
        :current-tool-id="currentToolId"
        :search="search"
        @update:search="search = $event"
        @select="drawerVisible = false"
      />
    </el-drawer>

    <el-dialog v-model="commandVisible" title="快速切换工具" width="min(680px, 92vw)" @opened="focusSearch">
      <el-input
        ref="searchInputRef"
        v-model="search"
        placeholder="输入工具名、描述或关键字（支持拼音首字母匹配）"
        clearable
        size="large"
        class="command-search"
        @keydown.arrow-up.prevent="selectPrev"
        @keydown.arrow-down.prevent="selectNext"
        @keyup.enter.prevent="activateSelection"
      />

      <div class="command-list">
        <NuxtLink
          v-for="(tool, index) in matchedTools"
          :key="tool.id"
          :ref="(el) => setItemRef(el, index)"
          :to="getToolPath(tool)"
          class="command-item"
          :class="{ 'command-item--selected': selectedIndex === index }"
          @click="commandVisible = false"
          @mouseenter="selectedIndex = index"
        >
          <div>
            <strong>{{ tool.name }}</strong>
            <small>{{ tool.description }}</small>
          </div>
          <span>{{ getCategoryLabel(tool.category) }}</span>
        </NuxtLink>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { TOOL_LIST, getCategoryById, getToolPath } from "~/config/tools";
import type { ToolCategoryMeta, ToolMeta } from "~/types/tool";

const props = defineProps<{
  title: string;
  description: string;
  currentToolId?: string;
  currentCategoryId?: string;
  categories: ToolCategoryMeta[];
}>();
const { title, description, currentToolId, currentCategoryId, categories } = toRefs(props);

const drawerVisible = ref(false);
const commandVisible = ref(false);
const search = ref("");
const selectedIndex = ref(0);
const searchInputRef = ref<InstanceType<typeof ElInput> | null>(null);
const itemRefs = ref<Record<number, HTMLElement | null>>({});

const setItemRef = (el: unknown, index: number) => {
  if (el) {
    itemRefs.value[index] = el as HTMLElement;
  }
};

const categoryName = computed(() => {
  return getCategoryById(currentCategoryId.value ?? "")?.name ?? "导航";
});

const matchedTools = computed<ToolMeta[]>(() => {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) {
    return TOOL_LIST;
  }

  return TOOL_LIST.filter((tool) =>
    [tool.name, tool.description, ...tool.keywords].join(" ").toLowerCase().includes(keyword),
  );
});

const getCategoryLabel = (categoryId: string) => {
  return getCategoryById(categoryId)?.name ?? categoryId;
};

const handleKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    commandVisible.value = true;
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});

// 键盘导航
const selectPrev = () => {
  selectedIndex.value = Math.max(0, selectedIndex.value - 1);
  scrollToSelected();
};

const selectNext = () => {
  selectedIndex.value = Math.min(matchedTools.value.length - 1, selectedIndex.value + 1);
  scrollToSelected();
};

const activateSelection = () => {
  const tool = matchedTools.value[selectedIndex.value];
  if (tool) {
    navigateTo(getToolPath(tool));
    commandVisible.value = false;
  }
};

const focusSearch = () => {
  selectedIndex.value = 0;
  nextTick(() => {
    const el = searchInputRef.value?.$el?.querySelector("input");
    if (el) (el as HTMLInputElement).focus();
  });
};

const scrollToSelected = () => {
  nextTick(() => {
    itemRefs.value[selectedIndex.value]?.scrollIntoView({ block: "nearest" });
  });
};
</script>

<style scoped>
.tool-layout {
  display: grid;
  gap: 24px;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: 28px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  backdrop-filter: blur(12px);
}

.hero-eyebrow {
  color: var(--text-primary);
  font-weight: 700;
  margin-bottom: 8px;
}

.hero-card h1 {
  font-size: 34px;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.hero-card p {
  color: var(--text-secondary);
  line-height: 1.8;
  max-width: 720px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.layout-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
}

.content-stack {
  display: grid;
  gap: 20px;
}

.desktop-hidden {
  display: none;
}

.command-search {
  margin-bottom: 16px;
}

.command-list {
  display: grid;
  gap: 10px;
  max-height: 60vh;
  overflow-y: auto;
}

.command-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  text-decoration: none;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
}

.command-item:hover,
.command-item--selected {
  border-color: var(--border-color);
  background: var(--bg-hover);
}

.command-item div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.command-item strong {
  color: var(--text-primary);
}

.command-item small,
.command-item span {
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }

  .desktop-sidebar {
    display: none;
  }

  .desktop-hidden {
    display: inline-flex;
  }
}

@media (max-width: 768px) {
  .hero-card {
    flex-direction: column;
    padding: 22px;
    border-radius: 20px;
  }

  .hero-card h1 {
    font-size: 28px;
  }

  .hero-actions {
    flex-wrap: wrap;
  }
}
</style>
