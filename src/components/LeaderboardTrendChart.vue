<template>
  <div class="trend-chart-card glass-panel">
    <!-- 图表控制顶栏 -->
    <div class="chart-header-bar">
      <div class="chart-title-group">
        <div class="chart-badge">
          <span class="pulse-red-dot"></span>
          <span class="chart-eyebrow">DAVG25 CLOUD TIMELINE · 战绩时序历史</span>
        </div>
        <h3 class="chart-player-heading">
          {{ playerName }} · 历史积分走势
          <span class="curr-score-tag">{{ latestScoreFormatted }} {{ scoreUnit }}</span>
          <span v-if="dataSourceBadge" class="source-badge">{{ dataSourceBadge }}</span>
        </h3>
      </div>

      <!-- 控件组：时间区间切换 + 关注与刷新 -->
      <div class="chart-controls-group">
        <!-- 时间区间切换 (24h / 7d / 30d / all) -->
        <div class="time-range-tabs">
          <button
            v-for="tab in timeTabs"
            :key="tab.key"
            type="button"
            class="range-tab-btn"
            :class="{ active: timeRange === tab.key }"
            @click="setTimeRange(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- 手动刷新按钮 -->
        <button
          type="button"
          class="sync-btn"
          :disabled="loading"
          @click="loadHistoryData(true)"
          title="重新从 DavG25 抓取最新全量时序数据"
        >
          <span v-if="loading" class="btn-spinner-mini"></span>
          <span v-else>↻ 抓取同步</span>
        </button>

        <button
          type="button"
          class="fav-toggle-btn"
          :class="{ 'is-favorite': isFavorite }"
          @click="handleToggleFavorite"
          :title="isFavorite ? '已设为重点关注' : '设为重点关注玩家'"
        >
          {{ isFavorite ? '已关注' : '+ 关注' }}
        </button>
      </div>
    </div>

    <!-- 统计指标 Summary Bar -->
    <div class="stats-summary-bar">
      <div class="stat-summary-pill">
        <span class="pill-label">区间净增/跌</span>
        <strong :class="stats.netChangeClass">{{ stats.netChangeText }} {{ scoreUnit }}</strong>
      </div>
      <div class="stat-summary-pill">
        <span class="pill-label">区间最高峰值</span>
        <strong class="text-gold">{{ stats.peakScore.toLocaleString() }} {{ scoreUnit }}</strong>
      </div>
      <div class="stat-summary-pill">
        <span class="pill-label">区间最低谷值</span>
        <strong class="text-silver">{{ stats.lowScore.toLocaleString() }} {{ scoreUnit }}</strong>
      </div>
      <div class="stat-summary-pill">
        <span class="pill-label">对局胜负 / 变动明细</span>
        <strong class="text-cyan">
          <span class="win-count">{{ stats.positiveCount }} 升</span> / 
          <span class="loss-count">{{ stats.negativeCount }} 降</span>
          <small class="total-nodes">({{ displayPoints.length }} 节点)</small>
        </strong>
      </div>
    </div>

    <!-- 加载态骨架 -->
    <div v-if="loading && displayPoints.length === 0" class="chart-loading-overlay">
      <div class="radar-mini-spinner"></div>
      <span>正在从 DavG25 云端抓取 [{{ playerName }}] 全赛季时序战绩...</span>
    </div>

    <!-- SVG 高清图表主体 -->
    <div
      v-else
      class="svg-chart-container"
      ref="chartContainerRef"
      @mousemove="handleContainerMouseMove"
      @mouseleave="handleContainerMouseLeave"
      @click="handleContainerClick"
    >
      <svg
        v-if="displayPoints.length >= 2"
        class="stepped-chart-svg"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        preserveAspectRatio="none"
      >
        <defs>
          <!-- 赛博霓虹红色流光渐变 -->
          <linearGradient id="davgScoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(225, 29, 72, 0.35)" />
            <stop offset="65%" stop-color="rgba(225, 29, 72, 0.08)" />
            <stop offset="100%" stop-color="rgba(225, 29, 72, 0.0)" />
          </linearGradient>
        </defs>

        <!-- Y 轴网格线与分值标尺 (自适应大跨度整千/整万阶梯) -->
        <g class="grid-lines-group">
          <template v-for="grid in yGrids" :key="grid.value">
            <line
              :x1="paddingLeft"
              :y1="grid.y"
              :x2="svgWidth - paddingRight"
              :y2="grid.y"
              class="grid-line"
            />
            <text
              :x="paddingLeft - 10"
              :y="grid.y + 4"
              class="axis-text axis-y-text"
              text-anchor="end"
            >
              {{ grid.label }}
            </text>
          </template>
        </g>

        <!-- X 轴时间底栏刻度 -->
        <g class="axis-x-group">
          <template v-for="(tick, tIdx) in xTicks" :key="tIdx">
            <line
              :x1="tick.x"
              :y1="svgHeight - paddingBottom"
              :x2="tick.x"
              :y2="svgHeight - paddingBottom + 5"
              class="x-tick-line"
            />
            <text
              :x="tick.x"
              :y="svgHeight - 8"
              class="axis-text axis-x-text"
              text-anchor="middle"
            >
              {{ tick.label }}
            </text>
          </template>
        </g>

        <!-- 阶梯闭合填充区域 -->
        <path
          :d="areaPathString"
          fill="url(#davgScoreAreaGradient)"
          class="stepped-area-path"
        />

        <!-- 统一阶梯折线核心路径 (硬朗真实反映对局结算跳跃) -->
        <path
          :d="linePathString"
          class="stepped-line-path"
        />

        <!-- 分数节点渲染 (轻量纯矢量，零高斯模糊滤镜，120FPS 丝滑不卡顿) -->
        <g class="chart-points-layer">
          <g
            v-for="(pt, idx) in visibleRenderPoints"
            :key="idx"
            class="point-marker-group"
          >
            <!-- 节点外圈呼吸光晕 (关键对局点或极值点) -->
            <circle
              v-if="pt.isKeyPoint || pt.isDeltaPoint"
              :cx="pt.x"
              :cy="pt.y"
              :r="pt.isKeyPoint ? 5.5 : 4"
              class="point-outer-ring"
              :class="pt.diffClass"
            />
            <!-- 实心核心点 -->
            <circle
              :cx="pt.x"
              :cy="pt.y"
              :r="pt.isKeyPoint ? 3.5 : (pt.isDeltaPoint ? 2.8 : 2)"
              class="point-dot"
              :class="pt.diffClass"
            />
          </g>
        </g>

        <!-- 准星十字线 (鼠标滑动时快速吸附) -->
        <g v-if="hoveredPoint" class="crosshair-group">
          <line
            :x1="hoveredPoint.x"
            :y1="paddingTop"
            :x2="hoveredPoint.x"
            :y2="svgHeight - paddingBottom"
            class="crosshair-line crosshair-v"
          />
          <line
            :x1="paddingLeft"
            :y1="hoveredPoint.y"
            :x2="svgWidth - paddingRight"
            :y2="hoveredPoint.y"
            class="crosshair-line crosshair-h"
          />
          <!-- 悬停吸附圈 -->
          <circle
            :cx="hoveredPoint.x"
            :cy="hoveredPoint.y"
            r="6"
            class="hover-static-circle"
          />
        </g>

        <!-- 点击选中的节点放大特效 (扩大发光圈 + 脉冲扩散波纹动画) -->
        <g v-if="selectedPoint" class="selected-point-group">
          <!-- 扩散波纹动画圈 -->
          <circle
            :cx="selectedPoint.x"
            :cy="selectedPoint.y"
            r="12"
            class="selected-pulse-ring"
            :class="selectedPoint.diffClass"
          />
          <!-- 放大实心核心圈 -->
          <circle
            :cx="selectedPoint.x"
            :cy="selectedPoint.y"
            r="7"
            class="selected-main-node"
            :class="selectedPoint.diffClass"
          />
          <circle
            :cx="selectedPoint.x"
            :cy="selectedPoint.y"
            r="3"
            class="selected-center-dot"
          />
        </g>
      </svg>

      <!-- 悬停即时提示卡片 (Tooltip) -->
      <div
        v-if="hoveredPoint && !selectedPoint"
        class="chart-tooltip"
        :style="tooltipStyle"
      >
        <div class="tooltip-header">
          <span class="tooltip-time">{{ hoveredPoint.timeFormatted }}</span>
          <span class="tooltip-diff" :class="hoveredPoint.diffClass">
            {{ hoveredPoint.diffText }}
          </span>
        </div>
        <div class="tooltip-body">
          <div class="tooltip-score">
            <span class="label">当时排位分:</span>
            <strong class="score-val">{{ hoveredPoint.scoreFormatted }} {{ scoreUnit }}</strong>
          </div>
          <div class="tooltip-meta-grid">
            <div v-if="hoveredPoint.rank" class="tooltip-meta-item">
              <span>全球排名: </span><strong>#{{ hoveredPoint.rank }}</strong>
            </div>
            <div v-if="hoveredPoint.leagueName" class="tooltip-meta-item">
              <span>段位: </span><strong :style="{ color: hoveredPoint.leagueInfo?.color || '#ff2a55' }">{{ hoveredPoint.leagueName }}</strong>
            </div>
          </div>
          <div class="tooltip-tip-row">
            <span>💡 点击该节点查看完整对局明细</span>
          </div>
        </div>
      </div>

      <!-- 单个数据点或尚未生成历史状态 -->
      <div v-if="displayPoints.length < 2 && !loading" class="chart-empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-text">
          <h4>当前积分: {{ latestScoreFormatted }} {{ scoreUnit }}</h4>
          <p>
            {{ emptyStateMessage }}
          </p>
        </div>
      </div>
    </div>

    <!-- 🌟 点击节点后展开的【详细对局深度透视面板】 (Selected Match Detail Card) -->
    <transition name="detail-slide">
      <div v-if="selectedPoint" class="selected-match-detail-panel">
        <div class="detail-panel-header">
          <div class="detail-header-left">
            <span class="detail-tag">MATCH INTEL · 对局详情深度透视</span>
            <h4 class="detail-title">
              {{ selectedPoint.fullTimeFormatted || selectedPoint.timeFormatted }} 对局结算
            </h4>
          </div>
          <button class="close-detail-btn" type="button" @click="selectedPoint = null" title="关闭详情">
            ✕
          </button>
        </div>

        <div class="detail-panel-grid">
          <!-- 1. 积分与胜负结果 -->
          <div class="detail-stat-card">
            <span class="card-label">当时排位积分 (RS)</span>
            <div class="card-score-row">
              <strong class="large-score">{{ selectedPoint.scoreFormatted }}</strong>
              <span class="score-unit-tag">{{ scoreUnit }}</span>
            </div>
            <div class="match-delta-badge" :class="selectedPoint.diffClass">
              {{ selectedPoint.diffText }}
            </div>
          </div>

          <!-- 2. 当时天梯排名 -->
          <div class="detail-stat-card">
            <span class="card-label">全球天梯排名</span>
            <div class="card-score-row">
              <strong class="large-rank">#{{ selectedPoint.rank || '—' }}</strong>
            </div>
            <span class="card-sub-info">
              {{ selectedPoint.rank ? (selectedPoint.rank <= 500 ? '🔥 Ruby Top 500 巅峰大师' : '全球竞技排位榜') : '未在 Top 10K 榜' }}
            </span>
          </div>

          <!-- 3. 当时段位 -->
          <div class="detail-stat-card">
            <span class="card-label">当时竞技段位</span>
            <div class="card-score-row">
              <strong class="large-tier" :style="{ color: selectedPoint.leagueInfo?.color || '#ff2a55' }">
                {{ selectedPoint.leagueName }}
              </strong>
            </div>
            <span class="card-sub-info">
              {{ selectedPoint.leagueInfo?.nameZh || selectedPoint.leagueName }}
            </span>
          </div>

          <!-- 4. 距区间峰值差距 -->
          <div class="detail-stat-card">
            <span class="card-label">距当前区间峰值</span>
            <div class="card-score-row">
              <strong class="large-peak-diff">
                {{ (selectedPoint.points - stats.peakScore) === 0 ? '0' : (selectedPoint.points - stats.peakScore).toLocaleString() }}
              </strong>
              <span class="score-unit-tag">{{ scoreUnit }}</span>
            </div>
            <span class="card-sub-info text-gold">
              {{ (selectedPoint.points - stats.peakScore) === 0 ? '🏆 本节点即为区间最高峰' : `区间最高: ${stats.peakScore.toLocaleString()} RS` }}
            </span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { fetchPlayerHistoryFromDavG25 } from '../utils/theFinalsApi.js'
