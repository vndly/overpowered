<!-- A label and its value on one character line, value right-aligned.
     The only way a label/value pair is rendered, so numeric columns line up
     down a card (ui_ux.md §3). -->
<template>
  <div class="value-row" :class="{'value-row--dim': dim}">
    <span>{{ label }}</span>
    <span class="value-row__value">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string // Already formatted; this component never rounds
  dim?: boolean // Secondary reading, rendered in dim green
}>(), {
  dim: false,
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

.value-row__value {
    text-align: right;
}
</style>
