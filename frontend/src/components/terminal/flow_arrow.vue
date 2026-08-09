<!-- The arrow between two cards of the production chain. It is also the gap:
     the chain has no other spacing between cards. -->
<template>
  <div class="flow-arrow" aria-hidden="true">→</div>
</template>

<style scoped>
.flow-arrow {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: calc(var(--cell-width) * 3);
    color: var(--fg-dim);
    line-height: var(--cell-height);
}
</style>
