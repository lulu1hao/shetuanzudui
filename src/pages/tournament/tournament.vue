<template>
  <div ref="tournamentRootRef" class="container" :class="{ 'tournament-arrival': isTournamentArrival }">
    <!-- HUD Header -->
    <div class="hud-header">
      <div class="header-left">
        <div class="tournament-brand" aria-label="赛事中心">
          <img :src="tournamentDeerLogo" alt="" aria-hidden="true" />
          <span>赛事中心</span>
        </div>
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
        <button class="gear-btn" :class="{ 'active': isControlPanelVisible }" @click="toggleControlPanel">赛事设置</button>
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
        <div class="tournament-command-center" v-if="room.tournamentType === 'cashout'">
          <main class="command-flow-panel">
            <div class="command-flow-heading">
              <div>
                <span class="command-eyebrow">CASHOUT TOURNAMENT</span>
                <h2>鹿鹿杯 · {{ room.teamCount }}队赛</h2>
              </div>
              <div class="live-status"><span></span>{{ room.matches?.some(m => m.status === 'completed') ? '赛程进行中' : '等待开赛' }}</div>
            </div>

            <div class="command-flow" :class="`command-flow-${room.teamCount}`">
              <section class="flow-stage opening-stage">
                <template v-if="room.teamCount === 4">
                  <article class="command-match-card featured-stage" @click="handleMatchClick(getMatch('semifinal_4'))">
                    <header class="command-match-header">
                      <div><h3>4强对决</h3><p>4队同场 · TOP 2 晋级</p></div>
                      <span :class="{ completed: getMatch('semifinal_4')?.status === 'completed' }">{{ getMatchStatusText(getMatch('semifinal_4')) }}</span>
                    </header>
                    <div class="command-team-list">
                      <div v-for="(teamId, idx) in getMatch('semifinal_4')?.teams || [null, null, null, null]" :key="`sf4-${idx}`" class="command-team-row" :class="getCashoutRowClass(getMatch('semifinal_4'), teamId)" @click.stop="handleMatchTeamClick('semifinal_4', idx)">
                        <span class="command-logo" :style="{ color: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo || '—' }}</span>
                        <span class="command-team-name">{{ getTeamById(teamId)?.name || '待定席位' }}</span>
                        <span class="command-cashout">${{ formatCashout(getMatch('semifinal_4')?.cashouts?.[teamId]) }}</span>
                        <span class="command-row-state">{{ getCashoutRowStatus(getMatch('semifinal_4'), teamId, idx) }}</span>
                      </div>
                    </div>
                  </article>
                </template>

                <template v-else>
                  <article v-for="stage in openingStageDefs" :key="stage.id" class="command-match-card group-stage" @click="handleMatchClick(getMatch(stage.id))">
                    <header class="command-match-header">
                      <div><h3>{{ stage.title }}</h3><p>{{ room.teamCount === 6 ? '3队同场' : '4队同场' }} · TOP 2 晋级</p></div>
                      <span :class="{ completed: getMatch(stage.id)?.status === 'completed' }">{{ getMatchStatusText(getMatch(stage.id)) }}</span>
                    </header>
                    <div class="command-team-list">
                      <div v-for="(teamId, idx) in getMatch(stage.id)?.teams || []" :key="`${stage.id}-${idx}`" class="command-team-row" :class="getCashoutRowClass(getMatch(stage.id), teamId)" @click.stop="handleMatchTeamClick(stage.id, idx)">
                        <span class="command-logo" :style="{ color: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo || '—' }}</span>
                        <span class="command-team-name">{{ getTeamById(teamId)?.name || '待定席位' }}</span>
                        <span class="command-cashout">${{ formatCashout(getMatch(stage.id)?.cashouts?.[teamId]) }}</span>
                        <span class="command-row-state">{{ getCashoutRowStatus(getMatch(stage.id), teamId, idx) }}</span>
                      </div>
                    </div>
                  </article>
                </template>
              </section>

              <div class="flow-connector" :class="room.teamCount === 4 ? 'connector-straight' : 'connector-merge'" aria-hidden="true">
                <i class="line-in"></i><i class="line-top"></i><i class="line-bottom"></i><i class="line-spine"></i><i class="line-out"></i>
              </div>

              <section v-if="room.teamCount > 4" class="flow-stage middle-stage">
                <article class="command-match-card featured-stage" @click="handleMatchClick(getMatch('semifinal_4'))">
                  <header class="command-match-header">
                    <div><h3>4强对决</h3><p>4队同场 · TOP 2 晋级</p></div>
                    <span :class="{ completed: getMatch('semifinal_4')?.status === 'completed' }">{{ getMatchStatusText(getMatch('semifinal_4')) }}</span>
                  </header>
                  <div class="command-team-list">
                    <div v-for="(teamId, idx) in getMatch('semifinal_4')?.teams || [null, null, null, null]" :key="`middle-${idx}`" class="command-team-row" :class="getCashoutRowClass(getMatch('semifinal_4'), teamId)" @click.stop="handleMatchTeamClick('semifinal_4', idx)">
                      <span class="command-logo" :style="{ color: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo || '—' }}</span>
                      <span class="command-team-name">{{ getTeamById(teamId)?.name || '待定晋级席位' }}</span>
                      <span class="command-cashout">${{ formatCashout(getMatch('semifinal_4')?.cashouts?.[teamId]) }}</span>
                      <span class="command-row-state">{{ getCashoutRowStatus(getMatch('semifinal_4'), teamId, idx) }}</span>
                    </div>
                  </div>
                </article>
              </section>

              <div v-if="room.teamCount > 4" class="flow-connector connector-split" aria-hidden="true">
                <i class="line-in"></i><i class="line-top"></i><i class="line-bottom"></i><i class="line-spine"></i><i class="line-out"></i>
              </div>

              <section class="flow-stage finals-stage">
                <article v-for="stage in finalStageDefs" :key="stage.id" class="command-match-card final-stage-card" :class="stage.tone" @click="openCashoutScoreModal(getMatch(stage.id))">
                  <header class="command-match-header">
                    <div><h3>{{ stage.title }}</h3><p>{{ stage.subtitle }}</p></div>
                    <span :class="{ completed: getMatch(stage.id)?.status === 'completed' }">{{ getMatchStatusText(getMatch(stage.id)) }}</span>
                  </header>
                  <div class="command-team-list">
                    <div v-for="(teamId, idx) in getMatch(stage.id)?.teams || [null, null]" :key="`${stage.id}-${idx}`" class="command-team-row" :class="getCashoutRowClass(getMatch(stage.id), teamId)">
                      <span class="command-logo" :style="{ color: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo || 'TBD' }}</span>
                      <span class="command-team-name">{{ getTeamById(teamId)?.name || '待定' }}</span>
                      <span class="command-cashout">${{ formatCashout(getMatch(stage.id)?.cashouts?.[teamId]) }}</span>
                      <span class="command-row-state">{{ getCashoutRowStatus(getMatch(stage.id), teamId, idx) }}</span>
                    </div>
                  </div>
                  <button type="button" class="view-match-button">查看对局</button>
                </article>
              </section>
            </div>
          </main>

          <aside class="command-sidebar">
            <section class="command-side-card roster-card">
              <header><h3>参赛战队（{{ room.teamCount }}支）</h3><span>拖拽调整分组</span></header>
              <div class="command-roster-list">
                <div v-for="(teamId, idx) in room.slots || []" :key="teamId || idx" class="command-roster-row" :class="{ selected: selectedSlotIdx === idx }" draggable="true" @dragstart="onDragStart($event, idx)" @dragover.prevent @drop="onDrop($event, idx)" @dragend="draggedSlotIdx = null" @click="onSlotTap(idx)">
                  <span class="roster-logo" :style="{ color: getTeamById(teamId)?.color }">{{ getTeamById(teamId)?.logo }}</span>
                  <span class="roster-name">{{ getTeamById(teamId)?.name }}</span>
                  <span class="roster-group">{{ getSlotGroupLabel(idx) }}</span>
                </div>
              </div>
            </section>

            <section class="command-side-card status-card">
              <header><h3>赛事状态</h3></header>
              <div class="status-live-row"><span></span><strong>进行中</strong></div>
              <p>地图：{{ activeMapDisplay }} · 点击赛程卡片录入提现金额</p>
            </section>

            <section class="command-side-card champion-card">
              <div class="trophy-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M20 8h24v12c0 12-5 20-12 20S20 32 20 20zM20 12H9v7c0 8 5 13 13 14M44 12h11v7c0 8-5 13-13 14M32 40v9M22 55h20M26 49h12" /></svg></div>
              <div><span>冠军之路</span><strong>{{ championTeam?.name || '等待冠军诞生' }}</strong><small>专属冠军奖杯 & 荣誉称号</small></div>
            </section>
          </aside>
        </div>

        <!-- 💰 提现锦标赛 -->
        <div class="flowchart-section glass-panel legacy-flowchart" v-else-if="false">
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
                        <div v-for="(member, mIdx) in getTeamById(teamId)?.members || []" :key="member.id || mIdx" class="slot-member-pill">
                          {{ member.name || member }}<span v-if="member.bodyType"> · {{ member.bodyType }}体型</span>
                        </div>
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
        <div class="global-team-manager">
          <section class="global-team-toolbar">
            <div class="global-team-summary">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <div>
                <h2>全局战队编排</h2>
                <p>{{ room.teamCount }} 支战队 · {{ totalTournamentMembers }} 名成员</p>
              </div>
            </div>

            <div class="team-count-switch" aria-label="赛事战队数量">
              <button
                v-for="count in [4, 6, 8]"
                :key="count"
                :class="{ active: room.teamCount === count }"
                @click="handleTeamCountChange(count)"
              >{{ count }}队</button>
            </div>

            <div class="global-team-actions">
              <button class="global-action-btn" @click="handleGlobalRandomMembers">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
                随机分组
              </button>
              <button class="global-action-btn" @click="handleRandomizeSlots">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6V4ZM9 8h6M9 12h6M9 16h4" /></svg>
                队伍抽签
              </button>
              <button class="global-reset-btn" @click="handleResetArrangement">重置编排</button>
            </div>
          </section>

          <div class="global-drag-tip">
            <span aria-hidden="true">⠿</span>
            拖拽成员可跨队调整；队伍数量变化后，赛制将自动重新生成
          </div>

          <div class="global-team-grid" :class="`team-grid-${room.teamCount}`">
            <article
              v-for="(team, teamIndex) in room.teams"
              :key="team.id"
              class="global-team-card"
              :style="{ '--team-accent': team.color || '#ec1648' }"
              @dragover.prevent
              @drop="handleMemberDrop($event, team.id)"
            >
              <header class="global-team-card-header">
                <span class="team-index">队伍 {{ String(teamIndex + 1).padStart(2, '0') }}</span>
                <label class="team-name-editor">
                  <span class="sr-only">战队名称</span>
                  <input v-model="team.name" maxlength="32" placeholder="战队名称" @change="saveInlineTeamName(team)" />
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1L19 8.5 15.5 5 5 15.5 4 20ZM13.5 7l3.5 3.5" /></svg>
                </label>
                <span class="team-member-count">{{ team.members?.length || 0 }} / 12</span>
                <span class="draw-position">签位 {{ getDrawPosition(team.id) }}</span>
              </header>

              <div class="global-member-list">
                <div
                  v-for="member in team.members || []"
                  :key="member.id"
                  class="global-member-row"
                  draggable="true"
                  @dragstart="handleMemberDragStart($event, team.id, member.id)"
                >
                  <span class="member-drag-handle" title="拖拽成员">⠿</span>
                  <input
                    class="member-name-input"
                    :value="member.name"
                    maxlength="20"
                    aria-label="成员名称"
                    @change="updateMemberName(team.id, member, $event.target.value)"
                  />
                  <div class="body-type-switch" aria-label="体型配置">
                    <button
                      v-for="bodyType in tournamentBodyTypes"
                      :key="bodyType"
                      :class="{ active: member.bodyType === bodyType }"
                      :aria-pressed="member.bodyType === bodyType"
                      @click="updateMemberBodyType(team.id, member.id, bodyType)"
                    >{{ bodyType }}</button>
                  </div>
                  <button class="remove-member-btn" aria-label="移除成员" @click="removeTournamentMember(team.id, member.id)">×</button>
                </div>
                <div v-if="!team.members?.length" class="empty-team-members">暂无成员，可在下方添加或拖入</div>
              </div>

              <footer class="global-team-card-footer">
                <input
                  v-model="teamMemberDrafts[team.id]"
                  maxlength="20"
                  placeholder="添加成员"
                  :aria-label="`为${team.name}添加成员`"
                  @keyup.enter="addTournamentMember(team.id)"
                />
                <select v-model="teamBodyTypeDrafts[team.id]" aria-label="新成员体型">
                  <option v-for="bodyType in tournamentBodyTypes" :key="bodyType" :value="bodyType">{{ bodyType }}体型</option>
                </select>
                <button @click="addTournamentMember(team.id)">添加</button>
              </footer>
            </article>
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
          <button class="ds-btn btn-gold" @click="handleRandomizeSlots">🎟️ 队伍抽签</button>
          <button class="ds-btn btn-red" @click="handleResetAllMatches">🔄 重置全部局分</button>
          <span class="ds-tip">队伍抽签将重排签位并清空比分和晋级数据；重置局分保留当前签位。</span>
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
import { roomStore, MAPS, TOURNAMENT_BODY_TYPES, generateTournamentSchedule } from '../../store/roomStore.js'
import { useToast } from '../../composables/useToast.js'
import tournamentDeerLogo from '../../assets/branding/tournament-deer-logo.png'
import gsap from 'gsap'
import {
  animateDisplayHeaderCopy,
  beginLobbyReturnTransition,
  hasLuluDisplayTransition,
  placeGlobalLuluInDisplayTarget,
  settleLuluDisplayTransition,
  TOURNAMENT_DISPLAY_REVEAL_DURATION
} from '../../utils/globalLuluTransition.js'

