<!-- The lower dashboard (ui_ux.md §17): what the plant is doing as a whole, beneath the
     chain that says how each part of it is doing. Three panels, shorter than the cards
     above them and reading only what the chain does not, so the chain stays the primary
     focus. Like the chain, the panels keep their width and the row scrolls (§26). -->
<template>
  <section class="secondary-dashboard" aria-label="PLANT STATUS">
    <PowerSummary :view="view.power" :width-cells="SUMMARY_CELLS" />
    <NetFlowGraph :samples="view.power.netFlowHistory" :width-cells="GRAPH_CELLS" />
    <AlertsPanel :alerts="view.alerts" :width-cells="ALERTS_CELLS" />
  </section>
</template>

<script setup lang="ts">
import AlertsPanel from '@/components/game/alerts_panel.vue'
import NetFlowGraph from '@/components/game/net_flow_graph.vue'
import PowerSummary from '@/components/game/power_summary.vue'
import type {GameView} from '@/view/view_model'

// The row ends where the chain ends, so the two share an edge. A panel is 8px per cell
// plus 18px of padding and border, the two gaps are the chain's arrow column, and the
// chain is 7 x 242 + 6 x 32 = 1886px — which leaves the three panels 223 cells between
// them. The graph takes what the readings do not need: it is the one panel that says
// more the wider it is, so it absorbs any change to the card or arrow width above.
const SUMMARY_CELLS = 26
const GRAPH_CELLS = 171
const ALERTS_CELLS = 26

defineProps<{
  view: GameView
}>()
</script>

<style scoped>
.secondary-dashboard {
    display: flex;
    align-items: stretch;
    gap: var(--space-5);
    margin-top: var(--space-4);
    overflow-x: auto;
}
</style>
