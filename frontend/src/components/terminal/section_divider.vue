<!-- A rule between the sections of a card (ui_ux.md §8). -->
<template>
  <hr class="section-divider" :class="{'section-divider--dashed': dashed}">
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  dashed?: boolean // Dashed instead of solid
}>(), {
  dashed: false,
})
</script>

<style scoped>
/* 7px + 1px rule + 8px occupies exactly one character cell. */
.section-divider {
    flex: none;
    height: 0;
    margin: calc(var(--space-2) - 1px) 0 var(--space-2);
    border: none;
    border-top: 1px solid var(--fg-faint);
}

.section-divider--dashed {
    border-top-style: dashed;
}
</style>
