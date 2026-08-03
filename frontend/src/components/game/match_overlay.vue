<!-- Pause, the two endings, and the restart confirmation. It covers the board
     well and nothing else, so the HUD keeps reading underneath it. -->
<script lang="ts">
export type OverlayMode = 'paused' | 'won' | 'lost' | 'restart'
</script>

<script setup lang="ts">
import {computed} from 'vue'
import type {MatchSnapshot} from '@/composables/use_match'
import {formatClock, formatEnergy} from '@/game/format'

interface Readout {
  label: string
  value: string
  isEnergy: boolean
}

const props = defineProps<{
  mode: OverlayMode
  snapshot: MatchSnapshot
}>()

const emit = defineEmits<{
  'resume': []
  'restart': []
  'cancel': []
}>()

const eyebrow = computed(() => {
  switch (props.mode) {
    case 'paused':
      return 'Paused'
    case 'won':
      return 'Goal reached'
    case 'lost':
      return 'Time expired'
    case 'restart':
      return 'Restart'
  }
})

const note = computed(() => {
  switch (props.mode) {
    case 'paused':
      return 'Look only. No actions while paused.'
    case 'restart':
      return 'The current match ends and the level starts over.'
    default:
      return null
  }
})

// Both endings lead with what was stored, then answer the question that ending
// raises: how much clock was left, or how far short it fell
const readouts = computed<Readout[]>(() => {
  if (props.mode !== 'won' && props.mode !== 'lost') {
    return []
  }

  const stored: Readout = {
    label: 'Stored',
    value: formatEnergy(props.snapshot.storedEnergy),
    isEnergy: true,
  }

  const context: Readout = props.mode === 'won'
    ? {
      label: 'Time left',
      value: formatClock(props.snapshot.remainingSeconds),
      isEnergy: false,
    }
    : {
      label: 'Goal',
      value: formatEnergy(props.snapshot.goal),
      isEnergy: false,
    }

  return [
    stored,
    context,
  ]
})
</script>

<template>
  <div class="overlay">
    <div class="overlay-panel">
      <p class="hud-label overlay-eyebrow" :class="{'overlay-eyebrow--won': mode === 'won'}">{{ eyebrow }}</p>

      <p v-if="note !== null" class="body-text overlay-note">{{ note }}</p>

      <dl v-if="readouts.length > 0" class="overlay-readouts">
        <div v-for="readout in readouts" :key="readout.label" class="overlay-readout">
          <dt class="hud-label">{{ readout.label }}</dt>
          <dd class="readout" :class="{'overlay-readout--energy': readout.isEnergy}">{{ readout.value }}</dd>
        </div>
      </dl>

      <div class="overlay-actions">
        <button v-if="mode === 'paused'" type="button" class="control" @click="emit('resume')">
          <span class="rail-title">Resume</span>
          <kbd class="hotkey">Esc</kbd>
        </button>

        <button type="button" class="control" @click="emit('restart')">
          <span class="rail-title">Restart</span>
          <kbd class="hotkey">R</kbd>
        </button>

        <button v-if="mode === 'restart'" type="button" class="control" @click="emit('cancel')">
          <span class="rail-title">Cancel</span>
          <kbd class="hotkey">Esc</kbd>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--surface-well) 86%, transparent);
}

.overlay-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 320px;
    padding: 24px;
    background: var(--surface-raised);
    border: 1px solid var(--rule);
    border-radius: var(--radius-panel);
}

.overlay-eyebrow {
    color: var(--ink);
}

/* Cyan for the win, because it is energy that won it. The loss stays neutral:
   red belongs to the top of the state ramp and to nothing else. */
.overlay-eyebrow--won {
    color: var(--energy);
}

.overlay-note {
    color: var(--ink-dim);
}

.overlay-readouts {
    display: flex;
    gap: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--rule);
}

.overlay-readout {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

/* The same yellow the HUD gives stored and goal, so a number does not change
   colour just because the match ended */
.overlay-readout--energy {
    color: var(--hud-energy);
}

.overlay-actions {
    display: flex;
    gap: 8px;
}
</style>
