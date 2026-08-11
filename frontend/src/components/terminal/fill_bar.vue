<!-- A storage bar drawn in CP437 block glyphs (ui_ux.md §10 and §16).

     The glyphs are a picture of a number that is already written out beside the bar,
     so the bar is hidden from assistive technology: read aloud, a row of block
     characters is noise, and the reading it draws is on the line above it. The colour
     it is banded in is likewise nothing new — the figure beside it and the alerts panel
     both say where the store stands, so no reading rests on the colour alone. -->
<template>
  <div class="fill-bar" aria-hidden="true">
    <div class="fill-bar__cells" :data-level="level">{{ barText }}</div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {ReadingLevel} from '@/view/view_model'

const SOLID_GLYPH = '█'
const PARTIAL_GLYPH = '▓'
const EMPTY_GLYPH = '░'

const props = withDefaults(defineProps<{
  fraction: number
  cells?: number // Bar width in character cells
  level?: ReadingLevel // Which colour to band in; the run's progress is never anything else
}>(), {
  cells: 10,
  level: 'safe',
})

// A half-filled cell rounds up to the partial glyph rather than disappearing
const barText = computed(() => {
  const filledCells = Math.min(Math.max(props.fraction, 0), 1) * props.cells
  const solidCells = Math.min(Math.floor(filledCells), props.cells)
  const partialCells = solidCells < props.cells && filledCells - solidCells >= 0.5 ? 1 : 0
  const emptyCells = props.cells - solidCells - partialCells

  return SOLID_GLYPH.repeat(solidCells)
    + PARTIAL_GLYPH.repeat(partialCells)
    + EMPTY_GLYPH.repeat(emptyCells)
})
</script>

<style scoped>
.fill-bar {
    flex: none;
}

/* The bar is the reading, so its colour is the band data-level carries and no rule of its
   own: a scoped colour here would outrank the one in assets/styles.css that maps them */
.fill-bar__cells {
    height: var(--cell-height);
    line-height: var(--cell-height);
    white-space: pre;
}
</style>
