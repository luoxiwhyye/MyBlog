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

const rules = {
  labelName: [{ required: true, message: '请输入标签名称', trigger: 'blur' }]
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
    if (response.code === 200) {
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
}

// 编辑标签
const editLabel = (row: any) => {
  isEdit.value = true
  form.labelName = row.labelName
  form.id = row.id
  dialogVisible.value = true
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

        if (response.code === 200) {
          ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
          dialogVisible.value = false
          fetchLabels()
        } else {
          ElMessage.error(response.message || '操作失败')
        }
      } catch (error) {
        ElMessage.error('操作失败')
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

<style scoped>
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