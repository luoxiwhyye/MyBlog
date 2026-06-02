<template>
  <div class="pagination">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="currentPageSize"
      :page-sizes="[10, 20, 50]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
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

watch(
  () => props.page,
  (newVal) => {
    currentPage.value = newVal;
  },
);

watch(
  () => props.pageSize,
  (newVal) => {
    currentPageSize.value = newVal;
  },
);

const handleSizeChange = (val: number) => {
  emit("update", 1, val);
};

const handleCurrentChange = (val: number) => {
  emit("update", val, currentPageSize.value);
};
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}
</style>
