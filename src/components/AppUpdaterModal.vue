<template>
  <Transition name="updater-fade">
    <div v-if="hasUpdate" class="updater-mask" @click.self="handleMaskClick">
      <div class="updater-card glass-panel">
        <!-- 弹窗顶栏 -->
        <div class="updater-header">
          <div class="header-left">
            <div class="version-badge">NEW UPDATE</div>
            <h2 class="updater-title">发现新版本 v{{ updateInfo.version }}</h2>
          </div>
          <button
            v-if="!downloading"
            class="close-btn"
            type="button"
            title="稍后更新"
            @click="dismissModal"
          >
            ✕
          </button>
        </div>

        <!-- 更新日志区域 -->
        <div class="updater-body">
          <div class="changelog-label">
            <span>更新内容与改进说明</span>
            <span v-if="updateInfo.date" class="release-date">发布时间: {{ updateInfo.date }}</span>
          </div>
          <div class="changelog-content">
            <div class="changelog-text">{{ updateInfo.body }}</div>
          </div>

          <!-- 下载进度区域 -->
          <div v-if="downloading || isDownloaded" class="progress-section">
            <div class="progress-info-row">
              <span class="progress-status-text">
                {{ isDownloaded ? '更新包已就绪' : '正在下载更新包...' }}
              </span>
              <span class="progress-percent">{{ progress }}%</span>
            </div>

            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: progress + '%' }"
                :class="{ 'pulse-active': downloading && progress < 100 }"
              ></div>
            </div>

            <div class="progress-bytes-row" v-if="totalBytes > 0">
              <span>已下载: {{ formatBytes(downloadedBytes) }}</span>
              <span>总大小: {{ formatBytes(totalBytes) }}</span>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="error" class="error-banner">
            <svg viewBox="0 0 24 24" class="error-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{{ error }}</span>
          </div>
        </div>

        <!-- 底部操作按钮 -->
        <div class="updater-footer">
          <!-- 初始状态 -->
          <template v-if="!downloading && !isDownloaded">
            <button class="btn-secondary" @click="dismissModal">稍后再说</button>
            <button class="btn-primary" @click="startDownloadAndInstall">立即更新</button>
          </template>

          <!-- 下载中状态 -->
          <template v-else-if="downloading">
            <button class="btn-primary btn-downloading" disabled>
              <span class="btn-spinner"></span>
              <span>正在安全下载 ({{ progress }}%)...</span>
            </button>
          </template>

          <!-- 下载完成状态 -->
          <template v-else-if="isDownloaded">
            <button class="btn-primary btn-restart" @click="restartApp">
              立即重启应用以完成更新
            </button>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useUpdater } from '../composables/useUpdater.js'

const {
  hasUpdate,
  downloading,
  isDownloaded,
  error,
  progress,
  downloadedBytes,
  totalBytes,
  updateInfo,
  startDownloadAndInstall,
  restartApp,
  dismissModal,
  formatBytes
} = useUpdater()

function handleMaskClick() {
  if (!downloading.value) {
    dismissModal()
  }
}
</script>

<style scoped>
.updater-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(10, 10, 12, 0.78);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.updater-card {
  width: 480px;
  max-width: 92vw;
  background: #1c1c1e;
  border: 1px solid rgba(225, 29, 72, 0.45);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(225, 29, 72, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.updater-header {
  padding: 20px 24px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(225, 29, 72, 0.12) 0%, transparent 100%);
}

.version-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #ffffff;
  background: #e11d48;
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.updater-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #ffffff;
}

.updater-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.changelog-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.04em;
}

.release-date {
  color: rgba(255, 255, 255, 0.35);
  font-weight: 400;
}

.changelog-content {
  max-height: 180px;
  overflow-y: auto;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
}

.changelog-text {
  color: rgba(255, 255, 255, 0.88);
  font-size: 13.5px;
  line-height: 1.65;
  white-space: pre-line;
}

/* 进度条 */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(225, 29, 72, 0.06);
  border: 1px solid rgba(225, 29, 72, 0.2);
  border-radius: 6px;
}

.progress-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
}

.progress-status-text {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

.progress-percent {
  color: #ff3366;
  font-weight: 800;
  font-size: 14px;
}

.progress-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #d71442, #ff2e63);
  transition: width 0.25s ease-out;
  border-radius: 3px;
}

.pulse-active {
  box-shadow: 0 0 10px rgba(255, 46, 99, 0.7);
}

.progress-bytes-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  font-size: 12.5px;
  border-radius: 6px;
}

.error-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
}

/* 底部按钮 */
.updater-footer {
  padding: 16px 24px 22px;
  display: flex;
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  flex: 1;
  height: 42px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e5e7eb;
  font-size: 14px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.btn-primary {
  flex: 2;
  height: 42px;
  background: #e11d48;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(225, 29, 72, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #f43f5e;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(225, 29, 72, 0.45);
}

.btn-downloading {
  flex: 1;
  opacity: 0.85;
  cursor: wait;
}

.btn-restart {
  flex: 1;
  background: #10b981 !important;
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35) !important;
}

.btn-restart:hover {
  background: #059669 !important;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.45) !important;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 动效过渡 */
.updater-fade-enter-active,
.updater-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.updater-fade-enter-from,
.updater-fade-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
