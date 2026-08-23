<template>
  <div ref="equipmentRootRef" class="container" :class="{ 'equipment-arrival': isEquipmentArrival }">
    <!-- 顶部 HUD Header (跑马灯转场 HUD) -->
    <header class="hud-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack" title="返回活动大厅">← 大厅</button>
        <div class="room-title-block">
          <div class="header-title-badge">
            <h1 class="header-page-title">装备</h1>
          </div>
          <span class="badge-cashout-hud">THE FINALS · 军械库 & 配装中心 · S11 LIVE</span>
        </div>
      </div>

      <div class="header-right">
        <!-- 模块切换 (百科 / 枪械对比 / 配装器 / 热门推荐) -->
        <div class="hud-tab-switcher">
          <button
            v-for="tab in mainTabs"
            :key="tab.key"
            type="button"
            class="hud-tab-btn"
            :class="{ active: currentMainTab === tab.key }"
            @click="currentMainTab = tab.key"
          >
            <span>{{ tab.label }}</span>
            <span v-if="tab.key === 'compare' && compareWeaponList.length" class="tab-count-badge">
              {{ compareWeaponList.length }}/3
            </span>
          </button>
        </div>

        <!-- Wiki 同步状态 -->
        <div class="wiki-sync-box" :title="`上次同步: ${formatSyncTime(lastSyncTime)}`">
          <div class="sync-status-indicator">
            <span class="pulse-dot" :class="{ green: isOnline && !isSyncing, yellow: isSyncing, gray: !isOnline }"></span>
            <span class="sync-status-text">{{ syncStatusLabel }}</span>
          </div>
          <button
            type="button"
            class="btn-manual-sync"
            :disabled="isSyncing"
            @click="handleManualSync"
            title="从 THE FINALS Wiki 检查并同步最新武器道具数值"
          >
            <span v-if="isSyncing" class="sync-spinner"></span>
            <span v-else>↻ 同步</span>
          </button>
        </div>
      </div>
    </header>

    <!-- 主体区域 (硬朗电竞质感 + 红黑精密线条) -->
    <main class="equipment-body-scroll">
      <div class="equipment-container-inner">

        <!-- 头部主标题区 -->
        <section class="command-flow-heading">
          <div>
            <span class="command-eyebrow">THE FINALS · WEAPONS, GADGETS & SPECIALIZATIONS</span>
            <div class="room-hero-title">
              <h2>装备百科与枪械战术分析</h2>
              <span class="badge-stage-tag">{{ totalEquipmentCount }} 件全赛季装备</span>
            </div>
          </div>
          <div class="equipment-stats-badge">
            <span class="pulse-dot"></span>
            <span>全职业（轻型/中型/重型）数据源自 THE FINALS Wiki 官方实测</span>
          </div>
        </section>

        <!-- ========================================================= -->
        <!-- 模块 1：军械库百科 (ARMORY ENCYCLOPEDIA) -->
        <!-- ========================================================= -->
        <template v-if="currentMainTab === 'armory'">
          <!-- 筛选与搜索工具条 -->
          <section class="filter-controls-card">
            <!-- 体型切换 -->
            <div class="filter-group">
              <span class="filter-group-label">CONTESTANT BUILD</span>
              <div class="filter-pills-row">
                <button
                  v-for="b in buildFilterOptions"
                  :key="b.key"
                  type="button"
                  class="filter-pill-btn"
                  :class="{ active: selectedBuild === b.key, [`pill-${b.key.toLowerCase()}`]: true }"
                  @click="selectedBuild = b.key"
                >
                  <span class="pill-name">{{ b.label }}</span>
                  <span v-if="b.hp" class="pill-hp">{{ b.hp }}</span>
                </button>
              </div>
            </div>

            <!-- 装备分类切换 -->
            <div class="filter-group">
              <span class="filter-group-label">CATEGORY</span>
              <div class="filter-pills-row">
                <button
                  v-for="c in categoryFilterOptions"
                  :key="c.key"
                  type="button"
                  class="filter-pill-btn"
                  :class="{ active: selectedCategory === c.key }"
                  @click="selectedCategory = c.key"
                >
                  <span class="pill-name">{{ c.label }}</span>
                </button>
              </div>
            </div>

            <!-- 搜索框与排序 -->
            <div class="search-and-sort-row">
              <div class="search-input-field">
                <span class="input-search-text">SEARCH</span>
                <input
                  type="text"
                  v-model="searchKeyword"
                  class="main-search-input"
                  placeholder="快速检索武器/道具名称（如: AKM, 地狱犬, 龙息, 除颤仪, 锁弹, RPG, 闪烁...）"
                  spellcheck="false"
                />
                <button v-if="searchKeyword" type="button" class="input-clear-btn" @click="searchKeyword = ''">✕</button>
              </div>

              <div class="sort-select-box">
                <span class="sort-label">SORT</span>
                <select v-model="selectedSortBy" class="sort-select-control">
                  <option value="default">默认推荐</option>
                  <option value="damage">单发伤害 (高到低)</option>
                  <option value="dps">秒伤 DPS (高到低)</option>
                  <option value="name">名称字母 (A-Z)</option>
                </select>
              </div>
            </div>
          </section>

          <!-- 装备列表网格与右侧战术检视器 -->
          <section class="armory-split-layout">
            <!-- 装备卡片网格 -->
            <div class="equipment-cards-grid">
              <div v-if="filteredEquipmentList.length === 0" class="empty-equipment-state">
                <span class="empty-text">未检索到匹配的装备或武器</span>
                <button class="btn-reset-filter" @click="resetFilters">重置筛选条件</button>
              </div>

              <div
                v-for="item in filteredEquipmentList"
                :key="item.id"
                class="equip-card glass-panel"
                :class="{
                  'active-selected': activeInspectorItem && activeInspectorItem.id === item.id,
                  [`build-border-${item.build.toLowerCase().replace(/[^a-z]/g, '')}`]: true
                }"
                @click="inspectItem(item)"
              >
                <!-- 卡片顶栏徽章 -->
                <div class="equip-card-topbar">
                  <span class="build-tag" :class="`tag-${item.build.toLowerCase().replace(/[^a-z]/g, '')}`">
                    {{ getBuildBadgeLabel(item.build) }}
                  </span>
                  <div class="topbar-right-actions">
                    <span class="category-tag">{{ getCategoryBadgeLabel(item.category) }}</span>
                    <!-- 武器对比添加按钮 -->
                    <button
                      v-if="item.category === 'weapons'"
                      type="button"
                      class="btn-card-compare"
                      :class="{ 'in-compare': isInCompare(item.id) }"
                      @click.stop="toggleCompareWeapon(item)"
                      :title="isInCompare(item.id) ? '从对比栏移除' : '加入对比 (最多3把)'"
                    >
                      {{ isInCompare(item.id) ? '已对比' : '+ 对比' }}
                    </button>
                  </div>
                </div>

                <!-- 装备官方缩略图 -->
                <div class="equip-thumb-box">
                  <img
                    :src="item.imageUrl"
                    :alt="item.name"
                    class="equip-thumb-img"
                    loading="lazy"
                    @error="handleImgError($event, item)"
                  />
                </div>

                <!-- 装备名称与类型 -->
                <div class="equip-info-box">
                  <div class="equip-name-row">
                    <span class="equip-title">{{ item.name }}</span>
                    <span class="equip-role">{{ item.role }}</span>
                  </div>
                  <span class="equip-zh-sub">{{ item.nameZh }}</span>
                </div>

                <!-- 核心数据栏 -->
                <div class="equip-mini-stats">
                  <div v-if="item.category === 'weapons'" class="mini-stat-cell">
                    <span class="stat-lbl">伤害</span>
                    <strong class="stat-val">{{ item.stats?.damage || '—' }}</strong>
                  </div>
                  <div v-if="item.category === 'weapons'" class="mini-stat-cell">
                    <span class="stat-lbl">DPS</span>
                    <strong class="stat-val stat-highlight">{{ item.stats?.dps || '—' }}</strong>
                  </div>
                  <div v-if="item.category === 'weapons'" class="mini-stat-cell">
                    <span class="stat-lbl">弹匣</span>
                    <strong class="stat-val">{{ item.stats?.magazine || '—' }}</strong>
                  </div>

                  <div v-if="item.category !== 'weapons'" class="mini-stat-cell full-width-stat">
                    <span class="stat-lbl">冷却 / 充能</span>
                    <strong class="stat-val">{{ item.stats?.cooldown || '—' }} ({{ item.stats?.charges || 1 }}次)</strong>
                  </div>
                </div>

                <div class="card-hover-action">
                  <span>战术检视 →</span>
                </div>
              </div>
            </div>

            <!-- 右侧：全息战术检视器 (TACTICAL INSPECTOR - 支持独立滚轮滚动与视口自适应) -->
            <aside class="tactical-inspector-sidebar">
              <div v-if="activeInspectorItem" class="inspector-card glass-panel">
                <div class="inspector-header">
                  <div class="inspector-title-group">
                    <span class="inspector-eyebrow">TACTICAL DOSSIER · 战术档案</span>
                    <h3 class="inspector-main-title">{{ activeInspectorItem.name }}</h3>
                    <span class="inspector-zh-title">{{ activeInspectorItem.nameZh }}</span>
                  </div>
                  <button type="button" class="btn-inspector-close" @click="activeInspectorItem = null" title="关闭">✕</button>
                </div>

                <!-- 装备全息展示图 (紧凑优化) -->
                <div class="inspector-banner-box">
                  <img :src="activeInspectorItem.imageUrl" :alt="activeInspectorItem.name" class="inspector-full-img" />
                  <div class="inspector-glow-badge">
                    <span class="badge-build-hero" :class="`tag-${activeInspectorItem.build.toLowerCase().replace(/[^a-z]/g, '')}`">
                      {{ getBuildBadgeLabel(activeInspectorItem.build) }} · {{ getCategoryBadgeLabel(activeInspectorItem.category) }}
                    </span>
                  </div>
                </div>

                <!-- 简要定位说明 -->
                <div class="inspector-quote-box">
                  <p class="quote-text">{{ activeInspectorItem.descZh || activeInspectorItem.description }}</p>
                </div>

                <!-- ================= 1. WIKI 官方标准击杀数据表 (DAMAGE PROFILE) ================= -->
                <div v-if="activeInspectorItem.category === 'weapons'" class="inspector-wiki-profile-section">
                  <div class="profile-section-head">
                    <span class="matrix-title">WIKI 击杀数据档案 (DAMAGE PROFILE)</span>
                    <span class="ttk-subtitle">基于社区实测与游戏内帧率</span>
                  </div>

                  <table class="wiki-table-matrix">
                    <thead>
                      <tr>
                        <th class="th-part">部位</th>
                        <th class="th-target th-light">轻型 (150 HP)</th>
                        <th class="th-target th-medium">中型 (250 HP)</th>
                        <th class="th-target th-heavy">重型 (350 HP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- 爆头行 -->
                      <tr>
                        <td class="td-part text-gold">全爆头 (Head)</td>
                        <td class="td-target">
                          <div class="dmg-cell">
                            <span class="cell-shots">{{ getWeaponProfileShots(activeInspectorItem, 'head', 'light') }}</span>
                            <strong class="cell-ttk text-gold">{{ getWeaponProfileTTK(activeInspectorItem, 'head', 'light') }}</strong>
                          </div>
                        </td>
                        <td class="td-target">
                          <div class="dmg-cell">
                            <span class="cell-shots">{{ getWeaponProfileShots(activeInspectorItem, 'head', 'medium') }}</span>
                            <strong class="cell-ttk text-gold">{{ getWeaponProfileTTK(activeInspectorItem, 'head', 'medium') }}</strong>
                          </div>
                        </td>
                        <td class="td-target">
                          <div class="dmg-cell">
                            <span class="cell-shots">{{ getWeaponProfileShots(activeInspectorItem, 'head', 'heavy') }}</span>
                            <strong class="cell-ttk text-gold">{{ getWeaponProfileTTK(activeInspectorItem, 'head', 'heavy') }}</strong>
                          </div>
                        </td>
                      </tr>
                      <!-- 身体行 -->
                      <tr>
                        <td class="td-part">全身体 (Body)</td>
                        <td class="td-target">
                          <div class="dmg-cell">
                            <span class="cell-shots">{{ getWeaponProfileShots(activeInspectorItem, 'body', 'light') }}</span>
                            <strong class="cell-ttk">{{ getWeaponProfileTTK(activeInspectorItem, 'body', 'light') }}</strong>
                          </div>
                        </td>
                        <td class="td-target">
                          <div class="dmg-cell">
                            <span class="cell-shots">{{ getWeaponProfileShots(activeInspectorItem, 'body', 'medium') }}</span>
                            <strong class="cell-ttk">{{ getWeaponProfileTTK(activeInspectorItem, 'body', 'medium') }}</strong>
                          </div>
                        </td>
                        <td class="td-target">
                          <div class="dmg-cell">
                            <span class="cell-shots">{{ getWeaponProfileShots(activeInspectorItem, 'body', 'heavy') }}</span>
                            <strong class="cell-ttk">{{ getWeaponProfileTTK(activeInspectorItem, 'body', 'heavy') }}</strong>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="wiki-calc-footnote">
                    <span>* 测算标准：首发于 t = 0.00s 击发，TTK 为 (弹数 - 1) × 循环射击间隔</span>
                  </div>
                </div>

                <!-- ================= 2. 完整数据矩阵 (MediaWiki 官方实测数值) ================= -->
                <div class="inspector-stats-matrix">
                  <h4 class="matrix-title">WIKI 核心战斗参数</h4>
                  <div class="stats-grid">
                    <div class="matrix-stat-item">
                      <span class="m-lbl">基础伤害</span>
                      <strong class="m-val">{{ activeInspectorItem.stats?.damage || '—' }}</strong>
                    </div>
                    <div class="matrix-stat-item">
                      <span class="m-lbl">爆头倍率</span>
                      <strong class="m-val text-gold">{{ activeInspectorItem.stats?.crit || '—' }}</strong>
                    </div>
                    <div class="matrix-stat-item">
                      <span class="m-lbl">秒伤 (DPS)</span>
                      <strong class="m-val text-red">{{ activeInspectorItem.stats?.dps || '—' }}</strong>
                    </div>
                    <div class="matrix-stat-item">
                      <span class="m-lbl">射速 (RPM)</span>
                      <strong class="m-val">{{ activeInspectorItem.stats?.rpm || '—' }}</strong>
                    </div>
                    <div class="matrix-stat-item">
                      <span class="m-lbl">弹药容量</span>
                      <strong class="m-val">{{ activeInspectorItem.stats?.magazine || '—' }}</strong>
                    </div>
                    <div class="matrix-stat-item">
                      <span class="m-lbl">换弹速度</span>
                      <strong class="m-val">{{ activeInspectorItem.stats?.reload || '—' }}</strong>
                    </div>
                    <div class="matrix-stat-item">
                      <span class="m-lbl">射程衰减</span>
                      <strong class="m-val">{{ activeInspectorItem.stats?.falloff || '—' }}</strong>
                    </div>
                    <div class="matrix-stat-item">
                      <span class="m-lbl">环境破坏</span>
                      <strong class="m-val">{{ activeInspectorItem.stats?.destruction || 'Low' }}</strong>
                    </div>
                  </div>
                </div>

                <!-- 实战建议 -->
                <div class="inspector-tips-box">
                  <h4 class="tips-title">战术协同指南</h4>
                  <ul class="tips-list">
                    <li v-for="(tip, idx) in activeInspectorItem.tips" :key="idx">{{ tip }}</li>
                  </ul>
                </div>

                <!-- 交互操作按钮栏 -->
                <div class="inspector-actions-bar">
                  <button type="button" class="btn-inspector-primary" @click="loadItemIntoBuilder(activeInspectorItem)">
                    + 填入配装模拟器
                  </button>
                  <button
                    v-if="activeInspectorItem.category === 'weapons'"
                    type="button"
                    class="btn-inspector-compare"
                    @click="toggleCompareWeapon(activeInspectorItem)"
                  >
                    {{ isInCompare(activeInspectorItem.id) ? '已加入对比' : '+ 加入枪械对比' }}
                  </button>
                  <button type="button" class="btn-inspector-secondary" @click="copyEquipmentSummary(activeInspectorItem)">
                    复制数据
                  </button>
                  <a :href="activeInspectorItem.wikiUrl" target="_blank" class="btn-inspector-wiki" title="在 THE FINALS Wiki 查看原文">
                    Wiki ↗
                  </a>
                </div>
              </div>

              <!-- 默认未选中状态提示 -->
              <div v-else class="inspector-placeholder glass-panel">
                <h4 class="placeholder-title">点击左侧任意装备</h4>
                <p class="placeholder-desc">查看来自 THE FINALS Wiki 的高精度击杀时间(TTK)、爆头所需弹数、伤害衰减与实战克制技巧。</p>
              </div>
            </aside>
          </section>
        </template>

        <!-- ========================================================= -->
        <!-- 模块 2：枪械数据对比 (WEAPON COMPARISON - 最多3把) -->
        <!-- ========================================================= -->
        <template v-else-if="currentMainTab === 'compare'">
          <section class="compare-workspace-card glass-panel">
            <div class="compare-header-bar">
              <div>
                <h3 class="compare-main-title">枪械深度多维对比 (最多支持 3 把)</h3>
                <span class="compare-sub-desc">直观比对 Wiki 实测伤害、DPS、换弹效率与轻/中/重型击杀时间 (TTK)</span>
              </div>
              <div class="compare-header-actions">
                <button type="button" class="btn-clear-compare" @click="clearCompareList">清空对比列表</button>
                <button type="button" class="btn-go-armory" @click="currentMainTab = 'armory'">+ 从军械库添加</button>
              </div>
            </div>

            <!-- 空对比状态 -->
            <div v-if="compareWeaponList.length === 0" class="empty-compare-box">
              <h4 class="empty-c-title">暂未添加对比武器</h4>
              <p class="empty-c-desc">前往军械库点击任意武器卡片右上角的 “+ 对比” 按钮，即可将最多 3 把枪械置于同一维度横向测算。</p>
              <button class="btn-primary-add" @click="currentMainTab = 'armory'">前往军械库选枪</button>
            </div>

            <!-- 对比矩阵数据表格 -->
            <div v-else class="compare-matrix-wrapper">
              <div class="compare-columns-container" :style="{ gridTemplateColumns: `repeat(${compareWeaponList.length}, 1fr)` }">
                <div
                  v-for="(w, wIdx) in compareWeaponList"
                  :key="w.id"
                  class="compare-weapon-col"
                  :class="`border-${w.build.toLowerCase()}`"
                >
                  <!-- 枪械头部 -->
                  <div class="c-weapon-header">
                    <button class="btn-remove-compare" @click="removeFromCompare(w.id)" title="从对比中移除">✕</button>
                    <div class="c-thumb-wrap">
                      <img :src="w.imageUrl" :alt="w.name" class="c-weapon-img" />
                    </div>
                    <div class="c-weapon-meta">
                      <span class="c-build-tag" :class="`tag-${w.build.toLowerCase()}`">{{ getBuildBadgeLabel(w.build) }}</span>
                      <strong class="c-name">{{ w.name }}</strong>
                      <span class="c-name-zh">{{ w.nameZh }}</span>
                    </div>
                  </div>

                  <!-- 核心参数指标对比 -->
                  <div class="c-metrics-block">
                    <h5 class="c-block-heading">基础作战参数</h5>
                    <div class="c-metric-row">
                      <span class="c-m-label">单发基础伤害</span>
                      <strong class="c-m-value">{{ w.stats?.damage || '—' }}</strong>
                    </div>
                    <div class="c-metric-row">
                      <span class="c-m-label">爆头倍率</span>
                      <strong class="c-m-value text-gold">{{ w.stats?.crit || '—' }}</strong>
                    </div>
                    <div class="c-metric-row">
                      <span class="c-m-label">理论秒伤 (DPS)</span>
                      <strong class="c-m-value text-red">{{ w.stats?.dps || '—' }}</strong>
                    </div>
                    <div class="c-metric-row">
                      <span class="c-m-label">射速 (RPM)</span>
                      <strong class="c-m-value">{{ w.stats?.rpm || '—' }}</strong>
                    </div>
                    <div class="c-metric-row">
                      <span class="c-m-label">弹匣容量</span>
                      <strong class="c-m-value">{{ w.stats?.magazine || '—' }} 发</strong>
                    </div>
                    <div class="c-metric-row">
                      <span class="c-m-label">换弹耗时</span>
                      <strong class="c-m-value">{{ w.stats?.reload || '—' }}</strong>
                    </div>
                    <div class="c-metric-row">
                      <span class="c-m-label">有效射程</span>
                      <strong class="c-m-value">{{ w.stats?.falloff || '—' }}</strong>
                    </div>
                  </div>

                  <!-- Wiki 标准 Damage Profile 击杀时间对比 -->
                  <div class="c-metrics-block c-ttk-block">
                    <h5 class="c-block-heading">WIKI 击杀数据 (DAMAGE PROFILE)</h5>

                    <!-- 对 轻型 150 HP -->
                    <div class="c-ttk-target-box ttk-light-border">
                      <div class="c-target-head">
                        <span>轻型 (150 HP)</span>
                      </div>
                      <div class="c-sub-row">
                        <span>全爆头:</span>
                        <strong class="text-gold">
                          {{ getWeaponProfileShots(w, 'head', 'light') }} ({{ getWeaponProfileTTK(w, 'head', 'light') }})
                        </strong>
                      </div>
                      <div class="c-sub-row">
                        <span>全身体:</span>
                        <strong>
                          {{ getWeaponProfileShots(w, 'body', 'light') }} ({{ getWeaponProfileTTK(w, 'body', 'light') }})
                        </strong>
                      </div>
                    </div>

                    <!-- 对 中型 250 HP -->
                    <div class="c-ttk-target-box ttk-medium-border">
                      <div class="c-target-head">
                        <span>中型 (250 HP)</span>
                      </div>
                      <div class="c-sub-row">
                        <span>全爆头:</span>
                        <strong class="text-gold">
                          {{ getWeaponProfileShots(w, 'head', 'medium') }} ({{ getWeaponProfileTTK(w, 'head', 'medium') }})
                        </strong>
                      </div>
                      <div class="c-sub-row">
                        <span>全身体:</span>
                        <strong>
                          {{ getWeaponProfileShots(w, 'body', 'medium') }} ({{ getWeaponProfileTTK(w, 'body', 'medium') }})
                        </strong>
                      </div>
                    </div>

                    <!-- 对 重型 350 HP -->
                    <div class="c-ttk-target-box ttk-heavy-border">
                      <div class="c-target-head">
                        <span>重型 (350 HP)</span>
                      </div>
                      <div class="c-sub-row">
                        <span>全爆头:</span>
                        <strong class="text-gold">
                          {{ getWeaponProfileShots(w, 'head', 'heavy') }} ({{ getWeaponProfileTTK(w, 'head', 'heavy') }})
                        </strong>
                      </div>
                      <div class="c-sub-row">
                        <span>全身体:</span>
                        <strong>
                          {{ getWeaponProfileShots(w, 'body', 'heavy') }} ({{ getWeaponProfileTTK(w, 'body', 'heavy') }})
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div class="c-footer-actions">
                    <button class="btn-c-loadout" @click="loadItemIntoBuilder(w)">填入配装器 →</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </template>

        <!-- ========================================================= -->
        <!-- 模块 3：自由配装实验室 (CONTESTANT LOADOUT BUILDER) -->
        <!-- ========================================================= -->
        <template v-else-if="currentMainTab === 'builder'">
          <section class="builder-workspace-card glass-panel">
            <!-- 配装器顶栏 -->
            <div class="builder-header-bar">
              <div class="builder-title-group">
                <div class="build-type-selector">
                  <span class="builder-label">CONTESTANT BUILD:</span>
                  <button
                    v-for="b in ['Light', 'Medium', 'Heavy']"
                    :key="b"
                    type="button"
                    class="btn-build-toggle"
                    :class="{ active: currentBuilderBuild === b, [`btn-${b.toLowerCase()}`]: true }"
                    @click="switchBuilderBuild(b)"
                  >
                    <span>{{ b === 'Light' ? '轻型 (150 HP)' : (b === 'Medium' ? '中型 (250 HP)' : '重型 (350 HP)') }}</span>
                  </button>
                </div>
              </div>

              <div class="builder-actions-right">
                <input
                  type="text"
                  v-model="currentLoadoutTitle"
                  class="loadout-title-input"
                  placeholder="配装名称（如: S11 突击先锋流）"
                />
                <button type="button" class="btn-builder-save" @click="handleSaveCurrentLoadout">保存配装</button>
                <button type="button" class="btn-builder-export" @click="handleExportLoadoutCode">复制分享码</button>
                <button type="button" class="btn-builder-reset" @click="handleResetBuilder">清空重置</button>
              </div>
            </div>

            <!-- 配装槽位核心布局 -->
            <div class="loadout-slots-grid">
              <!-- 槽位 1：特殊能力 Specialization -->
              <div class="slot-column">
                <div class="slot-header">
                  <span class="slot-badge-specialization">特殊能力 (SPECIALIZATION)</span>
                  <span class="slot-hint">1 个主技能</span>
                </div>
                <div
                  class="slot-card"
                  :class="{ filled: activeBuilderSpecialization, empty: !activeBuilderSpecialization }"
                  @click="openSlotPicker('specialization')"
                >
                  <template v-if="activeBuilderSpecialization">
                    <img :src="activeBuilderSpecialization.imageUrl" class="slot-icon-img" />
                    <div class="slot-meta">
                      <strong class="slot-name">{{ activeBuilderSpecialization.name }}</strong>
                      <span class="slot-zh">{{ activeBuilderSpecialization.nameZh }}</span>
                      <span class="slot-desc-mini">{{ activeBuilderSpecialization.role }}</span>
                    </div>
                    <button class="btn-slot-clear" @click.stop="activeBuilderSpecialization = null">✕</button>
                  </template>
                  <template v-else>
                    <div class="slot-empty-content">
                      <span class="empty-slot-plus">+</span>
                      <span>选择特殊能力</span>
                    </div>
                  </template>
                </div>
              </div>

              <!-- 槽位 2：主武器 Weapon -->
              <div class="slot-column">
                <div class="slot-header">
                  <span class="slot-badge-weapon">主武器 (WEAPON)</span>
                  <span class="slot-hint">1 把核心枪械/近战</span>
                </div>
                <div
                  class="slot-card"
                  :class="{ filled: activeBuilderWeapon, empty: !activeBuilderWeapon }"
                  @click="openSlotPicker('weapon')"
                >
                  <template v-if="activeBuilderWeapon">
                    <img :src="activeBuilderWeapon.imageUrl" class="slot-icon-img" />
                    <div class="slot-meta">
                      <strong class="slot-name">{{ activeBuilderWeapon.name }}</strong>
                      <span class="slot-zh">{{ activeBuilderWeapon.nameZh }}</span>
                      <span class="slot-stat-mini">DPS: {{ activeBuilderWeapon.stats?.dps || '—' }} | 伤害: {{ activeBuilderWeapon.stats?.damage || '—' }}</span>
                    </div>
                    <button class="btn-slot-clear" @click.stop="activeBuilderWeapon = null">✕</button>
                  </template>
                  <template v-else>
                    <div class="slot-empty-content">
                      <span class="empty-slot-plus">+</span>
                      <span>选择主武器</span>
                    </div>
                  </template>
                </div>
              </div>

              <!-- 槽位 3：随身战术道具 (3个) -->
              <div class="slot-column slot-column-gadgets">
                <div class="slot-header">
                  <span class="slot-badge-gadget">随身道具 (GADGETS)</span>
                  <span class="slot-hint">3 个战术道具</span>
                </div>
                <div class="gadgets-sub-grid">
                  <div
                    v-for="(g, gIdx) in 3"
                    :key="gIdx"
                    class="slot-card mini-gadget-slot"
                    :class="{ filled: activeBuilderGadgets[gIdx], empty: !activeBuilderGadgets[gIdx] }"
                    @click="openSlotPicker('gadget', gIdx)"
                  >
                    <template v-if="activeBuilderGadgets[gIdx]">
                      <img :src="activeBuilderGadgets[gIdx].imageUrl" class="slot-icon-img" />
                      <div class="slot-meta">
                        <strong class="slot-name">{{ activeBuilderGadgets[gIdx].name }}</strong>
                        <span class="slot-zh">{{ activeBuilderGadgets[gIdx].nameZh }}</span>
                      </div>
                      <button class="btn-slot-clear" @click.stop="removeGadgetSlot(gIdx)">✕</button>
                    </template>
                    <template v-else>
                      <div class="slot-empty-content">
                        <span class="empty-slot-plus">+</span>
                        <span>道具 {{ gIdx + 1 }}</span>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- 战术协同雷达与能力综合评分 -->
            <div class="loadout-analytics-bar">
              <div class="analytics-title-col">
                <span class="radar-title">战术能力雷达</span>
                <span class="radar-subtitle">基于选定装备综合测算</span>
              </div>

              <div class="synergy-bars-grid">
                <div class="synergy-bar-item">
                  <div class="bar-label-row">
                    <span>机动突击</span>
                    <strong>{{ calculatedSynergy.mobility }}%</strong>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill mobility-fill" :style="{ width: calculatedSynergy.mobility + '%' }"></div>
                  </div>
                </div>

                <div class="synergy-bar-item">
                  <div class="bar-label-row">
                    <span>瞬间火力</span>
                    <strong>{{ calculatedSynergy.firepower }}%</strong>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill firepower-fill" :style="{ width: calculatedSynergy.firepower + '%' }"></div>
                  </div>
                </div>

                <div class="synergy-bar-item">
                  <div class="bar-label-row">
                    <span>团队支援</span>
                    <strong>{{ calculatedSynergy.support }}%</strong>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill support-fill" :style="{ width: calculatedSynergy.support + '%' }"></div>
                  </div>
                </div>

                <div class="synergy-bar-item">
                  <div class="bar-label-row">
                    <span>阵地防御</span>
                    <strong>{{ calculatedSynergy.defense }}%</strong>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill defense-fill" :style="{ width: calculatedSynergy.defense + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 用户自定义已存配装列表 -->
          <section v-if="savedCustomLoadouts.length" class="saved-loadouts-section">
            <h3 class="section-subheading">我的自定义配装存档 ({{ savedCustomLoadouts.length }})</h3>
            <div class="preset-cards-grid">
              <div v-for="loadout in savedCustomLoadouts" :key="loadout.id" class="preset-card glass-panel">
                <div class="preset-topbar">
                  <span class="preset-build-badge" :class="`tag-${loadout.build.toLowerCase()}`">{{ loadout.build }}</span>
                  <button class="btn-delete-preset" @click="handleDeleteSavedLoadout(loadout.id)" title="删除存档">✕</button>
                </div>
                <h4 class="preset-name">{{ loadout.title }}</h4>
                <div class="preset-slots-preview">
                  <span v-if="loadout.specialization" class="preview-pill">{{ getEquipmentById(loadout.specialization)?.name || loadout.specialization }}</span>
                  <span v-if="loadout.weapon" class="preview-pill">{{ getEquipmentById(loadout.weapon)?.name || loadout.weapon }}</span>
                </div>
                <div class="preset-card-footer">
                  <button type="button" class="btn-apply-preset" @click="applySavedLoadout(loadout)">应用到配装器 →</button>
                </div>
              </div>
            </div>
          </section>
        </template>

        <!-- ========================================================= -->
        <!-- 模块 4：天梯热门竞技配装推荐 (COMPETITIVE META BUILDS) -->
        <!-- ========================================================= -->
        <template v-else-if="currentMainTab === 'presets'">
          <section class="meta-presets-section">
            <div class="presets-intro-banner">
              <h3 class="presets-banner-title">THE FINALS S11 全球高分段主流竞技配装</h3>
              <p class="presets-banner-desc">汇集排位 Ruby/Diamond 职业选手与锦标赛夺冠战队标准配装，点击即可一键载入并模拟测试。</p>
            </div>

            <div class="preset-cards-grid">
              <div
                v-for="preset in PRESET_LOADOUTS"
                :key="preset.id"
                class="preset-card glass-panel meta-preset-highlight"
              >
                <div class="preset-topbar">
                  <span class="preset-build-badge" :class="`tag-${preset.build.toLowerCase()}`">
                    {{ preset.build === 'Light' ? '轻型' : (preset.build === 'Medium' ? '中型' : '重型') }}
                  </span>
                  <span class="preset-author">{{ preset.author }}</span>
                </div>

                <h4 class="preset-name">{{ preset.title }}</h4>
                <p class="preset-desc">{{ preset.desc }}</p>

                <!-- 配装清单展示 -->
                <div class="preset-items-lineup">
                  <div class="lineup-item">
                    <span class="lineup-lbl">特长:</span>
                    <strong class="lineup-val">{{ getEquipmentById(preset.specialization)?.nameZh || preset.specialization }}</strong>
                  </div>
                  <div class="lineup-item">
                    <span class="lineup-lbl">武器:</span>
                    <strong class="lineup-val">{{ getEquipmentById(preset.weapon)?.nameZh || preset.weapon }}</strong>
                  </div>
                  <div class="lineup-item">
                    <span class="lineup-lbl">道具:</span>
                    <div class="lineup-tags">
                      <span v-for="gId in preset.gadgets" :key="gId" class="lineup-tag">
                        {{ getEquipmentById(gId)?.name || gId }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 配装底部操作 -->
                <div class="preset-card-footer">
                  <button type="button" class="btn-apply-preset" @click="applyPreset(preset)">
                    载入配装器测试 →
                  </button>
                  <button type="button" class="btn-copy-preset" @click="copyPresetCode(preset)">
                    分享码
                  </button>
                </div>
              </div>
            </div>
          </section>
        </template>

      </div>
    </main>

    <!-- 弹窗：槽位选择器 (SLOT PICKER MODAL) -->
    <div v-if="isSlotPickerOpen" class="modal-mask" @click.self="isSlotPickerOpen = false">
      <div class="picker-modal-card glass-panel">
        <div class="modal-header">
          <span class="modal-title">选择 {{ pickerSlotTitle }}</span>
          <button class="modal-close" @click="isSlotPickerOpen = false">✕</button>
        </div>

        <div class="picker-search-bar">
          <input
            type="text"
            v-model="pickerSearchKeyword"
            class="picker-search-input"
            placeholder="搜索当前职业可用装备..."
            autofocus
          />
        </div>

        <div class="picker-items-grid">
          <div
            v-for="item in availablePickerItems"
            :key="item.id"
            class="picker-item-card"
            @click="selectItemForSlot(item)"
          >
            <img :src="item.imageUrl" :alt="item.name" class="picker-thumb" />
            <div class="picker-item-details">
              <strong class="p-name">{{ item.name }}</strong>
              <span class="p-zh">{{ item.nameZh }}</span>
              <span class="p-role">{{ item.role }}</span>
            </div>
            <span class="p-select-arrow">选择 →</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { gsap } from 'gsap'
import {
  getEquipmentData,
  getLastSyncTime,
  formatSyncTime,
  syncEquipmentFromWiki,
  filterEquipment,
  getEquipmentById,
  getCustomLoadouts,
  saveCustomLoadout,
  deleteCustomLoadout,
  exportLoadoutCode,
  importLoadoutCode,
  getSavedCompareWeaponIds,
  saveCompareWeaponIds,
  calculateWikiWeaponTTK,
  PRESET_LOADOUTS
} from '../../utils/theFinalsEquipmentApi.js'
import { useToast } from '../../composables/useToast.js'
import {
  beginLobbyReturnTransition,
  hasLuluDisplayTransition,
  prepareLuluDisplayArrival,
  placeGlobalLuluInDisplayTarget,
  settleLuluDisplayTransition,
  animateDisplayHeaderCopy,
  TOURNAMENT_DISPLAY_REVEAL_DURATION
} from '../../utils/globalLuluTransition.js'

export default {
  setup() {
    const router = useRouter()
    const route = useRoute()
    const { showToast } = useToast()

    const equipmentRootRef = ref(null)
    const isEquipmentArrival = ref(false)
    let isReturningToLobby = false
    let lobbyReturnTimeline = null
    let entranceTimer = null

    // 主选项卡 (无 Emoji)
    const mainTabs = [
      { key: 'armory', label: '军械百科' },
      { key: 'compare', label: '枪械对比' },
      { key: 'builder', label: '配装实验室' },
      { key: 'presets', label: '天梯热门推荐' }
    ]
    const currentMainTab = ref('armory')

    // 筛选状态 (无 Emoji)
    const selectedBuild = ref('all')
    const selectedCategory = ref('all')
    const searchKeyword = ref('')
    const selectedSortBy = ref('default')

    const buildFilterOptions = [
      { key: 'all', label: '全部职业', hp: '' },
      { key: 'Light', label: '轻型 (LIGHT)', hp: '150 HP' },
      { key: 'Medium', label: '中型 (MEDIUM)', hp: '250 HP' },
      { key: 'Heavy', label: '重型 (HEAVY)', hp: '350 HP' }
    ]

    const categoryFilterOptions = [
      { key: 'all', label: '全部类别' },
      { key: 'weapons', label: '主武器' },
      { key: 'specializations', label: '特殊能力' },
      { key: 'gadgets', label: '战术道具' }
    ]

    // 检视器
    const activeInspectorItem = ref(null)

    // 武器对比列表 (最多3把)
    const compareWeaponIds = ref(getSavedCompareWeaponIds())

    // 网络与 Wiki 同步状态
    const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
    const isSyncing = ref(false)
    const lastSyncTime = ref(getLastSyncTime())

    // 配装模拟器状态
    const currentBuilderBuild = ref('Medium')
    const currentLoadoutTitle = ref('我的自定义配装')
    const activeBuilderSpecialization = ref(null)
    const activeBuilderWeapon = ref(null)
    const activeBuilderGadgets = ref([null, null, null])
    const savedCustomLoadouts = ref([])

    // 槽位弹窗状态
    const isSlotPickerOpen = ref(false)
    const currentPickingSlotType = ref('specialization')
    const currentPickingGadgetIndex = ref(0)
    const pickerSearchKeyword = ref('')

    // 计算属性
    const rawEquipmentData = computed(() => getEquipmentData())
    const totalEquipmentCount = computed(() => rawEquipmentData.value?.items?.length || 86)

    const filteredEquipmentList = computed(() => {
      return filterEquipment({
        build: selectedBuild.value,
        category: selectedCategory.value,
        search: searchKeyword.value,
        sortBy: selectedSortBy.value
      })
    })

    const compareWeaponList = computed(() => {
      return compareWeaponIds.value
        .map(id => getEquipmentById(id))
        .filter(Boolean)
    })

    const syncStatusLabel = computed(() => {
      if (isSyncing.value) return '正在连接 Wiki 同步最新数据...'
      if (!isOnline.value) return '离线模式 (使用本地最新缓存)'
      return `Wiki 数据已同步 (${formatSyncTime(lastSyncTime.value)})`
    })

    // Wiki 标准 Damage Profile 获取函数 (100% 具备本地数学与帧率兜底)
    const getWeaponProfileShots = (weapon, hitType, buildKey) => {
      if (!weapon) return '—'
      const res = calculateWikiWeaponTTK(weapon, hitType, buildKey)
      return res.shots !== undefined && res.shots !== '—' ? `${res.shots} 发` : '—'
    }

    const getWeaponProfileTTK = (weapon, hitType, buildKey) => {
      if (!weapon) return '—'
      const res = calculateWikiWeaponTTK(weapon, hitType, buildKey)
      return res.ttk || '—'
    }

    // 配装协同能力雷达计算
    const calculatedSynergy = computed(() => {
      const b = currentBuilderBuild.value
      let mobility = b === 'Light' ? 85 : (b === 'Medium' ? 65 : 40)
      let firepower = b === 'Light' ? 75 : (b === 'Medium' ? 80 : 90)
      let support = b === 'Light' ? 40 : (b === 'Medium' ? 85 : 60)
      let defense = b === 'Light' ? 30 : (b === 'Medium' ? 65 : 95)

      // 特殊能力加成
      if (activeBuilderSpecialization.value) {
        const specName = activeBuilderSpecialization.value.name
        if (specName === 'Evasive Dash' || specName === 'Grappling Hook') mobility += 15
        if (specName === 'Healing Beam') support += 20
        if (specName === 'Mesh Shield' || specName === 'Goo Gun') defense += 15
        if (specName === 'Charge \'N\' Slam' || specName === 'Winch Claw') firepower += 10
      }

      // 道具加成
      activeBuilderGadgets.value.filter(Boolean).forEach(g => {
        if (g.name === 'Defibrillator') support += 15
        if (g.name === 'Jump Pad' || g.name === 'Gateway' || g.name === 'Zipline') mobility += 10
        if (g.name === 'Dome Shield' || g.name === 'Barricade' || g.name === 'APS Turret') defense += 10
        if (g.name === 'RPG-7' || g.name === 'C4' || g.name === 'Explosive Mine') firepower += 10
      })

      return {
        mobility: Math.min(100, mobility),
        firepower: Math.min(100, firepower),
        support: Math.min(100, support),
        defense: Math.min(100, defense)
      }
    })

    const pickerSlotTitle = computed(() => {
      if (currentPickingSlotType.value === 'specialization') return '特殊能力'
      if (currentPickingSlotType.value === 'weapon') return '主武器'
      return `战术道具 (槽位 ${currentPickingGadgetIndex.value + 1})`
    })

    const availablePickerItems = computed(() => {
      const type = currentPickingSlotType.value
      const targetCategory = type === 'specialization' ? 'specializations' : (type === 'weapon' ? 'weapons' : 'gadgets')
      return filterEquipment({
        build: currentBuilderBuild.value,
        category: targetCategory,
        search: pickerSearchKeyword.value
      })
    })

    // 对比相关操作
    const isInCompare = (weaponId) => {
      return compareWeaponIds.value.includes(weaponId)
    }

    const toggleCompareWeapon = (weapon) => {
      if (!weapon) return
      const idx = compareWeaponIds.value.indexOf(weapon.id)
      if (idx >= 0) {
        compareWeaponIds.value.splice(idx, 1)
        saveCompareWeaponIds(compareWeaponIds.value)
        showToast(`已将 [${weapon.name}] 从对比列表移除`)
      } else {
        if (compareWeaponIds.value.length >= 3) {
          showToast('对比列表最多支持 3 把武器，请先移除一把', 'none')
          return
        }
        compareWeaponIds.value.push(weapon.id)
        saveCompareWeaponIds(compareWeaponIds.value)
        showToast(`已加入对比列表 (${compareWeaponIds.value.length}/3)`, 'success')
      }
    }

    const removeFromCompare = (weaponId) => {
      compareWeaponIds.value = compareWeaponIds.value.filter(id => id !== weaponId)
      saveCompareWeaponIds(compareWeaponIds.value)
    }

    const clearCompareList = () => {
      compareWeaponIds.value = []
      saveCompareWeaponIds([])
      showToast('已清空对比列表')
    }

    // 辅助函数
    const getBuildBadgeLabel = (build = '') => {
      if (build === 'Light') return '轻型 (LIGHT)'
      if (build === 'Medium') return '中型 (MEDIUM)'
      if (build === 'Heavy') return '重型 (HEAVY)'
      return '通用 (ALL)'
    }

    const getCategoryBadgeLabel = (cat = '') => {
      if (cat === 'weapons') return '主武器'
      if (cat === 'specializations') return '特殊能力'
      return '战术道具'
    }

    const inspectItem = (item) => {
      activeInspectorItem.value = item
    }

    const resetFilters = () => {
      selectedBuild.value = 'all'
      selectedCategory.value = 'all'
      searchKeyword.value = ''
      selectedSortBy.value = 'default'
    }

    const handleImgError = (event, item) => {
      event.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23222" width="100" height="100"/><text fill="%23e11d48" font-size="28" font-family="sans-serif" x="50%" y="55%" text-anchor="middle">TF</text></svg>'
    }

    // 手动与自动网络同步
    const handleManualSync = async () => {
      if (isSyncing.value) return
      isSyncing.value = true
      showToast('正在连接 THE FINALS Wiki 同步最新装备补丁...', 'none')

      try {
        const res = await syncEquipmentFromWiki()
        lastSyncTime.value = res.lastUpdated
        showToast(`Wiki 数据已更新，成功同步 ${res.itemCount} 件装备属性！`, 'success')
      } catch (err) {
        showToast('连接 Wiki 超时，已切换至本地最新离线数据', 'none')
      } finally {
        isSyncing.value = false
      }
    }

    // 复制装备数据
    const copyEquipmentSummary = async (item) => {
      if (!item) return
      const text = `【THE FINALS 装备档案】${item.name} (${item.nameZh}) | 职业: ${item.build} | 类别: ${getCategoryBadgeLabel(item.category)} | 伤害: ${item.stats?.damage || '—'} | DPS: ${item.stats?.dps || '—'} | 弹匣: ${item.stats?.magazine || '—'}`
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text)
        }
        showToast(`已复制 [${item.name}] 战术数据`, 'success')
      } catch {
        showToast('复制失败', 'none')
      }
    }

    // 配装模拟器操作
    const switchBuilderBuild = (b) => {
      currentBuilderBuild.value = b
      if (activeBuilderSpecialization.value && activeBuilderSpecialization.value.build !== b) {
        activeBuilderSpecialization.value = null
      }
      if (activeBuilderWeapon.value && activeBuilderWeapon.value.build !== b) {
        activeBuilderWeapon.value = null
      }
      activeBuilderGadgets.value = activeBuilderGadgets.value.map(g => {
        if (!g) return null
        if (g.build !== 'All' && g.build !== b && !(g.build === 'Medium & Heavy' && (b === 'Medium' || b === 'Heavy'))) {
          return null
        }
        return g
      })
    }

    const loadItemIntoBuilder = (item) => {
      currentMainTab.value = 'builder'
      if (item.build !== 'All' && item.build !== 'Medium & Heavy' && item.build !== currentBuilderBuild.value) {
        currentBuilderBuild.value = item.build
      }
      if (item.category === 'specializations') {
        activeBuilderSpecialization.value = item
      } else if (item.category === 'weapons') {
        activeBuilderWeapon.value = item
      } else if (item.category === 'gadgets') {
        const emptyIdx = activeBuilderGadgets.value.findIndex(g => g === null)
        if (emptyIdx >= 0) {
          activeBuilderGadgets.value[emptyIdx] = item
        } else {
          activeBuilderGadgets.value[0] = item
        }
      }
      showToast(`已将 [${item.name}] 载入配装器`, 'success')
    }

    const openSlotPicker = (type, gadgetIdx = 0) => {
      currentPickingSlotType.value = type
      currentPickingGadgetIndex.value = gadgetIdx
      pickerSearchKeyword.value = ''
      isSlotPickerOpen.value = true
    }

    const selectItemForSlot = (item) => {
      if (currentPickingSlotType.value === 'specialization') {
        activeBuilderSpecialization.value = item
      } else if (currentPickingSlotType.value === 'weapon') {
        activeBuilderWeapon.value = item
      } else if (currentPickingSlotType.value === 'gadget') {
        activeBuilderGadgets.value[currentPickingGadgetIndex.value] = item
      }
      isSlotPickerOpen.value = false
      showToast(`已选择 [${item.name}]`, 'success')
    }

    const removeGadgetSlot = (idx) => {
      activeBuilderGadgets.value[idx] = null
    }

    const handleResetBuilder = () => {
      activeBuilderSpecialization.value = null
      activeBuilderWeapon.value = null
      activeBuilderGadgets.value = [null, null, null]
      showToast('已清空配装槽位')
    }

    const handleSaveCurrentLoadout = () => {
      const entry = {
        build: currentBuilderBuild.value,
        title: currentLoadoutTitle.value.trim() || `${currentBuilderBuild.value} 配装`,
        specialization: activeBuilderSpecialization.value?.id || '',
        weapon: activeBuilderWeapon.value?.id || '',
        gadgets: activeBuilderGadgets.value.filter(Boolean).map(g => g.id),
        reserve: []
      }
      saveCustomLoadout(entry)
      refreshSavedLoadouts()
      showToast('配装已成功保存至本地！', 'success')
    }

    const refreshSavedLoadouts = () => {
      savedCustomLoadouts.value = getCustomLoadouts()
    }

    const handleDeleteSavedLoadout = (id) => {
      deleteCustomLoadout(id)
      refreshSavedLoadouts()
      showToast('已删除配装存档')
    }

    const applySavedLoadout = (loadout) => {
      currentBuilderBuild.value = loadout.build || 'Medium'
      currentLoadoutTitle.value = loadout.title || '自定义配装'
      activeBuilderSpecialization.value = getEquipmentById(loadout.specialization)
      activeBuilderWeapon.value = getEquipmentById(loadout.weapon)
      activeBuilderGadgets.value = (loadout.gadgets || []).map(gId => getEquipmentById(gId)).concat([null, null, null]).slice(0, 3)
      currentMainTab.value = 'builder'
      showToast(`已加载配装 [${loadout.title}]`, 'success')
    }

    const applyPreset = (preset) => {
      currentBuilderBuild.value = preset.build
      currentLoadoutTitle.value = preset.title
      activeBuilderSpecialization.value = getEquipmentById(preset.specialization)
      activeBuilderWeapon.value = getEquipmentById(preset.weapon)
      activeBuilderGadgets.value = preset.gadgets.map(id => getEquipmentById(id))
      currentMainTab.value = 'builder'
      showToast(`已应用天梯热门配装 [${preset.title}]`, 'success')
    }

    const handleExportLoadoutCode = async () => {
      const code = exportLoadoutCode({
        build: currentBuilderBuild.value,
        title: currentLoadoutTitle.value,
        specialization: activeBuilderSpecialization.value?.id,
        weapon: activeBuilderWeapon.value?.id,
        gadgets: activeBuilderGadgets.value.filter(Boolean).map(g => g.id),
        reserve: []
      })
      if (!code) return
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code)
        }
        showToast('配装分享码已复制到剪贴板，可发给组队队友！', 'success')
      } catch {
        showToast(`分享码: ${code}`, 'none')
      }
    }

    const copyPresetCode = async (preset) => {
      const code = exportLoadoutCode(preset)
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code)
        }
        showToast(`已复制 [${preset.title}] 分享码`, 'success')
      } catch {
        showToast('复制失败', 'none')
      }
    }

    // 网络状态监听
    const updateOnlineStatus = () => {
      isOnline.value = navigator.onLine
      if (isOnline.value) {
        handleManualSync()
      }
    }

    onMounted(() => {
      refreshSavedLoadouts()
      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)

      // 默认选中 AKM 展示检视器
      const defaultItem = getEquipmentById('akm') || filteredEquipmentList.value[0]
      if (defaultItem) {
        activeInspectorItem.value = defaultItem
      }

      // 自动联网轻量同步
      if (navigator.onLine) {
        syncEquipmentFromWiki().catch(() => {})
      }

      isEquipmentArrival.value = hasLuluDisplayTransition('equipment')
      if (isEquipmentArrival.value) {
        prepareLuluDisplayArrival({ target: 'equipment', root: equipmentRootRef.value })
      }

      entranceTimer = setTimeout(() => {
        if (isEquipmentArrival.value) {
          settleLuluDisplayTransition({
            id: 'equipment',
            target: 'equipment',
            root: equipmentRootRef.value,
            onComplete: () => {
              isEquipmentArrival.value = false
            }
          })
          animateDisplayHeaderCopy(equipmentRootRef.value, { arrival: true })
          gsap.fromTo('.equipment-body-scroll',
            { autoAlpha: 0, y: 24 },
            { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out', delay: 0.18, clearProps: 'all' }
          )
        } else {
          placeGlobalLuluInDisplayTarget(equipmentRootRef.value, { target: 'equipment' })
          animateDisplayHeaderCopy(equipmentRootRef.value, { arrival: false })
        }
      }, 70)
    })

    onUnmounted(() => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      if (entranceTimer) clearTimeout(entranceTimer)
      lobbyReturnTimeline?.kill()
    })

    const goBack = () => {
      if (isReturningToLobby) return
      const navigateHome = () => router.push('/')
      const root = equipmentRootRef.value
      const header = root?.querySelector('.hud-header')
      const headerLeft = root?.querySelector('.header-left')
      const headerRight = root?.querySelector('.header-right')
      root?.classList.add('tournament-leaving')

      isReturningToLobby = true
      let transitionStarted = false
      lobbyReturnTimeline = gsap.timeline({ defaults: { overwrite: 'auto' } })
        .call(() => {
          transitionStarted = beginLobbyReturnTransition('equipment')
          if (!transitionStarted) navigateHome()
        }, null, 0)
        .to(headerLeft ? [headerLeft] : [], {
          xPercent: -105,
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power3.inOut'
        }, 0)
        .to(headerRight ? [headerRight] : [], {
          xPercent: 105,
          autoAlpha: 0,
          duration: 0.4,
          ease: 'power3.inOut'
        }, 0)
        .to(header ? [header] : [], {
          height: root?.clientHeight || window.innerHeight,
          minHeight: root?.clientHeight || window.innerHeight,
          duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
          ease: 'power3.inOut'
        }, 0)
        .call(() => {
          if (transitionStarted) navigateHome()
        }, null, TOURNAMENT_DISPLAY_REVEAL_DURATION + 0.04)
    }

    return {
      equipmentRootRef, isEquipmentArrival, goBack,
      mainTabs, currentMainTab,
      selectedBuild, selectedCategory, searchKeyword, selectedSortBy,
      buildFilterOptions, categoryFilterOptions,
      totalEquipmentCount, filteredEquipmentList, activeInspectorItem, inspectItem, resetFilters,
      isOnline, isSyncing, lastSyncTime, syncStatusLabel, formatSyncTime, handleManualSync,
      currentBuilderBuild, currentLoadoutTitle, activeBuilderSpecialization, activeBuilderWeapon, activeBuilderGadgets,
      calculatedSynergy, savedCustomLoadouts, PRESET_LOADOUTS,
      isSlotPickerOpen, pickerSlotTitle, availablePickerItems, pickerSearchKeyword,
      compareWeaponIds, compareWeaponList, isInCompare, toggleCompareWeapon, removeFromCompare, clearCompareList,
      getBuildBadgeLabel, getCategoryBadgeLabel, handleImgError, copyEquipmentSummary,
      getWeaponProfileShots, getWeaponProfileTTK,
      switchBuilderBuild, loadItemIntoBuilder, openSlotPicker, selectItemForSlot, removeGadgetSlot,
      handleResetBuilder, handleSaveCurrentLoadout, handleDeleteSavedLoadout, applySavedLoadout, applyPreset,
      handleExportLoadoutCode, copyPresetCode, getEquipmentById
    }
  }
}
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background: #141217;
  color: #ffffff;
  font-family: var(--font-sans);
}

