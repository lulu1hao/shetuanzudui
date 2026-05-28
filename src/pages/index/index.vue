<template>
  <div class="container">
    <!-- 侧边栏 -->
    <div class="sidebar glass-panel">
      <div class="sidebar-logo">
        <span class="logo-icon">🔮</span>
        <span class="logo-title text-gradient-primary">社团组队系统</span>
      </div>
      
      <!-- 创作者头像与信息区域 -->
      <div class="creator-card">
        <div class="creator-avatar-container">
          <img src="./creator_avatar.jpg" alt="创建者头像" class="creator-avatar" />
          <div class="pulse-glow"></div>
        </div>
        <div class="creator-details">
          <div class="creator-role-badge">👑 系统创建者</div>
          <div class="creator-name">lulululululu</div>
        </div>
      </div>

      <div class="sidebar-stats">
        <div class="stat-item">
          <span class="stat-num">{{ rooms.length }}</span>
          <span class="stat-label">历史房间</span>
        </div>
        <!-- <div class="stat-item">
          <span class="stat-num">{{ totalMembers }}</span>
          <span class="stat-label">活跃成员</span>
        </div> -->
      </div>
      <div class="sidebar-slogan">快速创建专属房间与赛事，一键智能洗牌，支持多队拖拽与淘汰晋级</div>
      <button class="create-btn-sidebar" @click="showCreateModal">
        <span class="plus-icon">＋</span> 创建房间 / 赛事
      </button>
    </div>

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
          :class="{ 'tournament-card-border': room.type === 'tournament' }"
          @click="goToRoom(room)"
        >
          <div class="room-card-header">
            <span class="room-name">
              <span class="trophy-prefix" v-if="room.type === 'tournament'">🏆 </span>
              {{ room.name }}
            </span>
            <div class="delete-icon" @click.stop="confirmDeleteRoom(room)" title="删除房间">🗑️</div>
          </div>

          <div class="room-badge" :class="{ 'tournament-badge': room.type === 'tournament' }">
            <span class="badge-text" :class="{ 'tournament-badge-text': room.type === 'tournament' }">
              {{ getRoomModeLabel(room) }}
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
            <span class="created-time">{{ room.createdAt }}</span>
            <button class="enter-btn" :class="{ 'enter-btn-tournament': room.type === 'tournament' }">
              {{ room.type === 'tournament' ? '进入赛事 🏆' : '进入组队 ➡️' }}
            </button>
          </div>
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { roomStore, MODES, MAPS } from '../../store/roomStore.js'
import { useToast } from '../../composables/useToast.js'

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
      if (room.type === 'tournament') {
        router.push({ path: '/tournament', query: { id: room.id } })
      } else {
        router.push({ path: '/room', query: { id: room.id } })
      }
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

    const getRoomMaxCapacity = (room) => {
      const activeModeKey = room.activeMode || room.mode || 'cashout'
      return (MODES[activeModeKey] || MODES.cashout).maxMembers
    }
    const getCompletedMatchesCount = (room) => room.matches ? room.matches.filter(m => m.status === 'completed').length : 0
    const getTotalMatchesCount = (room) => room.matches ? room.matches.length : 0

    return {
      rooms, totalMembers, isCreateModalVisible, newRoomName, newRoomType,
      newTeamCount, newRoomMode, newRoomMap, modeOptions, MAPS,
      selectNewRoomType, selectNewTeamCount, selectNewRoomMode, selectNewRoomMap,
      showCreateModal, closeCreateModal, handleCreateRoom, confirmDeleteRoom, goToRoom,
      getRoomModeLabel, getRoomMaxCapacity, getCompletedMatchesCount, getTotalMatchesCount
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
  border-radius: 12px;
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
  border-radius: 10px;
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
  border-radius: 10px;
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
  border-radius: 16px;
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
  grid-template-columns: repeat(5, 1fr);
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
</style>
