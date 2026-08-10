<!-- The last minute of net flow (ui_ux.md §19), drawn as a chart recorder: the newest
     reading enters at the right and the trace walks left off the end of the window. The
     vertical axis rescales to whatever the window holds, with zero always on it, so the
     line fills its band at any output and the sign is never in doubt.

     A deliberate departure from §19's box-drawing sketch. A character-cell chart
     quantises to whole cells and jitters badly at this update rate, so the trace is
     inline SVG. Every rule §19 states still holds — green line, faint grid, no fill, no
     gradient, square corners, minimal labels — and this is the one component to change
     if a character chart is ever preferred. -->
<template>
  <TerminalPanel title="NET FLOW (MW)" :width-cells="widthCells">
    <svg
      class="net-flow-graph"
      aria-hidden="true"
      :width="width"
      :height="HEIGHT"
      :viewBox="`0 0 ${width} ${HEIGHT}`"
    >
      <g class="net-flow-graph__grid" shape-rendering="crispEdges">
        <line :x1="PLOT_LEFT" :y1="PLOT_TOP" :x2="PLOT_LEFT" :y2="PLOT_BOTTOM" />
        <line :x1="PLOT_LEFT" :y1="PLOT_BOTTOM" :x2="width" :y2="PLOT_BOTTOM" />
        <line v-for="tick in gridTicks" :key="tick.age" :x1="tick.x" :y1="PLOT_TOP" :x2="tick.x" :y2="PLOT_BOTTOM" />
      </g>
      <line class="net-flow-graph__zero" shape-rendering="crispEdges" :x1="PLOT_LEFT" :y1="zeroY" :x2="width" :y2="zeroY" />
      <polyline v-if="samples.length > 1" class="net-flow-graph__trace" :points="tracePoints" />
      <text v-for="label in valueLabels" :key="label.text" class="net-flow-graph__label" text-anchor="end" :x="LABEL_X" :y="label.y">{{ label.text }}</text>
      <text v-for="tick in timeTicks" :key="tick.age" class="net-flow-graph__label" :x="tick.x" :y="TIME_BASELINE" :text-anchor="tick.anchor">{{ tick.text }}</text>
    </svg>
  </TerminalPanel>
</template>

<script setup lang="ts">
import {computed} from 'vue'
import TerminalPanel from '@/components/terminal/terminal_panel.vue'
import {formatPower} from '@/view/formatting'

const CELL_WIDTH = 8
const HEIGHT = 112 // Seven character cells, the height of the Power Summary beside it
// Ten cells of value labels, then the axis. Nine of them hold the label itself, which
// is what a winning run needs: banking the target inside the time limit takes a net
// flow in the tens of thousands of MW, and a label wider than its gutter is cut off by
// the edge of the drawing rather than wrapped.
const PLOT_LEFT = 80
const PLOT_TOP = 8 // Half a line of headroom, so the topmost label is not clipped
const PLOT_BOTTOM = 88
const LABEL_X = PLOT_LEFT - CELL_WIDTH // One cell of air between a label and the axis
const LABEL_BASELINE_DROP = 4 // Half the cap height of the 8x16 face, to centre a label
const TIME_BASELINE = 108 // Baseline of the row beneath the plot
const WINDOW_SECONDS = 60 // What the ledger keeps, and so what the axis spans
const TICK_SECONDS = 15
const MINIMUM_SPAN = 2 // MW. A quiet plant reads as a flat line, not as amplified noise.
const ZERO_LABEL = '0'

/** One label on the value axis, already placed on its baseline. */
interface ValueLabel {
  y: number
  text: string
}

/** One mark on the time axis: how long ago it is, and where that falls. */
interface TimeTick {
  age: number // Seconds before now
  x: number
  text: string
  anchor: string // Keeps the first and last labels inside the plot
}

const props = defineProps<{
  samples: number[] // One-second net flow samples, oldest first
  widthCells: number // Set by the dashboard, which owns the row's arithmetic
}>()

const width = computed(() => props.widthCells * CELL_WIDTH)
const plotWidth = computed(() => width.value - PLOT_LEFT)

// Zero is always on the axis, and the axis is never narrower than MinimumSpan, so a
// plant sitting at nothing does not draw its rounding error at full height
const axis = computed(() => {
  const highest = Math.max(0, ...props.samples)
  const lowest = Math.min(0, ...props.samples)
  const short = Math.max(0, MINIMUM_SPAN - (highest - lowest)) / 2

  return {
    top: highest + short,
    bottom: lowest - short,
  }
})

/**
 * @param value - A net flow reading, MW
 * @returns Where it sits on the value axis
 */
function valueY(value: number): number {
  const span = axis.value.top - axis.value.bottom

  return PLOT_BOTTOM - ((value - axis.value.bottom) / span) * (PLOT_BOTTOM - PLOT_TOP)
}

/**
 * @param age - Seconds before now
 * @returns Where it sits on the time axis
 */
function timeX(age: number): number {
  return width.value - (age / WINDOW_SECONDS) * plotWidth.value
}

/**
 * @param age - Seconds before now
 * @returns How that tick's label hangs off it, so neither end runs out of the plot
 */
function timeAnchor(age: number): string {
  if (age >= WINDOW_SECONDS) {
    return 'start'
  }

  if (age <= 0) {
    return 'end'
  }

  return 'middle'
}

const zeroY = computed(() => valueY(0))

// The two ends of the axis and its zero. When the flow is all one way, zero is one of
// the ends and the axis carries two labels rather than three.
const valueLabels = computed<ValueLabel[]>(() => {
  const values = [
    axis.value.top,
    0,
    axis.value.bottom,
  ]

  return values
    .filter((value, index) => values.indexOf(value) === index)
    .map((value) => ({
      y: Math.round(valueY(value)) + LABEL_BASELINE_DROP,
      text: value === 0 ? ZERO_LABEL : formatPower(value, true),
    }))
})

const timeTicks = computed<TimeTick[]>(() => {
  const ticks: TimeTick[] = []

  for (let age = WINDOW_SECONDS; age >= 0; age -= TICK_SECONDS) {
    ticks.push({
      age: age,
      x: timeX(age),
      text: age.toString(),
      anchor: timeAnchor(age),
    })
  }

  return ticks
})

// The ends of the window are already drawn, by the axis and by the plot's right edge
const gridTicks = computed(() => timeTicks.value.filter((tick) => tick.age > 0 && tick.age < WINDOW_SECONDS))

// The oldest sample is the one furthest from now, so the trace is anchored at the right
// and a window that has not filled yet draws only the part of the plot it has reached
const tracePoints = computed(() => {
  const newest = props.samples.length - 1

  return props.samples
    .map((sample, index) => `${timeX(newest - index).toFixed(1)},${valueY(sample).toFixed(1)}`)
    .join(' ')
})
</script>

<style scoped>
.net-flow-graph {
    display: block;
    flex: none;
}

.net-flow-graph__grid line {
    stroke: var(--fg-faint);
    stroke-width: 1;
}

/* The datum the trace is read against, so it carries more weight than the grid */
.net-flow-graph__zero {
    stroke: var(--fg-dim);
    stroke-width: 1;
}

/* No fill, no gradient, mitred corners: an instrument trace, not an area chart */
.net-flow-graph__trace {
    fill: none;
    stroke: var(--fg);
    stroke-width: 1;
    stroke-linejoin: miter;
    stroke-linecap: butt;
}

.net-flow-graph__label {
    fill: var(--fg-dim);
    font-family: inherit;
    font-size: inherit;
}
</style>
