<template>
  <div ref="leaderboardRootRef" class="container" :class="{ 'leaderboard-arrival': isLeaderboardArrival }">
    <!-- 顶部 HUD Header (跑马灯转场 HUD) -->
    <header class="hud-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack" title="返回活动大厅">← 大厅</button>
        <div class="room-title-block">
          <div class="header-title-badge">
            <h1 class="header-page-title">积分查询</h1>
          </div>
          <span class="badge-cashout-hud">THE FINALS · S11 实时排位天梯</span>
        </div>
      </div>

      <div class="header-right">
        <!-- 赛季切换 -->
        <div class="hud-select-box">
          <span class="select-label">SEASON</span>
          <select v-model="selectedSeason" class="select-control" @change="handleFilterChange">
            <option v-for="s in FINALS_SEASONS" :key="s.key" :value="s.key">
              {{ s.label }}
            </option>
          </select>
        </div>

        <!-- 模式切换 -->
        <div class="hud-select-box">
          <span class="select-label">MODE</span>
          <select v-model="selectedMode" class="select-control" @change="handleFilterChange">
            <option v-for="m in FINALS_MODES" :key="m.key" :value="m.key">
              {{ m.label }}
            </option>
          </select>
        </div>

        <!-- 平台切换 -->
        <div class="hud-select-box">
          <span class="select-label">PLATFORM</span>
          <select v-model="selectedPlatform" class="select-control" @change="handleFilterChange">
            <option v-for="p in FINALS_PLATFORMS" :key="p.key" :value="p.key">
              {{ p.label }}
            </option>
          </select>
        </div>
      </div>
    </header>

    <!-- 主体区域 (直角硬朗电竞质感 + 红黑精密线条) -->
    <main class="leaderboard-body-scroll">
      <div class="leaderboard-container-inner">
        <!-- 头部主标题区 (参考图一 CASHOUT TOURNAMENT) -->
        <section class="command-flow-heading">
          <div>
            <span class="command-eyebrow">RANKED LEADERBOARD · S11 GLOBAL LIVE</span>
            <div class="room-hero-title">
              <h2>THE FINALS 实时排位天梯</h2>
              <span class="badge-stage-tag">TOP 10,000</span>
            </div>
          </div>
          <div class="leaderboard-status-badge">
            <span class="pulse-dot"></span>
            <span>官方天梯实时同步中 (每10分钟自动刷新)</span>
          </div>
        </section>

        <!-- 1. 搜索与热门推荐卡片 (直角极简红黑面板) -->
        <section class="search-panel-card">
          <form class="search-row-form" @submit.prevent="handleSearch">
            <div class="search-input-field">
              <span class="input-search-text">SEARCH</span>
              <input
                ref="searchInputRef"
                type="text"
                v-model="inputPlayerName"
                class="main-search-input"
                placeholder="输入玩家 Embark ID / 昵称 (如: Ace#1301, Marťas, Shroud...)"
                :disabled="loading"
                autocomplete="off"
                spellcheck="false"
              />
              <button
                v-if="inputPlayerName"
                type="button"
                class="input-clear-btn"
                @click="clearInput"
                title="清空"
              >✕</button>
            </div>
            <button
              type="submit"
              class="search-submit-pill-btn"
              :disabled="loading || !inputPlayerName.trim()"
            >
              <span v-if="loading" class="btn-spinner"></span>
              <span v-else>搜索战绩</span>
            </button>
          </form>

          <!-- 热门搜索推荐 -->
          <div class="hot-search-row">
            <span class="hot-title">热门选手:</span>
            <div class="hot-chips-list">
              <button
                v-for="sample in sampleNames"
                :key="sample"
                type="button"
                class="hot-chip-btn"
                @click="quickSearch(sample)"
              >
                <span>{{ sample }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- 2. 焦点选手战绩与积分走势卡片 (赛场冠军渐变流光动效) -->
        <section v-if="activePlayer" class="searched-player-focus-area">
          <div class="focus-championship-card">
            <!-- 顶部高光条 (赛场红黑流光冠军渐变) -->
            <div class="championship-header-bar">
              <div class="championship-title-group">
                <span class="champ-eyebrow">RANK HIGHLIGHT · 焦点选手</span>
                <h3 class="champ-title">{{ activePlayer.name }}</h3>
              </div>
              <div class="champ-status-tag">实时已同步</div>
            </div>

            <!-- 卡片核心信息主体 -->
            <div class="championship-body">
              <div class="champ-identity-col">
                <div class="champ-rank-badge">
                  <span class="rank-prefix">全球天梯</span>
                  <strong class="rank-num-val">#{{ activePlayer.rank }}</strong>
                </div>
                <div class="champ-details">
                  <div class="champ-tier-line">
                    <span class="champ-tier-badge" :style="{ color: activePlayer.leagueInfo?.color, borderColor: activePlayer.leagueInfo?.color }">
                      {{ activePlayer.leagueInfo?.title || activePlayer.league }}
                    </span>
                    <span v-if="activePlayer.clubTag" class="champ-club">[{{ activePlayer.clubTag }}]</span>
                  </div>
                  <div class="champ-meta-line">
                    <span v-if="activePlayer.steamName">Steam: {{ activePlayer.steamName }}</span>
                    <span v-if="activePlayer.sponsor">赞助商: {{ activePlayer.sponsor }}</span>
                    <span>24h 升降: <strong :class="activePlayer.changeInfo?.class">{{ activePlayer.changeInfo?.text }}</strong></span>
                  </div>
                </div>
              </div>

              <div class="champ-score-col">
                <span class="score-sub-label">排位积分 (RS)</span>
                <strong class="score-large-val">{{ activePlayer.mainScoreFormatted }} <small>{{ activePlayer.scoreUnit }}</small></strong>
              </div>

              <div class="champ-actions-col">
                <button class="champ-btn-primary" type="button" @click="copyPlayerRecord(activePlayer)">复制战绩</button>
                <button class="champ-btn-secondary" type="button" @click="fillToRoomMember(activePlayer)">填入组队</button>
                <button class="champ-btn-fav" type="button" @click="toggleFavorite(activePlayer)">
                  {{ isFav(activePlayer.name) ? '已关注' : '+ 关注' }}
                </button>
                <button class="champ-btn-close" type="button" @click="activePlayer = null" title="关闭焦点卡片">✕</button>
              </div>
            </div>
          </div>

          <!-- 积分升降走势折线图 -->
          <LeaderboardTrendChart
            :player-name="activePlayer.name"
            :current-score="activePlayer.mainScore"
            :score-unit="activePlayer.scoreUnit"
            :league-title="activePlayer.leagueInfo?.title"
          />
        </section>

        <!-- 3. 底部主数据网格 (左侧：Top 10,000 排行榜 + 右侧：参考图一右栏参赛战队/赛事状态) -->
        <section class="main-split-grid">
          <!-- 左侧：排行榜 (Top 10,000) -->
          <div class="leaderboard-table-card">
            <div class="table-card-header">
              <div class="table-title-group">
                <h3 class="table-title">排行榜 (Top 10,000)</h3>
                <span class="table-sub-badge">点击任意行可查看详细走势</span>
              </div>
              <div class="table-header-tag">实时排序</div>
            </div>

            <!-- 数据加载态 -->
            <div v-if="tableLoading" class="table-loading-box">
              <div class="radar-mini-spinner"></div>
              <span>正在连接官方天梯同步最新榜单...</span>
            </div>

            <!-- 数据表格 -->
            <div v-else class="table-responsive-wrapper">
              <table class="finals-custom-table">
                <thead>
                  <tr>
                    <th style="width: 76px">排名</th>
                    <th>选手 / Embark ID</th>
                    <th style="width: 140px">段位</th>
                    <th style="width: 130px">RS 积分</th>
                    <th style="width: 160px">地区 / 平台</th>
                    <th style="width: 100px; text-align: right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, rIdx) in displayTopPlayers"
                    :key="`${row.name}-${row.rank || rIdx}`"
                    class="table-data-row"
                    :class="{ 'row-highlighted': activePlayer && activePlayer.name === row.name }"
                    @click="handleRowClick(row)"
                  >
                    <!-- 排名 -->
                    <td class="col-rank">
                      <span class="rank-num" :class="{ 'top-three-rank': row.rank <= 3, 'rank-gold': row.rank === 1, 'rank-silver': row.rank === 2, 'rank-bronze': row.rank === 3 }">
                        {{ row.rank }}
                      </span>
                    </td>

                    <!-- 玩家名称 -->
                    <td class="col-player">
                      <div class="player-cell">
                        <span class="player-tag-box" :style="{ backgroundColor: getAcronymColor(row.name) }">
                          {{ getPlayerAcronym(row.name) }}
                        </span>
                        <span class="player-name-text">{{ row.name }}</span>
                        <span v-if="row.clubTag" class="player-club-tag">[{{ row.clubTag }}]</span>
                      </div>
                    </td>

                    <!-- 段位 -->
                    <td class="col-tier">
                      <div class="tier-cell">
                        <span class="tier-title" :style="{ color: row.leagueInfo?.color || '#ffffff' }">
                          {{ row.league || 'Ruby' }}
                        </span>
                      </div>
                    </td>

                    <!-- RS 积分 -->
                    <td class="col-score">
                      <span class="score-text">{{ (row.rankScore || row.mainScore || 0).toLocaleString() }}</span>
                    </td>

                    <!-- 地区 / 平台 -->
                    <td class="col-region">
                      <span class="region-text">{{ row.region || '亚洲 / Crossplay' }}</span>
                    </td>

                    <!-- 操作 -->
                    <td class="col-action" style="text-align: right">
                      <span class="row-view-tag">查看走势 →</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 右侧：参考图一参赛战队与赛事状态布局 -->
          <div class="side-info-cards-col">
            <!-- 卡片 1: 重点关注名单 (Watchlist) -->
            <div class="side-info-card">
              <div class="side-card-title-row">
                <h4 class="side-card-title">重点关注选手 ({{ favoriteList.length }})</h4>
                <span class="side-badge-sub">快捷检索</span>
              </div>
              <div v-if="favoriteList.length" class="fav-players-list">
                <div
                  v-for="favName in favoriteList"
                  :key="favName"
                  class="fav-player-row"
                  @click="quickSearch(favName)"
                >
                  <span class="fav-acronym" :style="{ backgroundColor: getAcronymColor(favName) }">
                    {{ getPlayerAcronym(favName) }}
                  </span>
                  <span class="fav-name">{{ favName }}</span>
                  <span class="fav-arrow">→</span>
                </div>
              </div>
              <p v-else class="side-card-desc">
                暂无关注选手。在搜索或榜单中点击选手并加关注，即可在此快速追踪。
              </p>
            </div>

            <!-- 卡片 2: 关于积分系统 (RS) 说明 -->
            <div class="side-info-card">
              <div class="side-card-title-row">
                <h4 class="side-card-title">关于积分系统 (RS)</h4>
              </div>
              <p class="side-card-desc">
                RS（Rating Score）基于 Elo 算法计算。赢得提现锦标赛可获取高额排位分，连胜将获得额外加成，淘汰或放弃比赛将扣除相应积分。
              </p>
              <a href="javascript:void(0)" class="side-card-link" @click="showRuleToast">查看赛季晋级说明 →</a>
            </div>

            <!-- 卡片 3: 实时数据与同步状态 -->
            <div class="side-info-card">
              <div class="side-card-title-row">
                <h4 class="side-card-title">天梯同步状态</h4>
              </div>
              <div class="side-status-box">
                <div class="live-status-line">
                  <span class="pulse-dot green"></span>
                  <strong>实时同步中</strong>
                </div>
                <p class="status-desc-text">
                  数据来源: Embark Studios 官方 API<br />
                  跨平台 (Steam / PS5 / Xbox) 数据已合并计算。
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { gsap } from 'gsap'
import LeaderboardTrendChart from '../../components/LeaderboardTrendChart.vue'
import {
  recordPlayerSnapshot,
  getFavoritePlayers,
  toggleFavoritePlayer,
  isPlayerFavorite
} from '../../utils/finalsHistoryTracker.js'
import {
  FINALS_SEASONS,
  FINALS_MODES,
  FINALS_PLATFORMS,
  FINALS_TIERS,
  FinalsErrorType,
  queryLeaderboardByPlayer,
  fetchLeaderboardTop,
  queryPlayerProfile
} from '../../utils/theFinalsApi.js'
import { useToast } from '../../composables/useToast.js'
import {
  beginLobbyReturnTransition,
  hasLuluDisplayTransition,
  prepareLuluDisplayArrival,
  placeGlobalLuluInDisplayTarget,
  settleLuluDisplayTransition,
  animateDisplayHeaderCopy,
  TOURNAMENT_DISPLAY_REVEAL_DURATION
} from '../../utils/globalLuluTransition.js'

export default {
  components: {
    LeaderboardTrendChart
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { showToast } = useToast()

    const sampleNames = ['Ace#1301', 'Martás', 'GojoSatoru#1613', 'Shroud', 'FizzyEgg#3201', 'ZHORA']

    const leaderboardRootRef = ref(null)
    const isLeaderboardArrival = ref(false)
    let isReturningToLobby = false
    let lobbyReturnTimeline = null
    let entranceTimer = null

    const selectedSeason = ref('s11')
    const selectedMode = ref('ranked')
    const selectedPlatform = ref('crossplay')
    const inputPlayerName = ref('')
    const searchInputRef = ref(null)

    const loading = ref(false)
    const tableLoading = ref(false)
    const topPlayersList = ref([])
    const activePlayer = ref(null)
    const playerProfile = ref(null)
    const errorType = ref(null)
    const favoriteList = ref([])

    const refreshFavorites = () => {
      favoriteList.value = getFavoritePlayers()
      if (!favoriteList.value.length) {
        favoriteList.value = ['Ace#1301', 'Marťas', 'Shroud']
      }
    }

    const isFav = (name) => {
      if (!name) return false
      return favoriteList.value.some(n => n.toLowerCase() === name.trim().toLowerCase())
    }

    const toggleFavorite = (player) => {
      if (!player || !player.name) return
      const isNowFav = toggleFavoritePlayer(player.name)
      refreshFavorites()
      showToast(isNowFav ? `已重点关注 [${player.name}]` : `已取消关注 [${player.name}]`, 'success')
    }

    const getPlayerAcronym = (name = '') => {
      const clean = name.replace(/#\d+$/, '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
      if (!clean) return 'TF'
      return clean.slice(0, 2).toUpperCase()
    }

    const ACRONYM_COLORS = [
      '#e11d48',
      '#fbbf24',
      '#38bdf8',
      '#34d399',
      '#a855f7',
      '#f97316'
    ]

    const getAcronymColor = (name = '') => {
      let hash = 0
      for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
      return ACRONYM_COLORS[hash % ACRONYM_COLORS.length]
    }

    const currentSeasonLabel = computed(() => {
      const match = FINALS_SEASONS.find(s => s.key === selectedSeason.value)
      return match ? match.label : selectedSeason.value
    })

    const currentModeLabel = computed(() => {
      const match = FINALS_MODES.find(m => m.key === selectedMode.value)
      return match ? match.label : selectedMode.value
    })

    const displayTopPlayers = computed(() => {
      return topPlayersList.value
    })

    const getTierGlyph = () => {
      return ''
    }

    const loadTopLeaderboardData = async () => {
      tableLoading.value = true
      try {
        const list = await fetchLeaderboardTop(
          selectedSeason.value,
          selectedMode.value,
          selectedPlatform.value,
          10
        )
        topPlayersList.value = list
        if (!activePlayer.value && list.length > 0) {
          activePlayer.value = list[0]
          recordPlayerSnapshot(list[0])
        }
      } catch {
        // fallback
      } finally {
        tableLoading.value = false
      }
    }

    const clearInput = () => {
      inputPlayerName.value = ''
      searchInputRef.value?.focus()
    }

    const handleFilterChange = () => {
      loadTopLeaderboardData()
      if (inputPlayerName.value.trim()) {
        handleSearch()
      }
    }

    const quickSearch = (name) => {
      inputPlayerName.value = name
      handleSearch()
    }

    const handleRowClick = (row) => {
      activePlayer.value = row
      recordPlayerSnapshot(row)
      showToast(`已选中选手 [${row.name}]`, 'success')
    }

    const handleSearch = async () => {
      const query = inputPlayerName.value.trim()
      if (!query) {
        showToast('请输入玩家昵称或 Embark ID', 'none')
        return
      }

      loading.value = true
      errorType.value = null
      playerProfile.value = null

      try {
        const list = await queryLeaderboardByPlayer(
          query,
          selectedSeason.value,
          selectedMode.value,
          selectedPlatform.value
        )
        activePlayer.value = list[0]
        recordPlayerSnapshot(activePlayer.value)
        showToast(`成功检索到 ${list[0].name} 战绩`, 'success')

        if (query.includes('#') || activePlayer.value?.name?.includes('#')) {
          const targetName = activePlayer.value?.name || query
          queryPlayerProfile(targetName).then(prof => { playerProfile.value = prof }).catch(() => {})
        }
      } catch (err) {
        errorType.value = err.type || FinalsErrorType.NETWORK_ERROR
        if (err.type === FinalsErrorType.NOT_FOUND) {
          showToast('该玩家未进入全球前 10,000 名', 'none')
        } else if (err.type === FinalsErrorType.NETWORK_ERROR) {
          showToast('海外节点连接超时，请检查代理', 'none')
        } else {
          showToast(err.message || '查询出现异常', 'none')
        }
      } finally {
        loading.value = false
      }
    }

    const copyPlayerRecord = async (player) => {
      if (!player) return
      const text = `【THE FINALS 战绩】${player.name} | 排名: #${player.rank} | 段位: ${player.leagueInfo?.title || player.league || '—'} | 积分: ${player.mainScoreFormatted} ${player.scoreUnit}`
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = text
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        showToast('战绩信息已复制到剪贴板', 'success')
      } catch {
        showToast('复制失败', 'none')
      }
    }

    const fillToRoomMember = (player) => {
      if (!player) return
      try {
        localStorage.setItem('finals_last_query_player', JSON.stringify({
          name: player.name,
          rank: `#${player.rank}`,
          rs: player.mainScoreFormatted,
          unit: player.scoreUnit,
          league: player.leagueInfo?.nameZh || player.league
        }))
        showToast(`已暂存 [${player.name}] 积分信息，可在房间中使用`, 'success')
      } catch {
        showToast('暂存失败', 'none')
      }
    }

    const showRuleToast = () => {
      showToast('RS 积分由 Embark 官方 Elo 系统计算，连胜将获得积分加成', 'none')
    }

    onMounted(() => {
      refreshFavorites()
      loadTopLeaderboardData()
      isLeaderboardArrival.value = hasLuluDisplayTransition('leaderboard')

      if (isLeaderboardArrival.value) {
        prepareLuluDisplayArrival({ target: 'leaderboard', root: leaderboardRootRef.value })
      }

      requestAnimationFrame(() => {
        if (isLeaderboardArrival.value) {
          settleLuluDisplayTransition({
            id: 'leaderboard',
            target: 'leaderboard',
            root: leaderboardRootRef.value,
            onComplete: () => {
              isLeaderboardArrival.value = false
            }
          })
          animateDisplayHeaderCopy(leaderboardRootRef.value, { arrival: true })
          gsap.fromTo('.leaderboard-body-scroll',
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out', clearProps: 'all' }
          )
        } else {
          placeGlobalLuluInDisplayTarget(leaderboardRootRef.value, { target: 'leaderboard' })
          animateDisplayHeaderCopy(leaderboardRootRef.value, { arrival: false })
        }
      })
    })

    onUnmounted(() => {
      if (entranceTimer) clearTimeout(entranceTimer)
      lobbyReturnTimeline?.kill()
    })

    const goBack = () => {
      if (isReturningToLobby) return

      const navigateHome = () => router.push('/')
      const root = leaderboardRootRef.value
      const header = root?.querySelector('.hud-header')
      const headerLeft = root?.querySelector('.header-left')
      const headerRight = root?.querySelector('.header-right')
      root?.classList.add('tournament-leaving')

      isReturningToLobby = true
      let transitionStarted = false
      lobbyReturnTimeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
        .call(() => {
          transitionStarted = beginLobbyReturnTransition('leaderboard')
          if (!transitionStarted) navigateHome()
        }, null, 0)
        .to(headerLeft ? [headerLeft] : [], {
          xPercent: -105,
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power3.inOut'
        }, 0)
        .to(headerRight ? [headerRight] : [], {
          xPercent: 105,
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power3.inOut'
        }, 0)
        .to(header ? [header] : [], {
          height: root?.clientHeight || window.innerHeight,
          minHeight: root?.clientHeight || window.innerHeight,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut'
        }, 0)
        .call(() => {
          if (transitionStarted) navigateHome()
        }, null, TOURNAMENT_DISPLAY_REVEAL_DURATION + 0.04)
    }

    return {
      leaderboardRootRef, isLeaderboardArrival, goBack,
      FINALS_SEASONS, FINALS_MODES, FINALS_PLATFORMS, FINALS_TIERS, FinalsErrorType,
      selectedSeason, selectedMode, selectedPlatform, inputPlayerName, searchInputRef,
      loading, tableLoading, displayTopPlayers, activePlayer, playerProfile, errorType, sampleNames, favoriteList,
      currentSeasonLabel, currentModeLabel, getTierGlyph,
      handleSearch, handleFilterChange, quickSearch, handleRowClick, clearInput,
      copyPlayerRecord, fillToRoomMember, showRuleToast,
      isFav, toggleFavorite, getPlayerAcronym, getAcronymColor
    }
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: transparent;
  color: #ffffff;
  font-family: var(--font-sans);
}

.container.leaderboard-arrival {
  background: transparent;
}

.leaderboard-arrival .hud-header {
  z-index: auto;
  border-color: transparent;
  border-left-color: transparent;
  background: transparent;
}

.leaderboard-arrival .header-left {
  transform: translateX(-105vw);
  opacity: 0;
  visibility: hidden;
}

.leaderboard-arrival .header-right {
  transform: translateX(105vw);
  opacity: 0;
  visibility: hidden;
}

.leaderboard-arrival .leaderboard-body-scroll {
  opacity: 0;
}

.tournament-leaving .header-left,
.tournament-leaving .header-right {
  z-index: 80;
}

.tournament-leaving .hud-header {
  z-index: auto;
  border-color: transparent;
  border-left-color: transparent;
  background: transparent;
}

/* 顶部 HUD Header (完全统一赛事房间 112px HUD 布局) */
.hud-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28px;
  height: 112px;
  min-height: 112px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background: transparent;
  box-shadow: none;
  flex-shrink: 0;
  gap: 16px;
  overflow: hidden;
}

.hud-header .header-left,
.hud-header .header-right {
  position: relative;
  z-index: 70;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 18px;
}

/* 统一退回主页大厅按钮 (以赛事房间为基准样式) */
.back-btn {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(13, 10, 12, 0.3);
  color: #ffffff;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.back-btn:hover {
  border-color: rgba(255, 255, 255, 0.72);
  background: rgba(13, 10, 12, 0.48);
}

.room-title-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 16px;
  border-left: 1px solid rgba(255, 255, 255, 0.25);
}

