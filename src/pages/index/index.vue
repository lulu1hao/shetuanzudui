<template>
  <div class="container" ref="pageRoot" :class="{ 'hero-expanded': isHeroExpanded }">
    <!-- 侧边栏 -->
    <div class="sidebar glass-panel" ref="heroPanel" @wheel="handleHeroWheel">
      <div class="hero-wheel-hint" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="m7 11 5-5 5 5M12 6v12" /></svg>
        <span>向上滚动展开</span>
      </div>
      <button
        v-if="isHeroExpanded"
        class="hero-collapse-button"
        type="button"
        aria-label="收起全屏展示"
        title="收起"
        @click="collapseHero"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" /></svg>
      </button>
    </div>

    <div class="content-stack">
      <section class="profile-section" aria-label="系统介绍">
        <div class="profile-dock">
          <div class="creator-card">
            <div class="creator-avatar-container">
              <img src="./creator_avatar.jpg" alt="创建者头像" class="creator-avatar" />
            </div>
          </div>

          <div class="profile-identity">
            <div class="sidebar-logo">
              <span class="logo-title">lulululululululu</span>
            </div>
            <div class="profile-tags" aria-label="创建者标语">
              <span>the finals会在N+1赛季重新火起来的</span>
            </div>
          </div>

          <div class="sidebar-stats">
            <div class="stat-item">
              <span class="stat-num">{{ rooms.length }}</span>
              <span class="stat-label">历史房间</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 顶栏 -->
        <div class="topbar">
          <div class="title-left">
            <div class="title-indicator"></div>
            <h1 class="section-title">活动 / 赛事大厅</h1>
          </div>
          <button class="create-btn-top glass-panel" @click="showCreateModal">
            <span class="plus-icon">＋</span> 创建房间 / 赛事
          </button>
        </div>

        <div class="lobby-tabs">
          <button
            v-for="(tabName, idx) in lobbyTabs"
            :key="idx"
            class="lobby-tab"
            :class="{ 'active': currentLobbyTab === idx }"
            @click="selectLobbyTab(idx)"
          >{{ tabName }}</button>
          <span class="finals-mark">THE FINALS</span>
        </div>

        <!-- 房间大厅 (Tab 0) -->
        <template v-if="currentLobbyTab === 0">
          <!-- 空状态 -->
          <div v-if="rooms.length === 0" class="empty-state glass-panel">
            <div class="empty-icon-wrap">
              <svg viewBox="0 0 24 24" class="empty-svg" aria-hidden="true">
                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7M3 7l9 6 9-6M3 7l9-4 9 4" />
              </svg>
            </div>
            <span class="empty-title">暂无活动房间</span>
            <span class="empty-desc">赶紧点击下方按钮创建一个吧！</span>
            <button class="create-btn-lg" @click="showCreateModal">创建第一个房间 / 赛事</button>
          </div>

          <!-- 房间网格 -->
          <div v-else class="room-grid">
            <div
              v-for="room in rooms"
              :key="room.id"
              class="room-card glass-panel"
              :data-room-id="room.id"
              :class="{ 'tournament-card-border': room.type === 'tournament' }"
              @click="goToRoom(room)"
            >
              <div class="room-card-header">
                <span class="room-name">
                  <span class="trophy-prefix" v-if="room.type === 'tournament'">🏆 </span>
                  {{ room.name }}
                </span>
                <div class="room-card-actions">
                  <span class="room-type-tag" :class="{ 'tag-tournament': room.type === 'tournament' }">
                    {{ room.type === 'tournament' ? '赛事' : '组队' }}
                  </span>
                  <button
                    class="delete-room-btn"
                    type="button"
                    title="删除房间"
                    aria-label="删除房间"
                    @click.stop="confirmDeleteRoom(room)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="room-badge" :class="{ 'tournament-badge': room.type === 'tournament' }">
                <div class="room-mode-row">
                  <span>{{ getRoomPrimaryLabel(room) }}</span>
                  <span>{{ getRoomCapacityLabel(room) }}</span>
                </div>
                <span class="badge-text" :class="{ 'tournament-badge-text': room.type === 'tournament' }">
                  {{ getRoomMapLabel(room) }}
                </span>
              </div>

              <!-- 赛事进度条 -->
              <div class="room-info" v-if="room.type === 'tournament'">
                <div class="info-label-row">
                  <span class="info-label">赛事进度 (完赛场次)</span>
                  <span class="info-value">{{ getCompletedMatchesCount(room) }} / {{ getTotalMatchesCount(room) }} 场</span>
                </div>
                <div class="progress-bar-bg">
                  <div
                    class="progress-bar-fill progress-tournament-fill"
                    :style="{ width: (getTotalMatchesCount(room) > 0 ? (getCompletedMatchesCount(room) / getTotalMatchesCount(room) * 100) : 0) + '%' }"
                  ></div>
                </div>
              </div>

              <!-- 组队进度条 -->
              <div class="room-info" v-else>
                <div class="info-label-row">
                  <span class="info-label">已加入成员</span>
                  <span class="info-value">{{ room.members ? room.members.length : 0 }} / {{ getRoomMaxCapacity(room) }}</span>
                </div>
                <div class="progress-bar-bg">
                  <div
                    class="progress-bar-fill"
                    :style="{ width: ((room.members ? room.members.length : 0) / getRoomMaxCapacity(room) * 100) + '%' }"
                  ></div>
                </div>
              </div>

              <div class="room-footer">
                <span class="created-time">创建时间：{{ room.createdAt }}</span>
                <span class="updated-time">最后更新：{{ room.updatedAt || room.createdAt }}</span>
                <button class="enter-btn" :class="{ 'enter-btn-tournament': room.type === 'tournament' }">
                  {{ room.type === 'tournament' ? '进入赛事' : '进入组队' }}
                </button>
              </div>
            </div>

            <!-- THE FINALS 实时战绩中心快捷卡片 -->
            <div class="room-card glass-panel finals-feature-card" @click="goToLeaderboard">
              <div class="room-card-header">
                <span class="room-name">
                  THE FINALS 实时战绩中心
                </span>
                <div class="room-card-actions">
                  <span class="room-type-tag tag-finals-live">S11 LIVE</span>
                </div>
              </div>
              <div class="room-badge finals-feature-badge">
                <div class="room-mode-row">
                  <span>全球前 10,000 名实时天梯</span>
                  <span>S1~S11 全覆盖</span>
                </div>
                <span class="badge-text tournament-badge-text">
                  排位 RS · 世界巡回赛 · 赞助商争霸
                </span>
              </div>
              <div class="room-info">
                <div class="info-label-row">
                  <span class="info-label">数据状态</span>
                  <span class="info-value" style="color: #34d399">● 实时同步中</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill progress-tournament-fill" style="width: 100%"></div>
                </div>
              </div>
              <div class="room-footer">
                <span class="created-time">数据源：Embark 官方公开排行榜</span>
                <button class="enter-btn enter-btn-tournament">
                  进入查询
                </button>
              </div>
            </div>

            <!-- THE FINALS 装备与配装中心快捷卡片 -->
            <div class="room-card glass-panel finals-feature-card finals-equipment-card" @click="goToEquipment">
              <div class="room-card-header">
                <span class="room-name">
                  THE FINALS 装备与配装中心
                </span>
                <div class="room-card-actions">
                  <span class="room-type-tag tag-finals-live">WIKI SYNC</span>
                </div>
              </div>
              <div class="room-badge finals-feature-badge">
                <div class="room-mode-row">
                  <span>全职业 86 件全赛季军械库</span>
                  <span>武器 · 特长 · 战术道具</span>
                </div>
                <span class="badge-text tournament-badge-text">
                  Wiki 实时属性同步 · 自由配装模拟器
                </span>
              </div>
              <div class="room-info">
                <div class="info-label-row">
                  <span class="info-label">Wiki 同步状态</span>
                  <span class="info-value" style="color: #34d399">● 实时直连与离线双模</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill progress-tournament-fill" style="width: 100%"></div>
                </div>
              </div>
              <div class="room-footer">
                <span class="created-time">数据源：THE FINALS 官方 Wiki 直连</span>
                <button class="enter-btn enter-btn-tournament">
                  进入装备 →
                </button>
              </div>
            </div>

            <button class="create-room-tile" @click="showCreateModal" title="创建房间 / 赛事">
              <span>+</span>
            </button>
          </div>
        </template>

        <!-- 问题反馈(与我联系) Tab (Tab 3) -->
        <template v-else-if="currentLobbyTab === 3">
          <div class="feedback-container glass-panel">
            <div class="feedback-header">
              <div class="feedback-badge">CONTACT & FEEDBACK</div>
              <h2 class="feedback-title">问题反馈与联系作者</h2>
              <p class="feedback-subtitle">如果你在使用《社团组队系统》过程中遇到任何问题，或有新功能建议与社团赛事合作意向，欢迎直接与作者取得联系！</p>
            </div>

            <div class="feedback-cards-grid">
              <!-- 微信联系卡片 -->
              <div class="contact-card">
                <div class="contact-card-top">
                  <div class="contact-icon-box">
                    <svg viewBox="0 0 24 24" class="wechat-svg" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                  </div>
                  <div class="contact-info-block">
                    <span class="contact-type-tag">官方微信 (WECHAT)</span>
                    <span class="contact-value">zy1368921317</span>
                  </div>
                </div>
                <div class="contact-actions">
                  <button class="copy-wechat-btn" @click="copyWechat('zy1368921317')">
                    <svg viewBox="0 0 24 24" class="copy-svg"><path d="M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.242a2 2 0 0 0-.602-1.43L16.083 2.57A2 2 0 0 0 14.685 2H10a2 2 0 0 0-2 2z"/><path d="M16 18v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2"/></svg>
                    <span>一键复制微信号</span>
                  </button>
                  <span class="copy-hint">添加好友时请备注：<strong>社团组队反馈</strong></span>
                </div>
              </div>

              <!-- 软件与作者信息卡片 -->
              <div class="contact-card system-info-card">
                <div class="info-row check-update-row">
                  <span class="info-label">系统版本</span>
                  <div class="version-action-box">
                    <span class="info-val version-val">v{{ currentAppVersion }} (正式版)</span>
                    <button class="check-update-btn" @click="handleManualCheckUpdate" :disabled="isCheckingUpdate">
                      {{ isCheckingUpdate ? '正在检测...' : '检查更新 ⟳' }}
                    </button>
                  </div>
                </div>
                <div class="info-row">
                  <span class="info-label">系统创建者</span>
                  <span class="info-val">lulululululululu</span>
                </div>
                <div class="info-row">
                  <span class="info-label">反馈范围</span>
                  <span class="info-val">Bug 修复 / 赛制扩展 / 装备属性纠错 / 赞助合作</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 其它暂未开放 Tab -->
        <template v-else>
          <div class="empty-state glass-panel dev-tab-state">
            <div class="empty-icon-wrap">
              <svg viewBox="0 0 24 24" class="empty-svg" aria-hidden="true">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <span class="empty-title">“{{ lobbyTabs[currentLobbyTab] }}” 模块全力开发中</span>
            <span class="empty-desc">更多社团专属交流与活动板块即将上线，敬请期待！</span>
            <button class="create-btn-lg" @click="selectLobbyTab(0)">返回活动大厅</button>
          </div>
        </template>
      </div>
    </div>

    <!-- 创建弹窗 -->
    <div v-if="isCreateModalVisible" class="modal-mask" @click.self="closeCreateModal">
      <div class="modal-content glass-panel">
        <div class="modal-header">
          <span class="modal-title">新建房间 / 赛事</span>
          <button class="modal-close" @click="closeCreateModal">✕</button>
        </div>

        <div class="modal-scroll-body">
          <div class="modal-body">
            <!-- 房间名称 -->
            <div class="form-item">
              <label class="form-label">房间名称</label>
              <input
                type="text"
                class="form-input"
                placeholder="请输入名称，如：周六水友赛事"
                v-model="newRoomName"
                autofocus
              />
            </div>

            <!-- 房间类型 -->
            <div class="form-item">
              <label class="form-label">房间类型</label>
              <div class="modal-mode-grid">
                <div class="modal-mode-card" :class="{ 'active': newRoomType === 'normal' }" @click="selectNewRoomType('normal')">
                  <span class="modal-mode-name">普通组队</span>
                </div>
                <div class="modal-mode-card type-tournament-card" :class="{ 'active': newRoomType === 'tournament' }" @click="selectNewRoomType('tournament')">
                  <span class="modal-mode-name">赛事房间</span>
                </div>
              </div>
            </div>

            <!-- 赛事专属 -->
            <template v-if="newRoomType === 'tournament'">
              <div class="form-item">
                <label class="form-label">提现锦标赛 · 参赛队伍数量</label>
                <div class="modal-teams-grid">
                  <div
                    v-for="count in [4, 6, 8]"
                    :key="count"
                    class="modal-team-count-card"
                    :class="{ 'active': newTeamCount === count }"
                    @click="selectNewTeamCount(count)"
                  >
                    <span class="modal-team-count-num">{{ count }}</span>
                    <span class="modal-team-count-label">队</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- 普通房间专属 -->
            <template v-else>
              <div class="form-item">
                <label class="form-label">初始房间模式</label>
                <div class="modal-mode-grid">
                  <div
                    v-for="opt in modeOptions"
                    :key="opt.key"
                    class="modal-mode-card"
                    :class="{ 'active': newRoomMode === opt.key }"
                    @click="selectNewRoomMode(opt.key)"
                  >
                    <span class="modal-mode-name">{{ opt.shortName }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- 地图选择 -->
            <div class="form-item">
              <label class="form-label">初始比赛地图</label>
              <div class="modal-map-grid">
                <div
                  class="modal-map-capsule"
                  :class="{ 'active': newRoomMap === 'random' }"
                  @click="selectNewRoomMap('random')"
                >随机地图</div>
                <div
                  v-for="mapName in MAPS"
                  :key="mapName"
                  class="modal-map-capsule"
                  :class="{ 'active': newRoomMap === mapName }"
                  @click="selectNewRoomMap(mapName)"
                >{{ mapName }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn-cancel" @click="closeCreateModal">取消</button>
          <button class="modal-btn-confirm" @click="handleCreateRoom">确认创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { roomStore, MODES, MAPS } from '../../store/roomStore.js'
import { useToast } from '../../composables/useToast.js'
import { useUpdater } from '../../composables/useUpdater.js'
import { getVersion } from '@tauri-apps/api/app'
import pkg from '../../../package.json'
import {
  beginLuluDisplayTransition,
  consumeLobbyReturnRoomId,
  expandGlobalLulu,
  placeGlobalLuluInLobby,
  resetGlobalLuluState,
  settleLobbyReturnTransition,
  TOURNAMENT_DISPLAY_REVEAL_DURATION
} from '../../utils/globalLuluTransition.js'

export default {
  setup() {
    const router = useRouter()
    const { showToast, showModal } = useToast()

    const rooms = computed(() => roomStore.getRooms())
    const isCreateModalVisible = ref(false)
    const newRoomName = ref('')
    const newRoomType = ref('normal')
    const newTeamCount = ref(4)
    const newRoomMode = ref('cashout')
    const newRoomMap = ref('random')
    const pageRoot = ref(null)
    const heroPanel = ref(null)
    const isHeroExpanded = ref(false)
    const currentLobbyTab = ref(0)
    const lobbyTabs = ['活动 / 赛事大厅', 'THE FINALS 积分查询', '装备', '问题反馈(与我联系)']
    let gsapContext
    let heroTransition
    let tournamentLaunchTimeline
    let reduceMotion = false
    let isHeroAnimating = false
    let isNavigatingToTournament = false

    const modeOptions = [
      { key: 'cashout', shortName: '提现模式' },
      { key: 'quickcash', shortName: '金爆点' },
      { key: 'team', shortName: '团队模式' }
    ]

    const totalMembers = computed(() => {
      return rooms.value.reduce((acc, room) => acc + (room.members ? room.members.length : 0), 0)
    })

    const selectNewRoomType = (v) => { newRoomType.value = v }
    const selectNewTeamCount = (v) => { newTeamCount.value = v }
    const selectNewRoomMode = (v) => { newRoomMode.value = v }
    const selectNewRoomMap = (v) => { newRoomMap.value = v }

    const goToLeaderboard = () => {
      if (isNavigatingToTournament) return
      isNavigatingToTournament = true
      const navigate = () => router.push('/leaderboard')

      if (reduceMotion || !pageRoot.value || !heroPanel.value) {
        navigate()
        return
      }

      pageRoot.value.classList.add('tournament-launching')
      heroTransition?.kill()

      const expandedHeight = pageRoot.value.clientHeight || window.innerHeight || 500
      const profileDock = pageRoot.value.querySelector('.profile-dock')
      const profileSection = pageRoot.value.querySelector('.profile-section')
      const mainContentEl = pageRoot.value.querySelector('.main-content')
      const alignmentY = profileDock && profileSection
        ? profileSection.getBoundingClientRect().top - profileDock.getBoundingClientRect().top
        : 0

      tournamentLaunchTimeline = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          navigate()
        }
      })
        .call(() => {
          beginLuluDisplayTransition('leaderboard')
        }, null, 0)
        .to(heroPanel.value, {
          height: expandedHeight,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          willChange: 'height'
        }, 0)
        .to(profileDock ? [profileDock] : [], {
          y: alignmentY,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          willChange: 'transform'
        }, 0)
      if (mainContentEl && !reduceMotion) {
        tournamentLaunchTimeline.to(mainContentEl, {
          y: 70,
          autoAlpha: 0,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power2.in'
        }, 0)
      }
    }

    const goToEquipment = () => {
      if (isNavigatingToTournament) return
      isNavigatingToTournament = true
      const navigate = () => router.push('/equipment')

      if (reduceMotion || !pageRoot.value || !heroPanel.value) {
        navigate()
        return
      }

      pageRoot.value.classList.add('tournament-launching')
      heroTransition?.kill()

      const expandedHeight = pageRoot.value.clientHeight || window.innerHeight || 500
      const profileDock = pageRoot.value.querySelector('.profile-dock')
      const profileSection = pageRoot.value.querySelector('.profile-section')
      const mainContentEl = pageRoot.value.querySelector('.main-content')
      const alignmentY = profileDock && profileSection
        ? profileSection.getBoundingClientRect().top - profileDock.getBoundingClientRect().top
        : 0

      tournamentLaunchTimeline = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          navigate()
        }
      })
        .call(() => {
          beginLuluDisplayTransition('equipment')
        }, null, 0)
        .to(heroPanel.value, {
          height: expandedHeight,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          willChange: 'height'
        }, 0)
        .to(profileDock ? [profileDock] : [], {
          y: alignmentY,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          willChange: 'transform'
        }, 0)
      if (mainContentEl && !reduceMotion) {
        tournamentLaunchTimeline.to(mainContentEl, {
          y: 70,
          autoAlpha: 0,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power2.in'
        }, 0)
      }
    }

    const selectLobbyTab = (idx) => {
      if (idx === 1) {
        goToLeaderboard()
        return
      }
      if (idx === 2) {
        goToEquipment()
        return
      }
      currentLobbyTab.value = idx
      if (idx > 3) {
        showToast(`功能“${lobbyTabs[idx]}”正在全力开发中，敬请期待！`, 'none')
      }
    }

    const copyWechat = async (id) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(id)
        } else {
          const input = document.createElement('input')
          input.value = id
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
        }
        showToast(`微信号已复制: ${id}，去微信添加好友吧！`, 'success')
      } catch (e) {
        showToast(`微信号: ${id}`, 'none')
      }
    }

    const { checkForUpdates } = useUpdater()
    const isCheckingUpdate = ref(false)
    const currentAppVersion = ref(pkg.version || '4.0.3')

    const handleManualCheckUpdate = async () => {
      if (isCheckingUpdate.value) return
      isCheckingUpdate.value = true
      showToast('正在向云端检查最新版本...', 'none')
      try {
        const res = await checkForUpdates(false)
        if (res?.status === 'latest') {
          showToast(`当前已是最新版本 v${currentAppVersion.value}`, 'success')
        } else if (res?.status === 'error') {
          showToast(`检查更新提示: ${res.msg}`, 'none')
        }
      } catch (err) {
        showToast(`检查更新异常: ${err?.message || err}`, 'none')
      } finally {
        isCheckingUpdate.value = false
      }
    }

    const syncLobbyMarquee = () => {
      if (heroPanel.value && !isHeroExpanded.value && !isNavigatingToTournament) {
        placeGlobalLuluInLobby(heroPanel.value)
      }
    }

    const LOBBY_HERO_SETTLED_HEIGHT = 200

    onMounted(() => {
      getVersion().then(v => { if (v) currentAppVersion.value = v }).catch(() => {})
      isNavigatingToTournament = false
      isHeroExpanded.value = false
      isHeroAnimating = false
      if (!pageRoot.value) return
      pageRoot.value.classList.remove('tournament-launching', 'hero-expanded', 'lobby-returning')
      gsapContext = gsap.context(() => {
        reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }, pageRoot.value)

      window.addEventListener('keydown', handleHeroKeydown)
      window.addEventListener('resize', syncLobbyMarquee)
      const profileDock = pageRoot.value.querySelector('.profile-dock')
      const profileSection = pageRoot.value.querySelector('.profile-section')
      consumeLobbyReturnRoomId()
      const isReturningFromTournament = settleLobbyReturnTransition(heroPanel.value, {
        onComplete: () => {
          pageRoot.value?.classList.remove('lobby-returning')
          syncLobbyMarquee()
        }
      })

      if (!isReturningFromTournament) {
        resetGlobalLuluState()
        placeGlobalLuluInLobby(heroPanel.value)
      } else {
        pageRoot.value.classList.add('lobby-returning')
        const expandedHeight = pageRoot.value.clientHeight
        const alignmentY = profileDock && profileSection
          ? profileSection.getBoundingClientRect().top - profileDock.getBoundingClientRect().top
          : 0
        const mainContentEl = pageRoot.value.querySelector('.main-content')
        gsap.set(heroPanel.value, { height: expandedHeight, willChange: 'height' })
        gsap.set(profileDock, { y: alignmentY, willChange: 'transform' })
        if (mainContentEl && !reduceMotion) {
          gsap.set(mainContentEl, { autoAlpha: 0, y: 24 })
        }
        heroTransition = gsap.timeline({
          defaults: { overwrite: 'auto' },
          onComplete: () => {
            if (mainContentEl) {
              gsap.set(mainContentEl, { clearProps: 'all' })
            }
          }
        })
          .to(heroPanel.value, {
            height: LOBBY_HERO_SETTLED_HEIGHT,
            duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION,
            ease: 'power3.inOut',
            clearProps: 'height,will-change'
          }, 0)
          .to(profileDock, {
            y: 0,
            duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION,
            ease: 'power3.inOut',
            clearProps: 'transform,will-change'
          }, 0)
        if (mainContentEl && !reduceMotion) {
          heroTransition.to(mainContentEl, {
            autoAlpha: 1,
            y: 0,
            duration: 0.48,
            ease: 'power2.out',
            clearProps: 'all'
          }, 0.2)
        }
      }
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleHeroKeydown)
      window.removeEventListener('resize', syncLobbyMarquee)
      heroTransition?.kill()
      tournamentLaunchTimeline?.kill()
      pageRoot.value?.classList.remove('tournament-launching', 'lobby-returning', 'hero-expanded')
      isNavigatingToTournament = false
      isHeroExpanded.value = false
      isHeroAnimating = false
      gsapContext?.revert()
    })

    const expandHero = () => {
      if (isHeroExpanded.value || isHeroAnimating || !heroPanel.value || !pageRoot.value) return
      isHeroAnimating = true
      isHeroExpanded.value = true

      const expandedHeight = pageRoot.value.clientHeight || window.innerHeight || 500
      const expandedFontSize = Math.min(340, Math.max(180, window.innerWidth * 0.21))
      const expandedViewportHeight = Math.min(window.innerHeight * 0.42, 330)
      const profileDock = pageRoot.value.querySelector('.profile-dock')
      const profileSection = pageRoot.value.querySelector('.profile-section')
      const mainContentEl = pageRoot.value.querySelector('.main-content')
      const alignmentY = profileDock && profileSection
        ? profileSection.getBoundingClientRect().top - profileDock.getBoundingClientRect().top
        : 0

      heroTransition = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          isHeroAnimating = false
        }
      })
        .call(() => {
          expandGlobalLulu(
            heroPanel.value,
            expandedHeight,
            expandedViewportHeight,
            expandedFontSize,
            { duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION }
          )
        }, null, 0)
        .to(profileDock ? [profileDock] : [], {
          y: alignmentY,
          duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          willChange: 'transform'
        }, 0)
        .to(heroPanel.value, {
          height: expandedHeight,
          duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          willChange: 'height'
        }, 0)
        .fromTo('.hero-collapse-button', {
          autoAlpha: 0,
          scale: 0.78,
          rotation: -8
        }, {
          autoAlpha: 1,
          scale: 1,
          rotation: 0,
          duration: reduceMotion ? 0 : 0.36,
          ease: 'back.out(1.5)'
        }, reduceMotion ? 0 : 0.46)
      if (mainContentEl && !reduceMotion) {
        heroTransition.to(mainContentEl, {
          autoAlpha: 0,
          duration: 0.18,
          ease: 'power2.in'
        }, 0)
      }
    }

    const collapseHero = () => {
      if (!isHeroExpanded.value || isHeroAnimating || !heroPanel.value || !pageRoot.value) return
      isHeroAnimating = true
      const profileDock = pageRoot.value.querySelector('.profile-dock')
      const mainContentEl = pageRoot.value.querySelector('.main-content')
      placeGlobalLuluInLobby(heroPanel.value, {
        duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION,
        holdDisplayLayer: true
      })

      heroTransition?.kill()
      heroTransition = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          isHeroExpanded.value = false
          isHeroAnimating = false
          if (mainContentEl) {
            gsap.set(mainContentEl, { clearProps: 'all' })
          }
        }
      })
        .to(heroPanel.value, {
          height: LOBBY_HERO_SETTLED_HEIGHT,
          duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          clearProps: 'height,will-change'
        }, 0)
        .to('.hero-collapse-button', {
          autoAlpha: 0,
          scale: 0.88,
          duration: reduceMotion ? 0 : 0.22,
          ease: 'power2.in'
        }, 0)
        .to(profileDock ? [profileDock] : [], {
          y: 0,
          duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          clearProps: 'transform,will-change'
        }, 0)
      if (mainContentEl && !reduceMotion) {
        heroTransition.to(mainContentEl, {
          autoAlpha: 1,
          duration: 0.48,
          ease: 'power2.out',
          clearProps: 'all'
        }, 0.2)
      }
    }

    const handleHeroWheel = (event) => {
      if (!isHeroExpanded.value && event.deltaY < -8) {
        event.preventDefault()
        expandHero()
      }
    }

    const handleHeroKeydown = (event) => {
      if (event.key === 'Escape') collapseHero()
    }

    const showCreateModal = () => {
      newRoomName.value = ''; newRoomType.value = 'normal'
      newTeamCount.value = 4; newRoomMode.value = 'cashout'; newRoomMap.value = 'random'
      isCreateModalVisible.value = true
    }
    const closeCreateModal = () => { isCreateModalVisible.value = false }

    const handleCreateRoom = () => {
      const name = newRoomName.value.trim()
      if (!name) { showToast('请输入名称'); return }
      const options = { type: newRoomType.value }
      if (newRoomType.value === 'tournament') { options.tournamentType = 'cashout'; options.teamCount = newTeamCount.value }
      const mode = newRoomType.value === 'normal' ? newRoomMode.value : 'cashout'
      const room = roomStore.createRoom(name, mode, newRoomMap.value, options)
      closeCreateModal()
      showToast('创建成功', 'success')
      setTimeout(() => goToRoom(room), 300)
    }

    const confirmDeleteRoom = async (room) => {
      const confirmed = await showModal('提示', `确定要删除房间"${room.name}"吗？此操作不可撤销。`, '#ef4444')
      if (confirmed) {
        roomStore.deleteRoom(room.id)
        showToast('删除成功')
      }
    }

    const goToRoom = (room) => {
      if (isNavigatingToTournament) return
      isNavigatingToTournament = true
      const navigate = () => router.push({
        path: room.type === 'tournament' ? '/tournament' : '/room',
        query: { id: room.id }
      })

      if (reduceMotion || !pageRoot.value || !heroPanel.value) {
        navigate()
        return
      }

      pageRoot.value.classList.add('tournament-launching')
      heroTransition?.kill()

      const expandedHeight = pageRoot.value.clientHeight || window.innerHeight || 500
      const profileDock = pageRoot.value.querySelector('.profile-dock')
      const profileSection = pageRoot.value.querySelector('.profile-section')
      const mainContentEl = pageRoot.value.querySelector('.main-content')
      const alignmentY = profileDock && profileSection
        ? profileSection.getBoundingClientRect().top - profileDock.getBoundingClientRect().top
        : 0

      tournamentLaunchTimeline = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          navigate()
        }
      })
        .call(() => {
          beginLuluDisplayTransition(room.id)
        }, null, 0)
        .to(heroPanel.value, {
          height: expandedHeight,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          willChange: 'height'
        }, 0)
        .to(profileDock ? [profileDock] : [], {
          y: alignmentY,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          willChange: 'transform'
        }, 0)
      if (mainContentEl && !reduceMotion) {
        tournamentLaunchTimeline.to(mainContentEl, {
          y: 70,
          autoAlpha: 0,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power2.in'
        }, 0)
      }
    }

    const getRoomPrimaryLabel = (room) => {
      if (room.type === 'tournament') return '提现锦标赛'
      const activeModeKey = room.activeMode || room.mode || 'cashout'
      return (MODES[activeModeKey] || MODES.cashout).name
    }

    const getRoomCapacityLabel = (room) => {
      if (room.type === 'tournament') return `${room.teamCount || 4}支队伍`
      return `上限${getRoomMaxCapacity(room)}人`
    }

    const getRoomMapLabel = (room) => {
      const mapName = room.map === 'random' ? (room.activeMap || '摩纳哥') : (room.map || '未知地图')
      return `随机地图(${mapName})`
    }

    const getRoomMaxCapacity = (room) => {
      const activeModeKey = room.activeMode || room.mode || 'cashout'
      return (MODES[activeModeKey] || MODES.cashout).maxMembers
    }
    const getCompletedMatchesCount = (room) => room.matches ? room.matches.filter(m => m.status === 'completed').length : 0
    const getTotalMatchesCount = (room) => room.matches ? room.matches.length : 0

    return {
      rooms, totalMembers, isCreateModalVisible, newRoomName, newRoomType,
      pageRoot, heroPanel, isHeroExpanded, currentLobbyTab, lobbyTabs, selectLobbyTab, goToLeaderboard, goToEquipment,
      newTeamCount, newRoomMode, newRoomMap, modeOptions, MAPS,
      selectNewRoomType, selectNewTeamCount, selectNewRoomMode, selectNewRoomMap,
      expandHero, collapseHero, handleHeroWheel,
      showCreateModal, closeCreateModal, handleCreateRoom, confirmDeleteRoom, goToRoom,
      getRoomPrimaryLabel, getRoomCapacityLabel, getRoomMapLabel,
      getRoomMaxCapacity, getCompletedMatchesCount, getTotalMatchesCount,
      copyWechat, handleManualCheckUpdate, isCheckingUpdate, currentAppVersion
    }
  }
}
</script>

