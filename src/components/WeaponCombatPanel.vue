<template>
  <section v-if="analysis" class="weapon-combat" :aria-label="`${weapon.name} 伤害与击杀分析`">
    <header class="combat-heading">
      <div><span class="combat-eyebrow">{{ weapon.name }}</span><h4>伤害与击杀分析</h4></div>
      <span class="combat-badge">{{ analysis.custom ? '手动时序试算' : '当前数值推算' }}</span>
    </header>

    <label class="combat-field">
      <span>攻击模式</span>
      <select v-model="modeId" aria-label="攻击模式">
        <option v-for="mode in analysis.modes" :key="mode.id" :value="mode.id">{{ mode.label }}</option>
      </select>
    </label>
    <div class="combat-options">
      <label v-if="analysis.hasHead" class="combat-field">
        <span>命中部位</span>
        <select v-model="hit" aria-label="命中部位"><option value="body">全部身体</option><option value="head">全部爆头</option></select>
      </label>
      <span v-else-if="!analysis.mode.defensive" class="combat-neutral">此模式无爆头倍率</span>
      <label v-if="analysis.mode.chargeable" class="combat-check"><input v-model="prepared" type="checkbox">首次已提前蓄力</label>
      <label v-if="analysis.mode.glancing" class="combat-check"><input v-model="glancing" type="checkbox">边缘命中</label>
      <label v-if="analysis.mode.burnRate" class="combat-check"><input v-model="includeBurn" type="checkbox">计入持续燃烧</label>
    </div>
    <label v-if="analysis.mode.pelletCount" class="combat-field">
      <span>每发命中弹丸 {{ pellets || analysis.mode.pelletCount }} / {{ analysis.mode.pelletCount }}</span>
      <input v-model.number="pellets" aria-label="每发命中弹丸数" type="range" min="1" :max="analysis.mode.pelletCount" step="1">
    </label>

    <p class="combat-note">{{ analysis.mode.note }}</p>
    <template v-if="!analysis.mode.defensive">
      <div class="combat-metrics">
        <div><span>每{{ analysis.mode.unit }}总伤害</span><strong>{{ formatNumber(analysis.damage) }}</strong></div>
        <div><span>{{ analysis.dpsLabel }}</span><strong class="combat-accent">{{ analysis.dps === null ? '待测' : formatNumber(analysis.dps) }}</strong></div>
        <div><span>含换弹 DPS</span><strong>{{ analysis.sustainedDps === null ? (analysis.mode.capacity ? '待测' : '无需换弹') : formatNumber(analysis.sustainedDps) }}</strong></div>
      </div>
      <p class="combat-small">输出 DPS 计入连发、转管和快换的内部间隔，不计完整换弹。含换弹 DPS 假设末发命中后立即换弹。</p>

      <div v-if="analysis.mode.timingFields.length" class="combat-timing">
        <h5>攻击时序 <span>可填训练场实测值</span></h5>
        <label v-for="field in analysis.mode.timingFields" :key="field.key" class="combat-field">
          <span>{{ field.label }}</span>
          <input v-model="timing[field.key]" :aria-label="field.label" type="number" min="0" max="60" step="0.01" :placeholder="field.value === null ? 'Wiki 未给出，请填写' : `Wiki：${field.value}`">
        </label>
        <button v-if="analysis.custom" type="button" class="combat-reset" @click="timing = {}">恢复来源时序</button>
      </div>
      <p v-if="analysis.errors.length" class="combat-warning" role="alert">{{ analysis.errors.join('；') }}</p>
      <p v-else-if="analysis.missing.length" class="combat-warning">待补参数：{{ analysis.missing.join('、') }}。已知伤害仍用于计算命中数。</p>

      <div class="combat-table-wrap">
        <table class="combat-table">
          <caption>满血目标 · {{ hit === 'head' && analysis.hasHead ? '全部爆头' : glancing ? '边缘命中' : '当前模式全部命中' }}</caption>
          <thead><tr><th scope="col">目标</th><th scope="col">命中次数</th><th scope="col">首击后</th><th scope="col">含起手</th></tr></thead>
          <tbody>
            <tr v-for="target in analysis.targets" :key="target.key">
              <th scope="row">{{ target.label }}<small>{{ target.hp }} HP</small></th>
              <td><strong>{{ target.hits ?? '不适用' }}{{ target.hits === null ? '' : hitUnit }}</strong><small v-if="target.actions && analysis.mode.damages.length > 1">{{ target.actions }} {{ analysis.mode.unit }}</small><small v-if="target.burnKill">由燃烧完成击杀</small></td>
              <td>{{ formatTime(target.fromFirst) }}<small v-if="target.reloads">{{ target.reloads }} 次换弹</small></td>
              <td><strong>{{ formatTime(target.total) }}</strong><small v-if="target.totalSource === 'Wiki 冷启动实测'">Wiki 冷启动实测</small></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="combat-small">首击后：第一次命中记为 0 秒。含起手：再加入首次蓄力、前摇或起转；能预蓄力的模式可切换准备状态。飞行时间不计入。</p>
      <details class="combat-explanation">
        <summary>计算依据与 Wiki 原表对照</summary>
        <p>{{ analysis.mode.formula }}</p>
        <p>完整换弹与内部停顿按事件插入时间线；击杀前不用换弹就不增加换弹时间。火焰采用单层持续伤害近似，不能逐发叠乘。</p>
        <p v-if="weapon.wiki">伤害与时序来自 Wiki 修订 #{{ weapon.wiki.revisionId }}，每次同步后重新计算。</p>
        <p v-else>当前使用随应用提供的数值快照；联网同步后重新计算。</p>
        <template v-if="analysis.referenceRows">
          <p v-for="target in analysis.targets" :key="target.key" :class="{ 'combat-warning': target.referenceConflict }">
            {{ target.label }}原表：{{ target.reference?.hits ?? '未提供' }} 次 / {{ target.reference?.seconds == null ? '无时间数据' : formatTime(target.reference.seconds) }}
            <template v-if="target.referenceConflict"> · 当前数值与所选命中条件推算为 {{ target.hits }} 次；原表可能使用不同条件或尚未更新。</template>
          </p>
        </template>
        <p v-else>Wiki 没有与此模式匹配的原表。缺失的时序不会用另一种攻击模式的数值代替。</p>
      </details>
    </template>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { analyzeWeapon, getWeaponModes, formatCombatNumber as formatNumber, formatCombatTime as formatTime } from '../utils/weaponCombat.js'

