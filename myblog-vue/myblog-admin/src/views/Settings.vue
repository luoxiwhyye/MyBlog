<template>
  <div class="settings">
    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="page-header">
          <div>
            <h3>系统设置</h3>
            <p class="page-desc">分组管理站点配置，保存后即时生效（缓存自动失效）。支持一键导出 / 导入 JSON。</p>
          </div>
          <div class="header-actions">
            <el-button @click="exportJson" :icon="Download">导出配置</el-button>
            <el-upload
              :show-file-list="false"
              accept="application/json"
              :auto-upload="false"
              :on-change="handleImportFile"
            >
              <el-button :icon="Upload">导入配置</el-button>
            </el-upload>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="settings-tabs">
        <el-tab-pane
          v-for="group in groups"
          :key="group.key"
          :name="group.key"
          :label="group.label"
        >
          <el-form
            :ref="(el: any) => setFormRef(group.key, el)"
            :model="formData"
            :rules="formRules"
            label-width="140px"
            label-position="right"
            class="settings-form"
          >
            <el-form-item
              v-for="field in group.fields"
              :key="field.key"
              :label="field.label"
              :prop="field.key"
            >
              <!-- 文本类型 -->
              <el-input
                v-if="field.type === 'text'"
                v-model="formData[field.key]"
                :placeholder="field.placeholder"
                clearable
              />

              <!-- 多行文本 -->
              <el-input
                v-else-if="field.type === 'textarea'"
                v-model="formData[field.key]"
                type="textarea"
                :rows="field.rows ?? 3"
                :placeholder="field.placeholder"
              />

              <!-- 图片类型 -->
              <div v-else-if="field.type === 'image'" class="image-field">
                <div class="image-preview" v-if="formData[field.key]">
                  <el-image
                    :src="formData[field.key]"
                    fit="cover"
                    class="preview-img"
                  />
                  <div class="image-actions">
                    <el-upload
                      :ref="(el: any) => setUploadRef(field.key, el)"
                      :action="''"
                      :auto-upload="false"
                      :show-file-list="false"
                      :on-change="(file: any) => handleImageChange(field.key, file)"
                      accept="image/*"
                    >
                      <el-button size="small" type="primary">更换</el-button>
                    </el-upload>
                    <el-button size="small" type="danger" plain @click="removeImage(field.key)">清除</el-button>
                  </div>
                </div>
                <el-upload
                  v-else
                  :ref="(el: any) => setUploadRef(field.key, el)"
                  :action="''"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="(file: any) => handleImageChange(field.key, file)"
                  accept="image/*"
                  drag
                >
                  <div class="upload-placeholder">
                    <el-icon :size="24"><UploadFilled /></el-icon>
                    <span>点击或拖拽上传图片</span>
                  </div>
                </el-upload>
              </div>

              <!-- 布尔类型 -->
              <el-switch
                v-else-if="field.type === 'boolean'"
                v-model="formData[field.key]"
                :active-value="'true'"
                :inactive-value="'false'"
              />

              <!-- 社交链接：可视化编辑器（名称 / URL / 图标 / 动作） -->
              <!-- 分两行：编辑器可用宽度仅 ~500px，五列单行会把最长的 URL 挤到不可用 -->
              <div v-else-if="field.type === 'social_links'" class="social-links-editor">
                <div v-for="(item, idx) in socialLinkRows" :key="idx" class="social-link-row">
                  <div class="social-link-line">
                    <el-input
                      v-model="item.name"
                      placeholder="名称，如 GitHub"
                      class="social-link-name"
                    />
                    <el-input
                      v-model="item.url"
                      placeholder="https://..."
                      class="social-link-url"
                    />
                    <el-button
                      type="danger"
                      plain
                      :icon="Delete"
                      :disabled="socialLinkRows.length <= 1"
                      @click="removeSocialLink(idx)"
                    />
                  </div>
                  <div class="social-link-line social-link-line--meta">
                    <el-select
                      v-model="item.icon"
                      placeholder="图标"
                      clearable
                      class="social-link-icon"
                    >
                      <el-option
                        v-for="opt in SOCIAL_ICON_OPTIONS"
                        :key="opt.key"
                        :label="opt.label"
                        :value="opt.key"
                      />
                    </el-select>
                    <el-select
                      v-model="item.action"
                      placeholder="动作"
                      class="social-link-action"
                    >
                      <el-option
                        v-for="opt in SOCIAL_ACTION_OPTIONS"
                        :key="opt.key"
                        :label="opt.label"
                        :value="opt.key"
                      />
                    </el-select>
                  </div>
                </div>
                <div class="social-link-actions">
                  <el-button :icon="Plus" @click="addSocialLink">添加一条</el-button>
                  <span class="social-link-hint"
                    >仅保留格式合法的条目（名称与链接均非空）；动作为「自动」时邮箱点击复制、其余新标签页打开</span
                  >
                </div>
              </div>

              <!-- 说明 -->
              <div v-if="field.description" class="field-desc">{{ field.description }}</div>
            </el-form-item>
          </el-form>

          <!-- 主题色分组：按维度独立设置 + 一键应用预设 -->
          <div v-if="group.key === 'theme'" class="theme-color-section">
            <div class="theme-toolbar">
              <span class="theme-toolbar-label">快速套用预设起始色：</span>
              <el-select
                v-model="activeThemePreset"
                placeholder="选择预设"
                class="theme-preset-select"
                @change="applyThemePreset"
              >
                <el-option
                  v-for="preset in THEME_COLOR_PRESET_MAP"
                  :key="preset.value"
                  :label="preset.name"
                  :value="preset.value"
                />
              </el-select>
            </div>

            <el-form label-width="140px" label-position="right" class="settings-form">
              <el-form-item
                v-for="dim in COLOR_DIMENSIONS"
                :key="dim.key"
                :label="dim.label"
                :prop="themeColorKey(dim.key, 'light')"
              >
                <div class="theme-dim">
                  <div
                    v-for="mode in COLOR_MODES"
                    :key="mode.mode"
                    class="color-field theme-mode"
                  >
                    <span class="theme-mode-label">{{ mode.label }}</span>
                    <el-color-picker
                      v-model="formData[themeColorKey(dim.key, mode.mode)]"
                      :predefine="dim.predefine"
                      size="large"
                    />
                    <span
                      class="color-hex"
                      :class="{ 'is-default': !formData[themeColorKey(dim.key, mode.mode)] }"
                    >
                      {{
                        formData[themeColorKey(dim.key, mode.mode)] ||
                        `默认 ${themeDefaultColor(dim.key, mode.mode)}`
                      }}
                    </span>
                    <!-- 分类色同时当边框 / 圆点用，需守非文本 3:1；这里实时给出与卡底的对比度 -->
                    <span
                      v-if="categoryContrast(dim.key, mode.mode) !== null"
                      class="contrast-hint"
                      :class="{ 'is-low': categoryContrastLow(dim.key, mode.mode) }"
                      :title="`与前台玻璃卡合成底的对比度（非文本需 ≥ ${NON_TEXT_MIN_RATIO}:1）；压在背景图深色区时会更低`"
                    >
                      对比度 {{ categoryContrastText(dim.key, mode.mode) }}
                    </span>
                    <el-button
                      v-if="formData[themeColorKey(dim.key, mode.mode)]"
                      size="small"
                      text
                      type="primary"
                      @click="formData[themeColorKey(dim.key, mode.mode)] = ''"
                    >
                      恢复默认
                    </el-button>
                  </div>
                </div>
                <div v-if="dim.description" class="field-desc">{{ dim.description }}</div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="自定义配置" name="custom">
          <div class="custom-config">
            <div class="custom-toolbar">
              <el-button type="primary" :icon="Plus" @click="openAddCustom">添加配置</el-button>
              <el-button :icon="Refresh" @click="fetchSettings">刷新</el-button>
              <el-button
                :icon="Check"
                :loading="savingCustomBatch"
                :disabled="!customConfigs.length"
                @click="saveCustomBatch"
              >
                保存自定义配置列表
              </el-button>
            </div>

            <el-alert
              v-if="customConfigs.length"
              type="info"
              :closable="false"
              show-icon
              class="custom-tip"
              title="自定义配置为 Key-Value 形式，保存后前台 settings store 会自动合并读取；删除请使用列表中“删除”按钮。"
            />

            <el-table v-if="customConfigs.length" :data="customConfigs" class="custom-table">
              <el-table-column prop="key" label="配置键" min-width="180" />
              <el-table-column prop="type" label="类型" width="110" />
              <el-table-column prop="value" label="配置值" min-width="220" show-overflow-tooltip />
              <el-table-column prop="description" label="备注描述" min-width="200" show-overflow-tooltip />
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" :icon="Edit" @click="openEditCustom(row)">编辑</el-button>
                  <el-button link type="danger" :icon="Delete" @click="handleCustomDelete(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-empty v-else description="暂无自定义配置，点击“添加配置”新增一个 Key-Value 配置项。" />
          </div>
        </el-tab-pane>

        <!-- 邮件通知：发信配置写在后端 .env（不在数据库），这里只做状态展示与测试发信 -->
        <el-tab-pane label="邮件通知" name="mail">
          <div class="mail-config">
            <el-alert
              :type="mailStatus?.status === 'ok' ? 'success' : 'warning'"
              :closable="false"
              show-icon
              :title="
                mailStatus?.status === 'ok'
                  ? 'SMTP 已配置：评论 / 回复 / 留言的邮件通知会正常发出'
                  : `邮件通知未生效（${mailStatus?.reason || '未获取到状态'}）`
              "
              :description="
                mailStatus?.status === 'ok'
                  ? '发信配置来自后端 .env，修改后需要重启后端才会生效。'
                  : '发信配置来自后端 .env（不在数据库里），需在服务器上填写 SMTP_* 并重启后端；下方可发一封测试邮件验证。'
              "
            />

            <div class="mail-toolbar">
              <el-button :icon="Refresh" :loading="mailLoading" @click="fetchMailStatus">刷新状态</el-button>
            </div>

            <el-descriptions :column="2" border class="mail-desc">
              <el-descriptions-item label="SMTP 主机">
                {{ mailStatus?.host || '未配置' }}
              </el-descriptions-item>
              <el-descriptions-item label="端口">
                {{ mailStatus?.port ?? '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="加密">
                {{ mailStatus ? encryptionLabel(mailStatus.encryption) : '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="发信账号">
                {{ mailStatus?.user || '未配置' }}
              </el-descriptions-item>
              <el-descriptions-item label="发信人">
                {{ mailStatus?.from || '未配置' }}
              </el-descriptions-item>
              <!-- SITE_URL 是邮件里链接的前缀：未配置时链接不带域名，收件人点开是空页 -->
              <el-descriptions-item label="站点地址">
                {{ mailStatus?.siteUrl || '未配置（邮件里的链接不带域名，收件人点开是空页）' }}
              </el-descriptions-item>
              <el-descriptions-item label="通知收件人">
                {{ mailStatus?.recipient || '未设置（见「个人资料」的邮箱）' }}
              </el-descriptions-item>
            </el-descriptions>

            <!-- 站点地址不可用（未配置 / 本机 / 内网 / 保留域名）→ 邮件里的链接收件人点不开。
                 本机地址是最容易漏的一种：面板上看着「已配置」，但收信人的「本机」不是这台服务器。 -->
            <el-alert
              v-if="mailStatus?.siteUrlWarning"
              type="warning"
              :closable="false"
              show-icon
              class="mail-site-url-warning"
              title="邮件里的链接收件人点不开"
              :description="`${mailStatus.siteUrlWarning}。请把后端 .env 的 SITE_URL 改成收信人能访问到的公网地址（如 https://你的域名）后重启后端。`"
            />

            <!-- 收件人是占位地址（example.com 等保留域名无 MX 记录）→ SMTP 配好也会全部退信 -->
            <el-alert
              v-if="mailStatus?.recipientWarning"
              type="error"
              :closable="false"
              show-icon
              class="mail-recipient-warning"
              title="通知收件人不可送达：真实通知会全部退信"
              :description="`${mailStatus.recipientWarning}。请到「个人资料 → 邮箱」改成你自己的邮箱。`"
            />

            <el-form label-width="90px" class="mail-test-form" @submit.prevent>
              <el-form-item label="收件人">
                <el-input v-model="mailTestTo" placeholder="留空则发给上方的通知收件人" clearable />
                <div class="field-desc">
                  仅用于测试发信，不会写入任何配置；收到邮件说明 SMTP 可用、通知链路已就绪。
                </div>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :icon="Promotion"
                  :loading="mailTesting"
                  @click="sendTestMail"
                >
                  发送测试邮件
                </el-button>
              </el-form-item>
            </el-form>

            <el-alert
              type="info"
              :closable="false"
              show-icon
              class="mail-tip"
              title="后端 .env 需要配置项"
              description="SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS（可选 SMTP_FROM 指定发信人）。不配置时邮件通知会静默跳过，不影响评论与留言的发布。SITE_URL / SITE_NAME 决定邮件里链接的域名与署名。"
            />
          </div>
        </el-tab-pane>
      </el-tabs>

      <div class="actions" v-if="activeTab !== 'mail'">
        <el-button
          type="primary"
          :loading="saving"
          :icon="Check"
          @click="saveSettings"
        >
          保存所有配置
        </el-button>
        <el-button @click="resetForm">重置未保存修改</el-button>
      </div>
    </el-card>

    <el-dialog
      v-model="customDialogVisible"
      :title="customEditingKey ? '编辑配置' : '添加配置'"
      width="560px"
      @closed="resetCustomForm"
    >
      <el-form
        ref="customFormRef"
        :model="customForm"
        :rules="customRules"
        label-width="90px"
      >
        <el-form-item label="配置键" prop="key">
          <el-input
            v-model="customForm.key"
            :disabled="!!customEditingKey"
            placeholder="如 notice / custom_nav"
          />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="customForm.type" placeholder="选择类型">
            <el-option label="文本" value="text" />
            <el-option label="富文本 HTML" value="html" />
            <el-option label="布尔" value="boolean" />
            <el-option label="图片(URL)" value="image" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置值" prop="value">
          <el-switch
            v-if="customForm.type === 'boolean'"
            v-model="customForm.value"
            active-value="true"
            inactive-value="false"
          />
          <el-input
            v-else-if="customForm.type === 'html'"
            v-model="customForm.value"
            type="textarea"
            :rows="4"
            placeholder="请输入内容"
          />
          <el-input
            v-else
            v-model="customForm.value"
            :type="customForm.type === 'text' ? 'textarea' : 'text'"
            :rows="customForm.type === 'text' ? 3 : 1"
            placeholder="请输入配置值"
          />
        </el-form-item>
        <el-form-item label="备注描述" prop="description">
          <el-input
            v-model="customForm.description"
            placeholder="可选，说明该配置的用途"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="customDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingCustom" @click="saveCustomConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Download, Upload, UploadFilled, Check, Plus, Edit, Delete, Refresh, Promotion } from '@element-plus/icons-vue'
import { setting, upload, mail } from '@/api'
import { cropImage, cropPresets, type CropScene } from '@/utils/imageCropper'

interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'boolean' | 'color' | 'social_links'
  placeholder?: string
  description?: string
  required?: boolean
  /** 仅 textarea 生效：输入框显示行数（默认 3） */
  rows?: number
  /** 仅 image 生效：上传前的裁剪比例预设（见 utils/imageCropper.ts） */
  crop?: CropScene
}

// 社交链接图标候选项（与前台 myblog-blog/utils/socialIcons.ts 的 SOCIAL_ICON_KEYS 保持键名一致）
const SOCIAL_ICON_OPTIONS = [
  { key: '', label: '无图标' },
  { key: 'github', label: 'GitHub' },
  { key: 'gitee', label: 'Gitee' },
  { key: 'weibo', label: '微博' },
  { key: 'bilibili', label: '哔哩哔哩' },
  { key: 'zhihu', label: '知乎' },
  { key: 'juejin', label: '掘金' },
  { key: 'x', label: 'X (Twitter)' },
  { key: 'email', label: '邮箱' },
  { key: 'rss', label: 'RSS' },
  { key: 'douban', label: '豆瓣' },
  { key: 'telegram', label: 'Telegram' },
] as const

// 社交链接点击行为候选项（与前台 myblog-blog/utils/socialLinks.ts 的取值保持一致）
// 空值 = 前台自动推导：邮箱默认复制，其余新标签页打开
const SOCIAL_ACTION_OPTIONS = [
  { key: '', label: '自动' },
  { key: 'link', label: '新标签页打开' },
  { key: 'copy', label: '点击复制' },
] as const

interface GroupConfig {
  key: string
  label: string
  fields: FieldConfig[]
}

// ===== 主题色维度配置 =====
// 主题色拆成 5 个独立维度，每维可分别设置「亮色」「暗色」两套主色，互不影响。
// 颜色均走 CSS 变量，未设置（留空）时前台回退到默认预设（晴空青）。
// 设置键规则：site_theme_{dim}_{light|dark}
//
// ⚠️ 输入语义是「**选什么就是什么**」：accent / category / fav 本体、gradient 的起始色、
//    deco 的光晕主色，前台都取输入原值；各维度里其余变量（文字/描边档、徽标底、
//    渐变结束色与文字色 …）由前台按同色系派生，**后台不提供单独设置入口**。
//
// `predefine` 一律取 5 套预设在同一维度的**亮色**值（同一份数据，改预设时同步改这里）——
// 这样每个色块都是设计过的值；category 有 ≥3:1 的非文本约束，尤其不要放粉彩色。
const COLOR_DIMENSIONS = [
  {
    key: 'accent',
    label: '强调色',
    description:
      '链接、主按钮、当前选中、面包屑高亮、统计数字等交互强调场景。前台会自动派生文字/描边档（链接、图标、边框、focus 都用它）；填充面上的文字：亮色配白字、暗色配同色系深字。',
    predefine: ['#008fbe', '#0d9488', '#2563eb', '#7c3aed', '#d97706'],
  },
  {
    key: 'category',
    label: '分类装饰色',
    description:
      '分类/标签徽标底、页头页脚渐变、边框与高亮描边、时间线圆点等【装饰】场景。前台所有品牌【文字】色统一由强调色派生（这里只影响图形）。⚠️ 它同时当边框 / 圆点用，需与卡底保持 ≥3:1 —— 不要太亮，下方会实时给出对比度。',
    predefine: ['#147fa8', '#0d9488', '#2563eb', '#8b5cf6', '#b45309'],
  },
  {
    key: 'fav',
    label: '收藏星标色',
    description: '收藏/星标、搜索命中高亮 mark 等暖色强调场景。',
    predefine: ['#f59e0b', '#fbbf24', '#ef4444', '#ec4899'],
  },
  {
    key: 'gradient',
    label: '品牌渐变',
    description:
      '标题竖条、最新/热文徽标、热门排名徽标等品牌渐变。**输入就是渐变起始色**（原样使用，不再提亮）；结束色与渐变上的文字色由前台按同色系派生。',
    predefine: ['#61c9e5', '#5eead4', '#93c5fd', '#c4b5fd', '#fbbf24'],
  },
  {
    key: 'deco',
    label: '装饰光效',
    description:
      '装饰光晕、卡片光效阴影、文字光效等氛围装饰。**输入就是光晕主色**（原样使用，只加透明度）；同色系第二档光晕由前台派生。',
    predefine: ['#61c9e5', '#2dd4bf', '#60a5fa', '#c4b5fd', '#fbbf24'],
  },
]

// 主题色的亮/暗模式标签（用于色块分组显示）
const COLOR_MODES = [
  { mode: 'light', label: '亮色' },
  { mode: 'dark', label: '暗色' },
]

// 设置键生成：site_theme_{dim}_{mode}
const themeColorKey = (dim: string, mode: string) => `site_theme_${dim}_${mode}`

// 一键应用预设：每套预设映射到 5 个维度的亮/暗起始色
//
// ⚠️ 本表与前台 `utils/themeColor.ts` 的 `THEME_COLOR_PRESETS` 是**两份手写数据**，
//    两者之间没有任何代码级引用（前台的 value 是 accent 亮色 hex，这里的 value 是 slug）。
//    同步由前台单测 `utils/tools/themePresetSync.test.ts` 守住 ——
//    改这里（名称 / 任一色值）后跑一次 `npm run test`，红了就是漏改另一边。
// ⚠️ 「恢复默认」= 把该维度的设置键清空（前台回退到预设里手写的最终值）。
//    套用预设只能让起点变成「同一个基色」，派生的全部变量不会逐字段等于默认 ——
//    所以要回到默认外观，用各维度自己的「恢复默认」，不要靠套用预设。
const THEME_COLOR_PRESET_MAP = [
  {
    name: '晴空青（当前/默认）',
    value: 'slate',
    colors: {
      site_theme_accent_light: '#008fbe',
      site_theme_accent_dark: '#22d3ee',
      site_theme_category_light: '#147fa8',
      site_theme_category_dark: '#22d3ee',
      site_theme_fav_light: '#f59e0b',
      site_theme_fav_dark: '#fbbf24',
      site_theme_gradient_light: '#61c9e5',
      site_theme_gradient_dark: '#34d0c2',
      site_theme_deco_light: '#61c9e5',
      site_theme_deco_dark: '#5a8cdc',
    },
  },
  {
    name: '薄荷青',
    value: 'mint',
    colors: {
      site_theme_accent_light: '#0d9488',
      site_theme_accent_dark: '#2dd4bf',
      site_theme_category_light: '#0d9488',
      site_theme_category_dark: '#2dd4bf',
      site_theme_fav_light: '#f59e0b',
      site_theme_fav_dark: '#fbbf24',
      site_theme_gradient_light: '#5eead4',
      site_theme_gradient_dark: '#2dd4bf',
      site_theme_deco_light: '#2dd4bf',
      site_theme_deco_dark: '#2dd4bf',
    },
  },
  {
    name: '天青蓝',
    value: 'azure',
    colors: {
      site_theme_accent_light: '#2563eb',
      site_theme_accent_dark: '#60a5fa',
      site_theme_category_light: '#2563eb',
      site_theme_category_dark: '#60a5fa',
      site_theme_fav_light: '#f59e0b',
      site_theme_fav_dark: '#fbbf24',
      site_theme_gradient_light: '#93c5fd',
      site_theme_gradient_dark: '#3b82f6',
      site_theme_deco_light: '#60a5fa',
      site_theme_deco_dark: '#60a5fa',
    },
  },
  {
    name: '暮紫藤',
    value: 'wisteria',
    colors: {
      site_theme_accent_light: '#7c3aed',
      site_theme_accent_dark: '#a78bfa',
      site_theme_category_light: '#8b5cf6',
      site_theme_category_dark: '#a78bfa',
      site_theme_fav_light: '#f59e0b',
      site_theme_fav_dark: '#fbbf24',
      site_theme_gradient_light: '#c4b5fd',
      site_theme_gradient_dark: '#8b5cf6',
      site_theme_deco_light: '#c4b5fd',
      site_theme_deco_dark: '#a78bfa',
    },
  },
  {
    name: '暖琥珀',
    value: 'amber',
    colors: {
      site_theme_accent_light: '#d97706',
      site_theme_accent_dark: '#fbbf24',
      site_theme_category_light: '#b45309',
      site_theme_category_dark: '#f59e0b',
      site_theme_fav_light: '#ea580c',
      site_theme_fav_dark: '#fb923c',
      site_theme_gradient_light: '#fbbf24',
      site_theme_gradient_dark: '#f59e0b',
      site_theme_deco_light: '#fbbf24',
      site_theme_deco_dark: '#fbbf24',
    },
  },
]

// 配置分组 Schema（前端声明式驱动，与后端 setting 表 key 一一对应）
const groups: GroupConfig[] = [
  {
    key: 'basic',
    label: '基本设置',
    fields: [
      {
        key: 'site_name',
        label: '网站名称',
        type: 'text',
        placeholder: '请输入网站名称',
        required: true,
      },
      {
        key: 'site_established',
        label: '网站建立年份',
        type: 'text',
        placeholder: '如：2020',
        description: '显示在关于页的「建立时间」，为空时自动取站点最早文章年份。',
      },
      {
        key: 'site_description',
        label: '网站描述',
        type: 'textarea',
        placeholder: '一句话介绍你的博客',
      },
      {
        key: 'site_icp',
        label: 'ICP 备案号',
        type: 'text',
        placeholder: '如：京ICP备XXXXXXXX号',
        description: '显示在页脚，为空则不显示。',
      },
      {
        key: 'site_admin_url',
        label: '后台入口',
        type: 'text',
        placeholder: '如：https://admin.example.com 或 /admin/',
        description:
          '前台页脚的文字入口，为空则不显示。可填完整 URL（生产环境前后台不同域时用这个），也可填相对路径（需反向代理到后台）。',
      },
      {
        key: 'enable_tools',
        label: '启用工具箱',
        type: 'boolean',
        description: '关闭后前台隐藏工具箱入口，直接访问 /tools 显示关闭提示。',
      },
      {
        key: 'enable_message_board',
        label: '启用留言板',
        type: 'boolean',
        description: '关闭后前台隐藏留言板入口，直接访问 /message-board 显示关闭提示。',
      },
      {
        key: 'site_maintenance',
        label: '全站维护模式',
        type: 'boolean',
        description: '开启后前台所有页面跳转到维护页（可通过 ?bypass=maintenance 预览）。',
      },
    ],
  },
  {
    key: 'theme',
    label: '主题色',
    fields: [],
  },
  {
    key: 'appearance',
    label: '外观与品牌',
    fields: [
      {
        key: 'site_logo',
        label: '网站 Logo',
        type: 'image',
        crop: 'setting-logo',
        description: '用于页头与 Open Graph 分享卡片。',
      },
      {
        key: 'site_favicon',
        label: 'Favicon',
        type: 'image',
        crop: 'setting-favicon',
        description: '浏览器标签页图标，建议 32x32。',
      },
      {
        key: 'site_bg_light',
        label: '桌面端亮色背景图',
        type: 'image',
        crop: 'setting-bg-desktop',
        description:
          '桌面端亮色模式下的博客背景图（宽幅构图）。\n建议 16:9 及以上、至少 1920×1080，单张控制在 2MB 以内；前台按 cover 铺满窗口，用的是上传的原图（不会再压缩），主体请放在画面中部。',
      },
      {
        key: 'site_bg_dark',
        label: '桌面端暗色背景图',
        type: 'image',
        crop: 'setting-bg-desktop',
        description:
          '桌面端暗色模式下的博客背景图（宽幅构图）。\n建议 16:9 及以上、至少 1920×1080，单张控制在 2MB 以内；前台按 cover 铺满窗口，用的是上传的原图（不会再压缩），主体请放在画面中部。',
      },
      {
        key: 'site_bg_light_mobile',
        label: '移动端亮色背景图',
        type: 'image',
        crop: 'setting-bg-mobile',
        description:
          '移动端（≤768px）亮色模式背景图，建议竖版构图；留空时自动沿用桌面端亮色背景图。\n建议 9:16、至少 1080×1920，单张控制在 2MB 以内；前台按 cover 铺满屏幕，用的是上传的原图（不会再压缩）。',
      },
      {
        key: 'site_bg_dark_mobile',
        label: '移动端暗色背景图',
        type: 'image',
        crop: 'setting-bg-mobile',
        description:
          '移动端（≤768px）暗色模式背景图，建议竖版构图；留空时自动沿用桌面端暗色背景图。\n建议 9:16、至少 1080×1920，单张控制在 2MB 以内；前台按 cover 铺满屏幕，用的是上传的原图（不会再压缩）。',
      },
    ],
  },
  {
    key: 'home',
    label: '首页内容',
    fields: [
      {
        key: 'announcement',
        label: '首页公告',
        type: 'textarea',
        rows: 5,
        placeholder: '请输入公告内容',
        description:
          '显示在首页顶部的公告栏，为空则不显示。支持换行：在输入框内回车换行，前台会按原样分行展示（移动端同样完整显示，不截断），建议控制在几行以内。',
      },
      {
        key: 'social_links',
        label: '社交链接',
        type: 'social_links',
        placeholder: '[{"name":"GitHub","url":"https://github.com/"}]',
        description: '首页展示的社交链接。可逐条维护「名称 / 链接 / 图标 / 动作」；图标为空时前台回退为文本显示，动作为「自动」时邮箱点击复制、其余新标签页打开。推荐 3 个以内。',
      },
    ],
  },
]

const activeTab = ref('basic')
const saving = ref(false)
const formRefs = ref<Record<string, FormInstance>>({})
const setFormRef = (key: string, el: any) => {
  if (el) formRefs.value[key] = el
}
const settings = ref<Record<string, any>>({})
const formData = reactive<Record<string, any>>({})
const uploadRefs = ref<Record<string, any>>({})

// 主题色预设选择器应用状态
const activeThemePreset = ref('')

// 一键应用整套预设：把 5 个维度 × 亮/暗色值填到 formData
// ⚠️ 它只是把**起始色**填好，派生的其余变量不会逐字段等于默认 —— 回到默认外观
//    请用各维度自己的「恢复默认」（清空设置键 → 前台回退预设里手写的最终值）。
const applyThemePreset = (presetValue: string) => {
  const preset = THEME_COLOR_PRESET_MAP.find((p) => p.value === presetValue)
  if (!preset) return
  Object.keys(preset.colors).forEach((key) => {
    formData[key] = preset.colors[key as keyof typeof preset.colors] ?? ''
  })
  ElMessage.success(`已填入「${preset.name}」的起始色，请点击「保存所有配置」生效`)
}

// ===== 主题色：默认值显示 + 非文本对比度提示 =====

// 未配置（设置键为空）时前台实际会用到的颜色 —— 直接取预设表里「晴空青」那一行，
// 与「快速应用整套预设」共用同一份数据，不再单独维护一份默认值表。
const THEME_DEFAULT_COLORS = (THEME_COLOR_PRESET_MAP[0]?.colors ?? {}) as Record<string, string>

/** 某维度某模式未配置时前台会用的颜色 */
const themeDefaultColor = (dim: string, mode: string): string =>
  THEME_DEFAULT_COLORS[themeColorKey(dim, mode)] ?? ''

/**
 * 前台玻璃卡的等效底色 = 卡底叠在背景图**均值区域**上的合成色（实测）：
 *   亮 rgba(244,251,255,0.7) × site_bg_light 均值 rgb(159,199,229) → rgb(218,236,247)
 *   暗 rgba(22,33,62,0.65)  × site_bg_dark  均值 rgb(56,69,93)   → rgb(34,46,73)
 * 压在背景图深色区时会更低，所以下面的对比度是「估算」而不是保证。
 * 口径与数值同 `design-system.md` §1.4。
 */
const GLASS_CARD_BASE: Record<'light' | 'dark', [number, number, number]> = {
  light: [218, 236, 247],
  dark: [34, 46, 73],
}

/** 非文本图形（边框 / 圆点 / focus 描边）的下限 */
const NON_TEXT_MIN_RATIO = 3

const srgbLuminance = ([r, g, b]: [number, number, number]): number => {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * 该维度该模式**当前生效的颜色**（未配置则用默认值）对卡底的对比度。
 * 只对 category 返回数值 —— 其他维度不当边框 / 圆点用，没有这个约束。
 */
const categoryContrast = (dim: string, mode: string): number | null => {
  if (dim !== 'category') return null
  const raw = String(formData[themeColorKey(dim, mode)] || themeDefaultColor(dim, mode)).trim()
  const m = /^#([0-9a-f]{6})$/i.exec(raw)
  if (!m) return null
  const n = parseInt(m[1] ?? '', 16)
  const rgb: [number, number, number] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const base: [number, number, number] = mode === 'dark' ? GLASS_CARD_BASE.dark : GLASS_CARD_BASE.light
  const [a, b] = [srgbLuminance(rgb), srgbLuminance(base)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const categoryContrastText = (dim: string, mode: string): string => {
  const ratio = categoryContrast(dim, mode)
  return ratio === null ? '' : `${ratio.toFixed(2)}:1`
}

const categoryContrastLow = (dim: string, mode: string): boolean => {
  const ratio = categoryContrast(dim, mode)
  return ratio !== null && ratio < NON_TEXT_MIN_RATIO
}

const allFields = computed(() => {
  const groupFields = groups.flatMap((group) => group.fields)
  const themeDims: FieldConfig[] = COLOR_DIMENSIONS.flatMap((dim) =>
    COLOR_MODES.map((mode) => ({
      key: themeColorKey(dim.key, mode.mode),
      label: `${dim.label}（${mode.label}）`,
      type: 'color',
      description: dim.description,
    })),
  )
  return [...groupFields, ...themeDims]
})

// ===== 自定义配置（Key-Value）管理 =====
const customDialogVisible = ref(false)
const customEditingKey = ref('')
const customFormRef = ref<FormInstance>()
const customForm = reactive({ key: '', value: '', type: 'text', description: '' })
const savingCustom = ref(false)
const savingCustomBatch = ref(false)

// 预设 schema 之外的键即为自定义配置
const customConfigs = computed(() => {
  const presetSet = new Set(allFields.value.map((f) => f.key))
  return Object.entries(settings.value)
    .filter(([key]) => !presetSet.has(key))
    .map(([key, item]) => ({
      key,
      value: item.value,
      type: item.type,
      description: item.description || '',
    }))
})

const customRules = computed<FormRules>(() => {
  const rules: FormRules = {}
  if (!customEditingKey.value) {
    rules.key = [
      { required: true, message: '请输入配置键', trigger: 'blur' },
      {
        validator: (_rule, value: string, callback) => {
          if (!value) {
            callback()
            return
          }
          if (!/^[\p{L}\p{N}_.-]{1,100}$/u.test(value)) {
            callback(new Error('配置键只能包含字母、数字、下划线、点、连字符'))
            return
          }
          if (allFields.value.some((f) => f.key === value)) {
            callback(new Error('该配置键已被预设字段占用'))
            return
          }
          if (customConfigs.value.some((c) => c.key === value)) {
            callback(new Error('该配置键已存在'))
            return
          }
          callback()
        },
        trigger: 'blur',
      },
    ]
  }
  return rules
})

const openAddCustom = () => {
  customEditingKey.value = ''
  resetCustomForm()
  customDialogVisible.value = true
}

const openEditCustom = (row: any) => {
  customEditingKey.value = row.key
  customForm.key = row.key
  customForm.value = row.value
  customForm.type = row.type
  customForm.description = row.description
  customDialogVisible.value = true
}

const resetCustomForm = () => {
  customEditingKey.value = ''
  customForm.key = ''
  customForm.value = ''
  customForm.type = 'text'
  customForm.description = ''
  customFormRef.value?.clearValidate()
}

const saveCustomConfig = async () => {
  try {
    await customFormRef.value?.validate()
  } catch {
    return
  }

  savingCustom.value = true
  try {
    if (customEditingKey.value) {
      await setting.updateByKey(customEditingKey.value, {
        value: customForm.value,
        type: customForm.type,
        description: customForm.description,
      })
      ElMessage.success('配置已更新')
    } else {
      await setting.create({
        key: customForm.key,
        value: customForm.value,
        type: customForm.type,
        description: customForm.description,
      })
      ElMessage.success('配置已添加')
    }
    customDialogVisible.value = false
    await fetchSettings()
  } finally {
    savingCustom.value = false
  }
}

const saveCustomBatch = async () => {
  savingCustomBatch.value = true
  try {
    const payload: Record<string, { value: string; type: string; description: string }> = {}
    customConfigs.value.forEach((c) => {
      payload[c.key] = { value: c.value, type: c.type, description: c.description }
    })
    await setting.updateBatch(payload)
    ElMessage.success('自定义配置列表已保存')
    await fetchSettings()
  } finally {
    savingCustomBatch.value = false
  }
}

const handleCustomDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定删除配置 “${row.key}” 吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  try {
    await setting.remove(row.key)
    ElMessage.success('配置已删除')
    await fetchSettings()
  } catch {
    /* 拦截器已提示 */
  }
}

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {}
  allFields.value.forEach((field) => {
    if (field.required) {
      rules[field.key] = [{ required: true, message: `请填写${field.label}`, trigger: 'blur' }]
    }
    if (field.key === 'social_links') {
      rules[field.key] = [
        {
          validator: (_rule, _value: string, callback) => {
            // 行数据由可视化编辑器维护并自动序列化为 JSON；只需校验序列化结果合法
            try {
              const parsed = JSON.parse(socialLinkRows.value.length ? JSON.stringify(socialLinkRows.value) : '[]')
              if (!Array.isArray(parsed)) {
                callback(new Error('格式不正确'))
                return
              }
              callback()
            } catch {
              callback(new Error('格式不正确'))
            }
          },
          trigger: 'change',
        },
      ]
    }
  })
  return rules
})

const setUploadRef = (key: string, el: any) => {
  if (el) {
    uploadRefs.value[key] = el
  }
}

const fetchSettings = async () => {
  try {
    const response = await setting.getList()
    if (response.code === 200 || response.code === 201) {
      settings.value = response.data
      Object.keys(settings.value).forEach((key) => {
        formData[key] = settings.value[key].value
      })
      syncSocialRowsFromForm()
    }
  } catch (error) {
    ElMessage.error('获取配置失败')
  }
}

const handleImageChange = async (key: string, file: any) => {
  const raw = file?.raw as File | undefined
  if (!raw) return
  const field = allFields.value.find((item) => item.key === key)
  const scene: CropScene = field?.crop ?? 'setting-bg-desktop'
  // 背景图允许宽幅 / 竖版自由构图（历轮已定不做强制比例校验），故保留「不裁剪」出口
  const cropped = await cropImage(raw, {
    title: field ? `裁剪${field.label}` : '裁剪图片',
    presets: cropPresets(scene),
    allowSkip: true,
  })
  if (!cropped) return
  try {
    const response = await upload.image(cropped, 'setting-image', { settingKey: key })
    if (response.code === 200 || response.code === 201) {
      formData[key] = response.data.url
      ElMessage.success('图片上传成功')
    }
  } catch (error) {
    ElMessage.error('图片上传失败')
  }
}

const removeImage = (key: string) => {
  formData[key] = ''
}

const saveSettings = async () => {
  // 每个 tab 是独立 el-form，需逐组校验；首个出错项自动切换到对应 tab 并聚焦
  for (const group of groups) {
    const form = formRefs.value[group.key]
    if (!form) continue
    try {
      await form.validate()
    } catch (invalidFields: any) {
      const firstKey = Object.keys(invalidFields || {})[0]
      const firstField = allFields.value.find((f) => f.key === firstKey)
      if (firstKey && firstField) {
        activeTab.value = group.key
        nextTick(() => form.scrollToField(firstKey))
        ElMessage.warning(invalidFields[firstKey]?.[0]?.message || '请先修正表单中的错误项')
      } else {
        ElMessage.warning('请先修正表单中的错误项')
      }
      return
    }
  }

  saving.value = true
  try {
    const formDataObj = new FormData()

    // 仅提交当前 schema 中的字段，避免误提交未知键
    allFields.value.forEach((field) => {
      const config = settings.value[field.key]
      const value = formData[field.key] ?? ''
      if (config?.type === 'image') {
        formDataObj.append(field.key, value)
      } else {
        formDataObj.append(`settings[${field.key}]`, value)
      }
    })

    const response = await setting.update(formDataObj)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('保存成功，配置已生效')
      fetchSettings()
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// ===== 社交链接可视化编辑器：行数据 <-> formData.social_links (JSON 字符串) =====
interface SocialLinkRow {
  name: string
  url: string
  icon: string
  /** 点击行为：空 = 前台自动推导（邮箱默认复制，其余跳转） */
  action: '' | 'link' | 'copy'
}

const socialLinkRows = ref<SocialLinkRow[]>([])

// 解析 formData.social_links（JSON 字符串）为行数组；非法内容回退空
const parseSocialLinks = (value: string | undefined): SocialLinkRow[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: any) => ({
      name: typeof item?.name === 'string' ? item.name : '',
      url: typeof item?.url === 'string' ? item.url : '',
      icon: typeof item?.icon === 'string' ? item.icon : '',
      action: item?.action === 'copy' || item?.action === 'link' ? item.action : '',
    }))
  } catch {
    return []
  }
}

// 从 formData 同步行数据（加载 / 导入 / 重置后调用）
const syncSocialRowsFromForm = () => {
  const rows = parseSocialLinks(formData.social_links)
  socialLinkRows.value = rows.length ? rows : [
    { name: '', url: '', icon: '', action: '' },
  ]
}

// 把行数据序列化回 formData.social_links；仅保留名称与链接均非空的条目
const syncSocialRowsToForm = () => {
  const valid = socialLinkRows.value
    .map((row) => ({
      name: row.name.trim(),
      url: row.url.trim(),
      ...(row.icon ? { icon: row.icon } : {}),
      // 留空则不写入该字段，由前台按 icon 自动推导（邮箱→复制，其余→跳转）
      ...(row.action ? { action: row.action } : {}),
    }))
    .filter((item) => item.name && item.url)
  formData.social_links = JSON.stringify(valid)
}

// 行数据（含嵌套字段）变化后重新序列化
watch(socialLinkRows, syncSocialRowsToForm, { deep: true })

const addSocialLink = () => {
  socialLinkRows.value.push({ name: '', url: '', icon: '', action: '' })
}

const removeSocialLink = (index: number) => {
  if (socialLinkRows.value.length > 1) {
    socialLinkRows.value.splice(index, 1)
  }
}

const resetForm = () => {
  Object.keys(settings.value).forEach((key) => {
    formData[key] = settings.value[key].value
  })
  syncSocialRowsFromForm()
  Object.values(formRefs.value).forEach((form) => form?.clearValidate())
  ElMessage.info('已恢复为已保存的配置')
}

// ===== 邮件通知：SMTP 配置状态与测试发信 =====
// 发信配置来自后端 .env（不在数据库），故这里只做状态展示 + 真实发一封信验证
interface MailStatus {
  status: 'ok' | 'disabled'
  reason: string
  host: string
  port: number
  secure: boolean
  /** 传输加密方式：ssl（465）/ starttls（587）/ none（不加密） */
  encryption: 'ssl' | 'starttls' | 'none'
  user: string
  from: string
  /** 站点地址（邮件里链接的前缀）；空串 = 邮件里的链接不带域名，收件人点开是空页 */
  siteUrl: string
  /** 站点地址不可用时的告警文案（空 / 本机 / 内网 / 保留域名 / 非法 URL）；空串 = 没问题 */
  siteUrlWarning: string
  /** 通知邮件的实际收件人（博主邮箱） */
  recipient: string
  /** 收件人不可送达时的告警文案（占位地址 / 空）；空串 = 没问题 */
  recipientWarning: string
}

// 加密方式的展示文案（后端按 SMTP_SECURE / 端口推导，见 myblog-express services/mailer.js）
const ENCRYPTION_LABELS: Record<string, string> = {
  ssl: 'SSL',
  starttls: 'STARTTLS（先明文握手再升级）',
  none: '不加密（内网自建 SMTP）',
}

const encryptionLabel = (encryption: string) =>
  ENCRYPTION_LABELS[encryption] ?? `未知（${encryption}）`

const mailStatus = ref<MailStatus | null>(null)
const mailLoading = ref(false)
const mailTesting = ref(false)
const mailTestTo = ref('')

const fetchMailStatus = async () => {
  mailLoading.value = true
  try {
    const response = await mail.getStatus()
    if (response.code === 200) {
      mailStatus.value = response.data
      // 默认收件人 = 通知真实收件人；用户改过则保留用户输入
      if (!mailTestTo.value) mailTestTo.value = response.data.recipient || ''
    }
  } catch {
    // 响应拦截器已提示
  } finally {
    mailLoading.value = false
  }
}

const sendTestMail = async () => {
  mailTesting.value = true
  try {
    const response = await mail.sendTest({ to: mailTestTo.value.trim() })
    if (response.code === 200) {
      ElMessage.success(response.message || '测试邮件已发送')
    }
  } catch {
    // 响应拦截器已提示（未配置 / 格式错 / 发送失败都会带上原因）
  } finally {
    mailTesting.value = false
  }
}

// 导出 JSON
const exportJson = () => {
  const payload: Record<string, { value: string; type: string; description: string }> = {}
  allFields.value.forEach((field) => {
    const config = settings.value[field.key]
    if (config) {
      payload[field.key] = {
        value: formData[field.key] ?? '',
        type: config.type,
        description: config.description || field.label,
      }
    }
  })

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `myblog-settings-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

// 导入 JSON
const handleImportFile = async (file: any) => {
  const raw = file.raw as File
  try {
    const text = await raw.text()
    const parsed = JSON.parse(text)

    // 校验结构：对象，且值含 value/type
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      ElMessage.error('导入失败：JSON 结构不正确')
      return
    }

    const knownKeys = new Set(allFields.value.map((f) => f.key))
    const validEntries = Object.entries(parsed).filter(
      ([key, val]: [string, any]) => knownKeys.has(key) && val && typeof val.value === 'string',
    )

    if (!validEntries.length) {
      ElMessage.error('导入失败：未找到有效的配置项')
      return
    }

    await ElMessageBox.confirm(
      `即将导入 ${validEntries.length} 项配置，覆盖当前值。是否继续？`,
      '确认导入',
      { type: 'warning', confirmButtonText: '导入', cancelButtonText: '取消' },
    )

    validEntries.forEach(([key, val]: [string, any]) => {
      formData[key] = val.value
    })
    syncSocialRowsFromForm()
    ElMessage.success('已导入，请点击"保存所有配置"使其生效')
  } catch (error: any) {
    ElMessage.error(error?.message?.includes('JSON') ? '导入失败：JSON 格式不正确' : '导入失败')
  }
}

onMounted(() => {
  fetchSettings()
  fetchMailStatus()
})
</script>

<style lang="scss" scoped>
.social-links-editor {
  width: 100%;
}

/* 社交链接编辑器：每条目两行（名称+链接+删除 / 图标+动作）
   编辑器可用宽度约 500px，五列单行会把最长的「链接」挤到 60px 左右而不可用 */
.social-link-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;

  /* 仅在「条目之间」画细分隔线：首个之前、以及最后一个与「添加一条」之间都不画。
     注意行元素后面还跟着 .social-link-actions，故不能用 :last-child 判断末行。 */
  & + & {
    padding-top: 12px;
    border-top: 1px dashed var(--border-light);
  }
}

.social-link-line {
  display: flex;
  align-items: center;
  gap: 8px;

  .social-link-name {
    /* 名称一般较短，给予紧凑宽度 */
    flex: 0 0 120px;
  }

  .social-link-url {
    /* 链接一般较长，占满剩余空间 */
    flex: 1 1 auto;
    min-width: 0;
  }

  .el-button {
    flex-shrink: 0;
  }
}

.social-link-line--meta {
  .social-link-icon {
    /* 图标选项名也较短，收紧宽度 */
    flex: 0 0 130px;
  }

  .social-link-action {
    flex: 0 0 150px;
  }
}

.social-link-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;

  .social-link-hint {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.settings {
  .panel-card {
    border-radius: 12px;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-card);

    :deep(.el-card__header) {
      border-bottom: 1px solid var(--border-light);
      padding: 16px 20px;
    }
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;

  h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.settings-tabs {
  :deep(.el-tabs__item) {
    color: var(--text-secondary);
  }

  :deep(.el-tabs__item.is-active) {
    color: var(--color-accent);
  }

  :deep(.el-tabs__active-bar) {
    background-color: var(--color-accent);
  }
}

.settings-form {
  max-width: 640px;
  padding: 8px 0;
}

.field-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-top: 4px;
  width: 100%;
  /* 保留说明文案里的手动换行（如背景图的尺寸建议分行展示）；
     无换行的说明不受影响 */
  white-space: pre-line;
}

.color-field {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .color-hex {
    font-family: var(--font-family-mono, monospace);
    font-size: 13px;
    color: var(--text-secondary);

    /* 未配置：显式给出前台会用的默认色，作者才知道「默认」到底是什么色 */
    &.is-default {
      color: var(--text-muted);
    }
  }

  /* 非文本对比度提示：默认中性色，低于 3:1 时转警示色 */
  .contrast-hint {
    font-size: 12px;
    color: var(--text-muted);

    &.is-low {
      color: var(--el-color-warning);
      font-weight: 600;
    }
  }
}

/* 主题色分组：一键应用预设 + 按维度设置 */
.theme-color-section {
  max-width: 640px;
  padding: 8px 0;
}

.theme-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);

  .theme-toolbar-label {
    font-size: 13px;
    color: var(--text-secondary);
  }
}

.theme-preset-select {
  width: 220px;
}

/* 主题色维度：每个维度一行，内含亮/暗两个色块并排 */
.theme-dim {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.theme-mode {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .theme-mode-label {
    width: 32px;
    font-size: 13px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
}

.image-field {
  width: 100%;
}

.image-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-img {
  width: 160px;
  height: 96px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
}

.image-actions {
  display: flex;
  gap: 6px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
  padding: 20px 0;
}

/* 常驻保存栏：滚动时始终吸附在视口底部，避免配置项多时找不到保存入口 */
.actions {
  position: sticky;
  bottom: 0;
  z-index: 10;
  margin: 16px -20px -8px;
  padding: 16px 20px 8px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 12px;
  background: var(--bg-card);
}

.custom-config {
  padding: 8px 0;
}

.custom-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.custom-tip {
  margin-bottom: 16px;
}

.custom-table {
  width: 100%;
}

/* 邮件通知：状态说明 + 只读配置表 + 测试发信 */
.mail-config {
  padding: 8px 0;
  max-width: 720px;
}

.mail-toolbar {
  display: flex;
  align-items: center;
  margin: 16px 0;
}

.mail-desc {
  margin-bottom: 20px;

  :deep(.el-descriptions__label) {
    color: var(--text-secondary);
  }
}

.mail-test-form {
  margin-bottom: 8px;
}

.mail-recipient-warning,
.mail-site-url-warning {
  margin-bottom: 20px;
}

.mail-tip {
  margin-top: 8px;
}
</style>