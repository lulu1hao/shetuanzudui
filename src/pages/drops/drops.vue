<template>
  <div ref="dropsRootRef" class="container" :class="{ 'drops-arrival': isDropsArrival }">
    <!-- 顶部 HUD Header (完全统一积分查询 112px HUD 布局与跑马灯背景) -->
    <header class="hud-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack" title="返回活动大厅">← 大厅</button>
        <div class="room-title-block">
          <div class="header-title-badge">
            <h1 class="header-page-title">掉宝挂机</h1>
          </div>
          <span class="badge-cashout-hud">TWITCH · 账户与掉宝监控中心</span>
        </div>
      </div>

      <div class="header-right">
        <!-- 运行日志快捷触发器 (点击呼出终端日志弹窗) -->
        <button
          type="button"
          class="hud-log-btn"
          @click="openLogModal"
          title="查看自动化引擎执行日志"
        >
          <svg class="hud-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          <span>执行日志</span>
          <span v-if="logs.length" class="hud-log-count">{{ logs.length }}</span>
        </button>

        <!-- 引擎状态指示胶囊 (替代原笨重下拉框与大按钮，还跑马灯呼吸空间) -->
        <div class="hud-status-capsule" :class="{ 'is-running': isMinerRunning }">
          <span class="pulse-dot" :class="{ green: isMinerRunning }"></span>
          <span class="status-capsule-text">{{ engineStatus }}</span>
        </div>
        <div class="hud-status-capsule tunnel-capsule">
          <span class="tunnel-mode-pill">{{ selectedNetMode === 'proxy' ? 'PROXY' : 'TUNNEL' }}</span>
          <span class="tunnel-status-text">{{ netStatusText }}</span>
        </div>
      </div>
    </header>

    <!-- 主体区域 (直角硬朗电竞质感 + 红黑精密线条) -->
    <main class="drops-body-scroll">
      <div class="drops-container-inner">
        <!-- 头部主标题区 (参考积分查询 command-flow-heading) -->
        <section class="command-flow-heading">
          <div>
            <span class="command-eyebrow">TWITCH DROPS · ACCOUNT & INVENTORY</span>
            <div class="room-hero-title">
              <h2>{{ channelCategory }} 掉宝与账户管理</h2>
              <span class="badge-stage-tag" :class="{ 'tag-active': isMinerRunning }">
                {{ isMinerRunning ? 'ENGINE RUNNING' : 'STANDBY' }}
              </span>
            </div>
          </div>
          <div class="leaderboard-status-badge">
            <span class="pulse-dot" :class="{ green: isMinerRunning }"></span>
            <span>{{ engineStatus }} · 奖励与进度以 Twitch 官方库存为准</span>
          </div>
        </section>

        <section class="account-panel tactical-account-hub focus-account-championship-card" aria-labelledby="drops-account-title">
          <!-- 核心：100% 沿用排名查看焦点选手同款红色流光来回平滑滑动 (8.5s) -->
          <div class="card-beam-glow" aria-hidden="true"></div>

          <!-- 顶部冠军栏 (championship-header-bar) -->
          <div class="championship-header-bar">
            <div class="championship-title-group">
              <span class="champ-eyebrow">TWITCH ACCOUNT · 焦点卡槽与登录中枢</span>
              <h3 id="drops-account-title" class="champ-title">挂宝账户卡槽</h3>
            </div>
            <div class="champ-status-tag" :class="{ online: isLoggedIn === true }" role="status">
              <span class="pulse-dot" :class="{ green: isLoggedIn === true }"></span>
              <span>{{ accountStatus }}</span>
            </div>
          </div>

          <!-- 卡槽主体内容 (championship-account-body) -->
          <div class="championship-account-body">
            <div class="account-integrated-bar">
              <!-- 激活账户选择触发器 (升级为具有电竞质感的大型战术卡片) -->
              <div class="account-selector-box" :class="{ 'is-open': isAccountMenuOpen }">
                <button
                  type="button"
                  class="account-current-card-trigger focus-trigger-styled"
                  :disabled="isBusy || !accounts.length"
                  @click="toggleAccountMenu"
                  aria-haspopup="listbox"
                  :aria-expanded="isAccountMenuOpen"
                >
                  <div class="account-rank-badge">
                    <span class="badge-prefix">SLOT</span>
                    <span class="badge-icon">🎮</span>
                    <span class="slot-dot" :class="{ online: activeAccount?.twitchUsername && isLoggedIn === true }"></span>
                  </div>
                  <div class="account-current-meta">
                    <div class="account-primary-row">
                      <span class="account-name-text">{{ activeAccount?.name || '默认卡槽' }}</span>
                      <span v-if="activeAccount?.twitchUsername" class="account-bound-tag glowing">
                        @{{ activeAccount.twitchUsername }}
                      </span>
                      <span v-else class="account-unbound-tag">未绑定 Twitch</span>
                    </div>
                    <div class="account-sub-status">
                      <span v-if="activeAccount?.twitchUsername && isLoggedIn === true" class="status-live-line">
                        <span class="mini-live-dot"></span>
                        <span>官方登录正常 · 独立 PROFILE 激活中 · 点击展开卡槽</span>
                      </span>
                      <span v-else-if="activeAccount?.twitchUsername">
                        会话待唤起 · 点击管理或重新认证
                      </span>
                      <span v-else>
                        新卡槽就绪 · 登录后自动绑定老鼠台账号
                      </span>
                    </div>
                  </div>
                  <div class="dropdown-chevron-box">
                    <span class="switch-slot-hint">切换卡槽</span>
                    <svg class="chevron-icon" :class="{ rotated: isAccountMenuOpen }" viewBox="0 0 24 24">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </button>

                <!-- 下拉卡槽面板 (无缝集成切换、绑定状态与添加账号) -->
                <div v-if="isAccountMenuOpen" class="account-drawer-panel" role="listbox">
                  <div class="drawer-header">
                    <span class="drawer-title">已配置的挂宝卡槽 ({{ accounts.length }}/20)</span>
                    <span class="drawer-tip">独立隔离登录会话，点击直接无缝切换</span>
                  </div>

                  <div class="drawer-account-list">
                    <div
                      v-for="acc in accounts"
                      :key="acc.id"
                      class="drawer-account-item"
                      :class="{ 'is-active': acc.id === activeAccountId }"
                      role="option"
                      :aria-selected="acc.id === activeAccountId"
                      @click="selectAndSwitchAccount(acc.id)"
                    >
                      <div class="item-left">
                        <span class="status-indicator-dot" :class="{ green: acc.twitchUsername && acc.id === activeAccountId && isLoggedIn === true, cyan: acc.twitchUsername, gray: !acc.twitchUsername }"></span>
                        <div class="item-info">
                          <div class="item-name-row">
                            <strong class="item-name">{{ acc.name }}</strong>
                            <span v-if="acc.twitchUsername" class="item-bound-id">@{{ acc.twitchUsername }}</span>
                            <span v-else class="item-unbound-label">待绑定</span>
                          </div>
                          <span class="item-desc">
                            {{ acc.id === activeAccountId ? '当前正处于使用中' : acc.twitchUsername ? '点击立即切换并载入此账号' : '尚未登录 Twitch，点击切换后前往登录' }}
                          </span>
                        </div>
                      </div>

                      <div class="item-right-actions" @click.stop>
                        <span v-if="acc.id === activeAccountId" class="active-pill-badge">当前使用</span>
                        <button
                          v-else
                          type="button"
                          class="switch-quick-btn"
                          :disabled="isBusy"
                          @click="selectAndSwitchAccount(acc.id)"
                        >
                          切换
                        </button>
                        <button
                          v-if="acc.id !== 'default' && accounts.length > 1"
                          type="button"
                          class="item-delete-btn"
                          :disabled="isBusy"
                          title="删除此卡槽"
                          @click="handleDeleteAccount(acc.id)"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- 抽屉底部：新建账号卡槽 -->
                  <div class="drawer-footer-add">
                    <div v-if="!isAddingAccount" class="add-trigger-row">
                      <button
                        type="button"
                        class="open-add-btn"
                        :disabled="isBusy || accounts.length >= 20"
                        @click="isAddingAccount = true"
                      >
                        <span class="plus-symbol">＋</span>
                        <span>添加新账号卡槽 ({{ accounts.length }}/20)</span>
                      </button>
                    </div>
                    <form v-else class="inline-add-form" @submit.prevent="handleAddAccount(accountName)">
                      <input
                        v-model="accountName"
                        class="inline-add-input"
                        placeholder="输入卡槽别名，例如：主号 / 小号 / 刷装号"
                        maxlength="40"
                        autofocus
                        :disabled="isBusy"
                      />
                      <div class="form-btn-group">
                        <button type="submit" class="champ-btn-primary mini" :disabled="isBusy || !accountName.trim()">
                          创建并登录
                        </button>
                        <button type="button" class="champ-btn-secondary mini" :disabled="isBusy" @click="isAddingAccount = false">
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <!-- 操作按钮组合 -->
              <div class="account-actions-group">
                <button
                  class="champ-btn-primary hub-btn"
                  type="button"
                  :disabled="isBusy"
                  @click="handleLogin"
                >
                  <svg class="btn-icon" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>{{ busyAction === 'AUTH' ? '正在打开…' : isLoggedIn === true ? '官方库存 / 账号管理' : '登录 Twitch / 2FA' }}</span>
                </button>
                <button
                  class="champ-btn-secondary hub-btn"
                  type="button"
                  :disabled="isBusy"
                  title="刷新官方登录态与掉宝库存"
                  @click="handleRefreshAccount"
                >
                  <svg class="btn-icon" viewBox="0 0 24 24">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                  </svg>
                  <span>刷新状态</span>
                </button>
              </div>
            </div>

            <p class="account-help-note">
              每个卡槽独立隔离存储 Cookie 与数据；切换卡槽会自动平稳停止旧任务。Twitch 密码与双重验证码仅在官方窗口安全填写，系统将自动识别并绑定登录账号。
            </p>
          </div>
        </section>
        <p v-if="lastError" class="drops-error" role="alert">{{ lastError }}</p>

        <!-- 1. 核心引擎总控台 (由跑马灯右侧迁移至此，结构更聚焦、更具战术操作感) -->
        <section class="master-control-panel-card">
          <!-- 核心引擎总控台调度网格：第一排调度三要素 + 第二排状态指示与四大战术操作栏 -->
          <div class="control-top-grid">
            <!-- 1. 目标游戏分区 -->
            <div class="engine-field-box">
              <label class="field-label">
                <svg class="field-icon" viewBox="0 0 24 24">
                  <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"></path>
                  <rect x="2" y="6" width="20" height="12" rx="0"></rect>
                </svg>
                <span>GAME CATEGORY · 目标分区</span>
              </label>
              <div class="select-field-wrap">
                <select v-model="selectedGame" aria-label="目标游戏分区" class="engine-select-control" @change="handleGameChange" :disabled="settingsLocked">
                  <option v-for="g in GAME_OPTIONS" :key="g.key" :value="g.key">
                    {{ g.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- 2. 网络加速隧道 -->
            <div class="engine-field-box">
              <label class="field-label">
                <svg class="field-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M3 12h18"></path>
                </svg>
                <span>NETWORK TUNNEL · 加速模式</span>
              </label>
              <div class="select-field-wrap">
                <select v-model="selectedNetMode" aria-label="网络模式" class="engine-select-control" @change="handleNetModeChange" :disabled="settingsLocked">
                  <option value="system">跟随游戏加速器 (UU / 雷神 / 奇游)</option>
                  <option value="proxy">本地代理客户端 (自定义端口)</option>
                </select>
              </div>
              <div v-if="selectedNetMode === 'proxy'" class="proxy-port-editor">
                <span class="proxy-host-label">127.0.0.1 :</span>
                <input
                  v-model.number="proxyPort"
                  class="proxy-port-input"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max="65535"
                  step="1"
                  :disabled="settingsLocked || isTestingNet"
                  aria-label="本地代理端口"
                  @change="handleProxyPortChange"
                  @keyup.enter="handleProxyPortChange"
                />
                <span class="proxy-port-hint">HTTP / 混合代理监听端口</span>
              </div>
            </div>

            <!-- 3. 启停挂机主按钮 -->
            <div class="engine-action-box">
              <label class="field-label">
                <svg class="field-icon" viewBox="0 0 24 24">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>HARVEST ENGINE · 挂宝核心引擎</span>
              </label>
              <button
                type="button"
                class="engine-master-btn"
                :class="{ 'is-running': isMinerRunning }"
                @click="handleToggleMiner"
                :disabled="isBusy || isTestingNet"
              >
                <template v-if="isToggling"><span class="btn-spinner"></span><span>处理中…</span></template>
                <template v-else>
                  <svg v-if="!isMinerRunning" class="action-btn-icon" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  <svg v-else class="action-btn-icon" viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                  <span>{{ isMinerRunning ? '停止后台挂宝' : '启动挂宝与监控' }}</span>
                </template>
              </button>
            </div>

            <!-- 4. 当前游戏掉宝活动状态指示徽章 (Col 1 第二排，与目标分区对齐) -->
            <div class="game-drops-event-banner" :class="gameDropsStatus.status" :title="gameDropsStatus.detail">
              <div class="event-banner-inner">
                <span class="event-status-dot" :class="gameDropsStatus.status"></span>
                <div class="event-meta-text">
                  <span class="event-badge-label">{{ gameDropsStatus.badgeText }}</span>
                  <span class="event-title-text">{{ gameDropsStatus.title }}</span>
                </div>
              </div>
              <div class="event-detail-tip">{{ gameDropsStatus.detail }}</div>
            </div>

            <!-- 5. 战术工具栏：移动到红框指定位置 (Col 2+Col 3 第二排，横向优雅分布) -->
            <div class="middle-actions-bar">
              <button
                class="tactical-action-btn primary-claim-btn"
                type="button"
                @click="handleManualClaim"
                :disabled="isBusy"
                title="打开官方掉宝库存或登录 Twitch"
              >
                <svg class="tactical-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
                  <path d="M4 6v12a2 2 0 0 0 2 2h14v-4"></path>
                  <line x1="18" y1="12" x2="18" y2="12.01"></line>
                </svg>
                <span class="btn-text-content">{{ isLoggedIn === false ? '登录 Twitch / 2FA' : '打开掉宝领取中心' }}</span>
              </button>

              <button
                class="tactical-action-btn strategy-btn"
                type="button"
                @click="isStrategyModalOpen = true"
                title="配置极低资源、静音、自动领取与下播轮转策略"
              >
                <svg class="tactical-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span class="btn-text-content">挂机策略</span>
              </button>

              <button
                class="tactical-action-btn probe-btn"
                type="button"
                @click="checkNetworkConnectivity"
                :disabled="isBusy || isTestingNet"
                title="执行网络探针自检"
              >
                <svg class="tactical-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span class="btn-text-content">{{ isTestingNet ? '检测中…' : '网络自检' }}</span>
              </button>

              <button
                class="tactical-action-btn log-btn"
                type="button"
                @click="openLogModal"
                title="查看自动化引擎执行日志"
              >
                <svg class="tactical-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="4 17 10 11 4 5"></polyline>
                  <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
                <span class="btn-text-content">运行日志</span>
                <span v-if="logs.length" class="log-badge-tag">{{ logs.length }}</span>
              </button>

              <button
                v-if="isMinerRunning"
                type="button"
                class="tactical-action-btn viewer-btn"
                @click="handleToggleViewer()"
                :disabled="isBusy"
                title="查看/隐藏直播视窗"
              >
                <svg class="tactical-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <span class="btn-text-content">{{ isViewerVisible ? '隐藏直播' : '查看直播' }}</span>
              </button>
            </div>
          </div>

          <!-- 下排：主播频道检索与精选快速优选 -->
          <div class="control-bottom-bar">
            <form class="channel-search-form" @submit.prevent="handleApplyChannel">
              <div class="channel-input-field">
                <span class="input-tag">CHANNEL</span>
                <input
                  ref="channelInputRef"
                  type="text"
                  v-model="inputChannelName"
                  class="channel-input"
                  aria-label="Twitch 主播 ID 或频道链接" placeholder="输入 Twitch 主播 ID 或 HTTPS 频道链接；留空自动选择"
                  :disabled="settingsLocked"
                  autocomplete="off"
                  spellcheck="false"
                />
                <button
                  v-if="inputChannelName"
                  type="button"
                  class="input-clear-btn"
                  @click="quickSelectChannel('')" :disabled="settingsLocked" aria-label="清空频道"
                  title="清空"
                >✕</button>
              </div>
              <button
                type="submit"
                class="channel-submit-btn"
                :disabled="settingsLocked"
              >
                <span>{{ inputChannelName.trim() ? '锁定主播挂宝' : '全自动优选主播' }}</span>
              </button>
            </form>

            <div class="hot-streamers-row">
              <span class="hot-label">常用频道（在线状态未验证）:</span>
              <div class="streamer-chips-wrap">
                <button
                  v-for="sample in sampleChannels"
                  :key="sample"
                  type="button"
                  class="streamer-chip-btn"
                  :class="{ active: activeChannel.name.toLowerCase() === sample.toLowerCase() }"
                  @click="quickSelectChannel(sample)"
                  :disabled="settingsLocked"
                >
                  <span class="chip-dot"></span>
                  <span>{{ sample }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 1. 自动化引擎日志弹窗 (点击按钮弹出，带高科技终端质感与实时自滚) -->
    <Teleport to="body">
      <div v-if="isLogModalOpen" class="tactical-modal-backdrop" @click.self="isLogModalOpen = false">
        <div class="tactical-modal-window terminal-modal-styled" role="dialog" aria-modal="true" aria-labelledby="terminal-modal-title">
          <div class="modal-header-bar">
            <div class="modal-title-group">
              <div class="modal-eyebrow">AUTOMATED ENGINE CONSOLE // LIVE TRACE</div>
              <h3 id="terminal-modal-title" class="modal-title">
                <svg class="modal-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="4 17 10 11 4 5"></polyline>
                  <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
                <span>自动化引擎执行日志</span>
                <span class="modal-tag-badge">{{ logs.length }} 条记录</span>
              </h3>
            </div>
            <div class="modal-header-actions">
              <button type="button" class="modal-action-btn" @click="copyLogs" title="复制所有日志到剪贴板">
                <svg class="mini-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>{{ copySuccess ? '已复制' : '复制日志' }}</span>
              </button>
              <button type="button" class="modal-action-btn" @click="logs = []" title="清空当前日志">
                <svg class="mini-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>清空</span>
              </button>
              <button type="button" class="modal-close-btn" @click="isLogModalOpen = false" title="关闭日志窗口 (ESC)">
                ✕
              </button>
            </div>
          </div>

          <div class="terminal-modal-body" ref="terminalRef">
            <div v-if="!logs.length" class="terminal-empty-hint">
              <div class="empty-cursor">&gt;_</div>
              <p>暂无引擎执行日志 · 启动挂宝引擎、切换卡槽或执行网络自检后将在此输出详细追踪信息</p>
            </div>
            <div v-else class="terminal-feed-list">
              <div v-for="(log, idx) in logs" :key="idx" class="term-line" :class="log.level">
                <span class="t-time">{{ log.time }}</span>
                <span class="t-tag">[{{ log.tag }}]</span>
                <span class="t-msg">{{ log.message }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer-bar">
            <div class="footer-status-pill">
              <span class="pulse-dot" :class="{ green: isMinerRunning }"></span>
              <span>引擎状态: {{ engineStatus }} · 独立 WebView2 进程实时同步</span>
            </div>
            <span class="footer-hint">支持按 ESC 快捷关闭</span>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 2. 挂机守护策略设置弹窗 (原页面右侧策略区域集成) -->
    <Teleport to="body">
      <div v-if="isStrategyModalOpen" class="tactical-modal-backdrop" @click.self="isStrategyModalOpen = false">
        <div class="tactical-modal-window strategy-modal-styled" role="dialog" aria-modal="true" aria-labelledby="strategy-modal-title">
          <div class="modal-header-bar">
            <div class="modal-title-group">
              <div class="modal-eyebrow">DAEMON STRATEGY // SYSTEM PREFERENCES</div>
              <h3 id="strategy-modal-title" class="modal-title">
                <svg class="modal-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>挂机策略守护与网络自检</span>
              </h3>
            </div>
            <button type="button" class="modal-close-btn" @click="isStrategyModalOpen = false" title="关闭设置 (ESC)">
              ✕
            </button>
          </div>

          <div class="strategy-modal-body">
            <!-- 挂机策略开关组 -->
            <div class="strategy-section-block">
              <div class="sec-label">DAEMON RULES · 自动化策略规则</div>
              <div class="strategy-list modal-strategy-list">
                <div class="strategy-row">
                  <div class="strat-text">
                    <strong class="strat-name">极低资源模式</strong>
                    <span class="strat-desc">尝试切换至 160p；实际画质以播放器回报为准</span>
                  </div>
                  <label class="switch-control">
                    <input type="checkbox" v-model="strategyOptions.lowResource" aria-label="极低资源模式" :disabled="settingsLocked" />
                    <span class="switch-slider"></span>
                  </label>
                </div>

                <div class="strategy-row">
                  <div class="strat-text">
                    <strong class="strat-name">全域音频静音</strong>
                    <span class="strat-desc">屏蔽 HTML5 视频声音，杜绝打扰游戏语音及脚步声</span>
                  </div>
                  <label class="switch-control">
                    <input type="checkbox" v-model="strategyOptions.muteAudio" aria-label="全域音频静音" :disabled="settingsLocked" />
                    <span class="switch-slider"></span>
                  </label>
                </div>

                <div class="strategy-row">
                  <div class="strat-text">
                    <strong class="strat-name">自动领取达成奖励 (Auto-Claim)</strong>
                    <span class="strat-desc">检测到官方可领取按钮时自动点击，等待官方确认</span>
                  </div>
                  <label class="switch-control">
                    <input type="checkbox" v-model="strategyOptions.autoClaim" aria-label="自动领取奖励" :disabled="settingsLocked" />
                    <span class="switch-slider"></span>
                  </label>
                </div>

                <div class="strategy-row">
                  <div class="strat-text">
                    <strong class="strat-name">主播下播轮转守护 (Failover)</strong>
                    <span class="strat-desc">确认主播离线后，返回当前游戏的掉宝分区选台</span>
                  </div>
                  <label class="switch-control">
                    <input type="checkbox" v-model="strategyOptions.autoFailover" aria-label="主播下播自动轮转" :disabled="settingsLocked" />
                    <span class="switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- 网络环境与诊断 -->
            <div class="strategy-section-block">
              <div class="sec-label">NETWORK PROBE · 网络连通性诊断</div>
              <div class="net-diag-rows modal-net-rows">
                <div class="diag-item">
                  <span class="diag-label">官方直连:</span>
                  <span class="diag-val" :class="{ ok: netProbe.direct.reachable, fail: !netProbe.direct.reachable }">
                    {{ netProbe.direct.reachable === null ? '尚未检测' : netProbe.direct.reachable ? `TCP 连通 (${netProbe.direct.latency_ms}ms)` : '连接失败 / 超时' }}
                  </span>
                </div>
                <div class="diag-item" v-if="selectedNetMode === 'proxy'">
                  <span class="diag-label">本地代理端口:</span>
                  <span class="diag-val" :class="{ ok: netProbe.proxy?.tunnel_ok, fail: netProbe.proxy && !netProbe.proxy.tunnel_ok }">
                    {{ netProbe.proxy?.tunnel_ok ? `${netProbe.proxy.address} (${netProbe.proxy.latency_ms}ms)` : '等待连接' }}
                  </span>
                </div>
              </div>

              <div class="modal-net-actions">
                <button
                  type="button"
                  class="champ-btn-secondary mini-wide"
                  :disabled="isBusy || isTestingNet"
                  @click="checkNetworkConnectivity"
                >
                  {{ isTestingNet ? '正在诊断网络...' : '执行网络探针自检' }}
                </button>
              </div>

              <div class="net-guide-box">
                <p><strong>说明：</strong>首次使用需完成 Twitch 登录/2FA，并在官方库存检查游戏账户绑定。关闭直播窗口会隐藏到后台；停止按钮会结束挂宝及领取。网络自检只验证 TCP / HTTP 代理隧道。</p>
              </div>
            </div>
          </div>

          <div class="modal-footer-bar">
            <span class="footer-hint">所有修改实时保存至本地存储</span>
            <button type="button" class="champ-btn-primary mini" @click="isStrategyModalOpen = false">
              完成
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 3. 官方掉宝全阶段奖励图鉴弹窗 (按需展开，不占主页面空间) -->
    <Teleport to="body">
      <div v-if="isRewardsModalOpen" class="tactical-modal-backdrop" @click.self="isRewardsModalOpen = false">
        <div class="tactical-modal-window rewards-modal-styled" role="dialog" aria-modal="true" aria-labelledby="rewards-modal-title">
          <div class="modal-header-bar">
            <div class="modal-title-group">
              <div class="modal-eyebrow">OFFICIAL INVENTORY // REWARD STAGES</div>
              <h3 id="rewards-modal-title" class="modal-title">
                <span>本期掉宝活动阶段清单</span>
                <span class="modal-tag-badge">{{ currentCampaign.rewards.length }} 项奖励</span>
              </h3>
            </div>
            <button type="button" class="modal-close-btn" @click="isRewardsModalOpen = false" title="关闭 (ESC)">
              ✕
            </button>
          </div>

          <div class="rewards-modal-body">
            <div v-if="!currentCampaign.rewards.length" class="inventory-empty modal-empty">
              <h4>{{ isLoggedIn === false ? '请先登录挂宝账户' : '尚未识别到官方奖励' }}</h4>
              <p>打开官方库存同步登录态与进度。若没有参与中的活动，或 Twitch 页面结构发生变化，请直接在官方库存查看。</p>
              <button type="button" class="champ-btn-primary" :disabled="isBusy" @click="handleManualClaim">打开 Twitch 官方库存</button>
            </div>
            <div v-else class="modal-rewards-list">
              <div
                v-for="(reward, idx) in currentCampaign.rewards"
                :key="reward.id"
                class="stage-visual-card"
                :class="{
                  'is-active': reward.id === activeReward.id,
                  'is-claimed': reward.claimed,
                  [`rarity-${reward.rarity}`]: true
                }"
              >
                <div class="item-visual-stand">
                  <div class="visual-accent-glow"></div>
                  <div class="item-svg-frame">
                    <svg v-if="reward.icon === 'sticker'" class="item-render-svg" viewBox="0 0 64 64">
                      <polygon points="32 6 56 18 56 46 32 58 8 46 8 18" fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" stroke-width="2"></polygon>
                      <polygon points="32 14 48 23 48 41 32 50 16 41 16 23" fill="none" stroke="rgba(255,255,255,0.4)" stroke-dasharray="3 3"></polygon>
                      <path d="M32 20 L42 40 L22 40 Z" fill="#e11d48"></path>
                      <circle cx="32" cy="32" r="4" fill="#ffffff"></circle>
                    </svg>
                    <svg v-else-if="reward.icon === 'charm'" class="item-render-svg" viewBox="0 0 64 64">
                      <circle cx="32" cy="10" r="5" fill="none" stroke="#e5e7eb" stroke-width="2.5"></circle>
                      <line x1="32" y1="15" x2="32" y2="24" stroke="#9ca3af" stroke-width="2"></line>
                      <polygon points="32 24 46 34 32 58 18 34" fill="rgba(225, 29, 72, 0.28)" stroke="#f43f5e" stroke-width="2"></polygon>
                      <polygon points="32 24 39 34 32 58 25 34" fill="rgba(244, 63, 94, 0.45)" stroke="#ffffff" stroke-width="1"></polygon>
                      <line x1="18" y1="34" x2="46" y2="34" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"></line>
                    </svg>
                    <svg v-else class="item-render-svg" viewBox="0 0 64 64">
                      <path d="M6 34 L18 22 L44 22 L52 26 L58 26 L58 32 L50 32 L46 36 L24 36 L20 46 L14 46 L16 36 L6 36 Z" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" stroke-width="2"></path>
                      <rect x="26" y="24" width="12" height="4" fill="#e11d48"></rect>
                      <line x1="6" y1="34" x2="58" y2="34" stroke="rgba(255,255,255,0.4)" stroke-width="1" stroke-dasharray="2 2"></line>
                    </svg>
                  </div>
                  <span class="rarity-badge-tag" :class="reward.rarity">{{ reward.rarity.toUpperCase() }}</span>
                </div>

                <div class="item-info-col">
                  <div class="stage-tag-row">
                    <span class="stage-num-badge">STAGE 0{{ idx + 1 }}</span>
                    <span class="item-type-pill">{{ reward.type }}</span>
                    <span class="item-minutes-tag">官方进度</span>
                  </div>
                  <h4 class="stage-reward-name">{{ reward.name }}</h4>
                  <p class="stage-reward-desc">{{ reward.desc }}</p>
                  <div class="stage-progress-track">
                    <div class="stage-progress-fill" :style="{ width: `${reward.progress}%` }" :class="{ done: reward.claimed }"></div>
                  </div>
                  <div class="stage-progress-stats">
                    <span>库存状态: <strong>{{ reward.claimed ? '官方已确认领取' : reward.canClaim ? '可以领取' : '等待达成' }}</strong></span>
                    <span class="percent-val">{{ reward.progress === null ? '待同步' : `${reward.progress}%` }}</span>
                  </div>
                </div>

                <div class="item-action-col">
                  <div v-if="reward.claimed" class="stage-status-box is-claimed">
                    <span>官方已领取</span>
                  </div>
                  <div v-else-if="reward.id === activeReward.id && isMinerRunning" class="stage-status-box is-harvesting">
                    <span class="harvesting-spinner"></span>
                    <span>监控中</span>
                  </div>
                  <div v-else class="stage-status-box is-locked">
                    <span>等待达成</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer-bar">
            <button type="button" class="champ-btn-primary mini" @click="handleManualClaim">前往 Twitch 官方库存</button>
            <button type="button" class="champ-btn-secondary mini" @click="isRewardsModalOpen = false">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useHudPageTransition } from '../../utils/globalLuluTransition.js'
import { useTwitchDrops } from '../../composables/useTwitchDrops.js'

export default {
  name: 'DropsPage',
  setup() {
    const dropsRootRef = ref(null)
    const { isArrival: isDropsArrival, goBack } = useHudPageTransition({
      id: 'drops', rootRef: dropsRootRef, bodySelector: '.drops-body-scroll', router: useRouter()
    })
    const dropsModel = useTwitchDrops()
    const isLogModalOpen = ref(false)
    const isStrategyModalOpen = ref(false)
    const isRewardsModalOpen = ref(false)
    const copySuccess = ref(false)
    let copyTimer = null

    function openLogModal() {
      isLogModalOpen.value = true
      nextTick(() => {
        if (dropsModel.terminalRef.value) {
          dropsModel.terminalRef.value.scrollTop = dropsModel.terminalRef.value.scrollHeight
        }
      })
    }

    function copyLogs() {
      const text = (dropsModel.logs.value || []).map(l => `${l.time} [${l.tag}] ${l.message}`).join('\n')
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          copySuccess.value = true
          clearTimeout(copyTimer)
          copyTimer = setTimeout(() => { copySuccess.value = false }, 2000)
        }).catch(() => {})
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        isLogModalOpen.value = false
        isStrategyModalOpen.value = false
        isRewardsModalOpen.value = false
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(copyTimer)
    })

    return {
      dropsRootRef,
      isDropsArrival,
      goBack,
      ...dropsModel,
      isLogModalOpen,
      isStrategyModalOpen,
      isRewardsModalOpen,
      openLogModal,
      copyLogs,
      copySuccess
    }
  }
}
</script>

