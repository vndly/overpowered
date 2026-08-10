<!-- The application's only screen: the production chain, the overlay that opens and
     closes a run, and a status line standing in for the run header until Stage 7. -->
<template>
  <main class="home-screen">
    <p class="home-screen__status">
      <span>TIME {{ view.timeText }}</span>
      <span>STORED {{ view.target.storedText }} / {{ view.target.targetText }} MWh</span>
    </p>
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

.home-screen__status {
    display: flex;
    gap: calc(var(--cell-width) * 4);
    height: var(--cell-height);
    margin-bottom: var(--space-2);
    line-height: var(--cell-height);
}
</style>
