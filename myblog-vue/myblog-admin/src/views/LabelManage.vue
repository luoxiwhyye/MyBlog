<template>
  <div class="label-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>标签管理</h3>
          <el-button type="primary" @click="showAddDialog">新增标签</el-button>
        </div>
      </template>

      <el-table
        :data="labelList"
        v-loading="loading"
        style="width: 100%"
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { label as labelApi } from '@/api'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const labelList = ref<any[]>([])

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

// 获取标签列表
const fetchLabels = async () => {
  loading.value = true
  try {
    const response = await labelApi.getList({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (response.code === 200 || response.code === 201) {
      labelList.value = response.data.list
      pagination.total = response.data.total
    }
  } catch (error) {
    ElMessage.error('获取标签列表失败')
  } finally {
    loading.value = false
  }
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

// 分页大小改变
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
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

.pagination {
  margin-top: 20px;
  text-align: center;
}
</style>