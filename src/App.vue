<template>
  <div id="app-root">
    <TitleBar />
    <div id="app-content">
      <router-view />
    </div>
    <ToastMessage />
  </div>
</template>

<script>
import TitleBar from './components/TitleBar.vue'
import ToastMessage from './components/ToastMessage.vue'

export default {
  components: { TitleBar, ToastMessage }
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
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
