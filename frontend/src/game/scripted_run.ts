import {STARTING_CHARGE} from '@/game/constants'
import {GameEngine} from '@/game/game_engine'
import type {UpgradeTrackId} from '@/game/types'

const ACTION_INTERVAL_SECONDS = 1 // How often the script acts on the plant
const UPGRADE_INTERVAL_SECONDS = 12 // How often it attempts one upgrade

/**
 * Every upgrade track, in the fixed order the script cycles through them.
 * The order is deliberately lopsided rather than balanced: it climbs the chain from the
 * Stockpile down, so the plant spends the run drifting in and out of step with itself.
 * That is what puts the stores against both their thresholds and the machines into wear,
 * which a tidy round-robin never would.
 */
const UPGRADE_TRACKS: UpgradeTrackId[] = [
  'pulverizer_flow',
  'pulverizer_flow',
  'silo_flow',
  'boiler_flow',
  'tank_flow',
  'turbine_flow',
  'battery_flow',
  'stockpile_capacity',
  'stockpile_flow',
  'silo_capacity',
  'tank_capacity',
  'battery_capacity',
  'pulverizer_efficiency',
  'boiler_efficiency',
  'turbine_efficiency',
  'pulverizer_tolerance',
  'boiler_tolerance',
  'turbine_tolerance',
]

/** What one scripted run leaves behind for the verification screen to assert on. */
export interface ScriptedRunResult {
  engine: GameEngine // The engine as the run left it
  residual: number // Energy in minus energy out, MWh; conservation requires 0
  worstReserveGap: number // Largest StartupEnergy − MinimumReserve seen; must be <= 0
}

/**
 * Plays a fixed script against a fresh engine until the run ends.
 * The script is not a strategy and makes no attempt to play well — simulator/sim.py owns
 * the greedy policy, and the player owns the real one. This is a fixture: a deterministic
 * input sequence that touches coal purchases and all seventeen upgrade tracks, in an order
 * that deliberately runs the chain out of step, so that properties which must hold under
 * *any* input can be asserted against one reproducible run.
 *
 * There is nothing here that moves a machine, because there is nothing to move: machines
 * have no operating control, so a run is the purchases and their timing and nothing else.
 * Passing `upgrades: false` buys coal and nothing else, which holds the plant at its
 * opening configuration for the whole run. That is the only version whose output is a
 * pure function of the rules: with no throttle, no single purchase raises the chain's
 * rate — only a whole round does — so a buying run's totals move with when each purchase
 * happens to land, and a step-size check run against one would be measuring that instead
 * of the engine.
 * @param seed - Seed for the run; no rule draws from it while every rule is deterministic
 * @param deltaSeconds - Length of each simulation step
 * @param upgrades - Whether to buy upgrades at all
 * @returns The finished engine and the figures the conservation checks read
 */
export function runScript(seed: number, deltaSeconds: number, upgrades = true): ScriptedRunResult {
  const engine = new GameEngine(seed)
  let worstReserveGap = engine.startupEnergy - engine.minimumReserve
  let nextActionSeconds = 0
  let nextUpgradeSeconds = 0
  let trackIndex = 0

  engine.start()

  while (engine.outcome === 'running') {
    if (engine.elapsedSeconds >= nextActionSeconds) {
      // Ask for a full Stockpile; the engine reduces it to what CoalBudget covers
      engine.buyCoal(engine.stockpile.capacity - engine.stockpile.contents)

      if (upgrades && engine.elapsedSeconds >= nextUpgradeSeconds) {
        const track = UPGRADE_TRACKS[trackIndex]

        // A track the run cannot afford is skipped; the cycle advances either way
        if (track !== undefined) {
          engine.purchaseUpgrade(track)
        }

        trackIndex = (trackIndex + 1) % UPGRADE_TRACKS.length
        nextUpgradeSeconds += UPGRADE_INTERVAL_SECONDS
      }

      nextActionSeconds += ACTION_INTERVAL_SECONDS
    }

    engine.step(deltaSeconds)
    worstReserveGap = Math.max(worstReserveGap, engine.startupEnergy - engine.minimumReserve)
  }

  // Every MWh that entered the run must be banked, drawn by a machine, or spent
  const accounted = engine.battery.contents + engine.ledger.machineUse
    + engine.ledger.coalCost + engine.ledger.upgradeSpend

  return {
    engine: engine,
    residual: STARTING_CHARGE + engine.ledger.generated - accounted,
    worstReserveGap: worstReserveGap,
  }
}
