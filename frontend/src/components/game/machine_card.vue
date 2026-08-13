<!-- One machine of the chain (ui_ux.md §12): what it is rated for, what it is producing,
     and what being out of step with the chain is costing it in stress and wear. One
     component for all three — the differences are text the view model supplies.

     There is no operating control. A machine always runs at its Capacity (specs.md
     §Production flow), so the card poses one question and it is a buying question: which
     of the three tracks to spend on, knowing each of them takes something back. -->
<template>
  <TerminalPanel
    :title="view.title"
    :width-cells="CARD_CELLS"
    :class="{'machine-card--tripped': view.repairText !== null}"
  >
    <EquipmentIcon :component="component" :status="view.status" />
    <SectionDivider spaced />
    <ValueRow label="CAPACITY" :value="view.capacityText" />
    <!-- What the machine is doing right now sits under what it is rated for, so the two
         are read as a pair; a tripped machine puts its repair in the same place -->
    <ValueRow v-if="view.repairText === null" class="machine-card__reading" label="OUTPUT" :value="view.outputText" />
    <p v-else class="machine-card__repair machine-card__reading">{{ view.repairText }}</p>
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
      <FillBar :fraction="view.wearFraction" :level="view.wearLevel" :cells="WEAR_BAR_CELLS" />
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
const WEAR_BAR_CELLS = CARD_CELLS // A line of its own, so the bar takes the whole of it

const props = defineProps<{
  view: MachineView
  component: MachineId // Which drawing heads the card
}>()

const emit = defineEmits<{
  upgradeCapacity: []
  upgradeEfficiency: []
  upgradeTolerance: []
}>()

// Chain order in the cycle they form: Capacity takes from Tolerance, Tolerance from
// Efficiency, Efficiency from Capacity (specs.md §Every upgrade has a downside)
const rows = computed(() => [
  props.view.capacityUpgrade,
  props.view.efficiencyUpgrade,
  props.view.toleranceUpgrade,
])

/**
 * Reports which track was pressed.
 * @param index - Position in the rows above
 */
function onPress(index: number): void {
  if (index === 0) {
    emit('upgradeCapacity')
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
   fills in, and the row that named the output names the repair instead. */
.machine-card--tripped {
    box-shadow: inset 0 0 0 var(--space-1) var(--fg);
}

.machine-card__repair {
    flex: none;
    height: var(--cell-height);
    background: var(--fg);
    color: var(--bg);
    line-height: var(--cell-height);
    text-align: center;
}
</style>
