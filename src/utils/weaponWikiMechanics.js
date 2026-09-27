// Only current prose is used. Balance-history values are never treated as current timings.
const plain = text => text.replace(/<[^>]*>/g, '').replace(/'{2,5}/g, '').replace(/\s+/g, ' ').trim()
const numberFrom = (text, pattern) => {
  const match = text.match(pattern)
  return match ? Number(match[1]) : null
}

export function parseWeaponMechanics(wikitext) {
  const current = wikitext.replace(/<!--[\s\S]*?-->/g, '').split(/\n==\s*(?:History|Item Mastery|Cosmetics|Trivia)\s*==/i)[0]
  const text = plain(current)
  const spin = text.match(/first hit happens ([\d.]+) seconds in, the second hit happens ([\d.]+).*?seconds in, and the third hit happens ([\d.]+)/i)
  const tables = []
  const profileHeading = /={2,}\s*Damage Profile\s*={2,}/i.exec(current)
  if (profileHeading) {
    const section = current.slice(profileHeading.index + profileHeading[0].length).split(/\n\s*={2,}/)[0].replace(/\{\{!\}\}/g, '|')
    for (const match of section.matchAll(/\{\|[\s\S]*?\|\}/g)) {
      if (!/Light\s*\(150\s*HP\)/i.test(match[0]) || !/Heavy\s*\(350\s*HP\)/i.test(match[0])) continue
      const before = section.slice(0, match.index)
      const variant = [...before.matchAll(/\|-\|\s*([^=\n]+)\s*=/g)].at(-1)?.[1]?.trim() || 'Default'
      const rows = []
      for (const row of match[0].split(/\n\s*\|-/)) {
        const cells = row.split('\n').filter(line => /^\s*\|(?![}+-])/.test(line))
          .flatMap(line => line.replace(/^\s*\|/, '').split('||'))
          .map(cell => plain(cell.replace(/^\s*(?:style|class|rowspan|colspan)\s*=[^|]*\|/i, '')))
        if (cells.length !== 7 || !cells[0]) continue
        const targets = [150, 250, 350].map((hp, index) => ({
          hp, hits: /^\d+$/.test(cells[index * 2 + 1]) ? Number(cells[index * 2 + 1]) : null,
          seconds: /^\d+(?:\.\d+)?s?$/.test(cells[index * 2 + 2]) ? parseFloat(cells[index * 2 + 2]) : null
        }))
        if (targets.some(target => target.hits)) rows.push({ label: cells[0], targets })
      }
      if (rows.length) tables.push({ variant, rows })
    }
  }
  return {
    burstCount: numberFrom(text, /Shots Per Burst:\s*(\d+)/i),
    burstGap: numberFrom(text, /Delay Until Next Burst\s*\(s\):\s*([\d.]+)/i),
    chargeTime: numberFrom(text, /maximum power is reached after charging for ([\d.]+) seconds/i)
      ?? numberFrom(text, /backstab charge time is ([\d.]+)s/i),
    tubePause: numberFrom(text, /Quick reload is ([\d.]+)s long/i),
    spinCycle: numberFrom(text, /spin attack animation lasts for ([\d.]+) seconds/i),
    spinOffsets: spin ? spin.slice(1, 4).map(Number) : null,
    burnDuration: numberFrom(text, /fire DoT that lasts? for\s*~?([\d.]+) seconds/i),
    tables
  }
}
