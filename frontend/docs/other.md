# Questions

- Square or hexagonal grid?
- Should the player buy new generator tiers?

# Future

- Add overclocking to generators (e.g. a generator can be upgraded to produce more energy but it will overheat faster)
- Add generator degradation/wear
- Make resource patches appear and disappear randomly

## Throttle

- Stepped control: output adjustable in 20% jumps, from 0% to 100%
- Ramped response: actual output moves toward the set throttle over several seconds — Gas alone responds near-instantly (its perk); the HUD shows target vs actual
- Pre-emptive throttling ahead of the day peak is the intended skill — the forecast strip exists to enable it
- Pros
  - Slows or reverses heat buildup
- Cons
  - Produces less energy while throttled
  - Heat drops slowly

### Day/night cycle

Cut from `docs/specs.md`, `docs/plan.md` and `docs/ui.md`, so the sim now has no
global rhythm and heat comes only from per-generator rate, level and adjacency.
Kept here verbatim so it can be reinstated as a unit.

- A global sine wave drives the board's rhythm; cycle ≈ 2-3 minutes, so every match sees several
- Solar output follows the curve
- The wave scales heat generation for ALL generators (e.g. ×1.0 at noon, ×0.5 at night): day = income + danger, night = relief + push window
- The upcoming curve is shown as a forecast strip in the HUD

Everything it touched, so putting it back is a checklist rather than a re-read:

- **`specs.md`** — Solar's note "Output varies over time"; `day-cycle
length/amplitude` in the per-level environment presets; the HUD bullet
  "Day/night forecast strip (drives solar output and global heat)"; the open
  tuning item "Ambient day/night heat multiplier curve (e.g. ×1.0 noon / ×0.5
  night)".
- **`plan.md`** — the working level's cycle shortened to ~40s from stage 6; stage
  6's title and its rhythm framing ("day is income and danger, night is relief
  and your push window"); `cycle length, amplitude` in stage 7's environment
  presets; "the ambient day/night curve" in stage 12's tuning list; "then
  day/night" in decision 5's ordering.
- **`ui.md`** — the forecast strip at the right end of the HUD strip, scrolling
  right to left with now at the left edge; "forecast strip scroll" in the Motion
  table's tweened-from-stage-1 column; the forecast strip in stage 6's UI row.

Solar now carries no note at all: at Biomass's cost it is half the output and half
the heat, which is a real trade but not a rule. Reinstating the cycle is what gives
it one back.

`docs/other.md`'s Throttle idea depends on this — "pre-emptive throttling ahead of
the day peak is the intended skill — the forecast strip exists to enable it" — so
Throttle cannot ship before the cycle comes back.

---

- What do you think? does it have flaws/weak points? are the mechanics solid or we should improve something? is there an important element missing in the game?
- Are there similar games?
