# Overpowered

A real-time grid-based strategy game where you must generate enough energy before time runs out without pushing your power grid into overload.

# Characteristics

- Rectangular grid based (e.g. 10x10)
- The grid has different type of cells
  - Empty
    - Only relays and accumulators can be built on them
  - Resource
    - Only generators can be built on them
    - They can never be depleted
    - A cell can contain multiple resources (e.g. coal + water)
  - Obstacle
    - Examples: rock/wall/water/etc
    - Nothing can be built on them
    - They can be taken down (costs energy)
- The goal is to generate certain amount of energy in certain amount of time
- To generate energy, the player must build generators
- Each type of generator can be placed only on top of its corresponding resource (e.g. coal based generator only on a coal cell)
- Buying and improving generators cost energy
- Energy is the main and only currency of the game (e.g. 100⚡)
- Generators can be sold at a lower cost
- The player needs to balance the energy generated with the energy spent to reach the goal on time

# Generators

## Properties

- Type (see #types-of-generators)
- Cost
  - How much energy it takes to build it (e.g. 50⚡)
- Level
  - From 1 (when it's built)
  - Each increase costs energy (exponential growth)
- Max temperature
  - The maximum temperature the generator can withstand before it melts down (e.g. 100°C)
- Current temperature
  - From 0°C (coolest) to "max temperature" (hottest)
- Output
  - The amount of energy produced per second (e.g. 100⚡/m)
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
| Biomass   |    1 |      2 |        1 |    2 |     0 | low cost / low stable       |

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
- Upgrade level
- Shut down (takes time)
- Turn on (takes time)
- Throttle
- Vent

# Other structures

## Cooling Tower

- Reduces the heat in a radius
- They consume energy constantly
- Can be upgraded
  - Range
  - Effectiveness

## Relay

- Connects cables and generators (nodes)
- They can be overloaded
- They need to be upgraded to support more energy going through

## Accumulator

- Collects the global energy generated
- News ones can be built but they are very expensive

# Mechanics

## Heating

- Each generator produces heat over time (e.g. 5°C/m)
- Heat spreads to adjacent generators
- If a generator overheats, it explodes, damaging nearby structures

## Cooling

There are 2 ways to cool down a generator:

1. Place a cooling structure close to the generator
2. Use the generator's own controls

### Shut down

- Pros
  - Heat drops quickly
- Cons
  - Produces no energy while offline
  - It takes time to turn off and turn on again

### Throttle

- Pros
  - Slows or reverses heat buildup
- Cons
  - Produces less energy while throttled

### Venting

- Pros
  - Instantly removes heat
- Cons
  - It costs energy proportionally to the level of the generator (e.g. 10% of the energy output)
  - Becomes more expensive with repeated use

# Connections

- Generators connect automatically to the accumulator if in reach (i.e. no obstacle in between)
- Generators connect automatically to the relays in reach (showing a cable)
- They only connect to the one that offers the shortest path
- The user only places generators and relays. Never cables
- Cables have a maximum distance, the player needs to add more relays to connect long distances

# Match flow

- A player starts with a small amount of energy to start building
- A player decides where to install the accumulator
- Show energy pace required to achieve the goal according to the remaining time (so the player knows if they are falling behind or not)

---

- a generator needs to be connected to the accumulator in order to its energy to count to the goal
- energy distribution: the more jumps the energy has to make (i.e. the more connectors it passes through) the less energy reaches the accumulator
- obstacles block cables
- if a generator is not connected to the accumulator, it cannot dissipate the energy it produces so it overheats faster

---

- questions
  - make patches appear and disappear randomly?
  - are there similar games?
  - square or hexagonal grid?
  - can cables or relays be upgraded in order to extend the leght of possible connections?
  - can relays overheat or get damaged?
  - add energy transmition loss or only count jumps? if energy lost by distance, adding more relays fixes the problem
  - add max temperature limit increase for generators? (e.g. a generator can be upgraded to withstand more heat)
  - should the player buy new generator tiers?

- future
  - add overclocing to generators (e.g. a generator can be upgraded to produce more energy but it will overheat faster)
  - add generator degradation/wear

---

- i want the player to feel tension. it's not a chill slow pace game. i want the user to have to worry about generators overheating while thinking strategically about where to place the next generator
- core emotional arc: control → growth → pressure → overload → desperate stabilization
- Generator controls solve immediate problems; cooling buildings solve spatial, long-term problems.
- central conflict: energy production versus system stability.
- Generators create the strategy. Heat creates the urgency. Cooling units and relays make the grid matter
