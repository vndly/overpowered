<!-- The build rail: one row per buildable structure, ordered by unlock.
     Pointing at a cell greys every row that cell will not take, which is how the
     resource matrix is taught — by pointing, not by memorising. -->
<template>
  <aside class="rail rail--build">
    <h2 class="hud-label rail-heading">Build</h2>

    <ul class="build-rows">
      <li v-for="(row, index) in rows" :key="row.kind">
        <button
          type="button"
          class="build-row"
          :class="{'build-row--armed': row.armed, 'build-row--illegal': row.illegal}"
          :aria-pressed="row.armed"
          @click="emit('arm', row.kind)"
        >
          <StructureGlyph :kind="row.kind" :size="40" :dimmed="row.illegal" />

          <span class="build-name rail-title">{{ row.name }}</span>
          <span class="readout build-cost" :class="{'build-cost--unaffordable': !row.affordable}">{{ row.cost }}</span>
          <kbd class="hotkey">{{ index + 1 }}</kbd>
        </button>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import StructureGlyph from '@/components/game/structure_glyph.vue'
import type {MatchSnapshot} from '@/composables/use_match'
import {checkBuild} from '@/game/economy'
import type {GeneratorKind} from '@/game/generator'
import {GENERATOR_KINDS, generatorStats} from '@/game/generator'
import {formatEnergy} from '@/game/format'
import type {Interaction} from '@/game/interaction'
import type {Match} from '@/game/match'

interface BuildRow {
  kind: GeneratorKind
  name: string
  cost: string
  armed: boolean
  affordable: boolean
  illegal: boolean // The hovered cell will not take this structure
}

const props = defineProps<{
  match: Match
  snapshot: MatchSnapshot
  interaction: Interaction
}>()

const emit = defineEmits<{
  'arm': [kind: GeneratorKind]
}>()

// The match is not reactive by design, so the snapshot is what tells Vue the
// board changed: every build and every sell moves stored energy, and stored
// energy is published the moment it does
const rows = computed<BuildRow[]>(() => {
  const hovered = props.interaction.hovered
  const stored = props.snapshot.spendableEnergy

  return GENERATOR_KINDS.map((kind) => {
    const stats = generatorStats(kind)

    return {
      kind: kind,
      name: stats.name,
      cost: formatEnergy(stats.cost),
      armed: props.interaction.armed === kind,
      affordable: stored >= stats.cost,
      illegal: hovered !== null && !checkBuild(props.match, kind, hovered).placeable,
    }
  })
})
</script>

<style scoped>
.rail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 12px;
    background: var(--surface-raised);
    border-right: 1px solid var(--rule);
}

.rail-heading {
    padding: 0 8px 10px;
    border-bottom: 1px solid var(--rule);
}

.build-rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
    list-style: none;
}

.build-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    text-align: left;

    /* The armed marker occupies this from the start, so arming a row does not
       shift the one below it */
    border-left: 2px solid transparent;
    border-radius: var(--radius-control);
    transition: background-color var(--tween) var(--ease), border-color var(--tween) var(--ease);
}

.build-row:hover {
    background: var(--surface-well);
}

/* Armed, and it stays armed: a relay chain is click-click-click */
.build-row--armed {
    background: var(--surface-well);
    border-left-color: var(--ink);
}

/* The hovered cell will not take it. The row greys whole, cost included. */
.build-row--illegal,
.build-row--illegal .build-cost {
    color: var(--ink-faint);
}

.build-name {
    flex: 1;
}

.build-cost {
    color: var(--ink-dim);
}

/* Affordability is the row's other axis, so it recolours the cost alone and
   leaves the rest of the row at full weight */
.build-cost--unaffordable {
    color: var(--state-2);
}
</style>
