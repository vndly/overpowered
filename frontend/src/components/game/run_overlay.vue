<!-- The panel that opens and closes a run: the objective before it starts, and
     what it came to afterwards. Shown for every outcome except a run in
     progress, over a scrim that dims the chain behind it.

     The chain behind it is inert while it is up, so the only things Tab can reach are
     its own button and the header's settings control — which is why it is a dialog
     rather than aria-modal: the settings have to stay reachable before the first run.

     The opening panel is the one that names nothing. A player who has just loaded the
     game is not reading a heading, and the target and the clock they are about to play
     against carry it on their own (ui_ux.md §6). -->
<template>
  <div class="run-overlay" role="dialog" :aria-label="panel.label">
    <TerminalPanel :title="panel.title ?? undefined" :width-cells="PANEL_CELLS" class="run-overlay__panel">
      <p v-if="panel.message !== null" class="run-overlay__message">{{ panel.message }}</p>
      <SectionDivider v-if="panel.title !== null || panel.message !== null" />
      <ValueRow
        v-for="row in panel.rows"
        :key="row.label"
        :label="row.label"
        :value="row.value"
        :large="row.large"
      />
      <SectionDivider dashed />
      <div ref="actions" class="run-overlay__actions">
        <TerminalButton :label="panel.buttonLabel" :width-cells="ADVANCE_CELLS" @press="emit('advance')" />
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

// 27 cells is 234px once the button has its padding and border, against the body's 320:
// wide enough to read as the panel's one action, short of a bar across its whole foot.
const ADVANCE_CELLS = 27

/** One statement of where the run stands, and the one thing the player can do next. */
interface OverlayPanel {
  label: string // Names the dialog, whether or not the panel draws a title
  title: string | null
  message: string | null
  rows: {
    label: string
    value: string
    large?: boolean
  }[]
  buttonLabel: string
}

const props = defineProps<{
  view: GameView
}>()

const emit = defineEmits<{
  advance: []
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
        label: 'TARGET REACHED',
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
        label: 'TIME EXPIRED',
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
        label: 'PLANT STALLED',
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
        label: 'OVERPOWERED',
        title: null,
        message: null,
        rows: [
          {
            label: 'GOAL',
            value: `${props.view.target.targetText} MWh`,
            large: true,
          },
          {
            label: 'TIME',
            value: props.view.timeText,
            large: true,
          },
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
/* A black scrim rather than a dimmed wash of the foreground: the chain stays legible
   underneath without introducing another colour (ui_ux.md §4) */
.run-overlay {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    inset: 0;
    background: rgb(0 0 0 / 80%);
}

/* A full character cell of room around the body rather than the half the cards take.
   This panel is read on its own with the screen dimmed behind it, and it is the one
   place in the interface that is not competing for space. */
.run-overlay__panel {
    --panel-padding: var(--space-4);
}

/* The only wrapped text in the interface, still on the 16px character grid */
.run-overlay__message {
    line-height: var(--cell-height);
}

/* The panel's one soft key, centred along its foot as an operator console has */
.run-overlay__actions {
    display: flex;
    justify-content: center;
}
</style>
