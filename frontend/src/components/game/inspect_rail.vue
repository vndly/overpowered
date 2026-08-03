<!-- The inspect rail: what the player is about to do, what they are pointing at,
     or what they have selected — in that order of precedence, so the answer to
     the most immediate question is always the one on screen. There are no
     floating tooltips anywhere in the game; everything lands here. -->
<template>
  <aside class="rail rail--inspect">
    <h2 class="hud-label rail-heading">{{ view.title }}</h2>

    <dl v-if="view.readouts.length > 0" class="inspect-readouts">
      <div v-for="readout in view.readouts" :key="readout.label" class="inspect-readout">
        <dt class="caption">{{ readout.label }}</dt>
        <dd class="readout" :class="`inspect-value--${readout.tone}`">{{ readout.value }}</dd>
      </div>
    </dl>

    <p v-if="view.reason !== null" class="caption error-text inspect-reason">{{ view.reason }}</p>

    <div v-if="view.actions !== null" class="inspect-actions">
      <button
        type="button"
        class="control inspect-action"
        :disabled="!view.actions.canUpgrade"
        @click="emit('upgrade', view.actions.position)"
      >
        <span class="rail-title">Upgrade</span>
        <kbd class="hotkey">U</kbd>
      </button>

      <button type="button" class="control inspect-action" @click="emit('sell', view.actions.position)">
        <span class="rail-title">Sell</span>
        <kbd class="hotkey">S</kbd>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import type {MatchSnapshot} from '@/composables/use_match'
import type {Position, ResourceKind} from '@/game/cell'
import {samePosition} from '@/game/cell'
import {checkBuild, checkUpgrade, refundFor, upgradeCostFor, upgradedOutputFor} from '@/game/economy'
import type {UpgradeCheck} from '@/game/economy'
import type {Generator, GeneratorKind} from '@/game/generator'
import {generatorStats} from '@/game/generator'
import {formatEnergy, formatRate} from '@/game/format'
import type {Interaction} from '@/game/interaction'
import type {Match} from '@/game/match'
import {TUNABLES} from '@/game/tunables'

/**
 * How a value is inked. `energy` is the HUD's yellow, which every energy amount
 * takes; `plain` is neutral ink; `alert` is the top of the state ramp, spent on
 * a price the player cannot currently meet.
 */
type ReadoutTone = 'energy' | 'plain' | 'alert'

interface Readout {
  label: string
  value: string
  tone: ReadoutTone
}

/** What the rail offers on the selected structure. Selling is always available; upgrading runs out. */
interface InspectActions {
  position: Position // The cell every action here acts on
  canUpgrade: boolean // False at the level cap, and while the price is out of reach
}

interface InspectView {
  title: string
  readouts: Readout[]
  reason: string | null // What is standing in the way, stated and nothing else
  actions: InspectActions | null // Offered on a selection only, never on a hover
}

const props = defineProps<{
  match: Match
  snapshot: MatchSnapshot
  interaction: Interaction
}>()

const emit = defineEmits<{
  'sell': [position: Position]
  'upgrade': [position: Position]
}>()

/**
 * An energy amount, as a readout.
 * @param label - The field's name
 * @param value - Energy units
 * @returns The readout
 */
function energyReadout(label: string, value: number): Readout {
  return {
    label: label,
    value: formatEnergy(value),
    tone: 'energy',
  }
}

/**
 * A price, inked by whether the player can meet it right now. It reads against
 * the untweened balance, so the colour can never disagree with the rule that
 * decides whether the click will work.
 * @param label - The field's name
 * @param cost - Energy the action costs
 * @returns The readout
 */
function costReadout(label: string, cost: number): Readout {
  return {
    label: label,
    value: formatEnergy(cost),
    tone: props.snapshot.spendableEnergy >= cost ? 'plain' : 'alert',
  }
}

/**
 * A rate, as a readout.
 * @param label - The field's name
 * @param value - Energy per minute
 * @returns The readout
 */
function rateReadout(label: string, value: number): Readout {
  return {
    label: label,
    value: formatRate(value),
    tone: 'plain',
  }
}

/**
 * The placement preview: what it costs, and what it would actually deliver —
 * which is nothing at all until it reaches the network.
 * @param kind - The armed generator
 * @returns The rail's contents
 */
function describePlacement(kind: GeneratorKind): InspectView {
  const stats = generatorStats(kind)
  const hovered = props.interaction.hovered

  if (hovered === null) {
    return {
      title: stats.name,
      readouts: [
        costReadout('Cost', stats.cost),
        rateReadout('Output', stats.output),
      ],
      reason: null,
      actions: null,
    }
  }

  const delivered = props.match.networkNeighbours(hovered).length > 0 ? stats.output : 0

  return {
    title: stats.name,
    readouts: [
      costReadout('Cost', stats.cost),
      rateReadout('Delivered', delivered),
    ],
    reason: checkBuild(props.match, kind, hovered).reason,
    actions: null,
  }
}

/**
 * A structure's level against the cap, so "one more" and "no more" read the same
 * way. Plain ink: a level is a fact about the structure, not a price.
 * @param generator - The generator on the cell
 * @returns The readout
 */
function levelReadout(generator: Generator): Readout {
  return {
    label: 'Level',
    value: `${generator.level} / ${TUNABLES.economy.maxLevel}`,
    tone: 'plain',
  }
}

