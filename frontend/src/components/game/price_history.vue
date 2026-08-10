<!-- The last minute of the coal price as a line of CP437 block glyphs, with the
     direction of the newest sample beside it. Without a history a dip worth
     waiting out cannot be told from the trend, and the timing of a purchase is
     invisible (specs.md §UI). Hidden from assistive technology like the other glyph
     drawings: the price itself is the row above. -->
<template>
  <div class="price-history" aria-hidden="true">{{ line }}</div>
</template>

<script setup lang="ts">
import {computed} from 'vue'

const LEVEL_GLYPHS = '▁▂▃▄▅▆▇█'
const TOP_LEVEL = LEVEL_GLYPHS.length - 1
const FLAT_LEVEL = 0 // A window with no spread reads as a baseline, not as a band
const RISING_GLYPH = '▲'
const FALLING_GLYPH = '▼'
const SERIES_CELLS = 22 // The series, a space and the direction fill the card's 24

const props = defineProps<{
  samples: number[] // One-second price samples, oldest first
}>()

/**
 * The window resampled to one glyph per cell and scaled between its own lowest and
 * highest sample: the line reports the shape of the last minute, while the level it
 * sits at is the COAL PRICE row above it.
 * @param samples - The window, oldest first
 * @returns One glyph per cell
 */
function series(samples: number[]): string {
  const lowest = Math.min(...samples)
  const range = Math.max(...samples) - lowest
  const lastIndex = samples.length - 1
  let glyphs = ''

  for (let cell = 0; cell < SERIES_CELLS; cell++) {
    const sample = samples[Math.round((cell / (SERIES_CELLS - 1)) * lastIndex)] ?? lowest
    const level = range > 0 ? Math.round(((sample - lowest) / range) * TOP_LEVEL) : FLAT_LEVEL

    glyphs += LEVEL_GLYPHS.charAt(level)
  }

  return glyphs
}

/**
 * @param samples - The window, oldest first
 * @returns Which way the newest sample moved
 */
function direction(samples: number[]): string {
  const last = samples[samples.length - 1] ?? 0
  const previous = samples[samples.length - 2] ?? last

  return last < previous ? FALLING_GLYPH : RISING_GLYPH
}

const line = computed(() => {
  if (props.samples.length === 0) {
    return ''
  }

  return `${series(props.samples)} ${direction(props.samples)}`
})
</script>

<style scoped>
.price-history {
    flex: none;
    height: var(--cell-height);
    color: var(--fg-dim);
    line-height: var(--cell-height);
    white-space: pre;
}
</style>