<style scoped>
/* ========================================================
   战术焦点卡槽中枢 (Championship Focus Account Hub)
   100% 沿用排名查看焦点选手核心流光与电竞机能风质感
   ======================================================== */
.focus-account-championship-card {
  position: relative;
  margin-bottom: 24px;
  border-radius: 0;
  border: 1px solid rgba(255, 42, 85, 0.55);
  border-left: 4px solid #ff2a5f;
  background: #0d0e12;
  box-shadow: 0 0 26px rgba(255, 42, 85, 0.16), 0 10px 32px rgba(0, 0, 0, 0.7);
  overflow: visible; /* 保证下拉卡槽抽屉不被裁剪 */
}

/* 核心：与排名查看焦点选手同款提亮红色流光，8.5s 来回慢速滑动 */
.card-beam-glow {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
  background: linear-gradient(
    105deg,
    transparent 0%,
    transparent 15%,
    rgba(225, 29, 72, 0.04) 26%,
    rgba(225, 29, 72, 0.18) 38%,
    rgba(255, 42, 95, 0.48) 46%,
    rgba(255, 42, 95, 0.85) 50%,
    rgba(255, 42, 95, 0.48) 54%,
    rgba(225, 29, 72, 0.18) 62%,
    rgba(225, 29, 72, 0.04) 74%,
    transparent 85%,
    transparent 100%
  );
  background-size: 260% 100%;
  animation: redLightBeamSlide 8.5s ease-in-out infinite;
}

