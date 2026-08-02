# Overpowered

A fast-paced, real-time grid strategy game where the player must generate enough energy before time runs out without letting the power grid collapse.

# Scope

- A finished, polished small game (not a prototype)
- Platform: desktop web, mouse-first
- Structure: an authored campaign of self-contained levels

# Summary

- To generate energy, the player must build generators
- Buying and improving generators cost energy
- Energy is the main and only currency of the game (e.g. 100⚡)
- A player starts with a small amount of energy to start building

# Match rules

- Win: the moment stored energy reaches the goal
- Lose: the timer expires (the only hard loss condition)
- Grid collapse is emergent, not scripted: at 0⚡ stored, cooling towers starve and shut off, heat rises, generators start dying
- Pause is look-only: the player can pause to read the board, but cannot act while paused
- A restart button is always available

# Campaign

- Each level is self-contained: fixed starting energy, nothing carries over
- Progression unlocks new content only (generator types, structures) — no permanent upgrades
- What can be built in a level is gated by unlocks and by the resources on the map

# Grid

- Rectangular grid based (e.g. 10x10)
- The grid has different type of cells
  - Empty
    - Only relays and accumulators can be built on them
  - Resource
    - Only generators can be built on them
    - They can never be depleted
    - A cell can contain multiple resources (e.g. coal + water)
    - Each type of generator can be placed only on top of its corresponding resource (e.g. coal based generator only on a coal cell)
  - Obstacle
    - Examples: rock/wall/water/etc
    - Nothing can be built on them
    - They can be taken down (costs energy)

# Generators

## Properties

