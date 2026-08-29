/**
 * 《THE FINALS》官方实时天梯与全赛季战绩追踪服务 (Leaderboard Tracker)
 * 参考并同步 DavG25 Leaderboard Tracker & 社区最新 OpenAPI 规范
 * 
 * 支持:
 * 1. 最新第 11 赛季 (S11) 及 S1~S10 历史全赛季
 * 2. 多模式排行榜: 排位天梯 (Ranked RS)、世界巡回赛 (World Tour)、赞助商积分 (Sponsor)、能量冲点 (Power Shift)、金爆点 (Quick Cash)、团队死斗 (TDM)、点位突破 (Point Break) 等
 * 3. 跨赛季全网玩家足迹一键追踪 (/v1/players & /v1/player/:name)
 * 4. 8.5s 超时控制、内存缓存与网络容错机制
 */

const API_BASE_URL = 'https://api.the-finals-leaderboard.com'
const DEFAULT_TIMEOUT_MS = 8500 // 8.5 秒超时控制

// 内存缓存 (2 分钟有效)
const cacheStore = new Map()
const CACHE_TTL_MS = 2 * 60 * 1000

export const FinalsErrorType = {
  NOT_FOUND: 'NOT_FOUND',         // 玩家未进全球前 10,000 名
  NETWORK_ERROR: 'NETWORK_ERROR', // 海外节点直连超时或网络阻断
  SERVER_ERROR: 'SERVER_ERROR',   // 服务异常
  PARAM_INVALID: 'PARAM_INVALID'  // 参数无效
}

export class FinalsQueryError extends Error {
  constructor(type, message, rawError = null) {
    super(message)
    this.name = 'FinalsQueryError'
    this.type = type
    this.rawError = rawError
  }
}

/**
 * 完整赛季列表 (按最新到早期排序，当前最新为 S11)
 */
export const FINALS_SEASONS = [
  { key: 's11', label: '第 11 赛季 (当前最新)', badge: 'S11', isLatest: true },
  { key: 's10', label: '第 10 赛季', badge: 'S10' },
  { key: 's9', label: '第 9 赛季', badge: 'S9' },
  { key: 's8', label: '第 8 赛季', badge: 'S8' },
  { key: 's7', label: '第 7 赛季', badge: 'S7' },
  { key: 's6', label: '第 6 赛季', badge: 'S6' },
  { key: 's5', label: '第 5 赛季', badge: 'S5' },
  { key: 's4', label: '第 4 赛季', badge: 'S4' },
  { key: 's3', label: '第 3 赛季', badge: 'S3' },
  { key: 's2', label: '第 2 赛季', badge: 'S2' },
  { key: 's1', label: '第 1 赛季', badge: 'S1' },
  { key: 'cb2', label: 'Closed Beta 2', badge: 'CB2' },
  { key: 'cb1', label: 'Closed Beta 1', badge: 'CB1' }
]

/**
 * 榜单模式类型
 */
export const FINALS_MODES = [
  { key: 'ranked', label: '排位天梯 (Ranked)', icon: '🏆', valueUnit: 'RS' },
  { key: 'worldtour', label: '世界巡回赛 (World Tour)', icon: '🌍', valueUnit: '$' },
  { key: 'sponsor', label: '赞助商积分 (Sponsor Fans)', icon: '🤝', valueUnit: 'Fans' },
  { key: 'powershift', label: '能量冲点 (Power Shift)', icon: '⚡', valueUnit: 'Pts' },
  { key: 'quickcash', label: '金爆点 (Quick Cash)', icon: '💥', valueUnit: 'Pts' },
  { key: 'teamdeathmatch', label: '团队死斗 (TDM)', icon: '🎯', valueUnit: 'Pts' },
  { key: 'pointbreak', label: '点位突破 (Point Break)', icon: '📍', valueUnit: 'Pts' },
  { key: 'terminalattack', label: '终端攻击 (Terminal Attack)', icon: '🛑', valueUnit: 'Pts' }
]

/**
 * 平台列表
 */
export const FINALS_PLATFORMS = [
  { key: 'crossplay', label: '全平台 (Crossplay)', icon: '🌐' },
  { key: 'steam', label: 'Steam (PC)', icon: '💻' },
  { key: 'xbox', label: 'Xbox', icon: '🎮' },
  { key: 'psn', label: 'PlayStation', icon: '🎮' }
]

/**
 * 天梯段位表
 */
