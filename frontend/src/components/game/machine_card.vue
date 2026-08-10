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
    <ValueRow label="EFFICIENCY" :value="view.efficiencyText" />
    <div class="machine-card__setting">
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
    <ValueRow label="CLEAN TO" :value="view.cleanToText" />
    <div class="machine-card__wear">
      <span class="machine-card__wear-label">WEAR</span>
      <FillBar :fraction="view.wearFraction" :cells="WEAR_BAR_CELLS" />
      <span class="machine-card__wear-percent">{{ view.wearPercentText }}%</span>
    </div>
    <p class="machine-card__wear-note">{{ view.wearNoteText }}</p>
    <ValueRow v-if="view.repairText === null" label="OUTPUT" :value="view.outputText" />
    <p v-else class="machine-card__repair">{{ view.repairText }}</p>
    <div class="machine-card__upgrades">
      <p class="machine-card__section">UPGRADES</p>
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
import StressGauge from '@/components/terminal/stress_gauge.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import {MAX_SETTING_STEPS} from '@/game/constants'
import type {MachineId} from '@/game/types'
import type {MachineView} from '@/view/view_model'

const CARD_CELLS = 30 // Machine card width (docs/plan.md)
const WEAR_BAR_CELLS = 10 // One cell per 10% of a trip

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

.machine-card__wear {
    display: flex;
    flex: none;
    height: var(--cell-height);
    line-height: var(--cell-height);
}

/* The label reserves the seven cells its own text and the gap take, and the note
   beneath is indented by the same, so both start where the bar does */
.machine-card__wear-label {
    flex: none;
    width: calc(var(--cell-width) * 7);
}

/* The countdown to a trip or to a clean machine — a clock, so it reads as one
   (assets/styles.css). CLEAN and HOLDING take the same colour: the note is one row
   answering one question, and a line that changed colour with its own wording would
   read as a state change rather than as an answer. */
.machine-card__wear-note {
    flex: none;
    height: var(--cell-height);
    padding-left: calc(var(--cell-width) * 7);
    color: var(--data-dim);
    line-height: var(--cell-height);
}

.machine-card__wear-percent {
    flex: 1;
    color: var(--data);
    text-align: right;
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

.machine-card__section {
    height: var(--cell-height);
    line-height: var(--cell-height);
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