.container.equipment-arrival {
  background: transparent;
}

.equipment-arrival .hud-header {
  z-index: auto;
  border-color: transparent;
  border-left-color: transparent;
  background: transparent;
}

.equipment-arrival .header-left {
  transform: translateX(-105vw);
  opacity: 0;
  visibility: hidden;
}

.equipment-arrival .header-right {
  transform: translateX(105vw);
  opacity: 0;
  visibility: hidden;
}

.equipment-arrival .equipment-body-scroll {
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

/* 顶部 HUD Header */
.hud-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 28px;
  height: 112px;
  min-height: 112px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background: transparent;
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
  gap: 16px;
}

/* 主 Tab 切换器 (干净直角电竞风格) */
.hud-tab-switcher {
  display: flex;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 3px;
  gap: 4px;
}

.hud-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hud-tab-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.hud-tab-btn.active {
  background: #d71442;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(215, 20, 66, 0.45);
}

.tab-count-badge {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 10px;
  padding: 1px 5px;
  font-weight: 850;
  color: #fbbf24;
}

/* 同步状态小部件 */
.wiki-sync-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 5px 10px;
}

.sync-status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
  display: inline-block;
}

.pulse-dot.yellow {
  background: #fbbf24;
  box-shadow: 0 0 8px #fbbf24;
}

