import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { ref, computed, nextTick } from 'vue'
import {
  GAME_OPTIONS,
  normalizeChannel,
  validateProxyPort,
  acceptsMinerEvent,
  normalizeRewards,
  normalizeAccounts,
  getAccountDisplayLabel,
  matchGameCampaign
} from '../../src/utils/twitchDropsModel.js'

test('channel IDs and official URLs validate; function pages and deceptive URLs fail', () => {
  for (const [input, expected] of [[' ottr_ ', 'ottr_'], ['https://www.twitch.tv/ottr_/?x=1', 'ottr_'], ['', '']]) assert.equal(normalizeChannel(input), expected)
  for (const value of ['drops', 'https://twitch.tv.evil.com/name', 'https://user:pass@twitch.tv/name', 'http://twitch.tv/name', 'https://twitch.tv/directory/category/rust', 'hello world']) assert.throws(() => normalizeChannel(value))
})
test('ports reject decimal, empty, zero and out-of-range input', () => {
  for (const value of ['', 0, 1.5, 65536, 'abc']) assert.throws(() => validateProxyPort(value))
  assert.equal(validateProxyPort('7890'), 7890)
})
test('events must belong to the active account AND session', () => {
  assert.equal(acceptsMinerEvent({ role: 'control', accountId: 'a', sessionId: 1 }, 'a', 1), true)
  assert.equal(acceptsMinerEvent({ role: 'control', accountId: 'a', sessionId: 1 }, 'b', 1), false)
  assert.equal(acceptsMinerEvent({ role: 'control', accountId: 'a', sessionId: 1 }, 'a', 2), false)
})
test('missing progress remains unknown and claim clicks never imply claimed', () => {
  const [reward] = normalizeRewards([{ id: 'x', name: 'Official', progress: null, canClaim: true, claimed: false }])
  assert.equal(reward.progress, null); assert.equal(reward.claimed, false)
})

const composableSource = readFileSync(new URL('../../src/composables/useTwitchDrops.js', import.meta.url), 'utf8')
  .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?/g, '')
  .replace(/import\s+.*?;?\r?\n/g, '')
  .replace('export function useTwitchDrops', 'function useTwitchDrops')
