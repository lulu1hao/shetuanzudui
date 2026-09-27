// Explicit maintenance command: rebuild the shipped fallback from a verified live capture.
import { readFileSync, writeFileSync } from 'node:fs'
import { parseWikiEquipment, WIKI_PARSER_VERSION } from '../src/utils/wikiEquipmentParser.js'
const pages = JSON.parse(readFileSync(new URL('../artifacts/equipment-wiki-live.json', import.meta.url)))
const base = JSON.parse(readFileSync(new URL('../src/data/finalsEquipmentData.json', import.meta.url)))
const items = base.items.filter(item => item.category === 'weapons').map(item => {
  const page = pages.find(page => page.title.toLowerCase() === item.name.toLowerCase())
  if (!page?.revisions?.[0]?.revid) throw new Error(`Missing live page: ${item.name}`)
  const revision = page.revisions[0]
  const parsed = parseWikiEquipment(revision.slots.main.content, item)
  return { id: item.id, title: page.title, revisionId: revision.revid, revisionAt: revision.timestamp, ...parsed }
})
writeFileSync(new URL('../src/data/weaponCombatSnapshot.json', import.meta.url), JSON.stringify({ parserVersion: WIKI_PARSER_VERSION, capturedAt: new Date().toISOString(), items }, null, 2))
console.log(`Updated ${items.length} weapon combat snapshots`)