<style scoped>
.container {
  display: flex;
  height: 100%;
  overflow: hidden;
  position: relative;
  flex-direction: column;
  background: #232323;
  color: #f5f5f5;
}

/* 侧边栏与头部 Hero */
.sidebar {
  width: 100%;
  height: 200px;
  min-height: 200px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  position: relative;
  overflow: hidden;
  background: linear-gradient(145deg, #8e0b24 0%, #d71442 58%, #ef174e 100%);
  box-shadow: none;
  perspective: 900px;
}

.hero-wheel-hint {
  position: absolute;
  right: 22px;
  top: 14px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  pointer-events: none;
}

.hero-wheel-hint svg,
.hero-collapse-button svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hero-collapse-button {
  position: absolute;
  left: 24px;
  top: 24px;
  z-index: 60;
  width: 48px;
  height: 48px;
  min-height: 48px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 50%;
  background: rgba(20, 20, 20, 0.4);
  color: #ffffff;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.2s ease;
}

.hero-collapse-button:hover {
  background: rgba(20, 20, 20, 0.65);
  border-color: rgba(255, 255, 255, 0.85);
  transform: scale(1.06);
}

.hero-collapse-button:focus-visible {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.45);
}

.hero-expanded .sidebar {
  z-index: 0;
  overflow: hidden;
  box-shadow: none;
}

