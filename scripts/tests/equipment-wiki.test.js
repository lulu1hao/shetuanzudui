import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseWikiEquipment, wikiWeaponTTK } from '../../src/utils/wikiEquipmentParser.js'
import { createEquipmentSync, EQUIPMENT_CACHE_KEY, EQUIPMENT_CHECK_INTERVAL, startEquipmentSyncScheduler } from '../../src/utils/wikiEquipmentSync.js'

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/equipment-wiki.json', import.meta.url)))
const base = JSON.parse(readFileSync(new URL('../../src/data/finalsEquipmentData.json', import.meta.url)))
const clone = value => JSON.parse(JSON.stringify(value))
const fixture = title => clone(fixtures.find(page => page.title.toLowerCase() === title.toLowerCase()))
const content = page => page.revisions[0].slots.main.content
function harness(ids = ['akm', 'evasive_dash', 'healing_beam'], overrides = {}) {
  const cache = new Map()
  const storage = { getItem: key => cache.get(key), setItem: (key, value) => cache.set(key, value) }
  const calls = []
  const pages = new Map(fixtures.map(page => [page.title.toLowerCase(), clone(page)]))
  let clock = Date.parse('2026-09-26T12:00:00Z'), online = true
  const baseData = { ...base, items: base.items.filter(item => ids.includes(item.id)) }
  const request = async (titles, withContent) => {
    calls.push({ titles, withContent })
    return { query: { pages: titles.map(title => {
      const page = clone(pages.get(title.toLowerCase()))
      if (!withContent) delete page.revisions?.[0]?.slots
      return page
    }) } }
  }
  const options = { baseData, storage, request, now: () => clock, isOnline: () => online, ...overrides }
  return { service: createEquipmentSync(options), cache, calls, pages, options, advance: ms => { clock += ms }, offline: () => { online = false } }
}

test('real numeric fixtures parse all 86 known items, including cooldownbar, ammo and healing', () => {
  for (const item of base.items) {
    const parsed = parseWikiEquipment(content(fixture(item.name)), item)
    assert.ok(Object.keys(parsed.stats).length > 15, item.name)
  }
  const dash = parseWikiEquipment(content(fixture('Evasive Dash')), { category: 'specializations' })
  assert.equal(dash.stats.cooldown, '5s')
  assert.equal(dash.stats.charges, '2')
  const beam = parseWikiEquipment(content(fixture('Healing Beam')), { category: 'specializations' })
  assert.match(beam.stats.cooldown, /Overheating - 7.5s/)
  assert.equal(beam.stats.healing, '46 per second')
  assert.equal(beam.stats.health, '253 charge')
})

test('nested templates, link pipes, multiline and same-line fields do not truncate the infobox', () => {
  const parsed = parseWikiEquipment(`{{Infobox weapons
|quote={{Quote|text=Example | nested={{Example|x}}}}
|bodydamage=14×8<br>Burn - 9/s|rpm=80
|tacreload=[[#Segmented|Segmented]]
|cooldownbar=Miss - 10s<br>
Hit - 20s
}}
==History==
|bodydamage=999
|cooldown=999s`, { category: 'weapons' })
  assert.equal(parsed.stats.damage, '14×8 / Burn - 9/s')
  assert.equal(parsed.stats.rpm, '80')
  assert.equal(parsed.stats.tacticalReload, 'Segmented')
  assert.equal(parsed.stats.cooldown, 'Miss - 10s / Hit - 20s')
  assert.equal(parsed.stats.dps, '—')
})

test('rejects malformed core stats and unresolved templates instead of importing bogus values', () => {
  for (const text of ['{{Infobox weapons|image=x}}', '{{Infobox weapons|bodydamage=20', '{{Infobox weapons|bodydamage={{Data|Damage}}}}', '<html>Access denied</html>']) {
    assert.throws(() => parseWikiEquipment(text, { category: 'weapons' }))
  }
})

test('multipliers, alternate attack and numeric text are not replaced by old weapon constants', () => {
  const weapon = parseWikiEquipment(`{{Infobox weapons
|weaponquote={{Quote|text=Current live description}}
|primaryfire=Precise - 130<br>Glancing blow - 90
|altfire=Backstab - 400
|magsize=30×2
|dmgradius=< 5m
}}`, { id: 'sword', category: 'weapons' })
  assert.equal(weapon.stats.damage, 'Precise - 130 / Glancing blow - 90')
  assert.equal(weapon.stats.altDamage, 'Backstab - 400')
  assert.equal(weapon.stats.magazine, '30×2')
  assert.equal(weapon.stats.damageRadius, '< 5m')
  assert.equal(weapon.summary, 'Current live description')
})

