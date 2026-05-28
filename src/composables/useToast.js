import { reactive } from 'vue'

// Toast 状态
const toastState = reactive({
  visible: false,
  message: '',
  icon: 'none',
  timer: null
})

// Modal 状态
const modalState = reactive({
  visible: false,
  title: '',
  content: '',
  confirmColor: '#a78bfa',
  resolve: null
})

export function useToast() {
  const showToast = (title, icon = 'none', duration = 2000) => {
    if (toastState.timer) clearTimeout(toastState.timer)
    toastState.message = title
    toastState.icon = icon
    toastState.visible = true
    toastState.timer = setTimeout(() => {
      toastState.visible = false
    }, duration)
  }

  const showModal = (title, content, confirmColor = '#ef4444') => {
    return new Promise((resolve) => {
      modalState.title = title
      modalState.content = content
      modalState.confirmColor = confirmColor
      modalState.visible = true
      modalState.resolve = resolve
    })
  }

  const confirmModal = (result) => {
    modalState.visible = false
    if (modalState.resolve) {
      modalState.resolve(result)
      modalState.resolve = null
    }
  }

  return {
    toastState,
    modalState,
    showToast,
    showModal,
    confirmModal
  }
}
