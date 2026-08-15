<!-- One machine of the chain (ui_ux.md §12): what it is rated for, what it is actually
     delivering, and what being out of step with the chain is costing it in stress and
     wear. One component for all three — the differences are text the view model supplies.

     There is no operating control. A machine always runs at its Flow (specs.md
     §Production flow), so the card poses one question and it is a buying question: which
     of the three tracks to spend on, knowing each of them takes something back.

     FLOW is written and drawn as a store's is — what passed against what could pass, and
     a bar of that fraction — because a machine is a rate in the chain exactly as a store
     is. What the machine holds is nothing, which is why it has no Capacity at all. -->
<template>
  <TerminalPanel
    :title="view.title"
    :width-cells="CARD_CELLS"
    :class="{'machine-card--tripped': view.repairText !== null}"
  >
    <EquipmentIcon :component="component" :status="view.status" />
    <SectionDivider spaced />
    <ValueRow label="FLOW" :value="view.flowText" :level="view.flowLevel" />
    <!-- One line, two states. The line was reserved for the trip countdown while the row
         above it printed the rating alone; the bar now holds it, and a tripped machine
         delivers nothing, so REPAIR takes the place of a bar that would be empty anyway.
         Reserving it either way is what keeps a trip from adding a line (ui_ux.md §25) -->
    <p v-if="view.repairText !== null" class="machine-card__repair">{{ view.repairText }}</p>
    <FillBar v-else :fraction="view.flowFraction" :level="view.flowLevel" :cells="BAR_CELLS" />
    <SectionDivider />
    <StressGauge
      :label="view.stressLabel"
      :value-text="view.stressText"
      :fraction="view.stressFraction"
      :level="view.stressLevel"
    />
    <!-- The bar is the whole reading now that no percentage stands beside it, so the
         pair is named as the drawing it is: read aloud, WEAR and a row of blocks say
         nothing, and role="img" puts the figure back (ui_ux.md §28) -->
    <div class="machine-card__wear machine-card__reading" role="img" :aria-label="`WEAR ${view.wearPercentText}%`">
      <p>WEAR</p>
      <FillBar :fraction="view.wearFraction" :level="view.wearLevel" :cells="BAR_CELLS" />
    </div>
    <UpgradeBlock :rows="rows" @press="onPress" />
  </TerminalPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import EquipmentIcon from '@/components/game/equipment_icon.vue'
import UpgradeBlock from '@/components/game/upgrade_block.vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import StressGauge from '@/components/terminal/stress_gauge.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import type {MachineId} from '@/game/types'
import type {MachineView} from '@/view/view_model'

const CARD_CELLS = 28 // Card width, the same for all seven (docs/plan.md)
const BAR_CELLS = CARD_CELLS // Every bar spans the card, as it does on the storage cards

const props = defineProps<{
  view: MachineView
  component: MachineId // Which drawing heads the card
}>()

const emit = defineEmits<{
  upgradeFlow: []
  upgradeEfficiency: []
  upgradeTolerance: []
}>()

// Chain order in the cycle they form: Flow takes from Tolerance, Tolerance from
// Efficiency, Efficiency from Flow (specs.md §Every upgrade has a downside)
const rows = computed(() => [
  props.view.flowUpgrade,
  props.view.efficiencyUpgrade,
  props.view.toleranceUpgrade,
])

/**
 * Reports which track was pressed.
 * @param index - Position in the rows above
 */
function onPress(index: number): void {
  if (index === 0) {
    emit('upgradeFlow')
  } else if (index === 1) {
    emit('upgradeEfficiency')
  } else {
    emit('upgradeTolerance')
  }
}
</script>

<style scoped>
/* Every reading opens on a blank line, the rule the Stockpile's PRICE row follows
   (ui_ux.md §8): each one answers a question of its own, and run together they read as
   a table of figures rather than as separate answers. A margin rather than padding,
   because the row it sits on is one character cell tall and border-box would eat it. */
.machine-card__reading {
    margin-top: var(--cell-height);
}

/* The label on its own line above the bar, so the bar spans the card like the
   Stockpile's does and one cell reads the same fraction of a trip on all three
   machines */
.machine-card__wear {
    flex: none;
    line-height: var(--cell-height);
}

/* A trip is the loudest thing that happens to a machine, so it is the one place a
   card inverts. State never rests on brightness alone (ui_ux.md §28): the frame
   fills in, and the line the flow bar would take names the repair instead. */
.machine-card--tripped {
    box-shadow: inset 0 0 0 var(--space-1) var(--fg);
}

/* One cell, the height of the bar it replaces. The seven cards stretch to the tallest of
   them (production_chain.vue), so a row that existed only during a repair would grow the
   whole chain the moment one machine tripped. */
.machine-card__repair {
    flex: none;
    height: var(--cell-height);
    line-height: var(--cell-height);
    text-align: center;
}

.machine-card--tripped .machine-card__repair {
    background: var(--fg);
    color: var(--bg);
}
</style>
