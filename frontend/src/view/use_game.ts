import type {ShallowRef} from 'vue'
import {onMounted, onUnmounted, shallowRef} from 'vue'
import {DELTA_TIME_SECONDS} from '@/game/constants'
import {GameEngine} from '@/game/game_engine'
import type {Machine} from '@/game/machine'
import type {MachineId, UpgradeTrackId} from '@/game/types'
import type {GameView} from '@/view/view_model'
import {buildGameView} from '@/view/view_model'

// Real time is consumed in whole DeltaTimeSeconds steps, and never more than this in one
// frame. Past the clamp the run simply loses the time: a browser that stalls for a second
// must not answer with twenty steps in a row, which would stall it again (docs/plan.md).
const MAX_CATCH_UP_SECONDS = 0.25
const MILLISECONDS_PER_SECOND = 1000

const COAL_PURCHASE_STEP_KILOGRAMS = 100 // 0.1 t per press of the stepper
const BEST_RESULT_KEY = 'overpowered.best_result'
const SEED_RANGE = 2 ** 32

/** The game, as a component sees it: one view model and the intents it can report. */
export interface Game {
  view: ShallowRef<GameView>
  startRun: () => void
  newRun: () => void
  stepSetting: (machine: MachineId, direction: number) => void
  stepPurchaseAmount: (direction: number) => void
  fillPurchaseAmount: () => void
  buyCoal: () => void
  purchaseUpgrade: (track: UpgradeTrackId) => void
}

/**
 * @returns A seed for a fresh run's coal market; never shown to the player
 */
function newSeed(): number {
  return Math.floor(Math.random() * SEED_RANGE)
}

/**
 * @returns The best result of any previous run, MWh, or null when there is none
 */
function readBestResult(): number | null {
  const stored = window.localStorage.getItem(BEST_RESULT_KEY)

  if (stored === null) {
    return null
  }

  const value = Number(stored)

  return Number.isFinite(value) ? value : null
}

/**
 * Drives one game: it owns the engine, the clock, and the state that belongs to the
 * interface rather than to the rules. The engine is stepped at a fixed DeltaTimeSeconds
 * off requestAnimationFrame, and the view model is rebuilt once per frame rather than
 * once per step — a slow frame must cost several steps, not several renders.
 * @returns The view model and every action a component can take
 */
export function useGame(): Game {
  let engine = new GameEngine(newSeed())
  let bestResult = readBestResult()
  let purchaseKilograms = 0
  let frameHandle = 0 // requestAnimationFrame handle, 0 while the loop is stopped
  let lastFrameMilliseconds = 0
  let accumulatedSeconds = 0 // Real time not yet consumed as whole steps
  const view = shallowRef(buildGameView(engine, purchaseKilograms, bestResult))

  /**
   * Publishes the engine's current state. The only place view.value is assigned.
   */
  function refresh(): void {
    view.value = buildGameView(engine, purchaseKilograms, bestResult)
  }

  /**
   * @param machine - The machine to look up
   * @returns The machine itself
   */
  function machineOf(machine: MachineId): Machine {
    switch (machine) {
      case 'pulverizer':
        return engine.pulverizer
      case 'boiler':
        return engine.boiler
      case 'turbine':
        return engine.turbine
    }
  }

  /**
   * Moves the coal stepper, never past what the Stockpile has room for.
   * @param kilograms - The amount asked for
   */
  function setPurchaseAmount(kilograms: number): void {
    const room = engine.stockpile.capacity - engine.stockpile.contents

    purchaseKilograms = Math.max(0, Math.min(kilograms, room))
  }

  /**
   * Records the run's peak against the best result, once the run is over.
   */
  function recordBestResult(): void {
    const peak = engine.ledger.peakContents

    if (bestResult !== null && peak <= bestResult) {
      return
    }

    bestResult = peak
    window.localStorage.setItem(BEST_RESULT_KEY, peak.toString())
  }

  /**
   * Stops scheduling frames. Safe to call when no loop is running.
   */
  function stopLoop(): void {
    if (frameHandle !== 0) {
      window.cancelAnimationFrame(frameHandle)
      frameHandle = 0
    }
  }

  /**
   * Consumes the time since the last frame, then publishes the result.
   * @param nowMilliseconds - The frame's timestamp
   */
  function onFrame(nowMilliseconds: number): void {
    accumulatedSeconds = Math.min(
      accumulatedSeconds + (nowMilliseconds - lastFrameMilliseconds) / MILLISECONDS_PER_SECOND,
      MAX_CATCH_UP_SECONDS,
    )
    lastFrameMilliseconds = nowMilliseconds

    while (accumulatedSeconds >= DELTA_TIME_SECONDS && engine.outcome === 'running') {
      engine.step(DELTA_TIME_SECONDS)
      accumulatedSeconds -= DELTA_TIME_SECONDS
    }

    if (engine.outcome === 'running') {
      frameHandle = window.requestAnimationFrame(onFrame)
    } else {
      frameHandle = 0
      recordBestResult()
    }

    refresh()
  }

  /**
   * Starts scheduling frames, from now rather than from whenever the last one was.
   */
  function startLoop(): void {
    if (frameHandle !== 0 || engine.outcome !== 'running' || document.hidden) {
      return
    }

    lastFrameMilliseconds = window.performance.now()
    accumulatedSeconds = 0
    frameHandle = window.requestAnimationFrame(onFrame)
  }

  /**
   * Pauses the run while the tab is hidden. An unattended tab must not burn the clock,
   * and the accumulator is dropped so returning does not pay for the time away.
   */
  function onVisibilityChange(): void {
    if (document.hidden) {
      stopLoop()
      accumulatedSeconds = 0
    } else {
      startLoop()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    stopLoop()
  })

  return {
    view: view,
    startRun: (): void => {
      engine.start()
      startLoop()
      refresh()
    },
    newRun: (): void => {
      stopLoop()
      engine = new GameEngine(newSeed())
      purchaseKilograms = 0
      refresh()
    },
    stepSetting: (machine: MachineId, direction: number): void => {
      engine.setSettingSteps(machine, machineOf(machine).settingSteps + direction)
      refresh()
    },
    stepPurchaseAmount: (direction: number): void => {
      setPurchaseAmount(purchaseKilograms + direction * COAL_PURCHASE_STEP_KILOGRAMS)
      refresh()
    },
    fillPurchaseAmount: (): void => {
      const room = engine.stockpile.capacity - engine.stockpile.contents

      setPurchaseAmount(Math.min(room, engine.coalBudget / engine.market.pricePerKilogram))
      refresh()
    },
    buyCoal: (): void => {
      engine.buyCoal(purchaseKilograms)
      setPurchaseAmount(purchaseKilograms)
      refresh()
    },
    purchaseUpgrade: (track: UpgradeTrackId): void => {
      engine.purchaseUpgrade(track)
      refresh()
    },
  }
}
