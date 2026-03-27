<template>
  <div class="article-list">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>文章管理</h3>
          <el-button type="primary" @click="goToEdit">写文章</el-button>
        </div>
      </template>

      <!-- 搜索筛选栏 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filters">
          <el-form-item label="标题">
            <el-input
              v-model="filters.keyword"
              placeholder="搜索标题"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-select
              v-model="filters.typeId"
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

      <!-- 文章列表 -->
      <el-table
        :data="articleList"
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="封面" width="100">
          <template #default="scope">
            <el-image
              v-if="scope.row.coverImage"
              :src="scope.row.coverImage"
              :preview-src-list="[scope.row.coverImage]"
              style="width: 60px; height: 40px; object-fit: cover;"
            />
            <span v-else>无封面</span>
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
        <el-table-column label="创建时间" prop="createdAt" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
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
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { article, type as typeApi } from '@/api'

const router = useRouter()

const loading = ref(false)
const articleList = ref<any[]>([])
const typeList = ref<any[]>([])

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
const fetchArticles = async () => {
  loading.value = true
  try {
    const params = {
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const response = await article.getList(params)
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

// 编辑文章
const editArticle = (id: number) => {
  router.push(`/admin/articles/edit/${id}`)
}

// 删除文章
const deleteArticle = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇文章吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await article.delete(id)
    if (response.code === 200) {
      ElMessage.success('删除成功')
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

onMounted(() => {
  fetchTypes()
  fetchArticles()
})
</script>

<style scoped>
.article-list {
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