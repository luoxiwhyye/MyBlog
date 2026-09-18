<template>
  <div class="pagination">
    <div class="pagination-inner">
      <!-- 总数 + 每页条数选择器 -->
      <div class="pagination-left">
        <span class="total-badge">共 <strong>{{ total }}</strong> 条</span>
        <el-select
          class="size-select"
          :model-value="currentPageSize"
          size="small"
          :aria-label="'每页条数'"
          @change="handleSizeSelect"
        >
          <el-option
            v-for="size in pageSizeOptions"
            :key="size"
            :label="`${size} 条/页`"
            :value="size"
          />
        </el-select>
      </div>

      <!-- 翻页 -->
      <div class="pagination-pager">
        <button
          class="pager-btn"
          :disabled="currentPage <= 1"
          type="button"
          aria-label="上一页"
          @click="handleCurrentChange(currentPage - 1)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <template v-for="page in visiblePages" :key="page">
          <span v-if="page === '...'" class="pager-ellipsis">...</span>
          <!-- 当前页即是「跳页」入口：直接输入页码即可跳转。
               这样分页区不再需要一个独立的跳转块（原先它占 79px + 间距，
               是移动端四个子项放不下一行的主因）。
               ⚠️ 用 <label> 包裹 input：点击 label（含其 ::after 扩出的命中区）
               会聚焦到内部 input，弥补 input 作为替换元素无法自带伪元素的缺口。 -->
          <label
            v-else-if="page === currentPage"
            class="pager-num active pager-num--input"
            :title="`共 ${totalPages} 页，可输入页码跳转`"
          >
            <input
              v-model.number="jumpValue"
              class="pager-input"
              type="number"
              :min="1"
              :max="totalPages"
              :aria-label="`当前第 ${currentPage} 页，共 ${totalPages} 页，输入页码可跳转`"
              @focus="selectPageInput"
              @keyup.enter="handleJump"
              @blur="handleJump"
            />
          </label>
          <button
            v-else
            class="pager-num"
            type="button"
            @click="handleCurrentChange(page as number)"
          >
            {{ page }}
          </button>
        </template>

        <button
          class="pager-btn"
          :disabled="currentPage >= totalPages"
          type="button"
          aria-label="下一页"
          @click="handleCurrentChange(currentPage + 1)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  total: number;
  page: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  update: [page: number, pageSize: number];
}>();

const currentPage = ref(props.page);
const currentPageSize = ref(props.pageSize);
const jumpValue = ref(props.page);

const pageSizeOptions = [4, 7, 13, 25];

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / currentPageSize.value)));

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const pages: (number | "...")[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
});

watch(
  () => props.page,
  (val) => {
    currentPage.value = val;
    jumpValue.value = val;
  },
);

watch(
  () => props.pageSize,
  (val) => {
    currentPageSize.value = val;
  },
);

const handleSizeSelect = (size: number) => {
  if (size === currentPageSize.value) return;
  currentPageSize.value = size;
  emit("update", 1, size);
};

const handleCurrentChange = (val: number) => {
  if (val < 1 || val > totalPages.value || val === currentPage.value) return;
  currentPage.value = val;
  jumpValue.value = val;
  emit("update", val, currentPageSize.value);
};

const handleJump = () => {
  const target = jumpValue.value;
  if (!target || target < 1 || target > totalPages.value) {
    jumpValue.value = currentPage.value;
    return;
  }
  handleCurrentChange(Math.round(target));
};

/** 聚焦时全选，键入即可覆盖当前页码（否则要先手动删掉原值） */
const selectPageInput = (e: FocusEvent) => {
  (e.target as HTMLInputElement).select();
};
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;
@use "../../assets/css/abstracts/mixins" as *;

.pagination {
  display: flex;
  justify-content: center;
  margin: 28px 0;
  /* 分页在列表页里是 `.pagination-wrap`（flex 容器）的子项。flex 子项默认
     `min-width: auto` = 内容宽 → 窄屏（320px）下整块会超出容器被 `overflow-x: clip`
     裁掉右边一截。显式允许收缩并夹到容器宽度，内部再由 nowrap 的 `.pagination-inner`
     按 min-content 分配（`.size-select` 会自己收窄）。 */
  min-width: 0;
  max-width: 100%;
}