.hero-expanded .hero-wheel-hint {
  display: none;
}

.content-stack {
  position: relative;
  z-index: 10;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #242424;
}

.hero-expanded .content-stack {
  pointer-events: none;
}

/* 个人信息栏 (确保层级高于跑马灯画布，文字始终不被覆盖) */
.profile-section {
  position: relative;
  z-index: 70;
  flex: 0 0 54px;
  min-height: 54px;
  background: #242424;
  overflow: visible;
}

.profile-dock {
  position: absolute;
  left: 32px;
  right: 32px;
  top: -48px;
  height: 96px;
  max-width: 1720px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 68px 1fr auto;
  align-items: center;
  gap: 24px;
  padding: 10px 22px;
  border: 0;
  background: transparent;
  backdrop-filter: none;
  box-shadow: none;
  overflow: visible;
  z-index: 75;
}

.creator-card {
  position: relative;
  width: 68px;
  height: 68px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 0;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.creator-avatar-container {
  width: 100%;
  height: 100%;
  padding: 0;
  border-radius: 0;
  background: #ffffff;
}

.creator-avatar {
  width: 100%;
  height: 100%;
  border-radius: 0;
  border: 0;
  background: #ffffff;
  object-fit: cover;
}

.profile-identity {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
}

.logo-title {
  display: block;
  color: #ffffff;
  font-size: clamp(20px, 2vw, 30px);
  line-height: 1.12;
  font-weight: 1000;
  letter-spacing: -0.03em;
  white-space: nowrap;
  text-shadow: 0 3px 0 rgba(54, 5, 18, 0.42);
}

.profile-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: nowrap;
  overflow: hidden;
}

