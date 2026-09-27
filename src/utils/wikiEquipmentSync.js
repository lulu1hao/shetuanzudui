import { normalizeWikiTitle, parseWikiEquipment, WIKI_PARSER_VERSION } from './wikiEquipmentParser.js'

export const EQUIPMENT_CACHE_KEY = 'finals_equipment_wiki_v4'
export const EQUIPMENT_CHECK_INTERVAL = 30 * 60 * 1000
const FULL_REFRESH_INTERVAL = 24 * 60 * 60 * 1000
const clone = value => JSON.parse(JSON.stringify(value))

export function createEquipmentSync({ baseData, storage, request, now = () => Date.now(), isOnline = () => true }) {
  let data = clone(baseData)
  let status = { phase: 'idle', lastSuccessAt: null, lastAttemptAt: null, checkedCount: 0, updatedCount: 0, failedCount: 0, errors: [], changes: [], storageError: null }
  // Old caches reported success even on network failure. Only trust the new schema.
  try {
    const cached = JSON.parse(storage?.getItem(EQUIPMENT_CACHE_KEY) || 'null')
    if (cached?.schemaVersion === 4 && Array.isArray(cached.items)) {
      data.items = data.items.map(item => {
        const saved = cached.items.find(entry => entry.id === item.id)
        if (!saved?.wiki?.revisionId || !saved.wiki.parserVersion || !saved.stats || typeof saved.stats !== 'object' || Array.isArray(saved.stats)) return item
        const restored = { ...item, stats: saved.stats, damageProfile: saved.damageProfile || null,
          combat: saved.combat || (saved.wiki.revisionId === item.combatSnapshot?.revisionId ? item.combat : null), wiki: saved.wiki }
        delete restored.ttk
        return restored
      })
      if (cached.sync && Array.isArray(cached.sync.errors) && Array.isArray(cached.sync.changes)) {
        status = { ...status, ...cached.sync, phase: ['success', 'partial', 'error'].includes(cached.sync.phase) ? cached.sync.phase : 'idle' }
        if (data.items.some(item => !item.wiki) && status.phase === 'success') status = { ...status, phase: 'idle', lastSuccessAt: null }
      }
    }
  } catch { /* A broken cache must never prevent the offline encyclopedia opening. */ }
  const listeners = new Set()
  let inFlight = null
  const emit = () => { for (const listener of listeners) listener(data, status) }
  const setStatus = update => { status = { ...status, ...update }; emit() }
  const persist = () => {
    try {
      if (!storage) throw new Error('Storage unavailable')
      storage.setItem(EQUIPMENT_CACHE_KEY, JSON.stringify({ schemaVersion: 4, items: data.items, sync: status }))
    } catch {
      status = { ...status, storageError: '本地存储不可用；本次数据仅在当前会话有效' }
    }
  }

  async function query(items, content) {
    const titles = items.map(item => item.wiki?.title || item.name)
    const response = await request(titles, content)
    if (response?.error) throw new Error(`Wiki ${response.error.code}: ${response.error.info}`)
    if (response?.warnings) throw new Error('Wiki 返回不完整结果，请稍后重试')
    const pages = response?.query?.pages
    if (!Array.isArray(pages)) throw new Error('Wiki 返回的数据格式不正确')
    const aliases = [...(response.query.normalized || []), ...(response.query.redirects || [])]
      .filter(alias => normalizeWikiTitle(alias.from) !== normalizeWikiTitle(alias.to))
    return items.map((item, index) => {
      let title = normalizeWikiTitle(titles[index])
      const visited = new Set()
      while (!visited.has(title)) {
        visited.add(title)
        const alias = aliases.find(x => normalizeWikiTitle(x.from) === title)
        if (!alias) break
        title = normalizeWikiTitle(alias.to)
      }
      return { item, page: pages.find(page => normalizeWikiTitle(page.title) === title) }
    })
  }

  async function run(force) {
    if (!isOnline()) {
      setStatus({ phase: 'offline' })
      return { success: false, offline: true, ...status }
    }
    const timestamp = new Date(now()).toISOString()
    setStatus({ phase: 'syncing', lastAttemptAt: timestamp, errors: [], storageError: null })
    const staged = clone(data)
    const errors = [], changes = []
    let checkedCount = 0, updatedCount = 0
    const failedIds = new Set()
    const fail = (item, error) => {
      if (failedIds.has(item.id)) return
      failedIds.add(item.id)
      errors.push({ id: item.id, name: item.name, message: error.message || String(error) })
    }
    const accept = (item, page, parsed) => {
      const revision = page.revisions[0]
      if (parsed) {
        const fields = Object.entries(parsed.stats).filter(([key, value]) => String(item.stats?.[key] || '—') !== value)
          .map(([field, after]) => ({ field, before: item.stats?.[field] || '—', after }))
        if (JSON.stringify(item.damageProfile || null) !== JSON.stringify(parsed.damageProfile)) fields.push({ field: 'damageProfile', before: '旧击杀表', after: parsed.damageProfile ? 'Wiki 当前击杀表' : 'Wiki 未提供可解析击杀表' })
        if (JSON.stringify(item.combat || null) !== JSON.stringify(parsed.combat || null)) fields.push({ field: 'combat', before: '旧攻击时序', after: '最新 Wiki 攻击时序' })
        if (fields.length) { updatedCount++; changes.push({ id: item.id, name: item.name, fields }) }
        item.stats = parsed.stats
        item.damageProfile = parsed.damageProfile
        item.combat = parsed.combat
        delete item.ttk
      }
      item.wiki = {
        ...item.wiki, summary: parsed ? parsed.summary : item.wiki?.summary, title: page.title, revisionId: revision.revid, revisionAt: revision.timestamp,
        checkedAt: timestamp, fetchedAt: parsed ? timestamp : item.wiki.fetchedAt, parserVersion: WIKI_PARSER_VERSION
      }
      checkedCount++
    }
    for (let i = 0; i < staged.items.length; i += 20) {
      const chunk = staged.items.slice(i, i + 20)
      try {
        const metadata = await query(chunk, false)
        const changed = []
        for (const { item, page } of metadata) {
          if (!page || page.missing || !page.revisions?.[0]?.revid) { fail(item, new Error('Wiki 页面不存在或没有可读取的修订')); continue }
          if (force || item.wiki?.parserVersion !== WIKI_PARSER_VERSION || item.wiki?.revisionId !== page.revisions[0].revid || !(now() - Date.parse(item.wiki?.fetchedAt) < FULL_REFRESH_INTERVAL)) changed.push(item)
          else accept(item, page)
        }
        if (changed.length) {
          try {
            for (const { item, page } of await query(changed, true)) {
              try {
                const revision = page?.revisions?.[0]
                const text = revision?.slots?.main?.content ?? revision?.slots?.main?.['*'] ?? revision?.['*']
                if (page?.missing || !revision?.revid || !text) throw new Error('Wiki 未返回装备正文')
                accept(item, page, parseWikiEquipment(text, item))
              } catch (error) { fail(item, error) }
            }
          } catch (error) { for (const item of changed) fail(item, error) }
        }
      } catch (error) { for (const item of chunk) fail(item, error) }
    }
    const success = errors.length === 0 && checkedCount === staged.items.length && checkedCount > 0
    if (checkedCount > 0) data = staged
    status = {
      ...status, phase: success ? 'success' : checkedCount ? 'partial' : 'error', checkedCount, updatedCount,
      failedCount: failedIds.size, errors, changes, lastSuccessAt: success ? timestamp : status.lastSuccessAt
    }
    persist()
    emit()
    return { ...status, success, itemCount: staged.items.length, lastUpdated: status.lastSuccessAt }
  }

  return {
    getData: () => data,
    getStatus: () => status,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    sync({ force = false } = {}) {
      if (inFlight) return inFlight
      inFlight = run(force).catch(error => {
        setStatus({ phase: 'error', errors: [{ message: error.message || String(error) }] })
        return { success: false, ...status }
      }).finally(() => { inFlight = null })
      return inFlight
    }
  }
}