@keyframes redLightBeamSlide {
  0% {
    background-position: 100% 0;
  }
  50% {
    background-position: 0% 0;
  }
  100% {
    background-position: 100% 0;
  }
}

/* 顶部焦点标题栏 (与排名查看 championship-header-bar 深度统一) */
.championship-header-bar {
  position: relative;
  z-index: 2;
  background: transparent !important;
  padding: 14px 20px 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0;
  flex-wrap: wrap;
  gap: 12px;
}

.championship-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.champ-eyebrow {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #ffa6be;
  text-transform: uppercase;
}

.champ-title {
  font-size: 22px;
  font-weight: 1000;
  color: #ff3366;
  text-shadow: 0 0 16px rgba(255, 51, 102, 0.65);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.champ-status-tag {
  font-size: 11.5px;
  font-weight: 900;
  color: #ff3366;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 51, 102, 0.45);
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.champ-status-tag.online {
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.5);
  background: rgba(52, 211, 153, 0.08);
  text-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
}

/* 焦点卡槽主体 */
.championship-account-body {
  position: relative;
  z-index: 2;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.account-integrated-bar {
  display: flex;
  align-items: stretch;
  gap: 16px;
  flex-wrap: wrap;
}

/* 激活账户选择触发器 (升级为更具分量感与段位感的机能风触发卡) */
.account-selector-box {
  flex: 1 1 380px;
  position: relative;
  min-width: 280px;
}

.focus-trigger-styled {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  background: rgba(18, 22, 32, 0.88);
  border: 1px solid rgba(255, 42, 85, 0.35);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 0 12px rgba(255, 42, 85, 0.04);
  text-align: left;
  cursor: pointer;
  transition: all 0.22s ease;
  border-radius: 0;
}

.focus-trigger-styled:hover:not(:disabled) {
  background: rgba(28, 34, 50, 0.95);
  border-color: #ff2a5f;
  box-shadow: 0 0 18px rgba(255, 42, 95, 0.32);
  transform: translateY(-1px);
}

.account-selector-box.is-open .focus-trigger-styled {
  border-color: #ff2e93;
  box-shadow: 0 0 16px rgba(255, 46, 147, 0.45);
}

/* 类似 champ-rank-badge 的段位徽章卡槽芯片 */
.account-rank-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 42, 85, 0.6);
  border-radius: 0;
  position: relative;
  flex-shrink: 0;
  min-width: 48px;
  box-shadow: 0 0 8px rgba(255, 42, 85, 0.2);
}

