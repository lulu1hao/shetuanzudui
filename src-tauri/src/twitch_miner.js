(() => {
  if (location.hostname !== 'twitch.tv' && !location.hostname.endsWith('.twitch.tv')) return
  if (window.__LULU_DROPS_MINER__) return
  const role = __LULU_ROLE__
  const settings = __LULU_SETTINGS__
  const runtime = { lastSignature: '', lastEmitAt: 0, offlineTicks: 0, qualityAttempts: 0, claimClicked: false, capturedCampaigns: {} }
  window.__LULU_DROPS_MINER__ = runtime
  if (role === 'control') {
    try {
      const origFetch = window.fetch
      if (origFetch) {
        window.fetch = async function(...args) {
          const resp = await origFetch.apply(this, args)
          try {
            const url = args[0] ? String(args[0]) : ''
            if (url.includes('/gql')) {
              resp.clone().json().then(data => {
                const list = data?.data?.user?.dropCampaignUsers || data?.data?.dropCampaigns || []
                if (Array.isArray(list)) {
                  list.forEach(c => {
                    const game = c.game?.name || c.game?.displayName || ''
                    const name = c.name || ''
                    if (game || name) {
                      runtime.capturedCampaigns[name || game] = { game, name, status: c.status || 'ACTIVE', endAt: c.endAt || null }
                    }
                  })
                }
              }).catch(() => {})
            }
          } catch (_) {}
          return resp
        }
      }
    } catch (_) {}
  }
  // A login-only window must not claim rewards. The live miner authorizes claiming
  // with a short-lived heartbeat, scoped to this profile and session.
  let minerChannel
  try {
    minerChannel = new BroadcastChannel(`lulu-drops-${settings.accountId}`)
    minerChannel.onmessage = event => {
      if (role === 'control' && event.data?.sessionId === settings.sessionId && event.data?.role === 'stream') runtime.lastMinerHeartbeat = Date.now()
    }
  } catch (_) { /* Manual claiming remains available if the browser has no channel support. */ }
  const text = node => (node?.innerText || node?.textContent || '').trim()
  const loggedIn = () => {
    if (document.querySelector('[data-a-target="user-menu-toggle"]')) return true
    if (location.pathname.startsWith('/login') || document.querySelector('[data-a-target="login-button"]')) return false
    return null
  }
  const username = () => {
    if (loggedIn() !== true) return ''
    // Only the public login name is read; never export auth cookies or tokens.
    const name = document.cookie.split(';').map(v => v.trim()).find(v => v.startsWith('login='))?.slice(6) || ''
    return /^[a-zA-Z0-9_]{1,25}$/.test(name) ? name : ''
  }
  const onInventory = () => role === 'control' && location.pathname === '/drops/inventory'
  const channel = () => {
    if (role !== 'stream') return ''
    const segments = location.pathname.split('/').filter(Boolean)
    return segments.length === 1 && !['login', 'signup', 'directory', 'drops', 'settings', 'search'].includes(segments[0]) ? segments[0] : ''
  }
  const claimButtons = (root = document) => onInventory() ? Array.from(root.querySelectorAll('button')).filter(button => {
    const target = button.getAttribute('data-test-selector') || button.getAttribute('data-a-target') || ''
    return !button.disabled && button.getAttribute('aria-disabled') !== 'true' &&
      (/^(DropsCampaignInProgressRewardPresentation-claim-button|drops-claim-button)$/i.test(target) || /^(claim|claim now|领取|立即领取|領取|立即領取)$/i.test(text(button)))
  }) : []
  const progressOf = bar => {
    const raw = bar.getAttribute('aria-valuenow')
    if (raw !== null && raw.trim() !== '') {
      const value = Number(raw), max = Number(bar.getAttribute('aria-valuemax') || 100)
      if (Number.isFinite(value) && max > 0) return Math.max(0, Math.min(100, value / max * 100))
    }
    const match = (bar.getAttribute('aria-label') || bar.style?.width || '').match(/(\d+(?:\.\d+)?)\s*%/)
    return match ? Math.max(0, Math.min(100, Number(match[1]))) : null
  }
  const campaigns = () => {
    const list = []
    const seen = new Set()
    Object.values(runtime.capturedCampaigns || {}).forEach(c => {
      if (c && c.name && !seen.has(c.name)) {
        seen.add(c.name)
        list.push(c)
      }
    })
    if (onInventory()) {
      const cards = Array.from(document.querySelectorAll('[data-test-selector="DropsCampaignInProgressRewardPresentation"], .inventory-campaign-info, [data-test-selector*="Campaign"]')).slice(0, 50)
      cards.forEach(card => {
        const name = text(card.querySelector('h3, h4, [data-test-selector*="title"], [data-test-selector*="name"]'))
        const game = text(card.querySelector('a[href*="/directory/category/"], [data-a-target="link-sub-item"]')) || ''
        if (name && !seen.has(name)) {
          seen.add(name)
          list.push({ name, game, status: 'ACTIVE' })
        }
      })
    }
    return list
  }
  const directoryDrops = () => {
    if (role !== 'stream' || !location.pathname.startsWith('/directory/category/')) return null
    if (document.querySelectorAll('a[data-a-target="preview-card-image-link"], a[data-a-target="preview-card-title-link"]').length > 0) return true
    if (document.querySelector('[data-a-target="empty-state-message"]')) return false
    return null
  }
  const inventory = () => {
    if (!onInventory()) return []
    const cards = Array.from(document.querySelectorAll('[data-test-selector="DropsCampaignInProgressRewardPresentation"], [data-test-selector="drops-inventory-card"], .inventory-campaign-info')).slice(0, 100)
    // A progress bar without a recognizable reward card is intentionally not assigned to a made-up reward.
    return cards.map((card, index) => {
      const name = text(card.querySelector('[data-test-selector="DropsCampaignInProgressRewardPresentation-name"], h3, h4')) || card.querySelector('img[alt]')?.getAttribute('alt') || ''
      if (!name) return null
      const bar = card.querySelector('[role="progressbar"]')
      const claimed = Boolean(card.querySelector('[data-test-selector="DropsCampaignInProgressRewardPresentation-claimed-text"], [data-test-selector="drops-claimed"]'))
      return { id: card.getAttribute('id') || `${name}-${index}`, name, progress: bar ? progressOf(bar) : null, claimed, canClaim: claimButtons(card).length > 0 }
    }).filter(Boolean)
  }
  const forceMute = () => {
    if (!settings.muteAudio) return
    document.querySelectorAll('video, audio').forEach(media => { media.muted = true; media.defaultMuted = true; media.volume = 0 })
  }
  const playback = () => {
    if (role !== 'stream') return
    const video = document.querySelector('video')
    if (video?.paused) video.play().catch(() => {})
  }
  const lowQuality = () => {
    if (!settings.lowResource || role !== 'stream' || runtime.qualityAttempts >= 8 || runtime.qualityBusy) return
    const video = document.querySelector('video')
    if (!video || video.paused || (video.videoHeight > 0 && video.videoHeight <= 160)) return
    const button = document.querySelector('[data-a-target="player-settings-button"]')
    if (!button || document.querySelector('[data-a-target="player-settings-menu"]')) return
    runtime.qualityAttempts++; runtime.qualityBusy = true; button.click()
    setTimeout(() => {
      const quality = document.querySelector('[data-a-target="player-settings-menu-item-quality"]')
      quality?.click()
      setTimeout(() => {
        if (quality) {
          const choices = Array.from(document.querySelectorAll('[data-a-target*="quality-option"], [role="menuitemradio"], input[type="radio"]'))
          const choice = choices.find(node => /\b160p(?:30|60)?\b/i.test(text(node.closest('label') || node)))
          if (choice) (choice.closest('label, button') || choice).click()
        }
        if (document.querySelector('[data-a-target="player-settings-menu"]')) button.click()
        runtime.qualityBusy = false
      }, 450)
    }, 400)
  }
  const claim = () => {
    if (!onInventory() || !settings.autoClaim || loggedIn() !== true || runtime.claimClicked || !runtime.lastMinerHeartbeat || Date.now() - runtime.lastMinerHeartbeat > 30000) return
    const button = claimButtons()[0]
    if (!button) return
    runtime.claimClicked = true; button.click()
    setTimeout(() => { runtime.claimClicked = false }, 15000)
  }
  const selectDirectory = () => {
    if (role !== 'stream' || !location.pathname.startsWith('/directory/category/')) return
    const links = Array.from(document.querySelectorAll('a[data-a-target="preview-card-image-link"], a[data-a-target="preview-card-title-link"]'))
    const link = links.find(node => {
      try {
        const url = new URL(node.href, location.href)
        return url.protocol === 'https:' && ['www.twitch.tv', 'twitch.tv'].includes(url.hostname) && /^\/[a-zA-Z0-9_]{1,25}$/.test(url.pathname)
      } catch { return false }
    })
    if (link) location.assign(link.href)
  }
  const report = (force = false) => {
    const video = document.querySelector('video'), current = channel()
    if (current !== runtime.channel) { runtime.channel = current; runtime.qualityAttempts = 0; runtime.offlineTicks = 0 }
    const state = {
      role, accountId: settings.accountId, sessionId: settings.sessionId,
      loggedIn: loggedIn(), username: username(), page: location.pathname, channel: current,
      playing: Boolean(video && !video.paused && video.readyState >= 2), videoFound: Boolean(video),
      muted: video ? Boolean(video.muted || video.volume === 0) : null,
      quality: video?.videoHeight ? `${video.videoHeight}p` : '',
      offline: Boolean(document.querySelector('[data-a-target="offline-channel-main-content"]')),
      rewards: inventory(), campaigns: campaigns(), directoryDrops: directoryDrops(),
      canClaim: claimButtons().length > 0, claimClicked: runtime.claimClicked, timestamp: Date.now()
    }
    const signature = JSON.stringify({ ...state, timestamp: 0 })
    if (force || signature !== runtime.lastSignature || Date.now() - runtime.lastEmitAt > 30000) {
      runtime.lastSignature = signature; runtime.lastEmitAt = Date.now()
      window.__TAURI_INTERNALS__?.invoke('plugin:event|emit', { event: 'twitch-miner-state', payload: state }).catch(() => {})
    }
    return state
  }
  runtime.report = report
  runtime.scan = () => {
    try {
      if (role === 'stream') minerChannel?.postMessage({ role, sessionId: settings.sessionId })
      forceMute(); playback(); lowQuality(); claim()
      const state = report()
      // Only timed scans advance the failover counter; UI refreshes cannot accelerate it.
      runtime.offlineTicks = role === 'stream' && state.offline && settings.autoFailover ? runtime.offlineTicks + 1 : 0
      if (runtime.offlineTicks >= 6) location.assign(settings.fallbackUrl)
      if (role === 'control' && state.loggedIn === true && !onInventory() && !location.pathname.startsWith('/settings')) {
        runtime.loginTicks = (runtime.loginTicks || 0) + 1
        if (runtime.loginTicks >= 2) location.assign('https://www.twitch.tv/drops/inventory')
      }
      if (onInventory() && state.loggedIn === true) {
        runtime.reloadTicks = (runtime.reloadTicks || 0) + 1
        if (runtime.reloadTicks >= 9 && !runtime.claimClicked && !document.querySelector('input:focus, textarea:focus')) location.reload()
      }
      selectDirectory()
    } catch (_) { /* Twitch can replace DOM nodes during SPA navigation; retry next scan. */ }
  }
  const start = () => {
    new MutationObserver(forceMute).observe(document.documentElement, { childList: true, subtree: true })
    runtime.scan(); setInterval(runtime.scan, 10000)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