export default {
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { showToast, showModal } = useToast()

    const roomId = ref('')
    const tournamentRootRef = ref(null)
    const isTournamentArrival = ref(
      hasLuluDisplayTransition(route.query.id)
    )
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
    const draggedTournamentMember = ref(null)
    const teamMemberDrafts = ref({})
    const teamBodyTypeDrafts = ref({})
    const tournamentBodyTypes = TOURNAMENT_BODY_TYPES
    let entranceTimer = null
    let panelEntranceTimeline = null
    let lobbyReturnTimeline = null
    let isReturningToLobby = false

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
      if (!room.value || !room.value.tournamentType) return ['赛事大厅']
      return ['赛事大厅', '我的战队']
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
        data.teams.forEach(team => {
          if (teamMemberDrafts.value[team.id] === undefined) teamMemberDrafts.value[team.id] = ''
          if (!teamBodyTypeDrafts.value[team.id]) teamBodyTypeDrafts.value[team.id] = '中'
        })
      }
    }

    const totalTournamentMembers = computed(() =>
      (room.value.teams || []).reduce((total, team) => total + (team.members?.length || 0), 0)
    )

    const getDrawPosition = (teamId) => {
      const position = (room.value.slots || []).indexOf(teamId)
      return position >= 0 ? position + 1 : '—'
    }

    const saveInlineTeamName = (team) => {
      const name = String(team.name || '').trim()
      if (!name) {
        team.name = `战队 ${String((room.value.teams || []).indexOf(team) + 1).padStart(2, '0')}`
      }
      roomStore.updateTournamentTeam(roomId.value, team.id, team.name, team.members)
    }

    const addTournamentMember = (teamId) => {
      const result = roomStore.addTournamentMember(
        roomId.value,
        teamId,
        teamMemberDrafts.value[teamId],
        teamBodyTypeDrafts.value[teamId] || '中'
      )
      if (!result.success) return showToast(result.msg)
      teamMemberDrafts.value[teamId] = ''
      showToast('成员已添加', 'success')
    }

    const removeTournamentMember = (teamId, memberId) => {
      const result = roomStore.removeTournamentMember(roomId.value, teamId, memberId)
      if (!result.success) showToast(result.msg)
    }

    const updateMemberName = (teamId, member, name) => {
      const trimmedName = String(name || '').trim()
      if (!trimmedName) return
      roomStore.updateTournamentMember(roomId.value, teamId, member.id, { name: trimmedName })
    }

    const updateMemberBodyType = (teamId, memberId, bodyType) => {
      roomStore.updateTournamentMember(roomId.value, teamId, memberId, { bodyType })
    }

    const handleMemberDragStart = (event, teamId, memberId) => {
      draggedTournamentMember.value = { teamId, memberId }
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('application/x-tournament-member', JSON.stringify({ teamId, memberId }))
    }

    const handleMemberDrop = (event, targetTeamId) => {
      event.preventDefault()
      let payload = draggedTournamentMember.value
      const serialized = event.dataTransfer.getData('application/x-tournament-member')
      if (serialized) {
        try { payload = JSON.parse(serialized) } catch (error) { /* use local drag state */ }
      }
      if (!payload) return
      const result = roomStore.moveTournamentMember(roomId.value, payload.memberId, payload.teamId, targetTeamId)
      draggedTournamentMember.value = null
      if (!result.success) showToast(result.msg)
    }

    const handleGlobalRandomMembers = async () => {
      const confirmed = await showModal('随机分组', '将房间内全部成员随机平均分配到当前战队中，是否继续？', '#eb003b')
      if (!confirmed) return
      const result = roomStore.randomizeTournamentMembers(roomId.value)
      if (result.success) showToast('成员随机分组完成', 'success')
      else showToast(result.msg)
    }

    const handleTeamCountChange = async (count) => {
      if (count === room.value.teamCount) return
      const shrinking = count < room.value.teamCount
      const message = shrinking
        ? `切换为 ${count} 队将移除末尾 ${room.value.teamCount - count} 支战队，并重建全部赛程与成绩。是否继续？`
        : `切换为 ${count} 队将保留现有战队、补充新战队，并按 ${count} 队赛制重建全部赛程。是否继续？`
      const confirmed = await showModal('修改赛事队伍数量', message, '#eb003b')
      if (!confirmed) return
      const result = roomStore.resizeTournament(roomId.value, count)
      if (!result.success) return showToast(result.msg)
      loadRoomData()
      showToast(`已切换为 ${count} 队赛制`, 'success')
    }

    const handleResetArrangement = async () => {
      const confirmed = await showModal('重置编排', '恢复默认签位并清空全部比赛成绩，战队名称、成员和体型配置会保留。', '#eb003b')
      if (!confirmed) return
      const result = roomStore.resetTournamentArrangement(roomId.value)
      if (result.success) {
        loadRoomData()
        showToast('编排已重置', 'success')
      }
    }

    const shouldReduceMotion = () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const playTournamentEntrance = () => {
      if (shouldReduceMotion()) {
        isTournamentArrival.value = false
        placeGlobalLuluInDisplayTarget(tournamentRootRef.value, { target: 'tournament' })
        animatePanelEntrance()
        animateActivePaths()
        return
      }

      const settled = settleLuluDisplayTransition({
        id: roomId.value,
        target: 'tournament',
        root: tournamentRootRef.value,
        onComplete: () => {
          isTournamentArrival.value = false
          nextTick(() => {
            const root = tournamentRootRef.value
            const header = root?.querySelector('.hud-header')
            if (header) {
              gsap.set(header, { clearProps: 'height,minHeight,will-change' })
            }
            if (root) {
              gsap.set(root.querySelectorAll('.header-left, .header-right'), {
                clearProps: 'opacity,visibility,transform,will-change'
              })
              placeGlobalLuluInDisplayTarget(root, { target: 'tournament' })
            }
            animateActivePaths()
          })
        }
      })

      if (settled) {
        animatePanelEntrance({ arrival: true })
      } else {
        isTournamentArrival.value = false
        placeGlobalLuluInDisplayTarget(tournamentRootRef.value, { target: 'tournament' })
        animatePanelEntrance()
        animateActivePaths()
      }
    }

    const getScopedElements = (selector) => {
      const root = tournamentRootRef.value
      return root ? root.querySelectorAll(selector) : []
    }

    const animateActivePaths = () => {
      nextTick(() => {
        const activePaths = getScopedElements('.connection-path.active')
        activePaths.forEach((path) => {
          if (path.getAttribute('data-drawn') === 'true') return
          path.setAttribute('data-drawn', 'true')
          if (shouldReduceMotion()) return
          try {
            const length = path.getTotalLength()
            gsap.killTweensOf(path)
            gsap.fromTo(path,
              { strokeDasharray: `${length} ${length}`, strokeDashoffset: length, opacity: 0 },
              {
                strokeDashoffset: 0, opacity: 1, duration: 1.2, ease: 'power3.out',
                onComplete: () => {
                  path.style.strokeDasharray = ''
                  path.style.strokeDashoffset = ''
                  path.style.opacity = ''
                }
              }
            )
          } catch (e) {
            path.style.opacity = '1'
          }
        })
      })
    }

    const resetInactivePaths = () => {
      const allPaths = getScopedElements('.connection-path[data-drawn]')
      allPaths.forEach((path) => {
        gsap.killTweensOf(path)
        path.removeAttribute('data-drawn')
        path.style.strokeDasharray = ''
        path.style.strokeDashoffset = ''
        path.style.opacity = ''
      })
    }

    const animatePanelEntrance = ({ arrival = false } = {}) => {
      if (shouldReduceMotion()) return
      const root = tournamentRootRef.value
      if (!root) return
      const header = root.querySelector('.hud-header')
      const headerLeft = root.querySelector('.header-left')
      const headerRight = root.querySelector('.header-right')
      const contentItems = root.querySelectorAll('.cashout-match-node, .team-slot-card, .se-match-col, .standings-section, .matches-list-panel')
      gsap.killTweensOf(arrival
        ? [headerLeft, headerRight].filter(Boolean)
        : root.querySelectorAll('.hud-header, .header-left, .header-right, .tab-item, .cashout-match-node, .team-slot-card, .se-match-col, .standings-section, .matches-list-panel')
      )
      panelEntranceTimeline?.kill()
      const headerDuration = arrival ? TOURNAMENT_DISPLAY_REVEAL_DURATION : 0.46
      panelEntranceTimeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
      animateDisplayHeaderCopy(root, { arrival, duration: headerDuration })
      if (!arrival) {
        panelEntranceTimeline.to(header, {
          height: 112,
          minHeight: 112,
          duration: 0,
          ease: 'power3.inOut',
          clearProps: 'height,min-height,will-change'
        }, 0)
      }
      if (!arrival) {
        panelEntranceTimeline
          .from(root.querySelectorAll('.tab-item'), {
            y: -15,
            opacity: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power2.out'
          }, 0.1)
          .from(contentItems, {
            y: 35,
            opacity: 0,
            scale: 0.98,
            duration: 0.6,
            stagger: 0.04,
            ease: 'power2.out',
            clearProps: 'transform,opacity'
          }, 0.15)
      }
    }

    watch(() => room.value.matches, () => {
      resetInactivePaths();
      animateActivePaths();
    }, { deep: true });

    onMounted(() => {
      const id = route.query.id
      if (id) {
        roomId.value = id;
        loadRoomData();

        if (isTournamentArrival.value && !shouldReduceMotion()) {
          const root = tournamentRootRef.value
          const header = root?.querySelector('.hud-header')
          if (root && header) {
            gsap.set(header, {
              height: root.clientHeight,
              minHeight: root.clientHeight,
              willChange: 'height'
            })
          }
        }

        // 先保留完整展示帧，再由全局展示层统一回缩，避免底部提前露出赛事页。
        entranceTimer = setTimeout(() => {
          if (isTournamentArrival.value) playTournamentEntrance()
          else {
            placeGlobalLuluInDisplayTarget(tournamentRootRef.value, { target: 'tournament' })
            animatePanelEntrance()
            animateActivePaths()
          }
        }, 140)
      }
      else { showToast('赛事不存在'); setTimeout(() => goBack(), 1000) }
      window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      if (entranceTimer) clearTimeout(entranceTimer)
      panelEntranceTimeline?.kill()
      lobbyReturnTimeline?.kill()
      resetInactivePaths()
      const root = tournamentRootRef.value
      if (root) gsap.killTweensOf(root.querySelectorAll('*'))
      window.removeEventListener('resize', handleResize)
    })

    const goBack = () => {
      if (isReturningToLobby) return

      const navigateHome = () => router.push('/')
      if (shouldReduceMotion()) {
        navigateHome()
        return
      }

      const root = tournamentRootRef.value
      const header = root?.querySelector('.hud-header')
      const headerLeft = root?.querySelector('.header-left')
      const headerRight = root?.querySelector('.header-right')
      root?.classList.add('tournament-leaving')

      isReturningToLobby = true
      let transitionStarted = false
      lobbyReturnTimeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
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
    const switchTab = (index) => {
      currentTab.value = index
      resetInactivePaths()
      animateActivePaths()
      nextTick(() => {
        if (shouldReduceMotion()) return
        gsap.from(getScopedElements('.tab-content .cashout-match-node, .tab-content .team-slot-card, .tab-content .standings-section, .tab-content .matches-list-panel'), {
          y: 25, opacity: 0, scale: 0.99, duration: 0.5, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity'
        })
      })
    }
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
    const openingStageDefs = [
      { id: 'semifinal_a', title: '半决赛 A组' },
      { id: 'semifinal_b', title: '半决赛 B组' }
    ]
    const finalStageDefs = [
      { id: 'final_grand', title: '冠亚决赛', subtitle: 'TOP 2 · 冠军之战', tone: 'grand-final-card' },
      { id: 'final_3rd', title: '季军决赛', subtitle: 'BOTTOM 2 · 季军之战', tone: 'third-final-card' }
    ]
    const getMatchStatusText = (match) => {
      if (!match) return '等待赛程'
      if (match.status === 'completed') return '已完赛'
      if (match.teams?.some(teamId => !teamId)) return '等待晋级'
      return '进行中'
    }
    const getCashoutRowStatus = (match, teamId, idx) => {
      if (!teamId) return '待定'
      if (match?.status !== 'completed') return `席位 ${idx + 1}`
      if (Array.isArray(match.promoted)) return match.promoted.includes(teamId) ? '晋级' : '淘汰'
      return getRankTrophy(match, teamId) || `第 ${idx + 1} 名`
    }
    const getCashoutRowClass = (match, teamId) => ({
      pending: !teamId,
      promoted: Boolean(teamId && match?.status === 'completed' && Array.isArray(match.promoted) && match.promoted.includes(teamId)),
      eliminated: Boolean(teamId && match?.status === 'completed' && Array.isArray(match.promoted) && !match.promoted.includes(teamId)),
      champion: Boolean(teamId && match?.status === 'completed' && Array.isArray(match.rankings) && match.rankings[0] === teamId)
    })
    const championTeam = computed(() => {
      const finalMatch = getMatch('final_grand')
      return getTeamById(finalMatch?.rankings?.[0])
    })
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
    const tournamentTypeLabel = computed(() => { if (!room.value) return '赛事详情'; return `提现锦标赛 · ${room.value.teamCount}支战队` })

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

    const openEditTeamModal = (team) => { isControlPanelVisible.value = false; activeTeam.value = team; editTeamName.value = team.name; editTeamMembersText.value = team.members ? team.members.map(member => member.name || member).join('\n') : ''; isEditTeamModalVisible.value = true }
    const closeEditTeamModal = () => { isEditTeamModalVisible.value = false; activeTeam.value = null }
    const saveTeamDetails = () => {
      if (!activeTeam.value) return
      const existingMembers = activeTeam.value.members || []
      const parsedMembers = editTeamMembersText.value
        .split(/[\n,，]/)
        .map(m => m.trim())
        .filter(m => m.length > 0)
        .map((name, index) => ({
          id: existingMembers[index]?.id,
          name,
          bodyType: existingMembers[index]?.bodyType || '中'
        }))
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
      roomId, tournamentRootRef, isTournamentArrival, tournamentDeerLogo, room, tabs, currentTab, MAPS, activeMapDisplay, tournamentTypeLabel, isControlPanelVisible, selectedSlotIdx,
      tournamentBodyTypes, teamMemberDrafts, teamBodyTypeDrafts, totalTournamentMembers,
      isScoreModalVisible, activeMatch, inputScoreA, inputScoreB, inputKillsA, inputKillsB, inputWinnerId, inputMap,
      isCashoutScoreModalVisible, activeCashoutMatch, cashoutInputs, isScreenshotViewActive, isEditTeamModalVisible,
      activeTeam, editTeamName, editTeamMembersText, leagueStandings, sortedMatches, qfMatches, sfMatches, gfMatch, m3rdMatch,
      draggedSlotIdx, flowchartScrollRef, scaleStyle,
      switchTab, toggleControlPanel, toggleScreenshotView, goBack, changeMap, getTeamById, getTeamName, getMatch,
      formatCashout, getRankTrophy, getStageLabel, isSlotInGroupA, isSlotInGroupB, isSlotInBye, getSlotGroupLabel,
      openingStageDefs, finalStageDefs, getMatchStatusText, getCashoutRowStatus, getCashoutRowClass, championTeam,
      onDragStart, onDrop, onSlotTap, handleRandomizeSlots, handleResetAllMatches, openCashoutScoreModal,
      closeCashoutScoreModal, saveCashoutScore, resetMatchScore, openScoreModal, closeScoreModal, saveMatchDetails,
      openEditTeamModal, closeEditTeamModal, saveTeamDetails, loadRoomData, handleMatchClick, handleMatchTeamClick,
      getDrawPosition, saveInlineTeamName, addTournamentMember, removeTournamentMember, updateMemberName,
      updateMemberBodyType, handleMemberDragStart, handleMemberDrop, handleGlobalRandomMembers,
      handleTeamCountChange, handleResetArrangement
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
  background: transparent;
  color: #ffffff;
  font-family: var(--font-sans);
}

.container.tournament-arrival {
  background: transparent;
}

.tournament-arrival .hud-header {
  z-index: auto;
  border-color: transparent;
  border-left-color: transparent;
  background: transparent;
}

.tournament-arrival .header-left {
  transform: translateX(-105vw);
  opacity: 0;
  visibility: hidden;
}

.tournament-arrival .header-right {
  transform: translateX(105vw);
  opacity: 0;
  visibility: hidden;
}

/* Keep the header copy above the expanding global display layer so its
   synchronized departure remains visible for the whole transition. */
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

/* HUD Header */
.hud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--surface-1);
  border-bottom: 1px solid var(--glass-border);
  border-left: 4px solid var(--accent-gold);
  box-shadow: var(--shadow-soft);
  flex-shrink: 0;
  gap: 16px;
}
.header-left {
  position: relative;
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 14px;
}
.back-btn { padding: 6px 14px; background: rgba(251,191,36,0.12); color: var(--accent-gold); font-size: 12px; font-weight: 800; border-radius: var(--radius-sm); border: 1px solid rgba(251,191,36,0.28); text-transform: uppercase; letter-spacing: 0; }
.back-btn:hover { background: rgba(251,191,36,0.18); border-color: rgba(251,191,36,0.45); }
.room-title-block { display: flex; flex-direction: column; gap: 2px; }
.room-title-text { font-size: 18px; font-weight: 900; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0; }
.badge-cashout-hud { font-size: 11px; font-weight: 800; color: var(--accent-gold); text-transform: uppercase; }
.header-right {
  position: relative;
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 16px;
}
.map-hud-info { display: flex; flex-direction: column; align-items: flex-end; }
.map-label { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; }
.map-name-val { font-size: 13px; font-weight: 700; color: #ffffff; }
.gear-btn { padding: 7px 14px; background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); color: var(--text-primary); font-size: 12px; font-weight: 600; border-radius: var(--radius-md); }
.gear-btn:hover { background: rgba(255,255,255,0.1); border-color: var(--glass-border-hover); }
.gear-btn.active { background: rgba(251,191,36,0.14); border-color: rgba(251,191,36,0.45); color: var(--accent-gold); }

