<template>
  <div class="comment-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>{{ inTrash ? '评论回收站' : '评论管理' }}</h3>
          <el-radio-group v-model="viewMode" size="small" @change="handleViewModeChange">
            <el-radio-button label="list">评论列表</el-radio-button>
            <el-radio-button label="trash">回收站</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar" v-if="!inTrash">
        <el-form :inline="true" :model="filters">
          <el-form-item label="文章ID">
            <el-input
              v-model="filters.articleId"
              placeholder="输入文章ID"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="待审核" value="pending" />
              <el-option label="已审核" value="approved" />
              <el-option label="已删除" value="deleted" />
            </el-select>
          </el-form-item>
          <el-form-item label="层级">
            <el-select v-model="filters.level" style="width: 140px">
              <el-option label="全部" value="all" />
              <el-option label="仅父评论" value="top" />
              <el-option label="仅回复" value="reply" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 批量操作条：列表视图选中后显示。回收站视图不做批量，仍逐条操作。
           评论在列表里是平铺的（接口不返回 replies），看不出哪些是子回复，
           所以这里写明「子回复会一并处理」——服务端按顶层连带后代。 -->
      <div v-if="!inTrash && selectedRows.length" class="batch-bar">
        <span class="batch-count">已选 <strong>{{ selectedRows.length }}</strong> 条</span>
        <el-button size="small" type="success" plain :loading="batchLoading" @click="batchApprove">
          批量设为已审核
        </el-button>
        <el-button size="small" type="warning" plain :loading="batchLoading" @click="batchPending">
          批量设为待审核
        </el-button>
        <el-button size="small" type="primary" plain :loading="batchLoading" @click="batchDelete">
          批量移入回收站
        </el-button>
      </div>

      <!-- 评论列表 -->
      <el-table
        ref="tableRef"
        :data="commentList"
        v-loading="loading"
        style="width: 100%"
        row-key="id"
        :tree-props="{ children: 'replies', hasChildren: 'hasChildren' }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column v-if="!inTrash" type="selection" width="48" />
        <el-table-column label="ID" prop="id" width="80" />
        <!-- 层级：列表是平铺的，必须显式标出父 / 子，否则看不出回复关系；
             父评论未通过审核时给出警示（这条回复在前台不可见，审核它会被后端拒绝）。 -->
        <el-table-column label="层级" width="150">
          <template #default="scope">
            <el-tag v-if="!scope.row.parentId" type="primary" size="small" effect="plain">
              父评论
            </el-tag>
            <template v-else>
              <el-tag type="info" size="small" effect="plain">
                回复 #{{ scope.row.parentId }}
              </el-tag>
              <el-tag
                v-if="!inTrash && scope.row.parentStatus && scope.row.parentStatus !== 'approved'"
                type="danger"
                size="small"
                class="parent-warning"
              >
                父未通过
              </el-tag>
            </template>
          </template>
        </el-table-column>
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
        <el-table-column label="内容" min-width="220">
          <template #default="scope">
            <div class="comment-content" v-html="renderComment(scope.row.content)"></div>
          </template>
        </el-table-column>
        <el-table-column label="文章ID" prop="articleId" width="100" />
        <el-table-column label="点赞数" prop="likeCount" width="80" />
        <!-- 访客是否勾选「有人回复我时，邮件通知我」——用来排查「为什么没发回复邮件」 -->
        <el-table-column label="邮件通知" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.notifyEmail ? 'success' : 'info'" size="small">
              {{ scope.row.notifyEmail ? '接收' : '不接收' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag
              :type="getStatusType(scope.row.status)"
            >
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
                size="small"
                type="info"
                @click="viewArticle(scope.row.articleId)"
              >
                查看文章
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="deleteComment(scope.row.id)"
              >
                移入回收站
              </el-button>
            </template>
            <template v-else>
              <el-button
                size="small"
                type="success"
                @click="restoreComment(scope.row.id)"
              >
                恢复为待审核
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click="hardDeleteComment(scope.row.id)"
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
import { comment } from '@/api'

const loading = ref(false)
const commentList = ref<any[]>([])
const viewMode = ref<'list' | 'trash'>('list')
const inTrash = ref(false)

// 批量选择（仅列表视图；回收站仍逐条操作）
const tableRef = ref()
const selectedRows = ref<any[]>([])
const batchLoading = ref(false)

const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

const clearSelection = () => {
  selectedRows.value = []
  tableRef.value?.clearSelection?.()
}

/**
 * 操作失败时的兑底提示。
 *
 * 响应拦截器（utils/request.ts）已经按后端 message 弹过一次 toast —— 包括审核守卫
 * 这类带具体原因的 400（如「父评论 #14 未通过审核……」）。这里只在「拦截器没弹过」
 * （无 response，如网络错误）时兑底，避免一次失败出现两条提示。
 */
const showActionError = (error: unknown, fallback: string) => {
  if (!(error as any)?.response) ElMessage.error(fallback)
}

const filters = reactive({
  articleId: '',
  status: 'all',
  level: 'all'
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 获取评论列表
const fetchComments = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (!inTrash.value && filters.articleId) {
      params.articleId = Number(filters.articleId)
    }
    if (inTrash.value) {
      params.status = 'deleted'
    } else if (filters.status && filters.status !== 'all') {
      params.status = filters.status
    }
    // 层级筛选：父评论 / 回复（all 不传，交给后端默认）
    if (filters.level && filters.level !== 'all') {
      params.level = filters.level
    }
    const response = await comment.getList(params)
    if (response.code === 200) {
      commentList.value = response.data.list
      pagination.total = response.data.total
    }
  } catch (error) {
    ElMessage.error('获取评论列表失败')
  } finally {
    loading.value = false
  }
}

// 标记文本 → 安全 HTML（白名单：仅 [img:http(s)] 与 @提及，与前台 utils/commentRender 同规则）
const COMMENT_IMG_MARKER = /\[img:(https?:\/\/[^\s\]]+)\]/gi
const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
const escapeAndMention = (text: string) =>
  escapeHtml(text).replace(/(@[^\s@,，。！？!?]+)/g, '<span class="mention">$1</span>')

const renderComment = (content?: string) => {
  const value = content || ''
  if (!value) return ''
  const parts: string[] = []
  const re = new RegExp(COMMENT_IMG_MARKER.source, 'gi')
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeAndMention(value.slice(lastIndex, match.index)))
    }
    parts.push(
      `<img class="comment-thumb" src="${escapeHtml(match[1] ?? '')}" alt="表情" loading="lazy" />`,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < value.length) {
    parts.push(escapeAndMention(value.slice(lastIndex)))
  }
  return parts.join('')
}

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    approved: 'success',
    pending: 'warning',
    deleted: 'info'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    approved: '已审核',
    pending: '待审核',
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
  clearSelection()
  fetchComments()
}

