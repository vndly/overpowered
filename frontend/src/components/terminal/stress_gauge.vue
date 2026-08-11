<!-- Where a machine is running between its safe stress and its maximum
     (ui_ux.md §14). A machine straining against a backed-up or empty store reads past
     its maximum, so the fill pegs at the right-hand end rather than running off the gauge.

     SafeStress is no longer marked on the gauge. The colour the fill is banded in turns at
     exactly that point, so the marker was drawing a line the bar was already drawing.

     The gauge carries no figure beside it and no scale above it, so the whole of it is
     named as the drawing it is: read aloud, a row of blocks is noise, and role="img"
     gives the reading it draws. Crossing SafeStress is announced by the alerts panel as
     well, which is the same news in words (ui_ux.md §20). -->
<template>
  <div
    class="stress-gauge"
    :style="{'--gauge-cells': GAUGE_CELLS}"
    role="img"
    :aria-label="`${label} ${valueText}`"
  >
    <p class="stress-gauge__kind">{{ label }}</p>
    <div class="stress-gauge__bar" :data-level="level">{{ barText }}</div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {ReadingLevel} from '@/view/view_model'

const FILLED_GLYPH = '█'
const EMPTY_GLYPH = '░'
const GAUGE_CELLS = 28 // The card's full width: one cell per 1/28 of MaxStress

const props = defineProps<{
  label: string // Which stress this is
  valueText: string // The reading, already formatted with its unit; names the gauge
  fraction: number // Stress against MaxStress, 0 to 1
  level: ReadingLevel // Which colour to band in; it turns at SafeStress
}>()

// The fill is pegged rather than allowed to overflow, so the gauge is always GaugeCells wide
const barText = computed(() => {
  const filledCells = Math.round(Math.min(Math.max(props.fraction, 0), 1) * GAUGE_CELLS)

  return FILLED_GLYPH.repeat(filledCells) + EMPTY_GLYPH.repeat(GAUGE_CELLS - filledCells)
})
</script>

<style scoped>
.stress-gauge {
    flex: none;
}

.stress-gauge__kind {
    height: var(--cell-height);
    line-height: var(--cell-height);
}

/* The outlined rectangle of §14, drawn as an outline so the gauge still occupies
   exactly one character cell. Its own GaugeCells width rather than the card's, so the
   bar is the same size wherever it is put. The frame is the console's and stays white
   whatever the fill is doing; the fill is the reading, so it takes the colour data-level
   bands it in and declares none here, which would outrank assets/styles.css. */
.stress-gauge__bar {
    width: calc(var(--cell-width) * var(--gauge-cells));
    height: var(--cell-height);
    outline: 1px solid var(--fg-faint);
    line-height: var(--cell-height);
    white-space: pre;
}
</style>
