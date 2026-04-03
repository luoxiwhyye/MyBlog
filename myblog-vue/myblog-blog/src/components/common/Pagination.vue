<template>
  <div class="pagination">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50]"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  total: number
  page: number
  pageSize: number
}>()

const emit = defineEmits<{
  update: [page: number, pageSize: number]
}>()

const currentPage = ref(props.page)
const pageSize = ref(props.pageSize)

watch(() => props.page, (newVal) => {
  currentPage.value = newVal
})

watch(() => props.pageSize, (newVal) => {
  pageSize.value = newVal
})

const handleSizeChange = (val: number) => {
  emit('update', 1, val)
}

const handleCurrentChange = (val: number) => {
  emit('update', val, pageSize.value)
}
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}
</style>