.profile-tags span {
  flex: none;
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.88);
  font-size: 11.5px;
  line-height: 1.2;
  font-weight: 700;
  white-space: nowrap;
}

.sidebar-stats {
  position: relative;
  min-width: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-left: 24px;
  border-left: 2px solid #f0224f;
  z-index: 1;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.stat-num {
  color: #ffffff;
  font-size: 32px;
  line-height: 1;
  font-weight: 300;
}

.stat-label {
  color: rgba(255, 255, 255, 0.52);
  font-size: 11px;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  min-height: 0;
  padding: 4px 58px 24px;
  background: #242424;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  z-index: 10;
}

.topbar {
  display: none;
}

.lobby-tabs {
  display: flex;
  align-items: center;
  gap: 32px;
  height: 44px;
  min-height: 44px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 12px;
  flex-shrink: 0;
}

.lobby-tab {
  height: 32px;
  min-height: 32px;
  padding: 0 0 0 10px;
  border: none;
  border-left: 3px solid rgba(255, 255, 255, 0.18);
  border-radius: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
  font-size: 17px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lobby-tab.active {
  border-left-color: #e11d48;
  color: #ffffff;
}

.lobby-tab:hover {
  color: #ffffff;
}

.finals-mark {
  margin-left: auto;
  color: #f1f1f1;
  font-size: 20px;
  font-weight: 1000;
  letter-spacing: -1px;
  transform: scaleX(0.88);
  opacity: 0.95;
  user-select: none;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  border: 1px solid rgba(225, 29, 72, 0.45);
  background: rgba(20, 20, 20, 0.74);
  padding: 40px;
}

.empty-icon-wrap {
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(225, 29, 72, 0.12);
  border: 1px solid rgba(225, 29, 72, 0.32);
  color: #e11d48;
  margin-bottom: 4px;
}

.empty-svg {
  width: 28px;
  height: 28px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.empty-title { font-size: 20px; font-weight: 700; color: #e5e7eb; }
.empty-desc { font-size: 13px; color: #9ca3af; }

.create-btn-lg {
  margin-top: 8px;
  padding: 12px 32px;
  background: #e11d48;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border: none;
  box-shadow: 0 10px 24px rgba(225, 29, 72, 0.28);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.create-btn-lg:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(225, 29, 72, 0.38);
}

/* 房间网格 */
.room-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px 36px;
  overflow-y: auto;
  align-content: start;
  padding: 4px 4px 20px 0;
}

.room-card {
  min-height: 198px;
  height: 198px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(225, 29, 72, 0.12)),
    #262323;
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.22);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.room-card:hover {
  transform: translateY(-2px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(225, 29, 72, 0.18)),
    #2a2525;
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.34);
}

.room-card-header {
  height: 42px;
  padding: 0 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f3f3f3;
  color: #e11d48;
}

.room-card.tournament-card-border .room-card-header {
  background: #e11d48;
  color: #ffffff;
}

.room-name {
  color: inherit;
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 12px;
}

.trophy-prefix {
  display: none;
}

.room-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.room-type-tag {
  font-size: 12px;
  font-weight: 800;
  color: inherit;
  opacity: 0.85;
}

.delete-room-btn {
  width: 24px;
  height: 24px;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: inherit;
  opacity: 0.55;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-room-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.delete-room-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.18);
  color: #ff2a4b;
  transform: scale(1.15);
}

.room-badge {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  margin: 20px 16px 0;
  gap: 2px;
  background: transparent !important;
}

.room-mode-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.5;
}

