// Only the current infobox and Damage Profile are authoritative; never read patch history.
import { parseWeaponMechanics } from './weaponWikiMechanics.js'
export const WIKI_PARSER_VERSION = 2
export const EQUIPMENT_STAT_LABELS = {
  damage: '基础伤害 / 主攻击', altDamage: '副攻击伤害', crit: '爆头伤害 / 倍率',
  altCrit: '副攻击爆头', dps: 'Wiki 原文 DPS（参考）', rpm: '射速 (RPM)', magazine: '弹药容量',
  reload: '空仓换弹', tacticalReload: '战术换弹', falloff: '射程衰减', falloffMultiplier: '最远伤害倍率',
  destruction: '环境伤害', altDestruction: '副攻击环境伤害', cooldown: '冷却 / 充能机制',
  charges: '使用次数 / 弹药', duration: '持续时间', healing: '治疗量', health: '耐久 / 能量',
  range: '最大距离', radius: '作用范围', damageRadius: '伤害范围', maxDeploy: '最大部署数',
  primeTime: '启动时间', costs: '能量消耗', lunge: '突进距离', precision: '精准判定角度'
}

const aliases = {
  damage: ['bodydamage', 'damage', 'primaryfire', 'pelletdamage'], altDamage: ['altfirebody', 'altfire'],
  crit: ['crit', 'headshot'], altCrit: ['altfirehead'], dps: ['dps'], rpm: ['rpm', 'rateoffire', 'firerate'],
  magazine: ['magsize', 'magazinesize', 'magazine'], reload: ['fullreload', 'reload', 'reloadbar'],
  tacticalReload: ['tacreload'], destruction: ['environmentaldmg', 'environmentaldmgbar', 'envdmg'],
  altDestruction: ['environmentalaltdmg'], cooldown: ['cooldown', 'cooldownbar'], charges: ['charges', 'ammo'],
  duration: ['duration'], healing: ['healing'], health: ['health'], range: ['maxrange', 'range'],
  radius: ['radius'], damageRadius: ['dmgradius'], maxDeploy: ['maxdeploy'], primeTime: ['primetime'],
  costs: ['costs'], lunge: ['lunge'], precision: ['precision'], falloffMultiplier: ['falloffmulti']
}

export const normalizeWikiTitle = title => String(title || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

export function cleanWikiText(value) {
  return String(value || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/\s*>/gi, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/<br\s*\/?\s*>/gi, ' / ')
    .replace(/<\/?[a-z][^>]*>/gi, '').replace(/'{2,5}/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ').replace(/&times;/gi, '×').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ').trim()
}

// Split only at the outer level so pipes in links and nested templates are preserved.
function splitParameters(text) {
  const parts = []
  let start = 0, templates = 0, links = 0
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2)
    if (pair === '{{') { templates++; i++ }
    else if (pair === '}}') { templates--; i++ }
    else if (pair === '[[') { links++; i++ }
    else if (pair === ']]') { links--; i++ }
    else if (text[i] === '|' && templates === 0 && links === 0) { parts.push(text.slice(start, i)); start = i + 1 }
  }
  parts.push(text.slice(start))
  return parts
}

