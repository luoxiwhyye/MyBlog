<template>
  <div class="dashboard">
    <h3>仪表盘</h3>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalArticles }}</div>
            <div class="stat-label">总文章数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalComments }}</div>
            <div class="stat-label">总评论数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalViews }}</div>
            <div class="stat-label">总浏览数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-number">{{ stats.pendingComments }}</div>
            <div class="stat-label">待审核评论</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最新评论 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <h4>最新评论</h4>
      </template>
      <el-table
        :data="recentComments"
        style="width: 100%"
        :show-header="false"
      >
        <el-table-column>
          <template #default="scope">
            <div class="comment-item">
              <div class="comment-author">{{ scope.row.authorName }}</div>
              <div class="comment-content">{{ scope.row.content }}</div>
              <div class="comment-time">{{ formatTime(scope.row.createAt) }}</div>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { comment, dashboard } from '@/api'

const stats = ref({
  totalArticles: 0,
  totalComments: 0,
  totalViews: 0,
  pendingComments: 0
})

const recentComments = ref<any[]>([])

// 获取统计数据（暂时使用模拟数据，后续可从后端获取）
const fetchStats = async () => {
  try {
    const response = await dashboard.getStats()
    if (response.code === 200 || response.code === 201) {
      stats.value = {
        totalArticles: response.data.totalArticles,
        totalComments: response.data.totalComments,
        totalViews: response.data.totalViews,
        pendingComments: response.data.pendingComments,
      }
      return
    }

    // 兜底：如果后端未返回仍保持旧值
    stats.value = {
      totalArticles: 0,
      totalComments: 0,
      totalViews: 0,
      pendingComments: 0,
    }
  } catch (error) {
    console.error('获取统计失败:', error)
    stats.value = {
      totalArticles: 0,
      totalComments: 0,
      totalViews: 0,
      pendingComments: 0,
    }
  }
}

// 获取最新评论
const fetchRecentComments = async () => {
  try {
    const response = await comment.getList({ page: 1, pageSize: 5 })
    if (response.code === 200 || response.code === 201) {
      recentComments.value = response.data.list
    }
  } catch (error) {
    console.error('获取最新评论失败:', error)
  }
}

// 格式化时间
const formatTime = (time: string) => {
  return new Date(time).toLocaleString()
}

onMounted(() => {
  fetchStats()
  fetchRecentComments()
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 20px 0;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.comment-item {
  padding: 10px 0;
}

.comment-author {
  font-weight: bold;
  margin-bottom: 5px;
}

.comment-content {
  color: #666;
  margin-bottom: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-time {
  font-size: 12px;
  color: #999;
}
</style>