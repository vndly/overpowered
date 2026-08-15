<!-- A label and its value on one character line, value right-aligned.
     The only way a label/value pair is rendered, so numeric columns line up
     down a card (ui_ux.md §3).

     A reading that is banded carries the band on its value alone: the label is the
     console's printed legend and says the same thing whatever the figure is doing. -->
<template>
  <div class="value-row" :class="{'value-row--dim': dim, 'value-row--large': large}">
    <span>{{ label }}</span>
    <span class="value-row__value" :data-level="level">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
import type {ReadingLevel} from '@/view/view_model'

withDefaults(defineProps<{
  label: string
  value: string // Already formatted; this component never rounds
  dim?: boolean // Secondary reading, turned down on both sides of the row
  large?: boolean // A reading its panel is built around, set half again the character cell
  level?: ReadingLevel // Which colour to band the value in; absent leaves it green
}>(), {
  dim: false,
  large: false,
  level: undefined,
})
</script>

<style scoped>
.value-row {
    display: flex;
    flex: none;
    justify-content: space-between;
    gap: var(--cell-width);
    height: var(--cell-height);
    line-height: var(--cell-height);
    white-space: pre;
}

.value-row--dim {
    color: var(--fg-dim);
}

/* Half again the cell rather than twice it. A bitmap face is only strictly crisp at
   whole multiples (ui_ux.md §2), and 1.5 is the one fraction that stays honest about
   it: every 2px stem lands on 3px, and a pair of these rows comes to three character
   lines, so the panel around them stays on the grid. */
.value-row--large {
    height: calc(var(--cell-height) * 1.5);
    font-size: calc(var(--cell-height) * 1.5);
    line-height: calc(var(--cell-height) * 1.5);
}

/* The label is the console's printed legend and the value is its readout, so the row
   carries both colours (assets/styles.css). This is the one rule that puts every
   reading in the interface in green — every card builds its numbers out of this row.
   A banded value declares no colour, so the one mapping in assets/styles.css is what
   colours it, the same way it colours every bar. */
.value-row__value {
    text-align: right;
}

.value-row__value:not([data-level]) {
    color: var(--data);
}

.value-row--dim .value-row__value {
    color: var(--data-dim);
}
</style>
