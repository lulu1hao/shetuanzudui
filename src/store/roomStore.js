import { reactive, watch } from 'vue'

const STORAGE_KEY = 'CLUB_TEAM_MATCHER_ROOMS'

// 1. 定义三种房间模式配置
export const MODES = {
  cashout: {
    key: 'cashout',
    name: '提现模式',
    teamsCount: 4,
    teamCapacity: 3,
    maxMembers: 12,
    teams: [
      { id: 1, name: '烈焰红队', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
      { id: 2, name: '极光蓝队', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
      { id: 3, name: '翡翠绿队', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #14b8a6)' },
      { id: 4, name: '星云紫队', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }
    ]
  },
  quickcash: {
    key: 'quickcash',
    name: '金爆点模式',
    teamsCount: 2,
    teamCapacity: 8,
    maxMembers: 16,
    teams: [
      { id: 1, name: '烈焰红队', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
      { id: 2, name: '极光蓝队', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' }
    ]
  },
  team: {
    key: 'team',
    name: '团队模式',
    teamsCount: 2,
    teamCapacity: 5,
    maxMembers: 10,
    teams: [
      { id: 1, name: '烈焰红队', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
      { id: 2, name: '极光蓝队', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' }
    ]
  }
}

// 2. 地图列表
export const MAPS = [
  '摩纳哥',
  '天路体育场',
  '首尔',
  '贝纳尔',
  '财富体育场',
  '京都',
  '方外',
  '希望要塞',
  '地平线'
]

// ==========================================
// 赛事对阵生成辅助算法
// ==========================================
export const FINALS_TEAMS = [
  { id: 'team_1', name: 'THE ULTRA-RARES', logo: 'UR', color: '#ff2e93', members: ['Miya', 'Sola', 'Luna'] },
  { id: 'team_2', name: 'THE LIVE WIRES', logo: 'LW', color: '#ffcc00', members: ['Spark', 'Bolt', 'Shock'] },
  { id: 'team_3', name: 'THE STEAMROLLERS', logo: 'SR', color: '#00e1ff', members: ['Crush', 'Heavy', 'Rock'] },
  { id: 'team_4', name: 'THE SHOCK & AWE', logo: 'SA', color: '#ff5a00', members: ['Zeus', 'Thor', 'Odin'] },
  { id: 'team_5', name: 'THE JET SETTERS', logo: 'JS', color: '#a855f7', members: ['Fly', 'Aero', 'Jet'] },
  { id: 'team_6', name: 'THE BIG SPLASH', logo: 'BS', color: '#3b82f6', members: ['Wave', 'Aqua', 'Rain'] },
  { id: 'team_7', name: 'THE MIGHTY', logo: 'TM', color: '#10b981', members: ['Herc', 'Atlas', 'Titan'] },
  { id: 'team_8', name: 'THE POWERHOUSES', logo: 'PH', color: '#ec4899', members: ['Volt', 'Amp', 'Watt'] }
]

export const TOURNAMENT_BODY_TYPES = ['大', '中', '小']

const normalizeTournamentMember = (member, teamId, index = 0) => {
  if (member && typeof member === 'object') {
    return {
      id: member.id || `${teamId}_member_${Date.now()}_${index}`,
      name: String(member.name || '').trim() || `成员 ${index + 1}`,
      bodyType: TOURNAMENT_BODY_TYPES.includes(member.bodyType) ? member.bodyType : '中'
    }
  }
  return {
    id: `${teamId}_member_${Date.now()}_${index}`,
    name: String(member || '').trim() || `成员 ${index + 1}`,
    bodyType: TOURNAMENT_BODY_TYPES[index % TOURNAMENT_BODY_TYPES.length]
  }
}

const normalizeTournamentTeam = (team, index) => {
  const fallback = FINALS_TEAMS[index]
  const normalized = team || {
    id: fallback.id,
    name: fallback.name,
    logo: fallback.logo,
    color: fallback.color,
    members: fallback.members
  }
  normalized.members = (normalized.members || []).map((member, memberIndex) =>
    normalizeTournamentMember(member, normalized.id, memberIndex)
  )
  return normalized
}

const createTournamentTeam = (index) => {
  const source = FINALS_TEAMS[index]
  return normalizeTournamentTeam({
    id: source.id,
    name: source.name,
    logo: source.logo,
    color: source.color,
    members: [...source.members]
  }, index)
}

export const generateTournamentSchedule = (tournamentType, teamCount, teams) => {
  const matches = []
  const slots = teams.map(t => t.id)

  if (teamCount === 4) {
    matches.push({ id: 'semifinal_4', stage: 'semifinal', name: '半决赛 (4队同场)', teams: [...slots], cashouts: {}, status: 'pending', promoted: [] })
    matches.push({ id: 'final_grand', stage: 'grand_final', name: '冠亚决赛', teams: [null, null], cashouts: {}, status: 'pending', rankings: [] })
    matches.push({ id: 'final_3rd', stage: '3rd_place', name: '季军决赛', teams: [null, null], cashouts: {}, status: 'pending', rankings: [] })
  } else if (teamCount === 6) {
    matches.push({ id: 'semifinal_a', stage: 'semifinal', name: '半决赛 A组', teams: [slots[0], slots[1], slots[2]], cashouts: {}, status: 'pending', promoted: [] })
    matches.push({ id: 'semifinal_b', stage: 'semifinal', name: '半决赛 B组', teams: [slots[3], slots[4], slots[5]], cashouts: {}, status: 'pending', promoted: [] })
    matches.push({ id: 'semifinal_4', stage: 'semifinal_4', name: '4强半决赛 (4队同场)', teams: [null, null, null, null], cashouts: {}, status: 'pending', promoted: [] })
    matches.push({ id: 'final_grand', stage: 'grand_final', name: '冠亚决赛', teams: [null, null], cashouts: {}, status: 'pending', rankings: [] })
    matches.push({ id: 'final_3rd', stage: '3rd_place', name: '季军决赛', teams: [null, null], cashouts: {}, status: 'pending', rankings: [] })
  } else if (teamCount === 8) {
    matches.push({ id: 'semifinal_a', stage: 'semifinal', name: '半决赛 A组', teams: [slots[0], slots[1], slots[2], slots[3]], cashouts: {}, status: 'pending', promoted: [] })
    matches.push({ id: 'semifinal_b', stage: 'semifinal', name: '半决赛 B组', teams: [slots[4], slots[5], slots[6], slots[7]], cashouts: {}, status: 'pending', promoted: [] })
    matches.push({ id: 'semifinal_4', stage: 'semifinal_4', name: '4强半决赛 (4队同场)', teams: [null, null, null, null], cashouts: {}, status: 'pending', promoted: [] })
    matches.push({ id: 'final_grand', stage: 'grand_final', name: '冠亚决赛', teams: [null, null], cashouts: {}, status: 'pending', rankings: [] })
    matches.push({ id: 'final_3rd', stage: '3rd_place', name: '季军决赛', teams: [null, null], cashouts: {}, status: 'pending', rankings: [] })
  }

  return matches
}

const syncCashoutTournamentMatches = (room) => {
  if (!room.slots || room.slots.length === 0) return
  const teamCount = room.teamCount
  const sfA = room.matches.find(m => m.id === 'semifinal_a')
  const sfB = room.matches.find(m => m.id === 'semifinal_b')
  const sf4 = room.matches.find(m => m.id === 'semifinal_4')
  const final = room.matches.find(m => m.stage === 'grand_final')
  const third = room.matches.find(m => m.stage === '3rd_place')

  const isDownstreamCompleted = (final && final.status === 'completed') || (third && third.status === 'completed')

  if (teamCount === 4) {
    if (isDownstreamCompleted && sf4 && sf4.status !== 'completed') {
      sf4.status = 'completed'
    }
    if (sf4 && sf4.status !== 'completed') sf4.teams = [...room.slots]
    if (!isDownstreamCompleted && (!sf4 || sf4.status !== 'completed')) {
      if (final) { final.status = 'pending'; final.teams = [null, null]; final.cashouts = {}; final.rankings = [] }
      if (third) { third.status = 'pending'; third.teams = [null, null]; third.cashouts = {}; third.rankings = [] }
    } else {
      let promoted = sf4 ? (sf4.promoted || []) : []
      let eliminated = sf4 ? (sf4.teams || []).filter(t => Boolean(t) && !promoted.includes(t)) : []
      if (final && final.status !== 'completed') final.teams = [promoted[0] || null, promoted[1] || null]
      if (third && third.status !== 'completed') third.teams = [eliminated[0] || null, eliminated[1] || null]
    }
  } else if (teamCount === 6 || teamCount === 8) {
    if (sfA && sfA.status !== 'completed') sfA.teams = teamCount === 6 ? [room.slots[0], room.slots[1], room.slots[2]] : [room.slots[0], room.slots[1], room.slots[2], room.slots[3]]
    if (sfB && sfB.status !== 'completed') sfB.teams = teamCount === 6 ? [room.slots[3], room.slots[4], room.slots[5]] : [room.slots[4], room.slots[5], room.slots[6], room.slots[7]]
    const isFirstRoundCompleted = sfA && sfA.status === 'completed' && sfB && sfB.status === 'completed'
    if (!isFirstRoundCompleted && !isDownstreamCompleted) {
      if (sf4) { sf4.status = 'pending'; sf4.teams = [null, null, null, null]; sf4.cashouts = {}; sf4.promoted = [] }
      if (final) { final.status = 'pending'; final.teams = [null, null]; final.cashouts = {}; final.rankings = [] }
      if (third) { third.status = 'pending'; third.teams = [null, null]; third.cashouts = {}; third.rankings = [] }
    } else {
      let pA = sfA ? (sfA.promoted || []) : []
      let pB = sfB ? (sfB.promoted || []) : []
      if (isDownstreamCompleted && sf4 && sf4.status !== 'completed') sf4.status = 'completed'
      if (sf4 && sf4.status !== 'completed') sf4.teams = [pA[0] || null, pA[1] || null, pB[0] || null, pB[1] || null]
      if (!isDownstreamCompleted && (!sf4 || sf4.status !== 'completed')) {
        if (final) { final.status = 'pending'; final.teams = [null, null]; final.cashouts = {}; final.rankings = [] }
        if (third) { third.status = 'pending'; third.teams = [null, null]; third.cashouts = {}; final.rankings = [] }
      } else {
        let promoted = sf4 ? (sf4.promoted || []) : []
        let eliminated = sf4 ? (sf4.teams || []).filter(t => Boolean(t) && !promoted.includes(t)) : []
        if (final && final.status !== 'completed') final.teams = [promoted[0] || null, promoted[1] || null]
        if (third && third.status !== 'completed') third.teams = [eliminated[0] || null, eliminated[1] || null]
      }
    }
  }
}

const loadRooms = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    const rooms = JSON.parse(data)
    rooms.forEach(room => {
      if (room.type !== 'tournament') {
        if (!room.activeMode || !MODES[room.activeMode]) {
          const keys = Object.keys(MODES)
          room.activeMode = room.mode === 'random' ? keys[Math.floor(Math.random() * keys.length)] : (MODES[room.mode] ? room.mode : keys[0])
        }
        if (!room.activeMap || room.activeMap === 'random') {
          room.activeMap = room.map === 'random' ? MAPS[Math.floor(Math.random() * MAPS.length)] : (room.map || MAPS[0])
        }
        if (!room.finalScore) {
          room.finalScore = { status: 'pending', entries: [], winnerTeamId: null, note: '', updatedAt: '' }
        }
      }
      if (room.type === 'tournament') {
        room.tournamentType = 'cashout'
        room.teamCount = [4, 6, 8].includes(Number(room.teamCount)) ? Number(room.teamCount) : 4
        room.teams = (room.teams || []).slice(0, room.teamCount).map(normalizeTournamentTeam)
        while (room.teams.length < room.teamCount) room.teams.push(createTournamentTeam(room.teams.length))
        room.slots = (room.slots || []).filter(teamId => room.teams.some(team => team.id === teamId))
        room.teams.forEach(team => {
          if (!room.slots.includes(team.id)) room.slots.push(team.id)
        })
      }
    })
    return rooms
  } catch (e) {
    console.error('加载本地缓存失败', e)
    return []
  }
}

// 核心反应式状态
export const roomState = reactive({
  rooms: loadRooms()
})

// 监听房间状态变化，自动持久化至 localStorage
watch(
  () => roomState.rooms,
  (newRooms) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRooms))
    } catch (e) {
      console.error('保存至本地缓存失败', e)
    }
  },
  { deep: true }
)

// 导出方法
export const roomStore = {
  getRooms() { return roomState.rooms },
  getRoom(roomId) { return roomState.rooms.find(r => r.id === roomId) },

  createRoom(name, mode = 'cashout', map = 'random', options = {}) {
    const isTournament = options.type === 'tournament'
    let activeMode = mode
    let activeMap = map
    if (map === 'random') { activeMap = MAPS[Math.floor(Math.random() * MAPS.length)] }
    const roomId = 'room_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    const roomObj = { id: roomId, name: name || (isTournament ? '新杯赛/联赛房间' : '新组队房间'), type: options.type || 'normal', createdAt: new Date().toLocaleString(), members: [] }

    if (isTournament) {
      roomObj.tournamentType = 'cashout'
      roomObj.teamCount = parseInt(options.teamCount || 4)
      roomObj.map = map; roomObj.activeMap = activeMap
      const tournamentTeams = []
      if (roomObj.tournamentType === 'cashout') {
        for (let i = 1; i <= roomObj.teamCount; i++) {
          tournamentTeams.push(createTournamentTeam(i - 1))
        }
        roomObj.slots = tournamentTeams.map(t => t.id)
      } else {
        for (let i = 1; i <= roomObj.teamCount; i++) {
          tournamentTeams.push({ id: 'team_' + i, name: `战队 ${i}`, members: [] })
        }
        roomObj.slots = tournamentTeams.map(t => t.id)
      }
      roomObj.teams = tournamentTeams
      roomObj.matches = generateTournamentSchedule(roomObj.tournamentType, roomObj.teamCount, tournamentTeams)
      if (roomObj.tournamentType === 'cashout') syncCashoutTournamentMatches(roomObj)
    } else {
      roomObj.mode = mode; roomObj.activeMode = activeMode; roomObj.map = map; roomObj.activeMap = activeMap; roomObj.maxMembers = 16
      roomObj.finalScore = { status: 'pending', entries: [], winnerTeamId: null, note: '', updatedAt: '' }
    }

    roomState.rooms.unshift(roomObj)
    return roomObj
  },

  updateRoomSettings(roomId, mode, map, forceReroll = false) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    const previousActiveMode = room.activeMode
    if (mode !== undefined) {
      room.mode = mode
      room.activeMode = mode
    }
    if (map !== undefined) {
      room.map = map
      if (map === 'random') { if (forceReroll) room.activeMap = MAPS[Math.floor(Math.random() * MAPS.length)] }
      else { room.activeMap = map }
    }
    if (room.activeMode !== previousActiveMode) {
      room.members.forEach(m => { m.teamId = null })
      if (room.type !== 'tournament') {
        room.finalScore = { status: 'pending', entries: [], winnerTeamId: null, note: '', updatedAt: '' }
      }
    }
    return { success: true, activeMode: room.activeMode, activeMap: room.activeMap }
  },

  updateNormalFinalScore(roomId, payload = {}) {
    const room = this.getRoom(roomId)
    if (!room || room.type === 'tournament') return { success: false, msg: '普通房间未找到' }
    const activeModeKey = room.activeMode || room.mode || 'cashout'
    const config = MODES[activeModeKey] || MODES.cashout
    const allowedTeamIds = new Set(config.teams.map(team => String(team.id)))
    const entries = (payload.entries || [])
      .filter(entry => allowedTeamIds.has(String(entry.teamId)))
      .map(entry => ({
        teamId: entry.teamId,
        score: Number.isFinite(Number(entry.score)) ? Math.max(0, Math.floor(Number(entry.score))) : 0,
        kills: Number.isFinite(Number(entry.kills)) ? Math.max(0, Math.floor(Number(entry.kills))) : 0
      }))

    if (entries.length !== config.teams.length) {
      return { success: false, msg: '比分队伍数量与当前模式不一致' }
    }

    room.finalScore = {
      status: 'completed',
      entries,
      winnerTeamId: payload.winnerTeamId,
      note: String(payload.note || '').trim(),
      updatedAt: new Date().toLocaleString()
    }
    return { success: true }
  },

  resetNormalFinalScore(roomId) {
    const room = this.getRoom(roomId)
    if (!room || room.type === 'tournament') return { success: false, msg: '普通房间未找到' }
    room.finalScore = { status: 'pending', entries: [], winnerTeamId: null, note: '', updatedAt: '' }
    return { success: true }
  },

  updateTournamentMap(roomId, mapVal, forceReroll = false) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false }
    room.map = mapVal
    if (mapVal === 'random') { if (forceReroll) room.activeMap = MAPS[Math.floor(Math.random() * MAPS.length)] }
    else { room.activeMap = mapVal }
    return { success: true, activeMap: room.activeMap }
  },

  updateTournamentRoomMeta(roomId, updates = {}) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    if (updates.name !== undefined) room.name = updates.name.trim()
    if (updates.reward !== undefined) room.reward = updates.reward.trim()
    return { success: true }
  },

  updateTournamentTeam(roomId, teamId, newName, membersArray) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    const team = room.teams.find(t => t.id === teamId)
    if (!team) return { success: false, msg: '战队未找到' }
    if (newName) team.name = newName.trim()
    team.members = (membersArray || []).map((member, index) => normalizeTournamentMember(member, team.id, index))
    return { success: true }
  },

  resizeTournament(roomId, nextTeamCount) {
    const room = this.getRoom(roomId)
    const count = Number(nextTeamCount)
    if (!room || room.type !== 'tournament') return { success: false, msg: '赛事房间未找到' }
    if (![4, 6, 8].includes(count)) return { success: false, msg: '仅支持 4、6、8 支战队' }
    if (room.teamCount === count) return { success: true }

    const preservedTeams = (room.teams || []).slice(0, count).map(normalizeTournamentTeam)
    while (preservedTeams.length < count) preservedTeams.push(createTournamentTeam(preservedTeams.length))

    room.teamCount = count
    room.teams = preservedTeams
    room.slots = preservedTeams.map(team => team.id)
    room.matches = generateTournamentSchedule(room.tournamentType || 'cashout', count, preservedTeams)
    syncCashoutTournamentMatches(room)
    return { success: true }
  },

  addTournamentMember(roomId, teamId, name, bodyType = '中') {
    const room = this.getRoom(roomId)
    const team = room?.teams?.find(item => item.id === teamId)
    const trimmedName = String(name || '').trim()
    if (!team) return { success: false, msg: '战队未找到' }
    if (!trimmedName) return { success: false, msg: '请输入成员名称' }
    if ((team.members || []).length >= 12) return { success: false, msg: '每支战队最多 12 名成员' }
    if (room.teams.some(item => (item.members || []).some(member => member.name === trimmedName))) {
      return { success: false, msg: '该成员已存在于赛事房间中' }
    }
    team.members.push(normalizeTournamentMember({
      id: `${teamId}_member_${Date.now()}`,
      name: trimmedName,
      bodyType
    }, teamId, team.members.length))
    return { success: true }
  },

  removeTournamentMember(roomId, teamId, memberId) {
    const room = this.getRoom(roomId)
    const team = room?.teams?.find(item => item.id === teamId)
    if (!team) return { success: false, msg: '战队未找到' }
    const index = (team.members || []).findIndex(member => member.id === memberId)
    if (index < 0) return { success: false, msg: '成员未找到' }
    team.members.splice(index, 1)
    return { success: true }
  },

  updateTournamentMember(roomId, teamId, memberId, patch = {}) {
    const room = this.getRoom(roomId)
    const team = room?.teams?.find(item => item.id === teamId)
    const member = team?.members?.find(item => item.id === memberId)
    if (!member) return { success: false, msg: '成员未找到' }
    if (patch.name !== undefined) member.name = String(patch.name).trim() || member.name
    if (TOURNAMENT_BODY_TYPES.includes(patch.bodyType)) member.bodyType = patch.bodyType
    return { success: true }
  },

  moveTournamentMember(roomId, memberId, fromTeamId, targetTeamId) {
    const room = this.getRoom(roomId)
    const fromTeam = room?.teams?.find(team => team.id === fromTeamId)
    const targetTeam = room?.teams?.find(team => team.id === targetTeamId)
    if (!fromTeam || !targetTeam) return { success: false, msg: '战队未找到' }
    if (fromTeamId === targetTeamId) return { success: true }
    if ((targetTeam.members || []).length >= 12) return { success: false, msg: '目标战队人数已满' }
    const memberIndex = (fromTeam.members || []).findIndex(member => member.id === memberId)
    if (memberIndex < 0) return { success: false, msg: '成员未找到' }
    const [member] = fromTeam.members.splice(memberIndex, 1)
    targetTeam.members.push(member)
    return { success: true }
  },

  randomizeTournamentMembers(roomId) {
    const room = this.getRoom(roomId)
    if (!room?.teams?.length) return { success: false, msg: '赛事房间未找到' }
    const members = room.teams.flatMap(team => team.members || [])
    if (!members.length) return { success: false, msg: '当前没有可分组的成员' }
    for (let index = members.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[members[index], members[randomIndex]] = [members[randomIndex], members[index]]
    }
    room.teams.forEach(team => { team.members = [] })
    members.forEach((member, index) => {
      room.teams[index % room.teams.length].members.push(member)
    })
    return { success: true }
  },

  updateMatchScore(roomId, matchId, scoreA, scoreB, killsA, killsB, winnerId, mapName) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    const match = room.matches.find(m => m.id === matchId)
    if (!match) return { success: false, msg: '场次未找到' }
    match.scoreA = parseInt(scoreA); match.scoreB = parseInt(scoreB)
    match.killsA = parseInt(killsA || 0); match.killsB = parseInt(killsB || 0)
    match.winnerId = winnerId; match.activeMap = mapName || '无'; match.status = 'completed'
    return { success: true }
  },

  deleteRoom(roomId) {
    const index = roomState.rooms.findIndex(r => r.id === roomId)
    if (index !== -1) { roomState.rooms.splice(index, 1); return true }
    return false
  },

  addMemberToRoom(roomId, name, customId) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    if (room.members.length >= room.maxMembers) return { success: false, msg: `该房间人数已达上限 (${room.maxMembers}人)` }
    const trimmedName = name ? name.trim() : ''; const trimmedId = customId ? customId.trim() : ''
    if (!trimmedName) return { success: false, msg: '成员姓名不能为空' }
    if (room.members.some(m => m.name === trimmedName)) return { success: false, msg: '该成员姓名已存在' }
    const finalId = trimmedId || 'ID_' + Math.floor(1000 + Math.random() * 9000)
    if (room.members.some(m => m.id === finalId)) return { success: false, msg: '该成员ID已存在，请更换' }
    room.members.push({ id: finalId, name: trimmedName, teamId: null })
    return { success: true, member: room.members[room.members.length - 1] }
  },

  removeMemberFromRoom(roomId, memberId) {
    const room = this.getRoom(roomId)
    if (!room) return false
    const index = room.members.findIndex(m => m.id === memberId)
    if (index !== -1) { room.members.splice(index, 1); return true }
    return false
  },

  moveMemberToTeam(roomId, memberId, targetTeamId) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    const member = room.members.find(m => m.id === memberId)
    if (!member) return { success: false, msg: '成员未找到' }
    const activeModeKey = room.activeMode || room.mode || 'cashout'
    const config = MODES[activeModeKey] || MODES.cashout
    if (targetTeamId !== null && targetTeamId !== 'spectator') {
      const teamCount = room.members.filter(m => m.teamId === targetTeamId).length
      if (teamCount >= config.teamCapacity) return { success: false, msg: `第 ${targetTeamId} 队人数已满（上限 ${config.teamCapacity} 人）` }
    }
    member.teamId = targetTeamId
    return { success: true }
  },

  swapMembersTeams(roomId, memberAId, memberBId) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    const memberA = room.members.find(m => m.id === memberAId)
    const memberB = room.members.find(m => m.id === memberBId)
    if (!memberA || !memberB) return { success: false, msg: '成员未找到' }
    if (memberA.id === memberB.id) return { success: true }

    const activeModeKey = room.activeMode || room.mode || 'cashout'
    const config = MODES[activeModeKey] || MODES.cashout
    const teamAId = memberA.teamId
    const teamBId = memberB.teamId

    if (teamAId !== teamBId) {
      if (teamBId !== null && teamBId !== 'spectator') {
        const countB = room.members.filter(m => m.teamId === teamBId && m.id !== memberBId).length + 1
        if (countB > config.teamCapacity) return { success: false, msg: `第 ${teamBId} 队人数已满（上限 ${config.teamCapacity} 人）` }
      }
      if (teamAId !== null && teamAId !== 'spectator') {
        const countA = room.members.filter(m => m.teamId === teamAId && m.id !== memberAId).length + 1
        if (countA > config.teamCapacity) return { success: false, msg: `第 ${teamAId} 队人数已满（上限 ${config.teamCapacity} 人）` }
      }
    }

    memberA.teamId = teamBId
    memberB.teamId = teamAId
    return { success: true }
  },

  randomAssignTeams(roomId) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    if (room.members.length === 0) return { success: false, msg: '当前房间内没有成员，请先添加成员' }
    if (room.map === 'random' && !room.activeMap) room.activeMap = MAPS[Math.floor(Math.random() * MAPS.length)]
    const activeModeKey = room.activeMode || room.mode || 'cashout'
    const config = MODES[activeModeKey] || MODES.cashout
    const T = config.teamsCount; const C = config.teamCapacity; const maxPlaying = T * C; const N = room.members.length
    const list = [...room.members]
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[list[i], list[j]] = [list[j], list[i]] }
    room.members.forEach(m => m.teamId = null)
    if (N > maxPlaying) {
      list.forEach((item, index) => {
        const m = room.members.find(o => o.id === item.id)
        if (m) { if (index < maxPlaying) { m.teamId = Math.floor(index / C) + 1 } else { m.teamId = 'spectator' } }
      })
    } else {
      list.forEach((item, index) => { const m = room.members.find(o => o.id === item.id); if (m) m.teamId = (index % T) + 1 })
    }
    return { success: true, activeMode: room.activeMode, activeMap: room.activeMap }
  },

  resetTeams(roomId) {
    const room = this.getRoom(roomId)
    if (!room) return false
    room.members.forEach(m => { m.teamId = null })
    return true
  },

  swapSlots(roomId, fromIdx, toIdx) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    if (!room.slots) return { success: false, msg: '未初始化槽位' }
    const temp = room.slots[fromIdx]; room.slots[fromIdx] = room.slots[toIdx]; room.slots[toIdx] = temp
    room.matches.forEach(m => {
      m.status = 'pending'; m.cashouts = {}
      if (m.promoted) m.promoted = []; if (m.rankings) m.rankings = []
      m.scoreA = null; m.scoreB = null; m.killsA = null; m.killsB = null; m.winnerId = null
    })
    syncCashoutTournamentMatches(room)
    return { success: true }
  },

  randomizeSlots(roomId) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    if (!room.slots) return { success: false, msg: '未初始化槽位' }
    for (let i = room.slots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[room.slots[i], room.slots[j]] = [room.slots[j], room.slots[i]] }
    room.matches.forEach(m => {
      m.status = 'pending'; m.cashouts = {}
      if (m.promoted) m.promoted = []; if (m.rankings) m.rankings = []
      m.scoreA = null; m.scoreB = null; m.killsA = null; m.killsB = null; m.winnerId = null
    })
    syncCashoutTournamentMatches(room)
    return { success: true }
  },

  resetTournamentArrangement(roomId) {
    const room = this.getRoom(roomId)
    if (!room || room.type !== 'tournament') return { success: false, msg: '赛事房间未找到' }
    room.slots = room.teams.map(team => team.id)
    room.matches = generateTournamentSchedule(room.tournamentType || 'cashout', room.teamCount, room.teams)
    syncCashoutTournamentMatches(room)
    return { success: true }
  },

  updateCashoutMatchScore(roomId, matchId, cashouts) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    const match = room.matches.find(m => m.id === matchId)
    if (!match) return { success: false, msg: '场次未找到' }
    if ((match.teams || []).some(t => !t)) {
      return { success: false, msg: '对局包含待定战队，无法录入比分' }
    }
    match.cashouts = cashouts || {}; match.status = 'completed'
    const validTeams = (match.teams || []).filter(t => Boolean(t))
    const sorted = [...validTeams].sort((a, b) => {
      const cashA = parseInt((cashouts && cashouts[a]) || 0) || 0
      const cashB = parseInt((cashouts && cashouts[b]) || 0) || 0
      return cashB - cashA
    })
    if (match.stage === 'grand_final' || match.stage === '3rd_place') {
      match.rankings = sorted
    } else {
      match.promoted = [sorted[0] || null, sorted[1] || null]
    }
    syncCashoutTournamentMatches(room)
    return { success: true }
  },

  resetCashoutMatchScore(roomId, matchId) {
    const room = this.getRoom(roomId)
    if (!room) return { success: false, msg: '房间未找到' }
    const match = room.matches.find(m => m.id === matchId)
    if (!match) return { success: false, msg: '场次未找到' }
    match.status = 'pending'; match.cashouts = {}
    if (match.promoted) match.promoted = []; if (match.rankings) match.rankings = []
    syncCashoutTournamentMatches(room)
    return { success: true }
  },

  syncCashoutMatchesLocal(room) { syncCashoutTournamentMatches(room) }
}
