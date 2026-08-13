<!-- The foot of every card: its upgrade tracks, and one reserved pair of lines that says
     exactly what the track under the cursor would do.

     The magnitudes are shown while the player is deciding rather than at all times
     (specs.md §UI). Printing six figures on a machine card at rest would make the densest
     thing in the interface out of the part of it that is idle most of the time — but the
     two lines are always reserved, so nothing moves when they fill in and the seven cards
     keep their upgrade keys on one line across the chain (ui_ux.md §25).

     The arrows carry the same distinction the colours do, because state is never signalled
     by colour alone (ui_ux.md §28). -->
<template>
  <div class="upgrade-block">
    <SectionLabel label="UPGRADES" />
    <UpgradeButton
      v-for="(row, index) in rows"
      :key="row.label"
      :row="row"
      :disabled="!row.affordable"
      @press="emit('press', index)"
      @preview="preview = index"
      @clear="clearPreview(index)"
    />
    <div class="upgrade-block__detail" aria-hidden="true">
      <p class="upgrade-block__raises">{{ shown === null ? '' : `▲ ${shown.raisesText}` }}</p>
      <p class="upgrade-block__erodes">{{ shown === null ? '' : `▼ ${shown.erodesText}` }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import UpgradeButton from '@/components/game/upgrade_button.vue'
import SectionLabel from '@/components/terminal/section_label.vue'
import type {UpgradeRowView} from '@/view/view_model'

const props = defineProps<{
  rows: UpgradeRowView[]
}>()

const emit = defineEmits<{
  press: [index: number]
}>()

const preview = ref<number | null>(null)

const shown = computed(() => (preview.value === null ? null : props.rows[preview.value] ?? null))

/**
 * Clears the preview, unless another row has already claimed it.
 * A pointer moving from one key straight onto the next raises the new row's preview
 * before the old row's clear, and without this guard the detail would blank out.
 * @param index - The row reporting that it has been left
 */
function clearPreview(index: number): void {
  if (preview.value === index) {
    preview.value = null
  }
}
</script>

<style scoped>
/* The upgrade section sits at the foot of the card, so the keys line up across the chain
   however tall a card's readings make it (ui_ux.md §25). A blank line opens it rather
   than a rule (ui_ux.md §8). */
.upgrade-block {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--space-1);
    margin-top: auto;
    padding-top: var(--cell-height);
}

/* Two character lines, always reserved. They are a readout rather than content: a screen
   reader gets the same two figures from the key's own label, so repeating them here would
   read the card twice. */
.upgrade-block__detail {
    flex: none;
    margin-top: var(--space-1);
    line-height: var(--cell-height);
    white-space: pre;
}

.upgrade-block__raises {
    height: var(--cell-height);
    color: var(--data);
}

.upgrade-block__erodes {
    height: var(--cell-height);
    color: var(--caution);
}
</style>
