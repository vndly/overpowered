<!-- How the interface is drawn, and nothing else (ui_ux.md §28). Opened from the run
     overlay, so it is only reachable between runs: the display never changes under a
     run in progress.

     Each row says its value in words and inverts when it is on. A setting a player could
     only tell by how bright the screen looks is the state §28 rules out, and this panel
     is the one place in the game where that mistake would be invisible. -->
<template>
  <!-- tabindex holds the focus inside the dialog when the scrim is clicked. Without it
       that click drops the focus on the body, the key press stops reaching this element,
       and Escape quietly stops closing the panel. -->
  <div
    class="options-panel"
    role="dialog"
    aria-modal="true"
    aria-label="OPTIONS"
    tabindex="-1"
    @keydown.escape="emit('close')"
  >
    <TerminalPanel title="OPTIONS" :width-cells="PANEL_CELLS">
      <SectionDivider />
      <div class="options-panel__rows">
        <div v-for="row in rows" :key="row.id" class="options-panel__row">
          <span :class="{'options-panel__label--nested': row.nested}">{{ row.label }}</span>
          <TerminalButton
            :label="row.enabled ? ON_LABEL : OFF_LABEL"
            :aria-label="row.label"
            :aria-pressed="row.enabled"
            :width-cells="TOGGLE_CELLS"
            :disabled="row.disabled"
            @press="emit('toggle', row.id)"
          />
        </div>
      </div>
      <SectionDivider dashed />
      <div ref="actions">
        <TerminalButton label="CLOSE" @press="emit('close')" />
      </div>
    </TerminalPanel>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, useTemplateRef} from 'vue'
import SectionDivider from '@/components/terminal/section_divider.vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import type {DisplayOptionId, DisplayOptions} from '@/view/use_options'
import {isGlowVisible} from '@/view/use_options'

const PANEL_CELLS = 32 // Narrower than the run overlay it opens from, and wide enough for the longest row
const TOGGLE_CELLS = 3 // The width of OFF, so ON and OFF are the same button
const ON_LABEL = 'ON'
const OFF_LABEL = 'OFF'

/** One setting as the panel draws it: what it is called, where it stands, and whether it can be reached. */
interface OptionRow {
  id: DisplayOptionId
  label: string
  enabled: boolean
  disabled: boolean
  nested: boolean // Indented, because it is part of the row above rather than a peer of it
}

const props = defineProps<{
  options: DisplayOptions
}>()

const emit = defineEmits<{
  toggle: [option: DisplayOptionId]
  close: []
}>()

const actions = useTemplateRef<HTMLElement>('actions')

// GLOW reports what the screen is actually doing rather than what is stored: with the
// CRT layer off it reads OFF and goes unreachable, and the player's own preference comes
// back the moment that layer returns.
const rows = computed<OptionRow[]>(() => [
  {
    id: 'crt',
    label: 'CRT EFFECTS',
    enabled: props.options.crt,
    disabled: false,
    nested: false,
  },
  {
    id: 'glow',
    label: 'GLOW',
    enabled: isGlowVisible(props.options),
    disabled: !props.options.crt,
    nested: true,
  },
  {
    id: 'reducedAnimation',
    label: 'REDUCED ANIMATION',
    enabled: props.options.reducedAnimation,
    disabled: false,
    nested: false,
  },
])

// The way out takes the focus, so Enter closes the panel and Tab starts from a known place
onMounted(() => {
  actions.value?.querySelector('button')?.focus()
})
</script>

<style scoped>
/* The same black scrim the run overlay uses, over the run overlay's own place: only one
   of the two is ever mounted, so the screen never carries two dialogs. */
.options-panel {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    inset: 0;
    background: rgb(0 0 0 / 80%);
}

/* Two cells of row and one of gap: a 48px pitch that stays on the character grid */
.options-panel__rows {
    display: flex;
    flex-direction: column;
    gap: var(--cell-height);
}

.options-panel__row {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: var(--cell-width);
    height: calc(var(--cell-height) * 2);
}

.options-panel__label--nested {
    padding-left: calc(var(--cell-width) * 2);
}
</style>
