<!-- The application's only screen. A static shell of the seven-card production
     chain, filled with placeholder readings so the character grid and the
     terminal primitives can be judged. Stages 5 to 7 replace the placeholders
     with real cards. -->
<template>
  <main class="home-screen">
    <section class="home-screen__chain" aria-label="PRODUCTION CHAIN">
      <template v-for="(card, index) in CHAIN" :key="card.title">
        <FlowArrow v-if="index > 0" />
        <TerminalPanel :title="card.title" :width-cells="card.isMachine ? MACHINE_CELLS : STORAGE_CELLS">
          <template v-if="card.isMachine">
            <ValueRow label="CAPACITY" value="8.0 kg/s" />
            <ValueRow label="EFFICIENCY" value="0.70" />
            <div class="home-screen__control-row">
              <span>SETTING</span>
              <NumericStepper value="0.6" />
            </div>
            <SectionDivider />
            <ValueRow label="STRESS" value="66.0" />
            <ValueRow label="WEAR" value="31%" />
            <FillBar :fraction="0.31" />
          </template>
          <template v-else>
            <ValueRow label="STORED" value="0.70 / 1.00 t" />
            <FillBar :fraction="0.7" :cells="STORAGE_CELLS" :marks="card.marks" />
            <ValueRow label="FILL" value="70%" dim />
          </template>
          <SectionDivider dashed />
          <p class="home-screen__section-title">UPGRADES</p>
          <div class="home-screen__buttons">
            <TerminalButton label="CAPACITY: 0.02" />
            <TerminalButton v-if="card.isMachine" label="EFFICIENCY: 0.05" disabled />
          </div>
        </TerminalPanel>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import FillBar from '@/components/terminal/fill_bar.vue'
import FlowArrow from '@/components/terminal/flow_arrow.vue'
import NumericStepper from '@/components/terminal/numeric_stepper.vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'

interface ChainCard {
  title: string
  isMachine: boolean
  // Strain thresholds on the fill bar
  marks: {
    fraction: number
    glyph: string
  }[]
}

const STORAGE_CELLS = 24
const MACHINE_CELLS = 30

const CHAIN: ChainCard[] = [
  {
    title: 'Stockpile',
    isMachine: false,
    marks: [],
  },
  {
    title: 'Pulverizer',
    isMachine: true,
    marks: [],
  },
  {
    title: 'Silo',
    isMachine: false,
    marks: [
      {
        fraction: 0.7,
        glyph: '┬',
      },
    ],
  },
  {
    title: 'Boiler',
    isMachine: true,
    marks: [],
  },
  {
    title: 'Tank',
    isMachine: false,
    marks: [
      {
        fraction: 0.3,
        glyph: '┴',
      },
      {
        fraction: 0.7,
        glyph: '┬',
      },
    ],
  },
  {
    title: 'Turbine',
    isMachine: true,
    marks: [],
  },
  {
    title: 'Battery',
    isMachine: false,
    marks: [],
  },
]
</script>

<style scoped>
.home-screen {
    height: 100%;
    padding: var(--space-4);
}

/* Cards never shrink; a narrow window scrolls instead (ui_ux.md §26) */
.home-screen__chain {
    display: flex;
    align-items: stretch;
    overflow-x: auto;
}

.home-screen__control-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: calc(var(--cell-height) * 2);
    line-height: var(--cell-height);
}

.home-screen__section-title {
    height: var(--cell-height);
    line-height: var(--cell-height);
}

.home-screen__buttons {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
}
</style>