.badge-prefix {
  font-size: 9px;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 1.2px;
}

.badge-icon {
  font-size: 19px;
  line-height: 1.2;
}

.slot-dot {
  position: absolute;
  bottom: -3px;
  right: -3px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #64748b;
  border: 2px solid #0d0e12;
}

.slot-dot.online {
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
}

.account-current-meta {
  flex: 1;
  min-width: 0;
}

.account-primary-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.account-name-text {
  font-size: 16.5px;
  font-weight: 850;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.2px;
}

.account-bound-tag.glowing {
  font-size: 12px;
  font-weight: 800;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.16);
  border: 1px solid #38bdf8;
  padding: 2px 9px;
  letter-spacing: 0.5px;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
  text-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
}

.account-unbound-tag {
  font-size: 11px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 7px;
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.account-sub-status {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px;
}

.status-live-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #a7f3d0;
}

.mini-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 6px #34d399;
}

.dropdown-chevron-box {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.switch-slot-hint {
  font-size: 11px;
  font-weight: 800;
  color: #ffa6be;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.chevron-icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  transition: transform 0.22s ease;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

/* 下拉卡槽抽屉面板 (机能暗黑 + 霓虹红框) */
.account-drawer-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #090b10;
  border: 1px solid rgba(255, 42, 85, 0.45);
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.85), 0 0 20px rgba(255, 42, 85, 0.15);
  z-index: 60;
  padding: 14px;
}

