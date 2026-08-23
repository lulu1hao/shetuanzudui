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
        <!-- 模块切换 (百科 / 配装器 / 热门推荐) -->
        <div class="hud-tab-switcher">
          <button
            v-for="tab in mainTabs"
            :key="tab.key"
            type="button"
            class="hud-tab-btn"
            :class="{ active: currentMainTab === tab.key }"
            @click="currentMainTab = tab.key"
          >
            <span>{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
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
              <h2>装备百科与配装实验室</h2>
              <span class="badge-stage-tag">{{ totalEquipmentCount }} 件全赛季装备</span>
            </div>
          </div>
          <div class="equipment-stats-badge">
            <span class="pulse-dot"></span>
            <span>全职业（轻型/中型/重型）数据源自 THE FINALS Wiki 实时直连</span>
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
                  <span class="pill-icon">{{ b.icon }}</span>
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
                  <span class="pill-icon">{{ c.icon }}</span>
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
                  placeholder="快速检索武器/道具名称（如: AKM, 除颤仪, 锁弹, RPG, 闪烁...）"
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
                <span class="empty-icon">🔍</span>
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
                  <span class="category-tag">{{ getCategoryBadgeLabel(item.category) }}</span>
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
                    <span class="stat-lbl">弹夹</span>
                    <strong class="stat-val">{{ item.stats?.magazine || '—' }}</strong>
                  </div>

                  <div v-if="item.category !== 'weapons'" class="mini-stat-cell full-width-stat">
                    <span class="stat-lbl">冷却 / 充能</span>
                    <strong class="stat-val">{{ item.stats?.cooldown || '—' }} ({{ item.stats?.charges || 1 }}次)</strong>
                  </div>
                </div>

                <div class="card-hover-action">
                  <span>战术检视 ➔</span>
                </div>
              </div>
            </div>

            <!-- 右侧：全息战术检视器 (TACTICAL INSPECTOR) -->
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

                <!-- 装备全息展示图 -->
                <div class="inspector-banner-box">
                  <img :src="activeInspectorItem.imageUrl" :alt="activeInspectorItem.name" class="inspector-full-img" />
                  <div class="inspector-glow-badge">
                    <span class="badge-build-hero" :class="`tag-${activeInspectorItem.build.toLowerCase().replace(/[^a-z]/g, '')}`">
                      {{ getBuildBadgeLabel(activeInspectorItem.build) }} · {{ getCategoryBadgeLabel(activeInspectorItem.category) }}
                    </span>
                  </div>
                </div>

                <!-- 引言与战术定位 -->
                <div class="inspector-quote-box">
                  <p class="quote-text">“{{ activeInspectorItem.description || activeInspectorItem.descZh }}”</p>
                  <p v-if="activeInspectorItem.descZh && activeInspectorItem.description !== activeInspectorItem.descZh" class="desc-zh-text">
                    {{ activeInspectorItem.descZh }}
                  </p>
                </div>

                <!-- 完整数据矩阵 (MediaWiki 官方实测数值) -->
                <div class="inspector-stats-matrix">
                  <h4 class="matrix-title">WIKI 核心战斗参数</h4>
                  <div class="stats-grid">
                    <div class="matrix-stat-item">
                      <span class="m-lbl">基础伤害</span>
                      <strong class="m-val">{{ activeInspectorItem.stats?.damage || '—' }}</strong>
                    </div>
                    <div class="matrix-stat-item">
                      <span class="m-lbl">爆头倍率 (Crit)</span>
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
                  <h4 class="tips-title">💡 战术协同指南</h4>
                  <ul class="tips-list">
                    <li v-for="(tip, idx) in activeInspectorItem.tips" :key="idx">{{ tip }}</li>
                  </ul>
                </div>

                <!-- 交互操作按钮栏 -->
                <div class="inspector-actions-bar">
                  <button type="button" class="btn-inspector-primary" @click="loadItemIntoBuilder(activeInspectorItem)">
                    + 填入配装模拟器
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
                <div class="placeholder-icon">🎯</div>
                <h4 class="placeholder-title">点击左侧任意装备</h4>
                <p class="placeholder-desc">查看来自 THE FINALS Wiki 的高精度伤害曲线、爆头倍率、装填速率与实战克制技巧。</p>
              </div>
            </aside>
          </section>
        </template>

        <!-- ========================================================= -->
        <!-- 模块 2：自由配装实验室 (CONTESTANT LOADOUT BUILDER) -->
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
                    <span>{{ b === 'Light' ? '⚡ 轻型 (150 HP)' : (b === 'Medium' ? '🛡️ 中型 (250 HP)' : '🧱 重型 (350 HP)') }}</span>
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
                  <span class="slot-badge-specialization">✦ 特殊能力 (SPECIALIZATION)</span>
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
                  <span class="slot-badge-weapon">🔫 主武器 (WEAPON)</span>
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
                  <span class="slot-badge-gadget">💣 随身道具 (GADGETS)</span>
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
                  <button type="button" class="btn-apply-preset" @click="applySavedLoadout(loadout)">应用到配装器 ➔</button>
                </div>
              </div>
            </div>
          </section>
        </template>

        <!-- ========================================================= -->
        <!-- 模块 3：天梯热门竞技配装推荐 (COMPETITIVE META BUILDS) -->
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
                    {{ preset.build === 'Light' ? '⚡ 轻型' : (preset.build === 'Medium' ? '🛡️ 中型' : '🧱 重型') }}
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
                    载入配装器测试 ➔
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
            <span class="p-select-arrow">选择 ➔</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
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

    // 主选项卡
    const mainTabs = [
      { key: 'armory', label: '军械百科', icon: '📖' },
      { key: 'builder', label: '配装实验室', icon: '🛠️' },
      { key: 'presets', label: '天梯热门推荐', icon: '🔥' }
    ]
    const currentMainTab = ref('armory')

    // 筛选状态
    const selectedBuild = ref('all')
    const selectedCategory = ref('all')
    const searchKeyword = ref('')
    const selectedSortBy = ref('default')

    const buildFilterOptions = [
      { key: 'all', label: '全部职业', icon: '✦', hp: '' },
      { key: 'Light', label: '轻型 (Light)', icon: '⚡', hp: '150 HP' },
      { key: 'Medium', label: '中型 (Medium)', icon: '🛡️', hp: '250 HP' },
      { key: 'Heavy', label: '重型 (Heavy)', icon: '🧱', hp: '350 HP' }
    ]

    const categoryFilterOptions = [
      { key: 'all', label: '全部类别', icon: '✦' },
      { key: 'weapons', label: '主武器', icon: '🔫' },
      { key: 'specializations', label: '特殊能力', icon: '✨' },
      { key: 'gadgets', label: '战术道具', icon: '💣' }
    ]

    // 检视器
    const activeInspectorItem = ref(null)

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
    const currentPickingSlotType = ref('specialization') // 'specialization' | 'weapon' | 'gadget'
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

    const syncStatusLabel = computed(() => {
      if (isSyncing.value) return '正在连接 Wiki 同步最新数据...'
      if (!isOnline.value) return '离线模式 (使用本地最新缓存)'
      return `Wiki 数据已同步 (${formatSyncTime(lastSyncTime.value)})`
    })

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

    // 辅助函数
    const getBuildBadgeLabel = (build = '') => {
      if (build === 'Light') return '⚡ 轻型'
      if (build === 'Medium') return '🛡️ 中型'
      if (build === 'Heavy') return '🧱 重型'
      return '✦ 通用'
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
      const text = `【THE FINALS 装备档案】${item.name} (${item.nameZh}) | 职业: ${item.build} | 类别: ${getCategoryBadgeLabel(item.category)} | 伤害: ${item.stats?.damage || '—'} | DPS: ${item.stats?.dps || '—'} | 弹夹: ${item.stats?.magazine || '—'}`
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
      // 检查已填槽位是否兼容新体型
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

      // 默认选中第一件武器展示检视器
      const defaultItem = filteredEquipmentList.value[0]
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
      getBuildBadgeLabel, getCategoryBadgeLabel, handleImgError, copyEquipmentSummary,
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
  height: 100%;
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

/* 主 Tab 切换器 */
.hud-tab-switcher {
  display: flex;
  background: rgba(0, 0, 0, 0.35);
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

/* 同步状态小部件 */
.wiki-sync-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.35);
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

/* 主内容滚动区 */
.equipment-body-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 28px 48px;
}

.equipment-container-inner {
  max-width: 1480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 标题区 */
.command-flow-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 14px;
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
  gap: 14px;
  margin-top: 2px;
}

.room-hero-title h2 {
  font-size: 24px;
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
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 16px;
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
  padding: 6px 14px;
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
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 5px;
  border-radius: 2px;
  opacity: 0.85;
}

.search-and-sort-row {
  display: flex;
  gap: 16px;
  margin-top: 4px;
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
  height: 38px;
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
  grid-template-columns: 1fr 400px;
  gap: 20px;
  align-items: start;
}

/* 装备卡片网格 */
.equipment-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.equip-card {
  position: relative;
  background: rgba(26, 23, 31, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.equip-thumb-box {
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0.3) 100%);
  padding: 8px;
}

.equip-thumb-img {
  max-height: 84px;
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
  font-size: 15px;
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
  gap: 8px;
  background: rgba(0, 0, 0, 0.35);
  padding: 6px 8px;
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
  font-size: 12px;
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

/* 右侧检视面板 */
.tactical-inspector-sidebar {
  position: sticky;
  top: 0;
}

.inspector-card {
  background: rgba(24, 21, 28, 0.95);
  border: 1px solid rgba(239, 23, 78, 0.35);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  font-size: 22px;
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
  height: 140px;
  background: radial-gradient(circle, rgba(239, 23, 78, 0.1) 0%, rgba(0, 0, 0, 0.5) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.inspector-full-img {
  max-height: 120px;
  max-width: 90%;
  object-fit: contain;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.8));
}

.inspector-glow-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
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
  padding: 10px 12px;
}

.quote-text {
  font-size: 12px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.desc-zh-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin: 6px 0 0;
}

.matrix-title, .tips-title {
  font-size: 11px;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.06em;
  margin: 0 0 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.matrix-stat-item {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
}

.m-lbl {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}

.m-val {
  font-size: 13px;
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
  padding-left: 16px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inspector-actions-bar {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-inspector-primary {
  flex: 2;
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

.btn-inspector-secondary {
  flex: 1;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.btn-inspector-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-inspector-wiki {
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #38bdf8;
  font-size: 12px;
  font-weight: 850;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.inspector-placeholder {
  background: rgba(24, 21, 28, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  padding: 40px 24px;
  text-align: center;
}

.placeholder-icon {
  font-size: 32px;
  margin-bottom: 10px;
}

.placeholder-title {
  font-size: 16px;
  font-weight: 850;
  margin: 0 0 6px;
}

.placeholder-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
}

/* ================= 配装实验室样式 ================= */
.builder-workspace-card {
  background: rgba(24, 21, 28, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.builder-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 16px;
}

.build-type-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.builder-label {
  font-size: 11px;
  font-weight: 850;
  color: rgba(255, 255, 255, 0.5);
}

.btn-build-toggle {
  padding: 6px 14px;
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
  gap: 10px;
}

.loadout-title-input {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 750;
  outline: none;
  min-width: 220px;
}

.btn-builder-save {
  background: #34d399;
  border: 0;
  color: #0d0a0c;
  font-size: 12px;
  font-weight: 850;
  padding: 7px 14px;
  cursor: pointer;
}

.btn-builder-export {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  padding: 6px 12px;
  cursor: pointer;
}

.btn-builder-reset {
  background: transparent;
  border: 1px solid rgba(239, 23, 78, 0.4);
  color: #ef174e;
  font-size: 12px;
  font-weight: 800;
  padding: 6px 12px;
  cursor: pointer;
}

.loadout-slots-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.6fr;
  gap: 20px;
}

.slot-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  min-height: 120px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 14px;
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
  width: 64px;
  height: 64px;
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
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
}

.slot-zh {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.slot-desc-mini, .slot-stat-mini {
  font-size: 11px;
  color: #ef174e;
  font-weight: 750;
}

.btn-slot-clear {
  position: absolute;
  top: 8px;
  right: 8px;
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
  gap: 6px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 800;
}

.empty-slot-plus {
  font-size: 24px;
  line-height: 1;
}

.gadgets-sub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.mini-gadget-slot {
  min-height: 120px;
  flex-direction: column;
  text-align: center;
  padding: 10px;
}

.mini-gadget-slot .slot-icon-img {
  width: 44px;
  height: 44px;
}

.mini-gadget-slot .slot-name {
  font-size: 12px;
}

.mini-gadget-slot .slot-zh {
  font-size: 10px;
}

/* 协同雷达条 */
.loadout-analytics-bar {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.analytics-title-col {
  display: flex;
  flex-direction: column;
  min-width: 130px;
}

.radar-title {
  font-size: 14px;
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
  gap: 16px;
}

.synergy-bar-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 750;
}

.bar-track {
  height: 6px;
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
  gap: 20px;
}

.presets-intro-banner {
  background: linear-gradient(135deg, rgba(215, 20, 66, 0.25) 0%, rgba(20, 18, 24, 0.85) 100%);
  border: 1px solid rgba(239, 23, 78, 0.3);
  padding: 18px 24px;
}

.presets-banner-title {
  font-size: 18px;
  font-weight: 900;
  margin: 0 0 4px;
  color: #ffffff;
}

.presets-banner-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.preset-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.preset-card {
  background: rgba(24, 21, 28, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  font-size: 11px;
  font-weight: 850;
  padding: 2px 8px;
}

.preset-author {
  font-size: 11px;
  color: #ef174e;
  font-weight: 750;
}

.preset-name {
  font-size: 17px;
  font-weight: 950;
  color: #ffffff;
  margin: 0;
}

.preset-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
  line-height: 1.4;
}

.preset-items-lineup {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lineup-item {
  display: flex;
  align-items: center;
  font-size: 11px;
}

.lineup-lbl {
  color: rgba(255, 255, 255, 0.45);
  min-width: 40px;
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
  padding: 1px 6px;
  font-size: 10px;
  color: #ffffff;
}

.preset-card-footer {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-apply-preset {
  flex: 2;
  background: #d71442;
  border: 0;
  color: #ffffff;
  font-size: 12px;
  font-weight: 850;
  padding: 8px;
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
  font-size: 12px;
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
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
}

.modal-close {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  cursor: pointer;
}

.picker-search-bar {
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.picker-search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
}

.picker-items-grid {
  flex: 1;
  overflow-y: auto;
  padding: 14px 20px;
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
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.picker-item-card:hover {
  background: rgba(239, 23, 78, 0.15);
  border-color: #ef174e;
}

.picker-thumb {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.picker-item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.p-name {
  font-size: 14px;
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

@media (max-width: 1024px) {
  .armory-split-layout {
    grid-template-columns: 1fr;
  }
  .loadout-slots-grid {
    grid-template-columns: 1fr;
  }
}
</style>
