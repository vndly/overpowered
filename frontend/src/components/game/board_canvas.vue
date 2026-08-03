<!-- The board. Owns the canvas, its size and its device pixel ratio, and renders
     only when the match loop asks it to — it drives no loop of its own. -->
<template>
  <canvas ref="canvas" class="board-canvas"></canvas>
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, useTemplateRef} from 'vue'
import type {Match} from '@/game/match'
import {BoardLayout} from '@/game/render/board_layout'
import {BoardRenderer} from '@/game/render/board_renderer'

const props = defineProps<{match: Match}>()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

let context: CanvasRenderingContext2D | null = null
let layout: BoardLayout | null = null
let renderer: BoardRenderer | null = null
let observer: ResizeObserver | null = null

/** Draws the current match. The match object is read fresh, so a restart needs no rewiring. */
function render(): void {
  renderer?.draw(props.match)
}

/**
 * Matches the backing store to the canvas's CSS size and the display's pixel
 * ratio, then re-fits the board. Only the backing store changes, so the
 * observed border box does not, and this cannot feed back into itself.
 */
function applySize(): void {
  const element = canvas.value

  if (element === null || context === null || layout === null) {
    return
  }

  const width = element.clientWidth
  const height = element.clientHeight

  if (width === 0 || height === 0) {
    return
  }

  const ratio = window.devicePixelRatio

  element.width = Math.round(width * ratio)
  element.height = Math.round(height * ratio)

  // Resizing the backing store resets the transform, so it is reapplied here
  // and the renderer works in CSS pixels throughout
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  layout.fit(width, height)
  render()
}

onMounted(() => {
  const element = canvas.value

  if (element === null) {
    return
  }

  context = element.getContext('2d')

  if (context === null) {
    return
  }

  // The layout depends on the board's dimensions alone, which a restart cannot change
  layout = new BoardLayout(props.match.grid.columns, props.match.grid.rows)
  renderer = new BoardRenderer(context, layout)
  observer = new ResizeObserver(applySize)
  observer.observe(element)
  applySize()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

defineExpose({
  render: render,
})
</script>

<style scoped>
.board-canvas {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