.drawer-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 8px;
}

.drawer-title {
  font-size: 12px;
  font-weight: 750;
  color: #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.drawer-tip {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.drawer-account-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 4px;
}

.drawer-account-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.15s ease;
}

.drawer-account-item:hover {
  background: rgba(255, 46, 147, 0.08);
  border-color: rgba(255, 46, 147, 0.35);
}

.drawer-account-item.is-active {
  background: rgba(255, 46, 147, 0.14);
  border-color: #ff2e93;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.status-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator-dot.green { background: #34d399; box-shadow: 0 0 6px #34d399; }
.status-indicator-dot.cyan { background: #38bdf8; }
.status-indicator-dot.gray { background: #64748b; }

.item-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.item-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-name {
  font-size: 13.5px;
  color: #ffffff;
}

.item-bound-id {
  font-size: 11px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  padding: 1px 5px;
}

.item-unbound-label {
  font-size: 10.5px;
  color: #94a3b8;
}

.item-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
}

.item-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.active-pill-badge {
  font-size: 11px;
  font-weight: 800;
  color: #ff2e93;
  border: 1px solid rgba(255, 46, 147, 0.4);
  padding: 3px 8px;
  background: rgba(255, 46, 147, 0.12);
}

.switch-quick-btn {
  font-size: 11.5px;
  font-weight: 700;
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  cursor: pointer;
}

.switch-quick-btn:hover {
  background: #ffffff;
  color: #0b0f19;
}

.item-delete-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 6px;
}

.item-delete-btn:hover {
  color: #fb7185;
}

/* 抽屉底部新增账号 */
.drawer-footer-add {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.open-add-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.22);
  color: #e2e8f0;
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.open-add-btn:hover:not(:disabled) {
  background: rgba(255, 46, 147, 0.1);
  border-color: #ff2e93;
  color: #ffffff;
}

.plus-symbol {
  font-weight: 900;
  color: #ff2e93;
}

.inline-add-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inline-add-input {
  width: 100%;
  padding: 8px 12px;
  background: #151924;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: 13px;
  border-radius: 0;
  box-sizing: border-box;
}

.inline-add-input:focus {
  border-color: #ff2e93;
  outline: none;
}

.form-btn-group {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.champ-btn-primary.mini, .champ-btn-secondary.mini {
  padding: 6px 14px;
  font-size: 12px;
  min-height: 32px;
}

/* 操作按钮群 */
.account-actions-group {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.hub-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  min-height: 48px;
  font-size: 13.5px;
  font-weight: 750;
  white-space: nowrap;
}

.hub-btn .btn-icon {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
}

.account-help-note {
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
  margin: 14px 0 0;
  border-left: 2px solid rgba(255, 46, 147, 0.5);
  padding-left: 10px;
}

/* ========================================================
   当前游戏掉宝活动状态指示徽章 (Game Drops Event Banner)
   ======================================================== */
.game-drops-event-banner {
  margin-top: 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  min-height: 48px;
  height: 100%;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.game-drops-event-banner.active {
  border-color: rgba(52, 211, 153, 0.4);
  background: rgba(16, 185, 129, 0.08);
}

.game-drops-event-banner.inactive {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.06);
}

.game-drops-event-banner.standby {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.25);
}

.event-banner-inner {
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #94a3b8;
}

.event-status-dot.active {
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
  animation: pulse-active 1.8s infinite;
}

.event-status-dot.inactive {
  background: #fbbf24;
}

@keyframes pulse-active {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.event-meta-text {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.event-badge-label {
  font-size: 10.5px;
  font-weight: 850;
  letter-spacing: 0.5px;
  padding: 1px 6px;
  text-transform: uppercase;
}

.game-drops-event-banner.active .event-badge-label {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.4);
}

.game-drops-event-banner.inactive .event-badge-label {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.game-drops-event-banner.standby .event-badge-label {
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.event-title-text {
  font-size: 12.5px;
  font-weight: 750;
  color: #ffffff;
}

.event-detail-tip {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
}
.inventory-empty { padding: 32px 24px; }
.inventory-empty h4 { margin: 0; }
.inventory-empty button { margin-top: 20px; min-height: 44px; }
.drops-error { padding: 14px 18px; border: 1px solid #fb7185; color: #fecdd3; background: #3b111a; font-size: 14px; overflow-wrap: anywhere; }
button:disabled, input:disabled, select:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #93c5fd; outline-offset: 3px; }
.switch-control:focus-within { outline: 2px solid #93c5fd; outline-offset: 4px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

/* ========================================================
   掉宝挂机中心 - 100% 沿用积分查询 (leaderboard) 样式与规范
   ======================================================== */

.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: transparent;
  color: #ffffff;
  font-family: var(--font-sans);
}

.container.drops-arrival {
  background: transparent;
}

.drops-arrival .hud-header {
  z-index: auto;
  border-color: transparent;
  border-left-color: transparent;
  background: transparent;
}

.drops-arrival .header-left {
  transform: translateX(-105vw);
  opacity: 0;
  visibility: hidden;
}

.drops-arrival .header-right {
  transform: translateX(105vw);
  opacity: 0;
  visibility: hidden;
}

.drops-arrival .drops-body-scroll {
  opacity: 0;
}

.tournament-leaving .header-left,
.tournament-leaving .header-right {
  z-index: 80;
}

.tournament-leaving .hud-header {
  z-index: auto;
  border-color: transparent;
  border-left-color: transparent;
  background: transparent;
}

/* 顶部 HUD Header (完全统一 112px HUD 布局) */
.hud-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28px;
  height: 112px;
  min-height: 112px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background: transparent;
  box-shadow: none;
  flex-shrink: 0;
  gap: 16px;
  overflow: hidden;
}

.hud-header .header-left,
.hud-header .header-right {
  position: relative;
  z-index: 70;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 18px;
}

.back-btn {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(13, 10, 12, 0.3);
  color: #ffffff;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.back-btn:hover {
  border-color: rgba(255, 255, 255, 0.72);
  background: rgba(13, 10, 12, 0.48);
}

.room-title-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 16px;
  border-left: 1px solid rgba(255, 255, 255, 0.25);
}

.header-title-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-page-title {
  font-size: 26px;
  font-weight: 1000;
  color: #ffffff;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  line-height: 1.1;
  margin: 0;
}

.badge-cashout-hud {
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.68);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hud-log-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(14, 18, 24, 0.85);
  border: 1px solid rgba(255, 42, 85, 0.4);
  color: #ff3b68;
  font-size: 11.5px;
  font-weight: 850;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.hud-log-btn:hover {
  background: rgba(255, 42, 85, 0.15);
  border-color: #ff2a5f;
  color: #ffffff;
  box-shadow: 0 0 14px rgba(255, 42, 85, 0.3);
}

.hud-btn-svg {
  width: 13px;
  height: 13px;
  stroke: currentColor;
}

.hud-log-count {
  padding: 1px 5px;
  background: #ff2a5f;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  line-height: 1.2;
}

.hud-status-capsule {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(14, 17, 23, 0.85);
  border: 1px solid rgba(225, 29, 72, 0.35);
  border-left: 2px solid #e11d48;
  backdrop-filter: blur(8px);
}

.hud-status-capsule.is-running {
  border-color: rgba(16, 185, 129, 0.5);
  border-left-color: #10b981;
}

.status-capsule-text {
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #ffffff;
}

.tunnel-capsule {
  border-left-color: #38bdf8;
  gap: 10px;
}

.tunnel-mode-pill {
  font-size: 9.5px;
  font-weight: 900;
  padding: 1px 6px;
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid #38bdf8;
  color: #38bdf8;
  letter-spacing: 0.05em;
}

.tunnel-status-text {
  font-size: 11.5px;
  font-weight: 750;
  color: rgba(255, 255, 255, 0.8);
}

/* 主滚动区域 (纯黑电竞底色) */
.drops-body-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 40px 28px;
  background: #080a0e;
  position: relative;
  z-index: 10;
}

.drops-container-inner {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 头部主标题区 (直角硬朗红黑线条) */
.command-flow-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(225, 29, 72, 0.25);
}

.command-eyebrow {
  display: block;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #fb7185;
  margin-bottom: 4px;
}

.room-hero-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.room-hero-title h2 {
  font-size: 24px;
  font-weight: 1000;
  color: #ffffff;
  letter-spacing: -0.01em;
  margin: 0;
}

.badge-stage-tag {
  padding: 3px 8px;
  background: rgba(225, 29, 72, 0.2);
  border: 1px solid #e11d48;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  border-radius: 0;
}

.badge-stage-tag.tag-active {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #34d399;
}

.leaderboard-status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(14, 17, 23, 0.95);
  border: 1px solid rgba(225, 29, 72, 0.3);
  border-left: 3px solid #e11d48;
  border-radius: 0;
  font-size: 11.5px;
  font-weight: 750;
  color: rgba(255, 255, 255, 0.9);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 0;
  background: #e11d48;
  box-shadow: 0 0 8px #e11d48;
  display: inline-block;
  animation: pulseDot 1.4s infinite alternate;
}

.pulse-dot.green {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

@keyframes pulseDot {
  0% { transform: scale(0.85); opacity: 0.7; }
  100% { transform: scale(1.25); opacity: 1; }
}

/* 1. 核心调度总控台 (直角极简深黑红边 · 集成分区/网络/启停大引擎/主播检索) */
.master-control-panel-card {
  padding: 18px 22px;
  background: rgba(14, 17, 23, 0.95);
  border: 1px solid rgba(225, 29, 72, 0.28);
  border-left: 3px solid #e11d48;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.control-top-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.1fr 1.4fr;
  gap: 16px;
  align-items: stretch;
}

.engine-field-box,
.engine-action-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 850;
  letter-spacing: 0.08em;
  color: #fb7185;
}

.field-icon {
  width: 13px;
  height: 13px;
  stroke: #fb7185;
  stroke-width: 2;
  fill: none;
  flex-shrink: 0;
}

.select-field-wrap {
  position: relative;
  display: flex;
  height: 42px;
}

.engine-select-control {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  padding: 0 14px;
  border-radius: 0;
  font-size: 13px;
  font-weight: 750;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.engine-select-control:hover:not(:disabled) {
  border-color: #e11d48;
  background: rgba(0, 0, 0, 0.85);
}

.engine-select-control:focus {
  border-color: #e11d48;
  box-shadow: 0 0 0 1px #e11d48;
}

.engine-select-control option {
  background: #0f1117;
  color: #ffffff;
}

.proxy-port-editor {
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.42);
  border-left: 2px solid #38bdf8;
}

.proxy-host-label {
  color: #38bdf8;
  font-family: monospace;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.proxy-port-input {
  width: 82px;
  height: 24px;
  padding: 0 7px;
  border: 1px solid rgba(56, 189, 248, 0.45);
  border-radius: 0;
  outline: none;
  background: #05070b;
  color: #ffffff;
  font-family: monospace;
  font-size: 12px;
  font-weight: 800;
}

.proxy-port-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.35);
}

