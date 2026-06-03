<template>
  <div v-if="toolMeta">
    <ToolLayout
      :title="toolMeta.name"
      :description="toolMeta.description"
      :current-tool-id="toolMeta.id"
      :current-category-id="toolMeta.category"
      :categories="categories"
    >
      <ClientOnly>
        <ToolWorkbench :key="`${toolMeta.category}-${toolMeta.id}`" :tool="toolMeta" />
      </ClientOnly>
    </ToolLayout>
  </div>

  <div v-else class="not-found">
    <el-result icon="warning" title="工具不存在" sub-title="请从工具箱首页重新选择可用工具。">
      <template #extra>
        <NuxtLink to="/tools" class="back-link">返回工具箱</NuxtLink>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { TOOL_CATEGORIES, getToolByRoute } from "~/config/tools";

definePageMeta({
  layout: "tools",
});

const route = useRoute();
const categories = TOOL_CATEGORIES;

const categoryParam = computed(() => String(route.params.category ?? ""));
const toolParam = computed(() => String(route.params.tool ?? ""));
const toolMeta = computed(() => getToolByRoute(categoryParam.value, toolParam.value));

useSeoMeta({
  title: () => (toolMeta.value ? `${toolMeta.value.name} - 编程工具箱` : "工具不存在"),
  description: () =>
    toolMeta.value
      ? `${toolMeta.value.description} MyBlog 工具箱页面保持客户端渲染，不影响博客主体 SSR。`
      : "MyBlog 编程工具箱",
  robots: "index,follow",
});
</script>

<style scoped>
.not-found {
  padding: 40px 0;
}

.back-link {
  display: inline-flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 999px;
  background: #0f766e;
  color: #ffffff;
  text-decoration: none;
}
</style>
