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
import {BACKLOG_THRESHOLD, DELTA_TIME_SECONDS, MARKET, SECONDS_PER_MINUTE, STARTING_CHARGE, STARVE_THRESHOLD, STRAIN_GAIN, TIME_LIMIT} from '@/game/constants'
import {GameEngine} from '@/game/game_engine'
import type {ScriptedRunResult} from '@/game/scripted_run'
import {runScript} from '@/game/scripted_run'

const NAME_WIDTH = 30 // Widest check name, so the got and spec columns line up
const VALUE_WIDTH = 10

// specs.md quotes its opening figures to two decimals, so a check is only as tight as
// the printed value: half of the last digit, or 0.2% for the larger numbers.
const OPENING_TOLERANCE_FLOOR = 0.005
const OPENING_TOLERANCE_FRACTION = 0.002
const ONSET_TOLERANCE = 0.002
const FULL_STRAIN_TOLERANCE = 0.05
const MATCH_TOLERANCE = 0.001
const BACKLOG_TOLERANCE = 0.005
const RESIDUAL_TOLERANCE = 1e-6
const CONVERGENCE_TOLERANCE = 0.06

// The closing price is reached by 600 s of compounding steps rather than by one
// exponent, so it is only as exact as the accumulated floating point allows.
const PRICE_TOLERANCE = 1e-6

const STATIC_SEED = 0 // The static checks read a state, never a run
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
 * The opening rows of specs.md.
 * Every machine runs at its Capacity, and the Tank opens at StarveThreshold, so no
 * machine opens under any strain at all — the run starts matched and clean.
 * @returns The group
 */
function openingGroup(): CheckGroup {
  const engine = new GameEngine(STATIC_SEED)
  const pulverizerStrain = engine.pulverizerStrain.value
  const boilerStrain = engine.boilerStrain.value
  const turbineStrain = engine.turbineStrain.value
  const netFlow = engine.turbine.powerOutput
    - engine.pulverizer.electricConsumption - engine.boiler.electricConsumption

  return {
    title: 'OPENING STATE vs docs/specs.md',
    notes: [],
    checks: [
      opening('Pulverizer Output', engine.pulverizer.pulverizedOutput, 4),
      opening('Pulverizer raw draw', engine.pulverizer.rawCoalConsumption, 4.21),
      opening('Pulverizer power', engine.pulverizer.electricConsumption, 0.57),
      opening('Boiler Output', engine.boiler.steamOutput, 21),
      opening('Boiler fuel draw', engine.boiler.fuelConsumption, 3),
      opening('Boiler power', engine.boiler.electricConsumption, 3),
      opening('Turbine Output', engine.turbine.powerOutput, 23.7),
      opening('Turbine steam draw', engine.turbine.steamConsumption, 20.99),
      opening('Pulverizer Strain', pulverizerStrain, 0),
      opening('Boiler Strain', boilerStrain, 0),
      opening('Turbine Strain', turbineStrain, 0),
      opening('Temperature', engine.pulverizer.stress(pulverizerStrain), 70),
      opening('Pressure', engine.boiler.stress(boilerStrain), 100),
      opening('Vibration', engine.turbine.stress(turbineStrain), 5),
      opening('NetFlow', netFlow, 20.13),
      opening('MinimumReserve', engine.minimumReserve, 1),
    ],
  }
}

/**
 * The Pulverizer runs a third ahead of the Boiler's draw on purpose, so the Silo gains a
 * kilogram a second and backs up about seventy seconds in — the run's first decision. The
 * Boiler is matched to the Turbine, so there is exactly one problem on screen rather than
 * three. See specs.md §The opening imbalance.
 * @returns The group
 */
function matchedGroup(): CheckGroup {
  const engine = new GameEngine(STATIC_SEED)
  const powderSurplus = engine.pulverizer.pulverizedOutput / engine.boiler.fuelConsumption - 1
  const steamSurplus = engine.boiler.steamOutput / engine.turbine.steamConsumption - 1
  const surplusRate = engine.pulverizer.pulverizedOutput - engine.boiler.fuelConsumption

  return {
    title: 'THE OPENING IMBALANCE (surplus over the stage below)',
    notes: [],
    checks: [
      near('Pulverizer over Boiler draw', powderSurplus, 1 / 3, BACKLOG_TOLERANCE),
      near('Boiler vs Turbine draw', steamSurplus, 0, MATCH_TOLERANCE),
      near('seconds to Silo backlog',
        BACKLOG_THRESHOLD * engine.silo.capacity / surplusRate, 70, 1),
    ],
  }
}

/**
 * Every store's Flow must carry what passes through it at the opening, and the two
 * contended stores must carry it twice over — specs.md §Storage flow.
 * @returns The group
 */
