<!-- The application's only screen: the run header, the production chain, the lower
     dashboard, and the overlay that opens and closes a run.

     While the overlay is up, everything behind it is inert. The scrim already takes
     the pointer, and inert takes the keyboard with it: the overlay says aria-modal,
     and a Tab that reached a card behind it would make that a lie — and would let a
     player buy an upgrade for a run that has already ended.

     The display options replace that overlay rather than stack on it, so there is only
     ever one dialog, and closing them puts the focus back on the run's own button. The
     two attributes on the root switch the parts of the CRT layer that belong to
     everything at once; the scanlines are their own element (assets/styles.css). -->
<template>
  <main class="home-screen" :data-glow="glowAttribute" :data-animation="animationAttribute">
    <RunHeader :view="view" :inert="isOverlayOpen" />
    <ProductionChain
      :view="view"
      :inert="isOverlayOpen"
      @step-purchase-amount="stepPurchaseAmount($event)"
      @fill-purchase-amount="fillPurchaseAmount()"
      @buy-coal="buyCoal()"
      @step-setting="stepSetting"
      @purchase-upgrade="purchaseUpgrade($event)"
    />
    <SecondaryDashboard :view="view" :inert="isOverlayOpen" />
    <RunOverlay
      v-if="isOverlayOpen && !isOptionsOpen"
      :view="view"
      @advance="onAdvance"
      @options="isOptionsOpen = true"
    />
    <OptionsPanel
      v-if="isOptionsOpen"
      :options="options"
      @toggle="toggle"
      @close="isOptionsOpen = false"
    />
    <CrtOverlay v-if="options.crt" />
  </main>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import CrtOverlay from '@/components/game/crt_overlay.vue'
import OptionsPanel from '@/components/game/options_panel.vue'
import ProductionChain from '@/components/game/production_chain.vue'
import RunHeader from '@/components/game/run_header.vue'
import RunOverlay from '@/components/game/run_overlay.vue'
import SecondaryDashboard from '@/components/game/secondary_dashboard.vue'
import {useGame} from '@/view/use_game'
import {isGlowVisible, useOptions} from '@/view/use_options'

const {
  view, startRun, newRun, stepSetting, stepPurchaseAmount, fillPurchaseAmount, buyCoal, purchaseUpgrade,
} = useGame()
const {
  options, toggle,
} = useOptions()

const isOptionsOpen = ref(false)

// Every outcome but a run in progress is a run waiting on the player
const isOverlayOpen = computed(() => view.value.outcome !== 'running')

const glowAttribute = computed(() => (isGlowVisible(options.value) ? 'on' : 'off'))
const animationAttribute = computed(() => (options.value.reducedAnimation ? 'reduced' : 'normal'))

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
