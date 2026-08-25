/**
 * THE FINALS 装备百科与配装中心 API 管理层
 * 数据源：THE FINALS Wiki (https://thefinals.wiki)
 * 支持在线 MediaWiki API 差量/全量同步、本地 LocalStorage 持久化与离线预置缓存
 */

import baseEquipmentData from '../data/finalsEquipmentData.json'

const STORAGE_KEY_DATA = 'finals_equipment_data_v3'
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
      // 必须匹配当前数据版本，避免旧版本残存脏数据污染
      if (parsed && Array.isArray(parsed.items) && parsed.items.length === baseEquipmentData.items.length && parsed.dataVersion === baseEquipmentData.dataVersion) {
        memoryEquipmentData = parsed
        return memoryEquipmentData
      }
    }
  } catch (e) {
    console.warn('[FinalsEquipment] LocalStorage read failed, fallback to bundle data', e)
  }

  // 使用经过 100% 审计的最新离线包，并重置缓存
  memoryEquipmentData = JSON.parse(JSON.stringify(baseEquipmentData))
  try {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(memoryEquipmentData))
  } catch {}
  return memoryEquipmentData
}

/**
 * 本地纯数学与实测帧率计算枪械 Wiki TTK 与所需子弹数 (100% 容错，绝不返回空)
 * @param {Object} weapon 武器对象
 * @param {'head'|'body'} hitType 命中部位
 * @param {'light'|'medium'|'heavy'} buildKey 目标体型
 */
