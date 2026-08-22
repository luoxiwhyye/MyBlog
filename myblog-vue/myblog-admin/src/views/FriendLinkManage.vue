<template>
  <div class="friend-link-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>友情链接管理</h3>
          <el-button type="primary" @click="showAddDialog">新增友链</el-button>
        </div>
      </template>

      <el-table
        :data="list"
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="网站名称" prop="name" min-width="140" />
        <el-table-column label="网站URL" prop="url" min-width="200" show-overflow-tooltip />
        <el-table-column label="简介" prop="description" min-width="160" show-overflow-tooltip />
        <el-table-column label="置顶" width="70">
          <template #default="scope">
            <el-tag v-if="scope.row.isSticky" type="warning" size="small">置顶</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.status ? 'success' : 'info'" size="small">
              {{ scope.row.status ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="点击" prop="clickCount" width="70" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="showEditDialog(scope.row)">
              编辑
            </el-button>
            <el-button size="small" type="danger" @click="deleteItem(scope.row.id)">
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
      :title="isEdit ? '编辑友链' : '新增友链'"
      width="560px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
      >
        <el-form-item label="网站名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入网站名称" />
        </el-form-item>
        <el-form-item label="网站URL" prop="url">
          <el-input v-model="form.url" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="网站头像" prop="avatar">
          <el-input v-model="form.avatar" placeholder="网站头像/Logo 地址（选填）">
            <template #append>
              <el-button @click="handleUploadAvatar">上传</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="网站简介" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            placeholder="一句话简介（选填）"
          />
        </el-form-item>
        <el-form-item label="站长邮箱" prop="email">
          <el-input v-model="form.email" placeholder="站长邮箱（选填）" />
        </el-form-item>
        <el-form-item label="是否置顶" prop="isSticky">
          <el-switch v-model="form.isSticky" />
        </el-form-item>
        <el-form-item label="是否启用" prop="status">
          <el-switch v-model="form.status" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 隐藏的上传输入，复用上传组件反射 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { friendLink as friendLinkApi, upload } from '@/api'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const list = ref<any[]>([])
const formRef = ref()
const fileInputRef = ref<HTMLInputElement | null>(null)

const form = reactive({
  id: null as number | null,
  name: '',
  url: '',
  avatar: '',
  description: '',
  email: '',
  isSticky: false,
  status: true,
})

const rules = {
  name: [{ required: true, message: '请输入网站名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请输入网站URL', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/i,
      message: 'URL 必须以 http(s):// 开头',
      trigger: 'blur',
    },
  ],
  email: [
    {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: '邮箱格式不正确',
      trigger: 'blur',
    },
  ],
}

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const fetchList = async () => {
  loading.value = true
  try {
    const response = await friendLinkApi.getList({
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
    if (response.code === 200 || response.code === 201) {
      list.value = response.data.list
      pagination.total = response.data.total
    }
  } catch {
    ElMessage.error('获取友链列表失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.id = null
  form.name = ''
  form.url = ''
  form.avatar = ''
  form.description = ''
  form.email = ''
  form.isSticky = false
  form.status = true
}

const showAddDialog = () => {
  resetForm()
  isEdit.value = false
  dialogVisible.value = true
}

const showEditDialog = (row: any) => {
  form.id = row.id
  form.name = row.name
  form.url = row.url
  form.avatar = row.avatar || ''
  form.description = row.description || ''
  form.email = row.email || ''
  form.isSticky = row.isSticky
  form.status = row.status
  isEdit.value = true
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    submitting.value = true
    try {
      if (isEdit.value && form.id) {
        await friendLinkApi.update(form.id, {
          name: form.name,
          url: form.url,
          avatar: form.avatar,
          description: form.description,
          email: form.email,
          isSticky: form.isSticky,
          status: form.status,
        })
        ElMessage.success('友链更新成功')
      } else {
        await friendLinkApi.create({
          name: form.name,
          url: form.url,
          avatar: form.avatar,
          description: form.description,
          email: form.email,
          isSticky: form.isSticky,
          status: form.status,
        })
        ElMessage.success('友链创建成功')
      }
      dialogVisible.value = false
      fetchList()
    } catch {
      ElMessage.error('保存失败')
    } finally {
      submitting.value = false
    }
  })
}

const deleteItem = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该友链吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await friendLinkApi.delete(id)
    ElMessage.success('友链删除成功')
    fetchList()
  } catch (error) {
    // 点击取消不提示
  }
}

const handleUploadAvatar = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const response = await upload.image(file, 'setting-image', {
      settingKey: 'friend-link-avatar',
    })
    if (response.code === 200 || response.code === 201) {
      form.avatar = response.data.url
      ElMessage.success('头像上传成功')
    }
  } catch {
    ElMessage.error('头像上传失败')
  } finally {
    target.value = ''
  }
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

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.friend-link-manage {
  .header-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