/**
 * A generator already on the board. Output is what it makes; delivered is what
 * survives the trip, which is zero while it is off the network.
 *
 * Offered its actions, it also prices its next level and says what that level
 * would make. That pair against the build rail's — a whole generator, and what a
 * whole generator makes — is the decision this stage is about, and both halves
 * are on screen at once.
 * @param generator - The generator on the cell
 * @param withActions - Whether the rail may offer to act on it
 * @returns The rail's contents
 */
function describeGenerator(generator: Generator, withActions: boolean): InspectView {
  const connected = props.match.isConnected(generator)
  const upgrade = checkUpgrade(props.match, generator)
  const readouts = [
    levelReadout(generator),
    rateReadout('Output', generator.output),
    rateReadout('Delivered', connected ? generator.output : 0),
  ]

  if (withActions) {
    if (upgrade.upgradeable) {
      readouts.push(
        costReadout('Upgrade', upgradeCostFor(generator)),
        rateReadout('Next level', upgradedOutputFor(generator)),
      )
    }

    readouts.push(energyReadout('Refund', refundFor(generator)))
  }

  return {
    title: generator.name,
    readouts: readouts,
    reason: generatorReason(connected, withActions ? upgrade : null),
    actions: withActions
      ? {
        position: generator.position,
        canUpgrade: upgrade.allowed,
      }
      : null,
  }
}

/**
 * The one line the rail prints under a generator's readouts: whatever most
 * immediately stands in the player's way. Being off the network outranks
 * anything about an upgrade, because it is costing energy every second.
 * @param connected - Whether the generator reaches the accumulator
 * @param upgrade - The upgrade rules, or null when the rail is not offering the action
 * @returns The line to print, or null when nothing is in the way
 */
function generatorReason(connected: boolean, upgrade: UpgradeCheck | null): string | null {
  if (!connected) {
    return 'Not connected to the accumulator'
  }

  return upgrade === null ? null : upgrade.reason
}

/**
 * What is on a cell: a structure and its live numbers, or the ground itself.
 * @param position - The cell to read
 * @param withActions - Whether the rail may offer to act on what is there
 * @returns The rail's contents
 */
function describeCell(position: Position, withActions: boolean): InspectView {
  const generator = props.match.generatorAt(position)

  if (generator !== undefined) {
    return describeGenerator(generator, withActions)
  }

  if (samePosition(position, props.match.accumulator.position)) {
    return {
      title: 'Accumulator',
      readouts: [rateReadout('Delivered', props.match.network.deliveredOutput)],
      reason: null,
      actions: null,
    }
  }

  return describeGround(position)
}

/**
 * The bare cell, named by what it is and what it will take.
 * @param position - The cell to read
 * @returns The rail's contents
 */
function describeGround(position: Position): InspectView {
  const cell = props.match.grid.cellAt(position.x, position.y)
  const empty: InspectView = {
    title: 'Empty cell',
    readouts: [],
    reason: null,
    actions: null,
  }

  if (cell === undefined) {
    return empty
  }

  switch (cell.kind) {
    case 'resource':
      return {
        title: 'Resource cell',
        readouts: [
          {
            label: 'Accepts',
            value: cell.resources.map(resourceName).join(', '),
            tone: 'plain',
          },
        ],
        reason: null,
        actions: null,
      }
    case 'water':
      return {
        ...empty,
        title: 'Water',
      }
    case 'obstacle':
      return {
        ...empty,
        title: 'Obstacle',
      }
    case 'empty':
      return empty
  }
}

/**
 * A resource as the rail names it.
 * @param resource - The resource a cell carries
 * @returns Its name in sentence case
 */
function resourceName(resource: ResourceKind): string {
  return resource.charAt(0).toUpperCase() + resource.slice(1)
}

// Strict precedence, highest first. Selection persists while nothing is armed
// and nothing is hovered, so it is the last thing consulted rather than the first.
const view = computed<InspectView>(() => {
  const armed = props.interaction.armed

  if (armed !== null) {
    return describePlacement(armed)
  }

  if (props.interaction.hovered !== null) {
    return describeCell(props.interaction.hovered, false)
  }

  if (props.interaction.selected !== null) {
    return describeCell(props.interaction.selected, true)
  }

  return {
    title: 'Inspect',
    readouts: [],
    reason: null,
    actions: null,
  }
})
</script>

<style scoped>
.rail {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 20px;
    background: var(--surface-raised);
    border-left: 1px solid var(--rule);
}

.rail-heading {
    padding-bottom: 10px;
    color: var(--ink);
    border-bottom: 1px solid var(--rule);
}

.inspect-readouts {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.inspect-readout {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
}

.inspect-value--energy {
    color: var(--hud-energy);
}

.inspect-value--plain {
    color: var(--ink);
}

/* A price the balance will not cover. docs/ui.md § Colour records this as the
   third admitted use of reserved red. */
.inspect-value--alert {
    color: var(--state-4);
}

.inspect-reason {
    padding-top: 12px;
    border-top: 1px solid var(--rule);
}

/* Stacked full width rather than in a row: stage 5 adds two more actions here,
   and a column takes them without the buttons ever narrowing. */
.inspect-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: auto;
}

/* Name left, hotkey right, matching a build rail row */
.inspect-action {
    justify-content: space-between;
}
</style>
