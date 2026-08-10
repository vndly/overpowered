<!-- Development-only proof that the engine implements docs/specs.md, porting the intent
     of simulator/verify.py. The whole report is computed synchronously while the
     component sets up — roughly ninety 600 s runs — so the screen appears once, filled.
     It is registered only under import.meta.env.DEV and never reaches a build. -->
<template>
  <main class="verify-screen">
    <h1 class="verify-screen__title">ENGINE VERIFICATION</h1>
    <section v-for="group in report.groups" :key="group.title" class="verify-screen__group">
      <h2 class="verify-screen__heading">{{ group.title }}</h2>
      <p
        v-for="(line, index) in group.lines"
        :key="index"
        class="verify-screen__line"
        :class="{'verify-screen__line--failed': line.failed}"
      >
        {{ line.text }}
      </p>
    </section>
    <p class="verify-screen__summary">{{ report.summary }}</p>
  </main>
</template>

<script setup lang="ts">
import {CoalMarket} from '@/game/coal_market'
import {DELTA_TIME_SECONDS, MARKET, MAX_SETTING_STEPS, SECONDS_PER_MINUTE, STARTING_CHARGE, TIME_LIMIT} from '@/game/constants'
import {GameEngine} from '@/game/game_engine'
import type {ScriptedRunResult} from '@/game/scripted_run'
import {runScript} from '@/game/scripted_run'

const NAME_WIDTH = 30 // Widest check name, so the got and spec columns line up
const VALUE_WIDTH = 10

// specs.md quotes its opening figures to two decimals, so a check is only as tight as
// the printed value: half of the last digit, or 0.2% for the larger numbers.
const OPENING_TOLERANCE_FLOOR = 0.005
const OPENING_TOLERANCE_FRACTION = 0.002
const CEILING_TOLERANCE = 0.002
const MAX_STRESS_TOLERANCE = 0.05
const RESIDUAL_TOLERANCE = 1e-6
const CONVERGENCE_TOLERANCE = 0.06

// The closing price is reached by 600 s of compounding steps rather than by one
// exponent, so it is only as exact as the accumulated floating point allows.
const PRICE_TOLERANCE = 1e-6

const STATIC_SEED = 0 // The static checks read a state, never a run
const SLACK_FILL = 0.5 // A store sitting clear of both strain thresholds
const BALANCE_SEED = 1
const BALANCE_STEP_SECONDS = 0.1
const CONVERGENCE_SEEDS = 16
const CONVERGENCE_STEPS = [
  0.2,
  0.1,
  0.05,
]
const CONTRAST_STEP = 0.4 // Too coarse to hold anyone to; reported for contrast only
const RESTART_SEEDS = 12
const RESTART_STEP_SECONDS = 0.1

/** One assertion and the two values it compares. */
interface Check {
  name: string
  got: string
  expected: string
  passed: boolean
}

/** A group of checks as verify.py prints them: unasserted notes, then the checks. */
interface CheckGroup {
  title: string
  notes: string[]
  checks: Check[]
}

/** What one step size did across every convergence seed. */
interface StepSummary {
  deltaSeconds: number
  medianPeak: number
  medianGenerated: number
  medianMachineUse: number
  meanUpgradeLevels: number
}

/** One rendered line of the report. */
interface ReportLine {
  text: string
  failed: boolean
}

/**
 * @param values - The values to average
 * @returns Their arithmetic mean, or 0 when there are none
 */
function mean(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((total, value) => total + value, 0) / values.length
}

/**
 * @param values - The values to take the middle of
 * @returns Their median, or 0 when there are none
 */
function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second)
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle] ?? 0

  if (sorted.length % 2 !== 0) {
    return upper
  }

  return ((sorted[middle - 1] ?? 0) + upper) / 2
}

/**
 * @param values - The values to compare
 * @returns The gap between the largest and smallest, as a fraction of their mean
 */
function relativeSpread(values: number[]): number {
  const average = mean(values)

  if (average === 0) {
    return 0
  }

  return (Math.max(...values) - Math.min(...values)) / average
}

