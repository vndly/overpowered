import type {ShallowRef} from 'vue'
import {shallowRef} from 'vue'

const OPTIONS_KEY = 'overpowered.options'

/** How the interface is drawn. None of this touches the plant (ui_ux.md §28). */
export interface DisplayOptions {
  crt: boolean // The CRT layer as a whole: the scanlines, and the glow with them
  glow: boolean // The text glow, drawn only while the CRT layer is on
  reducedAnimation: boolean // Stops the alert blink and the button transitions
}

/** Names one option, so a panel row can report which of them the player pressed. */
export type DisplayOptionId = keyof DisplayOptions

/** The options and the one thing that can be done to them. */
export interface OptionsControl {
  options: ShallowRef<DisplayOptions>
  toggle: (option: DisplayOptionId) => void
}

// What a player who has never opened the panel gets: the CRT terminal ui_ux.md §1 asks
// for, moving as much as it normally does
const DEFAULT_OPTIONS: DisplayOptions = {
  crt: true,
  glow: true,
  reducedAnimation: false,
}

/**
 * @param value - A field read back out of storage
 * @param fallback - What that field defaults to
 * @returns The stored value when it is a boolean, the default when it is anything else
 */
function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * @param text - Whatever was in the storage slot
 * @returns What it parses to, or null when it is not JSON at all
 */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Reads the stored options one field at a time, so a key an older build never wrote —
 * or a value something else left in the slot — costs that one field rather than all
 * three.
 * @returns The stored options, with every unreadable field defaulted
 */
function readOptions(): DisplayOptions {
  const stored = window.localStorage.getItem(OPTIONS_KEY)

  if (stored === null) {
    return DEFAULT_OPTIONS
  }

  const parsed = parseJson(stored)

  if (typeof parsed !== 'object' || parsed === null) {
    return DEFAULT_OPTIONS
  }

  const fields = parsed as Partial<Record<DisplayOptionId, unknown>>

  return {
    crt: booleanOr(fields.crt, DEFAULT_OPTIONS.crt),
    glow: booleanOr(fields.glow, DEFAULT_OPTIONS.glow),
    reducedAnimation: booleanOr(fields.reducedAnimation, DEFAULT_OPTIONS.reducedAnimation),
  }
}

/**
 * The glow belongs to the CRT layer rather than beside it, so switching that layer off
 * takes the glow with it and leaves flat green on black.
 * @param options - The current options
 * @returns Whether the text glow is drawn
 */
export function isGlowVisible(options: DisplayOptions): boolean {
  return options.crt && options.glow
}

/**
 * Owns the display options. Kept apart from useGame because they are not part of a run:
 * a new run does not reset them, and they outlive the tab.
 * @returns The options and the one thing that can be done to them
 */
export function useOptions(): OptionsControl {
  const options = shallowRef(readOptions())

  return {
    options: options,
    toggle: (option: DisplayOptionId): void => {
      const next: DisplayOptions = {
        ...options.value,
      }

      next[option] = !next[option]
      options.value = next
      window.localStorage.setItem(OPTIONS_KEY, JSON.stringify(next))
    },
  }
}