test('Wiki shot and TTK table refreshes with damage; zero time and unavailable time remain distinct', () => {
  const akm = { category: 'weapons', ...parseWikiEquipment(content(fixture('AKM')), { category: 'weapons' }) }
  assert.deepEqual(wikiWeaponTTK(akm, 'body', 'heavy'), { shots: 17, ttk: '1.60s' })
  const dagger = { category: 'weapons', ...parseWikiEquipment(content(fixture('Dagger')), { category: 'weapons' }) }
  assert.deepEqual(wikiWeaponTTK(dagger, 'body', 'light'), { shots: 3, ttk: '—' })
  assert.deepEqual(wikiWeaponTTK({ category: 'weapons', damageProfile: { body: { light: { shots: 1, ttk: '0.00s' } } } }, 'body', 'light'), { shots: 1, ttk: '0.00s' })
  assert.deepEqual(wikiWeaponTTK({ category: 'weapons', id: 'sword', stats: { damage: '100' } }), { shots: '—', ttk: '—' })
})

test('revision changes update weapons and skills without app/dataVersion changes; unchanged pages skip content', async () => {
  const h = harness()
  const first = await h.service.sync()
  assert.equal(first.success, true)
  assert.equal(first.checkedCount, 3)
  assert.equal(h.service.getData().items.find(item => item.id === 'evasive_dash').stats.charges, '2')
  const originalVersion = h.service.getData().dataVersion
  h.calls.length = 0
  h.advance(EQUIPMENT_CHECK_INTERVAL)
  const unchanged = await h.service.sync()
  assert.equal(unchanged.updatedCount, 0)
  assert.equal(h.calls.length, 1)
  assert.equal(h.calls[0].withContent, false)
  const weapon = h.pages.get('akm')
  weapon.revisions[0].revid++
  weapon.revisions[0].slots.main.content = content(weapon).replace('|bodydamage=21', '|bodydamage=25').replace('| 17\n| 1.6', '| 14\n| 1.3')
  const skill = h.pages.get('evasive dash')
  skill.revisions[0].revid++
  skill.revisions[0].slots.main.content = content(skill).replace('|cooldown=5s', '|cooldown=4s')
  h.advance(EQUIPMENT_CHECK_INTERVAL)
  const changed = await h.service.sync()
  assert.equal(changed.success, true)
  assert.equal(changed.updatedCount, 2)
  const updatedWeapon = h.service.getData().items.find(item => item.id === 'akm')
  assert.equal(updatedWeapon.stats.damage, '25')
  assert.deepEqual(wikiWeaponTTK(updatedWeapon, 'body', 'heavy'), { shots: 14, ttk: '1.30s' })
  assert.equal(h.service.getData().items.find(item => item.id === 'evasive_dash').stats.cooldown, '4s')
  assert.equal(h.service.getData().dataVersion, originalVersion)
  const restarted = createEquipmentSync(h.options)
  assert.equal(restarted.getData().items.find(item => item.id === 'akm').stats.damage, '25')
  assert.equal(restarted.getStatus().lastSuccessAt, changed.lastSuccessAt)
})

test('manual refresh and daily refresh re-fetch unchanged revisions', async () => {
  const h = harness(['akm'])
  await h.service.sync()
  h.calls.length = 0
  await h.service.sync({ force: true })
  assert.equal(h.calls.length, 2)
  h.calls.length = 0
  h.advance(24 * 60 * 60 * 1000)
  await h.service.sync()
  assert.equal(h.calls.length, 2)
})

test('total network failure never advances success timestamp or overwrites data', async () => {
  const h = harness(['akm'])
  await h.service.sync()
  const saved = clone(h.service.getData())
  const lastSuccess = h.service.getStatus().lastSuccessAt
  const failing = createEquipmentSync({ ...h.options, request: async () => { throw new Error('timeout') } })
  h.advance(EQUIPMENT_CHECK_INTERVAL)
  const result = await failing.sync()
  assert.equal(result.success, false)
  assert.equal(result.phase, 'error')
  assert.equal(result.failedCount, 1)
  assert.equal(result.checkedCount, 0)
  assert.equal(result.lastSuccessAt, lastSuccess)
  assert.deepEqual(failing.getData(), saved)
})

test('partial parse failure retains failed item and its revision so the next check retries it', async () => {
  const h = harness(['akm', 'evasive_dash'])
  await h.service.sync()
  const previous = clone(h.service.getData().items.find(item => item.id === 'evasive_dash'))
  const lastSuccess = h.service.getStatus().lastSuccessAt
  const page = h.pages.get('evasive dash')
  page.revisions[0].revid++
  page.revisions[0].slots.main.content = 'broken markup'
  h.advance(EQUIPMENT_CHECK_INTERVAL)
  const result = await h.service.sync()
  assert.equal(result.phase, 'partial')
  assert.equal(result.success, false)
  assert.equal(result.checkedCount, 1)
  assert.equal(result.failedCount, 1)
  assert.equal(result.lastSuccessAt, lastSuccess)
  assert.deepEqual(h.service.getData().items.find(item => item.id === 'evasive_dash'), previous)
  h.calls.length = 0
  await h.service.sync()
  assert.ok(h.calls.some(call => call.withContent && call.titles.includes('Evasive Dash')))
})

