<!-- A match, start to finish. Three fixed zones and the board well: nothing ever
     overlaps the board except the overlay that replaces it. -->
<template>
  <div class="match-screen">
    <div class="match-frame" :style="frameStyle">
      <HudPanel :snapshot="snapshot" @toggle-pause="togglePause" />

      <div class="match-body">
        <aside class="rail rail--build"></aside>

        <div class="board-well">
          <BoardCanvas ref="board" :match="match" />

          <MatchOverlay
            v-if="overlayMode !== null"
            :mode="overlayMode"
            :snapshot="snapshot"
            @resume="togglePause"
            @restart="onOverlayRestart"
            @cancel="cancelRestart"
          />
        </div>

        <aside class="rail rail--inspect"></aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, useTemplateRef} from 'vue'
import BoardCanvas from '@/components/game/board_canvas.vue'
import HudPanel from '@/components/game/hud_panel.vue'
import MatchOverlay from '@/components/game/match_overlay.vue'
import {useMatch} from '@/composables/use_match'
import {WORKING_LEVEL} from '@/game/level'
import {TUNABLES} from '@/game/tunables'

const board = useTemplateRef<InstanceType<typeof BoardCanvas>>('board')

const {
  snapshot, match, start, stop, setPaused, togglePause, restart,
} = useMatch(WORKING_LEVEL, () => {
  board.value?.render()
})

const viewportWidth = ref(window.innerWidth)
const viewportHeight = ref(window.innerHeight)
const isConfirmingRestart = ref(false)
const wasPausedBeforeConfirm = ref(false)

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

/** Restarting a live match asks first; restarting a finished one has nothing to lose. */
function requestRestart(): void {
  if (snapshot.value.status !== 'running') {
    restart()

    return
  }

  wasPausedBeforeConfirm.value = snapshot.value.paused
  setPaused(true)
  isConfirmingRestart.value = true
}

function confirmRestart(): void {
  isConfirmingRestart.value = false
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

function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat) {
    return
  }

  // Escape backs out of whatever is in front of the player: the question first,
  // the match second. Stage 2 puts disarming the build tool ahead of both.
  if (event.key === 'Escape') {
    if (isConfirmingRestart.value) {
      cancelRestart()
    } else {
      togglePause()
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

/* Empty until stage 2 fills them: the frame is what stage 1 commits, not its contents */
.rail {
    background: var(--surface-raised);
}

.rail--build {
    border-right: 1px solid var(--rule);
}

.rail--inspect {
    border-left: 1px solid var(--rule);
}

.board-well {
    position: relative;
    min-width: 0;
    min-height: 0;
    background: var(--surface-well);
}
</style>
