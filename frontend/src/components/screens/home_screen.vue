<!-- The application's only screen: the run header, the production chain, and the
     overlay that opens and closes a run. -->
<template>
  <main class="home-screen">
    <RunHeader :view="view" />
    <ProductionChain
      :view="view"
      @step-purchase-amount="stepPurchaseAmount($event)"
      @fill-purchase-amount="fillPurchaseAmount()"
      @buy-coal="buyCoal()"
      @step-setting="stepSetting"
      @purchase-upgrade="purchaseUpgrade($event)"
    />
    <RunOverlay v-if="view.outcome !== 'running'" :view="view" @advance="onAdvance" />
  </main>
</template>

<script setup lang="ts">
import ProductionChain from '@/components/game/production_chain.vue'
import RunHeader from '@/components/game/run_header.vue'
import RunOverlay from '@/components/game/run_overlay.vue'
import {useGame} from '@/view/use_game'

const {
  view, startRun, newRun, stepSetting, stepPurchaseAmount, fillPurchaseAmount, buyCoal, purchaseUpgrade,
} = useGame()

/**
 * Carries the run forward: the overlay's one button either opens a run or replaces
 * the one that has just ended.
 */
function onAdvance(): void {
  if (view.value.outcome === 'idle') {
    startRun()
  } else {
    newRun()
  }
}
</script>

<style scoped>
.home-screen {
    height: 100%;
    padding: var(--space-4);
}
</style>
