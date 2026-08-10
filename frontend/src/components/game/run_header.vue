<!-- The run header (ui_ux.md §6): the game's name, the clock, and how far the run has
     come against the target. It sits outside the chain and never leaves the screen,
     because the clock and the progress are the two halves of the invest-or-bank
     decision and specs.md §UI asks for them together.

     The title and the clock are the two things in the interface set larger than a
     character cell. A bitmap face only stays crisp at whole multiples of its cell, so
     they double to two cells rather than taking some intermediate size (ui_ux.md §2).

     The settings control sits here rather than in the run overlay so that it is
     reachable during a run as well as between runs. Its glyph is CP437's ☼: the page
     is set in a CP437 face that has no gear, and the interface draws its symbols in
     text rather than adding images to the seven equipment drawings (CLAUDE.md). -->
<template>
  <header class="run-header">
    <h1 class="run-header__title">OVERPOWERED</h1>
    <div class="run-header__run">
      <p class="run-header__time">TIME <span class="run-header__reading">{{ view.timeText }}</span></p>
      <div class="run-header__target">
        <p class="run-header__stored">STORED <span class="run-header__reading">{{ view.target.storedText }} / {{ view.target.targetText }} MWh</span></p>
        <FillBar :fraction="view.target.fraction" :cells="TARGET_BAR_CELLS" />
      </div>
    </div>
    <div ref="settings" class="run-header__settings">
      <TerminalButton
        :label="SETTINGS_GLYPH"
        aria-label="SETTINGS"
        :width-cells="SETTINGS_CELLS"
        @press="emit('settings')"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import {useTemplateRef} from 'vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import type {GameView} from '@/view/view_model'

const TARGET_BAR_CELLS = 24 // The run's progress, one cell per 1/24th of TargetEnergy
const SETTINGS_GLYPH = '☼' // CP437 character 15, the closest thing that face has to a cog
const SETTINGS_CELLS = 2 // The glyph is drawn at two cells, so it takes two of them

defineProps<{
  view: GameView
}>()

const emit = defineEmits<{
  settings: []
}>()

const settings = useTemplateRef<HTMLElement>('settings')

/** Puts the focus back on the settings control, for whatever it opened to give it back. */
function focusSettings(): void {
  settings.value?.querySelector('button')?.focus()
}

defineExpose({
  focusSettings: focusSettings,
})
</script>

<style scoped>
/* Two character lines of content: the title fills both, and the readout stacks its
   value over its bar. The rule and the blank line beneath it come to one more line
   between them, as a section_divider does — so with a border box the height carries
   the padding and the rule as well (ui_ux.md §6 asks for a compact header).

   Three columns whose outer two take the same share, so the run readout between them
   sits at the centre of the window rather than the centre of what is left. The
   settings control holds the third column open against the title in the first. */
.run-header {
    display: grid;
    flex: none;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--space-4);
    height: calc(var(--cell-height) * 2 + var(--space-2));
    margin-bottom: var(--space-2);
    padding-bottom: calc(var(--space-2) - 1px);
    border-bottom: 1px solid var(--fg-faint);
}

.run-header__title {
    font-size: calc(var(--cell-height) * 2);
    /* A bitmap face has one weight; the browser would fake the heading's bold */
    font-weight: inherit;
    line-height: calc(var(--cell-height) * 2);
}

/* The clock and the target are the two halves of the invest-or-bank decision, so they
   read as one group. Both are two character lines tall and centre against each other. */
.run-header__run {
    display: flex;
    align-items: center;
    gap: var(--space-4);
}

.run-header__time {
    font-size: calc(var(--cell-height) * 2);
    line-height: calc(var(--cell-height) * 2);
}

/* The stored value is shorter than its bar, so it is centred over it rather than
   hanging off one end of the block */
.run-header__target {
    text-align: center;
}

.run-header__stored {
    height: var(--cell-height);
    line-height: var(--cell-height);
}

/* The clock and the stored figure are readings inside a labelled line, so the label
   stays the console's colour and the number takes the readout's. The header writes
   both as running text rather than as a value_row, so it colours them itself. */
.run-header__reading {
    color: var(--data);
}

/* Set at two cells like the title and the clock beside it, so the one control in the
   header reads at the header's own scale rather than the chain's */
.run-header__settings {
    justify-self: end;
    font-size: calc(var(--cell-height) * 2);
}

/* The run overlay's scrim is drawn over the whole screen, this header included, and a
   control a player cannot see is not reachable whatever the tab order says. So the one
   thing that overlay leaves live is lifted over the scrim — but no further: the scanline
   layer shares this z-index and comes after it, and a raster belongs to the display
   rather than to anything drawn on it. When the settings panel is what is open, the
   header is inert and takes the dimming with everything else. */
.run-header:not([inert]) .run-header__settings {
    position: relative;
    z-index: 1;
}
</style>
