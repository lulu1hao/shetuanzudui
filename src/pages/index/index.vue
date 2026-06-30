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
              <span class="logo-title">鹿鹿的社团组队系统</span>
            </div>
            <div class="profile-tags" aria-label="创建者标签">
              <span>系统创建者</span>
              <span>MBTI · ENFP</span>
              <span>文学奖读者</span>
              <span>清华所在地学生</span>
            </div>
          </div>

          <div class="sidebar-slogan">
            快速创建专属房间与赛事，一键智能洗牌，支持多队拖拽与淘汰晋级
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
        <button class="lobby-tab active">活动 / 赛事大厅</button>
        <button class="lobby-tab">小桌宠</button>
        <button class="lobby-tab">交流区</button>
        <button class="lobby-tab">问题反馈(与我联系)</button>
        <span class="finals-mark">THE FINALS</span>
      </div>

      <!-- 空状态 -->
      <div v-if="rooms.length === 0" class="empty-state glass-panel">
        <span class="empty-emoji">👽</span>
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
            <div class="delete-icon">{{ room.type === 'tournament' ? '赛事' : '组队' }}</div>
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
              {{ room.type === 'tournament' ? '进入赛事 🏆' : '进入组队 ➡️' }}
            </button>
          </div>
        </div>
        <button class="create-room-tile" @click="showCreateModal" title="创建房间 / 赛事">
          <span>+</span>
        </button>
      </div>
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
                  <span class="modal-mode-icon">👥</span>
                  <span class="modal-mode-name">普通组队</span>
                </div>
                <div class="modal-mode-card type-tournament-card" :class="{ 'active': newRoomType === 'tournament' }" @click="selectNewRoomType('tournament')">
                  <span class="modal-mode-icon">🏆</span>
                  <span class="modal-mode-name">赛事房间</span>
                </div>
              </div>
            </div>

            <!-- 赛事专属 -->
            <template v-if="newRoomType === 'tournament'">
              <div class="form-item">
                <label class="form-label">💰 提现锦标赛 · 参赛队伍数量</label>
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
                    <span class="modal-mode-icon">{{ opt.icon }}</span>
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
                >🎲 随机地图</div>
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { gsap } from 'gsap'
import { roomStore, MODES, MAPS } from '../../store/roomStore.js'
import { useToast } from '../../composables/useToast.js'
import {
  beginLuluDisplayTransition,
  consumeLobbyReturnRoomId,
  expandGlobalLulu,
  placeGlobalLuluInLobby,
  settleLobbyReturnTransition,
  TOURNAMENT_DISPLAY_REVEAL_DURATION
} from '../../utils/globalLuluTransition.js'