const props = defineProps({ weapon: { type: Object, required: true } })
const modeId = ref(''), hit = ref('body'), prepared = ref(false), glancing = ref(false), includeBurn = ref(true)
const timing = ref({}), pellets = ref(null)
const signature = computed(() => JSON.stringify([props.weapon.id, props.weapon.stats, props.weapon.combat]))
watch(signature, () => { modeId.value = getWeaponModes(props.weapon)[0]?.id || ''; reset() }, { immediate: true })
watch(modeId, reset)
function reset() { timing.value = {}; hit.value = 'body'; prepared.value = false; glancing.value = false; includeBurn.value = true; pellets.value = null }
const analysis = computed(() => analyzeWeapon(props.weapon, { modeId: modeId.value, hit: hit.value, prepared: prepared.value, glancing: glancing.value, includeBurn: includeBurn.value, pellets: pellets.value, timing: timing.value }))
const hitUnit = computed(() => analysis.value.mode.damages.length > 1 ? (analysis.value.mode.family === 'knives' ? ' 刀' : analysis.value.mode.family === 'burst' ? ' 发' : ' 击') : ` ${analysis.value.mode.unit}`)
</script>

<style scoped>
.weapon-combat { padding: 16px; border: 1px solid #3b323b; background: #141218; color: #f1edf2; min-width: 0; }
.combat-heading { display: flex; gap: 8px; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.combat-heading h4 { margin: 3px 0 0; font-size: 16px; font-weight: 850; }
.combat-eyebrow { color: #b8aab5; font-size: 10px; letter-spacing: .14em; }
.combat-badge { border: 1px solid #62404b; color: #ffb4c6; background: #351722; padding: 4px 7px; font-size: 10px; white-space: nowrap; }
.combat-field { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #c8c0ca; min-width: 0; margin-bottom: 10px; }
.combat-field select,.combat-field input[type=number] { width: 100%; min-width: 0; box-sizing: border-box; min-height: 44px; padding: 8px 10px; border: 1px solid #534650; border-radius: 5px; background: #201b23; color: #f8f4f8; font: inherit; }
.combat-field input::placeholder { color: #afa1af; }
.combat-field select { cursor: pointer; }
.combat-field input[type=range] { width: 100%; min-height: 30px; accent-color: #fa3768; cursor: pointer; }
.combat-field select:focus-visible,.combat-field input:focus-visible,.combat-reset:focus-visible,.combat-explanation summary:focus-visible { outline: 2px solid #ff8aab; outline-offset: 3px; }
.combat-options { display: flex; flex-wrap: wrap; align-items: center; column-gap: 14px; }
.combat-options .combat-field { flex: 1; min-width: 120px; }
.combat-check { display: flex; align-items: center; gap: 7px; min-height: 44px; color: #e0d8e1; font-size: 12px; cursor: pointer; }
.combat-check input { accent-color: #ef2459; width: 16px; height: 16px; }
.combat-neutral { color: #b7adb9; font-size: 12px; padding: 6px 0 12px; }
.combat-note,.combat-small,.combat-warning,.combat-explanation p { font-size: 12px; line-height: 1.65; margin: 10px 0; overflow-wrap: anywhere; }
.combat-note { border-left: 2px solid #ec2858; padding-left: 10px; color: #d4cbd6; }
.combat-small { color: #b4aab9; font-size: 11px; }
.combat-metrics { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 6px; margin-top: 14px; }
.combat-metrics>div { display: flex; flex-direction: column; gap: 7px; padding: 10px 8px; background: #221c25; border: 1px solid #382c37; }
.combat-metrics span { color: #c8bbc9; font-size: 11px; }
.combat-metrics strong { font-size: 20px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.combat-accent { color: #ffd175; }
.combat-timing { margin: 14px 0; padding: 12px; background: #1c1820; border: 1px solid #42353e; }
.combat-timing h5 { margin: 0 0 12px; font-size: 12px; }.combat-timing h5 span { color: #b3a5b6; font-weight: 400; margin-left: 8px; }
.combat-reset { min-height: 36px; padding: 6px 10px; background: #33232e; color: #f8d7e2; border: 1px solid #704958; border-radius: 4px; cursor: pointer; }
.combat-reset:hover { background: #4a2939; }
.combat-warning { color: #f7d28a; }
.combat-table-wrap { min-width: 0; }
.combat-table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; font-variant-numeric: tabular-nums; }
.combat-table caption { text-align: left; color: #ded5df; font-size: 12px; padding: 10px 0; font-weight: 700; }
.combat-table th,.combat-table td { border: 1px solid #41343f; padding: 10px 5px; text-align: center; overflow-wrap: anywhere; }
.combat-table thead { background: #2a212c; color: #d2c5d3; }.combat-table th { font-weight: 650; }
.combat-table td { color: #f2eaf3; }.combat-table td:last-child strong { color: #ffd175; }
.combat-table small { display: block; font-size: 10px; color: #baadbf; line-height: 1.5; margin-top: 4px; }
.combat-explanation { margin-top: 12px; padding-top: 10px; border-top: 1px solid #40323d; color: #c8bdcd; }
.combat-explanation summary { cursor: pointer; min-height: 32px; font-size: 12px; color: #e7cfdd; }
@media (max-width: 480px) { .weapon-combat { padding: 12px; }.combat-metrics strong { font-size: 17px; }.combat-table { font-size: 11px; } }
</style>
