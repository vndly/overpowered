<!-- What needs attention, in the order the view model ranks it (ui_ux.md §20). The panel
     always says something: a plant with nothing wrong reads NO ALERTS rather than going
     blank, so an empty list can be told from a panel that has stopped updating.

     It is the one live region in the interface: a new alert is read out where it is,
     rather than waiting for a player to go looking for the panel that holds it. -->
<template>
  <TerminalPanel title="ALERTS" :width-cells="widthCells" aria-live="polite">
    <p v-if="alerts.length === 0" class="alerts-panel__clear">NO ALERTS</p>
    <AlertMessage v-for="alert in alerts" :key="alert.text" :text="alert.text" :urgent="alert.urgent" />
  </TerminalPanel>
</template>

<script setup lang="ts">
import AlertMessage from '@/components/terminal/alert_message.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import type {AlertView} from '@/view/view_model'

defineProps<{
  alerts: AlertView[]
  widthCells: number // Set by the dashboard, which owns the row's arithmetic
}>()
</script>

<style scoped>
/* Indented by the gutter an alert's mark takes, so the text column does not shift
   when the first alert arrives */
.alerts-panel__clear {
    flex: none;
    height: var(--cell-height);
    padding-left: calc(var(--cell-width) * 2);
    color: var(--fg-dim);
    line-height: var(--cell-height);
}
</style>