export function parseInfobox(wikitext) {
  const text = wikitext.replace(/<!--[\s\S]*?-->/g, '')
  const start = text.search(/\{\{\s*Infobox[ _]+(?:weapons?|gadgets?|specializations?)\b/i)
  if (start < 0) throw new Error('未找到装备数值信息框，保留上次数据')
  let depth = 0, end = -1
  for (let i = start; i < text.length - 1; i++) {
    const pair = text.slice(i, i + 2)
    if (pair === '{{') { depth++; i++ }
    else if (pair === '}}') { depth--; if (depth === 0) { end = i; break }; i++ }
  }
  if (end < 0) throw new Error('Wiki 信息框不完整，保留上次数据')
  return Object.fromEntries(splitParameters(text.slice(start + 2, end)).slice(1).flatMap(part => {
    const eq = part.indexOf('=')
    if (eq < 0) return []
    return [[part.slice(0, eq).trim().toLowerCase().replace(/[ _-]/g, ''), part.slice(eq + 1).trim()]]
  }))
}

export function parseDamageProfile(wikitext) {
  const heading = /={2,}\s*Damage[ _]+Profile\s*={2,}/i.exec(wikitext)
  if (!heading) return null
  const section = wikitext.slice(heading.index + heading[0].length).split(/\n\s*={2,}/)[0].replace(/\{\{!\}\}/g, '|')
  const table = section.match(/\{\|[\s\S]*?\|\}/)?.[0]
  if (!table || !/Light\s*\(150\s*HP\)/i.test(table) || !/Medium\s*\(250\s*HP\)/i.test(table) || !/Heavy\s*\(350\s*HP\)/i.test(table)) return null
  const profile = {}
  for (const row of table.split(/\n\s*\|-/)) {
    const cells = row.split('\n').filter(line => /^\s*\|(?![}+-])/.test(line))
      .flatMap(line => line.replace(/^\s*\|/, '').split('||'))
      .map(cell => cleanWikiText(cell.replace(/^\s*(?:style|class|rowspan|colspan)\s*=[^|]*\|/i, '')))
    const part = cells[0]?.toLowerCase()
    if (!['head', 'body'].includes(part) || cells.length !== 7) continue
    const result = {}
    for (const [i, build] of ['light', 'medium', 'heavy'].entries()) {
      const shots = cells[1 + i * 2], ttk = cells[2 + i * 2]
      if (!/^\d+$/.test(shots) || Number(shots) < 1 || !/^(?:\d+(?:\.\d+)?\s*s?|[-—–])$/.test(ttk)) continue
      result[build] = { shots: Number(shots), ttk: /^[-—–]$/.test(ttk) ? '—' : `${parseFloat(ttk).toFixed(2)}s` }
    }
    if (Object.keys(result).length === 3) profile[part] = result
  }
  return Object.keys(profile).length ? profile : null
}

export function parseWikiEquipment(wikitext, item) {
  const fields = parseInfobox(wikitext)
  const stats = {}
  for (const [key, names] of Object.entries(aliases)) {
    const raw = names.map(name => fields[name]).find(value => value?.trim())
    // A template expression is not a number; don't mark this revision as synchronized.
    if (raw?.includes('{{')) throw new Error(`字段 ${key} 使用了未支持的 Wiki 模板，保留上次数据`)
    stats[key] = cleanWikiText(raw) || '—'
  }
  const falloff = [fields.falloffmin, fields.falloffmax].filter(Boolean).map(cleanWikiText)
  stats.falloff = falloff.length ? falloff.join(' - ') : '—'
  if (item.category === 'weapons' ? !/\d/.test(stats.damage) : !['cooldown', 'duration', 'health', 'damage', 'healing'].some(key => stats[key] !== '—')) {
    throw new Error('Wiki 缺少可验证的核心数值，保留上次数据')
  }
  const quote = fields.weaponquote || fields.quote || ''
  const quoteBody = quote.replace(/^\{\{\s*quote\s*\|\s*(?:text\s*=\s*)?/i, '').replace(/\}\}\s*$/, '')
  const summary = quoteBody.includes('{{') ? '' : cleanWikiText(quoteBody)
  return { stats, summary, damageProfile: item.category === 'weapons' ? parseDamageProfile(wikitext) : null,
    combat: item.category === 'weapons' ? parseWeaponMechanics(wikitext) : null }
}

export function wikiWeaponTTK(weapon, hitType = 'head', buildKey = 'light') {
  if (weapon?.category !== 'weapons') return { shots: '—', ttk: '—' }
  const cell = weapon.damageProfile?.[hitType]?.[buildKey]
  // Missing/multi-mode rows are deliberately not invented from a fixed weapon list.
  return cell ? { shots: cell.shots, ttk: cell.ttk === '—' ? '—' : String(cell.ttk).endsWith('s') ? cell.ttk : `${cell.ttk}s` } : { shots: '—', ttk: '—' }
}
