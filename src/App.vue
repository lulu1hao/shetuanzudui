<template>
  <div id="app-root">
    <TitleBar />
    <div id="app-content">
      <GlobalLuluMarquee />
      <router-view v-slot="{ Component, route }">
        <transition :name="route.meta.transition || 'page-fade'">
          <div :key="route.fullPath" class="route-page">
            <component :is="Component" />
          </div>
        </transition>
      </router-view>
    </div>
    <ToastMessage />
  </div>
</template>

<script>
import TitleBar from './components/TitleBar.vue'
import ToastMessage from './components/ToastMessage.vue'
import GlobalLuluMarquee from './components/GlobalLuluMarquee.vue'

export default {
  components: { TitleBar, ToastMessage, GlobalLuluMarquee }
}
</script>

<style>
#app-root {
  width: 100%;
  height: 100%;
  background-color: #0b0f19;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    linear-gradient(135deg, #08060b 0%, #201f1f 52%, #2a1118 100%);
  background-size: 28px 28px, 28px 28px, 100% 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

#app-content {
  position: relative;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.route-page {
  width: 100%;
  height: 100%;
}

.tournament-slide-enter-active,
.tournament-slide-leave-active,
.page-back-enter-active,
.page-back-leave-active,
.page-fade-enter-active,
.page-fade-leave-active {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition:
    transform 680ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 500ms ease;
  will-change: transform, opacity;
}

.tournament-slide-enter-active,
.tournament-slide-leave-active {
  transition: none;
  will-change: auto;
}

.tournament-slide-enter-active,
.page-back-leave-active { z-index: 2; }

.tournament-slide-leave-active,
.page-back-enter-active { z-index: 1; }

.tournament-slide-enter-from,
.tournament-slide-enter-to,
.tournament-slide-leave-from,
.tournament-slide-leave-to {
  clip-path: none;
  transform: none;
  opacity: 1;
}

.page-back-leave-to { opacity: 0; }

.page-back-leave-from,
.page-back-enter-to { opacity: 1; }

.page-back-enter-from {
  opacity: 0.65;
}

.page-fade-enter-from,
.page-fade-leave-to { opacity: 0; }

/* The global display layer owns the tournament-to-lobby reveal. Disable the
   route-level stacking context for that one transition so the returning lobby
   content can remain above the red layer while it moves into place. */
#app-content.is-lobby-display-transition .page-back-enter-active,
#app-content.is-lobby-display-transition .page-back-leave-active {
  z-index: auto;
  transition: none;
  transform: none;
  opacity: 1;
  will-change: auto;
}

#app-content.is-lobby-display-transition .page-back-enter-from,
#app-content.is-lobby-display-transition .page-back-enter-to,
#app-content.is-lobby-display-transition .page-back-leave-from,
#app-content.is-lobby-display-transition .page-back-leave-to {
  transform: none;
  opacity: 1;
}

/* The full-screen Lulu layer owns the launch from the lobby into display
   pages. Keep route wrappers from creating an intermediate stacking layer, so
   the red display surface can cover page body content while header copy enters
   above it. */
#app-content.is-display-launch-transition .tournament-slide-enter-active,
#app-content.is-display-launch-transition .tournament-slide-leave-active {
  z-index: auto;
  transition: none;
  transform: none;
  opacity: 1;
  will-change: auto;
}

#app-content.is-display-launch-transition .tournament-slide-enter-from,
#app-content.is-display-launch-transition .tournament-slide-enter-to,
#app-content.is-display-launch-transition .tournament-slide-leave-from,
#app-content.is-display-launch-transition .tournament-slide-leave-to {
  transform: none;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .tournament-slide-enter-active,
  .tournament-slide-leave-active,
  .page-back-enter-active,
  .page-back-leave-active,
  .page-fade-enter-active,
  .page-fade-leave-active { transition-duration: 1ms; }

  .tournament-slide-enter-from,
  .tournament-slide-leave-to,
  .page-back-enter-from,
  .page-back-leave-to { transform: none; }

  .tournament-slide-enter-from,
  .tournament-slide-enter-to,
  .tournament-slide-leave-to { clip-path: none; }
}
</style>
