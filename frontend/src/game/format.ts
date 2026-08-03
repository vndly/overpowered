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