/**
 * @param engine - The engine to read
 * @returns Levels bought across all ten upgrade tracks
 */
function totalUpgradeLevels(engine: GameEngine): number {
  const tracks = [
    engine.stockpile.capacityUpgrade,
    engine.silo.capacityUpgrade,
    engine.tank.capacityUpgrade,
    engine.battery.capacityUpgrade,
    engine.pulverizer.capacityUpgrade,
    engine.pulverizer.efficiencyUpgrade,
    engine.boiler.capacityUpgrade,
    engine.boiler.efficiencyUpgrade,
    engine.turbine.capacityUpgrade,
    engine.turbine.efficiencyUpgrade,
  ]

  return tracks.reduce((total, track) => total + track.level, 0)
}

/**
 * A check that a value sits within a tolerance of the figure specs.md quotes.
 * @param name - What is being checked
 * @param got - The value the engine produced
 * @param expected - The value specs.md quotes
 * @param tolerance - How far apart the two may be
 * @returns The check
 */
function near(name: string, got: number, expected: number, tolerance: number): Check {
  return {
    name: name,
    got: got.toFixed(4),
    expected: expected.toString(),
    passed: Math.abs(got - expected) <= tolerance,
  }
}

/**
 * A check that a value never rises above a limit.
 * @param name - What is being checked
 * @param got - The value the engine produced
 * @param limit - The highest value that holds
 * @returns The check
 */
function atMost(name: string, got: number, limit: number): Check {
  return {
    name: name,
    got: got.toFixed(4),
    expected: `<= ${limit}`,
    passed: got <= limit,
  }
}

/**
 * A check on something that either happened or did not.
 * @param name - What is being checked
 * @param got - What the engine reported
 * @param expected - What specs.md requires
 * @returns The check
 */
function exact(name: string, got: string, expected: string): Check {
  return {
    name: name,
    got: got,
    expected: expected,
    passed: got === expected,
  }
}

/**
 * A check against a figure specs.md prints to two decimals.
 * @param name - What is being checked
 * @param got - The value the engine produced
 * @param expected - The value specs.md quotes
 * @returns The check
 */
function opening(name: string, got: number, expected: number): Check {
  const tolerance = Math.max(OPENING_TOLERANCE_FLOOR, Math.abs(expected) * OPENING_TOLERANCE_FRACTION)
  return near(name, got, expected, tolerance)
}

/**
 * A fresh engine whose buffers have been placed by hand.
 * @param siloFill - Silo fill fraction
 * @param tankFill - Tank fill fraction
 * @returns An engine that has not been stepped
 */
function stateWith(siloFill: number, tankFill: number): GameEngine {
  const engine = new GameEngine(STATIC_SEED)

  engine.silo.contents = engine.silo.capacity * siloFill
  engine.tank.contents = engine.tank.capacity * tankFill
  return engine
}

/**
 * The 15 opening rows of specs.md, at the starting Setting of 0.6.
 * Every store starts empty, so the Pulverizer and Boiler open with no backlog while the
 * Turbine opens at full Starve — which is why its Vibration begins above SafeVibration.
 * @returns The group
 */
function openingGroup(): CheckGroup {
  const engine = new GameEngine(STATIC_SEED)
  const pulverizerStrain = engine.pulverizerStrain
  const boilerStrain = engine.boilerStrain
  const turbineStrain = engine.turbineStrain

  return {
    title: 'OPENING STATE vs docs/specs.md',
    notes: [],
    checks: [
      opening('Pulverizer Output', engine.pulverizer.pulverizedOutput, 4.8),
      opening('Pulverizer raw draw', engine.pulverizer.rawCoalConsumption, 5.05),
      opening('Pulverizer power', engine.pulverizer.electricConsumption, 0.69),
      opening('Boiler Output', engine.boiler.steamOutput, 30),
      opening('Boiler fuel draw', engine.boiler.fuelConsumption, 4.29),
      opening('Boiler power', engine.boiler.electricConsumption, 4.29),
      opening('Turbine Output', engine.turbine.powerOutput, 30),
      opening('Turbine steam draw', engine.turbine.steamConsumption, 26.57),
      opening('Pulverizer Strain', pulverizerStrain, 0),
      opening('Boiler Strain', boilerStrain, 0),
      opening('Turbine Strain', turbineStrain, 1.25),
      opening('Temperature', engine.pulverizer.stress(pulverizerStrain), 66),
      opening('Pressure', engine.boiler.stress(boilerStrain), 84.8),
      opening('Vibration', engine.turbine.stress(turbineStrain), 9.1),
      opening('MinimumReserve', engine.minimumReserve, 1),
    ],
  }
}

