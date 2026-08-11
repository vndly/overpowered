<!-- A rule between the sections of a card (ui_ux.md §8). -->
<template>
  <hr class="section-divider" :class="{'section-divider--dashed': dashed, 'section-divider--spaced': spaced}">
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  dashed?: boolean // Dashed instead of solid
  spaced?: boolean // A blank line beneath, for the rule that closes the head of a card
}>(), {
  dashed: false,
  spaced: false,
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

/* One character cell more beneath, so the drawing at the head of a card is closed off by
   a rule and a blank line rather than by a rule the first reading sits straight under.
   Defined once because the seven cards stand side by side: their heads have to come to
   the same height or their readings stop lining up across the chain (ui_ux.md §25). */
.section-divider--spaced {
    margin-bottom: calc(var(--cell-height) + var(--space-2));
}
</style>
