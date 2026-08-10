<!-- A named break inside a card: the title centred on its line with a rule running out
     to either edge (ui_ux.md §8).

     Two character cells: the title on one line, with half a cell of air above and below
     it so the break is read as a break rather than as one more row of the card. The
     title is turned down and its rules turned down further, so it reads as quieter than
     the readings it separates rather than as another label competing with them. -->
<template>
  <p class="section-label">
    <span class="section-label__text">{{ label }}</span>
  </p>
</template>

<script setup lang="ts">
defineProps<{
  label: string // What the section below is
}>()
</script>

<style scoped>
.section-label {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--cell-width);
    /* Half a cell of air each side of a one-cell line, so the whole label comes to two
       cells and the rows beneath it stay on the character grid (ui_ux.md §25). The
       height is the border box, so the padding is inside it rather than added to it. */
    height: calc(var(--cell-height) * 2);
    padding: var(--space-2) 0;
    color: var(--fg-dim);
    line-height: var(--cell-height);
}

/* The same hairline the section_divider draws, so every rule in the interface is one
   stroke. They take whatever the title leaves, which centres it without either side
   having to know how long it is. */
.section-label::before,
.section-label::after {
    flex: 1;
    border-top: 1px solid var(--fg-faint);
    content: '';
}

.section-label__text {
    flex: none;
}
</style>
