export const TARGETS = [{ key: 'light', label: '轻型', hp: 150 }, { key: 'medium', label: '中型', hp: 250 }, { key: 'heavy', label: '重型', hp: 350 }]
export const WEAPON_MODELS = Object.freeze({
  '93r': 'burst', arn_220: 'coupled', dagger: 'dagger', lh1: 'single', m11: 'single',
  m26_matter: 'shotgun', recurve_bow: 'bow', sh1900: 'shotgun', sr_84: 'single', sword: 'sword',
  throwing_knives: 'knives', v9s: 'single', xp_54: 'single', akm: 'single', cb_01_repeater: 'single',
  cerberus_12ga: 'burnShotgun', chimera_xb: 'single', cl_40: 'explosive', dual_blades: 'blades',
  famas: 'burst', fcar: 'single', model_1887: 'shotgun', p90: 'single', pike_556: 'single',
  r_357: 'single', riot_shield: 'shield', '50_akimbo': 'single', bfr_titan: 'single',
  flamethrower: 'flame', ks_23: 'slug', lewis_gun: 'single', m134_minigun: 'minigun',
  m60: 'single', mgl32: 'explosive', sa1216: 'tubeShotgun', shak_50: 'double',
  sledgehammer: 'hammer', spear: 'spear'
})
const NUM = '(\\d+(?:\\.\\d+)?)'
const finite = value => Number.isFinite(value)
const positive = value => finite(value) && value > 0
export const formatCombatNumber = value => finite(value) ? Number(value.toFixed(2)).toString() : '待测'
export const formatCombatTime = value => finite(value) ? `${value.toFixed(2)}s` : '待测时序'
const n = value => { const match = String(value ?? '').match(/\d+(?:\.\d+)?/); return match ? Number(match[0]) : null }
const labelNumber = (value, label) => n(String(value || '').match(new RegExp(`(?:${label})\\s*[-:]?\\s*${NUM}`, 'i'))?.[1])
const seconds = value => /^\s*\d+(?:\.\d+)?s?\s*$/.test(String(value)) ? parseFloat(value) : null
const product = value => {
  const match = String(value || '').match(new RegExp(`${NUM}\\s*[×x]\\s*${NUM}`, 'i'))
  return match ? { each: Number(match[1]), count: Number(match[2]), total: Number(match[1]) * Number(match[2]) } : null
}
const primary = value => labelNumber(value, 'Precise|Hit|Direct') ?? product(value)?.total ?? n(value)
const headDamage = (value, body) => {
  const raw = String(value || '')
  if (!raw || raw === '—' || /无|no critical/i.test(raw)) return null
  const multiplied = product(raw)
  if (multiplied) return multiplied.total
  if (/^\s*\d+(?:\.\d+)?\s*[×x]\s*$/i.test(raw)) return body * n(raw)
  return n(raw)
}
const timingField = (key, label, value, required = false) => ({ key, label, value: finite(value) ? value : null, required })

