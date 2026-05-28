<template>
  <div class="container" :class="{ 'dragging-active': isDragging }">

    <!-- 顶部导航栏 -->
    <div class="room-header glass-panel">
      <div class="header-left">
        <button class="back-btn" @click="goBack">← 返回大厅</button>
        <div class="header-title-block">
          <span class="room-title-text">{{ room.name || '房间详情' }}</span>
          <div class="badge-mode">{{ activeModeConfig.name }}</div>
        </div>
      </div>
      <span class="member-count-text">成员：{{ room.members ? room.members.length : 0 }} / {{ activeModeConfig.maxMembers }}人</span>
    </div>

    <!-- 主体区域 - 左右分栏 -->
    <div class="main-layout">

      <!-- 左侧：设置 + 控制 -->
      <div class="left-panel">
        <!-- 游戏模式选择 -->
        <div class="panel-section glass-panel">
          <div class="section-title-row">
            <span class="section-title">🎮 游戏模式</span>
            <span class="section-badge">{{ selectedModeBadge }}</span>
          </div>
          <div class="mode-cards-grid">
            <div
              v-for="opt in modeOptions"
              :key="opt.key"
              class="mode-card"
              :class="{ 'active': room.mode === opt.key }"
              @click="changeMode(opt.key)"
            >
              <span class="mode-icon">{{ opt.icon }}</span>
              <span class="mode-name">{{ opt.shortName }}</span>
              <span class="mode-limit">{{ opt.limit }}</span>
            </div>
          </div>
        </div>

        <!-- 地图选择 -->
        <div class="panel-section glass-panel">
          <div class="section-title-row">
            <span class="section-title">🗺️ 比赛地图</span>
            <span class="section-badge map-badge">{{ selectedMapBadge }}</span>
          </div>
          <div class="map-cards-grid">
            <div
              v-for="mapName in MAPS"
              :key="mapName"
              class="map-capsule"
              :class="{ 'active': room.map === mapName }"
              @click="changeMap(mapName)"
            >{{ mapName }}</div>
            <div
              class="map-capsule random-map-capsule"
              :class="{ 'active': room.map === 'random' }"
              @click="changeMap('random')"
            >🎲 随机地图</div>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="control-panel glass-panel">
          <button class="ctrl-btn btn-random" @click="handleRandomAssign">⚡ 随机分配</button>
          <button class="ctrl-btn btn-reset" @click="handleResetTeams">🔄 重置</button>
          <button class="ctrl-btn btn-add" @click="showAddMemberModal">➕ 添加成员</button>
        </div>
      </div>

      <!-- 右侧：队伍看板 + 成员池 -->
      <div class="right-panel">
        <!-- 队伍网格 -->
        <div class="teams-grid">
          <div
            v-for="team in teams"
            :key="team.id"
            :id="'team-zone-' + team.id"
            class="team-card glass-panel"
            :class="{ 'drag-over': hoverTeamId === team.id }"
            @dragover.prevent="onDragOver($event, team.id)"
            @dragenter="onDragEnter($event, team.id)"
            @dragleave="onDragLeave($event, team.id)"
            @drop="onDrop($event, team.id)"
            @click="handleTeamClick(team.id)"
          >
            <div class="team-card-header" :style="{ background: team.gradient }">
              <span class="team-card-title">{{ team.name }}</span>
              <span class="team-card-badge">{{ getTeamMembers(team.id).length }} / {{ activeModeConfig.teamCapacity }}人</span>
            </div>
            <div class="team-members-list">
              <div v-if="getTeamMembers(team.id).length === 0" class="team-empty">
                <span class="empty-text">拖入成员或点击分配</span>
              </div>
              <div
                v-for="member in getTeamMembers(team.id)"
                :key="member.id"
                class="member-pill team-member"
                :class="{ 'selected-pill': selectedMember?.id === member.id }"
                :style="{ borderLeftColor: team.color }"
                draggable="true"
                @dragstart="onDragStart($event, member)"
                @dragend="onDragEnd"
                @click.stop="handleMemberClick(member)"
              >
                <div class="member-pill-left">
                  <span class="member-pill-name">{{ member.name }}</span>
                  <span class="member-pill-id">ID: {{ member.id }}</span>
                </div>
                <span class="drag-indicator">⋮⋮</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部：待分配 + 观战席 -->
        <div class="bottom-grid">
          <!-- 待分配池 -->
          <div
            id="pool-zone"
            class="pool-section glass-panel"
            :class="{ 'drag-over': hoverTeamId === null && isDragging }"
            @dragover.prevent="onDragOver($event, null)"
            @dragenter="onDragEnter($event, null)"
            @dragleave="onDragLeave($event, null)"
            @drop="onDrop($event, null)"
            @click="handleTeamClick(null)"
          >
            <div class="pool-header">
              <div class="pool-title-left">
                <div class="pool-indicator"></div>
                <span class="pool-title">待分配 ({{ unassignedMembers.length }})</span>
              </div>
              <span class="pool-tip">💡 拖拽分配</span>
            </div>
            <div class="pool-members-scroll">
              <div v-if="unassignedMembers.length === 0" class="pool-empty">
                <span class="pool-empty-text">暂无待分配人员</span>
              </div>
              <div class="pool-members-list" v-else>
                <div
                  v-for="member in unassignedMembers"
                  :key="member.id"
                  class="member-pill pool-member"
                  :class="{ 'selected-pill': selectedMember?.id === member.id }"
                  draggable="true"
                  @dragstart="onDragStart($event, member)"
                  @dragend="onDragEnd"
                  @click.stop="handleMemberClick(member)"
                >
                  <div class="member-pill-left">
                    <span class="member-pill-name">{{ member.name }}</span>
                    <span class="member-pill-id">ID: {{ member.id }}</span>
                  </div>
                  <span class="drag-indicator">⋮⋮</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 观战席 -->
          <div
            id="team-zone-spectator"
            class="pool-section glass-panel"
            :class="{ 'drag-over': hoverTeamId === 'spectator' }"
            @dragover.prevent="onDragOver($event, 'spectator')"
            @dragenter="onDragEnter($event, 'spectator')"
            @dragleave="onDragLeave($event, 'spectator')"
            @drop="onDrop($event, 'spectator')"
            @click="handleTeamClick('spectator')"
          >
            <div class="pool-header">
              <div class="pool-title-left">
                <div class="pool-indicator spec-indicator"></div>
                <span class="pool-title">👁️ 观战席 ({{ getTeamMembers('spectator').length }})</span>
              </div>
              <span class="pool-tip">👁️ 旁观席位</span>
            </div>
            <div class="pool-members-scroll">
              <div v-if="getTeamMembers('spectator').length === 0" class="pool-empty">
                <span class="pool-empty-text">无观战人员</span>
              </div>
              <div class="pool-members-list" v-else>
                <div
                  v-for="member in getTeamMembers('spectator')"
                  :key="member.id"
                  class="member-pill pool-member spectator-member"
                  :class="{ 'selected-pill': selectedMember?.id === member.id }"
                  draggable="true"
                  @dragstart="onDragStart($event, member)"
                  @dragend="onDragEnd"
                  @click.stop="handleMemberClick(member)"
                >
                  <div class="member-pill-left">
                    <span class="member-pill-name">{{ member.name }}</span>
                    <span class="member-pill-id">ID: {{ member.id }}</span>
                  </div>
                  <span class="drag-indicator">⋮⋮</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷分配菜单 -->
    <div v-if="isActionMenuVisible" class="modal-mask" @click.self="closeActionMenu">
      <div class="action-sheet glass-panel">
        <div class="sheet-header">
          <div class="sheet-title-row">
            <span class="sheet-member-name">{{ activeMember?.name }}</span>
            <span class="sheet-member-id">ID: {{ activeMember?.id }}</span>
          </div>
          <span class="sheet-current-status">当前位置：{{ getMemberStatusText(activeMember) }}</span>
        </div>
        <div class="sheet-body">
          <span class="sheet-section-title">分配至队伍</span>
          <div class="team-option-grid">
            <button
              v-for="team in teams"
              :key="team.id"
              class="team-opt-btn"
              :style="{ background: team.gradient, opacity: isTeamFull(team.id) && activeMember?.teamId !== team.id ? '0.45' : '1' }"
              @click="assignToTeam(team.id)"
            >{{ team.name }} ({{ getTeamMembers(team.id).length }}/{{ activeModeConfig.teamCapacity }})</button>
          </div>
          <button v-if="activeMember?.teamId !== 'spectator'" class="sheet-action-btn btn-to-spectator" @click="assignToTeam('spectator')">👁️ 移入观战席位</button>
          <button v-if="activeMember?.teamId !== null" class="sheet-action-btn btn-to-pool" @click="assignToTeam(null)">↩️ 移回未分配成员池</button>
          <button class="sheet-action-btn btn-delete-member" @click="confirmDeleteMember">🗑️ 移除该成员</button>
        </div>
        <div class="sheet-footer">
          <button class="sheet-cancel-btn" @click="closeActionMenu">取消</button>
        </div>
      </div>
    </div>

    <!-- 添加成员弹窗 -->
    <div v-if="isAddModalVisible" class="modal-mask" @click.self="closeAddMemberModal">
      <div class="modal-content glass-panel">
        <div class="modal-header">
          <span class="modal-title">添加房间成员</span>
          <button class="modal-close" @click="closeAddMemberModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label class="form-label">成员姓名 *</label>
            <input type="text" class="form-input" placeholder="请输入成员姓名" v-model="newMemberName" autofocus @keydown.enter="handleAddMember" />
          </div>
          <div class="form-item">
            <label class="form-label">成员自定义 ID（可选）</label>
            <input type="text" class="form-input" placeholder="留空则自动生成唯一ID" v-model="newMemberId" @keydown.enter="handleAddMember" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-cancel" @click="closeAddMemberModal">取消</button>
          <button class="modal-btn-confirm" @click="handleAddMember">添加成员</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { roomStore, MODES, MAPS } from '../../store/roomStore.js'