const PROFILE_DOCK_SHIFT_DURATION = 1.12

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
    let gsapContext
    let heroTransition
    let tournamentLaunchTimeline
    let reduceMotion = false
    let isHeroAnimating = false
    let isNavigatingToTournament = false

    const modeOptions = [
      { key: 'cashout', icon: '💰', shortName: '提现' },
      { key: 'quickcash', icon: '💥', shortName: '金爆点' },
      { key: 'team', icon: '🛡️', shortName: '团队' }
    ]

    const totalMembers = computed(() => {
      return rooms.value.reduce((acc, room) => acc + (room.members ? room.members.length : 0), 0)
    })

    const selectNewRoomType = (v) => { newRoomType.value = v }
    const selectNewTeamCount = (v) => { newTeamCount.value = v }
    const selectNewRoomMode = (v) => { newRoomMode.value = v }
    const selectNewRoomMap = (v) => { newRoomMap.value = v }

    onMounted(() => {
      if (!pageRoot.value) return
      gsapContext = gsap.context(() => {
        reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }, pageRoot.value)

      window.addEventListener('keydown', handleHeroKeydown)
      const profileDock = pageRoot.value.querySelector('.profile-dock')
      const profileSection = pageRoot.value.querySelector('.profile-section')
      consumeLobbyReturnRoomId()
      const isReturningFromTournament = settleLobbyReturnTransition(heroPanel.value, {
        onComplete: () => {
          pageRoot.value?.classList.remove('lobby-returning')
        }
      })

      if (!isReturningFromTournament) {
        placeGlobalLuluInLobby(heroPanel.value)
      } else {
        pageRoot.value.classList.add('lobby-returning')
        const expandedHeight = pageRoot.value.clientHeight
        const alignmentY = profileDock && profileSection
          ? profileSection.getBoundingClientRect().top - profileDock.getBoundingClientRect().top
          : 0
        gsap.set(heroPanel.value, { height: expandedHeight, willChange: 'height' })
        gsap.set(profileDock, { y: alignmentY, willChange: 'transform' })
        heroTransition = gsap.timeline({ defaults: { overwrite: 'auto' } })
          .to(heroPanel.value, {
            height: 245,
            duration: reduceMotion ? 0 : 0.82,
            ease: 'power3.inOut',
            clearProps: 'height,will-change'
          }, 0)
          .to(profileDock, {
            y: 0,
            duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION,
            ease: 'power3.inOut',
            clearProps: 'transform,will-change'
          }, 0)
      }
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleHeroKeydown)
      heroTransition?.kill()
      tournamentLaunchTimeline?.kill()
      gsapContext?.revert()
    })

    const expandHero = async () => {
      if (isHeroExpanded.value || isHeroAnimating || !heroPanel.value) return
      const expandedHeight = pageRoot.value.clientHeight
      const expandedFontSize = Math.min(340, Math.max(180, window.innerWidth * 0.21))
      const expandedViewportHeight = Math.min(window.innerHeight * 0.42, 330)

      isHeroAnimating = true
      isHeroExpanded.value = true
      await nextTick()
      const profileDock = pageRoot.value.querySelector('.profile-dock')
      const profileSection = pageRoot.value.querySelector('.profile-section')
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
            { duration: reduceMotion ? 0 : 0.82 }
          )
        }, null, 0)
        .to(profileDock, {
          y: alignmentY,
          duration: reduceMotion ? 0 : PROFILE_DOCK_SHIFT_DURATION,
          ease: 'power3.inOut',
          willChange: 'transform'
        }, 0)
        .to(heroPanel.value, {
          height: expandedHeight,
          duration: reduceMotion ? 0 : 0.82,
          ease: 'power3.inOut'
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
        }, reduceMotion ? 0 : 0.82)
    }

    const collapseHero = () => {
      if (!isHeroExpanded.value || isHeroAnimating || !heroPanel.value) return
      isHeroAnimating = true
      const profileDock = pageRoot.value.querySelector('.profile-dock')
      placeGlobalLuluInLobby(heroPanel.value, {
        duration: reduceMotion ? 0 : 0.82,
        holdDisplayLayer: true
      })

      heroTransition?.kill()
      heroTransition = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          isHeroExpanded.value = false
          isHeroAnimating = false
        }
      })
        .to(heroPanel.value, {
          height: 245,
          duration: reduceMotion ? 0 : 0.82,
          ease: 'power3.inOut'
        }, 0)
        .to('.hero-collapse-button', {
          autoAlpha: 0,
          scale: 0.88,
          duration: reduceMotion ? 0 : 0.22,
          ease: 'power2.in'
        }, 0)
        .to(profileDock, {
          y: 0,
          duration: reduceMotion ? 0 : TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          clearProps: 'transform,will-change'
        }, 0)
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

    const floatLetter = (event) => {
      if (!isHeroExpanded.value || reduceMotion) return
      gsap.to(event.currentTarget, {
        y: -24,
        rotation: gsap.utils.random(-7, 7),
        scale: 1.08,
        autoAlpha: 1,
        duration: 0.34,
        ease: 'back.out(2)',
        overwrite: 'auto'
      })
    }

    const settleLetter = (event) => {
      gsap.to(event.currentTarget, {
        y: 0,
        rotation: 0,
        scale: 1,
        autoAlpha: 0.82,
        duration: reduceMotion ? 0 : 0.42,
        ease: 'power3.out',
        overwrite: 'auto'
      })
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

    const prepareDisplayLaunch = async () => {
      if (!isHeroExpanded.value) {
        isHeroExpanded.value = true
        await nextTick()
      }
      const profileDock = pageRoot.value?.querySelector('.profile-dock')
      const profileSection = pageRoot.value?.querySelector('.profile-section')
      const alignmentY = profileDock && profileSection
        ? profileSection.getBoundingClientRect().top - profileDock.getBoundingClientRect().top
        : 0
      return { profileDock, alignmentY }
    }

    const goToRoom = async (room) => {
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
      const shouldShiftProfileDock = !isHeroExpanded.value
      const expandedHeight = pageRoot.value.clientHeight
      const expandedFontSize = Math.min(340, Math.max(180, window.innerWidth * 0.21))
      const expandedViewportHeight = Math.min(window.innerHeight * 0.42, 330)
      const { profileDock, alignmentY } = await prepareDisplayLaunch()
      const displayLaunchAt = shouldShiftProfileDock ? PROFILE_DOCK_SHIFT_DURATION : 0

      tournamentLaunchTimeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
        .call(() => {
          expandGlobalLulu(
            heroPanel.value,
            expandedHeight,
            expandedViewportHeight,
            expandedFontSize,
            { duration: reduceMotion ? 0 : 0.82 }
          )
        }, null, 0)
        .to(profileDock ? [profileDock] : [], {
          y: alignmentY,
          duration: shouldShiftProfileDock ? PROFILE_DOCK_SHIFT_DURATION : 0,
          ease: 'power3.inOut',
          willChange: 'transform'
        }, 0)
        .to(heroPanel.value, {
          height: expandedHeight,
          duration: reduceMotion ? 0 : 0.82,
          ease: 'power3.inOut',
          willChange: 'height'
        }, 0)
        .call(() => {
          beginLuluDisplayTransition(room.id)
        }, null, displayLaunchAt)
        .call(() => {
          navigate()
        }, null, displayLaunchAt + TOURNAMENT_DISPLAY_REVEAL_DURATION + 0.04)
    }

    const getRoomModeLabel = (room) => {
      const mapStr = room.map === 'random' ? `🎲 随机地图 (${room.activeMap})` : (room.map || '未知地图')
      if (room.type === 'tournament') {
        return `🏆 赛事房间 | 💰 提现锦标赛 | 🗺️ ${mapStr} | ${room.teamCount}支队伍`
      }
      const activeModeKey = room.activeMode || room.mode || 'cashout'
      const activeConfig = MODES[activeModeKey] || MODES.cashout
      return `${activeConfig.name} | 🗺️ ${mapStr} | ${activeConfig.maxMembers}人上限`
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
      pageRoot, heroPanel, isHeroExpanded,
      newTeamCount, newRoomMode, newRoomMap, modeOptions, MAPS,
      selectNewRoomType, selectNewTeamCount, selectNewRoomMode, selectNewRoomMap,
      expandHero, collapseHero, handleHeroWheel, floatLetter, settleLetter,
      showCreateModal, closeCreateModal, handleCreateRoom, confirmDeleteRoom, goToRoom,
      getRoomModeLabel, getRoomPrimaryLabel, getRoomCapacityLabel, getRoomMapLabel,
      getRoomMaxCapacity, getCompletedMatchesCount, getTotalMatchesCount
    }
  }
}
</script>

