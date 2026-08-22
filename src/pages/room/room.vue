<template>
  <div
    ref="roomRootRef"
    class="container"
    :class="{
      'dragging-active': isDragging,
      'room-arrival': isRoomArrival,
      'room-leaving': isRoomLeaving
    }"
  >

    <!-- 顶部导航栏 -->
    <div class="room-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">← 返回大厅</button>
        <div class="header-title-block">
          <span class="room-title-text">{{ room.name || '房间详情' }}</span>
          <div class="badge-mode">{{ activeModeConfig.name }}</div>
          <span class="room-map-text">地图：{{ room.activeMap || room.map || '未选择' }}</span>
        </div>
      </div>
      <div class="header-right">
        <span class="member-count-text">成员：{{ room.members ? room.members.length : 0 }} / {{ activeModeConfig.maxMembers }}人</span>
        <button class="start-assign-btn" type="button" @click="handleRandomAssign">开始分队</button>
      </div>
    </div>

    <!-- 主体区域 - 左右分栏 -->
    <div class="main-layout">

      <!-- 左侧：设置 + 控制 -->
      <div class="left-panel">
        <!-- 游戏模式选择 -->
        <div class="panel-section glass-panel">
          <div class="section-title-row">
            <span class="section-title">游戏模式</span>
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
            <span class="section-title">比赛地图</span>
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
            >随机地图</div>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="control-panel glass-panel">
          <button class="ctrl-btn btn-random" @click="handleRandomAssign">随机分配</button>
          <button class="ctrl-btn btn-reset" @click="handleResetTeams">重置</button>
          <button class="ctrl-btn btn-add" @click="showAddMemberModal">添加成员</button>
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
                <div class="member-avatar" :style="{ background: getMemberAvatarBackground(team) }">{{ getMemberInitial(member) }}</div>
                <div class="member-pill-left">
                  <span class="member-pill-name">{{ member.name }}</span>
                  <span class="member-pill-id">ID: {{ member.id }} <em>在线</em></span>
                </div>
                <span class="member-role-tag" :class="getMemberRole(member).tone">{{ getMemberRole(member).label }}</span>
                <span class="drag-indicator">⠿</span>
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
              <span class="pool-tip">拖拽分配</span>
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
                  <div class="member-avatar neutral-avatar">{{ getMemberInitial(member) }}</div>
                  <div class="member-pill-left">
                    <span class="member-pill-name">{{ member.name }}</span>
                    <span class="member-pill-id">ID: {{ member.id }} <em>待分配</em></span>
                  </div>
                  <span class="member-role-tag neutral-role">候补</span>
                  <span class="drag-indicator">⠿</span>
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
                <span class="pool-title">观战席 ({{ getTeamMembers('spectator').length }})</span>
              </div>
              <span class="pool-tip">旁观席位</span>
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
                  <div class="member-avatar spectator-avatar">{{ getMemberInitial(member) }}</div>
                  <div class="member-pill-left">
                    <span class="member-pill-name">{{ member.name }}</span>
                    <span class="member-pill-id">ID: {{ member.id }} <em>在线</em></span>
                  </div>
                  <span class="member-role-tag watch-role">观战</span>
                  <span class="drag-indicator">⠿</span>
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
          <button v-if="activeMember?.teamId !== 'spectator'" class="sheet-action-btn btn-to-spectator" @click="assignToTeam('spectator')">移入观战席位</button>
          <button v-if="activeMember?.teamId !== null" class="sheet-action-btn btn-to-pool" @click="assignToTeam(null)">移回未分配成员池</button>
          <button class="sheet-action-btn btn-delete-member" @click="confirmDeleteMember">移除该成员</button>
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { roomStore, MODES, MAPS } from '../../store/roomStore.js'
import { useToast } from '../../composables/useToast.js'
import gsap from 'gsap'
import {
  animateDisplayHeaderCopy,
  beginLobbyReturnTransition,
  clearLuluDisplayArrivalStyles,
  hasLuluDisplayTransition,
  markLobbyReturnDisplay,
  placeGlobalLuluInDisplayTarget,
  prepareLuluDisplayArrival,
  settleLuluDisplayTransition,
  TOURNAMENT_DISPLAY_REVEAL_DURATION
} from '../../utils/globalLuluTransition.js'

