<!-- The line drawing at the head of a card. One component for all seven: the art is
     raster rather than vector (ui_ux.md §9), so there is nothing to draw per
     component, only a picture to pick.

     The drawing carries the component's state, because it is the one part of a card
     that reads from across the row: white when the thing is not working, green when it
     is, red when it is in trouble. That is the whole reason it is coloured — a picture
     tinted for decoration would be spending the interface's three colours on nothing.

     The artwork is used as drawn. It is painted through its own alpha as a mask rather
     than filtered: a filter chain can flatten a drawing to one colour but cannot be
     aimed at an arbitrary one, and the mask keeps the anti-aliased edges exactly as
     they were supplied. -->
<template>
  <div class="equipment-icon" :class="`equipment-icon--${status}`">
    <div
      class="equipment-icon__image"
      role="img"
      :aria-label="`${component} ${STATUS_LABELS[status]}`"
      :style="{
        '--icon-source': `url(${DRAWINGS[component].source})`,
        '--icon-width': `${DRAWINGS[component].width}px`,
        '--icon-height': `${DRAWINGS[component].height}px`,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import batteryImage from '@/assets/icons/battery.png'
import boilerImage from '@/assets/icons/boiler.png'
import pulverizerImage from '@/assets/icons/pulverizer.png'
import siloImage from '@/assets/icons/silo.png'
import stockpileImage from '@/assets/icons/stockpile.png'
import tankImage from '@/assets/icons/tank.png'
import turbineImage from '@/assets/icons/turbine.png'
import type {ComponentStatus, MachineId, StorageId} from '@/game/types'

/** Everything in the chain that has a drawing, which is everything in the chain. */
type EquipmentId = MachineId | StorageId

/**
 * Each drawing and the size it was supplied at.
 *
 * The dimensions are here because a masked element has no intrinsic size to take them
 * from — an `<img>` knows how big its picture is and a painted box does not. Without them
 * the mask would be fitted to the card's full width and four of the seven drawings would
 * come out larger than they were drawn, which ui_ux.md §9 forbids. They are safe to write
 * down: this artwork is fixed and supplied, not generated.
 */
const DRAWINGS: Record<EquipmentId, {source: string,
  width: number,
  height: number}> = {
  stockpile: {
    source: stockpileImage,
    width: 190,
    height: 74,
  },
  pulverizer: {
    source: pulverizerImage,
    width: 88,
    height: 106,
  },
  silo: {
    source: siloImage,
    width: 56,
    height: 105,
  },
  boiler: {
    source: boilerImage,
    width: 141,
    height: 105,
  },
  tank: {
    source: tankImage,
    width: 129,
    height: 83,
  },
  turbine: {
    source: turbineImage,
    width: 140,
    height: 90,
  },
  battery: {
    source: batteryImage,
    width: 136,
    height: 93,
  },
}

// The drawing is the only place this state appears, so it cannot be left to the colour:
// a screen reader gets the word instead (ui_ux.md §28)
const STATUS_LABELS: Record<ComponentStatus, string> = {
  stopped: 'STOPPED',
  normal: 'RUNNING',
  critical: 'CRITICAL',
}

defineProps<{
  component: EquipmentId
  status: ComponentStatus
}>()
</script>

<style scoped>
/* Six cells tall, which holds every drawing at or near its native size — these are
   small pictures and scaling them up would only soften them */
.equipment-icon {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    height: calc(var(--cell-height) * 6);
}

/* The picture is a block of the state's colour, shown only where the artwork has ink.
   Sized at the drawing's own dimensions and capped by the band, so a drawing taller than
   six cells is scaled down and no drawing is ever scaled up (ui_ux.md §9). `contain` then
   only ever has to fit the mask into a box that is already at most native size. */
.equipment-icon__image {
    width: var(--icon-width);
    height: var(--icon-height);
    max-width: 100%;
    max-height: 100%;
    background: var(--icon-colour, var(--fg));
    mask: var(--icon-source) no-repeat center / contain;
    -webkit-mask: var(--icon-source) no-repeat center / contain;
}

/* White is the console's own colour, and a stopped component is exactly what the rest
   of the interface is drawn in: it is the absence of a reading, not a reading */
.equipment-icon--stopped {
    --icon-colour: var(--fg);
}

.equipment-icon--normal {
    --icon-colour: var(--data);
}

.equipment-icon--critical {
    --icon-colour: var(--alert);
}
</style>