async function harness(overrides = {}, mount = true) {
  const hooks = {}, timers = new Set(), calls = []
  let listener
  const status = { running: false, stream: { visible: false }, accountId: 'default', sessionId: 1 }
  const api = {
    isTauriDrops: () => true,
    listenTwitchMinerState: async fn => { listener = fn; return () => calls.push(['unlisten']) },
    getTwitchAccounts: async () => ({ accounts: [{ id: 'default', name: '默认账户' }, { id: 'b', name: '小号' }], activeId: 'default', sessionId: 1 }),
    getTwitchMinerStatus: async () => ({ ...status }), refreshTwitchMinerState: async () => {},
    openTwitchMinerWindow: async (...args) => { calls.push(['start', ...args]); status.running = true; return { ...status } },
    ensureTwitchControlWindow: async options => { calls.push(['inventory', options]); return { ...status } },
    closeTwitchMinerWindow: async () => { calls.push(['stop']); status.running = false; status.sessionId++; },
    showTwitchLoginWindow: async (...args) => { calls.push(['login', ...args]); return { ...status } },
    switchTwitchAccount: async id => { calls.push(['switch', id]); status.accountId = id; status.sessionId++; status.running = false; return { accounts: [{ id: 'default', name: '默认账户' }, { id: 'b', name: '小号' }], activeId: id, sessionId: status.sessionId } },
    createTwitchAccount: async name => { calls.push(['create', name]); status.accountId = 'new'; status.sessionId++; status.running = false; return { accounts: [{ id: 'default', name: '默认账户' }, { id: 'new', name }], activeId: 'new', sessionId: status.sessionId } },
    updateTwitchAccountBinding: async (id, u) => {
      calls.push(['bind', id, u])
      return { accounts: [{ id: 'default', name: '默认账户', twitchUsername: u }, { id: 'b', name: '小号' }], activeId: id, sessionId: status.sessionId }
    },
    renameTwitchAccount: async (id, name) => {
      calls.push(['rename', id, name])
      return { accounts: [{ id, name }], activeId: id, sessionId: status.sessionId }
    },
    deleteTwitchAccount: async id => {
      calls.push(['delete', id])
      return { accounts: [{ id: 'default', name: '默认账户' }], activeId: 'default', sessionId: status.sessionId }
    },
    toggleTwitchMinerWindow: async () => { status.stream.visible = !status.stream.visible; return status.stream.visible },
    testTwitchNetwork: async () => ({ direct: { reachable: false, message: 'TCP 失败' }, proxy: null }),
    ...overrides
  }
  const context = {
    api, ref, computed, nextTick, watch: () => {}, onMounted: fn => { hooks.mount = fn }, onUnmounted: fn => { hooks.unmount = fn },
    useToast: () => ({ showToast: text => calls.push(['toast', text]) }),
    GAME_OPTIONS, normalizeChannel, validateProxyPort, acceptsMinerEvent, normalizeRewards,
    normalizeAccounts, getAccountDisplayLabel, matchGameCampaign,
    localStorage: { getItem: () => null, setItem: () => {} }, setInterval: fn => { timers.add(fn); return fn }, clearInterval: fn => timers.delete(fn)
  }
  const model = vm.runInNewContext(`${composableSource}; useTwitchDrops()`, context)
  if (mount) await hooks.mount()
  return { model, api, calls, status, hooks, timers, emit: payload => listener(payload) }
}
test('startup uses unsaved input, always monitors inventory when auto-claim is off, and stops cleanly', async () => {
  const h = await harness(); h.model.inputChannelName.value = 'https://twitch.tv/ottr_'; h.model.strategyOptions.value.autoClaim = false
  await h.model.handleToggleMiner()
  assert.equal(h.calls.find(c => c[0] === 'start')[1], 'https://www.twitch.tv/ottr_')
  assert.equal(h.calls.find(c => c[0] === 'inventory')[1].autoClaim, false)
  assert.equal(h.model.isMinerRunning.value, true)
  await h.model.handleToggleMiner()
  assert.equal(h.model.isMinerRunning.value, false); assert.equal(h.model.isBusy.value, false)
})
test('bad channel and proxy input never invoke startup', async () => {
  const h = await harness(); h.model.inputChannelName.value = 'https://evil.test/a'
  await h.model.handleToggleMiner(); assert.equal(h.calls.some(c => c[0] === 'start'), false)
  h.model.inputChannelName.value = ''; h.model.selectedNetMode.value = 'proxy'; h.model.proxyPort.value = 7890.5
  await h.model.handleToggleMiner(); assert.equal(h.calls.some(c => c[0] === 'start'), false)
})
test('start failure unlocks UI and preserves actionable error', async () => {
  const h = await harness({ openTwitchMinerWindow: async () => { throw new Error('WebView 创建失败') } })
  await h.model.handleToggleMiner()
  assert.equal(h.model.isBusy.value, false); assert.equal(h.model.isToggling.value, false); assert.match(h.model.lastError.value, /WebView/)
})
test('double startup clicks only create one miner', async () => {
  let resolve, count = 0
  const h = await harness({ openTwitchMinerWindow: () => { count++; return new Promise(r => { resolve = r }) } })
  const pending = h.model.handleToggleMiner(); await Promise.resolve(); await h.model.handleToggleMiner()
  assert.equal(count, 1); resolve({ running: true, accountId: 'default', sessionId: 1 }); await pending
})
test('switch clears previous progress and ignores late reports, then logs in the selected account', async () => {
  const h = await harness()
  h.emit({ role: 'control', accountId: 'default', sessionId: 1, loggedIn: true, username: 'old', rewards: [{ id: 'x', name: 'Old reward', progress: 50 }] })
  assert.equal(h.model.currentCampaign.value.rewards.length, 1)
  h.model.selectedAccountId.value = 'b'; await h.model.handleSwitchAccount()
  assert.equal(h.model.activeAccountId.value, 'b'); assert.equal(h.model.currentCampaign.value.rewards.length, 0)
  h.emit({ role: 'control', accountId: 'default', sessionId: 1, loggedIn: true, rewards: [{ id: 'x', name: 'Old reward', progress: 99 }] })
  assert.equal(h.model.currentCampaign.value.rewards.length, 0)
  assert.equal(h.calls.find(c => c[0] === 'login')[1].accountId, 'b')
})
test('switch failure restores selection and keeps the original account', async () => {
  const h = await harness({ switchTwitchAccount: async () => { throw new Error('关闭失败') } })
  h.model.selectedAccountId.value = 'b'; await h.model.handleSwitchAccount()
  assert.equal(h.model.selectedAccountId.value, 'default'); assert.equal(h.model.activeAccountId.value, 'default')
})
test('new account is retained when opening its login window fails', async () => {
  const h = await harness({ showTwitchLoginWindow: async () => { throw new Error('网络失败') } })
  h.model.accountName.value = '测试账户'; await h.model.handleAddAccount()
  assert.equal(h.model.activeAccountId.value, 'new'); assert.equal(h.model.accounts.value.length, 2); assert.equal(h.model.isBusy.value, false)
})
test('login, refresh, viewer, channel cycling and network buttons call the right operations', async () => {
  const h = await harness()
  await h.model.handleLogin(); assert.equal(h.calls.find(c => c[0] === 'login')[2], true)
  await h.model.handleRefreshAccount(); assert.ok(h.calls.find(c => c[0] === 'inventory'))
  await h.model.handleToggleViewer(); assert.equal(h.model.isViewerVisible.value, true)
  h.model.quickSelectChannel('Ottr_'); h.model.cycleNextChannel(); assert.equal(h.model.inputChannelName.value, 'THEFINALS_Official')
  h.model.selectedGame.value = 'rust'; h.model.handleGameChange(); assert.equal(h.model.inputChannelName.value, '')
  await h.model.checkNetworkConnectivity(); assert.match(h.model.netStatusText.value, /失败/)
})
test('browser preview never marks a mock miner or network as successful', async () => {
  const h = await harness({ isTauriDrops: () => false, openTwitchMinerWindow: async () => { throw new Error('请使用桌面客户端') } })
  await h.model.handleToggleMiner(); assert.equal(h.model.isMinerRunning.value, false)
})
test('unmount during initialization releases listener and creates no poll timers', async () => {
  let release
  const h = await harness({ listenTwitchMinerState: () => new Promise(r => { release = r }) }, false)
  const pending = h.hooks.mount(); h.hooks.unmount(); let unlistened = false
  release(() => { unlistened = true }); await pending
  assert.equal(unlistened, true); assert.equal(h.timers.size, 0)
})

