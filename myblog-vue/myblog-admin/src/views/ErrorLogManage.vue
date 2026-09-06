<template>
  <div class="error-log-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>错误监控日志</h3>
          <div class="header-btns">
            <el-button :icon="Refresh" circle @click="fetchList" title="刷新" />
            <el-button type="danger" :disabled="!pagination.total" @click="handleClear">
              清空日志
            </el-button>
          </div>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filters">
          <el-form-item label="类型">
            <el-select v-model="filters.type" placeholder="全部类型" clearable style="width: 180px" @change="handleSearch">
              <el-option label="VueError" value="VueError" />
              <el-option label="window:error" value="window:error" />
              <el-option label="window:unhandledrejection" value="window:unhandledrejection" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 日志列表 -->
      <el-table :data="logList" v-loading="loading" style="width: 100%" row-key="id">
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="类型" width="200">
          <template #default="scope">
            <el-tag :type="getTypeType(scope.row.title)">{{ scope.row.title }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="错误信息" prop="message" min-width="240" show-overflow-tooltip />
        <el-table-column label="来源" prop="source" width="180" show-overflow-tooltip />
        <el-table-column label="组件" prop="component" width="140" show-overflow-tooltip />
        <el-table-column label="页面 URL" prop="url" min-width="180" show-overflow-tooltip />
        <el-table-column label="发生时间" width="180">
          <template #default="scope">{{ formatTime(scope.row.occurredAt) }}</template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { errorLog } from '@/api'

interface ErrorLogItem {
  id: number
  title: string
  message: string
  source: string
  line: number | null
  col: number | null
  url: string
  component: string
  ua: string
  occurredAt: string
}

const loading = ref(false)
const logList = ref<ErrorLogItem[]>([])

const filters = reactive({ type: '' })

const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const getTypeType = (title: string) => {
  if (title.includes('VueError')) return 'warning'
  if (title.includes('unhandledrejection')) return 'danger'
  if (title.includes('window:error')) return 'error'
  return 'info'
}

const fetchList = async () => {
  loading.value = true
  try {
    const params: any = { page: pagination.page, pageSize: pagination.pageSize }
    if (filters.type) params.type = filters.type
    const response = await errorLog.getList(params)
    if (response.code === 200) {
      logList.value = response.data.list
      pagination.total = response.data.total
    }
  } catch {
    ElMessage.error('获取错误日志失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchList()
}

const handleReset = () => {
  filters.type = ''
  handleSearch()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  fetchList()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  fetchList()
}

const handleClear = async () => {
  try {
    await ElMessageBox.confirm('确定清空全部错误日志吗？此操作不可恢复。', '高风险操作', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'error'
    })
    const response = await errorLog.clear()
    if (response.code === 200) {
      ElMessage.success(response.message || '已清空')
      pagination.page = 1
      fetchList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空失败')
    }
  }
}

const formatTime = (time?: string) => {
  if (!time) return '--'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('zh-CN', { hour12: false })
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions h3 {
  margin: 0;
}

.header-btns {
  display: flex;
  gap: 8px;
}

.filter-bar {
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