.proxy-port-input:disabled {
  opacity: 0.55;
}

.proxy-port-hint {
  min-width: 0;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.42);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.engine-master-btn {
  height: 42px;
  padding: 0 20px;
  background: #e11d48;
  border: 1px solid #ff3b68;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 900;
  letter-spacing: 0.03em;
  border-radius: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 0 16px rgba(225, 29, 72, 0.4);
  transition: all 0.2s ease;
}

.engine-master-btn:hover:not(:disabled) {
  background: #f43f5e;
  box-shadow: 0 0 22px rgba(225, 29, 72, 0.65);
  transform: translateY(-1px);
}

.engine-master-btn.is-running {
  background: #171c26;
  border-color: #ef4444;
  color: #ef4444;
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.3);
}

.engine-master-btn.is-running:hover:not(:disabled) {
  background: #ef4444;
  color: #ffffff;
}

.action-btn-icon {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  stroke-width: 2;
  fill: currentColor;
}

.control-bottom-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.channel-search-form {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 440px;
  min-width: 0;
}

.channel-input-field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0;
  padding: 8px 12px;
  gap: 10px;
  transition: all 0.2s ease;
}

.channel-input-field:focus-within {
  border-color: #e11d48;
  box-shadow: 0 0 0 1px #e11d48;
  background: rgba(0, 0, 0, 0.8);
}

.input-tag {
  font-size: 10px;
  font-weight: 900;
  color: #fb7185;
  letter-spacing: 0.08em;
  padding: 1px 5px;
  background: rgba(225, 29, 72, 0.15);
  border: 1px solid rgba(225, 29, 72, 0.3);
}

.channel-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  outline: none;
}

.channel-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.input-clear-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  cursor: pointer;
  padding: 0 4px;
}

.input-clear-btn:hover {
  color: #ffffff;
}

.channel-submit-btn {
  padding: 9px 18px;
  background: rgba(225, 29, 72, 0.2);
  border: 1px solid #e11d48;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  border-radius: 0;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.channel-submit-btn:hover:not(:disabled) {
  background: #e11d48;
}

.channel-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hot-streamers-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.hot-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 800;
  white-space: nowrap;
}

.streamer-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.streamer-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
  font-size: 11.5px;
  font-weight: 750;
  cursor: pointer;
  border-radius: 0;
  transition: all 0.2s ease;
}

.streamer-chip-btn:hover:not(:disabled) {
  border-color: #e11d48;
  color: #ffffff;
  background: rgba(225, 29, 72, 0.15);
}