function flowGroup(): CheckGroup {
  const engine = new GameEngine(STATIC_SEED)
  const demands: [string, number, number][] = [
    [
      'Stockpile delivery',
      engine.stockpile.flow,
      engine.pulverizer.rawCoalConsumption,
    ],
    [
      'Silo contended',
      engine.silo.flow,
      engine.pulverizer.pulverizedOutput + engine.boiler.fuelConsumption,
    ],
    [
      'Tank contended',
      engine.tank.flow,
      engine.boiler.steamOutput + engine.turbine.steamConsumption,
    ],
    [
      'Battery charge',
      engine.battery.flow,
      engine.turbine.powerOutput,
    ],
  ]

  return {
    title: 'FLOW HEADROOM AT THE OPENING (multiple of what passes through)',
    notes: [],
    checks: demands.map(([
      name,
      flow,
      demand,
    ]) => {
      const ratio = flow / demand

      return {
        name: name,
        got: ratio.toFixed(3),
        expected: '>= 1',
        passed: ratio >= 1,
      }
    }),
  }
}

/**
 * The store fill at which each machine's stress reaches SafeStress and wear begins.
 * With no throttle, Strain is the only term that raises stress, so this fill is the whole
 * of what "running clean" means — specs.md §Buffers and strain.
 * @param machine - The machine's nominal stress and its SafeStress
 * @returns The fill its pressure reaches SafeStress at
 */
function onsetPressure(nominalStress: number, safeStress: number): number {
  return (safeStress / nominalStress - 1) / STRAIN_GAIN
}

/**
 * @returns The group
 */
function onsetGroup(): CheckGroup {
  const engine = new GameEngine(STATIC_SEED)
  const backlogFill = (pressure: number): number =>
    BACKLOG_THRESHOLD + pressure * (1 - BACKLOG_THRESHOLD)
  const starveFill = (pressure: number): number => STARVE_THRESHOLD * (1 - pressure)

  return {
    title: 'WEAR ONSET vs docs/specs.md (store fill where wear begins)',
    notes: [],
    checks: [
      near('Pulverizer above Silo',
        backlogFill(onsetPressure(engine.pulverizer.nominalStress, engine.pulverizer.safeStress)),
        0.751, ONSET_TOLERANCE),
      near('Boiler above Tank',
        backlogFill(onsetPressure(engine.boiler.nominalStress, engine.boiler.safeStress)),
        0.748, ONSET_TOLERANCE),
      near('Turbine below Tank',
        starveFill(onsetPressure(engine.turbine.nominalStress, engine.turbine.safeStress)),
        0.228, ONSET_TOLERANCE),
    ],
  }
}

/**
 * Stress at full strain, which is what a saturated store does to the machine beside it.
 * The Pulverizer reads past its own maximum and the gauge simply pegs there.
 * @returns The group
 */
function fullStrainGroup(): CheckGroup {
  const engine = new GameEngine(STATIC_SEED)

  return {
    title: 'STRESS AT FULL STRAIN',
    notes: [],
    checks: [
      near('Pulverizer at full strain', engine.pulverizer.stress(STRAIN_GAIN), 157.5, FULL_STRAIN_TOLERANCE),
      near('Boiler at full strain', engine.boiler.stress(STRAIN_GAIN), 225, FULL_STRAIN_TOLERANCE),
      near('Turbine at full strain', engine.turbine.stress(STRAIN_GAIN), 11.25, FULL_STRAIN_TOLERANCE),
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
function summarizeStep(deltaSeconds: number, upgrades: boolean): StepSummary {
  const runs: ScriptedRunResult[] = []

  for (let seed = 0; seed < CONVERGENCE_SEEDS; seed += 1) {
    runs.push(runScript(seed, deltaSeconds, upgrades))
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
 * @param deltaSeconds - The step size to run at
 * @param upgrades - Whether the runs buy upgrades
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
 * The engine's own property, and the only one this screen can assert: a plant held at one
 * configuration must produce the same energy however finely the run is stepped, because
 * the throughput of the chain is a rate rather than an artefact of the discretisation.
 *
 * A run that buys is deliberately not asserted. With no throttle, no single purchase
 * raises the chain's rate — only a whole round does — so income moves in steps and every
 * purchase shifts the ratios the next one is judged on. One marginal upgrade landing a
 * second earlier compounds for the rest of the run. That spread is reported below it, so
 * the size of the effect is on the screen rather than merely asserted away.
 * @returns The group
 */
function convergenceGroup(): CheckGroup {
  const steps = [
    CONTRAST_STEP,
    ...CONVERGENCE_STEPS,
  ]
  const held = steps.map(step => summarizeStep(step, false))
  const buying = steps.map(step => summarizeStep(step, true))
  const fine = held.slice(1)
  const notes = held.map(summaryNote)

  notes.push('(a plant that is never upgraded — the rates alone)')
  notes.push('')
  notes.push('the same script buying upgrades, reported and not asserted:')
  notes.push(...buying.map(summaryNote))
  notes.push(`  purchase-timing spread, dt<=0.2: ${(relativeSpread(buying.slice(1).map(summary => summary.medianGenerated)) * 100).toFixed(1)}%`)

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

  // Every store has to be emptied by hand now that the Tank opens at StarveThreshold
  // rather than empty (specs.md §Tank) — a run no longer starts one purchase away from
  // the stall condition, and the check has to build the state it is asserting on.
  empty.battery.contents = 0
  empty.tank.contents = 0
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
    matchedGroup(),
    flowGroup(),
    onsetGroup(),
    fullStrainGroup(),
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