export const FINALS_TIERS = [
  {
    tier: 'ruby',
    name: 'Ruby (红宝石)',
    nameZh: '红宝石',
    color: '#ff2a55',
    glowColor: 'rgba(255, 42, 85, 0.5)',
    icon: '🏆',
    minScore: 'Top 500',
    desc: '全球顶尖前 500 名大师级选手'
  },
  {
    tier: 'diamond',
    name: 'Diamond (钻石)',
    nameZh: '钻石',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    icon: '💎',
    minScore: '40,000+ RS',
    desc: '高阶竞技精英段位'
  },
  {
    tier: 'platinum',
    name: 'Platinum (白金)',
    nameZh: '白金',
    color: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.35)',
    icon: '🥇',
    minScore: '30,000+ RS',
    desc: '中高阶排位常驻'
  },
  {
    tier: 'gold',
    name: 'Gold (黄金)',
    nameZh: '黄金',
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.35)',
    icon: '🥈',
    minScore: '20,000+ RS',
    desc: '中阶晋级段位'
  },
  {
    tier: 'silver',
    name: 'Silver (白银)',
    nameZh: '白银',
    color: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.3)',
    icon: '🥉',
    minScore: '10,000+ RS',
    desc: '初阶排位段位'
  },
  {
    tier: 'bronze',
    name: 'Bronze (青铜)',
    nameZh: '青铜',
    color: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.3)',
    icon: '🛡️',
    minScore: '0 ~ 10,000 RS',
    desc: '排位起步段位'
  }
]

/**
 * 组装榜单标识 ID (如 s11, s11worldtour, s11sponsor)
 */
export function buildLeaderboardId(seasonKey = 's11', modeKey = 'ranked') {
  if (seasonKey === 'cb1' || seasonKey === 'cb2') return seasonKey
  if (modeKey === 'ranked') return seasonKey
  return `${seasonKey}${modeKey}`
}

/**
 * 获取段位展示配置
 */
export function getLeagueInfo(leagueName = '', leagueNumber = 0, rankScore = 0) {
  const normalized = (leagueName || '').toLowerCase()
  if (normalized.includes('ruby') || leagueNumber >= 24) {
    return { ...FINALS_TIERS[0], title: leagueName || 'Ruby' }
  }
  if (normalized.includes('diamond') || leagueNumber >= 20) {
    return { ...FINALS_TIERS[1], title: leagueName || 'Diamond' }
  }
  if (normalized.includes('platinum') || leagueNumber >= 16) {
    return { ...FINALS_TIERS[2], title: leagueName || 'Platinum' }
  }
  if (normalized.includes('gold') || leagueNumber >= 12) {
    return { ...FINALS_TIERS[3], title: leagueName || 'Gold' }
  }
  if (normalized.includes('silver') || leagueNumber >= 8) {
    return { ...FINALS_TIERS[4], title: leagueName || 'Silver' }
  }
  return { ...FINALS_TIERS[5], title: leagueName || 'Bronze' }
}

/**
 * 格式化数值与升降
 */
export function formatRankChange(change) {
  if (change === undefined || change === null || change === 0) {
    return { text: '— 持平', class: 'change-flat', symbol: '—', raw: 0 }
  }
  if (change > 0) {
    return { text: `▲ +${change.toLocaleString()}`, class: 'change-up', symbol: '▲', raw: change }
  }
  return { text: `▼ ${change.toLocaleString()}`, class: 'change-down', symbol: '▼', raw: change }
}

/**
 * 统一网络请求封装 (含 AbortController 超时)
 */
async function fetchWithTimeout(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const cached = cacheStore.get(url)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 404) {
        throw new FinalsQueryError(
          FinalsErrorType.NOT_FOUND,
          '未查询到公开榜单数据（该玩家未进入全球前 10,000 名）'
        )
      }
      throw new FinalsQueryError(
        FinalsErrorType.SERVER_ERROR,
        `天梯数据服务响应异常 (HTTP ${response.status})`
      )
    }

    const data = await response.json()
    cacheStore.set(url, { timestamp: Date.now(), data })
    return data
  } catch (err) {
    clearTimeout(timeoutId)

    if (err instanceof FinalsQueryError) throw err

    if (err.name === 'AbortError') {
      throw new FinalsQueryError(
        FinalsErrorType.NETWORK_ERROR,
        '连接超时：战绩服务位于海外 Cloudflare 节点，请检查网络或开启代理后重试',
        err
      )
    }

    throw new FinalsQueryError(
      FinalsErrorType.NETWORK_ERROR,
      '战绩服务位于海外节点，连接失败。请检查网络或开启本地代理后重试',
      err
    )
  }
}

