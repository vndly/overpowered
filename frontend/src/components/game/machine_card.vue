<!-- One machine of the chain (ui_ux.md §12): what it is rated for, what it is set to,
     what that Setting is costing it in stress and wear, and what it is producing. One
     component for all three — the differences are text the view model supplies.

     specs.md levies no output penalty for running above the rating, so there is no
     penalty row: the whole cost of overdriving is the wear bar. -->
<template>
  <TerminalPanel
    :title="view.title"
    :width-cells="CARD_CELLS"
    :class="{'machine-card--tripped': view.repairText !== null}"
  >
    <EquipmentIcon :component="component" />
    <SectionDivider />
    <ValueRow label="CAPACITY" :value="view.capacityText" />
    <ValueRow class="machine-card__reading" label="EFFICIENCY" :value="view.efficiencyText" />
    <div class="machine-card__setting machine-card__reading">
      <span>SETTING</span>
      <NumericStepper
        class="machine-card__stepper"
        :value="view.settingText"
        :label="`${view.title} SETTING`"
        :disabled-down="view.settingSteps <= 0"
        :disabled-up="view.settingSteps >= MAX_SETTING_STEPS"
        @step="emit('step', $event)"
      />
    </div>
    <SectionDivider />
    <StressGauge
      :label="view.stressLabel"
      :value-text="view.stressText"
      :fraction="view.stressFraction"
      :safe-fraction="view.safeFraction"
    />
    <!-- The bar is the whole reading now that no percentage stands beside it, so the
         pair is named as the drawing it is: read aloud, WEAR and a row of blocks say
         nothing, and role="img" puts the figure back (ui_ux.md §28) -->
    <div class="machine-card__wear machine-card__reading" role="img" :aria-label="`WEAR ${view.wearPercentText}%`">
      <p>WEAR</p>
      <FillBar :fraction="view.wearFraction" :cells="WEAR_BAR_CELLS" />
    </div>
    <ValueRow v-if="view.repairText === null" class="machine-card__reading" label="OUTPUT" :value="view.outputText" />
    <p v-else class="machine-card__repair machine-card__reading">{{ view.repairText }}</p>
    <div class="machine-card__upgrades">
      <SectionLabel label="UPGRADES" />
      <ValueRow label="CAPACITY" :value="view.capacityUpgradeGainText" />
      <TerminalButton
        :label="view.capacityUpgradeCostText"
        :aria-label="`UPGRADE CAPACITY: ${view.capacityUpgradeCostText}`"
        :disabled="!view.capacityUpgradeAffordable"
        @press="emit('upgradeCapacity')"
      />
      <ValueRow label="EFFICIENCY" :value="view.efficiencyUpgradeGainText" />
      <TerminalButton
        :label="view.efficiencyUpgradeCostText"
        :aria-label="`UPGRADE EFFICIENCY: ${view.efficiencyUpgradeCostText}`"
        :disabled="!view.efficiencyUpgradeAffordable"
        @press="emit('upgradeEfficiency')"
      />
    </div>
  </TerminalPanel>
</template>

<script setup lang="ts">
import EquipmentIcon from '@/components/game/equipment_icon.vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import NumericStepper from '@/components/terminal/numeric_stepper.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import SectionLabel from '@/components/terminal/section_label.vue'
import StressGauge from '@/components/terminal/stress_gauge.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import {MAX_SETTING_STEPS} from '@/game/constants'
import type {MachineId} from '@/game/types'
import type {MachineView} from '@/view/view_model'

const CARD_CELLS = 28 // Card width, the same for all seven (docs/plan.md)
const WEAR_BAR_CELLS = CARD_CELLS // A line of its own, so the bar takes the whole of it

defineProps<{
  view: MachineView
  component: MachineId // Which drawing heads the card
}>()

const emit = defineEmits<{
  step: [direction: number]
  upgradeCapacity: []
  upgradeEfficiency: []
}>()
</script>

<style scoped>
/* Every reading opens on a blank line, the rule the Stockpile's PRICE row follows
   (ui_ux.md §8): each one answers a question of its own, and run together they read as
   a table of figures rather than as separate answers. A margin rather than padding,
   because the row it sits on is one character cell tall and border-box would eat it. */
.machine-card__reading {
    margin-top: var(--cell-height);
}

.machine-card__setting {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    height: calc(var(--cell-height) * 2);
}

/* Twelve cells holds both buttons, their gaps and the Setting between them */
.machine-card__stepper {
    width: calc(var(--cell-width) * 12);
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

/* The upgrade section sits at the foot of the card, so the buttons line up across
   the chain however tall a card's readings make it (ui_ux.md §25). A blank line
   opens it rather than a rule (ui_ux.md §8) */
.machine-card__upgrades {
    flex: none;
    margin-top: auto;
    padding-top: var(--cell-height);
}
</style>
