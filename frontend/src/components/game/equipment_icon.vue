<!-- The line drawing at the head of a card. One component for all seven: the art is
     raster rather than vector (ui_ux.md §9), so there is nothing to draw per
     component, only a picture to pick.

     The drawings are green on transparent, and green now belongs to the readings
     (assets/styles.css) — a drawing is not one. They are still used as drawn: a
     filter takes the strokes to the console's own colour rather than the artwork
     being re-cut, which is what a picture can do in place of currentColor. -->
<template>
  <div class="equipment-icon">
    <img class="equipment-icon__image" :src="SOURCES[component]" alt="">
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
import type {MachineId, StorageId} from '@/game/types'

/** Everything in the chain that has a drawing, which is everything in the chain. */
type EquipmentId = MachineId | StorageId

const SOURCES: Record<EquipmentId, string> = {
  stockpile: stockpileImage,
  pulverizer: pulverizerImage,
  silo: siloImage,
  boiler: boilerImage,
  tank: tankImage,
  turbine: turbineImage,
  battery: batteryImage,
}

defineProps<{
  component: EquipmentId
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

/* Flatten the strokes to black, invert them to white, then take that down to --fg.
   Anti-aliased edges keep their alpha through all three, so the drawings stay as
   sharp as they were supplied. */
.equipment-icon__image {
    max-width: 100%;
    max-height: 100%;
    filter: brightness(0) invert(1) brightness(var(--fg-level));
}
</style>
