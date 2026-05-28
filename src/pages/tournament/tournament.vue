<template>
  <div class="container">
    <!-- HUD Header -->
    <div class="hud-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">← 大厅</button>
        <div class="room-title-block">
          <span class="room-title-text">{{ room.name || '赛事详情' }}</span>
          <span class="badge-cashout-hud">{{ tournamentTypeLabel }}</span>
        </div>
      </div>
      <div class="header-right">
        <div class="map-hud-info">
          <span class="map-label">MAP</span>
          <span class="map-name-val">{{ activeMapDisplay }}</span>
        </div>
        <button class="gear-btn" :class="{ 'active': isControlPanelVisible }" @click="toggleControlPanel">⚙️ 控制面板</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-bar" v-if="tabs.length > 1">
      <div
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab-item"
        :class="{ 'active': currentTab === index }"
        @click="switchTab(index)"
      >{{ tab }}</div>
    </div>

    <!-- Main content area -->
    <div class="tab-content-wrapper">

      <!-- TAB 0: 晋级大厅 / 积分榜 -->
      <div class="tab-content" v-if="currentTab === 0">

        <!-- 💰 提现锦标赛 -->
        <div class="flowchart-section glass-panel" v-if="room.tournamentType === 'cashout'">
          <div class="screenshot-bar" v-if="!isScreenshotViewActive">
            <span class="screenshot-tip">📸 全景截图模式便于分享</span>
            <button class="btn-screenshot" @click="toggleScreenshotView">
              🎯 全图模式
            </button>
          </div>
          <button v-else class="btn-screenshot floating-exit-btn" @click="toggleScreenshotView">
            ✕ 退出全图
          </button>
          <div ref="flowchartScrollRef" class="flowchart-scroll" :class="{ 'screenshot-active': isScreenshotViewActive }">
            <div class="flowchart-canvas" :class="{ 'screenshot-mode': isScreenshotViewActive }" :style="[{ height: (room.teamCount === 6 || room.teamCount === 8) ? '1480px' : '1100px' }, scaleStyle]">
              <!-- SVG 连线 -->
              <svg class="connections-svg" 
                :viewBox="(room.teamCount === 6 || room.teamCount === 8) ? '0 0 1200 1480' : '0 0 1200 1100'" 
                xmlns="http://www.w3.org/2000/svg" 
                :style="{ position: 'absolute', top: 0, left: 0, width: '1200px', height: (room.teamCount === 6 || room.teamCount === 8) ? '1480px' : '1100px', pointerEvents: 'none', zIndex: 1 }"
              >
                <!-- 6 / 8 teams: 3-Stage connections -->
                <template v-if="room.teamCount === 6 || room.teamCount === 8">
                  <!-- From Semifinal A (X=300, Y=800) to semifinal_4 bottom (X=600, Y=580) -->
                  <path d="M 300 800 L 300 680 L 600 680 L 600 580" class="connection-path" :class="{ 'active': getMatch('semifinal_a')?.status === 'completed' }" />
                  <!-- From Semifinal B (X=900, Y=800) to semifinal_4 bottom (X=600, Y=580) -->
                  <path d="M 900 800 L 900 680 L 600 680 L 600 580" class="connection-path" :class="{ 'active': getMatch('semifinal_b')?.status === 'completed' }" />
                  <!-- From semifinal_4 top (X=600, Y=380) to Grand Final bottom (X=300, Y=300) -->
                  <path d="M 600 380 L 600 340 L 300 340 L 300 300" class="connection-path" :class="{ 'active': getMatch('semifinal_4')?.status === 'completed' }" />
                  <!-- From semifinal_4 top (X=600, Y=380) to 3rd-Place Final bottom (X=900, Y=300) -->
                  <path d="M 600 380 L 600 340 L 900 340 L 900 300" class="connection-path" :class="{ 'active': getMatch('semifinal_4')?.status === 'completed' }" />
                </template>
                
                <!-- 4 teams: 2-Stage connections -->
                <template v-if="room.teamCount === 4">
                  <path d="M 300 800 L 300 550 L 300 420" class="connection-path" :class="{ 'active': getMatch('semifinal_4')?.status === 'completed' }" />
                  <path d="M 900 800 L 900 550 L 900 420" class="connection-path" :class="{ 'active': getMatch('semifinal_4')?.status === 'completed' }" />
                  <path d="M 300 300 L 300 360 L 200 360 L 200 200" class="connection-path" :class="{ 'active': getMatch('final_grand')?.status === 'completed' }" />
                  <path d="M 300 300 L 300 360 L 200 360 L 200 120" class="connection-path" :class="{ 'active': getMatch('final_grand')?.status === 'completed' }" />
                  <path d="M 900 300 L 900 360 L 1000 360 L 1000 200" class="connection-path" :class="{ 'active': getMatch('final_3rd')?.status === 'completed' }" />
                  <path d="M 900 300 L 900 360 L 1000 360 L 1000 120" class="connection-path" :class="{ 'active': getMatch('final_3rd')?.status === 'completed' }" />
                </template>
              </svg>

              <!-- Tier 1: Grand Final + 季军赛 (4 teams) -->
              <div v-if="room.teamCount === 4" class="flowchart-tier tier-final" style="gap: 40px;">
                <div class="match-node-wrap" style="flex-direction:column;align-items:center;">
                  <div class="tier-label glow-gold">🏆 冠亚决赛</div>
                  <div class="cashout-match-node final-match-node" style="width:300px;" :class="{ 'node-completed': getMatch('final_grand')?.status === 'completed' }" @click="openCashoutScoreModal(getMatch('final_grand'))">
                    <div class="node-header">
                      <span class="node-title finals-text-glow">冠亚决赛</span>
                      <span class="node-status-badge" :class="{ 'completed': getMatch('final_grand')?.status === 'completed' }">{{ getMatch('final_grand')?.status === 'completed' ? '已完赛 🏁' : '进行中 ⚔️' }}</span>
                    </div>
                    <div class="node-teams-list">
                      <div v-for="(teamId, idx) in getMatch('final_grand')?.teams || [null,null]" :key="idx" class="node-team-row" :class="{ 'tbd-row': !teamId, 'rank-1': getMatch('final_grand')?.status==='completed'&&getMatch('final_grand')?.rankings[0]===teamId }">
                        <template v-if="teamId"><div class="team-color-dot" :style="{ backgroundColor: getTeamById(teamId)?.color }"></div><span class="team-logo-badge" :style="{ borderColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span><span class="team-name-text">{{ getTeamById(teamId)?.name }}</span><span class="team-cashout-amount">${{ formatCashout(getMatch('final_grand')?.cashouts[teamId]) }}</span><span class="rank-badge" v-if="getMatch('final_grand')?.status==='completed'">{{ getRankTrophy(getMatch('final_grand'), teamId) }}</span></template>
                        <template v-else><span class="tbd-text">待定 (TBD)</span></template>
                      </div>
                    </div>
                    <div class="tap-overlay"><span class="tap-text">📝 点击录入局分</span></div>
                  </div>
                </div>
                <div class="match-node-wrap" style="flex-direction:column;align-items:center;">
                  <div class="tier-label" style="color:#a855f7;">🥉 季军决赛</div>
                  <div class="cashout-match-node" style="width:300px;border-color:rgba(168,85,247,0.4);" :class="{ 'node-completed': getMatch('final_3rd')?.status === 'completed' }" @click="openCashoutScoreModal(getMatch('final_3rd'))">
                    <div class="node-header">
                      <span class="node-title" style="color:#a855f7;">季军决赛</span>
                      <span class="node-status-badge" :class="{ 'completed': getMatch('final_3rd')?.status === 'completed' }">{{ getMatch('final_3rd')?.status === 'completed' ? '已完赛 🏁' : '进行中 ⚔️' }}</span>
                    </div>
                    <div class="node-teams-list">
                      <div v-for="(teamId, idx) in getMatch('final_3rd')?.teams || [null,null]" :key="idx" class="node-team-row" :class="{ 'tbd-row': !teamId, 'rank-1': getMatch('final_3rd')?.status==='completed'&&getMatch('final_3rd')?.rankings[0]===teamId }">
                        <template v-if="teamId"><div class="team-color-dot" :style="{ backgroundColor: getTeamById(teamId)?.color }"></div><span class="team-logo-badge" :style="{ borderColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span><span class="team-name-text">{{ getTeamById(teamId)?.name }}</span><span class="team-cashout-amount">${{ formatCashout(getMatch('final_3rd')?.cashouts[teamId]) }}</span><span class="rank-badge" v-if="getMatch('final_3rd')?.status==='completed'">{{ getRankTrophy(getMatch('final_3rd'), teamId) }}</span></template>
                        <template v-else><span class="tbd-text">待定 (TBD)</span></template>
                      </div>
                    </div>
                    <div class="tap-overlay"><span class="tap-text">📝 点击录入局分</span></div>
                  </div>
                </div>
              </div>

              <!-- Tier 1: Grand Final + 季军赛 (5+ teams) -->
              <div v-else class="flowchart-tier tier-final" style="flex-direction: row; gap: 40px;">
                <div class="match-node-wrap" style="flex-direction:column;align-items:center;">
                  <div class="tier-label glow-gold">🏆 冠亚决赛</div>
                  <div class="cashout-match-node final-match-node" style="width:300px;" :class="{ 'node-completed': getMatch('final_grand')?.status === 'completed' }" @click="openCashoutScoreModal(getMatch('final_grand'))">
                    <div class="node-header">
                      <span class="node-title finals-text-glow">冠亚决赛</span>
                      <span class="node-status-badge" :class="{ 'completed': getMatch('final_grand')?.status === 'completed' }">{{ getMatch('final_grand')?.status === 'completed' ? '已完赛 🏁' : '进行中 ⚔️' }}</span>
                    </div>
                    <div class="node-teams-list">
                      <div v-for="(teamId, idx) in getMatch('final_grand')?.teams || [null,null]" :key="idx" class="node-team-row" :class="{ 'tbd-row': !teamId, 'rank-1': getMatch('final_grand')?.status==='completed'&&getMatch('final_grand')?.rankings[0]===teamId }">
                        <template v-if="teamId"><div class="team-color-dot" :style="{ backgroundColor: getTeamById(teamId)?.color }"></div><span class="team-logo-badge" :style="{ borderColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span><span class="team-name-text">{{ getTeamById(teamId)?.name }}</span><span class="team-cashout-amount">${{ formatCashout(getMatch('final_grand')?.cashouts[teamId]) }}</span><span class="rank-badge" v-if="getMatch('final_grand')?.status==='completed'">{{ getRankTrophy(getMatch('final_grand'), teamId) }}</span></template>
                        <template v-else><span class="tbd-text">待定 (TBD)</span></template>
                      </div>
                    </div>
                    <div class="tap-overlay"><span class="tap-text">📝 点击录入局分</span></div>
                  </div>
                </div>
                <div v-if="room.teamCount >= 6" class="match-node-wrap" style="flex-direction:column;align-items:center;">
                  <div class="tier-label" style="color:#a855f7;">🥉 季军决赛</div>
                  <div class="cashout-match-node" style="width:300px;border-color:rgba(168,85,247,0.4);" :class="{ 'node-completed': getMatch('final_3rd')?.status === 'completed' }" @click="openCashoutScoreModal(getMatch('final_3rd'))">
                    <div class="node-header">
                      <span class="node-title" style="color:#a855f7;">季军决赛</span>
                      <span class="node-status-badge" :class="{ 'completed': getMatch('final_3rd')?.status === 'completed' }">{{ getMatch('final_3rd')?.status === 'completed' ? '已完赛 🏁' : '进行中 ⚔️' }}</span>
                    </div>
                    <div class="node-teams-list">
                      <div v-for="(teamId, idx) in getMatch('final_3rd')?.teams || [null,null]" :key="idx" class="node-team-row" :class="{ 'tbd-row': !teamId, 'rank-1': getMatch('final_3rd')?.status==='completed'&&getMatch('final_3rd')?.rankings[0]===teamId }">
                        <template v-if="teamId"><div class="team-color-dot" :style="{ backgroundColor: getTeamById(teamId)?.color }"></div><span class="team-logo-badge" :style="{ borderColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span><span class="team-name-text">{{ getTeamById(teamId)?.name }}</span><span class="team-cashout-amount">${{ formatCashout(getMatch('final_3rd')?.cashouts[teamId]) }}</span><span class="rank-badge" v-if="getMatch('final_3rd')?.status==='completed'">{{ getRankTrophy(getMatch('final_3rd'), teamId) }}</span></template>
                        <template v-else><span class="tbd-text">待定 (TBD)</span></template>
                      </div>
                    </div>
                    <div class="tap-overlay"><span class="tap-text">📝 点击录入局分</span></div>
                  </div>
                </div>
                <div v-else class="match-node-wrap" style="flex-direction:column;align-items:center;">
                  <div class="cashout-match-node final-match-node" style="width:420px;" :class="{ 'node-completed': getMatch('final_grand')?.status === 'completed' }" @click="openCashoutScoreModal(getMatch('final_grand'))">
                    <div class="node-header">
                      <span class="node-title finals-text-glow">GRAND FINAL 决战局</span>
                      <span class="node-status-badge" :class="{ 'completed': getMatch('final_grand')?.status === 'completed' }">{{ getMatch('final_grand')?.status === 'completed' ? '已完赛 🏁' : '进行中 ⚔️' }}</span>
                    </div>
                    <div class="node-teams-list">
                      <div v-for="(teamId, idx) in getMatch('final_grand')?.teams || [null,null,null,null]" :key="idx" class="node-team-row" :class="{ 'tbd-row': !teamId, 'rank-1': getMatch('final_grand')?.status==='completed'&&getMatch('final_grand')?.rankings[0]===teamId, 'rank-2': getMatch('final_grand')?.status==='completed'&&getMatch('final_grand')?.rankings[1]===teamId, 'rank-3': getMatch('final_grand')?.status==='completed'&&getMatch('final_grand')?.rankings[2]===teamId }">
                        <template v-if="teamId"><div class="team-color-dot" :style="{ backgroundColor: getTeamById(teamId)?.color }"></div><span class="team-logo-badge" :style="{ borderColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span><span class="team-name-text">{{ getTeamById(teamId)?.name }}</span><span class="team-cashout-amount">${{ formatCashout(getMatch('final_grand')?.cashouts[teamId]) }}</span><span class="rank-badge" v-if="getMatch('final_grand')?.status==='completed'">{{ getRankTrophy(getMatch('final_grand'), teamId) }}</span></template>
                        <template v-else><span class="tbd-text">待定晋级席位 (TBD)</span></template>
                      </div>
                    </div>
                    <div class="tap-overlay"><span class="tap-text">📝 点击录入局分</span></div>
                  </div>
                </div>
              </div>

              <!-- Tier 2: 4强半决赛 / 4强对决 -->
              <div class="flowchart-tier tier-semis">
                <!-- 4 teams / 6 teams / 8 teams: show semifinal_4 node -->
                <div v-if="room.teamCount === 4 || room.teamCount === 6 || room.teamCount === 8" class="semis-col" style="width:600px;">
                  <div class="tier-label glow-red">⚡ 4强对决 (4队同场, Top 2 晋级)</div>
                  <div class="cashout-match-node" style="width:460px;" :class="{ 'node-completed': getMatch('semifinal_4')?.status === 'completed' }" @click="handleMatchClick(getMatch('semifinal_4'))">
                    <div class="node-header">
                       <span class="node-title">{{ room.teamCount === 4 ? '半决赛 (Top 2 进冠亚, Bottom 2 进季军)' : '4强半决赛 (Top 2 进冠亚, Bottom 2 进季军)' }}</span>
                      <span class="node-status-badge" :class="{ 'completed': getMatch('semifinal_4')?.status === 'completed' }">{{ getMatch('semifinal_4')?.status === 'completed' ? '已完赛 🏁' : '未开赛 ⚔️' }}</span>
                    </div>
                    <div class="node-teams-list">
                      <div v-for="(teamId, idx) in getMatch('semifinal_4')?.teams || [null, null, null, null]" :key="idx" class="node-team-row" :class="{ 'tbd-row': !teamId, 'promoted-row': getMatch('semifinal_4')?.status==='completed'&&getMatch('semifinal_4')?.promoted.includes(teamId), 'eliminated-row': getMatch('semifinal_4')?.status==='completed'&&!getMatch('semifinal_4')?.promoted.includes(teamId), 'slot-placeable-row': selectedSlotIdx !== -1 }" @click.stop="handleMatchTeamClick('semifinal_4', idx)">
                        <span class="seat-badge-small badge-group-semis">席位 {{ idx + 1 }}</span>
                        <template v-if="teamId">
                          <div class="team-color-dot" :style="{ backgroundColor: getTeamById(teamId)?.color }"></div>
                          <span class="team-logo-badge" :style="{ borderColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span>
                          <span class="team-name-text">{{ getTeamById(teamId)?.name }}</span>
                          <span class="team-cashout-amount">${{ formatCashout(getMatch('semifinal_4')?.cashouts[teamId]) }}</span>
                          <span class="status-icon" v-if="getMatch('semifinal_4')?.status==='completed'">{{ getMatch('semifinal_4')?.promoted.includes(teamId) ? '晋级 🚀' : '淘汰' }}</span>
                        </template>
                        <template v-else>
                          <span class="tbd-text">待定晋级席位 (TBD)</span>
                        </template>
                      </div>
                    </div>
                    <div class="tap-overlay"><span class="tap-text">📝 点击录入局分</span></div>
                  </div>
                </div>
              </div>

              <!-- Tier 3: 分组半决赛 (6/8队专属) -->
              <div v-if="room.teamCount === 6 || room.teamCount === 8" class="flowchart-tier tier-groups">
                <div class="semis-col">
                  <div class="tier-label glow-red">⚡ 半决赛 A组 (Top 2 晋级)</div>
                  <div class="cashout-match-node" :class="{ 'node-completed': getMatch('semifinal_a')?.status === 'completed' }" @click="handleMatchClick(getMatch('semifinal_a'))">
                    <div class="node-header">
                      <span class="node-title">{{ getMatch('semifinal_a')?.teams?.length }}队对决 (Top 2 晋级)</span>
                      <span class="node-status-badge" :class="{ 'completed': getMatch('semifinal_a')?.status === 'completed' }">{{ getMatch('semifinal_a')?.status === 'completed' ? '已完赛 🏁' : '未开赛 ⚔️' }}</span>
                    </div>
                    <div class="node-teams-list">
                      <div v-for="(teamId, idx) in getMatch('semifinal_a')?.teams || []" :key="idx" class="node-team-row" :class="{ 'promoted-row': getMatch('semifinal_a')?.status==='completed'&&getMatch('semifinal_a')?.promoted.includes(teamId), 'eliminated-row': getMatch('semifinal_a')?.status==='completed'&&!getMatch('semifinal_a')?.promoted.includes(teamId), 'slot-placeable-row': selectedSlotIdx !== -1 }" @click.stop="handleMatchTeamClick('semifinal_a', idx)">
                        <span class="seat-badge-small badge-group-a">席位 A{{ idx + 1 }}</span>
                        <div class="team-color-dot" :style="{ backgroundColor: getTeamById(teamId)?.color }"></div>
                        <span class="team-logo-badge" :style="{ borderColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span>
                        <span class="team-name-text">{{ getTeamById(teamId)?.name }}</span>
                        <span class="team-cashout-amount">${{ formatCashout(getMatch('semifinal_a')?.cashouts[teamId]) }}</span>
                        <span class="status-icon" v-if="getMatch('semifinal_a')?.status==='completed'">{{ getMatch('semifinal_a')?.promoted.includes(teamId) ? '晋级 🚀' : '淘汰' }}</span>
                      </div>
                    </div>
                    <div class="tap-overlay"><span class="tap-text">📝 点击录入局分</span></div>
                  </div>
                </div>
                <div class="semis-col">
                  <div class="tier-label glow-blue">⚡ 半决赛 B组 (Top 2 晋级)</div>
                  <div class="cashout-match-node" :class="{ 'node-completed': getMatch('semifinal_b')?.status === 'completed' }" @click="handleMatchClick(getMatch('semifinal_b'))">
                    <div class="node-header">
                      <span class="node-title">{{ getMatch('semifinal_b')?.teams?.length }}队对决 (Top 2 晋级)</span>
                      <span class="node-status-badge" :class="{ 'completed': getMatch('semifinal_b')?.status === 'completed' }">{{ getMatch('semifinal_b')?.status === 'completed' ? '已完赛 🏁' : '未开赛 ⚔️' }}</span>
                    </div>
                    <div class="node-teams-list">
                      <div v-for="(teamId, idx) in getMatch('semifinal_b')?.teams || []" :key="idx" class="node-team-row" :class="{ 'promoted-row': getMatch('semifinal_b')?.status==='completed'&&getMatch('semifinal_b')?.promoted.includes(teamId), 'eliminated-row': getMatch('semifinal_b')?.status==='completed'&&!getMatch('semifinal_b')?.promoted.includes(teamId), 'slot-placeable-row': selectedSlotIdx !== -1 }" @click.stop="handleMatchTeamClick('semifinal_b', idx)">
                        <span class="seat-badge-small badge-group-b">席位 B{{ idx + 1 }}</span>
                        <div class="team-color-dot" :style="{ backgroundColor: getTeamById(teamId)?.color }"></div>
                        <span class="team-logo-badge" :style="{ borderColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span>
                        <span class="team-name-text">{{ getTeamById(teamId)?.name }}</span>
                        <span class="team-cashout-amount">${{ formatCashout(getMatch('semifinal_b')?.cashouts[teamId]) }}</span>
                        <span class="status-icon" v-if="getMatch('semifinal_b')?.status==='completed'">{{ getMatch('semifinal_b')?.promoted.includes(teamId) ? '晋级 🚀' : '淘汰' }}</span>
                      </div>
                    </div>
                    <div class="tap-overlay"><span class="tap-text">📝 点击录入局分</span></div>
                  </div>
                </div>
              </div>

              <!-- Tier 4: 参赛战队槽位 -->
              <div class="flowchart-tier tier-slots" :style="{ top: (room.teamCount === 6 || room.teamCount === 8) ? '1140px' : '780px' }">
                <div class="tier-label">🛡️ 参赛战队 (点击或拖拽互换分组位置)</div>
                <div class="slots-grid">
                  <div v-for="(teamId, idx) in room.slots || []" :key="idx" class="team-slot-wrapper">
                    <div class="team-slot-card"
                      :class="{ 'selected-slot': selectedSlotIdx === idx, 'in-group-a': isSlotInGroupA(idx), 'in-group-b': isSlotInGroupB(idx), 'in-bye': isSlotInBye(idx) }"
                      :style="{ borderTopColor: getTeamById(teamId)?.color }"
                      draggable="true"
                      @dragstart="onDragStart($event, idx)"
                      @dragover.prevent
                      @drop="onDrop($event, idx)"
                      @dragend="draggedSlotIdx = null"
                      @click="onSlotTap(idx)"
                    >
                      <div class="slot-badge" :class="{ 'badge-a': isSlotInGroupA(idx), 'badge-b': isSlotInGroupB(idx), 'badge-bye': isSlotInBye(idx) }">{{ getSlotGroupLabel(idx) }}</div>
                      <div class="slot-team-header">
                        <span class="team-logo-badge" :style="{ backgroundColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span>
                        <span class="slot-team-name">{{ getTeamById(teamId)?.name }}</span>
                      </div>
                      <div class="slot-team-members">
                        <div v-for="(member, mIdx) in getTeamById(teamId)?.members || []" :key="mIdx" class="slot-member-pill">{{ member }}</div>
                        <span class="no-members-tip" v-if="!getTeamById(teamId)?.members || getTeamById(teamId)?.members.length === 0">无人员</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ⚔️ 单败淘汰赛 -->
        <div class="flowchart-section glass-panel" v-else-if="room.tournamentType === 'single_elimination'">
          <div class="se-layout">
            <!-- Grand Final + 3rd Place -->
            <div class="se-finals-row">
              <div class="se-match-col">
                <div class="tier-label finals-text-glow">🏆 冠亚军总决赛</div>
                <div v-if="gfMatch" class="cashout-match-node final-match-node" :class="{ 'node-completed': gfMatch.status === 'completed' }" @click="openScoreModal(gfMatch)">
                  <div class="node-header"><span class="node-title finals-text-glow">GRAND FINAL</span><span class="node-status-badge" :class="{ 'completed': gfMatch.status === 'completed' }">{{ gfMatch.status === 'completed' ? '已完赛 🏁' : '决胜中 ⚔️' }}</span></div>
                  <div class="node-teams-list">
                    <div class="node-team-row" :class="{ 'winner-row': gfMatch.status === 'completed' && gfMatch.winnerId === gfMatch.teamA, 'eliminated-row': gfMatch.status === 'completed' && gfMatch.winnerId !== gfMatch.teamA }">
                      <div class="team-color-dot" :style="{ backgroundColor: getTeamById(gfMatch.teamA)?.color || '#ff2e93' }"></div>
                      <span class="team-name-text">{{ getTeamName(gfMatch.teamA) }}</span>
                      <span class="team-cashout-amount">{{ gfMatch.scoreA !== null ? gfMatch.scoreA : '-' }}</span>
                    </div>
                    <div class="node-team-row" :class="{ 'winner-row': gfMatch.status === 'completed' && gfMatch.winnerId === gfMatch.teamB, 'eliminated-row': gfMatch.status === 'completed' && gfMatch.winnerId !== gfMatch.teamB }">
                      <div class="team-color-dot" :style="{ backgroundColor: getTeamById(gfMatch.teamB)?.color || '#ff2e93' }"></div>
                      <span class="team-name-text">{{ getTeamName(gfMatch.teamB) }}</span>
                      <span class="team-cashout-amount">{{ gfMatch.scoreB !== null ? gfMatch.scoreB : '-' }}</span>
                    </div>
                  </div>
                  <div class="tap-overlay"><span class="tap-text">📝 录入总冠军成绩</span></div>
                </div>
              </div>
              <div class="se-match-col" v-if="m3rdMatch">
                <div class="tier-label" style="color:#a855f7;">🥉 季军争夺战</div>
                <div class="cashout-match-node final-match-node" style="border-color:rgba(168,85,247,0.45);" :class="{ 'node-completed': m3rdMatch.status === 'completed' }" @click="openScoreModal(m3rdMatch)">
                  <div class="node-header"><span class="node-title" style="color:#a855f7;">季军争夺战</span><span class="node-status-badge" :class="{ 'completed': m3rdMatch.status === 'completed' }">{{ m3rdMatch.status === 'completed' ? '已完赛 🏁' : '决胜中 ⚔️' }}</span></div>
                  <div class="node-teams-list">
                    <div class="node-team-row" :class="{ 'winner-row': m3rdMatch.status === 'completed' && m3rdMatch.winnerId === m3rdMatch.teamA, 'eliminated-row': m3rdMatch.status === 'completed' && m3rdMatch.winnerId !== m3rdMatch.teamA }">
                      <div class="team-color-dot" :style="{ backgroundColor: getTeamById(m3rdMatch.teamA)?.color || '#a855f7' }"></div>
                      <span class="team-name-text">{{ getTeamName(m3rdMatch.teamA) }}</span>
                      <span class="team-cashout-amount" style="color:#a855f7;">{{ m3rdMatch.scoreA !== null ? m3rdMatch.scoreA : '-' }}</span>
                    </div>
                    <div class="node-team-row" :class="{ 'winner-row': m3rdMatch.status === 'completed' && m3rdMatch.winnerId === m3rdMatch.teamB, 'eliminated-row': m3rdMatch.status === 'completed' && m3rdMatch.winnerId !== m3rdMatch.teamB }">
                      <div class="team-color-dot" :style="{ backgroundColor: getTeamById(m3rdMatch.teamB)?.color || '#a855f7' }"></div>
                      <span class="team-name-text">{{ getTeamName(m3rdMatch.teamB) }}</span>
                      <span class="team-cashout-amount" style="color:#a855f7;">{{ m3rdMatch.scoreB !== null ? m3rdMatch.scoreB : '-' }}</span>
                    </div>
                  </div>
                  <div class="tap-overlay"><span class="tap-text">📝 录入季军成绩</span></div>
                </div>
              </div>
            </div>
            <!-- 半决赛 + 首轮 -->
            <div class="se-brackets">
              <div class="se-round-label">半决赛</div>
              <div class="se-matches-row">
                <div v-for="m in sfMatches" :key="m.id" class="cashout-match-node" :class="{ 'node-completed': m.status === 'completed' }" @click="openScoreModal(m)">
                  <div class="node-header"><span class="node-title">{{ m.label || '半决赛' }}</span><span class="node-status-badge" :class="{ 'completed': m.status === 'completed' }">{{ m.status === 'completed' ? '已完赛 🏁' : '未开赛 ⚔️' }}</span></div>
                  <div class="node-teams-list">
                    <div class="node-team-row" :class="{ 'winner-row': m.status === 'completed' && m.winnerId === m.teamA, 'eliminated-row': m.status === 'completed' && m.winnerId !== m.teamA }">
                      <div class="team-color-dot" :style="{ backgroundColor: getTeamById(m.teamA)?.color || '#6b7280' }"></div>
                      <span class="team-name-text">{{ getTeamName(m.teamA) }}</span>
                      <span class="team-cashout-amount">{{ m.scoreA !== null ? m.scoreA : '-' }}</span>
                    </div>
                    <div class="node-team-row" :class="{ 'winner-row': m.status === 'completed' && m.winnerId === m.teamB, 'eliminated-row': m.status === 'completed' && m.winnerId !== m.teamB }">
                      <div class="team-color-dot" :style="{ backgroundColor: getTeamById(m.teamB)?.color || '#6b7280' }"></div>
                      <span class="team-name-text">{{ getTeamName(m.teamB) }}</span>
                      <span class="team-cashout-amount">{{ m.scoreB !== null ? m.scoreB : '-' }}</span>
                    </div>
                  </div>
                  <div class="tap-overlay"><span class="tap-text">📝 录入局分</span></div>
                </div>
              </div>
              <div v-if="room.teamCount > 4">
                <div class="se-round-label">首轮</div>
                <div class="se-matches-row">
                  <div v-for="m in qfMatches" :key="m.id" class="cashout-match-node" style="min-width:200px;" :class="{ 'node-completed': m.status === 'completed' }" @click="openScoreModal(m)">
                    <div class="node-header"><span class="node-title" style="font-size:11px;">{{ m.label?.replace('四分之一决赛','首轮') }}</span></div>
                    <div class="node-teams-list">
                      <div class="node-team-row" :class="{ 'winner-row': m.status === 'completed' && m.winnerId === m.teamA, 'eliminated-row': m.status === 'completed' && m.winnerId !== m.teamA }">
                        <div class="team-color-dot" :style="{ backgroundColor: getTeamById(m.teamA)?.color || '#ffcc00' }"></div>
                        <span class="team-name-text" style="font-size:11px;">{{ getTeamName(m.teamA) }}</span>
                        <span class="team-cashout-amount" style="font-size:11px;">{{ m.scoreA !== null ? m.scoreA : '-' }}</span>
                      </div>
                      <div class="node-team-row" :class="{ 'winner-row': m.status === 'completed' && m.winnerId === m.teamB, 'eliminated-row': m.status === 'completed' && m.winnerId !== m.teamB }">
                        <div class="team-color-dot" :style="{ backgroundColor: getTeamById(m.teamB)?.color || '#ffcc00' }"></div>
                        <span class="team-name-text" style="font-size:11px;">{{ getTeamName(m.teamB) }}</span>
                        <span class="team-cashout-amount" style="font-size:11px;">{{ m.scoreB !== null ? m.scoreB : '-' }}</span>
                      </div>
                    </div>
                    <div class="tap-overlay"><span class="tap-text">📝 比分</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 📊 循环联赛积分榜 -->
        <div class="flowchart-section glass-panel" v-else-if="room.tournamentType === 'round_robin'">
          <div class="standings-scroll">
            <div class="standings-section" v-if="room.teamCount !== 8">
              <div class="section-table-title">🏆 联赛积分榜 (单循环常规赛)</div>
              <div class="standings-table">
                <div class="table-tr table-thead">
                  <div class="table-th col-rank">排名</div>
                  <div class="table-th col-name">战队</div>
                  <div class="table-th col-num">胜</div>
                  <div class="table-th col-num">负</div>
                  <div class="table-th col-num">净胜</div>
                  <div class="table-th col-num">击杀</div>
                  <div class="table-th col-points">积分</div>
                </div>
                <div v-for="(row, idx) in leagueStandings" :key="row.id" class="table-tr" :class="{ 'top-tr': idx === 0, 'second-tr': idx === 1 }">
                  <div class="table-td col-rank">
                    <span class="rank-trophy" v-if="idx===0">🥇</span>
                    <span class="rank-trophy" v-else-if="idx===1">🥈</span>
                    <span class="rank-trophy" v-else-if="idx===2">🥉</span>
                    <span v-else>{{ idx + 1 }}</span>
                  </div>
                  <div class="table-td col-name">
                    <div class="team-color-dot" :style="{ backgroundColor: getTeamById(row.id)?.color }"></div>
                    <span class="team-name-text">{{ row.name }}</span>
                  </div>
                  <div class="table-td col-num">{{ row.wins }}</div>
                  <div class="table-td col-num">{{ row.losses }}</div>
                  <div class="table-td col-num">{{ row.netScore >= 0 ? '+' + row.netScore : row.netScore }}</div>
                  <div class="table-td col-num">{{ row.totalKills }}</div>
                  <div class="table-td col-points">{{ row.points }}</div>
                </div>
              </div>
            </div>
            <!-- 循环赛对阵列表 -->
            <div class="matches-list-section">
              <div class="section-table-title">📅 对阵列表</div>
              <div class="matches-list">
                <div v-for="m in sortedMatches" :key="m.id" class="match-list-row" :class="{ 'match-completed': m.status === 'completed' }" @click="openScoreModal(m)">
                  <div class="match-stage-badge">{{ getStageLabel(m) }}</div>
                  <div class="match-teams">
                    <span class="match-team-a">{{ getTeamName(m.teamA) }}</span>
                    <span class="match-vs">{{ m.status === 'completed' ? `${m.scoreA} : ${m.scoreB}` : 'VS' }}</span>
                    <span class="match-team-b">{{ getTeamName(m.teamB) }}</span>
                  </div>
                  <div class="match-winner" v-if="m.status === 'completed'">🏆 {{ getTeamName(m.winnerId) }}</div>
                  <div class="match-click-hint" v-else>点击录入</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 1: 战队管理 -->
      <div class="tab-content" v-if="currentTab === 1">
        <div class="teams-manager glass-panel">
          <div class="teams-manager-header">
            <span class="tm-title">🛡️ 战队席位管理</span>
            <span class="tm-tip">点击战队名称可编辑战队信息</span>
          </div>
          <div class="teams-manager-grid">
            <div v-for="team in room.teams" :key="team.id" class="team-edit-card glass-panel" @click="openEditTeamModal(team)">
              <div class="team-color-bar" :style="{ background: team.color || team.gradient || '#6b7280' }"></div>
              <div class="team-edit-info">
                <div class="team-edit-header">
                  <div class="team-color-dot" :style="{ backgroundColor: team.color }"></div>
                  <span class="team-edit-name">{{ team.name }}</span>
                  <span class="edit-icon">✏️</span>
                </div>
                <div class="team-members-chips">
                  <span v-for="(member, mIdx) in team.members || []" :key="mIdx" class="member-chip">{{ member }}</span>
                  <span v-if="!team.members || team.members.length === 0" class="no-members-hint">暂无人员 (点击编辑)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: 对阵列表 (单败淘汰/循环赛) -->
      <div class="tab-content" v-if="currentTab === 2">
        <div class="matches-list-panel glass-panel">
          <div class="matches-list-full">
            <div v-for="m in sortedMatches" :key="m.id" class="match-list-row-lg" :class="{ 'match-completed': m.status === 'completed' }" @click="openScoreModal(m)">
              <div class="match-stage-badge-lg">{{ getStageLabel(m) }}</div>
              <div class="match-teams-lg">
                <span class="match-team-a-lg">{{ getTeamName(m.teamA) }}</span>
                <div class="match-score-block">
                  <span class="match-score">{{ m.scoreA !== null ? m.scoreA : '?' }}</span>
                  <span class="match-vs-lg">:</span>
                  <span class="match-score">{{ m.scoreB !== null ? m.scoreB : '?' }}</span>
                </div>
                <span class="match-team-b-lg">{{ getTeamName(m.teamB) }}</span>
              </div>
              <div class="match-winner-lg" v-if="m.status === 'completed'">胜者：{{ getTeamName(m.winnerId) }} 🏆</div>
              <div class="match-map-lg" v-if="m.activeMap && m.activeMap !== '无'">🗺️ {{ m.activeMap }}</div>
              <div class="match-pending-lg" v-if="m.status !== 'completed'">📝 点击录入比分</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 控制面板 Drawer -->
    <div class="drawer-mask" v-if="isControlPanelVisible" @click="toggleControlPanel"></div>
    <div class="control-drawer" :class="{ 'drawer-visible': isControlPanelVisible }">
      <div class="drawer-header">
        <span class="drawer-title">⚙️ 赛事控制中心</span>
        <button class="drawer-close" @click="toggleControlPanel">✕</button>
      </div>
      <div class="drawer-body">
        <div class="drawer-section">
          <div class="ds-title">⚡ 快速操作</div>
          <button class="ds-btn btn-gold" @click="handleRandomizeSlots">🎲 随机分组洗牌</button>
          <button class="ds-btn btn-red" @click="handleResetAllMatches">🔄 重置全部局分</button>
          <span class="ds-tip">随机洗牌将清空所有比分和晋级数据；重置局分保留分组。</span>
        </div>
        <div class="drawer-section">
          <div class="ds-title">🗺️ 比赛地图</div>
          <div class="map-grid-hud">
            <div v-for="mapName in MAPS" :key="mapName" class="map-cap-hud" :class="{ 'active': room.map === mapName }" @click="changeMap(mapName)">{{ mapName }}</div>
            <div class="map-cap-hud random-map-hud" :class="{ 'active': room.map === 'random' }" @click="changeMap('random')">🎲 随机地图</div>
          </div>
        </div>
        <div class="drawer-section">
          <div class="ds-title">🛡️ 战队管理</div>
          <div v-for="team in room.teams" :key="team.id" class="team-manage-row" @click="openEditTeamModal(team)">
            <div class="team-color-dot" :style="{ backgroundColor: team.color }"></div>
            <span class="team-manage-name">{{ team.name }}</span>
            <span style="margin-left:auto;color:#ffcc00;">✏️</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 💰 提现录入弹窗 -->
    <div v-if="isCashoutScoreModalVisible" class="modal-mask" @click.self="closeCashoutScoreModal">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">录入对局金钱 & 判定晋级</span>
          <button class="modal-close" @click="closeCashoutScoreModal">✕</button>
        </div>
        <div class="modal-body" v-if="activeCashoutMatch">
          <p class="cashout-desc">输入各战队本局提现金额，系统自动降序排定晋级。</p>
          <div v-for="teamId in activeCashoutMatch.teams" :key="teamId" class="cashout-row">
            <div class="cashout-row-left">
              <div class="team-color-dot" :style="{ backgroundColor: getTeamById(teamId)?.color }"></div>
              <span class="team-logo-badge" :style="{ borderColor: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span>
              <span class="team-name-text">{{ getTeamById(teamId)?.name }}</span>
            </div>
            <div class="cashout-row-right">
              <span class="currency-tag">$</span>
              <input type="number" class="cashout-input-field" v-model="cashoutInputs[teamId]" placeholder="0" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-cancel" @click="closeCashoutScoreModal">取消</button>
          <button class="modal-btn-reset" v-if="activeCashoutMatch?.status === 'completed'" @click="resetMatchScore">重置成绩</button>
          <button class="modal-btn-confirm" @click="saveCashoutScore">保存结果</button>
        </div>
      </div>
    </div>

    <!-- 📊 比分录入弹窗 -->
    <div v-if="isScoreModalVisible" class="modal-mask" @click.self="closeScoreModal">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">录入比赛数据</span>
          <button class="modal-close" @click="closeScoreModal">✕</button>
        </div>
        <div class="modal-body" v-if="activeMatch">
          <div class="score-input-section">
            <div class="score-team-col">
              <span class="score-team-name">{{ getTeamName(activeMatch.teamA) }}</span>
              <label class="score-field-label">比分</label>
              <input type="number" class="score-field" v-model="inputScoreA" placeholder="0" min="0" />
              <label class="score-field-label">击杀/小分</label>
              <input type="number" class="score-field" v-model="inputKillsA" placeholder="0" min="0" />
            </div>
            <div class="score-vs">VS</div>
            <div class="score-team-col">
              <span class="score-team-name">{{ getTeamName(activeMatch.teamB) }}</span>
              <label class="score-field-label">比分</label>
              <input type="number" class="score-field" v-model="inputScoreB" placeholder="0" min="0" />
              <label class="score-field-label">击杀/小分</label>
              <input type="number" class="score-field" v-model="inputKillsB" placeholder="0" min="0" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">裁定胜者</label>
            <div class="winner-select-row">
              <div class="winner-opt" :class="{ 'active': inputWinnerId === activeMatch.teamA }" @click="inputWinnerId = activeMatch.teamA">{{ getTeamName(activeMatch.teamA) }} 🏆</div>
              <div class="winner-opt" :class="{ 'active': inputWinnerId === activeMatch.teamB }" @click="inputWinnerId = activeMatch.teamB">{{ getTeamName(activeMatch.teamB) }} 🏆</div>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">本局地图</label>
            <select class="map-select" v-model="inputMap">
              <option v-for="m in MAPS" :key="m" :value="m">{{ m }}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-cancel" @click="closeScoreModal">取消</button>
          <button class="modal-btn-confirm" @click="saveMatchDetails">录入比分</button>
        </div>
      </div>
    </div>

    <!-- 🛡️ 战队编辑弹窗 -->
    <div v-if="isEditTeamModalVisible" class="modal-mask" @click.self="closeEditTeamModal">
      <div class="modal-content">
        <div class="modal-header">
          <span class="modal-title">编辑战队信息</span>
          <button class="modal-close" @click="closeEditTeamModal">✕</button>
        </div>
        <div class="modal-body" v-if="activeTeam">
          <div class="form-group">
            <label class="form-label">战队名称</label>
            <input type="text" class="form-input" v-model="editTeamName" placeholder="如：THE ULTRA-RARES" />
          </div>
          <div class="form-group">
            <label class="form-label">战队成员名单（换行或逗号分隔）</label>
            <textarea class="form-textarea" v-model="editTeamMembersText" placeholder="每行一个成员名&#10;如：&#10;Miya&#10;Sola&#10;Luna" rows="6"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-cancel" @click="closeEditTeamModal">取消</button>
          <button class="modal-btn-confirm" @click="saveTeamDetails">保存信息</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { roomStore, MAPS, generateTournamentSchedule } from '../../store/roomStore.js'