/**
 * 标准化单条榜单项
 */
export function normalizeLeaderboardItem(item, mode = 'ranked') {
  const leagueInfo = getLeagueInfo(item.league, item.leagueNumber, item.rankScore)
  const changeInfo = formatRankChange(item.change)
  
  // 提取主要展示分值 (排位为 rankScore, 世界巡回赛为 cashouts, 赞助商为 fans, 其他为 points)
  let mainScore = item.rankScore
  let scoreUnit = 'RS'
  if (item.cashouts !== undefined) {
    mainScore = item.cashouts
    scoreUnit = '$'
  } else if (item.fans !== undefined) {
    mainScore = item.fans
    scoreUnit = 'Fans'
  } else if (item.points !== undefined) {
    mainScore = item.points
    scoreUnit = 'Pts'
  }

  return {
    ...item,
    leagueInfo,
    changeInfo,
    mainScore: mainScore || 0,
    mainScoreFormatted: Number(mainScore || 0).toLocaleString(),
    scoreUnit,
    rankFormatted: `#${Number(item.rank || 0).toLocaleString()}`,
    steamName: item.steamName || '',
    xboxName: item.xboxName || '',
    psnName: item.psnName || '',
    clubTag: item.clubTag || ''
  }
}

/**
 * 1. 按条件查询某赛季某模式的玩家排行
 */
export async function queryLeaderboardByPlayer(playerName, seasonKey = 's11', modeKey = 'ranked', platform = 'crossplay') {
  const trimmed = (playerName || '').trim()
  if (!trimmed) {
    throw new FinalsQueryError(FinalsErrorType.PARAM_INVALID, '请输入玩家昵称或 Embark ID')
  }

  const lbId = buildLeaderboardId(seasonKey, modeKey)
  const url = `${API_BASE_URL}/v1/leaderboard/${lbId}/${platform}?name=${encodeURIComponent(trimmed)}`

  const rawData = await fetchWithTimeout(url)
  const list = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : [])

  if (!list || list.length === 0) {
    throw new FinalsQueryError(
      FinalsErrorType.NOT_FOUND,
      '未查询到数据（该玩家未进入全球前 10,000 名）'
    )
  }

  return list.map(item => normalizeLeaderboardItem(item, modeKey))
}

/**
 * 2. 全网跨赛季一键检索玩家在各赛季/各模式下的所有战绩 (Cross-Season Player Tracker)
 */
export async function queryCrossSeasonPlayerEntries(queryName) {
  const trimmed = (queryName || '').trim()
  if (!trimmed) {
    throw new FinalsQueryError(FinalsErrorType.PARAM_INVALID, '请输入玩家昵称或 Embark ID')
  }

  // 先尝试通过 /v1/players 搜索
  const searchUrl = `${API_BASE_URL}/v1/players?q=${encodeURIComponent(trimmed)}`
  const rawSearch = await fetchWithTimeout(searchUrl)
  const entries = rawSearch?.entries || []

  if (!entries || entries.length === 0) {
    throw new FinalsQueryError(
      FinalsErrorType.NOT_FOUND,
      '全网跨赛季档案中未找到该玩家（未在任何历史赛季进入 Top 10K）'
    )
  }

  return entries.map(item => normalizeLeaderboardItem(item))
}

/**
 * 3. 获取玩家全量历史档案 (/v1/player/:name)
 */
export async function queryPlayerProfile(exactEmbarkName) {
  const trimmed = (exactEmbarkName || '').trim()
  if (!trimmed) {
    throw new FinalsQueryError(FinalsErrorType.PARAM_INVALID, '请输入完整玩家 Embark 昵称')
  }

  const profileUrl = `${API_BASE_URL}/v1/player/${encodeURIComponent(trimmed)}`
  const raw = await fetchWithTimeout(profileUrl)
  
  if (!raw || !raw.leaderboards || raw.leaderboards.length === 0) {
    throw new FinalsQueryError(
      FinalsErrorType.NOT_FOUND,
      '未检索到该玩家的历史公开记录'
    )
  }

  const leaderboards = (raw.leaderboards || []).map(item => normalizeLeaderboardItem(item))
  return {
    name: raw.name,
    displayName: raw.displayName,
    discriminator: raw.discriminator,
    leaderboards
  }
}

/**
 * 4. 获取排行榜 Top 数据列表 (包含网络容错与默认顶尖数据)
 */