.header-title-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-page-title {
  font-size: 26px;
  font-weight: 1000;
  color: #ffffff;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  line-height: 1.1;
  margin: 0;
}

.badge-cashout-hud {
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.68);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hud-select-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.select-label {
  font-size: 10px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.08em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.select-control {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(225, 29, 72, 0.35);
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 0;
  font-size: 13px;
  font-weight: 750;
  outline: none;
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.select-control:hover {
  border-color: #e11d48;
  background: rgba(0, 0, 0, 0.8);
}

.select-control option {
  background: #101217;
  color: #ffffff;
}

/* 主滚动区域 (纯黑电竞底色) */
.leaderboard-body-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 40px 28px;
  background: #080a0e;
  position: relative;
  z-index: 10;
}

.leaderboard-container-inner {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 头部主标题区 (直角硬朗红黑线条) */
.command-flow-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(225, 29, 72, 0.25);
}

.command-eyebrow {
  display: block;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #fb7185;
  margin-bottom: 4px;
}

.room-hero-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.room-hero-title h2 {
  font-size: 24px;
  font-weight: 1000;
  color: #ffffff;
  letter-spacing: -0.01em;
  margin: 0;
}

.badge-stage-tag {
  padding: 3px 8px;
  background: rgba(225, 29, 72, 0.2);
  border: 1px solid #e11d48;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  border-radius: 0;
}

.leaderboard-status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(14, 17, 23, 0.95);
  border: 1px solid rgba(225, 29, 72, 0.3);
  border-left: 3px solid #e11d48;
  border-radius: 0;
  font-size: 11.5px;
  font-weight: 750;
  color: rgba(255, 255, 255, 0.9);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 0;
  background: #e11d48;
  box-shadow: 0 0 8px #e11d48;
  display: inline-block;
  animation: pulseDot 1.4s infinite alternate;
}