import { useToast } from '../../composables/useToast.js'

export default {
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { showToast, showModal } = useToast()

    const roomId = ref('')
    const room = ref({ teams: [], matches: [], slots: [] })
    const isControlPanelVisible = ref(false)
    const currentTab = ref(0)
    const selectedSlotIdx = ref(-1)
    const isScoreModalVisible = ref(false)
    const activeMatch = ref(null)
    const inputScoreA = ref(0)
    const inputScoreB = ref(0)
    const inputKillsA = ref(0)
    const inputKillsB = ref(0)
    const inputWinnerId = ref('')
    const inputMap = ref('摩纳哥')
    const isCashoutScoreModalVisible = ref(false)
    const activeCashoutMatch = ref(null)
    const cashoutInputs = ref({})
    const isScreenshotViewActive = ref(false)
    const isEditTeamModalVisible = ref(false)
    const activeTeam = ref(null)
    const editTeamName = ref('')
    const editTeamMembersText = ref('')
    const draggedSlotIdx = ref(null)

    // Viewport Centering & Immersive Screenshot Scaling
    const flowchartScrollRef = ref(null)
    const containerWidth = ref(1200)
    const containerHeight = ref(1100)

    const updateContainerDimensions = () => {
      if (flowchartScrollRef.value) {
        containerWidth.value = flowchartScrollRef.value.clientWidth
        containerHeight.value = flowchartScrollRef.value.clientHeight
      }
    }

    const handleResize = () => {
      updateContainerDimensions()
    }

    watch(isScreenshotViewActive, async (newVal) => {
      if (newVal) {
        await nextTick()
        setTimeout(() => {
          updateContainerDimensions()
        }, 50)
      }
    })

    const scaleStyle = computed(() => {
      if (!isScreenshotViewActive.value) return {}
      const canvasWidth = 1200
      const canvasHeight = (room.value.teamCount === 6 || room.value.teamCount === 8) ? 1480 : 1100
      
      const pad = 24 // visual margin padding
      const maxW = containerWidth.value - pad
      const maxH = containerHeight.value - pad
      
      const scaleX = maxW / canvasWidth
      const scaleY = maxH / canvasHeight
      // Scale down exactly to fit within the viewport bounds; do not upscale past 1.5
      const scale = Math.min(scaleX, scaleY, 1.5)
      
      return {
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0
      }
    })

    const tabs = computed(() => {
      if (!room.value || !room.value.tournamentType) return ['🏆 晋级大厅']
      return ['🏆 晋级大厅', '🛡️ 战队管理']
    })

    watch([inputScoreA, inputScoreB], ([valA, valB]) => {
      if (!activeMatch.value) return
      const a = parseInt(valA || 0); const b = parseInt(valB || 0)
      if (a > b) inputWinnerId.value = activeMatch.value.teamA
      else if (b > a) inputWinnerId.value = activeMatch.value.teamB
    })

    const loadRoomData = () => {
      const data = roomStore.getRoom(roomId.value)
      if (data) {
        if (data.type === 'tournament') {
          data.tournamentType = 'cashout'
          data.slots = data.slots || data.teams.map(t => t.id)
          const hasSemis = data.matches && data.matches.some(m => m.id === 'semifinal_a')
          const needsSemis = data.teamCount === 6 || data.teamCount === 8
          if (!data.matches || data.matches.length === 0 || (needsSemis && !hasSemis)) {
            data.matches = generateTournamentSchedule(data.tournamentType, data.teamCount, data.teams)
          }
          roomStore.syncCashoutMatchesLocal(data)
        }
        room.value = data
      }
    }

    onMounted(() => {
      const id = route.query.id
      if (id) { roomId.value = id; loadRoomData() }
      else { showToast('赛事不存在'); setTimeout(() => goBack(), 1000) }
      window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    const goBack = () => router.go(-1)
    const switchTab = (index) => { currentTab.value = index }
    const toggleControlPanel = () => { isControlPanelVisible.value = !isControlPanelVisible.value }
    const toggleScreenshotView = () => { isScreenshotViewActive.value = !isScreenshotViewActive.value }

    const changeMap = (mapVal) => {
      const forceReroll = (mapVal === 'random' && room.value.map === 'random')
      const res = roomStore.updateTournamentMap(roomId.value, mapVal, forceReroll)
      if (res.success) {
        room.value.map = mapVal; room.value.activeMap = res.activeMap
        showToast(mapVal === 'random' ? `🎲 抽中 ${res.activeMap}` : `地图切换为 ${mapVal}`)
      }
    }

    const getTeamById = (teamId) => { if (!teamId) return null; return room.value.teams ? room.value.teams.find(t => t.id === teamId) : null }
    const getTeamName = (teamId) => { if (!teamId) return '待定'; if (teamId === 'bye') return '轮空'; const team = getTeamById(teamId); return team ? team.name : '未知战队' }
    const getMatch = (matchId) => { if (!room.value.matches) return null; return room.value.matches.find(m => m.id === matchId) }
    const formatCashout = (val) => { if (val === undefined || val === null) return '0'; return Number(val).toLocaleString() }
    const getRankTrophy = (match, teamId) => {
      if (!match || !match.rankings) return ''
      const idx = match.rankings.indexOf(teamId)
      if (idx === -1) return ''
      if (match.id === 'final_3rd' || match.stage === '3rd_place') {
        if (idx === 0) return '🥉 季军 🥉'
        if (idx === 1) return '🏅 第四名'
        return ''
      }
      if (idx === 0) return '🏆 冠军 🥇'
      if (idx === 1) return '🥈 亚军'
      if (idx === 2) return '🥉 季军'
      if (idx === 3) return '殿军'
      return ''
    }
    const getStageLabel = (match) => { if (match.stage === 'group') return `小组赛 - Group ${match.group}`; if (match.stage === 'league') return '常规联赛'; if (match.stage === 'semifinal' || match.stage === 'semifinals') return '半决赛阶段'; if (match.stage === 'quarterfinals') return match.label || '首轮淘汰赛'; if (match.stage === 'finals_3rd' || match.stage === '3rd_place') return '季军争夺战'; if (match.stage === 'finals_grand' || match.stage === 'grand_final') return '🏆 冠亚军总决赛'; return match.label || '对决场' }
    const isSlotInGroupA = (idx) => { const tc = room.value.teamCount; if (tc === 4) return true; if (tc === 5) return idx < 3; if (tc === 6) return idx < 3; return idx < 4 }
    const isSlotInGroupB = (idx) => { const tc = room.value.teamCount; if (tc <= 5) return false; if (tc === 6) return idx >= 3 && idx < 6; if (tc === 7) return idx >= 4 && idx < 7; return idx >= 4 && idx < 8 }
    const isSlotInBye = (idx) => room.value.teamCount === 5 && idx >= 3
    const getSlotGroupLabel = (idx) => { const tc = room.value.teamCount; if (tc === 4) return '半决赛对阵'; if (tc === 5) return idx < 3 ? '突围组' : '首轮轮空'; if (tc === 6) return idx < 3 ? '半决赛 A组' : '半决赛 B组'; return idx < 4 ? '半决赛 A组' : '半决赛 B组' }

    const activeMapDisplay = computed(() => { if (!room.value) return ''; return room.value.map === 'random' ? room.value.activeMap : room.value.map })
    const tournamentTypeLabel = computed(() => { if (!room.value) return '🏆 赛事详情'; return `💰 提现锦标赛 (${room.value.teamCount}支战队)` })

    const onDragStart = (e, index) => {
      draggedSlotIdx.value = index
      e.dataTransfer.setData('text/plain', String(index))
    }
    const onDrop = (e, toIndex) => {
      e.preventDefault()
      const fromIndexStr = e.dataTransfer.getData('text/plain')
      const fromIndex = (fromIndexStr !== null && fromIndexStr !== '') ? parseInt(fromIndexStr) : draggedSlotIdx.value
      if (fromIndex !== null && fromIndex !== undefined) {
        if (fromIndex === toIndex) return
        const res = roomStore.swapSlots(roomId.value, fromIndex, toIndex)
        if (res.success) { showToast('位置对调成功 🛡️', 'success'); loadRoomData() }
      }
      draggedSlotIdx.value = null
    }

    const onSlotTap = (index) => {
      if (selectedSlotIdx.value === -1) { selectedSlotIdx.value = index }
      else if (selectedSlotIdx.value === index) { selectedSlotIdx.value = -1 }
      else {
        const res = roomStore.swapSlots(roomId.value, selectedSlotIdx.value, index)
        if (res.success) { showToast('对阵互换完成 🛡️', 'success'); selectedSlotIdx.value = -1; loadRoomData() }
      }
    }

    const getTargetSlotIdx = (matchId, idx) => {
      if (matchId === 'semifinal_a') return idx
      if (matchId === 'semifinal_b') return (room.value.teamCount === 6 ? 3 : 4) + idx
      if (matchId === 'semifinal_4') return idx
      return -1
    }

    const handleMatchClick = (match) => {
      if (!match) return
      if (selectedSlotIdx.value !== -1) {
        const firstRoundIds = ['semifinal_a', 'semifinal_b', 'semifinal_4']
        if (firstRoundIds.includes(match.id)) {
          const targetSlotIdx = getTargetSlotIdx(match.id, 0)
          if (targetSlotIdx !== -1 && targetSlotIdx !== selectedSlotIdx.value) {
            const res = roomStore.swapSlots(roomId.value, selectedSlotIdx.value, targetSlotIdx)
            if (res.success) {
              showToast('战队成功放置到该淘汰赛位置 🛡️', 'success')
              selectedSlotIdx.value = -1
              loadRoomData()
              return
            }
          }
        }
      }
      openCashoutScoreModal(match)
    }

    const handleMatchTeamClick = (matchId, idx) => {
      if (selectedSlotIdx.value !== -1) {
        const targetSlotIdx = getTargetSlotIdx(matchId, idx)
        if (targetSlotIdx !== -1) {
          if (targetSlotIdx === selectedSlotIdx.value) {
            selectedSlotIdx.value = -1
            return
          }
          const res = roomStore.swapSlots(roomId.value, selectedSlotIdx.value, targetSlotIdx)
          if (res.success) {
            showToast('战队成功放置到该淘汰赛位置 🛡️', 'success')
            selectedSlotIdx.value = -1
            loadRoomData()
          }
        }
      } else {
        const match = getMatch(matchId)
        if (match) openCashoutScoreModal(match)
      }
    }

    const handleRandomizeSlots = async () => {
      const confirmed = await showModal('随机分组洗牌', '确定要将战队随机分配到第一轮的淘汰赛（半决赛 A/B组 或 4强对决）中吗？这将会清空全部已录入的比赛数据与比分。', '#eb003b')
      if (confirmed) {
        const result = roomStore.randomizeSlots(roomId.value)
        if (result.success) { showToast('已随机分配战队至第一轮淘汰赛 🎲', 'success'); loadRoomData() }
      }
    }

    const handleResetAllMatches = async () => {
      const confirmed = await showModal('清空成绩', '确定要重置所有对局局分、提现金额与晋级图状态吗？', '#eb003b')
      if (confirmed) {
        room.value.matches.forEach(m => {
          m.status = 'pending'; m.cashouts = {}; m.scoreA = null; m.scoreB = null
          m.killsA = null; m.killsB = null; m.winnerId = null
          if (m.promoted) m.promoted = []; if (m.rankings) m.rankings = []
        })
        roomStore.syncCashoutMatchesLocal(room.value)
        const storeRoom = roomStore.getRoom(roomId.value)
        if (storeRoom) storeRoom.matches = room.value.matches
        showToast('局分已重置', 'success'); loadRoomData()
      }
    }

    const openCashoutScoreModal = (match) => {
      if (!match) return
      if (match.teams.some(teamId => !teamId)) { showToast('有参赛队伍尚未决出，无法录入！'); return }
      activeCashoutMatch.value = match; cashoutInputs.value = {}
      match.teams.forEach(teamId => { cashoutInputs.value[teamId] = match.cashouts && match.cashouts[teamId] !== undefined ? match.cashouts[teamId] : 0 })
      isCashoutScoreModalVisible.value = true
    }
    const closeCashoutScoreModal = () => { isCashoutScoreModalVisible.value = false; activeCashoutMatch.value = null }

    const saveCashoutScore = () => {
      if (!activeCashoutMatch.value) return
      const formatted = {}
      activeCashoutMatch.value.teams.forEach(teamId => { formatted[teamId] = parseInt(cashoutInputs.value[teamId] || 0) })
      const res = roomStore.updateCashoutMatchScore(roomId.value, activeCashoutMatch.value.id, formatted)
      if (res.success) { showToast('成绩录入成功', 'success'); closeCashoutScoreModal(); loadRoomData() }
    }

    const resetMatchScore = async () => {
      if (!activeCashoutMatch.value) return
      const confirmed = await showModal('重置单场', '确定要清除本场对局的全部提现金额与晋级关联吗？', '#eb003b')
      if (confirmed) {
        const result = roomStore.resetCashoutMatchScore(roomId.value, activeCashoutMatch.value.id)
        if (result.success) { showToast('本场已重置'); closeCashoutScoreModal(); loadRoomData() }
      }
    }

    const openScoreModal = (match) => {
      if (!match || match.teamA === 'bye' || match.teamB === 'bye' || !match.teamA || !match.teamB) return
      activeMatch.value = match; inputScoreA.value = match.scoreA !== null ? match.scoreA : 0
      inputScoreB.value = match.scoreB !== null ? match.scoreB : 0; inputKillsA.value = match.killsA !== null ? match.killsA : 0
      inputKillsB.value = match.killsB !== null ? match.killsB : 0; inputWinnerId.value = match.winnerId || match.teamA
      inputMap.value = match.activeMap && match.activeMap !== '无' ? match.activeMap : (room.value.activeMap || '摩纳哥')
      isScoreModalVisible.value = true
    }
    const closeScoreModal = () => { isScoreModalVisible.value = false; activeMatch.value = null }

    const saveMatchDetails = () => {
      if (!activeMatch.value) return
      const res = roomStore.updateMatchScore(roomId.value, activeMatch.value.id, inputScoreA.value, inputScoreB.value, inputKillsA.value, inputKillsB.value, inputWinnerId.value, inputMap.value)
      if (res.success) { showToast('比分录入成功', 'success'); closeScoreModal(); loadRoomData() }
    }

    const openEditTeamModal = (team) => { isControlPanelVisible.value = false; activeTeam.value = team; editTeamName.value = team.name; editTeamMembersText.value = team.members ? team.members.join('\n') : ''; isEditTeamModalVisible.value = true }
    const closeEditTeamModal = () => { isEditTeamModalVisible.value = false; activeTeam.value = null }
    const saveTeamDetails = () => {
      if (!activeTeam.value) return
      const parsedMembers = editTeamMembersText.value.split(/[\n,，]/).map(m => m.trim()).filter(m => m.length > 0)
      const res = roomStore.updateTournamentTeam(roomId.value, activeTeam.value.id, editTeamName.value, parsedMembers)
      if (res.success) { showToast('战队信息已保存', 'success'); closeEditTeamModal(); loadRoomData() }
    }

    const leagueStandings = computed(() => [])
    const sortedMatches = computed(() => {
      if (!room.value.matches) return []
      const list = [...room.value.matches]
      return list.sort((a, b) => { const order = { 'quarterfinals': 1, 'group': 2, 'league': 3, 'semifinal': 4, 'semifinals': 4, '3rd_place': 5, 'finals_3rd': 5, 'grand_final': 6, 'finals_grand': 6 }; return (order[a.stage] || 99) - (order[b.stage] || 99) })
    })
    const qfMatches = computed(() => { if (!room.value.matches) return []; return room.value.matches.filter(m => m.stage === 'quarterfinals') })
    const sfMatches = computed(() => { if (!room.value.matches) return []; return room.value.matches.filter(m => m.stage === 'semifinal' || m.stage === 'semifinals') })
    const gfMatch = computed(() => { if (!room.value.matches) return null; return room.value.matches.find(m => m.stage === 'grand_final' || m.stage === 'finals_grand') })
    const m3rdMatch = computed(() => { if (!room.value.matches) return null; return room.value.matches.find(m => m.stage === '3rd_place' || m.stage === 'finals_3rd') })

    return {
      roomId, room, tabs, currentTab, MAPS, activeMapDisplay, tournamentTypeLabel, isControlPanelVisible, selectedSlotIdx,
      isScoreModalVisible, activeMatch, inputScoreA, inputScoreB, inputKillsA, inputKillsB, inputWinnerId, inputMap,
      isCashoutScoreModalVisible, activeCashoutMatch, cashoutInputs, isScreenshotViewActive, isEditTeamModalVisible,
      activeTeam, editTeamName, editTeamMembersText, leagueStandings, sortedMatches, qfMatches, sfMatches, gfMatch, m3rdMatch,
      draggedSlotIdx, flowchartScrollRef, scaleStyle,
      switchTab, toggleControlPanel, toggleScreenshotView, goBack, changeMap, getTeamById, getTeamName, getMatch,
      formatCashout, getRankTrophy, getStageLabel, isSlotInGroupA, isSlotInGroupB, isSlotInBye, getSlotGroupLabel,
      onDragStart, onDrop, onSlotTap, handleRandomizeSlots, handleResetAllMatches, openCashoutScoreModal,
      closeCashoutScoreModal, saveCashoutScore, resetMatchScore, openScoreModal, closeScoreModal, saveMatchDetails,
      openEditTeamModal, closeEditTeamModal, saveTeamDetails, loadRoomData, handleMatchClick, handleMatchTeamClick
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
  background: linear-gradient(135deg, #f2003c 0%, #a60023 100%);
  color: #ffffff;
  font-family: 'Inter', 'Outfit', sans-serif;
}

/* HUD Header */
.hud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(0,0,0,0.45);
  border-left: 6px solid #ffcc00;
  flex-shrink: 0;
  gap: 16px;
}
.header-left { display: flex; align-items: center; gap: 14px; }
.back-btn { padding: 6px 14px; background: linear-gradient(135deg, #ffcc00, #ff9900); color: #1a0206; font-size: 12px; font-weight: 800; border-radius: 5px; border: none; text-transform: uppercase; letter-spacing: 0.5px; }
.back-btn:hover { filter: brightness(1.1); }
.room-title-block { display: flex; flex-direction: column; gap: 2px; }
.room-title-text { font-size: 18px; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; }
.badge-cashout-hud { font-size: 11px; font-weight: 800; color: #ffcc00; text-transform: uppercase; }
.header-right { display: flex; align-items: center; gap: 16px; }
.map-hud-info { display: flex; flex-direction: column; align-items: flex-end; }
.map-label { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.map-name-val { font-size: 13px; font-weight: 700; color: #ffffff; }
.gear-btn { padding: 7px 14px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; font-size: 12px; font-weight: 600; border-radius: 7px; }
.gear-btn:hover { background: rgba(255,255,255,0.18); }
.gear-btn.active { background: rgba(255,204,0,0.2); border-color: #ffcc00; color: #ffcc00; }

/* Tabs */
.tabs-bar { display: flex; background: rgba(0,0,0,0.3); padding: 0 16px; flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
.tab-item { padding: 10px 18px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.5); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
.tab-item:hover { color: rgba(255,255,255,0.8); }
.tab-item.active { color: #ffcc00; border-bottom-color: #ffcc00; }

/* Content */
.tab-content-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.tab-content { flex: 1; overflow-y: auto; padding: 16px; }

/* Flowchart */
.flowchart-section { background: rgba(0,0,0,0.35) !important; border: 1px solid rgba(255,255,255,0.08) !important; padding: 16px; }
.screenshot-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.screenshot-tip { font-size: 12px; color: rgba(255,255,255,0.4); }
.btn-screenshot { padding: 6px 14px; font-size: 12px; font-weight: 600; background: rgba(255,204,0,0.15); border: 1px solid rgba(255,204,0,0.3); color: #ffcc00; border-radius: 6px; }
.btn-screenshot.active { background: rgba(255,204,0,0.25); }

.flowchart-scroll {
  overflow: auto;
  width: 100%;
}
.flowchart-canvas {
  position: relative;
  width: 1200px;
  margin: 0 auto; /* Horizontally centers in scrollable view when window > 1200px */
}
.flowchart-scroll.screenshot-active {
  position: fixed;
  top: 56px; /* Place right underneath HUD header */
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  background: rgba(12, 2, 4, 0.96); /* High fidelity immersive gradient panel matching deep red theme */
  backdrop-filter: blur(12px);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: calc(100vh - 56px);
}
.screenshot-active .flowchart-canvas {
  width: 1200px !important;
  margin: 0 auto !important;
}
.floating-exit-btn {
  position: fixed;
  top: 76px;
  right: 24px;
  z-index: 101;
  background: linear-gradient(135deg, #ffcc00, #ff9900) !important;
  color: #1a0206 !important;
  box-shadow: 0 4px 20px rgba(255, 204, 0, 0.4);
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
}
.floating-exit-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 24px rgba(255, 204, 0, 0.6);
}

.connections-svg { stroke: rgba(255,255,255,0.12); stroke-width: 2; fill: none; stroke-linecap: round; }
.connection-path { stroke: rgba(255,255,255,0.12); stroke-width: 2; fill: none; transition: all 0.3s; }
.connection-path.active { stroke: #ffcc00; filter: drop-shadow(0 0 6px rgba(255,204,0,0.8)); }

/* Flowchart Tiers */
.flowchart-tier { position: absolute; left: 0; right: 0; display: flex; justify-content: space-around; align-items: center; padding: 0 20px; box-sizing: border-box; }
.tier-final { top: 0; height: 300px; z-index: 2; justify-content: center; flex-direction: column; gap: 8px; }
.tier-semis { top: 380px; height: 280px; z-index: 2; }
.tier-groups { top: 760px; height: 280px; z-index: 2; }
.tier-slots { top: 780px; height: 320px; z-index: 2; flex-direction: column; align-items: flex-start; gap: 8px; }
.tier-label { font-size: 11px; font-weight: 900; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
.glow-gold { color: #ffcc00 !important; text-shadow: 0 0 8px rgba(255,204,0,0.5); }
.glow-red { color: #ff2e93 !important; }
.glow-blue { color: #00e1ff !important; }

.match-node-wrap { display: flex; justify-content: center; }
.semis-col { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 380px; }

/* Match Node */
.cashout-match-node {
  width: 340px; background: rgba(20,4,8,0.9); border: 2px solid rgba(255,255,255,0.08); border-radius: 10px;
  padding: 12px; box-shadow: 0 8px 28px rgba(0,0,0,0.6); position: relative; overflow: hidden;
  cursor: pointer; transition: all 0.25s;
}
.cashout-match-node:hover { transform: translateY(-3px); border-color: #ff2e93; box-shadow: 0 12px 32px rgba(242,0,60,0.25); }
.final-match-node { width: 420px; border-color: rgba(255,204,0,0.3); box-shadow: 0 8px 28px rgba(255,204,0,0.12); }
.final-match-node.node-completed { border-color: #ffcc00; box-shadow: 0 8px 28px rgba(255,204,0,0.4); }
.node-completed { border-color: rgba(0,225,255,0.3) !important; }
.finals-text-glow { color: #ffcc00 !important; font-weight: 900 !important; text-shadow: 0 0 8px rgba(255,204,0,0.5); }
.node-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 7px; }
.node-title { font-size: 11px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; }
.node-status-badge { font-size: 10px; font-weight: 800; color: #ff2e93; background: rgba(255,46,147,0.1); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,46,147,0.25); }
.node-status-badge.completed { color: #00e1ff; background: rgba(0,225,255,0.1); border-color: rgba(0,225,255,0.25); }
.node-teams-list { display: flex; flex-direction: column; gap: 5px; }
.node-team-row { display: flex; align-items: center; background: rgba(255,255,255,0.03); border-radius: 5px; padding: 6px 10px; border: 1px solid transparent; min-height: 32px; }
.tbd-row { border: 1px dashed rgba(255,255,255,0.06) !important; justify-content: center; }
.tbd-text { font-size: 11px; color: rgba(255,255,255,0.25); font-weight: 700; text-transform: uppercase; }
.team-color-dot { width: 4px; height: 18px; border-radius: 2px; margin-right: 8px; flex-shrink: 0; }
.team-logo-badge { font-size: 10px; font-weight: 900; color: #fff; border: 1px solid rgba(255,255,255,0.25); padding: 1px 5px; border-radius: 3px; margin-right: 8px; background: rgba(0,0,0,0.4); }
.team-name-text { font-size: 12px; color: #e5e7eb; font-weight: 800; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; margin-right: 8px; }
.team-cashout-amount { font-size: 13px; color: #ffffff; font-weight: 900; font-family: monospace; }
.rank-badge { font-size: 10px; color: #ffcc00; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); border-radius: 3px; padding: 1px 6px; margin-left: 8px; }
.status-icon { font-size: 10px; font-weight: 900; margin-left: 8px; }
.rank-1 { background: rgba(255,204,0,0.08) !important; border-color: rgba(255,204,0,0.3) !important; }
.rank-1 .team-name-text { color: #ffcc00 !important; }
.promoted-row { background: rgba(0,225,255,0.05) !important; border-color: rgba(0,225,255,0.2) !important; }
.promoted-row .team-name-text { color: #00e1ff !important; }
.eliminated-row { opacity: 0.35; }
.winner-row { background: rgba(0,225,255,0.05) !important; border-color: rgba(0,225,255,0.2) !important; }
.tap-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
.cashout-match-node:hover .tap-overlay { opacity: 1; }
.tap-text { font-size: 12px; font-weight: 900; color: #ffcc00; letter-spacing: 0.5px; }

.no-semis-placeholder { width: 100%; text-align: center; padding: 20px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08); border-radius: 8px; font-size: 13px; color: rgba(255,255,255,0.3); }

/* Slots */
.slots-grid { display: flex; width: 100%; gap: 8px; padding: 0 4px; margin-top: 10px; }
.team-slot-wrapper { flex: 1; min-width: 0; }
.team-slot-card {
  background: rgba(15,3,6,0.85); border: 2px solid rgba(255,255,255,0.08); border-top: 5px solid #6b7280;
  border-radius: 8px; padding: 10px 8px; cursor: pointer; transition: all 0.2s;
}
.team-slot-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.2); }
.selected-slot {
  border-color: #ffcc00 !important;
  box-shadow: 0 0 18px rgba(255,204,0,0.6);
  transform: scale(1.04) translateY(-4px);
  animation: pulse-slot-glow 1.5s infinite alternate;
}
@keyframes pulse-slot-glow {
  0% { box-shadow: 0 0 6px rgba(255,204,0,0.3); }
  100% { box-shadow: 0 0 20px rgba(255,204,0,0.8); }
}
.in-group-a .slot-badge { background: rgba(255,46,147,0.15); color: #ff2e93; border: 1px solid rgba(255,46,147,0.3); }
.in-group-b .slot-badge { background: rgba(0,225,255,0.15); color: #00e1ff; border: 1px solid rgba(0,225,255,0.3); }
.in-bye .slot-badge { background: rgba(255,204,0,0.15); color: #ffcc00; border: 1px solid rgba(255,204,0,0.3); }
.slot-badge { display: inline-block; font-size: 9px; font-weight: 900; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; margin-bottom: 6px; }
.slot-team-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.slot-team-name { font-size: 11px; font-weight: 900; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }
.slot-team-members { display: flex; flex-direction: column; gap: 3px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px; }
.slot-member-pill { font-size: 10px; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.02); padding: 2px 6px; border-radius: 3px; }
.no-members-tip { font-size: 10px; color: rgba(255,255,255,0.2); font-style: italic; }

/* Single Elimination Layout */
.se-layout { display: flex; flex-direction: column; gap: 20px; padding: 4px; align-items: center; }
.se-finals-row { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; width: 100%; }
.se-match-col { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 300px; align-items: center; }
.se-brackets { display: flex; flex-direction: column; gap: 12px; align-items: center; width: 100%; }
.se-round-label { font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; }
.se-matches-row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; width: 100%; }

/* Standings */
.standings-scroll { overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.standings-section { }
.section-table-title { font-size: 14px; font-weight: 800; color: #ffcc00; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
.standings-table { border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
.table-tr { display: grid; grid-template-columns: 50px 1fr 50px 50px 70px 60px 70px; align-items: center; padding: 0 12px; height: 42px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.table-thead { background: rgba(0,0,0,0.4); height: 36px; }
.table-th, .table-td { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 700; text-transform: uppercase; display: flex; align-items: center; }
.col-rank { justify-content: center; }
.col-num { justify-content: center; }
.col-points { justify-content: center; color: #ffcc00 !important; font-weight: 900; font-size: 14px; }
.top-tr { background: rgba(255,204,0,0.06) !important; }
.rank-trophy { font-size: 16px; }
.table-td { color: #ffffff; font-size: 13px; }

/* Matches List */
.matches-list-section { }
.matches-list { display: flex; flex-direction: column; gap: 6px; }
.match-list-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.match-list-row:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,204,0,0.3); }
.match-completed { border-color: rgba(0,225,255,0.2) !important; }
.match-stage-badge { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 700; width: 100px; flex-shrink: 0; }
.match-teams { flex: 1; display: flex; align-items: center; gap: 12px; }
.match-team-a, .match-team-b { font-size: 13px; font-weight: 700; color: #ffffff; flex: 1; text-align: center; }
.match-vs { font-size: 12px; color: #ffcc00; font-weight: 800; white-space: nowrap; }
.match-winner { font-size: 11px; color: #00e1ff; font-weight: 700; width: 120px; text-align: right; }
.match-click-hint { font-size: 11px; color: rgba(255,204,0,0.5); width: 80px; text-align: right; }

.matches-list-panel { background: rgba(0,0,0,0.35) !important; border: 1px solid rgba(255,255,255,0.08) !important; padding: 16px; }
.matches-list-full { display: flex; flex-direction: column; gap: 8px; }
.match-list-row-lg { padding: 14px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; cursor: pointer; transition: all 0.2s; }
.match-list-row-lg:hover { border-color: rgba(255,204,0,0.4); background: rgba(255,255,255,0.04); }
.match-list-row-lg.match-completed { border-color: rgba(0,225,255,0.25); }
.match-stage-badge-lg { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 700; margin-bottom: 8px; text-transform: uppercase; }
.match-teams-lg { display: flex; align-items: center; gap: 16px; margin-bottom: 6px; }
.match-team-a-lg, .match-team-b-lg { flex: 1; font-size: 15px; font-weight: 800; color: #ffffff; text-transform: uppercase; }
.match-score-block { display: flex; align-items: center; gap: 8px; }
.match-score { font-size: 20px; font-weight: 900; color: #ffcc00; font-family: monospace; min-width: 24px; text-align: center; }
.match-vs-lg { font-size: 14px; color: rgba(255,255,255,0.4); }
.match-winner-lg { font-size: 12px; color: #00e1ff; font-weight: 700; }
.match-map-lg { font-size: 12px; color: rgba(255,255,255,0.4); }
.match-pending-lg { font-size: 12px; color: rgba(255,204,0,0.6); }

/* Teams Manager */
.teams-manager { background: rgba(0,0,0,0.35) !important; border: 1px solid rgba(255,255,255,0.08) !important; padding: 16px; }
.teams-manager-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
.tm-title { font-size: 15px; font-weight: 800; color: #ffcc00; text-transform: uppercase; }
.tm-tip { font-size: 12px; color: rgba(255,255,255,0.35); }
.teams-manager-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.team-edit-card { display: flex; overflow: hidden; cursor: pointer; transition: all 0.2s; background: rgba(20,4,8,0.9) !important; border: 1px solid rgba(255,255,255,0.08) !important; border-radius: 8px; }
.team-edit-card:hover { transform: translateY(-2px); border-color: rgba(255,204,0,0.3) !important; }
.team-color-bar { width: 4px; flex-shrink: 0; }
.team-edit-info { flex: 1; padding: 12px; }
.team-edit-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.team-edit-name { font-size: 13px; font-weight: 800; color: #fff; text-transform: uppercase; flex: 1; }
.edit-icon { color: #ffcc00; }
.team-members-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.member-chip { font-size: 11px; color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 3px; }
.no-members-hint { font-size: 11px; color: rgba(255,255,255,0.2); font-style: italic; }

/* Drawer */
.drawer-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }
.control-drawer {
  position: fixed; top: 0; right: -480px; width: 440px; height: 100vh;
  background: rgba(18,2,6,0.92); backdrop-filter: blur(16px);
  border-left: 2px solid rgba(255,255,255,0.1); z-index: 100;
  display: flex; flex-direction: column; transition: transform 0.35s cubic-bezier(0.25,0.8,0.25,1);
  box-shadow: -10px 0 40px rgba(0,0,0,0.5);
}
.drawer-visible { transform: translateX(-480px); }
.drawer-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
.drawer-title { font-size: 14px; font-weight: 900; color: #ffcc00; text-transform: uppercase; letter-spacing: 0.5px; }
.drawer-close { background: transparent; color: rgba(255,255,255,0.4); font-size: 18px; padding: 4px 8px; border-radius: 4px; }
.drawer-close:hover { color: #fff; background: rgba(255,255,255,0.08); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.drawer-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.ds-title { font-size: 11px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px; margin-bottom: 4px; }
.ds-btn { width: 100%; height: 36px; font-size: 13px; font-weight: 700; border-radius: 7px; text-align: center; border: none; }
.btn-gold { background: linear-gradient(135deg, #ffcc00, #ff9900); color: #1a0206; }
.btn-red { background: rgba(242,0,60,0.1); border: 1px solid rgba(242,0,60,0.3); color: #ff2e93; }
.ds-tip { font-size: 11px; color: rgba(255,255,255,0.25); line-height: 1.5; }
.map-grid-hud { display: grid; grid-template-columns: repeat(2,1fr); gap: 7px; }
.map-cap-hud { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 8px 6px; text-align: center; font-size: 12px; color: #fff; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.map-cap-hud:hover { border-color: rgba(255,204,0,0.3); }
.map-cap-hud.active { background: rgba(255,204,0,0.15); border-color: #ffcc00; color: #ffcc00; }
.random-map-hud { grid-column: span 2; border-style: dashed; }
.team-manage-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 7px; cursor: pointer; transition: all 0.2s; }
.team-manage-row:hover { border-color: rgba(255,204,0,0.3); }
.team-manage-name { font-size: 13px; font-weight: 700; color: #fff; text-transform: uppercase; }

/* Modals */
.modal-mask { position: fixed; inset: 0; background: rgba(18,2,6,0.8); backdrop-filter: blur(8px); z-index: 200; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 480px; max-height: 85vh; background: rgba(20,3,6,0.97); border: 2px solid #ffcc00; box-shadow: 0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(255,204,0,0.12); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
.modal-title { font-size: 14px; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; }
.modal-close { background: transparent; color: rgba(255,255,255,0.4); font-size: 16px; padding: 4px 8px; border-radius: 4px; }
.modal-close:hover { color: #fff; background: rgba(255,255,255,0.08); }
.modal-body { padding: 16px 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
.modal-btn-cancel { flex: 1; height: 38px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #e5e7eb; font-size: 13px; border-radius: 7px; }
.modal-btn-reset { flex: 1; height: 38px; background: rgba(242,0,60,0.08); border: 1px solid rgba(242,0,60,0.2); color: #ff2e93; font-size: 13px; border-radius: 7px; }
.modal-btn-confirm { flex: 2; height: 38px; background: linear-gradient(135deg, #ffcc00, #ff9900); color: #1a0206; font-size: 13px; font-weight: 700; border-radius: 7px; border: none; }
.modal-btn-confirm:hover { filter: brightness(1.05); }

/* Cashout form */
.cashout-desc { font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5; }
.cashout-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.cashout-row-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.cashout-row-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.currency-tag { font-size: 16px; font-weight: 900; color: #ffcc00; }
.cashout-input-field { width: 100px; height: 36px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0 10px; color: #fff; font-size: 16px; font-weight: 700; font-family: monospace; text-align: right; }

/* Score form */
.score-input-section { display: flex; align-items: center; gap: 16px; }
.score-team-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.score-team-name { font-size: 13px; font-weight: 800; color: #ffffff; text-transform: uppercase; text-align: center; }
.score-field-label { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; }
.score-field { width: 100%; height: 44px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; padding: 0 12px; color: #fff; font-size: 22px; font-weight: 900; font-family: monospace; text-align: center; }
.score-vs { font-size: 20px; font-weight: 900; color: #ffcc00; padding: 0 4px; flex-shrink: 0; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 11px; color: #ffcc00; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.form-input { height: 38px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; padding: 0 12px; color: #fff; font-size: 13px; }
.form-input:focus { border-color: rgba(255,204,0,0.5); outline: none; }
.form-textarea { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; padding: 10px 12px; color: #fff; font-size: 13px; resize: vertical; font-family: inherit; }
.form-textarea:focus { border-color: rgba(255,204,0,0.5); outline: none; }
.map-select { height: 38px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; padding: 0 12px; color: #fff; font-size: 13px; cursor: pointer; }
.map-select option { background: #1a0206; color: #fff; }

.winner-select-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.winner-opt { padding: 10px; text-align: center; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; cursor: pointer; color: rgba(255,255,255,0.7); transition: all 0.2s; }
.winner-opt:hover { border-color: rgba(255,204,0,0.3); }
.winner-opt.active { background: rgba(255,204,0,0.12); border-color: #ffcc00; color: #ffcc00; }

.slot-placeable-row {
  cursor: cell !important;
  transition: all 0.2s ease-in-out;
  position: relative;
}
.slot-placeable-row:hover {
  background: rgba(255, 204, 0, 0.18) !important;
  border-color: #ffcc00 !important;
  box-shadow: 0 0 12px rgba(255, 204, 0, 0.3) !important;
  transform: translateY(-1px);
}

.seat-badge-small {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 8px;
  text-transform: uppercase;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.badge-group-a {
  color: #ff2e93;
  background: rgba(255, 46, 147, 0.12);
  border: 1px solid rgba(255, 46, 147, 0.3);
}
.badge-group-b {
  color: #00e1ff;
  background: rgba(0, 225, 255, 0.12);
  border: 1px solid rgba(0, 225, 255, 0.3);
}
.badge-group-semis {
  color: #ffcc00;
  background: rgba(255, 204, 0, 0.12);
  border: 1px solid rgba(255, 204, 0, 0.3);
}
</style>
