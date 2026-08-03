<!-- A match, start to finish. Three fixed zones and the board well: nothing ever
     overlaps the board except the overlay that replaces it. -->
<template>
  <div class="match-screen">
    <div class="match-frame" :style="frameStyle">
      <HudPanel :snapshot="snapshot" @toggle-pause="togglePause" />

      <div class="match-body">
        <BuildRail :match="match" :snapshot="snapshot" :interaction="interaction" @arm="arm" />

        <div class="board-well">
          <BoardCanvas
            ref="board"
            :match="match"
            :interaction="interaction"
            @hover="onHover"
            @activate="onActivate"
            @disarm="disarm"
          />

          <MatchOverlay
            v-if="overlayMode !== null"
            :mode="overlayMode"
            :snapshot="snapshot"
            @resume="togglePause"
            @restart="onOverlayRestart"
            @cancel="cancelRestart"
          />
        </div>

        <InspectRail
          :match="match"
          :snapshot="snapshot"
          :interaction="interaction"
          @sell="onSell"
          @upgrade="upgrade"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef} from 'vue'
import BoardCanvas from '@/components/game/board_canvas.vue'
import BuildRail from '@/components/game/build_rail.vue'
import HudPanel from '@/components/game/hud_panel.vue'
import InspectRail from '@/components/game/inspect_rail.vue'
import MatchOverlay from '@/components/game/match_overlay.vue'
import {useMatch} from '@/composables/use_match'
import type {Position} from '@/game/cell'
import type {GeneratorKind} from '@/game/generator'
import {GENERATOR_KINDS} from '@/game/generator'
import type {Interaction} from '@/game/interaction'
import {idleInteraction} from '@/game/interaction'
import {WORKING_LEVEL} from '@/game/level'
import {TUNABLES} from '@/game/tunables'

const board = useTemplateRef<InstanceType<typeof BoardCanvas>>('board')

const {
  snapshot, match, start, stop, setPaused, togglePause, restart, build, sell, upgrade,
} = useMatch(WORKING_LEVEL, () => {
  board.value?.render()
})

const viewportWidth = ref(window.innerWidth)
const viewportHeight = ref(window.innerHeight)
const isConfirmingRestart = ref(false)
const wasPausedBeforeConfirm = ref(false)

// Replaced rather than mutated, so the rails see a reactive change while the
// renderer still reads a plain object with no proxy in its path
const interaction = shallowRef<Interaction>(idleInteraction())

/**
 * The frame fills the viewport at or above the minimum, and below it scales
 * down as a unit rather than reflowing — a cascade is only readable if the
 * whole board is on screen at once.
 */
