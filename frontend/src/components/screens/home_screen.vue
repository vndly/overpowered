<!-- The application's only screen: the run header, the production chain, the lower
     dashboard, and the overlay that opens and closes a run.

     While a dialog is up, the chain and the dashboard behind it are inert. The scrim
     already takes the pointer, and inert takes the keyboard with it: a Tab that reached
     a card behind the run overlay would let a player buy an upgrade for a run that has
     already ended. The header is the exception, because it carries the way into the
     settings and a player has to be able to reach those before their first run.

     The settings replace the run overlay rather than stack on it, so there is only ever
     one dialog. Closing them hands the focus back: to the run's own button when there is
     a run overlay to take it, and to the header's control when there is not. The two
     attributes on the root switch the parts of the CRT layer that belong to everything
     at once; the scanlines are their own element (assets/styles.css). -->
<template>
  <main class="home-screen" :data-glow="glowAttribute" :data-animation="animationAttribute">
    <RunHeader ref="header" :view="view" :inert="isSettingsOpen" @settings="isSettingsOpen = true" />
    <ProductionChain
      :view="view"
      :inert="isDialogOpen"
      @step-purchase-amount="stepPurchaseAmount($event)"
      @fill-purchase-amount="fillPurchaseAmount()"
      @buy-coal="buyCoal()"
      @purchase-upgrade="purchaseUpgrade($event)"
    />
    <SecondaryDashboard :view="view" :inert="isDialogOpen" />
    <RunOverlay
      v-if="isOverlayOpen && !isSettingsOpen"
      :view="view"
      @advance="onAdvance"
    />
    <SettingsPanel
      v-if="isSettingsOpen"
      :options="options"
      @toggle="toggle"
      @close="closeSettings()"
    />
    <CrtOverlay v-if="options.crt" />
  </main>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, useTemplateRef} from 'vue'
import CrtOverlay from '@/components/game/crt_overlay.vue'
import ProductionChain from '@/components/game/production_chain.vue'
import RunHeader from '@/components/game/run_header.vue'
import RunOverlay from '@/components/game/run_overlay.vue'
import SecondaryDashboard from '@/components/game/secondary_dashboard.vue'
import SettingsPanel from '@/components/game/settings_panel.vue'
import {useGame} from '@/view/use_game'
import {isGlowVisible, useOptions} from '@/view/use_options'

const {
  view, startRun, newRun, stepPurchaseAmount, fillPurchaseAmount, buyCoal, purchaseUpgrade,
} = useGame()
const {
  options, toggle,
} = useOptions()

const isSettingsOpen = ref(false)
const header = useTemplateRef<InstanceType<typeof RunHeader>>('header')

// Every outcome but a run in progress is a run waiting on the player
const isOverlayOpen = computed(() => view.value.outcome !== 'running')

const isDialogOpen = computed(() => isOverlayOpen.value || isSettingsOpen.value)

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

/**
 * Closes the settings, and puts the focus somewhere a keyboard can carry on from.
 * The run overlay claims it back itself when it returns, so only a run in progress —
 * where nothing else is mounted to take it — needs the control that opened the panel.
 * The header is inert until the panel has gone, hence the wait for the next frame.
 */
function closeSettings(): void {
  isSettingsOpen.value = false

  if (!isOverlayOpen.value) {
    void nextTick(() => {
      header.value?.focusSettings()
    })
  }
}
</script>

<style scoped>
.home-screen {
    height: 100%;
    padding: var(--space-4);
}
</style>
