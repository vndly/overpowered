import {shallowRef} from 'vue'
import type {ShallowRef} from 'vue'
import type {Level} from '@/game/level'
import {Match} from '@/game/match'
import type {MatchStatus} from '@/game/match'
import {MatchLoop} from '@/game/match_loop'
import {Tween} from '@/game/render/tween'
import {TUNABLES} from '@/game/tunables'

/**
 * Everything the HUD is allowed to see. A plain object written once per rendered
 * frame, so a hundred-cell board carries no reactive proxy overhead and the sim
 * stays deterministic.
 */
export interface MatchSnapshot {
  status: MatchStatus
  paused: boolean
  storedEnergy: number // Tweened, so the numeral is seen to move
  goal: number
  remainingSeconds: number // Never tweened: the clock reads true
  requiredPace: number
  actualPace: number
}

export interface MatchController {
  snapshot: Readonly<ShallowRef<MatchSnapshot>>
  match: Readonly<ShallowRef<Match>>
  start: () => void
  stop: () => void
  setPaused: (paused: boolean) => void
  togglePause: () => void
  restart: () => void
}

/**
 * Owns the Match and its loop, and publishes the HUD snapshot.
 * This is the whole of the boundary between the simulation and Vue: below it
 * nothing knows Vue exists, and above it nothing observes the sim.
 * @param level - The level to play
 * @param renderFrame - Draws the board, called once per rendered frame
 * @returns The snapshot, the live match, and the actions the screen offers
 */
export function useMatch(level: Level, renderFrame: () => void): MatchController {
  const match = shallowRef(new Match(level))
  const storedEnergyTween = new Tween(level.startingEnergy, TUNABLES.motion.hudTweenSeconds)
  const requiredPaceTween = new Tween(0, TUNABLES.motion.hudTweenSeconds)
  const actualPaceTween = new Tween(0, TUNABLES.motion.hudTweenSeconds)

  let loop: MatchLoop | null = null

  function readSnapshot(): MatchSnapshot {
    return {
      status: match.value.status,
      paused: loop?.paused ?? false,
      storedEnergy: storedEnergyTween.value,
      goal: match.value.level.goal,
      remainingSeconds: match.value.remainingSeconds,
      requiredPace: requiredPaceTween.value,
      actualPace: actualPaceTween.value,
    }
  }

  // Opened on its true values, so the HUD never eases up from a zero it was
  // never actually showing
  snapTweens()

  const snapshot = shallowRef<MatchSnapshot>(readSnapshot())

  /**
   * A shallowRef fires on reference inequality, so a fresh object every frame
   * would re-render the HUD sixty times a second while paused or on an end
   * screen, where nothing moves at all.
   * @param next - The snapshot just read
   * @returns Whether any field actually differs from what the HUD is showing
   */
  function differsFromPublished(next: MatchSnapshot): boolean {
    const published = snapshot.value

    return next.status !== published.status
      || next.paused !== published.paused
      || next.storedEnergy !== published.storedEnergy
      || next.goal !== published.goal
      || next.remainingSeconds !== published.remainingSeconds
      || next.requiredPace !== published.requiredPace
      || next.actualPace !== published.actualPace
  }

  /** A match opens on its true values, with nothing to ease from. */
  function snapTweens(): void {
    storedEnergyTween.snapTo(match.value.storedEnergy)
    requiredPaceTween.snapTo(match.value.requiredPace)
    actualPaceTween.snapTo(match.value.actualPace)
  }

  function publish(deltaSeconds: number): void {
    storedEnergyTween.target = match.value.storedEnergy
    requiredPaceTween.target = match.value.requiredPace
    actualPaceTween.target = match.value.actualPace

    storedEnergyTween.advance(deltaSeconds)
    requiredPaceTween.advance(deltaSeconds)
    actualPaceTween.advance(deltaSeconds)

    const next = readSnapshot()

    if (differsFromPublished(next)) {
      snapshot.value = next
    }
  }

  function onFrame(deltaSeconds: number): void {
    renderFrame()
    publish(deltaSeconds)
  }

  function runLoop(): void {
    loop = new MatchLoop(match.value, onFrame)
    loop.start()
  }

  return {
    snapshot: snapshot,
    match: match,

    start: (): void => {
      runLoop()
    },

    stop: (): void => {
      loop?.stop()
      loop = null
    },

    setPaused: (paused: boolean): void => {
      if (loop === null) {
        return
      }

      if (paused) {
        loop.pause()
      } else {
        loop.resume()
      }

      publish(0)
    },

    togglePause: (): void => {
      if (loop === null || match.value.isOver) {
        return
      }

      if (loop.paused) {
        loop.resume()
      } else {
        loop.pause()
      }

      publish(0)
    },

    restart: (): void => {
      // The loop holds its Match for the life of the match, so a restart
      // replaces both rather than resetting either
      loop?.stop()
      match.value = new Match(level)
      snapTweens()
      runLoop()
      publish(0)
    },
  }
}
