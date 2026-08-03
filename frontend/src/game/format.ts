const energyFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

/**
 * An energy amount as the HUD shows it.
 * @param value - Energy units
 * @returns A grouped whole number, e.g. "1,204"
 */
export function formatEnergy(value: number): string {
  return energyFormat.format(Math.max(0, Math.round(value)))
}

/**
 * How far ahead or behind the required pace the player is running.
 * Always signed, because the sign is the entire reading: the player needs to
 * know which side of the line they are on before they read the magnitude.
 *
 * The unit is not included. A ⚡ character renders as a colour emoji, which
 * would put a saturated yellow into the HUD from a font rather than from the
 * palette; the HUD appends a "/m" suffix instead.
 * @param value - Actual pace minus required pace, in energy per minute
 * @returns A signed whole number, e.g. "+10" or "-2"
 */
export function formatPaceDelta(value: number): string {
  const whole = truncatePace(value)
  const sign = whole < 0 ? '-' : '+'

  return `${sign}${energyFormat.format(Math.abs(whole))}`
}

/**
 * The HUD's resolution for a rate: whole units, truncated toward zero.
 * Truncating rather than flooring keeps the magnitude honest on both sides —
 * flooring would report a shortfall of 0.5 as a whole unit behind. The colour
 * and the numeral both derive from this, so a surplus too small to print can
 * never still be printed green.
 * @param value - A rate in energy per minute
 * @returns The rate at display resolution
 */
export function truncatePace(value: number): number {
  return Math.trunc(value)
}

/**
 * A duration as the match clock shows it. Never tweened: the clock reads true.
 * @param seconds - Seconds remaining
 * @returns Minutes and seconds, e.g. "1:07"
 */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(whole / 60)
  const remainder = whole % 60

  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}