.badge-text,
.tournament-badge-text {
  display: block;
  color: #ffffff !important;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.55;
  opacity: 0.85;
}

.room-info {
  padding: 16px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.52);
}

.info-value {
  color: rgba(255, 255, 255, 0.82);
  font-weight: 600;
}

.progress-bar-bg {
  height: 4px;
  background: rgba(255, 255, 255, 0.13);
  border-radius: 0;
  overflow: hidden;
}

.progress-bar-fill,
.progress-tournament-fill {
  height: 100%;
  background: #e11d48 !important;
  border-radius: 0;
  transition: width 0.3s ease;
}

.room-footer {
  margin-top: auto;
  padding: 8px 16px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.created-time {
  color: rgba(255, 255, 255, 0.25);
  font-size: 10px;
}

.updated-time {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.25);
  font-size: 10px;
  white-space: nowrap;
}

.enter-btn {
  display: none;
}

.create-room-tile {
  width: 100%;
  min-height: 198px;
  height: 198px;
  background: rgba(34, 34, 34, 0.7);
  border: 1px dashed rgba(225, 29, 72, 0.55);
  border-radius: 0;
  color: rgba(255, 255, 255, 0.3);
  font-size: 54px;
  font-weight: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-room-tile:hover {
  color: #ffffff;
  border-color: #e11d48;
  background: rgba(225, 29, 72, 0.1);
  transform: translateY(-2px);
}

/* 创建弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(8, 8, 10, 0.78);
  backdrop-filter: blur(5px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  width: 520px;
  max-height: 85vh;
  background: rgba(34, 34, 34, 0.98) !important;
  border: 1px solid rgba(225, 29, 72, 0.5) !important;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.modal-title {
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
}

.modal-close {
  background: transparent;
  color: #9ca3af;
  font-size: 18px;
  padding: 4px 8px;
  border: none;
  cursor: pointer;
}

.modal-close:hover {
  color: #ffffff;
}

.modal-scroll-body {
  flex: 1;
  overflow-y: auto;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 12px;
  color: #ffffff;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-input {
  width: 100%;
  height: 40px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0;
  padding: 0 14px;
  font-size: 14px;
  color: #ffffff;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #e11d48;
}

.modal-mode-grid,
.modal-teams-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.modal-mode-card,
.modal-team-count-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.modal-mode-card:hover,
.modal-team-count-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.16);
}

.modal-mode-card.active,
.modal-team-count-card.active {
  border-color: #e11d48 !important;
  background: rgba(225, 29, 72, 0.16) !important;
  color: #ffffff;
}

.modal-mode-icon { font-size: 20px; }
.modal-mode-name { font-size: 12px; color: #ffffff; font-weight: 700; }
.modal-team-count-num { font-size: 18px; font-weight: 700; color: #ffffff; }
.modal-team-count-label { font-size: 11px; color: #9ca3af; }

.modal-map-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modal-map-capsule {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
  font-size: 12px;
  color: #ffffff;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-map-capsule:hover {
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
}

.modal-map-capsule.active {
  border-color: #e11d48 !important;
  background: rgba(225, 29, 72, 0.16) !important;
  color: #ffffff;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 14px 24px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.modal-btn-cancel {
  flex: 1;
  height: 40px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
  font-size: 14px;
  border-radius: 0;
  cursor: pointer;
}

.modal-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.08);
}

.modal-btn-confirm {
  flex: 2;
  height: 40px;
  background: #e11d48;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 0;
  border: none;
  box-shadow: 0 4px 16px rgba(225, 29, 72, 0.3);
  cursor: pointer;
}

.modal-btn-confirm:hover {
  box-shadow: 0 6px 20px rgba(225, 29, 72, 0.45);
}

/* 转场与动画保护 */
.tournament-launching {
  cursor: progress;
}

.tournament-launching .room-card,
.tournament-launching .create-room-tile,
.tournament-launching .lobby-tab {
  pointer-events: none;
}

.tournament-launching .hero-collapse-button {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

/* 问题反馈与联系作者模块 */
.feedback-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgba(26, 26, 28, 0.85);
  border: 1px solid rgba(225, 29, 72, 0.4);
  padding: 32px 36px;
  gap: 24px;
  overflow-y: auto;
}

.feedback-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feedback-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #ffffff;
  background: #e11d48;
  padding: 3px 8px;
  border-radius: 0;
}

