<template>
  <div class="article-list">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>{{ inTrash ? '回收站' : '文章管理' }}</h3>
          <div class="header-right">
            <el-radio-group v-model="viewMode" size="small" @change="handleViewModeChange">
              <el-radio-button label="list">文章列表</el-radio-button>
              <el-radio-button label="trash">回收站</el-radio-button>
            </el-radio-group>
            <el-button type="primary" @click="goToEdit">写文章</el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选栏 -->
      <div class="filter-bar" v-if="!inTrash">
        <el-form :inline="true" :model="filters">
          <el-form-item label="标题">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索标题"
              clearable
              @input="handleKeywordDebounced"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-select
              class="filter-select"
              v-model.number="filters.typeId"
              placeholder="选择分类"
              clearable
              @change="handleSearch"
            >
              <el-option
                v-for="type in typeList"
                :key="type.id"
                :label="type.typeName"
                :value="type.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              class="filter-select"
              v-model="filters.status"
              placeholder="选择状态"
              clearable
              @change="handleSearch"
            >
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 批量操作条：选中后显示 -->
      <div v-if="selectedRows.length" class="batch-bar">
        <span class="batch-count">已选 <strong>{{ selectedRows.length }}</strong> 篇</span>
        <template v-if="!inTrash">
          <!-- 批量发布 / 下架：目标状态取决于当前选中项里是否包含待发布的文章 -->
          <el-button size="small" type="success" plain :loading="batchDeleting" @click="batchPublish">
            批量发布
          </el-button>
          <el-button size="small" type="warning" plain :loading="batchDeleting" @click="batchUnpublish">
            批量下架
          </el-button>
          <el-button size="small" type="primary" plain :loading="batchDeleting" @click="batchDelete">
            批量移入回收站
          </el-button>
        </template>
        <template v-else>
          <el-button size="small" type="success" plain :loading="batchDeleting" @click="batchRestore">
            批量恢复
          </el-button>
          <el-button size="small" type="danger" plain :loading="batchDeleting" @click="batchHardDelete">
            批量彻底删除
          </el-button>
        </template>
      </div>

      <!-- 文章列表 -->
      <el-table
        ref="tableRef"
        :data="articleList"
        v-loading="loading"
        row-key="id"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48">
          <template #header>
            <span v-if="!inTrash" title="选中后可批量操作" style="cursor: default; color: var(--text-muted); font-size: 12px;">勾选</span>
          </template>
        </el-table-column>
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="封面" width="100">
          <template #default="scope">
            <el-image
              v-if="scope.row.coverImage"
              :src="scope.row.coverImage"
              :preview-src-list="[scope.row.coverImage]"
              fit="cover"
              style="width: 60px; height: 40px;"
            />
            <el-image
              v-else
              src="https://via.placeholder.com/60x40?text=暂无"
              fit="cover"
              style="width: 60px; height: 40px;"
            />
          </template>
        </el-table-column>
        <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="分类" prop="type.typeName" width="100" />
        <el-table-column label="标签" width="150">
          <template #default="scope">
            <el-tag
              v-for="label in scope.row.labels"
              :key="label.id"
              size="small"
              style="margin-right: 5px;"
            >
              {{ label.labelName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="浏览数" prop="viewCount" width="80" />
        <el-table-column label="状态" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'published' ? 'success' : 'warning'">
              {{ scope.row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="inTrash ? '删除时间' : '创建时间'" width="180">
          <template #default="scope">
            {{ formatDateTime(inTrash ? scope.row.deletedAt : scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="inTrash ? '操作' : '操作'" :width="inTrash ? 210 : 150" fixed="right">
          <template #default="scope">
            <template v-if="!inTrash">
              <el-button
                size="small"
                type="primary"
                @click="editArticle(scope.row.id)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteArticle(scope.row.id)"
              >
                删除
              </el-button>
            </template>
            <template v-else>
              <el-button
                size="small"
                type="success"
                @click="restoreArticle(scope.row.id)"
              >
                恢复
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="hardDeleteArticle(scope.row.id)"
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
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { article, type as typeApi } from '@/api'

const router = useRouter()

const loading = ref(false)
const articleList = ref<any[]>([])
const typeList = ref<any[]>([])
const viewMode = ref<'list' | 'trash'>('list')
const inTrash = ref(false)

// 批量选择
const tableRef = ref()
const selectedRows = ref<any[]>([])
const batchDeleting = ref(false)

const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 关键词实时搜索（防抖 300ms）
let keywordTimer: ReturnType<typeof setTimeout> | null = null
const handleKeywordDebounced = () => {
  if (keywordTimer) clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => handleSearch(), 300)
}

// 批量操作：复用单条接口，避免依赖后端新增批量端点
const collapseConfirmation = async (msg: string, kind: string): Promise<number[]> => {
  const ids = selectedRows.value.map((r) => r.id)
  if (!ids.length) return []
  try {
    await ElMessageBox.confirm(msg, kind, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return []
  }
  return ids
}

const batchDelete = async () => {
  const ids = await collapseConfirmation(
    `确定将选中的 ${selectedRows.value.length} 篇文章移入回收站吗？`,
    '批量删除',
  )
  if (!ids.length) return
  batchDeleting.value = true
  let ok = 0
  for (const id of ids) {
    try {
      const res = await article.delete(id)
      if (res.code === 200 || res.code === 201) ok++
    } catch {
      /* 忽略单条失败，继续 */
    }
  }
  batchDeleting.value = false
  ElMessage.success(`已批量移入回收站 ${ok}/${ids.length} 篇`)
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
  fetchArticles()
}

const batchRestore = async () => {
  const ids = await collapseConfirmation(
    `确定恢复选中的 ${selectedRows.value.length} 篇文章吗？`,
    '批量恢复',
  )
  if (!ids.length) return
  batchDeleting.value = true
  let ok = 0
  for (const id of ids) {
    try {
      const res = await article.restore(id)
      if (res.code === 200 || res.code === 201) ok++
    } catch {
      /* 忽略 */
    }
  }
  batchDeleting.value = false
  ElMessage.success(`已批量恢复 ${ok}/${ids.length} 篇`)
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
  fetchArticles()
}

const batchHardDelete = async () => {
  const ids = await collapseConfirmation(
    `确定彻底删除选中的 ${selectedRows.value.length} 篇文章吗？此操作不可恢复！`,
    '批量彻底删除',
  )
  if (!ids.length) return
  batchDeleting.value = true
  let ok = 0
  for (const id of ids) {
    try {
      const res = await article.hardDelete(id)
      if (res.code === 200 || res.code === 201) ok++
    } catch {
      /* 忽略 */
    }
  }
  batchDeleting.value = false
  ElMessage.success(`已批量彻底删除 ${ok}/${ids.length} 篇`)
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
  fetchArticles()
}

// 批量发布 / 下架：调用后端批量状态接口
const runBatchStatus = async (status: 'published' | 'draft', verb: string) => {
  const ids = selectedRows.value.map((r) => r.id)
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(
      `确定将选中的 ${ids.length} 篇文章${verb}吗？`,
      `批量${verb}`,
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  batchDeleting.value = true
  try {
    const res = await article.batchUpdateStatus({ ids, status })
    batchDeleting.value = false
    ElMessage.success(res.message || `已批量${verb} ${res.data?.affected ?? ids.length} 篇`)
    selectedRows.value = []
    tableRef.value?.clearSelection?.()
    fetchArticles()
  } catch {
    batchDeleting.value = false
    ElMessage.error(`批量${verb}失败`)
  }
}

const batchPublish = () => runBatchStatus('published', '发布')
const batchUnpublish = () => runBatchStatus('draft', '下架')

onBeforeUnmount(() => {
  if (keywordTimer) clearTimeout(keywordTimer)
})

const filters = reactive({
  keyword: '',
  typeId: undefined as number | undefined,
  status: undefined as 'draft' | 'published' | undefined
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 获取分类列表
const fetchTypes = async () => {
  try {
    const response = await typeApi.getList()
    if (response.code === 200) {
      typeList.value = response.data.list
    }
  } catch (error) {
    console.error('获取分类列表失败:', error)
  }
}

// 获取文章列表
const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const fetchArticles = async () => {
  loading.value = true
  try {
    const response = inTrash.value
      ? await article.getTrash({
          page: pagination.page,
          pageSize: pagination.pageSize
        })
      : await article.getList({
          ...filters,
          page: pagination.page,
          pageSize: pagination.pageSize
        })

    if (response.code === 200) {
      articleList.value = response.data.list
      pagination.total = response.data.total
    }
  } catch (error) {
    ElMessage.error('获取文章列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchArticles()
}

// 重置
const handleReset = () => {
  Object.assign(filters, {
    keyword: '',
    typeId: undefined,
    status: undefined
  })
  handleSearch()
}

// 分页大小改变
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchArticles()
}

// 当前页改变
const handleCurrentChange = (page: number) => {
  pagination.page = page
  fetchArticles()
}

// 写文章
const goToEdit = () => {
  router.push('/admin/articles/edit')
}

const handleViewModeChange = (mode: 'list' | 'trash') => {
  inTrash.value = mode === 'trash'
  pagination.page = 1
  fetchArticles()
}

// 编辑文章
const editArticle = (id: number) => {
  router.push(`/admin/articles/edit/${id}`)
}

// 删除文章
const deleteArticle = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要将这篇文章移入回收站吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await article.delete(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('已移入回收站')
      fetchArticles()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const restoreArticle = async (id: number) => {
  try {
    const response = await article.restore(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('恢复成功')
      fetchArticles()
    } else {
      ElMessage.error(response.message || '恢复失败')
    }
  } catch (error) {
    ElMessage.error('恢复失败')
  }
}

const hardDeleteArticle = async (id: number) => {
  try {
    await ElMessageBox.confirm('彻底删除后不可恢复，确定继续吗？', '高风险操作', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error'
    })

    const response = await article.hardDelete(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('已彻底删除')
      fetchArticles()
    } else {
      ElMessage.error(response.message || '彻底删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('彻底删除失败')
    }
  }
}

onMounted(() => {
  fetchTypes()
  fetchArticles()
})
</script>

<style lang="scss" scoped>
.article-list {
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-bar {
  margin-bottom: 20px;
}

  .filter-bar .el-form-item {
    min-width: 240px;
  }

  .filter-select {
    min-width: 220px;
    width: 220px;
  }

  /* 批量操作条 */
  .batch-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    margin-bottom: 16px;
    border-radius: 10px;
    background: var(--bg-card);
    border: 1px solid var(--border-light);
  }

  .batch-count {
    color: var(--text-secondary);
    font-size: 14px;
  }


.el-image__inner {
  object-fit: cover !important;
}

.el-image {
  width: 60px;
  height: 40px;
}
</style>