import { reactive, toRefs } from 'vue'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

const state = reactive({
  hasUpdate: false,
  checking: false,
  downloading: false,
  isDownloaded: false,
  error: null,
  progress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  updateInfo: {
    version: '',
    body: '',
    date: ''
  }
})

let updateHandle = null

export function useUpdater() {
  /**
   * 检查线上更新
   * @param {boolean} silent 是否静默检查（true 时如果无更新或出错不弹出提示）
   */
  async function checkForUpdates(silent = true) {
    if (state.checking || state.downloading) return
    state.checking = true
    state.error = null

    try {
      // check() 会按照 tauri.conf.json 中配置的 endpoints 发起请求并比对版本号
      const update = await check()
      if (update) {
        state.updateInfo = {
          version: update.version,
          body: update.body || '新版本已发布，带来多项功能优化与稳定性提升。',
          date: update.date || ''
        }
        updateHandle = update
        state.hasUpdate = true
      } else {
        if (!silent) {
          state.hasUpdate = false
          return { status: 'latest', msg: '当前已是最新版本' }
        }
      }
    } catch (err) {
      console.warn('[Updater] 检查更新失败:', err)
      state.error = err?.message || String(err)
      if (!silent) {
        return { status: 'error', msg: '检查更新时发生错误' }
      }
    } finally {
      state.checking = false
    }
  }

  /**
   * 开始下载并安装更新
   */
  async function startDownloadAndInstall() {
    if (!updateHandle || state.downloading) return

    state.downloading = true
    state.progress = 0
    state.downloadedBytes = 0
    state.totalBytes = 0
    state.error = null

    try {
      let downloaded = 0
      let total = 0

      await updateHandle.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength || 0
            state.totalBytes = total
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            state.downloadedBytes = downloaded
            if (total > 0) {
              state.progress = Math.min(100, Math.round((downloaded / total) * 100))
            }
            break
          case 'Finished':
            state.downloading = false
            state.isDownloaded = true
            state.progress = 100
            break
        }
      })
    } catch (err) {
      console.error('[Updater] 下载或安装更新失败:', err)
      state.downloading = false
      state.error = '下载更新包失败，请检查网络连接后重试'
    }
  }

  /**
   * 重启并运行新版本软件
   */
  async function restartApp() {
    try {
      await relaunch()
    } catch (err) {
      console.error('[Updater] 重启应用失败:', err)
    }
  }

  /**
   * 关闭更新弹窗
   */
  function dismissModal() {
    if (state.downloading) return
    state.hasUpdate = false
  }

  /**
   * 格式化文件字节大小
   */
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return {
    ...toRefs(state),
    checkForUpdates,
    startDownloadAndInstall,
    restartApp,
    dismissModal,
    formatBytes
  }
}
