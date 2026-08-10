<!-- The Silo and the Tank. One card type: ui_ux.md §10 draws them the same, and
     they differ only in the strain thresholds marked beneath their fill bars. -->
<template>
  <TerminalPanel :title="view.title" :width-cells="CARD_CELLS">
    <EquipmentIcon :component="component" />
    <SectionDivider />
    <ValueRow label="STORED" :value="view.storedText" />
    <FillBar :fraction="view.fraction" :cells="STORED_BAR_CELLS" :marks="view.marks" />
    <!-- Hidden with the marks it names: an explanation of a drawing nobody can see is
         worse than silence, and the thresholds announce themselves in the alerts panel -->
    <p v-if="legend.length > 0" class="buffer-card__legend" aria-hidden="true">{{ legend }}</p>
    <div class="buffer-card__upgrades">
      <p class="buffer-card__section">UPGRADES</p>
      <ValueRow label="CAPACITY" :value="view.upgradeGainText" />
      <TerminalButton
        :label="view.upgradeCostText"
        :aria-label="`UPGRADE CAPACITY: ${view.upgradeCostText}`"
        :disabled="!view.upgradeAffordable"
        @press="emit('upgrade')"
      />
    </div>
  </TerminalPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import EquipmentIcon from '@/components/game/equipment_icon.vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import type {BufferView} from '@/view/view_model'

const CARD_CELLS = 24 // Storage card width (docs/plan.md)
const STORED_BAR_CELLS = 20 // One cell per 5% of Capacity, so both marks land exactly

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
  component: 'silo' | 'tank' // Which drawing heads the card
}>()

const emit = defineEmits<{
  upgrade: []
}>()

const legend = computed(() => props.view.marks
  .map((mark) => `${mark.glyph}${MARK_LABELS[mark.glyph] ?? ''}`)
  .join(' '))
</script>

<style scoped>
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
