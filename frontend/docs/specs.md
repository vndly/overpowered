# Overpowered

A real-time grid-based strategy game where you must generate enough energy before time runs out without pushing your power grid into overload.

# Summary

- To generate energy, the player must build generators
- Buying and improving generators cost energy
- Energy is the main and only currency of the game (e.g. 100⚡)
- A player starts with a small amount of energy to start building

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
- They can be overloaded, if so, they explode, damaging nearby structures
- They need to be upgraded to support more energy going through

### Properties

- Type (see #types-of-relays)
- Cost
  - How much energy it takes to build it (e.g. 10⚡)
  - Can be sold at a lower cost
- Distance
  - The maximum distance it can connect to another structure (e.g. 3 cells)
- Capacity
  - The maximum amount of energy it can transmit per minute (e.g. 100⚡/m)
  - It increases with each level upgrade (e.g. 100⚡/m → 150⚡/m)

### Types of relays

| Name         | Cost | Distance | Capacity |
| ------------ | ---: | -------: | -------: |
| Basic        | 10⚡ |        3 |  300⚡/m |
| Intermediate | 15⚡ |        4 |  400⚡/m |
| Advanced     | 20⚡ |        5 |  500⚡/m |

## Accumulator

- Collects the global energy generated
- New ones can be built but they are very expensive
- A free accumulator is placed at the start of the game

# Heating

- Each generator produces heat over time (e.g. 5°C/m)
- Heat spreads to adjacent generators
- If a generator is not connected to an accumulator, it cannot dissipate the energy it produces, so it overheats faster
- If a generator overheats, it explodes, damaging nearby structures

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

- Generators connect automatically to accumulators/relays if in reach
- Obstacles block connections
- If two structures are connected, they can transmit energy between them (a cable is drawn between them)
- A generator needs to be connected to an accumulator in order for its energy to count towards the global counter
- The user only places generators, accumulators and relays, never cables
- Relays have a maximum distance to connect with another structure (the player needs to add more relays to connect long distances)

## Energy transmission

Two options:

1. Some energy is lost for each jump between relays (e.g. 1⚡ per jump)
2. Some energy is lost for each cell the energy travels through (e.g. 1⚡ per cell)

# UI

- Show energy pace required to achieve the goal according to the remaining time (so the player knows if they are falling behind or not)

# Questions

- Square or hexagonal grid?
- Should the player buy new generator tiers?

# Future

- Add overclocking to generators (e.g. a generator can be upgraded to produce more energy but it will overheat faster)
- Add generator degradation/wear
- Make resource patches appear and disappear randomly

---

- I want the player to feel tension. It's not a chill slow pace game. I want the user to have to worry about generators overheating while thinking strategically about where to place the next generator
- core emotional arc: control → growth → pressure → overload → desperate stabilization
- Generator controls solve immediate problems; cooling buildings solve spatial, long-term problems.
- central conflict: energy production versus system stability.
- Generators create the strategy. Heat creates the urgency. Cooling units and relays make the grid matter
- are there similar games?
- The player needs to balance the energy generated with the energy spent to reach the goal on time