// Owned by App, not the equipment route: checks continue while browsing other modules.
export function startEquipmentSyncScheduler(service, { windowTarget = window, documentTarget = document, now = () => Date.now(), setIntervalFn = setInterval, clearIntervalFn = clearInterval } = {}) {
  let stopped = false, failures = 0, lastAttempt = 0
  const check = async (force = false) => {
    if (stopped || windowTarget.navigator?.onLine === false) return
    const delay = failures ? Math.min(60000 * 2 ** (failures - 1), EQUIPMENT_CHECK_INTERVAL) : EQUIPMENT_CHECK_INTERVAL
    if (!force && now() - lastAttempt < delay) return
    lastAttempt = now()
    const result = await service.sync()
    failures = result.success ? 0 : failures + 1
  }
  const online = () => { void check(true) }
  const visible = () => { if (documentTarget.visibilityState === 'visible') void check() }
  windowTarget.addEventListener('online', online)
  windowTarget.addEventListener('focus', visible)
  documentTarget.addEventListener('visibilitychange', visible)
  const timer = setIntervalFn(() => { void check() }, 60000)
  void check(true)
  return () => {
    stopped = true
    clearIntervalFn(timer)
    windowTarget.removeEventListener('online', online)
    windowTarget.removeEventListener('focus', visible)
    documentTarget.removeEventListener('visibilitychange', visible)
  }
}