export function getWeaponModes(weapon) {
  if (weapon?.category !== 'weapons') return []
  const family = WEAPON_MODELS[weapon.id] || 'unsupported'
  const s = weapon.stats || {}, m = weapon.combat || {}
  const rates = String(s.rpm || '').split(/[丨｜|]/).map(n)
  const cycle = positive(rates[0]) ? 60 / rates[0] : null
  const body = primary(s.damage), head = headDamage(s.crit, body)
  const clip = product(s.magazine)
  const capacity = clip ? clip.total : n(s.magazine)
  const reload = seconds(s.reload) ?? labelNumber(s.reload, 'Full reload')
  const make = (id, label, options = {}) => ({
    id, label, family, unit: '发', body, head, damages: [body], headDamages: head ? [head] : null,
    offsets: [0], cycle, initialDelay: 0, capacity, reload, ammoPerAction: 1,
    note: '按衰减前全部命中计算；不计飞行时间、瞄准、移动、护甲与治疗。',
    formula: '输出 DPS = 每次伤害 ÷ 攻击间隔；首击后 TTK = (命中次数 − 1) × 间隔。',
    referenceRow: 'Body', referenceVariant: 'Default', timingFields: [], ...options
  })
  const melee = (id, label, damage, options = {}) => make(id, label, {
    unit: '次', body: damage, head: null, damages: [damage], headDamages: null, cycle: null,
    initialDelay: null, capacity: null, reload: null,
    glancing: labelNumber(id === 'primary' ? s.damage : s.altDamage, 'Glancing blow'),
    note: '近战按实际命中次数计算，不提供爆头加成。时序缺失时仍计算所需命中数，可填入训练场实测时间。',
    formula: 'DPS = 本轮总伤害 ÷ 循环时长；击杀时刻按每次命中依次累加。',
    timingFields: [timingField('cycle', '连续两次攻击的循环间隔 / 秒', null, true), timingField('initialDelay', '按下攻击到首击命中 / 秒', null, true)],
    ...options
  })
  if (family === 'unsupported') return [make('primary', '未识别机制', { cycle: null, initialDelay: null, note: '此武器尚无已验证的机制适配，不能套用普通枪械公式。' })]
  if (family === 'burst') {
    const count = m.burstCount || 3, intra = positive(rates[1]) ? 60 / rates[1] : null
    const burstCycle = positive(intra) && positive(m.burstGap) ? (count - 1) * intra + m.burstGap : null
    return [make('primary', `${count} 连发`, {
      damages: Array(count).fill(body), headDamages: head ? Array(count).fill(head) : null,
      offsets: Array.from({ length: count }, (_, i) => i === 0 ? 0 : positive(intra) ? i * intra : null), cycle: burstCycle,
      ammoPerAction: count, unit: '组', burst: true,
      note: '逐颗子弹排布时间；组内射速和末发至下一组的间隔分开计入，不能直接把组内 RPM 当作持续射速。',
      formula: `每组周期 = (${count} − 1) × 组内间隔 + 组间等待；DPS = 每组伤害 ÷ 每组周期。`,
      timingFields: [timingField('burstGap', '末发到下组首发 / 秒', m.burstGap, true)]
    })]
  }
  if (family === 'knives') {
    const intra = positive(rates[1]) ? 60 / rates[1] : null
    return [make('primary', '双刀连掷', {
      damages: [body, body], headDamages: head ? [head, head] : null, offsets: [0, intra],
      cycle: positive(cycle) && positive(intra) ? cycle + intra : null, capacity: null, unit: '组', ammoPerAction: 2,
      initialDelay: null, timingFields: [timingField('initialDelay', '首次投掷到命中 / 秒', null, true)],
      note: '两把飞刀分先后命中；首项 RPM 表示两组之间的等待，第二项表示组内间隔，二者相加得到循环。',
      formula: '每组周期 = 60 ÷ 组间 RPM + 60 ÷ 组内 RPM；DPS = 2 × 单刀伤害 ÷ 周期。'
    }), make('charged', '蓄力双刀', {
      body: primary(s.altDamage), damages: [primary(s.altDamage)], head: headDamage(s.altCrit, primary(s.altDamage)),
      headDamages: [headDamage(s.altCrit, primary(s.altDamage))], cycle: positive(rates[2]) ? 60 / rates[2] : null,
      initialDelay: m.chargeTime, capacity: null, unit: '次', chargeable: true, referenceRow: 'Body (Alt-Fire)',
      note: '副攻击采用 Wiki 以一次双刀投掷记载的伤害，不再翻倍；首击前蓄力与重复攻击周期分别处理。',
      timingFields: [timingField('initialDelay', '首次蓄力到命中 / 秒', m.chargeTime, true)]
    })]
  }
  if (family === 'bow') return [
    make('primary', '轻拉速射', { capacity: null, unit: '箭', initialDelay: null,
      timingFields: [timingField('initialDelay', '首次轻拉到命中 / 秒', null, true)],
      note: '使用轻拉伤害与轻拉射速，不把满蓄力伤害和速射 RPM 混算。首次轻拉等待未给出时，只显示首击后击杀时间。' }),
    make('charged', '满蓄力', { body: primary(s.altDamage), damages: [primary(s.altDamage)],
      head: headDamage(s.altCrit, primary(s.altDamage)), headDamages: [headDamage(s.altCrit, primary(s.altDamage))],
      cycle: positive(rates[1]) ? 60 / rates[1] : null, initialDelay: m.chargeTime, capacity: null,
      unit: '箭', chargeable: true, referenceRow: 'Body (Max Draw)',
      note: '满蓄力 RPM 已包含后续箭的重复蓄力。起手只额外计入首次蓄力；提前拉满则首击等待为 0。',
      timingFields: [timingField('initialDelay', '首次满蓄力 / 秒', m.chargeTime, true)]
    })
  ]
  if (family === 'minigun') return [make('warm', '已完成预热'), make('cold', '冷启动', {
    initialDelay: null, referenceVariant: 'No spin up', cold: true,
    note: '冷启动含起转及加速，优先对照同命中数的 Wiki 冷启动实测；可填实测起转时间进行独立估算。',
    timingFields: [timingField('initialDelay', '起转至稳定输出的等效延迟 / 秒', null, true)]
  })]
  if (['dagger', 'sword', 'hammer', 'shield', 'spear', 'blades'].includes(family)) {
    const names = { dagger: '普通挥刺', sword: '普通挥砍', hammer: '横扫', shield: '警棍打击', spear: '普通刺击', blades: '双斩' }
    const first = melee('primary', names[family], body)
    if (family === 'blades') {
      const slash = product(s.damage)
      if (slash) { first.damages = Array(slash.count).fill(slash.each); first.offsets = Array(slash.count).fill(null); first.offsets[0] = 0; first.unit = '组' }
      first.timingFields.push(timingField('intra', '两刀之间的命中间隔 / 秒', null, true))
      return [first, melee('deflect', '格挡 / 反弹', null, { defensive: true, timingFields: [], note: '格挡本身无固定伤害；反弹伤害取决于敌方来弹，不能给出独立 DPS 或固定击杀次数。' })]
    }
    if (family === 'dagger') return [first,
      melee('frontStab', '蓄力正面刺击', labelNumber(s.altDamage, 'Precise'), { initialDelay: m.chargeTime, chargeable: true, referenceRow: 'Body (Alt-Fire)' }),
      melee('backstab', '蓄力背刺', labelNumber(s.altDamage, 'Backstab') ?? labelNumber(s.damage, '背刺'), { initialDelay: m.chargeTime, chargeable: true, glancing: null, referenceRow: 'Back (Alt-Fire)', note: '仅从背后命中才使用背刺伤害；未击杀时需再次蓄力，不能把正面普攻当作第二次背刺。' })
    ].map(mode => ({ ...mode, timingFields: mode.timingFields.map(field => field.key === 'initialDelay' ? { ...field, value: mode.initialDelay } : field) }))
    if (family === 'spear') {
      const damageSteps = String(s.altDamage || '').split('→').map(n)
      return [first, melee('spin', '三段旋转', damageSteps.reduce((sum, d) => sum + (d || 0), 0), {
        damages: damageSteps, offsets: m.spinOffsets?.map(time => time - m.spinOffsets[0]) || [0, null, null],
        initialDelay: m.spinOffsets?.[0] ?? null, cycle: m.spinCycle, glancing: null, unit: '轮',
        note: '三段旋转按各自伤害和实际命中时刻累计；不能用末段伤害乘以三，也不能把三击当作同时命中。',
        timingFields: [timingField('cycle', '整轮旋转周期 / 秒', m.spinCycle, true), timingField('initialDelay', '第一段命中前摇 / 秒', m.spinOffsets?.[0], true)]
      })]
    }
    const altLabel = { sword: '蓄力突刺', hammer: '蓄力重砸', shield: '举盾冲撞' }[family]
    return [first, melee('alternate', altLabel, family === 'shield' ? labelNumber(s.altDamage, 'Shield Bash') : primary(s.altDamage), { chargeable: family === 'sword', referenceRow: 'Body (Alt-Fire)' })]
  }
  if (family === 'explosive') {
    const inner = labelNumber(s.damage, 'from|From \\(Inner\\)'), outer = labelNumber(s.damage, 'to|To \\(Outer\\)')
    return [make('primary', '直击', { head: null, headDamages: null, referenceRow: 'Direct', note: '直击伤害与爆炸溅射是不同命中情形，不重复相加；不计弹道和引信等待。' }),
      make('inner', '内圈溅射', { body: inner, damages: [inner], head: null, headDamages: null, referenceRow: 'Splash' }),
      make('outer', '外圈溅射', { body: outer, damages: [outer], head: null, headDamages: null, referenceRow: null })
    ]
  }
  if (['shotgun', 'burnShotgun', 'tubeShotgun'].includes(family)) {
    const pellets = product(s.damage)
    return [make('primary', family === 'tubeShotgun' ? '四发转管霰弹' : family === 'burnShotgun' ? '龙息霰弹' : '霰弹齐射', {
      head: null, headDamages: null, pelletCount: pellets?.count, pelletDamage: pellets?.each,
      groupSize: family === 'tubeShotgun' ? clip?.each : null, groupPause: family === 'tubeShotgun' ? m.tubePause : null,
      burnRate: family === 'burnShotgun' ? labelNumber(s.damage, 'Burn') : null, burnDuration: m.burnDuration,
      note: '单次伤害按命中弹丸数相乘；霰弹不套用爆头倍率。' + (family === 'tubeShotgun' ? '每四发插入转管时间，整个弹匣耗尽后再换弹。' : ''),
      timingFields: family === 'tubeShotgun' ? [timingField('groupPause', '转管到下一发 / 秒', m.tubePause, true)] : []
    })]
  }
  if (family === 'flame') return [make('primary', '直接火焰命中', { head: null, headDamages: null, referenceRow: 'Splash', note: '仅计算直接喷射伤害；持续燃烧在另一模式单独加入。' }), make('burning', '火焰 + 持续燃烧', { head: null, headDamages: null, burnRate: labelNumber(s.damage, 'Burn'), burnDuration: m.burnDuration,
    referenceRow: 'Splash', note: '命中伤害按喷射频率累加；燃烧每秒伤害只叠一层并刷新持续时间，以连续流近似，不按每发重复叠加。',
    timingFields: [timingField('burnDuration', '每次命中后的燃烧持续 / 秒', m.burnDuration, true)]
  })]
  if (family === 'coupled') return [make('primary', '双弹匣连续射击', { groupSize: clip?.each, groupPause: labelNumber(s.reload, 'Magazine swap'),
    note: '先耗尽第一弹匣、快换第二弹匣，再完整换弹；DPS 和击杀时间均考虑这两个不同间隔。' })]
  if (family === 'double') return [make('primary', '双弹同时射击', { ammoPerAction: 2, capacity: capacity ? capacity / 2 : null, unit: '次', note: '每次扳机同时发射两颗子弹；伤害已乘二，弹药消耗也乘二，不能再把 DPS 翻倍。' })]
  return [make('primary', family === 'slug' ? '独头弹' : '标准射击', { ...(family === 'slug' ? { head: null, headDamages: null } : {}) })]
}