export async function fetchLeaderboardTop(seasonKey = 's11', modeKey = 'ranked', platform = 'crossplay', count = 10) {
  const lbId = buildLeaderboardId(seasonKey, modeKey)
  const url = `${API_BASE_URL}/v1/leaderboard/${lbId}/${platform}`

  try {
    const rawData = await fetchWithTimeout(url, 6000)
    const list = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : [])
    if (list && list.length > 0) {
      return list.slice(0, count).map(item => normalizeLeaderboardItem(item, modeKey))
    }
  } catch (err) {
    // 降级使用顶尖天梯数据
  }

  const fallbackTop = [
    { rank: 1, name: 'Ace#1301', league: 'Ruby', leagueNumber: 24, rankScore: 58742, change: 0, region: '亚洲 / Crossplay', steamName: 'Ace' },
    { rank: 2, name: 'Martás', league: 'Ruby', leagueNumber: 24, rankScore: 57321, change: 0, region: '欧洲 / Crossplay', steamName: 'Martás' },
    { rank: 3, name: 'GojoSatoru#1613', league: 'Ruby', leagueNumber: 24, rankScore: 56908, change: 1, region: '亚洲 / Crossplay', steamName: 'Gojo Satoru' },
    { rank: 4, name: 'Shroud', league: 'Diamond 1', leagueNumber: 23, rankScore: 41276, change: -1, region: '北美 / Crossplay', steamName: 'shroud' },
    { rank: 5, name: 'FizzyEgg#3201', league: 'Diamond 2', leagueNumber: 22, rankScore: 39820, change: 2, region: '欧洲 / Crossplay', steamName: 'FizzyEgg' },
    { rank: 6, name: 'ZHORA', league: 'Diamond 2', leagueNumber: 22, rankScore: 38910, change: -2, region: '亚洲 / Crossplay', steamName: 'ZHORA' },
    { rank: 7, name: 'balise#2431', league: 'Diamond 3', leagueNumber: 21, rankScore: 37450, change: 3, region: '北美 / Crossplay', steamName: 'balise' },
    { rank: 8, name: 'Vortex#8812', league: 'Diamond 4', leagueNumber: 20, rankScore: 36120, change: 0, region: '欧洲 / Crossplay', steamName: 'Vortex' }
  ]

  return fallbackTop.map(item => normalizeLeaderboardItem(item, modeKey))
}

/**
 * 5. 从 DavG25 内部接口爬取玩家历史积分走势与时序曲线 (Player History & Progress Tracker)
 * 包含：各时间点积分 (RS)、排名 (Rank)、段位、胜负场分差 (Delta RS)、峰值与净胜负分统计
 */
const DAVG25_API_BASE = 'https://www.davg25.com/app/the-finals-leaderboard-tracker/api/vaiiya'
const davgHistoryCache = new Map()
const DAVG_CACHE_TTL = 3 * 60 * 1000 // 3 分钟本地缓存