import { useToast } from '../../composables/useToast.js'

export default {
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { showToast, showModal } = useToast()

    const roomId = ref('')
    const room = ref({ members: [] })

    const modeOptions = [
      { key: 'cashout', icon: '💰', shortName: '提现', limit: '12人/4队' },
      { key: 'quickcash', icon: '💥', shortName: '金爆点', limit: '16人/2队' },
      { key: 'team', icon: '🛡️', shortName: '团队', limit: '10人/2队' }
    ]

    const isAddModalVisible = ref(false)
    const newMemberName = ref('')
    const newMemberId = ref('')
    const isActionMenuVisible = ref(false)
    const activeMember = ref(null)

    // HTML5 拖拽状态
    const isDragging = ref(false)
    const draggedMember = ref(null)
    const draggedMemberId = ref(null)
    const selectedMember = ref(null)
    const hoverTeamId = ref(undefined) // undefined = 无悬停，null = 待分配池
    const dragEnterCount = ref({}) // 用计数器解决子元素 dragleave 闪烁问题

    const loadRoomData = () => {
      const data = roomStore.getRoom(roomId.value)
      if (data) room.value = data
    }

    onMounted(() => {
      const id = route.query.id
      if (id) {
        roomId.value = id
        loadRoomData()
      } else {
        showToast('房间不存在')
        setTimeout(() => goBack(), 1000)
      }
    })

    // ==========================================
    // 计算属性
    // ==========================================
    const activeModeKey = computed(() => room.value?.activeMode || room.value?.mode || 'cashout')
    const activeModeConfig = computed(() => MODES[activeModeKey.value] || MODES.cashout)
    const teams = computed(() => activeModeConfig.value.teams)

    const selectedModeBadge = computed(() => {
      const actKey = activeModeKey.value
      const actName = MODES[actKey]?.name || ''
      return `已选: ${actName}`
    })

    const selectedMapBadge = computed(() => {
      const mapKey = room.value?.map; const actMap = room.value?.activeMap
      if (mapKey === 'random') return `🎲 随机 (已抽中: ${actMap})`
      return `已选: ${mapKey}`
    })

    const unassignedMembers = computed(() =>
      room.value.members ? room.value.members.filter(m => m.teamId === null) : []
    )

    const getTeamMembers = (teamId) =>
      room.value.members ? room.value.members.filter(m => m.teamId === teamId) : []

    const isTeamFull = (teamId) => {
      if (teamId === 'spectator') return false
      return getTeamMembers(teamId).length >= activeModeConfig.value.teamCapacity
    }

    const goBack = () => router.go(-1)

    // ==========================================
    // 房间设置修改
    // ==========================================
    const changeMode = (modeKey) => {
      const res = roomStore.updateRoomSettings(roomId.value, modeKey, room.value.map, false)
      if (res.success) {
        room.value.mode = modeKey; room.value.activeMode = res.activeMode
        showToast(`已切换为 ${MODES[modeKey]?.name || modeKey}`)
      }
    }

    const changeMap = (mapVal) => {
      const forceReroll = (mapVal === 'random' && room.value.map === 'random')
      const res = roomStore.updateRoomSettings(roomId.value, room.value.mode, mapVal, forceReroll)
      if (res.success) {
        room.value.map = mapVal; room.value.activeMap = res.activeMap
        let msg = `地图已切换为 ${mapVal}`
        if (mapVal === 'random') msg = `🎲 已抽中 ${res.activeMap}`
        showToast(msg)
      }
    }

    // ==========================================
    // 成员管理
    // ==========================================
    const showAddMemberModal = () => { newMemberName.value = ''; newMemberId.value = ''; isAddModalVisible.value = true }
    const closeAddMemberModal = () => { isAddModalVisible.value = false }

    const handleAddMember = () => {
      const res = roomStore.addMemberToRoom(roomId.value, newMemberName.value, newMemberId.value)
      if (res.success) {
        showToast('添加成功', 'success')
        closeAddMemberModal()
        loadRoomData()
      } else {
        showToast(res.msg || '添加失败')
      }
    }

    const confirmDeleteMember = async () => {
      if (!activeMember.value) return
      const confirmed = await showModal('提示', `确定要将成员"${activeMember.value.name}"从该房间移除吗？`, '#ef4444')
      if (confirmed) {
        roomStore.removeMemberFromRoom(roomId.value, activeMember.value.id)
        showToast('移除成功')
        closeActionMenu()
        loadRoomData()
      }
    }

    const handleRandomAssign = () => {
      const res = roomStore.randomAssignTeams(roomId.value)
      if (res.success) { showToast('随机分配完成', 'success'); loadRoomData() }
      else showToast(res.msg || '分配失败')
    }

    const handleResetTeams = () => {
      roomStore.resetTeams(roomId.value)
      showToast('已重置全员位置', 'success')
      loadRoomData()
    }

    const showActionMenu = (member) => { activeMember.value = member; isActionMenuVisible.value = true }
    const closeActionMenu = () => { isActionMenuVisible.value = false; activeMember.value = null }

    const assignToTeam = (teamId) => {
      if (!activeMember.value) return
      const res = roomStore.moveMemberToTeam(roomId.value, activeMember.value.id, teamId)
      if (res.success) { closeActionMenu(); loadRoomData() }
      else showToast(res.msg || '移动失败')
    }

    const getMemberStatusText = (member) => {
      if (!member) return ''
      if (member.teamId === null) return '待分配成员池'
      if (member.teamId === 'spectator') return '👁️ 观战席位'
      return teams.value.find(t => t.id === member.teamId)?.name || `第 ${member.teamId} 队`
    }

    // ==========================================
    // HTML5 Drag & Drop 拖拽系统
    // ==========================================
    const onDragStart = (event, member) => {
      draggedMember.value = member
      draggedMemberId.value = member.id
      isDragging.value = true
      hoverTeamId.value = undefined
      dragEnterCount.value = {}
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', member.id)
      if (event.currentTarget) {
        event.currentTarget.style.opacity = '0.5'
      }
    }

    const onDragEnd = (event) => {
      isDragging.value = false
      hoverTeamId.value = undefined
      dragEnterCount.value = {}
      draggedMember.value = null
      draggedMemberId.value = null
      if (event.currentTarget) {
        event.currentTarget.style.opacity = ''
      }
    }

    const onDragOver = (event, teamId) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      hoverTeamId.value = teamId
    }

    const onDragEnter = (event, teamId) => {
      event.preventDefault()
      const key = String(teamId)
      if (!dragEnterCount.value[key]) dragEnterCount.value[key] = 0
      dragEnterCount.value[key]++
      hoverTeamId.value = teamId
    }

    const onDragLeave = (event, teamId) => {
      const key = String(teamId)
      if (dragEnterCount.value[key]) dragEnterCount.value[key]--
      if (!dragEnterCount.value[key] || dragEnterCount.value[key] <= 0) {
        dragEnterCount.value[key] = 0
        if (hoverTeamId.value === teamId) {
          hoverTeamId.value = undefined
        }
      }
    }

    const onDrop = (event, targetTeamId) => {
      event.preventDefault()
      hoverTeamId.value = undefined
      dragEnterCount.value = {}

      const memberId = event.dataTransfer.getData('text/plain') || draggedMemberId.value
      if (!memberId) return

      const member = room.value.members.find(m => m.id === memberId)
      if (!member) return
      if (member.teamId === targetTeamId) return

      const res = roomStore.moveMemberToTeam(roomId.value, member.id, targetTeamId)
      if (res.success) {
        let destName = targetTeamId === null ? '待分配池' : (targetTeamId === 'spectator' ? '观战席' : `${teams.value.find(t => t.id === targetTeamId)?.name || '队伍'}`)
        showToast(`已移入${destName}`)
        loadRoomData()
      } else {
        showToast(res.msg || '无法拖入该位置')
      }

      isDragging.value = false
      draggedMember.value = null
      draggedMemberId.value = null
    }

    const handleMemberClick = (member) => {
      if (!selectedMember.value) {
        selectedMember.value = member
        showToast(`已选择：${member.name}，点击目标队伍进行组队，或点击其他成员互换位置`, 'success')
      } else if (selectedMember.value.id === member.id) {
        selectedMember.value = null
        showActionMenu(member)
      } else {
        const memberA = selectedMember.value
        const memberB = member
        if (memberA.teamId === memberB.teamId) {
          selectedMember.value = member
          showToast(`已将当前选择更改为：${member.name}`, 'success')
        } else {
          const res = roomStore.swapMembersTeams(roomId.value, memberA.id, memberB.id)
          if (res.success) {
            showToast(`🔄 已对调 ${memberA.name} 与 ${memberB.name} 的分组！`, 'success')
            loadRoomData()
          } else {
            showToast(res.msg || '位置对调失败')
          }
          selectedMember.value = null
        }
      }
    }

    const handleTeamClick = (targetTeamId) => {
      if (!selectedMember.value) return
      const member = selectedMember.value
      if (member.teamId === targetTeamId) {
        selectedMember.value = null
        return
      }
      const res = roomStore.moveMemberToTeam(roomId.value, member.id, targetTeamId)
      if (res.success) {
        let destName = targetTeamId === null ? '待分配池' : (targetTeamId === 'spectator' ? '观战席' : `${teams.value.find(t => t.id === targetTeamId)?.name || '队伍'}`)
        showToast(`已成功分配至 ${destName}`)
        loadRoomData()
      } else {
        showToast(res.msg || '分配失败')
      }
      selectedMember.value = null
    }

    return {
      roomId, room, modeOptions, selectedModeBadge, selectedMapBadge, teams, MAPS,
      activeModeConfig, unassignedMembers, isAddModalVisible, newMemberName, newMemberId,
      isActionMenuVisible, activeMember, isDragging, hoverTeamId, draggedMemberId, selectedMember,
      loadRoomData, getTeamMembers, isTeamFull, goBack,
      changeMode, changeMap, showAddMemberModal, closeAddMemberModal, handleAddMember,
      confirmDeleteMember, handleRandomAssign, handleResetTeams,
      showActionMenu, closeActionMenu, assignToTeam, getMemberStatusText,
      onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop,
      handleMemberClick, handleTeamClick
    }
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 16px;
  gap: 12px;
}

