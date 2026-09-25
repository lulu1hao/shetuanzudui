import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export const TWITCH_MINER_STATE_EVENT = 'twitch-miner-state'

export const isTauriDrops = () => {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__)
}
const isTauri = isTauriDrops
const desktopOnly = () => { throw new Error('请在桌面客户端使用此功能；浏览器预览不支持独立账户和后台挂宝') }
export const getTwitchAccounts = () => isTauri() ? invoke('get_twitch_accounts') : desktopOnly()
export const createTwitchAccount = name => isTauri() ? invoke('create_twitch_account', { name }) : desktopOnly()
export const switchTwitchAccount = accountId => isTauri() ? invoke('switch_twitch_account', { accountId }) : desktopOnly()
export const updateTwitchAccountBinding = (accountId, twitchUsername) => isTauri() ? invoke('update_twitch_account_binding', { accountId, twitchUsername }) : desktopOnly()
export const renameTwitchAccount = (accountId, name) => isTauri() ? invoke('rename_twitch_account', { accountId, name }) : desktopOnly()
export const deleteTwitchAccount = accountId => isTauri() ? invoke('delete_twitch_account', { accountId }) : desktopOnly()

/**
 * 获取挂宝窗口当前状态
 */
export async function getTwitchMinerStatus() {
  if (!isTauri()) {
    return {
      exists: false,
      visible: false,
      url: ''
    }
  }

  return invoke('get_twitch_miner_status')
}

/**
 * 打开或唤起挂宝窗口
 * @param {string} targetUrl 目标 Twitch 直播或活动链接
 * @param {boolean} show 是否立即显示窗口
 * @param {object} options 挂机策略与代理设置
 */
export async function openTwitchMinerWindow(targetUrl, show = false, options = {}) {
  if (!isTauri()) {
    return desktopOnly()
  }

  try {
    const result = await invoke('open_twitch_miner_window', {
      targetUrl: targetUrl || null,
      show: Boolean(show),
      options
    })
    return result
  } catch (err) {
    console.error('[twitchDropsApi] open_twitch_miner_window error:', err)
    throw err
  }
}

/**
 * 显示与挂机窗口共享登录态的 Twitch 登录/掉宝中心。
 */
export async function showTwitchLoginWindow(options = {}, login = false) {
  if (!isTauri()) {
    return desktopOnly()
  }
  return invoke('show_twitch_login_window', { options, login })
}

export async function ensureTwitchControlWindow(options = {}) {
  if (!isTauri()) return desktopOnly()
  return invoke('ensure_twitch_control_window', { options })
}

/**
 * 订阅 WebView2 内的真实播放、登录和掉宝状态。
 */
export async function listenTwitchMinerState(handler) {
  if (!isTauri()) return () => {}
  return listen(TWITCH_MINER_STATE_EVENT, (event) => handler(event.payload))
}

export async function refreshTwitchMinerState() {
  if (!isTauri()) return
  return invoke('refresh_twitch_miner_state')
}

/**
 * 切换挂宝视窗显示/隐蔽（后台静默）
 */
export async function toggleTwitchMinerWindow() {
  if (!isTauri()) return desktopOnly()

  try {
    return await invoke('toggle_twitch_miner_window')
  } catch (err) {
    console.error('[twitchDropsApi] toggle_twitch_miner_window error:', err)
    throw err
  }
}

/**
 * 关闭挂宝视窗
 */
export async function closeTwitchMinerWindow() {
  if (!isTauri()) return desktopOnly()

  try {
    return await invoke('close_twitch_miner_window')
  } catch (err) {
    console.error('[twitchDropsApi] close_twitch_miner_window error:', err)
    throw err
  }
}

/**
 * 测试 Twitch 网络连通性 (直连及本地代理隧道)
 * @param {string} proxyHost 代理主机 (如 127.0.0.1)
 * @param {number} proxyPort 代理端口 (如 7890)
 */
export async function testTwitchNetwork(proxyHost = null, proxyPort = null) {
  if (!isTauri()) return desktopOnly()

  try {
    return await invoke('test_twitch_network', {
      proxyHost: proxyHost ? String(proxyHost).trim() : null,
      proxyPort: proxyPort ? Number(proxyPort) : null
    })
  } catch (err) {
    console.error('[twitchDropsApi] test_twitch_network error:', err)
    throw err
  }
}
