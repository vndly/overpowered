<!-- The board. Owns the canvas, its size and its device pixel ratio, and renders
     only when the match loop asks it to — it drives no loop of its own.
     It reports the cell under the cursor and nothing more: what that means is
     the screen's business. -->
<template>
  <canvas
    ref="canvas"
    class="board-canvas"
    @pointermove="onPointerMove"
    @pointerleave="emit('hover', null)"
    @click="onClick"
    @contextmenu.prevent="emit('disarm')"
  ></canvas>
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, useTemplateRef} from 'vue'
import type {Position} from '@/game/cell'
import type {Interaction} from '@/game/interaction'
import type {Match} from '@/game/match'
import {BoardLayout} from '@/game/render/board_layout'
import {BoardRenderer} from '@/game/render/board_renderer'

const props = defineProps<{
  match: Match
  interaction: Interaction
}>()

const emit = defineEmits<{
  'hover': [position: Position | null]
  'activate': [position: Position]
  'disarm': []
}>()

const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

let context: CanvasRenderingContext2D | null = null
let layout: BoardLayout | null = null
let renderer: BoardRenderer | null = null
let observer: ResizeObserver | null = null

/** Draws the current match. Both props are read fresh, so a restart needs no rewiring. */
function render(): void {
  renderer?.draw(props.match, props.interaction)
}

/**
 * The cell a pointer event landed on.
 * @param event - The pointer event, in client coordinates
 * @returns The cell address, or undefined if the point missed the board
 */
function positionOf(event: MouseEvent): Position | undefined {
  const element = canvas.value

  if (element === null || layout === null) {
    return undefined
  }

  const bounds = element.getBoundingClientRect()

  // The frame scales as a unit below the minimum viewport, so the bounds are
  // measured rather than assumed: they already carry that scale
  const scaleX = element.clientWidth / bounds.width
  const scaleY = element.clientHeight / bounds.height

  return layout.positionAt((event.clientX - bounds.left) * scaleX, (event.clientY - bounds.top) * scaleY)
}

function onPointerMove(event: PointerEvent): void {
  emit('hover', positionOf(event) ?? null)
}

function onClick(event: MouseEvent): void {
  const position = positionOf(event)

  if (position !== undefined) {
    emit('activate', position)
  }
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