const scriptSource = readFileSync(new URL('../../src-tauri/src/twitch_miner.js', import.meta.url), 'utf8')
function scriptHarness({ role = 'control', path = '/drops/inventory', login = true, buttons = [], cards = [], video = null, offline = false, mining = true, settings = {} } = {}) {
  const events = [], destinations = [], timeouts = [], intervals = []
  const document = {
    cookie: 'login=tester; unrelated=value', readyState: 'complete', documentElement: {},
    querySelector(selector) {
      if (selector === '[data-a-target="user-menu-toggle"]') return login ? {} : null
      if (selector === '[data-a-target="login-button"]') return login ? null : {}
      if (selector === 'video') return video
      if (selector === '[data-a-target="offline-channel-main-content"]') return offline ? {} : null
      return null
    },
    querySelectorAll(selector) {
      if (selector === 'button') return buttons
      if (selector === 'video, audio') return video ? [video] : []
      if (selector.includes('drops-inventory-card')) return cards
      return []
    }
  }
  const window = { __TAURI_INTERNALS__: { invoke: async (_, event) => { events.push(event.payload) } } }
  const context = { window, document, location: { hostname: 'www.twitch.tv', pathname: path, href: `https://www.twitch.tv${path}`, assign: url => destinations.push(url), reload: () => destinations.push('reload') },
    BroadcastChannel: class { set onmessage(handler) { if (mining) handler({ data: { role: 'stream', sessionId: 2 } }) } postMessage() {} },
    MutationObserver: class { observe() {} }, setTimeout: fn => timeouts.push(fn), setInterval: fn => intervals.push(fn), URL }
  const source = scriptSource.replace('__LULU_ROLE__', JSON.stringify(role)).replace('__LULU_SETTINGS__', JSON.stringify({ autoClaim: true, autoFailover: true, muteAudio: true, lowResource: false, fallbackUrl: 'https://www.twitch.tv/directory/category/rust?tl=DropsEnabled', accountId: 'a', sessionId: 2, ...settings }))
  vm.runInNewContext(source, context)
  return { runtime: window.__LULU_DROPS_MINER__, events, destinations, timeouts, intervals }
}
test('miner auto-claim is restricted to inventory and throttled, never marks reward as claimed', () => {
  let clicks = 0
  const button = { textContent: 'Claim Now', disabled: false, getAttribute: () => null, click: () => clicks++ }
  const h = scriptHarness({ buttons: [button] }); h.runtime.scan(); h.runtime.scan()
  assert.equal(clicks, 1); assert.equal(h.events[0].claimClicked, true); assert.equal(h.events[0].accountId, 'a')
  scriptHarness({ buttons: [button], path: '/channel' }); assert.equal(clicks, 1)
  scriptHarness({ buttons: [button], settings: { autoClaim: false } }); assert.equal(clicks, 1)
  scriptHarness({ buttons: [button], login: false }); assert.equal(clicks, 1)
  scriptHarness({ buttons: [button], mining: false }); assert.equal(clicks, 1)
})
test('missing aria progress stays unknown instead of being coerced to zero', () => {
  const card = { getAttribute: () => 'reward', querySelectorAll: () => [], querySelector: selector => {
    if (selector.includes('h3')) return { textContent: 'Official reward' }
    if (selector === '[role="progressbar"]') return { getAttribute: () => null, style: {} }
    return null
  } }
  const h = scriptHarness({ cards: [card] }); assert.equal(h.events[0].rewards[0].progress, null)
})
test('state refreshes cannot accelerate offline failover; disabling it is respected', () => {
  const h = scriptHarness({ role: 'stream', path: '/offline_stream', offline: true })
  for (let i = 0; i < 20; i++) h.runtime.report(true)
  assert.equal(h.destinations.length, 0)
  for (let i = 0; i < 5; i++) h.runtime.scan()
  assert.equal(h.destinations.length, 1)
  const disabled = scriptHarness({ role: 'stream', path: '/offline_stream', offline: true, settings: { autoFailover: false } })
  for (let i = 0; i < 10; i++) disabled.runtime.scan()
  assert.equal(disabled.destinations.length, 0)
})
test('muting and quality report use actual player state', () => {
  const video = { muted: false, volume: 1, videoHeight: 720, paused: false, readyState: 4 }
  const h = scriptHarness({ role: 'stream', path: '/tester', video })
  assert.equal(video.muted, true); assert.equal(h.events[0].quality, '720p'); assert.equal(h.events[0].playing, true)
})

