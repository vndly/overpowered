<!-- A storage bar drawn in CP437 block glyphs, with an optional row of
     threshold marks beneath it (ui_ux.md §10 and §16).

     The glyphs are a picture of a number that is already written out beside the bar,
     so the bar is hidden from assistive technology: read aloud, a row of block
     characters is noise, and the reading it draws is on the line above it. -->
<template>
  <div class="fill-bar" aria-hidden="true">
    <div class="fill-bar__cells">{{ barText }}</div>
    <div v-if="markText.length > 0" class="fill-bar__marks">{{ markText }}</div>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue'

const SOLID_GLYPH = '█'
const PARTIAL_GLYPH = '▓'
const EMPTY_GLYPH = '░'

const props = withDefaults(defineProps<{
  fraction: number
  cells?: number // Bar width in character cells
  // Thresholds, drawn beneath the bar
  marks?: {
    fraction: number
    glyph: string
  }[]
}>(), {
  cells: 10,
  marks: () => [],
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

// Marks sit on their own line: printed inline they would overwrite a fill
// cell, which is the one thing the bar exists to show
const markText = computed(() => {
  if (props.marks.length === 0) {
    return ''
  }

  const row = new Array<string>(props.cells).fill(' ')

  for (const mark of props.marks) {
    const cell = Math.round(mark.fraction * props.cells)
    row[Math.min(Math.max(cell, 0), props.cells - 1)] = mark.glyph
  }

  return row.join('')
})
</script>

<style scoped>
.fill-bar {
    flex: none;
}

.fill-bar__cells,
.fill-bar__marks {
    height: var(--cell-height);
    line-height: var(--cell-height);
    white-space: pre;
}

/* The bar is the reading, so it is green (assets/styles.css) */
.fill-bar__cells {
    color: var(--data);
}

/* The marks are a scale printed under the bar rather than part of it, so they stay
   the console's own colour — and so they match the legend that names them in
   components/game/buffer_card.vue, which is the same glyph in running text */
.fill-bar__marks {
    color: var(--fg-dim);
}
</style>
