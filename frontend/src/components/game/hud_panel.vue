<!-- The HUD strip: stored energy, the goal, the pace race and the clock, with the
     two controls that are available in every match. -->
<template>
  <header class="hud">
    <div class="hud-fields">
      <section class="hud-field">
        <span class="hud-label">Stored</span>
        <span class="hud-value hud-value--energy">{{ storedEnergy }}</span>
      </section>

      <section class="hud-field">
        <span class="hud-label">Goal</span>
        <span class="hud-value">{{ goal }}</span>
      </section>

      <section class="hud-field hud-field--pace">
        <span class="hud-label">Pace</span>
        <div class="pace" role="img" :aria-label="paceDescription">
          <div class="pace-actual" :style="{width: actualOffset}"></div>
          <div class="pace-required" :style="{left: requiredOffset}"></div>
        </div>
      </section>

      <section class="hud-field">
        <span class="hud-label">Time</span>
        <span class="hud-value">{{ remaining }}</span>
      </section>
    </div>

    <div class="hud-controls">
      <button type="button" class="control" :disabled="snapshot.status !== 'running'" @click="emit('toggle-pause')">
        <span class="rail-title">{{ snapshot.paused ? 'Resume' : 'Pause' }}</span>
        <kbd class="hotkey">Space</kbd>
      </button>

      <button type="button" class="control" @click="emit('restart')">
        <span class="rail-title">Restart</span>
        <kbd class="hotkey">R</kbd>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {MatchSnapshot} from '@/composables/use_match'
import {formatClock, formatEnergy} from '@/game/format'
import {TUNABLES} from '@/game/tunables'

const props = defineProps<{snapshot: MatchSnapshot}>()

const emit = defineEmits<{
  'toggle-pause': []
  'restart': []
}>()

const storedEnergy = computed(() => formatEnergy(props.snapshot.storedEnergy))
const goal = computed(() => formatEnergy(props.snapshot.goal))
const remaining = computed(() => formatClock(props.snapshot.remainingSeconds))

/** The track's full-scale value, so the required mark parks at a fixed offset. */
const paceDomain = computed(() => Math.max(props.snapshot.requiredPace * TUNABLES.hud.paceTrackHeadroom, 1))

function offsetOf(pace: number): string {
  return `${Math.max(0, Math.min(100, (pace / paceDomain.value) * 100))}%`
}

const actualOffset = computed(() => offsetOf(props.snapshot.actualPace))
const requiredOffset = computed(() => offsetOf(props.snapshot.requiredPace))

// The marks are positional, so the track reads without colour; this carries the
// same reading to anyone who cannot see it at all
const paceDescription = computed(
  () => `Earning ${formatEnergy(props.snapshot.actualPace)} of ${formatEnergy(props.snapshot.requiredPace)} energy per minute required`,
)
</script>

<style scoped>
.hud {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    height: var(--hud-height);
    background: var(--surface-raised);
    border-bottom: 1px solid var(--rule);
}

.hud-fields {
    display: flex;
    align-items: stretch;
}

.hud-field {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    min-width: 132px;
    padding: 0 20px;
    border-right: 1px solid var(--rule);
}

.hud-field:first-child {
    padding-left: 24px;
}

.hud-field--pace {
    min-width: 196px;
    justify-content: center;
}

.hud-value--energy {
    color: var(--energy);
}

/* The pace race: how much is being earned, against how much the clock demands.
   Cyan is energy earned; the required mark stays neutral, because falling
   behind is not heat, load or starvation and may not borrow their warm ramp. */
.pace {
    position: relative;
    height: 8px;
    margin-top: 6px;
    background: var(--surface-well);
    border: 1px solid var(--rule);
    border-radius: var(--radius-panel);
}

.pace-actual {
    height: 100%;
    background: var(--energy);
    opacity: 0.85;
}

.pace-required {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    background: var(--ink);
    transform: translateX(-1px);
}

.hud-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 24px;
}
</style>
