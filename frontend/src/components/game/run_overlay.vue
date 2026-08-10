<!-- The panel that opens and closes a run: the objective before it starts, and
     what it came to afterwards. Shown for every outcome except a run in
     progress, over a scrim that dims the chain behind it.

     It claims to be modal and it is: home_screen makes the chain behind it inert
     while it is up, so its two buttons are the only things Tab can reach.

     The display options hang off this panel rather than off the chain, because
     between runs is the only time changing them costs a player nothing. -->
<template>
  <div class="run-overlay" role="dialog" aria-modal="true" :aria-label="panel.title">
    <TerminalPanel :title="panel.title" :width-cells="PANEL_CELLS">
      <p v-if="panel.message !== null" class="run-overlay__message">{{ panel.message }}</p>
      <SectionDivider />
      <ValueRow v-for="row in panel.rows" :key="row.label" :label="row.label" :value="row.value" />
      <SectionDivider dashed />
      <div ref="actions" class="run-overlay__actions">
        <TerminalButton :label="panel.buttonLabel" :width-cells="ADVANCE_CELLS" @press="emit('advance')" />
        <TerminalButton label="OPTIONS" :width-cells="OPTIONS_CELLS" @press="emit('options')" />
      </div>
    </TerminalPanel>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, useTemplateRef} from 'vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import ValueRow from '@/components/terminal/value_row.vue'
import {formatTime} from '@/view/formatting'
import type {GameView} from '@/view/view_model'

const PANEL_CELLS = 40
const NO_BEST_RESULT = 'NONE'

// The two buttons fill the panel body exactly: 27 and 8 cells are 234px and 82px once
// each has its padding and border, and the 4px between them makes the body's 320. The
// difference in width is what says which of the two the panel is for.
const ADVANCE_CELLS = 27
const OPTIONS_CELLS = 8

/** One statement of where the run stands, and the one thing the player can do next. */
interface OverlayPanel {
  title: string
  message: string | null
  rows: {
    label: string
    value: string
  }[]
  buttonLabel: string
}

const props = defineProps<{
  view: GameView
}>()

const emit = defineEmits<{
  advance: []
  options: []
}>()

const actions = useTemplateRef<HTMLElement>('actions')

const bestResultRow = computed(() => ({
  label: 'BEST RESULT',
  value: props.view.bestResultText ?? NO_BEST_RESULT,
}))

const peakStoredRow = computed(() => ({
  label: 'PEAK STORED',
  value: props.view.peakStoredText,
}))

// A run in progress never renders this component; it shares the opening panel so the
// switch stays exhaustive over RunOutcome.
const panel = computed<OverlayPanel>(() => {
  switch (props.view.outcome) {
    case 'won':
      return {
        title: 'TARGET REACHED',
        message: null,
        rows: [
          {
            label: 'TIME TAKEN',
            value: formatTime(props.view.elapsedSeconds),
          },
          peakStoredRow.value,
          bestResultRow.value,
        ],
        buttonLabel: 'NEW RUN',
      }
    case 'timeout':
      return {
        title: 'TIME EXPIRED',
        message: null,
        rows: [
          peakStoredRow.value,
          bestResultRow.value,
        ],
        buttonLabel: 'NEW RUN',
      }
    case 'stalled':
      return {
        title: 'PLANT STALLED',
        message: 'EVERY STORE IS EMPTY. THERE IS NOTHING LEFT TO RUN ON AND NOTHING LEFT TO BUY WITH.',
        rows: [
          peakStoredRow.value,
          bestResultRow.value,
        ],
        buttonLabel: 'NEW RUN',
      }
    case 'idle':
    case 'running':
      return {
        title: 'OVERPOWERED',
        message: 'RAISE THE BATTERY TO THE TARGET BEFORE THE CLOCK RUNS OUT.',
        rows: [
          {
            label: 'TARGET',
            value: `${props.view.target.targetText} MWh`,
          },
          {
            label: 'TIME LIMIT',
            value: props.view.timeText,
          },
          bestResultRow.value,
        ],
        buttonLabel: 'START RUN',
      }
  }
})

// The one action the panel offers takes the focus, so Enter carries the run forward
onMounted(() => {
  actions.value?.querySelector('button')?.focus()
})
</script>

<style scoped>
/* A black scrim rather than a dimmer green: the chain stays legible underneath
   without introducing a second colour (ui_ux.md §4) */
.run-overlay {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    inset: 0;
    background: rgb(0 0 0 / 80%);
}

/* The only wrapped text in the interface, still on the 16px character grid */
.run-overlay__message {
    line-height: var(--cell-height);
}

/* One row of soft keys along the foot of the panel, as an operator console has */
.run-overlay__actions {
    display: flex;
    gap: var(--space-1);
}
</style>
