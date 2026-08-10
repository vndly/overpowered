<!-- The application's only screen. The seven cards of the production chain are
     still a shell: they read the real view model and report real intent, but
     they are laid out generically, with no icons and no stress gauge. Stages 5
     to 7 replace this shell with the cards docs/ui_ux.md specifies, and take
     the run header out of the status line at the top. -->
<template>
  <main class="home-screen">
    <p class="home-screen__status">
      <span>TIME {{ view.timeText }}</span>
      <span>STORED {{ view.target.storedText }} / {{ view.target.targetText }} MWh</span>
    </p>
    <section class="home-screen__chain" aria-label="PRODUCTION CHAIN">
      <template v-for="(card, index) in cards" :key="card.title">
        <FlowArrow v-if="index > 0" />
        <TerminalPanel :title="card.title" :width-cells="card.widthCells">
          <ValueRow v-for="row in card.rows" :key="row.label" :label="row.label" :value="row.value" />
          <FillBar :fraction="card.bar.fraction" :cells="card.bar.cells" :marks="card.bar.marks" />
          <p v-if="card.note !== null" class="home-screen__note">{{ card.note }}</p>
          <div v-if="card.stepper !== null" class="home-screen__control-row">
            <span>{{ card.stepper.label }}</span>
            <NumericStepper :value="card.stepper.value" @step="card.stepper.step($event)" />
          </div>
          <div class="home-screen__buttons">
            <TerminalButton
              v-for="button in card.controls"
              :key="button.label"
              :label="button.label"
              :disabled="button.disabled"
              @press="button.press()"
            />
          </div>
          <SectionDivider dashed />
          <p class="home-screen__section-title">UPGRADES</p>
          <div class="home-screen__buttons">
            <TerminalButton
              v-for="button in card.upgrades"
              :key="button.label"
              :label="button.label"
              :disabled="button.disabled"
              @press="button.press()"
            />
          </div>
        </TerminalPanel>
      </template>
    </section>
    <RunOverlay v-if="view.outcome !== 'running'" :view="view" @advance="onAdvance" />
  </main>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import RunOverlay from '@/components/game/run_overlay.vue'
import FillBar from '@/components/terminal/fill_bar.vue'
import FlowArrow from '@/components/terminal/flow_arrow.vue'
import NumericStepper from '@/components/terminal/numeric_stepper.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import type {MachineId, UpgradeTrackId} from '@/game/types'
import {useGame} from '@/view/use_game'
import type {BatteryView, BufferView, MachineView, StockpileView, StorageViewBase, StrainMark} from '@/view/view_model'

const STORAGE_CELLS = 24
const MACHINE_CELLS = 30
const WEAR_CELLS = 10

/** A control on a card, and the intent pressing it reports. */
interface CardButton {
  label: string
  disabled: boolean
  press: () => void
}

/** The stepper a card carries, if it has one. */
interface CardStepper {
  label: string
  value: string
  step: (direction: number) => void
}

/** One card of the chain, in the fixed order this shell renders. */
interface ChainCard {
  title: string
  widthCells: number
  rows: {
    label: string
    value: string
  }[]
  bar: {
    fraction: number
    cells: number
    marks: StrainMark[]
  }
  note: string | null
  stepper: CardStepper | null
  controls: CardButton[] // Above the divider, with the card's readings
  upgrades: CardButton[] // Below it, in the card's own upgrade section
}

const {
  view, startRun, newRun, stepSetting, stepPurchaseAmount, fillPurchaseAmount, buyCoal, purchaseUpgrade,
} = useGame()

/**
 * @param storage - The store to describe
 * @param track - The upgrade its capacity is bought on
 * @param marks - Its strain thresholds, if it has any
 * @returns The rows, bar and upgrade button every storage card shares
 */
function storageCard(storage: StorageViewBase, track: UpgradeTrackId, marks: StrainMark[]): ChainCard {
  return {
    title: storage.title,
    widthCells: STORAGE_CELLS,
    rows: [
      {
        label: 'STORED',
        value: storage.storedText,
      },
      {
        label: 'FILL',
        value: `${storage.fillPercentText}%`,
      },
    ],
    bar: {
      fraction: storage.fraction,
      cells: STORAGE_CELLS,
      marks: marks,
    },
    note: null,
    stepper: null,
    controls: [],
    upgrades: [
      {
        label: `CAPACITY: ${storage.upgradeCostText}`,
        disabled: !storage.upgradeAffordable,
        press: (): void => {
          purchaseUpgrade(track)
        },
      },
    ],
  }
}

