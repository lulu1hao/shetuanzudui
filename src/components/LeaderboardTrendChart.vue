<template>
  <div class="trend-chart-card glass-panel">
    <!-- 图表控制顶栏 -->
    <div class="chart-header-bar">
      <div class="chart-title-group">
        <div class="chart-badge">
          <span class="chart-eyebrow">RANK SCORE HISTORY</span>
        </div>
        <h3 class="chart-player-heading">
          {{ playerName }} · 积分走势
          <span class="curr-score-tag">{{ latestScoreFormatted }} {{ scoreUnit }}</span>
        </h3>
      </div>

      <!-- 时间区间切换 -->
      <div class="chart-controls-group">
        <div class="time-range-tabs">
          <button
            type="button"
            class="range-tab-btn"
            :class="{ active: timeRange === '24h' }"
            @click="setTimeRange('24h')"
          >
            最近 24 小时
          </button>
          <button
            type="button"
            class="range-tab-btn"
            :class="{ active: timeRange === '7d' }"
            @click="setTimeRange('7d')"
          >
            最近 7 天
          </button>
          <button
            type="button"
            class="range-tab-btn"
            :class="{ active: timeRange === 'all' }"
            @click="setTimeRange('all')"
          >
            全部历史
          </button>
        </div>

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
        <span class="pill-label">最高峰值</span>
        <strong class="text-gold">{{ stats.peakScore.toLocaleString() }} {{ scoreUnit }}</strong>
      </div>
      <div class="stat-summary-pill">
        <span class="pill-label">最低谷值</span>
        <strong>{{ stats.lowScore.toLocaleString() }} {{ scoreUnit }}</strong>
      </div>
      <div class="stat-summary-pill">
        <span class="pill-label">快照记录节点</span>
        <strong class="text-cyan">{{ filteredSnapshots.length }} 节点</strong>
      </div>
    </div>

    <!-- SVG 阶梯折线图主体 (清晰无动效) -->
    <div class="svg-chart-container" ref="chartContainerRef" @mouseleave="hoveredPoint = null">
      <svg
        v-if="filteredSnapshots.length >= 2"
        class="stepped-chart-svg"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        preserveAspectRatio="none"
      >
        <defs>
          <!-- 背景浅红发光渐变 -->
          <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(225, 29, 72, 0.2)" />
            <stop offset="100%" stop-color="rgba(225, 29, 72, 0.0)" />
          </linearGradient>
        </defs>

        <!-- Y 轴网格线与分值标尺 -->
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
              :x="paddingLeft - 8"
              :y="grid.y + 4"
              class="axis-text axis-y-text"
              text-anchor="end"
            >
              {{ grid.label }}
            </text>
          </template>
        </g>

        <!-- 填充区域 -->
        <path
          :d="steppedAreaPathString"
          fill="url(#scoreAreaGradient)"
          class="stepped-area-path"
        />

        <!-- 阶梯折线核心路径 (清晰利落) -->
        <path
          :d="steppedPathString"
          class="stepped-line-path"
        />

        <!-- 关键节点圆点 -->
        <g class="chart-points-layer">
          <g
            v-for="(pt, idx) in chartPoints"
            :key="idx"
            class="point-marker-group"
            @mouseenter="hoveredPoint = pt"
          >
            <!-- 悬停扩展碰撞区域 -->
            <circle
              :cx="pt.x"
              :cy="pt.y"
              r="12"
              fill="transparent"
            />
            <!-- 实心核心点 -->
            <circle
              :cx="pt.x"
              :cy="pt.y"
              r="3.5"
              class="point-dot"
              :class="pt.diffClass"
            />
          </g>
        </g>

        <!-- 静态准星线 (悬停时显示，无脉冲动画) -->
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
          <!-- 静态指示圈 -->
          <circle
            :cx="hoveredPoint.x"
            :cy="hoveredPoint.y"
            r="6"
            class="hover-static-circle"
          />
        </g>
      </svg>

      <!-- 悬停数据卡片 (Tooltip) -->
      <div
        v-if="hoveredPoint"
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
            <span class="label">排位分:</span>
            <strong>{{ hoveredPoint.scoreFormatted }} {{ scoreUnit }}</strong>
          </div>
          <div v-if="hoveredPoint.rank" class="tooltip-meta">
            <span>天梯排名: </span><strong>#{{ hoveredPoint.rank }}</strong>
          </div>
        </div>
      </div>

      <!-- 单个数据点或初次查询状态 -->
      <div v-if="filteredSnapshots.length < 2" class="chart-empty-state">
        <div class="empty-text">
          <h4>已记录当前积分快照: {{ latestScoreFormatted }} {{ scoreUnit }}</h4>
          <p>持续在各场比赛后查询战绩，系统将自动记录并绘制您的实时天梯胜负升降阶梯折线。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
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
    }
  },
  setup(props) {
    const { showToast } = useToast()
    const timeRange = ref('24h')
    const snapshots = ref([])
    const isFavorite = ref(false)
    const hoveredPoint = ref(null)
    const chartContainerRef = ref(null)

    // SVG 坐标系常量
    const svgWidth = 800
    const svgHeight = 220
    const paddingLeft = 60
    const paddingRight = 30
    const paddingTop = 20
    const paddingBottom = 26

    const loadHistoryData = () => {
      if (!props.playerName) return
      let list = getPlayerSnapshots(props.playerName)

      if (list.length === 0 && props.currentScore) {
        list = recordPlayerSnapshot({
          name: props.playerName,
          mainScore: props.currentScore,
          rankScore: props.currentScore,
          league: props.leagueTitle
        })
      }
      snapshots.value = list
      isFavorite.value = isPlayerFavorite(props.playerName)
    }

    watch(() => props.playerName, () => {
      loadHistoryData()
      hoveredPoint.value = null
    })

    watch(() => props.currentScore, () => {
      loadHistoryData()
    })

    onMounted(() => {
      loadHistoryData()
    })

    const setTimeRange = (range) => {
      timeRange.value = range
      hoveredPoint.value = null
    }

    const handleToggleFavorite = () => {
      if (!props.playerName) return
      const nextFav = toggleFavoritePlayer(props.playerName)
      isFavorite.value = nextFav
      showToast(nextFav ? `已关注玩家 [${props.playerName}]` : `已取消关注 [${props.playerName}]`, 'success')
    }

    // 根据选择的时间区间过滤快照
    const filteredSnapshots = computed(() => {
      const all = [...snapshots.value].sort((a, b) => a.timestamp - b.timestamp)
      if (all.length === 0) return []

      const now = Date.now()
      if (timeRange.value === '24h') {
        const cutoff = now - 24 * 60 * 60 * 1000
        const filtered = all.filter(s => s.timestamp >= cutoff)
        return filtered.length > 0 ? filtered : all.slice(-10)
      } else if (timeRange.value === '7d') {
        const cutoff = now - 7 * 24 * 60 * 60 * 1000
        const filtered = all.filter(s => s.timestamp >= cutoff)
        return filtered.length > 0 ? filtered : all.slice(-25)
      }
      return all
    })

    const latestScoreFormatted = computed(() => {
      const score = Number(props.currentScore) || (filteredSnapshots.value.length > 0 ? filteredSnapshots.value[filteredSnapshots.value.length - 1].score : 0)
      return score.toLocaleString()
    })

    // 统计指标计算
    const stats = computed(() => {
      const list = filteredSnapshots.value
      if (list.length === 0) {
        return {
          netChangeText: '0',
          netChangeClass: 'change-flat',
          peakScore: Number(props.currentScore) || 0,
          lowScore: Number(props.currentScore) || 0
        }
      }

      const firstScore = list[0].score
      const lastScore = list[list.length - 1].score
      const diff = lastScore - firstScore

      let netChangeText = diff === 0 ? '0' : (diff > 0 ? `+${diff.toLocaleString()}` : `${diff.toLocaleString()}`)
      let netChangeClass = diff > 0 ? 'change-up' : (diff < 0 ? 'change-down' : 'change-flat')

      let peak = list[0].score
      let low = list[0].score
      for (const item of list) {
        if (item.score > peak) peak = item.score
        if (item.score < low) low = item.score
      }

      return {
        netChangeText,
        netChangeClass,
        peakScore: peak,
        lowScore: low
      }
    })

    // Y 轴范围与坐标映射
    const scoreRange = computed(() => {
      const list = filteredSnapshots.value
      if (list.length === 0) return { min: 0, max: 1000 }
      let min = Infinity
      let max = -Infinity
      for (const item of list) {
        if (item.score < min) min = item.score
        if (item.score > max) max = item.score
      }
      if (min === max) {
        min = Math.max(0, min - 200)
        max = max + 200
      } else {
        const pad = (max - min) * 0.15
        min = Math.max(0, Math.floor(min - pad))
        max = Math.ceil(max + pad)
      }
      return { min, max }
    })

    // Y 轴网格刻度 (4 条均匀刻度)
    const yGrids = computed(() => {
      const { min, max } = scoreRange.value
      const step = (max - min) / 3
      const grids = []
      for (let i = 0; i <= 3; i++) {
        const val = Math.round(min + step * i)
        const y = (svgHeight - paddingBottom) - ((val - min) / (max - min || 1)) * (svgHeight - paddingTop - paddingBottom)
        grids.push({
          value: val,
          label: val.toLocaleString(),
          y
        })
      }
      return grids
    })

    // 将快照点转换为 SVG 坐标点
    const chartPoints = computed(() => {
      const list = filteredSnapshots.value
      if (list.length === 0) return []
      const { min, max } = scoreRange.value
      const plotWidth = svgWidth - paddingLeft - paddingRight
      const plotHeight = svgHeight - paddingTop - paddingBottom

      const count = list.length
      return list.map((item, idx) => {
        const x = count === 1
          ? paddingLeft + plotWidth / 2
          : paddingLeft + (idx / (count - 1)) * plotWidth
        const y = (svgHeight - paddingBottom) - ((item.score - min) / (max - min || 1)) * plotHeight

        let diffText = '首次记录'
        let diffClass = 'point-flat'
        if (idx > 0) {
          const prevScore = list[idx - 1].score
          const diff = item.score - prevScore
          if (diff > 0) {
            diffText = `+${diff.toLocaleString()}`
            diffClass = 'point-up'
          } else if (diff < 0) {
            diffText = `${diff.toLocaleString()}`
            diffClass = 'point-down'
          } else {
            diffText = '持平'
            diffClass = 'point-flat'
          }
        }

        const date = new Date(item.timestamp)
        const timeFormatted = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`

        return {
          x,
          y,
          diffText,
          diffClass,
          ...item,
          scoreFormatted: item.score.toLocaleString(),
          timeFormatted
        }
      })
    })

    // 阶梯折线 (Stepped Line)
    const steppedPathString = computed(() => {
      const pts = chartPoints.value
      if (pts.length < 2) return ''

      let d = `M ${pts[0].x} ${pts[0].y}`
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1]
        const curr = pts[i]
        d += ` H ${curr.x} V ${curr.y}`
      }
      return d
    })

    // 阶梯闭合区域路径
    const steppedAreaPathString = computed(() => {
      const pts = chartPoints.value
      if (pts.length < 2) return ''

      const baseY = svgHeight - paddingBottom
      let d = `M ${pts[0].x} ${baseY} L ${pts[0].x} ${pts[0].y}`
      for (let i = 1; i < pts.length; i++) {
        const curr = pts[i]
        d += ` H ${curr.x} V ${curr.y}`
      }
      d += ` L ${pts[pts.length - 1].x} ${baseY} Z`
      return d
    })

    const tooltipStyle = computed(() => {
      if (!hoveredPoint.value) return {}
      const xPercent = (hoveredPoint.value.x / svgWidth) * 100
      const yPercent = (hoveredPoint.value.y / svgHeight) * 100
      return {
        left: `${xPercent}%`,
        top: `${Math.max(12, yPercent - 8)}%`
      }
    })

    return {
      timeRange,
      snapshots,
      filteredSnapshots,
      latestScoreFormatted,
      isFavorite,
      stats,
      setTimeRange,
      handleToggleFavorite,
      chartContainerRef,
      hoveredPoint,
      svgWidth,
      svgHeight,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      yGrids,
      chartPoints,
      steppedPathString,
      steppedAreaPathString,
      tooltipStyle
    }
  }
}
</script>

<style scoped>
/* 主卡片容器 (直角极简红黑电竞) */
.trend-chart-card {
  padding: 16px 18px;
  background: rgba(14, 17, 23, 0.92);
  border: 1px solid rgba(225, 29, 72, 0.35);
  border-top: 2px solid #e11d48;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  overflow: visible;
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
  gap: 2px;
}

.chart-badge {
  display: flex;
  align-items: center;
}

.chart-eyebrow {
  font-size: 9.5px;
  font-weight: 850;
  letter-spacing: 0.1em;
  color: #fb7185;
}

.chart-player-heading {
  font-size: 15px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.curr-score-tag {
  font-size: 11px;
  font-weight: 850;
  color: #fbbf24;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(251, 191, 36, 0.35);
  border-radius: 0;
  padding: 2px 8px;
}

.chart-controls-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-range-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.5);
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
  gap: 10px;
  background: rgba(0, 0, 0, 0.4);
  padding: 8px 12px;
  border-radius: 0;
  border: 1px solid rgba(225, 29, 72, 0.2);
  border-left: 2px solid #e11d48;
}

.stat-summary-pill {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pill-label {
  font-size: 9px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.45);
}

.stat-summary-pill strong {
  font-size: 13px;
  font-weight: 900;
}

.change-up { color: #34d399 !important; }
.change-down { color: #f87171 !important; }
.change-flat { color: rgba(255, 255, 255, 0.5) !important; }
.text-gold { color: #fbbf24 !important; }
.text-cyan { color: #e11d48 !important; }

/* SVG 图表容器 (清晰简明) */
.svg-chart-container {
  position: relative;
  width: 100%;
  height: 220px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.stepped-chart-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.grid-line {
  stroke: rgba(255, 255, 255, 0.08);
  stroke-dasharray: 4 4;
  stroke-width: 1;
}

.axis-text {
  font-size: 10px;
  font-weight: 700;
  fill: rgba(255, 255, 255, 0.45);
}

.stepped-line-path {
  fill: none;
  stroke: #e11d48;
  stroke-width: 2.2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.point-marker-group {
  cursor: pointer;
}

.point-dot.point-up { fill: #34d399; }
.point-dot.point-down { fill: #f87171; }
.point-dot.point-flat { fill: #e11d48; }

.crosshair-line {
  stroke: rgba(255, 255, 255, 0.25);
  stroke-dasharray: 2 2;
  stroke-width: 1;
}

.hover-static-circle {
  fill: transparent;
  stroke: #e11d48;
  stroke-width: 1.5;
}

/* 提示卡片 Tooltip */
.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  background: rgba(14, 17, 23, 0.98);
  border: 1px solid #e11d48;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
  padding: 8px 12px;
  border-radius: 0;
  pointer-events: none;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.tooltip-time {
  font-size: 10px;
  font-weight: 750;
  color: rgba(255, 255, 255, 0.5);
}

.tooltip-diff {
  font-size: 11px;
  font-weight: 800;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tooltip-score {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  color: #ffffff;
}

.tooltip-score .label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.tooltip-meta {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

/* 空/少数据提示 */
.chart-empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.empty-text h4 {
  font-size: 13.5px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.empty-text p {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
  max-width: 480px;
}
</style>