.pulse-dot.gray {
  background: #9ca3af;
  box-shadow: none;
}

.sync-status-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  font-weight: 700;
  white-space: nowrap;
}

.btn-manual-sync {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-manual-sync:hover:not(:disabled) {
  background: #d71442;
  border-color: #d71442;
}

.sync-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* 主内容滚动区 (修复窗口状态下的溢出与滚轮失效问题) */
.equipment-body-scroll {
  flex: 1 1 0%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 24px 40px;
  scrollbar-width: thin;
  scrollbar-color: rgba(239, 23, 78, 0.35) rgba(0, 0, 0, 0.2);
}

.equipment-body-scroll::-webkit-scrollbar {
  width: 6px;
}

.equipment-body-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.equipment-body-scroll::-webkit-scrollbar-thumb {
  background: rgba(239, 23, 78, 0.4);
  border-radius: 3px;
}

.equipment-container-inner {
  max-width: 1520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 标题区 */
.command-flow-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 12px;
}

.command-eyebrow {
  font-size: 11px;
  font-weight: 850;
  color: #ef174e;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.room-hero-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}

.room-hero-title h2 {
  font-size: 22px;
  font-weight: 900;
  margin: 0;
  color: #ffffff;
}

.badge-stage-tag {
  background: rgba(239, 23, 78, 0.15);
  border: 1px solid #ef174e;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
}

.equipment-stats-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}

/* 筛选与搜索卡片 */
.filter-controls-card {
  background: rgba(24, 21, 28, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 14px;
}

.filter-group-label {
  font-size: 11px;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.06em;
  min-width: 130px;
}

.filter-pills-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-pill-btn:hover {
  border-color: rgba(255, 255, 255, 0.35);
  color: #ffffff;
}

.filter-pill-btn.active {
  background: #d71442;
  border-color: #d71442;
  color: #ffffff;
  box-shadow: 0 0 10px rgba(215, 20, 66, 0.4);
}

.filter-pill-btn.pill-light.active {
  background: #0284c7;
  border-color: #38bdf8;
}

.filter-pill-btn.pill-medium.active {
  background: #d97706;
  border-color: #fbbf24;
}

.filter-pill-btn.pill-heavy.active {
  background: #b91c1c;
  border-color: #f87171;
}

.pill-hp {
  font-size: 10px;
  background: rgba(0, 0, 0, 0.35);
  padding: 1px 5px;
  opacity: 0.85;
}

.search-and-sort-row {
  display: flex;
  gap: 14px;
  margin-top: 2px;
}

.search-input-field {
  flex: 1;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0 12px;
}

.input-search-text {
  font-size: 10px;
  font-weight: 850;
  color: #ef174e;
  letter-spacing: 0.08em;
  margin-right: 10px;
}

.main-search-input {
  flex: 1;
  height: 36px;
  background: transparent;
  border: 0;
  color: #ffffff;
  font-size: 13px;
  outline: none;
}

.main-search-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.input-clear-btn {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
}

.sort-select-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0 12px;
}

.sort-label {
  font-size: 10px;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.5);
}

