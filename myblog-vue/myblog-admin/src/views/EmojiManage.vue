<template>
  <div class="emoji-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>表情管理</h3>
          <el-button type="primary" @click="openCreate">新增表情</el-button>
        </div>
      </template>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filters">
          <el-form-item label="类型">
            <el-select v-model="filters.type" placeholder="全部类型" clearable style="width: 140px">
              <el-option label="Emoji" value="emoji" />
              <el-option label="颜文字" value="kaomoji" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filters.enabled" placeholder="全部状态" clearable style="width: 120px">
              <el-option label="启用" value="1" />
              <el-option label="停用" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 表情列表 -->
      <el-table
        :data="emojiList"
        v-loading="loading"
        style="width: 100%"
        row-key="id"
      >
        <el-table-column label="ID" prop="id" width="70" />
        <el-table-column label="表情" width="140">
          <template #default="scope">
            <span v-if="!isImageUrl(scope.row.content)" class="emoji-preview">{{ scope.row.content }}</span>
            <img v-else :src="scope.row.content" :alt="'自定义表情'" class="emoji-img" />
          </template>
        </el-table-column>
        <el-table-column label="内容" prop="content" min-width="220" show-overflow-tooltip />
        <el-table-column label="类型" width="90">
          <template #default="scope">
            <el-tag :type="scope.row.type === 'kaomoji' ? 'warning' : 'success'">
              {{ scope.row.type === 'kaomoji' ? '颜文字' : 'Emoji' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="90">
          <template #default="scope">
            <el-tag :type="scope.row.isCustom === 1 ? 'primary' : 'info'" effect="plain">
              {{ scope.row.isCustom === 1 ? '自定义' : '内置' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" prop="sortOrder" width="70" />
        <el-table-column label="状态" width="90">
          <template #default="scope">
            <el-tag :type="scope.row.enabled === 1 ? 'success' : 'info'">
              {{ scope.row.enabled === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="openEdit(scope.row)">编辑</el-button>
            <el-button
              size="small"
              :type="scope.row.enabled === 1 ? 'warning' : 'success'"
              @click="handleToggleEnabled(scope.row)"
            >
              {{ scope.row.enabled === 1 ? '停用' : '启用' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
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
      :title="editingId ? '编辑表情' : '新增表情'"
      width="520px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio-button label="emoji">Emoji</el-radio-button>
            <el-radio-button label="kaomoji">颜文字</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="2"
            placeholder="文本表情（如 😀 / (｡･ω･｡)）或图片 URL"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="上传图片" v-if="form.type !== 'kaomoji'">
          <el-upload
            :show-file-list="false"
            :http-request="handleUpload"
            accept="image/*"
          >
            <el-button>上传图片表情</el-button>
          </el-upload>
          <span v-if="uploading" class="upload-hint">上传中...</span>
          <span v-else-if="form.content" class="upload-hint">上传成功后自动填入 URL</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { emoji, upload } from '@/api'

interface EmojiItem {
  id: number
  content: string
  type: 'emoji' | 'kaomoji'
  isCustom: number
  enabled: number
  sortOrder: number
  createdAt: string
}

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const emojiList = ref<EmojiItem[]>([])

const filters = reactive({
  type: '',
  enabled: '' as string | ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<any>(null)
const form = reactive({
  content: '',
  type: 'emoji' as 'emoji' | 'kaomoji',
  enabled: true,
  sortOrder: 0
})

const rules = {
  content: [{ required: true, message: '请输入表情内容', trigger: 'blur' }]
}

const isImageUrl = (value: string) => /^https?:\/\/[^\s"'<>\\]+$/i.test(value)

const fetchList = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filters.type) params.type = filters.type
    if (filters.enabled !== '') params.enabled = filters.enabled === '1'
    const response = await emoji.getList(params)
    if (response.code === 200) {
      emojiList.value = response.data.list
      pagination.total = response.data.total
    }
  } catch {
    ElMessage.error('获取表情列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchList()
}

const handleReset = () => {
  filters.type = ''
  filters.enabled = ''
  handleSearch()
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

const openCreate = () => {
  editingId.value = null
  form.content = ''
  form.type = 'emoji'
  form.enabled = true
  form.sortOrder = 0
  dialogVisible.value = true
}

const openEdit = (row: EmojiItem) => {
  editingId.value = row.id
  form.content = row.content
  form.type = row.type
  form.enabled = row.enabled === 1
  form.sortOrder = row.sortOrder
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const payload = {
      content: form.content.trim(),
      type: form.type,
      isCustom: editingId.value != null ? true : form.content.startsWith('http') ? true : false,
      enabled: form.enabled,
      sortOrder: form.sortOrder
    }
    const response = editingId.value
      ? await emoji.update(editingId.value, payload)
      : await emoji.create(payload)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success(editingId.value ? '表情已更新' : '表情添加成功')
      dialogVisible.value = false
      fetchList()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    saving.value = false
  }
}

const handleToggleEnabled = async (row: EmojiItem) => {
  try {
    const response = await emoji.update(row.id, { enabled: row.enabled === 1 ? false : true })
    if (response.code === 200) {
      ElMessage.success('状态已更新')
      fetchList()
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch {
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (row: EmojiItem) => {
  try {
    await ElMessageBox.confirm('确定删除该表情吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await emoji.delete(row.id)
    if (response.code === 200) {
      ElMessage.success('已删除')
      fetchList()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 上传图片表情（复用 upload.image，scene='emoji'）
const handleUpload = async (options: any) => {
  uploading.value = true
  try {
    const file = options.file as File
    const response = await upload.image(file, 'emoji')
    if (response.code === 200) {
      form.content = response.data.url
      ElMessage.success('图片上传成功')
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  } catch {
    ElMessage.error('上传失败（仅支持 jpg/png/gif/webp，≤20MB）')
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions h3 {
  margin: 0;
}

.filter-bar {
  margin-bottom: 16px;
}

.emoji-preview {
  font-size: 22px;
  line-height: 40px;
}

.emoji-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 6px;
}

.upload-hint {
  margin-left: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
