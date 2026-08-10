<!-- The Silo and the Tank. One card type: ui_ux.md §10 draws them the same, and
     they differ only in the strain thresholds marked beneath their fill bars. -->
<template>
  <TerminalPanel :title="view.title" :width-cells="CARD_CELLS">
    <!-- Reserved for the equipment icon (ui_ux.md §9) -->
    <div class="buffer-card__icon"></div>
    <SectionDivider />
    <ValueRow label="STORED" :value="view.storedText" />
    <div class="buffer-card__bar">
      <FillBar :fraction="view.fraction" :marks="view.marks" />
      <span>({{ view.fillPercentText }}%)</span>
    </div>
    <p v-if="legend.length > 0" class="buffer-card__legend">{{ legend }}</p>
    <div class="buffer-card__upgrades">
      <p class="buffer-card__section">UPGRADES</p>
      <TerminalButton
        :label="`CAPACITY: ${view.upgradeCostText}`"
        :disabled="!view.upgradeAffordable"
        @press="emit('upgrade')"
      />
    </div>
  </TerminalPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import type {BufferView} from '@/view/view_model'

const CARD_CELLS = 24 // Storage card width (docs/plan.md)

// What each mark on the bar means. The marks are a scale rather than an alarm
// (ui_ux.md §10), and an unexplained tick is neither. The glyphs are the ones the
// view model marks the thresholds with; a mark drawn in any other one is left to
// speak for itself.
const MARK_LABELS: Record<string, string> = {
  '╷': 'backlog',
  '╵': 'starve',
}

const props = defineProps<{
  view: BufferView
}>()

const emit = defineEmits<{
  upgrade: []
}>()

const legend = computed(() => props.view.marks
  .map((mark) => `${mark.glyph}${MARK_LABELS[mark.glyph] ?? ''}`)
  .join(' '))
</script>

<style scoped>
/* Three cells tall, which is where the 64 x 48 icon lands (ui_ux.md §9) */
.buffer-card__icon {
    flex: none;
    height: calc(var(--cell-height) * 3);
}

/* The fill percentage sits in the same right-hand column as every value above it,
   on the bar's own line: the bar is two lines tall once it carries marks, and the
   row has to grow with it rather than crop it */
.buffer-card__bar {
    display: flex;
    flex: none;
    align-items: flex-start;
    justify-content: space-between;
    line-height: var(--cell-height);
}

.buffer-card__legend {
    flex: none;
    height: var(--cell-height);
    color: var(--fg-dim);
    line-height: var(--cell-height);
}

.buffer-card__section {
    height: var(--cell-height);
    line-height: var(--cell-height);
}

/* The upgrade section sits at the foot of the card, so the buttons line up across
   the chain however tall a card's readings make it (ui_ux.md §25). A blank line
   opens it rather than a rule (ui_ux.md §8) */
.buffer-card__upgrades {
    flex: none;
    margin-top: auto;
    padding-top: var(--cell-height);
}
</style>