test('account automatically binds twitch username and updates label', async () => {
  const h = await harness()
  h.emit({ role: 'control', accountId: 'default', sessionId: 1, loggedIn: true, username: 'ottr_player' })
  await Promise.resolve()
  assert.equal(h.calls.some(c => c[0] === 'bind' && c[1] === 'default' && c[2] === 'ottr_player'), true)
})

test('single-step selectAndSwitchAccount switches account without secondary confirmation', async () => {
  const h = await harness()
  await h.model.selectAndSwitchAccount('b')
  assert.equal(h.model.activeAccountId.value, 'b')
  assert.equal(h.calls.some(c => c[0] === 'switch' && c[1] === 'b'), true)
  assert.equal(h.calls.some(c => c[0] === 'login'), true)
})

test('game drops campaign matching accurately reflects active and inactive status', () => {
  const finalsGame = GAME_OPTIONS.find(g => g.key === 'the-finals')
  const matched = matchGameCampaign(finalsGame, [{ game: 'THE FINALS', name: 'S4 Community Drops', status: 'ACTIVE' }])
  assert.equal(matched.active, true)
  assert.equal(matched.status, 'active')
  assert.match(matched.title, /Community Drops/)

  const inactive = matchGameCampaign(finalsGame, [], [], false)
  assert.equal(inactive.active, false)
  assert.equal(inactive.status, 'inactive')

  const standby = matchGameCampaign(finalsGame, [], [], null)
  assert.equal(standby.active, false)
  assert.equal(standby.status, 'standby')
})
