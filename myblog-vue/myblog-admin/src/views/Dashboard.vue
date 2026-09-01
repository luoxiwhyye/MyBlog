<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="12" :sm="12" :md="6" v-for="card in statCards" :key="card.label">
        <div class="stat-card" :class="`stat-${card.tone}`">
          <div class="stat-icon">
            <el-icon :size="26"><component :is="card.icon" /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
            <!-- 环比趋势：后端返回 delta 时显示，否则隐藏（占位） -->
            <span v-if="card.delta != null" class="stat-trend" :class="card.delta >= 0 ? 'up' : 'down'">
              {{ card.delta >= 0 ? '↑' : '↓' }} {{ Math.abs(card.delta) }}%
            </span>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :md="16">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="chart-header">
              <h4>文章发布趋势</h4>
              <div class="chart-controls">
                <el-radio-group v-model="trendDays" size="small" @change="fetchCharts">
                  <el-radio-button :value="7">近 7 天</el-radio-button>
                  <el-radio-button :value="30">近 30 天</el-radio-button>
                  <el-radio-button :value="90">近 90 天</el-radio-button>
                </el-radio-group>
                <el-segmented
                  v-model="chartScope"
                  :options="scopeOptions"
                  size="small"
                  @change="fetchCharts"
                />
              </div>
            </div>
          </template>
          <div ref="publishTrendRef" class="chart-box"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <h4>分类文章分布</h4>
          </template>
          <div ref="typeDistributionRef" class="chart-box"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="bottom-row">
      <!-- 最新评论 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="panel-card">
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
                  <div class="comment-time">{{ formatTime(scope.row.createdAt) }}</div>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!recentComments.length" description="暂无评论" :image-size="60" />
        </el-card>
      </el-col>

      <!-- 阅读排行 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <h4>文章阅读排行</h4>
          </template>
          <ol class="rank-list">
            <li v-for="(item, idx) in topArticles" :key="item.id" class="rank-item">
              <span class="rank-badge" :class="{ top: idx < 3 }">{{ idx + 1 }}</span>
              <span class="rank-title">{{ item.title }}</span>
              <span class="rank-views">{{ item.viewCount }} 阅读</span>
            </li>
          </ol>
          <el-empty v-if="!topArticles.length" description="暂无文章" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { Document, ChatDotRound, View, Warning } from '@element-plus/icons-vue'
import { article, comment, dashboard } from '@/api'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const stats = ref({
  totalArticles: 0,
  totalComments: 0,
  totalViews: 0,
  pendingComments: 0
})

// tone 映射语义色（info/success/warning/danger），delta 为环比趋势占位（后端未提供时隐藏）
const statCards = computed(() => [
  { label: '总文章数', value: stats.value.totalArticles, icon: Document, tone: 'info', delta: null as number | null },
  { label: '总评论数', value: stats.value.totalComments, icon: ChatDotRound, tone: 'success', delta: null as number | null },
  { label: '总浏览数', value: stats.value.totalViews, icon: View, tone: 'warning', delta: null as number | null },
  { label: '待审核评论', value: stats.value.pendingComments, icon: Warning, tone: 'danger', delta: null as number | null },
])

const recentComments = ref<any[]>([])
const topArticles = ref<any[]>([])
const publishTrendRef = ref<HTMLElement | null>(null)
const typeDistributionRef = ref<HTMLElement | null>(null)
const trendDays = ref<7 | 30 | 90>(30)
const chartScope = ref<'published' | 'all'>('published')
const scopeOptions = [
  { label: '已发布', value: 'published' },
  { label: '全部', value: 'all' },
]

let publishTrendChart: echarts.ECharts | null = null
let typeDistributionChart: echarts.ECharts | null = null

// 图表主题色（随暗色模式切换）
const chartColors = computed(() => ({
  text: themeStore.isDark ? '#b0b8c8' : '#475569',
  split: themeStore.isDark ? 'rgba(55,70,100,0.4)' : 'rgba(203,213,225,0.6)',
  accent: themeStore.isDark ? '#cbd5e1' : '#475569',
  area: themeStore.isDark ? 'rgba(203,213,225,0.25)' : 'rgba(71,85,105,0.2)',
}))

const handleResize = () => {
  publishTrendChart?.resize()
  typeDistributionChart?.resize()
}

const initCharts = () => {
  if (publishTrendRef.value && !publishTrendChart) {
    publishTrendChart = echarts.init(publishTrendRef.value)
  }
  if (typeDistributionRef.value && !typeDistributionChart) {
    typeDistributionChart = echarts.init(typeDistributionRef.value)
  }
}

const renderEmptyCharts = () => {
  const c = chartColors.value
  publishTrendChart?.setOption({
    xAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: c.split } }, axisLabel: { color: c.text } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: c.split } }, axisLabel: { color: c.text } },
    series: [{ type: 'line', data: [] }],
    grid: { left: 40, right: 20, top: 24, bottom: 30 },
  })

  typeDistributionChart?.setOption({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['38%', '65%'],
        label: { formatter: '{b}: {d}%' },
        data: [],
      },
    ],
  })
}