/* Tabs */
.tabs-bar { display: flex; background: rgba(16,24,39,0.72); padding: 0 16px; flex-shrink: 0; border-bottom: 1px solid var(--glass-border); }
.tab-item { padding: 10px 18px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.55); cursor: pointer; border-bottom: 2px solid transparent; transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease; }
.tab-item:hover { color: rgba(255,255,255,0.8); }
.tab-item.active { color: var(--accent-gold); border-bottom-color: var(--accent-gold); background: rgba(251,191,36,0.06); }

/* Content */
.tab-content-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.tab-content { flex: 1; overflow-y: auto; padding: 16px; }

/* Flowchart */
.flowchart-section { background: var(--surface-1) !important; border: 1px solid var(--glass-border) !important; padding: 16px; box-shadow: var(--shadow-panel); }
.screenshot-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.screenshot-tip { font-size: 12px; color: rgba(255,255,255,0.4); }
.btn-screenshot { padding: 6px 14px; font-size: 12px; font-weight: 600; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.3); color: var(--accent-gold); border-radius: var(--radius-sm); }
.btn-screenshot.active { background: rgba(251,191,36,0.22); }

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
  background: rgba(9, 13, 22, 0.97);
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
  background: linear-gradient(135deg, var(--accent-gold), var(--brand-warning)) !important;
  color: #111827 !important;
  box-shadow: 0 4px 20px rgba(251, 191, 36, 0.34);
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
}
.floating-exit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(251, 191, 36, 0.42);
}