.pulse-dot.green {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

@keyframes pulseDot {
  0% { transform: scale(0.85); opacity: 0.7; }
  100% { transform: scale(1.25); opacity: 1; }
}

/* 1. 搜索面板卡片 (直角极简红黑面板) */
.search-panel-card {
  padding: 16px 20px;
  background: rgba(14, 17, 23, 0.92);
  border-radius: 0;
  border: 1px solid rgba(225, 29, 72, 0.25);
  border-left: 3px solid #e11d48;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-row-form {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input-field {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0;
  padding: 9px 14px;
  gap: 10px;
  transition: all 0.2s ease;
}

.search-input-field:focus-within {
  border-color: #e11d48;
  box-shadow: 0 0 0 1px #e11d48;
  background: rgba(0, 0, 0, 0.75);
}

.input-search-text {
  font-size: 10px;
  font-weight: 900;
  color: #fb7185;
  letter-spacing: 0.08em;
}

.main-search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 600;
  outline: none;
}

.main-search-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.input-clear-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  cursor: pointer;
  padding: 0 4px;
}

.search-submit-pill-btn {
  padding: 10px 24px;
  background: #e11d48;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  border-radius: 0;
  border: 1px solid #ff3b68;
  box-shadow: 0 0 12px rgba(225, 29, 72, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.search-submit-pill-btn:hover:not(:disabled) {
  background: #f43f5e;
  transform: translateY(-1px);
}

.search-submit-pill-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.hot-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.hot-title {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 750;
}

.hot-chips-list {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hot-chip-btn {
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(225, 29, 72, 0.3);
  border-radius: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 11.5px;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hot-chip-btn:hover {
  background: #e11d48;
  border-color: #ffffff;
  color: #ffffff;
}

/* 2. 焦点选手战绩卡片 (提亮红色流光，慢速来回平滑滑动) */
.searched-player-focus-area {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.focus-championship-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 42, 85, 0.55);
  background: #0d0e12;
  position: relative;
}

/* 核心：提亮且自然的红色光带来回慢速滑动 (8.5s) */
.focus-championship-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 15%,
    rgba(225, 29, 72, 0.04) 26%,
    rgba(225, 29, 72, 0.18) 38%,
    rgba(255, 42, 95, 0.48) 46%,
    rgba(255, 42, 95, 0.85) 50%,
    rgba(255, 42, 95, 0.48) 54%,
    rgba(225, 29, 72, 0.18) 62%,
    rgba(225, 29, 72, 0.04) 74%,
    transparent 85%,
    transparent 100%
  );
  background-size: 260% 100%;
  animation: redLightBeamSlide 8.5s ease-in-out infinite;
}

@keyframes redLightBeamSlide {
  0% {
    background-position: 100% 0;
  }
  50% {
    background-position: 0% 0;
  }
  100% {
    background-position: 100% 0;
  }
}

.championship-header-bar {
  position: relative;
  z-index: 2;
  background: transparent !important;
  padding: 14px 20px 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
}

.championship-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.champ-eyebrow {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #ffa6be;
}

.champ-title {
  font-size: 20px;
  font-weight: 1000;
  color: #ff3366;
  text-shadow: 0 0 14px rgba(255, 51, 102, 0.6);
  margin: 0;
  line-height: 1.2;
}

.champ-status-tag {
  font-size: 11px;
  font-weight: 900;
  color: #ff3366;
  padding: 3px 10px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 51, 102, 0.45);
  border-radius: 0;
}

