<!-- A structure's glyph, off the board. It draws through the same primitives the
     board does, so the drawing a player learns in a rail is the one they then
     look for on a cell. -->
<template>
  <canvas ref="canvas" class="glyph" :style="boxStyle"></canvas>
</template>

<script setup lang="ts">
import {computed, useTemplateRef, watchEffect} from 'vue'
import type {GeneratorKind} from '@/game/generator'
import {drawGeneratorGlyph} from '@/game/render/glyphs'
import {TUNABLES} from '@/game/tunables'

const props = defineProps<{
  kind: GeneratorKind
  size: number // The box's edge in CSS pixels, which the glyph is scaled against
  dimmed: boolean // Greyed to ink-faint, matching an illegal build rail row
}>()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

const boxStyle = computed(() => {
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
  }
})

/**
 * Redraws the swatch. Every reactive source is read before the first early
 * return, so the effect below tracks all of them — including the canvas itself,
 * which is what makes the first draw happen on mount.
 */
function draw(): void {
  const kind = props.kind
  const size = props.size
  const stroke = props.dimmed ? TUNABLES.colors.ghostIllegal : TUNABLES.colors.structureStroke
  const element = canvas.value

  if (element === null) {
    return
  }

  const context = element.getContext('2d')

  if (context === null) {
    return
  }

  const ratio = window.devicePixelRatio

  element.width = Math.round(size * ratio)
  element.height = Math.round(size * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)

  drawGeneratorGlyph(context, kind, size / 2, size / 2, size, {
    stroke: stroke,
    fill: null,
  })
}

watchEffect(draw)
</script>

<style scoped>
.glyph {
    display: block;
    flex: none;
}
</style>
