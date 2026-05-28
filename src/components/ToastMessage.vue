<template>
  <!-- Toast 提示 -->
  <Transition name="toast">
    <div v-if="toastState.visible" class="toast-container">
      <div class="toast-box glass-panel">
        <span v-if="toastState.icon === 'success'" class="toast-icon">✅</span>
        <span v-else-if="toastState.icon === 'error'" class="toast-icon">❌</span>
        <span v-else-if="toastState.icon === 'none'" class="toast-icon">💬</span>
        <span class="toast-message">{{ toastState.message }}</span>
      </div>
    </div>
  </Transition>

  <!-- 确认弹窗 -->
  <Transition name="modal">
    <div v-if="modalState.visible" class="modal-overlay" @click.self="confirmModal(false)">
      <div class="confirm-modal glass-panel">
        <div class="confirm-header">
          <span class="confirm-title">{{ modalState.title }}</span>
        </div>
        <div class="confirm-body">
          <p class="confirm-content">{{ modalState.content }}</p>
        </div>
        <div class="confirm-footer">
          <button class="confirm-btn-cancel" @click="confirmModal(false)">取消</button>
          <button
            class="confirm-btn-ok"
            :style="{ background: modalState.confirmColor }"
            @click="confirmModal(true)"
          >确定</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { useToast } from '../composables/useToast.js'

export default {
  setup() {
    const { toastState, modalState, confirmModal } = useToast()
    return { toastState, modalState, confirmModal }
  }
}
</script>

<style scoped>
/* Toast */
.toast-container {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.toast-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(20, 24, 38, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
}

.toast-icon {
  font-size: 16px;
}

.toast-message {
  font-size: 14px;
  color: #f3f4f6;
  font-weight: 500;
}

/* Toast transition */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

/* Modal overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(5px);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-modal {
  width: 380px;
  background: rgba(20, 24, 38, 0.97) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.confirm-header {
  padding: 20px 24px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.confirm-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.confirm-body {
  padding: 16px 24px 20px;
}

.confirm-content {
  font-size: 14px;
  color: #9ca3af;
  line-height: 1.6;
}

.confirm-footer {
  display: flex;
  gap: 10px;
  padding: 0 24px 20px;
}

.confirm-btn-cancel {
  flex: 1;
  height: 38px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
  font-size: 14px;
}

.confirm-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
}

.confirm-btn-ok {
  flex: 1;
  height: 38px;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  border: none;
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .confirm-modal,
.modal-leave-active .confirm-modal {
  transition: transform 0.2s ease;
}
.modal-enter-from .confirm-modal {
  transform: scale(0.92);
}
.modal-leave-to .confirm-modal {
  transform: scale(0.92);
}
</style>
