<template>
  <div class="comment-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>评论管理</h3>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
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
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 评论列表 -->
      <el-table
        :data="commentList"
        v-loading="loading"
        style="width: 100%"
        row-key="id"
        :tree-props="{ children: 'replies', hasChildren: 'hasChildren' }"
      >
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="作者" prop="authorName" width="120" />
        <el-table-column label="内容" prop="content" min-width="200" show-overflow-tooltip />
        <el-table-column label="文章ID" prop="articleId" width="100" />
        <el-table-column label="点赞数" prop="likeCount" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag
              :type="getStatusType(scope.row.status)"
            >
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createAt" width="160" />
        <el-table-column label="操作" width="400" fixed="right">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 'pending'"
              size="small"
              type="success"
              @click="updateStatus(scope.row.id, 'approved')"
            >
              审核通过
            </el-button>
            <el-button
              v-if="scope.row.status === 'pending'"
              size="small"
              type="warning"
              @click="updateStatus(scope.row.id, 'spam')"
            >
              标记为垃圾
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
              删除
            </el-button>
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

const filters = reactive({
  articleId: ''
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
    if (filters.articleId) {
      params.articleId = Number(filters.articleId)
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
    spam: '垃圾评论',
    deleted: '已删除'
  }
  return texts[status] || status
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchComments()
}

// 重置
const handleReset = () => {
  filters.articleId = ''
  handleSearch()
}

// 更新评论状态
const updateStatus = async (id: number, status: 'pending' | 'approved' | 'spam' | 'deleted') => {
  try {
    const response = await comment.updateStatus(id, { status })
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('操作成功')
      fetchComments()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 删除评论
const deleteComment = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await comment.delete(id)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('删除成功')
      fetchComments()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 查看文章
const viewArticle = (articleId: number) => {
  // 跳转到前端文章页面
  window.open(`http://localhost:3000/article/${articleId}`, '_blank')
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

<style scoped>
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

.pagination {
  margin-top: 20px;
  text-align: center;
}
</style>