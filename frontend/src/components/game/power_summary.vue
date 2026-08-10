<!-- What the plant is doing as a whole (ui_ux.md §18): what the Turbine makes, what the
     Pulverizer and Boiler cost to run, and the difference between them — the number the
     run turns on. Every figure is read from the ledger; nothing here is computed. -->
<template>
  <TerminalPanel title="POWER SUMMARY" :width-cells="widthCells">
    <ValueRow label="GENERATION" :value="view.generationText" />
    <ValueRow label="CONSUMPTION" :value="view.consumptionText" />
    <SectionDivider />
    <ValueRow label="NET FLOW" :value="view.netFlowText" />
    <div class="power-summary__rolling">
      <ValueRow label="AVERAGE" :value="view.averageText" />
      <ValueRow label="PEAK" :value="view.peakText" />
    </div>
  </TerminalPanel>
</template>

<script setup lang="ts">
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import type {PowerView} from '@/view/view_model'

defineProps<{
  view: PowerView
  widthCells: number // Set by the dashboard, which owns the row's arithmetic
}>()
</script>

<style scoped>
/* The run's history sits under its present, opened by a blank line rather than a
   second rule — the one rule in the panel is the one that makes NET FLOW a total
   (ui_ux.md §8) */
.power-summary__rolling {
    flex: none;
    padding-top: var(--cell-height);
}
</style>