.connections-svg { stroke: rgba(255,255,255,0.12); stroke-width: 2; fill: none; stroke-linecap: round; }
.connection-path { stroke: rgba(255,255,255,0.12); stroke-width: 2; fill: none; transition: all 0.3s; }
.connection-path.active { stroke: var(--accent-gold); filter: drop-shadow(0 0 6px rgba(251,191,36,0.75)); }

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
  width: 340px; background: var(--surface-2); border: 1px solid var(--glass-border); border-radius: var(--radius-md);
  padding: 12px; box-shadow: 0 8px 28px rgba(0,0,0,0.6); position: relative; overflow: hidden;
  cursor: pointer; transition: all 0.25s;
}
.cashout-match-node:hover { transform: translateY(-2px); border-color: rgba(251,191,36,0.42); box-shadow: 0 12px 32px rgba(0,0,0,0.35); }
.final-match-node {
  width: 420px;
  border-color: transparent !important;
  background: linear-gradient(
    45deg,
    #050505 0%,
    #160000 18%,
    #4b0005 36%,
    #b30716 52%,
    #5f0008 68%,
    #190002 84%,
    #050505 100%
  ) !important;
  background-size: 280% 280% !important;
  animation: grandFinalSurfaceFlow 8s ease-in-out infinite !important;
  box-shadow:
    0 0 22px rgba(190, 8, 24, 0.22),
    0 0 44px rgba(80, 0, 8, 0.18),
    0 8px 28px rgba(0, 0, 0, 0.7) !important;
  overflow: visible !important;
  position: relative;
  z-index: 1;
}
.final-match-node.node-completed {
  border-color: transparent !important;
  box-shadow:
    0 0 30px rgba(210, 10, 28, 0.38),
    0 0 60px rgba(110, 0, 12, 0.24),
    0 0 82px rgba(20, 0, 3, 0.28),
    0 16px 45px rgba(0, 0, 0, 0.8) !important;
}
/* 冠亚决赛 - 45° 红黑流动渐变 */
.final-match-node::after {
  content: "" !important;
  position: absolute !important;
  inset: -2px !important;
  border-radius: 11px !important;
  z-index: -1 !important;
  pointer-events: none !important;
  background: linear-gradient(
    45deg,
    #030303 0%,
    #260003 20%,
    #8f0712 42%,
    #e11d35 54%,
    #6e0009 72%,
    #0a0a0a 100%
  ) !important;
  background-size: 260% 260% !important;
  animation: grandFinalBorderSweep 5.5s ease-in-out infinite !important;
}
/* 完赛后保持红黑体系，仅增强流光亮度 */
.final-match-node.node-completed::after {
  background: linear-gradient(
    45deg,
    #030303 0%,
    #340004 18%,
    #aa0818 40%,
    #f02a40 52%,
    #87000e 70%,
    #080808 100%
  ) !important;
  background-size: 260% 260% !important;
  animation: grandFinalBorderSweep 4.8s ease-in-out infinite !important;
}
@keyframes grandFinalSurfaceFlow {
  0%   { background-position: 0% 100%; }
  50%  { background-position: 100% 0%; }
  100% { background-position: 0% 100%; }
}
@keyframes grandFinalBorderSweep {
  0%   { background-position: 100% 0%; }
  50%  { background-position: 0% 100%; }
  100% { background-position: 100% 0%; }
}
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

