<template>
  <div class="emoji-manage">
    <el-card>
      <template #header>
        <div class="header-actions">
          <h3>表情管理</h3>
          <el-button
            v-if="activeTab === 'emoji'"
            type="primary"
            @click="openCreate"
          >新增表情</el-button>
          <el-button v-else type="primary" @click="openCreateGroup">新增分组</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="emoji-manage-tabs">
        <el-tab-pane label="表情列表" name="emoji">
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filters">
          <el-form-item label="类型">
            <el-select v-model="filters.type" placeholder="全部类型" clearable style="width: 140px">
              <el-option label="Emoji" value="emoji" />
              <el-option label="颜文字" value="kaomoji" />
              <el-option label="图片" value="image" />
            </el-select>
          </el-form-item>
          <el-form-item label="分组">
            <el-select v-model="filters.groupId" placeholder="全部分组" clearable style="width: 160px">
              <el-option label="未分组" :value="0" />
              <el-option
                v-for="group in groupList"
                :key="group.id"
                :label="group.name"
                :value="group.id"
              />
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
            <el-tag :type="typeTagType(scope.row.type)">
              {{ typeLabel(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分组" width="130">
          <template #default="scope">
            <el-tag v-if="scope.row.groupName" type="info" effect="plain">
              {{ scope.row.groupName }}
            </el-tag>
            <span v-else class="text-muted">未分组</span>
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
        </el-tab-pane>

        <!-- 分组管理 -->
        <el-tab-pane label="分组管理" name="group">
          <el-table
            :data="groupList"
            v-loading="groupLoading"
            style="width: 100%"
            row-key="id"
          >
            <el-table-column label="ID" prop="id" width="70" />
            <el-table-column label="标识" width="100">
              <template #default="scope">
                <img
                  v-if="isImageUrl(scope.row.cover)"
                  :src="scope.row.cover"
                  class="emoji-img"
                  alt="分组标识"
                />
                <span v-else class="emoji-preview">{{ scope.row.cover || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="名称" prop="name" min-width="160" />
            <el-table-column label="表情数" width="90" prop="emojiCount" />
            <el-table-column label="排序" prop="sortOrder" width="80" />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="scope">
                <el-button size="small" @click="openEditGroup(scope.row)">编辑</el-button>
                <el-button size="small" type="danger" @click="handleDeleteGroup(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
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
            <el-radio-button label="image">图片</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分组">
          <el-select v-model="form.groupId" placeholder="未分组" clearable style="width: 100%">
            <el-option
              v-for="group in groupList"
              :key="group.id"
              :label="group.name"
              :value="group.id"
            />
          </el-select>
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

    <!-- 新增/编辑分组对话框 -->
    <el-dialog
      v-model="groupDialogVisible"
      :title="editingGroupId ? '编辑分组' : '新增分组'"
      width="480px"
    >
      <el-form :model="groupForm" :rules="groupRules" ref="groupFormRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="如：默认 / 猫猫 / 表情包" maxlength="50" />
        </el-form-item>
        <el-form-item label="标识">
          <el-input
            v-model="groupForm.cover"
            placeholder="Emoji 文本（如 😀）或图片 URL"
          />
        </el-form-item>
        <el-form-item label="上传标识" v-if="!isImageUrl(groupForm.cover)">
          <el-upload
            :show-file-list="false"
            :http-request="handleGroupCoverUpload"
            accept="image/*"
          >
            <el-button>上传标识图</el-button>
          </el-upload>
          <span v-if="groupUploading" class="upload-hint">上传中...</span>
        </el-form-item>
        <el-form-item v-else label="标识预览">
          <img :src="groupForm.cover" class="emoji-img" alt="分组标识" />
          <el-button size="small" class="remove-cover" @click="groupForm.cover = ''">移除</el-button>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="groupForm.sortOrder" :min="0" :max="9999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="groupSaving" @click="handleSaveGroup">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  emoji,
  emojiGroup,
  upload,
  type EmojiItem,
  type EmojiGroupItem,
  type EmojiType,
} from '@/api'

// 当前 Tab：表情列表 / 分组管理
const activeTab = ref<'emoji' | 'group'>('emoji')

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const emojiList = ref<EmojiItem[]>([])

// 分组管理状态
const groupLoading = ref(false)
const groupSaving = ref(false)
const groupUploading = ref(false)
const groupList = ref<EmojiGroupItem[]>([])
const groupDialogVisible = ref(false)
const editingGroupId = ref<number | null>(null)
const groupFormRef = ref<any>(null)
const groupForm = reactive({
  name: '',
  cover: '',
  sortOrder: 0
})
const groupRules = {
  name: [{ required: true, message: '请输入分组名称', trigger: 'blur' }]
}

const filters = reactive({
  type: '',
  groupId: '' as number | '',
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
  type: 'emoji' as EmojiType,
  groupId: null as number | null,
  enabled: true,
  sortOrder: 0
})

const rules = {
  content: [{ required: true, message: '请输入表情内容', trigger: 'blur' }]
}

const isImageUrl = (value: string | null) =>
  !!value && /^https?:\/\/[^\s"'<>\\]+$/i.test(value)

// 类型展示：A 起支持 emoji / kaomoji / image
const typeLabel = (type: EmojiType) =>
  type === 'kaomoji' ? '颜文字' : type === 'image' ? '图片' : 'Emoji'
const typeTagType = (type: EmojiType) =>
  type === 'kaomoji' ? 'warning' : type === 'image' ? 'danger' : 'success'

const fetchList = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (filters.type) params.type = filters.type
    if (filters.groupId !== '') params.groupId = filters.groupId
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
  filters.groupId = ''
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
  form.groupId = null
  form.enabled = true
  form.sortOrder = 0
  dialogVisible.value = true
}

const openEdit = (row: EmojiItem) => {
  editingId.value = row.id
  form.content = row.content
  form.type = row.type
  form.groupId = row.groupId ?? null
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
      groupId: form.groupId ?? null,
      isCustom: editingId.value != null ? true : form.content.startsWith('http'),
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

// ===== 分组管理 =====
const fetchGroups = async () => {
  groupLoading.value = true
  try {
    const response = await emojiGroup.getList()
    if (response.code === 200) {
      groupList.value = response.data || []
    }
  } catch {
    ElMessage.error('获取分组列表失败')
  } finally {
    groupLoading.value = false
  }
}

const openCreateGroup = () => {
  editingGroupId.value = null
  groupForm.name = ''
  groupForm.cover = ''
  groupForm.sortOrder = 0
  groupDialogVisible.value = true
}

const openEditGroup = (row: EmojiGroupItem) => {
  editingGroupId.value = row.id
  groupForm.name = row.name
  groupForm.cover = row.cover || ''
  groupForm.sortOrder = row.sortOrder
  groupDialogVisible.value = true
}

const handleSaveGroup = async () => {
  const valid = await groupFormRef.value?.validate().catch(() => false)
  if (!valid) return
  groupSaving.value = true
  try {
    const payload = {
      name: groupForm.name.trim(),
      cover: groupForm.cover.trim() || null,
      sortOrder: groupForm.sortOrder
    }
    const response = editingGroupId.value
      ? await emojiGroup.update(editingGroupId.value, payload)
      : await emojiGroup.create(payload)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success(editingGroupId.value ? '分组已更新' : '分组创建成功')
      groupDialogVisible.value = false
      await Promise.all([fetchGroups(), fetchList()])
    } else {
      ElMessage.error(response.message || '操作失败')
    }
  } catch {
    ElMessage.error('操作失败')
  } finally {
    groupSaving.value = false
  }
}

const handleDeleteGroup = async (row: EmojiGroupItem) => {
  try {
    await ElMessageBox.confirm(
      `确定删除分组「${row.name}」吗？组内 ${row.emojiCount} 个表情将退回未分组。`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const response = await emojiGroup.delete(row.id)
    if (response.code === 200) {
      ElMessage.success('已删除')
      await Promise.all([fetchGroups(), fetchList()])
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 上传分组标识图（复用 upload.image，scene='emoji'）
const handleGroupCoverUpload = async (options: any) => {
  groupUploading.value = true
  try {
    const file = options.file as File
    const response = await upload.image(file, 'emoji')
    if (response.code === 200) {
      groupForm.cover = response.data.url
      ElMessage.success('图片上传成功')
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  } catch {
    ElMessage.error('上传失败（仅支持 jpg/png/gif/webp，≤20MB）')
  } finally {
    groupUploading.value = false
  }
}

onMounted(async () => {
  // 先取分组（表情弹窗/筛选需要），再取列表
  await fetchGroups()
  await fetchList()
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

.text-muted {
  color: var(--text-secondary);
  font-size: 13px;
}

.remove-cover {
  margin-left: 12px;
}

.emoji-manage-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 16px;
  }
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
