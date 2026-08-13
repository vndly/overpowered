<!-- The Stockpile: how much raw coal is stored, what a tonne costs right now, and the
     controls that buy it (ui_ux.md §11). The price itself is not upgradable — specs.md
     sets it from the clock.

     A purchase lands whole, the instant it is made. What the store's FLOW governs is the
     other direction: how fast coal can leave again to feed the Pulverizer, which makes it
     the first rate in the chain rather than a delay on the player's own action. -->
<template>
  <TerminalPanel :title="view.title" :width-cells="CARD_CELLS">
    <EquipmentIcon component="stockpile" :status="view.status" />
    <SectionDivider spaced />
    <ValueRow label="STORED" :value="view.storedText" />
    <FillBar :fraction="view.fraction" :level="view.level" :cells="STORED_BAR_CELLS" />
    <ValueRow
      class="stockpile-card__reading"
      :class="{'stockpile-card__flow--limited': view.flowLimited}"
      label="FLOW"
      :value="view.flowText"
    />
    <ValueRow class="stockpile-card__reading" label="PRICE" :value="view.priceText" />
    <div class="stockpile-card__purchase">
      <NumericStepper
        class="stockpile-card__amount"
        :value="view.purchaseAmountText"
        label="COAL PURCHASE"
        :disabled-down="view.purchaseKilograms <= 0"
        @step="emit('stepAmount', $event)"
      />
      <TerminalButton
        label="MAX"
        aria-label="MAX COAL PURCHASE"
        :width-cells="MAX_BUTTON_CELLS"
        @press="emit('fillAmount')"
      />
    </div>
    <TerminalButton
      :label="`BUY: ${view.purchaseCostText}`"
      :disabled="!view.purchaseAffordable"
      @press="emit('buy')"
    />
    <UpgradeBlock :rows="rows" @press="onPress" />
  </TerminalPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import EquipmentIcon from '@/components/game/equipment_icon.vue'
import UpgradeBlock from '@/components/game/upgrade_block.vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import NumericStepper from '@/components/terminal/numeric_stepper.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import type {StockpileView} from '@/view/view_model'

const CARD_CELLS = 28 // Card width, the same for all seven (docs/plan.md)
const STORED_BAR_CELLS = CARD_CELLS // The bar spans the card: one cell per 1/28 of Capacity
const MAX_BUTTON_CELLS = 3 // The label's width; the button adds its own padding

const props = defineProps<{
  view: StockpileView
}>()

const emit = defineEmits<{
  stepAmount: [direction: number]
  fillAmount: []
  buy: []
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
/* Every reading opens on a blank line (ui_ux.md §8). A margin rather than padding,
   because the row it sits on is one character cell tall and border-box would eat it.
   Both readings here answer questions of their own, so both open on one. */
.stockpile-card__reading {
    margin-top: var(--cell-height);
}

.stockpile-card__purchase {
    display: flex;
    flex: none;
    gap: var(--space-1);
}

.stockpile-card__amount {
    flex: 1;
}

/* A Stockpile that cannot feed the Pulverizer fast enough throttles the whole chain from
   its first stage, so the figure cautions rather than waiting for the alerts panel */
.stockpile-card__flow--limited :deep(.value-row__value) {
    color: var(--caution);
}
</style>
