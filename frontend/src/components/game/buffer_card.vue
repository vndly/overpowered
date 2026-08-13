<!-- The Silo and the Tank. One card type: ui_ux.md §10 draws them the same, and they
     differ only in the drawing at their head and the title above it.

     FLOW sits under STORED because they are the two halves of one budget: a store that
     holds more moves material more slowly, and buying either takes from the other
     (specs.md §Storage flow). Both the Silo and the Tank contend, so the figure has to
     cover what enters and what leaves at once. -->
<template>
  <TerminalPanel :title="view.title" :width-cells="CARD_CELLS">
    <EquipmentIcon :component="component" :status="view.status" />
    <SectionDivider spaced />
    <ValueRow label="STORED" :value="view.storedText" />
    <FillBar :fraction="view.fraction" :level="view.level" :cells="STORED_BAR_CELLS" />
    <ValueRow
      class="buffer-card__flow"
      :class="{'buffer-card__flow--limited': view.flowLimited}"
      label="FLOW"
      :value="view.flowText"
    />
    <UpgradeBlock :rows="rows" @press="onPress" />
  </TerminalPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import EquipmentIcon from '@/components/game/equipment_icon.vue'
import UpgradeBlock from '@/components/game/upgrade_block.vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import type {BufferView} from '@/view/view_model'

const CARD_CELLS = 28 // Card width, the same for all seven (docs/plan.md)
const STORED_BAR_CELLS = CARD_CELLS // The bar spans the card: one cell per 1/28 of Capacity

const props = defineProps<{
  view: BufferView
  component: 'silo' | 'tank' // Which drawing heads the card
}>()

const emit = defineEmits<{
  upgradeCapacity: []
  upgradeFlow: []
}>()

const rows = computed(() => [
  props.view.capacityUpgrade,
  props.view.flowUpgrade,
])

/**
 * Reports which track was pressed.
 * @param index - Position in the rows above
 */
function onPress(index: number): void {
  if (index === 0) {
    emit('upgradeCapacity')
  } else {
    emit('upgradeFlow')
  }
}
</script>

<style scoped>
/* A blank line off what is stored, the rule every reading follows (ui_ux.md §8) */
.buffer-card__flow {
    margin-top: var(--cell-height);
}

/* A Flow that is holding a machine back is the one thing on this card that is currently
   costing the player something, and it reads exactly like a full store on the machine's
   own gauge. The alerts panel names which in words (specs.md §Buffers and strain); here
   the figure itself cautions, so the card the player is looking at points at it. */
.buffer-card__flow--limited :deep(.value-row__value) {
    color: var(--caution);
}
</style>
