<!-- The Battery, the store the run is scored on (ui_ux.md §15). It reads STORED, its bar,
     and FLOW — the same two rows as the Silo and the Tank.

     What still sets it apart is not what it prints but what the two figures mean. Its bar
     turns colour on MinimumReserve rather than on empty (view_model.ts), because at the
     floor there is nothing left to spend; and its FLOW is the plant's last gate, capping
     the Turbine directly, so a Turbine built past it generates into a wall. -->
<template>
  <TerminalPanel :title="view.title" :width-cells="CARD_CELLS">
    <EquipmentIcon component="battery" :status="view.status" />
    <SectionDivider spaced />
    <ValueRow label="STORED" :value="view.storedText" />
    <FillBar :fraction="view.fraction" :level="view.level" :cells="STORED_BAR_CELLS" />
    <ValueRow
      class="battery-card__flow"
      :class="{'battery-card__flow--limited': view.flowLimited}"
      label="CHARGE"
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
import type {BatteryView} from '@/view/view_model'

const CARD_CELLS = 28 // Card width, the same for all seven (docs/plan.md)
const STORED_BAR_CELLS = CARD_CELLS // The bar spans the card: one cell per 1/28 of Capacity

const props = defineProps<{
  view: BatteryView
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
.battery-card__flow {
    margin-top: var(--cell-height);
}

/* Labelled CHARGE rather than FLOW because only one direction is capped: the Turbine
   charging in. Discharge to the Pulverizer and Boiler is uncapped, which is what keeps a
   dead run restartable (specs.md §Storage flow). */
.battery-card__flow--limited :deep(.value-row__value) {
    color: var(--caution);
}
</style>
