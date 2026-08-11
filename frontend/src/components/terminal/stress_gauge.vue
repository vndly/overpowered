<!-- Where a machine is running between its safe stress and its maximum
     (ui_ux.md §14). The marker is fixed at SafeStress and the fill is not: a
     machine straining against a backed-up or empty store reads past its maximum,
     so the fill pegs at the right-hand end rather than running off the gauge.

     The gauge carries no figure beside it, so the whole of it is named as the drawing
     it is: read aloud, a scale and a row of blocks are noise, and role="img" gives the
     reading they draw. Crossing SafeStress is announced by the alerts panel as well,
     which is the same news in words (ui_ux.md §20). -->
<template>
  <div
    class="stress-gauge"
    :style="{'--gauge-cells': GAUGE_CELLS}"
    role="img"
    :aria-label="`${label} ${valueText}`"
  >
    <p class="stress-gauge__kind">{{ label }}</p>
    <div class="stress-gauge__scale">
      <span>SAFE</span>
      <span>MAX</span>
    </div>
    <div class="stress-gauge__bar">{{ barText }}</div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'

const FILLED_GLYPH = '█'
const EMPTY_GLYPH = '░'
const SAFE_GLYPH = '|'
const GAUGE_CELLS = 28 // The card's full width: one cell per 1/28 of MaxStress

const props = defineProps<{
  label: string // Which stress this is
  valueText: string // The reading, already formatted with its unit; names the gauge
  fraction: number // Stress against MaxStress, 0 to 1
  safeFraction: number // SafeStress against MaxStress
}>()

// The marker overwrites the cell it lands on rather than taking one of its own, so
// the gauge is always GaugeCells wide and stays legible once the fill passes it
const barText = computed(() => {
  const filledCells = Math.round(Math.min(Math.max(props.fraction, 0), 1) * GAUGE_CELLS)
  const cells = (FILLED_GLYPH.repeat(filledCells) + EMPTY_GLYPH.repeat(GAUGE_CELLS - filledCells)).split('')
  const safeCell = Math.round(props.safeFraction * GAUGE_CELLS)

  cells[Math.min(Math.max(safeCell, 0), GAUGE_CELLS - 1)] = SAFE_GLYPH

  return cells.join('')
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

/* Both label and bar are the gauge's own width rather than the card's, so MAX
   sits over the end of the scale it names */
.stress-gauge__scale,
.stress-gauge__bar {
    width: calc(var(--cell-width) * var(--gauge-cells));
    height: var(--cell-height);
    line-height: var(--cell-height);
}

.stress-gauge__scale {
    display: flex;
    justify-content: space-between;
    color: var(--fg-dim);
}

/* The outlined rectangle of §14, drawn as an outline so the gauge still occupies
   exactly one character cell. The frame is the console's and the fill is the
   reading's, so the two take different colours (assets/styles.css). */
.stress-gauge__bar {
    outline: 1px solid var(--fg-faint);
    color: var(--data);
    white-space: pre;
}
</style>
