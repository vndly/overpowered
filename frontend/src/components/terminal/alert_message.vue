<!-- One line of the alerts panel (ui_ux.md §20). An urgent alert is marked with a bang
     and inverted, and blinks between inverted and normal rather than on and off, so it
     is legible at every point in the cycle. Rank is never carried by a second colour,
     and never by brightness alone (§28). -->
<template>
  <p class="alert-message" :class="{'alert-message--urgent': urgent}">{{ line }}</p>
</template>

<script setup lang="ts">
import {computed} from 'vue'

const URGENT_GUTTER = '! '
const CALM_GUTTER = '  ' // The same two cells unmarked, so every alert starts in one column

const props = withDefaults(defineProps<{
  text: string
  urgent?: boolean // Needs attention now rather than soon
}>(), {
  urgent: false,
})

const line = computed(() => (props.urgent ? URGENT_GUTTER : CALM_GUTTER) + props.text)
</script>

<style scoped>
/* The one colour on the screen that is neither the console nor a reading: an alert is
   the plant interrupting, and red is what an operator's panel interrupts in
   (assets/styles.css) */
.alert-message {
    flex: none;
    height: var(--cell-height);
    color: var(--alert);
    line-height: var(--cell-height);
    white-space: pre;
}

/* The inverted line keeps the console's white behind it — the rank is the inversion,
   not a second colour — so the wording drops to the dark red to stay readable on it */
.alert-message--urgent {
    background: var(--fg);
    color: var(--alert-inverted);
    animation: alert-blink 1s step-end infinite;
}

/* Hard steps, not a fade: a terminal blinks, it does not animate (ui_ux.md §22) */
@keyframes alert-blink {
    50% {
        background: var(--bg);
        color: var(--alert);
    }
}

@media (prefers-reduced-motion: reduce) {
    .alert-message--urgent {
        animation: none;
    }
}
</style>