<style scoped>
.container {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* 创作者头像卡片样式 */
.creator-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.creator-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(239, 68, 68, 0.3); /* 发光红色边框 */
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(239, 68, 68, 0.15);
}

.creator-avatar-container {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg, #ef4444, #ec4899); /* 渐变边框 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.creator-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: #111827;
  border: 1.5px solid #111827;
  z-index: 2;
}

.pulse-glow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #ec4899);
  filter: blur(4px);
  opacity: 0.6;
  z-index: 1;
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.95);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.6;
  }
}

.creator-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  z-index: 2;
}

.creator-role-badge {
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #ef4444, #b91c1c); /* 红/深红渐变背景 */
  padding: 1.5px 6px;
  border-radius: 4px;
  width: max-content;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2);
}

.creator-name {
  font-size: 13px;
  font-weight: 700;
  color: #e5e7eb;
  letter-spacing: 0.5px;
}

/* 侧边栏 */
.sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  border-radius: 0;
  border-left: none;
  border-top: none;
  border-bottom: none;
  border-right: 1px solid rgba(255,255,255,0.08);
  gap: 20px;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon { font-size: 28px; }

.logo-title {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.3;
}

.sidebar-stats {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255,255,255,0.06);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 24px;
  font-weight: 800;
  color: #a78bfa;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}

.sidebar-slogan {
  font-size: 12px;
  color: #4b5563;
  line-height: 1.7;
}

.create-btn-sidebar {
  margin-top: auto;
  padding: 12px 16px;
  background: linear-gradient(135deg, #a78bfa, #6366f1);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--radius-lg);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(99,102,241,0.3);
  transition: all 0.2s ease;
}

.create-btn-sidebar:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99,102,241,0.4);
}