/* Global tournament team arrangement */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.global-team-manager {
  min-height: 100%;
  color: #f7f7f8;
}
.global-team-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto minmax(440px, 1fr);
  align-items: center;
  gap: 22px;
  min-height: 72px;
  padding: 10px 18px;
  border: 1px solid rgba(236, 22, 72, 0.58);
  background:
    linear-gradient(90deg, rgba(236, 22, 72, 0.09), transparent 32%),
    rgba(13, 13, 15, 0.94);
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
}
.global-team-summary,
.global-team-actions,
.global-team-card-header,
.global-team-card-footer,
.global-member-row {
  display: flex;
  align-items: center;
}
.global-team-summary { gap: 12px; min-width: 0; }
.global-team-summary > svg {
  width: 28px;
  height: 28px;
  flex: none;
  fill: none;
  stroke: #ec1648;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.global-team-summary h2 { margin: 0; font-size: 22px; line-height: 1; font-weight: 1000; letter-spacing: 0.03em; }
.global-team-summary p { margin: 5px 0 0; color: rgba(255,255,255,0.5); font-size: 11px; font-family: monospace; }
.team-count-switch { display: grid; grid-template-columns: repeat(3, 72px); border: 1px solid rgba(255,255,255,0.14); }
.team-count-switch button {
  min-height: 40px;
  border: 0;
  border-right: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.025);
  color: rgba(255,255,255,0.48);
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  transition: color 180ms ease, background-color 180ms ease;
}
.team-count-switch button:last-child { border-right: 0; }
.team-count-switch button:hover { color: #fff; }
.team-count-switch button.active { background: linear-gradient(135deg, #9b0a27, #ec1648); color: #fff; }
.global-team-actions { justify-content: flex-end; gap: 10px; }
.global-action-btn,
.global-reset-btn {
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(236, 22, 72, 0.72);
  background: linear-gradient(135deg, rgba(139, 7, 31, 0.48), rgba(236, 22, 72, 0.12));
  color: #ff315e;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
  transition: background-color 180ms ease, color 180ms ease, border-color 180ms ease;
}
.global-action-btn { display: inline-flex; align-items: center; gap: 8px; }
.global-action-btn svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.global-action-btn:hover { color: #fff; background: #b70d34; border-color: #ff315e; }
.global-reset-btn { border-color: rgba(255,255,255,0.16); background: rgba(255,255,255,0.025); color: rgba(255,255,255,0.5); }
.global-reset-btn:hover { color: #fff; border-color: rgba(255,255,255,0.34); }
.global-drag-tip { display: flex; align-items: center; gap: 8px; margin: 10px 4px 8px; color: rgba(255,255,255,0.5); font-size: 11px; }
.global-drag-tip span { color: #ec1648; font-size: 18px; line-height: 1; }
.global-team-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; padding-bottom: 10px; }
.global-team-card {
  position: relative;
  min-width: 0;
  padding: 14px 16px 15px 20px;
  border: 1px solid color-mix(in srgb, var(--team-accent) 78%, #4b101e);
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--team-accent) 7%, transparent), transparent 36%),
    rgba(17, 15, 16, 0.97);
  clip-path: polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px));
}
.global-team-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 5px;
  background: var(--team-accent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--team-accent) 58%, transparent);
}
.global-team-card-header { gap: 10px; margin-bottom: 11px; }
.team-index { flex: none; min-width: 112px; color: #fff; font-size: 17px; font-weight: 1000; letter-spacing: 0.03em; }
.team-name-editor { position: relative; flex: 1; min-width: 120px; }
.team-name-editor input,
.member-name-input,
.global-team-card-footer input,
.global-team-card-footer select {
  border: 1px solid rgba(255,255,255,0.14);
  outline: none;
  background: rgba(255,255,255,0.025);
  color: #fff;
  font-family: inherit;
  transition: border-color 180ms ease, background-color 180ms ease;
}
.team-name-editor input { width: 100%; height: 36px; padding: 0 38px 0 12px; font-size: 12px; font-weight: 800; }
.team-name-editor input:focus,
.member-name-input:focus,
.global-team-card-footer input:focus,
.global-team-card-footer select:focus { border-color: var(--team-accent); background: rgba(255,255,255,0.045); }
.team-name-editor svg { position: absolute; right: 10px; top: 9px; width: 17px; height: 17px; fill: none; stroke: rgba(255,255,255,0.55); stroke-width: 2; pointer-events: none; }
.team-member-count { min-width: 42px; color: rgba(255,255,255,0.62); font-family: monospace; font-size: 12px; font-weight: 800; text-align: center; }
.draw-position { flex: none; padding: 7px 11px; border: 1px solid rgba(233,177,55,0.55); color: #e9b137; background: rgba(233,177,55,0.07); font-size: 11px; font-weight: 900; }
.global-member-list { display: flex; flex-direction: column; gap: 5px; min-height: 102px; }
.global-member-row { min-height: 37px; padding: 0 8px; gap: 8px; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.025); }
.global-member-row:hover { border-color: color-mix(in srgb, var(--team-accent) 48%, rgba(255,255,255,0.12)); }
.member-drag-handle { flex: none; color: rgba(255,255,255,0.42); font-size: 18px; line-height: 1; cursor: grab; user-select: none; }
.global-member-row:active .member-drag-handle { cursor: grabbing; }
.member-name-input { flex: 1; min-width: 80px; height: 29px; padding: 0 8px; border-color: transparent; background: transparent; font-size: 12px; font-weight: 800; }
.body-type-switch { display: grid; grid-template-columns: repeat(3, 31px); border: 1px solid rgba(255,255,255,0.12); }
.body-type-switch button { height: 27px; border: 0; border-right: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.4); font-size: 11px; font-weight: 900; cursor: pointer; }
.body-type-switch button:last-child { border-right: 0; }
.body-type-switch button:hover { color: #fff; }
.body-type-switch button.active { background: var(--team-accent); color: #09090b; }
.remove-member-btn { width: 30px; height: 30px; border: 0; background: transparent; color: #ff315e; font-size: 20px; line-height: 1; cursor: pointer; }
.remove-member-btn:hover { background: rgba(236,22,72,0.12); }
.empty-team-members { display: grid; place-items: center; min-height: 102px; border: 1px dashed rgba(255,255,255,0.1); color: rgba(255,255,255,0.28); font-size: 11px; }
.global-team-card-footer { gap: 8px; margin-top: 9px; }
.global-team-card-footer input { flex: 1; min-width: 100px; height: 36px; padding: 0 11px; font-size: 12px; }
.global-team-card-footer select { width: 82px; height: 36px; padding: 0 8px; font-size: 11px; cursor: pointer; }
.global-team-card-footer select option { background: #151517; color: #fff; }
.global-team-card-footer > button { width: 70px; height: 36px; border: 1px solid #ff315e; background: linear-gradient(135deg, #9b0a27, #ec1648); color: #fff; font-size: 12px; font-weight: 900; cursor: pointer; }
.global-team-card-footer > button:hover { filter: brightness(1.12); }

@media (max-width: 1180px) {
  .global-team-toolbar { grid-template-columns: 1fr auto; }
  .global-team-actions { grid-column: 1 / -1; justify-content: stretch; }
  .global-team-actions > button { flex: 1; justify-content: center; }
  .global-team-card-header { flex-wrap: wrap; }
  .team-name-editor { order: 4; flex-basis: 100%; }
}

@media (max-width: 820px) {
  .global-team-grid { grid-template-columns: 1fr; }
  .global-team-toolbar { grid-template-columns: 1fr; }
  .global-team-actions { grid-column: auto; flex-wrap: wrap; }
  .team-count-switch { grid-template-columns: repeat(3, 1fr); }
}

/* Drawer */
.drawer-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }
.control-drawer {
  position: fixed; top: 0; right: -480px; width: 440px; height: 100vh;
  background: rgba(16,24,39,0.94); backdrop-filter: blur(16px);
  border-left: 1px solid var(--glass-border); z-index: 100;
  display: flex; flex-direction: column; transition: transform 0.35s cubic-bezier(0.25,0.8,0.25,1);
  box-shadow: -10px 0 40px rgba(0,0,0,0.5);
}
.drawer-visible { transform: translateX(-480px); }
.drawer-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
.drawer-title { font-size: 14px; font-weight: 900; color: #ffcc00; text-transform: uppercase; letter-spacing: 0.5px; }
.drawer-close { background: transparent; color: rgba(255,255,255,0.4); font-size: 18px; padding: 4px 8px; border-radius: 4px; }
.drawer-close:hover { color: #fff; background: rgba(255,255,255,0.08); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.drawer-section { background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 14px; display: flex; flex-direction: column; gap: 8px; }
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
.modal-mask { position: fixed; inset: 0; background: rgba(9,13,22,0.78); backdrop-filter: blur(8px); z-index: 200; display: flex; align-items: center; justify-content: center; }
.modal-content { width: 480px; max-height: 85vh; background: rgba(16,24,39,0.98); border: 1px solid rgba(251,191,36,0.36); box-shadow: var(--shadow-panel), 0 0 24px rgba(251,191,36,0.1); border-radius: var(--radius-lg); display: flex; flex-direction: column; overflow: hidden; }
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

/* Tournament command center — shared 4 / 6 / 8 team visual system */
.hud-header {
  position: relative;
  min-height: 112px;
  padding: 0 28px;
  overflow: hidden;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background: transparent;
  box-shadow: none;
}
.hud-header .header-left,
.hud-header .header-right { position: relative; z-index: 70; }
.header-left { gap: 18px; }
.tournament-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  color: #ffffff;
}
.tournament-brand img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  flex: none;
  filter: drop-shadow(0 0 8px rgba(255, 18, 62, 0.34));
}
.tournament-brand span {
  font-size: 34px;
  line-height: 1;
  font-weight: 1000;
  letter-spacing: 0.04em;
  text-shadow: 0 3px 0 rgba(67, 0, 15, 0.5);
}
.back-btn {
  min-height: 40px;
  padding: 0 14px;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(13, 10, 12, 0.3);
  color: #ffffff;
}
.back-btn:hover { border-color: rgba(255, 255, 255, 0.72); background: rgba(13, 10, 12, 0.48); }
.room-title-block {
  padding-left: 16px;
  border-left: 1px solid rgba(255, 255, 255, 0.25);
}
.room-title-text { color: #ffffff; font-size: 15px; }
.badge-cashout-hud { color: rgba(255, 255, 255, 0.68); }
.map-label { color: rgba(255, 255, 255, 0.62); }
.gear-btn { min-height: 40px; background: rgba(13, 10, 12, 0.36); border-color: rgba(255, 255, 255, 0.22); color: #fff; }
.gear-btn.active { background: rgba(17, 12, 14, 0.62); border-color: rgba(255, 255, 255, 0.58); color: #fff; }

.tabs-bar {
  min-height: 48px;
  padding: 0 28px;
  background: #101010;
  border-bottom-color: rgba(232, 20, 70, 0.4);
}
.tab-item { padding: 14px 22px 12px; font-size: 14px; font-weight: 800; }
.tab-item.active { color: #f0224f; border-bottom-color: #f0224f; background: transparent; }
.tab-content { padding: 14px 18px 18px; background: #101112; }

.tournament-command-center {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 304px;
  gap: 14px;
  min-height: 100%;
}
.command-flow-panel,
.command-side-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(145deg, #171819 0%, #101112 100%);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.24);
}
.command-flow-panel {
  min-width: 0;
  padding: 16px;
  overflow-x: auto;
}
.command-flow-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  min-width: 880px;
  padding: 0 2px 13px;
  margin-bottom: 14px;
  border-bottom: 1px solid rgba(232, 20, 70, 0.38);
}
.command-eyebrow { display: block; margin-bottom: 3px; color: rgba(255, 255, 255, 0.36); font: 700 10px/1.2 monospace; letter-spacing: 0.16em; }
.command-flow-heading h2 { margin: 0; color: #fff; font-size: 22px; line-height: 1.1; font-weight: 1000; letter-spacing: 0.02em; }
.live-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid rgba(232, 20, 70, 0.35);
  color: #ff315d;
  font-size: 12px;
  font-weight: 800;
}
.live-status span,
.status-live-row span { width: 8px; height: 8px; border-radius: 50%; background: #ed1747; box-shadow: 0 0 12px rgba(237, 23, 71, 0.75); }

.command-flow {
  display: grid;
  align-items: stretch;
  min-width: 880px;
  min-height: 560px;
}
.command-flow-4 { grid-template-columns: minmax(330px, 1.05fr) 64px minmax(290px, 0.92fr); }
.command-flow-6,
.command-flow-8 { grid-template-columns: minmax(286px, 1fr) 48px minmax(286px, 0.98fr) 48px minmax(260px, 0.88fr); }
.flow-stage { display: flex; flex-direction: column; justify-content: center; gap: 14px; min-width: 0; }
.opening-stage { justify-content: space-around; }
.finals-stage { justify-content: center; gap: 16px; }

.command-match-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(145deg, #1a1b1c, #121314);
  cursor: pointer;
  transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
}
.command-match-card:hover { border-color: rgba(232, 20, 70, 0.72); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3); }
.command-match-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 13px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.command-match-header h3 { margin: 0 0 4px; color: #f0224f; font-size: 18px; line-height: 1; font-weight: 1000; }
.command-match-header p { margin: 0; color: rgba(255, 255, 255, 0.46); font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
.command-match-header > span {
  flex-shrink: 0;
  padding: 3px 7px;
  border: 1px solid rgba(240, 34, 79, 0.32);
  background: rgba(240, 34, 79, 0.1);
  color: #ff315d;
  font-size: 9px;
  font-weight: 900;
}
.command-match-header > span.completed { border-color: rgba(255, 255, 255, 0.18); background: rgba(255, 255, 255, 0.07); color: rgba(255, 255, 255, 0.7); }
.command-team-list { display: flex; flex-direction: column; }
.command-team-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto 48px;
  align-items: center;
  min-height: 42px;
  padding: 0 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.012);
}
.command-team-row:last-child { border-bottom: 0; }
.command-team-row.promoted { background: linear-gradient(90deg, rgba(232, 20, 70, 0.16), rgba(232, 20, 70, 0.03)); }
.command-team-row.eliminated { opacity: 0.48; }
.command-team-row.champion { background: linear-gradient(90deg, rgba(235, 177, 55, 0.18), rgba(235, 177, 55, 0.02)); }
.command-team-row.pending { color: rgba(255, 255, 255, 0.35); }
.command-logo { font-size: 18px; font-weight: 1000; font-style: italic; }
.command-team-name { overflow: hidden; color: #f6f6f6; font-size: 11px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.command-cashout { margin-left: 8px; color: #fff; font: 800 11px/1 monospace; }
.command-row-state { margin-left: 8px; color: rgba(255, 255, 255, 0.5); font-size: 9px; font-weight: 800; text-align: right; }
.promoted .command-row-state { color: #ff315d; }
.featured-stage { border-color: rgba(232, 20, 70, 0.42); }
.grand-final-card {
  border-color: rgba(232, 20, 70, 0.7);
  background: linear-gradient(45deg, #090909 0%, #260006 24%, #8f071d 50%, #250005 76%, #080808 100%);
  background-size: 260% 260%;
  animation: grandFinalSurfaceFlow 8s ease-in-out infinite;
}
.third-final-card { border-color: rgba(145, 72, 220, 0.48); background: linear-gradient(145deg, #17131c, #111113); }
.third-final-card .command-match-header h3 { color: #a968ed; }
.view-match-button {
  width: calc(100% - 20px);
  min-height: 38px;
  margin: 10px;
  border: 0;
  background: #e81446;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
.third-final-card .view-match-button { background: #6f32b6; }
.view-match-button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

.flow-connector { position: relative; min-height: 100%; pointer-events: none; }
.flow-connector i { position: absolute; display: block; border-color: #e81446; border-style: solid; filter: drop-shadow(0 0 3px rgba(232, 20, 70, 0.34)); }
.connector-straight .line-out { left: 0; right: 0; top: 50%; border-width: 2px 0 0; }
.connector-straight::after,
.connector-merge::after,
.connector-split::after { content: ""; position: absolute; right: 0; top: calc(50% - 5px); border: 5px solid transparent; border-left-color: #e81446; }
.connector-merge .line-top { left: 0; width: 50%; top: 25%; border-width: 2px 0 0; }
.connector-merge .line-bottom { left: 0; width: 50%; top: 75%; border-width: 2px 0 0; }
.connector-merge .line-spine { left: 50%; top: 25%; height: 50%; border-width: 0 0 0 2px; }
.connector-merge .line-out { left: 50%; right: 0; top: 50%; border-width: 2px 0 0; }
.connector-split .line-in { left: 0; width: 50%; top: 50%; border-width: 2px 0 0; }
.connector-split .line-spine { left: 50%; top: 25%; height: 50%; border-width: 0 0 0 2px; }
.connector-split .line-top { left: 50%; right: 0; top: 25%; border-width: 2px 0 0; }
.connector-split .line-bottom { left: 50%; right: 0; top: 75%; border-width: 2px 0 0; }

.command-sidebar { display: flex; flex-direction: column; gap: 12px; }
.command-side-card { padding: 13px; }
.command-side-card > header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.command-side-card h3 { margin: 0; color: #fff; font-size: 15px; font-weight: 1000; }
.command-side-card header span { color: rgba(255, 255, 255, 0.3); font-size: 9px; }
.command-roster-list { display: flex; flex-direction: column; }
.command-roster-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  min-height: 40px;
  padding: 0 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  cursor: grab;
  transition: background-color 160ms ease, border-color 160ms ease;
}
.command-roster-row:hover { background: rgba(232, 20, 70, 0.08); }
.command-roster-row.selected { background: rgba(232, 20, 70, 0.16); box-shadow: inset 3px 0 #e81446; }
.roster-logo { font-size: 16px; font-weight: 1000; font-style: italic; }
.roster-name { overflow: hidden; color: rgba(255, 255, 255, 0.84); font-size: 10px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.roster-group { margin-left: 8px; color: rgba(255, 255, 255, 0.34); font-size: 8px; text-align: right; }
.status-card { margin-top: auto; }
.status-live-row { display: flex; align-items: center; gap: 8px; margin: 13px 0 6px; color: #ff315d; font-size: 13px; }
.status-card p { margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 10px; line-height: 1.5; }
.champion-card { display: flex; align-items: center; gap: 14px; min-height: 112px; }
.trophy-mark { flex: 0 0 72px; color: #e9b137; }
.trophy-mark svg { width: 72px; height: 72px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 4px 12px rgba(233, 177, 55, 0.2)); }
.champion-card > div:last-child { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.champion-card span { color: #fff; font-size: 15px; font-weight: 1000; }
.champion-card strong { overflow: hidden; color: #e9b137; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.champion-card small { color: rgba(233, 177, 55, 0.62); font-size: 9px; }

@media (max-width: 1240px) {
  .tournament-command-center { grid-template-columns: 1fr; }
  .command-sidebar { display: grid; grid-template-columns: 1.5fr 1fr 1fr; align-items: stretch; }
  .status-card { margin-top: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .grand-final-card { animation: none; }
  .command-match-card,
  .command-roster-row { transition: none; }
}
</style>
