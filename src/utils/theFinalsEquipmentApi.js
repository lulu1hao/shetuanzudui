/**
 * THE FINALS 装备百科与配装中心 API 管理层
 * 数据源：THE FINALS Wiki (https://thefinals.wiki)
 * 支持在线 MediaWiki API 差量/全量同步、本地 LocalStorage 持久化与离线预置缓存
 */

import baseEquipmentData from '../data/finalsEquipmentData.json'

const STORAGE_KEY_DATA = 'finals_equipment_data_v2'
const STORAGE_KEY_LAST_SYNC = 'finals_equipment_last_sync_time'
const STORAGE_KEY_CUSTOM_BUILDS = 'finals_custom_loadouts_v2'
const STORAGE_KEY_COMPARE_WEAPONS = 'finals_compare_weapons_v2'

// 热门预设竞技配装 (Competitive Meta Builds)
export const PRESET_LOADOUTS = [
  {
    id: 'light_ghost_assassin',
    build: 'Light',
    title: 'S11 幽灵刺客流',
    author: '天梯 Top 100 标配',
    desc: '极致隐身机动，配合消音手枪/战术冲锋枪实施精准背刺与收割。',
    specialization: 'cloaking_device',
    weapon: 'xp_54',
    gadgets: ['vanishing_bomb', 'glitch_grenade', 'gateway'],
    reserve: ['thermal_bore', 'sonar_grenade', 'stun_gun', 'dagger'],
    synergy: { mobility: 98, firepower: 88, support: 65, defense: 30 }
  },
  {
    id: 'light_evasive_swordsman',
    build: 'Light',
    title: '疾风瞬影长剑流',
    author: '近战身法大师',
    desc: '三段闪烁冲刺结合长剑突刺蓄力斩杀，在枪林弹雨中自由穿梭。',
    specialization: 'evasive_dash',
    weapon: 'sword',
    gadgets: ['vanishing_bomb', 'breach_charge', 'gateway'],
    reserve: ['throwing_knives', 'sonar_grenade', 'thermal_vision', 'nullifier'],
    synergy: { mobility: 100, firepower: 92, support: 50, defense: 40 }
  },
  {
    id: 'medium_battlefield_medic',
    build: 'Medium',
    title: '战地医疗中坚流',
    author: '锦标赛排位第一梯队',
    desc: '治疗光束配合除颤仪构筑队伍不死生命线，AKM/FCAR稳固全距离火力中枢。',
    specialization: 'healing_beam',
    weapon: 'akm',
    gadgets: ['defibrillator', 'jump_pad', 'aps_turret'],
    reserve: ['zipline', 'explosive_mine', 'glitch_trap', 'fcar'],
    synergy: { mobility: 78, firepower: 85, support: 100, defense: 75 }
  },
  {
    id: 'medium_dematerializer_flank',
    build: 'Medium',
    title: '空间重构穿墙奇袭流',
    author: '战术破点专家',
    desc: '利用物质解构仪无视墙体物理阻隔，瞬间自天花板或侧翼突袭抢包。',
    specialization: 'dematerializer',
    weapon: 'model_1887',
    gadgets: ['defibrillator', 'jump_pad', 'data_reshaper'],
    reserve: ['breach_drill', 'gas_mine', 'zipline', 'dual_blades'],
    synergy: { mobility: 88, firepower: 90, support: 80, defense: 60 }
  },
  {
    id: 'heavy_fortress_demolition',
    build: 'Heavy',
    title: '堡垒拆迁重装流',
    author: '提现守点核心',
    desc: '网格巨盾抵御海量弹幕，RPG与大锤瞬间抹平建筑物，为队伍创造绝对安全区。',
    specialization: 'mesh_shield',
    weapon: 'lewis_gun',
    gadgets: ['rpg_7', 'dome_shield', 'c4'],
    reserve: ['barricade', 'anti_gravity_cube', 'pyro_mine', 'sledgehammer'],
    synergy: { mobility: 45, firepower: 95, support: 82, defense: 100 }
  },
  {
    id: 'heavy_winch_titan',
    build: 'Heavy',
    title: '绞盘泰坦近身毁灭流',
    author: '开局先手控场',
    desc: '绞盘利爪强拉敌方关键选手，配合四转轮连喷或泰坦手炮一击必杀。',
    specialization: 'winch_claw',
    weapon: 'sa1216',
    gadgets: ['rpg_7', 'dome_shield', 'barricade'],
    reserve: ['flamethrower', 'lockbolt', 'explosive_mine', 'bfr_titan'],
    synergy: { mobility: 55, firepower: 100, support: 70, defense: 90 }
  }
]

