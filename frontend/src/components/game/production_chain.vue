<!-- The production chain: seven cards in the order specs.md sets, each flow between
     them drawn as an arrow. The row is all this component owns. Cards read the view
     model and report intent, which this passes straight up; no rule is applied here. -->
<template>
  <section class="production-chain" aria-label="PRODUCTION CHAIN">
    <StockpileCard
      :view="view.stockpile"
      @step-amount="emit('stepPurchaseAmount', $event)"
      @fill-amount="emit('fillPurchaseAmount')"
      @buy="emit('buyCoal')"
      @upgrade-capacity="emit('purchaseUpgrade', 'stockpile_capacity')"
      @upgrade-flow="emit('purchaseUpgrade', 'stockpile_flow')"
    />
    <FlowArrow />
    <MachineCard
      :view="view.pulverizer"
      component="pulverizer"
      @upgrade-capacity="emit('purchaseUpgrade', 'pulverizer_capacity')"
      @upgrade-efficiency="emit('purchaseUpgrade', 'pulverizer_efficiency')"
      @upgrade-tolerance="emit('purchaseUpgrade', 'pulverizer_tolerance')"
    />
    <FlowArrow />
    <BufferCard
      :view="view.silo"
      component="silo"
      @upgrade-capacity="emit('purchaseUpgrade', 'silo_capacity')"
      @upgrade-flow="emit('purchaseUpgrade', 'silo_flow')"
    />
    <FlowArrow />
    <MachineCard
      :view="view.boiler"
      component="boiler"
      @upgrade-capacity="emit('purchaseUpgrade', 'boiler_capacity')"
      @upgrade-efficiency="emit('purchaseUpgrade', 'boiler_efficiency')"
      @upgrade-tolerance="emit('purchaseUpgrade', 'boiler_tolerance')"
    />
    <FlowArrow />
    <BufferCard
      :view="view.tank"
      component="tank"
      @upgrade-capacity="emit('purchaseUpgrade', 'tank_capacity')"
      @upgrade-flow="emit('purchaseUpgrade', 'tank_flow')"
    />
    <FlowArrow />
    <MachineCard
      :view="view.turbine"
      component="turbine"
      @upgrade-capacity="emit('purchaseUpgrade', 'turbine_capacity')"
      @upgrade-efficiency="emit('purchaseUpgrade', 'turbine_efficiency')"
      @upgrade-tolerance="emit('purchaseUpgrade', 'turbine_tolerance')"
    />
    <FlowArrow />
    <BatteryCard
      :view="view.battery"
      @upgrade-capacity="emit('purchaseUpgrade', 'battery_capacity')"
      @upgrade-flow="emit('purchaseUpgrade', 'battery_flow')"
    />
  </section>
</template>

<script setup lang="ts">
import BatteryCard from '@/components/game/battery_card.vue'
import BufferCard from '@/components/game/buffer_card.vue'
import MachineCard from '@/components/game/machine_card.vue'
import StockpileCard from '@/components/game/stockpile_card.vue'
import FlowArrow from '@/components/terminal/flow_arrow.vue'
import type {UpgradeTrackId} from '@/game/types'
import type {GameView} from '@/view/view_model'

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
</style>