export default {
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { showToast, showModal } = useToast()

    const roomRootRef = ref(null)
    const roomId = ref('')
    const isRoomArrival = ref(
      hasLuluDisplayTransition(route.query.id)
    )
    const isRoomLeaving = ref(false)
    const room = ref({ members: [] })

    const modeOptions = [
      { key: 'cashout', icon: '￥', shortName: '提现', limit: '12人/4队' },
      { key: 'quickcash', icon: '✦', shortName: '金爆点', limit: '16人/2队' },
      { key: 'team', icon: '◇', shortName: '团队', limit: '10人/2队' }
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
    const scoreDraft = ref({})
    const scoreNote = ref('')
    const selectedWinnerTeamId = ref(null)
    const scoreUpdatedAt = ref('')
    let roomEntranceTimer = null
    let roomReturnTimeline = null
    let isReturningToLobby = false

    const getTeamsForRoom = (roomData) => {
      const key = roomData?.activeMode || roomData?.mode || 'cashout'
      return (MODES[key] || MODES.cashout).teams
    }

    const hydrateScoreDraft = (roomData = room.value) => {
      const savedScore = roomData?.finalScore || {}
      const savedEntries = savedScore.entries || []
      const nextDraft = {}
      const modeTeams = getTeamsForRoom(roomData)

      modeTeams.forEach(team => {
        const savedEntry = savedEntries.find(entry => String(entry.teamId) === String(team.id))
        nextDraft[team.id] = {
          score: savedEntry?.score ?? '',
          kills: savedEntry?.kills ?? ''
        }
      })

      const hasSavedWinner = modeTeams.some(team => String(team.id) === String(savedScore.winnerTeamId))
      scoreDraft.value = nextDraft
      selectedWinnerTeamId.value = hasSavedWinner ? savedScore.winnerTeamId : null
      scoreNote.value = savedScore.note || ''
      scoreUpdatedAt.value = savedScore.updatedAt || ''
    }

    const loadRoomData = () => {
      const data = roomStore.getRoom(roomId.value)
      if (data) {
        room.value = data
        hydrateScoreDraft(data)
      }
    }

    const syncRoomMarquee = () => {
      nextTick(() => placeGlobalLuluInDisplayTarget(roomRootRef.value, { target: 'room' }))
    }

    const shouldReduceMotion = () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const clearRoomEntranceStyles = () => {
      clearLuluDisplayArrivalStyles({ target: 'room', root: roomRootRef.value })
    }

    const animateRoomHeaderEntrance = ({ arrival = false } = {}) => {
      if (shouldReduceMotion()) return
      animateDisplayHeaderCopy(roomRootRef.value, { arrival })
    }

    const finishRoomEntrance = () => {
      isRoomArrival.value = false
      nextTick(() => {
        clearRoomEntranceStyles()
        placeGlobalLuluInDisplayTarget(roomRootRef.value, { target: 'room' })
      })
    }

    const playRoomEntrance = () => {
      if (shouldReduceMotion()) {
        finishRoomEntrance()
        return
      }

      const settled = settleLuluDisplayTransition({
        id: roomId.value,
        target: 'room',
        root: roomRootRef.value,
        onComplete: finishRoomEntrance
      })

      if (settled) {
        animateRoomHeaderEntrance({ arrival: true })
      }

      if (!settled) {
        finishRoomEntrance()
      }
    }

    const forceCleanupDrag = () => {
      isDragging.value = false
      hoverTeamId.value = undefined
      dragEnterCount.value = {}
      draggedMember.value = null
      draggedMemberId.value = null
    }

    onMounted(() => {
      window.addEventListener('dragend', forceCleanupDrag)
      const id = route.query.id
      if (id) {
        roomId.value = id
        loadRoomData()

        if (isRoomArrival.value && !shouldReduceMotion()) {
          prepareLuluDisplayArrival({ target: 'room', root: roomRootRef.value })
        }

        roomEntranceTimer = setTimeout(() => {
          if (isRoomArrival.value) playRoomEntrance()
          else syncRoomMarquee()
        }, 140)
        window.addEventListener('resize', syncRoomMarquee)
      } else {
        showToast('房间不存在')
        setTimeout(() => goBack(), 1000)
      }
    })

    onUnmounted(() => {
      window.removeEventListener('dragend', forceCleanupDrag)
      if (roomEntranceTimer) clearTimeout(roomEntranceTimer)
      roomReturnTimeline?.kill()
      const root = roomRootRef.value
      if (root) gsap.killTweensOf(root.querySelectorAll('.room-header, .header-left, .header-right'))
      clearRoomEntranceStyles()
      window.removeEventListener('resize', syncRoomMarquee)
    })

    // ==========================================
    // 计算属性
    // ==========================================
    const activeModeKey = computed(() => room.value?.activeMode || room.value?.mode || 'cashout')
    const activeModeConfig = computed(() => MODES[activeModeKey.value] || MODES.cashout)
    const teams = computed(() => activeModeConfig.value.teams)
    const scoreStatusLabel = computed(() => room.value?.finalScore?.status === 'completed' ? '已录入' : '待录入')
    const winnerTeamName = computed(() => {
      const team = teams.value.find(item => String(item.id) === String(selectedWinnerTeamId.value))
      return team ? getCleanTeamName(team) : ''
    })
    const scorePreviewText = computed(() => {
      if (teams.value.length !== 2) return 'VS'
      const left = getScoreDraftValue(teams.value[0].id, 'score')
      const right = getScoreDraftValue(teams.value[1].id, 'score')
      return `${left === '' ? '-' : left} : ${right === '' ? '-' : right}`
    })

    const selectedModeBadge = computed(() => {
      const actKey = activeModeKey.value
      const actName = MODES[actKey]?.name || ''
      return `已选: ${actName}`
    })

    const selectedMapBadge = computed(() => {
      const mapKey = room.value?.map; const actMap = room.value?.activeMap
      if (mapKey === 'random') return `随机 (已抽中: ${actMap})`
      return `已选: ${mapKey}`
    })

    const unassignedMembers = computed(() =>
      room.value.members ? room.value.members.filter(m => m.teamId === null) : []
    )

    const getTeamMembers = (teamId) =>
      room.value.members ? room.value.members.filter(m => m.teamId === teamId) : []

    const getCleanTeamName = (team) =>
      (team?.name || '队伍').replace(/^[^A-Za-z0-9\u4e00-\u9fa5]+/, '').trim()

    const getMemberInitial = (member) => {
      const name = String(member?.name || '?').trim()
      return name ? name.slice(0, 1).toUpperCase() : '?'
    }

    const getMemberRole = (member) => {
      const roles = [
        { label: '突击', tone: 'assault-role' },
        { label: '支援', tone: 'support-role' },
        { label: '防守', tone: 'defense-role' }
      ]
      const seed = String(member?.id || member?.name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
      return roles[seed % roles.length]
    }

    const getMemberAvatarBackground = (team) =>
      team?.id === 2
        ? 'linear-gradient(135deg, #66707d, #343b45)'
        : 'linear-gradient(135deg, #b6404a, #6d1d27)'

    const getScoreDraftValue = (teamId, field) => scoreDraft.value[teamId]?.[field] ?? ''

    const setScoreDraftValue = (teamId, field, value) => {
      scoreDraft.value = {
        ...scoreDraft.value,
        [teamId]: {
          ...(scoreDraft.value[teamId] || {}),
          [field]: value
        }
      }
    }

    const parseScoreField = (value) => {
      if (value === '' || value === null || value === undefined) return null
      const parsed = Number(value)
      if (!Number.isFinite(parsed) || parsed < 0) return null
      return Math.floor(parsed)
    }

    const isTeamFull = (teamId) => {
      if (teamId === 'spectator') return false
      return getTeamMembers(teamId).length >= activeModeConfig.value.teamCapacity
    }

    const goBack = () => {
      if (isReturningToLobby) return

      const navigateHome = () => router.push('/')
      if (shouldReduceMotion()) {
        markLobbyReturnDisplay(roomId.value)
        navigateHome()
        return
      }

      const root = roomRootRef.value
      const header = root?.querySelector('.room-header')
      const headerLeft = root?.querySelector('.header-left')
      const headerRight = root?.querySelector('.header-right')
      isRoomLeaving.value = true

      isReturningToLobby = true
      let transitionStarted = false
      roomReturnTimeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
        .call(() => {
          transitionStarted = beginLobbyReturnTransition(roomId.value)
          if (!transitionStarted) navigateHome()
        }, null, 0)
        .to(headerLeft ? [headerLeft] : [], {
          xPercent: -105,
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power3.inOut',
          willChange: 'transform, opacity'
        }, 0)
        .to(headerRight ? [headerRight] : [], {
          xPercent: 105,
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power3.inOut',
          willChange: 'transform, opacity'
        }, 0)
        .to(header ? [header] : [], {
          height: root?.clientHeight || window.innerHeight,
          minHeight: root?.clientHeight || window.innerHeight,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut',
          willChange: 'height'
        }, 0)
        .call(() => {
          if (transitionStarted) navigateHome()
        }, null, TOURNAMENT_DISPLAY_REVEAL_DURATION + 0.04)
    }

    // ==========================================
    // 房间设置修改
    // ==========================================
    const changeMode = (modeKey) => {
      const res = roomStore.updateRoomSettings(roomId.value, modeKey, room.value.map, false)
      if (res.success) {
        room.value.mode = modeKey; room.value.activeMode = res.activeMode
        showToast(`已切换为 ${MODES[modeKey]?.name || modeKey}`)
        loadRoomData()
      }
    }

    const changeMap = (mapVal) => {
      const forceReroll = (mapVal === 'random' && room.value.map === 'random')
      const res = roomStore.updateRoomSettings(roomId.value, room.value.mode, mapVal, forceReroll)
      if (res.success) {
        room.value.map = mapVal; room.value.activeMap = res.activeMap
        let msg = `地图已切换为 ${mapVal}`
        if (mapVal === 'random') msg = `已抽中 ${res.activeMap}`
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

    const handleSaveFinalScore = () => {
      const entries = teams.value.map(team => ({
        teamId: team.id,
        score: parseScoreField(getScoreDraftValue(team.id, 'score')),
        kills: parseScoreField(getScoreDraftValue(team.id, 'kills') || 0)
      }))

      if (entries.some(entry => entry.score === null || entry.kills === null)) {
        showToast('请完整填写所有队伍的比分与小分')
        return
      }

      if (!teams.value.some(team => String(team.id) === String(selectedWinnerTeamId.value))) {
        showToast('请选择胜方')
        return
      }

      const res = roomStore.updateNormalFinalScore(roomId.value, {
        entries,
        winnerTeamId: selectedWinnerTeamId.value,
        note: scoreNote.value
      })

      if (res.success) {
        showToast('最终比分已保存', 'success')
        loadRoomData()
      } else {
        showToast(res.msg || '保存比分失败')
      }
    }

    const handleResetFinalScore = async () => {
      const confirmed = await showModal('清空比分', '确定要清空当前普通房间的最终比分吗？', '#e11d48')
      if (!confirmed) return
      const res = roomStore.resetNormalFinalScore(roomId.value)
      if (res.success) {
        showToast('比分已清空', 'success')
        loadRoomData()
      } else {
        showToast(res.msg || '清空比分失败')
      }
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
      if (member.teamId === 'spectator') return '观战席位'
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
            showToast(`已对调 ${memberA.name} 与 ${memberB.name} 的分组`, 'success')
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
      roomRootRef, roomId, room, modeOptions, selectedModeBadge, selectedMapBadge, teams, MAPS,
      isRoomArrival, isRoomLeaving,
      activeModeConfig, unassignedMembers, isAddModalVisible, newMemberName, newMemberId,
      isActionMenuVisible, activeMember, isDragging, hoverTeamId, draggedMemberId, selectedMember,
      scoreDraft, scoreNote, selectedWinnerTeamId, scoreUpdatedAt, scoreStatusLabel, winnerTeamName, scorePreviewText,
      loadRoomData, getTeamMembers, isTeamFull, goBack,
      getCleanTeamName, getMemberInitial, getMemberRole, getMemberAvatarBackground,
      getScoreDraftValue, setScoreDraftValue, handleSaveFinalScore, handleResetFinalScore,
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

/* 最终比分录入 */
.score-panel {
  width: 304px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  overflow: hidden;
}

.score-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.score-eyebrow {
  display: block;
  margin-bottom: 4px;
  color: rgba(255, 255, 255, 0.36);
  font: 700 10px/1.2 monospace;
  letter-spacing: 0.16em;
}

.score-panel-header h2 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  line-height: 1;
  font-weight: 1000;
}

.score-status {
  flex: none;
  padding: 4px 8px;
  border: 1px solid rgba(225, 29, 72, 0.34);
  background: rgba(225, 29, 72, 0.11);
  color: #fb7185;
  font-size: 10px;
  font-weight: 900;
}

.score-status.completed {
  border-color: rgba(251, 191, 36, 0.42);
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
}

.score-versus-strip {
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid rgba(225, 29, 72, 0.28);
  background: linear-gradient(90deg, rgba(225, 29, 72, 0.12), rgba(59, 130, 246, 0.09));
}

.score-versus-strip span {
  overflow: hidden;
  font-size: 11px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-versus-strip span:last-child { text-align: right; }

.score-versus-strip strong {
  color: #ffffff;
  font: 1000 22px/1 monospace;
}

.score-entry-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
}

.score-entry-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 54px 54px;
  align-items: center;
  gap: 8px;
  min-height: 62px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.025);
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
}

.score-entry-row.winner {
  border-color: rgba(251, 191, 36, 0.52);
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.12), rgba(255, 255, 255, 0.02));
  box-shadow: inset 3px 0 #fbbf24;
}

.winner-toggle {
  width: 16px;
  height: 16px;
  min-height: 16px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.22);
}