// 内存单例数据
let memoryEquipmentData = null

/**
 * 获取当前所有装备数据（自动读取本地缓存或离线包）
 */
export function getEquipmentData() {
  if (memoryEquipmentData) return memoryEquipmentData

  try {
    const cached = localStorage.getItem(STORAGE_KEY_DATA)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        memoryEquipmentData = parsed
        return memoryEquipmentData
      }
    }
  } catch (e) {
    console.warn('[FinalsEquipment] LocalStorage read failed, fallback to bundle data', e)
  }

  memoryEquipmentData = JSON.parse(JSON.stringify(baseEquipmentData))
  return memoryEquipmentData
}

/**
 * 获取上次同步时间
 */
export function getLastSyncTime() {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC) || baseEquipmentData.lastUpdated
  } catch {
    return baseEquipmentData.lastUpdated
  }
}

/**
 * 格式化时间
 */
export function formatSyncTime(isoStr) {
  if (!isoStr) return '刚刚'
  try {
    const d = new Date(isoStr)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${mins}`
  } catch {
    return isoStr
  }
}

/**
 * 联网从 THE FINALS Wiki API 差量同步最新装备数据
 */
export async function syncEquipmentFromWiki() {
  const current = getEquipmentData()
  const items = current.items || []

  const titleChunks = []
  const titleList = items.map(it => it.name)
  for (let i = 0; i < titleList.length; i += 30) {
    titleChunks.push(titleList.slice(i, i + 30))
  }

  let updatedCount = 0
  for (const chunk of titleChunks) {
    try {
      const titleStr = chunk.map(encodeURIComponent).join('|')
      const url = `https://www.thefinals.wiki/w/api.php?action=query&titles=${titleStr}&prop=revisions&rvprop=content&format=json&origin=*`
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!res.ok) continue
      const data = await res.json()
      const pages = data?.query?.pages || {}

      for (const pid in pages) {
        const p = pages[pid]
        if (!p || !p.title) continue
        const wikitext = p.revisions?.[0]?.['*']
        if (!wikitext) continue

        const item = items.find(it => it.name.toLowerCase() === p.title.toLowerCase())
        if (item && item.category !== 'weapons') {
          const cdMatch = wikitext.match(/\|\s*cooldown\s*=\s*([^\n|]+)/i)
          if (cdMatch && item.stats) item.stats.cooldown = cdMatch[1].trim()
          updatedCount++
        }
      }
    } catch (err) {
      console.warn('[FinalsEquipment] Sync chunk error, continuing...', err)
    }
  }

  const nowIso = new Date().toISOString()
  current.lastUpdated = nowIso
  memoryEquipmentData = current

  try {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(current))
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, nowIso)
  } catch (e) {
    console.warn('[FinalsEquipment] Save to LocalStorage failed', e)
  }

  return {
    success: true,
    itemCount: current.items.length,
    updatedCount,
    lastUpdated: nowIso
  }
}

/**
 * 多维度筛选与搜索装备
 * @param {Object} options
 * @param {string} options.build - 'all' | 'Light' | 'Medium' | 'Heavy'
 * @param {string} options.category - 'all' | 'weapons' | 'specializations' | 'gadgets'
 * @param {string} options.search - 关键词 (中英文均可)
 * @param {string} options.sortBy - 'default' | 'damage' | 'dps' | 'name'
 */
