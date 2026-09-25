import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as api from '../utils/twitchDropsApi.js'
import {
  GAME_OPTIONS,
  normalizeChannel,
  validateProxyPort,
  acceptsMinerEvent,
  normalizeRewards,
  normalizeAccounts,
  getAccountDisplayLabel,
  matchGameCampaign
} from '../utils/twitchDropsModel.js'
import { useToast } from './useToast.js'

export function useTwitchDrops() {
  const { showToast } = useToast()
  const terminalRef = ref(null), channelInputRef = ref(null)
  const isMinerRunning = ref(false), isViewerVisible = ref(false), isLoggedIn = ref(null)
  const isToggling = ref(false), isTestingNet = ref(false), busyAction = ref(''), initializing = ref(true)
  const isBusy = computed(() => initializing.value || Boolean(busyAction.value))
  const settingsLocked = computed(() => isBusy.value || isMinerRunning.value || isTestingNet.value)

  // 账户状态管理
  const accounts = ref([]), activeAccountId = ref(''), selectedAccountId = ref(''), accountName = ref(''), username = ref('')
  const sessionId = ref(null), accountReady = ref(false)
  const isAccountMenuOpen = ref(false), isAddingAccount = ref(false)
  const activeAccount = computed(() => accounts.value.find(a => a.id === activeAccountId.value) || accounts.value[0] || null)

  // 游戏与掉宝活动状态
  const selectedGame = ref('the-finals'), selectedNetMode = ref('system'), proxyPort = ref(7890)
  const game = computed(() => GAME_OPTIONS.find(g => g.key === selectedGame.value) || GAME_OPTIONS[0])
  const inputChannelName = ref(''), isAutoChannel = ref(true)
  const sampleChannels = computed(() => game.value.channels)
  const activeChannel = ref({ name: '自动选择在线频道', viewers: '--' })
  const channelCategory = computed(() => game.value.label)
  const strategyOptions = ref({ lowResource: true, muteAudio: true, autoClaim: true, autoFailover: true })
  const emptyStream = () => ({ playing: false, muted: null, videoFound: false, offline: false, quality: '' })
  const streamState = ref(emptyStream()), controlState = ref({ rewards: [], canClaim: false })
  const capturedCampaigns = ref([]), directoryDropsFound = ref(null)

  // 计算当前游戏的掉宝活动感知状态
  const gameDropsStatus = computed(() => {
    return matchGameCampaign(game.value, capturedCampaigns.value, controlState.value.rewards, directoryDropsFound.value)
  })

  const netProbe = ref({ direct: { reachable: null, latency_ms: 0, message: '尚未检测' }, proxy: null })
  const networkChecked = ref(false), activeRewardsTab = ref('current'), logs = ref([]), lastError = ref('')
  const currentCampaign = computed(() => ({ rewards: controlState.value.rewards }))
  const activeReward = computed(() => currentCampaign.value.rewards.find(r => !r.claimed) || currentCampaign.value.rewards.at(-1) || { id: '', name: '等待官方库存同步', progress: null })

  // 账户状态显示：展示本地别名 + 真实绑定的老鼠台账号
  const accountStatus = computed(() => {
    const cur = activeAccount.value
    if (isLoggedIn.value === true) {
      const u = username.value || cur?.twitchUsername
      return `已登录${u ? ` · @${u}` : ''}`
    }
    if (isLoggedIn.value === false) return '未登录 / 会话已失效'
    if (cur?.twitchUsername) return `待唤起 · @${cur.twitchUsername}`
    return '登录状态待确认'
  })

  const engineStatus = computed(() => !isMinerRunning.value ? '引擎待命' : isLoggedIn.value === false ? '等待 Twitch 登录' : streamState.value.offline ? '主播已离线' : streamState.value.playing ? '直播播放中' : '正在等待直播播放')
  const netStatusText = computed(() => {
    if (isTestingNet.value) return '网络检测中'
    if (!networkChecked.value) return api.isTauriDrops() ? '网络尚未检测' : '浏览器预览 · 无法检测'
    if (selectedNetMode.value === 'proxy') return netProbe.value.proxy?.tunnel_ok ? `代理隧道连通 · ${netProbe.value.proxy.latency_ms}ms` : '代理连接失败'
    return netProbe.value.direct.reachable ? `TCP 连通 · ${netProbe.value.direct.latency_ms}ms` : '直连失败，请检查网络'
  })

  let disposed = false, statusTimer, unlisten, lastClaimAt = 0, pollBusy = false
  const appendLog = (level, tag, message) => {
    if (disposed) return
    logs.value.push({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), level, tag, message })
    if (logs.value.length > 200) logs.value.splice(0, logs.value.length - 200)
    nextTick(() => { if (terminalRef.value) terminalRef.value.scrollTop = terminalRef.value.scrollHeight })
  }
  const fail = (tag, error) => {
    lastError.value = error?.message || String(error)
    appendLog('error', tag, lastError.value); showToast(lastError.value, 'none', 5000)
  }
  function resetSession() {
    isMinerRunning.value = false; isViewerVisible.value = false; isLoggedIn.value = null; username.value = ''
    streamState.value = emptyStream(); controlState.value = { rewards: [], canClaim: false }; lastClaimAt = 0
  }
  function applyAccounts(result) {
    accounts.value = normalizeAccounts(result.accounts)
    activeAccountId.value = result.activeId
    selectedAccountId.value = result.activeId
    sessionId.value = result.sessionId
    accountReady.value = true
  }
  function applyStatus(status, restore = false) {
    if (status.accountId && activeAccountId.value && status.accountId !== activeAccountId.value) return
    if (sessionId.value !== status.sessionId) { resetSession(); sessionId.value = status.sessionId }
    isMinerRunning.value = Boolean(status.running ?? status.exists)
    isViewerVisible.value = Boolean(status.stream?.visible ?? status.visible)
    if (restore && status.options) {
      const options = status.options
      for (const key of Object.keys(strategyOptions.value)) strategyOptions.value[key] = options[key] ?? strategyOptions.value[key]
      selectedGame.value = GAME_OPTIONS.find(g => g.url === options.fallbackUrl)?.key || selectedGame.value
      selectedNetMode.value = options.proxyUrl ? 'proxy' : 'system'
      if (options.proxyUrl) proxyPort.value = Number(new URL(options.proxyUrl).port)
      try {
        const name = normalizeChannel(status.url || '')
        if (name) { activeChannel.value.name = name; inputChannelName.value = name; isAutoChannel.value = false }
      } catch { /* A directory is expected while automatically selecting a streamer. */ }
    }
  }
  const buildMinerOptions = () => ({
    ...strategyOptions.value, accountId: activeAccountId.value, fallbackUrl: game.value.url,
    proxyUrl: selectedNetMode.value === 'proxy' ? `http://127.0.0.1:${validateProxyPort(proxyPort.value)}` : null
  })
  async function syncStatus(restore = false) {
    const status = await api.getTwitchMinerStatus()
    if (!disposed) applyStatus(status, restore)
    return status
  }
  async function runAction(name, action) {
    if (isBusy.value) return
    busyAction.value = name; lastError.value = ''
    try { await action() } catch (error) { fail(name, error) }
    finally { busyAction.value = '' }
  }
  const handleApplyChannel = () => {
    if (settingsLocked.value) return false
    try {
      const name = normalizeChannel(inputChannelName.value)
      lastError.value = ''
      inputChannelName.value = name; isAutoChannel.value = !name; activeChannel.value.name = name || '自动选择在线频道'
      appendLog('info', 'CHANNEL', name ? `已选择 ${name}，启动时将进入该频道；在线与掉宝资格以 Twitch 为准` : '启动时将从所选游戏的掉宝分区选择在线频道')
      return true
    } catch (error) { fail('CHANNEL', error); return false }
  }
  const quickSelectChannel = name => { if (!settingsLocked.value) { inputChannelName.value = name; handleApplyChannel() } }
  const cycleNextChannel = () => {
    if (!sampleChannels.value.length) { quickSelectChannel(''); showToast('此分区将自动选择在线频道'); return }
    const index = sampleChannels.value.findIndex(n => n.toLowerCase() === activeChannel.value.name.toLowerCase())
    quickSelectChannel(sampleChannels.value[(index + 1) % sampleChannels.value.length])
  }
  const handleGameChange = () => {
    inputChannelName.value = ''
    isAutoChannel.value = true
    activeChannel.value.name = '自动选择在线频道'
    directoryDropsFound.value = null
    lastError.value = ''
  }
  const handleNetModeChange = () => { networkChecked.value = false; netProbe.value.proxy = null; checkNetworkConnectivity() }
  const handleProxyPortChange = () => {
    try { proxyPort.value = validateProxyPort(proxyPort.value); networkChecked.value = false; checkNetworkConnectivity() }
    catch (error) { fail('PROXY', error) }
  }
  async function checkNetworkConnectivity() {
    if (isTestingNet.value || isBusy.value) return
    isTestingNet.value = true; networkChecked.value = false
    try {
      const proxy = selectedNetMode.value === 'proxy'
      const result = await api.testTwitchNetwork(proxy ? '127.0.0.1' : null, proxy ? validateProxyPort(proxyPort.value) : null)
      netProbe.value = result; networkChecked.value = true
      appendLog(result.direct.reachable ? 'success' : 'warn', 'NETWORK', result.direct.message)
      if (result.proxy) appendLog(result.proxy.tunnel_ok ? 'success' : 'warn', 'PROXY', result.proxy.message)
    } catch (error) { fail('NETWORK', error) }
    finally { isTestingNet.value = false }
  }
  const openCenter = async (login = false) => {
    const status = await api.showTwitchLoginWindow(buildMinerOptions(), login)
    applyStatus(status)
    await api.refreshTwitchMinerState()
    appendLog('info', 'AUTH', login ? '请在 Twitch 官方窗口完成登录和验证码；关闭窗口可保留登录会话' : '已打开当前账户的官方掉宝库存，可领取奖励及检查游戏账户绑定')
  }
  const handleLogin = () => runAction('AUTH', () => openCenter(isLoggedIn.value !== true))
  const handleManualClaim = () => runAction('INVENTORY', () => openCenter(false))

  // 一体化单步卡槽切换：直接切换并关闭下拉舱
  const selectAndSwitchAccount = (targetId) => runAction('ACCOUNT', async () => {
    if (!targetId || targetId === activeAccountId.value) {
      isAccountMenuOpen.value = false
      return
    }
    try {
      applyAccounts(await api.switchTwitchAccount(targetId))
      resetSession()
      isAccountMenuOpen.value = false
      const cur = activeAccount.value
      appendLog('info', 'ACCOUNT', `已切换至卡槽：${cur?.name || targetId}${cur?.twitchUsername ? ` (@${cur.twitchUsername})` : ''}；旧卡槽任务已平稳停止`)
      await openCenter(false)
    } finally {
      selectedAccountId.value = activeAccountId.value
      await syncStatus().catch(() => {})
    }
  })

  // 兼容老调用
  const handleSwitchAccount = () => selectAndSwitchAccount(selectedAccountId.value)

  // 添加新账户卡槽
  const handleAddAccount = (customName) => runAction('ACCOUNT', async () => {
    const name = String(customName || accountName.value).trim()
    if (!name || Array.from(name).length > 40) throw new Error('请输入 1–40 个字符的账户备注')
    try {
      applyAccounts(await api.createTwitchAccount(name))
      resetSession()
      accountName.value = ''
      isAddingAccount.value = false
      isAccountMenuOpen.value = false
      appendLog('info', 'ACCOUNT', `已创建独立卡槽：${name}。密码与验证码仅在官方窗口填写`)
      await openCenter(true)
    } finally {
      await syncStatus().catch(() => {})
    }
  })

  // 修改卡槽备注名
  const handleRenameAccount = (accountId, name) => runAction('ACCOUNT', async () => {
    const trimmed = String(name || '').trim()
    if (!trimmed || Array.from(trimmed).length > 40) throw new Error('账户备注需为 1–40 个字符')
    applyAccounts(await api.renameTwitchAccount(accountId, trimmed))
    appendLog('info', 'ACCOUNT', `已将卡槽备注修改为：${trimmed}`)
  })

  // 删除卡槽
  const handleDeleteAccount = (accountId) => runAction('ACCOUNT', async () => {
    if (accounts.value.length <= 1) throw new Error('至少保留一个挂宝卡槽')
    applyAccounts(await api.deleteTwitchAccount(accountId))
    resetSession()
    appendLog('info', 'ACCOUNT', '已删除指定挂宝卡槽')
  })

  const handleRefreshAccount = () => runAction('SYNC', async () => {
    applyAccounts(await api.getTwitchAccounts())
    const status = await api.ensureTwitchControlWindow(buildMinerOptions()); applyStatus(status)
    await api.refreshTwitchMinerState()
    appendLog('info', 'SYNC', '已请求同步当前账户登录态与官方掉宝库存')
  })

  const toggleAccountMenu = () => {
    if (isBusy.value) return
    isAccountMenuOpen.value = !isAccountMenuOpen.value
    if (!isAccountMenuOpen.value) isAddingAccount.value = false
  }
  const closeAccountMenu = () => {
    isAccountMenuOpen.value = false
    isAddingAccount.value = false
  }

  const handleToggleViewer = () => runAction('VIEWER', async () => {
    isViewerVisible.value = await api.toggleTwitchMinerWindow()
    appendLog('info', 'VIEWER', isViewerVisible.value ? '已显示直播视窗' : '直播视窗已隐藏，任务继续运行')
  })

  const handleToggleMiner = async () => {
    if (isBusy.value || isTestingNet.value) return
    if (!isMinerRunning.value && !handleApplyChannel()) return
    isToggling.value = true
    await runAction('ENGINE', async () => {
      try {
        if (isMinerRunning.value) {
          await api.closeTwitchMinerWindow(); resetSession(); await syncStatus()
          appendLog('info', 'ENGINE', '挂宝与自动领取已停止，登录会话保留')
        } else {
          const options = buildMinerOptions()
          applyStatus(await api.openTwitchMinerWindow(isAutoChannel.value ? game.value.url : `https://www.twitch.tv/${activeChannel.value.name}`, false, options))
          appendLog('info', 'ENGINE', '直播窗口已启动，等待 Twitch 确认播放与登录状态')
          try {
            applyStatus(await api.ensureTwitchControlWindow(options))
          } catch (error) { fail('INVENTORY', new Error(`直播已启动，但库存监控未就绪：${error.message || error}`)) }
          await api.refreshTwitchMinerState()
        }
      } finally { await syncStatus().catch(() => {}) }
    })
    isToggling.value = false
  }

  function handleMinerState(state) {
    if (disposed || !acceptsMinerEvent(state, activeAccountId.value, sessionId.value)) return
    if (typeof state.loggedIn === 'boolean' && (state.role === 'control' || isLoggedIn.value === null)) {
      const before = isLoggedIn.value
      isLoggedIn.value = state.loggedIn
      username.value = state.loggedIn ? state.username || '' : ''
      if (before !== state.loggedIn) {
        appendLog(state.loggedIn ? 'success' : 'warn', 'AUTH', state.loggedIn ? `Twitch 登录已确认 @${state.username || ''}` : '请点击账户登录，在官方窗口完成登录 / 2FA')
      }
      if (!state.loggedIn) controlState.value = { rewards: [], canClaim: false }

      // 自动绑定老鼠台账号到当前激活卡槽
      if (state.loggedIn && state.username && activeAccountId.value) {
        const cur = activeAccount.value
        if (cur && cur.twitchUsername !== state.username) {
          api.updateTwitchAccountBinding(activeAccountId.value, state.username).then(res => {
            if (res && res.accounts) applyAccounts(res)
            appendLog('success', 'ACCOUNT', `已将本地卡槽 [${cur.name}] 绑定至 Twitch 用户 @${state.username}`)
          }).catch(err => console.error('[useTwitchDrops] failed to update binding:', err))
        }
      }
    }
    if (Array.isArray(state.campaigns) && state.campaigns.length > 0) {
      capturedCampaigns.value = state.campaigns
    }
    if (typeof state.directoryDrops === 'boolean') {
      directoryDropsFound.value = state.directoryDrops
    }
    if (state.role === 'stream') {
      const before = streamState.value
      streamState.value = state
      if (state.channel) activeChannel.value.name = state.channel
      if (state.playing && !before.playing) appendLog('success', 'PLAYER', `正在播放 ${state.channel || ''} · ${state.quality || '画质待确认'}`)
      if (state.offline && !before.offline) appendLog('warn', 'PLAYER', strategyOptions.value.autoFailover ? '主播离线，确认后将自动返回掉宝分区' : '主播离线，自动轮转已关闭')
    } else {
      controlState.value = { ...state, rewards: state.loggedIn === true ? normalizeRewards(state.rewards) : [] }
      if (state.claimClicked && Date.now() - lastClaimAt > 15000) {
        lastClaimAt = Date.now(); appendLog('info', 'CLAIM', '已点击 Twitch 领取按钮，等待官方确认结果')
      }
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem('lulu.drops.settings') || '{}')
    if (GAME_OPTIONS.some(g => g.key === saved.game)) selectedGame.value = saved.game
    if (['proxy', 'system'].includes(saved.network)) selectedNetMode.value = saved.network
    if (saved.port) proxyPort.value = validateProxyPort(saved.port)
    for (const key of Object.keys(strategyOptions.value)) if (typeof saved.strategy?.[key] === 'boolean') strategyOptions.value[key] = saved.strategy[key]
  } catch { /* Invalid saved settings fall back to safe defaults. */ }

  watch([selectedGame, selectedNetMode, proxyPort, strategyOptions], () => {
    try { localStorage.setItem('lulu.drops.settings', JSON.stringify({ game: selectedGame.value, network: selectedNetMode.value, port: proxyPort.value, strategy: strategyOptions.value })) } catch { /* Storage may be unavailable in previews. */ }
  }, { deep: true })

  onMounted(async () => {
    appendLog('info', 'SYSTEM', api.isTauriDrops() ? '掉宝模块就绪，进度只取自 Twitch 官方库存' : '浏览器预览：账户与挂宝功能需在桌面客户端使用')
    if (!api.isTauriDrops()) { initializing.value = false; return }
    try {
      const off = await api.listenTwitchMinerState(handleMinerState)
      if (disposed) { off(); return }
      unlisten = off; applyAccounts(await api.getTwitchAccounts())
      if (disposed) return
      await syncStatus(true); await api.refreshTwitchMinerState()
      if (disposed) return
      statusTimer = setInterval(async () => {
        if (pollBusy || busyAction.value || disposed) return
        pollBusy = true
        try { await syncStatus(); await api.refreshTwitchMinerState() }
        catch (error) { if (!lastError.value) fail('SYNC', error) }
        finally { pollBusy = false }
      }, 5000)
    } catch (error) { fail('INIT', error) }
    finally { initializing.value = false }
  })

  onUnmounted(() => { disposed = true; clearInterval(statusTimer); unlisten?.() })

  return {
    terminalRef, channelInputRef, GAME_OPTIONS, isMinerRunning, isViewerVisible, isLoggedIn, isToggling, isTestingNet,
    isBusy, busyAction, settingsLocked, accounts, activeAccountId, selectedAccountId, accountName, accountReady,
    activeAccount, isAccountMenuOpen, isAddingAccount, toggleAccountMenu, closeAccountMenu,
    selectAndSwitchAccount, handleRenameAccount, handleDeleteAccount,
    accountStatus, getAccountDisplayLabel, gameDropsStatus,
    selectedGame, selectedNetMode, proxyPort, inputChannelName, sampleChannels, activeChannel, channelCategory, strategyOptions,
    streamState, netProbe, netStatusText, engineStatus, activeRewardsTab, currentCampaign, activeReward, logs, lastError,
    handleGameChange, handleNetModeChange, handleProxyPortChange, checkNetworkConnectivity, handleApplyChannel,
    quickSelectChannel, cycleNextChannel, handleToggleMiner, handleToggleViewer, handleManualClaim, handleLogin,
    handleSwitchAccount, handleAddAccount, handleRefreshAccount
  }
}
