<!-- The line drawing at the head of a card. One component for all seven: the art is
     raster rather than vector (ui_ux.md §9), so there is nothing to draw per
     component, only a picture to pick.

     The drawings are green on transparent, so a card renders them as they were
     drawn. A card that inverts blacks the strokes out with a filter instead of
     recolouring them, which is what a picture can do in place of currentColor. -->
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

.equipment-icon__image {
    max-width: 100%;
    max-height: 100%;
}
</style>
