<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '200px'" class="sidebar">
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
        <el-menu-item index="/admin/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>
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
        <el-menu-item index="/admin/profile">
          <el-icon><User /></el-icon>
          <template #title>个人资料</template>
        </el-menu-item>
        <el-menu-item index="/admin/settings">
          <el-icon><Setting /></el-icon>
          <template #title>网站配置</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区域 -->
    <el-container>
      <!-- 头部 -->
      <el-header class="header">
        <div class="header-left">
          <el-button
            type="text"
            :icon="Expand"
            @click="toggleSidebar"
          />
        </div>
        <div class="header-right">
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
        © 2026 MyBlog 后台管理系统
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  HomeFilled,
  Document,
  Folder,
  PriceTag,
  ChatDotRound,
  User,
  Setting,
  Expand,
  ArrowDown
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const isCollapse = ref(false)
const siteName = computed(() => settingsStore.getSetting('site_name') || 'MyBlog')
const siteLogo = computed(() => settingsStore.getSetting('site_logo'))

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

<style scoped>
.admin-layout {
  height: 100vh;
}

.sidebar {
  background-color: #C0C4CC;
  transition: width 0.3s;
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
  background: #fff;
}

.brand-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #18233E, #F8FAFC);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.brand-name {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
  background-color: transparent;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.username {
  margin: 0 8px;
  font-size: 14px;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
}

.footer {
  background-color: #fff;
  border-top: 1px solid #e6e6e6;
  text-align: center;
  color: #666;
  font-size: 14px;
}
</style>