.championship-body {
  position: relative;
  z-index: 2;
  background: transparent !important;
  backdrop-filter: none !important;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  border-radius: 0;
}

.champ-identity-col {
  display: flex;
  align-items: center;
  gap: 16px;
}

.champ-rank-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 42, 85, 0.6);
  border-radius: 0;
}

.rank-prefix {
  font-size: 9px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.7);
}

.rank-num-val {
  font-size: 20px;
  font-weight: 1000;
  color: #ffffff;
}

.champ-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.champ-tier-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.champ-tier-badge {
  padding: 2px 10px;
  border: 1px solid currentColor;
  border-radius: 0;
  font-size: 11.5px;
  font-weight: 850;
  background: rgba(0, 0, 0, 0.45);
}

.champ-club {
  color: #fbbf24;
  font-size: 12px;
  font-weight: 800;
}

.champ-meta-line {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.champ-score-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.score-sub-label {
  font-size: 9.5px;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.6);
}

.score-large-val {
  font-size: 24px;
  font-weight: 1000;
  color: #fbbf24;
  text-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
}

.champ-actions-col {
  display: flex;
  align-items: center;
  gap: 8px;
}

.champ-btn-primary {
  padding: 9px 18px;
  background: #e81446;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  border-radius: 0;
  border: 1px solid #ff3b68;
  box-shadow: 0 0 12px rgba(232, 20, 70, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.champ-btn-primary:hover {
  background: #ff2a5f;
  box-shadow: 0 0 18px rgba(232, 20, 70, 0.75);
}

.champ-btn-secondary {
  padding: 9px 16px;
  background: rgba(0, 0, 0, 0.4);
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: all 0.2s ease;
}

.champ-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: #ffffff;
}

.champ-btn-fav {
  padding: 9px 14px;
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  font-size: 13px;
  font-weight: 850;
  border-radius: 0;
  border: 1px solid rgba(251, 191, 36, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.champ-btn-close {
  padding: 9px 12px;
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
}

/* 3. 底部主数据网格 (70% 表格 + 30% 右栏) */
.main-split-grid {
  display: grid;
  grid-template-columns: 1fr 310px;
  gap: 16px;
}

@media (max-width: 1024px) {
  .main-split-grid {
    grid-template-columns: 1fr;
  }
}

/* 左侧排行榜表格卡片 */
.leaderboard-table-card {
  padding: 16px 20px;
  background: rgba(14, 17, 23, 0.92);
  border-radius: 0;
  border: 1px solid rgba(225, 29, 72, 0.25);
  border-top: 2px solid #e11d48;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.table-title-group {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.table-title {
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
}

.table-sub-badge {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 600;
}

.table-header-tag {
  font-size: 11px;
  font-weight: 850;
  color: #fb7185;
}

.table-loading-box {
  padding: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.radar-mini-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(225, 29, 72, 0.3);
  border-top-color: #e11d48;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.table-responsive-wrapper {
  overflow-x: auto;
}

.finals-custom-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.finals-custom-table th {
  text-align: left;
  padding: 10px 12px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 850;
  border-bottom: 1px solid rgba(225, 29, 72, 0.2);
  background: rgba(0, 0, 0, 0.35);
  font-size: 11.5px;
  white-space: nowrap;
}

.finals-custom-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: middle;
  white-space: nowrap;
}

.table-data-row {
  cursor: pointer;
  transition: all 0.15s ease;
  height: 42px;
}

.table-data-row:hover {
  background: rgba(225, 29, 72, 0.12);
}

/* 选中行：保持原本标准尺寸与高度，提亮红色光带来回慢速滑动 (8s) */
.table-data-row.row-highlighted {
  position: relative;
  background: rgba(225, 29, 72, 0.18) !important;
  border-left: 3px solid #ff2a5f;
}

.table-data-row.row-highlighted::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(225, 29, 72, 0.05) 20%,
    rgba(225, 29, 72, 0.25) 38%,
    rgba(255, 42, 95, 0.6) 50%,
    rgba(225, 29, 72, 0.25) 62%,
    rgba(225, 29, 72, 0.05) 80%,
    transparent 100%
  );
  background-size: 240% 100%;
  animation: redLightBeamSlide 8s ease-in-out infinite;
}

