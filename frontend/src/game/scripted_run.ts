import {STARTING_CHARGE} from '@/game/constants'
import {GameEngine} from '@/game/game_engine'
import type {MachineId, UpgradeTrackId} from '@/game/types'

const ACTION_INTERVAL_SECONDS = 1 // How often the script acts on the plant
const UPGRADE_INTERVAL_SECONDS = 30 // How often it attempts one upgrade

/** The three machines, in chain order. */
const MACHINES: MachineId[] = [
  'pulverizer',
  'boiler',
  'turbine',
]

/** Every upgrade track, in the fixed order the script cycles through them. */
const UPGRADE_TRACKS: UpgradeTrackId[] = [
  'pulverizer_capacity',
  'boiler_capacity',
  'turbine_capacity',
  'stockpile_capacity',
  'silo_capacity',
  'tank_capacity',
  'battery_capacity',
  'pulverizer_efficiency',
  'boiler_efficiency',
  'turbine_efficiency',
]

/** The Setting changes the script makes, in the order they fire. */
const SETTING_CHANGES = [
  {
    atSeconds: 0,
    settingSteps: 6, // 0.6, where every run opens
  },
  {
    atSeconds: 120,
    settingSteps: 18, // 1.8, deep in the wear band: exercises trips and repairs
  },
  {
    atSeconds: 300,
    settingSteps: 4, // 0.4, below every clean ceiling: exercises wear recovery
  },
] as const

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
 * input sequence that touches coal purchases, all ten upgrade tracks, Settings deep in the
 * wear band and Settings back below the clean ceilings, so that properties which must hold
 * under *any* input can be asserted against one reproducible run.
 * @param seed - Seed for the run's coal market
 * @param deltaSeconds - Length of each simulation step
 * @returns The finished engine and the figures the conservation checks read
 */
export function runScript(seed: number, deltaSeconds: number): ScriptedRunResult {
  const engine = new GameEngine(seed)
  let worstReserveGap = engine.startupEnergy - engine.minimumReserve
  let nextActionSeconds = 0
  let nextUpgradeSeconds = 0
  let changeIndex = 0
  let trackIndex = 0

  engine.start()

  while (engine.outcome === 'running') {
    if (engine.elapsedSeconds >= nextActionSeconds) {
      const change = SETTING_CHANGES[changeIndex]

      // Settings move first, so the purchase and the upgrade below see the new draw
      if (change !== undefined && engine.elapsedSeconds >= change.atSeconds) {
        for (const machine of MACHINES) {
          engine.setSettingSteps(machine, change.settingSteps)
        }

        changeIndex += 1
      }

      // Ask for a full Stockpile; the engine reduces it to what CoalBudget covers
      engine.buyCoal(engine.stockpile.capacity - engine.stockpile.contents)

      if (engine.elapsedSeconds >= nextUpgradeSeconds) {
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