/**
 * The clean ceilings specs.md quotes, with a slack store and at full strain.
 * No single state strains all three: the Boiler needs a full Tank and the Turbine an
 * empty one, so each machine is put at full strain in a state of its own.
 * @returns The group
 */
function ceilingGroup(): CheckGroup {
  const slack = stateWith(SLACK_FILL, SLACK_FILL)
  const siloFull = stateWith(1, SLACK_FILL)
  const tankFull = stateWith(SLACK_FILL, 1)
  const tankEmpty = stateWith(SLACK_FILL, 0)

  return {
    title: 'CLEAN CEILINGS vs docs/specs.md',
    notes: [],
    checks: [
      near('Pulverizer ceiling slack', slack.pulverizer.cleanCeiling(slack.pulverizerStrain), 0.667, CEILING_TOLERANCE),
      near('Pulverizer ceiling strained', siloFull.pulverizer.cleanCeiling(siloFull.pulverizerStrain), 0.296, CEILING_TOLERANCE),
      near('Boiler ceiling slack', slack.boiler.cleanCeiling(slack.boilerStrain), 0.694, CEILING_TOLERANCE),
      near('Boiler ceiling strained', tankFull.boiler.cleanCeiling(tankFull.boilerStrain), 0.309, CEILING_TOLERANCE),
      near('Turbine ceiling slack', slack.turbine.cleanCeiling(slack.turbineStrain), 0.833, CEILING_TOLERANCE),
      near('Turbine ceiling strained', tankEmpty.turbine.cleanCeiling(tankEmpty.turbineStrain), 0.37, CEILING_TOLERANCE),
    ],
  }
}

/**
 * Each machine must still reach exactly its MaxStress at MaxSetting with a slack store.
 * @returns The group
 */
function maxStressGroup(): CheckGroup {
  const engine = stateWith(SLACK_FILL, SLACK_FILL)

  engine.setSettingSteps('pulverizer', MAX_SETTING_STEPS)
  engine.setSettingSteps('boiler', MAX_SETTING_STEPS)
  engine.setSettingSteps('turbine', MAX_SETTING_STEPS)

  return {
    title: 'MAX STRESS AT MaxSetting (slack store)',
    notes: [],
    checks: [
      near('Pulverizer at MaxSetting', engine.pulverizer.stress(engine.pulverizerStrain), 150, MAX_STRESS_TOLERANCE),
      near('Boiler at MaxSetting', engine.boiler.stress(engine.boilerStrain), 236, MAX_STRESS_TOLERANCE),
      near('Turbine at MaxSetting', engine.turbine.stress(engine.turbineStrain), 13, MAX_STRESS_TOLERANCE),
    ],
  }
}

/**
 * Everything generated must end up banked, drawn by a machine, spent on coal, or spent
 * on an upgrade. A non-zero residual means the engine is inventing or losing energy.
 * This is a property of the engine, not of any policy, so a fixed script drives it.
 * @returns The group
 */
