<template>
  <div class="type-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>分类管理</h3>
          <el-button type="primary" @click="showAddDialog">新增分类</el-button>
        </div>
      </template>

      <el-table
        :data="typeList"
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="分类名称" prop="typeName" min-width="150" />
        <el-table-column label="文章数量" prop="articleCount" width="100" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              type="primary"
              @click="editType(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="deleteType(scope.row.id)"
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
      :title="isEdit ? '编辑分类' : '新增分类'"
      width="400px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="分类名称" prop="typeName">
          <el-input
            v-model="form.typeName"
            placeholder="请输入分类名称"
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
import { type as typeApi } from '@/api'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const typeList = ref<any[]>([])

const form = reactive({
  id: null as number | null,
  typeName: ''
})

// 列表接口 pageSize 上限为 100，故仅当名称总数 ≤ 100 时前端预检才可信
const NAME_INDEX_LIMIT = 100

// 名称 → id（用于前端预检；数据不完整时置空，完全交由后端判定）
const nameIndex = ref<Map<string, number>>(new Map())

const nameKey = (value: string) => value.trim().toLowerCase()

const loadNameIndex = async () => {
  try {
    const response = await typeApi.getList({ page: 1, pageSize: NAME_INDEX_LIMIT })
    const list = response.data?.list ?? []
    nameIndex.value =
      response.data?.total <= NAME_INDEX_LIMIT
        ? new Map(list.map((item) => [nameKey(item.typeName), item.id]))
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
    return callback(new Error(`分类「${name}」已存在`))
  }
  callback()
}

const rules = {
  typeName: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { validator: validateUniqueName, trigger: 'blur' }
  ]
}

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const formRef = ref()

// 获取分类列表
const fetchTypes = async () => {
  loading.value = true
  try {
    const response = await typeApi.getList({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (response.code === 200 || response.code === 201) {
      typeList.value = response.data.list
      pagination.total = response.data.total
    }
  } catch (error) {
    ElMessage.error('获取分类列表失败')
  } finally {
    loading.value = false
  }
}

// 显示新增对话框
const showAddDialog = () => {
  isEdit.value = false
  form.typeName = ''
  // 同时重置 id：否则从「编辑」关闭后再点「新增」，旧 id 会影响重名预检
  form.id = null
  dialogVisible.value = true
  void loadNameIndex()
}

// 编辑分类
const editType = (row: any) => {
  isEdit.value = true
  form.typeName = row.typeName
  form.id = row.id
  dialogVisible.value = true
  void loadNameIndex()
}

// 删除分类
const deleteType = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个分类吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await typeApi.delete(id)
    if (response.code === 200) {
      ElMessage.success('删除成功')
      fetchTypes()
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
          response = await typeApi.update(form.id!, form)
        } else {
          response = await typeApi.create(form)
        }

        if (response.code === 200 || response.code === 201) {
          ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
          dialogVisible.value = false
          isEdit.value = false
          form.id = null
          form.typeName = ''
          await fetchTypes()
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
  fetchTypes()
}

// 当前页改变
const handleCurrentChange = (page: number) => {
  pagination.page = page
  fetchTypes()
}

onMounted(() => {
  fetchTypes()
})
</script>

<style lang="scss" scoped>
.type-manage {
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