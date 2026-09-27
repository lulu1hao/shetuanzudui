import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createEquipmentSync } from '../src/utils/wikiEquipmentSync.js'

const base = JSON.parse(readFileSync(new URL('../src/data/finalsEquipmentData.json', import.meta.url)))
if (process.argv.includes('--verify-sync')) {
  const cache = new Map()
  let contentRequests = 0
  const service = createEquipmentSync({
    baseData: base,
    storage: { getItem: key => cache.get(key), setItem: (key, value) => cache.set(key, value) },
    request: async (titles, content) => {
      if (content) contentRequests++
      const params = new URLSearchParams({ action: 'query', titles: titles.join('|'), prop: 'revisions', rvprop: content ? 'ids|timestamp|content' : 'ids|timestamp', rvslots: 'main', redirects: '1', format: 'json', formatversion: '2', origin: '*', maxlag: '5' })
      const response = await fetch(`https://www.thefinals.wiki/w/api.php?${params}`, { signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }
  })
  const initial = await service.sync()
  console.log('Initial live sync:', JSON.stringify({ success: initial.success, checked: initial.checkedCount, changed: initial.updatedCount, errors: initial.errors, contentRequests }))
  contentRequests = 0
  const repeat = await service.sync()
  console.log('Revision-only check:', JSON.stringify({ success: repeat.success, checked: repeat.checkedCount, changed: repeat.updatedCount, errors: repeat.errors, contentRequests }))
  if (!initial.success || !repeat.success) process.exitCode = 1
} else {
const pages = []
for (let i = 0; i < base.items.length; i += 20) {
  const params = new URLSearchParams({ action: 'query', titles: base.items.slice(i, i + 20).map(x => x.name).join('|'), prop: 'revisions', rvprop: 'ids|timestamp|content', rvslots: 'main', redirects: '1', format: 'json', formatversion: '2', origin: '*' })
  const response = await fetch(`https://www.thefinals.wiki/w/api.php?${params}`, { signal: AbortSignal.timeout(25000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(JSON.stringify(data.error))
  pages.push(...data.query.pages)
  console.log(`Fetched ${pages.length}/${base.items.length}`)
}
mkdirSync(new URL('../artifacts/', import.meta.url), { recursive: true })
writeFileSync(new URL('../artifacts/equipment-wiki-live.json', import.meta.url), JSON.stringify(pages, null, 2))
console.log('Saved live pages to artifacts/equipment-wiki-live.json')
}