function balanceGroup(): CheckGroup {
  const result = runScript(BALANCE_SEED, BALANCE_STEP_SECONDS)
  const ledger = result.engine.ledger
  const supplied = STARTING_CHARGE + ledger.generated
  const accounted = result.engine.battery.contents + ledger.machineUse + ledger.coalCost + ledger.upgradeSpend

  return {
    title: 'ENERGY BALANCE',
    notes: [
      `in  : start ${STARTING_CHARGE.toFixed(2)} + stored ${ledger.generated.toFixed(2)}`
        + ` = ${supplied.toFixed(2)} MWh`,
      `out : final ${result.engine.battery.contents.toFixed(2)} + machines ${ledger.machineUse.toFixed(2)}`
        + ` + coal ${ledger.coalCost.toFixed(2)} + upgrades ${ledger.upgradeSpend.toFixed(2)}`
        + ` = ${accounted.toFixed(2)} MWh`,
      `(discarded by a full Battery: ${ledger.discarded.toFixed(2)} MWh)`,
    ],
    checks: [near('residual', result.residual, 0, RESIDUAL_TOLERANCE)],
  }
}

/**
 * Runs every convergence seed at one step size.
 * @param deltaSeconds - The step size to run at
 * @returns What that step size produced
 */
function summarizeStep(deltaSeconds: number): StepSummary {
  const runs: ScriptedRunResult[] = []

  for (let seed = 0; seed < CONVERGENCE_SEEDS; seed += 1) {
    runs.push(runScript(seed, deltaSeconds))
  }

  return {
    deltaSeconds: deltaSeconds,
    medianPeak: median(runs.map(run => run.engine.ledger.peakContents)),
    medianGenerated: median(runs.map(run => run.engine.ledger.generated)),
    medianMachineUse: median(runs.map(run => run.engine.ledger.machineUse)),
    meanUpgradeLevels: mean(runs.map(run => totalUpgradeLevels(run.engine))),
  }
}

/**
 * @param summary - The step size to describe
 * @returns One reported line of the convergence table
 */
function summaryNote(summary: StepSummary): string {
  return `dt=${summary.deltaSeconds.toFixed(2)}`
    + `  generated ${summary.medianGenerated.toFixed(3).padStart(8)}`
    + `  machines ${summary.medianMachineUse.toFixed(3).padStart(8)}`
    + `  peak ${summary.medianPeak.toFixed(3).padStart(8)}`
    + `  levels ${summary.meanUpgradeLevels.toFixed(2).padStart(6)}`
}

/**
 * Results must not depend on DeltaTimeSeconds. What converges is the continuous flow of
 * the run: peak stored energy and the count of upgrades bought are reported but not
 * asserted, because this script banks nothing above its opening charge and makes only
 * about sixteen discrete purchases, so one purchase landing a second earlier moves the
 * count by six percent — see docs/plan.md, Stage 3.
 * @returns The group
 */
function convergenceGroup(): CheckGroup {
  const contrast = summarizeStep(CONTRAST_STEP)
  const fine = CONVERGENCE_STEPS.map(summarizeStep)
  const notes = [
    contrast,
    ...fine,
  ].map(summaryNote)

  notes.push('(peak and levels are reported, not asserted — see docs/plan.md, Stage 3)')
  return {
    title: 'STEP-SIZE CONVERGENCE',
    notes: notes,
    checks: [
      atMost('generated spread, dt<=0.2', relativeSpread(fine.map(summary => summary.medianGenerated)), CONVERGENCE_TOLERANCE),
      atMost('machine spread, dt<=0.2', relativeSpread(fine.map(summary => summary.medianMachineUse)), CONVERGENCE_TOLERANCE),
    ],
  }
}

/**
 * MinimumReserve must never sit below what a restart costs, or a player could spend down
 * to the reserve and find no coal affordable at any price.
 * @returns The group
 */
function restartFloorGroup(): CheckGroup {
  let worst = Number.NEGATIVE_INFINITY

  for (let seed = 0; seed < RESTART_SEEDS; seed += 1) {
    worst = Math.max(worst, runScript(seed, RESTART_STEP_SECONDS).worstReserveGap)
  }

  return {
    title: 'RESTART FLOOR (MinimumReserve must never sit below a restart)',
    notes: [],
    checks: [atMost('max startup - reserve', worst, 0)],
  }
}

/**
 * The stall rule, asserted directly rather than played out: reaching the all-empty state
 * through play is a knife edge, and the property under test is the rule, not its
 * reachability. A machine with no input runs at RunRatio 0 and draws no electricity, so
 * a plant left to idle times out rather than stalling.
 * @returns The group
 */