export function analyzeWeapon(weapon, options = {}) {
  const modes = getWeaponModes(weapon)
  const selected = modes.find(mode => mode.id === options.modeId) || modes[0]
  if (!selected) return null
  const mode = { ...selected, damages: [...selected.damages], offsets: [...selected.offsets], timingFields: selected.timingFields.map(field => ({ ...field })) }
  const overrides = options.timing || {}
  const errors = []
  for (const field of mode.timingFields) {
    if (overrides[field.key] === undefined || overrides[field.key] === '') continue
    const value = Number(overrides[field.key])
    if (!finite(value) || value < 0 || value > 60 || (['cycle', 'groupPause', 'burnDuration', 'burstGap'].includes(field.key) && value === 0)) {
      errors.push(`${field.label} 必须在 ${field.key === 'initialDelay' || field.key === 'intra' ? '0' : '大于 0'} 到 60 之间`); continue
    }
    if (field.key === 'intra') mode.offsets = mode.offsets.map((_, i) => i * value)
    else if (field.key === 'burstGap') mode.cycle = mode.offsets.at(-1) + value
    else mode[field.key] = value
  }
  if (options.prepared && mode.chargeable) mode.initialDelay = 0
  if (options.glancing && positive(mode.glancing)) { mode.damages = mode.damages.map(() => mode.glancing); mode.body = mode.glancing * mode.damages.length }
  if (mode.pelletCount) {
    const pellets = Math.max(1, Math.min(mode.pelletCount, Math.floor(Number(options.pellets) || mode.pelletCount)))
    mode.damages = [mode.pelletDamage * pellets]; mode.body = mode.damages[0]; mode.pelletsHit = pellets
  }
  const useHead = options.hit === 'head' && mode.headDamages?.every(positive)
  if (useHead) mode.damages = [...mode.headDamages]
  const lastOffset = mode.offsets.at(-1)
  if (positive(mode.cycle) && finite(lastOffset) && mode.cycle <= lastOffset) errors.push('完整循环时长必须大于本轮最后一击的命中时刻')
  if (positive(mode.cycle) && finite(mode.initialDelay) && mode.initialDelay > mode.cycle && !mode.cold) errors.push('首次前摇不能大于完整攻击循环；请检查时序')
  if (mode.burst && mode.capacity && mode.capacity % mode.ammoPerAction !== 0) errors.push('弹匣包含不完整连发组，当前时序模型需要重新核验')
  const damage = mode.damages.every(positive) ? mode.damages.reduce((sum, d) => sum + d, 0) : null
  const cadenceDps = damage && positive(mode.cycle) && !errors.length ? damage / mode.cycle : null
  const burnEnabled = options.includeBurn !== false && positive(mode.burnRate)
  const burnKnown = !burnEnabled || positive(mode.burnDuration)
  const schedule = makeSchedule(mode)
  const impactDps = cadenceDps
  const clipActions = mode.capacity ? Math.floor(mode.capacity / (mode.burst ? mode.ammoPerAction : 1)) : null
  const lastStart = clipActions ? schedule(clipActions - 1).start : null
  const internalPeriod = finite(lastStart) && positive(mode.cycle) ? lastStart + mode.cycle : null
  const adjustedDps = mode.groupSize ? (positive(internalPeriod) ? damage * clipActions / internalPeriod : null) : cadenceDps
  const outputDps = adjustedDps === null ? null : adjustedDps + (burnEnabled && burnKnown ? mode.burnRate * Math.min(1, mode.burnDuration / mode.cycle) : 0)
  const targets = TARGETS.map(target => ({ ...target, ...simulateKill(mode, target.hp, schedule, burnEnabled && burnKnown) }))
  const referenceRows = referenceFor(weapon, mode, useHead)
  for (const target of targets) {
    const reference = referenceRows?.targets.find(entry => entry.hp === target.hp)
    target.reference = reference || null
    target.referenceConflict = reference?.hits != null && reference.hits !== target.hits
    const warmReference = mode.cold ? referenceFor(weapon, { ...mode, referenceVariant: 'Full spin up' }, useHead)?.targets.find(entry => entry.hp === target.hp) : null
    const warmMatches = warmReference?.hits === target.hits && finite(warmReference?.seconds) && Math.abs(warmReference.seconds - target.fromFirst) < 0.02
    if (mode.cold && warmMatches && !finite(mode.initialDelay) && !Object.keys(overrides).length && !target.referenceConflict && finite(reference?.seconds)) {
      target.total = reference.seconds; target.totalSource = 'Wiki 冷启动实测'
    }
    if (errors.length || !burnKnown) { target.total = null; target.fromFirst = null }
  }
  const missing = []
  if (!positive(mode.cycle) && !mode.defensive) missing.push('连续攻击间隔')
  if (mode.offsets.some(offset => !finite(offset))) missing.push('连击内命中时刻')
  if (!finite(mode.initialDelay) && !mode.defensive && !mode.cold) missing.push('首击前摇')
  if (mode.cold && targets.some(target => !finite(target.total))) missing.push('起转时间（Wiki 实测与当前伤害 / 射速不匹配时不沿用）')
  if (mode.groupSize && !positive(mode.groupPause)) missing.push('分组换弹间隔')
  if (!burnKnown) missing.push('燃烧持续时间（可关闭燃烧只算直接命中）')
  const period = magazinePeriod(mode, schedule)
  const sustainedDps = positive(period) && burnKnown && !errors.length
    ? (damage * clipActions + (burnEnabled ? burnCoverage(mode, schedule, clipActions, period) * mode.burnRate : 0)) / period : null
  return { modes, mode, damage, impactDps, dps: burnKnown && !errors.length ? outputDps : null, sustainedDps,
    targets, missing, errors, hasHead: Boolean(mode.headDamages?.every(positive)), burnEnabled,
    custom: Object.values(overrides).some(value => value !== '' && value !== undefined), referenceRows,
    dpsLabel: mode.burnRate && !burnKnown ? '需燃烧时长' : !positive(mode.cycle) ? '待测攻速' : mode.cold ? '稳定输出 DPS' : '输出 DPS' }
}

