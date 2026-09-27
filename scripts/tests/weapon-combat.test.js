import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { analyzeWeapon, getWeaponModes, getWeaponDpsSummary, WEAPON_MODELS } from '../../src/utils/weaponCombat.js'
import { parseWeaponMechanics } from '../../src/utils/weaponWikiMechanics.js'
import { parseWikiEquipment } from '../../src/utils/wikiEquipmentParser.js'
import { createEquipmentSync, EQUIPMENT_CACHE_KEY } from '../../src/utils/wikiEquipmentSync.js'
const snapshot = JSON.parse(readFileSync(new URL('../../src/data/weaponCombatSnapshot.json', import.meta.url)))
const base = JSON.parse(readFileSync(new URL('../../src/data/finalsEquipmentData.json', import.meta.url)))
const clone = value => JSON.parse(JSON.stringify(value))
const weapon = id => ({ ...clone(base.items.find(item => item.id === id)), ...clone(snapshot.items.find(item => item.id === id)) })
const near = (actual, expected, epsilon = 1e-6) => { assert.ok(Number.isFinite(actual)); assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≠ ${expected}`) }

test('all 38 weapons and all their attack modes have explicit, bounded analysis paths', () => {
  const weapons = base.items.filter(item => item.category === 'weapons')
  assert.equal(weapons.length, 38)
  assert.deepEqual(new Set(Object.keys(WEAPON_MODELS)), new Set(weapons.map(item => item.id)))
  for (const item of weapons) for (const mode of getWeaponModes(weapon(item.id))) {
    const result = analyzeWeapon(weapon(item.id), { modeId: mode.id })
    assert.equal(result.errors.length, 0, `${item.id}/${mode.id}: ${result.errors}`)
    if (mode.defensive) assert.equal(result.dps, null)
    else {
      assert.ok(result.damage > 0, `${item.id}/${mode.id}: invalid damage`)
      for (const target of result.targets) {
        assert.ok(target.hits >= 1, `${item.id}/${mode.id}: missing hit count`)
        if (target.fromFirst !== null) assert.ok(Number.isFinite(target.fromFirst) && target.fromFirst >= 0)
        if (target.total !== null) assert.ok(Number.isFinite(target.total) && target.total >= 0)
      }
    }
  }
})

test('standard DPS and hit thresholds are recomputed from damage and RPM, ignoring stale Wiki DPS', () => {
  const akm = weapon('akm')
  akm.stats.dps = '1'
  const a = analyzeWeapon(akm)
  near(a.dps, 210)
  assert.deepEqual(a.targets.map(target => target.hits), [8, 12, 17])
  near(a.targets[2].total, 1.6)
  akm.stats.damage = '25'; akm.stats.rpm = '720'
  const b = analyzeWeapon(akm)
  near(b.dps, 300)
  assert.deepEqual(b.targets.map(target => target.hits), [6, 10, 14])
  assert.equal(getWeaponDpsSummary(akm).value, b.dps)
})

test('shotguns multiply pellets once, support partial hits and do not invent headshots', () => {
  const gun = weapon('model_1887')
  near(analyzeWeapon(gun).damage, 117)
  near(analyzeWeapon(gun).dps, 140.4)
  assert.equal(analyzeWeapon(gun).hasHead, false)
  assert.equal(analyzeWeapon(gun, { hit: 'head' }).dps, analyzeWeapon(gun).dps)
  const partial = analyzeWeapon(gun, { pellets: 3 })
  near(partial.damage, 39)
  assert.deepEqual(partial.targets.map(target => target.hits), [4, 7, 9])
  assert.equal(partial.targets[2].reloads, 1)
})

test('bow has independent light/full draw damage and cadence; first charge is counted exactly once', () => {
  const bow = weapon('recurve_bow')
  near(analyzeWeapon(bow).dps, 78)
  const full = analyzeWeapon(bow, { modeId: 'charged' })
  near(full.dps, 100.8)
  near(full.targets[0].fromFirst, 1.25)
  near(full.targets[0].total, 1.74)
  near(full.targets[2].total, 2.99)
  const prepared = analyzeWeapon(bow, { modeId: 'charged', prepared: true, hit: 'head' })
  assert.equal(prepared.targets[0].hits, 1)
  near(prepared.targets[0].total, 0)
  near(analyzeWeapon(bow, { modeId: 'charged', hit: 'head' }).targets[0].total, 0.49)
})

test('FAMAS and 93R account for intra-burst timing and post-burst gap', () => {
  const a = analyzeWeapon(weapon('famas'))
  near(a.dps, 72 / (2 * 60 / 1080 + 0.27))
  near(a.targets[0].total, 2 * (2 * 60 / 1080 + 0.27))
  const b = analyzeWeapon(weapon('93r'))
  near(b.targets[0].total, 0.79)
  assert.equal(b.targets[0].hits, 7)
  assert.equal(b.targets[0].actions, 3)
  assert.ok(b.sustainedDps < b.dps)
})

test('throwing knives are two staggered hits; charged throw damage is not doubled', () => {
  const knives = weapon('throwing_knives')
  const a = analyzeWeapon(knives)
  near(a.damage, 120)
  near(a.targets[0].fromFirst, 60 / 89 + 60 / 545.45)
  assert.equal(a.targets[0].hits, 3)
  assert.equal(a.targets[0].actions, 2)
  const b = analyzeWeapon(knives, { modeId: 'charged', prepared: true })
  near(b.damage, 140)
  near(b.targets[0].fromFirst, 60 / 27.7)
  assert.equal(b.targets[0].hits, 2)
})

test('SA1216 inserts 0.8s after four shells and discounts internal pauses in DPS', () => {
  const a = analyzeWeapon(weapon('sa1216'))
  near(a.targets[1].total, 3 * 60 / 190)
  near(a.targets[2].total, 3 * 60 / 190 + 0.8)
  assert.ok(a.dps < a.impactDps)
  assert.ok(a.sustainedDps < a.dps)
})

test('coupled ARN magazines quick-swap after 30 and fully reload after 60', () => {
  const arn = weapon('arn_220')
  arn.stats.damage = '5'
  const a = analyzeWeapon(arn)
  assert.equal(a.targets[0].hits, 30)
  near(a.targets[0].total, 29 * 0.08)
  assert.equal(a.targets[1].hits, 50)
  near(a.targets[1].total, 29 * 0.08 + 0.66 + 19 * 0.08)
  assert.equal(a.targets[2].hits, 70)
  near(a.targets[2].total, 29 * 0.08 + 0.66 + 29 * 0.08 + 2.7 + 9 * 0.08)
})

test('ShAK fires two rounds per trigger and uses ten triggers per 20-round magazine; akimbo alternates', () => {
  const a = analyzeWeapon(weapon('shak_50'))
  near(a.damage, 30); near(a.dps, 210)
  assert.equal(a.targets[2].hits, 12)
  assert.equal(a.targets[2].reloads, 1)
  near(a.targets[2].total, 9 * 60 / 420 + 3.2 + 60 / 420)
  near(analyzeWeapon(weapon('50_akimbo')).damage, 46)
})

test('explosive direct/inner/outer modes never add impact and explosion together', () => {
  for (const [id, expected] of [['cl_40', [105, 79, 11]], ['mgl32', [83, 75, 10]]]) {
    const item = weapon(id)
    assert.deepEqual(getWeaponModes(item).map(mode => analyzeWeapon(item, { modeId: mode.id }).damage), expected)
  }
})

test('single-layer burn can kill between shots and does not stack its per-second rate per pellet', () => {
  const a = analyzeWeapon(weapon('cerberus_12ga'))
  near(a.dps, 210)
  // Three impacts at 0/0.6/1.2; one refreshed burn lasts to 3.2s, not three stacked burns.
  const cerberusReload = parseFloat(weapon('cerberus_12ga').stats.reload)
  near(a.sustainedDps, (351 + 15 * Math.min(3.2, 1.2 + cerberusReload)) / (1.2 + cerberusReload))
  assert.equal(a.targets[1].hits, 2)
  assert.equal(a.targets[1].burnKill, true)
  near(a.targets[1].fromFirst, 0.6 + (250 - 234 - 9) / 15)
  const without = analyzeWeapon(weapon('cerberus_12ga'), { includeBurn: false })
  near(without.dps, 195)
  assert.equal(without.targets[1].hits, 3)
  const flame = analyzeWeapon(weapon('flamethrower'), { modeId: 'burning', timing: { burnDuration: 2 } })
  near(flame.dps, 100)
  near(analyzeWeapon(weapon('flamethrower')).dps, 85)
})

test('minigun keeps ready and cold timing distinct and rejects reference timing after RPM/damage changes', () => {
  const gun = weapon('m134_minigun')
  near(analyzeWeapon(gun).targets[0].total, 0.52)
  near(analyzeWeapon(gun, { modeId: 'cold' }).targets[0].total, 1.75)
  near(analyzeWeapon(gun, { modeId: 'cold', timing: { initialDelay: 1.2 } }).targets[0].total, 1.72)
  gun.stats.rpm = '1000'
  assert.equal(analyzeWeapon(gun, { modeId: 'cold' }).targets[0].total, null)
  gun.stats.damage = '20'
  assert.equal(analyzeWeapon(gun, { modeId: 'cold' }).targets[0].total, null)
})

test('riot shield recalculates 350 HP to five hits, exposes stale Wiki table, and accepts measured cadence', () => {
  const shield = weapon('riot_shield')
  const a = analyzeWeapon(shield)
  assert.deepEqual(a.targets.map(target => target.hits), [2, 3, 5])
  assert.equal(a.targets[2].referenceConflict, true)
  assert.equal(a.dps, null)
  assert.equal(a.hasHead, false)
  const b = analyzeWeapon(shield, { timing: { cycle: 0.6, initialDelay: 0.2 } })
  near(b.dps, 86 / 0.6)
  near(b.targets[2].total, 2.6)
  near(analyzeWeapon(shield, { modeId: 'alternate' }).damage, 50)
})

test('melee alternates read current synchronized values instead of historical constants', () => {
  const sword = weapon('sword')
  near(analyzeWeapon(sword).damage, 110)
  near(analyzeWeapon(sword, { modeId: 'alternate' }).damage, 120)
  near(analyzeWeapon(sword, { glancing: true }).damage, 71.5)
  near(analyzeWeapon(weapon('sledgehammer'), { modeId: 'alternate' }).damage, 200)
  const dagger = analyzeWeapon(weapon('dagger'), { modeId: 'backstab' })
  assert.deepEqual(dagger.targets.map(target => target.hits), [1, 1, 2])
  near(dagger.targets[0].total, 0.65)
  assert.equal(dagger.targets[2].total, null)
})

test('spear spins hit at 0.6/1.25/2.55 seconds with increasing damage; dual blades stagger their slashes', () => {
  const a = analyzeWeapon(weapon('spear'), { modeId: 'spin' })
  near(a.damage, 350); near(a.dps, 350 / 3)
  near(a.targets[0].total, 1.25)
  near(a.targets[2].total, 2.55)
  assert.equal(a.targets[2].hits, 3)
  const blades = analyzeWeapon(weapon('dual_blades'), { timing: { cycle: 0.7, intra: 0.2, initialDelay: 0.15 } })
  near(blades.damage, 114)
  assert.equal(blades.targets[0].hits, 3)
  near(blades.targets[0].total, 0.85)
  assert.equal(analyzeWeapon(weapon('dual_blades'), { modeId: 'deflect' }).dps, null)
})

test('invalid and contradictory custom timings produce feedback, never Infinity or a plausible fake TTK', () => {
  for (const timing of [{ cycle: 0 }, { cycle: -1 }, { cycle: 'bad' }, { cycle: 0.1, initialDelay: 0.4 }]) {
    const a = analyzeWeapon(weapon('riot_shield'), { timing })
    assert.ok(a.errors.length)
    assert.equal(a.dps, null)
    assert.ok(a.targets.every(target => target.total === null))
  }
  const a = analyzeWeapon(weapon('dual_blades'), { timing: { cycle: 0.1, intra: 0.2 } })
  assert.ok(a.errors.length)
  assert.equal(a.dps, null)
})

test('mechanics extraction reads current prose and keeps alternate/tabbed reference tables separate', () => {
  const source = `{{Infobox weapons|bodydamage=20}}
== Usage ==
maximum power is reached after charging for 0.49 seconds
== Stats ==
*Shots Per Burst: 3
*Delay Until Next Burst (s): 0.27
*Quick reload is 0.80s long.
== History ==
*Shots Per Burst: 9
maximum power is reached after charging for 9 seconds`
  const m = parseWeaponMechanics(source)
  near(m.chargeTime, 0.49); near(m.burstGap, 0.27); near(m.tubePause, 0.8)
  assert.equal(m.burstCount, 3)
  const raw = weapon('m134_minigun').combat
  assert.deepEqual(raw.tables.map(table => table.variant), ['Full spin up', 'No spin up'])
  assert.ok(weapon('recurve_bow').combat.tables[0].rows.some(row => row.label === 'Body (Max Draw)'))
})

test('parser upgrade preserves old valid stats offline, then refreshes mechanics even with an unchanged page revision', async () => {
  const item = weapon('famas')
  const old = { ...item, stats: { ...item.stats, damage: '25' }, wiki: { parserVersion: 1, revisionId: 42, title: item.name } }
  delete old.combat
  const cache = new Map([[EQUIPMENT_CACHE_KEY, JSON.stringify({ schemaVersion: 4, items: [old] })]])
  const calls = []
  const service = createEquipmentSync({ baseData: { items: [item] }, storage: { getItem: key => cache.get(key), setItem: (key, value) => cache.set(key, value) }, request: async (titles, full) => {
    calls.push(full)
    return { query: { pages: [{ title: item.name, revisions: [{ revid: 42, timestamp: '2026-09-27T00:00:00Z', slots: { main: { content: `{{Infobox weapons|bodydamage=24|crit=36|rpm=220｜1080|magsize=27|fullreload=2.4s}}
== Stats ==
*Shots Per Burst: 3
*Delay Until Next Burst (s): 0.27` } } }] }] } }
  } })
  assert.equal(service.getData().items[0].stats.damage, '25')
  assert.equal((await service.sync()).success, true)
  assert.deepEqual(calls, [false, true])
  assert.equal(service.getData().items[0].combat.burstCount, 3)
  near(analyzeWeapon(service.getData().items[0]).dps, 72 / (2 * 60 / 1080 + 0.27))
  assert.equal(JSON.parse(cache.get(EQUIPMENT_CACHE_KEY)).items[0].combat.burstGap, 0.27)
})