const renderCharts = (chartData: {
  scope: 'published' | 'all'
  articlePublishTrend: Array<{ date: string; count: number }>
  typeDistribution: Array<{ typeId: number; typeName: string; articleCount: number }>
}) => {
  const c = chartColors.value
  const trendXAxis = chartData.articlePublishTrend.map((item) => item.date)
  const trendSeries = chartData.articlePublishTrend.map((item) => item.count)

  publishTrendChart?.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: themeStore.isDark ? '#1e2949' : '#fff',
      borderColor: c.split,
      textStyle: { color: c.text },
    },
    xAxis: {
      type: 'category',
      data: trendXAxis,
      boundaryGap: false,
      axisLine: { lineStyle: { color: c.split } },
      axisLabel: {
        color: c.text,
        formatter: (value: string) => value.slice(5),
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: c.split } },
      axisLabel: { color: c.text },
    },
    grid: {
      left: 40,
      right: 20,
      top: 24,
      bottom: 30,
    },
    series: [
      {
        name: '发布文章数',
        type: 'line',
        smooth: true,
        data: trendSeries,
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: c.accent,
        },
        itemStyle: { color: c.accent },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: c.area },
            { offset: 1, color: 'rgba(0,0,0,0)' },
          ]),
        },
      },
    ],
  })

  typeDistributionChart?.setOption({
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: themeStore.isDark ? '#1e2949' : '#fff',
      borderColor: c.split,
      textStyle: { color: c.text },
      extraCssText: 'max-width: 260px; white-space: normal; word-break: break-all;',
      formatter: (params: { name: string; value: number; percent: number }) => {
        return `${params.name}<br/>文章数：${params.value}<br/>占比：${params.percent}%`
      },
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: c.text },
    },
    series: [
      {
        name: '分类文章分布',
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: {
          color: c.text,
          formatter: (params: { name: string; percent: number }) => `${params.name}\n${params.percent}%`,
          width: 96,
          overflow: 'break',
          lineHeight: 16,
        },
        labelLine: {
          length: 10,
          length2: 8,
        },
        data: chartData.typeDistribution.map((item) => ({
          name: item.typeName,
          value: item.articleCount,
        })),
      },
    ],
  })
}

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

// 获取阅读排行（按浏览量排序）
const fetchTopArticles = async () => {
  try {
    const response = await article.getList({ page: 1, pageSize: 5, sortBy: 'view_count' })
    if (response.code === 200 || response.code === 201) {
      topArticles.value = response.data.list
    }
  } catch (error) {
    console.error('获取阅读排行失败:', error)
  }
}

const fetchCharts = async () => {
  try {
    const response = await dashboard.getCharts({
      days: trendDays.value,
      scope: chartScope.value,
    })
    if (response.code === 200 || response.code === 201) {
      chartScope.value = response.data.scope
      renderCharts(response.data)
      return
    }
    renderEmptyCharts()
  } catch (error) {
    console.error('获取图表数据失败:', error)
    renderEmptyCharts()
  }
}

// 格式化时间
const formatTime = (time?: string) => {
  if (!time) return '--'

  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '--'

  return date.toLocaleString('zh-CN', { hour12: false })
}

// 主题切换时重绘图表
watch(
  () => themeStore.isDark,
  () => {
    nextTick(() => {
      fetchCharts()
    })
  },
)

onMounted(async () => {
  await Promise.all([fetchStats(), fetchRecentComments(), fetchTopArticles()])
  await nextTick()
  initCharts()
  await fetchCharts()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  publishTrendChart?.dispose()
  typeDistributionChart?.dispose()
  publishTrendChart = null
  typeDistributionChart = null
})
</script>

<style lang="scss" scoped>
.dashboard {
  .stats-row {
    margin-bottom: 16px;
  }

  .chart-row {
    margin-bottom: 16px;
  }

  .bottom-row {
    margin-bottom: 16px;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  transition: transform 0.25s, box-shadow 0.25s;
  margin-bottom: 16px;

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-elevated);
  }
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  flex-shrink: 0;
}

.stat-info .stat-icon {
  color: var(--el-color-info);
  background: rgba(144, 147, 153, 0.12);
}

.stat-success .stat-icon {
  color: var(--el-color-success);
  background: rgba(103, 194, 58, 0.12);
}

.stat-warning .stat-icon {
  color: var(--el-color-warning);
  background: rgba(230, 162, 60, 0.12);
}

.stat-danger .stat-icon {
  color: var(--el-color-danger);
  background: rgba(245, 108, 108, 0.12);
}

.stat-number {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* 环比趋势徽标（后端提供 delta 时显示） */
.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  padding: 2px 8px;
  border-radius: 999px;
}

.stat-trend.up {
  color: var(--el-color-success);
  background: rgba(103, 194, 58, 0.12);
}

.stat-trend.down {
  color: var(--el-color-danger);
  background: rgba(245, 108, 108, 0.12);
}

.panel-card {
  border-radius: 12px;
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  margin-bottom: 16px;

  :deep(.el-card__header) {
    border-bottom: 1px solid var(--border-light);
    padding: 14px 20px;
  }

  h4 {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chart-box {
  width: 100%;
  height: 320px;
}

.comment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;

  .comment-author {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 13px;
    flex-shrink: 0;
    width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .comment-content {
    flex: 1;
    color: var(--text-secondary);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .comment-time {
    color: var(--text-muted);
    font-size: 12px;
    flex-shrink: 0;
  }
}

.rank-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background: var(--bg-hover);
  }
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-hover);
  flex-shrink: 0;

  &.top {
    color: #fff;
    background: linear-gradient(135deg, var(--color-accent), rgba(71, 85, 105, 0.65));
  }
}

.rank-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-size: 14px;
}

.rank-views {
  color: var(--text-muted);
  font-size: 12px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 992px) {
  .chart-controls {
    width: 100%;
    justify-content: flex-start;
  }

  .chart-row {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .chart-row .el-col {
    max-width: 100%;
    flex: 0 0 100%;
  }
}
</style>