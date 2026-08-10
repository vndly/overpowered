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
.alert-message {
    flex: none;
    height: var(--cell-height);
    line-height: var(--cell-height);
    white-space: pre;
}

.alert-message--urgent {
    background: var(--fg);
    color: var(--bg);
    animation: alert-blink 1s step-end infinite;
}

/* Hard steps, not a fade: a terminal blinks, it does not animate (ui_ux.md §22) */
@keyframes alert-blink {
    50% {
        background: var(--bg);
        color: var(--fg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .alert-message--urgent {
        animation: none;
    }
}
</style>