.col-rank .rank-num {
  font-weight: 900;
  color: rgba(255, 255, 255, 0.8);
}

.top-three-rank {
  font-weight: 1000 !important;
}

.rank-gold {
  color: #fbbf24 !important;
  text-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
}

.rank-silver {
  color: #cbd5e1 !important;
}

.rank-bronze {
  color: #f59e0b !important;
}

.player-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-tag-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 20px;
  border-radius: 0;
  font-size: 10px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.02em;
}

.player-name-text {
  font-weight: 800;
  color: #ffffff;
}

.player-club-tag {
  color: #fbbf24;
  font-size: 11px;
  font-weight: 750;
}

.tier-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tier-title {
  font-weight: 800;
}

.score-text {
  font-weight: 900;
  color: #ffffff;
}

.region-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11.5px;
}

.row-view-tag {
  font-size: 11.5px;
  font-weight: 800;
  color: #ff3366;
  opacity: 0.9;
  white-space: nowrap;
}

/* 右侧说明卡片列 (直角红黑边框卡片) */
.side-info-cards-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.side-info-card {
  padding: 16px 18px;
  background: rgba(14, 17, 23, 0.92);
  border-radius: 0;
  border: 1px solid rgba(225, 29, 72, 0.25);
  border-left: 3px solid #e11d48;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.side-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.side-card-title {
  font-size: 13.5px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
}

.side-badge-sub {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.45);
  font-weight: 750;
}

.fav-players-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fav-player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(225, 29, 72, 0.2);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.fav-player-row:hover {
  background: rgba(225, 29, 72, 0.2);
  border-color: #e11d48;
  transform: translateX(3px);
}

.fav-acronym {
  width: 24px;
  height: 20px;
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  color: #ffffff;
}

.fav-name {
  flex: 1;
  font-size: 12px;
  font-weight: 800;
  color: #ffffff;
}

.fav-arrow {
  color: rgba(255, 255, 255, 0.35);
  font-size: 12px;
}

.side-card-desc {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 0;
}

.side-card-link {
  font-size: 11.5px;
  color: #e11d48;
  font-weight: 800;
  text-decoration: none;
  display: inline-block;
}

.side-card-link:hover {
  text-decoration: underline;
}

.side-status-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.live-status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #ffffff;
}

.status-desc-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
}
</style>
