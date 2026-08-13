<!-- One upgrade, as a single console key: what it buys, what it costs, and what it takes
     from you. The three sit on one line because they are one decision — a label row above
     a separate button made a machine's three tracks read as six things.

     The marker on the right is permanent (specs.md §UI). Every track erodes another, and a
     stat that dropped with nothing on screen explaining it would read as a fault rather
     than as the price of the purchase. -->
<template>
  <button
    class="upgrade-button"
    type="button"
    :aria-disabled="disabled"
    :aria-label="`UPGRADE ${row.label}: ${row.costText}, ${row.raisesText}, costs ${row.erodesText}`"
    @click="onClick"
    @mouseenter="emit('preview')"
    @mouseleave="emit('clear')"
    @focus="emit('preview')"
    @blur="emit('clear')"
  >
    <span class="upgrade-button__label">{{ row.label }}</span>
    <span class="upgrade-button__cost">{{ row.costText }}</span>
    <span class="upgrade-button__penalty">{{ row.penaltyLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import type {UpgradeRowView} from '@/view/view_model'

const props = defineProps<{
  row: UpgradeRowView
  disabled: boolean
}>()

const emit = defineEmits<{
  press: []
  preview: [] // The pointer or the keyboard is on this row; show what it would do
  clear: []
}>()

/**
 * Reports a press, unless the upgrade is unaffordable.
 * An unaffordable button keeps its place in the tab order, as every button in the
 * interface does (ui_ux.md §21), so the guard has to live here.
 */
function onClick(): void {
  if (!props.disabled) {
    emit('press')
  }
}
</script>

<style scoped>
/* The same key the rest of the interface uses (ui_ux.md §21), laid out in three columns
   rather than centred on one label: the cost is a reading and belongs in the green
   column every other value sits in. */
.upgrade-button {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--cell-width);
    width: 100%;
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

.upgrade-button__label {
    flex: none;
}

/* Takes the slack, so the cost sits hard against the marker whatever the label is and
   the seven cards keep one column of prices */
.upgrade-button__cost {
    flex: 1;
    color: var(--data);
    text-align: right;
}

/* Four cells, the width of the longest marker, so the column holds still while a price
   grows into five figures. Yellow rather than red: this is the price of a purchase the
   player is choosing, not a fault. */
.upgrade-button__penalty {
    flex: none;
    width: calc(var(--cell-width) * 5);
    color: var(--caution);
    text-align: right;
}

.upgrade-button:not([aria-disabled='true']):hover,
.upgrade-button:not([aria-disabled='true']):focus-visible {
    background: var(--fg-faint);
}

.upgrade-button:not([aria-disabled='true']):active {
    background: var(--fg);
    color: var(--bg);
}

/* Inverted, the row is one block of colour, so the two readings have to come with it or
   they vanish into it */
.upgrade-button:not([aria-disabled='true']):active .upgrade-button__cost,
.upgrade-button:not([aria-disabled='true']):active .upgrade-button__penalty {
    color: var(--bg);
}

/* Turned down on black, as ui_ux.md §21 sets the disabled state: the border keeps its
   solid stroke and only dims, so a disabled control reads as the same button turned
   down rather than as a different kind of frame. */
.upgrade-button[aria-disabled='true'] {
    border-color: var(--fg-disabled);
    color: var(--fg-disabled);
    cursor: default;
}

.upgrade-button[aria-disabled='true'] .upgrade-button__cost {
    color: var(--data-dim);
}

.upgrade-button[aria-disabled='true'] .upgrade-button__penalty {
    color: var(--fg-disabled);
}
</style>