.streamer-chip-btn.active {
  background: #e11d48;
  border-color: #ff3b68;
  color: #ffffff;
}

.chip-dot {
  width: 5px;
  height: 5px;
  background: #34d399;
  border-radius: 0;
  box-shadow: 0 0 5px #34d399;
}

/* 核心控制台第二排战术操作栏 (位于目标分区下方右侧，与网络加速和启停按钮对齐) */
.middle-actions-bar {
  grid-column: 2 / span 2;
  display: flex;
  align-items: stretch;
  gap: 10px;
  height: 100%;
  min-height: 48px;
}

.tactical-action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 14px;
  min-height: 48px;
  border-radius: 0;
  font-size: 12px;
  font-weight: 850;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.tactical-btn-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.btn-text-content {
  white-space: nowrap;
  letter-spacing: 0.02em;
}

/* 1. 主行动按钮：打开掉宝领取中心 (电竞红光醒目) */
.tactical-action-btn.primary-claim-btn {
  flex: 1.35;
  background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
  border: 1px solid #ff3b68;
  color: #ffffff;
  box-shadow: 0 0 16px rgba(225, 29, 72, 0.25);
}

.tactical-action-btn.primary-claim-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  border-color: #fda4af;
  box-shadow: 0 0 22px rgba(244, 63, 94, 0.45);
}

/* 2. 挂机策略按钮 */
.tactical-action-btn.strategy-btn {
  background: rgba(14, 18, 26, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-left: 3px solid #ff2a5f;
  color: #f1f5f9;
}

.tactical-action-btn.strategy-btn:hover:not(:disabled) {
  background: rgba(255, 42, 85, 0.12);
  border-color: #ff2a5f;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(255, 42, 85, 0.2);
}

/* 3. 网络自检按钮 */
.tactical-action-btn.probe-btn {
  background: rgba(14, 18, 26, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-left: 3px solid #38bdf8;
  color: #f1f5f9;
}

.tactical-action-btn.probe-btn:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.12);
  border-color: #38bdf8;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.2);
}

/* 4. 运行日志按钮 */
.tactical-action-btn.log-btn {
  background: rgba(14, 18, 26, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-left: 3px solid #10b981;
  color: #f1f5f9;
}

.tactical-action-btn.log-btn:hover:not(:disabled) {
  background: rgba(16, 185, 129, 0.12);
  border-color: #10b981;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
}

.log-badge-tag {
  padding: 1px 6px;
  background: #ff2a5f;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  border-radius: 0;
  line-height: 1.2;
}

/* 5. 查看直播视窗按钮 (挂机中动态显示) */
.tactical-action-btn.viewer-btn {
  background: rgba(20, 24, 34, 0.9);
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-left: 3px solid #fbbf24;
  color: #fef08a;
}

.tactical-action-btn.viewer-btn:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.15);
  border-color: #f59e0b;
  color: #ffffff;
}

/* 2. 焦点直播源卡片 (赛场冠军流光动效) */
.searched-player-focus-area {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.focus-championship-card {
  border-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 42, 85, 0.55);
  background: #0d0e12;
  position: relative;
}

.focus-championship-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ff1a4a 45%, #ffffff 50%, #ff1a4a 55%, transparent);
  animation: championshipGlowSlide 7s infinite ease-in-out alternate;
  z-index: 2;
}

@keyframes championshipGlowSlide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.championship-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(90deg, rgba(225, 29, 72, 0.25) 0%, rgba(20, 20, 26, 0.8) 100%);
  border-bottom: 1px solid rgba(225, 29, 72, 0.3);
}

.champ-eyebrow {
  display: block;
  font-size: 10.5px;
  font-weight: 850;
  color: #fb7185;
  letter-spacing: 0.1em;
}

.champ-title {
  font-size: 20px;
  font-weight: 1000;
  color: #ffffff;
  margin: 2px 0 0 0;
}

.champ-status-tag {
  font-size: 11px;
  font-weight: 800;
  padding: 3px 9px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #9ca3af;
}

.champ-status-tag.tag-live {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #34d399;
}

.championship-body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  gap: 20px;
}

.champ-identity-col {
  display: flex;
  align-items: center;
  gap: 16px;
}

.champ-rank-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: rgba(225, 29, 72, 0.15);
  border: 1px solid #e11d48;
  min-width: 86px;
}

.rank-prefix {
  font-size: 10px;
  font-weight: 800;
  color: #fb7185;
}

.rank-num-val {
  font-size: 14px;
  font-weight: 1000;
  color: #ffffff;
  margin-top: 2px;
}

.champ-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.champ-tier-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.champ-tier-badge {
  font-size: 11.5px;
  font-weight: 850;
  padding: 2px 7px;
  border: 1px solid #10b981;
  color: #34d399;
}

.champ-club {
  font-size: 12px;
  color: #e5e7eb;
  font-weight: 750;
}

.champ-meta-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.6);
}

.champ-meta-line strong {
  color: #ffffff;
}

.champ-score-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.score-sub-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  font-weight: 750;
}

.score-large-val {
  font-size: 28px;
  font-weight: 1000;
  color: #e11d48;
  letter-spacing: -0.02em;
}

.score-large-val small {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 750;
  margin-left: 6px;
}

.score-meta-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.view-all-stages-btn {
  background: rgba(225, 29, 72, 0.15);
  border: 1px solid rgba(225, 29, 72, 0.4);
  color: #fb7185;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.4;
}

.view-all-stages-btn:hover {
  background: rgba(225, 29, 72, 0.3);
  color: #ffffff;
  border-color: #ff2a5f;
}

.champ-actions-col {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.champ-btn-primary {
  padding: 8px 18px;
  background: #e11d48;
  border: 1px solid #ff3b68;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 850;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.champ-btn-primary:hover:not(:disabled) {
  background: #f43f5e;
}

.champ-btn-secondary,
.champ-btn-fav {
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #e5e7eb;
  font-size: 12.5px;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.champ-btn-secondary:hover:not(:disabled),
.champ-btn-fav:hover:not(:disabled) {
  border-color: #ffffff;
  color: #ffffff;
}

.log-count-pill {
  padding: 1px 6px;
  background: rgba(255, 42, 85, 0.25);
  border: 1px solid rgba(255, 42, 85, 0.5);
  color: #ff3b68;
  font-size: 10.5px;
  font-weight: 850;
  line-height: 1.2;
}

.drops-progress-bar-wrap {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
}

.drops-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #be123c, #e11d48, #f43f5e);
  box-shadow: 0 0 10px rgba(225, 29, 72, 0.6);
  transition: width 0.4s ease;
}

.drops-progress-fill.completed {
  background: linear-gradient(90deg, #059669, #10b981);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
}

/* 3. 底部主数据网格 (完全同构积分查询 main-split-grid) */
.main-split-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  grid-gap: 18px;
  align-items: start;
}

/* 3. 官方掉宝图鉴与往期档案 (直角战术展台 + 高对比度道具渲染) */
.rewards-catalog-card {
  background: rgba(14, 17, 23, 0.95);
  border: 1px solid rgba(225, 29, 72, 0.28);
  border-left: 3px solid #e11d48;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.catalog-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.catalog-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.catalog-title {
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
}

.catalog-sub-badge {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  display: block;
}

.catalog-nav-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.catalog-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.catalog-tab-btn:hover {
  border-color: #e11d48;
  color: #ffffff;
}

.catalog-tab-btn.active {
  background: rgba(225, 29, 72, 0.2);
  border-color: #e11d48;
  color: #ffffff;
}

.tab-live-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 0;
  box-shadow: 0 0 6px #10b981;
}

/* TAB 1: 本期进行中道具卡片列表 */
.current-rewards-stage-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
}

.stage-visual-card {
  display: grid;
  grid-template-columns: 88px 1fr auto;
  align-items: center;
  gap: 18px;
  padding: 14px 16px;
  background: rgba(8, 10, 14, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid rgba(255, 255, 255, 0.2);
  position: relative;
  transition: all 0.2s ease;
}

.stage-visual-card.is-active {
  border-color: rgba(225, 29, 72, 0.45);
  border-left-color: #e11d48;
  background: rgba(20, 16, 22, 0.85);
  box-shadow: inset 0 0 20px rgba(225, 29, 72, 0.08);
}

.stage-visual-card.is-claimed {
  border-left-color: #10b981;
  background: rgba(8, 16, 14, 0.6);
}

.item-visual-stand {
  width: 88px;
  height: 88px;
  background: radial-gradient(circle, rgba(225, 29, 72, 0.12) 0%, rgba(4, 6, 9, 0.95) 75%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.visual-accent-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(225, 29, 72, 0.15), transparent 70%);
  pointer-events: none;
}

.item-svg-frame {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-render-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
}

.rarity-badge-tag {
  position: absolute;
  bottom: 3px;
  font-size: 8.5px;
  font-weight: 900;
  letter-spacing: 0.05em;
  padding: 1px 5px;
  border-radius: 0;
}

.rarity-badge-tag.rare {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.4);
}

