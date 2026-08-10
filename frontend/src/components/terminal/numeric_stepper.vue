<!-- The [-] value [+] control used for Settings and coal purchases
     (ui_ux.md §13). Either button carries the whole control from the keyboard: the
     arrow and sign keys step it without the player having to Tab across the value
     to change direction (ui_ux.md §27). -->
<template>
  <div class="numeric-stepper" @keydown="onKeyDown">
    <TerminalButton
      label="-"
      :aria-label="`DECREASE ${label}`"
      :width-cells="1"
      :disabled="disabledDown"
      @press="onPress(-1, $event)"
      @pointerdown="onPointerDown(-1, $event)"
      @pointerup="stopRepeat"
      @pointercancel="stopRepeat"
      @pointerleave="stopRepeat"
      @blur="stopRepeat"
    />
    <span class="numeric-stepper__value" aria-live="polite">{{ value }}</span>
    <TerminalButton
      label="+"
      :aria-label="`INCREASE ${label}`"
      :width-cells="1"
      :disabled="disabledUp"
      @press="onPress(1, $event)"
      @pointerdown="onPointerDown(1, $event)"
      @pointerup="stopRepeat"
      @pointercancel="stopRepeat"
      @pointerleave="stopRepeat"
      @blur="stopRepeat"
    />
  </div>
</template>

<script setup lang="ts">
import {onUnmounted} from 'vue'
import TerminalButton from '@/components/terminal/terminal_button.vue'

const REPEAT_DELAY_MILLISECONDS = 400
const REPEAT_INTERVAL_MILLISECONDS = 80

type StepDirection = -1 | 1

// Both axes, and both signs, so the control answers whichever key the player reaches
// for. Holding one repeats at the operating system's rate, which is what a held key
// does everywhere else.
const STEP_KEYS: Record<string, StepDirection> = {
  ArrowUp: 1,
  ArrowRight: 1,
  '+': 1,
  ArrowDown: -1,
  ArrowLeft: -1,
  '-': -1,
}

const props = withDefaults(defineProps<{
  value: string // Already formatted; the stepper only reports intent
  label: string // What is being stepped, for the buttons that would otherwise read - and +
  disabledDown?: boolean
  disabledUp?: boolean
}>(), {
  disabledDown: false,
  disabledUp: false,
})

const emit = defineEmits<{
  step: [direction: StepDirection]
}>()

let repeatDelayTimer = 0 // Waits out the hold before repeating starts
let repeatTimer = 0 // Repeats for as long as the button stays held

function isDisabled(direction: StepDirection): boolean {
  return direction < 0 ? props.disabledDown : props.disabledUp
}

/**
 * Ends any hold-to-repeat in progress.
 */
function stopRepeat(): void {
  window.clearTimeout(repeatDelayTimer)
  window.clearInterval(repeatTimer)
  repeatDelayTimer = 0
  repeatTimer = 0
}

/**
 * Steps once immediately, then repeats while the button stays held.
 * A secondary button is ignored: its context menu can swallow the pointerup
 * that would otherwise end the repeat.
 * @param direction - -1 for the minus button, 1 for the plus button
 * @param event - The press that started the hold
 */
function onPointerDown(direction: StepDirection, event: PointerEvent): void {
  stopRepeat()

  if (event.button !== 0 || isDisabled(direction)) {
    return
  }

  emit('step', direction)
  repeatDelayTimer = window.setTimeout(() => {
    repeatTimer = window.setInterval(() => {
      if (isDisabled(direction)) {
        stopRepeat()
        return
      }

      emit('step', direction)
    }, REPEAT_INTERVAL_MILLISECONDS)
  }, REPEAT_DELAY_MILLISECONDS)
}

/**
 * Steps for a keyboard activation only. A pointer press has already stepped
 * on pointerdown, and the click it produces reports a non-zero detail.
 * @param direction - -1 for the minus button, 1 for the plus button
 * @param event - The click behind the press
 */
function onPress(direction: StepDirection, event: MouseEvent): void {
  if (event.detail === 0) {
    emit('step', direction)
  }
}

/**
 * Steps from the keyboard while either button holds the focus.
 * A modified press is left alone: Ctrl and Meta with a sign key are the browser's
 * zoom, and the game has no business taking those.
 * @param event - The key press
 */
function onKeyDown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return
  }

  const direction = STEP_KEYS[event.key]

  if (direction === undefined) {
    return
  }

  // Claimed whether or not it steps, so an arrow at the end of the range never
  // scrolls the chain out from under the control the player is holding
  event.preventDefault()

  if (!isDisabled(direction)) {
    emit('step', direction)
  }
}

onUnmounted(stopRepeat)
</script>

<style scoped>
.numeric-stepper {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-1);
    height: calc(var(--cell-height) * 2);
}

/* A reading like any other, even though the player is the one moving it */
.numeric-stepper__value {
    flex: 1;
    color: var(--data);
    line-height: var(--cell-height);
    text-align: center;
    white-space: pre;
}
</style>