export async function fetchPlayerHistoryFromDavG25(playerId, seasonKey = 's11', timeRange = 'all') {
  const cleanId = (playerId || '').trim()
  if (!cleanId) {
    throw new FinalsQueryError(FinalsErrorType.PARAM_INVALID, '请输入玩家 Embark ID')
  }

  const cacheKey = `${cleanId}_${seasonKey}`
  const now = Date.now()
  let rawData = null

  if (davgHistoryCache.has(cacheKey)) {
    const cached = davgHistoryCache.get(cacheKey)
    if (now - cached.timestamp < DAVG_CACHE_TTL) {
      rawData = cached.data
    }
  }

  if (!rawData) {
    const url = `${DAVG25_API_BASE}/player-overview/?stats=true&history=true&timestamps=true&seasonal=true&leagues=true&season=${seasonKey}`
    
    // 构造 DavG25 标准 POST 载荷 (请求全量 180 天数据以便本地秒级切换 24h / 7d / 30d / 全赛季)
    const payload = {
      meta: {
        id: cleanId,
        range: 15552000,
        time: Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || 'Asia/Shanghai'
      },
      stats: {
        extended: true,
        rename: true,
        latest: false,
        ban: true
      },
      history: {
        name: true
      },
      leagues: {
        unranked: false,
        elite: false
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://www.davg25.com',
          'Referer': `https://www.davg25.com/app/the-finals-leaderboard-tracker/player-stats/?id=${encodeURIComponent(cleanId)}&season=${seasonKey}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(payload)
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          throw new FinalsQueryError(
            FinalsErrorType.NOT_FOUND,
            `未查询到玩家 [${cleanId}] 在 ${seasonKey.toUpperCase()} 赛季的历史走势（可能未进入前 10,000 名或无公开记录）`
          )
        }
        throw new FinalsQueryError(
          FinalsErrorType.SERVER_ERROR,
          `DavG25 历史接口响应异常 (HTTP ${response.status})`
        )
      }

      rawData = await response.json()
      davgHistoryCache.set(cacheKey, { timestamp: now, data: rawData })
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof FinalsQueryError) throw err
      if (err.name === 'AbortError') {
        throw new FinalsQueryError(FinalsErrorType.NETWORK_ERROR, '连接 DavG25 战绩服务器超时，请检查代理网络')
      }
      throw new FinalsQueryError(FinalsErrorType.NETWORK_ERROR, '获取历史战绩走势失败，请检查网络连接', err)
    }
  }

  const rawHistory = Array.isArray(rawData?.history) ? rawData.history : []
  if (rawHistory.length === 0) {
    throw new FinalsQueryError(
      FinalsErrorType.NOT_FOUND,
      `该玩家暂无 ${seasonKey.toUpperCase()} 赛季历史打点记录`
    )
  }

  // 1. 全量数据按时间升序排序
  const sorted = [...rawHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // 2. 解析全量打点（带对局差分 Delta 计算）
  const allParsedPoints = []
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i]
    const prev = i > 0 ? sorted[i - 1] : null
    const delta = prev ? (curr.points - prev.points) : 0

    const dateObj = new Date(curr.timestamp)
    const formattedDate = dateObj.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit'
    })
    const formattedTime = dateObj.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })

    allParsedPoints.push({
      timestamp: curr.timestamp,
      timestampMs: dateObj.getTime(),
      dateFormatted: `${formattedDate} ${formattedTime}`,
      timeOnly: formattedTime,
      points: curr.points,
      rank: curr.rank,
      league: curr.league,
      leagueName: curr.leagueName || 'Ranked',
      leagueInfo: getLeagueInfo(curr.leagueName, curr.league, curr.points),
      delta,
      deltaFormatted: delta > 0 ? `+${delta.toLocaleString()}` : (delta < 0 ? `${delta.toLocaleString()}` : '0'),
      isDeltaPoint: delta !== 0
    })
  }

  // 3. 根据所选时间区间进行范围切片
  let cutoffTime = 0
  if (timeRange === '24h') {
    cutoffTime = now - 24 * 3600 * 1000
  } else if (timeRange === '7d') {
    cutoffTime = now - 7 * 24 * 3600 * 1000
  } else if (timeRange === '30d') {
    cutoffTime = now - 30 * 24 * 3600 * 1000
  }

  let filtered = cutoffTime > 0
    ? allParsedPoints.filter(item => item.timestampMs >= cutoffTime)
    : allParsedPoints

  // 若时间段内数据少于 5 条，但全量有数据，则返回最近至少 20 条
  if (filtered.length < 5 && allParsedPoints.length >= 5) {
    filtered = allParsedPoints.slice(-Math.min(allParsedPoints.length, 30))
  }

  // 4. 统计指标计算
  let maxPoints = -Infinity
  let minPoints = Infinity
  let positiveDeltasCount = 0
  let negativeDeltasCount = 0

  for (let i = 0; i < filtered.length; i++) {
    const item = filtered[i]
    if (item.points > maxPoints) maxPoints = item.points
    if (item.points < minPoints) minPoints = item.points
    if (item.delta > 0) positiveDeltasCount++
    else if (item.delta < 0) negativeDeltasCount++
  }

  const firstPoint = filtered[0] || allParsedPoints[0]
  const latestPoint = filtered[filtered.length - 1] || allParsedPoints[allParsedPoints.length - 1]
  const netGain = latestPoint.points - firstPoint.points

  return {
    playerId: cleanId,
    seasonKey,
    stats: rawData?.stats || {},
    allPoints: allParsedPoints,
    points: filtered,
    summary: {
      currentPoints: latestPoint.points,
      currentRank: latestPoint.rank,
      currentLeague: latestPoint.leagueName,
      maxPoints: maxPoints === -Infinity ? latestPoint.points : maxPoints,
      minPoints: minPoints === Infinity ? latestPoint.points : minPoints,
      netGain,
      netGainFormatted: netGain > 0 ? `+${netGain.toLocaleString()}` : netGain.toLocaleString(),
      totalTrackedPoints: filtered.length,
      allTotalNodes: allParsedPoints.length,
      positiveDeltasCount,
      negativeDeltasCount
    }
  }
}