function stallGroup(): CheckGroup {
  const empty = new GameEngine(STATIC_SEED)
  const withSteam = new GameEngine(STATIC_SEED)

  empty.battery.contents = 0
  empty.start()
  empty.step(DELTA_TIME_SECONDS)

  withSteam.battery.contents = 0
  withSteam.tank.contents = 1
  withSteam.start()
  withSteam.step(DELTA_TIME_SECONDS)

  return {
    title: 'STALLING vs docs/specs.md',
    notes: [],
    checks: [
      exact('every store empty stalls', empty.outcome, 'stalled'),
      exact('a kilogram of steam does not', withSteam.outcome, 'running'),
    ],
  }
}

/**
 * The price is the trend and nothing but the trend: it opens at StartPrice, compounds
 * by PriceGrowth every minute, and only ever rises.
 * @returns The group
 */
function marketGroup(): CheckGroup {
  const coalMarket = new CoalMarket()
  const openingPrice = coalMarket.price
  const closingPrice = MARKET.startPrice * MARKET.priceGrowth ** (TIME_LIMIT / SECONDS_PER_MINUTE)
  let rose = true
  let previous = openingPrice

  while (coalMarket.elapsedSeconds < TIME_LIMIT) {
    coalMarket.step(DELTA_TIME_SECONDS)
    rose &&= coalMarket.price > previous
    previous = coalMarket.price
  }

  return {
    title: 'MARKET TREND',
    notes: [],
    checks: [
      near('opening price', openingPrice, MARKET.startPrice, PRICE_TOLERANCE),
      near('closing price', previous, closingPrice, PRICE_TOLERANCE),
      exact('rises every step', rose ? 'rising' : 'not rising', 'rising'),
    ],
  }
}

/**
 * @param check - The check to render
 * @returns Its line of the report
 */
function checkLine(check: Check): ReportLine {
  const status = check.passed ? 'ok  ' : 'FAIL'

  return {
    text: `${status} ${check.name.padEnd(NAME_WIDTH)} got ${check.got.padStart(VALUE_WIDTH)}  spec ${check.expected}`,
    failed: !check.passed,
  }
}

/**
 * Runs every check and lays the report out.
 * @returns The rendered groups and the closing verdict
 */
function buildReport(): {groups: {title: string,
  lines: ReportLine[]}[],
summary: string} {
  const groups = [
    openingGroup(),
    ceilingGroup(),
    maxStressGroup(),
    balanceGroup(),
    convergenceGroup(),
    restartFloorGroup(),
    stallGroup(),
    marketGroup(),
  ]
  const failed = groups.flatMap(group => group.checks.filter(check => !check.passed))

  return {
    groups: groups.map(group => ({
      title: group.title,
      lines: [
        ...group.notes.map(note => ({
          text: note,
          failed: false,
        })),
        ...group.checks.map(checkLine),
      ],
    })),
    summary: failed.length === 0 ? 'ALL CHECKS PASSED' : `FAILED: ${failed.map(check => check.name).join(', ')}`,
  }
}

const report = buildReport()
</script>

<style scoped>
.verify-screen {
    padding: var(--space-4);
}

.verify-screen__title,
.verify-screen__heading {
    height: var(--cell-height);
    font-size: inherit;
    font-weight: inherit;
    line-height: var(--cell-height);
    text-transform: uppercase;
}

.verify-screen__group {
    margin-top: var(--cell-height);
}

/* One character cell of indent, and no wrapping: the columns are padded text */
.verify-screen__line {
    height: var(--cell-height);
    padding-left: var(--cell-width);
    line-height: var(--cell-height);
    white-space: pre;
}

/* Inverted rather than dimmed, so a failure is not signalled by brightness (ui_ux.md §28) */
.verify-screen__line--failed {
    background: var(--fg);
    color: var(--bg);
}

.verify-screen__summary {
    height: var(--cell-height);
    margin-top: var(--cell-height);
    line-height: var(--cell-height);
}
</style>
