<!-- The Stockpile: how much raw coal is stored, what a tonne costs right now, and
     the controls that buy it (ui_ux.md §11). The price itself is not upgradable —
     specs.md sets it from the market — so the card has one upgrade. -->
<template>
  <TerminalPanel :title="view.title" :width-cells="CARD_CELLS">
    <EquipmentIcon component="stockpile" />
    <SectionDivider />
    <ValueRow label="STORED" :value="view.storedText" />
    <FillBar :fraction="view.fraction" :cells="STORED_BAR_CELLS" />
    <div class="stockpile-card__price">
      <ValueRow label="COAL PRICE" :value="view.priceText" />
      <PriceHistory :samples="view.priceHistory" />
    </div>
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
    <div class="stockpile-card__upgrades">
      <p class="stockpile-card__section">UPGRADES</p>
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
import PriceHistory from '@/components/game/price_history.vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import NumericStepper from '@/components/terminal/numeric_stepper.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import type {StockpileView} from '@/view/view_model'

const CARD_CELLS = 24 // Storage card width (docs/plan.md)
const STORED_BAR_CELLS = 20 // One cell per 5% of Capacity
const MAX_BUTTON_CELLS = 3 // The label's width; the button adds its own padding

defineProps<{
  view: StockpileView
}>()

const emit = defineEmits<{
  stepAmount: [direction: number]
  fillAmount: []
  buy: []
  upgrade: []
}>()
</script>

<style scoped>
/* A blank line off what is stored: the price and its history are the other half of
   the card, and the purchase controls answer both (ui_ux.md §11) */
.stockpile-card__price {
    flex: none;
    padding-top: var(--cell-height);
}

.stockpile-card__purchase {
    display: flex;
    flex: none;
    gap: var(--space-1);
}

.stockpile-card__amount {
    flex: 1;
}

.stockpile-card__section {
    height: var(--cell-height);
    line-height: var(--cell-height);
}

/* The upgrade section sits at the foot of the card, so the buttons line up across
   the chain however tall a card's readings make it (ui_ux.md §25). A blank line
   opens it rather than a rule (ui_ux.md §8) */
.stockpile-card__upgrades {
    flex: none;
    margin-top: auto;
    padding-top: var(--cell-height);
}
</style>
