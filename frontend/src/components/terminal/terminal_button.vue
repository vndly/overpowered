<!-- A rectangular operator-console button (ui_ux.md §21). -->
<template>
  <button
    class="terminal-button"
    type="button"
    :style="{width: buttonWidth}"
    :aria-disabled="disabled"
    @click="onClick"
  >
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import {computed} from 'vue'

const props = withDefaults(defineProps<{
  label: string
  disabled?: boolean
  widthCells?: number // Label width in character cells; 0 fills the container
}>(), {
  disabled: false,
  widthCells: 0,
})

const emit = defineEmits<{
  press: [event: MouseEvent]
}>()

const buttonWidth = computed(() => {
  if (props.widthCells <= 0) {
    return '100%'
  }

  return `calc(var(--cell-width) * ${props.widthCells} + var(--space-2) * 2 + 2px)`
})

/**
 * Reports a press, unless the button is disabled.
 * A disabled button keeps its place in the tab order (aria-disabled rather
 * than the disabled attribute) so a player can still read the price they
 * cannot yet pay, so the guard has to live here.
 * @param event - The originating click
 */
function onClick(event: MouseEvent): void {
  if (props.disabled) {
    return
  }

  emit('press', event)
}
</script>

<style scoped>
.terminal-button {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    height: calc(var(--cell-height) * 2);
    padding: 0 var(--space-2);
    border: var(--border);
    border-radius: 0;
    background: var(--bg);
    color: var(--fg);
    font: inherit;
    line-height: var(--cell-height);
    white-space: nowrap;
    user-select: none;
    cursor: pointer;
    /* Mechanical, not animated (ui_ux.md §22) */
    transition: background-color 60ms linear, color 60ms linear;
}

.terminal-button:not([aria-disabled='true']):hover {
    background: var(--fg-faint);
}

.terminal-button:not([aria-disabled='true']):active,
.terminal-button:not([aria-disabled='true'])[aria-pressed='true'] {
    background: var(--fg);
    color: var(--bg);
}

/* Turned down on black, as ui_ux.md §21 sets the disabled state: the border keeps its
   solid stroke and only dims, so a disabled control reads as the same button turned
   down rather than as a different kind of frame. */
.terminal-button[aria-disabled='true'] {
    border-color: var(--fg-disabled);
    color: var(--fg-disabled);
    cursor: default;
}
</style>