.rarity-badge-tag.epic {
  color: #c084fc;
  background: rgba(192, 132, 252, 0.2);
  border: 1px solid rgba(192, 132, 252, 0.4);
}

.rarity-badge-tag.legendary {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.item-info-col {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.stage-tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stage-num-badge {
  font-size: 10px;
  font-weight: 900;
  color: #fb7185;
  background: rgba(225, 29, 72, 0.15);
  padding: 1px 6px;
  border: 1px solid rgba(225, 29, 72, 0.3);
}

.item-type-pill {
  font-size: 10.5px;
  font-weight: 750;
  color: rgba(255, 255, 255, 0.65);
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
}

.item-minutes-tag {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  gap: 4px;
}

.clock-icon {
  width: 11px;
  height: 11px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
}

.stage-reward-name {
  font-size: 14.5px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
}

.stage-reward-desc {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.4;
}

.stage-progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  margin-top: 4px;
}

.stage-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #be123c, #e11d48);
  transition: width 0.3s ease;
}

.stage-progress-fill.done {
  background: #10b981;
}

.stage-progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.stage-progress-stats strong {
  color: #ffffff;
}

.percent-val {
  font-weight: 900;
  color: #fb7185;
}

.item-action-col {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.stage-status-box {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 800;
  padding: 6px 12px;
  border-radius: 0;
}

.stage-status-box.is-claimed {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid #10b981;
  color: #34d399;
}

.stage-status-box.is-harvesting {
  background: rgba(225, 29, 72, 0.2);
  border: 1px solid #e11d48;
  color: #fb7185;
}

.stage-status-box.is-locked {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.4);
}

.harvesting-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid rgba(251, 113, 133, 0.3);
  border-top-color: #fb7185;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.check-icon,
.lock-icon {
  width: 13px;
  height: 13px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
}

/* TAB 2: 往期掉宝回顾时间线 */
.archive-seasons-timeline {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 20px;
  max-height: 480px;
  overflow-y: auto;
}

.archive-season-card {
  background: rgba(8, 10, 14, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid rgba(225, 29, 72, 0.4);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.archive-season-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.season-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.season-badge-tag {
  font-size: 10px;
  font-weight: 900;
  padding: 1px 5px;
  background: rgba(225, 29, 72, 0.2);
  border: 1px solid #e11d48;
  color: #ffffff;
}

.season-name {
  font-size: 13px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
}

.season-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.season-period {
  color: rgba(255, 255, 255, 0.45);
}

.season-archive-tag {
  font-size: 10px;
  font-weight: 800;
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
}

.archive-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.archive-item-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
}

.archive-icon-box {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.archive-svg {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.archive-item-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.archive-name {
  font-size: 11.5px;
  font-weight: 800;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.archive-sub-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}

.archive-lock-flag {
  font-size: 9px;
  font-weight: 800;
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
  padding: 1px 4px;
  white-space: nowrap;
}

/* 右侧控制面板群 */
.side-controls-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-panel-card {
  padding: 16px;
  background: rgba(14, 17, 23, 0.92);
  border: 1px solid rgba(225, 29, 72, 0.25);
  border-left: 3px solid #e11d48;
}

.side-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 900;
  color: #ffffff;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 12px;
}

.side-sub-tag {
  font-size: 10.5px;
  color: #fb7185;
}

.strategy-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.strategy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.strat-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.strat-name {
  font-size: 12.5px;
  color: #ffffff;
}

.strat-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

/* 直角开关按钮 */
.switch-control {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.switch-control input {
  position: absolute;
  inset: 0;
  z-index: 1;
  margin: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.15);
  transition: .2s ease;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .2s ease;
}

.switch-control input:checked + .switch-slider {
  background-color: #e11d48;
}

.switch-control input:checked + .switch-slider:before {
  transform: translateX(16px);
}

.net-diag-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.diag-item {
  display: flex;
  justify-content: space-between;
}

.diag-label {
  color: rgba(255, 255, 255, 0.6);
}

.diag-val.ok { color: #34d399; font-weight: 750; }
.diag-val.fail { color: #fb7185; }

.net-guide-box {
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.4);
  border-left: 2px solid #38bdf8;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.4;
}

.net-guide-box strong {
  color: #38bdf8;
}

.terminal-mini-box {
  height: 140px;
  overflow-y: auto;
  background: #04060a;
  padding: 8px 10px;
  font-family: monospace;
  font-size: 11.5px;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.clear-btn-text {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  cursor: pointer;
}

.clear-btn-text:hover {
  color: #ffffff;
}

.term-line {
  display: flex;
  gap: 6px;
  word-break: break-all;
}

.t-time { color: #6b7280; flex-shrink: 0; }
.t-tag { color: #9ca3af; font-weight: 800; flex-shrink: 0; }
.term-line.info .t-tag { color: #38bdf8; }
.term-line.success .t-tag { color: #34d399; }
.term-line.warn .t-tag { color: #fbbf24; }
.term-line.error .t-tag { color: #f87171; }
.term-line.success .t-msg { color: #a7f3d0; }
.term-line.warn .t-msg { color: #fef08a; }

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========================================================
   战术级全屏弹窗基础 (Tactical Esports Modals)
   ======================================================== */
.tactical-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(4, 5, 8, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: modal-fade-in 0.18s ease-out;
}

@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.tactical-modal-window {
  width: 100%;
  background: #0c0e14;
  border: 1px solid rgba(255, 42, 85, 0.45);
  border-left: 4px solid #ff2a5f;
  box-shadow: 0 0 40px rgba(255, 42, 85, 0.18), 0 24px 60px rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-pop {
  from { transform: scale(0.96) translateY(8px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.terminal-modal-styled {
  max-width: 900px;
  height: 640px;
  max-height: 88vh;
}

.strategy-modal-styled {
  max-width: 640px;
  max-height: 88vh;
}

.rewards-modal-styled {
  max-width: 820px;
  max-height: 88vh;
}

.modal-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 22px;
  background: #10131b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.modal-eyebrow {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: #ff2a5f;
  text-transform: uppercase;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
}

.modal-title-icon {
  width: 18px;
  height: 18px;
  stroke: #ff2a5f;
}

.modal-tag-badge {
  font-size: 11px;
  font-weight: 800;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 2px 7px;
}

.modal-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-color: #ffffff;
}

.mini-svg {
  width: 13px;
  height: 13px;
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background: #ff2a5f;
  border-color: #ff2a5f;
  color: #ffffff;
}

/* 弹窗终端控制台主体 */
.terminal-modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: #050609;
  padding: 16px 20px;
  font-family: 'JetBrains Mono', Consolas, 'Courier New', monospace;
  font-size: 12.5px;
  line-height: 1.6;
}

.terminal-empty-hint {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  padding: 40px 20px;
}

.empty-cursor {
  font-size: 28px;
  font-weight: 900;
  color: #ff2a5f;
  animation: blink 1s infinite step-start;
}

@keyframes blink {
  50% { opacity: 0; }
}

.terminal-feed-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.modal-footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 22px;
  background: #0e1117;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.footer-status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.footer-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

/* 守护策略弹窗样式 */
.strategy-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.strategy-section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sec-label {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  color: #ff2a5f;
  text-transform: uppercase;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-strategy-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-strategy-list .strategy-row {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-net-rows {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.modal-net-actions {
  display: flex;
  gap: 10px;
}

.champ-btn-primary.mini,
.champ-btn-secondary.mini {
  padding: 6px 14px;
  font-size: 11.5px;
}

.mini-wide {
  width: 100%;
  justify-content: center;
  text-align: center;
}

/* 全阶段奖励图鉴弹窗 */
.rewards-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px;
  max-height: 520px;
}

.modal-rewards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-empty {
  padding: 40px 20px;
  text-align: center;
}

@media (max-width: 1100px) {
  .command-flow-heading { align-items: flex-start; flex-direction: column; gap: 12px; }
  .control-top-grid {
    grid-template-columns: 1fr;
  }
  .middle-actions-bar {
    grid-column: 1;
    flex-wrap: wrap;
  }
}
</style>