.winner-toggle.active {
  border-color: #fbbf24 !important;
  background: #fbbf24;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.45);
}

.score-team-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.score-team-name {
  overflow: hidden;
  color: #ffffff;
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-team-count {
  color: rgba(255, 255, 255, 0.34);
  font-size: 10px;
  font-weight: 700;
}

.score-mini-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-mini-field span,
.score-note-field span,
.score-winner-card span {
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  font-weight: 800;
}

.score-mini-field input {
  width: 100%;
  height: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.18);
  color: #ffffff;
  font: 900 15px/1 monospace;
  text-align: center;
}

.score-mini-field input:focus,
.score-note-field textarea:focus {
  border-color: rgba(225, 29, 72, 0.58);
  box-shadow: 0 0 0 2px rgba(225, 29, 72, 0.16);
}

.score-winner-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  border-left: 3px solid #e11d48;
  background: rgba(225, 29, 72, 0.08);
}

.score-winner-card strong {
  overflow: hidden;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-note-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-note-field textarea {
  width: 100%;
  resize: none;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.035);
  color: #ffffff;
  padding: 9px 10px;
  font-size: 12px;
  line-height: 1.5;
  outline: none;
}

.score-actions {
  display: grid;
  grid-template-columns: 1fr 76px;
  gap: 8px;
  margin-top: auto;
}

