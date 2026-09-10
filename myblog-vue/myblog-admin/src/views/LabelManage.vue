<template>
  <div class="label-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>标签管理</h3>
          <el-button type="primary" @click="showAddDialog">新增标签</el-button>
        </div>
      </template>

      <!-- 检索栏：关键词由后端过滤（非当前页前端过滤），避免“只搜当前页”的假检索 -->
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索标签名称"
          clearable
          class="search-input"
          @input="scheduleSearch"
          @keyup.enter="handleSearchNow"
          @clear="handleSearchNow"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <span v-if="appliedKeyword" class="search-hint">
          匹配「{{ appliedKeyword }}」共 {{ pagination.total }} 个标签
        </span>
      </div>

      <el-table
        :data="labelList"
        v-loading="loading"
        style="width: 100%"
        :empty-text="emptyText"
      >
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="标签名称" prop="labelName" min-width="150" />
        <el-table-column label="文章数量" prop="articleCount" width="100" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              type="primary"
              @click="editLabel(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteLabel(scope.row.id)"
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑标签' : '新增标签'"
      width="400px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="标签名称" prop="labelName">
          <el-input
            v-model="form.labelName"
            placeholder="请输入标签名称"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitForm"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { label as labelApi } from '@/api'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const labelList = ref<any[]>([])

// ===== 检索 =====
const SEARCH_DEBOUNCE_MS = 300
// 输入框实时值（防抖后才会发起请求）
const keyword = ref('')
// 最近一次「实际发起请求」使用的关键词，用于提示文案与空态文案
const appliedKeyword = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
// 请求序号：丢弃过期响应，避免快速改关键词时旧结果覆盖新结果
let fetchSeq = 0

const emptyText = computed(() =>
  appliedKeyword.value ? '未找到匹配的标签' : '暂无标签'
)

const form = reactive({
  labelName: '',
  id: null as number | null
})

// 列表接口 pageSize 上限为 100，故仅当名称总数 ≤ 100 时前端预检才可信
const NAME_INDEX_LIMIT = 100

// 名称 → id（用于前端预检；数据不完整时置空，完全交由后端判定）
const nameIndex = ref<Map<string, number>>(new Map())

const nameKey = (value: string) => value.trim().toLowerCase()

const loadNameIndex = async () => {
  try {
    const response = await labelApi.getList({ page: 1, pageSize: NAME_INDEX_LIMIT })
    const list = response.data?.list ?? []
    nameIndex.value =
      response.data?.total <= NAME_INDEX_LIMIT
        ? new Map(list.map((item) => [nameKey(item.labelName), item.id]))
        : new Map()
  } catch {
    // 预检失败不阻断：后端查重与唯一索引仍是权威
    nameIndex.value = new Map()
  }
}

// 前端预检仅为体验补充（省一次往返 + 字段级提示），以后端校验为准
const validateUniqueName = (
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void
) => {
  const name = (value || '').trim()
  if (!name) return callback()

  const ownerId = nameIndex.value.get(nameKey(name))
  // 编辑时排除自身，否则保存原名称会被误判为重名
  if (ownerId !== undefined && ownerId !== form.id) {
    return callback(new Error(`标签「${name}」已存在`))
  }
  callback()
}

const rules = {
  labelName: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { validator: validateUniqueName, trigger: 'blur' }
  ]
}

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const formRef = ref()

// 获取标签列表（关键词走后端过滤）
const fetchLabels = async () => {
  const seq = ++fetchSeq
  loading.value = true
  try {
    const kw = keyword.value.trim()
    const params: { page: number; pageSize: number; keyword?: string } = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    // 仅在有关键词时传参，避免空串产生多余的缓存键
    if (kw) params.keyword = kw

    const response = await labelApi.getList(params)
    if (seq !== fetchSeq) return // 已有更新的请求，丢弃本次结果

    if (response.code === 200 || response.code === 201) {
      labelList.value = response.data.list
      pagination.total = response.data.total
      appliedKeyword.value = kw
    }
  } catch (error) {
    if (seq === fetchSeq) {
      ElMessage.error('获取标签列表失败')
    }
  } finally {
    if (seq === fetchSeq) {
      loading.value = false
    }
  }
}

// 输入防抖：停止输入 300ms 后才检索，并回到第 1 页
const scheduleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchTimer = null
    pagination.page = 1
    void fetchLabels()
  }, SEARCH_DEBOUNCE_MS)
}

// 回车 / 点清除：立即检索，不等防抖
const handleSearchNow = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  pagination.page = 1
  void fetchLabels()
}

// 显示新增对话框
const showAddDialog = () => {
  isEdit.value = false
  form.labelName = ''
  form.id = null
  dialogVisible.value = true
  void loadNameIndex()
}

// 编辑标签
const editLabel = (row: any) => {
  isEdit.value = true
  form.labelName = row.labelName
  form.id = row.id
  dialogVisible.value = true
  void loadNameIndex()
}

// 删除标签
const deleteLabel = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个标签吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await labelApi.delete(id)
    if (response.code === 200) {
      ElMessage.success('删除成功')
      fetchLabels()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        let response
        if (isEdit.value) {
          response = await labelApi.update(form.id!, form)
        } else {
          response = await labelApi.create(form)
        }

        if (response.code === 200 || response.code === 201) {
          ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
          dialogVisible.value = false
          isEdit.value = false
          form.id = null
          form.labelName = ''
          await fetchLabels()
        } else {
          ElMessage.error(response.message || '操作失败')
        }
      } catch (error: any) {
        // 非 2xx 已由 request 响应拦截器统一提示（含 409 重名），此处不重复打扰
        if (!error?.response) {
          ElMessage.error('操作失败')
        }
      } finally {
        submitting.value = false
      }
    }
  })
}

// 分页大小改变（回到第 1 页：否则原页码可能超出新分页的总页数，列表空白）
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  fetchLabels()
}

// 当前页改变
const handleCurrentChange = (page: number) => {
  pagination.page = page
  fetchLabels()
}

onMounted(() => {
  fetchLabels()
})

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
})
</script>

<style lang="scss" scoped>
.label-manage {
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  width: 260px;
}

.search-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .filter-bar {
    flex-wrap: wrap;
  }

  .search-input {
    width: 100%;
  }
}

.pagination {
  margin-top: 20px;
  text-align: center;
}
</style>