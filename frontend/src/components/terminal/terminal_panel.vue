<!-- A bordered terminal card: centred uppercase title above a slotted body.

     The title names the section rather than merely heading it, so each card is a
     region a player can jump straight to instead of one unnamed box among eleven. A
     panel may go without one, and then it is named by whatever opened it. -->
<template>
  <section class="terminal-panel" :style="{'--panel-cells': widthCells}" :aria-labelledby="title === undefined ? undefined : titleId">
    <h2 v-if="title !== undefined" :id="titleId" class="terminal-panel__title">{{ title }}</h2>
    <div class="terminal-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import {useId} from 'vue'

defineProps<{
  title?: string // Absent draws no heading, and leaves the panel to be named by its container
  widthCells: number // Width of the body in character cells
}>()

const titleId = useId() // Unique per card, so seven of these can name themselves
</script>

<style scoped>
/* The body holds widthCells characters; the padding and the border sit outside it,
   which is why the width adds the padding twice and the border twice. A caller that
   wants more room around its body sets --panel-padding, and the width follows it. The
   default is the var() fallback rather than a declaration here, because a declaration
   would land on the same element as the caller's at the same specificity, and which of
   the two won would come down to the order the components happened to be bundled in. */
.terminal-panel {
    display: flex;
    flex: none;
    flex-direction: column;
    width: calc(var(--cell-width) * var(--panel-cells) + var(--panel-padding, var(--space-2)) * 2 + 2px);
    padding: var(--panel-padding, var(--space-2));
    border: var(--border);
    border-radius: 0;
    background: var(--bg);
}

.terminal-panel__title {
    height: var(--cell-height);
    font-size: inherit;
    font-weight: inherit;
    line-height: var(--cell-height);
    text-align: center;
    text-transform: uppercase;
}

.terminal-panel__body {
    display: flex;
    flex: 1;
    flex-direction: column;
}
</style>