.score-save-btn,
.score-reset-btn {
  height: 38px;
  font-size: 13px;
  font-weight: 900;
}

.score-save-btn {
  background: #e11d48;
  color: #ffffff;
}

.score-save-btn:hover { box-shadow: 0 0 18px rgba(225, 29, 72, 0.3); }

.score-reset-btn {
  border: 1px solid rgba(255, 255, 255, 0.11);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.68);
}

.score-reset-btn:hover {
  border-color: rgba(225, 29, 72, 0.42);
  color: #ffffff;
}

.score-update-time {
  min-height: 16px;
  color: rgba(255, 255, 255, 0.26);
  font-size: 10px;
  text-align: right;
}

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
  border-radius: var(--radius-lg);
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
  border-radius: var(--radius-lg);
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

/* Red-black lobby theme continuation */
.container {
  background:
    linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    linear-gradient(135deg, #151515 0%, #242424 56%, #2a1118 100%);
  background-size: 28px 28px, 28px 28px, 100% 100%;
}

.room-header,
.panel-section,
.control-panel,
.team-card,
.pool-section,
.score-panel,
.action-sheet,
.modal-content {
  border-radius: 0 !important;
  background: rgba(31, 31, 31, 0.88) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
}

.room-header {
  border-left: 4px solid #e11d48 !important;
}

.back-btn,
.badge-mode,
.section-badge,
.random-map-capsule.active {
  color: #ffffff !important;
  background: rgba(225, 29, 72, 0.16) !important;
  border-color: rgba(225, 29, 72, 0.45) !important;
}

.section-title,
.form-label,
.sheet-current-status {
  color: #f43f5e !important;
}

.title-indicator,
.pool-indicator {
  background: #e11d48 !important;
}

.mode-card.active,
.map-capsule.active,
.team-card.drag-over,
.pool-section.drag-over,
.selected-pill {
  background: rgba(225, 29, 72, 0.16) !important;
  border-color: rgba(225, 29, 72, 0.55) !important;
  box-shadow: 0 0 16px rgba(225, 29, 72, 0.28) !important;
}

.mode-card:hover,
.map-capsule:hover {
  background: rgba(225, 29, 72, 0.1) !important;
  border-color: rgba(225, 29, 72, 0.35) !important;
}

.btn-random,
.modal-btn-confirm {
  background: #e11d48 !important;
}

.btn-add {
  color: #fb7185 !important;
  background: rgba(225, 29, 72, 0.1) !important;
  border-color: rgba(225, 29, 72, 0.32) !important;
}

/* Reference image room skin */
.container {
  padding: 0;
  gap: 16px;
  background: transparent !important;
}

.container.room-arrival {
  position: relative;
  background: transparent !important;
}

.room-header {
  position: relative;
  min-height: 112px;
  padding: 0 28px;
  overflow: hidden;
  border: 1px solid rgba(225, 29, 72, 0.46) !important;
  border-top: 0 !important;
  border-left: 0 !important;
  border-right: 0 !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: none !important;
}

.main-layout {
  padding: 0 16px 16px;
  box-sizing: border-box;
  background:
    linear-gradient(rgba(255, 255, 255, 0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.022) 1px, transparent 1px),
    radial-gradient(circle at 50% 30%, rgba(225, 29, 72, 0.08), transparent 38%),
    #111315 !important;
  background-size: 28px 28px, 28px 28px, 100% 100%, 100% 100% !important;
}

.room-arrival .room-header {
  z-index: auto;
  border-color: transparent !important;
  border-left-color: transparent !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.room-arrival .header-left {
  opacity: 0;
  transform: translateX(-105vw);
  visibility: hidden;
}

.room-arrival .header-right {
  opacity: 0;
  transform: translateX(105vw);
  visibility: hidden;
}

.room-leaving .room-header {
  z-index: auto;
  overflow: hidden;
  border-color: transparent !important;
  border-left-color: transparent !important;
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.room-leaving .header-left,
.room-leaving .header-right {
  z-index: 80;
  pointer-events: none;
}

.room-header::before { content: none; }

.room-header .header-left,
.room-header .header-right {
  position: relative;
  z-index: 70;
}

.room-header .header-left {
  align-items: center;
  gap: 28px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 22px;
}

.back-btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 4px !important;
  border-color: rgba(255, 255, 255, 0.42) !important;
  background: rgba(13, 10, 12, 0.34) !important;
  color: #ffffff !important;
  font-size: 16px;
  font-weight: 900;
}

.back-btn:hover {
  border-color: rgba(255, 255, 255, 0.76) !important;
  background: rgba(13, 10, 12, 0.5) !important;
}

.header-title-block {
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 7px 16px;
}

.room-title-text {
  color: #ffffff;
  font-size: 30px;
  line-height: 1;
  font-weight: 1000;
  letter-spacing: 0;
  text-shadow: 0 2px 0 rgba(37, 0, 9, 0.34);
}

.badge-mode {
  align-self: center;
  padding: 7px 12px;
  border-radius: 5px !important;
  border-color: rgba(255, 255, 255, 0.35) !important;
  background: rgba(40, 0, 12, 0.3) !important;
  color: #ffffff !important;
  font-size: 13px;
  font-weight: 900;
}

.room-map-text {
  grid-column: 1 / -1;
  color: rgba(255, 255, 255, 0.76);
  font-size: 15px;
  font-weight: 800;
}

.member-count-text {
  color: rgba(255, 255, 255, 0.86);
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
}

.start-assign-btn {
  min-width: 156px;
  min-height: 52px;
  border-radius: 4px !important;
  background: #e91a49;
  color: #ffffff;
  font-size: 18px;
  font-weight: 1000;
  box-shadow: 0 12px 28px rgba(52, 0, 14, 0.26);
}

.start-assign-btn:hover {
  background: #f0224f;
  box-shadow: 0 16px 34px rgba(52, 0, 14, 0.34);
}

.main-layout {
  gap: 16px;
}

.left-panel {
  width: 368px;
  gap: 12px;
}

.panel-section,
.control-panel,
.team-card,
.pool-section,
.score-panel {
  border: 1px solid rgba(255, 255, 255, 0.13) !important;
  background:
    linear-gradient(145deg, rgba(27, 29, 31, 0.94), rgba(14, 16, 18, 0.92)) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035) !important;
}

.panel-section {
  padding: 16px;
  gap: 14px;
}

.section-title {
  color: #ff2f62 !important;
  font-size: 16px;
  font-weight: 1000;
}

.section-badge {
  display: none;
}

.mode-cards-grid {
  gap: 10px;
}

.mode-card {
  min-height: 126px;
  justify-content: center;
  gap: 10px;
  border-radius: 5px !important;
  border-color: rgba(255, 255, 255, 0.11) !important;
  background: rgba(255, 255, 255, 0.035) !important;
}

.mode-card.active {
  position: relative;
  border-color: #f0204e !important;
  background: linear-gradient(145deg, rgba(225, 29, 72, 0.18), rgba(255, 255, 255, 0.035)) !important;
}

.mode-card.active::after {
  content: "";
  position: absolute;
  right: -1px;
  top: -1px;
  border-top: 22px solid #f0204e;
  border-left: 22px solid transparent;
}

.mode-icon {
  font-size: 24px;
}

.mode-name {
  font-size: 15px;
  font-weight: 900;
}

.mode-limit {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.62);
}

