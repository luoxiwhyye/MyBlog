<template>
  <div class="cache-manage">
    <el-row :gutter="16">
      <!-- 缓存统计 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <h4>缓存统计</h4>
          </template>
          <div v-loading="loading" class="stats-body">
            <div class="stat-row">
              <span class="stat-label">命中次数</span>
              <span class="stat-value">{{ stats.hits }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">未命中次数</span>
              <span class="stat-value">{{ stats.misses }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">命中率</span>
              <span class="stat-value highlight">{{ stats.hitRate }}%</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">当前缓存键数</span>
              <span class="stat-value">{{ stats.keyCount }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">统计起始时间</span>
              <span class="stat-value">{{ formatTime(stats.startedAt) }}</span>
            </div>

            <!-- 命中率进度条 -->
            <div class="hit-rate-bar">
              <el-progress
                :percentage="stats.hitRate"
                :stroke-width="14"
                :color="rateColor"
              />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 操作面板 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <h4>缓存管理</h4>
          </template>
          <div class="ops-body">
            <p class="ops-desc">
              Redis 缓存用于加速 GET 请求。配置变更、文章发布等写操作会自动失效相关缓存。
            </p>
            <div class="op-item">
              <div class="op-info">
                <strong>清空全部缓存</strong>
                <span>强制所有客户端重新拉取最新数据（慎用）</span>
              </div>
              <el-button type="danger" plain :loading="clearing" @click="handleClear">
                立即清空
              </el-button>
            </div>
            <div class="op-item">
              <div class="op-info">
                <strong>缓存预热</strong>
                <span>预取常用接口（设置/分类/标签），缓解首次访问慢</span>
              </div>
              <el-button type="primary" plain :loading="preheating" @click="handlePreheat">
                执行预热
              </el-button>
            </div>
            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="分层缓存架构"
              description="CDN（nginx 静态缓存）→ Redis（API 响应缓存）→ MySQL（数据源）。命中率越高，数据库压力越小。"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 性能监控 -->
    <el-card shadow="never" class="panel-card perf-card">
      <template #header>
        <div class="perf-header">
          <h4>性能监控</h4>
          <el-button size="small" :icon="Refresh" circle @click="fetchMetrics" />
        </div>
      </template>
      <div v-loading="metricsLoading" class="perf-body">
        <div class="perf-grid">
          <div class="perf-item">
            <span class="perf-num">{{ perf.totalRequests }}</span>
            <span class="perf-label">总请求数</span>
          </div>
          <div class="perf-item">
            <span class="perf-num">{{ perf.avgResponseTimeMs }}<small>ms</small></span>
            <span class="perf-label">平均响应时间</span>
          </div>
          <div class="perf-item">
            <span class="perf-num">{{ perf.maxResponseTimeMs }}<small>ms</small></span>
            <span class="perf-label">最大响应时间</span>
          </div>
          <div class="perf-item">
            <span class="perf-num" :class="{ warn: perf.errorRate > 5 }">{{ perf.errorRate }}%</span>
            <span class="perf-label">错误率</span>
          </div>
        </div>

        <!-- 慢请求列表 -->
        <div class="slow-list">
          <h5>最近慢请求（&gt; 2s）</h5>
          <el-table :data="perf.recentSlow" size="small" v-if="perf.recentSlow.length">
            <el-table-column prop="method" label="方法" width="80" />
            <el-table-column prop="path" label="路径" show-overflow-tooltip />
            <el-table-column prop="status" label="状态码" width="80">
              <template #default="scope">
                <el-tag :type="scope.row.status >= 500 ? 'danger' : 'warning'" size="small">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="ms" label="耗时" width="90">
              <template #default="scope">
                {{ scope.row.ms }}ms
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无慢请求，表现良好 🎉" :image-size="60" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { cache, metrics } from '@/api'

const stats = ref({
  hits: 0,
  misses: 0,
  hitRate: 0,
  keyCount: 0,
  startedAt: '',
})

const loading = ref(false)
const clearing = ref(false)
const preheating = ref(false)
const metricsLoading = ref(false)

const perf = ref({
  totalRequests: 0,
  avgResponseTimeMs: 0,
  maxResponseTimeMs: 0,
  errorRate: 0,
  recentSlow: [] as Array<{
    method: string
    path: string
    ms: number
    status: number
    at: string
  }>,
})

const fetchMetrics = async () => {
  metricsLoading.value = true
  try {
    const response = await metrics.getSnapshot()
    if (response.code === 200 || response.code === 201) {
      perf.value = response.data
    }
  } catch {
    ElMessage.error('获取性能数据失败')
  } finally {
    metricsLoading.value = false
  }
}

const rateColor = computed(() => {
  if (stats.value.hitRate >= 70) return '#52c41a'
  if (stats.value.hitRate >= 40) return '#faad14'
  return '#ff4d4f'
})

const formatTime = (time?: string) => {
  if (!time) return '--'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('zh-CN', { hour12: false })
}

const fetchStats = async () => {
  loading.value = true
  try {
    const response = await cache.getStats()
    if (response.code === 200 || response.code === 201) {
      stats.value = response.data
    }
  } catch {
    ElMessage.error('获取缓存统计失败')
  } finally {
    loading.value = false
  }
}

const handleClear = async () => {
  try {
    await ElMessageBox.confirm(
      '清空缓存后，所有接口将重新从数据库读取数据。是否继续？',
      '确认清空',
      { type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消' },
    )
  } catch {
    return
  }

  clearing.value = true
  try {
    const response = await cache.clearAll()
    if (response.code === 200 || response.code === 201) {
      ElMessage.success(`已清除 ${response.data.cleared} 条缓存`)
      fetchStats()
    }
  } catch {
    ElMessage.error('清空缓存失败')
  } finally {
    clearing.value = false
  }
}

const handlePreheat = async () => {
  preheating.value = true
  try {
    const response = await cache.preheat(['settings', 'types', 'labels'])
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('预热任务已启动')
      setTimeout(fetchStats, 2000)
    }
  } catch {
    ElMessage.error('预热失败')
  } finally {
    preheating.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchMetrics()
})
</script>

<style lang="scss" scoped>
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

.stats-body {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--border-light);

  &:last-of-type {
    border-bottom: none;
  }
}

.stat-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.stat-value {
  color: var(--text-primary);
  font-weight: 700;
  font-size: 16px;
  font-variant-numeric: tabular-nums;

  &.highlight {
    color: var(--color-accent);
    font-size: 20px;
  }
}

.hit-rate-bar {
  margin-top: 4px;
}

.ops-body {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ops-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.op-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bg-hover);

  .op-info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong {
      color: var(--text-primary);
      font-size: 14px;
    }

    span {
      color: var(--text-muted);
      font-size: 12px;
    }
  }
}

/* 性能监控 */
.perf-card {
  margin-bottom: 16px;
}

.perf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.perf-body {
  min-height: 200px;
}

.perf-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.perf-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 12px;
  border-radius: 10px;
  background: var(--bg-hover);

  .perf-num {
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;

    small {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      margin-left: 2px;
    }

    &.warn {
      color: #ff4d4f;
    }
  }

  .perf-label {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.slow-list {
  h5 {
    margin: 0 0 10px;
    font-size: 14px;
    color: var(--text-secondary);
  }
}

@media (max-width: 768px) {
  .perf-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