.dragging-active { overflow: hidden; }
.dragging-active .team-card * {
  pointer-events: none;
}
.dragging-active .pool-section * {
  pointer-events: none;
}

/* 顶部导航栏 */
.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  flex-shrink: 0;
}

.header-left { display: flex; align-items: center; gap: 14px; }

.back-btn {
  padding: 6px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: #a78bfa;
  font-size: 13px;
  border-radius: 7px;
  white-space: nowrap;
}
.back-btn:hover { background: rgba(167,139,250,0.12); }

.header-title-block { display: flex; align-items: center; gap: 10px; }

.room-title-text {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.badge-mode {
  font-size: 11px;
  font-weight: 600;
  color: #c084fc;
  background: rgba(167,139,250,0.12);
  border: 1px solid rgba(167,139,250,0.25);
  padding: 3px 10px;
  border-radius: 5px;
}

.member-count-text { font-size: 13px; color: #9ca3af; }

/* 主体布局 */
.main-layout {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
  min-height: 0;
}

/* 左侧面板 */
.left-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.panel-section {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title { font-size: 13px; color: #a78bfa; font-weight: 700; }

.section-badge {
  font-size: 11px;
  background: rgba(167,139,250,0.1);
  border: 1px solid rgba(167,139,250,0.2);
  color: #c084fc;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.section-badge.map-badge {
  background: rgba(52,211,153,0.1);
  border-color: rgba(52,211,153,0.2);
  color: #34d399;
}

.mode-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.mode-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.mode-card:hover { border-color: rgba(167,139,250,0.3); background: rgba(167,139,250,0.05); }
.mode-card.active {
  background: rgba(167,139,250,0.12) !important;
  border-color: rgba(167,139,250,0.5) !important;
  box-shadow: 0 2px 10px rgba(167,139,250,0.15);
}
.mode-icon { font-size: 18px; }
.mode-name { font-size: 12px; color: #fff; font-weight: 600; }
.mode-limit { font-size: 10px; color: #9ca3af; }

.map-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}

.map-capsule {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 6px;
  padding: 6px 4px;
  font-size: 11px;
  color: #fff;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.map-capsule:hover { border-color: rgba(52,211,153,0.3); background: rgba(52,211,153,0.05); }
.map-capsule.active { background: rgba(52,211,153,0.12) !important; border-color: rgba(52,211,153,0.5) !important; color: #34d399; }
.random-map-capsule { grid-column: span 3; border-style: dashed; }
.random-map-capsule.active { border-style: solid; background: rgba(167,139,250,0.12) !important; border-color: rgba(167,139,250,0.5) !important; color: #a78bfa; }

.control-panel { display: flex; flex-direction: column; gap: 7px; padding: 12px; }

.ctrl-btn {
  width: 100%;
  height: 36px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
}
.btn-random { background: linear-gradient(135deg, #a78bfa, #6366f1); color: #fff; }
.btn-random:hover { box-shadow: 0 2px 12px rgba(99,102,241,0.3); }
.btn-reset { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #e5e7eb; }
.btn-reset:hover { background: rgba(255,255,255,0.09); }
.btn-add { background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: #34d399; }
.btn-add:hover { background: rgba(52,211,153,0.14); }

/* 右侧面板 */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  min-height: 0;
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); /* Auto-fit expands columns to fill available space, eliminating ugly empty black gaps */
  gap: 10px;
  flex: 1;
  overflow-y: auto;
}

.team-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 160px;
}
.team-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.team-card.drag-over {
  background: rgba(167,139,250,0.12) !important;
  border-color: #a78bfa !important;
  box-shadow: 0 0 16px rgba(167,139,250,0.3);
}

.team-card-header {
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.team-card-title { font-size: 13px; font-weight: 700; color: #fff; }
.team-card-badge { font-size: 11px; color: rgba(255,255,255,0.8); background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; }

.team-members-list { flex: 1; padding: 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; }

.team-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.01);
  border-radius: 8px;
  min-height: 120px;
  margin: 4px;
  transition: all 0.2s;
}
.team-card:hover .team-empty {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.02);
}
.empty-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
  font-weight: 500;
  letter-spacing: 0.5px;
}

.bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex-shrink: 0; height: 180px; }

.pool-section {
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
  transition: all 0.2s;
}
.pool-section.drag-over {
  background: rgba(52,211,153,0.07) !important;
  border-color: rgba(52,211,153,0.4) !important;
}

.pool-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-shrink: 0; }
.pool-title-left { display: flex; align-items: center; gap: 6px; }
.pool-indicator { width: 3px; height: 14px; background: #34d399; border-radius: 2px; }
.spec-indicator { background: #9ca3af !important; }
.pool-title { font-size: 13px; font-weight: 700; color: #ffffff; }
.pool-tip { font-size: 11px; color: #9ca3af; }

.pool-members-scroll { flex: 1; overflow-y: auto; }
.pool-empty { display: flex; align-items: center; justify-content: center; padding: 20px 0; }
.pool-empty-text { font-size: 12px; color: rgba(255,255,255,0.2); }

.pool-members-list { display: flex; flex-direction: column; gap: 5px; }

/* 成员胶囊 */
.member-pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 7px;
  padding: 6px 10px;
  cursor: grab;
  transition: background 0.15s;
  user-select: none;
}
.member-pill:hover { background: rgba(255,255,255,0.07); }
.member-pill:active { cursor: grabbing; }
.member-pill.team-member { border-left-width: 3px; }
.member-pill.spectator-member { border-left: 3px solid #9ca3af; }
.selected-pill {
  border-color: #a78bfa !important;
  box-shadow: 0 0 12px rgba(167, 139, 250, 0.4);
  background: rgba(167, 139, 250, 0.1) !important;
  transform: scale(1.02);
  animation: pulse-border 1.5s infinite alternate;
}
@keyframes pulse-border {
  0% { box-shadow: 0 0 4px rgba(167, 139, 250, 0.2); }
  100% { box-shadow: 0 0 16px rgba(167, 139, 250, 0.6); }
}

.member-pill-left { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.member-pill-name { font-size: 13px; font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.member-pill-id { font-size: 10px; color: #6b7280; margin-top: 1px; }
.drag-indicator { font-size: 13px; color: rgba(255,255,255,0.2); margin-left: 6px; flex-shrink: 0; }

/* 弹窗遮罩 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 操作菜单 */
.action-sheet {
  width: 420px;
  background: rgba(17,24,39,0.98) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 16px 50px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sheet-header { padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.sheet-title-row { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
.sheet-member-name { font-size: 20px; font-weight: 700; color: #ffffff; }
.sheet-member-id { font-size: 12px; color: #9ca3af; }
.sheet-current-status { font-size: 13px; color: #a78bfa; }

.sheet-body { display: flex; flex-direction: column; gap: 8px; }
.sheet-section-title { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; }

.team-option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.team-opt-btn { height: 40px; font-size: 13px; font-weight: 600; color: #fff; border-radius: 8px; border: none; }
.team-opt-btn:hover { filter: brightness(1.1); }

.sheet-action-btn { height: 40px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; }
.btn-to-spectator { background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); color: #c084fc; }
.btn-to-pool { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #e5e7eb; }
.btn-delete-member { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; }

.sheet-footer { margin-top: 4px; }
.sheet-cancel-btn { width: 100%; height: 40px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); color: #9ca3af; font-size: 14px; border-radius: 8px; }
.sheet-cancel-btn:hover { background: rgba(255,255,255,0.06); color: #ffffff; }

/* 添加成员弹窗 */
.modal-content {
  width: 420px;
  background: rgba(17,24,39,0.97) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  border-radius: 16px;
  box-shadow: 0 16px 50px rgba(0,0,0,0.5);
}

.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.modal-title { font-size: 16px; font-weight: 700; color: #ffffff; }
.modal-close { background: transparent; color: #9ca3af; font-size: 16px; padding: 4px 8px; border-radius: 5px; }
.modal-close:hover { background: rgba(255,255,255,0.07); color: #fff; }

.modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 12px; color: #a78bfa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.form-input {
  height: 38px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 7px;
  padding: 0 12px;
  font-size: 14px;
  color: #fff;
  transition: border-color 0.2s;
}
.form-input:focus { border-color: rgba(167,139,250,0.5); }

.modal-footer { display: flex; gap: 8px; padding: 12px 20px 18px; border-top: 1px solid rgba(255,255,255,0.06); }
.modal-btn-cancel { flex: 1; height: 38px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #e5e7eb; font-size: 14px; border-radius: 7px; }
.modal-btn-cancel:hover { background: rgba(255,255,255,0.08); }
.modal-btn-confirm { flex: 2; height: 38px; background: linear-gradient(135deg, #34d399, #059669); color: #fff; font-size: 14px; font-weight: 600; border-radius: 7px; border: none; }
.modal-btn-confirm:hover { filter: brightness(1.08); }
</style>