.map-cards-grid {
  gap: 8px;
}

.map-capsule {
  min-height: 45px;
  display: grid;
  place-items: center;
  border-radius: 5px !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  background: rgba(255, 255, 255, 0.035) !important;
  color: rgba(255, 255, 255, 0.88);
  font-size: 14px;
  font-weight: 900;
}

.map-capsule.active {
  border-color: #f0204e !important;
  background: rgba(225, 29, 72, 0.14) !important;
  color: #ff315d !important;
}

.random-map-capsule {
  grid-column: span 3;
}

.control-panel {
  padding: 16px;
  gap: 12px;
}

.ctrl-btn {
  height: 50px;
  border-radius: 4px !important;
  font-size: 17px;
  font-weight: 1000;
}

.btn-random {
  background: linear-gradient(135deg, #f01749, #df103f) !important;
}

.btn-reset {
  background: rgba(255, 255, 255, 0.045) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: rgba(255, 255, 255, 0.9) !important;
}

.btn-add {
  background: transparent !important;
  border: 1px solid rgba(240, 32, 78, 0.75) !important;
  color: #ff315d !important;
}

.right-panel {
  gap: 16px;
}

.teams-grid {
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 16px;
}

.team-card {
  min-height: 430px;
}

.team-card:hover {
  transform: none;
  border-color: rgba(255, 255, 255, 0.2) !important;
}

.team-card-header {
  min-height: 49px;
  padding: 0 26px;
}

.team-card-title {
  font-size: 19px;
  font-weight: 1000;
}

.team-card-badge {
  background: transparent;
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
}

.team-members-list {
  padding: 18px;
  gap: 10px;
}

.member-pill {
  min-height: 68px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto 26px;
  gap: 12px;
  padding: 0 14px;
  border-radius: 6px !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)),
    rgba(17, 19, 21, 0.88) !important;
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.16);
}

