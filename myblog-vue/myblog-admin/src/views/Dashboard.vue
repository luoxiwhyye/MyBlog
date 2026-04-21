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

    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="chart-header">
              <h4>文章发布趋势</h4>
              <div class="chart-controls">
                <el-radio-group v-model="trendDays" size="small" @change="fetchCharts">
                  <el-radio-button :label="7">近 7 天</el-radio-button>
                  <el-radio-button :label="30">近 30 天</el-radio-button>
                  <el-radio-button :label="90">近 90 天</el-radio-button>
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
      <el-col :span="8">
        <el-card>
          <template #header>
            <h4>分类文章分布</h4>
          </template>
          <div ref="typeDistributionRef" class="chart-box"></div>
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
              <div class="comment-time">{{ formatTime(scope.row.createdAt) }}</div>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { comment, dashboard } from '@/api'

const stats = ref({
  totalArticles: 0,
  totalComments: 0,
  totalViews: 0,
  pendingComments: 0
})

const recentComments = ref<any[]>([])
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
  publishTrendChart?.setOption({
    xAxis: { type: 'category', data: [] },
    yAxis: { type: 'value', minInterval: 1 },
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
  const trendXAxis = chartData.articlePublishTrend.map((item) => item.date)
  const trendSeries = chartData.articlePublishTrend.map((item) => item.count)

  publishTrendChart?.setOption({
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: trendXAxis,
      boundaryGap: false,
      axisLabel: {
        formatter: (value: string) => value.slice(5),
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
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
        },
        areaStyle: {
          opacity: 0.2,
        },
      },
    ],
  })

  typeDistributionChart?.setOption({
    tooltip: {
      trigger: 'item',
      confine: true,
      extraCssText: 'max-width: 260px; white-space: normal; word-break: break-all;',
      formatter: (params: { name: string; value: number; percent: number }) => {
        return `${params.name}<br/>文章数：${params.value}<br/>占比：${params.percent}%`
      },
    },
    legend: {
      bottom: 0,
      type: 'scroll',
    },
    series: [
      {
        name: '分类文章分布',
        type: 'pie',
        radius: ['38%', '65%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: {
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

onMounted(() => {
  nextTick(() => {
    initCharts()
    fetchCharts()
  })
  window.addEventListener('resize', handleResize)
  fetchStats()
  fetchRecentComments()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  publishTrendChart?.dispose()
  typeDistributionChart?.dispose()
  publishTrendChart = null
  typeDistributionChart = null
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.chart-row {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.chart-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.chart-box {
  width: 100%;
  height: 320px;
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

@media (max-width: 1200px) {
  .chart-row .el-col {
    margin-bottom: 16px;
  }
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