import {
  getPlayerSnapshots,
  recordPlayerSnapshot,
  isPlayerFavorite,
  toggleFavoritePlayer
} from '../utils/finalsHistoryTracker.js'
import { useToast } from '../composables/useToast.js'

export default {
  name: 'LeaderboardTrendChart',
  props: {
    playerName: {
      type: String,
      required: true
    },
    currentScore: {
      type: [Number, String],
      default: 0
    },
    scoreUnit: {
      type: String,
      default: 'RS'
    },
    leagueTitle: {
      type: String,
      default: ''
    },
    seasonKey: {
      type: String,
      default: 's11'
    }
  },
  setup(props) {
    const { showToast } = useToast()
    const loading = ref(false)
    const timeRange = ref('7d') // 默认展示近 7 天，更充实美观
    const isFavorite = ref(false)
    const hoveredPoint = ref(null)
    const selectedPoint = ref(null) // 点击选中的放大节点
    const chartContainerRef = ref(null)
    const allSeasonPoints = ref([]) // 存储全量全赛季时序打点
    const isFromDavG25 = ref(false)
    const emptyStateMessage = ref('正在等待抓取历史对局数据...')

    let rafId = null // requestAnimationFrame 节流句柄

    const timeTabs = [
      { key: '24h', label: '最近 24 小时' },
      { key: '7d', label: '最近 7 天' },
      { key: '30d', label: '最近 30 天' },
      { key: 'all', label: '全赛季历史' }
    ]

    // SVG 坐标系常量
    const svgWidth = 800
    const svgHeight = 220
    const paddingLeft = 75
    const paddingRight = 40
    const paddingTop = 22
    const paddingBottom = 30

    const loadHistoryData = async (forceRefresh = false) => {
      if (!props.playerName) return

      isFavorite.value = isPlayerFavorite(props.playerName)
      loading.value = true

      try {
        // 1. 优先尝试从 DavG25 爬取全量 180 天真实时序曲线
        const result = await fetchPlayerHistoryFromDavG25(
          props.playerName,
          props.seasonKey || 's11',
          'all'
        )

        if (result && result.allPoints && result.allPoints.length > 0) {
          allSeasonPoints.value = result.allPoints
          isFromDavG25.value = true
          if (forceRefresh) {
            showToast(`已从 DavG25 成功同步 ${result.allPoints.length} 条全赛季对局打点`, 'success')
          }
        } else if (result && result.points && result.points.length > 0) {
          allSeasonPoints.value = result.points
          isFromDavG25.value = true
        } else {
          fallbackToLocalSnapshots()
        }
      } catch (err) {
        // 2. 降级使用本地 LocalStorage 快照
        fallbackToLocalSnapshots()
        if (forceRefresh) {
          showToast(err.message || 'DavG25 暂无该玩家公开历史，已展示本地记录', 'none')
        }
      } finally {
        loading.value = false
      }
    }

    const fallbackToLocalSnapshots = () => {
      isFromDavG25.value = false
      let list = getPlayerSnapshots(props.playerName)
      if (list.length === 0 && props.currentScore) {
        list = recordPlayerSnapshot({
          name: props.playerName,
          mainScore: props.currentScore,
          rankScore: props.currentScore,
          league: props.leagueTitle
        })
      }

      allSeasonPoints.value = list.map((item, idx) => {
        const prev = idx > 0 ? list[idx - 1] : null
        const delta = prev ? (item.score - prev.score) : 0
        const dateObj = new Date(item.timestamp)
        return {
          timestamp: dateObj.toISOString(),
          timestampMs: item.timestamp,
          dateFormatted: `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.getHours()}:${dateObj.getMinutes()}`,
          timeOnly: `${dateObj.getHours()}:${dateObj.getMinutes()}`,
          points: item.score,
          rank: item.rank || null,
          leagueName: item.league || props.leagueTitle,
          delta,
          deltaFormatted: delta > 0 ? `+${delta.toLocaleString()}` : `${delta.toLocaleString()}`,
          isDeltaPoint: delta !== 0
        }
      })

      emptyStateMessage.value = '该玩家在 DavG25 上暂无历史公开打点，已启用本地实时战绩追踪。'
    }

    watch(() => props.playerName, () => {
      loadHistoryData()
      hoveredPoint.value = null
      selectedPoint.value = null
    })

    onMounted(() => {
      loadHistoryData()
    })

    onUnmounted(() => {
      if (rafId) cancelAnimationFrame(rafId)
    })

    const setTimeRange = (range) => {
      timeRange.value = range
      hoveredPoint.value = null
      selectedPoint.value = null
    }

    const handleToggleFavorite = () => {
      if (!props.playerName) return
      const nextFav = toggleFavoritePlayer(props.playerName)
      isFavorite.value = nextFav
      showToast(nextFav ? `已关注玩家 [${props.playerName}]` : `已取消关注 [${props.playerName}]`, 'success')
    }

    // 根据当前选中的时间范围 (24h / 7d / 30d / all) 实时切片数据
    const displayPoints = computed(() => {
      const all = allSeasonPoints.value
      if (!all || all.length === 0) return []

      const now = Date.now()
      let cutoff = 0
      if (timeRange.value === '24h') cutoff = now - 24 * 3600 * 1000
      else if (timeRange.value === '7d') cutoff = now - 7 * 24 * 3600 * 1000
      else if (timeRange.value === '30d') cutoff = now - 30 * 24 * 3600 * 1000

      let filtered = cutoff > 0 ? all.filter(item => (item.timestampMs || new Date(item.timestamp).getTime()) >= cutoff) : all

      if (filtered.length < 5 && all.length >= 5) {
        filtered = all.slice(-Math.min(all.length, 35))
      }

      return filtered
    })

    const latestScoreFormatted = computed(() => {
      const pts = displayPoints.value
      const lastScore = pts.length > 0 ? pts[pts.length - 1].points : (Number(props.currentScore) || 0)
      return Number(lastScore).toLocaleString()
    })

    const dataSourceBadge = computed(() => {
      if (isFromDavG25.value) {
        return `DavG25 全量时序 (${displayPoints.value.length} 节点)`
      }
      return '本地快照'
    })

    // 统计指标计算 (最高峰值、最低谷值、净胜负分、升降场次)
    const stats = computed(() => {
      const list = displayPoints.value
      if (list.length === 0) {
        const cur = Number(props.currentScore) || 0
        return {
          netChangeText: '0',
          netChangeClass: 'change-flat',
          peakScore: cur,
          lowScore: cur,
          positiveCount: 0,
          negativeCount: 0
        }
      }

      const firstScore = list[0].points
      const lastScore = list[list.length - 1].points
      const diff = lastScore - firstScore

      let netChangeText = diff === 0 ? '0' : (diff > 0 ? `+${diff.toLocaleString()}` : `${diff.toLocaleString()}`)
      let netChangeClass = diff > 0 ? 'change-up' : (diff < 0 ? 'change-down' : 'change-flat')

      let peak = list[0].points
      let low = list[0].points
      let positiveCount = 0
      let negativeCount = 0

      for (let i = 0; i < list.length; i++) {
        const item = list[i]
        if (item.points > peak) peak = item.points
        if (item.points < low) low = item.points

        if (i > 0) {
          const delta = item.points - list[i - 1].points
          if (delta > 0) positiveCount++
          else if (delta < 0) negativeCount++
        }
      }

      return {
        netChangeText,
        netChangeClass,
        peakScore: peak,
        lowScore: low,
        positiveCount,
        negativeCount
      }
    })

    // Y 轴范围：自适应大跨度整千/整万扩展
    const scoreRange = computed(() => {
      const list = displayPoints.value
      if (list.length === 0) return { min: 0, max: 1000 }
      let min = Infinity
      let max = -Infinity
      for (const item of list) {
        if (item.points < min) min = item.points
        if (item.points > max) max = item.points
      }
      if (min === max) {
        min = Math.max(0, min - 300)
        max = max + 300
      } else {
        const span = max - min
        const pad = Math.max(200, Math.ceil(span * 0.1))
        min = Math.max(0, Math.floor(min - pad))
        max = Math.ceil(max + pad)
      }
      return { min, max }
    })

    // Y 轴网格刻度
    const yGrids = computed(() => {
      const { min, max } = scoreRange.value
      const span = max - min || 1
      const count = 4
      const step = span / (count - 1)
      const grids = []

      for (let i = 0; i < count; i++) {
        const val = Math.round(min + step * i)
        const y = (svgHeight - paddingBottom) - ((val - min) / span) * (svgHeight - paddingTop - paddingBottom)
        grids.push({
          value: val,
          label: val.toLocaleString(),
          y
        })
      }
      return grids
    })

    // X 轴时间刻度标尺
    const xTicks = computed(() => {
      const list = displayPoints.value
      if (list.length < 2) return []
      const plotWidth = svgWidth - paddingLeft - paddingRight
      const count = list.length
      const numTicks = Math.min(5, count)
      const ticks = []

      for (let i = 0; i < numTicks; i++) {
        const idx = Math.round((i / (numTicks - 1)) * (count - 1))
        const item = list[idx]
        const x = paddingLeft + (idx / (count - 1)) * plotWidth
        const d = new Date(item.timestamp || item.timestampMs)
        const label = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
        ticks.push({ x, label })
      }
      return ticks
    })

    // 映射到 SVG 坐标系
    const chartPoints = computed(() => {
      const list = displayPoints.value
      if (list.length === 0) return []
      const { min, max } = scoreRange.value
      const plotWidth = svgWidth - paddingLeft - paddingRight
      const plotHeight = svgHeight - paddingTop - paddingBottom
      const count = list.length
      const peak = stats.value.peakScore
      const low = stats.value.lowScore

      return list.map((item, idx) => {
        const x = count === 1
          ? paddingLeft + plotWidth / 2
          : paddingLeft + (idx / (count - 1)) * plotWidth
        const y = (svgHeight - paddingBottom) - ((item.points - min) / (max - min || 1)) * plotHeight

        let diffText = '初始打点'
        let diffClass = 'point-flat'
        let isDeltaPoint = false
        if (idx > 0) {
          const prevPoints = list[idx - 1].points
          const delta = item.points - prevPoints
          if (delta > 0) {
            diffText = `▲ +${delta.toLocaleString()} RS 胜利`
            diffClass = 'point-up'
            isDeltaPoint = true
          } else if (delta < 0) {
            diffText = `▼ ${delta.toLocaleString()} RS 战败`
            diffClass = 'point-down'
            isDeltaPoint = true
          } else {
            diffText = '— 0 RS 持平'
            diffClass = 'point-flat'
          }
        }

        const isKeyPoint = idx === 0 || idx === count - 1 || item.points === peak || item.points === low
        const date = new Date(item.timestamp || item.timestampMs)
        const timeFormatted = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        const fullTimeFormatted = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`

        return {
          x,
          y,
          diffText,
          diffClass,
          isKeyPoint,
          isDeltaPoint,
          scoreFormatted: Number(item.points).toLocaleString(),
          timeFormatted,
          fullTimeFormatted,
          ...item
        }
      })
    })

    // 智能筛选可视圆点节点 (轻量快速，去除冗余点)
    const visibleRenderPoints = computed(() => {
      const pts = chartPoints.value
      if (pts.length <= 100) return pts

      const filtered = []
      const step = Math.ceil(pts.length / 75)
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i]
        if (pt.isKeyPoint || pt.isDeltaPoint || i % step === 0) {
          filtered.push(pt)
        }
      }
      return filtered
    })

    // 统一阶梯折线路径 (Stepped Line)
    const steppedLinePathString = computed(() => {
      const pts = chartPoints.value
      if (pts.length < 2) return ''
      let d = `M ${pts[0].x} ${pts[0].y}`
      for (let i = 1; i < pts.length; i++) {
        const curr = pts[i]
        d += ` H ${curr.x} V ${curr.y}`
      }
      return d
    })

    const linePathString = computed(() => steppedLinePathString.value)

    // 闭合阶梯填充区域路径
    const areaPathString = computed(() => {
      const pts = chartPoints.value
      if (pts.length < 2) return ''
      const baseY = svgHeight - paddingBottom
      const lineStr = linePathString.value
      return `${lineStr} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`
    })

    // 🚀 使用 requestAnimationFrame 优化光标滑动吸附，彻底消除 60Hz/120Hz 下的任何卡顿
    const handleContainerMouseMove = (e) => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        if (!chartContainerRef.value || chartPoints.value.length === 0) return
        const rect = chartContainerRef.value.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const svgX = (mouseX / rect.width) * svgWidth

        // 快速查找最近的点
        let nearest = chartPoints.value[0]
        let minDist = Math.abs(nearest.x - svgX)
        const pts = chartPoints.value
        for (let i = 0; i < pts.length; i++) {
          const dist = Math.abs(pts[i].x - svgX)
          if (dist < minDist) {
            minDist = dist
            nearest = pts[i]
          }
        }
        hoveredPoint.value = nearest
      })
    }

    const handleContainerMouseLeave = () => {
      hoveredPoint.value = null
    }

    // 🌟 点击节点触发放大选中与详细透视面板
    const handleContainerClick = () => {
      if (hoveredPoint.value) {
        selectedPoint.value = hoveredPoint.value
      }
    }

    const tooltipStyle = computed(() => {
      if (!hoveredPoint.value) return {}
      const xPercent = (hoveredPoint.value.x / svgWidth) * 100
      const yPercent = (hoveredPoint.value.y / svgHeight) * 100
      return {
        left: `${xPercent}%`,
        top: `${Math.max(8, yPercent - 8)}%`
      }
    })

    return {
      loading,
      timeRange,
      timeTabs,
      displayPoints,
      latestScoreFormatted,
      dataSourceBadge,
      emptyStateMessage,
      isFavorite,
      stats,
      setTimeRange,
      loadHistoryData,
      handleToggleFavorite,
      chartContainerRef,
      hoveredPoint,
      selectedPoint,
      handleContainerMouseMove,
      handleContainerMouseLeave,
      handleContainerClick,
      svgWidth,
      svgHeight,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      yGrids,
      xTicks,
      visibleRenderPoints,
      linePathString,
      areaPathString,
      tooltipStyle
    }
  }
}
</script>

<style scoped>
/* 主卡片容器 (直角极简红黑电竞) */
.trend-chart-card {
  padding: 18px 20px;
  background: rgba(14, 17, 23, 0.94);
  border: 1px solid rgba(225, 29, 72, 0.35);
  border-top: 3px solid #e11d48;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  overflow: visible;
  backdrop-filter: blur(12px);
}

.chart-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.chart-title-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.chart-badge {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pulse-red-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff2a55;
  box-shadow: 0 0 8px #ff2a55;
  animation: pulse-glow 2s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
}

.chart-eyebrow {
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
  color: #fb7185;
}

.chart-player-heading {
  font-size: 15.5px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.curr-score-tag {
  font-size: 11.5px;
  font-weight: 850;
  color: #fbbf24;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 0;
  padding: 2px 8px;
}

.source-badge {
  font-size: 10.5px;
  font-weight: 750;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 2px 7px;
}

.chart-controls-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.time-range-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
  padding: 2px;
}

.range-tab-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 750;
  background: transparent;
  border: none;
  border-radius: 0;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.15s ease;
}

.range-tab-btn:hover {
  color: #ffffff;
}

.range-tab-btn.active {
  background: #e11d48;
  color: #ffffff;
  font-weight: 850;
}

.sync-btn {
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid rgba(225, 29, 72, 0.4);
  background: rgba(225, 29, 72, 0.12);
  color: #fb7185;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sync-btn:hover:not(:disabled) {
  background: #e11d48;
  color: #ffffff;
}

.fav-toggle-btn {
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 800;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.fav-toggle-btn.is-favorite {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.4);
  color: #fbbf24;
}

/* 统计 Summary Bar */
.stats-summary-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  background: rgba(0, 0, 0, 0.45);
  padding: 10px 14px;
  border-radius: 0;
  border: 1px solid rgba(225, 29, 72, 0.2);
  border-left: 3px solid #e11d48;
}

.stat-summary-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pill-label {
  font-size: 9.5px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.05em;
}

.stat-summary-pill strong {
  font-size: 13.5px;
  font-weight: 900;
}

.change-up { color: #34d399 !important; }
.change-down { color: #f87171 !important; }
.change-flat { color: rgba(255, 255, 255, 0.5) !important; }
.text-gold { color: #fbbf24 !important; }
.text-silver { color: #cbd5e1 !important; }
.text-cyan { color: #38bdf8 !important; }

.win-count { color: #34d399; font-weight: 900; }
.loss-count { color: #f87171; font-weight: 900; }
.total-nodes { font-size: 10.5px; color: rgba(255, 255, 255, 0.5); font-weight: 600; margin-left: 4px; }

/* SVG 图表容器 */
.svg-chart-container {
  position: relative;
  width: 100%;
  height: 220px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: crosshair;
  user-select: none;
}

.stepped-chart-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.grid-line {
  stroke: rgba(255, 255, 255, 0.07);
  stroke-dasharray: 3 3;
  stroke-width: 1;
}

.x-tick-line {
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 1;
}

.axis-text {
  font-size: 9.5px;
  font-weight: 750;
  fill: rgba(255, 255, 255, 0.45);
  font-family: monospace, sans-serif;
}

.stepped-line-path {
  fill: none;
  stroke: #ff2a55;
  stroke-width: 2.2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.point-marker-group {
  pointer-events: none;
}

.point-outer-ring {
  fill: transparent;
  stroke-width: 1.2;
  opacity: 0.6;
}

.point-outer-ring.point-up { stroke: #34d399; }
.point-outer-ring.point-down { stroke: #f87171; }
.point-outer-ring.point-flat { stroke: #ff2a55; }

.point-dot.point-up { fill: #34d399; }
.point-dot.point-down { fill: #f87171; }
.point-dot.point-flat { fill: #ff2a55; }

.crosshair-line {
  stroke: rgba(255, 255, 255, 0.35);
  stroke-dasharray: 2 2;
  stroke-width: 1;
}

.hover-static-circle {
  fill: #ff2a55;
  stroke: #ffffff;
  stroke-width: 2;
}

/* 选中节点放大波纹动画特效 */
.selected-point-group {
  pointer-events: none;
}

.selected-pulse-ring {
  fill: transparent;
  stroke-width: 2;
  animation: ripple-pulse 1.6s infinite ease-out;
}

.selected-pulse-ring.point-up { stroke: #34d399; }
.selected-pulse-ring.point-down { stroke: #f87171; }
.selected-pulse-ring.point-flat { stroke: #ff2a55; }

@keyframes ripple-pulse {
  0% { r: 6px; opacity: 1; }
  100% { r: 18px; opacity: 0; }
}

.selected-main-node {
  stroke: #ffffff;
  stroke-width: 2.5;
}

.selected-main-node.point-up { fill: #34d399; }
.selected-main-node.point-down { fill: #f87171; }
.selected-main-node.point-flat { fill: #ff2a55; }

.selected-center-dot {
  fill: #ffffff;
}

/* 提示卡片 Tooltip */
.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  background: rgba(10, 12, 18, 0.98);
  border: 1px solid #e11d48;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8), 0 0 12px rgba(225, 29, 72, 0.3);
  padding: 10px 14px;
  border-radius: 0;
  pointer-events: none;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 4px;
}

.tooltip-time {
  font-size: 10.5px;
  font-weight: 750;
  color: rgba(255, 255, 255, 0.6);
}

.tooltip-diff {
  font-size: 11.5px;
  font-weight: 900;
}

.tooltip-diff.point-up { color: #34d399; }
.tooltip-diff.point-down { color: #f87171; }
.tooltip-diff.point-flat { color: #cbd5e1; }

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-score {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 14px;
  color: #ffffff;
}

.tooltip-score .label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.tooltip-score .score-val {
  font-weight: 900;
  color: #fbbf24;
}

.tooltip-meta-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tooltip-meta-item {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: space-between;
}

.tooltip-tip-row {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 9.5px;
  color: #fb7185;
  font-weight: 750;
}

/* 🌟 点击节点后展开的【详细对局深度透视面板】样式 */
.selected-match-detail-panel {
  background: rgba(10, 13, 20, 0.96);
  border: 1px solid rgba(225, 29, 72, 0.45);
  border-left: 3px solid #e11d48;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
}

.detail-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.detail-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-tag {
  font-size: 9.5px;
  font-weight: 850;
  letter-spacing: 0.1em;
  color: #fb7185;
}

.detail-title {
  font-size: 14px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
}

.close-detail-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  padding: 3px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-detail-btn:hover {
  background: #e11d48;
  color: #ffffff;
}

.detail-panel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.detail-stat-card {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-label {
  font-size: 9.5px;
  font-weight: 750;
  color: rgba(255, 255, 255, 0.45);
}

.card-score-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.large-score {
  font-size: 18px;
  font-weight: 900;
  color: #ffffff;
}

.large-rank {
  font-size: 18px;
  font-weight: 900;
  color: #38bdf8;
}

.large-tier {
  font-size: 16px;
  font-weight: 900;
}

.large-peak-diff {
  font-size: 17px;
  font-weight: 900;
  color: #fbbf24;
}

.score-unit-tag {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 750;
}

.match-delta-badge {
  font-size: 11px;
  font-weight: 850;
  padding: 2px 6px;
  width: fit-content;
  border-radius: 0;
  margin-top: 2px;
}

.match-delta-badge.point-up {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.35);
}

.match-delta-badge.point-down {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.match-delta-badge.point-flat {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.card-sub-info {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

/* 过渡动画 */
.detail-slide-enter-active,
.detail-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.detail-slide-enter-from,
.detail-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 加载遮罩态 */
.chart-loading-overlay {
  height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 750;
}

.btn-spinner-mini {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空/少数据提示 */
.chart-empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
}

.empty-icon {
  font-size: 32px;
  opacity: 0.7;
}

.empty-text h4 {
  font-size: 14px;
  font-weight: 850;
  color: #ffffff;
  margin: 0;
}

.empty-text p {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
  max-width: 480px;
  line-height: 1.5;
}
</style>