const frameStyle = computed(() => {
  const width = Math.max(TUNABLES.frame.minimumWidth, viewportWidth.value)
  const height = Math.max(TUNABLES.frame.minimumHeight, viewportHeight.value)
  const scale = Math.min(1, viewportWidth.value / width, viewportHeight.value / height)

  // Centred by translation rather than by the layout, because a frame wider
  // than the viewport would grow its own grid track and overflow to one side
  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(-50%, -50%) scale(${scale})`,
  }
})

// Strict precedence: a question being asked outranks an ending, which outranks
// pause. The union is inferred rather than imported, and vue-tsc checks it
// against the overlay's own prop type where it is bound.
const overlayMode = computed(() => {
  if (isConfirmingRestart.value) {
    return 'restart'
  }

  if (snapshot.value.status === 'won' || snapshot.value.status === 'lost') {
    return snapshot.value.status
  }

  return snapshot.value.paused ? 'paused' : null
})

/**
 * Replaces the interaction state with one changed field.
 * @param change - The fields to change
 */
function setInteraction(change: Partial<Interaction>): void {
  interaction.value = {
    ...interaction.value,
    ...change,
  }
}

/** Arming keeps the tool in hand after a placement, so a run of cells is click-click-click. */
function arm(kind: GeneratorKind): void {
  setInteraction({
    armed: kind,
    selected: null,
  })
}

function disarm(): void {
  setInteraction({
    armed: null,
  })
}

function onHover(position: Position | null): void {
  setInteraction({
    hovered: position,
  })
}

/**
 * A click on the board: place what is armed, or select what is there.
 * @param position - The cell clicked
 */
function onActivate(position: Position): void {
  const armed = interaction.value.armed

  if (armed !== null) {
    build(armed, position)

    return
  }

  setInteraction({
    selected: match.value.structureAt(position) === undefined ? null : position,
  })
}

/**
 * Sells a generator. The selection goes with it, because what it described is
 * no longer on the board.
 * @param position - The cell the generator stands on
 */
function onSell(position: Position): void {
  if (sell(position)) {
    setInteraction({
      selected: null,
    })
  }
}

/** Restarting a live match asks first; restarting a finished one has nothing to lose. */
function requestRestart(): void {
  if (snapshot.value.status !== 'running') {
    confirmRestart()

    return
  }

  wasPausedBeforeConfirm.value = snapshot.value.paused
  setPaused(true)
  isConfirmingRestart.value = true
}

function confirmRestart(): void {
  isConfirmingRestart.value = false
  interaction.value = idleInteraction()
  restart()
}

function cancelRestart(): void {
  isConfirmingRestart.value = false
  setPaused(wasPausedBeforeConfirm.value)
}

/** Restart reads as "ask" everywhere except on the panel that is already asking. */
function onOverlayRestart(): void {
  if (isConfirmingRestart.value) {
    confirmRestart()
  } else {
    requestRestart()
  }
}

function onResize(): void {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

/**
 * Escape backs out of whatever is in front of the player, in order: the question
 * being asked, then the armed tool, then the selection, and only then the match
 * itself. One key, one idea, and pause simply sits at the end of the chain.
 */
function onEscape(): void {
  if (isConfirmingRestart.value) {
    cancelRestart()
  } else if (interaction.value.armed !== null) {
    disarm()
  } else if (interaction.value.selected !== null) {
    setInteraction({
      selected: null,
    })
  } else {
    togglePause()
  }
}

/**
 * Arms a build slot by its number, as printed on the build rail's rows.
 * @param key - The digit pressed
 * @returns Whether a slot was armed
 */
function armSlot(key: string): boolean {
  const slot = GENERATOR_KINDS[Number(key) - 1]

  if (slot === undefined) {
    return false
  }

  arm(slot)

  return true
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat) {
    return
  }

  if (event.key === 'Escape') {
    onEscape()

    return
  }

  if (event.key >= '1' && event.key <= '9' && armSlot(event.key)) {
    return
  }

  if (event.key === 's' || event.key === 'S') {
    const selected = interaction.value.selected

    if (selected !== null) {
      onSell(selected)
    }

    return
  }

  // The selection survives an upgrade, unlike a sell: what it described is still
  // standing there, one level taller, and the next level is the obvious next key
  if (event.key === 'u' || event.key === 'U') {
    const selected = interaction.value.selected

    if (selected !== null) {
      upgrade(selected)
    }

    return
  }

  if (event.key === 'r' || event.key === 'R') {
    if (isConfirmingRestart.value) {
      confirmRestart()
    } else {
      requestRestart()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onResize)
  start()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onResize)
  stop()
})
</script>

<style scoped>
.match-screen {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--surface-base);
}

.match-frame {
    position: absolute;
    top: 50%;
    left: 50%;
    display: grid;
    grid-template-rows: var(--hud-height) 1fr;
    transform-origin: center;
}

.match-body {
    display: grid;
    grid-template-columns: var(--rail-width) 1fr var(--rail-width);
    min-height: 0;
}

.board-well {
    position: relative;
    min-width: 0;
    min-height: 0;
    background: var(--surface-well);
}
</style>