// 重置
const handleReset = () => {
  filters.articleId = ''
  filters.status = 'all'
  filters.level = 'all'
  handleSearch()
}

const handleViewModeChange = (mode: 'list' | 'trash') => {
  inTrash.value = mode === 'trash'
  pagination.page = 1
  clearSelection()
  fetchComments()
}

// 更新评论状态
const updateStatus = async (id: number, status: 'pending' | 'approved' | 'deleted') => {
  try {
    const response = await comment.updateStatus(id, { status })
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('操作成功')
      fetchComments()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    showActionError(error, '操作失败')
  }
}

// 删除评论
const deleteComment = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定将该评论移入回收站吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await comment.delete(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('已移入回收站')
      fetchComments()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      showActionError(error, '删除失败')
    }
  }
}

const restoreComment = async (id: number) => {
  try {
    const response = await comment.restore(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('恢复成功')
      fetchComments()
    } else {
      ElMessage.error(response.message || '恢复失败')
    }
  } catch (error) {
    showActionError(error, '恢复失败')
  }
}

const hardDeleteComment = async (id: number) => {
  try {
    await ElMessageBox.confirm('彻底删除后无法恢复，是否继续？', '高风险操作', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error'
    })

    const response = await comment.hardDelete(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('已彻底删除')
      fetchComments()
    } else {
      ElMessage.error(response.message || '彻底删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      showActionError(error, '彻底删除失败')
    }
  }
}

// 批量改状态：服务端按顶层连带后代，故 affected 会大于勾选数
const runBatchStatus = async (status: 'pending' | 'approved' | 'deleted', verb: string) => {
  const ids = selectedRows.value.map((r) => r.id)
  if (!ids.length) return
  try {
    await ElMessageBox.confirm(
      `确定将选中的 ${ids.length} 条评论${verb}吗？属于它们的子回复会一并处理。`,
      `批量${verb}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: status === 'deleted' ? 'warning' : 'info',
      },
    )
  } catch {
    return
  }

  batchLoading.value = true
  try {
    const response = await comment.batchUpdateStatus({ ids, status })
    ElMessage.success(response.message || `已更新 ${ids.length} 条评论`)
    clearSelection()
    fetchComments()
  } catch (error) {
    showActionError(error, `批量${verb}失败`)
  } finally {
    batchLoading.value = false
  }
}

const batchApprove = () => runBatchStatus('approved', '设为已审核')
const batchPending = () => runBatchStatus('pending', '设为待审核')
const batchDelete = () => runBatchStatus('deleted', '移入回收站')

// 查看文章
const viewArticle = (articleId: number) => {
  const blogUrl = import.meta.env.VITE_BLOG_URL || window.location.origin.replace(/:(\d+)$/, ':3001')
  window.open(`${blogUrl}/article/${articleId}`, '_blank')
}

// 分页大小改变
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchComments()
}

// 当前页改变
const handleCurrentChange = (page: number) => {
  pagination.page = page
  fetchComments()
}

onMounted(() => {
  fetchComments()
})
</script>

<style lang="scss" scoped>
.comment-manage {
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  margin-bottom: 20px;
}

/* 批量操作条（与文章管理的 .batch-bar 同一套观感） */
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

/* 「父未通过」警示标签跟在「回复 #N」之后，同格换行 */
.parent-warning {
  margin-left: 4px;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.author-url-link {
  color: #409eff;
  text-decoration: none;
  display: inline-block;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 评论内容（标记文本渲染，v-html 注入不带 scoped 属性 → 用 :deep） */
.comment-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;

  :deep(.comment-thumb) {
    max-width: 46px;
    max-height: 46px;
    margin: 0 2px;
    border-radius: 4px;
    vertical-align: middle;
  }

  :deep(.mention) {
    color: #409eff;
    font-weight: 600;
  }
}

.author-url-link:hover {
  text-decoration: underline;
}
</style>