import { invoke, isTauri } from '@tauri-apps/api/core'

export async function requestEquipmentWiki(titles, content) {
  if (isTauri()) return invoke('fetch_equipment_wiki', { titles, content })
  const params = new URLSearchParams({
    action: 'query', titles: titles.join('|'), prop: 'revisions', rvprop: content ? 'ids|timestamp|content' : 'ids|timestamp',
    rvslots: 'main', redirects: '1', format: 'json', formatversion: '2', origin: '*', maxlag: '5'
  })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(`https://www.thefinals.wiki/w/api.php?${params}`, { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new Error(`Wiki HTTP ${response.status}`)
    return await response.json()
  } finally { clearTimeout(timeout) }
}
