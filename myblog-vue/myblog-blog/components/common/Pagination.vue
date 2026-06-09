<template>
  <div class="pagination">
    <div class="pagination-inner">
      <!-- 总数 + 每页条数选择器 -->
      <div class="pagination-left">
        <span class="total-badge">共 <strong>{{ total }}</strong> 条</span>
        <div class="size-selector">
          <button
            v-for="size in pageSizeOptions"
            :key="size"
            class="size-btn"
            :class="{ active: currentPageSize === size }"
            type="button"
            @click="handleSizeSelect(size)"
          >
            {{ size }}
          </button>
        </div>
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
          <button
            v-else
            class="pager-num"
            :class="{ active: page === currentPage }"
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

      <!-- 跳转 -->
      <div class="pagination-jump">
        <input
          v-model.number="jumpValue"
          class="jump-input"
          type="number"
          :min="1"
          :max="totalPages"
          placeholder="页"
          @keyup.enter="handleJump"
          @blur="handleJump"
        />
        <span class="jump-suffix">/ {{ totalPages }}</span>
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

const pageSizeOptions = [5, 10, 20, 50];

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
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  margin: 28px 0;
}

.pagination-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
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
  color: #94a3b8;
  font-weight: 700;
  margin: 0 2px;
}

.size-selector {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  line-height: 1;
}

.size-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  min-width: 40px;
  border: none;
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  padding: 0 12px;
  box-shadow: inset 1px 0 0 var(--border-color);
  transition: all 0.2s;
}

.size-btn:first-child {
  box-shadow: none;
}

.size-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.size-btn.active {
  background: var(--color-accent);
  color: #ffffff;
  font-weight: 600;
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
  border-color: var(--color-accent);
  color: var(--color-accent);
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
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--bg-hover);
}

.pager-num.active {
  background: var(--bg-card);
  color: #94a3b8;
  border-color: var(--border-color);
  font-weight: 700;
}

html.dark .pager-num.active {
  background: var(--bg-card);
  color: #94a3b8;
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

/* ===== 跳转 ===== */
.pagination-jump {
  display: flex;
  align-items: center;
  gap: 0;
  font-size: 13px;
  color: var(--text-muted);
  white-space: nowrap;
}

.jump-input {
  width: 44px;
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 8px 0 0 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  outline: none;
  transition: border-color 0.2s;
  appearance: textfield;
  -moz-appearance: textfield;
}

.jump-input::-webkit-inner-spin-button,
.jump-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.jump-input:focus {
  border-color: var(--color-accent);
}

.jump-suffix {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-left: none;
  border-radius: 0 8px 8px 0;
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 13px;
}
</style>
