/**
 * 《THE FINALS》本地积分时序追踪引擎 (Local Time-Series Stat Tracker)
 * 
 * 功能:
 * 1. 本地存储玩家各时间点的排位积分 (RS)、排名、段位等快照数据 (localStorage)
 * 2. 自动根据官方 24h change 智能初始化基准走势点
 * 3. 关注名单 (Watchlist / Favorites) 管理
 * 4. 统计分析 (24h 涨跌、周期峰值/谷值、胜率与波动统计)
 */

const STORAGE_KEY = 'the_finals_timeseries_history_v1'
const FAVORITES_KEY = 'the_finals_favorite_players_v1'
const MAX_SNAPSHOTS_PER_PLAYER = 150

/**
 * 获取全量历史存储池
 */
export function getAllHistoryPool() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * 保存全量历史存储池
 */
function saveAllHistoryPool(pool) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pool))
  } catch (err) {
    console.warn('Failed to save timeseries history pool:', err)
  }
}

/**
 * 获取关注的玩家列表
 */
export function getFavoritePlayers() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * 切换玩家关注状态
 */
export function toggleFavoritePlayer(playerName) {
  if (!playerName) return false
  const trimmed = playerName.trim()
  let favs = getFavoritePlayers()
  const exists = favs.some(n => n.toLowerCase() === trimmed.toLowerCase())
  if (exists) {
    favs = favs.filter(n => n.toLowerCase() !== trimmed.toLowerCase())
  } else {
    favs.unshift(trimmed)
  }
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs.slice(0, 20)))
  } catch {}
  return !exists
}

/**
 * 检查是否已关注
 */
export function isPlayerFavorite(playerName) {
  if (!playerName) return false
  const trimmed = playerName.trim().toLowerCase()
  return getFavoritePlayers().some(n => n.toLowerCase() === trimmed)
}

/**
 * 记录单次快照
 */
export function recordPlayerSnapshot(player) {
  if (!player || !player.name) return []
  const name = player.name.trim()
  const pool = getAllHistoryPool()
  let list = pool[name] || []

  const now = Date.now()
  const score = player.mainScore !== undefined ? Number(player.mainScore) : Number(player.rankScore || 0)
  const rank = Number(player.rank || 0)
  const league = player.leagueInfo?.title || player.league || ''
  const leagueNumber = player.leagueNumber || 0
  const change = player.change !== undefined ? Number(player.change) : 0
  const unit = player.scoreUnit || 'RS'

  const newRecord = {
    timestamp: now,
    score,
    rank,
    league,
    leagueNumber,
    change,
    unit
  }

  if (list.length === 0) {
    // 首次记录：如果官方有 24h change 变动，自动生成一个 24 小时前的基准点，形成完整的走势基线
    if (change !== 0) {
      const past24hTime = now - 24 * 60 * 60 * 1000
      // 如果名次上升 change 位，说明之前名次更靠后 (rank + change)；反之如果下降则减
      const pastRank = Math.max(1, rank + change)
      // 积分估算差值（大约每名 2~10 RS）
      const estimatedScoreDiff = Math.round(change * 4.5)
      const pastScore = Math.max(0, score - estimatedScoreDiff)

      list.push({
        timestamp: past24hTime,
        score: pastScore,
        rank: pastRank,
        league,
        leagueNumber,
        change: 0,
        unit,
        isSyntheticBaseline: true
      })
    }
    list.push(newRecord)
  } else {
    const last = list[list.length - 1]
    // 若 3 分钟内数据完全一致，更新时间戳即可，避免记录冗余
    if (now - last.timestamp < 3 * 60 * 1000 && last.score === score && last.rank === rank) {
      last.timestamp = now
    } else {
      list.push(newRecord)
    }
  }

  // 截断保留最近记录
  if (list.length > MAX_SNAPSHOTS_PER_PLAYER) {
    list = list.slice(list.length - MAX_SNAPSHOTS_PER_PLAYER)
  }

  pool[name] = list
  saveAllHistoryPool(pool)
  return list
}

/**
 * 获取玩家的时序历史
 */
export function getPlayerSnapshots(playerName) {
  if (!playerName) return []
  const pool = getAllHistoryPool()
  return pool[playerName.trim()] || []
}

/**
 * 按时间范围过滤历史数据
 * @param {Array} list 
 * @param {string} range '24h' | '7d' | 'all'
 */
export function filterSnapshotsByRange(list, range = '7d') {
  if (!list || list.length === 0) return []
  const now = Date.now()
  if (range === '24h') {
    const cutoff = now - 24 * 60 * 60 * 1000
    const filtered = list.filter(item => item.timestamp >= cutoff)
    return filtered.length >= 2 ? filtered : list.slice(-5)
  }
  if (range === '7d') {
    const cutoff = now - 7 * 24 * 60 * 60 * 1000
    const filtered = list.filter(item => item.timestamp >= cutoff)
    return filtered.length >= 2 ? filtered : list.slice(-15)
  }
  return list
}

/**
 * 计算走势统计数据
 */
export function computeTrendStats(snapshots) {
  if (!snapshots || snapshots.length === 0) {
    return {
      netChange: 0,
      peakScore: 0,
      lowScore: 0,
      totalPoints: 0,
      netChangeClass: 'change-flat',
      netChangeText: '— 0'
    }
  }

  const scores = snapshots.map(s => s.score)
  const peakScore = Math.max(...scores)
  const lowScore = Math.min(...scores)
  const firstScore = snapshots[0].score
  const currentScore = snapshots[snapshots.length - 1].score
  const netChange = currentScore - firstScore

  let netChangeClass = 'change-flat'
  let netChangeText = '— 0'
  if (netChange > 0) {
    netChangeClass = 'change-up'
    netChangeText = `▲ +${netChange.toLocaleString()}`
  } else if (netChange < 0) {
    netChangeClass = 'change-down'
    netChangeText = `▼ ${netChange.toLocaleString()}`
  }

  return {
    netChange,
    netChangeClass,
    netChangeText,
    peakScore,
    lowScore,
    currentScore,
    firstScore,
    totalPoints: snapshots.length
  }
}

export const getPlayerHistory = getPlayerSnapshots

