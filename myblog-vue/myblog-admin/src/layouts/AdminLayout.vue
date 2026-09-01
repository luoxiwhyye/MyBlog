<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="brand" :class="{ collapsed: isCollapse }">
        <img v-if="siteLogo" :src="siteLogo" :alt="siteName" class="brand-logo" />
        <div v-else class="brand-fallback">MB</div>
        <span v-if="!isCollapse" class="brand-name">{{ siteName }}</span>
      </div>
      <el-menu
        :default-active="$route.path"
        class="sidebar-menu"
        :collapse="isCollapse"
        router
        unique-opened
      >
        <el-menu-item-group title="总览">
          <el-menu-item index="/admin/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <template #title>仪表盘</template>
          </el-menu-item>
        </el-menu-item-group>

        <el-menu-item-group title="内容">
          <el-menu-item index="/admin/articles">
            <el-icon><Document /></el-icon>
            <template #title>文章管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/types">
            <el-icon><Folder /></el-icon>
            <template #title>分类管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/labels">
            <el-icon><PriceTag /></el-icon>
            <template #title>标签管理</template>
          </el-menu-item>
          <el-menu-item index="/admin/comments">
            <el-icon><ChatDotRound /></el-icon>
            <template #title>评论管理</template>
          </el-menu-item>
        </el-menu-item-group>

        <el-menu-item-group title="链接">
          <el-menu-item index="/admin/friend-links">
            <el-icon><Link /></el-icon>
            <template #title>友链管理</template>
          </el-menu-item>
        </el-menu-item-group>

        <el-menu-item-group title="系统">
          <el-menu-item index="/admin/cache">
            <el-icon><Odometer /></el-icon>
            <template #title>运维监控</template>
          </el-menu-item>
          <el-menu-item index="/admin/settings">
            <el-icon><Setting /></el-icon>
            <template #title>系统设置</template>
          </el-menu-item>
          <el-menu-item index="/admin/profile">
            <el-icon><User /></el-icon>
            <template #title>个人资料</template>
          </el-menu-item>
        </el-menu-item-group>
      </el-menu>
    </el-aside>

    <!-- 主内容区域 -->
    <el-container>
      <!-- 头部 -->
      <el-header class="header">
        <div class="header-left">
          <el-button
            text
            class="collapse-btn"
            :icon="isCollapse ? Expand : Fold"
            @click="toggleSidebar"
          />
          <el-breadcrumb class="breadcrumb" separator="/">
            <el-breadcrumb-item :to="{ path: '/admin/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <button
            class="theme-toggle"
            type="button"
            :title="themeStore.isDark ? '切换到亮色模式' : '切换到暗色模式'"
            @click="themeStore.toggle()"
          >
            <svg v-if="themeStore.isDark" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar
                :size="32"
                :src="userStore.userInfo?.avatar"
                :alt="userStore.userInfo?.username"
              >
                {{ userStore.userInfo?.username?.charAt(0) }}
              </el-avatar>
              <span class="username">{{ userStore.userInfo?.username }}</span>
              <el-icon class="el-icon--right">
                <ArrowDown />
              </el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主体内容 -->
      <el-main class="main-content">
        <router-view />
      </el-main>

      <!-- 底部 -->
      <el-footer class="footer">
        © 2026 MyBlog 后台管理系统 · 用心记录每一次思考
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  HomeFilled,
  Document,
  Folder,
  PriceTag,
  Link,
  ChatDotRound,
  Odometer,
  User,
  Setting,
  Expand,
  Fold,
  ArrowDown
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()
const themeStore = useThemeStore()

const isCollapse = ref(false)
const siteName = computed(() => settingsStore.getSetting('site_name') || 'MyBlog')
const siteLogo = computed(() => settingsStore.getSetting('site_logo'))

const routeTitles: Record<string, string> = {
  '/admin/dashboard': '仪表盘',
  '/admin/articles': '文章管理',
  '/admin/articles/edit': '文章编辑',
  '/admin/types': '分类管理',
  '/admin/labels': '标签管理',
  '/admin/friend-links': '友链管理',
  '/admin/comments': '评论管理',
  '/admin/cache': '运维监控',
  '/admin/profile': '个人资料',
  '/admin/settings': '系统设置',
}

const currentTitle = computed(() => {
  const matched = Object.keys(routeTitles).find((key) =>
    route.path.startsWith(key),
  )
  return matched ? routeTitles[matched] : '后台管理'
})

const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/admin/profile')
      break
    case 'logout':
      ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        userStore.logout()
      })
      break
  }
}

onMounted(() => {
  if (!settingsStore.settings.site_name && !settingsStore.settings.site_logo) {
    settingsStore.fetchSettings()
  }
})
</script>

<style lang="scss" scoped>
.admin-layout {
  height: 100vh;
}

.sidebar {
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-light);
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 14px 10px;
  min-height: 60px;
  box-sizing: border-box;
}

.brand.collapsed {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.brand-logo,
.brand-fallback {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  flex-shrink: 0;
}

.brand-logo {
  object-fit: cover;
  background: var(--bg-card);
}

.brand-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e293b, #475569);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.brand-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.3s;
}

.sidebar-menu {
  border-right: none;
  background-color: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: var(--text-secondary);
  --el-menu-hover-bg-color: var(--bg-hover);
  --el-menu-active-color: var(--color-accent);
}

/* 分组标题：小字号、弱化，形成业务域分隔 */
.sidebar-menu :deep(.el-menu-item-group__title) {
  padding: 14px 20px 6px;
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-menu :deep(.el-menu-item) {
  border-radius: 10px;
  margin: 2px 8px;
  min-width: auto;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.header {
  background: var(--bg-header);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 18px;
  color: var(--text-secondary);
}

.breadcrumb {
  :deep(.el-breadcrumb__inner) {
    color: var(--text-secondary);
  }

  :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
    color: var(--text-primary);
    font-weight: 600;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.theme-toggle:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 10px;
  transition: background-color 0.2s;
}

.user-info:hover {
  background: var(--bg-hover);
}

.username {
  margin: 0 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.main-content {
  background: var(--bg-primary);
  padding: 20px;
  overflow-y: auto;
}

.footer {
  background: var(--bg-card);
  border-top: 1px solid var(--border-light);
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>