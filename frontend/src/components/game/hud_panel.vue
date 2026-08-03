<!-- The HUD strip: stored energy against the goal, the pace the clock demands,
     and the clock. Centred, because the board below it is centred. -->
<template>
  <header class="hud">
    <div class="hud-spacer"></div>

    <div class="hud-fields">
      <!-- Stored and goal share a bar, because they are one question -->
      <section class="hud-progress">
        <div class="hud-progress-fields">
          <div class="hud-field">
            <span class="hud-label">Stored</span>
            <span class="hud-value hud-value--energy">{{ storedEnergy }}</span>
          </div>

          <div class="hud-field">
            <span class="hud-label">Goal</span>
            <span class="hud-value hud-value--energy">{{ goal }}</span>
          </div>
        </div>

        <div class="progress" role="img" :aria-label="progressDescription">
          <div class="progress-fill" :class="`progress-fill--${progressBand}`" :style="{width: progressWidth}"></div>
        </div>
      </section>

      <section class="hud-field hud-field--ruled hud-field--pace">
        <span class="hud-label">Pace</span>
        <span class="pace" :class="{'pace--ahead': isAheadOfPace, 'pace--behind': isBehindPace}" :aria-label="paceDescription">
          <span class="hud-value pace-value">{{ paceDelta }}</span>
          <span class="pace-unit">/m</span>
        </span>
      </section>

      <section class="hud-field hud-field--ruled">
        <span class="hud-label">Time</span>
        <span class="hud-value" :class="{'hud-value--expiring': isExpiring}">{{ remaining }}</span>
      </section>
    </div>

    <div class="hud-controls">
      <button type="button" class="control" :disabled="snapshot.status !== 'running'" @click="emit('toggle-pause')">
        <span class="rail-title">{{ snapshot.paused ? 'Resume' : 'Pause' }}</span>
        <kbd class="hotkey">Esc</kbd>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {MatchSnapshot} from '@/composables/use_match'
import {formatClock, formatEnergy, formatPaceDelta, truncatePace} from '@/game/format'
import {TUNABLES} from '@/game/tunables'

const props = defineProps<{snapshot: MatchSnapshot}>()

const emit = defineEmits<{
  'toggle-pause': []
}>()

const storedEnergy = computed(() => formatEnergy(props.snapshot.storedEnergy))
const goal = computed(() => formatEnergy(props.snapshot.goal))
const remaining = computed(() => formatClock(props.snapshot.remainingSeconds))

const progressFraction = computed(() => {
  const fraction = props.snapshot.goal > 0 ? props.snapshot.storedEnergy / props.snapshot.goal : 0

  return Math.max(0, Math.min(1, fraction))
})

const progressWidth = computed(() => `${progressFraction.value * 100}%`)

/** Thirds of the way to the goal, so the bar answers "how am I doing" by colour alone. */
const progressBand = computed(() => {
  if (progressFraction.value < TUNABLES.hud.progressLowFraction) {
    return 'low'
  }

  return progressFraction.value < TUNABLES.hud.progressHighFraction ? 'mid' : 'high'
})

// Surplus over what the clock demands. Read at display resolution so the colour
// and the numeral can never disagree about which side of zero this is on.
const paceSurplus = computed(() => truncatePace(props.snapshot.actualPace - props.snapshot.requiredPace))
const paceDelta = computed(() => formatPaceDelta(paceSurplus.value))
const isAheadOfPace = computed(() => paceSurplus.value > 0)
const isBehindPace = computed(() => paceSurplus.value < 0)

const isExpiring = computed(
  () => props.snapshot.status === 'running' && props.snapshot.remainingSeconds < TUNABLES.hud.clockWarningSeconds,
)

// The lightning glyph and the bar are both visual; these carry the same
// readings to anyone who cannot see them
const progressDescription = computed(
  () => `${formatEnergy(props.snapshot.storedEnergy)} stored of ${formatEnergy(props.snapshot.goal)} needed`,
)

const paceDescription = computed(
  () => `${formatEnergy(Math.abs(paceSurplus.value))} energy per minute ${isAheadOfPace.value ? 'ahead of' : 'behind'} the pace the goal requires`,
)
</script>

<style scoped>
.hud {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: stretch;
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
    gap: 4px;
    min-width: 132px;
    padding: 0 20px;
}

.hud-field--ruled {
    border-left: 1px solid var(--rule);
}

.hud-progress {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 7px;
    padding: 0 4px;
}

.hud-progress-fields {
    display: flex;
}

.hud-progress-fields .hud-field {
    padding: 0 20px;
}

/* How far along the match actually is, under the two numbers that say it */
.progress {
    height: 3px;
    margin: 0 20px;
    background: var(--surface-well);
    border-radius: 1px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    transition: width var(--tween) var(--ease), background-color var(--tween) var(--ease);
}

.progress-fill--low {
    background: var(--pace-behind);
}

.progress-fill--mid {
    background: var(--hud-energy);
}

.progress-fill--high {
    background: var(--pace-ahead);
}

.hud-value--energy {
    color: var(--hud-energy);
}

.hud-field--pace {
    min-width: 168px;
}

.pace {
    display: flex;
    align-items: baseline;
    gap: 3px;
}

.pace-value {
    font-size: 24px;
}

.pace-unit {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-dim);
}

/* The race verdict, read before the number is. Exactly on pace stays neutral,
   so the colour only ever appears when there is a side to be on. */
.pace--ahead .pace-value {
    color: var(--pace-ahead);
}

.pace--behind .pace-value {
    color: var(--pace-behind);
}

/* The final minute. docs/ui.md § Colour admits this one use of the top of the
   state ramp outside a structure: the clock running out is the loss condition. */
.hud-value--expiring {
    color: var(--state-4);
}

.hud-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 24px;
}
</style>
