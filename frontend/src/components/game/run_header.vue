<!-- The run header (ui_ux.md §6): the game's name, the clock, and how far the run has
     come against the target. It sits outside the chain and never leaves the screen,
     because the clock and the progress are the two halves of the invest-or-bank
     decision and specs.md §UI asks for them together.

     The title is the one thing in the interface set larger than a character cell. A
     bitmap face only stays crisp at whole multiples of its cell, so it doubles to two
     cells rather than taking some intermediate size (ui_ux.md §2). -->
<template>
  <header class="run-header">
    <h1 class="run-header__title">OVERPOWERED</h1>
    <p class="run-header__time">TIME {{ view.timeText }}</p>
    <div class="run-header__target">
      <p class="run-header__stored">STORED {{ view.target.storedText }} / {{ view.target.targetText }} MWh</p>
      <FillBar :fraction="view.target.fraction" :cells="TARGET_BAR_CELLS" />
    </div>
  </header>
</template>

<script setup lang="ts">
import FillBar from '@/components/terminal/fill_bar.vue'
import type {GameView} from '@/view/view_model'

const TARGET_BAR_CELLS = 24 // The run's progress, one cell per 1/24th of TargetEnergy

defineProps<{
  view: GameView
}>()
</script>

<style scoped>
/* Two character lines of content: the title fills both, and the readout stacks its
   value over its bar. The rule and the blank line beneath it come to one more line
   between them, as a section_divider does — so with a border box the height carries
   the padding and the rule as well (ui_ux.md §6 asks for a compact header). */
.run-header {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-4);
    height: calc(var(--cell-height) * 2 + var(--space-2));
    margin-bottom: var(--space-2);
    padding-bottom: calc(var(--space-2) - 1px);
    border-bottom: 1px solid var(--fg-faint);
}

/* The title and the readout each take the same share, so the clock between them
   sits at the centre of the window rather than the centre of what is left */
.run-header__title {
    flex: 1;
    font-size: calc(var(--cell-height) * 2);
    /* A bitmap face has one weight; the browser would fake the heading's bold */
    font-weight: inherit;
    line-height: calc(var(--cell-height) * 2);
}

.run-header__time {
    flex: none;
    line-height: var(--cell-height);
}

.run-header__target {
    flex: 1;
    text-align: right;
}

.run-header__stored {
    height: var(--cell-height);
    line-height: var(--cell-height);
}
</style>
