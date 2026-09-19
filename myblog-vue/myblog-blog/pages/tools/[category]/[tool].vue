<template>
  <FeatureDisabled v-if="featureDisabled" feature="工具箱" />

  <div v-else-if="toolMeta">
    <ToolLayout
      :title="toolMeta.name"
      :description="toolMeta.description"
      :current-tool-id="toolMeta.id"
      :current-category-id="toolMeta.category"
      :categories="categories"
    >
      <ToolWorkbench :key="`${toolMeta.category}-${toolMeta.id}`" :tool="toolMeta" />
    </ToolLayout>
  </div>

  <div v-else class="not-found">
    <EmptyState
      message="工具不存在"
      description="请从工具箱首页重新选择可用工具。"
      action-text="返回工具箱"
      action-to="/tools"
    />
  </div>
</template>

<script setup lang="ts">
import { TOOL_CATEGORIES, getToolByRoute } from "~/config/tools";

definePageMeta({
  layout: "tools",
  ssr: false,
});

const settingsStore = useSettingsStore();

// 工具页为客户端渲染，设置在 layout/tools.vue 已 await 加载
const featureDisabled = computed(
  () => settingsStore.getSetting("enable_tools") === "false",
);

const route = useRoute();
const categories = TOOL_CATEGORIES;

const categoryParam = computed(() => String(route.params.category ?? ""));
const toolParam = computed(() => String(route.params.tool ?? ""));
const toolMeta = computed(() => getToolByRoute(categoryParam.value, toolParam.value));

// 记录「最近使用」：写入 localStorage，供工具箱首页快捷区展示。
// 用 watch 而非 onMounted，保证在工具间切换（组件复用）时也能记录。
const { recordRecentTool } = useRecentTools();
watch(
  () => toolMeta.value?.id,
  (id) => {
    if (id) recordRecentTool(id);
  },
  { immediate: true },
);

useSeoMeta({
  title: () => (toolMeta.value ? `${toolMeta.value.name} - 编程工具箱` : "工具不存在"),
  description: () =>
    toolMeta.value
      ? `${toolMeta.value.description}工具箱，提供在线使用的辅助编程工具。`
      : "MyBlog 编程工具箱",
  robots: "index,follow",
});
</script>

<style lang="scss" scoped>
.not-found {
  padding: 40px 0;
}
</style>