.sort-select-control {
  background: transparent;
  border: 0;
  color: #ffffff;
  font-size: 12px;
  font-weight: 750;
  outline: none;
  cursor: pointer;
}

.sort-select-control option {
  background: #1f1d24;
  color: #ffffff;
}

/* 百科左右分栏 */
.armory-split-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 18px;
  align-items: start;
}

/* 装备卡片网格 */
.equipment-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}

.equip-card {
  position: relative;
  background: rgba(26, 23, 31, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.equip-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.equip-card.active-selected {
  border-color: #ef174e;
  background: rgba(239, 23, 78, 0.08);
  box-shadow: 0 0 16px rgba(239, 23, 78, 0.35);
}

.equip-card-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topbar-right-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.build-tag {
  font-size: 10px;
  font-weight: 850;
  padding: 2px 6px;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.build-tag.tag-light {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border-left: 2px solid #38bdf8;
}

.build-tag.tag-medium {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border-left: 2px solid #fbbf24;
}

.build-tag.tag-heavy {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  border-left: 2px solid #f87171;
}

.category-tag {
  font-size: 10px;
  font-weight: 750;
  color: rgba(255, 255, 255, 0.5);
}

.btn-card-compare {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-card-compare:hover {
  background: #d71442;
  border-color: #d71442;
}

.btn-card-compare.in-compare {
  background: #34d399;
  border-color: #34d399;
  color: #0d0a0c;
}

.equip-thumb-box {
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0.3) 100%);
  padding: 6px;
}

.equip-thumb-img {
  max-height: 78px;
  max-width: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.6));
  transition: transform 0.2s ease;
}