// Repeat attack events, replacing the normal gap with a reload/tube-swap gap when needed.
function makeSchedule(mode) {
  return index => {
    if (index === 0) return { start: 0, reloads: 0, reloadTime: 0 }
    if (!positive(mode.cycle) || mode.offsets.some(offset => !finite(offset))) return { start: null, reloads: 0, reloadTime: null }
    const last = mode.offsets.at(-1)
    const clipActions = mode.capacity ? Math.floor(mode.capacity / (mode.burst ? mode.ammoPerAction : 1)) : null
    const reloads = clipActions ? Math.floor(index / clipActions) : 0
    const groups = mode.groupSize ? Math.floor(index / mode.groupSize) - reloads : 0
    if ((reloads && !positive(mode.reload)) || (groups && !positive(mode.groupPause))) return { start: null, reloads, reloadTime: null }
    const reloadExtra = reloads * Math.max(0, (mode.reload || 0) + last - mode.cycle)
    const groupExtra = groups * Math.max(0, (mode.groupPause || 0) + last - mode.cycle)
    return { start: index * mode.cycle + reloadExtra + groupExtra, reloads, reloadTime: reloadExtra + groupExtra }
  }
}

function magazinePeriod(mode, schedule) {
  if (!positive(mode.capacity) || !positive(mode.reload)) return null
  const actions = Math.floor(mode.capacity / (mode.burst ? mode.ammoPerAction : 1))
  return schedule(actions).start
}

