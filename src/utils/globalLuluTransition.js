import { gsap } from 'gsap'

const NORMAL_DURATION = 156
const LAUNCH_TIMESCALE = 3
export const TOURNAMENT_DISPLAY_REVEAL_DURATION = 0.82

const LOBBY_WORD_TOP = 24.5
const LOBBY_WORD_HEIGHT = 184
const LOBBY_WORD_FONT_SIZE = 206

let marquee = null
let pendingLayout = null
let displayTransitionId = null
let activeDisplayReturnId = null
let returningToLobby = false

const DISPLAY_TARGETS = {
  tournament: {
    mode: 'tournament',
    selector: '.hud-header',
    settledHeight: 112
  },
  room: {
    mode: 'room',
    selector: '.room-header',
    settledHeight: 112
  }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const getLayoutRect = (element) => {
  const appContent = document.querySelector('#app-content')
  if (!appContent || !element) return null

  // offset* values describe layout coordinates and deliberately ignore the
  // transform used by Vue's route transition. getBoundingClientRect() would
  // capture the temporary -10% page offset when returning to the lobby.
  let left = 0
  let top = 0
  let current = element
  while (current && current !== appContent) {
    left += current.offsetLeft || 0
    top += current.offsetTop || 0
    current = current.offsetParent
  }

  return {
    left,
    top,
    width: element.offsetWidth,
    height: element.offsetHeight
  }
}

const getLobbyWordLayout = (rect) => ({
  left: rect.left,
  top: rect.top + LOBBY_WORD_TOP,
  width: rect.width,
  height: LOBBY_WORD_HEIGHT,
  fontSize: LOBBY_WORD_FONT_SIZE,
  lineHeight: 0.88,
  skewX: -5,
  wordY: 0,
  wordOpacity: 1
})

const getExpandedViewportHeight = (height) =>
  Math.min(height * 0.42, 330)

const getDisplayWordY = (height) =>
  Math.max(0, height * 0.5 - getExpandedViewportHeight(height) * 0.58)

const setMarqueeMode = (mode) => {
  if (!marquee?.viewport) return
  marquee.viewport.classList.remove('is-lobby', 'is-expanded', 'is-tournament', 'is-room')
  if (mode) marquee.viewport.classList.add(`is-${mode}`)
}

const setDisplayCovered = (covered) => {
  marquee?.viewport?.classList.toggle('is-display-covered', Boolean(covered))
}

const appContent = () => document.querySelector('#app-content')

const runLayout = (layout, { duration = 0, ease = 'power3.inOut', timeScale = 1, onComplete } = {}) => {
  if (!marquee) {
    pendingLayout = () => runLayout(layout, { duration, ease, timeScale, onComplete })
    return false
  }

  marquee.layoutTimeline?.kill()
  const actualDuration = marquee.reduceMotion ? 0 : duration
  marquee.layoutTimeline = gsap.timeline({
    defaults: { overwrite: 'auto' },
    onComplete
  })
    .to(marquee.viewport, {
      left: layout.left,
      top: layout.top,
      width: layout.width,
      height: layout.height,
      autoAlpha: 1,
      duration: actualDuration,
      ease
    }, 0)
    .to(marquee.word, {
      fontSize: layout.fontSize,
      lineHeight: layout.lineHeight,
      y: layout.wordY ?? 0,
      autoAlpha: layout.wordOpacity ?? 1,
      duration: actualDuration,
      ease
    }, 0)
    .to(marquee.groups, {
      skewX: layout.skewX,
      duration: actualDuration,
      ease
    }, 0)

  if (marquee.tween) {
    marquee.layoutTimeline.to(marquee.tween, {
      timeScale,
      duration: actualDuration,
      ease: 'power2.out'
    }, 0)
  }
  return true
}

export const registerGlobalLuluMarquee = ({ viewport, word, groups }) => {
  const reduceMotion = prefersReducedMotion()
  gsap.set(viewport, { autoAlpha: 0 })
  gsap.set(word, { x: 0, xPercent: -50 })

  const tween = reduceMotion
    ? null
    : gsap.to(word, {
        xPercent: 0,
        duration: NORMAL_DURATION,
        ease: 'none',
        repeat: -1
      })

  marquee = { viewport, word, groups, tween, reduceMotion, layoutTimeline: null, speedTween: null }
  const command = pendingLayout
  pendingLayout = null
  command?.()
}

export const unregisterGlobalLuluMarquee = () => {
  marquee?.layoutTimeline?.kill()
  marquee?.speedTween?.kill()
  marquee?.tween?.kill()
  marquee = null
  returningToLobby = false
}

export const placeGlobalLuluInLobby = (panel, { duration = 0, holdDisplayLayer = false } = {}) => {
  const rect = getLayoutRect(panel)
  if (!rect) return false
  displayTransitionId = null
  returningToLobby = false
  marquee?.viewport.classList.remove('is-launching')
  marquee?.viewport.classList.remove('is-display-transition')
  setDisplayCovered(false)
  // When the display page is collapsing, its red panel remains on layer 50
  // until the animation ends. Keep the marquee above it for the same span.
  setMarqueeMode(holdDisplayLayer ? 'expanded' : 'lobby')
  return runLayout(getLobbyWordLayout(rect), {
    duration,
    timeScale: 1,
    onComplete: holdDisplayLayer ? () => setMarqueeMode('lobby') : undefined
  })
}

export const expandGlobalLulu = (panel, pageHeight, viewportHeight, fontSize, { duration = 0.82 } = {}) => {
  const rect = getLayoutRect(panel)
  if (!rect) return false
  setMarqueeMode('expanded')
  return runLayout({
    left: rect.left,
    top: rect.top + pageHeight * 0.5 - viewportHeight * 0.58,
    width: rect.width,
    height: viewportHeight,
    fontSize,
    lineHeight: 0.92,
    skewX: 0,
    wordY: 0
  }, { duration, timeScale: NORMAL_DURATION / 57 })
}

export const beginLuluDisplayTransition = (id) => {
  const content = appContent()
  if (!marquee || !content) return false
  displayTransitionId = String(id)
  activeDisplayReturnId = String(id)
  returningToLobby = false
  setDisplayCovered(false)
  setMarqueeMode('expanded')
  marquee.viewport.classList.add('is-launching', 'is-display-transition')

  const width = content.offsetWidth
  const height = content.offsetHeight
  const fontSize = Math.min(340, Math.max(180, width * 0.21))

  return runLayout({
    left: 0,
    top: 0,
    width,
    height,
    fontSize,
    lineHeight: 0.92,
    skewX: 0,
    wordY: getDisplayWordY(height),
    wordOpacity: 1
  }, {
    duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
    timeScale: LAUNCH_TIMESCALE,
    ease: 'power3.inOut',
    onComplete: () => setDisplayCovered(true)
  })
}

export const beginLobbyReturnTransition = (roomId) => {
  const content = appContent()
  if (!marquee || !content) return false

  displayTransitionId = null
  if (roomId) activeDisplayReturnId = String(roomId)
  returningToLobby = true
  content.classList.add('is-lobby-display-transition')
  setMarqueeMode('expanded')
  marquee.viewport.classList.add('is-launching', 'is-display-transition')
  setDisplayCovered(true)

  const width = content.offsetWidth
  const height = content.offsetHeight
  const fontSize = Math.min(340, Math.max(180, width * 0.21))

  return runLayout({
    left: 0,
    top: 0,
    width,
    height,
    fontSize,
    lineHeight: 0.92,
    skewX: 0,
    wordY: getDisplayWordY(height),
    wordOpacity: 1
  }, {
    duration: TOURNAMENT_DISPLAY_REVEAL_DURATION,
    timeScale: LAUNCH_TIMESCALE,
    ease: 'power3.inOut'
  })
}

export const settleLobbyReturnTransition = (panel, { onComplete } = {}) => {
  if (!returningToLobby || !panel) return false
  const rect = getLayoutRect(panel)
  if (!rect) return false

  setMarqueeMode('lobby')
  return runLayout(getLobbyWordLayout(rect), {
    duration: 0.82,
    timeScale: 1,
    onComplete: () => {
      returningToLobby = false
      document.querySelector('#app-content')?.classList.remove('is-lobby-display-transition')
      marquee?.viewport.classList.remove('is-launching', 'is-display-transition')
      setDisplayCovered(false)
      onComplete?.()
    }
  })
}

export const hasLuluDisplayTransition = (id) =>
  Boolean(marquee && displayTransitionId === String(id || ''))

export const consumeLobbyReturnRoomId = () => {
  const roomId = activeDisplayReturnId
  activeDisplayReturnId = null
  return roomId
}

export const markLobbyReturnDisplay = (id) => {
  activeDisplayReturnId = id ? String(id) : null
}

export const prepareLuluDisplayArrival = ({ target, root }) => {
  const config = DISPLAY_TARGETS[target]
  const header = config ? root?.querySelector(config.selector) : null
  if (!root || !header) return false
  gsap.set(header, {
    height: root.clientHeight,
    minHeight: root.clientHeight,
    willChange: 'height'
  })
  return true
}

export const clearLuluDisplayArrivalStyles = ({ target, root }) => {
  const config = DISPLAY_TARGETS[target]
  if (!config || !root) return
  const header = root.querySelector(config.selector)
  if (header) {
    gsap.set(header, { clearProps: 'height,minHeight,will-change' })
  }
  gsap.set(root.querySelectorAll('.header-left, .header-right'), {
    clearProps: 'opacity,visibility,transform,will-change'
  })
}

export const settleLuluDisplayTransition = ({ id, target, root, onComplete }) => {
  const config = DISPLAY_TARGETS[target]
  if (!config || !hasLuluDisplayTransition(id) || !root) return false
  const header = root.querySelector(config.selector)
  const rect = getLayoutRect(header)
  if (!rect) return false
  setMarqueeMode(config.mode)

  const completeDisplayTransition = () => {
    displayTransitionId = null
    marquee?.viewport.classList.remove('is-launching', 'is-display-transition')
    setDisplayCovered(false)
    onComplete?.()
  }

  const settled = runLayout({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    // Display headers start at full viewport height and shrink with the
    // shared lobby layout. Target the settled CSS height, not the live size.
    height: config.settledHeight,
    fontSize: 138,
    lineHeight: 0.82,
    skewX: -5,
    wordY: 0,
    wordOpacity: 1
  }, {
    duration: 0.82,
    timeScale: 1,
    onComplete: undefined
  })

  if (settled) {
    gsap.to(header, {
      height: config.settledHeight,
      minHeight: config.settledHeight,
      duration: marquee?.reduceMotion ? 0 : 0.82,
      ease: 'power3.inOut',
      overwrite: 'auto',
      onComplete: completeDisplayTransition
    })
  }

  return settled
}

export const animateDisplayHeaderCopy = (root, { arrival = false, duration } = {}) => {
  if (!root) return null
  const headerLeft = root.querySelector('.header-left')
  const headerRight = root.querySelector('.header-right')
  const targets = [headerLeft, headerRight].filter(Boolean)
  if (targets.length === 0) return null

  gsap.killTweensOf(targets)
  const actualDuration = duration ?? (arrival ? TOURNAMENT_DISPLAY_REVEAL_DURATION : 0.46)
  const ease = arrival ? 'power3.inOut' : 'power3.out'
  const clearProps = arrival ? undefined : 'opacity,visibility,transform,will-change'
  const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } })

  if (headerLeft) {
    timeline.fromTo(headerLeft,
      { x: 0, xPercent: -105, autoAlpha: 0 },
      {
        x: 0,
        xPercent: 0,
        autoAlpha: 1,
        duration: actualDuration,
        ease,
        willChange: 'transform, opacity',
        immediateRender: true,
        ...(clearProps ? { clearProps } : {})
      }, 0
    )
  }

  if (headerRight) {
    timeline.fromTo(headerRight,
      { x: 0, xPercent: 105, autoAlpha: 0 },
      {
        x: 0,
        xPercent: 0,
        autoAlpha: 1,
        duration: actualDuration,
        ease,
        willChange: 'transform, opacity',
        immediateRender: true,
        ...(clearProps ? { clearProps } : {})
      }, 0
    )
  }

  return timeline
}

export const placeGlobalLuluInDisplayTarget = (root, { target, duration = 0 } = {}) => {
  const config = DISPLAY_TARGETS[target]
  if (!config) return false
  const header = root?.querySelector(config.selector)
  const rect = getLayoutRect(header)
  if (!rect) return false
  displayTransitionId = null
  returningToLobby = false
  document.querySelector('#app-content')?.classList.remove('is-lobby-display-transition')
  marquee?.viewport.classList.remove('is-launching', 'is-display-transition')
  setDisplayCovered(false)
  setMarqueeMode(config.mode)
  return runLayout({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    fontSize: 138,
    lineHeight: 0.82,
    skewX: -5,
    wordY: 0,
    wordOpacity: 1
  }, { duration, timeScale: 1 })
}