export function filterEquipment({ build = 'all', category = 'all', search = '', sortBy = 'default' } = {}) {
  const data = getEquipmentData()
  let list = (data.items || []).slice()

  // 1. 体型筛选
  if (build && build !== 'all') {
    list = list.filter(item => {
      if (item.build === 'All') return true
      if (item.build === 'Medium & Heavy' && (build === 'Medium' || build === 'Heavy')) return true
      return item.build.toLowerCase() === build.toLowerCase()
    })
  }

  // 2. 装备类型筛选
  if (category && category !== 'all') {
    list = list.filter(item => item.category === category)
  }

  // 3. 关键词检索
  if (search && search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter(item => {
      const matchName = (item.name || '').toLowerCase().includes(q)
      const matchZh = (item.nameZh || '').toLowerCase().includes(q)
      const matchRole = (item.role || '').toLowerCase().includes(q)
      const matchDesc = (item.description || '').toLowerCase().includes(q)
      const matchWType = (item.wtype || '').toLowerCase().includes(q)
      return matchName || matchZh || matchRole || matchDesc || matchWType
    })
  }

  // 4. 排序
  if (sortBy === 'damage') {
    list.sort((a, b) => (parseFloat(b.stats?.damage) || 0) - (parseFloat(a.stats?.damage) || 0))
  } else if (sortBy === 'dps') {
    list.sort((a, b) => (parseFloat(b.stats?.dps) || 0) - (parseFloat(a.stats?.dps) || 0))
  } else if (sortBy === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }

  return list
}

/**
 * 根据 ID 获取装备详情
 */
export function getEquipmentById(id) {
  if (!id) return null
  const data = getEquipmentData()
  return (data.items || []).find(it => it.id === id || it.name.toLowerCase() === id.toLowerCase()) || null
}

/**
 * 获取自定义保存的配装列表
 */
export function getCustomLoadouts() {
  try {
    const str = localStorage.getItem(STORAGE_KEY_CUSTOM_BUILDS)
    if (str) {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.warn('[FinalsEquipment] Read custom loadouts failed', e)
  }
  return []
}

/**
 * 保存自定义配装
 */
export function saveCustomLoadout(loadout) {
  const list = getCustomLoadouts()
  const existingIdx = list.findIndex(item => item.id === loadout.id)
  const entry = {
    ...loadout,
    id: loadout.id || `custom_${Date.now()}`,
    updatedAt: new Date().toISOString()
  }

  if (existingIdx >= 0) {
    list[existingIdx] = entry
  } else {
    list.unshift(entry)
  }

  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_BUILDS, JSON.stringify(list))
  } catch (e) {
    console.warn('[FinalsEquipment] Save custom loadout failed', e)
  }
  return entry
}

/**
 * 删除自定义配装
 */
export function deleteCustomLoadout(id) {
  let list = getCustomLoadouts()
  list = list.filter(item => item.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_BUILDS, JSON.stringify(list))
  } catch (e) {
    console.warn('[FinalsEquipment] Delete custom loadout failed', e)
  }
  return list
}

/**
 * 导出配装分享码 (Base64 JSON)
 */
export function exportLoadoutCode(loadout) {
  try {
    const compact = {
      b: loadout.build,
      t: loadout.title,
      s: loadout.specialization,
      w: loadout.weapon,
      g: loadout.gadgets,
      r: loadout.reserve
    }
    return 'TF-' + btoa(unescape(encodeURIComponent(JSON.stringify(compact))))
  } catch {
    return ''
  }
}

/**
 * 解析导入配装分享码
 */
export function importLoadoutCode(code) {
  try {
    const clean = code.trim().replace(/^TF-/, '')
    const jsonStr = decodeURIComponent(escape(atob(clean)))
    const parsed = JSON.parse(jsonStr)
    return {
      id: `imported_${Date.now()}`,
      build: parsed.b || 'Medium',
      title: parsed.t || '导入配装',
      specialization: parsed.s || '',
      weapon: parsed.w || '',
      gadgets: parsed.g || [],
      reserve: parsed.r || []
    }
  } catch {
    return null
  }
}

/**
 * 武器对比相关函数 (最多支持3把)
 */
export function getSavedCompareWeaponIds() {
  try {
    const str = localStorage.getItem(STORAGE_KEY_COMPARE_WEAPONS)
    if (str) {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) return parsed.slice(0, 3)
    }
  } catch {
    // fallback
  }
  return ['akm', 'fcar', 'xp_54']
}

export function saveCompareWeaponIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY_COMPARE_WEAPONS, JSON.stringify(ids.slice(0, 3)))
  } catch {
    // fallback
  }
}