/* 主内容 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 24px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-indicator {
  width: 4px;
  height: 20px;
  background: linear-gradient(to bottom, #a78bfa, #6366f1);
  border-radius: 2px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #f3f4f6;
}

.create-btn-top {
  padding: 8px 18px;
  font-size: 13px;
  color: #a78bfa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(167,139,250,0.1);
  border: 1px solid rgba(167,139,250,0.2);
  transition: all 0.2s;
}

.create-btn-top:hover {
  background: rgba(167,139,250,0.18);
  border-color: rgba(167,139,250,0.4);
}

.plus-icon { font-size: 16px; font-weight: bold; }

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.empty-emoji { font-size: 60px; }
.empty-title { font-size: 20px; font-weight: 700; color: #e5e7eb; }
.empty-desc { font-size: 13px; color: #9ca3af; }

.create-btn-lg {
  margin-top: 8px;
  padding: 12px 32px;
  background: linear-gradient(135deg, #a78bfa, #6366f1);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 24px;
  border: none;
  box-shadow: 0 4px 20px rgba(99,102,241,0.3);
}

.create-btn-lg:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(99,102,241,0.4); }

/* 房间网格 */
.room-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
  align-content: start;
}

.room-card {
  padding: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-card:hover {
  background: rgba(255,255,255,0.07);
  border-color: rgba(255,255,255,0.14);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

.tournament-card-border { border-color: rgba(52,211,153,0.25) !important; }

.room-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.room-name {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  flex: 1;
  line-height: 1.4;
}

.trophy-prefix { color: #fbbf24; }

.delete-icon {
  font-size: 18px;
  opacity: 0.4;
  transition: opacity 0.2s;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.delete-icon:hover { opacity: 1; background: rgba(239,68,68,0.1); }

.room-badge {
  display: inline-flex;
  background: rgba(167,139,250,0.1);
  border: 1px solid rgba(167,139,250,0.2);
  padding: 4px 10px;
  border-radius: 6px;
  align-self: flex-start;
}

.tournament-badge { background: rgba(52,211,153,0.08) !important; border-color: rgba(52,211,153,0.2) !important; }

.badge-text { font-size: 11px; color: #c084fc; font-weight: 600; }
.tournament-badge-text { color: #34d399 !important; }

.room-info { display: flex; flex-direction: column; gap: 5px; }

.info-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #9ca3af;
}

.info-value { color: #e5e7eb; font-weight: 600; }

.progress-bar-bg {
  height: 5px;
  background: rgba(255,255,255,0.07);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #a78bfa, #6366f1);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-tournament-fill { background: linear-gradient(90deg, #10b981, #34d399) !important; }

.room-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.05);
}

.created-time { font-size: 11px; color: #6b7280; }

.enter-btn {
  padding: 5px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #ffffff;
  font-size: 12px;
  border-radius: 6px;
  transition: all 0.2s;
}

.enter-btn:hover { background: rgba(255,255,255,0.1); }
.enter-btn-tournament { border-color: rgba(52,211,153,0.3) !important; color: #34d399 !important; background: rgba(52,211,153,0.05) !important; }

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(5px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  width: 520px;
  max-height: 85vh;
  background: rgba(17,24,39,0.97) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.modal-title { font-size: 16px; font-weight: 700; color: #ffffff; }

.modal-close {
  background: transparent;
  color: #9ca3af;
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 6px;
}

.modal-close:hover { background: rgba(255,255,255,0.07); color: #ffffff; }

.modal-scroll-body { flex: 1; overflow-y: auto; }

.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }

.form-item { display: flex; flex-direction: column; gap: 8px; }

.form-label { font-size: 12px; color: #a78bfa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

.form-input {
  width: 100%;
  height: 40px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 0 14px;
  font-size: 14px;
  color: #ffffff;
  transition: border-color 0.2s;
}

.form-input:focus { border-color: rgba(167,139,250,0.5); }

.modal-mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.modal-mode-grid-3 { grid-template-columns: repeat(3, 1fr) !important; }

.modal-mode-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.modal-mode-card:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.12);
}

.modal-mode-card.active {
  background: rgba(167,139,250,0.12) !important;
  border-color: rgba(167,139,250,0.5) !important;
  box-shadow: 0 2px 12px rgba(167,139,250,0.2);
}

.type-tournament-card.active {
  background: rgba(52,211,153,0.1) !important;
  border-color: rgba(52,211,153,0.5) !important;
}

.modal-mode-icon { font-size: 20px; }
.modal-mode-name { font-size: 12px; color: #ffffff; font-weight: 600; }

.modal-teams-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.modal-team-count-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  padding: 10px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-team-count-card.active {
  background: rgba(52,211,153,0.1) !important;
  border-color: rgba(52,211,153,0.5) !important;
}

.modal-team-count-num { font-size: 18px; font-weight: 700; color: #ffffff; }
.modal-team-count-label { font-size: 11px; color: #9ca3af; }

.modal-map-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modal-map-capsule {
  padding: 6px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  font-size: 12px;
  color: #ffffff;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-map-capsule:hover { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); }

.modal-map-capsule.active {
  background: rgba(52,211,153,0.12) !important;
  border-color: rgba(52,211,153,0.5) !important;
  color: #34d399;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 14px 24px 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.modal-btn-cancel {
  flex: 1;
  height: 40px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #e5e7eb;
  font-size: 14px;
  border-radius: 8px;
}

.modal-btn-cancel:hover { background: rgba(255,255,255,0.08); }

.modal-btn-confirm {
  flex: 2;
  height: 40px;
  background: linear-gradient(135deg, #a78bfa, #6366f1);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 12px rgba(99,102,241,0.3);
}

.modal-btn-confirm:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(99,102,241,0.4); }

/* THE FINALS inspired lobby skin */
.container {
  flex-direction: column;
  background: #232323;
  color: #f5f5f5;
}

.sidebar {
  width: 100%;
  height: 322px;
  min-height: 322px;
  padding: 0;
  border: 0;
  border-radius: 0;
  gap: 0;
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, #8e0b1f 0, #e11d48 245px, #242424 245px, #242424 100%);
  box-shadow: none;
}

.sidebar::before {
  content: "LULULULULULU";
  position: absolute;
  left: 64px;
  top: 8px;
  color: rgba(15, 18, 22, 0.78);
  font-size: 190px;
  line-height: 1;
  font-weight: 1000;
  letter-spacing: 6px;
  transform: scaleX(0.78);
  transform-origin: left center;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1;
}

.sidebar-logo {
  position: absolute;
  left: 206px;
  top: 139px;
  z-index: 5;
}

.logo-icon {
  display: none;
}

.logo-title {
  background: none;
  -webkit-text-fill-color: #ffffff;
  color: #ffffff;
  font-size: 40px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 2px;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.24);
}

.creator-card {
  position: absolute;
  left: 48px;
  top: 128px;
  z-index: 6;
  width: 138px;
  height: 138px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: #ffffff;
  overflow: visible;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
  backdrop-filter: none;
}

.creator-card:hover {
  transform: none;
  background: #ffffff;
  border-color: transparent;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
}

.creator-avatar-container {
  width: 100%;
  height: 100%;
  padding: 0;
  border-radius: 0;
  background: #ffffff;
}

.creator-avatar {
  border-radius: 0;
  border: 0;
  background: #ffffff;
  object-fit: cover;
}

.pulse-glow {
  display: none;
}

.creator-details {
  position: absolute;
  left: 158px;
  top: 75px;
  width: 740px;
  gap: 6px;
  z-index: 5;
}

.creator-role-badge {
  background: transparent;
  box-shadow: none;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  line-height: 1.5;
  padding: 0;
  width: auto;
  letter-spacing: 0;
}

.creator-role-badge::after {
  content: "  ○MBTI-ENFP  ○诺贝尔文学奖读者  ○全国人大代表被代表人  ○清华大学所在地国家学生  ○2008年感动中国被感动人  ○世界五百强管理层被管理人  ○大型上市公司风险投资人";
}

.creator-name {
  display: none;
}

.sidebar-stats {
  position: fixed;
  right: 58px;
  bottom: 28px;
  z-index: 12;
  width: 180px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  justify-content: flex-end;
  color: rgba(255, 255, 255, 0.5);
}

.stat-item {
  align-items: flex-end;
}

.stat-num {
  color: rgba(255, 255, 255, 0.55);
  font-size: 34px;
  font-weight: 500;
}

.stat-label {
  color: rgba(255, 255, 255, 0.38);
  font-size: 15px;
}

.sidebar-slogan {
  position: absolute;
  right: 92px;
  top: 124px;
  z-index: 5;
  width: 260px;
  text-align: right;
  color: rgba(0, 0, 0, 0.42);
  font-size: 13px;
  line-height: 1.7;
  font-weight: 700;
}

.create-btn-sidebar {
  display: none;
}

.main-content {
  flex: 1;
  padding: 34px 58px 28px;
  background: #242424;
  overflow: hidden;
}

.topbar {
  margin-bottom: 14px;
}

.section-title,
.title-left,
.create-btn-top {
  display: none;
}

.lobby-tabs {
  display: flex;
  align-items: center;
  gap: 46px;
  height: 54px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 24px;
}

.lobby-tab {
  height: 38px;
  min-height: 38px;
  padding: 0 0 0 12px;
  border-left: 4px solid rgba(255, 255, 255, 0.18);
  border-radius: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
  font-size: 22px;
  font-weight: 500;
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
  font-size: 24px;
  font-weight: 1000;
  letter-spacing: -1px;
  transform: scaleX(0.88);
  opacity: 0.95;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 28px 42px;
  padding: 0 0 18px;
  overflow-y: auto;
  align-content: start;
}

.room-card {
  min-height: 198px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(225, 29, 72, 0.12)),
    #262323;
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.22);
  overflow: hidden;
  gap: 0;
}

.room-card:hover {
  transform: translateY(-2px);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(225, 29, 72, 0.18)),
    #2a2525;
  border-color: transparent;
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.34);
}

.room-card:nth-child(4n + 1) .room-card-header {
  background: #e11d48;
  color: #ffffff;
}

.room-card:nth-child(4n + 1) .enter-btn {
  color: #ffffff;
}

.room-card-header {
  height: 42px;
  padding: 0 16px;
  align-items: center;
  background: #f3f3f3;
  color: #e11d48;
}

.room-name {
  color: inherit;
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trophy-prefix {
  display: none;
}

.delete-icon {
  color: inherit;
  opacity: 0.75;
}

.delete-icon:hover {
  background: rgba(0, 0, 0, 0.16);
  opacity: 1;
}

.room-badge {
  order: 2;
  margin: 26px 16px 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent !important;
}

.badge-text,
.tournament-badge-text {
  color: #ffffff !important;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.6;
}

.room-info {
  order: 3;
  padding: 24px 16px 0;
  gap: 8px;
}

.info-label-row {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.52);
}

.info-value {
  color: rgba(255, 255, 255, 0.82);
}

.progress-bar-bg {
  height: 4px;
  background: rgba(255, 255, 255, 0.13);
  border-radius: 0;
}

.progress-bar-fill,
.progress-tournament-fill {
  background: #e11d48 !important;
  border-radius: 0;
}

.room-footer {
  order: 4;
  margin-top: auto;
  padding: 8px 16px 14px;
  border-top: 0;
}

.created-time {
  color: rgba(255, 255, 255, 0.22);
  font-size: 10px;
}

.enter-btn,
.enter-btn-tournament {
  padding: 0;
  background: transparent !important;
  border: 0 !important;
  color: rgba(255, 255, 255, 0.82) !important;
  font-size: 12px;
  font-weight: 900;
}

.empty-state {
  border-radius: 0;
  border: 1px solid rgba(225, 29, 72, 0.45);
  background: rgba(20, 20, 20, 0.74);
}

.empty-emoji {
  color: #e11d48;
}

.create-btn-lg,
.modal-btn-confirm {
  border-radius: 0;
  background: #e11d48;
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(225, 29, 72, 0.28);
}

.modal-mask {
  background: rgba(8, 8, 10, 0.78);
}

.modal-content {
  border-radius: 0;
  border-color: rgba(225, 29, 72, 0.5) !important;
  background: rgba(34, 34, 34, 0.98) !important;
}

.modal-title,
.form-label {
  color: #ffffff;
}

.modal-mode-card,
.modal-team-count-card,
.modal-map-capsule,
.form-input {
  border-radius: 0;
}

.modal-mode-card.active,
.modal-team-count-card.active,
.modal-map-capsule.active {
  border-color: #e11d48 !important;
  background: rgba(225, 29, 72, 0.16) !important;
  color: #ffffff;
}

/* Reference-match homepage overrides */
.sidebar {
  height: 320px;
  min-height: 320px;
  background:
    linear-gradient(180deg, #830a1d 0, #d71442 197px, #242424 197px, #242424 100%);
}

.sidebar::before {
  left: 61px;
  top: 11px;
  color: rgba(28, 31, 31, 0.9);
  font-size: 222px;
  font-style: italic;
  letter-spacing: 0;
  transform: scaleX(0.72) skewX(-5deg);
}

.sidebar-logo {
  left: 206px;
  top: 139px;
}

.logo-title {
  font-size: 39px;
  font-weight: 900;
  letter-spacing: 1px;
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.24);
}

.creator-card {
  left: 49px;
  top: 128px;
  width: 137px;
  height: 137px;
  box-shadow: none;
}

.creator-card:hover {
  box-shadow: none;
}

.creator-details {
  left: 157px;
  top: 82px;
  width: 760px;
}

.creator-role-badge {
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.creator-role-badge::after {
  content: " ○MBTI-ENFP ○诺贝尔文学奖读者 ○全国人大代表被代表人 ○清华大学所在地国家学生 ○2008年感动中国被感动人 ○世界五百强管理层被管理人 ○大型上市公司风险投资人";
}

.sidebar-slogan {
  top: 124px;
  right: 88px;
  width: 280px;
  color: rgba(0, 0, 0, 0.38);
  font-size: 13px;
  font-weight: 700;
}

.main-content {
  padding: 14px 58px 28px;
  background: #242424;
}

.topbar {
  display: none;
}

.lobby-tabs {
  height: 60px;
  margin-bottom: 24px;
  gap: 48px;
}

.lobby-tab {
  height: 40px;
  font-size: 22px;
  line-height: 1;
}

.room-grid {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 28px 42px;
}

.room-card {
  min-height: 198px;
  height: 198px;
}

.room-card:nth-child(4n + 1) .room-card-header {
  background: #f3f3f3;
  color: #e11d48;
}

.room-card.tournament-card-border .room-card-header {
  background: #e11d48;
  color: #ffffff;
}

.room-card-header {
  height: 42px;
}

.delete-icon {
  min-width: 32px;
  padding: 0;
  font-size: 0;
  text-align: right;
  cursor: default;
}

.delete-icon::before {
  content: "组队";
  font-size: 12px;
  font-weight: 800;
}

.room-card.tournament-card-border .delete-icon::before {
  content: "赛事";
}

.room-badge {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  margin: 25px 16px 0;
  gap: 2px;
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
  font-size: 14px;
  font-weight: 700;
  line-height: 1.55;
}

.room-info {
  padding: 22px 16px 0;
}

.room-footer {
  gap: 16px;
  padding: 8px 16px 14px;
}

.updated-time {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.22);
  font-size: 10px;
  white-space: nowrap;
}

.enter-btn,
.enter-btn-tournament {
  display: none;
}

.create-room-tile {
  width: 160px;
  height: 106px;
  min-height: 106px;
  align-self: start;
  background: rgba(34, 34, 34, 0.7);
  border: 1px solid rgba(225, 29, 72, 0.75);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.22);
  font-size: 58px;
  font-weight: 300;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-room-tile:hover {
  color: rgba(255, 255, 255, 0.42);
  background: rgba(225, 29, 72, 0.08);
}

.container {
  position: relative;
}

.hero-wheel-hint {
  position: absolute;
  right: 22px;
  top: 18px;
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

.sidebar {
  perspective: 900px;
}

.sidebar::before {
  content: none;
}

.hero-lulu-viewport {
  position: absolute;
  left: 0;
  right: 0;
  top: 24.5px;
  height: 196px;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
}

.hero-lulu-word {
  display: flex;
  width: max-content;
  align-items: flex-start;
  color: rgba(28, 22, 25, 0.72);
  font-size: 222px;
  font-style: italic;
  font-weight: 1000;
  line-height: 0.88;
  letter-spacing: 0;
  white-space: nowrap;
  will-change: transform;
}

.lulu-group {
  display: flex;
  flex: none;
  padding-right: 0;
  transform: skewX(-5deg);
  transform-origin: left top;
}

.lulu-group:nth-child(2) {
  display: flex;
}

.lulu-letter {
  display: inline-block;
  opacity: 0.82;
  visibility: visible;
  transform-origin: 50% 55%;
  will-change: transform, opacity;
  pointer-events: none;
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
  background: rgba(20, 20, 20, 0.18);
  color: #ffffff;
  backdrop-filter: blur(10px);
  cursor: pointer;
}

.hero-collapse-button:hover {
  background: rgba(20, 20, 20, 0.34);
  border-color: rgba(255, 255, 255, 0.72);
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

.hero-expanded .hero-lulu-viewport {
  pointer-events: auto;
}

.hero-expanded .hero-lulu-word {
  text-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
}

.hero-expanded .lulu-letter {
  cursor: default;
  pointer-events: auto;
}

.sidebar {
  height: 245px;
  min-height: 245px;
  flex-shrink: 0;
  background: linear-gradient(145deg, #8e0b24 0%, #d71442 58%, #ef174e 100%);
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

.profile-section {
  position: relative;
  z-index: 12;
  flex: 0 0 74px;
  min-height: 74px;
  background: #242424;
  overflow: visible;
}

.profile-dock {
  position: absolute;
  left: 32px;
  right: 32px;
  top: -54px;
  height: 112px;
  display: grid;
  grid-template-columns: 78px minmax(420px, 1.2fr) minmax(300px, 0.9fr) 118px;
  align-items: center;
  gap: 24px;
  padding: 16px 22px;
  border: 0;
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  box-shadow: none;
  overflow: visible;
}

.profile-dock::after {
  content: none;
}

.profile-section .creator-card {
  position: relative;
  left: auto;
  top: auto;
  width: 78px;
  height: 78px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 11px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transition: none;
}

.profile-section .creator-card:hover {
  transform: none;
  background: #ffffff;
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.profile-section .creator-avatar-container {
  width: 100%;
  height: 100%;
  padding: 0;
  border-radius: 0;
  background: #ffffff;
}

.profile-section .creator-avatar {
  border: 0;
  border-radius: 0;
  background: #ffffff;
}

.profile-identity {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
}

.profile-section .sidebar-logo {
  position: static;
  min-height: auto;
}

.profile-section .logo-title {
  display: block;
  color: #ffffff;
  font-size: clamp(24px, 2.25vw, 35px);
  line-height: 1.12;
  font-weight: 1000;
  letter-spacing: -0.03em;
  white-space: nowrap;
  text-shadow: 0 3px 0 rgba(54, 5, 18, 0.42);
}

.profile-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.profile-tags span {
  flex: none;
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.035);
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
  line-height: 1;
  font-weight: 750;
  white-space: nowrap;
}

.profile-section .sidebar-stats {
  position: relative;
  inset: auto;
  width: auto;
  min-width: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 22px;
  border-left: 2px solid #f0224f;
  z-index: 1;
}

.profile-section .stat-item {
  gap: 3px;
}

.profile-section .stat-num {
  color: #ffffff;
  font-size: 38px;
  line-height: 1;
  font-weight: 300;
}

.profile-section .stat-label {
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.profile-section .sidebar-slogan {
  position: relative;
  inset: auto;
  width: auto;
  min-width: 0;
  padding: 0 0 0 22px;
  border: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  line-height: 1.7;
  font-weight: 700;
  letter-spacing: 0;
  text-shadow: none;
  backdrop-filter: none;
  transform: translateY(6px);
}

.content-stack .main-content {
  flex: 1;
  min-height: 0;
  padding-top: 0;
  will-change: auto;
}

.content-stack .lobby-tabs {
  height: 54px;
  margin-bottom: 18px;
}

.hero-expanded .content-stack {
  pointer-events: none;
}

.tournament-launching {
  cursor: progress;
}

.tournament-launching .room-card,
.tournament-launching .create-room-tile,
.tournament-launching .lobby-tab {
  pointer-events: none;
}

.tournament-launching .hero-collapse-button {
  display: none;
}

.tournament-launching .hero-lulu-word {
  text-shadow: 18px 0 34px rgba(20, 0, 7, 0.28);
}

@media (max-width: 1180px) {
  .profile-dock {
    grid-template-columns: 72px minmax(360px, 1fr) minmax(240px, 0.72fr) 104px;
    gap: 18px;
    padding-inline: 18px;
  }

  .profile-section .creator-card {
    width: 72px;
    height: 72px;
  }

  .profile-tags span {
    padding-inline: 8px;
    font-size: 10px;
  }

  .profile-section .sidebar-slogan {
    padding-left: 16px;
    font-size: 11px;
  }

  .profile-section .sidebar-stats {
    padding-left: 16px;
  }
}

@media (max-width: 720px) {
  .hero-wheel-hint span {
    display: none;
  }

  .hero-collapse-button {
    left: 16px;
    top: 16px;
  }
}
</style>
