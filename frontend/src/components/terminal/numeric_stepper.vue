<!-- The [-] value [+] control used for Settings and coal purchases
     (ui_ux.md §13). -->
<template>
  <div class="numeric-stepper">
    <TerminalButton
      label="-"
      :width-cells="1"
      :disabled="disabledDown"
      @press="onPress(-1, $event)"
      @pointerdown="onPointerDown(-1, $event)"
      @pointerup="stopRepeat"
      @pointercancel="stopRepeat"
      @pointerleave="stopRepeat"
      @blur="stopRepeat"
    />
    <span class="numeric-stepper__value">{{ value }}</span>
    <TerminalButton
      label="+"
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

const props = withDefaults(defineProps<{
  value: string // Already formatted; the stepper only reports intent
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

.numeric-stepper__value {
    flex: 1;
    line-height: var(--cell-height);
    text-align: center;
    white-space: pre;
}
</style>
