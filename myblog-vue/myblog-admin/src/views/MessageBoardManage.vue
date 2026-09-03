<template>
  <div class="message-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>{{ inTrash ? '留言回收站' : '留言板管理' }}</h3>
          <el-radio-group v-model="viewMode" size="small" @change="handleViewModeChange">
            <el-radio-button label="list">留言列表</el-radio-button>
            <el-radio-button label="trash">回收站</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar" v-if="!inTrash">
        <el-form :inline="true" :model="filters">
          <el-form-item label="状态">
            <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="待审核" value="pending" />
              <el-option label="已审核" value="approved" />
              <el-option label="垃圾留言" value="spam" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 留言列表 -->
      <el-table
        :data="messageList"
        v-loading="loading"
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="作者" prop="authorName" width="120" />
        <el-table-column label="邮箱" prop="authorEmail" width="180" show-overflow-tooltip />
        <el-table-column label="网站" width="160">
          <template #default="scope">
            <a
              v-if="scope.row.authorUrl"
              :href="scope.row.authorUrl"
              target="_blank"
              rel="noopener noreferrer ugc"
              class="author-url-link"
            >{{ scope.row.authorUrl }}</a>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="内容" prop="content" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="inTrash ? '回收站时间' : '创建时间'" width="180">
          <template #default="scope">
            {{ formatTime(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :width="inTrash ? 320 : 420" label="操作" fixed="right">
          <template #default="scope">
            <template v-if="!inTrash">
              <el-button
                v-if="scope.row.status !== 'approved'"
                size="small"
                type="success"
                @click="updateStatus(scope.row.id, 'approved')"
              >
                设为已审核
              </el-button>
              <el-button
                v-if="scope.row.status !== 'pending'"
                size="small"
                type="primary"
                @click="updateStatus(scope.row.id, 'pending')"
              >
                设为待审核
              </el-button>
              <el-button
                v-if="scope.row.status !== 'spam'"
                size="small"
                type="warning"
                @click="updateStatus(scope.row.id, 'spam')"
              >
                设为垃圾
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteMessage(scope.row.id)"
              >
                移入回收站
              </el-button>
            </template>
            <template v-else>
              <el-button
                size="small"
                type="success"
                @click="restoreMessage(scope.row.id)"
              >
                恢复为待审核
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="hardDeleteMessage(scope.row.id)"
              >
                彻底删除
              </el-button>
            </template>
          </template>
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
import { messageBoard } from '@/api'

const loading = ref(false)
const messageList = ref<any[]>([])
const viewMode = ref<'list' | 'trash'>('list')
const inTrash = ref(false)

const filters = reactive({
  status: 'all'
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 获取留言列表
const fetchMessages = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (inTrash.value) {
      params.status = 'deleted'
    } else if (filters.status && filters.status !== 'all') {
      params.status = filters.status
    }
    const response = await messageBoard.getList(params)
    if (response.code === 200) {
      messageList.value = response.data.list
      pagination.total = response.data.total
    }
  } catch (error) {
    ElMessage.error('获取留言列表失败')
  } finally {
    loading.value = false
  }
}

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    approved: 'success',
    pending: 'warning',
    spam: 'danger',
    deleted: 'info'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    approved: '已审核',
    pending: '待审核',
    spam: '垃圾留言',
    deleted: '已删除'
  }
  return texts[status] || status
}

// 格式化时间
const formatTime = (time?: string) => {
  if (!time) return '--'

  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '--'

  return date.toLocaleString('zh-CN', { hour12: false })
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchMessages()
}

// 重置
const handleReset = () => {
  filters.status = 'all'
  handleSearch()
}

const handleViewModeChange = (mode: 'list' | 'trash') => {
  inTrash.value = mode === 'trash'
  pagination.page = 1
  fetchMessages()
}

// 更新留言状态
const updateStatus = async (id: number, status: 'pending' | 'approved' | 'spam' | 'deleted') => {
  try {
    const response = await messageBoard.updateStatus(id, { status })
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('操作成功')
      fetchMessages()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 删除留言
const deleteMessage = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定将该留言移入回收站吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await messageBoard.delete(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('已移入回收站')
      fetchMessages()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const restoreMessage = async (id: number) => {
  try {
    const response = await messageBoard.restore(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('恢复成功')
      fetchMessages()
    } else {
      ElMessage.error(response.message || '恢复失败')
    }
  } catch (error) {
    ElMessage.error('恢复失败')
  }
}

const hardDeleteMessage = async (id: number) => {
  try {
    await ElMessageBox.confirm('彻底删除后无法恢复，是否继续？', '高风险操作', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error'
    })

    const response = await messageBoard.hardDelete(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('已彻底删除')
      fetchMessages()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleSizeChange = () => {
  pagination.page = 1
  fetchMessages()
}

const handleCurrentChange = () => {
  fetchMessages()
}

onMounted(() => {
  fetchMessages()
})
</script>

<style lang="scss" scoped>
.message-manage {
  padding: 20px;

  :deep(.el-card__header) {
    padding: 16px 20px;
  }
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }
}

.filter-bar {
  margin-bottom: 16px;
}

.author-url-link {
  color: var(--color-accent);
  text-decoration: none;
  overflow: hidden;
  display: inline-block;
  max-width: 140px;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
