<!-- The arrow between two cards of the production chain. It is also the gap: the chain
     has no other spacing between cards, so this column is what sets the row's width
     against the screen. Four cells is the widest that keeps the chain inside the
     1920px reference (ui_ux.md §5), which is why the arrows carry the slack rather
     than the cards — a card can only grow in whole cells, and 28 is already its
     maximum there. -->
<template>
  <div class="flow-arrow" aria-hidden="true">→</div>
</template>

<style scoped>
.flow-arrow {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: calc(var(--cell-width) * 4);
    color: var(--fg-dim);
    line-height: var(--cell-height);
}
</style>
