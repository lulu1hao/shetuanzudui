<template>
  <div v-if="isTauri" class="titlebar" data-tauri-drag-region>
    <div class="titlebar-left" data-tauri-drag-region>
      <span class="titlebar-logo">🔮</span>
      <span class="titlebar-text">社团组队系统</span>
    </div>
    <div class="titlebar-controls">
      <button class="titlebar-btn btn-minimize" @click="handleMinimize" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="1.5" fill="currentColor"/></svg>
      </button>
      <button class="titlebar-btn btn-maximize" @click="handleMaximize" title="最大化">
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12"><rect x="3" y="0" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="0" y="3" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      </button>
      <button class="titlebar-btn btn-close" @click="handleClose" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5"/></svg>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  setup() {
    const isTauri = ref(false)
    const isMaximized = ref(false)
    let appWindow = null

    onMounted(async () => {
      try {
        const mod = await import('@tauri-apps/api/window')
        appWindow = mod.getCurrentWindow()
        isTauri.value = true
        isMaximized.value = await appWindow.isMaximized()
        await appWindow.onResized(async () => {
          isMaximized.value = await appWindow.isMaximized()
        })
      } catch (_) {
        // running in browser, titlebar hidden
      }
    })

    const handleMinimize = () => { if (appWindow) appWindow.minimize() }
    const handleMaximize = () => { if (appWindow) appWindow.toggleMaximize() }
    const handleClose = () => { if (appWindow) appWindow.close() }

    return { isTauri, isMaximized, handleMinimize, handleMaximize, handleClose }
  }
}
</script>

<style scoped>
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  flex-shrink: 0;
  background: rgba(11, 15, 25, 0.92);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  user-select: none;
  -webkit-app-region: drag;
  padding: 0 8px;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 8px;
}

.titlebar-logo { font-size: 14px; }

.titlebar-text {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.5px;
}

.titlebar-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.titlebar-btn {
  width: 36px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-app-region: no-drag;
}

.titlebar-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
}

.btn-close:hover {
  background: rgba(239, 68, 68, 0.7);
  color: #ffffff;
}
</style>
