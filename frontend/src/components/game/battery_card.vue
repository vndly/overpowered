<!-- The Battery, the store the run is scored on (ui_ux.md §15). It reads STORED and its
     bar and nothing else: SPENDABLE, RESERVED and NET FLOW are dropped, so the card
     carries the same readings as the Silo and the Tank.

     What still sets it apart is not what it prints but where its bar turns colour. The
     band sits on MinimumReserve rather than on empty (view_model.ts), because at the
     floor there is nothing left to spend. -->
<template>
  <TerminalPanel :title="view.title" :width-cells="CARD_CELLS">
    <EquipmentIcon component="battery" />
    <SectionDivider spaced />
    <ValueRow label="STORED" :value="view.storedText" />
    <FillBar :fraction="view.fraction" :level="view.level" :cells="STORED_BAR_CELLS" />
    <div class="battery-card__upgrades">
      <SectionLabel label="UPGRADES" />
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
import EquipmentIcon from '@/components/game/equipment_icon.vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import SectionLabel from '@/components/terminal/section_label.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import type {BatteryView} from '@/view/view_model'

const CARD_CELLS = 28 // Card width, the same for all seven (docs/plan.md)
const STORED_BAR_CELLS = CARD_CELLS // The bar spans the card: one cell per 1/28 of Capacity

defineProps<{
  view: BatteryView
}>()

const emit = defineEmits<{
  upgrade: []
}>()
</script>

<style scoped>
/* The upgrade section sits at the foot of the card, so the buttons line up across
   the chain however tall a card's readings make it (ui_ux.md §25). A blank line
   opens it rather than a rule (ui_ux.md §8) */
.battery-card__upgrades {
    display: flex;
    flex: none;
    flex-direction: column;
    /* A price is read off the row above it, so each button stands a little off its
       label rather than butting straight against it */
    gap: var(--space-1);
    margin-top: auto;
    padding-top: var(--cell-height);
}
</style>