.feedback-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
}

.feedback-subtitle {
  margin: 0;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
}

.feedback-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px;
}

.contact-card {
  background: rgba(36, 36, 38, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-radius: 0;
  transition: all 0.2s ease;
}

.contact-card:hover {
  border-color: rgba(225, 29, 72, 0.5);
  background: rgba(42, 36, 38, 0.95);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.contact-card-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.contact-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 0;
  background: rgba(225, 29, 72, 0.15);
  border: 1px solid rgba(225, 29, 72, 0.35);
  color: #e11d48;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wechat-svg {
  width: 26px;
  height: 26px;
}

.contact-info-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-type-tag {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.05em;
}

.contact-value {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.02em;
}

.contact-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.copy-wechat-btn {
  height: 42px;
  background: #e11d48;
  border: none;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 6px 18px rgba(225, 29, 72, 0.3);
}

.copy-wechat-btn:hover {
  background: #f43f5e;
  box-shadow: 0 8px 24px rgba(225, 29, 72, 0.45);
  transform: translateY(-1px);
}

.copy-svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}

.copy-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.copy-hint strong {
  color: rgba(255, 255, 255, 0.85);
}

.system-info-card {
  justify-content: center;
  gap: 14px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label {
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
}

.info-val {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.version-val {
  color: #34d399;
}

.version-action-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.check-update-btn {
  padding: 4px 12px;
  background: rgba(225, 29, 72, 0.15);
  border: 1px solid rgba(225, 29, 72, 0.4);
  color: #ff3366;
  font-size: 11.5px;
  font-weight: 700;
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.check-update-btn:hover:not(:disabled) {
  background: #e11d48;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.4);
  transform: translateY(-1px);
}

.check-update-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

/* 响应式适配 */
@media (max-width: 1280px) {
  .profile-dock {
    grid-template-columns: 68px 1fr auto;
    gap: 16px;
    padding-inline: 16px;
  }

  .main-content {
    padding-inline: 32px;
  }
}

@media (max-width: 960px) {
  .profile-dock {
    grid-template-columns: 64px 1fr auto;
    gap: 12px;
  }

  .main-content {
    padding-inline: 20px;
  }
}
</style>