// Union refreshed burn windows over a repeating magazine, including carry-over after reload.
function burnCoverage(mode, schedule, actions, period) {
  if (mode.burnDuration >= period) return period
  const windows = []
  for (let action = 0; action < actions; action++) for (const offset of mode.offsets) {
    const start = (schedule(action).start + offset) % period
    const end = start + mode.burnDuration
    windows.push([start, Math.min(end, period)])
    if (end > period) windows.push([0, end - period])
  }
  windows.sort((a, b) => a[0] - b[0])
  let coverage = 0, end = 0
  for (const [start, nextEnd] of windows) {
    coverage += Math.max(0, nextEnd - Math.max(start, end))
    end = Math.max(end, nextEnd)
  }
  return coverage
}

function simulateKill(mode, hp, schedule, burn) {
  const unknown = { hits: null, actions: null, fromFirst: null, total: null, reloads: 0, reloadTime: null, damageDealt: 0 }
  if (mode.defensive || !mode.damages.every(positive)) return unknown
  let remaining = hp, hits = 0, lastTime = 0, burnUntil = -1
  let result
  for (let action = 0; action < 1000; action++) {
    const clock = schedule(action)
    for (let step = 0; step < mode.damages.length; step++) {
      const time = finite(clock.start) && finite(mode.offsets[step]) ? clock.start + mode.offsets[step] : null
      if (burn && finite(time)) {
        const duration = Math.max(0, Math.min(time, burnUntil) - lastTime)
        if (remaining <= duration * mode.burnRate + 1e-8) {
          result = { ...clock, hits, actions: action + (step ? 1 : 0), fromFirst: lastTime + remaining / mode.burnRate, burnKill: true }; break
        }
        remaining -= duration * mode.burnRate
      }
      hits++; remaining -= mode.damages[step]
      if (remaining <= 1e-8) { result = { ...clock, hits, actions: action + 1, fromFirst: time }; break }
      if (finite(time)) { lastTime = time; burnUntil = time + (mode.burnDuration || 0) }
    }
    if (result) break
  }
  if (!result) return unknown
  return { ...result, total: finite(result.fromFirst) && finite(mode.initialDelay) ? result.fromFirst + mode.initialDelay : null,
    totalSource: '当前数值推算', damageDealt: hp - Math.min(remaining, 0) }
}

function referenceFor(weapon, mode, head) {
  const variant = mode.referenceVariant === 'Default' && mode.family === 'minigun' ? 'Full spin up' : mode.referenceVariant
  const table = weapon.combat?.tables?.find(table => table.variant.toLowerCase() === String(variant).toLowerCase())
  const label = head ? mode.referenceRow?.replace(/^Body/i, 'Head') : mode.referenceRow
  return table?.rows.find(row => row.label.toLowerCase() === label?.toLowerCase()) || null
}

export function getWeaponDpsSummary(weapon) {
  const analysis = analyzeWeapon(weapon)
  return { value: analysis?.dps ?? null, label: analysis?.dpsLabel || '输出 DPS', mode: analysis?.mode.label || '',
    text: finite(analysis?.dps) ? formatCombatNumber(analysis.dps) : analysis?.dpsLabel === '需燃烧时长' ? '需燃烧时长' : '待测攻速' }
}
