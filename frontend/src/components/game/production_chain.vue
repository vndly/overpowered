<!-- The production chain: seven cards in the order specs.md sets, each flow between
     them drawn as an arrow. The row is all this component owns. Cards read the view
     model and report intent, which this passes straight up; no rule is applied here.
     The machine and Battery slots are placeholders until Stages 6 and 7. -->
<template>
  <section class="production-chain" aria-label="PRODUCTION CHAIN">
    <StockpileCard
      :view="view.stockpile"
      @step-amount="emit('stepPurchaseAmount', $event)"
      @fill-amount="emit('fillPurchaseAmount')"
      @buy="emit('buyCoal')"
      @upgrade="emit('purchaseUpgrade', 'stockpile_capacity')"
    />
    <FlowArrow />
    <TerminalPanel :title="view.pulverizer.title" :width-cells="MACHINE_CELLS">
      <p class="production-chain__pending">{{ PENDING_NOTE }}</p>
    </TerminalPanel>
    <FlowArrow />
    <BufferCard :view="view.silo" @upgrade="emit('purchaseUpgrade', 'silo_capacity')" />
    <FlowArrow />
    <TerminalPanel :title="view.boiler.title" :width-cells="MACHINE_CELLS">
      <p class="production-chain__pending">{{ PENDING_NOTE }}</p>
    </TerminalPanel>
    <FlowArrow />
    <BufferCard :view="view.tank" @upgrade="emit('purchaseUpgrade', 'tank_capacity')" />
    <FlowArrow />
    <TerminalPanel :title="view.turbine.title" :width-cells="MACHINE_CELLS">
      <p class="production-chain__pending">{{ PENDING_NOTE }}</p>
    </TerminalPanel>
    <FlowArrow />
    <TerminalPanel :title="view.battery.title" :width-cells="STORAGE_CELLS">
      <p class="production-chain__pending">{{ PENDING_NOTE }}</p>
    </TerminalPanel>
  </section>
</template>

<script setup lang="ts">
import BufferCard from '@/components/game/buffer_card.vue'
import StockpileCard from '@/components/game/stockpile_card.vue'
import FlowArrow from '@/components/terminal/flow_arrow.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import type {UpgradeTrackId} from '@/game/types'
import type {GameView} from '@/view/view_model'

const STORAGE_CELLS = 24 // Card widths (docs/plan.md)
const MACHINE_CELLS = 30
const PENDING_NOTE = 'CARD PENDING'

defineProps<{
  view: GameView
}>()

const emit = defineEmits<{
  stepPurchaseAmount: [direction: number]
  fillPurchaseAmount: []
  buyCoal: []
  purchaseUpgrade: [track: UpgradeTrackId]
}>()
</script>

<style scoped>
/* Cards never shrink; a narrow window scrolls instead (ui_ux.md §26) */
.production-chain {
    display: flex;
    align-items: stretch;
    overflow-x: auto;
}

.production-chain__pending {
    height: var(--cell-height);
    color: var(--fg-dim);
    line-height: var(--cell-height);
    text-align: center;
}
</style>