.equip-card:hover .equip-thumb-img {
  transform: scale(1.06);
}

.equip-info-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.equip-name-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.equip-title {
  font-size: 14px;
  font-weight: 900;
  color: #ffffff;
}

.equip-role {
  font-size: 10px;
  color: #ef174e;
  font-weight: 800;
}

.equip-zh-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.equip-mini-stats {
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.35);
  padding: 5px 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.mini-stat-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mini-stat-cell.full-width-stat {
  align-items: flex-start;
}

.stat-lbl {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 750;
}

.stat-val {
  font-size: 11px;
  font-weight: 850;
  color: #ffffff;
}

.stat-highlight {
  color: #fbbf24;
}

.card-hover-action {
  font-size: 11px;
  font-weight: 850;
  color: #ef174e;
  text-align: right;
  opacity: 0.65;
  transition: opacity 0.15s ease;
}

.equip-card:hover .card-hover-action {
  opacity: 1;
}

/* 右侧检视面板 (带滚动与固定视口) */
.tactical-inspector-sidebar {
  position: sticky;
  top: 10px;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(239, 23, 78, 0.4) transparent;
}

.tactical-inspector-sidebar::-webkit-scrollbar {
  width: 5px;
}

.tactical-inspector-sidebar::-webkit-scrollbar-thumb {
  background: rgba(239, 23, 78, 0.4);
  border-radius: 4px;
}

