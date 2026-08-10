import {KILOGRAMS_PER_TONNE, SECONDS_PER_MINUTE} from '@/game/constants'

/**
 * Every number-to-text rule the interface uses.
 * The engine holds raw numbers and components render text, and these functions are the
 * only place the two meet — so a reading is rounded once, in one way, everywhere it
 * appears. They are pure: no state, no engine, no formatting of units or alignment,
 * both of which belong to the caller.
 */

// A reading below ten carries a second decimal. The column is the same width either
// way, and the precision only means anything while the value is small (ui_ux.md §3).
const SECOND_DECIMAL_BELOW = 10
const TIME_FIELD_WIDTH = 2

/**
 * A reading quoted to two decimals below ten and one at or above it.
 * @param value - The value to write
 * @returns The value as text
 */
function scaled(value: number): string {
  return value.toFixed(Math.abs(value) < SECOND_DECIMAL_BELOW ? 2 : 1)
}

/**
 * @param value - Minutes or seconds
 * @returns The value as two digits
 */
function twoDigits(value: number): string {
  return value.toString().padStart(TIME_FIELD_WIDTH, '0')
}

/**
 * A clock reading, floored so a countdown reads 00:00 only once the time is gone.
 * @param seconds - Seconds on the clock
 * @returns MM:SS
 */
export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))

  return `${twoDigits(Math.floor(whole / SECONDS_PER_MINUTE))}:${twoDigits(whole % SECONDS_PER_MINUTE)}`
}

/**
 * @param megawattHours - Stored or spent energy, MWh
 * @returns The energy as text
 */
export function formatEnergy(megawattHours: number): string {
  return scaled(megawattHours)
}

/**
 * The run's target, which docs/specs.md fixes at a whole number of MWh and which never
 * moves during a run. A decimal on a figure that is neither measured nor changing is the
 * unnecessary precision ui_ux.md §3 asks the interface to leave off.
 * @param megawattHours - A fixed energy figure, MWh
 * @returns The energy as text, to the nearest whole MWh
 */
export function formatWholeEnergy(megawattHours: number): string {
  return Math.round(megawattHours).toString()
}

/**
 * @param megawatts - A power reading, MW
 * @param signed - Whether to prefix a positive reading with a plus
 * @returns The power as text
 */
export function formatPower(megawatts: number, signed = false): string {
  const text = scaled(megawatts)

  return signed && megawatts > 0 ? `+${text}` : text
}

/**
 * @param kilograms - Stored material, kg
 * @returns The mass as text, in tonnes
 */
export function formatMass(kilograms: number): string {
  return scaled(kilograms / KILOGRAMS_PER_TONNE)
}

/**
 * @param kilogramsPerSecond - A material flow rate, kg/s
 * @returns The rate as text
 */
export function formatRate(kilogramsPerSecond: number): string {
  return kilogramsPerSecond.toFixed(2)
}

/**
 * @param megawattHoursPerTonne - The coal price
 * @returns The price as text
 */
export function formatPrice(megawattHoursPerTonne: number): string {
  return megawattHoursPerTonne.toFixed(2)
}

/**
 * @param setting - A machine Setting, 0 to MaxSetting
 * @returns The Setting as text, at the granularity the player steps it in
 */
export function formatSetting(setting: number): string {
  return setting.toFixed(1)
}

/**
 * @param ceiling - A clean Setting ceiling
 * @returns The ceiling as text, finer than a Setting so its drift under strain shows
 */
export function formatCeiling(ceiling: number): string {
  return ceiling.toFixed(2)
}

/**
 * @param efficiency - A machine Efficiency, 0 to MaxEfficiency
 * @returns The Efficiency as text
 */
export function formatEfficiency(efficiency: number): string {
  return efficiency.toFixed(2)
}

/**
 * @param stress - A Temperature, Pressure, or Vibration
 * @returns The stress as text, quoted as docs/specs.md quotes it
 */
export function formatStress(stress: number): string {
  return stress.toFixed(1)
}

/**
 * @param fraction - A fraction, 0 to 1
 * @returns The percentage as a whole number, without a sign — the caller adds it
 */
export function formatPercent(fraction: number): string {
  return Math.round(fraction * 100).toString()
}

/**
 * @param seconds - A duration
 * @returns The duration as a whole number of seconds
 */
export function formatSeconds(seconds: number): string {
  return Math.round(seconds).toString()
}