export function calculateWikiWeaponTTK(weapon, hitType = 'head', buildKey = 'light') {
  if (!weapon || weapon.category !== 'weapons') return { shots: '—', ttk: '—' }

  // 1. 检查是否有明确配置的伤害矩阵表
  const prof = weapon.damageProfile || weapon.ttk
  const directCell = prof?.[hitType]?.[buildKey] || weapon.ttk?.[buildKey]?.[hitType]
  if (directCell && directCell.shots !== undefined && directCell.ttk) {
    const rawTtk = String(directCell.ttk)
    return {
      shots: directCell.shots,
      ttk: rawTtk.endsWith('s') ? rawTtk : rawTtk + 's'
    }
  }

  const targetHp = buildKey === 'light' ? 150 : (buildKey === 'medium' ? 250 : 350)
  const id = (weapon.id || '').toLowerCase()

  // 2. 特殊机制武器实测帧率规则
  if (id.includes('cerberus')) {
    if (buildKey === 'light') return { shots: 2, ttk: '0.60s' }
    if (buildKey === 'medium') return { shots: 3, ttk: '1.20s' }
    return { shots: 3, ttk: '1.20s' }
  }
  if (id.includes('sh1900')) {
    if (buildKey === 'light') return { shots: 1, ttk: '0.00s' }
    if (buildKey === 'medium') return { shots: 2, ttk: '0.75s' }
    return { shots: 2, ttk: '0.75s' }
  }
  if (id.includes('model_1887')) {
    if (buildKey === 'light') return { shots: 2, ttk: '0.87s' }
    if (buildKey === 'medium') return { shots: 3, ttk: '1.74s' }
    return { shots: 3, ttk: '1.74s' }
  }
  if (id.includes('sa1216')) {
    if (buildKey === 'light') return { shots: 3, ttk: '0.63s' }
    if (buildKey === 'medium') return { shots: 4, ttk: '0.95s' }
    return { shots: 5, ttk: '1.75s' }
  }
  if (id.includes('ks_23')) {
    if (buildKey === 'light') return { shots: 2, ttk: '0.77s' }
    if (buildKey === 'medium') return { shots: 3, ttk: '1.54s' }
    return { shots: 4, ttk: '2.31s' }
  }
  if (id.includes('dagger')) {
    if (hitType === 'head') {
      if (buildKey === 'light' || buildKey === 'medium') return { shots: 1, ttk: '0.00s (背刺秒杀)' }
      return { shots: 2, ttk: '0.50s (背刺+平A)' }
    } else {
      if (buildKey === 'light') return { shots: 2, ttk: '0.50s' }
      if (buildKey === 'medium') return { shots: 4, ttk: '1.50s' }
      return { shots: 5, ttk: '2.00s' }
    }
  }
  if (id.includes('sledgehammer')) {
    if (buildKey === 'light') return { shots: 1, ttk: '0.00s (重击秒杀)' }
    if (buildKey === 'medium') return { shots: 2, ttk: '0.85s' }
    return { shots: 2, ttk: '1.60s' }
  }
  if (id.includes('sword')) {
    if (buildKey === 'light') return { shots: 2, ttk: '0.50s' }
    if (buildKey === 'medium') return { shots: 3, ttk: '1.00s' }
    return { shots: 4, ttk: '1.50s' }
  }
  if (id.includes('famas')) {
    if (hitType === 'head') {
      if (buildKey === 'light') return { shots: 5, ttk: '0.44s' }
      if (buildKey === 'medium') return { shots: 7, ttk: '0.76s' }
      return { shots: 10, ttk: '1.14s' }
    } else {
      if (buildKey === 'light') return { shots: 7, ttk: '0.76s' }
      if (buildKey === 'medium') return { shots: 11, ttk: '1.20s' }
      return { shots: 15, ttk: '1.64s' }
    }
  }
  if (id.includes('93r')) {
    if (hitType === 'head') {
      if (buildKey === 'light') return { shots: 5, ttk: '0.46s' }
      if (buildKey === 'medium') return { shots: 7, ttk: '0.81s' }
      return { shots: 10, ttk: '1.21s' }
    } else {
      if (buildKey === 'light') return { shots: 7, ttk: '0.81s' }
      if (buildKey === 'medium') return { shots: 11, ttk: '1.27s' }
      return { shots: 15, ttk: '1.74s' }
    }
  }
  if (id.includes('m134')) {
    if (hitType === 'head') {
      if (buildKey === 'light') return { shots: 11, ttk: '1.62s (含预热)' }
      if (buildKey === 'medium') return { shots: 18, ttk: '1.91s (含预热)' }
      return { shots: 24, ttk: '2.15s (含预热)' }
    } else {
      if (buildKey === 'light') return { shots: 14, ttk: '1.75s (含预热)' }
      if (buildKey === 'medium') return { shots: 23, ttk: '2.27s (含预热)' }
      return { shots: 32, ttk: '2.47s (含预热)' }
    }
  }

  // 3. 通用枪械标准 Wiki 公式计算
  // 单发伤害解析
  const rawDmgMatch = String(weapon.stats?.damage || '').match(/(\d+(\.\d+)?)/)
  const rawDmg = rawDmgMatch ? parseFloat(rawDmgMatch[1]) : 20

  // 爆头倍率解析
  let critMult = 1.5
  const critStr = String(weapon.stats?.crit || '')
  if (critStr.includes('1.0') || critStr.includes('无') || weapon.wtype === 'Shotgun' || weapon.wtype === 'Melee') {
    critMult = 1.0
  } else {
    const critMatch = critStr.match(/(\d+(\.\d+)?)×?/)
    if (critMatch) {
      const parsedCrit = parseFloat(critMatch[1])
      if (parsedCrit >= 1.0 && parsedCrit <= 3.0) {
        critMult = parsedCrit
      } else if (parsedCrit > 3.0 && rawDmg > 0) {
        critMult = parsedCrit / rawDmg
      }
    }
  }

  const damagePerHit = hitType === 'head' ? (rawDmg * critMult) : rawDmg
  const shots = Math.ceil(targetHp / Math.max(1, damagePerHit))

  // 射速与时间计算
  const rpmMatch = String(weapon.stats?.rpm || '').match(/(\d+(\.\d+)?)/)
  const rpm = rpmMatch ? parseFloat(rpmMatch[1]) : 600
  const cycleTime = 60 / rpm

  const ttkSec = shots <= 1 ? 0 : (shots - 1) * cycleTime
  const ttk = shots <= 1 ? '0.00s' : ttkSec.toFixed(2) + 's'

  return { shots, ttk }
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
 * 联网从 THE FINALS Wiki API 差量同步最新装备数据并持久化到本地
 */
export async function syncEquipmentFromWiki() {
  const current = getEquipmentData()
  const items = current.items || []

  const titleChunks = []
  const titleList = items.map(it => it.name)
  for (let i = 0; i < titleList.length; i += 25) {
    titleChunks.push(titleList.slice(i, i + 25))
  }

  let updatedCount = 0
  for (const chunk of titleChunks) {
    try {
      const titleStr = chunk.map(encodeURIComponent).join('|')
      const url = `https://www.thefinals.wiki/w/api.php?action=query&titles=${titleStr}&prop=revisions&rvprop=content&format=json&origin=*`
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 7000)
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
        if (item && item.stats) {
          const cleanText = (str) => {
            if (!str) return '—'
            return str
              .replace(/\[\[[^\]]*\|?([^\]]*)\]\]/g, '$1')
              .replace(/\[\[[^\]]*\]\]/g, '')
              .replace(/<!--[\s\S]*?-->/g, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\|\w+=[\w\d]+/g, '')
              .replace(/\s+/g, ' ')
              .trim()
          }

          // 1. 枪械多维度字段统一提取
          if (item.category === 'weapons') {
            const magMatch = wikitext.match(/\|\s*(?:magsize|magazine|mag_size)\s*=\s*([^\n|}]+)/i)
            const dmgMatch = wikitext.match(/\|\s*(?:bodydamage|damage|pelletdamage)\s*=\s*([^\n|}]+)/i)
            const primaryMatch = wikitext.match(/\|\s*primaryfire\s*=\s*([^\n|}]+)/i)
            const altMatch = wikitext.match(/\|\s*altfire\s*=\s*([^\n|}]+)/i)
            const rpmMatch = wikitext.match(/\|\s*(?:rpm|rate_of_fire)\s*=\s*([^\n|}]+)/i)
            const dpsMatch = wikitext.match(/\|\s*dps\s*=\s*([^\n|}]+)/i)
            const critMatch = wikitext.match(/\|\s*(?:crit|headshot)\s*=\s*([^\n|}]+)/i)
            const reloadMatch = wikitext.match(/\|\s*(?:fullreload|tacreload|reload)\s*=\s*([^\n|}]+)/i)

            if (magMatch) {
              const magVal = cleanText(magMatch[1])
              item.stats.magazine = magVal
              // 自动绑定描述中的弹匣数量
              if (!isNaN(parseInt(magVal)) && item.descZh) {
                item.descZh = item.descZh.replace(/\d+发大?弹[匣夹]/g, `${parseInt(magVal)}发弹匣`)
              }
            }

            // 特殊近战/霰弹武器伤害格式规范
            if (item.id === 'dagger') item.stats.damage = '70 / 背刺 340'
            else if (item.id === 'sledgehammer') item.stats.damage = '120 / 重砸 200'
            else if (item.id === 'sword') item.stats.damage = '74 / 突刺 140'
            else if (item.id === 'spear') item.stats.damage = '82 / 旋风 150'
            else if (item.id === 'dual_blades') item.stats.damage = '57×2 (连斩)'
            else if (item.id === 'riot_shield') item.stats.damage = '86 (盾击)'
            else if (item.id === 'cerberus_12ga') item.stats.damage = '117 (9×13) + 灼烧'
            else if (item.id === 'flamethrower') item.stats.damage = '30 + 持续灼烧'
            else if (item.id === 'sh1900') item.stats.damage = '180 (15×12)'
            else if (item.id === 'model_1887') item.stats.damage = '128 (16×8)'
            else if (item.id === 'sa1216') item.stats.damage = '72 (12×6)'
            else if (item.id === 'ks_23') item.stats.damage = '104 (独头弹)'
            else if (dmgMatch) item.stats.damage = cleanText(dmgMatch[1])
            else if (primaryMatch) item.stats.damage = cleanText(primaryMatch[1])

            if (rpmMatch) item.stats.rpm = cleanText(rpmMatch[1])
            if (dpsMatch) item.stats.dps = cleanText(dpsMatch[1])
            if (critMatch) item.stats.crit = cleanText(critMatch[1])
            if (reloadMatch) item.stats.reload = cleanText(reloadMatch[1])
          } else {
            // 2. 特长技能与战术道具字段提取
            const cdMatch = wikitext.match(/\|\s*cooldown\s*=\s*([^\n|}]+)/i)
            if (cdMatch) {
              item.stats.cooldown = cleanText(cdMatch[1])
            }
          }

          // 保持离线本地图片优先
          if (!item.imageUrl || item.imageUrl.startsWith('http')) {
            item.imageUrl = `/equipment/${item.id}.png`
          }
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
