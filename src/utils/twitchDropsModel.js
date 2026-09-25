export const GAME_OPTIONS = [
  { key: 'the-finals', label: 'THE FINALS', slug: 'the-finals', channels: ['Ottr_', 'THEFINALS_Official', 'LyndonFPS'] },
  { key: 'apex', label: 'Apex Legends', slug: 'apex-legends', channels: ['Aceu', 'Shroud'] },
  { key: 'rust', label: 'Rust', slug: 'rust', channels: [] },
  { key: 'valorant', label: 'VALORANT', slug: 'valorant', channels: [] }
].map(game => ({ ...game, url: `https://www.twitch.tv/directory/category/${game.slug}?tl=DropsEnabled` }))

export function validateProxyPort(value) {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('代理端口必须是 1 到 65535 之间的整数')
  return port
}

export function normalizeChannel(value) {
  let channel = String(value).trim()
  if (!channel) return ''
  if (/^https?:\/\//i.test(channel)) {
    let url
    try { url = new URL(channel) } catch { throw new Error('Twitch 频道链接无效') }
    if (url.protocol !== 'https:' || !['twitch.tv', 'www.twitch.tv'].includes(url.hostname) || url.username || url.password || url.port) {
      throw new Error('请输入 Twitch 官方 HTTPS 频道链接')
    }
    channel = url.pathname.replace(/^\/|\/$/g, '')
  }
  const reserved = ['directory', 'drops', 'login', 'signup', 'settings', 'videos', 'search', 'subscriptions', 'downloads', 'jobs', 'p']
  if (!/^[a-zA-Z0-9_]{1,25}$/.test(channel) || reserved.includes(channel.toLowerCase())) {
    throw new Error('频道 ID 仅支持 1–25 位英文字母、数字或下划线，不能是 Twitch 功能页')
  }
  return channel
}

export function acceptsMinerEvent(state, accountId, sessionId) {
  return Boolean(state && ['stream', 'control'].includes(state.role) && state.accountId === accountId && state.sessionId === sessionId)
}

export function normalizeRewards(rewards) {
  if (!Array.isArray(rewards)) return []
  return rewards.slice(0, 100).filter(item => item && typeof item.id === 'string' && typeof item.name === 'string').map(item => ({
    id: item.id, name: item.name.slice(0, 160),
    progress: typeof item.progress === 'number' && Number.isFinite(item.progress) ? Math.max(0, Math.min(100, item.progress)) : null,
    claimed: item.claimed === true, canClaim: item.canClaim === true,
    type: 'Twitch 官方库存', rarity: 'rare', icon: 'sticker',
    desc: '进度来自 Twitch 掉宝库存页面；领取结果以官方页面为准。'
  }))
}

export function normalizeAccounts(accounts) {
  if (!Array.isArray(accounts)) return []
  return accounts.map(a => ({
    id: a.id,
    name: a.name || '未命名卡槽',
    twitchUsername: a.twitchUsername || null,
    lastLoginAt: a.lastLoginAt || null,
  }))
}

export function getAccountDisplayLabel(account) {
  if (!account) return '未选择账户'
  if (account.twitchUsername) {
    return `${account.name} (@${account.twitchUsername})`
  }
  return account.name
}

export function matchGameCampaign(game, campaigns = [], rewards = [], directoryDrops = null) {
  if (!game) return { active: false, status: 'standby', badgeText: '未选择', title: '未选择游戏', detail: '', count: 0 }

  const gameKeywords = [
    game.key,
    game.slug,
    game.label.toLowerCase(),
    game.label.replace(/\s+/g, '').toLowerCase()
  ]
  if (game.key === 'the-finals') {
    gameKeywords.push('the finals', 'finals', 'thefinals')
  } else if (game.key === 'apex') {
    gameKeywords.push('apex', 'apex legends')
  }

  // 1. Check campaigns list
  const matched = (campaigns || []).filter(c => {
    const text = `${c.game || ''} ${c.name || ''} ${c.title || ''}`.toLowerCase()
    return gameKeywords.some(kw => text.includes(kw))
  })

  if (matched.length > 0) {
    const primary = matched[0]
    return {
      active: true,
      status: 'active',
      badgeText: '官方掉宝进行中',
      title: primary.name || primary.title || `${game.label} 掉宝活动`,
      detail: primary.endAt ? `活动进行中 · 截止时间以 Twitch 官方为准` : '官方掉宝进行中 · 奖励与进度将实时同步',
      count: matched.length
    }
  }

  // 2. Check rewards list in inventory for game keywords
  const matchedRewards = (rewards || []).filter(r => {
    const text = `${r.name || ''} ${r.desc || ''}`.toLowerCase()
    return gameKeywords.some(kw => text.includes(kw))
  })

  if (matchedRewards.length > 0) {
    return {
      active: true,
      status: 'active',
      badgeText: '官方掉宝进行中',
      title: `${game.label} 掉宝活动进行中`,
      detail: `当前库存中包含 ${matchedRewards.length} 个相关掉宝项目`,
      count: matchedRewards.length
    }
  }

  // 3. Check directory DropsEnabled tag from stream window
  if (directoryDrops === true) {
    return {
      active: true,
      status: 'active',
      badgeText: '掉宝分区活跃',
      title: `${game.label} 掉宝直播在线`,
      detail: '掉宝分区存在直播间，进入对应直播即可累积掉宝',
      count: 1
    }
  } else if (directoryDrops === false) {
    return {
      active: false,
      status: 'inactive',
      badgeText: '暂无在线掉宝频道',
      title: '该分区暂无掉宝直播',
      detail: '分区暂未找到 Drops 频道，此时挂机可能无法累积进度',
      count: 0
    }
  }

  // 4. Default / Standby
  return {
    active: false,
    status: 'standby',
    badgeText: '待官方同步',
    title: '等待 Twitch 活动同步',
    detail: '启动挂宝或连接官方库存后将自动检测活动状态',
    count: 0
  }
}