- Type (see #types-of-generators)
- Cost
  - How much energy it takes to build it (e.g. 50⚡)
  - Can be sold at a lower cost
- Level
  - From 1 (when it's built)
  - Each increase costs energy (exponential growth)
- Max temperature
  - The maximum temperature the generator can withstand before it melts down (e.g. 100°C)
- Current temperature
  - From 0°C (coolest) to "max temperature" (hottest)
- Output
  - The amount of energy produced per minute (e.g. 100⚡/m)
  - It increases with each level upgrade (e.g. 100 → 140 ⚡/m)
- Heat generation
  - How much heat the generator produces (e.g. 5°C/m)
  - It increases with each level upgrade (e.g. 6°C/m → 9°C/m)

## Types of generators

### Tier 1

| Generator | Cost | Output | Max Temp | Heat | Total | Category                    | Notes                              |
| --------- | ---: | -----: | -------: | ---: | ----: | --------------------------- | ---------------------------------- |
| Solar     |    1 |      1 |        1 |    1 |     0 | normal cost / normal stable | Output varies over time            |
| Wind      |    2 |      1 |        2 |    1 |     0 | high cost / high stable     | Nearby obstacles reduce its output |
| Biomass   |    1 |      2 |        1 |    2 |     0 | low cost / low stable       |                                    |

### Tier 2

| Generator  | Cost | Output | Max Temp | Heat | Total | Category                    | Notes                                              |
| ---------- | ---: | -----: | -------: | ---: | ----: | --------------------------- | -------------------------------------------------- |
| Oil        |    2 |      2 |        2 |    2 |     0 | normal cost / normal stable | Venting costs are more expensive                   |
| Geothermal |    3 |      2 |        3 |    2 |     0 | high cost / high stable     | Produces more output when adjacent cells are empty |
| Gas        |    2 |      3 |        2 |    3 |     0 | low cost / low stable       | Can rapidly adjust its output                      |

### Tier 3

| Generator     | Cost | Output | Max Temp | Heat | Total | Category                    | Notes                                      |
| ------------- | ---: | -----: | -------: | ---: | ----: | --------------------------- | ------------------------------------------ |
| Coal          |    3 |      3 |        3 |    3 |     0 | normal cost / normal stable |                                            |
| Hydroelectric |    4 |      3 |        4 |    3 |     0 | high cost / high stable     | Output increases with adjacent water tiles |
| Nuclear       |    5 |      4 |        2 |    3 |     0 | high cost / low stable      | Has a narrow safety margin                 |

### Legend

1 = very low
2 = low
3 = medium
4 = high
5 = very high

## Solar cycle

- A global day/night sine wave drives solar output
- The upcoming curve is shown as a forecast strip in the HUD
- Heat generation is higher during the day and lower at night (e.g. 5°C/m → 2°C/m)

## Actions

- Build
- Upgrade
- Turn off (takes time)
- Turn on (takes time)
- Throttle
- Vent

# Other structures

## Cooling Tower

- Reduces the heat of all generators in its radius (e.g. -10°C/m)
- Consumes energy constantly (e.g. 10⚡/m)
- Full network consumer:
  - Must be connected to an accumulator (directly or via relays) to operate
  - Its draw loads the relays on its path
  - If disconnected, it idles: no cooling, no consumption
  - If stored energy hits 0⚡, it starves and shuts off

### Properties

- Type (see #types-of-cooling-towers)
- Level
  - From 1 (when it's built)
  - Each increase costs energy (exponential growth)
- Cost
  - How much energy it takes to build it (e.g. 50⚡)
  - Can be sold at a lower cost
- Radius
  - The radius of the area it cools (e.g. 1 cell)
- Effectiveness
  - The amount of cooling provided per minute (e.g. -10°C/m)
  - It increases with each level upgrade (e.g. -10°C/m → -15°C/m)
  - Its effective is shared with all generators in its radius
- Consumption
  - How much energy it consumes per minute (e.g. 10⚡/m)
  - It increases with each level upgrade (e.g. 10⚡/m → 15⚡/m)

### Types of cooling towers

| Name             |  Cost | Radius | Effectiveness | Consumption |
| ---------------- | ----: | ------ | ------------: | ----------: |
| Ventilation Fan  |  20⚡ | 1      |        -5°C/m |      10⚡/m |
| Heat Sink        |  30⚡ | 1      |       -10°C/m |      15⚡/m |
| Radiator Array   |  50⚡ | 2      |       -10°C/m |      20⚡/m |
| Cryogenic Cooler | 100⚡ | 2      |       -15°C/m |      25⚡/m |

## Relay

- Connects structures between them to transmit energy
- Load = generated energy flowing through + cooling tower draw
- Alarm: fires when load crosses a warning threshold (e.g. 80% of max capacity)
- Overload: the moment load reaches max capacity, the relay explodes
- An explosion destroys only the relay; the cell remains buildable
- They need to be upgraded to support more energy going through

### Properties

- Type (see #types-of-relays)
- Cost
  - How much energy it takes to build it (e.g. 10⚡)
  - Can be sold at a lower cost
- Distance
  - The maximum distance it can connect to another structure (e.g. 3 cells)
- Max capacity
  - The maximum amount of energy it can transmit per minute (e.g. 100⚡/m)
- Current capacity
  - The current amount of energy it is transmitting per minute (e.g. 50⚡/m)

### Types of relays

| Name         | Cost | Distance | Max capacity |
| ------------ | ---: | -------: | -----------: |
| Basic        | 10⚡ |        3 |      300⚡/m |
| Intermediate | 15⚡ |        4 |      400⚡/m |
| Advanced     | 20⚡ |        5 |      500⚡/m |

## Accumulator

- Collects the global energy generated
- No storage cap
- New ones can be built but they are very expensive
- Extra accumulators act as new network roots: they shorten relay chains and reduce hop losses
- A free accumulator is placed at the start of the game

# Heating

- Each generator produces heat over time (e.g. 5°C/m)
- Heat spreads to adjacent generators
  - Orthogonally: +10% heat generation to all generators (up, down, left, right)
  - Diagonally: +5% heat generation to all generators (top-left, top-right, bottom-left, bottom-right)
  - Tuning note: these percentages must be strong enough to make compact building genuinely risky
- If a generator is not connected to an accumulator, it cannot dissipate the energy it produces, so it overheats faster
- If a generator overheats, it explodes
  - An explosion destroys only the generator; the cell (and its resources) remains buildable
  - There is no blast damage: failure never chains spatially, only through the network (a dead relay kills income and cooling together)

# Cooling

There are 2 ways to cool down a generator:

1. Place a cooling structure close to the generator
2. Use the generator's own controls:

## Shut down

- Pros
  - Heat drops quickly
- Cons
  - Produces no energy while offline
  - It takes time to turn off and turn on again

## Throttle

- Stepped control: output adjustable in 20% jumps, from 0% to 100%
- Pros
  - Slows or reverses heat buildup
- Cons
  - Produces less energy while throttled
  - Heat drops slowly

## Venting

- Pros
  - Instantly removes heat
- Cons
  - It costs energy proportionally to the level of the generator (e.g. 10% of the energy output)
  - Becomes more expensive with repeated use

# Connections

- Generators and cooling towers connect automatically to accumulators/relays if in reach
- Obstacles block connections
- If two structures are connected, they can transmit energy between them (a cable is drawn between them)
- A generator needs to be connected to an accumulator in order for its energy to count towards the global counter
- The player only places structures (generators, cooling towers, accumulators, relays), never cables
- Relays have a maximum distance to connect with another structure (the player needs to add more relays to connect long distances)

## Energy transmission

- Each relay hop loses a percentage of the energy transmitted (e.g. -5% per hop)
- A percentage (not a flat amount) stays relevant as outputs grow, and longer-reach relays reduce loss by cutting hops
- The loss applies to generated energy only; cooling tower draw loads relays but suffers no hop loss

# UI

- Show
  - Current stored energy
  - Goal
  - Energy pace required to achieve the goal according to the remaining time (so the player knows if they are falling behind or not)
  - Day/night forecast strip (drives solar output)

- When placing a structure, show:
  - Connection route
  - Delivered output
  - Relay load after placement (combined: generated energy + cooler draw — a correctness requirement, since auto-connect can overload a relay)
  - Nearby heat penalty
  - Cooling received

- Micro must be doable under fire: 1-2 click actions, hotkeys, high-readability alarms

# Game Vision

## Target Experience

The player should feel under constant pressure while remaining able to plan and recover. They must expand the grid while simultaneously managing overheating generators, limited cooling, relay capacity, and energy costs.

## Core Conflict

> **Energy production versus system stability**

Producing more energy brings the player closer to victory, but also creates more heat, higher infrastructure load, and greater risk.

## Design Pillars

- **Strategic placement:** resources, obstacles, cooling coverage, and relay range make every cell matter.
- **Real-time heat management:** generators require frequent throttling, shutdowns, or venting.
- **Risky reinvestment:** energy is both the victory objective and the currency used to expand.
- **Readable systems:** pressure should come from difficult choices, not hidden information.
- **Logistics failure, not spectacle:** failure spreads through the network, never through blast chains, and is always recoverable by rebuilding.

## Core Gameplay Loop

> **Build → Connect → Generate → Reinvest → Stabilize → Reach the target**

Generator controls solve immediate problems, while cooling structures and relays shape the long-term layout.

## Match Arc

> **Control → Growth → Pressure → Overload → Desperate stabilization**

A successful match should often end with the player reaching the goal while the grid is close to failure.

## Central Trade-offs

- Save energy or reinvest it
- Expand production or stabilize existing generators
- Build compactly for efficiency or spread out for safety
- Operate safely or risk higher output before the deadline

# Tech

- Rendering: a canvas layer for the board (grid, cables, effects) + DOM for the HUD and menus

# Open (tuning)

- All numeric values in the tables
- Upgrade caps and growth rates
- Sell refund percentage
- Obstacle demolition costs
- Exact level count (target 10-20)
