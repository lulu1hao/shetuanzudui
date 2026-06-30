<template>
  <div ref="viewport" class="global-lulu-viewport" aria-hidden="true">
    <div ref="word" class="global-lulu-word">
      <div v-for="groupIndex in 2" :key="groupIndex" ref="groups" class="global-lulu-group">
        <span v-for="(letter, index) in letters" :key="`${groupIndex}-${index}`">{{ letter }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  registerGlobalLuluMarquee,
  unregisterGlobalLuluMarquee
} from '../utils/globalLuluTransition.js'

const viewport = ref(null)
const word = ref(null)
const groups = ref([])
const letters = 'LU'.repeat(18).split('')

onMounted(() => registerGlobalLuluMarquee({
  viewport: viewport.value,
  word: word.value,
  groups: groups.value
}))

onUnmounted(unregisterGlobalLuluMarquee)
</script>

<style>
.global-lulu-viewport {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  will-change: left, top, width, height;
}

.global-lulu-viewport.is-lobby { z-index: 11; }
.global-lulu-viewport.is-expanded { z-index: 50; }
.global-lulu-viewport.is-launching { z-index: 50; }
.global-lulu-viewport.is-tournament,
.global-lulu-viewport.is-room {
  z-index: 1;
  opacity: 1;
  background: linear-gradient(145deg, #8e0b24 0%, #d71442 58%, #ef174e 100%);
}

.global-lulu-viewport.is-tournament.is-launching,
.global-lulu-viewport.is-room.is-launching {
  z-index: 50;
  opacity: 1;
}

.global-lulu-viewport.is-display-transition {
  background: #e81446;
  box-shadow: none;
}

.global-lulu-word {
  position: relative;
  display: flex;
  width: max-content;
  align-items: flex-start;
  color: rgba(28, 22, 25, 0.72);
  font-size: 222px;
  font-style: italic;
  font-weight: 1000;
  line-height: 0.88;
  white-space: nowrap;
  will-change: transform, font-size;
}

.global-lulu-group {
  display: flex;
  flex: none;
  transform: skewX(-5deg);
  transform-origin: left top;
}

.global-lulu-group span { display: inline-block; }
</style>