.member-pill:hover {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
    rgba(20, 22, 24, 0.95) !important;
}

.member-avatar {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #ffffff;
  font-size: 20px;
  font-weight: 1000;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.neutral-avatar,
.spectator-avatar {
  background: linear-gradient(135deg, #65707d, #363d46);
}

.member-pill-left {
  justify-content: center;
  gap: 2px;
}

.member-pill-name {
  font-size: 17px;
  font-weight: 900;
}

.member-pill-id {
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
}

.member-pill-id em {
  margin-left: 9px;
  color: #20d76a;
  font-style: normal;
  font-weight: 900;
}

.member-role-tag {
  min-width: 50px;
  justify-self: end;
  padding: 3px 8px;
  border: 1px solid currentColor;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
  font-weight: 1000;
  text-align: center;
}

.assault-role {
  color: #ff454f;
  background: rgba(255, 69, 79, 0.08);
}

.support-role {
  color: #ffbe2e;
  background: rgba(255, 190, 46, 0.08);
}

.defense-role {
  color: #4ea2ff;
  background: rgba(78, 162, 255, 0.08);
}

.neutral-role {
  color: rgba(255, 255, 255, 0.5);
}

.watch-role {
  color: #34d399;
  background: rgba(52, 211, 153, 0.08);
}

.drag-indicator {
  color: rgba(255, 255, 255, 0.5);
  font-size: 22px;
  letter-spacing: -4px;
}

.team-empty {
  min-height: 70px;
  margin: 0;
  border-radius: 6px !important;
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(0, 0, 0, 0.12);
}

.empty-text::before {
  content: "+";
  margin-right: 12px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 30px;
  font-weight: 300;
  vertical-align: -3px;
}

.empty-text {
  color: rgba(255, 255, 255, 0.48);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0;
}

.bottom-grid {
  height: 270px;
  gap: 16px;
}

.pool-section {
  padding: 18px;
}

.pool-header {
  margin-bottom: 16px;
}

.pool-indicator {
  width: 4px;
  height: 22px;
  border-radius: 0;
}

.pool-title {
  font-size: 18px;
  font-weight: 1000;
}

.pool-tip {
  display: none;
}

.pool-empty {
  height: 180px;
  flex-direction: column;
  gap: 10px;
}

.pool-empty::before {
  content: "";
  width: 58px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.14);
  border-top: 12px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px 8px 6px 6px;
  opacity: 0.8;
}

.pool-empty-text {
  color: rgba(255, 255, 255, 0.36);
  font-size: 15px;
}

.score-panel {
  width: 256px;
  gap: 14px;
  padding: 16px;
}

.score-panel-header {
  padding-bottom: 16px;
}

.score-panel-header h2 {
  color: #ff315d;
  font-size: 17px;
}

.score-entry-row {
  grid-template-columns: 16px minmax(0, 1fr);
  grid-template-areas:
    "toggle meta"
    "score score";
  min-height: auto;
  padding: 10px 0;
  border-width: 0 0 1px;
  border-color: rgba(255, 255, 255, 0.09) !important;
  background: transparent;
  box-shadow: none;
}

.score-entry-row .winner-toggle {
  grid-area: toggle;
}

.score-entry-row .score-team-meta {
  grid-area: meta;
}

.score-entry-row .score-mini-field {
  display: grid;
  grid-template-columns: 36px 1fr;
  align-items: center;
}

.score-entry-row .score-mini-field:nth-of-type(1) {
  grid-area: score;
  margin-top: 8px;
}

.score-entry-row .score-mini-field:nth-of-type(2) {
  grid-area: score;
  margin-top: 48px;
}

.score-mini-field input {
  height: 34px;
}

.score-winner-card,
.score-note-field textarea {
  border-radius: 4px;
}

@media (max-width: 1320px) {
  .left-panel {
    width: 320px;
  }

  .score-panel {
    width: 236px;
  }

  .teams-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  .room-title-text {
    font-size: 26px;
  }
}
</style>