.pagination-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
  /* 同上：它自己也是 `.pagination` 的 flex 子项，`min-width: auto` 会拒绝收缩到
     内容宽以下 → 窄屏时整排越出容器（实测 320px 下 inner 329 > 容器 290，
     左侧被裁掉 10px）。显式归零后由内部子项按各自 min-width 分配。 */
  min-width: 0;
  max-width: 100%;
}

/* ===== 左侧：总数 + size 选择器 ===== */
.pagination-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.total-badge {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
}

.total-badge strong {
  color: var(--text-secondary);
  font-weight: 700;
  margin: 0 2px;
}

.size-select {
  width: 110px;
}

.size-select :deep(.el-select__wrapper) {
  height: 36px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--border-color) inset;
  background: var(--bg-card);
}

.size-select :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--border-color) inset;
}

.size-select :deep(.el-select__selected-item) {
  color: var(--text-muted);
  font-size: 13px;
}

/* ===== 翻页按钮 ===== */
.pagination-pager {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pager-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.pager-btn:hover:not(:disabled) {
  border-color: var(--border-color);
  color: var(--text-primary);
  background: var(--bg-hover);
}

.pager-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pager-num {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.pager-num:hover {
  border-color: var(--border-color);
  color: var(--text-primary);
  background: var(--bg-hover);
}

.pager-num.active {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-color);
  font-weight: 700;
}

html.dark .pager-num.active {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.pager-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--text-muted);
  font-size: 14px;
  user-select: none;
}

/* ===== 当前页的「可输入页码」变体（原独立的跳转块已并入这里） ===== */
.pager-num--input {
  padding: 0;
  cursor: text;
}

.pager-input {
  width: 100%;
  min-width: 36px;
  height: 100%;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: center;
  outline: none;
  /* 去掉 number 类型的上下箭头（移动端会给一个很大的步进器区域，占满整个格子） */
  appearance: textfield;
  -moz-appearance: textfield;
}

.pager-input::-webkit-inner-spin-button,
.pager-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* 与真实页码按钮同款焦点样式（input 自己 :focus-visible 不适用） */
.pager-num--input:focus-within {
  border-color: var(--color-accent-deep);
  box-shadow: 0 0 0 2px var(--color-category-soft);
}

/* ===== 移动端（≤480px）=====
   两件事：
   ① 容器收窄：外边距 28 → $mobile-section-margin、行间距 20 → $mobile-block-gap。
   ② **保证单行**：子项（共 N 条 + 每页条数 / 翻页）在 390px 下本来放不下而折成两行，
      现在跳转块已并入当前页码（省 79px + 一个间距），再靠 nowrap + 可收缩的左侧组
      兜住更窄的机型。
   ⚠️ 控件**视觉尺寸保持 36px**（不在移动端放大到 44px）—— 那会让整块明显变壮、
     并且把子项挤到第二行。触摸目标改用 `@include tap-target` 扩命中区（不影响布局）。
   ⚠️ 命中区不能重叠：`.pagination-pager` 的 gap 必须在移动端提到 8px（±4 恰好相接），
     `.pagination-left` 的 12px 间距足够容纳 ±4。 */
@media (max-width: 480px) {
  .pagination {
    margin: $mobile-section-margin 0;
  }

  .pagination-inner {
    gap: $mobile-block-gap;
    flex-wrap: nowrap;
  }

  .pagination-left {
    min-width: 0;
  }

  .size-select {
    min-width: 0;
  }

  .pagination-pager {
    gap: 8px;
  }

  .total-badge,
  .size-select :deep(.el-select__wrapper),
  .pager-btn,
  .pager-num,
  .pager-ellipsis {
    @include tap-target(4px, 4px);
  }
}
</style>
