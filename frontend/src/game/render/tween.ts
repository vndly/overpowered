const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

/**
 * Eases one rendered value toward its simulation target.
 * docs/ui.md § Motion: anything rendering a simulation value is tweened, because
 * escalation only communicates if it can be seen rising. Stage 1 uses it for the
 * HUD numerals; stages 4 and 8 reuse it for ring sweep and cable weight.
 *
 * The ease is exponential, so it is correct at any frame rate and needs no
 * knowledge of when the target last changed. Under prefers-reduced-motion it
 * snaps, keeping the final rendered value.
 */
export class Tween {
  private current: number
  private desired: number
  private readonly timeConstant: number

  constructor(initialValue: number, durationSeconds: number) {
    this.current = initialValue
    this.desired = initialValue
    // Three time constants reach ~95% of the target, which is the duration a
    // reader perceives as the length of the tween
    this.timeConstant = durationSeconds / 3
  }

  set target(value: number) {
    this.desired = value
  }

  get value(): number {
    return this.current
  }

  /**
   * Moves the rendered value toward its target.
   * @param deltaSeconds - Real time since the previous frame
   */
  advance(deltaSeconds: number): void {
    if (reducedMotionQuery.matches || this.timeConstant <= 0) {
      this.current = this.desired

      return
    }

    this.current += (this.desired - this.current) * (1 - Math.exp(-deltaSeconds / this.timeConstant))
  }

  /**
   * Jumps straight to a value, with no tween. Used when a match starts or
   * restarts, where there is no previous value to ease from.
   * @param value - The value to hold
   */
  snapTo(value: number): void {
    this.current = value
    this.desired = value
  }
}