/**
 * @param stockpile - The Stockpile to describe
 * @returns The Stockpile card, with the coal price and the purchase controls
 */
function stockpileCard(stockpile: StockpileView): ChainCard {
  const card = storageCard(stockpile, 'stockpile_capacity', [])

  card.rows.push({
    label: 'COAL PRICE',
    value: stockpile.priceText,
  })
  card.stepper = {
    label: 'AMOUNT',
    value: stockpile.purchaseAmountText,
    step: stepPurchaseAmount,
  }
  card.controls.push(
    {
      label: 'FILL',
      disabled: false,
      press: fillPurchaseAmount,
    },
    {
      label: `BUY: ${stockpile.purchaseCostText} MWh`,
      disabled: !stockpile.purchaseAffordable,
      press: buyCoal,
    },
  )
  return card
}

/**
 * @param battery - The Battery to describe
 * @returns The Battery card, with what of its contents can be spent
 */
function batteryCard(battery: BatteryView): ChainCard {
  const card = storageCard(battery, 'battery_capacity', [])

  card.rows.push(
    {
      label: 'SPENDABLE',
      value: battery.spendableText,
    },
    {
      label: 'RESERVED',
      value: battery.reservedText,
    },
    {
      label: 'NET FLOW',
      value: battery.netFlowText,
    },
  )
  return card
}

/**
 * @param machine - The machine to describe
 * @param machineView - Its readings
 * @returns The machine card, with its Setting control and wear readout
 */
function machineCard(machine: MachineId, machineView: MachineView): ChainCard {
  const capacityTrack: UpgradeTrackId = `${machine}_capacity`
  const efficiencyTrack: UpgradeTrackId = `${machine}_efficiency`
  const rows = [
    {
      label: 'CAPACITY',
      value: machineView.capacityText,
    },
    {
      label: 'EFFICIENCY',
      value: machineView.efficiencyText,
    },
    {
      label: machineView.stressLabel,
      value: machineView.stressText,
    },
    {
      label: 'CLEAN TO',
      value: machineView.cleanToText,
    },
    {
      label: 'WEAR',
      value: `${machineView.wearPercentText}%`,
    },
  ]

  // A tripped machine produces nothing, so its output row gives way to the countdown
  if (machineView.repairText === null) {
    rows.push({
      label: 'OUTPUT',
      value: machineView.outputText,
    })
  }

  return {
    title: machineView.title,
    widthCells: MACHINE_CELLS,
    rows: rows,
    bar: {
      fraction: machineView.wearFraction,
      cells: WEAR_CELLS,
      marks: [],
    },
    note: machineView.repairText ?? machineView.wearNoteText,
    stepper: {
      label: 'SETTING',
      value: machineView.settingText,
      step: (direction: number): void => {
        stepSetting(machine, direction)
      },
    },
    controls: [],
    upgrades: [
      {
        label: `CAPACITY: ${machineView.capacityUpgradeCostText}`,
        disabled: !machineView.capacityUpgradeAffordable,
        press: (): void => {
          purchaseUpgrade(capacityTrack)
        },
      },
      {
        label: `EFFICIENCY: ${machineView.efficiencyUpgradeCostText}`,
        disabled: !machineView.efficiencyUpgradeAffordable,
        press: (): void => {
          purchaseUpgrade(efficiencyTrack)
        },
      },
    ],
  }
}

/**
 * @param buffer - The Silo or Tank to describe
 * @param track - The upgrade its capacity is bought on
 * @returns Its card, with the strain thresholds marked on the bar
 */
function bufferCard(buffer: BufferView, track: UpgradeTrackId): ChainCard {
  return storageCard(buffer, track, buffer.marks)
}

const cards = computed<ChainCard[]>(() => [
  stockpileCard(view.value.stockpile),
  machineCard('pulverizer', view.value.pulverizer),
  bufferCard(view.value.silo, 'silo_capacity'),
  machineCard('boiler', view.value.boiler),
  bufferCard(view.value.tank, 'tank_capacity'),
  machineCard('turbine', view.value.turbine),
  batteryCard(view.value.battery),
])

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

/* Cards never shrink; a narrow window scrolls instead (ui_ux.md §26) */
.home-screen__chain {
    display: flex;
    align-items: stretch;
    overflow-x: auto;
}

.home-screen__note {
    height: var(--cell-height);
    color: var(--fg-dim);
    line-height: var(--cell-height);
}

.home-screen__section-title {
    height: var(--cell-height);
    line-height: var(--cell-height);
}

.home-screen__control-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: calc(var(--cell-height) * 2);
    line-height: var(--cell-height);
}

.home-screen__buttons {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}
</style>