test('redirects and title normalization resolve to the requested item', async () => {
  const page = fixture('AKM')
  page.title = 'AKM Current'
  const h = harness(['akm'], { request: async () => ({ query: { normalized: [{ from: 'AKM', to: 'Akm' }], redirects: [{ from: 'Akm', to: 'AKM Current' }], pages: [page] } }) })
  assert.equal((await h.service.sync()).success, true)
  assert.equal(h.service.getData().items[0].wiki.title, 'AKM Current')
})

test('MediaWiki error, warning and missing page are failures, even with HTTP 200', async () => {
  for (const response of [{ error: { code: 'maxlag', info: 'busy' } }, { warnings: { revisions: 'truncated' }, query: { pages: [fixture('AKM')] } }, { query: { pages: [{ title: 'AKM', missing: true }] } }]) {
    const h = harness(['akm'], { request: async () => response })
    assert.equal((await h.service.sync()).success, false)
    assert.equal(h.service.getStatus().lastSuccessAt, null)
  }
})

test('overlapping automatic/manual calls share a single request and publish a new data snapshot', async () => {
  let release
  const pending = new Promise(resolve => { release = resolve })
  const h = harness(['akm'], { request: async () => { await pending; return { query: { pages: [fixture('AKM')] } } } })
  const original = h.service.getData()
  const observed = []
  const unsubscribe = h.service.subscribe((data, status) => observed.push([data, status.phase]))
  const first = h.service.sync()
  const second = h.service.sync({ force: true })
  assert.equal(first, second)
  release()
  await first
  assert.notEqual(h.service.getData(), original)
  assert.equal(observed.at(-1)[1], 'success')
  unsubscribe()
})

test('offline, corrupt legacy caches, and storage quota do not masquerade as fresh saved data', async () => {
  const h = harness(['akm'])
  h.offline()
  assert.equal((await h.service.sync()).offline, true)
  assert.equal(h.calls.length, 0)
  const broken = harness(['akm'], { storage: { getItem: () => '{bad json', setItem: () => { throw new Error('QuotaExceeded') } } })
  assert.equal(broken.service.getStatus().lastSuccessAt, null)
  assert.equal((await broken.service.sync()).success, true)
  assert.match(broken.service.getStatus().storageError, /当前会话/)
  h.cache.set(EQUIPMENT_CACHE_KEY, JSON.stringify({ schemaVersion: 3, items: [] }))
  assert.equal(createEquipmentSync(h.options).getStatus().lastSuccessAt, null)
})

test('cache overlays known IDs and survives bundle metadata/item-count updates', async () => {
  const h = harness(['akm'])
  await h.service.sync()
  const nextBase = clone(h.options.baseData)
  nextBase.dataVersion = 'new-app'
  nextBase.items[0].nameZh = '新的中文名'
  nextBase.items.push(base.items.find(item => item.id === 'evasive_dash'))
  const service = createEquipmentSync({ ...h.options, baseData: nextBase })
  assert.equal(service.getData().items[0].nameZh, '新的中文名')
  assert.equal(service.getData().items[0].stats.damage, '21')
  assert.equal(service.getData().items.length, 2)
  assert.equal(service.getStatus().phase, 'idle')
})

test('app scheduler checks startup, reconnect and interval; failures back off and cleanup removes listeners', async () => {
  class Surface extends EventTarget {}
  const windowTarget = new Surface(), documentTarget = new Surface()
  windowTarget.navigator = { onLine: true }
  documentTarget.visibilityState = 'visible'
  let time = 0, timer, cleared = false, calls = 0, success = false
  const flush = () => new Promise(resolve => setImmediate(resolve))
  const stop = startEquipmentSyncScheduler({ sync: async () => { calls++; return { success } } }, {
    windowTarget, documentTarget, now: () => time,
    setIntervalFn: callback => { timer = callback; return 1 }, clearIntervalFn: id => { cleared = id === 1 }
  })
  await flush()
  assert.equal(calls, 1)
  time = 60000; timer(); await flush(); assert.equal(calls, 2)
  time = 120000; timer(); await flush(); assert.equal(calls, 2)
  success = true
  windowTarget.dispatchEvent(new Event('online')); await flush(); assert.equal(calls, 3)
  time += EQUIPMENT_CHECK_INTERVAL
  documentTarget.dispatchEvent(new Event('visibilitychange')); await flush(); assert.equal(calls, 4)
  windowTarget.navigator.onLine = false
  time += EQUIPMENT_CHECK_INTERVAL
  timer(); await flush(); assert.equal(calls, 4)
  stop()
  windowTarget.navigator.onLine = true
  windowTarget.dispatchEvent(new Event('online')); timer(); await flush()
  assert.equal(calls, 4)
  assert.equal(cleared, true)
})
