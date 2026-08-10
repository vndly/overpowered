<!-- The scanline layer (ui_ux.md §24): one fixed sheet of hairline shadows over the
     whole screen, above the cards and above the overlays, because a raster belongs to
     the display rather than to anything drawn on it.

     It takes no pointer and reads as nothing. There is no information here — only the
     texture of the terminal the interface is pretending to be. -->
<template>
  <div class="crt-overlay" aria-hidden="true"></div>
</template>

<style scoped>
/* One dark row every three pixels at a tenth opacity, which averages about 3% over the
   screen. §24 allows the effect only for as long as it costs no legibility, and the
   glyphs of an 8x16 bitmap face are 2px strokes: a heavier line would eat one. */
.crt-overlay {
    position: fixed;
    z-index: 1;
    inset: 0;
    background: repeating-linear-gradient(
        0deg,
        rgb(0 0 0 / 10%),
        rgb(0 0 0 / 10%) 1px,
        transparent 1px,
        transparent 3px
    );
    pointer-events: none;
}
</style>