.inspector-card {
  background: rgba(24, 21, 28, 0.95);
  border: 1px solid rgba(239, 23, 78, 0.35);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
}

.inspector-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.inspector-eyebrow {
  font-size: 10px;
  font-weight: 850;
  color: #ef174e;
  letter-spacing: 0.1em;
}

.inspector-main-title {
  font-size: 20px;
  font-weight: 950;
  color: #ffffff;
  margin: 2px 0 0;
}

.inspector-zh-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.btn-inspector-close {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  cursor: pointer;
}

.inspector-banner-box {
  position: relative;
  height: 100px;
  background: radial-gradient(circle, rgba(239, 23, 78, 0.1) 0%, rgba(0, 0, 0, 0.5) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.inspector-full-img {
  max-height: 84px;
  max-width: 90%;
  object-fit: contain;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.8));
}

.inspector-glow-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
}

.badge-build-hero {
  font-size: 10px;
  font-weight: 850;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.6);
}

.inspector-quote-box {
  background: rgba(0, 0, 0, 0.35);
  border-left: 2px solid #ef174e;
  padding: 8px 10px;
}

.quote-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  line-height: 1.4;
}

/* Wiki 官方标准 Damage Profile 击杀表格 */
.inspector-wiki-profile-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px;
}

.profile-section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.ttk-subtitle {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.wiki-table-matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.wiki-table-matrix th {
  background: rgba(255, 255, 255, 0.05);
  padding: 5px 3px;
  text-align: center;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.wiki-table-matrix th.th-part {
  text-align: left;
  padding-left: 6px;
  width: 84px;
}

.wiki-table-matrix th.th-light {
  color: #38bdf8;
}

.wiki-table-matrix th.th-medium {
  color: #fbbf24;
}

.wiki-table-matrix th.th-heavy {
  color: #f87171;
}

.wiki-table-matrix td {
  padding: 5px 3px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.wiki-table-matrix td.td-part {
  text-align: left;
  padding-left: 6px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.2);
}

.dmg-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.cell-shots {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}

.cell-ttk {
  font-size: 12px;
  font-weight: 900;
  color: #ffffff;
}

.wiki-calc-footnote {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.38);
  line-height: 1.3;
}

.matrix-title, .tips-title {
  font-size: 11px;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.06em;
  margin: 0 0 6px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.matrix-stat-item {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 5px 7px;
  display: flex;
  flex-direction: column;
}

.m-lbl {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.45);
}

.m-val {
  font-size: 12px;
  font-weight: 850;
  color: #ffffff;
}

.text-gold {
  color: #fbbf24;
}

.text-red {
  color: #f87171;
}

.tips-list {
  margin: 0;
  padding-left: 14px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.inspector-actions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.btn-inspector-primary {
  flex: 1 1 100%;
  padding: 8px;
  background: #d71442;
  border: 0;
  color: #ffffff;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-inspector-primary:hover {
  background: #ef174e;
  box-shadow: 0 0 12px rgba(239, 23, 78, 0.5);
}

.btn-inspector-compare {
  flex: 1;
  padding: 6px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid #38bdf8;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 850;
  cursor: pointer;
}

.btn-inspector-compare:hover {
  background: #38bdf8;
  color: #0d0a0c;
}

.btn-inspector-secondary {
  flex: 1;
  padding: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.btn-inspector-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-inspector-wiki {
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #38bdf8;
  font-size: 11px;
  font-weight: 850;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.inspector-placeholder {
  background: rgba(24, 21, 28, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  padding: 36px 20px;
  text-align: center;
}

.placeholder-title {
  font-size: 15px;
  font-weight: 850;
  margin: 0 0 6px;
}

.placeholder-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
}

/* ================= 枪械对比视图样式 ================= */
.compare-workspace-card {
  background: rgba(24, 21, 28, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.compare-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 14px;
}

.compare-main-title {
  font-size: 18px;
  font-weight: 950;
  color: #ffffff;
  margin: 0 0 4px;
}

.compare-sub-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.compare-header-actions {
  display: flex;
  gap: 10px;
}

.btn-clear-compare {
  background: transparent;
  border: 1px solid rgba(239, 23, 78, 0.4);
  color: #ef174e;
  font-size: 12px;
  font-weight: 800;
  padding: 5px 12px;
  cursor: pointer;
}

.btn-go-armory {
  background: #d71442;
  border: 0;
  color: #ffffff;
  font-size: 12px;
  font-weight: 850;
  padding: 5px 12px;
  cursor: pointer;
}

.empty-compare-box {
  background: rgba(0, 0, 0, 0.35);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  padding: 50px 20px;
  text-align: center;
}

.empty-c-title {
  font-size: 17px;
  font-weight: 900;
  margin: 0 0 6px;
}

.empty-c-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  max-width: 480px;
  margin: 0 auto 16px;
  line-height: 1.5;
}

.btn-primary-add {
  background: #d71442;
  border: 0;
  color: #ffffff;
  font-size: 12px;
  font-weight: 850;
  padding: 7px 18px;
  cursor: pointer;
}

.compare-matrix-wrapper {
  overflow-x: auto;
}

.compare-columns-container {
  display: grid;
  gap: 14px;
}

.compare-weapon-col {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-top: 3px solid #ef174e;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.compare-weapon-col.border-light {
  border-top-color: #38bdf8;
}

.compare-weapon-col.border-medium {
  border-top-color: #fbbf24;
}

.compare-weapon-col.border-heavy {
  border-top-color: #f87171;
}

.c-weapon-header {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.btn-remove-compare {
  position: absolute;
  top: 0;
  right: 0;
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  cursor: pointer;
}

.btn-remove-compare:hover {
  color: #ef174e;
}

.c-thumb-wrap {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.c-weapon-img {
  max-height: 72px;
  max-width: 90%;
  object-fit: contain;
}

.c-weapon-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.c-build-tag {
  font-size: 10px;
  font-weight: 850;
  padding: 2px 6px;
}

.c-name {
  font-size: 16px;
  font-weight: 950;
  color: #ffffff;
}

.c-name-zh {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.c-metrics-block {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.c-block-heading {
  font-size: 10px;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.45);
  margin: 0 0 3px;
  letter-spacing: 0.05em;
}

.c-metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  padding-bottom: 3px;
}

.c-m-label {
  color: rgba(255, 255, 255, 0.55);
}

.c-m-value {
  font-weight: 850;
  color: #ffffff;
}

.c-ttk-block {
  gap: 8px;
}

.c-ttk-target-box {
  background: rgba(0, 0, 0, 0.35);
  border-left: 2px solid rgba(255, 255, 255, 0.2);
  padding: 5px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.c-target-head {
  font-size: 10px;
  font-weight: 850;
  color: #ffffff;
  margin-bottom: 2px;
}

.c-sub-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.65);
}

.btn-c-loadout {
  width: 100%;
  padding: 7px;
  background: #d71442;
  border: 0;
  color: #ffffff;
  font-size: 11px;
  font-weight: 850;
  cursor: pointer;
}

/* ================= 配装实验室样式 ================= */
.builder-workspace-card {
  background: rgba(24, 21, 28, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.builder-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 14px;
}

.build-type-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.builder-label {
  font-size: 11px;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.5);
}

.btn-build-toggle {
  padding: 5px 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-build-toggle.active {
  background: #d71442;
  border-color: #ef174e;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(215, 20, 66, 0.45);
}

.builder-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loadout-title-input {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 750;
  outline: none;
  min-width: 200px;
}

.btn-builder-save {
  background: #34d399;
  border: 0;
  color: #0d0a0c;
  font-size: 12px;
  font-weight: 850;
  padding: 6px 12px;
  cursor: pointer;
}

.btn-builder-export {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  padding: 5px 10px;
  cursor: pointer;
}

.btn-builder-reset {
  background: transparent;
  border: 1px solid rgba(239, 23, 78, 0.4);
  color: #ef174e;
  font-size: 12px;
  font-weight: 800;
  padding: 5px 10px;
  cursor: pointer;
}

.loadout-slots-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.6fr;
  gap: 16px;
}

.slot-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slot-badge-specialization {
  font-size: 11px;
  font-weight: 850;
  color: #a855f7;
}

.slot-badge-weapon {
  font-size: 11px;
  font-weight: 850;
  color: #38bdf8;
}

.slot-badge-gadget {
  font-size: 11px;
  font-weight: 850;
  color: #fbbf24;
}

.slot-hint {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.slot-card {
  position: relative;
  min-height: 105px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
}

.slot-card:hover {
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.6);
}

.slot-card.filled {
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.03);
}

.slot-icon-img {
  width: 54px;
  height: 54px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
}

.slot-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slot-name {
  font-size: 15px;
  font-weight: 900;
  color: #ffffff;
}

.slot-zh {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
}

.slot-desc-mini, .slot-stat-mini {
  font-size: 10px;
  color: #ef174e;
  font-weight: 750;
}

.btn-slot-clear {
  position: absolute;
  top: 6px;
  right: 6px;
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  cursor: pointer;
}

.btn-slot-clear:hover {
  color: #ef174e;
}

.slot-empty-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 800;
}

.empty-slot-plus {
  font-size: 20px;
  line-height: 1;
}

.gadgets-sub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mini-gadget-slot {
  min-height: 105px;
  flex-direction: column;
  text-align: center;
  padding: 8px;
}

.mini-gadget-slot .slot-icon-img {
  width: 38px;
  height: 38px;
}

.mini-gadget-slot .slot-name {
  font-size: 11px;
}

.mini-gadget-slot .slot-zh {
  font-size: 10px;
}

/* 协同雷达条 */
.loadout-analytics-bar {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.analytics-title-col {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.radar-title {
  font-size: 13px;
  font-weight: 900;
  color: #ffffff;
}

.radar-subtitle {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}

.synergy-bars-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.synergy-bar-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bar-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 750;
}

.bar-track {
  height: 5px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.mobility-fill {
  background: linear-gradient(90deg, #0284c7, #38bdf8);
}

.firepower-fill {
  background: linear-gradient(90deg, #dc2626, #f87171);
}

.support-fill {
  background: linear-gradient(90deg, #059669, #34d399);
}

.defense-fill {
  background: linear-gradient(90deg, #d97706, #fbbf24);
}

/* ================= 热门预设样式 ================= */
.meta-presets-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.presets-intro-banner {
  background: linear-gradient(135deg, rgba(215, 20, 66, 0.25) 0%, rgba(20, 18, 24, 0.85) 100%);
  border: 1px solid rgba(239, 23, 78, 0.3);
  padding: 16px 20px;
}

.presets-banner-title {
  font-size: 16px;
  font-weight: 900;
  margin: 0 0 4px;
  color: #ffffff;
}

.presets-banner-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.preset-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.preset-card {
  background: rgba(24, 21, 28, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;
}

.preset-card:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.preset-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preset-build-badge {
  font-size: 10px;
  font-weight: 850;
  padding: 2px 7px;
}

.preset-author {
  font-size: 10px;
  color: #ef174e;
  font-weight: 750;
}

.preset-name {
  font-size: 16px;
  font-weight: 950;
  color: #ffffff;
  margin: 0;
}

.preset-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
  line-height: 1.4;
}

.preset-items-lineup {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.lineup-item {
  display: flex;
  align-items: center;
  font-size: 11px;
}

.lineup-lbl {
  color: rgba(255, 255, 255, 0.45);
  min-width: 36px;
}

.lineup-val {
  color: #ffffff;
  font-weight: 800;
}

.lineup-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.lineup-tag {
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 5px;
  font-size: 10px;
  color: #ffffff;
}

.preset-card-footer {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.btn-apply-preset {
  flex: 2;
  background: #d71442;
  border: 0;
  color: #ffffff;
  font-size: 11px;
  font-weight: 850;
  padding: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-apply-preset:hover {
  background: #ef174e;
}

.btn-copy-preset {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

/* ================= 弹窗槽位选择器 ================= */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.picker-modal-card {
  width: 600px;
  max-width: 95vw;
  max-height: 80vh;
  background: #1c1922;
  border: 1px solid rgba(239, 23, 78, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 15px;
  font-weight: 900;
  color: #ffffff;
}

.modal-close {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
  cursor: pointer;
}

.picker-search-bar {
  padding: 10px 18px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.picker-search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  padding: 7px 10px;
  font-size: 12px;
  outline: none;
}

.picker-items-grid {
  flex: 1;
  overflow-y: auto;
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.picker-item-card:hover {
  background: rgba(239, 23, 78, 0.15);
  border-color: #ef174e;
}

.picker-thumb {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.picker-item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.p-name {
  font-size: 13px;
  font-weight: 850;
  color: #ffffff;
}

.p-zh {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.p-role {
  font-size: 10px;
  color: #ef174e;
  font-weight: 750;
}

.p-select-arrow {
  font-size: 11px;
  font-weight: 850;
  color: #ef174e;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 1180px) {
  .armory-split-layout {
    grid-template-columns: 1fr;
  }
  .tactical-inspector-sidebar {
    position: static;
    max-height: none;
    overflow-y: visible;
  }
  .loadout-slots-grid {
    grid-template-columns: 1fr;
  }
}
</style>
