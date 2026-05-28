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
    radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(52, 211, 153, 0.05) 0%, transparent 50%);
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
