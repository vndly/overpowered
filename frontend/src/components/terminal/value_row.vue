<!-- A label and its value on one character line, value right-aligned.
     The only way a label/value pair is rendered, so numeric columns line up
     down a card (ui_ux.md §3). -->
<template>
  <div class="value-row" :class="{'value-row--dim': dim, 'value-row--large': large}">
    <span>{{ label }}</span>
    <span class="value-row__value">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string // Already formatted; this component never rounds
  dim?: boolean // Secondary reading, rendered in dim green
  large?: boolean // A reading its panel is built around, set half again the character cell
}>(), {
  dim: false,
  large: false,
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

.value-row__value {
    text-align: right;
}
</style>
